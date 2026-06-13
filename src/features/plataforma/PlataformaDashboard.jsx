// src/features/plataforma/PlataformaDashboard.jsx
// ============================================================================
// CEO Dashboard — visão executiva da plataforma EDUCA.MELHOR
// KPIs globais · Gráfico de acessos 7 dias · Top Escolas · Alertas
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = (n) => Number(n || 0).toLocaleString("pt-BR");
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
    " " +
    dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Build a 7-entry array (last 7 calendar days) with zeros where no data
function buildDailyChart(acessos_diarios = []) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = DAY_LABELS[d.getDay()];
    const found = acessos_diarios.find((a) => {
      const aiso = typeof a.dia === "string" ? a.dia.slice(0, 10) : new Date(a.dia).toISOString().slice(0, 10);
      return aiso === iso;
    });
    result.push({ label, total: found ? Number(found.total) : 0, iso });
  }
  return result;
}

// ── Status badge helper ───────────────────────────────────────────────────────
const STATUS_STYLES = {
  ativa:     { bg: "rgba(16,185,129,0.12)", color: "#10b981", dot: "#10b981" },
  bloqueada: { bg: "rgba(249,115,22,0.12)", color: "#f97316", dot: "#f97316" },
  cancelada: { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", dot: "#ef4444" },
};

// ── Alert Banner Component ────────────────────────────────────────────────────
const ALERT_COLORS = {
  amber:  { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  color: "#d97706",  icon: "⚠️" },
  red:    { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)",   color: "#dc2626",  icon: "🚨" },
  orange: { bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.3)",  color: "#ea580c",  icon: "📌" },
};

function AlertBanner({ color, message, link, navigate }) {
  const [hover, setHover] = useState(false);
  const c = ALERT_COLORS[color] || ALERT_COLORS.amber;
  return (
    <div
      onClick={() => navigate(link)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px",
        borderRadius: 12,
        background: c.bg,
        border: `1px solid ${c.border}`,
        cursor: "pointer",
        transition: "all 0.2s",
        transform: hover ? "translateX(4px)" : "none",
        boxShadow: hover ? `0 4px 16px ${c.border}` : "none",
      }}
    >
      <span style={{ fontSize: "1.2rem" }}>{c.icon}</span>
      <span style={{ flex: 1, fontSize: "0.9rem", fontWeight: 600, color: c.color }}>{message}</span>
      <span style={{ fontSize: "0.8rem", color: c.color, opacity: 0.7 }}>Ver →</span>
    </div>
  );
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const svgWidth = "100%";
  const svgHeight = 200;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 40;
  const innerH = svgHeight - padTop - padBottom;
  const barCount = data.length;
  const maxVal = Math.max(...data.map((d) => d.total), 1);

  // We'll use viewBox to get responsive bars
  const vbW = 560;
  const barSlot = (vbW - padLeft - padRight) / barCount;
  const barW = Math.max(barSlot * 0.55, 14);

  return (
    <svg
      viewBox={`0 0 ${vbW} ${svgHeight}`}
      style={{ width: "100%", height: svgHeight, overflow: "visible" }}
    >
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="barGradHov" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="100%" stopColor="#d8b4fe" />
        </linearGradient>
      </defs>

      {/* Y-axis lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const y = padTop + innerH * (1 - frac);
        const val = Math.round(maxVal * frac);
        return (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={vbW - padRight} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4,4" />
            {frac > 0 && (
              <text x={padLeft - 6} y={y + 4} textAnchor="end"
                fontSize={9} fill="rgba(255,255,255,0.35)">
                {val}
              </text>
            )}
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = Math.max((d.total / maxVal) * innerH, d.total > 0 ? 4 : 1);
        const x = padLeft + i * barSlot + (barSlot - barW) / 2;
        const y = padTop + innerH - barH;
        const isEmpty = d.total === 0;
        return (
          <g key={i}>
            {/* Background slot */}
            <rect
              x={x} y={padTop} width={barW} height={innerH}
              rx={4} fill="rgba(255,255,255,0.03)"
            />
            {/* Bar */}
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={4} fill={isEmpty ? "rgba(255,255,255,0.06)" : "url(#barGrad)"}
              style={{ transition: "all 0.4s ease" }}
            />
            {/* Value on top */}
            {d.total > 0 && (
              <text
                x={x + barW / 2} y={y - 5}
                textAnchor="middle" fontSize={9}
                fill="rgba(255,255,255,0.55)"
              >
                {fmtNum(d.total)}
              </text>
            )}
            {/* X-axis label */}
            <text
              x={x + barW / 2} y={svgHeight - 8}
              textAnchor="middle" fontSize={10}
              fill="rgba(255,255,255,0.5)"
              fontWeight="600"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Skeleton Loading ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 20, padding: "24px 28px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      animation: "pulse 1.6s ease-in-out infinite",
    }}>
      <div style={{ width: "40%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.08)", marginBottom: 12 }} />
      <div style={{ width: "60%", height: 28, borderRadius: 8, background: "rgba(255,255,255,0.1)" }} />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI_DEFS = [
  {
    key: "escolas_ativas",
    label: "Escolas Ativas",
    icon: "🏫",
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.08) 100%)",
    accent: "#10b981",
    accentLight: "rgba(16,185,129,0.25)",
    link: "/plataforma/escolas",
  },
  {
    key: "diretores_ativos",
    label: "Diretores Ativos",
    icon: "👨‍💼",
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.08) 100%)",
    accent: "#3b82f6",
    accentLight: "rgba(59,130,246,0.25)",
    link: "/plataforma/diretores",
  },
  {
    key: "total_alunos",
    label: "Total Alunos",
    icon: "🎓",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(124,58,237,0.08) 100%)",
    accent: "#8b5cf6",
    accentLight: "rgba(139,92,246,0.25)",
    link: null,
  },
  {
    key: "total_professores",
    label: "Professores",
    icon: "👩‍🏫",
    gradient: "linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(13,148,136,0.08) 100%)",
    accent: "#14b8a6",
    accentLight: "rgba(20,184,166,0.25)",
    link: null,
  },
  {
    key: "acessos_hoje",
    label: "Acessos Hoje",
    icon: "⚡",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.08) 100%)",
    accent: "#f59e0b",
    accentLight: "rgba(245,158,11,0.25)",
    link: null,
  },
  {
    key: "acessos_30d",
    label: "Acessos (30 dias)",
    icon: "📊",
    gradient: "linear-gradient(135deg, rgba(236,72,153,0.18) 0%, rgba(219,39,119,0.08) 100%)",
    accent: "#ec4899",
    accentLight: "rgba(236,72,153,0.25)",
    link: "/plataforma/usage",
  },
];

