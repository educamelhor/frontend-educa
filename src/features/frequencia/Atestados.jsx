// src/features/frequencia/Atestados.jsx
// ============================================================================
// Módulo FREQUÊNCIA — Atestados e Justificativas de Faltas
// Permite coordenadores/diretores registrar justificativas de faltas dos alunos.
// Professores conseguem visualizar e importar para seus diários.
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const TIPOS_JUSTIFICATIVA = [
  { value: "atestado_medico", label: "Atestado Médico", icon: "🏥", cor: "#ef4444" },
  { value: "atestado_acompanhamento", label: "Atestado de Acompanhamento", icon: "👨‍⚕️", cor: "#f97316" },
  { value: "atestado_obito", label: "Atestado de Óbito", icon: "🕊️", cor: "#6b7280" },
  { value: "atividades_militares", label: "Atividades Militares", icon: "🎖️", cor: "#059669" },
  { value: "convocacao_oficial", label: "Convocação Oficial", icon: "📋", cor: "#2563eb" },
  { value: "declaracao_trabalhista", label: "Declaração Trabalhista", icon: "💼", cor: "#7c3aed" },
  { value: "populacao_itinerancia", label: "População em Situação de Itinerância", icon: "🏕️", cor: "#d97706" },
  { value: "licenca_gestante", label: "Licença Gestante", icon: "🤰", cor: "#ec4899" },
  { value: "crenca_religiosa", label: "Lei Federal nº 13.796/2018 — Crença Religiosa", icon: "🙏", cor: "#8b5cf6" },
  { value: "estudante_atleta", label: "Estudante Atleta / Representação Oficial — País ou DF", icon: "🏅", cor: "#0891b2" },
  { value: "atividade_remota", label: "Atividade Remota (COVID-19)", icon: "💻", cor: "#6366f1" },
  { value: "intercambio", label: "Intercâmbio — Decreto nº 47.210 de 09/05/2025", icon: "✈️", cor: "#0d9488" },
];

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function Atestados() {
  const escolaId = localStorage.getItem("escola_id");
  const perfil = String(localStorage.getItem("perfil") || "").toLowerCase();
  const canRegister = ["diretor", "vice_diretor", "coordenador", "secretaria"].includes(perfil);

  // ── Estado ─────────────────────────────────
  const [turmas, setTurmas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [alunos, setAlunos] = useState([]);
  const [justificativas, setJustificativas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroAluno, setFiltroAluno] = useState("");

  // ── Form state ─────────────────────────────
  const [form, setForm] = useState({
    aluno_id: "",
    tipo: "",
    data_inicio: "",
    data_fim: "",
    observacao: "",
    dias: 1,
  });

  // ── Carregar turmas ────────────────────────
  useEffect(() => {
    if (!escolaId) return;
    api.get("/api/turmas", { params: { escola_id: escolaId } })
      .then(r => setTurmas(r.data || []))
      .catch(() => {});
  }, [escolaId]);

  // ── Carregar alunos da turma ───────────────
  useEffect(() => {
    if (!turmaId) { setAlunos([]); return; }
    api.get("/api/alunos", { params: { turma_id: turmaId } })
      .then(r => setAlunos(r.data || []))
      .catch(() => {});
  }, [turmaId]);

  // ── Carregar justificativas ────────────────
  const carregarJustificativas = useCallback(async () => {
    if (!escolaId) return;
    setLoading(true);
    try {
      const params = { escola_id: escolaId };
      if (turmaId) params.turma_id = turmaId;
      if (filtroTipo) params.tipo = filtroTipo;
      const r = await api.get("/api/frequencia/justificativas", { params });
      setJustificativas(r.data || []);
    } catch {
      setJustificativas([]);
    } finally {
      setLoading(false);
    }
  }, [escolaId, turmaId, filtroTipo]);

  useEffect(() => { carregarJustificativas(); }, [carregarJustificativas]);

  // ── Registrar justificativa ────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.aluno_id || !form.tipo || !form.data_inicio || !form.data_fim) return;
    try {
      await api.post("/api/frequencia/justificativas", {
        ...form,
        escola_id: escolaId,
        turma_id: turmaId,
      });
      setShowModal(false);
      setForm({ aluno_id: "", tipo: "", data_inicio: "", data_fim: "", observacao: "", dias: 1 });
      carregarJustificativas();
    } catch (err) {
      alert("Erro ao registrar: " + (err.response?.data?.error || err.message));
    }
  };

  // Calcular dias automaticamente
  useEffect(() => {
    if (form.data_inicio && form.data_fim) {
      const d1 = new Date(form.data_inicio);
      const d2 = new Date(form.data_fim);
      const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      setForm(f => ({ ...f, dias: diff }));
    }
  }, [form.data_inicio, form.data_fim]);

  // ── Info do tipo selecionado ───────────────
  const getTypeInfo = (val) => TIPOS_JUSTIFICATIVA.find(t => t.value === val);

  // Filtrar justificativas por aluno
  const justificativasFiltradas = justificativas.filter(j => {
    if (filtroAluno) {
      const nome = (j.aluno_nome || "").toLowerCase();
      if (!nome.includes(filtroAluno.toLowerCase())) return false;
    }
    return true;
  });

  // Estatísticas
  const stats = {
    total: justificativas.length,
    medico: justificativas.filter(j => j.tipo === "atestado_medico").length,
    acompanhamento: justificativas.filter(j => j.tipo === "atestado_acompanhamento").length,
    outros: justificativas.filter(j => !["atestado_medico", "atestado_acompanhamento"].includes(j.tipo)).length,
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* ═══ HEADER ═══ */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f766e 100%)",
        borderRadius: 16,
        padding: "28px 32px",
        marginBottom: 24,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
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
          }}>📋</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Atestados e Justificativas
            </h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: "0.88rem", marginTop: 2 }}>
              Registro e acompanhamento de justificativas de faltas dos estudantes
            </p>
          </div>
        </div>
      </div>

      {/* ═══ CARDS ESTATÍSTICAS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Registros", value: stats.total, icon: "📊", gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
          { label: "Atestados Médicos", value: stats.medico, icon: "🏥", gradient: "linear-gradient(135deg, #ef4444, #dc2626)" },
          { label: "Acompanhamento", value: stats.acompanhamento, icon: "👨‍⚕️", gradient: "linear-gradient(135deg, #f97316, #ea580c)" },
          { label: "Outros", value: stats.outros, icon: "📋", gradient: "linear-gradient(135deg, #0891b2, #0e7490)" },
        ].map((card, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: 14, padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: card.gradient, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: "#fff", flexShrink: 0,
            }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ FILTROS + BOTÃO ═══ */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "18px 24px", marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
        display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center",
      }}>
        <select
          value={turmaId}
          onChange={e => setTurmaId(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db",
            background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 200,
            cursor: "pointer", outline: "none",
          }}
        >
          <option value="">Todas as turmas</option>
          {turmas.map(t => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>

        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db",
            background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 200,
            cursor: "pointer", outline: "none",
          }}
        >
          <option value="">Todos os tipos</option>
          {TIPOS_JUSTIFICATIVA.map(t => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="🔍 Buscar aluno..."
          value={filtroAluno}
          onChange={e => setFiltroAluno(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db",
            background: "#f8fafc", fontSize: "0.88rem", flex: 1, minWidth: 180,
            outline: "none",
          }}
        />

        {canRegister && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #0f766e, #059669)",
              color: "#fff", fontWeight: 700, fontSize: "0.88rem",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 2px 8px rgba(15,118,110,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.target.style.transform = "translateY(0)"}
          >
            <span style={{ fontSize: 18 }}>+</span> Registrar Justificativa
          </button>
        )}
      </div>

      {/* ═══ TABELA DE JUSTIFICATIVAS ═══ */}
      <div style={{
        background: "#fff", borderRadius: 14, overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite" }}>⏳</div>
            Carregando justificativas...
          </div>
        ) : justificativasFiltradas.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📋</div>
            <p style={{ fontWeight: 600, fontSize: "1.05rem" }}>Nenhuma justificativa registrada</p>
            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {canRegister
                ? "Clique em \"Registrar Justificativa\" para adicionar"
                : "Aguardando registros da coordenação/direção"}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["Aluno", "Turma", "Tipo", "Período", "Dias", "Observação", "Registrado por", "Data Registro"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left", fontSize: "0.75rem",
                      fontWeight: 700, color: "#475569", textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {justificativasFiltradas.map((j, i) => {
                  const typeInfo = getTypeInfo(j.tipo);
                  return (
                    <tr key={j.id || i} style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b", fontSize: "0.88rem" }}>
                        {j.aluno_nome || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "0.85rem" }}>
                        {j.turma_nome || "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: `${typeInfo?.cor || "#6b7280"}15`,
                          color: typeInfo?.cor || "#6b7280",
                          padding: "4px 10px", borderRadius: 8, fontSize: "0.78rem",
                          fontWeight: 700, whiteSpace: "nowrap",
                        }}>
                          <span>{typeInfo?.icon || "📋"}</span>
                          {typeInfo?.label || j.tipo}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#475569", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {j.data_inicio ? new Date(j.data_inicio).toLocaleDateString("pt-BR") : "—"}
                        {" → "}
                        {j.data_fim ? new Date(j.data_fim).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{
                          background: "#dbeafe", color: "#1d4ed8",
                          padding: "3px 10px", borderRadius: 8, fontWeight: 700,
                          fontSize: "0.82rem",
                        }}>{j.dias || 1}</span>
                      </td>
                      <td style={{
                        padding: "14px 16px", color: "#64748b", fontSize: "0.82rem",
                        maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {j.observacao || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "0.82rem" }}>
                        {j.registrado_por_nome || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {j.criado_em ? new Date(j.criado_em).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ MODAL PREMIUM — Registrar Justificativa ═══ */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 9999, padding: 20,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 620,
            maxHeight: "90vh", overflow: "auto",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            animation: "slideUp 0.3s ease",
          }}>
            {/* Header do modal */}
            <div style={{
              background: "linear-gradient(135deg, #1e3a5f, #0f766e)",
              padding: "24px 28px", borderRadius: "20px 20px 0 0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(255,255,255,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>📋</div>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", margin: 0 }}>
                    Registrar Justificativa
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", margin: 0, marginTop: 2 }}>
                    Preencha os dados da justificativa de falta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
                  width: 36, height: 36, cursor: "pointer", color: "#fff",
                  fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.25)"}
                onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.15)"}
              >✕</button>
            </div>

            {/* Body do modal */}
            <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
              {/* Turma + Aluno */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>
                    Turma *
                  </label>
                  <select
                    value={turmaId}
                    onChange={e => setTurmaId(e.target.value)}
                    required
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10,
                      border: "1.5px solid #d1d5db", background: "#f9fafb",
                      fontSize: "0.88rem", fontWeight: 600, outline: "none",
                    }}
                  >
                    <option value="">Selecione...</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>
                    Aluno *
                  </label>
                  <select
                    value={form.aluno_id}
                    onChange={e => setForm(f => ({ ...f, aluno_id: e.target.value }))}
                    required
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10,
                      border: "1.5px solid #d1d5db", background: "#f9fafb",
                      fontSize: "0.88rem", fontWeight: 600, outline: "none",
                    }}
                  >
                    <option value="">Selecione a turma primeiro</option>
                    {alunos.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo de Justificativa */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 10, display: "block" }}>
                  Tipo de Justificativa *
                </label>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                }}>
                  {TIPOS_JUSTIFICATIVA.map(tipo => (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: tipo.value }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 10,
                        border: form.tipo === tipo.value
                          ? `2px solid ${tipo.cor}`
                          : "1.5px solid #e5e7eb",
                        background: form.tipo === tipo.value
                          ? `${tipo.cor}10`
                          : "#fff",
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                        transform: form.tipo === tipo.value ? "scale(1.02)" : "scale(1)",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{tipo.icon}</span>
                      <span style={{
                        fontSize: "0.76rem", fontWeight: 600,
                        color: form.tipo === tipo.value ? tipo.cor : "#374151",
                        lineHeight: 1.3,
                      }}>{tipo.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Período + Dias */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>
                    Data Início *
                  </label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                    required
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10,
                      border: "1.5px solid #d1d5db", background: "#f9fafb",
                      fontSize: "0.88rem", fontWeight: 600, outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    value={form.data_fim}
                    onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                    required
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10,
                      border: "1.5px solid #d1d5db", background: "#f9fafb",
                      fontSize: "0.88rem", fontWeight: 600, outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>
                    Dias
                  </label>
                  <div style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid #dbeafe", background: "#eff6ff",
                    fontSize: "1rem", fontWeight: 800, color: "#1d4ed8",
                    textAlign: "center",
                  }}>{form.dias}</div>
                </div>
              </div>

              {/* Observação */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>
                  Observação
                </label>
                <textarea
                  value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="CID, nome do médico, detalhes adicionais..."
                  rows={3}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid #d1d5db", background: "#f9fafb",
                    fontSize: "0.88rem", fontWeight: 500, outline: "none",
                    resize: "vertical", fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Botões */}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "10px 24px", borderRadius: 10,
                    border: "1.5px solid #d1d5db", background: "#fff",
                    fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
                    color: "#6b7280",
                  }}
                >Cancelar</button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 28px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #0f766e, #059669)",
                    color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                    cursor: "pointer", boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
                  }}
                >Registrar Justificativa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ CSS Animations ═══ */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
