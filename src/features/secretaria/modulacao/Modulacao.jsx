// src/features/secretaria/modulacao/Modulacao.jsx
// ============================================================================
// Secretaria > Horários
// - Visual idêntico ao mock
// - Colunas de turmas SEMPRE renderizadas para o turno selecionado
// - Inserir Professor (lista filtrada por turno)
// - Alocação por checkbox (professor x turma)
// - Salvar com UPSERT (fallback) e progresso real
// - Usabilidade: 3 colunas fixas à esquerda (Professor/Disciplina/Aulas) + scroll horizontal
// ============================================================================

import React, { useEffect, useMemo, useState, useRef } from "react";
import api from "../../../services/api";
import { ChevronDownIcon, UserPlusIcon, ClockIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import ModalDiagnosticoInsumos from "./ModalDiagnosticoInsumos"; // ← modal pronto

// ============================================================================
// Utils
// ============================================================================
const norm = (s) =>
  (s || "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

// Retorna o ano letivo atual considerando que até 31/01 pertence ao ano letivo anterior
function getAnoLetivoAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  // Janeiro é mês 0; consideramos ano anterior se for até 31 de janeiro
  if (hoje.getMonth() === 0) {
    return ano - 1;
  }
  return ano;
}

// Ano letivo vigente — usado para filtrar turmas na grade de modulação
const anoAtual = getAnoLetivoAtual();

// Normaliza turmas preservando possível campo de turno/periodo (para filtragem)
function normalizeTurmas(raw) {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.turmas) ? raw.turmas : [];
  const mapped = arr
    .map((t) => {
      const id =
        t?.id ??
        t?.turma_id ??
        t?.id_turma ??
        t?.uuid ??
        t?.codigo ??
        null;

      const nome =
        t?.nome ??
        t?.turma ??
        t?.sigla ??
        t?.nome_turma ??
        t?.descricao ??
        t?.label ??
        (t?.serie && t?.letra ? `${t.serie}${t.letra}` : null);

      const turno =
        t?.turno ??
        t?.turno_nome ??
        t?.periodo ??
        null;

      const ano = t?.ano ?? t?.ano_letivo ?? t?.anoLetivo ?? null;

      return id && nome ? { id, nome: String(nome), turno, ano } : null;
    })
    .filter(Boolean);

  mapped.sort((x, y) => naturalCompare(x.nome, y.nome));
  return mapped;
}

// Filtra turmas por turno quando houver metadados de turno
function filtrarTurmasPorTurno(lista, turnoAlvo) {
  const alvo = norm(turnoAlvo);
  if (!alvo) return Array.isArray(lista) ? lista : [];

  const temInfo = (t) => t?.turno != null;
  const temAlgumComInfo = (lista || []).some(temInfo);
  if (!temAlgumComInfo) return Array.isArray(lista) ? lista : [];

  const isMatch = (val) => {
    const n = norm(val);
    return n === alvo || n.includes(alvo);
  };

  return (lista || []).filter((t) => isMatch(t.turno));
}

// Filtra professores por turno (aceita vários campos)
function filtraPorTurno(lista, turnoAlvo) {
  const alvo = norm(turnoAlvo);
  if (!alvo) return Array.isArray(lista) ? lista : [];

  const temInfoTurno = (p) =>
    p?.turno != null ||
    p?.turno_nome != null ||
    p?.periodo != null ||
    (Array.isArray(p?.turnos) && p.turnos.length) ||
    p?.disponibilidade_turno != null;

  const temAlgumComInfo = (lista || []).some(temInfoTurno);
  const isMatch = (val) => {
    if (Array.isArray(val)) return val.some((v) => norm(v) === alvo || norm(v).includes(alvo));
    return norm(val) === alvo || norm(val).includes(alvo);
  };

  const filtrada = (lista || []).filter((p) => {
    const campos = [
      p?.turno,
      p?.turno_nome,
      p?.periodo,
      p?.disponibilidade_turno,
      ...(Array.isArray(p?.turnos) ? p.turnos : []),
    ];
    return campos.some((v) => (v == null ? false : isMatch(v)));
  });

  return temAlgumComInfo ? filtrada : (Array.isArray(lista) ? lista : []);
}

