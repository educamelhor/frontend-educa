import React, { useEffect, useState } from "react";
import api from "../../../services/api";

/**
 * ModalRecallTipoAvaliacao.jsx
 * ─────────────────────────────────────────────────────────
 * Modal premium de "recall" — Avisa o professor que existem
 * planos com itens sem o campo "Tipo de Avaliação" preenchido.
 * Renderiza SEMPRE que houver pendências, até que todas
 * sejam resolvidas. Funciona como um recall automático.
 * ─────────────────────────────────────────────────────────
 */

// ── Estilos premium ──
const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9998,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    animation: "recallFadeIn 0.25s ease-out",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "500px",
    borderRadius: "20px",
    overflow: "hidden",
    background: "#ffffff",
    boxShadow:
      "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
    animation: "recallSlideUp 0.35s ease-out",
  },
  header: {
    position: "relative",
    padding: "28px 28px 20px",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: "-40%",
    right: "-15%",
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  iconBadge: {
    display: "inline-flex",
    padding: "12px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.25)",
    marginBottom: "14px",
  },
  body: {
    padding: "24px 28px",
  },
  infoBox: {
    padding: "14px 16px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
    border: "1px solid #fde68a",
    fontSize: "13px",
    color: "#92400e",
    lineHeight: 1.6,
    marginBottom: "16px",
  },
  planosList: {
    maxHeight: "180px",
    overflowY: "auto",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    background: "#fafbfc",
  },
  planoItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "13px",
  },
  badge: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "20px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    flexShrink: 0,
  },
  footer: {
    padding: "16px 28px 22px",
    borderTop: "1px solid #f1f5f9",
    background: "#fafbfc",
  },
  btnEntendi: {
    width: "100%",
    padding: "13px",
    borderRadius: "12px",
    border: "none",
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
    cursor: "pointer",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    letterSpacing: "-0.01em",
  },
};

// ── CSS Animations ──
const ANIM_CSS = `
@keyframes recallFadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes recallSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
`;

// ── Helpers ──
const statusColors = {
  RASCUNHO: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  ENVIADO: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  APROVADO: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  DEVOLVIDO: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
};

export default function ModalRecallTipoAvaliacao({ onClose }) {
  const [recallData, setRecallData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  // Injeta animações
  useEffect(() => {
    if (document.getElementById("recall-modal-anims")) return;
    const el = document.createElement("style");
    el.id = "recall-modal-anims";
    el.textContent = ANIM_CSS;
    document.head.appendChild(el);
  }, []);

  // Verifica recall na montagem
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/avaliacoes/recall/check");
        if (data.ok && data.pendente) {
          setRecallData(data);
          setShow(true);
        }
      } catch (err) {
        console.error("[Recall] Erro ao verificar:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !show || !recallData) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        {/* ═══ Header ═══ */}
        <div style={styles.header}>
          <div style={styles.headerGlow} />

          <div style={styles.iconBadge}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <h2
            style={{
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
            }}
          >
            Atualização Necessária
          </h2>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.85)",
              fontSize: "13px",
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            Seus planos precisam de uma pequena atualização
          </p>
        </div>

        {/* ═══ Body ═══ */}
        <div style={styles.body}>
          <div style={styles.infoBox}>
            <strong>📋 Novo campo obrigatório:</strong> O campo{" "}
            <strong>"Tipo de Avaliação"</strong> foi adicionado para garantir a
            sincronização automática com o{" "}
            <strong>EducaDF</strong> através do Agente EDUCA.
            <br />
            <br />
            Você possui{" "}
            <strong>
              {recallData.total_itens} atividade(s) avaliativa(s)
            </strong>{" "}
            em{" "}
            <strong>{recallData.total_planos} plano(s)</strong>{" "}
            que precisam dessa atualização. Edite cada plano e selecione o tipo de
            avaliação correspondente.
          </div>

          {/* Lista de planos pendentes */}
          <div style={styles.planosList}>
            {recallData.planos.map((p, i) => {
              const sc = statusColors[p.status] || statusColors.RASCUNHO;
              return (
                <div
                  key={p.plano_id}
                  style={{
                    ...styles.planoItem,
                    borderBottom:
                      i === recallData.planos.length - 1
                        ? "none"
                        : "1px solid #f1f5f9",
                  }}
                >
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#1f2937",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.turmas} — {p.disciplina}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                      {p.bimestre} • {p.itens_sem_tipo} item(ns) pendente(s)
                    </div>
                  </div>
                  <span
                    style={{
                      ...styles.badge,
                      background: sc.bg,
                      color: sc.color,
                      border: `1px solid ${sc.border}`,
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ Footer ═══ */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={() => {
              setShow(false);
              onClose?.();
            }}
            style={styles.btnEntendi}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(245,158,11,0.45)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(245,158,11,0.35)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Entendi — Vou atualizar meus planos
          </button>
        </div>
      </div>
    </div>
  );
}
