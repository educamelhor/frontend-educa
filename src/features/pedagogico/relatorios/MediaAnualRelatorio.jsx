// src/features/pedagogico/relatorios/MediaAnualRelatorio.jsx
// ============================================================================
// Relatório Pedagógico — Média Anual e Pontos Faltantes por Turma
//
// Fluxo:
//   1. Selecionar Ano Letivo e Turno (Matutino, Vespertino, Noturno)
//   2. Selecionar Turma
//   3. Alternar entre "Média Anual" e "Pontos Faltantes" (meta 5,00)
//   4. Botão PDF institucional para download do arquivo oficial (A4 Paisagem)
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

// ── Utilitários ─────────────────────────────────────────────────────────────
function anoLetivoPadrao() {
  const hoje = new Date();
  return hoje.getMonth() + 1 <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

function normalizaTexto(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function calcularPontosFaltantes(media, soma) {
  if (media === null || media === undefined || isNaN(media)) return null;
  if (media >= 5.0) return 0;
  const somaAtual = soma !== undefined && soma !== null ? soma : (media * 4);
  const faltam = Math.max(0, 20.0 - somaAtual);
  return Number(faltam.toFixed(1));
}

function corCelulaMedia(media) {
  if (media === null || media === undefined || isNaN(media)) {
    return { bg: "#f8fafc", text: "#94a3b8", border: "#e2e8f0" };
  }
  if (media >= 7) return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  if (media < 5)  return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
  return { bg: "#f8fafc", text: "#374151", border: "#e2e8f0" };
}

function corCelulaPontos(pontosFaltantes, media) {
  if (media === null || media === undefined || isNaN(media)) {
    return { bg: "#f8fafc", text: "#94a3b8", border: "#e2e8f0" };
  }
  if (pontosFaltantes === 0) {
    return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  }
  return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
}

export default function MediaAnualRelatorio() {
  const navigate = useNavigate();

  // Dados da Escola
  const [nomeEscola, setNomeEscola] = useState("CENTRO DE ENSINO FUNDAMENTAL 04 – COLÉGIO CÍVICO MILITAR");

  // Filtros principais
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  // Modo da Tabela: Média Anual vs Pontos Faltantes
  const [modoPontosFaltantes, setModoPontosFaltantes] = useState(false);

  // Dados da Turma
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [alunos, setAlunos] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [medias, setMedias] = useState({});
  const [somas, setSomas] = useState({});
  const [erroMedia, setErroMedia] = useState(null);

  // Estado de geração de PDF
  const [gerandoPDF, setGerandoPDF] = useState(false);

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  // ── 0. Nome da escola ──────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("nome_escola");
    if (saved && saved !== "Escola não definida") {
      setNomeEscola(saved);
    }
  }, []);

  // ── 1. Anos Letivos ────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/api/matriculas/anos")
      .then(r => setAnosLetivos(Array.isArray(r.data) ? r.data : [anoLetivoPadrao()]))
      .catch(() => setAnosLetivos([anoLetivoPadrao()]));
  }, []);

  // ── 2. Turmas ──────────────────────────────────────────────────────────────
  const fetchTurmas = useCallback(async () => {
    setLoadingTurmas(true);
    try {
      const escola_id = localStorage.getItem("escola_id") || 1;
      const { data } = await api.get("/api/turmas", {
        params: { escola_id, ano: anoLetivo },
      });
      setTurmas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[MediaAnualRelatorio] Erro ao buscar turmas:", err);
      setTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  }, [anoLetivo]);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  // Turmas filtradas por turno e ordenadas
  const turmasFiltradas = turmas
    .filter(t => turnoSelecionado && normalizaTexto(t.turno) === normalizaTexto(turnoSelecionado))
    .sort((a, b) => (a.turma || a.nome || "").localeCompare(b.turma || b.nome || ""));

  // ── 3. Carregar Médias Anuais da Turma ──────────────────────────────────────
  const carregarMediaAnual = useCallback(async () => {
    if (!turmaSelecionada?.id) return;
    setLoadingMedia(true);
    setErroMedia(null);
    try {
      const { data } = await api.get(`/notas/turmas/${turmaSelecionada.id}/media-anual`, {
        params: { ano: anoLetivo },
      });
      if (data?.ok) {
        setAlunos(data.alunos || []);
        setDisciplinas(data.disciplinas || []);
        setMedias(data.medias || {});
        setSomas(data.somas || {});
      } else {
        setErroMedia("Não foi possível carregar a média anual desta turma.");
      }
    } catch (err) {
      console.error("[MediaAnualRelatorio] Erro:", err);
      setErroMedia("Erro ao carregar dados da turma. Tente novamente.");
    } finally {
      setLoadingMedia(false);
    }
  }, [turmaSelecionada?.id, anoLetivo]);

  useEffect(() => {
    if (turmaSelecionada?.id) {
      carregarMediaAnual();
    }
  }, [carregarMediaAnual, turmaSelecionada?.id]);

  // ── Handlers de seleção ───────────────────────────────────────────────────
  const handleTurnoClick = (turno) => {
    setTurnoSelecionado(turno);
    setTurmaSelecionada(null);
    setAlunos([]);
    setDisciplinas([]);
    setMedias({});
    setSomas({});
  };

  const handleTurmaClick = (turma) => {
    setTurmaSelecionada(turma);
  };

  // ── Gerar / Baixar PDF ────────────────────────────────────────────────────
  const handleImprimirPDF = async () => {
    if (!turmaSelecionada?.id || gerandoPDF) return;
    setGerandoPDF(true);
    try {
      const resp = await api.get(`/notas/turmas/${turmaSelecionada.id}/media-anual/pdf`, {
        params: {
          ano: anoLetivo,
          modo: modoPontosFaltantes ? "faltantes" : "media",
        },
        responseType: "blob",
        timeout: 90000,
      });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTurmaNome = (turmaSelecionada?.turma || turmaSelecionada?.nome || "turma")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");
      const prefixo = modoPontosFaltantes ? "Pontos_Faltantes" : "Media_Anual";
      link.setAttribute("download", `${prefixo}_${safeTurmaNome}_${anoLetivo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("[MediaAnualRelatorio] Erro ao gerar PDF:", err);
      alert("Não foi possível gerar o PDF pelo servidor. Tente novamente.");
    } finally {
      setGerandoPDF(false);
    }
  };

  const turmaNome = turmaSelecionada?.turma || turmaSelecionada?.nome || "";

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse-gold-media {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(234,179,8,0.6)); transform: scale(1); }
          50%       { filter: drop-shadow(0 0 7px rgba(234,179,8,1));   transform: scale(1.15); }
        }

        /* ── Estilos de Impressão Oficial (A4 Paisagem) ── */
        @media print {
          @page {
            size: landscape;
            margin: 8mm 10mm;
          }

          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            overflow: visible !important;
          }

          .no-print {
            display: none !important;
          }

          .printable-card {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          .table-scroll-container {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            scrollbar-width: none !important;
          }

          .table-scroll-container::-webkit-scrollbar {
            display: none !important;
          }

          .table-scroll-container *, th, td {
            position: static !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
            font-size: 8pt !important;
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 4px 4px !important;
            font-size: 8pt !important;
          }

          th {
            background-color: #1e3a8a !important;
            color: #ffffff !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="p-4 md:p-6" style={{ minHeight: "100vh", fontFamily: "Montserrat, 'Inter', sans-serif" }}>

        {/* ── Voltar aos relatórios ───────────────────────────────────────── */}
        <div className="no-print mb-4">
          <button
            onClick={() => navigate("/pedagogico/relatorios")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#1e3a8a",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#eff6ff"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar aos Relatórios
          </button>
        </div>

        {/* ── Título Principal ────────────────────────────────────────────── */}
        <div className="no-print">
          <h1
            className="text-4xl md:text-5xl font-bold text-center text-blue-900 mb-6"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Média Anual
          </h1>

          {/* Filtro de Ano Letivo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
              <label htmlFor="filtro-ano" className="text-sm font-semibold text-gray-700">
                Ano Letivo:
              </label>
              <select
                id="filtro-ano"
                value={anoLetivo}
                onChange={(e) => {
                  setAnoLetivo(Number(e.target.value));
                  setTurnoSelecionado(null);
                  setTurmaSelecionada(null);
                  setAlunos([]);
                  setDisciplinas([]);
                  setMedias({});
                  setSomas({});
                }}
                className="border rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {anosLetivos.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Botões de Turnos (Matutino, Vespertino, Noturno) */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {turnos.map((turno) => {
              const ativo = turnoSelecionado === turno;
              return (
                <button
                  key={turno}
                  onClick={() => handleTurnoClick(turno)}
                  className={`px-8 py-3.5 text-lg font-semibold rounded-xl shadow-md transition transform hover:scale-105 ${
                    ativo
                      ? "bg-green-600 text-white"
                      : "bg-white text-blue-800 border border-blue-400 hover:bg-blue-100"
                  }`}
                >
                  {turno}
                </button>
              );
            })}
          </div>

          {/* Cards de Turmas */}
          {turnoSelecionado && (
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {loadingTurmas ? (
                <p className="w-full text-center text-gray-500">
                  Carregando turmas...
                </p>
              ) : turmasFiltradas.length > 0 ? (
                turmasFiltradas.map((turma) => {
                  const isSelected = turmaSelecionada?.id === turma.id;
                  return (
                    <div
                      key={turma.id}
                      onClick={() => handleTurmaClick(turma)}
                      className={`bg-gradient-to-b from-blue-200 to-blue-50 rounded-lg px-6 py-3 shadow-md cursor-pointer hover:shadow-xl transition-transform hover:scale-105 text-center font-bold text-blue-900 text-base flex items-center justify-center whitespace-nowrap min-w-[120px] ${
                        isSelected ? "ring-2 ring-green-600 border-2 border-green-600" : ""
                      }`}
                    >
                      {turma.turma || turma.nome}
                    </div>
                  );
                })
              ) : (
                <p className="w-full text-center text-gray-500">
                  Nenhuma turma encontrada no turno {turnoSelecionado} para o ano {anoLetivo}.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Documento Oficial do Relatório (quando turma selecionada) ── */}
        {turmaSelecionada && (
          <div
            className="printable-card"
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "1350px",
              margin: "0 auto 40px",
              boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
              {/* ── Top Bar Interativa: Alternância Média / Pontos + Botão PDF ── */}
              <div
                className="no-print"
                style={{
                  background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  color: "#ffffff",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#bfdbfe" }}>
                    {modoPontosFaltantes ? "Cálculo de Pontos Faltantes (Meta 5,00)" : "Média Anual Acumulada"}
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, marginTop: 2 }}>
                    Turma {turmaNome}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#93c5fd", marginTop: 2 }}>
                    {modoPontosFaltantes
                      ? `Pontos faltantes para atingir média 5,0 (Meta anual: 20 pontos) · Ano Letivo ${anoLetivo}`
                      : `Média acumulada (Soma dos bimestres ÷ 4) · Ano Letivo ${anoLetivo}`}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {/* Botão Alternar: Média Anual <-> Pontos Faltantes */}
                  <button
                    onClick={() => setModoPontosFaltantes(prev => !prev)}
                    style={{
                      background: modoPontosFaltantes ? "#ffffff" : "rgba(255,255,255,0.18)",
                      border: modoPontosFaltantes ? "2px solid #ffffff" : "1.5px solid rgba(255,255,255,0.4)",
                      borderRadius: "8px",
                      color: modoPontosFaltantes ? "#1e3a8a" : "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      padding: "8px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      cursor: "pointer",
                      boxShadow: modoPontosFaltantes ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                      transition: "all 0.15s",
                    }}
                    title={modoPontosFaltantes ? "Voltar para cálculo de Média Anual" : "Calcular pontos faltantes para atingir a média mínima de 5,00"}
                  >
                    <span>{modoPontosFaltantes ? "📈 Média Anual" : "🎯 Pontos faltantes"}</span>
                  </button>

                  {/* Botão com ícone de impressora e texto "PDF" */}
                  <button
                    onClick={handleImprimirPDF}
                    disabled={gerandoPDF}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      cursor: gerandoPDF ? "not-allowed" : "pointer",
                      border: "2px solid #ffffff",
                      backgroundColor: "#ffffff",
                      color: "#1e3a8a",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                      opacity: gerandoPDF ? 0.75 : 1,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!gerandoPDF) e.currentTarget.style.backgroundColor = "#f0f4ff"; }}
                    onMouseLeave={e => { if (!gerandoPDF) e.currentTarget.style.backgroundColor = "#ffffff"; }}
                    title={`Baixar PDF Institucional (${modoPontosFaltantes ? "Pontos Faltantes" : "Média Anual"})`}
                  >
                    {gerandoPDF ? (
                      <>
                        <svg
                          style={{ animation: "spin 1s linear infinite", width: 16, height: 16 }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round" opacity="0.4" />
                          <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9V2h12v7" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        <span>PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ── CABEÇALHO INSTITUCIONAL PREMIUM (Padrão Oficial do Sistema) ── */}
              <div
                style={{
                  padding: "20px 24px 14px",
                  backgroundColor: "#ffffff",
                  position: "relative",
                }}
              >
                {/* Linhas institucionais duplas (Dourada + Azul) */}
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "2.5px",
                  backgroundColor: "#b8860b", // Dourado oficial
                }} />
                <div style={{
                  position: "absolute",
                  bottom: -2.5,
                  left: 0,
                  right: 0,
                  height: "1px",
                  backgroundColor: "#1e3a5f", // Azul oficial
                }} />

                {/* Grade de Logos e Textos Oficiais */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}>
                  {/* Logo Esquerda (Brasão DF / Educa Melhor) */}
                  <div style={{ width: 70, height: 70, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img
                      src="/logo-escola-left.png"
                      alt="Brasão Institucional"
                      style={{ maxHeight: 66, maxWidth: 66, objectFit: "contain" }}
                      onError={(e) => {
                        if (!e.currentTarget.dataset.tried) {
                          e.currentTarget.dataset.tried = "true";
                          e.currentTarget.src = "/LOGO_EDUCA_MELHOR.jpeg";
                        }
                      }}
                    />
                  </div>

                  {/* Textos Centrais Institucionais */}
                  <div style={{ textAlign: "center", flex: 1, lineHeight: 1.25, padding: "0 8px" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e3a5f", letterSpacing: "0.6px" }}>
                      GOVERNO DO DISTRITO FEDERAL
                    </div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1e3a5f", letterSpacing: "0.3px" }}>
                      SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL
                    </div>
                    <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#1e3a5f" }}>
                      COORDENAÇÃO REGIONAL DE ENSINO DE PLANALTINA
                    </div>
                    <div style={{ fontSize: "0.98rem", fontWeight: 900, color: "#1e3a5f", margin: "2px 0 1px", letterSpacing: "-0.2px" }}>
                      {nomeEscola}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#555555" }}>
                      INEP 53006160
                    </div>
                  </div>

                  {/* Logo Direita (Brasão da Escola / CCMDF) */}
                  <div style={{ width: 70, height: 70, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img
                      src="/logo-escola-right.png"
                      alt="Brasão Escola"
                      style={{ maxHeight: 66, maxWidth: 66, objectFit: "contain" }}
                      onError={(e) => {
                        if (!e.currentTarget.dataset.tried) {
                          e.currentTarget.dataset.tried = "true";
                          e.currentTarget.src = "/LOGO_CCMDF.jpg";
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Faixa de Identificação do Documento Impresso */}
                <div style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  fontSize: "0.8rem",
                }}>
                  <div>
                    <span style={{ fontWeight: 900, color: "#1e3a8a", fontSize: "0.88rem", letterSpacing: "0.2px" }}>
                      {modoPontosFaltantes ? "PONTOS FALTANTES — META 5,00" : "MÉDIA ANUAL ACUMULADA"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                    <span>TURMA: <strong style={{ color: "#1e3a8a" }}>{turmaNome}</strong></span>
                    <span>TURNO: <strong style={{ color: "#1e3a8a" }}>{(turmaSelecionada.turno || turnoSelecionado || "").toUpperCase()}</strong></span>
                    <span>ANO LETIVO: <strong style={{ color: "#1e3a8a" }}>{anoLetivo}</strong></span>
                    <span style={{ color: "#64748b" }}>EMISSÃO: {new Date().toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>

              {/* ── Legenda de Cores ─────────────────────────────────────────── */}
              <div style={{
                padding: "10px 24px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
                alignItems: "center",
              }}>
                {modoPontosFaltantes ? (
                  [
                    { cor: "#dcfce7", borda: "#86efac", texto: "#15803d", label: "✓ Meta atingida (Média ≥ 5,0)" },
                    { cor: "#fee2e2", borda: "#fca5a5", texto: "#b91c1c", label: "Pontos faltantes para média 5,0" },
                  ].map(({ cor, borda, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        display: "inline-block", width: 14, height: 14, borderRadius: 3,
                        backgroundColor: cor, border: `2px solid ${borda}`,
                      }} />
                      <span style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 600 }}>{label}</span>
                    </div>
                  ))
                ) : (
                  [
                    { cor: "#dcfce7", borda: "#86efac", texto: "#15803d", label: "Média ≥ 7,0 — destaque" },
                    { cor: "#fee2e2", borda: "#fca5a5", texto: "#b91c1c", label: "Média < 5,0 — atenção" },
                    { cor: "#f8fafc", borda: "#e2e8f0", texto: "#374151", label: "5,0 ≤ Média < 7,0 — regular" },
                  ].map(({ cor, borda, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        display: "inline-block", width: 14, height: 14, borderRadius: 3,
                        backgroundColor: cor, border: `2px solid ${borda}`,
                      }} />
                      <span style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 600 }}>{label}</span>
                    </div>
                  ))
                )}
                <span className="no-print" style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: "auto", fontStyle: "italic" }}>
                  👁️ Visão consolidada · Somente leitura
                </span>
              </div>

              {/* ── Tabela de Médias Anuais / Pontos Faltantes ─────────────────── */}
              <div className="table-scroll-container" style={{ overflowX: "auto", padding: "0 0 12px" }}>
                {loadingMedia ? (
                  <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
                    <div style={{ fontWeight: 600 }}>Carregando dados da turma...</div>
                  </div>
                ) : erroMedia ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#b91c1c" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚠️</div>
                    <div style={{ fontWeight: 600 }}>{erroMedia}</div>
                    <button
                      onClick={carregarMediaAnual}
                      className="no-print"
                      style={{ marginTop: 12, padding: "6px 16px", borderRadius: 6, backgroundColor: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : alunos.length === 0 ? (
                  <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 12 }}>📋</div>
                    <div style={{ fontWeight: 600 }}>Nenhum aluno matriculado encontrado nesta turma.</div>
                  </div>
                ) : disciplinas.length === 0 ? (
                  <div style={{ padding: 50, textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 14 }}>📭</div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#374151", marginBottom: 8 }}>
                      Nenhuma média encontrada para esta turma no ano {anoLetivo}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: 20, maxWidth: 380, margin: "0 auto 20px" }}>
                      As médias anuais aparecem aqui após os professores exportarem os diários bimestrais.
                    </div>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ background: "#1e3a8a", color: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
                        <th style={{
                          padding: "10px 10px", textAlign: "center", fontWeight: 800,
                          width: 38, borderRight: "1px solid rgba(255,255,255,0.15)",
                        }}>
                          Nº
                        </th>
                        <th style={{
                          padding: "10px 14px", textAlign: "left", fontWeight: 800,
                          position: "sticky", left: 0, background: "#1e3a8a", zIndex: 11,
                          minWidth: 240, borderRight: "2px solid rgba(255,255,255,0.2)",
                        }}>
                          Estudante
                        </th>
                        {disciplinas.map(disc => (
                          <th
                            key={disc.id}
                            title={disc.nome}
                            style={{
                              padding: "10px 6px",
                              textAlign: "center",
                              fontWeight: 700,
                              minWidth: 72,
                              borderRight: "1px solid rgba(255,255,255,0.12)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 100,
                              fontSize: "0.72rem",
                            }}
                          >
                            {disc.abreviatura || disc.nome}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alunos.map((aluno, rowIdx) => {
                        const mediasAluno = disciplinas
                          .map(d => medias[`${aluno.id}_${d.id}`])
                          .filter(m => m !== undefined && m !== null);

                        const isDestaque = modoPontosFaltantes
                          ? mediasAluno.length > 0 && mediasAluno.every(m => m >= 5.0)
                          : mediasAluno.length > 0 && mediasAluno.every(m => m >= 7.0);

                        const rowBg = rowIdx % 2 === 0 ? "#fff" : "#f8fafc";
                        const nSeq = String(rowIdx + 1).padStart(2, "0");

                        return (
                          <tr
                            key={aluno.id}
                            style={{ backgroundColor: isDestaque ? "#f0fdf4" : rowBg }}
                          >
                            {/* Número Sequencial */}
                            <td style={{
                              padding: "8px 4px",
                              textAlign: "center",
                              fontWeight: 700,
                              fontSize: "0.74rem",
                              color: "#64748b",
                              borderRight: "1px solid #e2e8f0",
                              borderBottom: "1px solid #f1f5f9",
                            }}>
                              {nSeq}
                            </td>

                            {/* Nome do Estudante — fixo à esquerda */}
                            <td style={{
                              padding: "8px 14px",
                              fontWeight: 600,
                              color: isDestaque ? "#15803d" : "#1e293b",
                              position: "sticky",
                              left: 0,
                              backgroundColor: isDestaque ? "#f0fdf4" : rowBg,
                              zIndex: 5,
                              borderRight: "2px solid #e2e8f0",
                              borderBottom: "1px solid #f1f5f9",
                            }}>
                              {isDestaque && (
                                <span
                                  title={modoPontosFaltantes ? "Meta atingida em todas as disciplinas" : "Aluno destaque: todas as médias anuais ≥ 7,0"}
                                  style={{
                                    fontSize: "0.95rem",
                                    lineHeight: 1,
                                    marginRight: 6,
                                  }}
                                >
                                  {modoPontosFaltantes ? "✓" : "🏅"}
                                </span>
                              )}
                              <span>{aluno.nome}</span>
                            </td>

                            {/* Células de Notas / Pontos */}
                            {disciplinas.map(disc => {
                              const key = `${aluno.id}_${disc.id}`;
                              const media = medias[key];
                              const soma = somas[key];
                              const pontosFaltantes = calcularPontosFaltantes(media, soma);

                              const cor = modoPontosFaltantes
                                ? corCelulaPontos(pontosFaltantes, media)
                                : corCelulaMedia(media);

                              let cellTitle = "Sem notas lançadas";
                              if (media !== undefined && media !== null) {
                                cellTitle = modoPontosFaltantes
                                  ? pontosFaltantes === 0
                                    ? `Meta atingida! Média atual: ${media.toFixed(1)}`
                                    : `Faltam ${pontosFaltantes.toFixed(1)} pontos para atingir média 5,0 (Média atual: ${media.toFixed(1)})`
                                  : `Média Anual: ${media.toFixed(1)}`;
                              }

                              return (
                                <td
                                  key={disc.id}
                                  title={cellTitle}
                                  style={{
                                    padding: "7px 6px",
                                    textAlign: "center",
                                    fontWeight: 700,
                                    fontSize: "0.82rem",
                                    borderBottom: "1px solid #f1f5f9",
                                    borderRight: "1px solid #f1f5f9",
                                    backgroundColor: cor.bg,
                                    color: cor.text,
                                  }}
                                >
                                  {media !== undefined && media !== null ? (
                                    modoPontosFaltantes ? (
                                      pontosFaltantes === 0 ? (
                                        <span style={{ fontSize: "1.05rem", fontWeight: 900, color: "#15803d", lineHeight: 1 }}>
                                          ✓
                                        </span>
                                      ) : (
                                        pontosFaltantes.toFixed(1).replace(".", ",")
                                      )
                                    ) : (
                                      media.toFixed(1).replace(".", ",")
                                    )
                                  ) : (
                                    <span style={{ color: "#cbd5e1", fontSize: "0.7rem" }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {/* Linha de Resumo */}
                      <tr style={{ background: "#fee2e2", borderTop: "2px solid #fca5a5" }}>
                        <td
                          colSpan={2}
                          style={{
                            padding: "9px 14px",
                            textAlign: "right",
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            color: "#b91c1c",
                            borderRight: "2px solid #fca5a5",
                          }}
                        >
                          {modoPontosFaltantes ? "TOTAL COM PONTOS FALTANTES (< 5,0):" : "TOTAL ABAIXO DA MÉDIA (< 5,0):"}
                        </td>
                        {disciplinas.map(disc => {
                          let countAbaixo = 0;
                          for (const a of alunos) {
                            const val = medias[`${a.id}_${disc.id}`];
                            if (val !== undefined && val !== null && Number(val) < 5.0) {
                              countAbaixo++;
                            }
                          }
                          return (
                            <td
                              key={disc.id}
                              style={{
                                padding: "9px 6px",
                                textAlign: "center",
                                fontWeight: 800,
                                fontSize: "0.82rem",
                                color: "#b91c1c",
                                borderRight: "1px solid #fca5a5",
                              }}
                            >
                              {countAbaixo}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* ── Barra de Status Inferior ────────────────────────────────── */}
              <div style={{
                padding: "10px 24px",
                borderTop: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                fontSize: "0.75rem",
                color: "#64748b",
              }}>
                <div>
                  <strong>{alunos.length}</strong> estudantes matriculados • <strong>{disciplinas.length}</strong> disciplinas registradas
                </div>
                <div style={{ fontStyle: "italic" }}>
                  {modoPontosFaltantes
                    ? "✓ = Aluno atingiu a média mínima de 5,00 · Valores numéricos indicam pontos que faltam somar"
                    : "Média Anual calculada continuamente com base na soma dos diários exportados dividida por 4"}
                </div>
              </div>
            </div>
        )}
      </div>
    </>
  );
}
