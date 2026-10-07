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
  }, [turmaSelecionada, anoLetivo]);

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
      if (e.justificadas?.dias > 0) totalAtestados += e.justificadas.dias;
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

          {/* Seletor de Ano Letivo */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 self-start md:self-auto">
            <span className="text-xs font-medium text-slate-300">Ano Letivo:</span>
            <select
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(Number(e.target.value))}
              className="bg-transparent font-bold text-white text-base focus:outline-none cursor-pointer"
            >
              {anosLetivos.map((ano) => (
                <option key={ano} value={ano} className="text-slate-900">
                  {ano}
                </option>
              ))}
            </select>
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
                  <th className="py-3.5 px-4 w-28 text-center bg-blue-50/50 text-blue-900 border-l border-r border-blue-100">
                    1º Bimestre
                  </th>
                  <th className="py-3.5 px-4 w-28 text-center bg-blue-50/50 text-blue-900 border-r border-blue-100">
                    2º Bimestre
                  </th>
                  <th className="py-3.5 px-4 w-28 text-center bg-blue-50/50 text-blue-900 border-r border-blue-100">
                    3º Bimestre
                  </th>
                  <th className="py-3.5 px-4 w-28 text-center bg-blue-50/50 text-blue-900 border-r border-blue-100">
                    4º Bimestre
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
                                {aluno.justificadas?.dias > 0 && (
                                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    {aluno.justificadas.dias}d justif.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 1º Bimestre */}
                        <td className="py-3 px-4 text-center font-semibold bg-blue-50/20 border-l border-r border-blue-50">
                          {aluno.faltas?.b1 > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200">
                              {aluno.faltas.b1}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">0</span>
                          )}
                        </td>

                        {/* 2º Bimestre */}
                        <td className="py-3 px-4 text-center font-semibold bg-blue-50/20 border-r border-blue-50">
                          {aluno.faltas?.b2 > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200">
                              {aluno.faltas.b2}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">0</span>
                          )}
                        </td>

                        {/* 3º Bimestre */}
                        <td className="py-3 px-4 text-center font-semibold bg-blue-50/20 border-r border-blue-50">
                          {aluno.faltas?.b3 > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200">
                              {aluno.faltas.b3}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">0</span>
                          )}
                        </td>

                        {/* 4º Bimestre */}
                        <td className="py-3 px-4 text-center font-semibold bg-blue-50/20 border-r border-blue-50">
                          {aluno.faltas?.b4 > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200">
                              {aluno.faltas.b4}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">0</span>
                          )}
                        </td>

                        {/* Total Geral */}
                        <td className="py-3 px-4 text-center bg-indigo-50/40 border-r border-indigo-100">
                          <span
                            className={`px-3 py-1 rounded-lg font-black text-sm inline-block ${
                              total > 0
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-slate-400 bg-slate-100"
                            }`}
                          >
                            {total}
                          </span>
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
                                {aluno.justificadas?.dias > 0 && (
                                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                    {aluno.justificadas.dias} dia(s) com atestado médico/justificativa
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
    </div>
  );
}
