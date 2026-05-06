// src/features/frequencia/BuscaAtiva.jsx
// ============================================================================
// Módulo FREQUÊNCIA — Busca Ativa
// Registra os contatos que a coordenação/direção fez com as famílias
// de alunos com muitas faltas (antes de encaminhar ao Conselho Tutelar).
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

const MEIOS_CONTATO = [
  { value: "telefone", label: "Telefone", icon: "📞" },
  { value: "whatsapp", label: "WhatsApp", icon: "💬" },
  { value: "visita_domiciliar", label: "Visita Domiciliar", icon: "🏠" },
  { value: "reuniao_escola", label: "Reunião na Escola", icon: "🤝" },
  { value: "carta", label: "Carta / Ofício", icon: "✉️" },
  { value: "email", label: "E-mail", icon: "📧" },
];

const RESULTADOS_CONTATO = [
  { value: "sucesso", label: "Contato realizado com sucesso", cor: "#16a34a" },
  { value: "sem_resposta", label: "Sem resposta", cor: "#d97706" },
  { value: "numero_invalido", label: "Número inválido / desatualizado", cor: "#dc2626" },
  { value: "compromisso_retorno", label: "Família se comprometeu com retorno", cor: "#2563eb" },
  { value: "recusa", label: "Família recusou atendimento", cor: "#7c3aed" },
];

const ANO_LETIVO = String(new Date().getFullYear());

