// src/features/comunicacao/mural/MuralPage.jsx
// ============================================================================
// Módulo COMUNICAÇÃO — Sub-módulo: Mural
// Mural digital da unidade de ensino.
// ============================================================================
import React from 'react';

export default function MuralPage() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: '48px 24px',
    }}>
      {/* Ícone */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 40, height: 40, color: '#fff' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      </div>

      {/* Título */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#1e293b',
          margin: 0,
          lineHeight: 1.2,
        }}>
          Mural Digital
        </h1>
        <p style={{
          marginTop: 8,
          fontSize: '1rem',
          color: '#64748b',
          maxWidth: 480,
          lineHeight: 1.6,
        }}>
          Mural digital da escola — um espaço para publicações, notícias e
          informações relevantes para toda a comunidade escolar.
        </p>
      </div>

      {/* Badge Em breve */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(14,165,233,0.1))',
        border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: 12,
        padding: '10px 20px',
      }}>
        <span style={{ fontSize: '1rem' }}>🚧</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981' }}>
          Módulo em desenvolvimento
        </span>
      </div>
    </div>
  );
}
