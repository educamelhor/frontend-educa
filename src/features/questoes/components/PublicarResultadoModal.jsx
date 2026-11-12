// src/features/questoes/components/PublicarResultadoModal.jsx
// Modal premium exibido após publicar/salvar questão — estilo EDUCA.MELHOR

import React, { useEffect, useState } from 'react';

/**
 * Props:
 *  - tipo: 'success' | 'error' | 'warning'
 *  - titulo: string
 *  - mensagem: string
 *  - codigo: string (opcional) — ex: "EMQE-00001" ou "EMQG-00001"
 *  - codigoLabel: string (opcional)
 *  - codigoSecundario: string (opcional)
 *  - codigoSecundarioLabel: string (opcional)
 *  - onClose: () => void
 *  - acoes: [{ label, onClick, primary? }] (opcional)
 */
export default function PublicarResultadoModal({
  tipo = 'success',
  titulo,
  mensagem,
  codigo,
  codigoLabel,
  codigoSecundario,
  codigoSecundarioLabel,
  onClose,
  acoes = [],
}) {
  const [copiado, setCopiado] = useState('');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const mapCfg = {
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
  };
  const cfg = mapCfg[tipo] || mapCfg.success;

  const autoLabel = (cod, custom) => {
    if (custom) return custom;
    if (String(cod || '').startsWith('EMQE')) return 'CÓDIGO DO BANCO DA ESCOLA';
    if (String(cod || '').startsWith('EMQM')) return 'CÓDIGO MASTER';
    return 'CÓDIGO DO BANCO GLOBAL';
  };

  const copiar = (txt) => {
    navigator.clipboard?.writeText(txt);
    setCopiado(txt);
    setTimeout(() => setCopiado(''), 1800);
  };

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
          padding: 11px 24px; border-radius: 10px; font-size: 0.9rem;
          font-weight: 700; cursor: pointer; font-family: inherit;
          transition: filter .15s;
        }
        .prm-btn-primary:hover { filter: brightness(1.12); }
        .prm-btn-ghost {
          background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2);
          padding: 10px 20px; border-radius: 10px; font-size: 0.86rem;
          font-weight: 600; cursor: pointer; font-family: inherit;
          transition: background .15s;
        }
        .prm-btn-ghost:hover { background: rgba(255,255,255,0.18); }
      `}</style>

      <div style={{
        background: cfg.bg,
        borderRadius: 20,
        padding: '36px 32px 28px',
        maxWidth: 500, width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        color: '#fff',
        textAlign: 'center',
        position: 'relative',
      }}>
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

        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          border: `2px solid ${cfg.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.9rem', margin: '0 auto 18px',
          animation: tipo === 'success' ? 'prm-pulse 2s infinite' : 'none',
        }}>
          {cfg.icon}
        </div>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
          {titulo}
        </h2>

        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', margin: '0 0 18px' }}>
          {mensagem}
        </p>

        {/* Badges de códigos identificáveis */}
        {(codigo || codigoSecundario) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 22 }}>
            {codigo && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.12)',
                border: `1.5px solid ${cfg.accent}`,
                borderRadius: 12, padding: '9px 18px',
              }}>
                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700 }}>
                  {autoLabel(codigo, codigoLabel)}
                </span>
                <span style={{ fontSize: '1.08rem', fontWeight: 900, color: '#6ee7b7', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                  {codigo}
                </span>
                <button
                  type="button"
                  title="Copiar código"
                  onClick={() => copiar(codigo)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
                >
                  {copiado === codigo ? '✓' : '📋'}
                </button>
              </div>
            )}

            {codigoSecundario && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 10, padding: '6px 14px',
              }}>
                <span style={{ fontSize: '0.66rem', opacity: 0.75, fontWeight: 700 }}>
                  {autoLabel(codigoSecundario, codigoSecundarioLabel)}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                  {codigoSecundario}
                </span>
                <button
                  type="button"
                  title="Copiar código"
                  onClick={() => copiar(codigoSecundario)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}
                >
                  {copiado === codigoSecundario ? '✓' : '📋'}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
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
