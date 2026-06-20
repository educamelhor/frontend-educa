// src/features/manutencao/ManutencaoScreen.jsx
// =========================================================================
// Tela premium de manutenção programada — exibida no lugar do login
// quando o sistema está em manutenção.
// =========================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function calcCountdown(fim) {
  const now = new Date();
  const end = new Date(fim);
  const diff = end - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export default function ManutencaoScreen({ data }) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(calcCountdown(data?.fim));

  useEffect(() => {
    const interval = setInterval(() => {
      const c = calcCountdown(data?.fim);
      setCountdown(c);
      if (!c) {
        clearInterval(interval);
        // Manutenção expirou — redireciona para login
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.fim]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: '#e2e8f0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background circles */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        animation: 'pulse 4s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        animation: 'pulse 5s ease-in-out infinite 1s',
      }} />

      {/* Main card */}
      <div style={{
        background: 'rgba(30,41,59,0.7)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px',
        border: '1px solid rgba(148,163,184,0.12)',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Gear icon */}
        <div style={{
          fontSize: '56px',
          marginBottom: '8px',
          animation: 'spin 8s linear infinite',
        }}>
          ⚙️
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
          letterSpacing: '-0.02em',
        }}>
          Manutenção Programada
        </h1>

        <p style={{
          fontSize: '1rem',
          color: '#94a3b8',
          lineHeight: 1.6,
          marginBottom: '24px',
          maxWidth: '380px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          {data?.mensagem || 'O sistema está em manutenção programada.'}
        </p>

        {/* Period */}
        <div style={{
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>
            Período de manutenção
          </div>
          <div style={{ fontSize: '0.95rem', color: '#cbd5e1' }}>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{formatDate(data?.inicio)}</span>
            <span style={{ margin: '0 8px', color: '#475569' }}>→</span>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{formatDate(data?.fim)}</span>
          </div>
        </div>

        {/* Countdown */}
        {countdown && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))',
            border: '1px solid rgba(139,92,246,0.15)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontWeight: 600 }}>
              Retorno em
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Logo */}
        <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, letterSpacing: '0.05em' }}>
          EDUCA.MELHOR
        </div>
      </div>

      {/* CEO access link */}
      <button
        onClick={() => navigate('/login?acesso=plataforma')}
        style={{
          marginTop: '32px',
          background: 'none',
          border: 'none',
          color: '#334155',
          fontSize: '0.75rem',
          cursor: 'pointer',
          padding: '8px 16px',
          borderRadius: '8px',
          transition: 'color 0.2s',
          zIndex: 1,
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => e.target.style.color = '#64748b'}
        onMouseLeave={e => e.target.style.color = '#334155'}
      >
        Acesso administrativo →
      </button>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
