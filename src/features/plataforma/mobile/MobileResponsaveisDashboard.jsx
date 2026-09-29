// src/features/plataforma/mobile/MobileResponsaveisDashboard.jsx
// ============================================================================
// CEO Dashboard — Telemetria & Analytics do EDUCA MOBILE (Responsáveis)
// Master-Detail Interativo: Seleção por Apelido da Escola + Telemetria Detalhada
// ============================================================================
import React, { useState, useEffect } from "react";
import api from "../../../services/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = (n) => Number(n || 0).toLocaleString("pt-BR");

// ── Mock data de alta fidelidade ──────────────────────────────────────────────
const MOCK_ESCOLAS_RESPONSAVEIS = [
  {
    id: 1,
    nome: "Centro de Ensino Fundamental 04 de Planaltina",
    apelido: "CEF04-CCMDF",
    cidade: "Planaltina",
    estado: "DF",
    tipo: ["CCMDF", "Anos Finais"],
    status: "ativa",
    total_responsaveis: 1350,
    responsaveis_app: 1120,
    acessos_hoje: 184,
    acessos_7d: 1420,
    acessos_30d: 5890,
    android_pct: 84,
    ios_pct: 16,
    top_cards: [
      { label: "Boletim Escolar", cliques: 2708, pct: 46, color: "#38bdf8" },
      { label: "Registros Disciplinares", cliques: 1649, pct: 28, color: "#818cf8" },
      { label: "Frequência & Atestados", cliques: 942, pct: 16, color: "#34d399" },
      { label: "Comunicados & Avisos", cliques: 591, pct: 10, color: "#f59e0b" },
    ],
    historico_7d: [
      { dia: "Seg", total: 195 },
      { dia: "Ter", total: 210 },
      { dia: "Qua", total: 188 },
      { dia: "Qui", total: 245 },
      { dia: "Sex", total: 220 },
      { dia: "Sáb", total: 178 },
      { dia: "Dom", total: 184 },
    ],
    pico_horario: "18:00 - 21:00 (Noite)",
    ultimo_acesso: "Hoje às 20:42",
  },
  {
    id: 3,
    nome: "Centro Educacional Pompilio Marques de Sousa",
    apelido: "POMPÍLIO",
    cidade: "Planaltina",
    estado: "DF",
    tipo: ["Anos Finais", "Ensino Médio", "Integral"],
    status: "ativa",
    total_responsaveis: 820,
    responsaveis_app: 640,
    acessos_hoje: 92,
    acessos_7d: 780,
    acessos_30d: 3120,
    android_pct: 79,
    ios_pct: 21,
    top_cards: [
      { label: "Boletim Escolar", cliques: 1310, pct: 42, color: "#38bdf8" },
      { label: "Comunicados & Avisos", cliques: 967, pct: 31, color: "#f59e0b" },
      { label: "Biblioteca & Livros", cliques: 468, pct: 15, color: "#ec4899" },
      { label: "Frequência & Atestados", cliques: 375, pct: 12, color: "#34d399" },
    ],
    historico_7d: [
      { dia: "Seg", total: 110 },
      { dia: "Ter", total: 125 },
      { dia: "Qua", total: 105 },
      { dia: "Qui", total: 130 },
      { dia: "Sex", total: 118 },
      { dia: "Sáb", total: 100 },
      { dia: "Dom", total: 92 },
    ],
    pico_horario: "17:30 - 20:30 (Fim de tarde)",
    ultimo_acesso: "Hoje às 19:30",
  },
  {
    id: 10000,
    nome: "Centro de Ensino Fundamental 01 de Riacho Fundo II",
    apelido: "CCM - CEF01 RF2",
    cidade: "Riacho Fundo II",
    estado: "DF",
    tipo: ["CCMDF", "Anos Finais"],
    status: "ativa",
    total_responsaveis: 1890,
    responsaveis_app: 1530,
    acessos_hoje: 245,
    acessos_7d: 1940,
    acessos_30d: 7940,
    android_pct: 86,
    ios_pct: 14,
    top_cards: [
      { label: "Boletim Escolar", cliques: 3811, pct: 48, color: "#38bdf8" },
      { label: "Frequência & Atestados", cliques: 2064, pct: 26, color: "#34d399" },
      { label: "Registros Disciplinares", cliques: 1429, pct: 18, color: "#818cf8" },
      { label: "Notícias da Escola", cliques: 636, pct: 8, color: "#a855f7" },
    ],
    historico_7d: [
      { dia: "Seg", total: 270 },
      { dia: "Ter", total: 295 },
      { dia: "Qua", total: 280 },
      { dia: "Qui", total: 310 },
      { dia: "Sex", total: 290 },
      { dia: "Sáb", total: 250 },
      { dia: "Dom", total: 245 },
    ],
    pico_horario: "19:00 - 22:00 (Noite)",
    ultimo_acesso: "Hoje às 20:55",
  },
  {
    id: 10004,
    nome: "Centro de Ensino Fundamental 04 do Guará",
    apelido: "CEF04_GUARA",
    cidade: "Guará",
    estado: "DF",
    tipo: ["Anos Finais"],
    status: "ativa",
    total_responsaveis: 940,
    responsaveis_app: 710,
    acessos_hoje: 110,
    acessos_7d: 890,
    acessos_30d: 3450,
    android_pct: 75,
    ios_pct: 25,
    top_cards: [
      { label: "Boletim Escolar", cliques: 1518, pct: 44, color: "#38bdf8" },
      { label: "Carteirinha Digital", cliques: 828, pct: 24, color: "#a855f7" },
      { label: "Notícias & Eventos", cliques: 655, pct: 19, color: "#38bdf8" },
      { label: "Frequência Escolar", cliques: 449, pct: 13, color: "#34d399" },
    ],
    historico_7d: [
      { dia: "Seg", total: 120 },
      { dia: "Ter", total: 140 },
      { dia: "Qua", total: 130 },
      { dia: "Qui", total: 150 },
      { dia: "Sex", total: 135 },
      { dia: "Sáb", total: 105 },
      { dia: "Dom", total: 110 },
    ],
    pico_horario: "12:00 - 14:00 (Almoço)",
    ultimo_acesso: "Hoje às 18:20",
  },
  {
    id: 10005,
    nome: "Centro de Ensino Fundamental 01 do Lago Norte",
    apelido: "CELAN",
    cidade: "Brasília",
    estado: "DF",
    tipo: ["CCMDF", "Anos Finais"],
    status: "ativa",
    total_responsaveis: 610,
    responsaveis_app: 540,
    acessos_hoje: 88,
    acessos_7d: 690,
    acessos_30d: 2890,
    android_pct: 68,
    ios_pct: 32,
    top_cards: [
      { label: "Boletim Escolar", cliques: 1156, pct: 40, color: "#38bdf8" },
      { label: "Registros Disciplinares", cliques: 924, pct: 32, color: "#818cf8" },
      { label: "Biblioteca & Livros", cliques: 462, pct: 16, color: "#ec4899" },
      { label: "Frequência Escolar", cliques: 348, pct: 12, color: "#34d399" },
    ],
    historico_7d: [
      { dia: "Seg", total: 95 },
      { dia: "Ter", total: 108 },
      { dia: "Qua", total: 99 },
      { dia: "Qui", total: 115 },
      { dia: "Sex", total: 102 },
      { dia: "Sáb", total: 83 },
      { dia: "Dom", total: 88 },
    ],
    pico_horario: "19:00 - 21:30 (Noite)",
    ultimo_acesso: "Hoje às 19:48",
  },
  {
    id: 10007,
    nome: "Centro Educacional 416 da Santa Maria",
    apelido: "CED 416",
    cidade: "Santa Maria",
    estado: "DF",
    tipo: ["Ensino Médio", "Anos Finais"],
    status: "ativa",
    total_responsaveis: 1420,
    responsaveis_app: 980,
    acessos_hoje: 140,
    acessos_7d: 1120,
    acessos_30d: 4620,
    android_pct: 88,
    ios_pct: 12,
    top_cards: [
      { label: "Boletim Escolar", cliques: 2402, pct: 52, color: "#38bdf8" },
      { label: "Frequência & Faltas", cliques: 1155, pct: 25, color: "#34d399" },
      { label: "Comunicados & Avisos", cliques: 646, pct: 14, color: "#f59e0b" },
      { label: "Horários de Aulas", cliques: 417, pct: 9, color: "#818cf8" },
    ],
    historico_7d: [
      { dia: "Seg", total: 160 },
      { dia: "Ter", total: 175 },
      { dia: "Qua", total: 155 },
      { dia: "Qui", total: 185 },
      { dia: "Sex", total: 165 },
      { dia: "Sáb", total: 140 },
      { dia: "Dom", total: 140 },
    ],
    pico_horario: "18:30 - 21:00 (Noite)",
    ultimo_acesso: "Hoje às 17:10",
  },
  {
    id: 10002,
    nome: "Centro Educacional Stella dos Cherubins",
    apelido: "STELLA",
    cidade: "Planaltina",
    estado: "DF",
    tipo: ["Anos Finais"],
    status: "ativa",
    total_responsaveis: 780,
    responsaveis_app: 610,
    acessos_hoje: 95,
    acessos_7d: 740,
    acessos_30d: 2980,
    android_pct: 81,
    ios_pct: 19,
    top_cards: [
      { label: "Boletim Escolar", cliques: 1341, pct: 45, color: "#38bdf8" },
      { label: "Frequência & Atestados", cliques: 804, pct: 27, color: "#34d399" },
      { label: "Carteirinha Digital", cliques: 476, pct: 16, color: "#a855f7" },
      { label: "Avisos Gerais", cliques: 359, pct: 12, color: "#f59e0b" },
    ],
    historico_7d: [
      { dia: "Seg", total: 102 },
      { dia: "Ter", total: 118 },
      { dia: "Qua", total: 110 },
      { dia: "Qui", total: 122 },
      { dia: "Sex", total: 110 },
      { dia: "Sáb", total: 83 },
      { dia: "Dom", total: 95 },
    ],
    pico_horario: "19:00 - 21:00 (Noite)",
    ultimo_acesso: "Hoje às 18:40",
  },
  {
    id: 10009,
    nome: "Centro de Ensino Fundamental 113 do Recanto das Emas",
    apelido: "CEF 113",
    cidade: "Recanto das Emas",
    estado: "DF",
    tipo: ["CCMDF", "Anos Finais"],
    status: "ativa",
    total_responsaveis: 1150,
    responsaveis_app: 890,
    acessos_hoje: 132,
    acessos_7d: 1040,
    acessos_30d: 4180,
    android_pct: 85,
    ios_pct: 15,
    top_cards: [
      { label: "Boletim Escolar", cliques: 2048, pct: 49, color: "#38bdf8" },
      { label: "Registros Disciplinares", cliques: 1212, pct: 29, color: "#818cf8" },
      { label: "Frequência Escolar", cliques: 585, pct: 14, color: "#34d399" },
      { label: "Comunicados da Direção", cliques: 335, pct: 8, color: "#f59e0b" },
    ],
    historico_7d: [
      { dia: "Seg", total: 145 },
      { dia: "Ter", total: 160 },
      { dia: "Qua", total: 152 },
      { dia: "Qui", total: 172 },
      { dia: "Sex", total: 155 },
      { dia: "Sáb", total: 124 },
      { dia: "Dom", total: 132 },
    ],
    pico_horario: "18:00 - 20:30 (Noite)",
    ultimo_acesso: "Hoje às 20:05",
  },
];

