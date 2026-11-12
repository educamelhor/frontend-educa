// src/features/questoes/components/QuestaoDetalhes.jsx
// Modal de visualização completa de uma questão (suporta todos os 7 modelos + KaTeX + Smart Media)

import React, { useEffect, useState } from 'react';
import {
  TIPO_META,
  QuestaoCorpoEstruturado,
  MathText,
  resumirGabaritoQuestao,
} from '../utils/questaoRenderer';

const NIVEL_COLORS = {
  facil:   { bg: '#ecfdf5', text: '#059669', border: '#6ee7b7' },
  medio:   { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
  dificil: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  enem:    { bg: '#f5f3ff', text: '#7c3aed', border: '#c4b5fd' },
};

const NIVEL_LABEL = { facil: '⭐ Fácil', medio: '⭐⭐ Médio', dificil: '⭐⭐⭐ Difícil', enem: '🏆 ENEM' };

export default function QuestaoDetalhes({ questao, onClose, onEdit }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!questao) return null;

  let tags = [];
  try {
    const raw = questao.tags;
    tags = typeof raw === 'string' ? raw.split(',').map(t => t.trim()).filter(Boolean) : (raw || []);
  } catch {}

  const nivel = questao.nivel || 'medio';
  const nivelC = NIVEL_COLORS[nivel] || NIVEL_COLORS.medio;
  const codigoExibicao = questao.codigo || `EMQE-${String(questao.numero_q || questao.id).padStart(5, '0')}`;
  const gabaritoResumo = resumirGabaritoQuestao(questao);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'bq-fadein 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 16,
        maxWidth: 760,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header do modal */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 100%)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', flexShrink: 0,
          }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'monospace', fontSize: '0.74rem', color: '#6ee7b7',
                fontWeight: 800, letterSpacing: '0.06em', background: 'rgba(0,0,0,0.25)',
                padding: '2px 8px', borderRadius: 6,
              }}>
                {codigoExibicao}
              </span>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(codigoExibicao); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: '0.75rem' }}
                title="Copiar código da questão"
              >
                {copiado ? '✓ Copiado' : '📋'}
              </button>
              {questao.codigo_global && (
                <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#c4b5fd', fontWeight: 700 }}>
                  🌐 {questao.codigo_global}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700, marginTop: 2 }}>
              {questao.disciplina || 'Sem disciplina'} {questao.serie ? `— ${questao.serie}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onEdit && (
              <button
                onClick={() => { onClose(); onEdit(questao); }}
                style={{
                  padding: '6px 14px', border: '1.5px solid rgba(255,255,255,0.3)',
                  borderRadius: 8, background: 'rgba(255,255,255,0.1)',
                  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                ✏️ Editar
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: 8, background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '1.1rem', fontWeight: 700,
              }}
              title="Fechar (Esc)"
            >
              ×
            </button>
          </div>
        </div>

        {/* Meta badges */}
        <div style={{
          padding: '12px 20px',
          display: 'flex', gap: 8, flexWrap: 'wrap',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc', flexShrink: 0,
        }}>
          <span style={{
            padding: '4px 12px', borderRadius: 99,
            background: nivelC.bg, color: nivelC.text, border: `1px solid ${nivelC.border}`,
            fontSize: '0.76rem', fontWeight: 700,
          }}>
            {NIVEL_LABEL[nivel] || nivel}
          </span>

          <span style={{ padding: '4px 12px', borderRadius: 99, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', fontSize: '0.76rem', fontWeight: 700 }}>
            {TIPO_META[questao.tipo]?.emoji} {TIPO_META[questao.tipo]?.label || questao.tipo || 'Objetiva'}
          </span>

          {questao.fonte && (
            <span style={{ padding: '4px 12px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.76rem', fontWeight: 700 }}>
              📖 {questao.fonte}
            </span>
          )}

          {questao.habilidade_bncc && (
            <span style={{ padding: '4px 12px', borderRadius: 99, background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', fontSize: '0.76rem', fontWeight: 700 }}>
              📐 {questao.habilidade_bncc}
            </span>
          )}

          {questao.status === 'rascunho' && (
            <span style={{ padding: '4px 12px', borderRadius: 99, background: '#fafafa', color: '#78716c', border: '1px solid #d6d3d1', fontSize: '0.76rem', fontWeight: 700 }}>
              📝 Rascunho
            </span>
          )}
        </div>

        {/* Corpo scrollável */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          <div style={{ marginBottom: 16 }}>
            <QuestaoCorpoEstruturado questao={questao} showGabarito={true} />
          </div>

          {gabaritoResumo && gabaritoResumo !== '—' && (
            <div style={{
              marginBottom: 14, padding: '8px 14px', borderRadius: 8,
              background: '#ecfdf5', border: '1px solid #6ee7b7',
              fontSize: '0.82rem', fontWeight: 800, color: '#065f46',
            }}>
              ✅ Gabarito Oficial: {gabaritoResumo}
            </div>
          )}

          {/* Resolução comentada */}
          {questao.explicacao && (
            <details open style={{ marginBottom: 16 }}>
              <summary style={{
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                color: '#0e7490', padding: '6px 0', userSelect: 'none',
              }}>
                💡 Resolução comentada passo a passo
              </summary>
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 8, padding: '12px 14px', marginTop: 6,
                fontSize: '0.86rem', color: '#166534', lineHeight: 1.65,
              }}>
                <MathText text={questao.explicacao} />
              </div>
            </details>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {tags.map(t => (
                <span key={t} style={{
                  padding: '3px 10px', borderRadius: 99,
                  background: '#dbeafe', border: '1px solid #93c5fd',
                  color: '#1e40af', fontSize: '0.73rem', fontWeight: 600,
                }}>{t}</span>
              ))}
            </div>
          )}

          {/* Rodapé com metadados */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10, padding: '12px 16px',
            background: '#f8fafc', borderRadius: 10,
            border: '1px solid #e2e8f0',
          }}>
            {[
              { label: 'Código Escolar', value: codigoExibicao },
              { label: 'Criada em', value: formatDate(questao.criada_em) },
              { label: 'Atualizada em', value: formatDate(questao.atualizada_em) },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
