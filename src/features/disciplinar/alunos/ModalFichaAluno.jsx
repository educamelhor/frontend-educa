// src/features/disciplinar/alunos/ModalFichaAluno.jsx
// Wrapper modal — usa FichaAlunoDisciplinar (ISOLADO: apenas Relatório Disciplinar)
import React from 'react';
import FichaAlunoDisciplinar from './FichaAlunoDisciplinar';

export default function ModalFichaAluno({ open, codigo, onClose }) {
  if (!open || !codigo) return null;

  return (
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

        {/* Conteúdo — FichaAluno premium */}
        <div style={{ padding: '0 0 16px' }}>
          <FichaAlunoDisciplinar codigo={codigo} />
        </div>
      </div>
    </div>
  );
}
