// src/features/secretaria/horarios/GerarHorarioPage.jsx
// ============================================================================
// Tela de Geração e Edição Interativa de Horários — aba ⚡ Gerar Horário
// Entregas 1 & 2 (Padrão Urânia):
//   1) Carrega automaticamente a grade salva (Rascunho ou Publicada) ao abrir
//   2) Executa Motor Solver 2.0 em Web Worker (Kempe Chains + Tabu Search)
//   3) Edição Interativa Click-to-Swap / Move / Lock direto na grade (Turma e Professor)
//      com validação instantânea de choques de professor e indisponibilidades
//   4) Alocação assistida de aulas pendentes (1 clique para encaixar na grade)
//   5) Salva rascunho e publica garantindo sincronia total do que está em tela
// ============================================================================
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import api from "../../../services/api";
import GradeTurma from "./GradeTurma.jsx";
import GradeProfessor from "./GradeProfessor.jsx";
import { runSolverInWebWorker } from "./solverEngine.js";
import ExportarHorarioModal, {
  imprimirHorarioTurmaUnica,
  imprimirHorarioProfessorUnico,
} from "./ExportarHorarioModal.jsx";

const DIAS_LABEL = { 1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado" };
const DIAS_CURTO = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

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
    origem_carregamento: src.origem_carregamento || null, // 'rascunho' | 'publicado' | 'solver'
    meta_persistencia:   src.meta_persistencia   || null,
    traceId:             src.traceId             || raw.traceId           || null,
  };
}

// ── Recalcula métricas e aulas não alocadas com base na grade atual e no payload ──
function recalcularMetricasEDiagnostico(gradePorTurma, solverPayload, metricsAtuais = {}) {
  const contagensAlocadas = new Map();
  let totalAlocadas = 0;
  let totalFixas = 0;

  for (const [tIdStr, diasObj] of Object.entries(gradePorTurma || {})) {
    const tId = Number(tIdStr);
    for (const perObj of Object.values(diasObj || {})) {
      for (const cell of Object.values(perObj || {})) {
        if (cell && cell.professor_id && cell.disciplina_id) {
          totalAlocadas++;
          if (cell.locked) totalFixas++;
          const k = `${tId}|${Number(cell.disciplina_id)}`;
          contagensAlocadas.set(k, (contagensAlocadas.get(k) || 0) + 1);
        }
      }
    }
  }

  // Calcula violações pedagógicas (aulas separadas no mesmo dia, excesso > maxDia, dupla cortada pelo recreio/par bloqueado e pares obrigatórios)
  const rg = solverPayload?.config_pedagogica?.regras_gerais || {};
  const maxDiaPadrao =
    Number(rg.max_aulas_mesmo_dia) ||
    Number(solverPayload?.config_pedagogica?.regras?.rc02_max_por_dia_disciplina?.max_por_dia_padrao) ||
    2;
  const turnoKey = String(solverPayload?.turno || "matutino").toLowerCase();
  const recreioApos =
    rg?.recreio_apos_periodo?.[turnoKey] !== undefined
      ? Number(rg.recreio_apos_periodo[turnoKey])
      : turnoKey.includes("noturno")
      ? 2
      : 3;
  const bloquearRecreio =
    rg?.bloquear_duplas_no_recreio !== undefined
      ? Boolean(rg.bloquear_duplas_no_recreio)
      : rg?.aulas_duplas_separar_recreio !== undefined
      ? !rg.aulas_duplas_separar_recreio
      : true;
  const paresBloqueadosSet = new Set();
  const paresObrigatoriosSet = new Set();
  if (bloquearRecreio && recreioApos > 0) paresBloqueadosSet.add(recreioApos);
  for (const item of Array.isArray(rg?.pares_duplas_governanca) ? rg.pares_duplas_governanca : []) {
    const modo = String(item?.modo || "").toLowerCase();
    const ini = Number(item?.inicio);
    if (ini > 0) {
      if (modo === "bloqueado") paresBloqueadosSet.add(ini);
      if (modo === "obrigatorio" && !paresBloqueadosSet.has(ini)) paresObrigatoriosSet.add(ini);
    }
  }

  const diasSemana =
    Array.isArray(solverPayload?.dias_semana) && solverPayload.dias_semana.length > 0
      ? solverPayload.dias_semana.map(Number)
      : [1, 2, 3, 4, 5];

  let violacoesSeparadasMesmoDia = 0;
  let violacoesMaxDia = 0;
  let violacoesParesBloqueados = 0;
  let violacoesIndisponibilidade = 0;
  let paresGeminados = 0;
  let paresObrigatoriosAtendidos = 0;
  const divergenciasParesObrigatorios = [];

  const dispoBloqueadaSet = new Set();
  for (const disp of Array.isArray(solverPayload?.disponibilidades) ? solverPayload.disponibilidades : []) {
    const st = String(disp?.status || "indisponivel").toLowerCase();
    if (st === "indisponivel" || st === "bloqueado" || st === "excluir") {
      const pId = Number(disp.professor_id);
      const dia = Number(disp.dia ?? disp.dia_semana);
      const ord = Number(disp.ordem ?? disp.periodo ?? disp.periodo_ordem);
      if (pId && dia && ord) dispoBloqueadaSet.add(`${pId}|${dia}|${ord}`);
    }
  }

  const turmaEntries = Object.entries(gradePorTurma || {}).filter(([, g]) => Boolean(g));
  const paresObrigatoriosMeta = paresObrigatoriosSet.size * turmaEntries.length * diasSemana.length;

  for (const [tIdStr, diasObj] of turmaEntries) {
    const tId = Number(tIdStr);
    for (const dNum of diasSemana) {
      const perObj = diasObj?.[dNum] || {};
      for (const pOb of paresObrigatoriosSet) {
        const c1 = perObj?.[pOb];
        const c2 = perObj?.[pOb + 1];
        const isGeminatedOb =
          c1 && c2 && c1.disciplina_id && Number(c1.disciplina_id) === Number(c2.disciplina_id);
        if (isGeminatedOb) {
          paresObrigatoriosAtendidos++;
        } else {
          divergenciasParesObrigatorios.push({
            turma_id: tId,
            dia: Number(dNum),
            inicio: pOb,
            fim: pOb + 1,
            disc_inicio: c1?.disciplina_id ? Number(c1.disciplina_id) : null,
            prof_inicio: c1?.professor_id ? Number(c1.professor_id) : null,
            disc_fim: c2?.disciplina_id ? Number(c2.disciplina_id) : null,
            prof_fim: c2?.professor_id ? Number(c2.professor_id) : null,
          });
        }
      }
    }

    for (const [dKey, perObj] of Object.entries(diasObj || {})) {
      const dNum = Number(dKey);
      const byDisc = new Map();
      for (const [pStr, cell] of Object.entries(perObj || {})) {
        if (!cell || !cell.disciplina_id) continue;
        const p = Number(pStr);
        const dId = Number(cell.disciplina_id);
        if (cell.professor_id && dispoBloqueadaSet.has(`${Number(cell.professor_id)}|${dNum}|${p}`)) {
          violacoesIndisponibilidade++;
        }
        const nextCell = perObj?.[p + 1];
        if (nextCell && Number(nextCell.disciplina_id) === dId) {
          paresGeminados++;
          if (paresBloqueadosSet.has(p) && (!cell.locked || !nextCell.locked)) {
            violacoesParesBloqueados++;
          }
        }
        if (!byDisc.has(dId)) byDisc.set(dId, []);
        byDisc.get(dId).push({ p, locked: Boolean(cell.locked) });
      }
      for (const [, arr] of byDisc.entries()) {
        if (arr.length <= 1 || arr.every((x) => x.locked)) continue;
        arr.sort((a, b) => a.p - b.p);
        const minP = arr[0].p;
        const maxP = arr[arr.length - 1].p;
        if (maxP - minP + 1 !== arr.length) violacoesSeparadasMesmoDia++;
        if (arr.length > maxDiaPadrao) violacoesMaxDia++;
      }
    }
  }

  const paresObrigatoriosFaltantes = Math.max(0, paresObrigatoriosMeta - paresObrigatoriosAtendidos);

  const demandas = Array.isArray(solverPayload?.demanda) ? solverPayload.demanda : [];
  const modulacao = Array.isArray(solverPayload?.modulacao) ? solverPayload.modulacao : [];

  if (demandas.length === 0) {
    const demFallback = Math.max(Number(metricsAtuais.aulas_demanda) || 0, totalAlocadas);
    const naoAlocFallback = Math.max(0, demFallback - totalAlocadas);
    const cobFallback = demFallback > 0 ? Math.round((totalAlocadas / demFallback) * 10000) / 100 : 100;
    return {
      metrics: {
        ...metricsAtuais,
        aulas_demanda: demFallback,
        aulas_alocadas: totalAlocadas,
        aulas_fixas_manuais: totalFixas,
        aulas_nao_alocadas: naoAlocFallback,
        cobertura_percentual: cobFallback,
        violacoes_indisponibilidade: violacoesIndisponibilidade,
        violacoes_separadas_mesmo_dia: violacoesSeparadasMesmoDia,
        violacoes_max_dia: violacoesMaxDia,
        violacoes_pares_bloqueados: violacoesParesBloqueados,
        pares_geminados: paresGeminados,
        pares_obrigatorios_meta: paresObrigatoriosMeta,
        pares_obrigatorios_atendidos: paresObrigatoriosAtendidos,
        pares_obrigatorios_faltantes: paresObrigatoriosFaltantes,
      },
      nao_alocadas: [],
      divergencias_pares_obrigatorios: divergenciasParesObrigatorios,
    };
  }

  const modIdx = new Map();
  for (const m of modulacao) {
    const k = `${Number(m.turma_id)}|${Number(m.disciplina_id)}`;
    if (!modIdx.has(k)) modIdx.set(k, Number(m.professor_id));
  }

  let demandaTotal = 0;
  const naoAlocadasList = [];

  for (const d of demandas) {
    const tId = Number(d.turma_id);
    const dId = Number(d.disciplina_id);
    const carga = Number(d.carga || d.aulas_semanais || 0);
    const pId = Number(d.professor_id || modIdx.get(`${tId}|${dId}`) || 0);
    if (!tId || !dId || !pId || carga <= 0) continue;

    demandaTotal += carga;
    const aloc = contagensAlocadas.get(`${tId}|${dId}`) || 0;
    const faltam = Math.max(0, carga - aloc);
    for (let i = 0; i < faltam; i++) {
      naoAlocadasList.push({
        turma_id: tId,
        disciplina_id: dId,
        professor_id: pId,
        motivo: "PENDENTE_ALOCACAO",
      });
    }
  }

  demandaTotal = Math.max(demandaTotal, totalAlocadas + naoAlocadasList.length);
  const cobertura = demandaTotal > 0 ? Math.round((totalAlocadas / demandaTotal) * 10000) / 100 : 100;

  return {
    metrics: {
      ...metricsAtuais,
      aulas_demanda: demandaTotal,
      aulas_alocadas: totalAlocadas,
      aulas_fixas_manuais: totalFixas,
      aulas_nao_alocadas: naoAlocadasList.length,
      cobertura_percentual: cobertura,
      violacoes_indisponibilidade: violacoesIndisponibilidade,
      violacoes_separadas_mesmo_dia: violacoesSeparadasMesmoDia,
      violacoes_max_dia: violacoesMaxDia,
      violacoes_pares_bloqueados: violacoesParesBloqueados,
      pares_geminados: paresGeminados,
      pares_obrigatorios_meta: paresObrigatoriosMeta,
      pares_obrigatorios_atendidos: paresObrigatoriosAtendidos,
      pares_obrigatorios_faltantes: paresObrigatoriosFaltantes,
    },
    nao_alocadas: naoAlocadasList,
    divergencias_pares_obrigatorios: divergenciasParesObrigatorios,
  };
}

