// src/features/plataforma/mobile/MobileEstudantesDashboard.jsx
// ============================================================================
// CEO Dashboard — Telemetria & Analytics do EDUCA MOBILE (Estudantes)
// Master-Detail Interativo: Seleção por Apelido da Escola + Telemetria Detalhada
// ============================================================================
import React, { useState, useEffect } from "react";
import api from "../../../services/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = (n) => Number(n || 0).toLocaleString("pt-BR");

// ── Mock data de alta fidelidade para estudantes ─────────────────────────────
const MOCK_ESCOLAS_ESTUDANTES = [
  {
    id: 1,
    nome: "Centro de Ensino Fundamental 04 de Planaltina",
    apelido: "CEF04-CCMDF",
    cidade: "Planaltina",
    estado: "DF",
    tipo: ["CCMDF", "Anos Finais"],
    status: "ativa",
    total_alunos: 1129,
    alunos_app: 1040,
    acessos_hoje: 380,
    acessos_7d: 2650,
    acessos_30d: 11200,
    android_pct: 78,
    ios_pct: 22,
    top_cards: [
      { label: "Carteirinha Digital", cliques: 4928, pct: 44, color: "#a855f7" },
      { label: "Boletim Escolar", cliques: 3808, pct: 34, color: "#38bdf8" },
      { label: "Conteúdos das Aulas", cliques: 1680, pct: 15, color: "#10b981" },
      { label: "Horários de Aulas", cliques: 784, pct: 7, color: "#f59e0b" },
    ],
    historico_7d: [
      { dia: "Seg", total: 410 },
      { dia: "Ter", total: 435 },
      { dia: "Qua", total: 390 },
      { dia: "Qui", total: 445 },
      { dia: "Sex", total: 420 },
      { dia: "Sáb", total: 170 },
      { dia: "Dom", total: 380 },
    ],
    pico_horario: "06:45 - 07:30 e 12:15 - 13:00 (Entrada / Saída)",
    ultimo_acesso: "Hoje às 20:14",
  },
  {
    id: 3,
    nome: "Centro Educacional Pompilio Marques de Sousa",
    apelido: "POMPÍLIO",
    cidade: "Planaltina",
    estado: "DF",
    tipo: ["Anos Finais", "Ensino Médio", "Integral"],
    status: "ativa",
    total_alunos: 606,
    alunos_app: 520,
    acessos_hoje: 195,
    acessos_7d: 1390,
    acessos_30d: 5920,
    android_pct: 74,
    ios_pct: 26,
    top_cards: [
      { label: "Carteirinha Digital", cliques: 2368, pct: 40, color: "#a855f7" },
      { label: "Horários de Aulas", cliques: 1894, pct: 32, color: "#f59e0b" },
      { label: "Boletim Escolar", cliques: 1243, pct: 21, color: "#38bdf8" },
      { label: "Conteúdos & Tarefas", cliques: 415, pct: 7, color: "#10b981" },
    ],
    historico_7d: [
      { dia: "Seg", total: 215 },
      { dia: "Ter", total: 230 },
      { dia: "Qua", total: 205 },
      { dia: "Qui", total: 240 },
      { dia: "Sex", total: 220 },
      { dia: "Sáb", total: 85 },
      { dia: "Dom", total: 195 },
    ],
    pico_horario: "07:00 - 07:45 e 17:15 - 18:00 (Integral)",
    ultimo_acesso: "Hoje às 19:35",
  },
  {
    id: 10000,
    nome: "Centro de Ensino Fundamental 01 de Riacho Fundo II",
    apelido: "CCM - CEF01 RF2",
    cidade: "Riacho Fundo II",
    estado: "DF",
    tipo: ["CCMDF", "Anos Finais"],
    status: "ativa",
    total_alunos: 1652,
    alunos_app: 1490,
    acessos_hoje: 512,
    acessos_7d: 3820,
    acessos_30d: 15400,
    android_pct: 82,
    ios_pct: 18,
    top_cards: [
      { label: "Carteirinha Digital", cliques: 7084, pct: 46, color: "#a855f7" },
      { label: "Boletim Escolar", cliques: 4774, pct: 31, color: "#38bdf8" },
      { label: "Registros Disciplinares", cliques: 2464, pct: 16, color: "#818cf8" },
      { label: "Horários & Avisos", cliques: 1078, pct: 7, color: "#f59e0b" },
    ],
    historico_7d: [
      { dia: "Seg", total: 580 },
      { dia: "Ter", total: 610 },
      { dia: "Qua", total: 565 },
      { dia: "Qui", total: 630 },
      { dia: "Sex", total: 590 },
      { dia: "Sáb", total: 333 },
      { dia: "Dom", total: 512 },
    ],
    pico_horario: "06:40 - 07:25 e 12:00 - 13:10 (Formação CCMDF)",
    ultimo_acesso: "Hoje às 20:25",
  },
  {
    id: 10004,
    nome: "Centro de Ensino Fundamental 04 do Guará",
    apelido: "CEF04_GUARA",
    cidade: "Guará",
    estado: "DF",
    tipo: ["Anos Finais"],
    status: "ativa",
    total_alunos: 810,
    alunos_app: 740,
    acessos_hoje: 220,
    acessos_7d: 1640,
    acessos_30d: 6850,
    android_pct: 69,
    ios_pct: 31,
    top_cards: [
      { label: "Carteirinha Digital", cliques: 3288, pct: 48, color: "#a855f7" },
      { label: "Boletim Escolar", cliques: 1918, pct: 28, color: "#38bdf8" },
      { label: "Biblioteca & Livros", cliques: 1164, pct: 17, color: "#ec4899" },
      { label: "Notícias & Eventos", cliques: 480, pct: 7, color: "#38bdf8" },
    ],
    historico_7d: [
      { dia: "Seg", total: 250 },
      { dia: "Ter", total: 275 },
      { dia: "Qua", total: 245 },
      { dia: "Qui", total: 280 },
      { dia: "Sex", total: 260 },
      { dia: "Sáb", total: 110 },
      { dia: "Dom", total: 220 },
    ],
    pico_horario: "07:15 - 08:00 e 12:45 - 13:30 (Troca de turno)",
    ultimo_acesso: "Hoje às 18:50",
  },
  {
    id: 10005,
    nome: "Centro de Ensino Fundamental 01 do Lago Norte",
    apelido: "CELAN",
    cidade: "Brasília",
    estado: "DF",
    tipo: ["CCMDF", "Anos Finais"],
    status: "ativa",
    total_alunos: 540,
    alunos_app: 495,
    acessos_hoje: 160,
    acessos_7d: 1210,
    acessos_30d: 5120,
    android_pct: 64,
    ios_pct: 36,
    top_cards: [
      { label: "Carteirinha Digital", cliques: 2099, pct: 41, color: "#a855f7" },
      { label: "Boletim Escolar", cliques: 1792, pct: 35, color: "#38bdf8" },
      { label: "Conteúdos & Aulas", cliques: 922, pct: 18, color: "#10b981" },
      { label: "Registros Disciplinares", cliques: 307, pct: 6, color: "#818cf8" },
    ],
    historico_7d: [
      { dia: "Seg", total: 185 },
      { dia: "Ter", total: 195 },
      { dia: "Qua", total: 180 },
      { dia: "Qui", total: 210 },
      { dia: "Sex", total: 190 },
      { dia: "Sáb", total: 90 },
      { dia: "Dom", total: 160 },
    ],
    pico_horario: "07:00 - 07:30 e 12:20 - 13:00 (Entrada e Saída)",
    ultimo_acesso: "Hoje às 19:40",
  },
  {
    id: 10007,
    nome: "Centro Educacional 416 da Santa Maria",
    apelido: "CED 416",
    cidade: "Santa Maria",
    estado: "DF",
    tipo: ["Ensino Médio", "Anos Finais"],
    status: "ativa",
    total_alunos: 1280,
    alunos_app: 1110,
    acessos_hoje: 395,
    acessos_7d: 2840,
    acessos_30d: 12100,
    android_pct: 84,
    ios_pct: 16,
    top_cards: [
      { label: "Carteirinha Digital", cliques: 6050, pct: 50, color: "#a855f7" },
      { label: "Boletim Escolar", cliques: 3509, pct: 29, color: "#38bdf8" },
      { label: "Horários de Aulas", cliques: 1694, pct: 14, color: "#f59e0b" },
      { label: "Notícias & Grêmio", cliques: 847, pct: 7, color: "#34d399" },
    ],
    historico_7d: [
      { dia: "Seg", total: 430 },
      { dia: "Ter", total: 460 },
      { dia: "Qua", total: 415 },
      { dia: "Qui", total: 470 },
      { dia: "Sex", total: 440 },
      { dia: "Sáb", total: 230 },
      { dia: "Dom", total: 395 },
    ],
    pico_horario: "12:30 - 13:30 e 18:00 - 19:00 (Médio Noturno)",
    ultimo_acesso: "Hoje às 17:15",
  },
  {
    id: 10002,
    nome: "Centro Educacional Stella dos Cherubins",
    apelido: "STELLA",
    cidade: "Planaltina",
    estado: "DF",
    tipo: ["Anos Finais"],
    status: "ativa",
    total_alunos: 710,
    alunos_app: 630,
    acessos_hoje: 205,
    acessos_7d: 1490,
    acessos_30d: 6240,
    android_pct: 77,
    ios_pct: 23,
    top_cards: [
      { label: "Carteirinha Digital", cliques: 2808, pct: 45, color: "#a855f7" },
      { label: "Boletim Escolar", cliques: 1997, pct: 32, color: "#38bdf8" },
      { label: "Horários de Aulas", cliques: 998, pct: 16, color: "#f59e0b" },
      { label: "Biblioteca", cliques: 437, pct: 7, color: "#ec4899" },
    ],
    historico_7d: [
      { dia: "Seg", total: 220 },
      { dia: "Ter", total: 245 },
      { dia: "Qua", total: 225 },
      { dia: "Qui", total: 255 },
      { dia: "Sex", total: 235 },
      { dia: "Sáb", total: 105 },
      { dia: "Dom", total: 205 },
    ],
    pico_horario: "07:00 - 07:40 e 12:20 - 13:00 (Entrada/Saída)",
    ultimo_acesso: "Hoje às 19:00",
  },
  {
    id: 10009,
    nome: "Centro de Ensino Fundamental 113 do Recanto das Emas",
    apelido: "CEF 113",
    cidade: "Recanto das Emas",
    estado: "DF",
    tipo: ["CCMDF", "Anos Finais"],
    status: "ativa",
    total_alunos: 980,
    alunos_app: 890,
    acessos_hoje: 290,
    acessos_7d: 2150,
    acessos_30d: 8940,
    android_pct: 81,
    ios_pct: 19,
    top_cards: [
      { label: "Carteirinha Digital", cliques: 4202, pct: 47, color: "#a855f7" },
      { label: "Boletim Escolar", cliques: 2950, pct: 33, color: "#38bdf8" },
      { label: "Biblioteca & Livros", cliques: 1162, pct: 13, color: "#ec4899" },
      { label: "Registros Disciplinares", cliques: 626, pct: 7, color: "#818cf8" },
    ],
    historico_7d: [
      { dia: "Seg", total: 325 },
      { dia: "Ter", total: 345 },
      { dia: "Qua", total: 310 },
      { dia: "Qui", total: 360 },
      { dia: "Sex", total: 330 },
      { dia: "Sáb", total: 190 },
      { dia: "Dom", total: 290 },
    ],
    pico_horario: "06:45 - 07:30 e 12:15 - 13:00 (Troca de turno)",
    ultimo_acesso: "Hoje às 18:45",
  },
];

