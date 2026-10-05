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
import ReactDOM from "react-dom";
import api from "../../../services/api";
import {
  ChevronDownIcon,
  UserPlusIcon,
  ClockIcon,
  DocumentTextIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
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
      const regime = t?.regime ?? null;

      return id && nome ? { id, nome: String(nome), turno, ano, regime } : null;
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
  const [semestreSelecionado, setSemestreSelecionado] = useState(1); // 1 = 1º Semestre, 2 = 2º Semestre
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
  // Comunicabilidade com Turmas de Agrupamento / Eletivas (FGB + Agrupamentos)
  const [resumoAgrupamentos, setResumoAgrupamentos] = useState({ por_professor: {}, por_prof_disc: {}, por_prof_turno: {}, itens: [] });

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

  // Fecha picker de professor por ESC
  useEffect(() => {
    if (!abrirPickerProf) return;
    const onKey = (e) => {
      if (e.key === "Escape") setAbrirPickerProf(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abrirPickerProf]);

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
        semestre: Number(a.semestre ?? 1),
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
  // --------------------------------------------------------------------------
  // Reação principal ao mudar o turno ou semestre
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function carregarTurnoESemestre() {
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
        // carrega/atualiza o map de total de aulas por professor para este turno e semestre
        const mapAulasTotais = await carregarAulasTotaisDoTurno(turnoSelecionado, semestreSelecionado);
        // Carrega aulas alocadas em Turmas de Agrupamento (Eletivas / IFA) para comunicabilidade
        try {
          const { data: agrData } = await api.get("/api/agrupamentos/modulacao/resumo", {
            params: { turno: turnoSelecionado, semestre: semestreSelecionado },
          });
          setResumoAgrupamentos(agrData || { por_professor: {}, por_prof_disc: {}, por_prof_turno: {}, itens: [] });
        } catch {
          setResumoAgrupamentos({ por_professor: {}, por_prof_disc: {}, por_prof_turno: {}, itens: [] });
        }

        // MODULAÇÃO INTELIGENTE: carrega carga real por turma × disciplina para o semestre selecionado
        try {
          const { data: cargaTurmaData } = await api.get("/api/modulacao/carga-turma", {
            params: { turno: turnoSelecionado, semestre: semestreSelecionado },
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

        // busca as alocações do turno e semestre
        const { data } = await api.get("/api/modulacao", {
          params: { turno: turnoSelecionado, semestre: semestreSelecionado },
        });
        const alocs = normalizeAlocacoes(data);

        // ── 1 linha por (professor_id × disciplina_id) ──────────────────
        const linhasMap = new Map();
        for (const a of alocs) {
          const key = `${a.professor_id}|${a.disciplina_id}`;
          if (!linhasMap.has(key)) {
            linhasMap.set(key, {
              rowKey: key,
              id: Number(a.professor_id),
              nome: a.professor_nome || `Professor ${a.professor_id}`,
              disciplina_id: Number(a.disciplina_id),
              disciplina_nome: a.disciplina_nome || "—",
              aulas: Number(mapAulasTotais[`${a.professor_id}|${a.disciplina_id}`] ?? mapAulasTotais[a.professor_id] ?? 0) || 0,
              turno: a.turno,
            });
          }
        }
        const profs = Array.from(linhasMap.values()).sort((x, y) =>
          naturalCompare(x.nome, y.nome) || naturalCompare(x.disciplina_nome, y.disciplina_nome)
        );

        setProfessoresTabela(profs);
        // alocacoes agora inclui discId e semestre
        setAlocacoes(alocs.map((a) => ({
          profId: a.professor_id,
          turmaId: a.turma_id,
          discId: a.disciplina_id,
          semestre: a.semestre ?? semestreSelecionado,
        })));
      } catch {
        setProfessoresTabela([]);
        setAlocacoes([]);
      } finally {
        setCarregandoTabela(false);
      }
    }
    carregarTurnoESemestre();
  }, [turnoSelecionado, semestreSelecionado]);

  // Recarrega a lista do picker ao alterar o turno ou semestre, se ele estiver aberto
  useEffect(() => {
    if (abrirPickerProf && turnoSelecionado) {
      setCarregandoProf(true);
      carregarProfessoresDoTurno(turnoSelecionado).finally(() => {
        setCarregandoProf(false);
      });
    }
  }, [turnoSelecionado, semestreSelecionado, abrirPickerProf]);

  // --------------------------------------------------------------------------
  // Busca professores do turno e cria um map { profId: aulasTotal } filtrado pelo semestre
  async function carregarAulasTotaisDoTurno(turno, sem = semestreSelecionado) {
    try {
      let lista = [];
      try {
        const { data } = await api.get(`/api/professores`, { params: { turno } });
        lista = Array.isArray(data) ? data : (Array.isArray(data?.professores) ? data.professores : []);
      } catch {
        const { data } = await api.get(`/api/professores`);
        lista = Array.isArray(data) ? data : (Array.isArray(data?.professores) ? data.professores : []);
      }

      lista = filtraPorTurno(lista, turno).filter((p) => String(p.status).toLowerCase() !== "inativo");

      const map = {};
      for (const p of lista) {
        const id = Number(p?.id ?? p?.professor_id ?? p?.uuid);
        if (!id) continue;

        const vinculos = Array.isArray(p.vinculos) ? p.vinculos : [];
        const vinculosTurno = vinculos.filter(
          (v) => String(v.turno || "").toLowerCase() === String(turno).toLowerCase() &&
                 (Number(v.semestre ?? 0) === 0 || Number(v.semestre) === Number(sem))
        );

        if (vinculosTurno.length > 0) {
          for (const v of vinculosTurno) {
            const discId = v.disciplina_id;
            const tot = Number(v.aulas ?? 0) || 0;
            map[`${id}|${discId}`] = tot;
          }
        } else {
          const tot =
            Number(
              p?.aulas ??
              p?.carga ??
              p?.carga_aulas ??
              p?.cargaHoraria ??
              0
            ) || 0;
          if (p.disciplina_id) {
             map[`${id}|${p.disciplina_id}`] = tot;
          } else {
             map[id] = tot;
          }
        }
      }
      setAulasTotaisPorProfessor(map);
      return map;
    } catch {
      setAulasTotaisPorProfessor({});
      return {};
    }
  }

  // --------------------------------------------------------------------------
  // Carrega os professores disponíveis para o turno e semestre informado
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

      // ── Expande 1 linha por vínculo (prof × disciplina × turno × semestre) ──
      const linhas = [];
      for (const p of lista) {
        const vinculos = Array.isArray(p.vinculos) ? p.vinculos : [];
        const vinculosTurno = vinculos.filter(
          (v) => String(v.turno || "").toLowerCase() === String(turno).toLowerCase() &&
                 (Number(v.semestre ?? 0) === 0 || Number(v.semestre) === Number(semestreSelecionado))
        );
        if (vinculosTurno.length === 0) continue; // professor não tem vínculo neste turno/semestre
        for (const v of vinculosTurno) {
          linhas.push({
            rowKey: `${p.id}|${v.disciplina_id}`,
            id: p.id,
            nome: p.nome,
            disciplina_id: v.disciplina_id,
            disciplina_nome: v.disciplina_nome || v.disciplina || "—",
            aulas: Number(v.aulas ?? 0) || 0,
            semestre: Number(v.semestre ?? 0),
            turno: v.turno,
          });
        }
      }
      linhas.sort((a, b) => naturalCompare(a.nome, b.nome) || naturalCompare(a.disciplina_nome, b.disciplina_nome));
      setProfessoresDisponiveis(linhas);
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
            aulas: Number(mapAulas[`${a.professor_id}|${a.disciplina_id}`] ?? mapAulas[a.professor_id] ?? 0) || 0,
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
  // resumoAulas agora é por rowKey (prof_id|disc_id) para não misturar disciplinas
  const resumoAulas = useMemo(() => {
    const map = {};
    for (const prof of professoresTabela) {
      const total = Number(aulasTotaisPorProfessor[prof.id] ?? prof.aulas ?? 0) || 0;
      // soma aulas usadas na FGB (turmas regulares)
      const usadasFgb = alocacoes
        .filter((a) => a.profId === prof.id && a.discId === prof.disciplina_id)
        .reduce((soma, a) => {
          const cargaEspecifica = cargaPorTurmaDisc[a.turmaId]?.[prof.disciplina_id];
          const carga = cargaEspecifica ?? Number(cargaPorDisciplina[prof.disciplina_id]) ?? 1;
          return soma + (carga || 1);
        }, 0);

      // Comunicabilidade com Turmas de Agrupamento / Eletivas (por professor e disciplina)
      const aulasAgr = Number(resumoAgrupamentos?.por_prof_disc?.[prof.rowKey] ?? 0);
      const usadasTotal = usadasFgb + aulasAgr;

      map[prof.rowKey] = {
        total,
        usadas: usadasTotal,
        usadasFgb,
        aulasAgr,
        restante: total - usadasTotal,
        carga: Number(cargaPorDisciplina[prof.disciplina_id]) || 1,
      };
    }
    return map;
  }, [professoresTabela, alocacoes, aulasTotaisPorProfessor, cargaPorDisciplina, cargaPorTurmaDisc, resumoAgrupamentos]);



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
      // filtra somente as turmas desta linha (prof × disciplina)
      const turmasDoProf = alocacoes
        .filter((a) => a.profId === removerAlvo.id && a.discId === removerAlvo.disciplina_id)
        .map((a) => a.turmaId);

      if (turmasDoProf.length === 0) {
        setProfessoresTabela((arr) => arr.filter((p) => p.rowKey !== removerAlvo.rowKey));
        setRemoverOpen(false);
        setRemoverAlvo(null);
        try { await carregarProfessoresDoTurno(turnoSelecionado); } catch {}
        showToast("success", "Linha removida da lista.");
        return;
      }
 
      const itens = turmasDoProf.map((turmaId) => ({
        professor_id: removerAlvo.id,
        turma_id: turmaId,
        disciplina_id: removerAlvo.disciplina_id,
        semestre: semestreSelecionado,
      }));

      let removedOk = false;
      try {
        await api.post("/api/modulacao/remover", { turno: turnoSelecionado, semestre: semestreSelecionado, itens });
        removedOk = true;
      } catch {
        // fallback 1-a-1
        for (const turmaId of turmasDoProf) {
          await api.delete(
            `/api/modulacao/${removerAlvo.id}/${turmaId}/${removerAlvo.disciplina_id}`,
            { params: { turno: turnoSelecionado, semestre: semestreSelecionado } }
          );
        }
        removedOk = true;
      }

      if (removedOk) {
        const { data } = await api.get("/api/modulacao", {
          params: { turno: turnoSelecionado, semestre: semestreSelecionado },
        });
        const alocs = normalizeAlocacoes(data);
        setAlocacoes(alocs.map((a) => ({
          profId: a.professor_id,
          turmaId: a.turma_id,
          discId: a.disciplina_id,
          semestre: a.semestre ?? semestreSelecionado,
        })));

        // remove somente a linha desta disciplina; outras disciplinas do prof ficam
        const aindaTemEstaDisc = alocs.some(
          (a) => a.professor_id === removerAlvo.id && a.disciplina_id === removerAlvo.disciplina_id
        );
        if (!aindaTemEstaDisc) {
          setProfessoresTabela((arr) => arr.filter((p) => p.rowKey !== removerAlvo.rowKey));
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

    // helper para quebrar a chave "prof|turma|disc|semestre"
    const parseKey = (key) => {
      const [p, t, d, s] = String(key).split("|");
      return {
        professor_id: Number(p),
        turma_id: t === "null" ? null : Number(t),
        disciplina_id: Number(d),
        turno: turnoSelecionado,
        semestre: s ? Number(s) : semestreSelecionado,
      };
    };

    try {
      // 1) Carrega alocações atuais do backend (existentes) para o turno e semestre selecionados
      let existentesSet = new Set();
      let existentesArr = [];
      try {
        const { data } = await api.get(`/api/modulacao`, {
          params: { turno: turnoSelecionado, semestre: semestreSelecionado },
        });
        const existentes = Array.isArray(data?.alocacoes) ? data.alocacoes : [];
        for (const a of existentes) {
          const k = `${a.professor_id}|${a.turma_id ?? "null"}|${a.disciplina_id}|${semestreSelecionado}`;
          existentesSet.add(k);
          existentesArr.push(k);
        }
      } catch {
        existentesSet = new Set();
        existentesArr = [];
      }

      // 2) Monta PAYLOAD atual (a partir da grade/checkboxes)
      // Usa a chave (profId, turmaId, discId, semestre)
      const bruto = professoresTabela.flatMap((prof) => {
        const turmasAlocadas = alocacoes
          .filter((a) => a.profId === prof.id && a.discId === prof.disciplina_id)
          .map((a) => a.turmaId);
        return turmasAlocadas.map((turmaId) => ({
          turno: turnoSelecionado,
          semestre: semestreSelecionado,
          professor_id: Number(prof.id),
          turma_id: Number(turmaId),
          disciplina_id: Number(prof.disciplina_id),
          aulas: Number(cargaPorDisciplina[prof.disciplina_id]) || 1,
        }));
      });

      // remove duplicados (prof|turma|disc|semestre) do payload
      const payload = [];
      const payloadSet = new Set();
      for (const r of bruto) {
        const key = `${r.professor_id}|${r.turma_id}|${r.disciplina_id}|${r.semestre}`;
        if (!payloadSet.has(key)) {
          payloadSet.add(key);
          payload.push(r);
        }
      }

      // 3) DIFF estrito por semestre
      const novos = payload.filter(
        (r) => !existentesSet.has(`${r.professor_id}|${r.turma_id}|${r.disciplina_id}|${r.semestre}`)
      );
      const removidos = existentesArr
        .filter((k) => !payloadSet.has(k))        // aquilo que existia no semestre e agora sumiu
        .map(parseKey);

      // 4) Sem mudanças → mensagem amigável e sai
      if (novos.length === 0 && removidos.length === 0) {
        setSaveBanner({
          type: "info",
          text: `Tudo certo por aqui. Nenhuma alteração para salvar no ${semestreSelecionado}º Semestre.`,
        });
        setSaving(false);
        setTimeout(() => setSaveBanner(null), 4000);
        return;
      }

      // 5) Executa operações no backend (remover depois inserir para evitar conflito)
      //    REMOÇÕES (isoladas por semestre)
      if (removidos.length > 0) {
        setSaveStage("Removendo alocações…");

        let removedOk = false;
        let lastErr = null;

        // (A) batch por POST /remover
        try {
          const r = await api.post("/api/modulacao/remover", {
            turno: turnoSelecionado,
            semestre: semestreSelecionado,
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
              data: { turno: turnoSelecionado, semestre: semestreSelecionado, itens: removidos },
            });
            removedOk = r?.status >= 200 && r?.status < 300;
          } catch (e) {
            lastErr = e;
          }
        }

        // (C) uma-a-uma: DELETE /api/modulacao/:prof/:turma/:disc?turno=...&semestre=...
        if (!removedOk) {
          try {
            for (const r of removidos) {
              const url = `/api/modulacao/${r.professor_id}/${r.turma_id}/${r.disciplina_id}`;
              await api.delete(url, { params: { turno: turnoSelecionado, semestre: semestreSelecionado } });
            }
            removedOk = true;
          } catch (e) {
            lastErr = e;
          }
        }

        if (!removedOk) {
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
        // recarrega alocações do turno e semestre
        const { data } = await api.get("/api/modulacao", {
          params: { turno: turnoSelecionado, semestre: semestreSelecionado },
        });
        const alocs = normalizeAlocacoes(data);

        // atualiza map de aulas totais e remonta linhas da tabela
        const mapAulasTotais = await carregarAulasTotaisDoTurno(turnoSelecionado, semestreSelecionado);
        try {
          const { data: agrData } = await api.get("/api/agrupamentos/modulacao/resumo", {
            params: { turno: turnoSelecionado, semestre: semestreSelecionado },
          });
          setResumoAgrupamentos(agrData || { por_professor: {}, por_prof_disc: {}, por_prof_turno: {}, itens: [] });
        } catch {}

        // pós-save: reconstrói linhas por (prof × disciplina)
        const linhasMap2 = new Map();
        for (const a of alocs) {
          const key = `${a.professor_id}|${a.disciplina_id}`;
          if (!linhasMap2.has(key)) {
            linhasMap2.set(key, {
              rowKey: key,
              id: Number(a.professor_id),
              nome: a.professor_nome || `Professor ${a.professor_id}`,
              disciplina_id: Number(a.disciplina_id),
              disciplina_nome: a.disciplina_nome || "—",
              aulas: Number(mapAulasTotais[`${a.professor_id}|${a.disciplina_id}`] ?? mapAulasTotais[a.professor_id] ?? 0) || 0,
              turno: a.turno,
              semestre: Number(a.semestre ?? semestreSelecionado),
            });
          }
        }
        const profs2 = Array.from(linhasMap2.values()).sort((x, y) =>
          naturalCompare(x.nome, y.nome) || naturalCompare(x.disciplina_nome, y.disciplina_nome)
        );

        setProfessoresTabela(profs2);
        setAlocacoes(alocs.map((a) => ({
          profId: a.professor_id,
          turmaId: a.turma_id,
          discId: a.disciplina_id,
          semestre: a.semestre ?? semestreSelecionado,
        })));
      } catch {
        // se falhar o refresh, mantém o estado atual
      }

      // (extra) Atualiza lista do picker
      try {
        await carregarProfessoresDoTurno(turnoSelecionado);
      } catch {}

      // 7) Finaliza UI
      setSaveStage("Concluído");
      setSavePercent(100);
      setSaveBanner({
        type: "success",
        text: `Modulação do ${semestreSelecionado}º Semestre salva com sucesso! (+${novos.length} / -${removidos.length})`,
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
    // 1) Total de aulas por professor (por turno e semestre)
    const mapAulas = await carregarAulasTotaisDoTurno(turno, semestreSelecionado); // { [profId]: total }

    // 2) Alocações do turno e semestre (professor-disciplina-turma)
    const { data } = await api.get("/api/modulacao", {
      params: { turno, semestre: semestreSelecionado },
    });
    const alocs = normalizeAlocacoes(data); // [{ professor_id, professor_nome, disciplina_id, disciplina_nome, turma_id, turma_nome, turno }]

    // 3) Disciplinas necessárias por turma (base do Diagnóstico de Insumos)
    //    /api/modulacao/diagnostico → detalhe_por_turma: [{ turma_id, turma_nome, disciplina_id, disciplina_nome, carga }]
    let detalhe = [];
    try {
      const { data: diag } = await api.get("/api/modulacao/diagnostico", {
        params: { turno, semestre: semestreSelecionado },
      });
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
    // (iii) CARGA RESTANTE / OVERBOOKING POR PROFESSOR × DISCIPLINA
    // ─────────────────────────────────────────────────────────────
    const usadoPorProfDisc = {};
    for (const a of alocs) {
      const c = cargaDisc(a.disciplina_id);
      const k = `${a.professor_id}|${a.disciplina_id}`;
      usadoPorProfDisc[k] = (usadoPorProfDisc[k] || 0) + c;
    }

    const cargaRestante = [];
    const overbooking = [];
    const nomesProf = {}; // fallback de nomes a partir das alocações
    for (const a of alocs) {
      if (!nomesProf[a.professor_id]) nomesProf[a.professor_id] = a.professor_nome || nomesProfGlobal[a.professor_id] || `Professor ${a.professor_id}`;
    }

    // Também considerar professores do turno que estejam listados no picker/lista, mesmo sem alocação
    for (const [key, total] of Object.entries(mapAulas || {})) {
      const parts = key.split("|");
      const profId = Number(parts[0]);
      // se a chave for antiga (só id), usa o id, mas o ideal é que seja profId|discId
      const usadas = Number(usadoPorProfDisc[key] || 0);
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
  // jaTem: verifica pela rowKey (prof_id|disc_id) para permitir 2 disciplinas do mesmo prof
  const rowKeysJaInseridos = new Set(professoresTabela.map((p) => p.rowKey));
  const professoresParaAdicionar = professoresFiltrados.map((p) => ({
    ...p,
    jaTem: rowKeysJaInseridos.has(p.rowKey),
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

        {/* Seletor de Semestre Moderno */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-blue-200 shadow-sm">
          <button
            type="button"
            onClick={() => setSemestreSelecionado(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              semestreSelecionado === 1
                ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-sm"
                : "text-slate-600 hover:text-blue-700 hover:bg-blue-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${semestreSelecionado === 1 ? "bg-emerald-400 animate-pulse" : "bg-slate-300"}`} />
            <span>1º SEMESTRE</span>
            <span className={`font-normal text-[10px] px-1.5 py-0.5 rounded ${semestreSelecionado === 1 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              1º e 2º Bim
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSemestreSelecionado(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              semestreSelecionado === 2
                ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-sm"
                : "text-slate-600 hover:text-blue-700 hover:bg-blue-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${semestreSelecionado === 2 ? "bg-purple-400 animate-pulse" : "bg-slate-300"}`} />
            <span>2º SEMESTRE</span>
            <span className={`font-normal text-[10px] px-1.5 py-0.5 rounded ${semestreSelecionado === 2 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              3º e 4º Bim
            </span>
          </button>
        </div>

        {/* Inserir Professor */}
        <button
          onClick={abrirInserirProfessor}
          disabled={!turnoSelecionado}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          <UserPlusIcon className="h-4 w-4" />
          <span>INSERIR PROFESSOR</span>
        </button>

        {/* RELATÓRIOS */}
        <button
          onClick={() => setAbrirRelatorios(true)}
          className="inline-flex items-center gap-2 bg-white text-indigo-700 border border-indigo-200 font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-indigo-50 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          title="Abrir relatórios"
        >
          <DocumentTextIcon className="h-4 w-4 text-indigo-600" />
          <span>RELATÓRIOS</span>
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
          className="inline-flex items-center gap-2 bg-white text-purple-700 border border-purple-200 font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-purple-50 shadow-sm transition-all cursor-pointer"
          title="Checar inconsistências antes de gerar"
        >
          <span>CHECAGEM DE INSUMOS</span>
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
  semestreInicial={semestreSelecionado}
  onClose={() => setDiagOpen(false)}
/>

        {/* SALVAR */}
        <button
          onClick={handleSalvarModulacao}
          disabled={saving || !turnoSelecionado}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          {saving ? "SALVANDO…" : "SALVAR GRADE"}
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


      {/* Modal Premium de Inserção de Professores (sem empurrar a grade) */}
      {abrirPickerProf &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
            onClick={() => setAbrirPickerProf(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-blue-100 animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Premium com Gradiente */}
              <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-800 p-6 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
                    <UserPlusIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                      Inserir Professor na Grade
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/40 text-emerald-100 border border-emerald-400/30">
                        {semestreSelecionado}º SEMESTRE
                      </span>
                    </h2>
                    <p className="text-emerald-100 text-xs mt-1 flex items-center gap-2">
                      <span>Turno: <strong className="uppercase font-bold text-white">{turnoSelecionado || "—"}</strong></span>
                      <span>•</span>
                      <span>{professoresDisponiveis.length} vínculo{professoresDisponiveis.length !== 1 ? "s" : ""} apto{professoresDisponiveis.length !== 1 ? "s" : ""}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAbrirPickerProf(false)}
                  className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all text-white z-10 cursor-pointer"
                  title="Fechar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Pesquisa e Filtros */}
              <div className="p-4 bg-slate-50 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar por professor ou disciplina…"
                    value={buscaProf}
                    onChange={(e) => setBuscaProf(e.target.value)}
                    className="w-full pl-11 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                  />
                  {buscaProf && (
                    <button
                      type="button"
                      onClick={() => setBuscaProf("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 font-semibold whitespace-nowrap bg-white px-3 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                  {professoresFiltrados.length} encontrado{professoresFiltrados.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Conteúdo / Lista de Professores Rolável */}
              <div className="overflow-y-auto flex-1 p-4 bg-slate-50/50">
                {carregandoProf ? (
                  <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Buscando professores vinculados…</span>
                  </div>
                ) : professoresParaAdicionar.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
                    <UserPlusIcon className="w-12 h-12 opacity-30 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-600">Nenhum professor encontrado</p>
                    <p className="text-xs text-gray-400 max-w-sm">
                      Verifique se os professores possuem vínculos cadastrados para o turno <b>{turnoSelecionado}</b> no <b>{semestreSelecionado}º Semestre</b>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {professoresParaAdicionar.map((p) => {
                      const jaEstaNaGrade = p.jaTem;
                      return (
                        <div
                          key={p.rowKey}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                            jaEstaNaGrade
                              ? "bg-slate-100/80 border-slate-200 opacity-70"
                              : "bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/20"
                          }`}
                        >
                          {/* Avatar + Nome + Disciplina */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                              jaEstaNaGrade ? "bg-slate-200 text-slate-500" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {(p.nome || "?").charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-800 uppercase truncate">
                                  {p.nome}
                                </span>
                                {p.semestre === 1 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">
                                    1º SEM
                                  </span>
                                )}
                                {p.semestre === 2 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    2º SEM
                                  </span>
                                )}
                                {p.semestre === 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    ANUAL
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                                  {p.disciplina_nome}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  • {p.aulas} aula{p.aulas !== 1 ? "s" : ""} semanal{p.aulas !== 1 ? "is" : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Botão de Ação */}
                          <div className="ml-4 flex-shrink-0">
                            {jaEstaNaGrade ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-xs font-bold border border-slate-300">
                                <CheckIcon className="w-4 h-4 text-emerald-600" /> Na Grade
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!turmasTurno.length && turnoSelecionado) {
                                    carregarTurmasDoTurno(turnoSelecionado);
                                  }
                                  if (rowKeysJaInseridos.has(p.rowKey)) return;
                                  setProfessoresTabela((prev) => [
                                    ...prev,
                                    {
                                      rowKey: p.rowKey,
                                      id: p.id,
                                      nome: p.nome,
                                      disciplina_id: p.disciplina_id,
                                      disciplina_nome: p.disciplina_nome,
                                      aulas: Number(aulasTotaisPorProfessor[`${p.id}|${p.disciplina_id}`] ?? aulasTotaisPorProfessor[p.id] ?? p.aulas ?? 0) || 0,
                                      turno: turnoSelecionado,
                                      semestre: semestreSelecionado,
                                    },
                                  ]);
                                  showToast("success", `${p.nome} (${p.disciplina_nome}) adicionado à grade!`, 2000);
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                              >
                                <UserPlusIcon className="w-4 h-4" /> + Adicionar à Grade
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-gray-500">
                  Dica: você pode adicionar múltiplos professores antes de fechar este modal.
                </span>
                <button
                  type="button"
                  onClick={() => setAbrirPickerProf(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
                >
                  Concluir e Voltar para a Grade
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Tabela principal */}
      {turnoSelecionado && (
        <div className="relative overflow-auto max-h-[calc(100vh-230px)] min-h-[380px] rounded-2xl border border-gray-200 shadow-md bg-white">
          {/* Aviso de turmas (quando nenhuma for encontrada) */}
          {turmasAviso && (
            <div className="px-3 py-2 text-sm text-amber-800 bg-amber-50 border-b border-amber-200">
              {turmasAviso}
            </div>
          )}

          {/* IMPORTANTE: table-fixed para respeitar larguras e evitar atravessamento */}
          <table className="min-w-[1400px] w-full border-separate border-spacing-0 table-fixed">

            <thead className="bg-gray-100 shadow-sm sticky top-0 z-40">
              <tr>
                {/* Professor (coluna 1) */}
                <th className="py-2 px-4 border text-blue-900 font-semibold text-center sticky top-0 left-0 z-50 bg-gray-100 w-[260px] border-b-2 border-b-blue-400">
                  Professor
                </th>

                {/* Disciplina (coluna 2) */}
                <th
                  className="py-2 px-4 border text-blue-900 font-semibold text-center sticky top-0 z-50 bg-gray-100 w-[160px] border-b-2 border-b-blue-400"
                  style={{ left: 260 }} // 260 = largura da 1ª coluna
                >
                  Disciplina
                </th>

                {/* Aulas (coluna 3) */}
                <th
                  className="py-2 px-4 border text-blue-900 font-semibold text-center sticky top-0 z-50 bg-gray-100 w-[100px] border-b-2 border-b-blue-400"
                  style={{ left: 260 + 160 }} // 420 = 260 + 160
                >
                  Aulas
                </th>

                {/* Colunas das turmas (1A…1T, 2A…2Q, etc.) */}
                {turmasTurno.map((turma) => {
                  const isSem = turma.regime === "semestral";
                  return (
                    <th
                      key={turma.id}
                      className={`p-1 border text-center sticky top-0 z-40 min-w-[44px] transition-colors select-none ${
                        isSem
                          ? "bg-purple-50 text-purple-950 border-purple-200 border-b-2 border-b-purple-500 hover:bg-purple-100/70"
                          : "bg-gray-100 text-blue-900 border-gray-200 border-b-2 border-b-blue-500 hover:bg-gray-200/70"
                      }`}
                      title={`${turma.nome} — ${isSem ? "Regime Semestral" : "Regime Anual"}`}
                    >
                      <div className="flex flex-col items-center justify-between h-28 py-1">
                        {/* Indicador de Regime moderno e compacto */}
                        {isSem ? (
                          <span
                            className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-purple-600 text-white shadow-xs tracking-wider uppercase leading-none whitespace-nowrap"
                            title="Regime Semestral"
                          >
                            SEM
                          </span>
                        ) : (
                          <span
                            className="text-[7.5px] font-black px-1.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs tracking-tight uppercase leading-none whitespace-nowrap"
                            title="Regime Anual"
                          >
                            ANUAL
                          </span>
                        )}

                        {/* Nome da turma na vertical (perfeitamente legível, sem cortes) */}
                        <div
                          className="mx-auto flex items-center justify-center whitespace-nowrap text-xs font-bold tracking-tight py-1"
                          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                        >
                          {turma.nome}
                        </div>
                      </div>
                    </th>
                  );
                })}

                {/* Ações (fica no mesmo cabeçalho, com largura fixa) */}
                <th className="py-2 px-4 border text-blue-900 font-semibold text-center sticky top-0 z-40 bg-gray-100 w-[150px] min-w-[150px] whitespace-nowrap border-b-2 border-b-blue-400">
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
                    resumoAulas[prof.rowKey] || {
                      total: Number(prof.aulas) || 0,
                      usadas: 0,
                      restante: Number(prof.aulas) || 0,
                    };

                  return (
                    <tr key={prof.rowKey}>
                      {/* Professor */}
                      <td className="py-2 px-4 border sticky left-0 z-20 bg-white w-[260px]">
                        {prof.nome}
                      </td>

                      {/* Disciplina */}
                      <td
                        className="py-2 px-4 border sticky z-20 bg-white w-[160px]"
                        style={{ left: 260 }}
                      >
                        {prof.disciplina_nome || "—"}
                      </td>

                      {/* Aulas (restante dinâmico com comunicabilidade FGB + Eletivas) */}
                      <td
                        className="py-2 px-4 border text-center sticky z-20 bg-white w-[110px]"
                        style={{ left: 260 + 160 }}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={
                              r.restante < 0
                                ? "text-red-600 font-bold"
                                : r.restante === 0
                                ? "text-amber-600 font-bold"
                                : "text-gray-900 font-semibold"
                            }
                            title={`Contrato: ${r.total} aulas | Regulares (FGB): ${r.usadasFgb ?? r.usadas} | Agrupamento (Eletivas/IFA): ${r.aulasAgr || 0} | Saldo: ${r.restante}`}
                          >
                            {r.restante}
                          </span>
                          {Number(r.aulasAgr) > 0 && (
                            <span
                              className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 mt-0.5 tracking-tight"
                              title={`${r.aulasAgr} aula(s) em Turmas de Agrupamento / Eletivas`}
                            >
                              +${r.aulasAgr} eletiva
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Turmas — checkboxes com lógica inteligente de carga */}
                      {turmasTurno.map((turma) => {
                        // ── NOVO: inclui discId na verificação para não confundir disciplinas ──
                        const isChecked = alocacoes.some(
                          (a) => a.profId === prof.id && a.turmaId === turma.id && a.discId === prof.disciplina_id
                        );
                        const cargaTurma =
                          cargaPorTurmaDisc[turma.id]?.[prof.disciplina_id] ??
                          Number(cargaPorDisciplina[prof.disciplina_id]) ??
                          1;
                        const restanteAtual = r.restante;
                        const semSaldo = !isChecked && restanteAtual < cargaTurma;
                        const tooltipBloqueio = semSaldo
                          ? restanteAtual <= 0
                            ? `${prof.nome} (${prof.disciplina_nome}) está 100% modulado`
                            : `Insuficiente: esta turma consome ${cargaTurma} aula(s), mas restam apenas ${restanteAtual}`
                          : `Total: ${r.total} • Usadas: ${r.usadas} • Restante: ${restanteAtual} • Esta turma: ${cargaTurma} aula(s)`;

                        return (
                          <td
                            key={turma.id}
                            className={`py-2 px-4 border transition-colors ${
                              turma.regime === "semestral" ? "bg-purple-50/20 hover:bg-purple-100/30" : "hover:bg-blue-50/20"
                            }`}
                          >
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                title={tooltipBloqueio}
                                checked={isChecked}
                                disabled={semSaldo}
                                style={semSaldo ? { cursor: "not-allowed", opacity: 0.35 } : {}}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (restanteAtual < cargaTurma) return;
                                    setAlocacoes((prev) => [
                                      ...prev,
                                      { profId: prof.id, turmaId: turma.id, discId: prof.disciplina_id, semestre: semestreSelecionado },
                                    ]);
                                  } else {
                                    setAlocacoes((prev) =>
                                      prev.filter(
                                        (a) => !(a.profId === prof.id && a.turmaId === turma.id && a.discId === prof.disciplina_id)
                                      )
                                    );
                                  }
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}

                      {/* Ações */}
                      <td className="py-2 px-4 border text-center w-[150px] min-w-[150px] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => abrirRemoverLinha(prof)}
                          className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                          title={`Remover ${prof.disciplina_nome} de ${prof.nome}`}
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



      {/* Modal Premium de confirmação de remoção */}
      {removerOpen && removerAlvo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setRemoverOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-rose-100 z-10">
            {/* Header com degradê rose */}
            <div className="bg-gradient-to-r from-rose-700 to-red-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
                  🗑️
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">
                    Remover Linha da Grade
                  </h3>
                  <p className="text-rose-100 text-xs mt-0.5">
                    {semestreSelecionado}º Semestre • Turno {turnoSelecionado}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRemoverOpen(false)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all text-white cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4">
                <p className="font-bold text-sm text-slate-800 uppercase mb-1">
                  {removerAlvo.nome}
                </p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                  {removerAlvo.disciplina_nome}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Isso excluirá <strong>todas as marcações</strong> deste professor nesta disciplina no <strong>{semestreSelecionado}º Semestre</strong>. O professor voltará a ficar disponível para inserção.
              </p>
            </div>

            {/* Rodapé */}
            <div className="p-4 bg-slate-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRemoverOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-white transition-all disabled:opacity-50 cursor-pointer"
                disabled={removendo}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRemocaoLinha}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all cursor-pointer"
                disabled={removendo}
                aria-busy={removendo}
              >
                {removendo ? "Removendo…" : "Sim, remover da Grade"}
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
