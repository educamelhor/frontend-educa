// src/features/secretaria/horarios/GerarHorarioPage.jsx
// ============================================================
// Tela de Geração de Horários — aba ⚡ Gerar Horário (Solver 2.0)
// Fluxo:
//   1) Carrega turmas do turno selecionado
//   2) POST /api/grade/solver-payload → busca dados consolidados (< 200ms)
//   3) Executa Motor Solver 2.0 em Web Worker no navegador (Kempe Chains + Tabu Search)
//      com telemetria em tempo real e botão "Parar e Usar Melhor Grade"
//   4) Exibe grade por Turma / por Professor (destacando aulas fixas 📌 do Horário Manual)
//   5) POST /api/grade/rascunho → salva rascunho preservando aulas fixas
//   6) POST /api/grade/publicar → promove a publicado
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api";
import GradeTurma from "./GradeTurma.jsx";
import GradeProfessor from "./GradeProfessor.jsx";
import { runSolverInWebWorker } from "./solverEngine.js";

const ESTRATEGIA_LABELS = {
  dsatur_slack: "DSATUR (Folga Mínima)",
  group_turma: "Agrupamento Germinado",
  scarce_first: "Professores Críticos",
  weight_desc: "Maior Carga Semanal",
  reverse_weight: "Inversão de Blocos",
  random: "Perturbação Monte Carlo",
  default: "Heurística Padrão",
};

// ── Normaliza resultado do solver (aceita vários formatos) ────
function normalizeResultado(raw) {
  if (!raw || typeof raw !== "object") return {};
  const src = raw.data || raw.resultado || raw.result || raw;
  return {
    grade_por_turma:     src.grade_por_turma     || src.gradePorTurma     || {},
    grade_por_professor: src.grade_por_professor || src.gradePorProfessor || {},
    metrics:             src.metrics             || src.metricas          || {},
    diagnostico:         src.diagnostico         || {},
    nao_alocadas:        src.nao_alocadas        || [],
    payload_summary:     src.payload_summary     || {},
    warnings_payload:    src.warnings_payload    || [],
    solver_telemetry:    src.solver_telemetry    || null,
    traceId:             src.traceId             || raw.traceId           || null,
  };
}

// ── Medidor de cobertura ───────────────────────────────────────
function CoberturaGauge({ cobertura }) {
  const rawValue = Number(cobertura) || 0;
  const pct = rawValue >= 100 ? 100 : Math.floor(rawValue * 10) / 10;

  const cor = pct >= 98 ? "#16a34a" : pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";
  const R = 42, circ = 2 * Math.PI * R;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={104} height={104} viewBox="0 0 104 104">
        <circle cx={52} cy={52} r={R} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle
          cx={52}
          cy={52}
          r={R}
          fill="none"
          stroke={cor}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 52 52)"
          style={{ transition: "stroke-dasharray 0.35s ease" }}
        />
        <text x={52} y={56} textAnchor="middle" fontSize={18} fontWeight={800} fill={cor}>
          {pct}%
        </text>
      </svg>
      <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "#64748b" }}>Cobertura</p>
    </div>
  );
}

// ── Card de métrica ────────────────────────────────────────────
function MetricCard({ label, value, sub, icon, color = "#1e3a5f" }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
      padding: "12px 16px", textAlign: "center", flex: 1, minWidth: 105,
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color }}>{value ?? "—"}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Converte grade { [dia]: { [ordem]: cell } } → periodosPorDia ──
function buildPeriodosPorDia(grade) {
  if (!grade || typeof grade !== "object") return {};
  const out = {};
  for (const [diaStr, porOrdem] of Object.entries(grade)) {
    const dia = Number(diaStr);
    out[dia] = Object.keys(porOrdem || {})
      .map(Number)
      .sort((a, b) => a - b)
      .map(ordem => ({ ordem }));
  }
  return out;
}

