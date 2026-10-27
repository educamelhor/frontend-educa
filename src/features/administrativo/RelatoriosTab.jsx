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
  Square2StackIcon,
  XMarkIcon,
  CheckCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import {
  LIMITE_ABONOS_ANUAL,
  CATEGORIAS_SERVIDOR,
  formatarCPF,
} from "./useAdministrativoData";
import FolhaPontoOficialSEEDF from "./FolhaPontoOficialSEEDF";

const STORAGE_KEY_UNIDADE = "educa_admin_seedf_unidade_cfg_v1";

const ESTILOS_IMPRESSAO_SEEDF = `
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
    page-break-after: always !important;
    break-after: page !important;
  }
  .folha-seedf-wrapper:last-child .folha-seedf-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  .quadriculas-sigep-row {
    display: inline-flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
  }
`;

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

  // Estado do Modal e Motor de Impressão em Lote (Passo 13)
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [filtroVinculoLote, setFiltroVinculoLote] = useState("todos"); // "todos" | "efetivo" | "temporario" | "docentes" | "gestao_apoio"
  const [buscaLote, setBuscaLote] = useState("");
  const [idsSelecionadosLote, setIdsSelecionadosLote] = useState([]);
  const [renderizandoLoteDOM, setRenderizandoLoteDOM] = useState(false);

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

  useEffect(() => {
    const onCfgUpdated = (e) => {
      if (e?.detail) {
        setDadosUnidade((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener("educa:unidade-cfg-updated", onCfgUpdated);
    return () =>
      window.removeEventListener("educa:unidade-cfg-updated", onCfgUpdated);
  }, []);

  const folhaPrintRef = useRef(null);
  const lotePrintRef = useRef(null);
  const janelaLotePrintRef = useRef(null);

  // Lista ordenada alfabeticamente de servidores ativos para navegação e lote
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

  // Lista filtrada dentro do Modal de Impressão em Lote
  const servidoresVisiveisModalLote = useMemo(() => {
    return servidoresAtivos.filter((s) => {
      const vinc = String(s.vinculo || "").toLowerCase();
      const cat = String(s.categoria || "").toLowerCase();
      if (filtroVinculoLote === "efetivo" && vinc.includes("tempor")) {
        return false;
      }
      if (filtroVinculoLote === "temporario" && !vinc.includes("tempor")) {
        return false;
      }
      if (filtroVinculoLote === "docentes" && cat !== "docente") {
        return false;
      }
      if (filtroVinculoLote === "gestao_apoio" && cat === "docente") {
        return false;
      }
      if (!buscaLote.trim()) return true;
      const q = buscaLote.toLowerCase().trim();
      return (
        String(s.nome || "").toLowerCase().includes(q) ||
        String(s.cargo || "").toLowerCase().includes(q) ||
        String(s.matricula || "").toLowerCase().includes(q)
      );
    });
  }, [servidoresAtivos, filtroVinculoLote, buscaLote]);

  // Servidores efetivamente selecionados para compor o PDF em lote (em ordem alfabética)
  const servidoresSelecionadosParaLote = useMemo(() => {
    const setIds = new Set(idsSelecionadosLote);
    return servidoresAtivos.filter((s) => setIds.has(s.id));
  }, [servidoresAtivos, idsSelecionadosLote]);

  // Abre o Modal de Impressão em Lote já com todos os servidores ativos selecionados por padrão
  const handleAbrirModalImpressaoLote = () => {
    setFiltroVinculoLote("todos");
    setBuscaLote("");
    setIdsSelecionadosLote(servidoresAtivos.map((s) => s.id));
    setModalLoteAberto(true);
  };

  // Alterna um filtro rápido de lote e já ajusta a seleção para aquele grupo
  const handleAplicarFiltroRapidoLote = (novoFiltro) => {
    setFiltroVinculoLote(novoFiltro);
    const filtrados = servidoresAtivos.filter((s) => {
      const vinc = String(s.vinculo || "").toLowerCase();
      const cat = String(s.categoria || "").toLowerCase();
      if (novoFiltro === "efetivo") return !vinc.includes("tempor");
      if (novoFiltro === "temporario") return vinc.includes("tempor");
      if (novoFiltro === "docentes") return cat === "docente";
      if (novoFiltro === "gestao_apoio") return cat !== "docente";
      return true;
    });
    setIdsSelecionadosLote(filtrados.map((s) => s.id));
  };

  const handleToggleServidorLote = (id) => {
    setIdsSelecionadosLote((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMarcarVisiveisLote = () => {
    const idsVisiveis = servidoresVisiveisModalLote.map((s) => s.id);
    setIdsSelecionadosLote((prev) =>
      Array.from(new Set([...prev, ...idsVisiveis]))
    );
  };

  const handleDesmarcarVisiveisLote = () => {
    const setVisiveis = new Set(servidoresVisiveisModalLote.map((s) => s.id));
    setIdsSelecionadosLote((prev) => prev.filter((id) => !setVisiveis.has(id)));
  };

  // Motor de Impressão Individual / Renderização PDF A4 1:1 (Exatas 2 Páginas: Frente e Verso)
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
          <style>${ESTILOS_IMPRESSAO_SEEDF}</style>
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

  // Motor de Impressão em Lote (Renderiza todas as Folhas selecionadas no mês — 2 páginas A4 por servidor)
  const handleDispararImpressaoLote = () => {
    if (servidoresSelecionadosParaLote.length === 0) {
      toast.error("Selecione ao menos 1 servidor para gerar a impressão em lote.");
      return;
    }

    const printWin = window.open("", "_blank", "width=1024,height=900");
    if (!printWin) {
      toast.error(
        "Permita pop-ups no navegador para gerar o PDF / Impressão em Lote das Folhas de Frequência."
      );
      return;
    }

    // Exibe tela inicial de preparação na janela aberta sincronamente (evita bloqueador de pop-up)
    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Preparando Lote SEEDF - ${mesReferencia}</title>
          <style>
            body {
              margin: 0;
              height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, Helvetica, sans-serif;
              background: #f8fafc;
              color: #0f172a;
            }
            .box {
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 32px 40px;
              text-align: center;
              box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
            }
            .title {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .sub {
              font-size: 13px;
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="title">Gerando Lote de Folhas de Frequência SEEDF...</div>
            <div class="sub">Processando ${servidoresSelecionadosParaLote.length} servidor(es) (${servidoresSelecionadosParaLote.length * 2} páginas A4 — Frente e Verso). Aguarde um instante...</div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();

    janelaLotePrintRef.current = printWin;
    setRenderizandoLoteDOM(true);
  };

  // Assim que o container invisível de lote terminar de renderizar todas as folhas, injeta na janela de impressão
  useEffect(() => {
    if (!renderizandoLoteDOM) return;

    const timer = setTimeout(() => {
      const printWin = janelaLotePrintRef.current;
      if (!printWin || printWin.closed || !lotePrintRef.current) {
        setRenderizandoLoteDOM(false);
        return;
      }

      const conteudoLoteHTML = lotePrintRef.current.innerHTML;
      const tituloLoteDoc = `Lote_Folhas_Frequencia_SEEDF_${mesReferencia}_${servidoresSelecionadosParaLote.length}_Servidores`;

      printWin.document.open();
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <title>${tituloLoteDoc}</title>
            <style>${ESTILOS_IMPRESSAO_SEEDF}</style>
          </head>
          <body>
            ${conteudoLoteHTML}
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
                  }, 250);
                });
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();

      setRenderizandoLoteDOM(false);
      setModalLoteAberto(false);
      toast.success(
        `Lote gerado com sucesso: ${servidoresSelecionadosParaLote.length} folhas (${servidoresSelecionadosParaLote.length * 2} páginas A4)!`
      );
    }, 120);

    return () => clearTimeout(timer);
  }, [renderizandoLoteDOM, mesReferencia, servidoresSelecionadosParaLote]);

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
      {/* ── Barra Superior: Alternador de Visão + Botões Imprimir / Salvar PDF e Impressão em Lote ── */}
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

          <button
            type="button"
            onClick={handleAbrirModalImpressaoLote}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition"
            title="Imprimir ou gerar PDF em lote com todas as folhas de frequência do mês selecionado"
          >
            <Square2StackIcon className="h-4 w-4" />
            Impressão em Lote
            <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-black">
              {servidoresAtivos.length}
            </span>
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

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL PREMIUM DE IMPRESSÃO EM LOTE — FOLHAS DE PONTO OFICIAIS SEEDF
         ══════════════════════════════════════════════════════════════════════ */}
      {modalLoteAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/15 border border-white/20">
                  <Square2StackIcon className="h-6 w-6 text-indigo-100" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                    Impressão em Lote — Folhas de Frequência SEEDF
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Gere ou imprima de uma só vez todas as folhas de ponto (Frente e Verso A4) do mês de referência
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalLoteAberto(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Painel de Configuração do Lote e Filtros Rápidos */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                    Mês / Ano de Referência
                  </label>
                  <input
                    type="month"
                    value={mesReferencia}
                    onChange={(e) => setMesReferencia(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                    Modelo SEEDF no Lote
                  </label>
                  <select
                    value={modeloForcado}
                    onChange={(e) => setModeloForcado(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none"
                  >
                    <option value="auto">
                      ✨ Automático pelo Vínculo de cada Servidor
                    </option>
                    <option value="efetivo">
                      🏛️ Forçar Modelo Efetivo (Com Função)
                    </option>
                    <option value="efetivo_sem_funcao">
                      📘 Forçar Modelo Efetivo (Sem Função)
                    </option>
                    <option value="temporario">
                      📄 Forçar Modelo Contrato Temporário
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                    Preenchimento de Horários
                  </label>
                  <button
                    type="button"
                    onClick={() => setPreencherHorariosPonto((v) => !v)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-extrabold border transition flex items-center justify-center gap-1.5 ${
                      preencherHorariosPonto
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <ClockIcon className="h-4 w-4" />
                    {preencherHorariosPonto
                      ? "Horários Preenchidos"
                      : "Horários em Branco (Assinatura)"}
                  </button>
                </div>
              </div>

              {/* Pílulas de Seleção Rápida de Grupo */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-slate-500 mr-1">
                    Seleção Rápida:
                  </span>
                  {[
                    { id: "todos", label: `Todos os Ativos (${servidoresAtivos.length})` },
                    { id: "efetivo", label: "Apenas Efetivos" },
                    { id: "temporario", label: "Contrato Temporário" },
                    { id: "docentes", label: "Apenas Professores" },
                    { id: "gestao_apoio", label: "Direção / Secretaria / Apoio" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleAplicarFiltroRapidoLote(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        filtroVinculoLote === f.id
                          ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Busca + Marcar / Desmarcar Visíveis */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaLote}
                    onChange={(e) => setBuscaLote(e.target.value)}
                    placeholder="Buscar servidor por nome, cargo ou matrícula..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarcarVisiveisLote}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
                  >
                    Marcar Visíveis ({servidoresVisiveisModalLote.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDesmarcarVisiveisLote}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition"
                  >
                    Desmarcar Visíveis
                  </button>
                </div>
              </div>
            </div>

            {/* Lista Rolável de Servidores do Lote */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {servidoresVisiveisModalLote.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Nenhum servidor encontrado para o filtro selecionado.
                </div>
              ) : (
                servidoresVisiveisModalLote.map((srv, idx) => {
                  const selecionado = idsSelecionadosLote.includes(srv.id);
                  const isTemp = String(srv.vinculo || "")
                    .toLowerCase()
                    .includes("tempor");
                  const qtdOcorrenciasMes = ocorrencias.filter(
                    (o) =>
                      o.servidor_id === srv.id &&
                      o.status !== "cancelado" &&
                      (String(o.data_inicio || "").startsWith(mesReferencia) ||
                        String(o.data_fim || "").startsWith(mesReferencia))
                  ).length;

                  return (
                    <label
                      key={srv.id}
                      className={`flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl cursor-pointer transition ${
                        selecionado
                          ? "bg-indigo-50/70 hover:bg-indigo-50"
                          : "hover:bg-slate-50 opacity-75"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() => handleToggleServidorLote(srv.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400 w-6">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-800 truncate">
                            {srv.nome}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {srv.cargo} • C.H. {srv.carga_horaria || "40h"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {qtdOcorrenciasMes > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            {qtdOcorrenciasMes} ocorrência(s) no mês
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isTemp
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {isTemp ? "TEMPORÁRIO" : "EFETIVO"}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Rodapé Fixo com Resumo de Páginas e Botão de Disparo */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <UsersIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-800">
                    {servidoresSelecionadosParaLote.length} servidor(es) selecionado(s) para o lote
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Total a gerar:{" "}
                    <strong className="text-indigo-700">
                      {servidoresSelecionadosParaLote.length * 2} páginas A4
                    </strong>{" "}
                    (2 páginas Frente e Verso por servidor)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalLoteAberto(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    servidoresSelecionadosParaLote.length === 0 ||
                    renderizandoLoteDOM
                  }
                  onClick={handleDispararImpressaoLote}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition"
                >
                  <PrinterIcon className="h-4 w-4" />
                  {renderizandoLoteDOM
                    ? "Preparando Lote..."
                    : `Imprimir / Salvar PDF do Lote (${servidoresSelecionadosParaLote.length} Folhas)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Container Oculto de Renderização em Lote (Montado apenas no disparo da impressão em lote) */}
      {renderizandoLoteDOM && (
        <div
          ref={lotePrintRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            width: "210mm",
            pointerEvents: "none",
            opacity: 0,
          }}
        >
          {servidoresSelecionadosParaLote.map((srv, idx) => (
            <FolhaPontoOficialSEEDF
              key={srv.id}
              servidor={
                servidorEspelho && srv.id === servidorEspelho.id
                  ? {
                      ...srv,
                      matricula: matriculaEdit || srv.matricula,
                      funcao_gratificada:
                        funcaoEdit !== undefined
                          ? funcaoEdit
                          : srv.funcao_gratificada,
                    }
                  : srv
              }
              mesReferencia={mesReferencia}
              ocorrencias={ocorrencias}
              pontoDiario={pontoDiario}
              modeloForcado={modeloForcado}
              dadosUnidade={dadosUnidade}
              preencherHorariosPonto={preencherHorariosPonto}
              observacaoManual={observacaoManual}
              quebrarPaginaNoFinal={
                idx < servidoresSelecionadosParaLote.length - 1
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
