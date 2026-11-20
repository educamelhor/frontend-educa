// src/features/cre/CreUniagPage.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo CRE > UNIAG (/cre/uniag)
// Unidade Regional de Administração Geral (SEEDF):
//   - Consolidação regional dos saldos PDAF (Ordinário, Emenda, Rendimento)
//   - Matriz de execução financeira por Unidade Escolar vinculada à CRE
//   - Auditoria somente-leitura de Repasses e Compras/Despesas (Pré-Análise SEI)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ScaleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  EyeIcon,
  XMarkIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import {
  getFonteMeta,
  formatBRL,
  formatDataBR,
} from "../financeiro/financeiroUtils";

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

function CardSaldoRegional({
  titulo,
  subtitulo,
  bucket = BUCKET_ZERO,
  Icon,
  topBarGradient,
  iconBgClass,
  accentTextClass,
}) {
  const b = bucket || BUCKET_ZERO;
  const negativo = Number(b.saldo_total || 0) < -0.005;

  return (
    <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 flex flex-col justify-between overflow-hidden">
      <div className={`absolute top-0 inset-x-0 h-1.5 ${topBarGradient}`} />

      <div>
        <div className="flex items-start justify-between gap-3">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${iconBgClass}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600">
            Rede CRE
          </span>
        </div>

        <div className="mt-4">
          <p
            className={`text-[11px] font-extrabold uppercase tracking-wider ${accentTextClass}`}
          >
            {titulo}
          </p>
          {subtitulo && (
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {subtitulo}
            </p>
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

      <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Custeio
            </span>
            <span
              className={`text-xs font-extrabold ${
                Number(b.saldo_custeio || 0) < -0.005
                  ? "text-rose-600"
                  : "text-slate-800"
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
                Number(b.saldo_capital || 0) < -0.005
                  ? "text-rose-600"
                  : "text-slate-800"
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

export default function CreUniagPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const anoCorrente = new Date().getFullYear();

  const anoInicial = Number(searchParams.get("exercicio")) || anoCorrente;
  const [exercicio, setExercicio] = useState(anoInicial);
  const [exerciciosDisponiveis, setExerciciosDisponiveis] = useState([
    anoCorrente + 1,
    anoCorrente,
    anoCorrente - 1,
  ]);
  const [regional, setRegional] = useState(null);
  const [resumoRede, setResumoRede] = useState({
    ordinario: BUCKET_ZERO,
    emenda: BUCKET_ZERO,
    rendimento: BUCKET_ZERO,
    total: BUCKET_ZERO,
  });
  const [escolas, setEscolas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("TODAS");

  // Modal de Auditoria Somente-Leitura da Escola
  const [inspecaoAberta, setInspecaoAberta] = useState(false);
  const [carregandoInspecao, setCarregandoInspecao] = useState(false);
  const [dadosInspecao, setDadosInspecao] = useState(null);
  const [abaInspecao, setAbaInspecao] = useState("despesas"); // "despesas" | "entradas"

  const carregarUniag = useCallback(
    async (ano = exercicio) => {
      setCarregando(true);
      try {
        const { data } = await api.get("/api/cre/uniag/resumo", {
          params: { exercicio: ano },
        });
        if (data?.ok) {
          setRegional(data.regional || null);
          setResumoRede(
            data.resumo_rede || {
              ordinario: BUCKET_ZERO,
              emenda: BUCKET_ZERO,
              rendimento: BUCKET_ZERO,
              total: BUCKET_ZERO,
            }
          );
          setEscolas(Array.isArray(data.escolas) ? data.escolas : []);
          if (
            Array.isArray(data.exercicios_disponiveis) &&
            data.exercicios_disponiveis.length > 0
          ) {
            setExerciciosDisponiveis(data.exercicios_disponiveis);
          }
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            "Não foi possível carregar o painel financeiro da UNIAG."
        );
      } finally {
        setCarregando(false);
      }
    },
    [exercicio]
  );

  useEffect(() => {
    carregarUniag(exercicio);
  }, [exercicio, carregarUniag]);

  const abrirInspecaoEscola = useCallback(
    async (escolaId, ano = exercicio) => {
      if (!escolaId) return;
      setInspecaoAberta(true);
      setCarregandoInspecao(true);
      setDadosInspecao(null);
      setAbaInspecao("despesas");
      try {
        const { data } = await api.get(
          `/api/cre/uniag/escolas/${escolaId}/pdaf`,
          { params: { exercicio: ano } }
        );
        if (data?.ok) {
          setDadosInspecao(data);
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            "Erro ao abrir auditoria da unidade escolar."
        );
        setInspecaoAberta(false);
      } finally {
        setCarregandoInspecao(false);
      }
    },
    [exercicio]
  );

  // Auto-abrir inspeção quando vindo do Gabinete (?escola=ID)
  useEffect(() => {
    const escParam = Number(searchParams.get("escola") || 0);
    if (escParam > 0) {
      abrirInspecaoEscola(escParam, exercicio);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("escola");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, exercicio, abrirInspecaoEscola, setSearchParams]);

  const escolasFiltradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return escolas.filter((e) => {
      if (filtroSituacao === "EM_EXECUCAO" && e.situacao !== "EM_EXECUCAO")
        return false;
      if (
        filtroSituacao === "SEM_LANCAMENTOS" &&
        e.situacao !== "SEM_LANCAMENTOS"
      )
        return false;
      if (
        filtroSituacao === "SALDO_NEGATIVO" &&
        e.situacao !== "SALDO_NEGATIVO"
      )
        return false;
      if (!t) return true;
      return [e.nome, e.apelido, e.diretor, e.cnpj, e.cidade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t);
    });
  }, [escolas, busca, filtroSituacao]);

  const totalBucket = resumoRede?.total || BUCKET_ZERO;
  const saldoTotalNegativo = Number(totalBucket.saldo_total || 0) < -0.005;

  const contadores = useMemo(() => {
    let emExec = 0;
    let semLanc = 0;
    let alerta = 0;
    for (const e of escolas) {
      if (e.situacao === "EM_EXECUCAO") emExec++;
      else if (e.situacao === "SALDO_NEGATIVO") alerta++;
      else semLanc++;
    }
    return { todas: escolas.length, emExec, semLanc, alerta };
  }, [escolas]);

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* ── Barra Institucional UNIAG (Ametista Real) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate("/cre/gabinete")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Gabinete
          </button>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-violet-700">
              <span>{regional?.codigo_cre || "CRE • SEEDF"}</span>
              <span>•</span>
              <span>UNIAG — Administração Geral</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
              Prestação de Contas & Execução PDAF — Pré-Análise SEI
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

          <button
            type="button"
            onClick={() => carregarUniag(exercicio)}
            disabled={carregando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition cursor-pointer disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${carregando ? "animate-spin" : ""}`}
            />
            Atualizar Painel
          </button>
        </div>
      </div>

      {/* ── Nota de Governança Pré-SEI (Alinhamento Operacional) ── */}
      <div className="bg-violet-50/80 border border-violet-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-violet-700 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-violet-950 leading-relaxed">
          <strong>Mesa de Pré-Auditoria UNIAG:</strong> acompanhe em tempo real
          os repasses e compras lançados pelas Unidades Executoras da{" "}
          <strong>{regional?.apelido || "Regional"}</strong> antes da autuação
          definitiva do processo no <strong>SEI-GDF</strong>.
        </p>
      </div>

      {/* ── 4 Cards Consolidados da Regional ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <CardSaldoRegional
          titulo="PDAF ORDINÁRIO (REDE)"
          subtitulo="Cotas regulares nas escolas da CRE"
          bucket={resumoRede?.ordinario}
          Icon={BuildingLibraryIcon}
          topBarGradient="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500"
          iconBgClass="bg-blue-50 border-blue-200 text-blue-700"
          accentTextClass="text-blue-700"
        />

        <CardSaldoRegional
          titulo="EMENDA PARLAMENTAR (REDE)"
          subtitulo="Destinações parlamentares vinculadas"
          bucket={resumoRede?.emenda}
          Icon={SparklesIcon}
          topBarGradient="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500"
          iconBgClass="bg-violet-50 border-violet-200 text-violet-700"
          accentTextClass="text-violet-700"
        />

        <CardSaldoRegional
          titulo="RENDIMENTOS (REDE)"
          subtitulo="Aplicações financeiras declaradas"
          bucket={resumoRede?.rendimento}
          Icon={ArrowTrendingUpIcon}
          topBarGradient="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"
          iconBgClass="bg-amber-50 border-amber-200 text-amber-700"
          accentTextClass="text-amber-700"
        />

        <div
          className="relative rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col justify-between overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #2e1065 0%, #5b21b6 52%, #4338ca 100%)",
          }}
        >
          <div
            className="absolute -right-10 -top-10 w-44 h-44 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(196,181,253,0.28) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <ScaleIcon className="w-5 h-5 text-violet-100" />
              </div>

              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/15 text-violet-50 border border-white/20">
                Consolidado {exercicio}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-200">
                SALDO CONSOLIDADO DA REGIONAL
              </p>
              <p className="text-[11px] text-violet-100/80 font-medium mt-0.5">
                Ordinário + Emendas + Rendimentos
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
                <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-200/90">
                  Custeio Disp.
                </span>
                <span className="text-xs font-extrabold text-white">
                  {formatBRL(totalBucket.saldo_custeio)}
                </span>
              </div>

              <div className="rounded-xl bg-black/20 border border-white/10 px-2.5 py-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-200/90">
                  Capital Disp.
                </span>
                <span className="text-xs font-extrabold text-white">
                  {formatBRL(totalBucket.saldo_capital)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-violet-100/90 font-medium px-0.5">
              <span>Recebido: {formatBRL(totalBucket.entradas_total)}</span>
              <span>Executado: {formatBRL(totalBucket.saidas_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Matriz de Acompanhamento por Unidade Escolar ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <DocumentTextIcon className="w-5 h-5 text-violet-700" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Execução Financeira por Unidade Escolar ({exercicio})
              </h2>
              <p className="text-xs text-slate-500">
                {escolasFiltradas.length} de {escolas.length} unidade(s) listada(s)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { value: "TODAS", label: `Todas (${contadores.todas})` },
                {
                  value: "EM_EXECUCAO",
                  label: `Em Execução (${contadores.emExec})`,
                },
                {
                  value: "SEM_LANCAMENTOS",
                  label: `Sem Lançamentos (${contadores.semLanc})`,
                },
                ...(contadores.alerta > 0
                  ? [
                      {
                        value: "SALDO_NEGATIVO",
                        label: `Alerta Saldo (${contadores.alerta})`,
                      },
                    ]
                  : []),
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFiltroSituacao(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    filtroSituacao === opt.value
                      ? "bg-violet-900 text-white border-violet-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[250px]">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar escola, CNPJ ou diretor..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1160px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4">Unidade Escolar</th>
                <th className="py-3.5 px-4">Diretor(a)</th>
                <th className="py-3.5 px-3 text-center">Repasses</th>
                <th className="py-3.5 px-3 text-center">Compras</th>
                <th className="py-3.5 px-4 text-right">Total Recebido</th>
                <th className="py-3.5 px-4 text-right bg-blue-950/60">
                  Exec. Custeio
                </th>
                <th className="py-3.5 px-4 text-right bg-emerald-950/60">
                  Exec. Capital
                </th>
                <th className="py-3.5 px-4 text-right">Saldo em Conta</th>
                <th className="py-3.5 px-3 text-center">Situação</th>
                <th className="py-3.5 px-4 text-center">Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs sm:text-sm">
              {carregando ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-14 text-center text-slate-400 font-medium"
                  >
                    Carregando matriz financeira das escolas da Regional...
                  </td>
                </tr>
              ) : escolasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-14 px-6 text-center text-slate-500"
                  >
                    Nenhuma unidade escolar encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                escolasFiltradas.map((esc) => {
                  const tot = esc.resumo?.total || BUCKET_ZERO;
                  const neg = Number(tot.saldo_total || 0) < -0.005;
                  return (
                    <tr
                      key={esc.id}
                      className="hover:bg-violet-50/40 transition bg-white"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">
                          {esc.apelido || esc.nome}
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          <span>{esc.nome}</span>
                          {esc.cnpj && (
                            <span className="font-mono text-[11px] text-slate-400">
                              • CNPJ {esc.cnpj}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {esc.diretor || (
                          <span className="text-slate-400 italic text-xs">
                            Não vinculado
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                        {esc.entradas_count || 0}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                        {esc.despesas_count || 0}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-slate-800">
                        {formatBRL(tot.entradas_total)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-blue-900 bg-blue-50/25">
                        {formatBRL(tot.saidas_custeio)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-emerald-900 bg-emerald-50/25">
                        {formatBRL(tot.saidas_capital)}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right whitespace-nowrap font-extrabold ${
                          neg ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {formatBRL(tot.saldo_total)}
                      </td>

                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {esc.situacao === "SALDO_NEGATIVO" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                            Saldo Negativo
                          </span>
                        ) : esc.situacao === "EM_EXECUCAO" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Em Execução
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Sem Lançamentos
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => abrirInspecaoEscola(esc.id, exercicio)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-700 hover:bg-violet-800 shadow-xs transition cursor-pointer"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          Inspecionar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL DE AUDITORIA SOMENTE-LEITURA DA UNIDADE ESCOLAR (UNIAG)
         ══════════════════════════════════════════════════════════════════════ */}
      {inspecaoAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 sm:p-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-[1440px] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-950 via-violet-900 to-indigo-900 text-white flex items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30">
                    <LockClosedIcon className="w-3 h-3" />
                    Auditoria UNIAG • Somente Leitura
                  </span>
                  <span className="text-xs text-violet-200 font-semibold">
                    Exercício {exercicio}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold mt-1">
                  {carregandoInspecao
                    ? "Carregando unidade escolar..."
                    : `${dadosInspecao?.escola?.apelido || ""} — ${
                        dadosInspecao?.escola?.nome || ""
                      }`}
                </h3>
                {dadosInspecao?.escola?.diretor && (
                  <p className="text-xs text-violet-200 mt-0.5">
                    Diretor(a): {dadosInspecao.escola.diretor}
                    {dadosInspecao.escola.cnpj
                      ? ` • CNPJ: ${dadosInspecao.escola.cnpj}`
                      : ""}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setInspecaoAberta(false);
                  setDadosInspecao(null);
                }}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
                title="Fechar auditoria"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo Rolável */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/60">
              {carregandoInspecao ? (
                <div className="py-16 text-center text-slate-500 font-medium">
                  Consultando lançamentos financeiros da unidade escolar...
                </div>
              ) : dadosInspecao ? (
                <>
                  {/* Resumo Rápido da Escola */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {[
                      {
                        label: "PDAF Ordinário",
                        b: dadosInspecao.resumo?.ordinario,
                        cls: "text-blue-700",
                      },
                      {
                        label: "Emenda Parlamentar",
                        b: dadosInspecao.resumo?.emenda,
                        cls: "text-violet-700",
                      },
                      {
                        label: "Rendimentos",
                        b: dadosInspecao.resumo?.rendimento,
                        cls: "text-amber-700",
                      },
                      {
                        label: "Saldo Total da Escola",
                        b: dadosInspecao.resumo?.total,
                        cls: "text-emerald-700",
                      },
                    ].map((card, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs"
                      >
                        <div
                          className={`text-[11px] font-extrabold uppercase tracking-wider ${card.cls}`}
                        >
                          {card.label}
                        </div>
                        <div className="text-xl font-extrabold text-slate-900 mt-1">
                          {formatBRL(card.b?.saldo_total || 0)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                          <span>
                            Cust.: {formatBRL(card.b?.saldo_custeio || 0)}
                          </span>
                          <span>
                            Cap.: {formatBRL(card.b?.saldo_capital || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Seletor de Abas */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAbaInspecao("despesas")}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition cursor-pointer ${
                        abaInspecao === "despesas"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Compras e Despesas ({dadosInspecao.despesas?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbaInspecao("entradas")}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition cursor-pointer ${
                        abaInspecao === "entradas"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Repasses e Entradas ({dadosInspecao.entradas?.length || 0})
                    </button>
                  </div>

                  {/* Aba 1: 10 Colunas Oficiais de Despesas */}
                  {abaInspecao === "despesas" ? (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1150px]">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                            <th className="py-3 px-3.5">Compra</th>
                            <th className="py-3 px-3.5">Data Pagto</th>
                            <th className="py-3 px-3.5">OS / 3 Orçamentos</th>
                            <th className="py-3 px-3.5">Fornecedor</th>
                            <th className="py-3 px-3.5">CNPJ / CPF</th>
                            <th className="py-3 px-3.5">Descrição Geral</th>
                            <th className="py-3 px-3.5">Fonte</th>
                            <th className="py-3 px-3.5">Proc. Incorporação</th>
                            <th className="py-3 px-3.5 text-right">Custeio</th>
                            <th className="py-3 px-3.5 text-right">Capital</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                          {(dadosInspecao.despesas || []).length === 0 ? (
                            <tr>
                              <td
                                colSpan={10}
                                className="py-10 text-center text-slate-400"
                              >
                                Nenhuma compra/despesa registrada nesta escola em{" "}
                                {exercicio}.
                              </td>
                            </tr>
                          ) : (
                            dadosInspecao.despesas.map((d) => {
                              const mf = getFonteMeta(d.fonte_recurso);
                              return (
                                <tr key={d.id} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-3.5 font-extrabold text-slate-900">
                                    {d.compra}
                                  </td>
                                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                                    {formatDataBR(d.data_pagamento)}
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    {d.ordem_servico_orcamentos || "—"}
                                  </td>
                                  <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                                    {d.fornecedor}
                                  </td>
                                  <td className="py-2.5 px-3.5 font-mono text-xs">
                                    {d.cnpj_cpf || "—"}
                                  </td>
                                  <td className="py-2.5 px-3.5 max-w-[260px]">
                                    {d.descricao_geral}
                                  </td>
                                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${mf.badgeClass}`}
                                    >
                                      {mf.shortLabel}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 font-mono text-xs">
                                    {d.processo_incorporacao || "—"}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-blue-900">
                                    {Number(d.valor_custeio || 0) > 0
                                      ? formatBRL(d.valor_custeio)
                                      : "—"}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-emerald-900">
                                    {Number(d.valor_capital || 0) > 0
                                      ? formatBRL(d.valor_capital)
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Aba 2: Repasses / Entradas */
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[820px]">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                            <th className="py-3 px-4">Data</th>
                            <th className="py-3 px-4">Fonte</th>
                            <th className="py-3 px-4">Descrição</th>
                            <th className="py-3 px-4">Portaria / Doc. Ref.</th>
                            <th className="py-3 px-4 text-right">Custeio</th>
                            <th className="py-3 px-4 text-right">Capital</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                          {(dadosInspecao.entradas || []).length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-10 text-center text-slate-400"
                              >
                                Nenhum repasse ou crédito registrado nesta escola em{" "}
                                {exercicio}.
                              </td>
                            </tr>
                          ) : (
                            dadosInspecao.entradas.map((ent) => {
                              const mf = getFonteMeta(ent.fonte_recurso);
                              return (
                                <tr key={ent.id} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    {formatDataBR(ent.data_entrada)}
                                  </td>
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${mf.badgeClass}`}
                                    >
                                      {mf.label}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                                    {ent.descricao}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-xs text-slate-600">
                                    {ent.referencia_doc || "—"}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-bold text-blue-900">
                                    {formatBRL(ent.valor_custeio)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-bold text-emerald-900">
                                    {formatBRL(ent.valor_capital)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
