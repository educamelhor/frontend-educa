// src/features/administrativo/MemorandoPage.jsx
// ============================================================================
// PÁGINA INDEPENDENTE — MÓDULO MEMORANDO (SEEDF)
// Separada do módulo de Folha de Ponto para gestão exclusiva de Memorandos
// (ex: Memorando de Devolução SEEDF — modelo UNIGEP).
// ============================================================================

import React from "react";
import { useAdministrativoData } from "./useAdministrativoData";
import MemorandoTab from "./MemorandoTab";

export default function MemorandoPage() {
  const {
    servidores,
    ocorrencias,
    memorandos,
    salvarMemorando,
    excluirMemorando,
  } = useAdministrativoData();

  return (
    <div className="pb-10">
      <MemorandoTab
        servidores={servidores}
        ocorrencias={ocorrencias}
        memorandos={memorandos}
        onSalvarMemorando={salvarMemorando}
        onExcluirMemorando={excluirMemorando}
      />
    </div>
  );
}
