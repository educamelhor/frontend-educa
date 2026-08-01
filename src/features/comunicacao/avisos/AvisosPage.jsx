// src/features/comunicacao/avisos/AvisosPage.jsx
// ============================================================================
// Módulo COMUNICAÇÃO — Sub-módulo: Avisos
// Avisos internos da unidade de ensino.
// ============================================================================
import React from 'react';

export default function AvisosPage() {
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
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 40, height: 40, color: '#fff' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
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
          Avisos
        </h1>
        <p style={{
          marginTop: 8,
          fontSize: '1rem',
          color: '#64748b',
          maxWidth: 480,
          lineHeight: 1.6,
        }}>
          Avisos internos da unidade de ensino. Em breve você poderá criar,
          gerenciar e publicar avisos para toda a equipe escolar.
        </p>
      </div>

      {/* Badge Em breve */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 12,
        padding: '10px 20px',
      }}>
        <span style={{ fontSize: '1rem' }}>🚧</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6366f1' }}>
          Módulo em desenvolvimento
        </span>
      </div>
    </div>
  );
}
