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

export default function BoletimTurmas() {
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  // Para barra de progresso
  const [progress, setProgress] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  useEffect(() => {
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
      normalizaTexto(t.turno) === normalizaTexto(turnoSelecionado)
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

      {/* Mini cards de turmas */}
      {turnoSelecionado && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-8">
          {loadingTurmas ? (
            <p className="col-span-full text-center text-gray-500">
              Turmas sendo carregadas...
            </p>
          ) : turmasFiltradas.length > 0 ? (
            turmasFiltradas.map((turma) => (
              <div
                key={turma.id}
                onClick={() => !gerando && handleGerarBoletins(turma)}
                className={`bg-gradient-to-b from-blue-200 to-blue-50 rounded-md px-9 py-2 shadow-md cursor-pointer hover:shadow-xl transition-transform hover:scale-105 text-center font-bold text-blue-900 text-base ${
                  gerando ? "opacity-70 pointer-events-none" : ""
                }`}
                style={{
                  minWidth: "80px",
                  maxWidth: "100px",
                  margin: "0 auto",
                }}
                title={`Gerar boletins da turma ${turma.turma}`}
                aria-label={`Gerar boletins da turma ${turma.turma}`}
                tabIndex={0}
              >
                {turma.turma}
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">
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
