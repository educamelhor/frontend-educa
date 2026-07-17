// src/features/secretaria/horarios/DiagnosticoPreGeracaoPage.jsx
// ============================================================================
// Diagnóstico Anti-Urânia — Pré-Geração de Horários
// Exibe Índice de Prontidão (0–100%) + 3 módulos de análise por turno:
//   1) Cobertura (demanda vs oferta de disciplinas)
//   2) Disponibilidade vs Carga Modulada
//   3) Turmas sem Professor Modulado
// Bloqueia o botão "Gerar Horário" se score < 50%.
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

// ─── Paleta por severidade ───────────────────────────────────────────────────
const SEV = {
  OK:                 { bg: "#dcfce7", border: "#4ade80", text: "#15803d", icon: "✅" },
  ATENCAO:           { bg: "#fef9c3", border: "#facc15", text: "#854d0e", icon: "⚠️" },
  CRITICO:           { bg: "#fee2e2", border: "#f87171", text: "#b91c1c", icon: "🔴" },
  SEM_DISPONIBILIDADE: { bg: "#f3e8ff", border: "#c084fc", text: "#7e22ce", icon: "📅" },
  DEFICIT:           { bg: "#fee2e2", border: "#f87171", text: "#b91c1c", icon: "🔴" },
  SOBRA:             { bg: "#dbeafe", border: "#60a5fa", text: "#1e40af", icon: "🔵" },
};

// ─── Score → zona ─────────────────────────────────────────────────────────────
function scoreZona(s) {
  if (s >= 91) return { label: "✅ Pronto para gerar", color: "#16a34a", ring: "#4ade80", bg: "#f0fdf4" };
  if (s >= 76) return { label: "⚡ Quase pronto", color: "#d97706", ring: "#fbbf24", bg: "#fffbeb" };
  if (s >= 51) return { label: "⚠️ Gerar com advertências", color: "#ea580c", ring: "#fb923c", bg: "#fff7ed" };
  return { label: "🚫 Não é possível gerar ainda", color: "#dc2626", ring: "#f87171", bg: "#fef2f2" };
}

// ─── Gauge circular SVG ───────────────────────────────────────────────────────
function Gauge({ score }) {
  const zona = scoreZona(score);
  const R = 54;
  const circ = 2 * Math.PI * R;
  const dash = (score / 100) * circ;

  return (
    <div
      className="flex flex-col items-center justify-center p-5 rounded-2xl shadow-sm"
      style={{ background: zona.bg, border: `2px solid ${zona.ring}` }}
    >
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Track */}
        <circle cx="70" cy="70" r={R} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        {/* Progress */}
        <circle
          cx="70" cy="70" r={R}
          fill="none"
          stroke={zona.ring}
          strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x="70" y="66" textAnchor="middle" fontSize="28" fontWeight="bold" fill={zona.color}>
          {score}%
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="11" fill="#6b7280">
          Prontidão
        </text>
      </svg>
      <p className="mt-2 text-sm font-semibold text-center" style={{ color: zona.color }}>
        {zona.label}
      </p>
    </div>
  );
}

// ─── Card genérico ────────────────────────────────────────────────────────────
function Card({ title, icon, children, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-gray-100">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
      </div>
      <div className="p-4 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        ) : children}
      </div>
    </div>
  );
}

// ─── Linha de professor (Módulo 2) ───────────────────────────────────────────
function LinhaProf({ p, onIrParaDisponibilidade }) {
  const sev = SEV[p.severidade] || SEV.OK;
  const defLabel = p.deficit_slots === null
    ? "sem dados"
    : p.deficit_slots < 0
      ? `faltam ${Math.abs(p.deficit_slots)} slots`
      : `${p.deficit_slots} slots sobrando`;

  const clicavel = p.severidade === "CRITICO" || p.severidade === "SEM_DISPONIBILIDADE";

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1 text-xs"
      style={{
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        cursor: clicavel && onIrParaDisponibilidade ? "pointer" : "default",
        transition: "opacity 0.15s",
      }}
      onClick={clicavel && onIrParaDisponibilidade ? () => onIrParaDisponibilidade(p.professor_id) : undefined}
      title={clicavel ? "Clique para ir à aba de Disponibilidade e corrigir" : undefined}
    >
      <span>{sev.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate" style={{ color: sev.text }}>
          {p.professor_nome}
          {clicavel && onIrParaDisponibilidade && (
            <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.75 }}>→ corrigir</span>
          )}
        </p>
        <p className="text-gray-500">
          {p.disciplina_nome} · {p.turmas_count} turma(s) · {p.aulas_moduladas} aulas/sem
          {p.slots_livres !== null && ` · ${p.slots_livres} slots livres`}
        </p>
      </div>
      <span
        className="shrink-0 font-semibold"
        style={{ color: sev.text }}
      >{defLabel}</span>
    </div>
  );
}

