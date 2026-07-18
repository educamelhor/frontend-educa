// src/features/secretaria/horarios/GerarHorarioPage.jsx
// ============================================================
// Tela de Geração de Horários — aba ⚡ Gerar Horário
// Fluxo:
//   1) Carrega turmas do turno selecionado
//   2) POST /api/grade/run-mock → solver greedy
//   3) Exibe grade por Turma / por Professor
//   4) POST /api/grade/rascunho → salva rascunho
//   5) POST /api/grade/publicar → promove a publicado
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import GradeTurma from "./GradeTurma.jsx";
import GradeProfessor from "./GradeProfessor.jsx";

// ── Dias da semana ────────────────────────────────────────────
const DIAS_NOME = { 1:"Seg", 2:"Ter", 3:"Qua", 4:"Qui", 5:"Sex", 6:"Sáb" };

// ── Normaliza resultado do solver (aceita vários formatos) ────
function normalizeResultado(raw) {
  if (!raw || typeof raw !== "object") return {};
  const src = raw.data || raw.resultado || raw.result || raw;
  return {
    grade_por_turma:    src.grade_por_turma    || src.gradePorTurma    || {},
    grade_por_professor:src.grade_por_professor|| src.gradePorProfessor|| {},
    metrics:            src.metrics            || src.metricas         || {},
    diagnostico:        src.diagnostico        || {},
    payload_summary:    src.payload_summary    || {},
    traceId:            src.traceId            || raw.traceId          || null,
  };
}

// ── Medidor de cobertura ───────────────────────────────────────
function CoberturaGauge({ cobertura }) {
  const pct = Math.min(100, Math.round((cobertura || 0) * 100));
  const cor = pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";
  const R = 40, circ = 2 * Math.PI * R;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={R} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle cx={50} cy={50} r={R} fill="none" stroke={cor} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray 0.8s ease" }} />
        <text x={50} y={54} textAnchor="middle" fontSize={20} fontWeight={700} fill={cor}>{pct}%</text>
      </svg>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Cobertura</p>
    </div>
  );
}

