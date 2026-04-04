// src/features/secretaria/professores/ModalExcluirOuInativar.jsx
// ============================================================================
// Modal Premium — Excluir ou Inativar Professor
// - Header com gradiente contextual (vermelho/amarelo)
// - Ícone animado com pulse ring
// - Card com dados do professor
// - Aviso sobre dados relacionados
// - Botões com hover, loading spinner
// - Transição slide-in suave
// ============================================================================

import React, { useState } from "react";

export default function ModalExcluirOuInativar({
  open,
  onClose,
  aluno: professor,
  onDelete,
  onInactivate,
}) {
  const [step, setStep] = useState("choice"); // "choice" | "confirmDelete" | "confirmInactivate"
  const [processing, setProcessing] = useState(false);

  function fecharTudo() {
    if (processing) return;
    setStep("choice");
    onClose();
  }

  async function handleAction(action) {
    setProcessing(true);
    try {
      if (action === "excluir") {
        await onDelete(professor.id);
      } else {
        await onInactivate(professor.id);
      }
      setStep("choice");
      onClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setProcessing(false);
    }
  }

  if (!open || !professor) return null;

  // Gradiente muda conforme a ação
  const isDelete = step === "confirmDelete";
  const isInactivate = step === "confirmInactivate";
  const headerGrad = isInactivate
    ? "linear-gradient(135deg, #d97706 0%, #92400e 100%)"
    : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)";
  const headerIcon = isInactivate ? "⏸️" : step === "confirmDelete" ? "🗑️" : "⚠️";
  const headerTitle = isInactivate
    ? "Inativar Professor"
    : isDelete
    ? "Confirmar Exclusão"
    : "Excluir ou Inativar";
  const headerSubtitle = isInactivate
    ? "O professor será ocultado das listas"
    : isDelete
    ? "Esta ação é irreversível"
    : "Escolha a ação desejada";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={fecharTudo}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95%",
          maxWidth: 500,
          borderRadius: 20,
          overflow: "hidden",
          background: "linear-gradient(160deg, #fff 60%, #fef2f2 100%)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(220,38,38,0.1)",
          animation: "profModalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* CSS animations */}
        <style>{`
          @keyframes profModalSlideIn {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes profPulseRing {
            0%   { transform: scale(0.8); opacity: 0; }
            50%  { opacity: 0.4; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          @keyframes profSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* ── Header com gradiente ── */}
        <div
          style={{
            background: headerGrad,
            padding: "28px 24px 24px",
            textAlign: "center",
            position: "relative",
            transition: "background 0.3s ease",
          }}
        >
          {/* Ícone animado */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)",
                animation: "profPulseRing 2s ease-out infinite",
              }}
            />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              {headerIcon}
            </div>
          </div>
          <h3
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {headerTitle}
          </h3>
          <p
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              margin: "6px 0 0",
            }}
          >
            {headerSubtitle}
          </p>
        </div>

        {/* ── Corpo ── */}
        <div style={{ padding: "24px 24px 20px" }}>
          {/* Card com dados do professor */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: isInactivate ? "#fffbeb" : "#fef2f2",
              border: isInactivate ? "1px solid #fde68a" : "1px solid #fecaca",
              transition: "all 0.3s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: isInactivate
                    ? "linear-gradient(135deg, #d97706, #fbbf24)"
                    : "linear-gradient(135deg, #dc2626, #f87171)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 20,
                  flexShrink: 0,
                  transition: "background 0.3s ease",
                }}
              >
                {(professor.nome || "?")[0]}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontWeight: 700,
                    color: "#1f2937",
                    fontSize: 15,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {professor.nome}
                </p>
                <p style={{ color: "#6b7280", fontSize: 13, margin: "3px 0 0" }}>
                  CPF: {(() => { const d = String(professor.cpf || "").replace(/\D/g, "").padStart(11, "0"); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : professor.cpf; })()}
                </p>
                <p style={{ color: "#6b7280", fontSize: 12, margin: "2px 0 0" }}>
                  {professor.turno ? professor.turno.toUpperCase() : "—"}
                  {professor.disciplina_nome ? ` · ${professor.disciplina_nome}` : ""}
                  {professor.aulas != null ? ` · ${professor.aulas} aulas` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Mensagem contextual */}
          {step === "choice" && (
            <p
              style={{
                color: "#374151",
                fontSize: 14,
                lineHeight: 1.6,
                margin: "16px 0 0",
                textAlign: "center",
              }}
            >
              Escolha a ação que deseja realizar com este professor.
            </p>
          )}

          {isDelete && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: "20px" }}>💡</span>
              <p style={{ color: "#991b1b", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Serão removidos também os registros de <strong>modulação</strong> e{" "}
                <strong>preferências de horário</strong> vinculados a este professor. Esta
                ação é <strong>permanente</strong>.
              </p>
            </div>
          )}

          {isInactivate && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: "20px" }}>💡</span>
              <p style={{ color: "#92400e", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                O professor será <strong>ocultado</strong> das listas, mas seu registro permanecerá no
                histórico. Poderá ser reativado futuramente.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer com botões ── */}
        <div
          style={{
            padding: "0 24px 24px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          {/* ── STEP: choice ── */}
          {step === "choice" && (
            <>
              <button
                onClick={fecharTudo}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#f3f4f6";
                  e.target.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#fff";
                  e.target.style.borderColor = "#d1d5db";
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep("confirmInactivate")}
                style={{
                  padding: "10px 22px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #d97706, #b45309)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 14px rgba(217,119,6,0.35)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(217,119,6,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 14px rgba(217,119,6,0.35)";
                }}
              >
                Inativar
              </button>
              <button
                onClick={() => setStep("confirmDelete")}
                style={{
                  padding: "10px 22px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 14px rgba(220,38,38,0.35)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(220,38,38,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 14px rgba(220,38,38,0.35)";
                }}
              >
                Excluir
              </button>
            </>
          )}

          {/* ── STEP: confirmDelete ── */}
          {isDelete && (
            <>
              <button
                onClick={() => !processing && setStep("choice")}
                disabled={processing}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: processing ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  opacity: processing ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!processing) {
                    e.target.style.background = "#f3f4f6";
                    e.target.style.borderColor = "#9ca3af";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#fff";
                  e.target.style.borderColor = "#d1d5db";
                }}
              >
                Voltar
              </button>
              <button
                onClick={() => handleAction("excluir")}
                disabled={processing}
                style={{
                  padding: "10px 28px",
                  borderRadius: 10,
                  border: "none",
                  background: processing
                    ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                    : "linear-gradient(135deg, #dc2626, #b91c1c)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: processing ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: processing ? "none" : "0 4px 14px rgba(220,38,38,0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!processing) {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 6px 20px rgba(220,38,38,0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 14px rgba(220,38,38,0.4)";
                }}
              >
                {processing ? (
                  <>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "profSpin 0.6s linear infinite",
                      }}
                    />
                    Excluindo...
                  </>
                ) : (
                  "Sim, Excluir"
                )}
              </button>
            </>
          )}

          {/* ── STEP: confirmInactivate ── */}
          {isInactivate && (
            <>
              <button
                onClick={() => !processing && setStep("choice")}
                disabled={processing}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: processing ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  opacity: processing ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!processing) {
                    e.target.style.background = "#f3f4f6";
                    e.target.style.borderColor = "#9ca3af";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#fff";
                  e.target.style.borderColor = "#d1d5db";
                }}
              >
                Voltar
              </button>
              <button
                onClick={() => handleAction("inativar")}
                disabled={processing}
                style={{
                  padding: "10px 28px",
                  borderRadius: 10,
                  border: "none",
                  background: processing
                    ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                    : "linear-gradient(135deg, #d97706, #b45309)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: processing ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: processing ? "none" : "0 4px 14px rgba(217,119,6,0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!processing) {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 6px 20px rgba(217,119,6,0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 14px rgba(217,119,6,0.4)";
                }}
              >
                {processing ? (
                  <>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "profSpin 0.6s linear infinite",
                      }}
                    />
                    Inativando...
                  </>
                ) : (
                  "Sim, Inativar"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
