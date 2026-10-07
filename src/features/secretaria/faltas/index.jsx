// src/features/secretaria/faltas/index.jsx
// ============================================================================
// Submódulo FALTAS — Secretaria
// Filtros interativos por Turno e Turmas (Badges)
// Tabela consolidada com faltas bimestrais e total por estudante
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import {
  CalendarDaysIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  XMarkIcon,
  InformationCircleIcon,
  CheckIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";

// Helper: ano letivo padrão (corte 31/jan)
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// Configuração visual dos turnos
const TURNOS_CONFIG = {
  todos: { label: "Todos os Turnos", emoji: "🏫", border: "border-slate-200", active: "bg-slate-800 text-white border-slate-800 shadow-md" },
  matutino: { label: "Matutino", emoji: "☀️", border: "border-amber-200", active: "bg-amber-600 text-white border-amber-600 shadow-md" },
  vespertino: { label: "Vespertino", emoji: "🌤️", border: "border-blue-200", active: "bg-blue-600 text-white border-blue-600 shadow-md" },
  noturno: { label: "Noturno", emoji: "🌙", border: "border-indigo-200", active: "bg-indigo-600 text-white border-indigo-600 shadow-md" },
  integral: { label: "Integral", emoji: "⏳", border: "border-emerald-200", active: "bg-emerald-600 text-white border-emerald-600 shadow-md" },
};

// Helper para iniciais e paleta de cores para avatar do aluno
function getInitialsColor(name) {
  const words = String(name || "").trim().split(" ");
  const initials = ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase();
  const code = (initials.charCodeAt(0) || 0) + (initials.charCodeAt(1) || 0);
  const palettes = [
    { bg: "bg-pink-100 text-pink-700 border-pink-200" },
    { bg: "bg-sky-100 text-sky-700 border-sky-200" },
    { bg: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    { bg: "bg-purple-100 text-purple-700 border-purple-200" },
    { bg: "bg-amber-100 text-amber-700 border-amber-200" },
    { bg: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  ];
  return { initials, style: palettes[code % palettes.length].bg };
}

// Helper para formatar tamanho de arquivos
function formatarTamanho(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function FaltasPage() {
  // ── Filtros ──
  const [anosLetivos, setAnosLetivos] = useState([anoLetivoPadrao()]);
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());
  const [turnoSelecionado, setTurnoSelecionado] = useState("todos");
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [buscaAluno, setBuscaAluno] = useState("");

  // ── Dados das turmas ──
  const [todasTurmas, setTodasTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(true);

  // ── Dados das faltas da turma ──
  const [loadingFaltas, setLoadingFaltas] = useState(false);
  const [estudantes, setEstudantes] = useState([]);
  const [turmaInfo, setTurmaInfo] = useState(null);
  const [erro, setErro] = useState(null);

  // ── Aluno expandido para ver disciplinas ──
  const [alunoExpandido, setAlunoExpandido] = useState(null);

  // ── Modal de Importação (EDUCADF) ──
  const [showModalImportar, setShowModalImportar] = useState(false);
  const [arquivosImportacao, setArquivosImportacao] = useState([]);
  const [bimestreImportacao, setBimestreImportacao] = useState(1);
  const [anoImportacao, setAnoImportacao] = useState(anoLetivoPadrao());
  const [isDragging, setIsDragging] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingGravacao, setLoadingGravacao] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [erroImportacao, setErroImportacao] = useState(null);
  const [mostrarLogs, setMostrarLogs] = useState(false);
  const [mostrarNaoMapeados, setMostrarNaoMapeados] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // 1. Carrega turmas da escola
  useEffect(() => {
    async function carregarTurmas() {
      setLoadingTurmas(true);
      try {
        const [resTurmas, resAnos] = await Promise.all([
          api.get("/api/turmas"),
          api.get("/api/secretaria/relatorios/anos-letivos").catch(() => ({ data: [anoLetivoPadrao()] })),
        ]);

        const turmasList = Array.isArray(resTurmas.data) ? resTurmas.data : [];
        setTodasTurmas(turmasList);

        if (Array.isArray(resAnos.data) && resAnos.data.length > 0) {
          setAnosLetivos(resAnos.data);
        }
      } catch (err) {
        console.error("Erro ao carregar turmas:", err);
      } finally {
        setLoadingTurmas(false);
      }
    }
    carregarTurmas();
  }, []);

  // 2. Turmas filtradas pelo ano selecionado
  const turmasDoAno = useMemo(() => {
    return todasTurmas.filter((t) => Number(t.ano) === Number(anoLetivo));
  }, [todasTurmas, anoLetivo]);

  // Contagem de turmas por turno
  const contagemTurnos = useMemo(() => {
    const counts = { todos: turmasDoAno.length, matutino: 0, vespertino: 0, noturno: 0, integral: 0 };
    for (const t of turmasDoAno) {
      const turn = String(t.turno || "").toLowerCase().trim();
      if (counts[turn] !== undefined) counts[turn]++;
    }
    return counts;
  }, [turmasDoAno]);

  // Turmas filtradas por turno e ordenadas
  const turmasExibidas = useMemo(() => {
    let filtradas = turmasDoAno;
    if (turnoSelecionado !== "todos") {
      filtradas = turmasDoAno.filter(
        (t) => String(t.turno || "").toLowerCase().trim() === turnoSelecionado
      );
    }
    return filtradas.sort((a, b) => (a.turma || a.nome || "").localeCompare(b.turma || b.nome || "", "pt-BR"));
  }, [turmasDoAno, turnoSelecionado]);

  // Seleciona automaticamente a primeira turma caso nenhuma esteja selecionada
  useEffect(() => {
    if (turmasExibidas.length > 0) {
      const aindaExiste = turmasExibidas.some((t) => t.id === turmaSelecionada?.id);
      if (!aindaExiste) {
        setTurmaSelecionada(turmasExibidas[0]);
      }
    } else {
      setTurmaSelecionada(null);
    }
  }, [turmasExibidas]);

  // 3. Carrega os estudantes e faltas da turma selecionada
  useEffect(() => {
    if (!turmaSelecionada?.id) {
      setEstudantes([]);
      setTurmaInfo(null);
      return;
    }

    async function buscarFaltasDaTurma() {
      setLoadingFaltas(true);
      setErro(null);
      setAlunoExpandido(null);
      try {
        const res = await api.get(`/api/secretaria/faltas/turma/${turmaSelecionada.id}`, {
          params: { ano_letivo: anoLetivo },
        });

        if (res.data?.ok) {
          setEstudantes(res.data.estudantes || []);
          setTurmaInfo(res.data.turma || turmaSelecionada);
        } else {
          setErro(res.data?.message || "Erro ao consultar faltas.");
        }
      } catch (err) {
        console.error("Erro ao buscar faltas:", err);
        setErro("Não foi possível carregar os dados de faltas desta turma.");
      } finally {
        setLoadingFaltas(false);
      }
    }

    buscarFaltasDaTurma();
  }, [turmaSelecionada, anoLetivo, refreshCount]);

  // ── Handlers do Importador de Faltas (EDUCADF) ──
  const handleAdicionarArquivos = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const novos = Array.from(fileList).filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith(".csv") || ext.endsWith(".xls") || ext.endsWith(".xlsx");
    });

    if (novos.length === 0) {
      setErroImportacao("Nenhum arquivo válido (.csv, .xls, .xlsx) foi encontrado na seleção.");
      return;
    }

    setErroImportacao(null);
    setPreviewData(null);
    setResultadoFinal(null);
    setArquivosImportacao((prev) => {
      const existentesMap = new Set(prev.map((p) => `${p.name}-${p.size}`));
      const filtrados = novos.filter((n) => !existentesMap.has(`${n.name}-${n.size}`));
      return [...prev, ...filtrados];
    });
  };

  const handleRemoverArquivo = (index) => {
    setArquivosImportacao((prev) => prev.filter((_, idx) => idx !== index));
    setPreviewData(null);
    setResultadoFinal(null);
  };

  const handleLimparArquivos = () => {
    setArquivosImportacao([]);
    setPreviewData(null);
    setResultadoFinal(null);
    setErroImportacao(null);
  };

  const handlePreviewImportacao = async () => {
    if (arquivosImportacao.length === 0) {
      setErroImportacao("Selecione pelo menos um arquivo de relatório de frequência do EDUCADF.");
      return;
    }

    setLoadingPreview(true);
    setErroImportacao(null);
    setPreviewData(null);
    setResultadoFinal(null);

    try {
      const formData = new FormData();
      arquivosImportacao.forEach((f) => formData.append("files", f));
      formData.append("ano", anoImportacao);
      formData.append("bimestre", bimestreImportacao);
      formData.append("preview", "true");

      const res = await api.post("/api/secretaria/faltas/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.ok) {
        setPreviewData(res.data);
      } else {
        setErroImportacao(res.data?.message || "Erro ao gerar prévia da importação.");
      }
    } catch (err) {
      console.error("Erro na pré-visualização:", err);
      setErroImportacao(
        err.response?.data?.message || "Falha ao processar os arquivos no servidor."
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGravarNoBoletim = async () => {
    if (arquivosImportacao.length === 0) return;

    setLoadingGravacao(true);
    setErroImportacao(null);

    try {
      const formData = new FormData();
      arquivosImportacao.forEach((f) => formData.append("files", f));
      formData.append("ano", anoImportacao);
      formData.append("bimestre", bimestreImportacao);
      formData.append("preview", "false");

      const res = await api.post("/api/secretaria/faltas/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.ok) {
        setResultadoFinal(res.data);
        setPreviewData(null);
        // Recarrega as faltas da turma atualmente aberta na tabela de trás
        setRefreshCount((c) => c + 1);
      } else {
        setErroImportacao(res.data?.message || "Erro ao gravar as faltas no Boletim.");
      }
    } catch (err) {
      console.error("Erro na gravação das faltas:", err);
      setErroImportacao(
        err.response?.data?.message || "Falha ao gravar os registros de faltas no banco de dados."
      );
    } finally {
      setLoadingGravacao(false);
    }
  };

  // 4. Filtro textual de estudantes
  const estudantesFiltrados = useMemo(() => {
    if (!buscaAluno.trim()) return estudantes;
    const q = buscaAluno.toLowerCase();
    return estudantes.filter(
      (e) =>
        e.nome.toLowerCase().includes(q) ||
        String(e.codigo || "").toLowerCase().includes(q)
    );
  }, [estudantes, buscaAluno]);

  // 5. Métricas gerais da turma
  const metricas = useMemo(() => {
    const totalAlunos = estudantes.length;
    let comFaltas = 0;
    let totalFaltasAno = 0;
    let totalAtestados = 0;

    for (const e of estudantes) {
      const tot = Number(e.faltas?.total || 0);
      if (tot > 0) comFaltas++;
      totalFaltasAno += tot;
      const justTotal = Number(e.justificadas?.total ?? e.justificadas?.dias ?? 0);
      if (justTotal > 0) totalAtestados += justTotal;
    }

    const mediaFaltas = totalAlunos > 0 ? (totalFaltasAno / totalAlunos).toFixed(1) : 0;

    return {
      totalAlunos,
      comFaltas,
      totalFaltasAno,
      mediaFaltas,
      totalAtestados,
    };
  }, [estudantes]);

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 space-y-6">
      {/* ── CABEÇALHO HERO ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Secretaria Escolar
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <SparklesIcon className="w-3.5 h-3.5" /> Submódulo Faltas
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <CalendarDaysIcon className="w-8 h-8 text-blue-400" />
              Controle de Faltas
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Acompanhamento e fiscalização de frequência por turma e bimestre. Visão integrada com diários e justificativas legais.
            </p>
          </div>

          {/* Controles de Ação do Topo (Ano Letivo + Importar Faltas) */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* Seletor de Ano Letivo */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 shadow-sm">
              <span className="text-xs font-medium text-slate-300">Ano Letivo:</span>
              <select
                value={anoLetivo}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAnoLetivo(val);
                  setAnoImportacao(val);
                }}
                className="bg-transparent font-bold text-white text-base focus:outline-none cursor-pointer"
              >
                {anosLetivos.map((ano) => (
                  <option key={ano} value={ano} className="text-slate-900">
                    {ano}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão de Importar Faltas EDUCADF */}
            <button
              type="button"
              onClick={() => {
                setErroImportacao(null);
                setShowModalImportar(true);
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-emerald-950/30 transition-all border border-emerald-400/40 text-sm cursor-pointer group"
              title="Importar planilhas de faltas oficiais (.csv, .xls, .xlsx) baixadas do portal EDUCADF"
            >
              <ArrowUpTrayIcon className="w-5 h-5 text-white group-hover:-translate-y-0.5 transition-transform" />
              <span>Importar Faltas (EDUCADF)</span>
            </button>
          </div>
        </div>

        {/* CARDS MÉTRICOS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <UserGroupIcon className="w-4 h-4 text-blue-300" /> Total na Turma
            </span>
            <p className="text-2xl font-black text-white mt-1">{metricas.totalAlunos}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-300" /> Alunos com Faltas
            </span>
            <p className="text-2xl font-black text-amber-300 mt-1">{metricas.comFaltas}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-rose-300" /> Total Geral Faltas
            </span>
            <p className="text-2xl font-black text-rose-300 mt-1">{metricas.totalFaltasAno}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <DocumentTextIcon className="w-4 h-4 text-emerald-300" /> Dias Justificados
            </span>
            <p className="text-2xl font-black text-emerald-300 mt-1">{metricas.totalAtestados}</p>
          </div>
        </div>
      </div>

      {/* ── PAINEL DE SELEÇÃO E FILTROS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        {/* 1. FILTRO DE TURNOS */}
        <div>
          <div className="flex items-center gap-2 mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <FunnelIcon className="w-4 h-4 text-blue-600" /> 1. Filtrar por Turno:
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TURNOS_CONFIG).map(([chave, cfg]) => {
              const count = contagemTurnos[chave] || 0;
              const isActive = turnoSelecionado === chave;
              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => setTurnoSelecionado(chave)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all duration-150 ${
                    isActive
                      ? cfg.active
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base">{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. FILTRO DE TURMAS (BADGES CLICÁVEIS) */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <AcademicCapIcon className="w-4 h-4 text-indigo-600" /> 2. Selecione a Turma:
            </span>
            <span className="text-xs text-slate-400">
              {turmasExibidas.length} turma(s) encontrada(s)
            </span>
          </div>

          {loadingTurmas ? (
            <div className="py-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />
              Carregando turmas...
            </div>
          ) : turmasExibidas.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm border border-dashed border-slate-300">
              Nenhuma turma encontrada para o turno e ano selecionados.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {turmasExibidas.map((t) => {
                const isSelected = turmaSelecionada?.id === t.id;
                const nomeTurma = t.turma || t.nome;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTurmaSelecionada(t)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-105"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-blue-500"}`} />
                    <span>{nomeTurma}</span>
                    {t.turno && (
                      <span className={`text-[10px] font-medium opacity-80 uppercase ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                        ({t.turno})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── BARRA DE FERRAMENTAS DA TABELA ── */}
      {turmaSelecionada && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Turma: {turmaSelecionada.turma || turmaSelecionada.nome}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              Turno: {turmaSelecionada.turno || "—"}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              {estudantesFiltrados.length} estudante(s)
            </span>
          </div>

          {/* Busca textual por aluno */}
          <div className="relative w-full sm:w-80">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar estudante por nome ou matrícula..."
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>
      )}

      {/* ── TABELA DE FALTAS BIMESTRAIS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loadingFaltas ? (
          <div className="py-20 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-3">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
            <span className="font-semibold">Calculando dados de frequência da turma...</span>
          </div>
        ) : erro ? (
          <div className="p-8 text-center text-rose-600 text-sm space-y-2">
            <ExclamationTriangleIcon className="w-8 h-8 mx-auto text-rose-500" />
            <p className="font-bold">{erro}</p>
          </div>
        ) : !turmaSelecionada ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <AcademicCapIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">Nenhuma turma selecionada</p>
            <p className="text-xs text-slate-400 mt-1">Selecione uma turma nos badges acima para visualizar a grade de faltas.</p>
          </div>
        ) : estudantesFiltrados.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <UserGroupIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">Nenhum estudante localizado</p>
            <p className="text-xs text-slate-400 mt-1">
              {buscaAluno ? "Nenhum estudante corresponde ao filtro de busca." : "Esta turma ainda não possui matrículas ativas cadastradas."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Estudante</th>
                  <th className="py-3.5 px-3 text-center bg-blue-50/50 text-blue-900 border-l border-r border-blue-100 min-w-[110px]">
                    <div>1º Bimestre</div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[9px] font-semibold">
                      <span className="text-rose-600 flex items-center gap-0.5" title="Faltas">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Faltas
                      </span>
                      <span className="text-emerald-700 flex items-center gap-0.5" title="Faltas Justificadas / Atestados">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Justif.
                      </span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-blue-50/50 text-blue-900 border-r border-blue-100 min-w-[110px]">
                    <div>2º Bimestre</div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[9px] font-semibold">
                      <span className="text-rose-600 flex items-center gap-0.5" title="Faltas">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Faltas
                      </span>
                      <span className="text-emerald-700 flex items-center gap-0.5" title="Faltas Justificadas / Atestados">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Justif.
                      </span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-blue-50/50 text-blue-900 border-r border-blue-100 min-w-[110px]">
                    <div>3º Bimestre</div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[9px] font-semibold">
                      <span className="text-rose-600 flex items-center gap-0.5" title="Faltas">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Faltas
                      </span>
                      <span className="text-emerald-700 flex items-center gap-0.5" title="Faltas Justificadas / Atestados">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Justif.
                      </span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-blue-50/50 text-blue-900 border-r border-blue-100 min-w-[110px]">
                    <div>4º Bimestre</div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[9px] font-semibold">
                      <span className="text-rose-600 flex items-center gap-0.5" title="Faltas">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Faltas
                      </span>
                      <span className="text-emerald-700 flex items-center gap-0.5" title="Faltas Justificadas / Atestados">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Justif.
                      </span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 w-32 text-center bg-indigo-50/80 text-indigo-950 font-black border-r border-indigo-100">
                    Total Faltas
                  </th>
                  <th className="py-3.5 px-4 w-36 text-center">Situação</th>
                  <th className="py-3.5 px-4 w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {estudantesFiltrados.map((aluno, index) => {
                  const { initials, style } = getInitialsColor(aluno.nome);
                  const isExpanded = alunoExpandido === aluno.aluno_id;
                  const total = Number(aluno.faltas?.total || 0);

                  // Situação de infrequência baseada em faltas
                  let badgeSituacao = {
                    label: "Frequente",
                    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    dot: "bg-emerald-500",
                  };
                  if (total >= 30) {
                    badgeSituacao = {
                      label: "Alerta Infrequência",
                      bg: "bg-rose-50 text-rose-700 border-rose-200",
                      dot: "bg-rose-500",
                    };
                  } else if (total >= 15) {
                    badgeSituacao = {
                      label: "Atenção",
                      bg: "bg-amber-50 text-amber-700 border-amber-200",
                      dot: "bg-amber-500",
                    };
                  }

                  return (
                    <React.Fragment key={aluno.aluno_id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isExpanded ? "bg-blue-50/30" : ""
                        }`}
                      >
                        {/* Índice */}
                        <td className="py-3 px-4 text-center font-semibold text-slate-400">
                          {index + 1}
                        </td>

                        {/* Foto e Nome */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {aluno.foto ? (
                              <img
                                src={aluno.foto}
                                alt={aluno.nome}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 ${style}`}
                              >
                                {initials}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800 leading-tight">
                                {aluno.nome}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-400 font-mono">
                                  Matrícula: {aluno.codigo}
                                </span>
                                {Number(aluno.justificadas?.total || aluno.justificadas?.dias || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    {aluno.justificadas.total || aluno.justificadas.dias}d justif.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 1º Bimestre */}
                        <td className="py-3 px-3 text-center font-semibold bg-blue-50/20 border-l border-r border-blue-50">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Badge Vermelha - Faltas */}
                            {aluno.faltas?.b1 > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200 text-xs shadow-xs"
                                title={`${aluno.faltas.b1} falta(s) no 1º Bimestre`}
                              >
                                {aluno.faltas.b1}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold px-1.5 py-0.5 text-xs">0</span>
                            )}

                            {/* Badge Verde - Faltas Justificadas */}
                            {Number(aluno.justificadas?.b1 || 0) > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 text-xs shadow-xs"
                                title={`${aluno.justificadas.b1} falta(s) justificada(s) no 1º Bimestre`}
                              >
                                {aluno.justificadas.b1}
                              </span>
                            ) : aluno.faltas?.b1 > 0 ? (
                              <span
                                className="px-1.5 py-0.5 rounded-md font-medium text-emerald-700/40 bg-emerald-50/40 border border-emerald-100/50 text-[11px]"
                                title="0 faltas justificadas no 1º Bimestre"
                              >
                                0
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 2º Bimestre */}
                        <td className="py-3 px-3 text-center font-semibold bg-blue-50/20 border-r border-blue-50">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Badge Vermelha - Faltas */}
                            {aluno.faltas?.b2 > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200 text-xs shadow-xs"
                                title={`${aluno.faltas.b2} falta(s) no 2º Bimestre`}
                              >
                                {aluno.faltas.b2}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold px-1.5 py-0.5 text-xs">0</span>
                            )}

                            {/* Badge Verde - Faltas Justificadas */}
                            {Number(aluno.justificadas?.b2 || 0) > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 text-xs shadow-xs"
                                title={`${aluno.justificadas.b2} falta(s) justificada(s) no 2º Bimestre`}
                              >
                                {aluno.justificadas.b2}
                              </span>
                            ) : aluno.faltas?.b2 > 0 ? (
                              <span
                                className="px-1.5 py-0.5 rounded-md font-medium text-emerald-700/40 bg-emerald-50/40 border border-emerald-100/50 text-[11px]"
                                title="0 faltas justificadas no 2º Bimestre"
                              >
                                0
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 3º Bimestre */}
                        <td className="py-3 px-3 text-center font-semibold bg-blue-50/20 border-r border-blue-50">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Badge Vermelha - Faltas */}
                            {aluno.faltas?.b3 > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200 text-xs shadow-xs"
                                title={`${aluno.faltas.b3} falta(s) no 3º Bimestre`}
                              >
                                {aluno.faltas.b3}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold px-1.5 py-0.5 text-xs">0</span>
                            )}

                            {/* Badge Verde - Faltas Justificadas */}
                            {Number(aluno.justificadas?.b3 || 0) > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 text-xs shadow-xs"
                                title={`${aluno.justificadas.b3} falta(s) justificada(s) no 3º Bimestre`}
                              >
                                {aluno.justificadas.b3}
                              </span>
                            ) : aluno.faltas?.b3 > 0 ? (
                              <span
                                className="px-1.5 py-0.5 rounded-md font-medium text-emerald-700/40 bg-emerald-50/40 border border-emerald-100/50 text-[11px]"
                                title="0 faltas justificadas no 3º Bimestre"
                              >
                                0
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 4º Bimestre */}
                        <td className="py-3 px-3 text-center font-semibold bg-blue-50/20 border-r border-blue-50">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Badge Vermelha - Faltas */}
                            {aluno.faltas?.b4 > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200 text-xs shadow-xs"
                                title={`${aluno.faltas.b4} falta(s) no 4º Bimestre`}
                              >
                                {aluno.faltas.b4}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold px-1.5 py-0.5 text-xs">0</span>
                            )}

                            {/* Badge Verde - Faltas Justificadas */}
                            {Number(aluno.justificadas?.b4 || 0) > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 text-xs shadow-xs"
                                title={`${aluno.justificadas.b4} falta(s) justificada(s) no 4º Bimestre`}
                              >
                                {aluno.justificadas.b4}
                              </span>
                            ) : aluno.faltas?.b4 > 0 ? (
                              <span
                                className="px-1.5 py-0.5 rounded-md font-medium text-emerald-700/40 bg-emerald-50/40 border border-emerald-100/50 text-[11px]"
                                title="0 faltas justificadas no 4º Bimestre"
                              >
                                0
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Total Geral */}
                        <td className="py-3 px-4 text-center bg-indigo-50/40 border-r border-indigo-100">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span
                              className={`px-3 py-1 rounded-lg font-black text-sm inline-block ${
                                total > 0
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "text-slate-400 bg-slate-100"
                              }`}
                            >
                              {total}
                            </span>
                            {Number(aluno.justificadas?.total || aluno.justificadas?.dias || 0) > 0 && (
                              <span
                                className="px-2 py-0.5 rounded-full font-bold text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300"
                                title={`${aluno.justificadas.total || aluno.justificadas.dias} dia(s) justificado(s) no total`}
                              >
                                {aluno.justificadas.total || aluno.justificadas.dias} justif.
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Situação */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeSituacao.bg}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${badgeSituacao.dot}`}
                            />
                            {badgeSituacao.label}
                          </span>
                        </td>

                        {/* Botão Detalhes */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setAlunoExpandido(isExpanded ? null : aluno.aluno_id)
                            }
                            className={`p-1.5 rounded-lg border transition ${
                              isExpanded
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                            }`}
                            title="Ver faltas por disciplina"
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* ── LINHA EXPANSÍVEL: DETALHAMENTO POR DISCIPLINA ── */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={9} className="p-4 pl-14">
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-inner space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-bold text-xs text-slate-700 flex items-center gap-2">
                                  <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                                  Detalhamento de Faltas por Componente Curricular — {aluno.nome}
                                </span>
                                {Number(aluno.justificadas?.total || aluno.justificadas?.dias || 0) > 0 && (
                                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                    {aluno.justificadas.total || aluno.justificadas.dias} dia(s) com atestado / justificativa (Módulo Frequência)
                                  </span>
                                )}
                              </div>

                              {aluno.disciplinas && aluno.disciplinas.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {aluno.disciplinas.map((disc) => (
                                    <div
                                      key={disc.id}
                                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <p className="font-bold text-slate-800">
                                          {disc.nome}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                          B1: {disc.b1} | B2: {disc.b2} | B3: {disc.b3} | B4: {disc.b4}
                                        </p>
                                      </div>
                                      <span
                                        className={`px-2 py-1 rounded-lg font-extrabold text-xs ${
                                          disc.total > 0
                                            ? "bg-rose-100 text-rose-800"
                                            : "bg-slate-200 text-slate-600"
                                        }`}
                                      >
                                        {disc.total} f.
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  Nenhum registro de falta individual por disciplina para este aluno.
                                </p>
                              )}

                              {aluno.justificadas?.detalhes && aluno.justificadas.detalhes.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-100">
                                  <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                    <DocumentTextIcon className="w-4 h-4 text-emerald-600" />
                                    Justificativas e Atestados Registrados no Módulo Frequência:
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {aluno.justificadas.detalhes.map((just, jIdx) => (
                                      <div
                                        key={just.id || jIdx}
                                        className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs flex flex-col gap-1"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-emerald-900 capitalize">
                                            {String(just.tipo || "Atestado").replace(/_/g, " ")}
                                          </span>
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                                            {just.dias} dia(s)
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-emerald-700">
                                          Período: {just.data_inicio ? String(just.data_inicio).slice(0, 10).split('-').reverse().join('/') : "—"} até {just.data_fim ? String(just.data_fim).slice(0, 10).split('-').reverse().join('/') : "—"}
                                        </p>
                                        {just.observacao && (
                                          <p className="text-[11px] text-slate-600 italic bg-white/80 p-1.5 rounded border border-emerald-100">
                                            "{just.observacao}"
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL DE IMPORTAÇÃO DE FALTAS EDUCADF ── */}
      {showModalImportar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
            {/* Cabeçalho do Modal */}
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <ArrowUpTrayIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                    Importar Faltas — Portal EDUCADF
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lançamento automático de faltas por disciplina no Boletim Escolar via planilhas oficiais.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModalImportar(false);
                  if (resultadoFinal) handleLimparArquivos();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
              {/* SUCESSO: Visualização de confirmação final */}
              {resultadoFinal ? (
                <div className="py-6 px-4 bg-emerald-50/70 border border-emerald-200 rounded-3xl text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircleIcon className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-emerald-950">
                      Faltas Lançadas com Sucesso!
                    </h4>
                    <p className="text-sm text-emerald-800 mt-1 max-w-lg mx-auto">
                      {resultadoFinal.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
                    <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm">
                      <span className="text-xs text-slate-500 font-medium block">Total Gravados</span>
                      <span className="text-2xl font-black text-emerald-600">
                        {resultadoFinal.stats?.totalGravados || 0}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm">
                      <span className="text-xs text-slate-500 font-medium block">Estudantes</span>
                      <span className="text-2xl font-black text-slate-800">
                        {resultadoFinal.stats?.totalAlunos || 0}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm col-span-2 sm:col-span-1">
                      <span className="text-xs text-slate-500 font-medium block">Turmas</span>
                      <span className="text-2xl font-black text-blue-600">
                        {resultadoFinal.stats?.totalTurmas || 0}
                      </span>
                    </div>
                  </div>

                  {resultadoFinal.stats?.turmas && resultadoFinal.stats.turmas.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-slate-600 mb-1.5">Turmas atualizadas:</p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {resultadoFinal.stats.turmas.map((t, i) => (
                          <span key={i} className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModalImportar(false);
                        handleLimparArquivos();
                      }}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-700/25 transition-all cursor-pointer"
                    >
                      Concluir e Ver Painel
                    </button>
                    <button
                      type="button"
                      onClick={handleLimparArquivos}
                      className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl text-sm transition-colors cursor-pointer"
                    >
                      Importar Outro Lote
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Bloco 1: Seleção de Destino (Bimestre e Ano Letivo) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          1. Bimestre de Destino no Boletim
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Selecione o bimestre para o qual as faltas serão atribuídas.
                        </p>
                      </div>

                      {/* Ano Letivo */}
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-medium text-slate-500">Ano:</span>
                        <select
                          value={anoImportacao}
                          onChange={(e) => {
                            setAnoImportacao(Number(e.target.value));
                            setPreviewData(null);
                          }}
                          className="font-bold text-slate-800 text-xs bg-transparent focus:outline-none cursor-pointer"
                        >
                          {anosLetivos.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Botões dos 4 Bimestres */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[1, 2, 3, 4].map((bim) => (
                        <button
                          key={bim}
                          type="button"
                          onClick={() => {
                            setBimestreImportacao(bim);
                            setPreviewData(null);
                          }}
                          className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                            bimestreImportacao === bim
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.02]"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80"
                          }`}
                        >
                          {bim}º Bimestre
                        </button>
                      ))}
                    </div>

                    <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2 text-xs text-blue-900">
                      <InformationCircleIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        <strong>Nota Técnica:</strong> O relatório do EDUCADF reflete o bimestre selecionado no momento da exportação no portal oficial. Certifique-se de que o botão acima corresponde ao período emitido.
                      </p>
                    </div>
                  </div>

                  {/* Bloco 2: Seleção de Arquivos / Pasta */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      2. Selecionar Arquivos ou Pasta (.csv, .xls, .xlsx)
                    </span>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleAdicionarArquivos(e.dataTransfer.files);
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                        isDragging
                          ? "border-emerald-500 bg-emerald-50/60 scale-[1.01]"
                          : "border-slate-300 hover:border-slate-400 bg-slate-50/40"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600">
                          <DocumentArrowUpIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Arraste e solte planilhas aqui ou utilize os botões abaixo:
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                          <label
                            htmlFor="input-faltas-files"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-sm cursor-pointer transition-colors"
                          >
                            <DocumentArrowUpIcon className="w-4 h-4 text-emerald-600" />
                            <span>Selecionar Arquivo(s)</span>
                            <input
                              id="input-faltas-files"
                              type="file"
                              multiple
                              accept=".csv,.xls,.xlsx"
                              className="hidden"
                              onChange={(e) => {
                                handleAdicionarArquivos(e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </label>

                          <label
                            htmlFor="input-faltas-folder"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-sm cursor-pointer transition-colors"
                          >
                            <FolderIcon className="w-4 h-4 text-blue-600" />
                            <span>Selecionar Pasta Completa</span>
                            <input
                              id="input-faltas-folder"
                              type="file"
                              webkitdirectory=""
                              directory=""
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                handleAdicionarArquivos(e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1">
                          Exemplo: Relatório_de_Frequência-7º I.csv
                        </span>
                      </div>
                    </div>

                    {/* Lista de Arquivos Selecionados */}
                    {arquivosImportacao.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            {arquivosImportacao.length} arquivo(s) preparado(s):
                          </span>
                          <button
                            type="button"
                            onClick={handleLimparArquivos}
                            className="text-red-600 hover:text-red-800 font-semibold text-[11px] cursor-pointer"
                          >
                            Limpar todos
                          </button>
                        </div>

                        <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {arquivosImportacao.map((arq, idx) => (
                            <div
                              key={`${arq.name}-${idx}`}
                              className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200/80 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] uppercase font-bold">
                                  {arq.name.split('.').pop()}
                                </span>
                                <span className="font-medium text-slate-700 truncate">{arq.name}</span>
                                <span className="text-[11px] text-slate-400 shrink-0">
                                  ({formatarTamanho(arq.size)})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoverArquivo(idx)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                                title="Remover este arquivo"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Feedback de Erro */}
                  {erroImportacao && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-800">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold">Aviso de Importação:</p>
                        <p className="mt-0.5 leading-relaxed">{erroImportacao}</p>
                      </div>
                    </div>
                  )}

                  {/* Bloco 3: Pré-visualização dos Resultados */}
                  {previewData && previewData.stats && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                          Resultado da Pré-visualização ({previewData.bimestre}º Bimestre)
                        </span>
                        {previewData.stats.naoMapeadosQtd > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                            {previewData.stats.naoMapeadosQtd} alerta(s)
                          </span>
                        )}
                      </div>

                      {/* Cards de Métricas da Prévia */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                            Lançamentos
                          </span>
                          <span className="text-xl font-black text-slate-800">
                            {previewData.stats.totalValidos}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                            Estudantes
                          </span>
                          <span className="text-xl font-black text-slate-800">
                            {previewData.stats.totalAlunos}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                            Turmas
                          </span>
                          <span className="text-xl font-black text-blue-600">
                            {previewData.stats.totalTurmas}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                            Disciplinas
                          </span>
                          <span className="text-xl font-black text-emerald-600">
                            {previewData.stats.disciplinas?.length || 0}
                          </span>
                        </div>
                      </div>

                      {/* Badges de Turmas Identificadas */}
                      {previewData.stats.turmas && previewData.stats.turmas.length > 0 && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[11px] font-bold text-slate-600 block">
                            Turmas Identificadas na Planilha:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {previewData.stats.turmas.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-0.5 bg-blue-100/80 text-blue-800 font-bold rounded-lg text-xs"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tabela de Amostra de Registros */}
                      {previewData.amostra && previewData.amostra.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                          <div className="bg-slate-100/80 px-3 py-2 font-bold text-slate-700 flex items-center justify-between">
                            <span>Amostra de Lançamentos</span>
                            <span className="text-[11px] text-slate-500 font-normal">
                              (Exibindo 10 de {previewData.stats.totalValidos})
                            </span>
                          </div>
                          <div className="max-h-44 overflow-y-auto">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                                <tr>
                                  <th className="p-2">Estudante</th>
                                  <th className="p-2">RE</th>
                                  <th className="p-2">Turma</th>
                                  <th className="p-2">Disciplina Mapeada</th>
                                  <th className="p-2 text-center">Faltas</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {previewData.amostra.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/80">
                                    <td className="p-2 font-medium text-slate-800 truncate max-w-[180px]">
                                      {item.aluno_nome}
                                    </td>
                                    <td className="p-2 font-mono text-slate-500">{item.aluno_re}</td>
                                    <td className="p-2 text-slate-600 truncate max-w-[120px]">
                                      {item.turma_nome}
                                    </td>
                                    <td className="p-2 text-slate-700 font-semibold truncate max-w-[160px]">
                                      {item.disciplina_nome}
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700">
                                        {item.faltas}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Accordion: Alertas / Não Mapeados */}
                      {previewData.naoMapeados && previewData.naoMapeados.length > 0 && (
                        <div className="border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => setMostrarNaoMapeados((v) => !v)}
                            className="w-full px-3 py-2 text-amber-800 font-bold flex items-center justify-between hover:bg-amber-100/50 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                              {previewData.naoMapeados.length} item(ns) com alerta (não gravados)
                            </span>
                            {mostrarNaoMapeados ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>
                          {mostrarNaoMapeados && (
                            <div className="p-3 pt-0 space-y-1.5 max-h-36 overflow-y-auto">
                              {previewData.naoMapeados.map((nm, idx) => (
                                <p key={idx} className="text-[11px] text-amber-900 bg-white/80 p-1.5 rounded border border-amber-200">
                                  {nm.motivo || nm.tipo} {nm.linha ? `(Linha ${nm.linha})` : ""}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Accordion: Logs Detalhados */}
                      {previewData.logs && previewData.logs.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => setMostrarLogs((v) => !v)}
                            className="w-full px-3 py-2 text-slate-600 font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <span>Logs do Processamento</span>
                            {mostrarLogs ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>
                          {mostrarLogs && (
                            <div className="p-3 pt-0 max-h-32 overflow-y-auto font-mono text-[11px] text-slate-600 space-y-1 bg-slate-50">
                              {previewData.logs.map((lg, i) => (
                                <p key={i}>{lg}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Rodapé de Ações do Modal */}
            {!resultadoFinal && (
              <div className="p-4 md:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {arquivosImportacao.length > 0 ? (
                    <span>
                      <strong className="text-slate-700">{arquivosImportacao.length}</strong> arquivo(s) selecionado(s) para o{" "}
                      <strong className="text-slate-700">{bimestreImportacao}º Bimestre</strong>
                    </span>
                  ) : (
                    <span>Aguardando seleção de arquivo...</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalImportar(false);
                      setErroImportacao(null);
                    }}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  {!previewData ? (
                    <button
                      type="button"
                      disabled={arquivosImportacao.length === 0 || loadingPreview}
                      onClick={handlePreviewImportacao}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      {loadingPreview ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          <span>Analisando planilhas...</span>
                        </>
                      ) : (
                        <>
                          <MagnifyingGlassIcon className="w-4 h-4" />
                          <span>Pré-visualizar Importação</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={loadingPreview || loadingGravacao}
                        onClick={handlePreviewImportacao}
                        className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Executar nova leitura das planilhas"
                      >
                        Recalcular
                      </button>

                      <button
                        type="button"
                        disabled={previewData.stats?.totalValidos === 0 || loadingGravacao}
                        onClick={handleGravarNoBoletim}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                      >
                        {loadingGravacao ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            <span>Gravando no Boletim...</span>
                          </>
                        ) : (
                          <>
                            <CheckIcon className="w-4 h-4" />
                            <span>Confirmar e Lançar no Boletim</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
