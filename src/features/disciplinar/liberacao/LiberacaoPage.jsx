// ============================================================================
// LiberacaoPage.jsx — Liberação Antecipada de Alunos
// Módulo Disciplinar — Design premium
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
const ANO = String(new Date().getFullYear());

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return (
    dt.toLocaleDateString("pt-BR") +
    " " +
    dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
};

const PARENTESCO_MAP = {
  PAI: "Pai",
  MAE: "Mãe",
  RESPONSAVEL: "Responsável",
  AVO: "Avô/Avó",
  TIO: "Tio/Tia",
  IRMAO: "Irmão/Irmã",
  OUTRO: "Outro",
};

const MOTIVOS = [
  "Consulta médica",
  "Problema de saúde",
  "Emergência familiar",
  "Compromisso profissional dos responsáveis",
  "Viagem",
  "Outro motivo",
];

function Toast({ m, t, onClose }) {
  useEffect(() => {
    const x = setTimeout(onClose, 3800);
    return () => clearTimeout(x);
  }, [onClose]);
  const isErr = t === "err";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        background: isErr
          ? "linear-gradient(135deg,#dc2626,#b91c1c)"
          : "linear-gradient(135deg,#059669,#10b981)",
        color: "#fff",
        padding: "14px 22px",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        fontSize: 14,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 260,
      }}
    >
      <span style={{ fontSize: 18 }}>{isErr ? "❌" : "✅"}</span>
      {m}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: NOVA LIBERAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
