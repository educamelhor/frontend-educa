// features/professores/conselho/ModalMapaNota.jsx
// ============================================================================
// Modal "Mapa de Nota" — visão consolidada de todas as notas de uma turma
// em um único bimestre, com sinalização de destaque por comportamento.
//
// Regras visuais:
//  🟢 Verde    → nota >= 7.0  (potencial destaque)
//  🔴 Vermelho → nota <  5.0  (atenção)
//  ⚪ Neutro   → 5.0 <= nota < 7.0
//
// Interação:
//  • O professor pode clicar nas células da SUA disciplina com nota verde
//    para sinalizar 🟡 amarelo = "boas notas, mas comportamento não merece destaque"
//  • O toggle é salvo no backend por professor/aluno/disciplina/bimestre/ano
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

// ── Lógica de bimestre atual ────────────────────────────────────────────────
// Calendário escolar ajustado conforme definição do cliente:
// Abr-Mai → 1  |  Jul-Ago → 2  |  Set-Out → 3  |  Nov-Dez → 4
// Jan-Mar  → 1 (pré-semestre)  |  Jun → 2 (pós 1º bimestre)
function bimestreAtual() {
  const m = new Date().getMonth() + 1; // 1-12
  if (m === 4 || m === 5)  return 1;
  if (m === 7 || m === 8)  return 2;
  if (m === 9 || m === 10) return 3;
  if (m === 11 || m === 12) return 4;
  if (m <= 3) return 1;
  return 2; // junho
}

const BIMESTRES = [
  { valor: 1, label: "1º Bimestre" },
  { valor: 2, label: "2º Bimestre" },
  { valor: 3, label: "3º Bimestre" },
  { valor: 4, label: "4º Bimestre" },
];

