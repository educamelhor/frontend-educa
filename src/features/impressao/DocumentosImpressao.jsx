// src/features/impressao/DocumentosImpressao.jsx
// ============================================================================
// Módulo DOCUMENTOS — Geração em lote de documentos por turma.
// Por ora: Termo de Consentimento Específico (todos os responsáveis da turma).
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import {
  PrinterIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const ANO_LETIVO = String(new Date().getFullYear());

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// ─── Tipos de documento disponíveis ───
const TIPOS_DOCUMENTO = [
  {
    id: "termo_consentimento",
    nome: "Termo de Consentimento Específico",
    desc: "Gera em lote os Termos de Consentimento (LGPD) de todos os responsáveis da turma selecionada. Cada aluno recebe seu próprio termo, pronto para coleta de assinatura.",
    icon: ShieldCheckIcon,
    color: "from-blue-600 to-indigo-700",
    badge: "LOTE",
  },
];

const TURNOS = ["Matutino", "Vespertino", "Noturno"];

export default function DocumentosImpressao() {
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [gerando, setGerando] = useState(false);

  const [tipoDoc, setTipoDoc] = useState(null);
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  // ─── Buscar turmas do ano letivo atual ───
  useEffect(() => {
    (async () => {
      setLoadingTurmas(true);
      try {
        const escola_id = localStorage.getItem("escola_id") || 1;
        const { data } = await api.get("/api/turmas", { params: { escola_id } });
        setTurmas((data || []).filter((t) => String(t.ano) === ANO_LETIVO));
      } catch {
        setTurmas([]);
      } finally {
        setLoadingTurmas(false);
      }
    })();
  }, []);

  const turmasFiltradas = useMemo(
    () =>
      turmas
        .filter((t) => turnoSelecionado && norm(t.turno) === norm(turnoSelecionado))
        .sort((a, b) => (a.turma || "").localeCompare(b.turma || "", "pt-BR")),
    [turmas, turnoSelecionado]
  );

  // ─── Stepper ───
  const step = !tipoDoc ? 1 : !turnoSelecionado ? 2 : !turmaSelecionada ? 3 : 4;
  const stepLabels = [
    { n: 1, label: "Documento" },
    { n: 2, label: "Turno" },
    { n: 3, label: "Turma" },
    { n: 4, label: "Gerar PDF" },
  ];
  const stepHints = ["Escolha o tipo de documento", "Selecione o turno", "Selecione a turma", "Pronto para gerar!"];

  // ─── Gerar PDF em lote ───
  async function handleGerarPDF() {
    if (!turmaSelecionada || !tipoDoc) return;
    setGerando(true);
    try {
      let url;
      if (tipoDoc.id === "termo_consentimento") {
        url = `/api/termo-consentimento/turma/${turmaSelecionada.id}`;
      }
      const response = await api.get(url, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      console.error("Erro ao gerar documento em lote:", err);
      const status = err?.response?.status;
      if (status === 404) {
        alert("Nenhum aluno encontrado nesta turma. Verifique o cadastro de alunos.");
      } else {
        alert("Erro ao gerar o PDF. Verifique a conexão e tente novamente.");
      }
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ─── HERO HEADER ─── */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-8 md:px-10 md:py-10 mb-8 shadow-xl"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0a4a7a 50%, #1565a0 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative flex items-center gap-5">
          <div className="hidden md:flex h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center shadow-lg">
            <DocumentTextIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl md:text-4xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              📄 Documentos para Impressão
            </h1>
            <p className="mt-1 text-blue-200 text-sm md:text-base">
              Selecione o documento, turno e turma para gerar o PDF em lote.
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
          <span className="ml-3 text-white/70 text-xs hidden sm:inline">{stepHints[step - 1]}</span>
        </div>
      </div>

      {/* ─── STEP 1: Tipo de Documento ─── */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-extrabold">1</span>
          Tipo de Documento
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIPOS_DOCUMENTO.map((doc) => {
            const Icon = doc.icon;
            const sel = tipoDoc?.id === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setTipoDoc(doc);
                  setTurnoSelecionado(null);
                  setTurmaSelecionada(null);
                }}
                className={`group relative overflow-hidden rounded-xl border-2 text-left p-4 transition-all duration-200 ${
                  sel
                    ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-200/50 scale-[1.02]"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${doc.color} flex items-center justify-center flex-shrink-0 shadow`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-bold text-sm ${sel ? "text-blue-800" : "text-gray-900"}`}>{doc.nome}</p>
                      {doc.badge && (
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] rounded-full font-bold uppercase tracking-wider">
                          {doc.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.desc}</p>
                  </div>
                </div>
                {sel && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── STEP 2: Turno ─── */}
      {tipoDoc && (
        <div className="mb-8 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-extrabold">2</span>
            Turno
          </h2>
          <div className="flex flex-wrap gap-3">
            {TURNOS.map((turno) => (
              <button
                key={turno}
                onClick={() => { setTurnoSelecionado(turno); setTurmaSelecionada(null); }}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  turnoSelecionado === turno
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300/40 scale-105"
                    : "bg-white text-indigo-800 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400"
                }`}
              >
                {turno}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP 3: Turma ─── */}
      {tipoDoc && turnoSelecionado && (
        <div className="mb-8 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-extrabold">3</span>
            Turma
            <span className="text-xs font-normal text-gray-400 ml-1">(Ano Letivo {ANO_LETIVO})</span>
          </h2>
          {loadingTurmas ? (
            <div className="flex items-center gap-3 p-4 text-gray-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-green-500" />
              Carregando turmas...
            </div>
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

      {/* ─── STEP 4: Gerar PDF ─── */}
      {tipoDoc && turnoSelecionado && turmaSelecionada && (
        <div className="animate-fadeIn">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold">4</span>
              Gerar Documentos em Lote
            </h3>

            {/* Resumo */}
            <div className="mb-5 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
                <span><strong className="text-blue-700">Documento:</strong> {tipoDoc.nome}</span>
                <span><strong className="text-blue-700">Turma:</strong> {turmaSelecionada.turma}</span>
                <span><strong className="text-blue-700">Turno:</strong> {turnoSelecionado}</span>
                <span><strong className="text-blue-700">Ano Letivo:</strong> {ANO_LETIVO}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                🖨️ O PDF será gerado com <strong>um termo por responsável × aluno</strong>, em sequência, pronto para impressão e coleta de assinaturas.
                Alunos sem responsável cadastrado receberão um termo com campo em branco.
              </p>
            </div>

            <button
              onClick={handleGerarPDF}
              disabled={gerando}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{
                background: gerando
                  ? "#6b7280"
                  : "linear-gradient(135deg, #1e3a5f, #1565a0)",
                boxShadow: gerando ? "none" : "0 4px 14px rgba(21,101,160,0.4)",
              }}
            >
              {gerando ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <PrinterIcon className="h-5 w-5" />
                  Gerar Termos — {turmaSelecionada.turma}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