// Retorna a data de hoje como string 'YYYY-MM-DD' no fuso local (evita bug UTC -3h)
const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Formata 'YYYY-MM-DD' ou ISO para 'DD/MM/YYYY' sem passar pelo objeto Date (evita bug UTC)
const fmtDataBR = (str) => {
  if (!str) return '';
  const s = String(str).split('T')[0];
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}/${m}/${y}` : str;
};

export default function BuscaAtiva() {
  const escolaId = localStorage.getItem("escola_id");
  const perfil = String(localStorage.getItem("perfil") || "").toLowerCase();
  const canRegister = ["diretor", "vice_diretor", "coordenador", "secretaria", "supervisor"].includes(perfil);

  const [registros, setRegistros] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [turno, setTurno] = useState("");
  const [turmas, setTurmas] = useState([]);
  const [turmasFiltradas, setTurmasFiltradas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  // ── Exclusão ───────────────────────────────────
  const [excluindoId, setExcluindoId] = useState(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);

  // ── Edição ──────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [erroEditModal, setErroEditModal] = useState("");
  const [editForm, setEditForm] = useState({
    data_contato: "", meio_contato: "", resultado: "", observacao: "",
  });

  // ── Modal state (independente dos filtros da página) ──
  const [modalTurmaId, setModalTurmaId] = useState("");
  const [modalAlunos, setModalAlunos] = useState([]);

  const [form, setForm] = useState({
    aluno_id: "", meio_contato: "", resultado: "", observacao: "", data_contato: hojeLocal(),
  });

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

  // ── Carregar alunos do MODAL ───────────────
  useEffect(() => {
    if (!modalTurmaId) { setModalAlunos([]); return; }
    api.get(`/turmas/${modalTurmaId}/alunos`)
      .then(r => setModalAlunos(r.data?.alunos || r.data || []))
      .catch(() => setModalAlunos([]));
  }, [modalTurmaId]);

  const carregarRegistros = useCallback(async () => {
    if (!escolaId) return;
    setLoading(true);
    try {
      const params = { escola_id: escolaId };
      if (turmaId) params.turma_id = turmaId;
      const r = await api.get("/frequencia/busca-ativa", { params });
      setRegistros(r.data || []);
    } catch {
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, [escolaId, turmaId]);

  useEffect(() => { carregarRegistros(); }, [carregarRegistros]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.aluno_id || !form.meio_contato || !form.resultado) return;
    setSalvando(true);
    setErroModal("");
    try {
      await api.post("/frequencia/busca-ativa", {
        ...form,
        escola_id: escolaId,
        turma_id: modalTurmaId,
      });
      setShowModal(false);
      setForm({ aluno_id: "", meio_contato: "", resultado: "", observacao: "", data_contato: hojeLocal() });
      setModalTurmaId("");
      setModalAlunos([]);
      carregarRegistros();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      if (status === 409) {
        setErroModal("⚠️ " + msg);
      } else {
        setErroModal("❌ Erro ao registrar: " + msg);
      }
    } finally {
      setSalvando(false);
    }
  };

  // ── Exclusão ─────────────────────────────────
  const confirmarExclusao = (registro) => {
    setItemParaExcluir(registro);
    setConfirmandoExclusao(true);
  };

  const executarExclusao = async () => {
    if (!itemParaExcluir) return;
    setExcluindoId(itemParaExcluir.id);
    try {
      await api.delete(`/frequencia/busca-ativa/${itemParaExcluir.id}`);
      setConfirmandoExclusao(false);
      setItemParaExcluir(null);
      carregarRegistros();
    } catch (err) {
      alert("Erro ao excluir: " + (err.response?.data?.error || err.message));
    } finally {
      setExcluindoId(null);
    }
  };

  // ── Edição ──────────────────────────────────────────────
  const abrirEdicao = (registro) => {
    setEditItem(registro);
    setEditForm({
      data_contato: String(registro.data_contato || "").split("T")[0],
      meio_contato: registro.meio_contato || "",
      resultado: registro.resultado || "",
      observacao: registro.observacao || "",
    });
    setErroEditModal("");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.meio_contato || !editForm.resultado) return;
    setSalvandoEdit(true);
    setErroEditModal("");
    try {
      await api.put(`/frequencia/busca-ativa/${editItem.id}`, editForm);
      setShowEditModal(false);
      setEditItem(null);
      carregarRegistros();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setErroEditModal("\u274c Erro ao editar: " + msg);
    } finally {
      setSalvandoEdit(false);
    }
  };

  const getMeioInfo = (val) => MEIOS_CONTATO.find(m => m.value === val);
  const getResultadoInfo = (val) => RESULTADOS_CONTATO.find(r => r.value === val);

  // Agrupar tentativas por aluno
  const contagemPorAluno = {};
  registros.forEach(r => {
    if (!contagemPorAluno[r.aluno_id]) contagemPorAluno[r.aluno_id] = 0;
    contagemPorAluno[r.aluno_id]++;
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
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
          }}>🔍</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Busca Ativa</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: "0.88rem", marginTop: 2 }}>
              Registro de contatos com famílias de alunos faltosos
            </p>
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Contatos", value: registros.length, icon: "📞", gradient: "linear-gradient(135deg, #d97706, #b45309)" },
          { label: "Alunos em Busca", value: Object.keys(contagemPorAluno).length, icon: "👤", gradient: "linear-gradient(135deg, #dc2626, #b91c1c)" },
          { label: "Com Sucesso", value: registros.filter(r => r.resultado === "sucesso").length, icon: "✅", gradient: "linear-gradient(135deg, #16a34a, #15803d)" },
          { label: "Sem Resposta", value: registros.filter(r => r.resultado === "sem_resposta").length, icon: "⏳", gradient: "linear-gradient(135deg, #6366f1, #4f46e5)" },
        ].map((card, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: 14, padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: card.gradient,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "18px 24px", marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
        display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center",
      }}>
        <select
          value={turno} onChange={e => setTurno(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 160 }}
        >
          <option value="">Todos os turnos</option>
          {turnos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={turmaId} onChange={e => setTurmaId(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 200 }}
        >
          <option value="">Todas as turmas ({turmasFiltradas.length})</option>
          {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.turma || t.nome}</option>)}
        </select>

        {canRegister && (
          <button
            onClick={() => {
              setForm({ aluno_id: "", meio_contato: "", resultado: "", observacao: "", data_contato: hojeLocal() });
              setModalTurmaId("");
              setModalAlunos([]);
              setErroModal("");
              setShowModal(true);
            }}
            style={{
              marginLeft: "auto",
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #b45309, #d97706)",
              color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 2px 8px rgba(180,83,9,0.3)",
            }}
          >
            <span style={{ fontSize: 18 }}>+</span> Registrar Contato
          </button>
        )}
      </div>

      {/* Timeline */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "24px 28px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Carregando...</div>
        ) : registros.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🔍</div>
            <p style={{ fontWeight: 600, fontSize: "1.05rem" }}>Nenhum registro de busca ativa</p>
            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
              Registre contatos com famílias de alunos faltosos
            </p>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* Linha vertical da timeline */}
            <div style={{
              position: "absolute", left: 20, top: 0, bottom: 0, width: 2,
              background: "linear-gradient(to bottom, #d97706, #fbbf24, #d1d5db)",
            }} />

            {registros.map((r, i) => {
              const meio = getMeioInfo(r.meio_contato);
              const resultado = getResultadoInfo(r.resultado);
              return (
                <div key={r.id || i} style={{
                  display: "flex", gap: 20, marginBottom: 24, position: "relative",
                  paddingLeft: 48,
                }}>
                  {/* Dot */}
                  <div style={{
                    position: "absolute", left: 12, top: 4,
                    width: 18, height: 18, borderRadius: "50%",
                    background: resultado?.cor || "#6b7280",
                    border: "3px solid #fff",
                    boxShadow: `0 0 0 2px ${resultado?.cor || "#6b7280"}30`,
                  }} />

                  {/* Card */}
                  <div style={{
                    flex: 1, background: "#f8fafc", borderRadius: 12,
                    padding: "16px 20px", border: "1px solid #e5e7eb",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                          {r.aluno_nome || "Aluno"}
                        </span>
                        <span style={{
                          background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px",
                          borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
                        }}>{r.turma_nome || ""}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                          {fmtDataBR(r.data_contato)}
                        </span>
                        {canRegister && (
                          <>
                            <button
                              onClick={() => abrirEdicao(r)}
                              title="Editar registro"
                              style={{
                                padding: "4px 10px", borderRadius: 8, border: "1.5px solid #c7d2fe",
                                background: "#fff", color: "#4f46e5", fontSize: "0.75rem",
                                fontWeight: 600, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 4,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#eef2ff"; e.currentTarget.style.borderColor = "#4f46e5"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#c7d2fe"; }}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => confirmarExclusao(r)}
                              disabled={excluindoId === r.id}
                              title="Excluir registro"
                              style={{
                                padding: "4px 10px", borderRadius: 8, border: "1.5px solid #fecaca",
                                background: "#fff", color: "#dc2626", fontSize: "0.75rem",
                                fontWeight: 600, cursor: excluindoId === r.id ? "not-allowed" : "pointer",
                                opacity: excluindoId === r.id ? 0.5 : 1,
                              display: "flex", alignItems: "center", gap: 4,
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { if (excluindoId !== r.id) { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#dc2626"; }}}
                            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#fecaca"; }}
                          >
                            🗑️ Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: "#f1f5f9", padding: "4px 10px", borderRadius: 8,
                        fontSize: "0.78rem", fontWeight: 600, color: "#475569",
                      }}>{meio?.icon} {meio?.label || r.meio_contato}</span>

                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: `${resultado?.cor || "#6b7280"}12`,
                        color: resultado?.cor || "#6b7280",
                        padding: "4px 10px", borderRadius: 8,
                        fontSize: "0.78rem", fontWeight: 700,
                      }}>{resultado?.label || r.resultado}</span>
                    </div>

                    {r.observacao && (
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5 }}>
                        {r.observacao}
                      </p>
                    )}
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                        📝 Registrado por: {r.registrado_por_nome || "—"}
                      </span>
                      {r.editado_por_nome && (
                        <span style={{ fontSize: "0.72rem", color: "#6366f1", fontWeight: 600 }}>
                          ✏️ Editado por: {r.editado_por_nome} · {fmtDataBR(r.editado_em)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Registrar Contato */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 9999, padding: 20,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560,
            maxHeight: "90vh", overflow: "auto",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            animation: "slideUp 0.3s ease",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #b45309, #d97706)",
              padding: "24px 28px", borderRadius: "20px 20px 0 0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(255,255,255,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>🔍</div>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", margin: 0 }}>
                    Registrar Contato
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", margin: 0, marginTop: 2 }}>
                    Busca ativa — contato com a família
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
                  width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "28px" }}>

              {/* Erro / duplicata */}
              {erroModal && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 20,
                  background: erroModal.startsWith("⚠️") ? "#fffbeb" : "#fef2f2",
                  border: `1.5px solid ${erroModal.startsWith("⚠️") ? "#fde68a" : "#fecaca"}`,
                  color: erroModal.startsWith("⚠️") ? "#92400e" : "#991b1b",
                  fontSize: "0.85rem", fontWeight: 600,
                }}>{erroModal}</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Turma *</label>
                  <select value={modalTurmaId} onChange={e => { setModalTurmaId(e.target.value); setForm(f => ({ ...f, aluno_id: "" })); }} required style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600,
                  }}>
                    <option value="">Selecione...</option>
                    {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.turma || t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Aluno *</label>
                  <select value={form.aluno_id} onChange={e => setForm(f => ({ ...f, aluno_id: e.target.value }))} required style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600,
                  }}>
                    <option value="">Selecione a turma primeiro</option>
                    {modalAlunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Data do Contato *</label>
                  <input type="date" value={form.data_contato} onChange={e => setForm(f => ({ ...f, data_contato: e.target.value }))} required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Meio de Contato *</label>
                  <select value={form.meio_contato} onChange={e => setForm(f => ({ ...f, meio_contato: e.target.value }))} required style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600,
                  }}>
                    <option value="">Selecione...</option>
                    {MEIOS_CONTATO.map(m => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 8, display: "block" }}>Resultado *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {RESULTADOS_CONTATO.map(r => (
                    <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, resultado: r.value }))} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 10,
                      border: form.resultado === r.value ? `2px solid ${r.cor}` : "1.5px solid #e5e7eb",
                      background: form.resultado === r.value ? `${r.cor}10` : "#fff",
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: form.resultado === r.value ? r.cor : "#d1d5db",
                        transition: "background 0.15s",
                      }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: form.resultado === r.value ? r.cor : "#374151" }}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Observação</label>
                <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Detalhes da conversa, compromissos firmados..."
                  rows={3}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 500, resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: "10px 24px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", color: "#6b7280",
                }}>Cancelar</button>
                <button type="submit" disabled={salvando} style={{
                  padding: "10px 28px", borderRadius: 10, border: "none",
                  background: salvando ? "#9ca3af" : "linear-gradient(135deg, #b45309, #d97706)",
                  color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                  cursor: salvando ? "not-allowed" : "pointer",
                  boxShadow: salvando ? "none" : "0 2px 8px rgba(180,83,9,0.3)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>{salvando ? "⏳ Salvando..." : "✅ Registrar Contato"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL — Confirmar Exclusão ═══ */}
      {confirmandoExclusao && itemParaExcluir && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 10000, padding: 20,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440,
            boxShadow: "0 25px 50px rgba(0,0,0,0.2)", overflow: "hidden",
            animation: "slideUp 0.3s ease",
          }}>
            <div style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🗑️</div>
              <div>
                <h3 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: 0 }}>Confirmar Exclusão</h3>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", margin: 0, marginTop: 2 }}>Essa ação não pode ser desfeita</p>
              </div>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <p style={{ color: "#374151", fontSize: "0.95rem", margin: "0 0 8px", fontWeight: 600 }}>
                Deseja excluir o contato abaixo?
              </p>
              <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginTop: 12 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: "0.88rem" }}>{itemParaExcluir.aluno_nome}</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#6b7280" }}>
                  {getMeioInfo(itemParaExcluir.meio_contato)?.label || itemParaExcluir.meio_contato}
                  &nbsp;·&nbsp;
                  {getResultadoInfo(itemParaExcluir.resultado)?.label || itemParaExcluir.resultado}
                  &nbsp;·&nbsp;
                  {fmtDataBR(itemParaExcluir.data_contato)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button onClick={() => { setConfirmandoExclusao(false); setItemParaExcluir(null); }} style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #d1d5db",
                  background: "#fff", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", color: "#6b7280",
                }}>Cancelar</button>
                <button onClick={executarExclusao} disabled={!!excluindoId} style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "none",
                  background: excluindoId ? "#9ca3af" : "linear-gradient(135deg, #dc2626, #b91c1c)",
                  color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                  cursor: excluindoId ? "not-allowed" : "pointer",
                  boxShadow: excluindoId ? "none" : "0 2px 8px rgba(220,38,38,0.35)",
                }}>
                  {excluindoId ? "⏳ Excluindo..." : "🗑️ Confirmar Exclusão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL — Editar Contato ═══ */}
      {showEditModal && editItem && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 9999, padding: 20,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520,
            maxHeight: "90vh", overflow: "auto",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            animation: "slideUp 0.3s ease",
          }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              padding: "24px 28px", borderRadius: "20px 20px 0 0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(255,255,255,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>✏️</div>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>Editar Contato</h2>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", margin: 0, marginTop: 2 }}>
                    {editItem.aluno_nome} · {editItem.turma_nome}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{
                background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
                width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: "28px" }}>
              {erroEditModal && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 20,
                  background: "#fef2f2", border: "1.5px solid #fecaca",
                  color: "#991b1b", fontSize: "0.85rem", fontWeight: 600,
                }}>{erroEditModal}</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Data do Contato *</label>
                  <input type="date" value={editForm.data_contato}
                    onChange={e => setEditForm(f => ({ ...f, data_contato: e.target.value }))} required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Meio de Contato *</label>
                  <select value={editForm.meio_contato}
                    onChange={e => setEditForm(f => ({ ...f, meio_contato: e.target.value }))} required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600 }}>
                    <option value="">Selecione...</option>
                    {MEIOS_CONTATO.map(m => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 8, display: "block" }}>Resultado *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {RESULTADOS_CONTATO.map(res => (
                    <button key={res.value} type="button" onClick={() => setEditForm(f => ({ ...f, resultado: res.value }))} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 10,
                      border: editForm.resultado === res.value ? `2px solid ${res.cor}` : "1.5px solid #e5e7eb",
                      background: editForm.resultado === res.value ? `${res.cor}10` : "#fff",
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: editForm.resultado === res.value ? res.cor : "#d1d5db", transition: "background 0.15s" }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: editForm.resultado === res.value ? res.cor : "#374151" }}>{res.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Observação</label>
                <textarea value={editForm.observacao}
                  onChange={e => setEditForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Detalhes da conversa, compromissos firmados..."
                  rows={3}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{
                  padding: "10px 24px", borderRadius: 10, border: "1.5px solid #d1d5db",
                  background: "#fff", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", color: "#6b7280",
                }}>Cancelar</button>
                <button type="submit" disabled={salvandoEdit} style={{
                  padding: "10px 28px", borderRadius: 10, border: "none",
                  background: salvandoEdit ? "#9ca3af" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                  cursor: salvandoEdit ? "not-allowed" : "pointer",
                  boxShadow: salvandoEdit ? "none" : "0 2px 8px rgba(79,70,229,0.3)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>{salvandoEdit ? "⏳ Salvando..." : "✅ Salvar Alterações"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
