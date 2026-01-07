// src/features/monitoramento/MonitoramentoAlertasTeste.jsx
// ============================================================================
// Tela de teste para ALERTAS em tempo real (SSE)
// - Conecta em /api/monitoramento_alerta/events com JWT no header
// - Exibe banner visual e toca um beep no navegador quando chega "event: alerta"
// - Mantém opção Mute (persistida no localStorage)
// ============================================================================
import { useEffect, useRef, useState } from "react";

export default function MonitoramentoAlertasTeste() {
  const [conectado, setConectado] = useState(false);
  const [mensagem, setMensagem] = useState("Aguardando eventos...");
  const [alertas, setAlertas] = useState([]); // histórico últimos 10
  const [mute, setMute] = useState(() => localStorage.getItem("monitor.mute") === "1");
  const controllerRef = useRef(null);

  // ---- Beep simples via Web Audio (sem arquivo) ----
  const tocarBeep = async (duration = 0.5, freq = 880) => {
    if (mute) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);

      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      o.start(now);
      o.stop(now + duration + 0.02);
    } catch (e) {
      // alguns navegadores pedem interação do usuário para audio — sem stress
      console.warn("Beep falhou (provável bloqueio de autoplay).", e);
    }
  };

  // ---- Conexão SSE via fetch (permite enviar Authorization header) ----
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMensagem("Sem token. Faça login.");
      return;
    }

    const connect = async () => {
      setMensagem("Conectando ao SSE...");
      controllerRef.current = new AbortController();
      const resp = await fetch("/api/monitoramento_alerta/events", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: controllerRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        setMensagem(`Falha na conexão SSE: ${resp.status} ${resp.statusText}`);
        setConectado(false);
        return;
      }

      setConectado(true);
      setMensagem("Conectado. Esperando alertas…");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let currentEvent = "message";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Processa por linhas (SSE: linhas separadas por \n; bloco em branco encerra evento)
        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trimEnd();
          buffer = buffer.slice(idx + 1);

          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const dataStr = line.slice(5).trim();
            if (currentEvent === "ready") {
              try {
                const obj = JSON.parse(dataStr);
                setMensagem(`SSE pronto (escola_id=${obj.escola_id})`);
              } catch { /* ignore */ }
            } else if (currentEvent === "alerta") {
              try {
                const payload = JSON.parse(dataStr);
                setAlertas((prev) => {
                  const novo = [payload, ...prev].slice(0, 10);
                  return novo;
                });
                // Visual + Som
                abrirToast(payload);
                tocarBeep();
              } catch { /* ignore */ }
            }
          } else if (line === "") {
            // fim de bloco — reseta nome do evento
            currentEvent = "message";
          }
        }
      }

      setConectado(false);
      setMensagem("Conexão SSE encerrada.");
    };

    connect();

    return () => {
      try { controllerRef.current?.abort(); } catch {}
    };
  }, [mute]);

  // ---- Toast visual simples (banner temporário) ----
  const [toast, setToast] = useState(null);
  const abrirToast = (payload) => {
    setToast({
      when: new Date().toLocaleTimeString(),
      nome: payload?.aluno?.estudante || "ALUNO",
      codigo: payload?.aluno?.codigo || "",
      motivo: payload?.aluno?.motivo || "ALERTA ATIVO",
      camera: payload?.camera || "camera",
      turma: payload?.aluno?.turma || "",
      turno: payload?.aluno?.turno || "",
    });
    setTimeout(() => setToast(null), 5000);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Monitoramento — Teste de Alertas (SSE)</h1>

      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-3 h-3 rounded-full ${
            conectado ? "bg-green-500" : "bg-gray-400"
          }`}
          title={conectado ? "SSE conectado" : "SSE desconectado"}
        />
        <span className="text-sm text-gray-700">{mensagem}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const novo = !mute;
            setMute(novo);
            localStorage.setItem("monitor.mute", novo ? "1" : "0");
          }}
          className={`px-3 py-2 rounded ${
            mute ? "bg-gray-300" : "bg-blue-600 text-white"
          }`}
        >
          {mute ? "Som: Mutado" : "Som: Ativo"}
        </button>

        <button
          onClick={() => tocarBeep(0.2, 880)}
          className="px-3 py-2 rounded bg-emerald-600 text-white"
        >
          Testar Beep
        </button>
      </div>

      {/* Histórico compacto */}
      <div className="border rounded bg-white">
        <div className="px-3 py-2 border-b font-semibold">Últimos alertas</div>
        {alertas.length === 0 ? (
          <div className="p-3 text-sm text-gray-600">Sem alertas recebidos.</div>
        ) : (
          <ul className="divide-y">
            {alertas.map((a, i) => (
              <li key={i} className="p-3 text-sm">
                <div className="font-medium">
                  {a?.aluno?.estudante} <span className="text-gray-500">({a?.aluno?.codigo})</span>
                </div>
                <div className="text-gray-700">{a?.aluno?.motivo || "ALERTA ATIVO"}</div>
                <div className="text-gray-500">
                  {a?.camera} • {new Date(a?.timestamp || Date.now()).toLocaleString()} •{" "}
                  {a?.aluno?.turma || "—"}/{(a?.aluno?.turno || "").toUpperCase() || "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast flutuante */}
      {toast && (
        <div className="fixed right-4 top-4 bg-white border border-rose-300 shadow-xl rounded-lg p-4 z-50 w-[340px]">
          <div className="text-rose-600 font-bold">⚠️ ALERTA — {toast.camera}</div>
          <div className="mt-1 font-semibold">
            {toast.nome} <span className="text-gray-500">({toast.codigo})</span>
          </div>
          <div className="text-sm text-gray-700">{toast.motivo}</div>
          <div className="text-xs text-gray-500 mt-1">
            {toast.turma || "—"}/{(toast.turno || "").toUpperCase() || "—"} • {toast.when}
          </div>
        </div>
      )}
    </div>
  );
}
