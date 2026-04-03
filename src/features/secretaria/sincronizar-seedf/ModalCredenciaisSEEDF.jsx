// src/features/secretaria/sincronizar-seedf/ModalCredenciaisSEEDF.jsx
// ============================================================================
// Modal Premium — Credenciais de Acesso ao EducaDF (SEEDF)
// ============================================================================
// Permite ao secretário/diretor cadastrar ou atualizar as credenciais de login
// do portal educadf.se.df.gov.br, necessárias para a sincronização automática.
//
// Fluxo:
//   1. Modal abre automaticamente se não há credenciais cadastradas
//   2. Ou abre quando o login falha, pedindo confirmação/correção
//   3. O secretário informa matrícula + senha do professor no educadf
//   4. O sistema testa o login em tempo real (via backend + Playwright)
//   5. Se OK, salva com criptografia AES-256-GCM e fecha o modal
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";

// ─────────────────────────────────────────────
// Ícones SVG inline
// ─────────────────────────────────────────────
const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const IconKey = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconEyeOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
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

const IconWarning = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

// ─────────────────────────────────────────────
// Estilos CSS-in-JS para efeitos premium
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
    maxWidth: "460px",
    borderRadius: "20px",
    overflow: "hidden",
    background: "#ffffff",
    boxShadow:
      "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
    animation: "slideUp 0.3s ease-out",
  },
  header: {
    position: "relative",
    padding: "28px 28px 20px",
    background: "linear-gradient(135deg, #1e3a5f 0%, #0f2847 50%, #0a1628 100%)",
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: "-50%",
    right: "-20%",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  headerGlow2: {
    position: "absolute",
    bottom: "-30%",
    left: "-10%",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  iconBadge: {
    display: "inline-flex",
    padding: "10px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(16,185,129,0.15))",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#93c5fd",
    marginBottom: "12px",
  },
  body: {
    padding: "24px 28px 28px",
  },
  inputGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "6px",
    letterSpacing: "-0.01em",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    paddingLeft: "42px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    fontSize: "14px",
    color: "#1f2937",
    outline: "none",
    transition: "all 0.2s ease",
    background: "#fafbfc",
  },
  inputFocused: {
    borderColor: "#3b82f6",
    background: "#ffffff",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.1)",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    color: "#9ca3af",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
  },
  togglePw: {
    position: "absolute",
    right: "10px",
    padding: "4px",
    borderRadius: "6px",
    border: "none",
    background: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s",
  },
  feedbackBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "18px",
    animation: "fadeIn 0.2s ease-out",
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
  securityNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
    border: "1px solid #bbf7d0",
    fontSize: "12px",
    color: "#166534",
    lineHeight: 1.5,
    marginTop: "16px",
  },
};

// ─────────────────────────────────────────────
// Animações CSS globais (injetadas uma vez)
// ─────────────────────────────────────────────
const ANIM_CSS = `
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4) } 70% { box-shadow: 0 0 0 8px rgba(34,197,94,0) } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0) } }
`;

