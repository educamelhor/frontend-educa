// ============================================================================
// HistoricoDisciplinar.jsx — Histórico de Ocorrências Disciplinares
// Design premium inspirado pela Busca Ativa (green → dark disciplinary orange)
// KPI Cards + Filtros + Lista paginada + Redirecionamento para Relatório
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";
import ModalRelatorioDisciplinar from "../../alunos/ModalRelatorioDisciplinar";
import ModalRelatorioSemestral from "./ModalRelatorioSemestral";
import api from "../../../services/api";

// ── Helpers ─────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return "—";
  // Extrai YYYY-MM-DD diretamente da string (funciona para "2026-05-03" e "2026-05-03T00:00:00.000Z").
  // Evita o bug clássico UTC-3: new Date("2026-05-03") → UTC midnight → 02/05 no fuso BR.
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
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
  // Modal ModalTACE state

  // State
  const [registros, setRegistros] = useState([]);
  const [kpis, setKpis] = useState({});
  const [paginacao, setPaginacao] = useState({ total: 0, page: 1, limit: 30, totalPages: 0 });
  const [turmasLista, setTurmasLista] = useState([]);
  const [turnosLista, setTurnosLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaCodigo, setFichaCodigo] = useState(null);
  const [semestralOpen, setSemestralOpen] = useState(false); // ⭐ Relatório Semestral
  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("");
  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroMedida, setFiltroMedida] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroMilitar, setFiltroMilitar] = useState("");
  const [militares, setMilitares] = useState([]);
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // ── Fetch Turmas & Militares ───────────────────────────────────────────
  useEffect(() => {
    const ANO_LETIVO = String(new Date().getFullYear());
    api.get("/api/turmas")
      .then((r) => {
        const data = (r.data || []).filter((t) => String(t.ano) === ANO_LETIVO);
        const turnos = [...new Set(data.map((t) => t.turno).filter(Boolean))];
        setTurmasLista(data);
        setTurnosLista(turnos);
      })
      .catch(() => {});

    api.get("/registros-ocorrencias/militares")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.militares || []);
        setMilitares(data);
      })
      .catch((err) => {
        console.error("Erro ao carregar militares:", err);
      });
  }, []);

  // ── Fetch Histórico ───────────────────────────────────────────────────
  const fetchHistorico = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 30);
      if (filtroStatus) params.append("status", filtroStatus);
      if (filtroTurma) params.append("turma_id", filtroTurma);
      if (filtroTurno) params.append("turno", filtroTurno);
      if (filtroAluno) params.append("aluno_nome", filtroAluno);
      if (filtroMedida) params.append("medida_disciplinar", filtroMedida);
      if (filtroResponsavel) params.append("convocar_responsavel", "1");
        if (filtroMilitar) params.append("militar_id", filtroMilitar);
      if (filtroDataInicio) params.append("data_inicio", filtroDataInicio);
      if (filtroDataFim) params.append("data_fim", filtroDataFim);

      // Nota: api.js já adiciona /api na base URL, não duplicar o prefixo
      const resp = await api.get(`/registros-ocorrencias/historico?${params.toString()}`);
      setRegistros(resp.data.registros || []);
      setKpis(resp.data.kpis || {});
      setPaginacao(resp.data.paginacao || {});
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || String(err);
      const status = err?.response?.status || "";
      setApiError(`[${status}] ${msg}`);
      console.error("Erro ao buscar histórico:", err);
    }
    setLoading(false);
  }, [page, filtroStatus, filtroTurma, filtroTurno, filtroAluno, filtroMedida, filtroResponsavel, filtroMilitar, filtroDataInicio, filtroDataFim]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filtroStatus, filtroTurma, filtroTurno, filtroAluno, filtroMedida, filtroResponsavel, filtroMilitar, filtroDataInicio, filtroDataFim]);

  const limparFiltros = () => {
    setFiltroStatus(""); setFiltroTurma(""); setFiltroTurno(""); setFiltroAluno("");
    setFiltroMedida(""); setFiltroResponsavel(""); setFiltroMilitar(""); setFiltroDataInicio(""); setFiltroDataFim("");
    setPage(1);
  };

  const temFiltrosAtivos = filtroStatus || filtroTurma || filtroTurno || filtroAluno || filtroMedida || filtroResponsavel || filtroMilitar || filtroDataInicio || filtroDataFim;

  // Abrir ModalRelatorioDisciplinar com dados do aluno montados do registro
  const abrirRelatorio = (registro) => {
    setFichaCodigo({ id: registro.aluno_id, codigo: registro.aluno_codigo, estudante: registro.aluno_nome, turma: registro.turma_nome, turno: registro.turma_turno, foto: null });
    setFichaOpen(true);
  };

  // ── KPI Cards ─────────────────────────────────────────────────────────
  const kpiCards = [
    { label: "Total Registros",       value: kpis.total || 0,                    gradient: "linear-gradient(135deg,#6366f1,#818cf8)", icon: "📊", shadow: "rgba(99,102,241,0.30)" },
    { label: "Registradas",            value: kpis.registradas || 0,              gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)", icon: "📝", shadow: "rgba(245,158,11,0.30)" },
    { label: "Finalizadas",            value: kpis.finalizadas || 0,              gradient: "linear-gradient(135deg,#10b981,#34d399)", icon: "✅", shadow: "rgba(16,185,129,0.30)" },
    { label: "Aguardando Responsável", value: kpis.aguardando_responsavel || 0,   gradient: "linear-gradient(135deg,#ef4444,#f87171)", icon: "⏳", shadow: "rgba(239,68,68,0.30)" },
  ];

  return (
    <>
      <style>{`
        /* ── Base ─────────────────────────────────────────────────────── */
        .disc-hist {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          min-height: 100vh; padding: 24px; background: transparent;
        }

        /* ── Header ───────────────────────────────────────────────────── */
        .disc-hist-header {
          display: flex; align-items: center; gap: 16px; margin-bottom: 28px; flex-wrap: wrap;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 18px; padding: 22px 28px;
          box-shadow: 0 4px 24px rgba(30,41,59,0.18);
        }
        .disc-hist-header-icon {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          font-size: 1.6rem; flex-shrink: 0;
          box-shadow: 0 6px 20px rgba(245,158,11,0.40);
        }
        .disc-hist-header h2 {
          font-size: 1.5rem; font-weight: 800; color: #f8fafc;
          margin: 0; letter-spacing: -0.5px;
        }
        .disc-hist-header p { font-size: 0.83rem; color: #94a3b8; margin: 3px 0 0; }

        /* ── KPI Cards ─────────────────────────────────────────────────── */
        .disc-kpi-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 16px; margin-bottom: 28px;
        }
        .disc-kpi-card {
          border-radius: 16px; padding: 20px 22px;
          display: flex; align-items: center; gap: 16px;
          transition: transform 0.25s, box-shadow 0.25s; cursor: pointer;
          position: relative; overflow: hidden; color: #fff;
        }
        .disc-kpi-card::after {
          content: ''; position: absolute; right: -18px; top: -18px;
          width: 80px; height: 80px; border-radius: 50%;
          background: rgba(255,255,255,0.10);
        }
        .disc-kpi-card:hover { transform: translateY(-3px); }
        .disc-kpi-card.active { outline: 3px solid rgba(255,255,255,0.5); }
        .disc-kpi-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; flex-shrink: 0;
          background: rgba(255,255,255,0.18);
        }
        .disc-kpi-value { font-size: 1.9rem; font-weight: 900; line-height: 1; color: #fff; }
        .disc-kpi-label {
          font-size: 0.70rem; color: rgba(255,255,255,0.85); margin-top: 3px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
        }

        /* ── Filter Bar ────────────────────────────────────────────────── */
        .disc-filter-bar {
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 16px; padding: 18px 22px; margin-bottom: 22px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .disc-filter-toggle { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
        .disc-filter-toggle h3 {
          font-size: 0.90rem; font-weight: 700; color: #1e293b;
          margin: 0; display: flex; align-items: center; gap: 8px;
        }
        .disc-filter-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;
          margin-top: 18px; animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .disc-filter-group label {
          font-size: 0.70rem; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; display: block;
        }
        .disc-filter-group select, .disc-filter-group input {
          width: 100%; padding: 9px 12px; border-radius: 9px;
          border: 1.5px solid #e2e8f0; background: #f8fafc;
          color: #1e293b; font-size: 0.83rem; outline: none; transition: border-color 0.2s;
        }
        .disc-filter-group select:focus, .disc-filter-group input:focus { border-color: #f59e0b; background: #fff; }
        .disc-filter-actions { display: flex; gap: 10px; margin-top: 14px; align-items: center; }
        .disc-btn-clear {
          padding: 7px 18px; border-radius: 9px;
          border: 1.5px solid #fca5a5; background: #fff1f1; color: #dc2626;
          font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .disc-btn-clear:hover { background: #fee2e2; }
        .disc-active-count {
          font-size: 0.72rem; padding: 3px 11px; border-radius: 20px;
          background: #fef3c7; color: #d97706; font-weight: 700; border: 1px solid #fde68a;
        }

        /* ── Student Cards ─────────────────────────────────────────────── */
        .disc-list { display: flex; flex-direction: column; gap: 12px; }
        .disc-card {
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 16px; padding: 18px 22px;
          display: flex; gap: 16px; align-items: flex-start;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
          cursor: pointer; position: relative; overflow: hidden;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        .disc-card:hover {
          border-color: #f59e0b; transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(245,158,11,0.14);
        }
        .disc-card-avatar {
          width: 46px; height: 46px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.80rem; font-weight: 800; flex-shrink: 0; color: #fff;
          letter-spacing: 0.5px;
        }
        .disc-card-body { flex: 1; min-width: 0; }
        .disc-card-name { font-size: 0.94rem; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
        .disc-card-turma { font-size: 0.73rem; color: #64748b; font-weight: 500; }
        .disc-card-desc { font-size: 0.80rem; color: #334155; margin-top: 7px; line-height: 1.5; }
        .disc-card-meta { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; align-items: center; }
        .disc-tag {
          font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
          padding: 3px 9px; border-radius: 7px; letter-spacing: 0.3px; white-space: nowrap;
        }
        .disc-card-date {
          font-size: 0.73rem; color: #64748b; font-weight: 600;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .disc-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
        .disc-card-pts { font-size: 1.05rem; font-weight: 900; display: flex; align-items: center; gap: 4px; }
        .disc-card-action {
          font-size: 0.70rem; padding: 5px 14px; border-radius: 8px;
          border: 1.5px solid #f59e0b; background: #fffbeb;
          color: #b45309; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .disc-card-action:hover { background: #fef3c7; border-color: #d97706; }

        /* ── Pagination ────────────────────────────────────────────────── */
        .disc-pagination {
          display: flex; justify-content: center; align-items: center;
          gap: 8px; margin-top: 24px; padding: 16px 0;
        }
        .disc-page-btn {
          padding: 7px 18px; border-radius: 9px;
          border: 1.5px solid #e2e8f0; background: #fff;
          color: #334155; font-size: 0.80rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .disc-page-btn:hover { border-color: #f59e0b; color: #b45309; background: #fffbeb; }
        .disc-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .disc-page-info { font-size: 0.80rem; color: #64748b; font-weight: 600; }

        /* ── Empty / Loading ───────────────────────────────────────────── */
        .disc-empty { text-align: center; padding: 60px 20px; }
        .disc-empty-icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.5; }
        .disc-empty-title { font-size: 1.1rem; font-weight: 700; color: #475569; margin-bottom: 4px; }
        .disc-loading { display: flex; justify-content: center; padding: 60px; }
        .disc-spinner {
          width: 38px; height: 38px; border: 3px solid #fed7aa;
          border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Badges ────────────────────────────────────────────────────── */
        .disc-resp-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.66rem; padding: 3px 9px; border-radius: 7px; font-weight: 700;
        }
        .disc-resp-aguardando { background: #fff1f1; color: #dc2626; border: 1px solid #fca5a5; }
        .disc-resp-compareceu { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
      `}</style>

      <div className="disc-hist">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="disc-hist-header">
          <div className="disc-hist-header-icon">📋</div>
          <div style={{ flex: 1 }}>
            <h2>Histórico Disciplinar</h2>
            <p>Registro completo de todas as ocorrências disciplinares da escola</p>
          </div>
          {/* ⭐ Botão Relatório Semestral (Art. 23/52) */}
          <button
            onClick={() => setSemestralOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              color: "#fff", fontWeight: 700, fontSize: 13,
              cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            title="Relatório Semestral Quantitativo (Arts. 23/52)"
          >
            <span style={{ fontSize: 16 }}>📊</span>
            Relatório Semestral
          </button>
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
                style={{ background: k.gradient, boxShadow: `0 6px 24px ${k.shadow}` }}
                onClick={() => {
                  if (i === 1) setFiltroStatus(filtroStatus === "REGISTRADA" ? "" : "REGISTRADA");
                  else if (i === 2) setFiltroStatus(filtroStatus === "FINALIZADA" ? "" : "FINALIZADA");
                  else if (i === 3) setFiltroResponsavel(filtroResponsavel === "1" ? "" : "1");
                  else { limparFiltros(); }
                }}
              >
                <div className="disc-kpi-icon">{k.icon}</div>
                <div>
                  <div className="disc-kpi-value">{k.value}</div>
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
                  {[filtroStatus, filtroTurma, filtroTurno, filtroAluno, filtroMedida, filtroResponsavel, filtroMilitar, filtroDataInicio, filtroDataFim].filter(Boolean).length} ativo(s)
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
                  <label>Turno</label>
                  <select value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)}>
                    <option value="">Todos os turnos</option>
                    {turnosLista.length > 0
                      ? turnosLista.map((t) => <option key={t} value={t}>{t}</option>)
                      : ["Matutino", "Vespertino", "Integral", "Noturno"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))
                    }
                  </select>
                </div>
                <div className="disc-filter-group">
                  <label>Turma</label>
                  <select value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}>
                    <option value="">Todas as turmas</option>
                    {(filtroTurno
                      ? turmasLista.filter((t) => t.turno === filtroTurno)
                      : turmasLista
                    ).map((t) => (
                      <option key={t.id} value={t.id}>{t.turma || t.nome || `Turma ${t.id}`}</option>
                    ))}
                  </select>
                </div>
                <div className="disc-filter-group">
                    <label>Medida Disciplinar</label>
                    <select value={filtroMedida} onChange={(e) => setFiltroMedida(e.target.value)}>
                      <option value="">Todas as medidas</option>
                      <option value="Ações Educativas">Ações Educativas</option>
                      <option value="Advertência Escrita">Advertência Escrita</option>
                      <option value="Advertência Oral">Advertência Oral</option>
                      <option value="Ajuste">Ajuste</option>
                      <option value="Bônus de Média Bimestral">Bônus de Média Bimestral</option>
                      <option value="Elogio">Elogio</option>
                      <option value="Suspensão">Suspensão</option>
                      <option value="Transferência">Transferência</option>
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
                    <label>Militar Responsável</label>
                    <select value={filtroMilitar} onChange={(e) => setFiltroMilitar(e.target.value)}>
                      <option value="">Todos</option>
                      {militares.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
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
        ) : apiError ? (
          <div className="disc-empty">
            <div className="disc-empty-icon">⚠️</div>
            <div className="disc-empty-title">Erro ao carregar registros</div>
            <p style={{ fontSize: "0.78rem", color: "#f87171", marginTop: 8, wordBreak: "break-all" }}>{apiError}</p>
            <button className="disc-btn-clear" style={{ marginTop: 12 }} onClick={fetchHistorico}>↻ Tentar novamente</button>
          </div>
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
                  onClick={() => abrirRelatorio(r)}
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
                      onClick={(e) => { e.stopPropagation(); abrirRelatorio(r); }}
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
        {/* ModalRelatorioDisciplinar - Relatorio Disciplinar inline */}
        <ModalRelatorioDisciplinar
          open={fichaOpen}
          onClose={() => { setFichaOpen(false); setFichaCodigo(null); }}
          aluno={fichaCodigo}
        />
      </div>

      {/* ⭐ Modal Relatório Semestral — Arts. 23/52 */}
      <ModalRelatorioSemestral
        open={semestralOpen}
        onClose={() => setSemestralOpen(false)}
      />
      </>
    );
}
