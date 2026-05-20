// src/features/pedagogico/relatorios/PlanoAvaliacaoPage.jsx
// ============================================================================
// Relatório — Plano de Avaliação Pedagógica
// Lista todos os professores em regência com status do plano
// Permite que a coordenação/direção altere o status
// ============================================================================

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

// ─── Configuração de status ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  nao_iniciado: { label: "Não Iniciado", color: "#94a3b8", bg: "rgba(148,163,184,0.12)", dot: "#94a3b8" },
  rascunho:     { label: "Rascunho",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)", dot: "#f59e0b" },
  enviado:      { label: "Enviado",      color: "#3b82f6", bg: "rgba(59,130,246,0.12)", dot: "#3b82f6" },
  aprovado:     { label: "Aprovado",     color: "#10b981", bg: "rgba(16,185,129,0.12)", dot: "#10b981" },
  revisao:      { label: "Sol. Revisão", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  dot: "#ef4444" },
};

const STATUS_ORDEM = ["nao_iniciado", "rascunho", "enviado", "aprovado", "revisao"];

function StatusPill({ status, size = "md" }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.nao_iniciado;
  const padding = size === "sm" ? "3px 10px" : "5px 14px";
  const fontSize = size === "sm" ? "0.7rem" : "0.75rem";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding, borderRadius: 999, fontSize, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function anoLetivoAtual() {
  const hoje = new Date();
  return hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ value, label, color, percent, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "18px 22px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #f1f5f9",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: color || "#1e3a5f", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>{label}</div>
      {percent && total > 0 && (
        <div style={{ height: 4, background: "#f1f5f9", borderRadius: 999, marginTop: 4 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.8s" }} />
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function PlanoAvaliacaoPage() {
  const navigate = useNavigate();
  const [professores, setProfessores] = useState([]);
  const [kpi, setKpi]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState("");
  const [search, setSearch]   = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [salvando, setSalvando] = useState(null); // professor_id em atualização
  const [ano]  = useState(anoLetivoAtual);

  // ─── Carregar dados ────────────────────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const { data } = await api.get("/api/pedagogico/relatorios/plano-avaliacao", {
        params: { ano },
      });
      setProfessores(data?.professores || []);
      setKpi(data?.kpi || null);
    } catch (err) {
      setErro(err?.response?.data?.message || "Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [ano]);

  // ─── Filtros ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return professores.filter((p) => {
      const matchSearch =
        !term ||
        (p.nome || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(term) ||
        (p.disciplinas || "").toLowerCase().includes(term) ||
        (p.turmas || "").toLowerCase().includes(term);
      const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
      return matchSearch && matchStatus;
    });
  }, [professores, search, filtroStatus]);

  // ─── Alterar status ────────────────────────────────────────────────────────
  async function handleAlterarStatus(professor_id, novoStatus) {
    setSalvando(professor_id);
    try {
      await api.put(`/api/pedagogico/relatorios/plano-avaliacao/${professor_id}`, {
        status: novoStatus, ano,
      });
      // Atualiza local
      setProfessores((prev) =>
        prev.map((p) =>
          p.professor_id === professor_id
            ? { ...p, status: novoStatus, atualizado_em: new Date().toISOString() }
            : p
        )
      );
      // Recalcula KPI
      setKpi((prev) => {
        if (!prev) return prev;
        const antigo = professores.find((p) => p.professor_id === professor_id)?.status || "nao_iniciado";
        return {
          ...prev,
          [antigo]:     Math.max(0, (prev[antigo] || 0) - 1),
          [novoStatus]: (prev[novoStatus] || 0) + 1,
        };
      });
    } catch (err) {
      alert(err?.response?.data?.message || "Erro ao salvar status.");
    } finally {
      setSalvando(null);
    }
  }

  // ─── Formatar data ────────────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Montserrat, 'Inter', sans-serif", minHeight: "100vh" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0f2d5a 0%, #1e3a5f 50%, #1a4480 100%)",
        borderRadius: 20, padding: "32px 40px", marginBottom: 28,
        boxShadow: "0 8px 32px rgba(15,45,90,0.35)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => navigate("/pedagogico/relatorios")}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "4px 12px",
              fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Relatórios
          </button>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>Plano de Avaliação</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: "0 4px 16px rgba(99,102,241,0.4)", flexShrink: 0,
          }}>📋</div>
          <div>
            <h1 style={{ color: "#fff", fontSize: "1.6rem", fontWeight: 800, margin: 0, letterSpacing: "-0.3px" }}>
              Plano de Avaliação Pedagógica
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", margin: "4px 0 0" }}>
              Acompanhe o andamento do plano de todos os professores em regência • {ano}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      {kpi && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 14, marginBottom: 24,
        }}>
          <KpiCard value={kpi.total}         label="Em Regência"   color="#6366f1" percent total={kpi.total} />
          <KpiCard value={kpi.nao_iniciado}  label="Não Iniciado"  color="#94a3b8" percent total={kpi.total} />
          <KpiCard value={kpi.rascunho}      label="Rascunho"      color="#f59e0b" percent total={kpi.total} />
          <KpiCard value={kpi.enviado}       label="Enviado"       color="#3b82f6" percent total={kpi.total} />
          <KpiCard value={kpi.aprovado}      label="Aprovado"      color="#10b981" percent total={kpi.total} />
          <KpiCard value={kpi.revisao}       label="Sol. Revisão"  color="#ef4444" percent total={kpi.total} />
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "16px 20px",
        marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Busca */}
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar professor, disciplina ou turma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px 9px 36px", borderRadius: 10,
              border: "1.5px solid #e2e8f0", fontSize: "0.85rem", outline: "none",
              fontFamily: "inherit", background: "#f8fafc", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filtro de status */}
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          style={{
            padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
            fontSize: "0.85rem", fontFamily: "inherit", background: "#f8fafc",
            color: "#1e3a5f", cursor: "pointer", outline: "none",
          }}
        >
          <option value="todos">Todos os status</option>
          {STATUS_ORDEM.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        <span style={{ color: "#94a3b8", fontSize: "0.8rem", marginLeft: "auto" }}>
          {filtered.length} professor{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* ── Tabela ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 16, overflow: "hidden",
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
      }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
            Carregando professores em regência…
          </div>
        ) : erro ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#ef4444" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚠️</div>
            {erro}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>📭</div>
            Nenhum professor encontrado com os filtros selecionados.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "linear-gradient(90deg, #1e3a5f, #1a4480)" }}>
                {["#", "Professor", "Disciplinas", "Turmas", "Status", "Atualizado em", "Alterar"].map((h) => (
                  <th key={h} style={{
                    padding: "14px 16px", textAlign: h === "#" ? "center" : "left",
                    color: "rgba(255,255,255,0.85)", fontSize: "0.75rem",
                    fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((prof, idx) => {
                const cfg = STATUS_CONFIG[prof.status] || STATUS_CONFIG.nao_iniciado;
                const isSaving = salvando === prof.professor_id;
                return (
                  <tr
                    key={prof.professor_id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: idx % 2 === 0 ? "#fff" : "#fafbff",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f4ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbff"; }}
                  >
                    {/* # */}
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem", width: 48 }}>
                      {idx + 1}
                    </td>

                    {/* Professor */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {prof.foto ? (
                          <img
                            src={prof.foto}
                            alt={prof.nome}
                            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                          }}>
                            {(prof.nome || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.88rem" }}>
                          {prof.nome}
                        </span>
                      </div>
                    </td>

                    {/* Disciplinas */}
                    <td style={{ padding: "14px 16px", color: "#475569", fontSize: "0.8rem", maxWidth: 200 }}>
                      {prof.disciplinas || "—"}
                    </td>

                    {/* Turmas */}
                    <td style={{ padding: "14px 16px", color: "#475569", fontSize: "0.8rem", maxWidth: 180 }}>
                      {prof.turmas || "—"}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 16px" }}>
                      <StatusPill status={prof.status} />
                    </td>

                    {/* Atualizado em */}
                    <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                      {formatDate(prof.atualizado_em)}
                    </td>

                    {/* Alterar status */}
                    <td style={{ padding: "14px 16px" }}>
                      <select
                        value={prof.status}
                        onChange={(e) => handleAlterarStatus(prof.professor_id, e.target.value)}
                        disabled={isSaving}
                        style={{
                          padding: "6px 10px", borderRadius: 8, fontSize: "0.78rem",
                          border: `1.5px solid ${cfg.color}55`,
                          background: cfg.bg, color: cfg.color, fontWeight: 700,
                          cursor: "pointer", outline: "none", fontFamily: "inherit",
                          opacity: isSaving ? 0.6 : 1,
                        }}
                      >
                        {STATUS_ORDEM.map((s) => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Legenda de status ────────────────────────────────────────────── */}
      {!loading && !erro && (
        <div style={{
          marginTop: 20, padding: "14px 20px",
          background: "#fff", borderRadius: 12,
          boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
          display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 700 }}>Legenda:</span>
          {STATUS_ORDEM.map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[s].dot }} />
              <span style={{ color: "#64748b", fontSize: "0.75rem" }}>{STATUS_CONFIG[s].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
