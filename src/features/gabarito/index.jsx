// ============================================================================
// MÓDULO GABARITO — Layout Unificado com Governança
// EDUCA.MELHOR — Sistema de Correção Automatizada Premium
// Unifica TODAS as etapas do Gabarito com tabs condicionais por perfil:
//   - Professor / Coordenador: Corrigir + Resultados
//   - Diretor / Vice / Supervisor: Gerar + Corrigir Lote + Corrigir + Resultados
// ============================================================================

import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GabaritoGerar from "./GabaritoGerar";
import GabaritoCorrigirLote from "./GabaritoCorrigirLote";
import GabaritoCorrigirProfessor from "./GabaritoCorrigirProfessor";
import GabaritoResultados from "./GabaritoResultados";
import "./gabarito.css";

// ─── Ícones SVG inline (evitar dependência extra) ───
const IconGerar = () => (
  <svg className="gab-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" />
  </svg>
);

const IconCorrigirLote = () => (
  <svg className="gab-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const IconCorrigir = () => (
  <svg className="gab-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
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

// ─── Definição de TODAS as tabs ───
const ALL_TABS = [
  { id: "gerar",         label: "Gerar",          icon: IconGerar,        badge: "ETAPA 1", adminOnly: true },
  { id: "corrigir-lote", label: "Corrigir Lote",  icon: IconCorrigirLote,  badge: "ETAPA 2", adminOnly: true },
  { id: "corrigir",      label: "Corrigir",       icon: IconCorrigir,      badge: "ETAPA 3", adminOnly: false },
  { id: "resultados",    label: "Resultados",     icon: IconResultados,    badge: "ETAPA 4", adminOnly: false },
];

// Mapeia path para tab id
function getTabFromPath(pathname) {
  if (pathname.includes("/gerar") || pathname.includes("/imprimir")) return "gerar";
  if (pathname.includes("/corrigir-lote")) return "corrigir-lote";
  if (pathname.includes("/resultados")) return "resultados";
  if (pathname.includes("/corrigir")) return "corrigir";
  if (pathname === "/gabarito") return "corrigir"; // fallback para rota raiz
  return null;
}

export default function GabaritoModule() {
  const location = useLocation();
  const navigate = useNavigate();

  // ─── Governança: perfil determina quais tabs são visíveis ───
  const perfil = String(localStorage.getItem("perfil") || "").toLowerCase().trim();
  const isAdmin = !["professor", "coordenador"].includes(perfil);

  // Tabs disponíveis para este perfil
  const tabs = useMemo(
    () => ALL_TABS.filter((t) => !t.adminOnly || isAdmin),
    [isAdmin]
  );

  // Tab ativa com base na URL (ou primeira disponível)
  const tabFromUrl = getTabFromPath(location.pathname);
  const defaultTab = tabs.find((t) => t.id === tabFromUrl)?.id || tabs[0]?.id || "corrigir";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sincronizar tab com URL quando pathname muda
  useEffect(() => {
    const newTab = getTabFromPath(location.pathname);
    if (newTab && tabs.find((t) => t.id === newTab)) {
      setActiveTab(newTab);
    }
  }, [location.pathname, tabs]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "corrigir") navigate("/gabarito/corrigir");
    else navigate(`/gabarito/${tabId}`);
  };

  // Componente ativo
  const renderContent = () => {
    switch (activeTab) {
      case "gerar":         return <GabaritoGerar />;
      case "corrigir-lote": return <GabaritoCorrigirLote />;
      case "corrigir":      return <GabaritoCorrigirProfessor />;
      case "resultados":    return <GabaritoResultados />;
      default:              return <GabaritoCorrigirProfessor />;
    }
  };

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
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`gab-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
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
        {renderContent()}
      </div>
    </div>
  );
}
