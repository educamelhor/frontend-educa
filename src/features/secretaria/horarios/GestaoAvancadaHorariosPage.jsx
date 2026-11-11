// src/features/secretaria/horarios/GestaoAvancadaHorariosPage.jsx
// ============================================================================
// ETAPA 4 — Gestão Avançada de Horários (Padrão Tier-1 / Superior ao Urânia)
// 1. Versionamento / Cenários A-B-C de Grade + Inspeção Visual + Restauração Segura
// 2. Painel Comparativo de Qualidade Pedagógica (Score 0–100 em 8 Dimensões + Docente a Docente)
// 3. Substituição Atômica de Professores com Preservação Integral de Diários + Reversão 1-Clique
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../services/api";
import BadgeVigenciaHorario, { resolverVigenciaFrontend } from "./BadgeVigenciaHorario";
import GradeTurma from "./GradeTurma";
import GradeProfessor from "./GradeProfessor";

const DIAS_CURTO = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

const MOTIVOS_SUBSTITUICAO = [
  { value: "LICENCA_MEDICA", label: "🏥 Licença Médica / Tratamento de Saúde" },
  { value: "LICENCA_MATERNIDADE", label: "👶 Licença Maternidade / Paternidade" },
  { value: "AFASTAMENTO_LEGAL", label: "📑 Afastamento Legal / Cessão / Abono" },
  { value: "SUBSTITUICAO_TEMPORARIA", label: "🔄 Substituição Temporária (Contrato)" },
  { value: "TROCA_DEFINITIVA", label: "📌 Troca Definitiva de Titularidade / Remanejamento" },
];

const MOTIVO_LABELS_MAP = Object.fromEntries(MOTIVOS_SUBSTITUICAO.map((m) => [m.value, m.label]));

function corScore(score) {
  const n = Number(score) || 0;
  if (n >= 92) return { cor: "#15803d", bg: "#dcfce7", border: "#86efac", label: "EXCELENTE" };
  if (n >= 80) return { cor: "#0369a1", bg: "#e0f2fe", border: "#7dd3fc", label: "ÓTIMO" };
  if (n >= 65) return { cor: "#b45309", bg: "#fef3c7", border: "#fcd34d", label: "BOM" };
  return { cor: "#b91c1c", bg: "#fee2e2", border: "#fca5a5", label: "ATENÇÃO" };
}

