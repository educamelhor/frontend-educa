// features/professores/conselho/ModalMediaAnual.jsx
// ============================================================================
// Modal "Média Anual" — versão PROFESSOR
//
// Exibe a média anual acumulada de cada aluno por disciplina (disciplinas anuais).
// Cálculo: Soma de todas as notas lançadas no ano dividida por 4.
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

// ── Cor da célula de média ──────────────────────────────────────────────────
function corCelula(media) {
  if (media === null || media === undefined) return { bg: "#f8fafc", text: "#94a3b8", border: "#e2e8f0" };
  if (media >= 7)  return { bg: "#dcfce7", text: "#15803d", border: "#86efac" }; // verde (destaque)
  if (media < 5)   return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" }; // vermelho (atenção)
  return { bg: "#f8fafc", text: "#374151", border: "#e2e8f0" }; // neutro (5.0 a 6.9)
}

export default function ModalMediaAnual({ turma, anoLetivo, onClose }) {
  const [loading, setLoading]         = useState(false);
  const [alunos, setAlunos]           = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [medias, setMedias]           = useState({});
  const [erro, setErro]               = useState(null);

  const carregar = useCallback(async () => {
    if (!turma?.id) return;
    setLoading(true);
    setErro(null);
    try {
      const { data } = await api.get(`/notas/turmas/${turma.id}/media-anual`, {
        params: { ano: anoLetivo },
      });
      if (data?.ok) {
        setAlunos(data.alunos || []);
        setDisciplinas(data.disciplinas || []);
        setMedias(data.medias || {});
      } else {
        setErro("Não foi possível carregar a média anual.");
      }
    } catch (err) {
      console.error("[ModalMediaAnual]", err);
      setErro("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [turma?.id, anoLetivo]);

  useEffect(() => { carregar(); }, [carregar]);

  const turmaNome = turma?.nome || turma?.turma || "";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes pulse-gold-prof {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(234,179,8,0.6)); transform: scale(1); }
          50%       { filter: drop-shadow(0 0 7px rgba(234,179,8,1));   transform: scale(1.15); }
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "24px 12px",
        backgroundColor: "rgba(15,23,42,0.6)",
        backdropFilter: "blur(4px)",
        overflowY: "auto",
      }}>
        <div style={{
          position: "relative",
          backgroundColor: "#fff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "1200px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 48px)",
        }}>

          {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
          <div style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
            borderRadius: "16px 16px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#bfdbfe", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Média Anual
              </div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: "1.35rem", fontWeight: 800 }}>
                Turma {turmaNome}
              </h2>
              <div style={{ fontSize: "0.78rem", color: "#93c5fd", marginTop: 2 }}>
                Média acumulada (Soma dos bimestres ÷ 4) · Ano Letivo {anoLetivo}
              </div>
            </div>

            {/* Ações cabeçalho */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={carregar}
                disabled={loading}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
                title="Recarregar médias"
              >
                🔄 {loading ? "Atualizando..." : "Atualizar"}
              </button>

              {/* Botão fechar */}
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "1.1rem",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title="Fechar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Legenda ────────────────────────────────────────────────────── */}
          <div style={{
            padding: "8px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}>
            {[
              { cor: "#dcfce7", borda: "#86efac", texto: "#15803d", label: "Média ≥ 7,0 — destaque" },
              { cor: "#fee2e2", borda: "#fca5a5", texto: "#b91c1c", label: "Média < 5,0 — atenção" },
              { cor: "#f8fafc", borda: "#e2e8f0", texto: "#374151", label: "5,0 ≤ Média < 7,0 — regular" },
            ].map(({ cor, borda, texto, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  display: "inline-block", width: 16, height: 16, borderRadius: 4,
                  backgroundColor: cor, border: `2px solid ${borda}`,
                }} />
                <span style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 600 }}>{label}</span>
              </div>
            ))}
            <span style={{ fontSize: "0.68rem", color: "#94a3b8", marginLeft: "auto", fontStyle: "italic" }}>
              📈 Disciplinas anuais · Cálculo contínuo (Soma das notas lançadas ÷ 4)
            </span>
          </div>

          {/* ── Corpo — Tabela ─────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "0 0 8px" }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
                <div style={{ fontWeight: 600 }}>Calculando médias anuais...</div>
              </div>
            ) : erro ? (
              <div style={{ padding: 40, textAlign: "center", color: "#b91c1c" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚠️</div>
                <div style={{ fontWeight: 600 }}>{erro}</div>
                <button
                  onClick={carregar}
                  style={{ marginTop: 12, padding: "6px 16px", borderRadius: 6, backgroundColor: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : alunos.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600 }}>Nenhum aluno matriculado encontrado nesta turma.</div>
              </div>
            ) : disciplinas.length === 0 ? (
              <div style={{ padding: 50, textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 14 }}>📭</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#374151", marginBottom: 8 }}>
                  Nenhuma nota lançada para a turma {turmaNome} em {anoLetivo}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#6b7280", maxWidth: 420, margin: "0 auto" }}>
                  A média anual é calculada a partir das notas exportadas no boletim pelos professores. Quando as notas forem registradas, as médias acumuladas aparecerão automaticamente aqui.
                </div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#1e3a8a", color: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{
                      padding: "10px 16px", textAlign: "left", fontWeight: 800,
                      position: "sticky", left: 0, background: "#1e3a8a", zIndex: 11,
                      minWidth: 240, borderRight: "2px solid rgba(255,255,255,0.2)",
                    }}>
                      Estudante
                    </th>
                    {disciplinas.map(disc => (
                      <th
                        key={disc.id}
                        title={disc.nome}
                        style={{
                          padding: "10px 8px",
                          textAlign: "center",
                          fontWeight: 700,
                          minWidth: 80,
                          borderRight: "1px solid rgba(255,255,255,0.12)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 110,
                          fontSize: "0.7rem",
                        }}
                      >
                        {disc.abreviatura || disc.nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alunos.map((aluno, rowIdx) => {
                    // Destaque anual: todas as médias existentes >= 7,0
                    const mediasDoAluno = disciplinas
                      .map(d => medias[`${aluno.id}_${d.id}`])
                      .filter(m => m !== undefined && m !== null);

                    const isDestaque = mediasDoAluno.length > 0 && mediasDoAluno.every(m => m >= 7);
                    const rowBg = rowIdx % 2 === 0 ? "#fff" : "#f8fafc";

                    return (
                      <tr
                        key={aluno.id}
                        style={{ backgroundColor: isDestaque ? "#f0fdf4" : rowBg }}
                      >
                        {/* Nome — fixo à esquerda */}
                        <td style={{
                          padding: "8px 16px",
                          fontWeight: 600,
                          color: isDestaque ? "#15803d" : "#1e293b",
                          position: "sticky",
                          left: 0,
                          backgroundColor: isDestaque ? "#f0fdf4" : rowBg,
                          zIndex: 5,
                          borderRight: "2px solid #e2e8f0",
                          borderBottom: "1px solid #f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}>
                          {isDestaque && (
                            <span
                              title="Aluno destaque anual: todas as médias anuais ≥ 7,0"
                              style={{
                                fontSize: "1rem",
                                lineHeight: 1,
                                animation: "pulse-gold-prof 2s infinite",
                                flexShrink: 0,
                              }}
                            >
                              🏅
                            </span>
                          )}
                          {aluno.nome}
                        </td>

                        {/* Células de média por disciplina */}
                        {disciplinas.map(disc => {
                          const media = medias[`${aluno.id}_${disc.id}`];
                          const cor = corCelula(media);

                          return (
                            <td
                              key={disc.id}
                              title={
                                media === undefined || media === null
                                  ? "Sem notas lançadas"
                                  : `Média Anual: ${media.toFixed(1)}`
                              }
                              style={{
                                padding: "7px 6px",
                                textAlign: "center",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                borderBottom: "1px solid #f1f5f9",
                                borderRight: "1px solid #f1f5f9",
                                backgroundColor: cor.bg,
                                color: cor.text,
                                cursor: "default",
                              }}
                            >
                              {media !== undefined && media !== null ? (
                                media.toFixed(1)
                              ) : (
                                <span style={{ color: "#cbd5e1", fontSize: "0.7rem" }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Rodapé ─────────────────────────────────────────────────────── */}
          <div style={{
            padding: "10px 24px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            borderRadius: "0 0 16px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.72rem",
            color: "#64748b",
          }}>
            <span>
              {alunos.length > 0 && `${alunos.length} estudante${alunos.length !== 1 ? "s" : ""} · ${disciplinas.length} disciplina${disciplinas.length !== 1 ? "s" : ""}`}
            </span>
            <button
              onClick={onClose}
              style={{
                padding: "8px 22px",
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: "0.85rem",
                boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
              }}
              onMouseEnter={e => e.target.style.backgroundColor = "#2563eb"}
              onMouseLeave={e => e.target.style.backgroundColor = "#3b82f6"}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