// ============================================================================
// Componente
// ============================================================================
export default function Modulacao() {
  // Turno e dados
  const [turnoSelecionado, setTurnoSelecionado] = useState("");
  const [turmasTurno, setTurmasTurno] = useState([]);
  const [turmasAviso, setTurmasAviso] = useState("");

  // Tabela principal
  const [professoresTabela, setProfessoresTabela] = useState([]);
  const [alocacoes, setAlocacoes] = useState([]); // [{profId, turmaId}]

  // Picker
  const [abrirPickerProf, setAbrirPickerProf] = useState(false);
  const [professoresDisponiveis, setProfessoresDisponiveis] = useState([]);
  const [buscaProf, setBuscaProf] = useState("");
  const [carregandoProf, setCarregandoProf] = useState(false);

  // UI
  const [mostrarMenuTurno, setMostrarMenuTurno] = useState(false);
  const [carregandoTabela, setCarregandoTabela] = useState(false);
  

  // Salvamento
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState("");
  const [saveProcessed, setSaveProcessed] = useState(0);
  const [savePercent, setSavePercent] = useState(0);
  const [saveBanner, setSaveBanner] = useState(null);
  const [abrirRelatorios, setAbrirRelatorios] = useState(false);

  // --- Relatórios ---
  const [turnoRelatorio, setTurnoRelatorio] = useState("");
  const [mostrarMenuTurnoRelatorio, setMostrarMenuTurnoRelatorio] = useState(false);
  const [relatorioDados, setRelatorioDados] = useState([]); // [{ professor_id, professor_nome, aulas, disciplina_nome, turmas: [] }]
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);

  // Tabelas auxiliares
  const [cargaPorDisciplina, setCargaPorDisciplina] = useState({}); // {disciplinaId: cargaSemanal}
  const [aulasTotaisPorProfessor, setAulasTotaisPorProfessor] = useState({}); // {profId: totalSemanal}
  // MODULAÇÃO INTELIGENTE: carga real por turma × disciplina
  // { turma_id: { disciplina_id: N_aulas } } — preenchido pelo endpoint /api/modulacao/carga-turma
  const [cargaPorTurmaDisc, setCargaPorTurmaDisc] = useState({}); // {turmaId: {discId: N}}

  // ESTADOS (adicione junto aos outros useState de UI/relatórios)
  const [removerOpen, setRemoverOpen] = useState(false);
  const [removerAlvo, setRemoverAlvo] = useState(null);
  const [removendo, setRemovendo] = useState(false)
  const [checarLoading, setChecarLoading] = useState(false);
  const [checarOpen, setChecarOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [checarTurnoAlvo, setChecarTurnoAlvo] = useState("");
  const [inconsistencias, setInconsistencias] = useState({
    duplicidades: [],       // [{ turma_id, turma_nome, disciplina_id, disciplina_nome, professores:[{id,nome}], total }]
    faltandoProfessor: [],  // [{ turma_id, turma_nome, disciplina_id, disciplina_nome }]
    cargaRestante: [],      // [{ professor_id, professor_nome, restante, total, usadas }]
    overbooking: [],        // [{ professor_id, professor_nome, excedente, total, usadas }]
    turnoInconsistente: [], // [{ turma_id, turma_nome, professor_id, professor_nome, turno_aloc, turno_solicitado }]
  });

  // toast leve p/ mensagens rápidas
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (type, text, ms = 3500) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast({ type, text });
    if (ms) {
      toastTimer.current = setTimeout(() => setToast(null), ms);
    }
  };

  // Fecha por ESC global enquanto o toast estiver aberto
  useEffect(() => {
    if (!toast) return;
    const onKey = (e) => {
      if (e.key === "Escape") setToast(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toast]);

  // Cleanup geral (ao desmontar)
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Normalizadores auxiliares
  // --------------------------------------------------------------------------
  function normalizeAlocacoes(raw) {
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.alocacoes) ? raw.alocacoes : [];

    const getTurmaNome = (a) =>
      a.turma_nome ??
      a.nome_turma ??
      a.nomeTurma ??
      a.turma_sigla ??
      a.siglaTurma ??
      a.turma_codigo ??
      a.codigo_turma ??
      a.turma ??                               // pode vir string simples
      a?.turma?.sigla ??
      a?.turma?.nome ??
      a?.turma?.turma ??
      a?.turma?.codigo ??
      "";

    const getTurmaId = (a) =>
      Number(
        a.turma_id ??
        a.id_turma ??
        a?.turma?.id ??
        a?.turma?.turma_id ??
        a?.turmaId
      );

    return arr
      .map((a) => ({
        professor_id: Number(a.professor_id ?? a.profId ?? a.id_professor ?? a?.professor?.id),
        professor_nome: a.professor_nome ?? a?.professor?.nome ?? "",
        disciplina_id: Number(a.disciplina_id ?? a?.disciplina?.id ?? a?.disciplinaId),
        disciplina_nome: a.disciplina_nome ?? a?.disciplina?.nome ?? "",
        turma_id: getTurmaId(a),
        turma_nome: getTurmaNome(a),
        turno: a.turno ?? a?.turma?.turno ?? a?.turno_nome ?? null,
      }))
      .filter((x) => x.professor_id && x.turma_id && x.disciplina_id);
  }


  // --------------------------------------------------------------------------
  // Carregar TURMAS do turno (robusto + filtragem por turno)
  // --------------------------------------------------------------------------
  async function carregarTurmasDoTurno(turno) {
    setTurmasAviso("");
    let turmas = [];

    try {
      const { data } = await api.get(`/api/turmas`, { params: { turno } });
      turmas = normalizeTurmas(data);
    } catch {}

    if (turmas.length === 0) {
      try {
        const { data: d2 } = await api.get(`/api/turnos/${encodeURIComponent(turno)}/turmas`);
        turmas = normalizeTurmas(d2);
      } catch {}
    }

    // Se mesmo assim vierem turmas de vários turnos, filtra
    turmas = filtrarTurmasPorTurno(turmas, turno);

    // ✅ FIX MÉDIO 6: Turmas sem campo 'ano' eram pass-through (🚫 legado contaminava a visão atual).
    // Agora exige 'ano' explícito e igual ao ano letivo corrente.
    turmas = turmas.filter((t) => t.ano && Number(t.ano) === anoAtual);

    setTurmasTurno(turmas);
    if (turmas.length === 0) {
      setTurmasAviso("Nenhuma turma encontrada para o turno selecionado.");
    } else {
      setTurmasAviso("");
    }
  }

  // --------------------------------------------------------------------------
  // Reação principal ao mudar o turno
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function carregarTurno() {
      setCarregandoTabela(true);

      if (!turnoSelecionado) {
        setTurmasTurno([]);
        setProfessoresTabela([]);
        setAlocacoes([]);
        setAbrirPickerProf(false);
        setTurmasAviso("");
        setCarregandoTabela(false);
        return;
      }

      try {
        await carregarTurmasDoTurno(turnoSelecionado);
        // carrega/atualiza o map de total de aulas por professor para este turno
        const mapAulasTotais = await carregarAulasTotaisDoTurno(turnoSelecionado);

        // MODULAÇÃO INTELIGENTE: carrega carga real por turma × disciplina
        try {
          const { data: cargaTurmaData } = await api.get("/api/modulacao/carga-turma", {
            params: { turno: turnoSelecionado },
          });
          // Normaliza chaves para Number (o backend retorna string em JSON)
          const normalizado = {};
          for (const [turmaId, discs] of Object.entries(cargaTurmaData || {})) {
            normalizado[Number(turmaId)] = {};
            for (const [discId, carga] of Object.entries(discs)) {
              normalizado[Number(turmaId)][Number(discId)] = Number(carga);
            }
          }
          setCargaPorTurmaDisc(normalizado);
        } catch {
          setCargaPorTurmaDisc({});
        }

        // busca as alocações do turno
        const { data } = await api.get("/api/modulacao", { params: { turno: turnoSelecionado } });
        const alocs = normalizeAlocacoes(data);

        // agrupa por professor para montar a linha única
        const porProf = new Map();
        for (const a of alocs) {
          if (!porProf.has(a.professor_id)) porProf.set(a.professor_id, []);
          porProf.get(a.professor_id).push(a);
        }

        const profs = [];
        for (const [profId, arr] of porProf.entries()) {
          const any = arr[0];
          // total vindo do módulo Professores
          let total = mapAulasTotais[profId];

        // fallback: se não veio total, estima = (qtd turmas) * (carga da disciplina)
          if (!total) {
            const cargaDisc = Number(cargaPorDisciplina[any.disciplina_id]) || 1;
            total = cargaDisc * arr.length;
          }

          profs.push({
            id: Number(profId),
            nome: any.professor_nome || `Professor ${profId}`,
            disciplina_id: any.disciplina_id,
            disciplina_nome: any.disciplina_nome || "—",
            aulas: Number(total),     // << total correto
            turno: any.turno,
          });
        }

          setProfessoresTabela(profs);
          setAlocacoes(alocs.map((a) => ({ profId: a.professor_id, turmaId: a.turma_id })));
        } catch {
          setProfessoresTabela([]);
          setAlocacoes([]);
        } finally {
          setCarregandoTabela(false);
        }
      }
      carregarTurno();
    }, [turnoSelecionado]);

  // Recarrega a lista do picker ao alterar o turno, se ele estiver aberto
  useEffect(() => {
    if (abrirPickerProf && turnoSelecionado) {
      setCarregandoProf(true);
      carregarProfessoresDoTurno(turnoSelecionado).finally(() => {
        setCarregandoProf(false);
      });
    }
  }, [turnoSelecionado, abrirPickerProf]);

  // --------------------------------------------------------------------------
  // Busca professores do turno e cria um map { profId: aulasTotal }
  async function carregarAulasTotaisDoTurno(turno) {
    try {
      let lista = [];
      // tenta já filtrar por turno no backend
      try {
        const { data } = await api.get(`/api/professores`, { params: { turno } });
        lista = Array.isArray(data) ? data : (Array.isArray(data?.professores) ? data.professores : []);
      } catch {
        // fallback sem filtro
        const { data } = await api.get(`/api/professores`);
        lista = Array.isArray(data) ? data : (Array.isArray(data?.professores) ? data.professores : []);
      }

      // se vierem vários turnos, filtra aqui
      // e também removemos os professores inativos para não aparecerem nas inconsistências
      lista = filtraPorTurno(lista, turno).filter((p) => String(p.status).toLowerCase() !== "inativo");

      // constrói o map { profId: aulasTotal } usando campos flexíveis
      const map = {};
      for (const p of lista) {
        const id = Number(p?.id ?? p?.professor_id ?? p?.uuid);
        if (!id) continue;
        const tot =
          Number(
            p?.aulas ??
            p?.carga ??
            p?.carga_aulas ??
            p?.cargaHoraria ??
            0
          ) || 0;
        map[id] = tot;
      }
      setAulasTotaisPorProfessor(map);
      return map;
    } catch {
      setAulasTotaisPorProfessor({});
      return {};
    }
  }

  // --------------------------------------------------------------------------
  // Carrega os professores disponíveis para o turno informado (sem abrir/fechar o picker)
  async function carregarProfessoresDoTurno(turno) {
    try {
      let lista = [];
      try {
        const { data } = await api.get(`/api/professores`, { params: { turno } });
        lista = Array.isArray(data) ? data : Array.isArray(data?.professores) ? data.professores : [];
      } catch {
        const { data } = await api.get(`/api/professores`);
        const bruta = Array.isArray(data) ? data : Array.isArray(data?.professores) ? data.professores : [];
        lista = filtraPorTurno(bruta, turno);
      }

      const normalizados = (lista || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        disciplina_id: p.disciplina_id ?? p.disciplinaId ?? p?.disciplina?.id ?? null,
        disciplina_nome: p.disciplina_nome ?? p.disciplina ?? p?.disciplina?.nome ?? "—",
        aulas: Number(p.aulas ?? p.carga_aulas ?? 0) || 0,
        turno:
          p.turno ??
          p.turno_nome ??
          p.periodo ??
          (Array.isArray(p.turnos) ? p.turnos.join(", ") : null) ??
          p.disponibilidade_turno ??
          null,
      }));

      setProfessoresDisponiveis(filtraPorTurno(normalizados, turno));
    } catch {
      setProfessoresDisponiveis([]);
    }
  }

  // --------------------------------------------------------------------------
  // Carrega relatórios
  // --------------------------------------------------------------------------
  async function carregarRelatorioPorTurno(turno) {
    if (!turno) { setRelatorioDados([]); return; }
    setCarregandoRelatorio(true);
    try {
      // total de aulas por professor (por turno)
      const mapAulas = await carregarAulasTotaisDoTurno(turno);

      // alocações do turno
      const { data } = await api.get("/api/modulacao", { params: { turno } });
      const alocs = normalizeAlocacoes(data);

      // 🔁 mapa id→nome das turmas (fallback se turma_nome não vier na API de horários)
      const mapaTurmas = await carregarMapaTurmasRelatorio(turno);

      // agrega por professor + disciplina
      const byKey = new Map();
      for (const a of alocs) {
        const key = `${a.professor_id}|${a.disciplina_id}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            professor_id: a.professor_id,
            professor_nome: a.professor_nome || `Professor ${a.professor_id}`,
            disciplina_id: a.disciplina_id,
            disciplina_nome: a.disciplina_nome || "—",
            aulas: Number(mapAulas[a.professor_id] ?? 0) || 0,
            carga: Number(cargaPorDisciplina[a.disciplina_id]) || 0,
            turmas: new Set(),
          });
        }
        // 🧠 nome da turma: usa o que vier da API OU o fallback pelo mapa
        const nomeTurma = (a.turma_nome && String(a.turma_nome).toUpperCase())
          || (a.turma_id != null ? mapaTurmas[Number(a.turma_id)] : "")
          || "";
        if (nomeTurma) byKey.get(key).turmas.add(nomeTurma);
      }

      const arr = Array.from(byKey.values()).map((r) => ({
        ...r,
        turmas: Array.from(r.turmas).sort(naturalCompare),
      }));
      arr.sort((x, y) =>
        naturalCompare(x.professor_nome, y.professor_nome) ||
        naturalCompare(x.disciplina_nome, y.disciplina_nome)
      );

      // garante/atualiza a carga pela disciplina
      for (const r of arr) {
        r.carga = Number(cargaPorDisciplina[r.disciplina_id]) || 0;
      }


      setRelatorioDados(arr);
    } catch {
      setRelatorioDados([]);
    } finally {
      setCarregandoRelatorio(false);
    }
  }


  // --------------------------------------------------------------------------
  // Carrega a lista do relatório quando abrir o painel e escolher um turno
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (abrirRelatorios && turnoRelatorio) {
      carregarRelatorioPorTurno(turnoRelatorio);
    }
  }, [abrirRelatorios, turnoRelatorio]);

  // Recalcula automaticamente o relatório quando o mapa de cargas for atualizado
  useEffect(() => {
    if (abrirRelatorios && turnoRelatorio && relatorioDados.length) {
      carregarRelatorioPorTurno(turnoRelatorio);
    }
  }, [cargaPorDisciplina]);


  // --------------------------------------------------------------------------
  // Abrir Picker de Professores (filtrado por turno)
  // --------------------------------------------------------------------------
  async function abrirInserirProfessor() {
    if (!turnoSelecionado) {
      alert("Selecione um turno antes.");
      return;
    }
    setAbrirPickerProf(true);
    setCarregandoProf(true);
    setBuscaProf(""); // zera a busca ao abrir

    try {
      await carregarProfessoresDoTurno(turnoSelecionado);
    } finally {
      setCarregandoProf(false);
    }
  }

  // Busca do picker
  const professoresFiltrados = useMemo(() => {
    const b = norm(buscaProf);
    if (!b) return professoresDisponiveis;
    return professoresDisponiveis.filter((p) => norm(p.nome).includes(b));
  }, [buscaProf, professoresDisponiveis]);

  // --------------------------------------------------------------------------
  // Resumo de aulas por professor (total/usadas/restante)
  // --------------------------------------------------------------------------
  const resumoAulas = useMemo(() => {
    const map = {};
    for (const prof of professoresTabela) {
      const total = Number(aulasTotaisPorProfessor[prof.id] ?? prof.aulas ?? 0) || 0;
      // MODULAÇÃO INTELIGENTE: soma a carga real de cada turma alocada ao professor
      const usadas = alocacoes
        .filter((a) => a.profId === prof.id)
        .reduce((soma, a) => {
          const cargaEspecifica = cargaPorTurmaDisc[a.turmaId]?.[prof.disciplina_id];
          const carga = cargaEspecifica ?? Number(cargaPorDisciplina[prof.disciplina_id]) ?? 1;
          return soma + (carga || 1);
        }, 0);
      map[prof.id] = {
        total,
        usadas,
        restante: total - usadas,
        carga: Number(cargaPorDisciplina[prof.disciplina_id]) || 1, // fallback global
      };
    }
    return map;
  }, [professoresTabela, alocacoes, aulasTotaisPorProfessor, cargaPorDisciplina, cargaPorTurmaDisc]);



  // --------------------------------------------------------------------------
  // Remover linha lista principal Professor / Disciplin / Alocações
  // --------------------------------------------------------------------------

  function abrirRemoverLinha(prof) {
    setRemoverAlvo(prof);       // { id, nome, disciplina_id }
    setRemoverOpen(true);       // abre modal de confirmação
  }

  async function confirmarRemocaoLinha() {
    if (!removerAlvo || !turnoSelecionado) return;
    setRemovendo(true);

    try {
      const turmasDoProf = alocacoes
        .filter((a) => a.profId === removerAlvo.id)
        .map((a) => a.turmaId);

      if (turmasDoProf.length === 0) {
        setProfessoresTabela((arr) => arr.filter((p) => p.id !== removerAlvo.id));
        setRemoverOpen(false);
        setRemoverAlvo(null);
        try { await carregarProfessoresDoTurno(turnoSelecionado); } catch {}
        showToast("success", "Professor removido da lista.");
        return;
      }
 
      const itens = turmasDoProf.map((turmaId) => ({
        professor_id: removerAlvo.id,
        turma_id: turmaId,
        disciplina_id: removerAlvo.disciplina_id,
      }));

      let removedOk = false;
      try {
        await api.post("/api/modulacao/remover", { turno: turnoSelecionado, itens });
        removedOk = true;
      } catch {
        // fallback 1-a-1
        for (const turmaId of turmasDoProf) {
          await api.delete(
            `/api/modulacao/${removerAlvo.id}/${turmaId}/${removerAlvo.disciplina_id}`,
            { params: { turno: turnoSelecionado } }
          );
        }
        removedOk = true;
      }

      if (removedOk) {
        const { data } = await api.get("/api/modulacao", { params: { turno: turnoSelecionado } });
        const alocs = normalizeAlocacoes(data);
        setAlocacoes(alocs.map((a) => ({ profId: a.professor_id, turmaId: a.turma_id })));

        const aindaTem = alocs.some((a) => a.professor_id === removerAlvo.id);
        if (!aindaTem) {
          setProfessoresTabela((arr) => arr.filter((p) => p.id !== removerAlvo.id));
        }

        try { await carregarProfessoresDoTurno(turnoSelecionado); } catch {}

        setRemoverOpen(false);
        setRemoverAlvo(null);
        showToast("success", "Remoção concluída com sucesso.");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Não foi possível remover. Tente novamente.");
    } finally {
      setRemovendo(false);
    }
  }





  // --------------------------------------------------------------------------
  // Salvar (com diffs: inserções e remoções) + progresso e refresh
  // --------------------------------------------------------------------------
  async function handleSalvarModulacao() {
    if (!turnoSelecionado) return;
    setSaving(true);
    setSaveStage("Preparando…");
    setSaveBanner(null);

    // helper para quebrar a chave "prof|turma|disc"
    const parseKey = (key) => {
      const [p, t, d] = String(key).split("|");
      return {
        professor_id: Number(p),
        turma_id: t === "null" ? null : Number(t),
        disciplina_id: Number(d),
        turno: turnoSelecionado,
      };
    };

    try {
      // 1) Carrega alocações atuais do backend (existentes)
      let existentesSet = new Set();
      let existentesArr = [];
      try {
        const { data } = await api.get(`/api/modulacao`, { params: { turno: turnoSelecionado } });
        const existentes = Array.isArray(data?.alocacoes) ? data.alocacoes : [];
        for (const a of existentes) {
          const k = `${a.professor_id}|${a.turma_id ?? "null"}|${a.disciplina_id}`;
          existentesSet.add(k);
          existentesArr.push(k);
        }
      } catch {
        existentesSet = new Set();
        existentesArr = [];
      }

      // 2) Monta PAYLOAD atual (a partir da grade/checkboxes)
      const bruto = professoresTabela.flatMap((prof) => {
        const turmasAlocadas = alocacoes.filter((a) => a.profId === prof.id).map((a) => a.turmaId);
        return turmasAlocadas.map((turmaId) => ({
          turno: turnoSelecionado,
          professor_id: Number(prof.id),
          turma_id: Number(turmaId),
          disciplina_id: Number(prof.disciplina_id),
          aulas: Number(cargaPorDisciplina[prof.disciplina_id]) || 1,
        }));
      });

      // remove duplicados (prof|turma|disc) do payload
      const payload = [];
      const payloadSet = new Set();
      for (const r of bruto) {
        const key = `${r.professor_id}|${r.turma_id}|${r.disciplina_id}`;
        if (!payloadSet.has(key)) {
          payloadSet.add(key);
          payload.push(r);
        }
      }

      // 3) DIFF
      const novos = payload.filter(
        (r) => !existentesSet.has(`${r.professor_id}|${r.turma_id}|${r.disciplina_id}`)
      );
      const removidos = existentesArr
        .filter((k) => !payloadSet.has(k))        // aquilo que existia e agora sumiu nos checkboxes
        .map(parseKey);

      // 4) Sem mudanças → mensagem amigável e sai
      if (novos.length === 0 && removidos.length === 0) {
        setSaveBanner({
          type: "info",
          text: "Tudo certo por aqui. Nenhuma alteração para salvar.",
        });
        setSaving(false);
        setTimeout(() => setSaveBanner(null), 4000);
        return;
      }

      // 5) Executa operações no backend (remover depois inserir para evitar conflito)
      //    Mantém a mesma lógica de fallback que você já usa para inserir.
      //    REMOÇÕES
      if (removidos.length > 0) {
        setSaveStage("Removendo alocações…");

        let removedOk = false;
        let lastErr = null;

        // (A) batch por POST /remover
        try {
          const r = await api.post("/api/modulacao/remover", {
            turno: turnoSelecionado,
            itens: removidos,
          });
          removedOk = r?.status >= 200 && r?.status < 300;
        } catch (e) {
          lastErr = e;
        }

        // (B) batch por DELETE com body
        if (!removedOk) {
          try {
            const r = await api.delete("/api/modulacao", {
              data: { turno: turnoSelecionado, itens: removidos },
            });
            removedOk = r?.status >= 200 && r?.status < 300;
          } catch (e) {
            lastErr = e;
          }
        }

        // (C) uma-a-uma: DELETE /api/modulacao/:prof/:turma/:disc?turno=...
        if (!removedOk) {
          try {
            for (const r of removidos) {
              const url = `/api/modulacao/${r.professor_id}/${r.turma_id}/${r.disciplina_id}`;
              await api.delete(url, { params: { turno: turnoSelecionado } });
            }
            removedOk = true;
          } catch (e) {
            lastErr = e;
          }
        }

        if (!removedOk) {
          // falha real → aborta fluxo para não “recarregar” o estado errado
          setSaveBanner({
             type: "error",
            text: "Não foi possível remover algumas alocações. Verifique as rotas do backend (/api/modulacao).",
          });
          setSaving(false);
          return;
        }
      }


      // INSERÇÕES
      if (novos.length > 0) {
        setSaveStage("Enviando novas alocações…");
        let ok = false;
        try {
          await api.post("/api/modulacao/upsert", novos);
          ok = true;
        } catch {
          try {
            await api.post("/api/modulacao", novos);
            ok = true;
          } catch {}
        }
        if (!ok) throw new Error("Falha ao salvar");
      }

      // 6) Refresh de dados após commit (tabela, alocações, saldos e lista de disponíveis)
      setSaveStage("Atualizando visão…");
      try {
        // recarrega alocações do turno
        const { data } = await api.get("/api/modulacao", { params: { turno: turnoSelecionado } });
        const alocs = normalizeAlocacoes(data);

        // atualiza map de aulas totais e remonta linhas da tabela (mesma lógica que você já usa)
        const mapAulasTotais = await carregarAulasTotaisDoTurno(turnoSelecionado);

        const vistos2 = new Set();
        const profs = [];
        for (const a of alocs) {
          if (!vistos2.has(a.professor_id)) {
            let total = mapAulasTotais[a.professor_id];
            if (!total) {
              const cargaDisc = Number(cargaPorDisciplina[a.disciplina_id]) || 1;
              const qtdTurmas = alocs.filter((x) => x.professor_id === a.professor_id).length;
              total = cargaDisc * qtdTurmas;
            }
            profs.push({
              id: a.professor_id,
              nome: a.professor_nome || `Professor ${a.professor_id}`,
              disciplina_id: a.disciplina_id,
              disciplina_nome: a.disciplina_nome || "—",
              aulas: Number(total),
              turno: a.turno,
            });
            vistos2.add(a.professor_id);
          }
        }

        setProfessoresTabela(profs);
        setAlocacoes(alocs.map((a) => ({ profId: a.professor_id, turmaId: a.turma_id })));
      } catch {
        // se falhar o refresh, mantém o estado atual
      }

      // (extra) Atualiza lista do picker, pois desalocados voltam a ficar disponíveis
      try {
        await carregarProfessoresDoTurno(turnoSelecionado);
      } catch {}

      // 7) Finaliza UI
      setSaveStage("Concluído");
      setSavePercent(100);
      setSaveBanner({
        type: "success",
        text: `Horários salvos com sucesso! (+${novos.length} / -${removidos.length})`,
      });
    } catch (err) {
      setSaveBanner({ type: "error", text: "Erro ao salvar horários. Tente novamente." });
    } finally {
      setTimeout(() => setSaving(false), 500);
      setTimeout(() => setSaveBanner(null), 5000);
    }
  }


  // --------------------------------------------------------------------------
  // Carrega cargas horárias das disciplinas (robusto a diferentes formatos de API)
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function carregarCargas() {
      try {
        const { data } = await api.get("/api/disciplinas");
        const lista = Array.isArray(data) ? data : (Array.isArray(data?.disciplinas) ? data.disciplinas : []);

        const getId = (d) => d?.id ?? d?.disciplina_id ?? d?.uuid ?? null;
        const getCarga = (d) =>
          Number(
            d?.aulas ??
            d?.carga ??
            d?.carga_horaria ??
            d?.aulas_semanais ??
            d?.cargaSemanal ??
            d?.qtd_aulas ??
            0
          ) || 0;

        const map = {};
        for (const d of lista) {
          const id = getId(d);
          const carga = getCarga(d);
          if (id != null) map[id] = carga;
        }
        setCargaPorDisciplina(map);
      } catch {
        setCargaPorDisciplina({});
      }
    }
    carregarCargas();
  }, []);

  // --------------------------------------------------------------------------
  // Mapa de turmas para o turno do RELATÓRIO (id → nome)
  // --------------------------------------------------------------------------
  async function carregarMapaTurmasRelatorio(turno) {
    // Reaproveita a mesma estratégia do carregamento de turmas da grade
    let turmas = [];
    try {
      const { data } = await api.get(`/api/turmas`, { params: { turno } });
      turmas = normalizeTurmas(data);
    } catch {}
    if (turmas.length === 0) {
      try {
        const { data } = await api.get(`/api/turnos/${encodeURIComponent(turno)}/turmas`);
        turmas = normalizeTurmas(data);
      } catch {}
    }
    turmas = filtrarTurmasPorTurno(turmas, turno);

    const map = {};
    for (const t of turmas) {
      if (t?.id != null) map[Number(t.id)] = (t.nome || "").toUpperCase();
    }
    return map; // { [id]: "2I", ... }
  }



  // --------------------------------------------------------------------------
  // Baixar Relatórios
  // --------------------------------------------------------------------------
  function baixarRelatorioCSV() {
  if (!turnoRelatorio) {
    alert("Selecione um turno para baixar a lista.");
    return;
  }
  if (!relatorioDados || relatorioDados.length === 0) {
    alert("Nenhum dado para exportar.");
    return;
  }

  // Cabeçalhos
  const headers = ["Professor", "Aulas", "Carga", "Disciplina", "Turmas"];

  // Linhas (usa ; para compatibilidade com Excel em PT-BR)
  const linhas = relatorioDados.map((r) => [
    r.professor_nome ?? "—",
    r.aulas ?? 0,
    r.carga ?? 0,
    r.disciplina_nome ?? "—",
    (r.turmas && r.turmas.length ? r.turmas.join("-") : "—"),
  ]);

  // CSV seguro com aspas escapadas
  const toCSV = (row) =>
    row
      .map((val) => `"${String(val).replace(/"/g, '""')}"`)
      .join(";");

  const conteudo = [toCSV(headers), ...linhas.map(toCSV)].join("\r\n");

  // Blob + download
  // Prepend BOM para o Excel reconhecer UTF-8 e manter acentos (ex.: CIÊNCIAS)
  const BOM = "\uFEFF";
  const blob = new Blob([BOM, conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // nome do arquivo
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const nomeArquivo = `relatorio-professores-${(turnoRelatorio || "turno")
    .toLowerCase()
    .replace(/\s+/g, "-")}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;

  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


  // --------------------------------------------------------------------------
  // Função checkTurno(turno)
  // --------------------------------------------------------------------------
  async function checkTurno(turno) {
  if (!turno) return;

  setChecarLoading(true);
  setChecarTurnoAlvo(turno);

  try {
    // 1) Total de aulas por professor (por turno) – já existe em Modulacao
    const mapAulas = await carregarAulasTotaisDoTurno(turno); // { [profId]: total }

    // 2) Alocações do turno (professor-disciplina-turma)
    const { data } = await api.get("/api/modulacao", { params: { turno } });
    const alocs = normalizeAlocacoes(data); // [{ professor_id, professor_nome, disciplina_id, disciplina_nome, turma_id, turma_nome, turno }]

    // 3) Disciplinas necessárias por turma (base do Diagnóstico de Insumos)
    //    /api/modulacao/diagnostico → detalhe_por_turma: [{ turma_id, turma_nome, disciplina_id, disciplina_nome, carga }]
    let detalhe = [];
    try {
      const { data: diag } = await api.get("/api/modulacao/diagnostico", { params: { turno } });
      detalhe = Array.isArray(diag?.detalhe_por_turma) ? diag.detalhe_por_turma : [];
    } catch {
      detalhe = [];
    }

    // 4) Tabela global de professores para fallback de nomes perfeito
    const nomesProfGlobal = {};
    try {
      const { data: listaProfs } = await api.get("/api/professores");
      const arr = Array.isArray(listaProfs) ? listaProfs : (listaProfs?.professores || []);
      arr.forEach((p) => {
        if (p.id && p.nome) nomesProfGlobal[p.id] = p.nome;
      });
    } catch (e) {
      // Ignora erro, usa fallback simplificado
    }

    // Mapa de carga por disciplina (já carregado no estado)
    const cargaDisc = (id) => Number(cargaPorDisciplina[id]) || 1;

    // ─────────────────────────────────────────────────────────────
    // (i) DUPLICIDADES: mesma turma+disciplina com 2+ professores
    // ─────────────────────────────────────────────────────────────
    const keyTD = (tId, dId) => `${tId}|${dId}`;
    const mapTD = new Map(); // key → { turma, disc, profs:Set }
    for (const a of alocs) {
      const k = keyTD(a.turma_id, a.disciplina_id);
      if (!mapTD.has(k)) {
        mapTD.set(k, {
          turma_id: a.turma_id,
          turma_nome: (a.turma_nome || "").toUpperCase(),
          disciplina_id: a.disciplina_id,
          disciplina_nome: (a.disciplina_nome || "").toUpperCase(),
          professores: new Map(), // id → nome
        });
      }
      mapTD.get(k).professores.set(a.professor_id, a.professor_nome || nomesProfGlobal[a.professor_id] || `Professor ${a.professor_id}`);
    }

    const duplicidades = [];
    for (const v of mapTD.values()) {
      const total = v.professores.size;
      if (total > 1) {
        duplicidades.push({
          turma_id: v.turma_id,
          turma_nome: v.turma_nome,
          disciplina_id: v.disciplina_id,
          disciplina_nome: v.disciplina_nome,
          total,
          professores: Array.from(v.professores, ([id, nome]) => ({ id, nome })),
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // (ii) TURMA SEM PROFESSOR EM DISCIPLINA OBRIGATÓRIA
    // ─────────────────────────────────────────────────────────────
    // Base: detalhe_por_turma (de onde vêm as disciplinas/carga necessárias)
    const setTDComProfessor = new Set(Array.from(mapTD.keys()));
    const faltandoProfessor = [];
    for (const d of detalhe) {
      const k = keyTD(Number(d.turma_id), Number(d.disciplina_id));
      if (!setTDComProfessor.has(k)) {
        faltandoProfessor.push({
          turma_id: Number(d.turma_id),
          turma_nome: String(d.turma_nome || "").toUpperCase(),
          disciplina_id: Number(d.disciplina_id),
          disciplina_nome: String(d.disciplina_nome || "").toUpperCase(),
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // (iii) CARGA RESTANTE / OVERBOOKING POR PROFESSOR
    // ─────────────────────────────────────────────────────────────
    // usado = soma(cargaDisc(disciplina) por alocação do professor)
    const usadoPorProf = {};
    for (const a of alocs) {
      const c = cargaDisc(a.disciplina_id);
      usadoPorProf[a.professor_id] = (usadoPorProf[a.professor_id] || 0) + c;
    }

    const cargaRestante = [];
    const overbooking = [];
    const nomesProf = {}; // fallback de nomes a partir das alocações
    for (const a of alocs) {
      if (!nomesProf[a.professor_id]) nomesProf[a.professor_id] = a.professor_nome || nomesProfGlobal[a.professor_id] || `Professor ${a.professor_id}`;
    }

    // Também considerar professores do turno que estejam listados no picker/lista, mesmo sem alocação
    for (const [profIdStr, total] of Object.entries(mapAulas || {})) {
      const profId = Number(profIdStr);
      const usadas = Number(usadoPorProf[profId] || 0);
      const restante = Number(total) - usadas;

      const registro = {
        professor_id: profId,
        professor_nome: nomesProf[profId] || nomesProfGlobal[profId] || `Professor ${profId}`,
        total: Number(total) || 0,
        usadas,
        restante,
      };
      if (restante > 0) cargaRestante.push(registro);
      if (restante < 0) overbooking.push({ ...registro, excedente: Math.abs(restante) });
    }

    // ─────────────────────────────────────────────────────────────
    // (iv) TURNO INCONSISTENTE (alocação marcada com turno diferente)
    // ─────────────────────────────────────────────────────────────
    const turnoInconsistente = alocs
      .filter((a) => a.turno && String(a.turno).toLowerCase() !== String(turno).toLowerCase())
      .map((a) => ({
        turma_id: a.turma_id,
        turma_nome: (a.turma_nome || "").toUpperCase(),
        professor_id: a.professor_id,
        professor_nome: a.professor_nome || `Professor ${a.professor_id}`,
        turno_aloc: a.turno,
        turno_solicitado: turno,
      }));

    setInconsistencias({
      duplicidades,
      faltandoProfessor,
      cargaRestante,
      overbooking,
      turnoInconsistente,
    });

    // Abre o alerta
    setChecarOpen(true);
  } catch (e) {
    setInconsistencias({
      duplicidades: [],
      faltandoProfessor: [],
      cargaRestante: [],
      overbooking: [],
      turnoInconsistente: [],
    });
    setChecarOpen(true); // mostra alerta mesmo vazio (sem problemas encontrados)
  } finally {
    setChecarLoading(false);
  }
}



  

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  const professoresJaInseridos = new Set(professoresTabela.map((p) => p.id));
  const professoresParaAdicionar = professoresFiltrados.map((p) => ({
    ...p,
    jaTem: professoresJaInseridos.has(p.id),
  }));

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-6">
        <ClockIcon className="w-8 h-8 text-blue-900" />
        <h1 className="text-3xl font-bold text-blue-900">Grade Horária</h1>
      </div>

      {/* Barra de ações (com progresso ao lado do SALVAR) */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Escolher Turno */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMostrarMenuTurno((v) => !v)}
            className="inline-flex items-center gap-2 bg-white text-blue-900 border border-blue-200 px-4 py-2 rounded shadow-sm hover:bg-blue-50"
          >
            <span className="font-semibold uppercase">
              {turnoSelecionado ? `TURNO: ${turnoSelecionado}` : "ESCOLHER TURNO"}
            </span>
            <ChevronDownIcon className="h-4 w-4" />
          </button>

          {mostrarMenuTurno && (
            <div
             className="absolute left-0 mt-1 w-48 rounded border bg-white shadow
               z-[300]"                 // ⬅️ antes era z-50; aumente para z-[300]
            >
              {["Matutino", "Vespertino", "Noturno"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTurnoSelecionado(t);
                    setMostrarMenuTurno(false);
                  }}
                  className={`block w-full text-left px-3 py-2 hover:bg-blue-50 ${
                    turnoSelecionado === t ? "font-semibold text-blue-700" : "text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
           </div>
         )}
        </div>

        {/* Inserir Professor */}
        <button
          onClick={abrirInserirProfessor}
          disabled={!turnoSelecionado}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          <UserPlusIcon className="h-5 w-5" />
          <span className="uppercase">Inserir Professor</span>
        </button>

        {/* RELATÓRIOS */}
        <button
          onClick={() => setAbrirRelatorios(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white font-medium px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          title="Abrir relatórios"
        >
          <DocumentTextIcon className="h-5 w-5" />
          <span className="uppercase">Relatórios</span>
        </button>


  


        {/* ▶️ Botão RELATÓRIO com checagem prévia */}
<button
  onClick={async () => {
    if (!turnoSelecionado) {
      alert("Selecione um turno na Grade Horária para checar.");
      return;
    }
    await checkTurno(turnoSelecionado);
  }}
  className="inline-flex items-center gap-2 bg-purple-600 text-white font-medium px-4 py-2 rounded hover:bg-purple-700"
  title="Checar inconsistências antes de gerar"
>
  Relatório (com checagem)
</button>

{/* ⚠️ Alerta de inconsistências */}
{checarOpen && (
  <div className="w-full mt-3 bg-white border rounded-lg shadow-sm p-4">
    <div className="flex items-center justify-between mb-2">
      <div>
        <div className="text-lg font-semibold text-blue-900">
          Checagem de inconsistências — Turno: {checarTurnoAlvo || "—"}
        </div>
        <div className="text-sm text-gray-600">
          {checarLoading ? "Verificando…" : "Veja abaixo o diagnóstico antes de gerar o relatório."}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDiagOpen(true)}
          className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white"
          title="Abrir Diagnóstico de Insumos para este turno"
        >
          Abrir Diagnóstico de Insumos
        </button>
        <button
          onClick={() => {
            // prossegue para o relatório existente
            setAbrirRelatorios(true);
            setTurnoRelatorio(checarTurnoAlvo);
            setChecarOpen(false);
          }}
          className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
          title="Prosseguir mesmo assim"
        >
          Prosseguir para Relatório
        </button>
        <button
          onClick={() => setChecarOpen(false)}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
    </div>

    {/* Lista resumida */}
    {!checarLoading && (
      <div className="grid md:grid-cols-2 gap-3">
        {/* Duplicidades */}
        <div className="p-3 rounded border">
          <div className="font-semibold text-red-700 mb-1">Duplicidades (turma + disciplina)</div>
          {inconsistencias.duplicidades.length === 0 ? (
            <div className="text-sm text-gray-600">Nenhuma.</div>
          ) : (
            <ul className="text-sm list-disc pl-5 space-y-1">
              {inconsistencias.duplicidades.map((d, i) => (
                <li key={i}>
                  <b>{d.turma_nome || "Sem turma"}</b>
                  {" — "}
                  <span className="text-gray-700">{d.disciplina_nome}</span>
                  {" • "}
                  <span className="text-red-600 font-medium">{d.total} professores: </span>
                  <span className="text-gray-600 italic">
                    {d.professores.map((p) => p.nome || `Prof. ${p.id}`).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>


        {/* Turma sem professor */}
        <div className="p-3 rounded border">
          <div className="font-semibold text-amber-700 mb-1">Turmas sem professor em disciplinas obrigatórias</div>
          {inconsistencias.faltandoProfessor.length === 0 ? (
            <div className="text-sm text-gray-600">Nenhuma.</div>
          ) : (
            <ul className="text-sm list-disc pl-5">
              {inconsistencias.faltandoProfessor.map((f, i) => (
                <li key={i}>
                  <b>{f.turma_nome}</b> — {f.disciplina_nome}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Carga restante */}
        <div className="p-3 rounded border">
          <div className="font-semibold text-blue-800 mb-1">Professores com carga restante</div>
          {inconsistencias.cargaRestante.length === 0 ? (
            <div className="text-sm text-gray-600">Nenhum.</div>
          ) : (
            <ul className="text-sm list-disc pl-5">
              {inconsistencias.cargaRestante
                .sort((a,b) => b.restante - a.restante)
                .slice(0,12)
                .map((p, i) => (
                <li key={i}>
                  <b>{p.professor_nome}</b> — restante: {p.restante} (total {p.total}, usadas {p.usadas})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overbooking */}
        <div className="p-3 rounded border">
          <div className="font-semibold text-red-800 mb-1">Overbooking (excedente de aulas)</div>
          {inconsistencias.overbooking.length === 0 ? (
            <div className="text-sm text-gray-600">Nenhum.</div>
          ) : (
            <ul className="text-sm list-disc pl-5">
              {inconsistencias.overbooking
                .sort((a,b) => b.excedente - a.excedente)
                .slice(0,12)
                .map((p, i) => (
                <li key={i}>
                  <b>{p.professor_nome}</b> — excedente: {p.excedente} (total {p.total}, usadas {p.usadas})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Turno inconsistente */}
        <div className="p-3 rounded border md:col-span-2">
          <div className="font-semibold text-fuchsia-800 mb-1">Turno inconsistente</div>
          {inconsistencias.turnoInconsistente.length === 0 ? (
            <div className="text-sm text-gray-600">Nenhum.</div>
          ) : (
            <ul className="text-sm list-disc pl-5">
              {inconsistencias.turnoInconsistente.slice(0,12).map((x, i) => (
                <li key={i}>
                  <b>{x.professor_nome}</b> em {x.turma_nome} — alocado como “{x.turno_aloc}”, checado em “{x.turno_solicitado}”
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )}
  </div>
)}

{/* Modal do Diagnóstico de Insumos (reuso do módulo pronto) */}
<ModalDiagnosticoInsumos
  open={diagOpen}
  turnoInicial={checarTurnoAlvo}
  onClose={() => setDiagOpen(false)}
/>



        {/* SALVAR */}
        <button
          onClick={handleSalvarModulacao}
          disabled={saving || !turnoSelecionado}
          className="bg-blue-600 text-white font-semibold px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "SALVANDO…" : "SALVAR"}
        </button>

        {/* ⬅️ Progresso AO LADO do botão SALVAR (mesma linha) */}
        {saving && (
          <div className="ml-1 flex items-center gap-2">
            {/* Fase do salvamento (ex.: Preparando…, Enviando…, Concluído) */}
            <span className="text-sm text-gray-700">{saveStage}</span>
            {/* Barra */}
            <div className="h-2 bg-gray-200 rounded w-40">
              <div
                className="h-2 bg-blue-600 rounded"
                style={{ width: `${savePercent}%`, transition: "width .2s" }}
              />
            </div>
            {/* Percentual (opcional) */}
            <span className="text-xs text-gray-600 w-10 text-right">
              {Math.max(0, Math.min(100, Number(savePercent) || 0))}%
            </span>
          </div>
        )}
      </div>

        {abrirRelatorios && (
        <div className="bg-white rounded border p-3 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-lg font-semibold text-blue-900">Relatórios</div>
              <div className="text-sm text-gray-600">
                Selecione um <b>turno</b> para gerar a lista (independente do turno da grade).
              </div>
            </div>
            <button
              onClick={() => {
                setAbrirRelatorios(false);
                setMostrarMenuTurnoRelatorio(false);
                setTurnoRelatorio("");
                setRelatorioDados([]);
              }}
              className="px-3 py-1 rounded border hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>

          {/* Seletor de Turno (independente) */}
          <div className="relative inline-block mb-3 z-[120]">
            <button
              type="button"
              onClick={() => setMostrarMenuTurnoRelatorio((v) => !v)}
              className="inline-flex items-center gap-2 bg-white text-blue-900 border border-blue-200 px-4 py-2 rounded shadow-sm hover:bg-blue-50"
            >
              <span className="font-semibold uppercase">
                {turnoRelatorio ? `Turno: ${turnoRelatorio}` : "Escolher Turno"}
              </span>
              <ChevronDownIcon className="h-4 w-4" />
            </button>

            {mostrarMenuTurnoRelatorio && (
              <div className="absolute left-0 mt-1 w-48 rounded border bg-white shadow-xl z-[130]">
                {["Matutino", "Vespertino", "Noturno"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTurnoRelatorio(t);
                      setMostrarMenuTurnoRelatorio(false);
                      carregarRelatorioPorTurno(t); // dispara já no clique
                    }}
                    className={`block w-full text-left px-3 py-2 hover:bg-blue-50 ${
                      turnoRelatorio === t ? "font-semibold text-blue-700" : "text-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Barra de ações do relatório */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={baixarRelatorioCSV}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              disabled={relatorioDados.length === 0}
              title={relatorioDados.length ? "Baixar lista" : "Gere a lista primeiro"}
            >
              BAIXAR LISTA
            </button>
            {turnoRelatorio && (
              <span className="text-sm text-gray-600">
                {carregandoRelatorio
                  ? "Gerando lista…"
                  : `${relatorioDados.length} registro(s) encontrado(s)`}
              </span>
            )}
          </div>

          {/* Lista do relatório */}
          {!turnoRelatorio ? (
            <div className="text-sm text-gray-600">Escolha o turno para gerar a lista.</div>
          ) : carregandoRelatorio ? (
            <div className="py-3 text-gray-600">Carregando…</div>
          ) : relatorioDados.length === 0 ? (
            <div className="py-3 text-gray-600">Nenhum dado encontrado para este turno.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse mt-2">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="p-2 border text-center font-medium text-blue-900">Professor</th>
                    <th className="p-2 border text-center font-medium text-blue-900">Aulas</th>
                    <th className="p-2 border text-center font-medium text-blue-900">Carga</th>
                    <th className="p-2 border text-center font-medium text-blue-900">Disciplina</th>
                    <th className="p-2 border text-center font-medium text-blue-900">Turmas</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioDados.map((r) => (
                    <tr key={`${r.professor_id}-${r.disciplina_id}`} className="hover:bg-blue-50">
                      <td className="p-2 border text-left uppercase">{r.professor_nome}</td>
                      <td className="p-2 border text-center">{r.aulas}</td>
                      <td className="p-2 border text-center">{r.carga ?? "—"}</td>
                      <td className="p-2 border text-center uppercase">{r.disciplina_nome}</td>
                      <td className="p-2 border text-left">
                        {r.turmas && r.turmas.length ? r.turmas.join("-") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

     {/* Banner de feedback (tipado) */}
     {saveBanner && (() => {
       const map = {
         success: "bg-green-100 text-green-800 border border-green-200",
         error:   "bg-red-100 text-red-800 border border-red-200",
         info:    "bg-blue-100 text-blue-800 border border-blue-200",
         warning: "bg-amber-100 text-amber-800 border border-amber-200",
       };
       const icon =
         saveBanner.type === "success" ? "✔️" :
         saveBanner.type === "error"   ? "❌" :
         saveBanner.type === "warning" ? "⚠️" : "ℹ️";

       return (
         <div
           role="status"
           className={`mt-2 px-3 py-2 rounded flex items-center gap-2 ${map[saveBanner.type] || map.info}`}
         >
           <span aria-hidden className="text-lg leading-none">{icon}</span>
           <span className="text-sm font-medium">{saveBanner.text}</span>
           <button
             type="button"
             onClick={() => setSaveBanner(null)}
             className="ml-auto px-2 py-1 rounded hover:bg-white/30"
             aria-label="Fechar mensagem"
           >
             ×
           </button>
         </div>
       );
     })()}


      {/* Picker de Professores */}
      {abrirPickerProf && (
        <div className="bg-white rounded border p-3 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-700">
              Listando professores do turno: <b>{turnoSelecionado || "—"}</b>
            </div>
            <div className="flex items-center gap-2">
              <input
                placeholder="Buscar professor…"
                value={buscaProf}
                onChange={(e) => setBuscaProf(e.target.value)}
                className="border rounded px-3 py-1 w-64"
              />
              <button
                onClick={() => setAbrirPickerProf(false)}
                className="px-3 py-1 rounded border hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>




          {carregandoProf ? (
            <div className="py-4 text-center text-gray-600">Carregando professores…</div>
          ) : (
            <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
              <table className="w-full border-collapse mt-2">




                <thead className="bg-blue-100">
                  <tr>
                    <th className="p-2 border text-center font-medium text-blue-900">Professor</th>
                    <th className="p-2 border text-center font-medium text-blue-900">Disciplina</th>
                    <th className="p-2 border text-center font-medium text-blue-900">Aulas</th>
                    <th className="p-2 border text-center font-medium text-blue-900">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {professoresParaAdicionar.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50">
                      <td className="p-2 border text-center uppercase">{p.nome}</td>
                      <td className="p-2 border text-center uppercase">{p.disciplina_nome}</td>
                      <td className="p-2 border text-center">{p.aulas}</td>
                      <td className="p-2 border text-center">
                        <button
                          onClick={() => {
                            // ao selecionar no picker, adiciona professor à tabela principal
                            if (!turmasTurno.length && turnoSelecionado) {
                              carregarTurmasDoTurno(turnoSelecionado);
                            }
                            if (professoresTabela.some((x) => x.id === p.id)) return;
                            setProfessoresTabela((prev) => [
                              ...prev,
                              {
                                id: p.id,
                                nome: p.nome,
                                disciplina_id: p.disciplina_id,
                                disciplina_nome: p.disciplina_nome,
                                aulas: Number(aulasTotaisPorProfessor[p.id] ?? p.aulas ?? 0) || 0,
                                turno: turnoSelecionado,
                              },
                            ]);
                          }}
                          className={`px-3 py-1 rounded ${
                            p.jaTem ? "bg-gray-200" : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                          disabled={p.jaTem}
                        >
                          {p.jaTem ? "Adicionado" : "Adicionar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabela principal */}
      {turnoSelecionado && (
        <div className="relative overflow-x-auto rounded border shadow bg-white">
          {/* Aviso de turmas (quando nenhuma for encontrada) */}
          {turmasAviso && (
            <div className="px-3 py-2 text-sm text-amber-800 bg-amber-50 border-b border-amber-200">
              {turmasAviso}
            </div>
          )}

          {/* IMPORTANTE: table-fixed para respeitar larguras e evitar atravessamento */}
          <table className="min-w-[1400px] w-full border-separate border-spacing-0 table-fixed">

            <thead className="bg-gray-100 shadow-sm">{/* <- sem sticky aqui */}
              <tr>
                {/* Professor (coluna 1) */}
                <th className="py-2 px-4 border text-blue-900 font-semibold text-center sticky top-0 left-0 z-50 bg-gray-100 w-[260px]">
                  Professor
                </th>

                {/* Disciplina (coluna 2) */}
                <th
                  className="py-2 px-4 border text-blue-900 font-semibold text-center sticky top-0 z-50 bg-gray-100 w-[160px]"
                  style={{ left: 260 }} // 260 = largura da 1ª coluna
                >
                  Disciplina
                </th>

                {/* Aulas (coluna 3) */}
                <th
                  className="py-2 px-4 border text-blue-900 font-semibold text-center sticky top-0 z-50 bg-gray-100 w-[100px]"
                  style={{ left: 260 + 160 }} // 420 = 260 + 160
                >
                  Aulas
                </th>

                {/* Colunas das turmas (1A…1T, 2A…2Q, etc.) */}
                {turmasTurno.map((turma) => (
                  <th
                    key={turma.id}
                    className="p-1 border text-blue-900 font-semibold text-center sticky top-0 z-40 bg-gray-100 min-w-[40px]"
                  >
                    <div
                      className="mx-auto h-32 flex items-center justify-center whitespace-nowrap"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      title={turma.nome}
                    >
                      {turma.nome}
                    </div>
                  </th>
                ))}

                {/* Ações (fica no mesmo cabeçalho, com largura fixa) */}
                <th className="py-2 px-4 border text-blue-900 font-semibold text-center sticky top-0 z-40 bg-gray-100 w-[140px] min-w-[140px] whitespace-nowrap">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {carregandoTabela ? (
                /* Estado de carregamento da tabela principal */
                <tr>
                  <td
                    colSpan={3 + turmasTurno.length + 1}
                    className="py-6 text-center text-gray-600"
                  >
                    Lista sendo carregada…
                  </td>
                </tr>
              ) : professoresTabela.length === 0 ? (
                /* Estado sem dados (após carregar) */
                <tr>
                  <td
                    colSpan={3 + turmasTurno.length + 1}
                    className="py-6 text-center text-gray-500"
                  >
                    Nenhum professor na tabela. Clique em <b>Inserir Professor</b>.
                  </td>
                </tr>
              ) : (
                professoresTabela.map((prof) => {
                  const r =
                    resumoAulas[prof.id] || {
                      total: Number(prof.aulas) || 0,
                      usadas: 0,
                      restante: Number(prof.aulas) || 0,
                    };

                  return (
                    <tr key={prof.id}>
                      {/* Professor */}
                      <td className="py-2 px-4 border sticky left-0 z-40 bg-white w-[260px]">
                        {prof.nome}
                      </td>

                      {/* Disciplina */}
                      <td
                        className="py-2 px-4 border sticky z-40 bg-white w-[160px]"
                        style={{ left: 260 }}
                      >
                        {prof.disciplina_nome || "—"}
                      </td>

                      {/* Aulas (restante dinâmico) */}
                      <td
                        className="py-2 px-4 border text-center sticky z-40 bg-white w-[100px]"
                        style={{ left: 260 + 160 }}
                      >
                        <span
                          className={
                            r.restante < 0
                              ? "text-red-600 font-semibold"
                              : r.restante === 0
                              ? "text-amber-600 font-semibold"
                              : "text-gray-900"
                          }
                          title={`Total: ${r.total} • Usadas: ${r.usadas} • Restante: ${r.restante}`}
                        >
                          {r.restante}
                        </span>
                      </td>

                      {/* Turmas — checkboxes com lógica inteligente de carga */}
                      {turmasTurno.map((turma) => {
                        const isChecked = alocacoes.some(
                          (a) => a.profId === prof.id && a.turmaId === turma.id
                        );
                        // Carga real desta disciplina nesta turma (com fallback)
                        const cargaTurma =
                          cargaPorTurmaDisc[turma.id]?.[prof.disciplina_id] ??
                          Number(cargaPorDisciplina[prof.disciplina_id]) ??
                          1;
                        const restanteAtual = r.restante;
                        // Bloqueia somente se não está marcado e não há saldo suficiente
                        const semSaldo = !isChecked && restanteAtual < cargaTurma;
                        const tooltipBloqueio = semSaldo
                          ? restanteAtual <= 0
                            ? `${prof.nome} está 100% modulado (0 aulas restantes)`
                            : `Insuficiente: esta turma consome ${cargaTurma} aula(s), mas restam apenas ${restanteAtual}`
                          : `Total: ${r.total} • Usadas: ${r.usadas} • Restante: ${restanteAtual} • Esta turma: ${cargaTurma} aula(s)`;

                        return (
                          <td key={turma.id} className="py-2 px-4 border">
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                title={tooltipBloqueio}
                                checked={isChecked}
                                disabled={semSaldo}
                                style={semSaldo ? { cursor: "not-allowed", opacity: 0.35 } : {}}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // verifica saldo (dupla cheque, pois disabled já bloqueia)
                                    if (restanteAtual < cargaTurma) {
                                      return;
                                    }
                                    setAlocacoes((prev) => [
                                      ...prev,
                                      { profId: prof.id, turmaId: turma.id },
                                    ]);
                                  } else {
                                    setAlocacoes((prev) =>
                                      prev.filter(
                                        (a) => !(a.profId === prof.id && a.turmaId === turma.id)
                                      )
                                    );
                                  }
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}

                      {/* Ações (largura fixa e sem quebra) */}
                      <td className="py-2 px-4 border text-center w-[140px] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => abrirRemoverLinha(prof)}
                          className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                          title="Remover professor e suas marcações deste turno"
                          disabled={removerOpen || removendo}
                        >
                          Remover
                        </button>
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}



      {/* Modal de confirmação de remoção */}
      {removerOpen && removerAlvo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setRemoverOpen(false)} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-md p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Remover {removerAlvo.nome} da Grade?
          </h3>
          <p className="text-sm text-gray-700 mb-5">
            Isso irá excluir <strong>todas as marcações</strong> desse professor neste turno
            (todas as turmas marcadas), e ele voltará para a lista de “Inserir Professor”.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setRemoverOpen(false)}
              className="px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              disabled={removendo}
            >
              Cancelar
            </button>
            <button
              onClick={confirmarRemocaoLinha}
              className="px-3 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              disabled={removendo}
              aria-busy={removendo}
            >
              {removendo ? "Removendo…" : "Sim, remover"}
            </button>
          </div>
        </div>
      </div>
    )}








     
    {toast && (
      <div
        role={toast.type === "error" ? "alert" : "status"}
        aria-live={toast.type === "error" ? "assertive" : "polite"}
        className={
          "fixed bottom-4 right-4 z-[500] max-w-sm w-[min(90vw,420px)] " +
          "rounded-lg shadow-lg px-4 py-3 cursor-pointer outline-none " +
          (toast.type === "success"
            ? "bg-green-600 text-white"
            : toast.type === "error"
            ? "bg-rose-600 text-white"
            : "bg-blue-600 text-white")
        }
        tabIndex={0} // permite foco via teclado
        onClick={() => setToast(null)} // fechar por clique em qualquer área do toast
        onKeyDown={(e) => {
           if (e.key === "Enter" || e.key === " ") setToast(null); // fechar por Enter/Espaço
        }}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-xl leading-none">
            {toast.type === "success" ? "✔️" : toast.type === "error" ? "❌" : "ℹ️"}
          </span>
          <div className="flex-1 text-sm font-medium">{toast.text}</div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // não deixar o clique "vazar" para o container
              setToast(null);
            }}
            className="ml-1 -mr-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label="Fechar notificação"
            title="Fechar"
          >
            ×
          </button>
        </div>
      </div>
    )}


    </div>
  );
}