function KpiCard({ def, value, navigate }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={() => def.link && navigate(def.link)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 20,
        padding: "24px 28px",
        background: def.gradient,
        border: `1px solid ${hover && def.link ? def.accentLight : "rgba(255,255,255,0.08)"}`,
        boxShadow: hover
          ? `0 8px 32px ${def.accentLight}, 0 0 0 1px ${def.accentLight}`
          : "0 2px 8px rgba(0,0,0,0.2)",
        transform: hover ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        cursor: def.link ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circle */}
      <div style={{
        position: "absolute", right: -20, top: -20,
        width: 90, height: 90, borderRadius: "50%",
        background: `radial-gradient(circle, ${def.accentLight} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: "2rem", lineHeight: 1, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
          {def.icon}
        </span>
        {def.link && (
          <span style={{
            fontSize: "0.6rem", fontWeight: 700,
            color: def.accent, opacity: hover ? 1 : 0.5,
            transition: "opacity 0.2s",
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            Ver →
          </span>
        )}
      </div>

      <div style={{
        fontSize: "2.2rem",
        fontWeight: 900,
        color: "#ffffff",
        letterSpacing: "-0.03em",
        lineHeight: 1,
        marginBottom: 6,
        textShadow: `0 0 20px ${def.accentLight}`,
      }}>
        {fmtNum(value)}
      </div>

      <div style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: def.accent,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        opacity: 0.85,
      }}>
        {def.label}
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${def.accent}, transparent)`,
        opacity: hover ? 0.8 : 0.3,
        transition: "opacity 0.3s",
        borderRadius: "0 0 20px 20px",
      }} />
    </div>
  );
}

