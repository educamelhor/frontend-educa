// src/features/cre/CreGabinetePage.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo CRE > Gabinete Regional (/cre/gabinete) — CLEAN + MODULAR
// Fluxo progressivo e intuitivo (espelhando Conselho de Classe):
//   Nível 1: Selecionar Exercício + escolher frente ([Escolas da Regional] | [Gestores CRE] | [Ir p/ UNIAG])
//   Nível 2: Visualizar KPIs sintéticos + clicar no Chip da Unidade Escolar
//   Nível 3: Ficha executiva limpa da Escola selecionada + atalho direto para os 4 Trimestres na UNIAG
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  BuildingLibraryIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { formatBRL } from "../financeiro/financeiroUtils";

const STATUS_TRI_DOT = {
  EM_ELABORACAO: { label: "Em elaboração", dot: "bg-slate-400" },
  ENVIADO_UNIAG: { label: "Aguardando UNIAG", dot: "bg-blue-600" },
  EM_ANALISE: { label: "Em conferência", dot: "bg-indigo-600" },
  EM_DILIGENCIA: { label: "Em diligência", dot: "bg-amber-500" },
  VALIDADO_SEI: { label: "Validado p/ SEI", dot: "bg-emerald-600" },
};

export default function CreGabinetePage() {
  const navigate = useNavigate();
  const anoCorrente = new Date().getFullYear();

  const [exercicio, setExercicio] = useState(anoCorrente);
  const [exerciciosDisponiveis, setExerciciosDisponiveis] = useState([
    anoCorrente + 1,
    anoCorrente,
    anoCorrente - 1,
  ]);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Navegação Progressiva Clean + Modular
  const [secaoAtiva, setSecaoAtiva] = useState(null); // "escolas" | "chefia" | null
  const [escolaSelecionadaId, setEscolaSelecionadaId] = useState(null);

  const cargoLocal = String(
    localStorage.getItem("cargo_regional") || "coordenador_regional"
  )
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
    remessas_aguardando_uniag: 0,
    remessas_validadas_sei: 0,
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

  const escolaSelecionada =
    escolas.find((e) => e.id === escolaSelecionadaId) || null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Selo Institucional Discreto no Topo */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-violet-50 text-violet-900 border border-violet-200">
          <BuildingLibraryIcon className="w-4 h-4 text-violet-700" />
          {regional.codigo_cre || "CRE • SEEDF"}
          {regional.cidade ? ` • ${regional.cidade}/${regional.estado || "DF"}` : ""}
        </span>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200">
          <ShieldCheckIcon className="w-4 h-4 text-violet-700" />
          {cargoLabel}
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NÍVEL 1 (CLEAN): TÍTULO + SELETOR DE EXERCÍCIO + BOTÕES PRINCIPAIS
         ══════════════════════════════════════════════════════════════════════ */}
      <h1
        className="text-4xl sm:text-5xl font-bold text-center text-violet-950 mb-5"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        {regional.apelido ||
          regional.nome ||
          localStorage.getItem("nome_escola") ||
          "Gabinete Regional"}
      </h1>

      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-violet-200">
          <label
            htmlFor="filtro-exercicio-gabinete"
            className="text-sm font-semibold text-gray-700"
          >
            Exercício:
          </label>
          <select
            id="filtro-exercicio-gabinete"
            value={exercicio}
            onChange={(e) => {
              setExercicio(Number(e.target.value));
              setEscolaSelecionadaId(null);
            }}
            className="border rounded px-2 py-1 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
          >
            {exerciciosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botões Principais Clean (Estilo Conselho de Classe) */}
      <div className="flex flex-wrap justify-center gap-4 mb-9">
        <button
          type="button"
          onClick={() => {
            setSecaoAtiva("escolas");
            setEscolaSelecionadaId(null);
          }}
          className={`px-7 py-4 text-lg sm:text-xl font-semibold rounded-xl shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col items-center min-w-[210px] ${
            secaoAtiva === "escolas"
              ? "bg-green-600 text-white"
              : "bg-white text-violet-950 border border-violet-400 hover:bg-violet-50"
          }`}
        >
          <span>Escolas da Regional</span>
          <span
            className={`mt-1 text-xs font-semibold ${
              secaoAtiva === "escolas" ? "text-green-100" : "text-slate-500"
            }`}
          >
            {carregando ? "..." : `${kpis.total_escolas} unidade(s)`}
          </span>
        </button>

        {podeAcessarUniag && (
          <button
            type="button"
            onClick={() => navigate(`/cre/uniag?exercicio=${exercicio}`)}
            className="px-7 py-4 text-lg sm:text-xl font-semibold rounded-xl shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col items-center min-w-[230px] bg-white text-violet-950 border border-violet-400 hover:bg-violet-50"
          >
            <span>UNIAG • Prestação PDAF</span>
            <span
              className={`mt-1 text-xs font-semibold ${
                Number(kpis.remessas_aguardando_uniag || 0) > 0
                  ? "text-blue-700 font-bold"
                  : "text-slate-500"
              }`}
            >
              {carregando
                ? "..."
                : Number(kpis.remessas_aguardando_uniag || 0) > 0
                ? `● ${kpis.remessas_aguardando_uniag} aguardando análise`
                : `${kpis.remessas_validadas_sei || 0} trimestre(s) validados SEI`}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setSecaoAtiva("chefia");
            setEscolaSelecionadaId(null);
          }}
          className={`px-7 py-4 text-lg sm:text-xl font-semibold rounded-xl shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col items-center min-w-[210px] ${
            secaoAtiva === "chefia"
              ? "bg-green-600 text-white"
              : "bg-white text-violet-950 border border-violet-400 hover:bg-violet-50"
          }`}
        >
          <span>Gestores da CRE</span>
          <span
            className={`mt-1 text-xs font-semibold ${
              secaoAtiva === "chefia" ? "text-green-100" : "text-slate-500"
            }`}
          >
            {carregando ? "..." : `${chefes.length} gestor(es) ativos`}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NÍVEL 2A: PANORAMA + CHIPS DAS ESCOLAS DA REGIONAL
         ══════════════════════════════════════════════════════════════════════ */}
      {secaoAtiva === "escolas" && (
        <div className="space-y-7">
          {/* 4 Indicadores Sintéticos da Rede */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 max-w-5xl mx-auto">
            <div className="rounded-xl bg-white border border-violet-200 px-4 py-3 text-center shadow-xs">
              <div className="text-[11px] font-extrabold uppercase text-slate-500">
                Estudantes na Rede
              </div>
              <div className="text-lg font-extrabold text-violet-950">
                {Number(kpis.total_alunos || 0).toLocaleString("pt-BR")}
              </div>
              <div className="text-[11px] text-slate-500">
                {kpis.total_turmas} turmas
              </div>
            </div>

            <div className="rounded-xl bg-white border border-blue-200 px-4 py-3 text-center shadow-xs">
              <div className="text-[11px] font-extrabold uppercase text-slate-500">
                PDAF Recebido ({exercicio})
              </div>
              <div className="text-lg font-extrabold text-blue-900">
                {formatBRL(kpis.pdaf_recebido || 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                {kpis.escolas_com_pdaf} de {kpis.total_escolas} escolas
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 text-center shadow-xs">
              <div className="text-[11px] font-extrabold uppercase text-slate-500">
                PDAF Executado ({exercicio})
              </div>
              <div className="text-lg font-extrabold text-slate-900">
                {formatBRL(kpis.pdaf_executado || 0)}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50/90 border border-emerald-300 px-4 py-3 text-center shadow-xs">
              <div className="text-[11px] font-extrabold uppercase text-emerald-800">
                Saldo Consolidado
              </div>
              <div className="text-lg font-extrabold text-emerald-900">
                {formatBRL(kpis.pdaf_saldo || 0)}
              </div>
            </div>
          </div>

          {/* Chips das Escolas Vinculadas */}
          {escolas.length === 0 ? (
            <p className="text-center text-slate-500 py-6">
              Nenhuma unidade escolar vinculada a esta Coordenação Regional.
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-3.5">
              {escolas.map((esc) => {
                const selecionada = escolaSelecionadaId === esc.id;
                return (
                  <div
                    key={esc.id}
                    onClick={() => setEscolaSelecionadaId(esc.id)}
                    className={`bg-gradient-to-b from-violet-200 to-violet-50 rounded-lg px-5 py-2.5 shadow-md cursor-pointer hover:shadow-xl transition-transform hover:scale-105 text-center font-bold text-violet-950 text-xs sm:text-sm flex items-center justify-center whitespace-nowrap ${
                      selecionada ? "ring-2 ring-green-600" : ""
                    }`}
                  >
                    {esc.apelido || esc.nome}
                  </div>
                );
              })}
            </div>
          )}

          {/* NÍVEL 3: FICHA EXECUTIVA DA ESCOLA SELECIONADA */}
          {escolaSelecionada && (
            <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl mx-auto space-y-5 border border-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-violet-700">
                    Unidade Escolar Jurisdicionada
                  </span>
                  <h2 className="text-2xl font-bold text-violet-950">
                    {escolaSelecionada.apelido || escolaSelecionada.nome}
                  </h2>
                  {escolaSelecionada.nome !== escolaSelecionada.apelido && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {escolaSelecionada.nome}
                    </p>
                  )}
                </div>

                {podeAcessarUniag && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/cre/uniag?escola=${escolaSelecionada.id}&exercicio=${exercicio}`
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-violet-700 hover:bg-violet-800 shadow-sm transition cursor-pointer"
                  >
                    Auditar na UNIAG
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs sm:text-sm">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                  <span className="block text-[11px] font-bold uppercase text-slate-500">
                    Direção Escolar
                  </span>
                  <strong className="text-slate-900">
                    {escolaSelecionada.diretor || "Sem diretor vinculado"}
                  </strong>
                  {escolaSelecionada.comandante && (
                    <div className="text-xs text-slate-600 mt-0.5">
                      Cmd.: {escolaSelecionada.comandante}
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                  <span className="block text-[11px] font-bold uppercase text-slate-500">
                    Corpo Discente ({exercicio})
                  </span>
                  <strong className="text-slate-900">
                    {Number(
                      escolaSelecionada.total_alunos || 0
                    ).toLocaleString("pt-BR")}{" "}
                    estudantes
                  </strong>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {escolaSelecionada.total_turmas || 0} turmas ativas
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5">
                  <span className="block text-[11px] font-bold uppercase text-emerald-800">
                    Saldo Atual PDAF ({exercicio})
                  </span>
                  <strong className="text-base font-extrabold text-emerald-950">
                    {formatBRL(escolaSelecionada.pdaf?.saldo || 0)}
                  </strong>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Executado: {formatBRL(escolaSelecionada.pdaf?.executado || 0)}
                  </div>
                </div>
              </div>

              {/* Situação dos 4 Trimestres na UNIAG */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Situação Trimestral na UNIAG ({exercicio})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((t) => {
                    const st =
                      escolaSelecionada.pdaf?.trimestres_status?.[t] ||
                      "EM_ELABORACAO";
                    const meta = STATUS_TRI_DOT[st] || STATUS_TRI_DOT.EM_ELABORACAO;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={!podeAcessarUniag}
                        onClick={() =>
                          navigate(
                            `/cre/uniag?escola=${escolaSelecionada.id}&exercicio=${exercicio}&trimestre=${t}`
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-violet-50 p-3 text-left transition cursor-pointer disabled:cursor-default"
                      >
                        <div className="text-xs font-extrabold text-slate-900">
                          {t}º Trimestre
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`}
                          />
                          <span>{meta.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          NÍVEL 2B: QUADRO DE GESTORES DA REGIONAL
         ══════════════════════════════════════════════════════════════════════ */}
      {secaoAtiva === "chefia" && (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl mx-auto space-y-4 border border-slate-200">
          <h2 className="text-xl font-bold text-violet-950">
            Quadro de Gestão Regional
          </h2>
          {chefes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum gestor regional ativo cadastrado nesta CRE.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {chefes.map((c) => (
                <div
                  key={c.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {c.nome}
                    </div>
                    <div className="text-xs text-slate-500">{c.email}</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-900 border border-violet-200">
                    {c.cargo_label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
