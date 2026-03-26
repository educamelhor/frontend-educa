// ============================================================================
// ETAPA 3 — Dashboard de Resultados Pedagógicos
// - Selecionar avaliação com cards visuais
// - Métricas KPI animadas (total, média, melhor, aproveitamento)
// - Gráfico de barras CSS puro (acertos por questão)
// - Tabela de resultados por aluno
// - Acertos por disciplina (se multidisciplinar)
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";

export default function GabaritoResultados() {
  // ─── Dados ───
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [busca, setBusca] = useState("");

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
      return { total: 0, mediaAcertos: 0, mediaNota: 0, melhorNota: 0, piorNota: 0, aprovados: 0, reprovados: 0, pctAproveitamento: 0 };
    }
    const notas = resultados.map(r => Number(r.nota) || 0);
    const acertos = resultados.map(r => Number(r.acertos) || 0);
    const totalQ = Number(resultados[0]?.total_questoes) || 1;
    const aprovados = acertos.filter(a => (a / totalQ) * 100 >= 60).length;
    return {
      total: resultados.length,
      mediaAcertos: (acertos.reduce((a, b) => a + b, 0) / acertos.length).toFixed(1),
      mediaNota: (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1),
      melhorNota: Math.max(...notas).toFixed(1),
      piorNota: Math.min(...notas).toFixed(1),
      aprovados,
      reprovados: resultados.length - aprovados,
      pctAproveitamento: ((aprovados / resultados.length) * 100).toFixed(0),
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
                <div style={{ padding: "18px 24px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="gab-card-title">Resultados por Aluno</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--gab-text-muted)" }}>
                    {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
                  </span>
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
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r, idx) => {
                        const pctAcerto = Number(r.total_questoes) > 0 ? (Number(r.acertos) / Number(r.total_questoes)) * 100 : 0;
                        return (
                          <tr key={r.id || idx}>
                            <td style={{ textAlign: "center", color: "var(--gab-text-muted)", fontSize: "0.75rem" }}>
                              {idx + 1}
                            </td>
                            <td style={{ textAlign: "left", fontFamily: "var(--gab-font-display)", fontSize: "0.8rem" }}>
                              {r.codigo_aluno}
                            </td>
                            <td style={{ textAlign: "left", fontWeight: 600 }}>
                              {r.nome_aluno || "—"}
                            </td>
                            <td>{r.turma_nome || "—"}</td>
                            <td>
                              <span className="gab-font-mono">{r.acertos}/{r.total_questoes}</span>
                            </td>
                            <td>
                              <span className={`gab-nota-badge ${getColorClass(pctAcerto)}`} style={{ padding: "4px 10px", fontSize: "0.85rem" }}>
                                {Number(r.nota || 0).toFixed(1)}
                              </span>
                            </td>
                            <td>
                              {pctAcerto >= 60 ? (
                                <span className="gab-text-green" style={{ fontWeight: 600, fontSize: "0.8rem" }}>✓ Aprovado</span>
                              ) : (
                                <span className="gab-text-red" style={{ fontWeight: 600, fontSize: "0.8rem" }}>Recuperação</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
