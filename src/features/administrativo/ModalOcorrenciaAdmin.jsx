// src/features/administrativo/ModalOcorrenciaAdmin.jsx
// ============================================================================
// Modal Dinâmico para Lançamento e Edição de Registros Administrativos:
// - Abono de Ponto (com cálculo ao vivo do saldo anual de 5 abonos)
// - Atestado Médico / Licença (com cálculo automático de dias, CID, CRM)
// - Ausência / Falta / Atraso
// - Negociação Interna / Acordo com Direção (com controle de reposição)
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
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  TIPOS_OCORRENCIA_ADMIN,
  LIMITE_ABONOS_ANUAL,
  formatarCPF,
} from "./useAdministrativoData";

const SUBTIPOS_POR_TIPO = {
  abono: [
    "Abono de Ponto Anual (Regulamentar SEEDF)",
    "Abono por Doação de Sangue",
    "Abono Eleitoral (TRE)",
    "Abono Aniversário / Concessão Especial",
  ],
  atestado: [
    "Atestado Médico Próprio (Comparecimento / Repouso)",
    "Atestado de Acompanhamento Familiar",
    "Licença para Tratamento de Saúde (Perícia)",
    "Licença Maternidade / Paternidade",
    "Licença Nojo / Gala",
  ],
  ausencia: [
    "Falta Injustificada (Dia Inteiro)",
    "Falta Justificada",
    "Atraso na Entrada",
    "Saída Antecipada",
    "Ausência em Coordenação Pedagógica",
  ],
  negociacao: [
    "Liberação com Reposição de Carga Horária",
    "Troca de Turno / Dia entre Pares",
    "Compensação de Banco de Horas (Crédito Trabalhado)",
    "Acordo Interno de Horário Especial",
  ],
};