function formatarDataHora(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function formatarDataSimples(ymd) {
  if (!ymd) return "—";
  const parts = String(ymd).slice(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return String(ymd);
}

// Calcula percentual de diferença estrutural entre dois conjuntos de slots (célula a célula)
function calcularDiferencaEstrutural(slotsBase = [], slotsComp = []) {
  const mapBase = new Map();
  for (const s of slotsBase || []) {
    const dia = Number(s.dia ?? s.dia_semana);
    const ord = Number(s.ordem ?? s.periodo_ordem);
    mapBase.set(`${Number(s.turma_id)}|${dia}|${ord}`, `${Number(s.disciplina_id)}|${Number(s.professor_id)}`);
  }
  const mapComp = new Map();
  for (const s of slotsComp || []) {
    const dia = Number(s.dia ?? s.dia_semana);
    const ord = Number(s.ordem ?? s.periodo_ordem);
    mapComp.set(`${Number(s.turma_id)}|${dia}|${ord}`, `${Number(s.disciplina_id)}|${Number(s.professor_id)}`);
  }
  const chaves = new Set([...mapBase.keys(), ...mapComp.keys()]);
  if (chaves.size === 0) return { diferentes: 0, total: 0, pct: 0 };
  let diferentes = 0;
  for (const k of chaves) {
    if (mapBase.get(k) !== mapComp.get(k)) diferentes++;
  }
  return {
    diferentes,
    total: chaves.size,
    pct: Math.round((diferentes / chaves.size) * 1000) / 10,
  };
}

// Reconstrói grade_por_turma e grade_por_professor para o modal de inspeção visual
function montarResultadoParaInspecao(slots = []) {
  const gradePorTurma = {};
  const gradePorProfessor = {};
  for (const s of slots || []) {
    const tId = Number(s.turma_id);
    const dia = Number(s.dia ?? s.dia_semana);
    const ord = Number(s.ordem ?? s.periodo_ordem);
    const dId = Number(s.disciplina_id);
    const pId = Number(s.professor_id);
    if (!tId || !dia || !ord || !dId || !pId) continue;

    if (!gradePorTurma[tId]) gradePorTurma[tId] = {};
    if (!gradePorTurma[tId][dia]) gradePorTurma[tId][dia] = {};
    gradePorTurma[tId][dia][ord] = {
      disciplina_id: dId,
      professor_id: pId,
      locked: Boolean(s.locked),
      origem: s.origem || (s.locked ? "manual" : "solver"),
    };

    if (!gradePorProfessor[pId]) gradePorProfessor[pId] = {};
    if (!gradePorProfessor[pId][dia]) gradePorProfessor[pId][dia] = {};
    const prev = gradePorProfessor[pId][dia][ord];
    if (prev && Number(prev.turma_id) !== tId) {
      const prevIds = Array.isArray(prev.turmas_ids) ? prev.turmas_ids : [Number(prev.turma_id)];
      if (!prevIds.includes(tId)) prevIds.push(tId);
      gradePorProfessor[pId][dia][ord] = {
        ...prev,
        turmas_ids: prevIds,
        super_aula: true,
      };
    } else {
      gradePorProfessor[pId][dia][ord] = {
        turma_id: tId,
        disciplina_id: dId,
        locked: Boolean(s.locked),
        origem: s.origem || (s.locked ? "manual" : "solver"),
      };
    }
  }
  return { grade_por_turma: gradePorTurma, grade_por_professor: gradePorProfessor };
}

function buildPeriodosSimples(diasSemana = [1, 2, 3, 4, 5], periodosPorDia = 6) {
  const out = {};
  for (const d of diasSemana) {
    out[d] = [];
    for (let o = 1; o <= periodosPorDia; o++) {
      out[d].push({ ordem: o, inicio: null, fim: null });
    }
  }
  return out;
}

export default function GestaoAvancadaHorariosPage({
  config,
  turnoInicial,
  subAbaInicial = "comparar",
  onIrParaGerar,
}) {
  const turnos = config?.turnos || ["matutino", "vespertino"];
  const vigencia = resolverVigenciaFrontend(config);

  const [turno, setTurno] = useState(turnoInicial || turnos[0] || "matutino");
  const [subAba, setSubAba] = useState(subAbaInicial || "comparar"); // "comparar" | "substituicao" | "historico"

  useEffect(() => {
    if (subAbaInicial) setSubAba(subAbaInicial);
  }, [subAbaInicial]);

  useEffect(() => {
    if (turnoInicial && turnos.includes(turnoInicial)) {
      setTurno(turnoInicial);
    }
  }, [turnoInicial]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dados carregados da API ETAPA 4
  const [carregando, setCarregando] = useState(false);
  const [ativos, setAtivos] = useState({ rascunho: null, publicado: null });
  const [cenarios, setCenarios] = useState([]);
  const [catalogo, setCatalogo] = useState({
    turmas: [],
    professores: [],
    disciplinas: [],
    dias_semana: [1, 2, 3, 4, 5],
    periodos_por_dia: 6,
  });
  const [historicoSubstituicoes, setHistoricoSubstituicoes] = useState([]);

  // Feedback global
  const [feedback, setFeedback] = useState(null); // { tipo: 'ok' | 'erro', texto: '' }
  const mostrarFeedback = useCallback((tipo, texto) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 6500);
  }, []);

  // Comparador Lado a Lado (até 3 IDs selecionados)
  const [selecionadosComparacao, setSelecionadosComparacao] = useState([]);
  const [buscaDocenteComp, setBuscaDocenteComp] = useState("");
  const [apenasDiferencasDocente, setApenasDiferencasDocente] = useState(false);

  // Modal Salvar Cenário
  const [modalSalvar, setModalSalvar] = useState(null); // { codigo_cenario, nome, descricao, origem_dados, favorito }
  const [salvandoCenario, setSalvandoCenario] = useState(false);
  const [aplicandoId, setAplicandoId] = useState(null);

  // Modal Inspecionar Grade Visualmente
  const [cenarioInspecao, setCenarioInspecao] = useState(null);
  const [modoInspecao, setModoInspecao] = useState("turma"); // "turma" | "professor"

  // Estados — Substituição de Professores
  const [titularId, setTitularId] = useState("");
  const [substitutoId, setSubstitutoId] = useState("");
  const [motivoSub, setMotivoSub] = useState("LICENCA_MEDICA");
  const [dataInicioSub, setDataInicioSub] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataFimPrevistaSub, setDataFimPrevistaSub] = useState("");
  const [observacaoSub, setObservacaoSub] = useState("");
  const [sincronizarModulacao, setSincronizarModulacao] = useState(true);
  const [manterFixacoes, setManterFixacoes] = useState(true);
  const [pularColisoes, setPularColisoes] = useState(false);
  const [inativarTitular, setInativarTitular] = useState(false);
  const [turmasFiltroIds, setTurmasFiltroIds] = useState([]); // vazio = todas as turmas do titular no turno

  const [simulandoSub, setSimulandoSub] = useState(false);
  const [simulacaoSub, setSimulacaoSub] = useState(null);
  const [erroSimulacao, setErroSimulacao] = useState("");
  const [executandoSub, setExecutandoSub] = useState(false);

  // Modal Reverter Substituição (Retorno do Titular)
  const [modalReverter, setModalReverter] = useState(null); // registro de substituição
  const [dataRetornoEfetivo, setDataRetornoEfetivo] = useState(() => new Date().toISOString().slice(0, 10));
  const [obsRetorno, setObsRetorno] = useState("");
  const [revertendoSub, setRevertendoSub] = useState(false);

  // ── Carregamento unificado do Turno ───────────────────────────
  const carregarDadosTurno = useCallback(async () => {
    setCarregando(true);
    try {
      const [resCen, resSub] = await Promise.all([
        api.get("/api/grade/cenarios", {
          params: { turno: turno.toLowerCase(), semestre: vigencia.semestre_atual },
        }),
        api.get("/api/grade/substituicoes", {
          params: { turno: turno.toLowerCase() },
        }),
      ]);

      const novosAtivos = resCen.data?.ativos || { rascunho: null, publicado: null };
      const novosCenarios = Array.isArray(resCen.data?.cenarios) ? resCen.data.cenarios : [];
      setAtivos(novosAtivos);
      setCenarios(novosCenarios);
      if (resCen.data?.catalogo) {
        setCatalogo(resCen.data.catalogo);
      }
      setHistoricoSubstituicoes(Array.isArray(resSub.data?.historico) ? resSub.data.historico : []);

      // Pré-seleciona automaticamente até 3 itens relevantes para comparação imediata
      setSelecionadosComparacao((prev) => {
        const todosIdsValidos = new Set([
          ...(novosAtivos.publicado ? ["ATIVO_PUBLICADO"] : []),
          ...(novosAtivos.rascunho ? ["ATIVO_RASCUNHO"] : []),
          ...novosCenarios.map((c) => String(c.id)),
        ]);
        const mantidos = prev.filter((id) => todosIdsValidos.has(String(id)));
        if (mantidos.length >= 2) return mantidos.slice(0, 3);

        const auto = [];
        if (novosAtivos.publicado) auto.push("ATIVO_PUBLICADO");
        if (novosAtivos.rascunho) auto.push("ATIVO_RASCUNHO");
        for (const c of novosCenarios.filter((x) => x.tipo === "CENARIO")) {
          if (auto.length >= 3) break;
          if (!auto.includes(String(c.id))) auto.push(String(c.id));
        }
        for (const c of novosCenarios) {
          if (auto.length >= 2) break;
          if (!auto.includes(String(c.id))) auto.push(String(c.id));
        }
        return auto.slice(0, 3);
      });
    } catch (err) {
      mostrarFeedback("erro", err?.response?.data?.error || "Não foi possível carregar os cenários do turno.");
    } finally {
      setCarregando(false);
    }
  }, [turno, vigencia.semestre_atual, mostrarFeedback]);

  useEffect(() => {
    carregarDadosTurno();
    setSimulacaoSub(null);
    setErroSimulacao("");
    setTurmasFiltroIds([]);
  }, [carregarDadosTurno]);

  // ── Mapas de catálogo para GradeTurma / GradeProfessor ────────
  const mapsCatalogo = useMemo(() => {
    const disciplinaById = {};
    for (const d of catalogo.disciplinas || []) {
      disciplinaById[d.id] = d;
    }
    const professorById = {};
    for (const p of catalogo.professores || []) {
      professorById[p.id] = p;
    }
    const turmaById = {};
    for (const t of catalogo.turmas || []) {
      turmaById[t.id] = { ...t, turma: t.nome || t.turma };
    }
    return { disciplinaById, professorById, turmaById };
  }, [catalogo]);

  // ── Lista unificada de itens comparáveis ──────────────────────
  const itensComparaveis = useMemo(() => {
    const lista = [];
    if (ativos.publicado) lista.push({ ...ativos.publicado, keyId: "ATIVO_PUBLICADO" });
    if (ativos.rascunho) lista.push({ ...ativos.rascunho, keyId: "ATIVO_RASCUNHO" });
    for (const c of cenarios) {
      lista.push({ ...c, keyId: String(c.id) });
    }
    return lista;
  }, [ativos, cenarios]);

  const colunasComparadas = useMemo(() => {
    const byKey = new Map(itensComparaveis.map((i) => [String(i.keyId), i]));
    return selecionadosComparacao.map((k) => byKey.get(String(k))).filter(Boolean);
  }, [itensComparaveis, selecionadosComparacao]);

  const cenariosNomeados = useMemo(
    () => cenarios.filter((c) => c.tipo === "CENARIO"),
    [cenarios]
  );

  const cenariosHistorico = useMemo(
    () => cenarios.filter((c) => c.tipo === "PUBLICACAO" || c.tipo === "BACKUP_AUTO"),
    [cenarios]
  );

  const slotPorLetra = useMemo(() => {
    const out = { A: null, B: null, C: null };
    for (const c of cenariosNomeados) {
      const cod = String(c.codigo_cenario || "").toUpperCase();
      if (["A", "B", "C"].includes(cod) && !out[cod]) {
        out[cod] = c;
      }
    }
    return out;
  }, [cenariosNomeados]);

  // ── Alternar item na matriz de comparação (máx 3 colunas) ─────
  function toggleComparacao(keyId) {
    const k = String(keyId);
    setSelecionadosComparacao((prev) => {
      if (prev.includes(k)) {
        return prev.filter((x) => x !== k);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), k];
      }
      return [...prev, k];
    });
  }

  // ── Abrir modal para salvar em Cenário A, B, C ou Custom ──────
  function abrirModalSalvarCenario(codigo = "A") {
    const origemPadrao = ativos.rascunho ? "rascunho" : ativos.publicado ? "publicado" : "rascunho";
    const existente = ["A", "B", "C"].includes(codigo) ? slotPorLetra[codigo] : null;
    setModalSalvar({
      codigo_cenario: codigo,
      nome:
        existente?.nome ||
        (["A", "B", "C"].includes(codigo)
          ? `Cenário ${codigo} — ${turno.charAt(0).toUpperCase() + turno.slice(1)}`
          : ` Proposta Alternativa (${new Date().toLocaleDateString("pt-BR")})`.trim()),
      descricao: existente?.descricao || "",
      origem_dados: origemPadrao,
      favorito: Boolean(existente?.favorito),
    });
  }

  async function confirmarSalvarCenario(e) {
    e?.preventDefault?.();
    if (!modalSalvar) return;
    setSalvandoCenario(true);
    try {
      const { data } = await api.post("/api/grade/cenarios", {
        turno: turno.toLowerCase(),
        semestre: vigencia.semestre_atual,
        codigo_cenario: modalSalvar.codigo_cenario === "CUSTOM" ? null : modalSalvar.codigo_cenario,
        nome: modalSalvar.nome,
        descricao: modalSalvar.descricao || null,
        origem_dados: modalSalvar.origem_dados,
        favorito: Boolean(modalSalvar.favorito),
        sobrescrever_codigo: true,
      });
      setModalSalvar(null);
      mostrarFeedback(
        "ok",
        `✅ "${data.nome}" salvo com Score Pedagógico ${data.score_qualidade}/100!`
      );
      await carregarDadosTurno();
      if (data?.cenario_id) {
        setSelecionadosComparacao((prev) => {
          const idStr = String(data.cenario_id);
          if (prev.includes(idStr)) return prev;
          return prev.length >= 3 ? [...prev.slice(0, 2), idStr] : [...prev, idStr];
        });
      }
    } catch (err) {
      mostrarFeedback("erro", err?.response?.data?.error || "Erro ao salvar cenário.");
    } finally {
      setSalvandoCenario(false);
    }
  }

  async function handleToggleFavorito(cenario) {
    try {
      await api.put(`/api/grade/cenarios/${cenario.id}`, {
        favorito: !cenario.favorito,
      });
      await carregarDadosTurno();
    } catch (err) {
      mostrarFeedback("erro", err?.response?.data?.error || "Falha ao atualizar favorito.");
    }
  }

  async function handleExcluirCenario(cenario) {
    if (!window.confirm(`Deseja realmente excluir "${cenario.nome}"?`)) return;
    try {
      await api.delete(`/api/grade/cenarios/${cenario.id}`);
      mostrarFeedback("ok", `🗑️ Cenário "${cenario.nome}" removido.`);
      await carregarDadosTurno();
    } catch (err) {
      mostrarFeedback("erro", err?.response?.data?.error || "Falha ao excluir cenário.");
    }
  }

  async function handleAplicarCenario(cenario, publicarDireto = false, abrirEditor = false) {
    const msgConfirm = publicarDireto
      ? `Deseja restaurar "${cenario.nome}" e PUBLICAR IMEDIATAMENTE como o horário oficial do turno ${turno.toUpperCase()}?\n\n(A versão publicada anterior será arquivada automaticamente no histórico de versões).`
      : `Deseja carregar "${cenario.nome}" no Rascunho do turno ${turno.toUpperCase()}?\n\n(Um backup automático de segurança do rascunho atual será salvo antes da substituição).`;

    if (!window.confirm(msgConfirm)) return;

    setAplicandoId(cenario.id);
    try {
      const { data } = await api.post(`/api/grade/cenarios/${cenario.id}/aplicar`, {
        publicar_direto: publicarDireto,
      });
      mostrarFeedback("ok", `✅ ${data.message || "Cenário aplicado com sucesso!"}`);
      await carregarDadosTurno();
      if (abrirEditor && typeof onIrParaGerar === "function") {
        onIrParaGerar(turno);
      }
    } catch (err) {
      mostrarFeedback("erro", err?.response?.data?.error || "Falha ao aplicar cenário.");
    } finally {
      setAplicandoId(null);
    }
  }

  // ── Simulação Automática de Substituição Docente ──────────────
  const executarSimulacaoSubstituicao = useCallback(
    async (filtroTurmasOverride = null) => {
      if (!titularId || !substitutoId) {
        setSimulacaoSub(null);
        setErroSimulacao("");
        return;
      }
      if (Number(titularId) === Number(substitutoId)) {
        setSimulacaoSub(null);
        setErroSimulacao("Selecione um professor substituto diferente do professor titular.");
        return;
      }

      setSimulandoSub(true);
      setErroSimulacao("");
      try {
        const listaFiltro = filtroTurmasOverride !== null ? filtroTurmasOverride : turmasFiltroIds;
        const { data } = await api.post("/api/grade/substituicoes/simular", {
          turno: turno.toLowerCase(),
          semestre: vigencia.semestre_atual,
          professor_titular_id: Number(titularId),
          professor_substituto_id: Number(substitutoId),
          turma_ids_filtro: listaFiltro.length > 0 ? listaFiltro : null,
        });
        setSimulacaoSub(data);
      } catch (err) {
        setSimulacaoSub(null);
        setErroSimulacao(err?.response?.data?.error || "Erro ao simular impacto da substituição.");
      } finally {
        setSimulandoSub(false);
      }
    },
    [titularId, substitutoId, turno, vigencia.semestre_atual, turmasFiltroIds]
  );

  useEffect(() => {
    if (subAba === "substituicao" && titularId && substitutoId) {
      executarSimulacaoSubstituicao();
    } else if (!titularId || !substitutoId) {
      setSimulacaoSub(null);
    }
  }, [subAba, titularId, substitutoId, executarSimulacaoSubstituicao]);

  function toggleTurmaFiltroSubstituicao(tId) {
    const numId = Number(tId);
    setTurmasFiltroIds((prev) => {
      const next = prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId];
      return next;
    });
  }

  async function handleConfirmarSubstituicao(e) {
    e?.preventDefault?.();
    if (!simulacaoSub) return;

    const temColisao = (simulacaoSub.validacoes?.colisoes_mesmo_turno?.length || 0) > 0;
    if (temColisao && !pularColisoes) {
      mostrarFeedback(
        "erro",
        "Há choque de horário no mesmo turno para o substituto. Marque a opção de preservar/pular os horários em choque ou ajuste a grade primeiro."
      );
      return;
    }

    const textoConf = `Confirmar a substituição de ${simulacaoSub.titular?.nome} por ${simulacaoSub.substituto?.nome} no turno ${turno.toUpperCase()}?\n\n• ${simulacaoSub.resumo_impacto?.slots_grade_visiveis || 0} horário(s) na grade serão transferidos\n• ${simulacaoSub.resumo_impacto?.planos_diario_preservados || 0} plano(s)/diário(s) e ${simulacaoSub.resumo_impacto?.registros_notas_preservados || 0} nota(s) serão 100% preservados.`;
    if (!window.confirm(textoConf)) return;

    setExecutandoSub(true);
    try {
      const { data } = await api.post("/api/grade/substituicoes/executar", {
        turno: turno.toLowerCase(),
        semestre: vigencia.semestre_atual,
        professor_titular_id: Number(titularId),
        professor_substituto_id: Number(substitutoId),
        turma_ids_filtro: turmasFiltroIds.length > 0 ? turmasFiltroIds : null,
        motivo: motivoSub,
        observacao: observacaoSub || null,
        data_inicio: dataInicioSub || null,
        data_fim_prevista: dataFimPrevistaSub || null,
        sincronizar_modulacao: sincronizarModulacao,
        manter_fixacoes: manterFixacoes,
        pular_slots_em_colisao: pularColisoes,
        inativar_titular: motivoSub === "TROCA_DEFINITIVA" ? inativarTitular : false,
      });

      mostrarFeedback("ok", `✅ ${data.message}`);
      setTitularId("");
      setSubstitutoId("");
      setObservacaoSub("");
      setDataFimPrevistaSub("");
      setTurmasFiltroIds([]);
      setPularColisoes(false);
      setInativarTitular(false);
      setSimulacaoSub(null);
      await carregarDadosTurno();
    } catch (err) {
      mostrarFeedback("erro", err?.response?.data?.error || "Falha ao executar substituição docente.");
    } finally {
      setExecutandoSub(false);
    }
  }

  async function handleConfirmarReversao(e) {
    e?.preventDefault?.();
    if (!modalReverter) return;
    setRevertendoSub(true);
    try {
      const { data } = await api.post(`/api/grade/substituicoes/${modalReverter.id}/reverter`, {
        data_retorno_efetivo: dataRetornoEfetivo || null,
        observacao_retorno: obsRetorno || null,
      });
      mostrarFeedback("ok", `✅ ${data.message}`);
      setModalReverter(null);
      setObsRetorno("");
      await carregarDadosTurno();
    } catch (err) {
      mostrarFeedback("erro", err?.response?.data?.error || "Falha ao registrar retorno do titular.");
    } finally {
      setRevertendoSub(false);
    }
  }

  // ── Tabela Comparativa Docente a Docente ──────────────────────
  const comparativoDocentes = useMemo(() => {
    if (colunasComparadas.length === 0) return [];
    const profMap = new Map();

    colunasComparadas.forEach((col, colIdx) => {
      const lista = col.metricas?.ergonomia_por_professor || [];
      for (const p of lista) {
        const pId = Number(p.professor_id);
        if (!profMap.has(pId)) {
          profMap.set(pId, {
            professor_id: pId,
            professor_nome: p.professor_nome || `Prof. ${pId}`,
            porColuna: Array(colunasComparadas.length).fill(null),
          });
        }
        profMap.get(pId).porColuna[colIdx] = p;
      }
    });

    let rows = Array.from(profMap.values());
    if (buscaDocenteComp.trim()) {
      const termo = buscaDocenteComp.trim().toLowerCase();
      rows = rows.filter((r) => r.professor_nome.toLowerCase().includes(termo));
    }
    if (apenasDiferencasDocente && colunasComparadas.length >= 2) {
      rows = rows.filter((r) => {
        const ref = r.porColuna[0];
        return r.porColuna.slice(1).some(
          (c) =>
            (c?.janelas ?? -1) !== (ref?.janelas ?? -1) ||
            (c?.dias_ativos ?? -1) !== (ref?.dias_ativos ?? -1) ||
            (c?.aulas_isoladas_dia ?? -1) !== (ref?.aulas_isoladas_dia ?? -1) ||
            (c?.aulas_fisicas ?? -1) !== (ref?.aulas_fisicas ?? -1)
        );
      });
    }

    rows.sort((a, b) => {
      const maxJanA = Math.max(...a.porColuna.map((c) => c?.janelas || 0));
      const maxJanB = Math.max(...b.porColuna.map((c) => c?.janelas || 0));
      if (maxJanB !== maxJanA) return maxJanB - maxJanA;
      return a.professor_nome.localeCompare(b.professor_nome, "pt-BR");
    });
    return rows;
  }, [colunasComparadas, buscaDocenteComp, apenasDiferencasDocente]);

  // Identifica a coluna vencedora em Score Global
  const maiorScoreComparado = useMemo(() => {
    if (colunasComparadas.length < 2) return null;
    return Math.max(...colunasComparadas.map((c) => Number(c.score_qualidade || c.metricas?.score_global || 0)));
  }, [colunasComparadas]);

  // Resultado reconstruído caso o modal de inspeção esteja aberto
  const dadosInspecao = useMemo(() => {
    if (!cenarioInspecao) return null;
    const resultado = montarResultadoParaInspecao(cenarioInspecao.slots || []);
    const periodosPorDia = buildPeriodosSimples(
      catalogo.dias_semana || [1, 2, 3, 4, 5],
      catalogo.periodos_por_dia || (turno === "noturno" ? 5 : 6)
    );
    const profIdsAtivos = new Set(Object.keys(resultado.grade_por_professor || {}).map(Number));
    const professoresComAula = (catalogo.professores || []).filter((p) => profIdsAtivos.has(Number(p.id)));
    return { resultado, periodosPorDia, professoresComAula };
  }, [cenarioInspecao, catalogo, turno]);

  const ativasSubstituicoesCount = useMemo(
    () => historicoSubstituicoes.filter((h) => h.status === "ATIVA").length,
    [historicoSubstituicoes]
  );

  return (
    <div
      style={{
        fontFamily: "'Montserrat', sans-serif",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        background: "#f8fafc",
        overflowY: "auto",
      }}
    >
      {/* ── Cabeçalho Executivo da Etapa 4 ──────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22 }}>🗂️</span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
              Cenários A-B-C, Qualidade Pedagógica & Substituições
            </h2>
            <BadgeVigenciaHorario config={config} variant="inline" showSubtext={false} />
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            Simule alternativas de grade sem sobrescrever o horário oficial, compare ergonomia docente e substitua professores preservando 100% dos diários.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Seletor de Turno */}
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #cbd5e1" }}>
            {turnos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTurno(t)}
                style={{
                  padding: "8px 15px",
                  border: "none",
                  cursor: "pointer",
                  background: turno === t ? "#1e40af" : "#fff",
                  color: turno === t ? "#fff" : "#475569",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={carregarDadosTurno}
            disabled={carregando}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              fontWeight: 700,
              fontSize: 12,
              cursor: carregando ? "wait" : "pointer",
            }}
          >
            {carregando ? "⏳ Atualizando…" : "🔄 Atualizar"}
          </button>
        </div>
      </div>

      {/* ── Sub-navegação interna (3 Pilares da Etapa 4) ────────── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 24px",
          background: "#f1f5f9",
          borderBottom: "1px solid #e2e8f0",
          flexWrap: "wrap",
        }}
      >
        {[
          {
            id: "comparar",
            label: "⚖️ Cenários A-B-C & Qualidade Pedagógica",
            badge: cenariosNomeados.length,
          },
          {
            id: "substituicao",
            label: "🔄 Substituição de Professores (Diário Preservado)",
            badge: ativasSubstituicoesCount > 0 ? `${ativasSubstituicoesCount} ativa(s)` : null,
          },
          {
            id: "historico",
            label: "📜 Linha do Tempo & Backups Automáticos",
            badge: cenariosHistorico.length,
          },
        ].map((tab) => {
          const ativa = subAba === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubAba(tab.id)}
              style={{
                padding: "9px 16px",
                borderRadius: 9,
                border: ativa ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                background: ativa ? "#eff6ff" : "#fff",
                color: ativa ? "#1d4ed8" : "#475569",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: ativa ? "0 2px 6px rgba(37,99,235,0.12)" : "none",
              }}
            >
              <span>{tab.label}</span>
              {tab.badge !== null && tab.badge !== undefined && tab.badge !== 0 && (
                <span
                  style={{
                    background: ativa ? "#2563eb" : "#e2e8f0",
                    color: ativa ? "#fff" : "#334155",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 10.5,
                    fontWeight: 800,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Banner de Feedback ──────────────────────────────────── */}
      {feedback && (
        <div
          style={{
            margin: "14px 24px 0",
            padding: "12px 16px",
            borderRadius: 10,
            background: feedback.tipo === "ok" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${feedback.tipo === "ok" ? "#86efac" : "#fecaca"}`,
            color: feedback.tipo === "ok" ? "#15803d" : "#b91c1c",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.texto}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 800, color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ====================================================================
          SUB-ABA 1: CENÁRIOS A-B-C & PAINEL COMPARATIVO DE QUALIDADE PEDAGÓGICA
          ==================================================================== */}
      {subAba === "comparar" && (
        <div style={{ padding: "20px 24px 36px", display: "flex", flexDirection: "column", gap: 22 }}>
          {/* 1.1 Cofre Rápido de Cenários A / B / C */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                  🗂️ Cofre de Cenários do Turno ({turno.toUpperCase()})
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                  Guarde até 3 propostas principais (A, B, C) ou cenários extras para apresentar à direção e ativar com 1 clique.
                </p>
              </div>
              <button
                type="button"
                onClick={() => abrirModalSalvarCenario("CUSTOM")}
                disabled={!ativos.rascunho && !ativos.publicado}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #2563eb",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: !ativos.rascunho && !ativos.publicado ? "not-allowed" : "pointer",
                }}
              >
                ➕ Salvar Cenário Extra
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(275px, 1fr))",
                gap: 14,
              }}
            >
              {["A", "B", "C"].map((letra) => {
                const cen = slotPorLetra[letra];
                const badge = cen ? corScore(cen.score_qualidade) : null;
                const estaComparando = cen ? selecionadosComparacao.includes(String(cen.id)) : false;

                const paletaLetra = {
                  A: { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
                  B: { bg: "#f5f3ff", text: "#6d28d9", border: "#c4b5fd" },
                  C: { bg: "#ecfdf5", text: "#047857", border: "#6ee7b7" },
                }[letra];

                return (
                  <div
                    key={letra}
                    style={{
                      border: cen ? `1.5px solid ${estaComparando ? "#2563eb" : "#cbd5e1"}` : "1.5px dashed #cbd5e1",
                      borderRadius: 12,
                      padding: 15,
                      background: cen ? "#fff" : "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span
                          style={{
                            background: paletaLetra.bg,
                            color: paletaLetra.text,
                            border: `1px solid ${paletaLetra.border}`,
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          CENÁRIO {letra}
                        </span>

                        {cen && badge && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleToggleFavorito(cen)}
                              title="Destacar cenário favorito para a direção"
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 16,
                                lineHeight: 1,
                              }}
                            >
                              {cen.favorito ? "⭐" : "☆"}
                            </button>
                            <span
                              style={{
                                background: badge.bg,
                                color: badge.cor,
                                border: `1px solid ${badge.border}`,
                                borderRadius: 999,
                                padding: "2px 9px",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {cen.score_qualidade}/100 • {badge.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {cen ? (
                        <>
                          <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginTop: 10 }}>
                            {cen.nome}
                          </div>
                          {cen.descricao && (
                            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>{cen.descricao}</div>
                          )}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 6,
                              marginTop: 10,
                              padding: "8px 10px",
                              borderRadius: 8,
                              background: "#f8fafc",
                              fontSize: 11,
                            }}
                          >
                            <div>
                              <div style={{ color: "#64748b" }}>Cobertura</div>
                              <strong style={{ color: "#0f172a" }}>{cen.metricas?.cobertura_pct ?? 100}%</strong>
                            </div>
                            <div>
                              <div style={{ color: "#64748b" }}>Janelas Doc.</div>
                              <strong
                                style={{
                                  color: (cen.metricas?.janelas_professores || 0) === 0 ? "#15803d" : "#b45309",
                                }}
                              >
                                {cen.metricas?.janelas_professores ?? 0}
                              </strong>
                            </div>
                            <div>
                              <div style={{ color: "#64748b" }}>Duplas Gem.</div>
                              <strong style={{ color: "#1e40af" }}>{cen.metricas?.pares_geminados ?? 0}</strong>
                            </div>
                          </div>
                          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 6 }}>
                            Salvo em {formatarDataHora(cen.updated_at || cen.created_at)}
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: "18px 4px", color: "#64748b", fontSize: 12 }}>
                          Espaço livre para gravar uma variação da grade (ex.: menor índice de janelas ou configuração alternativa de geminação).
                        </div>
                      )}
                    </div>

                    {cen ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => toggleComparacao(cen.id)}
                          style={{
                            flex: 1,
                            padding: "6px 9px",
                            borderRadius: 7,
                            border: `1px solid ${estaComparando ? "#2563eb" : "#cbd5e1"}`,
                            background: estaComparando ? "#dbeafe" : "#fff",
                            color: estaComparando ? "#1e40af" : "#334155",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {estaComparando ? "✓ Comparando" : "⚖️ Comparar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCenarioInspecao(cen)}
                          style={{
                            padding: "6px 9px",
                            borderRadius: 7,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#334155",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Inspecionar grade completa por turma ou professor"
                        >
                          👁️ Grade
                        </button>
                        <button
                          type="button"
                          disabled={aplicandoId === cen.id}
                          onClick={() => handleAplicarCenario(cen, false, true)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 7,
                            border: "1px solid #0284c7",
                            background: "#f0f9ff",
                            color: "#0369a1",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Carrega este cenário no Rascunho (fazendo backup automático antes) e abre no editor"
                        >
                          📥 Usar no Rascunho
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModalSalvarCenario(letra)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 7,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#475569",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Atualizar/Sobrescrever este slot com a grade atual"
                        >
                          💾 Atualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluirCenario(cen)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 7,
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#dc2626",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Excluir este cenário"
                        >
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!ativos.rascunho && !ativos.publicado}
                        onClick={() => abrirModalSalvarCenario(letra)}
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: 8,
                          border: `1px solid ${paletaLetra.border}`,
                          background: paletaLetra.bg,
                          color: paletaLetra.text,
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: !ativos.rascunho && !ativos.publicado ? "not-allowed" : "pointer",
                          opacity: !ativos.rascunho && !ativos.publicado ? 0.55 : 1,
                        }}
                      >
                        💾 Salvar Grade Atual no Cenário {letra}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cenários customizados adicionais (além de A, B, C) */}
            {cenariosNomeados.filter((c) => !["A", "B", "C"].includes(String(c.codigo_cenario || "").toUpperCase()))
              .length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                  Outros Cenários Salvos:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {cenariosNomeados
                    .filter((c) => !["A", "B", "C"].includes(String(c.codigo_cenario || "").toUpperCase()))
                    .map((c) => {
                      const sel = selecionadosComparacao.includes(String(c.id));
                      return (
                        <div
                          key={c.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: `1px solid ${sel ? "#2563eb" : "#cbd5e1"}`,
                            background: sel ? "#eff6ff" : "#f8fafc",
                            fontSize: 12,
                          }}
                        >
                          <strong style={{ color: "#0f172a" }}>{c.nome}</strong>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8" }}>
                            ({c.score_qualidade}/100)
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleComparacao(c.id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#2563eb",
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            {sel ? "✓ Na matriz" : "+ Comparar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCenarioInspecao(c)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12 }}
                            title="Inspecionar grade"
                          >
                            👁️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAplicarCenario(c, false, true)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12 }}
                            title="Carregar no rascunho"
                          >
                            📥
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluirCenario(c)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12 }}
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* 1.2 Seletor de Grades para o Painel Comparativo de Qualidade Pedagógica */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                  ⚖️ Painel Comparativo de Qualidade Pedagógica & Ergonomia Docente
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                  Selecione de 1 a 3 horários abaixo para auditar o Score Global (0–100) em 8 dimensões pedagógicas e ergonômicas.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {itensComparaveis.map((item) => {
                  const ativo = selecionadosComparacao.includes(String(item.keyId));
                  return (
                    <button
                      key={item.keyId}
                      type="button"
                      onClick={() => toggleComparacao(item.keyId)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: `1.5px solid ${ativo ? "#2563eb" : "#cbd5e1"}`,
                        background: ativo ? "#2563eb" : "#f8fafc",
                        color: ativo ? "#fff" : "#334155",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {ativo ? "✓ " : ""}
                      {item.nome} ({item.score_qualidade}/100)
                    </button>
                  );
                })}
              </div>
            </div>

            {colunasComparadas.length === 0 ? (
              <div
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  color: "#64748b",
                  background: "#f8fafc",
                  borderRadius: 10,
                  border: "1px dashed #cbd5e1",
                }}
              >
                Nenhum horário disponível ou selecionado neste turno. Gere um rascunho na aba{" "}
                <strong>⚡ Gerar Horário</strong> para iniciar a análise comparativa.
              </div>
            ) : (
              <>
                {/* Cards Superiores de Score Global + Barras das 8 Dimensões */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${colunasComparadas.length}, minmax(260px, 1fr))`,
                    gap: 14,
                    marginBottom: 18,
                  }}
                >
                  {colunasComparadas.map((col, idx) => {
                    const sc = Number(col.score_qualidade || col.metricas?.score_global || 0);
                    const infoCor = corScore(sc);
                    const ehVencedor = maiorScoreComparado !== null && sc === maiorScoreComparado;
                    const subs = col.metricas?.subscores || {};
                    const diffBase =
                      idx > 0
                        ? calcularDiferencaEstrutural(colunasComparadas[0]?.slots, col.slots)
                        : null;

                    const dimensoes = [
                      { label: "Cobertura Curricular", val: subs.cobertura ?? 0, max: 35 },
                      { label: "Zero Janelas Docentes", val: subs.janelas ?? 0, max: 20 },
                      { label: "Geminação & Recreio", val: subs.geminacao ?? 0, max: 15 },
                      { label: "Distribuição na Semana", val: subs.distribuicao ?? 0, max: 10 },
                      { label: "Zero Aulas Isoladas (1h)", val: subs.concentracao ?? 0, max: 5 },
                      { label: "Disponibilidade Docente", val: subs.disponibilidade ?? 0, max: 5 },
                      { label: "Saúde Inter-Turnos CPF", val: subs.interturno ?? 0, max: 5 },
                      { label: "Super-Aulas IFA & Salas", val: subs.salas_super ?? 0, max: 5 },
                    ];

                    return (
                      <div
                        key={col.keyId}
                        style={{
                          border: ehVencedor ? "2px solid #16a34a" : "1px solid #cbd5e1",
                          borderRadius: 12,
                          padding: 16,
                          background: ehVencedor ? "#f0fdf4" : "#fff",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            {ehVencedor && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginBottom: 5,
                                  background: "#16a34a",
                                  color: "#fff",
                                  padding: "2px 9px",
                                  borderRadius: 999,
                                  fontSize: 10,
                                  fontWeight: 800,
                                }}
                              >
                                🏆 MELHOR QUALIDADE GLOBAL
                              </span>
                            )}
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{col.nome}</div>
                            {diffBase && (
                              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                                🔄 <strong>{diffBase.pct}%</strong> diferente da 1ª coluna ({diffBase.diferentes} horários)
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              textAlign: "right",
                              background: infoCor.bg,
                              border: `1px solid ${infoCor.border}`,
                              color: infoCor.cor,
                              padding: "6px 12px",
                              borderRadius: 10,
                              minWidth: 78,
                            }}
                          >
                            <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.05 }}>{sc}</div>
                            <div style={{ fontSize: 9.5, fontWeight: 800 }}>{infoCor.label}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                          {dimensoes.map((dim) => {
                            const pct = Math.min(100, Math.max(0, (dim.val / dim.max) * 100));
                            return (
                              <div key={dim.label} style={{ fontSize: 11 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#334155" }}>
                                  <span>{dim.label}</span>
                                  <strong>
                                    {dim.val}/{dim.max}
                                  </strong>
                                </div>
                                <div
                                  style={{
                                    height: 5,
                                    borderRadius: 999,
                                    background: "#e2e8f0",
                                    overflow: "hidden",
                                    marginTop: 2,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${pct}%`,
                                      height: "100%",
                                      background: pct >= 85 ? "#16a34a" : pct >= 60 ? "#2563eb" : "#d97706",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => setCenarioInspecao(col)}
                            style={{
                              flex: 1,
                              padding: "6px 10px",
                              borderRadius: 7,
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              color: "#1e293b",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            👁️ Ver Grade
                          </button>
                          {!col.is_virtual_ativo && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAplicarCenario(col, false, true)}
                                style={{
                                  flex: 1,
                                  padding: "6px 10px",
                                  borderRadius: 7,
                                  border: "1px solid #0284c7",
                                  background: "#e0f2fe",
                                  color: "#0369a1",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                📥 No Rascunho
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAplicarCenario(col, true, false)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 7,
                                  border: "none",
                                  background: "#16a34a",
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Publicar diretamente este cenário como horário oficial"
                              >
                                🚀 Publicar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tabela Objetiva de Indicadores Lado a Lado */}
                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ textAlign: "left", padding: "10px 14px", color: "#334155", fontWeight: 800 }}>
                          Indicador Pedagógico / Ergonômico
                        </th>
                        {colunasComparadas.map((col) => (
                          <th
                            key={col.keyId}
                            style={{ textAlign: "center", padding: "10px 14px", color: "#0f172a", fontWeight: 800 }}
                          >
                            {col.nome}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: "📊 Cobertura da Carga Curricular",
                          getVal: (m) => m.cobertura_pct ?? 0,
                          render: (m) => `${m.cobertura_pct ?? 0}% (${m.aulas_alocadas ?? 0}/${m.total_demanda ?? 0})`,
                          melhor: "maior",
                        },
                        {
                          label: "🕳️ Total de Janelas Internas Docentes",
                          getVal: (m) => m.janelas_professores ?? 0,
                          render: (m) => `${m.janelas_professores ?? 0} janela(s) (${m.professores_com_janela ?? 0} prof.)`,
                          melhor: "menor",
                        },
                        {
                          label: "🏅 Professores com Zero Janelas",
                          getVal: (m) => m.professores_zero_janelas ?? 0,
                          render: (m) => `${m.professores_zero_janelas ?? 0} de ${m.total_professores ?? 0} docentes`,
                          melhor: "maior",
                        },
                        {
                          label: "🔗 Duplas Geminadas Consecutivas (s/ cortar recreio)",
                          getVal: (m) => m.pares_geminados ?? 0,
                          render: (m) => `${m.pares_geminados ?? 0} dupla(s)`,
                          melhor: "maior",
                        },
                        {
                          label: "☕ Duplas Cortadas pelo Recreio",
                          getVal: (m) => m.violacoes_recreio ?? 0,
                          render: (m) => `${m.violacoes_recreio ?? 0}`,
                          melhor: "menor",
                        },
                        {
                          label: "✂️ Aulas da Mesma Disciplina Separadas no Mesmo Dia",
                          getVal: (m) => m.violacoes_separadas_mesmo_dia ?? 0,
                          render: (m) => `${m.violacoes_separadas_mesmo_dia ?? 0}`,
                          melhor: "menor",
                        },
                        {
                          label: "🚗 Dias c/ Apenas 1 Aula Isolada (Deslocamento 1h/dia)",
                          getVal: (m) => m.aulas_isoladas_dia ?? 0,
                          render: (m) => `${m.aulas_isoladas_dia ?? 0} ocorrência(s)`,
                          melhor: "menor",
                        },
                        {
                          label: "📅 Média de Dias na Escola por Professor",
                          getVal: (m) => m.media_dias_professor ?? 0,
                          render: (m) => `${m.media_dias_professor ?? 0} dia(s)/sem`,
                          melhor: "menor",
                        },
                        {
                          label: "🟡 Horários Alocados em Preferência 'Evitar'",
                          getVal: (m) => m.slots_em_evitar ?? 0,
                          render: (m) => `${m.slots_em_evitar ?? 0}`,
                          melhor: "menor",
                        },
                        {
                          label: "🌙 Alertas Inter-Turnos / Interjornada por CPF",
                          getVal: (m) => m.violacoes_interturno ?? 0,
                          render: (m) => `${m.violacoes_interturno ?? 0}`,
                          melhor: "menor",
                        },
                        {
                          label: "🏛️ Excesso de Lotação Física (Quadras/Laboratórios)",
                          getVal: (m) => m.violacoes_salas ?? 0,
                          render: (m) => `${m.violacoes_salas ?? 0}`,
                          melhor: "menor",
                        },
                        {
                          label: "📌 Horários Fixados Manualmente Respeitados",
                          getVal: (m) => m.total_fixos ?? 0,
                          render: (m) => `${m.total_fixos ?? 0} aula(s) fixa(s)`,
                          melhor: "neutro",
                        },
                      ].map((row, rIdx) => {
                        const vals = colunasComparadas.map((c) => Number(row.getVal(c.metricas || {})));
                        const bestVal =
                          colunasComparadas.length >= 2 && row.melhor !== "neutro"
                            ? row.melhor === "maior"
                              ? Math.max(...vals)
                              : Math.min(...vals)
                            : null;
                        const todosIguais = vals.every((v) => v === vals[0]);

                        return (
                          <tr
                            key={row.label}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: rIdx % 2 === 0 ? "#fff" : "#fcfdff",
                            }}
                          >
                            <td style={{ padding: "9px 14px", color: "#334155", fontWeight: 600 }}>{row.label}</td>
                            {colunasComparadas.map((col, cIdx) => {
                              const v = vals[cIdx];
                              const destaque = bestVal !== null && !todosIguais && v === bestVal;
                              return (
                                <td
                                  key={col.keyId}
                                  style={{
                                    padding: "9px 14px",
                                    textAlign: "center",
                                    fontWeight: destaque ? 800 : 600,
                                    color: destaque ? "#15803d" : "#1e293b",
                                    background: destaque ? "#f0fdf4" : "transparent",
                                  }}
                                >
                                  {row.render(col.metricas || {})}
                                  {destaque ? " ✓" : ""}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 1.3 Comparativo Ergonômico Docente a Docente */}
                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                        👩‍🏫 Impacto Ergonômico Professor a Professor
                      </h4>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>
                        Veja exatamente quem ganhou ou eliminou janelas e deslocamentos isolados entre as propostas.
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {colunasComparadas.length >= 2 && (
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#334155",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={apenasDiferencasDocente}
                            onChange={(e) => setApenasDiferencasDocente(e.target.checked)}
                          />
                          Mostrar apenas professores com diferença
                        </label>
                      )}
                      <input
                        type="text"
                        placeholder="🔎 Filtrar professor…"
                        value={buscaDocenteComp}
                        onChange={(e) => setBuscaDocenteComp(e.target.value)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: 12,
                          minWidth: 200,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 2 }}>
                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ textAlign: "left", padding: "9px 12px", color: "#334155" }}>Professor(a)</th>
                          {colunasComparadas.map((col) => (
                            <th key={col.keyId} style={{ textAlign: "center", padding: "9px 12px", color: "#0f172a" }}>
                              {col.nome}
                              <div style={{ fontSize: 10, fontWeight: 500, color: "#64748b" }}>
                                Janelas • Dias • Isoladas (1h)
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparativoDocentes.length === 0 ? (
                          <tr>
                            <td
                              colSpan={colunasComparadas.length + 1}
                              style={{ padding: 18, textAlign: "center", color: "#64748b" }}
                            >
                              Nenhum professor encontrado com o filtro selecionado.
                            </td>
                          </tr>
                        ) : (
                          comparativoDocentes.map((row) => {
                            const refJan = row.porColuna[0]?.janelas ?? 0;
                            return (
                              <tr key={row.professor_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e293b" }}>
                                  {row.professor_nome}
                                </td>
                                {row.porColuna.map((info, idx) => {
                                  if (!info) {
                                    return (
                                      <td
                                        key={idx}
                                        style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}
                                      >
                                        —
                                      </td>
                                    );
                                  }
                                  const deltaJan = idx > 0 ? info.janelas - refJan : 0;
                                  return (
                                    <td key={idx} style={{ padding: "8px 12px", textAlign: "center" }}>
                                      <span
                                        style={{
                                          fontWeight: 800,
                                          color: info.janelas === 0 ? "#15803d" : "#b45309",
                                        }}
                                      >
                                        {info.janelas} jan
                                      </span>
                                      {" • "}
                                      <span style={{ color: "#334155" }}>{info.dias_ativos}d</span>
                                      {" • "}
                                      <span
                                        style={{
                                          color: info.aulas_isoladas_dia > 0 ? "#b91c1c" : "#64748b",
                                        }}
                                      >
                                        {info.aulas_isoladas_dia} isol.
                                      </span>
                                      {idx > 0 && deltaJan !== 0 && (
                                        <span
                                          style={{
                                            marginLeft: 6,
                                            padding: "1px 6px",
                                            borderRadius: 999,
                                            fontSize: 10,
                                            fontWeight: 800,
                                            background: deltaJan < 0 ? "#dcfce7" : "#fee2e2",
                                            color: deltaJan < 0 ? "#15803d" : "#b91c1c",
                                          }}
                                        >
                                          {deltaJan > 0 ? `+${deltaJan} jan` : `${deltaJan} jan`}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-ABA 2: SUBSTITUIÇÃO DE PROFESSORES S/ PERDER HISTÓRICO DE DIÁRIO
          ==================================================================== */}
      {subAba === "substituicao" && (
        <div style={{ padding: "20px 24px 36px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Banner explicativo da blindagem de Diários */}
          <div
            style={{
              background: "linear-gradient(90deg, #eff6ff, #f0fdf4)",
              border: "1px solid #93c5fd",
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 22 }}>🛡️</span>
            <div style={{ fontSize: 12.5, color: "#1e3a8a", lineHeight: 1.55 }}>
              <strong>Blindagem Total de Histórico Pedagógico e Diários de Classe:</strong> Ao realizar a substituição por este painel,{" "}
              <strong>100% dos Planos de Avaliação (PAP), notas bimestrais, chamadas/frequências e conteúdos já registrados pelo titular permanecem intactos</strong>. O sistema transfere atomicamente os horários na grade (rascunho e oficial), os vínculos de modulação e os agrupamentos de IFA, liberando imediatamente o acesso aos diários para o professor substituto e gravando snapshot reversível para eventual retorno do titular.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
              gap: 18,
              alignItems: "start",
            }}
          >
            {/* Coluna Esquerda: Formulário de Substituição */}
            <form
              onSubmit={handleConfirmarSubstituicao}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                🔄 Nova Substituição Docente ({turno.toUpperCase()})
              </h3>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  1. Professor(a) Titular (que se afasta / sai) *
                </label>
                <select
                  required
                  value={titularId}
                  onChange={(e) => {
                    setTitularId(e.target.value);
                    setTurmasFiltroIds([]);
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    background: "#fff",
                  }}
                >
                  <option value="">Selecione o(a) professor(a) titular…</option>
                  {(catalogo.professores || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.cpf_mascarado ? `(${p.cpf_mascarado})` : ""} {p.status === "inativo" ? "[INATIVO]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  2. Professor(a) Substituto(a) (que assume as aulas e diários) *
                </label>
                <select
                  required
                  value={substitutoId}
                  onChange={(e) => setSubstitutoId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    background: "#fff",
                  }}
                >
                  <option value="">Selecione o(a) professor(a) substituto(a)…</option>
                  {(catalogo.professores || [])
                    .filter((p) => p.status !== "inativo" && String(p.id) !== String(titularId))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} {p.cpf_mascarado ? `(${p.cpf_mascarado})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    3. Motivo Administrativo
                  </label>
                  <select
                    value={motivoSub}
                    onChange={(e) => setMotivoSub(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      background: "#fff",
                    }}
                  >
                    {MOTIVOS_SUBSTITUICAO.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={dataInicioSub}
                    onChange={(e) => setDataInicioSub(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 12.5,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    Previsão de Término (opcional)
                  </label>
                  <input
                    type="date"
                    value={dataFimPrevistaSub}
                    onChange={(e) => setDataFimPrevistaSub(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 12.5,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Processo SEI / Portaria / Observação (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Processo SEI 00080-00123456/2026 — Atestado 30 dias"
                  value={observacaoSub}
                  onChange={(e) => setObservacaoSub(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 12.5,
                  }}
                />
              </div>

              {/* Opções de Sincronização */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={sincronizarModulacao}
                    onChange={(e) => setSincronizarModulacao(e.target.checked)}
                  />
                  Sincronizar Modulação & liberar Diários/Planos para o substituto (Recomendado)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={manterFixacoes}
                    onChange={(e) => setManterFixacoes(e.target.checked)}
                  />
                  Preservar marcações de aulas fixas manuais (📌) nos horários transferidos
                </label>
                {motivoSub === "TROCA_DEFINITIVA" && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#b45309",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={inativarTitular}
                      onChange={(e) => setInativarTitular(e.target.checked)}
                    />
                    Inativar cadastro do professor titular na escola após transferir
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={!simulacaoSub || executandoSub || simulandoSub}
                style={{
                  padding: "11px 18px",
                  borderRadius: 9,
                  border: "none",
                  background: !simulacaoSub || executandoSub ? "#94a3b8" : "#16a34a",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: !simulacaoSub || executandoSub ? "not-allowed" : "pointer",
                }}
              >
                {executandoSub
                  ? "⏳ Transferindo Horários e Modulação…"
                  : "✅ Confirmar Substituição Atômica"}
              </button>
            </form>

            {/* Coluna Direita: Simulador Pré-Voo de Impacto & Colisões */}
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                🔍 Diagnóstico Pré-Substituição (Simulação em Tempo Real)
              </h3>

              {simulandoSub && (
                <div style={{ padding: 24, textAlign: "center", color: "#475569", fontSize: 13 }}>
                  ⏳ Verificando horários, modulação, interjornada por CPF e diários vinculados…
                </div>
              )}

              {!simulandoSub && erroSimulacao && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {erroSimulacao}
                </div>
              )}

              {!simulandoSub && !simulacaoSub && !erroSimulacao && (
                <div
                  style={{
                    padding: "28px 18px",
                    textAlign: "center",
                    color: "#64748b",
                    background: "#f8fafc",
                    borderRadius: 10,
                    border: "1px dashed #cbd5e1",
                    fontSize: 12.5,
                  }}
                >
                  Selecione o <strong>Professor Titular</strong> e o <strong>Professor Substituto</strong> ao lado para inspecionar automaticamente as turmas, aulas e diários preservados antes de confirmar.
                </div>
              )}

              {!simulandoSub && simulacaoSub && (
                <>
                  {/* KPIs de Impacto */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#1d4ed8" }}>
                        {simulacaoSub.resumo_impacto?.slots_grade_visiveis ?? 0}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af" }}>
                        Horários Transferidos na Grade ({simulacaoSub.resumo_impacto?.turmas_afetadas ?? 0} turmas)
                      </div>
                    </div>

                    <div style={{ padding: 12, borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#15803d" }}>
                        {simulacaoSub.resumo_impacto?.planos_diario_preservados ?? 0} Planos •{" "}
                        {simulacaoSub.resumo_impacto?.registros_notas_preservados ?? 0} Notas
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>
                        100% Intactos nos Diários de Classe
                      </div>
                    </div>
                  </div>

                  {/* Seleção Granular de Turmas do Titular */}
                  {Array.isArray(simulacaoSub.turmas_disponiveis_titular) &&
                    simulacaoSub.turmas_disponiveis_titular.length > 0 && (
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                            fontSize: 12,
                          }}
                        >
                          <strong style={{ color: "#0f172a" }}>
                            Escopo de Turmas ({turmasFiltroIds.length === 0 ? "Todas do turno" : `${turmasFiltroIds.length} selecionada(s)`}):
                          </strong>
                          {turmasFiltroIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setTurmasFiltroIds([])}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#2563eb",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Selecionar todas
                            </button>
                          )}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {simulacaoSub.turmas_disponiveis_titular.map((t) => {
                            const marcada =
                              turmasFiltroIds.length === 0 || turmasFiltroIds.includes(Number(t.turma_id));
                            return (
                              <button
                                key={t.turma_id}
                                type="button"
                                onClick={() => toggleTurmaFiltroSubstituicao(t.turma_id)}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 999,
                                  border: `1px solid ${marcada ? "#2563eb" : "#cbd5e1"}`,
                                  background: marcada ? "#dbeafe" : "#fff",
                                  color: marcada ? "#1e40af" : "#64748b",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title={t.disciplinas?.join(", ")}
                              >
                                {marcada ? "✓ " : ""}
                                {t.turma_nome} ({t.slots_na_grade || t.aulas_moduladas}h)
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Validações de Colisão H2 / Inter-Turnos CPF / Disponibilidade */}
                  {(simulacaoSub.validacoes?.colisoes_mesmo_turno?.length || 0) === 0 ? (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 9,
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        color: "#15803d",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      ✅ Zero choque de horário no turno! {simulacaoSub.substituto?.nome} está livre em todos os horários assumidos.
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 9,
                        background: "#fef2f2",
                        border: "1px solid #fca5a5",
                        color: "#991b1b",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>
                        🚫 {simulacaoSub.validacoes.colisoes_mesmo_turno.length} Choque(s) de Horário no Mesmo Turno:
                      </div>
                      <ul style={{ margin: "0 0 8px 18px", padding: 0 }}>
                        {simulacaoSub.validacoes.colisoes_mesmo_turno.slice(0, 6).map((c, i) => (
                          <li key={i}>
                            {DIAS_CURTO[c.dia] || `${c.dia}º dia`} #{c.ordem}ª aula: Titular em{" "}
                            <strong>{c.turma_titular}</strong> × Substituto já em{" "}
                            <strong>{c.turma_conflito_substituto}</strong>
                          </li>
                        ))}
                      </ul>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={pularColisoes}
                          onChange={(e) => setPularColisoes(e.target.checked)}
                        />
                        Transferir apenas os horários sem choque e manter os conflitantes p/ ajuste manual
                      </label>
                    </div>
                  )}

                  {(simulacaoSub.validacoes?.alertas_interturno_cpf?.length || 0) > 0 && (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 9,
                        background: "#fffbeb",
                        border: "1px solid #fcd34d",
                        color: "#92400e",
                        fontSize: 11.5,
                      }}
                    >
                      <strong>🌙 Alerta Inter-Turnos / Interjornada (CPF):</strong>{" "}
                      {simulacaoSub.validacoes.alertas_interturno_cpf.length} horário(s) tocam restrição de outro turno do substituto.
                    </div>
                  )}

                  {(simulacaoSub.validacoes?.alertas_indisponibilidade?.length || 0) > 0 && (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 9,
                        background: "#fffbeb",
                        border: "1px solid #fcd34d",
                        color: "#92400e",
                        fontSize: 11.5,
                      }}
                    >
                      <strong>📅 Aviso de Disponibilidade:</strong> {simulacaoSub.substituto?.nome} marcou{" "}
                      {simulacaoSub.validacoes.alertas_indisponibilidade.length} desses horários como indisponível na aba Disponibilidade.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Histórico Auditável de Substituições + Reversão 1-Clique */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              padding: "18px 20px",
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              📋 Histórico Auditável de Substituições & Retorno de Titulares
            </h3>

            {historicoSubstituicoes.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 12.5 }}>
                Nenhuma substituição registrada neste turno até o momento.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: "9px 12px" }}>Status</th>
                      <th style={{ textAlign: "left", padding: "9px 12px" }}>Titular → Substituto</th>
                      <th style={{ textAlign: "left", padding: "9px 12px" }}>Motivo & Período</th>
                      <th style={{ textAlign: "left", padding: "9px 12px" }}>Escopo & Diários Preservados</th>
                      <th style={{ textAlign: "right", padding: "9px 12px" }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoSubstituicoes.map((h) => {
                      const stCor =
                        h.status === "ATIVA"
                          ? { bg: "#dcfce7", text: "#15803d", label: "ATIVA" }
                          : h.status === "DEFINITIVA"
                          ? { bg: "#dbeafe", text: "#1e40af", label: "DEFINITIVA" }
                          : { bg: "#f1f5f9", text: "#475569", label: "ENCERRADA / REVERTIDA" };

                      return (
                        <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                background: stCor.bg,
                                color: stCor.text,
                                padding: "3px 9px",
                                borderRadius: 999,
                                fontSize: 10.5,
                                fontWeight: 800,
                              }}
                            >
                              {stCor.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 800, color: "#0f172a" }}>
                              {h.professor_titular_nome} <span style={{ color: "#2563eb" }}>→</span>{" "}
                              {h.professor_substituto_nome}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              Registrado em {formatarDataHora(h.created_at)}
                              {h.realizado_por_nome ? ` por ${h.realizado_por_nome}` : ""}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 700, color: "#334155" }}>
                              {MOTIVO_LABELS_MAP[h.motivo] || h.motivo}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              Início: {formatarDataSimples(h.data_inicio)}
                              {h.data_fim_prevista ? ` • Prev. Fim: ${formatarDataSimples(h.data_fim_prevista)}` : ""}
                              {h.data_retorno_efetivo ? ` • Retorno: ${formatarDataSimples(h.data_retorno_efetivo)}` : ""}
                            </div>
                            {h.observacao && (
                              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{h.observacao}</div>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ color: "#0f172a", fontWeight: 600 }}>
                              {(h.escopo?.turmas_nomes || []).join(", ") || "Turmas do turno"}
                            </div>
                            <div style={{ fontSize: 11, color: "#15803d", fontWeight: 700 }}>
                              🛡️ {h.escopo?.planos_diario_preservados ?? 0} plano(s) •{" "}
                              {h.escopo?.slots_transferidos ?? 0} slot(s)
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            {h.status !== "REVERTIDA" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalReverter(h);
                                  setDataRetornoEfetivo(new Date().toISOString().slice(0, 10));
                                  setObsRetorno("");
                                }}
                                style={{
                                  padding: "6px 11px",
                                  borderRadius: 7,
                                  border: "1px solid #0284c7",
                                  background: "#f0f9ff",
                                  color: "#0369a1",
                                  fontWeight: 700,
                                  fontSize: 11,
                                  cursor: "pointer",
                                }}
                              >
                                ↩️ Retorno do Titular
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-ABA 3: LINHA DO TEMPO DE VERSÕES PUBLICADAS & BACKUPS AUTOMÁTICOS
          ==================================================================== */}
      {subAba === "historico" && (
        <div style={{ padding: "20px 24px 36px" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              padding: "18px 20px",
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              📜 Linha do Tempo de Publicações Oficiais & Backups de Segurança ({turno.toUpperCase()})
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
              Toda vez que um novo horário é publicado ou um cenário é carregado no rascunho, o sistema arquiva automaticamente uma cópia imutável aqui para auditoria ou reversão imediata.
            </p>

            {cenariosHistorico.length === 0 ? (
              <div
                style={{
                  padding: 28,
                  textAlign: "center",
                  color: "#64748b",
                  background: "#f8fafc",
                  borderRadius: 10,
                  border: "1px dashed #cbd5e1",
                }}
              >
                Ainda não há versões arquivadas ou backups automáticos neste turno. Assim que você republicar uma grade ou restaurar um cenário, os snapshots aparecerão automaticamente aqui.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cenariosHistorico.map((item) => {
                  const cor = corScore(item.score_qualidade);
                  const ehPub = item.tipo === "PUBLICACAO";
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        background: "#fcfdff",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 10.5,
                              fontWeight: 800,
                              background: ehPub ? "#dcfce7" : "#fef3c7",
                              color: ehPub ? "#15803d" : "#b45309",
                            }}
                          >
                            {ehPub ? "🌐 PUBLICAÇÃO ANTERIOR" : "🛡️ BACKUP AUTOMÁTICO"}
                          </span>
                          <strong style={{ fontSize: 13.5, color: "#0f172a" }}>{item.nome}</strong>
                          <span
                            style={{
                              background: cor.bg,
                              color: cor.cor,
                              border: `1px solid ${cor.border}`,
                              padding: "1px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            Score {item.score_qualidade}/100
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
                          Arquivado em {formatarDataHora(item.created_at)}
                          {item.criado_por_nome ? ` por ${item.criado_por_nome}` : ""} • {item.total_slots} aulas •{" "}
                          {item.metricas?.janelas_professores ?? 0} janelas docentes
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setCenarioInspecao(item)}
                          style={{
                            padding: "7px 12px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#334155",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          👁️ Ver Grade
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleComparacao(item.id);
                            setSubAba("comparar");
                          }}
                          style={{
                            padding: "7px 12px",
                            borderRadius: 8,
                            border: "1px solid #2563eb",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ⚖️ Comparar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAplicarCenario(item, false, true)}
                          style={{
                            padding: "7px 12px",
                            borderRadius: 8,
                            border: "1px solid #0284c7",
                            background: "#f0f9ff",
                            color: "#0369a1",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          📥 Restaurar no Rascunho
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 1: SALVAR CENÁRIO (A / B / C / CUSTOM)
          ==================================================================== */}
      {modalSalvar && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <form
            onSubmit={confirmarSalvarCenario}
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 460,
              borderRadius: 16,
              padding: "22px 24px",
              boxShadow: "0 20px 30px rgba(15,23,42,0.22)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              💾 Salvar Cenário de Horário ({turno.toUpperCase()})
            </h3>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Slot do Cenário
              </label>
              <select
                value={modalSalvar.codigo_cenario}
                onChange={(e) => setModalSalvar((p) => ({ ...p, codigo_cenario: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                <option value="A">Cenário A (Proposta Principal)</option>
                <option value="B">Cenário B (Proposta Alternativa 2)</option>
                <option value="C">Cenário C (Proposta Alternativa 3)</option>
                <option value="CUSTOM">Cenário Extra Personalizado</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Origem dos Horários
              </label>
              <select
                value={modalSalvar.origem_dados}
                onChange={(e) => setModalSalvar((p) => ({ ...p, origem_dados: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                {ativos.rascunho && <option value="rascunho">📋 Rascunho Atual Salvo</option>}
                {ativos.publicado && <option value="publicado">🚀 Horário Publicado Oficial</option>}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Título Identificador *
              </label>
              <input
                required
                type="text"
                value={modalSalvar.nome}
                onChange={(e) => setModalSalvar((p) => ({ ...p, nome: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Observação Pedagógica (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex.: Prioriza zero janelas na área de Humanas"
                value={modalSalvar.descricao}
                onChange={(e) => setModalSalvar((p) => ({ ...p, descricao: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={modalSalvar.favorito}
                onChange={(e) => setModalSalvar((p) => ({ ...p, favorito: e.target.checked }))}
              />
              ⭐ Marcar como cenário favorito para aprovação da Direção
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setModalSalvar(null)}
                style={{
                  padding: "9px 15px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoCenario}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: salvandoCenario ? "wait" : "pointer",
                }}
              >
                {salvandoCenario ? "Salvando…" : "💾 Salvar Cenário"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: INSPEÇÃO VISUAL COMPLETA DA GRADE DO CENÁRIO
          ==================================================================== */}
      {cenarioInspecao && dadosInspecao && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#f8fafc",
              width: "100%",
              maxWidth: 1180,
              maxHeight: "90vh",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 24px 48px rgba(15,23,42,0.3)",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "14px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  👁️ Inspeção Visual: {cenarioInspecao.nome}
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Score Pedagógico: <strong>{cenarioInspecao.score_qualidade}/100</strong> •{" "}
                  {cenarioInspecao.total_slots} aulas alocadas •{" "}
                  {cenarioInspecao.metricas?.janelas_professores ?? 0} janelas docentes
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #cbd5e1" }}>
                  <button
                    type="button"
                    onClick={() => setModoInspecao("turma")}
                    style={{
                      padding: "7px 14px",
                      border: "none",
                      background: modoInspecao === "turma" ? "#2563eb" : "#fff",
                      color: modoInspecao === "turma" ? "#fff" : "#475569",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    🏫 Por Turma
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoInspecao("professor")}
                    style={{
                      padding: "7px 14px",
                      border: "none",
                      background: modoInspecao === "professor" ? "#2563eb" : "#fff",
                      color: modoInspecao === "professor" ? "#fff" : "#475569",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    👩‍🏫 Por Professor
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCenarioInspecao(null)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#0f172a",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              {modoInspecao === "turma" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
                    gap: 16,
                  }}
                >
                  {(catalogo.turmas || []).map((t) => (
                    <div
                      key={t.id}
                      style={{
                        background: "#fff",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        padding: 12,
                      }}
                    >
                      <GradeTurma
                        turma={{ ...t, turma: t.nome || t.turma }}
                        resultado={dadosInspecao.resultado}
                        periodosPorDia={dadosInspecao.periodosPorDia}
                        maps={mapsCatalogo}
                        interativo={false}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
                    gap: 16,
                  }}
                >
                  {dadosInspecao.professoresComAula.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        background: "#fff",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        padding: 12,
                      }}
                    >
                      <GradeProfessor
                        professor={p}
                        resultado={dadosInspecao.resultado}
                        periodosPorDia={dadosInspecao.periodosPorDia}
                        maps={mapsCatalogo}
                        interativo={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: CONFIRMAR RETORNO DO PROFESSOR TITULAR (REVERSÃO 1-CLIQUE)
          ==================================================================== */}
      {modalReverter && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <form
            onSubmit={handleConfirmarReversao}
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 460,
              borderRadius: 16,
              padding: "22px 24px",
              boxShadow: "0 20px 30px rgba(15,23,42,0.22)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              ↩️ Registrar Retorno do Professor Titular
            </h3>
            <p style={{ margin: 0, fontSize: 12.5, color: "#475569", lineHeight: 1.5 }}>
              As aulas na grade e a modulação assumidas por{" "}
              <strong>{modalReverter.professor_substituto_nome}</strong> retornarão automaticamente para{" "}
              <strong>{modalReverter.professor_titular_nome}</strong>, preservando integralmente todas as notas, chamadas e registros lançados durante o período de substituição.
            </p>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Data Efetiva de Retorno
              </label>
              <input
                type="date"
                value={dataRetornoEfetivo}
                onChange={(e) => setDataRetornoEfetivo(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Observação de Encerramento (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex.: Retorno de licença médica conforme despacho SEI"
                value={obsRetorno}
                onChange={(e) => setObsRetorno(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setModalReverter(null)}
                style={{
                  padding: "9px 15px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={revertendoSub}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0284c7",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: revertendoSub ? "wait" : "pointer",
                }}
              >
                {revertendoSub ? "Restaurando…" : "↩️ Confirmar Retorno do Titular"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
