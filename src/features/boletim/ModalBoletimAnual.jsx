// src/features/boletim/ModalBoletimAnual.jsx
// ============================================================================
// Modal para exibir o Boletim Anual (Ano Letivo Único)
// Pode ser utilizado em: Secretaria, Pedagógico, Conselho de Classe, etc.
// Reutiliza BoletimAnual.jsx internamente.
// ============================================================================

import React, { useEffect, useState } from "react";
import api from "../../services/api";
import BoletimAnual from "./BoletimAnual";
import BoletimPrint from "./BoletimPrint";

export default function ModalBoletimAnual({ open, codigo, onClose }) {
  const [boletimConfigData, setBoletimConfigData] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setLoadingConfig(true);
    const eid = localStorage.getItem("escola_id");
    api
      .get("/api/governanca/boletim-config", {
        params: eid ? { escola_id: eid } : {},
      })
      .then((res) => {
        if (!cancelado) setBoletimConfigData(res.data || null);
      })
      .catch(() => {
        if (!cancelado) setBoletimConfigData(null);
      })
      .finally(() => {
        if (!cancelado) setLoadingConfig(false);
      });
    return () => {
      cancelado = true;
    };
  }, [open, codigo]);

  if (!open) return null;

  const exibirAnoAnterior = boletimConfigData?.["boletim.exibir_ano_anterior"] === "1";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          background: "#fff",
          maxWidth: "1100px",
          width: "95%",
          maxHeight: "95vh",
          overflowY: "auto",
          borderRadius: "16px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
          padding: "0.5rem",
          position: "relative",
        }}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "16px",
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#64748b",
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 10,
            transition: "color 0.15s ease",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.target.style.color = "#ef4444")}
          onMouseLeave={(e) => (e.target.style.color = "#64748b")}
          title="Fechar"
          type="button"
        >
          ×
        </button>

        {loadingConfig ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
            <span style={{ fontSize: "1.1rem", color: "#64748b" }}>Carregando configurações...</span>
          </div>
        ) : exibirAnoAnterior ? (
          <BoletimPrint
            codigo={codigo}
            exibirBotaoImprimir={false}
            boletimConfig={boletimConfigData}
          />
        ) : (
          <BoletimAnual
            codigo={codigo}
            exibirBotaoImprimir={false}
            boletimConfig={boletimConfigData}
          />
        )}
      </div>
    </div>
  );
}
