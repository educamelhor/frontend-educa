// src/features/pedagogico/relatorios/RelatoriosPedagogicos.jsx
// ============================================================================
// Hub de Relatórios Pedagógicos — estilo premium (inspirado em Conteúdos)
// Cards por tema de relatório — o primeiro é Plano de Avaliação Pedagógica
// ============================================================================

import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useEffect, useState } from "react";

// ─── Status colors helpers ───────────────────────────────────────────────────
const STATUS_COLOR = {
  nao_iniciado: "#94a3b8",
  rascunho:     "#f59e0b",
  enviado:      "#3b82f6",
  aprovado:     "#10b981",
  revisao:      "#ef4444",
};

function anoLetivoAtual() {
  const hoje = new Date();
  return hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// ─── Card de Relatório ───────────────────────────────────────────────────────
function ReportCard({ icon, title, description, kpi, route, available, badge }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => available && navigate(route)}
      style={{
        background: available
          ? "linear-gradient(135deg, #1e3a5f 0%, #1a4480 60%, #0f2d5a 100%)"
          : "linear-gradient(135deg, #1e293b 0%, #2d3748 100%)",
        borderRadius: 20,
        padding: "28px 28px 24px",
        cursor: available ? "pointer" : "default",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: available
          ? "0 8px 32px rgba(30,58,95,0.4), 0 2px 8px rgba(0,0,0,0.2)"
          : "0 4px 16px rgba(0,0,0,0.2)",
        transition: "transform 0.2s, box-shadow 0.2s",
        position: "relative",
        overflow: "hidden",
        opacity: available ? 1 : 0.65,
      }}
      onMouseEnter={(e) => {
        if (available) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 16px 48px rgba(30,58,95,0.5), 0 4px 12px rgba(0,0,0,0.3)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = available
          ? "0 8px 32px rgba(30,58,95,0.4), 0 2px 8px rgba(0,0,0,0.2)"
          : "0 4px 16px rgba(0,0,0,0.2)";
      }}
    >
      {/* Glow de fundo */}
      {available && (
        <div style={{
          position: "absolute", top: -40, right: -40,
          width: 140, height: 140,
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: available
            ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
            : "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, flexShrink: 0,
          boxShadow: available ? "0 4px 12px rgba(99,102,241,0.4)" : "none",
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: "0.6rem", fontWeight: 800, padding: "3px 8px",
          borderRadius: 8, letterSpacing: "0.5px",
          background: available
            ? "linear-gradient(135deg, #10b981, #0891b2)"
            : "rgba(255,255,255,0.12)",
          color: "#fff",
        }}>
          {badge}
        </span>
      </div>

      {/* Título e descrição */}
      <h3 style={{ color: "#fff", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px", fontFamily: "Montserrat, sans-serif" }}>
        {title}
      </h3>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", margin: "0 0 20px", lineHeight: 1.5 }}>
        {description}
      </p>

      {/* Mini KPIs */}
      {available && kpi && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {kpi.map((k) => (
            <div key={k.label} style={{ textAlign: "center" }}>
              <div style={{ color: k.color || "#c7d2fe", fontSize: "1.2rem", fontWeight: 800, lineHeight: 1 }}>
                {k.value}
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem", marginTop: 2 }}>
                {k.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {available ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          color: "#a5b4fc", fontSize: "0.82rem", fontWeight: 600,
        }}>
          <span>Ver relatório</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      ) : (
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem" }}>
          Em breve…
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function RelatoriosPedagogicos() {
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/api/pedagogico/relatorios/plano-avaliacao");
        setKpi(data?.kpi || null);
      } catch {
        setKpi(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const ano = anoLetivoAtual();

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Montserrat, 'Inter', sans-serif" }}>
      {/* ── Header premium ─────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0f2d5a 0%, #1e3a5f 40%, #1a4480 100%)",
        borderRadius: 20, padding: "36px 40px", marginBottom: 32,
        boxShadow: "0 8px 32px rgba(15,45,90,0.4)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glows decorativos */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: 200, width: 160, height: 160, background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, boxShadow: "0 6px 20px rgba(99,102,241,0.4)", flexShrink: 0,
          }}>
            📊
          </div>
          <div>
            <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Relatórios Pedagógicos
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", margin: "4px 0 0" }}>
              Acompanhe o andamento pedagógico da escola • Ano letivo {ano}
            </p>
          </div>
        </div>

        {/* KPI bar rápida (total de professores em regência) */}
        {!loading && kpi && (
          <div style={{
            display: "flex", gap: 24, marginTop: 28, paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap",
          }}>
            {[
              { label: "Em regência", value: kpi.total, color: "#c7d2fe" },
              { label: "Não iniciado", value: kpi.nao_iniciado, color: STATUS_COLOR.nao_iniciado },
              { label: "Rascunho", value: kpi.rascunho, color: STATUS_COLOR.rascunho },
              { label: "Enviado", value: kpi.enviado, color: STATUS_COLOR.enviado },
              { label: "Aprovado", value: kpi.aprovado, color: STATUS_COLOR.aprovado },
              { label: "Revisão", value: kpi.revisao, color: STATUS_COLOR.revisao },
            ].map((k) => (
              <div key={k.label} style={{ textAlign: "center", minWidth: 64 }}>
                <div style={{ color: k.color, fontSize: "1.8rem", fontWeight: 800, lineHeight: 1 }}>{k.value}</div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", marginTop: 4 }}>{k.label}</div>
              </div>
            ))}

            {/* Barra de progresso de aprovação */}
            {kpi.total > 0 && (
              <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", marginBottom: 6 }}>
                  Aprovados — {Math.round((kpi.aprovado / kpi.total) * 100)}%
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round((kpi.aprovado / kpi.total) * 100)}%`,
                    background: "linear-gradient(90deg, #10b981, #0891b2)",
                    borderRadius: 999,
                    transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Grid de cards ──────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 24,
      }}>
        <ReportCard
          icon="📋"
          title="Plano de Avaliação Pedagógica"
          description="Acompanhe o andamento do plano de avaliação de todos os professores em regência — status, disciplinas e turmas."
          route="/pedagogico/relatorios/plano-avaliacao"
          available={true}
          badge="DISPONÍVEL"
          kpi={kpi ? [
            { label: "Professores", value: kpi.total,        color: "#c7d2fe" },
            { label: "Enviados",    value: kpi.enviado,      color: STATUS_COLOR.enviado },
            { label: "Aprovados",   value: kpi.aprovado,     color: STATUS_COLOR.aprovado },
            { label: "Pendentes",   value: kpi.nao_iniciado, color: STATUS_COLOR.nao_iniciado },
          ] : null}
        />

        <ReportCard
          icon="📈"
          title="Desempenho por Disciplina"
          description="Análise comparativa de notas e frequência por disciplina e turma ao longo do ano letivo."
          route="/pedagogico/relatorios/desempenho"
          available={false}
          badge="EM BREVE"
        />

        <ReportCard
          icon="👥"
          title="Conselho de Classe — Resumo"
          description="Relatório consolidado dos conselhos de classe realizados, alunos em risco e encaminhamentos."
          route="/pedagogico/relatorios/conselho"
          available={false}
          badge="EM BREVE"
        />

        <ReportCard
          icon="📚"
          title="Conteúdos Programáticos"
          description="Visão geral do cumprimento dos conteúdos por bimestre, disciplina e série."
          route="/pedagogico/relatorios/conteudos"
          available={false}
          badge="EM BREVE"
        />
      </div>
    </div>
  );
}
