// src/features/financeiro/ModalDespesaPdaf.jsx
// ============================================================================
// Modal Clean — Lançamento / Edição de Despesa do Trimestre (PDAF)
// Vincula obrigatoriamente cada pagamento a uma Portaria específica ou a Rendimentos,
// com suporte nativo a Rateio (quando 1 compra utiliza saldo de 2+ Portarias/Fontes).
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import {
  formatBRL,
  maskMoedaInput,
  numberToMoedaInput,
  parseMoedaInput,
  maskCpfCnpj,
  sugerirProximaCompra,
} from "./financeiroUtils";

function dataPadraoTrimestre(exercicio, trimestre) {
  const hoje = new Date();
  const anoHoje = hoje.getFullYear();
  const mesHoje = hoje.getMonth() + 1;
  const triHoje = Math.ceil(mesHoje / 3);
  if (Number(exercicio) === anoHoje && Number(trimestre) === triHoje) {
    return hoje.toISOString().slice(0, 10);
  }
  const mesInicial = String((Number(trimestre) - 1) * 3 + 1).padStart(2, "0");
  return `${exercicio}-${mesInicial}-10`;
}

export default function ModalDespesaPdaf({
  aberto,
  onFechar,
  exercicio,
  trimestre = 1,
  dadosTrimestre = null,
  despesaEdicao = null,
  despesasExistentes = [],
  modoRateioInicial = false,
  onSalvo,
}) {
  const [compra, setCompra] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [documentoFiscal, setDocumentoFiscal] = useState("");
  const [ordemServicoOrcamentos, setOrdemServicoOrcamentos] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [descricaoGeral, setDescricaoGeral] = useState("");
  const [processoIncorporacao, setProcessoIncorporacao] = useState("");
  const [parcelas, setParcelas] = useState([]);
  const [salvando, setSalvando] = useState(false);

  // Opções de fontes disponíveis neste trimestre (Portarias ativas + Rendimentos)
  const opcoesFonte = useMemo(() => {
    const lista = [];
    const ord = dadosTrimestre?.ordinario?.linhas || [];
    const eme = dadosTrimestre?.emendas?.linhas || [];

    for (const p of ord) {
      lista.push({
        key: `PORT_${p.portaria_id}`,
        fonte_recurso: "ORDINARIO",
        portaria_id: p.portaria_id,
        label: `Ordinário • ${p.numero_portaria} (Disp. Cust: ${formatBRL(p.saldo_custeio)} | Cap: ${formatBRL(p.saldo_capital)})`,
        saldo_custeio: Number(p.saldo_custeio || 0),
        saldo_capital: Number(p.saldo_capital || 0),
      });
    }
    for (const p of eme) {
      lista.push({
        key: `PORT_${p.portaria_id}`,
        fonte_recurso: "EMENDA",
        portaria_id: p.portaria_id,
        label: `Emenda • ${p.numero_portaria} (Disp. Cust: ${formatBRL(p.saldo_custeio)} | Cap: ${formatBRL(p.saldo_capital)})`,
        saldo_custeio: Number(p.saldo_custeio || 0),
        saldo_capital: Number(p.saldo_capital || 0),
      });
    }
    const saldoRend = Number(dadosTrimestre?.rendimentos?.saldo_final || 0);
    lista.push({
      key: "RENDIMENTO",
      fonte_recurso: "RENDIMENTO",
      portaria_id: null,
      label: `Rendimentos de Aplicação (Disp.: ${formatBRL(saldoRend)})`,
      saldo_custeio: saldoRend,
      saldo_capital: saldoRend,
    });
    return lista;
  }, [dadosTrimestre]);

  useEffect(() => {
    if (!aberto) return;
    const defaultKey = opcoesFonte[0]?.key || "RENDIMENTO";

    if (despesaEdicao) {
      setCompra(despesaEdicao.compra || "");
      setDataPagamento(despesaEdicao.data_pagamento || dataPadraoTrimestre(exercicio, trimestre));
      setDocumentoFiscal(despesaEdicao.documento_fiscal || "");
      setOrdemServicoOrcamentos(despesaEdicao.ordem_servico_orcamentos || "");
      setFornecedor(despesaEdicao.fornecedor || "");
      setCnpjCpf(maskCpfCnpj(despesaEdicao.cnpj_cpf || ""));
      setDescricaoGeral(despesaEdicao.descricao_geral || "");
      setProcessoIncorporacao(despesaEdicao.processo_incorporacao || "");

      const chaveEdicao =
        despesaEdicao.fonte_recurso === "RENDIMENTO"
          ? "RENDIMENTO"
          : despesaEdicao.portaria_id
          ? `PORT_${despesaEdicao.portaria_id}`
          : defaultKey;

      setParcelas([
        {
          fonteKey: chaveEdicao,
          custeioStr: numberToMoedaInput(despesaEdicao.valor_custeio),
          capitalStr: numberToMoedaInput(despesaEdicao.valor_capital),
        },
      ]);
    } else {
      setCompra(sugerirProximaCompra(despesasExistentes));
      setDataPagamento(dataPadraoTrimestre(exercicio, trimestre));
      setDocumentoFiscal("");
      setOrdemServicoOrcamentos("");
      setFornecedor("");
      setCnpjCpf("");
      setDescricaoGeral("");
      setProcessoIncorporacao("");

      if (modoRateioInicial && opcoesFonte.length >= 2) {
        setParcelas([
          { fonteKey: opcoesFonte[0].key, custeioStr: "", capitalStr: "" },
          { fonteKey: opcoesFonte[1].key, custeioStr: "", capitalStr: "" },
        ]);
      } else {
        setParcelas([{ fonteKey: defaultKey, custeioStr: "", capitalStr: "" }]);
      }
    }
  }, [aberto, despesaEdicao, despesasExistentes, exercicio, trimestre, modoRateioInicial, opcoesFonte]);

  if (!aberto) return null;

  function atualizarParcela(idx, campo, valor) {
    setParcelas((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item))
    );
  }

  function adicionarParcelaRateio() {
    const fallbackKey = opcoesFonte[0]?.key || "RENDIMENTO";
    setParcelas((prev) => [
      ...prev,
      { fonteKey: fallbackKey, custeioStr: "", capitalStr: "" },
    ]);
  }

  function removerParcelaRateio(idx) {
    if (parcelas.length <= 1) return;
    setParcelas((prev) => prev.filter((_, i) => i !== idx));
  }

  const somaCusteio = parcelas.reduce((acc, p) => acc + parseMoedaInput(p.custeioStr), 0);
  const somaCapital = parcelas.reduce((acc, p) => acc + parseMoedaInput(p.capitalStr), 0);
  const totalNota = somaCusteio + somaCapital;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!compra.trim() || !fornecedor.trim() || !descricaoGeral.trim()) {
      toast.error("Preencha Compra, Fornecedor e Descrição Geral.");
      return;
    }
    if (totalNota <= 0) {
      toast.error("Informe um valor maior que zero em Custeio e/ou Capital.");
      return;
    }

    const rateiosMontados = [];
    for (const p of parcelas) {
      const vc = parseMoedaInput(p.custeioStr);
      const vk = parseMoedaInput(p.capitalStr);
      if (vc + vk <= 0) {
        toast.error("Todas as parcelas informadas devem ter valor maior que zero.");
        return;
      }
      if (p.fonteKey === "RENDIMENTO") {
        rateiosMontados.push({
          fonte_recurso: "RENDIMENTO",
          portaria_id: null,
          valor_custeio: vc,
          valor_capital: vk,
        });
      } else if (String(p.fonteKey).startsWith("PORT_")) {
        const pid = Number(String(p.fonteKey).replace("PORT_", ""));
        const opt = opcoesFonte.find((o) => o.portaria_id === pid);
        rateiosMontados.push({
          fonte_recurso: opt?.fonte_recurso || "ORDINARIO",
          portaria_id: pid,
          valor_custeio: vc,
          valor_capital: vk,
        });
      }
    }

    setSalvando(true);
    try {
      const basePayload = {
        exercicio,
        trimestre: Number(trimestre),
        compra: compra.trim(),
        data_pagamento: dataPagamento,
        documento_fiscal: documentoFiscal.trim() || null,
        ordem_servico_orcamentos: ordemServicoOrcamentos.trim() || null,
        fornecedor: fornecedor.trim(),
        cnpj_cpf: cnpjCpf.trim() || null,
        descricao_geral: descricaoGeral.trim(),
        processo_incorporacao: processoIncorporacao.trim() || null,
      };

      if (despesaEdicao?.id) {
        const unico = rateiosMontados[0];
        await api.put(`/api/financeiro/pdaf/despesas/${despesaEdicao.id}`, {
          ...basePayload,
          ...unico,
        });
        toast.success("Despesa atualizada!");
      } else {
        await api.post("/api/financeiro/pdaf/despesas", {
          ...basePayload,
          rateios: rateiosMontados,
        });
        toast.success(
          rateiosMontados.length > 1
            ? "Despesa rateada registrada com sucesso!"
            : "Despesa registrada com sucesso!"
        );
      }

      if (onSalvo) await onSalvo();
      onFechar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar despesa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <DocumentPlusIcon className="w-6 h-6 text-blue-200" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                {trimestre}º Trimestre / {exercicio}
              </span>
              <h2 className="text-lg font-bold">
                {despesaEdicao ? "Editar Despesa Realizada" : "Registrar Despesa Realizada"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Linha 1: Compra, Data, Doc Fiscal, OS / 3 Orçamentos */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Compra *</label>
              <input
                type="text"
                value={compra}
                onChange={(e) => setCompra(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Data Pagto *</label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Nº Doc. Fiscal</label>
              <input
                type="text"
                value={documentoFiscal}
                onChange={(e) => setDocumentoFiscal(e.target.value)}
                placeholder="Ex.: NF 1420"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nº OS / 3 Orçamentos
              </label>
              <input
                type="text"
                value={ordemServicoOrcamentos}
                onChange={(e) => setOrdemServicoOrcamentos(e.target.value)}
                placeholder="Ex.: 97893 ou 3 Orçamentos"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          {/* Linha 2: Fornecedor + CNPJ/CPF */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-7">
              <label className="block text-xs font-bold text-slate-700 mb-1">Fornecedor *</label>
              <input
                type="text"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Razão social ou nome do fornecedor"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ / CPF *</label>
              <input
                type="text"
                value={cnpjCpf}
                onChange={(e) => setCnpjCpf(maskCpfCnpj(e.target.value))}
                placeholder="00.000.000/0001-00"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Linha 3: Descrição + Processo Incorporação */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-7">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição Geral da Compra *
              </label>
              <input
                type="text"
                value={descricaoGeral}
                onChange={(e) => setDescricaoGeral(e.target.value)}
                placeholder="Ex.: Gás, Expediente, Telhado e calha..."
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nº Processo Incorporação (Capital)
              </label>
              <input
                type="text"
                value={processoIncorporacao}
                onChange={(e) => setProcessoIncorporacao(e.target.value)}
                placeholder="Obrigatório p/ bens de Capital"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          {/* Alocação por Portaria / Rendimentos (Suporta Rateio!) */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                Portaria / Fonte Pagadora
              </span>
              {!despesaEdicao && (
                <button
                  type="button"
                  onClick={adicionarParcelaRateio}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-white text-blue-800 border border-blue-300 hover:bg-blue-100 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Ratear com outra Portaria / Fonte
                </button>
              )}
            </div>

            {opcoesFonte.length === 1 && opcoesFonte[0].key === "RENDIMENTO" && (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <span>
                  Nenhuma Portaria cadastrada neste trimestre ainda. Para pagar com PDAF Ordinário ou Emenda, cadastre primeiro na etapa <strong>1. Portarias & Emendas</strong>.
                </span>
              </div>
            )}

            <div className="space-y-2.5">
              {parcelas.map((parc, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end bg-white p-3 rounded-xl border border-slate-200"
                >
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Fonte / Portaria {parcelas.length > 1 ? `#${idx + 1}` : ""} *
                    </label>
                    <select
                      value={parc.fonteKey}
                      onChange={(e) => atualizarParcela(idx, "fonteKey", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-900"
                    >
                      {opcoesFonte.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-blue-800 mb-1">
                      Custeio (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={parc.custeioStr}
                      onChange={(e) =>
                        atualizarParcela(idx, "custeioStr", maskMoedaInput(e.target.value))
                      }
                      placeholder="0,00"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-bold text-right text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                        Capital (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={parc.capitalStr}
                        onChange={(e) =>
                          atualizarParcela(idx, "capitalStr", maskMoedaInput(e.target.value))
                        }
                        placeholder="0,00"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-bold text-right text-slate-900"
                      />
                    </div>

                    {parcelas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerParcelaRateio(idx)}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer mt-4"
                        title="Remover parcela"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <div className="text-xs text-slate-600">
              Total da Compra:{" "}
              <strong className="text-slate-900 text-base">{formatBRL(totalNota)}</strong>
              {parcelas.length > 1 && (
                <span className="ml-2 text-blue-700 font-semibold">
                  ({parcelas.length} fontes somadas)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {salvando ? "Salvando..." : despesaEdicao ? "Salvar Alterações" : "Registrar Despesa"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
