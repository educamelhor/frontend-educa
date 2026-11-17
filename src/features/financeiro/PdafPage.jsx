// src/features/financeiro/PdafPage.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo Financeiro > PDAF
// Programa de Descentralização Administrativa e Financeira
// (Página em branco — definição completa será implementada no Passo 3)
// ============================================================================

import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function PdafPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <button
          type="button"
          onClick={() => navigate("/financeiro")}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Voltar para Financeiro
        </button>
      </div>

      {/* Superfície em branco aguardando definição do Passo 3 */}
      <div className="min-h-[75vh] bg-white rounded-3xl border border-slate-200 shadow-sm" />
    </div>
  );
}
