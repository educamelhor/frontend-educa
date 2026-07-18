// src/features/secretaria/horarios/HorariosShell.jsx
// ============================================================
// Shell principal do módulo Horários.
// - Verifica se escola tem configuração de grade
// - Se não → exibe WizardConfiguracaoGrade
// - Se sim → exibe 3 abas: Disponibilidade | Diagnóstico | Gerar Horário
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import WizardConfiguracaoGrade from "./WizardConfiguracaoGrade";
import DisponibilidadePage from "./DisponibilidadePage";
import DiagnosticoPreGeracaoPage from "./DiagnosticoPreGeracaoPage";

const ABAS = [
  { id: "disponibilidade", label: "📅 Disponibilidade", desc: "Configure a disponibilidade dos professores" },
  { id: "diagnostico",     label: "🔍 Diagnóstico",     desc: "Verifique o Índice de Prontidão antes de gerar" },
  { id: "gerar",           label: "⚡ Gerar Horário",   desc: "Motor de geração automática do quadro" },
];

export default function HorariosShell() {
  const [config, setConfig]         = useState(null);   // null = carregando, false = não configurado
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva]     = useState("disponibilidade");
  const [highlightProf, setHighlightProf] = useState(null); // prof destacado ao vir do diagnóstico

  const carregarConfig = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get("/api/escola/configuracao-grade");
      setConfig(data || false);
    } catch {
      setConfig(false);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarConfig(); }, [carregarConfig]);

  function handleWizardConcluir(novaConfig) {
    setConfig(novaConfig);
    setAbaAtiva("disponibilidade");
  }

  function irParaDisponibilidade(profId = null) {
    setHighlightProf(profId);
    setAbaAtiva("disponibilidade");
  }

  if (carregando) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 320, color: "#64748b", fontSize: 14,
        fontFamily: "'Montserrat', sans-serif",
      }}>
        <span style={{ marginRight: 10, fontSize: 20, animation: "spin 1s linear infinite" }}>⏳</span>
        Carregando módulo Horários…
      </div>
    );
  }

  // ── Escola sem configuração → Wizard ──
  if (!config) {
    return <WizardConfiguracaoGrade onConcluir={handleWizardConcluir} />;
  }

  // ── Escola com configuração → 3 Abas ──
  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", alignItems: "stretch", gap: 0,
        borderBottom: "2px solid #e2e8f0",
        background: "#fff",
        zIndex: 20,
      }}>
        {ABAS.map(aba => {
          const ativo = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              title={aba.desc}
              style={{
                padding: "16px 28px", border: "none", background: "transparent",
                borderBottom: ativo ? "3px solid #2563eb" : "3px solid transparent",
                color: ativo ? "#2563eb" : "#64748b",
                fontWeight: ativo ? 700 : 500, fontSize: 14,
                cursor: "pointer", transition: "all 0.2s",
                fontFamily: "inherit", whiteSpace: "nowrap",
                marginBottom: -2,
              }}
            >
              {aba.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* Link discreto de reconfiguração */}
        <button
          onClick={() => setConfig(false)}
          title="Reconfigurar grade horária da escola"
          style={{
            padding: "16px 16px", border: "none", background: "transparent",
            color: "#94a3b8", fontSize: 12, cursor: "pointer",
            fontFamily: "inherit", marginBottom: -2,
          }}
        >⚙️ Reconfigurar</button>
      </div>

      {/* Conteúdo da aba */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {abaAtiva === "disponibilidade" && (
          <DisponibilidadePage
            config={config}
            turnoInicial={config?.turnos?.[0] || "matutino"}
            highlightProfId={highlightProf}
            onVoltar={() => {}}
          />
        )}
        {abaAtiva === "diagnostico" && (
          <DiagnosticoPreGeracaoPage
            onIrParaDisponibilidade={irParaDisponibilidade}
          />
        )}
        {abaAtiva === "gerar" && (
          <div style={{
            textAlign: "center", padding: "80px 24px",
            color: "#94a3b8",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
            <h3 style={{ color: "#1e3a5f", fontSize: 20, marginBottom: 8 }}>
              Motor de Geração de Horários
            </h3>
            <p style={{ color: "#64748b", fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
              Em breve. Primeiro configure as disponibilidades na aba anterior
              e valide no Diagnóstico (score ≥ 50%) para habilitar a geração.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
