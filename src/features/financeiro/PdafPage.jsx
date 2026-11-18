// src/features/financeiro/PdafPage.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo Financeiro > Page PDAF (Passo 3)
// Programa de Descentralização Administrativa e Financeira (GDF / SEEDF)
// 1. Cabeçalho Executivo com 4 Cards Prêmium:
//    A) SALDO DO PDAF ORDINÁRIO
//    B) SALDO EMENDA PARLAMENTAR
//    C) SALDO RENDIMENTO
//    D) SALDO TOTAL RECURSOS
// 2. Tabela Oficial de Execução Financeira (10 Colunas):
//    COMPRA | DATA PAGAMENTO | Nº ORDEM DE SERVIÇO / 3 ORÇAMENTOS | FORNECEDOR |
//    CNPJ / CPF | DESCRIÇÃO GERAL | FONTE RECURSO | Nº PROCESSO INCORPORAÇÃO |
//    CUSTEIO | CAPITAL
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeftIcon,
  PlusIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ScaleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import {
  FONTES_PDAF,
  getFonteMeta,
  formatBRL,
  formatDataBR,
} from "./financeiroUtils";
import ModalEntradasPdaf from "./ModalEntradasPdaf";
import ModalDespesaPdaf from "./ModalDespesaPdaf";

const BUCKET_ZERO = {
  entradas_custeio: 0,
  entradas_capital: 0,
  entradas_total: 0,
  saidas_custeio: 0,
  saidas_capital: 0,
  saidas_total: 0,
  saldo_custeio: 0,
  saldo_capital: 0,
  saldo_total: 0,
};

