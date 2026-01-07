// PATH: apps/educa-frontend/src/features/secretaria/horarios/ConfiguracoesPedagogicas.jsx
// -----------------------------------------------------------------------------
// Tela: Configurações Pedagógicas (Fundamental II)
//
// Objetivo:
// - Permitir configurar regras pedagógicas por TURNO e ANO
// - O usuário pode alternar o TURNO livremente nesta tela
// - O ANO é definido no Escopo (Etapa 1) e aqui: apenas informativo
//
// Backend (agora implementado):
// - GET  /api/config-pedagogica?turno=...&ano_ref=...&nivel=...
// - POST /api/config-pedagogica  (upsert)
//
// Observações:
// - Se não houver registro no BD => is_default=true e frontend usa defaults
// - Se houver registro => carrega e aplica no estado
// -----------------------------------------------------------------------------
//
// ✅ PASSO 7.3 — Configurações Pedagógicas 100% desacoplada
// Fallback de contexto (turno/anoRef) para suportar:
// - acesso direto via URL
// - F5/refresh
// - retorno do wizard sem depender de location.state
// -----------------------------------------------------------------------------
//
// ✅ PASSO (novo) — RC-02 (Máximo de aulas por dia por disciplina)
// - UI mínima:
//   • modo: soft|hard
//   • max_por_dia_padrao: número (limite padrão)
// - Overrides por disciplina (por_disciplina) ficam para o próximo passo.
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TURNOS = ["Matutino", "Vespertino", "Noturno", "Integral"];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
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
  if (!res.ok) throw new Error(data?.error || data?.message || "Erro na requisição");
  return data;
}

// -----------------------------------------------------------------------------
// ✅ Wizard cache (sessionStorage) — mesmo KEY usado no useHorariosWizardState
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

// -----------------------------------------------------------------------------
// Toast simples
// -----------------------------------------------------------------------------
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (type, msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };
  return {
    success: (m) => show("success", m),
    error: (m) => show("error", m),
    node: (
      <div className="fixed z-[9999] right-4 bottom-4 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "px-3 py-2 rounded-lg shadow border text-sm " +
              (t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800")
            }
          >
            {t.msg}
          </div>
        ))}
      </div>
    ),
  };
}

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------
function defaultConfig() {
  return {
    nivel: "fundamental_II",
    regras: {
      rc01_distribuicao_disciplina: {
        modo: "soft", // soft | hard
        max_consecutivas: 2,
      },

      // ✅ RC-02 — Máximo de aulas por dia (por disciplina)
      // - UI mínima usa apenas max_por_dia_padrao + modo.
      // - por_disciplina fica para o próximo passo.
      rc02_max_aulas_por_dia_disciplina: {
        modo: "soft", // soft | hard
        max_por_dia_padrao: 3,
        por_disciplina: {},
      },
    },
  };
}

