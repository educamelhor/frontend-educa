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
const FORMATOS_QUESTOES = [
  { id: "multipla_escolha", label: "Múltipla Escolha", desc: "Alternativas A–D, A–E...", icon: "🔘" },
  { id: "certo_errado", label: "Certo / Errado", desc: "100% itens C ou E", icon: "⚖️" },
  { id: "mista", label: "Prova Mista", desc: "Mescla Múlt. Escolha + C/E", icon: "🔀" },
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
  const [formatoQuestoes, setFormatoQuestoes] = useState("multipla_escolha"); // multipla_escolha | certo_errado | mista
  const [questoesCe, setQuestoesCe] = useState([]); // array 1-based de questões Certo/Errado (modo mista)
  const [penalidadeCe, setPenalidadeCe] = useState(false); // 1 errada anula 1 certa nos itens C/E
  const [faixaCeDe, setFaixaCeDe] = useState("1");
  const [faixaCeAte, setFaixaCeAte] = useState("5");
  const [notaTotal, setNotaTotal] = useState("10");
  const [dataAplicacao, setDataAplicacao] = useState("");
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

  // ─── Avaliações Anteriores (Reimpressão) ───
  const [avaliacoesAnteriores, setAvaliacoesAnteriores] = useState([]);
  const [loadingAnteriores, setLoadingAnteriores] = useState(false);
  const [buscaReimpressao, setBuscaReimpressao] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); // Estado para o modal premium de exclusão

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

  // ─── Fetch Avaliações Anteriores ───
  useEffect(() => {
    carregarAvaliacoes();
  }, []);

  async function carregarAvaliacoes() {
    setLoadingAnteriores(true);
    try {
      const resp = await api.get("/gabarito-avaliacoes?limit=30");
      setAvaliacoesAnteriores(resp.data || []);
    } catch { }
    setLoadingAnteriores(false);
  }

  async function handleDeleteAvaliacao() {
    if (!deleteModal) return;
    try {
      await api.delete(`/gabarito-avaliacoes/${deleteModal.id}`);
      showToast("Avaliação excluída com sucesso!", "success");
      setDeleteModal(null);
      carregarAvaliacoes(); // Recarrega a lista
    } catch (err) {
      console.error(err);
      showToast("Erro ao excluir avaliação.", "error");
    }
  }

  // ─── Carregar Avaliação Existente (Reimpressão) ───
  function carregarParaReimpressao(a) {
    setTitulo(a.titulo || "");
    setTipo(a.tipo || "");
    setBimestre(a.bimestre || "");
    setNumQuestoes(String(a.num_questoes || "10"));
    setNumAlternativas(String(a.num_alternativas || "5"));
    setFormatoQuestoes(a.formato_questoes || "multipla_escolha");
    setQuestoesCe(Array.isArray(a.questoes_ce) ? a.questoes_ce.map(Number) : []);
    setPenalidadeCe(Boolean(Number(a.penalidade_ce)));
    setNotaTotal(String(a.nota_total || "10"));
    setModelo(a.modelo || "padrao");
    setDiscConfig(a.disciplinas_config || []);
    setDataAplicacao(a.data_aplicacao ? String(a.data_aplicacao).slice(0, 10) : "");
    setAvaliacaoSalva(a);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Avaliação carregada! Defina o Destino e gere a impressão.");
  }

  // ─── Helpers Formato Misto (Múltipla Escolha × Certo/Errado) ───
  function handleChangeFormato(novoFormato) {
    if (avaliacaoSalva) return;
    setFormatoQuestoes(novoFormato);
    if (novoFormato === "certo_errado") {
      setNumAlternativas("2");
    } else if (novoFormato === "mista") {
      if (Number(numAlternativas) < 3) setNumAlternativas("5");
      const total = Math.max(2, Number(numQuestoes) || 10);
      if (questoesCe.length === 0) {
        // Pré-seleciona primeira metade como sugestão inicial editável
        const metade = Math.max(1, Math.floor(total / 2));
        setQuestoesCe(Array.from({ length: metade }, (_, i) => i + 1));
        setFaixaCeDe("1");
        setFaixaCeAte(String(metade));
      }
    } else {
      setPenalidadeCe(false);
    }
  }

  function toggleQuestaoCe(qNum) {
    if (avaliacaoSalva) return;
    setQuestoesCe((prev) =>
      prev.includes(qNum) ? prev.filter((n) => n !== qNum).sort((a, b) => a - b) : [...prev, qNum].sort((a, b) => a - b)
    );
  }

  function aplicarFaixaTipo(marcarComoCE) {
    if (avaliacaoSalva) return;
    const total = Math.max(1, Number(numQuestoes) || 10);
    const d = Math.max(1, Math.min(total, Number(faixaCeDe) || 1));
    const a = Math.max(1, Math.min(total, Number(faixaCeAte) || total));
    const inicio = Math.min(d, a);
    const fim = Math.max(d, a);
    setQuestoesCe((prev) => {
      const set = new Set(prev.filter((n) => n >= 1 && n <= total));
      for (let q = inicio; q <= fim; q++) {
        if (marcarComoCE) set.add(q);
        else set.delete(q);
      }
      return [...set].sort((x, y) => x - y);
    });
  }

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
  const questoesCeValidas = questoesCe.filter((q) => q >= 1 && q <= nQ);
  const ceSetAtivo = new Set(questoesCeValidas);

  // ─── Resetar formulário (Nova Avaliação) ───
  function handleNovaAvaliacao() {
    setAvaliacaoSalva(null);
    setTitulo("");
    setTipo("");
    setBimestre("");
    setNumQuestoes("10");
    setNumAlternativas("5");
    setFormatoQuestoes("multipla_escolha");
    setQuestoesCe([]);
    setPenalidadeCe(false);
    setFaixaCeDe("1");
    setFaixaCeAte("5");
    setNotaTotal("10");
    setDataAplicacao("");
    setModelo("padrao");
    setDiscConfig([]);
    setTurnoSel("");
    setTurmasSel([]);
    setTurmaSel("");
    setAlunoSel("");
    setModoGeracao("turma");
  }

  // ─── Construir endpoint + body para geração de PDF ───
  function buildPdfRequest(overrideAvaliacaoId = null) {
    const nAlternativasEfetivo = formatoQuestoes === "certo_errado" ? 2 : Number(numAlternativas);
    const body = {
      descricao: titulo,
      num_questoes: Number(numQuestoes),
      num_alternativas: nAlternativasEfetivo,
      modelo,
      formato_questoes: formatoQuestoes,
      questoes_ce: formatoQuestoes === "mista" ? questoesCeValidas : null,
      penalidade_ce: formatoQuestoes !== "multipla_escolha" && penalidadeCe ? 1 : 0,
      avaliacao_id: overrideAvaliacaoId || avaliacaoSalva?.id || null,
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
  // ─── Atualizar Disciplinas (para avaliação já salva) ───
  async function handleAtualizarDisciplinas() {
    if (!avaliacaoSalva) return;
    const faixaErr = validarFaixas();
    if (faixaErr !== true) { showToast(faixaErr, "error"); return; }
    
    setGerando(true);
    try {
      await api.put(`/gabarito-avaliacoes/${avaliacaoSalva.id}`, {
        disciplinas_config: discConfig.length > 0 ? discConfig : null
      });
      // Atualiza o estado da avaliação salva para refletir a nova config
      setAvaliacaoSalva((prev) => ({
        ...prev,
        disciplinas_config: discConfig.length > 0 ? discConfig : null
      }));
      showToast("Disciplinas atualizadas com sucesso!");
    } catch (err) {
      showToast(err?.response?.data?.error || "Erro ao atualizar disciplinas.", "error");
    }
    setGerando(false);
  }

  // ─── Salvar + Gerar (primeira vez) ───
  async function handleSalvarEGerar() {
    if (!titulo.trim()) { showToast("Informe o título da avaliação.", "error"); return; }
    if (!tipo) { showToast("Selecione o tipo de avaliação.", "error"); return; }
    if (!dataAplicacao) { showToast("Informe a data de aplicação da prova.", "error"); return; }

    if (formatoQuestoes === "mista") {
      if (questoesCeValidas.length === 0) {
        showToast("Na Prova Mista, defina ao menos 1 questão como Certo/Errado.", "error");
        return;
      }
      if (questoesCeValidas.length >= nQ) {
        showToast("Todas as questões estão como C/E. Mantenha ao menos 1 Múltipla Escolha ou mude o formato para 'Certo / Errado'.", "error");
        return;
      }
    }

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
        num_alternativas: formatoQuestoes === "certo_errado" ? 2 : Number(numAlternativas),
        formato_questoes: formatoQuestoes,
        questoes_ce: formatoQuestoes === "mista" ? questoesCeValidas : null,
        penalidade_ce: formatoQuestoes !== "multipla_escolha" && penalidadeCe ? 1 : 0,
        nota_total: Number(String(notaTotal).replace(",", ".")) || 10,
        modelo,
        disciplinas_config: discConfig.length > 0 ? discConfig : null,
        turmas_ids: turmaIds && turmaIds.length > 0 ? turmaIds : null,
        turno: turnoSel || null,
        data_aplicacao: dataAplicacao || null,
      };

      const avalResp = await api.post("/gabarito-avaliacoes", avaliacaoPayload);
      const salva = avalResp.data;
      setAvaliacaoSalva(salva);

      // 2. Gerar PDF
      const { endpoint, body } = buildPdfRequest(salva.id);
      if (endpoint) {
        const resp = await api.post(endpoint, body, { responseType: "blob" });
        const blob = new Blob([resp.data], { type: "application/pdf" });
        window.open(URL.createObjectURL(blob), "_blank");
      }

      showToast(`Avaliação salva com sucesso (ID: ${salva.id})! Gabaritos gerados.`);
      carregarAvaliacoes(); // Atualiza a lista abaixo
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Erro ao salvar/gerar.";
      showToast(msg, "error");
    }
    setGerando(false);
  }

  const turmasFiltradas = turnoSel ? turmas.filter((t) => t.turno === turnoSel) : turmas;

  // Disciplinas que já foram usadas
  const discUsadas = new Set(discConfig.map((d) => d.disciplina_id).filter(Boolean));

  // Filtro de avaliações para reimpressão
  const avaliacoesFiltradas = avaliacoesAnteriores.filter((a) =>
    (a.titulo || "").toLowerCase().includes(buscaReimpressao.toLowerCase()) ||
    String(a.id) === buscaReimpressao
  );

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

              {/* DATA DA PROVA BIMESTRAL */}
              <div className="gab-form-group">
                <label className="gab-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  📅 Data de Aplicação
                  <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--gab-text-muted)', marginLeft: 4 }}>
                    (Prova Bimestral Padronizada)
                  </span>
                </label>
                <input
                  id="gabarito-data-aplicacao"
                  className="gab-input"
                  type="date"
                  value={dataAplicacao}
                  onChange={(e) => setDataAplicacao(e.target.value)}
                  disabled={!!avaliacaoSalva}
                />
                {dataAplicacao && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--gab-cyan-light)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ℹ️ Esta data será propagada automaticamente para o PAP de todos os professores deste bimestre.
                  </p>
                )}
              </div>

              {/* FORMATO DAS QUESTÕES: Múltipla Escolha | Certo/Errado | Mista */}
              <div className="gab-form-group">
                <label className="gab-label">Formato das Questões *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {FORMATOS_QUESTOES.map((fmt) => {
                    const ativo = formatoQuestoes === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        disabled={!!avaliacaoSalva}
                        onClick={() => handleChangeFormato(fmt.id)}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3,
                          padding: "10px 12px", borderRadius: 10, textAlign: "left",
                          cursor: avaliacaoSalva ? "not-allowed" : "pointer",
                          opacity: avaliacaoSalva && !ativo ? 0.45 : 1,
                          border: ativo ? "1.5px solid var(--gab-cyan)" : "1px solid var(--gab-border)",
                          background: ativo ? "rgba(6, 182, 212, 0.09)" : "rgba(255,255,255,0.02)",
                          transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                          <span style={{ fontSize: "1rem" }}>{fmt.icon}</span>
                          <span style={{
                            fontSize: "0.8rem", fontWeight: 700,
                            color: ativo ? "var(--gab-cyan-light)" : "var(--gab-text-primary)",
                          }}>
                            {fmt.label}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.68rem", color: "var(--gab-text-muted)", lineHeight: 1.25 }}>
                          {fmt.desc}
                        </span>
                      </button>
                    );
                  })}
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
                    disabled={!!avaliacaoSalva}
                    onChange={(e) => setNumQuestoes(e.target.value.replace(/\D/, ""))}
                  />
                </div>
                <div className="gab-form-group">
                  <label className="gab-label">
                    {formatoQuestoes === "certo_errado"
                      ? "Alternativas (C / E)"
                      : formatoQuestoes === "mista"
                        ? "Alternativas (Múlt. Escolha)"
                        : "Alternativas (A-F)"}
                  </label>
                  {formatoQuestoes === "certo_errado" ? (
                    <input
                      className="gab-input"
                      type="text"
                      value="2 (C = Certo · E = Errado)"
                      disabled
                      style={{ opacity: 0.85, fontWeight: 600, color: "var(--gab-cyan-light)" }}
                    />
                  ) : (
                    <select
                      className="gab-select"
                      value={numAlternativas}
                      disabled={!!avaliacaoSalva}
                      onChange={(e) => setNumAlternativas(e.target.value)}
                    >
                      {formatoQuestoes !== "mista" && <option value="2">2 (A-B)</option>}
                      <option value="3">3 (A-C)</option>
                      <option value="4">4 (A-D)</option>
                      <option value="5">5 (A-E)</option>
                      <option value="6">6 (A-F)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* MAPEADOR INTERATIVO DE PROVA MISTA (Múltipla Escolha × Certo/Errado) */}
              {formatoQuestoes === "mista" && (
                <div style={{
                  padding: "14px 16px", borderRadius: 12,
                  background: "linear-gradient(145deg, rgba(6,182,212,0.04) 0%, rgba(139,92,246,0.05) 100%)",
                  border: "1px solid rgba(139,92,246,0.28)",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                        🔀 Distribuição das {nQ} Questões
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                        Use o intervalo rápido ou clique sobre cada número para alternar entre Múltipla Escolha e Certo/Errado.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                      <span style={{
                        padding: "4px 10px", borderRadius: 20,
                        background: "rgba(6,182,212,0.14)", border: "1px solid rgba(6,182,212,0.35)", color: "#22d3ee",
                      }}>
                        ME (A–{"ABCDEF"[Number(numAlternativas) - 1] || "E"}): {Math.max(0, nQ - questoesCeValidas.length)}
                      </span>
                      <span style={{
                        padding: "4px 10px", borderRadius: 20,
                        background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.38)", color: "#fbbf24",
                      }}>
                        C/E: {questoesCeValidas.length}
                      </span>
                    </div>
                  </div>

                  {/* Barra de intervalo rápido */}
                  {!avaliacaoSalva && (
                    <div style={{
                      display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
                      padding: "8px 10px", borderRadius: 8,
                      background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: "0.75rem",
                    }}>
                      <span style={{ color: "var(--gab-text-muted)", fontWeight: 600 }}>Faixa rápida: Q</span>
                      <input
                        type="number"
                        min={1}
                        max={nQ}
                        value={faixaCeDe}
                        onChange={(e) => setFaixaCeDe(e.target.value)}
                        className="gab-input"
                        style={{ width: 58, padding: "4px 8px", textAlign: "center", fontSize: "0.78rem" }}
                      />
                      <span style={{ color: "var(--gab-text-muted)" }}>até Q</span>
                      <input
                        type="number"
                        min={1}
                        max={nQ}
                        value={faixaCeAte}
                        onChange={(e) => setFaixaCeAte(e.target.value)}
                        className="gab-input"
                        style={{ width: 58, padding: "4px 8px", textAlign: "center", fontSize: "0.78rem" }}
                      />
                      <button
                        type="button"
                        onClick={() => aplicarFaixaTipo(true)}
                        style={{
                          padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: "0.72rem",
                          background: "rgba(245,158,11,0.16)", border: "1px solid rgba(245,158,11,0.4)", color: "#fbbf24",
                        }}
                      >
                        Definir C/E
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarFaixaTipo(false)}
                        style={{
                          padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: "0.72rem",
                          background: "rgba(6,182,212,0.14)", border: "1px solid rgba(6,182,212,0.35)", color: "#22d3ee",
                        }}
                      >
                        Definir ME
                      </button>
                    </div>
                  )}

                  {/* Grade clicável de questões 01..nQ */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(54px, 1fr))",
                    gap: 6,
                    maxHeight: 210,
                    overflowY: "auto",
                    paddingRight: 2,
                  }}>
                    {Array.from({ length: Math.min(100, Math.max(1, nQ)) }, (_, idx) => {
                      const qNum = idx + 1;
                      const isCE = ceSetAtivo.has(qNum);
                      return (
                        <button
                          key={qNum}
                          type="button"
                          disabled={!!avaliacaoSalva}
                          onClick={() => toggleQuestaoCe(qNum)}
                          title={`Questão ${qNum}: ${isCE ? "Certo / Errado (clique p/ mudar para Múltipla Escolha)" : "Múltipla Escolha (clique p/ mudar para Certo / Errado)"}`}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            padding: "5px 4px", borderRadius: 8,
                            cursor: avaliacaoSalva ? "default" : "pointer",
                            border: isCE ? "1.5px solid rgba(245,158,11,0.55)" : "1px solid rgba(6,182,212,0.3)",
                            background: isCE ? "rgba(245,158,11,0.14)" : "rgba(6,182,212,0.07)",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: isCE ? "#fbbf24" : "#e2e8f0" }}>
                            {String(qNum).padStart(2, "0")}
                          </span>
                          <span style={{ fontSize: "0.58rem", fontWeight: 700, color: isCE ? "#fcd34d" : "#22d3ee" }}>
                            {isCE ? "C/E" : `A-${"ABCDEF"[Number(numAlternativas) - 1] || "E"}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OPÇÃO DE FATOR DE CORREÇÃO CEBRASPE / PAS-UnB (apenas quando há itens C/E) */}
              {formatoQuestoes !== "multipla_escolha" && (
                <label style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "11px 14px", borderRadius: 10,
                  cursor: avaliacaoSalva ? "not-allowed" : "pointer",
                  background: penalidadeCe ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                  border: penalidadeCe ? "1px solid rgba(245,158,11,0.35)" : "1px solid var(--gab-border)",
                  transition: "all 0.2s",
                }}>
                  <input
                    type="checkbox"
                    checked={penalidadeCe}
                    disabled={!!avaliacaoSalva}
                    onChange={(e) => setPenalidadeCe(e.target.checked)}
                    style={{ marginTop: 3, accentColor: "#f59e0b" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: penalidadeCe ? "#fbbf24" : "var(--gab-text-primary)" }}>
                      ⚖️ Aplicar fator de correção nas questões C/E (1 errada anula 1 certa)
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--gab-text-muted)", marginTop: 2, lineHeight: 1.35 }}>
                      Modelo PAS/UnB & Cebraspe: questão C/E deixada em branco vale 0; marcação errada desconta 1 acerto (nota mínima travada em 0,0).
                    </div>
                  </div>
                </label>
              )}
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
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    type="button"
                    className="gab-btn gab-btn-primary gab-btn-sm"
                    onClick={addDisciplina}
                  >
                    + Adicionar Disciplina
                  </button>
                  {avaliacaoSalva && (
                    <button
                      type="button"
                      className="gab-btn gab-btn-secondary gab-btn-sm"
                      onClick={handleAtualizarDisciplinas}
                      disabled={gerando}
                    >
                      {gerando ? "Salvando..." : "Salvar Configuração Vazia"}
                    </button>
                  )}
                </div>
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

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    className="gab-btn gab-btn-ghost gab-btn-sm"
                    onClick={addDisciplina}
                    style={{ alignSelf: "flex-start" }}
                  >
                    + Adicionar outra disciplina
                  </button>
                  {avaliacaoSalva && (
                    <button
                      type="button"
                      className="gab-btn gab-btn-primary gab-btn-sm"
                      onClick={handleAtualizarDisciplinas}
                      disabled={gerando}
                      style={{ alignSelf: "flex-start" }}
                    >
                      {gerando ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  )}
                </div>
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
                  <span style={{ color: "var(--gab-text-muted)" }}>Formato:</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: formatoQuestoes === "mista" ? "#fbbf24" : "var(--gab-cyan-light)" }}>
                    {formatoQuestoes === "certo_errado"
                      ? `Certo / Errado (C/E)${penalidadeCe ? " · c/ fator" : ""}`
                      : formatoQuestoes === "mista"
                        ? `Mista (${Math.max(0, nQ - questoesCeValidas.length)} ME + ${questoesCeValidas.length} C/E)${penalidadeCe ? " · c/ fator" : ""}`
                        : `${numAlternativas} (A-${"ABCDEF"[Number(numAlternativas) - 1]})`}
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

      {/* ═══ CARTÃO: Lista de Avaliações (Reimpressão) ═══ */}
      <div className="gab-card" style={{ marginTop: 24 }}>
        <div className="gab-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="gab-card-icon blue">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="gab-card-title">Avaliações Geradas Anteriores (Reimpressão)</div>
          </div>
          <div>
            <input
              type="text"
              className="gab-input"
              placeholder="Buscar por ID ou título..."
              value={buscaReimpressao}
              onChange={(e) => setBuscaReimpressao(e.target.value)}
              style={{ width: "250px", fontSize: "0.85rem", padding: "8px 12px" }}
            />
          </div>
        </div>

        <div style={{ padding: 4 }}>
          {loadingAnteriores ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--gab-text-muted)" }}>
              Carregando avaliações...
            </div>
          ) : avaliacoesFiltradas.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--gab-text-muted)" }}>
              {avaliacoesAnteriores.length === 0 
                ? "Nenhuma avaliação gerada ainda."
                : "Nenhuma avaliação encontrada na busca."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", color: "var(--gab-text-muted)" }}>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid var(--gab-border)", fontWeight: 600 }}>ID</th>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid var(--gab-border)", fontWeight: 600 }}>Data</th>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid var(--gab-border)", fontWeight: 600 }}>Título</th>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid var(--gab-border)", fontWeight: 600 }}>Tipo</th>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid var(--gab-border)", fontWeight: 600 }}>Tamanho</th>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid var(--gab-border)", fontWeight: 600 }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {avaliacoesFiltradas.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }} className="hover:bg-[rgba(255,255,255,0.02)]">
                      <td style={{ padding: "12px 14px", color: "var(--gab-text-muted)" }}>#{a.id}</td>
                      <td style={{ padding: "12px 14px" }}>{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 500, color: "var(--gab-cyan-light)" }}>{a.titulo}</td>
                      <td style={{ padding: "12px 14px" }}>{TIPOS_AVALIACAO.find((t) => t.id === a.tipo)?.label || a.tipo}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span>{a.num_questoes} Qts</span>
                        {a.formato_questoes === "mista" && (
                          <span style={{
                            marginLeft: 6, padding: "2px 6px", borderRadius: 5, fontSize: "0.65rem", fontWeight: 700,
                            background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.35)", color: "#fbbf24",
                          }}>MISTA</span>
                        )}
                        {a.formato_questoes === "certo_errado" && (
                          <span style={{
                            marginLeft: 6, padding: "2px 6px", borderRadius: 5, fontSize: "0.65rem", fontWeight: 700,
                            background: "rgba(6,182,212,0.14)", border: "1px solid rgba(6,182,212,0.35)", color: "#22d3ee",
                          }}>C/E</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            type="button"
                            className="gab-btn gab-btn-ghost gab-btn-sm"
                            onClick={() => carregarParaReimpressao(a)}
                            style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                          >
                            Carregar
                          </button>
                          <button
                            type="button"
                            className="gab-btn gab-btn-ghost gab-btn-sm"
                            style={{ color: "var(--gab-red-light, #ef4444)", padding: "6px 8px" }}
                            onClick={() => setDeleteModal(a)}
                            title="Excluir Avaliação"
                          >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Modal Premium de Confirmação de Exclusão ═══ */}
      {deleteModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            animation: "gab-fade-in 0.25s ease-out",
          }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, #1a1f2e 0%, #111827 100%)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 20, maxWidth: 440, width: "95%",
              padding: 0, overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(239,68,68,0.08)",
              animation: "gab-slide-up 0.35s ease-out",
            }}
          >
            {/* Header vermelha */}
            <div style={{
              padding: "24px 28px 16px",
              background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.03) 100%)",
              borderBottom: "1px solid rgba(239,68,68,0.15)",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem",
              }}>🗑️</div>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gab-red-light, #f87171)", letterSpacing: "0.5px" }}>
                  Excluir Avaliação
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                  Esta ação não poderá ser desfeita
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 28px" }}>
              <div style={{
                padding: "16px 20px", borderRadius: 12,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                marginBottom: 20,
              }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--gab-text-primary)", marginBottom: 6 }}>
                  {deleteModal.titulo}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "0.78rem", color: "var(--gab-text-muted)" }}>
                  <span>{deleteModal.num_questoes} questões</span>
                  <span>· {deleteModal.num_alternativas} alternativas</span>
                  <span>· Nota {deleteModal.nota_total}</span>
                  {deleteModal.bimestre && <span>· {deleteModal.bimestre}</span>}
                </div>
              </div>

              <div style={{
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)",
                fontSize: "0.8rem", color: "var(--gab-text-secondary)", lineHeight: 1.5,
              }}>
                ⚠️ Todos os dados vinculados a esta avaliação (gabarito oficial e notas) serão removidos permanentemente.
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: "16px 28px",
              background: "rgba(0,0,0,0.2)",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", justifyContent: "flex-end", gap: 12,
            }}>
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                style={{
                  padding: "10px 16px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600,
                  background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--gab-text-secondary)", cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--gab-text-primary)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gab-text-secondary)"; }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAvaliacao}
                style={{
                  padding: "10px 18px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600,
                  background: "var(--gab-red-light, #ef4444)", border: "none",
                  color: "#fff", cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239,68,68,0.25)",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(239,68,68,0.4)"; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(239,68,68,0.25)"; }}
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
