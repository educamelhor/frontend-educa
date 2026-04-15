// src/features/questoes/QuestoesBanco.jsx
// Sprint 2 — Banco de Questões com paginação server-side, filtros completos e modal de detalhes

import React, { useState, useEffect, useCallback, useRef } from 'react';
import QuestaoDetalhes from './components/QuestaoDetalhes';

/* ── Constantes ─────────────────────────────────────────── */
const NIVEL_LABEL  = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };
const TIPO_LABEL   = {
  objetiva: 'Objetiva', discursiva: 'Discursiva',
  verdadeiro_falso: 'V/F', associacao: 'Associação', lacuna: 'Lacuna',
};
const NIVEL_COLORS = { facil: '#059669', medio: '#d97706', dificil: '#dc2626', enem: '#7c3aed' };
const LIMIT = 20;

/* ── Utilitários ─────────────────────────────────────────── */
function NivelDot({ nivel }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: NIVEL_COLORS[nivel] || '#94a3b8', marginRight: 4,
    }} />
  );
}

function parseTags(raw) {
  try { return typeof raw === 'string' ? raw.split(',').map(t => t.trim()).filter(Boolean) : (raw || []); }
  catch { return []; }
}

/* ── Card de questão ─────────────────────────────────────── */
function QuestaoCard({ questao, onEdit, onDuplicate, onDelete, onClick }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const nivel = questao.nivel || 'medio';
  const tags = parseTags(questao.tags);
  let alts = [];
  try { alts = JSON.parse(questao.alternativas_json || '[]'); } catch {}

  return (
    <div className="bq-question-card" onClick={() => onClick(questao)}>
      <div className={`bq-question-card-top nivel-${nivel}`} />

      <div className="bq-question-card-body">
        {/* Meta */}
        <div className="bq-question-card-meta">
          {questao.disciplina && <span className="bq-badge bq-badge-disc">{questao.disciplina}</span>}
          {questao.tipo       && <span className="bq-badge bq-badge-tipo">{TIPO_LABEL[questao.tipo] || questao.tipo}</span>}
          {nivel && (
            <span className="bq-badge" style={{ background: `${NIVEL_COLORS[nivel]}18`, color: NIVEL_COLORS[nivel] }}>
              <NivelDot nivel={nivel} />{NIVEL_LABEL[nivel] || nivel}
            </span>
          )}
          {questao.habilidade_bncc && (
            <span className="bq-badge" style={{ background: '#fff7ed', color: '#c2410c' }}>{questao.habilidade_bncc}</span>
          )}
          {questao.bimestre && (
            <span className="bq-badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{questao.bimestre}º Bim</span>
          )}
          {questao.status === 'rascunho' && (
            <span className="bq-badge" style={{ background: '#f5f5f4', color: '#78716c' }}>Rascunho</span>
          )}
        </div>

        {/* Enunciado preview */}
        <p className="bq-question-card-text">
          {questao.conteudo_bruto || '(sem enunciado)'}
        </p>

        {/* Info rápida */}
        {alts.length > 0 && (
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 5 }}>
            {alts.length} alternativas{questao.correta ? ` · Gabarito: (${questao.correta})` : ''}
          </div>
        )}
        {/* Sprint 5: uso + compartilhada */}
        <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
          {(questao.vezes_utilizada > 0) && (
            <span style={{ fontSize: '0.66rem', padding: '1px 7px', borderRadius: 99, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}>
              📊 {questao.vezes_utilizada}× usado
            </span>
          )}
          {questao.compartilhada == 1 && (
            <span style={{ fontSize: '0.66rem', padding: '1px 7px', borderRadius: 99, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 700 }}>
              🤝 Compartilhada
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bq-question-card-foot" onClick={e => e.stopPropagation()}>

        <div className="bq-card-tags">
          {tags.slice(0, 2).map(t => <span key={t} className="bq-tag-chip">{t}</span>)}
          {tags.length > 2 && <span className="bq-tag-chip">+{tags.length - 2}</span>}
          {tags.length === 0 && <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>sem tags</span>}
        </div>

        <div className="bq-card-actions">
          {/* Editar */}
          <button className="bq-icon-btn" onClick={() => onEdit(questao)} title="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Duplicar */}
          <button className="bq-icon-btn" onClick={() => onDuplicate(questao)} title="Duplicar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Excluir (arquivar) */}
          {confirmDel ? (
            <button className="bq-icon-btn danger" onClick={() => { onDelete(questao.id); setConfirmDel(false); }} title="Confirmar arquivar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ) : (
            <button className="bq-icon-btn" onClick={() => setConfirmDel(true)} title="Arquivar questão">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────── */
export default function QuestoesBanco({ onEdit, refreshKey }) {
  const [questoes,   setQuestoes]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [stats,      setStats]      = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [detalhes,   setDetalhes]   = useState(null);  // questão aberta no modal

  // Filtros
  const [busca,       setBusca]       = useState('');
  const [filtDisc,    setFiltDisc]    = useState('');
  const [filtTipo,    setFiltTipo]    = useState('');
  const [filtNivel,   setFiltNivel]   = useState('');
  const [filtSerie,   setFiltSerie]   = useState('');
  const [filtBimestre,setFiltBimestre]= useState('');
  const [filtStatus,  setFiltStatus]  = useState('');
  const [page,        setPage]        = useState(1);
  const [disciplinas, setDisciplinas] = useState([]);

  const buscaTimer = useRef(null);

  /* Fetch principal — server-side */
  const carregar = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: currentPage, limit: LIMIT });
      if (busca)        params.set('busca', busca);
      if (filtDisc)     params.set('disciplina', filtDisc);
      if (filtTipo)     params.set('tipo', filtTipo);
      if (filtNivel)    params.set('nivel', filtNivel);
      if (filtSerie)    params.set('serie', filtSerie);
      if (filtBimestre) params.set('bimestre', filtBimestre);
      if (filtStatus)   params.set('status', filtStatus);

      const res = await fetch(`/api/questoes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Suporte ao retorno antigo (array) e novo (objeto com pagination)
      if (Array.isArray(data)) {
        setQuestoes(data);
        setPagination({ total: data.length, page: 1, pages: 1 });
        // Extrai disciplinas únicas
        const discs = [...new Set(data.map(q => q.disciplina).filter(Boolean))].sort();
        setDisciplinas(discs);
      } else {
        setQuestoes(data.questoes || []);
        setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
        const discs = [...new Set((data.questoes || []).map(q => q.disciplina).filter(Boolean))].sort();
        setDisciplinas(discs);
      }
    } catch {
      setQuestoes([]);
    } finally {
      setLoading(false);
    }
  }, [busca, filtDisc, filtTipo, filtNivel, filtSerie, filtBimestre, filtStatus]);

  /* Fetch stats */
  const carregarStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/questoes/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => { carregarStats(); }, [carregarStats, refreshKey]);

  /* Recarrega quando filtros mudam (com debounce na busca) */
  useEffect(() => {
    clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(() => { setPage(1); carregar(1); }, busca ? 350 : 0);
    return () => clearTimeout(buscaTimer.current);
  }, [busca, filtDisc, filtTipo, filtNivel, filtSerie, filtBimestre, filtStatus, refreshKey]);

  useEffect(() => { carregar(page); }, [page]);

  /* Duplicar — usa endpoint Sprint 5 */
  const duplicar = async (questao) => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`/api/questoes/${questao.id}/duplicar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { carregar(page); carregarStats(); }
    } catch {}
  };

  /* Arquivar (soft delete) */
  const arquivar = async (id) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/questoes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setQuestoes(p => p.filter(q => q.id !== id));
    carregarStats();
  };

  const limparFiltros = () => {
    setBusca(''); setFiltDisc(''); setFiltTipo(''); setFiltNivel('');
    setFiltSerie(''); setFiltBimestre(''); setFiltStatus('');
    setPage(1);
  };

  const temFiltroAtivo = busca || filtDisc || filtTipo || filtNivel || filtSerie || filtBimestre || filtStatus;

  return (
    <div>
      {/* Modal de detalhes */}
      {detalhes && (
        <QuestaoDetalhes
          questao={detalhes}
          onClose={() => setDetalhes(null)}
          onEdit={(q) => { setDetalhes(null); onEdit(q); }}
        />
      )}

      {/* ── Stats ───────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          {/* Total */}
          {[
            { emoji: '📚', value: stats.totais?.total || 0,      label: 'Total',     accent: '#0e7490' },
            { emoji: '✅', value: stats.totais?.ativas || 0,     label: 'Ativas',    accent: '#059669' },
            { emoji: '📝', value: stats.totais?.rascunhos || 0,  label: 'Rascunhos', accent: '#d97706' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '10px 18px', background: '#fff',
              border: `1.5px solid ${s.accent}20`, borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <span style={{ fontSize: '1.4rem' }}>{s.emoji}</span>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            </div>
          ))}

          {/* Por nível */}
          {(stats.porNivel || []).filter(n => n.total > 0).map(n => (
            <div key={n.nivel} style={{
              padding: '10px 16px', background: `${NIVEL_COLORS[n.nivel]}0d`,
              border: `1.5px solid ${NIVEL_COLORS[n.nivel]}30`, borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <NivelDot nivel={n.nivel} />
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: NIVEL_COLORS[n.nivel], lineHeight: 1 }}>{n.total}</div>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>{NIVEL_LABEL[n.nivel]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="bq-bank-toolbar">
        {/* Busca */}
        <div className="bq-search-box">
          <svg className="bq-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por enunciado, tags, BNCC..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {/* Disciplina */}
        <select className="bq-filter-select" value={filtDisc} onChange={e => { setFiltDisc(e.target.value); setPage(1); }}>
          <option value="">Todas as disciplinas</option>
          {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Tipo */}
        <select className="bq-filter-select" value={filtTipo} onChange={e => { setFiltTipo(e.target.value); setPage(1); }}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {/* Nível */}
        <select className="bq-filter-select" value={filtNivel} onChange={e => { setFiltNivel(e.target.value); setPage(1); }}>
          <option value="">Todos os níveis</option>
          {Object.entries(NIVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {/* Bimestre */}
        <select className="bq-filter-select" value={filtBimestre} onChange={e => { setFiltBimestre(e.target.value); setPage(1); }}>
          <option value="">Bimestre</option>
          {[1,2,3,4].map(b => <option key={b} value={b}>{b}º</option>)}
        </select>

        {/* Status */}
        <select className="bq-filter-select" value={filtStatus} onChange={e => { setFiltStatus(e.target.value); setPage(1); }}>
          <option value="">Ativas</option>
          <option value="rascunho">Rascunhos</option>
          <option value="arquivada">Arquivadas</option>
          <option value="todas">Todas</option>
        </select>

        {/* Limpar filtros */}
        {temFiltroAtivo && (
          <button className="bq-btn bq-btn-ghost" onClick={limparFiltros} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Contagem de resultados */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        {!loading && (
          <span style={{ fontSize: '0.81rem', color: '#64748b' }}>
            {pagination.total > 0
              ? `${pagination.total} questão(ões) ${temFiltroAtivo ? 'encontrada(s)' : 'no banco'} · Página ${pagination.page} de ${pagination.pages}`
              : 'Nenhuma questão encontrada'
            }
          </span>
        )}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button
            className="bq-btn bq-btn-outline"
            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >← Anterior</button>
          <button
            className="bq-btn bq-btn-outline"
            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            disabled={page >= pagination.pages || loading}
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
          >Próxima →</button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="bq-loading">
          <div className="bq-loading-spinner" />
          Carregando banco de questões...
        </div>
      ) : questoes.length === 0 ? (
        <div className="bq-empty">
          <div className="bq-empty-icon">📋</div>
          <div className="bq-empty-title">
            {!temFiltroAtivo ? 'Banco vazio' : 'Nenhuma questão encontrada'}
          </div>
          <p className="bq-empty-desc">
            {!temFiltroAtivo
              ? 'Crie sua primeira questão na aba "Criar Questão" 🧩'
              : 'Tente ajustar os filtros ou a busca.'}
          </p>
        </div>
      ) : (
        <div className="bq-question-grid">
          {questoes.map(q => (
            <QuestaoCard
              key={q.id}
              questao={q}
              onEdit={onEdit}
              onDuplicate={duplicar}
              onDelete={arquivar}
              onClick={(q) => setDetalhes(q)}
            />
          ))}
        </div>
      )}

      {/* Paginação inferior (quando tem muitas páginas) */}
      {pagination.pages > 1 && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
          {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 34, height: 34, borderRadius: 8,
                border: `1.5px solid ${p === page ? '#0e7490' : '#e2e8f0'}`,
                background: p === page ? '#0e7490' : '#fff',
                color: p === page ? '#fff' : '#475569',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                fontFamily: 'inherit',
              }}
            >
              {p}
            </button>
          ))}
          {pagination.pages > 7 && (
            <span style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              ... {pagination.pages}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