// ── Card de métrica ────────────────────────────────────────────
function MetricCard({ label, value, icon, color = "#1e3a5f" }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
      padding: "14px 18px", textAlign: "center", flex: 1, minWidth: 100,
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value ?? "—"}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{label}</div>
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
  const turnos          = config?.turnos || ["matutino", "vespertino"];
  const [turno, setTurno]             = useState(turnos[0] || "matutino");
  const [turmas, setTurmas]           = useState([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);

  // Estado do solver
  const [rodando, setRodando]         = useState(false);
  const [resultado, setResultado]     = useState(null); // null = ainda não rodou
  const [erroSolver, setErroSolver]   = useState(null);

  // Nomes para lookup
  const [nomesDisciplinas, setNomesDisciplinas] = useState({});
  const [nomesProfessores, setNomesProfessores] = useState({});
  const [nomesTurmas, setNomesTurmas]           = useState({});

  // Exibição
  const [viewMode, setViewMode]       = useState("turma"); // "turma" | "professor"
  const [salvando, setSalvando]       = useState(false);
  const [publicando, setPublicando]   = useState(false);
  const [msgAcao, setMsgAcao]         = useState("");

  // ── Carrega turmas do turno ──────────────────────────────────
  const carregarTurmas = useCallback(async () => {
    setCarregandoTurmas(true);
    try {
      const { data } = await api.get("/api/turmas", { params: { turno } });
      const lista = Array.isArray(data) ? data : (Array.isArray(data?.turmas) ? data.turmas : []);
      setTurmas(lista);
      // Mapa de nomes
      const map = {};
      for (const t of lista) map[t.id] = t.nome || `Turma ${t.id}`;
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

  // ── Executar solver ──────────────────────────────────────────
  async function executarSolver() {
    if (!turmas.length) return;
    setRodando(true);
    setErroSolver(null);
    setResultado(null);
    setMsgAcao("");
    try {
      const ids = turmas.map(t => t.id);
      const { data } = await api.post("/api/grade/run-mock", {
        turno: turno.toLowerCase(),
        turma_ids: ids,
      });
      setResultado(normalizeResultado(data));
    } catch (e) {
      setErroSolver(e?.response?.data?.error || "Erro ao executar o solver. Tente novamente.");
    } finally {
      setRodando(false);
    }
  }

  // ── Salvar rascunho ──────────────────────────────────────────
  async function salvarRascunho() {
    if (!resultado) return;
    setSalvando(true);
    setMsgAcao("");
    try {
      // Converte grade_por_turma para array de slots
      const slots = [];
      const gpt = resultado.grade_por_turma || {};
      for (const [turmaId, porDia] of Object.entries(gpt)) {
        for (const [dia, porOrdem] of Object.entries(porDia || {})) {
          for (const [ordem, cell] of Object.entries(porOrdem || {})) {
            if (cell && cell.professor_id) {
              slots.push({
                turma_id:      Number(turmaId),
                dia_semana:    Number(dia),
                periodo_ordem: Number(ordem),
                professor_id:  cell.professor_id,
                disciplina_id: cell.disciplina_id,
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
  async function publicarGrade() {
    const ok = window.confirm(
      "Publicar a grade irá torná-la oficial e acessível a todos. Deseja continuar?"
    );
    if (!ok) return;
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
  const diag    = resultado?.diagnostico || {};
  const naoAloc = Array.isArray(diag.nao_alocadas) ? diag.nao_alocadas.length : 0;

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
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e3a5f" }}>
            Gerar Horário
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Seletor de turno */}
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            {turnos.map(t => (
              <button key={t} onClick={() => setTurno(t)} style={{
                padding: "8px 18px", border: "none", cursor: "pointer",
                background: turno === t ? "#2563eb" : "#fff",
                color:      turno === t ? "#fff"    : "#64748b",
                fontWeight: 700, fontSize: 12, textTransform: "uppercase",
                letterSpacing: 0.5, transition: "all 0.18s",
              }}>
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
          {resultado && (
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
              Motor de Geração de Horários
            </h3>
            <p style={{ color: "#64748b", fontSize: 14, maxWidth: 440, lineHeight: 1.6 }}>
              {carregandoTurmas
                ? "Carregando turmas…"
                : turmas.length === 0
                  ? "Nenhuma turma encontrada para o turno selecionado."
                  : `${turmas.length} turmas encontradas para o turno ${turno}. Clique em ⚡ Gerar Horário para iniciar.`}
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

        {/* Spinner de geração */}
        {rodando && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: 340, gap: 20, color: "#64748b",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              border: "6px solid #e2e8f0", borderTopColor: "#2563eb",
              animation: "spin 0.9s linear infinite",
            }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1e3a5f" }}>
              Calculando o horário ideal…
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>
              O solver analisa disponibilidades e restrições pedagógicas.
            </p>
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
              display: "flex", alignItems: "flex-start", gap: 20,
              marginBottom: 24, flexWrap: "wrap",
            }}>
              <CoberturaGauge cobertura={metrics.cobertura} />
              <div style={{ display: "flex", gap: 12, flex: 1, flexWrap: "wrap" }}>
                <MetricCard label="Aulas Alocadas"  value={metrics.aulas_alocadas} icon="✅" color="#16a34a" />
                <MetricCard label="Demanda Total"   value={metrics.aulas_demanda}  icon="📚" color="#1e3a5f" />
                <MetricCard label="Não Alocadas"    value={naoAloc}                icon={naoAloc > 0 ? "⚠️" : "🎉"} color={naoAloc > 0 ? "#b45309" : "#16a34a"} />
                <MetricCard label="Turmas"          value={resultado.payload_summary?.turmas} icon="🏫" color="#1e3a5f" />
                <MetricCard label="Professores"     value={resultado.payload_summary?.professores} icon="👨‍🏫" color="#1e3a5f" />
              </div>
            </div>

            {/* ── Alertas de não-alocadas ── */}
            {naoAloc > 0 && (
              <div style={{
                background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10,
                padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#92400e",
              }}>
                <strong>⚠️ {naoAloc} aula(s) não alocada(s)</strong>
                {" — "}Verifique a disponibilidade dos professores e a grade de horários configurada.
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
                  Object.entries(resultado.grade_por_turma).map(([turmaId, grade]) => (
                    <div key={turmaId} style={{
                      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
                      overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}>
                      <div style={{
                        padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
                        background: "#f8fafc", fontWeight: 700, fontSize: 14, color: "#1e3a5f",
                      }}>
                        🏫 {nomesTurmas[turmaId] || `Turma ${turmaId}`}
                      </div>
                      <div style={{ padding: 12 }}>
                        <GradeTurma
                          turma={{ id: Number(turmaId), nome: nomesTurmas[turmaId] || `Turma ${turmaId}` }}
                          resultado={resultado}
                          periodosPorDia={buildPeriodosPorDia(grade)}
                          maps={{ disciplinaById: nomesDisciplinas, professorById: nomesProfessores }}
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
                  Object.entries(resultado.grade_por_professor).map(([profId, grade]) => (
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

      {/* Animação de spin */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
