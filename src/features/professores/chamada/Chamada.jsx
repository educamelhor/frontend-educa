import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UserGroupIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Motor PDF sob demanda (para clonagem de folha PDF quando desejado)
const carregarPdf = () => import("./chamadaPdf");

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_UPPER = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const TIPOS_JUSTIFICATIVA_MAP = {
  atestado_medico: { label: "Atestado Médico", icon: "🏥" },
  atestado_acompanhamento: { label: "Atestado Acomp.", icon: "👨‍⚕️" },
  atestado_obito: { label: "Atestado de Óbito", icon: "🕊️" },
  atividades_militares: { label: "Ativ. Militares", icon: "🎖️" },
  convocacao_oficial: { label: "Convocação Oficial", icon: "📋" },
  declaracao_trabalhista: { label: "Decl. Trabalhista", icon: "💼" },
  populacao_itinerancia: { label: "Itinerância", icon: "🏕️" },
  licenca_gestante: { label: "Licença Gestante", icon: "🤰" },
  crenca_religiosa: { label: "Crença Religiosa", icon: "🙏" },
  estudante_atleta: { label: "Estudante Atleta", icon: "🏅" },
  atividade_remota: { label: "Atividade Remota", icon: "💻" },
  intercambio: { label: "Intercâmbio", icon: "✈️" },
};

const getInfoTipoJustificativa = (tipo) =>
  TIPOS_JUSTIFICATIVA_MAP[tipo] || { label: "Justificativa Legal", icon: "📋" };

const normTexto = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Se um Sábado Letivo tiver no motivo referência a um dia da semana (ex: "Ref. Quinta-feira"), retorna 1..5
const detectarDiaReferenciaSabadoLetivo = (motivo) => {
  const m = normTexto(motivo);
  if (!m) return null;
  if (m.includes("SEGUNDA")) return 1;
  if (m.includes("TERCA")) return 2;
  if (m.includes("QUARTA")) return 3;
  if (m.includes("QUINTA")) return 4;
  if (m.includes("SEXTA")) return 5;
  return null;
};

const hojeIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

const formatarDataBr = (iso) => {
  if (!iso || !iso.includes("-")) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = DIAS_SEMANA[dt.getDay()] || "";
  return `${wd}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

const formatarDataCurta = (iso) => {
  if (!iso || !iso.includes("-")) return { wd: "", dm: iso || "" };
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    wd: DIAS_SEMANA[dt.getDay()] || "",
    dm: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`,
  };
};

const extrairNumeroBimestre = (bimestreStr) => {
  const m = String(bimestreStr || "").match(/([1-4])/);
  return m ? Number(m[1]) : 1;
};

const normalizarTurnoKey = (turno) => {
  const t = String(turno || "").toLowerCase().trim();
  if (t.includes("noturno") || t.includes("noite")) return "noturno";
  if (t.includes("vespertino") || t.includes("tarde")) return "vespertino";
  if (t.includes("integral")) return "integral";
  return "matutino";
};

const getHorariosPadraoPorTurno = (turno) => {
  const t = normalizarTurnoKey(turno);
  if (t === "noturno") {
    return [
      { ordem: 1, horario: "19:00", fim: "19:45", label: "1ª Aula · 19:00 às 19:45", origemGovernanca: false },
      { ordem: 2, horario: "19:45", fim: "20:30", label: "2ª Aula · 19:45 às 20:30", origemGovernanca: false },
      { ordem: 3, horario: "20:30", fim: "21:15", label: "3ª Aula · 20:30 às 21:15", origemGovernanca: false },
      { ordem: 4, horario: "21:30", fim: "22:15", label: "4ª Aula · 21:30 às 22:15", origemGovernanca: false },
      { ordem: 5, horario: "22:15", fim: "23:00", label: "5ª Aula · 22:15 às 23:00", origemGovernanca: false },
    ];
  }
  if (t === "vespertino") {
    return [
      { ordem: 1, horario: "13:10", fim: "14:00", label: "1ª Aula · 13:10 às 14:00", origemGovernanca: false },
      { ordem: 2, horario: "14:00", fim: "14:50", label: "2ª Aula · 14:00 às 14:50", origemGovernanca: false },
      { ordem: 3, horario: "14:50", fim: "15:40", label: "3ª Aula · 14:50 às 15:40", origemGovernanca: false },
      { ordem: 4, horario: "15:55", fim: "16:45", label: "4ª Aula · 15:55 às 16:45", origemGovernanca: false },
      { ordem: 5, horario: "16:45", fim: "17:35", label: "5ª Aula · 16:45 às 17:35", origemGovernanca: false },
      { ordem: 6, horario: "17:35", fim: "18:25", label: "6ª Aula · 17:35 às 18:25", origemGovernanca: false },
    ];
  }
  // Matutino / Integral / Padrão
  return [
    { ordem: 1, horario: "07:30", fim: "08:20", label: "1ª Aula · 07:30 às 08:20", origemGovernanca: false },
    { ordem: 2, horario: "08:20", fim: "09:10", label: "2ª Aula · 08:20 às 09:10", origemGovernanca: false },
    { ordem: 3, horario: "09:10", fim: "10:00", label: "3ª Aula · 09:10 às 10:00", origemGovernanca: false },
    { ordem: 4, horario: "10:15", fim: "11:05", label: "4ª Aula · 10:15 às 11:05", origemGovernanca: false },
    { ordem: 5, horario: "11:05", fim: "11:55", label: "5ª Aula · 11:05 às 11:55", origemGovernanca: false },
    { ordem: 6, horario: "11:55", fim: "12:45", label: "6ª Aula · 11:55 às 12:45", origemGovernanca: false },
  ];
};

// Obtém os horários reais configurados pela Direção em Governança > Ano Letivo para o turno da turma
const getHorariosGovernancaPorTurno = (turno, governanca) => {
  const turnoKey = normalizarTurnoKey(turno);
  const listaHorarios = Array.isArray(governanca?.horarios) ? governanca.horarios : [];
  const cfgTurno = listaHorarios.find(
    (h) => String(h.turno || "").toLowerCase().trim() === turnoKey
  );
  if (cfgTurno && Array.isArray(cfgTurno.aulas) && cfgTurno.aulas.length > 0) {
    return cfgTurno.aulas.map((a, idx) => {
      const ordem = Number(a.numero) || idx + 1;
      const ini = String(a.inicio || "07:30").trim();
      const fim = String(a.fim || "").trim();
      return {
        ordem,
        horario: ini,
        fim,
        label: fim ? `${ordem}ª Aula · ${ini} às ${fim}` : `${ordem}ª Aula · ${ini}`,
        origemGovernanca: true,
      };
    });
  }
  return getHorariosPadraoPorTurno(turno);
};

// Localiza o período oficial configurado pela Direção para o bimestre selecionado
const obterPeriodoBimestreGovernanca = (bimestreStr, governanca) => {
  const numBim = extrairNumeroBimestre(bimestreStr);
  const periodos = Array.isArray(governanca?.periodos) ? governanca.periodos : [];
  return (
    periodos.find(
      (p) => p.tipo === "bimestre" && Number(p.numero) === numBim && p.data_inicio && p.data_fim
    ) || null
  );
};

// Avalia se uma data YYYY-MM-DD é um dia letivo válido conforme Governança > Ano Letivo da escola
const avaliarDiaLetivoGovernanca = (iso, bimestreStr, governanca) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { letivo: false, codigo: "INVALIDA", label: "Data Inválida", motivo: "Selecione uma data válida." };
  }
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0=Dom, 1..5=Seg..Sex, 6=Sáb

  const periodo = obterPeriodoBimestreGovernanca(bimestreStr, governanca);
  if (periodo && (iso < periodo.data_inicio || iso > periodo.data_fim)) {
    return {
      letivo: false,
      codigo: "FORA_PERIODO",
      label: "Fora do Bimestre",
      motivo: `A data selecionada está fora do período configurado pela Direção para o ${bimestreStr} (${formatarDataBr(
        periodo.data_inicio
      )} a ${formatarDataBr(periodo.data_fim)}).`,
    };
  }

  if (dow === 0) {
    return {
      letivo: false,
      codigo: "DOMINGO",
      label: "Domingo",
      motivo: "Domingo não é dia letivo no calendário escolar.",
    };
  }

  const excecoes = Array.isArray(governanca?.excecoes) ? governanca.excecoes : [];
  const excsDaData = excecoes.filter((e) => e.data === iso);

  if (dow >= 1 && dow <= 5) {
    const excNaoLetivo = excsDaData.find((e) => Number(e.status_letivo) === 0);
    if (excNaoLetivo) {
      return {
        letivo: false,
        codigo: "FERIADO_RECESSO",
        label: "Dia Não-Letivo",
        motivo: excNaoLetivo.motivo || "Feriado / Recesso escolar registrado pela Direção.",
      };
    }
    return { letivo: true, codigo: "DIA_LETIVO", label: "Dia Letivo", motivo: null };
  }

  if (dow === 6) {
    const excSabLetivo = excsDaData.find((e) => Number(e.status_letivo) === 1);
    if (excSabLetivo) {
      return {
        letivo: true,
        codigo: "SABADO_LETIVO",
        label: "Sáb. Letivo",
        motivo: excSabLetivo.motivo || "Sábado Letivo configurado pela Direção.",
      };
    }
    return {
      letivo: false,
      codigo: "SABADO_NAO_LETIVO",
      label: "Sábado Não-Letivo",
      motivo: "Este sábado não está ativado como Sábado Letivo pela Direção.",
    };
  }

  return { letivo: true, codigo: "DIA_LETIVO", label: "Dia Letivo", motivo: null };
};

// Conta o total de dias letivos reais de um bimestre conforme Governança > Ano Letivo
const contarDiasLetivosBimestre = (bimestreStr, governanca) => {
  const periodo = obterPeriodoBimestreGovernanca(bimestreStr, governanca);
  if (!periodo?.data_inicio || !periodo?.data_fim) return null;

  const [y1, m1, d1] = periodo.data_inicio.split("-").map(Number);
  const [y2, m2, d2] = periodo.data_fim.split("-").map(Number);
  const cur = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);

  let totalLetivos = 0;
  let sabadosLetivos = 0;
  let feriadosRecessos = 0;

  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
      cur.getDate()
    ).padStart(2, "0")}`;
    const av = avaliarDiaLetivoGovernanca(iso, bimestreStr, governanca);
    if (av.letivo) {
      totalLetivos++;
      if (av.codigo === "SABADO_LETIVO") sabadosLetivos++;
    } else if (av.codigo === "FERIADO_RECESSO") {
      feriadosRecessos++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return {
    totalLetivos,
    sabadosLetivos,
    feriadosRecessos,
    data_inicio: periodo.data_inicio,
    data_fim: periodo.data_fim,
  };
};

// Gera os últimos dias letivos válidos (incluindo Sábados Letivos e excluindo feriados/recessos) dentro do bimestre
const gerarDiasLetivosRecentes = (refIso, bimestreStr, governanca, qtd = 7) => {
  const periodo = obterPeriodoBimestreGovernanca(bimestreStr, governanca);
  const hoje = hojeIso();

  // Define o ponto de partida da janela de datas rápidas
  let tetoIso = refIso || hoje;
  if (periodo?.data_fim && tetoIso > periodo.data_fim) {
    tetoIso = periodo.data_fim;
  }
  if (periodo?.data_inicio && tetoIso < periodo.data_inicio) {
    tetoIso = periodo.data_inicio;
  }

  const [y, m, d] = tetoIso.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const lista = [];
  const cursor = new Date(base);

  // Busca para trás até encontrar `qtd` dias letivos válidos no bimestre
  let tentativas = 0;
  while (lista.length < qtd && tentativas < 60) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate()
    ).padStart(2, "0")}`;
    if (periodo?.data_inicio && iso < periodo.data_inicio) break;
    const av = avaliarDiaLetivoGovernanca(iso, bimestreStr, governanca);
    if (av.letivo) {
      lista.unshift(iso);
    }
    cursor.setDate(cursor.getDate() - 1);
    tentativas++;
  }

  // Se estava no início do bimestre e encontrou menos de `qtd` dias, completa avançando para frente
  if (lista.length < qtd) {
    const cursorFrente = new Date(base);
    cursorFrente.setDate(cursorFrente.getDate() + 1);
    let tentFrente = 0;
    while (lista.length < qtd && tentFrente < 60) {
      const iso = `${cursorFrente.getFullYear()}-${String(
        cursorFrente.getMonth() + 1
      ).padStart(2, "0")}-${String(cursorFrente.getDate()).padStart(2, "0")}`;
      if (periodo?.data_fim && iso > periodo.data_fim) break;
      const av = avaliarDiaLetivoGovernanca(iso, bimestreStr, governanca);
      if (av.letivo && !lista.includes(iso)) {
        lista.push(iso);
      }
      cursorFrente.setDate(cursorFrente.getDate() + 1);
      tentFrente++;
    }
  }

  return lista;
};

const slug = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Extrai e resume os slots da grade horária (`SECRETARIA + HORÁRIOS`) pertencentes a uma Turma + Disciplina
const extrairInfoGradeParaTurma = (slotsGrade = [], turmaObj = null, disciplinaNome = "") => {
  if (!turmaObj || !Array.isArray(slotsGrade) || slotsGrade.length === 0) {
    return {
      possuiNaGrade: false,
      slots: [],
      diasSemana: [],
      ordensPorDia: {},
      totalAulasSemanais: 0,
      resumoCurto: "",
      resumoDetalhado: "",
    };
  }

  const tId = Number(turmaObj.id);
  const tNomeNorm = normTexto(turmaObj.nome);
  const dAlvoNorm = normTexto(disciplinaNome);
  const isAgr = Boolean(turmaObj.is_agrupamento);

  // 1) Filtra slots da turma
  const daTurma = slotsGrade.filter((sl) => {
    const idMatch =
      Number(sl.turma_id) === tId &&
      (sl.is_agrupamento === undefined || Boolean(sl.is_agrupamento) === isAgr);
    const nomeMatch = tNomeNorm && normTexto(sl.turma_nome) === tNomeNorm;
    return idMatch || nomeMatch;
  });

  // 2) Filtra pela disciplina selecionada (com fallback se o professor só tiver 1 disciplina naquela turma)
  let filtrados = daTurma.filter((sl) => {
    if (!dAlvoNorm) return true;
    const slDisc = normTexto(sl.disciplina_nome);
    if (!slDisc) return true;
    return slDisc === dAlvoNorm || slDisc.includes(dAlvoNorm) || dAlvoNorm.includes(slDisc);
  });

  if (filtrados.length === 0 && daTurma.length > 0) {
    const discsUnicas = new Set(daTurma.map((sl) => normTexto(sl.disciplina_nome)).filter(Boolean));
    if (discsUnicas.size <= 1) {
      filtrados = daTurma;
    }
  }

  // Deduplica por (dia_semana, periodo_ordem)
  const seen = new Set();
  const unicos = [];
  for (const s of filtrados) {
    const d = Number(s.dia_semana ?? s.dia);
    const o = Number(s.periodo_ordem ?? s.ordem);
    if (!d || !o) continue;
    const k = `${d}_${o}`;
    if (!seen.has(k)) {
      seen.add(k);
      unicos.push({
        ...s,
        dia_semana: d,
        periodo_ordem: o,
      });
    }
  }

  unicos.sort((a, b) => a.dia_semana - b.dia_semana || a.periodo_ordem - b.periodo_ordem);

  const ordensPorDia = {};
  for (const s of unicos) {
    if (!ordensPorDia[s.dia_semana]) ordensPorDia[s.dia_semana] = [];
    ordensPorDia[s.dia_semana].push(s.periodo_ordem);
  }

  const diasSemana = Object.keys(ordensPorDia)
    .map(Number)
    .sort((a, b) => a - b);

  const partesCurto = diasSemana.map((d) => {
    const ords = ordensPorDia[d];
    return `${DIAS_SEMANA_UPPER[d] || `D${d}`} (${ords.map((o) => `${o}ª`).join("+")})`;
  });

  const partesDetalhado = diasSemana.map((d) => {
    const ords = ordensPorDia[d];
    const ehDupla = ords.length >= 2 && ords[1] === ords[0] + 1;
    return `${DIAS_SEMANA[d] || `Dia ${d}`}: ${ords.map((o) => `${o}ª Aula`).join(" e ")}${
      ehDupla ? " (Geminada)" : ""
    }`;
  });

  return {
    possuiNaGrade: unicos.length > 0,
    slots: unicos,
    diasSemana,
    ordensPorDia,
    totalAulasSemanais: unicos.length,
    resumoCurto: partesCurto.join(" · "),
    resumoDetalhado: partesDetalhado.join("  |  "),
  };
};

// Verifica se um dia letivo (YYYY-MM-DD) tem aula da turma segundo a Grade Horária e retorna as ordens de aula daquele dia
const obterOrdensGradeParaData = (iso, avDia, infoGrade) => {
  if (!iso || !avDia?.letivo || !infoGrade?.possuiNaGrade) return [];
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 1=Seg .. 6=Sáb

  // Dia útil normal (Seg..Sex) ou Sábado com slot próprio na grade
  if (infoGrade.ordensPorDia[dow]?.length) {
    return infoGrade.ordensPorDia[dow];
  }

  // Caso especial: Sábado Letivo configurado pela Direção
  if (dow === 6 && avDia.codigo === "SABADO_LETIVO") {
    const diaRef = detectarDiaReferenciaSabadoLetivo(avDia.motivo);
    if (diaRef && infoGrade.ordensPorDia[diaRef]?.length) {
      return infoGrade.ordensPorDia[diaRef];
    }
    // Se o Sábado Letivo não especificar qual dia da semana repõe, disponibiliza o 1º dia de aula da turma como referência
    const primeiroDia = infoGrade.diasSemana[0];
    if (primeiroDia && infoGrade.ordensPorDia[primeiroDia]?.length) {
      return infoGrade.ordensPorDia[primeiroDia];
    }
  }

  return [];
};