function CardSaldoFonte({
  titulo,
  subtitulo,
  bucket = BUCKET_ZERO,
  Icon,
  topBarGradient,
  iconBgClass,
  accentTextClass,
  onAdicionarCredito,
}) {
  const b = bucket || BUCKET_ZERO;
  const negativo = Number(b.saldo_total || 0) < -0.005;

  return (
    <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between overflow-hidden">
      {/* Barra superior gradiente */}
      <div className={`absolute top-0 inset-x-0 h-1.5 ${topBarGradient}`} />

      <div>
        <div className="flex items-start justify-between gap-3">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${iconBgClass}`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <button
            type="button"
            onClick={onAdicionarCredito}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
            title={`Gerenciar créditos de ${titulo}`}
          >
            <PlusCircleIcon className="w-3.5 h-3.5" />
            Crédito
          </button>
        </div>

        <div className="mt-4">
          <p className={`text-[11px] font-extrabold uppercase tracking-wider ${accentTextClass}`}>
            {titulo}
          </p>
          {subtitulo && (
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitulo}</p>
          )}
          <div
            className={`text-2xl xl:text-[1.65rem] font-extrabold tracking-tight mt-1.5 ${
              negativo ? "text-rose-600" : "text-slate-900"
            }`}
          >
            {formatBRL(b.saldo_total)}
          </div>
        </div>
      </div>

      {/* Sub-linha Custeio x Capital (Regra SEEDF de natureza de despesa) */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Custeio
            </span>
            <span
              className={`text-xs font-extrabold ${
                Number(b.saldo_custeio || 0) < -0.005 ? "text-rose-600" : "text-slate-800"
              }`}
            >
              {formatBRL(b.saldo_custeio)}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Capital
            </span>
            <span
              className={`text-xs font-extrabold ${
                Number(b.saldo_capital || 0) < -0.005 ? "text-rose-600" : "text-slate-800"
              }`}
            >
              {formatBRL(b.saldo_capital)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-0.5">
          <span>Entradas: {formatBRL(b.entradas_total)}</span>
          <span>Saídas: {formatBRL(b.saidas_total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PdafPage() {
  const navigate = useNavigate();
  const anoCorrente = new Date().getFullYear();

  const [exercicio, setExercicio] = useState(anoCorrente);
  const [exerciciosDisponiveis, setExerciciosDisponiveis] = useState([
    anoCorrente + 1,
    anoCorrente,
    anoCorrente - 1,
  ]);
  const [resumo, setResumo] = useState({
    ordinario: BUCKET_ZERO,
    emenda: BUCKET_ZERO,
    rendimento: BUCKET_ZERO,
    total: BUCKET_ZERO,
  });
  const [entradas, setEntradas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros da tabela
  const [busca, setBusca] = useState("");
  const [filtroFonte, setFiltroFonte] = useState("TODAS");

  // Modais
  const [modalEntradas, setModalEntradas] = useState({
    aberto: false,
    fonteInicial: "ORDINARIO",
  });
  const [modalDespesa, setModalDespesa] = useState({
    aberto: false,
    despesaEdicao: null,
  });
  const [excluindoDespesa, setExcluindoDespesa] = useState(null);

  const carregarDados = useCallback(async (ano = exercicio) => {
    setCarregando(true);
    try {
      const { data } = await api.get("/api/financeiro/pdaf", {
        params: { exercicio: ano },
      });
      if (data?.ok) {
        setResumo(
          data.resumo || {
            ordinario: BUCKET_ZERO,
            emenda: BUCKET_ZERO,
            rendimento: BUCKET_ZERO,
            total: BUCKET_ZERO,
          }
        );
        setEntradas(Array.isArray(data.entradas) ? data.entradas : []);
        setDespesas(Array.isArray(data.despesas) ? data.despesas : []);
        if (Array.isArray(data.exercicios_disponiveis) && data.exercicios_disponiveis.length > 0) {
          setExerciciosDisponiveis(data.exercicios_disponiveis);
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Não foi possível carregar os dados do PDAF.");
    } finally {
      setCarregando(false);
    }
  }, [exercicio]);

  useEffect(() => {
    carregarDados(exercicio);
  }, [exercicio, carregarDados]);

  // Filtro instantâneo de compras/despesas na tabela
  const despesasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return despesas.filter((d) => {
      if (filtroFonte !== "TODAS" && d.fonte_recurso !== filtroFonte) return false;
      if (!termo) return true;
      const alvo = [
        d.compra,
        d.fornecedor,
        d.cnpj_cpf,
        d.descricao_geral,
        d.ordem_servico_orcamentos,
        d.processo_incorporacao,
        formatDataBR(d.data_pagamento),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return alvo.includes(termo);
    });
  }, [despesas, busca, filtroFonte]);

  // Totais do rodapé da tabela conforme os itens filtrados
  const totaisTabela = useMemo(() => {
    let custeio = 0;
    let capital = 0;
    for (const d of despesasFiltradas) {
      custeio += Math.round(Number(d.valor_custeio || 0) * 100);
      capital += Math.round(Number(d.valor_capital || 0) * 100);
    }
    return {
      custeio: custeio / 100,
      capital: capital / 100,
      geral: (custeio + capital) / 100,
    };
  }, [despesasFiltradas]);

  async function confirmarExclusaoDespesa() {
    if (!excluindoDespesa) return;
    try {
      await api.delete(`/api/financeiro/pdaf/despesas/${excluindoDespesa.id}`);
      toast.success("Compra/despesa removida com sucesso.");
      setExcluindoDespesa(null);
      await carregarDados(exercicio);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao remover compra/despesa.");
    }
  }

  const totalBucket = resumo?.total || BUCKET_ZERO;
  const saldoTotalNegativo = Number(totalBucket.saldo_total || 0) < -0.005;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* ── Barra Superior Institucional & Ações Rápidas ── */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate("/financeiro")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Voltar
          </button>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
              <span>Módulo Financeiro</span>
              <span>•</span>
              <span>GDF / SEEDF</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
              PDAF — Programa de Descentralização Administrativa e Financeira
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Exercício */}
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Exercício
            </span>
            <select
              value={exercicio}
              onChange={(e) => setExercicio(Number(e.target.value))}
              className="bg-transparent text-sm font-extrabold text-slate-900 focus:outline-none cursor-pointer"
            >
              {exerciciosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>

          {/* Botão: Entradas / Repasses de Saldo */}
          <button
            type="button"
            onClick={() => setModalEntradas({ aberto: true, fonteInicial: "ORDINARIO" })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
          >
            <BanknotesIcon className="w-4 h-4" />
            Entradas / Repasses ({entradas.length})
          </button>

          {/* Botão Primário: Nova Compra / Despesa */}
          <button
            type="button"
            onClick={() => setModalDespesa({ aberto: true, despesaEdicao: null })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md transition cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            Nova Compra / Despesa
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          1) CABEÇALHO: 4 CARDS ESTILO PRÊMIUM
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* CARD A: SALDO DO PDAF ORDINÁRIO */}
        <CardSaldoFonte
          titulo="SALDO DO PDAF ORDINÁRIO"
          subtitulo="Cota regular descentralizada"
          bucket={resumo?.ordinario}
          Icon={BuildingLibraryIcon}
          topBarGradient="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500"
          iconBgClass="bg-blue-50 border-blue-200 text-blue-700"
          accentTextClass="text-blue-700"
          onAdicionarCredito={() =>
            setModalEntradas({ aberto: true, fonteInicial: "ORDINARIO" })
          }
        />

        {/* CARD B: SALDO EMENDA PARLAMENTAR */}
        <CardSaldoFonte
          titulo="SALDO EMENDA PARLAMENTAR"
          subtitulo="Destinações parlamentares específicas"
          bucket={resumo?.emenda}
          Icon={SparklesIcon}
          topBarGradient="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500"
          iconBgClass="bg-violet-50 border-violet-200 text-violet-700"
          accentTextClass="text-violet-700"
          onAdicionarCredito={() =>
            setModalEntradas({ aberto: true, fonteInicial: "EMENDA" })
          }
        />

        {/* CARD C: SALDO RENDIMENTO */}
        <CardSaldoFonte
          titulo="SALDO RENDIMENTO"
          subtitulo="Aplicação financeira da conta PDAF"
          bucket={resumo?.rendimento}
          Icon={ArrowTrendingUpIcon}
          topBarGradient="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"
          iconBgClass="bg-amber-50 border-amber-200 text-amber-700"
          accentTextClass="text-amber-700"
          onAdicionarCredito={() =>
            setModalEntradas({ aberto: true, fonteInicial: "RENDIMENTO" })
          }
        />

        {/* CARD D: SALDO TOTAL RECURSOS (Hero Executivo) */}
        <div
          className="relative rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col justify-between overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #064e3b 0%, #047857 52%, #0d9488 100%)",
          }}
        >
          <div
            className="absolute -right-10 -top-10 w-44 h-44 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(110,231,183,0.25) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <ScaleIcon className="w-5 h-5 text-emerald-100" />
              </div>

              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/15 text-emerald-50 border border-white/20">
                Consolidado {exercicio}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
                SALDO TOTAL RECURSOS
              </p>
              <p className="text-[11px] text-emerald-100/80 font-medium mt-0.5">
                Ordinário + Emenda + Rendimento
              </p>
              <div
                className={`text-2xl xl:text-[1.7rem] font-extrabold tracking-tight mt-1.5 ${
                  saldoTotalNegativo ? "text-rose-200" : "text-white"
                }`}
              >
                {formatBRL(totalBucket.saldo_total)}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/20 border border-white/10 px-2.5 py-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200/90">
                  Custeio Disp.
                </span>
                <span className="text-xs font-extrabold text-white">
                  {formatBRL(totalBucket.saldo_custeio)}
                </span>
              </div>

              <div className="rounded-xl bg-black/20 border border-white/10 px-2.5 py-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200/90">
                  Capital Disp.
                </span>
                <span className="text-xs font-extrabold text-white">
                  {formatBRL(totalBucket.saldo_capital)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-emerald-100/90 font-medium px-0.5">
              <span>Recebido: {formatBRL(totalBucket.entradas_total)}</span>
              <span>Executado: {formatBRL(totalBucket.saidas_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2) TABELA DE EXECUÇÃO FINANCEIRA DO PDAF (10 COLUNAS OFICIAIS)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Barra de Filtro e Pesquisa da Tabela */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <DocumentTextIcon className="w-5 h-5 text-slate-600" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Relação de Compras e Despesas Executadas
              </h2>
              <p className="text-xs text-slate-500">
                {despesasFiltradas.length}{" "}
                {despesasFiltradas.length === 1 ? "lançamento listado" : "lançamentos listados"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Filtro por Fonte */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { value: "TODAS", label: "Todas as Fontes" },
                ...FONTES_PDAF.map((f) => ({ value: f.value, label: f.label })),
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFiltroFonte(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    filtroFonte === opt.value
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Campo de busca */}
            <div className="relative min-w-[260px]">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar compra, fornecedor, CNPJ, OS..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tabela Responsiva com as 10 Colunas Exatas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1280px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-3.5 whitespace-nowrap">COMPRA</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">DATA PAGAMENTO</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">
                  Nº ORDEM DE SERVIÇO / 3 ORÇAMENTOS
                </th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">FORNECEDOR</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">CNPJ / CPF</th>
                <th className="py-3.5 px-3.5">DESCRIÇÃO GERAL</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">FONTE RECURSO</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">
                  Nº PROCESSO INCORPORAÇÃO
                </th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap bg-blue-950/60">
                  CUSTEIO
                </th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap bg-emerald-950/60">
                  CAPITAL
                </th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap">AÇÕES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/80 text-xs sm:text-sm">
              {carregando ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-slate-400 font-medium">
                    Carregando registros financeiros do PDAF...
                  </td>
                </tr>
              ) : despesasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 px-6 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-sm font-bold text-slate-700">
                        Nenhuma compra ou despesa registrada neste filtro ({exercicio}).
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Registre primeiro as entradas de saldo em{" "}
                        <strong>Entradas / Repasses</strong> e cadastre cada execução em{" "}
                        <strong>Nova Compra / Despesa</strong> para acompanhamento automático.
                      </p>
                      <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setModalEntradas({ aberto: true, fonteInicial: "ORDINARIO" })
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                        >
                          <BanknotesIcon className="w-4 h-4" />
                          Lançar Entrada de Saldo
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setModalDespesa({ aberto: true, despesaEdicao: null })
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Lançar Primeira Compra
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                despesasFiltradas.map((item, idx) => {
                  const metaFonte = getFonteMeta(item.fonte_recurso);
                  return (
                    <tr
                      key={item.id}
                      className={`transition hover:bg-blue-50/40 ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      {/* 1. COMPRA */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-extrabold text-slate-900">
                        {item.compra}
                      </td>

                      {/* 2. DATA PAGAMENTO */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-700">
                        {formatDataBR(item.data_pagamento)}
                      </td>

                      {/* 3. Nº ORDEM DE SERVIÇO / 3 ORÇAMENTOS */}
                      <td className="py-3 px-3.5 text-slate-700">
                        {item.ordem_servico_orcamentos || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* 4. FORNECEDOR */}
                      <td className="py-3 px-3.5 font-semibold text-slate-900 max-w-[220px]">
                        <div className="truncate" title={item.fornecedor}>
                          {item.fornecedor}
                        </div>
                      </td>

                      {/* 5. CNPJ / CPF */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                        {item.cnpj_cpf || <span className="text-slate-300">—</span>}
                      </td>

                      {/* 6. DESCRIÇÃO GERAL */}
                      <td className="py-3 px-3.5 text-slate-700 max-w-[280px]">
                        <div className="line-clamp-2" title={item.descricao_geral}>
                          {item.descricao_geral}
                        </div>
                      </td>

                      {/* 7. FONTE RECURSO */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${metaFonte.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${metaFonte.dotClass}`} />
                          {metaFonte.label}
                        </span>
                      </td>

                      {/* 8. Nº PROCESSO INCORPORAÇÃO */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                        {item.processo_incorporacao || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* 9. CUSTEIO */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-blue-900 bg-blue-50/25">
                        {Number(item.valor_custeio || 0) > 0 ? (
                          formatBRL(item.valor_custeio)
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      {/* 10. CAPITAL */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-emerald-900 bg-emerald-50/25">
                        {Number(item.valor_capital || 0) > 0 ? (
                          formatBRL(item.valor_capital)
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setModalDespesa({ aberto: true, despesaEdicao: item })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                            title="Editar compra"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExcluindoDespesa(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Excluir compra"
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

            {/* Rodapé Somatório da Tabela */}
            {despesasFiltradas.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 text-xs sm:text-sm font-extrabold text-slate-900">
                  <td colSpan={8} className="py-3.5 px-4 text-right uppercase tracking-wider text-xs text-slate-600">
                    Total Executado ({despesasFiltradas.length}{" "}
                    {despesasFiltradas.length === 1 ? "compra" : "compras"}) — Geral:{" "}
                    <span className="text-slate-900 font-extrabold">
                      {formatBRL(totaisTabela.geral)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap text-blue-900 bg-blue-100/50">
                    {formatBRL(totaisTabela.custeio)}
                  </td>
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap text-emerald-900 bg-emerald-100/50">
                    {formatBRL(totaisTabela.capital)}
                  </td>
                  <td className="py-3.5 px-3.5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal de Entradas / Repasses */}
      <ModalEntradasPdaf
        aberto={modalEntradas.aberto}
        fonteInicial={modalEntradas.fonteInicial}
        exercicio={exercicio}
        entradas={entradas}
        onFechar={() => setModalEntradas({ aberto: false, fonteInicial: "ORDINARIO" })}
        onAtualizado={() => carregarDados(exercicio)}
      />

      {/* Modal de Nova Compra / Edição */}
      <ModalDespesaPdaf
        aberto={modalDespesa.aberto}
        despesaEdicao={modalDespesa.despesaEdicao}
        despesasExistentes={despesas}
        exercicio={exercicio}
        resumo={resumo}
        onFechar={() => setModalDespesa({ aberto: false, despesaEdicao: null })}
        onSalvo={() => carregarDados(exercicio)}
      />

      {/* Modal de Confirmação de Exclusão de Compra */}
      {excluindoDespesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">
              Excluir Compra / Despesa
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Confirma a exclusão da compra{" "}
              <strong className="text-slate-900">{excluindoDespesa.compra}</strong> do fornecedor{" "}
              <strong className="text-slate-900">{excluindoDespesa.fornecedor}</strong>? O valor será estornado automaticamente ao saldo da respectiva fonte.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setExcluindoDespesa(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusaoDespesa}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
