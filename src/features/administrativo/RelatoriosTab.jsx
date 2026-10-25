// src/features/administrativo/RelatoriosTab.jsx
// ============================================================================
// Aba 4: RELATÓRIOS GERENCIAIS, SALDO DE ABONOS & ESPELHO DE PONTO IMPRIMÍVEL
// - Matriz Consolidada de Saldo Anual de Abonos (5/ano), Atestados e Acordos.
// - Emissor de Espelho Individual de Frequência e Ocorrências pronto p/ impressão.
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  PrinterIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  LIMITE_ABONOS_ANUAL,
  CATEGORIAS_SERVIDOR,
  TIPOS_OCORRENCIA_ADMIN,
  formatarCPF,
} from "./useAdministrativoData";

function fmtDataBR(iso) {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function RelatoriosTab({
  servidores = [],
  ocorrencias = [],
  pontoDiario = {},
  statsPorServidor = {},
}) {
  const [modoRelatorio, setModoRelatorio] = useState("matriz"); // "matriz" | "espelho"
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  // Estado do Espelho Individual
  const [servidorEspelhoId, setServidorEspelhoId] = useState(
    servidores[0]?.id || ""
  );
  const [mesReferencia, setMesReferencia] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const servidorEspelho = useMemo(
    () =>
      servidores.find((s) => s.id === servidorEspelhoId) ||
      servidores[0] ||
      null,
    [servidores, servidorEspelhoId]
  );

  const servidoresFiltrados = useMemo(() => {
    return servidores
      .filter((s) => s.ativo)
      .filter((s) => {
        if (filtroCategoria !== "todos" && s.categoria !== filtroCategoria)
          return false;
        if (!busca.trim()) return true;
        const q = busca.toLowerCase().trim();
        return (
          (s.nome || "").toLowerCase().includes(q) ||
          (s.cargo || "").toLowerCase().includes(q) ||
          (s.cpf || "").includes(q)
        );
      });
  }, [servidores, filtroCategoria, busca]);

  const ocorrenciasDoServidorEspelho = useMemo(() => {
    if (!servidorEspelho) return [];
    return ocorrencias
      .filter((o) => o.servidor_id === servidorEspelho.id)
      .sort((a, b) =>
        String(b.data_inicio || "").localeCompare(String(a.data_inicio || ""))
      );
  }, [ocorrencias, servidorEspelho]);

  const nomeEscola =
    localStorage.getItem("escola_nome") ||
    localStorage.getItem("nome_escola") ||
    "Unidade Escolar — Rede Pública / EDUCA.MELHOR";

  return (
    <div className="space-y-6">
      {/* ── Seletor de Tipo de Relatório + Impressão ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModoRelatorio("matriz")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              modoRelatorio === "matriz"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ChartBarIcon className="h-4 w-4" />
            Matriz Geral de Saldo de Abonos & Assiduidade
          </button>

          <button
            type="button"
            onClick={() => setModoRelatorio("espelho")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              modoRelatorio === "espelho"
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <DocumentTextIcon className="h-4 w-4" />
            Espelho Individual de Frequência e Ocorrências
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
        >
          <PrinterIcon className="h-4 w-4" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VISÃO 1: MATRIZ CONSOLIDADA DE SALDO DE ABONOS E ASSIDUIDADE
         ══════════════════════════════════════════════════════════════════════ */}
      {modoRelatorio === "matriz" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar servidor na matriz anual..."
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
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3.5 px-4">Servidor / Cargo</th>
                  <th className="py-3.5 px-4">Vínculo & Acesso</th>
                  <th className="py-3.5 px-4">Cota Anual de Abonos (5/Ano)</th>
                  <th className="py-3.5 px-4 text-center">Saldo Disponível</th>
                  <th className="py-3.5 px-4 text-center">Dias de Atestado</th>
                  <th className="py-3.5 px-4 text-center">Ausências</th>
                  <th className="py-3.5 px-4 text-center">Acordos Pendentes</th>
                  <th className="py-3.5 px-4 text-right print:hidden">Espelho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {servidoresFiltrados.map((srv) => {
                  const st = statsPorServidor[srv.id] || {
                    abonosUsados: 0,
                    abonosRestantes: LIMITE_ABONOS_ANUAL,
                    diasAtestado: 0,
                    totalAusencias: 0,
                    negociacoesPendentes: 0,
                  };
                  return (
                    <tr key={srv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-xs">
                          {srv.nome}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {srv.cargo} • CPF: {formatarCPF(srv.cpf)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-slate-700 capitalize">
                          {srv.vinculo} ({srv.carga_horaria})
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {srv.acesso_sistema ? "Com Acesso" : "Registro Interno"}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const usado = num <= st.abonosUsados;
                            return (
                              <span
                                key={num}
                                className={`h-6 w-6 rounded-lg text-[11px] font-extrabold flex items-center justify-center border ${
                                  usado
                                    ? "bg-amber-500 text-white border-amber-600"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                                title={
                                  usado
                                    ? `${num}º Abono já utilizado`
                                    : `${num}º Abono disponível`
                                }
                              >
                                {num}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            st.abonosRestantes === 0
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {st.abonosRestantes} restante(s)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-blue-700 text-xs">
                        {st.diasAtestado > 0 ? `${st.diasAtestado} dia(s)` : "0"}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-red-600 text-xs">
                        {st.totalAusencias > 0 ? st.totalAusencias : "0"}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {st.negociacoesPendentes > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                            {st.negociacoesPendentes} pendente(s)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Em dia</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right print:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setServidorEspelhoId(srv.id);
                            setModoRelatorio("espelho");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition"
                        >
                          Ver Espelho
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VISÃO 2: ESPELHO INDIVIDUAL DE FREQUÊNCIA E OCORRÊNCIAS (IMPRIMÍVEL)
         ══════════════════════════════════════════════════════════════════════ */}
      {modoRelatorio === "espelho" && servidorEspelho && (
        <div className="space-y-4">
          {/* Seletores do Espelho (ocultos na impressão) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Selecionar Servidor / Colaborador
              </label>
              <select
                value={servidorEspelho.id}
                onChange={(e) => setServidorEspelhoId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-800"
              >
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} — {s.cargo} ({s.acesso_sistema ? "Sistema" : "Interno"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Mês / Ano de Referência
              </label>
              <input
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Folha Oficial de Espelho de Ponto e Ocorrências */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 space-y-6">
            {/* Cabeçalho Institucional */}
            <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-widest text-blue-800">
                  Módulo Administrativo • Gestão de Pessoas & Frequência
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  ESPELHO INDIVIDUAL DE FREQUÊNCIA, ABONOS E OCORRÊNCIAS
                </h2>
                <p className="text-xs font-semibold text-slate-600">
                  {nomeEscola}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  Referência
                </div>
                <div className="text-base font-extrabold text-slate-900">
                  {mesReferencia}
                </div>
                <div className="text-[11px] text-slate-400">
                  Emitido em {new Date().toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>

            {/* Quadro de Dados Funcionais do Servidor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Nome do Servidor
                </span>
                <strong className="text-slate-900 text-sm">
                  {servidorEspelho.nome}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  CPF / Matrícula
                </span>
                <strong className="text-slate-800">
                  {formatarCPF(servidorEspelho.cpf)} • {servidorEspelho.matricula || "—"}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Cargo / Função
                </span>
                <strong className="text-slate-800">{servidorEspelho.cargo}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Vínculo / Jornada / Turno
                </span>
                <strong className="text-slate-800 capitalize">
                  {servidorEspelho.vinculo} • {servidorEspelho.carga_horaria} ({servidorEspelho.turno})
                </strong>
              </div>
            </div>

            {/* Resumo Anual do Servidor */}
            {(() => {
              const st = statsPorServidor[servidorEspelho.id] || {
                abonosUsados: 0,
                abonosRestantes: LIMITE_ABONOS_ANUAL,
                diasAtestado: 0,
                totalAusencias: 0,
                negociacoesPendentes: 0,
              };
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Abonos Utilizados (Ano)
                    </div>
                    <div className="text-lg font-extrabold text-emerald-700">
                      {st.abonosUsados} / {LIMITE_ABONOS_ANUAL}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Dias de Atestado
                    </div>
                    <div className="text-lg font-extrabold text-blue-700">
                      {st.diasAtestado} dia(s)
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Ausências / Atrasos
                    </div>
                    <div className="text-lg font-extrabold text-red-600">
                      {st.totalAusencias}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Acordos Pendentes
                    </div>
                    <div className="text-lg font-extrabold text-purple-700">
                      {st.negociacoesPendentes}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tabela de Ocorrências Registradas para o Servidor */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                Relação de Abonos, Atestados, Ausências e Negociações Internas
              </h4>
              {ocorrenciasDoServidorEspelho.length === 0 ? (
                <div className="p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  Nenhuma ocorrência ou afastamento registrado para este servidor. Frequência regular.
                </div>
              ) : (
                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-2 px-3 border-r border-slate-200">Tipo</th>
                      <th className="py-2 px-3 border-r border-slate-200">Período</th>
                      <th className="py-2 px-3 border-r border-slate-200">Dias</th>
                      <th className="py-2 px-3 border-r border-slate-200">Especificação / Motivo / Reposição</th>
                      <th className="py-2 px-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ocorrenciasDoServidorEspelho.map((occ) => {
                      const meta =
                        TIPOS_OCORRENCIA_ADMIN.find((t) => t.value === occ.tipo) ||
                        TIPOS_OCORRENCIA_ADMIN[0];
                      return (
                        <tr key={occ.id}>
                          <td className="py-2 px-3 border-r border-slate-200 font-bold">
                            {meta.shortLabel}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            {fmtDataBR(occ.data_inicio)}
                            {occ.data_fim && occ.data_fim !== occ.data_inicio
                              ? ` a ${fmtDataBR(occ.data_fim)}`
                              : ""}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200 font-bold">
                            {occ.dias || 1}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <strong>{occ.subtipo}:</strong> {occ.motivo}
                            {occ.forma_compensacao
                              ? ` | Reposição: ${occ.forma_compensacao}`
                              : ""}
                          </td>
                          <td className="py-2 px-3 font-semibold uppercase">
                            {occ.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Assinaturas */}
            <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-12 text-center text-xs text-slate-700">
              <div className="border-t border-slate-400 pt-2">
                <div className="font-bold text-slate-900">{servidorEspelho.nome}</div>
                <div className="text-[11px] text-slate-500">
                  Assinatura do(a) Servidor(a) / Colaborador(a)
                </div>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <div className="font-bold text-slate-900">
                  Direção Escolar / Supervisão Administrativa
                </div>
                <div className="text-[11px] text-slate-500">
                  Carimbo e Assinatura da Chefia Imediata
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
