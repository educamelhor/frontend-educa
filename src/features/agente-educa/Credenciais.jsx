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
  const [modalErroOpen, setModalErroOpen] = useState(false);
  const [erroMsg, setErroMsg]             = useState('');

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

    const pollingStartedAt = Date.now();
    const MAX_POLL_MS = 120_000; // 2 minutos — timeout máximo

    // Contador visual de segundos
    elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);

    pollingRef.current = setInterval(async () => {
      try {
        // Timeout: se exceder 2 min, para e pede para tentar novamente
        if (Date.now() - pollingStartedAt > MAX_POLL_MS) {
          stopPolling();
          setStatusConexao('erro');
          setFeedback({ type: 'error', msg: 'Tempo limite excedido. O teste demorou mais que o esperado. Tente novamente.' });
          return;
        }

        const resp = await api.get(`/api/agente/credenciais/${credId}/testar/status`);
        const { status, ok, message, ultimo_teste_em } = resp.data;

        if (status === 'executando') return; // ainda rodando

        stopPolling();

        if (status === 'sucesso' && ok) {
          setStatusConexao('conectado');
          setUltimoTeste(new Date().toISOString());
          setFeedback({ type: 'success', msg: '✅ Conexão estabelecida! O Agente EDUCA está pronto para sincronizar.' });
        } else if (status === 'falha') {
          setStatusConexao('erro');
          setErroMsg(message || 'Não foi possível autenticar no portal EDUCADF.');
          setModalErroOpen(true);
          setFeedback(null);
        } else if (status === 'sem_teste' && ultimo_teste_em) {
          // O Map em memória pode ter sido limpo (deploy/restart), mas o banco
          // registrou o ultimo_teste_em — se for recente (<2min), é sucesso.
          const testDate = new Date(ultimo_teste_em);
          const isRecent = (Date.now() - testDate.getTime()) < 300_000; // 5 min (EDUCADF pode demorar até 2-3 min)
          if (isRecent) {
            setStatusConexao('conectado');
            setUltimoTeste(ultimo_teste_em);
            setFeedback({ type: 'success', msg: '✅ Conexão estabelecida! O Agente EDUCA está pronto para sincronizar.' });
          } else {
            setStatusConexao('desconectado');
            setFeedback({ type: 'error', msg: 'Teste finalizado, mas o resultado não pôde ser confirmado. Tente novamente.' });
          }
        } else {
          setStatusConexao('desconectado');
          setFeedback({ type: 'error', msg: 'Não foi possível obter o resultado do teste. Tente novamente.' });
        }
      } catch (err) {
        console.warn('[AgenteCredenciais] Polling error:', err);
        // Após 10 erros consecutivos de polling, desiste
        if (Date.now() - pollingStartedAt > 30_000) {
          stopPolling();
          setStatusConexao('erro');
          setFeedback({ type: 'error', msg: 'Erro ao consultar status do teste. Verifique sua conexão e tente novamente.' });
        }
      }
    }, 3000); // consulta a cada 3s
  }, []);

  // ── Inicia teste assíncrono ─────────────────────────────────────────────
  const handleTestar = useCallback(async (credId) => {
    if (!credId) return;
    setStatusConexao('executando');
    setFeedback({ type: 'info', msg: 'Agente iniciando sessão virtual no portal EDUCADF…' });

    try {
      const resp = await api.post(`/api/agente/credenciais/${credId}/testar`);

      // CORREÇÃO: backend pode ter gerado novo id (DELETE+INSERT ao salvar).
      // Sincroniza com o realCredId devolvido para que o polling use o id correto.
      const realId = resp.data?.credId || credId;
      if (realId !== credId) {
        setCredencialId(realId);
      }
      startPolling(realId);
    } catch (err) {
      setStatusConexao('erro');
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
      let msg = 'Não foi possível iniciar o teste.';
      if (status === 401) msg = 'Sessão expirada. Faça login novamente.';
      else if (status === 403) msg = 'Sem permissão para testar credenciais.';
      else if (status === 404) msg = 'Credencial não encontrada. Salve novamente e tente.';
      else if (status === 422) msg = backendMsg || '⚠️ Credenciais desatualizadas. Por favor, insira sua senha e clique em "Salvar e Conectar" para atualizar.';
      else if (status === 400) msg = backendMsg || 'Parâmetros inválidos na requisição.';
      else if (status === 500) msg = backendMsg ? `Erro interno: ${backendMsg}` : 'Erro interno no servidor.';
      else if (backendMsg) msg = backendMsg;
      else if (!status) msg = 'Não foi possível contactar o servidor. Verifique sua conexão.';
      setFeedback({ type: 'error', msg });
      console.error('[AgenteCredenciais] Erro ao disparar teste:', { status, backendMsg, err });
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
      const status = err?.response?.status;
      let msg = err?.response?.data?.message || 'Erro de comunicação com o servidor.';
      if (status === 403) msg = 'Sem permissão para gerenciar credenciais.';
      if (status === 401) msg = 'Sessão expirada. Faça login novamente.';
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
    <>
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

    {/* ══ Modal de Erro de Conexão — Premium ═══════════════════════════════════ */}
    {modalErroOpen && (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      >
        <style>{`
          @keyframes erroSlideIn { from { opacity:0; transform:scale(0.9) translateY(20px) } to { opacity:1; transform:scale(1) translateY(0) } }
          @keyframes erroPulse { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.3) } 50% { box-shadow:0 0 20px 4px rgba(239,68,68,0.12) } }
        `}</style>
        <div
          className="bg-white w-full max-w-md overflow-hidden flex flex-col"
          style={{ borderRadius: 20, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.06)', animation: 'erroSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
        >
          {/* Header */}
          <div className="relative overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #6b1414 100%)' }}>
            <div style={{ position:'absolute', top:'-40%', right:'-15%', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,0.2) 0%,transparent 70%)', pointerEvents:'none' }} />
            <div className="relative z-10 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div style={{ padding:10, borderRadius:14, background:'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(220,38,38,0.15))', border:'1px solid rgba(255,255,255,0.1)', animation:'erroPulse 2s ease-in-out infinite' }}>
                  <ExclamationTriangleIcon className="h-6 w-6" style={{ color:'#fca5a5' }} />
                </div>
                <div>
                  <h2 style={{ color:'#fff', fontSize:18, fontWeight:700, margin:0, letterSpacing:'-0.02em' }}>Falha na Conexão</h2>
                  <p style={{ color:'rgba(252,165,165,0.8)', fontSize:11, margin:'3px 0 0' }}>Portal EDUCADF não autorizou o acesso</p>
                </div>
              </div>
              <button
                onClick={() => setModalErroOpen(false)}
                style={{ padding:8, borderRadius:10, background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.4)'; e.currentTarget.style.background='transparent'; }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Corpo */}
          <div className="px-6 py-5">
            {/* Mensagem do erro */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100 mb-5">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">{erroMsg || 'Não foi possível autenticar no portal EDUCADF.'}</p>
            </div>

            <p className="text-sm font-semibold text-slate-700 mb-3">Verifique os seguintes pontos:</p>

            <div className="space-y-3">
              {/* Item 1 — Perfil */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div style={{ padding:'6px', borderRadius:8, background:'#f59e0b', flexShrink:0 }}>
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-800">Perfil selecionado</p>
                  <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
                    Confirme se você é <strong>Professor</strong>, <strong>Secretário/Servidor</strong> ou <strong>Gestor/Diretor</strong> no EDUCADF. Cada perfil usa uma tela de login diferente.
                  </p>
                </div>
              </div>

              {/* Item 2 — Usuário */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div style={{ padding:'6px', borderRadius:8, background:'#3b82f6', flexShrink:0 }}>
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800">Usuário (matrícula ou CPF)</p>
                  <p className="text-xs text-blue-700 leading-relaxed mt-0.5">
                    O campo usuário deve ser sua <strong>matrícula funcional</strong> ou <strong>CPF</strong> (somente números), exatamente como consta no portal EDUCADF.
                  </p>
                </div>
              </div>

              {/* Item 3 — Senha */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100">
                <div style={{ padding:'6px', borderRadius:8, background:'#7c3aed', flexShrink:0 }}>
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-800">Senha</p>
                  <p className="text-xs text-purple-700 leading-relaxed mt-0.5">
                    Confirme a senha usada em <strong>educadf.se.df.gov.br</strong>. Verifique se não está com Caps Lock ativado.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModalErroOpen(false)}
                className="flex-1"
                style={{ padding:'11px', borderRadius:12, border:'1.5px solid #e5e7eb', fontSize:14, fontWeight:500, color:'#6b7280', cursor:'pointer', background:'transparent', transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background='#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                Fechar
              </button>
              <button
                onClick={() => { setModalErroOpen(false); setFeedback(null); }}
                className="flex-[2]"
                style={{ padding:'12px', borderRadius:12, border:'none', fontSize:14, fontWeight:600, color:'#fff', cursor:'pointer', background:'linear-gradient(135deg,#1e3a5f,#0f2847)', boxShadow:'0 4px 14px rgba(15,40,71,0.3)', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(15,40,71,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 14px rgba(15,40,71,0.3)'; }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