export default function MobileEstudantesDashboard() {
  const [escolas, setEscolas] = useState(MOCK_ESCOLAS_ESTUDANTES);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [kpisGlobais, setKpisGlobais] = useState(null);

  // Carrega telemetria real do backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data } = await api.get("/api/plataforma/telemetria/overview?perfil=ALUNO");
        if (data?.ok && Array.isArray(data.escolas) && data.escolas.length > 0) {
          setEscolas(data.escolas);
          if (data.kpis_globais) {
            setKpisGlobais(data.kpis_globais);
          }
        }
      } catch (err) {
        console.warn("[MobileEstudantes] Erro ao carregar telemetria da API, mantendo dados carregados:", err);
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
    ? escolaAtiva.alunos_app
    : (kpisGlobais?.total_usuarios_app ?? escolas.reduce((acc, e) => acc + (e.alunos_app || 0), 0));

  const totalMatriculadosExibicao = isIndividual
    ? escolaAtiva.total_alunos
    : (kpisGlobais?.total_usuarios_base ?? escolas.reduce((acc, e) => acc + (e.total_alunos || 0), 0));

  const acessosHojeExibicao = isIndividual
    ? escolaAtiva.acessos_hoje
    : (kpisGlobais?.acessos_hoje ?? escolas.reduce((acc, e) => acc + (e.acessos_hoje || 0), 0));

  const acessos7dExibicao = isIndividual
    ? escolaAtiva.acessos_7d
    : (kpisGlobais?.acessos_7d ?? escolas.reduce((acc, e) => acc + (e.acessos_7d || 0), 0));

  const acessos30dExibicao = isIndividual
    ? escolaAtiva.acessos_30d
    : (kpisGlobais?.acessos_30d ?? escolas.reduce((acc, e) => acc + (e.acessos_30d || 0), 0));

  const androidPctExibicao = isIndividual ? escolaAtiva.android_pct : (kpisGlobais?.android_pct ?? 78);
  const iosPctExibicao = isIndividual ? escolaAtiva.ios_pct : (kpisGlobais?.ios_pct ?? 22);

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
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
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
            Telemetria: Estudantes
          </h1>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "0.95rem" }}>
            {isIndividual
              ? `Visualizando telemetria individual da unidade: ${escolaAtiva.nome}`
              : "Visão consolidada do aplicativo dos alunos. Clique em uma escola abaixo para detalhar seus acessos."}
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
              background: "rgba(168,85,247,0.15)",
              border: "1px solid rgba(168,85,247,0.4)",
              borderRadius: 10,
              color: "#c084fc",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(168,85,247,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(168,85,247,0.15)")}
          >
            ✕ Voltar para Visão Consolidada
          </button>
        )}
      </div>

      {/* ── Banner de Cards no Topo (Específico da Escola Selecionada ou Geral) ── */}
      <div style={{
        background: isIndividual
          ? "linear-gradient(135deg, #0f172a 0%, #581c87 70%, #0f172a 100%)"
          : "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
        border: isIndividual ? "1px solid rgba(168,85,247,0.45)" : "1px solid rgba(168,85,247,0.25)",
        borderRadius: 20,
        padding: "24px 30px",
        marginBottom: 32,
        boxShadow: isIndividual ? "0 20px 45px rgba(124,58,237,0.3)" : "0 20px 40px rgba(0,0,0,0.4)",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>{isIndividual ? "🎓" : "📱"}</span>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#e2e8f0" }}>
              {isIndividual ? `Métricas de Acesso — ${escolaAtiva.apelido}` : "Indicadores Consolidados dos Estudantes"}
            </span>
            {isIndividual && (
              <span style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color: "#c084fc",
                background: "rgba(15,23,42,0.8)",
                padding: "3px 10px",
                borderRadius: 12,
                border: "1px solid rgba(168,85,247,0.4)",
              }}>
                UNIDADE ATIVA
              </span>
            )}
          </div>
          <div style={{
            fontSize: "0.8rem",
            color: isIndividual ? "#e9d5ff" : "#c084fc",
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
          {/* Card: Total Estudantes com App */}
          <div style={{
            background: "rgba(15,23,42,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>ALUNOS COM APP ATIVO</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#a855f7", marginTop: 4 }}>
              {fmtNum(totalUsuariosExibicao)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>
              {isIndividual ? `de ${fmtNum(escolaAtiva.total_alunos)} matriculados` : `de ${fmtNum(totalMatriculadosExibicao)} matriculados`}
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
              {isIndividual ? `Pico: ${escolaAtiva.pico_horario}` : "Pico na entrada e saída"}
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
            <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#34d399", marginTop: 4 }}>
              {fmtNum(acessos7dExibicao)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>Frequência semanal</div>
          </div>

          {/* Card: Acessos 30 Dias */}
          <div style={{
            background: "rgba(15,23,42,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>ACESSOS (30 DIAS)</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#ec4899", marginTop: 4 }}>
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
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#818cf8", marginTop: 6 }}>
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
                    ? "linear-gradient(145deg, #6b21a8 0%, #4c1d95 100%)"
                    : "linear-gradient(145deg, #131c2e 0%, #0d1522 100%)",
                  border: isSelected ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                  boxShadow: isSelected
                    ? "0 0 20px rgba(168,85,247,0.35)"
                    : "0 4px 12px rgba(0,0,0,0.2)",
                  transform: isSelected ? "scale(1.02)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)";
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
                  color: isSelected ? "#e9d5ff" : "#c084fc",
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <span>🎓</span>
                  <span>{fmtNum(escola.alunos_app)} alunos ativos</span>
                </div>

                {/* Indicador de Status/Seleção */}
                <div style={{
                  marginTop: 10,
                  fontSize: "0.68rem",
                  color: isSelected ? "#f3e8ff" : "#64748b",
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
          border: "1px solid rgba(168,85,247,0.25)",
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
                Apelido: <b style={{ color: "#c084fc" }}>{escolaAtiva.apelido}</b> • {escolaAtiva.cidade}/{escolaAtiva.estado} • Último acesso registrado: <b style={{ color: "#f8fafc" }}>{escolaAtiva.ultimo_acesso}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {escolaAtiva.tipo?.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    background: t === "CCMDF" ? "rgba(234,179,8,0.15)" : "rgba(168,85,247,0.15)",
                    color: t === "CCMDF" ? "#eab308" : "#c084fc",
                    border: `1px solid ${t === "CCMDF" ? "rgba(234,179,8,0.3)" : "rgba(168,85,247,0.3)"}`,
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
            {/* Bloco 1: Funcionalidades Mais Acessadas no App (Ranking de Cards dos Alunos) */}
            <div style={{
              background: "rgba(15,23,42,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "22px 24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  🔥 Módulos Mais Acessados pelos Estudantes
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
                    Nenhum clique registrado nesta unidade ainda. Os módulos mais acessados aparecerão aqui em tempo real assim que os estudantes utilizarem o aplicativo.
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
                  <span style={{ fontSize: "0.75rem", color: "#c084fc", fontWeight: 700 }}>Total: {fmtNum(escolaAtiva.acessos_7d)}</span>
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
                          background: hidx === 6 ? "linear-gradient(180deg, #c084fc, #7c3aed)" : "rgba(168,85,247,0.35)",
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
            Você poderá visualizar os módulos mais clicados pelos estudantes (Carteirinha, Boletim, Horários), gráfico de 7 dias e picos de uso.
          </div>
        </div>
      )}
    </div>
  );
}
