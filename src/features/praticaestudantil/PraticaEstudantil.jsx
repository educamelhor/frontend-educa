// src/pages/PraticaEstudantil.jsx

import React, { useState, useEffect } from "react";
import { Plus, Edit2 } from "lucide-react";
import api from "../services/api"; // import da instância axios

export default function PraticaEstudantil() {
  const [turma, setTurma] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [nomeAtividade, setNomeAtividade] = useState("");
  const [pontosAtividade, setPontosAtividade] = useState("");

  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [scores, setScores] = useState({});

  const [selectedActivity, setSelectedActivity] = useState("");
  const [editIndex, setEditIndex] = useState(null);

  const turmaOptions = ["1A", "1B", "2A", "2B"];
  const disciplinaOptions = ["Matemática", "Português", "Ciências", "História"];

  // Carrega lista de alunos ao escolher a turma, via API
  useEffect(() => {
    if (!turma) {
      setStudents([]);
      return;
    }
    api
      .get(`/alunos?turma=${encodeURIComponent(turma)}`)
      .then((resp) => {
        setStudents(resp.data);
        setScores({});
      })
      .catch((err) => {
        console.error("Erro ao carregar alunos da API:", err);
        setStudents([]);
      });
  }, [turma]);

  // Soma de pontos das atividades
  const sumActivitiesPoints = activities.reduce((sum, a) => sum + a.pontos, 0);
  const formattedSum = parseFloat(sumActivitiesPoints.toFixed(1));

  // Adiciona ou atualiza uma atividade
  const handleAddActivity = () => {
    const nome = nomeAtividade.trim().slice(0, 15);
    const pontos = Number(pontosAtividade);
    if (!nome || !pontos) return;

    const newSum =
      editIndex !== null
        ? sumActivitiesPoints - activities[editIndex].pontos + pontos
        : sumActivitiesPoints + pontos;
    if (newSum > 5 || (activities.length >= 15 && editIndex === null)) return;

    if (editIndex !== null) {
      setActivities((prev) =>
        prev.map((a, i) => (i === editIndex ? { nome, pontos } : a))
      );
      setEditIndex(null);
      setSelectedActivity("");
    } else {
      setActivities((prev) => [...prev, { nome, pontos }]);
    }

    setNomeAtividade("");
    setPontosAtividade("");
  };

  // Inicia edição de atividade selecionada
  const handleEditClick = () => {
    const idx = Number(selectedActivity);
    if (isNaN(idx)) return;
    const a = activities[idx];
    setNomeAtividade(a.nome);
    setPontosAtividade(a.pontos);
    setEditIndex(idx);
  };

  // Atualiza nota de cada aluno
  const handleScoreChange = (codigo, idx, val) => {
    setScores((prev) => {
      const s = { ...(prev[codigo] || {}) };
      s[idx] = val === "" ? "" : Number(val);
      return { ...prev, [codigo]: s };
    });
  };

  // Desabilita o botão se campos não estiverem preenchidos ou regras não forem atendidas
  const disableButton = () => {
    if (!turma || !disciplina || !nomeAtividade.trim() || !pontosAtividade)
      return true;
    const pts = Number(pontosAtividade);
    const newSum =
      editIndex !== null
        ? sumActivitiesPoints - activities[editIndex].pontos + pts
        : sumActivitiesPoints + pts;
    return newSum > 5 || (activities.length >= 15 && editIndex === null);
  };

  // Estilo para girar texto no cabeçalho
  const rotatedTextStyle = {
    transform: "rotate(-90deg)",
    transformOrigin: "center center",
    whiteSpace: "nowrap",
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Prática Estudantil</h1>

      {/* Bloco de criação/edição de atividades */}
      <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow mb-8">
        <div>
          <label className="block mb-1">Turma</label>
          <select
            className="w-full border rounded px-3 py-2 disabled:opacity-50"
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            disabled={editIndex !== null}
          >
            <option value="">Selecione a turma</option>
            {turmaOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Disciplina</label>
          <select
            className="w-full border rounded px-3 py-2 disabled:opacity-50"
            value={disciplina}
            onChange={(e) => setDisciplina(e.target.value)}
            disabled={editIndex !== null}
          >
            <option value="">Selecione a disciplina</option>
            {disciplinaOptions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Nome da atividade</label>
          <input
            type="text"
            maxLength={15}
            className="w-full border rounded px-3 py-2"
            placeholder="Até 15 caracteres"
            value={nomeAtividade}
            onChange={(e) => setNomeAtividade(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">Pontos (0–5)</label>
          <input
            type="number"
            min={0}
            max={5}
            className="w-full border rounded px-3 py-2"
            value={pontosAtividade}
            onChange={(e) => setPontosAtividade(e.target.value)}
          />
        </div>
        <div className="col-span-2 flex items-center space-x-2">
          <button
            onClick={handleAddActivity}
            disabled={disableButton()}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            <Plus className="mr-2" />
            {editIndex !== null ? "Atualizar" : "Salvar"}
          </button>
          <select
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Editar atividade...</option>
            {activities.map((a, i) => (
              <option key={i} value={i}>
                {a.nome} ({a.pontos})
              </option>
            ))}
          </select>
          <button
            onClick={handleEditClick}
            disabled={!selectedActivity}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            <Edit2 className="mr-2" />
            Editar
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            {activities.length} / 15 colunas — Soma: {formattedSum} / 5
          </span>
        </div>
      </div>

      {/* Tabela de lançamento de notas */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-24" />
            <col className="w-48" />
            <col className="w-24" />
            {activities.map((_, i) => (
              <col key={i} className="w-auto" />
            ))}
            <col className="w-24" />
          </colgroup>
          <thead className="bg-gray-100">
            <tr style={{ height: "7.5rem" }}>
              <th className="p-2 border">Código</th>
              <th className="p-2 border">Estudante</th>
              <th className="p-2 border text-center">
                <div style={rotatedTextStyle}>Turma</div>
              </th>
              {activities.map((a, i) => (
                <th key={i} className="p-2 border text-center">
                  <div style={rotatedTextStyle}>{a.nome}</div>
                </th>
              ))}
              <th className="p-2 border text-center">Total (0–5)</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={3 + activities.length + 1}
                  className="p-4 text-center text-gray-500 italic"
                >
                  Selecione uma turma.
                </td>
              </tr>
            ) : (
              students.map((aluno) => {
                const row = scores[aluno.codigo] || {};
                const total = activities.reduce(
                  (s, _, idx) => s + Number(row[idx] || 0),
                  0
                );
                return (
                  <tr key={aluno.codigo} className="hover:bg-gray-50">
                    <td className="p-2 border">{aluno.codigo}</td>
                    <td className="p-2 border">{aluno.nome}</td>
                    <td className="p-2 border text-center">{aluno.turma}</td>
                    {activities.map((_, idx) => (
                      <td key={idx} className="p-2 border text-center">
                        <input
                          type="number"
                          max={activities[idx].pontos}
                          value={scores[aluno.codigo]?.[idx] ?? ""}
                          onChange={(e) =>
                            handleScoreChange(
                              aluno.codigo,
                              idx,
                              e.target.value
                            )
                          }
                          className="w-full border rounded px-1 py-0.5 text-center no-spinner"
                        />
                      </td>
                    ))}
                    <td className="p-2 border text-center font-semibold">
                      {parseFloat(total.toFixed(1))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