// ── Componente principal ───────────────────────────────────────
export default function GerarHorarioPage({ config }) {
  const turnos = config?.turnos || ["matutino", "vespertino"];
  const [turno, setTurno] = useState(turnos[0] || "matutino");
  const [turmas, setTurmas] = useState([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);

  // Opções do Motor Solver 2.0
  const [respeitarHorarioManual, setRespeitarHorarioManual] = useState(true);
  const [tempoMaximoMs, setTempoMaximoMs] = useState(15000);

  // Estado do solver e telemetria Web Worker
  const [rodando, setRodando] = useState(false);
  const [progressoSolver, setProgressoSolver] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erroSolver, setErroSolver] = useState(null);
  const stopWorkerRef = useRef(null);

  // Nomes para lookup
  const [nomesDisciplinas, setNomesDisciplinas] = useState({});
  const [nomesProfessores, setNomesProfessores] = useState({});
  const [nomesTurmas, setNomesTurmas] = useState({});

  // Exibição
  const [viewMode, setViewMode] = useState("turma"); // "turma" | "professor"
  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [msgAcao, setMsgAcao] = useState("");
  const [showModalPublicar, setShowModalPublicar] = useState(false);

  // Cleanup do Worker ao desmontar
  useEffect(() => {
    return () => {
      if (stopWorkerRef.current) {
        try { stopWorkerRef.current(); } catch {}
      }
    };
  }, []);

  // ── Carrega turmas do turno ──────────────────────────────────
  const carregarTurmas = useCallback(async () => {
    setCarregandoTurmas(true);
    try {
      const hoje = new Date();
      const anoAtual = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
      const { data } = await api.get("/api/turmas", { params: { turno, ano: anoAtual } });
      const lista = Array.isArray(data) ? data : (Array.isArray(data?.turmas) ? data.turmas : []);
      setTurmas(lista);
      const map = {};
      for (const t of lista) {
        map[t.id] = t.turma || t.nome || String(t.id);
      }
      setNomesTurmas(map);
    } catch {
      setTurmas([]);
    } finally {
      setCarregandoTurmas(false);
    }
  }, [turno]);

  // ── Carrega nomes de disciplinas e professores ───────────────
  const carregarNomes = useCallback(async () => {
    try {
      const [rDisc, rProf] = await Promise.all([
        api.get("/api/disciplinas"),
        api.get("/api/professores", { params: { turno } }),
      ]);
      const disc = Array.isArray(rDisc.data) ? rDisc.data : [];
      const prof = Array.isArray(rProf.data) ? rProf.data : [];
      const dMap = {}, pMap = {};
      for (const d of disc) dMap[d.id] = d.nome || `Disc ${d.id}`;
      for (const p of prof) pMap[p.id] = p.nome || `Prof ${p.id}`;
      setNomesDisciplinas(dMap);
      setNomesProfessores(pMap);
    } catch { /* silencioso */ }
  }, [turno]);

  useEffect(() => {
    setResultado(null);
    setErroSolver(null);
    carregarTurmas();
    carregarNomes();
  }, [carregarTurmas, carregarNomes]);

  // ── Parar Solver antecipadamente e usar a melhor grade ────────
  function pararSolverAgora() {
    if (stopWorkerRef.current) {
      stopWorkerRef.current();
    }
  }

  // ── Executar Solver 2.0 via Web Worker ───────────────────────
  async function executarSolver() {
    if (!turmas.length) return;
    setRodando(true);
    setErroSolver(null);
    setResultado(null);
    setMsgAcao("");
    setProgressoSolver({
      iter: 0,
      elapsedMs: 0,
      maxTimeMs: tempoMaximoMs,
      strategy: "dsatur_slack",
      alocadas: 0,
      demanda: 0,
      fixas: 0,
      cobertura: 0,
    });

    const ids = turmas.map(t => t.id);

    try {
      // 1) Busca o payload enriquecido do backend (< 200ms)
      let payloadData = null;
      try {
        const { data } = await api.post("/api/grade/solver-payload", {
          turno: turno.toLowerCase(),
          turma_ids: ids,
          respeitar_horario_manual: respeitarHorarioManual,
        });
        if (data?.ok && data?.payload) {
          payloadData = data;
        }
      } catch (errPayload) {
        console.warn("[Solver 2.0] Fallback para /api/grade/run-mock:", errPayload?.message);
      }

      // 2) Se obteve o payload, roda no Web Worker no navegador sem limite de timeout HTTP
      if (payloadData?.payload) {
        const { promise, stop } = runSolverInWebWorker({
          payload: payloadData.payload,
          maxTimeMs: tempoMaximoMs,
          onProgress: (prog) => {
            setProgressoSolver(prog);
          },
        });
        stopWorkerRef.current = stop;

        const workerResult = await promise;
        stopWorkerRef.current = null;

        setResultado(
          normalizeResultado({
            ...workerResult,
            warnings_payload: payloadData.warnings_payload || [],
            payload_summary: payloadData.payload_summary || {},
          })
        );
      } else {
        // Fallback: executa no servidor
        const { data } = await api.post("/api/grade/run-mock", {
          turno: turno.toLowerCase(),
          turma_ids: ids,
          respeitar_horario_manual: respeitarHorarioManual,
        });
        setResultado(normalizeResultado(data));
      }
    } catch (e) {
      setErroSolver(e?.response?.data?.error || e?.message || "Erro ao executar o solver. Tente novamente.");
    } finally {
      stopWorkerRef.current = null;
      setRodando(false);
    }
  }

  // ── Salvar rascunho ──────────────────────────────────────────
  async function salvarRascunho() {
    if (!resultado) return;
    setSalvando(true);
    setMsgAcao("");
    try {
      const slots = [];
      const gpt = resultado.grade_por_turma || {};
      for (const [turmaId, porDia] of Object.entries(gpt)) {
        for (const [dia, porOrdem] of Object.entries(porDia || {})) {
          for (const [ordem, cell] of Object.entries(porOrdem || {})) {
            if (cell && cell.professor_id) {
              slots.push({
                turma_id:      Number(turmaId),
                dia:           Number(dia),
                ordem:         Number(ordem),
                dia_semana:    Number(dia),
                periodo_ordem: Number(ordem),
                professor_id:  Number(cell.professor_id),
                disciplina_id: Number(cell.disciplina_id),
                locked:        Boolean(cell.locked),
                origem:        cell.locked ? "manual" : "solver",
              });
            }
          }
        }
      }
      await api.post("/api/grade/rascunho", {
        turno: turno.toLowerCase(),
        turma_ids: turmas.map(t => t.id),
        slots,
      });
      setMsgAcao("✅ Rascunho salvo com sucesso!");
    } catch (e) {
      setMsgAcao(`⚠️ Erro ao salvar rascunho: ${e?.response?.data?.error || "tente novamente"}`);
    } finally {
      setSalvando(false);
      setTimeout(() => setMsgAcao(""), 4000);
    }
  }

  // ── Publicar grade ───────────────────────────────────────────
  function publicarGrade() {
    setShowModalPublicar(true);
  }

  async function executarPublicacao() {
    setShowModalPublicar(false);
    setPublicando(true);
    setMsgAcao("");
    try {
      await api.post("/api/grade/publicar", {
        turno: turno.toLowerCase(),
        descricao: `Grade ${turno} — gerada em ${new Date().toLocaleDateString("pt-BR")}`,
      });
      setMsgAcao("🎉 Grade publicada com sucesso!");
    } catch (e) {
      setMsgAcao(`⚠️ ${e?.response?.data?.error || "Erro ao publicar. Salve o rascunho primeiro."}`);
    } finally {
      setPublicando(false);
      setTimeout(() => setMsgAcao(""), 5000);
    }
  }

  // ── Métricas extraídas ───────────────────────────────────────
  const metrics = resultado?.metrics || {};
  const diag = resultado?.diagnostico || {};
  const naoAlocLista =
    diag.nao_alocadas_detalhado ||
    diag.nao_alocadas ||
    resultado?.nao_alocadas ||
    [];
  const naoAloc = metrics.aulas_nao_alocadas ?? naoAlocLista.length;
  const coberturaVal = metrics.cobertura_percentual ?? metrics.cobertura ?? 0;
  const aulasFixas = metrics.aulas_fixas_manuais ?? resultado?.payload_summary?.slots_fixos_count ?? 0;
  const telemetry = resultado?.solver_telemetry || null;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Montserrat', sans-serif",
      display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
      overflowY: "auto",
    }}>
      {/* ── Barra superior ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid #e2e8f0",
        background: "#fff", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e3a5f" }}>
              Gerar Horário
            </h2>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
              Motor Solver 2.0 (Kempe Chains + Tabu Ejection)
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Checkbox: Respeitar Horário Manual */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${respeitarHorarioManual ? "#bfdbfe" : "#e2e8f0"}`,
              background: respeitarHorarioManual ? "#eff6ff" : "#f8fafc",
              color: respeitarHorarioManual ? "#1e40af" : "#64748b",
              fontSize: 12,
              fontWeight: 600,
              cursor: rodando ? "not-allowed" : "pointer",
              userSelect: "none",
            }}
            title="Mantém intactas as aulas cadastradas na aba ✍️ Horário Manual e gera apenas as aulas restantes"
          >
            <input
              type="checkbox"
              checked={respeitarHorarioManual}
              disabled={rodando}
              onChange={(e) => setRespeitarHorarioManual(e.target.checked)}
              style={{ accentColor: "#2563eb", cursor: "pointer" }}
            />
            📌 Respeitar Horário Manual
          </label>

          {/* Seletor de Tempo Limite do Motor */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>⏱️ Busca:</span>
            <select
              value={tempoMaximoMs}
              disabled={rodando}
              onChange={(e) => setTempoMaximoMs(Number(e.target.value))}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#1e293b",
                fontSize: 12,
                fontWeight: 600,
                cursor: rodando ? "not-allowed" : "pointer",
              }}
            >
              <option value={15000}>15s (Rápido)</option>
              <option value={30000}>30s (Profundo)</option>
              <option value={60000}>60s (Exaustivo / Urânia)</option>
            </select>
          </div>

          {/* Seletor de turno */}
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            {turnos.map(t => (
              <button
                key={t}
                disabled={rodando}
                onClick={() => setTurno(t)}
                style={{
                  padding: "8px 16px", border: "none", cursor: rodando ? "not-allowed" : "pointer",
                  background: turno === t ? "#2563eb" : "#fff",
                  color:      turno === t ? "#fff"    : "#64748b",
                  fontWeight: 700, fontSize: 12, textTransform: "uppercase",
                  letterSpacing: 0.5, transition: "all 0.18s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Botão principal: Gerar */}
          <button
            onClick={executarSolver}
            disabled={rodando || carregandoTurmas || turmas.length === 0}
            style={{
              padding: "9px 22px", borderRadius: 8, border: "none",
              background: rodando ? "#93c5fd" : "#2563eb",
              color: "#fff", fontWeight: 700, fontSize: 13,
              cursor: (rodando || turmas.length === 0) ? "not-allowed" : "pointer",
              transition: "all 0.18s",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {rodando ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚙️</span>
                Gerando…
              </>
            ) : "⚡ Gerar Horário"}
          </button>

          {/* Ações pós-geração */}
          {resultado && !rodando && (
            <>
              <button onClick={salvarRascunho} disabled={salvando || publicando} style={{
                padding: "9px 18px", borderRadius: 8,
                border: "1px solid #0284c7", background: "#f0f9ff",
                color: "#0284c7", fontWeight: 700, fontSize: 13,
                cursor: "pointer", transition: "all 0.18s",
              }}>
                {salvando ? "Salvando…" : "📋 Salvar Rascunho"}
              </button>
              <button onClick={publicarGrade} disabled={salvando || publicando} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: "pointer", transition: "all 0.18s",
              }}>
                {publicando ? "Publicando…" : "🌐 Publicar Grade"}
              </button>
            </>
          )}
        </div>

        {msgAcao && (
          <div style={{
            width: "100%", textAlign: "center", fontSize: 13, fontWeight: 600,
            color: msgAcao.startsWith("✅") || msgAcao.startsWith("🎉") ? "#15803d" : "#b45309",
          }}>
            {msgAcao}
          </div>
        )}
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, padding: "24px 24px 40px", overflowY: "auto" }}>

        {/* Estado inicial */}
        {!resultado && !rodando && !erroSolver && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            minHeight: 340, textAlign: "center", color: "#94a3b8",
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>⚡</div>
            <h3 style={{ color: "#1e3a5f", fontSize: 22, marginBottom: 8, fontWeight: 700 }}>
              Motor de Geração de Horários 2.0
            </h3>
            <p style={{ color: "#64748b", fontSize: 14, maxWidth: 480, lineHeight: 1.6 }}>
              {carregandoTurmas
                ? "Carregando turmas…"
                : turmas.length === 0
                  ? "Nenhuma turma encontrada para o turno selecionado."
                  : `${turmas.length} turmas prontas para o turno ${turno}. O motor utiliza Cadeias de Kempe multi-turma e Busca Tabu em segundo plano, respeitando disponibilidades e horários manuais fixos.`}
            </p>
            {turmas.length > 0 && (
              <button onClick={executarSolver} style={{
                marginTop: 24, padding: "12px 32px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
                boxShadow: "0 4px 15px rgba(37,99,235,0.4)",
              }}>
                ⚡ Gerar Horário — {turno}
              </button>
            )}
          </div>
        )}

        {/* Painel de Telemetria em Tempo Real (Web Worker) */}
        {rodando && (
          <div style={{
            maxWidth: 640,
            margin: "24px auto",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: 16,
            padding: "28px 32px",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
            textAlign: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
              <CoberturaGauge cobertura={progressoSolver?.cobertura || 0} />

              <div style={{ textAlign: "left", flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                    background: "#2563eb", animation: "pulseDot 1s ease-in-out infinite",
                  }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#1e3a5f" }}>
                    Otimizando Grade Horária…
                  </span>
                </div>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
                  Executando em Web Worker dedicado (para automaticamente ao atingir 100%).
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Melhor Alocação</span>
                    <strong style={{ color: "#0f172a", fontSize: 14 }}>
                      {progressoSolver?.alocadas || 0} / {progressoSolver?.demanda || "—"} aulas
                    </strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Iterações</span>
                    <strong style={{ color: "#2563eb", fontSize: 14 }}>
                      {progressoSolver?.iter || 0} ciclos
                    </strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Estratégia Ativa</span>
                    <strong style={{ color: "#334155", fontSize: 11 }}>
                      {ESTRATEGIA_LABELS[progressoSolver?.strategy] || "DSATUR"}
                    </strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block", fontSize: 10 }}>Tempo Decorrido</span>
                    <strong style={{ color: "#334155", fontSize: 13 }}>
                      {((progressoSolver?.elapsedMs || 0) / 1000).toFixed(1)}s / {(tempoMaximoMs / 1000).toFixed(0)}s
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de progresso temporal */}
            <div style={{
              width: "100%", height: 8, background: "#e2e8f0", borderRadius: 999,
              overflow: "hidden", marginBottom: 20,
            }}>
              <div style={{
                width: `${Math.min(100, Math.round(((progressoSolver?.elapsedMs || 0) / tempoMaximoMs) * 100))}%`,
                height: "100%",
                background: "linear-gradient(90deg, #2563eb, #0ea5e9)",
                transition: "width 0.2s linear",
              }} />
            </div>

            {progressoSolver?.iter > 0 && (
              <button
                onClick={pararSolverAgora}
                style={{
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "1px solid #f59e0b",
                  background: "#fffbeb",
                  color: "#b45309",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                ⏹️ Parar Agora e Usar Melhor Grade ({progressoSolver?.cobertura || 0}%)
              </button>
            )}
          </div>
        )}

        {/* Erro do solver */}
        {erroSolver && (
          <div style={{
            background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12,
            padding: 20, textAlign: "center", color: "#b91c1c", fontWeight: 600,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
            <p style={{ margin: "0 0 12px" }}>{erroSolver}</p>
            <button onClick={executarSolver} style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: "#ef4444", color: "#fff", fontWeight: 600, cursor: "pointer",
            }}>
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Resultado */}
        {resultado && !rodando && (
          <>
            {/* ── Métricas ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 20,
              marginBottom: 24, flexWrap: "wrap",
            }}>
              <CoberturaGauge cobertura={coberturaVal} />
              <div style={{ display: "flex", gap: 12, flex: 1, flexWrap: "wrap" }}>
                <MetricCard
                  label="Aulas Alocadas"
                  value={metrics.aulas_alocadas}
                  sub={telemetry ? `em ${telemetry.iteracoes} iteração(ões) (${(telemetry.tempo_ms / 1000).toFixed(1)}s)` : null}
                  icon="✅"
                  color="#16a34a"
                />
                <MetricCard
                  label="Demanda Total"
                  value={metrics.aulas_demanda}
                  icon="📚"
                  color="#1e3a5f"
                />
                {aulasFixas > 0 && (
                  <MetricCard
                    label="Fixas (Manual)"
                    value={aulasFixas}
                    sub="Preservadas 📌"
                    icon="📌"
                    color="#2563eb"
                  />
                )}
                <MetricCard
                  label="Não Alocadas"
                  value={naoAloc}
                  icon={naoAloc > 0 ? "⚠️" : "🎉"}
                  color={naoAloc > 0 ? "#b45309" : "#16a34a"}
                />
                <MetricCard
                  label="Turmas"
                  value={resultado.payload_summary?.turmas}
                  icon="🏫"
                  color="#1e3a5f"
                />
                <MetricCard
                  label="Professores"
                  value={resultado.payload_summary?.professores}
                  icon="👨‍🏫"
                  color="#1e3a5f"
                />
              </div>
            </div>

            {/* ── Alertas de não-alocadas ── */}
            {naoAloc > 0 && (
              <div style={{
                background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10,
                padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#92400e",
              }}>
                <strong style={{ display: "block", marginBottom: 8 }}>⚠️ {naoAloc} aula(s) não alocada(s)</strong>
                <ul style={{ margin: 0, paddingLeft: 20, listStyleType: "disc" }}>
                  {naoAlocLista.slice(0, 12).map((na, i) => (
                    <li key={i}>
                      {String(nomesTurmas[na.turma_id] || na.turma_id).toUpperCase().includes("TURMA") ? "" : "Turma "}
                      {nomesTurmas[na.turma_id] || na.turma_id} — {nomesDisciplinas[na.disciplina_id] || na.disciplina_id} ({nomesProfessores[na.professor_id] || na.professor_id})
                      {na.motivo && <strong style={{ color: "#b71c1c", marginLeft: 6 }}>({na.motivo})</strong>}
                    </li>
                  ))}
                  {naoAlocLista.length > 12 && (
                    <li>... e mais {naoAlocLista.length - 12} aulas</li>
                  )}
                </ul>
              </div>
            )}

            {/* ── Alerta de sobrecarga de professor ── */}
            {(resultado.warnings_payload || []).length > 0 && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
                padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#7f1d1d",
              }}>
                <strong style={{ display: "block", marginBottom: 8 }}>
                  🔴 {resultado.warnings_payload.length} professor(es) com carga igual ou quase no limite de slots
                </strong>
                <p style={{ margin: "0 0 6px", fontSize: 12, color: "#991b1b" }}>
                  Professores abaixo estão modulados com carga total (ex: 30/30) ou muito próxima do limite.
                  Isso restringe drasticamente as opções do algoritmo e pode gerar colisões se houver indisponibilidades.
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, listStyleType: "disc" }}>
                  {(resultado.warnings_payload || []).map((w, i) => (
                    <li key={i}>
                      <strong>{w.professor_nome}</strong>: {w.aulas_demanda} aulas / {w.slots_disponiveis} slots
                      ({w.utilization_pct}% utilização)
                      {w.is_100_percent && <span style={{ color: "#b71c1c", fontWeight: 600, marginLeft: 6 }}>— 100% (Limite Máximo)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Toggle de visão ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16, flexWrap: "wrap", gap: 10,
            }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>
                Grade Gerada — {turno}
              </h3>
              <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {[
                  { id: "turma",     label: "🏫 Por Turma" },
                  { id: "professor", label: "👨‍🏫 Por Professor" },
                ].map(v => (
                  <button key={v.id} onClick={() => setViewMode(v.id)} style={{
                    padding: "8px 18px", border: "none", cursor: "pointer",
                    background: viewMode === v.id ? "#2563eb" : "#fff",
                    color:      viewMode === v.id ? "#fff"    : "#64748b",
                    fontWeight: 700, fontSize: 12, transition: "all 0.18s",
                  }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Grade por Turma ── */}
            {viewMode === "turma" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {Object.keys(resultado.grade_por_turma || {}).length === 0 ? (
                  <p style={{ color: "#94a3b8", textAlign: "center" }}>Nenhuma grade gerada.</p>
                ) : (
                  Object.entries(resultado.grade_por_turma)
                    .sort(([idA], [idB]) => {
                      const nA = (nomesTurmas[idA] || String(idA)).toUpperCase();
                      const nB = (nomesTurmas[idB] || String(idB)).toUpperCase();
                      return nA.localeCompare(nB, "pt-BR", { numeric: true });
                    })
                    .map(([turmaId, grade]) => (
                      <div key={turmaId} style={{
                        background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
                        overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}>
                        <div style={{
                          padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
                          background: "#f8fafc", fontWeight: 700, fontSize: 14, color: "#1e3a5f",
                        }}>
                          🏫 {String(nomesTurmas[turmaId] || turmaId).toUpperCase().includes("TURMA") ? "" : "Turma "}
                          {nomesTurmas[turmaId] || turmaId}
                        </div>
                        <div style={{ padding: 12 }}>
                          <GradeTurma
                            turma={{ id: Number(turmaId), nome: nomesTurmas[turmaId] || turmaId }}
                            resultado={resultado}
                            periodosPorDia={buildPeriodosPorDia(grade)}
                            maps={{ disciplinaById: nomesDisciplinas, professorById: nomesProfessores }}
                            layoutMode="dias-colunas"
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ── Grade por Professor ── */}
            {viewMode === "professor" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {Object.keys(resultado.grade_por_professor || {}).length === 0 ? (
                  <p style={{ color: "#94a3b8", textAlign: "center" }}>Nenhuma grade gerada.</p>
                ) : (
                  Object.entries(resultado.grade_por_professor)
                    .sort(([idA], [idB]) => {
                      const nA = (nomesProfessores[idA] || String(idA)).toUpperCase();
                      const nB = (nomesProfessores[idB] || String(idB)).toUpperCase();
                      return nA.localeCompare(nB, "pt-BR", { numeric: true });
                    })
                    .map(([profId, grade]) => (
                      <div key={profId} style={{
                        background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
                        overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}>
                        <div style={{
                          padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
                          background: "#f8fafc", fontWeight: 700, fontSize: 14, color: "#1e3a5f",
                        }}>
                          👨‍🏫 {nomesProfessores[profId] || `Professor ${profId}`}
                        </div>
                        <div style={{ padding: 12 }}>
                          <GradeProfessor
                            professor={{ id: Number(profId), nome: nomesProfessores[profId] || `Professor ${profId}` }}
                            resultado={resultado}
                            periodosPorDia={buildPeriodosPorDia(grade)}
                            maps={{ disciplinaById: nomesDisciplinas, turmaById: nomesTurmas }}
                            layoutMode="dias-colunas"
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 🚀 Modal Premium para Publicar Grade */}
      {showModalPublicar && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 20,
        }}>
          <div style={{
            background: "#fff", width: "100%", maxWidth: 420, borderRadius: 16,
            padding: "24px 28px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            animation: "modalFadeIn 0.2s ease-out forwards",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", background: "#dcfce7",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
              }}>
                🌐
              </div>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 700 }}>
                Publicar Grade?
              </h3>
            </div>

            <p style={{ margin: "0 0 24px 0", color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
              Publicar a grade irá torná-la oficial e acessível a todos os professores e alunos. Você tem certeza de que deseja continuar?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                onClick={() => setShowModalPublicar(false)}
                style={{
                  padding: "10px 16px", borderRadius: 8, border: "1px solid #cbd5e1",
                  background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={executarPublicacao}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: "#16a34a", color: "#fff", fontWeight: 600, fontSize: 14,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                Sim, Publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animações */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.55; }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
