// ============================================================================
// Modal — Configurar e Marcar Gabarito Oficial
// Fluxo: Nome/Config → Marcação Visual das Respostas → Salvar
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function ModalGabaritoOficial({ open, onClose, onSave, avaliacaoInicial = null }) {
  // ─── Etapa do wizard ───
  const [step, setStep] = useState(1); // 1 = config, 2 = marcação

  // ─── Config ───
  const [titulo, setTitulo] = useState("");
  const [numQuestoes, setNumQuestoes] = useState("");
  const [numAlternativas, setNumAlternativas] = useState("");
  const [notaTotal, setNotaTotal] = useState("");
  const [erro, setErro] = useState("");

  // ─── Marcação ───
  const [gabarito, setGabarito] = useState([]);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      if (avaliacaoInicial) {
        setTitulo(avaliacaoInicial.titulo || "");
        setNumQuestoes(String(avaliacaoInicial.gabarito?.length || ""));
        setNumAlternativas(String(avaliacaoInicial.numAlternativas || ""));
        setNotaTotal(String(avaliacaoInicial.notaTotal || ""));
        setGabarito(avaliacaoInicial.gabarito || []);
        setStep(2);
      } else {
        setTitulo("");
        setNumQuestoes("");
        setNumAlternativas("");
        setNotaTotal("");
        setGabarito([]);
        setErro("");
        setStep(1);
      }
    }
  }, [open, avaliacaoInicial]);

  const alternativasLabels = LETRAS.split("").slice(0, Number(numAlternativas) || 0);

  // ─── Validar Step 1 → Step 2 ───
  function handleAvancar() {
    if (!titulo.trim()) {
      setErro("Informe o título da avaliação.");
      return;
    }
    const nQ = Number(numQuestoes);
    if (!nQ || nQ < 1 || nQ > 100) {
      setErro("Número de questões deve ser entre 1 e 100.");
      return;
    }
    const nA = Number(numAlternativas);
    if (!nA || nA < 2 || nA > 6) {
      setErro("Alternativas devem ser entre 2 e 6.");
      return;
    }
    const nN = Number(String(notaTotal).replace(",", "."));
    if (!nN || nN <= 0 || nN > 1000) {
      setErro("Nota total deve ser entre 0,1 e 1000.");
      return;
    }
    setErro("");
    // Inicializa array de gabarito vazio
    if (gabarito.length !== nQ) {
      setGabarito(Array(nQ).fill(null));
    }
    setStep(2);
  }

  // ─── Marcar resposta ───
  function marcar(questaoIdx, letra) {
    const novo = [...gabarito];
    novo[questaoIdx] = novo[questaoIdx] === letra ? null : letra;
    setGabarito(novo);
  }

  // ─── Salvar gabarito ───
  function handleSalvar() {
    const faltantes = gabarito
      .map((r, i) => (r === null ? i + 1 : null))
      .filter(Boolean);

    if (faltantes.length > 0) {
      setErro(
        `Marque todas as questões! Faltam: ${faltantes.map((n) => String(n).padStart(2, "0")).join(", ")}`
      );
      return;
    }

    onSave({
      titulo: titulo.trim(),
      numQuestoes: Number(numQuestoes),
      numAlternativas: Number(numAlternativas),
      notaTotal: Number(String(notaTotal).replace(",", ".")),
      gabarito,
    });
  }

  // ─── Atalhos de teclado ───
  const handleKeyDown = useCallback(
    (e) => {
      if (!open || step !== 2) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleSalvar();
      }
      if (e.key === "Escape") {
        onClose();
      }
    },
    [open, step, gabarito]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div className="gab-modal-overlay" onClick={onClose}>
      <div
        className="gab-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: step === 2 ? "700px" : "480px" }}
      >
        {/* ─── Header ─── */}
        <div className="gab-modal-header">
          <div>
            <div className="gab-modal-title">
              {step === 1 ? "Configurar Avaliação" : "Marcar Gabarito Oficial"}
            </div>
            {step === 2 && (
              <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                {titulo} · {numQuestoes} questões · {numAlternativas} alternativas
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--gab-text-muted)",
              cursor: "pointer",
              padding: 8,
            }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ─── Step Indicator ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderBottom: "1px solid var(--gab-border)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: step >= 1 ? "var(--gab-cyan)" : "var(--gab-glass)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.72rem",
              fontWeight: 800,
              color: "#fff",
              fontFamily: "var(--gab-font-display)",
            }}
          >
            1
          </div>
          <div
            style={{
              flex: 1,
              height: 2,
              background: step >= 2 ? "var(--gab-cyan)" : "var(--gab-border)",
              borderRadius: 2,
              transition: "background 0.3s",
            }}
          />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: step >= 2 ? "var(--gab-cyan)" : "var(--gab-glass)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.72rem",
              fontWeight: 800,
              color: step >= 2 ? "#fff" : "var(--gab-text-muted)",
              fontFamily: "var(--gab-font-display)",
              border: step < 2 ? "1px solid var(--gab-border)" : "none",
            }}
          >
            2
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="gab-modal-body">
          {step === 1 && (
            <div className="gab-flex gab-flex-col gab-gap-16">
              <div className="gab-form-group">
                <label className="gab-label">Título da Avaliação</label>
                <input
                  className="gab-input"
                  type="text"
                  placeholder="Ex: Prova de Matemática – 1º Bimestre"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value.slice(0, 80));
                    setErro("");
                  }}
                  maxLength={80}
                  autoFocus
                />
              </div>

              <div className="gab-grid-3">
                <div className="gab-form-group">
                  <label className="gab-label">Questões</label>
                  <input
                    className="gab-input"
                    type="number"
                    placeholder="10"
                    min={1}
                    max={100}
                    value={numQuestoes}
                    onChange={(e) => {
                      setNumQuestoes(e.target.value.replace(/\D/, ""));
                      setErro("");
                    }}
                  />
                </div>
                <div className="gab-form-group">
                  <label className="gab-label">Alternativas</label>
                  <input
                    className="gab-input"
                    type="number"
                    placeholder="5"
                    min={2}
                    max={6}
                    value={numAlternativas}
                    onChange={(e) => {
                      setNumAlternativas(e.target.value.replace(/\D/, ""));
                      setErro("");
                    }}
                  />
                </div>
                <div className="gab-form-group">
                  <label className="gab-label">Nota Total</label>
                  <input
                    className="gab-input"
                    type="text"
                    placeholder="10"
                    value={notaTotal}
                    onChange={(e) => {
                      setNotaTotal(e.target.value.replace(/[^0-9.,]/g, ""));
                      setErro("");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div
              style={{
                maxHeight: "50vh",
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "center",
                        fontSize: "0.72rem",
                        color: "var(--gab-text-muted)",
                        fontWeight: 700,
                        letterSpacing: 1,
                        position: "sticky",
                        top: 0,
                        background: "var(--gab-bg-secondary)",
                        zIndex: 2,
                      }}
                    >
                      #
                    </th>
                    {alternativasLabels.map((letra) => (
                      <th
                        key={letra}
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontSize: "0.75rem",
                          color: "var(--gab-text-muted)",
                          fontWeight: 600,
                          position: "sticky",
                          top: 0,
                          background: "var(--gab-bg-secondary)",
                          zIndex: 2,
                        }}
                      >
                        {letra}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Number(numQuestoes) }).map((_, qIdx) => (
                    <tr key={qIdx}>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "var(--gab-text-secondary)",
                          fontFamily: "var(--gab-font-display)",
                          padding: "4px 8px",
                        }}
                      >
                        {String(qIdx + 1).padStart(2, "0")}
                      </td>
                      {alternativasLabels.map((letra) => (
                        <td key={letra} style={{ textAlign: "center", padding: "4px" }}>
                          <button
                            type="button"
                            className={`gab-bubble ${gabarito[qIdx] === letra ? "selected" : ""}`}
                            onClick={() => marcar(qIdx, letra)}
                          >
                            {letra}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 16px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "8px",
                color: "var(--gab-red-light)",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              {erro}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="gab-modal-footer">
          {step === 2 && (
            <button
              className="gab-btn gab-btn-ghost"
              onClick={() => setStep(1)}
              type="button"
            >
              ← Voltar
            </button>
          )}
          <button
            className="gab-btn gab-btn-ghost"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          {step === 1 && (
            <button
              className="gab-btn gab-btn-primary"
              onClick={handleAvancar}
              type="button"
            >
              Avançar →
            </button>
          )}
          {step === 2 && (
            <button
              className="gab-btn gab-btn-primary"
              onClick={handleSalvar}
              type="button"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Salvar Gabarito Oficial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
