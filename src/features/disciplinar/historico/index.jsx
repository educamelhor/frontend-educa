// ============================================================================
// HistoricoDisciplinar.jsx — Histórico de Ocorrências Disciplinares
// Design premium inspirado pela Busca Ativa (green → dark disciplinary orange)
// KPI Cards + Filtros + Lista paginada + Redirecionamento para Relatório
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

// ── Helpers ─────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("pt-BR");
};
const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const STATUS_MAP = {
  REGISTRADA: { label: "Registrada", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "📝" },
  FINALIZADA: { label: "Finalizada", color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "✅" },
  CANCELADA: { label: "Cancelada", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "❌" },
};

const TIPO_MAP = {
  ADVERTENCIA: { label: "Advertência", color: "#f59e0b" },
  REPREENSAO: { label: "Repreensão", color: "#f97316" },
  SUSPENSAO: { label: "Suspensão", color: "#ef4444" },
  ELOGIO: { label: "Elogio", color: "#10b981" },
  MERITO: { label: "Mérito", color: "#06b6d4" },
};

export default function HistoricoDisciplinar() {
  const navigate = useNavigate();

  // State
  const [registros, setRegistros] = useState([]);
  const [kpis, setKpis] = useState({});
  const [paginacao, setPaginacao] = useState({ total: 0, page: 1, limit: 30, totalPages: 0 });
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("");
  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // ── Fetch Turmas ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/api/turmas").then((r) => setTurmas(r.data || [])).catch(() => {});
  }, []);

  // ── Fetch Histórico ───────────────────────────────────────────────────
  const fetchHistorico = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 30);
      if (filtroStatus) params.append("status", filtroStatus);
      if (filtroTurma) params.append("turma_id", filtroTurma);
      if (filtroTurno) params.append("turno", filtroTurno);
      if (filtroAluno) params.append("aluno_nome", filtroAluno);
      if (filtroTipo) params.append("tipo_ocorrencia", filtroTipo);
      if (filtroResponsavel) params.append("convocar_responsavel", "1");
      if (filtroDataInicio) params.append("data_inicio", filtroDataInicio);
      if (filtroDataFim) params.append("data_fim", filtroDataFim);

      const resp = await api.get(`/api/registros-ocorrencias/historico?${params.toString()}`);
      setRegistros(resp.data.registros || []);
      setKpis(resp.data.kpis || {});
      setPaginacao(resp.data.paginacao || {});
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    }
    setLoading(false);
  }, [page, filtroStatus, filtroTurma, filtroTurno, filtroAluno, filtroTipo, filtroResponsavel, filtroDataInicio, filtroDataFim]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filtroStatus, filtroTurma, filtroTurno, filtroAluno, filtroTipo, filtroResponsavel, filtroDataInicio, filtroDataFim]);

  const limparFiltros = () => {
    setFiltroStatus(""); setFiltroTurma(""); setFiltroTurno(""); setFiltroAluno("");
    setFiltroTipo(""); setFiltroResponsavel(""); setFiltroDataInicio(""); setFiltroDataFim("");
    setPage(1);
  };

  const temFiltrosAtivos = filtroStatus || filtroTurma || filtroTurno || filtroAluno || filtroTipo || filtroResponsavel || filtroDataInicio || filtroDataFim;

  // ── Navigate to student disciplinary report ───────────────────────────
  const abrirRelatorio = (alunoId) => {
    navigate(`/disciplinar/alunos?aluno=${alunoId}&tab=disciplinar`);
  };

  // ── KPI Cards ─────────────────────────────────────────────────────────
  const kpiCards = [
    { label: "Total Registros", value: kpis.total || 0, color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: "📊" },
    { label: "Registradas", value: kpis.registradas || 0, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "📝" },
    { label: "Finalizadas", value: kpis.finalizadas || 0, color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "✅" },
    { label: "Aguardando Responsável", value: kpis.aguardando_responsavel || 0, color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "⏳" },
  ];

  return (
    <>
      <style>{`
        .disc-hist { font-family: 'Inter', 'Segoe UI', sans-serif; color: #e2e8f0; min-height: 100vh; padding: 24px; background: transparent; }
        .disc-hist-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .disc-hist-header-icon {
          width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #f59e0b, #ea580c); font-size: 1.5rem; flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(245,158,11,0.25);
        }
        .disc-hist-header h2 { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; margin: 0; letter-spacing: -0.5px; }
        .disc-hist-header p { font-size: 0.82rem; color: #94a3b8; margin: 2px 0 0; }

        .disc-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
        .disc-kpi-card {
          background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 14px;
          transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; backdrop-filter: blur(12px);
        }
        .disc-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .disc-kpi-card.active { border-color: var(--kpi-color); box-shadow: 0 0 16px rgba(var(--kpi-r), var(--kpi-g), var(--kpi-b), 0.25); }
        .disc-kpi-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .disc-kpi-value { font-size: 1.6rem; font-weight: 800; line-height: 1; }
        .disc-kpi-label { font-size: 0.72rem; color: #94a3b8; margin-top: 2px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; }

        .disc-filter-bar {
          background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; backdrop-filter: blur(12px);
        }
        .disc-filter-toggle { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
        .disc-filter-toggle h3 { font-size: 0.88rem; font-weight: 700; color: #e2e8f0; margin: 0; display: flex; align-items: center; gap: 8px; }
        .disc-filter-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;
          margin-top: 16px; animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .disc-filter-group label { font-size: 0.7rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; display: block; }
        .disc-filter-group select, .disc-filter-group input {
          width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(15,23,42,0.8); color: #e2e8f0; font-size: 0.82rem; outline: none;
          transition: border-color 0.2s;
        }
        .disc-filter-group select:focus, .disc-filter-group input:focus { border-color: #f59e0b; }
        .disc-filter-actions { display: flex; gap: 10px; margin-top: 14px; align-items: center; }
        .disc-btn-clear {
          padding: 7px 16px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.3);
          background: rgba(239,68,68,0.1); color: #f87171; font-size: 0.78rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .disc-btn-clear:hover { background: rgba(239,68,68,0.2); }
        .disc-active-count {
          font-size: 0.72rem; padding: 3px 10px; border-radius: 20px;
          background: rgba(245,158,11,0.15); color: #f59e0b; font-weight: 700;
        }

        .disc-list { display: flex; flex-direction: column; gap: 10px; }
        .disc-card {
          background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 16px 20px; display: flex; gap: 16px; align-items: flex-start;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; cursor: pointer;
          backdrop-filter: blur(12px); position: relative; overflow: hidden;
        }
        .disc-card::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
          border-radius: 14px 0 0 14px;
        }
        .disc-card:hover { border-color: rgba(245,158,11,0.3); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
        .disc-card-avatar {
          width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 800; flex-shrink: 0; color: #fff;
        }
        .disc-card-body { flex: 1; min-width: 0; }
        .disc-card-name { font-size: 0.92rem; font-weight: 700; color: #f1f5f9; margin-bottom: 2px; }
        .disc-card-turma { font-size: 0.72rem; color: #94a3b8; }
        .disc-card-desc { font-size: 0.78rem; color: #cbd5e1; margin-top: 6px; line-height: 1.4; }
        .disc-card-meta { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; align-items: center; }
        .disc-tag {
          font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px;
          border-radius: 6px; letter-spacing: 0.3px; white-space: nowrap;
        }
        .disc-card-date { font-size: 0.72rem; color: #64748b; }
        .disc-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .disc-card-pts {
          font-size: 1rem; font-weight: 800; display: flex; align-items: center; gap: 4px;
        }
        .disc-card-action {
          font-size: 0.68rem; padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(245,158,11,0.3);
          background: rgba(245,158,11,0.1); color: #f59e0b; font-weight: 600; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .disc-card-action:hover { background: rgba(245,158,11,0.25); }

        .disc-pagination {
          display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; padding: 16px 0;
        }
        .disc-page-btn {
          padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(15,23,42,0.6); color: #e2e8f0; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .disc-page-btn:hover { border-color: #f59e0b; color: #f59e0b; }
        .disc-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .disc-page-info { font-size: 0.78rem; color: #94a3b8; }

        .disc-empty {
          text-align: center; padding: 60px 20px; color: #64748b;
        }
        .disc-empty-icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.5; }
        .disc-empty-title { font-size: 1.1rem; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }

        .disc-loading { display: flex; justify-content: center; padding: 60px; }
        .disc-spinner {
          width: 36px; height: 36px; border: 3px solid rgba(245,158,11,0.2);
          border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .disc-resp-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
        .disc-resp-aguardando { background: rgba(239,68,68,0.12); color: #f87171; }
        .disc-resp-compareceu { background: rgba(16,185,129,0.12); color: #34d399; }
      `}</style>

      <div className="disc-hist">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="disc-hist-header">
          <div className="disc-hist-header-icon">📋</div>
          <div>
            <h2>Histórico Disciplinar</h2>
            <p>Registro completo de todas as ocorrências disciplinares da escola</p>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────── */}
        <div className="disc-kpi-grid">
          {kpiCards.map((k, i) => {
            const isActive =
              (i === 1 && filtroStatus === "REGISTRADA") ||
              (i === 2 && filtroStatus === "FINALIZADA") ||
              (i === 3 && filtroResponsavel === "1");
            return (
              <div
                key={i}
                className={`disc-kpi-card${isActive ? " active" : ""}`}
                style={{ "--kpi-color": k.color }}
                onClick={() => {
                  if (i === 1) setFiltroStatus(filtroStatus === "REGISTRADA" ? "" : "REGISTRADA");
                  else if (i === 2) setFiltroStatus(filtroStatus === "FINALIZADA" ? "" : "FINALIZADA");
                  else if (i === 3) setFiltroResponsavel(filtroResponsavel === "1" ? "" : "1");
                  else { limparFiltros(); }
                }}
              >
                <div className="disc-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div>
                  <div className="disc-kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="disc-kpi-label">{k.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Filter Bar ─────────────────────────────────────── */}
        <div className="disc-filter-bar">
          <div className="disc-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
            <h3>
              🔍 Filtros Avançados
              {temFiltrosAtivos && (
                <span className="disc-active-count">
                  {[filtroStatus, filtroTurma, filtroTurno, filtroAluno, filtroTipo, filtroResponsavel, filtroDataInicio, filtroDataFim].filter(Boolean).length} ativo(s)
                </span>
              )}
            </h3>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{showFilters ? "▲ Ocultar" : "▼ Expandir"}</span>
          </div>

          {showFilters && (
            <>
              <div className="disc-filter-grid">
                <div className="disc-filter-group">
                  <label>Status</label>
                  <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                    <option value="">Todos os status</option>
                    <option value="REGISTRADA">📝 Registrada</option>
                    <option value="FINALIZADA">✅ Finalizada</option>
                    <option value="CANCELADA">❌ Cancelada</option>
                  </select>
                </div>
                <div className="disc-filter-group">
                  <label>Turma</label>
                  <select value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}>
                    <option value="">Todas as turmas</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome} ({t.turno})</option>
                    ))}
                  </select>
                </div>
                <div className="disc-filter-group">
                  <label>Turno</label>
                  <select value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)}>
                    <option value="">Todos os turnos</option>
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>
                <div className="disc-filter-group">
                  <label>Tipo de Ocorrência</label>
                  <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                    <option value="">Todos os tipos</option>
                    <option value="ADVERTENCIA">Advertência</option>
                    <option value="REPREENSAO">Repreensão</option>
                    <option value="SUSPENSAO">Suspensão</option>
                    <option value="ELOGIO">Elogio</option>
                    <option value="MERITO">Mérito</option>
                  </select>
                </div>
                <div className="disc-filter-group">
                  <label>Buscar Aluno</label>
                  <input
                    type="text"
                    placeholder="Nome do estudante..."
                    value={filtroAluno}
                    onChange={(e) => setFiltroAluno(e.target.value)}
                  />
                </div>
                <div className="disc-filter-group">
                  <label>Responsável</label>
                  <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="1">⏳ Aguardando comparecimento</option>
                  </select>
                </div>
                <div className="disc-filter-group">
                  <label>Data Início</label>
                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>
                <div className="disc-filter-group">
                  <label>Data Fim</label>
                  <input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
              </div>
              {temFiltrosAtivos && (
                <div className="disc-filter-actions">
                  <button className="disc-btn-clear" onClick={limparFiltros}>✕ Limpar filtros</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Lista de Registros ──────────────────────────────── */}
        {loading ? (
          <div className="disc-loading"><div className="disc-spinner" /></div>
        ) : registros.length === 0 ? (
          <div className="disc-empty">
            <div className="disc-empty-icon">📭</div>
            <div className="disc-empty-title">Nenhum registro encontrado</div>
            <p style={{ fontSize: "0.82rem" }}>Ajuste os filtros para ver os registros disciplinares</p>
          </div>
        ) : (
          <div className="disc-list">
            {registros.map((r) => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.REGISTRADA;
              const tipo = TIPO_MAP[r.tipo_ocorrencia] || { label: r.tipo_ocorrencia || "—", color: "#94a3b8" };
              const pts = Number(r.pontos || 0);
              const iniciais = (r.aluno_nome || "?").split(" ").map((n) => n[0]).slice(0, 2).join("");
              const avatarBg = r.tipo_ocorrencia === "ELOGIO" || r.tipo_ocorrencia === "MERITO"
                ? "linear-gradient(135deg, #10b981, #059669)"
                : r.tipo_ocorrencia === "SUSPENSAO"
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #f59e0b, #ea580c)";
              const borderColor = st.color;

              const aguardandoResp = r.convocar_responsavel === 1 && !r.data_comparecimento_responsavel && r.status !== "CANCELADA";
              const respCompareceu = r.convocar_responsavel === 1 && r.data_comparecimento_responsavel;

              return (
                <div
                  key={r.id}
                  className="disc-card"
                  style={{ "--border-left-color": borderColor, "::before": {} }}
                  onClick={() => abrirRelatorio(r.aluno_id)}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: borderColor, borderRadius: "14px 0 0 14px" }} />
                  <div className="disc-card-avatar" style={{ background: avatarBg }}>
                    {iniciais}
                  </div>
                  <div className="disc-card-body">
                    <div className="disc-card-name">{r.aluno_nome}</div>
                    <div className="disc-card-turma">
                      {r.turma_nome || "—"} • {r.turma_turno || "—"} • Cód: {r.aluno_codigo || "—"}
                    </div>
                    {r.motivo && (
                      <div className="disc-card-desc">
                        <strong style={{ color: tipo.color }}>{tipo.label}:</strong> {r.motivo}
                      </div>
                    )}
                    <div className="disc-card-meta">
                      <span className="disc-tag" style={{ background: st.bg, color: st.color }}>
                        {st.icon} {st.label}
                      </span>
                      <span className="disc-tag" style={{ background: `${tipo.color}15`, color: tipo.color }}>
                        {tipo.label}
                      </span>
                      {r.dias_suspensao > 0 && (
                        <span className="disc-tag" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                          🚫 {r.dias_suspensao} dia(s)
                        </span>
                      )}
                      {aguardandoResp && (
                        <span className="disc-resp-badge disc-resp-aguardando">⏳ Resp. não compareceu</span>
                      )}
                      {respCompareceu && (
                        <span className="disc-resp-badge disc-resp-compareceu">✅ Resp. compareceu {fmtDate(r.data_comparecimento_responsavel)}</span>
                      )}
                      <span className="disc-card-date">📅 {fmtDate(r.data_ocorrencia)}</span>
                    </div>
                    {r.registrado_por && (
                      <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 4 }}>
                        Registrado por: {r.registrado_por}
                      </div>
                    )}
                  </div>
                  <div className="disc-card-right">
                    <div className="disc-card-pts" style={{ color: pts < 0 ? "#ef4444" : pts > 0 ? "#10b981" : "#94a3b8" }}>
                      {pts > 0 ? "+" : ""}{pts.toFixed(1).replace(".", ",")} pts
                    </div>
                    <button
                      className="disc-card-action"
                      onClick={(e) => { e.stopPropagation(); abrirRelatorio(r.aluno_id); }}
                    >
                      📄 Ver Relatório
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Paginação ──────────────────────────────────────── */}
        {paginacao.totalPages > 1 && (
          <div className="disc-pagination">
            <button className="disc-page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ← Anterior
            </button>
            <span className="disc-page-info">
              Página {paginacao.page} de {paginacao.totalPages} ({paginacao.total} registro{paginacao.total !== 1 ? "s" : ""})
            </span>
            <button className="disc-page-btn" disabled={page >= paginacao.totalPages} onClick={() => setPage(page + 1)}>
              Próxima →
            </button>
          </div>
        )}
        {!loading && registros.length > 0 && paginacao.totalPages <= 1 && (
          <div style={{ textAlign: "center", padding: "12px 0", color: "#64748b", fontSize: "0.75rem" }}>
            {paginacao.total} registro{paginacao.total !== 1 ? "s" : ""} encontrado{paginacao.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </>
  );
}
