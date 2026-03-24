// ============================================================================
// ETAPA 1 — Gerar Gabaritos para Impressão
// Wizard de criação: Config → Disciplinas → Destino → Preview/Gerar
// Persiste avaliação no BD para rastreabilidade na Etapa 2 e 3
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
const TIPOS_AVALIACAO = [
  { id: "prova_padronizada", label: "Prova Padronizada", desc: "Elaborada pela Direção/Coordenação", icon: "🏫" },
  { id: "prova_individual", label: "Prova Individual", desc: "Elaborada pelo professor da disciplina", icon: "👩‍🏫" },
  { id: "simulado", label: "Simulado", desc: "Preparatório para ENEM, vestibular, etc.", icon: "📊" },
  { id: "avaliacao_diagnostica", label: "Avaliação Diagnóstica", desc: "Mapeamento do nível da turma", icon: "🔍" },
  { id: "recuperacao", label: "Recuperação", desc: "Avaliação de recuperação bimestral", icon: "🔄" },
];
const MODELOS = [
  { id: "padrao", label: "Padrão", desc: "Logo + nome + código + bolhas", icon: "📄" },
  { id: "enem", label: "ENEM", desc: "Múltiplas matérias, > 45 questões", icon: "📋" },
  { id: "simplificado", label: "Simplificado", desc: "Compacto, economia de papel", icon: "📝" },
];

