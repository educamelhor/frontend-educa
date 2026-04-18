// ============================================================================
// Modal — Gabarito Oficial (Etapa 2)  ✨ REDESIGN v2
// Full-screen overlay · Grid de bolhas · Single scroll · Premium UX
// Fluxo: Selecionar Avaliação →  Marcar Respostas → Salvar
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const TIPOS_LABELS = {
  prova_padronizada: { label: "Prova Padronizada", icon: "🏫" },
  prova_individual: { label: "Prova Individual", icon: "👩‍🏫" },
  simulado: { label: "Simulado", icon: "📊" },
  avaliacao_diagnostica: { label: "Avaliação Diagnóstica", icon: "🔍" },
  recuperacao: { label: "Recuperação", icon: "🔄" },
};

// Cores para disciplinas (rotação cíclica)
const DISC_COLORS = [
  { bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.25)", accent: "#22d3ee", text: "#22d3ee" },
  { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)", accent: "#a78bfa", text: "#a78bfa" },
  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", accent: "#fbbf24", text: "#fbbf24" },
  { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", accent: "#34d399", text: "#34d399" },
  { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.25)", accent: "#f472b6", text: "#f472b6" },
];

export default function ModalGabaritoOficial({ open, onClose, onSave, avaliacaoInicial = null }) {
  const [step, setStep] = useState(1);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroBimestre, setFiltroBimestre] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [avalSelecionada, setAvalSelecionada] = useState(null);
  const [gabarito, setGabarito] = useState([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setErro("");
      setFiltroTexto("");
      setFiltroBimestre("");
      setFiltroTipo("");
      if (avaliacaoInicial) {
        handleSelecionar(avaliacaoInicial);
      } else {
        setStep(1);
        setAvalSelecionada(null);
        setGabarito([]);
        fetchAvaliacoes();
      }
    }
  }, [open]);

  async function fetchAvaliacoes() {
    setLoadingAvaliacoes(true);
    try {
      const resp = await api.get("/gabarito-avaliacoes");
      setAvaliacoes(resp.data || []);
    } catch {
      setAvaliacoes([]);
    }
    setLoadingAvaliacoes(false);
  }

  const avalFiltradas = avaliacoes.filter((a) => {
    if (filtroTexto && !a.titulo.toLowerCase().includes(filtroTexto.toLowerCase())) return false;
    if (filtroBimestre && a.bimestre !== filtroBimestre) return false;
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    return true;
  });

  function handleSelecionar(aval) {
    setAvalSelecionada(aval);
    const nQ = aval.num_questoes || 10;
    if (aval.gabarito_oficial && Array.isArray(aval.gabarito_oficial) && aval.gabarito_oficial.length > 0) {
      setGabarito([...aval.gabarito_oficial]);
    } else {
      setGabarito(Array(nQ).fill(null));
    }
    setErro("");
    setStep(2);
  }

  function marcar(questaoIdx, letra) {
    const novo = [...gabarito];
    novo[questaoIdx] = novo[questaoIdx] === letra ? null : letra;
    setGabarito(novo);
  }

  async function handleSalvar() {
    const faltantes = gabarito
      .map((r, i) => (r === null ? i + 1 : null))
      .filter(Boolean);
    if (faltantes.length > 0) {
      setErro(`Marque todas as questões! Faltam: ${faltantes.map((n) => String(n).padStart(2, "0")).join(", ")}`);
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.put(`/gabarito-avaliacoes/${avalSelecionada.id}`, { gabarito_oficial: gabarito, status: "publicada" });
      onSave({
        id: avalSelecionada.id, titulo: avalSelecionada.titulo, tipo: avalSelecionada.tipo,
        bimestre: avalSelecionada.bimestre, numQuestoes: avalSelecionada.num_questoes,
        numAlternativas: avalSelecionada.num_alternativas, notaTotal: avalSelecionada.nota_total,
        gabarito, disciplinas_config: avalSelecionada.disciplinas_config,
      });
    } catch (err) {
      setErro(err?.response?.data?.error || "Erro ao salvar gabarito oficial.");
    }
    setSalvando(false);
  }

  const handleKeyDown = useCallback((e) => {
    if (!open) return;
    if (e.key === "Escape") onClose();
  }, [open]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  const nQ = avalSelecionada?.num_questoes || 0;
  const nA = avalSelecionada?.num_alternativas || 5;
  const alternativasLabels = LETRAS.split("").slice(0, nA);
  const discConfig = avalSelecionada?.disciplinas_config || [];
  const marcadas = gabarito.filter(Boolean).length;

  function getDiscDaQuestao(qNum) {
    for (let i = 0; i < discConfig.length; i++) {
      if (qNum >= discConfig[i].de && qNum <= discConfig[i].ate) return { ...discConfig[i], _idx: i };
    }
    return null;
  }

  // Agrupar questões por disciplina (para o layout de seções)
  function getQuestoesPorDisciplina() {
    if (discConfig.length === 0) {
      return [{ nome: null, de: 1, ate: nQ, _idx: -1, questoes: Array.from({ length: nQ }, (_, i) => i) }];
    }
    return discConfig.map((dc, i) => ({
      ...dc, _idx: i,
      questoes: Array.from({ length: dc.ate - dc.de + 1 }, (_, j) => dc.de - 1 + j),
    }));
  }

  const secoes = getQuestoesPorDisciplina();

  return (
    <>
      <style>{`
        @keyframes mgFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mgSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mgBubblePop { from { transform: scale(0.8); } to { transform: scale(1); } }

        .mg-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
          display: flex; flex-direction: column;
          animation: mgFadeIn 0.25s ease-out;
          height: 100vh; overflow: hidden;
        }

        .mg-panel {
          flex: 1; display: flex; flex-direction: column;
          max-width: 680px; width: 100%; margin: 0 auto;
          min-height: 0;
          animation: mgSlideUp 0.35s ease-out;
        }

        /* Header fixo */
        .mg-header {
          padding: 20px 32px; flex-shrink: 0;
          background: linear-gradient(180deg, rgba(10,14,26,0.98) 0%, rgba(10,14,26,0.9) 100%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        /* Área de scroll única */
        .mg-body {
          flex: 1; overflow-y: auto; padding: 24px 32px 32px;
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: rgba(6,182,212,0.3) transparent;
        }
        .mg-body::-webkit-scrollbar { width: 6px; }
        .mg-body::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.25); border-radius: 10px; }
        .mg-body::-webkit-scrollbar-track { background: transparent; }

        /* Footer fixo dentro do painel */
        .mg-footer {
          flex-shrink: 0;
          padding: 16px 32px;
          background: rgba(10,14,26,0.98);
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: center; gap: 12px;
        }

        /* Bolha de seleção */
        .mg-bubble {
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.88rem; cursor: pointer;
          transition: all 0.15s; user-select: none;
          background: rgba(255,255,255,0.03);
          border: 2px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.35);
          font-family: var(--gab-font-display, 'Inter', sans-serif);
        }
        .mg-bubble:hover {
          border-color: rgba(6,182,212,0.4);
          background: rgba(6,182,212,0.06);
          color: rgba(255,255,255,0.7);
          transform: scale(1.08);
        }
        .mg-bubble.selected {
          background: rgba(6,182,212,0.15);
          border-color: var(--gab-cyan, #06b6d4);
          color: var(--gab-cyan-light, #22d3ee);
          box-shadow: 0 0 12px rgba(6,182,212,0.3);
          animation: mgBubblePop 0.2s ease-out;
        }

        /* Questão row */
        .mg-question {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.15s;
        }
        .mg-question:hover { background: rgba(255,255,255,0.01); border-radius: 8px; }
        .mg-question:last-child { border-bottom: none; }
      `}</style>

      <div className="mg-overlay" onClick={onClose}>
        <div className="mg-panel" onClick={(e) => e.stopPropagation()}>

          {/* ═══════════════════════════════════════════ */}
          {/* STEP 1: Selecionar Avaliação               */}
          {/* ═══════════════════════════════════════════ */}
          {step === 1 && (
            <>
              <div className="mg-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--gab-text-primary, #f1f5f9)", letterSpacing: "1px" }}>
                      SELECIONAR AVALIAÇÃO
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--gab-text-muted, #64748b)", marginTop: 4 }}>
                      Escolha uma avaliação para definir ou editar o gabarito oficial
                    </div>
                  </div>
                  <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--gab-text-muted)", cursor: "pointer", padding: 8 }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Filtros */}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <input
                    className="gab-input"
                    type="text"
                    placeholder="🔍 Buscar por título..."
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    style={{ flex: 2, minWidth: 160, padding: "10px 14px", fontSize: "0.85rem" }}
                  />
                  <select className="gab-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
                    <option value="">Todos os tipos</option>
                    {Object.entries(TIPOS_LABELS).map(([id, t]) => (
                      <option key={id} value={id}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                  <select className="gab-select" value={filtroBimestre} onChange={(e) => setFiltroBimestre(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
                    <option value="">Todos</option>
                    <option value="1º Bimestre">1º Bim</option>
                    <option value="2º Bimestre">2º Bim</option>
                    <option value="3º Bimestre">3º Bim</option>
                    <option value="4º Bimestre">4º Bim</option>
                  </select>
                </div>
              </div>

              <div className="mg-body">
                {loadingAvaliacoes ? (
                  <div style={{ textAlign: "center", padding: 60 }}>
                    <div className="gab-spinner gab-spinner-lg" style={{ margin: "0 auto 16px" }} />
                    <div style={{ color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>Carregando avaliações...</div>
                  </div>
                ) : avalFiltradas.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "var(--gab-text-muted)", fontSize: "0.9rem" }}>
                    {avaliacoes.length === 0 ? "Nenhuma avaliação criada. Crie primeiro na Etapa 1." : "Nenhuma avaliação encontrada com esses filtros."}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
                    {avalFiltradas.map((a) => {
                      const tipoInfo = TIPOS_LABELS[a.tipo] || { label: a.tipo || "—", icon: "📄" };
                      const temGabarito = a.gabarito_oficial && Array.isArray(a.gabarito_oficial) && a.gabarito_oficial.length > 0;
                      const disc = a.disciplinas_config || [];

                      return (
                        <button
                          key={a.id} type="button"
                          onClick={() => handleSelecionar(a)}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 14,
                            padding: "16px 18px", borderRadius: 14, textAlign: "left", width: "100%",
                            border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)",
                            cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)"; e.currentTarget.style.background = "rgba(6,182,212,0.04)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseOut={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.transform = "none"; }}
                        >
                          <span style={{ fontSize: "1.6rem", lineHeight: 1, marginTop: 2 }}>{tipoInfo.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>{a.titulo}</span>
                              {temGabarito && (
                                <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: "0.6rem", fontWeight: 700,
                                  background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                                  ✓ OFICIAL
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                              <span>{a.num_questoes}Q · {a.num_alternativas} alt · Nota {a.nota_total}</span>
                              {a.bimestre && <span>· {a.bimestre}</span>}
                            </div>
                            {disc.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                {disc.map((dc, i) => (
                                  <span key={i} style={{
                                    padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600,
                                    background: DISC_COLORS[i % DISC_COLORS.length].bg,
                                    border: `1px solid ${DISC_COLORS[i % DISC_COLORS.length].border}`,
                                    color: DISC_COLORS[i % DISC_COLORS.length].text,
                                  }}>
                                    {dc.nome} ({dc.de}–{dc.ate})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--gab-text-muted)", whiteSpace: "nowrap", marginTop: 2 }}>
                            {new Date(a.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* STEP 2: Marcar Respostas                    */}
          {/* ═══════════════════════════════════════════ */}
          {step === 2 && avalSelecionada && (
            <>
              {/* Header fixo com info + progresso */}
              <div className="mg-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {!avaliacaoInicial && (
                      <button
                        onClick={() => { setStep(1); setAvalSelecionada(null); }}
                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "var(--gab-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", transition: "all 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)"}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        Voltar
                      </button>
                    )}
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gab-text-primary)", letterSpacing: "0.5px" }}>
                        {avalSelecionada.titulo}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                        {nQ} questões · {nA} alternativas (A–{LETRAS[nA - 1]}) · Nota {avalSelecionada.nota_total}
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--gab-text-muted)", cursor: "pointer", padding: 8 }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Barra de progresso */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 10, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 10, transition: "width 0.3s, background 0.3s",
                      width: `${(marcadas / nQ) * 100}%`,
                      background: marcadas === nQ
                        ? "linear-gradient(90deg, #10b981, #34d399)"
                        : "linear-gradient(90deg, #06b6d4, #8b5cf6)",
                    }} />
                  </div>
                  <span style={{
                    fontSize: "0.82rem", fontWeight: 700, whiteSpace: "nowrap", fontFamily: "var(--gab-font-display)",
                    color: marcadas === nQ ? "#34d399" : "#22d3ee",
                  }}>
                    {marcadas}/{nQ}
                  </span>
                </div>
              </div>

              {/* Área de scroll único com questões */}
              <div className="mg-body">
                {secoes.map((secao, sIdx) => {
                  const color = secao._idx >= 0 ? DISC_COLORS[secao._idx % DISC_COLORS.length] : DISC_COLORS[0];
                  const secaoMarcadas = secao.questoes.filter(qi => gabarito[qi] !== null).length;
                  const secaoTotal = secao.questoes.length;

                  return (
                    <div key={sIdx} style={{ marginBottom: 28 }}>
                      {/* Header da seção (disciplina) */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 16px", borderRadius: 10, marginBottom: 12,
                        background: color.bg, borderLeft: `3px solid ${color.accent}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: color.text }}>
                            {secao.nome || "Todas as Questões"}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)" }}>
                            Questões {secao.de}–{secao.ate}
                          </span>
                        </div>
                        <span style={{
                          fontSize: "0.72rem", fontWeight: 700,
                          color: secaoMarcadas === secaoTotal ? "#34d399" : color.text,
                        }}>
                          {secaoMarcadas}/{secaoTotal}
                        </span>
                      </div>

                      {/* Grid de questões */}
                      <div style={{ paddingLeft: 4 }}>
                        {secao.questoes.map(qIdx => {
                          const qNum = qIdx + 1;
                          const selecionada = gabarito[qIdx];

                          return (
                            <div key={qIdx} className="mg-question">
                              {/* Número da questão */}
                              <div style={{
                                width: 40, textAlign: "center",
                                fontSize: "0.85rem", fontWeight: 800,
                                color: selecionada ? "#22d3ee" : "rgba(255,255,255,0.3)",
                                fontFamily: "var(--gab-font-display)",
                                transition: "color 0.2s",
                              }}>
                                {String(qNum).padStart(2, "0")}
                              </div>

                              {/* Bolhas */}
                              <div style={{ display: "flex", gap: 6 }}>
                                {alternativasLabels.map(letra => (
                                  <button
                                    key={letra}
                                    type="button"
                                    className={`mg-bubble ${selecionada === letra ? "selected" : ""}`}
                                    onClick={() => marcar(qIdx, letra)}
                                  >
                                    {letra}
                                  </button>
                                ))}
                              </div>

                              {/* Indicador de marcação */}
                              <div style={{
                                marginLeft: "auto", fontSize: "0.78rem", fontWeight: 600,
                                color: selecionada ? "#22d3ee" : "transparent",
                                transition: "color 0.2s",
                              }}>
                                {selecionada || "·"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Erro */}
                {erro && (
                  <div style={{
                    padding: "12px 18px", borderRadius: 10, marginTop: 8,
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171", fontSize: "0.82rem", fontWeight: 600,
                  }}>
                    {erro}
                  </div>
                )}
              </div>

              {/* Footer fixo */}
              <div className="mg-footer">
                <button
                  className="gab-btn gab-btn-ghost"
                  onClick={onClose}
                  type="button"
                  style={{ padding: "12px 28px" }}
                >
                  Cancelar
                </button>
                <button
                  className="gab-btn gab-btn-primary"
                  onClick={handleSalvar}
                  disabled={salvando || marcadas < nQ}
                  type="button"
                  style={{
                    padding: "12px 32px", fontSize: "0.95rem",
                    opacity: marcadas < nQ ? 0.5 : 1,
                  }}
                >
                  {salvando ? (
                    <><div className="gab-spinner" /> Salvando...</>
                  ) : (
                    <>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Salvar Gabarito Oficial
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
