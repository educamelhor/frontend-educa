// src/features/questoes/ProvasHistorico.jsx
// Lista de provas salvas com ações

import React, { useState, useEffect, useCallback } from 'react';
import ProvaPreview from './ProvaPreview';


const STATUS_CFG = {
  montando:  { label: 'Montando',  color: '#d97706', bg: '#fffbeb', icon: '🔧' },
  pronta:    { label: 'Pronta',    color: '#059669', bg: '#f0fdf4', icon: '✅' },
  impressa:  { label: 'Impressa',  color: '#1d4ed8', bg: '#eff6ff', icon: '🖨️' },
  aplicada:  { label: 'Aplicada',  color: '#7c3aed', bg: '#f5f3ff', icon: '📝' },
};

const TEMPLATE_LABEL = {
  objetiva_2col: '📋 2 Colunas', objetiva_1col: '📄 1 Coluna',
  discursiva: '✍️ Discursiva', mista: '🔀 Mista', enem: '🏆 ENEM',
};

const api = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const r = await fetch(path, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...opts,
  });
  if (!r.ok && r.status !== 204) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.message || `HTTP ${r.status}`);
  }
  return r.status === 204 ? null : r.json().catch(() => null);
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProvasHistorico({ onEdit, refreshKey }) {
  const [provas,     setProvas]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filtro,     setFiltro]     = useState('');
  const [delId,      setDelId]      = useState(null);
  const [previewId,  setPreviewId]  = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/provas');
      setProvas(Array.isArray(data) ? data : []);
    } catch { setProvas([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar, refreshKey]);

  const excluir = async (id) => {
    await api(`/api/provas/${id}`, { method: 'DELETE' });
    setProvas(p => p.filter(prova => prova.id !== id));
    setDelId(null);
  };

  const filtradas = provas.filter(p =>
    !filtro ||
    (p.titulo || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (p.disciplina || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (p.turma || '').toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div>
      {/* Busca */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
        <div className="bq-search-box" style={{ flex: 1, maxWidth: 360 }}>
          <svg className="bq-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search" placeholder="Buscar por título, disciplina ou turma..."
            value={filtro} onChange={e => setFiltro(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          {filtradas.length} prova(s)
        </span>
      </div>

      {loading ? (
        <div className="bq-loading">
          <div className="bq-loading-spinner" /> Carregando provas...
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bq-empty" style={{ padding: '60px 20px' }}>
          <div className="bq-empty-icon">📋</div>
          <div className="bq-empty-title">{filtro ? 'Nenhuma prova encontrada' : 'Nenhuma prova criada'}</div>
          <p className="bq-empty-desc">
            {filtro ? 'Ajuste o filtro.' : 'Vá para a aba "Montar Prova" e crie sua primeira prova.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(prova => {
            const s = STATUS_CFG[prova.status] || STATUS_CFG.montando;
            return (
              <div key={prova.id} style={{
                background: '#fff', borderRadius: 12,
                border: '1.5px solid #e2e8f0',
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
              >
                {/* Ícone de template */}
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #0f172a, #0e7490)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem',
                }}>
                  {TEMPLATE_LABEL[prova.template_slug]?.split(' ')[0] || '📋'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {prova.titulo || 'Sem título'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {prova.disciplina && <span>📚 {prova.disciplina}</span>}
                    {prova.turma     && <span>👥 {prova.turma}</span>}
                    {prova.bimestre  && <span>📅 {prova.bimestre}º Bim</span>}
                    {prova.ano_letivo && <span>🗓 {prova.ano_letivo}</span>}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0e7490' }}>{prova.total_questoes || 0}</div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Questões</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>{Number(prova.total_pontos || 0).toFixed(0)}</div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Pontos</div>
                  </div>
                </div>

                {/* Status */}
                <span style={{
                  padding: '4px 12px', borderRadius: 99, flexShrink: 0,
                  background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700,
                  border: `1px solid ${s.color}30`,
                }}>
                  {s.icon} {s.label}
                </span>

                {/* Template */}
                <span style={{ fontSize: '0.68rem', color: '#64748b', flexShrink: 0 }}>
                  {TEMPLATE_LABEL[prova.template_slug] || prova.template_slug}
                </span>

                {/* Data */}
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
                  {fmtDate(prova.criada_em)}
                </span>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setPreviewId(prova.id)}
                    style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg, #0e7490, #1d4ed8)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 700 }}>
                    👁️ PDF
                  </button>
                  <button onClick={() => onEdit && onEdit(prova)}
                    style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #bae6fd', background: '#f0f9ff', color: '#0369a1', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 700 }}>
                    ✏️ Editar
                  </button>
                  {delId === prova.id ? (
                    <button onClick={() => excluir(prova.id)}
                      style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 700 }}>
                      Confirmar ×
                    </button>
                  ) : (
                    <button onClick={() => setDelId(prova.id)}
                      style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.76rem' }}>
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de preview PDF */}
      {previewId && (
        <ProvaPreview provaId={previewId} onClose={() => setPreviewId(null)} />
      )}
    </div>
  );
}
