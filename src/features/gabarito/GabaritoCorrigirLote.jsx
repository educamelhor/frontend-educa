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
  const [avisoNaoIdentificado, setAvisoNaoIdentificado] = useState(null); // { loteName, pendentes }

  // ─── Modal visualização de alunos (coordenador) ───
  const [modalAlunosLote, setModalAlunosLote] = useState(null); // lote aberto
  const [modalAlunosData, setModalAlunosData] = useState([]); // arquivos/alunos
  const [modalAlunosLoading, setModalAlunosLoading] = useState(false);

  // ─── Vincular aluno manualmente (coordenador) ───
  const [vinculoArquivo, setVinculoArquivo] = useState(null); // arquivo selecionado para vincular
  const [alunosTurmaDisp, setAlunosTurmaDisp] = useState([]); // alunos disponíveis
  const [loadingAlunosTurma, setLoadingAlunosTurma] = useState(false);
  const [filtroVinculo, setFiltroVinculo] = useState("");
  const [vinculandoAluno, setVinculandoAluno] = useState(false);

  // ─── Visualização da imagem do gabarito (coordenador) ───
  const [previewArquivo, setPreviewArquivo] = useState(null); // arquivo cuja imagem está sendo exibida
  const [previewImgUrl, setPreviewImgUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  // ─── Excluir lote (turma) ───
  const [deleteLoteModal, setDeleteLoteModal] = useState(null); // lote para confirmar exclusão
  const [deletingLoteId, setDeletingLoteId] = useState(null);

  // ─── Importar Notas para Diário ───
  const [importStatus, setImportStatus] = useState(null); // dados de status da importação
  const [importModalOpen, setImportModalOpen] = useState(false); // modal de confirmação
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState(null); // resultado após importação
  const [reexportModalOpen, setReexportModalOpen] = useState(false); // modal de reexportação

  // ─── Governança (Avaliação Padrão Bimestral) ───
  const [avaliacaoConfig, setAvaliacaoConfig] = useState(null);

  // ─── Revisão de ajustes manuais (coordenador) ───
  const [ajustesReviewArquivo, setAjustesReviewArquivo] = useState(null); // arquivo cujos ajustes estão sendo revisados
  const [ajustesList, setAjustesList] = useState([]); // ajustes do arquivo
  const [ajustesLoading, setAjustesLoading] = useState(false);
  const [decidindoAjusteId, setDecidindoAjusteId] = useState(null);

  // ─── Excluir arquivo (gabarito individual) ───
  const [deleteArquivoModal, setDeleteArquivoModal] = useState(null); // arquivo a excluir
  const [deletingArquivoId, setDeletingArquivoId] = useState(null);

  // ─── Cancelamento de Questão em Lote (coordenador/diretor) ───
  const [cancelQuestaoModal, setCancelQuestaoModal] = useState(false);   // modal aberto?
  const [cancelQuestaoNum, setCancelQuestaoNum] = useState("");           // número digitado
  const [cancelQuestaoModo, setCancelQuestaoModo] = useState("bonificar"); // bonificar|desconsiderar
  const [cancelQuestaoMotivo, setCancelQuestaoMotivo] = useState("");     // justificativa
  const [cancelQuestaoSalvando, setCancelQuestaoSalvando] = useState(false);
  const [questoesCanceladas, setQuestoesCanceladas] = useState([]);       // lista da avaliação ativa
  const [loadingCanceladas, setLoadingCanceladas] = useState(false);



  // ─── Toast ───
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Carregar questões canceladas da avaliação ativa ───
  async function carregarQuestoesCanceladas(avaliacaoId) {
    if (!avaliacaoId) { setQuestoesCanceladas([]); return; }
    setLoadingCanceladas(true);
    try {
      const resp = await api.get(`/api/gabarito-avaliacoes/${avaliacaoId}/questoes-canceladas`);
      setQuestoesCanceladas(resp.data?.questoes_canceladas || []);
    } catch {
      setQuestoesCanceladas([]);
    }
    setLoadingCanceladas(false);
  }

  // ─── Salvar cancelamento de questão (bonificar ou desconsiderar) ───
  async function salvarCancelamentoQuestao() {
    if (!avaliacaoAtiva) return;
    const num = Number(cancelQuestaoNum);
    if (!num || num < 1 || num > avaliacaoAtiva.num_questoes) {
      showToast(`Informe um número de questão válido (1 a ${avaliacaoAtiva.num_questoes}).`, "error");
      return;
    }
    setCancelQuestaoSalvando(true);
    try {
      const resp = await api.put(`/api/gabarito-avaliacoes/${avaliacaoAtiva.id}/cancelar-questao`, {
        numero: num,
        modo: cancelQuestaoModo,
        motivo: cancelQuestaoMotivo.trim() || null,
      });
      setQuestoesCanceladas(resp.data.questoes_canceladas || []);
      setCancelQuestaoModal(false);
      setCancelQuestaoNum("");
      setCancelQuestaoMotivo("");
      setCancelQuestaoModo("bonificar");
      const modoLabel = cancelQuestaoModo === "bonificar" ? "bonificada (todos ganham o ponto)" : "desconsiderada (N-1 questões)";
      showToast(
        `✅ Questão ${num} ${modoLabel}. ${resp.data.total_recalculados} aluno(s) recalculado(s).`,
        "success"
      );
    } catch (err) {
      showToast(err.response?.data?.error || "Erro ao cancelar questão.", "error");
    }
    setCancelQuestaoSalvando(false);
  }

  // ─── Reverter cancelamento de questão ───
  async function reverterCancelamentoQuestao(numero) {
    if (!avaliacaoAtiva) return;
    if (!window.confirm(`Reverter o cancelamento da questão ${numero}?\n\nTodas as notas serão recalculadas sem este cancelamento.`)) return;
    try {
      const resp = await api.delete(`/api/gabarito-avaliacoes/${avaliacaoAtiva.id}/cancelar-questao/${numero}`);
      setQuestoesCanceladas(resp.data.questoes_canceladas || []);
      showToast(`↩ Cancelamento da questão ${numero} revertido. ${resp.data.total_recalculados} aluno(s) recalculado(s).`, "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Erro ao reverter cancelamento.", "error");
    }
  }

  // ─── Buscar corretores disponíveis (professores + coord + direção + supervisor) ───
  async function fetchProfessores() {

    try {
      const resp = await api.get("/api/gabarito-lotes/corretores-disponiveis");
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
      const resp = await api.put(`/api/gabarito-lotes/${loteId}/vincular-professor`, { professor_id: professorId });
      setLotes(prev => prev.map(l => l.id === loteId ? { ...l, professor_id: professorId, professor_nome: resp.data.professor_nome } : l));
      setProfModalLote(null);
      showToast("Professor vinculado com sucesso!", "success");
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao vincular professor.";
      showToast(msg, "error");
    }
    setVinculandoProf(false);
  }

  // Professores disponíveis para o modal:
  // - Um professor PODE ser vinculado a mais de uma turma da mesma avaliação
  // - Apenas o lote atual é excluído para evitar re-seleção do mesmo professor no mesmo lote
  // - Filtro de busca por nome
  const professoresDisponiveis = professores
    .filter(p => !profFiltro || p.nome.toLowerCase().includes(profFiltro.toLowerCase()));

  // Abrir modal de professor
  // ─ Bloqueado após importação das notas ─
  // ─ Verifica se todos os alunos foram identificados antes de permitir vincular ─
  function abrirModalProfessor(lote, e) {
    e.stopPropagation();
    // Bloquear se a avaliação já teve notas importadas
    if (avaliacaoAtiva?.status === "notas_importadas") {
      showToast("🔒 Não é possível vincular correto após a importação das notas.", "error");
      return;
    }
    const total = lote.total_arquivos_real || lote.total_arquivos || 0;
    const corrigidos = lote.total_corrigidos_real || lote.total_corrigidos || 0;
    const identificados = lote.total_identificados || 0;
    const erros = lote.total_erros || 0;
    const pendentes = total - corrigidos - identificados - erros;
    if (pendentes > 0) {
      setAvisoNaoIdentificado({ loteName: lote.turma_nome, pendentes, total });
      return;
    }
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
    carregarQuestoesCanceladas(av.id); // carrega questões anuladas
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

  // ─── Estado: progresso do processamento QR automático ───
  const [qrAutoProgress, setQrAutoProgress] = useState(null); // { total, processados, identificados, erros, fase }

  // ─── Abrir lote (turma) — modal de visualização (coordenador) ───
  // Agora dispara automaticamente o processamento QR para arquivos pendentes
  async function abrirLote(lote) {
    setModalAlunosLote(lote);
    setModalAlunosData([]);
    setModalAlunosLoading(true);
    setQrAutoProgress(null);

    try {
      // 1. Carregar arquivos atuais
      const resp = await api.get(`/api/gabarito-lotes/${lote.id}/arquivos`);
      const arquivosAtuais = resp.data || [];

      // 2. Verificar se existem arquivos pendentes (sem QR processado)
      const pendentes = arquivosAtuais.filter(a => a.status === "pendente");

      if (pendentes.length > 0) {
        // Mostrar os arquivos já carregados enquanto processa
        setModalAlunosData(arquivosAtuais);
        setModalAlunosLoading(false);
        setQrAutoProgress({ total: pendentes.length, processados: 0, identificados: 0, erros: 0, fase: "processando" });

        let qrData = null;
        let qrOk = false;

        try {
          // 3. Disparar processamento QR automático
          // Timeout longo: cada arquivo leva ~5-10s no OMR (download + crop + bolhas)
          // Para 30 arquivos → até 5 minutos
          const qrResp = await api.post(
            `/api/gabarito-lotes/${lote.id}/processar-qr`,
            {},
            { timeout: 300000 } // 5 minutos
          );
          qrData = qrResp.data || {};
          qrOk = true;
        } catch (qrErr) {
          console.error("Erro ao processar QR automático:", qrErr);
          // Mesmo com erro (timeout, 503, etc.), o backend pode ter processado parcialmente.
          // Vamos recarregar a lista de qualquer forma.
          if (qrErr.response?.status === 503) {
            showToast("⚠️ Serviço OMR indisponível. Os alunos serão identificados quando o professor clicar em Corrigir.", "error");
          }
          // Não mostramos toast genérico aqui — vamos verificar o resultado real abaixo
        }

        // 4. SEMPRE recarregar lista atualizada (mesmo se houve erro/timeout)
        // O backend pode ter processado parcial ou totalmente antes do timeout
        try {
          const respAtualizada = await api.get(`/api/gabarito-lotes/${lote.id}/arquivos`);
          const listaAtualizada = respAtualizada.data || [];
          setModalAlunosData(listaAtualizada);

          // Contar resultado real (comparar antes/depois)
          const identificadosAgora = listaAtualizada.filter(a => a.status === "identificado" || a.status === "corrigido").length;
          const identificadosAntes = arquivosAtuais.filter(a => a.status === "identificado" || a.status === "corrigido").length;
          const novosIdentificados = identificadosAgora - identificadosAntes;
          const errosAgora = listaAtualizada.filter(a => a.status === "erro").length;
          const novosErros = errosAgora - arquivosAtuais.filter(a => a.status === "erro").length;
          const aindaPendentes = listaAtualizada.filter(a => a.status === "pendente").length;

          // Usar dados do backend se disponíveis, senão calcular do resultado real
          const identFinal = qrOk ? (qrData?.identificados || novosIdentificados) : novosIdentificados;
          const errosFinal = qrOk ? (qrData?.erros || novosErros) : novosErros;

          setQrAutoProgress({
            total: pendentes.length,
            processados: qrOk ? (qrData?.processados || pendentes.length) : (novosIdentificados + novosErros),
            identificados: identFinal,
            erros: errosFinal,
            fase: "concluido",
          });

          // Toast baseado no resultado REAL
          if (identFinal > 0) {
            showToast(
              `✅ ${identFinal} aluno(s) identificado(s)!${errosFinal > 0 ? ` (${errosFinal} não identificado${errosFinal > 1 ? "s" : ""})` : ""}${aindaPendentes > 0 ? ` · ${aindaPendentes} ainda pendente(s)` : ""}`,
              "success"
            );
          } else if (errosFinal > 0) {
            showToast(`⚠️ ${errosFinal} arquivo(s) com falha na leitura. Verifique a qualidade do escaneamento.`, "error");
          } else if (aindaPendentes > 0 && !qrOk) {
            showToast("⏳ Processamento ainda em andamento. Reabra o modal em alguns segundos.", "success");
          }
        } catch (reloadErr) {
          console.error("Erro ao recarregar lista:", reloadErr);
        }

        // Atualizar contadores do lote na lista principal
        carregarLotes(avaliacaoAtiva.id);

        // Limpar progresso após 4 segundos
        setTimeout(() => setQrAutoProgress(null), 4000);
      } else {
        // Sem pendentes — apenas exibir a lista
        setModalAlunosData(arquivosAtuais);
        setModalAlunosLoading(false);
      }
    } catch (err) {
      console.error("Erro ao carregar arquivos:", err);
      showToast("Erro ao carregar arquivos do lote.", "error");
      setModalAlunosLoading(false);
    }
  }

  // ─── Helper: detectar se nome parece nome de arquivo (não aluno) ───
  function pareceNomeArquivo(nome) {
    if (!nome) return true;
    return /\.(pdf|jpg|jpeg|png)$/i.test(nome)
      || /^\d{8}[_\-]/.test(nome)
      || /^ARQ_\d+$/.test(nome)
      || /^Arquivo \d+$/.test(nome);
  }

  // ─── Fechar modal de alunos (limpa tudo) ───
  function fecharModalAlunos() {
    setModalAlunosLote(null);
    setModalAlunosData([]);
    setVinculoArquivo(null);
    if (previewImgUrl) URL.revokeObjectURL(previewImgUrl);
    setPreviewArquivo(null);
    setPreviewImgUrl(null);
    setPreviewFullscreen(false);
    setQrAutoProgress(null);
    setAjustesReviewArquivo(null);
    setAjustesList([]);
  }

  // ─── Abrir revisão de ajustes manuais (coordenador) ───
  async function abrirRevisaoAjustes(arq) {
    setAjustesReviewArquivo(arq);
    setAjustesLoading(true);
    try {
      const resp = await api.get(`/api/gabarito-lotes/arquivos/${arq.id}/ajustes-manuais`);
      setAjustesList(resp.data || []);
    } catch { setAjustesList([]); }
    setAjustesLoading(false);
  }

  // ─── Decidir ajuste (coordenador: aprovar/rejeitar) ───
  async function decidirAjuste(ajusteId, decisao) {
    setDecidindoAjusteId(ajusteId);
    try {
      const resp = await api.put(`/api/gabarito-lotes/ajustes/${ajusteId}/decidir`, { decisao });
      if (resp.data.ok) {
        showToast(
          decisao === "aprovado"
            ? `✅ Ajuste aprovado. Nova nota: ${resp.data.nota?.toFixed(1) || "recalculada"}`
            : "❌ Ajuste rejeitado.",
          "success"
        );
        // Atualizar lista de ajustes
        setAjustesList(prev => prev.map(a =>
          a.id === ajusteId ? { ...a, status: decisao } : a
        ));
        // Se recalculou nota, atualizar na lista de alunos
        if (resp.data.recalculado && ajustesReviewArquivo) {
          setModalAlunosData(prev => prev.map(a =>
            a.id === ajustesReviewArquivo.id
              ? { ...a, nota: resp.data.nota, acertos: resp.data.acertos }
              : a
          ));
        }
        // Refresh lotes para atualizar badge
        if (avaliacaoAtiva) carregarLotes(avaliacaoAtiva.id);
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Erro ao processar decisão.", "error");
    }
    setDecidindoAjusteId(null);
  }

  // ─── Abrir preview da imagem do gabarito (apenas visualização) ───
  async function abrirPreviewVinculo(arq) {
    if (!modalAlunosLote) return;

    // Se já está aberto para este arquivo, fechar
    if (previewArquivo?.id === arq.id) {
      if (previewImgUrl) URL.revokeObjectURL(previewImgUrl);
      setPreviewArquivo(null);
      setPreviewImgUrl(null);
      return;
    }

    // Abrir preview (apenas imagem, sem vinculação)
    setPreviewArquivo(arq);
    setPreviewImgUrl(null);
    setPreviewLoading(true);

    try {
      const resp = await api.get(`/api/gabarito-lotes/arquivos/${arq.id}/imagem`, {
        responseType: "blob",
        timeout: 60000,
      });
      const blobUrl = URL.createObjectURL(resp.data);
      setPreviewImgUrl(blobUrl);
    } catch (err) {
      console.error("Erro ao carregar imagem do gabarito:", err);
      setPreviewImgUrl(null);
    }
    setPreviewLoading(false);
  }

  // ─── Abrir painel de vinculação manual (coordenador) ───
  async function abrirVinculoAluno(arq) {
    if (!modalAlunosLote) return;
    setVinculoArquivo(arq);
    setFiltroVinculo("");
    setLoadingAlunosTurma(true);

    try {
      const resp = await api.get(`/api/gabarito-lotes/${modalAlunosLote.id}/alunos-turma`);
      const data = resp.data;

      // Excluir alunos já identificados em outros gabaritos
      const codigosUsados = new Set();
      const nomesUsados = new Set();
      for (const a of modalAlunosData) {
        if (a.id === arq.id) continue;
        if (!pareceNomeArquivo(a.nome_aluno)) {
          if (a.codigo_aluno) codigosUsados.add(a.codigo_aluno);
          if (a.nome_aluno) nomesUsados.add(a.nome_aluno.toUpperCase().trim());
        }
      }

      const disponiveis = (data.alunos || []).filter(al =>
        !codigosUsados.has(al.codigo) &&
        !nomesUsados.has(al.estudante.toUpperCase().trim())
      );
      setAlunosTurmaDisp(disponiveis);
    } catch (err) {
      console.error("Erro ao buscar alunos da turma:", err);
      showToast("Erro ao buscar alunos da turma.", "error");
    }
    setLoadingAlunosTurma(false);
  }

  // ─── Vincular aluno ao gabarito (coordenador) ───
  async function executarVinculo(aluno) {
    if (!vinculoArquivo) return;
    setVinculandoAluno(true);

    try {
      await api.put(`/api/gabarito-lotes/arquivos/${vinculoArquivo.id}/vincular-aluno`, {
        codigo_aluno: aluno.codigo,
        nome_aluno: aluno.estudante,
      });

      // Atualizar na lista do modal
      setModalAlunosData(prev => prev.map(a =>
        a.id === vinculoArquivo.id
          ? { ...a, codigo_aluno: aluno.codigo, nome_aluno: aluno.estudante }
          : a
      ));

      showToast(`Aluno "${aluno.estudante}" vinculado com sucesso!`, "success");
      setVinculoArquivo(null);

      // Fechar preview de imagem (se estava aberto para este arquivo)
      if (previewArquivo?.id === vinculoArquivo.id) {
        if (previewImgUrl) URL.revokeObjectURL(previewImgUrl);
        setPreviewArquivo(null);
        setPreviewImgUrl(null);
      }
    } catch (err) {
      console.error("Erro ao vincular aluno:", err);
      showToast(err.response?.data?.error || "Erro ao vincular aluno.", "error");
    }
    setVinculandoAluno(false);
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

  // ─── Excluir arquivo individual do lote ───
  async function excluirArquivo(arq) {
    setDeletingArquivoId(arq.id);
    try {
      await api.delete(`/api/gabarito-lotes/arquivos/${arq.id}`);
      // Remover da lista do modal
      setModalAlunosData(prev => prev.filter(a => a.id !== arq.id));
      setDeleteArquivoModal(null);
      // Fechar preview se estava aberto para este arquivo
      if (previewArquivo?.id === arq.id) {
        if (previewImgUrl) URL.revokeObjectURL(previewImgUrl);
        setPreviewArquivo(null);
        setPreviewImgUrl(null);
      }
      // Fechar painel de vínculo se estava aberto para este arquivo
      if (vinculoArquivo?.id === arq.id) setVinculoArquivo(null);
      if (ajustesReviewArquivo?.id === arq.id) { setAjustesReviewArquivo(null); setAjustesList([]); }
      showToast(`Gabarito excluído com sucesso.`, "success");
      // Atualizar contadores do lote
      if (avaliacaoAtiva) {
        carregarLotes(avaliacaoAtiva.id);
        verificarStatusImportacao(avaliacaoAtiva.id);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao excluir gabarito.";
      showToast(msg, "error");
    }
    setDeletingArquivoId(null);
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

      // Bug 2: Atualizar status de importação após cada correção (o último arquivo pode finalizar o lote)
      if (avaliacaoAtiva) {
        carregarLotes(avaliacaoAtiva.id);
        verificarStatusImportacao(avaliacaoAtiva.id);
      }
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
    // Bug 2: Atualizar lotes E status de importação após corrigir todos
    if (avaliacaoAtiva) {
      carregarLotes(avaliacaoAtiva.id);
      verificarStatusImportacao(avaliacaoAtiva.id);
    }
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

          {/* ─── Card: Questões Canceladas / Anuladas ─── */}
          <div className="gab-card" style={{ borderColor: questoesCanceladas.length > 0 ? "rgba(245,158,11,0.3)" : undefined }}>
            <div className="gab-card-header" style={{ marginBottom: 0 }}>
              <div className="gab-card-icon" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="gab-card-title">Questões Canceladas / Anuladas</div>
              {questoesCanceladas.length > 0 && (
                <span style={{
                  marginLeft: "auto", padding: "2px 10px", borderRadius: 20,
                  fontSize: "0.65rem", fontWeight: 800,
                  background: "rgba(245,158,11,0.12)", color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}>
                  {questoesCanceladas.length} anulada{questoesCanceladas.length > 1 ? "s" : ""}
                </span>
              )}
              <button
                onClick={() => { setCancelQuestaoModal(true); setCancelQuestaoNum(""); setCancelQuestaoMotivo(""); setCancelQuestaoModo("bonificar"); }}
                style={{
                  marginLeft: questoesCanceladas.length > 0 ? 8 : "auto",
                  padding: "5px 14px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                  color: "#f59e0b", cursor: "pointer", transition: "all 0.2s",
                }}
                title="Cancelar / anular uma questão com efeito em lote"
              >
                ⚠ Cancelar Questão
              </button>
            </div>

            {loadingCanceladas ? (
              <div style={{ textAlign: "center", padding: "12px 0", color: "var(--gab-text-muted)", fontSize: "0.8rem" }}>
                <div className="gab-spinner" style={{ margin: "0 auto 6px", width: 18, height: 18 }} />
                Verificando...
              </div>
            ) : questoesCanceladas.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", padding: "10px 0 4px" }}>
                Nenhuma questão cancelada nesta avaliação. Use o botão acima para anular uma questão com efeito imediato em todos os alunos.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {questoesCanceladas.map((qc) => (
                  <div key={qc.numero} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10,
                    background: qc.modo === "bonificar" ? "rgba(16,185,129,0.05)" : "rgba(245,158,11,0.05)",
                    border: `1px solid ${qc.modo === "bonificar" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`,
                  }}>
                    {/* Número da questão */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: qc.modo === "bonificar" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                      border: `1px solid ${qc.modo === "bonificar" ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: "0.55rem", color: "var(--gab-text-muted)" }}>Q</span>
                      <span style={{
                        fontSize: "1rem", fontWeight: 800, lineHeight: 1,
                        color: qc.modo === "bonificar" ? "var(--gab-green-light, #10b981)" : "#f59e0b",
                      }}>{qc.numero}</span>
                    </div>

                    {/* Detalhes */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 800,
                          background: qc.modo === "bonificar" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                          color: qc.modo === "bonificar" ? "var(--gab-green-light, #10b981)" : "#f59e0b",
                          border: `1px solid ${qc.modo === "bonificar" ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                          textTransform: "uppercase",
                        }}>
                          {qc.modo === "bonificar" ? "✓ Bonificada" : "⊘ Desconsiderada"}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--gab-text-muted)" }}>
                          {qc.modo === "bonificar" ? "todos ganham o ponto" : "excluída do total de questões"}
                        </span>
                      </div>
                      {qc.motivo && (
                        <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 3, fontStyle: "italic" }}>
                          "{qc.motivo}"
                        </div>
                      )}
                      <div style={{ fontSize: "0.62rem", color: "rgba(148,163,184,0.5)", marginTop: 2 }}>
                        {qc.cancelado_por_nome
                          ? `por ${qc.cancelado_por_nome} · `
                          : ""}
                        {qc.cancelado_em
                          ? new Date(qc.cancelado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </div>
                    </div>

                    {/* Botão reverter */}
                    <button
                      onClick={() => reverterCancelamentoQuestao(qc.numero)}
                      title="Reverter cancelamento desta questão"
                      style={{
                        padding: "4px 10px", borderRadius: 7, fontSize: "0.65rem", fontWeight: 700,
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                        color: "var(--gab-red-light, #f87171)", cursor: "pointer", flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                    >
                      ↩ Reverter
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  const identificados = lote.total_identificados || 0;
                  const pendentes = total - corrigidos - identificados - (lote.total_erros || 0);
                  const pct = total > 0 ? Math.round((corrigidos / total) * 100) : 0;
                  const pctIdent = total > 0 ? Math.round((identificados / total) * 100) : 0;
                  const isFinalizado = lote.status === "finalizado";
                  // PA4: label especial quando todos identificados mas nenhum corrigido
                  const todosProntos = identificados === total && total > 0 && corrigidos === 0;

                  return (
                    <div key={lote.id} className="gab-lote-card" onClick={() => abrirLote(lote)}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                          📁 {lote.turma_nome}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {/* Botão vincular professor — bloqueado após importação */}
                          {avaliacaoAtiva?.status === "notas_importadas" ? (
                            <div
                              title="Vinculação bloqueada — notas já importadas"
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.9rem",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                opacity: 0.4, cursor: "not-allowed",
                              }}
                            >
                              🔒
                            </div>
                          ) : (
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
                          )}
                          <span style={{
                            padding: "2px 8px", borderRadius: 10, fontSize: "0.65rem", fontWeight: 700,
                            background: isFinalizado
                              ? "rgba(16,185,129,0.1)"
                              : todosProntos
                              ? "rgba(6,182,212,0.1)"
                              : "rgba(245,158,11,0.1)",
                            color: isFinalizado
                              ? "var(--gab-green-light)"
                              : todosProntos
                              ? "var(--gab-cyan-light, #22d3ee)"
                              : "var(--gab-amber-light, #f59e0b)",
                            border: `1px solid ${
                              isFinalizado ? "rgba(16,185,129,0.2)"
                              : todosProntos ? "rgba(6,182,212,0.2)"
                              : "rgba(245,158,11,0.2)"
                            }`,
                          }}>
                            {isFinalizado ? "FINALIZADO" : todosProntos ? "PRONTO" : `${pct}%`}
                          </span>
                          {Number(lote.ajustes_pendentes) > 0 && (
                            <span style={{
                              padding: "2px 8px", borderRadius: 10, fontSize: "0.6rem", fontWeight: 700,
                              background: "rgba(245,158,11,0.12)", color: "#fbbf24",
                              border: "1px solid rgba(245,158,11,0.25)",
                              display: "flex", alignItems: "center", gap: 3,
                              animation: "gab-fade-in 0.3s ease-out",
                            }}>
                              ✏️ {lote.ajustes_pendentes} ajuste{Number(lote.ajustes_pendentes) > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                          {total} gabaritos
                          {identificados > 0 && <> · <span style={{ color: "var(--gab-cyan-light, #22d3ee)" }}>{identificados} identificados</span></>}
                          {corrigidos > 0 && <> · <span style={{ color: "var(--gab-green-light, #10b981)" }}>{corrigidos} corrigidos</span></>}
                          {pendentes > 0 && <> · <span style={{ color: "var(--gab-amber-light, #f59e0b)" }}>{pendentes} pendentes</span></>}
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
                      {/* Barra de progresso — PA4: dois segmentos: azul=identificados, verde=corrigidos */}
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", position: "relative" }}>
                        {/* Segmento azul: identificados (abaixo dos corrigidos) */}
                        {pctIdent > 0 && !isFinalizado && (
                          <div style={{
                            position: "absolute", left: 0, top: 0,
                            height: "100%", borderRadius: 2,
                            width: `${Math.min(pct + pctIdent, 100)}%`,
                            background: "rgba(6,182,212,0.35)",
                            transition: "width 0.5s ease-out",
                          }} />
                        )}
                        {/* Segmento verde: corrigidos (sobrepõe o azul) */}
                        <div style={{
                          position: "absolute", left: 0, top: 0,
                          height: "100%", borderRadius: 2, transition: "width 0.5s ease-out",
                          width: isFinalizado ? "100%" : `${pct}%`,
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
          {/* Bug 3: mostrar sempre que houver disciplinas configuradas, independente do tipo */}
          {importStatus && importStatus.temDisciplinas && lotes.length > 0 && (
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
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Aviso: já importado */}
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

                  {/* Botão: Exportar Notas Novamente */}
                  <button
                    onClick={() => setReexportModalOpen(true)}
                    disabled={importando}
                    style={{
                      width: "100%", padding: "11px 20px", fontSize: "0.82rem", fontWeight: 700,
                      background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.10))",
                      border: "1px solid rgba(245,158,11,0.35)", borderRadius: 10, cursor: importando ? "not-allowed" : "pointer",
                      color: "#f59e0b", transition: "all 0.2s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: importando ? 0.6 : 1,
                    }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    {importando ? "Exportando..." : "Exportar Notas Novamente"}
                  </button>
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

          {/* ─── Modal de Confirmação: Exportar Notas Novamente ─── */}
          {reexportModalOpen && (
            <div
              style={{
                position: "fixed", inset: 0, zIndex: 9998,
                background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onClick={() => setReexportModalOpen(false)}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: "var(--gab-surface, #1a1f2e)", borderRadius: 20,
                  border: "1px solid rgba(245,158,11,0.25)", padding: "32px",
                  width: "100%", maxWidth: 460,
                  boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
                }}
              >
                {/* Ícone */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%", margin: "0 auto 12px",
                    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.4rem",
                  }}>🔄</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--gab-text-primary)" }}>
                    Exportar Notas Novamente?
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 8, lineHeight: 1.6 }}>
                    As notas serão re-exportadas para o diário dos professores,
                    <strong style={{ color: "#f59e0b" }}> substituindo</strong> os valores já lançados.
                    <br />Use apenas se houve falha ou correção nos resultados.
                  </div>
                </div>

                {/* Disciplinas afetadas */}
                {importStatus?.disciplinas?.length > 0 && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 10, marginBottom: 20,
                    background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)",
                    fontSize: "0.75rem", color: "var(--gab-text-muted)",
                  }}>
                    <span style={{ fontWeight: 600, color: "#f59e0b" }}>Disciplinas afetadas:</span>{" "}
                    {importStatus.disciplinas.map(d => d.nome).join(", ")}
                    {" "}({importStatus.bimestre})
                  </div>
                )}

                {/* Botões */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setReexportModalOpen(false)}
                    style={{
                      flex: 1, padding: "11px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--gab-text-muted)", cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setReexportModalOpen(false);
                      await handleImportarNotas();
                    }}
                    disabled={importando}
                    style={{
                      flex: 2, padding: "11px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700,
                      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                      border: "none", color: "#fff", cursor: importando ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Sim, exportar novamente
                  </button>
                </div>
              </div>
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

                {/* PA5: Alunos não importados (sem QR / ARQ_*) */}
                {importResultado.resumo?.erros > 0 && (
                  <div style={{
                    padding: "12px 14px", borderRadius: 10, fontSize: "0.75rem",
                    background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)",
                    color: "var(--gab-text-muted)", marginBottom: 12,
                  }}>
                    <div style={{ fontWeight: 700, color: "#f87171", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "1rem" }}>🚫</span>
                      {importResultado.resumo.erros} aluno(s) NÃO importado(s) — nota perdida
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.8)", marginBottom: 6 }}>
                      Estes alunos não foram identificados pelo QR Code. Vincule-os manualmente antes de reimportar.
                    </div>
                    {importResultado.resumo.detalheErros?.map((e, i) => (
                      <div key={i} style={{ marginBottom: 3 }}>
                        • <strong>{e.codigo}</strong>{e.nome ? ` (${e.nome})` : ""}: {e.motivo}
                      </div>
                    ))}
                  </div>
                )}

                {/* PA6: Avisos de PAP ausente */}
                {importResultado.resumo?.avisos > 0 && (
                  <div style={{
                    padding: "12px 14px", borderRadius: 10, fontSize: "0.75rem",
                    background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)",
                    color: "var(--gab-text-muted)", marginBottom: 12,
                  }}>
                    <div style={{ fontWeight: 700, color: "#f59e0b", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "1rem" }}>⚠️</span>
                      {importResultado.resumo.avisos} combinação(ões) sem PAP — notas não lançadas
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.8)", marginBottom: 6 }}>
                      O PAP (Plano de Avaliação Pedagógica) deve estar com status APROVADO ou ENVIADO. Solicite ao professor que envie ou ao coordenador que aprove.
                    </div>
                    {importResultado.resumo.detalheAvisos?.map((a, i) => (
                      <div key={i} style={{ marginBottom: 3 }}>
                        • <strong>{a.disciplina}</strong> / {a.turma}: {a.motivo}
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
                            <td key={q.numero} style={{
                              textAlign: "center",
                              color: q.resposta === "N" ? "var(--gab-amber-light, #f59e0b)" : "inherit",
                              fontWeight: q.resposta === "N" ? 700 : 400,
                            }}
                              title={q.resposta === "N" ? "Nulo — múltiplas marcações" : ""}
                            >{q.resposta || "—"}</td>
                          ))}
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, position: "sticky", left: 0, background: "var(--gab-surface, #1a1f2e)", zIndex: 1 }}>RESULTADO</td>
                          {correcao.resultado.map(q => (
                            <td key={q.numero} style={{
                              textAlign: "center", fontWeight: 700, fontSize: "1rem",
                              color: q.acertou
                                ? "var(--gab-green-light, #10b981)"
                                : q.resposta === "N"
                                  ? "var(--gab-amber-light, #f59e0b)"
                                  : "var(--gab-red-light, #ef4444)",
                            }}>
                              {q.acertou ? "✓" : q.resposta === "N" ? "⊘" : "✗"}
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
          onClick={fecharModalAlunos}
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
                      const total = modalAlunosData.length;
                      const corr = modalAlunosData.filter(a => a.status === "corrigido").length;
                      const ident = modalAlunosData.filter(a => a.status === "identificado").length;
                      const pend = modalAlunosData.filter(a => a.status === "pendente").length;
                      const parts = [`${total} gabarito${total !== 1 ? "s" : ""}`];
                      if (ident > 0) parts.push(`${ident} identificado${ident !== 1 ? "s" : ""}`);
                      if (corr > 0) parts.push(`${corr} corrigido${corr !== 1 ? "s" : ""}`);
                      if (pend > 0) parts.push(`${pend} pendente${pend !== 1 ? "s" : ""}`);
                      return parts.join(" · ");
                    })()}
                  </div>
                </div>
                <button
                  onClick={fecharModalAlunos}
                  style={{ background: "none", border: "none", color: "var(--gab-text-muted)", cursor: "pointer", padding: 4 }}
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ─── Banner de Processamento QR Automático ─── */}
            {qrAutoProgress && (
              <div style={{
                padding: "10px 20px", flexShrink: 0,
                background: qrAutoProgress.fase === "concluido"
                  ? "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))"
                  : "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.05))",
                borderBottom: "1px solid rgba(6,182,212,0.1)",
                display: "flex", alignItems: "center", gap: 12,
                animation: "gabSlideIn 0.3s ease-out",
              }}>
                {qrAutoProgress.fase === "processando" ? (
                  <>
                    <div className="gab-spinner" style={{ width: 18, height: 18, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--gab-cyan-light, #22d3ee)" }}>
                        🔍 Identificando alunos automaticamente...
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                        {/* PA7: estimativa de tempo baseada na quantidade de arquivos */}
                        Lendo QR Code de {qrAutoProgress.total} gabarito(s)
                        {qrAutoProgress.total > 5
                          ? ` — estimativa: ~${Math.ceil(qrAutoProgress.total * 7 / 60)} min`
                          : " — aguarde alguns segundos"}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: qrAutoProgress.erros > 0
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(16,185,129,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.7rem",
                    }}>
                      {qrAutoProgress.erros > 0 ? "⚠️" : "✅"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: "0.75rem", fontWeight: 700,
                        color: qrAutoProgress.erros > 0
                          ? "var(--gab-amber-light, #f59e0b)"
                          : "var(--gab-green-light, #10b981)",
                      }}>
                        {qrAutoProgress.identificados} aluno(s) identificado(s)
                        {qrAutoProgress.erros > 0 && ` · ${qrAutoProgress.erros} não identificado(s)`}
                      </div>
                      <div style={{ fontSize: "0.62rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                        Processamento QR concluído — lista atualizada automaticamente
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Lista de alunos */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 12px" }}>
              {modalAlunosLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div className="gab-spinner" style={{ margin: "0 auto 12px" }} />
                  <div style={{ color: "var(--gab-text-muted)", fontSize: "0.82rem" }}>Carregando gabaritos...</div>
                  <div style={{ color: "var(--gab-text-muted)", fontSize: "0.68rem", marginTop: 4 }}>Os alunos serão identificados automaticamente via QR Code</div>
                </div>
              ) : modalAlunosData.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>
                  Nenhum gabarito encontrado nesta turma.
                </div>
              ) : (
                // Dedup por id antes de renderizar (evita duplicação ao re-abrir lote com arquivos novos)
                Array.from(new Map(modalAlunosData.map(a => [a.id, a])).values()).map((arq, idx) => {
                  const naoIdentificado = pareceNomeArquivo(arq.nome_aluno);
                  const statusMap = {
                    corrigido: { label: "Corrigido", bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)" },
                    identificado: { label: "Identificado", bg: "rgba(6,182,212,0.1)", color: "#22d3ee", border: "rgba(6,182,212,0.2)" },
                    pendente: { label: "Pendente", bg: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "rgba(245,158,11,0.2)" },
                    erro: { label: "Erro", bg: "rgba(239,68,68,0.1)", color: "#f87171", border: "rgba(239,68,68,0.2)" },
                  };
                  const st = statusMap[arq.status] || statusMap.pendente;
                  const isPreviewAtivo = previewArquivo?.id === arq.id;

                  return (
                    <div
                      key={arq.id || idx}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "12px 16px", borderRadius: 12,
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: isPreviewAtivo ? "rgba(245,158,11,0.06)" : "transparent",
                        border: isPreviewAtivo ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
                        transition: "all 0.2s",
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
                        <div
                          style={{
                            fontSize: "0.85rem", fontWeight: 700,
                            color: naoIdentificado ? "var(--gab-amber-light, #f59e0b)" : "var(--gab-text-primary)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}
                        >
                          {naoIdentificado ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{
                                fontSize: "0.6rem", padding: "1px 5px", borderRadius: 4,
                                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                                color: "var(--gab-amber-light)", fontWeight: 700, flexShrink: 0,
                              }}>⚠ QR</span>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                {arq.nome_aluno || arq.arquivo_nome || "Aluno não identificado"}
                              </span>
                            </span>
                          ) : (
                            arq.nome_aluno || arq.arquivo_nome || "Aluno não identificado"
                          )}
                        </div>
                        {arq.codigo_aluno && !naoIdentificado ? (
                          <div style={{ fontSize: "0.7rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                            RE: {arq.codigo_aluno}
                          </div>
                        ) : naoIdentificado ? (
                          <div
                            onClick={(e) => { e.stopPropagation(); abrirVinculoAluno(arq); }}
                            style={{
                              fontSize: "0.65rem", color: "var(--gab-cyan-light)", marginTop: 2,
                              cursor: "pointer", textDecoration: "underline",
                              textDecorationStyle: "dotted",
                            }}
                          >
                            👤 Vincular aluno manualmente
                          </div>
                        ) : null}
                      </div>

                      {/* Nota (se corrigido) */}
                      {arq.status === "corrigido" && arq.nota != null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#34d399" }}>
                            {Number(arq.nota).toFixed(1)}
                          </div>
                          {/* Botão revisar ajustes (coordenador) — só aparece se há ajustes */}
                          {Number(arq.ajustes_pendentes) > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); abrirRevisaoAjustes(arq); }}
                            title={`${arq.ajustes_pendentes} ajuste(s) pendente(s)`}
                            style={{
                              padding: "2px 6px", borderRadius: 6, fontSize: "0.58rem", fontWeight: 700,
                              background: ajustesReviewArquivo?.id === arq.id
                                ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                : "rgba(245,158,11,0.12)",
                              color: ajustesReviewArquivo?.id === arq.id ? "#fff" : "#fbbf24",
                              border: `1px solid ${ajustesReviewArquivo?.id === arq.id ? "transparent" : "rgba(245,158,11,0.25)"}`,
                              cursor: "pointer", transition: "all 0.2s",
                              display: "flex", alignItems: "center", gap: 2,
                            }}
                          >
                            ✏️
                          </button>
                          )}
                        </div>
                      )}

                      {/* Badge: Visualizar (para não identificados) ou status normal */}
                      {naoIdentificado && (arq.status === "identificado" || arq.status === "pendente" || arq.status === "erro") ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); abrirPreviewVinculo(arq); }}
                          style={{
                            padding: "4px 12px", borderRadius: 8, fontSize: "0.65rem", fontWeight: 700,
                            background: isPreviewAtivo
                              ? "linear-gradient(135deg, #f59e0b, #d97706)"
                              : "rgba(245,158,11,0.12)",
                            color: isPreviewAtivo ? "#fff" : "#fbbf24",
                            border: `1px solid ${isPreviewAtivo ? "transparent" : "rgba(245,158,11,0.25)"}`,
                            whiteSpace: "nowrap", flexShrink: 0,
                            cursor: "pointer", transition: "all 0.2s",
                            fontFamily: "var(--gab-font-body)",
                            display: "flex", alignItems: "center", gap: 4,
                            boxShadow: isPreviewAtivo ? "0 2px 8px rgba(245,158,11,0.3)" : "none",
                          }}
                        >
                          👁 Visualizar
                        </button>
                      ) : (
                        <span style={{
                          padding: "3px 10px", borderRadius: 8, fontSize: "0.65rem", fontWeight: 700,
                          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                          whiteSpace: "nowrap", flexShrink: 0,
                        }}>
                          {st.label}
                        </span>
                      )}

                      {/* Botão excluir arquivo */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteArquivoModal(arq); }}
                        title="Excluir este gabarito"
                        style={{
                          width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(239,68,68,0.06)", transition: "all 0.2s", flexShrink: 0,
                          marginLeft: 2,
                        }}
                      >
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* ═══ Painel inline: Preview da Imagem + Vincular Aluno ═══ */}
            {previewArquivo && (
              <div style={{
                borderTop: "1px solid rgba(245,158,11,0.25)",
                background: "linear-gradient(145deg, rgba(15,19,33,0.98), rgba(26,31,46,0.98))",
                padding: 0,
              }}>
                {/* Header do preview */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 18px",
                  background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(6,182,212,0.04))",
                  borderBottom: "1px solid rgba(245,158,11,0.12)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.85rem",
                    }}>📄</div>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--gab-amber-light, #f59e0b)" }}>
                        Gabarito Escaneado
                      </div>
                      <div style={{ fontSize: "0.62rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                        {previewArquivo.arquivo_nome} — clique na imagem para ampliar
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {previewImgUrl && (
                      <button
                        onClick={() => setPreviewFullscreen(true)}
                        title="Ampliar imagem"
                        style={{
                          width: 30, height: 30, borderRadius: 7,
                          background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)",
                          color: "var(--gab-cyan-light)", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.75rem", transition: "all 0.2s",
                        }}
                      >🔍</button>
                    )}
                    <button
                      onClick={() => { if (previewImgUrl) URL.revokeObjectURL(previewImgUrl); setPreviewArquivo(null); setPreviewImgUrl(null); }}
                      style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                        color: "#f87171", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.8rem", fontWeight: 700, transition: "all 0.2s",
                      }}
                    >✕</button>
                  </div>
                </div>

                {/* Imagem do gabarito */}
                <div style={{ padding: "10px 18px" }}>
                  {previewLoading ? (
                    <div style={{
                      textAlign: "center", padding: "30px 0",
                      background: "rgba(0,0,0,0.15)", borderRadius: 10,
                    }}>
                      <div className="gab-spinner" style={{ margin: "0 auto 8px", width: 24, height: 24 }} />
                      <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)" }}>Carregando gabarito escaneado...</div>
                    </div>
                  ) : previewImgUrl ? (
                    <div
                      onClick={() => setPreviewFullscreen(true)}
                      style={{
                        borderRadius: 10, overflow: "hidden",
                        border: "1px solid rgba(245,158,11,0.15)",
                        cursor: "pointer", position: "relative",
                        maxHeight: 220,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.2)",
                        transition: "all 0.25s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(245,158,11,0.1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <img
                        src={previewImgUrl}
                        alt="Gabarito escaneado"
                        style={{ width: "100%", objectFit: "contain", display: "block", maxHeight: 220 }}
                        draggable={false}
                      />
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: 10,
                        background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.5) 100%)",
                        display: "flex", alignItems: "flex-end", justifyContent: "center",
                        paddingBottom: 8, pointerEvents: "none",
                      }}>
                        <span style={{
                          fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.8)",
                          background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: 16,
                          backdropFilter: "blur(4px)",
                        }}>🔍 Clique para ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: "center", padding: "20px 0",
                      background: "rgba(239,68,68,0.04)", borderRadius: 10,
                      border: "1px solid rgba(239,68,68,0.1)",
                    }}>
                      <div style={{ fontSize: "0.78rem", color: "#f87171" }}>Erro ao carregar imagem</div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ═══ Painel inline: Vincular Aluno ═══ */}
            {vinculoArquivo && (
              <div style={{
                borderTop: "1px solid rgba(245,158,11,0.2)",
                background: "linear-gradient(135deg, rgba(245,158,11,0.04), rgba(6,182,212,0.03))",
                padding: "14px 16px 12px",
              }}>
                {/* Header do painel */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.9rem" }}>👤</span>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                        Vincular aluno ao gabarito
                      </div>
                      <div style={{ fontSize: "0.62rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                        {vinculoArquivo.arquivo_nome} · {alunosTurmaDisp.length} aluno(s) disponível(is)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setVinculoArquivo(null)}
                    style={{
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                      color: "#f87171", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                      borderRadius: 6, padding: "4px 10px", fontFamily: "var(--gab-font-body)",
                    }}
                  >✕ Cancelar</button>
                </div>

                {/* Busca */}
                <input
                  type="text"
                  placeholder="🔍 Buscar aluno pelo nome..."
                  value={filtroVinculo}
                  onChange={(e) => setFiltroVinculo(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: "0.78rem",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--gab-text-primary)", outline: "none", marginBottom: 8,
                    fontFamily: "var(--gab-font-body)",
                  }}
                />

                {/* Lista de alunos disponíveis */}
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {loadingAlunosTurma ? (
                    <div style={{ textAlign: "center", padding: 20 }}>
                      <div className="gab-spinner" style={{ margin: "0 auto 8px", width: 20, height: 20 }} />
                      <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)" }}>Buscando alunos...</div>
                    </div>
                  ) : alunosTurmaDisp.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 16, fontSize: "0.78rem", color: "var(--gab-text-muted)" }}>
                      Todos os alunos já foram vinculados.
                    </div>
                  ) : (
                    alunosTurmaDisp
                      .filter(al => !filtroVinculo || al.estudante.toLowerCase().includes(filtroVinculo.toLowerCase()))
                      .map(aluno => (
                        <div
                          key={aluno.id}
                          onClick={() => !vinculandoAluno && executarVinculo(aluno)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                            cursor: vinculandoAluno ? "not-allowed" : "pointer",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.04)",
                            transition: "all 0.15s",
                            opacity: vinculandoAluno ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!vinculandoAluno) {
                              e.currentTarget.style.background = "rgba(6,182,212,0.06)";
                              e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                          }}
                        >
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))",
                            border: "1px solid rgba(6,182,212,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.75rem", fontWeight: 800, color: "#22d3ee",
                          }}>
                            {aluno.estudante.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: "0.78rem", fontWeight: 700, color: "var(--gab-text-primary)",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {aluno.estudante}
                            </div>
                            <div style={{ fontSize: "0.62rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                              RE: {aluno.codigo}
                            </div>
                          </div>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(148,163,184,0.4)" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* ═══ Painel inline: Revisão de Ajustes Manuais (Coordenador) ═══ */}
            {ajustesReviewArquivo && (
              <div style={{
                borderTop: "1px solid rgba(245,158,11,0.2)",
                background: "linear-gradient(135deg, rgba(245,158,11,0.03), rgba(139,92,246,0.02))",
                padding: "14px 16px 12px",
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.9rem" }}>✏️</span>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                        Ajustes Manuais — {ajustesReviewArquivo.nome_aluno || ajustesReviewArquivo.arquivo_nome}
                      </div>
                      <div style={{ fontSize: "0.6rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                        Sugestões do professor · Aprove ou rejeite cada ajuste
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => abrirPreviewVinculo(ajustesReviewArquivo)}
                      title="Ver imagem do gabarito"
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: "0.62rem", fontWeight: 700,
                        background: previewArquivo?.id === ajustesReviewArquivo?.id
                          ? "linear-gradient(135deg, #06b6d4, #0891b2)"
                          : "rgba(6,182,212,0.08)",
                        color: previewArquivo?.id === ajustesReviewArquivo?.id ? "#fff" : "#22d3ee",
                        border: `1px solid ${previewArquivo?.id === ajustesReviewArquivo?.id ? "transparent" : "rgba(6,182,212,0.2)"}`,
                        cursor: "pointer", transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: 4,
                        fontFamily: "var(--gab-font-body)",
                      }}
                    >
                      👁 Ver Gabarito
                    </button>
                    <button
                      onClick={() => { setAjustesReviewArquivo(null); setAjustesList([]); }}
                      style={{ background: "none", border: "none", color: "var(--gab-text-muted)", cursor: "pointer", padding: 4 }}
                    >✕</button>
                  </div>
                </div>

                {ajustesLoading ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div className="gab-spinner" />
                  </div>
                ) : ajustesList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "12px 0", fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                    Nenhum ajuste manual foi solicitado para este aluno.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ajustesList.map(aj => {
                      const isPendente = aj.status === "pendente";
                      const isAprovado = aj.status === "aprovado";
                      const isRejeitado = aj.status === "rejeitado";
                      return (
                        <div key={aj.id} style={{
                          padding: "10px 12px", borderRadius: 10,
                          background: isAprovado ? "rgba(16,185,129,0.05)" : isRejeitado ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isAprovado ? "rgba(16,185,129,0.15)" : isRejeitado ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.7rem", fontWeight: 800, color: "var(--gab-amber-light)",
                              }}>
                                Q{String(aj.questao_numero).padStart(2, "0")}
                              </span>
                              <div>
                                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                                  Professor sugere: <span style={{
                                    color: aj.tipo_ajuste === "acerto" ? "#34d399" : "#f87171",
                                    fontWeight: 800,
                                  }}>
                                    {aj.tipo_ajuste === "acerto" ? "✓ ACERTO" : "✗ ERRO"}
                                  </span>
                                </div>
                                {aj.professor_nome && (
                                  <div style={{ fontSize: "0.6rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                                    por {aj.professor_nome}
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Status */}
                            {!isPendente && (
                              <span style={{
                                padding: "2px 8px", borderRadius: 6, fontSize: "0.58rem", fontWeight: 700,
                                background: isAprovado ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                color: isAprovado ? "#34d399" : "#f87171",
                                border: `1px solid ${isAprovado ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                              }}>
                                {isAprovado ? "APROVADO" : "REJEITADO"}
                              </span>
                            )}
                          </div>

                          {/* Justificativa */}
                          {aj.justificativa && (
                            <div style={{
                              padding: "6px 10px", borderRadius: 6,
                              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                              fontSize: "0.68rem", color: "var(--gab-text-secondary)",
                              marginBottom: 8, fontStyle: "italic",
                            }}>
                              "{aj.justificativa}"
                            </div>
                          )}

                          {/* Ações (apenas se pendente) */}
                          {isPendente && (
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button
                                onClick={() => decidirAjuste(aj.id, "rejeitado")}
                                disabled={decidindoAjusteId === aj.id}
                                style={{
                                  padding: "6px 14px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 700,
                                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                                  color: "#f87171", cursor: "pointer", transition: "all 0.2s",
                                }}
                              >
                                ✗ Rejeitar
                              </button>
                              <button
                                onClick={() => decidirAjuste(aj.id, "aprovado")}
                                disabled={decidindoAjusteId === aj.id}
                                style={{
                                  padding: "6px 14px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 700,
                                  background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))",
                                  border: "1px solid rgba(16,185,129,0.2)",
                                  color: "#34d399", cursor: "pointer", transition: "all 0.2s",
                                }}
                              >
                                ✓ Aprovar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div style={{
              padding: "12px 28px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", justifyContent: "center",
            }}>
              <button
                onClick={fecharModalAlunos}
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

      {/* ═══ Fullscreen: Imagem do Gabarito ampliada ═══ */}
      {previewFullscreen && previewImgUrl && (
        <div
          onClick={() => setPreviewFullscreen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
            animation: "gab-fade-in 0.2s ease-out",
            cursor: "zoom-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "95vw", maxHeight: "95vh",
              animation: "gab-slide-up 0.3s ease-out",
            }}
          >
            <img
              src={previewImgUrl}
              alt="Gabarito ampliado"
              style={{
                maxWidth: "95vw", maxHeight: "90vh",
                objectFit: "contain", borderRadius: 12,
                boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              }}
              draggable={false}
            />
            {/* Header com nome do arquivo */}
            <div style={{
              position: "absolute", top: -40, left: 0, right: 0,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 4px",
            }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                📄 {previewArquivo?.arquivo_nome}
              </div>
              <button
                onClick={() => setPreviewFullscreen(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >✕</button>
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

      {/* ═══ Modal Premium — Excluir Arquivo/Gabarito Individual ═══ */}
      {deleteArquivoModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
            animation: "gab-fade-in 0.25s ease-out",
          }}
          onClick={() => !deletingArquivoId && setDeleteArquivoModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, #1a1f2e 0%, #111827 100%)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 22, maxWidth: 460, width: "95%",
              padding: 0, overflow: "hidden",
              boxShadow: "0 28px 72px rgba(0,0,0,0.6), 0 0 48px rgba(239,68,68,0.08)",
              animation: "gab-slide-up 0.35s ease-out",
            }}
          >
            {/* Header vermelho */}
            <div style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))",
              borderBottom: "1px solid rgba(239,68,68,0.15)",
              padding: "24px 28px 20px",
              textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gab-text-primary)", marginBottom: 6 }}>
                Excluir Gabarito
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--gab-text-muted)", lineHeight: 1.5 }}>
                Esta ação é permanente e não pode ser desfeita.
              </div>
            </div>

            {/* Corpo */}
            <div style={{ padding: "20px 28px 24px" }}>
              {/* Card com dados do arquivo */}
              <div style={{
                padding: "14px 16px", borderRadius: 12, marginBottom: 16,
                background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
                  }}>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.9rem", fontWeight: 700, color: "#f87171",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {deleteArquivoModal.nome_aluno && !pareceNomeArquivo(deleteArquivoModal.nome_aluno)
                        ? deleteArquivoModal.nome_aluno
                        : deleteArquivoModal.arquivo_nome || "Arquivo sem identificação"}
                    </div>
                    {deleteArquivoModal.codigo_aluno && (
                      <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                        RE: {deleteArquivoModal.codigo_aluno}
                      </div>
                    )}
                    <div style={{
                      marginTop: 4, display: "inline-block",
                      padding: "1px 8px", borderRadius: 6, fontSize: "0.6rem", fontWeight: 700,
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171", textTransform: "uppercase",
                    }}>
                      {deleteArquivoModal.status || "pendente"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Aviso */}
              <div style={{
                padding: "10px 14px", borderRadius: 10, marginBottom: 22, fontSize: "0.75rem",
                background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)",
                color: "var(--gab-text-muted)", lineHeight: 1.5,
              }}>
                ⚠️ O arquivo escaneado
                {deleteArquivoModal.status === "corrigido" ? ", a correção e todos os ajustes manuais " : " "}
                serão removidos permanentemente do sistema.
              </div>

              {/* Botões */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setDeleteArquivoModal(null)}
                  disabled={!!deletingArquivoId}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700,
                    background: "rgba(255,255,255,0.04)", color: "var(--gab-text-primary)",
                    border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                    transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => excluirArquivo(deleteArquivoModal)}
                  disabled={!!deletingArquivoId}
                  style={{
                    flex: 2, padding: "11px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700,
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "#fff", border: "none",
                    cursor: deletingArquivoId ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
                    transition: "all 0.2s", fontFamily: "var(--gab-font-body)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: deletingArquivoId ? 0.65 : 1,
                  }}
                >
                  {deletingArquivoId === deleteArquivoModal.id ? (
                    <><div className="gab-spinner" /> Excluindo...</>
                  ) : (
                    <>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Sim, Excluir Gabarito
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Premium — Aviso: Alunos Não Identificados ═══ */}
      {avisoNaoIdentificado && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
            animation: "gab-fade-in 0.2s ease-out",
          }}
          onClick={() => setAvisoNaoIdentificado(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, #1a1f2e 0%, #111827 100%)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 20, maxWidth: 440, width: "95%",
              padding: 0, overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(245,158,11,0.08)",
              animation: "gab-slide-up 0.35s ease-out",
            }}
          >
            {/* Faixa de alerta no topo */}
            <div style={{
              height: 4,
              background: "linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)",
              backgroundSize: "200% 100%",
              animation: "gabPulse 2s ease-in-out infinite",
            }} />

            {/* Corpo */}
            <div style={{ padding: "28px 28px 24px" }}>
              {/* Ícone + título */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem",
                }}>⚠️</div>
                <div>
                  <div style={{
                    fontSize: "1rem", fontWeight: 800,
                    color: "#fbbf24",
                    letterSpacing: "0.2px", marginBottom: 4,
                  }}>
                    Alunos não identificados
                  </div>
                  <div style={{
                    fontSize: "0.8rem", color: "var(--gab-text-muted)", lineHeight: 1.5,
                  }}>
                    Turma <strong style={{ color: "var(--gab-text-primary)" }}>{avisoNaoIdentificado.loteName}</strong>
                  </div>
                </div>
              </div>

              {/* Contador de pendentes */}
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 12, marginBottom: 18,
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.18)",
              }}>
                <div style={{ textAlign: "center", minWidth: 56 }}>
                  <div style={{
                    fontSize: "1.8rem", fontWeight: 900, lineHeight: 1,
                    color: "#f59e0b",
                  }}>
                    {avisoNaoIdentificado.pendentes}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "var(--gab-text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    pendente{avisoNaoIdentificado.pendentes > 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ width: 1, height: 36, background: "rgba(245,158,11,0.2)" }} />
                <div style={{ fontSize: "0.8rem", color: "var(--gab-text-muted)", lineHeight: 1.55 }}>
                  <strong style={{ color: "var(--gab-text-primary)" }}>
                    {avisoNaoIdentificado.pendentes} de {avisoNaoIdentificado.total}
                  </strong> gabaritos ainda não foram identificados.<br />
                  Identifique todos os alunos antes de vincular o professor para correção.
                </div>
              </div>

              {/* Instrução */}
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 14px", borderRadius: 10, marginBottom: 22,
                background: "rgba(6,182,212,0.04)",
                border: "1px solid rgba(6,182,212,0.12)",
                fontSize: "0.78rem", color: "var(--gab-text-muted)", lineHeight: 1.55,
              }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>💡</span>
                <span>
                  Clique no banner da turma para abrir o painel e identificar os alunos pendentes automaticamente ou de forma manual.
                </span>
              </div>

              {/* Botão ENTENDI */}
              <button
                onClick={() => setAvisoNaoIdentificado(null)}
                style={{
                  width: "100%", padding: "13px",
                  borderRadius: 12, border: "none",
                  fontSize: "0.88rem", fontWeight: 800, letterSpacing: "0.4px",
                  background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                  color: "#fff", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
                  transition: "all 0.2s",
                  fontFamily: "var(--gab-font-display)",
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(245,158,11,0.45)"; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(245,158,11,0.35)"; }}
              >
                ENTENDI
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
                  <div style={{ color: "var(--gab-text-muted)", fontSize: "0.82rem" }}>Carregando corretores...</div>
                </div>
              ) : professoresDisponiveis.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>
                  {profFiltro ? "Nenhum corretor encontrado com esse nome." : "Nenhum corretor disponível."}
                </div>
              ) : (
                professoresDisponiveis.map(prof => (
                  <button
                    key={prof.id || prof.usuario_id || prof.nome}
                    type="button"
                    onClick={() => vincularProfessor(profModalLote.id, prof.id || prof.usuario_id)}
                    disabled={vinculandoProf || (!prof.id && !prof.usuario_id)}
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
                    {/* Foto do corretor (com iniciais como fallback se foto falhar) */}
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                      padding: prof.foto ? 2 : 0,
                      background: prof.foto
                        ? "linear-gradient(135deg, #06b6d4, #8b5cf6)"
                        : "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))",
                      border: prof.foto ? "none" : "2px solid rgba(6,182,212,0.2)",
                      position: "relative",
                    }}>
                      {prof.foto && (
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
                            if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      )}
                      {/* Iniciais (fallback — visível quando não há foto ou quando foto falha) */}
                      <div style={{
                        width: "100%", height: "100%", borderRadius: "50%",
                        display: prof.foto ? "none" : "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: "0.78rem", fontWeight: 800, color: "var(--gab-cyan-light, #22d3ee)",
                        fontFamily: "var(--gab-font-display)",
                        position: prof.foto ? "absolute" : "static",
                        top: 0, left: 0,
                        background: prof.foto ? "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))" : "transparent",
                      }}>
                        {prof.nome ? prof.nome.split(" ").map(n => n[0]).slice(0, 2).join("") : "?"}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "0.88rem", fontWeight: 700, color: "var(--gab-text-primary)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {prof.nome}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 2, flexWrap: "wrap" }}>
                        {prof.perfil && (
                          <span style={{
                            fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
                            padding: "1px 6px", borderRadius: 6, letterSpacing: "0.4px",
                            background: prof.perfil === "professor" ? "rgba(16,185,129,0.12)" :
                              prof.perfil === "coordenador" ? "rgba(139,92,246,0.12)" :
                              prof.perfil === "diretor" || prof.perfil === "vice_diretor" ? "rgba(245,158,11,0.12)" :
                              "rgba(6,182,212,0.12)",
                            color: prof.perfil === "professor" ? "#10b981" :
                              prof.perfil === "coordenador" ? "#8b5cf6" :
                              prof.perfil === "diretor" || prof.perfil === "vice_diretor" ? "#f59e0b" :
                              "#06b6d4",
                          }}>
                            {prof.perfil === "vice_diretor" ? "Vice-Diretor" : prof.perfil}
                            {prof.disciplina_nome ? ` · ${prof.disciplina_nome}` : ""}
                          </span>
                        )}
                        {prof.turno && <span style={{ color: "var(--gab-text-muted)" }}>· {prof.turno}</span>}
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
              Clique no nome do corretor para vinculá-lo à turma <strong>{profModalLote.turma_nome}</strong>
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

      {/* ─── Modal: Cancelar / Anular Questão em Lote ─── */}
      {cancelQuestaoModal && avaliacaoAtiva && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => !cancelQuestaoSalvando && setCancelQuestaoModal(false)}
        >
          <style>{`@keyframes gab-modal-pop { from { opacity:0; transform:scale(0.88) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--gab-surface, #1a1f2e)", borderRadius: 20,
              border: "1px solid rgba(245,158,11,0.25)", padding: "32px",
              width: "100%", maxWidth: 500,
              boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(245,158,11,0.05)",
              animation: "gab-modal-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", margin: "0 auto 12px",
                background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.25))",
                border: "2px solid rgba(245,158,11,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem",
              }}>⚠</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gab-text-primary)" }}>
                Cancelar / Anular Questão
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                {avaliacaoAtiva.titulo}
                &nbsp;·&nbsp;{avaliacaoAtiva.num_questoes} questões no total
              </div>
            </div>

            {/* Número da questão */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--gab-text-muted)", marginBottom: 6, letterSpacing: "0.5px" }}>
                NÚMERO DA QUESTÃO *
              </label>
              <input
                type="number"
                className="gab-input"
                min={1}
                max={avaliacaoAtiva.num_questoes}
                value={cancelQuestaoNum}
                onChange={e => setCancelQuestaoNum(e.target.value)}
                placeholder={`1 a ${avaliacaoAtiva.num_questoes}`}
                autoFocus
                style={{ fontSize: "1.3rem", fontWeight: 800, textAlign: "center" }}
              />
            </div>

            {/* Modo */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--gab-text-muted)", marginBottom: 8, letterSpacing: "0.5px" }}>
                EFEITO DO CANCELAMENTO *
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    id: "bonificar",
                    label: "✓ Bonificar todos",
                    desc: "Todos ganham o ponto desta questão, independente da resposta marcada.",
                    cor: "#10b981",
                    bgA: "rgba(16,185,129,",
                  },
                  {
                    id: "desconsiderar",
                    label: "⊘ Desconsiderar questão",
                    desc: `Questão removida do total. Nota calculada sobre ${avaliacaoAtiva.num_questoes - 1} questões.`,
                    cor: "#f59e0b",
                    bgA: "rgba(245,158,11,",
                  },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCancelQuestaoModo(opt.id)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "12px 16px", borderRadius: 12, textAlign: "left", cursor: "pointer",
                      border: `1.5px solid ${cancelQuestaoModo === opt.id ? opt.cor : "rgba(255,255,255,0.07)"}`,
                      background: cancelQuestaoModo === opt.id ? `${opt.bgA}0.07)` : "rgba(255,255,255,0.02)",
                      transition: "all 0.2s", width: "100%", fontFamily: "var(--gab-font-body)",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                      border: `2px solid ${cancelQuestaoModo === opt.id ? opt.cor : "rgba(255,255,255,0.18)"}`,
                      background: cancelQuestaoModo === opt.id ? opt.cor : "transparent",
                      transition: "all 0.2s",
                    }} />
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: cancelQuestaoModo === opt.id ? opt.cor : "var(--gab-text-primary)" }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--gab-text-muted)", marginBottom: 6, letterSpacing: "0.5px" }}>
                MOTIVO / JUSTIFICATIVA (opcional)
              </label>
              <textarea
                className="gab-input"
                value={cancelQuestaoMotivo}
                onChange={e => setCancelQuestaoMotivo(e.target.value)}
                placeholder="Ex: O gabarito oficial estava incorreto para esta questão..."
                rows={2}
                style={{ resize: "vertical", fontSize: "0.82rem" }}
              />
            </div>

            {/* Aviso */}
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 22,
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
              fontSize: "0.72rem", color: "rgba(245,158,11,0.85)", lineHeight: 1.5,
            }}>
              <strong>⚡ Efeito imediato:</strong> ao confirmar, TODAS as notas desta avaliação serão recalculadas automaticamente para todos os alunos já corrigidos. Esta ação é reversível.
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelQuestaoModal(false)}
                disabled={cancelQuestaoSalvando}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10, fontWeight: 700,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--gab-text-muted)", cursor: "pointer", fontSize: "0.85rem",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarCancelamentoQuestao}
                disabled={cancelQuestaoSalvando || !cancelQuestaoNum}
                style={{
                  flex: 2, padding: "12px", borderRadius: 10, fontWeight: 700,
                  background: cancelQuestaoSalvando || !cancelQuestaoNum
                    ? "rgba(245,158,11,0.25)"
                    : "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  cursor: cancelQuestaoSalvando || !cancelQuestaoNum ? "not-allowed" : "pointer",
                  color: "#fff", fontSize: "0.88rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s",
                }}
              >
                {cancelQuestaoSalvando ? (
                  <><div className="gab-spinner" /> Recalculando...</>
                ) : (
                  <>⚠ Confirmar Cancelamento</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

