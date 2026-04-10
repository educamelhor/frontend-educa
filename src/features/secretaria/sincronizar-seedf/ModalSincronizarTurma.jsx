// src/features/secretaria/sincronizar-seedf/ModalSincronizarTurma.jsx
// ============================================================================
// Modal Premium — Sincronizar Turma Específica com SEEDF
// ============================================================================
// Permite ao secretário selecionar UMA turma da escola e disparar a
// sincronização somente para essa turma. Feedback em tempo real via polling.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api";

// ─────────────────────────────────────────────
// Ícones SVG inline
// ─────────────────────────────────────────────
const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const IconSync = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ─────────────────────────────────────────────
// Ano letivo padrão (mesma lógica do restante do sistema)
// Janeiro ainda pertence ao ano anterior
// ─────────────────────────────────────────────
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// ─────────────────────────────────────────────
// Mapeamento de turno
// ─────────────────────────────────────────────
const TURNO_LABELS = {
  matutino: "☀️ Matutino",
  vespertino: "🌤️ Vespertino",
  noturno: "🌙 Noturno",
  integral: "📚 Integral",
};

function turnoLabel(turno) {
  if (!turno) return "Outros";
  return TURNO_LABELS[turno.toLowerCase()] || turno;
}

// ─────────────────────────────────────────────
// Estilos CSS-in-JS
// ─────────────────────────────────────────────
const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    animation: "fadeIn 0.2s ease-out",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "520px",
    maxHeight: "85vh",
    borderRadius: "20px",
    overflow: "hidden",
    background: "#ffffff",
    boxShadow:
      "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
    animation: "slideUp 0.3s ease-out",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    position: "relative",
    padding: "24px 28px 18px",
    background: "linear-gradient(135deg, #1e3a5f 0%, #0f2847 50%, #0a1628 100%)",
    overflow: "hidden",
    flexShrink: 0,
  },
  headerGlow: {
    position: "absolute",
    top: "-50%",
    right: "-20%",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  headerGlow2: {
    position: "absolute",
    bottom: "-30%",
    left: "-10%",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  iconBadge: {
    display: "inline-flex",
    padding: "10px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.15))",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#c4b5fd",
    marginBottom: "12px",
  },
  body: {
    padding: "20px 28px 24px",
    overflowY: "auto",
    flex: 1,
  },
  searchWrapper: {
    position: "relative",
    marginBottom: "16px",
  },
  searchInput: {
    width: "100%",
    padding: "10px 14px 10px 38px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    fontSize: "14px",
    color: "#1f2937",
    outline: "none",
    transition: "all 0.2s ease",
    background: "#fafbfc",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
  },
  turmaItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    border: "1.5px solid transparent",
  },
  turmaItemSelected: {
    background: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
    borderColor: "#8b5cf6",
    boxShadow: "0 2px 8px rgba(139,92,246,0.15)",
  },
  turmaItemHover: {
    background: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  turmaRadio: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    border: "2px solid #d1d5db",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.15s ease",
  },
  turmaRadioSelected: {
    borderColor: "#8b5cf6",
    background: "#8b5cf6",
  },
  turmaRadioDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#ffffff",
  },
  groupLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "8px 14px 4px",
  },
  footer: {
    padding: "16px 28px 20px",
    borderTop: "1px solid #f1f5f9",
    background: "#fafbfc",
    flexShrink: 0,
  },
  btnPrimary: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    fontSize: "14px",
    fontWeight: 600,
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    letterSpacing: "-0.01em",
  },
  btnSecondary: {
    width: "100%",
    padding: "11px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    fontSize: "13px",
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    background: "transparent",
    transition: "all 0.2s ease",
    marginTop: "10px",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  // Feedback durante sincronização
  syncFeedbackBox: {
    padding: "16px",
    borderRadius: "12px",
    textAlign: "center",
  },
  progressBar: {
    height: "6px",
    borderRadius: "99px",
    background: "#e5e7eb",
    overflow: "hidden",
    marginTop: "12px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "99px",
    background: "linear-gradient(90deg, #8b5cf6, #6366f1, #3b82f6)",
    transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

// ─────────────────────────────────────────────
// CSS animations (injetadas uma vez)
// ─────────────────────────────────────────────
const ANIM_CSS = `
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes progressShimmer {
  0% { background-position: -200% 0 }
  100% { background-position: 200% 0 }
}
`;

// ============================================================================
// Componente Principal
// ============================================================================
export default function ModalSincronizarTurma({ open, onClose, onSyncStarted }) {
  // ── Estado do modal ──
  const [turmas, setTurmas] = useState([]);
  const [turmasLoading, setTurmasLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [hoveredTurma, setHoveredTurma] = useState(null);

  // ── Estado da sincronização ──
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | 'polling' | 'sucesso' | 'falha' | 'erro'
  const [syncData, setSyncData] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const pollingRef = useRef(null);
  const searchRef = useRef(null);

  // ── Estado do modal de confirmação de inativação ──
  const [pendentesModal, setPendentesModal] = useState(null);
  // { turma, pendentes: [{id, codigo, estudante}], selecionados: Set }
  const [inativando, setInativando] = useState(false);
  const [inativacaoConcluida, setInativacaoConcluida] = useState(false);
  const [qtdInativados, setQtdInativados] = useState(0);

  // ── Inject CSS animations ──
  useEffect(() => {
    if (document.getElementById("modal-sync-turma-anims")) return;
    const style = document.createElement("style");
    style.id = "modal-sync-turma-anims";
    style.textContent = ANIM_CSS;
    document.head.appendChild(style);
  }, []);

  // ── Carregar turmas quando abre o modal ──
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedTurma(null);
    setSyncing(false);
    setSyncStatus(null);
    setSyncData(null);
    setSyncError(null);
    setPendentesModal(null);
    setInativando(false);
    setInativacaoConcluida(false);
    setQtdInativados(0);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    (async () => {
      setTurmasLoading(true);
      try {
        const res = await api.get("/api/turmas");
        const data = Array.isArray(res.data) ? res.data : res.data?.turmas || [];
        // Filtra pelo ano letivo atual (mesmo critério do restante do sistema)
        const anoAtual = anoLetivoPadrao();
        const turmasAnoAtual = data.filter((t) => Number(t.ano) === Number(anoAtual));
        setTurmas(turmasAnoAtual);
      } catch (err) {
        console.error("[ModalSyncTurma] Erro ao carregar turmas:", err);
        setTurmas([]);
      } finally {
        setTurmasLoading(false);
      }
    })();

    setTimeout(() => searchRef.current?.focus(), 300);
  }, [open]);

  // ── Cleanup polling on unmount ──
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Polling de status ──
  const iniciarPolling = useCallback((logId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/agente/sincronizacao/status?log_id=${logId}`);
        const data = res.data?.data;
        setSyncData(data);

        if (data?.status && data.status !== "em_andamento") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setSyncStatus(data.status);
          setSyncing(false);
        }
      } catch {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setSyncStatus("erro");
        setSyncing(false);
      }
    }, 3000);
  }, []);

  // ── Disparar sincronização por turma ──
  const handleSync = async () => {
    if (!selectedTurma) return;

    setSyncing(true);
    setSyncStatus("polling");
    setSyncError(null);
    setSyncData(null);

    try {
      const res = await api.post("/api/agente/sincronizar", {
        turmas: [selectedTurma.turma], // nome da turma
      });

      if (res.data?.ok) {
        const logId = res.data.log_id;
        setSyncData({ id: logId, status: "em_andamento" });
        iniciarPolling(logId);
        onSyncStarted?.();
      } else {
        setSyncStatus("falha");
        setSyncError(res.data?.message || "Erro ao iniciar sincronização.");
        setSyncing(false);
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        setSyncError("Já existe uma sincronização em andamento. Aguarde a conclusão.");
      } else {
        setSyncError(err?.response?.data?.message || "Erro ao iniciar sincronização.");
      }
      setSyncStatus("falha");
      setSyncing(false);
    }
  };

  // ── Fechar modal ──
  const handleClose = () => {
    if (syncing) return; // não fecha durante sync
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPendentesModal(null);
    onClose?.();
  };

  // ── Confirmar inativação dos alunos selecionados ──
  const handleConfirmarInativacao = async () => {
    if (!pendentesModal) return;
    const ids = [...pendentesModal.selecionados];
    if (ids.length === 0) { setPendentesModal(null); return; }
    setInativando(true);
    try {
      await api.post("/api/alunos/inativar-lote", { alunoIds: ids });
      setQtdInativados(ids.length);
      setInativacaoConcluida(true);
      setPendentesModal(null);
    } catch (err) {
      console.error("Erro ao inativar:", err);
      alert(err?.response?.data?.message || "Erro ao inativar alunos.");
    } finally {
      setInativando(false);
    }
  };

  const toggleSelecionado = (id) => {
    if (!pendentesModal) return;
    const s = new Set(pendentesModal.selecionados);
    s.has(id) ? s.delete(id) : s.add(id);
    setPendentesModal({ ...pendentesModal, selecionados: s });
  };

  const toggleTodos = () => {
    if (!pendentesModal) return;
    const all = pendentesModal.selecionados.size === pendentesModal.pendentes.length;
    const s = all ? new Set() : new Set(pendentesModal.pendentes.map(p => p.id));
    setPendentesModal({ ...pendentesModal, selecionados: s });
  };

  if (!open) return null;

  // ── Filtrar e agrupar turmas por turno ──
  const searchLower = search.toLowerCase();
  const filteredTurmas = turmas.filter((t) => {
    const nome = (t.turma || t.nome || "").toLowerCase();
    const turno = (t.turno || "").toLowerCase();
    const etapa = (t.etapa || "").toLowerCase();
    return nome.includes(searchLower) || turno.includes(searchLower) || etapa.includes(searchLower);
  });

  const groupedByTurno = {};
  for (const t of filteredTurmas) {
    const key = (t.turno || "outros").toLowerCase();
    if (!groupedByTurno[key]) groupedByTurno[key] = [];
    groupedByTurno[key].push(t);
  }

  // Ordem fixa dos turnos
  const turnoOrder = ["matutino", "vespertino", "integral", "noturno", "outros"];
  const sortedTurnos = Object.keys(groupedByTurno).sort(
    (a, b) => turnoOrder.indexOf(a) - turnoOrder.indexOf(b)
  );

  // ── Estado de progresso ──
  const pAtual = syncData?.progresso_atual || 0;
  const pTotal = syncData?.progresso_total || 0;
  const pTurma = syncData?.progresso_turma || null;
  const pct = pTotal > 0 ? Math.round((pAtual / pTotal) * 100) : 0;
  const indeterminado = pTotal === 0 && syncStatus === "polling";

  const isSyncActive = syncing || syncStatus === "polling";
  const isSyncDone = ["sucesso", "parcial", "scraping_concluido"].includes(syncStatus);
  const isSyncFailed = ["falha", "erro", "falha_scraping", "falha_importacao"].includes(syncStatus);

  const resumo = syncData?.relatorio?.resumo || null;

  // Extrai lista de pendentes de inativação do relatório do agente
  const pendentesFromReport = (() => {
    if (!syncData?.relatorio?.etapa_importacao?.detalhes) return [];
    const all = [];
    for (const d of syncData.relatorio.etapa_importacao.detalhes) {
      if (Array.isArray(d.pendentesInativacaoLista)) {
        all.push(...d.pendentesInativacaoLista);
      }
    }
    return all;
  })();
  const hasPendentes = isSyncDone && pendentesFromReport.length > 0 && !pendentesModal && !inativacaoConcluida;

  // Extrai detalhes do erro do relatório do agente
  const erroDetalhe = (() => {
    if (syncError) return syncError;
    if (!syncData?.relatorio) {
      // Sem relatório algum — pode ser timeout ou crash antes do handler
      return "O agente encerrou sem gerar um relatório. Verifique os logs do servidor.";
    }
    const rel = syncData.relatorio;
    // Relatório de erro do crash handler Python (agent.py try/except)
    if (rel.error) return rel.error;
    // Relatório com resumo de erro
    if (rel.resumo?.erro) return rel.resumo.erro;
    if (rel.stderr) {
      // Pega as últimas linhas relevantes do stderr
      const lines = rel.stderr.trim().split("\n").filter(Boolean);
      const last = lines.slice(-5).join("\n");
      return last;
    }
    if (rel.stdout) {
      // Se existe stdout com indicação de erro
      const lines = rel.stdout.trim().split("\n").filter(Boolean);
      const errorLines = lines.filter(l => /error|erro|falha|traceback|exception/i.test(l));
      if (errorLines.length > 0) return errorLines.slice(-3).join("\n");
    }
    return "Falha na sincronização. Verifique os logs do servidor.";
  })();

  return (
    <div style={styles.backdrop} onClick={(e) => e.target === e.currentTarget && !isSyncActive && handleClose()}>
      <div style={styles.card}>
        {/* ═══ Header gradient ═══ */}
        <div style={styles.header}>
          <div style={styles.headerGlow} />
          <div style={styles.headerGlow2} />

          <div style={styles.iconBadge}>
            <IconUsers />
          </div>

          <h2
            style={{
              color: "#ffffff",
              fontSize: "19px",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
            }}
          >
            Sincronizar Turma Específica
          </h2>
          <p
            style={{
              color: "rgba(148, 163, 184, 0.9)",
              fontSize: "13px",
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            Selecione uma turma para sincronizar com o portal SEEDF
          </p>
        </div>

        {/* ═══ Body ═══ */}
        <div style={styles.body}>
          {/* ── Tela de seleção de turma ── */}
          {!isSyncActive && !isSyncDone && !isSyncFailed && (
            <>
              {/* Busca */}
              <div style={styles.searchWrapper}>
                <span style={styles.searchIcon}>
                  <IconSearch />
                </span>
                <input
                  ref={searchRef}
                  id="input-busca-turma-sync"
                  type="text"
                  placeholder="Buscar turma..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#8b5cf6";
                    e.target.style.background = "#ffffff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.background = "#fafbfc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Lista de turmas */}
              {turmasLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
                  <div
                    style={{
                      ...styles.spinner,
                      borderColor: "rgba(139,92,246,0.2)",
                      borderTopColor: "#8b5cf6",
                      margin: "0 auto 12px",
                    }}
                  />
                  <p style={{ fontSize: "13px" }}>Carregando turmas...</p>
                </div>
              ) : filteredTurmas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
                  <p style={{ fontSize: "13px" }}>
                    {turmas.length === 0
                      ? "Nenhuma turma cadastrada na escola."
                      : "Nenhuma turma encontrada para o filtro."}
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: "340px", overflowY: "auto", margin: "0 -4px" }}>
                  {sortedTurnos.map((turno) => (
                    <div key={turno}>
                      <div style={styles.groupLabel}>{turnoLabel(turno)}</div>
                      {groupedByTurno[turno].map((t) => {
                        const id = t.id;
                        const nome = t.turma || t.nome;
                        const isSelected = selectedTurma?.id === id;
                        const isHovered = hoveredTurma === id;
                        return (
                          <div
                            key={id}
                            onClick={() => setSelectedTurma(t)}
                            onMouseEnter={() => setHoveredTurma(id)}
                            onMouseLeave={() => setHoveredTurma(null)}
                            style={{
                              ...styles.turmaItem,
                              ...(isSelected ? styles.turmaItemSelected : {}),
                              ...(!isSelected && isHovered ? styles.turmaItemHover : {}),
                            }}
                          >
                            <div
                              style={{
                                ...styles.turmaRadio,
                                ...(isSelected ? styles.turmaRadioSelected : {}),
                              }}
                            >
                              {isSelected && <div style={styles.turmaRadioDot} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: isSelected ? 600 : 500,
                                  color: isSelected ? "#5b21b6" : "#1f2937",
                                }}
                              >
                                {nome}
                              </div>
                              {t.etapa && (
                                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "1px" }}>
                                  {t.etapa} — {t.serie || ""}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Tela de sincronização em andamento ── */}
          {isSyncActive && (
            <div style={styles.syncFeedbackBox}>
              <div
                style={{
                  ...styles.spinner,
                  width: "36px",
                  height: "36px",
                  borderWidth: "3px",
                  borderColor: "rgba(139,92,246,0.2)",
                  borderTopColor: "#8b5cf6",
                  margin: "0 auto 16px",
                }}
              />
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>
                Sincronizando turma...
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                {selectedTurma?.turma || selectedTurma?.nome}
              </div>

              {/* Barra de progresso */}
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: indeterminado ? "100%" : `${pct}%`,
                    opacity: indeterminado ? 0.4 : 1,
                    backgroundSize: indeterminado ? "200% 100%" : "100% 100%",
                    animation: indeterminado ? "progressShimmer 2s linear infinite" : "none",
                  }}
                />
              </div>

              <div style={{ marginTop: "8px" }}>
                {indeterminado ? (
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                    ⏳ Conectando ao portal SEEDF...
                  </p>
                ) : pTotal > 0 ? (
                  <>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "#6d28d9" }}>{pct}%</span>
                    <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                      Turma {pAtual} de {pTotal}
                      {pTurma ? <> — <span style={{ fontWeight: 500, color: "#4b5563" }}>{pTurma}</span></> : ""}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* ── Resultado: Sucesso ── */}
          {isSyncDone && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "#ffffff",
                  boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
                }}
              >
                <IconCheck />
              </div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#166534", marginBottom: "6px" }}>
                Sincronização Concluída!
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
                Turma: <strong>{selectedTurma?.turma || selectedTurma?.nome}</strong>
              </div>

              {/* Grade de resultados — 4 métricas + duração */}
              {resumo && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    textAlign: "center",
                  }}
                >
                  {/* 1. Localizados */}
                  <div style={{ padding: "12px", borderRadius: "10px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#2563eb" }}>
                      {resumo.alunos_localizados ?? 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>Localizados</div>
                  </div>
                  {/* 2. Inseridos */}
                  <div style={{ padding: "12px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#16a34a" }}>
                      {resumo.alunos_inseridos ?? 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>Inseridos</div>
                  </div>
                  {/* 3. Já existiam */}
                  <div style={{ padding: "12px", borderRadius: "10px", background: "#faf5ff", border: "1px solid #e9d5ff" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#7c3aed" }}>
                      {resumo.alunos_jaExistiam ?? (Math.max(0, (resumo.alunos_localizados ?? 0) - (resumo.alunos_inseridos ?? 0) - (resumo.alunos_reativados ?? 0)))}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>Já existiam</div>
                  </div>
                  {/* 4. Inativados / Pendentes */}
                  <div style={{ padding: "12px", borderRadius: "10px", background: inativacaoConcluida ? "#f0fdf4" : (pendentesFromReport.length > 0 ? "#fff7ed" : "#f8fafc"), border: `1px solid ${inativacaoConcluida ? "#bbf7d0" : (pendentesFromReport.length > 0 ? "#fdba74" : "#e2e8f0")}` }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: inativacaoConcluida ? "#16a34a" : (pendentesFromReport.length > 0 ? "#ea580c" : "#475569") }}>
                      {inativacaoConcluida ? qtdInativados : (pendentesFromReport.length > 0 ? pendentesFromReport.length : (resumo.alunos_inativados ?? 0))}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                      {inativacaoConcluida ? "Inativados \u2705" : (pendentesFromReport.length > 0 ? "Pendentes \u26a0" : "Inativados")}
                    </div>
                  </div>
                  {/* Duração (span full width) */}
                  {resumo.duracao_s && (
                    <div style={{ padding: "10px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                        <IconClock />
                        {Math.round(resumo.duracao_s)}s
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checklist de verificação */}
              {typeof resumo?.turmas_vazias === "number" && (
                <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "10px", background: resumo.turmas_vazias > 0 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${resumo.turmas_vazias > 0 ? "#fecaca" : "#bbf7d0"}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: resumo.turmas_vazias > 0 ? "#dc2626" : "#16a34a" }}>
                    {resumo.turmas_vazias > 0
                      ? `⚠ ${resumo.turmas_vazias} turma(s) sem alunos após importação`
                      : `✅ ${resumo.turmas_ok ?? resumo.pdfs_baixados ?? 0} turma(s) verificada(s) — ${resumo.total_alunos_verificados ?? resumo.alunos_localizados ?? 0} alunos no total`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Resultado: Falha ── */}
          {isSyncFailed && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "#ffffff",
                  boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
                }}
              >
                <IconX />
              </div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#991b1b", marginBottom: "6px" }}>
                Sincronização Falhou
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                Turma: <strong>{selectedTurma?.turma || selectedTurma?.nome}</strong>
              </div>
              {erroDetalhe && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    fontSize: "13px",
                    color: "#991b1b",
                    textAlign: "left",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: "120px",
                    overflowY: "auto",
                  }}
                >
                  {erroDetalhe}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div style={styles.footer}>
          {/* Botão principal: depende do estado */}
          {!isSyncActive && !isSyncDone && !isSyncFailed && (
            <>
              <button
                id="btn-sync-turma-confirmar"
                type="button"
                disabled={!selectedTurma}
                onClick={handleSync}
                style={{
                  ...styles.btnPrimary,
                  background: !selectedTurma
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                  boxShadow: !selectedTurma
                    ? "none"
                    : "0 4px 14px rgba(109,40,217,0.35)",
                  opacity: !selectedTurma ? 0.7 : 1,
                }}
              >
                <IconSync />
                Sincronizar Turma Selecionada
              </button>
              <button
                type="button"
                onClick={handleClose}
                style={styles.btnSecondary}
              >
                Cancelar
              </button>
            </>
          )}

          {isSyncActive && (
            <div style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>
              <span>Aguarde a conclusão da sincronização...</span>
            </div>
          )}

          {(isSyncDone || isSyncFailed) && (
            <>
              {/* Botão de revisão de pendentes (se houver) */}
              {hasPendentes && (
                <button
                  type="button"
                  onClick={() => {
                    setPendentesModal({
                      turma: selectedTurma?.turma || selectedTurma?.nome || "?",
                      pendentes: pendentesFromReport,
                      selecionados: new Set(pendentesFromReport.map(p => p.id)),
                    });
                  }}
                  style={{
                    ...styles.btnPrimary,
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                  }}
                >
                  ⚠ Revisar {pendentesFromReport.length} Aluno(s) Ausente(s)
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                style={{
                  ...styles.btnPrimary,
                  background: isSyncDone
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : "linear-gradient(135deg, #64748b, #475569)",
                  boxShadow: isSyncDone
                    ? "0 4px 14px rgba(34,197,94,0.3)"
                    : "0 4px 14px rgba(71,85,105,0.3)",
                  marginTop: hasPendentes ? "8px" : 0,
                }}
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MODAL DE CONFIRMAÇÃO: Inativação de Alunos Ausentes
          Mesmo padrão visual do ImportPDF.jsx da SECRETARIA
          ═══════════════════════════════════════════════════════ */}
      {pendentesModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem", background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={(e) => e.target === e.currentTarget && !inativando && setPendentesModal(null)}
        >
          <div
            style={{
              width: "100%", maxWidth: "520px", borderRadius: "16px",
              overflow: "hidden", background: "#fff",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              animation: "slideUp 0.3s ease-out",
            }}
          >
            {/* Header gradiente */}
            <div style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "44px", height: "44px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.2)", color: "#fff",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="17" y1="11" x2="22" y2="11" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ color: "#fff", fontSize: "17px", fontWeight: 700, margin: 0 }}>
                    Alunos Ausentes no PDF
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", margin: "2px 0 0" }}>
                    Turma <strong style={{ color: "#fff" }}>{pendentesModal.turma}</strong>
                    {" "}— {pendentesModal.pendentes.length} aluno(s) não encontrado(s)
                  </p>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div style={{ padding: "20px 24px" }}>
              {/* Explicação */}
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: "12px", padding: "14px", marginBottom: "16px",
              }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
                  <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, margin: 0 }}>
                    Os alunos listados abaixo <strong>constam na turma</strong> no EDUCA.MELHOR, mas{" "}
                    <strong>não foram encontrados no PDF</strong> importado do EducaDF. Isso pode significar que foram{" "}
                    <strong>transferidos</strong> ou <strong>removidos</strong> da turma.
                  </p>
                </div>
              </div>

              {/* Header da lista */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Selecione os alunos para inativar
                </span>
                <button
                  onClick={toggleTodos}
                  style={{ fontSize: "12px", color: "#2563eb", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
                >
                  {pendentesModal.selecionados.size === pendentesModal.pendentes.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>

              {/* Lista de alunos */}
              <div style={{ maxHeight: "240px", overflowY: "auto", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                {pendentesModal.pendentes.map((aluno, idx) => {
                  const sel = pendentesModal.selecionados.has(aluno.id);
                  return (
                    <label
                      key={aluno.id}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 16px", cursor: "pointer",
                        background: sel ? "#fef2f2" : "#fff",
                        borderBottom: idx < pendentesModal.pendentes.length - 1 ? "1px solid #f3f4f6" : "none",
                        transition: "background 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: "20px", height: "20px", borderRadius: "6px",
                          border: sel ? "2px solid #ef4444" : "2px solid #d1d5db",
                          background: sel ? "#ef4444" : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "all 0.15s",
                        }}
                        onClick={(e) => { e.preventDefault(); toggleSelecionado(aluno.id); }}
                      >
                        {sel && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 6L5 8L9 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#f3f4f6", color: "#6b7280", fontSize: "11px", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: sel ? 600 : 500, color: sel ? "#991b1b" : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {aluno.estudante}
                        </div>
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "1px" }}>
                          RE: {aluno.codigo}
                        </div>
                      </div>
                      {sel && (
                        <span style={{
                          fontSize: "11px", fontWeight: 500, color: "#b91c1c",
                          background: "#fee2e2", border: "1px solid #fecaca",
                          padding: "2px 8px", borderRadius: "99px", flexShrink: 0,
                        }}>Inativar</span>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Contador */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "13px" }}>
                <span style={{ color: "#6b7280" }}>
                  <span style={{ fontWeight: 600, color: "#dc2626" }}>{pendentesModal.selecionados.size}</span>{" "}
                  de {pendentesModal.pendentes.length} selecionado(s)
                </span>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>Não selecionados permanecerão ativos</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "0 24px 20px", display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setPendentesModal(null)}
                disabled={inativando}
                style={{
                  flex: 1, padding: "11px", borderRadius: "12px",
                  border: "1.5px solid #e5e7eb", fontSize: "13px", fontWeight: 500,
                  color: "#6b7280", cursor: "pointer", background: "#f9fafb",
                  opacity: inativando ? 0.6 : 1,
                }}
              >Ignorar</button>
              <button
                type="button"
                onClick={handleConfirmarInativacao}
                disabled={inativando || pendentesModal.selecionados.size === 0}
                style={{
                  flex: 1, padding: "11px", borderRadius: "12px",
                  border: "none", fontSize: "13px", fontWeight: 600,
                  color: "#fff", cursor: "pointer",
                  background: (inativando || pendentesModal.selecionados.size === 0)
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #ef4444, #dc2626)",
                  boxShadow: pendentesModal.selecionados.size > 0 && !inativando
                    ? "0 4px 14px rgba(239,68,68,0.3)" : "none",
                  opacity: (inativando || pendentesModal.selecionados.size === 0) ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
              >
                {inativando ? (
                  <><div style={{ ...styles.spinner, width: "16px", height: "16px" }} /> Inativando...</>
                ) : (
                  `Inativar ${pendentesModal.selecionados.size} Aluno(s)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
