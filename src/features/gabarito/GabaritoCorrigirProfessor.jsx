// ============================================================================
// ETAPA 2 — Corrigir Gabarito (Fluxo do PROFESSOR)
// ============================================================================
// Layout: 2 Colunas
//   ESQUERDA: Cards de avaliação → expande → lista de alunos com botão Corrigir
//   DIREITA:  Painel de correção (resultado visual)
//
// Governança:
//   - Professor NÃO edita avaliação
//   - Professor NÃO exclui avaliação
//   - Professor só vê turmas vinculadas a ele pelo coordenador
//   - Professor corrige gabarito por aluno
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../services/api";

// ─── Componente: Miniatura do gabarito + Modal premium ───
// Suporta PDF (renderiza 1ª página via canvas) e imagens (JPG/PNG)
function GabaritoImageZoom({ arquivoId, arquivoNome }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    if (!arquivoId) return;
    setLoading(true);
    setImgUrl(null);
    let revoke = null;
    (async () => {
      try {
        const resp = await api.get(`/api/gabarito-lotes/arquivos/${arquivoId}/imagem`, { responseType: "blob" });
        const blob = resp.data;
        const isPdf = blob.type === "application/pdf" || (arquivoNome && arquivoNome.toLowerCase().endsWith(".pdf"));
        if (isPdf) {
          const arrayBuffer = await blob.arrayBuffer();
          if (!window.pdfjsLib) {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.async = true;
            await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          setImgUrl(canvas.toDataURL("image/png"));
        } else {
          revoke = URL.createObjectURL(blob);
          setImgUrl(revoke);
        }
      } catch (err) { console.error("Erro ao carregar imagem:", err); }
      setLoading(false);
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [arquivoId]);

  useEffect(() => {
    if (!modalAberto) return;
    const h = (e) => { if (e.key === "Escape") setModalAberto(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modalAberto]);

  if (loading) return (
    <div className="gab-card" style={{ padding: 20, textAlign: "center", animation: "gab-slide-up 0.35s ease-out" }}>
      <div className="gab-spinner" style={{ margin: "0 auto", width: 24, height: 24 }} />
      <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 8 }}>Carregando gabarito...</div>
    </div>
  );
  if (!imgUrl) return null;

  return (
    <>
      <div className="gab-card" style={{ padding: 16, animation: "gab-slide-up 0.35s ease-out" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--gab-text-secondary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          📄 Gabarito Digitalizado
          <span style={{ fontSize: "0.62rem", fontWeight: 500, color: "var(--gab-text-muted)" }}>— clique para ampliar</span>
        </div>
        <div
          onClick={() => setModalAberto(true)}
          style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", maxHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.15)", transition: "all 0.25s", position: "relative" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.4)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(6,182,212,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <img src={imgUrl} alt="Gabarito" style={{ width: "100%", objectFit: "contain", display: "block", borderRadius: 10, maxHeight: 180 }} draggable={false} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 10, pointerEvents: "none" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.4)", padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)", letterSpacing: "0.5px" }}>🔍 Clique para ampliar</span>
          </div>
        </div>
      </div>

      {modalAberto && (
        <div onClick={() => setModalAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}>
          <style>{`@keyframes gab-modal-pop { from { opacity:0; transform:scale(0.85) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16, overflow: "hidden", background: "linear-gradient(145deg, #1a1f35, #0f1321)", border: "1px solid rgba(6,182,212,0.15)", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.04)", animation: "gab-modal-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "linear-gradient(135deg, rgba(6,182,212,0.06), rgba(139,92,246,0.04))", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.1))", border: "1px solid rgba(6,182,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>📄</div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0" }}>{arquivoNome || "Gabarito Escaneado"}</div>
                  <div style={{ fontSize: "0.62rem", color: "rgba(148,163,184,0.7)", marginTop: 1 }}>Visualização ampliada · ESC para fechar</div>
                </div>
              </div>
              <button onClick={() => setModalAberto(false)} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: "1.1rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.transform = "scale(1.1)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.transform = "scale(1)"; }} title="Fechar (ESC)">✕</button>
            </div>
            <div style={{ overflow: "auto", maxHeight: "calc(90vh - 70px)", padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
              <img src={imgUrl} alt="Gabarito ampliado" style={{ maxWidth: "100%", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} draggable={false} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function GabaritoCorrigirProfessor() {
  // ─── Avaliações ───
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loadingAv, setLoadingAv] = useState(true);
  const [avaliacaoAberta, setAvaliacaoAberta] = useState(null); // ID expandido

  // ─── Alunos (arquivos do lote) ───
  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [turmaAtiva, setTurmaAtiva] = useState(null);
  const [lotes, setLotes] = useState([]);

  // ─── Correção (painel direito) ───
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [correcao, setCorrecao] = useState(null);
  const [loadingCorrecao, setLoadingCorrecao] = useState(false);


  // ─── Professor ID ───
  const [professorIds, setProfessorIds] = useState([]);

  // ─── Toast ───
  const [toast, setToast] = useState(null);
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Resolver professor_ids via endpoint autenticado ───
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get("/api/professores/me/id");
        if (resp.data?.ok && resp.data.professor_ids?.length > 0) {
          setProfessorIds(resp.data.professor_ids);
        }
      } catch (err) {
        console.error("Erro ao resolver professor_ids:", err);
      }
    })();
  }, []);

  // ─── Carregar avaliações publicadas ───
  useEffect(() => {
    (async () => {
      setLoadingAv(true);
      try {
        const resp = await api.get("/api/gabarito-avaliacoes?status=publicada");
        setAvaliacoes(resp.data || []);
      } catch (err) {
        console.error("Erro ao carregar avaliações:", err);
      }
      setLoadingAv(false);
    })();
  }, []);

  // ─── Abrir/Fechar card de avaliação ───
  async function toggleAvaliacao(av) {
    if (avaliacaoAberta === av.id) {
      // Fechar
      setAvaliacaoAberta(null);
      setLotes([]);
      setAlunos([]);
      setTurmaAtiva(null);
      setArquivoSelecionado(null);
      setCorrecao(null);
      return;
    }

    if (!av.gabarito_oficial || av.gabarito_oficial.length === 0) {
      showToast("O gabarito oficial ainda não foi definido pelo coordenador.", "error");
      return;
    }

    setAvaliacaoAberta(av.id);
    setAlunos([]);
    setTurmaAtiva(null);
    setArquivoSelecionado(null);
    setCorrecao(null);
    setLoadingAlunos(true);

    try {
      const resp = await api.get(`/api/gabarito-lotes?avaliacao_id=${av.id}`);
      const todosLotes = resp.data || [];

      // Filtrar apenas lotes vinculados a este professor (pode ter múltiplos IDs)
      const meusLotes = professorIds.length > 0
        ? todosLotes.filter(l => professorIds.includes(l.professor_id))
        : [];
      setLotes(meusLotes);

      // Se tem apenas 1 turma, já abrir direto
      if (meusLotes.length === 1) {
        await carregarAlunos(meusLotes[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar lotes:", err);
      showToast("Erro ao carregar turmas.", "error");
    }
    setLoadingAlunos(false);
  }

  // ─── Carregar lista de alunos de uma turma ───
  async function carregarAlunos(lote) {
    setTurmaAtiva(lote);
    setAlunos([]);
    setLoadingAlunos(true);
    setArquivoSelecionado(null);
    setCorrecao(null);

    try {
      const resp = await api.get(`/api/gabarito-lotes/${lote.id}/arquivos`);
      setAlunos(resp.data || []);
    } catch (err) {
      console.error("Erro ao carregar arquivos:", err);
      showToast("Erro ao carregar gabaritos da turma.", "error");
    }
    setLoadingAlunos(false);
  }

  // ─── Corrigir gabarito de um aluno (painel direito) ───
  // Usa a rota server-side que faz tudo: crop → bolhas → comparação → salvar
  async function corrigirArquivo(arq) {
    const av = avaliacoes.find(a => a.id === avaliacaoAberta);
    if (!av) return;

    setArquivoSelecionado(arq);
    setCorrecao(null);
    setLoadingCorrecao(true);

    try {
      const resp = await api.post(`/api/gabarito-lotes/arquivos/${arq.id}/corrigir`);
      const data = resp.data;

      if (!data.success) throw new Error("Correção falhou");

      const resultado = data.resultado || [];
      const acertos = data.acertos;
      const totalQuestoes = data.totalQuestoes;
      const nota = data.nota;
      const notaTotal = data.notaTotal || av.nota_total || 10;
      const acertosPorDisciplina = data.acertosPorDisciplina || null;

      setCorrecao({ resultado, acertos, totalQuestoes, nota, notaTotal, acertosPorDisciplina });
      showToast(`Correção concluída! ${acertos}/${totalQuestoes} acertos`, "success");

      // Atualizar status + nome do aluno na lista local (backend já salvou)
      setAlunos(prev => prev.map(a =>
        a.id === arq.id
          ? {
              ...a,
              status: "corrigido",
              nota,
              acertos,
              nome_aluno: data.nome_aluno || a.nome_aluno,
              codigo_aluno: data.codigo_aluno || a.codigo_aluno,
            }
          : a
      ));

      // Atualizar o arquivo selecionado também (para o painel direito)
      setArquivoSelecionado(prev => ({
        ...prev,
        nome_aluno: data.nome_aluno || prev?.nome_aluno,
        codigo_aluno: data.codigo_aluno || prev?.codigo_aluno,
      }));
    } catch (err) {
      console.error("Erro ao corrigir:", err);
      const errData = err.response?.data;
      if (errData?.debug) console.error("[DEBUG corrigir]", JSON.stringify(errData.debug, null, 2));
      const msg = errData?.error || "Erro ao corrigir gabarito.";
      showToast(msg, "error");
    }
    setLoadingCorrecao(false);
  }

  // ─── Ver correção já salva (aluno já corrigido) ───
  async function verCorrecaoSalva(arq) {
    const av = avaliacoes.find(a => a.id === avaliacaoAberta);
    if (!av) return;

    setArquivoSelecionado(arq);
    setCorrecao(null);
    setLoadingCorrecao(true);

    try {
      // Re-corrigir via backend (o arquivo já tem respostas_aluno salvas, então é rápido)
      const resp = await api.post(`/api/gabarito-lotes/arquivos/${arq.id}/corrigir`);
      const data = resp.data;

      if (!data.success) throw new Error("Falha ao carregar correção");

      setCorrecao({
        resultado: data.resultado || [],
        acertos: data.acertos,
        totalQuestoes: data.totalQuestoes,
        nota: data.nota,
        notaTotal: data.notaTotal || av.nota_total || 10,
        acertosPorDisciplina: data.acertosPorDisciplina || null,
      });
    } catch (err) {
      console.error("Erro ao carregar correção:", err);
      showToast("Erro ao carregar resultado.", "error");
    }
    setLoadingCorrecao(false);
  }

  // ─── Avaliação ativa (para dados) ───
  const avAtiva = avaliacoes.find(a => a.id === avaliacaoAberta);

  // ─── Contadores ───
  const totalAlunos = alunos.length;
  const corrigidos = alunos.filter(a => a.status === "corrigido").length;
  const pctCorrigido = totalAlunos > 0 ? Math.round((corrigidos / totalAlunos) * 100) : 0;

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
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

      {/* ═══ LAYOUT 2 COLUNAS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "start" }}>

        {/* ═══════════════════════════════════════════════ */}
        {/* COLUNA ESQUERDA: Avaliações + Lista de Alunos  */}
        {/* ═══════════════════════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Header da coluna */}
          <div className="gab-card" style={{ padding: "16px 24px" }}>
            <div className="gab-card-header" style={{ margin: 0 }}>
              <div className="gab-card-icon cyan">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <div className="gab-card-title">Selecione a Avaliação</div>
            </div>
          </div>

          {/* Lista de avaliações */}
          {loadingAv ? (
            <div className="gab-card" style={{ textAlign: "center", padding: 40 }}>
              <div className="gab-spinner" style={{ margin: "0 auto 12px" }} />
              <div style={{ color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>Carregando avaliações...</div>
            </div>
          ) : avaliacoes.length === 0 ? (
            <div className="gab-card" style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
              <div style={{ color: "var(--gab-text-muted)", fontSize: "0.88rem", fontWeight: 600 }}>
                Nenhuma avaliação publicada
              </div>
              <div style={{ color: "var(--gab-text-muted)", fontSize: "0.78rem", marginTop: 4 }}>
                Aguarde o coordenador criar e publicar uma avaliação.
              </div>
            </div>
          ) : (
            avaliacoes.map(av => {
              const isOpen = avaliacaoAberta === av.id;
              const temGabarito = av.gabarito_oficial && av.gabarito_oficial.length > 0;

              return (
                <div key={av.id} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {/* ─── Card da Avaliação ─── */}
                  <div
                    onClick={() => toggleAvaliacao(av)}
                    style={{
                      padding: "18px 22px",
                      borderRadius: isOpen ? "14px 14px 0 0" : 14,
                      cursor: "pointer",
                      transition: "all 0.25s",
                      background: isOpen
                        ? "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.05))"
                        : "var(--gab-surface, #1a1f2e)",
                      border: `1px solid ${isOpen ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.06)"}`,
                      borderBottom: isOpen ? "none" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gab-text-primary)", marginBottom: 4 }}>
                          {av.titulo}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                          {av.num_questoes} questões · {av.num_alternativas} alternativas · Nota {av.nota_total}
                          {av.bimestre ? ` · ${av.bimestre}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
                        <div style={{
                          padding: "3px 10px", borderRadius: 8, fontSize: "0.65rem", fontWeight: 700, whiteSpace: "nowrap",
                          background: temGabarito ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                          color: temGabarito ? "var(--gab-green-light, #10b981)" : "var(--gab-amber-light, #f59e0b)",
                          border: `1px solid ${temGabarito ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                        }}>
                          {temGabarito ? "✓ OFICIAL" : "✗ SEM GABARITO"}
                        </div>
                        <svg
                          width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                          style={{
                            color: isOpen ? "var(--gab-cyan-light)" : "var(--gab-text-muted)",
                            transition: "transform 0.3s",
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Disciplinas tags */}
                    {av.disciplinas_config && av.disciplinas_config.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
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
                  </div>

                  {/* ─── Painel expandido: Turmas + Alunos ─── */}
                  {isOpen && (
                    <div style={{
                      padding: "0 0 4px 0",
                      borderRadius: "0 0 14px 14px",
                      background: "var(--gab-surface, #1a1f2e)",
                      border: "1px solid rgba(6,182,212,0.3)",
                      borderTop: "1px solid rgba(6,182,212,0.1)",
                      animation: "gabSlideIn 0.3s ease-out",
                    }}>

                      {/* Seletor de turmas (se mais de 1) */}
                      {lotes.length > 1 && (
                        <div style={{ display: "flex", gap: 6, padding: "12px 18px 4px", flexWrap: "wrap" }}>
                          {lotes.map(lote => (
                            <button
                              key={lote.id}
                              onClick={() => carregarAlunos(lote)}
                              style={{
                                padding: "5px 14px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700,
                                border: "1px solid",
                                cursor: "pointer", transition: "all 0.2s",
                                fontFamily: "var(--gab-font-body)",
                                background: turmaAtiva?.id === lote.id
                                  ? "linear-gradient(135deg, #06b6d4, #8b5cf6)"
                                  : "rgba(255,255,255,0.04)",
                                borderColor: turmaAtiva?.id === lote.id
                                  ? "transparent"
                                  : "rgba(255,255,255,0.1)",
                                color: turmaAtiva?.id === lote.id
                                  ? "#fff"
                                  : "var(--gab-text-muted)",
                              }}
                            >
                              📁 {lote.turma_nome}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sem turmas vinculadas */}
                      {lotes.length === 0 && !loadingAlunos && (
                        <div style={{ textAlign: "center", padding: "24px 18px" }}>
                          <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📭</div>
                          <div style={{ color: "var(--gab-text-muted)", fontSize: "0.82rem", fontWeight: 600 }}>
                            Nenhuma turma vinculada
                          </div>
                          <div style={{ color: "var(--gab-text-muted)", fontSize: "0.72rem", marginTop: 4 }}>
                            O coordenador ainda não vinculou turmas para você nesta avaliação.
                          </div>
                        </div>
                      )}

                      {/* Loading alunos */}
                      {loadingAlunos && (
                        <div style={{ textAlign: "center", padding: "24px 18px" }}>
                          <div className="gab-spinner" style={{ margin: "0 auto 8px" }} />
                          <div style={{ color: "var(--gab-text-muted)", fontSize: "0.8rem" }}>Carregando alunos...</div>
                        </div>
                      )}

                      {/* Barra de progresso */}
                      {turmaAtiva && alunos.length > 0 && (
                        <div style={{ padding: "10px 18px 4px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gab-text-muted)" }}>
                              📁 {turmaAtiva.turma_nome} — {corrigidos}/{totalAlunos} corrigidos
                            </span>
                            <span style={{
                              fontSize: "0.65rem", fontWeight: 800,
                              color: pctCorrigido === 100 ? "var(--gab-green-light)" : "var(--gab-cyan-light)",
                            }}>
                              {pctCorrigido}%
                            </span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 2, transition: "width 0.5s ease-out",
                              width: `${pctCorrigido}%`,
                              background: pctCorrigido === 100
                                ? "var(--gab-green-light, #10b981)"
                                : "linear-gradient(90deg, #06b6d4, #8b5cf6)",
                            }} />
                          </div>
                        </div>
                      )}

                      {/* Lista de alunos */}
                      {!loadingAlunos && alunos.length > 0 && (
                        <div style={{ padding: "8px 10px", maxHeight: 420, overflowY: "auto" }}>
                          {alunos.map((arq, idx) => {
                            const isCorrigido = arq.status === "corrigido";
                            const isAtivo = arquivoSelecionado?.id === arq.id;

                            return (
                              <div
                                key={arq.id || idx}
                                style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "10px 14px", borderRadius: 10, marginBottom: 2,
                                  background: isAtivo
                                    ? "rgba(6,182,212,0.08)"
                                    : isCorrigido ? "rgba(16,185,129,0.03)" : "transparent",
                                  border: `1px solid ${isAtivo ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.03)"}`,
                                  transition: "all 0.15s",
                                }}
                              >
                                {/* Número */}
                                <div style={{
                                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                  background: isCorrigido ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                                  border: `1px solid ${isCorrigido ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "0.72rem", fontWeight: 800,
                                  color: isCorrigido ? "#34d399" : "var(--gab-text-muted)",
                                }}>
                                  {idx + 1}
                                </div>

                                {/* Nome */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: "0.82rem", fontWeight: 700, color: "var(--gab-text-primary)",
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                  }}>
                                    {arq.nome_aluno || arq.arquivo_nome || "Aluno não identificado"}
                                  </div>
                                  {arq.codigo_aluno && (
                                    <div style={{ fontSize: "0.65rem", color: "var(--gab-text-muted)", marginTop: 1 }}>
                                      RE: {arq.codigo_aluno}
                                    </div>
                                  )}
                                </div>

                                {/* Nota ou Botão */}
                                {isCorrigido ? (
                                  <div
                                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                                    onClick={(e) => { e.stopPropagation(); verCorrecaoSalva(arq); }}
                                    title="Clique para ver o resultado"
                                  >
                                    <span style={{
                                      fontSize: "0.82rem", fontWeight: 800, color: "#34d399",
                                      padding: "2px 10px", borderRadius: 8,
                                      background: "rgba(16,185,129,0.08)",
                                    }}>
                                      {Number(arq.nota).toFixed(1)}
                                    </span>
                                    <span style={{
                                      padding: "4px 10px", borderRadius: 8, fontSize: "0.65rem", fontWeight: 700,
                                      background: "rgba(16,185,129,0.1)", color: "#34d399",
                                      border: "1px solid rgba(16,185,129,0.2)",
                                      transition: "all 0.15s",
                                    }}>
                                      ✓ Corrigido
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); corrigirArquivo(arq); }}
                                    disabled={loadingCorrecao}
                                    style={{
                                      padding: "6px 18px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700,
                                      background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                                      color: "#fff", border: "none", cursor: "pointer",
                                      boxShadow: "0 2px 8px rgba(6,182,212,0.25)",
                                      transition: "all 0.2s", whiteSpace: "nowrap",
                                      fontFamily: "var(--gab-font-body)",
                                      opacity: loadingCorrecao ? 0.5 : 1,
                                    }}
                                  >
                                    🔍 Corrigir
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Turma selecionada mas sem alunos */}
                      {!loadingAlunos && turmaAtiva && alunos.length === 0 && (
                        <div style={{ textAlign: "center", padding: "20px 18px", color: "var(--gab-text-muted)", fontSize: "0.8rem" }}>
                          Nenhum gabarito encontrado nesta turma.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* COLUNA DIREITA: Painel de Correção             */}
        {/* ═══════════════════════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>

          {/* Estado vazio — nenhum aluno selecionado */}
          {!arquivoSelecionado && !loadingCorrecao && (
            <div className="gab-card" style={{ textAlign: "center", padding: "60px 30px" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
                background: "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))",
                border: "2px dashed rgba(6,182,212,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}
                  style={{ color: "var(--gab-cyan-light, #06b6d4)", opacity: 0.6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gab-text-primary)", marginBottom: 6 }}>
                Painel de Correção
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--gab-text-muted)", lineHeight: 1.5 }}>
                Selecione uma avaliação à esquerda e clique em<br />
                <strong style={{ color: "var(--gab-cyan-light)" }}>🔍 Corrigir</strong> em um aluno para ver o resultado aqui.
              </div>
            </div>
          )}

          {/* Loading da correção */}
          {loadingCorrecao && (
            <div className="gab-card" style={{ textAlign: "center", padding: 60, animation: "gab-slide-up 0.3s ease-out" }}>
              <div className="gab-spinner" style={{ margin: "0 auto 16px", width: 40, height: 40 }} />
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                Corrigindo gabarito...
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--gab-text-muted)", marginTop: 4 }}>
                Lendo bolhas e comparando com gabarito oficial
              </div>
            </div>
          )}

          {/* Resultado da correção */}
          {correcao && arquivoSelecionado && (
            <>
              {/* Header do aluno */}
              <div className="gab-card" style={{ padding: "16px 24px", animation: "gab-slide-up 0.3s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem", fontWeight: 800, color: "#fff",
                  }}>
                    {(arquivoSelecionado.nome_aluno || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--gab-text-primary)" }}>
                      {arquivoSelecionado.nome_aluno || arquivoSelecionado.arquivo_nome}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)", marginTop: 2 }}>
                      {turmaAtiva?.turma_nome} · {avAtiva?.titulo}
                      {arquivoSelecionado.codigo_aluno ? ` · RE: ${arquivoSelecionado.codigo_aluno}` : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Miniatura do gabarito com lupa */}
              <GabaritoImageZoom arquivoId={arquivoSelecionado.id} arquivoNome={arquivoSelecionado.arquivo_nome} />

              {/* Nota e Resumo */}
              <div className="gab-card" style={{ animation: "gab-slide-up 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div className={`gab-nota-badge ${correcao.acertos / correcao.totalQuestoes >= 0.7 ? "alta" : correcao.acertos / correcao.totalQuestoes >= 0.4 ? "media" : "baixa"}`}>
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
                  <span style={{
                    padding: "6px 16px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700,
                    background: "rgba(16,185,129,0.1)", color: "#34d399",
                    border: "1px solid rgba(16,185,129,0.2)",
                  }}>
                    ✓ Salvo automaticamente
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="gab-progress">
                  <div
                    className="gab-progress-bar"
                    style={{ width: `${(correcao.acertos / correcao.totalQuestoes) * 100}%` }}
                  />
                </div>
              </div>

              {/* Tabela Comparativa */}
              <div className="gab-card" style={{ padding: 0, animation: "gab-slide-up 0.5s ease-out", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px 12px" }}>
                  <div className="gab-card-title">Detalhamento Questão a Questão</div>
                </div>
                <div className="gab-table-wrap" style={{ border: "none", borderRadius: 0, overflowX: "auto" }}>
                  <table className="gab-table">
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}></th>
                        {correcao.resultado.map(q => (
                          <th key={q.numero}>{String(q.numero).padStart(2, "0")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="row-label">Oficial</td>
                        {correcao.resultado.map(q => (
                          <td key={q.numero} style={{ fontWeight: 600 }}>{q.correto}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="row-label">Aluno</td>
                        {correcao.resultado.map(q => (
                          <td key={q.numero}>
                            {q.resposta || <span style={{ color: "var(--gab-text-muted)", fontStyle: "italic" }}>—</span>}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="row-label">Resultado</td>
                        {correcao.resultado.map(q => (
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

              {/* Acertos por disciplina */}
              {avAtiva?.disciplinas_config && avAtiva.disciplinas_config.length > 0 && (
                <div className="gab-card" style={{ animation: "gab-slide-up 0.6s ease-out" }}>
                  <div className="gab-card-header">
                    <div className="gab-card-icon purple" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                    </div>
                    <div className="gab-card-title">Desempenho por Disciplina</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {avAtiva.disciplinas_config.map((dc, i) => {
                      let acertosDisc = 0, totalDisc = 0;
                      for (let q = dc.de; q <= dc.ate; q++) {
                        totalDisc++;
                        if (correcao.resultado[q - 1]?.acertou) acertosDisc++;
                      }
                      const pct = totalDisc > 0 ? Math.round((acertosDisc / totalDisc) * 100) : 0;

                      return (
                        <div key={i} style={{
                          padding: "12px 16px", borderRadius: 10,
                          background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)",
                        }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--gab-purple-light, #a78bfa)", marginBottom: 6 }}>
                            {dc.nome}
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--gab-text-primary)" }}>
                              {acertosDisc}/{totalDisc}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--gab-text-muted)" }}>
                              ({pct}%)
                            </span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 8, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 2,
                              width: `${pct}%`,
                              background: pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444",
                              transition: "width 0.5s ease-out",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
