// src/features/secretaria/sincronizar-seedf/index.jsx
// ============================================================================
// Página "Sincronizar com SEEDF" — Dispara e monitora a sincronização
// automática de turmas da Secretaria de Educação do Distrito Federal.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import ModalSincronizarTurma from "./ModalSincronizarTurma";

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
const IconTurma = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
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
    parcial_timeout: { label: "Timeout", bg: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500 animate-pulse" },
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

  const navigate = useNavigate();

  // ── Credenciais SEEDF (leitura do Agente EDUCA) ──
  const [credenciais, setCredenciais] = useState(null);
  const [credLoading, setCredLoading] = useState(true);
  const [showTurmaModal, setShowTurmaModal] = useState(false);

  // ── Carregar credenciais (somente leitura — gerência no Agente EDUCA) ──
  const carregarCredenciais = useCallback(async () => {
    setCredLoading(true);
    try {
      const res = await api.get("/api/agente/credenciais");
      const creds = res.data?.credenciais || [];
      setCredenciais(creds);
      return creds.filter(c => c.ativo);
    } catch (err) {
      console.warn("[SincSEEDF] Erro ao carregar credenciais:", err);
      if (err?.response?.status !== 404 && err?.response?.status !== 403) {
        setCredenciais([]);
      }
      return [];
    } finally {
      setCredLoading(false);
    }
  }, []);

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
    carregarCredenciais();
    carregarDados();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [carregarDados, carregarCredenciais]);

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
    // Verifica se há credenciais antes de sincronizar
    const ativas = (credenciais || []).filter(c => c.ativo);
    if (ativas.length === 0) {
      navigate("/agente-educa/credenciais");
      return;
    }

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

  const credAtivas = (credenciais || []).filter(c => c.ativo);
  const temCredenciais = credAtivas.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* ═══ MODAL SYNC TURMA ═══ */}
      <ModalSincronizarTurma
        open={showTurmaModal}
        onClose={() => { setShowTurmaModal(false); carregarDados(); }}
        onSyncStarted={() => carregarDados()}
      />

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

      {/* ═══ BANNER DE CREDENCIAIS (Somente leitura — gerenciadas no Agente EDUCA) ═══ */}
      <div
        className="rounded-2xl border overflow-hidden mb-6"
        style={{
          borderColor: temCredenciais ? "#bbf7d0" : "#fed7aa",
          background: temCredenciais
            ? "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)"
            : "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                background: temCredenciais
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "white",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">
                {credLoading
                  ? "Verificando credenciais..."
                  : temCredenciais
                    ? `Credencial conectada — matrícula ${credAtivas[0]?.educadf_login}`
                    : "Nenhuma credencial configurada"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {temCredenciais
                  ? "Gerenciada pelo módulo Agente EDUCA"
                  : "Configure suas credenciais no módulo Agente EDUCA para habilitar a sincronização"}
              </div>
            </div>
          </div>
          <button
            id="btn-ir-agente-educa"
            onClick={() => navigate("/agente-educa/credenciais")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              background: temCredenciais ? "#f1f5f9" : "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: temCredenciais ? "#475569" : "#ffffff",
              border: temCredenciais ? "1px solid #e2e8f0" : "none",
              boxShadow: temCredenciais ? "none" : "0 2px 8px rgba(37,99,235,0.25)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {temCredenciais ? "Agente EDUCA" : "Configurar no Agente EDUCA"}
          </button>
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
                        timeZone: "America/Sao_Paulo",
                      })}
                    </>
                  )}
                </span>
              </div>
              {syncStatus.relatorio?.resumo && (
                <div className="flex flex-wrap gap-4 text-sm">
                  {syncStatus.relatorio.resumo.alunos_localizados > 0 && (
                    <span className="text-gray-600">
                      👥 <strong className="text-gray-800">{syncStatus.relatorio.resumo.alunos_localizados}</strong> localizados
                    </span>
                  )}
                  <span className="text-green-600">
                    ✅ <strong>{syncStatus.relatorio.resumo.alunos_inseridos || 0}</strong> inseridos
                  </span>
                  <span className="text-purple-600">
                    📋 <strong>{syncStatus.relatorio.resumo.alunos_jaExistiam ?? Math.max(0, (syncStatus.relatorio.resumo.alunos_localizados || 0) - (syncStatus.relatorio.resumo.alunos_inseridos || 0) - (syncStatus.relatorio.resumo.alunos_reativados || 0))}</strong> já existiam
                  </span>
                  <span className="text-orange-600">
                    ⏸ <strong>{syncStatus.relatorio.resumo.alunos_inativados || 0}</strong> inativados
                  </span>
                  {typeof syncStatus.relatorio.resumo.turmas_vazias === "number" && (
                    <span className={syncStatus.relatorio.resumo.turmas_vazias > 0 ? "text-red-600 font-semibold" : "text-emerald-600"}>
                      {syncStatus.relatorio.resumo.turmas_vazias > 0
                        ? `⚠ ${syncStatus.relatorio.resumo.turmas_vazias} turma(s) vazia(s)`
                        : (syncStatus.relatorio.resumo.turmas_ok || 0) > 0
                          ? `✅ ${syncStatus.relatorio.resumo.turmas_ok} turmas verificadas`
                          : `✅ 0 turmas verificadas`}
                    </span>
                  )}
                </div>
              )}
              {syncStatus.relatorio?.resumo?.motivo_parcial && (
                <div className="mt-3 p-2.5 rounded-lg text-xs font-medium text-amber-800" style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)", border: "1px solid #fde68a" }}>
                  ⚠️ {syncStatus.relatorio.resumo.motivo_parcial}
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
              id="btn-sincronizar-turma"
              disabled={loading || emAndamento || !temCredenciais}
              onClick={() => {
                if (!temCredenciais) {
                  navigate("/agente-educa/credenciais");
                  return;
                }
                setShowTurmaModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading || emAndamento || !temCredenciais
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                boxShadow: loading || emAndamento || !temCredenciais
                  ? "none"
                  : "0 4px 14px rgba(109,40,217,0.3)",
              }}
            >
              <IconTurma />
              Sincronizar Turma
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

          {/* Barra de progresso real durante polling */}
          {emAndamento && (() => {
            const atual = syncStatus?.progresso_atual || 0;
            const total = syncStatus?.progresso_total || 0;
            const turma = syncStatus?.progresso_turma || null;
            const pct = total > 0 ? Math.round((atual / total) * 100) : 0;
            const indeterminado = total === 0;

            return (
              <div className="mt-4">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)",
                      width: indeterminado ? "100%" : `${pct}%`,
                      transition: indeterminado ? "none" : "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      opacity: indeterminado ? 0.4 : 1,
                      backgroundSize: indeterminado ? "200% 100%" : "100% 100%",
                      animation: indeterminado ? "progressShimmer 2s linear infinite" : "none",
                    }}
                  />
                </div>
                <div className="text-center mt-2">
                  {indeterminado ? (
                    <p className="text-xs text-gray-500">⏳ Conectando ao portal SEEDF...</p>
                  ) : (
                    <>
                      <span className="text-lg font-bold" style={{ color: "#4f46e5" }}>{pct}%</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Turma {atual} de {total}{turma ? <> — <span className="font-medium text-gray-700">{turma}</span></> : ""}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Info box */}
        <div className="px-6 py-4 border-t border-gray-100" style={{ background: "rgba(241,245,249,0.5)" }}>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-blue-500 mt-0.5">ℹ️</span>
            <div>
              <strong>Sincronizar Completo</strong> baixa todas as turmas do portal SEEDF e importa automaticamente os estudantes.{" "}
              <strong>Sincronizar Turma</strong> sincroniza apenas uma turma selecionada.{" "}
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
                          timeZone: "America/Sao_Paulo",
                        })}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(log.criado_em).toLocaleTimeString("pt-BR", {
                          hour: "2-digit", minute: "2-digit",
                          timeZone: "America/Sao_Paulo",
                        })}
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBadge status={log.status} />

                    {/* Resumo */}
                    {resumo && (
                      <div className="flex gap-3 text-xs text-gray-500 ml-auto">
                        <span>👥 {resumo.alunos_localizados ?? "–"} localizados</span>
                        <span className="text-green-600">+{resumo.alunos_inseridos ?? 0} inseridos</span>
                        <span className="text-purple-600">📋 {resumo.alunos_jaExistiam ?? "–"} já existiam</span>
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
                              <div className="text-xs text-gray-500 mb-1">Localizados</div>
                              <div className="text-lg font-bold text-gray-800">{resumo.alunos_localizados ?? "–"}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Inseridos</div>
                              <div className="text-lg font-bold text-green-600">{resumo.alunos_inseridos ?? 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Já existiam</div>
                              <div className="text-lg font-bold text-purple-600">{resumo.alunos_jaExistiam ?? Math.max(0, (resumo.alunos_localizados ?? 0) - (resumo.alunos_inseridos ?? 0) - (resumo.alunos_reativados ?? 0))}</div>
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
                                  ? new Date(log.finalizado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                                  : "–"}
                              </div>
                            </div>
                            {/* Checklist de verificação */}
                            {typeof resumo?.turmas_vazias === "number" && (
                              <div className="col-span-2 sm:col-span-4">
                                <div className="text-xs text-gray-500 mb-1">Checklist de Verificação</div>
                                {resumo.turmas_vazias > 0 ? (
                                  <div className="text-sm font-bold text-red-600">
                                    ⚠ {resumo.turmas_vazias} turma(s) sem alunos após importação
                                  </div>
                                ) : (resumo.turmas_ok || 0) > 0 ? (
                                <div className="text-sm font-bold text-emerald-600">
                                    ✅ {resumo.turmas_ok ?? resumo.pdfs_baixados ?? 0} turma(s) sincronizada(s){resumo.turmas_total > (resumo.turmas_ok ?? resumo.pdfs_baixados ?? 0) ? ` de ${resumo.turmas_total}` : ""} — {resumo.alunos_localizados ?? resumo.total_alunos_verificados ?? 0} alunos no total
                                  </div>
                                ) : (
                                  <div className="text-sm font-medium text-gray-500">
                                    ℹ️ Verificação não aplicável (nenhuma turma correspondente encontrada)
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Motivo parcial — aviso prominente */}
                            {resumo?.motivo_parcial && (
                              <div className="col-span-2 sm:col-span-4">
                                <div
                                  className="p-3 rounded-lg text-sm font-medium flex items-start gap-2"
                                  style={{
                                    background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
                                    border: "1px solid #fde68a",
                                    color: "#92400e",
                                  }}
                                >
                                  <span className="text-lg leading-none">⏱️</span>
                                  <div>
                                    <div className="font-bold text-amber-900 mb-0.5">Execução Parcial</div>
                                    <div className="text-amber-800">{resumo.motivo_parcial}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Turmas não processadas (separado de falhas) */}
                            {(resumo?.pdfs_nao_processados || 0) > 0 && (
                              <div className="col-span-2 sm:col-span-4">
                                <div className="text-xs text-gray-500 mb-1">Não processadas (timeout)</div>
                                <div className="text-lg font-bold text-amber-600">
                                  {resumo.pdfs_nao_processados} turma(s) não foram processadas
                                </div>
                              </div>
                            )}
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