export default function GabaritoGerar() {
  // ─── Dados ───
  const [turnos, setTurnos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);

  // ─── Formulário ───
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [bimestre, setBimestre] = useState("");
  const [numQuestoes, setNumQuestoes] = useState("10");
  const [numAlternativas, setNumAlternativas] = useState("5");
  const [notaTotal, setNotaTotal] = useState("10");
  const [modelo, setModelo] = useState("padrao");
  const [turnoSel, setTurnoSel] = useState("");
  const [turmasSel, setTurmasSel] = useState([]); // turma mode: múltiplas turmas
  const [turmaSel, setTurmaSel] = useState(""); // aluno mode: single turma para buscar alunos
  const [modoGeracao, setModoGeracao] = useState("turma");
  const [alunoSel, setAlunoSel] = useState("");

  // ─── Disciplinas Mapeadas ───
  const [discConfig, setDiscConfig] = useState([]); // [{disciplina_id, nome, de, ate}]

  // ─── Avaliação Salva (após primeiro save, botão muda para "gerar impressão") ───
  const [avaliacaoSalva, setAvaliacaoSalva] = useState(null); // { id, titulo, ... }

  // ─── Loading / States ───
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Fetch Turmas + Disciplinas ───
  useEffect(() => {
    (async () => {
      setLoadingTurnos(true);
      setLoadingTurmas(true);
      try {
        const [respTurmas, respDisc] = await Promise.all([
          api.get("/turmas"),
          api.get("/disciplinas"),
        ]);
        const anoAtual = anoLetivoPadrao();
        const filtradas = (respTurmas.data || []).filter((t) => Number(t.ano) === anoAtual);
        setTurmas(filtradas);
        setTurnos([...new Set(filtradas.map((t) => t.turno).filter(Boolean))].sort());
        setDisciplinas(respDisc.data || []);
      } catch { /* empty */ }
      setLoadingTurnos(false);
      setLoadingTurmas(false);
    })();
  }, []);

  // ─── Fetch Alunos ───
  useEffect(() => {
    if (!turmaSel) { setAlunos([]); setAlunoSel(""); return; }
    (async () => {
      setLoadingAlunos(true);
      try {
        const resp = await api.get(`/turmas/${encodeURIComponent(turmaSel)}/alunos`);
        setAlunos(resp.data.alunos || resp.data || []);
      } catch { /* empty */ }
      setAlunoSel("");
      setLoadingAlunos(false);
    })();
  }, [turmaSel]);

  // ─── Disciplina: Adicionar ───
  function addDisciplina() {
    const nQ = Number(numQuestoes) || 10;
    // Próximo "de" = última ate + 1
    const ultimaAte = discConfig.length > 0 ? Math.max(...discConfig.map((d) => d.ate)) : 0;
    const novaDe = ultimaAte + 1;
    if (novaDe > nQ) {
      showToast("Todas as questões já estão mapeadas.", "error");
      return;
    }
    setDiscConfig((prev) => [
      ...prev,
      { disciplina_id: "", nome: "", de: novaDe, ate: nQ },
    ]);
  }

  // ─── Disciplina: Remover ───
  function removeDisciplina(idx) {
    setDiscConfig((prev) => prev.filter((_, i) => i !== idx));
  }

  // ─── Disciplina: Atualizar ───
  function updateDisciplina(idx, field, value) {
    setDiscConfig((prev) => {
      const novo = [...prev];
      if (field === "disciplina_id") {
        const disc = disciplinas.find((d) => String(d.id) === String(value));
        novo[idx] = { ...novo[idx], disciplina_id: Number(value), nome: disc?.disciplina || disc?.nome || "" };
      } else {
        novo[idx] = { ...novo[idx], [field]: Number(value) || 0 };
      }
      return novo;
    });
  }

  // ─── Validação de faixas ───
  function validarFaixas() {
    if (discConfig.length === 0) return true; // sem config é ok (prova de 1 disciplina)
    const nQ = Number(numQuestoes) || 10;
    for (const dc of discConfig) {
      if (!dc.disciplina_id) return "Selecione a disciplina em todas as faixas.";
      if (dc.de < 1 || dc.ate > nQ) return `Faixa inválida: ${dc.de}–${dc.ate} (máx: ${nQ}).`;
      if (dc.de > dc.ate) return `Faixa inválida: "de" (${dc.de}) > "ate" (${dc.ate}).`;
    }
    // Verificar sobreposições
    const sorted = [...discConfig].sort((a, b) => a.de - b.de);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].de <= sorted[i - 1].ate) {
        return `Sobreposição entre faixas: Q${sorted[i - 1].de}–${sorted[i - 1].ate} e Q${sorted[i].de}–${sorted[i].ate}.`;
      }
    }
    return true;
  }

  // ─── Questões cobertas ───
  const questoesCobertas = discConfig.reduce((sum, dc) => sum + Math.max(0, dc.ate - dc.de + 1), 0);
  const nQ = Number(numQuestoes) || 10;

  // ─── Resetar formulário (Nova Avaliação) ───
  function handleNovaAvaliacao() {
    setAvaliacaoSalva(null);
    setTitulo("");
    setTipo("");
    setBimestre("");
    setNumQuestoes("10");
    setNumAlternativas("5");
    setNotaTotal("10");
    setModelo("padrao");
    setDiscConfig([]);
    setTurnoSel("");
    setTurmasSel([]);
    setTurmaSel("");
    setAlunoSel("");
    setModoGeracao("turma");
  }

  // ─── Construir endpoint + body para geração de PDF ───
  function buildPdfRequest() {
    const body = {
      descricao: titulo,
      num_questoes: Number(numQuestoes),
      num_alternativas: Number(numAlternativas),
      modelo,
    };
    let endpoint = "";

    if (modoGeracao === "aluno" && alunoSel) {
      endpoint = `/gabarito-pdf/gerar-individual`;
      body.aluno_codigo = alunoSel;
      body.turma_id = turmaSel;
    } else if (modoGeracao === "turma" && turmasSel.length > 0) {
      if (turmasSel.length === 1) {
        endpoint = `/gabarito-pdf/gerar-turma/${encodeURIComponent(turmasSel[0])}`;
      } else {
        endpoint = `/gabarito-pdf/gerar-turmas`;
        body.turma_ids = turmasSel.map(Number);
      }
    } else if (modoGeracao === "turno" && turnoSel) {
      endpoint = `/gabarito-pdf/gerar-turno/${encodeURIComponent(turnoSel)}`;
    }
    return { endpoint, body };
  }

  // ─── Gerar APENAS impressão (avaliação já foi salva) ───
  async function handleGerarImpressao() {
    const { endpoint, body } = buildPdfRequest();
    if (!endpoint) { showToast("Selecione o destino da geração.", "error"); return; }

    setGerando(true);
    try {
      const resp = await api.post(endpoint, body, { responseType: "blob" });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob), "_blank");
      showToast("Gabaritos gerados para impressão!");
    } catch (err) {
      showToast(err?.response?.data?.error || err.message || "Erro ao gerar.", "error");
    }
    setGerando(false);
  }

  // ─── Salvar + Gerar (primeira vez) ───
  async function handleSalvarEGerar() {
    if (!titulo.trim()) { showToast("Informe o título da avaliação.", "error"); return; }
    if (!tipo) { showToast("Selecione o tipo de avaliação.", "error"); return; }

    const faixaErr = validarFaixas();
    if (faixaErr !== true) { showToast(faixaErr, "error"); return; }

    // Verificar duplicidade
    try {
      const params = new URLSearchParams({ titulo: titulo.trim() });
      if (tipo) params.append("tipo", tipo);
      if (bimestre) params.append("bimestre", bimestre);
      const dupResp = await api.get(`/gabarito-avaliacoes/verificar-duplicidade?${params}`);

      if (dupResp.data?.existe) {
        const a = dupResp.data.avaliacao;
        const tipoLabel = TIPOS_AVALIACAO.find((t) => t.id === a.tipo)?.label || a.tipo || "";
        const confirma = window.confirm(
          `⚠️ Já existe uma avaliação similar:\n\n` +
          `• Título: ${a.titulo}\n` +
          `${tipoLabel ? `• Tipo: ${tipoLabel}\n` : ""}` +
          `${a.bimestre ? `• Bimestre: ${a.bimestre}\n` : ""}` +
          `• Status: ${a.status}\n` +
          `• Criada em: ${new Date(a.created_at).toLocaleDateString("pt-BR")}\n\n` +
          `Deseja criar uma NOVA avaliação mesmo assim?`
        );
        if (!confirma) return;
      }
    } catch {
      // Se falhar a verificação, continua normalmente
    }

    setGerando(true);
    try {
      // 1. Salvar avaliação no BD
      const turmaIds = modoGeracao === "turma" ? turmasSel.map(Number) : turmaSel ? [Number(turmaSel)] : null;
      const avaliacaoPayload = {
        titulo: titulo.trim(),
        tipo: tipo || null,
        bimestre: bimestre || null,
        num_questoes: Number(numQuestoes),
        num_alternativas: Number(numAlternativas),
        nota_total: Number(String(notaTotal).replace(",", ".")) || 10,
        modelo,
        disciplinas_config: discConfig.length > 0 ? discConfig : null,
        turmas_ids: turmaIds && turmaIds.length > 0 ? turmaIds : null,
        turno: turnoSel || null,
      };

      const avalResp = await api.post("/gabarito-avaliacoes", avaliacaoPayload);
      const salva = avalResp.data;
      setAvaliacaoSalva(salva);

      // 2. Gerar PDF
      const { endpoint, body } = buildPdfRequest();
      if (endpoint) {
        const resp = await api.post(endpoint, body, { responseType: "blob" });
        const blob = new Blob([resp.data], { type: "application/pdf" });
        window.open(URL.createObjectURL(blob), "_blank");
      }

      showToast(`Avaliação salva com sucesso (ID: ${salva.id})! Gabaritos gerados.`);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Erro ao salvar/gerar.";
      showToast(msg, "error");
    }
    setGerando(false);
  }

  const turmasFiltradas = turnoSel ? turmas.filter((t) => t.turno === turnoSel) : turmas;

  // Disciplinas que já foram usadas
  const discUsadas = new Set(discConfig.map((d) => d.disciplina_id).filter(Boolean));

  return (
    <>
      {toast && <div className={`gab-toast ${toast.type}`}>{toast.msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ═══ COLUNA ESQUERDA ═══ */}
        <div className="gab-flex gab-flex-col gab-gap-20">

          {/* Card: Configuração */}
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
                <label className="gab-label">Título / Descrição *</label>
                <input
                  className="gab-input"
                  type="text"
                  placeholder="Ex: PROVÃO DE EXATAS – 1º BIMESTRE – 2026"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value.slice(0, 120))}
                  maxLength={120}
                  disabled={!!avaliacaoSalva}
                />
              </div>

              <div className="gab-form-group">
                <label className="gab-label">Tipo de Avaliação *</label>
                <select
                  className="gab-select"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={!!avaliacaoSalva}
                >
                  <option value="">Selecione o tipo</option>
                  {TIPOS_AVALIACAO.map((t) => (
                    <option key={t.id} value={t.id}>{t.icon} {t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>

              <div className="gab-grid-2">
                <div className="gab-form-group">
                  <label className="gab-label">Bimestre</label>
                  <select
                    className="gab-select"
                    value={bimestre}
                    onChange={(e) => setBimestre(e.target.value)}
                    disabled={!!avaliacaoSalva}
                  >
                    <option value="">Selecione (opcional)</option>
                    {BIMESTRES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="gab-form-group">
                  <label className="gab-label">Nota Total</label>
                  <input
                    className="gab-input"
                    type="text"
                    placeholder="10"
                    value={notaTotal}
                    onChange={(e) => setNotaTotal(e.target.value.replace(/[^0-9.,]/g, ""))}
                    disabled={!!avaliacaoSalva}
                  />
                </div>
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

          {/* Card: Disciplinas por Faixa */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon purple">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div className="gab-card-title">Disciplinas por Faixa de Questões</div>
            </div>

            {discConfig.length === 0 ? (
              <div style={{
                padding: "20px",
                textAlign: "center",
                border: "1px dashed var(--gab-border)",
                borderRadius: "10px",
                color: "var(--gab-text-muted)",
                fontSize: "0.82rem",
              }}>
                <p style={{ margin: "0 0 8px" }}>Nenhuma disciplina configurada.</p>
                <p style={{ margin: "0 0 14px", fontSize: "0.75rem" }}>
                  Para provas por área (Exatas, Humanas), adicione as disciplinas e suas faixas de questões.
                </p>
                <button
                  type="button"
                  className="gab-btn gab-btn-primary gab-btn-sm"
                  onClick={addDisciplina}
                >
                  + Adicionar Disciplina
                </button>
              </div>
            ) : (
              <div className="gab-flex gab-flex-col gab-gap-10">
                {discConfig.map((dc, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 70px 70px 36px",
                      gap: 8,
                      alignItems: "end",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--gab-border)",
                    }}
                  >
                    <div className="gab-form-group" style={{ margin: 0 }}>
                      <label className="gab-label" style={{ fontSize: "0.68rem" }}>Disciplina</label>
                      <select
                        className="gab-select"
                        value={dc.disciplina_id || ""}
                        onChange={(e) => updateDisciplina(idx, "disciplina_id", e.target.value)}
                        style={{ fontSize: "0.82rem" }}
                      >
                        <option value="">Selecione</option>
                        {disciplinas
                          .filter((d) => !discUsadas.has(d.id) || d.id === dc.disciplina_id)
                          .map((d) => (
                            <option key={d.id} value={d.id}>{d.disciplina || d.nome}</option>
                          ))}
                      </select>
                    </div>
                    <div className="gab-form-group" style={{ margin: 0 }}>
                      <label className="gab-label" style={{ fontSize: "0.68rem" }}>De (Q)</label>
                      <input
                        className="gab-input"
                        type="number"
                        min={1}
                        max={nQ}
                        value={dc.de || ""}
                        onChange={(e) => updateDisciplina(idx, "de", e.target.value)}
                        style={{ fontSize: "0.82rem", textAlign: "center" }}
                      />
                    </div>
                    <div className="gab-form-group" style={{ margin: 0 }}>
                      <label className="gab-label" style={{ fontSize: "0.68rem" }}>Até (Q)</label>
                      <input
                        className="gab-input"
                        type="number"
                        min={1}
                        max={nQ}
                        value={dc.ate || ""}
                        onChange={(e) => updateDisciplina(idx, "ate", e.target.value)}
                        style={{ fontSize: "0.82rem", textAlign: "center" }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDisciplina(idx)}
                      title="Remover"
                      style={{
                        width: 32, height: 32, borderRadius: "8px",
                        border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--gab-red-light)", fontSize: "1rem", marginBottom: 2,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Barra de progresso das faixas */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  fontSize: "0.75rem", color: "var(--gab-text-muted)", marginTop: 4,
                }}>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 6,
                    background: "var(--gab-glass)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${Math.min(100, (questoesCobertas / nQ) * 100)}%`,
                      height: "100%",
                      borderRadius: 6,
                      background: questoesCobertas === nQ
                        ? "var(--gab-green)"
                        : questoesCobertas > nQ
                        ? "var(--gab-red-light)"
                        : "var(--gab-cyan)",
                      transition: "width 0.3s",
                    }} />
                  </div>
                  <span style={{
                    fontWeight: 700,
                    color: questoesCobertas === nQ
                      ? "var(--gab-green)"
                      : questoesCobertas > nQ
                      ? "var(--gab-red-light)"
                      : "var(--gab-cyan-light)",
                  }}>
                    {questoesCobertas}/{nQ}
                  </span>
                </div>

                <button
                  type="button"
                  className="gab-btn gab-btn-ghost gab-btn-sm"
                  onClick={addDisciplina}
                  style={{ alignSelf: "flex-start" }}
                >
                  + Adicionar outra disciplina
                </button>
              </div>
            )}
          </div>

          {/* Card: Modelo */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon cyan">
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
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: "10px",
                    border: modelo === m.id ? "1px solid var(--gab-cyan)" : "1px solid var(--gab-border)",
                    background: modelo === m.id ? "rgba(6, 182, 212, 0.06)" : "transparent",
                    cursor: "pointer", transition: "all 0.2s", textAlign: "left",
                    width: "100%", fontFamily: "var(--gab-font-body)",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{m.icon}</span>
                  <div>
                    <div style={{
                      fontSize: "0.88rem", fontWeight: 700,
                      color: modelo === m.id ? "var(--gab-cyan-light)" : "var(--gab-text-primary)",
                    }}>{m.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>{m.desc}</div>
                  </div>
                  {modelo === m.id && (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--gab-cyan)" strokeWidth={2.5} style={{ marginLeft: "auto" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ COLUNA DIREITA ═══ */}
        <div className="gab-flex gab-flex-col gab-gap-20">

          {/* Card: Destino */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon amber">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="gab-card-title">Gerar Para</div>
            </div>

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
                    if (modo.id !== "aluno") setTurmaSel("");
                  }}
                  type="button"
                >{modo.label}</button>
              ))}
            </div>

            <div className="gab-flex gab-flex-col gab-gap-12">
              <div className="gab-form-group">
                <label className="gab-label">Turno</label>
                <select
                  className="gab-select"
                  value={turnoSel}
                  onChange={(e) => { setTurnoSel(e.target.value); setTurmaSel(""); setTurmasSel([]); setAlunoSel(""); }}
                  disabled={loadingTurnos}
                >
                  <option value="">Selecione o turno</option>
                  {turnos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* TURMA mode: checkboxes multi-select */}
              {modoGeracao === "turma" && turnoSel && (
                <div className="gab-form-group">
                  <label className="gab-label">
                    Turmas
                    {turmasSel.length > 0 && (
                      <span style={{ marginLeft: 8, fontSize: "0.72rem", fontWeight: 700, color: "var(--gab-cyan-light)" }}>
                        {turmasSel.length} selecionada{turmasSel.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </label>
                  <div style={{
                    maxHeight: 180, overflowY: "auto", borderRadius: 8,
                    border: "1px solid var(--gab-border)", padding: "4px 0",
                    background: "var(--gab-glass)",
                  }}>
                    {turmasFiltradas.length === 0 ? (
                      <div style={{ padding: "12px 16px", color: "var(--gab-text-muted)", fontSize: "0.8rem" }}>
                        Nenhuma turma neste turno
                      </div>
                    ) : (
                      <>
                        {/* Selecionar todas */}
                        <label style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 14px", cursor: "pointer",
                          borderBottom: "1px solid var(--gab-border)",
                          fontSize: "0.8rem", fontWeight: 700,
                          color: "var(--gab-cyan-light)",
                        }}>
                          <input
                            type="checkbox"
                            checked={turmasSel.length === turmasFiltradas.length && turmasFiltradas.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTurmasSel(turmasFiltradas.map((t) => String(t.id)));
                              } else {
                                setTurmasSel([]);
                              }
                            }}
                            style={{ accentColor: "var(--gab-cyan)" }}
                          />
                          Selecionar todas
                        </label>
                        {turmasFiltradas.map((t) => {
                          const isChecked = turmasSel.includes(String(t.id));
                          return (
                            <label
                              key={t.id}
                              style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "7px 14px", cursor: "pointer",
                                fontSize: "0.82rem",
                                background: isChecked ? "rgba(6, 182, 212, 0.06)" : "transparent",
                                transition: "background 0.15s",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTurmasSel((prev) => [...prev, String(t.id)]);
                                  } else {
                                    setTurmasSel((prev) => prev.filter((id) => id !== String(t.id)));
                                  }
                                }}
                                style={{ accentColor: "var(--gab-cyan)" }}
                              />
                              <span style={{ fontWeight: isChecked ? 600 : 400, color: "var(--gab-text-primary)" }}>
                                {t.turma}
                              </span>
                              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--gab-text-muted)" }}>
                                {t.turno}
                              </span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ALUNO mode: single turma dropdown */}
              {modoGeracao === "aluno" && (
                <div className="gab-form-group">
                  <label className="gab-label">Turma</label>
                  <select
                    className="gab-select"
                    value={turmaSel}
                    onChange={(e) => { setTurmaSel(e.target.value); setAlunoSel(""); }}
                    disabled={!turnoSel || loadingTurmas}
                  >
                    <option value="">Selecione a turma</option>
                    {turmasFiltradas.map((t) => (
                      <option key={t.id} value={t.id}>{t.turma} ({t.turno})</option>
                    ))}
                  </select>
                </div>
              )}

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
                      <option key={a.matricula || a.codigo || a.id} value={a.matricula || a.codigo || a.id}>
                        {a.matricula || a.codigo} — {a.nome || a.estudante}
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

            <div style={{
              background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--gab-border)",
              borderRadius: "12px", padding: "20px", marginBottom: 20,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Título:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-text-primary)" }}>{titulo || "—"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Tipo:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-text-primary)" }}>
                    {TIPOS_AVALIACAO.find((t) => t.id === tipo)?.label || "—"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Bimestre:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-text-primary)" }}>{bimestre || "—"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Questões:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-cyan-light)" }}>{numQuestoes}</span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Alternativas:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-cyan-light)" }}>
                    {numAlternativas} (A-{"ABCDEF"[Number(numAlternativas) - 1]})
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Nota Total:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-text-primary)" }}>{notaTotal}</span>
                </div>
                <div>
                  <span style={{ color: "var(--gab-text-muted)" }}>Modelo:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-text-primary)" }}>
                    {MODELOS.find((m) => m.id === modelo)?.label}
                  </span>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--gab-text-muted)" }}>Destino:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--gab-amber-light)" }}>
                    {modoGeracao === "turma" && turmasSel.length > 0
                      ? turmasSel.map((id) => turmasFiltradas.find((t) => String(t.id) === id)?.turma || id).join(", ")
                      : modoGeracao === "turno" && turnoSel
                      ? `Turno ${turnoSel}`
                      : modoGeracao === "aluno" && alunoSel
                      ? `Aluno ${alunoSel}`
                      : "Não selecionado"}
                  </span>
                </div>
                {discConfig.length > 0 && (
                  <div style={{ gridColumn: "1 / -1", paddingTop: 8, borderTop: "1px solid var(--gab-border)" }}>
                    <span style={{ color: "var(--gab-text-muted)" }}>Disciplinas:</span>
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {discConfig.map((dc, i) => (
                        <span key={i} style={{
                          padding: "3px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600,
                          background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.25)",
                          color: "var(--gab-purple-light)",
                        }}>
                          {dc.nome || "?"} (Q{dc.de}–Q{dc.ate})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Banner de avaliação salva */}
            {avaliacaoSalva && (
              <div style={{
                padding: "12px 16px", borderRadius: 10, marginBottom: 14,
                background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex", alignItems: "center", gap: 10,
                fontSize: "0.8rem", color: "var(--gab-green)",
              }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Avaliação salva</strong> (ID: {avaliacaoSalva.id}) — 
                  Use o botão abaixo para gerar novas impressões.
                </span>
              </div>
            )}

            {/* Botão principal: duas fases */}
            {!avaliacaoSalva ? (
              <button
                className="gab-btn gab-btn-primary gab-btn-lg gab-w-full"
                onClick={handleSalvarEGerar}
                disabled={gerando || !titulo.trim() || !tipo}
              >
                {gerando ? (
                  <>
                    <div className="gab-spinner" />
                    Verificando e salvando...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" />
                    </svg>
                    Salvar Avaliação & Gerar Gabaritos
                  </>
                )}
              </button>
            ) : (
              <div className="gab-flex gab-flex-col gab-gap-10">
                <button
                  className="gab-btn gab-btn-primary gab-btn-lg gab-w-full"
                  onClick={handleGerarImpressao}
                  disabled={gerando}
                >
                  {gerando ? (
                    <>
                      <div className="gab-spinner" />
                      Gerando impressão...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" />
                      </svg>
                      Gerar Impressão
                    </>
                  )}
                </button>
                <button
                  className="gab-btn gab-btn-ghost gab-btn-sm gab-w-full"
                  onClick={handleNovaAvaliacao}
                  type="button"
                >
                  + Nova Avaliação
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