// ─── Turmas agrupadas (Módulo 3) ──────────────────────────────────────────────
function TurmasDescobertasLista({ lacunas }) {
  if (!lacunas || lacunas.length === 0) {
    return <p className="text-sm text-green-700 py-2">✅ Todas as turmas estão cobertas!</p>;
  }

  // Agrupa por turma
  const byTurma = {};
  for (const l of lacunas) {
    if (!byTurma[l.turma_nome]) byTurma[l.turma_nome] = [];
    byTurma[l.turma_nome].push(l);
  }

  return (
    <div className="space-y-2">
      {Object.entries(byTurma).map(([turma, discs]) => (
        <div
          key={turma}
          className="p-2 rounded-lg text-xs"
          style={{ background: "#fee2e2", border: "1px solid #f87171" }}
        >
          <p className="font-bold text-red-800 mb-1">🏫 {turma}</p>
          <div className="flex flex-wrap gap-1">
            {discs.map((d) => (
              <span
                key={d.disciplina_id}
                className="px-2 py-0.5 rounded-full font-medium text-white"
                style={{ background: "#ef4444" }}
              >
                {d.disciplina_nome} ({d.carga}h)
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cobertura (Módulo 1) ─────────────────────────────────────────────────────
function CoberturaLista({ resumo }) {
  if (!resumo || resumo.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-2">
        Nenhuma disciplina com carga definida para este turno.
      </p>
    );
  }

  const comGap = resumo.filter((r) => r.gap < 0);
  const semGap = resumo.filter((r) => r.gap >= 0);

  return (
    <div className="space-y-1">
      {comGap.map((r) => (
        <div
          key={r.disciplina_id}
          className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs"
          style={{ background: SEV.CRITICO.bg, border: `1px solid ${SEV.CRITICO.border}` }}
        >
          <span>🔴</span>
          <span className="flex-1 font-semibold text-red-800">{r.disciplina_nome}</span>
          <span className="text-red-700">
            precisa {r.carga_necessaria}h · tem {r.aulas_ofertadas}h
            <strong> (déficit {Math.abs(r.gap)}h)</strong>
          </span>
        </div>
      ))}
      {semGap.map((r) => (
        <div
          key={r.disciplina_id}
          className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs"
          style={{ background: SEV.OK.bg, border: `1px solid ${SEV.OK.border}` }}
        >
          <span>✅</span>
          <span className="flex-1 font-semibold text-green-800">{r.disciplina_nome}</span>
          <span className="text-green-700">
            {r.carga_necessaria}h cobertos
            {r.gap > 0 && ` (+${r.gap} sobra)`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Componente de Diagnóstico por Turno ──────────────────────────────────────
function DiagnosticoTurno({ turno, onIrParaDisponibilidade }) {
  const [cobertura, setCobertura] = useState(null);
  const [disponib, setDisponib] = useState(null);
  const [turmasDisc, setTurmasDisc] = useState(null);
  const [loadC, setLoadC] = useState(true);
  const [loadD, setLoadD] = useState(true);
  const [loadT, setLoadT] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoadC(true); setLoadD(true); setLoadT(true);

      // Cobertura
      api.get("/api/modulacao/diagnostico", { params: { turno } })
        .then(({ data }) => { if (!cancelled) { setCobertura(data); setLoadC(false); } })
        .catch(() => { if (!cancelled) { setCobertura(null); setLoadC(false); } });

      // Disponibilidade
      api.get("/api/modulacao/diagnostico/disponibilidade", { params: { turno } })
        .then(({ data }) => { if (!cancelled) { setDisponib(data); setLoadD(false); } })
        .catch(() => { if (!cancelled) { setDisponib(null); setLoadD(false); } });

      // Turmas descobertas
      api.get("/api/modulacao/diagnostico/turmas-descobertas", { params: { turno } })
        .then(({ data }) => { if (!cancelled) { setTurmasDisc(data); setLoadT(false); } })
        .catch(() => { if (!cancelled) { setTurmasDisc(null); setLoadT(false); } });
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [turno]);

  // ── Calcular score do turno ─────────────────────────────────────────────────
  const score = React.useMemo(() => {
    if (loadC || loadD || loadT) return null;

    // Componente 1: disciplinas cobertas (40%)
    const totalDisc = cobertura?.resumo_por_disciplina?.length || 0;
    const discOk = cobertura?.resumo_por_disciplina?.filter((d) => d.gap >= 0).length || 0;
    const scoreDisc = totalDisc > 0 ? (discOk / totalDisc) * 40 : 40;

    // Componente 2: professores sem conflito de disponibilidade (40%)
    const totalProf = disponib?.total_modulados || 0;
    const profOk = disponib?.ok?.length || 0;
    const scoreDisp = totalProf > 0
      ? (profOk / totalProf) * 40
      : 40; // se nenhum modulado, não penaliza

    // Componente 3: turmas completas (20%)
    const totalTurmas = turmasDisc?.total_turmas || 0;
    const turmasOk = turmasDisc?.turmas_completas || 0;
    const scoreTurmas = totalTurmas > 0 ? (turmasOk / totalTurmas) * 20 : 20;

    return Math.round(scoreDisc + scoreDisp + scoreTurmas);
  }, [loadC, loadD, loadT, cobertura, disponib, turmasDisc]);

  const podereGerar = score !== null && score >= 50;

  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Score + Gauge */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="shrink-0">
          {score === null ? (
            <div className="w-36 h-36 rounded-2xl bg-slate-100 animate-pulse" />
          ) : (
            <Gauge score={score} />
          )}
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide">
            Resumo do Turno — {turno}
          </h3>

          {score === null ? (
            <div className="text-sm text-slate-400">Calculando...</div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">
                  {cobertura?.resumo_por_disciplina?.filter((d) => d.gap < 0).length ?? "—"}
                </p>
                <p className="text-xs text-slate-500">Disciplinas c/ déficit</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">
                  {disponib?.conflitos?.length ?? "—"}
                </p>
                <p className="text-xs text-slate-500">Professores c/ conflito</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">
                  {turmasDisc?.turmas_com_gap ?? "—"}
                </p>
                <p className="text-xs text-slate-500">Turmas descobertas</p>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/secretaria/horarios/wizard")}
            disabled={!podereGerar}
            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
              podereGerar
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {score === null
              ? "Calculando..."
              : podereGerar
                ? `🚀 Gerar Horário — ${turno}`
                : `🚫 Corrija os problemas antes (score: ${score}%)`}
          </button>
          {!podereGerar && score !== null && (
            <p className="text-xs text-center text-red-500 mt-1">
              Score mínimo para gerar: 50%. Atual: {score}%
            </p>
          )}
        </div>
      </div>

      {/* 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Cobertura */}
        <Card title="Cobertura de Disciplinas" icon="📚" loading={loadC}>
          <CoberturaLista resumo={cobertura?.resumo_por_disciplina} />
        </Card>

        {/* Card 2: Disponibilidade */}
        <Card title="Disponibilidade vs Carga" icon="📅" loading={loadD}>
          {disponib ? (
            <div>
              {disponib.conflitos.length === 0 && disponib.sem_disponibilidade.length === 0 ? (
                <p className="text-sm text-green-700 py-2">✅ Todos os professores têm disponibilidade suficiente!</p>
              ) : (
                <>
                  {disponib.conflitos.map((p) => (
                    <LinhaProf key={p.professor_id} p={p} onIrParaDisponibilidade={onIrParaDisponibilidade} />
                  ))}
                  {disponib.sem_disponibilidade.map((p) => (
                    <LinhaProf key={p.professor_id} p={p} onIrParaDisponibilidade={onIrParaDisponibilidade} />
                  ))}
                  {disponib.ok.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-green-700 cursor-pointer hover:underline">
                        ✅ Ver {disponib.ok.length} professor(es) sem conflito
                      </summary>
                      <div className="mt-1">
                        {disponib.ok.map((p) => (
                          <LinhaProf key={p.professor_id} p={p} />
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhum dado disponível.</p>
          )}
        </Card>

        {/* Card 3: Turmas descobertas */}
        <Card title="Turmas sem Professor" icon="🏫" loading={loadT}>
          <TurmasDescobertasLista lacunas={turmasDisc?.lacunas} />
          {turmasDisc && turmasDisc.total_turmas > 0 && (
            <p className="text-xs text-slate-400 mt-2 pt-2 border-t">
              {turmasDisc.turmas_completas}/{turmasDisc.total_turmas} turmas 100% cobertas
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
const TURNOS = ["Matutino", "Vespertino", "Noturno"];

export default function DiagnosticoPreGeracaoPage({ onIrParaDisponibilidade } = {}) {
  const [abaAtiva, setAbaAtiva] = useState("Matutino");
  const [turnos, setTurnos] = useState(TURNOS);

  // Opcional: buscar turnos reais da API
  useEffect(() => {
    api.get("/api/turnos")
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          const nomes = data.map((t) =>
            typeof t === "string" ? t : (t.nome || t.label || String(t))
          ).filter(Boolean);
          if (nomes.length > 0) {
            setTurnos(nomes);
            setAbaAtiva(nomes[0]);
          }
        }
      })
      .catch(() => {}); // fallback para TURNOS padrão
  }, []);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          🔍 Diagnóstico Pré-Geração de Horários
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Verifique a prontidão de cada turno antes de gerar o quadro de horários.
          O sistema bloqueia a geração quando o <strong>Índice de Prontidão for inferior a 50%</strong>.
        </p>
      </div>

      {/* Abas por Turno */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {turnos.map((t) => (
          <button
            key={t}
            onClick={() => setAbaAtiva(t)}
            className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all border ${
              abaAtiva === t
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <DiagnosticoTurno key={abaAtiva} turno={abaAtiva} onIrParaDisponibilidade={onIrParaDisponibilidade} />

      {/* Botão Revisar quando há callback */}
      {onIrParaDisponibilidade && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => onIrParaDisponibilidade(null)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-all"
          >
            ← Revisar Disponibilidade dos Professores
          </button>
        </div>
      )}
    </div>
  );
}
