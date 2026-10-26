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

import React, { useState, useEffect, useMemo } from "react";
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
} from "@heroicons/react/24/outline";
import {
  TIPOS_OCORRENCIA_ADMIN,
  LIMITE_ABONOS_ANUAL,
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
    "ADICIONAL NOTURNO",
    "DIA LETIVO MÓVEL",
    "PONTO FACULTATIVO",
    "RECESSO",
    "FERIADO",
    "SABADO LETIVO",
    "SUSP. DAS AULAS Dec. nº 40.583/2020",
    "SUSP. DAS AULAS Dec. nº 40.817/2020",
    "SUSP. DAS AULAS Dec. nº 41.849/2021",
    "SUSP. DAS AULAS Dec. nº 41.913/2021",
  ],
};

// Lista unificada de todos os 39 eventos oficiais SIGEP/SEEDF para busca rápida transversal
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

  useEffect(() => {
    if (!aberto) return;
    setErro("");
    setBuscaRapidaEvento("");
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
    if (!servidorId) {
      setErro("Selecione o servidor ou colaborador.");
      return;
    }
    if (!dataInicio) {
      setErro("Informe a data inicial do registro.");
      return;
    }
    if (!motivo.trim()) {
      setErro("Descreva a justificativa, observação ou fundamentação do registro.");
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-fadeIn">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between text-white"
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
          className="p-6 space-y-5 max-h-[82vh] overflow-y-auto"
        >
          {erro && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
              <span>{erro}</span>
            </div>
          )}

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
          </div>

          {/* 2. Seletor de Servidor */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              2. Servidor / Professor / Colaborador
            </label>
            <div className="relative">
              <select
                value={servidorId}
                onChange={(e) => setServidorId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50/60"
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
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
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
          </div>

          {/* 3. Classificação / Subtipo (Com Busca Rápida Transversal no Catálogo SIGEP) e Situação */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
            {/* Barra de Localização Rápida de Evento SIGEP */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaRapidaEvento}
                onChange={(e) => setBuscaRapidaEvento(e.target.value)}
                placeholder="Pesquisa rápida em todos os 39 eventos SIGEP/SEEDF (ex: Art 151, Sangue, Subsaúde, TRE, Casamento, Paralisação)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:border-blue-500 outline-none"
              />
              {resultadosBuscaEvento.length > 0 && (
                <div className="mt-1.5 p-2 rounded-xl bg-white border border-blue-200 shadow-lg space-y-1 max-h-48 overflow-y-auto">
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
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 flex items-center justify-between gap-2 text-xs transition"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  3. Evento / Classificação Oficial (SIGEP / SEEDF)
                </label>
                <select
                  value={subtipo}
                  onChange={(e) => handleTrocarSubtipo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {(SUBTIPOS_POR_TIPO[tipo] || []).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Situação do Registro
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dataFim}
                min={dataInicio}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Qtd. de Dias
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-blue-700 bg-white"
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
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nº Processo SEI / Subsaúde / Anexo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SEI-00080-001234/2026"
                    value={documentoRef}
                    onChange={(e) => setDocumentoRef(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº Processo SEI / Certidão / Declaração Oficial
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Certidão de Casamento / Declaração Hemocentro / TRE / SEI"
                    value={documentoRef}
                    onChange={(e) => setDocumentoRef(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Justificativa / Detalhamento / Observações Administrativas
              </label>
              <textarea
                rows={3}
                placeholder="Descreva os detalhes do registro para constar no prontuário e espelho de ponto do servidor..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
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

          {/* Botões */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-95 transition"
              style={{
                background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
              }}
            >
              {registroEdicao ? "Salvar Alterações" : "Confirmar Registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
