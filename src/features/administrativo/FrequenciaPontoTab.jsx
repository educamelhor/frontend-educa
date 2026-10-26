// src/features/administrativo/FrequenciaPontoTab.jsx
// ============================================================================
// Aba 2: CONTROLE DIÁRIO DE FREQUÊNCIA & PONTO DOS SERVIDORES
// - Integração com Direção -> Governança -> Ano Letivo (Fallback automático
//   de PRESENTE em todos os Dias Letivos quando a Biometria está desligada).
// - Modo Biometria (Ponto Eletrônico) com botão Pill Liga/Desliga preparado
//   para leitura de Entrada/Saída no 1º Turno e 2º Turno (Intervalo de Almoço).
// - Botão e Modal Premium de REGISTRO COLETIVO (Ponto Facultativo, Dia Letivo
//   Móvel, Decreto, Paralisação, etc.) por vínculo, categoria e turno.
// - Coluna Status de Frequência em grade compacta 3x2 (clique seleciona,
//   clique novamente na mesma opção desmarca).
// - Duas colunas de ENTRADA / SAÍDA (1º Turno e 2º Turno / Pós-Almoço) com
//   identificação dinâmica do turno conforme o cadastro de cada servidor.
// ============================================================================

import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  FingerPrintIcon,
  UserGroupIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  CATEGORIAS_SERVIDOR,
  VINCULOS_SERVIDOR,
  TURNOS_TRABALHO,
  normalizarTurno,
  getTurnosEJornadaServidor,
  verificarDiaLetivoGovernanca,
} from "./useAdministrativoData";

