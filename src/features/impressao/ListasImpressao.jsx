// src/features/impressao/ListasImpressao.jsx
// ============================================================================
// Módulo LISTAS — Geração de listas imprimíveis para coordenação/direção.
// PDF gerado no servidor (PDFKit) — idêntico ao Relatório Disciplinar.
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import {
  ClipboardDocumentListIcon,
  PrinterIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

// ─── Ano letivo atual ───
const ANO_LETIVO = String(new Date().getFullYear());

// ─── Normaliza texto para comparação ───
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// ─── Tipos de lista ───
const TIPOS_LISTA = [
  {
    id: "chamada",
    nome: "Lista de Chamada",
    desc: "Frequência diária com campos para marcar presença/falta",
    icon: ClipboardDocumentListIcon,
    color: "from-blue-500 to-blue-700",
  },
  {
    id: "assinatura_prova",
    nome: "Assinatura — Prova",
    desc: "Folha de assinatura para dia de aplicação de provas/avaliações",
    icon: DocumentTextIcon,
    color: "from-indigo-500 to-indigo-700",
  },
  {
    id: "assinatura_geral",
    nome: "Assinatura — Geral",
    desc: "Folha de assinatura para reuniões, eventos ou entregas de material",
    icon: UserGroupIcon,
    color: "from-violet-500 to-violet-700",
  },
  {
    id: "branco",
    nome: "Lista em Branco",
    desc: "Linhas vazias numeradas para preenchimento manual",
    icon: AcademicCapIcon,
    color: "from-gray-500 to-gray-700",
  },
  {
    id: "notas",
    nome: "Lista de Notas",
    desc: "Notas corrigidas automaticamente pelos gabaritos digitalizados",
    icon: ChartBarIcon,
    color: "from-emerald-500 to-teal-700",
    badge: "NOVO",
  },
];

export default function ListasImpressao() {
  // ─── Estado ───
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoTurno, setGerandoTurno] = useState(false);

  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [tipoLista, setTipoLista] = useState(null);

  // Extras
  const [tituloPersonalizado, setTituloPersonalizado] = useState("");
  const [dataAplicacao, setDataAplicacao] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [qtdLinhasBranco, setQtdLinhasBranco] = useState(30);

  // ─── Lista de Notas: avaliação + turma ───
  const [avaliacoesNotas, setAvaliacoesNotas] = useState([]);
  const [loadingAvaliacoesNotas, setLoadingAvaliacoesNotas] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [turmasNotasDisponiveis, setTurmasNotasDisponiveis] = useState([]);
  const [loadingTurmasNotas, setLoadingTurmasNotas] = useState(false);
  const [turmaNota, setTurmaNota] = useState(null);
  const [gerandoNotas, setGerandoNotas] = useState(false);

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  // ─── Buscar turmas (filtradas pelo ano letivo atual) ───
  useEffect(() => {
    (async () => {
      setLoadingTurmas(true);
      try {
        const escola_id = localStorage.getItem("escola_id") || 1;
        const { data } = await api.get("/api/turmas", {
          params: { escola_id },
        });
        const turmasAnoAtual = (data || []).filter(
          (t) => String(t.ano) === ANO_LETIVO
        );
        setTurmas(turmasAnoAtual);
      } catch {
        setTurmas([]);
      } finally {
        setLoadingTurmas(false);
      }
    })();
  }, []);

  // ─── Buscar avaliações com notas (quando tipo = notas) ───
  useEffect(() => {
    if (tipoLista?.id !== "notas") return;
    setLoadingAvaliacoesNotas(true);
    api.get("/api/listas-impressao/notas/avaliacoes")
      .then(r => setAvaliacoesNotas(r.data || []))
      .catch(() => setAvaliacoesNotas([]))
      .finally(() => setLoadingAvaliacoesNotas(false));
  }, [tipoLista]);

  // ─── Buscar turmas de uma avaliação selecionada ───
  useEffect(() => {
    if (!avaliacaoSelecionada) return;
    setLoadingTurmasNotas(true);
    api.get(`/api/listas-impressao/notas/${avaliacaoSelecionada.id}/turmas`)
      .then(r => setTurmasNotasDisponiveis(r.data || []))
      .catch(() => setTurmasNotasDisponiveis([]))
      .finally(() => setLoadingTurmasNotas(false));
  }, [avaliacaoSelecionada]);

  // ─── Turmas filtradas por turno ───
  const turmasFiltradas = useMemo(
    () =>
      turmas
        .filter(
          (t) =>
            turnoSelecionado &&
            norm(t.turno) === norm(turnoSelecionado)
        )
        .sort((a, b) => (a.turma || "").localeCompare(b.turma || "", "pt-BR")),
    [turmas, turnoSelecionado]
  );

  // ═══ GERAR PDF LISTA DE NOTAS ═══
  const handleGerarPDFNotas = async () => {
    if (!avaliacaoSelecionada || !turmaNota) return;
    setGerandoNotas(true);
    try {
      const params = new URLSearchParams({ turma_nome: turmaNota.turma_nome });
      const turmaId = turmaNota.turma_id || "por-nome";
      const response = await api.get(
        `/api/listas-impressao/notas/${avaliacaoSelecionada.id}/${turmaId}?${params}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Erro ao gerar Lista de Notas:", err);
      alert("Erro ao gerar o PDF de notas. Verifique se os gabaritos foram corrigidos.");
    } finally {
      setGerandoNotas(false);
    }
  };

  // ═══ GERAR PDF (turma individual) ═══
  const handleGerarPDF = async () => {
    if (!tipoLista || !turmaSelecionada) return;
    setGerando(true);
    try {
      const params = new URLSearchParams({ tipo: tipoLista.id, data: dataAplicacao });
      if (tituloPersonalizado.trim()) params.set("titulo", tituloPersonalizado.trim());
      if (tipoLista.id === "branco") params.set("linhas", String(qtdLinhasBranco));

      const response = await api.get(
        `/api/listas-impressao/${turmaSelecionada.id}?${params.toString()}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o PDF. Verifique a conexão e tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  // ═══ GERAR PDF POR TURNO (todas as turmas) ═══
  const handleGerarPDFTurno = async () => {
    if (!tipoLista || !turnoSelecionado) return;
    setGerandoTurno(true);
    try {
      const params = new URLSearchParams({ tipo: tipoLista.id, data: dataAplicacao });
      if (tituloPersonalizado.trim()) params.set("titulo", tituloPersonalizado.trim());
      if (tipoLista.id === "branco") params.set("linhas", String(qtdLinhasBranco));

      const response = await api.get(
        `/api/listas-impressao/por-turno/${encodeURIComponent(turnoSelecionado)}?${params.toString()}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Erro ao gerar PDF por turno:", err);
      alert("Erro ao gerar o PDF por turno. Verifique a conexão e tente novamente.");
    } finally {
      setGerandoTurno(false);
    }
  };

  // ─── Stepper ───
  const isNotas = tipoLista?.id === "notas";
  const step = isNotas
    ? (!tipoLista ? 1 : !avaliacaoSelecionada ? 2 : !turmaNota ? 3 : 4)
    : (!tipoLista ? 1 : !turnoSelecionado ? 2 : !turmaSelecionada ? 3 : 4);

  const stepLabels = isNotas
    ? [{ n: 1, label: "Tipo" }, { n: 2, label: "Avaliação" }, { n: 3, label: "Turma" }, { n: 4, label: "Gerar PDF" }]
    : [{ n: 1, label: "Tipo" }, { n: 2, label: "Turno" }, { n: 3, label: "Turma" }, { n: 4, label: "Gerar PDF" }];

  const stepHint = isNotas
    ? (step === 1 ? "Escolha o tipo de lista" : step === 2 ? "Selecione a avaliação" : step === 3 ? "Selecione a turma" : "Pronto para gerar!")
    : (step === 1 ? "Escolha o tipo de lista" : step === 2 ? "Selecione o turno" : step === 3 ? "Selecione a turma" : "Pronto para gerar!");

  return (
    <div className="max-w-6xl mx-auto">
      {/* ─── HERO HEADER ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-900 px-6 py-8 md:px-10 md:py-10 mb-8 shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative flex items-center gap-5">
          <div className="hidden md:flex h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center shadow-lg">
            <PrinterIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {"\uD83D\uDCCB"} Listas para Impressão
            </h1>
            <p className="mt-1 text-blue-200 text-sm md:text-base">
              Selecione o tipo de lista, turno e turma para gerar o PDF.
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="relative mt-6 flex items-center gap-2">
          {stepLabels.map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && (
                <div className={`flex-1 h-0.5 ${step > s.n - 1 ? "bg-green-400" : "bg-white/20"}`} />
              )}
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all ${
                  step >= s.n
                    ? "bg-green-400 text-green-900 shadow-lg shadow-green-400/30"
                    : "bg-white/15 text-white/60"
                }`}
              >
                {step > s.n ? <CheckCircleIcon className="h-5 w-5" /> : s.n}
              </div>
            </React.Fragment>
          ))}
          <span className="ml-3 text-white/70 text-xs hidden sm:inline">{stepHint}</span>
        </div>
      </div>

      {/* ─── STEP 1: Tipo de Lista ─── */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-extrabold">1</span>
          Tipo de Lista
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIPOS_LISTA.map((t) => {
            const Icon = t.icon;
            const sel = tipoLista?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTipoLista(t);
                  setTurmaSelecionada(null);
                  setTurnoSelecionado(null);
                  setAvaliacaoSelecionada(null);
                  setTurmaNota(null);
                }}
                className={`group relative overflow-hidden rounded-xl border-2 text-left p-4 transition-all duration-200 ${
                  sel
                    ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200/50 scale-[1.02]"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0 shadow`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm ${sel ? "text-indigo-800" : "text-gray-900"}`}>
                        {t.nome}
                      </p>
                      {t.badge && (
                        <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] rounded-full font-bold uppercase tracking-wider">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.desc}</p>
                  </div>
                </div>
                {sel && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          FLUXO ESPECIAL: LISTA DE NOTAS
          ════════════════════════════════════════════════════════ */}
      {tipoLista?.id === "notas" && (
        <div className="animate-fadeIn">
          {/* ─── STEP 2: Selecionar Avaliação ─── */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-extrabold">2</span>
              Avaliação com Gabaritos Corrigidos
            </h2>

            {loadingAvaliacoesNotas ? (
              <div className="flex items-center gap-3 p-4 text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500" />
                Carregando avaliações...
              </div>
            ) : avaliacoesNotas.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-6 text-center">
                <ChartBarIcon className="h-10 w-10 text-amber-300 mx-auto mb-2" />
                <p className="text-amber-800 font-semibold text-sm">Nenhuma avaliação com gabaritos corrigidos encontrada.</p>
                <p className="text-amber-600 text-xs mt-1">Acesse <strong>Impressão {"\u2192"} Gabaritos</strong> para corrigir gabaritos e gerar notas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {avaliacoesNotas.map((av) => {
                  const sel = avaliacaoSelecionada?.id === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setAvaliacaoSelecionada(av);
                        setTurmaNota(null);
                      }}
                      className={`group relative rounded-xl border-2 text-left p-4 transition-all duration-200 ${
                        sel
                          ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-200/50 scale-[1.01]"
                          : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate ${sel ? "text-emerald-800" : "text-gray-900"}`}>
                            {av.titulo}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {av.bimestre && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                                {av.bimestre}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
                              {av.total_turmas} turma{av.total_turmas !== 1 ? "s" : ""}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">
                              {av.total_respostas} aluno{av.total_respostas !== 1 ? "s" : ""} corrigido{av.total_respostas !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        {sel && <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── STEP 3: Selecionar Turma (notas) ─── */}
          {avaliacaoSelecionada && (
            <div className="mb-8 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-extrabold">3</span>
                Turma
                <span className="text-xs font-normal text-gray-400 ml-1">({avaliacaoSelecionada.titulo})</span>
              </h2>

              {loadingTurmasNotas ? (
                <div className="flex items-center gap-3 p-4 text-gray-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
                  Carregando turmas...
                </div>
              ) : turmasNotasDisponiveis.length === 0 ? (
                <p className="text-gray-500">Nenhuma turma com notas para esta avaliação.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {turmasNotasDisponiveis.map((t) => {
                    const sel = turmaNota?.lote_id === t.lote_id;
                    return (
                      <button
                        key={t.lote_id}
                        onClick={() => setTurmaNota(t)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                          sel
                            ? "bg-teal-600 text-white shadow-lg shadow-teal-300/40 scale-105"
                            : "bg-gradient-to-b from-teal-100 to-emerald-50 text-teal-900 border border-teal-200 hover:shadow-md hover:scale-105"
                        }`}
                      >
                        {t.turma_nome}
                        <span className={`ml-1.5 text-[10px] font-normal ${sel ? "text-teal-200" : "text-teal-500"}`}>
                          {t.total_alunos_corrigidos} alunos
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 4: Gerar PDF Notas ─── */}
          {avaliacaoSelecionada && turmaNota && (
            <div className="animate-fadeIn">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-extrabold">4</span>
                  Gerar Lista de Notas
                </h3>

                <div className="mb-5 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
                    <span><strong className="text-emerald-700">Avaliação:</strong> {avaliacaoSelecionada.titulo}</span>
                    <span><strong className="text-emerald-700">Turma:</strong> {turmaNota.turma_nome}</span>
                    {avaliacaoSelecionada.bimestre && (
                      <span><strong className="text-emerald-700">Bimestre:</strong> {avaliacaoSelecionada.bimestre}</span>
                    )}
                    <span><strong className="text-emerald-700">Alunos corrigidos:</strong> {turmaNota.total_alunos_corrigidos}</span>
                    <span><strong className="text-emerald-700">Nota máxima:</strong> {avaliacaoSelecionada.nota_total}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {"\uD83D\uDCCA"} O PDF incluirá cabeçalho institucional premium, tabela com RE, nome do estudante, acertos, nota e situação (aprovado/reprovado), além de estatísticas da turma.
                  </p>
                </div>

                <button
                  onClick={handleGerarPDFNotas}
                  disabled={gerandoNotas}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  style={{
                    background: gerandoNotas
                      ? "#6b7280"
                      : "linear-gradient(135deg, #10b981, #0d9488)",
                    boxShadow: gerandoNotas ? "none" : "0 4px 14px rgba(16,185,129,0.4)",
                  }}
                >
                  {gerandoNotas ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <PrinterIcon className="h-5 w-5" />
                      Gerar Lista de Notas — {turmaNota.turma_nome}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          FLUXO PADRÃO (não é notas)
          ════════════════════════════════════════════════════════ */}
      {tipoLista && tipoLista.id !== "notas" && (
        <>
          {/* ─── STEP 2: Turno ─── */}
          <div className="mb-8 animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-extrabold">2</span>
              Turno
            </h2>
            <div className="flex flex-wrap gap-3">
              {turnos.map((turno) => (
                <button
                  key={turno}
                  onClick={() => {
                    setTurnoSelecionado(turno);
                    setTurmaSelecionada(null);
                  }}
                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                    turnoSelecionado === turno
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-300/40 scale-105"
                      : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50 hover:border-blue-400"
                  }`}
                >
                  {turno}
                </button>
              ))}
            </div>

            {/* Card: Gerar PDF do Turno Completo */}
            <div className="mt-5 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-300/40">
                  <DocumentDuplicateIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    {"\uD83D\uDCCB"} Gerar PDF do Turno Completo
                    <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full font-bold uppercase tracking-wider">Novo</span>
                  </h3>
                  <p className="text-xs text-indigo-700/70 mt-1">
                    Gera um único PDF com <strong>todas as {turmasFiltradas.length} turmas</strong> do turno <strong>{turnoSelecionado}</strong>, cada uma em sua própria página.
                  </p>

                  <div className="flex flex-wrap items-end gap-3 mt-3">
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Título da lista</label>
                      <input
                        type="text"
                        value={tituloPersonalizado}
                        onChange={(e) => setTituloPersonalizado(e.target.value)}
                        placeholder={tipoLista.nome}
                        className="mt-1 w-full px-3 py-1.5 rounded-lg border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Data</label>
                      <input
                        type="date"
                        value={dataAplicacao}
                        onChange={(e) => setDataAplicacao(e.target.value)}
                        className="mt-1 px-3 py-1.5 rounded-lg border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                      />
                    </div>
                    {tipoLista.id === "branco" && (
                      <div>
                        <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Linhas</label>
                        <input
                          type="number" min={5} max={60}
                          value={qtdLinhasBranco}
                          onChange={(e) => setQtdLinhasBranco(Number(e.target.value))}
                          className="mt-1 w-16 px-2 py-1.5 rounded-lg border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        />
                      </div>
                    )}
                    <button
                      onClick={handleGerarPDFTurno}
                      disabled={gerandoTurno || turmasFiltradas.length === 0}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {gerandoTurno ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <DocumentDuplicateIcon className="h-5 w-5" />
                          Gerar PDF — {turnoSelecionado}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── STEP 3: Turma ─── */}
          {turnoSelecionado && (
            <div className="mb-8 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-extrabold">3</span>
                Turma
                <span className="text-xs font-normal text-gray-400 ml-1">(Ano Letivo {ANO_LETIVO})</span>
              </h2>
              {loadingTurmas ? (
                <p className="text-gray-500">Carregando turmas...</p>
              ) : turmasFiltradas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {turmasFiltradas.map((turma) => {
                    const sel = turmaSelecionada?.id === turma.id;
                    return (
                      <button
                        key={turma.id}
                        onClick={() => setTurmaSelecionada(turma)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                          sel
                            ? "bg-green-600 text-white shadow-lg shadow-green-300/40 scale-105"
                            : "bg-gradient-to-b from-blue-100 to-blue-50 text-blue-900 border border-blue-200 hover:shadow-md hover:scale-105"
                        }`}
                      >
                        {turma.turma}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">Nenhuma turma para {turnoSelecionado} no ano letivo {ANO_LETIVO}.</p>
              )}
            </div>
          )}

          {/* ─── STEP 4: Configuração + Gerar PDF ─── */}
          {turmaSelecionada && tipoLista && (
            <div className="animate-fadeIn">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-extrabold">4</span>
                  Configurar e Gerar PDF
                </h3>

                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Título da lista</label>
                    <input
                      type="text"
                      value={tituloPersonalizado}
                      onChange={(e) => setTituloPersonalizado(e.target.value)}
                      placeholder={tipoLista.nome}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Data</label>
                    <input
                      type="date"
                      value={dataAplicacao}
                      onChange={(e) => setDataAplicacao(e.target.value)}
                      className="mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  {tipoLista.id === "branco" && (
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Linhas</label>
                      <input
                        type="number" min={5} max={60}
                        value={qtdLinhasBranco}
                        onChange={(e) => setQtdLinhasBranco(Number(e.target.value))}
                        className="mt-1 w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleGerarPDF}
                    disabled={gerando}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gerando ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <PrinterIcon className="h-5 w-5" />
                        Gerar PDF
                      </>
                    )}
                  </button>
                </div>

                {/* Resumo */}
                <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
                    <span><strong className="text-indigo-700">Tipo:</strong> {tipoLista.nome}</span>
                    <span><strong className="text-indigo-700">Turma:</strong> {turmaSelecionada.turma}</span>
                    <span><strong className="text-indigo-700">Turno:</strong> {turmaSelecionada.turno || turnoSelecionado}</span>
                    <span><strong className="text-indigo-700">Ano Letivo:</strong> {ANO_LETIVO}</span>
                    <span><strong className="text-indigo-700">Data:</strong> {dataAplicacao.split("-").reverse().join("/")}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {"\uD83D\uDCC4"} O PDF será gerado com o cabeçalho institucional completo (logos e informações da escola) e aberto em uma nova aba para visualização e impressão.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
