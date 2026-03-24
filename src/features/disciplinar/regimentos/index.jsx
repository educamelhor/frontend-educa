// src/features/disciplinar/regimentos/index.jsx
// ============================================================================
// Biblioteca de Regimentos — Módulo Disciplinar
// Exibe documentos oficiais (PDFs) com sumário interativo, viewer embutido
// ============================================================================

import React, { useState, useRef } from "react";
import {
  BookOpenIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ScaleIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/solid";
import { BookOpenIcon as BookOpenOutline } from "@heroicons/react/24/outline";

// ────────────────────────────────────────────────────────────────
// CATÁLOGO DE DOCUMENTOS
// Cada documento contém metadados + sumário para navegação rápida
// ────────────────────────────────────────────────────────────────
const DOCUMENTOS = [
  {
    id: "regulamento",
    titulo: "Regulamento Disciplinar CCMDF",
    subtitulo: "Coordenação de Colégios Militares do Distrito Federal",
    descricao:
      "Regulamento oficial que define as normas disciplinares, direitos e deveres dos alunos, medidas disciplinares e procedimentos aplicáveis nas escolas cívico-militares do DF.",
    arquivo: "/documentos/regulamento_disciplinar_ccmdf.pdf",
    icone: ScaleIcon,
    cor: "#1e3a5f",
    corLight: "#e8edf4",
    paginas: "~30",
    ano: "2024",
    tags: ["Disciplina", "Normas", "CCMDF", "Medidas Disciplinares"],
    sumario: [
      {
        titulo: "CAPÍTULO I — DISPOSIÇÕES PRELIMINARES",
        itens: [
          "Art. 1º — Finalidade",
          "Art. 2º — Abrangência",
          "Art. 3º — Definições",
        ],
      },
      {
        titulo: "CAPÍTULO II — DOS DEVERES DO ALUNO",
        itens: [
          "Art. 4º — Deveres Gerais",
          "Art. 5º — Conduta Escolar",
          "Art. 6º — Uso do Uniforme",
        ],
      },
      {
        titulo: "CAPÍTULO III — DOS DIREITOS DO ALUNO",
        itens: [
          "Art. 7º — Direitos Fundamentais",
          "Art. 8º — Garantias",
        ],
      },
      {
        titulo: "CAPÍTULO IV — DAS MEDIDAS DISCIPLINARES",
        itens: [
          "Art. 9º — Classificação das Medidas",
          "Art. 10 — Medidas Leves",
          "Art. 11 — Medidas Médias",
          "Art. 12 — Medidas Graves",
          "Art. 13 — Suspensão e Transferência",
        ],
      },
      {
        titulo: "CAPÍTULO V — DO SISTEMA DE PONTUAÇÃO",
        itens: [
          "Art. 14 — Pontuação Inicial",
          "Art. 15 — Conceitos de Comportamento",
          "Art. 16 — Registro e Acompanhamento",
        ],
      },
      {
        titulo: "CAPÍTULO VI — DAS DISPOSIÇÕES FINAIS",
        itens: [
          "Art. 17 — Termo de Ajuste de Conduta (TACE)",
          "Art. 18 — Vigência",
        ],
      },
    ],
  },
  {
    id: "manual",
    titulo: "Manual das Escolas Cívico-Militares",
    subtitulo: "Programa Nacional das Escolas Cívico-Militares — PECIM",
    descricao:
      "Manual completo que orienta a implementação e operação do modelo cívico-militar nas escolas públicas, incluindo estrutura organizacional, gestão pedagógica, disciplinar e administrativa.",
    arquivo: "/documentos/manual_escolas_civico_militares.pdf",
    icone: ShieldCheckIcon,
    cor: "#1b5e20",
    corLight: "#e8f5e9",
    paginas: "~100",
    ano: "2024",
    tags: ["PECIM", "Gestão", "Escola Cívico-Militar", "Implementação"],
    sumario: [
      {
        titulo: "PARTE I — FUNDAMENTOS",
        itens: [
          "Apresentação e Objetivos",
          "Base Legal",
          "Princípios Norteadores",
        ],
      },
      {
        titulo: "PARTE II — ESTRUTURA ORGANIZACIONAL",
        itens: [
          "Organograma da Escola",
          "Atribuições do Diretor Pedagógico",
          "Atribuições do Comandante Disciplinar",
          "Equipe Disciplinar",
        ],
      },
      {
        titulo: "PARTE III — GESTÃO PEDAGÓGICA",
        itens: [
          "Currículo e Metodologia",
          "Avaliação e Recuperação",
          "Projeto Político-Pedagógico",
        ],
      },
      {
        titulo: "PARTE IV — GESTÃO DISCIPLINAR",
        itens: [
          "Sistema de Meritocracia",
          "Ocorrências Disciplinares",
          "TACE — Termo de Ajuste de Conduta",
          "Relação com Responsáveis",
        ],
      },
      {
        titulo: "PARTE V — ROTINAS E PROCEDIMENTOS",
        itens: [
          "Formatura e Hasteamento",
          "Uniforme e Apresentação Pessoal",
          "Atividades Extraclasse",
          "Eventos Institucionais",
        ],
      },
      {
        titulo: "PARTE VI — DISPOSIÇÕES GERAIS",
        itens: [
          "Calendário Escolar",
          "Comunicação com a Comunidade",
          "Anexos e Formulários",
        ],
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────
export default function Regimentos() {
  const [docSelecionado, setDocSelecionado] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [sumarioAberto, setSumarioAberto] = useState({});
  const [viewerAberto, setViewerAberto] = useState(false);
  const iframeRef = useRef(null);

  // Toggle sumário
  const toggleSumario = (docId, idx) => {
    const key = `${docId}-${idx}`;
    setSumarioAberto((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtro de documentos
  const docsFiltrados = DOCUMENTOS.filter((doc) => {
    if (!filtro.trim()) return true;
    const termo = filtro
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const campos = [
      doc.titulo,
      doc.subtitulo,
      doc.descricao,
      ...doc.tags,
      ...doc.sumario.flatMap((s) => [s.titulo, ...s.itens]),
    ]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return campos.includes(termo);
  });

  // Abrir PDF no viewer embutido
  const abrirViewer = (doc) => {
    setDocSelecionado(doc);
    setViewerAberto(true);
  };

  // Abrir em nova aba
  const abrirNovaAba = (doc) => {
    window.open(doc.arquivo, "_blank");
  };

  // Download
  const download = (doc) => {
    const a = document.createElement("a");
    a.href = doc.arquivo;
    a.download = doc.arquivo.split("/").pop();
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ══════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-[#1e3a5f] via-[#2c5282] to-[#1e3a5f] text-white px-8 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <BuildingLibraryIcon className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Biblioteca de Regimentos
              </h1>
              <p className="text-blue-200 text-sm mt-0.5">
                Documentos oficiais para consulta — Programa Escola Cívico-Militar
              </p>
            </div>
          </div>

          {/* Barra de pesquisa */}
          <div className="mt-5 relative max-w-xl">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Pesquisar nos documentos, títulos, capítulos..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:bg-white/15 transition-all backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          GRID DE DOCUMENTOS
      ══════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {docsFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <BookOpenOutline className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">
              Nenhum documento encontrado para "{filtro}"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {docsFiltrados.map((doc) => {
              const Icone = doc.icone;
              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Card Header */}
                  <div
                    className="px-6 py-5 flex items-start gap-4"
                    style={{
                      background: `linear-gradient(135deg, ${doc.corLight}, white)`,
                    }}
                  >
                    <div
                      className="p-3 rounded-xl shadow-sm flex-shrink-0"
                      style={{ backgroundColor: doc.cor }}
                    >
                      <Icone className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2
                        className="text-lg font-bold leading-tight"
                        style={{ color: doc.cor }}
                      >
                        {doc.titulo}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">
                        {doc.subtitulo}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {doc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: doc.corLight,
                              color: doc.cor,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-400">
                        {doc.paginas} pág.
                      </span>
                      <span className="text-xs text-gray-400">{doc.ano}</span>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="px-6 py-3 border-t border-gray-50">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {doc.descricao}
                    </p>
                  </div>

                  {/* Sumário Interativo */}
                  <div className="px-6 py-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpenIcon className="w-3.5 h-3.5" />
                      Sumário
                    </p>
                    <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {doc.sumario.map((secao, idx) => {
                        const key = `${doc.id}-${idx}`;
                        const aberto = sumarioAberto[key];
                        return (
                          <div key={idx}>
                            <button
                              onClick={() => toggleSumario(doc.id, idx)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-gray-50 transition-colors group/item"
                            >
                              {aberto ? (
                                <ChevronDownIcon
                                  className="w-3.5 h-3.5 flex-shrink-0"
                                  style={{ color: doc.cor }}
                                />
                              ) : (
                                <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 group-hover/item:text-gray-600" />
                              )}
                              <span
                                className="text-xs font-semibold truncate"
                                style={{ color: aberto ? doc.cor : "#374151" }}
                              >
                                {secao.titulo}
                              </span>
                            </button>
                            {aberto && (
                              <div className="ml-6 pl-3 border-l-2 space-y-0.5 pb-1"
                                style={{ borderColor: doc.corLight }}
                              >
                                {secao.itens.map((item, iIdx) => (
                                  <p
                                    key={iIdx}
                                    className="text-xs text-gray-500 py-0.5 px-2 rounded hover:bg-gray-50 cursor-default transition-colors"
                                  >
                                    {item}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <button
                      onClick={() => abrirViewer(doc)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                      style={{ backgroundColor: doc.cor }}
                    >
                      <BookOpenIcon className="w-4 h-4" />
                      Ler Documento
                    </button>
                    <button
                      onClick={() => abrirNovaAba(doc)}
                      className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm transition-all"
                      title="Abrir em nova aba"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => download(doc)}
                      className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm transition-all"
                      title="Baixar PDF"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nota de rodapé */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-400">
            Documentos oficiais do Programa Nacional das Escolas Cívico-Militares
            (PECIM) e da CCMDF.
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Acervo digital do EDUCA.MELHOR — uso exclusivo para consulta interna.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          VIEWER MODAL (PDF embutido, fullscreen)
      ══════════════════════════════════════════════════════════ */}
      {viewerAberto && docSelecionado && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95 backdrop-blur-sm animate-fadeIn">
          {/* Toolbar */}
          <div
            className="flex items-center gap-4 px-5 py-3 shadow-lg flex-shrink-0"
            style={{
              background: `linear-gradient(90deg, ${docSelecionado.cor}, ${docSelecionado.cor}dd)`,
            }}
          >
            <div className="p-2 bg-white/15 rounded-lg">
              {React.createElement(docSelecionado.icone, {
                className: "w-5 h-5 text-white",
              })}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm truncate">
                {docSelecionado.titulo}
              </h3>
              <p className="text-white/60 text-xs truncate">
                {docSelecionado.subtitulo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => abrirNovaAba(docSelecionado)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Abrir em nova aba"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => download(docSelecionado)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Baixar PDF"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewerAberto(false)}
                className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition ml-2"
                title="Fechar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PDF Iframe */}
          <div className="flex-1 relative">
            <iframe
              ref={iframeRef}
              src={docSelecionado.arquivo}
              className="absolute inset-0 w-full h-full border-0"
              title={docSelecionado.titulo}
            />
          </div>
        </div>
      )}

      {/* Estilos inline para animação e scrollbar */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
