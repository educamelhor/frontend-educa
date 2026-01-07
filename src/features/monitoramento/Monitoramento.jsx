// src/features/monitoramento/Monitoramento.jsx
// ============================================================================
// Tela principal do módulo MONITORAMENTO
// ----------------------------------------------------------------------------
// Mantém layout original e integração completa com StreamCamera.jsx revisado.
// Suporta 3 câmeras (Centro, Direita, Esquerda) + miniaturas dinâmicas e modo AO VIVO.
// ============================================================================

import React, { useEffect, useState } from "react";
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
  const [toast, setToast] = useState(null);
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
    async function carregarAlunosAlerta() {
      setLoadingAlunosAlerta(true);
      try {
        const token = localStorage.getItem("token");
        const escolaId = localStorage.getItem("escola_id") || "1";
        const resp = await fetch(
          `/api/monitoramento/alertas-ativos?escola_id=${escolaId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (resp.ok) {
          const json = await resp.json();
          setAlunosAlerta(json.alertas || []);
        }
      } catch (err) {
        console.error("Erro ao carregar alertas:", err);
      } finally {
        setLoadingAlunosAlerta(false);
      }
    }
    carregarAlunosAlerta();
    const interval = setInterval(carregarAlunosAlerta, 5000);
    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------------------------------
  // SSE - Eventos de alerta ao vivo (mantido e validado)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    const escolaId = localStorage.getItem("escola_id") || "1";
    if (!token) return;

    const sse = new EventSource(
      `/api/monitoramento/alertas-stream?escola_id=${escolaId}&token=${token}`
    );

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.tipo === "alerta") {
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
          setTimeout(() => setToast(null), 6000);
        }
      } catch (err) {
        console.error("Erro SSE:", err);
      }
    };

    sse.onerror = () => {
      console.warn("SSE desconectado, tentando reconectar...");
      sse.close();
    };

    return () => sse.close();
  }, []);

  // --------------------------------------------------------------------------
// Polling: últimos reconhecidos por câmera (preenche listaAtual)
// --------------------------------------------------------------------------
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  async function carregarUltimos() {
    try {
      const res = await fetch(
        "/api/monitoramento/ultimos?limit=5&janelaMin=1440",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const cams = data?.cameras || {};
      console.log("[Monitoramento] cameras recebidas:", cams); // <-- seu log

      setListaAtual({
        camera1: Array.isArray(cams["1"]) ? cams["1"] : [],
        camera2: Array.isArray(cams["2"]) ? cams["2"] : [],
        camera3: Array.isArray(cams["3"]) ? cams["3"] : [],
      });
    } catch (err) {
      console.error("[Monitoramento] erro ao buscar ultimos:", err);
    }
  }

  carregarUltimos();
  const id = setInterval(carregarUltimos, 2000);
  return () => clearInterval(id);
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
