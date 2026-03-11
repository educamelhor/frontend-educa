// src/features/monitoramento/Monitoramento.jsx
// ============================================================================
// Tela principal do módulo MONITORAMENTO
// ----------------------------------------------------------------------------
// Mantém layout original e integração completa com StreamCamera.jsx revisado.
// Suporta 3 câmeras (Centro, Direita, Esquerda) + miniaturas dinâmicas e modo AO VIVO.
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import StreamCamera from "./StreamCamera.jsx";
import ModalPresencasTurno from "./ModalPresencasTurno.jsx";

export default function Monitoramento() {
  const navigate = useNavigate();

  // --------------------------------------------------------------------------
  // Estados principais
  // --------------------------------------------------------------------------
  const [token, setToken] = useState("");
  const [listaAtual, setListaAtual] = useState({
    camera1: [],
    camera2: [],
    camera3: [],
  });
  const [alunosAlerta, setAlunosAlerta] = useState([]);
  const [alunoDestacado, setAlunoDestacado] = useState(null);
  const [loadingAlunosAlerta, setLoadingAlunosAlerta] = useState(false);
  const [sseAlertasConectado, setSseAlertasConectado] = useState(false);
  const [toast, setToast] = useState(null);

  // --------------------------------------------------------------------------
  // Flags & refs (performance / produção)
  // --------------------------------------------------------------------------
  const DEBUG_MONITORAMENTO =
    localStorage.getItem("debug_monitoramento") === "1";

  const ultimosInFlightRef = useRef(false);
  const ultimosLastHashRef = useRef("");
  const ultimosErrLastAtRef = useRef(0);

  const alertasInFlightRef = useRef(false);
  const alertasLastHashRef = useRef("");
  const alertasErrLastAtRef = useRef(0);

  const toastTimeoutRef = useRef(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [turnoModal, setTurnoModal] = useState(null);
  const [filtroTurno, setFiltroTurno] = useState("hoje");
  const [dataHistorico, setDataHistorico] = useState("");
  const [cameraAtiva, setCameraAtiva] = useState(null);

  // --------------------------------------------------------------------------
  // Carregar token do localStorage
  // --------------------------------------------------------------------------
  useEffect(() => {
    const tk = localStorage.getItem("token");
    if (tk) setToken(tk);
  }, []);

  // --------------------------------------------------------------------------
  // Base de botões de turno e histórico
  // --------------------------------------------------------------------------
  const baseBotaoTurno =
    "px-4 py-2 text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 transition";
  const botaoAtivo =
    "px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-blue-700 rounded-lg shadow-sm";

  function handleCliqueTurno(turno) {
    setTurnoModal(turno);
    setModalAberto(true);
  }

  function handleCliqueHoje() {
    setFiltroTurno("hoje");
    setTurnoModal("hoje");
    setModalAberto(true);
  }

  function handleCliqueHistorico() {
    setFiltroTurno("historico");
    const data = prompt("Informe a data (AAAA-MM-DD):");
    if (data) {
      setDataHistorico(data);
      setTurnoModal("historico");
      setModalAberto(true);
    }
  }

  function fecharModal() {
    setModalAberto(false);
    setTurnoModal(null);
  }

  // --------------------------------------------------------------------------
  // Função simulada para atualizar lista de alunos em alerta
  // (mantido o comportamento original validado)
  // --------------------------------------------------------------------------
useEffect(() => {
    let alive = true;
    let abortCtrl = null;

    async function carregarAlunosAlerta() {
      if (!alive) return;

      // ✅ evita overlap: se já tem request em andamento, não dispara outro
      if (alertasInFlightRef.current) return;
      alertasInFlightRef.current = true;

      setLoadingAlunosAlerta(true);

      try {
        const token = localStorage.getItem("token");
        const escolaId = localStorage.getItem("escola_id") || "1";

        // ✅ abort do request anterior (e também no unmount)
        if (abortCtrl) abortCtrl.abort();
        abortCtrl = new AbortController();

        const resp = await fetch(
          `/api/monitoramento/alertas-ativos?escola_id=${escolaId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: abortCtrl.signal,
          }
        );

        if (resp.ok) {
          const json = await resp.json();

          // Backend pode retornar:
          // A) array direto: [ { ... }, ... ]
          // B) objeto: { alertas: [ ... ] }
          const lista = Array.isArray(json) ? json : (json?.alertas || []);

          // ✅ elimina setState redundante (se conteúdo não mudou)
          const nextHash = JSON.stringify(lista);
          if (alertasLastHashRef.current !== nextHash) {
            alertasLastHashRef.current = nextHash;
            if (alive) setAlunosAlerta(lista);
          }
        }
      } catch (err) {
        // Abort é esperado em troca/unmount → não logar como erro
        if (err?.name !== "AbortError") {
          const now = Date.now();
          const passouJanela = now - alertasErrLastAtRef.current > 30000;

          if (DEBUG_MONITORAMENTO || passouJanela) {
            alertasErrLastAtRef.current = now;
            console.error("Erro ao carregar alertas:", err);
          }
        }
      } finally {
        alertasInFlightRef.current = false;
        if (alive) setLoadingAlunosAlerta(false);
      }
    }

    // ✅ Primeira carga imediata (mantém UX)
    carregarAlunosAlerta();

    // ✅ SSE é primário. Se estiver conectado, NÃO cria polling (zero metralhamento).
    if (sseAlertasConectado) {
      return () => {
        alive = false;
        if (abortCtrl) abortCtrl.abort();
      };
    }

    // ✅ Fallback: polling apenas quando SSE estiver OFF
    const intervalMs = 15000;

    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      carregarAlunosAlerta();
    }, intervalMs);

    return () => {
      alive = false;
      if (abortCtrl) abortCtrl.abort();
      clearInterval(interval);
    };
  }, [sseAlertasConectado]);

  // --------------------------------------------------------------------------
  // SSE - Eventos de alerta ao vivo (mantido e validado)
  // --------------------------------------------------------------------------
useEffect(() => {
    const token = localStorage.getItem("token");
    const escolaId = localStorage.getItem("escola_id") || "1";
    if (!token) return;

    let alive = true;

    const sse = new EventSource(
      `/api/monitoramento/alertas-stream?escola_id=${escolaId}&token=${token}`
    );

    sse.onopen = () => {
      if (!alive) return;
      setSseAlertasConectado(true);
    };

    sse.onmessage = (event) => {
      if (!alive) return;

      try {
        const data = JSON.parse(event.data);

        if (data && data.tipo === "alerta") {
          // ✅ SSE primário: atualiza lista local imediatamente (polling vira só fallback)
          setAlunosAlerta((prev) => {
            const codigo = String(data.codigo ?? "");
            if (!codigo) return prev;

            const novo = {
              id: data.id ?? null,
              codigo: data.codigo,
              estudante: data.nome ?? data.estudante ?? "",
              alerta_flag: 1,
              alerta_motivo: data.motivo ?? "",
              turma: data.turma ?? "",
              turno: data.turno ?? "",
            };

            const idx = prev.findIndex((a) => String(a.codigo) === codigo);
            if (idx >= 0) {
              const atual = prev[idx];
              const igual =
                String(atual.estudante ?? "") === String(novo.estudante ?? "") &&
                String(atual.alerta_motivo ?? "") === String(novo.alerta_motivo ?? "") &&
                String(atual.turma ?? "") === String(novo.turma ?? "") &&
                String(atual.turno ?? "") === String(novo.turno ?? "");

              if (igual) return prev;

              const next = prev.slice();
              next[idx] = { ...atual, ...novo };
              return next;
            }

            // adiciona no topo
            return [novo, ...prev].slice(0, 50);
          });

          // toast (com cleanup)
          setToast({
            nome: data.nome,
            codigo: data.codigo,
            turma: data.turma,
            turno: data.turno,
            camera: data.camera,
            motivo: data.motivo,
            when: new Date().toLocaleTimeString("pt-BR"),
          });

          setAlunoDestacado(data.codigo);

          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => {
            if (alive) setToast(null);
          }, 6000);
        }
      } catch (err) {
        if (DEBUG_MONITORAMENTO) {
          console.error("Erro SSE:", err);
        }
      }
    };

    sse.onerror = () => {
      if (!alive) return;
      setSseAlertasConectado(false);

      // ✅ NÃO fechar: EventSource tem reconexão automática
      if (DEBUG_MONITORAMENTO) {
        console.warn("SSE desconectado (reconexão automática em andamento)...");
      }
    };

    return () => {
      alive = false;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      sse.close();
    };
  }, []);

  // --------------------------------------------------------------------------
// Polling: últimos reconhecidos por câmera (preenche listaAtual)
// --------------------------------------------------------------------------
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  let alive = true;
  let abortCtrl = null;

  async function carregarUltimos() {
    if (!alive) return;

    // ✅ evita overlap: se já tem request em andamento, não dispara outro
    if (ultimosInFlightRef.current) return;
    ultimosInFlightRef.current = true;

    try {
      // ✅ abort do request anterior (e também no unmount)
      if (abortCtrl) abortCtrl.abort();
      abortCtrl = new AbortController();

      const res = await fetch(
        "/api/monitoramento/ultimos?limit=5&janelaMin=1440",
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortCtrl.signal,
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const cams = data?.cameras || {};

      if (DEBUG_MONITORAMENTO) {
        console.log("[Monitoramento] cameras recebidas:", cams);
      }

      const next = {
        camera1: Array.isArray(cams["1"]) ? cams["1"] : [],
        camera2: Array.isArray(cams["2"]) ? cams["2"] : [],
        camera3: Array.isArray(cams["3"]) ? cams["3"] : [],
      };

      // ✅ elimina setState redundante (se conteúdo não mudou)
      const nextHash = JSON.stringify(next);
      if (ultimosLastHashRef.current !== nextHash) {
        ultimosLastHashRef.current = nextHash;
        if (alive) setListaAtual(next);
      }
    } catch (err) {
      // Abort é esperado em troca/unmount → não logar como erro
      if (err?.name !== "AbortError") {
        const now = Date.now();
        const passouJanela = now - ultimosErrLastAtRef.current > 30000;

        if (DEBUG_MONITORAMENTO || passouJanela) {
          ultimosErrLastAtRef.current = now;
          console.error("[Monitoramento] erro ao buscar ultimos:", err);
        }
      }
    } finally {
      ultimosInFlightRef.current = false;
    }
  }

  carregarUltimos();

  // ✅ Polling otimizado (mantém o seu 15s + pausa quando aba oculta)
  const intervalMs = 15000;

  const id = setInterval(() => {
    if (document.visibilityState === "hidden") return;
    carregarUltimos();
  }, intervalMs);

  return () => {
    alive = false;
    if (abortCtrl) abortCtrl.abort();
    clearInterval(id);
  };
}, []);

  // --------------------------------------------------------------------------
  // Layout principal
  // --------------------------------------------------------------------------
  return (
    <div className="p-6 flex flex-col gap-6 bg-blue-50 min-h-screen">
      <header className="flex items-center justify-between bg-white border border-blue-200 shadow-sm rounded-lg px-4 py-3">
        <h1 className="text-2xl font-bold text-blue-900">
          Monitoramento em Tempo Real
        </h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Voltar
        </button>
      </header>

      <main className="flex flex-row gap-6">
        {/* COLUNA LATERAL ESQUERDA */}
        <aside className="w-48 flex-shrink-0">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className={filtroTurno === "hoje" ? botaoAtivo : baseBotaoTurno}
              onClick={handleCliqueHoje}
            >
              Hoje
            </button>
            <button
              type="button"
              className={
                filtroTurno === "matutino" ? botaoAtivo : baseBotaoTurno
              }
              onClick={() => handleCliqueTurno("matutino")}
            >
              Matutino
            </button>
            <button
              type="button"
              className={
                filtroTurno === "vespertino" ? botaoAtivo : baseBotaoTurno
              }
              onClick={() => handleCliqueTurno("vespertino")}
            >
              Vespertino
            </button>
            <button
              type="button"
              className={
                filtroTurno === "noturno" ? botaoAtivo : baseBotaoTurno
              }
              onClick={() => handleCliqueTurno("noturno")}
            >
              Noturno
            </button>
            <button
              type="button"
              className={
                filtroTurno === "historico" ? botaoAtivo : baseBotaoTurno
              }
              onClick={handleCliqueHistorico}
            >
              Histórico
            </button>
            <button
              type="button"
              className={baseBotaoTurno}
              onClick={() => navigate("/monitoramento/painel")}
            >
              Tela Cheia
            </button>
          </div>
        </aside>

        {/* SEÇÃO DAS CÂMERAS */}
        <section className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <StreamCamera
                cameraId={1}
                titulo="Câmera Central"
                registros={listaAtual.camera1}
              />
            </div>
            <div>
              <StreamCamera
                cameraId={2}
                titulo="Câmera Direita"
                registros={listaAtual.camera2}
              />
            </div>
            <div>
              <StreamCamera
                cameraId={3}
                titulo="Câmera Esquerda"
                registros={listaAtual.camera3}
              />
            </div>
          </div>
        </section>

        {/* COLUNA DE ALERTAS */}
        <aside className="w-72 flex-shrink-0">
          <div className="bg-white border border-rose-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="font-semibold text-rose-700">Alunos em Alerta</div>
              <div className="text-xs text-rose-700">{alunosAlerta.length}</div>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              {loadingAlunosAlerta ? (
                <div className="p-3 text-sm text-gray-600">Carregando…</div>
              ) : alunosAlerta.length === 0 ? (
                <div className="p-3 text-sm text-gray-600">
                  Nenhum aluno com alerta ativo.
                </div>
              ) : (
                <ul className="divide-y">
                  {alunosAlerta.map((a) => {
                    const destaque =
                      String(a.codigo) === String(alunoDestacado);
                    return (
                      <li
                        key={`${a.id}-${a.codigo}`}
                        className={`p-3 ${
                          destaque ? "bg-rose-50 animate-pulse" : ""
                        }`}
                        title={a.alerta_motivo || "ALERTA ATIVO"}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-800">
                            {a.estudante}
                          </div>
                          <span className="text-xs text-gray-500">
                            ({a.codigo})
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {a.turma || "—"}/{(a.turno || "").toUpperCase() || "—"}
                        </div>
                        <div className="text-xs text-rose-700 mt-1">
                          {a.alerta_motivo || "ALERTA ATIVO"}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* MODAL DE PRESENÇAS POR TURNO */}
      <ModalPresencasTurno
        isOpen={modalAberto}
        onClose={fecharModal}
        turno={turnoModal}
        dataFiltro={turnoModal === "historico" ? dataHistorico : undefined}
      />

      {/* TOAST DE ALERTA (mantido) */}
      {toast && (
        <div className="fixed right-4 bottom-4 bg-white border border-rose-400 shadow-xl rounded-lg p-4 z-50 w-[340px] animate-pulse">
          <div className="text-rose-600 font-bold">
            ⚠️ ALERTA — {toast.camera}
          </div>
          <div className="mt-1 font-semibold">
            {toast.nome}{" "}
            <span className="text-gray-500">({toast.codigo})</span>
          </div>
          <div className="text-sm text-gray-700">{toast.motivo}</div>
          <div className="text-xs text-gray-500 mt-1">
            {toast.turma || "—"}/{(toast.turno || "").toUpperCase() || "—"} •{" "}
            {toast.when}
          </div>
        </div>
      )}
    </div>
  );
}
