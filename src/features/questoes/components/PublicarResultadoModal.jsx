// src/features/questoes/components/PublicarResultadoModal.jsx
// Modal premium exibido após publicar/salvar questão — estilo EDUCA.MELHOR

import React, { useEffect } from 'react';

/**
 * Props:
 *  - tipo: 'success' | 'error' | 'warning'
 *  - titulo: string
 *  - mensagem: string
 *  - codigo: string (opcional) — ex: "EMQG-00001"
 *  - onClose: () => void
 *  - acoes: [{ label, onClick, primary? }] (opcional)
 */
export default function PublicarResultadoModal({
  tipo = 'success',
  titulo,
  mensagem,
  codigo,
  onClose,
  acoes = [],
}) {
  // Fechar com ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const cfg = {
    success: {
      bg:     'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
      accent: '#10b981',
      icon:   '✅',
      ring:   'rgba(16,185,129,0.25)',
    },
    warning: {
      bg:     'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
      accent: '#f59e0b',
      icon:   '⚠️',
      ring:   'rgba(245,158,11,0.25)',
    },
    error: {
      bg:     'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
      accent: '#ef4444',
      icon:   '❌',
      ring:   'rgba(239,68,68,0.25)',
    },
  }[tipo] || cfg?.success;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'prm-fadeIn 0.18s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <style>{`
        @keyframes prm-fadeIn  { from { opacity:0; transform:scale(.94) } to { opacity:1; transform:scale(1) } }
        @keyframes prm-pulse   { 0%,100% { box-shadow:0 0 0 0 ${cfg.ring} } 50% { box-shadow:0 0 0 14px transparent } }
        .prm-btn-primary {
          background: ${cfg.accent}; color: #fff; border: none;
          padding: 11px 28px; border-radius: 10px; font-size: 0.92rem;
          font-weight: 700; cursor: pointer; font-family: inherit;
          transition: filter .15s;
        }
        .prm-btn-primary:hover { filter: brightness(1.12); }
        .prm-btn-ghost {
          background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2);
          padding: 10px 22px; border-radius: 10px; font-size: 0.88rem;
          font-weight: 600; cursor: pointer; font-family: inherit;
          transition: background .15s;
        }
        .prm-btn-ghost:hover { background: rgba(255,255,255,0.18); }
      `}</style>

      <div style={{
        background: cfg.bg,
        borderRadius: 20,
        padding: '40px 36px 32px',
        maxWidth: 480, width: '100%',
        boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)`,
        color: '#fff',
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Fechar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.12)', border: 'none',
            color: '#fff', width: 32, height: 32, borderRadius: '50%',
            cursor: 'pointer', fontSize: '1.1rem', lineHeight: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Fechar"
        >×</button>

        {/* Ícone */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          border: `2px solid ${cfg.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', margin: '0 auto 20px',
          animation: tipo === 'success' ? 'prm-pulse 2s infinite' : 'none',
        }}>
          {cfg.icon}
        </div>

        {/* Título */}
        <h2 style={{
          fontSize: '1.35rem', fontWeight: 800, margin: '0 0 10px',
          letterSpacing: '-0.01em',
        }}>
          {titulo}
        </h2>

        {/* Mensagem */}
        <p style={{
          fontSize: '0.93rem', lineHeight: 1.6,
          color: 'rgba(255,255,255,0.82)', margin: '0 0 20px',
        }}>
          {mensagem}
        </p>

        {/* Badge de código EMQG */}
        {codigo && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.12)',
            border: `1px solid ${cfg.accent}`,
            borderRadius: 12, padding: '10px 20px', marginBottom: 24,
          }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 600 }}>CÓDIGO GLOBAL</span>
            <span style={{
              fontSize: '1.1rem', fontWeight: 800,
              color: cfg.accent, letterSpacing: '0.05em',
            }}>
              {codigo}
            </span>
            <button
              title="Copiar código"
              onClick={() => navigator.clipboard.writeText(codigo)}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', padding: 0, fontSize: '0.9rem',
              }}
            >📋</button>
          </div>
        )}

        {/* Ações */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {acoes.length > 0 ? acoes.map((a, i) => (
            <button
              key={i}
              className={a.primary ? 'prm-btn-primary' : 'prm-btn-ghost'}
              onClick={() => { a.onClick?.(); }}
            >
              {a.label}
            </button>
          )) : (
            <button className="prm-btn-primary" onClick={onClose}>
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