// ── Main Dashboard Component ──────────────────────────────────────────────────
export default function PlataformaDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshHover, setRefreshHover] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: resp } = await api.get("/api/plataforma/dashboard");
      if (resp?.ok) {
        setData(resp);
        setLastUpdated(new Date());
      } else {
        setError(resp?.message || "Erro ao carregar dashboard");
      }
    } catch (err) {
      console.error("[PlataformaDashboard] erro:", err);
      setError(err?.response?.data?.message || "Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = data?.kpis || {};
  const chartData = buildDailyChart(data?.acessos_diarios || []);
  const topEscolas = data?.top_escolas || [];
  const escolasRecentes = data?.escolas_recentes || [];

  const hasAlerts =
    kpis.escolas_bloqueadas > 0 ||
    kpis.escolas_sem_diretor > 0 ||
    kpis.chamados_abertos > 0;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const styles = {
    page: {
      width: "100%",
      minHeight: "100vh",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      background: "#0f172a",
      color: "#f1f5f9",
    },
    // ── Header Hero ──
    hero: {
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      padding: "40px 40px 56px",
      position: "relative",
      overflow: "hidden",
      borderBottom: "1px solid rgba(99,102,241,0.15)",
    },
    heroBg1: {
      position: "absolute", top: -80, right: -80,
      width: 320, height: 320, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
      pointerEvents: "none",
    },
    heroBg2: {
      position: "absolute", bottom: -60, left: "30%",
      width: 240, height: 240, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
      pointerEvents: "none",
    },
    heroInner: {
      position: "relative", zIndex: 1,
      display: "flex", alignItems: "flex-start",
      justifyContent: "space-between", flexWrap: "wrap", gap: 20,
    },
    badge: {
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20,
      background: "linear-gradient(135deg, #6366f1, #a855f7)",
      fontSize: "0.6rem", fontWeight: 800,
      color: "#fff", textTransform: "uppercase",
      letterSpacing: "0.8px", marginBottom: 12,
      boxShadow: "0 0 20px rgba(99,102,241,0.4)",
    },
    heroTitle: {
      fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
      fontWeight: 900,
      color: "#ffffff",
      letterSpacing: "-0.03em",
      lineHeight: 1.1,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: "0.95rem",
      color: "rgba(148,163,184,0.85)",
      maxWidth: 460,
    },
    heroStats: {
      display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap",
    },
    heroStatItem: {
      textAlign: "center",
      padding: "12px 20px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(12px)",
      minWidth: 90,
    },
    heroStatValue: {
      fontSize: "1.5rem", fontWeight: 800,
      color: "#ffffff", letterSpacing: "-0.02em",
    },
    heroStatLabel: {
      fontSize: "0.65rem", fontWeight: 600,
      color: "rgba(148,163,184,0.7)",
      textTransform: "uppercase", letterSpacing: "0.05em",
      marginTop: 2,
    },
    refreshBtn: (h) => ({
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 24px",
      borderRadius: 14,
      border: `1px solid ${h ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.12)"}`,
      background: h ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
      color: h ? "#818cf8" : "rgba(148,163,184,0.9)",
      fontWeight: 600, fontSize: "0.875rem",
      cursor: "pointer",
      transition: "all 0.2s",
      backdropFilter: "blur(12px)",
      transform: h ? "scale(1.02)" : "scale(1)",
      whiteSpace: "nowrap",
    }),
    // ── Body ──
    body: {
      padding: "32px 40px",
      background: "#0f172a",
      maxWidth: 1400,
      margin: "0 auto",
    },
    // ── Section ──
    section: { marginBottom: 36 },
    sectionTitle: {
      fontSize: "1rem", fontWeight: 700,
      color: "rgba(226,232,240,0.9)",
      letterSpacing: "0.02em",
      marginBottom: 16,
      display: "flex", alignItems: "center", gap: 10,
    },
    sectionLine: {
      flex: 1, height: 1,
      background: "linear-gradient(90deg, rgba(99,102,241,0.3), transparent)",
    },
    // ── KPI Grid ──
    kpiGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: 16,
    },
    // ── Alert Section ──
    alertBox: {
      display: "flex", flexDirection: "column", gap: 10,
      padding: "20px 24px",
      borderRadius: 16,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
    },
    // ── Two Column ──
    twoCol: {
      display: "grid",
      gridTemplateColumns: "1fr 1.3fr",
      gap: 24,
    },
    // ── Glass Card ──
    glassCard: {
      borderRadius: 20,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(12px)",
      overflow: "hidden",
    },
    glassCardHeader: {
      padding: "20px 24px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    glassCardTitle: {
      fontSize: "0.9rem", fontWeight: 700,
      color: "rgba(226,232,240,0.85)",
      display: "flex", alignItems: "center", gap: 8,
    },
    glassCardBody: { padding: "20px 24px" },
    // ── Chart Area ──
    chartArea: {
      borderRadius: 20,
      background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 100%)",
      border: "1px solid rgba(99,102,241,0.15)",
      padding: "24px",
      overflow: "hidden",
    },
    chartTitle: {
      fontSize: "0.9rem", fontWeight: 700,
      color: "rgba(226,232,240,0.85)",
      marginBottom: 16,
      display: "flex", alignItems: "center", gap: 8,
    },
    // ── Table ──
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      fontSize: "0.65rem", fontWeight: 700,
      color: "rgba(148,163,184,0.6)",
      textTransform: "uppercase", letterSpacing: "0.06em",
      padding: "8px 12px", textAlign: "left",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    },
    td: {
      padding: "12px 12px",
      fontSize: "0.85rem",
      color: "rgba(226,232,240,0.85)",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    },
    // ── Empty ──
    empty: {
      textAlign: "center", padding: "32px",
      color: "rgba(148,163,184,0.5)",
      fontSize: "0.9rem",
    },
    // ── Error ──
    errorBox: {
      margin: "40px auto", maxWidth: 500,
      padding: "32px", borderRadius: 20,
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.2)",
      textAlign: "center",
    },
    // ── Timestamp ──
    timestamp: {
      fontSize: "0.72rem",
      color: "rgba(148,163,184,0.45)",
      marginTop: 4,
    },
  };

  // ── Spinner ──
  const Spinner = () => (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{
        width: 44, height: 44,
        border: "3px solid rgba(255,255,255,0.08)",
        borderTop: "3px solid #6366f1",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );

  // ── Error State ──
  if (!loading && error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorBox}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fca5a5", marginBottom: 8 }}>
            Erro ao carregar Dashboard
          </div>
          <div style={{ fontSize: "0.9rem", color: "rgba(252,165,165,0.7)", marginBottom: 20 }}>{error}</div>
          <button
            onClick={fetchData}
            style={{
              padding: "10px 24px", borderRadius: 12,
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            🔄 Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .db-fade { animation: fadeInUp 0.4s ease forwards; }
      `}</style>

      {/* ════ HERO HEADER ════ */}
      <div style={styles.hero}>
        <div style={styles.heroBg1} />
        <div style={styles.heroBg2} />
        <div style={styles.heroInner}>
          <div>
            <div style={styles.badge}>
              <span>🚀</span> CEO Dashboard · EDUCA.MELHOR
            </div>
            <div style={styles.heroTitle}>
              Visão Executiva<br />
              <span style={{ backgroundImage: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                da Plataforma
              </span>
            </div>
            <div style={styles.heroSubtitle}>
              Monitoramento em tempo real · Escolas, Diretores, Alunos e Acessos
            </div>
            {lastUpdated && (
              <div style={styles.timestamp}>
                Atualizado: {fmtDateTime(lastUpdated)}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
            <button
              onClick={fetchData}
              onMouseEnter={() => setRefreshHover(true)}
              onMouseLeave={() => setRefreshHover(false)}
              disabled={loading}
              style={styles.refreshBtn(refreshHover)}
            >
              <span style={{ fontSize: "1rem", display: "inline-block", animation: loading ? "spin 0.8s linear infinite" : "none" }}>
                🔄
              </span>
              {loading ? "Atualizando..." : "Atualizar"}
            </button>

            {/* Mini stats in header */}
            {data && (
              <div style={styles.heroStats}>
                {[
                  { label: "Escolas", value: kpis.total_escolas, accent: "#10b981" },
                  { label: "Alunos", value: kpis.total_alunos, accent: "#8b5cf6" },
                  { label: "Acessos/7d", value: kpis.acessos_7d, accent: "#f59e0b" },
                ].map((s, i) => (
                  <div key={i} style={styles.heroStatItem}>
                    <div style={{ ...styles.heroStatValue, color: s.accent }}>{fmtNum(s.value)}</div>
                    <div style={styles.heroStatLabel}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════ BODY ════ */}
      <div style={styles.body}>

        {/* ── Loading State ── */}
        {loading && !data && (
          <div>
            <Spinner />
            <div style={{ ...styles.kpiGrid, marginTop: 8 }}>
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        )}

        {data && (
          <div className="db-fade">

            {/* ── ALERTS ── */}
            {hasAlerts && (
              <div style={{ ...styles.section }}>
                <div style={styles.sectionTitle}>
                  <span>⚠️</span> Atenção Necessária
                  <div style={styles.sectionLine} />
                </div>
                <div style={styles.alertBox}>
                  {kpis.escolas_bloqueadas > 0 && (
                    <AlertBanner
                      color="amber"
                      message={`${kpis.escolas_bloqueadas} escola${kpis.escolas_bloqueadas > 1 ? "s" : ""} bloqueada${kpis.escolas_bloqueadas > 1 ? "s" : ""}`}
                      link="/plataforma/escolas"
                      navigate={navigate}
                    />
                  )}
                  {kpis.escolas_sem_diretor > 0 && (
                    <AlertBanner
                      color="red"
                      message={`${kpis.escolas_sem_diretor} escola${kpis.escolas_sem_diretor > 1 ? "s" : ""} sem diretor ativo`}
                      link="/plataforma/escolas"
                      navigate={navigate}
                    />
                  )}
                  {kpis.chamados_abertos > 0 && (
                    <AlertBanner
                      color="orange"
                      message={`${kpis.chamados_abertos} chamado${kpis.chamados_abertos > 1 ? "s" : ""} em aberto`}
                      link="/plataforma/suporte"
                      navigate={navigate}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── KPI CARDS ── */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span>📈</span> Indicadores Chave
                <div style={styles.sectionLine} />
              </div>
              <div style={styles.kpiGrid}>
                {KPI_DEFS.map((def) => (
                  <KpiCard
                    key={def.key}
                    def={def}
                    value={kpis[def.key] ?? 0}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>

            {/* ── CHART + EXTRAS ── */}
            <div style={{ ...styles.section, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24 }}>

              {/* Acessos 7 dias */}
              <div style={styles.chartArea}>
                <div style={styles.chartTitle}>
                  <span>📉</span> Acessos — Últimos 7 dias
                  <span style={{
                    marginLeft: "auto",
                    fontSize: "0.7rem", fontWeight: 600,
                    color: "#818cf8",
                    padding: "2px 10px", borderRadius: 8,
                    background: "rgba(99,102,241,0.12)",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}>
                    Total: {fmtNum(kpis.acessos_7d)}
                  </span>
                </div>
                {chartData.every((d) => d.total === 0) ? (
                  <div style={styles.empty}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📊</div>
                    <div>Nenhum acesso registrado nos últimos 7 dias</div>
                  </div>
                ) : (
                  <BarChart data={chartData} />
                )}
              </div>

              {/* Resumo de Escolas */}
              <div style={styles.glassCard}>
                <div style={styles.glassCardHeader}>
                  <div style={styles.glassCardTitle}>
                    <span>🏫</span> Resumo de Escolas
                  </div>
                </div>
                <div style={styles.glassCardBody}>
                  {[
                    { label: "Total de escolas", value: kpis.total_escolas, color: "#e2e8f0" },
                    { label: "Ativas", value: kpis.escolas_ativas, color: "#10b981" },
                    { label: "Bloqueadas", value: kpis.escolas_bloqueadas, color: "#f97316" },
                    { label: "Canceladas", value: kpis.escolas_canceladas, color: "#ef4444" },
                    { label: "Sem diretor ativo", value: kpis.escolas_sem_diretor, color: "#f59e0b" },
                  ].map((row, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 0",
                      borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}>
                      <span style={{ fontSize: "0.85rem", color: "rgba(148,163,184,0.8)" }}>{row.label}</span>
                      <span style={{
                        fontSize: "1.05rem", fontWeight: 800, color: row.color,
                        minWidth: 32, textAlign: "right",
                      }}>{fmtNum(row.value)}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => navigate("/plataforma/escolas")}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 12,
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        color: "#818cf8", fontWeight: 600, fontSize: "0.85rem",
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.2)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; }}
                    >
                      🏫 Ver todas as escolas
                    </button>
                    <button
                      onClick={() => navigate("/plataforma/usage")}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 12,
                        background: "rgba(168,85,247,0.1)",
                        border: "1px solid rgba(168,85,247,0.2)",
                        color: "#c084fc", fontWeight: 600, fontSize: "0.85rem",
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.18)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.1)"; }}
                    >
                      📊 Ver Usage Insights
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── TOP ESCOLAS + RECENTES ── */}
            <div style={{ ...styles.section, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

              {/* Top 5 Escolas */}
              <div style={styles.glassCard}>
                <div style={styles.glassCardHeader}>
                  <div style={styles.glassCardTitle}>
                    <span>🏆</span> Top Escolas — Acessos (30 dias)
                  </div>
                </div>
                <div style={{ padding: "0 0 8px" }}>
                  {topEscolas.length === 0 ? (
                    <div style={styles.empty}>Nenhum dado de acesso disponível</div>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>#</th>
                          <th style={styles.th}>Escola</th>
                          <th style={styles.th}>Cidade</th>
                          <th style={styles.th}>Status</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Acessos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topEscolas.map((esc, idx) => {
                          const st = STATUS_STYLES[esc.status] || STATUS_STYLES.cancelada;
                          const medals = ["🥇", "🥈", "🥉"];
                          const maxAcessos = topEscolas[0]?.acessos_30d || 1;
                          const pct = Math.round(((esc.acessos_30d || 0) / maxAcessos) * 100);
                          return (
                            <TopEscolaRow
                              key={esc.id}
                              esc={esc}
                              idx={idx}
                              medal={medals[idx]}
                              st={st}
                              pct={pct}
                              styles={styles}
                              navigate={navigate}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Escolas Recentes */}
              <div style={styles.glassCard}>
                <div style={styles.glassCardHeader}>
                  <div style={styles.glassCardTitle}>
                    <span>🆕</span> Escolas Recentes
                  </div>
                  <button
                    onClick={() => navigate("/plataforma/escolas")}
                    style={{
                      padding: "4px 12px", borderRadius: 8,
                      background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                      color: "#818cf8", fontWeight: 600, fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                  >
                    Ver todas
                  </button>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {escolasRecentes.length === 0 ? (
                    <div style={styles.empty}>Nenhuma escola cadastrada</div>
                  ) : (
                    escolasRecentes.map((esc, idx) => {
                      const st = STATUS_STYLES[esc.status] || STATUS_STYLES.cancelada;
                      return (
                        <RecentEscolaRow
                          key={esc.id}
                          esc={esc}
                          st={st}
                          styles={styles}
                          navigate={navigate}
                          isLast={idx === escolasRecentes.length - 1}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── FOOTER STATS ── */}
            <div style={{
              ...styles.section,
              padding: "24px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 20,
              textAlign: "center",
            }}>
              {[
                { label: "Total Diretores", value: kpis.total_diretores, icon: "👥", color: "#3b82f6" },
                { label: "Diretores Ativos", value: kpis.diretores_ativos, icon: "✅", color: "#10b981" },
                { label: "Usuários Plataforma", value: kpis.total_usuarios_plataforma, icon: "🌐", color: "#8b5cf6" },
                { label: "Chamados Abertos", value: kpis.chamados_abertos, icon: "🎫", color: "#f59e0b" },
                { label: "Chamados Total", value: kpis.chamados_total, icon: "📋", color: "#64748b" },
                { label: "Acessos (7 dias)", value: kpis.acessos_7d, icon: "📅", color: "#ec4899" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color }}>{fmtNum(s.value)}</div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ── Top Escola Row (manages own hover) ───────────────────────────────────────
function TopEscolaRow({ esc, idx, medal, st, pct, styles, navigate }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => navigate("/plataforma/usage")}
      style={{
        cursor: "pointer",
        background: hover ? "rgba(255,255,255,0.03)" : "transparent",
        transition: "background 0.2s",
      }}
    >
      <td style={{ ...styles.td, fontSize: "1rem", width: 36 }}>{medal || `#${idx + 1}`}</td>
      <td style={styles.td}>
        <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{esc.apelido || esc.nome}</div>
        <div style={{
          height: 3, borderRadius: 2, marginTop: 4,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden", width: "100%",
        }}>
          <div style={{
            height: "100%", borderRadius: 2, width: `${pct}%`,
            background: "linear-gradient(90deg, #6366f1, #a855f7)",
            transition: "width 0.6s ease",
          }} />
        </div>
      </td>
      <td style={{ ...styles.td, color: "rgba(148,163,184,0.7)", fontSize: "0.8rem" }}>
        {esc.cidade || "—"}
      </td>
      <td style={styles.td}>
        <span style={{
          padding: "2px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700,
          background: st.bg, color: st.color,
        }}>
          {esc.status}
        </span>
      </td>
      <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, color: "#818cf8" }}>
        {fmtNum(esc.acessos_30d)}
      </td>
    </tr>
  );
}

// ── Recent Escola Row ─────────────────────────────────────────────────────────
function RecentEscolaRow({ esc, st, styles, navigate, isLast }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => navigate("/plataforma/escolas")}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
        background: hover ? "rgba(255,255,255,0.02)" : "transparent",
        cursor: "pointer",
        transition: "background 0.2s",
      }}
    >
      <div>
        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>
          {esc.apelido || esc.nome}
        </div>
        <div style={{ fontSize: "0.72rem", color: "rgba(148,163,184,0.6)" }}>
          {esc.cidade ? `${esc.cidade} · ` : ""}Criada {fmtDate(esc.created_at)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span style={{
          padding: "2px 9px", borderRadius: 6,
          fontSize: "0.65rem", fontWeight: 700,
          background: st.bg, color: st.color,
        }}>
          {esc.status}
        </span>
        <span style={{
          fontSize: "0.65rem",
          color: "rgba(99,102,241,0.6)",
          fontWeight: 600,
        }}>
          #{esc.id}
        </span>
      </div>
    </div>
  );
}
