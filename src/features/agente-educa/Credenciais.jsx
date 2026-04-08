// src/features/agente-educa/Credenciais.jsx
// ============================================================================
// Módulo Agente EDUCA — Gestão de Credenciais Premium
// Fluxo: Salvar → Polling até Playwright confirmar conexão
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import {
  BoltIcon,
  ShieldCheckIcon,
  KeyIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

// ─── Animação CSS ───────────────────────────────────
const ANIM_CSS = `
@keyframes fadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
@keyframes pulse-dot { 0%,100% { opacity:1 } 50% { opacity:.4 } }
@keyframes spin-cw { to { transform:rotate(360deg) } }
.fe-fade-in { animation: fadeIn 0.3s ease-out both; }
`;

function injectAnims() {
  if (document.getElementById('agente-cred-anims')) return;
  const s = document.createElement('style');
  s.id = 'agente-cred-anims';
  s.textContent = ANIM_CSS;
  document.head.appendChild(s);
}

// ─── Status Badge ────────────────────────────────────
const STATUS_MAP = {
  conectado:    { color: '#10b981', label: 'CONECTADO', icon: '✓' },
  desconectado: { color: '#94a3b8', label: 'NÃO CONFIGURADO', icon: '—' },
  executando:   { color: '#f59e0b', label: 'TESTANDO…', icon: '◌' },
  erro:         { color: '#ef4444', label: 'ERRO DE CONEXÃO', icon: '✕' },
};

export default function AgenteCredenciais() {
  const [loading, setLoading]             = useState(true);
  const [matricula, setMatricula]         = useState('');
  const [senha, setSenha]                 = useState('');
  const [perfilEducadf, setPerfilEducadf] = useState('professor'); // 'professor' | 'secretario' | 'diretor'
  const [showPw, setShowPw]               = useState(false);
  const [salvando, setSalvando]           = useState(false);
  const [statusConexao, setStatusConexao] = useState('desconectado');
  const [credencialId, setCredencialId]   = useState(null);
  const [ultimoTeste, setUltimoTeste]     = useState(null);
  const [feedback, setFeedback]           = useState(null);
  const [elapsedSec, setElapsedSec]       = useState(0);

  const pollingRef = useRef(null);
  const elapsedRef = useRef(null);

  const perfil    = (localStorage.getItem('perfil') || '').toLowerCase();
  const userName  = localStorage.getItem('userName') || localStorage.getItem('nome') || 'Usuário';

  useEffect(() => { injectAnims(); carregarCredencial(); return () => stopPolling(); }, []);

  // ── Carrega credencial existente do backend ─────────────────────────────
  async function carregarCredencial() {
    try {
      setLoading(true);
      const resp = await api.get('/api/agente/credenciais');
      if (resp.data?.ok && resp.data.credenciais?.length > 0) {
        const cred = resp.data.credenciais[0];
        setMatricula(cred.educadf_login || '');
        setCredencialId(cred.id);
        setUltimoTeste(cred.ultimo_teste_em);
        setStatusConexao(cred.ultimo_teste_em ? 'conectado' : 'desconectado');
        // Restaura perfil salvo
        const PERFIL_MAP = { 1: 'professor', 2: 'secretario', 3: 'diretor' };
        if (cred.perfil_id) setPerfilEducadf(PERFIL_MAP[cred.perfil_id] || 'professor');
      }
    } catch (err) {
      console.error('[AgenteCredenciais] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Polling de status do teste assíncrono ──────────────────────────────
  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
  };

  const startPolling = useCallback((credId) => {
    stopPolling();
    setElapsedSec(0);

    // Contador visual de segundos
    elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);

    pollingRef.current = setInterval(async () => {
      try {
        const resp = await api.get(`/api/agente/credenciais/${credId}/testar/status`);
        const { status, ok, message } = resp.data;

        if (status === 'executando') return; // ainda rodando

        stopPolling();

        if (status === 'sucesso' && ok) {
          setStatusConexao('conectado');
          setUltimoTeste(new Date().toISOString());
          setFeedback({ type: 'success', msg: '✅ Conexão estabelecida! O Agente EDUCA está pronto.' });
        } else if (status === 'falha') {
          setStatusConexao('erro');
          setFeedback({ type: 'error', msg: message || 'Falha no login. Verifique suas credenciais no portal EDUCADF.' });
        } else {
          // sem_teste ou sem_cache (não deveria ocorrer após disparar o teste)
          setStatusConexao('desconectado');
        }
      } catch (err) {
        console.warn('[AgenteCredenciais] Polling error:', err);
      }
    }, 3000); // consulta a cada 3s
  }, []);

  // ── Inicia teste assíncrono ─────────────────────────────────────────────
  const handleTestar = useCallback(async (credId) => {
    if (!credId) return;
    setStatusConexao('executando');
    setFeedback({ type: 'info', msg: 'Agente iniciando sessão virtual no portal EDUCADF…' });

    try {
      await api.post(`/api/agente/credenciais/${credId}/testar`);
      startPolling(credId);
    } catch (err) {
      setStatusConexao('erro');
      setFeedback({ type: 'error', msg: 'Não foi possível iniciar o teste. Verifique se o backend está ativo.' });
      console.error('[AgenteCredenciais] Erro ao disparar teste:', err);
    }
  }, [startPolling]);

  // ── Salva credencial e dispara teste ────────────────────────────────────
  const handleSalvar = async () => {
    if (!matricula.trim() || !senha.trim()) {
      setFeedback({ type: 'error', msg: 'Preencha o usuário e a senha para continuar.' });
      return;
    }
    setSalvando(true);
    setFeedback({ type: 'info', msg: 'Salvando credenciais com criptografia AES-256…' });

    try {
      const payload = {
        educadf_login: matricula.trim(),
        educadf_senha: senha.trim(),
        perfil_educadf: perfilEducadf,
        professor_id: perfil === 'professor'
          ? (Number(localStorage.getItem('professor_id')) || 0)
          : 0,
      };

      const resp = await api.post('/api/agente/credenciais', payload);
      if (!resp.data?.ok) {
        setFeedback({ type: 'error', msg: resp.data?.message || 'Erro ao salvar credenciais.' });
        return;
      }

      const newId = resp.data.id || credencialId;
      setCredencialId(newId);
      setSenha('');
      setFeedback({ type: 'info', msg: 'Credenciais salvas! Iniciando verificação no portal EDUCADF…' });
      handleTestar(newId);
    } catch (err) {
      const msg = err?.response?.data?.message
        || (err?.response?.status === 403 ? 'Sem permissão para gerenciar credenciais.' : 'Erro de comunicação com o servidor.');
      setFeedback({ type: 'error', msg });
    } finally {
      setSalvando(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const s = STATUS_MAP[statusConexao] || STATUS_MAP.desconectado;
  const isTesting = statusConexao === 'executando';

  const feedbackBg = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };

  const perfilDesc = {
    secretario: 'O agente sincronizará dados de estudantes e responsáveis via portal EDUCADF.',
    diretor:    'O agente sincronizará dados da escola e responsáveis via portal EDUCADF.',
    vice_diretor:'O agente sincronizará dados da escola e responsáveis via portal EDUCADF.',
    professor:  'O agente exportará notas e frequências para o diário oficial do EDUCADF.',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <ArrowPathIcon className="h-10 w-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium">Carregando módulo inteligente…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">

      {/* ══ Hero Banner ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 md:p-12 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">
              <BoltIcon className="h-3 w-3" /> Módulo Autônomo
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
              Agente <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">EDUCA</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
              Olá, <strong className="text-white">{userName}</strong>. Configure sua ponte inteligente com o portal EDUCADF.
            </p>
          </div>

          {/* Status Card */}
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md min-w-[160px]">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg transition-all duration-500"
              style={{ background: `${s.color}22`, color: s.color, boxShadow: `0 0 24px ${s.color}33` }}
            >
              {isTesting
                ? <ArrowPathIcon className="h-8 w-8" style={{ animation: 'spin-cw 1s linear infinite' }} />
                : s.icon}
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Status do Agente</span>
            <span className="text-sm font-extrabold text-center" style={{ color: s.color }}>{s.label}</span>
            {isTesting && (
              <span className="text-xs text-slate-500">{elapsedSec}s…</span>
            )}
            {ultimoTeste && !isTesting && statusConexao === 'conectado' && (
              <span className="text-[10px] text-slate-500 text-center">
                Último teste: {new Date(ultimoTeste).toLocaleString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ══ Formulário ════════════════════════════════════════════════ */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
            {/* Linha decorativa topo */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-t-3xl" />

            <div className="flex items-center gap-3 mb-8 mt-2">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Credenciais EDUCADF</h2>
                <p className="text-sm text-slate-500">Criptografia AES-256-GCM. Sua senha nunca é exibida.</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Campo: Perfil no EDUCADF */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                  Como você está cadastrado no portal EDUCADF?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'professor',  label: 'Professor',         emoji: '📚', desc: 'Diário de Classe' },
                    { id: 'secretario', label: 'Secretário/Servidor', emoji: '🏫', desc: 'Secretaria Escolar' },
                    { id: 'diretor',    label: 'Gestor/Diretor',     emoji: '⭐', desc: 'Gestão / Admin' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPerfilEducadf(opt.id)}
                      disabled={isTesting || salvando}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all text-center disabled:opacity-60 ${
                        perfilEducadf === opt.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                      <span className="text-[9px] text-slate-400 leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo: Usuário / CPF */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Usuário / Matrícula / CPF</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ex: 2078759"
                    value={matricula}
                    onChange={e => setMatricula(e.target.value)}
                    disabled={isTesting || salvando}
                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all outline-none border-2 border-transparent focus:border-blue-300 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Campo: Senha */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Senha do Portal EDUCADF</label>
                <div className="relative">
                  <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Sua senha secreta"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    disabled={isTesting || salvando}
                    onKeyDown={e => e.key === 'Enter' && handleSalvar()}
                    className="block w-full pl-12 pr-12 py-4 bg-slate-50 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all outline-none border-2 border-transparent focus:border-blue-300 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {showPw ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400 ml-1">
                  A mesma senha utilizada em educadf.se.df.gov.br
                </p>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`fe-fade-in flex items-start gap-3 p-4 rounded-2xl border ${feedbackBg[feedback.type]}`}>
                  <div className="mt-0.5 flex-shrink-0">
                    {feedback.type === 'success' && <CheckCircleIcon className="h-5 w-5" />}
                    {feedback.type === 'error'   && <ExclamationTriangleIcon className="h-5 w-5" />}
                    {feedback.type === 'info'    && (isTesting
                      ? <ArrowPathIcon className="h-5 w-5" style={{ animation: 'spin-cw 1s linear infinite' }} />
                      : <InformationCircleIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 text-sm font-medium leading-relaxed">
                    {feedback.msg}
                    {isTesting && (
                      <span className="ml-2 text-xs opacity-70">({elapsedSec}s)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleSalvar}
                  disabled={salvando || isTesting || !matricula.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[.98] text-white font-bold py-4 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {salvando
                    ? <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    : <ShieldCheckIcon className="h-5 w-5" />}
                  <span>{salvando ? 'Salvando…' : 'Salvar e Conectar'}</span>
                </button>

                {credencialId && !isTesting && !salvando && (
                  <button
                    onClick={() => handleTestar(credencialId)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[.98] text-slate-600 font-bold py-4 px-6 transition-all"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                    <span>Testar Novamente</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══ Sidebar info ════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Card: Perfil do Agente */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-7 text-white shadow-xl shadow-indigo-500/20">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 opacity-90">
              <BoltIcon className="h-5 w-5" /> Seu Perfil Agente
            </h3>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/15 backdrop-blur-sm mb-4">
              <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-1">Identificado como</p>
              <p className="text-2xl font-extrabold capitalize">{perfil || 'Usuário'}</p>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              {perfilDesc[perfil] || 'Configure suas credenciais para que o agente possa executar tarefas em seu nome.'}
            </p>
            <div className="mt-6 pt-5 border-t border-white/10 text-[10px] text-white/40 uppercase tracking-tight">
              Em conformidade com as diretrizes de acesso da SEEDF/DF.
            </div>
          </div>

          {/* Card: Por que isso? */}
          <div className="bg-amber-50 rounded-3xl p-7 border border-amber-100">
            <h3 className="text-amber-800 font-bold mb-3 flex items-center gap-2 text-sm">
              <InformationCircleIcon className="h-5 w-5" /> Por que isso é necessário?
            </h3>
            <p className="text-amber-700 text-xs leading-relaxed">
              O sistema multi-escola exige que cada profissional utilize suas próprias credenciais.
              O Agente EDUCA age em seu nome, respeitando exatamente as mesmas regras e visualizações
              que você possui no portal oficial — garantindo segurança e conformidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
