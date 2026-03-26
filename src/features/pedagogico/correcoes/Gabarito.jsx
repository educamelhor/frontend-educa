// ============================================================================
// PEDAGÓGICO > GABARITO — Layout Wrapper
// Renderiza a etapa correta conforme prop recebida via rota
// Etapa 1 = Imprimir | Etapa 2 = Corrigir (Lote) | Etapa 3 = Resultados
// ============================================================================

import React from "react";
import GabaritoGerar from "../../gabarito/GabaritoGerar";
import GabaritoCorrigirLote from "../../gabarito/GabaritoCorrigirLote";
import GabaritoResultados from "../../gabarito/GabaritoResultados";
import "../../gabarito/gabarito.css";

const ETAPAS = {
  imprimir: {
    component: GabaritoGerar,
    title: "IMPRIMIR GABARITOS",
    subtitle: "ETAPA 1 — CONFIGURAÇÃO & IMPRESSÃO",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" />
      </svg>
    ),
  },
  corrigir: {
    component: GabaritoCorrigirLote,
    title: "CORRIGIR EM LOTE",
    subtitle: "ETAPA 2 — UPLOAD POR TURMA",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
  },
  resultados: {
    component: GabaritoResultados,
    title: "RESULTADOS",
    subtitle: "ETAPA 3 — ANÁLISE & DESEMPENHO",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
};

export default function Gabarito({ etapa = "imprimir" }) {
  const config = ETAPAS[etapa] || ETAPAS.imprimir;
  const EtapaComponent = config.component;

  return (
    <div className="gabarito-module">
      {/* ─── Header ─── */}
      <div className="gab-header">
        <div className="gab-header-left">
          <div className="gab-logo-icon">
            {config.icon}
          </div>
          <div>
            <div className="gab-title">{config.title}</div>
            <div className="gab-subtitle">{config.subtitle}</div>
          </div>
        </div>
      </div>

      {/* ─── Conteúdo ─── */}
      <div className="gab-content">
        <EtapaComponent />
      </div>
    </div>
  );
}
