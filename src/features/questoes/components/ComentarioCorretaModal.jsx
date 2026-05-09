// src/features/questoes/components/ComentarioCorretaModal.jsx
// Modal premium — solicitação de justificativa ao marcar a alternativa correta

import React, { useState, useEffect, useRef } from 'react';

/**
 * Props:
 *  letraCorreta  — 'B', 'C', etc.
 *  textoCorreta  — texto da alternativa marcada
 *  comentarioAtual — valor atual de form.explicacao (para edição)
 *  onSalvar(texto) — salva e fecha
 *  onPular()       — fecha sem salvar (mantém comentário existente)
 */
export default function ComentarioCorretaModal({
  letraCorreta,
  textoCorreta,
  comentarioAtual = '',
  onSalvar,
  onPular,
}) {
  const [texto, setTexto]       = useState(comentarioAtual);
  const [animIn, setAnimIn]     = useState(false);
  const textareaRef             = useRef(null);

  // Animação de entrada + foco no textarea
  useEffect(() => {
    requestAnimationFrame(() => setAnimIn(true));
    setTimeout(() => textareaRef.current?.focus(), 300);
  }, []);

  const handleSalvar = () => {
    onSalvar(texto.trim());
  };

  const handlePular = () => {
    onPular();
  };

  const temTexto = texto.trim().length > 0;

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, ...(animIn ? styles.modalIn : {}) }}>

        {/* ── Faixa topo premium ── */}
        <div style={styles.topBar}>
          <div style={styles.topBarInner}>
            <span style={styles.starIcon}>⭐</span>
            <span style={styles.topBarText}>Recurso Premium · Feedback Pedagógico</span>
          </div>
        </div>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.checkCircle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div style={styles.headerTitle}>Alternativa correta marcada!</div>
            <div style={styles.headerSub}>
              <span style={styles.letraBadge}>{letraCorreta}</span>
              <span style={styles.textoCorreta}>{textoCorreta?.length > 60 ? textoCorreta.substring(0, 57) + '...' : textoCorreta}</span>
            </div>
          </div>
        </div>

        {/* ── Corpo ── */}
        <div style={styles.body}>

          {/* Card explicativo */}
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>💡</div>
            <div>
              <div style={styles.infoTitle}>Deseja adicionar uma justificativa?</div>
              <div style={styles.infoDesc}>
                Explique por que esta alternativa é a correta. Esse comentário será usado como
                <strong> feedback automático para os alunos</strong> ao realizarem provas e atividades — criando
                uma experiência de estudo guiado.
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div style={styles.textareaWrap}>
            <label style={styles.textareaLabel}>
              📝 Justificativa / Resolução comentada
              <span style={styles.opcionalBadge}>Opcional</span>
            </label>
            <textarea
              ref={textareaRef}
              style={styles.textarea}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={`Ex: A alternativa ${letraCorreta} está correta porque...\n\nVocê pode usar $LaTeX$ para expressões matemáticas.`}
              rows={5}
            />
            <div style={styles.charCount}>{texto.length} caracteres</div>
          </div>

          {/* Benefícios Premium */}
          <div style={styles.premiumBox}>
            <div style={styles.premiumTitle}>🏆 Recurso de Assinatura</div>
            <div style={styles.premiumGrid}>
              <div style={styles.premiumItem}>
                <span style={styles.premiumItemIcon}>📚</span>
                <span>Alunos assinantes recebem o feedback completo após a prova</span>
              </div>
              <div style={styles.premiumItem}>
                <span style={styles.premiumItemIcon}>🎯</span>
                <span>Aumenta a taxa de aprendizado com estudo guiado</span>
              </div>
              <div style={styles.premiumItem}>
                <span style={styles.premiumItemIcon}>✍️</span>
                <span>Justificativa aparece automaticamente no gabarito comentado</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={styles.footer}>
          <button style={styles.btnPular} onClick={handlePular}>
            Pular por agora
          </button>
          <button
            style={{ ...styles.btnSalvar, ...(!temTexto ? styles.btnSalvarVazio : {}) }}
            onClick={handleSalvar}
          >
            {temTexto ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Salvar Justificativa
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar sem comentário
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000, padding: 16,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 580,
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 32px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    opacity: 0,
    transform: 'scale(0.94) translateY(12px)',
    transition: 'opacity 0.28s ease, transform 0.28s ease',
  },
  modalIn: {
    opacity: 1,
    transform: 'scale(1) translateY(0)',
  },

  // Faixa premium
  topBar: {
    background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)',
    padding: '6px 20px',
    flexShrink: 0,
  },
  topBarInner: {
    display: 'flex', alignItems: 'center', gap: 7,
    justifyContent: 'center',
  },
  starIcon: { fontSize: '0.85rem' },
  topBarText: {
    fontSize: '0.72rem', fontWeight: 700, color: '#fff',
    letterSpacing: '0.04em', textTransform: 'uppercase',
  },

  // Header com check
  header: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '18px 22px',
    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    borderBottom: '1px solid #bbf7d0',
    flexShrink: 0,
  },
  checkCircle: {
    width: 52, height: 52, borderRadius: '50%',
    background: 'linear-gradient(135deg, #059669, #10b981)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
  },
  headerTitle: {
    fontSize: '1rem', fontWeight: 800, color: '#064e3b', marginBottom: 4,
  },
  headerSub: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  letraBadge: {
    width: 24, height: 24, borderRadius: 7,
    background: '#059669', color: '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '0.78rem', flexShrink: 0,
  },
  textoCorreta: {
    fontSize: '0.85rem', color: '#065f46', fontWeight: 500,
  },

  // Corpo
  body: {
    padding: '18px 22px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  // Card info
  infoCard: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    borderRadius: 14, padding: '14px 16px',
    border: '1px solid #bfdbfe',
  },
  infoIcon: { fontSize: '1.3rem', flexShrink: 0 },
  infoTitle: {
    fontSize: '0.9rem', fontWeight: 700, color: '#1e40af', marginBottom: 4,
  },
  infoDesc: {
    fontSize: '0.82rem', color: '#1d4ed8', lineHeight: 1.55,
  },

  // Textarea
  textareaWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  textareaLabel: {
    fontSize: '0.78rem', fontWeight: 700, color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  opcionalBadge: {
    fontSize: '0.66rem', background: '#f1f5f9', color: '#64748b',
    border: '1px solid #e2e8f0', borderRadius: 99, padding: '1px 8px',
    fontWeight: 600, textTransform: 'none', letterSpacing: 0,
  },
  textarea: {
    width: '100%', border: '2px solid #e2e8f0', borderRadius: 12,
    padding: '12px 14px', fontSize: '0.88rem', lineHeight: 1.6,
    fontFamily: 'inherit', color: '#0f172a', resize: 'vertical',
    outline: 'none', background: '#f8fafc', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  charCount: {
    fontSize: '0.7rem', color: '#94a3b8', textAlign: 'right',
  },

  // Box premium
  premiumBox: {
    background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
    borderRadius: 14, padding: '14px 16px',
    border: '1px solid #e9d5ff',
  },
  premiumTitle: {
    fontSize: '0.78rem', fontWeight: 800, color: '#7c3aed',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    marginBottom: 10,
  },
  premiumGrid: {
    display: 'flex', flexDirection: 'column', gap: 7,
  },
  premiumItem: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    fontSize: '0.8rem', color: '#6b21a8', lineHeight: 1.45,
  },
  premiumItemIcon: { fontSize: '0.9rem', flexShrink: 0 },

  // Footer
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 10, padding: '14px 22px',
    borderTop: '1px solid #f1f5f9',
    background: '#fafafa',
    flexShrink: 0,
  },
  btnPular: {
    background: 'none', border: 'none',
    color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', padding: '8px 12px',
    borderRadius: 8, transition: 'color 0.15s',
  },
  btnSalvar: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: '#fff', border: 'none', borderRadius: 12,
    padding: '10px 22px', fontWeight: 700, fontSize: '0.88rem',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  btnSalvarVazio: {
    background: 'linear-gradient(135deg, #475569, #64748b)',
    boxShadow: '0 4px 14px rgba(71,85,105,0.25)',
  },
};
