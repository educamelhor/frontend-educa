// src/features/questoes/components/QuestaoDetalhes.jsx
// Modal de visualização completa de uma questão

import React, { useEffect } from 'react';

const NIVEL_COLORS = {
  facil:   { bg: '#ecfdf5', text: '#059669', border: '#6ee7b7' },
  medio:   { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
  dificil: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  enem:    { bg: '#f5f3ff', text: '#7c3aed', border: '#c4b5fd' },
};

const NIVEL_LABEL = { facil: '⭐ Fácil', medio: '⭐⭐ Médio', dificil: '⭐⭐⭐ Difícil', enem: '🏆 ENEM' };
const TIPO_LABEL  = {
  objetiva: 'Objetiva (A–E)', discursiva: 'Discursiva',
  verdadeiro_falso: 'Verdadeiro/Falso', associacao: 'Associação', lacuna: 'Preencher Lacuna',
};

function renderLatex(text) {
  if (!text) return null;
  return text.split(/(\$[^$]+\$)/g).map((part, i) =>
    part.startsWith('$') && part.endsWith('$')
      ? <code key={i} style={{
          fontFamily: "'Fira Code', monospace", fontSize: '0.9em',
          background: '#f0f9ff', color: '#0369a1',
          padding: '1px 6px', borderRadius: 4, border: '1px solid #bae6fd',
        }}>{part}</code>
      : <span key={i}>{part}</span>
  );
}

export default function QuestaoDetalhes({ questao, onClose, onEdit }) {
  // Fechar com Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!questao) return null;

  let alts = [];
  try { alts = JSON.parse(questao.alternativas_json || '[]'); } catch {}

  let tags = [];
  try {
    const raw = questao.tags;
    tags = typeof raw === 'string' ? raw.split(',').map(t => t.trim()).filter(Boolean) : (raw || []);
  } catch {}

  const nivel = questao.nivel || 'medio';
  const nivelC = NIVEL_COLORS[nivel] || NIVEL_COLORS.medio;
  const correta = alts.find(a => a.correta || a.letra === questao.correta);

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
        maxWidth: 740,
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
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Questão #{questao.id}
            </div>
            <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>
              {questao.disciplina || 'Sem disciplina'} {questao.serie ? `— ${questao.serie}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { onClose(); onEdit(questao); }}
              style={{
                padding: '6px 14px', border: '1.5px solid rgba(255,255,255,0.3)',
                borderRadius: 8, background: 'rgba(255,255,255,0.1)',
                color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              ✏️ Editar
            </button>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: 8, background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(220,38,38,0.4)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
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
          {/* Nível */}
          <span style={{
            padding: '4px 12px', borderRadius: 99,
            background: nivelC.bg, color: nivelC.text, border: `1px solid ${nivelC.border}`,
            fontSize: '0.76rem', fontWeight: 700,
          }}>
            {NIVEL_LABEL[nivel] || nivel}
          </span>

          {/* Tipo */}
          <span style={{ padding: '4px 12px', borderRadius: 99, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', fontSize: '0.76rem', fontWeight: 700 }}>
            {TIPO_LABEL[questao.tipo] || questao.tipo || 'Objetiva'}
          </span>

          {/* Bimestre */}
          {questao.bimestre && (
            <span style={{ padding: '4px 12px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.76rem', fontWeight: 700 }}>
              {questao.bimestre}º Bimestre
            </span>
          )}

          {/* Habilidade BNCC */}
          {questao.habilidade_bncc && (
            <span style={{ padding: '4px 12px', borderRadius: 99, background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', fontSize: '0.76rem', fontWeight: 700 }}>
              📐 {questao.habilidade_bncc}
            </span>
          )}

          {/* Status */}
          {questao.status === 'rascunho' && (
            <span style={{ padding: '4px 12px', borderRadius: 99, background: '#fafafa', color: '#78716c', border: '1px solid #d6d3d1', fontSize: '0.76rem', fontWeight: 700 }}>
              📝 Rascunho
            </span>
          )}

          {/* Compartilhada */}
          {questao.compartilhada == 1 && (
            <span style={{ padding: '4px 12px', borderRadius: 99, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '0.76rem', fontWeight: 700 }}>
              🔗 Compartilhada
            </span>
          )}
        </div>

        {/* Corpo scrollável */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>

          {/* Texto de apoio */}
          {questao.texto_apoio && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderLeft: '4px solid #0e7490',
              borderRadius: 8, padding: '12px 16px', marginBottom: 16,
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0e7490', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                📄 Texto de apoio{questao.fonte ? ` — ${questao.fonte}` : ''}
              </div>
              <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                {questao.texto_apoio}
              </p>
            </div>
          )}

          {/* Enunciado */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: '0.7rem', fontWeight: 800, color: '#0f172a',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            }}>
              ENUNCIADO
              <span style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, #d97706, transparent)', borderRadius: 2 }} />
            </div>
            <p style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {renderLatex(questao.conteudo_bruto) || <em style={{ color: '#94a3b8' }}>(sem enunciado)</em>}
            </p>
          </div>

          {/* Imagem */}
          {questao.imagem_base64 && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <img
                src={questao.imagem_base64}
                alt="Imagem da questão"
                style={{
                  maxWidth: '100%', maxHeight: 280, objectFit: 'contain',
                  border: '1px solid #e2e8f0', borderRadius: 10,
                }}
              />
            </div>
          )}

          {/* Alternativas */}
          {alts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                ALTERNATIVAS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alts.map((alt, idx) => {
                  const isCorreta = alt.correta || alt.letra === questao.correta;
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '9px 14px',
                      background: isCorreta ? '#f0fdf4' : '#f8fafc',
                      border: `1.5px solid ${isCorreta ? '#6ee7b7' : '#e2e8f0'}`,
                      borderRadius: 8,
                    }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: isCorreta ? '#059669' : '#e2e8f0',
                        color: isCorreta ? '#fff' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.78rem', fontWeight: 800,
                      }}>
                        {alt.letra}
                      </span>
                      <span style={{ fontSize: '0.88rem', color: isCorreta ? '#065f46' : '#334155', lineHeight: 1.55, paddingTop: 4 }}>
                        {renderLatex(alt.texto)}
                        {isCorreta && <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 700 }}>✓ Correta</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resolução (apenas se existir) */}
          {questao.explicacao && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                color: '#0e7490', padding: '8px 0', userSelect: 'none',
              }}>
                💡 Ver resolução comentada
              </summary>
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 8, padding: '12px 14px', marginTop: 8,
                fontSize: '0.86rem', color: '#166534', lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}>
                {questao.explicacao}
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
              { label: 'Criada em', value: formatDate(questao.criada_em) },
              { label: 'Atualizada em', value: formatDate(questao.atualizada_em) },
              { label: 'ID interno', value: `#${questao.id}` },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* LaTeX snippet */}
          {questao.latex_formatado && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.73rem', fontWeight: 700, color: '#475569', userSelect: 'none', padding: '4px 0' }}>
                &lt;/&gt; Ver código LaTeX gerado
              </summary>
              <div style={{
                background: '#0f172a', borderRadius: 8, padding: '12px 14px', marginTop: 8,
                fontFamily: "'Fira Code', monospace", fontSize: '0.72rem',
                color: '#7dd3fc', whiteSpace: 'pre-wrap', overflowX: 'auto',
              }}>
                {questao.latex_formatado}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
