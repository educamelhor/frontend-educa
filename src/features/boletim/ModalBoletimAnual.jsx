// src/features/boletim/ModalBoletimAnual.jsx
// ============================================================================
// Modal para exibir o Boletim Anual (Ano Letivo Único)
// Pode ser utilizado em: Secretaria, Pedagógico, Conselho de Classe, etc.
// Reutiliza BoletimAnual.jsx internamente.
// ============================================================================

import React from "react";
import BoletimAnual from "./BoletimAnual";

export default function ModalBoletimAnual({ open, codigo, onClose }) {
  if (!open) return null;

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

        <BoletimAnual
          codigo={codigo}
          exibirBotaoImprimir={false}
        />
      </div>
    </div>
  );
}
