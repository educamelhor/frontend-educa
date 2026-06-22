// src/features/disciplinar/alunos/ModalFichaAluno.jsx
// Modal de ficha do aluno exclusivo do módulo DISCIPLINAR.
// Exibe apenas o Relatório Disciplinar (sem Relatório Pedagógico).
import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { AcademicCapIcon } from '@heroicons/react/24/solid';
import ModalRelatorioDisciplinar from '../../alunos/ModalRelatorioDisciplinar';

export default function ModalFichaAluno({ open, codigo, onClose }) {
  const [aluno, setAluno] = useState(null);
  const [ocorrenciasCount, setOcorrenciasCount] = useState(null);
  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);

  // Carrega dados do aluno
  useEffect(() => {
    if (!open || !codigo) return;
    let alive = true;
    setAluno(null);
    setOcorrenciasCount(null);
    api.get(`/api/alunos/${codigo}`)
      .then(res => { if (alive) setAluno(res.data); })
      .catch(() => { if (alive) setAluno(null); });
    return () => { alive = false; };
  }, [open, codigo]);

  // Carrega contagem de ocorrências assim que tivermos o id do aluno
  useEffect(() => {
    if (!aluno?.id) return;
    api.get(`/api/alunos/${aluno.id}/ocorrencias`)
      .then(res => {
        const lista = Array.isArray(res.data) ? res.data : [];
        const ativas = lista.filter(o => o.status !== 'CANCELADA');
        setOcorrenciasCount(ativas.length);
      })
      .catch(() => setOcorrenciasCount(0));
  }, [aluno?.id]);

  if (!open || !codigo) return null;

  // ── helpers ──────────────────────────────────────────────────
  const getInitials = (nome) => {
    if (!nome) return '?';
    const parts = nome.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const [y, m, d] = value.split('-');
        return `${d}/${m}/${y}`;
      }
      const d = new Date(value);
      const s = d.toLocaleDateString();
      return s && s !== 'Invalid Date' ? s : '—';
    } catch { return '—'; }
  };

  const apiBase = (api.defaults?.baseURL || '').replace(/\/api$/, '');
  const buildFotoURL = (path) => {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `${apiBase}${path}`;
  };

  const fotoURL = aluno ? buildFotoURL(aluno.foto) : null;
  const iniciais = aluno ? getInitials(aluno.estudante) : '?';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflowY: 'auto', padding: '24px 16px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            background: '#fff', borderRadius: 16,
            width: '100%', maxWidth: 920,
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            position: 'relative',
            minHeight: 400,
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
          }}
        >
          {/* Botão fechar */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14, zIndex: 10,
              width: 32, height: 32, borderRadius: '50%',
              border: '1.5px solid #e2e8f0', background: '#f8fafc',
              cursor: 'pointer', fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b',
            }}
            title="Fechar"
          >×</button>

          {/* ── HEADER GRADIENTE ──────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 60%, #1a4a7a 100%)',
            borderRadius: '16px 16px 0 0',
            padding: '24px 24px 20px',
            color: '#fff',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AcademicCapIcon style={{ width: 14, height: 14 }} />
              FICHA DO ESTUDANTE
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{ flexShrink: 0 }}>
                {fotoURL ? (
                  <img
                    src={fotoURL}
                    alt={aluno?.estudante || ''}
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)' }}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700, color: '#fff',
                    border: '3px solid rgba(255,255,255,0.3)',
                    letterSpacing: '-1px',
                  }}>
                    {iniciais}
                  </div>
                )}
              </div>

              {/* Nome e badges */}
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  {aluno?.estudante ?? '—'}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {aluno?.turma && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 99, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                      🎓 {aluno.turma}
                    </span>
                  )}
                  {aluno?.turno && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 99, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                      🕐 {aluno.turno}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── CORPO ─────────────────────────────────────────── */}
          <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', padding: '20px 24px 24px' }}>

            {/* Loading */}
            {!aluno && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#1e3a5f', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13 }}>Carregando dados do aluno…</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              </div>
            )}

            {aluno && (
              <>
                {/* Informações do estudante */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
                    INFORMAÇÕES DO ESTUDANTE
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {[
                      { label: 'CÓDIGO', value: aluno.codigo ?? '—' },
                      { label: 'DATA DE NASCIMENTO', value: formatDate(aluno.data_nascimento) },
                      { label: 'SEXO', value: aluno.sexo ?? '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── RELATÓRIOS — apenas Disciplinar ──────────── */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
                    RELATÓRIOS
                  </div>

                  {/* Banner Relatório Disciplinar */}
                  <div
                    onClick={() => setModalRelatorioOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setModalRelatorioOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)',
                      borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      boxShadow: '0 2px 8px rgba(15,40,71,0.15)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,40,71,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,40,71,0.15)'; }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 8 }}>🛡️</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Relatório Disciplinar</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                      {ocorrenciasCount === null
                        ? 'Carregando…'
                        : ocorrenciasCount === 0
                          ? 'Sem ocorrências'
                          : `${ocorrenciasCount} ocorrência${ocorrenciasCount > 1 ? 's' : ''} registrada${ocorrenciasCount > 1 ? 's' : ''}`
                      }
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Abrir relatório →</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal do Relatório Disciplinar */}
      {aluno && (
        <ModalRelatorioDisciplinar
          open={modalRelatorioOpen}
          onClose={() => setModalRelatorioOpen(false)}
          aluno={aluno}
        />
      )}
    </>
  );
}
