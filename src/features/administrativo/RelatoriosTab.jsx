// src/features/administrativo/RelatoriosTab.jsx
// ============================================================================
// Aba 4: ESPELHO & RELATÓRIOS — FOLHA DE FREQUÊNCIA OFICIAL SEEDF (SIGEP)
// - Clone 1:1 dos 3 PDFs oficiais da SEEDF:
//   a) EmitirFolha.pdf (Servidor Efetivo com Função Gratificada)
//   b) EmitirFolha_sem_função.pdf (Servidor Efetivo sem Função)
//   c) EmitirFolha_contrato.pdf (Contrato Temporário)
// - Interação direta com os lançamentos de cada servidor no mês (Abonos, Atestados,
//   Licenças, Afastamentos, Faltas, Férias, Ponto Facultativo, Recesso, Acordos).
// - Clique em qualquer dia (01 a 31) da folha para lançar ou editar ocorrência.
// - Motor de Impressão / Salvar PDF A4 dedicado (Frente e Verso sem bordas do navegador).
// ============================================================================

import React, { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  PrinterIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  ClockIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import {
  LIMITE_ABONOS_ANUAL,
  CATEGORIAS_SERVIDOR,
  formatarCPF,
} from "./useAdministrativoData";
import FolhaPontoOficialSEEDF from "./FolhaPontoOficialSEEDF";

const STORAGE_KEY_UNIDADE = "educa_admin_seedf_unidade_cfg_v1";

export default function RelatoriosTab({
  servidores = [],
  ocorrencias = [],
  pontoDiario = {},
  statsPorServidor = {},
  onAbrirModalOcorrencia,
  onAbrirModalEditarOcorrencia,
  onSalvarServidor,
}) {
  const [modoRelatorio, setModoRelatorio] = useState("espelho"); // "espelho" | "matriz"
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  // Estado do Espelho / Folha de Ponto Oficial SEEDF
  const [servidorEspelhoId, setServidorEspelhoId] = useState(
    servidores[0]?.id || ""
  );
  const [mesReferencia, setMesReferencia] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [modeloForcado, setModeloForcado] = useState("auto"); // "auto" | "efetivo" | "efetivo_sem_funcao" | "temporario"
  const [preencherHorariosPonto, setPreencherHorariosPonto] = useState(false);
  const [mostrarConfigCabecalho, setMostrarConfigCabecalho] = useState(false);
  const [observacaoManual, setObservacaoManual] = useState("");

  // Configuração institucional da Unidade Escolar (UA / CRE / Código SIGEP)
  const [dadosUnidade, setDadosUnidade] = useState(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_UNIDADE);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (
          parsed.nomeEscola === "CEF04-CCMDF" ||
          parsed.nomeEscola === "CEF 04" ||
          !parsed.nomeEscola
        ) {
          parsed.nomeEscola =
            "CENTRO DE ENSINO FUNDAMENTAL 04 DE PLANALTINA - COLEGIO CM";
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    const rawNome = (
      localStorage.getItem("nome_escola") ||
      localStorage.getItem("escola_nome") ||
      ""
    )
      .trim()
      .toUpperCase();
    const nomeEsc =
      !rawNome || rawNome === "CEF04-CCMDF" || rawNome.length < 18
        ? "CENTRO DE ENSINO FUNDAMENTAL 04 DE PLANALTINA - COLEGIO CM"
        : rawNome;
    return {
      ua: "007",
      cre: "COORDENAÇÃO REGIONAL DE ENSINO DE PLANALTINA",
      codigoExercicio: "990230000043",
      nomeEscola: nomeEsc,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_UNIDADE, JSON.stringify(dadosUnidade));
    } catch {
      // ignore
    }
  }, [dadosUnidade]);

  const folhaPrintRef = useRef(null);

  // Lista ordenada alfabeticamente de servidores ativos para navegação
  const servidoresAtivos = useMemo(() => {
    return [...servidores]
      .filter((s) => s.ativo !== false)
      .sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
          sensitivity: "base",
        })
      );
  }, [servidores]);

  const servidorEspelho = useMemo(
    () =>
      servidores.find((s) => s.id === servidorEspelhoId) ||
      servidoresAtivos[0] ||
      servidores[0] ||
      null,
    [servidores, servidoresAtivos, servidorEspelhoId]
  );

  // Campos editáveis rápidos do servidor selecionado (Matrícula SIGEP e Função Gratificada)
  const [matriculaEdit, setMatriculaEdit] = useState("");
  const [funcaoEdit, setFuncaoEdit] = useState("");

  useEffect(() => {
    if (!servidorEspelho) return;
    setMatriculaEdit(servidorEspelho.matricula || "");
    setFuncaoEdit(servidorEspelho.funcao_gratificada || "");
  }, [servidorEspelho]);

  const indiceServidorAtual = useMemo(() => {
    if (!servidorEspelho) return -1;
    return servidoresAtivos.findIndex((s) => s.id === servidorEspelho.id);
  }, [servidoresAtivos, servidorEspelho]);

  const irServidorAnterior = () => {
    if (servidoresAtivos.length === 0) return;
    const prevIdx =
      indiceServidorAtual > 0
        ? indiceServidorAtual - 1
        : servidoresAtivos.length - 1;
    setServidorEspelhoId(servidoresAtivos[prevIdx].id);
  };

  const irProximoServidor = () => {
    if (servidoresAtivos.length === 0) return;
    const nextIdx =
      indiceServidorAtual < servidoresAtivos.length - 1
        ? indiceServidorAtual + 1
        : 0;
    setServidorEspelhoId(servidoresAtivos[nextIdx].id);
  };

  const servidoresFiltrados = useMemo(() => {
    return servidoresAtivos.filter((s) => {
      if (filtroCategoria !== "todos" && s.categoria !== filtroCategoria)
        return false;
      if (!busca.trim()) return true;
      const q = busca.toLowerCase().trim();
      return (
        (s.nome || "").toLowerCase().includes(q) ||
        (s.cargo || "").toLowerCase().includes(q) ||
        (s.cpf || "").includes(q)
      );
    });
  }, [servidoresAtivos, filtroCategoria, busca]);

  // Motor de Impressão / Renderização PDF A4 1:1 (Exatas 2 Páginas: Frente e Verso)
  const handleImprimirFolhaOficial = () => {
    if (modoRelatorio === "matriz") {
      window.print();
      return;
    }

    if (!folhaPrintRef.current || !servidorEspelho) {
      window.print();
      return;
    }

    const conteudoHTML = folhaPrintRef.current.innerHTML;
    const tituloDoc = `Folha_Frequencia_SEEDF_${String(
      servidorEspelho.nome || "Servidor"
    )
      .replace(/\s+/g, "_")
      .toUpperCase()}_${mesReferencia}`;

    const printWin = window.open("", "_blank", "width=1024,height=900");
    if (!printWin) {
      toast.error(
        "Permita pop-ups no navegador para gerar a impressão oficial da Folha de Frequência."
      );
      window.print();
      return;
    }

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>${tituloDoc}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: Arial, Helvetica, sans-serif;
              color: #000000;
            }
            .folha-seedf-wrapper {
              margin: 0 !important;
              padding: 0 !important;
            }
            .folha-seedf-page {
              width: 210mm !important;
              height: 296mm !important;
              max-height: 296mm !important;
              padding: 7mm 9mm !important;
              margin: 0 auto !important;
              background: #ffffff !important;
              box-shadow: none !important;
              overflow: hidden !important;
              page-break-after: always;
              break-after: page;
            }
            .folha-seedf-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .quadriculas-sigep-row {
              display: inline-flex !important;
              flex-direction: row !important;
              flex-wrap: nowrap !important;
              align-items: center !important;
            }
          </style>
        </head>
        <body>
          ${conteudoHTML}
          <script>
            window.onload = function() {
              var imgs = Array.prototype.slice.call(document.images || []);
              var promises = imgs.map(function(img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function(resolve) {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              });
              Promise.all(promises).then(function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 200);
              });
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Clique interativo em um dia da Folha de Frequência
  const handleClicarDiaFolha = (dataISO, occExistente) => {
    if (!servidorEspelho) return;
    if (occExistente && onAbrirModalEditarOcorrencia) {
      onAbrirModalEditarOcorrencia(occExistente);
    } else if (onAbrirModalOcorrencia) {
      onAbrirModalOcorrencia(servidorEspelho, "abono", dataISO);
    }
  };

  const handleSalvarDadosRapidosServidor = () => {
    if (!servidorEspelho || !onSalvarServidor) return;
    onSalvarServidor({
      ...servidorEspelho,
      matricula: matriculaEdit.trim(),
      funcao_gratificada: funcaoEdit.trim(),
    });
    toast.success("Matrícula e Função do servidor atualizadas na Folha de Ponto!");
  };

  // Identifica qual modelo está ativo para exibir na badge informativa
  const isTemporarioAtivo =
    modeloForcado === "temporario" ||
    (modeloForcado === "auto" &&
      String(servidorEspelho?.vinculo || "")
        .toLowerCase()
        .includes("tempor"));

  return (
    <div className="space-y-5">
      {/* ── Barra Superior: Alternador de Visão + Botão Oficial Imprimir / Salvar PDF ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModoRelatorio("espelho")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              modoRelatorio === "espelho"
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <DocumentTextIcon className="h-4 w-4" />
            Espelho Individual / Folha de Ponto SEEDF
          </button>

          <button
            type="button"
            onClick={() => setModoRelatorio("matriz")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              modoRelatorio === "matriz"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ChartBarIcon className="h-4 w-4" />
            Matriz Geral de Saldo de Abonos & Assiduidade
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {modoRelatorio === "espelho" && servidorEspelho && onAbrirModalOcorrencia && (
            <button
              type="button"
              onClick={() =>
                onAbrirModalOcorrencia(
                  servidorEspelho,
                  "abono",
                  `${mesReferencia}-01`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-extrabold transition"
            >
              <PlusIcon className="h-4 w-4" />
              Lançar na Folha deste Servidor
            </button>
          )}

          <button
            type="button"
            onClick={handleImprimirFolhaOficial}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition"
          >
            <PrinterIcon className="h-4 w-4" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VISÃO 1: FOLHA DE FREQUÊNCIA OFICIAL SEEDF (CLONE 1:1 FRENTE E VERSO)
         ══════════════════════════════════════════════════════════════════════ */}
      {modoRelatorio === "espelho" && servidorEspelho && (
        <div className="space-y-4">
          {/* Painel de Seleção e Controles da Folha de Frequência SEEDF */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-4 print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              {/* Seletor de Servidor com Navegação Rápida Anterior / Próximo */}
              <div className="lg:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Selecionar Servidor / Colaborador
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {indiceServidorAtual + 1} de {servidoresAtivos.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={irServidorAnterior}
                    title="Servidor anterior"
                    className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <select
                    value={servidorEspelho.id}
                    onChange={(e) => setServidorEspelhoId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:border-blue-500 outline-none"
                  >
                    {servidoresAtivos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} — {s.cargo} (
                        {String(s.vinculo || "Efetivo").toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={irProximoServidor}
                    title="Próximo servidor"
                    className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mês / Ano de Referência */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Mês / Ano de Referência
                </label>
                <input
                  type="month"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Seletor de Modelo Oficial SEEDF */}
              <div className="lg:col-span-4">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Modelo Oficial SEEDF (SIGEP)
                </label>
                <select
                  value={modeloForcado}
                  onChange={(e) => setModeloForcado(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 focus:border-blue-500 outline-none"
                >
                  <option value="auto">
                    ✨ Automático pelo Vínculo ({isTemporarioAtivo ? "Contrato Temporário" : "Servidor Efetivo"})
                  </option>
                  <option value="efetivo">
                    🏛️ Efetivo — Com Função (EmitirFolha.pdf)
                  </option>
                  <option value="efetivo_sem_funcao">
                    📘 Efetivo — Sem Função (EmitirFolha_sem_função.pdf)
                  </option>
                  <option value="temporario">
                    📄 Contrato Temporário (EmitirFolha_contrato.pdf)
                  </option>
                </select>
              </div>
            </div>

            {/* Faixa de Status Rápido + Botões de Personalização da Folha */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                    isTemporarioAtivo
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  <CheckBadgeIcon className="h-4 w-4" />
                  {isTemporarioAtivo
                    ? "Modelo Ativo: CONTRATO TEMPORÁRIO (2 Páginas A4)"
                    : "Modelo Ativo: SERVIDOR EFETIVO SEEDF (2 Páginas A4)"}
                </span>

                {(() => {
                  const st = statsPorServidor[servidorEspelho.id] || {
                    abonosUsados: 0,
                    diasAtestado: 0,
                    totalAusencias: 0,
                  };
                  return (
                    <>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                        Abonos Art. 151 no Ano: {st.abonosUsados}/{LIMITE_ABONOS_ANUAL}
                      </span>
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        💡 Dica: Clique em qualquer dia (01 a 31) na folha abaixo para lançar ou editar uma ocorrência diretamente naquele dia.
                      </span>
                    </>
                  );
                })()}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreencherHorariosPonto((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    preencherHorariosPonto
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                  title="Quando desativado, deixa os campos de Entrada e Saída em branco para assinatura física do servidor."
                >
                  <ClockIcon className="h-4 w-4" />
                  {preencherHorariosPonto
                    ? "Horários Diários: Preenchidos"
                    : "Horários em Branco (Assinatura Manual)"}
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarConfigCabecalho((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    mostrarConfigCabecalho
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Ajustar Cabeçalho / Matrícula / Observações
                </button>
              </div>
            </div>

            {/* Painel Retrátil de Ajuste Fino do Cabeçalho SEEDF e Dados Funcionais */}
            {mostrarConfigCabecalho && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Configuração dos Campos Oficiais da Folha de Frequência SEEDF
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Código UA (Regional)
                    </label>
                    <input
                      type="text"
                      value={dadosUnidade.ua}
                      onChange={(e) =>
                        setDadosUnidade((p) => ({ ...p, ua: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Coordenação Regional de Ensino (CRE)
                    </label>
                    <input
                      type="text"
                      value={dadosUnidade.cre}
                      onChange={(e) =>
                        setDadosUnidade((p) => ({ ...p, cre: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Código do Estabelecimento (Exercício)
                    </label>
                    <input
                      type="text"
                      value={dadosUnidade.codigoExercicio}
                      onChange={(e) =>
                        setDadosUnidade((p) => ({
                          ...p,
                          codigoExercicio: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nome Oficial da Unidade Escolar
                    </label>
                    <input
                      type="text"
                      value={dadosUnidade.nomeEscola}
                      onChange={(e) =>
                        setDadosUnidade((p) => ({
                          ...p,
                          nomeEscola: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Matrícula / Inscrição SIGEP do Servidor
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 0027596-4 ou 7062701-0"
                      value={matriculaEdit}
                      onChange={(e) => setMatriculaEdit(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Função Gratificada (Deixe vazio se sem função)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: DIRETOR FGE-06"
                      value={funcaoEdit}
                      onChange={(e) => setFuncaoEdit(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleSalvarDadosRapidosServidor}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                      Salvar Matrícula / Função no Cadastro
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Observação Adicional no Quadro &ldquo;Observações:&rdquo; da Folha (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Texto complementar para constar no quadro de Observações da folha..."
                    value={observacaoManual}
                    onChange={(e) => setObservacaoManual(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── PREVIEW OFICIAL A4 (FRENTE E VERSO) CLONADO DO PDF SEEDF ── */}
          <div className="bg-slate-200/80 rounded-2xl p-4 sm:p-8 border border-slate-300 overflow-x-auto">
            <div ref={folhaPrintRef}>
              <FolhaPontoOficialSEEDF
                servidor={{
                  ...servidorEspelho,
                  matricula: matriculaEdit || servidorEspelho.matricula,
                  funcao_gratificada:
                    funcaoEdit !== undefined
                      ? funcaoEdit
                      : servidorEspelho.funcao_gratificada,
                }}
                mesReferencia={mesReferencia}
                ocorrencias={ocorrencias}
                pontoDiario={pontoDiario}
                modeloForcado={modeloForcado}
                dadosUnidade={dadosUnidade}
                preencherHorariosPonto={preencherHorariosPonto}
                observacaoManual={observacaoManual}
                onClicarDia={handleClicarDiaFolha}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VISÃO 2: MATRIZ CONSOLIDADA DE SALDO DE ABONOS E ASSIDUIDADE
         ══════════════════════════════════════════════════════════════════════ */}
      {modoRelatorio === "matriz" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar servidor na matriz anual..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="todos">📂 Todas as Categorias</option>
              {CATEGORIAS_SERVIDOR.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3.5 px-4">Servidor / Cargo</th>
                  <th className="py-3.5 px-4">Vínculo & Acesso</th>
                  <th className="py-3.5 px-4">Cota Anual de Abonos (5/Ano)</th>
                  <th className="py-3.5 px-4 text-center">Saldo Disponível</th>
                  <th className="py-3.5 px-4 text-center">Dias de Atestado</th>
                  <th className="py-3.5 px-4 text-center">Ausências</th>
                  <th className="py-3.5 px-4 text-center">Acordos Pendentes</th>
                  <th className="py-3.5 px-4 text-right print:hidden">
                    Folha SEEDF
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {servidoresFiltrados.map((srv) => {
                  const st = statsPorServidor[srv.id] || {
                    abonosUsados: 0,
                    abonosRestantes: LIMITE_ABONOS_ANUAL,
                    diasAtestado: 0,
                    totalAusencias: 0,
                    negociacoesPendentes: 0,
                  };
                  return (
                    <tr key={srv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-xs">
                          {srv.nome}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {srv.cargo} • CPF: {formatarCPF(srv.cpf)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-slate-700 capitalize">
                          {srv.vinculo} ({srv.carga_horaria})
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {srv.acesso_sistema ? "Com Acesso" : "Registro Interno"}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const usado = num <= st.abonosUsados;
                            return (
                              <span
                                key={num}
                                className={`h-6 w-6 rounded-lg text-[11px] font-extrabold flex items-center justify-center border ${
                                  usado
                                    ? "bg-amber-500 text-white border-amber-600"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                                title={
                                  usado
                                    ? `${num}º Abono já utilizado`
                                    : `${num}º Abono disponível`
                                }
                              >
                                {num}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            st.abonosRestantes === 0
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {st.abonosRestantes} restante(s)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-blue-700 text-xs">
                        {st.diasAtestado > 0 ? `${st.diasAtestado} dia(s)` : "0"}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-red-600 text-xs">
                        {st.totalAusencias > 0 ? st.totalAusencias : "0"}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {st.negociacoesPendentes > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                            {st.negociacoesPendentes} pendente(s)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Em dia</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right print:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setServidorEspelhoId(srv.id);
                            setModoRelatorio("espelho");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition"
                        >
                          Abrir Folha SEEDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
