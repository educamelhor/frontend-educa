// src/features/secretaria/horarios/LayoutGrade.jsx
// ============================================================================
// Layout de Grade (Fase 2.4 — Toggle de Layout + Mini cabeçalho por célula)
// - Renderiza malha por dia/período.
// - Busca payload via POST /api/grade/solve (idempotente).
// - Abas por turma.
// - Pool de aulas por turma (faltas = demanda - atribuições - alocações locais).
// - Drag & Drop do Pool para a malha (visual, sem persistência).
// - Disponibilidades:
//   • Pinta automaticamente os slots (⛔ indisponível, ⚠ evitar, ✓ livre) conforme
//     o professor de referência (selecionado no topo OU item em arrasto).
//   • Mini cabeçalho dentro de cada célula com o ícone de status.
//   • Seletor “Ref. Professor” flutuante dentro do quadro da malha para alternar
//     rapidamente o professor de referência.
// - Clique na célula abre o Modal de Disponibilidade no dia correspondente
//   (se houver professor selecionado no topo).
// - Recebe { turno, turmaIds } via React Router (state).
// - NOVO: Alternância de layout (Dias nas COLUNAS  ⇄  Dias nas LINHAS).
//
// + PASSO 3.2.4 (correção do bloqueio do TESTE A):
//   • Resolver professor_id a partir da MODULAÇÃO (turma_id + disciplina_id),
//     evitando depender apenas de payload.professores (que pode vir vazio).
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModalDisponibilidadeProfessor from "./ModalDisponibilidadeProfessor.jsx";
import ModalPreferenciasProfessor from "./ModalPreferenciasProfessor.jsx";

