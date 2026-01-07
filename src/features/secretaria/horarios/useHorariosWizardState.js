// PATH: src/features/secretaria/horarios/useHorariosWizardState.js
// Hook central do Wizard de Horários — concentra estado + efeitos + chamadas de API.
// Objetivo: HorariosWizard.jsx vira apenas orquestração de render.

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const DIAS = [
  { id: 1, nome: "Segunda" },
  { id: 2, nome: "Terça" },
  { id: 3, nome: "Quarta" },
  { id: 4, nome: "Quinta" },
  { id: 5, nome: "Sexta" },
  { id: 6, nome: "Sábado" },
];

// -----------------------------------------------------------------------------
// ✅ PASSO 7.2.C — Persistência do estado do Wizard (sessionStorage)
// Motivo: ao navegar para /configuracoes-pedagogicas e voltar, o HorariosWizard
// pode ser remontado e perder o estado em memória (turmasChecked, step, etc).
// -----------------------------------------------------------------------------
const WIZARD_CACHE_KEY = "EDUCA_HORARIOS_WIZARD_CACHE_V1";

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readWizardCache() {
  try {
    const raw = sessionStorage.getItem(WIZARD_CACHE_KEY);
    if (!raw) return null;
    const obj = safeJsonParse(raw, null);
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch {
    return null;
  }
}

function writeWizardCache(payload) {
  try {
    sessionStorage.setItem(WIZARD_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // silencioso por padrão (storage pode falhar em ambientes restritos)
  }
}

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("jwt") || "";
}

async function apiFetch(path, { method = "GET", body } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Erro na requisição");
  return data;
}

export default function useHorariosWizardState() {
  const location = useLocation();

  // ---------------------------------------------------------------------------
  // ✅ Boot do estado: prioriza location.state (quando existir) e faz fallback
  // para cache do sessionStorage. Isso garante que, ao voltar das Configurações,
  // a seleção de turmas e step sejam restaurados.
  // ---------------------------------------------------------------------------
  const cached = readWizardCache() || {};
  const navState = location?.state || {};

  const [step, setStep] = useState(() => {
    const st = navState || {};
    const value =
      st?.step !== undefined && st?.step !== null ? st?.step : cached?.step;
    return Number(value) || 1;
  });

  // Etapa 1 – Escopo
  const [turno, setTurno] = useState(() => {
    const value =
      navState?.turno !== undefined && navState?.turno !== null
        ? navState?.turno
        : cached?.turno;
    return value || "Matutino";
  });

  const [anoRef, setAnoRef] = useState(() => {
    const value =
      navState?.anoRef !== undefined && navState?.anoRef !== null
        ? navState?.anoRef
        : cached?.anoRef;
    return value ? String(value) : "";
  });

  const [etapa, setEtapa] = useState(() => {
    const value =
      navState?.etapa !== undefined && navState?.etapa !== null
        ? navState?.etapa
        : cached?.etapa;
    return value || "";
  });

  const [turmas, setTurmas] = useState([]);
  const [turmasChecked, setTurmasChecked] = useState(() => {
    const value =
      navState?.turmasChecked !== undefined && navState?.turmasChecked !== null
        ? navState?.turmasChecked
        : cached?.turmasChecked;

    return Array.isArray(value) ? value : [];
  });

  const [loadingTurmas, setLoadingTurmas] = useState(false);

  const [error, setError] = useState("");

  // Etapa 2 – Grade temporal
  const [grade, setGrade] = useState({});
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  // Etapa 3 – Pré-solve
  const [preSolve, setPreSolve] = useState(null);
  const [payloadPreview, setPayloadPreview] = useState(null);
  const [runningPre, setRunningPre] = useState(false);

  // Aplicar estado vindo da navegação (ex.: Configurações -> Horários)
  // Observação: NÃO mexer em turmasChecked aqui — a seleção deve ser preservada
  // via cache/sessionStorage e/ou estado existente.
  useEffect(() => {
    const st = location?.state || {};
    if (st?.turno) setTurno(st.turno);
    if (st?.anoRef) setAnoRef(String(st.anoRef));
    if (st?.step) setStep(Number(st.step));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Persistir estado essencial do wizard
  useEffect(() => {
    writeWizardCache({
      step,
      turno,
      anoRef,
      etapa,
      turmasChecked,
    });
  }, [step, turno, anoRef, etapa, turmasChecked]);

  // Carregar lista de turmas (uma vez)
  useEffect(() => {
    (async () => {
      try {
        setLoadingTurmas(true);
        const data = await apiFetch("/api/turmas");
        const list = Array.isArray(data) ? data : data.turmas || [];
        setTurmas(list);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingTurmas(false);
      }
    })();
  }, []);

  async function carregarGrade() {
    try {
      setLoadingGrade(true);
      const data = await apiFetch(
        `/api/grade/base?turno=${encodeURIComponent(turno)}`
      );

      const g = {};
      (data?.itens || []).forEach((it) => {
        if (!g[it.dia_semana]) g[it.dia_semana] = [];
        g[it.dia_semana].push({
          ordem: Number(it.periodo_ordem),
          inicio: it.hora_inicio,
          fim: it.hora_fim,
        });
      });

      Object.keys(g).forEach((dia) => g[dia].sort((a, b) => a.ordem - b.ordem));
      setGrade(g);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingGrade(false);
    }
  }

  // Sempre que mudar o turno e estivermos na etapa 2, recarrega grade
  useEffect(() => {
    if (step === 2) carregarGrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turno, step]);

  async function salvarGrade() {
    const hhmm = /^\d{2}:\d{2}$/;

    for (const dia of Object.keys(grade)) {
      for (const p of grade[dia]) {
        if (!hhmm.test(p.inicio) || !hhmm.test(p.fim)) {
          setError(
            `Horário inválido em ${
              DIAS.find((d) => d.id === Number(dia))?.nome || dia
            }, período ${p.ordem}.`
          );
          return;
        }
      }
    }

    const itens = [];
    Object.entries(grade).forEach(([dia, arr]) => {
      arr.forEach((p) => {
        itens.push({
          dia_semana: Number(dia),
          periodo_ordem: Number(p.ordem),
          hora_inicio: p.inicio,
          hora_fim: p.fim,
        });
      });
    });

    if (!itens.length) {
      setError("Adicione ao menos um período na grade.");
      return;
    }

    try {
      setSavingGrade(true);
      await apiFetch("/api/grade/base", {
        method: "PUT",
        body: { turno, itens },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingGrade(false);
    }
  }

  async function executarPreSolve() {
    try {
      setRunningPre(true);

      const body = {
        // mande as duas formas para evitar divergência
        turno,
        ano_ref: anoRef,
        anoRef: anoRef,
        turma_ids: turmasChecked,
        turmaIds: turmasChecked,
      };

      const data = await apiFetch("/api/grade/solve", { method: "POST", body });
      setPreSolve(data?.pre_solve || null);
      setPayloadPreview(data?.payload || null);
    } catch (e) {
      setPreSolve(null);
      setPayloadPreview(null);
      setError(e.message);
    } finally {
      setRunningPre(false);
    }
  }

  return {
    // stepper
    step,
    setStep,

    // escopo
    turno,
    setTurno,
    anoRef,
    setAnoRef,
    etapa,
    setEtapa,
    turmas,
    turmasChecked,
    setTurmasChecked,
    loadingTurmas,

    // grade
    grade,
    setGrade,
    carregarGrade,
    salvarGrade,
    loadingGrade,
    savingGrade,

    // pre-solve
    preSolve,
    payloadPreview,
    executarPreSolve,
    runningPre,

    // erro
    error,
    setError,
  };
}