export default function ConfiguracoesPedagogicas() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Contexto
  const [turno, setTurno] = useState("Matutino");
  const [anoRef, setAnoRef] = useState("");

  // Configuração
  const [config, setConfig] = useState(defaultConfig());
  const [isDefault, setIsDefault] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backendReady, setBackendReady] = useState(true);

  // Nível (por enquanto fixo, mas já pronto para crescer)
  const nivel = useMemo(() => config?.nivel || "fundamental_II", [config?.nivel]);

  const canEdit = Boolean(turno) && Boolean(anoRef);

  // ---------------------------------------------------------------------------
  // ✅ Inicialização do contexto:
  // 1) tenta location.state (fluxo normal vindo do wizard)
  // 2) fallback para sessionStorage (wizard cache) — suporta F5/URL direta
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const st = location?.state || {};
    const cached = readWizardCache() || {};

    const resolvedTurno = st?.turno || cached?.turno || "Matutino";
    const resolvedAnoRef =
      st?.anoRef !== undefined && st?.anoRef !== null
        ? String(st.anoRef)
        : cached?.anoRef
        ? String(cached.anoRef)
        : "";

    setTurno(resolvedTurno);
    setAnoRef(resolvedAnoRef);
  }, [location]);

  // ---------------------------------------------------------------------------
  // Carregar config do backend
  // - Se não houver registro => is_default=true + config_pedagogica=null
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!canEdit) return;

    (async () => {
      try {
        setLoadingConfig(true);
        setBackendReady(true);

        const url = `/api/config-pedagogica?turno=${encodeURIComponent(
          turno
        )}&ano_ref=${encodeURIComponent(anoRef)}&nivel=${encodeURIComponent("fundamental_II")}`;

        const data = await apiFetch(url);

        const flagDefault = Boolean(data?.is_default);
        const cfg = data?.config_pedagogica || null;

        if (!cfg) {
          // sem registro => defaults
          setConfig(defaultConfig());
          setIsDefault(true);
          return;
        }

        // com registro => mescla com defaults (para compatibilidade futura)
        const merged = {
          ...defaultConfig(),
          ...cfg,
          regras: {
            ...defaultConfig().regras,
            ...(cfg.regras || {}),
          },
        };

        setConfig(merged);
        setIsDefault(flagDefault === true ? true : false);
      } catch (e) {
        setBackendReady(false);
        setConfig(defaultConfig());
        setIsDefault(true);
        toast.error(e?.message || "Falha ao carregar configurações. Usando padrão do sistema.");
      } finally {
        setLoadingConfig(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turno, anoRef, canEdit]);

  // ---------------------------------------------------------------------------
  // RC-01
  // ---------------------------------------------------------------------------
  const rc01 =
    config?.regras?.rc01_distribuicao_disciplina ||
    defaultConfig().regras.rc01_distribuicao_disciplina;

  function setRc01Modo(modo) {
    setConfig((prev) => ({
      ...(prev || defaultConfig()),
      regras: {
        ...(prev?.regras || {}),
        rc01_distribuicao_disciplina: {
          ...(prev?.regras?.rc01_distribuicao_disciplina ||
            defaultConfig().regras.rc01_distribuicao_disciplina),
          modo,
        },
      },
    }));
  }

  function setRc01Max(value) {
    const v = Number(value);
    setConfig((prev) => ({
      ...(prev || defaultConfig()),
      regras: {
        ...(prev?.regras || {}),
        rc01_distribuicao_disciplina: {
          ...(prev?.regras?.rc01_distribuicao_disciplina ||
            defaultConfig().regras.rc01_distribuicao_disciplina),
          max_consecutivas: Number.isFinite(v) ? v : 2,
        },
      },
    }));
  }

  // ---------------------------------------------------------------------------
  // ✅ RC-02 — Máximo de aulas por dia (por disciplina)
  // ---------------------------------------------------------------------------
  const rc02 =
    config?.regras?.rc02_max_aulas_por_dia_disciplina ||
    defaultConfig().regras.rc02_max_aulas_por_dia_disciplina;

  function setRc02Modo(modo) {
    setConfig((prev) => ({
      ...(prev || defaultConfig()),
      regras: {
        ...(prev?.regras || {}),
        rc02_max_aulas_por_dia_disciplina: {
          ...(prev?.regras?.rc02_max_aulas_por_dia_disciplina ||
            defaultConfig().regras.rc02_max_aulas_por_dia_disciplina),
          modo,
        },
      },
    }));
  }

  function setRc02MaxPadrao(value) {
    const v = Number(value);
    setConfig((prev) => ({
      ...(prev || defaultConfig()),
      regras: {
        ...(prev?.regras || {}),
        rc02_max_aulas_por_dia_disciplina: {
          ...(prev?.regras?.rc02_max_aulas_por_dia_disciplina ||
            defaultConfig().regras.rc02_max_aulas_por_dia_disciplina),
          max_por_dia_padrao: Number.isFinite(v) ? v : 3,
        },
      },
    }));
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------
  async function salvar() {
    if (!canEdit) return;

    try {
      setSaving(true);
      setBackendReady(true);

      await apiFetch("/api/config-pedagogica", {
        method: "POST",
        body: {
          turno,
          ano_ref: anoRef,
          nivel: "fundamental_II",
          regras: config?.regras || defaultConfig().regras,
        },
      });

      setIsDefault(false);
      toast.success(`Configurações salvas (${turno} • ${anoRef}).`);
    } catch (e) {
      setBackendReady(false);
      toast.error(e?.message || "Não foi possível salvar. Verifique o backend.");
    } finally {
      setSaving(false);
    }
  }

  function restaurarPadrao() {
    setConfig(defaultConfig());
    setIsDefault(true);
    toast.success("Padrão do sistema restaurado (ainda não salvo).");
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6">
      {toast.node}

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">
              Configurações Pedagógicas
            </h1>

            {anoRef && (
              <span className="text-xs px-2 py-1 rounded-full border bg-indigo-50 border-indigo-200 text-indigo-800">
                {anoRef}
              </span>
            )}
          </div>

          <p className="text-slate-600 mt-1">
            Regras do gerador de horários (Fundamental II)
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
              {isDefault ? "Usando padrão do sistema" : "Configuração personalizada"}
            </span>

            {!backendReady && (
              <span className="text-xs px-2 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-800">
                Backend ainda não conectado
              </span>
            )}

            {loadingConfig && (
              <span className="text-xs px-2 py-1 rounded-full border bg-blue-50 border-blue-200 text-blue-800">
                Carregando...
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() =>
            navigate("/secretaria/horarios", {
              state: { step: 2, anoRef, turno },
              replace: true,
            })
          }
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-700"
        >
          Voltar aos Horários
        </button>
      </div>

      {/* Contexto */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Turno
            </label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              disabled={saving}
            >
              {TURNOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ano
            </label>
            <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
              {anoRef || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Regras */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Distribuição da disciplina
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-xl p-4">
            <div className="font-medium mb-2">Modo da regra</div>
            <label className="flex gap-2 mb-2">
              <input
                type="radio"
                checked={String(rc01.modo).toLowerCase() === "soft"}
                onChange={() => setRc01Modo("soft")}
                disabled={!canEdit || saving}
              />
              Flexível (Soft)
            </label>
            <label className="flex gap-2">
              <input
                type="radio"
                checked={String(rc01.modo).toLowerCase() === "hard"}
                onChange={() => setRc01Modo("hard")}
                disabled={!canEdit || saving}
              />
              Rígida (Hard)
            </label>
          </div>

          <div className="border rounded-xl p-4">
            <div className="font-medium mb-2">Máximo de consecutivas</div>
            <select
              value={rc01.max_consecutivas}
              onChange={(e) => setRc01Max(e.target.value)}
              className="px-3 py-2 border rounded-xl"
              disabled={!canEdit || saving}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* ✅ RC-02 — Máximo de aulas por dia (disciplina)                        */}
        {/* ------------------------------------------------------------------- */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Máximo de aulas por dia (por disciplina)
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4">
              <div className="font-medium mb-2">Modo da regra</div>
              <label className="flex gap-2 mb-2">
                <input
                  type="radio"
                  checked={String(rc02.modo).toLowerCase() === "soft"}
                  onChange={() => setRc02Modo("soft")}
                  disabled={!canEdit || saving}
                />
                Flexível (Soft)
              </label>
              <label className="flex gap-2">
                <input
                  type="radio"
                  checked={String(rc02.modo).toLowerCase() === "hard"}
                  onChange={() => setRc02Modo("hard")}
                  disabled={!canEdit || saving}
                />
                Rígida (Hard)
              </label>

              <p className="text-xs text-slate-500 mt-3">
                Esta regra limita quantas vezes a mesma disciplina pode aparecer no mesmo dia
                (mesmo que não seja consecutiva).
              </p>
            </div>

            <div className="border rounded-xl p-4">
              <div className="font-medium mb-2">Máximo por dia (padrão)</div>

              <select
                value={rc02.max_por_dia_padrao ?? 3}
                onChange={(e) => setRc02MaxPadrao(e.target.value)}
                className="px-3 py-2 border rounded-xl"
                disabled={!canEdit || saving}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>

              <p className="text-xs text-slate-500 mt-3">
                Em seguida (próximo passo), poderemos definir exceções por disciplina (ex.: MAT=2, ART=1).
              </p>
            </div>
          </div>
        </div>

        {/* Nível (oculto/implícito por enquanto) */}
        <input type="hidden" value={nivel} readOnly />
      </div>

      {/* Ações */}
      <div className="flex justify-between mt-6">
        <button
          onClick={restaurarPadrao}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white"
          disabled={!canEdit || saving}
        >
          Restaurar padrão
        </button>

        <button
          onClick={salvar}
          disabled={!canEdit || saving}
          className="px-5 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}
