// ============================================================================
// ETAPA 2 — Correção em Lote por Turma
// ============================================================================
// Fluxo:
//   1) Coordenador seleciona avaliação (gabarito oficial já salvo)
//   2) Coordenador faz upload de pasta inteira (1 turma = 1 pasta)
//   3) Sistema lê QR Code de cada arquivo → identifica alunos
//   4) Professor vê lista de alunos com botão CORRIGIR
//   5) Clica CORRIGIR → compara com oficial → exibe resultado → SALVAR
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import ModalGabaritoOficial from "./components/ModalGabaritoOficial";

// Helper para montar URL pública de fotos (mesma lógica de HeaderGlobal)
const toPublicUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = (api.defaults.baseURL || "").replace(/\/api$/, "");
  return `${base}${path}`;
};

// Sub-etapas
const SUB = { AVALIACOES: 0, UPLOAD: 1, CORRECAO: 2 };

export default function GabaritoCorrigirLote() {
  // ─── Estado global ───
  const [subEtapa, setSubEtapa] = useState(SUB.AVALIACOES);
  const [toast, setToast] = useState(null);

  // ─── Sub-etapa 1: Seleção de avaliação ───
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [avaliacaoAtiva, setAvaliacaoAtiva] = useState(null);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(true);

  // ─── Sub-etapa 2: Upload + Lotes ───
  const [lotes, setLotes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // ─── Sub-etapa 3: Correção ───
  const [loteAtivo, setLoteAtivo] = useState(null);
  const [arquivos, setArquivos] = useState([]);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [correcao, setCorrecao] = useState(null);
  const [loadingCorrecao, setLoadingCorrecao] = useState(false);
  const [processandoQR, setProcessandoQR] = useState(false);
  const [expandedGab, setExpandedGab] = useState(null); // ID da avaliação com gabarito expandido
  const [deleteModal, setDeleteModal] = useState(null); // avaliação inteira para modal de exclusão
  const [deletingId, setDeletingId] = useState(null);
  const [modalGabaritoOpen, setModalGabaritoOpen] = useState(false);
  const [modalEditAvaliacao, setModalEditAvaliacao] = useState(null); // avaliação para abrir direto no step 2

  // ─── Vincular Professor ───
  const [professores, setProfessores] = useState([]);
  const [profModalLote, setProfModalLote] = useState(null); // lote para vincular professor
  const [profFiltro, setProfFiltro] = useState("");
  const [vinculandoProf, setVinculandoProf] = useState(false);

  // ─── Modal visualização de alunos (coordenador) ───
  const [modalAlunosLote, setModalAlunosLote] = useState(null); // lote aberto
  const [modalAlunosData, setModalAlunosData] = useState([]); // arquivos/alunos
  const [modalAlunosLoading, setModalAlunosLoading] = useState(false);

  // ─── Excluir lote (turma) ───
  const [deleteLoteModal, setDeleteLoteModal] = useState(null); // lote para confirmar exclusão
  const [deletingLoteId, setDeletingLoteId] = useState(null);

  // ─── Importar Notas para Diário ───
  const [importStatus, setImportStatus] = useState(null); // dados de status da importação
  const [importModalOpen, setImportModalOpen] = useState(false); // modal de confirmação
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState(null); // resultado após importação

  // ─── Governança (Avaliação Padrão Bimestral) ───
  const [avaliacaoConfig, setAvaliacaoConfig] = useState(null);

  // ─── Toast ───
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Buscar professores da escola ───
  async function fetchProfessores() {
    try {
      const resp = await api.get("/professores");
      const ativos = (resp.data || []).filter(p => p.status === "ativo");
      setProfessores(ativos);
    } catch {
      setProfessores([]);
    }
  }

  // ─── Vincular professor ao lote ───
  async function vincularProfessor(loteId, professorId) {
    setVinculandoProf(true);
    try {
      const resp = await api.put(`/gabarito-lotes/${loteId}/vincular-professor`, { professor_id: professorId });
      setLotes(prev => prev.map(l => l.id === loteId ? { ...l, professor_id: professorId, professor_nome: resp.data.professor_nome } : l));
      setProfModalLote(null);
      showToast("Professor vinculado com sucesso!", "success");
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao vincular professor.";
      showToast(msg, "error");
    }
    setVinculandoProf(false);
  }

  // IDs de professores já vinculados aos lotes da avaliação atual
  const professoresJaVinculados = lotes
    .filter(l => l.professor_id && l.id !== profModalLote?.id)
    .map(l => l.professor_id);

  // Professores disponíveis para o modal (exclui já vinculados + filtro de busca)
  const professoresDisponiveis = professores
    .filter(p => !professoresJaVinculados.includes(p.id))
    .filter(p => !profFiltro || p.nome.toLowerCase().includes(profFiltro.toLowerCase()));

  // Abrir modal de professor
  function abrirModalProfessor(lote, e) {
    e.stopPropagation();
    if (professores.length === 0) fetchProfessores();
    setProfFiltro("");
    setProfModalLote(lote);
  }

  // ─── Carregar avaliações ───
  useEffect(() => {
    (async () => {
      setLoadingAvaliacoes(true);
      try {
        const resp = await api.get("/api/gabarito-avaliacoes");
        setAvaliacoes(resp.data || []);
      } catch (err) {
        console.error("Erro ao carregar avaliações:", err);
      }
      setLoadingAvaliacoes(false);
    })();
  }, []);

  // ─── Buscar config de governança ───
  useEffect(() => {
    (async () => {
      try {
        const escolaId = localStorage.getItem("escola_id");
        if (escolaId) {
          const resp = await api.get("/api/governanca/avaliacao-config", {
            params: { escola_id: escolaId },
          });
          setAvaliacaoConfig(resp.data?.config || null);
        }
      } catch {
        setAvaliacaoConfig(null);
      }
    })();
  }, []);

  // ─── Selecionar avaliação ───
  function selecionarAvaliacao(av) {
    if (!av.gabarito_oficial || av.gabarito_oficial.length === 0) {
      showToast("Esta avaliação não tem gabarito oficial marcado. Marque na Etapa 1.", "error");
      return;
    }
    setAvaliacaoAtiva(av);
    setSubEtapa(SUB.UPLOAD);
    carregarLotes(av.id);
  }

  // ─── Excluir avaliação ───
  async function excluirAvaliacao(avId) {
    setDeletingId(avId);
    try {
      await api.delete(`/api/gabarito-avaliacoes/${avId}`);
      setAvaliacoes(prev => prev.filter(a => a.id !== avId));
      setDeleteModal(null);
      showToast("Avaliação excluída com sucesso!", "success");
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao excluir avaliação.";
      showToast(msg, "error");
    }
    setDeletingId(null);
  }

  // ─── Callback quando o modal salva o gabarito oficial ───
  function handleGabaritoSalvo(data) {
    setModalGabaritoOpen(false);
    showToast("Gabarito oficial salvo com sucesso!", "success");
    // Atualizar a avaliação na lista local
    setAvaliacoes(prev => prev.map(a =>
      a.id === data.id
        ? { ...a, gabarito_oficial: data.gabarito, status: "publicada" }
        : a
    ));
  }

  // ─── Carregar lotes de uma avaliação ───
  async function carregarLotes(avaliacaoId) {
    try {
      const resp = await api.get(`/api/gabarito-lotes?avaliacao_id=${avaliacaoId}`);
      setLotes(resp.data || []);
    } catch (err) {
      console.error("Erro ao carregar lotes:", err);
    }
    // Verificar status de importação
    verificarStatusImportacao(avaliacaoId);
  }

  // ─── Verificar se a avaliação está pronta para importação ───
  async function verificarStatusImportacao(avaliacaoId) {
    try {
      const resp = await api.get(`/api/gabarito-avaliacoes/${avaliacaoId}/status-importacao`);
      setImportStatus(resp.data);
    } catch {
      setImportStatus(null);
    }
  }

  // ─── Importar notas para diário ───
  async function handleImportarNotas() {
    if (!avaliacaoAtiva) return;
    setImportando(true);
    try {
      const resp = await api.post(`/api/gabarito-avaliacoes/${avaliacaoAtiva.id}/importar-notas`);
      setImportResultado(resp.data);
      setImportModalOpen(false);
      showToast(resp.data.message, "success");
      // Atualizar status
      verificarStatusImportacao(avaliacaoAtiva.id);
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao importar notas.";
      showToast(msg, "error");
    }
    setImportando(false);
  }

  // ─── Upload de pasta ───
  async function handleFolderUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Extrair nome da pasta do webkitRelativePath
    const firstPath = files[0].webkitRelativePath || "";
    const folderName = firstPath.split("/")[0] || "Turma";

    // Filtrar apenas imagens/PDFs
    const validFiles = files.filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["jpg", "jpeg", "png", "pdf"].includes(ext);
    });

    if (validFiles.length === 0) {
      showToast("Nenhum arquivo válido encontrado na pasta.", "error");
      return;
    }

    setUploading(true);
    setUploadProgress({ nome: folderName, total: validFiles.length, enviados: 0 });

    try {
      const formData = new FormData();
      formData.append("avaliacao_id", avaliacaoAtiva.id);
      formData.append("turma_nome", folderName);
      validFiles.forEach(f => formData.append("files", f));

      const resp = await api.post("/api/gabarito-lotes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => {
          if (p.total) {
            setUploadProgress(prev => ({
              ...prev,
              enviados: Math.round((p.loaded / p.total) * validFiles.length),
            }));
          }
        },
      });

      showToast(`${resp.data.total_arquivos} gabaritos enviados para "${folderName}"!`, "success");
      carregarLotes(avaliacaoAtiva.id);
    } catch (err) {
      console.error("Erro no upload:", err);
      showToast("Erro ao enviar arquivos.", "error");
    }
    setUploading(false);
    setUploadProgress(null);
    e.target.value = ""; // reset input
  }

  // ─── Upload avulso (arquivos individuais para um lote existente) ───
  async function uploadArquivoAvulso(lote, files) {
    const validFiles = Array.from(files).filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["jpg", "jpeg", "png", "pdf"].includes(ext);
    });
    if (validFiles.length === 0) {
      showToast("Nenhum arquivo válido selecionado.", "error");
      return;
    }

    setUploading(true);
    setUploadProgress({ nome: lote.turma_nome, total: validFiles.length, enviados: 0 });

    try {
      const formData = new FormData();
      formData.append("avaliacao_id", avaliacaoAtiva.id);
      formData.append("turma_nome", lote.turma_nome);
      validFiles.forEach(f => formData.append("files", f));

      const resp = await api.post("/api/gabarito-lotes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => {
          if (p.total) {
            setUploadProgress(prev => ({
              ...prev,
              enviados: Math.round((p.loaded / p.total) * validFiles.length),
            }));
          }
        },
      });

      showToast(`${resp.data.total_arquivos} gabarito(s) adicionado(s) à turma "${lote.turma_nome}"!`, "success");
      carregarLotes(avaliacaoAtiva.id);
    } catch (err) {
      console.error("Erro no upload avulso:", err);
      showToast("Erro ao enviar arquivo(s).", "error");
    }
    setUploading(false);
    setUploadProgress(null);
  }

  // ─── Abrir lote (turma) — modal de visualização (coordenador) ───
  async function abrirLote(lote) {
    setModalAlunosLote(lote);
    setModalAlunosData([]);
    setModalAlunosLoading(true);

    try {
      const resp = await api.get(`/api/gabarito-lotes/${lote.id}/arquivos`);
      setModalAlunosData(resp.data || []);
    } catch (err) {
      console.error("Erro ao carregar arquivos:", err);
      showToast("Erro ao carregar arquivos do lote.", "error");
    }
    setModalAlunosLoading(false);
  }

  // ─── Excluir lote (turma) ───
  async function excluirLote(loteId) {
    setDeletingLoteId(loteId);
    try {
      await api.delete(`/api/gabarito-lotes/${loteId}`);
      setLotes(prev => prev.filter(l => l.id !== loteId));
      setDeleteLoteModal(null);
      showToast("Turma e gabaritos excluídos com sucesso!", "success");
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao excluir turma.";
      showToast(msg, "error");
    }
    setDeletingLoteId(null);
  }

  // ─── Corrigir arquivo individual ───
  async function corrigirArquivo(arq) {
    setArquivoSelecionado(arq);
    setCorrecao(null);
    setLoadingCorrecao(true);

    try {
      const resp = await api.post(`/api/gabarito-lotes/arquivos/${arq.id}/corrigir`);
      setCorrecao(resp.data);

      // Atualizar status na lista
      setArquivos(prev => prev.map(a =>
        a.id === arq.id ? { ...a, status: "corrigido", acertos: resp.data.acertos, nota: resp.data.nota } : a
      ));

      showToast(`${arq.nome_aluno || arq.codigo_aluno}: ${resp.data.acertos}/${resp.data.totalQuestoes} acertos!`, "success");
    } catch (err) {
      console.error("Erro ao corrigir:", err);
      showToast("Erro ao corrigir gabarito.", "error");
    }
    setLoadingCorrecao(false);
  }

  // ─── Corrigir todos automaticamente ───
  async function corrigirTodos() {
    const naoCorrigidos = arquivos.filter(a => a.status === "identificado");
    if (naoCorrigidos.length === 0) {
      showToast("Todos os gabaritos já foram corrigidos!", "success");
      return;
    }

    setLoadingCorrecao(true);
    let corrigidos = 0;

    for (const arq of naoCorrigidos) {
      try {
        const resp = await api.post(`/api/gabarito-lotes/arquivos/${arq.id}/corrigir`);
        setArquivos(prev => prev.map(a =>
          a.id === arq.id ? { ...a, status: "corrigido", acertos: resp.data.acertos, nota: resp.data.nota } : a
        ));
        corrigidos++;
      } catch (err) {
        console.error(`Erro ao corrigir ${arq.id}:`, err);
      }
    }

    showToast(`${corrigidos} gabaritos corrigidos automaticamente!`, "success");
    setLoadingCorrecao(false);
    carregarLotes(avaliacaoAtiva.id); // Atualizar contadores
  }

  // ─── Helper: ícone de status ───
  function statusIcon(status) {
    switch (status) {
      case "corrigido": return "✅";
      case "identificado": return "🔵";
      case "erro": return "❌";
      default: return "⏳";
    }
  }

  function statusLabel(status) {
    switch (status) {
      case "corrigido": return "Corrigido";
      case "identificado": return "Pronto";
      case "erro": return "Erro";
      default: return "Processando";
    }
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="gab-flex gab-flex-col gab-gap-24">
      <style>{`
        @keyframes gabPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes gabSlideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .gab-lote-card {
          padding: 18px 22px; border-radius: 14px; cursor: pointer; transition: all 0.2s;
          background: var(--gab-surface, #1a1f2e); border: 1px solid rgba(255,255,255,0.06);
        }
        .gab-lote-card:hover { border-color: rgba(6,182,212,0.3); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .gab-aluno-row {
          display: flex; align-items: center; padding: 12px 16px; border-radius: 10px;
          transition: all 0.15s; cursor: pointer; gap: 12px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);
        }
        .gab-aluno-row:hover { background: rgba(6,182,212,0.04); border-color: rgba(6,182,212,0.15); }
        .gab-aluno-row.active { background: rgba(6,182,212,0.08); border-color: rgba(6,182,212,0.3); }
        .gab-aluno-row.corrigido { border-left: 3px solid var(--gab-green-light, #10b981); }
        .gab-breadcrumb {
          display: flex; align-items: center; gap: 8px; font-size: 0.85rem;
          color: var(--gab-text-muted, #94a3b8);
        }
        .gab-breadcrumb span { cursor: pointer; transition: color 0.2s; }
        .gab-breadcrumb span:hover { color: var(--gab-cyan-light, #06b6d4); }
        .gab-folder-upload {
          border: 2px dashed rgba(6,182,212,0.2); border-radius: 16px; padding: 40px;
          text-align: center; cursor: pointer; transition: all 0.3s;
          background: rgba(6,182,212,0.02);
        }
        .gab-folder-upload:hover { border-color: rgba(6,182,212,0.4); background: rgba(6,182,212,0.04); }
        .gab-progress-ring { width: 32px; height: 32px; animation: gabPulse 1.5s infinite; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`gab-toast gab-toast-${toast.type}`} style={{ position: "fixed", top: 20, right: 20, zIndex: 9999 }}>
          {toast.type === "success" ? (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* ═══ Breadcrumb ═══ */}
      <div className="gab-breadcrumb">
        <span onClick={() => { setSubEtapa(SUB.AVALIACOES); setAvaliacaoAtiva(null); setLoteAtivo(null); }}>
          📋 Avaliações
        </span>
        {avaliacaoAtiva && (
          <>
            <span style={{ color: "var(--gab-text-muted)" }}>›</span>
            <span onClick={() => { setSubEtapa(SUB.UPLOAD); setLoteAtivo(null); }}>
              {avaliacaoAtiva.titulo}
            </span>
          </>
        )}
        {loteAtivo && (
          <>
            <span style={{ color: "var(--gab-text-muted)" }}>›</span>
            <span>{loteAtivo.turma_nome}</span>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SUB-ETAPA 1: SELECIONAR AVALIAÇÃO                 */}
      {/* ═══════════════════════════════════════════════════ */}
      {subEtapa === SUB.AVALIACOES && (
        <div className="gab-card">
          <div className="gab-card-header">
            <div className="gab-card-icon cyan">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div className="gab-card-title">Selecione a Avaliação</div>
          </div>

          {loadingAvaliacoes ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="gab-spinner gab-spinner-lg" style={{ margin: "0 auto 16px" }} />
              <div style={{ color: "var(--gab-text-muted)" }}>Carregando avaliações...</div>
            </div>
          ) : avaliacoes.length === 0 ? (
            <div className="gab-empty-state">
              <div className="gab-empty-title">Nenhuma avaliação publicada</div>
              <div className="gab-empty-text">
                Crie e publique uma avaliação na Etapa 1 com o gabarito oficial marcado.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16 }}>
              {avaliacoes.map(av => {
                const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                const temGabarito = av.gabarito_oficial && av.gabarito_oficial.length > 0;
                const isExpanded = expandedGab === av.id;

                return (
                  <div key={av.id} className="gab-lote-card" style={{ cursor: "default" }}>
                    {/* Cabeçalho do card */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => selecionarAvaliacao(av)}>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gab-text-primary)", marginBottom: 4 }}>
                          {av.titulo}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                          {av.num_questoes} questões · {av.num_alternativas} alternativas · Nota {av.nota_total}
                          {av.bimestre ? ` · ${av.bimestre}` : ""}
                        </div>
                      </div>
                      {/* Badge de status */}
                      <div style={{
                        padding: "3px 10px", borderRadius: 8, fontSize: "0.65rem", fontWeight: 700, whiteSpace: "nowrap",
                        marginLeft: 12,
                        background: temGabarito ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                        color: temGabarito ? "var(--gab-green-light, #10b981)" : "var(--gab-amber-light, #f59e0b)",
                        border: `1px solid ${temGabarito ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                      }}>
                        {temGabarito ? "✓ OFICIAL" : "✗ SEM GABARITO"}
                      </div>
                    </div>

                    {/* Tags de disciplinas */}
                    {av.disciplinas_config && av.disciplinas_config.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                        {av.disciplinas_config.map((dc, i) => (
                          <span key={i} style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600,
                            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)",
                            color: "var(--gab-purple-light, #a78bfa)",
                          }}>
                            {dc.nome} ({dc.de}–{dc.ate})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Botões de ação */}
                    <div style={{ display: "flex", gap: 8, marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
                      {/* Botão selecionar/corrigir */}
                      <button
                        className="gab-btn gab-btn-primary gab-btn-sm"
                        onClick={() => selecionarAvaliacao(av)}
                        style={{ flex: 1, fontSize: "0.75rem", padding: "6px 12px" }}
                        disabled={!temGabarito}
                      >
                        📁 Selecionar
                      </button>

                      {/* Botão ver gabarito oficial */}
                      {temGabarito && (
                        <button
                          className="gab-btn gab-btn-sm"
                          onClick={(e) => { e.stopPropagation(); setExpandedGab(isExpanded ? null : av.id); }}
                          style={{
                            fontSize: "0.75rem", padding: "6px 12px",
                            background: isExpanded ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${isExpanded ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.1)"}`,
                            color: isExpanded ? "var(--gab-cyan-light)" : "var(--gab-text-muted)",
                            cursor: "pointer", borderRadius: 8, transition: "all 0.2s",
                          }}
                        >
                          {isExpanded ? "🔽 Fechar" : "👁 Ver"}
                        </button>
                      )}

                      {/* Botão editar gabarito oficial — abre direto na avaliação */}
                      <button
                        className="gab-btn gab-btn-sm"
                        onClick={(e) => { e.stopPropagation(); setModalEditAvaliacao(av); setModalGabaritoOpen(true); }}
                        style={{
                          fontSize: "0.75rem", padding: "6px 12px",
                          background: temGabarito ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
                          border: `1px solid ${temGabarito ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
                          color: temGabarito ? "var(--gab-amber-light, #f59e0b)" : "var(--gab-green-light, #10b981)",
                          cursor: "pointer", borderRadius: 8, transition: "all 0.2s",
                        }}
                      >
                        {temGabarito ? "✏️ Editar" : "➕ Marcar"}
                      </button>

                      {/* Botão excluir — abre modal premium */}
                      <button
                        className="gab-btn gab-btn-sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteModal(av); }}
                        disabled={deletingId === av.id}
                        style={{
                          fontSize: "0.75rem", padding: "6px 14px",
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.15)",
                          color: "var(--gab-red-light, #f87171)",
                          cursor: "pointer", borderRadius: 8, transition: "all 0.2s",
                        }}
                        title="Excluir avaliação"
                      >
                        🗑️ Excluir
                      </button>
                    </div>

                    {/* Grade do gabarito oficial (expandido) */}
                    {isExpanded && temGabarito && (
                      <div style={{
                        marginTop: 12, padding: 12, borderRadius: 10,
                        background: "rgba(6,182,212,0.03)", border: "1px solid rgba(6,182,212,0.1)",
                        animation: "gabSlideIn 0.3s ease-out",
                      }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--gab-cyan-light)", marginBottom: 8 }}>
                          GABARITO OFICIAL — {av.gabarito_oficial.length} QUESTÕES
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {av.gabarito_oficial.map((resp, idx) => (
                            <div key={idx} style={{
                              width: 36, height: 36, borderRadius: 6,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)",
                              fontSize: "0.6rem", lineHeight: 1,
                            }}>
                              <span style={{ color: "var(--gab-text-muted)", fontSize: "0.55rem" }}>{String(idx + 1).padStart(2, "0")}</span>
                              <span style={{ color: "var(--gab-cyan-light)", fontWeight: 800, fontSize: "0.85rem" }}>{resp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SUB-ETAPA 2: UPLOAD POR TURMA                     */}
      {/* ═══════════════════════════════════════════════════ */}
      {subEtapa === SUB.UPLOAD && avaliacaoAtiva && (
        <>
          {/* Info da avaliação */}
          <div className="gab-card" style={{ padding: "16px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                  {avaliacaoAtiva.titulo}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                  {avaliacaoAtiva.num_questoes} questões · Nota {avaliacaoAtiva.nota_total}
                  {avaliacaoAtiva.bimestre ? ` · ${avaliacaoAtiva.bimestre}` : ""}
                </div>
              </div>
              <div style={{
                padding: "4px 12px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 700,
                background: "rgba(16,185,129,0.1)", color: "var(--gab-green-light, #10b981)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}>
                ✓ Gabarito Oficial Definido
              </div>
            </div>
          </div>

          {/* Zona de upload de pasta */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon cyan">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <div className="gab-card-title">Upload de Gabaritos por Turma</div>
            </div>

            <label className="gab-folder-upload" style={{ display: "block" }}>
              <input
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderUpload}
                style={{ display: "none" }}
                disabled={uploading}
              />
              {uploading ? (
                <div>
                  <div className="gab-spinner gab-spinner-lg" style={{ margin: "0 auto 16px" }} />
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--gab-text-primary)" }}>
                    Enviando {uploadProgress?.total || 0} gabaritos...
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                    Pasta: {uploadProgress?.nome || ""}
                  </div>
                </div>
              ) : (
                <div>
                  <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}
                    style={{ margin: "0 auto 16px", display: "block", color: "var(--gab-cyan-light, #06b6d4)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gab-text-primary)", marginBottom: 6 }}>
                    Clique para selecionar uma Pasta
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                    Selecione a pasta da turma (ex: "6º ANO A") contendo os gabaritos escaneados em JPG/PNG
                  </div>
                </div>
              )}
            </label>
          </div>

          {/* Lotes enviados */}
          {lotes.length > 0 && (
            <div className="gab-card">
              <div className="gab-card-header">
                <div className="gab-card-icon green">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                  </svg>
                </div>
                <div className="gab-card-title">Turmas Enviadas ({lotes.length})</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {lotes.map(lote => {
                  const total = lote.total_arquivos_real || lote.total_arquivos || 0;
                  const corrigidos = lote.total_corrigidos_real || lote.total_corrigidos || 0;
                  const pct = total > 0 ? Math.round((corrigidos / total) * 100) : 0;
                  const isFinalizado = lote.status === "finalizado";

                  return (
                    <div key={lote.id} className="gab-lote-card" onClick={() => abrirLote(lote)}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                          📁 {lote.turma_nome}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {/* Botão vincular professor — BEM VISÍVEL */}
                          <button
                            onClick={(e) => abrirModalProfessor(lote, e)}
                            title={lote.professor_id ? `Prof: ${lote.professor_nome}` : "Vincular professor"}
                            style={{
                              width: 32, height: 32, borderRadius: 8, border: "none",
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.9rem", transition: "all 0.2s",
                              background: lote.professor_id
                                ? "linear-gradient(135deg, #10b981, #059669)"
                                : "linear-gradient(135deg, #ef4444, #dc2626)",
                              boxShadow: lote.professor_id
                                ? "0 2px 10px rgba(16,185,129,0.4)"
                                : "0 2px 10px rgba(239,68,68,0.4)",
                            }}
                          >
                            👨‍🏫
                          </button>
                          <span style={{
                            padding: "2px 8px", borderRadius: 10, fontSize: "0.65rem", fontWeight: 700,
                            background: isFinalizado ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                            color: isFinalizado ? "var(--gab-green-light)" : "var(--gab-amber-light, #f59e0b)",
                            border: `1px solid ${isFinalizado ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                          }}>
                            {isFinalizado ? "FINALIZADO" : `${pct}%`}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                          {total} gabaritos · {corrigidos} corrigidos
                        </div>
                        {/* Botão (+) Upload avulso */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const input = document.createElement("input");
                            input.type = "file";
                            input.multiple = true;
                            input.accept = ".jpg,.jpeg,.png,.pdf";
                            input.onchange = (ev) => uploadArquivoAvulso(lote, ev.target.files);
                            input.click();
                          }}
                          title="Adicionar gabarito(s) avulso(s)"
                          disabled={uploading}
                          style={{
                            width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(6,182,212,0.25)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(6,182,212,0.08)", transition: "all 0.2s",
                            opacity: uploading ? 0.4 : 1,
                          }}
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22d3ee" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                        {/* Botão (x) Excluir lote */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteLoteModal(lote);
                          }}
                          title="Excluir turma e gabaritos"
                          style={{
                            width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(239,68,68,0.25)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(239,68,68,0.08)", transition: "all 0.2s",
                          }}
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {/* Barra de progresso */}
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 2, transition: "width 0.5s ease-out",
                          width: `${pct}%`,
                          background: isFinalizado
                            ? "var(--gab-green-light, #10b981)"
                            : "linear-gradient(90deg, #06b6d4, #8b5cf6)",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ CARD: IMPORTAR NOTAS PARA DIÁRIO ═══ */}
          {importStatus && (avaliacaoAtiva?.tipo === "prova_padronizada" || avaliacaoConfig?.["escola.avaliacao_padrao_bimestral"] === "1") && lotes.length > 0 && (
            <div className="gab-card" style={{
              border: importStatus.jaImportou
                ? "1px solid rgba(16,185,129,0.25)"
                : importStatus.pronta
                ? "1px solid rgba(139,92,246,0.3)"
                : "1px solid rgba(255,255,255,0.06)",
              background: importStatus.jaImportou
                ? "rgba(16,185,129,0.03)"
                : importStatus.pronta
                ? "rgba(139,92,246,0.03)"
                : undefined,
            }}>
              <div className="gab-card-header">
                <div className="gab-card-icon" style={{
                  background: importStatus.jaImportou
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(139,92,246,0.1)",
                  color: importStatus.jaImportou
                    ? "var(--gab-green-light, #10b981)"
                    : "var(--gab-purple-light, #a78bfa)",
                }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div className="gab-card-title">
                  {importStatus.jaImportou ? "✓ Notas Importadas para o Diário" : "Importar Notas para o Diário"}
                </div>
              </div>

              {/* Status Info */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 10, marginBottom: 16,
              }}>
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--gab-text-muted)", marginBottom: 2 }}>LOTES</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: importStatus.todosFinalizados ? "var(--gab-green-light)" : "var(--gab-amber-light, #f59e0b)" }}>
                    {importStatus.lotesFinalizados}/{importStatus.totalLotes}
                    <span style={{ fontSize: "0.65rem", fontWeight: 400, marginLeft: 4 }}>finalizados</span>
                  </div>
                </div>
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--gab-text-muted)", marginBottom: 2 }}>ALUNOS</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--gab-cyan-light, #22d3ee)" }}>
                    {importStatus.totalRespostas}
                    <span style={{ fontSize: "0.65rem", fontWeight: 400, marginLeft: 4 }}>corrigidos</span>
                  </div>
                </div>
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--gab-text-muted)", marginBottom: 2 }}>DISCIPLINAS</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--gab-purple-light, #a78bfa)" }}>
                    {importStatus.disciplinas?.length || 0}
                  </div>
                </div>
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--gab-text-muted)", marginBottom: 2 }}>BIMESTRE</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--gab-text-primary)" }}>
                    {importStatus.bimestre || "—"}
                  </div>
                </div>
              </div>

              {/* Disciplinas tags */}
              {importStatus.disciplinas?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {importStatus.disciplinas.map((dc, i) => (
                    <span key={i} style={{
                      padding: "3px 10px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 600,
                      background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)",
                      color: "var(--gab-purple-light, #a78bfa)",
                    }}>
                      {dc.nome} (Q{dc.de}–{dc.ate})
                    </span>
                  ))}
                </div>
              )}

              {/* Mensagem sobre a regra de importação */}
              {!importStatus.jaImportou && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, fontSize: "0.75rem",
                  background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)",
                  color: "var(--gab-text-muted)", marginBottom: 16, lineHeight: 1.5,
                }}>
                  {avaliacaoConfig?.["nota.avaliacao_padrao.bimestral"] === "1" ? (
                    <>
                      📋 A <strong style={{ color: "var(--gab-text-primary)" }}>nota total</strong> de cada aluno será lançada igualmente em 
                      <strong style={{ color: "var(--gab-purple-light)" }}> {importStatus.disciplinas?.length || 0} disciplina(s)</strong> no diário 
                      do <strong style={{ color: "var(--gab-text-primary)" }}>{importStatus.bimestre || "bimestre"}</strong>.
                      <br /><span style={{ color: "var(--gab-amber-light, #f59e0b)", fontWeight: 600 }}>Modo: Nota por área ativado</span> — todas as disciplinas recebem a mesma nota total.
                    </>
                  ) : (
                    <>
                      📋 Cada disciplina receberá sua <strong style={{ color: "var(--gab-text-primary)" }}>nota proporcional</strong> baseada nos acertos por faixa de questões 
                      no diário do <strong style={{ color: "var(--gab-text-primary)" }}>{importStatus.bimestre || "bimestre"}</strong>.
                    </>
                  )}
                </div>
              )}

              {/* Botão de ação */}
              {importStatus.jaImportou ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  borderRadius: 10, background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.15)",
                }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--gab-green-light, #10b981)" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gab-green-light, #10b981)" }}>
                      Notas já foram importadas para o diário
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                      As notas desta prova padronizada já foram transferidas para o diário dos professores.
                    </div>
                  </div>
                </div>
              ) : !importStatus.todosFinalizados ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  borderRadius: 10, background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.15)",
                }}>
                  <span style={{ fontSize: "1.2rem" }}>⏳</span>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gab-amber-light, #f59e0b)" }}>
                      Correção em andamento
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                      Finalize a correção de todos os lotes ({importStatus.lotesFinalizados}/{importStatus.totalLotes}) para habilitar a importação.
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  className="gab-btn gab-btn-sm"
                  onClick={() => setImportModalOpen(true)}
                  style={{
                    width: "100%", padding: "14px 20px", fontSize: "0.9rem", fontWeight: 700,
                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    border: "none", borderRadius: 12, cursor: "pointer",
                    color: "#fff", transition: "all 0.3s",
                    boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Importar Notas para o Diário
                </button>
              )}
            </div>
          )}

          {/* ─── Modal de Resultado da Importação ─── */}
          {importResultado && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} onClick={() => setImportResultado(null)}>
              <div onClick={e => e.stopPropagation()} style={{
                background: "var(--gab-surface, #1a1f2e)", borderRadius: 20,
                border: "1px solid rgba(16,185,129,0.2)", padding: "32px",
                width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto",
                boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
              }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.5rem",
                  }}>✓</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gab-text-primary)" }}>
                    Importação Concluída!
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                    {importResultado.message}
                  </div>
                </div>

                {/* Resumo em grid */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20,
                }}>
                  {[
                    { label: "Alunos", value: importResultado.resumo?.alunosImportados, color: "#22d3ee" },
                    { label: "Notas inseridas", value: importResultado.resumo?.notasInseridas, color: "#10b981" },
                    { label: "Notas atualizadas", value: importResultado.resumo?.notasAtualizadas, color: "#f59e0b" },
                  ].map((item, i) => (
                    <div key={i} style={{
                      padding: "12px", borderRadius: 10, textAlign: "center",
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: item.color }}>{item.value || 0}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--gab-text-muted)", marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Disciplinas + Bimestre */}
                <div style={{
                  padding: "10px 14px", borderRadius: 10, fontSize: "0.78rem",
                  background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)",
                  color: "var(--gab-text-muted)", marginBottom: 16,
                }}>
                  <strong style={{ color: "var(--gab-purple-light)" }}>Disciplinas:</strong> {importResultado.resumo?.disciplinas || "—"}
                  <br />
                  <strong style={{ color: "var(--gab-text-primary)" }}>Bimestre:</strong> {importResultado.resumo?.bimestre || "—"}
                </div>

                {/* Erros (se houver) */}
                {importResultado.resumo?.erros > 0 && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 10, fontSize: "0.75rem",
                    background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)",
                    color: "var(--gab-text-muted)", marginBottom: 16,
                  }}>
                    <div style={{ fontWeight: 700, color: "var(--gab-amber-light, #f59e0b)", marginBottom: 6 }}>
                      ⚠️ {importResultado.resumo.erros} aluno(s) não importado(s):
                    </div>
                    {importResultado.resumo.detalheErros?.map((e, i) => (
                      <div key={i} style={{ marginBottom: 3 }}>
                        • <strong>{e.codigo}</strong>{e.nome ? ` (${e.nome})` : ""}: {e.motivo}
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão fechar */}
                <button
                  className="gab-btn gab-btn-primary"
                  onClick={() => setImportResultado(null)}
                  style={{ width: "100%", padding: "12px", fontSize: "0.88rem" }}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SUB-ETAPA 3: CORREÇÃO POR TURMA                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {subEtapa === SUB.CORRECAO && loteAtivo && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>
          {/* ─── Coluna esquerda: Lista de alunos ─── */}
          <div className="gab-card" style={{ padding: 0, maxHeight: "calc(100vh - 180px)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--gab-text-primary)", marginBottom: 4 }}>
                📁 {loteAtivo.turma_nome}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                {arquivos.filter(a => a.status === "corrigido").length}/{arquivos.length} corrigidos
              </div>

              {/* Botão Corrigir Todos */}
              {arquivos.some(a => a.status === "identificado") && (
                <button
                  className="gab-btn gab-btn-primary gab-btn-sm"
                  onClick={corrigirTodos}
                  disabled={loadingCorrecao}
                  style={{ width: "100%", marginTop: 10 }}
                >
                  {loadingCorrecao ? (
                    <><div className="gab-spinner" /> Corrigindo...</>
                  ) : (
                    <>⚡ Corrigir Todos Automaticamente</>
                  )}
                </button>
              )}
            </div>

            {/* Lista de alunos */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {processandoQR && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div className="gab-spinner" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                    Lendo QR Codes e identificando alunos...
                  </div>
                </div>
              )}

              {arquivos.map((arq, idx) => (
                <div
                  key={arq.id}
                  className={`gab-aluno-row ${arq.status === "corrigido" ? "corrigido" : ""} ${arquivoSelecionado?.id === arq.id ? "active" : ""}`}
                  onClick={() => arq.status !== "pendente" && corrigirArquivo(arq)}
                  style={{
                    marginBottom: 6,
                    animation: `gabSlideIn 0.3s ease-out ${idx * 0.03}s both`,
                    opacity: arq.status === "pendente" ? 0.5 : 1,
                    cursor: arq.status === "pendente" ? "wait" : "pointer",
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{statusIcon(arq.status)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.85rem", fontWeight: 600,
                      color: "var(--gab-text-primary)", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {arq.nome_aluno || arq.codigo_aluno || arq.arquivo_nome}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--gab-text-muted)" }}>
                      {arq.codigo_aluno ? `RE: ${arq.codigo_aluno}` : statusLabel(arq.status)}
                    </div>
                  </div>
                  {arq.status === "corrigido" && arq.nota != null && (
                    <div style={{
                      padding: "2px 10px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700,
                      background: "rgba(16,185,129,0.1)", color: "var(--gab-green-light)",
                    }}>
                      {Number(arq.nota).toFixed(1)}
                    </div>
                  )}
                  {arq.status === "identificado" && (
                    <button
                      className="gab-btn gab-btn-primary gab-btn-sm"
                      onClick={(e) => { e.stopPropagation(); corrigirArquivo(arq); }}
                      style={{ padding: "4px 12px", fontSize: "0.7rem" }}
                    >
                      Corrigir
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Coluna direita: Resultado da correção ─── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            {loadingCorrecao && !correcao && (
              <div className="gab-card" style={{ textAlign: "center", padding: 60 }}>
                <div className="gab-spinner gab-spinner-lg" style={{ margin: "0 auto 16px" }} />
                <div style={{ color: "var(--gab-text-muted)" }}>Corrigindo gabarito...</div>
              </div>
            )}

            {correcao && arquivoSelecionado && (
              <>
                {/* Card: Nota e Resumo */}
                <div className="gab-card" style={{ animation: "gabSlideIn 0.4s ease-out" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${correcao.nota / correcao.notaTotal >= 0.6 ? "#10b981, #059669" : "#ef4444, #dc2626"})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.2rem", fontWeight: 800, color: "white",
                      }}>
                        {correcao.nota.toFixed(1)}
                      </div>
                      <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                          {arquivoSelecionado.nome_aluno || arquivoSelecionado.codigo_aluno || "Aluno"}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--gab-text-muted)" }}>
                          {correcao.acertos} de {correcao.totalQuestoes} acertos ·
                          {" "}{Math.round((correcao.acertos / correcao.totalQuestoes) * 100)}% aproveitamento
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: "6px 16px", borderRadius: 10, fontSize: "0.8rem", fontWeight: 700,
                      background: correcao.nota / correcao.notaTotal >= 0.6 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      color: correcao.nota / correcao.notaTotal >= 0.6 ? "var(--gab-green-light)" : "var(--gab-red-light, #ef4444)",
                    }}>
                      {correcao.nota / correcao.notaTotal >= 0.6 ? "✓ Aprovado" : "Recuperação"}
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="gab-progress" style={{ marginTop: 12 }}>
                    <div className="gab-progress-bar" style={{ width: `${(correcao.acertos / correcao.totalQuestoes) * 100}%` }} />
                  </div>
                </div>

                {/* Card: Detalhamento por Questão */}
                <div className="gab-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px 10px" }}>
                    <div className="gab-card-title">Detalhamento Questão a Questão</div>
                  </div>
                  <div className="gab-table-wrap" style={{ border: "none", borderRadius: 0, overflowX: "auto" }}>
                    <table className="gab-table">
                      <thead>
                        <tr>
                          <th style={{ width: 100, position: "sticky", left: 0, background: "var(--gab-surface, #1a1f2e)", zIndex: 1 }}></th>
                          {correcao.resultado.map(q => (
                            <th key={q.numero} style={{ minWidth: 40, textAlign: "center" }}>
                              {String(q.numero).padStart(2, "0")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 700, position: "sticky", left: 0, background: "var(--gab-surface, #1a1f2e)", zIndex: 1 }}>OFICIAL</td>
                          {correcao.resultado.map(q => (
                            <td key={q.numero} style={{ fontWeight: 600, textAlign: "center" }}>{q.correto}</td>
                          ))}
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, position: "sticky", left: 0, background: "var(--gab-surface, #1a1f2e)", zIndex: 1 }}>ALUNO</td>
                          {correcao.resultado.map(q => (
                            <td key={q.numero} style={{ textAlign: "center" }}>{q.resposta || "—"}</td>
                          ))}
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, position: "sticky", left: 0, background: "var(--gab-surface, #1a1f2e)", zIndex: 1 }}>RESULTADO</td>
                          {correcao.resultado.map(q => (
                            <td key={q.numero} style={{
                              textAlign: "center", fontWeight: 700, fontSize: "1rem",
                              color: q.acertou ? "var(--gab-green-light, #10b981)" : "var(--gab-red-light, #ef4444)",
                            }}>
                              {q.acertou ? "✓" : "✗"}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Card: Acertos por disciplina */}
                {correcao.acertosPorDisciplina && correcao.acertosPorDisciplina.length > 0 && (
                  <div className="gab-card">
                    <div className="gab-card-title" style={{ marginBottom: 16 }}>Desempenho por Disciplina</div>
                    {correcao.acertosPorDisciplina.map((d, idx) => {
                      const pct = d.total > 0 ? Math.round((d.acertos / d.total) * 100) : 0;
                      return (
                        <div key={idx} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gab-text-primary)" }}>
                              {d.nome}
                            </span>
                            <span style={{
                              fontSize: "0.75rem", fontWeight: 700,
                              color: pct >= 60 ? "var(--gab-green-light)" : pct >= 40 ? "var(--gab-amber-light)" : "var(--gab-red-light)",
                            }}>
                              {d.acertos}/{d.total} ({pct}%)
                            </span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 3, transition: "width 0.6s ease-out",
                              width: `${pct}%`,
                              background: pct >= 60 ? "var(--gab-green-light)" : pct >= 40 ? "var(--gab-amber-light)" : "var(--gab-red-light)",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!correcao && !loadingCorrecao && (
              <div className="gab-card" style={{ textAlign: "center", padding: 60 }}>
                <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}
                  style={{ margin: "0 auto 16px", display: "block", color: "var(--gab-text-muted)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gab-text-primary)", marginBottom: 6 }}>
                  Resultado da Correção
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--gab-text-muted)" }}>
                  Selecione um aluno na lista à esquerda e clique em "Corrigir" para ver o resultado aqui.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para marcar/editar gabarito oficial */}
      <ModalGabaritoOficial
        open={modalGabaritoOpen}
        onClose={() => { setModalGabaritoOpen(false); setModalEditAvaliacao(null); }}
        onSave={handleGabaritoSalvo}
        avaliacaoInicial={modalEditAvaliacao}
      />

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
                {deleteModal.disciplinas_config && deleteModal.disciplinas_config.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                    {deleteModal.disciplinas_config.map((dc, i) => (
                      <span key={i} style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600,
                        background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)",
                        color: "var(--gab-purple-light, #a78bfa)",
                      }}>
                        {dc.nome} ({dc.de}–{dc.ate})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)",
                fontSize: "0.8rem", color: "var(--gab-text-secondary)", lineHeight: 1.5,
              }}>
                ⚠️ Todos os dados vinculados a esta avaliação (gabarito oficial, lotes e correções) serão removidos permanentemente.
              </div>
            </div>

            {/* Footer com botões */}
            <div style={{
              padding: "16px 28px 24px",
              display: "flex", justifyContent: "flex-end", gap: 10,
            }}>
              <button
                className="gab-btn gab-btn-ghost"
                onClick={() => setDeleteModal(null)}
                type="button"
                style={{ padding: "10px 24px" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirAvaliacao(deleteModal.id)}
                disabled={deletingId === deleteModal.id}
                type="button"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 24px", borderRadius: 10, fontSize: "0.88rem", fontWeight: 700,
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff", border: "none", cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(239,68,68,0.3)",
                  transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                  opacity: deletingId === deleteModal.id ? 0.6 : 1,
                }}
              >
                {deletingId === deleteModal.id ? (
                  <><div className="gab-spinner" /> Excluindo...</>
                ) : (
                  <>🗑️ Sim, Excluir Avaliação</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Premium — Visualização de Alunos (Coordenador) ═══ */}
      {modalAlunosLote && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            animation: "gab-fade-in 0.25s ease-out",
          }}
          onClick={() => setModalAlunosLote(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, #1a1f2e 0%, #111827 100%)",
              border: "1px solid rgba(6,182,212,0.15)",
              borderRadius: 20, maxWidth: 580, width: "95%",
              display: "flex", flexDirection: "column",
              maxHeight: "85vh", overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,212,0.06)",
              animation: "gab-slide-up 0.35s ease-out",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "22px 28px 16px", flexShrink: 0,
              background: "linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.05) 100%)",
              borderBottom: "1px solid rgba(6,182,212,0.12)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.3rem",
                }}>📁</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gab-cyan-light, #22d3ee)", letterSpacing: "0.3px" }}>
                    {modalAlunosLote.turma_nome}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                    {(() => {
                      const corr = modalAlunosData.filter(a => a.status === "corrigido").length;
                      const total = modalAlunosData.length;
                      return `${total} gabarito${total !== 1 ? "s" : ""} · ${corr} corrigido${corr !== 1 ? "s" : ""}`;
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setModalAlunosLote(null)}
                  style={{ background: "none", border: "none", color: "var(--gab-text-muted)", cursor: "pointer", padding: 4 }}
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Lista de alunos */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 12px" }}>
              {modalAlunosLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div className="gab-spinner" style={{ margin: "0 auto 12px" }} />
                  <div style={{ color: "var(--gab-text-muted)", fontSize: "0.82rem" }}>Carregando alunos...</div>
                </div>
              ) : modalAlunosData.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>
                  Nenhum gabarito encontrado nesta turma.
                </div>
              ) : (
                modalAlunosData.map((arq, idx) => {
                  const statusMap = {
                    corrigido: { label: "Corrigido", bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)" },
                    identificado: { label: "Identificado", bg: "rgba(6,182,212,0.1)", color: "#22d3ee", border: "rgba(6,182,212,0.2)" },
                    pendente: { label: "Pendente", bg: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "rgba(245,158,11,0.2)" },
                    erro: { label: "Erro", bg: "rgba(239,68,68,0.1)", color: "#f87171", border: "rgba(239,68,68,0.2)" },
                  };
                  const st = statusMap[arq.status] || statusMap.pendente;

                  return (
                    <div
                      key={arq.id || idx}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "12px 16px", borderRadius: 12,
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                      }}
                    >
                      {/* Número */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: arq.status === "corrigido" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${arq.status === "corrigido" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.75rem", fontWeight: 800,
                        color: arq.status === "corrigido" ? "#34d399" : "var(--gab-text-muted)",
                      }}>
                        {idx + 1}
                      </div>

                      {/* Nome / Código */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "0.85rem", fontWeight: 700, color: "var(--gab-text-primary)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {arq.nome_aluno || arq.arquivo_nome || "Aluno não identificado"}
                        </div>
                        {arq.codigo_aluno && (
                          <div style={{ fontSize: "0.7rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                            RE: {arq.codigo_aluno}
                          </div>
                        )}
                      </div>

                      {/* Nota (se corrigido) */}
                      {arq.status === "corrigido" && arq.nota != null && (
                        <div style={{
                          fontSize: "0.82rem", fontWeight: 800, color: "#34d399",
                          marginRight: 4,
                        }}>
                          {Number(arq.nota).toFixed(1)}
                        </div>
                      )}

                      {/* Badge de status */}
                      <span style={{
                        padding: "3px 10px", borderRadius: 8, fontSize: "0.65rem", fontWeight: 700,
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        {st.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "12px 28px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", justifyContent: "center",
            }}>
              <button
                onClick={() => setModalAlunosLote(null)}
                style={{
                  padding: "10px 32px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700,
                  background: "rgba(255,255,255,0.06)", color: "var(--gab-text-primary)",
                  border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                  transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Premium — Confirmar Exclusão de Turma/Lote ═══ */}
      {deleteLoteModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            animation: "gab-fade-in 0.25s ease-out",
          }}
          onClick={() => !deletingLoteId && setDeleteLoteModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, #1a1f2e 0%, #111827 100%)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 20, maxWidth: 440, width: "95%",
              padding: "32px 28px", textAlign: "center",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(239,68,68,0.06)",
              animation: "gab-slide-up 0.35s ease-out",
            }}
          >
            {/* Ícone */}
            <div style={{
              width: 60, height: 60, borderRadius: 18, margin: "0 auto 20px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
            }}>🗑️</div>

            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gab-text-primary)", marginBottom: 8 }}>
              Excluir Turma
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--gab-text-muted)", lineHeight: 1.6, marginBottom: 6 }}>
              Tem certeza que deseja excluir a turma
            </div>
            <div style={{
              fontSize: "1rem", fontWeight: 800, color: "#f87171", marginBottom: 8,
            }}>
              📁 {deleteLoteModal.turma_nome}
            </div>
            <div style={{
              fontSize: "0.78rem", color: "var(--gab-text-muted)", lineHeight: 1.5, marginBottom: 24,
              padding: "10px 16px", borderRadius: 10,
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.1)",
            }}>
              ⚠️ Todos os <strong>{deleteLoteModal.total_arquivos_real || deleteLoteModal.total_arquivos || 0} gabarito(s)</strong> escaneados desta turma serão excluídos permanentemente.
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteLoteModal(null)}
                disabled={!!deletingLoteId}
                style={{
                  padding: "10px 24px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700,
                  background: "rgba(255,255,255,0.06)", color: "var(--gab-text-primary)",
                  border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                  transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirLote(deleteLoteModal.id)}
                disabled={!!deletingLoteId}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 24px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700,
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff", border: "none", cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(239,68,68,0.3)",
                  transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                  opacity: deletingLoteId === deleteLoteModal.id ? 0.6 : 1,
                }}
              >
                {deletingLoteId === deleteLoteModal.id ? (
                  <><div className="gab-spinner" /> Excluindo...</>
                ) : (
                  <>🗑️ Sim, Excluir</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Premium — Vincular Professor à Turma ═══ */}
      {profModalLote && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            animation: "gab-fade-in 0.25s ease-out",
          }}
          onClick={() => setProfModalLote(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, #1a1f2e 0%, #111827 100%)",
              border: "1px solid rgba(6,182,212,0.15)",
              borderRadius: 20, maxWidth: 480, width: "95%",
              padding: 0, overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,212,0.06)",
              animation: "gab-slide-up 0.35s ease-out",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "22px 28px 16px",
              background: "linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.05) 100%)",
              borderBottom: "1px solid rgba(6,182,212,0.12)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.3rem",
                }}>👨‍🏫</div>
                <div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gab-cyan-light, #22d3ee)", letterSpacing: "0.3px" }}>
                    Vincular Professor
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                    📁 {profModalLote.turma_nome}
                  </div>
                </div>
                <button
                  onClick={() => setProfModalLote(null)}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--gab-text-muted)", cursor: "pointer", padding: 4 }}
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Campo de busca */}
              <input
                className="gab-input"
                type="text"
                placeholder="🔍 Buscar professor..."
                value={profFiltro}
                onChange={(e) => setProfFiltro(e.target.value)}
                autoFocus
                style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem" }}
              />
            </div>

            {/* Lista de professores */}
            <div style={{ maxHeight: "45vh", overflowY: "auto", padding: "8px 12px" }}>
              {professores.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div className="gab-spinner" style={{ margin: "0 auto 12px" }} />
                  <div style={{ color: "var(--gab-text-muted)", fontSize: "0.82rem" }}>Carregando professores...</div>
                </div>
              ) : professoresDisponiveis.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>
                  {profFiltro ? "Nenhum professor encontrado." : "Todos os professores já foram vinculados."}
                </div>
              ) : (
                professoresDisponiveis.map(prof => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => vincularProfessor(profModalLote.id, prof.id)}
                    disabled={vinculandoProf}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, width: "100%",
                      padding: "12px 16px", borderRadius: 12, textAlign: "left",
                      border: "1px solid transparent", background: "transparent",
                      cursor: "pointer", transition: "all 0.2s",
                      fontFamily: "var(--gab-font-body)",
                      opacity: vinculandoProf ? 0.5 : 1,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(6,182,212,0.06)";
                      e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    {/* Foto do professor (ou iniciais como fallback) */}
                    {prof.foto ? (
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                        padding: 2,
                        background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                      }}>
                        <img
                          src={`${toPublicUrl(prof.foto)}?v=1`}
                          alt={prof.nome}
                          style={{
                            width: "100%", height: "100%", borderRadius: "50%",
                            objectFit: "cover", display: "block",
                            background: "#1a1f2e",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling && (e.target.nextSibling.style.display = "flex");
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))",
                        border: "2px solid rgba(6,182,212,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.78rem", fontWeight: 800, color: "var(--gab-cyan-light, #22d3ee)",
                        fontFamily: "var(--gab-font-display)",
                      }}>
                        {prof.nome ? prof.nome.split(" ").map(n => n[0]).slice(0, 2).join("") : "?"}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "0.88rem", fontWeight: 700, color: "var(--gab-text-primary)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {prof.nome}
                      </div>
                      <div style={{ display: "flex", gap: 8, fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                        {prof.disciplina_nome && <span>{prof.disciplina_nome}</span>}
                        {prof.turno && <span>· {prof.turno}</span>}
                      </div>
                    </div>

                    {/* Seta */}
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      style={{ flexShrink: 0, color: "var(--gab-text-muted)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: "12px 28px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
              fontSize: "0.72rem", color: "var(--gab-text-muted)", textAlign: "center",
            }}>
              Clique no nome do professor para vinculá-lo à turma <strong>{profModalLote.turma_nome}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: CONFIRMAÇÃO DE IMPORTAÇÃO ═══ */}
      {importModalOpen && importStatus && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9997,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => !importando && setImportModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--gab-surface, #1a1f2e)", borderRadius: 20,
            border: "1px solid rgba(139,92,246,0.2)", padding: "32px",
            width: "100%", maxWidth: 480,
            boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
          }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px",
                background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.25))",
                border: "2px solid rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem",
              }}>📒</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gab-text-primary)" }}>
                Confirmar Importação
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                As notas serão transferidas para o diário dos professores
              </div>
            </div>

            {/* Resumo antes de importar */}
            <div style={{
              padding: "16px", borderRadius: 12, marginBottom: 20,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              fontSize: "0.82rem", lineHeight: 1.8,
            }}>
              <div><strong style={{ color: "var(--gab-text-primary)" }}>Avaliação:</strong> {avaliacaoAtiva?.titulo}</div>
              <div><strong style={{ color: "var(--gab-text-primary)" }}>Bimestre:</strong> {importStatus.bimestre || "—"}</div>
              <div><strong style={{ color: "var(--gab-text-primary)" }}>Alunos:</strong> {importStatus.totalRespostas} corrigidos</div>
              <div><strong style={{ color: "var(--gab-text-primary)" }}>Nota total:</strong> {importStatus.notaTotal}</div>
              <div style={{ marginTop: 6 }}>
                <strong style={{ color: "var(--gab-purple-light)" }}>Disciplinas destino:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {importStatus.disciplinas?.map((dc, i) => (
                    <span key={i} style={{
                      padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 600,
                      background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)",
                      color: "var(--gab-purple-light, #a78bfa)",
                    }}>
                      {dc.nome}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Aviso */}
            <div style={{
              padding: "10px 14px", borderRadius: 10, fontSize: "0.75rem",
              background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)",
              color: "var(--gab-amber-light, #f59e0b)", marginBottom: 20,
            }}>
              ⚠️ A mesma nota total de cada aluno será lançada em <strong>todas as {importStatus.disciplinas?.length} disciplinas</strong>. Notas existentes serão atualizadas.
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="gab-btn gab-btn-ghost"
                onClick={() => setImportModalOpen(false)}
                disabled={importando}
                style={{ flex: 1, padding: "12px" }}
              >
                Cancelar
              </button>
              <button
                className="gab-btn"
                onClick={handleImportarNotas}
                disabled={importando}
                style={{
                  flex: 2, padding: "12px", fontWeight: 700,
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  border: "none", borderRadius: 10, cursor: importando ? "wait" : "pointer",
                  color: "#fff", fontSize: "0.88rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {importando ? (
                  <><div className="gab-spinner" /> Importando...</>
                ) : (
                  <>📒 Confirmar Importação</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
