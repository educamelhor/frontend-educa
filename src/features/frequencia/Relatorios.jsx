// src/features/frequencia/Relatorios.jsx
// ============================================================================
// Módulo FREQUÊNCIA — Relatórios de Frequência
// Gera relatórios com os alunos mais faltosos, por turma e período.
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../services/api";

const ANO_LETIVO = String(new Date().getFullYear());

export default function Relatorios() {
  const escolaId = localStorage.getItem("escola_id");
  const [turnos, setTurnos] = useState([]);
  const [turno, setTurno] = useState("");
  const [turmas, setTurmas] = useState([]);
  const [turmasFiltradas, setTurmasFiltradas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [periodo, setPeriodo] = useState("bimestre_atual");
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gerado, setGerado] = useState(false);

  useEffect(() => {
    api.get("/turnos")
      .then(r => setTurnos(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!escolaId) return;
    api.get("/turmas")
      .then(r => { const all = (r.data || []).filter(t => String(t.ano) === ANO_LETIVO); setTurmas(all); setTurmasFiltradas(all); })
      .catch(() => {});
  }, [escolaId]);

  useEffect(() => {
    if (turno) {
      setTurmasFiltradas(turmas.filter(t => (t.turno || "").toLowerCase() === turno.toLowerCase()));
    } else {
      setTurmasFiltradas(turmas);
    }
    setTurmaId("");
  }, [turno, turmas]);

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      const params = { escola_id: escolaId, periodo };
      if (turmaId) params.turma_id = turmaId;
      const r = await api.get("/frequencia/relatorios/faltosos", { params });
      setDados(r.data || []);
      setGerado(true);
    } catch {
      setDados([]);
      setGerado(true);
    } finally {
      setLoading(false);
    }
  };

  const getAlertLevel = (faltas) => {
    if (faltas >= 20) return { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", label: "CRÍTICO", emoji: "🔴" };
    if (faltas >= 10) return { bg: "#fff7ed", border: "#fed7aa", color: "#ea580c", label: "ATENÇÃO", emoji: "🟡" };
    if (faltas >= 5) return { bg: "#fefce8", border: "#fef08a", color: "#ca8a04", label: "ALERTA", emoji: "🟠" };
    return { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a", label: "OK", emoji: "🟢" };
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
        borderRadius: 16, padding: "28px 32px", marginBottom: 24,
        color: "#fff", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 180, height: 180,
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
          }}>📊</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
              Relatórios de Frequência
            </h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: "0.88rem", marginTop: 2 }}>
              Identifique os alunos com maior número de faltas
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "20px 24px", marginBottom: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
        display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end",
      }}>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Turno</label>
          <select
            value={turno} onChange={e => setTurno(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 160 }}
          >
            <option value="">Todos os turnos</option>
            {turnos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Turma</label>
          <select
            value={turmaId} onChange={e => setTurmaId(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 200 }}
          >
            <option value="">Todas as turmas ({turmasFiltradas.length})</option>
            {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.turma || t.nome}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Período</label>
          <select
            value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 200 }}
          >
            <option value="bimestre_atual">Bimestre Atual</option>
            <option value="semestre">Semestre</option>
            <option value="ano_letivo">Ano Letivo</option>
          </select>
        </div>

        <button
          onClick={gerarRelatorio} disabled={loading}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: loading ? "#94a3b8" : "linear-gradient(135deg, #4338ca, #6366f1)",
            color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: loading ? "wait" : "pointer",
            boxShadow: "0 2px 8px rgba(67,56,202,0.3)",
          }}
        >{loading ? "Gerando..." : "📊 Gerar Relatório"}</button>
      </div>

      {/* Resultado */}
      {gerado && (
        <div style={{
          background: "#fff", borderRadius: 14, overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
        }}>
          {dados.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📊</div>
              <p style={{ fontWeight: 600 }}>Nenhum dado encontrado para o período selecionado</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {["#", "Aluno", "Turma", "Total Faltas", "Justificadas", "Não Justif.", "% Frequência", "Status"].map(h => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left", fontSize: "0.75rem",
                        fontWeight: 700, color: "#475569", textTransform: "uppercase",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, i) => {
                    const level = getAlertLevel(d.total_faltas || 0);
                    return (
                      <tr key={i} style={{
                        borderBottom: "1px solid #f1f5f9", background: level.bg,
                        transition: "all 0.15s",
                      }}>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: "#94a3b8", fontSize: "0.85rem" }}>{i + 1}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: "#1e293b", fontSize: "0.88rem" }}>{d.aluno_nome}</td>
                        <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "0.85rem" }}>{d.turma_nome}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            background: level.color, color: "#fff",
                            padding: "3px 12px", borderRadius: 8, fontWeight: 800, fontSize: "0.88rem",
                          }}>{d.total_faltas || 0}</span>
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: "#16a34a" }}>{d.justificadas || 0}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: "#dc2626" }}>{d.nao_justificadas || 0}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: level.color }}>{d.percentual_frequencia || "—"}%</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "4px 10px", borderRadius: 8, fontSize: "0.75rem",
                            fontWeight: 700, background: `${level.color}15`, color: level.color,
                            border: `1px solid ${level.border}`,
                          }}>
                            {level.emoji} {level.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