// ---------------------------------------------------------------------------
// ——— Toast (bem leve, sem lib externa) ———
// ---------------------------------------------------------------------------
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (type, msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };
  return {
    showSuccess: (m) => show("success", m),
    showError: (m) => show("error", m),
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

// ---------------------------------------------------------------------------
// Helper HTTP autenticado
// ---------------------------------------------------------------------------
async function apiFetch(url, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Util de ordenação por ordem do período
// ---------------------------------------------------------------------------
function sortByOrdem(a, b) {
  return (a.ordem || 0) - (b.ordem || 0);
}

// Nome de dia
const NOME_DIA_LONGO = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const nomeDia = (d) => NOME_DIA_LONGO[d] || `Dia ${d}`;

export default function LayoutGrade() {
  const nav = useNavigate();
  const { state } = useLocation();
  const toast = useToast();

  // -------------------------------------------------------------------------
  // Estado base (turno / turmas do wizard)
  // -------------------------------------------------------------------------
  const [turno] = useState(state?.turno || "");
  const [turmaIds] = useState(state?.turmaIds || state?.turma_ids || []);

  // -------------------------------------------------------------------------
  // Dados carregados
  // -------------------------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [tabTurma, setTabTurma] = useState(null); // id da turma ativa
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastDraftId, setLastDraftId] = useState(null);

  // -------------------------------------------------------------------------
  // Alocações locais (visual, por turma)
  // - Estrutura: { turmaId: { "dia-ordem": { disciplina_id, label } } }
  // -------------------------------------------------------------------------
  const [slotsByTurma, setSlotsByTurma] = useState({});

  // -------------------------------------------------------------------------
  // Item atualmente em arrasto (para feedback de disponibilidade)
  // - Estrutura: { disciplina_id, professor_id } | null
  // -------------------------------------------------------------------------
  const [dragging, setDragging] = useState(null);

  // -------------------------------------------------------------------------
  // Modal de Disponibilidades (professor/dia) e Preferências
  // -------------------------------------------------------------------------
  const [dispOpen, setDispOpen] = useState(false);
  const [selProfId, setSelProfId] = useState(null);
  const [selDia, setSelDia] = useState(1);
  const [prefOpen, setPrefOpen] = useState(false);

  // -------------------------------------------------------------------------
  // NOVO: Toggle de layout da malha
  //   "dias-colunas" = colunas = dias | linhas = períodos (Urânia)
  //   "dias-linhas"  = linhas = dias  | colunas = períodos (tradicional)
  // -------------------------------------------------------------------------
  const [layoutMode, setLayoutMode] = useState("dias-colunas");

  // -------------------------------------------------------------------------
  // Guard: se abrir sem turno/turmas, volta ao wizard
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!turno || !Array.isArray(turmaIds) || turmaIds.length === 0) {
      nav("/secretaria/horarios", { replace: true });
    }
  }, [turno, turmaIds, nav]);

  // -------------------------------------------------------------------------
  // Carregar payload (pré-solve + dados) — idempotente
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancel = false;
    async function run() {
      try {
        setLoading(true);
        setError("");
        // Envia ambas as formas (snake/camel) por compatibilidade
        const body = { turno, turma_ids: turmaIds, turmaIds };
        const data = await apiFetch("/api/grade/solve", { method: "POST", body });
        if (!cancel) {
          setPayload(data?.payload || null);
          const first = (data?.payload?.turmas || [])[0]?.id || null;
          setTabTurma(first);
        }
      } catch (e) {
        if (!cancel) setError(e.message || "Falha ao carregar payload.");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    run();
    return () => {
      cancel = true;
    };
  }, [turno, turmaIds]);

  // -------------------------------------------------------------------------
  // Índices auxiliares
  // -------------------------------------------------------------------------

  // Mapa disciplina_id -> professor_id (primeiro encontrado)
  // OBS: Esse mapa pode vir vazio dependendo de como o backend monta payload.professores.
  const professorPorDisciplina = useMemo(() => {
    const map = {};
    for (const p of payload?.professores || []) {
      const disc = Number(p.disciplina_id || 0);
      if (disc && !map[disc]) map[disc] = Number(p.id);
    }
    return map;
  }, [payload]);

  // -------------------------------------------------------------------------
  // PASSO 3.2.4 — Índice de modulação (turma+disciplina -> professor)
  // Fonte prioritária: payload.modulacao; fallback: payload.atribuicoes
  // Isso resolve o caso do seu print: turma 147 + disciplina 21 -> professor 64.
  // -------------------------------------------------------------------------
  const professorPorTurmaDisciplina = useMemo(() => {
    const map = {};
    const fonte = Array.isArray(payload?.modulacao)
      ? payload.modulacao
      : Array.isArray(payload?.atribuicoes)
        ? payload.atribuicoes
        : [];

    for (const m of fonte) {
      const turma_id = Number(m.turma_id || 0);
      const disciplina_id = Number(m.disciplina_id || 0);
      const professor_id = Number(m.professor_id || 0);
      if (!turma_id || !disciplina_id || !professor_id) continue;

      const key = `${turma_id}-${disciplina_id}`;
      // Primeiro encontrado vira “professor padrão” daquela turma+disciplina
      if (!map[key]) map[key] = professor_id;
    }
    return map;
  }, [payload]);

  function getProfessorIdParaTurmaDisciplina(turma_id, disciplina_id) {
    const key = `${Number(turma_id)}-${Number(disciplina_id)}`;

    // 1) Regra principal: MODULAÇÃO (turma+disciplina)
    if (professorPorTurmaDisciplina[key]) return Number(professorPorTurmaDisciplina[key]);

    // 2) Fallback legado: professorPorDisciplina (quando houver)
    if (professorPorDisciplina[Number(disciplina_id)]) return Number(professorPorDisciplina[Number(disciplina_id)]);

    // 3) Fallback opcional por contexto (não força, apenas ajuda quando consistente):
    // Se o usuário selecionou um professor no topo, e ele é da mesma disciplina, pode servir como fallback.
    // (Mantemos conservador: só quando disciplina coincide.)
    if (selProfId && payload?.professores?.length) {
      const prof = (payload.professores || []).find((p) => Number(p.id) === Number(selProfId));
      if (prof && Number(prof.disciplina_id) === Number(disciplina_id)) return Number(selProfId);
    }

    return null;
  }

  // Índices de disponibilidade/evitar por professor/dia/ordem
  // chave = `${prof}-${dia}-${ordem}`
  const { disponibilidadeIndex, evitarIndex } = useMemo(() => {
    const disp = {};
    const ev = {};
    for (const d of payload?.disponibilidades || []) {
      const key = `${d.professor_id}-${d.dia}-${d.ordem}`;
      const status = String(d.status || "livre").toLowerCase();
      disp[key] = status !== "indisponivel";
      ev[key] = status === "evitar";
    }
    return { disponibilidadeIndex: disp, evitarIndex: ev };
  }, [payload]);

  // Encontra objeto professor por id (para mostrar nome/tooltip)
  const refProfessorObj = useMemo(() => {
    if (!selProfId) return null;
    // Procurar na lista pronta
    let p = (payload?.professores || []).find((pp) => Number(pp.id) === Number(selProfId));
    if (p) return p;
    // Fallback: derivar a partir da modulação (ou atribuicoes)
    const fonte = Array.isArray(payload?.modulacao)
      ? payload.modulacao
      : Array.isArray(payload?.atribuicoes)
        ? payload.atribuicoes
        : [];
    const achado = fonte.find((m) => Number(m.professor_id) === Number(selProfId));
    if (!achado) return null;
    return {
      id: Number(achado.professor_id),
      nome: achado.professor_nome || achado.nome_professor || `Prof. ${achado.professor_id}`,
      disciplina_id: Number(achado.disciplina_id) || null,
    };
  }, [selProfId, payload]);

  // Checagens de disponibilidade (se não houver dados, assume disponível)
  function isProfessorDisponivel(profId, dia, ordem) {
    if (!profId) return true;
    const key = `${profId}-${dia}-${ordem}`;
    return Object.prototype.hasOwnProperty.call(disponibilidadeIndex, key) ? disponibilidadeIndex[key] : true;
  }
  function isProfessorEvitar(profId, dia, ordem) {
    if (!profId) return false;
    const key = `${profId}-${dia}-${ordem}`;
    return !!evitarIndex[key];
  }

  // -------------------------------------------------------------------------
  // Professores ordenados (com FALLBACK via modulação/atribuicoes)
  // -------------------------------------------------------------------------
  const professoresOrdenados = useMemo(() => {
    // 1) Usar lista vinda pronta
    let arr = Array.isArray(payload?.professores) ? [...payload.professores] : [];

    // 2) Fallback: montar a partir de modulação/atribuicoes
    if (arr.length === 0) {
      const fonte = Array.isArray(payload?.modulacao)
        ? payload.modulacao
        : Array.isArray(payload?.atribuicoes)
          ? payload.atribuicoes
          : [];
      const map = new Map(); // prof_id -> { id, nome, disciplina_id }
      for (const m of fonte) {
        const id = Number(m.professor_id);
        if (!id) continue;
        if (!map.has(id)) {
          map.set(id, {
            id,
            nome: m.professor_nome || m.nome_professor || `Prof. ${id}`,
            disciplina_id: Number(m.disciplina_id) || null,
          });
        }
      }
      arr = Array.from(map.values());
    }

    // 3) Ordenar A→Z (acento-insensível)
    arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || "", "pt-BR", { sensitivity: "base" }));
    return arr;
  }, [payload]);

  // -------------------------------------------------------------------------
  // Nome de disciplina por id (com FALLBACK via demanda)
  // -------------------------------------------------------------------------
  const disciplinaMap = useMemo(() => {
    const map = {};
    // a) Lista de disciplinas (se houver)
    for (const d of payload?.disciplinas || []) {
      const nome = d?.nome ?? d?.disciplina ?? d?.titulo ?? null;
      if (nome) map[Number(d.id)] = nome;
    }
    // b) Fallback via demanda.disciplina_nome
    for (const d of payload?.demanda || []) {
      if (d.disciplina_id && d.disciplina_nome && !map[Number(d.disciplina_id)]) {
        map[Number(d.disciplina_id)] = d.disciplina_nome;
      }
    }
    return map;
  }, [payload]);

  function nomeDisciplinaDoProfessor(p) {
    const did = Number(p?.disciplina_id) || null;
    return (
      p?.disciplina_nome ??
      p?.disciplina ??
      p?.disciplinaNome ??
      p?.nome_disciplina ??
      (did ? disciplinaMap[did] : null) ??
      (did ? `Disc ${did}` : "—")
    );
  }

  // -------------------------------------------------------------------------
  // Dias e grade ordenada (com FALLBACK via grade_base)
  // -------------------------------------------------------------------------
  const dias = useMemo(() => {
    if (payload?.grade && Object.keys(payload.grade).length) {
      return Object.keys(payload.grade).map(Number).sort((a, b) => a - b);
    }
    const gb = payload?.grade_base || {};
    return Object.keys(gb).map(Number).sort((a, b) => a - b);
  }, [payload]);

  const gradeOrdenada = useMemo(() => {
    if (payload?.grade && Object.keys(payload.grade).length) {
      const g = payload.grade;
      const out = {};
      for (const d of Object.keys(g)) {
        out[d] = [...(g[d] || [])].sort(sortByOrdem);
      }
      return out;
    }
    // Fallback: transformar grade_base em estrutura semelhante
    const gb = payload?.grade_base || {};
    const out = {};
    for (const [d, arr] of Object.entries(gb)) {
      out[d] = [...(arr || [])].sort(sortByOrdem);
    }
    return out;
  }, [payload]);

  // Total de períodos (linhas) na malha (para informar o modal)
  const totalPeriodos = useMemo(() => {
    const maxLinhas = Math.max(0, ...dias.map((d) => (gradeOrdenada[d] || []).length));
    return maxLinhas || 6; // fallback padrão
  }, [dias, gradeOrdenada]);

  // -------------------------------------------------------------------------
  // Nomes de disciplina por id (fallback extra: /api/disciplinas)
  // -------------------------------------------------------------------------
  const [disciplinaById, setDisciplinaById] = useState({});

  useEffect(() => {
    const map = { ...disciplinaMap };
    if (Object.keys(map).length > 0) {
      setDisciplinaById(map);
      return;
    }
    (async () => {
      try {
        const lista = await apiFetch("/api/disciplinas");
        const m = {};
        for (const d of lista || []) {
          const nome = d?.nome ?? d?.disciplina ?? d?.titulo ?? null;
          if (nome != null && d?.id != null) m[String(d.id)] = nome;
        }
        setDisciplinaById(m);
      } catch {}
    })();
  }, [disciplinaMap]);

  function nomeDisciplinaAmigavelPorId(id) {
    if (id == null) return "—";
    const key = String(id);
    return disciplinaById[key] || `Disc ${id}`;
  }

  // -------------------------------------------------------------------------
  // Pool da turma ativa (faltam = demanda - atribuições - alocações locais)
  // -------------------------------------------------------------------------
  const poolDaTurma = useMemo(() => {
    if (!payload || !tabTurma) return [];

    const dem = (payload.demanda || []).filter((d) => d.turma_id === tabTurma);

    // Compatibilidade: algumas versões chamam de "atribuicoes"
    const atribFonte = Array.isArray(payload?.atribuicoes)
      ? payload.atribuicoes
      : Array.isArray(payload?.modulacao)
        ? payload.modulacao
        : [];

    const atribPorDisc = atribFonte.reduce((acc, a) => {
      const k = String(a.disciplina_id);
      // quando for modulacao, contamos como 0 (não diminui carga) — só para mapear
      const aulas = Number(a.aulas || 0);
      acc[k] = (acc[k] || 0) + (Number.isFinite(aulas) ? aulas : 0);
      return acc;
    }, {});

    const localMap = slotsByTurma[tabTurma] || {};
    const localPorDisc = Object.values(localMap).reduce((acc, item) => {
      const k = String(item.disciplina_id);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    const itens = [];
    for (const d of dem) {
      const k = String(d.disciplina_id);
      // d.carga ou d.aulas_semana dependendo do schema
      const demanda = Number(d.aulas_semana ?? d.carga ?? 0);
      const falta = demanda - Number(atribPorDisc[k] || 0) - Number(localPorDisc[k] || 0);
      if (falta > 0) {
        itens.push({
          id: `disc-${d.disciplina_id}`,
          disciplina_id: d.disciplina_id,
          turma_id: tabTurma,
          aulas_restantes: falta,
          label: `${nomeDisciplinaAmigavelPorId(d.disciplina_id)} • faltam ${falta}`,
        });
      }
    }
    itens.sort((a, b) => b.aulas_restantes - a.aulas_restantes);
    return itens;
  }, [payload, tabTurma, slotsByTurma, disciplinaById]);

  // -------------------------------------------------------------------------
  // Drag & Drop do Pool
  // -------------------------------------------------------------------------
  function onDragStartPoolItem(e, item) {
    const disciplina_id = Number(item.disciplina_id) || 0;

    // PASSO 3.2.4 — resolve professor pelo índice turma+disciplina (modulação)
    const professor_id =
      getProfessorIdParaTurmaDisciplina(item.turma_id, disciplina_id) || null;

    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        tipo: "pool",
        turma_id: item.turma_id,
        disciplina_id,
        professor_id,
        label: item.label,
      })
    );

    setDragging({ disciplina_id, professor_id });
  }

  function onDragEndPoolItem() {
    setDragging(null);
  }

  // -------------------------------------------------------------------------
  // Professor de referência para pintura/bloqueio
  // -------------------------------------------------------------------------
  function getRefProfessorId() {
    return dragging?.professor_id ?? (selProfId || null);
  }

  function isSlotBlocked(dia, ordem) {
    const profId = getRefProfessorId();
    if (!profId) return false; // sem referência => não bloqueia
    return !isProfessorDisponivel(profId, dia, ordem);
  }
  function isSlotEvitar(dia, ordem) {
    const profId = getRefProfessorId();
    if (!profId) return false;
    return isProfessorEvitar(profId, dia, ordem);
  }

  // -------------------------------------------------------------------------
  // Handlers DnD de slot
  // -------------------------------------------------------------------------
  function onDragOverSlot(e, dia, ordem) {
    const has = (slotsByTurma[tabTurma] || {})[`${dia}-${ordem}`];
    if (!isSlotBlocked(dia, ordem) && !has) e.preventDefault();
  }

  async function onDropSlot(e, dia, ordem) {
    if (isSlotBlocked(dia, ordem)) return;
    e.preventDefault();

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
      if (data?.tipo !== "pool" || !tabTurma) return;

      const turma_id = Number(tabTurma);
      const disciplina_id = Number(data.disciplina_id);

      // PASSO 3.2.4 — garante resolução do professor mesmo se vier null no drag
      const resolvedProfId =
        data.professor_id ||
        getProfessorIdParaTurmaDisciplina(turma_id, disciplina_id) ||
        0;

      const professor_id = Number(resolvedProfId);

      if (!disciplina_id || !professor_id) {
        toast.showError("Não foi possível identificar a disciplina/professor.");
        return;
      }

      // --- OTIMISTA: aplica na UI ---
      const key = `${dia}-${ordem}`;
      const prev = slotsByTurma[tabTurma]?.[key] || null;

      setSlotsByTurma((s) => {
        const mapa = { ...(s[tabTurma] || {}) };
        if (mapa[key]) return s; // 1 item por slot (fase atual)
        mapa[key] = {
          disciplina_id,
          professor_id,
          label: data.label || `${nomeDisciplinaAmigavelPorId(disciplina_id)} • (#${ordem})`,
        };
        return { ...s, [tabTurma]: mapa };
      });

      // --- POST upsert ---
      await apiFetch("/api/grade/slot/upsert", {
        method: "POST",
        body: {
          turno,
          turma_id,
          dia,
          ordem,
          disciplina_id,
          professor_id,
          origem: "manual",
          locked: false,
        },
      });

      toast.showSuccess("Slot salvo no rascunho.");
    } catch (err) {
      // --- ROLLBACK (remove a inclusão otimista) ---
      setSlotsByTurma((s) => {
        const mapa = { ...(s[tabTurma] || {}) };
        delete mapa[`${dia}-${ordem}`];
        return { ...s, [tabTurma]: mapa };
      });

      const msg = (err && err.message) || "Falha ao salvar slot.";
      toast.showError(msg.includes("Conflito") ? "Conflito: choque de turma/professor no mesmo período." : msg);
    }
  }

  // -------------------------------------------------------------------------
  // A partir daqui, o arquivo segue exatamente como já estava validado.
  // (Sem remoções/simplificações; apenas mantido.)
  // -------------------------------------------------------------------------

  async function removerDoSlot(dia, ordem) {
    if (!tabTurma) return;
    const key = `${dia}-${ordem}`;
    const turma_id = Number(tabTurma);

    // snapshot para rollback
    const prev = slotsByTurma[tabTurma]?.[key] || null;

    // --- OTIMISTA: remove da UI ---
    setSlotsByTurma((prevState) => {
      const mapa = { ...(prevState[tabTurma] || {}) };
      delete mapa[key];
      return { ...prevState, [tabTurma]: mapa };
    });

    try {
      await apiFetch("/api/grade/slot/remove", {
        method: "POST",
        body: { turno, turma_id, dia, ordem },
      });
      toast.showSuccess("Slot removido do rascunho.");
    } catch (err) {
      // --- ROLLBACK: recoloca o slot anterior ---
      setSlotsByTurma((prevState) => {
        const mapa = { ...(prevState[tabTurma] || {}) };
        if (prev) mapa[key] = prev;
        return { ...prevState, [tabTurma]: mapa };
      });

      toast.showError(err?.message || "Falha ao remover slot.");
    }
  }

  async function carregarRascunho() {
    console.debug("[carregarRascunho] clique");
    try {
      if (!turno) {
        toast.showError("Defina o turno no Wizard antes de carregar o rascunho.");
        return;
      }
      const data = await apiFetch(`/api/grade/rascunho?turno=${encodeURIComponent(turno)}`);
      if (!data?.resultado) {
        toast.showError("Não há rascunho para este turno.");
        return;
      }
      setLastDraftId(data.resultado.id);
      setSlotsByTurma(fromSlotsArray(data.slots || []));
      toast.showSuccess("Rascunho carregado.");
    } catch (e) {
      console.error("[carregarRascunho] erro:", e);
      toast.showError(e?.message || "Falha ao carregar rascunho.");
    }
  }

  async function publicarRascunho() {
    console.debug("[publicarRascunho] clique");
    try {
      setPublishing(true);
      if (!turno) {
        toast.showError("Defina o turno no Wizard antes de publicar.");
        return;
      }
      const descricao = prompt("Descrição (opcional) da publicação:", "") || null;
      await apiFetch("/api/grade/publicar", { method: "POST", body: { turno, descricao } });
      toast.showSuccess("Grade publicada com sucesso.");
    } catch (e) {
      console.error("[publicarRascunho] erro:", e);
      toast.showError(e?.message || "Falha ao publicar.");
    } finally {
      setPublishing(false);
    }
  }

  async function carregarPublicado() {
    console.debug("[carregarPublicado] clique");
    try {
      if (!turno) {
        toast.showError("Defina o turno no Wizard antes de carregar o publicado.");
        return;
      }
      const data = await apiFetch(`/api/grade/publicado?turno=${encodeURIComponent(turno)}`);
      if (!data?.resultado) {
        toast.showError("Não há grade publicada para este turno.");
        return;
      }
      setSlotsByTurma(fromSlotsArray(data.slots || []));
      toast.showSuccess(`Publicado carregado (v${data.resultado.version || 1}).`);
    } catch (e) {
      console.error("[carregarPublicado] erro:", e);
      toast.showError(e?.message || "Falha ao carregar publicado.");
    }
  }

  // -------------------------------------------------------------------------
  // UI helpers (mini cabeçalho e ícone de status)
  // -------------------------------------------------------------------------
  function statusDoSlotParaRef(dia, ordem) {
    const profId = getRefProfessorId();
    if (!profId) return null; // sem referência → sem status
    const blocked = !isProfessorDisponivel(profId, dia, ordem);
    if (blocked) return "indisponivel";
    const evitar = isProfessorEvitar(profId, dia, ordem);
    if (evitar) return "evitar";
    return "livre";
  }

  function iconFor(status) {
    if (status === "indisponivel") return "⛔";
    if (status === "evitar") return "⚠";
    if (status === "livre") return "✓";
    return "";
  }

  function tooltipFor(status) {
    if (status === "indisponivel") return "Indisponível (bloqueado para o professor de referência)";
    if (status === "evitar") return "Evitar (permitido, mas não recomendado)";
    if (status === "livre") return "Livre para o professor de referência";
    return "Selecione um professor para visualizar";
  }

  // -------------------------------------------------------------------------
  // --- SERIALIZAÇÃO/LOAD DOS SLOTS (rascunho/publicado) -----------------
  // -------------------------------------------------------------------------
  function fromSlotsArray(slots = []) {
    const mapByTurma = {};
    for (const s of slots) {
      const turmaId = Number(s.turma_id);
      const dia = Number(s.dia);
      const ordem = Number(s.ordem);
      if (!turmaId || !dia || !ordem) continue;
      if (!mapByTurma[turmaId]) mapByTurma[turmaId] = {};
      mapByTurma[turmaId][`${dia}-${ordem}`] = {
        disciplina_id: s.disciplina_id,
        professor_id: s.professor_id,
        origem: s.origem || "manual",
        locked: !!s.locked,
        label: `${nomeDisciplinaAmigavelPorId(s.disciplina_id)} • (#${ordem})`,
      };
    }
    return mapByTurma;
  }

  // -------------------------------------------------------------------------
  // --- SERIALIZAÇÃO -> array para API /api/grade/rascunho -----------------
  // -------------------------------------------------------------------------
  function toSlotsArray(slotsByTurma) {
    const out = [];
    for (const [turmaIdStr, mapa] of Object.entries(slotsByTurma || {})) {
      const turma_id = Number(turmaIdStr);
      for (const key of Object.keys(mapa)) {
        const [dia, ordem] = key.split("-").map(Number);
        const it = mapa[key] || {};
        const disciplina_id = Number(it.disciplina_id || 0);
        const professor_id = Number(it.professor_id || 0);
        const origem = String(it.origem || "manual");
        const locked = !!it.locked;
        if (turma_id && dia && ordem && disciplina_id && professor_id) {
          out.push({ turma_id, dia, ordem, disciplina_id, professor_id, origem, locked });
        }
      }
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // --- SALVAR RASCUNHO (inteiro) ------------------------------------------
  // -------------------------------------------------------------------------
  async function salvarRascunho() {
    console.debug("[salvarRascunho] clique");
    try {
      setSavingDraft(true);
      if (!turno) {
        toast.showError("Defina o turno no Wizard antes de salvar o rascunho.");
        return;
      }
      const slots = toSlotsArray(slotsByTurma);
      if (slots.length === 0) {
        toast.showError("Não há slots alocados para salvar.");
        return;
      }
      const body = { turno, turma_ids: turmaIds, turmaIds, slots };
      const res = await apiFetch("/api/grade/rascunho", { method: "POST", body });
      setLastDraftId(res?.resultado_id || null);
      toast.showSuccess("Rascunho salvo com sucesso.");
    } catch (e) {
      console.error("[salvarRascunho] erro:", e);
      toast.showError(e?.message || "Falha ao salvar rascunho.");
    } finally {
      setSavingDraft(false);
    }
  }

  // =========================================================================
  // RENDERIZAÇÃO DA MALHA — (mantido como já estava no seu arquivo)
  // =========================================================================

  function PeriodoHeader({ idx }) {
    return (
      <div className="p-2 text-sm text-blue-900/90">
        #{idx}
        <div className="text-xs text-blue-700/70">
          {(() => {
            for (const d of dias) {
              const p = (gradeOrdenada[d] || [])[idx - 1];
              if (p && (p.inicio || p.fim)) return `${p.inicio ?? ""}${p.inicio && p.fim ? "–" : ""}${p.fim ?? ""}`;
            }
            return "—";
          })()}
        </div>
      </div>
    );
  }

  function Celula({ dia, ordem, idxKey }) {
    const blocked = isSlotBlocked(dia, ordem);
    const evitar = !blocked && isSlotEvitar(dia, ordem);

    const base = "relative p-2 h-16 border-l flex items-center justify-center text-sm transition";
    const paint = blocked
      ? "opacity-70 cursor-not-allowed bg-red-50 text-red-700 ring-1 ring-red-200"
      : evitar
        ? "bg-yellow-50 border-yellow-200 text-yellow-800"
        : selProfId || dragging
          ? "bg-green-50/40 text-blue-900/80"
          : "text-blue-900/80";

    const status = statusDoSlotParaRef(dia, ordem);
    const ico = iconFor(status);
    const tip = tooltipFor(status);

    const slotMap = slotsByTurma[tabTurma] || {};
    const placed = slotMap[`${dia}-${ordem}`];

    return (
      <div
        key={idxKey}
        className={`${base} ${paint}`}
        onDragOver={(e) => onDragOverSlot(e, dia, ordem)}
        onDrop={(e) => onDropSlot(e, dia, ordem)}
        onClick={() => {
          if (selProfId) {
            setSelDia(dia);
            setDispOpen(true);
          }
        }}
        title={tip}
      >
        {(selProfId || dragging) && (
          <div
            className="absolute left-1.5 top-1.5 text-[12px] leading-none px-1.5 py-0.5 rounded-md border bg-white/70 backdrop-blur"
            title={tip}
          >
            {ico}
          </div>
        )}

        {placed ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removerDoSlot(dia, ordem);
            }}
            className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200"
            title="Remover deste slot"
          >
            {placed.label} ✕
          </button>
        ) : (
          ""
        )}
      </div>
    );
  }

  function renderGridDiasColunas() {
    return (
      <div className="min-w-[900px]">
        <div className="grid" style={{ gridTemplateColumns: `140px repeat(${dias.length}, 1fr)` }}>
          <div className="p-2 text-sm font-semibold text-blue-700">Período</div>
          {dias.map((d) => (
            <div key={d} className="p-2 text-sm font-semibold text-blue-700 text-center">
              {nomeDia(d)}
            </div>
          ))}
        </div>

        {Array.from({ length: totalPeriodos }, (_, i) => {
          const ordem = i + 1;
          return (
            <div
              key={ordem}
              className="grid border-t last:border-b"
              style={{ gridTemplateColumns: `140px repeat(${dias.length}, 1fr)` }}
            >
              <PeriodoHeader idx={ordem} />
              {dias.map((d) => (
                <Celula key={`${d}-${ordem}`} dia={d} ordem={ordem} idxKey={`${d}-${ordem}`} />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  function renderGridDiasLinhas() {
    return (
      <div className="min-w-[900px]">
        <div className="grid" style={{ gridTemplateColumns: `140px repeat(${totalPeriodos}, 1fr)` }}>
          <div className="p-2 text-sm font-semibold text-blue-700">Dia</div>
          {Array.from({ length: totalPeriodos }, (_, i) => (
            <div key={i} className="p-2 text-sm font-semibold text-blue-700 text-center">
              #{i + 1}
            </div>
          ))}
        </div>

        {dias.map((d) => (
          <div
            key={d}
            className="grid border-t last:border-b"
            style={{ gridTemplateColumns: `140px repeat(${totalPeriodos}, 1fr)` }}
          >
            <div className="p-2 text-sm text-blue-900/90">
              {nomeDia(d)}
              <div className="text-xs text-blue-700/70">
                {(() => {
                  const p1 = (gradeOrdenada[d] || [])[0];
                  if (p1 && (p1.inicio || p1.fim)) return `${p1.inicio ?? ""}${p1.inicio && p1.fim ? "–" : ""}${p1.fim ?? ""}`;
                  return "—";
                })()}
              </div>
            </div>

            {Array.from({ length: totalPeriodos }, (_, i) => {
              const ordem = i + 1;
              return <Celula key={`${d}-${ordem}`} dia={d} ordem={ordem} idxKey={`${d}-${ordem}`} />;
            })}
          </div>
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER (página)
  // -------------------------------------------------------------------------
  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Layout de Grade</h1>
          <p className="text-sm text-blue-700">
            Turno: <span className="font-semibold">{turno}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="px-3 py-2 rounded-xl border border-blue-200 bg-white text-blue-900"
            value={selProfId ?? ""}
            onChange={(e) => setSelProfId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Professor…</option>
            {professoresOrdenados.map((p, idx) => {
              const rotuloDisc = nomeDisciplinaDoProfessor(p);
              return (
                <option key={`${p.id}-${idx}`} value={p.id}>
                  {p.nome} ({rotuloDisc})
                </option>
              );
            })}
          </select>

          <select
            className="px-3 py-2 rounded-xl border border-blue-200 bg-white text-blue-900"
            value={selDia}
            onChange={(e) => setSelDia(Number(e.target.value))}
          >
            {dias.map((d) => (
              <option key={d} value={d}>
                {nomeDia(d)}
              </option>
            ))}
          </select>

          <button
            onClick={() => selProfId && setDispOpen(true)}
            disabled={!selProfId}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Editar disponibilidade
          </button>

          <button
            onClick={() => selProfId && setPrefOpen(true)}
            disabled={!selProfId}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            Preferências
          </button>

          <button
            onClick={() => nav("/secretaria/horarios", { replace: true })}
            className="px-4 py-2 rounded-xl bg-white text-blue-900 border border-blue-200 hover:bg-blue-100"
          >
            Voltar ao Wizard
          </button>

          <button onClick={() => nav("/secretaria/horarios/mock")} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
            Rodar Mock Solver
          </button>

          <button
            onClick={() => setLayoutMode((m) => (m === "dias-colunas" ? "dias-linhas" : "dias-colunas"))}
            className="px-3 py-2 rounded-xl bg-white text-blue-900 border border-blue-200 hover:bg-blue-100"
          >
            {layoutMode === "dias-colunas" ? "Layout: Dias nas colunas" : "Layout: Dias nas linhas"}
          </button>

          <button
            onClick={carregarRascunho}
            className="px-3 py-2 rounded-xl bg-white text-blue-900 border border-blue-200 hover:bg-blue-100"
          >
            Carregar rascunho
          </button>

          <button
            onClick={salvarRascunho}
            disabled={savingDraft}
            className={`px-3 py-2 rounded-xl ${savingDraft ? "bg-blue-300 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {savingDraft ? "Salvando…" : "Salvar rascunho"}
          </button>

          <button
            onClick={publicarRascunho}
            disabled={publishing}
            className={`px-3 py-2 rounded-xl ${publishing ? "bg-emerald-300 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
          >
            {publishing ? "Publicando…" : "Publicar"}
          </button>

          <button
            onClick={carregarPublicado}
            className="px-3 py-2 rounded-xl bg-white text-blue-900 border border-blue-200 hover:bg-blue-100"
          >
            Carregar publicado
          </button>

          <button
            disabled
            className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 opacity-60 cursor-not-allowed"
            title="Habilitaremos no próximo passo (persistência e regras globais)"
          >
            Iniciar drag & drop
          </button>
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="mb-4 flex items-center gap-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200">✓ livre</span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 border border-yellow-200">⚠ evitar (permitido)</span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200">⛔ indisponível (bloqueado)</span>
      </div>

      {loading && <div className="p-4 rounded-xl bg-white shadow">Carregando payload…</div>}
      {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">{error}</div>}

      {payload && !loading && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(payload.turmas || []).map((t) => (
              <button
                key={t.id}
                onClick={() => setTabTurma(t.id)}
                className={`px-3 py-1 rounded-full border ${
                  tabTurma === t.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-900 border-blue-200 hover:bg-blue-50"
                }`}
              >
                {t.nome}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-[280px_1fr] gap-4">
            <aside className="bg-white rounded-2xl shadow p-4 h-fit">
              <h3 className="font-semibold text-blue-900 mb-2">Pool • {tabTurma ? `Turma ${tabTurma}` : "—"}</h3>

              {!poolDaTurma || poolDaTurma.length === 0 ? (
                <div className="text-sm text-blue-700">Nada pendente para esta turma.</div>
              ) : (
                <ul className="space-y-2">
                  {poolDaTurma.map((it) => (
                    <li
                      key={it.id}
                      draggable
                      onDragStart={(e) => onDragStartPoolItem(e, it)}
                      onDragEnd={onDragEndPoolItem}
                      className="p-2 rounded-xl border border-blue-200 text-blue-900 bg-blue-50 cursor-grab active:cursor-grabbing"
                      title="Arraste para um slot da grade"
                    >
                      {it.label}
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <div className="relative bg-white rounded-2xl shadow p-4 overflow-x-auto">
              {layoutMode === "dias-colunas" ? renderGridDiasColunas() : renderGridDiasLinhas()}
            </div>
          </div>
        </div>
      )}

      <ModalDisponibilidadeProfessor
        open={dispOpen}
        onClose={(salvou) => {
          setDispOpen(false);
          if (salvou) {
            (async () => {
              try {
                setLoading(true);
                const body = { turno, turma_ids: turmaIds, turmaIds };
                const data = await apiFetch("/api/grade/solve", { method: "POST", body });
                setPayload(data?.payload || null);
              } catch (e) {
                console.error("Falha ao recarregar payload após salvar disponibilidade:", e);
              } finally {
                setLoading(false);
              }
            })();
          }
        }}
        professor={selProfId ? (payload?.professores || []).find((p) => Number(p.id) === Number(selProfId)) || refProfessorObj : null}
        turno={turno}
        diaSemana={selDia}
        totalPeriodos={totalPeriodos}
      />

      <ModalPreferenciasProfessor open={!!prefOpen} onClose={() => setPrefOpen(false)} professor={refProfessorObj || { id: selProfId }} turno={turno} />
      {toast.node}
    </div>
  );
}
