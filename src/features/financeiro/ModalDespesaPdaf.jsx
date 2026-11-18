// src/features/financeiro/ModalDespesaPdaf.jsx
// ============================================================================
// Modal de Lançamento / Edição de Compra e Despesa do PDAF
// Contempla integralmente as 10 colunas oficiais da tabela PDAF + prévia de saldo
// em tempo real por Fonte de Recurso (Custeio e Capital).
// ============================================================================

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentPlusIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import {
  FONTES_PDAF,
  formatBRL,
  maskMoedaInput,
  numberToMoedaInput,
  parseMoedaInput,
  maskCpfCnpj,
  hojeIso,
  sugerirProximaCompra,
} from "./financeiroUtils";

export default function ModalDespesaPdaf({
  aberto,
  onFechar,
  exercicio,
  despesaEdicao = null,
  despesasExistentes = [],
  resumo = null,
  onSalvo,
}) {
  const [compra, setCompra] = useState("");
  const [dataPagamento, setDataPagamento] = useState(hojeIso());
  const [ordemServicoOrcamentos, setOrdemServicoOrcamentos] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [descricaoGeral, setDescricaoGeral] = useState("");
  const [fonteRecurso, setFonteRecurso] = useState("ORDINARIO");
  const [processoIncorporacao, setProcessoIncorporacao] = useState("");
  const [custeioStr, setCusteioStr] = useState("");
  const [capitalStr, setCapitalStr] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    if (despesaEdicao) {
      setCompra(despesaEdicao.compra || "");
      setDataPagamento(despesaEdicao.data_pagamento || hojeIso());
      setOrdemServicoOrcamentos(despesaEdicao.ordem_servico_orcamentos || "");
      setFornecedor(despesaEdicao.fornecedor || "");
      setCnpjCpf(maskCpfCnpj(despesaEdicao.cnpj_cpf || ""));
      setDescricaoGeral(despesaEdicao.descricao_geral || "");
      setFonteRecurso(despesaEdicao.fonte_recurso || "ORDINARIO");
      setProcessoIncorporacao(despesaEdicao.processo_incorporacao || "");
      setCusteioStr(numberToMoedaInput(despesaEdicao.valor_custeio));
      setCapitalStr(numberToMoedaInput(despesaEdicao.valor_capital));
    } else {
      setCompra(sugerirProximaCompra(despesasExistentes));
      setDataPagamento(hojeIso());
      setOrdemServicoOrcamentos("");
      setFornecedor("");
      setCnpjCpf("");
      setDescricaoGeral("");
      setFonteRecurso("ORDINARIO");
      setProcessoIncorporacao("");
      setCusteioStr("");
      setCapitalStr("");
    }
  }, [aberto, despesaEdicao, despesasExistentes]);

  if (!aberto) return null;

  const valorCusteio = parseMoedaInput(custeioStr);
  const valorCapital = parseMoedaInput(capitalStr);
  const totalCompra = valorCusteio + valorCapital;

  // Cálculo do saldo disponível na fonte selecionada (descontando o valor antigo caso esteja editando a mesma fonte)
  const chaveResumo =
    fonteRecurso === "EMENDA"
      ? "emenda"
      : fonteRecurso === "RENDIMENTO"
      ? "rendimento"
      : "ordinario";

  const bucketFonte = resumo?.[chaveResumo] || {
    saldo_custeio: 0,
    saldo_capital: 0,
    saldo_total: 0,
  };

  const estornoEdicaoCusteio =
    despesaEdicao && despesaEdicao.fonte_recurso === fonteRecurso
      ? Number(despesaEdicao.valor_custeio || 0)
      : 0;
  const estornoEdicaoCapital =
    despesaEdicao && despesaEdicao.fonte_recurso === fonteRecurso
      ? Number(despesaEdicao.valor_capital || 0)
      : 0;

  const dispCusteioAntes = Number(bucketFonte.saldo_custeio || 0) + estornoEdicaoCusteio;
  const dispCapitalAntes = Number(bucketFonte.saldo_capital || 0) + estornoEdicaoCapital;
  const saldoCusteioApos = dispCusteioAntes - valorCusteio;
  const saldoCapitalApos = dispCapitalAntes - valorCapital;
  const excedeSaldo =
    (valorCusteio > 0 && saldoCusteioApos < -0.005) ||
    (valorCapital > 0 && saldoCapitalApos < -0.005);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!compra.trim() || !fornecedor.trim() || !descricaoGeral.trim()) {
      toast.error("Preencha os campos obrigatórios: Compra, Fornecedor e Descrição Geral.");
      return;
    }
    if (totalCompra <= 0) {
      toast.error("Informe um valor maior que zero em Custeio e/ou Capital.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        exercicio,
        compra: compra.trim(),
        data_pagamento: dataPagamento,
        ordem_servico_orcamentos: ordemServicoOrcamentos.trim() || null,
        fornecedor: fornecedor.trim(),
        cnpj_cpf: cnpjCpf.trim() || null,
        descricao_geral: descricaoGeral.trim(),
        fonte_recurso: fonteRecurso,
        processo_incorporacao: processoIncorporacao.trim() || null,
        valor_custeio: valorCusteio,
        valor_capital: valorCapital,
      };

      if (despesaEdicao?.id) {
        await api.put(`/api/financeiro/pdaf/despesas/${despesaEdicao.id}`, payload);
        toast.success("Compra/despesa atualizada com sucesso!");
      } else {
        await api.post("/api/financeiro/pdaf/despesas", payload);
        toast.success("Compra/despesa registrada com sucesso!");
      }

      if (onSalvo) await onSalvo();
      onFechar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar compra/despesa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div
          className="px-6 py-5 text-white flex items-center justify-between shrink-0"
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #047857 55%, #0d9488 100%)",
          }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <DocumentPlusIcon className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
                PDAF • Execução Financeira ({exercicio})
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold">
                {despesaEdicao ? "Editar Compra / Despesa" : "Nova Compra / Despesa"}
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Linha 1: Compra, Data Pagamento, Nº OS / 3 Orçamentos */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                COMPRA *
              </label>
              <input
                type="text"
                value={compra}
                onChange={(e) => setCompra(e.target.value)}
                placeholder="Ex.: 01"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                DATA PAGAMENTO *
              </label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nº ORDEM DE SERVIÇO / 3 ORÇAMENTOS
              </label>
              <input
                type="text"
                value={ordemServicoOrcamentos}
                onChange={(e) => setOrdemServicoOrcamentos(e.target.value)}
                placeholder="Ex.: OS 12/2026 - 3 Orçamentos"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Linha 2: Fornecedor + CNPJ / CPF */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-7">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                FORNECEDOR *
              </label>
              <input
                type="text"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Razão social ou nome completo do fornecedor"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CNPJ / CPF
              </label>
              <input
                type="text"
                value={cnpjCpf}
                onChange={(e) => setCnpjCpf(maskCpfCnpj(e.target.value))}
                placeholder="00.000.000/0000-00 ou 000.000.000-00"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Linha 3: Descrição Geral */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              DESCRIÇÃO GERAL *
            </label>
            <textarea
              rows={2}
              value={descricaoGeral}
              onChange={(e) => setDescricaoGeral(e.target.value)}
              placeholder="Descreva os materiais adquiridos ou serviços executados..."
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none resize-none"
            />
          </div>

          {/* Linha 4: Fonte Recurso + Nº Processo Incorporação */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                FONTE RECURSO *
              </label>
              <select
                value={fonteRecurso}
                onChange={(e) => setFonteRecurso(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {FONTES_PDAF.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nº PROCESSO INCORPORAÇÃO
              </label>
              <input
                type="text"
                value={processoIncorporacao}
                onChange={(e) => setProcessoIncorporacao(e.target.value)}
                placeholder="Ex.: 00080-00054321/2026-11 (bens de Capital)"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Linha 5: Custeio + Capital */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                  CUSTEIO (R$)
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  Disp.:{" "}
                  <strong className={dispCusteioAntes < 0 ? "text-rose-600" : "text-slate-700"}>
                    {formatBRL(dispCusteioAntes)}
                  </strong>
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={custeioStr}
                onChange={(e) => setCusteioStr(maskMoedaInput(e.target.value))}
                placeholder="0,00"
                className="w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2.5 text-base font-extrabold text-right text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                  CAPITAL (R$)
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  Disp.:{" "}
                  <strong className={dispCapitalAntes < 0 ? "text-rose-600" : "text-slate-700"}>
                    {formatBRL(dispCapitalAntes)}
                  </strong>
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={capitalStr}
                onChange={(e) => setCapitalStr(maskMoedaInput(e.target.value))}
                placeholder="0,00"
                className="w-full rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 text-base font-extrabold text-right text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Alerta preventivo caso ultrapasse o saldo disponível na natureza */}
          {excedeSaldo && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3 text-xs text-amber-900">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold">Atenção ao saldo por natureza de despesa:</strong>{" "}
                o valor informado excede o saldo atualmente lançado nesta fonte (Custeio após:{" "}
                <strong>{formatBRL(saldoCusteioApos)}</strong> | Capital após:{" "}
                <strong>{formatBRL(saldoCapitalApos)}</strong>). Caso ainda não tenha lançado o repasse de entrada, registre-o em{" "}
                <strong>Entradas / Repasses</strong>.
              </div>
            </div>
          )}

          {/* Rodapé do Formulário */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Valor total da compra:{" "}
              <strong className="text-base font-extrabold text-slate-900">
                {formatBRL(totalCompra)}
              </strong>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold shadow-md transition cursor-pointer"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {salvando
                  ? "Salvando..."
                  : despesaEdicao
                  ? "Salvar Alterações"
                  : "Registrar Compra"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
