import React, { useEffect, useState } from "react";

/**
 * ModalAdicionarItemPlano.jsx
 * ------------------------------------------------------------
 * Modal PREMIUM para inclusão/edição de atividade avaliativa
 * Ordem de campos:
 *  a) Atividade avaliativa (nome)
 *  b) Tipo de avaliação (select)
 *  c) Data (único)
 *  d) Nota total
 *  e) Oportunidades
 *  f) Nota invertida
 *  g) Descrição
 * ------------------------------------------------------------
 */

// ── Tipos de avaliação (espelhando EDUCADF para futura sincronização) ──
const TIPOS_AVALIACAO = [
  "APRESENTAÇÃO",
  "ARTÍSTICA",
  "DEBATE",
  "DIÁRIO",
  "ENTREVISTA",
  "ESTUDO DE CASO",
  "EXPERIMENTO",
  "EXPOSIÇÃO",
  "FILME/DOCUMENTÁRIO",
  "INSTRUMENTO AVALIATIVO",
  "JOGOS",
  "JORNAL",
  "MAPA CONCEITUAL",
  "MAQUETE",
  "MEMORIAL",
  "OBSERVAÇÃO/RELATÓRIO",
  "OUTROS",
  "PESQUISA",
  "PESQUISAS DE MERCADO",
  "PORTFÓLIO",
  "PRODUÇÃO DE VÍDEOS",
  "PRODUÇÃO TEXTUAL",
  "PROGRAM DE RÁDIO",
  "PROJETO",
  "PROVA",
  "QUESTIONÁRIO",
  "REVISTA",
  "SEMINÁRIO",
  "SIMULADO",
  "VISITA GUIADA",
  "WEBQUEST",
];

// ── Ícones SVG inline ──
const IconClipboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75m0-3H12M8.25 6.108V6a2.25 2.25 0 012.25-2.25h.75" />
  </svg>
);

// ── Estilos CSS-in-JS (premium pattern) ──
const s = {
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
    animation: "modalFadeIn 0.2s ease-out",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "580px",
    maxHeight: "90vh",
    borderRadius: "20px",
    overflow: "hidden",
    background: "#ffffff",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
    animation: "modalSlideUp 0.3s ease-out",
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
    background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  iconBadge: {
    display: "inline-flex",
    padding: "10px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(34,197,94,0.15))",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#93c5fd",
    marginBottom: "12px",
  },
  body: {
    padding: "20px 28px 8px",
    overflowY: "auto",
    flex: 1,
  },
  fieldGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "6px",
    letterSpacing: "-0.01em",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    fontSize: "14px",
    color: "#1f2937",
    outline: "none",
    transition: "all 0.2s ease",
    background: "#fafbfc",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    fontSize: "14px",
    color: "#1f2937",
    outline: "none",
    transition: "all 0.2s ease",
    background: "#fafbfc",
    boxSizing: "border-box",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    paddingRight: "38px",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    fontSize: "14px",
    color: "#1f2937",
    outline: "none",
    transition: "all 0.2s ease",
    background: "#fafbfc",
    minHeight: "80px",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
  },
  footer: {
    padding: "16px 28px 20px",
    borderTop: "1px solid #f1f5f9",
    background: "#fafbfc",
    flexShrink: 0,
  },
  footerInfo: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "10px 14px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)",
    border: "1px solid #bfdbfe",
    marginBottom: "14px",
    fontSize: "11px",
    color: "#1e40af",
    lineHeight: 1.5,
  },
  btnRow: {
    display: "flex",
    gap: "10px",
  },
  btnCancel: {
    flex: 1,
    padding: "11px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    fontSize: "14px",
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    background: "transparent",
    transition: "all 0.2s ease",
  },
  btnSave: {
    flex: 2,
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    fontSize: "14px",
    fontWeight: 600,
    color: "#ffffff",
    cursor: "pointer",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  alerta: (type) => ({
    margin: "0 0 14px",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 600,
    ...(type === "success"
      ? { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }
      : type === "warn"
        ? { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }
        : type === "info"
          ? { background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }
          : { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }),
  }),
};

// ── CSS para animações (injeção única) ──
const ANIM_CSS = `
@keyframes modalFadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
`;

// ── Foco elegante nos inputs ──
const handleFocus = (e) => {
  e.target.style.borderColor = "#3b82f6";
  e.target.style.background = "#ffffff";
  e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
};
const handleBlur = (e) => {
  e.target.style.borderColor = "#e5e7eb";
  e.target.style.background = "#fafbfc";
  e.target.style.boxShadow = "none";
};

