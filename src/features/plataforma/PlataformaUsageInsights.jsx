// src/features/plataforma/PlataformaUsageInsights.jsx
// ============================================================================
// Página principal: Overview de acesso de todas as escolas (cards)
// Clique em um card → navega para o dashboard detalhado da escola
// ============================================================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

// ── Helpers ──
const fmtNum = (n) => Number(n || 0).toLocaleString("pt-BR");
const fmtDate = (d) => {
  if (!d) return "Nunca";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};
const parseTipo = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return []; }
};

// ── Cores dos perfis para badges ──
const PERFIL_COLORS = {
  diretor: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "rgba(59,130,246,0.25)" },
  professor: { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },
  coordenador: { bg: "rgba(168,85,247,0.12)", color: "#a855f7", border: "rgba(168,85,247,0.25)" },
  militar: { bg: "rgba(234,179,8,0.12)", color: "#eab308", border: "rgba(234,179,8,0.25)" },
  secretaria: { bg: "rgba(236,72,153,0.12)", color: "#ec4899", border: "rgba(236,72,153,0.25)" },
  default: { bg: "rgba(100,116,139,0.12)", color: "#64748b", border: "rgba(100,116,139,0.25)" },
};

export default function PlataformaUsageInsights() {
  const navigate = useNavigate();
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [sortBy, setSortBy] = useState("acessos_30d"); // acessos_30d | total_usuarios | nome

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/plataforma/usage/escolas");
      setEscolas(Array.isArray(data?.escolas) ? data.escolas : []);
    } catch (err) {
      console.error("Erro ao carregar usage overview:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtragem
  const escolasFiltradas = escolas
    .filter((e) => {
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return [e.nome, e.apelido, e.cidade, String(e.id)].some(
        (v) => String(v || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "nome") return (a.nome || "").localeCompare(b.nome || "");
      if (sortBy === "total_usuarios") return (b.total_usuarios || 0) - (a.total_usuarios || 0);
      return (b.acessos_30d || 0) - (a.acessos_30d || 0);
    });

  // ── Totais globais ──
  const totalGlobal = {
    usuarios: escolas.reduce((s, e) => s + (e.total_usuarios || 0), 0),
    alunos: escolas.reduce((s, e) => s + (e.total_alunos || 0), 0),
    professores: escolas.reduce((s, e) => s + (e.total_professores || 0), 0),
    acessos24h: escolas.reduce((s, e) => s + (e.acessos_24h || 0), 0),
    acessos7d: escolas.reduce((s, e) => s + (e.acessos_7d || 0), 0),
    acessos30d: escolas.reduce((s, e) => s + (e.acessos_30d || 0), 0),
  };

  // ── Estilos ──
  const styles = {
    page: {
      width: "100%",
      minHeight: "100vh",
      padding: "32px",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 32,
    },
    title: {
      fontSize: "1.75rem",
      fontWeight: 800,
      color: "#0f172a",
      letterSpacing: "-0.02em",
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    badge: {
      fontSize: "0.55rem",
      fontWeight: 800,
      background: "linear-gradient(135deg, #6366f1, #a855f7)",
      color: "#fff",
      padding: "3px 8px",
      borderRadius: 8,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
    },
    subtitle: {
      fontSize: "0.9rem",
      color: "#64748b",
      marginTop: 4,
    },
    // KPI Row
    kpiRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 16,
      marginBottom: 32,
    },
    kpiCard: {
      background: "rgba(255,255,255,0.8)",
      backdropFilter: "blur(12px)",
      borderRadius: 16,
      padding: "20px 24px",
      border: "1px solid rgba(226,232,240,0.8)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    },
    kpiLabel: {
      fontSize: "0.75rem",
      fontWeight: 600,
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: 4,
    },
    kpiValue: {
      fontSize: "1.75rem",
      fontWeight: 800,
      color: "#0f172a",
    },
    // Search + Sort
    controls: {
      display: "flex",
      gap: 12,
      marginBottom: 24,
      alignItems: "center",
      flexWrap: "wrap",
    },
    searchInput: {
      flex: 1,
      minWidth: 260,
      padding: "10px 16px 10px 42px",
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      fontSize: "0.9rem",
      color: "#334155",
      background: "#fff",
      outline: "none",
      transition: "all 0.2s",
    },
    sortSelect: {
      padding: "10px 16px",
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      fontSize: "0.85rem",
      color: "#475569",
      background: "#fff",
      cursor: "pointer",
    },
    // Cards Grid
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
      gap: 20,
    },
    card: {
      background: "#fff",
      borderRadius: 20,
      padding: 0,
      border: "1px solid rgba(226,232,240,0.9)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      cursor: "pointer",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      overflow: "hidden",
      position: "relative",
    },
    cardHover: {
      transform: "translateY(-3px)",
      boxShadow: "0 12px 32px rgba(99,102,241,0.12)",
      borderColor: "rgba(99,102,241,0.3)",
    },
    cardHeader: {
      padding: "20px 24px 12px",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    cardName: {
      fontSize: "1.05rem",
      fontWeight: 700,
      color: "#1e293b",
      lineHeight: 1.3,
    },
    cardSub: {
      fontSize: "0.78rem",
      color: "#94a3b8",
      marginTop: 2,
    },
    cardBody: {
      padding: "0 24px 20px",
    },
    metricsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8,
      marginBottom: 12,
    },
    metricBox: {
      textAlign: "center",
      padding: "8px 4px",
      borderRadius: 10,
      background: "rgba(248,250,252,1)",
    },
    metricValue: {
      fontSize: "1.15rem",
      fontWeight: 800,
      color: "#1e293b",
    },
    metricLabel: {
      fontSize: "0.65rem",
      color: "#94a3b8",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.03em",
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      background: "#f1f5f9",
      overflow: "hidden",
      marginTop: 8,
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
      transition: "width 0.6s ease",
    },
    cardFooter: {
      padding: "12px 24px",
      background: "rgba(248,250,252,0.6)",
      borderTop: "1px solid #f1f5f9",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "0.75rem",
      color: "#94a3b8",
    },
    statusBadge: (s) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 10px",
      borderRadius: 8,
      fontSize: "0.7rem",
      fontWeight: 700,
      ...(s === "ativa"
        ? { background: "rgba(16,185,129,0.1)", color: "#10b981" }
        : s === "bloqueada"
          ? { background: "rgba(249,115,22,0.1)", color: "#f97316" }
          : { background: "rgba(239,68,68,0.1)", color: "#ef4444" }),
    }),
    // Empty State
    empty: {
      textAlign: "center",
      padding: "80px 40px",
      color: "#94a3b8",
    },
    emptyIcon: {
      fontSize: "3rem",
      marginBottom: 16,
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <div style={{
            width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>
            📊 Usage Insights
            <span style={styles.badge}>CEO</span>
          </div>
          <div style={styles.subtitle}>
            Análise de acesso e métricas de uso por escola — {escolas.length} escola{escolas.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={fetchData}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 12, border: "1px solid #e2e8f0",
            background: "#fff", color: "#475569", fontWeight: 600, fontSize: "0.85rem",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseOver={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.color = "#6366f1"; }}
          onMouseOut={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.color = "#475569"; }}
        >
          🔄 Atualizar
        </button>
      </div>

      {/* KPI Global */}
      <div style={styles.kpiRow}>
        {[
          { label: "Total Usuários", value: fmtNum(totalGlobal.usuarios), icon: "👥", color: "#6366f1" },
          { label: "Total Alunos", value: fmtNum(totalGlobal.alunos), icon: "🎓", color: "#3b82f6" },
          { label: "Total Professores", value: fmtNum(totalGlobal.professores), icon: "📚", color: "#10b981" },
          { label: "Acessos (24h)", value: fmtNum(totalGlobal.acessos24h), icon: "⚡", color: "#f59e0b" },
          { label: "Acessos (7 dias)", value: fmtNum(totalGlobal.acessos7d), icon: "📈", color: "#8b5cf6" },
          { label: "Acessos (30 dias)", value: fmtNum(totalGlobal.acessos30d), icon: "📊", color: "#ec4899" },
        ].map((k, i) => (
          <div key={i} style={styles.kpiCard}>
            <div style={styles.kpiLabel}>{k.icon} {k.label}</div>
            <div style={{ ...styles.kpiValue, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#94a3b8" }}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar escola por nome, cidade, ID..."
            style={styles.searchInput}
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.sortSelect}>
          <option value="acessos_30d">Ordenar: Mais acessos (30d)</option>
          <option value="total_usuarios">Ordenar: Mais usuários</option>
          <option value="nome">Ordenar: Nome (A-Z)</option>
        </select>
      </div>

      {/* Cards Grid */}
      {escolasFiltradas.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📊</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#475569", marginBottom: 8 }}>
            {busca.trim() ? "Nenhuma escola encontrada" : "Nenhuma escola cadastrada"}
          </div>
          <div>Comece cadastrando escolas em Escolas → Adicionar</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {escolasFiltradas.map((esc) => (
            <SchoolCard key={esc.id} escola={esc} styles={styles} navigate={navigate}
              maxAcessos={Math.max(...escolasFiltradas.map(e => e.acessos_30d || 0), 1)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card da Escola (separado para gerenciar hover) ──
function SchoolCard({ escola: esc, styles, navigate, maxAcessos }) {
  const [hover, setHover] = useState(false);

  const tipos = parseTipo(esc.tipo);
  const pct = maxAcessos > 0 ? Math.round(((esc.acessos_30d || 0) / maxAcessos) * 100) : 0;

  // Cor dinâmica do progresso baseada na intensidade de uso
  const progressColor = pct > 70 ? "#10b981" : pct > 30 ? "#6366f1" : pct > 0 ? "#f59e0b" : "#e2e8f0";

  return (
    <div
      style={{ ...styles.card, ...(hover ? styles.cardHover : {}) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => navigate(`/plataforma/usage/${esc.id}`)}
    >
      {/* Accent bar */}
      <div style={{
        height: 3,
        background: hover
          ? "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)"
          : "linear-gradient(90deg, #e2e8f0, #e2e8f0)",
        transition: "all 0.3s",
      }} />

      <div style={styles.cardHeader}>
        <div style={{ flex: 1 }}>
          <div style={styles.cardName}>{esc.nome}</div>
          <div style={styles.cardSub}>
            ID #{esc.id}
            {esc.cidade ? ` • ${esc.cidade}` : ""}
            {esc.estado ? ` / ${esc.estado}` : ""}
          </div>
          {tipos.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {tipos.map((t) => (
                <span key={t} style={{
                  fontSize: "0.65rem", fontWeight: 600,
                  padding: "2px 8px", borderRadius: 6,
                  background: t === "CCMDF" ? "rgba(234,179,8,0.12)" : "rgba(99,102,241,0.08)",
                  color: t === "CCMDF" ? "#ca8a04" : "#6366f1",
                }}>
                  {t === "CCMDF" ? "🎖️ CCMDF" : t}
                </span>
              ))}
            </div>
          )}
        </div>
        <span style={styles.statusBadge(esc.status)}>
          {esc.status === "ativa" ? "● Ativa" : esc.status === "bloqueada" ? "⏸ Bloqueada" : "✕ Cancelada"}
        </span>
      </div>

      <div style={styles.cardBody}>
        <div style={styles.metricsRow}>
          {[
            { v: esc.total_usuarios, l: "Usuários" },
            { v: esc.total_alunos, l: "Alunos" },
            { v: esc.total_professores, l: "Professores" },
            { v: esc.total_turmas, l: "Turmas" },
          ].map((m, i) => (
            <div key={i} style={styles.metricBox}>
              <div style={styles.metricValue}>{fmtNum(m.v)}</div>
              <div style={styles.metricLabel}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* Access metrics */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
        }}>
          {[
            { v: esc.acessos_24h, l: "24h", color: "#f59e0b" },
            { v: esc.acessos_7d, l: "7 dias", color: "#8b5cf6" },
            { v: esc.acessos_30d, l: "30 dias", color: "#6366f1" },
          ].map((m, i) => (
            <div key={i} style={{
              textAlign: "center", padding: "6px 4px", borderRadius: 8,
              background: `${m.color}08`, border: `1px solid ${m.color}15`,
            }}>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: m.color }}>{fmtNum(m.v)}</div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Acessos {m.l}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${progressColor}, ${progressColor}cc)`,
          }} />
        </div>
      </div>

      <div style={styles.cardFooter}>
        <span>
          🕐 Último acesso: {fmtDate(esc.ultimo_acesso)}
        </span>
        <span style={{ fontWeight: 600, color: "#6366f1" }}>
          Ver detalhes →
        </span>
      </div>
    </div>
  );
}