const STATUS_PONTO_OPCOES = [
  { value: "presente", label: "Presente", short: "Presente", cor: "#059669", bg: "#d1fae5", border: "#6ee7b7" },
  { value: "abono", label: "Abono", short: "Abono", cor: "#0d9488", bg: "#ccfbf1", border: "#5eead4" },
  { value: "atestado", label: "Atestado", short: "Atestado", cor: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
  { value: "atraso", label: "Atraso / Parcial", short: "Atraso/Parc.", cor: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  { value: "negociacao", label: "Negociação", short: "Negociação", cor: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
  { value: "falta", label: "Falta", short: "Falta", cor: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
];

const PRESETS_COLETIVOS = [
  {
    id: "ponto_facultativo",
    label: "Ponto Facultativo (Decreto / GDF)",
    statusSugerido: "abono",
    observacaoSugerida: "Ponto Facultativo oficial conforme Decreto / Calendário GDF.",
  },
  {
    id: "dia_letivo_movel",
    label: "Dia Letivo Móvel / Recesso Escolar",
    statusSugerido: "abono",
    observacaoSugerida: "Dispensa coletiva — Dia Letivo Móvel / Recesso previsto no Calendário Escolar.",
  },
  {
    id: "paralisacao_greve",
    label: "Paralisação / Movimento Grevista",
    statusSugerido: "negociacao",
    observacaoSugerida: "Adesão à paralisação da categoria (sujeito a cronograma de reposição).",
  },
  {
    id: "semana_pedagogica",
    label: "Conselho de Classe / Semana Pedagógica",
    statusSugerido: "presente",
    observacaoSugerida: "Participação integral em Semana Pedagógica / Conselho de Classe.",
  },
  {
    id: "suspensao_expediente",
    label: "Suspensão de Expediente / Força Maior",
    statusSugerido: "abono",
    observacaoSugerida: "Suspensão excepcional de expediente presencial na unidade escolar.",
  },
  {
    id: "presenca_geral",
    label: "Presença Coletiva Normal",
    statusSugerido: "presente",
    observacaoSugerida: "",
  },
  {
    id: "limpar_dia",
    label: "Desmarcar / Limpar Lançamentos do Dia",
    statusSugerido: "limpar",
    observacaoSugerida: "",
  },
];

function getBadgeTurnoStyle(turnoNome = "") {
  const norm = normalizarTurno(turnoNome);
  if (norm === "Matutino") {
    return {
      label: "Matutino",
      bg: "#eff6ff",
      text: "#1d4ed8",
      border: "#bfdbfe",
    };
  }
  if (norm === "Vespertino") {
    return {
      label: "Vespertino",
      bg: "#fffbeb",
      text: "#b45309",
      border: "#fde68a",
    };
  }
  if (norm === "Noturno") {
    return {
      label: "Noturno",
      bg: "#f5f3ff",
      text: "#6d28d9",
      border: "#ddd6fe",
    };
  }
  return {
    label: norm || "Integral",
    bg: "#f1f5f9",
    text: "#334155",
    border: "#cbd5e1",
  };
}

export default function FrequenciaPontoTab({
  servidores = [],
  ocorrencias = [],
  pontoDiario = {},
  biometriaAtiva = false,
  onAlternarBiometria,
  calendarioGovernanca = {},
  onRegistrarPonto,
  onRegistrarPontoColetivo,
  onAbrirModalOcorrencia,
}) {
  const hojeISO = new Date().toISOString().slice(0, 10);
  const [dataSel, setDataSel] = useState(hojeISO);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroTurno, setFiltroTurno] = useState("todos");
  const [filtroSituacaoDia, setFiltroSituacaoDia] = useState("todos");

  // Estado do Modal Premium de Registro Coletivo
  const [modalColetivoAberto, setModalColetivoAberto] = useState(false);
  const [presetColetivo, setPresetColetivo] = useState("ponto_facultativo");
  const [statusColetivo, setStatusColetivo] = useState("abono");
  const [dataIniColetivo, setDataIniColetivo] = useState(hojeISO);
  const [dataFimColetivo, setDataFimColetivo] = useState(hojeISO);
  const [vinculosSel, setVinculosSel] = useState([]); // vazio = todos
  const [categoriasSel, setCategoriasSel] = useState([]); // vazio = todas
  const [turnoColetivo, setTurnoColetivo] = useState("todos");
  const [preservarAtestados, setPreservarAtestados] = useState(true);
  const [obsColetivo, setObsColetivo] = useState(
    PRESETS_COLETIVOS[0].observacaoSugerida
  );

  const servidoresAtivos = useMemo(
    () => servidores.filter((s) => s.ativo),
    [servidores]
  );

  // Verifica na Governança se a data selecionada é Dia Letivo oficial
  const infoDiaLetivo = useMemo(
    () => verificarDiaLetivoGovernanca(dataSel, calendarioGovernanca),
    [dataSel, calendarioGovernanca]
  );

  // Mapa de ocorrências formais vigentes na data selecionada
  const ocorrenciaVigentePorServidor = useMemo(() => {
    const mapa = {};
    ocorrencias.forEach((occ) => {
      if (occ.status === "cancelado") return;
      if (
        occ.data_inicio &&
        occ.data_fim &&
        dataSel >= occ.data_inicio &&
        dataSel <= occ.data_fim
      ) {
        mapa[occ.servidor_id] = occ;
      }
    });
    return mapa;
  }, [ocorrencias, dataSel]);

  const registrosDoDia = pontoDiario[dataSel] || {};

  // Calcula o status e horários efetivos (1º Turno e 2º Turno) de cada servidor na data
  const getRegistroEfetivo = (srv) => {
    const manual = registrosDoDia[srv.id];
    const occAuto = ocorrenciaVigentePorServidor[srv.id];
    const turnosSrv = getTurnosEJornadaServidor(srv);

    const entrada1Padrao = turnosSrv.turno1.entrada;
    const saida1Padrao = turnosSrv.turno1.saida;
    const entrada2Padrao = turnosSrv.turno2 ? turnosSrv.turno2.entrada : "";
    const saida2Padrao = turnosSrv.turno2 ? turnosSrv.turno2.saida : "";

    // 1) Se o usuário clicou novamente na opção ativa para desmarcar explicitamente
    if (manual && manual._desmarcado) {
      return {
        status: null,
        turno1_nome: turnosSrv.turno1.nome,
        entrada: entrada1Padrao,
        saida: saida1Padrao,
        temDoisTurnos: turnosSrv.temDoisTurnos,
        turno2_nome: turnosSrv.turno2?.nome || null,
        entrada_2: entrada2Padrao,
        saida_2: saida2Padrao,
        observacao: manual.observacao || "",
        origem_auto: false,
        origem_fallback_letivo: false,
        ocorrencia_vinculada: null,
      };
    }

    // 2) Se há lançamento manual ou coletivo salvo para o servidor nesta data
    if (manual && manual.status) {
      let ent1 = manual.entrada || entrada1Padrao;
      let sai1 = manual.saida || saida1Padrao;
      let ent2 = manual.entrada_2 !== undefined ? manual.entrada_2 : entrada2Padrao;
      let sai2 = manual.saida_2 !== undefined ? manual.saida_2 : saida2Padrao;

      // Normaliza registros em cache antigos (ex: quando Vespertino estava na 1ª coluna ou Integral em coluna única 07:30 às 17:30)
      if (turnosSrv.temDoisTurnos && turnosSrv.turno1.nome === "Matutino") {
        if (
          (ent1 === "13:00" && sai1 === "18:00") ||
          sai1 === "17:00" ||
          sai1 === "17:30"
        ) {
          ent1 = entrada1Padrao;
          sai1 = saida1Padrao;
        }
        if (
          !ent2 ||
          !sai2 ||
          (ent2 === "07:30" && sai2 === "12:30")
        ) {
          ent2 = entrada2Padrao;
          sai2 = saida2Padrao;
        }
      } else if (!turnosSrv.temDoisTurnos && turnosSrv.turno1.nome === "Vespertino") {
        if (ent1 === "07:30" && sai1 === "12:30") {
          ent1 = "13:00";
          sai1 = "18:00";
        }
      }

      return {
        ...manual,
        turno1_nome: turnosSrv.turno1.nome,
        entrada: ent1,
        saida: sai1,
        temDoisTurnos: turnosSrv.temDoisTurnos,
        turno2_nome: turnosSrv.turno2?.nome || null,
        entrada_2: ent2,
        saida_2: sai2,
        origem_auto: false,
        origem_fallback_letivo: false,
        ocorrencia_vinculada: occAuto || null,
      };
    }

    // 3) Se há ocorrência formal vigente (Atestado, Abono, Negociação, Ausência)
    if (occAuto) {
      const statusMap = {
        abono: "abono",
        atestado: "atestado",
        negociacao: "negociacao",
        ausencia: occAuto.subtipo?.toLowerCase().includes("atraso")
          ? "atraso"
          : "falta",
      };
      return {
        status: statusMap[occAuto.tipo] || "ausencia",
        turno1_nome: turnosSrv.turno1.nome,
        entrada: "—",
        saida: "—",
        temDoisTurnos: turnosSrv.temDoisTurnos,
        turno2_nome: turnosSrv.turno2?.nome || null,
        entrada_2: turnosSrv.temDoisTurnos ? "—" : "",
        saida_2: turnosSrv.temDoisTurnos ? "—" : "",
        observacao: `${occAuto.subtipo}: ${occAuto.motivo}`,
        origem_auto: true,
        origem_fallback_letivo: false,
        ocorrencia_vinculada: occAuto,
      };
    }

    // 4) FALLBACK AUTOMÁTICO (Item 2):
    // Sem biometria ativa, marca PRESENTE automaticamente em todos os Dias Letivos da Governança
    if (!biometriaAtiva && infoDiaLetivo.isLetivo) {
      return {
        status: "presente",
        turno1_nome: turnosSrv.turno1.nome,
        entrada: entrada1Padrao,
        saida: saida1Padrao,
        temDoisTurnos: turnosSrv.temDoisTurnos,
        turno2_nome: turnosSrv.turno2?.nome || null,
        entrada_2: entrada2Padrao,
        saida_2: saida2Padrao,
        observacao: "",
        origem_auto: false,
        origem_fallback_letivo: true,
        ocorrencia_vinculada: null,
      };
    }

    // 5) Biometria Ativa (aguardando leitura biométrica) ou Dia Não Letivo na Governança
    return {
      status: null,
      turno1_nome: turnosSrv.turno1.nome,
      entrada: biometriaAtiva ? "" : entrada1Padrao,
      saida: biometriaAtiva ? "" : saida1Padrao,
      temDoisTurnos: turnosSrv.temDoisTurnos,
      turno2_nome: turnosSrv.turno2?.nome || null,
      entrada_2: biometriaAtiva ? "" : entrada2Padrao,
      saida_2: biometriaAtiva ? "" : saida2Padrao,
      observacao: "",
      origem_auto: false,
      origem_fallback_letivo: false,
      ocorrencia_vinculada: null,
    };
  };

  // Resumo estatístico do dia selecionado
  const resumoDia = useMemo(() => {
    const cont = {
      presente: 0,
      abono: 0,
      atestado: 0,
      atraso: 0,
      negociacao: 0,
      falta: 0,
      pendente: 0,
    };

    servidoresAtivos.forEach((srv) => {
      const reg = getRegistroEfetivo(srv);
      if (!reg.status) cont.pendente += 1;
      else if (cont[reg.status] !== undefined) cont[reg.status] += 1;
    });

    return cont;
  }, [
    servidoresAtivos,
    registrosDoDia,
    ocorrenciaVigentePorServidor,
    biometriaAtiva,
    infoDiaLetivo,
  ]);

  // Lista filtrada para exibição (mantendo ordem alfabética)
  const listaFiltrada = useMemo(() => {
    return servidoresAtivos
      .filter((srv) => {
        if (filtroCategoria !== "todos" && srv.categoria !== filtroCategoria)
          return false;
        if (
          filtroTurno !== "todos" &&
          normalizarTurno(srv.turno) !== normalizarTurno(filtroTurno)
        )
          return false;

        const reg = getRegistroEfetivo(srv);
        if (filtroSituacaoDia !== "todos") {
          if (filtroSituacaoDia === "pendente" && reg.status !== null)
            return false;
          if (
            filtroSituacaoDia !== "pendente" &&
            reg.status !== filtroSituacaoDia
          )
            return false;
        }

        if (!busca.trim()) return true;
        const q = busca.toLowerCase().trim();
        return (
          (srv.nome || "").toLowerCase().includes(q) ||
          (srv.cargo || "").toLowerCase().includes(q) ||
          (srv.cpf || "").includes(q) ||
          (srv.setor || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        String(a.nome || "")
          .trim()
          .localeCompare(String(b.nome || "").trim(), "pt-BR", {
            sensitivity: "base",
          })
      );
  }, [
    servidoresAtivos,
    filtroCategoria,
    filtroTurno,
    filtroSituacaoDia,
    busca,
    registrosDoDia,
    ocorrenciaVigentePorServidor,
    biometriaAtiva,
    infoDiaLetivo,
  ]);

  // Subtítulos dinâmicos das colunas ENTRADA / SAÍDA (sempre na sequência: Matutino -> Vespertino -> Noturno)
  const subtituloColunaTurno1 = useMemo(() => {
    const ordem = ["Matutino", "Vespertino", "Noturno"];
    const turnosPresentes = new Set(
      listaFiltrada
        .map((s) => getTurnosEJornadaServidor(s).turno1.nome)
        .filter(Boolean)
    );
    const ordenados = ordem.filter((t) => turnosPresentes.has(t));
    if (ordenados.length > 0) return ordenados.join(" / ");
    return "Matutino / Vespertino";
  }, [listaFiltrada]);

  const subtituloColunaTurno2 = useMemo(() => {
    const ordem = ["Matutino", "Vespertino", "Noturno"];
    const turnos2Presentes = new Set(
      listaFiltrada
        .map((s) => getTurnosEJornadaServidor(s).turno2?.nome)
        .filter(Boolean)
    );
    const ordenados = ordem.filter((t) => turnos2Presentes.has(t));
    if (ordenados.length === 1) return `${ordenados[0]} (Pós-Almoço)`;
    if (ordenados.length > 1) return ordenados.join(" / ");
    return "Vespertino / Noturno";
  }, [listaFiltrada]);

  // Servidores impactados no Modal de Registro Coletivo
  const servidoresAlvoColetivo = useMemo(() => {
    return servidoresAtivos.filter((srv) => {
      if (
        vinculosSel.length > 0 &&
        !vinculosSel.includes(srv.vinculo || "efetivo")
      ) {
        return false;
      }
      if (
        categoriasSel.length > 0 &&
        !categoriasSel.includes(srv.categoria || "administrativo")
      ) {
        return false;
      }
      if (
        turnoColetivo !== "todos" &&
        normalizarTurno(srv.turno) !== normalizarTurno(turnoColetivo)
      ) {
        return false;
      }
      if (preservarAtestados) {
        const occ = ocorrenciaVigentePorServidor[srv.id];
        if (occ && occ.tipo === "atestado") return false;
      }
      return true;
    });
  }, [
    servidoresAtivos,
    vinculosSel,
    categoriasSel,
    turnoColetivo,
    preservarAtestados,
    ocorrenciaVigentePorServidor,
  ]);

  const navegarDia = (delta) => {
    const dt = new Date(dataSel + "T12:00:00");
    dt.setDate(dt.getDate() + delta);
    setDataSel(dt.toISOString().slice(0, 10));
  };

  const abrirModalRegistroColetivo = () => {
    setDataIniColetivo(dataSel);
    setDataFimColetivo(dataSel);
    setPresetColetivo("ponto_facultativo");
    setStatusColetivo("abono");
    setObsColetivo(PRESETS_COLETIVOS[0].observacaoSugerida);
    setVinculosSel([]);
    setCategoriasSel([]);
    setTurnoColetivo("todos");
    setPreservarAtestados(true);
    setModalColetivoAberto(true);
  };

  const selecionarPresetColetivo = (presetId) => {
    setPresetColetivo(presetId);
    const found = PRESETS_COLETIVOS.find((p) => p.id === presetId);
    if (found) {
      setStatusColetivo(found.statusSugerido);
      setObsColetivo(found.observacaoSugerida);
    }
  };

  const toggleItemArray = (arr, setArr, val) => {
    if (arr.includes(val)) {
      setArr(arr.filter((x) => x !== val));
    } else {
      setArr([...arr, val]);
    }
  };

  const confirmarLancamentoColetivo = () => {
    if (servidoresAlvoColetivo.length === 0) {
      toast.error("Nenhum servidor corresponde aos filtros selecionados.");
      return;
    }
    if (onRegistrarPontoColetivo) {
      onRegistrarPontoColetivo({
        dataInicio: dataIniColetivo,
        dataFim: dataFimColetivo,
        servidoresAlvo: servidoresAlvoColetivo,
        status: statusColetivo,
        observacao: obsColetivo,
      });
    }
    setModalColetivoAberto(false);
    toast.success(
      `Registro coletivo aplicado com sucesso para ${servidoresAlvoColetivo.length} servidor(es)!`
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Barra Superior de Data, Governança de Dias Letivos, Biometria e Registro Coletivo ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Data */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => navegarDia(-1)}
              className="p-2 rounded-lg hover:bg-white text-slate-700 transition"
              title="Dia anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={dataSel}
              onChange={(e) => setDataSel(e.target.value)}
              className="bg-transparent px-3 py-1 text-sm font-extrabold text-slate-800 outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={() => navegarDia(1)}
              className="p-2 rounded-lg hover:bg-white text-slate-700 transition"
              title="Próximo dia"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {dataSel !== hojeISO && (
            <button
              type="button"
              onClick={() => setDataSel(hojeISO)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 hover:bg-blue-100 transition"
            >
              Voltar para Hoje
            </button>
          )}

          {/* Badge de Sincronização com Direção -> Governança -> Ano Letivo */}
          <div
            title={infoDiaLetivo.detalhe}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
              infoDiaLetivo.isLetivo
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                infoDiaLetivo.isLetivo ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{infoDiaLetivo.label}</span>
          </div>

          <div className="text-xs text-slate-500">
            Folha diária unificada de{" "}
            <strong>{servidoresAtivos.length}</strong> profissionais ativos
          </div>
        </div>

        {/* Botões Direitos: BIOMETRIA (Pill Liga/Desliga) + REGISTRO COLETIVO */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 2.1) BIOMETRIA = Botão Badge estilo Liga/Desliga (Pill) */}
          <button
            type="button"
            onClick={() => {
              const novo = !biometriaAtiva;
              if (onAlternarBiometria) onAlternarBiometria(novo);
              toast.success(
                novo
                  ? "Modo Biometria (Ponto Eletrônico) ATIVADO! O sistema aguardará os registros biométricos de entrada e saída."
                  : "Modo Biometria DESATIVADO! Fallback automático ativado: dias letivos da Governança iniciam com PRESENTE."
              );
            }}
            title={
              biometriaAtiva
                ? "Biometria Ativa: servidores aguardam leitura biométrica nos dois turnos. Clique para desativar."
                : "Biometria Desligada (Fallback SEEDF): presença marcada automaticamente nos dias letivos da Governança. Clique para ativar Biometria."
            }
            className={`group relative inline-flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-full border text-xs font-extrabold transition-all select-none ${
              biometriaAtiva
                ? "bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-700 text-white border-emerald-500 shadow-md"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-300"
            }`}
          >
            <FingerPrintIcon
              className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                biometriaAtiva ? "text-emerald-300" : "text-slate-500"
              }`}
            />
            <span className="tracking-wide">BIOMETRIA</span>

            {/* Chave seletora (Switch Pill) interna */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                biometriaAtiva
                  ? "bg-emerald-400 text-slate-950 shadow-sm"
                  : "bg-slate-300 text-slate-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  biometriaAtiva ? "bg-slate-950 animate-pulse" : "bg-slate-500"
                }`}
              />
              {biometriaAtiva ? "ON" : "OFF"}
            </span>
          </button>

          {/* 2.2) REGISTRO COLETIVO = Abre Modal Premium de Lançamento Coletivo */}
          <button
            type="button"
            onClick={abrirModalRegistroColetivo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md hover:opacity-95 hover:-translate-y-0.5 transition-all"
            style={{
              background:
                "linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0284c7 100%)",
            }}
          >
            <UserGroupIcon className="h-4 w-4 stroke-[2.2]" />
            <span>REGISTRO COLETIVO</span>
          </button>
        </div>
      </div>

      {/* ── Cards de Status do Dia (Clicáveis para filtrar) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(
              filtroSituacaoDia === "presente" ? "todos" : "presente"
            )
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "presente"
              ? "ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-emerald-700">
            Presentes
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
            {resumoDia.presente}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(
              filtroSituacaoDia === "abono" ? "todos" : "abono"
            )
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "abono"
              ? "ring-2 ring-teal-500 bg-teal-50 border-teal-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-teal-700">
            Em Abono
          </div>
          <div className="text-2xl font-extrabold text-teal-600 mt-0.5">
            {resumoDia.abono}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(
              filtroSituacaoDia === "atestado" ? "todos" : "atestado"
            )
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "atestado"
              ? "ring-2 ring-blue-500 bg-blue-50 border-blue-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-blue-700">
            Atestados
          </div>
          <div className="text-2xl font-extrabold text-blue-600 mt-0.5">
            {resumoDia.atestado}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(
              filtroSituacaoDia === "negociacao" ? "todos" : "negociacao"
            )
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "negociacao"
              ? "ring-2 ring-purple-500 bg-purple-50 border-purple-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-purple-700">
            Negociações
          </div>
          <div className="text-2xl font-extrabold text-purple-600 mt-0.5">
            {resumoDia.negociacao}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(
              filtroSituacaoDia === "atraso" ? "todos" : "atraso"
            )
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "atraso"
              ? "ring-2 ring-amber-500 bg-amber-50 border-amber-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-amber-700">
            Atraso/Saída
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-0.5">
            {resumoDia.atraso}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(
              filtroSituacaoDia === "falta" ? "todos" : "falta"
            )
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "falta"
              ? "ring-2 ring-red-500 bg-red-50 border-red-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-red-700">
            Faltas
          </div>
          <div className="text-2xl font-extrabold text-red-600 mt-0.5">
            {resumoDia.falta}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(
              filtroSituacaoDia === "pendente" ? "todos" : "pendente"
            )
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "pendente"
              ? "ring-2 ring-slate-500 bg-slate-100 border-slate-400"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-slate-500">
            {biometriaAtiva ? "Aguard. Biometria" : "Não Lançado"}
          </div>
          <div className="text-2xl font-extrabold text-slate-700 mt-0.5">
            {resumoDia.pendente}
          </div>
        </button>
      </div>

      {/* ── Filtros de Busca, Categoria e Turno ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar servidor por nome, cargo ou CPF..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="todos">📂 Todas as Categorias</option>
          {CATEGORIAS_SERVIDOR.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={filtroTurno}
          onChange={(e) => setFiltroTurno(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="todos">🕒 Todos os Turnos</option>
          {TURNOS_TRABALHO.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Tabela de Chamada e Ponto Diário ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50">
                <th className="py-3.5 px-3.5">Servidor / Cargo</th>
                <th className="py-3.5 px-3">Turno & Jornada</th>
                <th className="py-3.5 px-3">
                  <div>Status de Frequência no Dia</div>
                  <div className="text-[10px] font-semibold normal-case text-slate-400 mt-0.5">
                    Clique seleciona • 2º clique desmarca
                  </div>
                </th>

                {/* 5) 1ª Coluna ENTRADA / SAÍDA com identificação do Turno logo abaixo do título */}
                <th className="py-3.5 px-3 text-center">
                  <div className="text-slate-700">ENTRADA / SAÍDA</div>
                  <div className="text-[10px] font-bold normal-case text-blue-600 mt-0.5">
                    1º Turno • {subtituloColunaTurno1}
                  </div>
                </th>

                {/* 6) 2ª Coluna ENTRADA / SAÍDA (Pós-Almoço / 2º Turno para jornadas > 20h) */}
                <th className="py-3.5 px-3 text-center">
                  <div className="text-slate-700">ENTRADA / SAÍDA</div>
                  <div className="text-[10px] font-bold normal-case text-amber-700 mt-0.5">
                    2º Turno • {subtituloColunaTurno2}
                  </div>
                </th>

                <th className="py-3.5 px-3">Observação / Ocorrência Vinculada</th>
                <th className="py-3.5 px-3.5 text-right">Formalizar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {listaFiltrada.map((srv) => {
                const reg = getRegistroEfetivo(srv);
                const badgeT1 = getBadgeTurnoStyle(reg.turno1_nome);
                const badgeT2 = reg.temDoisTurnos
                  ? getBadgeTurnoStyle(reg.turno2_nome)
                  : null;

                return (
                  <tr key={srv.id} className="hover:bg-slate-50/80 transition">
                    {/* Servidor / Cargo */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-800 text-xs">
                        {srv.nome}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {srv.cargo} • {srv.acesso_sistema ? "Sistema" : "Interno"}
                      </div>
                    </td>

                    {/* Turno & Jornada */}
                    <td className="py-3 px-3">
                      <div className="text-xs font-semibold text-slate-700">
                        {normalizarTurno(srv.turno) || srv.turno} ({srv.carga_horaria})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {reg.temDoisTurnos
                          ? `${reg.turno1_nome} + ${reg.turno2_nome} (c/ Almoço)`
                          : `${reg.entrada} às ${reg.saida}`}
                      </div>
                    </td>

                    {/* 4) Coluna STATUS DE FREQUÊNCIA NO DIA organizada em grade 3 colunas (economiza espaço lateral) */}
                    <td className="py-3 px-3">
                      <div className="grid grid-cols-3 gap-1 w-[222px]">
                        {STATUS_PONTO_OPCOES.map((op) => {
                          const isAtivo = reg.status === op.value;
                          return (
                            <button
                              key={op.value}
                              type="button"
                              title={
                                isAtivo
                                  ? `Clique novamente para desmarcar "${op.label}"`
                                  : `Marcar como "${op.label}"`
                              }
                              onClick={() => {
                                if (isAtivo) {
                                  onRegistrarPonto(dataSel, srv.id, {
                                    ...reg,
                                    status: null,
                                    _desmarcado: true,
                                  });
                                } else {
                                  onRegistrarPonto(dataSel, srv.id, {
                                    ...reg,
                                    status: op.value,
                                    _desmarcado: false,
                                  });
                                }
                              }}
                              className={`px-1.5 py-1 rounded-lg text-[10px] font-extrabold border text-center truncate transition ${
                                isAtivo
                                  ? "shadow-sm scale-[1.02]"
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                              style={
                                isAtivo
                                  ? {
                                      backgroundColor: op.bg,
                                      color: op.cor,
                                      borderColor: op.border,
                                    }
                                  : undefined
                              }
                            >
                              {op.short}
                            </button>
                          );
                        })}
                      </div>
                      {reg.origem_auto && (
                        <div className="mt-1 text-[10px] font-bold text-blue-600">
                          ⚡ Auto ({reg.status} vigente)
                        </div>
                      )}
                    </td>

                    {/* 5) 1ª Coluna ENTRADA / SAÍDA (1º Turno do servidor) */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide border flex items-center gap-1"
                          style={{
                            backgroundColor: badgeT1.bg,
                            color: badgeT1.text,
                            borderColor: badgeT1.border,
                          }}
                        >
                          {biometriaAtiva && (
                            <FingerPrintIcon className="h-3 w-3 opacity-80" />
                          )}
                          {badgeT1.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={reg.entrada || ""}
                            onChange={(e) =>
                              onRegistrarPonto(dataSel, srv.id, {
                                ...reg,
                                status: reg.status || "presente",
                                _desmarcado: false,
                                entrada: e.target.value,
                              })
                            }
                            placeholder={biometriaAtiva ? "Bio E1" : "07:30"}
                            className="w-14 rounded-lg border border-slate-200 px-1.5 py-1 text-[11px] text-center font-mono text-slate-700 focus:border-blue-500 outline-none"
                          />
                          <span className="text-slate-400 text-[10px]">às</span>
                          <input
                            type="text"
                            value={reg.saida || ""}
                            onChange={(e) =>
                              onRegistrarPonto(dataSel, srv.id, {
                                ...reg,
                                status: reg.status || "presente",
                                _desmarcado: false,
                                saida: e.target.value,
                              })
                            }
                            placeholder={biometriaAtiva ? "Bio S1" : "12:30"}
                            className="w-14 rounded-lg border border-slate-200 px-1.5 py-1 text-[11px] text-center font-mono text-slate-700 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </td>

                    {/* 6 e 7) 2ª Coluna ENTRADA / SAÍDA (2º Turno / Pós-Almoço para > 20h) */}
                    <td className="py-2.5 px-3 text-center">
                      {reg.temDoisTurnos && badgeT2 ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide border flex items-center gap-1"
                            style={{
                              backgroundColor: badgeT2.bg,
                              color: badgeT2.text,
                              borderColor: badgeT2.border,
                            }}
                          >
                            {biometriaAtiva && (
                              <FingerPrintIcon className="h-3 w-3 opacity-80" />
                            )}
                            {badgeT2.label}
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={reg.entrada_2 || ""}
                              onChange={(e) =>
                                onRegistrarPonto(dataSel, srv.id, {
                                  ...reg,
                                  status: reg.status || "presente",
                                  _desmarcado: false,
                                  entrada_2: e.target.value,
                                })
                              }
                              placeholder={biometriaAtiva ? "Bio E2" : "13:00"}
                              className="w-14 rounded-lg border border-slate-200 px-1.5 py-1 text-[11px] text-center font-mono text-slate-700 focus:border-blue-500 outline-none"
                            />
                            <span className="text-slate-400 text-[10px]">às</span>
                            <input
                              type="text"
                              value={reg.saida_2 || ""}
                              onChange={(e) =>
                                onRegistrarPonto(dataSel, srv.id, {
                                  ...reg,
                                  status: reg.status || "presente",
                                  _desmarcado: false,
                                  saida_2: e.target.value,
                                })
                              }
                              placeholder={biometriaAtiva ? "Bio S2" : "18:00"}
                              className="w-14 rounded-lg border border-slate-200 px-1.5 py-1 text-[11px] text-center font-mono text-slate-700 focus:border-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-center gap-1 opacity-60">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Turno Único (20h)
                          </span>
                          <div className="text-[11px] font-mono text-slate-400 py-1">
                            — sem 2º turno —
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Observação do dia */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={reg.observacao || ""}
                        onChange={(e) =>
                          onRegistrarPonto(dataSel, srv.id, {
                            ...reg,
                            status: reg.status || "presente",
                            _desmarcado: false,
                            observacao: e.target.value,
                          })
                        }
                        placeholder="Anotação, ponto facultativo, atraso..."
                        className="w-full min-w-[175px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 outline-none"
                      />
                    </td>

                    {/* Atalho para abrir Modal de Ocorrência Formal */}
                    <td className="py-3 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          onAbrirModalOcorrencia(
                            srv,
                            reg.status === "atestado"
                              ? "atestado"
                              : reg.status === "negociacao"
                              ? "negociacao"
                              : reg.status === "falta" || reg.status === "atraso"
                              ? "ausencia"
                              : "abono",
                            dataSel
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition"
                        title="Formalizar Atestado, Abono ou Negociação Interna"
                      >
                        <PlusCircleIcon className="h-4 w-4" />
                        <span>Detalhar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL PREMIUM DE REGISTRO COLETIVO DE FREQUÊNCIA (Item 2.2) ── */}
      {modalColetivoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho */}
            <div
              className="px-6 py-5 text-white flex items-start justify-between gap-4"
              style={{
                background:
                  "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0284c7 100%)",
              }}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <UserGroupIcon className="h-6 w-6 text-cyan-200" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">
                    Automação de Folha & Eventos Institucionais
                  </span>
                  <h3 className="text-lg font-extrabold tracking-tight mt-1">
                    Registro Coletivo de Frequência & Ponto
                  </h3>
                  <p className="text-xs text-blue-100/90 mt-0.5">
                    Aplique Ponto Facultativo, Dia Letivo Móvel, Decreto, Paralisação ou Presença para todos os servidores ou categorias específicas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalColetivoAberto(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              {/* 1. Motivo / Evento Institucional */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                  1. Natureza do Evento Coletivo (Modelos Rápidos)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESETS_COLETIVOS.map((p) => {
                    const ativo = presetColetivo === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selecionarPresetColetivo(p.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between gap-2 ${
                          ativo
                            ? "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                            : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate">{p.label}</span>
                        {ativo && (
                          <CheckCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Período e Status a Aplicar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={dataIniColetivo}
                    onChange={(e) => {
                      setDataIniColetivo(e.target.value);
                      if (e.target.value > dataFimColetivo) {
                        setDataFimColetivo(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={dataFimColetivo}
                    min={dataIniColetivo}
                    onChange={(e) => setDataFimColetivo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                    Status na Folha
                  </label>
                  <select
                    value={statusColetivo}
                    onChange={(e) => setStatusColetivo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="abono">Abono / Dispensa Oficial</option>
                    <option value="presente">Presente (Expediente / Evento)</option>
                    <option value="negociacao">Negociação / Reposição Futura</option>
                    <option value="atraso">Horário Especial / Parcial</option>
                    <option value="falta">Falta / Paralisação s/ Acordo</option>
                    <option value="limpar">Desmarcar / Limpar Registros</option>
                  </select>
                </div>
              </div>

              {/* 3. Seleção de Vínculos (Efetivo, Contrato Temporário, Terceirizados, etc.) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    2. Filtrar por Vínculo Funcional
                  </label>
                  <button
                    type="button"
                    onClick={() => setVinculosSel([])}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {vinculosSel.length === 0
                      ? "✓ Todos os vínculos selecionados"
                      : "Marcar Todos os Vínculos"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VINCULOS_SERVIDOR.map((v) => {
                    const sel =
                      vinculosSel.length === 0 || vinculosSel.includes(v.value);
                    return (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() =>
                          toggleItemArray(vinculosSel, setVinculosSel, v.value)
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          vinculosSel.includes(v.value)
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : sel
                            ? "bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Seleção de Categorias e Turno */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      3. Categorias Abrangidas
                    </label>
                    {categoriasSel.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCategoriasSel([])}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Todas
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIAS_SERVIDOR.map((c) => {
                      const ativo =
                        categoriasSel.length === 0 ||
                        categoriasSel.includes(c.value);
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() =>
                            toggleItemArray(
                              categoriasSel,
                              setCategoriasSel,
                              c.value
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            categoriasSel.includes(c.value)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : ativo
                              ? "bg-slate-100 text-slate-700 border-slate-300"
                              : "bg-white text-slate-400 border-slate-200"
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                      4. Turno Abrangido
                    </label>
                    <select
                      value={turnoColetivo}
                      onChange={(e) => setTurnoColetivo(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="todos">🕒 Todos os Turnos</option>
                      {TURNOS_TRABALHO.map((t) => (
                        <option key={t.value} value={t.value}>
                          Apenas {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preservarAtestados}
                      onChange={(e) => setPreservarAtestados(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600"
                    />
                    <span className="text-[11px] text-emerald-900 font-semibold leading-snug">
                      Preservar intactos os servidores que já estão em{" "}
                      <strong>Atestado Médico</strong> vigente na data
                    </span>
                  </label>
                </div>
              </div>

              {/* 5. Observação / Fundamentação */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  5. Observação / Fundamentação Legal na Folha de Ponto
                </label>
                <input
                  type="text"
                  value={obsColetivo}
                  onChange={(e) => setObsColetivo(e.target.value)}
                  placeholder="Ex: Ponto Facultativo conforme Decreto GDF nº 45.123 / Dia Letivo Móvel..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Resumo de Impacto e Confirmação */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheckIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <div className="text-xs text-blue-950">
                    Este lançamento coletivo abrangerá{" "}
                    <strong className="text-blue-700 text-sm">
                      {servidoresAlvoColetivo.length}
                    </strong>{" "}
                    de {servidoresAtivos.length} servidores ativos.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalColetivoAberto(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarLancamentoColetivo}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition flex items-center gap-1.5"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Aplicar Registro Coletivo ({servidoresAlvoColetivo.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
