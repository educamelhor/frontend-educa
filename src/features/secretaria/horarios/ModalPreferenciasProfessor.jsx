// src/features/secretaria/horarios/ModalPreferenciasProfessor.jsx
// ============================================================================
// Versão: Ideia 1 (listas com setas) — Passo 4
// Novidades do Passo 4:
//  • Presets avançados para "janelas" por posição do dia (Grupo A/pesos)
//  • Simulador rápido: mostra o regras_json final (mesclado) e botão "Copiar"
// Mantém: Presets finos de blocos, pares de dias, janelas mín/máx semanais,
//         Formato, Janelas (checkboxes), Limites, Avançado (JSON) e merge não-destrutivo.
// Ao salvar: gera/mescla regras_json automaticamente a partir dos grupos A, B, C, E e C+.
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import PriorityOrderGroup, { orderToWeightsGeneric } from "./PriorityOrderGroup.jsx";

// Helpers ---------------------------------------------------------------
function extrair(obj, path, defVal) {
  try {
    return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj) ?? defVal;
  } catch {
    return defVal;
  }
}
function extrairPesos(regras) {
  try {
    const r = typeof regras === "string" ? JSON.parse(regras || "{}") : regras || {};
    return r.pesos || {};
  } catch { return {}; }
}

// Presets finos de blocos (curvas não lineares)
// Cada preset retorna { blocos, pesosExtra } que serão mesclados aos demais pesos
const BLOCO_PRESETS = {
  nenhum: () => ({ blocos: {}, pesosExtra: {} }),
  unica_suave: () => ({
    blocos: { tamanho_minimo: 1, tamanho_maximo: 1 },
    pesosExtra: { preferir_unica: 6, preferir_dupla: 2, preferir_tripla: 0 }
  }),
  unica_forte: () => ({
    blocos: { tamanho_minimo: 1, tamanho_maximo: 1 },
    pesosExtra: { preferir_unica: 10, preferir_dupla: 3, preferir_tripla: 0 }
  }),
  dupla_suave: () => ({
    blocos: { tamanho_minimo: 2, tamanho_maximo: 2 },
    pesosExtra: { preferir_dupla: 7, preferir_unica: 3, preferir_tripla: 4 }
  }),
  dupla_forte: () => ({
    blocos: { tamanho_minimo: 2, tamanho_maximo: 2 },
    pesosExtra: { preferir_dupla: 10, preferir_unica: 2, preferir_tripla: 5 }
  }),
  tripla_suave: () => ({
    blocos: { tamanho_minimo: 3, tamanho_maximo: 3 },
    pesosExtra: { preferir_tripla: 7, preferir_dupla: 4, preferir_unica: 2 }
  }),
  tripla_forte: () => ({
    blocos: { tamanho_minimo: 3, tamanho_maximo: 3 },
    pesosExtra: { preferir_tripla: 10, preferir_dupla: 5, preferir_unica: 1 }
  }),
};

// Presets avançados de "janelas" por posição do dia (atuam nos pesos do Grupo A)
// Retornam apenas { pesosExtra }
const JANELA_PRESETS = {
  nenhum: () => ({ pesosExtra: {} }),
  anti_meio_forte: () => ({ pesosExtra: { evitar_janela_meio: 10, preferir_inicio_turno: 6, preferir_fim_turno: 6, evitar_primeiro_periodo: 3, evitar_ultimo_periodo: 3 } }),
  inicio_forte: () => ({ pesosExtra: { preferir_inicio_turno: 10, evitar_primeiro_periodo: 0, evitar_ultimo_periodo: 5, evitar_janela_meio: 6 } }),
  fim_forte: () => ({ pesosExtra: { preferir_fim_turno: 10, evitar_ultimo_periodo: 0, evitar_primeiro_periodo: 5, evitar_janela_meio: 6 } }),
  bordas_fortes: () => ({ pesosExtra: { preferir_inicio_turno: 8, preferir_fim_turno: 8, evitar_janela_meio: 9, evitar_primeiro_periodo: 3, evitar_ultimo_periodo: 3 } }),
  equilibrado: () => ({ pesosExtra: { preferir_inicio_turno: 5, preferir_fim_turno: 5, evitar_janela_meio: 7, evitar_primeiro_periodo: 4, evitar_ultimo_periodo: 4 } }),
};

