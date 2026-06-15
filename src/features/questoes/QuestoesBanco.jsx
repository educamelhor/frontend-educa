// src/features/questoes/QuestoesBanco.jsx
// Sprint 2 — Banco de Questões com paginação server-side, filtros completos e modal de detalhes

import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../services/api';
import QuestaoDetalhes from './components/QuestaoDetalhes';
import BulkImportModal from './BulkImportModal';

/* ── Decodifica JWT (sem biblioteca) para obter professor_id e perfil do usuário ── */
function decodificarToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return {};
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { professor_id: payload.professor_id || null, perfil: payload.perfil || '' };
  } catch { return {}; }
}

/* ── Modal premium de confirmação de exclusão (2 etapas) ───────────────────── */
function ExclusaoModal({ questao, onArquivar, onExcluir, onCancel }) {
  const [passo, setPasso] = useState(null); // null | 'arquivar' | 'excluir'
  if (!questao) return null;

  const preview = (questao.conteudo_bruto || '(sem enunciado)').slice(0, 90);

  /* ── Tela de confirmação ── */
  if (passo) {
    const isExcluir = passo === 'excluir';
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(6px)',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '28px 28px 24px',
          width: 400, maxWidth: '92vw', boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
          fontFamily: 'inherit',
        }}>
          {/* Ícone */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16, margin: '0 auto 12px',
              background: isExcluir
                ? 'linear-gradient(135deg, #fee2e2, #fecaca)'
                : 'linear-gradient(135deg, #fef3c7, #fde68a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem',
            }}>
              {isExcluir ? '🗑️' : '📁'}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {isExcluir ? 'Excluir Definitivamente?' : 'Arquivar Questão?'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
              {isExcluir
                ? 'Esta ação é irreversível. A questão será removida permanentemente do banco e não poderá ser recuperada.'
                : 'A questão será ocultada do banco, mas poderá ser recuperada futuramente pela administração.'}
            </div>
          </div>

          {/* Preview */}
          <div style={{
            background: '#f8fafc', borderRadius: 10, padding: '9px 13px',
            fontSize: '0.78rem', color: '#475569', lineHeight: 1.5,
            border: `1px solid ${isExcluir ? '#fecaca' : '#fde68a'}`,
            marginBottom: 20,
          }}>
            {preview}{questao.conteudo_bruto?.length > 90 ? '...' : ''}
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={isExcluir ? onExcluir : onArquivar}
              style={{
                padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: isExcluir
                  ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                fontFamily: 'inherit', letterSpacing: '0.01em',
              }}
            >
              ✅ Entendi — {isExcluir ? 'Excluir Definitivamente' : 'Arquivar Questão'}
            </button>
            <button
              onClick={() => setPasso(null)}
              style={{
                padding: '11px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                cursor: 'pointer', background: '#f8fafc', color: '#64748b',
                fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit',
              }}
            >
              ← Cancelar — voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Tela principal (escolha de ação) ── */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '28px 28px 24px',
        width: 420, maxWidth: '92vw', boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        fontFamily: 'inherit',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #fef3c7, #fee2e2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem',
          }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Gerenciar Questão</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>Escolha uma ação para esta questão</div>
          </div>
        </div>

        {/* Preview da questão */}
        <div style={{
          background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
          fontSize: '0.8rem', color: '#334155', lineHeight: 1.5,
          border: '1px solid #e2e8f0', marginBottom: 20,
        }}>
          {preview}{questao.conteudo_bruto?.length > 90 ? '...' : ''}
        </div>

        {/* Botões de ação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setPasso('arquivar')} style={{
            padding: '11px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', fontWeight: 700, fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: '1.1rem' }}>📁</span>
            Arquivar — ocultar do banco (recuperável)
          </button>
          <button onClick={() => setPasso('excluir')} style={{
            padding: '11px 16px', borderRadius: 10, border: '1.5px solid #fecaca', cursor: 'pointer',
            background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: '1.1rem' }}>🗑️</span>
            Excluir Definitivamente — ação irreversível
          </button>
          <button onClick={onCancel} style={{
            padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', cursor: 'pointer',
            background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.875rem',
            fontFamily: 'inherit',
          }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

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
function QuestaoCard({ questao, onEdit, onDuplicate, onGerenciar, onClick, isAutor }) {
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
          {isAutor && (
            <span style={{ fontSize: '0.66rem', padding: '1px 7px', borderRadius: 99, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontWeight: 700 }}>
              ✍️ Minha
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

        {/* Ações — só aparecem se o usuário é o autor */}
        {isAutor && (
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

            {/* Gerenciar (arquivar / excluir) */}
            <button className="bq-icon-btn danger" onClick={() => onGerenciar(questao)} title="Arquivar ou Excluir">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────── */
export default function QuestoesBanco({ onEdit, refreshKey, onRemovida }) {
  // Quem sou eu?
  const { professor_id: meuProfId, perfil: meuPerfil } = decodificarToken();
  const isGestor = ['diretor', 'coordenador', 'admin', 'militar'].includes(meuPerfil);

  const [questoes,   setQuestoes]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [stats,      setStats]      = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [detalhes,   setDetalhes]   = useState(null);  // questão aberta no modal
  const [questaoParaExcluir, setQuestaoParaExcluir] = useState(null); // controla modal

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
  const [showBulk,    setShowBulk]    = useState(false);

  const buscaTimer = useRef(null);

  /* Fetch principal — server-side */
  const carregar = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: LIMIT });
      if (busca)        params.set('busca', busca);
      if (filtDisc)     params.set('disciplina', filtDisc);
      if (filtTipo)     params.set('tipo', filtTipo);
      if (filtNivel)    params.set('nivel', filtNivel);
      if (filtSerie)    params.set('serie', filtSerie);
      if (filtBimestre) params.set('bimestre', filtBimestre);
      if (filtStatus)   params.set('status', filtStatus);

      const { data } = await apiService.get(`/api/questoes?${params}`);

      // Suporte ao retorno antigo (array) e novo (objeto com pagination)
      if (Array.isArray(data)) {
        setQuestoes(data);
        setPagination({ total: data.length, page: 1, pages: 1 });
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
      const { data } = await apiService.get('/api/questoes/stats');
      setStats(data);
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
    try {
      await apiService.post(`/api/questoes/${questao.id}/duplicar`);
      carregar(page);
      carregarStats();
    } catch {}
  };

  /* Arquivar (soft delete) */
  const arquivar = async (id) => {
    try {
      await apiService.delete(`/api/questoes/${id}`);
      setQuestoes(p => p.filter(q => q.id !== id));
      carregarStats();
      setQuestaoParaExcluir(null);
      onRemovida?.(); // notifica o pai (BancoQuestoes) para atualizar o header
    } catch (err) {
      const msg = err?.response?.data?.message || 'Não foi possível arquivar a questão.';
      alert(msg);
    }
  };

  /* Excluir definitivamente (hard delete) */
  const excluirDefinitivo = async (id) => {
    try {
      await apiService.delete(`/api/questoes/${id}?hard=1`);
      setQuestoes(p => p.filter(q => q.id !== id));
      carregarStats();
      setQuestaoParaExcluir(null);
      onRemovida?.(); // notifica o pai (BancoQuestoes) para atualizar o header
    } catch (err) {
      const msg = err?.response?.data?.message || 'Não foi possível excluir a questão.';
      alert(msg);
    }
  };

  const limparFiltros = () => {
    setBusca(''); setFiltDisc(''); setFiltTipo(''); setFiltNivel('');
    setFiltSerie(''); setFiltBimestre(''); setFiltStatus('');
    setPage(1);
  };

  const temFiltroAtivo = busca || filtDisc || filtTipo || filtNivel || filtSerie || filtBimestre || filtStatus;

  return (
    <div>
      {/* Modal de Exclusão Premium */}
      <ExclusaoModal
        questao={questaoParaExcluir}
        onArquivar={() => arquivar(questaoParaExcluir.id)}
        onExcluir={() => excluirDefinitivo(questaoParaExcluir.id)}
        onCancel={() => setQuestaoParaExcluir(null)}
      />

      {/* Modal Importação em Massa */}
      {showBulk && (
        <BulkImportModal
          onClose={() => setShowBulk(false)}
          onImportado={() => { setShowBulk(false); carregar(1); carregarStats(); }}
        />
      )}

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

        {/* Botão Importação em Massa */}
        <button
          className="bq-btn bq-btn-primary"
          onClick={() => setShowBulk(true)}
          style={{ marginLeft: 'auto', padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
        >
          📥 Importar em Massa
        </button>
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
              onGerenciar={(questao) => setQuestaoParaExcluir(questao)}
              onClick={(q) => setDetalhes(q)}
              isAutor={isGestor || (meuProfId && Number(q.professor_id) === Number(meuProfId))}
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
