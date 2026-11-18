// src/features/financeiro/ModalEntradasPdaf.jsx
// ============================================================================
// Modal de Gestão de Créditos / Entradas de Recursos do PDAF
// (PDAF Ordinário, Emenda Parlamentar e Rendimento — separados por Custeio e Capital)
// ============================================================================

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  XMarkIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import {
  FONTES_PDAF,
  getFonteMeta,
  formatBRL,
  maskMoedaInput,
  numberToMoedaInput,
  parseMoedaInput,
  formatDataBR,
  hojeIso,
} from "./financeiroUtils";

export default function ModalEntradasPdaf({
  aberto,
  onFechar,
  exercicio,
  entradas = [],
  fonteInicial = "ORDINARIO",
  onAtualizado,
}) {
  const [editandoId, setEditandoId] = useState(null);
  const [fonteRecurso, setFonteRecurso] = useState(fonteInicial || "ORDINARIO");
  const [dataEntrada, setDataEntrada] = useState(hojeIso());
  const [descricao, setDescricao] = useState("");
  const [referenciaDoc, setReferenciaDoc] = useState("");
  const [custeioStr, setCusteioStr] = useState("");
  const [capitalStr, setCapitalStr] = useState("");
  const [filtroFonte, setFiltroFonte] = useState("TODAS");
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);

  useEffect(() => {
    if (aberto) {
      resetarFormulario(fonteInicial || "ORDINARIO");
    }
  }, [aberto, fonteInicial]);

  if (!aberto) return null;

  function resetarFormulario(novaFonte = "ORDINARIO") {
    setEditandoId(null);
    setFonteRecurso(novaFonte);
    setDataEntrada(hojeIso());
    setDescricao("");
    setReferenciaDoc("");
    setCusteioStr("");
    setCapitalStr("");
  }

  function iniciarEdicao(item) {
    setEditandoId(item.id);
    setFonteRecurso(item.fonte_recurso || "ORDINARIO");
    setDataEntrada(item.data_entrada || hojeIso());
    setDescricao(item.descricao || "");
    setReferenciaDoc(item.referencia_doc || "");
    setCusteioStr(numberToMoedaInput(item.valor_custeio));
    setCapitalStr(numberToMoedaInput(item.valor_capital));
  }

  const valorCusteio = parseMoedaInput(custeioStr);
  const valorCapital = parseMoedaInput(capitalStr);
  const somaLancamento = valorCusteio + valorCapital;

  async function handleSalvar(e) {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Informe a descrição do crédito/repasse.");
      return;
    }
    if (somaLancamento <= 0) {
      toast.error("Informe um valor maior que zero em Custeio e/ou Capital.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        exercicio,
        data_entrada: dataEntrada,
        fonte_recurso: fonteRecurso,
        descricao: descricao.trim(),
        referencia_doc: referenciaDoc.trim() || null,
        valor_custeio: valorCusteio,
        valor_capital: valorCapital,
      };

      if (editandoId) {
        await api.put(`/api/financeiro/pdaf/entradas/${editandoId}`, payload);
        toast.success("Crédito atualizado com sucesso!");
      } else {
        await api.post("/api/financeiro/pdaf/entradas", payload);
        toast.success("Crédito registrado com sucesso!");
      }

      resetarFormulario(fonteRecurso);
      if (onAtualizado) await onAtualizado();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar entrada de recurso.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(item) {
    if (!window.confirm(`Deseja realmente excluir o crédito "${item.descricao}"?`)) {
      return;
    }
    setExcluindoId(item.id);
    try {
      await api.delete(`/api/financeiro/pdaf/entradas/${item.id}`);
      toast.success("Crédito removido.");
      if (editandoId === item.id) resetarFormulario(fonteRecurso);
      if (onAtualizado) await onAtualizado();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao remover crédito.");
    } finally {
      setExcluindoId(null);
    }
  }

  const entradasFiltradas = entradas.filter(
    (e) => filtroFonte === "TODAS" || e.fonte_recurso === filtroFonte
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div
          className="px-6 py-5 text-white flex items-center justify-between shrink-0"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #0284c7 100%)",
          }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <BanknotesIcon className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-200">
                PDAF • Exercício {exercicio}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold">
                Entradas e Repasses de Recursos
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
            title="Fechar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Formulário de Novo Crédito / Edição */}
          <form
            onSubmit={handleSalvar}
            className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                {editandoId ? "Editar Entrada de Recurso" : "Nova Entrada / Repasse de Saldo"}
              </h3>
              {editandoId && (
                <button
                  type="button"
                  onClick={() => resetarFormulario("ORDINARIO")}
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fonte de Recurso *
                </label>
                <select
                  value={fonteRecurso}
                  onChange={(e) => setFonteRecurso(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {FONTES_PDAF.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data do Crédito *
                </label>
                <input
                  type="date"
                  value={dataEntrada}
                  onChange={(e) => setDataEntrada(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nº Processo SEI / Portaria / Ref.
                </label>
                <input
                  type="text"
                  value={referenciaDoc}
                  onChange={(e) => setReferenciaDoc(e.target.value)}
                  placeholder="Ex.: 00080-00012345/2026-00"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição da Entrada / Parcela *
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex.: 1ª Parcela PDAF Ordinário / Emenda Parlamentar / Rendimento Mês 04"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Custeio (R$)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={custeioStr}
                  onChange={(e) => setCusteioStr(maskMoedaInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-right text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Capital (R$)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={capitalStr}
                  onChange={(e) => setCapitalStr(maskMoedaInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-right text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/80">
              <div className="text-xs text-slate-600">
                Total deste lançamento:{" "}
                <strong className="text-slate-900 text-sm">{formatBRL(somaLancamento)}</strong>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold shadow-sm transition cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                {salvando
                  ? "Salvando..."
                  : editandoId
                  ? "Salvar Alterações"
                  : "Adicionar Crédito ao Saldo"}
              </button>
            </div>
          </form>

          {/* Lista de Entradas Registradas */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Créditos Registrados em {exercicio} ({entradasFiltradas.length})
              </h3>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { value: "TODAS", label: "Todas" },
                  ...FONTES_PDAF.map((f) => ({ value: f.value, label: f.label })),
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFiltroFonte(opt.value)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      filtroFonte === opt.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Fonte</th>
                      <th className="py-3 px-4">Descrição / Referência</th>
                      <th className="py-3 px-4 text-right">Custeio</th>
                      <th className="py-3 px-4 text-right">Capital</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {entradasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                          Nenhum crédito/repasse registrado neste filtro.
                        </td>
                      </tr>
                    ) : (
                      entradasFiltradas.map((item) => {
                        const meta = getFonteMeta(item.fonte_recurso);
                        const totalItem =
                          Number(item.valor_custeio || 0) + Number(item.valor_capital || 0);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                              {formatDataBR(item.data_entrada)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{item.descricao}</div>
                              {item.referencia_doc && (
                                <div className="text-xs text-slate-500">{item.referencia_doc}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-slate-700">
                              {formatBRL(item.valor_custeio)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-slate-700">
                              {formatBRL(item.valor_capital)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-emerald-700">
                              {formatBRL(totalItem)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicao(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                                  title="Editar"
                                >
                                  <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={excluindoId === item.id}
                                  onClick={() => handleExcluir(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                                  title="Excluir"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onFechar}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold transition cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