function calcularDiasEntre(inicio, fim) {
  if (!inicio || !fim) return 1;
  const d1 = new Date(inicio + "T00:00:00");
  const d2 = new Date(fim + "T00:00:00");
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
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
  const [dataInicio, setDataInicio] = useState(hojeISO);
  const [dataFim, setDataFim] = useState(hojeISO);
  const [dias, setDias] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("Direção / Supervisão Administrativa");
  const [status, setStatus] = useState("aprovado");

  // Campos específicos Atestado
  const [cid, setCid] = useState("");
  const [medico, setMedico] = useState("");
  const [documentoRef, setDocumentoRef] = useState("");

  // Campos específicos Ausência/Atraso
  const [horasAusencia, setHorasAusencia] = useState("");

  // Campos específicos Negociação Interna
  const [dataCompensacao, setDataCompensacao] = useState("");
  const [formaCompensacao, setFormaCompensacao] = useState("");

  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setErro("");

    if (registroEdicao) {
      setServidorId(registroEdicao.servidor_id || "");
      setTipo(registroEdicao.tipo || "abono");
      setSubtipo(registroEdicao.subtipo || SUBTIPOS_POR_TIPO[registroEdicao.tipo || "abono"]?.[0] || "");
      setDataInicio(registroEdicao.data_inicio || hojeISO);
      setDataFim(registroEdicao.data_fim || registroEdicao.data_inicio || hojeISO);
      setDias(registroEdicao.dias || 1);
      setMotivo(registroEdicao.motivo || "");
      setAutorizadoPor(registroEdicao.autorizado_por || "Direção Escolar");
      setStatus(registroEdicao.status || "aprovado");
      setCid(registroEdicao.cid || "");
      setMedico(registroEdicao.medico || "");
      setDocumentoRef(registroEdicao.documento_ref || "");
      setHorasAusencia(registroEdicao.horas_ausencia || "");
      setDataCompensacao(registroEdicao.data_compensacao || "");
      setFormaCompensacao(registroEdicao.forma_compensacao || "");
    } else {
      const t = tipoInicial || "abono";
      setServidorId(servidorPreSelecionado?.id || servidores[0]?.id || "");
      setTipo(t);
      setSubtipo(SUBTIPOS_POR_TIPO[t]?.[0] || "");
      const dt = dataInicial || hojeISO;
      setDataInicio(dt);
      setDataFim(dt);
      setDias(1);
      setMotivo("");
      setAutorizadoPor("Direção Escolar");
      setStatus(
        t === "negociacao"
          ? "pendente_reposicao"
          : t === "atestado"
          ? "homologado"
          : t === "ausencia"
          ? "registrado"
          : "aprovado"
      );
      setCid("");
      setMedico("");
      setDocumentoRef("");
      setHorasAusencia("");
      setDataCompensacao("");
      setFormaCompensacao("");
    }
  }, [aberto, registroEdicao, servidorPreSelecionado, tipoInicial, dataInicial, servidores, hojeISO]);

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

  const handleTrocarTipo = (novoTipo) => {
    setTipo(novoTipo);
    setSubtipo(SUBTIPOS_POR_TIPO[novoTipo]?.[0] || "");
    if (!registroEdicao) {
      setStatus(
        novoTipo === "negociacao"
          ? "pendente_reposicao"
          : novoTipo === "atestado"
          ? "homologado"
          : novoTipo === "ausencia"
          ? "registrado"
          : "aprovado"
      );
    }
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!servidorId) {
      setErro("Selecione o servidor ou colaborador.");
      return;
    }
    if (!dataInicio) {
      setErro("Informe a data do registro.");
      return;
    }
    if (!motivo.trim()) {
      setErro("Descreva a justificativa, motivo ou detalhes do registro.");
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
      cid: tipo === "atestado" ? cid.trim() : "",
      medico: tipo === "atestado" ? medico.trim() : "",
      documento_ref: tipo === "atestado" ? documentoRef.trim() : "",
      horas_ausencia: tipo === "ausencia" ? horasAusencia.trim() : "",
      data_compensacao: tipo === "negociacao" ? dataCompensacao : "",
      forma_compensacao: tipo === "negociacao" ? formaCompensacao.trim() : "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-fadeIn">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between text-white"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
              <CalendarDaysIcon className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                {registroEdicao ? "Editar Registro Administrativo" : "Novo Registro / Ocorrência de Servidor"}
              </h3>
              <p className="text-xs text-blue-200">
                Controle oficial de abonos, atestados, ausências e negociações internas
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
              <span>{erro}</span>
            </div>
          )}

          {/* Seletor de Tipo (Cards Interativos) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Natureza do Registro Administrativo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TIPOS_OCORRENCIA_ADMIN.map((t) => {
                const ativo = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTrocarTipo(t.value)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      ativo
                        ? "ring-2 ring-offset-1 shadow-sm"
                        : "hover:bg-slate-50 border-slate-200 opacity-80"
                    }`}
                    style={{
                      backgroundColor: ativo ? t.bg : "#ffffff",
                      borderColor: ativo ? t.cor : undefined,
                      ringColor: t.cor,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-extrabold uppercase tracking-wider"
                        style={{ color: ativo ? t.cor : "#475569" }}
                      >
                        {t.shortLabel}
                      </span>
                      {ativo && (
                        <CheckCircleIcon className="h-4 w-4" style={{ color: t.cor }} />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-600 leading-tight line-clamp-2">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Servidor */}
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
                    {s.nome} • {s.cargo} ({s.acesso_sistema ? "Com Acesso" : "Sem Acesso / Interno"})
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
                      {servidorAtual.cargo} • CPF: {formatarCPF(servidorAtual.cpf)} • Turno: {servidorAtual.turno}
                    </div>
                  </div>
                </div>

                {/* Indicador de Saldo de Abonos se for Abono */}
                <div className="flex items-center gap-2">
                  <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      statsServidor.abonosUsados >= LIMITE_ABONOS_ANUAL
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    Abonos no Ano: {statsServidor.abonosUsados}/{LIMITE_ABONOS_ANUAL}
                  </div>
                  {statsServidor.negociacoesPendentes > 0 && (
                    <div className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {statsServidor.negociacoesPendentes} Reposição Pendente
                    </div>
                  )}
                </div>
              </div>
            )}

            {tipo === "abono" && statsServidor.abonosUsados >= LIMITE_ABONOS_ANUAL && !registroEdicao && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Atenção:</strong> Este servidor já atingiu a cota padrão de{" "}
                  <strong>{LIMITE_ABONOS_ANUAL} abonos anuais</strong>. Verifique se trata-se de concessão especial (ex: TRE / Doação de Sangue).
                </span>
              </div>
            )}
          </div>

          {/* Subtipo e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Classificação / Subtipo
              </label>
              <select
                value={subtipo}
                onChange={(e) => setSubtipo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {(SUBTIPOS_POR_TIPO[tipo] || []).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Situação do Registro
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {tipo === "negociacao" ? (
                  <>
                    <option value="pendente_reposicao">⏳ Pendente de Reposição / Cumprimento</option>
                    <option value="compensado">✅ Compensado / Acordo Quitado</option>
                    <option value="cancelado">🚫 Cancelado</option>
                  </>
                ) : (
                  <>
                    <option value="aprovado">✅ Deferido / Aprovado</option>
                    <option value="homologado">📋 Homologado / Arquivado</option>
                    <option value="registrado">📌 Registrado em Folha</option>
                    <option value="pendente_documento">⚠️ Aguardando Comprovante</option>
                    <option value="cancelado">🚫 Cancelado / Indeferido</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Período (Data Início, Data Fim, Total de Dias) */}
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

          {/* Campos Específicos: ATESTADO MÉDICO */}
          {tipo === "atestado" && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <DocumentTextIcon className="h-4 w-4" />
                Dados do Atestado Médico / Licença
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
                    Médico(a) / CRM
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dr. Silva - CRM 12345"
                    value={medico}
                    onChange={(e) => setMedico(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nº Protocolo / SEI / Anexo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SEI-00080-2026"
                    value={documentoRef}
                    onChange={(e) => setDocumentoRef(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos Específicos: AUSÊNCIA / ATRASO */}
          {tipo === "ausencia" && (
            <div className="p-4 rounded-xl bg-red-50/60 border border-red-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Carga Horária / Tempo de Ausência (se parcial)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dia inteiro (8h) ou 01h45min de atraso"
                    value={horasAusencia}
                    onChange={(e) => setHorasAusencia(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-red-700 leading-relaxed">
                    Registre se houve comunicação prévia à chefia imediata ou se a ausência impacta o fechamento da folha mensal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Campos Específicos: NEGOCIAÇÃO INTERNA / BANCO DE HORAS */}
          {tipo === "negociacao" && (
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                <ArrowsRightLeftIcon className="h-4 w-4" />
                Plano de Compensação / Acordo Interno
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Prevista p/ Reposição
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
                    Como será compensado / reposto?
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Reposição no contra-turno dia 14/11 ou substituição pelo Prof. Carlos"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Autorizado / Registrado por
              </label>
              <input
                type="text"
                value={autorizadoPor}
                onChange={(e) => setAutorizadoPor(e.target.value)}
                placeholder="Ex: Diretor Pedagógico / Supervisor Administrativo"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
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
