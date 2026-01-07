import React, { useState, useEffect } from "react";

export default function GerarGabaritos() {
  // STATES DE DADOS
  const [turmas, setTurmas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [alunos, setAlunos] = useState([]);
  // STATES DOS SELECTS
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [descricao, setDescricao] = useState("");
  const [turnoAluno, setTurnoAluno] = useState("");
  const [turmaAluno, setTurmaAluno] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [turnoSelecionado, setTurnoSelecionado] = useState("");
  // LOADING
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  // LOADING VISUAL DE CADA LISTA
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [loadingAluno, setLoadingAluno] = useState(false);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  // BUSCAR TURNOS DO BACKEND (para todos os blocos)
  useEffect(() => {
    async function fetchTurnos() {
      setLoadingTurnos(true);
      try {
        const resp = await fetch("http://localhost:3000/api/turnos");
        if (!resp.ok) throw new Error("Erro ao buscar turnos");
        const data = await resp.json();
        setTurnos(data);
      } catch {
        setTurnos([]);
      }
      setLoadingTurnos(false);
    }
    fetchTurnos();
  }, []);

  // BUSCAR TURMAS DO BACKEND
  useEffect(() => {
    async function fetchTurmas() {
      setLoadingTurmas(true);
      try {
        const resp = await fetch("http://localhost:3000/api/turmas");
        if (!resp.ok) throw new Error("Erro ao buscar turmas");
        const data = await resp.json();
        setTurmas(data);
      } catch {
        setTurmas([]);
      }
      setLoadingTurmas(false);
    }
    fetchTurmas();
  }, []);


  // GERANDO E BAIXANDO GABARITO PARA UM ALUNO. (BLOCO ALUNO)
  async function handleGerarAluno() {
    setLoadingAluno(true);
    try {
      const resp = await fetch("http://localhost:3000/api/gabaritos-generator/gerar-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aluno_codigo: alunoSelecionado,
          turma_id: turmaAluno,
          descricao: descricao
        })
      });
      if (!resp.ok) throw new Error("Erro ao gerar gabarito individual.");
      const data = await resp.json();
      // Exemplo: data.downloadUrl = "/api/gabaritos-generator/downloads/Aluno123_2A.pdf"
      window.open(`http://localhost:3000${data.downloadUrl}`, "_blank"); // Baixa o PDF
      showToast("Gabarito individual gerado e enviado para download!");
    } catch (err) {
      showToast("Erro ao gerar gabarito individual.");
    }
    setLoadingAluno(false);
  }


  // BUSCAR ALUNOS DA TURMA SELECIONADA (BLOCO ALUNO)
  useEffect(() => {
    if (!turmaAluno || !turnoAluno) {
      setAlunos([]);
      setAlunoSelecionado("");
      setLoadingAlunos(false);
      return;
    }
    async function fetchAlunos() {
      setLoadingAlunos(true);
      try {
        const resp = await fetch(`http://localhost:3000/api/alunos?turma_id=${encodeURIComponent(turmaAluno)}`);
        if (!resp.ok) throw new Error("Erro ao buscar alunos da turma");
        const data = await resp.json();
        setAlunos(data);
      } catch {
        setAlunos([]);
      }
      setAlunoSelecionado("");
      setLoadingAlunos(false);
    }
    fetchAlunos();
  }, [turmaAluno, turnoAluno]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  }

  async function handleGerar() {
    if (!turmaSelecionada) {
      showToast("Selecione uma turma para gerar os gabaritos.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(
        `http://localhost:3000/api/gabaritos-generator/gerar/${encodeURIComponent(
          turmaSelecionada
        )}`,
        { method: "POST" }
      );
      if (!resp.ok) throw new Error("Erro ao gerar gabaritos.");
      const data = await resp.json();
      showToast(data.message || "Gabaritos gerados com sucesso!");
    } catch {
      showToast("Erro ao gerar gabaritos.");
    } finally {
      setLoading(false);
    }
  }

  // COMPONENTE DE SPINNER PARA REUSO
  function Spinner() {
    return (
      <svg className="animate-spin h-5 w-5 text-blue-600 absolute right-2 top-2" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    );
  }

  return (
    <div className="p-8 bg-blue-50 min-h-screen flex flex-col gap-10">

      {/* Toast fixo abaixo do HeaderGlobal */}
      {toastMessage && (
        <div className="mb-4 px-4 py-3 bg-green-100 border border-green-300 text-green-900 rounded flex items-center gap-2 font-semibold transition">
          <svg width="20" height="20" fill="none">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-4.41l5.3-5.3-1.42-1.42L9 10.76l-1.88-1.88-1.41 1.41L9 13.59z" fill="#22c55e" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* 1: Descrição do Gabarito */}
      <div>
        <label className="block text-blue-900 font-bold mb-2 text-lg" htmlFor="descricao">
          Descrição do Gabarito:
        </label>
        <input
          id="descricao"
          type="text"
          placeholder="Digite aqui a descrição do gabarito: Ex.  CEF04- CCMDF- AVALIAÇÃO 2º BIMESTRE- 2025"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="block w-full max-w-2xl p-2 border border-gray-300 rounded mb-2 bg-white shadow-sm"
          autoComplete="off"
        />
      </div>

      {/* 2: Gabarito do Aluno */}
      <div>
        <div className="font-bold text-blue-900 mb-2 text-lg">Gabarito do Aluno:</div>
        <div className="flex flex-wrap gap-4 items-center">
          {/* Lista de turno */}
          <div className="relative">
            <select
              value={turnoAluno}
              onChange={e => {
                setTurnoAluno(e.target.value);
                setTurmaAluno("");
                setAlunoSelecionado("");
                setAlunos([]);
              }}
              className="p-2 border rounded w-48"
              disabled={loadingTurnos}
            >
              <option value="">Selecione o Turno</option>
              {loadingTurnos ? (
                <option value="" disabled>Carregando turnos...</option>
              ) : (
                turnos.map((turno) => (
                  <option key={turno} value={turno}>{turno}</option>
                ))
              )}
            </select>
            {loadingTurnos && <Spinner />}
          </div>
          {/* Lista de turma (filtra pelo turno) */}
          <div className="relative">
            <select
              value={turmaAluno}
              onChange={e => {
                setTurmaAluno(e.target.value);
                setAlunoSelecionado("");
              }}
              className="p-2 border rounded w-48"
              disabled={!turnoAluno || loadingTurmas}
            >
              <option value="">Selecione a Turma</option>
              {loadingTurmas ? (
                <option value="" disabled>Carregando turmas...</option>
              ) : (
                turmas
                  .filter(t => !turnoAluno || t.turno === turnoAluno)
                  .map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.turma} ({turma.turno})
                    </option>
                  ))
              )}
            </select>
            {loadingTurmas && <Spinner />}
          </div>
          {/* Lista de alunos */}
          <div className="relative">
            <select
              value={alunoSelecionado}
              onChange={e => setAlunoSelecionado(e.target.value)}
              className="p-2 border rounded w-48"
              disabled={!turmaAluno || loadingAlunos}
            >
              <option value="">Selecione o Aluno</option>
              {loadingAlunos ? (
                <option value="" disabled>Carregando alunos...</option>
              ) : (
                alunos.map((aluno) => (
                  <option key={aluno.codigo} value={aluno.codigo}>
                    {aluno.codigo} - {aluno.nome || aluno.estudante}
                  </option>
                ))
              )}
            </select>
            {loadingAlunos && <Spinner />}
          </div>

          <button
            onClick={handleGerarAluno}
            disabled={!turnoAluno || !turmaAluno || !alunoSelecionado || loadingAluno}
            className={`px-6 py-2 rounded text-white font-bold flex items-center justify-center gap-2 ${
              loadingAluno ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loadingAluno ? (
              <span className="animate-pulse">Carregando...</span>
            ) : (
              "Gerar Gabarito"
            )}
          </button>

        </div>
      </div>

      {/* 3: Gabarito da Turma */}
      <div>
        <div className="font-bold text-blue-900 mb-2 text-lg">Gabarito da Turma:</div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <select
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="p-2 border rounded w-48"
              disabled={loadingTurmas}
            >
              <option value="">Selecione a Turma</option>
              {loadingTurmas ? (
                <option value="" disabled>Carregando turmas...</option>
              ) : (
                turmas.map((turma) => (
                  <option key={turma.id} value={turma.turma}>
                    {turma.turma} ({turma.turno})
                  </option>
                ))
              )}
            </select>
            {loadingTurmas && <Spinner />}
          </div>
          <button
            onClick={handleGerar}
            disabled={!turmaSelecionada || loading}
            className={`px-6 py-2 rounded text-white font-bold ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Gerando..." : "Gerar Gabaritos"}
          </button>
        </div>
      </div>

      {/* 4: Gabarito do Turno */}
      <div>
        <div className="font-bold text-blue-900 mb-2 text-lg">Gabarito do Turno:</div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <select
              value={turnoSelecionado}
              onChange={e => setTurnoSelecionado(e.target.value)}
              className="p-2 border rounded w-48"
              disabled={loadingTurnos}
            >
              <option value="">Selecione o Turno</option>
              {loadingTurnos ? (
                <option value="" disabled>Carregando turnos...</option>
              ) : (
                turnos.map((turno) => (
                  <option key={turno} value={turno}>{turno}</option>
                ))
              )}
            </select>
            {loadingTurnos && <Spinner />}
          </div>
          <button
            className="px-6 py-2 rounded text-white font-bold bg-blue-600 hover:bg-blue-700"
            disabled={!turnoSelecionado}
          >
            Gerar Gabarito
          </button>
        </div>
      </div>
    </div>
  );
}
