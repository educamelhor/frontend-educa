// src/features/administrativo/OcorrenciasTab.jsx
// ============================================================================
// Aba 3: CENTRAL DE REGISTROS ADMINISTRATIVOS
// - Abonos de Ponto (controle dos 5 abonos anuais regulamentares)
// - Atestados Médicos & Licenças (período, dias, CID, Médico/CRM, documento)
// - Ausências, Faltas & Atrasos
// - Negociações Internas / Acordos com a Direção (controle de reposição)
// ============================================================================

import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
  TIPOS_OCORRENCIA_ADMIN,
  LIMITE_ABONOS_ANUAL,
} from "./useAdministrativoData";

function fmtDataBR(iso) {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getStatusBadge(status) {
  const map = {
    aprovado: { label: "Deferido / Aprovado", bg: "bg-emerald-100", text: "text-emerald-800" },
    homologado: { label: "Homologado / Arquivado", bg: "bg-blue-100", text: "text-blue-800" },
    registrado: { label: "Registrado em Folha", bg: "bg-slate-100", text: "text-slate-700" },
    pendente_reposicao: { label: "⏳ Pendente de Reposição", bg: "bg-amber-100", text: "text-amber-800" },
    compensado: { label: "✅ Reposição Cumprida", bg: "bg-emerald-100", text: "text-emerald-800" },
    pendente_documento: { label: "⚠️ Aguardando Comprovante", bg: "bg-orange-100", text: "text-orange-800" },
    cancelado: { label: "Cancelado", bg: "bg-red-100", text: "text-red-700" },
  };
  const cfg = map[status] || { label: status || "Registrado", bg: "bg-slate-100", text: "text-slate-700" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export default function OcorrenciasTab({
  ocorrencias = [],
  statsPorServidor = {},
  onAbrirModalNovo,
  onAbrirModalEditar,
  onAtualizarStatus,
  onExcluirOcorrencia,
}) {
  const [abaTipo, setAbaTipo] = useState("todos"); // todos | abono | atestado | ausencia | negociacao
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("");

  // Contadores por tipo
  const contadores = useMemo(() => {
    const c = {
      todos: ocorrencias.length,
      abono: 0,
      atestado: 0,
      licenca: 0,
      afastamento: 0,
      ausencia: 0,
      negociacao: 0,
      negociacaoPendente: 0,
    };
    ocorrencias.forEach((o) => {
      if (c[o.tipo] !== undefined) c[o.tipo] += 1;
      if (o.tipo === "negociacao" && o.status === "pendente_reposicao") {
        c.negociacaoPendente += 1;
      }
    });
    return c;
  }, [ocorrencias]);

  // Filtragem
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias
      .filter((o) => {
        if (abaTipo !== "todos" && o.tipo !== abaTipo) return false;
        if (filtroStatus !== "todos" && o.status !== filtroStatus) return false;
        if (filtroMes && !String(o.data_inicio || "").startsWith(filtroMes)) return false;

        if (!busca.trim()) return true;
        const q = busca.toLowerCase().trim();
        return (
          (o.servidor_nome || "").toLowerCase().includes(q) ||
          (o.servidor_cargo || "").toLowerCase().includes(q) ||
          (o.subtipo || "").toLowerCase().includes(q) ||
          (o.motivo || "").toLowerCase().includes(q) ||
          (o.cid || "").toLowerCase().includes(q) ||
          (o.medico || "").toLowerCase().includes(q) ||
          (o.documento_ref || "").toLowerCase().includes(q) ||
          (o.forma_compensacao || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(b.data_inicio || "").localeCompare(String(a.data_inicio || "")));
  }, [ocorrencias, abaTipo, filtroStatus, filtroMes, busca]);

  return (
    <div className="space-y-6">
      {/* ── Sub-Abas de Categoria de Ocorrência + Botões Rápidos ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAbaTipo("todos")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              abaTipo === "todos"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>Todos os Registros</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
              {contadores.todos}
            </span>
          </button>

          {TIPOS_OCORRENCIA_ADMIN.map((t) => {
            const ativo = abaTipo === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setAbaTipo(t.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 border ${
                  ativo ? "shadow-sm scale-[1.02]" : "bg-white hover:bg-slate-50"
                }`}
                style={{
                  backgroundColor: ativo ? t.bg : undefined,
                  color: ativo ? t.cor : "#475569",
                  borderColor: ativo ? t.cor : "#e2e8f0",
                }}
              >
                <span>{t.label}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: ativo ? "#ffffff" : t.bg,
                    color: t.cor,
                  }}
                >
                  {contadores[t.value] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Botões Rápidos de Lançamento */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAbrirModalNovo(null, abaTipo === "todos" ? "abono" : abaTipo)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 transition"
            style={{
              background: "linear-gradient(135deg, #0f172a, #2563eb)",
            }}
          >
            <PlusIcon className="h-4 w-4" />
            Novo Registro Administrativo
          </button>
        </div>
      </div>

      {/* ── Barra de Busca e Filtros ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por servidor, motivo, CID, médico ou plano de reposição..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="todos">📌 Todas as Situações</option>
          <option value="aprovado">✅ Deferido / Aprovado</option>
          <option value="homologado">📋 Homologado / Arquivado</option>
          <option value="pendente_reposicao">⏳ Pendente de Reposição (Acordos)</option>
          <option value="compensado">✅ Reposição Cumprida</option>
          <option value="registrado">📌 Registrado em Folha</option>
        </select>

        <input
          type="month"
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
        />
      </div>

      {/* ── Lista / Tabela de Ocorrências ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {ocorrenciasFiltradas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CalendarDaysIcon className="h-12 w-12 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-700">
              Nenhum registro administrativo encontrado
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Utilize o botão &ldquo;Novo Registro Administrativo&rdquo; para lançar abonos de ponto, atestados médicos, ausências ou negociações internas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3.5 px-4">Servidor / Cargo</th>
                  <th className="py-3.5 px-4">Natureza & Subtipo</th>
                  <th className="py-3.5 px-4">Período & Duração</th>
                  <th className="py-3.5 px-4">Detalhamento / Acordo / Atestado</th>
                  <th className="py-3.5 px-4">Situação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {ocorrenciasFiltradas.map((occ) => {
                  const meta =
                    TIPOS_OCORRENCIA_ADMIN.find((t) => t.value === occ.tipo) ||
                    TIPOS_OCORRENCIA_ADMIN[0];
                  const stSrv = statsPorServidor[occ.servidor_id] || {
                    abonosUsados: 0,
                  };

                  return (
                    <tr key={occ.id} className="hover:bg-blue-50/30 transition">
                      {/* Servidor */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-xs">
                          {occ.servidor_nome}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {occ.servidor_cargo}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Autorizado por: {occ.autorizado_por || "Direção"}
                        </div>
                      </td>

                      {/* Tipo & Subtipo */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold"
                            style={{
                              backgroundColor: meta.bg,
                              color: meta.cor,
                            }}
                          >
                            {meta.label}
                          </span>
                          {occ.lancamento_em_lote && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                              Lançamento em Lote
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-1">
                          {occ.subtipo}
                        </div>
                        {occ.tipo === "abono" && (
                          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                            Cota anual do servidor: {stSrv.abonosUsados}/{LIMITE_ABONOS_ANUAL}
                          </div>
                        )}
                      </td>

                      {/* Período */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-bold text-slate-800">
                          {fmtDataBR(occ.data_inicio)}
                          {occ.data_fim && occ.data_fim !== occ.data_inicio
                            ? ` a ${fmtDataBR(occ.data_fim)}`
                            : ""}
                        </div>
                        <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
                          {occ.dias || 1} dia{Number(occ.dias) > 1 ? "s" : ""}
                          {occ.horas_ausencia ? ` (${occ.horas_ausencia})` : ""}
                        </div>
                      </td>

                      {/* Detalhamento */}
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {occ.motivo}
                        </p>

                        {(occ.tipo === "atestado" || occ.tipo === "licenca" || occ.tipo === "afastamento") &&
                          (occ.cid || occ.medico || occ.documento_ref) && (
                            <div className="mt-1.5 p-2 rounded-lg bg-blue-50/80 border border-blue-100 text-[11px] text-blue-800">
                              {occ.medico && <span><strong>Médico/Perícia:</strong> {occ.medico} </span>}
                              {occ.cid && <span>• <strong>CID:</strong> {occ.cid} </span>}
                              {occ.documento_ref && <span>• <strong>Doc/SEI:</strong> {occ.documento_ref}</span>}
                            </div>
                          )}

                        {occ.tipo === "negociacao" && (
                          <div className="mt-1.5 p-2 rounded-lg bg-purple-50/80 border border-purple-100 text-[11px] text-purple-900">
                            <div>
                              <strong>Plano de Reposição:</strong>{" "}
                              {occ.forma_compensacao || "Acordo interno com a gestão"}
                            </div>
                            {occ.data_compensacao && (
                              <div className="mt-0.5">
                                <strong>Data Prevista p/ Cumprimento:</strong>{" "}
                                {fmtDataBR(occ.data_compensacao)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1.5">
                          {getStatusBadge(occ.status)}
                          {occ.tipo === "negociacao" &&
                            occ.status === "pendente_reposicao" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onAtualizarStatus(occ.id, "compensado");
                                  toast.success("Negociação marcada como Compensada/Cumprida!");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-sm"
                              >
                                ✓ Confirmar Reposição
                              </button>
                            )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onAbrirModalEditar(occ)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition"
                            title="Editar Registro"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onExcluirOcorrencia(occ.id);
                              toast.success("Registro administrativo excluído.");
                            }}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition"
                            title="Excluir Registro"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
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
  );
}