// ============================================================================
// Componente Principal
// ============================================================================
export default function ModalCredenciaisSEEDF({
  open,
  onClose,
  onSaved,
  motivo = null,          // "sem_credenciais" | "login_falhou" | null
  credencialExistente = null, // { id, educadf_login } — pré-preenche matrícula
}) {
  // Estado
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warning', msg }

  const matriculaRef = useRef(null);

  // Pré-preenche matrícula se já existe credencial
  useEffect(() => {
    if (open) {
      setFeedback(null);
      setSenha("");
      setShowPw(false);
      if (credencialExistente?.educadf_login) {
        setMatricula(credencialExistente.educadf_login);
      } else {
        setMatricula("");
      }
      // Foca no campo correto
      setTimeout(() => {
        matriculaRef.current?.focus();
      }, 300);
    }
  }, [open, credencialExistente]);

  // Inject CSS animations
  useEffect(() => {
    if (document.getElementById("modal-cred-seedf-anims")) return;
    const style = document.createElement("style");
    style.id = "modal-cred-seedf-anims";
    style.textContent = ANIM_CSS;
    document.head.appendChild(style);
  }, []);

  if (!open) return null;

  // ── Handlers ──
  const canSubmit = matricula.trim().length >= 3 && senha.trim().length >= 3;

  const handleSalvar = async () => {
    if (!canSubmit) return;

    setSalvando(true);
    setFeedback(null);

    try {
      // 1. Salva a credencial (criptografada no backend)
      const payload = {
        professor_id: credencialExistente?.professor_id || 0,
        educadf_login: matricula.trim(),
        educadf_senha: senha.trim(),
      };

      const saveRes = await api.post("/api/agente/credenciais", payload);

      if (!saveRes.data?.ok) {
        setFeedback({ type: "error", msg: saveRes.data?.message || "Erro ao salvar credencial." });
        setSalvando(false);
        return;
      }

      const credId = saveRes.data?.id || credencialExistente?.id;

      // 2. Testa o login (se temos o ID da credencial)
      if (credId) {
        setTestando(true);
        setFeedback({ type: "warning", msg: "Testando login no portal SEEDF..." });

        try {
          const testRes = await api.post(`/api/agente/credenciais/${credId}/testar`);

          if (testRes.data?.ok) {
            setFeedback({ type: "success", msg: "Login verificado com sucesso! Credencial salva." });
            // Aguarda 1.5s para o feedback visual, depois fecha
            setTimeout(() => {
              onSaved?.();
              onClose?.();
            }, 1500);
          } else {
            setFeedback({
              type: "error",
              msg: testRes.data?.message || "Login falhou. Verifique matrícula e senha.",
            });
          }
        } catch (testErr) {
          // Teste falhou mas credencial foi salva
          console.warn("[ModalCredenciais] Teste de login falhou:", testErr);
          setFeedback({
            type: "warning",
            msg: "Credencial salva, mas não foi possível testar o login agora. Tente sincronizar.",
          });
          setTimeout(() => {
            onSaved?.();
            onClose?.();
          }, 2000);
        } finally {
          setTestando(false);
        }
      } else {
        // Sem ID para testar — apenas salva
        setFeedback({ type: "success", msg: "Credencial salva com sucesso!" });
        setTimeout(() => {
          onSaved?.();
          onClose?.();
        }, 1200);
      }
    } catch (err) {
      console.error("[ModalCredenciais] Erro ao salvar:", err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 403
          ? "Sem permissão para gerenciar credenciais."
          : "Erro ao salvar credencial. Tente novamente.");
      setFeedback({ type: "error", msg });
    } finally {
      setSalvando(false);
    }
  };

  // ── Título e subtítulo dinâmicos ──
  let titulo = "Configurar Acesso ao SEEDF";
  let subtitulo = "Informe as credenciais de acesso ao portal educadf.se.df.gov.br";

  if (motivo === "login_falhou") {
    titulo = "Login no SEEDF Falhou";
    subtitulo = "Verifique e corrija as credenciais de acesso ao portal educadf.se.df.gov.br";
  } else if (motivo === "sem_credenciais") {
    titulo = "Credenciais Necessárias";
    subtitulo = "Para sincronizar, cadastre as credenciais de acesso ao portal educadf.se.df.gov.br";
  }

  const isProcessing = salvando || testando;

  // ── Feedback colors ──
  const feedbackStyles = {
    success: { background: "#f0fdf4", border: "1px solid #86efac", color: "#166534" },
    error: { background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" },
    warning: { background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e" },
  };

  return (
    <div style={styles.backdrop} onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose?.()}>
      <div style={styles.card}>
        {/* ═══ Header gradient ═══ */}
        <div style={styles.header}>
          <div style={styles.headerGlow} />
          <div style={styles.headerGlow2} />

          {/* Badge de motivo */}
          {motivo === "login_falhou" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                borderRadius: "20px",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
                fontSize: "11px",
                fontWeight: 600,
                marginBottom: "12px",
                letterSpacing: "0.02em",
              }}
            >
              <IconWarning />
              ATENÇÃO — LOGIN FALHOU
            </div>
          )}

          <div style={styles.iconBadge}>
            <IconShield />
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
            {titulo}
          </h2>
          <p
            style={{
              color: "rgba(148, 163, 184, 0.9)",
              fontSize: "13px",
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            {subtitulo}
          </p>
        </div>

        {/* ═══ Body ═══ */}
        <div style={styles.body}>
          {/* Matrícula */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span style={{ color: "#6b7280" }}><IconUser /></span>
              Matrícula SEEDF
            </label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}><IconUser /></span>
              <input
                ref={matriculaRef}
                id="input-matricula-seedf"
                type="text"
                placeholder="Ex: 275964"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                disabled={isProcessing}
                onFocus={() => setFocusedField("matricula")}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...styles.input,
                  ...(focusedField === "matricula" ? styles.inputFocused : {}),
                  opacity: isProcessing ? 0.6 : 1,
                }}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("input-senha-seedf")?.focus()}
              />
            </div>
          </div>

          {/* Senha */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span style={{ color: "#6b7280" }}><IconKey /></span>
              Senha do Portal
            </label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}><IconKey /></span>
              <input
                id="input-senha-seedf"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={isProcessing}
                onFocus={() => setFocusedField("senha")}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...styles.input,
                  paddingRight: "42px",
                  ...(focusedField === "senha" ? styles.inputFocused : {}),
                  opacity: isProcessing ? 0.6 : 1,
                }}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSalvar()}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={styles.togglePw}
                tabIndex={-1}
                title={showPw ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPw ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div style={{ ...styles.feedbackBox, ...feedbackStyles[feedback.type] }}>
              {feedback.type === "success" && <IconCheck />}
              {feedback.type === "error" && <IconX />}
              {feedback.type === "warning" && (
                testando ? <div style={styles.spinner} /> : <IconWarning />
              )}
              <span style={{ flex: 1 }}>{feedback.msg}</span>
            </div>
          )}

          {/* Botão Salvar */}
          <button
            id="btn-salvar-credenciais-seedf"
            type="button"
            disabled={!canSubmit || isProcessing}
            onClick={handleSalvar}
            style={{
              ...styles.btnPrimary,
              background:
                !canSubmit || isProcessing
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              boxShadow:
                !canSubmit || isProcessing
                  ? "none"
                  : "0 4px 14px rgba(37, 99, 235, 0.35)",
              opacity: !canSubmit || isProcessing ? 0.7 : 1,
            }}
          >
            {isProcessing ? (
              <>
                <div style={styles.spinner} />
                {testando ? "Testando login..." : "Salvando..."}
              </>
            ) : (
              <>
                <IconShield />
                Salvar e Verificar
              </>
            )}
          </button>

          {/* Botão Cancelar (só se não é obrigatório) */}
          {motivo !== "sem_credenciais" && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              style={{
                ...styles.btnSecondary,
                opacity: isProcessing ? 0.5 : 1,
                cursor: isProcessing ? "not-allowed" : "pointer",
              }}
            >
              Cancelar
            </button>
          )}

          {/* Nota de segurança */}
          <div style={styles.securityNote}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 flex-shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ minWidth: 16 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <span>
              Sua senha é criptografada com <strong>AES-256-GCM</strong> e armazenada de forma segura.
              Nunca é exibida nem trafegada em texto aberto.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
