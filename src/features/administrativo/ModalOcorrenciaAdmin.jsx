// src/features/administrativo/ModalOcorrenciaAdmin.jsx
// ============================================================================
// Modal Dinâmico para Lançamento e Edição de Registros Administrativos (Padrão SIGEP / SEEDF):
// 1. ABONO — Abono de Ponto Art. 151 LC 840/2011, Abono Bimestral Lei 449/1993, Abono TRE
// 2. ATESTADO — Atestado até 03 dias, Comparecimento (Servidor, Família, Subsaúde), Ativ. Terapêutica, Exame Periódico
// 3. LICENÇA — Licença Médica/Odontológica, Acomp. Pessoa Doente Família, Maternidade, Paternidade, Adotante, Acidente
// 4. AFASTAMENTO — Casamento, Falecimento, Doação de Sangue, Eleitoral, Júri e Dispensas por Decreto
// 5. AUSÊNCIA / FALTA — Falta, Falta Injustificada, Falta Paralisação, Horas Não Trabalhadas
// 6. OUTROS — Negociação Interna (Banco de Horas/Reposição), Dia Letivo Móvel, Ponto Facultativo, Recesso, Suspensão de Aulas, Adicional Noturno
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";
import {
  XMarkIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  UserGroupIcon,
  Square2StackIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import {
  TIPOS_OCORRENCIA_ADMIN,
  LIMITE_ABONOS_ANUAL,
  CATEGORIAS_SERVIDOR,
  formatarCPF,
  getUsuarioLogadoRastreabilidade,
} from "./useAdministrativoData";

export const SUBTIPOS_POR_TIPO = {
  abono: [
    "ABONO DE PONTO ART 151 LEI COMP 840/2011",
    "ABONO DE PONTO BIMESTRAL LEI 449/1993",
    "Abono TRE",
  ],
  atestado: [
    "ATESTADO MEDICO DE ATE 03 DIAS",
    "ATESTADO COMPARECIMENTO SERVIDOR",
    "ATESTADO COMPARECIMENTO PESSOA DA FAMILIA",
    "ATESTADO COMPARECIMENTO A SUBSAUDE",
    "ATESTADO COMP ATIV TERAPEUTICA DEC 34.023/2012",
    "EXAME MEDICO PREV/PERIOD ART 62 LEI COMP 840/2011",
  ],
  licenca: [
    "LICENCA MEDICA OU ODONTOLOGICA",
    "LIC. ACOMP. PESSOA DOENTE FAMILIA (ATE 6 MESES)",
    "LICENCA MATERNIDADE LEI COMP 840/2011",
    "LIC MATERNIDADE (NATIMORTO)",
    "LIC PATERNIDADE ART 150 LEI COMP 840/2011",
    "LIC PATERNIDADE (Prorr Dec. 37.669/2016)",
    "LICENCA ADOTANTE",
    "LICENCA POR ACIDENTE EM SERVICO",
  ],
  afastamento: [
    "AFAST DOACAO SANGUE ART 62 LEI COMP 840/2011",
    "AFAST CASAMENTO ART 62 LEI COMP 840/2011",
    "AFAST FALECIMENTO FAMILIA LEI COMP 840/2011",
    "AFAST SERV ELEITORAL",
    "AFAST ALISTAR/TRANSF ELEITORAL",
    "AFAST JURI OU SERV.OBRIGAT.POR LEI",
    "Dispensa art. 5º Dec. 41841/2021",
    "Dispensa Serviço Dec. nº 40.020/2019",
  ],
  ausencia: [
    "FALTA",
    "FALTA INJUSTIFICADA",
    "FALTA PARALISACAO",
    "HORAS NAO TRABALHADAS",
  ],
  negociacao: [
    "NEGOCIAÇÃO INTERNA - DIREÇÃO / COORDENAÇÃO",
    "NEGOCIAÇÃO INTERNA — LIBERAÇÃO COM REPOSIÇÃO DE CARGA HORÁRIA",
    "NEGOCIAÇÃO INTERNA — TROCA DE TURNO / ACORDO COM A DIREÇÃO",
    "PONTO FACULTATIVO",
    "FALTA PARALISACAO",
    "DIA LETIVO MÓVEL",
    "RECESSO",
    "FERIADO",
    "SABADO LETIVO",
    "ADICIONAL NOTURNO",
    "SUSP. DAS AULAS Dec. nº 40.583/2020",
    "SUSP. DAS AULAS Dec. nº 40.817/2020",
    "SUSP. DAS AULAS Dec. nº 41.849/2021",
    "SUSP. DAS AULAS Dec. nº 41.913/2021",
  ],
};

// Grupos predefinidos para o Sub-Modal de Lançamento em Lote por Categoria
const GRUPOS_LOTE_RAPIDO = [
  {
    id: "todos",
    label: "Todos os Servidores",
    desc: "Corpo docente, direção, auxiliares, secretaria e terceirizados",
    cor: "#7c3aed",
    bg: "#f5f3ff",
    match: () => true,
  },
  {
    id: "professores",
    label: "Só Professores / Docentes",
    desc: "Apenas regentes e coordenação docente (efetivos e temporários)",
    cor: "#2563eb",
    bg: "#eff6ff",
    match: (s) => s.categoria === "professor",
  },
  {
    id: "auxiliares_apoio",
    label: "Só Auxiliares / Apoio & Adm.",
    desc: "Auxiliares operacionais, secretaria, administrativo e apoio",
    cor: "#059669",
    bg: "#ecfdf5",
    match: (s) =>
      ["operacional", "administrativo", "terceirizado"].includes(s.categoria),
  },
  {
    id: "direcao_pedagogico",
    label: "Direção & Coordenação",
    desc: "Equipe diretiva, supervisão e apoio técnico-pedagógico",
    cor: "#0284c7",
    bg: "#f0f9ff",
    match: (s) => ["direcao", "pedagogico"].includes(s.categoria),
  },
  {
    id: "efetivos",
    label: "Somente Efetivos",
    desc: "Servidores do quadro permanente da SEEDF (Magistério e PPGE)",
    cor: "#4f46e5",
    bg: "#eef2ff",
    match: (s) => s.vinculo === "efetivo" || s.vinculo === "readaptado",
  },
  {
    id: "temporarios",
    label: "Somente Contrato Temporário",
    desc: "Professores substitutos em regime de contrato temporário",
    cor: "#d97706",
    bg: "#fffbeb",
    match: (s) => s.vinculo === "temporario",
  },
  {
    id: "terceirizados",
    label: "Somente Terceirizados",
    desc: "Conservação/limpeza, portaria, vigilância e merenda terceirizada",
    cor: "#475569",
    bg: "#f8fafc",
    match: (s) =>
      s.vinculo === "terceirizado" || s.categoria === "terceirizado",
  },
  {
    id: "disciplinar",
    label: "Equipe Disciplinar / CCMDF",
    desc: "Gestão compartilhada cívico-militar e monitores disciplinares",
    cor: "#0f766e",
    bg: "#f0fdfa",
    match: (s) => s.categoria === "disciplinar",
  },
];

// Lista unificada de todos os eventos oficiais SIGEP/SEEDF para busca rápida transversal
const CATALOGO_EVENTOS_SIGEP = Object.entries(SUBTIPOS_POR_TIPO).flatMap(
  ([categoriaValue, subtipos]) => {
    const meta = TIPOS_OCORRENCIA_ADMIN.find((t) => t.value === categoriaValue);
    return subtipos.map((nome) => ({
      categoria: categoriaValue,
      categoriaLabel: meta?.shortLabel || categoriaValue,
      categoriaCor: meta?.cor || "#2563eb",
      categoriaBg: meta?.bg || "#dbeafe",
      subtipo: nome,
    }));
  }
);

function calcularDiasEntre(inicio, fim) {
  if (!inicio || !fim) return 1;
  const d1 = new Date(inicio + "T00:00:00");
  const d2 = new Date(fim + "T00:00:00");
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

function getStatusPadraoPorTipo(t, sub = "") {
  if (t === "negociacao") {
    return String(sub).toUpperCase().includes("NEGOCIAÇÃO INTERNA")
      ? "pendente_reposicao"
      : "registrado";
  }
  if (t === "atestado" || t === "licenca") return "homologado";
  if (t === "ausencia") return "registrado";
  return "aprovado";
}

export default function ModalOcorrenciaAdmin({
  aberto,
  onClose,
  onSave,
  servidores = [],
  statsPorServidor = {},
  registroEdicao = null,
  servidorPreSelecionado = null,
  tipoInicial = "abono",
  dataInicial = null,
}) {
  const hojeISO = new Date().toISOString().slice(0, 10);

  const [servidorId, setServidorId] = useState("");
  const [tipo, setTipo] = useState("abono");
  const [subtipo, setSubtipo] = useState("");
  const [buscaRapidaEvento, setBuscaRapidaEvento] = useState("");
  const [dataInicio, setDataInicio] = useState(hojeISO);
  const [dataFim, setDataFim] = useState(hojeISO);
  const [dias, setDias] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState(
    () => getUsuarioLogadoRastreabilidade().resumo
  );
  const [status, setStatus] = useState("aprovado");

  // Estados do Lançamento em Lote e Sub-Modal por Categoria (Passo 16)
  const [lancamentoEmLote, setLancamentoEmLote] = useState(false);
  const [subModalLoteAberto, setSubModalLoteAberto] = useState(false);
  const [servidoresLoteIds, setServidoresLoteIds] = useState([]);
  const [grupoLoteAtivo, setGrupoLoteAtivo] = useState("todos");
  const [buscaServidorLote, setBuscaServidorLote] = useState("");
  const [filtroVisaoLote, setFiltroVisaoLote] = useState("todos"); // "todos" | "selecionados" | "nao_selecionados"

  // Campos específicos Atestado / Licença / Afastamento Legal
  const [cid, setCid] = useState("");
  const [medico, setMedico] = useState("");
  const [documentoRef, setDocumentoRef] = useState("");

  // Campos específicos Ausência / Horas Não Trabalhadas
  const [horasAusencia, setHorasAusencia] = useState("");

  // Campos específicos Negociação Interna
  const [dataCompensacao, setDataCompensacao] = useState("");
  const [formaCompensacao, setFormaCompensacao] = useState("");

  const [erro, setErro] = useState("");
  const [campoErro, setCampoErro] = useState("");
  const servidorRef = useRef(null);
  const dataInicioRef = useRef(null);
  const motivoRef = useRef(null);

  const servidoresAtivos = useMemo(
    () => servidores.filter((s) => s.ativo !== false),
    [servidores]
  );

  useEffect(() => {
    if (!aberto) return;
    setErro("");
    setCampoErro("");
    setBuscaRapidaEvento("");
    setLancamentoEmLote(false);
    setSubModalLoteAberto(false);
    setServidoresLoteIds(servidores.filter((s) => s.ativo !== false).map((s) => s.id));
    setGrupoLoteAtivo("todos");
    setBuscaServidorLote("");
    setFiltroVisaoLote("todos");
    const usrLogado = getUsuarioLogadoRastreabilidade();

    if (registroEdicao) {
      const tEd = registroEdicao.tipo || "abono";
      setServidorId(registroEdicao.servidor_id || "");
      setTipo(tEd);
      setSubtipo(
        registroEdicao.subtipo || SUBTIPOS_POR_TIPO[tEd]?.[0] || ""
      );
      setDataInicio(registroEdicao.data_inicio || hojeISO);
      setDataFim(
        registroEdicao.data_fim || registroEdicao.data_inicio || hojeISO
      );
      setDias(registroEdicao.dias || 1);
      setMotivo(registroEdicao.motivo || "");
      // Rastreabilidade: identifica sempre o usuário logado responsável
      setAutorizadoPor(usrLogado.resumo);
      setStatus(registroEdicao.status || "aprovado");
      setCid(registroEdicao.cid || "");
      setMedico(registroEdicao.medico || "");
      setDocumentoRef(registroEdicao.documento_ref || "");
      setHorasAusencia(registroEdicao.horas_ausencia || "");
      setDataCompensacao(registroEdicao.data_compensacao || "");
      setFormaCompensacao(registroEdicao.forma_compensacao || "");
    } else {
      const t = SUBTIPOS_POR_TIPO[tipoInicial] ? tipoInicial : "abono";
      const subPadrao = SUBTIPOS_POR_TIPO[t]?.[0] || "";
      setServidorId(servidorPreSelecionado?.id || servidores[0]?.id || "");
      setTipo(t);
      setSubtipo(subPadrao);
      const dt = dataInicial || hojeISO;
      setDataInicio(dt);
      setDataFim(dt);
      setDias(1);
      setMotivo("");
      setAutorizadoPor(usrLogado.resumo);
      setStatus(getStatusPadraoPorTipo(t, subPadrao));
      setCid("");
      setMedico("");
      setDocumentoRef("");
      setHorasAusencia("");
      setDataCompensacao("");
      setFormaCompensacao("");
    }
  }, [
    aberto,
    registroEdicao,
    servidorPreSelecionado,
    tipoInicial,
    dataInicial,
    servidores,
    hojeISO,
  ]);

  // Atualiza dias automaticamente ao mudar datas
  useEffect(() => {
    if (!aberto) return;
    if (dataFim < dataInicio) {
      setDataFim(dataInicio);
      setDias(1);
    } else {
      setDias(calcularDiasEntre(dataInicio, dataFim));
    }
  }, [dataInicio, dataFim, aberto]);

  const handleTrocarTipo = (novoTipo, subtipoForcado = null) => {
    setTipo(novoTipo);
    if (novoTipo !== "negociacao") {
      setLancamentoEmLote(false);
      setSubModalLoteAberto(false);
    }
    const novoSub = subtipoForcado || SUBTIPOS_POR_TIPO[novoTipo]?.[0] || "";
    setSubtipo(novoSub);
    if (!registroEdicao) {
      setStatus(getStatusPadraoPorTipo(novoTipo, novoSub));
    }
  };

  const handleTrocarSubtipo = (novoSub) => {
    setSubtipo(novoSub);
    if (!registroEdicao) {
      setStatus(getStatusPadraoPorTipo(tipo, novoSub));
    }
  };

  // Alterna o checkbox "Lançamento em lote" abaixo do card OUTROS
  const handleToggleLancamentoEmLote = (checked) => {
    setLancamentoEmLote(checked);
    if (campoErro === "servidor") {
      setErro("");
      setCampoErro("");
    }
    if (checked) {
      if (servidoresLoteIds.length === 0) {
        setServidoresLoteIds(servidoresAtivos.map((s) => s.id));
        setGrupoLoteAtivo("todos");
      }
      // Se estava no subtipo padrão de negociação individual, sugere PONTO FACULTATIVO para facilitar o lote (mantendo editável)
      if (subtipo === "NEGOCIAÇÃO INTERNA - DIREÇÃO / COORDENAÇÃO") {
        setSubtipo("PONTO FACULTATIVO");
        setStatus("registrado");
      }
      setSubModalLoteAberto(true);
    } else {
      setSubModalLoteAberto(false);
    }
  };

  // Aplica um grupo rápido no Sub-Modal de Lote
  const handleAplicarGrupoLote = (grupoId) => {
    const grp = GRUPOS_LOTE_RAPIDO.find((g) => g.id === grupoId);
    if (!grp) return;
    setGrupoLoteAtivo(grupoId);
    const ids = servidoresAtivos.filter((s) => grp.match(s)).map((s) => s.id);
    setServidoresLoteIds(ids);
  };

  // Alterna uma categoria inteira (adicionar/remover todos daquela categoria)
  const handleToggleCategoriaLote = (catValue) => {
    setGrupoLoteAtivo("custom");
    const idsDaCat = servidoresAtivos
      .filter((s) => s.categoria === catValue)
      .map((s) => s.id);
    if (idsDaCat.length === 0) return;

    const todosMarcados = idsDaCat.every((id) =>
      servidoresLoteIds.includes(id)
    );
    if (todosMarcados) {
      setServidoresLoteIds((prev) =>
        prev.filter((id) => !idsDaCat.includes(id))
      );
    } else {
      setServidoresLoteIds((prev) =>
        Array.from(new Set([...prev, ...idsDaCat]))
      );
    }
  };

  // Alterna um servidor individual no lote
  const handleToggleServidorIndividualLote = (srvId) => {
    setGrupoLoteAtivo("custom");
    setServidoresLoteIds((prev) =>
      prev.includes(srvId)
        ? prev.filter((id) => id !== srvId)
        : [...prev, srvId]
    );
  };

  // Lista filtrada dentro do Sub-Modal de Lote
  const servidoresFiltradosSubModal = useMemo(() => {
    const q = buscaServidorLote.trim().toLowerCase();
    return servidoresAtivos.filter((s) => {
      const estaSel = servidoresLoteIds.includes(s.id);
      if (filtroVisaoLote === "selecionados" && !estaSel) return false;
      if (filtroVisaoLote === "nao_selecionados" && estaSel) return false;
      if (!q) return true;
      return (
        String(s.nome || "").toLowerCase().includes(q) ||
        String(s.cargo || "").toLowerCase().includes(q) ||
        String(s.cpf || "").includes(q) ||
        String(s.matricula || "").toLowerCase().includes(q) ||
        String(s.turno || "").toLowerCase().includes(q)
      );
    });
  }, [servidoresAtivos, servidoresLoteIds, buscaServidorLote, filtroVisaoLote]);

  // Resumo estatístico dos servidores selecionados no lote por categoria
  const resumoCategoriasLote = useMemo(() => {
    const selecionados = servidoresAtivos.filter((s) =>
      servidoresLoteIds.includes(s.id)
    );
    const contagemPorCat = {};
    selecionados.forEach((s) => {
      const c = s.categoria || "administrativo";
      contagemPorCat[c] = (contagemPorCat[c] || 0) + 1;
    });
    const badges = CATEGORIAS_SERVIDOR.map((cat) => ({
      ...cat,
      qtd: contagemPorCat[cat.value] || 0,
      totalCategoria: servidoresAtivos.filter((s) => s.categoria === cat.value)
        .length,
    })).filter((b) => b.totalCategoria > 0);

    return {
      selecionados,
      badges,
    };
  }, [servidoresAtivos, servidoresLoteIds]);

  // Resultados da busca rápida no catálogo SIGEP/SEEDF
  const resultadosBuscaEvento = useMemo(() => {
    const q = buscaRapidaEvento.trim().toLowerCase();
    if (!q) return [];
    return CATALOGO_EVENTOS_SIGEP.filter(
      (item) =>
        item.subtipo.toLowerCase().includes(q) ||
        item.categoriaLabel.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [buscaRapidaEvento]);

  const servidorAtual = useMemo(
    () => servidores.find((s) => s.id === servidorId),
    [servidores, servidorId]
  );

  const statsServidor = statsPorServidor[servidorId] || {
    abonosUsados: 0,
    abonosRestantes: LIMITE_ABONOS_ANUAL,
    diasAtestado: 0,
    negociacoesPendentes: 0,
  };

  if (!aberto) return null;

  const isNegociacaoInterna =
    tipo === "negociacao" &&
    String(subtipo).toUpperCase().includes("NEGOCIAÇÃO INTERNA");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (lancamentoEmLote && tipo === "negociacao" && !registroEdicao) {
      if (servidoresLoteIds.length === 0) {
        const msg =
          "Selecione pelo menos 1 servidor ou categoria no gerenciamento de Lançamento em Lote.";
        setErro(msg);
        setCampoErro("servidor");
        toast.error(msg);
        setSubModalLoteAberto(true);
        return;
      }
    } else if (!servidorId) {
      const msg = "Selecione o servidor ou colaborador para vincular o registro.";
      setErro(msg);
      setCampoErro("servidor");
      toast.error(msg);
      setTimeout(() => {
        servidorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        servidorRef.current?.focus();
      }, 60);
      return;
    }

    if (!dataInicio) {
      const msg = "Informe a data inicial do registro.";
      setErro(msg);
      setCampoErro("dataInicio");
      toast.error(msg);
      setTimeout(() => {
        dataInicioRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        dataInicioRef.current?.focus();
      }, 60);
      return;
    }
    if (!motivo.trim()) {
      const msg = "Descreva a justificativa, observação ou fundamentação do registro.";
      setErro(msg);
      setCampoErro("motivo");
      toast.error(msg);
      setTimeout(() => {
        motivoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        motivoRef.current?.focus();
      }, 60);
      return;
    }

    // Se o usuário selecionou FALTA PARALISACAO dentro de OUTROS (Lançamento em Lote ou Individual),
    // preserva a classificação oficial SIGEP para refletir código 40034 nas folhas
    const grupoAtivoObj = GRUPOS_LOTE_RAPIDO.find((g) => g.id === grupoLoteAtivo);

    if (lancamentoEmLote && tipo === "negociacao" && !registroEdicao) {
      onSave({
        id: null,
        lancamento_em_lote: true,
        servidores_ids: servidoresLoteIds,
        resumo_lote_categoria: grupoAtivoObj?.label || "Seleção Personalizada",
        tipo,
        subtipo,
        data_inicio: dataInicio,
        data_fim: dataFim || dataInicio,
        dias: Number(dias) || 1,
        motivo: motivo.trim(),
        autorizado_por: autorizadoPor.trim() || "Direção Escolar",
        status,
        cid: "",
        medico: "",
        documento_ref: "",
        horas_ausencia: "",
        data_compensacao: dataCompensacao,
        forma_compensacao: formaCompensacao.trim(),
      });
      toast.success(
        `Lançamento em lote confirmado para ${servidoresLoteIds.length} servidor(es)!`
      );
      onClose();
      return;
    }

    onSave({
      id: registroEdicao?.id || null,
      servidor_id: servidorId,
      tipo,
      subtipo,
      data_inicio: dataInicio,
      data_fim: dataFim || dataInicio,
      dias: Number(dias) || 1,
      motivo: motivo.trim(),
      autorizado_por: autorizadoPor.trim() || "Direção Escolar",
      status,
      cid: tipo === "atestado" || tipo === "licenca" ? cid.trim() : "",
      medico: tipo === "atestado" || tipo === "licenca" ? medico.trim() : "",
      documento_ref:
        tipo === "atestado" || tipo === "licenca" || tipo === "afastamento"
          ? documentoRef.trim()
          : "",
      horas_ausencia: tipo === "ausencia" ? horasAusencia.trim() : "",
      data_compensacao: tipo === "negociacao" ? dataCompensacao : "",
      forma_compensacao: tipo === "negociacao" ? formaCompensacao.trim() : "",
    });
    toast.success(
      registroEdicao
        ? "Registro administrativo atualizado com sucesso!"
        : "Registro administrativo confirmado com sucesso!"
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header Fixo */}
        <div
          className="px-6 py-4 flex items-center justify-between text-white flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
              <CalendarDaysIcon className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">
                  {registroEdicao
                    ? "Editar Registro Administrativo"
                    : "Novo Registro / Ocorrência de Servidor"}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">
                  Catálogo Oficial SEEDF / SIGEP
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Controle oficial de abonos, atestados, licenças, afastamentos legais, faltas e acordos internos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Corpo Rolável do Formulário */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Legenda do Mapeamento de Edição da Folha de Ponto (PASSO 19) */}
            <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-300 flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex-shrink-0 shadow-sm">
                  🖨️
                </span>
                <div className="text-xs text-emerald-950 leading-snug">
                  <span className="font-extrabold uppercase tracking-wide">
                    Mapeamento da Folha de Ponto:
                  </span>{" "}
                  Os campos em{" "}
                  <span className="px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-950 font-extrabold border border-emerald-400">
                    verde claro
                  </span>{" "}
                  são impressos nas linhas diárias (01 a 31), no quadro de Observações e nos códigos SIGEP do Resumo da Frequência (Verso).
                </div>
              </div>
              <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-white text-emerald-800 border border-emerald-300 flex-shrink-0">
                7 Campos na Folha
              </span>
            </div>

            {/* 1. Seletor de Categoria (6 Cards Interativos no Topo) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Natureza / Categoria do Registro Administrativo (6 Grupos)
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {CATALOGO_EVENTOS_SIGEP.length} ocorrências oficiais SIGEP/SEEDF organizadas por categoria
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {TIPOS_OCORRENCIA_ADMIN.map((t) => {
                const ativo = tipo === t.value;
                const qtdOpcoes = (SUBTIPOS_POR_TIPO[t.value] || []).length;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTrocarTipo(t.value)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      ativo
                        ? "ring-2 ring-offset-1 shadow-sm"
                        : "hover:bg-slate-50 border-slate-200 opacity-85"
                    }`}
                    style={{
                      backgroundColor: ativo ? t.bg : "#ffffff",
                      borderColor: ativo ? t.cor : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-extrabold uppercase tracking-wider"
                        style={{ color: ativo ? t.cor : "#334155" }}
                      >
                        {t.shortLabel}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: ativo ? "#ffffff" : t.bg,
                            color: t.cor,
                          }}
                        >
                          {qtdOpcoes}
                        </span>
                        {ativo && (
                          <CheckCircleIcon
                            className="h-4 w-4"
                            style={{ color: t.cor }}
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-600 leading-tight line-clamp-2">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* PASSO 16: Linha abaixo dos cards quando OUTROS está selecionado -> Checkbox "Lançamento em lote" */}
            {tipo === "negociacao" && !registroEdicao && (
              <div
                className={`mt-3 p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn ${
                  lancamentoEmLote
                    ? "bg-purple-50/95 border-purple-400 ring-2 ring-purple-200/80 shadow-sm"
                    : "bg-purple-50/50 border-purple-200 hover:border-purple-300"
                }`}
              >
                <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none flex-1">
                  <input
                    type="checkbox"
                    checked={lancamentoEmLote}
                    onChange={(e) =>
                      handleToggleLancamentoEmLote(e.target.checked)
                    }
                    className="mt-0.5 sm:mt-0 h-5 w-5 rounded border-purple-400 text-purple-700 focus:ring-purple-500 cursor-pointer flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-purple-950 tracking-tight">
                        Lançamento em lote
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-200/80 text-purple-900 border border-purple-300">
                        Registro Coletivo / Por Categoria
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800/90 mt-0.5 leading-snug">
                      Aplicar este registro coletivamente para todos os servidores ou por categoria específica (ex: Ponto Facultativo, Falta Paralisação Grevista, Dia Letivo Móvel, Recesso) sem precisar lançar nominalmente um por um.
                    </p>
                  </div>
                </label>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {lancamentoEmLote ? (
                    <button
                      type="button"
                      onClick={() => setSubModalLoteAberto(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold shadow-sm transition"
                    >
                      <AdjustmentsHorizontalIcon className="h-4 w-4" />
                      <span>
                        Gerenciar Categorias ({servidoresLoteIds.length})
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleLancamentoEmLote(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold transition"
                    >
                      <UserGroupIcon className="h-4 w-4 text-purple-600" />
                      <span>Selecionar por Categoria</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Seletor de Servidor (Individual ou Resumo do Lote por Categoria) */}
          <div className="p-3 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-950">
                <span>
                  {lancamentoEmLote && tipo === "negociacao" && !registroEdicao
                    ? "2. Servidores & Categorias Contemplados no Lançamento em Lote"
                    : "2. Servidor / Professor / Colaborador"}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900 border border-emerald-400/70">
                  🖨️ Vincula à Folha de Ponto
                </span>
              </label>
              {campoErro === "servidor" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200">
                  Seleção Obrigatória
                </span>
              )}
            </div>

            {lancamentoEmLote && tipo === "negociacao" && !registroEdicao ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/95 via-white to-purple-50/70 border border-emerald-400 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                      <UserGroupIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {servidoresLoteIds.length} de {servidoresAtivos.length} servidores selecionados no lote
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {GRUPOS_LOTE_RAPIDO.find((g) => g.id === grupoLoteAtivo)
                            ?.label || "Seleção Personalizada por Categoria"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        O registro será gravado automaticamente na folha de frequência e no prontuário de cada servidor marcado.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSubModalLoteAberto(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-400 text-xs font-extrabold shadow-sm transition flex-shrink-0"
                  >
                    <Square2StackIcon className="h-4 w-4 text-emerald-700" />
                    <span>Abrir Sub-Modal de Categorias</span>
                  </button>
                </div>

                {/* Atalhos Rápidos de Categoria + Contadores */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 mr-1">
                    Filtro Rápido:
                  </span>
                  {GRUPOS_LOTE_RAPIDO.slice(0, 6).map((grp) => {
                    const qtdGrupo = servidoresAtivos.filter((s) =>
                      grp.match(s)
                    ).length;
                    if (qtdGrupo === 0 && grp.id !== "todos") return null;
                    const ativo = grupoLoteAtivo === grp.id;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => handleAplicarGrupoLote(grp.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          ativo
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                        }`}
                      >
                        {grp.label} ({qtdGrupo})
                      </button>
                    );
                  })}
                </div>

                {/* Resumo das Categorias Contempladas */}
                {resumoCategoriasLote.badges.some((b) => b.qtd > 0) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {resumoCategoriasLote.badges
                      .filter((b) => b.qtd > 0)
                      .map((b) => (
                        <span
                          key={b.value}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                          style={{
                            backgroundColor: b.bg,
                            color: b.cor,
                            borderColor: b.cor + "40",
                          }}
                        >
                          {b.label}: {b.qtd}/{b.totalCategoria}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <select
                    ref={servidorRef}
                    value={servidorId}
                    onChange={(e) => {
                      setServidorId(e.target.value);
                      if (campoErro === "servidor") {
                        setErro("");
                        setCampoErro("");
                      }
                    }}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition ${
                      campoErro === "servidor"
                        ? "border-red-500 ring-2 ring-red-200 bg-red-50/40"
                        : "border-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/90"
                    }`}
                  >
                    <option value="">— Selecione o profissional —</option>
                    {servidores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} • {s.cargo} (
                        {s.acesso_sistema ? "Com Acesso" : "Sem Acesso / Interno"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Card Resumo do Servidor Selecionado */}
                {servidorAtual && (
                  <div className="mt-2.5 p-3 rounded-xl bg-white border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                        {String(servidorAtual.nome || "S")
                          .split(" ")
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {servidorAtual.nome}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {servidorAtual.cargo} • CPF:{" "}
                          {formatarCPF(servidorAtual.cpf)} • Turno:{" "}
                          {servidorAtual.turno}
                        </div>
                      </div>
                    </div>

                    {/* Indicadores de Saldo de Abonos e Reposições */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          statsServidor.abonosUsados >= LIMITE_ABONOS_ANUAL
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        Abonos Art. 151 no Ano: {statsServidor.abonosUsados}/
                        {LIMITE_ABONOS_ANUAL}
                      </div>
                      {statsServidor.negociacoesPendentes > 0 && (
                        <div className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {statsServidor.negociacoesPendentes} Reposição Pendente
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tipo === "abono" &&
                  subtipo !== "Abono TRE" &&
                  statsServidor.abonosUsados >= LIMITE_ABONOS_ANUAL &&
                  !registroEdicao && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span>
                        <strong>Atenção:</strong> Este servidor já atingiu a cota de{" "}
                        <strong>{LIMITE_ABONOS_ANUAL} abonos anuais</strong> (Art. 151 LC 840/2011). Verifique se trata-se de <strong>Abono TRE</strong> ou <strong>Afastamento Legal</strong>.
                      </span>
                    </div>
                  )}
              </>
            )}
          </div>

          {/* 3. Classificação / Subtipo (Com Busca Rápida Transversal no Catálogo SIGEP) e Situação */}
          <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300">
            {/* Barra de Localização Rápida de Evento SIGEP */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 text-emerald-700 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaRapidaEvento}
                onChange={(e) => setBuscaRapidaEvento(e.target.value)}
                placeholder="Pesquisa rápida em todos os eventos SIGEP/SEEDF (ex: Ponto Facultativo, Paralisação, Art 151, Sangue, TRE)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-emerald-300 bg-white text-xs text-slate-700 focus:border-emerald-500 outline-none"
              />
              {resultadosBuscaEvento.length > 0 && (
                <div className="mt-1.5 p-2 rounded-xl bg-white border border-emerald-300 shadow-lg space-y-1 max-h-48 overflow-y-auto">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400 px-2 py-0.5">
                    Clique para selecionar automaticamente a Categoria e o Evento:
                  </div>
                  {resultadosBuscaEvento.map((item) => (
                    <button
                      key={`${item.categoria}-${item.subtipo}`}
                      type="button"
                      onClick={() => {
                        handleTrocarTipo(item.categoria, item.subtipo);
                        setBuscaRapidaEvento("");
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 flex items-center justify-between gap-2 text-xs transition"
                    >
                      <span className="font-bold text-slate-800">
                        {item.subtipo}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold flex-shrink-0"
                        style={{
                          backgroundColor: item.categoriaBg,
                          color: item.categoriaCor,
                        }}
                      >
                        {item.categoriaLabel}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider text-emerald-950 mb-1.5">
                  <span>3. Evento / Classificação Oficial (SIGEP / SEEDF)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900 border border-emerald-400/70">
                    🖨️ Linha + Código SIGEP
                  </span>
                </label>
                <select
                  value={subtipo}
                  onChange={(e) => handleTrocarSubtipo(e.target.value)}
                  className="w-full rounded-xl border border-emerald-400 bg-emerald-100/60 px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {(SUBTIPOS_POR_TIPO[tipo] || []).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center justify-between gap-1 text-xs font-bold uppercase tracking-wider text-emerald-950 mb-1.5">
                  <span>Situação do Registro</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900 border border-emerald-400/70">
                    🖨️ Ativa na Folha
                  </span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-emerald-400 bg-emerald-100/60 px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {isNegociacaoInterna ? (
                    <>
                      <option value="pendente_reposicao">
                        ⏳ Pendente de Reposição / Cumprimento
                      </option>
                      <option value="compensado">
                        ✅ Compensado / Acordo Quitado
                      </option>
                      <option value="cancelado">🚫 Cancelado</option>
                    </>
                  ) : (
                    <>
                      <option value="aprovado">✅ Deferido / Aprovado</option>
                      <option value="homologado">
                        📋 Homologado / Arquivado (Subsaúde / SEI)
                      </option>
                      <option value="registrado">
                        📌 Registrado em Folha (SIGEP)
                      </option>
                      <option value="pendente_documento">
                        ⚠️ Aguardando Comprovante / Certidão
                      </option>
                      <option value="cancelado">
                        🚫 Cancelado / Indeferido
                      </option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* 4. Período (Data Início, Data Fim, Total de Dias) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/75 p-3.5 rounded-xl border-2 border-emerald-300">
            <div>
              <label className="flex items-center justify-between gap-1 text-xs font-bold text-emerald-950 mb-1">
                <span>Data Inicial</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900 border border-emerald-400/70">
                  🖨️ Dia Início
                </span>
              </label>
              <input
                ref={dataInicioRef}
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  if (campoErro === "dataInicio") {
                    setErro("");
                    setCampoErro("");
                  }
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold text-slate-900 transition ${
                  campoErro === "dataInicio"
                    ? "border-red-500 ring-2 ring-red-200 bg-red-50/40"
                    : "border-emerald-400 bg-emerald-100/60 focus:ring-2 focus:ring-emerald-500 outline-none"
                }`}
              />
            </div>
            <div>
              <label className="flex items-center justify-between gap-1 text-xs font-bold text-emerald-950 mb-1">
                <span>Data Final</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900 border border-emerald-400/70">
                  🖨️ Dia Fim
                </span>
              </label>
              <input
                type="date"
                value={dataFim}
                min={dataInicio}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-lg border border-emerald-400 px-3 py-2 text-sm font-semibold text-slate-900 bg-emerald-100/60 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="flex items-center justify-between gap-1 text-xs font-bold text-emerald-950 mb-1">
                <span>Qtd. de Dias</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900 border border-emerald-400/70">
                  🖨️ Nº Dias (Verso)
                </span>
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-emerald-400 px-3 py-2 text-sm font-extrabold text-emerald-900 bg-emerald-100/60 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Alerta Inteligente quando ATESTADO MEDICO DE ATE 03 DIAS ultrapassa 3 dias */}
          {tipo === "atestado" &&
            subtipo === "ATESTADO MEDICO DE ATE 03 DIAS" &&
            Number(dias) > 3 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <span>
                    O período selecionado possui <strong>{dias} dias</strong> (acima de 03 dias). Pela norma da SEEDF, afastamentos médicos superiores a 3 dias devem ser registrados na categoria{" "}
                    <strong>LICENÇA (Licença Médica ou Odontológica — Subsaúde)</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleTrocarTipo(
                      "licenca",
                      "LICENCA MEDICA OU ODONTOLOGICA"
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex-shrink-0 transition"
                >
                  Mudar p/ Licença
                </button>
              </div>
            )}

          {/* Campos Específicos: ATESTADO MÉDICO ou LICENÇA MÉDICA / FAMILIAR */}
          {(tipo === "atestado" || tipo === "licenca") && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <DocumentTextIcon className="h-4 w-4" />
                {tipo === "licenca"
                  ? "Dados da Licença / Homologação Subsaúde / SEI"
                  : "Dados do Atestado / Comparecimento / Exame Médico"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código CID (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: J06.9 / Z76.3"
                    value={cid}
                    onChange={(e) => setCid(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Médico(a) / Odontólogo / CRM
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dr. Silva - CRM/DF 12345"
                    value={medico}
                    onChange={(e) => setMedico(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/90 border border-emerald-300">
                  <label className="flex items-center justify-between gap-1 text-xs font-bold text-emerald-950 mb-1">
                    <span>Nº Processo SEI / Subsaúde / Anexo</span>
                    <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-emerald-200 text-emerald-900">
                      🖨️ Obs. Folha
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SEI-00080-001234/2026"
                    value={documentoRef}
                    onChange={(e) => setDocumentoRef(e.target.value)}
                    className="w-full rounded-lg border border-emerald-400 px-3 py-2 text-sm font-semibold text-slate-900 bg-emerald-100/60 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos Específicos: AFASTAMENTO & DISPENSA LEGAL (Art. 62 LC 840, TRE, Júri, Decretos) */}
          {tipo === "afastamento" && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <ShieldCheckIcon className="h-4 w-4 text-amber-700" />
                Documentação Comprobatória do Afastamento Legal (LC 840/2011 / TRE / Decreto)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-300">
                  <label className="flex items-center justify-between gap-1 text-xs font-bold text-emerald-950 mb-1">
                    <span>Nº Processo SEI / Certidão / Declaração Oficial</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900 border border-emerald-400/70">
                      🖨️ Obs. Folha
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Certidão de Casamento / Declaração Hemocentro / TRE / SEI"
                    value={documentoRef}
                    onChange={(e) => setDocumentoRef(e.target.value)}
                    className="w-full rounded-lg border border-emerald-400 px-3 py-2 text-sm font-semibold text-slate-900 bg-emerald-100/60 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex items-center">
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    <strong>Referência Legal (Art. 62 LC 840/2011):</strong> Doação de sangue (1 dia), Alistamento/Transferência eleitoral (até 2 dias), Casamento ou Falecimento de familiar (8 dias consecutivos).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Campos Específicos: AUSÊNCIA / FALTA / HORAS NÃO TRABALHADAS */}
          {tipo === "ausencia" && (
            <div className="p-4 rounded-xl bg-red-50/60 border border-red-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Carga Horária / Horas Não Trabalhadas (se parcial)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dia inteiro (8h) ou 02h00 de horas não trabalhadas"
                    value={horasAusencia}
                    onChange={(e) => setHorasAusencia(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-red-700 leading-relaxed">
                    Registre se houve comunicação prévia à chefia imediata ou se a ocorrência impacta o fechamento da folha mensal no SIGEP.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Campos Específicos: NEGOCIAÇÃO INTERNA & EVENTOS DE CALENDÁRIO */}
          {tipo === "negociacao" && (
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                <ArrowsRightLeftIcon className="h-4 w-4" />
                {isNegociacaoInterna
                  ? "Plano de Compensação / Acordo Interno com a Direção"
                  : "Detalhamento de Calendário / Adicional Noturno / Decreto"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Prevista p/ Reposição (se aplicável)
                  </label>
                  <input
                    type="date"
                    value={dataCompensacao}
                    onChange={(e) => setDataCompensacao(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Compensação / Referência do Decreto ou Turno
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Reposição no contra-turno dia 14/11 ou referência à Portaria/Decreto..."
                    value={formaCompensacao}
                    onChange={(e) => setFormaCompensacao(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Motivo / Justificativa e Responsável pela Autorização */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Justificativa / Detalhamento / Observações Administrativas{" "}
                  <span className="text-red-500">*</span>
                </label>
                {campoErro === "motivo" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200 animate-pulse">
                    Preenchimento Obrigatório
                  </span>
                )}
              </div>
              <textarea
                ref={motivoRef}
                rows={3}
                placeholder="Descreva os detalhes do registro para constar no prontuário e espelho de ponto do servidor..."
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  if (campoErro === "motivo" || erro) {
                    setErro("");
                    setCampoErro("");
                  }
                }}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 outline-none transition ${
                  campoErro === "motivo"
                    ? "border-red-500 ring-2 ring-red-200 bg-red-50/40"
                    : "border-slate-300 focus:ring-2 focus:ring-blue-500"
                }`}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Autorizado / Registrado por
                </label>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <LockClosedIcon className="h-3 w-3 text-slate-500" />
                  Rastreabilidade Automática (Usuário Logado)
                </span>
              </div>
              <div className="relative flex items-center">
                <LockClosedIcon className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={autorizadoPor}
                  readOnly
                  disabled
                  title="Campo bloqueado para auditoria: preenchido automaticamente com a identificação do usuário logado."
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/90 pl-9 pr-32 py-2.5 text-sm font-bold text-slate-700 cursor-not-allowed select-none outline-none"
                />
                <span className="absolute right-3 px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider pointer-events-none">
                  Sessão Ativa
                </span>
              </div>
            </div>
          </div>
          </div>

          {/* Rodapé Fixo com Alerta Prêmium 100% Visível + Botões de Ação */}
          <div className="px-6 py-4 bg-slate-50/95 border-t border-slate-200 flex-shrink-0 space-y-3">
            {erro && (
              <div
                role="alert"
                className="p-3.5 rounded-xl text-white shadow-lg flex items-center justify-between gap-3 animate-fadeIn"
                style={{
                  background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 55%, #e11d48 100%)",
                  boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.35)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-red-100">
                      Atenção • Campo Obrigatório Pendente
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                      {erro}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErro("");
                    setCampoErro("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition flex-shrink-0"
                  title="Fechar aviso"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-slate-500">
                {lancamentoEmLote && tipo === "negociacao" && !registroEdicao ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-purple-800 bg-purple-100/80 px-2.5 py-1 rounded-lg border border-purple-200">
                    <UserGroupIcon className="h-4 w-4 text-purple-700" />
                    Modo Lançamento em Lote Ativo • {servidoresLoteIds.length} servidor(es)
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-95 transition"
                  style={{
                    background:
                      lancamentoEmLote && tipo === "negociacao" && !registroEdicao
                        ? "linear-gradient(135deg, #581c87, #7e22ce)"
                        : "linear-gradient(135deg, #1e3a8a, #2563eb)",
                  }}
                >
                  {registroEdicao
                    ? "Salvar Alterações"
                    : lancamentoEmLote && tipo === "negociacao"
                      ? `Confirmar Lançamento em Lote (${servidoresLoteIds.length})`
                      : "Confirmar Registro"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── SUB-MODAL PREMIUM: GERENCIAMENTO DE LANÇAMENTO EM LOTE POR CATEGORIA (PASSO 16) ── */}
      {subModalLoteAberto &&
        lancamentoEmLote &&
        tipo === "negociacao" &&
        !registroEdicao && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header do Sub-Modal */}
              <div
                className="px-6 py-4 flex items-center justify-between text-white flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #3b0764 0%, #581c87 55%, #6d28d9 100%)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur border border-white/20">
                    <UserGroupIcon className="h-6 w-6 text-purple-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-extrabold tracking-tight">
                        Gerenciamento de Lançamento em Lote por Categoria
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-300/20 text-purple-100 border border-purple-300/40">
                        Seleção Coletiva Inteligente
                      </span>
                    </div>
                    <p className="text-xs text-purple-200 mt-0.5">
                      Selecione rapidamente por grupo funcional (ex: só professores, só auxiliares, efetivos, temporários) ou ajuste nominalmente
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubModalLoteAberto(false)}
                  className="p-1.5 rounded-lg hover:bg-white/15 transition text-white"
                  title="Fechar sub-modal"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Corpo do Sub-Modal */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* 1. Cards de Seleção Rápida por Grupo / Categoria */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      1. Seleção Rápida por Grupo / Categoria Funcional (1 Clique)
                    </label>
                    <span className="text-[11px] font-semibold text-purple-700">
                      Clique em um card para selecionar o grupo correspondente
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {GRUPOS_LOTE_RAPIDO.map((grp) => {
                      const qtdNoGrupo = servidoresAtivos.filter((s) =>
                        grp.match(s)
                      ).length;
                      const isAtivo = grupoLoteAtivo === grp.id;
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => handleAplicarGrupoLote(grp.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            isAtivo
                              ? "ring-2 ring-purple-600 bg-purple-50/90 border-purple-500 shadow-sm"
                              : "bg-white hover:bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className="text-xs font-extrabold leading-tight"
                              style={{ color: isAtivo ? "#581c87" : grp.cor }}
                            >
                              {grp.label}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold flex-shrink-0"
                              style={{
                                backgroundColor: isAtivo ? "#6d28d9" : grp.bg,
                                color: isAtivo ? "#ffffff" : grp.cor,
                              }}
                            >
                              {qtdNoGrupo}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                            {grp.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Composição Combinada por Categoria (Ativar/Desativar Categorias) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      2. Combinar Categorias Específicas (Marcar / Desmarcar Categoria)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Clique nas categorias abaixo para somar ou remover grupos inteiros do lote
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {resumoCategoriasLote.badges.map((cat) => {
                      const todosDaCatMarcados =
                        cat.totalCategoria > 0 &&
                        cat.qtd === cat.totalCategoria;
                      const parcial = cat.qtd > 0 && !todosDaCatMarcados;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => handleToggleCategoriaLote(cat.value)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                            todosDaCatMarcados
                              ? "bg-purple-700 text-white border-purple-700 shadow-sm"
                              : parcial
                                ? "bg-purple-100 text-purple-900 border-purple-400"
                                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            readOnly
                            checked={todosDaCatMarcados}
                            ref={(el) => {
                              if (el) el.indeterminate = parcial;
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-purple-700 pointer-events-none"
                          />
                          <span>{cat.label}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              todosDaCatMarcados
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {cat.qtd}/{cat.totalCategoria}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Barra de Pesquisa Nominal + Filtros + Lista de Servidores */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={buscaServidorLote}
                        onChange={(e) => setBuscaServidorLote(e.target.value)}
                        placeholder="Pesquisar servidor por nome, cargo, CPF, matrícula ou turno..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none focus:border-purple-600"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: "todos", label: `Todos (${servidoresAtivos.length})` },
                        {
                          id: "selecionados",
                          label: `Marcados (${servidoresLoteIds.length})`,
                        },
                        {
                          id: "nao_selecionados",
                          label: `Desmarcados (${Math.max(0, servidoresAtivos.length - servidoresLoteIds.length)})`,
                        },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFiltroVisaoLote(f.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                            filtroVisaoLote === f.id
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setGrupoLoteAtivo("custom");
                          const idsVisiveis = servidoresFiltradosSubModal.map(
                            (s) => s.id
                          );
                          setServidoresLoteIds((prev) =>
                            Array.from(new Set([...prev, ...idsVisiveis]))
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                      >
                        Marcar Visíveis
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGrupoLoteAtivo("custom");
                          const idsVisiveis = new Set(
                            servidoresFiltradosSubModal.map((s) => s.id)
                          );
                          setServidoresLoteIds((prev) =>
                            prev.filter((id) => !idsVisiveis.has(id))
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                      >
                        Desmarcar Visíveis
                      </button>
                    </div>
                  </div>

                  {/* Lista Rolável de Servidores com Checkboxes */}
                  <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {servidoresFiltradosSubModal.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Nenhum servidor encontrado para o filtro selecionado.
                      </div>
                    ) : (
                      servidoresFiltradosSubModal.map((srv) => {
                        const selecionado = servidoresLoteIds.includes(srv.id);
                        const catMeta = CATEGORIAS_SERVIDOR.find(
                          (c) => c.value === srv.categoria
                        );
                        return (
                          <label
                            key={srv.id}
                            className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                              selecionado
                                ? "bg-purple-50/50 hover:bg-purple-50"
                                : "hover:bg-slate-50 opacity-75"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={() =>
                                  handleToggleServidorIndividualLote(srv.id)
                                }
                                className="h-4 w-4 rounded border-slate-300 text-purple-700 focus:ring-purple-500 cursor-pointer flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {srv.nome}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {srv.cargo} • Turno: {srv.turno || "Integral"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {catMeta && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                                  style={{
                                    backgroundColor: catMeta.bg,
                                    color: catMeta.cor,
                                  }}
                                >
                                  {catMeta.label}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                                {srv.vinculo || "efetivo"}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Rodapé do Sub-Modal */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
                <div className="text-xs text-slate-700">
                  <span className="font-extrabold text-purple-900">
                    {servidoresLoteIds.length} de {servidoresAtivos.length}
                  </span>{" "}
                  servidores selecionados para receber o lançamento coletivo.
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setGrupoLoteAtivo("custom");
                      setServidoresLoteIds([]);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                  >
                    Limpar Seleção
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubModalLoteAberto(false)}
                    className="px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-extrabold shadow-md hover:opacity-95 transition"
                    style={{
                      background:
                        "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
                    }}
                  >
                    Confirmar Grupo Selecionado ({servidoresLoteIds.length} servidores)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
