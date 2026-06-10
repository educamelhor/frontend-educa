import React, { useState, useEffect } from "react";
import api from "../../services/api";

function normalizaTexto(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Retorna o ano letivo padrão (ano atual; se janeiro, usa ano anterior)
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

export default function BoletimTurmas() {
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  // Ano letivo
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());

  // Para barra de progresso
  const [progress, setProgress] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  useEffect(() => {
    // Busca anos letivos disponíveis
    async function carregarAnos() {
      try {
        const res = await api.get("/api/matriculas/anos");
        setAnosLetivos(Array.isArray(res.data) ? res.data : []);
      } catch {
        setAnosLetivos([anoLetivoPadrao()]);
      }
    }
    carregarAnos();
    fetchTurmas();
  }, []);

  const fetchTurmas = async () => {
    setLoadingTurmas(true);
    try {
      const escola_id = localStorage.getItem("escola_id") || 1;
      const { data } = await api.get("/api/turmas", {
        params: { escola_id },
      });
      setTurmas(data);
    } catch (error) {
      setTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  };

  const turmasFiltradas = turmas.filter(
    (t) =>
      turnoSelecionado &&
      normalizaTexto(t.turno) === normalizaTexto(turnoSelecionado) &&
      Number(t.ano) === anoLetivo
  );

  const handleGerarBoletins = async (turma) => {
    setGerando(true);
    setProgress(30);
    setSucesso(false);

    try {
      // Garante que está passando o ID numérico da turma!
      const { data } = await api.post(
        "/api/boletins/gerar",
        { turma_id: turma.id }, // <-- ATENÇÃO: sempre .id
        { responseType: "blob", timeout: 180000 }
      );

      setProgress(80);

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Boletins_Turma_${turma.turma.replace(/\s/g, "")}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setProgress(100);
      setSucesso(true);

      setTimeout(() => {
        setProgress(0);
        setGerando(false);
        setSucesso(false); // Limpa mensagem após alguns segundos
      }, 1800);
    } catch (err) {
      setGerando(false);
      setProgress(0);
      setSucesso(false);
      alert("Erro ao gerar boletins.");
    }
  };

  // Limpa mensagem de sucesso ao trocar turno
  const handleClickTurno = (turno) => {
    setTurnoSelecionado(turno);
    setSucesso(false);
  };

  return (
    <div className="p-6">
      <h1
        className="text-5xl font-bold text-center text-blue-900 mb-8"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Impressão de Boletins
      </h1>

      {/* Seletor de Ano Letivo */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
          <label htmlFor="filtro-ano-boletim" className="text-sm font-semibold text-gray-700">Ano Letivo:</label>
          <select
            id="filtro-ano-boletim"
            value={anoLetivo}
            onChange={(e) => {
              setAnoLetivo(Number(e.target.value));
              setTurnoSelecionado(null);
              setSucesso(false);
            }}
            className="border rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {anosLetivos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Botões de Turnos */}
      <div className="flex justify-center gap-4 mb-10">
        {turnos.map((turno) => (
          <button
            key={turno}
            onClick={() => handleClickTurno(turno)}
            className={`px-8 py-4 text-xl font-semibold rounded-xl shadow-md transition transform hover:scale-105 ${
              turnoSelecionado === turno
                ? "bg-green-600 text-white"
                : "bg-white text-blue-800 border border-blue-400 hover:bg-blue-100"
            }`}
            disabled={gerando}
            aria-label={`Selecionar turno ${turno}`}
          >
            {turno}
          </button>
        ))}
      </div>

      {/* Cards de turmas */}
      {turnoSelecionado && (
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {loadingTurmas ? (
            <p className="text-center text-gray-500 w-full">Turmas sendo carregadas...</p>
          ) : turmasFiltradas.length > 0 ? (
            turmasFiltradas.map((turma) => (
              <button
                key={turma.id}
                onClick={() => !gerando && handleGerarBoletins(turma)}
                disabled={gerando}
                title={`Gerar boletins da turma ${turma.turma}`}
                aria-label={`Gerar boletins da turma ${turma.turma}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm border font-semibold text-sm
                  whitespace-nowrap transition-all duration-150 select-none
                  bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300 text-blue-900
                  hover:from-blue-100 hover:to-indigo-200 hover:shadow-md hover:scale-105 active:scale-95
                  ${gerando ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="text-base">📋</span>
                <span>{turma.turma}</span>
              </button>
            ))
          ) : (
            <p className="text-center text-gray-500 w-full">
              Nenhuma turma encontrada para {turnoSelecionado}.
            </p>
          )}
        </div>
      )}

      {/* Barra de Progresso e Mensagem */}
      {gerando && (
        <div className="w-full flex flex-col items-center mt-8">
          <div className="w-full max-w-md bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-blue-900 font-semibold">Gerando PDF...</span>
        </div>
      )}
      {sucesso && (
        <div className="w-full flex justify-center mt-6">
          <span className="text-green-600 font-semibold text-xl">
            Boletins gerados com sucesso!
          </span>
        </div>
      )}
    </div>
  );
}
