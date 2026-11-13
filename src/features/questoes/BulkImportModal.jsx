// src/features/questoes/BulkImportModal.jsx
// Wrapper compatível do Importador Inteligente de Listas, Páginas e PDFs (EDUCA.STUDIO AI — Fase 2)

import React from 'react';
import ImportarListaModal from './components/ImportarListaModal';

export default function BulkImportModal({ onClose, onImportado, onAbrirNoEstudio = null }) {
  return (
    <ImportarListaModal
      onClose={onClose}
      onImportado={onImportado}
      onAbrirNoEstudio={onAbrirNoEstudio}
    />
  );
}
