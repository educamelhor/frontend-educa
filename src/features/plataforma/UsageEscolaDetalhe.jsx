// src/features/plataforma/UsageEscolaDetalhe.jsx
// ============================================================================
// Dashboard DETALHADO de uma escola — gráficos, tabelas, KPIs
// Renderiza tudo via CSS/SVG puro (sem lib de charts externa)
// ============================================================================
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";

// ── Helpers ──
const fmtNum = (n) => Number(n || 0).toLocaleString("pt-BR");
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};
const fmtDateShort = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};
const parseTipo = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return []; }
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PERFIL_LABELS = {
  diretor: "Diretor",
  professor: "Professor",
  coordenador: "Coordenador",
  militar: "Comandante",
  secretaria: "Secretaria",
  disciplinar: "Disciplinar",
  aluno: "Aluno",
  responsavel: "Responsável",
  supervisor: "Supervisor",
};
const PERFIL_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899",
  "#8b5cf6", "#14b8a6", "#f97316", "#ef4444", "#06b6d4",
];

export default function UsageEscolaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // overview | tabela | top

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/api/plataforma/usage/escolas/${id}`);
      setData(res);
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Renders ──
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>❌</div>
        <div style={{ color: "#64748b" }}>Escola não encontrada ou erro ao carregar.</div>
        <button onClick={() => navigate("/plataforma/usage")}
          style={{ marginTop: 16, padding: "8px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 600 }}>
          ← Voltar
        </button>
      </div>
    );
  }

  const { escola, kpi, perfilDistribuicao, acessosPorHora, acessosPorDiaSemana, acessosDiarios, ultimosAcessos, topUsuarios, acessosPorPerfil } = data;
  const tipos = parseTipo(escola.tipo);

  return (
    <div style={{ width: "100%", padding: "24px 32px", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/plataforma/usage")}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
            borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff",
            cursor: "pointer", fontWeight: 600, color: "#64748b", fontSize: "0.85rem",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
        >
          ← Voltar
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {escola.nome}
            <span style={{
              fontSize: "0.55rem", fontWeight: 800,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              color: "#fff", padding: "3px 8px", borderRadius: 8,
            }}>USAGE</span>
            {tipos.map(t => (
              <span key={t} style={{
                fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                background: t === "CCMDF" ? "rgba(234,179,8,0.12)" : "rgba(99,102,241,0.08)",
                color: t === "CCMDF" ? "#ca8a04" : "#6366f1",
              }}>{t === "CCMDF" ? "🎖️ CCMDF" : t}</span>
            ))}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>
            ID #{escola.id}
            {escola.cidade ? ` • ${escola.cidade}` : ""}
            {escola.estado ? ` / ${escola.estado}` : ""}
          </div>
        </div>
        <button onClick={fetchData}
          style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 600, color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}>
          🔄 Atualizar
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Usuários Ativos", value: fmtNum(kpi.total_usuarios_ativos), icon: "👥", color: "#6366f1" },
          { label: "Inativos", value: fmtNum(kpi.total_usuarios_inativos), icon: "🚫", color: "#94a3b8" },
          { label: "Alunos", value: fmtNum(kpi.total_alunos), icon: "🎓", color: "#3b82f6" },
          { label: "Professores", value: fmtNum(kpi.total_professores), icon: "📚", color: "#10b981" },
          { label: "Turmas", value: fmtNum(kpi.total_turmas), icon: "🏛️", color: "#8b5cf6" },
          { label: "Acessos (24h)", value: fmtNum(kpi.acessos_24h), icon: "⚡", color: "#f59e0b" },
          { label: "Acessos (7d)", value: fmtNum(kpi.acessos_7d), icon: "📈", color: "#ec4899" },
          { label: "Acessos (30d)", value: fmtNum(kpi.acessos_30d), icon: "📊", color: "#14b8a6" },
          { label: "Ativos (30d)", value: fmtNum(kpi.usuarios_ativos_30d), icon: "🔥", color: "#f97316" },
          { label: "Total Acessos", value: fmtNum(kpi.total_acessos), icon: "🌐", color: "#64748b" },
        ].map((k, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderRadius: 14,
            padding: "16px 18px", border: "1px solid rgba(226,232,240,0.8)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
              {k.icon} {k.label}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Último acesso ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 28,
        padding: "12px 20px", borderRadius: 12, background: "rgba(99,102,241,0.04)",
        border: "1px solid rgba(99,102,241,0.1)", fontSize: "0.85rem", color: "#475569",
      }}>
        🕐 <strong>Último acesso registrado:</strong> {fmtDate(kpi.ultimo_acesso)}
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
        {[
          { key: "overview", label: "📊 Visão Geral" },
          { key: "tabela", label: "📋 Últimos Acessos" },
          { key: "top", label: "🏆 Top Usuários" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px", border: "none", borderBottom: tab === t.key ? "3px solid #6366f1" : "3px solid transparent",
              background: "transparent", cursor: "pointer", fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "#6366f1" : "#94a3b8", fontSize: "0.85rem",
              transition: "all 0.2s", marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === "overview" && (
        <OverviewTab
          perfilDistribuicao={perfilDistribuicao}
          acessosPorHora={acessosPorHora}
          acessosPorDiaSemana={acessosPorDiaSemana}
          acessosDiarios={acessosDiarios}
          acessosPorPerfil={acessosPorPerfil}
        />
      )}
      {tab === "tabela" && <TabelaAcessos acessos={ultimosAcessos} />}
      {tab === "top" && <TopUsuarios usuarios={topUsuarios} />}
    </div>
  );
}

// ============================================================================
// Tab: Visão Geral — Gráficos e Distribuição
// ============================================================================
function OverviewTab({ perfilDistribuicao, acessosPorHora, acessosPorDiaSemana, acessosDiarios, acessosPorPerfil }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Distribuição por Perfil (Cadastros) */}
      <ChartCard title="👥 Usuários Cadastrados por Perfil" span={1}>
        <BarChartHorizontal
          data={perfilDistribuicao.map((p, i) => ({
            label: PERFIL_LABELS[p.perfil] || p.perfil || "Outros",
            value: p.quantidade,
            color: PERFIL_COLORS[i % PERFIL_COLORS.length],
            sub: `${p.ativos || 0} ativos`,
          }))}
        />
      </ChartCard>

      {/* Acessos por Perfil (Logins) */}
      <ChartCard title="🔑 Acessos por Perfil (30d)" span={1}>
        <DonutChart
          data={acessosPorPerfil.map((p, i) => ({
            label: PERFIL_LABELS[p.perfil] || p.perfil || "Outros",
            value: p.quantidade,
            color: PERFIL_COLORS[i % PERFIL_COLORS.length],
          }))}
        />
      </ChartCard>

      {/* Acessos por Hora */}
      <ChartCard title="🕐 Acessos por Hora do Dia (30d)" span={1}>
        <BarChartVertical
          data={Array.from({ length: 24 }, (_, h) => {
            const found = acessosPorHora.find(a => a.hora === h);
            return { label: `${String(h).padStart(2, "0")}h`, value: found?.quantidade || 0 };
          })}
          color="#6366f1"
        />
      </ChartCard>

      {/* Acessos por Dia da Semana */}
      <ChartCard title="📅 Acessos por Dia da Semana (30d)" span={1}>
        <BarChartVertical
          data={Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1; // MySQL DAYOFWEEK: 1=Dom, 2=Seg, ..., 7=Sáb
            const found = acessosPorDiaSemana.find(a => a.dia_semana === dow);
            return { label: DIAS_SEMANA[i], value: found?.quantidade || 0 };
          })}
          color="#8b5cf6"
        />
      </ChartCard>

      {/* Acessos diários (Linha/Área) */}
      <ChartCard title="📈 Acessos Diários (30d)" span={2}>
        <AreaChart data={acessosDiarios} />
      </ChartCard>
    </div>
  );
}

// ============================================================================
// Tab: Últimos Acessos — Tabela
// ============================================================================
function TabelaAcessos({ acessos }) {
  if (!acessos?.length) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
        <div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>
        Nenhum acesso registrado ainda.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {["Usuário", "Perfil", "Ação", "IP", "Data/Hora"].map(h => (
              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {acessos.map((a, i) => (
            <tr key={a.id || i} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
              <td style={{ padding: "10px 16px", fontWeight: 600, color: "#1e293b" }}>{a.usuario_nome || `ID #${a.usuario_id}`}</td>
              <td style={{ padding: "10px 16px" }}>
                <span style={{
                  display: "inline-block", padding: "2px 10px", borderRadius: 6,
                  fontSize: "0.75rem", fontWeight: 600,
                  background: "rgba(99,102,241,0.08)", color: "#6366f1",
                }}>
                  {PERFIL_LABELS[a.perfil] || a.perfil || "—"}
                </span>
              </td>
              <td style={{ padding: "10px 16px", color: "#64748b" }}>{a.action || "login"}</td>
              <td style={{ padding: "10px 16px", color: "#94a3b8", fontFamily: "monospace", fontSize: "0.8rem" }}>{a.ip || "—"}</td>
              <td style={{ padding: "10px 16px", color: "#475569" }}>{fmtDate(a.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Tab: Top Usuários
// ============================================================================
function TopUsuarios({ usuarios }) {
  if (!usuarios?.length) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
        <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏆</div>
        Nenhum dado disponível ainda.
      </div>
    );
  }

  const maxAcessos = Math.max(...usuarios.map(u => u.total_acessos), 1);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {usuarios.map((u, i) => (
        <div key={u.usuario_id || i} style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "14px 20px", borderRadius: 14, border: "1px solid #f1f5f9",
          background: i < 3 ? "rgba(99,102,241,0.02)" : "#fff",
          transition: "all 0.2s",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "0.9rem",
            background: i === 0 ? "linear-gradient(135deg, #f59e0b, #f97316)" : i === 1 ? "linear-gradient(135deg, #94a3b8, #64748b)" : i === 2 ? "linear-gradient(135deg, #d97706, #b45309)" : "#f1f5f9",
            color: i < 3 ? "#fff" : "#64748b",
          }}>
            {i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>{u.usuario_nome || `ID #${u.usuario_id}`}</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {PERFIL_LABELS[u.perfil] || u.perfil || "—"} • Último: {fmtDate(u.ultimo_acesso)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#6366f1" }}>{fmtNum(u.total_acessos)}</div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase" }}>acessos</div>
          </div>
          <div style={{ width: 120, height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${Math.round((u.total_acessos / maxAcessos) * 100)}%`,
              background: "linear-gradient(90deg, #6366f1, #a855f7)",
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Chart Components (Pure SVG/CSS — no external library)
// ============================================================================

function ChartCard({ title, children, span = 1 }) {
  return (
    <div style={{
      gridColumn: span > 1 ? "1 / -1" : undefined,
      background: "#fff", borderRadius: 16, border: "1px solid rgba(226,232,240,0.9)",
      boxShadow: "0 2px 6px rgba(0,0,0,0.03)", overflow: "hidden",
    }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
        {title}
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  );
}

// ── Horizontal Bar Chart ──
function BarChartHorizontal({ data }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 100, fontSize: "0.8rem", fontWeight: 600, color: "#475569", textAlign: "right" }}>
            {d.label}
          </div>
          <div style={{ flex: 1, height: 24, borderRadius: 6, background: "#f8fafc", overflow: "hidden", position: "relative" }}>
            <div style={{
              height: "100%", borderRadius: 6,
              width: `${Math.round((d.value / maxVal) * 100)}%`,
              background: `linear-gradient(90deg, ${d.color}, ${d.color}aa)`,
              transition: "width 0.8s ease",
              minWidth: d.value > 0 ? 4 : 0,
            }} />
            <span style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: "0.7rem", fontWeight: 700, color: "#64748b",
            }}>
              {fmtNum(d.value)} {d.sub ? `(${d.sub})` : ""}
            </span>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>Sem dados</div>
      )}
    </div>
  );
}

// ── Vertical Bar Chart ──
function BarChartVertical({ data, color = "#6366f1" }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(12, Math.min(32, Math.floor(600 / data.length) - 4));

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 140, padding: "0 4px" }}>
        {data.map((d, i) => {
          const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              {d.value > 0 && (
                <span style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: 600 }}>{d.value}</span>
              )}
              <div
                style={{
                  width: barWidth, borderRadius: "4px 4px 0 0",
                  height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%`,
                  background: `linear-gradient(180deg, ${color}, ${color}88)`,
                  transition: "height 0.6s ease",
                  minHeight: d.value > 0 ? 4 : 0,
                }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 2, padding: "4px 4px 0", borderTop: "1px solid #f1f5f9" }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "0.6rem", color: "#94a3b8", fontWeight: 500 }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut Chart ──
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>Sem dados de acesso</div>;
  }

  const size = 160;
  const radius = 60;
  const stroke = 20;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotation = offset * 360;
    offset += pct;
    return { ...d, dashArray, rotation, pct };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none"
            stroke={s.color} strokeWidth={stroke}
            strokeDasharray={s.dashArray}
            strokeDashoffset={0}
            transform={`rotate(${s.rotation - 90} ${cx} ${cy})`}
            style={{ transition: "all 0.6s ease" }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1e293b" fontSize="22" fontWeight="800">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">ACESSOS</text>
      </svg>
      <div style={{ display: "grid", gap: 6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem" }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: "#475569", fontWeight: 500 }}>{s.label}</span>
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>
              {fmtNum(s.value)} ({Math.round(s.pct * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Area Chart (Daily Accesses) ──
function AreaChart({ data }) {
  if (!data?.length) {
    return <div style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>Sem dados diários</div>;
  }

  const W = 800;
  const H = 180;
  const padL = 40;
  const padB = 30;
  const padT = 10;
  const padR = 10;

  const chartW = W - padL - padR;
  const chartH = H - padB - padT;

  const maxVal = Math.max(...data.map(d => d.quantidade), 1);
  const step = chartW / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: padL + i * step,
    y: padT + chartH - (d.quantidade / maxVal) * chartH,
    val: d.quantidade,
    date: d.data,
    unique: d.usuarios_unicos,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;

  // Y-axis labels
  const yLabels = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((v, i) => {
          const y = padT + chartH - (v / maxVal) * chartH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10">{v}</text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="#6366f1" stroke="#fff" strokeWidth={2} />
            {/* X-axis labels (show every few) */}
            {(i === 0 || i === points.length - 1 || i % Math.ceil(data.length / 8) === 0) && (
              <text x={p.x} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize="9">
                {fmtDateShort(p.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