// ── Reconstrói grade_por_turma e grade_por_professor a partir de slots salvos no banco ──
function construirGradesDeSlotsSalvos(slots, turmasList, solverPayload) {
  const diasSemana =
    Array.isArray(solverPayload?.dias_semana) && solverPayload.dias_semana.length > 0
      ? solverPayload.dias_semana.map(Number)
      : [1, 2, 3, 4, 5];
  const periodosPorDia = Number(solverPayload?.periodos_por_dia) || 6;

  const initEmpty = () => {
    const g = {};
    for (const d of diasSemana) {
      g[d] = {};
      for (let p = 1; p <= periodosPorDia; p++) g[d][p] = null;
    }
    return g;
  };

  const turmaIdsTurnoSet = new Set((turmasList || []).map((t) => Number(t.id)));
  const gradePorTurma = {};
  for (const t of turmasList || []) {
    gradePorTurma[t.id] = initEmpty();
  }

  const gradePorProfessor = {};
  for (const m of solverPayload?.modulacao || []) {
    if (m.professor_id && !gradePorProfessor[m.professor_id]) {
      gradePorProfessor[m.professor_id] = initEmpty();
    }
  }

  for (const s of slots || []) {
    const tId = Number(s.turma_id);
    const dia = Number(s.dia ?? s.dia_semana);
    const ord = Number(s.ordem ?? s.periodo_ordem);
    const dId = Number(s.disciplina_id);
    const pId = Number(s.professor_id);
    if (!tId || !dia || !ord || !dId || !pId) continue;
    // Ignora qualquer slot que pertença a turma de outro turno
    if (turmaIdsTurnoSet.size > 0 && !turmaIdsTurnoSet.has(tId)) continue;

    if (!gradePorTurma[tId]) gradePorTurma[tId] = initEmpty();
    if (!gradePorProfessor[pId]) gradePorProfessor[pId] = initEmpty();
    if (!gradePorTurma[tId][dia]) gradePorTurma[tId][dia] = {};
    if (!gradePorProfessor[pId][dia]) gradePorProfessor[pId][dia] = {};

    const isLocked = Boolean(Number(s.locked));

    gradePorTurma[tId][dia][ord] = {
      disciplina_id: dId,
      professor_id: pId,
      locked: isLocked,
      origem: isLocked ? "manual" : "solver",
    };

    gradePorProfessor[pId][dia][ord] = {
      turma_id: tId,
      disciplina_id: dId,
      locked: isLocked,
      origem: isLocked ? "manual" : "solver",
    };
  }

  return { gradePorTurma, gradePorProfessor };
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

// ── Converte grade { [dia]: { [ordem]: cell } } → periodosPorDia completo ──
function buildPeriodosPorDia(grade, diasPadrao = [1, 2, 3, 4, 5], maxPeriodosPadrao = 6) {
  const out = {};
  const diasChaves = Object.keys(grade || {}).map(Number).filter(n => n >= 1 && n <= 6);
  const diasFinal = diasChaves.length > 0 ? Array.from(new Set([...diasPadrao, ...diasChaves])).sort((a, b) => a - b) : diasPadrao;

  let maxOrd = maxPeriodosPadrao;
  for (const porOrdem of Object.values(grade || {})) {
    for (const k of Object.keys(porOrdem || {})) {
      const n = Number(k);
      if (n > maxOrd) maxOrd = n;
    }
  }

  for (const dia of diasFinal) {
    const arr = [];
    for (let o = 1; o <= maxOrd; o++) {
      arr.push({ ordem: o });
    }
    out[dia] = arr;
  }
  return out;
}

// ── Componente principal ───────────────────────────────────────
export default function GerarHorarioPage({ config, onAtualizarConfig, onAbrirReconfiguracao }) {
  const turnos = config?.turnos || ["matutino", "vespertino"];
  const [turno, setTurno] = useState(turnos[0] || "matutino");
  const [turmas, setTurmas] = useState([]);
  const [carregandoInicial, setCarregandoInicial] = useState(false);

  // Opções do Motor Solver 2.0
  const [respeitarHorarioManual, setRespeitarHorarioManual] = useState(true);
  const [tempoMaximoMs, setTempoMaximoMs] = useState(15000);

  // Payload enriquecido (demanda, modulacao, disponibilidades, config) para validação em tempo real
  const [solverPayload, setSolverPayload] = useState(null);

  // Grades salvas no banco (para permitir alternar entre Rascunho e Publicado se ambos existirem)
  const [dadosRascunhoSalvo, setDadosRascunhoSalvo] = useState(null);
  const [dadosPublicadoSalvo, setDadosPublicadoSalvo] = useState(null);

  // Estado do solver e telemetria Web Worker
  const [rodando, setRodando] = useState(false);
  const [progressoSolver, setProgressoSolver] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erroSolver, setErroSolver] = useState(null);
  const [temAlteracoesNaoSalvas, setTemAlteracoesNaoSalvas] = useState(false);
  const stopWorkerRef = useRef(null);

  // Estado de Edição Interativa (Click-to-Swap / Move / Alocar Pendente)
  // { tipo: 'slot' | 'nao_alocada', turmaId, dia?, ordem?, disciplina_id, professor_id, locked? }
  const [selecao, setSelecao] = useState(null);

  // Nomes para lookup
  const [nomesDisciplinas, setNomesDisciplinas] = useState({});
  const [nomesProfessores, setNomesProfessores] = useState({});
  const [nomesTurmas, setNomesTurmas] = useState({});

  // Exibição e Modais
  const [viewMode, setViewMode] = useState("turma"); // "turma" | "professor"
  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [msgAcao, setMsgAcao] = useState("");
  const [showModalPublicar, setShowModalPublicar] = useState(false);
  const [showModalExportar, setShowModalExportar] = useState(false);

  // 🧠 Modal Premium de Viabilidade e Sugestões de Ajuste (Padrão Urânia+)
  const [showModalDiagnosticoUrania, setShowModalDiagnosticoUrania] = useState(false);
  const [aplicandoSugestoesUrania, setAplicandoSugestoesUrania] = useState(false);
  const [sugestoesSelecionadas, setSugestoesSelecionadas] = useState({
    flexibilizar_obrigatorios: true,
    bloquear_recreio_pos_recreio: true,
    busca_exaustiva_60s: true,
    desafixar_manuais: false,
  });

  // Cleanup do Worker ao desmontar e atalho ESC para cancelar seleção
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelecao(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (stopWorkerRef.current) {
        try { stopWorkerRef.current(); } catch {}
      }
    };
  }, []);

  // Índice rápido de disponibilidades dos professores (`profId|dia|ordem` -> 'indisponivel' | 'evitar')
  const dispoIndex = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(solverPayload?.disponibilidades) ? solverPayload.disponibilidades : [];
    for (const d of list) {
      const pId = Number(d.professor_id);
      const dia = Number(d.dia ?? d.dia_semana);
      const ord = Number(d.ordem ?? d.periodo ?? d.periodo_ordem);
      const st = String(d.status || "indisponivel").toLowerCase();
      if (!pId || !dia || !ord) continue;
      if (st === "indisponivel" || st === "bloqueado" || st === "excluir") {
        map.set(`${pId}|${dia}|${ord}`, "indisponivel");
      } else if (st === "evitar" && map.get(`${pId}|${dia}|${ord}`) !== "indisponivel") {
        map.set(`${pId}|${dia}|${ord}`, "evitar");
      }
    }
    return map;
  }, [solverPayload]);

  // ── Aplica uma grade salva (rascunho ou publicado) na tela ────
  const aplicarGradeDoBanco = useCallback((registroBanco, origemLabel, listaTurmas, payloadInfo) => {
    if (!registroBanco || !Array.isArray(registroBanco.slots) || registroBanco.slots.length === 0) {
      return false;
    }
    const pl = payloadInfo?.payload || null;
    const { gradePorTurma, gradePorProfessor } = construirGradesDeSlotsSalvos(
      registroBanco.slots,
      listaTurmas,
      pl
    );
    const { metrics, nao_alocadas, divergencias_pares_obrigatorios } =
      recalcularMetricasEDiagnostico(gradePorTurma, pl, {});

    setResultado(
      normalizeResultado({
        grade_por_turma: gradePorTurma,
        grade_por_professor: gradePorProfessor,
        metrics,
        nao_alocadas,
        diagnostico: {
          nao_alocadas_detalhado: nao_alocadas,
          divergencias_pares_obrigatorios: divergencias_pares_obrigatorios || [],
        },
        warnings_payload: payloadInfo?.warnings_payload || [],
        payload_summary: payloadInfo?.payload_summary || {
          turmas: listaTurmas.length,
          professores: Object.keys(gradePorProfessor).length,
        },
        origem_carregamento: origemLabel,
        meta_persistencia: registroBanco.resultado || null,
      })
    );
    setTemAlteracoesNaoSalvas(false);
    setSelecao(null);
    return true;
  }, []);

  // ── Carrega turmas, nomes e grade salva do turno ao abrir ────
  const inicializarTurno = useCallback(async () => {
    setCarregandoInicial(true);
    setResultado(null);
    setErroSolver(null);
    setSelecao(null);
    setTemAlteracoesNaoSalvas(false);

    try {
      const hoje = new Date();
      const anoAtual = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();

      const [rTurmas, rDisc, rProf, rRascunho, rPublicado] = await Promise.all([
        api.get("/api/turmas", { params: { turno, ano: anoAtual } }).catch(() => ({ data: [] })),
        api.get("/api/disciplinas").catch(() => ({ data: [] })),
        api.get("/api/professores", { params: { turno } }).catch(() => ({ data: [] })),
        api.get("/api/grade/rascunho", { params: { turno: turno.toLowerCase() } }).catch(() => ({ data: null })),
        api.get("/api/grade/publicado", { params: { turno: turno.toLowerCase() } }).catch(() => ({ data: null })),
      ]);

      const listaTurmasBruta = Array.isArray(rTurmas.data)
        ? rTurmas.data
        : Array.isArray(rTurmas.data?.turmas)
          ? rTurmas.data.turmas
          : [];
      const turnoAlvo = String(turno || "").trim().toLowerCase();
      const listaTurmas = listaTurmasBruta.filter(
        (t) => !t.turno || String(t.turno).trim().toLowerCase() === turnoAlvo
      );
      setTurmas(listaTurmas);

      const tMap = {};
      for (const t of listaTurmas) tMap[t.id] = t.turma || t.nome || String(t.id);
      setNomesTurmas(tMap);

      const dMap = {};
      for (const d of Array.isArray(rDisc.data) ? rDisc.data : []) {
        dMap[d.id] = d.nome || d.disciplina || `Disc ${d.id}`;
      }
      setNomesDisciplinas(dMap);

      const pMap = {};
      for (const p of Array.isArray(rProf.data) ? rProf.data : []) {
        pMap[p.id] = p.nome || `Prof ${p.id}`;
      }
      setNomesProfessores(pMap);

      const rascunhoObj = rRascunho?.data?.slots?.length > 0 ? rRascunho.data : null;
      const publicadoObj = rPublicado?.data?.slots?.length > 0 ? rPublicado.data : null;
      setDadosRascunhoSalvo(rascunhoObj);
      setDadosPublicadoSalvo(publicadoObj);

      // Busca o solver-payload do turno para enriquecer métricas e validação de trocas
      let payloadInfo = null;
      if (listaTurmas.length > 0) {
        try {
          const { data: plData } = await api.post("/api/grade/solver-payload", {
            turno: turno.toLowerCase(),
            turma_ids: listaTurmas.map(t => t.id),
            respeitar_horario_manual: true,
          });
          if (plData?.ok && plData?.payload) {
            payloadInfo = plData;
            setSolverPayload(plData.payload);
            // Garante nomes dos professores da modulação também no mapa
            for (const m of plData.payload.modulacao || []) {
              if (m.professor_id && m.professor_nome && !pMap[m.professor_id]) {
                pMap[m.professor_id] = m.professor_nome;
              }
            }
            setNomesProfessores({ ...pMap });
          }
        } catch {
          /* silencioso */
        }
      }

      // Prioriza exibir Rascunho salvo; se não houver, exibe Grade Publicada
      if (rascunhoObj) {
        aplicarGradeDoBanco(rascunhoObj, "rascunho", listaTurmas, payloadInfo);
      } else if (publicadoObj) {
        aplicarGradeDoBanco(publicadoObj, "publicado", listaTurmas, payloadInfo);
      }
    } finally {
      setCarregandoInicial(false);
    }
  }, [turno, aplicarGradeDoBanco]);

  useEffect(() => {
    inicializarTurno();
  }, [inicializarTurno]);

  // ── Parar Solver antecipadamente e usar a melhor grade ────────
  function pararSolverAgora() {
    if (stopWorkerRef.current) {
      stopWorkerRef.current();
    }
  }

  // ── Executar Solver 2.0 via Web Worker ───────────────────────
  async function executarSolver(overrideOptions = null) {
    if (!turmas.length) return;
    const opts =
      overrideOptions && typeof overrideOptions === "object" && !overrideOptions.nativeEvent
        ? overrideOptions
        : null;

    const tempoEfetivoMs = opts?.maxTimeMs ?? tempoMaximoMs;
    const respeitarManualEfetivo =
      opts?.respeitarHorarioManual !== undefined ? opts.respeitarHorarioManual : respeitarHorarioManual;

    setRodando(true);
    setErroSolver(null);
    setSelecao(null);
    setMsgAcao("");
    setShowModalDiagnosticoUrania(false);
    setProgressoSolver({
      iter: 0,
      elapsedMs: 0,
      maxTimeMs: tempoEfetivoMs,
      strategy: "dsatur_slack",
      alocadas: 0,
      demanda: 0,
      fixas: 0,
      cobertura: 0,
    });

    const ids = turmas.map(t => t.id);

    try {
      let payloadData = null;
      try {
        const { data } = await api.post("/api/grade/solver-payload", {
          turno: turno.toLowerCase(),
          turma_ids: ids,
          respeitar_horario_manual: respeitarManualEfetivo,
        });
        if (data?.ok && data?.payload) {
          if (opts?.customRegrasGerais) {
            data.payload = {
              ...data.payload,
              config_pedagogica: {
                ...(data.payload.config_pedagogica || {}),
                regras_gerais: opts.customRegrasGerais,
              },
            };
          }
          payloadData = data;
          setSolverPayload(data.payload);
        }
      } catch (errPayload) {
        console.warn("[Solver 2.0] Fallback para /api/grade/run-mock:", errPayload?.message);
      }

      let novoResultadoNorm = null;

      if (payloadData?.payload) {
        const { promise, stop } = runSolverInWebWorker({
          payload: payloadData.payload,
          maxTimeMs: tempoEfetivoMs,
          onProgress: (prog) => {
            setProgressoSolver(prog);
          },
        });
        stopWorkerRef.current = stop;

        const workerResult = await promise;
        stopWorkerRef.current = null;

        novoResultadoNorm = normalizeResultado({
          ...workerResult,
          warnings_payload: payloadData.warnings_payload || [],
          payload_summary: payloadData.payload_summary || {},
          origem_carregamento: "solver",
        });
        setResultado(novoResultadoNorm);
        setTemAlteracoesNaoSalvas(true);
      } else {
        const { data } = await api.post("/api/grade/run-mock", {
          turno: turno.toLowerCase(),
          turma_ids: ids,
          respeitar_horario_manual: respeitarManualEfetivo,
        });
        novoResultadoNorm = normalizeResultado({ ...data, origem_carregamento: "solver" });
        setResultado(novoResultadoNorm);
        setTemAlteracoesNaoSalvas(true);
      }

      // 🧠 Gatilho automático do Assistente Urânia+: se não foi possível atender 100% da configuração
      // exigida pelo usuário (aulas pendentes, pares obrigatórios não geminados ou violações de governança),
      // abre o Modal Premium de Diagnóstico & Sugestões de Ajuste para Fechamento!
      if (novoResultadoNorm) {
        const m = novoResultadoNorm.metrics || {};
        const temPendenciaEstrita =
          (m.aulas_nao_alocadas || 0) > 0 ||
          (m.violacoes_indisponibilidade || 0) > 0 ||
          (m.pares_obrigatorios_faltantes || 0) > 0 ||
          (m.violacoes_pares_bloqueados || 0) > 0 ||
          (m.violacoes_separadas_mesmo_dia || 0) > 0 ||
          (m.violacoes_max_dia || 0) > 0;

        if (temPendenciaEstrita) {
          setSugestoesSelecionadas({
            flexibilizar_obrigatorios: (m.pares_obrigatorios_faltantes || 0) > 0,
            bloquear_recreio_pos_recreio: true,
            busca_exaustiva_60s: tempoEfetivoMs < 60000,
            desafixar_manuais: false,
          });
          setShowModalDiagnosticoUrania(true);
        }
      }
    } catch (e) {
      setErroSolver(e?.response?.data?.error || e?.message || "Erro ao executar o solver. Tente novamente.");
    } finally {
      stopWorkerRef.current = null;
      setRodando(false);
    }
  }

  // ── Aplica as sugestões selecionadas no Modal Urânia+ e regera o horário ──
  async function aplicarSugestoesERegerar() {
    setAplicandoSugestoesUrania(true);
    try {
      const rgAtual =
        solverPayload?.config_pedagogica?.regras_gerais ||
        config?.regras_gerais ||
        {};
      const turnoKey = String(turno || "matutino").toLowerCase();
      const recreioRef =
        rgAtual?.recreio_apos_periodo?.[turnoKey] !== undefined
          ? Number(rgAtual.recreio_apos_periodo[turnoKey])
          : turnoKey.includes("noturno")
          ? 2
          : 3;

      let novaListaPares = Array.isArray(rgAtual.pares_duplas_governanca)
        ? rgAtual.pares_duplas_governanca.map(p => ({ ...p }))
        : [
            { inicio: 1, fim: 2, modo: "prioritario", ordem: 1 },
            { inicio: 4, fim: 5, modo: "prioritario", ordem: 2 },
            { inicio: 2, fim: 3, modo: "permitido", ordem: 3 },
            { inicio: 5, fim: 6, modo: "permitido", ordem: 4 },
            { inicio: 3, fim: 4, modo: "bloqueado", ordem: 5 },
          ];

      let novoBloquearRecreio =
        rgAtual.bloquear_duplas_no_recreio !== undefined
          ? Boolean(rgAtual.bloquear_duplas_no_recreio)
          : true;

      // 1) Se marcou flexibilizar pares obrigatórios -> converte 'obrigatorio' para 'prioritario' mantendo na 1ª posição
      if (sugestoesSelecionadas.flexibilizar_obrigatorios) {
        novaListaPares = novaListaPares.map(p =>
          String(p.modo || "").toLowerCase() === "obrigatorio"
            ? { ...p, modo: "prioritario" }
            : p
        );
      }

      // 2) Se marcou blindar recreio e priorizar pós-recreio (#4-#5)
      if (sugestoesSelecionadas.bloquear_recreio_pos_recreio) {
        novoBloquearRecreio = true;
        novaListaPares = novaListaPares.map(p => {
          if (recreioRef > 0 && Number(p.inicio) === recreioRef) {
            return { ...p, modo: "bloqueado" };
          }
          if (recreioRef > 0 && Number(p.inicio) === recreioRef + 1 && p.modo === "permitido") {
            return { ...p, modo: "prioritario" };
          }
          return p;
        });
      }

      // Reordena colocando obrigatórios/prioritários no topo e bloqueados no fim
      const pesoModo = { obrigatorio: 0, prioritario: 1, permitido: 2, bloqueado: 3 };
      novaListaPares.sort((a, b) => {
        const pa = pesoModo[a.modo] ?? 2;
        const pb = pesoModo[b.modo] ?? 2;
        if (pa !== pb) return pa - pb;
        return (Number(a.ordem) || 99) - (Number(b.ordem) || 99);
      });
      novaListaPares = novaListaPares.map((p, idx) => ({ ...p, ordem: idx + 1 }));

      const novasRegrasGerais = {
        ...rgAtual,
        preferencia_aulas_duplas: true,
        proibir_aulas_separadas_mesmo_dia: true,
        bloquear_duplas_no_recreio: novoBloquearRecreio,
        aulas_duplas_separar_recreio: !novoBloquearRecreio,
        pares_duplas_governanca: novaListaPares,
      };

      // Salva no backend para que a escola já fique com a governança atualizada
      const novaConfigCompleta = {
        turnos: config?.turnos || ["matutino", "vespertino"],
        dias_semana: config?.dias_semana || [1, 2, 3, 4, 5],
        periodos: config?.periodos || { matutino: 6, vespertino: 6 },
        regras_gerais: novasRegrasGerais,
      };

      try {
        await api.post("/api/escola/configuracao-grade", novaConfigCompleta);
        if (typeof onAtualizarConfig === "function") {
          onAtualizarConfig(novaConfigCompleta);
        }
      } catch (errSave) {
        console.warn("[Urânia+] Falha ao persistir config, aplicando em memória:", errSave?.message);
      }

      const novoTempo = sugestoesSelecionadas.busca_exaustiva_60s ? 60000 : tempoMaximoMs;
      const novoRespeitarManual = sugestoesSelecionadas.desafixar_manuais
        ? false
        : respeitarHorarioManual;

      if (sugestoesSelecionadas.busca_exaustiva_60s) setTempoMaximoMs(60000);
      if (sugestoesSelecionadas.desafixar_manuais) setRespeitarHorarioManual(false);

      setShowModalDiagnosticoUrania(false);
      await executarSolver({
        maxTimeMs: novoTempo,
        respeitarHorarioManual: novoRespeitarManual,
        customRegrasGerais: novasRegrasGerais,
      });
    } finally {
      setAplicandoSugestoesUrania(false);
    }
  }

  // ── Avaliador em tempo real de viabilidade de troca/movimento ──
  const avaliarDestino = useCallback(
    (turmaId, diaDestino, ordemDestino) => {
      if (!selecao || !resultado) return null;
      if (Number(selecao.turmaId) !== Number(turmaId)) return null;

      const tId = Number(turmaId);
      const dDest = Number(diaDestino);
      const oDest = Number(ordemDestino);
      const profA = Number(selecao.professor_id);
      const nomeProfA = nomesProfessores[profA] || `Prof. ${profA}`;

      // Se for o próprio slot de origem
      if (
        selecao.tipo === "slot" &&
        Number(selecao.dia) === dDest &&
        Number(selecao.ordem) === oDest
      ) {
        return {
          status: "origem",
          label: "Selecionada",
          motivo: "Aula selecionada para movimentação. Clique novamente para cancelar.",
        };
      }

      const gpt = resultado.grade_por_turma || {};
      const gpp = resultado.grade_por_professor || {};
      const slotDestino = gpt[tId]?.[dDest]?.[oDest] || null;

      // 1) Verifica se Prof A tem colisão em OUTRA turma no horário de destino (dDest, oDest)
      const ocupProfAEmDest = gpp[profA]?.[dDest]?.[oDest] || null;
      if (ocupProfAEmDest && Number(ocupProfAEmDest.turma_id) !== tId) {
        const outraTurmaNome =
          nomesTurmas[ocupProfAEmDest.turma_id] || `Turma ${ocupProfAEmDest.turma_id}`;
        return {
          status: "bloqueado",
          label: "Choque",
          resumoCurto: `Em ${outraTurmaNome}`,
          motivo: `🚫 Bloqueado: ${nomeProfA} já está alocado(a) na ${outraTurmaNome} em ${DIAS_CURTO[dDest]} #${oDest}ª aula.`,
        };
      }

      // 2) Verifica disponibilidade de Prof A no destino
      const statusDispoA = dispoIndex.get(`${profA}|${dDest}|${oDest}`);
      if (statusDispoA === "indisponivel") {
        return {
          status: "indisponivel",
          label: "Indisponível",
          resumoCurto: `${nomeProfA.split(" ")[0]} indisp.`,
          motivo: `🚫 Indisponibilidade: ${nomeProfA} marcou indisponibilidade em ${DIAS_CURTO[dDest]} #${oDest}ª aula.`,
        };
      }

      // Caso A: Slot de destino está VAZIO na turma
      if (!slotDestino) {
        if (statusDispoA === "evitar") {
          return {
            status: "aviso",
            label: "Evitar",
            motivo: `🟡 Horário livre, porém marcado como 'Evitar' por ${nomeProfA}. Clique para mover mesmo assim.`,
          };
        }
        return {
          status: "livre",
          label: "Mover cá",
          motivo: `🟢 Mover ${nomesDisciplinas[selecao.disciplina_id] || "aula"} (${nomeProfA}) para ${DIAS_CURTO[dDest]} #${oDest}ª aula.`,
        };
      }

      // Caso B: Slot de destino está OCUPADO por (profB, discB)
      const profB = Number(slotDestino.professor_id);
      const discB = Number(slotDestino.disciplina_id);
      const nomeProfB = nomesProfessores[profB] || `Prof. ${profB}`;
      const nomeDiscB = nomesDisciplinas[discB] || `Disc. ${discB}`;

      // Se estamos alocando uma aula pendente (nao_alocada) em cima de um slot ocupado:
      if (selecao.tipo === "nao_alocada") {
        if (slotDestino.locked) {
          return {
            status: "aviso",
            label: "Fixo 📌",
            ocupanteProfNome: nomeProfB.split(" ")[0],
            motivo: `🟡 Substituir ${nomeDiscB} (${nomeProfB} — fixado manualmente) por esta aula pendente.`,
          };
        }
        return {
          status: "aviso",
          label: "Substituir",
          ocupanteProfNome: nomeProfB.split(" ")[0],
          motivo: `🟡 Colocar esta aula aqui e devolver ${nomeDiscB} (${nomeProfB}) para a lista de pendentes.`,
        };
      }

      // Se estamos trocando 2 slots (dOrig, oOrig) <-> (dDest, oDest):
      const dOrig = Number(selecao.dia);
      const oOrig = Number(selecao.ordem);

      // Verifica se Prof B tem colisão em OUTRA turma no horário de origem (dOrig, oOrig)
      const ocupProfBEmOrig = gpp[profB]?.[dOrig]?.[oOrig] || null;
      if (ocupProfBEmOrig && Number(ocupProfBEmOrig.turma_id) !== tId) {
        const outraTurmaB =
          nomesTurmas[ocupProfBEmOrig.turma_id] || `Turma ${ocupProfBEmOrig.turma_id}`;
        return {
          status: "bloqueado",
          label: "Choque Volta",
          resumoCurto: `${nomeProfB.split(" ")[0]} em ${outraTurmaB}`,
          motivo: `🚫 Bloqueado na troca: ${nomeProfB} (${nomeDiscB}) já está na ${outraTurmaB} em ${DIAS_CURTO[dOrig]} #${oOrig}ª aula.`,
        };
      }

      // Verifica disponibilidade de Prof B no horário de origem (dOrig, oOrig)
      const statusDispoB = dispoIndex.get(`${profB}|${dOrig}|${oOrig}`);
      if (statusDispoB === "indisponivel") {
        return {
          status: "indisponivel",
          label: "Indisp. Volta",
          resumoCurto: `${nomeProfB.split(" ")[0]} indisp.`,
          motivo: `🚫 Indisponibilidade na troca: ${nomeProfB} (${nomeDiscB}) está indisponível em ${DIAS_CURTO[dOrig]} #${oOrig}ª aula.`,
        };
      }

      if (slotDestino.locked) {
        return {
          status: "aviso",
          label: "Fixo 📌",
          ocupanteProfNome: nomeProfB.split(" ")[0],
          motivo: `🟡 ${nomeDiscB} (${nomeProfB}) está fixado manualmente (📌). Clique se desejar trocar mesmo assim.`,
        };
      }

      if (statusDispoA === "evitar" || statusDispoB === "evitar") {
        return {
          status: "aviso",
          label: "Evitar",
          ocupanteProfNome: nomeProfB.split(" ")[0],
          motivo: `🟡 Troca sem colisão, mas envolve horário marcado como 'Evitar'. Clique para confirmar a troca.`,
        };
      }

      return {
        status: "livre",
        label: "Trocar ⇄",
        ocupanteProfNome: nomeProfB.split(" ")[0],
        motivo: `🟢 Trocar ${nomesDisciplinas[selecao.disciplina_id] || "aula"} (${nomeProfA}) ⇄ ${nomeDiscB} (${nomeProfB}).`,
      };
    },
    [selecao, resultado, nomesProfessores, nomesTurmas, nomesDisciplinas, dispoIndex]
  );

  // ── Atualiza estado da grade após edição interativa ───────────
  function atualizarGradePosEdicao(novoGpt, novoGpp, mensagemFeedback) {
    const {
      metrics: novasMetricas,
      nao_alocadas: novasNaoAlocadas,
      divergencias_pares_obrigatorios: novasDivergenciasObrigatorios,
    } = recalcularMetricasEDiagnostico(novoGpt, solverPayload, resultado?.metrics);

    setResultado((prev) => ({
      ...prev,
      grade_por_turma: novoGpt,
      grade_por_professor: novoGpp,
      metrics: novasMetricas,
      nao_alocadas: novasNaoAlocadas,
      diagnostico: {
        ...(prev?.diagnostico || {}),
        nao_alocadas_detalhado: novasNaoAlocadas,
        divergencias_pares_obrigatorios: novasDivergenciasObrigatorios || [],
      },
    }));
    setTemAlteracoesNaoSalvas(true);
    if (mensagemFeedback) {
      setMsgAcao(mensagemFeedback);
      setTimeout(() => setMsgAcao(""), 4500);
    }
  }

  // ── Clique em qualquer célula da grade (Turma ou Professor) ───
  function handleCellClick({ turmaId, dia, ordem, slot }) {
    if (!resultado) return;
    const tId = Number(turmaId);
    const dNum = Number(dia);
    const oNum = Number(ordem);

    // 1) Se não há seleção ativa (ou clicou em outra turma diferente da selecionada):
    if (!selecao || Number(selecao.turmaId) !== tId) {
      if (!slot) return; // clicar em célula vazia sem seleção não faz nada
      setSelecao({
        tipo: "slot",
        turmaId: tId,
        dia: dNum,
        ordem: oNum,
        disciplina_id: Number(slot.disciplina_id),
        professor_id: Number(slot.professor_id),
        locked: Boolean(slot.locked),
      });
      return;
    }

    // 2) Se clicou no próprio slot de origem, cancela a seleção
    if (
      selecao.tipo === "slot" &&
      Number(selecao.dia) === dNum &&
      Number(selecao.ordem) === oNum
    ) {
      setSelecao(null);
      return;
    }

    // 3) Avalia a viabilidade do destino clicado
    const aval = avaliarDestino(tId, dNum, oNum);
    if (!aval) return;

    if (aval.status === "bloqueado" || aval.status === "indisponivel") {
      setMsgAcao(aval.motivo || "⚠️ Movimento bloqueado por conflito de horário.");
      setTimeout(() => setMsgAcao(""), 5000);
      return;
    }

    // 4) Executa a movimentação ou troca!
    const novoGpt = structuredClone
      ? structuredClone(resultado.grade_por_turma || {})
      : JSON.parse(JSON.stringify(resultado.grade_por_turma || {}));
    const novoGpp = structuredClone
      ? structuredClone(resultado.grade_por_professor || {})
      : JSON.parse(JSON.stringify(resultado.grade_por_professor || {}));

    const ensure = (obj, k1, k2) => {
      if (!obj[k1]) obj[k1] = {};
      if (!obj[k1][k2]) obj[k1][k2] = {};
    };

    const profA = Number(selecao.professor_id);
    const discA = Number(selecao.disciplina_id);
    const slotDest = novoGpt[tId]?.[dNum]?.[oNum] || null;

    if (selecao.tipo === "nao_alocada") {
      // Se havia aula no destino, limpa do professor B
      if (slotDest && slotDest.professor_id) {
        const profB = Number(slotDest.professor_id);
        if (novoGpp[profB]?.[dNum]) novoGpp[profB][dNum][oNum] = null;
      }
      ensure(novoGpt, tId, dNum);
      ensure(novoGpp, profA, dNum);
      novoGpt[tId][dNum][oNum] = {
        disciplina_id: discA,
        professor_id: profA,
        locked: false,
        origem: "manual",
      };
      novoGpp[profA][dNum][oNum] = {
        turma_id: tId,
        disciplina_id: discA,
        locked: false,
        origem: "manual",
      };

      setSelecao(null);
      atualizarGradePosEdicao(
        novoGpt,
        novoGpp,
        `✅ Aula de ${nomesDisciplinas[discA] || "disciplina"} alocada em ${DIAS_CURTO[dNum]} #${oNum}ª aula! Clique em 📋 Salvar Rascunho para gravar.`
      );
      return;
    }

    // Caso padrão: troca ou movimento entre (dOrig, oOrig) e (dNum, oNum) na mesma turma
    const dOrig = Number(selecao.dia);
    const oOrig = Number(selecao.ordem);
    const slotOrig = novoGpt[tId]?.[dOrig]?.[oOrig] || {
      disciplina_id: discA,
      professor_id: profA,
      locked: Boolean(selecao.locked),
    };

    // Limpa origem
    if (novoGpt[tId]?.[dOrig]) novoGpt[tId][dOrig][oOrig] = null;
    if (novoGpp[profA]?.[dOrig]) novoGpp[profA][dOrig][oOrig] = null;

    if (slotDest && slotDest.professor_id) {
      const profB = Number(slotDest.professor_id);
      const discB = Number(slotDest.disciplina_id);

      // Limpa destino de Prof B
      if (novoGpp[profB]?.[dNum]) novoGpp[profB][dNum][oNum] = null;

      // Coloca B na origem
      ensure(novoGpt, tId, dOrig);
      ensure(novoGpp, profB, dOrig);
      novoGpt[tId][dOrig][oOrig] = {
        disciplina_id: discB,
        professor_id: profB,
        locked: Boolean(slotDest.locked),
        origem: slotDest.origem || "solver",
      };
      novoGpp[profB][dOrig][oOrig] = {
        turma_id: tId,
        disciplina_id: discB,
        locked: Boolean(slotDest.locked),
        origem: slotDest.origem || "solver",
      };
    }

    // Coloca A no destino
    ensure(novoGpt, tId, dNum);
    ensure(novoGpp, profA, dNum);
    novoGpt[tId][dNum][oNum] = {
      disciplina_id: discA,
      professor_id: profA,
      locked: Boolean(slotOrig.locked),
      origem: slotOrig.origem || "solver",
    };
    novoGpp[profA][dNum][oNum] = {
      turma_id: tId,
      disciplina_id: discA,
      locked: Boolean(slotOrig.locked),
      origem: slotOrig.origem || "solver",
    };

    setSelecao(null);
    atualizarGradePosEdicao(
      novoGpt,
      novoGpp,
      slotDest
        ? `✅ Troca realizada (${DIAS_CURTO[dOrig]} #${oOrig} ⇄ ${DIAS_CURTO[dNum]} #${oNum})! Clique em 📋 Salvar Rascunho para gravar.`
        : `✅ Aula movida para ${DIAS_CURTO[dNum]} #${oNum}ª aula! Clique em 📋 Salvar Rascunho para gravar.`
    );
  }

  // ── Fixar / Desafixar (📌) um horário diretamente na grade ─────
  function handleToggleLock({ turmaId, dia, ordem, slot }) {
    if (!resultado || !slot) return;
    const tId = Number(turmaId);
    const dNum = Number(dia);
    const oNum = Number(ordem);
    const pId = Number(slot.professor_id);
    const novoLocked = !slot.locked;

    const novoGpt = structuredClone
      ? structuredClone(resultado.grade_por_turma || {})
      : JSON.parse(JSON.stringify(resultado.grade_por_turma || {}));
    const novoGpp = structuredClone
      ? structuredClone(resultado.grade_por_professor || {})
      : JSON.parse(JSON.stringify(resultado.grade_por_professor || {}));

    if (novoGpt[tId]?.[dNum]?.[oNum]) {
      novoGpt[tId][dNum][oNum].locked = novoLocked;
      novoGpt[tId][dNum][oNum].origem = novoLocked ? "manual" : "solver";
    }
    if (novoGpp[pId]?.[dNum]?.[oNum]) {
      novoGpp[pId][dNum][oNum].locked = novoLocked;
      novoGpp[pId][dNum][oNum].origem = novoLocked ? "manual" : "solver";
    }

    if (
      selecao &&
      selecao.tipo === "slot" &&
      Number(selecao.turmaId) === tId &&
      Number(selecao.dia) === dNum &&
      Number(selecao.ordem) === oNum
    ) {
      setSelecao((prev) => (prev ? { ...prev, locked: novoLocked } : null));
    }

    atualizarGradePosEdicao(
      novoGpt,
      novoGpp,
      novoLocked
        ? `📌 Aula fixada em ${DIAS_CURTO[dNum]} #${oNum}ª aula! O solver não moverá este horário.`
        : `🔓 Aula desafixada em ${DIAS_CURTO[dNum]} #${oNum}ª aula.`
    );
  }

  // ── Remover aula selecionada do slot (esvaziar horário) ───────
  function removerAulaSelecionada() {
    if (!resultado || !selecao || selecao.tipo !== "slot") return;
    const tId = Number(selecao.turmaId);
    const dNum = Number(selecao.dia);
    const oNum = Number(selecao.ordem);
    const pId = Number(selecao.professor_id);

    const novoGpt = structuredClone
      ? structuredClone(resultado.grade_por_turma || {})
      : JSON.parse(JSON.stringify(resultado.grade_por_turma || {}));
    const novoGpp = structuredClone
      ? structuredClone(resultado.grade_por_professor || {})
      : JSON.parse(JSON.stringify(resultado.grade_por_professor || {}));

    if (novoGpt[tId]?.[dNum]) novoGpt[tId][dNum][oNum] = null;
    if (novoGpp[pId]?.[dNum]) novoGpp[pId][dNum][oNum] = null;

    setSelecao(null);
    atualizarGradePosEdicao(
      novoGpt,
      novoGpp,
      `🗑️ Horário ${DIAS_CURTO[dNum]} #${oNum}ª aula esvaziado.`
    );
  }

  // ── Iniciar alocação de uma aula pendente (da lista de não-alocadas) ──
  function iniciarAlocacaoPendente(na) {
    setViewMode("turma");
    setSelecao({
      tipo: "nao_alocada",
      turmaId: Number(na.turma_id),
      disciplina_id: Number(na.disciplina_id),
      professor_id: Number(na.professor_id),
    });
    setTimeout(() => {
      const el = document.getElementById(`card-turma-${na.turma_id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  // ── Extrai array de slots da grade em tela ───────────────────
  function extrairSlotsDaGradeAtual() {
    const slots = [];
    const gpt = resultado?.grade_por_turma || {};
    for (const [turmaId, porDia] of Object.entries(gpt)) {
      for (const [dia, porOrdem] of Object.entries(porDia || {})) {
        for (const [ordem, cell] of Object.entries(porOrdem || {})) {
          if (cell && cell.professor_id && cell.disciplina_id) {
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
    return slots;
  }

  // ── Salvar rascunho ──────────────────────────────────────────
  async function salvarRascunho() {
    if (!resultado) return;
    setSalvando(true);
    setMsgAcao("");
    try {
      const slots = extrairSlotsDaGradeAtual();
      await api.post("/api/grade/rascunho", {
        turno: turno.toLowerCase(),
        turma_ids: turmas.map(t => t.id),
        slots,
      });
      setTemAlteracoesNaoSalvas(false);
      setResultado((prev) => (prev ? { ...prev, origem_carregamento: "rascunho" } : prev));
      setMsgAcao("✅ Rascunho salvo com sucesso!");
    } catch (e) {
      setMsgAcao(`⚠️ Erro ao salvar rascunho: ${e?.response?.data?.error || "tente novamente"}`);
    } finally {
      setSalvando(false);
      setTimeout(() => setMsgAcao(""), 4000);
    }
  }

  // ── Publicar grade (salva rascunho atual automaticamente antes de promover) ──
  function publicarGrade() {
    setShowModalPublicar(true);
  }

  async function executarPublicacao() {
    setShowModalPublicar(false);
    setPublicando(true);
    setMsgAcao("");
    try {
      // 1) Garante que a grade em tela está salva no rascunho antes de publicar
      const slots = extrairSlotsDaGradeAtual();
      if (slots.length > 0) {
        await api.post("/api/grade/rascunho", {
          turno: turno.toLowerCase(),
          turma_ids: turmas.map(t => t.id),
          slots,
        });
      }
      // 2) Promove o rascunho para publicado
      await api.post("/api/grade/publicar", {
        turno: turno.toLowerCase(),
        descricao: `Grade ${turno} — publicada em ${new Date().toLocaleDateString("pt-BR")}`,
      });
      setTemAlteracoesNaoSalvas(false);
      setResultado((prev) => (prev ? { ...prev, origem_carregamento: "publicado" } : prev));
      setMsgAcao("🎉 Grade publicada com sucesso!");
    } catch (e) {
      setMsgAcao(`⚠️ ${e?.response?.data?.error || "Erro ao publicar a grade."}`);
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

  const diasPadrao =
    Array.isArray(solverPayload?.dias_semana) && solverPayload.dias_semana.length > 0
      ? solverPayload.dias_semana.map(Number)
      : [1, 2, 3, 4, 5];
  const periodosPadrao = Number(solverPayload?.periodos_por_dia) || 6;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Montserrat', sans-serif",
      display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
      overflowY: "auto", position: "relative",
    }}>
      {/* ── Barra superior ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid #e2e8f0",
        background: "#fff", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e3a5f" }}>
                Gerar Horário
              </h2>
              {resultado && !rodando && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: temAlteracoesNaoSalvas
                    ? "#fef3c7"
                    : resultado.origem_carregamento === "publicado"
                      ? "#dcfce7"
                      : "#e0f2fe",
                  color: temAlteracoesNaoSalvas
                    ? "#b45309"
                    : resultado.origem_carregamento === "publicado"
                      ? "#15803d"
                      : "#0369a1",
                  border: `1px solid ${
                    temAlteracoesNaoSalvas
                      ? "#fcd34d"
                      : resultado.origem_carregamento === "publicado"
                        ? "#86efac"
                        : "#bae6fd"
                  }`,
                }}>
                  {temAlteracoesNaoSalvas
                    ? "✨ Alterações não salvas"
                    : resultado.origem_carregamento === "publicado"
                      ? `🌐 Grade Publicada${resultado.meta_persistencia?.version ? ` (v${resultado.meta_persistencia.version})` : ""}`
                      : "📝 Rascunho Salvo"}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
              Motor Solver 2.0 • Clique em qualquer aula da grade para mover ou trocar horários
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
            title="Mantém intactas as aulas fixadas (📌) e gera apenas as aulas restantes"
          >
            <input
              type="checkbox"
              checked={respeitarHorarioManual}
              disabled={rodando}
              onChange={(e) => setRespeitarHorarioManual(e.target.checked)}
              style={{ accentColor: "#2563eb", cursor: "pointer" }}
            />
            📌 Respeitar Aulas Fixas
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

          {/* Botão principal: Gerar / Recalcular */}
          <button
            onClick={executarSolver}
            disabled={rodando || carregandoInicial || turmas.length === 0}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
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
            ) : resultado ? "⚡ Gerar Novamente" : "⚡ Gerar Horário"}
          </button>

          {/* Ações pós-geração */}
          {resultado && !rodando && (
            <>
              <button
                type="button"
                onClick={() => setShowModalExportar(true)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#f8fafc",
                  color: "#1e293b",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                title="Imprimir ou exportar PDF (Quadro Geral do Turno, Por Turma ou Por Professor)"
              >
                🖨️ Imprimir / PDF
              </button>
              <button
                onClick={salvarRascunho}
                disabled={salvando || publicando}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: temAlteracoesNaoSalvas ? "2px solid #0284c7" : "1px solid #0284c7",
                  background: temAlteracoesNaoSalvas ? "#e0f2fe" : "#f0f9ff",
                  color: "#0369a1",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  boxShadow: temAlteracoesNaoSalvas ? "0 0 0 3px rgba(2,132,199,0.15)" : "none",
                }}
              >
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
            width: "100%",
            padding: "8px 14px",
            borderRadius: 8,
            background: msgAcao.startsWith("✅") || msgAcao.startsWith("🎉") || msgAcao.startsWith("📌")
              ? "#f0fdf4"
              : "#fffbeb",
            border: `1px solid ${
              msgAcao.startsWith("✅") || msgAcao.startsWith("🎉") || msgAcao.startsWith("📌")
                ? "#bbf7d0"
                : "#fde68a"
            }`,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            color: msgAcao.startsWith("✅") || msgAcao.startsWith("🎉") || msgAcao.startsWith("📌")
              ? "#15803d"
              : "#b45309",
          }}>
            {msgAcao}
          </div>
        )}
      </div>

      {/* ── Barra Flutuante de Edição Interativa (quando uma aula está selecionada) ── */}
      {selecao && !rodando && (
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "linear-gradient(90deg, #1e3a8a, #1d4ed8)",
          color: "#fff",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.22)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              background: "rgba(255,255,255,0.2)",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
            }}>
              {selecao.tipo === "nao_alocada" ? "🎯 ALOCANDO PENDENTE" : "🔄 MODO TROCA / MOVER"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              <strong>{nomesDisciplinas[selecao.disciplina_id] || `Disc ${selecao.disciplina_id}`}</strong>
              {" • "}
              {nomesProfessores[selecao.professor_id] || `Prof ${selecao.professor_id}`}
              {" • "}
              <span style={{ opacity: 0.9 }}>
                {nomesTurmas[selecao.turmaId] || `Turma ${selecao.turmaId}`}
                {selecao.tipo === "slot" ? ` (${DIAS_LABEL[selecao.dia]} — ${selecao.ordem}ª aula)` : ""}
              </span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, opacity: 0.9, marginRight: 4 }}>
              Clique em um slot <strong>🟢 Verde</strong> (livre/troca válida) ou <strong>🟡 Amarelo</strong>:
            </span>

            {selecao.tipo === "slot" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleLock({
                      turmaId: selecao.turmaId,
                      dia: selecao.dia,
                      ordem: selecao.ordem,
                      slot: {
                        disciplina_id: selecao.disciplina_id,
                        professor_id: selecao.professor_id,
                        locked: selecao.locked,
                      },
                    })
                  }
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.35)",
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {selecao.locked ? "🔓 Desafixar" : "📌 Fixar Horário"}
                </button>
                <button
                  type="button"
                  onClick={removerAulaSelecionada}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "1px solid rgba(252,165,165,0.5)",
                    background: "rgba(239,68,68,0.25)",
                    color: "#fee2e2",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🗑️ Esvaziar Slot
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelecao(null)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "none",
                background: "#fff",
                color: "#1e3a8a",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ✖ Cancelar (ESC)
            </button>
          </div>
        </div>
      )}

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, padding: "24px 24px 40px", overflowY: "auto" }}>

        {/* Estado inicial (quando ainda não há rascunho nem publicado no banco) */}
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
              {carregandoInicial
                ? "Verificando turmas e horários salvos para este turno…"
                : turmas.length === 0
                  ? "Nenhuma turma encontrada para o turno selecionado."
                  : `${turmas.length} turmas prontas para o turno ${turno}. Clique em ⚡ Gerar Horário para calcular a grade usando Cadeias de Kempe e Busca Tabu.`}
            </p>
            {turmas.length > 0 && !carregandoInicial && (
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
                  sub={
                    telemetry
                      ? `em ${telemetry.iteracoes} ciclo(s) (${(telemetry.tempo_ms / 1000).toFixed(1)}s)`
                      : resultado.origem_carregamento === "publicado"
                        ? "Grade Publicada"
                        : "Grade Carregada"
                  }
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
                {metrics.pares_geminados !== undefined && (
                  <MetricCard
                    label="Duplas Geminadas"
                    value={metrics.pares_geminados}
                    sub={
                      (metrics.violacoes_pares_bloqueados || 0) === 0
                        ? "0 cortadas pelo recreio"
                        : `${metrics.violacoes_pares_bloqueados} em par bloqueado`
                    }
                    icon="🔗"
                    color={(metrics.violacoes_pares_bloqueados || 0) === 0 ? "#0284c7" : "#d97706"}
                  />
                )}
                {(metrics.pares_obrigatorios_meta || 0) > 0 && (
                  <MetricCard
                    label="Pares Obrigatórios"
                    value={`${metrics.pares_obrigatorios_atendidos || 0}/${metrics.pares_obrigatorios_meta}`}
                    sub={
                      (metrics.pares_obrigatorios_faltantes || 0) === 0
                        ? "100% atendidos 🔒"
                        : `${metrics.pares_obrigatorios_faltantes} janela(s) c/ simples`
                    }
                    icon="🔒"
                    color={(metrics.pares_obrigatorios_faltantes || 0) === 0 ? "#7c3aed" : "#dc2626"}
                  />
                )}
                <MetricCard
                  label="Turmas"
                  value={turmas.length || Object.keys(resultado.grade_por_turma || {}).length}
                  icon="🏫"
                  color="#1e3a5f"
                />
                <MetricCard
                  label="Professores"
                  value={resultado.payload_summary?.professores || Object.keys(resultado.grade_por_professor || {}).length}
                  icon="👨‍🏫"
                  color="#1e3a5f"
                />
              </div>
            </div>

            {/* ── Banner Urânia+: Pares Obrigatórios não fechados 100% ou Divergências de Governança ── */}
            {((resultado.metrics?.violacoes_indisponibilidade || 0) > 0 ||
              (resultado.metrics?.pares_obrigatorios_faltantes || 0) > 0 ||
              (resultado.metrics?.violacoes_separadas_mesmo_dia || 0) > 0 ||
              (resultado.metrics?.violacoes_max_dia || 0) > 0 ||
              (resultado.metrics?.violacoes_pares_bloqueados || 0) > 0) && (
              <div
                style={{
                  background: "linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)",
                  border: "1.5px solid #f97316",
                  borderRadius: 12,
                  padding: "16px 20px",
                  marginBottom: 16,
                  fontSize: 13,
                  color: "#9a3412",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 14,
                  boxShadow: "0 4px 12px rgba(249, 115, 22, 0.08)",
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <strong style={{ display: "block", marginBottom: 4, fontSize: 14, color: "#7c2d12" }}>
                    {(resultado.metrics?.violacoes_indisponibilidade || 0) > 0
                      ? `⛔ Atenção: ${resultado.metrics.violacoes_indisponibilidade} aula(s) estão em horários marcados como EXCLUIR na Disponibilidade dos Professores!`
                      : (resultado.metrics?.pares_obrigatorios_faltantes || 0) > 0
                      ? `🔒 Atenção: ${resultado.metrics.pares_obrigatorios_atendidos}/${resultado.metrics.pares_obrigatorios_meta} janelas de Pares Obrigatórios atendidas (${resultado.metrics.pares_obrigatorios_faltantes} janela(s) ficaram com aulas simples)`
                      : `⚠️ Grade com divergências de governança: ${resultado.metrics?.violacoes_separadas_mesmo_dia || 0} separada(s) no dia • ${resultado.metrics?.violacoes_max_dia || 0} acima do limite • ${resultado.metrics?.violacoes_pares_bloqueados || 0} dupla(s) cortada(s) pelo recreio`}
                  </strong>
                  <span style={{ fontSize: 12.5, color: "#9a3412", lineHeight: 1.5 }}>
                    {(resultado.metrics?.violacoes_indisponibilidade || 0) > 0
                      ? "A disponibilidade de algum professor foi alterada para 'Excluir' após a geração deste rascunho. Clique em '⚡ Tentar Regerar' para realocar automaticamente todas as aulas respeitando 100% os horários excluídos."
                      : (resultado.metrics?.pares_obrigatorios_faltantes || 0) > 0
                      ? "Devido à combinação de disciplinas com carga ímpar (5h/3h/1h) e professores com 30/30 aulas, não foi matematicamente possível geminar 100% dos blocos obrigatórios sem desassistir turmas. Abra o Assistente Urânia+ para ver as janelas exatas ou aplicar sugestões de fechamento."
                      : "Esta grade possui divergências em relação às regras atuais de governança de pares/recreio. Utilize o Assistente Urânia+ ou regere a grade."}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setShowModalDiagnosticoUrania(true)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 8,
                      border: "1.5px solid #7c3aed",
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 3px 10px rgba(124, 58, 237, 0.25)",
                    }}
                  >
                    🧠 Assistente de Fechamento (Urânia+)
                  </button>
                  <button
                    type="button"
                    onClick={() => executarSolver()}
                    disabled={rodando}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 8,
                      border: "1px solid #ea580c",
                      background: "#fff",
                      color: "#ea580c",
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ⚡ Tentar Regerar (Fase 0 Bipartida)
                  </button>
                </div>
              </div>
            )}

            {/* ── Alertas de não-alocadas (com botão interativo de Alocar na Grade!) ── */}
            {naoAloc > 0 && (
              <div style={{
                background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10,
                padding: "14px 18px", marginBottom: 16, fontSize: 13, color: "#92400e",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <strong>⚠️ {naoAloc} aula(s) pendente(s) de alocação</strong>
                  <span style={{ fontSize: 11, color: "#b45309" }}>
                    Dica: clique em <strong>🎯 Alocar na Grade</strong> ao lado da aula para encaixá-la manualmente na turma.
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {naoAlocLista.slice(0, 15).map((na, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255,255,255,0.65)",
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #fde68a",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        <strong>
                          {String(nomesTurmas[na.turma_id] || na.turma_id).toUpperCase().includes("TURMA") ? "" : "Turma "}
                          {nomesTurmas[na.turma_id] || na.turma_id}
                        </strong>
                        {" — "}
                        {nomesDisciplinas[na.disciplina_id] || na.disciplina_id} (
                        {nomesProfessores[na.professor_id] || na.professor_id})
                        {na.motivo && na.motivo !== "PENDENTE_ALOCACAO" && (
                          <strong style={{ color: "#b71c1c", marginLeft: 6 }}>({na.motivo})</strong>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => iniciarAlocacaoPendente(na)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid #d97706",
                          background: "#fef3c7",
                          color: "#92400e",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🎯 Alocar na Grade
                      </button>
                    </div>
                  ))}
                  {naoAlocLista.length > 15 && (
                    <div style={{ fontSize: 12, paddingLeft: 4 }}>
                      ... e mais {naoAlocLista.length - 15} aula(s) pendente(s)
                    </div>
                  )}
                </div>
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

            {/* ── Toggle de visão e alternância Rascunho/Publicado ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16, flexWrap: "wrap", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>
                  Grade Horária — {turno}
                </h3>
                <span style={{
                  fontSize: 11,
                  color: "#475569",
                  background: "#f1f5f9",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}>
                  💡 <strong>Edição Rápida:</strong> Clique em qualquer aula para mover/trocar ou no pino <strong>📌</strong> para travar
                </span>

                {dadosRascunhoSalvo && dadosPublicadoSalvo && !temAlteracoesNaoSalvas && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() =>
                        aplicarGradeDoBanco(dadosRascunhoSalvo, "rascunho", turmas, {
                          payload: solverPayload,
                          warnings_payload: resultado.warnings_payload,
                          payload_summary: resultado.payload_summary,
                        })
                      }
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "1px solid #0284c7",
                        background: resultado.origem_carregamento === "rascunho" ? "#0284c7" : "#fff",
                        color: resultado.origem_carregamento === "rascunho" ? "#fff" : "#0284c7",
                      }}
                    >
                      Ver Rascunho
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        aplicarGradeDoBanco(dadosPublicadoSalvo, "publicado", turmas, {
                          payload: solverPayload,
                          warnings_payload: resultado.warnings_payload,
                          payload_summary: resultado.payload_summary,
                        })
                      }
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "1px solid #16a34a",
                        background: resultado.origem_carregamento === "publicado" ? "#16a34a" : "#fff",
                        color: resultado.origem_carregamento === "publicado" ? "#fff" : "#16a34a",
                      }}
                    >
                      Ver Publicada
                    </button>
                  </div>
                )}
              </div>

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
                    .filter(([tId]) => turmas.length === 0 || turmas.some((t) => Number(t.id) === Number(tId)))
                    .sort(([idA], [idB]) => {
                      const nA = (nomesTurmas[idA] || String(idA)).toUpperCase();
                      const nB = (nomesTurmas[idB] || String(idB)).toUpperCase();
                      return nA.localeCompare(nB, "pt-BR", { numeric: true });
                    })
                    .map(([turmaId, grade]) => {
                      const isTurmaAtiva = selecao && Number(selecao.turmaId) === Number(turmaId);
                      return (
                        <div
                          key={turmaId}
                          id={`card-turma-${turmaId}`}
                          style={{
                            background: "#fff",
                            border: isTurmaAtiva ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            borderRadius: 12,
                            overflow: "hidden",
                            boxShadow: isTurmaAtiva
                              ? "0 4px 20px rgba(37,99,235,0.15)"
                              : "0 1px 3px rgba(0,0,0,0.06)",
                            transition: "all 0.2s",
                          }}
                        >
                          <div style={{
                            padding: "10px 16px",
                            borderBottom: "1px solid #e2e8f0",
                            background: isTurmaAtiva ? "#eff6ff" : "#f8fafc",
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#1e3a5f",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}>
                            <span>
                              🏫 {String(nomesTurmas[turmaId] || turmaId).toUpperCase().includes("TURMA") ? "" : "Turma "}
                              {nomesTurmas[turmaId] || turmaId}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {isTurmaAtiva && (
                                <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>
                                  🎯 Selecione o horário de destino nesta turma
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  imprimirHorarioTurmaUnica({
                                    turmaId: Number(turmaId),
                                    gradePorTurma: resultado.grade_por_turma,
                                    nomesTurmas,
                                    nomesDisciplinas,
                                    nomesProfessores,
                                    diasSemana: diasPadrao,
                                    periodosPorDia: periodosPadrao,
                                    turno,
                                  })
                                }
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  color: "#334155",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                title="Imprimir horário desta turma"
                              >
                                🖨️ Imprimir Turma
                              </button>
                            </div>
                          </div>
                          <div style={{ padding: 12 }}>
                            <GradeTurma
                              turma={{ id: Number(turmaId), nome: nomesTurmas[turmaId] || turmaId }}
                              resultado={resultado}
                              periodosPorDia={buildPeriodosPorDia(grade, diasPadrao, periodosPadrao)}
                              maps={{ disciplinaById: nomesDisciplinas, professorById: nomesProfessores }}
                              layoutMode="dias-colunas"
                              interativo={true}
                              selecao={selecao}
                              avaliarDestino={avaliarDestino}
                              onCellClick={handleCellClick}
                              onToggleLock={handleToggleLock}
                            />
                          </div>
                        </div>
                      );
                    })
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
                    .map(([profId, grade]) => {
                      const isProfAtivo = selecao && Number(selecao.professor_id) === Number(profId);
                      return (
                        <div
                          key={profId}
                          style={{
                            background: "#fff",
                            border: isProfAtivo ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            borderRadius: 12,
                            overflow: "hidden",
                            boxShadow: isProfAtivo
                              ? "0 4px 20px rgba(37,99,235,0.15)"
                              : "0 1px 3px rgba(0,0,0,0.06)",
                          }}
                        >
                          <div style={{
                            padding: "10px 16px",
                            borderBottom: "1px solid #e2e8f0",
                            background: isProfAtivo ? "#eff6ff" : "#f8fafc",
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#1e3a5f",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}>
                            <span>👨‍🏫 {nomesProfessores[profId] || `Professor ${profId}`}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {isProfAtivo && (
                                <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>
                                  🎯 Clique em um horário livre (🟢) para mover/trocar a aula na turma{" "}
                                  {nomesTurmas[selecao.turmaId] || selecao.turmaId}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  imprimirHorarioProfessorUnico({
                                    profId: Number(profId),
                                    gradePorProfessor: resultado.grade_por_professor,
                                    nomesTurmas,
                                    nomesDisciplinas,
                                    nomesProfessores,
                                    diasSemana: diasPadrao,
                                    periodosPorDia: periodosPadrao,
                                    turno,
                                  })
                                }
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  color: "#334155",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                title="Imprimir horário individual deste professor"
                              >
                                🖨️ Imprimir Professor
                              </button>
                            </div>
                          </div>
                          <div style={{ padding: 12 }}>
                            <GradeProfessor
                              professor={{ id: Number(profId), nome: nomesProfessores[profId] || `Professor ${profId}` }}
                              resultado={resultado}
                              periodosPorDia={buildPeriodosPorDia(grade, diasPadrao, periodosPadrao)}
                              maps={{ disciplinaById: nomesDisciplinas, turmaById: nomesTurmas }}
                              layoutMode="dias-colunas"
                              interativo={true}
                              selecao={selecao}
                              avaliarDestino={avaliarDestino}
                              onCellClick={handleCellClick}
                              onToggleLock={handleToggleLock}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 🖨️ Modal de Exportação e Impressão Oficial (Padrão Urânia) */}
      <ExportarHorarioModal
        aberto={showModalExportar}
        onFechar={() => setShowModalExportar(false)}
        resultado={resultado}
        turno={turno}
        nomesTurmas={nomesTurmas}
        nomesDisciplinas={nomesDisciplinas}
        nomesProfessores={nomesProfessores}
        diasSemana={diasPadrao}
        periodosPorDia={periodosPadrao}
      />

      {/* 🧠 Modal Premium de Viabilidade e Sugestões de Ajuste para Fechamento (Padrão Urânia+) */}
      {showModalDiagnosticoUrania && resultado && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.72)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 780,
              maxHeight: "90vh",
              borderRadius: 18,
              overflow: "hidden",
               display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.45)",
              animation: "modalFadeIn 0.22s ease-out forwards",
              border: "1px solid #cbd5e1",
            }}
          >
            {/* Header Urânia+ */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%)",
                padding: "20px 26px",
                color: "#fff",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "rgba(255, 255, 255, 0.14)",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 25,
                    flexShrink: 0,
                  }}
                >
                  🧠
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span
                      style={{
                        background: "#f59e0b",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Diagnóstico de Fechamento • Urânia+
                    </span>
                    <span style={{ fontSize: 11, color: "#c7d2fe", fontWeight: 600 }}>
                      Turno {turno}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>
                    Não foi possível atender 100% das restrições estritas exigidas
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#e0e7ff", lineHeight: 1.45 }}>
                    O Motor Solver 2.0 gerou a melhor grade matematicamente viável, mas encontrou gargalos estruturais que impediram o fechamento total das regras obrigatórias. Confira o diagnóstico e selecione os ajustes abaixo para tentar novamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalDiagnosticoUrania(false)}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "none",
                  color: "#fff",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
                title="Fechar diagnóstico"
              >
                ✕
              </button>
            </div>

            {/* Corpo rolável */}
            <div style={{ padding: "20px 26px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Faixa de KPIs do Diagnóstico */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 10 }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Aulas Alocadas</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: naoAloc === 0 ? "#16a34a" : "#d97706", marginTop: 2 }}>
                    {metrics.aulas_alocadas || 0} / {metrics.aulas_demanda || 0} ({coberturaVal}%)
                  </div>
                  <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>
                    {naoAloc === 0 ? "✅ Zero aulas faltantes" : `⚠️ ${naoAloc} aula(s) pendente(s)`}
                  </div>
                </div>

                {(metrics.pares_obrigatorios_meta || 0) > 0 && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 700 }}>🔒 Pares Obrigatórios</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                      {metrics.pares_obrigatorios_atendidos || 0} / {metrics.pares_obrigatorios_meta} (
                      {Math.round(((metrics.pares_obrigatorios_atendidos || 0) / metrics.pares_obrigatorios_meta) * 100)}%)
                    </div>
                    <div style={{ fontSize: 10.5, color: "#b91c1c", marginTop: 2 }}>
                      {metrics.pares_obrigatorios_faltantes || 0} janela(s) ficaram c/ aulas simples
                    </div>
                  </div>
                )}

                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#0369a1", fontWeight: 600 }}>🔗 Total Duplas Geminadas</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0284c7", marginTop: 2 }}>
                    {metrics.pares_geminados || 0} pares
                  </div>
                  <div style={{ fontSize: 10.5, color: "#0369a1", marginTop: 2 }}>
                    {(metrics.violacoes_pares_bloqueados || 0) === 0
                      ? "✅ 0 cortadas pelo recreio"
                      : `⚠️ ${metrics.violacoes_pares_bloqueados} em par bloqueado`}
                  </div>
                </div>

                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>👨‍🏫 Professores no Limite</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#b45309", marginTop: 2 }}>
                    {(resultado.warnings_payload || []).length} prof(s)
                  </div>
                  <div style={{ fontSize: 10.5, color: "#92400e", marginTop: 2 }}>
                    Com 100% da grade ocupada (30/30)
                  </div>
                </div>
              </div>

              {/* Explicação Técnica do Gargalo */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderLeft: "4px solid #4f46e5",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 12.5,
                  color: "#334155",
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: "#1e1b4b", display: "block", marginBottom: 4, fontSize: 13 }}>
                  🔍 Por que a configuração exigida não fechou 100%?
                </strong>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(metrics.pares_obrigatorios_faltantes || 0) > 0 && (
                    <li style={{ marginBottom: 4 }}>
                      <strong>Conflito entre Par Obrigatório (🔒) + Disciplinas de Carga Ímpar + Professores 30/30:</strong>{" "}
                      Cada turma possui disciplinas com número ímpar de aulas semanais (ex.: <em>Português 5h, História 3h, Geografia 3h, Prática Estudantil 1h</em>), gerando obrigatoriamente <strong>6 aulas simples (avulsas) por turma</strong>. Como há{" "}
                      <strong>{(resultado.warnings_payload || []).length || 10} professores com 30/30 aulas</strong> (sem nenhuma janela livre), em{" "}
                      <strong>{metrics.pares_obrigatorios_faltantes} de {metrics.pares_obrigatorios_meta} janelas</strong> o algoritmo precisou alocar 2 aulas simples no bloco obrigatório para não deixar nenhuma turma sem aula.
                    </li>
                  )}
                  {(metrics.violacoes_pares_bloqueados || 0) > 0 && (
                    <li style={{ marginBottom: 4 }}>
                      <strong>Par do Recreio (#3-#4) desbloqueado:</strong> O par que atravessa o intervalo estava marcado como permitido na configuração salva, permitindo {metrics.violacoes_pares_bloqueados} aula(s) dupla(s) cortada(s) pelo recreio.
                    </li>
                  )}
                  {naoAloc > 0 && (
                    <li>
                      <strong>{naoAloc} aula(s) sem encaixe simultâneo (Turma × Professor):</strong> Restrições estritas de blocos ou indisponibilidades impediram a permutação final.
                    </li>
                  )}
                </ul>
              </div>

              {/* Lista das janelas que não ficaram geminadas no Par Obrigatório */}
              {Array.isArray(resultado?.diagnostico?.divergencias_pares_obrigatorios) &&
                resultado.diagnostico.divergencias_pares_obrigatorios.length > 0 && (
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: "#f1f5f9",
                        padding: "8px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        📋 Janelas com Aulas Simples nos Pares 🔒 Obrigatórios ({resultado.diagnostico.divergencias_pares_obrigatorios.length})
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#64748b" }}>
                        Clique em "Ver Turma" para inspecionar na grade
                      </span>
                    </div>
                    <div
                      style={{
                        maxHeight: 135,
                        overflowY: "auto",
                        padding: "8px 12px",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: 6,
                        background: "#fff",
                      }}
                    >
                      {resultado.diagnostico.divergencias_pares_obrigatorios.map((div, i) => {
                        const tNome = nomesTurmas[div.turma_id] || `Turma ${div.turma_id}`;
                        const d1Nome = div.disc_inicio ? (nomesDisciplinas[div.disc_inicio] || `Disc ${div.disc_inicio}`) : "Vazio";
                        const d2Nome = div.disc_fim ? (nomesDisciplinas[div.disc_fim] || `Disc ${div.disc_fim}`) : "Vazio";
                        return (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "5px 8px",
                              borderRadius: 6,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              fontSize: 11.5,
                              gap: 8,
                            }}
                          >
                            <span style={{ color: "#1e293b" }}>
                              <strong>{tNome}</strong> • {DIAS_CURTO[div.dia] || `Dia ${div.dia}`} (#{div.inicio}-#{div.fim}):{" "}
                              <span style={{ color: "#475569" }}>
                                {d1Nome} + {d2Nome}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowModalDiagnosticoUrania(false);
                                setViewMode("turma");
                                setTimeout(() => {
                                  const el = document.getElementById(`card-turma-${div.turma_id}`);
                                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }, 120);
                              }}
                              style={{
                                padding: "2px 7px",
                                borderRadius: 5,
                                border: "1px solid #cbd5e1",
                                background: "#fff",
                                color: "#2563eb",
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >
                              Ver Turma
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Seção de Sugestões Acionáveis (Padrão Urânia+) */}
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💡 Sugestões de Ajuste para o Horário Fechar</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                    (Marque os ajustes que deseja aceitar para tentar novamente)
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Sugestão 1: Converter Obrigatório -> Prioritário */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "11px 14px",
                      borderRadius: 10,
                      border: sugestoesSelecionadas.flexibilizar_obrigatorios
                        ? "1.5px solid #4f46e5"
                        : "1px solid #cbd5e1",
                      background: sugestoesSelecionadas.flexibilizar_obrigatorios ? "#eef2ff" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sugestoesSelecionadas.flexibilizar_obrigatorios}
                      onChange={(e) =>
                        setSugestoesSelecionadas((prev) => ({
                          ...prev,
                          flexibilizar_obrigatorios: e.target.checked,
                        }))
                      }
                      style={{ marginTop: 3, width: 16, height: 16, accentColor: "#4f46e5", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13, color: "#1e1b4b" }}>
                          Flexibilizar par(es) 🔒 Obrigatório(s) para ⭐ Prioritário (1ª Opção de Alta Prioridade)
                        </strong>
                        <span
                          style={{
                            background: "#4f46e5",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 7px",
                            borderRadius: 999,
                          }}
                        >
                          Recomendado (Urânia)
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>
                        Mantém o algoritmo forçando ao máximo aulas geminadas no <strong>(#1-#2)</strong> na 1ª posição da fila, mas permite acomodar as aulas simples das disciplinas de carga ímpar (5h/3h/1h) sem travar o fechamento.
                      </div>
                    </div>
                  </label>

                  {/* Sugestão 2: Bloquear recreio #3-#4 e priorizar #4-#5 */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "11px 14px",
                      borderRadius: 10,
                      border: sugestoesSelecionadas.bloquear_recreio_pos_recreio
                        ? "1.5px solid #0284c7"
                        : "1px solid #cbd5e1",
                      background: sugestoesSelecionadas.bloquear_recreio_pos_recreio ? "#f0f9ff" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sugestoesSelecionadas.bloquear_recreio_pos_recreio}
                      onChange={(e) =>
                        setSugestoesSelecionadas((prev) => ({
                          ...prev,
                          bloquear_recreio_pos_recreio: e.target.checked,
                        }))
                      }
                      style={{ marginTop: 3, width: 16, height: 16, accentColor: "#0284c7", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13, color: "#0c4a6e" }}>
                          Blindar Recreio (🚫 Bloquear #3-#4) e priorizar (#4-#5) Pós-Recreio como 2ª Opção ⭐
                        </strong>
                        <span
                          style={{
                            background: "#0284c7",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 7px",
                            borderRadius: 999,
                          }}
                        >
                          Qualidade Pedagógica
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>
                        Garante <strong>zero aulas duplas cortadas pelo intervalo</strong> e direciona automaticamente o segundo bloco de aulas geminadas do dia para <strong>(#4-#5)</strong>.
                      </div>
                    </div>
                  </label>

                  {/* Sugestão 3: Busca Exaustiva 60s com Fase 0 Bipartida */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "11px 14px",
                      borderRadius: 10,
                      border: sugestoesSelecionadas.busca_exaustiva_60s
                        ? "1.5px solid #16a34a"
                        : "1px solid #cbd5e1",
                      background: sugestoesSelecionadas.busca_exaustiva_60s ? "#f0fdf4" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sugestoesSelecionadas.busca_exaustiva_60s}
                      onChange={(e) =>
                        setSugestoesSelecionadas((prev) => ({
                          ...prev,
                          busca_exaustiva_60s: e.target.checked,
                        }))
                      }
                      style={{ marginTop: 3, width: 16, height: 16, accentColor: "#16a34a", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13, color: "#14532d" }}>
                          Executar Busca Exaustiva (60s) com Emparelhamento Bipartido (Fase 0 + Permutação 3C)
                        </strong>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>
                        Amplia o tempo limite de busca para explorar dezenas de árvores de Emparelhamento Bipartido (Algoritmo de Kuhn) e permutações de blocos entre dias.
                      </div>
                    </div>
                  </label>

                  {/* Sugestão 4: Desafixar aulas manuais (se houver) */}
                  {aulasFixas > 0 && respeitarHorarioManual && (
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "11px 14px",
                        borderRadius: 10,
                        border: sugestoesSelecionadas.desafixar_manuais
                          ? "1.5px solid #d97706"
                          : "1px solid #cbd5e1",
                        background: sugestoesSelecionadas.desafixar_manuais ? "#fffbeb" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sugestoesSelecionadas.desafixar_manuais}
                        onChange={(e) =>
                          setSugestoesSelecionadas((prev) => ({
                            ...prev,
                            desafixar_manuais: e.target.checked,
                          }))
                        }
                        style={{ marginTop: 3, width: 16, height: 16, accentColor: "#d97706", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13, color: "#78350f", display: "block" }}>
                          Destravar temporariamente as {aulasFixas} aula(s) fixada(s) manualmente (📌)
                        </strong>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>
                          Permite ao algoritmo permutar também os horários que haviam sido travados manualmente caso estejam bloqueando um par obrigatório.
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé de Ação do Modal Urânia+ */}
            <div
              style={{
                padding: "16px 26px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                {typeof onAbrirReconfiguracao === "function" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalDiagnosticoUrania(false);
                      onAbrirReconfiguracao();
                    }}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      color: "#334155",
                      fontWeight: 600,
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    ⚙️ Reconfigurar Pares Manualmente
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowModalDiagnosticoUrania(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 9,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ✅ Manter Este Horário Assim Mesmo
                </button>
                <button
                  type="button"
                  disabled={aplicandoSugestoesUrania}
                  onClick={aplicarSugestoesERegerar}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 9,
                    border: "none",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 13.5,
                    cursor: aplicandoSugestoesUrania ? "wait" : "pointer",
                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                  }}
                >
                  {aplicandoSugestoesUrania
                    ? "⏳ Aplicando e Regerando…"
                    : "⚡ Aceitar Sugestões e Tentar Novamente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              A grade atualmente exibida na tela será salva e promovida a oficial, ficando acessível a todos os professores e alunos. Deseja confirmar a publicação?
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