export default function ModalAdicionarItemPlano({
  open,
  onClose,
  onSalvar,

  modo = "adicionar", // "adicionar" | "editar"

  atividade,
  setAtividade,

  tipoAvaliacao,
  setTipoAvaliacao,

  dataInicio,
  setDataInicio,

  dataFinal,     // mantido para retrocompatibilidade
  setDataFinal,  // mantido para retrocompatibilidade

  notaTotal,
  setNotaTotal,

  oportunidades,
  setOportunidades,

  notaInvertida,
  setNotaInvertida,

  descricao,
  setDescricao,
}) {
  // Injeta CSS de animações
  useEffect(() => {
    if (document.getElementById("modal-item-plano-anims")) return;
    const style = document.createElement("style");
    style.id = "modal-item-plano-anims";
    style.textContent = ANIM_CSS;
    document.head.appendChild(style);
  }, []);

  const [alerta, setAlerta] = useState(null);

  useEffect(() => {
    if (open) setAlerta(null);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={s.backdrop}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div style={s.card} onClick={(e) => e.stopPropagation()}>
        {/* ═══════════════════════════════════════════
            HEADER PREMIUM
        ═══════════════════════════════════════════ */}
        <div style={s.header}>
          <div style={s.headerGlow} />
          <div style={s.headerGlow2} />

          <div style={s.iconBadge}>
            <IconClipboard />
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
            {modo === "editar" ? "Editar Atividade Avaliativa" : "Nova Atividade Avaliativa"}
          </h2>
          <p
            style={{
              color: "rgba(148, 163, 184, 0.9)",
              fontSize: "13px",
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            {modo === "editar"
              ? "Ajuste os dados e clique em Atualizar para salvar."
              : "Preencha os dados e clique em Salvar para incluir uma nova atividade."}
          </p>
        </div>

        {/* ═══════════════════════════════════════════
            BODY — CAMPOS DO FORMULÁRIO
        ═══════════════════════════════════════════ */}
        <div style={s.body}>
          {/* a) Atividade avaliativa */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Atividade avaliativa</label>
            <input
              type="text"
              value={atividade}
              onChange={(e) => setAtividade(e.target.value)}
              style={s.input}
              placeholder="Ex: Caderno, Teste, Prova Bimestral..."
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* b) Tipo de avaliação (NOVO — logo abaixo de Atividade) */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Tipo de avaliação</label>
            <select
              value={tipoAvaliacao || ""}
              onChange={(e) => setTipoAvaliacao?.(e.target.value)}
              style={s.select}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <option value="">Selecione o tipo...</option>
              {TIPOS_AVALIACAO.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* c/d) Data + Nota total (lado a lado) */}
          <div style={{ ...s.fieldGroup, ...s.grid2 }}>
            <div>
              <label style={s.label}>Data</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setDataFinal?.(e.target.value);
                }}
                style={s.input}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label style={s.label}>Nota total</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={notaTotal}
                onChange={(e) => setNotaTotal(e.target.value)}
                style={s.input}
                placeholder="Ex: 10"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* e/f) Oportunidades + Nota invertida (lado a lado) */}
          <div style={{ ...s.fieldGroup, ...s.grid2 }}>
            <div>
              <label style={s.label}>Oportunidades</label>
              <input
                type="number"
                min="1"
                step="1"
                value={oportunidades}
                onChange={(e) => setOportunidades(e.target.value)}
                style={s.input}
                placeholder="Ex: 1"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label style={s.label}>Nota invertida</label>
              <input
                type="number"
                step="0.1"
                value={notaInvertida}
                onChange={(e) => setNotaInvertida(e.target.value)}
                style={s.input}
                placeholder="Ex: 0,2"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* g) Descrição */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              style={s.textarea}
              placeholder="Observações e detalhes (opcional)..."
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            ALERTA
        ═══════════════════════════════════════════ */}
        {alerta && (
          <div style={{ padding: "0 28px" }}>
            <div style={s.alerta(alerta.type)}>
              {alerta.text}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            FOOTER PREMIUM
        ═══════════════════════════════════════════ */}
        <div style={s.footer}>
          {/* Informativo EDUCADF */}
          <div style={s.footerInfo}>
            <span style={{ fontSize: "14px", lineHeight: 1, flexShrink: 0, marginTop: "1px" }}>🤖</span>
            <span>
              As avaliações aqui criadas serão migradas para o <strong>EducaDF</strong> através do <strong>Agente EDUCA</strong>.
            </span>
          </div>

          <div style={s.btnRow}>
            <button
              type="button"
              onClick={onClose}
              style={s.btnCancel}
              onMouseEnter={(e) => { e.target.style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { e.target.style.background = "transparent"; }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => {
                const resp = onSalvar?.();
                if (!resp) return;
                if (resp.ok) {
                  setAlerta(null);
                  onClose?.();
                } else {
                  setAlerta({
                    type: resp.type || "error",
                    text: resp.text || "Ação não permitida.",
                  });
                }
              }}
              style={s.btnSave}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(34,197,94,0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(34,197,94,0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {modo === "editar" ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
