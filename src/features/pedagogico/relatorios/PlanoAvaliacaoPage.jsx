// src/features/pedagogico/relatorios/PlanoAvaliacaoPage.jsx  (v2 — breakdown por bimestre)
// ============================================================================
// Relatório — Plano de Avaliação Pedagógica
// - Abas por bimestre (1º ao 4º)
// - Para cada bimestre: KPIs + tabela de professores com seus planos reais
// - Usa planos_avaliacao (tabela existente com dados reais)
// ============================================================================

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

// ─── Configuração de status ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDENTE:             { label: "Pendente",      color: "#94a3b8", bg: "rgba(148,163,184,0.12)", dot: "#94a3b8" },
  RASCUNHO:             { label: "Rascunho",      color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  ENVIADO:              { label: "Enviado",       color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  dot: "#3b82f6" },
  APROVADO:             { label: "Aprovado",      color: "#10b981", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  DEVOLVIDO:            { label: "Devolvido",     color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
  LIBERACAO_SOLICITADA: { label: "Sol. Liberação",color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", dot: "#8b5cf6" },
  LIBERADO:             { label: "Liberado",      color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   dot: "#06b6d4" },
};

// Ordem de "urgência" para status geral de um professor num bimestre
const STATUS_URGENCIA = ["PENDENTE", "APROVADO", "LIBERADO", "RASCUNHO", "LIBERACAO_SOLICITADA", "DEVOLVIDO", "ENVIADO"];

function statusGeralProfessor(planosBim) {
  if (!planosBim || planosBim.length === 0) return "PENDENTE";
  const idxPior = planosBim.reduce((worstIdx, p) => {
    const idx = STATUS_URGENCIA.indexOf(p.status);
    return idx > worstIdx ? idx : worstIdx;
  }, 0);
  return STATUS_URGENCIA[idxPior];
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDENTE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 999,
      fontSize: "0.72rem", fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ─── Ícone de avatar do professor ────────────────────────────────────────────
function Avatar({ nome, foto }) {
  if (foto) return (
    <img src={foto} alt={nome}
      style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: "0.82rem", fontWeight: 700,
    }}>
      {(nome || "?").charAt(0).toUpperCase()}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ value, label, color, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "14px 18px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
      display: "flex", flexDirection: "column", gap: 4, minWidth: 90,
    }}>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: color || "#1e3a5f", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>{label}</div>
      {total > 0 && (
        <div style={{ height: 3, background: "#f1f5f9", borderRadius: 999, marginTop: 2 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.8s" }} />
        </div>
      )}
    </div>
  );
}

function anoLetivoAtual() {
  const hoje = new Date();
  return hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

// ─── Componente principal ────────────────────────────────────────────────────
export default function PlanoAvaliacaoPage() {
  const navigate = useNavigate();
  const [professores, setProfessores] = useState([]);
  const [kpi, setKpi]                 = useState(null);
  const [loading, setLoading]         = useState(true);
  const [erro, setErro]               = useState("");
  const [bimSelecionado, setBimSelecionado] = useState("1º Bimestre");
  const [search, setSearch]           = useState("");
  const [filtroStatus, setFiltroStatus]    = useState("TODOS");
  const [expandidos, setExpandidos]        = useState(new Set());
  const [ano] = useState(anoLetivoAtual);

  // ─── Carregar dados ──────────────────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const { data } = await api.get("/api/pedagogico/relatorios/plano-avaliacao", { params: { ano } });
      setProfessores(data?.professores || []);
      setKpi(data?.kpi || null);
    } catch (err) {
      setErro(err?.response?.data?.message || "Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [ano]);

  // ─── Dado do bimestre selecionado ────────────────────────────────────────
  const kpiBim = kpi?.bimestres?.[bimSelecionado] || {};

  // ─── Lista de professores processada para o bimestre selecionado ─────────
  const professorBimList = useMemo(() => {
    return professores.map(prof => {
      const planosBim = prof.planos.filter(pl => pl.bimestre === bimSelecionado);
      const statusGeral = statusGeralProfessor(planosBim);
      return { ...prof, planosBim, statusGeral };
    });
  }, [professores, bimSelecionado]);

  // ─── Filtrar ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return professorBimList.filter(prof => {
      const nomeNorm = (prof.nome || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      const discStr  = prof.planosBim.map(p => p.disciplina).join(" ").toLowerCase();
      const turmaStr = prof.planosBim.map(p => p.turmas).join(" ").toLowerCase();
      const matchSearch = !term || nomeNorm.includes(term) || discStr.includes(term) || turmaStr.includes(term);
      const matchStatus = filtroStatus === "TODOS" || prof.statusGeral === filtroStatus;
      return matchSearch && matchStatus;
    });
  }, [professorBimList, search, filtroStatus]);

  function toggleExpandir(prof_id) {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(prof_id) ? next.delete(prof_id) : next.add(prof_id);
      return next;
    });
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  // ─── Cor da aba ───────────────────────────────────────────────────────────
  const BIM_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];
  const bimIdx = BIMESTRES.indexOf(bimSelecionado);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Montserrat, 'Inter', sans-serif", minHeight: "100vh" }}>

      {/* ── Header premium ────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0f2d5a 0%, #1e3a5f 50%, #1a4480 100%)",
        borderRadius: 20, padding: "28px 36px", marginBottom: 24,
        boxShadow: "0 8px 32px rgba(15,45,90,0.35)", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <button onClick={() => navigate("/pedagogico/relatorios")} style={{
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "4px 12px",
            fontSize: "0.72rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Relatórios
          </button>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.72rem" }}>Plano de Avaliação</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 4px 14px rgba(99,102,241,0.4)", flexShrink: 0,
          }}>📋</div>
          <div>
            <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.3px" }}>
              Plano de Avaliação Pedagógica
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.82rem", margin: "3px 0 0" }}>
              {kpi?.total_professores || 0} professores em regência • Ano letivo {ano}
            </p>
          </div>
        </div>
      </div>

      {/* ── Abas de bimestre ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {BIMESTRES.map((bim, i) => {
          const isAtivo = bimSelecionado === bim;
          const cor = BIM_COLORS[i];
          const kBim = kpi?.bimestres?.[bim] || {};
          return (
            <button
              key={bim}
              onClick={() => { setBimSelecionado(bim); setExpandidos(new Set()); }}
              style={{
                padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem",
                background: isAtivo
                  ? `linear-gradient(135deg, ${cor}, ${cor}cc)`
                  : "#fff",
                color: isAtivo ? "#fff" : "#475569",
                boxShadow: isAtivo
                  ? `0 4px 16px ${cor}44`
                  : "0 2px 8px rgba(0,0,0,0.06)",
                transition: "all 0.2s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}
            >
              <span>{bim}</span>
              {kBim.total_planos > 0 && (
                <span style={{ fontSize: "0.65rem", opacity: 0.8, fontWeight: 600 }}>
                  {kBim.aprovado || 0} aprovados / {kBim.total_planos} planos
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── KPIs do bimestre selecionado ─────────────────────────────────── */}
      {kpi && !loading && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
          gap: 12, marginBottom: 20,
        }}>
          <KpiCard value={kpi.total_professores}          label="Em Regência"     color={BIM_COLORS[bimIdx]} total={kpi.total_professores} />
          <KpiCard value={kpiBim.professores_com_plano || 0}  label="Com Plano"   color="#6366f1" total={kpi.total_professores} />
          <KpiCard value={kpiBim.professores_sem_plano || 0}  label="Sem Plano"   color="#94a3b8" total={kpi.total_professores} />
          <KpiCard value={kpiBim.aprovado || 0}           label="Aprovados"       color="#10b981" total={kpiBim.total_planos || 1} />
          <KpiCard value={kpiBim.enviado || 0}            label="Enviados"        color="#3b82f6" total={kpiBim.total_planos || 1} />
          <KpiCard value={kpiBim.rascunho || 0}           label="Rascunho"        color="#f59e0b" total={kpiBim.total_planos || 1} />
          <KpiCard value={kpiBim.devolvido || 0}          label="Devolvidos"      color="#ef4444" total={kpiBim.total_planos || 1} />
        </div>
      )}

      {/* ── Barra de progresso de aprovação do bimestre ──────────────────── */}
      {kpi && !loading && kpiBim.total_planos > 0 && (
        <div style={{
          background: "#fff", borderRadius: 12, padding: "14px 20px",
          marginBottom: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 600 }}>
              {bimSelecionado} — progresso de aprovação
            </span>
            <span style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: 700 }}>
              {kpiBim.aprovado || 0}/{kpiBim.total_planos} planos ({Math.round(((kpiBim.aprovado || 0) / kpiBim.total_planos) * 100)}%)
            </span>
          </div>
          {/* Barra composta por status */}
          <div style={{ height: 10, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", display: "flex" }}>
            {[
              { key: "aprovado", color: "#10b981" },
              { key: "enviado",  color: "#3b82f6" },
              { key: "liberacao",color: "#8b5cf6" },
              { key: "liberado", color: "#06b6d4" },
              { key: "rascunho", color: "#f59e0b" },
              { key: "devolvido",color: "#ef4444" },
            ].map(({ key, color }) => {
              const val = kpiBim[key] || 0;
              const pct = (val / kpiBim.total_planos) * 100;
              if (pct === 0) return null;
              return <div key={key} style={{ width: `${pct}%`, background: color, transition: "width 0.8s" }} />;
            })}
          </div>
        </div>
      )}

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "14px 18px", marginBottom: 18,
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
      }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text" placeholder="Buscar professor, disciplina ou turma…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px 8px 32px", borderRadius: 9,
              border: "1.5px solid #e2e8f0", fontSize: "0.82rem",
              fontFamily: "inherit", background: "#f8fafc", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0",
            fontSize: "0.82rem", fontFamily: "inherit", background: "#f8fafc",
            color: "#1e3a5f", cursor: "pointer", outline: "none",
          }}
        >
          <option value="TODOS">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="ENVIADO">Enviado</option>
          <option value="APROVADO">Aprovado</option>
          <option value="DEVOLVIDO">Devolvido</option>
          <option value="LIBERACAO_SOLICITADA">Sol. Liberação</option>
          <option value="LIBERADO">Liberado</option>
        </select>
        <span style={{ color: "#94a3b8", fontSize: "0.78rem", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filtered.length} professor{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* ── Tabela de professores ─────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
            Carregando planos…
          </div>
        ) : erro ? (
          <div style={{ padding: 48, textAlign: "center", color: "#ef4444" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚠️</div>
            {erro}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>📭</div>
            Nenhum professor encontrado.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "linear-gradient(90deg, #1e3a5f, #1a4480)" }}>
                {["#", "Professor", `Planos — ${bimSelecionado}`, "Status Geral", "Última Atualização", ""].map(h => (
                  <th key={h} style={{
                    padding: "13px 14px", textAlign: h === "#" ? "center" : "left",
                    color: "rgba(255,255,255,0.85)", fontSize: "0.72rem",
                    fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((prof, idx) => {
                const isExp = expandidos.has(prof.professor_id);
                const temPlanos = prof.planosBim.length > 0;
                const lastUpdate = temPlanos
                  ? prof.planosBim.reduce((acc, p) => (!acc || p.atualizado_em > acc ? p.atualizado_em : acc), null)
                  : null;

                return (
                  <React.Fragment key={prof.professor_id}>
                    {/* Linha principal do professor */}
                    <tr style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: idx % 2 === 0 ? "#fff" : "#fafbff",
                      cursor: temPlanos ? "pointer" : "default",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#f0f4ff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbff"; }}
                      onClick={() => temPlanos && toggleExpandir(prof.professor_id)}
                    >
                      {/* # */}
                      <td style={{ padding: "13px 14px", textAlign: "center", color: "#94a3b8", fontSize: "0.78rem", width: 40 }}>
                        {idx + 1}
                      </td>
                      {/* Professor */}
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar nome={prof.nome} foto={prof.foto} />
                          <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.85rem" }}>{prof.nome}</span>
                        </div>
                      </td>
                      {/* Resumo dos planos */}
                      <td style={{ padding: "13px 14px" }}>
                        {!temPlanos ? (
                          <span style={{ color: "#94a3b8", fontSize: "0.78rem", fontStyle: "italic" }}>
                            Nenhum plano enviado
                          </span>
                        ) : (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {/* Agrupa por disciplina para exibir resumo compacto */}
                            {Object.entries(
                              prof.planosBim.reduce((acc, p) => {
                                if (!acc[p.disciplina]) acc[p.disciplina] = [];
                                acc[p.disciplina].push(p);
                                return acc;
                              }, {})
                            ).map(([disc, pls]) => (
                              <span key={disc} style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 8px", borderRadius: 6,
                                background: "#f1f5f9", color: "#475569",
                                fontSize: "0.7rem", fontWeight: 600,
                              }}>
                                {disc}
                                <span style={{ color: "#94a3b8" }}>
                                  ({pls.map(p => p.turmas).join(", ")})
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* Status geral */}
                      <td style={{ padding: "13px 14px" }}>
                        <StatusPill status={prof.statusGeral} />
                      </td>
                      {/* Última atualização */}
                      <td style={{ padding: "13px 14px", color: "#94a3b8", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {formatDate(lastUpdate)}
                      </td>
                      {/* Toggle expandir */}
                      <td style={{ padding: "13px 14px", textAlign: "center", width: 36 }}>
                        {temPlanos && (
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="#94a3b8" strokeWidth={2.5}
                            style={{ transform: isExp ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </td>
                    </tr>

                    {/* Linhas expandidas — planos individuais */}
                    {isExp && prof.planosBim.map((plano, pi) => {
                      const cfg = STATUS_CONFIG[plano.status] || STATUS_CONFIG.PENDENTE;
                      return (
                        <tr key={plano.plano_id} style={{
                          background: "linear-gradient(90deg, #f8f7ff, #f5f7ff)",
                          borderBottom: "1px solid #e8edff",
                        }}>
                          <td />
                          <td style={{ padding: "8px 14px 8px 28px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 2, height: 16, background: "#6366f1", borderRadius: 2, flexShrink: 0 }} />
                              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                                {pi + 1}. {plano.disciplina}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "8px 14px" }}>
                            <span style={{
                              display: "inline-block", padding: "2px 8px", borderRadius: 5,
                              background: "#e0e7ff", color: "#4f46e5", fontSize: "0.72rem", fontWeight: 700,
                            }}>
                              {plano.turmas}
                            </span>
                          </td>
                          <td style={{ padding: "8px 14px" }}>
                            <StatusPill status={plano.status} />
                            {plano.motivo_devolucao && (
                              <div style={{ marginTop: 4, fontSize: "0.68rem", color: "#ef4444", maxWidth: 240 }}>
                                ↩ {plano.motivo_devolucao}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "8px 14px", color: "#94a3b8", fontSize: "0.72rem" }}>
                            {formatDate(plano.atualizado_em)}
                          </td>
                          <td />
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Legenda ──────────────────────────────────────────────────────── */}
      {!loading && !erro && (
        <div style={{
          marginTop: 18, padding: "12px 18px",
          background: "#fff", borderRadius: 11,
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 700 }}>Legenda:</span>
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
              <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