export default function ModalPreferenciasProfessor({ open, onClose, professor, turno }) {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const turnoNorm = String(turno || "").toLowerCase();

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Base (mantido do Passo 1)
  const [form, setForm] = useState({
    prefere_aula_dupla: false,
    prefere_aula_unica: false,
    evitar_janela_interna: true,
    janela_no_inicio_ok: true,
    janela_no_fim_ok: true,
    max_slots_mesma_turma_dia: 2,
    regras_json: {},
  });
  function setField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "prefere_aula_dupla" && value) next.prefere_aula_unica = false;
      if (name === "prefere_aula_unica" && value) next.prefere_aula_dupla = false;
      return next;
    });
  }

  // ---------- Grupo A (GENÉRICO com 5 itens) ----------
  const grupoAItems = [
    { key: "evitar_janela_meio",      label: "Evitar janela no MEIO do dia (forte)", weightKey: "evitar_janela_meio" },
    { key: "evitar_primeiro_periodo", label: "Evitar primeira aula do dia",          weightKey: "evitar_primeiro_periodo" },
    { key: "evitar_ultimo_periodo",   label: "Evitar última aula do dia",            weightKey: "evitar_ultimo_periodo" },
    { key: "preferir_inicio_turno",   label: "Preferir INÍCIO do turno",             weightKey: "preferir_inicio_turno" },
    { key: "preferir_fim_turno",      label: "Preferir FIM do turno",                weightKey: "preferir_fim_turno" },
  ];
  const [grupoAOrder, setGrupoAOrder] = useState(grupoAItems.map(i => i.key));

  // ---------- Grupo B (Blocos) ----------
  // Modo "cru" (única/dupla/tripla) + Preset fino (curvas)
  const [grupoBModo, setGrupoBModo] = useState(null); // 'unica' | 'dupla' | 'tripla' | null
  const [grupoBPreset, setGrupoBPreset] = useState("nenhum"); // chave em BLOCO_PRESETS

  // ---------- Grupo A+ (Presets de janelas por posição) ----------
  const [grupoAPreset, setGrupoAPreset] = useState("nenhum"); // chave em JANELA_PRESETS

  // ---------- Grupo C (Distribuição semanal) ----------
  // Mapeia 1..7 (1=Seg ... 7=Dom) → boolean (evitar = true)
  const [grupoCDias, setGrupoCDias] = useState({ 1:false, 2:false, 3:false, 4:false, 5:false, 6:false, 7:false });

  // Extensão C+: Pares específicos de dias a evitar juntos
  // Armazena lista de pares, exemplo: [[1,5], [2,4]]
  const PARES_PADRAO = [
    [1,5], // Seg + Sex
    [2,4], // Ter + Qui
    [1,3], // Seg + Qua
    [3,5], // Qua + Sex
  ];
  const [grupoCPares, setGrupoCPares] = useState([]); // array de pares [a,b]

  // Extensão C+: Janelas mín/máx por semana
  const [grupoCJanelasMin, setGrupoCJanelasMin] = useState(null); // null = não aplicar
  const [grupoCJanelasMax, setGrupoCJanelasMax] = useState(null);

  // ---------- Grupo E (Sequência 0–10) ----------
  const [grupoESequencia, setGrupoESequencia] = useState(0);

  // Avançado (JSON) + Simulador
  const [regrasText, setRegrasText] = useState("{}");
  const [simPreview, setSimPreview] = useState(null); // string JSON final
  const [copiado, setCopiado] = useState(false);

  // Carregar dados -------------------------------------------------------
  useEffect(() => {
    if (!open || !professor?.id || !turno) return;
    (async () => {
      try {
        setCarregando(true); setErro("");
        const url = `/api/preferencias?professor_id=${professor.id}&turno=${encodeURIComponent(turno)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();

        const regras = typeof json?.regras_json === "string"
          ? (JSON.parse(json.regras_json || "{}") || {})
          : (json?.regras_json || {});

        setForm({
          prefere_aula_dupla: !!json?.prefere_aula_dupla,
          prefere_aula_unica: !!json?.prefere_aula_unica,
          evitar_janela_interna: json?.evitar_janela_interna !== 0,
          janela_no_inicio_ok: json?.janela_no_inicio_ok !== 0,
          janela_no_fim_ok: json?.janela_no_fim_ok !== 0,
          max_slots_mesma_turma_dia: Number(json?.max_slots_mesma_turma_dia ?? 2),
          regras_json: regras,
        });

        // Derivar Grupo A pela leitura de pesos salvos (maior → menor)
        const pesos = extrairPesos(regras);
        const pairs = grupoAItems.map(it => [it.key, pesos[it.weightKey] ?? null]);
        if (pairs.some(([,v]) => v !== null)) {
          pairs.sort((a,b) => Number(b[1] ?? 0) - Number(a[1] ?? 0));
          setGrupoAOrder(pairs.map(([k]) => k));
        } else {
          setGrupoAOrder(grupoAItems.map(i => i.key));
        }

        // Grupo B — leitura (modo cru)
        const tmin = Number(extrair(regras, "blocos.tamanho_minimo", NaN));
        const tmax = Number(extrair(regras, "blocos.tamanho_maximo", NaN));
        let modo = null;
        if (tmin === 1 && tmax === 1) modo = "unica";
        else if (tmin === 2 && tmax === 2) modo = "dupla";
        else if (tmin === 3 && tmax === 3) modo = "tripla";
        setGrupoBModo(modo);

        // Grupo B — leitura (preset fino) por heurística dos pesos
        const p = extrairPesos(regras);
        const guessPresetBlocos = () => {
          if (tmin === 1 && tmax === 1) {
            if ((p.preferir_unica ?? 0) >= 9) return "unica_forte";
            if ((p.preferir_unica ?? 0) >= 5) return "unica_suave";
          }
          if (tmin === 2 && tmax === 2) {
            if ((p.preferir_dupla ?? 0) >= 9) return "dupla_forte";
            if ((p.preferir_dupla ?? 0) >= 5) return "dupla_suave";
          }
          if (tmin === 3 && tmax === 3) {
            if ((p.preferir_tripla ?? 0) >= 9) return "tripla_forte";
            if ((p.preferir_tripla ?? 0) >= 5) return "tripla_suave";
          }
          return "nenhum";
        };
        setGrupoBPreset(guessPresetBlocos());

        // Grupo A+ — leitura (preset janelas) por heurística simples
        const guessPresetJanelas = () => {
          const ejm = p.evitar_janela_meio ?? 0;
          const pin = p.preferir_inicio_turno ?? 0;
          const pfi = p.preferir_fim_turno ?? 0;
          const epp = p.evitar_primeiro_periodo ?? 0;
          const eup = p.evitar_ultimo_periodo ?? 0;
          if (ejm >= 9 && pin >= 7 && pfi >= 7) return "bordas_fortes";
          if (ejm >= 9) return "anti_meio_forte";
          if (pin >= 9 && epp <= 1) return "inicio_forte";
          if (pfi >= 9 && eup <= 1) return "fim_forte";
          if (ejm >= 6 && pin >= 5 && pfi >= 5) return "equilibrado";
          return "nenhum";
        };
        setGrupoAPreset(guessPresetJanelas());

        // Grupo C — leitura (dias_bloqueados)
        const dias = Array.isArray(extrair(regras, "restricoes.dias_bloqueados", []))
          ? extrair(regras, "restricoes.dias_bloqueados", []) : [];
        const baseDias = { 1:false,2:false,3:false,4:false,5:false,6:false,7:false };
        dias.forEach((n) => { if (baseDias[n] !== undefined) baseDias[n] = true; });
        setGrupoCDias(baseDias);

        // Grupo C+ — leitura (pares específicos)
        const pares = Array.isArray(extrair(regras, "restricoes.evitar_pares_dias", []))
          ? extrair(regras, "restricoes.evitar_pares_dias", []) : [];
        const normPairs = pares
          .filter((p2) => Array.isArray(p2) && p2.length === 2)
          .map(([a,b]) => [Number(a), Number(b)].sort((x,y) => x-y));
        setGrupoCPares(normPairs);

        // Grupo C+ — leitura (janelas mín/máx por semana)
        const minSem = extrair(regras, "restricoes.janelas_min_semana", null);
        const maxSem = extrair(regras, "restricoes.janelas_max_semana", null);
        setGrupoCJanelasMin(Number.isFinite(Number(minSem)) ? Number(minSem) : null);
        setGrupoCJanelasMax(Number.isFinite(Number(maxSem)) ? Number(maxSem) : null);

        // Grupo E — leitura
        const seq = Number(pesos?.sequencia_preferencia ?? 0);
        setGrupoESequencia(Number.isFinite(seq) ? Math.max(0, Math.min(10, Math.round(seq))) : 0);

        // Editor de JSON
        setRegrasText(JSON.stringify(regras || {}, null, 2));
      } catch (e) {
        console.error(e);
        setErro("Não foi possível carregar as preferências.");
      } finally { setCarregando(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, professor?.id, turno]);

  // Avançado → aplicar JSON manual
  function aplicarRegrasText() {
    try {
      const obj = JSON.parse(regrasText || "{}");
      setField("regras_json", obj);

      const pesos = extrairPesos(obj);
      const pairs = grupoAItems.map(it => [it.key, pesos[it.weightKey] ?? null]);
      if (pairs.some(([,v]) => v !== null)) {
        pairs.sort((a,b) => Number(b[1] ?? 0) - Number(a[1] ?? 0));
        setGrupoAOrder(pairs.map(([k]) => k));
      } else {
        setGrupoAOrder(grupoAItems.map(i => i.key));
      }

      // Grupo B (modo cru)
      const tmin = Number(extrair(obj, "blocos.tamanho_minimo", NaN));
      const tmax = Number(extrair(obj, "blocos.tamanho_maximo", NaN));
      let modo = null;
      if (tmin === 1 && tmax === 1) modo = "unica";
      else if (tmin === 2 && tmax === 2) modo = "dupla";
      else if (tmin === 3 && tmax === 3) modo = "tripla";
      setGrupoBModo(modo);

      // Grupo B (preset fino)
      const p = extrairPesos(obj);
      const guessPresetBlocos = () => {
        if (tmin === 1 && tmax === 1) {
          if ((p.preferir_unica ?? 0) >= 9) return "unica_forte";
          if ((p.preferir_unica ?? 0) >= 5) return "unica_suave";
        }
        if (tmin === 2 && tmax === 2) {
          if ((p.preferir_dupla ?? 0) >= 9) return "dupla_forte";
          if ((p.preferir_dupla ?? 0) >= 5) return "dupla_suave";
        }
        if (tmin === 3 && tmax === 3) {
          if ((p.preferir_tripla ?? 0) >= 9) return "tripla_forte";
          if ((p.preferir_tripla ?? 0) >= 5) return "tripla_suave";
        }
        return "nenhum";
      };
      setGrupoBPreset(guessPresetBlocos());

      // Grupo A+ (preset janelas) — heurística
      const ejm = p.evitar_janela_meio ?? 0;
      const pin = p.preferir_inicio_turno ?? 0;
      const pfi = p.preferir_fim_turno ?? 0;
      const epp = p.evitar_primeiro_periodo ?? 0;
      const eup = p.evitar_ultimo_periodo ?? 0;
      const guessPresetJanelas = () => {
        if (ejm >= 9 && pin >= 7 && pfi >= 7) return "bordas_fortes";
        if (ejm >= 9) return "anti_meio_forte";
        if (pin >= 9 && epp <= 1) return "inicio_forte";
        if (pfi >= 9 && eup <= 1) return "fim_forte";
        if (ejm >= 6 && pin >= 5 && pfi >= 5) return "equilibrado";
        return "nenhum";
      };
      setGrupoAPreset(guessPresetJanelas());

      // Grupo C
      const dias = Array.isArray(extrair(obj, "restricoes.dias_bloqueados", []))
        ? extrair(obj, "restricoes.dias_bloqueados", []) : [];
      const baseDias = { 1:false,2:false,3:false,4:false,5:false,6:false,7:false };
      dias.forEach((n) => { if (baseDias[n] !== undefined) baseDias[n] = true; });
      setGrupoCDias(baseDias);

      // Grupo C+ pares
      const pares = Array.isArray(extrair(obj, "restricoes.evitar_pares_dias", []))
        ? extrair(obj, "restricoes.evitar_pares_dias", []) : [];
      const normPairs = pares
        .filter((p2) => Array.isArray(p2) && p2.length === 2)
        .map(([a,b]) => [Number(a), Number(b)].sort((x,y) => x-y));
      setGrupoCPares(normPairs);

      // Grupo C+ janelas mín/máx
      const minSem = extrair(obj, "restricoes.janelas_min_semana", null);
      const maxSem = extrair(obj, "restricoes.janelas_max_semana", null);
      setGrupoCJanelasMin(Number.isFinite(Number(minSem)) ? Number(minSem) : null);
      setGrupoCJanelasMax(Number.isFinite(Number(maxSem)) ? Number(maxSem) : null);

      // Grupo E
      const seq = Number(pesos?.sequencia_preferencia ?? 0);
      setGrupoESequencia(Number.isFinite(seq) ? Math.max(0, Math.min(10, Math.round(seq))) : 0);

      setErro("");
    } catch {
      setErro("JSON inválido em 'Avançado (regras_json)'.");
    }
  }

  // Util: alternar marcação de um par padrão
  function togglePair([a, b]) {
    const key = JSON.stringify([Math.min(a,b), Math.max(a,b)]);
    setGrupoCPares((prev) => {
      const set = new Set(prev.map((p) => JSON.stringify([Math.min(p[0],p[1]), Math.max(p[0],p[1])])));
      if (set.has(key)) {
        return prev.filter((p) => JSON.stringify([Math.min(p[0],p[1]), Math.max(p[0],p[1])]) !== key);
      } else {
        return [...prev, [Math.min(a,b), Math.max(a,b)]];
      }
    });
  }

  // Builder único: gera regras_json_auto e merged (usado em Salvar e Simulador)
  function buildRegras() {
    // Grupo A: ordem → pesos 0..10 (topo=10)
    const pesosA = orderToWeightsGeneric(grupoAItems, grupoAOrder, { max: 10, min: 0 });

    // Grupo B (modo cru): blocos e preferências simples
    let blocos = {};
    const pesosB = {};
    if (grupoBModo === "unica") { blocos = { tamanho_minimo:1, tamanho_maximo:1 }; pesosB.preferir_unica = 8; }
    if (grupoBModo === "dupla") { blocos = { tamanho_minimo:2, tamanho_maximo:2 }; pesosB.preferir_dupla = 8; }
    if (grupoBModo === "tripla") { blocos = { tamanho_minimo:3, tamanho_maximo:3 }; pesosB.preferir_tripla = 8; }

    // Grupo B (preset fino): aplica curva não linear se diferente de "nenhum"
    let pesosPresetBlocos = {};
    if (grupoBPreset && grupoBPreset !== "nenhum" && BLOCO_PRESETS[grupoBPreset]) {
      const { blocos: bPreset, pesosExtra } = BLOCO_PRESETS[grupoBPreset]();
      blocos = { ...blocos, ...bPreset };
      pesosPresetBlocos = { ...pesosExtra };
    }

    // Grupo A+ (preset de janelas)
    let pesosPresetJanelas = {};
    if (grupoAPreset && grupoAPreset !== "nenhum" && JANELA_PRESETS[grupoAPreset]) {
      const { pesosExtra } = JANELA_PRESETS[grupoAPreset]();
      pesosPresetJanelas = { ...pesosExtra };
    }

    // Grupo C: dias_bloqueados (1..7)
    const dias_bloqueados = Object.entries(grupoCDias)
      .filter(([,v]) => !!v)
      .map(([k]) => Number(k))
      .sort((a,b) => a-b);

    // Grupo C+: pares específicos de dias e janelas mín/máx por semana
    const evitar_pares_dias = grupoCPares
      .map(([a,b]) => [Number(a), Number(b)].sort((x,y) => x-y))
      .filter((p, idx, arr) => idx === arr.findIndex(q => q[0] === p[0] && q[1] === p[1]));

    const restricoesExtra = {
      dias_bloqueados,
      ...(evitar_pares_dias.length ? { evitar_pares_dias } : {}),
      ...(Number.isFinite(Number(grupoCJanelasMin)) ? { janelas_min_semana: Number(grupoCJanelasMin) } : {}),
      ...(Number.isFinite(Number(grupoCJanelasMax)) ? { janelas_max_semana: Number(grupoCJanelasMax) } : {}),
    };

    // Grupo D (reforço do Passo 1)
    const plusD = {};
    if (Number(form.max_slots_mesma_turma_dia) === 1) {
      plusD.nao_repetir_mesma_turma_no_dia = 10;
    }

    // Grupo E: intensidade 0..10
    const pesosE = { sequencia_preferencia: Math.max(0, Math.min(10, Number(grupoESequencia) || 0)) };

    const regras_json_auto = {
      pesos: { ...pesosA, ...pesosB, ...pesosPresetBlocos, ...pesosPresetJanelas, ...plusD, ...pesosE },
      restricoes: { ...restricoesExtra },
      blocos,
    };

    // Merge não-destrutivo com o que já existir
    const atual = form.regras_json || {};
    const merged = {
      ...atual,
      pesos: { ...(atual.pesos || {}), ...(regras_json_auto.pesos || {}) },
      restricoes: { ...(atual.restricoes || {}), ...(regras_json_auto.restricoes || {}) },
      blocos: { ...(atual.blocos || {}), ...(regras_json_auto.blocos || {}) },
    };

    return { regras_json_auto, merged };
  }

  // Simulador rápido ----------------------------------------------------
  function simular() {
    const { merged } = buildRegras();
    setSimPreview(JSON.stringify(merged, null, 2));
    setCopiado(false);
  }
  async function copiarPreview() {
    try {
      await navigator.clipboard.writeText(simPreview || "");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {}
  }

  // Salvar ---------------------------------------------------------------
  async function salvar() {
    try {
      setSalvando(true); setErro("");

      const { merged } = buildRegras();

      const res = await fetch("/api/preferencias/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          professor_id: Number(professor.id),
          turno: turnoNorm,
          // Mantidos
          prefere_aula_dupla: !!form.prefere_aula_dupla,
          prefere_aula_unica: !!form.prefere_aula_unica,
          evitar_janela_interna: !!form.evitar_janela_interna,
          janela_no_inicio_ok: !!form.janela_no_inicio_ok,
          janela_no_fim_ok: !!form.janela_no_fim_ok,
          max_slots_mesma_turma_dia: Number(form.max_slots_mesma_turma_dia || 0),
          // Novo JSON mesclado
          regras_json: merged,
        }),
      });

      const json = await res.json();
      if (!res.ok || json?.ok !== true) throw new Error(json?.error || "Falha ao salvar");

      onClose?.(true);
    } catch (e) {
      console.error(e);
      setErro(e.message || "Erro ao salvar preferências");
    } finally { setSalvando(false); }
  }

  // UI ------------------------------------------------------------------
  if (!open) return null;

  const Dia = ({ n, label }) => (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={!!grupoCDias[n]} onChange={(e) => setGrupoCDias(s => ({ ...s, [n]: e.target.checked }))} />
      <span>{label}</span>
    </label>
  );

  const PairChip = ({ pair }) => {
    const [a,b] = pair;
    const active = !!grupoCPares.find((p) => p[0] === Math.min(a,b) && p[1] === Math.max(a,b));
    return (
      <button type="button" onClick={() => togglePair(pair)}
        className={`px-2 py-1 rounded-full text-xs border ${active ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-800 border-blue-300 hover:bg-blue-50'}`}>
        {labelDia(a)} + {labelDia(b)}
      </button>
    );
  };

  function labelDia(n) {
    return ["","Seg","Ter","Qua","Qui","Sex","Sáb","Dom"][n] || String(n);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={() => onClose?.(false)} />
      <div className="min-h-full flex items-start justify-center p-4">
        <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl my-8 flex flex-col max-h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-blue-900">
              Preferências — {professor?.nome || "Professor"} — <span className="uppercase">{turnoNorm}</span>
            </h2>
            {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {carregando ? (
              <p className="text-sm text-gray-600">Carregando…</p>
            ) : (
              <>
                {/* Linha 1: Formato + Janelas (mantido) */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                    <h3 className="font-semibold text-blue-900 mb-2">Formato da Aula</h3>
                    <div className="space-y-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.prefere_aula_dupla}
                          onChange={(e) => setField("prefere_aula_dupla", e.target.checked)} />
                        <span>Prefere aula dupla</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.prefere_aula_unica}
                          onChange={(e) => setField("prefere_aula_unica", e.target.checked)} />
                        <span>Prefere aula única</span>
                      </label>
                      <p className="text-xs text-blue-700/80">(São excludentes: marcar um desmarca o outro.)</p>
                    </div>
                  </div>

                  <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                    <h3 className="font-semibold text-blue-900 mb-2">Janelas</h3>
                    <div className="space-y-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.evitar_janela_interna}
                          onChange={(e) => setField("evitar_janela_interna", e.target.checked)} />
                        <span>Evitar janelas no meio do dia (forte)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.janela_no_inicio_ok}
                          onChange={(e) => setField("janela_no_inicio_ok", e.target.checked)} />
                        <span>Aceita janela no início</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.janela_no_fim_ok}
                          onChange={(e) => setField("janela_no_fim_ok", e.target.checked)} />
                        <span>Aceita janela no fim</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Linha 2: Limites (mantido) */}
                <div className="bg-white p-4 rounded-xl border">
                  <h3 className="font-medium text-blue-900 mb-2">Limites</h3>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700">Máx. entradas na mesma turma por dia:</label>
                    <input type="number" min={1} max={10} value={form.max_slots_mesma_turma_dia}
                      onChange={(e) => setField("max_slots_mesma_turma_dia", Number(e.target.value || 0))}
                      className="w-20 border rounded px-2 py-1" />
                  </div>
                </div>

                {/* Linha 3: Grupo A — Ordem com setas (5 itens) */}
                <PriorityOrderGroup
                  items={grupoAItems}
                  value={grupoAOrder}
                  onChange={(next) => setGrupoAOrder(next)}
                />

                {/* Linha 4: Grupo A+ — Presets de janelas por posição */}
                <div className="bg-white p-4 rounded-xl border">
                  <h3 className="font-medium text-blue-900 mb-2">Janelas — Presets por posição do dia</h3>
                  <p className="text-xs text-blue-700 mb-2">Ajusta pesos de início/meio/fim conforme estratégia.</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(JANELA_PRESETS).map((k) => (
                      <button key={k} type="button" onClick={() => setGrupoAPreset(k)}
                        className={`px-2 py-1 rounded border text-xs ${grupoAPreset===k? 'bg-blue-600 text-white border-blue-700':'bg-white text-blue-800 border-blue-300 hover:bg-blue-50'}`}>
                        {k.replace(/_/g," ")}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1">Ex.: "bordas_fortes" → evita o meio, prefere início e fim.</p>
                </div>

                {/* Linha 5: Grupo B — Blocos */}
                <div className="bg-white p-4 rounded-xl border space-y-3">
                  <h3 className="font-medium text-blue-900">Grupo B — Blocos</h3>
                  <p className="text-xs text-blue-700">Escolha o tamanho desejado do bloco de aula.</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="grupoB" checked={grupoBModo === "unica"}
                        onChange={() => setGrupoBModo("unica")} />
                      <span>Única</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="grupoB" checked={grupoBModo === "dupla"}
                        onChange={() => setGrupoBModo("dupla")} />
                      <span>Dupla</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="grupoB" checked={grupoBModo === "tripla"}
                        onChange={() => setGrupoBModo("tripla")} />
                      <span>Tripla</span>
                    </label>
                    <button type="button" className="ml-auto text-xs underline" onClick={() => setGrupoBModo(null)}>
                      Limpar escolha
                    </button>
                  </div>

                  {/* Presets finos de curva (não linear) */}
                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Presets finos (curvas)</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(BLOCO_PRESETS).map((k) => (
                        <button key={k} type="button" onClick={() => setGrupoBPreset(k)}
                          className={`px-2 py-1 rounded border text-xs ${grupoBPreset===k? 'bg-blue-600 text-white border-blue-700':'bg-white text-blue-800 border-blue-300 hover:bg-blue-50'}`}>
                          {k.replace("_"," ")}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-blue-700 mt-1">
                      Dica: o preset substitui/ajusta os pesos de preferência de bloco.
                    </p>
                  </div>
                </div>

                {/* Linha 6: Grupo C — Distribuição semanal + Extensões */}
                <div className="bg-white p-4 rounded-xl border space-y-4">
                  <div>
                    <h3 className="font-medium text-blue-900 mb-2">Grupo C — Distribuição semanal</h3>
                    <p className="text-xs text-blue-700 mb-2">Marque os dias a evitar (bloquear).</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 text-sm">
                      <Dia n={1} label="Evitar segundas-feiras" />
                      <Dia n={2} label="Evitar terças-feiras" />
                      <Dia n={3} label="Evitar quartas-feiras" />
                      <Dia n={4} label="Evitar quintas-feiras" />
                      <Dia n={5} label="Evitar sextas-feiras" />
                      <Dia n={6} label="Evitar sábados" />
                      <Dia n={7} label="Evitar domingos" />
                    </div>
                  </div>

                  {/* C+ Pares específicos */}
                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Evitar pares específicos de dias</h4>
                    <div className="flex flex-wrap gap-2">
                      {PARES_PADRAO.map((pair) => (
                        <PairChip key={pair.join('-')} pair={pair} />
                      ))}
                    </div>
                    {grupoCPares.length > 0 && (
                      <p className="text-[11px] text-blue-700 mt-1">Selecionados: {grupoCPares.map(([a,b]) => `${labelDia(a)}+${labelDia(b)}`).join(', ')}</p>
                    )}
                  </div>

                  {/* C+ Janelas mín/máx por semana */}
                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Janelas mín./máx. por semana</h4>
                    <div className="flex items-center gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <span>Mín.:</span>
                        <input type="number" min={0} max={50} value={grupoCJanelasMin ?? ''}
                          onChange={(e) => setGrupoCJanelasMin(e.target.value === '' ? null : Number(e.target.value))}
                          className="w-20 border rounded px-2 py-1" />
                      </label>
                      <label className="flex items-center gap-2">
                        <span>Máx.:</span>
                        <input type="number" min={0} max={50} value={grupoCJanelasMax ?? ''}
                          onChange={(e) => setGrupoCJanelasMax(e.target.value === '' ? null : Number(e.target.value))}
                          className="w-20 border rounded px-2 py-1" />
                      </label>
                      <span className="text-[11px] text-blue-700">(deixe em branco para não aplicar)</span>
                    </div>
                  </div>
                </div>

                {/* Linha 7: Grupo E — Sequência (0–10) */}
                <div className="bg-white p-4 rounded-xl border">
                  <h3 className="font-medium text-blue-900 mb-2">Grupo E — Sequência (0–10)</h3>
                  <p className="text-xs text-blue-700 mb-2">Intensidade da preferência por sequências (0=ignorar, 10=muito forte).</p>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={10} value={grupoESequencia}
                      onChange={(e) => setGrupoESequencia(Number(e.target.value))} className="flex-1" />
                    <input type="number" min={0} max={10} value={grupoESequencia}
                      onChange={(e) => setGrupoESequencia(Math.max(0, Math.min(10, Number(e.target.value)||0)))}
                      className="w-16 border rounded px-2 py-1 text-sm" />
                  </div>
                </div>

                {/* Linha 8: Simulador rápido */}
                <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-blue-900">Simulador rápido (pré-visualização do regras_json mesclado)</h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={simular}
                        className="px-3 py-1.5 rounded border bg-blue-600 text-white text-sm hover:bg-blue-700">
                        Simular (ver JSON)
                      </button>
                      <button type="button" onClick={copiarPreview} disabled={!simPreview}
                        className={`px-3 py-1.5 rounded border text-sm ${simPreview? 'bg-green-600 text-white hover:bg-green-700':'bg-gray-200 text-gray-500'}`}>
                        {copiado ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                  <textarea readOnly value={simPreview || ''} rows={10}
                    placeholder="Clique em Simular para ver o JSON final mesclado."
                    className="w-full border rounded p-2 font-mono text-sm bg-white" />
                </div>

                {/* Linha 9: Avançado (JSON) */}
                <div className="bg-white p-4 rounded-xl border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-blue-900">Avançado (regras_json)</h3>
                    <button type="button" onClick={aplicarRegrasText}
                      className="px-3 py-1.5 rounded border bg-blue-600 text-white text-sm hover:bg-blue-700"
                      title="Aplicar JSON no formulário">
                      Aplicar
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">
                    Os campos controlados por este modal serão mesclados aqui ao salvar.
                  </p>
                  <textarea value={regrasText} onChange={(e) => setRegrasText(e.target.value)} rows={10}
                    className="w-full border rounded p-2 font-mono text-sm" />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
            <button type="button" onClick={() => onClose?.(false)}
              className="px-4 py-2 rounded border bg-white hover:bg-gray-100" disabled={salvando}>
              Cancelar
            </button>
            <button type="button" onClick={salvar} disabled={salvando}
              className={`px-4 py-2 rounded text-white ${salvando ? "bg-green-300" : "bg-green-600 hover:bg-green-700"}`}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
