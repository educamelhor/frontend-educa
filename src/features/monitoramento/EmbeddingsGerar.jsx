// ============================================================================
// EmbeddingsGerar.jsx
// Tela simples para gerar/atualizar embeddings faciais dos alunos
// + PASSO 7.6 (scheduler UI)
// + PASSO 7.9 (worker assíncrono + barra de progresso)
// ============================================================================

import React, { useState, useEffect, useRef } from "react";

export default function EmbeddingsGerar() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // ===== Estados do resumo da operação (já validados) =====
  const [resumo, setResumo] = useState(null);
  const [erroDetalhe, setErroDetalhe] = useState("");

  // ===== Estados do cache =====
  const [cache, setCache] = useState(null);
  const [loadingCache, setLoadingCache] = useState(false);
  const [erroCache, setErroCache] = useState("");

  // ===== controle de atualização automática do cache (PASSO 7.4.4) =====
  const [ultimaAtualizacaoCache, setUltimaAtualizacaoCache] = useState(null);
  const [segundosDesdeAtualizacao, setSegundosDesdeAtualizacao] = useState(0);
  const intervaloRef = useRef(null);

  // ===== [NOVO - PASSO 7.6] Scheduler (UI) =====
  const [schedStatus, setSchedStatus] = useState(null);        // status retornado pelo backend
  const [schedMsg, setSchedMsg] = useState("");                // mensagens amigáveis
  const [schedLoading, setSchedLoading] = useState(false);     // loading dos botões
  const [schedErro, setSchedErro] = useState("");              // erro amigável
  const [intervalMinutes, setIntervalMinutes] = useState(60);  // intervalo configurável (min)

  // ===== [NOVO - PASSO 7.9] Worker assíncrono =====
  const [wkStatus, setWkStatus] = useState(null);    // objeto de status do worker
  const [wkErro, setWkErro] = useState("");          // erro amigável
  const [wkMsg, setWkMsg] = useState("");            // mensagem amigável
  const wkTimerRef = useRef(null);                   // polling timer

  // ========================================================================
  // Função para consultar /cache (total e última atualização)
  // ========================================================================
  async function carregarCache() {
    try {
      setLoadingCache(true);
      setErroCache("");
      const token = localStorage.getItem("token") || localStorage.getItem("anju.token");
      const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

      const res = await fetch("/api/monitoramento/embeddings/cache", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-escola-id": escola_id,
        },
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_e) {
        data = { raw: text };
      }

      if (!res.ok) {
        const msg = data?.error || data?.message || `Falha (${res.status})`;
        setErroCache(msg);
        setCache(null);
        return;
      }

      setCache(data);
      setUltimaAtualizacaoCache(new Date());
      setSegundosDesdeAtualizacao(0);
    } catch (err) {
      setErroCache(err.message || "Falha desconhecida");
      setCache(null);
    } finally {
      setLoadingCache(false);
    }
  }

  // ========================================================================
  // [NOVO - PASSO 7.6] Funções do Scheduler (UI)
  // ========================================================================
  async function carregarSchedulerStatus() {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("anju.token");
      const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

      const res = await fetch("/api/monitoramento/embeddings/scheduler/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-escola-id": escola_id,
        },
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        setSchedErro(data?.error || data?.message || `Falha (${res.status})`);
        setSchedStatus(null);
        return;
      }

      setSchedErro("");
      setSchedStatus(data);
      if (typeof data?.interval_minutes === "number") {
        setIntervalMinutes(data.interval_minutes);
      }
    } catch (err) {
      setSchedErro(err.message || "Não foi possível consultar o scheduler.");
      setSchedStatus(null);
    }
  }

  async function iniciarScheduler() {
    try {
      setSchedLoading(true);
      setSchedMsg("Iniciando agendamento...");
      setSchedErro("");

      const token = localStorage.getItem("token") || localStorage.getItem("anju.token");
      const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

      const res = await fetch("/api/monitoramento/embeddings/scheduler/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-escola-id": escola_id,
        },
        body: JSON.stringify({ interval_minutes: Number(intervalMinutes) || 60 }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        setSchedErro(data?.error || data?.message || `Falha (${res.status})`);
        setSchedMsg("");
        return;
      }

      setSchedMsg("Agendamento ativado.");
      await carregarSchedulerStatus();
    } catch (err) {
      setSchedErro(err.message || "Falha ao iniciar o agendamento.");
      setSchedMsg("");
    } finally {
      setSchedLoading(false);
    }
  }

  async function pararScheduler() {
    try {
      setSchedLoading(true);
      setSchedMsg("Parando agendamento...");
      setSchedErro("");

      const token = localStorage.getItem("token") || localStorage.getItem("anju.token");
      const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

      const res = await fetch("/api/monitoramento/embeddings/scheduler/stop", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-escola-id": escola_id,
        },
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        setSchedErro(data?.error || data?.message || `Falha (${res.status})`);
        setSchedMsg("");
        return;
      }

      setSchedMsg("Agendamento desativado.");
      await carregarSchedulerStatus();
    } catch (err) {
      setSchedErro(err.message || "Falha ao parar o agendamento.");
      setSchedMsg("");
    } finally {
      setSchedLoading(false);
    }
  }

  // ========================================================================
  // [NOVO - PASSO 7.9] Worker assíncrono: status/start/cancel
  // ========================================================================
  async function carregarWorkerStatus() {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("anju.token");
      const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

      const res = await fetch("/api/monitoramento/embeddings/worker/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-escola-id": escola_id,
        },
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        setWkErro(data?.error || data?.message || `Falha (${res.status})`);
        setWkStatus(null);
        return;
      }
      setWkErro("");
      setWkStatus(data);
      // quando finalizar, atualizar cache automaticamente
      if (data?.finishedAt && !data?.running) {
        carregarCache();
      }
    } catch (err) {
      setWkErro(err.message || "Falha ao consultar status do worker.");
      setWkStatus(null);
    }
  }

  async function iniciarWorker() {
    try {
      setWkMsg("Iniciando sincronização em segundo plano...");
      setWkErro("");

      const token = localStorage.getItem("token") || localStorage.getItem("anju.token");
      const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

      const body = {
        // filtros realistas já adotados no backend
        requireFoto: true,
        validateFile: false,
        engine: "faceapi", // backend usa ENGINE global; se estiver em mock, faz fallback
      };

      const res = await fetch("/api/monitoramento/embeddings/worker/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-escola-id": escola_id,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        setWkErro(data?.error || data?.message || `Falha (${res.status})`);
        setWkMsg("");
        return;
      }

      setWkMsg("Worker iniciado.");
      setWkStatus(data);
      // inicia polling mais curto enquanto estiver rodando
      if (wkTimerRef.current) clearInterval(wkTimerRef.current);
      wkTimerRef.current = setInterval(() => carregarWorkerStatus(), 2000);
    } catch (err) {
      setWkErro(err.message || "Falha ao iniciar worker.");
      setWkMsg("");
    }
  }

  async function cancelarWorker() {
    try {
      setWkMsg("Solicitando cancelamento...");
      const token = localStorage.getItem("token") || localStorage.getItem("anju.token");
      const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

      const res = await fetch("/api/monitoramento/embeddings/worker/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-escola-id": escola_id,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { raw: text };
        }
        setWkErro(data?.error || data?.message || `Falha (${res.status})`);
        setWkMsg("");
        return;
      }

      setWkMsg("Cancelamento solicitado.");
      await carregarWorkerStatus();
    } catch (err) {
      setWkErro(err.message || "Falha ao cancelar worker.");
      setWkMsg("");
    }
  }

  // ========================================================================
  // Montagem: carrega cache + status do scheduler e inicia timers
  // ========================================================================
  useEffect(() => {
    carregarCache();
    carregarSchedulerStatus();
    carregarWorkerStatus();

    // contador "há Xs"
    const timerSegundos = setInterval(() => {
      setSegundosDesdeAtualizacao((prev) => prev + 1);
    }, 1000);

    // atualiza cache a cada 10s
    intervaloRef.current = setInterval(() => {
      if (!loading) carregarCache();
    }, 10000);

    // polling do status do scheduler a cada 15s
    const timerSched = setInterval(() => {
      carregarSchedulerStatus();
    }, 15000);

    // polling do worker (se estiver ativo)
    wkTimerRef.current = setInterval(() => carregarWorkerStatus(), 5000);

    return () => {
      clearInterval(intervaloRef.current);
      clearInterval(timerSegundos);
      clearInterval(timerSched);
      if (wkTimerRef.current) clearInterval(wkTimerRef.current);
    };
  }, []);

  // ========================================================================
  // Gera embeddings e atualiza cache após sucesso
  // ========================================================================
  async function gerar() {
    setLoading(true);
    setStatus("Gerando embeddings...");
    setResumo(null);
    setErroDetalhe("");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("anju.token");
      const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId");
      const res = await fetch("/api/monitoramento/embeddings/gerar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-escola-id": escola_id,
        },
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_e) {
        data = { raw: text };
      }

      if (!res.ok) {
        const msg = data?.error || data?.message || `Falha (${res.status})`;
        setStatus("Erro ao gerar embeddings: " + msg);
        setErroDetalhe(data?.sqlMessage || data?.code || "");
        setResumo(null);
        return;
      }

      setResumo(data && typeof data === "object" ? data : { raw: text });
      setStatus(data?.message || "Processo concluído.");

      await carregarCache();
    } catch (e) {
      setStatus("Erro ao gerar embeddings: " + e.message);
      setErroDetalhe("");
      setResumo(null);
    } finally {
      setLoading(false);
    }
  }

  // ========================================================================
  // Funções utilitárias
  // ========================================================================
  function msParaSegundos(ms) {
    const n = Number(ms || 0);
    if (!Number.isFinite(n)) return "—";
    return (n / 1000).toFixed(2) + "s";
  }

  function formatarTempoSegundos(segundos) {
    if (segundos < 5) return "há poucos segundos";
    if (segundos < 60) return `há ${segundos}s`;
    const m = Math.floor(segundos / 60);
    return `há ${m}m`;
  }

  function formatarData(dt) {
    if (!dt) return "—";
    try {
      const d = typeof dt === "string" ? new Date(dt) : dt;
      return d.toLocaleString();
    } catch {
      return String(dt);
    }
  }

  function percent(prog, total) {
    const t = Number(total || 0);
    const p = Number(prog || 0);
    if (!t) return 0;
    const v = Math.max(0, Math.min(100, Math.round((p / t) * 100)));
    return v;
  }

  // ========================================================================
  // Renderização
  // ========================================================================
  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h2 className="text-xl font-semibold text-blue-900 mb-4">Gerar Embeddings Faciais</h2>

      {/* ===================== BLOCO DE CACHE ===================== */}
      <div className="mb-5 border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Cache atual</h3>
            {ultimaAtualizacaoCache && (
              <p className="text-xs text-gray-500 mt-1">
                Última consulta {formatarTempoSegundos(segundosDesdeAtualizacao)}
              </p>
            )}
          </div>
          <button
            onClick={carregarCache}
            disabled={loadingCache}
            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingCache ? "Atualizando..." : "Recarregar"}
          </button>
        </div>

        {erroCache && (
          <p className="text-xs text-red-600 mt-2">Erro ao consultar cache: {erroCache}</p>
        )}

        {cache ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Escola</p>
              <p className="text-sm font-medium">{cache.escola_id ?? "—"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Total de embeddings</p>
              <p className="text-sm font-medium">{cache.total ?? "—"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Última atualização</p>
              <p className="text-sm font-medium">
                {cache.ultima_atualizacao ? formatarData(cache.ultima_atualizacao) : "—"}
              </p>
            </div>
          </div>
        ) : (
          !erroCache &&
          !loadingCache && (
            <p className="text-xs text-gray-600 mt-2">Nenhuma informação de cache disponível.</p>
          )
        )}
      </div>

      {/* ===================== BLOCO PRINCIPAL ===================== */}
      <p className="text-gray-700 mb-4">
        Este processo analisa as fotos dos alunos cadastrados e cria representações vetoriais
        (embeddings) que serão usadas para reconhecimento facial em tempo real.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <button
          onClick={gerar}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Processando..." : "Gerar embeddings agora"}
        </button>
      </div>

      {status && <p className="mt-2 text-sm text-gray-800">{status}</p>}

      {/* ===================== [NOVO] BLOCO WORKER (UI) ===================== */}
      <div className="mt-6 border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Sincronização em segundo plano</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <button
            onClick={iniciarWorker}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Iniciar sincronização
          </button>
          <button
            onClick={cancelarWorker}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancelar
          </button>
        </div>

        {wkMsg && <p className="mt-3 text-sm text-gray-800">{wkMsg}</p>}
        {wkErro && <p className="mt-2 text-xs text-red-700">{wkErro}</p>}

        {/* Status + Barra de Progresso */}
        {wkStatus && (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-md border">
                <p className="text-xs text-gray-500">Rodando</p>
                <p className="text-sm font-medium">{wkStatus.running ? "Sim" : "Não"}</p>
              </div>
              <div className="p-3 bg-white rounded-md border">
                <p className="text-xs text-gray-500">Total (meta)</p>
                <p className="text-sm font-medium">{wkStatus.total ?? "—"}</p>
              </div>
              <div className="p-3 bg-white rounded-md border">
                <p className="text-xs text-gray-500">Processados</p>
                <p className="text-sm font-medium">{wkStatus.processed ?? 0}</p>
              </div>
              <div className="p-3 bg-white rounded-md border">
                <p className="text-xs text-gray-500">Inseridos/Atualizados</p>
                <p className="text-sm font-medium">
                  {wkStatus.inseridos ?? 0}/{wkStatus.atualizados ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-3 w-full bg-gray-200 rounded">
                <div
                  className="h-3 bg-blue-600 rounded transition-all"
                  style={{ width: `${percent(wkStatus.processed, wkStatus.total)}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Progresso: {percent(wkStatus.processed, wkStatus.total)}%
                {wkStatus.finishedAt && " — Concluído"}
              </p>
            </div>

            {wkStatus.lastError && (
              <p className="text-xs text-red-700 mt-2">Erro: {wkStatus.lastError}</p>
            )}

            {Array.isArray(wkStatus.detalhes) && wkStatus.detalhes.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-700">
                  Ver amostra de itens
                </summary>
                <pre className="mt-2 p-3 bg-white rounded-md border overflow-auto text-xs">
{JSON.stringify(wkStatus.detalhes.slice(0, 10), null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ===================== [NOVO] BLOCO SCHEDULER (UI) ===================== */}
      <div className="mt-6 border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Agendamento automático</h3>
        </div>

        {/* Linha de configuração */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Intervalo (min)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
              className="w-32 px-3 py-2 border rounded-md"
            />
          </div>

        <div className="flex gap-2">
            <button
              onClick={iniciarScheduler}
              disabled={schedLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              {schedLoading ? "Enviando..." : "Iniciar agendamento"}
            </button>
            <button
              onClick={pararScheduler}
              disabled={schedLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-60"
            >
              {schedLoading ? "Enviando..." : "Parar"}
            </button>
          </div>
        </div>

        {schedMsg && <p className="mt-3 text-sm text-gray-800">{schedMsg}</p>}
        {schedErro && <p className="mt-2 text-xs text-red-700">{schedErro}</p>}

        {/* Status atual do scheduler */}
        {schedStatus && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Ativo</p>
              <p className="text-sm font-medium">{schedStatus.enabled ? "Sim" : "Não"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Intervalo (min)</p>
              <p className="text-sm font-medium">{schedStatus.interval_minutes ?? "—"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Última execução</p>
              <p className="text-sm font-medium">{formatarData(schedStatus.last_run)}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Próxima execução</p>
              <p className="text-sm font-medium">{formatarData(schedStatus.next_run)}</p>
            </div>
          </div>
        )}

        {schedStatus?.last_result && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-700">Ver último resultado</summary>
            <pre className="mt-2 p-3 bg-white rounded-md border overflow-auto text-xs">
{JSON.stringify(schedStatus.last_result, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* ===================== BLOCO DE RESUMO ===================== */}
      {resumo && (
        <div className="mt-5 border rounded-lg p-4 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Resumo da execução</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Escola</p>
              <p className="text-sm font-medium">{resumo.escola_id ?? "—"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Total de alunos lidos</p>
              <p className="text-sm font-medium">{resumo.totalAlunos ?? "—"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Processados</p>
              <p className="text-sm font-medium">{resumo.processados ?? "—"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Inseridos</p>
              <p className="text-sm font-medium text-green-700">{resumo.inseridos ?? "—"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Atualizados</p>
              <p className="text-sm font-medium text-blue-700">{resumo.atualizados ?? "—"}</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-xs text-gray-500">Duração</p>
              <p className="text-sm font-medium">{msParaSegundos(resumo.duracao_ms)}</p>
            </div>
          </div>

          {Array.isArray(resumo.detalhes) && resumo.detalhes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-600 mb-2">Amostra (até 5) de itens processados:</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm bg-white border rounded-md">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="px-3 py-2 text-left border-b">aluno_id</th>
                      <th className="px-3 py-2 text-left border-b">dim</th>
                      <th className="px-3 py-2 text-left border-b">preview</th>
                      <th className="px-3 py-2 text-left border-b">erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.detalhes.slice(0, 5).map((d, i) => (
                      <tr key={i} className="odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-2 border-b">{d.aluno_id ?? "—"}</td>
                        <td className="px-3 py-2 border-b">{d.dim ?? "—"}</td>
                        <td className="px-3 py-2 border-b">
                          {Array.isArray(d.preview)
                            ? `[${d.preview.slice(0, 5).join(", ")}]`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 border-b text-red-700">{d.erro ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {erroDetalhe && (
            <p className="text-xs text-red-700 mt-3">Detalhe técnico: {erroDetalhe}</p>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-700">
              Ver resposta bruta (JSON)
            </summary>
            <pre className="mt-2 p-3 bg-white rounded-md border overflow-auto text-xs">
{JSON.stringify(resumo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
