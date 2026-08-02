// src/features/biblioteca/concurso/ConcursoPage.jsx
// ============================================================================
// Gestão de Concursos de Leitura + Ranking Gamificado
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

function RankingRow({ aluno, rank }) {
  const medals = ['🥇', '🥈', '🥉'];
  const medalColors = ['#f59e0b', '#94a3b8', '#b45309'];
  const isTop3 = rank < 3;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl transition"
      style={{
        background: isTop3
          ? `linear-gradient(135deg, ${['rgba(251,191,36,0.1)', 'rgba(148,163,184,0.1)', 'rgba(180,120,60,0.1)'][rank]}, transparent)`
          : rank % 2 === 0 ? '#f8fafc' : '#fff',
        border: isTop3 ? `1px solid ${['rgba(251,191,36,0.3)', 'rgba(148,163,184,0.3)', 'rgba(180,120,60,0.3)'][rank]}` : '1px solid #f1f5f9',
        transform: isTop3 ? `scale(${[1.02, 1.01, 1][rank]})` : 'scale(1)',
        boxShadow: isTop3 ? `0 4px 16px ${['rgba(251,191,36,0.15)', 'rgba(148,163,184,0.15)', 'rgba(180,120,60,0.15)'][rank]}` : 'none',
      }}
    >
      {/* Posição */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0"
        style={{
          background: isTop3 ? `linear-gradient(135deg, ${['#fef3c7','#f1f5f9','#fef3c7'][rank]}, ${['#fde68a','#e2e8f0','#fed7aa'][rank]})` : '#f1f5f9',
          color: isTop3 ? medalColors[rank] : '#94a3b8',
        }}>
        {isTop3 ? medals[rank] : rank + 1}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', fontSize: '0.875rem' }}>
        {aluno.aluno_foto
          ? <img src={aluno.aluno_foto} alt={aluno.aluno_nome} className="w-full h-full object-cover" />
          : aluno.aluno_nome?.charAt(0).toUpperCase()}
      </div>

      {/* Nome e turma */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 truncate" style={{ fontSize: isTop3 ? '1rem' : '0.875rem' }}>
          {aluno.aluno_nome}
        </p>
        <p className="text-xs text-slate-400">{aluno.turma_nome || ''}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="font-black text-lg" style={{ color: '#10b981' }}>{aluno.total_livros}</p>
          <p className="text-xs text-slate-400">livros</p>
        </div>
        <div className="text-center">
          <p className="font-black text-lg" style={{ color: '#8b5cf6' }}>{aluno.total_resenhas}</p>
          <p className="text-xs text-slate-400">resenhas</p>
        </div>
        {aluno.pontuacao_total > 0 && (
          <div className="text-center">
            <p className="font-black text-lg" style={{ color: '#f59e0b' }}>{Math.round(aluno.pontuacao_total)}</p>
            <p className="text-xs text-slate-400">pontos</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NovoConcursoModal({ onClose }) {
  const [form, setForm] = useState({ titulo: '', descricao: '', data_inicio: '', data_fim: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.titulo) { setError('Título obrigatório.'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/api/biblioteca/concurso', form);
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar concurso.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', animation: 'modalEntrada 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
        <div className="p-5 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">🎪 Criar Concurso de Leitura</h2>
            <button onClick={() => onClose(false)} className="text-white/60 hover:text-white text-xl">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-500">Título do Concurso *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Maratona de Leitura 2026" className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300" style={{ borderColor: '#e2e8f0' }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-500">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={3} placeholder="Descreva o concurso, tema, premiação..."
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300 resize-none" style={{ borderColor: '#e2e8f0' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-500">Data de início</label>
              <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300" style={{ borderColor: '#e2e8f0' }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-500">Data de encerramento</label>
              <input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300" style={{ borderColor: '#e2e8f0' }} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">⚠️ {error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => onClose(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', color: '#475569' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)' }}>
              {saving ? '⏳ Criando...' : '🎪 Criar Concurso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConcursoPage() {
  const [tab, setTab] = useState('ranking');
  const [ranking, setRanking] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [concursos, setConcursos] = useState([]);
  const [loadingConcursos, setLoadingConcursos] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [concursoFiltro, setConcursoFiltro] = useState('');
  const [mesFiltro, setMesFiltro] = useState('');
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

  const fetchRanking = useCallback(async () => {
    setLoadingRanking(true);
    try {
      const params = {};
      if (concursoFiltro) {
        params.concurso_id = concursoFiltro;
      } else if (mesFiltro) {
        params.mes = mesFiltro;
        params.ano = anoFiltro;
      }
      const { data } = await api.get('/api/biblioteca/ranking', { params });
      setRanking(data.ranking || []);
    } catch { setRanking([]); }
    finally { setLoadingRanking(false); }
  }, [mesFiltro, anoFiltro, concursoFiltro]);

  const fetchConcursos = useCallback(async () => {
    setLoadingConcursos(true);
    try {
      const { data } = await api.get('/api/biblioteca/concurso');
      setConcursos(data.concursos || []);
    } catch { setConcursos([]); }
    finally { setLoadingConcursos(false); }
  }, []);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);
  useEffect(() => { fetchConcursos(); }, [fetchConcursos]);

  const toggleStatus = async (id, currentStatus) => {
    const next = currentStatus === 'rascunho' ? 'ativo' : currentStatus === 'ativo' ? 'encerrado' : 'rascunho';
    try {
      await api.put(`/api/biblioteca/concurso/${id}/status`, { status: next });
      fetchConcursos();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, #134e4a, #0f766e, #0d9488)', boxShadow: '0 8px 32px rgba(19,78,74,0.3)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🏆</span>
              <h1 className="text-2xl font-black text-white">Ranking & Concurso</h1>
            </div>
            <p className="text-teal-200 text-sm">Premiação de leitura e culminância literária</p>
          </div>
          {tab === 'concursos' && (
            <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl text-white transition" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
              🎪 Novo Concurso
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'ranking', label: '🏆 Ranking de Leitores' }, { key: 'concursos', label: '🎪 Concursos' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition"
            style={{
              background: tab === t.key ? 'linear-gradient(135deg, #0f766e, #0d9488)' : '#f1f5f9',
              color: tab === t.key ? '#fff' : '#475569',
              boxShadow: tab === t.key ? '0 4px 12px rgba(15,118,110,0.3)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ranking' && (
        <>
          {/* Filtros de período / concurso */}
          <div className="flex gap-2 mb-6 flex-wrap items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-sm font-semibold text-slate-500 mr-2">Modo:</span>
            
            <select 
              value={concursoFiltro} 
              onChange={e => {
                setConcursoFiltro(e.target.value);
                if (e.target.value) setMesFiltro(''); // limpa mes se concurso
              }}
              className="px-3 py-2 rounded-xl text-sm font-bold border outline-none focus:ring-2 focus:ring-teal-300 transition"
              style={{ borderColor: '#cbd5e1', background: '#fff', color: concursoFiltro ? '#0f766e' : '#64748b' }}
            >
              <option value="">Geral / Por Mês</option>
              {concursos.map(c => (
                <option key={c.id} value={c.id}>🎪 {c.titulo}</option>
              ))}
            </select>

            {!concursoFiltro && (
              <div className="flex items-center gap-2 ml-4 border-l pl-4 border-slate-200">
                <select 
                  value={anoFiltro} 
                  onChange={e => setAnoFiltro(Number(e.target.value))}
                  className="px-2 py-1.5 rounded-lg text-xs font-bold border outline-none focus:ring-2 focus:ring-teal-300"
                  style={{ borderColor: '#e2e8f0', background: '#fff', color: '#475569' }}
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
                <button onClick={() => setMesFiltro('')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  style={{ background: !mesFiltro ? '#0d9488' : '#e2e8f0', color: !mesFiltro ? '#fff' : '#475569' }}>
                  Anual
                </button>
                {meses.map((m, i) => (
                  <button key={i} onClick={() => setMesFiltro(String(i + 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                    style={{ background: mesFiltro === String(i + 1) ? '#0d9488' : '#f8fafc', color: mesFiltro === String(i + 1) ? '#fff' : '#64748b' }}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loadingRanking ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-5xl mb-3">🏆</p>
              <p>Nenhum leitor encontrado ainda. Inicie os empréstimos!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top 3 destaque especial */}
              {ranking.slice(0, 3).length > 0 && (
                <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}>
                  <p className="text-xs font-bold text-amber-700 mb-3">🏆 PÓDIO</p>
                  <div className="space-y-3">
                    {ranking.slice(0, 3).map((a, i) => <RankingRow key={a.aluno_id} aluno={a} rank={i} />)}
                  </div>
                </div>
              )}
              {/* Restante */}
              {ranking.slice(3).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 mb-2">CLASSIFICAÇÃO GERAL</p>
                  {ranking.slice(3).map((a, i) => <RankingRow key={a.aluno_id} aluno={a} rank={i + 3} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'concursos' && (
        <>
          {loadingConcursos ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : concursos.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">🎪</p>
              <p className="text-slate-400 text-sm mb-4">Nenhum concurso criado ainda.</p>
              <button onClick={() => setModalNovo(true)} className="inline-flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                🎪 Criar primeiro concurso
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {concursos.map(c => {
                const statusConfig = {
                  rascunho: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: '📝 Rascunho', next: 'Ativar' },
                  ativo: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: '🟢 Ativo', next: 'Encerrar' },
                  encerrado: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '🔴 Encerrado', next: 'Reabrir' },
                }[c.status] || {};
                return (
                  <div key={c.id} className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-black text-slate-800 text-base leading-tight pr-2">{c.titulo}</h3>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>
                    {c.descricao && <p className="text-sm text-slate-500 mb-3 leading-relaxed">{c.descricao}</p>}
                    {(c.data_inicio || c.data_fim) && (
                      <div className="flex gap-4 mb-4 text-xs text-slate-400">
                        {c.data_inicio && <span>📅 Início: {new Date(c.data_inicio).toLocaleDateString('pt-BR')}</span>}
                        {c.data_fim && <span>🏁 Fim: {new Date(c.data_fim).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    )}
                    <button onClick={() => toggleStatus(c.id, c.status)}
                      className="w-full py-2 rounded-xl text-sm font-bold text-white transition"
                      style={{ background: c.status === 'ativo' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)' }}>
                      {statusConfig.next}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modalNovo && <NovoConcursoModal onClose={(r) => { setModalNovo(false); if (r) fetchConcursos(); }} />}
    </div>
  );
}