export default function MobileResponsaveisDashboard() {
  const [escolas, setEscolas] = useState(MOCK_ESCOLAS_RESPONSAVEIS);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [kpisGlobais, setKpisGlobais] = useState(null);

  // Carrega telemetria real do backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data } = await api.get("/api/plataforma/telemetria/overview?perfil=RESPONSAVEL");
        if (data?.ok && Array.isArray(data.escolas) && data.escolas.length > 0) {
          setEscolas(data.escolas);
          if (data.kpis_globais) {
            setKpisGlobais(data.kpis_globais);
          }
        }
      } catch (err) {
        console.warn("[MobileResponsaveis] Erro ao carregar telemetria da API, mantendo dados carregados:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtragem de escolas
  const escolasFiltradas = escolas.filter((e) => {
    const q = busca.toLowerCase();
    return !q || e.nome.toLowerCase().includes(q) || (e.apelido && e.apelido.toLowerCase().includes(q));
  });

  // Métricas do Topo: Globais vs Específicas da Escola Selecionada
  const isIndividual = escolaSelecionada !== null;
  const escolaAtiva = isIndividual ? escolaSelecionada : null;

  const totalUsuariosExibicao = isIndividual
    ? escolaAtiva.responsaveis_app
    : (kpisGlobais?.total_usuarios_app ?? escolas.reduce((acc, e) => acc + (e.responsaveis_app || 0), 0));

  const totalBaseExibicao = isIndividual
    ? escolaAtiva.total_responsaveis
    : (kpisGlobais?.total_usuarios_base ?? escolas.reduce((acc, e) => acc + (e.total_responsaveis || 0), 0));

  const acessosHojeExibicao = isIndividual
    ? escolaAtiva.acessos_hoje
    : (kpisGlobais?.acessos_hoje ?? escolas.reduce((acc, e) => acc + (e.acessos_hoje || 0), 0));

  const acessos7dExibicao = isIndividual
    ? escolaAtiva.acessos_7d
    : (kpisGlobais?.acessos_7d ?? escolas.reduce((acc, e) => acc + (e.acessos_7d || 0), 0));

  const acessos30dExibicao = isIndividual
    ? escolaAtiva.acessos_30d
    : (kpisGlobais?.acessos_30d ?? escolas.reduce((acc, e) => acc + (e.acessos_30d || 0), 0));

  const androidPctExibicao = isIndividual ? escolaAtiva.android_pct : (kpisGlobais?.android_pct ?? 82);
  const iosPctExibicao = isIndividual ? escolaAtiva.ios_pct : (kpisGlobais?.ios_pct ?? 18);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #090d16 100%)",
      color: "#f8fafc",
      padding: "28px 36px 64px",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      {/* ── Topo com Branding & Alternador ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #0284c7, #38bdf8)",
              color: "#fff",
              padding: "3px 8px",
              borderRadius: "6px",
              letterSpacing: "0.6px",
            }}>
              EDUCA MOBILE • CEO ANALYTICS
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>• Tempo Real</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.5px" }}>
            Telemetria: Responsáveis
          </h1>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "0.95rem" }}>
            {isIndividual
              ? `Visualizando telemetria individual da unidade: ${escolaAtiva.nome}`
              : "Visão consolidada do aplicativo. Clique em uma escola abaixo para detalhar seus acessos."}
          </p>
        </div>

        {isIndividual && (
          <button
            onClick={() => setEscolaSelecionada(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: "rgba(56,189,248,0.15)",
              border: "1px solid rgba(56,189,248,0.4)",
              borderRadius: 10,
              color: "#38bdf8",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(56,189,248,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(56,189,248,0.15)")}
          >
            ✕ Voltar para Visão Consolidada
          </button>
        )}
      </div>

      {/* ── Banner de Cards no Topo (Específico da Escola Selecionada ou Geral) ── */}
      <div style={{
        background: isIndividual
          ? "linear-gradient(135deg, #0f172a 0%, #0369a1 70%, #0f172a 100%)"
          : "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
        border: isIndividual ? "1px solid rgba(56,189,248,0.45)" : "1px solid rgba(99,102,241,0.25)",
        borderRadius: 20,
        padding: "24px 30px",
        marginBottom: 32,
        boxShadow: isIndividual ? "0 20px 45px rgba(2,132,199,0.3)" : "0 20px 40px rgba(0,0,0,0.4)",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>{isIndividual ? "🏫" : "📱"}</span>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#e2e8f0" }}>
              {isIndividual ? `Métricas de Acesso — ${escolaAtiva.apelido}` : "Indicadores Consolidados de Acesso"}
            </span>
            {isIndividual && (
              <span style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color: "#38bdf8",
                background: "rgba(15,23,42,0.8)",
                padding: "3px 10px",
                borderRadius: 12,
                border: "1px solid rgba(56,189,248,0.4)",
              }}>
                UNIDADE ATIVA
              </span>
            )}
          </div>
          <div style={{
            fontSize: "0.8rem",
            color: isIndividual ? "#7dd3fc" : "#a5b4fc",
            background: "rgba(15,23,42,0.6)",
            padding: "5px 14px",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            {isIndividual ? `📍 ${escolaAtiva.cidade}/${escolaAtiva.estado}` : `🏫 ${escolas.length} Escolas Integradas`}
          </div>
        </div>

        {/* Grid de Cards no Topo */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 16,
        }}>
          {/* Card: Total Responsáveis */}
          <div style={{
            background: "rgba(15,23,42,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>PAIS COM APP ATIVO</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#10b981", marginTop: 4 }}>
              {fmtNum(totalUsuariosExibicao)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>
              {isIndividual ? `de ${fmtNum(escolaAtiva.total_responsaveis)} cadastrados` : "Base global ativa"}
            </div>
          </div>

          {/* Card: Acessos Hoje */}
          <div style={{
            background: "rgba(15,23,42,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>ACESSOS HOJE</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#f59e0b", marginTop: 4 }}>
              {fmtNum(acessosHojeExibicao)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>
              {isIndividual ? `Pico: ${escolaAtiva.pico_horario}` : "Pico entre 18h e 21h"}
            </div>
          </div>

          {/* Card: Acessos 7 Dias */}
          <div style={{
            background: "rgba(15,23,42,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>ACESSOS (7 DIAS)</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#a855f7", marginTop: 4 }}>
              {fmtNum(acessos7dExibicao)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>Volume semanal</div>
          </div>

          {/* Card: Acessos 30 Dias */}
          <div style={{
            background: "rgba(15,23,42,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>ACESSOS (30 DIAS)</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#38bdf8", marginTop: 4 }}>
              {fmtNum(acessos30dExibicao)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>Engajamento mensal</div>
          </div>

          {/* Card: Dispositivos */}
          <div style={{
            background: "rgba(15,23,42,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>DISPOSITIVOS</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#60a5fa", marginTop: 6 }}>
              {androidPctExibicao !== null && iosPctExibicao !== null ? (
                <>🤖 {androidPctExibicao}% <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>/</span> 🍎 {iosPctExibicao}%</>
              ) : (
                <span style={{ fontSize: "0.95rem", color: "#64748b", fontWeight: 600 }}>Aguardando acessos</span>
              )}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 6 }}>Android vs iOS</div>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 1: Seletor de Escolas (Cards no Corpo com APELIDO + QUANTIDADE) ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fff", margin: 0 }}>
              Unidades Escolares
            </h2>
            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "0.82rem" }}>
              Clique no card de uma escola para carregar seus dados detalhados.
            </p>
          </div>

          {/* Campo de Busca Rápida */}
          <div style={{ position: "relative", width: 280 }}>
            <input
              type="text"
              placeholder="Buscar apelido ou escola..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                background: "rgba(30,41,59,0.7)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                color: "#fff",
                fontSize: "0.82rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <span style={{ position: "absolute", left: 10, top: 8, color: "#64748b", fontSize: "0.85rem" }}>🔍</span>
          </div>
        </div>

        {/* Grid de Cards Compactos: Apelido + Quantidade de Usuários */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 14,
        }}>
          {escolasFiltradas.map((escola) => {
            const isSelected = escolaSelecionada?.id === escola.id;

            return (
              <div
                key={escola.id}
                onClick={() => setEscolaSelecionada(escola)}
                style={{
                  background: isSelected
                    ? "linear-gradient(145deg, #0369a1 0%, #0c4a6e 100%)"
                    : "linear-gradient(145deg, #131c2e 0%, #0d1522 100%)",
                  border: isSelected ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                  boxShadow: isSelected
                    ? "0 0 20px rgba(56,189,248,0.35)"
                    : "0 4px 12px rgba(0,0,0,0.2)",
                  transform: isSelected ? "scale(1.02)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "rgba(56,189,248,0.4)";
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.transform = "none";
                  }
                }}
              >
                {/* Apelido da Escola em Destaque */}
                <div style={{
                  fontSize: "1rem",
                  fontWeight: 900,
                  color: isSelected ? "#fff" : "#f1f5f9",
                  letterSpacing: "-0.2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {escola.apelido || escola.nome}
                </div>

                {/* Quantidade de Usuários abaixo do Apelido */}
                <div style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: isSelected ? "#7dd3fc" : "#38bdf8",
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <span>👥</span>
                  <span>{fmtNum(escola.responsaveis_app)} pais ativos</span>
                </div>

                {/* Indicador de Status/Seleção */}
                <div style={{
                  marginTop: 10,
                  fontSize: "0.68rem",
                  color: isSelected ? "#e0f2fe" : "#64748b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>{isSelected ? "● SELECIONADA" : "Clique para ver"}</span>
                  <span style={{ opacity: 0.7 }}>ID #{escola.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SEÇÃO 2: Painel Principal com Informações Detalhadas da Escola Selecionada ── */}
      {isIndividual ? (
        <div style={{
          background: "linear-gradient(145deg, #131c2e 0%, #0d1522 100%)",
          border: "1px solid rgba(56,189,248,0.25)",
          borderRadius: 20,
          padding: "28px 32px",
          boxShadow: "0 15px 35px rgba(0,0,0,0.35)",
        }}>
          {/* Header do Detalhamento */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: "1.4rem" }}>📊</span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  Telemetria Completa: {escolaAtiva.nome}
                </h2>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Apelido: <b style={{ color: "#38bdf8" }}>{escolaAtiva.apelido}</b> • {escolaAtiva.cidade}/{escolaAtiva.estado} • Último acesso registrado: <b style={{ color: "#f8fafc" }}>{escolaAtiva.ultimo_acesso}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {escolaAtiva.tipo?.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    background: t === "CCMDF" ? "rgba(234,179,8,0.15)" : "rgba(99,102,241,0.15)",
                    color: t === "CCMDF" ? "#eab308" : "#818cf8",
                    border: `1px solid ${t === "CCMDF" ? "rgba(234,179,8,0.3)" : "rgba(99,102,241,0.3)"}`,
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Bloco 1: Funcionalidades Mais Acessadas no App (Ranking de Cards) */}
            <div style={{
              background: "rgba(15,23,42,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "22px 24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  🔥 Módulos Mais Acessados pelos Pais
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Total cliques no período</span>
              </div>

              {escolaAtiva.top_cards && escolaAtiva.top_cards.length > 0 && escolaAtiva.top_cards.some((c) => c.cliques > 0) ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {escolaAtiva.top_cards.map((card, cidx) => (
                    <div key={cidx}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 5 }}>
                        <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{card.label}</span>
                        <span style={{ fontWeight: 800, color: card.color }}>
                          {card.pct}% <span style={{ color: "#64748b", fontWeight: 500, fontSize: "0.75rem" }}>({fmtNum(card.cliques)} cliques)</span>
                        </span>
                      </div>
                      <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          width: `${card.pct}%`,
                          height: "100%",
                          background: card.color,
                          borderRadius: 4,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,0.08)",
                }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📲</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#cbd5e1" }}>
                    Aguardando primeiros acessos no app
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 6, lineHeight: 1.4, maxWidth: 360, margin: "6px auto 0" }}>
                    Nenhum clique registrado nesta unidade ainda. Os módulos mais acessados aparecerão aqui em tempo real assim que os pais utilizarem o aplicativo.
                  </div>
                </div>
              )}
            </div>

            {/* Bloco 2: Histórico de Acessos Recentes & Dispositivos */}
            <div style={{
              background: "rgba(15,23,42,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                    📅 Acessos Diários nos Últimos 7 Dias
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700 }}>Total: {fmtNum(escolaAtiva.acessos_7d)}</span>
                </div>

                {/* Mini Gráfico de Barras */}
                <div style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  height: 110,
                  padding: "0 8px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  gap: 10,
                }}>
                  {escolaAtiva.historico_7d?.map((h, hidx) => {
                    const maxVal = Math.max(...escolaAtiva.historico_7d.map((x) => x.total), 1);
                    const barHeight = Math.round((h.total / maxVal) * 90);

                    return (
                      <div key={hidx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8" }}>{h.total}</span>
                        <div style={{
                          width: "100%",
                          maxWidth: 24,
                          height: `${barHeight}px`,
                          background: hidx === 6 ? "linear-gradient(180deg, #38bdf8, #0284c7)" : "rgba(56,189,248,0.35)",
                          borderRadius: "4px 4px 0 0",
                          transition: "all 0.3s",
                        }} />
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{h.dia}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informações Complementares */}
              <div style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  ⏰ Horário de Maior Uso: <b style={{ color: "#f8fafc" }}>{escolaAtiva.pico_horario || "Aguardando primeiros acessos"}</b>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {escolaAtiva.android_pct !== null && escolaAtiva.ios_pct !== null ? (
                    <>📱 Sistemas: 🤖 <b>{escolaAtiva.android_pct}% Android</b> · 🍎 <b>{escolaAtiva.ios_pct}% iOS</b></>
                  ) : (
                    <span>📱 Sistemas: <b style={{ color: "#64748b" }}>Aguardando registros</b></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: "rgba(15,23,42,0.4)",
          border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: "36px",
          textAlign: "center",
          color: "#94a3b8",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>👆</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#e2e8f0" }}>
            Selecione uma escola acima para ver os acessos detalhados
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 4 }}>
            Você poderá visualizar os módulos mais clicados pelos pais, gráfico de 7 dias e horários de pico de cada unidade.
          </div>
        </div>
      )}
    </div>
  );
}
