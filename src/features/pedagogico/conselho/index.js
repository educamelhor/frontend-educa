// src/features/pedagogico/conselho/index.js
// ============================================================================
// BARREL DE PROTEÇÃO — Módulo Pedagógico › Conselho de Classe
// ============================================================================
//
// PROPÓSITO: Se qualquer arquivo abaixo estiver faltando, o BUILD QUEBRA
// imediatamente, impedindo que código incompleto chegue à produção.
//
// ⚠️  NUNCA remova um export daqui sem remover o componente correspondente.
// ⚠️  Ao criar novos componentes no módulo, adicione aqui também.
//
// ISOLAMENTO: Este módulo é 100% independente.
//   - NÃO compartilha componentes com professores/conselho/
//   - A rota /pedagogico/conselho em App.jsx DEVE usar ConselhoClasse
// ============================================================================

export { default as ConselhoClasse }           from "./ConselhoClasse";
export { default as ModalFichaConselhoClasse } from "./ModalFichaConselhoClasse";
export { default as ModalFichaAluno }          from "./ModalFichaAluno";
export { default as ModalZoomFoto }            from "./ModalZoomFoto";
