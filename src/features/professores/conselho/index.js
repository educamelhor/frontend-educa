// src/features/professores/conselho/index.js
// ============================================================================
// BARREL DE PROTEÇÃO — Módulo Professores › Conselho de Classe
// ============================================================================
//
// PROPÓSITO: Garantir que TODOS os arquivos do módulo estejam presentes.
// Se qualquer arquivo abaixo estiver faltando, o BUILD QUEBRA imediatamente
// com um erro de import, impedindo que código incompleto chegue à produção.
//
// ⚠️  NUNCA remova um import deste arquivo sem antes remover o componente
//     correspondente do ConselhoClasseProfessor.jsx e do App.jsx.
//
// ⚠️  Se precisar adicionar um novo componente ao módulo, adicione aqui também.
//
// ISOLAMENTO: Este módulo é 100% independente.
//   - NÃO compartilha componentes com pedagogico/conselho/
//   - NÃO compartilha componentes com alunos/
//   - A rota /professores/conselho em App.jsx DEVE usar ConselhoClasseProfessor
//     (NÃO ConselhoClasse do pedagogico)
// ============================================================================

export { default as ConselhoClasseProfessor }          from "./ConselhoClasseProfessor";
export { default as ModalFichaConselhoClasse }         from "./ModalFichaConselhoClasse";
export { default as ModalRelatorioPedagogicoProfessor} from "./ModalRelatorioPedagogicoProfessor";
export { default as ModalNovaOcorrenciaPedagogicaProfessor } from "./ModalNovaOcorrenciaPedagogicaProfessor";
export { default as ModalZoomFotoProfessor }           from "./ModalZoomFotoProfessor";
