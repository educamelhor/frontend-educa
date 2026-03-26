// ============================================================================
// MÓDULO GABARITO — Layout Principal com Navegação por Abas
// EDUCA.MELHOR — Sistema de Correção Automatizada Premium
// Etapa 1 migrada para Pedagógico > Correções > Gabarito (governança)
// Mantém Etapa 2 (Corrigir) e Etapa 3 (Resultados)
// ============================================================================

import React, { useState } from "react";
import GabaritoCorrigirProfessor from "./GabaritoCorrigirProfessor";
import GabaritoResultados from "./GabaritoResultados";
import "./gabarito.css";

// ─── Ícones SVG inline (evitar dependência extra) ───
const IconCorrigir = () => (
  <svg className="gab-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const IconResultados = () => (
  <svg className="gab-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const LogoIcon = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);

const TABS = [
  { id: "corrigir", label: "Corrigir", icon: IconCorrigir, badge: "ETAPA 2" },
  { id: "resultados", label: "Resultados", icon: IconResultados, badge: "ETAPA 3" },
];

export default function GabaritoModule() {
  const [activeTab, setActiveTab] = useState("corrigir");

  return (
    <div className="gabarito-module">
      {/* ─── Header ─── */}
      <div className="gab-header">
        <div className="gab-header-left">
          <div className="gab-logo-icon">
            <LogoIcon />
          </div>
          <div>
            <div className="gab-title">GABARITO</div>
            <div className="gab-subtitle">SISTEMA DE CORREÇÃO AUTOMATIZADA</div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="gab-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`gab-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon />
              {tab.label}
              <span className="gab-tab-badge">{tab.badge}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Conteúdo ─── */}
      <div className="gab-content" key={activeTab}>
        {activeTab === "corrigir" && <GabaritoCorrigirProfessor />}
        {activeTab === "resultados" && <GabaritoResultados />}
      </div>
    </div>
  );
}
