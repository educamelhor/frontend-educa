import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "@heroicons/react/24/outline";

// Motor PDF sob demanda (para clonagem de folha PDF quando desejado)
const carregarPdf = () => import("./chamadaPdf");

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

export default function Chamada() {
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
  const [dataSelecionada, setDataSelecionada] = useState(hojeIso);
  const [aulaOrdemSelecionada, setAulaOrdemSelecionada] = useState(1);
  const [aulaGeminada, setAulaGeminada] = useState(false);

  // ─── Estados de Governança > Ano Letivo (Dias Letivos & Horários) ────────
  const [governancaAnoLetivo, setGovernancaAnoLetivo] = useState({
    periodos: [],
    excecoes: [],
    horarios: [],
  });
  const [sincronizandoServidor, setSincronizandoServidor] = useState(false);
  const [ultimoSyncFmt, setUltimoSyncFmt] = useState(null);
  const jaAutoSelecionouBimestreRef = useRef(false);

  // ─── Estados da Chamada Online (Durante o Bimestre) ──────────────────────
  const [buscaAluno, setBuscaAluno] = useState("");
  // Estrutura persistida por contexto: { [aulaKey]: { data, ordem, horario, confirmada: bool, faltas: number[] } }
  const [registroBimestre, setRegistroBimestre] = useState({});
  const [mensagem, setMensagem] = useState(null);

  // ─── Estados de Clonagem e Migração EDUCADF (Final do Bimestre) ──────────
  const [abaVisualizacao, setAbaVisualizacao] = useState("diario"); // "diario" | "migracao" | "pdf"
  const [csvModeloRaw, setCsvModeloRaw] = useState(null);
  const [csvClonadoPreview, setCsvClonadoPreview] = useState(null);
  const [migrandoEducaDF, setMigrandoEducaDF] = useState(false);

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

  // ─── 0) Carrega Configuração do Ano Letivo da Escola (Governança) ────────
  useEffect(() => {
    let ativo = true;
    const carregarConfigAnoLetivo = async () => {
      try {
        const res = await api.get("/professores/me/chamada").catch(() => null);
        if (ativo && res?.data?.ok && res.data.governanca) {
          setGovernancaAnoLetivo(res.data.governanca);
          return;
        }
        // Fallback direto para /governanca/ano-letivo-config
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
      } catch (e) {
        console.warn("Não foi possível carregar governança do ano letivo:", e);
      }
    };
    carregarConfigAnoLetivo();
    return () => {
      ativo = false;
    };
  }, []);

  // ─── 1) Carrega Disciplinas do Professor (com fallback para Direção) ─────
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
          setDisciplinaSelecionada(lista[0]);
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
    const hoje = hojeIso();
    const perVigente = periodos.find(
      (p) =>
        p.tipo === "bimestre" &&
        p.data_inicio &&
        p.data_fim &&
        hoje >= p.data_inicio &&
        hoje <= p.data_fim
    );
    if (perVigente) {
      const labelVigente = `${perVigente.numero}º Bimestre`;
      if (bimestresDisponiveis.includes(labelVigente)) {
        setBimestreSelecionado(labelVigente);
        jaAutoSelecionouBimestreRef.current = true;
      }
    }
  }, [governancaAnoLetivo.periodos, bimestresDisponiveis]);

  useEffect(() => {
    if (bimestreSelecionado && !bimestresDisponiveis.includes(bimestreSelecionado)) {
      setBimestreSelecionado(bimestresDisponiveis[0] || "1º Bimestre");
    }
  }, [bimestresDisponiveis, bimestreSelecionado]);

  // Quando o bimestre ou o calendário da Governança muda, posiciona automaticamente a data selecionada
  // em um dia letivo válido daquele bimestre caso a data atual esteja fora do período ou não seja letiva.
  useEffect(() => {
    const avAtual = avaliarDiaLetivoGovernanca(
      dataSelecionada,
      bimestreSelecionado,
      governancaAnoLetivo
    );
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
  }, [bimestreSelecionado, governancaAnoLetivo]);

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

  // Auto-seleciona a primeira turma compatível para facilitar a visualização imediata
  useEffect(() => {
    if (turmasCompativeis.length > 0) {
      const existe = turmasCompativeis.some((t) => String(t.id) === String(turmaSelecionada));
      if (!existe) {
        setTurmaSelecionada(turmasCompativeis[0].id);
      }
    } else {
      setTurmaSelecionada("");
    }
  }, [turmasCompativeis, turmaSelecionada]);

  const turmaObj = useMemo(
    () =>
      turmasCompativeis.find((t) => String(t.id) === String(turmaSelecionada)) ||
      turmas.find((t) => String(t.id) === String(turmaSelecionada)) ||
      null,
    [turmasCompativeis, turmas, turmaSelecionada]
  );

  // ─── 3) Carrega Alunos Reais da Turma Selecionada ────────────────────────
  useEffect(() => {
    if (!turmaSelecionada) {
      setAlunos([]);
      return;
    }
    let ativo = true;
    const carregarAlunosDaTurma = async () => {
      setCarregandoAlunos(true);
      try {
        const res = await api.get(`/turmas/${turmaSelecionada}/alunos`).catch(() => null);
        if (ativo && res?.data?.ok && Array.isArray(res.data.alunos) && res.data.alunos.length > 0) {
          const ordenados = [...res.data.alunos]
            .sort((a, b) => String(a.estudante || a.nome || "").localeCompare(String(b.estudante || b.nome || "")))
            .map((a, idx) => ({
              id: a.id || a.aluno_id || idx + 1,
              nr: idx + 1,
              codigo: a.codigo || a.matricula || String(100000 + idx + 1),
              nome: String(a.estudante || a.nome || "").toUpperCase(),
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
  }, [turmaSelecionada]);

  // ─── 4) Persistência Híbrida (MySQL Backend + Cache Local) ───────────────
  const storageKey = useMemo(() => {
    const escolaId = localStorage.getItem("escola_id") || "0";
    return `educa_chamada_v1_${escolaId}_${turmaSelecionada || "0"}_${slug(disciplinaSelecionada)}_${slug(bimestreSelecionado)}`;
  }, [turmaSelecionada, disciplinaSelecionada, bimestreSelecionado]);

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

    // 2) Busca os registros salvos no banco de dados MySQL e a Governança atualizada
    const carregarDoServidor = async () => {
      try {
        const res = await api
          .get("/professores/me/chamada", {
            params: {
              turma_id: turmaSelecionada,
              disciplina: disciplinaSelecionada,
              bimestre: bimestreSelecionado,
            },
          })
          .catch(() => null);

        if (!ativo || !res?.data?.ok) return;

        if (res.data.governanca) {
          setGovernancaAnoLetivo(res.data.governanca);
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
  }, [storageKey, turmaSelecionada, disciplinaSelecionada, bimestreSelecionado]);

  const salvarNoStorage = async (novoMapa, exibirFeedback = false, aulasParaSincronizar = null) => {
    setRegistroBimestre(novoMapa);
    try {
      localStorage.setItem(storageKey, JSON.stringify(novoMapa));
    } catch (e) {
      console.error("Erro ao salvar chamada localmente:", e);
    }

    // Persiste no banco de dados MySQL (com validação de Governança > Ano Letivo)
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
          disciplina: disciplinaSelecionada,
          aulas: listaAulas,
        });
        if (res?.data?.ok) {
          const agora = new Date();
          setUltimoSyncFmt(
            `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`
          );
          if (exibirFeedback) {
            showToast(
              "success",
              `✓ Chamada salva no servidor em ${turmaObj?.nome || "Turma"} (${formatarDataBr(
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

  // Garante que a ordem da aula selecionada sempre exista dentro da quantidade de aulas do turno
  useEffect(() => {
    if (
      horariosDisponiveis.length > 0 &&
      !horariosDisponiveis.some((h) => h.ordem === aulaOrdemSelecionada)
    ) {
      setAulaOrdemSelecionada(horariosDisponiveis[0].ordem);
    }
  }, [horariosDisponiveis, aulaOrdemSelecionada]);

  const horarioAtualObj = useMemo(
    () => horariosDisponiveis.find((h) => h.ordem === aulaOrdemSelecionada) || horariosDisponiveis[0],
    [horariosDisponiveis, aulaOrdemSelecionada]
  );

  // Avaliação do dia selecionado perante o calendário letivo da escola (Governança)
  const avaliacaoDiaAtual = useMemo(
    () => avaliarDiaLetivoGovernanca(dataSelecionada, bimestreSelecionado, governancaAnoLetivo),
    [dataSelecionada, bimestreSelecionado, governancaAnoLetivo]
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
    const aulaPrincipal = {
      ...registroAulaAtual,
      data: dataSelecionada,
      ordem: horarioAtualObj?.ordem || 1,
      horario: horarioAtualObj?.horario || "07:30",
      horario_fim: horarioAtualObj?.fim || null,
      confirmada: true, // Ao marcar falta, já marca a aula como dada
      faltas: novasFaltas,
    };
    const novoMapa = {
      ...registroBimestre,
      [aulaKeyAtual]: aulaPrincipal,
    };
    const aulasSync = [aulaPrincipal];

    // Se Aula Geminada estiver ativa, replica para a aula seguinte do mesmo dia
    if (aulaGeminada && proxOrdemGeminada <= horariosDisponiveis.length) {
      const hProx = horariosDisponiveis.find((h) => h.ordem === proxOrdemGeminada);
      const aulaGem = {
        data: dataSelecionada,
        ordem: proxOrdemGeminada,
        horario: hProx?.horario || "",
        horario_fim: hProx?.fim || null,
        confirmada: true,
        faltas: novasFaltas,
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
    const aulaPrincipal = {
      ...registroAulaAtual,
      data: dataSelecionada,
      ordem: horarioAtualObj?.ordem || 1,
      horario: horarioAtualObj?.horario || "07:30",
      horario_fim: horarioAtualObj?.fim || null,
      confirmada: true,
      faltas: [],
    };
    const novoMapa = {
      ...registroBimestre,
      [aulaKeyAtual]: aulaPrincipal,
    };
    const aulasSync = [aulaPrincipal];

    if (aulaGeminada && proxOrdemGeminada <= horariosDisponiveis.length) {
      const hProx = horariosDisponiveis.find((h) => h.ordem === proxOrdemGeminada);
      const aulaGem = {
        data: dataSelecionada,
        ordem: proxOrdemGeminada,
        horario: hProx?.horario || "",
        horario_fim: hProx?.fim || null,
        confirmada: true,
        faltas: [],
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
    };
    const novoMapa = {
      ...registroBimestre,
      [aulaKeyAtual]: aulaPrincipal,
    };
    const aulasSync = [aulaPrincipal];

    if (aulaGeminada && proxOrdemGeminada <= horariosDisponiveis.length) {
      const hProx = horariosDisponiveis.find((h) => h.ordem === proxOrdemGeminada);
      const aulaGem = {
        data: dataSelecionada,
        ordem: proxOrdemGeminada,
        horario: hProx?.horario || "",
        horario_fim: hProx?.fim || null,
        confirmada: novoStatus,
        faltas: registroAulaAtual.faltas || [],
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

  // Filtro de busca de alunos
  const alunosFiltrados = useMemo(() => {
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return alunos;
    return alunos.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) ||
        String(a.nr).includes(q) ||
        String(a.codigo || "").toLowerCase().includes(q)
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

  // ─── Geração / Clonagem do CSV Oficial EDUCADF em 2º Plano ───────────────
  const gerarCsvClonadoEducaDF = () => {
    if (alunos.length === 0) {
      showToast("error", "Selecione uma turma com estudantes para clonar o arquivo do EDUCADF.");
      return;
    }

    const nomeProf = localStorage.getItem("nome_usuario") || localStorage.getItem("nome") || "PROFESSOR EDUCAMELHOR";
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
              confirmada: true,
              faltas: [...faltasSetAtual],
            },
          ];

    const cabecalhosAulas = colunasAulas.map((c) => `${c.data} (${c.ordem} - ${c.horario})`);
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
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const conteudoCsv = [headerRow, ...linhasAlunos]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    setCsvClonadoPreview({
      cabecalhosAulas,
      colunasAulas,
      linhas: linhasAlunos,
      csvText: conteudoCsv,
      nomeArquivo: `Chamada-EDUCADF-${slug(nomeTurma)}-${slug(disciplinaSelecionada)}.csv`,
    });
    setAbaVisualizacao("migracao");
    showToast("success", "✓ Arquivo CSV nativo do EDUCADF clonado em 2º plano com as marcações do bimestre!");
  };

  // Importar um CSV modelo baixado do EDUCADF e preenchê-lo automaticamente
  const onImportarCsvEducaDF = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const texto = await file.text();
      const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (linhas.length < 2) {
        showToast("error", "O arquivo CSV selecionado parece vazio ou inválido.");
        return;
      }
      setCsvModeloRaw({ nome: file.name, totalLinhas: linhas.length - 1 });
      gerarCsvClonadoEducaDF();
      showToast(
        "success",
        `✓ Modelo "${file.name}" lido e clonado com os lançamentos online do professor!`
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

  const simularEnvioAgenteEducaDF = () => {
    if (!csvClonadoPreview) {
      gerarCsvClonadoEducaDF();
    }
    setMigrandoEducaDF(true);
    setTimeout(() => {
      setMigrandoEducaDF(false);
      showToast(
        "success",
        "🚀 Arquivo clonado pronto para envio automatizado ao portal EDUCADF (Etapa de Backend será conectada a seguir)!"
      );
    }, 1200);
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

  const diasRecentes = useMemo(
    () =>
      gerarDiasLetivosRecentes(
        dataSelecionada || hojeIso(),
        bimestreSelecionado,
        governancaAnoLetivo,
        7
      ),
    [dataSelecionada, bimestreSelecionado, governancaAnoLetivo]
  );
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

          {/* ETAPA 3 — Turma */}
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
                Selecione a turma
              </p>
              {turmasCompativeis.length === 0 ? (
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
                  Nenhuma turma encontrada para este bimestre.
                </span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {turmasCompativeis.map((t) => {
                    const isSel = String(turmaSelecionada) === String(t.id);
                    const badge = getTurmaBadge(t);
                    return (
                      <button
                        key={`${t.is_agrupamento ? "agr" : "reg"}_${t.id}`}
                        type="button"
                        onClick={() => {
                          setTurmaSelecionada(t.id);
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
                        <span
                          style={{
                            fontSize: "0.64rem",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 4 — Data e Aula(s) */}
          {etapaAtiva === 4 && (
            <div className="space-y-4">
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
                      Dia Letivo da Aula
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
                      // Verifica se já há aula confirmada nesse dia
                      const temConfirmadaNoDia = aulasConfirmadasList.some((a) => a.data === iso);
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => setDataSelecionada(iso)}
                          title={avDia.motivo ? `${avDia.label}: ${avDia.motivo}` : "Dia Letivo"}
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
                    </div>
                    <button
                      type="button"
                      onClick={() => setAulaGeminada((v) => !v)}
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
                      {aulaGeminada ? "✓ Aula Dupla / Geminada Ativa" : "Aula Dupla / Geminada"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {horariosDisponiveis.map((h) => {
                      const isSel =
                        aulaOrdemSelecionada === h.ordem ||
                        (aulaGeminada && h.ordem === proxOrdemGeminada);
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
                              : "rgba(255,255,255,0.07)",
                            color: isSel ? "#0f172a" : "#cbd5e1",
                            border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          {regH?.confirmada ? "✓ " : ""}
                          {h.label}
                          {regH?.faltas?.length > 0 ? ` (${regH.faltas.length}F)` : ""}
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
                  <span className="text-xs text-slate-500 ml-1 font-medium">aulas dadas</span>
                </div>
              </div>
              <button
                type="button"
                onClick={gerarCsvClonadoEducaDF}
                className="px-3 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow hover:opacity-95 transition whitespace-nowrap"
                title="Gerar arquivo clonado para o EDUCADF"
              >
                Migrar →
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
            <div className="p-4 md:p-5">
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
                    return (
                      <button
                        key={aluno.id}
                        type="button"
                        onClick={() => alternarFaltaAluno(aluno.id)}
                        className={`text-left px-3.5 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                          faltou
                            ? "bg-rose-50/90 border-rose-400 shadow-sm"
                            : "bg-white border-slate-200/90 hover:border-cyan-400"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-black transition ${
                              faltou
                                ? "bg-rose-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {aluno.nr}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-extrabold truncate ${
                                faltou ? "text-rose-900" : "text-slate-800"
                              }`}
                            >
                              {aluno.nome}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              Cód. EDUCADF: {aluno.codigo}
                              {totalFaltasBim > 0 && (
                                <span className="ml-2 text-rose-500 font-bold">
                                  · {totalFaltasBim}F no bim.
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide ${
                            faltou
                              ? "bg-rose-500 text-white"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {faltou ? "FALTA · F" : "PRESENTE · C"}
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
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => {
                          setDataSelecionada(a.data);
                          setAulaOrdemSelecionada(Number(a.ordem) || 1);
                        }}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition ${
                          ativa
                            ? "bg-cyan-600 text-white border-cyan-600"
                            : "bg-white text-slate-700 border-slate-300 hover:border-cyan-400"
                        }`}
                      >
                        {d.dm} · {a.ordem}ª ({a.faltas?.length || 0}F)
                      </button>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={gerarCsvClonadoEducaDF}
                className="text-xs font-extrabold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
              >
                <SparklesIcon className="w-4 h-4" />
                Visualizar Arquivo Clonado para o EDUCADF →
              </button>
            </div>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA 2: CLONAGEM EM 2º PLANO E MIGRAÇÃO PARA O EDUCADF (FINAL DO BIMESTRE)
      ═══════════════════════════════════════════════════════════════════════ */}
      {abaVisualizacao === "migracao" && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-5 p-5 md:p-6">
          {/* Explicação visual do Fluxo de Clonagem em 2º Plano */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Fluxo de Migração sem Fotos · Clonagem Direta
              </span>
              <h2 className="text-xl font-black text-slate-800 mt-2">
                Clonagem e Migração de Frequência para o Portal EDUCADF
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Durante o bimestre, você registra normalmente as chamadas online no{" "}
                <strong>EducaMelhor</strong>. No fechamento, nosso sistema baixa/clona o arquivo modelo do{" "}
                <strong>EDUCADF</strong> em segundo plano, injeta automaticamente os códigos{" "}
                <code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">C</code>{" "}
                (Compareceu),{" "}
                <code className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">F</code> (Faltou) e{" "}
                <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">-</code> e envia o
                arquivo original com 100% de fidelidade (sem necessidade de impressão ou câmera).
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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
              >
                <ArrowPathIcon className="w-4 h-4" />
                Clonar a partir de CSV do EDUCADF
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
                {lendoPdf ? "Lendo PDF..." : "Clonar Folha PDF EDUCADF (com X)"}
              </button>

              {csvClonadoPreview && (
                <button
                  type="button"
                  onClick={baixarCsvClonado}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-slate-800 text-white hover:bg-slate-900 flex items-center gap-1.5 transition"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  Baixar CSV Preenchido
                </button>
              )}

              <button
                type="button"
                onClick={simularEnvioAgenteEducaDF}
                disabled={migrandoEducaDF}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:opacity-95 flex items-center gap-1.5 transition"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                {migrandoEducaDF ? "Sincronizando..." : "Migrar para o EDUCADF"}
              </button>
            </div>
          </div>

          {/* Pré-visualização da Matriz CSV Nativa do EDUCADF */}
          {csvClonadoPreview ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-bold text-slate-600">
                  Arquivo gerado em segundo plano:{" "}
                  <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-extrabold">
                    {csvClonadoPreview.nomeArquivo}
                  </code>
                  {csvModeloRaw && (
                    <span className="ml-2 text-emerald-600">
                      (Clonado sobre o modelo {csvModeloRaw.nome})
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  Formato oficial EDUCADF: Professor, Disciplina, Turma, Etapa, CodEstudante, Estudante, Datas...
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-extrabold border-r border-slate-700">Cód. EDUCADF</th>
                      <th className="py-2.5 px-3 font-extrabold border-r border-slate-700">Estudante</th>
                      <th className="py-2.5 px-3 font-extrabold border-r border-slate-700">Turma</th>
                      {csvClonadoPreview.cabecalhosAulas.map((cab, i) => (
                        <th
                          key={i}
                          className="py-2.5 px-3 font-extrabold text-center border-r border-slate-700 whitespace-nowrap bg-slate-800"
                        >
                          {cab}
                        </th>
                      ))}
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
                                    : m === "C"
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
              Clique em <strong>“Gerar CSV Clonado”</strong> ou selecione uma turma para visualizar a matriz de
              exportação do EDUCADF.
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
    </div>
  );
}