function ModalNovaLiberacao({ onClose, onSaved, toastErr }) {
  // Step 1: Buscar aluno | Step 2: Confirmar responsável | Step 3: Formulário
  const [step, setStep] = useState(1);
  const [turno, setTurno] = useState("");
  const [turmas, setTurmas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [turmaNome, setTurmaNome] = useState("");
  const [busca, setBusca] = useState("");
  const [alunos, setAlunos] = useState([]);
  const [alunoSel, setAlunoSel] = useState(null);
  const [responsaveis, setResponsaveis] = useState([]);
  const [responsavelSel, setResponsavelSel] = useState(null);
  const [avulso, setAvulso] = useState(false);
  const [avulsoNome, setAvulsoNome] = useState("");
  const [avulsoParentesco, setAvulsoParentesco] = useState("RESPONSAVEL");
  const [avulsoTelefone, setAvulsoTelefone] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const buscaRef = useRef(null);

  // Carregar turmas ao selecionar turno
  useEffect(() => {
    if (!turno) return;
    const escolaId = localStorage.getItem("escola_id") || 1;
    api
      .get("/api/turmas", { params: { escola_id: escolaId } })
      .then((r) => {
        const data = (r.data || []).filter(
          (t) => String(t.ano) === ANO && (!turno || t.turno === turno)
        );
        setTurmas(data.sort((a, b) => (a.turma || "").localeCompare(b.turma || "", "pt-BR")));
      })
      .catch(() => setTurmas([]));
  }, [turno]);

  // Carregar alunos
  useEffect(() => {
    if (!turmaId) {
      setAlunos([]);
      return;
    }
    api
      .get("/api/disciplinar-liberacoes/buscar-alunos", {
        params: { turno, turma_id: turmaId, nome: busca },
      })
      .then((r) => setAlunos(r.data || []))
      .catch(() => setAlunos([]));
  }, [turmaId, busca, turno]);

  // Carregar responsáveis ao selecionar aluno
  useEffect(() => {
    if (!alunoSel) {
      setResponsaveis([]);
      return;
    }
    api
      .get(`/api/disciplinar-liberacoes/responsaveis-aluno/${alunoSel.id}`)
      .then((r) => setResponsaveis(r.data || []))
      .catch(() => setResponsaveis([]));
  }, [alunoSel]);

  const selecionarAluno = (a) => {
    setAlunoSel(a);
    setResponsavelSel(null);
    setAvulso(false);
    setStep(2);
  };

  const handleSave = async () => {
    if (!motivo) return toastErr("Informe o motivo da liberação.");
    if (!avulso && !responsavelSel)
      return toastErr("Selecione o responsável ou informe os dados de quem está retirando.");
    if (avulso && !avulsoNome) return toastErr("Informe o nome de quem está retirando.");

    setSaving(true);
    try {
      await api.post("/api/disciplinar-liberacoes", {
        aluno_id: alunoSel.id,
        turma_id: alunoSel.turma_id,
        motivo,
        observacao,
        responsavel_cadastrado_id: avulso ? null : responsavelSel?.id,
        responsavel_nome_avulso: avulso ? avulsoNome : null,
        responsavel_parentesco_avulso: avulso ? avulsoParentesco : null,
        responsavel_telefone_avulso: avulso ? avulsoTelefone || null : null,
      });
      onSaved();
    } catch (e) {
      toastErr(e?.response?.data?.error || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const BD = "linear-gradient(135deg,#059669,#047857)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.78)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 22,
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          overflow: "auto",
          boxShadow: "0 28px 70px rgba(0,0,0,0.28)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: BD,
            padding: "22px 28px",
            borderRadius: "22px 22px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              🚪 NOVA LIBERAÇÃO ANTECIPADA
            </div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 18, fontWeight: 800 }}>
              {step === 1
                ? "Localizar Estudante"
                : step === 2
                ? "Confirmar Responsável"
                : "Registro de Saída"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 10,
              width: 36,
              height: 36,
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Steps indicator */}
        <div
          style={{
            display: "flex",
            padding: "12px 28px",
            gap: 8,
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {["Localizar Aluno", "Responsável", "Confirmar"].map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flex: 1,
                opacity: i + 1 > step ? 0.4 : 1,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: i + 1 <= step ? BD : "#e2e8f0",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i + 1 < step ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "24px 28px", flex: 1, overflowY: "auto" }}>
          {/* ── STEP 1: Localizar Aluno ── */}
          {step === 1 && (
            <>
              {/* Turno */}
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#374151",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Turno *
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Matutino", "Vespertino", "Noturno"].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTurno(t);
                        setTurmaId("");
                        setTurmaNome("");
                        setAlunos([]);
                        setAlunoSel(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 6px",
                        borderRadius: 10,
                        border: `2px solid ${turno === t ? "#059669" : "#e2e8f0"}`,
                        background: turno === t ? "#ecfdf5" : "#fff",
                        color: turno === t ? "#059669" : "#64748b",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 12,
                        transition: "all 0.2s",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turma */}
              {turno && (
                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Turma *
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {turmas.length === 0 ? (
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>Nenhuma turma encontrada.</p>
                    ) : (
                      turmas.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTurmaId(t.id);
                            setTurmaNome(t.turma);
                            setAlunoSel(null);
                          }}
                          style={{
                            padding: "7px 14px",
                            borderRadius: 9,
                            border: `2px solid ${turmaId === t.id ? "#059669" : "#e2e8f0"}`,
                            background: turmaId === t.id ? "#059669" : "#fff",
                            color: turmaId === t.id ? "#fff" : "#374151",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          {t.turma}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Busca por nome */}
              {turmaId && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <input
                      ref={buscaRef}
                      type="text"
                      placeholder="🔍 Buscar por nome do estudante..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 10,
                        border: "1.5px solid #e2e8f0",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      autoFocus
                    />
                  </div>

                  <div
                    style={{
                      maxHeight: 260,
                      overflowY: "auto",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 12,
                    }}
                  >
                    {alunos.length === 0 ? (
                      <div
                        style={{
                          padding: "28px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontSize: 13,
                        }}
                      >
                        {busca ? "Nenhum aluno encontrado." : "Selecione a turma para listar os alunos."}
                      </div>
                    ) : (
                      alunos.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => selecionarAluno(a)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 16px",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            background: "#fff",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f0fdf4")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "#fff")
                          }
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: "linear-gradient(135deg,#059669,#047857)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {(a.estudante || "?")
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div>
                            <div
                              style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}
                            >
                              {a.estudante}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {a.turma_nome} • {a.turno} • RE: {a.codigo}
                            </div>
                          </div>
                          <div style={{ marginLeft: "auto", color: "#059669", fontSize: 20 }}>
                            →
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── STEP 2: Responsável ── */}
          {step === 2 && alunoSel && (
            <>
              {/* Info do aluno selecionado */}
              <div
                style={{
                  background: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
                  border: "1.5px solid #6ee7b7",
                  borderRadius: 14,
                  padding: "14px 18px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: "linear-gradient(135deg,#059669,#047857)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {(alunoSel.estudante || "?")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#064e3b", fontSize: 15 }}>
                    {alunoSel.estudante}
                  </div>
                  <div style={{ fontSize: 12, color: "#065f46" }}>
                    {alunoSel.turma_nome} • {alunoSel.turno} • RE: {alunoSel.codigo}
                  </div>
                </div>
              </div>

              {/* Responsáveis cadastrados */}
              {!avulso && (
                <>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: 10,
                    }}
                  >
                    Responsáveis Cadastrados
                  </p>
                  {responsaveis.length === 0 ? (
                    <div
                      style={{
                        background: "#fef9c3",
                        border: "1px solid #fde68a",
                        borderRadius: 10,
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "#92400e",
                        marginBottom: 14,
                      }}
                    >
                      ⚠️ Nenhum responsável cadastrado para este aluno.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginBottom: 14,
                      }}
                    >
                      {responsaveis.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setResponsavelSel(responsavelSel?.id === r.id ? null : r)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "14px 18px",
                            borderRadius: 12,
                            border: `2px solid ${responsavelSel?.id === r.id ? "#059669" : "#e2e8f0"}`,
                            background:
                              responsavelSel?.id === r.id ? "#ecfdf5" : "#fff",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background:
                                responsavelSel?.id === r.id
                                  ? "linear-gradient(135deg,#059669,#047857)"
                                  : "#f1f5f9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            👤
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}
                            >
                              {r.nome}
                            </div>
                            <div style={{ fontSize: 12, color: "#475569" }}>
                              {PARENTESCO_MAP[r.relacionamento] || r.relacionamento || "Responsável"}
                              {r.telefone_celular && ` • ${r.telefone_celular}`}
                            </div>
                          </div>
                          {responsavelSel?.id === r.id && (
                            <span
                              style={{
                                background: "#059669",
                                color: "#fff",
                                borderRadius: "50%",
                                width: 22,
                                height: 22,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Toggle avulso */}
              <button
                onClick={() => {
                  setAvulso(!avulso);
                  setResponsavelSel(null);
                }}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: 10,
                  border: `2px dashed ${avulso ? "#059669" : "#cbd5e1"}`,
                  background: avulso ? "#ecfdf5" : "#f8fafc",
                  color: avulso ? "#059669" : "#475569",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                  marginBottom: avulso ? 16 : 0,
                  transition: "all 0.2s",
                }}
              >
                {avulso ? "✓ " : ""}
                {avulso
                  ? "Informando pessoa não cadastrada"
                  : "Pessoa não cadastrada como responsável"}
              </button>

              {/* Campos avulso */}
              {avulso && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#374151",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={avulsoNome}
                      onChange={(e) => setAvulsoNome(e.target.value)}
                      placeholder="Nome completo de quem está retirando..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 9,
                        border: "1.5px solid #e2e8f0",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#fff",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#374151",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Grau de Parentesco *
                    </label>
                    <select
                      value={avulsoParentesco}
                      onChange={(e) => setAvulsoParentesco(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 9,
                        border: "1.5px solid #e2e8f0",
                        fontSize: 14,
                        outline: "none",
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    >
                      {Object.entries(PARENTESCO_MAP).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#374151",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Telefone{" "}
                      <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
                        (opcional)
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={avulsoTelefone}
                      onChange={(e) => setAvulsoTelefone(e.target.value)}
                      placeholder="(61) 9 9999-9999"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 9,
                        border: "1.5px solid #e2e8f0",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#fff",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Botões de navegação */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 20,
                  justifyContent: "space-between",
                }}
              >
                <button
                  onClick={() => {
                    setStep(1);
                    setAlunoSel(null);
                    setResponsavelSel(null);
                    setAvulso(false);
                  }}
                  style={{
                    padding: "11px 22px",
                    borderRadius: 10,
                    border: "1.5px solid #e2e8f0",
                    background: "#fff",
                    color: "#64748b",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => {
                    if (!avulso && !responsavelSel && responsaveis.length > 0) {
                      return toastErr("Selecione um responsável.");
                    }
                    if (avulso && !avulsoNome) {
                      return toastErr("Informe o nome de quem está retirando.");
                    }
                    setStep(3);
                  }}
                  style={{
                    padding: "11px 28px",
                    borderRadius: 10,
                    border: "none",
                    background: BD,
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Motivo + Confirmar ── */}
          {step === 3 && (
            <>
              {/* Resumo */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "14px 18px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "#334155",
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                  📋 Resumo
                </div>
                <div>
                  <strong>Aluno:</strong> {alunoSel?.estudante}
                </div>
                <div>
                  <strong>Turma:</strong> {alunoSel?.turma_nome} • {alunoSel?.turno}
                </div>
                <div>
                  <strong>Responsável:</strong>{" "}
                  {avulso
                    ? `${avulsoNome} (${PARENTESCO_MAP[avulsoParentesco] || avulsoParentesco})`
                    : responsavelSel?.nome ||
                      "Responsável não selecionado (nenhum cadastrado)"}
                </div>
              </div>

              {/* Motivo */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#374151",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Motivo da Liberação *
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
                  {MOTIVOS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMotivo(m)}
                      style={{
                        padding: "7px 13px",
                        borderRadius: 8,
                        border: `2px solid ${motivo === m ? "#059669" : "#e2e8f0"}`,
                        background: motivo === m ? "#ecfdf5" : "#fff",
                        color: motivo === m ? "#059669" : "#475569",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 12,
                        transition: "all 0.2s",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ou descreva o motivo..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 9,
                    border: "1.5px solid #e2e8f0",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Observação */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#374151",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Observações{" "}
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
                    (opcional)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Informações adicionais..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 9,
                    border: "1.5px solid #e2e8f0",
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Ações */}
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: "11px 22px",
                    borderRadius: 10,
                    border: "1.5px solid #e2e8f0",
                    background: "#fff",
                    color: "#64748b",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "11px 28px",
                    borderRadius: 10,
                    border: "none",
                    background: saving ? "#94a3b8" : BD,
                    color: "#fff",
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {saving ? "⏳ Salvando..." : "✅ Confirmar Liberação"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: DETALHES
// ─────────────────────────────────────────────────────────────────────────────
function ModalDetalhe({ registro, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const responsavelNome = registro.responsavel_cadastrado_id
    ? registro.responsavel_cadastrado_nome
    : registro.responsavel_nome_avulso || "—";

  const parentesco = registro.responsavel_cadastrado_id
    ? PARENTESCO_MAP[registro.responsavel_parentesco] || registro.responsavel_parentesco || "Responsável"
    : PARENTESCO_MAP[registro.responsavel_parentesco_avulso] || registro.responsavel_parentesco_avulso || "—";

  const telefone = registro.responsavel_cadastrado_id
    ? null
    : registro.responsavel_telefone_avulso;

  const BD = "linear-gradient(135deg,#059669,#047857)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.78)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 22,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 28px 70px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: BD,
            padding: "22px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              🚪 LIBERAÇÃO ANTECIPADA
            </div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 18, fontWeight: 800 }}>
              Detalhes do Registro
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 10,
              width: 36,
              height: 36,
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {/* Aluno */}
          <div
            style={{
              background: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
              border: "1.5px solid #6ee7b7",
              borderRadius: 14,
              padding: "16px 18px",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#065f46",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 8,
              }}
            >
              👤 Estudante
            </div>
            <div style={{ fontWeight: 800, color: "#064e3b", fontSize: 16 }}>
              {registro.aluno_nome}
            </div>
            <div style={{ fontSize: 13, color: "#065f46", marginTop: 2 }}>
              {registro.turma_nome} • {registro.turno} • RE: {registro.aluno_codigo}
            </div>
          </div>

          {/* Responsável */}
          <div
            style={{
              background: "#f8fafc",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 8,
              }}
            >
              {registro.responsavel_cadastrado_id ? "✅ Responsável Cadastrado" : "⚠️ Pessoa Avulsa"}
            </div>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>
              {responsavelNome}
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>
              {parentesco}
              {telefone && ` • ${telefone}`}
            </div>
          </div>

          {/* Meta */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                📅 Data / Hora Saída
              </div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
                {fmtDateTime(registro.data_hora_saida)}
              </div>
            </div>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                👮 Registrado por
              </div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
                {registro.registrado_por || "—"}
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div
            style={{
              background: "#fefce8",
              border: "1px solid #fde68a",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: registro.observacao ? 12 : 20,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#92400e",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              📝 Motivo
            </div>
            <div style={{ fontWeight: 600, color: "#78350f", fontSize: 14 }}>
              {registro.motivo}
            </div>
          </div>

          {registro.observacao && (
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#0369a1",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                💬 Observação
              </div>
              <div style={{ fontSize: 13, color: "#0c4a6e" }}>{registro.observacao}</div>
            </div>
          )}

          {/* Ações */}
          {!confirmDel ? (
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
              <button
                onClick={() => setConfirmDel(true)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1.5px solid #fca5a5",
                  background: "#fff1f1",
                  color: "#dc2626",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                🗑️ Excluir
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: BD,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Fechar
              </button>
            </div>
          ) : (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fca5a5",
                borderRadius: 10,
                padding: 14,
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, color: "#7f1d1d", fontWeight: 600 }}>
                ⚠️ Confirmar exclusão?
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirmDel(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#64748b",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Não
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true);
                    await onDelete(registro.id);
                    setDeleting(false);
                  }}
                  disabled={deleting}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: deleting ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  {deleting ? "..." : "Sim, excluir"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function LiberacaoPage() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [paginacao, setPaginacao] = useState({ total: 0, page: 1, limit: 30, totalPages: 0 });
  const [page, setPage] = useState(1);

  // Filtros do histórico
  const [filtroTurno, setFiltroTurno] = useState("");
  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [showFiltros, setShowFiltros] = useState(false);

  const ok = useCallback((m) => setToast({ m, t: "ok" }), []);
  const er = useCallback((m) => setToast({ m, t: "err" }), []);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 30);
      if (filtroTurno) params.append("turno", filtroTurno);
      if (filtroAluno) params.append("aluno_nome", filtroAluno);
      if (filtroDataInicio) params.append("data_inicio", filtroDataInicio);
      if (filtroDataFim) params.append("data_fim", filtroDataFim);

      const { data } = await api.get(`/api/disciplinar-liberacoes?${params.toString()}`);
      setRegistros(data.registros || []);
      setPaginacao(data.paginacao || {});
    } catch (e) {
      er("Erro ao carregar registros.");
    } finally {
      setLoading(false);
    }
  }, [page, filtroTurno, filtroAluno, filtroDataInicio, filtroDataFim]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  useEffect(() => {
    setPage(1);
  }, [filtroTurno, filtroAluno, filtroDataInicio, filtroDataFim]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/disciplinar-liberacoes/${id}`);
      ok("Registro excluído com sucesso.");
      setDetalhe(null);
      fetchRegistros();
    } catch (e) {
      er(e?.response?.data?.error || "Erro ao excluir.");
    }
  };

  const temFiltros = filtroTurno || filtroAluno || filtroDataInicio || filtroDataFim;

  const BD = "linear-gradient(135deg,#059669,#047857)";

  return (
    <>
      {/* CSS */}
      <style>{`
        .lib-page { font-family: 'Inter','Segoe UI',sans-serif; padding: 24px; min-height: 100vh; }
        .lib-card {
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 16px; padding: 18px 22px;
          display: flex; gap: 14px; align-items: flex-start;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .lib-card:hover {
          border-color: #059669; transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(5,150,105,0.13);
        }
        .lib-avatar {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg,#059669,#047857);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 13px; font-weight: 800; flex-shrink: 0;
        }
        .lib-name { font-size: 14px; font-weight: 800; color: #0f172a; }
        .lib-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .lib-resp { font-size: 13px; color: #374151; margin-top: 6px; }
        .lib-meta { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; align-items: center; }
        .lib-tag {
          font-size: 11px; font-weight: 700; padding: 3px 10px;
          border-radius: 7px; white-space: nowrap;
        }
        .lib-tag-green { background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
        .lib-tag-yellow { background: #fefce8; color: #92400e; border: 1px solid #fde68a; }
        .lib-tag-blue { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
        .lib-tag-orange { background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; }
        .lib-date { font-size: 12px; color: #94a3b8; font-weight: 600; }
        .lib-btn-primary {
          display: flex; align-items: center; gap: 8px;
          padding: 13px 26px; border-radius: 13px; border: none;
          background: ${BD}; color: #fff;
          font-size: 14px; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 16px rgba(5,150,105,0.30);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .lib-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(5,150,105,0.40); }
        .lib-empty { text-align: center; padding: 64px 20px; }
        .lib-empty-icon { font-size: 3.5rem; margin-bottom: 14px; opacity: 0.45; }
        .lib-empty-title { font-size: 1.1rem; font-weight: 700; color: #475569; }
        .lib-spinner-wrap { display: flex; justify-content: center; padding: 60px; }
        .lib-spinner {
          width: 40px; height: 40px; border: 3px solid #d1fae5;
          border-top-color: #059669; border-radius: 50%;
          animation: libspin 0.8s linear infinite;
        }
        @keyframes libspin { to { transform: rotate(360deg); } }
        .lib-filter-bar {
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 16px; padding: 18px 22px; margin-bottom: 20px;
        }
        .lib-filter-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr));
          gap: 12px; margin-top: 16px;
        }
        .lib-filter-label {
          font-size: 11px; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; display: block;
        }
        .lib-filter-input {
          width: 100%; padding: 9px 12px; border-radius: 9px;
          border: 1.5px solid #e2e8f0; background: #f8fafc;
          color: #1e293b; font-size: 13px; outline: none; box-sizing: border-box;
        }
        .lib-filter-input:focus { border-color: #059669; background: #fff; }
        .lib-pagination {
          display: flex; justify-content: center; align-items: center;
          gap: 8px; margin-top: 24px; padding: 16px 0;
        }
        .lib-page-btn {
          padding: 7px 18px; border-radius: 9px;
          border: 1.5px solid #e2e8f0; background: #fff;
          color: #334155; font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .lib-page-btn:hover { border-color: #059669; color: #059669; background: #ecfdf5; }
        .lib-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .lib-kpi-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr));
          gap: 14px; margin-bottom: 28px;
        }
        .lib-kpi-card {
          border-radius: 16px; padding: 18px 20px;
          display: flex; align-items: center; gap: 14px;
          color: #fff; transition: transform 0.25s;
          position: relative; overflow: hidden;
        }
        .lib-kpi-card:hover { transform: translateY(-3px); }
        .lib-kpi-card::after {
          content: ''; position: absolute; right: -16px; top: -16px;
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }
        .lib-kpi-val { font-size: 2rem; font-weight: 900; line-height: 1; }
        .lib-kpi-lbl { font-size: 0.65rem; font-weight: 700; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
      `}</style>

      {toast && (
        <Toast m={toast.m} t={toast.t} onClose={() => setToast(null)} />
      )}

      {showModal && (
        <ModalNovaLiberacao
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            ok("Liberação registrada com sucesso! ✅");
            fetchRegistros();
          }}
          toastErr={er}
        />
      )}

      {detalhe && (
        <ModalDetalhe
          registro={detalhe}
          onClose={() => setDetalhe(null)}
          onDelete={handleDelete}
        />
      )}

      <div className="lib-page">
        {/* ── HEADER ── */}
        <div
          style={{
            background: "linear-gradient(135deg,#064e3b 0%,#065f46 60%,#047857 100%)",
            borderRadius: 22,
            padding: "30px 36px",
            marginBottom: 28,
            boxShadow: "0 8px 32px rgba(6,78,59,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#6ee7b7",
                letterSpacing: "0.12em",
                marginBottom: 8,
              }}
            >
              🚪 MÓDULO DISCIPLINAR
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#fff",
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              Liberação Antecipada
            </h1>
            <p
              style={{
                color: "rgba(167,243,208,0.85)",
                margin: "8px 0 0",
                fontSize: 14,
              }}
            >
              Registro e histórico de saídas antecipadas de estudantes
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={fetchRegistros}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 16,
              }}
              title="Atualizar"
            >
              ↻
            </button>
            <button
              className="lib-btn-primary"
              onClick={() => setShowModal(true)}
              style={{ background: "rgba(255,255,255,0.15)", boxShadow: "none", border: "1.5px solid rgba(255,255,255,0.35)" }}
            >
              <span style={{ fontSize: 16 }}>+</span>
              Nova Liberação
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="lib-kpi-grid">
          {[
            {
              icon: "📊",
              val: paginacao.total || 0,
              lbl: "Total de Registros",
              bg: "linear-gradient(135deg,#6366f1,#818cf8)",
              shadow: "rgba(99,102,241,0.30)",
            },
            {
              icon: "📅",
              val: registros.filter((r) => {
                const hoje = new Date().toDateString();
                return new Date(r.data_hora_saida).toDateString() === hoje;
              }).length,
              lbl: "Liberações Hoje",
              bg: "linear-gradient(135deg,#059669,#10b981)",
              shadow: "rgba(5,150,105,0.30)",
            },
            {
              icon: "👤",
              val: registros.filter((r) => r.responsavel_cadastrado_id).length,
              lbl: "Com Responsável Cadastrado",
              bg: "linear-gradient(135deg,#0ea5e9,#38bdf8)",
              shadow: "rgba(14,165,233,0.30)",
            },
            {
              icon: "⚠️",
              val: registros.filter((r) => !r.responsavel_cadastrado_id).length,
              lbl: "Pessoa Avulsa",
              bg: "linear-gradient(135deg,#f59e0b,#fbbf24)",
              shadow: "rgba(245,158,11,0.30)",
            },
          ].map((k, i) => (
            <div
              key={i}
              className="lib-kpi-card"
              style={{ background: k.bg, boxShadow: `0 6px 24px ${k.shadow}` }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {k.icon}
              </div>
              <div>
                <div className="lib-kpi-val">{k.val}</div>
                <div className="lib-kpi-lbl">{k.lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILTROS ── */}
        <div className="lib-filter-bar">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setShowFiltros(!showFiltros)}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🔍 Filtros{" "}
              {temFiltros && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 9px",
                    borderRadius: 20,
                    background: "#d1fae5",
                    color: "#065f46",
                    fontWeight: 700,
                  }}
                >
                  ativos
                </span>
              )}
            </h3>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>
              {showFiltros ? "▲ Ocultar" : "▼ Expandir"}
            </span>
          </div>

          {showFiltros && (
            <>
              <div className="lib-filter-grid">
                <div>
                  <label className="lib-filter-label">Turno</label>
                  <select
                    className="lib-filter-input"
                    value={filtroTurno}
                    onChange={(e) => setFiltroTurno(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option>Matutino</option>
                    <option>Vespertino</option>
                    <option>Noturno</option>
                    <option>Integral</option>
                  </select>
                </div>
                <div>
                  <label className="lib-filter-label">Buscar Aluno</label>
                  <input
                    className="lib-filter-input"
                    type="text"
                    placeholder="Nome do estudante..."
                    value={filtroAluno}
                    onChange={(e) => setFiltroAluno(e.target.value)}
                  />
                </div>
                <div>
                  <label className="lib-filter-label">Data Início</label>
                  <input
                    className="lib-filter-input"
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="lib-filter-label">Data Fim</label>
                  <input
                    className="lib-filter-input"
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
              </div>
              {temFiltros && (
                <button
                  onClick={() => {
                    setFiltroTurno("");
                    setFiltroAluno("");
                    setFiltroDataInicio("");
                    setFiltroDataFim("");
                    setPage(1);
                  }}
                  style={{
                    marginTop: 12,
                    padding: "7px 16px",
                    borderRadius: 9,
                    border: "1.5px solid #fca5a5",
                    background: "#fff1f1",
                    color: "#dc2626",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✕ Limpar filtros
                </button>
              )}
            </>
          )}
        </div>

        {/* ── LISTA ── */}
        {loading ? (
          <div className="lib-spinner-wrap">
            <div className="lib-spinner" />
          </div>
        ) : registros.length === 0 ? (
          <div className="lib-empty">
            <div className="lib-empty-icon">🚪</div>
            <div className="lib-empty-title">Nenhuma liberação registrada</div>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
              {temFiltros
                ? "Ajuste os filtros para ver os registros."
                : "Clique em \"Nova Liberação\" para registrar a primeira saída antecipada."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {registros.map((r) => {
              const responsavelNome = r.responsavel_cadastrado_id
                ? r.responsavel_cadastrado_nome
                : r.responsavel_nome_avulso;
              const parentesco = r.responsavel_cadastrado_id
                ? PARENTESCO_MAP[r.responsavel_parentesco] || "Responsável"
                : PARENTESCO_MAP[r.responsavel_parentesco_avulso] || r.responsavel_parentesco_avulso;

              return (
                <div
                  key={r.id}
                  className="lib-card"
                  onClick={() => setDetalhe(r)}
                >
                  <div className="lib-avatar">
                    {(r.aluno_nome || "?")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lib-name">{r.aluno_nome}</div>
                    <div className="lib-sub">
                      {r.turma_nome} • {r.turno} • RE: {r.aluno_codigo}
                    </div>
                    {responsavelNome && (
                      <div className="lib-resp">
                        <strong>Saiu com:</strong> {responsavelNome}
                        {parentesco && ` (${parentesco})`}
                        {!r.responsavel_cadastrado_id && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              background: "#fef3c7",
                              color: "#92400e",
                              padding: "1px 6px",
                              borderRadius: 5,
                              fontWeight: 700,
                            }}
                          >
                            AVULSO
                          </span>
                        )}
                      </div>
                    )}
                    <div className="lib-meta">
                      <span className="lib-tag lib-tag-yellow">{r.motivo}</span>
                      <span className="lib-date">📅 {fmtDateTime(r.data_hora_saida)}</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, color: "#059669", fontSize: 18 }}>›</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINAÇÃO ── */}
        {paginacao.totalPages > 1 && (
          <div className="lib-pagination">
            <button
              className="lib-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              Página {paginacao.page} de {paginacao.totalPages} ({paginacao.total} registros)
            </span>
            <button
              className="lib-page-btn"
              disabled={page >= paginacao.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima →
            </button>
          </div>
        )}
        {!loading && registros.length > 0 && paginacao.totalPages <= 1 && (
          <div
            style={{
              textAlign: "center",
              padding: "12px 0",
              color: "#64748b",
              fontSize: 12,
            }}
          >
            {paginacao.total} registro{paginacao.total !== 1 ? "s" : ""} encontrado
            {paginacao.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </>
  );
}
