// ============================================================================
// ETAPA 2 — Corrigir Gabarito (Hub Central do Módulo)
// Funcionalidades:
//   - Selecionar/criar avaliação (gabarito oficial)
//   - Upload de imagem (individual ou lote)
//   - Detecção automática do aluno (OCR/QR)
//   - Correção por visão computacional
//   - Resultado visual comparativo
//   - Salvar no banco
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import ModalGabaritoOficial from "./components/ModalGabaritoOficial";
import api from "../../services/api";

const PYTHON_API = "http://localhost:8500";

export default function GabaritoCorrigir() {
  // ─── Estado da avaliação (gabarito oficial) ───
  const [avaliacaoAtiva, setAvaliacaoAtiva] = useState(null);
  const [modalOficialOpen, setModalOficialOpen] = useState(false);

  // ─── Estado do upload/arquivo ───
  const [arquivo, setArquivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Estado do aluno detectado ───
  const [alunoInfo, setAlunoInfo] = useState(null);
  const [loadingAluno, setLoadingAluno] = useState(false);

  // ─── Estado da correção ───
  const [correcao, setCorrecao] = useState(null);
  const [respostasAluno, setRespostasAluno] = useState([]);
  const [loadingCorrecao, setLoadingCorrecao] = useState(false);

  // ─── Controles ───
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);

  // ─── Toast com auto-hide ───
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Quando fecha o modal com avaliação configurada ───
  function handleAvaliacaoSalva(avaliacao) {
    setAvaliacaoAtiva(avaliacao);
    setModalOficialOpen(false);
    showToast(`Gabarito "${avaliacao.titulo}" configurado!`, "success");
  }

  // ─── Upload de arquivo (click ou drag) ───
  function handleFileSelect(file) {
    if (!file) return;
    const isValid = ["application/pdf", "image/jpeg", "image/png", "image/jpg"].includes(file.type);
    if (!isValid) {
      showToast("Formato inválido! Use PDF, JPEG ou PNG.", "error");
      return;
    }

    setArquivo(file);
    setCorrecao(null);
    setRespostasAluno([]);
    setAlunoInfo(null);

    // Gerar preview
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      // Para PDF, usamos um placeholder
      setPreviewUrl(null);
    }

    // Detectar aluno via OCR
    detectarAluno(file);
  }

  function handleInputChange(e) {
    handleFileSelect(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  // ─── Detectar Aluno via OCR ───
  async function detectarAluno(file) {
    setLoadingAluno(true);
    setAlunoInfo(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await api.post("/ocr/azure-text", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = resp.data;

      if (!data.text) {
        setAlunoInfo({ codigo: "-", nome: "NÃO DETECTADO", turma: "-" });
        setLoadingAluno(false);
        return;
      }

      // Extrair código do texto OCR
      const codigo = extrairCodigo(data.text);
      if (!codigo) {
        setAlunoInfo({ codigo: "-", nome: "CÓDIGO NÃO DETECTADO", turma: "-" });
        setLoadingAluno(false);
        return;
      }

      // Buscar dados do aluno no banco
      try {
        const respAluno = await api.get(`/alunos/por-codigo/${codigo}`);
        const dataAluno = respAluno.data;
        if (!dataAluno.nome) {
          setAlunoInfo({ codigo, nome: "NÃO ENCONTRADO", turma: "-" });
        } else {
          setAlunoInfo({
            codigo: String(codigo).toUpperCase(),
            nome: String(dataAluno.nome).toUpperCase(),
            turma: String(dataAluno.turma).toUpperCase(),
          });
        }
      } catch {
        setAlunoInfo({ codigo, nome: "ERRO AO BUSCAR", turma: "-" });
      }
    } catch {
      setAlunoInfo({ codigo: "-", nome: "ERRO OCR", turma: "-" });
    }
    setLoadingAluno(false);
  }

  // Extrair código do aluno do texto OCR (reconhece "RE" e "CÓDIGO")
  function extrairCodigo(texto) {
    if (!texto) return null;
    // Tenta encontrar "RE:" ou "CÓDIGO:" seguido de número
    const match = texto.match(/(?:RE|C[ÓO]DIGO)\s*[:\-–]?\s*([0-9]{5,10})/i);
    if (match) return match[1].trim();
    const linhas = texto.split(/\r?\n/);
    for (let i = 0; i < linhas.length; i++) {
      if (/(?:RE|C[ÓO]DIGO)\s*[:\-–]?\s*$/i.test(linhas[i].trim())) {
        for (let j = i + 1; j <= i + 8 && j < linhas.length; j++) {
          const n = linhas[j].match(/([0-9]{5,10})/);
          if (n) return n[1];
        }
      }
    }
    for (let i = 0; i < linhas.length; i++) {
      if (/(?:RE|C[ÓO]DIGO)/.test(linhas[i].toUpperCase())) {
        for (let j = i; j < linhas.length && j < i + 12; j++) {
          const n = linhas[j].match(/\b(\d{5,10})\b/);
          if (n) return n[1];
        }
      }
    }
    const fallback = texto.match(/\b(\d{5,10})\b/);
    return fallback ? fallback[1] : null;
  }

  // ─── Corrigir Gabarito ───
  async function handleCorrigir() {
    if (!arquivo) {
      showToast("Selecione um gabarito para corrigir.", "error");
      return;
    }
    if (!avaliacaoAtiva || !avaliacaoAtiva.gabarito || avaliacaoAtiva.gabarito.length === 0) {
      showToast("Configure o gabarito oficial antes de corrigir!", "error");
      return;
    }

    setLoadingCorrecao(true);
    setCorrecao(null);

    try {
      // 1. Crop do gabarito via Python
      const formData = new FormData();
      formData.append("file", arquivo);

      const respCrop = await fetch(`${PYTHON_API}/crop-gabarito`, {
        method: "POST",
        body: formData,
      });

      if (!respCrop.ok) {
        showToast("Erro ao processar imagem (crop).", "error");
        setLoadingCorrecao(false);
        return;
      }

      const cropBlob = await respCrop.blob();
      setPreviewUrl(URL.createObjectURL(cropBlob));

      // 2. Leitura de bolhas via Python
      const cropFile = new File([cropBlob], "gabarito_crop.png", { type: "image/png" });
      const formDataCrop = new FormData();
      formDataCrop.append("file", cropFile);

      const respBolhas = await fetch(`${PYTHON_API}/corrigir-bolhas`, {
        method: "POST",
        body: formDataCrop,
      });

      if (!respBolhas.ok) {
        showToast("Erro na leitura óptica das bolhas.", "error");
        setLoadingCorrecao(false);
        return;
      }

      const dataBolhas = await respBolhas.json();
      const respostas = dataBolhas.respostas || [];
      setRespostasAluno(respostas);

      // 3. Comparar com gabarito oficial
      const gabOficial = avaliacaoAtiva.gabarito;
      const resultado = respostas.map((resp, idx) => ({
        numero: idx + 1,
        resposta: resp,
        correto: gabOficial[idx] || "",
        acertou: resp === gabOficial[idx],
      }));

      const acertos = resultado.filter((q) => q.acertou).length;
      const totalQuestoes = gabOficial.length;
      const notaTotal = avaliacaoAtiva.notaTotal || 10;
      const valorQuestao = totalQuestoes ? notaTotal / totalQuestoes : 0;
      const nota = parseFloat((acertos * valorQuestao).toFixed(2));

      setCorrecao({
        resultado,
        acertos,
        totalQuestoes,
        nota,
        notaTotal,
      });

      showToast(`Correção concluída! ${acertos}/${totalQuestoes} acertos`, "success");
    } catch (err) {
      console.error("Erro ao corrigir:", err);
      showToast("Erro de conexão com o serviço de correção.", "error");
    } finally {
      setLoadingCorrecao(false);
    }
  }

  // ─── Salvar no banco ───
  async function handleSalvar() {
    if (!correcao || !alunoInfo) {
      showToast("Corrija primeiro para salvar.", "error");
      return;
    }

    setSalvando(true);
    try {
      const resp = await api.post("/gabaritos/corrigir", {
        respostasAluno,
        gabaritoOficial: avaliacaoAtiva.gabarito,
        codigoAluno: alunoInfo.codigo,
        nome: alunoInfo.nome,
        turma: alunoInfo.turma,
        nomeGabarito: avaliacaoAtiva.titulo,
      });

      const data = resp.data;
      if (data.saved || data.success) {
        showToast("Resultado salvo com sucesso!", "success");
      } else {
        showToast("Erro ao salvar resultado.", "error");
      }
    } catch {
      showToast("Erro de conexão ao salvar.", "error");
    }
    setSalvando(false);
  }

  // ─── Limpar / Novo gabarito ───
  function handleNovo() {
    setArquivo(null);
    setPreviewUrl(null);
    setAlunoInfo(null);
    setCorrecao(null);
    setRespostasAluno([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Calcular classe da nota ───
  function getNotaClass() {
    if (!correcao) return "";
    const pct = (correcao.acertos / correcao.totalQuestoes) * 100;
    if (pct >= 70) return "alta";
    if (pct >= 40) return "media";
    return "baixa";
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`gab-toast ${toast.type}`}>
          {toast.type === "success" && (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {toast.type === "error" && (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* Modal do Gabarito Oficial */}
      <ModalGabaritoOficial
        open={modalOficialOpen}
        onClose={() => setModalOficialOpen(false)}
        onSave={handleAvaliacaoSalva}
      />

      {/* ─── Layout principal: 2 colunas ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px", alignItems: "start" }}>

        {/* ═══ COLUNA ESQUERDA ═══ */}
        <div className="gab-flex gab-flex-col gab-gap-20">

          {/* Card: Avaliação Ativa */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon cyan">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <div className="gab-card-title">Gabarito Oficial</div>
            </div>

            {avaliacaoAtiva ? (
              <div className="gab-flex gab-flex-col gab-gap-12">
                <div style={{ 
                  padding: "14px 18px", 
                  background: "rgba(6, 182, 212, 0.06)", 
                  border: "1px solid rgba(6, 182, 212, 0.15)", 
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                      {avaliacaoAtiva.titulo}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                      {avaliacaoAtiva.gabarito.length} questões · {avaliacaoAtiva.numAlternativas} alternativas · Nota {avaliacaoAtiva.notaTotal}
                    </div>
                  </div>
                  <button
                    className="gab-btn gab-btn-ghost gab-btn-sm"
                    onClick={() => setModalOficialOpen(true)}
                  >
                    Alterar
                  </button>
                </div>
                {/* Mini preview do gabarito */}
                <div style={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  gap: "6px",
                  padding: "8px 0",
                }}>
                  {avaliacaoAtiva.gabarito.map((resp, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        background: "rgba(6, 182, 212, 0.1)",
                        border: "1px solid rgba(6, 182, 212, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "var(--gab-cyan-light)",
                        fontFamily: "var(--gab-font-display)",
                      }}
                      title={`Questão ${idx + 1}: ${resp}`}
                    >
                      {resp}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--gab-text-muted)", marginBottom: 16 }}>
                  Configure a avaliação e marque o gabarito oficial
                </p>
                <button
                  className="gab-btn gab-btn-primary"
                  onClick={() => setModalOficialOpen(true)}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Configurar Gabarito Oficial
                </button>
              </div>
            )}
          </div>

          {/* Card: Upload do Gabarito */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon amber">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="gab-card-title">Gabarito do Aluno</div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,image/jpeg,image/png,image/jpg"
              onChange={handleInputChange}
              style={{ display: "none" }}
            />

            {previewUrl ? (
              <div className="gab-flex gab-flex-col gab-gap-16">
                {/* Preview da imagem */}
                <div style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  maxHeight: "320px",
                }}>
                  <img
                    src={previewUrl}
                    alt="Preview do gabarito"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "320px",
                      objectFit: "contain",
                    }}
                  />
                </div>

                {/* Info do aluno detectado */}
                {loadingAluno && (
                  <div className="gab-flex gab-items-center gab-gap-12" style={{ padding: "12px 0" }}>
                    <div className="gab-spinner" />
                    <span style={{ color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>
                      Detectando aluno...
                    </span>
                  </div>
                )}

                {alunoInfo && !loadingAluno && (
                  <div className="gab-aluno-bar">
                    <div className="gab-aluno-avatar">
                      {alunoInfo.nome?.charAt(0) || "?"}
                    </div>
                    <div className="gab-aluno-info">
                      <div className="gab-aluno-field">
                        <span className="gab-aluno-field-label">Código</span>
                        <span className="gab-aluno-field-value">{alunoInfo.codigo}</span>
                      </div>
                      <div className="gab-aluno-field">
                        <span className="gab-aluno-field-label">Nome</span>
                        <span className="gab-aluno-field-value">{alunoInfo.nome}</span>
                      </div>
                      <div className="gab-aluno-field">
                        <span className="gab-aluno-field-label">Turma</span>
                        <span className="gab-aluno-field-value">{alunoInfo.turma}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="gab-flex gab-gap-12">
                  <button
                    className="gab-btn gab-btn-ghost gab-btn-sm"
                    onClick={handleNovo}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Novo
                  </button>
                  <button
                    className="gab-btn gab-btn-primary"
                    onClick={handleCorrigir}
                    disabled={loadingCorrecao || !avaliacaoAtiva}
                    style={{ flex: 1 }}
                  >
                    {loadingCorrecao ? (
                      <>
                        <div className="gab-spinner" />
                        Corrigindo...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Corrigir Gabarito
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`gab-upload-zone ${dragOver ? "dragover" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <svg
                  className="gab-upload-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <div className="gab-upload-text">
                  Arraste o gabarito aqui ou clique para selecionar
                </div>
                <div className="gab-upload-hint">
                  PDF, JPEG ou PNG · Tamanho máximo: 10MB
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ COLUNA DIREITA ═══ */}
        <div className="gab-flex gab-flex-col gab-gap-20">

          {correcao ? (
            <>
              {/* Card: Nota e Resumo */}
              <div className="gab-card" style={{ animation: "gab-slide-up 0.5s ease-out" }}>
                <div className="gab-flex gab-items-center gab-justify-between" style={{ marginBottom: 20 }}>
                  <div className="gab-flex gab-items-center gab-gap-16">
                    <div className={`gab-nota-badge ${getNotaClass()}`}>
                      {correcao.nota.toFixed(1).replace(".", ",")}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                        {correcao.acertos} de {correcao.totalQuestoes} acertos
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                        {((correcao.acertos / correcao.totalQuestoes) * 100).toFixed(0)}% de aproveitamento
                      </div>
                    </div>
                  </div>
                  <div className="gab-flex gab-gap-8">
                    <button
                      className="gab-btn gab-btn-success gab-btn-sm"
                      onClick={handleSalvar}
                      disabled={salvando}
                    >
                      {salvando ? (
                        <>
                          <div className="gab-spinner" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                          </svg>
                          Salvar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Barra de progresso visual */}
                <div className="gab-progress">
                  <div
                    className="gab-progress-bar"
                    style={{ width: `${(correcao.acertos / correcao.totalQuestoes) * 100}%` }}
                  />
                </div>
              </div>

              {/* Card: Tabela Comparativa */}
              <div className="gab-card" style={{ padding: 0, animation: "gab-slide-up 0.6s ease-out" }}>
                <div style={{ padding: "18px 24px 12px" }}>
                  <div className="gab-card-title">Detalhamento Questão a Questão</div>
                </div>
                <div className="gab-table-wrap" style={{ border: "none", borderRadius: 0 }}>
                  <table className="gab-table">
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}></th>
                        {correcao.resultado.map((q) => (
                          <th key={q.numero}>{String(q.numero).padStart(2, "0")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="row-label">Oficial</td>
                        {correcao.resultado.map((q) => (
                          <td key={q.numero} style={{ fontWeight: 600/*, fontFamily: "var(--gab-font-display)"*/ }}>
                            {q.correto}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="row-label">Aluno</td>
                        {correcao.resultado.map((q) => (
                          <td key={q.numero}>
                            {q.resposta || (
                              <span style={{ color: "var(--gab-text-muted)", fontStyle: "italic", fontSize: "0.75rem" }}>—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="row-label">Resultado</td>
                        {correcao.resultado.map((q) => (
                          <td key={q.numero}>
                            {q.acertou ? (
                              <span className="gab-acerto">✓</span>
                            ) : (
                              <span className="gab-erro">✗</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card: Respostas Extraídas */}
              <div className="gab-card" style={{ animation: "gab-slide-up 0.7s ease-out" }}>
                <div className="gab-card-header">
                  <div className="gab-card-icon green">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                  </div>
                  <div className="gab-card-title">Respostas Extraídas (OCR)</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
                  {respostasAluno.map((resp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        background: correcao.resultado[idx]?.acertou
                          ? "rgba(16, 185, 129, 0.08)"
                          : "rgba(239, 68, 68, 0.08)",
                        border: `1px solid ${correcao.resultado[idx]?.acertou
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(239, 68, 68, 0.2)"
                        }`,
                        textAlign: "center",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: "var(--gab-text-muted)", fontSize: "0.65rem", display: "block" }}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span style={{
                        color: correcao.resultado[idx]?.acertou
                          ? "var(--gab-green-light)"
                          : "var(--gab-red-light)",
                        fontFamily: "var(--gab-font-display)",
                        fontSize: "1rem",
                      }}>
                        {resp || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Estado vazio: instrução */
            <div className="gab-card">
              <div className="gab-empty-state">
                <svg
                  className="gab-empty-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="gab-empty-title">Resultado da Correção</div>
                <div className="gab-empty-text">
                  Configure o gabarito oficial, faça upload da folha de resposta do aluno e clique em "Corrigir" para ver o resultado aqui.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
