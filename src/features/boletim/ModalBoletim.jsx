// src/features/boletim/ModalBoletim.jsx
// ============================================================================
// Modal de Boletim (usado em SECRETARIA, PEDAGÓGICO e PROFESSORES)
// Verifica a governança (boletim.exibir_ano_anterior) para decidir:
//   - OFF (padrão): BoletimAnual  → apenas ano letivo atual
//   - ON:           BoletimPrint  → ano anterior + ano atual
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../services/api";
import BoletimPrint from "./BoletimPrint";
import BoletimAnual from "./BoletimAnual";

export default function ModalBoletim({ open, codigo, onClose }) {
  const [exibirAnoAnterior, setExibirAnoAnterior] = useState(false);
  const [configCarregada, setConfigCarregada] = useState(false);
  const [boletimConfig, setBoletimConfig] = useState(null);

  // Busca configuração de governança ao abrir o modal
  useEffect(() => {
    if (!open) {
      setConfigCarregada(false);
      return;
    }

    async function fetchConfig() {
      try {
        const { data } = await api.get("/api/governanca/boletim-config");
        const cfg = data || {};
        setBoletimConfig(cfg);

        // Verifica se deve exibir ano anterior
        const exibir =
          cfg.exibir_ano_anterior === true ||
          cfg.exibir_ano_anterior === "1" ||
          cfg.exibir_ano_anterior === 1;
        setExibirAnoAnterior(exibir);
      } catch {
        // Se falhar, usa padrão (apenas ano atual)
        setExibirAnoAnterior(false);
        setBoletimConfig({});
      } finally {
        setConfigCarregada(true);
      }
    }

    fetchConfig();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white max-w-6xl w-full max-h-[95vh] overflow-y-auto rounded-xl shadow-lg p-4 relative">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-xl font-bold text-gray-700 hover:text-red-600"
          title="Fechar"
          type="button"
        >
          ×
        </button>

        {/* Conteúdo do Boletim */}
        {!configCarregada ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
            <span style={{ color: "#64748b", fontSize: "0.95rem" }}>Carregando boletim...</span>
          </div>
        ) : exibirAnoAnterior ? (
          <BoletimPrint
            codigo={codigo}
            exibirBotaoImprimir={false}
          />
        ) : (
          <BoletimAnual
            codigo={codigo}
            exibirBotaoImprimir={false}
            boletimConfigProp={boletimConfig}
          />
        )}
      </div>
    </div>
  );
}
