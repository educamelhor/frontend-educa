// src/features/frequencia/ConselhoTutelar.jsx
// ============================================================================
// Módulo FREQUÊNCIA — Conselho Tutelar
// Gera relatórios com histórico de faltas e busca ativa para enviar
// ao Conselho Tutelar conforme ECA (Estatuto da Criança e do Adolescente).
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../services/api";

export default function ConselhoTutelar() {
  const escolaId = localStorage.getItem("escola_id");
  const [turnos, setTurnos] = useState([]);
  const [turno, setTurno] = useState("");
  const [turmas, setTurmas] = useState([]);
  const [turmasFiltradas, setTurmasFiltradas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState("");
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [encaminhamentos, setEncaminhamentos] = useState([]);

  useEffect(() => {
    api.get("/turnos")
      .then(r => setTurnos(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!escolaId) return;
    api.get("/turmas")
      .then(r => { setTurmas(r.data || []); setTurmasFiltradas(r.data || []); })
      .catch(() => {});
  }, [escolaId]);

  useEffect(() => {
    if (turno) {
      setTurmasFiltradas(turmas.filter(t => (t.turno || "").toLowerCase() === turno.toLowerCase()));
    } else {
      setTurmasFiltradas(turmas);
    }
    setTurmaId(""); setAlunoId("");
  }, [turno, turmas]);

  useEffect(() => {
    if (!turmaId) { setAlunos([]); return; }
    api.get(`/turmas/${turmaId}/alunos`)
      .then(r => setAlunos(r.data?.alunos || r.data || []))
      .catch(() => setAlunos([]));
  }, [turmaId]);

  // Carregar encaminhamentos existentes
  useEffect(() => {
    if (!escolaId) return;
    api.get("/frequencia/conselho-tutelar/encaminhamentos", { params: { escola_id: escolaId } })
      .then(r => setEncaminhamentos(r.data || []))
      .catch(() => setEncaminhamentos([]));
  }, [escolaId]);

  const gerarRelatorio = async () => {
    if (!alunoId) return;
    setLoading(true);
    try {
      const r = await api.get("/frequencia/conselho-tutelar/relatorio", {
        params: { escola_id: escolaId, aluno_id: alunoId },
      });
      setRelatorio(r.data || null);
    } catch {
      setRelatorio(null);
    } finally {
      setLoading(false);
    }
  };

  const registrarEncaminhamento = async () => {
    if (!alunoId) return;
    try {
      await api.post("/frequencia/conselho-tutelar/encaminhamentos", {
        escola_id: escolaId,
        aluno_id: alunoId,
        turma_id: turmaId,
      });
      alert("Encaminhamento registrado com sucesso!");
      // Reload
      const r = await api.get("/frequencia/conselho-tutelar/encaminhamentos", { params: { escola_id: escolaId } });
      setEncaminhamentos(r.data || []);
    } catch (err) {
      alert("Erro: " + (err.response?.data?.error || err.message));
    }
  };

  const aluno = alunos.find(a => String(a.id) === String(alunoId));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
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
          }}>⚖️</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Conselho Tutelar</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: "0.88rem", marginTop: 2 }}>
              Geração de relatórios e encaminhamentos conforme ECA
            </p>
          </div>
        </div>
      </div>

      {/* Seleção do aluno */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "20px 24px", marginBottom: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
      }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", marginBottom: 16, marginTop: 0 }}>
          📋 Selecionar Aluno para Relatório
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Turno</label>
            <select value={turno} onChange={e => { setTurno(e.target.value); setTurmaId(""); setAlunoId(""); setRelatorio(null); }}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 160 }}>
              <option value="">Todos os turnos</option>
              {turnos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Turma</label>
            <select value={turmaId} onChange={e => { setTurmaId(e.target.value); setAlunoId(""); setRelatorio(null); }}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 220 }}>
              <option value="">Selecione a turma ({turmasFiltradas.length})</option>
              {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.turma || t.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Aluno</label>
            <select value={alunoId} onChange={e => { setAlunoId(e.target.value); setRelatorio(null); }}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 280 }}>
              <option value="">Selecione o aluno</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <button onClick={gerarRelatorio} disabled={!alunoId || loading} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: !alunoId ? "#94a3b8" : "linear-gradient(135deg, #991b1b, #dc2626)",
            color: "#fff", fontWeight: 700, fontSize: "0.88rem",
            cursor: !alunoId ? "not-allowed" : "pointer",
            boxShadow: alunoId ? "0 2px 8px rgba(220,38,38,0.3)" : "none",
          }}>{loading ? "Gerando..." : "⚖️ Gerar Relatório"}</button>
        </div>
      </div>

      {/* Relatório gerado */}
      {relatorio && (
        <div style={{
          background: "#fff", borderRadius: 14, padding: "28px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
          marginBottom: 24,
        }}>
          {/* Cabeçalho do relatório */}
          <div style={{
            background: "#fef2f2", borderRadius: 12, padding: "20px 24px",
            border: "1px solid #fecaca", marginBottom: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#991b1b" }}>
                  Relatório para Conselho Tutelar
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#7f1d1d" }}>
                  Aluno: <strong>{aluno?.nome || relatorio.aluno_nome || "—"}</strong> | Turma: <strong>{relatorio.turma_nome || "—"}</strong>
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#991b1b" }}>
                  Conforme Art. 56, inciso II do ECA — Lei nº 8.069/1990
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={registrarEncaminhamento} style={{
                  padding: "8px 18px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg, #991b1b, #dc2626)",
                  color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                }}>📤 Registrar Encaminhamento</button>
                <button onClick={() => window.print()} style={{
                  padding: "8px 18px", borderRadius: 10, border: "1.5px solid #d1d5db",
                  background: "#fff", color: "#374151", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                }}>🖨️ Imprimir</button>
              </div>
            </div>
          </div>

          {/* Dados do aluno */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total de Faltas", value: relatorio.total_faltas || 0, icon: "📊", cor: "#dc2626" },
              { label: "Faltas Justificadas", value: relatorio.justificadas || 0, icon: "📋", cor: "#16a34a" },
              { label: "Faltas Não Justificadas", value: relatorio.nao_justificadas || 0, icon: "⚠️", cor: "#d97706" },
              { label: "Tentativas de Contato", value: relatorio.busca_ativa_total || 0, icon: "📞", cor: "#2563eb" },
            ].map((item, i) => (
              <div key={i} style={{
                background: `${item.cor}08`, borderRadius: 12, padding: "16px 20px",
                border: `1px solid ${item.cor}20`,
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: item.cor, marginBottom: 4 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: item.cor }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Histórico de Justificativas */}
          {relatorio.justificativas?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
                📋 Histórico de Justificativas
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Tipo", "Período", "Dias", "Observação"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.justificativas.map((j, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontSize: "0.85rem", fontWeight: 600 }}>{j.tipo_label || j.tipo}</td>
                        <td style={{ padding: "10px 14px", fontSize: "0.85rem", color: "#475569" }}>
                          {j.data_inicio ? new Date(j.data_inicio).toLocaleDateString("pt-BR") : ""} — {j.data_fim ? new Date(j.data_fim).toLocaleDateString("pt-BR") : ""}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "0.85rem", fontWeight: 700 }}>{j.dias}</td>
                        <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#64748b" }}>{j.observacao || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Histórico de Busca Ativa */}
          {relatorio.busca_ativa?.length > 0 && (
            <div>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
                🔍 Histórico de Busca Ativa
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Data", "Meio", "Resultado", "Observação"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.busca_ativa.map((b, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontSize: "0.85rem" }}>{b.data_contato ? new Date(b.data_contato).toLocaleDateString("pt-BR") : "—"}</td>
                        <td style={{ padding: "10px 14px", fontSize: "0.85rem" }}>{b.meio_contato}</td>
                        <td style={{ padding: "10px 14px", fontSize: "0.85rem", fontWeight: 600 }}>{b.resultado}</td>
                        <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#64748b" }}>{b.observacao || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Encaminhamentos anteriores */}
      {encaminhamentos.length > 0 && (
        <div style={{
          background: "#fff", borderRadius: 14, padding: "24px 28px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
        }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", marginBottom: 16, marginTop: 0 }}>
            📤 Encaminhamentos Registrados
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["Aluno", "Turma", "Data Encaminhamento", "Registrado por"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {encaminhamentos.map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b" }}>{e.aluno_nome}</td>
                    <td style={{ padding: "14px 16px", color: "#64748b" }}>{e.turma_nome}</td>
                    <td style={{ padding: "14px 16px", color: "#475569" }}>{e.criado_em ? new Date(e.criado_em).toLocaleDateString("pt-BR") : "—"}</td>
                    <td style={{ padding: "14px 16px", color: "#64748b" }}>{e.registrado_por_nome || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
