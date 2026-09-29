// ============================================================================
// ETAPA 3 — Dashboard de Resultados Pedagógicos
// - Selecionar avaliação com cards visuais
// - Métricas KPI animadas (total, média, melhor, aproveitamento)
// - Gráfico de barras CSS puro (acertos por questão)
// - Tabela de resultados por aluno
// - Acertos por disciplina (se multidisciplinar)
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import api from "../../services/api";

export default function GabaritoResultados() {
  // ─── Perfil ───
  const perfil = String(localStorage.getItem("perfil") || "").toLowerCase().trim();
  const isGestao = !["professor"].includes(perfil); // coord/diretor/vice/supervisor

  // ─── Dados ───
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [busca, setBusca] = useState("");

  // ─── Busca na tabela de alunos (gestão) ───
  const [buscaAluno, setBuscaAluno] = useState("");

  // ─── Modal: Editar nota manual ───
  const [editModal, setEditModal] = useState(null); // resultado
  const [editNota, setEditNota] = useState("");
  const [editJustificativa, setEditJustificativa] = useState("");
  const [editSalvando, setEditSalvando] = useState(false);
  const [editErro, setEditErro] = useState("");

  // ─── Modal: Imagem do gabarito ───
  const [gabModal, setGabModal] = useState(null); // { nome_aluno, arquivo_id, arquivo_nome }
  const [gabImgUrl, setGabImgUrl] = useState(null);
  const [gabLoading, setGabLoading] = useState(false);
  const [gabErro, setGabErro] = useState("");

  // ─── Modal: Anular Gabarito (Cola / Fraude) ───
  const [anularModal, setAnularModal] = useState(null); // resultado selecionado
  const [anularMotivo, setAnularMotivo] = useState("Cola / Fraude durante a prova");
  const [anularMotivoCustom, setAnularMotivoCustom] = useState("");
  const [anularObs, setAnularObs] = useState("");
  const [anularCriarOcorrencia, setAnularCriarOcorrencia] = useState(true);
  const [anularSalvando, setAnularSalvando] = useState(false);
  const [anularErro, setAnularErro] = useState("");

  // ─── Modal: Detalhes da Anulação ───
  const [detalhesAnulacaoModal, setDetalhesAnulacaoModal] = useState(null);

  // ─── Modal: Confirmar Desfazer Anulação ───
  const [desfazerModal, setDesfazerModal] = useState(null);
  const [desfazerSalvando, setDesfazerSalvando] = useState(false);

  // ─── Carregar resumo das avaliações ───
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const resp = await api.get("/api/gabaritos/resultados/resumo");
        setAvaliacoes(resp.data || []);
      } catch (err) {
        console.error("Erro ao carregar resumo:", err);
      }
      setLoading(false);
    })();
  }, []);

  // ─── Carregar resultados de uma avaliação específica ───
  async function carregarResultados(avaliacao) {
    setAvaliacaoSelecionada(avaliacao);
    setLoadingDetail(true);
    try {
      const resp = await api.get(`/api/gabaritos/resultados?avaliacao_id=${avaliacao.id}`);
      setResultados(resp.data || []);
    } catch (err) {
      console.error("Erro ao carregar resultados:", err);
      setResultados([]);
    }
    setLoadingDetail(false);
  }

  // ─── Métricas ───
  const metricas = useMemo(() => {
    if (resultados.length === 0) {
      return { total: 0, mediaAcertos: 0, mediaNota: 0, melhorNota: 0, piorNota: 0, aprovados: 0, reprovados: 0, anulados: 0, pctAproveitamento: 0 };
    }
    const regulares = resultados.filter(r => r.status !== 'anulado');
    const notas = (regulares.length > 0 ? regulares : resultados).map(r => Number(r.nota) || 0);
    const acertos = (regulares.length > 0 ? regulares : resultados).map(r => Number(r.acertos) || 0);
    const totalQ = Number(resultados[0]?.total_questoes) || 1;
    const aprovados = acertos.filter(a => (a / totalQ) * 100 >= 60).length;
    const anulados = resultados.filter(r => r.status === 'anulado').length;
    return {
      total: resultados.length,
      anulados,
      mediaAcertos: acertos.length > 0 ? (acertos.reduce((a, b) => a + b, 0) / acertos.length).toFixed(1) : "0.0",
      mediaNota: notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "0.0",
      melhorNota: notas.length > 0 ? Math.max(...notas).toFixed(1) : "0.0",
      piorNota: notas.length > 0 ? Math.min(...notas).toFixed(1) : "0.0",
      aprovados,
      reprovados: (regulares.length > 0 ? regulares.length : resultados.length) - aprovados,
      pctAproveitamento: regulares.length > 0 ? ((aprovados / regulares.length) * 100).toFixed(0) : "0",
    };
  }, [resultados]);

  // ─── Acertos por questão ───
  const acertosPorQuestao = useMemo(() => {
    if (resultados.length === 0) return [];
    const totalQ = Number(resultados[0]?.total_questoes) || 0;
    const counts = new Array(totalQ).fill(0);
    resultados.forEach(r => {
      const det = r.detalhes || [];
      det.forEach((d, i) => { if (d.acertou) counts[i]++; });
    });
    return counts.map((c, i) => ({
      questao: i + 1,
      acertos: c,
      total: resultados.length,
      pct: resultados.length > 0 ? Math.round((c / resultados.length) * 100) : 0,
    }));
  }, [resultados]);

  // ─── Acertos por disciplina (agregado) ───
  const acertosPorDisc = useMemo(() => {
    if (resultados.length === 0) return [];
    const discMap = {};
    resultados.forEach(r => {
      const apd = r.acertos_por_disciplina;
      if (!Array.isArray(apd)) return;
      apd.forEach(d => {
        if (!discMap[d.nome]) discMap[d.nome] = { nome: d.nome, totalAcertos: 0, totalQuestoes: 0, count: 0 };
        discMap[d.nome].totalAcertos += d.acertos;
        discMap[d.nome].totalQuestoes += d.total;
        discMap[d.nome].count++;
      });
    });
    return Object.values(discMap).map(d => ({
      ...d,
      mediaAcertos: d.count > 0 ? (d.totalAcertos / d.count).toFixed(1) : 0,
      mediaTotal: d.count > 0 ? (d.totalQuestoes / d.count).toFixed(0) : 0,
      pct: d.totalQuestoes > 0 ? Math.round((d.totalAcertos / d.totalQuestoes) * 100) : 0,
    }));
  }, [resultados]);

  // ─── Filtrar avaliações ───
  const avalFiltradas = avaliacoes.filter(a =>
    a.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
    a.bimestre?.toLowerCase().includes(busca.toLowerCase()) ||
    a.tipo?.toLowerCase().includes(busca.toLowerCase())
  );

  // ─── Filtrar alunos na tabela (RE / nome / turma) ───
  const resultadosFiltrados = useMemo(() => {
    if (!buscaAluno.trim()) return resultados;
    const q = buscaAluno.toLowerCase();
    return resultados.filter(r =>
      r.codigo_aluno?.toLowerCase().includes(q) ||
      r.nome_aluno?.toLowerCase().includes(q) ||
      r.turma_nome?.toLowerCase().includes(q)
    );
  }, [resultados, buscaAluno]);

  // ─── Abrir modal de edição de nota ───
  function abrirEditModal(r) {
    setEditModal(r);
    setEditNota(String(Number(r.nota || 0).toFixed(1)));
    setEditJustificativa("");
    setEditErro("");
  }

  // ─── Salvar nota manual ───
  async function salvarNotaManual() {
    if (!editModal) return;
    const v = parseFloat(editNota);
    if (isNaN(v) || v < 0) { setEditErro("Nota inválida."); return; }
    setEditSalvando(true); setEditErro("");
    try {
      const resp = await api.patch(`/api/gabaritos/respostas/${editModal.id}/nota`, {
        nota: v, justificativa: editJustificativa || null,
      });
      if (resp.data.ok) {
        setResultados(prev => prev.map(r =>
          r.id === editModal.id ? { ...r, nota: resp.data.nota, acertos: resp.data.acertos, nota_manual: 1 } : r
        ));
        setEditModal(null);
      }
    } catch (err) {
      setEditErro(err.response?.data?.error || "Erro ao salvar nota.");
    }
    setEditSalvando(false);
  }

  // ─── Abrir modal de gabarito (imagem) ───
  async function abrirGabModal(r) {
    setGabModal({ nome_aluno: r.nome_aluno || r.codigo_aluno });
    setGabImgUrl(null); setGabErro(""); setGabLoading(true);
    try {
      const meta = await api.get(`/api/gabaritos/respostas/${r.id}/arquivo-gabarito`);
      const { arquivo_id, arquivo_nome } = meta.data;
      setGabModal({ nome_aluno: r.nome_aluno || r.codigo_aluno, arquivo_id, arquivo_nome });
      const imgResp = await api.get(`/api/gabarito-lotes/arquivos/${arquivo_id}/imagem`, { responseType: "blob" });
      setGabImgUrl(URL.createObjectURL(imgResp.data));
    } catch (err) {
      setGabErro(err.response?.data?.error || "Gabarito não encontrado para este aluno.");
    }
    setGabLoading(false);
  }

  function fecharGabModal() {
    if (gabImgUrl) URL.revokeObjectURL(gabImgUrl);
    setGabModal(null); setGabImgUrl(null); setGabErro("");
  }

  // ─── Modal de Anulação (Cola) ───
  function abrirAnularModal(r) {
    setAnularModal(r);
    setAnularMotivo("Cola / Fraude durante a prova");
    setAnularMotivoCustom("");
    setAnularObs("");
    setAnularCriarOcorrencia(true);
    setAnularErro("");
  }

  async function confirmarAnulacao() {
    if (!anularModal) return;
    const motivoFinal = anularMotivo === "Outro motivo" ? (anularMotivoCustom.trim() || "Infração durante avaliação") : anularMotivo;
    setAnularSalvando(true);
    setAnularErro("");
    try {
      const resp = await api.patch(`/api/gabaritos/respostas/${anularModal.id}/anular`, {
        motivo: motivoFinal,
        observacao: anularObs,
        criar_ocorrencia: anularCriarOcorrencia,
      });
      if (resp.data.ok) {
        setResultados(prev => prev.map(r =>
          r.id === anularModal.id ? {
            ...r,
            status: "anulado",
            nota: 0.00,
            acertos: 0,
            motivo_anulacao: motivoFinal,
            anulado_em: new Date().toISOString(),
            anulado_observacao: anularObs,
            nota_original: resp.data.nota_original,
            acertos_original: resp.data.acertos_original,
          } : r
        ));
        setAnularModal(null);
      }
    } catch (err) {
      setAnularErro(err.response?.data?.error || "Erro ao anular gabarito.");
    }
    setAnularSalvando(false);
  }

  async function confirmarDesfazerAnulacao(r) {
    if (!r) return;
    setDesfazerSalvando(true);
    try {
      const resp = await api.patch(`/api/gabaritos/respostas/${r.id}/desfazer-anulacao`);
      if (resp.data.ok) {
        setResultados(prev => prev.map(item =>
          item.id === r.id ? {
            ...item,
            status: "regular",
            nota: resp.data.nota,
            acertos: resp.data.acertos,
            motivo_anulacao: null,
            anulado_em: null,
            anulado_observacao: null,
            nota_original: null,
            acertos_original: null,
          } : item
        ));
        setDesfazerModal(null);
        setDetalhesAnulacaoModal(null);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao reverter anulação.");
    }
    setDesfazerSalvando(false);
  }

  // ─── Cor dinâmica ───
  function getColor(pct) {
    if (pct >= 70) return "var(--gab-green-light, #10b981)";
    if (pct >= 40) return "var(--gab-amber-light, #f59e0b)";
    return "var(--gab-red-light, #ef4444)";
  }

  function getColorClass(pct) {
    if (pct >= 70) return "alta";
    if (pct >= 40) return "media";
    return "baixa";
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="gab-flex gab-flex-col gab-gap-24">
      <style>{`
        @keyframes gabCountUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gabBarGrow { from { width: 0; } }
        .gab-kpi-animate { animation: gabCountUp 0.5s ease-out both; }
        .gab-bar-animate { animation: gabBarGrow 0.8s ease-out both; }
        .gab-aval-card { 
          padding: 16px 20px; border-radius: 14px; cursor: pointer; transition: all 0.2s;
          background: var(--gab-surface, #1a1f2e); border: 1px solid rgba(255,255,255,0.06);
        }
        .gab-aval-card:hover { border-color: rgba(6,182,212,0.3); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .gab-aval-card.selected { border-color: rgba(6,182,212,0.6); background: rgba(6,182,212,0.06); }
        .gab-disc-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .gab-disc-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease-out; }
      `}</style>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SELEÇÃO DE AVALIAÇÃO                              */}
      {/* ═══════════════════════════════════════════════════ */}
      {!avaliacaoSelecionada && (
        <>
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon cyan">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div className="gab-card-title">Selecione uma Avaliação</div>
            </div>

            {/* Busca */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="🔍 Buscar por título, bimestre ou tipo..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 10,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--gab-text-primary, #e2e8f0)", fontSize: "0.85rem", outline: "none",
                }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div className="gab-spinner gab-spinner-lg" style={{ margin: "0 auto 16px" }} />
                <div style={{ color: "var(--gab-text-muted)" }}>Carregando avaliações...</div>
              </div>
            ) : avalFiltradas.length === 0 ? (
              <div className="gab-empty-state">
                <svg className="gab-empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="gab-empty-title">Nenhuma avaliação encontrada</div>
                <div className="gab-empty-text">
                  Crie avaliações na Etapa 1, marque o gabarito oficial na Etapa 2 e corrija gabaritos para ver os resultados aqui.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {avalFiltradas.map(a => (
                  <div
                    key={a.id}
                    className="gab-aval-card"
                    onClick={() => carregarResultados(a)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--gab-text-primary, #e2e8f0)" }}>
                        {a.titulo}
                      </div>
                      {(a.total_correcoes || 0) > 0 && (
                        <span style={{
                          padding: "2px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700,
                          background: "rgba(6,182,212,0.12)", color: "var(--gab-cyan-light, #06b6d4)",
                          border: "1px solid rgba(6,182,212,0.2)",
                        }}>
                          {a.total_correcoes} {a.total_correcoes === 1 ? "aluno" : "alunos"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted, #94a3b8)", marginBottom: 6 }}>
                      {a.num_questoes} questões · Nota {a.nota_total}
                      {a.bimestre ? ` · ${a.bimestre}` : ""}
                      {a.turno ? ` · ${a.turno}` : ""}
                    </div>
                    {a.disciplinas_config && a.disciplinas_config.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        {a.disciplinas_config.map((dc, i) => (
                          <span key={i} style={{
                            padding: "1px 6px", borderRadius: 4, fontSize: "0.65rem", fontWeight: 600,
                            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)",
                            color: "var(--gab-purple-light, #a78bfa)",
                          }}>
                            {dc.nome}
                          </span>
                        ))}
                      </div>
                    )}
                    {(a.total_correcoes || 0) > 0 ? (
                      <div style={{ display: "flex", gap: 16, fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--gab-green-light, #10b981)" }}>
                          Média: {a.media_nota}
                        </span>
                        <span style={{ color: "var(--gab-amber-light, #f59e0b)" }}>
                          Melhor: {a.melhor_nota}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted, #94a3b8)", fontStyle: "italic" }}>
                        Sem correções ainda
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* RESULTADOS DA AVALIAÇÃO SELECIONADA               */}
      {/* ═══════════════════════════════════════════════════ */}
      {avaliacaoSelecionada && (
        <>
          {/* Botão voltar + título */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              className="gab-btn gab-btn-ghost gab-btn-sm"
              onClick={() => { setAvaliacaoSelecionada(null); setResultados([]); }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Voltar
            </button>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--gab-text-primary, #e2e8f0)" }}>
                {avaliacaoSelecionada.titulo}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--gab-text-muted, #94a3b8)" }}>
                {avaliacaoSelecionada.num_questoes} questões
                {avaliacaoSelecionada.bimestre ? ` · ${avaliacaoSelecionada.bimestre}` : ""}
                {avaliacaoSelecionada.turno ? ` · ${avaliacaoSelecionada.turno}` : ""}
              </div>
            </div>
          </div>

          {loadingDetail ? (
            <div className="gab-card" style={{ textAlign: "center", padding: 48 }}>
              <div className="gab-spinner gab-spinner-lg" style={{ margin: "0 auto 16px" }} />
              <div style={{ color: "var(--gab-text-muted)" }}>Carregando resultados...</div>
            </div>
          ) : resultados.length === 0 ? (
            <div className="gab-card">
              <div className="gab-empty-state">
                <svg className="gab-empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="gab-empty-title">Nenhum gabarito corrigido</div>
                <div className="gab-empty-text">
                  Corrija gabaritos na Etapa 2 e salve os resultados para visualizá-los aqui.
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ─── KPIs ─── */}
              <div className="gab-stats-grid">
                <div className="gab-stat-card cyan gab-kpi-animate" style={{ animationDelay: "0s" }}>
                  <div className="gab-stat-label">Gabaritos Corrigidos</div>
                  <div className="gab-stat-value">{metricas.total}</div>
                  <div className="gab-stat-sub">alunos avaliados</div>
                </div>
                <div className="gab-stat-card green gab-kpi-animate" style={{ animationDelay: "0.1s" }}>
                  <div className="gab-stat-label">Média Geral</div>
                  <div className="gab-stat-value" style={{ color: "var(--gab-green-light)" }}>
                    {metricas.mediaNota}
                  </div>
                  <div className="gab-stat-sub">de {avaliacaoSelecionada.nota_total} pontos</div>
                </div>
                <div className="gab-stat-card amber gab-kpi-animate" style={{ animationDelay: "0.2s" }}>
                  <div className="gab-stat-label">Melhor Nota</div>
                  <div className="gab-stat-value" style={{ color: "var(--gab-amber-light)" }}>
                    {metricas.melhorNota}
                  </div>
                  <div className="gab-stat-sub">pontos</div>
                </div>
                <div className="gab-stat-card purple gab-kpi-animate" style={{ animationDelay: "0.3s" }}>
                  <div className="gab-stat-label">Aproveitamento</div>
                  <div className="gab-stat-value" style={{ color: "var(--gab-purple)" }}>
                    {metricas.pctAproveitamento}%
                  </div>
                  <div className="gab-stat-sub">{metricas.aprovados} aprovados · {metricas.reprovados} em recuperação</div>
                </div>
                {metricas.anulados > 0 && (
                  <div className="gab-stat-card red gab-kpi-animate" style={{ animationDelay: "0.4s", border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)" }}>
                    <div className="gab-stat-label" style={{ color: "#f87171" }}>Anulados (Cola)</div>
                    <div className="gab-stat-value" style={{ color: "#ef4444" }}>
                      {metricas.anulados}
                    </div>
                    <div className="gab-stat-sub" style={{ color: "rgba(248,113,113,0.8)" }}>nota zerada por infração</div>
                  </div>
                )}
              </div>

              {/* ─── Gráfico: Acertos por Questão ─── */}
              <div className="gab-card">
                <div className="gab-card-header">
                  <div className="gab-card-icon green">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div className="gab-card-title">Acertos por Questão</div>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 160, padding: "10px 0" }}>
                  {acertosPorQuestao.map((q, idx) => (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: "0.6rem", color: getColor(q.pct), fontWeight: 700 }}>
                        {q.pct}%
                      </span>
                      <div style={{
                        width: "100%", maxWidth: 28,
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: 4,
                        height: 120,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        overflow: "hidden",
                      }}>
                        <div
                          className="gab-bar-animate"
                          style={{
                            height: `${q.pct}%`,
                            background: `linear-gradient(180deg, ${getColor(q.pct)}, ${getColor(q.pct)}88)`,
                            borderRadius: "4px 4px 0 0",
                            minHeight: 2,
                            animationDelay: `${idx * 0.03}s`,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.6rem", color: "var(--gab-text-muted)", fontFamily: "var(--gab-font-display)" }}>
                        {String(q.questao).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── Acertos por Disciplina ─── */}
              {acertosPorDisc.length > 0 && (
                <div className="gab-card">
                  <div className="gab-card-header">
                    <div className="gab-card-icon purple">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                      </svg>
                    </div>
                    <div className="gab-card-title">Desempenho por Disciplina</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {acertosPorDisc.map((d, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gab-text-primary, #e2e8f0)" }}>
                            {d.nome}
                          </span>
                          <span style={{
                            fontSize: "0.75rem", fontWeight: 700,
                            color: getColor(d.pct),
                          }}>
                            {d.pct}% · Média {d.mediaAcertos}/{d.mediaTotal}
                          </span>
                        </div>
                        <div className="gab-disc-bar">
                          <div
                            className="gab-disc-bar-fill"
                            style={{
                              width: `${d.pct}%`,
                              background: `linear-gradient(90deg, ${getColor(d.pct)}, ${getColor(d.pct)}88)`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Tabela de Resultados por Aluno ─── */}
              <div className="gab-card" style={{ padding: 0 }}>
                <div style={{ padding: "18px 24px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div className="gab-card-title">Resultados por Aluno</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {/* Barra de busca — apenas gestão */}
                    {isGestao && (
                      <div style={{ position: "relative", minWidth: 260 }}>
                        <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gab-text-muted)", pointerEvents: "none" }} width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Buscar por RE, nome ou turma..."
                          value={buscaAluno}
                          onChange={e => setBuscaAluno(e.target.value)}
                          style={{
                            paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                            borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.04)", color: "var(--gab-text-primary)",
                            fontSize: "0.8rem", outline: "none", width: "100%",
                          }}
                        />
                      </div>
                    )}
                    <span style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)", whiteSpace: "nowrap" }}>
                      {resultadosFiltrados.length}/{resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="gab-table-wrap" style={{ border: "none", borderRadius: 0 }}>
                  <table className="gab-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50, textAlign: "center" }}>#</th>
                        <th style={{ textAlign: "left" }}>Código</th>
                        <th style={{ textAlign: "left" }}>Aluno</th>
                        <th>Turma</th>
                        <th>Acertos</th>
                        <th>Nota</th>
                        <th>Status</th>
                        {isGestao && <th style={{ textAlign: "center", width: 90 }}>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {resultadosFiltrados.map((r, idx) => {
                        const isAnulado = r.status === "anulado";
                        const pctAcerto = Number(r.total_questoes) > 0 ? (Number(r.acertos) / Number(r.total_questoes)) * 100 : 0;
                        return (
                          <tr key={r.id || idx} style={isAnulado ? { background: "rgba(239,68,68,0.04)" } : undefined}>
                            <td style={{ textAlign: "center", color: isAnulado ? "#f87171" : "var(--gab-text-muted)", fontSize: "0.75rem", fontWeight: isAnulado ? 700 : 400 }}>{idx + 1}</td>
                            <td style={{ textAlign: "left", fontFamily: "var(--gab-font-display)", fontSize: "0.8rem" }}>{r.codigo_aluno}</td>
                            <td style={{ textAlign: "left", fontWeight: 600 }}>
                              {r.nome_aluno || "—"}
                              {isAnulado ? (
                                <span style={{ marginLeft: 6, fontSize: "0.62rem", padding: "1px 6px", borderRadius: 4, background: "rgba(239,68,68,0.18)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", fontWeight: 800 }}>
                                  🚫 ANULADO
                                </span>
                              ) : null}
                              {r.nota_manual ? <span style={{ marginLeft: 5, fontSize: "0.6rem", padding: "1px 5px", borderRadius: 4, background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", fontWeight: 700 }}>MANUAL</span> : null}
                            </td>
                            <td>{r.turma_nome || "—"}</td>
                            <td>
                              {isAnulado ? (
                                <div>
                                  <span className="gab-font-mono" style={{ textDecoration: "line-through", color: "rgba(148,163,184,0.6)", fontSize: "0.75rem" }}>
                                    {r.acertos_original != null ? r.acertos_original : r.acertos}/{r.total_questoes}
                                  </span>
                                  <div style={{ fontSize: "0.68rem", color: "#f87171", fontWeight: 700 }}>0 acertos</div>
                                </div>
                              ) : (
                                <span className="gab-font-mono">{r.acertos}/{r.total_questoes}</span>
                              )}
                            </td>
                            <td>
                              {isAnulado ? (
                                <div>
                                  <span className="gab-nota-badge baixa" style={{ padding: "4px 10px", fontSize: "0.85rem", background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }} title={r.nota_original != null ? `Nota original antes da anulação: ${Number(r.nota_original).toFixed(1)}` : "Anulado"}>
                                    0.0
                                  </span>
                                  {r.nota_original != null && (
                                    <div style={{ fontSize: "0.65rem", color: "rgba(148,163,184,0.7)", marginTop: 2 }}>
                                      Orig: <span style={{ textDecoration: "line-through" }}>{Number(r.nota_original).toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className={`gab-nota-badge ${getColorClass(pctAcerto)}`} style={{ padding: "4px 10px", fontSize: "0.85rem" }}>
                                  {Number(r.nota || 0).toFixed(1)}
                                </span>
                              )}
                            </td>
                            <td>
                              {isAnulado ? (
                                <span
                                  style={{ color: "#f87171", fontWeight: 700, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer" }}
                                  title={`Motivo: ${r.motivo_anulacao || "Cola / Fraude"}\nClique para ver detalhes`}
                                  onClick={() => setDetalhesAnulacaoModal(r)}
                                >
                                  🚫 {r.motivo_anulacao ? (r.motivo_anulacao.length > 18 ? r.motivo_anulacao.slice(0, 16) + '...' : r.motivo_anulacao) : "Anulado (Cola)"}
                                </span>
                              ) : pctAcerto >= 60 ? (
                                <span className="gab-text-green" style={{ fontWeight: 600, fontSize: "0.8rem" }}>✓ Aprovado</span>
                              ) : (
                                <span className="gab-text-red" style={{ fontWeight: 600, fontSize: "0.8rem" }}>Recuperação</span>
                              )}
                            </td>
                            {isGestao && (
                              <td style={{ textAlign: "center" }}>
                                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                  {isAnulado ? (
                                    <>
                                      {/* Ver detalhes anulação */}
                                      <button
                                        title="Ver detalhes da anulação"
                                        onClick={() => setDetalhesAnulacaoModal(r)}
                                        style={{ width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.25)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
                                      >
                                        <span style={{ fontSize: "0.85rem" }}>ℹ️</span>
                                      </button>
                                      {/* Desfazer anulação */}
                                      <button
                                        title="Reverter anulação (restaurar nota)"
                                        onClick={() => setDesfazerModal(r)}
                                        style={{ width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.25)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.12)"}
                                      >
                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2.2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {/* Editar nota */}
                                      <button
                                        title="Editar nota"
                                        onClick={() => abrirEditModal(r)}
                                        style={{ width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.28)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "rgba(139,92,246,0.12)"}
                                      >
                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                        </svg>
                                      </button>
                                      {/* Anular Gabarito (Cola / Infração) */}
                                      <button
                                        title="Anular Gabarito (Pegou colando / Fraude)"
                                        onClick={() => abrirAnularModal(r)}
                                        style={{ width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.25)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                                      >
                                        <span style={{ fontSize: "0.85rem" }}>🚫</span>
                                      </button>
                                    </>
                                  )}
                                  {/* Ver gabarito */}
                                  <button
                                    title="Ver gabarito escaneado"
                                    onClick={() => abrirGabModal(r)}
                                    style={{ width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(6,182,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.25)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(6,182,212,0.1)"}
                                  >
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#06b6d4" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {resultadosFiltrados.length === 0 && buscaAluno && (
                        <tr><td colSpan={isGestao ? 8 : 7} style={{ textAlign: "center", padding: "24px", color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>
                          Nenhum aluno encontrado para "{buscaAluno}"
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* MODAL: EDITAR NOTA MANUAL                         */}
      {/* ═══════════════════════════════════════════════════ */}
      {editModal && (
        <div onClick={() => setEditModal(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, borderRadius: 18, background: "linear-gradient(145deg,#1a1f35,#0f1321)", border: "1px solid rgba(139,92,246,0.25)", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.08)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "18px 22px", background: "linear-gradient(135deg,rgba(139,92,246,0.08),rgba(6,182,212,0.04))", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(139,92,246,0.08))", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>✏️</div>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e2e8f0" }}>Editar Nota Manualmente</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.7)", marginTop: 1 }}>{editModal.nome_aluno || editModal.codigo_aluno}</div>
              </div>
              <button onClick={() => setEditModal(null)} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: "1rem", cursor: "pointer" }}>✕</button>
            </div>
            {/* Body */}
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(148,163,184,0.8)", marginBottom: 6, fontWeight: 600 }}>NOTA ATUAL → NOVA NOTA (0 – {avaliacaoSelecionada?.nota_total || 10})</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "rgba(148,163,184,0.5)", textDecoration: "line-through" }}>{Number(editModal.nota || 0).toFixed(1)}</span>
                  <span style={{ color: "rgba(139,92,246,0.6)", fontSize: "1.2rem" }}>→</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={avaliacaoSelecionada?.nota_total || 10}
                    value={editNota}
                    onChange={e => setEditNota(e.target.value)}
                    autoFocus
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.06)", color: "#e2e8f0", fontSize: "1.1rem", fontWeight: 700, outline: "none" }}
                  />
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(148,163,184,0.8)", marginBottom: 6, fontWeight: 600 }}>JUSTIFICATIVA (opcional)</div>
                <textarea
                  rows={3}
                  placeholder="Ex: Correção manual após revisão do gabarito físico..."
                  value={editJustificativa}
                  onChange={e => setEditJustificativa(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", fontSize: "0.82rem", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {editErro && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "0.8rem" }}>{editErro}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setEditModal(null)} style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.8)", cursor: "pointer", fontSize: "0.82rem" }}>Cancelar</button>
                <button onClick={salvarNotaManual} disabled={editSalvando} style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: editSalvando ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", fontWeight: 700, cursor: editSalvando ? "not-allowed" : "pointer", fontSize: "0.85rem" }}>
                  {editSalvando ? "Salvando..." : "✓ Salvar Nota"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* MODAL: GABARITO ESCANEADO                         */}
      {/* ═══════════════════════════════════════════════════ */}
      {gabModal && (
        <div onClick={fecharGabModal} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 680, maxHeight: "90vh", borderRadius: 18, background: "linear-gradient(145deg,#1a1f35,#0f1321)", border: "1px solid rgba(6,182,212,0.2)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", background: "linear-gradient(135deg,rgba(6,182,212,0.06),rgba(139,92,246,0.04))", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem" }}>📄</div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#e2e8f0" }}>Gabarito Escaneado</div>
                <div style={{ fontSize: "0.68rem", color: "rgba(148,163,184,0.7)", marginTop: 1 }}>{gabModal.nome_aluno}</div>
              </div>
              <button onClick={fecharGabModal} style={{ marginLeft: "auto", width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: "1rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
              {gabLoading && (
                <div style={{ textAlign: "center", padding: 48 }}>
                  <div className="gab-spinner gab-spinner-lg" style={{ margin: "0 auto 12px" }} />
                  <div style={{ color: "var(--gab-text-muted)", fontSize: "0.85rem" }}>Carregando gabarito...</div>
                </div>
              )}
              {gabErro && !gabLoading && (
                <div style={{ textAlign: "center", padding: 40, color: "#f87171", fontSize: "0.85rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 10 }}>📭</div>
                  {gabErro}
                </div>
              )}
              {gabImgUrl && !gabLoading && (
                <img src={gabImgUrl} alt="Gabarito escaneado" style={{ maxWidth: "100%", borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }} draggable={false} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* MODAL: ANULAR GABARITO (COLA / FRAUDE)            */}
      {/* ═══════════════════════════════════════════════════ */}
      {anularModal && (
        <div onClick={() => setAnularModal(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, borderRadius: 18, background: "linear-gradient(145deg,#1c1524,#130e1c)", border: "1px solid rgba(239,68,68,0.35)", boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(239,68,68,0.12)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "18px 22px", background: "linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.03))", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🚫</div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f87171" }}>Anular Gabarito (Cola / Infração)</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(148,163,184,0.8)", marginTop: 1 }}>
                  {anularModal.nome_aluno} {anularModal.codigo_aluno ? `(RE: ${anularModal.codigo_aluno})` : ""} · {anularModal.turma_nome || ""}
                </div>
              </div>
              <button onClick={() => setAnularModal(null)} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.8)", fontSize: "1rem", cursor: "pointer" }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Alerta de consequência */}
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", gap: 10 }}>
                <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                <div style={{ fontSize: "0.75rem", color: "rgba(248,113,113,0.9)", lineHeight: 1.45 }}>
                  A nota deste aluno será alterada para <strong>0.00</strong> e o gabarito marcado como <strong>ANULADO</strong>.
                  A nota original (<strong>{Number(anularModal.nota || 0).toFixed(1)}</strong>) será preservada no histórico e poderá ser restaurada a qualquer momento.
                </div>
              </div>

              {/* Motivo da anulação */}
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(148,163,184,0.9)", marginBottom: 8, fontWeight: 700 }}>
                  MOTIVO DA ANULAÇÃO
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Cola / Fraude durante a prova",
                    "Uso / Porte de celular ou aparelho eletrônico",
                    "Comunicação indevida entre alunos",
                    "Recusa de entrega ou rasura proposital",
                    "Outro motivo",
                  ].map((m) => (
                    <label
                      key={m}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                        background: anularMotivo === m ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${anularMotivo === m ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.06)"}`,
                        cursor: "pointer", transition: "all 0.15s", fontSize: "0.8rem", color: anularMotivo === m ? "#fca5a5" : "#cbd5e1",
                      }}
                    >
                      <input
                        type="radio"
                        name="motivo_anulacao"
                        checked={anularMotivo === m}
                        onChange={() => setAnularMotivo(m)}
                        style={{ accentColor: "#ef4444" }}
                      />
                      {m}
                    </label>
                  ))}
                </div>

                {anularMotivo === "Outro motivo" && (
                  <input
                    type="text"
                    placeholder="Descreva o motivo da anulação..."
                    value={anularMotivoCustom}
                    onChange={e => setAnularMotivoCustom(e.target.value)}
                    style={{ marginTop: 8, width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#e2e8f0", fontSize: "0.82rem", outline: "none", boxSizing: "border-box" }}
                  />
                )}
              </div>

              {/* Observações adicionais */}
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(148,163,184,0.9)", marginBottom: 6, fontWeight: 700 }}>
                  DETALHES / OBSERVAÇÕES (OPCIONAL)
                </div>
                <textarea
                  rows={2}
                  placeholder="Ex: Aluno flagrado com anotações na borracha durante a aplicação da prova..."
                  value={anularObs}
                  onChange={e => setAnularObs(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", fontSize: "0.8rem", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Checkbox para criar ocorrência disciplinar */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={anularCriarOcorrencia}
                  onChange={e => setAnularCriarOcorrencia(e.target.checked)}
                  style={{ accentColor: "#8b5cf6", width: 16, height: 16 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#c4b5fd" }}>Registrar ocorrência disciplinar</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(148,163,184,0.7)" }}>Cria automaticamente um registro de indisciplina na ficha escolar do aluno</div>
                </div>
              </label>

              {anularErro && (
                <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "0.8rem" }}>
                  {anularErro}
                </div>
              )}

              {/* Botões */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  onClick={() => setAnularModal(null)}
                  style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.8)", cursor: "pointer", fontSize: "0.82rem" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAnulacao}
                  disabled={anularSalvando}
                  style={{
                    padding: "9px 22px", borderRadius: 9, border: "none",
                    background: anularSalvando ? "rgba(239,68,68,0.4)" : "linear-gradient(135deg,#ef4444,#dc2626)",
                    color: "#fff", fontWeight: 700, cursor: anularSalvando ? "not-allowed" : "pointer", fontSize: "0.85rem",
                    boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
                  }}
                >
                  {anularSalvando ? "Anulando..." : "🚫 Confirmar Anulação"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* MODAL: DETALHES DA ANULAÇÃO                       */}
      {/* ═══════════════════════════════════════════════════ */}
      {detalhesAnulacaoModal && (
        <div onClick={() => setDetalhesAnulacaoModal(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, borderRadius: 18, background: "linear-gradient(145deg,#1c1524,#130e1c)", border: "1px solid rgba(239,68,68,0.35)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", background: "linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.03))", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>ℹ️</div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f87171" }}>Detalhes da Anulação</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(148,163,184,0.8)", marginTop: 1 }}>{detalhesAnulacaoModal.nome_aluno}</div>
              </div>
              <button onClick={() => setDetalhesAnulacaoModal(null)} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.8)", fontSize: "1rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.7)", textTransform: "uppercase", fontWeight: 700 }}>Motivo</div>
                <div style={{ fontSize: "0.9rem", color: "#fca5a5", fontWeight: 700, marginTop: 3 }}>
                  {detalhesAnulacaoModal.motivo_anulacao || "Cola / Fraude durante a prova"}
                </div>
              </div>

              {detalhesAnulacaoModal.anulado_observacao && (
                <div style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.7)", textTransform: "uppercase", fontWeight: 700 }}>Observações</div>
                  <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: 3, whiteSpace: "pre-wrap" }}>
                    {detalhesAnulacaoModal.anulado_observacao}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.68rem", color: "rgba(148,163,184,0.7)", textTransform: "uppercase", fontWeight: 700 }}>Registrado por</div>
                  <div style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 600, marginTop: 3 }}>
                    {detalhesAnulacaoModal.anulado_por_nome || "Coordenação"}
                  </div>
                </div>
                <div style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.68rem", color: "rgba(148,163,184,0.7)", textTransform: "uppercase", fontWeight: 700 }}>Nota Original</div>
                  <div style={{ fontSize: "0.95rem", color: "#34d399", fontWeight: 800, marginTop: 3 }}>
                    {detalhesAnulacaoModal.nota_original != null ? Number(detalhesAnulacaoModal.nota_original).toFixed(1) : "—"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  onClick={() => setDetalhesAnulacaoModal(null)}
                  style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.8)", cursor: "pointer", fontSize: "0.82rem" }}
                >
                  Fechar
                </button>
                {isGestao && (
                  <button
                    onClick={() => {
                      const al = detalhesAnulacaoModal;
                      setDetalhesAnulacaoModal(null);
                      setDesfazerModal(al);
                    }}
                    style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    🔄 Reverter Anulação
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* MODAL: CONFIRMAR DESFAZER ANULAÇÃO                */}
      {/* ═══════════════════════════════════════════════════ */}
      {desfazerModal && (
        <div onClick={() => setDesfazerModal(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, borderRadius: 18, background: "linear-gradient(145deg,#15201d,#0e1614)", border: "1px solid rgba(16,185,129,0.35)", boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(16,185,129,0.1)", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", background: "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.03))", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🔄</div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#34d399" }}>Reverter Anulação</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(148,163,184,0.8)", marginTop: 1 }}>{desfazerModal.nome_aluno}</div>
              </div>
              <button onClick={() => setDesfazerModal(null)} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.8)", fontSize: "1rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                Deseja restaurar a nota deste aluno para o valor original?
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8rem", color: "rgba(148,163,184,0.9)" }}>Nota a ser restaurada:</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>
                  {desfazerModal.nota_original != null ? Number(desfazerModal.nota_original).toFixed(1) : "0.0"} pts
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  onClick={() => setDesfazerModal(null)}
                  style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.8)", cursor: "pointer", fontSize: "0.82rem" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmarDesfazerAnulacao(desfazerModal)}
                  disabled={desfazerSalvando}
                  style={{
                    padding: "9px 22px", borderRadius: 9, border: "none",
                    background: desfazerSalvando ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg,#10b981,#059669)",
                    color: "#fff", fontWeight: 700, cursor: desfazerSalvando ? "not-allowed" : "pointer", fontSize: "0.85rem",
                  }}
                >
                  {desfazerSalvando ? "Restaurando..." : "✓ Confirmar e Restaurar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
