// ============================================================================
// Modal — Gabarito Oficial (Etapa 2)
// Fluxo: Selecionar Avaliação do BD → Marcar Respostas → Salvar no BD
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

export default function ModalGabaritoOficial({ open, onClose, onSave }) {
  // ─── Etapa do wizard ───
  const [step, setStep] = useState(1); // 1 = selecionar avaliação, 2 = marcação

  // ─── Lista de avaliações do BD ───
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroBimestre, setFiltroBimestre] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // ─── Avaliação selecionada ───
  const [avalSelecionada, setAvalSelecionada] = useState(null);

  // ─── Marcação ───
  const [gabarito, setGabarito] = useState([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // ─── Buscar avaliações ao abrir ───
  useEffect(() => {
    if (open) {
      setStep(1);
      setAvalSelecionada(null);
      setGabarito([]);
      setErro("");
      setFiltroTexto("");
      setFiltroBimestre("");
      setFiltroTipo("");
      fetchAvaliacoes();
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

  // ─── Filtrar avaliações ───
  const avalFiltradas = avaliacoes.filter((a) => {
    if (filtroTexto && !a.titulo.toLowerCase().includes(filtroTexto.toLowerCase())) return false;
    if (filtroBimestre && a.bimestre !== filtroBimestre) return false;
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    return true;
  });

  // ─── Selecionar e avançar ───
  function handleSelecionar(aval) {
    setAvalSelecionada(aval);
    const nQ = aval.num_questoes || 10;
    // Se já tem gabarito oficial salvo, carregar
    if (aval.gabarito_oficial && Array.isArray(aval.gabarito_oficial) && aval.gabarito_oficial.length > 0) {
      setGabarito([...aval.gabarito_oficial]);
    } else {
      setGabarito(Array(nQ).fill(null));
    }
    setErro("");
    setStep(2);
  }

  // ─── Marcar resposta ───
  function marcar(questaoIdx, letra) {
    const novo = [...gabarito];
    novo[questaoIdx] = novo[questaoIdx] === letra ? null : letra;
    setGabarito(novo);
  }

  // ─── Salvar gabarito oficial no BD ───
  async function handleSalvar() {
    const faltantes = gabarito
      .map((r, i) => (r === null ? i + 1 : null))
      .filter(Boolean);

    if (faltantes.length > 0) {
      setErro(
        `Marque todas as questões! Faltam: ${faltantes.map((n) => String(n).padStart(2, "0")).join(", ")}`
      );
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      // PUT no BD com gabarito_oficial
      await api.put(`/gabarito-avaliacoes/${avalSelecionada.id}`, {
        gabarito_oficial: gabarito,
      });

      // Retornar para o componente pai
      onSave({
        id: avalSelecionada.id,
        titulo: avalSelecionada.titulo,
        tipo: avalSelecionada.tipo,
        bimestre: avalSelecionada.bimestre,
        numQuestoes: avalSelecionada.num_questoes,
        numAlternativas: avalSelecionada.num_alternativas,
        notaTotal: avalSelecionada.nota_total,
        gabarito,
        disciplinas_config: avalSelecionada.disciplinas_config,
      });
    } catch (err) {
      setErro(err?.response?.data?.error || "Erro ao salvar gabarito oficial.");
    }
    setSalvando(false);
  }

  // ─── Atalhos de teclado ───
  const handleKeyDown = useCallback(
    (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    },
    [open]
  );

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

  // Descobrir de qual disciplina é cada questão
  function getDiscDaQuestao(qNum) {
    for (const dc of discConfig) {
      if (qNum >= dc.de && qNum <= dc.ate) return dc;
    }
    return null;
  }

  return (
    <div className="gab-modal-overlay" onClick={onClose}>
      <div
        className="gab-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: step === 2 ? "740px" : "640px" }}
      >
        {/* ─── Header ─── */}
        <div className="gab-modal-header">
          <div>
            <div className="gab-modal-title">
              {step === 1 ? "Selecionar Avaliação" : "Marcar Gabarito Oficial"}
            </div>
            {step === 1 && (
              <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                Escolha uma avaliação criada na Etapa 1
              </div>
            )}
            {step === 2 && avalSelecionada && (
              <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                {avalSelecionada.titulo} · {nQ} questões · {nA} alternativas · Nota {avalSelecionada.nota_total}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--gab-text-muted)", cursor: "pointer", padding: 8 }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ─── Step Indicator ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderBottom: "1px solid var(--gab-border)" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--gab-cyan)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.72rem", fontWeight: 800, color: "#fff", fontFamily: "var(--gab-font-display)",
          }}>1</div>
          <div style={{
            flex: 1, height: 2, borderRadius: 2, transition: "background 0.3s",
            background: step >= 2 ? "var(--gab-cyan)" : "var(--gab-border)",
          }} />
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: step >= 2 ? "var(--gab-cyan)" : "var(--gab-glass)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.72rem", fontWeight: 800, fontFamily: "var(--gab-font-display)",
            color: step >= 2 ? "#fff" : "var(--gab-text-muted)",
            border: step < 2 ? "1px solid var(--gab-border)" : "none",
          }}>2</div>
        </div>

        {/* ─── Body ─── */}
        <div className="gab-modal-body">

          {/* ═══ STEP 1: Selecionar avaliação ═══ */}
          {step === 1 && (
            <div className="gab-flex gab-flex-col gab-gap-16">

              {/* Filtros */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  className="gab-input"
                  type="text"
                  placeholder="🔍 Buscar por título..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  style={{ flex: 2, minWidth: 160 }}
                />
                <select
                  className="gab-select"
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                >
                  <option value="">Todos os tipos</option>
                  {Object.entries(TIPOS_LABELS).map(([id, t]) => (
                    <option key={id} value={id}>{t.icon} {t.label}</option>
                  ))}
                </select>
                <select
                  className="gab-select"
                  value={filtroBimestre}
                  onChange={(e) => setFiltroBimestre(e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                >
                  <option value="">Todos os bimestres</option>
                  <option value="1º Bimestre">1º Bimestre</option>
                  <option value="2º Bimestre">2º Bimestre</option>
                  <option value="3º Bimestre">3º Bimestre</option>
                  <option value="4º Bimestre">4º Bimestre</option>
                </select>
              </div>

              {/* Lista de avaliações */}
              <div style={{ maxHeight: "45vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {loadingAvaliacoes ? (
                  <div className="gab-flex gab-items-center gab-gap-12" style={{ padding: 20, justifyContent: "center" }}>
                    <div className="gab-spinner" />
                    <span style={{ color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>Carregando avaliações...</span>
                  </div>
                ) : avalFiltradas.length === 0 ? (
                  <div style={{
                    padding: "32px 20px", textAlign: "center", color: "var(--gab-text-muted)", fontSize: "0.85rem",
                    background: "var(--gab-glass)", borderRadius: 12,
                  }}>
                    {avaliacoes.length === 0
                      ? "Nenhuma avaliação criada. Crie primeiro na Etapa 1."
                      : "Nenhuma avaliação encontrada com esses filtros."}
                  </div>
                ) : (
                  avalFiltradas.map((a) => {
                    const tipoInfo = TIPOS_LABELS[a.tipo] || { label: a.tipo || "—", icon: "📄" };
                    const temGabarito = a.gabarito_oficial && Array.isArray(a.gabarito_oficial) && a.gabarito_oficial.length > 0;
                    const disc = a.disciplinas_config || [];

                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleSelecionar(a)}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 14,
                          padding: "14px 16px", borderRadius: 12, textAlign: "left", width: "100%",
                          border: "1px solid var(--gab-border)", background: "var(--gab-glass)",
                          cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = "var(--gab-cyan)";
                          e.currentTarget.style.background = "rgba(6, 182, 212, 0.04)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = "var(--gab-border)";
                          e.currentTarget.style.background = "var(--gab-glass)";
                        }}
                      >
                        {/* Ícone do tipo */}
                        <span style={{ fontSize: "1.5rem", lineHeight: 1, marginTop: 2 }}>{tipoInfo.icon}</span>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                              {a.titulo}
                            </span>
                            {temGabarito && (
                              <span style={{
                                padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700,
                                background: "rgba(16, 185, 129, 0.12)", color: "var(--gab-green)",
                                border: "1px solid rgba(16, 185, 129, 0.2)",
                              }}>
                                ✓ GAB. OFICIAL
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                            <span>{tipoInfo.label}</span>
                            {a.bimestre && <span>· {a.bimestre}</span>}
                            <span>· {a.num_questoes} questões</span>
                            <span>· Nota {a.nota_total}</span>
                            <span>· {a.status}</span>
                          </div>
                          {disc.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                              {disc.map((dc, i) => (
                                <span key={i} style={{
                                  padding: "2px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 600,
                                  background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)",
                                  color: "var(--gab-purple-light)",
                                }}>
                                  {dc.nome} (Q{dc.de}–Q{dc.ate})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Data */}
                        <div style={{ fontSize: "0.7rem", color: "var(--gab-text-muted)", whiteSpace: "nowrap", marginTop: 2 }}>
                          {new Date(a.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Marcar respostas ═══ */}
          {step === 2 && avalSelecionada && (
            <div className="gab-flex gab-flex-col gab-gap-16">

              {/* Info card com disciplinas */}
              {discConfig.length > 0 && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(139, 92, 246, 0.05)", border: "1px solid rgba(139, 92, 246, 0.15)",
                  display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
                }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)", fontWeight: 600 }}>
                    Disciplinas:
                  </span>
                  {discConfig.map((dc, i) => (
                    <span key={i} style={{
                      padding: "3px 10px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600,
                      background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.25)",
                      color: "var(--gab-purple-light)",
                    }}>
                      {dc.nome} (Q{dc.de}–Q{dc.ate})
                    </span>
                  ))}
                </div>
              )}

              {/* Barra de progresso */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="gab-progress" style={{ flex: 1 }}>
                  <div
                    className="gab-progress-bar"
                    style={{
                      width: `${(marcadas / nQ) * 100}%`,
                      background: marcadas === nQ
                        ? "var(--gab-green)"
                        : "var(--gab-cyan)",
                      transition: "width 0.3s, background 0.3s",
                    }}
                  />
                </div>
                <span style={{
                  fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap",
                  color: marcadas === nQ ? "var(--gab-green)" : "var(--gab-cyan-light)",
                }}>
                  {marcadas}/{nQ} marcadas
                </span>
              </div>

              {/* Tabela de marcação com separadores de disciplina */}
              <div style={{ maxHeight: "48vh", overflowY: "auto", paddingRight: 4 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{
                        padding: "8px 12px", textAlign: "center", fontSize: "0.72rem",
                        color: "var(--gab-text-muted)", fontWeight: 700, letterSpacing: 1,
                        position: "sticky", top: 0, background: "var(--gab-bg-secondary)", zIndex: 2,
                      }}>#</th>
                      {alternativasLabels.map((letra) => (
                        <th key={letra} style={{
                          padding: "8px 12px", textAlign: "center", fontSize: "0.75rem",
                          color: "var(--gab-text-muted)", fontWeight: 600,
                          position: "sticky", top: 0, background: "var(--gab-bg-secondary)", zIndex: 2,
                        }}>{letra}</th>
                      ))}
                      {discConfig.length > 0 && (
                        <th style={{
                          padding: "8px 12px", textAlign: "left", fontSize: "0.68rem",
                          color: "var(--gab-text-muted)", fontWeight: 600,
                          position: "sticky", top: 0, background: "var(--gab-bg-secondary)", zIndex: 2,
                        }}>Disciplina</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: nQ }).map((_, qIdx) => {
                      const qNum = qIdx + 1;
                      const disc = getDiscDaQuestao(qNum);
                      // Mostrar separador de disciplina
                      const showDivider = discConfig.length > 0 && disc && disc.de === qNum && qIdx > 0;

                      return (
                        <React.Fragment key={qIdx}>
                          {showDivider && (
                            <tr>
                              <td colSpan={nA + 1 + (discConfig.length > 0 ? 1 : 0)} style={{
                                padding: "6px 12px", fontSize: "0.72rem", fontWeight: 700,
                                color: "var(--gab-purple-light)",
                                borderTop: "2px solid rgba(139, 92, 246, 0.2)",
                                background: "rgba(139, 92, 246, 0.03)",
                              }}>
                                {disc.nome} — Questões {disc.de} a {disc.ate}
                              </td>
                            </tr>
                          )}
                          {/* Se é a primeira questão e tem disciplina, mostrar header */}
                          {discConfig.length > 0 && disc && disc.de === qNum && qIdx === 0 && (
                            <tr>
                              <td colSpan={nA + 1 + 1} style={{
                                padding: "6px 12px", fontSize: "0.72rem", fontWeight: 700,
                                color: "var(--gab-purple-light)",
                                background: "rgba(139, 92, 246, 0.03)",
                              }}>
                                {disc.nome} — Questões {disc.de} a {disc.ate}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td style={{
                              textAlign: "center", fontWeight: 700, fontSize: "0.85rem",
                              color: "var(--gab-text-secondary)", fontFamily: "var(--gab-font-display)",
                              padding: "4px 8px",
                            }}>
                              {String(qNum).padStart(2, "0")}
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
                            {discConfig.length > 0 && (
                              <td style={{
                                fontSize: "0.68rem", color: "var(--gab-text-muted)", padding: "4px 8px",
                              }}>
                                {disc?.nome || "—"}
                              </td>
                            )}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div style={{
              marginTop: 16, padding: "10px 16px",
              background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px", color: "var(--gab-red-light)", fontSize: "0.82rem", fontWeight: 600,
            }}>
              {erro}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="gab-modal-footer">
          {step === 2 && (
            <button
              className="gab-btn gab-btn-ghost"
              onClick={() => { setStep(1); setAvalSelecionada(null); }}
              type="button"
            >
              ← Voltar
            </button>
          )}
          <button className="gab-btn gab-btn-ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          {step === 2 && (
            <button
              className="gab-btn gab-btn-primary"
              onClick={handleSalvar}
              disabled={salvando}
              type="button"
            >
              {salvando ? (
                <>
                  <div className="gab-spinner" />
                  Salvando...
                </>
              ) : (
                <>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Salvar Gabarito Oficial
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
