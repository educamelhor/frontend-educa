// src/features/secretaria/sincronizar-seedf/index.jsx
// ============================================================================
// Página "Sincronizar com SEEDF" — Dispara e monitora a sincronização
// automática de turmas da Secretaria de Educação do Distrito Federal.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api";

// ─────────────────────────────────────────────
// Ícones inline (SVG puro) — evita dependência
// ─────────────────────────────────────────────
const IconSync = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// ─────────────────────────────────────────────
// Status badge com cores e animação
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    em_andamento: { label: "Em andamento", bg: "bg-yellow-100 text-yellow-800 border-yellow-300", dot: "bg-yellow-500 animate-pulse" },
    sucesso:      { label: "Sucesso", bg: "bg-green-100 text-green-800 border-green-300", dot: "bg-green-500" },
    parcial:      { label: "Parcial", bg: "bg-orange-100 text-orange-800 border-orange-300", dot: "bg-orange-500" },
    falha:        { label: "Falha", bg: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500" },
    falha_scraping: { label: "Falha no download", bg: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500" },
    falha_importacao: { label: "Falha na importação", bg: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500" },
    erro:         { label: "Erro", bg: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500" },
    scraping_concluido: { label: "Download concluído", bg: "bg-blue-100 text-blue-800 border-blue-300", dot: "bg-blue-500" },
    nao_executada: { label: "Não executada", bg: "bg-gray-100 text-gray-600 border-gray-300", dot: "bg-gray-400" },
  };
  const s = map[status] || { label: status, bg: "bg-gray-100 text-gray-600 border-gray-300", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function SincronizarSEEDF() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);
  const pollingRef = useRef(null);

  // ── Carregar status + histórico ──
  const carregarDados = useCallback(async () => {
    try {
      const [statusRes, histRes] = await Promise.all([
        api.get("/api/agente/sincronizacao/status"),
        api.get("/api/agente/sincronizacao/historico?limit=10"),
      ]);
      setSyncStatus(statusRes.data?.data || null);
      setHistorico(histRes.data?.data || []);

      // Se em andamento, iniciar polling
      if (statusRes.data?.data?.status === "em_andamento") {
        iniciarPolling();
      }
    } catch (err) {
      console.error("[SincSEEDF] Erro ao carregar:", err);
      if (err?.response?.status !== 404) {
        setError("Não foi possível carregar os dados de sincronização.");
      }
    }
  }, []);

  useEffect(() => {
    carregarDados();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [carregarDados]);

  // ── Polling (5s) enquanto em andamento ──
  const iniciarPolling = useCallback(() => {
    if (pollingRef.current) return;
    setPolling(true);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get("/api/agente/sincronizacao/status");
        const data = res.data?.data;
        setSyncStatus(data);
        if (data?.status !== "em_andamento") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPolling(false);
          // Recarrega histórico
          const histRes = await api.get("/api/agente/sincronizacao/historico?limit=10");
          setHistorico(histRes.data?.data || []);
        }
      } catch {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setPolling(false);
      }
    }, 5000);
  }, []);

  // ── Disparar sincronização ──
  const dispararSync = async (apenasDownload = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/agente/sincronizar", { apenasDownload });
      if (res.data?.ok) {
        setSyncStatus({
          id: res.data.log_id,
          status: "em_andamento",
          criado_em: new Date().toISOString(),
        });
        iniciarPolling();
      } else {
        setError(res.data?.message || "Erro ao iniciar sincronização.");
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        setError("Já existe uma sincronização em andamento. Aguarde a conclusão.");
      } else {
        setError(err?.response?.data?.message || "Erro ao iniciar sincronização.");
      }
    } finally {
      setLoading(false);
    }
  };

  const emAndamento = syncStatus?.status === "em_andamento";

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* ═══════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              boxShadow: "0 4px 14px rgba(59,130,246,0.3)",
            }}
          >
            <IconSync />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
              Sincronizar com SEEDF
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Atualiza automaticamente as listas de estudantes a partir do portal educadf.se.df.gov.br
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          CARD PRINCIPAL — Ação + Status Atual
      ═══════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl border overflow-hidden mb-8"
        style={{
          background: "linear-gradient(180deg, #f8faff 0%, #ffffff 100%)",
          borderColor: "#e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div className="p-6">
          {/* Status atual */}
          {syncStatus && (
            <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-white border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-3">
                <StatusBadge status={syncStatus.status} />
                <span className="text-sm text-gray-500">
                  {syncStatus.criado_em && (
                    <>
                      Última: {new Date(syncStatus.criado_em).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </>
                  )}
                </span>
              </div>
              {syncStatus.relatorio?.resumo && (
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">
                    📥 <strong className="text-gray-800">{syncStatus.relatorio.resumo.pdfs_baixados}</strong> PDFs
                  </span>
                  <span className="text-green-600">
                    ✅ <strong>{syncStatus.relatorio.resumo.alunos_inseridos || 0}</strong> inseridos
                  </span>
                  <span className="text-blue-600">
                    🔄 <strong>{syncStatus.relatorio.resumo.alunos_reativados || 0}</strong> reativados
                  </span>
                  <span className="text-orange-600">
                    ⏸ <strong>{syncStatus.relatorio.resumo.alunos_inativados || 0}</strong> inativados
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-wrap gap-3">
            <button
              id="btn-sincronizar-completo"
              disabled={loading || emAndamento}
              onClick={() => dispararSync(false)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading || emAndamento
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #3b82f6, #2563eb)",
                boxShadow: loading || emAndamento
                  ? "none"
                  : "0 4px 14px rgba(37,99,235,0.3)",
              }}
            >
              {emAndamento ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <IconSync />
                  Sincronizar Completo
                </>
              )}
            </button>

            <button
              id="btn-apenas-download"
              disabled={loading || emAndamento}
              onClick={() => dispararSync(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconDownload />
              Apenas Download (PDFs)
            </button>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <IconX />
              {error}
            </div>
          )}

          {/* Barra de progresso durante polling */}
          {emAndamento && (
            <div className="mt-4">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full animate-pulse"
                  style={{
                    background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                    width: "60%",
                    transition: "width 1s ease",
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⏳ O agente está processando as turmas no portal SEEDF. Isso pode levar alguns minutos...
              </p>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="px-6 py-4 border-t border-gray-100" style={{ background: "rgba(241,245,249,0.5)" }}>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-blue-500 mt-0.5">ℹ️</span>
            <div>
              <strong>Sincronizar Completo</strong> baixa todas as turmas do portal SEEDF e importa automaticamente os estudantes.{" "}
              <strong>Apenas Download</strong> baixa os PDFs sem importar — útil para conferência prévia.
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          HISTÓRICO
      ═══════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          borderColor: "#e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <IconClock />
            Histórico de Sincronizações
          </h2>
        </div>

        {historico.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <IconSync />
            <p className="mt-3 text-sm">Nenhuma sincronização realizada ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {historico.map((log) => {
              const resumo = typeof log.resumo === "string" ? JSON.parse(log.resumo) : log.resumo;
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                  <button
                    type="button"
                    className="w-full px-6 py-4 flex items-center gap-4 text-left"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    {/* Data */}
                    <div className="flex-shrink-0 text-center" style={{ minWidth: 60 }}>
                      <div className="text-xs font-bold text-gray-800">
                        {new Date(log.criado_em).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short",
                        })}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(log.criado_em).toLocaleTimeString("pt-BR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBadge status={log.status} />

                    {/* Resumo */}
                    {resumo && (
                      <div className="flex gap-3 text-xs text-gray-500 ml-auto">
                        <span>📥 {resumo.pdfs_baixados ?? "–"} PDFs</span>
                        <span className="text-green-600">+{resumo.alunos_inseridos ?? 0} inseridos</span>
                        <span className="text-blue-600">🔄 {resumo.alunos_reativados ?? 0} reativados</span>
                        {resumo.duracao_s && (
                          <span className="text-gray-400">⏱ {Math.round(resumo.duracao_s)}s</span>
                        )}
                      </div>
                    )}

                    {/* Expand icon */}
                    <svg
                      className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="px-6 pb-5 pt-0">
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                        {resumo ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">PDFs baixados</div>
                              <div className="text-lg font-bold text-gray-800">{resumo.pdfs_baixados ?? "–"}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Alunos inseridos</div>
                              <div className="text-lg font-bold text-green-600">{resumo.alunos_inseridos ?? 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Reativados</div>
                              <div className="text-lg font-bold text-blue-600">{resumo.alunos_reativados ?? 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Inativados</div>
                              <div className="text-lg font-bold text-orange-600">{resumo.alunos_inativados ?? 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Falhas download</div>
                              <div className="text-lg font-bold text-red-600">{resumo.pdfs_falha ?? 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Erros importação</div>
                              <div className="text-lg font-bold text-red-600">{resumo.erros_importacao ?? 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Duração</div>
                              <div className="text-lg font-bold text-gray-800">{resumo.duracao_s ? `${Math.round(resumo.duracao_s)}s` : "–"}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Finalizado em</div>
                              <div className="text-sm font-medium text-gray-800">
                                {log.finalizado_em
                                  ? new Date(log.finalizado_em).toLocaleString("pt-BR")
                                  : "–"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-center">Sem detalhes disponíveis.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
