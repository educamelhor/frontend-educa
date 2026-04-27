import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  BoltIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  RocketLaunchIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

/**
 * AgentePlanos.jsx
 * ─────────────────────────────────────────────────────────
 * AGENTE EDUCA › Planos
 *
 * Etapa 1: Exportar a estrutura da coluna "Avaliação Bimestral"
 * dos Planos de Avaliação Pedagógico (PAP) do EDUCA.MELHOR
 * para o portal EDUCADF.
 *
 * Apenas a estrutura (colunas) é exportada nesta etapa.
 * Notas serão exportadas em etapa futura.
 * ─────────────────────────────────────────────────────────
 */

const STATUS_LABELS = {
  APROVADO:   { label: "Aprovado",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  ENVIADO:    { label: "Enviado",    color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  RASCUNHO:   { label: "Rascunho",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  DEVOLVIDO:  { label: "Devolvido", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

const BIMESTRE_COLORS = {
  "1º Bimestre": "#6366f1",
  "2º Bimestre": "#8b5cf6",
  "3º Bimestre": "#ec4899",
  "4º Bimestre": "#f59e0b",
};

function PlanCard({ plano, onExportar, exportandoId }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo  = STATUS_LABELS[plano.status] || STATUS_LABELS.RASCUNHO;
  const bimColor    = BIMESTRE_COLORS[plano.bimestre] || "#6366f1";
  const itens       = Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || "[]");
  const bimestral   = itens.find(i => i.fixo_direcao);
  const exportando  = exportandoId === plano.id;

  const jaExportado  = plano.agente_exportado_em;
  const podeExportar = !jaExportado && (plano.status === "APROVADO" || plano.status === "ENVIADO");

  return (
    <div
      style={{
        borderRadius: 20,
        background: "linear-gradient(160deg, #1e2340 0%, #151929 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        overflow: "hidden",
        marginBottom: 16,
        transition: "transform 0.2s",
      }}
    >
      {/* ── Barra lateral colorida */}
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, background: `linear-gradient(180deg, ${bimColor}, transparent)`, flexShrink: 0 }} />

        <div style={{ flex: 1, padding: "20px 22px" }}>
          {/* Cabeçalho */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              {/* Badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{
                  fontSize: "0.65rem", fontWeight: 800, padding: "3px 10px", borderRadius: 99,
                  background: `${statusInfo.bg}`, color: statusInfo.color,
                  border: `1px solid ${statusInfo.color}40`, textTransform: "uppercase", letterSpacing: "0.6px",
                }}>
                  {statusInfo.label}
                </span>
                <span style={{
                  fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                  background: `${bimColor}18`, color: bimColor,
                  border: `1px solid ${bimColor}40`,
                }}>
                  {plano.bimestre}
                </span>
                {bimestral && (
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                    background: "rgba(139,92,246,0.12)", color: "#a78bfa",
                    border: "1px solid rgba(139,92,246,0.25)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    ✓ Avaliação Bimestral
                  </span>
                )}
              </div>

              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>
                {plano.disciplina}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>
                Turma: <strong style={{ color: "#cbd5e1" }}>{plano.turmas}</strong>
                {plano.ano && <> · Ano: <strong style={{ color: "#cbd5e1" }}>{plano.ano}</strong></>}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              {jaExportado ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
                }}>
                  <CheckCircleIcon style={{ width: 16, color: "#22c55e" }} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#22c55e" }}>Exportado</div>
                    <div style={{ fontSize: "0.6rem", color: "#4ade80" }}>
                      {new Date(jaExportado).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              ) : !bimestral ? (
                <div style={{
                  padding: "8px 14px", borderRadius: 12, fontSize: "0.7rem",
                  background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.15)",
                  color: "#64748b", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <LockClosedIcon style={{ width: 14 }} />
                  Sem col. Bimestral
                </div>
              ) : !podeExportar ? (
                <div style={{
                  padding: "8px 14px", borderRadius: 12, fontSize: "0.7rem",
                  background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
                  color: "#f59e0b", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <ExclamationTriangleIcon style={{ width: 14 }} />
                  Plano {plano.status}
                </div>
              ) : (
                <button
                  onClick={() => onExportar(plano)}
                  disabled={exportando}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 18px", borderRadius: 14, fontWeight: 800,
                    fontSize: "0.8rem", cursor: exportando ? "not-allowed" : "pointer",
                    background: exportando ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none", color: "#fff",
                    boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                    opacity: exportando ? 0.7 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {exportando ? (
                    <>
                      <ArrowPathIcon style={{ width: 15, animation: "spin 0.8s linear infinite" }} />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <RocketLaunchIcon style={{ width: 15 }} />
                      Exportar Estrutura
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#64748b", fontSize: "0.7rem", display: "flex",
                  alignItems: "center", gap: 4, fontWeight: 600,
                }}
              >
                {expanded ? <ChevronUpIcon style={{ width: 14 }} /> : <ChevronDownIcon style={{ width: 14 }} />}
                {expanded ? "Ocultar" : "Ver colunas"}
              </button>
            </div>
          </div>

          {/* Detalhe das colunas */}
          {expanded && (
            <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
                Colunas do Plano
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {itens.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "7px 12px", borderRadius: 10,
                      background: item.fixo_direcao
                        ? "rgba(139,92,246,0.12)"
                        : "rgba(255,255,255,0.04)",
                      border: item.fixo_direcao
                        ? "1px solid rgba(139,92,246,0.35)"
                        : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: item.fixo_direcao ? "#c4b5fd" : "#94a3b8" }}>
                      {item.fixo_direcao && <SparklesIcon style={{ width: 12, display: "inline", marginRight: 4 }} />}
                      {item.atividade}
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "#475569", marginTop: 2 }}>
                      {item.nota_total} pts
                      {item.fixo_direcao && <span style={{ color: "#a78bfa", marginLeft: 6 }}>← será exportado</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentePlanos() {
  const [planos, setPlanos]             = useState([]);
  const [carregando, setCarregando]     = useState(true);
  const [exportandoId, setExportandoId] = useState(null);
  const [filtro, setFiltro]             = useState("todos"); // todos | prontos | exportados
  const [modalConfirm, setModalConfirm] = useState(null); // plano selecionado p/ confirmar export
  const [modalSemCred, setModalSemCred] = useState(false); // modal de credenciais não configuradas
  const [modalResultado, setModalResultado] = useState(null); // { tipo: 'sucesso'|'erro', titulo, texto }
  const [modalOcupado, setModalOcupado] = useState(null); // { turma, disciplina } do plano em execução
  // Turmas e disciplinas do professor logado (para filtro pessoal duplo)
  const [turmasNomesProf, setTurmasNomesProf] = useState(null);

  // ── Carrega planos filtrados por TURMA + DISCIPLINA do professor logado ──
  // Endpoint dedicado /avaliacoes/me resolve via JOIN modulação no banco —
  // sem dependência de usuario_id (criador) nem de comparação de strings.
  useEffect(() => {
    const fetchDados = async () => {
      setCarregando(true);
      try {
        const ano = new Date().getFullYear();

        // Uma única chamada — o backend resolve via CPF do token + modulação + turmas + disciplinas
        const resp = await api.get("/avaliacoes/me", { params: { ano } });
        const lista = resp.data?.planos || [];

        // Busca itens detalhados em paralelo (para exibir colunas do plano)
        const comItens = await Promise.all(
          lista.map(async p => {
            try {
              const det = await api.get(`/avaliacoes/${p.id}`);
              return det.data || p;
            } catch {
              return p;
            }
          })
        );
        setPlanos(comItens);
      } catch (err) {
        showMsg("error", "Não foi possível carregar os planos.");
      } finally {
        setCarregando(false);
      }
    };
    fetchDados();
  }, []);

  const abrirModalResultado = (tipo, titulo, texto) => {
    setModalResultado({ tipo, titulo, texto });
  };

  // ── Filtros ────────────────────────────────────────────
  const planosComBimestral = planos.filter(p => {
    const itens = Array.isArray(p.itens) ? p.itens : JSON.parse(p.itens || "[]");
    return itens.some(i => i.fixo_direcao);
  });

  const planosFiltrados = (() => {
    switch (filtro) {
      case "prontos":
        return planosComBimestral.filter(p =>
          (p.status === "APROVADO" || p.status === "ENVIADO") && !p.agente_exportado_em
        );
      case "exportados":
        return planosComBimestral.filter(p => !!p.agente_exportado_em);
      default:
        return planosComBimestral;
    }
  })();

  const totalProntos    = planosComBimestral.filter(p =>
    (p.status === "APROVADO" || p.status === "ENVIADO") && !p.agente_exportado_em
  ).length;
  const totalExportados = planosComBimestral.filter(p => !!p.agente_exportado_em).length;

  // ── Exportar estrutura ─────────────────────────────────
  const handleExportarEstrutura = async (plano) => {
    // ── Guarda de concorrência: bloqueia se o agente já está ocupado ──────
    if (exportandoId !== null && exportandoId !== plano.id) {
      const planoAtivo = planos.find(p => p.id === exportandoId);
      setModalOcupado({
        turma:      planoAtivo?.turmas      || '...',
        disciplina: planoAtivo?.disciplina  || '...',
        bimestre:   planoAtivo?.bimestre    || '...',
      });
      setModalConfirm(null);
      return;
    }
    setModalConfirm(null);
    setModalResultado(null);
    setExportandoId(plano.id);

    const marcarSucesso = (exportadoEm) => {
      setPlanos(prev => prev.map(p =>
        p.id === plano.id ? { ...p, agente_exportado_em: exportadoEm || new Date().toISOString() } : p
      ));
      abrirModalResultado(
        'sucesso',
        'Exportação concluída!',
        `A coluna Avaliação Bimestral foi criada no EDUCADF com sucesso.\n\n📘 ${plano.disciplina} · ${plano.turmas} · ${plano.bimestre}`
      );
    };

    try {
      const resp = await api.post(`/agente-planos/${plano.id}/exportar-estrutura`);
      if (resp.data?.ok) {
        marcarSucesso();
      } else {
        const errMsg = resp.data?.message || resp.data?.error || 'Exportação não concluída.';
        abrirModalResultado('erro', 'Exportação não concluída', errMsg);
      }
      setExportandoId(null);

    } catch (err) {
      // ── Erro de credenciais: modal específico ──────────────────────────
      const codigo = err.response?.data?.codigo;
      if (codigo === 'SEM_CREDENCIAIS' || codigo === 'CREDENCIAIS_CORROMPIDAS') {
        setModalSemCred(true);
        setExportandoId(null);
        return;
      }

      // ── Timeout de rede (!err.response): Playwright ainda rodando ──────
      // O proxy (DigitalOcean/Vercel) corta conexões longas (>60s).
      // O Playwright continua rodando no servidor por 2-4 min.
      // Mantemos o spinner e fazemos polling a cada 20s por até 4 min.
      if (!err.response) {
        const MAX_TENTATIVAS = 15; // 15 × 20s = 5 minutos (margem para EDUCADF lento)
        let encontrado = false;

        for (let i = 0; i < MAX_TENTATIVAS && !encontrado; i++) {
          await new Promise(r => setTimeout(r, 20000)); // aguarda 20s
          try {
            const check = await api.get(`/avaliacoes/${plano.id}`);
            const exportadoEm = check.data?.agente_exportado_em;
            if (exportadoEm) {
              marcarSucesso(exportadoEm);
              encontrado = true;
            }
          } catch { /* ignora erros de polling */ }
        }

        if (!encontrado) {
          abrirModalResultado(
            'erro',
            'Tempo esgotado',
            'A exportação demorou mais que o esperado.\n\nAtualize a página para verificar se foi concluída no EDUCADF.'
          );
        }
        setExportandoId(null);
        return;
      }

      // ── Erro real retornado pelo backend (com err.response) ────────────
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Erro ao exportar estrutura.';
      abrirModalResultado('erro', 'Erro na exportação', errMsg);
      setExportandoId(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div
      style={{ minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .plan-card:hover { transform: translateY(-2px); }
      `}</style>

      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <div style={{
        background: "linear-gradient(135deg, #0f1629 0%, #1a1f3a 50%, #0f1629 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "36px 32px 28px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glow decorativo */}
        <div style={{
          position: "absolute", top: -60, right: -40, width: 300, height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -40, width: 260, height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, position: "relative" }}>
          <div>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <BoltIcon style={{ width: 14, color: "#eab308" }} />
              <span style={{ fontSize: "0.7rem", color: "#eab308", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Agente EDUCA
              </span>
              <span style={{ fontSize: "0.7rem", color: "#334155" }}>/</span>
              <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Planos</span>
              {/* Etapa badge */}
              <span style={{
                marginLeft: 8, fontSize: "0.6rem", fontWeight: 800,
                padding: "2px 10px", borderRadius: 99,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", letterSpacing: "0.5px",
              }}>
                ETAPA 1
              </span>
            </div>

            <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.5px", margin: 0 }}>
              Planos — Exportar para EDUCADF
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 8, maxWidth: 560, lineHeight: 1.6 }}>
              O Agente migra a coluna <strong style={{ color: "#a78bfa" }}>Avaliação Bimestral</strong> dos seus
              Planos de Avaliação Pedagógico (PAP) para o portal EDUCADF.
              Apenas a <strong style={{ color: "#e2e8f0" }}>estrutura</strong> é exportada nesta etapa — as notas serão em etapa posterior.
            </p>
          </div>

          {/* Métricas de cabeçalho */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "Com col. Bimestral", value: planosComBimestral.length, color: "#a78bfa" },
              { label: "Prontos p/ exportar", value: totalProntos,             color: "#22c55e" },
              { label: "Já exportados",       value: totalExportados,           color: "#3b82f6" },
            ].map(m => (
              <div key={m.label} style={{
                padding: "14px 18px", borderRadius: 16, minWidth: 100, textAlign: "center",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(8px)",
              }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═════════════════════ CHIP ETAPA ═════════════════════ */}
      <div style={{
        margin: "24px 32px 0",
        padding: "14px 20px", borderRadius: 16,
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))",
        border: "1px solid rgba(99,102,241,0.2)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <SparklesIcon style={{ width: 20, color: "#818cf8", flexShrink: 0 }} />
        <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6 }}>
          <strong style={{ color: "#a78bfa" }}>Etapa 1 de N:</strong>{" "}
          Exportação da <strong style={{ color: "#e2e8f0" }}>estrutura</strong> — o Agente cria no EDUCADF
          as colunas correspondentes à Avaliação Bimestral de cada plano aprovado. Somente planos com status&nbsp;
          <strong style={{ color: "#22c55e" }}>APROVADO</strong> ou <strong style={{ color: "#3b82f6" }}>ENVIADO</strong>{" "}
          podem ser exportados. As notas serão sincronizadas em etapa futura.
        </div>
      </div>

      {/* ═════════════════════ FILTROS ═════════════════════════ */}
      <div style={{ margin: "20px 32px 0", display: "flex", gap: 8 }}>
        {[
          { key: "todos",      label: `Todos (${planosComBimestral.length})` },
          { key: "prontos",    label: `Prontos (${totalProntos})` },
          { key: "exportados", label: `Exportados (${totalExportados})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            style={{
              padding: "8px 16px", borderRadius: 10, fontWeight: 700, fontSize: "0.78rem",
              cursor: "pointer", border: "none", transition: "all 0.2s",
              background: filtro === f.key
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "rgba(255,255,255,0.04)",
              color: filtro === f.key ? "#fff" : "#64748b",
              boxShadow: filtro === f.key ? "0 4px 14px rgba(99,102,241,0.3)" : "none",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ═════════ MODAL AGENTE OCUPADO ══════════════════════════ */}
      {modalOcupado && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 600,
            background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setModalOcupado(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 440, margin: "0 16px",
              borderRadius: 24, overflow: "hidden",
              background: "linear-gradient(160deg, #1a1528 0%, #110f1e 100%)",
              border: "1px solid rgba(168,85,247,0.35)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(139,92,246,0.12)",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              padding: "28px 28px 22px", textAlign: "center",
            }}>
              <div style={{ fontSize: "2.8rem", marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
                Agente trabalhando...
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(221,214,254,0.8)", marginTop: 6 }}>
                O Agente só pode executar uma tarefa por vez
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "24px 28px" }}>
              {/* Card da tarefa em andamento */}
              <div style={{
                padding: "16px 18px", borderRadius: 16, marginBottom: 20,
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.25)",
              }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
                  ⚡ Exportação em andamento
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { label: "Turma",      value: modalOcupado.turma },
                    { label: "Disciplina", value: modalOcupado.disciplina },
                    { label: "Bimestre",   value: modalOcupado.bimestre },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      flex: "1 1 120px", padding: "8px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <div style={{ fontSize: "0.58rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#e2e8f0" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mensagem */}
              <div style={{
                padding: "12px 16px", borderRadius: 12, marginBottom: 20,
                background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
                fontSize: "0.82rem", color: "#fde68a", lineHeight: 1.65,
              }}>
                ⚠️ O Agente está fazendo login e navegando no EDUCADF.
                Iniciar outra exportação ao mesmo tempo pode causar
                <strong style={{ color: "#fbbf24" }}> conflito de sessão</strong> e falha em ambas.
                <br /><br />
                <strong style={{ color: "#fbbf24" }}>Aguarde a conclusão</strong> e tente novamente.
              </div>

              <button
                onClick={() => setModalOcupado(null)}
                style={{
                  width: "100%", padding: "13px", borderRadius: 12,
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  border: "none", color: "#fff",
                  fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
                }}
              >
                Entendido — vou aguardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════ MODAL RESULTADO ══════════════════ */}
      {modalResultado && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setModalResultado(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420, margin: "0 16px",
              borderRadius: 24, overflow: "hidden",
              background: "linear-gradient(160deg, #1a1f35 0%, #12172a 100%)",
              border: `1px solid ${modalResultado.tipo === 'sucesso' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            }}
          >
            {/* Header colorido */}
            <div style={{
              background: modalResultado.tipo === 'sucesso'
                ? "linear-gradient(135deg, #16a34a, #15803d)"
                : "linear-gradient(135deg, #dc2626, #b91c1c)",
              padding: "28px 28px 22px", textAlign: "center",
            }}>
              <div style={{ fontSize: "2.6rem", marginBottom: 10 }}>
                {modalResultado.tipo === 'sucesso' ? '✅' : '❌'}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
                {modalResultado.titulo}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "24px 28px" }}>
              <div style={{
                padding: "14px 16px", borderRadius: 14, marginBottom: 20,
                background: modalResultado.tipo === 'sucesso' ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
                border: `1px solid ${modalResultado.tipo === 'sucesso' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                fontSize: "0.85rem",
                color: modalResultado.tipo === 'sucesso' ? "#86efac" : "#fca5a5",
                lineHeight: 1.65, whiteSpace: "pre-line",
              }}>
                {modalResultado.texto}
              </div>
              <button
                onClick={() => setModalResultado(null)}
                style={{
                  width: "100%", padding: "12px", borderRadius: 12,
                  background: modalResultado.tipo === 'sucesso'
                    ? "linear-gradient(135deg, #16a34a, #15803d)"
                    : "linear-gradient(135deg, #dc2626, #b91c1c)",
                  border: "none", color: "#fff",
                  fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}
              >
                {modalResultado.tipo === 'sucesso' ? 'Ótimo!' : 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════ LISTA DE PLANOS ══════════════════ */}
      <div style={{ padding: "20px 32px 40px" }}>
        {carregando ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, flexDirection: "column", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1",
              animation: "spin 0.9s linear infinite",
            }} />
            <span style={{ color: "#475569", fontSize: "0.85rem", fontWeight: 600 }}>Carregando planos...</span>
          </div>
        ) : planosFiltrados.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: "rgba(255,255,255,0.02)", borderRadius: 20,
            border: "1px dashed rgba(255,255,255,0.08)",
          }}>
            <ClipboardDocumentListIcon style={{ width: 48, color: "#334155", margin: "0 auto 14px" }} />
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>
              {filtro === "exportados" ? "Nenhum plano foi exportado ainda." :
               filtro === "prontos"    ? "Nenhum plano pronto para exportar." :
               "Nenhum Plano de Avaliação com coluna Bimestral encontrado."}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#334155" }}>
              Para iniciar, crie Planos de Avaliação com a coluna{" "}
              <strong style={{ color: "#a78bfa" }}>Avaliação Bimestral</strong> habilitada
              e aguarde aprovação da Direção.
            </div>
          </div>
        ) : (
          planosFiltrados.map(plano => (
            <PlanCard
              key={plano.id}
              plano={plano}
              exportandoId={exportandoId}
              onExportar={(p) => setModalConfirm(p)}
            />
          ))
        )}
      </div>

      {/* ═════════════════════ MODAL CONFIRMAR EXPORT ═══════════ */}
      {modalConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setModalConfirm(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480, margin: "0 16px",
              borderRadius: 24, overflow: "hidden",
              background: "linear-gradient(160deg, #1a1f35 0%, #12172a 100%)",
              border: "1px solid rgba(99,102,241,0.25)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header modal */}
            <div style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              padding: "26px 32px 22px", textAlign: "center", position: "relative",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
                background: "rgba(255,255,255,0.12)",
                border: "2px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem",
              }}>🚀</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#fff" }}>
                Exportar Estrutura para EDUCADF
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(196,181,253,0.85)", marginTop: 6 }}>
                Apenas a coluna <strong style={{ color: "#c4b5fd" }}>Avaliação Bimestral</strong> será criada
              </div>
            </div>

            {/* Body modal */}
            <div style={{ padding: "24px 28px" }}>
              {/* Cards de resumo */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Disciplina", value: modalConfirm.disciplina },
                  { label: "Turma",      value: modalConfirm.turmas },
                  { label: "Bimestre",   value: modalConfirm.bimestre },
                  { label: "Status",     value: modalConfirm.status },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: "10px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#e2e8f0" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Escopo */}
              <div style={{
                padding: "12px 16px", borderRadius: 12, marginBottom: 18,
                background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)",
                fontSize: "0.78rem", color: "#a5b4fc", lineHeight: 1.6,
              }}>
                <strong style={{ color: "#818cf8" }}>🎯 O que será exportado:</strong><br />
                A coluna <strong style={{ color: "#e2e8f0" }}>Avaliação Bimestral</strong> será criada no portal EDUCADF
                para <strong style={{ color: "#e2e8f0" }}>{modalConfirm.turmas}</strong> · <strong style={{ color: "#e2e8f0" }}>{modalConfirm.bimestre}</strong>.
                As notas não serão alteradas nesta etapa.
              </div>

              {/* Botões */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setModalConfirm(null)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8", cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleExportarEstrutura(modalConfirm)}
                  style={{
                    flex: 2, padding: "12px", borderRadius: 12, fontWeight: 800, fontSize: "0.88rem",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none", color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
                  }}
                >
                  <RocketLaunchIcon style={{ width: 16 }} />
                  Confirmar Exportação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL SEM CREDENCIAIS ═══════════════ */}
      {modalSemCred && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 400,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setModalSemCred(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 440, margin: "0 16px",
              borderRadius: 24, overflow: "hidden",
              background: "linear-gradient(160deg, #1c1a10 0%, #12100a 100%)",
              border: "1px solid rgba(245,158,11,0.3)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.1)",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #d97706, #b45309)",
              padding: "26px 28px 20px", textAlign: "center",
            }}>
              <div style={{ fontSize: "2.4rem", marginBottom: 10, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}>🔐</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
                Credenciais EDUCADF não configuradas
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(254,243,199,0.8)", marginTop: 6 }}>
                O Agente precisa das suas credenciais para agir em seu nome
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "22px 24px" }}>
              <div style={{
                padding: "14px 16px", borderRadius: 14, marginBottom: 18,
                background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
                fontSize: "0.82rem", color: "#fde68a", lineHeight: 1.65,
              }}>
                <strong style={{ color: "#fbbf24" }}>O que precisa fazer:</strong><br />
                Acesse <strong style={{ color: "#fff" }}>Agente EDUCA → Credenciais</strong>, informe
                seu usuário e senha do portal <strong style={{ color: "#fff" }}>educadf.se.df.gov.br</strong>
                e clique em "Salvar e Conectar". O Agente testará a conexão automaticamente.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setModalSemCred(false)}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                  }}
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setModalSemCred(false);
                    // Navega para /agente-educa/credenciais dentro do SPA
                    const base = window.location.pathname.replace(/\/agente-educa.*/, '');
                    window.location.href = `${window.location.origin}${base}/agente-educa/credenciais`;
                  }}
                  style={{
                    flex: 2, padding: "12px", borderRadius: 12,
                    background: "linear-gradient(135deg, #d97706, #b45309)",
                    border: "none", color: "#fff",
                    fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(180,83,9,0.4)",
                  }}
                >
                  <LockClosedIcon style={{ width: 16 }} />
                  Configurar Credenciais
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
