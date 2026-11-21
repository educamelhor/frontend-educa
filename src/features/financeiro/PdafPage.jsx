// src/features/financeiro/PdafPage.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo Financeiro > Prestação de Contas PDAF (Padrão CLEAN + MODULAR)
// Fluxo progressivo e intuitivo (espelhando Conselho de Classe):
//   Passo A: Selecionar o Exercício e clicar no Trimestre (1º, 2º, 3º ou 4º)
//   Passo B: Visualizar os 4 Saldos do Trimestre e escolher a etapa modular:
//            [1. Portarias & Emendas] [2. Rendimentos] [3. Despesas] [4. Envio UNIAG]
//   Passo C: Executar a ação limpa apenas da etapa selecionada
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeftIcon,
  BuildingLibraryIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import {
  formatBRL,
  formatDataBR,
  maskMoedaInput,
  numberToMoedaInput,
  parseMoedaInput,
} from "./financeiroUtils";
import ModalUexPdaf from "./ModalUexPdaf";
import ModalPortariaPdaf from "./ModalPortariaPdaf";
import ModalDespesaPdaf from "./ModalDespesaPdaf";

const STATUS_META = {
  EM_ELABORACAO: {
    label: "Em elaboração",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
  },
  ENVIADO_UNIAG: {
    label: "Enviado à UNIAG",
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
  },
  EM_ANALISE: {
    label: "Em análise UNIAG",
    dot: "bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  EM_DILIGENCIA: {
    label: "Em diligência (corrigir)",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
  },
  VALIDADO_SEI: {
    label: "Validado p/ SEI",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
};

const MODULOS_TRIMESTRE = [
  { key: "portarias", label: "1. Portarias & Emendas" },
  { key: "rendimentos", label: "2. Rendimentos" },
  { key: "despesas", label: "3. Despesas Realizadas" },
  { key: "envio", label: "4. Espelho & Envio UNIAG" },
];

export default function PdafPage() {
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
  const [trimestreSelecionado, setTrimestreSelecionado] = useState(null); // 1 | 2 | 3 | 4 | null
  const [etapaAtiva, setEtapaAtiva] = useState(null); // "portarias" | "rendimentos" | "despesas" | "envio" | null

  // Modais
  const [modalUexOpen, setModalUexOpen] = useState(false);
  const [modalPortaria, setModalPortaria] = useState({ aberto: false, item: null });
  const [modalDespesa, setModalDespesa] = useState({
    aberto: false,
    item: null,
    rateio: false,
  });

  // Estado local da etapa 2 (Rendimentos do Trimestre)
  const [rendBaseZeroStr, setRendBaseZeroStr] = useState("");
  const [rendMesesStr, setRendMesesStr] = useState({});
  const [salvandoRend, setSalvandoRend] = useState(false);

  // Estado local da etapa 4 (Envio Pré-SEI UNIAG)
  const [processoSeiPrestacao, setProcessoSeiPrestacao] = useState("");
  const [observacoesEscola, setObservacoesEscola] = useState("");
  const [enviandoUniag, setEnviandoUniag] = useState(false);
  const [baixandoPlanilha, setBaixandoPlanilha] = useState(false);

  const carregarPdaf = useCallback(
    async (ano = exercicio) => {
      setCarregando(true);
      try {
        const { data } = await api.get("/api/financeiro/pdaf", {
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
          err?.response?.data?.message || "Erro ao carregar dados do PDAF."
        );
      } finally {
        setCarregando(false);
      }
    },
    [exercicio]
  );

  useEffect(() => {
    carregarPdaf(exercicio);
  }, [exercicio, carregarPdaf]);

  const dadosTri = trimestreSelecionado
    ? dados?.trimestres?.[trimestreSelecionado] || null
    : null;

  // Hidrata inputs de rendimentos e SEI ao selecionar trimestre
  useEffect(() => {
    if (!dadosTri || !dados) return;
    setRendBaseZeroStr(numberToMoedaInput(dados.rendimentos_mensais?.[0] || 0));
    const mapM = {};
    for (const m of dadosTri.rendimentos?.meses || []) {
      mapM[m.mes] = numberToMoedaInput(m.valor || 0);
    }
    setRendMesesStr(mapM);
    setProcessoSeiPrestacao(dadosTri.prestacao?.processo_sei_prestacao || "");
    setObservacoesEscola(dadosTri.prestacao?.observacoes_escola || "");
  }, [trimestreSelecionado, dados, dadosTri]);

  const handleSelecionarTrimestre = (tri) => {
    setTrimestreSelecionado(tri);
    setEtapaAtiva(null);
  };

  async function handleSalvarRendimentos(e) {
    e.preventDefault();
    if (!dadosTri) return;
    setSalvandoRend(true);
    try {
      const itens = (dadosTri.rendimentos?.meses || []).map((m) => ({
        mes: m.mes,
        valor: parseMoedaInput(rendMesesStr[m.mes] || ""),
      }));
      if (trimestreSelecionado === 1) {
        itens.unshift({
          mes: 0,
          valor: parseMoedaInput(rendBaseZeroStr),
        });
      }
      await api.put("/api/financeiro/pdaf/rendimentos", {
        exercicio,
        itens,
      });
      toast.success("Rendimentos do trimestre salvos!");
      await carregarPdaf(exercicio);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar rendimentos.");
    } finally {
      setSalvandoRend(false);
    }
  }

  async function handleExcluirPortaria(portariaId, numero) {
    if (!window.confirm(`Deseja realmente excluir a Portaria ${numero}?`)) return;
    try {
      await api.delete(`/api/financeiro/pdaf/portarias/${portariaId}`);
      toast.success("Portaria excluída.");
      await carregarPdaf(exercicio);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao excluir portaria.");
    }
  }

  async function handleExcluirDespesa(desp) {
    if (
      !window.confirm(
        `Confirma excluir a compra ${desp.compra} (${desp.fornecedor})?`
      )
    )
      return;
    try {
      await api.delete(`/api/financeiro/pdaf/despesas/${desp.id}`);
      toast.success("Despesa removida.");
      await carregarPdaf(exercicio);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao excluir despesa.");
    }
  }

  async function handleEnviarUniag() {
    if (!trimestreSelecionado) return;
    setEnviandoUniag(true);
    try {
      const { data } = await api.post(
        `/api/financeiro/pdaf/trimestres/${trimestreSelecionado}/enviar`,
        {
          exercicio,
          processo_sei_prestacao: processoSeiPrestacao.trim() || null,
          observacoes_escola: observacoesEscola.trim() || null,
        }
      );
      toast.success(data?.message || "Trimestre enviado à UNIAG!");
      await carregarPdaf(exercicio);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Não foi possível enviar o trimestre para a UNIAG."
      );
    } finally {
      setEnviandoUniag(false);
    }
  }

  async function handleReabrirTrimestre() {
    if (!trimestreSelecionado) return;
    if (
      !window.confirm(
        `Deseja reabrir a edição do ${trimestreSelecionado}º Trimestre?`
      )
    )
      return;
    try {
      await api.post(
        `/api/financeiro/pdaf/trimestres/${trimestreSelecionado}/reabrir`,
        { exercicio }
      );
      toast.success("Trimestre reaberto para ajustes.");
      await carregarPdaf(exercicio);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao reabrir trimestre.");
    }
  }

  async function handleBaixarPlanilhaXlsx() {
    setBaixandoPlanilha(true);
    try {
      const response = await api.get("/api/financeiro/pdaf/exportar-xlsx", {
        params: { exercicio },
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `UEx_CONTROLE_DE_DESPESAS_${exercicio}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Planilha oficial (.xlsx) gerada com sucesso!");
    } catch (err) {
      toast.error("Erro ao baixar a planilha oficial do exercício.");
    } finally {
      setBaixandoPlanilha(false);
    }
  }

  const uex = dados?.uex || {};
  const portariasCadastradas = dados?.portarias || [];
  const bloqueado = Boolean(dadosTri?.bloqueado_edicao);
  const statusAtualMeta =
    STATUS_META[dadosTri?.status || "EM_ELABORACAO"] || STATUS_META.EM_ELABORACAO;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Barra Discreta de Navegação + Caixa Escolar (UEx) */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => navigate("/financeiro")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 shadow-xs transition cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Voltar
        </button>

        <button
          type="button"
          onClick={() => setModalUexOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-900 border border-blue-200 hover:bg-blue-50 shadow-xs transition cursor-pointer"
        >
          <BuildingLibraryIcon className="w-4 h-4 text-blue-700" />
          <span>{uex.cnpj ? `UEx: ${uex.cnpj}` : "Configurar Caixa Escolar (UEx)"}</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NÍVEL 1 (CLEAN): TÍTULO + EXERCÍCIO + 4 BOTÕES DE TRIMESTRE
         ══════════════════════════════════════════════════════════════════════ */}
      <h1
        className="text-4xl sm:text-5xl font-bold text-center text-blue-900 mb-5"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        PDAF — Prestação de Contas
      </h1>

      {/* Seletor Centralizado de Exercício */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
          <label
            htmlFor="filtro-exercicio-pdaf"
            className="text-sm font-semibold text-gray-700"
          >
            Exercício:
          </label>
          <select
            id="filtro-exercicio-pdaf"
            value={exercicio}
            onChange={(e) => {
              setExercicio(Number(e.target.value));
              setTrimestreSelecionado(null);
              setEtapaAtiva(null);
            }}
            className="border rounded px-2 py-1 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
          const infoTri = dados?.trimestres?.[tri];
          const st = infoTri?.status || "EM_ELABORACAO";
          const stMeta = STATUS_META[st] || STATUS_META.EM_ELABORACAO;
          const ativo = trimestreSelecionado === tri;

          return (
            <button
              key={tri}
              type="button"
              onClick={() => handleSelecionarTrimestre(tri)}
              className={`px-7 py-4 text-lg sm:text-xl font-semibold rounded-xl shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col items-center min-w-[175px] ${
                ativo
                  ? "bg-green-600 text-white"
                  : "bg-white text-blue-800 border border-blue-400 hover:bg-blue-100"
              }`}
            >
              <span>{tri}º Trimestre</span>
              <span
                className={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                  ativo ? "text-green-100" : "text-slate-500"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    ativo ? "bg-white" : stMeta.dot
                  }`}
                />
                {stMeta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NÍVEL 2 (MODULAR): SALDOS DO TRIMESTRE + 4 CHIPS DE ETAPAS
         ══════════════════════════════════════════════════════════════════════ */}
      {trimestreSelecionado && dadosTri && (
        <div className="space-y-7">
          {/* Alerta caso a UNIAG tenha devolvido em Diligência */}
          {dadosTri.status === "EM_DILIGENCIA" &&
            dadosTri.prestacao?.parecer_uniag && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                    Diligência Apontada pela UNIAG / CRE — Ajuste Solicitado
                  </div>
                  <p className="text-sm text-amber-950 mt-1 whitespace-pre-line">
                    {dadosTri.prestacao.parecer_uniag}
                  </p>
                </div>
              </div>
            )}

          {/* Faixa Enxuta dos 4 Saldos do Trimestre (Linha 6 da Planilha Oficial) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 max-w-5xl mx-auto">
            {[
              {
                titulo: "SALDO PDAF ORDINÁRIO",
                valor: dadosTri.saldos_topo?.ordinario,
                cor: "text-blue-900",
              },
              {
                titulo: "SALDO EMENDA PARLAMENTAR",
                valor: dadosTri.saldos_topo?.emenda,
                cor: "text-violet-900",
              },
              {
                titulo: "SALDO RENDIMENTO",
                valor: dadosTri.saldos_topo?.rendimento,
                cor: "text-amber-800",
              },
              {
                titulo: "SALDO TOTAL RECURSOS",
                valor: dadosTri.saldos_topo?.total_recursos,
                cor: "text-emerald-800",
                destaque: true,
              },
            ].map((c, idx) => (
              <div
                key={idx}
                className={`rounded-xl px-4 py-3 text-center shadow-sm border ${
                  c.destaque
                    ? "bg-emerald-50/90 border-emerald-300"
                    : "bg-white border-blue-200"
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  {c.titulo}
                </div>
                <div className={`text-lg font-extrabold mt-0.5 ${c.cor}`}>
                  {carregando ? "—" : formatBRL(c.valor || 0)}
                </div>
              </div>
            ))}
          </div>

          {/* 4 Chips Modulares das Etapas (Estilo idêntico às Turmas do Conselho de Classe) */}
          <div className="flex flex-wrap justify-center gap-4">
            {MODULOS_TRIMESTRE.map((mod) => {
              const selecionado = etapaAtiva === mod.key;
              let contador = "";
              if (mod.key === "portarias") {
                const n =
                  (dadosTri.ordinario?.linhas?.length || 0) +
                  (dadosTri.emendas?.linhas?.length || 0);
                contador = ` (${n})`;
              } else if (mod.key === "despesas") {
                contador = ` (${dadosTri.despesas?.length || 0})`;
              }

              return (
                <div
                  key={mod.key}
                  onClick={() => setEtapaAtiva(mod.key)}
                  className={`bg-gradient-to-b from-blue-200 to-blue-50 rounded-lg px-6 py-3 shadow-md cursor-pointer hover:shadow-xl transition-transform hover:scale-105 text-center font-bold text-blue-900 text-sm sm:text-base flex items-center justify-center whitespace-nowrap ${
                    selecionado ? "ring-2 ring-green-600" : ""
                  }`}
                >
                  {mod.label}
                  {contador}
                </div>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              NÍVEL 3: CONTEÚDO FOCADO APENAS DA ETAPA SELECIONADA
             ══════════════════════════════════════════════════════════════════ */}

          {/* ── ETAPA 1: PORTARIAS & EMENDAS ── */}
          {etapaAtiva === "portarias" && (
            <div className="bg-white rounded-xl shadow-md p-5 space-y-6 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-900">
                    Portarias Vigentes — {trimestreSelecionado}º Trimestre
                  </h2>
                  {!bloqueado && (
                    <button
                      type="button"
                      onClick={() =>
                        setModalPortaria({ aberto: true, item: null })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                    >
                      <PlusIcon className="w-4 h-4" />
                      NOVA PORTARIA / EMENDA
                    </button>
                  )}
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${statusAtualMeta.badge}`}
                >
                  {statusAtualMeta.label}
                </span>
              </div>

              {/* Bloco A: PDAF ORDINÁRIO */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  PDAF Ordinário
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[880px] text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase">
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Portaria</th>
                        <th className="py-2.5 px-3 text-right">Crédito Custeio</th>
                        <th className="py-2.5 px-3 text-right">Crédito Capital</th>
                        <th className="py-2.5 px-3 text-right">Despesa Custeio</th>
                        <th className="py-2.5 px-3 text-right">Despesa Capital</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-900/60">
                          Saldo Custeio
                        </th>
                        <th className="py-2.5 px-3 text-right bg-emerald-900/60">
                          Saldo Capital
                        </th>
                        <th className="py-2.5 px-3 text-right bg-emerald-950/80">
                          Total Ordinário
                        </th>
                        {!bloqueado && (
                          <th className="py-2.5 px-3 text-center">Ações</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(dadosTri.ordinario?.linhas || []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={bloqueado ? 9 : 10}
                            className="py-6 text-center text-slate-400"
                          >
                            Nenhuma Portaria de PDAF Ordinário vigente neste trimestre.
                          </td>
                        </tr>
                      ) : (
                        dadosTri.ordinario.linhas.map((l) => {
                          const cadOriginal = portariasCadastradas.find(
                            (p) => p.id === l.portaria_id
                          );
                          return (
                            <tr key={l.portaria_id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {l.numero_portaria}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">
                                  {l.titulo_portaria}
                                </div>
                                {l.origem_credito.startsWith("SALDO_TRI_") && (
                                  <span className="text-[10px] font-bold text-blue-700">
                                    ↩ Saldo transportado do {trimestreSelecionado - 1}º Trimestre
                                  </span>
                                )}
                                {l.origem_credito === "REPROGRAMADO_ANO_ANTERIOR" && (
                                  <span className="text-[10px] font-bold text-amber-700">
                                    ↩ Saldo reprogramado do exercício anterior
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {formatBRL(l.credito_custeio)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {formatBRL(l.credito_capital)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-700">
                                {formatBRL(l.despesa_custeio)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-700">
                                {formatBRL(l.despesa_capital)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/50 text-emerald-900">
                                {formatBRL(l.saldo_custeio)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/50 text-emerald-900">
                                {formatBRL(l.saldo_capital)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold bg-emerald-100/60 text-emerald-950">
                                {formatBRL(l.saldo_total)}
                              </td>
                              {!bloqueado && (
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModalPortaria({
                                        aberto: true,
                                        item: cadOriginal,
                                      })
                                    }
                                    className="p-1.5 text-slate-500 hover:text-blue-700 cursor-pointer"
                                    title="Editar Portaria"
                                  >
                                    <PencilSquareIcon className="w-4 h-4 inline" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleExcluirPortaria(
                                        l.portaria_id,
                                        l.numero_portaria
                                      )
                                    }
                                    className="p-1.5 text-slate-500 hover:text-rose-600 cursor-pointer"
                                    title="Excluir Portaria"
                                  >
                                    <TrashIcon className="w-4 h-4 inline" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {(dadosTri.ordinario?.linhas || []).length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                          <td colSpan={2} className="py-2.5 px-3 text-right">
                            TOTAL ORDINÁRIO:
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatBRL(dadosTri.ordinario.totais.credito_custeio)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatBRL(dadosTri.ordinario.totais.credito_capital)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatBRL(dadosTri.ordinario.totais.despesa_custeio)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatBRL(dadosTri.ordinario.totais.despesa_capital)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-900">
                            {formatBRL(dadosTri.ordinario.totais.saldo_custeio)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-900">
                            {formatBRL(dadosTri.ordinario.totais.saldo_capital)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-950">
                            {formatBRL(dadosTri.ordinario.totais.saldo_total)}
                          </td>
                          {!bloqueado && <td />}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Bloco B: EMENDAS PARLAMENTARES */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-violet-900 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-200">
                  Emendas Parlamentares
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[880px] text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase">
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Portaria / Parlamentar</th>
                        <th className="py-2.5 px-3 text-right">Crédito Custeio</th>
                        <th className="py-2.5 px-3 text-right">Crédito Capital</th>
                        <th className="py-2.5 px-3 text-right">Despesa Custeio</th>
                        <th className="py-2.5 px-3 text-right">Despesa Capital</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-900/60">
                          Saldo Custeio
                        </th>
                        <th className="py-2.5 px-3 text-right bg-emerald-900/60">
                          Saldo Capital
                        </th>
                        <th className="py-2.5 px-3 text-right bg-emerald-950/80">
                          Total Parlamentar
                        </th>
                        {!bloqueado && (
                          <th className="py-2.5 px-3 text-center">Ações</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(dadosTri.emendas?.linhas || []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={bloqueado ? 9 : 10}
                            className="py-6 text-center text-slate-400"
                          >
                            Nenhuma Emenda Parlamentar vigente neste trimestre.
                          </td>
                        </tr>
                      ) : (
                        dadosTri.emendas.linhas.map((l) => {
                          const cadOriginal = portariasCadastradas.find(
                            (p) => p.id === l.portaria_id
                          );
                          return (
                            <tr key={l.portaria_id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {l.numero_portaria}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">
                                  {l.titulo_portaria}
                                </div>
                                {l.deputado && (
                                  <div className="text-[11px] text-violet-700 font-semibold">
                                    Dep.: {l.deputado}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {formatBRL(l.credito_custeio)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {formatBRL(l.credito_capital)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-700">
                                {formatBRL(l.despesa_custeio)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-700">
                                {formatBRL(l.despesa_capital)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/50 text-emerald-900">
                                {formatBRL(l.saldo_custeio)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/50 text-emerald-900">
                                {formatBRL(l.saldo_capital)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold bg-emerald-100/60 text-emerald-950">
                                {formatBRL(l.saldo_total)}
                              </td>
                              {!bloqueado && (
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModalPortaria({
                                        aberto: true,
                                        item: cadOriginal,
                                      })
                                    }
                                    className="p-1.5 text-slate-500 hover:text-blue-700 cursor-pointer"
                                  >
                                    <PencilSquareIcon className="w-4 h-4 inline" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleExcluirPortaria(
                                        l.portaria_id,
                                        l.numero_portaria
                                      )
                                    }
                                    className="p-1.5 text-slate-500 hover:text-rose-600 cursor-pointer"
                                  >
                                    <TrashIcon className="w-4 h-4 inline" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {(dadosTri.emendas?.linhas || []).length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                          <td colSpan={2} className="py-2.5 px-3 text-right">
                            TOTAL PARLAMENTAR:
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatBRL(dadosTri.emendas.totais.credito_custeio)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatBRL(dadosTri.emendas.totais.credito_capital)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatBRL(dadosTri.emendas.totais.despesa_custeio)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatBRL(dadosTri.emendas.totais.despesa_capital)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-900">
                            {formatBRL(dadosTri.emendas.totais.saldo_custeio)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-900">
                            {formatBRL(dadosTri.emendas.totais.saldo_capital)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-950">
                            {formatBRL(dadosTri.emendas.totais.saldo_total)}
                          </td>
                          {!bloqueado && <td />}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ETAPA 2: RENDIMENTOS DO TRIMESTRE ── */}
          {etapaAtiva === "rendimentos" && (
            <div className="bg-white rounded-xl shadow-md p-5 max-w-3xl mx-auto space-y-5 border border-slate-200">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-900">
                Rendimentos de Aplicação — {trimestreSelecionado}º Trimestre
              </h2>

              <form onSubmit={handleSalvarRendimentos} className="space-y-4">
                {trimestreSelecionado === 1 ? (
                  <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold uppercase text-amber-900">
                        Saldo de Rendimentos Reprogramado ({exercicio - 1})
                      </div>
                      <p className="text-xs text-amber-800">
                        Valor acumulado de rendimentos vindo do exercício anterior
                      </p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={bloqueado}
                      value={rendBaseZeroStr}
                      onChange={(e) =>
                        setRendBaseZeroStr(maskMoedaInput(e.target.value))
                      }
                      placeholder="0,00"
                      className="w-full sm:w-44 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-extrabold text-right text-slate-900 disabled:bg-slate-100"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      ↩ Saldo de Rendimentos transportado do{" "}
                      {trimestreSelecionado - 1}º Trimestre:
                    </span>
                    <strong className="text-sm font-extrabold text-slate-900">
                      {formatBRL(dadosTri.rendimentos?.saldo_anterior || 0)}
                    </strong>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {(dadosTri.rendimentos?.meses || []).map((m) => (
                    <div
                      key={m.mes}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5"
                    >
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                        Rendimento {m.label} (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={bloqueado}
                        value={rendMesesStr[m.mes] ?? ""}
                        onChange={(e) =>
                          setRendMesesStr((prev) => ({
                            ...prev,
                            [m.mes]: maskMoedaInput(e.target.value),
                          }))
                        }
                        placeholder="0,00"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-right text-slate-900 disabled:bg-slate-100"
                      />
                    </div>
                  ))}
                </div>

                {/* Quadro Resumo de Rendimentos igual à Linha 24 do Excel */}
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Crédito Total
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatBRL(dadosTri.rendimentos?.credito_disponivel || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Despesa Custeio
                    </div>
                    <div className="text-sm font-bold text-rose-700">
                      {formatBRL(dadosTri.rendimentos?.despesa_custeio || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Despesa Capital
                    </div>
                    <div className="text-sm font-bold text-rose-700">
                      {formatBRL(dadosTri.rendimentos?.despesa_capital || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase text-emerald-800">
                      Saldo Rendimento
                    </div>
                    <div className="text-base font-extrabold text-emerald-900">
                      {formatBRL(dadosTri.rendimentos?.saldo_final || 0)}
                    </div>
                  </div>
                </div>

                {!bloqueado && (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={salvandoRend}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      {salvandoRend ? "Salvando..." : "Salvar Rendimentos"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ── ETAPA 3: RELAÇÃO DE DESPESAS REALIZADAS NO TRIMESTRE ── */}
          {etapaAtiva === "despesas" && (
            <div className="bg-white rounded-xl shadow-md p-5 space-y-4 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-900">
                    Despesas Realizadas — {trimestreSelecionado}º Trimestre
                  </h2>
                  {!bloqueado && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setModalDespesa({
                            aberto: true,
                            item: null,
                            rateio: false,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                      >
                        <PlusIcon className="w-4 h-4" />
                        NOVA DESPESA
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setModalDespesa({
                            aberto: true,
                            item: null,
                            rateio: true,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                      >
                        ⚡ COMPRA RATEADA (2+ PORTARIAS)
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1050px] text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase">
                      <th className="py-2.5 px-3">Compra</th>
                      <th className="py-2.5 px-3">Data Pagto</th>
                      <th className="py-2.5 px-3">Nº OS / 3 Orçamentos</th>
                      <th className="py-2.5 px-3">Fornecedor</th>
                      <th className="py-2.5 px-3">CNPJ / CPF</th>
                      <th className="py-2.5 px-3">Descrição Geral</th>
                      <th className="py-2.5 px-3">Fonte / Recurso</th>
                      <th className="py-2.5 px-3">Proc. Incorporação</th>
                      <th className="py-2.5 px-3 text-right">Custeio</th>
                      <th className="py-2.5 px-3 text-right">Capital</th>
                      {!bloqueado && (
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(dadosTri.despesas || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={bloqueado ? 10 : 11}
                          className="py-10 text-center text-slate-400"
                        >
                          Nenhuma despesa lançada no {trimestreSelecionado}º Trimestre.
                        </td>
                      </tr>
                    ) : (
                      dadosTri.despesas.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {d.compra}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {formatDataBR(d.data_pagamento)}
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
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 font-mono">
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
                          {!bloqueado && (
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  setModalDespesa({
                                    aberto: true,
                                    item: d,
                                    rateio: false,
                                  })
                                }
                                className="p-1.5 text-slate-500 hover:text-blue-700 cursor-pointer"
                              >
                                <PencilSquareIcon className="w-4 h-4 inline" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluirDespesa(d)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 cursor-pointer"
                              >
                                <TrashIcon className="w-4 h-4 inline" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ETAPA 4: ESPELHO PRÉ-SEI & ENVIO À UNIAG ── */}
          {etapaAtiva === "envio" && (
            <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl mx-auto space-y-5 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                    {uex.nome_uex} • CNPJ {uex.cnpj || "Não informado"}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-900">
                    Fechamento & Envio à UNIAG — {trimestreSelecionado}º Trimestre/{exercicio}
                  </h2>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusAtualMeta.badge}`}
                >
                  {bloqueado ? (
                    <LockClosedIcon className="w-3.5 h-3.5" />
                  ) : (
                    <LockOpenIcon className="w-3.5 h-3.5" />
                  )}
                  {statusAtualMeta.label}
                </span>
              </div>

              {/* Checklist Automático Pré-SEI */}
              {(dadosTri.pendencias || []).length === 0 ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div className="text-sm text-emerald-900 font-semibold">
                    Nenhuma inconsistência aritmética ou cadastral detectada neste trimestre. Pronto para conferência da UNIAG!
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Diagnóstico Automático de Conformidade Pré-SEI
                  </div>
                  {dadosTri.pendencias.map((p, idx) => (
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
                        <strong>{p.nivel === "ERRO" ? "Bloqueante:" : "Atenção:"}</strong>{" "}
                        {p.mensagem}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dados para envio à Regional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nº do Processo SEI (Opcional na Pré-Análise)
                  </label>
                  <input
                    type="text"
                    disabled={bloqueado}
                    value={processoSeiPrestacao}
                    onChange={(e) => setProcessoSeiPrestacao(e.target.value)}
                    placeholder="Ex.: 00080-00099999/2026-11"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observações à UNIAG (Opcional)
                  </label>
                  <input
                    type="text"
                    disabled={bloqueado}
                    value={observacoesEscola}
                    onChange={(e) => setObservacoesEscola(e.target.value)}
                    placeholder="Notas complementares da direção/caixa escolar"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={baixandoPlanilha}
                  onClick={handleBaixarPlanilhaXlsx}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-blue-900 bg-blue-50 border border-blue-300 hover:bg-blue-100 disabled:opacity-50 transition cursor-pointer"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  {baixandoPlanilha
                    ? "Gerando Excel..."
                    : `Baixar Planilha Oficial SEI (${exercicio}).xlsx`}
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  {dadosTri.status === "ENVIADO_UNIAG" && (
                    <button
                      type="button"
                      onClick={handleReabrirTrimestre}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    >
                      Retomar Edição
                    </button>
                  )}

                  {!bloqueado && (
                    <button
                      type="button"
                      disabled={!dadosTri.pronto_envio_uniag || enviandoUniag}
                      onClick={handleEnviarUniag}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-md cursor-pointer"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      {enviandoUniag
                        ? "Enviando à UNIAG..."
                        : `Enviar ${trimestreSelecionado}º Trimestre para Pré-Análise UNIAG`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modais Auxiliares */}
      <ModalUexPdaf
        aberto={modalUexOpen}
        onFechar={() => setModalUexOpen(false)}
        uex={uex}
        onSalvo={() => carregarPdaf(exercicio)}
      />

      <ModalPortariaPdaf
        aberto={modalPortaria.aberto}
        onFechar={() => setModalPortaria({ aberto: false, item: null })}
        exercicio={exercicio}
        trimestreSugerido={trimestreSelecionado || 1}
        portariaEdicao={modalPortaria.item}
        onSalvo={() => carregarPdaf(exercicio)}
      />

      <ModalDespesaPdaf
        aberto={modalDespesa.aberto}
        onFechar={() =>
          setModalDespesa({ aberto: false, item: null, rateio: false })
        }
        exercicio={exercicio}
        trimestre={trimestreSelecionado || 1}
        dadosTrimestre={dadosTri}
        despesaEdicao={modalDespesa.item}
        despesasExistentes={dados?.despesas || []}
        modoRateioInicial={modalDespesa.rateio}
        onSalvo={() => carregarPdaf(exercicio)}
      />
    </div>
  );
}