// ── Cor da célula de nota ───────────────────────────────────────────────────
function corCelula(nota, flagged, minhaDisciplina) {
  if (nota === null || nota === undefined) return { bg: "#f8fafc", text: "#94a3b8", border: "#e2e8f0" };
  if (flagged) return { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" }; // amarelo = não destaque
  if (nota >= 7)  return { bg: "#dcfce7", text: "#15803d", border: "#86efac" }; // verde
  if (nota < 5)   return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" }; // vermelho
  return { bg: "#f8fafc", text: "#374151", border: "#e2e8f0" }; // neutro
}

export default function ModalMapaNota({ turma, anoLetivo, onClose }) {
  const [bimestre, setBimestre]     = useState(bimestreAtual);
  const [loading, setLoading]       = useState(false);
  const [salvando, setSalvando]     = useState(null); // "alunoId_discId" em andamento
  const [alunos, setAlunos]         = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [notas, setNotas]           = useState({});
  const [flags, setFlags]           = useState(new Set()); // "alunoId_disciplinaId"
  const [erro, setErro]             = useState(null);

  const carregar = useCallback(async () => {
    if (!turma?.id) return;
    setLoading(true);
    setErro(null);
    try {
      const { data } = await api.get(`/notas/turmas/${turma.id}/mapa-nota`, {
        params: { bimestre, ano: anoLetivo },
      });
      if (data?.ok) {
        setAlunos(data.alunos || []);
        setDisciplinas(data.disciplinas || []);
        setNotas(data.notas || {});
        setFlags(new Set(data.flags || []));
      } else {
        setErro("Não foi possível carregar o mapa de notas.");
      }
    } catch (err) {
      console.error("[ModalMapaNota]", err);
      setErro("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [turma?.id, bimestre, anoLetivo]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Toggle de flag (apenas minha disciplina, apenas nota >= 7) ──────────
  async function toggleFlag(aluno, disc) {
    if (!disc.minha) return; // segurança extra no frontend
    const nota = notas[`${aluno.id}_${disc.id}`];
    if (nota === undefined || nota === null || nota < 7) return;

    const key = `${aluno.id}_${disc.id}`;
    setSalvando(key);
    try {
      const { data } = await api.post("/notas/mapa-nota/flag", {
        aluno_id: aluno.id,
        disciplina_id: disc.id,
        bimestre,
        ano: anoLetivo,
        turma_id: turma.id,
      });
      if (data?.ok) {
        setFlags(prev => {
          const next = new Set(prev);
          if (data.flagged) next.add(key);
          else next.delete(key);
          return next;
        });
      }
    } catch (err) {
      console.error("[ModalMapaNota/flag]", err);
    } finally {
      setSalvando(null);
    }
  }

  const turmaNome = turma?.nome || turma?.turma || "";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
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
          background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
          borderRadius: "16px 16px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#bfdbfe", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Mapa de Nota
            </div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: "1.35rem", fontWeight: 800 }}>
              Turma {turmaNome}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "#93c5fd", marginTop: 2 }}>
              Boletim coletivo · Ano Letivo {anoLetivo}
            </div>
          </div>

          {/* Seletor de Bimestre */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ color: "#bfdbfe", fontSize: "0.8rem", fontWeight: 600 }}>Bimestre:</label>
            <div style={{ display: "flex", gap: 6 }}>
              {BIMESTRES.map(b => (
                <button
                  key={b.valor}
                  onClick={() => setBimestre(b.valor)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    border: "2px solid",
                    borderColor: bimestre === b.valor ? "#fff" : "rgba(255,255,255,0.3)",
                    backgroundColor: bimestre === b.valor ? "#fff" : "rgba(255,255,255,0.1)",
                    color: bimestre === b.valor ? "#1e3a8a" : "#e0f2fe",
                    transition: "all 0.15s",
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Botão fechar */}
            <button
              onClick={onClose}
              style={{
                marginLeft: 8,
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
            { cor: "#dcfce7", borda: "#86efac", texto: "#15803d", label: "Nota ≥ 7,0 — destaque" },
            { cor: "#fef3c7", borda: "#f59e0b", texto: "#92400e", label: "Boas notas, comportamento inadequado" },
            { cor: "#fee2e2", borda: "#fca5a5", texto: "#b91c1c", label: "Nota < 5,0 — atenção" },
            { cor: "#f8fafc", borda: "#e2e8f0", texto: "#374151", label: "5,0 ≤ nota < 7,0" },
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
            💡 Clique nas células verdes da <strong>sua disciplina</strong> para sinalizar comportamento
          </span>
        </div>

        {/* ── Corpo — Tabela ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "0 0 8px" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 600 }}>Carregando notas...</div>
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
              <div style={{ fontWeight: 600 }}>Nenhum aluno ou nota encontrada para este bimestre.</div>
              <div style={{ fontSize: "0.8rem", marginTop: 6 }}>Verifique se os professores já exportaram os diários para o boletim.</div>
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
                      title={disc.minha ? `Sua disciplina — clique nas notas verdes para sinalizar` : disc.nome}
                      style={{
                        padding: "10px 8px",
                        textAlign: "center",
                        fontWeight: 700,
                        minWidth: 90,
                        borderRight: "1px solid rgba(255,255,255,0.12)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 110,
                        fontSize: "0.7rem",
                        backgroundColor: disc.minha ? "rgba(250,204,21,0.25)" : "transparent",
                        position: "relative",
                      }}
                    >
                      {disc.nome}
                      {disc.minha && (
                        <span style={{
                          display: "block", fontSize: "0.55rem", color: "#fde68a",
                          fontWeight: 600, marginTop: 2,
                        }}>
                          ✏️ sua disciplina
                        </span>
                      )}
                    </th>
                  ))}
                  <th style={{
                    padding: "10px 12px", textAlign: "center", fontWeight: 800,
                    minWidth: 70, backgroundColor: "rgba(255,255,255,0.1)",
                    fontSize: "0.7rem",
                  }}>
                    MÉDIA
                  </th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, rowIdx) => {
                  const notasAluno = disciplinas.map(d => notas[`${aluno.id}_${d.id}`]);
                  const notasValidas = notasAluno.filter(n => n !== undefined && n !== null);
                  const media = notasValidas.length > 0
                    ? notasValidas.reduce((s, n) => s + n, 0) / notasValidas.length
                    : null;

                  return (
                    <tr
                      key={aluno.id}
                      style={{ backgroundColor: rowIdx % 2 === 0 ? "#fff" : "#f8fafc" }}
                    >
                      {/* Nome — fixo à esquerda */}
                      <td style={{
                        padding: "8px 16px",
                        fontWeight: 600,
                        color: "#1e293b",
                        position: "sticky",
                        left: 0,
                        backgroundColor: rowIdx % 2 === 0 ? "#fff" : "#f8fafc",
                        zIndex: 5,
                        borderRight: "2px solid #e2e8f0",
                        borderBottom: "1px solid #f1f5f9",
                      }}>
                        {aluno.nome}
                      </td>

                      {/* Células de nota por disciplina */}
                      {disciplinas.map(disc => {
                        const nota = notas[`${aluno.id}_${disc.id}`];
                        const key = `${aluno.id}_${disc.id}`;
                        const flagged = flags.has(key);
                        const cor = corCelula(nota, flagged, disc.minha);
                        const clicavel = disc.minha && nota !== undefined && nota !== null && nota >= 7;
                        const estasSalvando = salvando === key;

                        return (
                          <td
                            key={disc.id}
                            onClick={() => clicavel && !estasSalvando && toggleFlag(aluno, disc)}
                            title={
                              nota === undefined || nota === null ? "Sem nota"
                              : clicavel
                                ? flagged
                                  ? "Clique para remover sinalização de comportamento"
                                  : "Clique para sinalizar: comportamento não merece destaque"
                                : `${nota.toFixed(1)}`
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
                              cursor: clicavel && !estasSalvando ? "pointer" : "default",
                              transition: "all 0.18s",
                              outline: clicavel ? `2px solid transparent` : "none",
                              userSelect: "none",
                              position: "relative",
                            }}
                            onMouseEnter={e => {
                              if (clicavel) {
                                e.currentTarget.style.outline = `2px solid ${cor.border}`;
                                e.currentTarget.style.transform = "scale(1.05)";
                              }
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.outline = "2px solid transparent";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            {estasSalvando ? (
                              <span style={{ fontSize: "0.7rem" }}>⏳</span>
                            ) : nota !== undefined && nota !== null ? (
                              <>
                                {nota.toFixed(1)}
                                {flagged && <span style={{ fontSize: "0.55rem", display: "block", lineHeight: 1 }}>⚠️</span>}
                              </>
                            ) : (
                              <span style={{ color: "#cbd5e1", fontSize: "0.7rem" }}>—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Média */}
                      <td style={{
                        padding: "7px 8px",
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: media !== null
                          ? media >= 7 ? "#dcfce7" : media < 5 ? "#fee2e2" : "#f0f9ff"
                          : "#f8fafc",
                        color: media !== null
                          ? media >= 7 ? "#15803d" : media < 5 ? "#b91c1c" : "#0369a1"
                          : "#94a3b8",
                      }}>
                        {media !== null ? media.toFixed(1) : "—"}
                      </td>
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
  );
}
