// ============================================================================
// ETAPA 1 — Gerar Gabaritos para Impressão
// Wizard de criação com preview e geração em lote
// ============================================================================

import React, { useState, useEffect } from "react";

const API = "http://localhost:3000/api";

export default function GabaritoGerar() {
  // ─── Dados para os selects ───
  const [turnos, setTurnos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);

  // ─── Formulário ───
  const [titulo, setTitulo] = useState("");
  const [numQuestoes, setNumQuestoes] = useState("10");
  const [numAlternativas, setNumAlternativas] = useState("5");
  const [modelo, setModelo] = useState("padrao");
  const [turnoSel, setTurnoSel] = useState("");
  const [turmaSel, setTurmaSel] = useState("");
  const [modoGeracao, setModoGeracao] = useState("turma"); // turma | turno | aluno
  const [alunoSel, setAlunoSel] = useState("");

  // ─── Loading / States ───
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Fetch Turnos ───
  useEffect(() => {
    (async () => {
      setLoadingTurnos(true);
      try {
        const resp = await fetch(`${API}/turnos`);
        if (resp.ok) setTurnos(await resp.json());
      } catch { /* empty */ }
      setLoadingTurnos(false);
    })();
  }, []);

  // ─── Fetch Turmas ───
  useEffect(() => {
    (async () => {
      setLoadingTurmas(true);
      try {
        const resp = await fetch(`${API}/turmas`);
        if (resp.ok) setTurmas(await resp.json());
      } catch { /* empty */ }
      setLoadingTurmas(false);
    })();
  }, []);

  // ─── Fetch Alunos (quando turma selecionada) ───
  useEffect(() => {
    if (!turmaSel) {
      setAlunos([]);
      setAlunoSel("");
      return;
    }
    (async () => {
      setLoadingAlunos(true);
      try {
        const resp = await fetch(`${API}/alunos?turma_id=${encodeURIComponent(turmaSel)}`);
        if (resp.ok) setAlunos(await resp.json());
      } catch { /* empty */ }
      setAlunoSel("");
      setLoadingAlunos(false);
    })();
  }, [turmaSel]);

  // ─── Gerar gabarito ───
  async function handleGerar() {
    if (!titulo.trim()) {
      showToast("Informe o título da avaliação.", "error");
      return;
    }

    setGerando(true);
    try {
      let endpoint = "";
      let body = {};

      if (modoGeracao === "aluno" && alunoSel) {
        endpoint = `${API}/gabaritos-generator/gerar-individual`;
        body = {
          aluno_codigo: alunoSel,
          turma_id: turmaSel,
          descricao: titulo,
          num_questoes: Number(numQuestoes),
          num_alternativas: Number(numAlternativas),
          modelo,
        };
      } else if (modoGeracao === "turma" && turmaSel) {
        endpoint = `${API}/gabaritos-generator/gerar/${encodeURIComponent(turmaSel)}`;
        body = {
          descricao: titulo,
          num_questoes: Number(numQuestoes),
          num_alternativas: Number(numAlternativas),
          modelo,
        };
      } else if (modoGeracao === "turno" && turnoSel) {
        // Gera para todas as turmas do turno
        endpoint = `${API}/gabaritos-generator/gerar-turno/${encodeURIComponent(turnoSel)}`;
        body = {
          descricao: titulo,
          num_questoes: Number(numQuestoes),
          num_alternativas: Number(numAlternativas),
          modelo,
        };
      } else {
        showToast("Selecione o destino da geração.", "error");
        setGerando(false);
        return;
      }

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error("Erro ao gerar");

      const data = await resp.json();
      if (data.downloadUrl) {
        window.open(`http://localhost:3000${data.downloadUrl}`, "_blank");
      }
      showToast(data.message || "Gabaritos gerados com sucesso!");
    } catch {
      showToast("Erro ao gerar gabaritos.", "error");
    }
    setGerando(false);
  }

  const turmasFiltradas = turnoSel
    ? turmas.filter((t) => t.turno === turnoSel)
    : turmas;

  const MODELOS = [
    { id: "padrao", label: "Padrão", desc: "Logo + nome + código + bolhas", icon: "📄" },
    { id: "enem", label: "ENEM", desc: "Múltiplas matérias, > 45 questões", icon: "📋" },
    { id: "simplificado", label: "Simplificado", desc: "Compacto, economia de papel", icon: "📝" },
  ];

  return (
    <>
      {toast && (
        <div className={`gab-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ═══ COLUNA ESQUERDA: Configuração ═══ */}
        <div className="gab-flex gab-flex-col gab-gap-20">

          {/* Card: Dados da Avaliação */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon cyan">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <div className="gab-card-title">Configuração da Avaliação</div>
            </div>

            <div className="gab-flex gab-flex-col gab-gap-16">
              <div className="gab-form-group">
                <label className="gab-label">Título / Descrição</label>
                <input
                  className="gab-input"
                  type="text"
                  placeholder="Ex: CEF04 – AVALIAÇÃO 2º BIMESTRE – 2025"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value.slice(0, 120))}
                  maxLength={120}
                />
              </div>

              <div className="gab-grid-2">
                <div className="gab-form-group">
                  <label className="gab-label">Nº de Questões</label>
                  <input
                    className="gab-input"
                    type="number"
                    min={5}
                    max={100}
                    value={numQuestoes}
                    onChange={(e) => setNumQuestoes(e.target.value.replace(/\D/, ""))}
                  />
                </div>
                <div className="gab-form-group">
                  <label className="gab-label">Alternativas (A-F)</label>
                  <select
                    className="gab-select"
                    value={numAlternativas}
                    onChange={(e) => setNumAlternativas(e.target.value)}
                  >
                    <option value="2">2 (A-B)</option>
                    <option value="3">3 (A-C)</option>
                    <option value="4">4 (A-D)</option>
                    <option value="5">5 (A-E)</option>
                    <option value="6">6 (A-F)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Modelo do Gabarito */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon purple">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
              </div>
              <div className="gab-card-title">Modelo do Gabarito</div>
            </div>

            <div className="gab-flex gab-flex-col gab-gap-8">
              {MODELOS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModelo(m.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: "10px",
                    border: modelo === m.id
                      ? "1px solid var(--gab-cyan)"
                      : "1px solid var(--gab-border)",
                    background: modelo === m.id
                      ? "rgba(6, 182, 212, 0.06)"
                      : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                    width: "100%",
                    fontFamily: "var(--gab-font-body)",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{m.icon}</span>
                  <div>
                    <div style={{
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: modelo === m.id ? "var(--gab-cyan-light)" : "var(--gab-text-primary)",
                    }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                      {m.desc}
                    </div>
                  </div>
                  {modelo === m.id && (
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="var(--gab-cyan)"
                      strokeWidth={2.5}
                      style={{ marginLeft: "auto" }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ COLUNA DIREITA: Destino + Ações ═══ */}
        <div className="gab-flex gab-flex-col gab-gap-20">

          {/* Card: Seleção de Destino */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon amber">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="gab-card-title">Gerar Para</div>
            </div>

            {/* Modo de geração: tabs */}
            <div className="gab-flex gab-gap-8 gab-mb-16">
              {[
                { id: "turma", label: "Turma" },
                { id: "turno", label: "Turno" },
                { id: "aluno", label: "Aluno" },
              ].map((modo) => (
                <button
                  key={modo.id}
                  className={`gab-btn gab-btn-sm ${modoGeracao === modo.id ? "gab-btn-primary" : "gab-btn-ghost"}`}
                  onClick={() => {
                    setModoGeracao(modo.id);
                    if (modo.id !== "aluno") setAlunoSel("");
                  }}
                  type="button"
                >
                  {modo.label}
                </button>
              ))}
            </div>

            <div className="gab-flex gab-flex-col gab-gap-12">
              {/* Turno */}
              <div className="gab-form-group">
                <label className="gab-label">Turno</label>
                <select
                  className="gab-select"
                  value={turnoSel}
                  onChange={(e) => {
                    setTurnoSel(e.target.value);
                    setTurmaSel("");
                    setAlunoSel("");
                  }}
                  disabled={loadingTurnos}
                >
                  <option value="">Selecione o turno</option>
                  {turnos.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Turma */}
              {(modoGeracao === "turma" || modoGeracao === "aluno") && (
                <div className="gab-form-group">
                  <label className="gab-label">Turma</label>
                  <select
                    className="gab-select"
                    value={turmaSel}
                    onChange={(e) => {
                      setTurmaSel(e.target.value);
                      setAlunoSel("");
                    }}
                    disabled={!turnoSel || loadingTurmas}
                  >
                    <option value="">Selecione a turma</option>
                    {turmasFiltradas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.turma} ({t.turno})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Aluno */}
              {modoGeracao === "aluno" && (
                <div className="gab-form-group">
                  <label className="gab-label">Aluno</label>
                  <select
                    className="gab-select"
                    value={alunoSel}
                    onChange={(e) => setAlunoSel(e.target.value)}
                    disabled={!turmaSel || loadingAlunos}
                  >
                    <option value="">Selecione o aluno</option>
                    {alunos.map((a) => (
                      <option key={a.codigo} value={a.codigo}>
                        {a.codigo} — {a.nome || a.estudante}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Card: Preview + Ação */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon green">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="gab-card-title">Preview & Geração</div>
            </div>

            {/* Resumo visual */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--gab-border)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Título:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-text-primary)" }}>
                    {titulo || "—"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Modelo:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-text-primary)" }}>
                    {MODELOS.find((m) => m.id === modelo)?.label}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Questões:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-cyan-light)" }}>
                    {numQuestoes}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Alternativas:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-cyan-light)" }}>
                    {numAlternativas} (A-{"ABCDEF"[Number(numAlternativas) - 1]})
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Destino:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-amber-light)" }}>
                    {modoGeracao === "turma" && turmaSel
                      ? `Turma ${turmasFiltradas.find((t) => String(t.id) === String(turmaSel))?.turma || turmaSel}`
                      : modoGeracao === "turno" && turnoSel
                      ? `Turno ${turnoSel}`
                      : modoGeracao === "aluno" && alunoSel
                      ? `Aluno ${alunoSel}`
                      : "Não selecionado"}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão de gerar */}
            <button
              className="gab-btn gab-btn-primary gab-btn-lg gab-w-full"
              onClick={handleGerar}
              disabled={gerando || !titulo.trim()}
            >
              {gerando ? (
                <>
                  <div className="gab-spinner" />
                  Gerando gabaritos...
                </>
              ) : (
                <>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" />
                  </svg>
                  Gerar Gabaritos para Impressão
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
