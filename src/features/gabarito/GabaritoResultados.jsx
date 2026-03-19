// ============================================================================
// ETAPA 3 — Dashboard de Resultados Pedagógicos e Estatísticos
// Métricas, gráficos, tabela detalhada, exportação
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";

const API = "http://localhost:3000/api";

export default function GabaritoResultados() {
  // ─── Dados ───
  const [resultados, setResultados] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Filtros ───
  const [filtroAvaliacao, setFiltroAvaliacao] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");

  // ─── Fetch resultados ───
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Buscar nomes únicos de gabaritos
        const respNomes = await fetch(`${API}/gabaritos/nome-unicos`, { headers });
        if (respNomes.ok) {
          const nomes = await respNomes.json();
          setAvaliacoes(nomes);
        }
      } catch {
        /* empty */
      }
      setLoading(false);
    })();
  }, []);

  // ─── Métricas calculadas ───
  const metricas = useMemo(() => {
    if (resultados.length === 0) {
      return {
        totalCorrecoes: 0,
        mediaGeral: 0,
        melhorNota: 0,
        piorNota: 0,
        aprovados: 0,
        reprovados: 0,
      };
    }
    const notas = resultados.map((r) => r.acertos || 0);
    const totalQ = resultados[0]?.total_questoes || 1;
    return {
      totalCorrecoes: resultados.length,
      mediaGeral: (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1),
      melhorNota: Math.max(...notas),
      piorNota: Math.min(...notas),
      aprovados: notas.filter((n) => (n / totalQ) * 100 >= 60).length,
      reprovados: notas.filter((n) => (n / totalQ) * 100 < 60).length,
    };
  }, [resultados]);

  return (
    <div className="gab-flex gab-flex-col gab-gap-24">

      {/* ─── Cards de Métricas ─── */}
      <div className="gab-stats-grid">
        <div className="gab-stat-card cyan">
          <div className="gab-stat-label">Total de Correções</div>
          <div className="gab-stat-value">{metricas.totalCorrecoes}</div>
          <div className="gab-stat-sub">gabaritos processados</div>
        </div>
        <div className="gab-stat-card green">
          <div className="gab-stat-label">Média Geral</div>
          <div className="gab-stat-value" style={{ color: "var(--gab-green-light)" }}>
            {metricas.mediaGeral}
          </div>
          <div className="gab-stat-sub">acertos por avaliação</div>
        </div>
        <div className="gab-stat-card amber">
          <div className="gab-stat-label">Melhor Nota</div>
          <div className="gab-stat-value" style={{ color: "var(--gab-amber-light)" }}>
            {metricas.melhorNota}
          </div>
          <div className="gab-stat-sub">acertos</div>
        </div>
        <div className="gab-stat-card purple">
          <div className="gab-stat-label">Aproveitamento</div>
          <div className="gab-stat-value" style={{ color: "var(--gab-purple)" }}>
            {metricas.totalCorrecoes > 0
              ? `${((metricas.aprovados / metricas.totalCorrecoes) * 100).toFixed(0)}%`
              : "—"}
          </div>
          <div className="gab-stat-sub">≥ 60% de acertos</div>
        </div>
      </div>

      {/* ─── Filtros ─── */}
      <div className="gab-card">
        <div className="gab-card-header">
          <div className="gab-card-icon cyan">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          </div>
          <div className="gab-card-title">Filtros</div>
        </div>

        <div className="gab-grid-3">
          <div className="gab-form-group">
            <label className="gab-label">Avaliação</label>
            <select
              className="gab-select"
              value={filtroAvaliacao}
              onChange={(e) => setFiltroAvaliacao(e.target.value)}
            >
              <option value="">Todas as avaliações</option>
              {avaliacoes.map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
          </div>
          <div className="gab-form-group">
            <label className="gab-label">Turma</label>
            <select
              className="gab-select"
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
            >
              <option value="">Todas as turmas</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="gab-btn gab-btn-primary gab-w-full">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Buscar Resultados
            </button>
          </div>
        </div>
      </div>

      {/* ─── Área de Conteúdo ─── */}
      {loading ? (
        <div className="gab-card gab-text-center" style={{ padding: "48px 0" }}>
          <div className="gab-spinner gab-spinner-lg" style={{ margin: "0 auto 16px" }} />
          <div style={{ color: "var(--gab-text-muted)" }}>Carregando resultados...</div>
        </div>
      ) : resultados.length > 0 ? (
        <>
          {/* Gráfico de Acertos por Questão */}
          <div className="gab-card">
            <div className="gab-card-header">
              <div className="gab-card-icon green">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div className="gab-card-title">Acertos por Questão</div>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--gab-text-muted)", textAlign: "center", padding: "32px 0" }}>
              Gráficos serão exibidos quando houver resultados carregados
            </div>
          </div>

          {/* Tabela de Resultados */}
          <div className="gab-card" style={{ padding: 0 }}>
            <div style={{ padding: "18px 24px 12px" }}>
              <div className="gab-card-title">Resultados por Aluno</div>
            </div>
            <div className="gab-table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="gab-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Código</th>
                    <th style={{ textAlign: "left" }}>Nome</th>
                    <th>Turma</th>
                    <th>Acertos</th>
                    <th>Nota</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "left", fontFamily: "var(--gab-font-display)", fontSize: "0.8rem" }}>
                        {r.codigo_aluno}
                      </td>
                      <td style={{ textAlign: "left", fontWeight: 600 }}>{r.nome_aluno}</td>
                      <td>{r.turma}</td>
                      <td>
                        <span className="gab-font-mono">{r.acertos}/{r.total_questoes}</span>
                      </td>
                      <td>
                        <span className={`gab-nota-badge ${
                          (r.acertos / r.total_questoes) * 100 >= 70 ? 'alta' :
                          (r.acertos / r.total_questoes) * 100 >= 40 ? 'media' : 'baixa'
                        }`} style={{ padding: "4px 10px", fontSize: "0.85rem" }}>
                          {r.nota?.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        {(r.acertos / r.total_questoes) * 100 >= 60 ? (
                          <span className="gab-text-green">Aprovado</span>
                        ) : (
                          <span className="gab-text-red">Recuperação</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="gab-card">
          <div className="gab-empty-state">
            <svg
              className="gab-empty-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <div className="gab-empty-title">Nenhum resultado encontrado</div>
            <div className="gab-empty-text">
              Selecione uma avaliação nos filtros acima e clique em "Buscar Resultados" para visualizar
              as estatísticas pedagógicas de correção de gabaritos.
            </div>
            <div style={{ marginTop: 24 }}>
              <button className="gab-btn gab-btn-ghost gab-btn-sm">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar Modelo de Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
