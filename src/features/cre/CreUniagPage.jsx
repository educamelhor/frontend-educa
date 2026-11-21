// src/features/cre/CreUniagPage.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo CRE > UNIAG (/cre/uniag) — Padrão CLEAN + MODULAR
// Fluxo progressivo e intuitivo (espelhando Conselho de Classe):
//   Nível 1: Selecionar Exercício + clicar no Trimestre (1º ao 4º Trimestre)
//   Nível 2: Visualizar panorama do trimestre + clicar no Chip da Escola da CRE
//   Nível 3: Inspecionar abas da Escola selecionada:
//            [📊 PORTARIAS & RENDIMENTOS] [🧾 DESPESAS] [⚖️ PARECER PRÉ-SEI & .XLSX]
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeftIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  ArrowUturnLeftIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { formatBRL, formatDataBR } from "../financeiro/financeiroUtils";

const STATUS_META = {
  EM_ELABORACAO: {
    label: "Não enviado",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
  },
  ENVIADO_UNIAG: {
    label: "Aguardando UNIAG",
    dot: "bg-blue-600",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
  },
  EM_ANALISE: {
    label: "Em conferência",
    dot: "bg-indigo-600",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  EM_DILIGENCIA: {
    label: "Em diligência",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
  },
  VALIDADO_SEI: {
    label: "Validado p/ SEI",
    dot: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
};

export default function CreUniagPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const anoCorrente = new Date().getFullYear();

  const [exercicio, setExercicio] = useState(
    Number(searchParams.get("exercicio")) || anoCorrente
  );
  const [exerciciosDisponiveis, setExerciciosDisponiveis] = useState([
    anoCorrente + 1,
    anoCorrente,
    anoCorrente - 1,
  ]);

  const [regional, setRegional] = useState(null);
  const [trimestresRede, setTrimestresRede] = useState({});
  const [escolas, setEscolas] = useState([]);
  const [carregandoResumo, setCarregandoResumo] = useState(true);

  // Navegação Progressiva Clean + Modular
  const [trimestreSelecionado, setTrimestreSelecionado] = useState(
    Number(searchParams.get("trimestre")) || null
  );
  const [escolaSelecionadaId, setEscolaSelecionadaId] = useState(
    Number(searchParams.get("escola")) || null
  );
  const [abaAtiva, setAbaAtiva] = useState("portarias"); // "portarias" | "despesas" | "parecer"

  // Detalhe completo da escola selecionada
  const [dadosEscola, setDadosEscola] = useState(null);
  const [carregandoEscola, setCarregandoEscola] = useState(false);

  // Campos de Decisão UNIAG (Aba 3)
  const [parecerUniag, setParecerUniag] = useState("");
  const [processoSeiUniag, setProcessoSeiUniag] = useState("");
  const [salvandoParecer, setSalvandoParecer] = useState(false);
  const [baixandoPlanilha, setBaixandoPlanilha] = useState(false);

  const carregarResumoRegional = useCallback(
    async (ano = exercicio) => {
      setCarregandoResumo(true);
      try {
        const { data } = await api.get("/api/cre/uniag/resumo", {
          params: { exercicio: ano },
        });
        if (data?.ok) {
          setRegional(data.regional || null);
          setTrimestresRede(data.trimestres_rede || {});
          const listaEsc = Array.isArray(data.escolas) ? data.escolas : [];
          setEscolas(listaEsc);

          if (
            Array.isArray(data.exercicios_disponiveis) &&
            data.exercicios_disponiveis.length > 0
          ) {
            setExerciciosDisponiveis(data.exercicios_disponiveis);
          }

          // Se veio do Gabinete com ?escola=ID sem trimestre definido, escolhe automaticamente
          // o trimestre que está aguardando análise (ou 1º Trimestre por padrão)
          const paramEsc = Number(searchParams.get("escola") || 0);
          const paramTri = Number(searchParams.get("trimestre") || 0);
          if (paramEsc > 0 && !paramTri) {
            const escAlvo = listaEsc.find((e) => e.id === paramEsc);
            if (escAlvo) {
              const triPendente = [1, 2, 3, 4].find(
                (t) =>
                  escAlvo.trimestres?.[t]?.status === "ENVIADO_UNIAG" ||
                  escAlvo.trimestres?.[t]?.status === "EM_ANALISE"
              );
              setTrimestreSelecionado(triPendente || 1);
            }
          }
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            "Não foi possível carregar o painel da UNIAG."
        );
      } finally {
        setCarregandoResumo(false);
      }
    },
    [exercicio, searchParams]
  );

  useEffect(() => {
    carregarResumoRegional(exercicio);
  }, [exercicio, carregarResumoRegional]);

  const carregarEspelhoEscola = useCallback(
    async (escId, ano = exercicio) => {
      if (!escId) {
        setDadosEscola(null);
        return;
      }
      setCarregandoEscola(true);
      try {
        const { data } = await api.get(`/api/cre/uniag/escolas/${escId}/pdaf`, {
          params: { exercicio: ano },
        });
        if (data?.ok) {
          setDadosEscola(data);
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            "Erro ao carregar a prestação de contas da unidade escolar."
        );
      } finally {
        setCarregandoEscola(false);
      }
    },
    [exercicio]
  );

  useEffect(() => {
    if (escolaSelecionadaId && trimestreSelecionado) {
      carregarEspelhoEscola(escolaSelecionadaId, exercicio);
    } else {
      setDadosEscola(null);
    }
  }, [escolaSelecionadaId, trimestreSelecionado, exercicio, carregarEspelhoEscola]);

  const dadosTriEscola =
    trimestreSelecionado && dadosEscola
      ? dadosEscola.trimestres?.[trimestreSelecionado] || null
      : null;

  useEffect(() => {
    if (!dadosTriEscola) return;
    setParecerUniag(dadosTriEscola.prestacao?.parecer_uniag || "");
    setProcessoSeiUniag(dadosTriEscola.prestacao?.processo_sei_prestacao || "");
  }, [dadosTriEscola, trimestreSelecionado, escolaSelecionadaId]);

  function handleSelecionarTrimestre(tri) {
    setTrimestreSelecionado(tri);
    setEscolaSelecionadaId(null);
    setDadosEscola(null);
    setAbaAtiva("portarias");
    setSearchParams({ exercicio: String(exercicio), trimestre: String(tri) }, { replace: true });
  }

  function handleSelecionarEscola(escId) {
    setEscolaSelecionadaId(escId);
    const resumoTri = escolas
      .find((e) => e.id === escId)
      ?.trimestres?.[trimestreSelecionado];
    if (
      resumoTri?.status === "ENVIADO_UNIAG" ||
      resumoTri?.status === "EM_ANALISE"
    ) {
      setAbaAtiva("parecer");
    } else {
      setAbaAtiva("portarias");
    }
    setSearchParams(
      {
        exercicio: String(exercicio),
        trimestre: String(trimestreSelecionado),
        escola: String(escId),
      },
      { replace: true }
    );
  }

  async function handleRegistrarDecisaoUniag(acao) {
    if (!escolaSelecionadaId || !trimestreSelecionado) return;
    if (acao === "EM_DILIGENCIA" && !parecerUniag.trim()) {
      toast.error(
        "Descreva no Parecer Técnico os ajustes que a direção da escola precisa corrigir."
      );
      return;
    }

    setSalvandoParecer(true);
    try {
      const { data } = await api.post(
        `/api/cre/uniag/escolas/${escolaSelecionadaId}/trimestres/${trimestreSelecionado}/avaliar`,
        {
          exercicio,
          acao,
          parecer_uniag: parecerUniag.trim() || null,
          processo_sei_prestacao: processoSeiUniag.trim() || null,
        }
      );
      toast.success(data?.message || "Decisão registrada com sucesso!");
      await Promise.all([
        carregarResumoRegional(exercicio),
        carregarEspelhoEscola(escolaSelecionadaId, exercicio),
      ]);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Não foi possível registrar a decisão da UNIAG."
      );
    } finally {
      setSalvandoParecer(false);
    }
  }

  async function handleBaixarPlanilhaEscola() {
    if (!escolaSelecionadaId) return;
    setBaixandoPlanilha(true);
    try {
      const response = await api.get(
        `/api/cre/uniag/escolas/${escolaSelecionadaId}/exportar-xlsx`,
        {
          params: { exercicio },
          responseType: "blob",
        }
      );
      const apelido = String(dadosEscola?.escola?.apelido || `ESCOLA_${escolaSelecionadaId}`)
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .toUpperCase();
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `UEx_CONTROLE_DE_DESPESAS_${exercicio}_${apelido}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Planilha oficial (.xlsx) baixada com sucesso!");
    } catch {
      toast.error("Erro ao gerar a planilha oficial .xlsx da unidade escolar.");
    } finally {
      setBaixandoPlanilha(false);
    }
  }

  const infoRedeTri = trimestreSelecionado
    ? trimestresRede?.[trimestreSelecionado] || null
    : null;

  const statusEscolaMeta =
    STATUS_META[dadosTriEscola?.status || "EM_ELABORACAO"] ||
    STATUS_META.EM_ELABORACAO;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Barra Discreta Superior: Voltar ao Gabinete + Selo da Regional */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => navigate("/cre/gabinete")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-violet-950 bg-white border border-violet-200 hover:bg-violet-50 shadow-xs transition cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Gabinete Regional
        </button>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-900 border border-violet-200">
          <BuildingLibraryIcon className="w-4 h-4 text-violet-700" />
          {regional?.apelido || regional?.nome || "CRE • UNIAG"}
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NÍVEL 1 (CLEAN): TÍTULO + SELETOR DE EXERCÍCIO + 4 BOTÕES DE TRIMESTRE
         ══════════════════════════════════════════════════════════════════════ */}
      <h1
        className="text-4xl sm:text-5xl font-bold text-center text-violet-950 mb-5"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        UNIAG — Prestação de Contas
      </h1>

      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-violet-200">
          <label
            htmlFor="filtro-exercicio-uniag"
            className="text-sm font-semibold text-gray-700"
          >
            Exercício:
          </label>
          <select
            id="filtro-exercicio-uniag"
            value={exercicio}
            onChange={(e) => {
              const novoAno = Number(e.target.value);
              setExercicio(novoAno);
              setTrimestreSelecionado(null);
              setEscolaSelecionadaId(null);
              setDadosEscola(null);
              setSearchParams({ exercicio: String(novoAno) }, { replace: true });
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

      {/* 4 Botões Principais dos Trimestres (Estilo Conselho de Classe) */}
      <div className="flex flex-wrap justify-center gap-4 mb-9">
        {[1, 2, 3, 4].map((tri) => {
          const rTri = trimestresRede?.[tri];
          const aguardando = Number(rTri?.aguardando_analise || 0);
          const validadas = Number(rTri?.validados_sei || 0);
          const ativo = trimestreSelecionado === tri;

          return (
            <button
              key={tri}
              type="button"
              onClick={() => handleSelecionarTrimestre(tri)}
              className={`px-7 py-4 text-lg sm:text-xl font-semibold rounded-xl shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col items-center min-w-[185px] ${
                ativo
                  ? "bg-green-600 text-white"
                  : "bg-white text-violet-950 border border-violet-400 hover:bg-violet-50"
              }`}
            >
              <span>{tri}º Trimestre</span>
              <span
                className={`mt-1 text-[11px] font-semibold ${
                  ativo
                    ? "text-green-100"
                    : aguardando > 0
                    ? "text-blue-700 font-bold"
                    : "text-slate-500"
                }`}
              >
                {carregandoResumo
                  ? "Carregando..."
                  : aguardando > 0
                  ? `● ${aguardando} p/ analisar • ${validadas} SEI`
                  : `${validadas}/${rTri?.total_escolas || 0} validadas p/ SEI`}
              </span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NÍVEL 2 (MODULAR): STATUS DO TRIMESTRE + CHIPS DAS ESCOLAS DA CRE
         ══════════════════════════════════════════════════════════════════════ */}
      {trimestreSelecionado && (
        <div className="space-y-7">
          {/* Placar Enxuto de Status das Escolas no Trimestre Selecionado */}
          {infoRedeTri && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 max-w-4xl mx-auto">
              <div className="rounded-xl bg-white border border-blue-200 px-4 py-2.5 text-center shadow-xs">
                <div className="text-[11px] font-extrabold uppercase text-blue-700">
                  Aguardando UNIAG
                </div>
                <div className="text-xl font-extrabold text-blue-900">
                  {infoRedeTri.aguardando_analise}
                </div>
              </div>

              <div className="rounded-xl bg-white border border-amber-200 px-4 py-2.5 text-center shadow-xs">
                <div className="text-[11px] font-extrabold uppercase text-amber-700">
                  Em Diligência
                </div>
                <div className="text-xl font-extrabold text-amber-900">
                  {infoRedeTri.em_diligencia}
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50/80 border border-emerald-300 px-4 py-2.5 text-center shadow-xs">
                <div className="text-[11px] font-extrabold uppercase text-emerald-800">
                  Validadas p/ SEI
                </div>
                <div className="text-xl font-extrabold text-emerald-900">
                  {infoRedeTri.validados_sei}
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-center shadow-xs">
                <div className="text-[11px] font-extrabold uppercase text-slate-500">
                  Não Enviadas
                </div>
                <div className="text-xl font-extrabold text-slate-700">
                  {infoRedeTri.em_elaboracao}
                </div>
              </div>
            </div>
          )}

          {/* Chips Modulares das Escolas da Regional (Idêntico aos Chips de Turmas do Conselho) */}
          {escolas.length === 0 ? (
            <p className="text-center text-slate-500 py-6">
              Nenhuma unidade escolar vinculada a esta Coordenação Regional.
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-3.5">
              {escolas.map((esc) => {
                const stEsc =
                  esc.trimestres?.[trimestreSelecionado]?.status ||
                  "EM_ELABORACAO";
                const meta = STATUS_META[stEsc] || STATUS_META.EM_ELABORACAO;
                const selecionado = escolaSelecionadaId === esc.id;

                return (
                  <div
                    key={esc.id}
                    onClick={() => handleSelecionarEscola(esc.id)}
                    className={`bg-gradient-to-b from-violet-200 to-violet-50 rounded-lg px-5 py-2.5 shadow-md cursor-pointer hover:shadow-xl transition-transform hover:scale-105 text-center font-bold text-violet-950 text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap ${
                      selecionado ? "ring-2 ring-green-600" : ""
                    }`}
                    title={`${esc.nome} — ${meta.label}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                    <span>{esc.apelido || esc.nome}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              NÍVEL 3: AUDITORIA DA ESCOLA SELECIONADA COM ABAS LIMPAS NO TOPO
             ══════════════════════════════════════════════════════════════════ */}
          {escolaSelecionadaId && (
            <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 space-y-6 border border-slate-200">
              {carregandoEscola || !dadosEscola || !dadosTriEscola ? (
                <div className="py-12 text-center text-slate-500 font-medium">
                  Carregando prestação de contas da unidade escolar...
                </div>
              ) : (
                <>
                  {/* Cabeçalho da Escola + Abas Modulares (Estilo Print 3 do Conselho de Classe) */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl sm:text-2xl font-bold text-violet-950">
                        {dadosEscola.escola?.apelido || dadosEscola.escola?.nome}
                      </h2>

                      <button
                        type="button"
                        onClick={() => setAbaAtiva("portarias")}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 transition cursor-pointer ${
                          abaAtiva === "portarias"
                            ? "border-violet-700 bg-violet-700 text-white shadow-xs"
                            : "border-violet-400 bg-violet-50 text-violet-800 hover:bg-violet-100"
                        }`}
                      >
                        📊 PORTARIAS & RENDIMENTOS
                      </button>

                      <button
                        type="button"
                        onClick={() => setAbaAtiva("despesas")}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 transition cursor-pointer ${
                          abaAtiva === "despesas"
                            ? "border-violet-700 bg-violet-700 text-white shadow-xs"
                            : "border-violet-400 bg-violet-50 text-violet-800 hover:bg-violet-100"
                        }`}
                      >
                        🧾 DESPESAS ({dadosTriEscola.despesas?.length || 0})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAbaAtiva("parecer")}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 transition cursor-pointer ${
                          abaAtiva === "parecer"
                            ? "border-emerald-700 bg-emerald-600 text-white shadow-xs"
                            : "border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        ⚖️ PARECER PRÉ-SEI & PLANILHA
                      </button>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusEscolaMeta.badge}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusEscolaMeta.dot}`} />
                      {statusEscolaMeta.label}
                    </span>
                  </div>

                  {/* Faixa de Identificação Oficial UEx + 4 Saldos do Trimestre */}
                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                      <div>
                        <strong className="text-slate-900">
                          {dadosEscola.uex?.nome_uex}
                        </strong>{" "}
                        • CNPJ:{" "}
                        <span className="font-mono font-semibold">
                          {dadosEscola.uex?.cnpj || "Não informado"}
                        </span>
                      </div>
                      <div>
                        Direção:{" "}
                        <strong>
                          {dadosEscola.escola?.diretor || "Não vinculado"}
                        </strong>{" "}
                        • <strong>{dadosTriEscola.titulo}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-center">
                        <div className="text-[10px] font-extrabold uppercase text-slate-500">
                          Saldo PDAF Ordinário
                        </div>
                        <div className="text-base font-extrabold text-blue-900">
                          {formatBRL(dadosTriEscola.saldos_topo?.ordinario || 0)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-center">
                        <div className="text-[10px] font-extrabold uppercase text-slate-500">
                          Saldo Emenda Parlamentar
                        </div>
                        <div className="text-base font-extrabold text-violet-900">
                          {formatBRL(dadosTriEscola.saldos_topo?.emenda || 0)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-center">
                        <div className="text-[10px] font-extrabold uppercase text-slate-500">
                          Saldo Rendimento
                        </div>
                        <div className="text-base font-extrabold text-amber-800">
                          {formatBRL(dadosTriEscola.saldos_topo?.rendimento || 0)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-3.5 py-2.5 text-center">
                        <div className="text-[10px] font-extrabold uppercase text-emerald-800">
                          Saldo Total Recursos
                        </div>
                        <div className="text-base font-extrabold text-emerald-900">
                          {formatBRL(dadosTriEscola.saldos_topo?.total_recursos || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── ABA 1: PORTARIAS & RENDIMENTOS (ESPELHO SOMENTE-LEITURA) ── */}
                  {abaAtiva === "portarias" && (
                    <div className="space-y-6">
                      {/* Ordinário */}
                      <div className="space-y-2">
                        <div className="text-xs font-extrabold uppercase tracking-wider text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                          PDAF Ordinário
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[820px] text-xs sm:text-sm">
                            <thead>
                              <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase">
                                <th className="py-2 px-3">Código</th>
                                <th className="py-2 px-3">Portaria</th>
                                <th className="py-2 px-3 text-right">Crédito Custeio</th>
                                <th className="py-2 px-3 text-right">Crédito Capital</th>
                                <th className="py-2 px-3 text-right">Despesa Custeio</th>
                                <th className="py-2 px-3 text-right">Despesa Capital</th>
                                <th className="py-2 px-3 text-right bg-emerald-900/60">
                                  Saldo Custeio
                                </th>
                                <th className="py-2 px-3 text-right bg-emerald-900/60">
                                  Saldo Capital
                                </th>
                                <th className="py-2 px-3 text-right bg-emerald-950/80">
                                  Total Ordinário
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {(dadosTriEscola.ordinario?.linhas || []).length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={9}
                                    className="py-5 text-center text-slate-400"
                                  >
                                    Nenhuma Portaria Ordinária lançada pela escola neste trimestre.
                                  </td>
                                </tr>
                              ) : (
                                dadosTriEscola.ordinario.linhas.map((l) => (
                                  <tr key={l.portaria_id} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                      {l.numero_portaria}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-slate-800">
                                      {l.titulo_portaria}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {formatBRL(l.credito_custeio)}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {formatBRL(l.credito_capital)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-rose-700">
                                      {formatBRL(l.despesa_custeio)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-rose-700">
                                      {formatBRL(l.despesa_capital)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold bg-emerald-50/50 text-emerald-900">
                                      {formatBRL(l.saldo_custeio)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold bg-emerald-50/50 text-emerald-900">
                                      {formatBRL(l.saldo_capital)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-extrabold bg-emerald-100/60 text-emerald-950">
                                      {formatBRL(l.saldo_total)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                            {(dadosTriEscola.ordinario?.linhas || []).length > 0 && (
                              <tfoot>
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td colSpan={2} className="py-2 px-3 text-right">
                                    TOTAL ORDINÁRIO:
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {formatBRL(dadosTriEscola.ordinario.totais.credito_custeio)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {formatBRL(dadosTriEscola.ordinario.totais.credito_capital)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {formatBRL(dadosTriEscola.ordinario.totais.despesa_custeio)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {formatBRL(dadosTriEscola.ordinario.totais.despesa_capital)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-emerald-900">
                                    {formatBRL(dadosTriEscola.ordinario.totais.saldo_custeio)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-emerald-900">
                                    {formatBRL(dadosTriEscola.ordinario.totais.saldo_capital)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-emerald-950">
                                    {formatBRL(dadosTriEscola.ordinario.totais.saldo_total)}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>

                      {/* Emendas Parlamentares */}
                      <div className="space-y-2">
                        <div className="text-xs font-extrabold uppercase tracking-wider text-violet-900 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-200">
                          Emendas Parlamentares
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[820px] text-xs sm:text-sm">
                            <thead>
                              <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase">
                                <th className="py-2 px-3">Código</th>
                                <th className="py-2 px-3">Portaria / Parlamentar</th>
                                <th className="py-2 px-3 text-right">Crédito Custeio</th>
                                <th className="py-2 px-3 text-right">Crédito Capital</th>
                                <th className="py-2 px-3 text-right">Despesa Custeio</th>
                                <th className="py-2 px-3 text-right">Despesa Capital</th>
                                <th className="py-2 px-3 text-right bg-emerald-900/60">
                                  Saldo Custeio
                                </th>
                                <th className="py-2 px-3 text-right bg-emerald-900/60">
                                  Saldo Capital
                                </th>
                                <th className="py-2 px-3 text-right bg-emerald-950/80">
                                  Total Parlamentar
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {(dadosTriEscola.emendas?.linhas || []).length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={9}
                                    className="py-5 text-center text-slate-400"
                                  >
                                    Nenhuma Emenda Parlamentar vigente neste trimestre.
                                  </td>
                                </tr>
                              ) : (
                                dadosTriEscola.emendas.linhas.map((l) => (
                                  <tr key={l.portaria_id} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                      {l.numero_portaria}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="font-semibold text-slate-800">
                                        {l.titulo_portaria}
                                      </div>
                                      {l.deputado && (
                                        <div className="text-[11px] text-violet-700 font-semibold">
                                          Dep.: {l.deputado}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {formatBRL(l.credito_custeio)}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {formatBRL(l.credito_capital)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-rose-700">
                                      {formatBRL(l.despesa_custeio)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-rose-700">
                                      {formatBRL(l.despesa_capital)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold bg-emerald-50/50 text-emerald-900">
                                      {formatBRL(l.saldo_custeio)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold bg-emerald-50/50 text-emerald-900">
                                      {formatBRL(l.saldo_capital)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-extrabold bg-emerald-100/60 text-emerald-950">
                                      {formatBRL(l.saldo_total)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Quadro de Rendimentos do Trimestre */}
                      <div className="rounded-xl bg-amber-50/50 border border-amber-200 p-4 space-y-3">
                        <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                          Rendimentos de Aplicação Financeira ({trimestreSelecionado}º Trimestre)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                          <div className="bg-white rounded-lg p-2.5 border border-amber-200">
                            <span className="block text-[10px] font-bold uppercase text-slate-500">
                              {trimestreSelecionado === 1
                                ? `Reprogramado ${exercicio - 1}`
                                : `Saldo ${trimestreSelecionado - 1}º Tri`}
                            </span>
                            <strong className="text-sm text-slate-900">
                              {formatBRL(dadosTriEscola.rendimentos?.saldo_anterior || 0)}
                            </strong>
                          </div>
                          {(dadosTriEscola.rendimentos?.meses || []).map((m) => (
                            <div
                              key={m.mes}
                              className="bg-white rounded-lg p-2.5 border border-amber-200"
                            >
                              <span className="block text-[10px] font-bold uppercase text-slate-500">
                                Mês {m.label}
                              </span>
                              <strong className="text-sm text-slate-900">
                                {formatBRL(m.valor || 0)}
                              </strong>
                            </div>
                          ))}
                          <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-300">
                            <span className="block text-[10px] font-bold uppercase text-emerald-800">
                              Saldo Final Rend.
                            </span>
                            <strong className="text-sm text-emerald-950">
                              {formatBRL(dadosTriEscola.rendimentos?.saldo_final || 0)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── ABA 2: RELAÇÃO DE DESPESAS REALIZADAS ── */}
                  {abaAtiva === "despesas" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1020px] text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase">
                            <th className="py-2.5 px-3">Compra</th>
                            <th className="py-2.5 px-3">Data Pagto</th>
                            <th className="py-2.5 px-3">Doc. Fiscal</th>
                            <th className="py-2.5 px-3">Nº OS / 3 Orçamentos</th>
                            <th className="py-2.5 px-3">Fornecedor</th>
                            <th className="py-2.5 px-3">CNPJ / CPF</th>
                            <th className="py-2.5 px-3">Descrição Geral</th>
                            <th className="py-2.5 px-3">Fonte / Portaria</th>
                            <th className="py-2.5 px-3">Proc. Incorporação</th>
                            <th className="py-2.5 px-3 text-right">Custeio</th>
                            <th className="py-2.5 px-3 text-right">Capital</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(dadosTriEscola.despesas || []).length === 0 ? (
                            <tr>
                              <td
                                colSpan={11}
                                className="py-10 text-center text-slate-400"
                              >
                                Nenhuma despesa registrada pela escola neste trimestre.
                              </td>
                            </tr>
                          ) : (
                            dadosTriEscola.despesas.map((d) => (
                              <tr key={d.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  {d.compra}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {formatDataBR(d.data_pagamento)}
                                </td>
                                <td className="py-2.5 px-3">
                                  {d.documento_fiscal || "—"}
                                </td>
                                <td className="py-2.5 px-3">
                                  {d.ordem_servico_orcamentos || "—"}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {d.fornecedor}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-xs">
                                  {d.cnpj_cpf || "—"}
                                </td>
                                <td className="py-2.5 px-3">{d.descricao_geral}</td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-violet-50 text-violet-900 border border-violet-200 font-mono">
                                    {d.fonte_codigo}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-xs">
                                  {d.processo_incorporacao || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-blue-900">
                                  {Number(d.valor_custeio || 0) > 0
                                    ? formatBRL(d.valor_custeio)
                                    : "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-900">
                                  {Number(d.valor_capital || 0) > 0
                                    ? formatBRL(d.valor_capital)
                                    : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ── ABA 3: PARECER PRÉ-SEI DA UNIAG & PLANILHA OFICIAL (.XLSX) ── */}
                  {abaAtiva === "parecer" && (
                    <div className="max-w-4xl mx-auto space-y-5">
                      {/* Observações enviadas pela Escola */}
                      {dadosTriEscola.prestacao && (
                        <div className="rounded-xl bg-blue-50/60 border border-blue-200 p-4 text-xs sm:text-sm text-slate-800 space-y-1">
                          <div className="font-extrabold uppercase text-[11px] text-blue-900">
                            Remessa da Unidade Escolar
                          </div>
                          <div>
                            <strong>Enviado por:</strong>{" "}
                            {dadosTriEscola.prestacao.enviado_por || "—"}
                            {dadosTriEscola.prestacao.observacoes_escola && (
                              <>
                                {" "}
                                • <strong>Nota da Direção:</strong>{" "}
                                {dadosTriEscola.prestacao.observacoes_escola}
                              </>
                            )}
                          </div>
                          {dadosTriEscola.prestacao.analisado_por && (
                            <div className="text-xs text-slate-600">
                              Última análise UNIAG por:{" "}
                              <strong>{dadosTriEscola.prestacao.analisado_por}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verificador Automático de Conformidade Pré-SEI */}
                      {(dadosTriEscola.pendencias || []).length === 0 ? (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                          <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                          <div className="text-sm text-emerald-950 font-semibold">
                            Auditoria aritmética 100% consistente: todos os saldos de Portarias, Emendas, Rendimentos e CNPJ conferem sem divergências.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                            Apontamentos Automáticos do Motor Contábil
                          </div>
                          {dadosTriEscola.pendencias.map((p, idx) => (
                            <div
                              key={idx}
                              className={`rounded-xl p-3 text-xs sm:text-sm font-medium flex items-start gap-2.5 border ${
                                p.nivel === "ERRO"
                                  ? "bg-rose-50 text-rose-900 border-rose-200"
                                  : "bg-amber-50 text-amber-900 border-amber-200"
                              }`}
                            >
                              <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>
                                <strong>
                                  {p.nivel === "ERRO" ? "Erro Contábil:" : "Alerta Documental:"}
                                </strong>{" "}
                                {p.mensagem}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Campos de Despacho Pré-SEI da UNIAG */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Nº do Processo SEI de Prestação de Contas (Opcional)
                          </label>
                          <input
                            type="text"
                            value={processoSeiUniag}
                            onChange={(e) => setProcessoSeiUniag(e.target.value)}
                            placeholder="Ex.: 00080-00099999/2026-11"
                            className="w-full sm:w-96 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Parecer Técnico / Orientação da UNIAG para a Escola (Obrigatório em caso de Diligência)
                          </label>
                          <textarea
                            rows={3}
                            value={parecerUniag}
                            onChange={(e) => setParecerUniag(e.target.value)}
                            placeholder="Descreva eventuais pendências documentais (ex.: informar nº do processo de incorporação da Compra 04) ou registre o despacho de aprovação Pré-SEI..."
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Barra de Ações Oficiais da UNIAG + Download da Planilha 5 Abas */}
                      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          disabled={baixandoPlanilha}
                          onClick={handleBaixarPlanilhaEscola}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-violet-950 bg-violet-50 border border-violet-300 hover:bg-violet-100 disabled:opacity-50 transition cursor-pointer"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          {baixandoPlanilha
                            ? "Gerando .xlsx..."
                            : `Baixar Planilha Oficial SEI (${exercicio}).xlsx`}
                        </button>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            disabled={salvandoParecer}
                            onClick={() => handleRegistrarDecisaoUniag("EM_ANALISE")}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-indigo-900 bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
                          >
                            <ClockIcon className="w-4 h-4" />
                            Em Conferência
                          </button>

                          <button
                            type="button"
                            disabled={salvandoParecer}
                            onClick={() => handleRegistrarDecisaoUniag("EM_DILIGENCIA")}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-amber-950 bg-amber-100 border border-amber-300 hover:bg-amber-200 disabled:opacity-50 cursor-pointer"
                          >
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                            Devolver em Diligência
                          </button>

                          <button
                            type="button"
                            disabled={salvandoParecer}
                            onClick={() => handleRegistrarDecisaoUniag("VALIDADO_SEI")}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-md cursor-pointer"
                          >
                            <ShieldCheckIcon className="w-4 h-4" />
                            Validar p/ SEI!
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
