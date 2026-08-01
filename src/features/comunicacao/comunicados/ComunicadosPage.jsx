// src/features/comunicacao/comunicados/ComunicadosPage.jsx
// ============================================================================
// Módulo COMUNICAÇÃO — Sub-módulo: Comunicados
// Comunicados oficiais para pais, responsáveis e comunidade escolar.
// ============================================================================
import React from 'react';

export default function ComunicadosPage() {
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
        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(14,165,233,0.35)',
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 40, height: 40, color: '#fff' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
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
          Comunicados
        </h1>
        <p style={{
          marginTop: 8,
          fontSize: '1rem',
          color: '#64748b',
          maxWidth: 480,
          lineHeight: 1.6,
        }}>
          Comunicados oficiais da escola para pais, responsáveis e comunidade.
          Em breve você poderá criar e enviar comunicados digitais com confirmação de leitura.
        </p>
      </div>

      {/* Badge Em breve */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))',
        border: '1px solid rgba(14,165,233,0.25)',
        borderRadius: 12,
        padding: '10px 20px',
      }}>
        <span style={{ fontSize: '1rem' }}>🚧</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9' }}>
          Módulo em desenvolvimento
        </span>
      </div>
    </div>
  );
}