// Gera o cronograma completo de aulas previstas do professor no bimestre cruzando Governança × Grade Horária
const gerarCronogramaGradeNoBimestre = (bimestreStr, governanca, infoGrade, refIso) => {
  if (!infoGrade?.possuiNaGrade) {
    return {
      possuiCronograma: false,
      datasAula: [],
      janelaRecente: [],
      totalDiasComAula: 0,
      totalAulasPrevistas: 0,
    };
  }

  const periodo = obterPeriodoBimestreGovernanca(bimestreStr, governanca);
  const hoje = hojeIso();

  let iniIso = periodo?.data_inicio;
  let fimIso = periodo?.data_fim;
  if (!iniIso || !fimIso) {
    // Fallback caso a escola ainda não tenha cadastrado as datas de início/fim do bimestre
    const [yh, mh, dh] = (refIso || hoje).split("-").map(Number);
    const dIni = new Date(yh, mh - 1, dh - 40);
    const dFim = new Date(yh, mh - 1, dh + 30);
    iniIso = `${dIni.getFullYear()}-${String(dIni.getMonth() + 1).padStart(2, "0")}-${String(
      dIni.getDate()
    ).padStart(2, "0")}`;
    fimIso = `${dFim.getFullYear()}-${String(dFim.getMonth() + 1).padStart(2, "0")}-${String(
      dFim.getDate()
    ).padStart(2, "0")}`;
  }

  const [y1, m1, d1] = iniIso.split("-").map(Number);
  const [y2, m2, d2] = fimIso.split("-").map(Number);
  const cur = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);

  const datasAula = [];
  let totalAulasPrevistas = 0;

  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
      cur.getDate()
    ).padStart(2, "0")}`;
    const av = avaliarDiaLetivoGovernanca(iso, bimestreStr, governanca);
    if (av.letivo) {
      const ordens = obterOrdensGradeParaData(iso, av, infoGrade);
      if (ordens.length > 0) {
        datasAula.push({
          iso,
          ordens,
          ehSabadoLetivo: av.codigo === "SABADO_LETIVO",
          motivoSabado: av.motivo || null,
        });
        totalAulasPrevistas += ordens.length;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Monta janela rápida de até 7 datas centrada/ancorada na data de referência ou hoje
  const alvoIso = refIso || hoje;
  const isos = datasAula.map((x) => x.iso);
  let idxAlvo = isos.findIndex((d) => d >= alvoIso);
  if (idxAlvo === -1) idxAlvo = Math.max(0, isos.length - 1);

  const qtdJanela = 7;
  let startIdx = Math.max(0, idxAlvo - 4);
  if (startIdx + qtdJanela > isos.length) {
    startIdx = Math.max(0, isos.length - qtdJanela);
  }
  const janelaRecente = isos.slice(startIdx, startIdx + qtdJanela);

  return {
    possuiCronograma: datasAula.length > 0,
    datasAula,
    janelaRecente,
    totalDiasComAula: datasAula.length,
    totalAulasPrevistas,
  };
};

export default function Chamada() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkAplicadoRef = useRef(false);

  // ─── Estados do Sequenciador (Badge Pills — Padrão EducaMelhor) ───────────
  const [etapaAtiva, setEtapaAtiva] = useState(1);
  const [disciplinas, setDisciplinas] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [carregandoIniciais, setCarregandoIniciais] = useState(true);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);

  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("");
  const [bimestreSelecionado, setBimestreSelecionado] = useState("1º Bimestre");
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [turmaIsAgrupamento, setTurmaIsAgrupamento] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(hojeIso);
  const [aulaOrdemSelecionada, setAulaOrdemSelecionada] = useState(1);
  const [aulaGeminada, setAulaGeminada] = useState(false);
  const [aulaGeminadaAutoGrade, setAulaGeminadaAutoGrade] = useState(false);

  // ─── Estados de Governança > Ano Letivo & Grade Horária (`Secretaria > Horários`) ───
  const [governancaAnoLetivo, setGovernancaAnoLetivo] = useState({
    periodos: [],
    excecoes: [],
    horarios: [],
  });
  const [slotsGradeProfessor, setSlotsGradeProfessor] = useState([]);
  const [filtrarApenasDiasDaGrade, setFiltrarApenasDiasDaGrade] = useState(true);
  const [mostrarCalendarioBimestreGrade, setMostrarCalendarioBimestreGrade] = useState(false);

  // ─── Elo C: Atestados (`frequencia_justificativas`) & Sincronização c/ Boletim/Secretaria ───
  const [justificativasTurma, setJustificativasTurma] = useState([]);
  const [sincronizadoBoletimInfo, setSincronizadoBoletimInfo] = useState(null);

  const [sincronizandoServidor, setSincronizandoServidor] = useState(false);
  const [ultimoSyncFmt, setUltimoSyncFmt] = useState(null);
  const jaAutoSelecionouBimestreRef = useRef(false);

  // ─── Estados da Chamada Online (Durante o Bimestre) ──────────────────────
  const [buscaAluno, setBuscaAluno] = useState("");
  // Estrutura persistida por contexto: { [aulaKey]: { data, ordem, horario, confirmada: bool, faltas: number[] } }
  const [registroBimestre, setRegistroBimestre] = useState({});
  const [mensagem, setMensagem] = useState(null);

  // ─── Estados de Clonagem e Migração EDUCADF (Final do Bimestre / Tempo Real) ───
  const [abaVisualizacao, setAbaVisualizacao] = useState("diario"); // "diario" | "migracao" | "pdf"
  const [csvModeloRaw, setCsvModeloRaw] = useState(null);
  const [csvClonadoPreview, setCsvClonadoPreview] = useState(null);
  const [migrandoEducaDF, setMigrandoEducaDF] = useState(false);
  const [agenteEducaDFInfo, setAgenteEducaDFInfo] = useState({
    credencial_configurada: false,
    login: null,
    conectado: false,
  });
  const [jobMigracao, setJobMigracao] = useState(null);

  // ─── Modal Inline de Conexão Rápida EDUCADF (Etapa 0 sem sair da Chamada) ───
  const [modalCredencialOpen, setModalCredencialOpen] = useState(false);
  const [credLoginInput, setCredLoginInput] = useState("");
  const [credSenhaInput, setCredSenhaInput] = useState("");
  const [credPerfilInput, setCredPerfilInput] = useState("professor");
  const [salvandoCredencial, setSalvandoCredencial] = useState(false);

  // ─── Estados do Motor Opcional PDF EDUCADF ───────────────────────────────
  const pdfInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const [modeloPdf, setModeloPdf] = useState(null);
  const [lendoPdf, setLendoPdf] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [pdfGerado, setPdfGerado] = useState(null);

  const showToast = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => {
      setMensagem((atual) => (atual?.texto === texto ? null : atual));
    }, 4500);
  };

  // ─── Helpers de Semestralidade (mesma regra de Planos e Avaliações) ──────
  const isTurmaSemestral = (t) => {
    const sem = Number(t?.semestre ?? 0);
    if (t?.is_agrupamento) return sem === 1 || sem === 2;
    const regime = String(t?.regime || "anual").toLowerCase().trim();
    return regime === "semestral" && (sem === 1 || sem === 2);
  };

  const getTurmaBadge = (t) => {
    if (t?.is_agrupamento) {
      const label = t.agrupamento_tipo ? `Agrupamento / ${t.agrupamento_tipo}` : "Agrupamento / IFA";
      const sem = Number(t?.semestre ?? 0);
      const semSuffix = sem === 1 ? " (1º Sem)" : sem === 2 ? " (2º Sem)" : "";
      return {
        label: `${label}${semSuffix}`,
        bg: "rgba(168,85,247,0.2)",
        text: "#d8b4fe",
        border: "rgba(168,85,247,0.4)",
      };
    }
    const regime = String(t?.regime || "anual").toLowerCase().trim();
    if (regime === "semestral") {
      const sem = Number(t?.semestre ?? 0);
      if (sem === 1) {
        return {
          label: "1º Sem (1º/2º Bim)",
          bg: "rgba(6,182,212,0.2)",
          text: "#67e8f9",
          border: "rgba(6,182,212,0.4)",
        };
      }
      if (sem === 2) {
        return {
          label: "2º Sem (3º/4º Bim)",
          bg: "rgba(245,158,11,0.2)",
          text: "#fcd34d",
          border: "rgba(245,158,11,0.4)",
        };
      }
      return {
        label: "Semestral",
        bg: "rgba(6,182,212,0.2)",
        text: "#67e8f9",
        border: "rgba(6,182,212,0.4)",
      };
    }
    return {
      label: "Anual",
      bg: "rgba(148,163,184,0.15)",
      text: "#94a3b8",
      border: "rgba(148,163,184,0.3)",
    };
  };

  // ─── 0) Carrega Governança (Ano Letivo) + Grade Horária (`Secretaria > Horários`) ───
  useEffect(() => {
    let ativo = true;
    const carregarConfigEGrade = async () => {
      try {
        const [resChamada, resMeuHorario] = await Promise.all([
          api.get("/professores/me/chamada").catch(() => null),
          api.get("/grade/meu-horario").catch(() => null),
        ]);

        if (!ativo) return;

        // 1) Hidrata Governança do Ano Letivo
        if (resChamada?.data?.ok && resChamada.data.governanca) {
          setGovernancaAnoLetivo(resChamada.data.governanca);
        } else {
          const escolaId = localStorage.getItem("escola_id");
          const resGov = await api
            .get("/governanca/ano-letivo-config", { params: { escola_id: escolaId } })
            .catch(() => null);
          if (ativo && resGov?.data?.ok) {
            setGovernancaAnoLetivo({
              periodos: resGov.data.periodos || [],
              excecoes: resGov.data.excecoes || [],
              horarios: resGov.data.horarios || [],
            });
          }
        }

        // 2) Hidrata os slots da Grade Horária do Professor (`Secretaria > Horários`)
        const slotsViaChamada = Array.isArray(resChamada?.data?.grade_horaria?.slots)
          ? resChamada.data.grade_horaria.slots
          : [];
        const slotsViaMeuHorario = Array.isArray(resMeuHorario?.data?.slots)
          ? resMeuHorario.data.slots
          : [];

        const combinados = [...slotsViaChamada];
        const seen = new Set(
          combinados.map(
            (s) => `${s.is_agrupamento ? "agr" : "reg"}_${s.turma_id}_${s.dia_semana}_${s.periodo_ordem}`
          )
        );
        for (const s of slotsViaMeuHorario) {
          const d = Number(s.dia_semana ?? s.dia);
          const o = Number(s.periodo_ordem ?? s.ordem);
          const k = `reg_${s.turma_id}_${d}_${o}`;
          if (!seen.has(k)) {
            seen.add(k);
            combinados.push({
              ...s,
              dia_semana: d,
              periodo_ordem: o,
              is_agrupamento: false,
            });
          }
        }

        if (combinados.length > 0) {
          setSlotsGradeProfessor(combinados);
        }

        if (resChamada?.data?.agente_educadf) {
          setAgenteEducaDFInfo({
            credencial_configurada: Boolean(resChamada.data.agente_educadf.credencial_configurada),
            login: resChamada.data.agente_educadf.login || null,
            conectado: Boolean(resChamada.data.agente_educadf.conectado),
          });
          if (resChamada.data.agente_educadf.login) {
            setCredLoginInput(resChamada.data.agente_educadf.login);
          }
        }
      } catch (e) {
        console.warn("Não foi possível carregar governança / grade horária:", e);
      }
    };
    carregarConfigEGrade();
    return () => {
      ativo = false;
    };
  }, []);

  // ─── 1) Carrega Disciplinas do Professor (com suporte a Deep-Link do Meu Horário) ───
  useEffect(() => {
    let ativo = true;
    const carregarDisciplinas = async () => {
      setCarregandoIniciais(true);
      try {
        const res = await api.get("/professores/me/disciplinas").catch(() => null);
        let lista = [];
        if (res?.data?.ok && Array.isArray(res.data.disciplinas) && res.data.disciplinas.length > 0) {
          lista = res.data.disciplinas.map((d) => d.nome);
        } else {
          // Fallback caso o usuário logado seja Diretor/Coordenação visualizando a tela
          const resAll = await api.get("/disciplinas").catch(() => null);
          const arr = Array.isArray(resAll?.data) ? resAll.data : resAll?.data?.disciplinas || [];
          lista = arr.map((d) => d.nome || d.sigla).filter(Boolean).slice(0, 12);
        }
        if (!lista.length) {
          lista = ["MATEMÁTICA", "LÍNGUA PORTUGUESA", "CIÊNCIAS NATURAIS", "HISTÓRIA", "GEOGRAFIA"];
        }
        if (ativo) {
          setDisciplinas(lista);
          const discQuery = searchParams.get("disciplina");
          if (discQuery) {
            const qNorm = normTexto(discQuery);
            const encontrada = lista.find(
              (d) => normTexto(d) === qNorm || normTexto(d).includes(qNorm) || qNorm.includes(normTexto(d))
            );
            setDisciplinaSelecionada(encontrada || lista[0]);
          } else {
            setDisciplinaSelecionada(lista[0]);
          }
        }
      } finally {
        if (ativo) setCarregandoIniciais(false);
      }
    };
    carregarDisciplinas();
    return () => {
      ativo = false;
    };
  }, []);

  // ─── 2) Carrega Turmas quando a Disciplina muda ──────────────────────────
  useEffect(() => {
    if (!disciplinaSelecionada) {
      setTurmas([]);
      return;
    }
    let ativo = true;
    const carregarTurmas = async () => {
      try {
        const res = await api
          .get("/professores/me/turmas", { params: { disciplina: disciplinaSelecionada } })
          .catch(() => null);
        let lista = [];
        if (res?.data?.ok && Array.isArray(res.data.turmas) && res.data.turmas.length > 0) {
          lista = res.data.turmas;
        } else {
          // Fallback para Direção/Secretaria visualizando a página
          const resAll = await api.get("/turmas").catch(() => null);
          const arr = Array.isArray(resAll?.data) ? resAll.data : resAll?.data?.turmas || [];
          const anoAtual = new Date().getFullYear();
          lista = arr
            .filter((t) => !t.ano || Number(t.ano) === anoAtual)
            .slice(0, 15)
            .map((t) => ({
              id: t.id,
              nome: t.nome || t.turma,
              turno: t.turno || "Vespertino",
              etapa: t.etapa || "ENSINO FUNDAMENTAL",
              regime: t.regime || "anual",
              semestre: Number(t.semestre ?? 0),
            }));
        }
        if (ativo) {
          setTurmas(lista);
        }
      } catch (err) {
        console.error("Erro ao carregar turmas para chamada:", err);
      }
    };
    carregarTurmas();
    return () => {
      ativo = false;
    };
  }, [disciplinaSelecionada]);

  // Bimestres disponíveis conforme semestralidade
  const bimestresDisponiveis = useMemo(() => {
    if (turmas.length > 0) {
      const todasSemestrais = turmas.every((t) => isTurmaSemestral(t));
      if (todasSemestrais) {
        const temSem1 = turmas.some((t) => Number(t?.semestre ?? 0) === 1);
        const temSem2 = turmas.some((t) => Number(t?.semestre ?? 0) === 2);
        if (temSem1 && !temSem2) return ["1º Bimestre", "2º Bimestre"];
        if (temSem2 && !temSem1) return ["3º Bimestre", "4º Bimestre"];
      }
    }
    return ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
  }, [turmas]);

  // Auto-seleciona o Bimestre vigente na escola conforme a data de hoje e os períodos da Governança
  useEffect(() => {
    if (jaAutoSelecionouBimestreRef.current) return;
    const periodos = governancaAnoLetivo?.periodos || [];
    if (!periodos.length) return;
    const refData = searchParams.get("data") || hojeIso();
    const perVigente = periodos.find(
      (p) =>
        p.tipo === "bimestre" &&
        p.data_inicio &&
        p.data_fim &&
        refData >= p.data_inicio &&
        refData <= p.data_fim
    );
    if (perVigente) {
      const labelVigente = `${perVigente.numero}º Bimestre`;
      if (bimestresDisponiveis.includes(labelVigente)) {
        setBimestreSelecionado(labelVigente);
        jaAutoSelecionouBimestreRef.current = true;
      }
    }
  }, [governancaAnoLetivo.periodos, bimestresDisponiveis, searchParams]);

  useEffect(() => {
    if (bimestreSelecionado && !bimestresDisponiveis.includes(bimestreSelecionado)) {
      setBimestreSelecionado(bimestresDisponiveis[0] || "1º Bimestre");
    }
  }, [bimestresDisponiveis, bimestreSelecionado]);

  // Turmas compatíveis com o bimestre selecionado
  const turmasCompativeis = useMemo(() => {
    const isBim1ou2 = bimestreSelecionado === "1º Bimestre" || bimestreSelecionado === "2º Bimestre";
    const isBim3ou4 = bimestreSelecionado === "3º Bimestre" || bimestreSelecionado === "4º Bimestre";

    const filtradas = !bimestreSelecionado
      ? turmas
      : turmas.filter((t) => {
          const isSemestral = isTurmaSemestral(t);
          if (!isSemestral) return true;
          const sem = Number(t?.semestre ?? 0);
          if (isBim1ou2 && sem === 2) return false;
          if (isBim3ou4 && sem === 1) return false;
          return true;
        });

    const seen = new Set();
    return filtradas.filter((t) => {
      const k = `${t.is_agrupamento ? "agr" : "reg"}_${t.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [turmas, bimestreSelecionado]);

  // Auto-seleciona a turma (respeitando deep-link `?turma_id=` e `is_agrupamento` sem colisão de IDs)
  useEffect(() => {
    if (turmasCompativeis.length > 0) {
      if (!deepLinkAplicadoRef.current) {
        const turmaQuery = searchParams.get("turma_id");
        const agrQuery = searchParams.get("is_agrupamento");
        const dataQuery = searchParams.get("data");
        const ordemQuery = searchParams.get("ordem");

        if (turmaQuery) {
          const tMatch =
            turmasCompativeis.find(
              (t) =>
                String(t.id) === String(turmaQuery) &&
                (agrQuery == null || Boolean(t.is_agrupamento) === (agrQuery === "1" || agrQuery === "true"))
            ) || turmasCompativeis.find((t) => String(t.id) === String(turmaQuery));
          if (tMatch) {
            setTurmaSelecionada(tMatch.id);
            setTurmaIsAgrupamento(Boolean(tMatch.is_agrupamento));
            if (dataQuery && /^\d{4}-\d{2}-\d{2}$/.test(dataQuery)) {
              setDataSelecionada(dataQuery);
            }
            if (ordemQuery && Number(ordemQuery) > 0) {
              setAulaOrdemSelecionada(Number(ordemQuery));
            }
            setEtapaAtiva(4);
            deepLinkAplicadoRef.current = true;
            return;
          }
        }
      }

      const existe = turmasCompativeis.some(
        (t) =>
          String(t.id) === String(turmaSelecionada) &&
          Boolean(t.is_agrupamento) === Boolean(turmaIsAgrupamento)
      );
      if (!existe) {
        setTurmaSelecionada(turmasCompativeis[0].id);
        setTurmaIsAgrupamento(Boolean(turmasCompativeis[0].is_agrupamento));
      }
    } else {
      setTurmaSelecionada("");
      setTurmaIsAgrupamento(false);
    }
  }, [turmasCompativeis, turmaSelecionada, turmaIsAgrupamento, searchParams]);

  const turmaObj = useMemo(
    () =>
      turmasCompativeis.find(
        (t) =>
          String(t.id) === String(turmaSelecionada) &&
          Boolean(t.is_agrupamento) === Boolean(turmaIsAgrupamento)
      ) ||
      turmas.find(
        (t) =>
          String(t.id) === String(turmaSelecionada) &&
          Boolean(t.is_agrupamento) === Boolean(turmaIsAgrupamento)
      ) ||
      turmasCompativeis.find((t) => String(t.id) === String(turmaSelecionada)) ||
      turmas.find((t) => String(t.id) === String(turmaSelecionada)) ||
      null,
    [turmasCompativeis, turmas, turmaSelecionada, turmaIsAgrupamento]
  );

  // ─── Informações da Grade Horária (`Secretaria > Horários`) para a Turma + Disciplina atual ───
  const infoGradeTurma = useMemo(
    () => extrairInfoGradeParaTurma(slotsGradeProfessor, turmaObj, disciplinaSelecionada),
    [slotsGradeProfessor, turmaObj, disciplinaSelecionada]
  );

  // Cronograma de todas as datas de aula da turma no bimestre segundo Governança × Grade Horária
  const cronogramaGradeBimestre = useMemo(
    () =>
      gerarCronogramaGradeNoBimestre(
        bimestreSelecionado,
        governancaAnoLetivo,
        infoGradeTurma,
        dataSelecionada || hojeIso()
      ),
    [bimestreSelecionado, governancaAnoLetivo, infoGradeTurma, dataSelecionada]
  );

  // Quando a turma, o bimestre ou a grade horária mudam, posiciona automaticamente a data selecionada
  const ultimaTurmaGradeAutoRef = useRef("");
  useEffect(() => {
    const contextoKey = `${turmaIsAgrupamento ? "agr" : "reg"}_${turmaSelecionada}_${disciplinaSelecionada}_${bimestreSelecionado}_${infoGradeTurma.possuiNaGrade}`;
    const mudouContexto = ultimaTurmaGradeAutoRef.current !== contextoKey;
    ultimaTurmaGradeAutoRef.current = contextoKey;

    const avAtual = avaliarDiaLetivoGovernanca(
      dataSelecionada,
      bimestreSelecionado,
      governancaAnoLetivo
    );

    if (infoGradeTurma.possuiNaGrade && cronogramaGradeBimestre.datasAula.length > 0) {
      const ordensHojeNaData = obterOrdensGradeParaData(
        dataSelecionada,
        avAtual,
        infoGradeTurma
      );
      if (!avAtual.letivo || (mudouContexto && ordensHojeNaData.length === 0)) {
        const hoje = hojeIso();
        const passadasOuHoje = cronogramaGradeBimestre.datasAula.filter((d) => d.iso <= hoje);
        const melhorData =
          passadasOuHoje.length > 0
            ? passadasOuHoje[passadasOuHoje.length - 1].iso
            : cronogramaGradeBimestre.datasAula[0].iso;
        if (melhorData && melhorData !== dataSelecionada) {
          setDataSelecionada(melhorData);
        }
      }
      return;
    }

    if (!avAtual.letivo) {
      const candidatos = gerarDiasLetivosRecentes(
        hojeIso(),
        bimestreSelecionado,
        governancaAnoLetivo,
        7
      );
      if (candidatos.length > 0) {
        setDataSelecionada(candidatos[candidatos.length - 1]);
      }
    }
  }, [
    turmaSelecionada,
    turmaIsAgrupamento,
    disciplinaSelecionada,
    bimestreSelecionado,
    governancaAnoLetivo,
    infoGradeTurma,
    cronogramaGradeBimestre.datasAula,
  ]);

  // ─── 3) Carrega Alunos Reais da Turma / Agrupamento Selecionado ──────────
  useEffect(() => {
    if (!turmaSelecionada) {
      setAlunos([]);
      return;
    }
    let ativo = true;
    const ehAgr = Boolean(turmaObj?.is_agrupamento ?? turmaIsAgrupamento);
    const carregarAlunosDaTurma = async () => {
      setCarregandoAlunos(true);
      try {
        const res = await api
          .get(`/turmas/${turmaSelecionada}/alunos`, {
            params: { is_agrupamento: ehAgr ? 1 : 0 },
          })
          .catch(() => null);
        if (ativo && res?.data?.ok && Array.isArray(res.data.alunos) && res.data.alunos.length > 0) {
          const ordenados = [...res.data.alunos]
            .sort((a, b) =>
              String(a.estudante || a.nome || "").localeCompare(String(b.estudante || b.nome || ""))
            )
            .map((a, idx) => ({
              id: a.id || a.aluno_id || idx + 1,
              nr: idx + 1,
              codigo: a.codigo || a.matricula || String(100000 + idx + 1),
              nome: String(a.estudante || a.nome || "").toUpperCase(),
              turma_origem_nome: a.turma_origem_nome ? String(a.turma_origem_nome).trim() : null,
            }));
          setAlunos(ordenados);
        } else if (ativo) {
          setAlunos([]);
        }
      } finally {
        if (ativo) setCarregandoAlunos(false);
      }
    };
    carregarAlunosDaTurma();
    return () => {
      ativo = false;
    };
  }, [turmaSelecionada, turmaIsAgrupamento, turmaObj?.is_agrupamento]);

  // ─── 4) Persistência Híbrida (MySQL Backend + Cache Local) ───────────────
  const storageKey = useMemo(() => {
    const escolaId = localStorage.getItem("escola_id") || "0";
    const prefixAgr = turmaObj?.is_agrupamento ? "agr_" : "";
    return `educa_chamada_v1_${escolaId}_${prefixAgr}${turmaSelecionada || "0"}_${slug(disciplinaSelecionada)}_${slug(bimestreSelecionado)}`;
  }, [turmaSelecionada, turmaObj?.is_agrupamento, disciplinaSelecionada, bimestreSelecionado]);

  useEffect(() => {
    if (!turmaSelecionada || !disciplinaSelecionada) return;
    let ativo = true;

    // 1) Carrega imediatamente do cache local para resposta instantânea
    let mapaLocal = {};
    try {
      const salvo = localStorage.getItem(storageKey);
      if (salvo) {
        mapaLocal = JSON.parse(salvo) || {};
      }
    } catch {
      mapaLocal = {};
    }
    setRegistroBimestre(mapaLocal);
    setJustificativasTurma([]);
    setSincronizadoBoletimInfo(null);

    // 2) Busca os registros salvos no banco de dados MySQL, a Governança, Atestados e a Grade Horária
    const carregarDoServidor = async () => {
      try {
        const res = await api
          .get("/professores/me/chamada", {
            params: {
              turma_id: turmaSelecionada,
              is_agrupamento: turmaObj?.is_agrupamento ? 1 : 0,
              disciplina: disciplinaSelecionada,
              bimestre: bimestreSelecionado,
            },
          })
          .catch(() => null);

        if (!ativo || !res?.data?.ok) return;

        if (res.data.governanca) {
          setGovernancaAnoLetivo(res.data.governanca);
        }

        if (Array.isArray(res.data.justificativas)) {
          setJustificativasTurma(res.data.justificativas);
        }

        if (Array.isArray(res.data.grade_horaria?.slots) && res.data.grade_horaria.slots.length > 0) {
          setSlotsGradeProfessor((prev) => {
            const map = new Map();
            for (const s of [...prev, ...res.data.grade_horaria.slots]) {
              const d = Number(s.dia_semana ?? s.dia);
              const o = Number(s.periodo_ordem ?? s.ordem);
              const k = `${s.is_agrupamento ? "agr" : "reg"}_${s.turma_id}_${s.disciplina_id}_${d}_${o}`;
              map.set(k, { ...s, dia_semana: d, periodo_ordem: o });
            }
            return Array.from(map.values());
          });
        }

        if (res.data.agente_educadf) {
          setAgenteEducaDFInfo({
            credencial_configurada: Boolean(res.data.agente_educadf.credencial_configurada),
            login: res.data.agente_educadf.login || null,
            conectado: Boolean(res.data.agente_educadf.conectado),
          });
          if (res.data.agente_educadf.login) {
            setCredLoginInput((prev) => prev || res.data.agente_educadf.login);
          }
          setJobMigracao(res.data.agente_educadf.job || null);
          setMigrandoEducaDF(res.data.agente_educadf.job?.status === "running");
        } else {
          setJobMigracao(null);
          setMigrandoEducaDF(false);
        }

        const registrosDb = res.data.registros || {};
        const mesclado = { ...mapaLocal, ...registrosDb };
        setRegistroBimestre(mesclado);
        try {
          localStorage.setItem(storageKey, JSON.stringify(mesclado));
        } catch (_) {}
      } catch (e) {
        console.warn("Erro ao sincronizar chamada do servidor:", e);
      }
    };

    carregarDoServidor();
    return () => {
      ativo = false;
    };
  }, [storageKey, turmaSelecionada, turmaObj?.is_agrupamento, disciplinaSelecionada, bimestreSelecionado]);

  const salvarNoStorage = async (novoMapa, exibirFeedback = false, aulasParaSincronizar = null) => {
    setRegistroBimestre(novoMapa);
    try {
      localStorage.setItem(storageKey, JSON.stringify(novoMapa));
    } catch (e) {
      console.error("Erro ao salvar chamada localmente:", e);
    }

    // Persiste no banco de dados MySQL (com validação de Governança > Ano Letivo e sync imediato c/ Boletim)
    const listaAulas =
      Array.isArray(aulasParaSincronizar) && aulasParaSincronizar.length > 0
        ? aulasParaSincronizar
        : [novoMapa[aulaKeyAtual]].filter(Boolean);

    if (turmaSelecionada && disciplinaSelecionada && listaAulas.length > 0) {
      setSincronizandoServidor(true);
      try {
        const res = await api.post("/professores/me/chamada", {
          bimestre: bimestreSelecionado,
          turma_id: turmaSelecionada,
          is_agrupamento: turmaObj?.is_agrupamento ? 1 : 0,
          disciplina: disciplinaSelecionada,
          aulas: listaAulas,
        });
        if (res?.data?.ok) {
          const agora = new Date();
          setUltimoSyncFmt(
            `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`
          );
          if (res.data.sincronizacao_boletim) {
            setSincronizadoBoletimInfo(res.data.sincronizacao_boletim);
          }
          if (exibirFeedback) {
            showToast(
              "success",
              `✓ Chamada salva e sincronizada com o Boletim & Secretaria (${turmaObj?.nome || "Turma"} · ${formatarDataBr(
                dataSelecionada
              )})!`
            );
          }
        }
      } catch (err) {
        const msgErro =
          err?.response?.data?.message ||
          "A chamada foi salva neste dispositivo, mas não pôde ser sincronizada com o servidor.";
        showToast("error", msgErro);
      } finally {
        setSincronizandoServidor(false);
      }
    } else if (exibirFeedback) {
      showToast(
        "success",
        `✓ Chamada salva com sucesso em ${turmaObj?.nome || "Turma"} (${formatarDataBr(dataSelecionada)})!`
      );
    }
  };

  // Horários disponíveis para a turma (conectados à Governança > Ano Letivo > Horários por Turno)
  const horariosDisponiveis = useMemo(
    () => getHorariosGovernancaPorTurno(turmaObj?.turno, governancaAnoLetivo),
    [turmaObj?.turno, governancaAnoLetivo]
  );

  // Avaliação do dia selecionado perante o calendário letivo da escola (Governança)
  const avaliacaoDiaAtual = useMemo(
    () => avaliarDiaLetivoGovernanca(dataSelecionada, bimestreSelecionado, governancaAnoLetivo),
    [dataSelecionada, bimestreSelecionado, governancaAnoLetivo]
  );

  // Quais ordens de aula (`1ª`..`6ª`) pertencem ao professor nesta turma/disciplina na data selecionada (via Grade Horária)
  const ordensDoProfessorNaDataAtual = useMemo(
    () => obterOrdensGradeParaData(dataSelecionada, avaliacaoDiaAtual, infoGradeTurma),
    [dataSelecionada, avaliacaoDiaAtual, infoGradeTurma]
  );

  // Auto-seleciona o horário exato do professor na turma e auto-ativa Aula Geminada quando a data ou turma muda
  useEffect(() => {
    if (ordensDoProfessorNaDataAtual.length > 0) {
      const primeiraOrdem = ordensDoProfessorNaDataAtual[0];
      const temGeminadaConsecutiva =
        ordensDoProfessorNaDataAtual.length >= 2 &&
        ordensDoProfessorNaDataAtual.includes(primeiraOrdem + 1);

      setAulaOrdemSelecionada(primeiraOrdem);
      setAulaGeminada(temGeminadaConsecutiva);
      setAulaGeminadaAutoGrade(temGeminadaConsecutiva);
      return;
    }

    setAulaGeminadaAutoGrade(false);
    if (
      horariosDisponiveis.length > 0 &&
      !horariosDisponiveis.some((h) => h.ordem === aulaOrdemSelecionada)
    ) {
      setAulaOrdemSelecionada(horariosDisponiveis[0].ordem);
    }
  }, [dataSelecionada, turmaSelecionada, disciplinaSelecionada, ordensDoProfessorNaDataAtual]);

  const horarioAtualObj = useMemo(
    () => horariosDisponiveis.find((h) => h.ordem === aulaOrdemSelecionada) || horariosDisponiveis[0],
    [horariosDisponiveis, aulaOrdemSelecionada]
  );

  const resumoPeriodoBimestre = useMemo(
    () => contarDiasLetivosBimestre(bimestreSelecionado, governancaAnoLetivo),
    [bimestreSelecionado, governancaAnoLetivo]
  );

  const aulaKeyAtual = `${dataSelecionada}#${horarioAtualObj?.ordem || 1}`;
  const proxOrdemGeminada = (horarioAtualObj?.ordem || 1) + 1;
  const aulaKeyGeminada = `${dataSelecionada}#${proxOrdemGeminada}`;

  const registroAulaAtual = registroBimestre[aulaKeyAtual] || {
    data: dataSelecionada,
    ordem: horarioAtualObj?.ordem || 1,
    horario: horarioAtualObj?.horario || "07:30",
    horario_fim: horarioAtualObj?.fim || null,
    confirmada: false,
    faltas: [],
  };

  const faltasSetAtual = useMemo(
    () => new Set(registroAulaAtual.faltas || []),
    [registroAulaAtual.faltas]
  );

  // Alternar presença/falta de um estudante
  const alternarFaltaAluno = (alunoId) => {
    if (!avaliacaoDiaAtual.letivo) {
      showToast("error", `Não é possível registrar chamada: ${avaliacaoDiaAtual.motivo}`);
      return;
    }
    const atual = new Set(registroAulaAtual.faltas || []);
    if (atual.has(alunoId)) {
      atual.delete(alunoId);
    } else {
      atual.add(alunoId);
    }
    const novasFaltas = [...atual];
    const jaEstavaExportada = Boolean(registroAulaAtual.educadf_exportado_em_fmt);
    const aulaPrincipal = {
      ...registroAulaAtual,
      data: dataSelecionada,
      ordem: horarioAtualObj?.ordem || 1,
      horario: horarioAtualObj?.horario || "07:30",
      horario_fim: horarioAtualObj?.fim || null,
      confirmada: true, // Ao marcar falta, já marca a aula como dada
      faltas: novasFaltas,
      educadf_status: jaEstavaExportada ? "PENDENTE_ATUALIZACAO" : registroAulaAtual.educadf_status || null,
      educadf_exportado_em_fmt: null,
    };
    const novoMapa = {
      ...registroBimestre,
      [aulaKeyAtual]: aulaPrincipal,
    };
    const aulasSync = [aulaPrincipal];

    // Se Aula Geminada estiver ativa, replica para a aula seguinte do mesmo dia
    if (aulaGeminada && proxOrdemGeminada <= horariosDisponiveis.length) {
      const hProx = horariosDisponiveis.find((h) => h.ordem === proxOrdemGeminada);
      const regGemAnt = registroBimestre[aulaKeyGeminada];
      const aulaGem = {
        ...regGemAnt,
        data: dataSelecionada,
        ordem: proxOrdemGeminada,
        horario: hProx?.horario || "",
        horario_fim: hProx?.fim || null,
        confirmada: true,
        faltas: novasFaltas,
        educadf_status: regGemAnt?.educadf_exportado_em_fmt
          ? "PENDENTE_ATUALIZACAO"
          : regGemAnt?.educadf_status || null,
        educadf_exportado_em_fmt: null,
      };
      novoMapa[aulaKeyGeminada] = aulaGem;
      aulasSync.push(aulaGem);
    }

    salvarNoStorage(novoMapa, false, aulasSync);
  };

  const marcarTodosPresentes = () => {
    if (!avaliacaoDiaAtual.letivo) {
      showToast("error", `Não é possível registrar chamada: ${avaliacaoDiaAtual.motivo}`);
      return;
    }
    const tinhaFaltasAntes = (registroAulaAtual.faltas || []).length > 0;
    const jaEstavaExportada = Boolean(registroAulaAtual.educadf_exportado_em_fmt);
    const aulaPrincipal = {
      ...registroAulaAtual,
      data: dataSelecionada,
      ordem: horarioAtualObj?.ordem || 1,
      horario: horarioAtualObj?.horario || "07:30",
      horario_fim: horarioAtualObj?.fim || null,
      confirmada: true,
      faltas: [],
      educadf_status:
        jaEstavaExportada && tinhaFaltasAntes
          ? "PENDENTE_ATUALIZACAO"
          : registroAulaAtual.educadf_status || null,
      educadf_exportado_em_fmt:
        jaEstavaExportada && tinhaFaltasAntes ? null : registroAulaAtual.educadf_exportado_em_fmt || null,
    };
    const novoMapa = {
      ...registroBimestre,
      [aulaKeyAtual]: aulaPrincipal,
    };
    const aulasSync = [aulaPrincipal];

    if (aulaGeminada && proxOrdemGeminada <= horariosDisponiveis.length) {
      const hProx = horariosDisponiveis.find((h) => h.ordem === proxOrdemGeminada);
      const regGemAnt = registroBimestre[aulaKeyGeminada];
      const gemTinhaFaltas = (regGemAnt?.faltas || []).length > 0;
      const gemExportada = Boolean(regGemAnt?.educadf_exportado_em_fmt);
      const aulaGem = {
        ...regGemAnt,
        data: dataSelecionada,
        ordem: proxOrdemGeminada,
        horario: hProx?.horario || "",
        horario_fim: hProx?.fim || null,
        confirmada: true,
        faltas: [],
        educadf_status:
          gemExportada && gemTinhaFaltas ? "PENDENTE_ATUALIZACAO" : regGemAnt?.educadf_status || null,
        educadf_exportado_em_fmt:
          gemExportada && gemTinhaFaltas ? null : regGemAnt?.educadf_exportado_em_fmt || null,
      };
      novoMapa[aulaKeyGeminada] = aulaGem;
      aulasSync.push(aulaGem);
    }
    salvarNoStorage(novoMapa, true, aulasSync);
  };

  const alternarConfirmacaoAula = () => {
    if (!avaliacaoDiaAtual.letivo && !registroAulaAtual.confirmada) {
      showToast("error", `Não é possível confirmar aula: ${avaliacaoDiaAtual.motivo}`);
      return;
    }
    const novoStatus = !registroAulaAtual.confirmada;
    const aulaPrincipal = {
      ...registroAulaAtual,
      data: dataSelecionada,
      ordem: horarioAtualObj?.ordem || 1,
      horario: horarioAtualObj?.horario || "07:30",
      horario_fim: horarioAtualObj?.fim || null,
      confirmada: novoStatus,
      faltas: registroAulaAtual.faltas || [],
      educadf_status: novoStatus ? registroAulaAtual.educadf_status || null : null,
      educadf_exportado_em_fmt: novoStatus ? registroAulaAtual.educadf_exportado_em_fmt || null : null,
    };
    const novoMapa = {
      ...registroBimestre,
      [aulaKeyAtual]: aulaPrincipal,
    };
    const aulasSync = [aulaPrincipal];

    if (aulaGeminada && proxOrdemGeminada <= horariosDisponiveis.length) {
      const hProx = horariosDisponiveis.find((h) => h.ordem === proxOrdemGeminada);
      const regGemAnt = registroBimestre[aulaKeyGeminada];
      const aulaGem = {
        ...regGemAnt,
        data: dataSelecionada,
        ordem: proxOrdemGeminada,
        horario: hProx?.horario || "",
        horario_fim: hProx?.fim || null,
        confirmada: novoStatus,
        faltas: registroAulaAtual.faltas || [],
        educadf_status: novoStatus ? regGemAnt?.educadf_status || null : null,
        educadf_exportado_em_fmt: novoStatus ? regGemAnt?.educadf_exportado_em_fmt || null : null,
      };
      novoMapa[aulaKeyGeminada] = aulaGem;
      aulasSync.push(aulaGem);
    }
    salvarNoStorage(novoMapa, false, aulasSync);
    showToast(
      novoStatus ? "success" : "info",
      novoStatus
        ? `✓ Aula confirmada (${formatarDataBr(dataSelecionada)} · ${horarioAtualObj?.label}${
            aulaGeminada ? ` + ${proxOrdemGeminada}ª Aula` : ""
          })`
        : "Aula desmarcada dos lançamentos confirmados."
    );
  };

  // Lista ordenada de todas as aulas confirmadas no bimestre
  const aulasConfirmadasList = useMemo(() => {
    return Object.entries(registroBimestre)
      .filter(([, v]) => v && v.confirmada)
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => String(a.data).localeCompare(String(b.data)) || Number(a.ordem) - Number(b.ordem));
  }, [registroBimestre]);

  const aulasJaExportadasList = useMemo(
    () =>
      aulasConfirmadasList.filter(
        (a) => a.educadf_status === "EXPORTADO" && Boolean(a.educadf_exportado_em_fmt)
      ),
    [aulasConfirmadasList]
  );

  const aulasPendentesExportacaoList = useMemo(
    () =>
      aulasConfirmadasList.filter(
        (a) => !a.educadf_exportado_em_fmt || a.educadf_status === "PENDENTE_ATUALIZACAO"
      ),
    [aulasConfirmadasList]
  );

  // Filtro de busca de alunos
  const alunosFiltrados = useMemo(() => {
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return alunos;
    return alunos.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) ||
        String(a.nr).includes(q) ||
        String(a.codigo || "").toLowerCase().includes(q) ||
        String(a.turma_origem_nome || "").toLowerCase().includes(q)
    );
  }, [alunos, buscaAluno]);

  // Estatísticas acumuladas de faltas por aluno no bimestre
  const faltasAcumuladasPorAluno = useMemo(() => {
    const mapa = {};
    aulasConfirmadasList.forEach((aula) => {
      (aula.faltas || []).forEach((idAluno) => {
        mapa[idAluno] = (mapa[idAluno] || 0) + 1;
      });
    });
    return mapa;
  }, [aulasConfirmadasList]);

  // ELO C — Justificativas / Atestados ativos na data da aula selecionada
  const justificativasAtivasNaDataMap = useMemo(() => {
    const map = new Map();
    if (!dataSelecionada || !Array.isArray(justificativasTurma)) return map;
    for (const j of justificativasTurma) {
      const ini = String(j.data_inicio || "").slice(0, 10);
      const fim = String(j.data_fim || ini).slice(0, 10);
      if (ini && dataSelecionada >= ini && dataSelecionada <= fim) {
        map.set(String(j.aluno_id), j);
      }
    }
    return map;
  }, [justificativasTurma, dataSelecionada]);

  const atestadosDoDiaList = useMemo(() => {
    if (justificativasAtivasNaDataMap.size === 0 || alunos.length === 0) return [];
    const out = [];
    for (const aluno of alunos) {
      const just = justificativasAtivasNaDataMap.get(String(aluno.id));
      if (just) {
        out.push({
          aluno,
          justificativa: just,
          jaMarcadoFalta: faltasSetAtual.has(aluno.id),
        });
      }
    }
    return out;
  }, [alunos, justificativasAtivasNaDataMap, faltasSetAtual]);

  const faltasJustificadasPorAlunoNoBimestre = useMemo(() => {
    const mapa = {};
    if (!Array.isArray(justificativasTurma) || justificativasTurma.length === 0) return mapa;
    const justPorAluno = new Map();
    for (const j of justificativasTurma) {
      const k = String(j.aluno_id);
      if (!justPorAluno.has(k)) justPorAluno.set(k, []);
      justPorAluno.get(k).push({
        ini: String(j.data_inicio || "").slice(0, 10),
        fim: String(j.data_fim || j.data_inicio || "").slice(0, 10),
      });
    }
    for (const aula of aulasConfirmadasList) {
      const dt = String(aula.data || "").slice(0, 10);
      for (const idAluno of aula.faltas || []) {
        const ranges = justPorAluno.get(String(idAluno));
        if (ranges && ranges.some((r) => dt >= r.ini && dt <= r.fim)) {
          mapa[idAluno] = (mapa[idAluno] || 0) + 1;
        }
      }
    }
    return mapa;
  }, [aulasConfirmadasList, justificativasTurma]);

  const aplicarFaltasAtestadosDoDia = () => {
    if (!avaliacaoDiaAtual.letivo || atestadosDoDiaList.length === 0) return;
    const novaLista = new Set(registroAulaAtual.faltas || []);
    for (const item of atestadosDoDiaList) {
      novaLista.add(item.aluno.id);
    }
    const faltasArr = Array.from(novaLista);
    const aulaPrincipal = {
      ...registroAulaAtual,
      data: dataSelecionada,
      ordem: horarioAtualObj?.ordem || 1,
      horario: horarioAtualObj?.horario || "07:30",
      horario_fim: horarioAtualObj?.fim || null,
      faltas: faltasArr,
      confirmada: true,
    };
    const novoMapa = { ...registroBimestre, [aulaKeyAtual]: aulaPrincipal };
    const aulasSync = [aulaPrincipal];

    if (aulaGeminada && proxOrdemGeminada <= horariosDisponiveis.length) {
      const proxObj = horariosDisponiveis.find((h) => h.ordem === proxOrdemGeminada);
      const aulaGem = {
        ...(novoMapa[aulaKeyGeminada] || {}),
        data: dataSelecionada,
        ordem: proxOrdemGeminada,
        horario: proxObj?.horario || "",
        horario_fim: proxObj?.fim || null,
        faltas: faltasArr,
        confirmada: true,
      };
      novoMapa[aulaKeyGeminada] = aulaGem;
      aulasSync.push(aulaGem);
    }
    salvarNoStorage(novoMapa, true, aulasSync);
  };

  // ─── Geração / Clonagem do CSV Oficial EDUCADF em 2º Plano ───────────────
  const gerarCsvClonadoEducaDF = (silencioso = false) => {
    const modoSilencioso = silencioso === true;
    if (alunos.length === 0) {
      if (!modoSilencioso) {
        showToast("error", "Selecione uma turma com estudantes para visualizar a matriz do EDUCADF.");
      }
      return;
    }

    const nomeProf =
      localStorage.getItem("nome_usuario") ||
      localStorage.getItem("userName") ||
      localStorage.getItem("nome") ||
      "PROFESSOR EDUCAMELHOR";
    const etapaEnsino = turmaObj?.etapa || "ENSINO FUNDAMENTAL 9 ANOS";
    const nomeTurma = turmaObj?.nome || "TURMA";

    // Se não houver nenhuma aula confirmada ainda, inclui a aula atual como exemplo para visualização
    const colunasAulas =
      aulasConfirmadasList.length > 0
        ? aulasConfirmadasList
        : [
            {
              key: aulaKeyAtual,
              data: dataSelecionada,
              ordem: horarioAtualObj?.ordem || 1,
              horario: horarioAtualObj?.horario || "07:30",
              confirmada: false,
              faltas: [...faltasSetAtual],
            },
          ];

    const cabecalhosAulas = colunasAulas.map((c) => `${c.data} (${c.ordem}ª - ${c.horario})`);
    const headerRow = [
      "Professor",
      "Disciplina",
      "Turma",
      "Etapa",
      "CodEstudante",
      "Estudante",
      ...cabecalhosAulas,
    ];

    const linhasAlunos = alunos.map((al) => {
      const marcacoes = colunasAulas.map((c) => {
        if (!c.confirmada) return "-";
        const faltou = (c.faltas || []).some((id) => String(id) === String(al.id));
        return faltou ? "F" : "C";
      });
      return [
        nomeProf,
        disciplinaSelecionada,
        nomeTurma,
        etapaEnsino,
        al.codigo,
        al.nome,
        ...marcacoes,
      ];
    });

    const escapeCsv = (val) => {
      const s = String(val ?? "");
      return s.includes(";") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const conteudoCsv = [headerRow, ...linhasAlunos]
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\r\n");

    setCsvModeloRaw(null);
    setCsvClonadoPreview({
      cabecalhosAulas,
      colunasAulas,
      linhas: linhasAlunos,
      csvText: conteudoCsv,
      nomeArquivo: `Chamada-EDUCADF-${slug(nomeTurma)}-${slug(disciplinaSelecionada)}.csv`,
    });
    if (!modoSilencioso) {
      setAbaVisualizacao("migracao");
    }
  };

  // Atualiza automaticamente a matriz em Aba 2 quando mudam os lançamentos ou a turma
  useEffect(() => {
    if (abaVisualizacao === "migracao" && alunos.length > 0 && !csvModeloRaw) {
      gerarCsvClonadoEducaDF(true);
    }
  }, [abaVisualizacao, alunos, aulasConfirmadasList, turmaSelecionada, disciplinaSelecionada, bimestreSelecionado]);

  // Parser RFC-4180 simples que preserva delimitador original (`;` ou `,`)
  const parseCsvLine = (line, delim) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delim && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  // Clona com 100% de fidelidade estrutural um CSV modelo baixado do EDUCADF
  const onImportarCsvEducaDF = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const textoLimpo = (await file.text()).replace(/^\uFEFF/, "");
      const linhasBrutas = textoLimpo.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (linhasBrutas.length < 2) {
        showToast("error", "O arquivo CSV selecionado parece vazio ou inválido.");
        return;
      }

      // Detecta delimitador original (`;` é padrão Excel/EDUCADF PT-BR, `,` alternativo)
      const qtdPontoVirgula = (linhasBrutas[0].match(/;/g) || []).length;
      const qtdVirgula = (linhasBrutas[0].match(/,/g) || []).length;
      const delim = qtdPontoVirgula >= qtdVirgula ? ";" : ",";

      const headerOriginal = parseCsvLine(linhasBrutas[0], delim);
      const rowsOriginais = linhasBrutas.slice(1).map((l) => parseCsvLine(l, delim));

      // Localiza colunas de Código/RE e Nome do Estudante no CSV original
      let idxCod = headerOriginal.findIndex((h) =>
        /cod|re\b|matric|identif/i.test(normTexto(h))
      );
      let idxNome = headerOriginal.findIndex((h) =>
        /estudante|aluno|nome/i.test(normTexto(h))
      );
      if (idxCod === -1 && headerOriginal.length >= 2) idxCod = 0;
      if (idxNome === -1 && headerOriginal.length >= 2) idxNome = idxCod === 0 ? 1 : 0;

      // Detecta convenção de presença do arquivo (`P` ou `C`)
      const temLetraP = rowsOriginais.some((r) =>
        r.some((cell, ci) => ci > Math.max(idxCod, idxNome) && String(cell || "").trim().toUpperCase() === "P")
      );
      const marcaPresenca = temLetraP ? "P" : "C";

      // Mapeia colunas de data do cabeçalho original para registros confirmados do bimestre
      const anoRef = new Date().getFullYear();
      const mapaColunaParaRegistro = new Map();
      const contadoresDataNoCsv = {};

      headerOriginal.forEach((colHeader, colIdx) => {
        if (colIdx === idxCod || colIdx === idxNome) return;
        const txt = String(colHeader || "").trim();
        let isoCol = null;

        const mIso = txt.match(/(\d{4})-(\d{2})-(\d{2})/);
        const mBrAno = txt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        const mBrCurto = txt.match(/\b(\d{2})\/(\d{2})\b/);

        if (mIso) isoCol = `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
        else if (mBrAno) isoCol = `${mBrAno[3]}-${mBrAno[2]}-${mBrAno[1]}`;
        else if (mBrCurto) isoCol = `${anoRef}-${mBrCurto[2]}-${mBrCurto[1]}`;

        if (!isoCol) return;

        contadoresDataNoCsv[isoCol] = (contadoresDataNoCsv[isoCol] || 0) + 1;
        const ocorrenciaDia = contadoresDataNoCsv[isoCol];

        // Procura ordem explícita no cabeçalho ex: "(2 - 08:20)" ou "2ª"
        const mOrd = txt.match(/(?:\(|\b)([1-6])[ªº]?\s*(?:-|aula)/i);
        const ordemExplicita = mOrd ? Number(mOrd[1]) : null;

        const aulasDaData = aulasConfirmadasList.filter((a) => a.data === isoCol);
        if (aulasDaData.length === 0) return;

        const regMatch =
          (ordemExplicita && aulasDaData.find((a) => Number(a.ordem) === ordemExplicita)) ||
          aulasDaData[ocorrenciaDia - 1] ||
          aulasDaData[0];

        if (regMatch) {
          mapaColunaParaRegistro.set(colIdx, regMatch);
        }
      });

      // Se o CSV modelo tinha colunas de datas, injeta nelas preservando 100% da estrutura original!
      if (mapaColunaParaRegistro.size > 0) {
        const mapaAlunoPorRe = new Map();
        const mapaAlunoPorNome = new Map();
        alunos.forEach((al) => {
          const reLimpo = String(al.codigo || "").replace(/\D/g, "").replace(/^0+/, "");
          if (reLimpo) mapaAlunoPorRe.set(reLimpo, al);
          mapaAlunoPorNome.set(normTexto(al.nome), al);
        });

        const novasLinhasCsv = rowsOriginais.map((row) => {
          const novaRow = [...row];
          while (novaRow.length < headerOriginal.length) novaRow.push("");

          const reRow = String(novaRow[idxCod] || "").replace(/\D/g, "").replace(/^0+/, "");
          const nomeRowNorm = normTexto(novaRow[idxNome] || "");
          const alunoMatch =
            (reRow && mapaAlunoPorRe.get(reRow)) ||
            (nomeRowNorm && mapaAlunoPorNome.get(nomeRowNorm)) ||
            null;

          if (alunoMatch) {
            for (const [colIdx, regAula] of mapaColunaParaRegistro.entries()) {
              const faltou = (regAula.faltas || []).some(
                (id) => String(id) === String(alunoMatch.id)
              );
              novaRow[colIdx] = faltou ? "F" : marcaPresenca;
            }
          }
          return novaRow;
        });

        const escapeCell = (val) => {
          const s = String(val ?? "");
          return s.includes(delim) || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        };

        const csvReconstruido = [headerOriginal, ...novasLinhasCsv]
          .map((r) => r.map(escapeCell).join(delim))
          .join("\r\n");

        const indicesAulas = Array.from(mapaColunaParaRegistro.keys());
        const cabecalhosPreview = indicesAulas.map((ci) => headerOriginal[ci]);
        const colunasPreview = indicesAulas.map((ci) => mapaColunaParaRegistro.get(ci));
        const linhasPreview = novasLinhasCsv.map((r) => [
          "",
          disciplinaSelecionada,
          turmaObj?.nome || "",
          "",
          r[idxCod] || "",
          r[idxNome] || "",
          ...indicesAulas.map((ci) => r[ci] || "-"),
        ]);

        setCsvModeloRaw({
          nome: file.name,
          totalLinhas: novasLinhasCsv.length,
          colunasInjetadas: indicesAulas.length,
          delimitador: delim,
        });
        setCsvClonadoPreview({
          cabecalhosAulas: cabecalhosPreview,
          colunasAulas: colunasPreview,
          linhas: linhasPreview,
          csvText: csvReconstruido,
          nomeArquivo: file.name.replace(/\.csv$/i, "") + "-preenchido.csv",
        });
        setAbaVisualizacao("migracao");
        showToast(
          "success",
          `✓ Arquivo original "${file.name}" clonado preservando colunas e delimitador (${indicesAulas.length} coluna(s) preenchida(s))!`
        );
        return;
      }

      // Caso o CSV enviado não possua colunas de datas reconhecíveis, gera a matriz padrão com os alunos
      setCsvModeloRaw({ nome: file.name, totalLinhas: rowsOriginais.length });
      gerarCsvClonadoEducaDF();
      showToast(
        "success",
        `✓ Modelo "${file.name}" lido e matriz gerada com os lançamentos online do bimestre!`
      );
    } catch (err) {
      console.error(err);
      showToast("error", "Erro ao processar o arquivo CSV do EDUCADF.");
    }
  };

  const baixarCsvClonado = () => {
    if (!csvClonadoPreview?.csvText) return;
    const blob = new Blob(["\uFEFF" + csvClonadoPreview.csvText], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvClonadoPreview.nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // ─── Polling em Tempo Real da Migração Playwright (Chamada → EDUCADF) ────
  useEffect(() => {
    if (jobMigracao?.status !== "running" || !turmaSelecionada || !disciplinaSelecionada) {
      return undefined;
    }

    let cancelado = false;
    const timer = setInterval(async () => {
      try {
        const res = await api.get("/professores/me/chamada/exportar-status", {
          params: {
            turma_id: turmaSelecionada,
            is_agrupamento: turmaObj?.is_agrupamento ? 1 : 0,
            disciplina: disciplinaSelecionada,
            bimestre: bimestreSelecionado,
          },
        });
        if (cancelado || !res?.data?.ok) return;

        // Atualiza badges das aulas exportadas em tempo real conforme cada dia é salvo no EDUCADF
        const expMap = res.data.exportadas_map || {};
        if (Object.keys(expMap).length > 0) {
          setRegistroBimestre((prev) => {
            let mudou = false;
            const proximo = { ...prev };
            for (const [k, infoExp] of Object.entries(expMap)) {
              if (proximo[k]) {
                if (
                  proximo[k].educadf_status !== infoExp.educadf_status ||
                  proximo[k].educadf_exportado_em_fmt !== infoExp.educadf_exportado_em_fmt
                ) {
                  proximo[k] = {
                    ...proximo[k],
                    educadf_status: infoExp.educadf_status,
                    educadf_exportado_em_fmt: infoExp.educadf_exportado_em_fmt,
                  };
                  mudou = true;
                }
              }
            }
            if (mudou) {
              try {
                localStorage.setItem(storageKey, JSON.stringify(proximo));
              } catch (_) {}
              return proximo;
            }
            return prev;
          });
        }

        const job = res.data.job;
        if (!job) {
          setMigrandoEducaDF(false);
          setJobMigracao(null);
          return;
        }

        setJobMigracao(job);
        if (job.status !== "running") {
          setMigrandoEducaDF(false);
          if (job.status === "done") {
            showToast(
              "success",
              job.message || "✓ Frequência migrada com sucesso para o portal EDUCADF!"
            );
          } else if (job.status === "partial") {
            showToast(
              "info",
              job.message || "Migração concluída parcialmente. Confira os detalhes na tela."
            );
          } else if (job.status === "error") {
            showToast(
              "error",
              job.message || "Não foi possível concluir a migração para o EDUCADF."
            );
          }
        }
      } catch (err) {
        console.warn("[Chamada->EDUCADF] Falha ao consultar status da migração:", err?.message);
      }
    }, 2500);

    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [
    jobMigracao?.status,
    turmaSelecionada,
    turmaObj?.is_agrupamento,
    disciplinaSelecionada,
    bimestreSelecionado,
    storageKey,
  ]);

  // ─── Dispara a Migração Automatizada Real para o Portal EDUCADF ──────────
  const iniciarMigracaoEducaDF = async ({ apenasPendentes = true, datasEspecificas = null } = {}) => {
    if (!turmaSelecionada || !disciplinaSelecionada) {
      showToast("error", "Selecione a disciplina e a turma antes de migrar para o EDUCADF.");
      return;
    }

    if (aulasConfirmadasList.length === 0) {
      showToast(
        "error",
        "Confirme ao menos uma aula ('✓ Dei esta aula' ou 'Salvar Chamada') antes de migrar a frequência para o EDUCADF."
      );
      return;
    }

    if (!csvClonadoPreview && alunos.length > 0) {
      gerarCsvClonadoEducaDF(true);
    }
    setAbaVisualizacao("migracao");

    if (!agenteEducaDFInfo.credencial_configurada) {
      setModalCredencialOpen(true);
      showToast(
        "info",
        "Conecte sua matrícula e senha do portal EDUCADF para iniciar a migração automática."
      );
      return;
    }

    setMigrandoEducaDF(true);
    try {
      const res = await api.post("/professores/me/chamada/exportar-educadf", {
        bimestre: bimestreSelecionado,
        turma_id: turmaSelecionada,
        is_agrupamento: turmaObj?.is_agrupamento ? 1 : 0,
        disciplina: disciplinaSelecionada,
        apenas_pendentes: apenasPendentes,
        datas: datasEspecificas,
        aulas: aulasConfirmadasList,
      });

      if (res?.data?.ok && res.data.job) {
        setJobMigracao(res.data.job);
        showToast(
          "info",
          res.data.message || "🚀 Agente EDUCA conectado! Lançando frequência no portal EDUCADF..."
        );
      }
    } catch (err) {
      setMigrandoEducaDF(false);
      const codigo = err?.response?.data?.codigo;
      const msg =
        err?.response?.data?.message ||
        "Não foi possível iniciar a migração de frequência para o EDUCADF.";

      if (codigo === "SEM_CREDENCIAIS" || codigo === "CREDENCIAIS_CORROMPIDAS") {
        setModalCredencialOpen(true);
        showToast("error", msg);
        return;
      }
      if (codigo === "EM_EXECUCAO" && err?.response?.data?.job) {
        setJobMigracao(err.response.data.job);
        setMigrandoEducaDF(true);
        showToast("info", msg);
        return;
      }
      if (codigo === "TUDO_JA_EXPORTADO") {
        showToast("info", msg);
        return;
      }
      showToast("error", msg);
    }
  };

  // ─── Salva Credenciais EDUCADF Inline (Criptografia AES-256) sem sair da Chamada ───
  const salvarCredencialEducaDFInline = async (e) => {
    e?.preventDefault?.();
    if (!credLoginInput.trim() || !credSenhaInput.trim()) {
      showToast("error", "Informe seu usuário/matrícula e senha do portal EDUCADF.");
      return;
    }

    setSalvandoCredencial(true);
    try {
      const perfilUsuario = String(localStorage.getItem("perfil") || "").toLowerCase();
      const resp = await api.post("/api/agente/credenciais", {
        educadf_login: credLoginInput.trim(),
        educadf_senha: credSenhaInput.trim(),
        perfil_educadf: credPerfilInput || "professor",
        professor_id:
          perfilUsuario === "professor" ? Number(localStorage.getItem("professor_id")) || 0 : 0,
      });

      if (!resp?.data?.ok) {
        showToast("error", resp?.data?.message || "Erro ao salvar credenciais do EDUCADF.");
        return;
      }

      const credId = resp.data.id;
      if (credId) {
        api.post(`/api/agente/credenciais/${credId}/testar`).catch(() => {});
      }

      setAgenteEducaDFInfo({
        credencial_configurada: true,
        login: credLoginInput.trim(),
        conectado: true,
      });
      setCredSenhaInput("");
      setModalCredencialOpen(false);
      showToast(
        "success",
        "✓ Credenciais do EDUCADF salvas com criptografia AES-256! Você já pode migrar a frequência."
      );
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message || "Não foi possível salvar suas credenciais do EDUCADF."
      );
    } finally {
      setSalvandoCredencial(false);
    }
  };

  // ─── Funções do Motor PDF Opcional (Folha EDUCADF com "X" vetorial) ──────
  const onUploadPdfEducaDF = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLendoPdf(true);
    setPdfGerado(null);
    try {
      const { lerFolhaEducaDF } = await carregarPdf();
      const m = await lerFolhaEducaDF(f);
      setModeloPdf(m);
      setAbaVisualizacao("pdf");
      showToast(
        "success",
        `✓ Folha PDF lida: ${m.turma} · ${m.disciplina} (${m.alunos.length} estudantes).`
      );
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Não foi possível ler o PDF da folha EDUCADF.");
    } finally {
      setLendoPdf(false);
    }
  };

  const gerarPdfClonadoComX = async () => {
    if (!modeloPdf) return;
    setGerandoPdf(true);
    try {
      const { gerarPdfPreenchido, renderizarPagina } = await carregarPdf();
      // Mapeia as faltas online pelo nome/número do aluno para as colunas do PDF
      const faltasPdf = {};
      const confirmadasPdf = new Set();

      modeloPdf.colunas
        .filter((c) => !c.semAula && c.data)
        .forEach((col) => {
          // Procura se o professor confirmou aula nessa data/ordem ou nessa data
          const reg =
            registroBimestre[`${col.data}#${col.ordem || 1}`] ||
            Object.values(registroBimestre).find((r) => r.data === col.data && r.confirmada);

          if (reg && reg.confirmada) {
            confirmadasPdf.add(col.key);
            const nomesAusentes = new Set(
              alunos
                .filter((a) => (reg.faltas || []).some((id) => String(id) === String(a.id)))
                .map((a) => a.nome.trim().toUpperCase())
            );
            const linhasAusentes = modeloPdf.alunos
              .filter(
                (alPdf, idx) =>
                  nomesAusentes.has(String(alPdf.nome || "").trim().toUpperCase()) ||
                  (reg.faltas || []).includes(idx + 1)
              )
              .map((alPdf) => alPdf.linha);
            faltasPdf[col.key] = linhasAusentes;
          }
        });

      // Se nenhuma data coincidiu, preenche a 1ª coluna válida do PDF com a chamada atual para demonstração visual
      if (confirmadasPdf.size === 0) {
        const primeiraCol = modeloPdf.colunas.find((c) => !c.semAula);
        if (primeiraCol) {
          confirmadasPdf.add(primeiraCol.key);
          faltasPdf[primeiraCol.key] = modeloPdf.alunos
            .filter((_, idx) => {
              const alSistema = alunos[idx];
              return alSistema && faltasSetAtual.has(alSistema.id);
            })
            .map((alPdf) => alPdf.linha);
        }
      }

      const bytes = await gerarPdfPreenchido(modeloPdf, faltasPdf, confirmadasPdf);
      const previas = [];
      for (let i = 0; i < modeloPdf.folhas.length; i++) {
        const cv = await renderizarPagina(bytes, i, 100);
        previas.push(cv.toDataURL("image/png"));
      }
      setPdfGerado({
        bytes,
        previas,
        nome: `Chamada-Clonada-${slug(modeloPdf.turma)}-${slug(modeloPdf.disciplina)}`,
      });
      showToast("success", "✓ PDF original do EDUCADF clonado com marcações 'X' de alta definição!");
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Erro ao gerar PDF clonado.");
    } finally {
      setGerandoPdf(false);
    }
  };

  const baixarPdfClonado = async () => {
    if (!pdfGerado) return;
    const { baixarBlob } = await carregarPdf();
    baixarBlob(new Blob([pdfGerado.bytes], { type: "application/pdf" }), `${pdfGerado.nome}.pdf`);
  };

  const diasRecentesTodos = useMemo(
    () =>
      gerarDiasLetivosRecentes(
        dataSelecionada || hojeIso(),
        bimestreSelecionado,
        governancaAnoLetivo,
        7
      ),
    [dataSelecionada, bimestreSelecionado, governancaAnoLetivo]
  );

  // Lista rápida de datas exibida na Etapa 4: prioriza os dias de aula reais do professor na turma (via Grade Horária)
  const diasRecentes = useMemo(() => {
    if (
      filtrarApenasDiasDaGrade &&
      infoGradeTurma.possuiNaGrade &&
      cronogramaGradeBimestre.janelaRecente.length > 0
    ) {
      const base = [...cronogramaGradeBimestre.janelaRecente];
      if (dataSelecionada && !base.includes(dataSelecionada)) {
        base.push(dataSelecionada);
        base.sort();
      }
      return base;
    }
    return diasRecentesTodos;
  }, [
    filtrarApenasDiasDaGrade,
    infoGradeTurma.possuiNaGrade,
    cronogramaGradeBimestre.janelaRecente,
    dataSelecionada,
    diasRecentesTodos,
  ]);

  // Verifica se a data letiva selecionada pertence ou não aos dias da semana do professor na Grade Horária
  const dataAtualPertenceAGrade = useMemo(() => {
    if (!infoGradeTurma.possuiNaGrade || !avaliacaoDiaAtual.letivo) return true;
    return ordensDoProfessorNaDataAtual.length > 0;
  }, [infoGradeTurma.possuiNaGrade, avaliacaoDiaAtual.letivo, ordensDoProfessorNaDataAtual]);

  // Calcula a data de aula da Grade Horária mais próxima para atalho de 1 clique
  const dataAulaGradeMaisProxima = useMemo(() => {
    if (!cronogramaGradeBimestre.datasAula.length) return null;
    const hoje = hojeIso();
    const ateHoje = cronogramaGradeBimestre.datasAula.filter((d) => d.iso <= hoje);
    if (ateHoje.length > 0) return ateHoje[ateHoje.length - 1].iso;
    return cronogramaGradeBimestre.datasAula[0].iso;
  }, [cronogramaGradeBimestre.datasAula]);

  const totalPresentes = Math.max(0, alunos.length - faltasSetAtual.size);
  const percentualPresenca =
    alunos.length > 0 ? Math.round((totalPresentes / alunos.length) * 100) : 100;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER PREMIUM — SEQUENCIADOR DE 4 ETAPAS (BADGE PILLS)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f2a4a 100%)",
          borderRadius: "1.25rem",
          overflow: "hidden",
          boxShadow: "0 10px 32px rgba(15, 23, 42, 0.3)",
        }}
      >
        {/* Topo do Banner */}
        <div
          style={{
            padding: "1.5rem 2rem 1.15rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                borderRadius: "0.875rem",
                padding: "0.75rem",
                boxShadow: "0 4px 16px rgba(6, 182, 212, 0.4)",
                flexShrink: 0,
              }}
            >
              <ClipboardDocumentCheckIcon style={{ width: 28, height: 28, color: "#fff" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <h1
                  style={{
                    fontSize: "1.65rem",
                    fontWeight: 900,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  CHAMADA DIGITAL
                </h1>
                <span
                  style={{
                    fontSize: "0.68rem",
                    background: "rgba(34, 211, 238, 0.16)",
                    border: "1px solid rgba(34, 211, 238, 0.35)",
                    color: "#67e8f9",
                    padding: "2px 9px",
                    borderRadius: "999px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Sincronização EDUCADF
                </span>
              </div>
              <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>
                {disciplinaSelecionada ? (
                  <>
                    <strong style={{ color: "#e2e8f0" }}>{disciplinaSelecionada}</strong>
                    {bimestreSelecionado ? ` · ${bimestreSelecionado}` : ""}
                    {turmaObj ? ` · ${turmaObj.nome}` : ""}
                    {dataSelecionada ? ` · ${formatarDataBr(dataSelecionada)} (${horarioAtualObj?.label})` : ""}
                  </>
                ) : (
                  "Registre a frequência diária online e clone o arquivo oficial para migração no EDUCADF"
                )}
              </div>
            </div>
          </div>

          {/* Seletor de Modo: Diário Online vs Migração EDUCADF */}
          <div
            style={{
              display: "inline-flex",
              background: "rgba(15, 23, 42, 0.65)",
              padding: "4px",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.1)",
              gap: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => setAbaVisualizacao("diario")}
              style={{
                padding: "0.45rem 0.95rem",
                borderRadius: "0.55rem",
                fontSize: "0.76rem",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background:
                  abaVisualizacao === "diario"
                    ? "linear-gradient(135deg, #22d3ee, #0ea5e9)"
                    : "transparent",
                color: abaVisualizacao === "diario" ? "#0f172a" : "#cbd5e1",
              }}
            >
              1. Chamada Online (Bimestre)
            </button>
            <button
              type="button"
              onClick={() => {
                if (!csvClonadoPreview && alunos.length > 0) {
                  gerarCsvClonadoEducaDF();
                } else {
                  setAbaVisualizacao("migracao");
                }
              }}
              style={{
                padding: "0.45rem 0.95rem",
                borderRadius: "0.55rem",
                fontSize: "0.76rem",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background:
                  abaVisualizacao === "migracao"
                    ? "linear-gradient(135deg, #34d399, #10b981)"
                    : "transparent",
                color: abaVisualizacao === "migracao" ? "#0f172a" : "#cbd5e1",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>2. Clonar & Migrar EDUCADF</span>
              {aulasConfirmadasList.length > 0 && (
                <span
                  style={{
                    background: abaVisualizacao === "migracao" ? "#0f172a" : "rgba(16,185,129,0.25)",
                    color: abaVisualizacao === "migracao" ? "#34d399" : "#6ee7b7",
                    padding: "1px 6px",
                    borderRadius: "999px",
                    fontSize: "0.65rem",
                    fontWeight: 900,
                  }}
                >
                  {aulasConfirmadasList.length}
                </span>
              )}
            </button>
            <Link
              to="/professores/horario"
              style={{
                padding: "0.45rem 0.95rem",
                borderRadius: "0.55rem",
                fontSize: "0.76rem",
                fontWeight: 800,
                textDecoration: "none",
                background: "rgba(99, 102, 241, 0.2)",
                border: "1px solid rgba(129, 140, 248, 0.35)",
                color: "#c7d2fe",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Consultar minha grade semanal de aulas"
            >
              <CalendarDaysIcon style={{ width: 15, height: 15 }} />
              <span>Meu Horário</span>
            </Link>
          </div>
        </div>

        {/* Separador */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 2rem" }} />

        {/* ─── Abas do Sequenciador de 4 Etapas ─── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          }}
        >
          {[
            {
              num: 1,
              label: "Selecionar Disciplina",
              done: !!disciplinaSelecionada,
              value: disciplinaSelecionada,
            },
            {
              num: 2,
              label: "Selecionar Bimestre",
              done: !!bimestreSelecionado,
              value: bimestreSelecionado?.replace(" Bimestre", " Bim"),
            },
            {
              num: 3,
              label: "Selecionar Turma",
              done: !!turmaSelecionada,
              value: turmaObj ? turmaObj.nome : "",
            },
            {
              num: 4,
              label: "Data e Aula",
              done: !!dataSelecionada,
              value: `${formatarDataCurta(dataSelecionada).dm} · ${horarioAtualObj?.ordem || 1}ª Aula${
                aulaGeminada ? ` + ${proxOrdemGeminada}ª` : ""
              }`,
            },
          ].map((et, idx) => {
            const isActive = etapaAtiva === et.num;
            const canClick =
              et.num === 1 ||
              (et.num === 2 && !!disciplinaSelecionada) ||
              (et.num === 3 && !!bimestreSelecionado) ||
              (et.num === 4 && !!turmaSelecionada);

            return (
              <button
                key={et.num}
                type="button"
                onClick={() => canClick && setEtapaAtiva(et.num)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "1rem 1.5rem",
                  background: isActive ? "rgba(255,255,255,0.03)" : "transparent",
                  border: "none",
                  borderBottom: isActive ? "3px solid #22d3ee" : "3px solid transparent",
                  borderRight: idx < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  cursor: canClick ? "pointer" : "not-allowed",
                  opacity: canClick ? 1 : 0.45,
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: et.done
                      ? "linear-gradient(135deg,#22d3ee,#0ea5e9)"
                      : isActive
                      ? "rgba(34,211,238,0.18)"
                      : "rgba(255,255,255,0.07)",
                    border: et.done
                      ? "none"
                      : isActive
                      ? "2px solid #22d3ee"
                      : "2px solid rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: et.done ? "0 2px 8px rgba(34,211,238,0.35)" : "none",
                  }}
                >
                  {et.done ? (
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                      <path
                        stroke="#0f172a"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span
                      style={{
                        color: isActive ? "#22d3ee" : "#64748b",
                        fontWeight: 800,
                        fontSize: "0.78rem",
                      }}
                    >
                      {et.num}
                    </span>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        color: isActive ? "#22d3ee" : et.done ? "#38bdf8" : "#64748b",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      ETAPA {et.num}
                    </span>
                    {et.done && (
                      <span
                        style={{
                          fontSize: "0.58rem",
                          background: "rgba(34,211,238,0.18)",
                          color: "#22d3ee",
                          padding: "1px 6px",
                          borderRadius: 999,
                          fontWeight: 800,
                        }}
                      >
                        ✓ OK
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      color: isActive ? "#f8fafc" : et.done ? "#cbd5e1" : "#64748b",
                      marginTop: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {et.done ? et.value : et.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ─── Painel de Seleção da Etapa Ativa (Badge Pills) ─── */}
        <div style={{ padding: "1.35rem 2rem 1.6rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* ETAPA 1 — Disciplina */}
          {etapaAtiva === 1 && (
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.7rem",
                }}
              >
                Selecione a disciplina
              </p>
              {carregandoIniciais ? (
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Carregando disciplinas...</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {disciplinas.map((d) => {
                    const isSel = disciplinaSelecionada === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDisciplinaSelecionada(d);
                          setEtapaAtiva(2);
                        }}
                        style={{
                          padding: "0.52rem 1.15rem",
                          borderRadius: "0.6rem",
                          fontWeight: 700,
                          fontSize: "0.86rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          background: isSel
                            ? "linear-gradient(135deg,#22d3ee,#0ea5e9)"
                            : "rgba(255,255,255,0.07)",
                          color: isSel ? "#0f172a" : "#cbd5e1",
                          border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                          boxShadow: isSel ? "0 4px 14px rgba(34,211,238,0.35)" : "none",
                          transform: isSel ? "scale(1.03)" : "scale(1)",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2 — Bimestre */}
          {etapaAtiva === 2 && (
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.7rem",
                }}
              >
                Selecione o bimestre letivo (Calendário da Governança)
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {bimestresDisponiveis.map((b) => {
                  const isSel = bimestreSelecionado === b;
                  const infoPer = contarDiasLetivosBimestre(b, governancaAnoLetivo);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBimestreSelecionado(b);
                        setEtapaAtiva(3);
                      }}
                      style={{
                        padding: "0.55rem 1.25rem",
                        borderRadius: "0.6rem",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background: isSel
                          ? "linear-gradient(135deg,#4ade80,#22c55e)"
                          : "rgba(255,255,255,0.07)",
                        color: isSel ? "#0f172a" : "#cbd5e1",
                        border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                        boxShadow: isSel ? "0 4px 14px rgba(74,222,128,0.35)" : "none",
                        transform: isSel ? "scale(1.04)" : "scale(1)",
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "2px",
                      }}
                    >
                      <span>{b.replace(" Bimestre", " Bim")}</span>
                      {infoPer && (
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 800,
                            opacity: isSel ? 0.85 : 0.7,
                          }}
                        >
                          {formatarDataCurta(infoPer.data_inicio).dm} a {formatarDataCurta(infoPer.data_fim).dm} ·{" "}
                          {infoPer.totalLetivos}d letivos
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ETAPA 3 — Turma (com Horários da Grade de Secretaria > Horários) */}
          {etapaAtiva === 3 && (
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.7rem",
                }}
              >
                Selecione a turma (conectada à sua Grade Horária)
              </p>
              {turmasCompativeis.length === 0 ? (
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
                  Nenhuma turma encontrada para este bimestre.
                </span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {turmasCompativeis.map((t) => {
                    const isSel =
                      String(turmaSelecionada) === String(t.id) &&
                      Boolean(turmaIsAgrupamento) === Boolean(t.is_agrupamento);
                    const badge = getTurmaBadge(t);
                    const infoG = extrairInfoGradeParaTurma(
                      slotsGradeProfessor,
                      t,
                      disciplinaSelecionada
                    );
                    return (
                      <button
                        key={`${t.is_agrupamento ? "agr" : "reg"}_${t.id}`}
                        type="button"
                        onClick={() => {
                          setTurmaSelecionada(t.id);
                          setTurmaIsAgrupamento(Boolean(t.is_agrupamento));
                          setEtapaAtiva(4);
                        }}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "0.6rem",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          background: isSel
                            ? "linear-gradient(135deg,#22d3ee,#0ea5e9)"
                            : "rgba(255,255,255,0.07)",
                          color: isSel ? "#0f172a" : "#cbd5e1",
                          border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                          boxShadow: isSel ? "0 4px 14px rgba(34,211,238,0.35)" : "none",
                          transform: isSel ? "scale(1.04)" : "scale(1)",
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "3px",
                        }}
                      >
                        <span>{t.nome}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: "0.62rem",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontWeight: 700,
                              background: isSel ? "rgba(15,23,42,0.18)" : badge.bg,
                              color: isSel ? "#0f172a" : badge.text,
                              border: `1px solid ${isSel ? "rgba(15,23,42,0.25)" : badge.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                          {infoG.possuiNaGrade && (
                            <span
                              style={{
                                fontSize: "0.62rem",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontWeight: 800,
                                background: isSel
                                  ? "rgba(15,23,42,0.22)"
                                  : "rgba(99,102,241,0.22)",
                                color: isSel ? "#0f172a" : "#a5b4fc",
                                border: isSel
                                  ? "1px solid rgba(15,23,42,0.3)"
                                  : "1px solid rgba(129,140,248,0.35)",
                              }}
                              title={`Grade Horária: ${infoG.resumoDetalhado}`}
                            >
                              📅 {infoG.resumoCurto}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 4 — Data e Aula(s) (Conectada a Governança + Secretaria > Horários) */}
          {etapaAtiva === 4 && (
            <div className="space-y-4">
              {/* Faixa Inteligente da Grade Horária da Turma (`Secretaria > Horários`) */}
              {infoGradeTurma.possuiNaGrade && (
                <div
                  style={{
                    background: "rgba(99, 102, 241, 0.12)",
                    border: "1px solid rgba(129, 140, 248, 0.3)",
                    borderRadius: "0.85rem",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                        color: "#fff",
                        fontSize: "0.64rem",
                        fontWeight: 900,
                        padding: "3px 8px",
                        borderRadius: "999px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      📅 Grade Horária ({turmaObj?.nome})
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#e0e7ff", fontWeight: 700 }}>
                      {infoGradeTurma.resumoDetalhado}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "#a5b4fc",
                        background: "rgba(15,23,42,0.45)",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontWeight: 700,
                      }}
                    >
                      {infoGradeTurma.totalAulasSemanais}{" "}
                      {infoGradeTurma.totalAulasSemanais === 1 ? "aula/sem" : "aulas/sem"}
                      {cronogramaGradeBimestre.totalAulasPrevistas > 0
                        ? ` · ${cronogramaGradeBimestre.totalAulasPrevistas} previstas no bim.`
                        : ""}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setFiltrarApenasDiasDaGrade((v) => !v)}
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        padding: "0.3rem 0.7rem",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        border: filtrarApenasDiasDaGrade
                          ? "1px solid rgba(52,211,153,0.45)"
                          : "1px solid rgba(255,255,255,0.18)",
                        background: filtrarApenasDiasDaGrade
                          ? "rgba(16,185,129,0.2)"
                          : "rgba(255,255,255,0.06)",
                        color: filtrarApenasDiasDaGrade ? "#6ee7b7" : "#cbd5e1",
                      }}
                      title="Alternar entre exibir apenas os dias da semana em que você leciona nesta turma ou todos os dias letivos"
                    >
                      {filtrarApenasDiasDaGrade
                        ? "✓ Filtrando Meus Dias de Aula"
                        : "Exibindo Todos os Dias Letivos"}
                    </button>

                    {cronogramaGradeBimestre.datasAula.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMostrarCalendarioBimestreGrade((v) => !v)}
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          padding: "0.3rem 0.75rem",
                          borderRadius: "0.5rem",
                          cursor: "pointer",
                          border: "1px solid rgba(129,140,248,0.4)",
                          background: mostrarCalendarioBimestreGrade
                            ? "linear-gradient(135deg,#818cf8,#6366f1)"
                            : "rgba(15,23,42,0.5)",
                          color: "#fff",
                        }}
                      >
                        {mostrarCalendarioBimestreGrade
                          ? "Ocultar Datas do Bimestre ▲"
                          : `Ver Todas as ${cronogramaGradeBimestre.datasAula.length} Datas de Aula ▼`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Painel Expansível: Todas as Datas de Aula do Professor na Turma ao longo do Bimestre */}
              {infoGradeTurma.possuiNaGrade &&
                mostrarCalendarioBimestreGrade &&
                cronogramaGradeBimestre.datasAula.length > 0 && (
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.55)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "0.85rem",
                      padding: "0.85rem 1rem",
                    }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Cronograma de Aulas da Turma no {bimestreSelecionado} (Governança × Horários)
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "#cbd5e1", fontWeight: 700 }}>
                        <span style={{ color: "#34d399" }}>● Confirmada</span>
                        {"  ·  "}
                        <span style={{ color: "#fbbf24" }}>● Pendente (até hoje)</span>
                        {"  ·  "}
                        <span style={{ color: "#94a3b8" }}>● Futura</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {cronogramaGradeBimestre.datasAula.map((item) => {
                        const d = formatarDataCurta(item.iso);
                        const isSel = dataSelecionada === item.iso;
                        const hoje = hojeIso();
                        const todasOrdsConfirmadas = item.ordens.every(
                          (o) => registroBimestre[`${item.iso}#${o}`]?.confirmada
                        );
                        const algumaConfirmada = item.ordens.some(
                          (o) => registroBimestre[`${item.iso}#${o}`]?.confirmada
                        );
                        const pendentePassada = item.iso <= hoje && !todasOrdsConfirmadas;

                        return (
                          <button
                            key={item.iso}
                            type="button"
                            onClick={() => {
                              setDataSelecionada(item.iso);
                              if (item.ordens[0]) setAulaOrdemSelecionada(item.ordens[0]);
                            }}
                            style={{
                              padding: "0.32rem 0.65rem",
                              borderRadius: "0.5rem",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              background: isSel
                                ? "linear-gradient(135deg,#22d3ee,#0ea5e9)"
                                : todasOrdsConfirmadas
                                ? "rgba(16,185,129,0.18)"
                                : pendentePassada
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(255,255,255,0.06)",
                              color: isSel
                                ? "#0f172a"
                                : todasOrdsConfirmadas
                                ? "#6ee7b7"
                                : pendentePassada
                                ? "#fcd34d"
                                : "#cbd5e1",
                              border: isSel
                                ? "none"
                                : todasOrdsConfirmadas
                                ? "1px solid rgba(52,211,153,0.45)"
                                : pendentePassada
                                ? "1px solid rgba(251,191,36,0.4)"
                                : "1px solid rgba(255,255,255,0.1)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>
                              {d.wd} {d.dm}
                            </span>
                            <span style={{ fontSize: "0.62rem", opacity: 0.85 }}>
                              ({item.ordens.map((o) => `${o}ª`).join("+")})
                            </span>
                            {(todasOrdsConfirmadas || algumaConfirmada) && <span>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Escolha rápida de dia letivo + Date Picker */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      style={{
                        fontSize: "0.73rem",
                        color: "#94a3b8",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {filtrarApenasDiasDaGrade && infoGradeTurma.possuiNaGrade
                        ? "Meus Dias de Aula na Turma"
                        : "Dia Letivo da Aula"}
                    </span>
                    {resumoPeriodoBimestre && (
                      <span
                        style={{
                          fontSize: "0.66rem",
                          background: "rgba(34,211,238,0.12)",
                          border: "1px solid rgba(34,211,238,0.28)",
                          color: "#67e8f9",
                          padding: "1px 8px",
                          borderRadius: "999px",
                          fontWeight: 700,
                        }}
                      >
                        Governança: {formatarDataCurta(resumoPeriodoBimestre.data_inicio).dm} a{" "}
                        {formatarDataCurta(resumoPeriodoBimestre.data_fim).dm} ·{" "}
                        {resumoPeriodoBimestre.totalLetivos} dias letivos
                        {resumoPeriodoBimestre.sabadosLetivos > 0
                          ? ` (${resumoPeriodoBimestre.sabadosLetivos} Sáb. Letivo)`
                          : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {diasRecentes.map((iso) => {
                      const d = formatarDataCurta(iso);
                      const isSel = dataSelecionada === iso;
                      const ehHoje = iso === hojeIso();
                      const avDia = avaliarDiaLetivoGovernanca(
                        iso,
                        bimestreSelecionado,
                        governancaAnoLetivo
                      );
                      const ehSabLetivo = avDia.codigo === "SABADO_LETIVO";
                      const ordensNaGradeDia = obterOrdensGradeParaData(
                        iso,
                        avDia,
                        infoGradeTurma
                      );
                      // Verifica se já há aula confirmada nesse dia
                      const temConfirmadaNoDia = aulasConfirmadasList.some((a) => a.data === iso);
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => setDataSelecionada(iso)}
                          title={
                            ordensNaGradeDia.length > 0
                              ? `Dia de aula na Grade: ${ordensNaGradeDia
                                  .map((o) => `${o}ª Aula`)
                                  .join(" + ")}`
                              : avDia.motivo
                              ? `${avDia.label}: ${avDia.motivo}`
                              : "Dia Letivo"
                          }
                          style={{
                            padding: "0.42rem 0.85rem",
                            borderRadius: "0.6rem",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            transition: "all 0.18s",
                            background: isSel
                              ? "linear-gradient(135deg,#22d3ee,#0ea5e9)"
                              : "rgba(255,255,255,0.07)",
                            color: isSel ? "#0f172a" : "#cbd5e1",
                            border: isSel
                              ? "none"
                              : temConfirmadaNoDia
                              ? "1px solid rgba(52,211,153,0.5)"
                              : ordensNaGradeDia.length > 0
                              ? "1px solid rgba(129,140,248,0.45)"
                              : ehSabLetivo
                              ? "1px solid rgba(251,191,36,0.45)"
                              : "1px solid rgba(255,255,255,0.12)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>
                            {d.wd} {d.dm}
                          </span>
                          {ordensNaGradeDia.length > 0 && (
                            <span
                              style={{
                                fontSize: "0.58rem",
                                padding: "1px 5px",
                                borderRadius: 999,
                                background: isSel
                                  ? "rgba(15,23,42,0.18)"
                                  : "rgba(99,102,241,0.25)",
                                color: isSel ? "#0f172a" : "#c7d2fe",
                                fontWeight: 800,
                              }}
                            >
                              {ordensNaGradeDia.map((o) => `${o}ª`).join("+")}
                            </span>
                          )}
                          {ehSabLetivo && (
                            <span
                              style={{
                                fontSize: "0.58rem",
                                padding: "1px 5px",
                                borderRadius: 999,
                                background: isSel
                                  ? "rgba(15,23,42,0.2)"
                                  : "rgba(251,191,36,0.2)",
                                color: isSel ? "#0f172a" : "#fbbf24",
                                fontWeight: 900,
                              }}
                            >
                              SÁB. LETIVO
                            </span>
                          )}
                          {ehHoje && (
                            <span
                              style={{
                                fontSize: "0.6rem",
                                padding: "1px 5px",
                                borderRadius: 999,
                                background: isSel ? "rgba(15,23,42,0.2)" : "rgba(34,211,238,0.2)",
                                color: isSel ? "#0f172a" : "#22d3ee",
                                fontWeight: 900,
                              }}
                            >
                              HOJE
                            </span>
                          )}
                          {temConfirmadaNoDia && !isSel && (
                            <span style={{ color: "#34d399", fontWeight: 900 }}>✓</span>
                          )}
                        </button>
                      );
                    })}

                    {/* Seletor de calendário restrito ao intervalo do bimestre configurado na Governança */}
                    <div className="relative inline-flex items-center">
                      <input
                        type="date"
                        value={dataSelecionada}
                        min={resumoPeriodoBimestre?.data_inicio || undefined}
                        max={resumoPeriodoBimestre?.data_fim || hojeIso()}
                        onChange={(e) => e.target.value && setDataSelecionada(e.target.value)}
                        style={{
                          background: "rgba(255,255,255,0.09)",
                          color: "#f8fafc",
                          border: "1px solid rgba(255,255,255,0.18)",
                          borderRadius: "0.6rem",
                          padding: "0.38rem 0.75rem",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Horário / Ordem da Aula + Toggle Aula Geminada */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        style={{
                          fontSize: "0.73rem",
                          color: "#94a3b8",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Horário / Aula ({turmaObj?.turno || "Turno"})
                      </span>
                      {horariosDisponiveis[0]?.origemGovernanca ? (
                        <span
                          style={{
                            fontSize: "0.62rem",
                            background: "rgba(52,211,153,0.16)",
                            border: "1px solid rgba(52,211,153,0.35)",
                            color: "#6ee7b7",
                            padding: "1px 7px",
                            borderRadius: "999px",
                            fontWeight: 800,
                          }}
                        >
                          ✓ Governança ({horariosDisponiveis.length} aulas)
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.62rem",
                            background: "rgba(148,163,184,0.15)",
                            color: "#94a3b8",
                            padding: "1px 7px",
                            borderRadius: "999px",
                            fontWeight: 700,
                          }}
                        >
                          Horário Padrão
                        </span>
                      )}
                      {ordensDoProfessorNaDataAtual.length > 0 && (
                        <span
                          style={{
                            fontSize: "0.62rem",
                            background: "rgba(99,102,241,0.22)",
                            border: "1px solid rgba(129,140,248,0.4)",
                            color: "#c7d2fe",
                            padding: "1px 8px",
                            borderRadius: "999px",
                            fontWeight: 800,
                          }}
                        >
                          ★ Seu Horário hoje:{" "}
                          {ordensDoProfessorNaDataAtual.map((o) => `${o}ª Aula`).join(" + ")}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAulaGeminada((v) => !v);
                        setAulaGeminadaAutoGrade(false);
                      }}
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        padding: "0.22rem 0.7rem",
                        borderRadius: "999px",
                        cursor: "pointer",
                        border: aulaGeminada ? "none" : "1px solid rgba(255,255,255,0.2)",
                        background: aulaGeminada
                          ? "linear-gradient(135deg,#818cf8,#6366f1)"
                          : "rgba(255,255,255,0.06)",
                        color: aulaGeminada ? "#fff" : "#94a3b8",
                      }}
                    >
                      {aulaGeminada
                        ? aulaGeminadaAutoGrade
                          ? "⚡ Aula Dupla Automática (Grade)"
                          : "✓ Aula Dupla / Geminada Ativa"
                        : "Aula Dupla / Geminada"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {horariosDisponiveis.map((h) => {
                      const isSel =
                        aulaOrdemSelecionada === h.ordem ||
                        (aulaGeminada && h.ordem === proxOrdemGeminada);
                      const ehHorarioDoProf = ordensDoProfessorNaDataAtual.includes(h.ordem);
                      const keyH = `${dataSelecionada}#${h.ordem}`;
                      const regH = registroBimestre[keyH];
                      return (
                        <button
                          key={h.ordem}
                          type="button"
                          onClick={() => setAulaOrdemSelecionada(h.ordem)}
                          style={{
                            padding: "0.42rem 0.85rem",
                            borderRadius: "0.6rem",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            transition: "all 0.18s",
                            background: isSel
                              ? "linear-gradient(135deg,#34d399,#10b981)"
                              : ehHorarioDoProf
                              ? "rgba(99,102,241,0.18)"
                              : "rgba(255,255,255,0.07)",
                            color: isSel ? "#0f172a" : ehHorarioDoProf ? "#e0e7ff" : "#cbd5e1",
                            border: isSel
                              ? "none"
                              : ehHorarioDoProf
                              ? "1px solid rgba(129,140,248,0.55)"
                              : "1px solid rgba(255,255,255,0.12)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <span>
                            {regH?.confirmada ? "✓ " : ""}
                            {h.label}
                            {regH?.faltas?.length > 0 ? ` (${regH.faltas.length}F)` : ""}
                          </span>
                          {ehHorarioDoProf && (
                            <span
                              style={{
                                fontSize: "0.56rem",
                                padding: "1px 5px",
                                borderRadius: 999,
                                background: isSel
                                  ? "rgba(15,23,42,0.22)"
                                  : "rgba(129,140,248,0.3)",
                                color: isSel ? "#0f172a" : "#c7d2fe",
                                fontWeight: 900,
                              }}
                            >
                              ★ SEU HORÁRIO
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Toast / Alerta de Sistema ─── */}
      {mensagem && (
        <div
          className={`p-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-sm border ${
            mensagem.tipo === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : mensagem.tipo === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-sky-50 text-sky-800 border-sky-200"
          }`}
        >
          <span>{mensagem.texto}</span>
          <button
            type="button"
            onClick={() => setMensagem(null)}
            className="text-xs font-black opacity-60 hover:opacity-100 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Alerta de Governança caso o professor selecione uma data Não-Letiva no calendário ─── */}
      {!avaliacaoDiaAtual.letivo && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-700">
              ⚠️ Calendário Escolar (Governança &gt; Ano Letivo) — {avaliacaoDiaAtual.label}
            </div>
            <div className="text-sm font-bold mt-0.5">{avaliacaoDiaAtual.motivo}</div>
          </div>
          {diasRecentes.length > 0 && (
            <button
              type="button"
              onClick={() => setDataSelecionada(diasRecentes[diasRecentes.length - 1])}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-600 text-white hover:bg-amber-700 transition"
            >
              Ir para o Dia Letivo mais próximo ({formatarDataCurta(diasRecentes[diasRecentes.length - 1]).dm})
            </button>
          )}
        </div>
      )}

      {/* ─── Aviso Inteligente caso o dia seja letivo, mas não seja dia de aula desta turma na Grade Horária ─── */}
      {avaliacaoDiaAtual.letivo && !dataAtualPertenceAGrade && infoGradeTurma.possuiNaGrade && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-indigo-700">
              📅 Aviso da Grade Horária (Secretaria &gt; Horários)
            </div>
            <div className="text-sm font-semibold mt-0.5">
              Na sua grade oficial, a turma <strong>{turmaObj?.nome}</strong> ({disciplinaSelecionada}) tem aula em:{" "}
              <strong>{infoGradeTurma.resumoDetalhado}</strong>. Você selecionou{" "}
              <strong>{formatarDataBr(dataSelecionada)}</strong> (útil apenas se for aula extra ou substituição).
            </div>
          </div>
          {dataAulaGradeMaisProxima && (
            <button
              type="button"
              onClick={() => setDataSelecionada(dataAulaGradeMaisProxima)}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 transition whitespace-nowrap"
            >
              Ir para o Dia da Minha Aula ({formatarDataCurta(dataAulaGradeMaisProxima).wd}{" "}
              {formatarDataCurta(dataAulaGradeMaisProxima).dm})
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA 1: CHAMADA DIÁRIA ONLINE (DURANTE O BIMESTRE)
      ═══════════════════════════════════════════════════════════════════════ */}
      {abaVisualizacao === "diario" && (
        <>
          {/* Cards de Resumo + Barra de Ação Rápida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
                <UserGroupIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Estudantes na Turma
                </span>
                <span className="text-2xl font-black text-slate-800">{alunos.length}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">
                  {turmaObj?.nome || ""}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Presentes (Código C)
                </span>
                <span className="text-2xl font-black text-emerald-700">{totalPresentes}</span>
                <span className="text-xs text-emerald-600 ml-1.5 font-bold">
                  ({percentualPresenca}%)
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                <XCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
                  Ausentes (Código F)
                </span>
                <span className="text-2xl font-black text-rose-600">{faltasSetAtual.size}</span>
                <span className="text-xs text-rose-500 ml-1.5 font-medium">nesta aula</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-cyan-200/80 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-cyan-50 text-cyan-600">
                  <CalendarDaysIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 block">
                    Acumulado no Bimestre
                  </span>
                  <span className="text-2xl font-black text-slate-800">
                    {aulasConfirmadasList.length}
                  </span>
                  <span className="text-xs text-slate-500 ml-1 font-medium">
                    {cronogramaGradeBimestre.totalAulasPrevistas > 0
                      ? `/ ${cronogramaGradeBimestre.totalAulasPrevistas} previstas`
                      : "aulas dadas"}
                  </span>
                  {aulasJaExportadasList.length > 0 && (
                    <span className="block text-[10px] font-extrabold text-teal-600 mt-0.5">
                      ☁ {aulasJaExportadasList.length} já no EDUCADF
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => gerarCsvClonadoEducaDF(false)}
                className="px-3 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow hover:opacity-95 transition whitespace-nowrap"
                title="Abrir painel de migração automática para o EDUCADF"
              >
                {aulasPendentesExportacaoList.length > 0
                  ? `Migrar (${aulasPendentesExportacaoList.length}) →`
                  : "EDUCADF →"}
              </button>
            </div>
          </div>

          {/* Painel da Lista de Alunos */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Barra de ferramentas da aula */}
            <div className="p-4 md:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-black text-slate-800">
                    {turmaObj?.nome || "Turma"} · {formatarDataBr(dataSelecionada)}
                  </h2>
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800">
                    {horarioAtualObj?.label}
                    {aulaGeminada && proxOrdemGeminada <= horariosDisponiveis.length
                      ? ` + ${proxOrdemGeminada}ª Aula (Geminada)`
                      : ""}
                  </span>
                  {avaliacaoDiaAtual.codigo === "SABADO_LETIVO" && (
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                      ★ Sábado Letivo ({avaliacaoDiaAtual.motivo})
                    </span>
                  )}
                  {registroAulaAtual.confirmada ? (
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      ✓ Aula Confirmada
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                      Aguardando confirmação (“Dei esta aula”)
                    </span>
                  )}
                  {registroAulaAtual.confirmada &&
                    registroAulaAtual.educadf_status === "EXPORTADO" &&
                    registroAulaAtual.educadf_exportado_em_fmt && (
                      <span
                        className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200"
                        title={`Sincronizada no portal EDUCADF em ${registroAulaAtual.educadf_exportado_em_fmt}`}
                      >
                        ☁ No EDUCADF ({registroAulaAtual.educadf_exportado_em_fmt})
                      </span>
                    )}
                  {registroAulaAtual.confirmada &&
                    registroAulaAtual.educadf_status === "PENDENTE_ATUALIZACAO" && (
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        ↻ Alterada (Pendente re-envio EDUCADF)
                      </span>
                    )}
                  {(aulasConfirmadasList.length > 0 || sincronizadoBoletimInfo?.sincronizado) && (
                    <span
                      className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                      title="As faltas acumuladas desta chamada alimentam automaticamente o Boletim Escolar, App EDUCA Mobile e Secretaria > Faltas"
                    >
                      ⚡ Boletim & Secretaria Sincronizados
                    </span>
                  )}
                  {sincronizandoServidor ? (
                    <span className="text-[11px] font-bold text-sky-600">Sincronizando...</span>
                  ) : ultimoSyncFmt ? (
                    <span className="text-[11px] font-bold text-emerald-600">
                      ☁ Salvo às {ultimoSyncFmt}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Clique no card do estudante que <strong>faltou (F)</strong>. Todos os demais permanecem com{" "}
                  <strong className="text-emerald-700">Compareceu (C)</strong> para clonagem no padrão EDUCADF.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Busca de aluno */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaAluno}
                    onChange={(e) => setBuscaAluno(e.target.value)}
                    placeholder="Buscar estudante ou nº..."
                    className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-500 bg-white w-48"
                  />
                </div>

                <button
                  type="button"
                  onClick={marcarTodosPresentes}
                  disabled={!avaliacaoDiaAtual.letivo}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-45 transition"
                >
                  Todos Presentes (C)
                </button>

                <button
                  type="button"
                  onClick={alternarConfirmacaoAula}
                  disabled={!avaliacaoDiaAtual.letivo && !registroAulaAtual.confirmada}
                  className={`px-4 py-2 rounded-xl text-xs font-black shadow-sm disabled:opacity-45 transition ${
                    registroAulaAtual.confirmada
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {registroAulaAtual.confirmada ? "✓ Aula Confirmada" : "✓ Dei esta aula"}
                </button>

                <button
                  type="button"
                  disabled={!avaliacaoDiaAtual.letivo}
                  onClick={() => {
                    const aulaSalvar = {
                      ...registroAulaAtual,
                      data: dataSelecionada,
                      ordem: horarioAtualObj?.ordem || 1,
                      horario: horarioAtualObj?.horario || "07:30",
                      horario_fim: horarioAtualObj?.fim || null,
                      confirmada: true,
                    };
                    salvarNoStorage(
                      {
                        ...registroBimestre,
                        [aulaKeyAtual]: aulaSalvar,
                      },
                      true,
                      [aulaSalvar]
                    );
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow hover:opacity-95 disabled:opacity-45 transition"
                >
                  Salvar Chamada
                </button>
              </div>
            </div>

            {/* Grid de Estudantes */}
            <div className="p-4 md:p-5 space-y-3.5">
              {/* ELO C — Alerta Automático de Atestados / Justificativas Ativas na Data */}
              {atestadosDoDiaList.length > 0 && (
                <div className="p-3.5 rounded-xl bg-teal-50/90 border border-teal-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-lg leading-none mt-0.5">🏥</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-teal-900">
                        {atestadosDoDiaList.length === 1
                          ? "1 estudante possui Atestado / Justificativa vigente nesta data"
                          : `${atestadosDoDiaList.length} estudantes possuem Atestado / Justificativa vigente nesta data`}
                        <span className="font-semibold text-teal-700 ml-1.5">
                          (cadastrado em Frequência / Secretaria)
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {atestadosDoDiaList.map(({ aluno: alAt, justificativa: jAt, jaMarcadoFalta }) => {
                          const infoJ = getInfoTipoJustificativa(jAt.tipo);
                          const dmI = formatarDataCurta(jAt.data_inicio).dm;
                          const dmF = formatarDataCurta(jAt.data_fim || jAt.data_inicio).dm;
                          return (
                            <span
                              key={alAt.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                jaMarcadoFalta
                                  ? "bg-amber-100 text-amber-900 border-amber-300"
                                  : "bg-white text-teal-800 border-teal-200"
                              }`}
                            >
                              {infoJ.icon} {alAt.nome} · {infoJ.label} ({dmI === dmF ? dmI : `${dmI} a ${dmF}`})
                              {jaMarcadoFalta ? " · Ausência registrada" : ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {atestadosDoDiaList.some((x) => !x.jaMarcadoFalta) && (
                    <button
                      type="button"
                      disabled={!avaliacaoDiaAtual.letivo}
                      onClick={aplicarFaltasAtestadosDoDia}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-teal-700 text-white hover:bg-teal-800 shadow-sm disabled:opacity-45 transition whitespace-nowrap"
                      title="Registra a ausência física (F) na chamada com abono automático pelo atestado cadastrado"
                    >
                      Registrar Ausência c/ Atestado (
                      {atestadosDoDiaList.filter((x) => !x.jaMarcadoFalta).length})
                    </button>
                  )}
                </div>
              )}

              {carregandoAlunos ? (
                <div className="py-12 text-center text-slate-400 text-sm font-semibold">
                  Carregando estudantes da turma...
                </div>
              ) : alunosFiltrados.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  Nenhum estudante encontrado para o filtro informado.
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {alunosFiltrados.map((aluno) => {
                    const faltou = faltasSetAtual.has(aluno.id);
                    const totalFaltasBim = faltasAcumuladasPorAluno[aluno.id] || 0;
                    const justBim = faltasJustificadasPorAlunoNoBimestre[aluno.id] || 0;
                    const atestadoHoje = justificativasAtivasNaDataMap.get(String(aluno.id));
                    const infoJust = atestadoHoje ? getInfoTipoJustificativa(atestadoHoje.tipo) : null;
                    const dmIni = atestadoHoje ? formatarDataCurta(atestadoHoje.data_inicio).dm : "";
                    const dmFim = atestadoHoje
                      ? formatarDataCurta(atestadoHoje.data_fim || atestadoHoje.data_inicio).dm
                      : "";

                    return (
                      <button
                        key={aluno.id}
                        type="button"
                        onClick={() => alternarFaltaAluno(aluno.id)}
                        className={`text-left px-3.5 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                          faltou && atestadoHoje
                            ? "bg-amber-50/95 border-amber-400 shadow-sm"
                            : faltou
                            ? "bg-rose-50/90 border-rose-400 shadow-sm"
                            : atestadoHoje
                            ? "bg-teal-50/50 border-teal-300 hover:border-teal-500"
                            : "bg-white border-slate-200/90 hover:border-cyan-400"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-black transition ${
                              faltou && atestadoHoje
                                ? "bg-amber-500 text-white shadow-sm"
                                : faltou
                                ? "bg-rose-500 text-white shadow-sm"
                                : atestadoHoje
                                ? "bg-teal-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {aluno.nr}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p
                                className={`text-xs font-extrabold truncate ${
                                  faltou && atestadoHoje
                                    ? "text-amber-950"
                                    : faltou
                                    ? "text-rose-900"
                                    : "text-slate-800"
                                }`}
                              >
                                {aluno.nome}
                              </p>
                              {turmaObj?.is_agrupamento && aluno.turma_origem_nome && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-black uppercase tracking-wide">
                                  {aluno.turma_origem_nome}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              Cód. EDUCADF: {aluno.codigo}
                              {totalFaltasBim > 0 && (
                                <span className="ml-2 text-rose-500 font-bold">
                                  · {totalFaltasBim}F no bim.
                                  {justBim > 0 ? ` (${justBim} justif.)` : ""}
                                </span>
                              )}
                            </p>
                            {atestadoHoje && infoJust && (
                              <p
                                className="text-[10px] font-extrabold text-teal-700 mt-0.5 truncate"
                                title={atestadoHoje.descricao || infoJust.label}
                              >
                                {infoJust.icon} {infoJust.label} (
                                {dmIni === dmFim ? dmIni : `${dmIni} a ${dmFim}`})
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide ${
                            faltou && atestadoHoje
                              ? "bg-amber-500 text-white"
                              : faltou
                              ? "bg-rose-500 text-white"
                              : atestadoHoje
                              ? "bg-teal-100 text-teal-900 border border-teal-300"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {faltou && atestadoHoje
                            ? "FALTA JUSTIF. · FJ"
                            : faltou
                            ? "FALTA · F"
                            : "PRESENTE · C"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé com linha do tempo de aulas já registradas no bimestre */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Aulas registradas no bimestre ({aulasConfirmadasList.length}):
                </span>
                {aulasConfirmadasList.length === 0 ? (
                  <span className="text-xs text-slate-400">
                    Clique em “✓ Dei esta aula” ou “Salvar Chamada” para registrar a 1ª aula.
                  </span>
                ) : (
                  aulasConfirmadasList.map((a) => {
                    const d = formatarDataCurta(a.data);
                    const ativa = a.key === aulaKeyAtual;
                    const jaExportada =
                      a.educadf_status === "EXPORTADO" && Boolean(a.educadf_exportado_em_fmt);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => {
                          setDataSelecionada(a.data);
                          setAulaOrdemSelecionada(Number(a.ordem) || 1);
                        }}
                        title={
                          jaExportada
                            ? `Sincronizada no EDUCADF em ${a.educadf_exportado_em_fmt}`
                            : "Confirmada no EducaMelhor (pendente de envio ao EDUCADF)"
                        }
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition inline-flex items-center gap-1 ${
                          ativa
                            ? "bg-cyan-600 text-white border-cyan-600"
                            : jaExportada
                            ? "bg-teal-50 text-teal-800 border-teal-300 hover:border-teal-500"
                            : "bg-white text-slate-700 border-slate-300 hover:border-cyan-400"
                        }`}
                      >
                        <span>
                          {d.dm} · {a.ordem}ª ({a.faltas?.length || 0}F)
                        </span>
                        {jaExportada && <span className="text-[10px]">☁</span>}
                      </button>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={() => gerarCsvClonadoEducaDF(false)}
                className="text-xs font-extrabold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
              >
                <SparklesIcon className="w-4 h-4" />
                Abrir Painel de Migração EDUCADF →
              </button>
            </div>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA 2: MIGRAÇÃO REAL AUTOMATIZADA E CLONAGEM PARA O EDUCADF
      ═══════════════════════════════════════════════════════════════════════ */}
      {abaVisualizacao === "migracao" && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-5 p-5 md:p-6">
          {/* Cabeçalho + Ações de Migração */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Agente EDUCA · Migração Real Automatizada
              </span>
              <h2 className="text-xl font-black text-slate-800 mt-2">
                Migração de Frequência Direto para o Portal EDUCADF
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                O <strong>Agente EDUCA</strong> acessa automaticamente o Diário de Classe no portal{" "}
                <strong>EDUCADF</strong> com suas credenciais criptografadas, seleciona{" "}
                <strong>{turmaObj?.nome || "sua turma"}</strong> ({disciplinaSelecionada}), abre cada dia
                letivo confirmado no calendário e salva as presenças{" "}
                <code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">P / C</code> e
                faltas{" "}
                <code className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">F</code> sem
                necessidade de digitação manual.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onImportarCsvEducaDF}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 transition"
                title="Importar um arquivo CSV baixado do EDUCADF e preenchê-lo preservando colunas e delimitador"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Clonar CSV do EDUCADF
              </button>

              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={onUploadPdfEducaDF}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={lendoPdf}
                className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 transition"
              >
                <DocumentTextIcon className="w-4 h-4" />
                {lendoPdf ? "Lendo PDF..." : "Clonar Folha PDF (com X)"}
              </button>

              {csvClonadoPreview && (
                <button
                  type="button"
                  onClick={baixarCsvClonado}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-black bg-slate-800 text-white hover:bg-slate-900 flex items-center gap-1.5 transition"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  Baixar CSV
                </button>
              )}

              {aulasJaExportadasList.length > 0 &&
                aulasPendentesExportacaoList.length > 0 &&
                !migrandoEducaDF && (
                  <button
                    type="button"
                    onClick={() => iniciarMigracaoEducaDF({ apenasPendentes: false })}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition"
                    title="Reenviar todas as aulas confirmadas do bimestre ao EDUCADF"
                  >
                    Re-migrar Tudo ({aulasConfirmadasList.length})
                  </button>
                )}

              <button
                type="button"
                onClick={() =>
                  iniciarMigracaoEducaDF({
                    apenasPendentes: aulasPendentesExportacaoList.length > 0,
                  })
                }
                disabled={migrandoEducaDF}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:opacity-95 disabled:opacity-60 flex items-center gap-1.5 transition"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                {migrandoEducaDF
                  ? "Migrando no EDUCADF..."
                  : aulasPendentesExportacaoList.length > 0
                  ? `Migrar Pendentes (${aulasPendentesExportacaoList.length})`
                  : aulasConfirmadasList.length > 0
                  ? `Re-migrar Bimestre (${aulasConfirmadasList.length})`
                  : "Migrar para o EDUCADF"}
              </button>
            </div>
          </div>

          {/* Barra de Conexão EDUCADF (Etapa 0) + KPIs de Migração do Bimestre */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <div
              className={`lg:col-span-6 rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-3 ${
                agenteEducaDFInfo.credencial_configurada
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-amber-50/80 border-amber-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    agenteEducaDFInfo.credencial_configurada
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {agenteEducaDFInfo.credencial_configurada ? (
                    <ShieldCheckIcon className="w-5 h-5" />
                  ) : (
                    <KeyIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Conexão Portal EDUCADF (AES-256)
                  </div>
                  {agenteEducaDFInfo.credencial_configurada ? (
                    <div className="text-sm font-extrabold text-emerald-900">
                      ✓ Conta Configurada · Matrícula{" "}
                      <span className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">
                        {agenteEducaDFInfo.login}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-amber-900">
                      Conecte sua matrícula e senha do EDUCADF para habilitar o envio automático.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalCredencialOpen(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    agenteEducaDFInfo.credencial_configurada
                      ? "bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                      : "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                  }`}
                >
                  {agenteEducaDFInfo.credencial_configurada
                    ? "Atualizar Credencial"
                    : "Conectar EDUCADF"}
                </button>
                <Link
                  to="/agente-educa/credenciais"
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-white/80 border border-slate-200 transition"
                  title="Abrir painel completo do Agente EDUCA"
                >
                  Painel Agente ↗
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl p-3.5 bg-slate-50 border border-slate-200 flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Confirmadas
              </span>
              <span className="text-2xl font-black text-slate-800 mt-0.5">
                {aulasConfirmadasList.length}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">aulas no bimestre</span>
            </div>

            <div className="lg:col-span-2 rounded-2xl p-3.5 bg-teal-50/70 border border-teal-200 flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-700">
                Já no EDUCADF
              </span>
              <span className="text-2xl font-black text-teal-800 mt-0.5">
                {aulasJaExportadasList.length}
              </span>
              <span className="text-[11px] text-teal-700 font-semibold">sincronizadas ☁</span>
            </div>

            <div className="lg:col-span-2 rounded-2xl p-3.5 bg-cyan-50/70 border border-cyan-200 flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700">
                Pendentes
              </span>
              <span className="text-2xl font-black text-cyan-900 mt-0.5">
                {aulasPendentesExportacaoList.length}
              </span>
              <span className="text-[11px] text-cyan-700 font-semibold">prontas p/ envio</span>
            </div>
          </div>

          {/* Card de Progresso ao Vivo / Resultado da Migração Playwright */}
          {jobMigracao && (
            <div
              className={`rounded-2xl p-4 md:p-5 border space-y-3 ${
                jobMigracao.status === "running"
                  ? "bg-slate-900 text-white border-cyan-500/40 shadow-md"
                  : jobMigracao.status === "done"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : jobMigracao.status === "partial"
                  ? "bg-amber-50 border-amber-300 text-amber-950"
                  : "bg-rose-50 border-rose-300 text-rose-950"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {jobMigracao.status === "running" ? (
                    <ArrowPathIcon className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                  ) : jobMigracao.status === "done" ? (
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <ExclamationTriangleIcon
                      className={`w-5 h-5 shrink-0 ${
                        jobMigracao.status === "partial" ? "text-amber-600" : "text-rose-600"
                      }`}
                    />
                  )}
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider opacity-80">
                      {jobMigracao.status === "running"
                        ? "Agente EDUCA em Execução no Portal EDUCADF"
                        : jobMigracao.status === "done"
                        ? "Migração Concluída com Sucesso"
                        : jobMigracao.status === "partial"
                        ? "Migração Concluída Parcialmente"
                        : "Atenção na Migração para o EDUCADF"}
                    </div>
                    <div className="text-sm font-extrabold mt-0.5">
                      {jobMigracao.status === "running"
                        ? jobMigracao.etapa || "Sincronizando frequência no Diário de Classe..."
                        : jobMigracao.message || jobMigracao.etapa}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {jobMigracao.totalDatas > 0 && (
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full ${
                        jobMigracao.status === "running"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "bg-white/80 text-slate-800 border border-slate-200"
                      }`}
                    >
                      {jobMigracao.datasProcessadas || 0} / {jobMigracao.totalDatas} dia(s) ·{" "}
                      {jobMigracao.aulasExportadas || 0} aula(s) salva(s)
                    </span>
                  )}

                  {jobMigracao.status !== "running" && (
                    <button
                      type="button"
                      onClick={() => setJobMigracao(null)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 transition"
                    >
                      Fechar
                    </button>
                  )}
                </div>
              </div>

              {jobMigracao.status === "running" && (
                <div className="space-y-1.5">
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round(
                            ((jobMigracao.datasProcessadas || 0) /
                              Math.max(1, jobMigracao.totalDatas || 1)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Você pode acompanhar cada data recebendo o selo <strong>☁</strong> em tempo real
                    enquanto o Agente EDUCA salva no portal.
                  </p>
                </div>
              )}

              {Array.isArray(jobMigracao.avisos) && jobMigracao.avisos.length > 0 && (
                <div className="pt-2 border-t border-black/10 space-y-1">
                  <div className="text-xs font-black">
                    Detalhes por data ({jobMigracao.avisos.length} aviso(s)):
                  </div>
                  <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {jobMigracao.avisos.map((av, idx) => (
                      <li key={idx} className="font-semibold">
                        • <strong>{formatarDataBr(av.data)}:</strong> {av.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Pré-visualização da Matriz CSV Nativa do EDUCADF */}
          {csvClonadoPreview ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-bold text-slate-600">
                  Matriz pronta para migração / exportação:{" "}
                  <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-extrabold">
                    {csvClonadoPreview.nomeArquivo}
                  </code>
                  {csvModeloRaw && (
                    <span className="ml-2 text-emerald-600">
                      (Clonado fielmente sobre {csvModeloRaw.nome})
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  Colunas com selo ☁ já estão sincronizadas no Diário de Classe do EDUCADF
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-extrabold border-r border-slate-700">Cód. EDUCADF</th>
                      <th className="py-2.5 px-3 font-extrabold border-r border-slate-700">Estudante</th>
                      <th className="py-2.5 px-3 font-extrabold border-r border-slate-700">Turma</th>
                      {csvClonadoPreview.cabecalhosAulas.map((cab, i) => {
                        const colMeta = csvClonadoPreview.colunasAulas?.[i];
                        const expOk =
                          colMeta?.educadf_status === "EXPORTADO" &&
                          Boolean(colMeta?.educadf_exportado_em_fmt);
                        return (
                          <th
                            key={i}
                            className="py-2 px-3 font-extrabold text-center border-r border-slate-700 whitespace-nowrap bg-slate-800"
                            title={
                              expOk
                                ? `Sincronizada no EDUCADF em ${colMeta.educadf_exportado_em_fmt}`
                                : undefined
                            }
                          >
                            <div>{cab}</div>
                            {expOk && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-black">
                                ☁ EDUCADF ✓
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {csvClonadoPreview.linhas.map((row, rIdx) => {
                      const cod = row[4];
                      const est = row[5];
                      const tur = row[2];
                      const marcacoes = row.slice(6);
                      return (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 border-r border-slate-100">
                            {cod}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                            {est}
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-semibold border-r border-slate-100 whitespace-nowrap">
                            {tur}
                          </td>
                          {marcacoes.map((m, mIdx) => (
                            <td
                              key={mIdx}
                              className="py-2 px-3 text-center border-r border-slate-100 font-black"
                            >
                              <span
                                className={`inline-block w-6 h-6 leading-6 rounded-full text-[11px] ${
                                  m === "F"
                                    ? "bg-rose-500 text-white"
                                    : m === "C" || m === "P"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {m}
                              </span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              Selecione uma turma com estudantes para visualizar a matriz de frequência do EDUCADF.
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA 3 (OPCIONAL): INSPEÇÃO / CLONAGEM DE FOLHA PDF COM "X" VETORIAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {abaVisualizacao === "pdf" && modeloPdf && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Clonagem Vetorial da Folha PDF Original EDUCADF ({modeloPdf.turma} · {modeloPdf.disciplina})
              </h3>
              <p className="text-xs text-slate-500">
                Preenche o PDF oficial do EDUCADF com “X” escuro diretamente sobre as coordenadas originais (sem
                foto, 300 DPI).
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={gerarPdfClonadoComX}
                disabled={gerandoPdf}
                className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {gerandoPdf ? "Clonando PDF..." : "Injetar Marcações no PDF Original"}
              </button>
              {pdfGerado && (
                <button
                  type="button"
                  onClick={baixarPdfClonado}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Baixar PDF Clonado
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbaVisualizacao("diario")}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
              >
                Voltar ao Diário
              </button>
            </div>
          </div>

          {pdfGerado && (
            <div className="grid gap-4 md:grid-cols-2">
              {pdfGerado.previas.map((src, i) => (
                <figure key={i} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <img src={src} alt={`Folha ${i + 1} clonada`} className="w-full h-auto" />
                  <figcaption className="text-xs text-slate-500 px-3 py-2 bg-slate-50 font-semibold">
                    Folha Original Clonada — Página {i + 1} de {pdfGerado.previas.length}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL INLINE: CONECTAR CONTA DO PORTAL EDUCADF (CRIPTOGRAFIA AES-256)
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalCredencialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => !salvandoCredencial && setModalCredencialOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-black tracking-wide uppercase">
                    Conectar Conta EDUCADF
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Criptografia militar AES-256 · Etapa 0 do Agente EDUCA
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={salvandoCredencial}
                onClick={() => setModalCredencialOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarCredencialEducaDFInline} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Matrícula / Usuário EDUCADF
                </label>
                <input
                  type="text"
                  required
                  value={credLoginInput}
                  onChange={(e) => setCredLoginInput(e.target.value)}
                  placeholder="Ex.: 02123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Senha do Portal EDUCADF
                </label>
                <input
                  type="password"
                  required
                  value={credSenhaInput}
                  onChange={(e) => setCredSenhaInput(e.target.value)}
                  placeholder="Digite sua senha do EDUCADF"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil no EDUCADF
                </label>
                <select
                  value={credPerfilInput}
                  onChange={(e) => setCredPerfilInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="professor">Professor</option>
                  <option value="secretario">Secretário Escolar</option>
                  <option value="diretor">Diretor / Gestor</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={salvandoCredencial}
                  onClick={() => setModalCredencialOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoCredencial}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:opacity-95 disabled:opacity-60 transition"
                >
                  {salvandoCredencial ? "Salvando com AES-256..." : "Salvar e Conectar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
