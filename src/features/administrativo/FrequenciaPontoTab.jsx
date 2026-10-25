// src/features/administrativo/FrequenciaPontoTab.jsx
// ============================================================================
// Aba 2: CONTROLE DIÁRIO DE FREQUÊNCIA & PONTO DOS SERVIDORES
// - Chamada e controle de ponto diário de Professores, Direção, Secretaria,
//   Apoio e Terceirizados (com ou sem acesso ao sistema).
// - Detecta automaticamente Atestados, Abonos e Negociações vigentes na data.
// - Permite lançamento rápido em 1 clique, edição de entrada/saída e observação.
// ============================================================================

import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import {
  CATEGORIAS_SERVIDOR,
  TURNOS_TRABALHO,
  formatarCPF,
} from "./useAdministrativoData";

const STATUS_PONTO_OPCOES = [
  { value: "presente", label: "Presente", short: "P", cor: "#059669", bg: "#d1fae5", border: "#6ee7b7" },
  { value: "abono", label: "Abono", short: "AB", cor: "#0d9488", bg: "#ccfbf1", border: "#5eead4" },
  { value: "atestado", label: "Atestado", short: "AT", cor: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
  { value: "atraso", label: "Atraso / Parcial", short: "AP", cor: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  { value: "negociacao", label: "Negociação", short: "NG", cor: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
  { value: "falta", label: "Falta", short: "F", cor: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
];

export default function FrequenciaPontoTab({
  servidores = [],
  ocorrencias = [],
  pontoDiario = {},
  onRegistrarPonto,
  onMarcarTodosPresentes,
  onAbrirModalOcorrencia,
}) {
  const hojeISO = new Date().toISOString().slice(0, 10);
  const [dataSel, setDataSel] = useState(hojeISO);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroTurno, setFiltroTurno] = useState("todos");
  const [filtroSituacaoDia, setFiltroSituacaoDia] = useState("todos");

  const servidoresAtivos = useMemo(
    () => servidores.filter((s) => s.ativo),
    [servidores]
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

  // Calcula o status efetivo de cada servidor na data
  const getRegistroEfetivo = (srv) => {
    const manual = registrosDoDia[srv.id];
    const occAuto = ocorrenciaVigentePorServidor[srv.id];

    if (manual && manual.status) {
      return {
        ...manual,
        origem_auto: false,
        ocorrencia_vinculada: occAuto || null,
      };
    }

    if (occAuto) {
      const statusMap = {
        abono: "abono",
        atestado: "atestado",
        negociacao: "negociacao",
        ausencia: occAuto.subtipo?.toLowerCase().includes("atraso") ? "atraso" : "falta",
      };
      return {
        status: statusMap[occAuto.tipo] || "ausencia",
        entrada: "—",
        saida: "—",
        observacao: `${occAuto.subtipo}: ${occAuto.motivo}`,
        origem_auto: true,
        ocorrencia_vinculada: occAuto,
      };
    }

    const horarioPadrao = (srv.horario_trabalho || "07:30 às 17:30").split(" às ");
    return {
      status: null, // pendente de chamada
      entrada: horarioPadrao[0] || "07:30",
      saida: horarioPadrao[1] || "17:30",
      observacao: "",
      origem_auto: false,
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
  }, [servidoresAtivos, registrosDoDia, ocorrenciaVigentePorServidor]);

  // Lista filtrada para exibição
  const listaFiltrada = useMemo(() => {
    return servidoresAtivos.filter((srv) => {
      if (filtroCategoria !== "todos" && srv.categoria !== filtroCategoria) return false;
      if (filtroTurno !== "todos" && srv.turno !== filtroTurno) return false;

      const reg = getRegistroEfetivo(srv);
      if (filtroSituacaoDia !== "todos") {
        if (filtroSituacaoDia === "pendente" && reg.status !== null) return false;
        if (filtroSituacaoDia !== "pendente" && reg.status !== filtroSituacaoDia) return false;
      }

      if (!busca.trim()) return true;
      const q = busca.toLowerCase().trim();
      return (
        (srv.nome || "").toLowerCase().includes(q) ||
        (srv.cargo || "").toLowerCase().includes(q) ||
        (srv.cpf || "").includes(q) ||
        (srv.setor || "").toLowerCase().includes(q)
      );
    });
  }, [
    servidoresAtivos,
    filtroCategoria,
    filtroTurno,
    filtroSituacaoDia,
    busca,
    registrosDoDia,
    ocorrenciaVigentePorServidor,
  ]);

  const navegarDia = (delta) => {
    const dt = new Date(dataSel + "T12:00:00");
    dt.setDate(dt.getDate() + delta);
    setDataSel(dt.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      {/* ── Barra Superior de Data e Resumo Rápido ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="text-xs text-slate-500">
            Folha diária unificada de <strong>{servidoresAtivos.length}</strong> profissionais ativos
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onMarcarTodosPresentes(dataSel, listaFiltrada);
              toast.success("Todos os servidores pendentes na listagem foram marcados como Presentes!");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
          >
            <CheckBadgeIcon className="h-4 w-4" />
            Marcar Pendentes como Presentes ({resumoDia.pendente})
          </button>
        </div>
      </div>

      {/* ── Cards de Status do Dia (Clicáveis para filtrar) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(filtroSituacaoDia === "presente" ? "todos" : "presente")
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "presente"
              ? "ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-emerald-700">Presentes</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
            {resumoDia.presente}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(filtroSituacaoDia === "abono" ? "todos" : "abono")
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "abono"
              ? "ring-2 ring-teal-500 bg-teal-50 border-teal-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-teal-700">Em Abono</div>
          <div className="text-2xl font-extrabold text-teal-600 mt-0.5">
            {resumoDia.abono}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(filtroSituacaoDia === "atestado" ? "todos" : "atestado")
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "atestado"
              ? "ring-2 ring-blue-500 bg-blue-50 border-blue-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-blue-700">Atestados</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-0.5">
            {resumoDia.atestado}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(filtroSituacaoDia === "negociacao" ? "todos" : "negociacao")
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "negociacao"
              ? "ring-2 ring-purple-500 bg-purple-50 border-purple-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-purple-700">Negociações</div>
          <div className="text-2xl font-extrabold text-purple-600 mt-0.5">
            {resumoDia.negociacao}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(filtroSituacaoDia === "atraso" ? "todos" : "atraso")
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "atraso"
              ? "ring-2 ring-amber-500 bg-amber-50 border-amber-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-amber-700">Atraso/Saída</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-0.5">
            {resumoDia.atraso}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(filtroSituacaoDia === "falta" ? "todos" : "falta")
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "falta"
              ? "ring-2 ring-red-500 bg-red-50 border-red-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-red-700">Faltas</div>
          <div className="text-2xl font-extrabold text-red-600 mt-0.5">
            {resumoDia.falta}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroSituacaoDia(filtroSituacaoDia === "pendente" ? "todos" : "pendente")
          }
          className={`p-3 rounded-xl border text-left transition ${
            filtroSituacaoDia === "pendente"
              ? "ring-2 ring-slate-500 bg-slate-100 border-slate-400"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-slate-500">Não Lançado</div>
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
                <th className="py-3.5 px-4">Servidor / Cargo</th>
                <th className="py-3.5 px-4">Turno & Jornada</th>
                <th className="py-3.5 px-4">Status de Frequência no Dia</th>
                <th className="py-3.5 px-4">Entrada / Saída</th>
                <th className="py-3.5 px-4">Observação / Ocorrência Vinculada</th>
                <th className="py-3.5 px-4 text-right">Formalizar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {listaFiltrada.map((srv) => {
                const reg = getRegistroEfetivo(srv);
                return (
                  <tr key={srv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-xs">{srv.nome}</div>
                      <div className="text-[11px] text-slate-500">
                        {srv.cargo} • {srv.acesso_sistema ? "Sistema" : "Interno"}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-slate-700">
                        {srv.turno} ({srv.carga_horaria})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {srv.horario_trabalho || "07:30 às 17:30"}
                      </div>
                    </td>

                    {/* Botões rápidos de Status */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1">
                        {STATUS_PONTO_OPCOES.map((op) => {
                          const isAtivo = reg.status === op.value;
                          return (
                            <button
                              key={op.value}
                              type="button"
                              onClick={() =>
                                onRegistrarPonto(dataSel, srv.id, {
                                  ...reg,
                                  status: op.value,
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                                isAtivo
                                  ? "shadow-sm scale-[1.03]"
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
                              {op.label}
                            </button>
                          );
                        })}
                      </div>
                      {reg.origem_auto && (
                        <div className="mt-1 text-[10px] font-bold text-blue-600">
                          ⚡ Preenchido automaticamente pelo registro de {reg.status} vigente
                        </div>
                      )}
                    </td>

                    {/* Horário de Entrada e Saída */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={reg.entrada || ""}
                          onChange={(e) =>
                            onRegistrarPonto(dataSel, srv.id, {
                              ...reg,
                              status: reg.status || "presente",
                              entrada: e.target.value,
                            })
                          }
                          placeholder="07:30"
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center font-mono text-slate-700 focus:border-blue-500 outline-none"
                        />
                        <span className="text-slate-400 text-xs">às</span>
                        <input
                          type="text"
                          value={reg.saida || ""}
                          onChange={(e) =>
                            onRegistrarPonto(dataSel, srv.id, {
                              ...reg,
                              status: reg.status || "presente",
                              saida: e.target.value,
                            })
                          }
                          placeholder="17:30"
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center font-mono text-slate-700 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </td>

                    {/* Observação do dia */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={reg.observacao || ""}
                        onChange={(e) =>
                          onRegistrarPonto(dataSel, srv.id, {
                            ...reg,
                            status: reg.status || "presente",
                            observacao: e.target.value,
                          })
                        }
                        placeholder="Anotação de ponto, atraso, reposição..."
                        className="w-full min-w-[200px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 outline-none"
                      />
                    </td>

                    {/* Atalho para abrir Modal de Ocorrência Formal */}
                    <td className="py-3 px-4 text-right">
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
    </div>
  );
}
