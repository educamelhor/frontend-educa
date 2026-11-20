// src/features/cre/CreGabinetePage.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo CRE > Gabinete Regional (/cre/gabinete)
// Visão executiva consolidada da Coordenação Regional de Ensino (SEEDF):
//   - Escolas vinculadas à Regional, corpo discente/turmas e direção ativa
//   - Panorama consolidado da execução financeira PDAF das unidades vinculadas
//   - Acesso rápido à UNIAG (Acompanhamento & Pré-Análise SEI)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  BuildingLibraryIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BanknotesIcon,
  ScaleIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { formatBRL } from "../financeiro/financeiroUtils";

export default function CreGabinetePage() {
  const navigate = useNavigate();
  const anoCorrente = new Date().getFullYear();

  const [exercicio, setExercicio] = useState(anoCorrente);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  const cargoLocal = String(localStorage.getItem("cargo_regional") || "coordenador_regional")
    .toLowerCase()
    .trim();
  const podeAcessarUniag =
    cargoLocal === "coordenador_regional" || cargoLocal === "chefe_uniag";

  const carregarGabinete = useCallback(
    async (ano = exercicio) => {
      setCarregando(true);
      try {
        const { data } = await api.get("/api/cre/gabinete", {
          params: { exercicio: ano },
        });
        if (data?.ok) {
          setDados(data);
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            "Não foi possível carregar os dados da Coordenação Regional."
        );
      } finally {
        setCarregando(false);
      }
    },
    [exercicio]
  );

  useEffect(() => {
    carregarGabinete(exercicio);
  }, [exercicio, carregarGabinete]);

  const regional = dados?.regional || {};
  const kpis = dados?.kpis || {
    total_escolas: 0,
    escolas_ativas: 0,
    total_alunos: 0,
    total_turmas: 0,
    escolas_com_pdaf: 0,
    pdaf_recebido: 0,
    pdaf_executado: 0,
    pdaf_saldo: 0,
  };
  const escolas = Array.isArray(dados?.escolas) ? dados.escolas : [];
  const chefes = Array.isArray(dados?.chefes) ? dados.chefes : [];

  const cargoLabel =
    dados?.usuario?.cargo_label ||
    localStorage.getItem("cargo_label") ||
    "Coordenador(a) Geral da Regional";

  const escolasFiltradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return escolas;
    return escolas.filter((e) =>
      [e.nome, e.apelido, e.cidade, e.diretor, e.comandante, e.cnpj]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [escolas, busca]);

  const anosOpcoes = [anoCorrente + 1, anoCorrente, anoCorrente - 1];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* ── Hero Institucional Ametista Real (Identidade Oficial CREs) ── */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-7 sm:px-8 sm:py-8 text-white shadow-xl"
        style={{
          background:
            "linear-gradient(135deg, #2e1065 0%, #5b21b6 52%, #4338ca 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-16 -right-12 w-72 h-72 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(216,180,254,0.24) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/15 text-violet-100 border border-white/25">
                <BuildingLibraryIcon className="w-3.5 h-3.5" />
                {regional.codigo_cre || "CRE • SEEDF"}
              </span>
              {regional.cidade && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/20 text-violet-200 border border-white/10">
                  {regional.cidade} / {regional.estado || "DF"}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {regional.nome ||
                localStorage.getItem("nome_escola") ||
                "Coordenação Regional de Ensino"}
            </h1>

            <p className="text-sm text-violet-200/95 font-medium flex flex-wrap items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-violet-300 shrink-0" />
              <span>{cargoLabel}</span>
              <span className="opacity-50">•</span>
              <span>Gabinete & Supervisão Territorial</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-black/25 border border-white/20 rounded-xl px-3.5 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-200">
                Exercício
              </span>
              <select
                value={exercicio}
                onChange={(e) => setExercicio(Number(e.target.value))}
                className="bg-transparent text-sm font-extrabold text-white focus:outline-none cursor-pointer"
              >
                {anosOpcoes.map((ano) => (
                  <option key={ano} value={ano} className="text-slate-900">
                    {ano}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => carregarGabinete(exercicio)}
              disabled={carregando}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer disabled:opacity-50"
              title="Atualizar indicadores"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${carregando ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>

            {podeAcessarUniag && (
              <button
                type="button"
                onClick={() => navigate("/cre/uniag")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-violet-950 bg-white hover:bg-violet-50 shadow-lg transition cursor-pointer"
              >
                <BanknotesIcon className="w-4 h-4 text-violet-700" />
                UNIAG — Prestação de Contas
                <ArrowRightIcon className="w-4 h-4 text-violet-700" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Cards de Indicadores Consolidados da Regional ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-violet-50 border border-violet-200 text-violet-700 flex items-center justify-center">
              <BuildingLibraryIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
              Rede CRE
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Escolas Vinculadas
            </p>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {carregando ? "—" : kpis.total_escolas}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {kpis.escolas_ativas} unidade(s) ativa(s) na plataforma
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <UserGroupIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {exercicio}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Estudantes na Rede
            </p>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {carregando
                ? "—"
                : Number(kpis.total_alunos || 0).toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Distribuídos em {kpis.total_turmas} turma(s) cadastrada(s)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              PDAF {exercicio}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Recursos Recebidos (Rede)
            </p>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {carregando ? "—" : formatBRL(kpis.pdaf_recebido)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {kpis.escolas_com_pdaf} de {kpis.total_escolas} escola(s) com lançamentos
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <ScaleIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              UNIAG
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Saldo PDAF Consolidado
            </p>
            <div
              className={`text-2xl font-extrabold mt-1 ${
                Number(kpis.pdaf_saldo || 0) < -0.005
                  ? "text-rose-600"
                  : "text-emerald-700"
              }`}
            >
              {carregando ? "—" : formatBRL(kpis.pdaf_saldo)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Executado no ano: {formatBRL(kpis.pdaf_executado)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Mapa de Unidades Escolares Vinculadas à Regional ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AcademicCapIcon className="w-5 h-5 text-violet-700" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Unidades Escolares Vinculadas à Regional
              </h2>
              <p className="text-xs text-slate-500">
                Escolas associadas a esta CRE e resumo em tempo real da execução PDAF ({exercicio})
              </p>
            </div>
          </div>

          <div className="relative min-w-[260px]">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar escola, apelido ou diretor..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4">Unidade Escolar</th>
                <th className="py-3.5 px-4">Direção Escolar</th>
                <th className="py-3.5 px-4 text-center">Estudantes / Turmas</th>
                <th className="py-3.5 px-4 text-center">Módulo PDAF</th>
                <th className="py-3.5 px-4 text-right">Recebido ({exercicio})</th>
                <th className="py-3.5 px-4 text-right">Executado ({exercicio})</th>
                <th className="py-3.5 px-4 text-right">Saldo Atual</th>
                {podeAcessarUniag && (
                  <th className="py-3.5 px-4 text-center">UNIAG</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs sm:text-sm">
              {carregando ? (
                <tr>
                  <td
                    colSpan={podeAcessarUniag ? 8 : 7}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    Carregando unidades escolares vinculadas...
                  </td>
                </tr>
              ) : escolasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={podeAcessarUniag ? 8 : 7}
                    className="py-12 px-6 text-center text-slate-500"
                  >
                    {escolas.length === 0
                      ? "Nenhuma unidade escolar foi vinculada a esta Coordenação Regional até o momento."
                      : "Nenhuma escola encontrada para o filtro informado."}
                  </td>
                </tr>
              ) : (
                escolasFiltradas.map((esc) => {
                  const temMov =
                    Number(esc.pdaf?.entradas_count || 0) > 0 ||
                    Number(esc.pdaf?.despesas_count || 0) > 0;
                  return (
                    <tr
                      key={esc.id}
                      className="hover:bg-violet-50/40 transition bg-white"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">
                          {esc.apelido || esc.nome}
                        </div>
                        {esc.apelido && esc.apelido !== esc.nome && (
                          <div className="text-xs text-slate-500">{esc.nome}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {esc.diretor ? (
                          <div className="font-semibold text-slate-800">
                            {esc.diretor}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">
                            Sem diretor vinculado
                          </span>
                        )}
                        {esc.comandante && (
                          <div className="text-[11px] text-slate-500">
                            Cmd.: {esc.comandante}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {Number(esc.total_alunos || 0).toLocaleString("pt-BR")}
                        </span>{" "}
                        <span className="text-xs text-slate-500">
                          alunos ({esc.total_turmas || 0} turmas)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {temMov ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Em execução
                          </span>
                        ) : esc.modulo_financeiro_ativo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <ClockIcon className="w-3.5 h-3.5" />
                            Habilitado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Sem lançamentos
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-slate-700">
                        {formatBRL(esc.pdaf?.recebido || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-blue-800">
                        {formatBRL(esc.pdaf?.executado || 0)}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right whitespace-nowrap font-extrabold ${
                          Number(esc.pdaf?.saldo || 0) < -0.005
                            ? "text-rose-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatBRL(esc.pdaf?.saldo || 0)}
                      </td>

                      {podeAcessarUniag && (
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/cre/uniag?escola=${esc.id}&exercicio=${exercicio}`)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition cursor-pointer"
                          >
                            Inspecionar
                            <ArrowRightIcon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quadro de Gestores Regionais Habilitados ── */}
      {chefes.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              Gestores Habilitados nesta Coordenação Regional
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Titulares ativos vinculados ao Gabinete e às Unidades Orgânicas desta CRE
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {chefes.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-700 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                  {String(c.nome || "C")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {c.nome}
                  </div>
                  <div className="text-xs font-semibold text-violet-700 truncate">
                    {c.cargo_label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
