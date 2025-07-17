// src/pages/PlanoBimestral.jsx

import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";  // instância axios para chamar a API

export default function PlanoBimestral() {
  const [turma, setTurma] = useState("");
  const [tipo, setTipo] = useState("Prova");
  const [nomeProva, setNomeProva] = useState("");
  const [valorProva, setValorProva] = useState("");
  const [nomeAvaliacao, setNomeAvaliacao] = useState("");
  const [valorAvaliacao, setValorAvaliacao] = useState("");

  const [topics, setTopics] = useState([]);          // tópicos do plano atual
  const [plans, setPlans] = useState({});            // planos salvos por turma
  const [selectedTopic, setSelectedTopic] = useState("");
  const [editIndex, setEditIndex] = useState(null);

  const [students, setStudents] = useState([]);      // alunos da turma
  const prevTurmaRef = useRef("");
  const turmaOptions = ["6º ANO A", "6º ANO B", "7º ANO A", "7º ANO B"];

  // calcula totais
  const sumPoints = topics.reduce((sum, t) => sum + t.valor, 0);
  const sumProvaPoints = topics.filter(t => t.tipo === "Prova")
                               .reduce((sum, t) => sum + t.valor, 0);
  const remainingPoints = 10 - sumPoints;
  const remainingProvaPoints = 5 - sumProvaPoints;
  const planoConcluido = sumPoints === 10;
  const isLocked = planoConcluido && editIndex === null;

  // Ao mudar de turma: salva o plano antigo na API e carrega o novo
  useEffect(() => {
    const prev = prevTurmaRef.current;
    if (prev) {
      // salva plano anterior via API
      api.post("/planobimestral", { turma: prev, topics: plans[prev] || [] })
         .catch(console.error);
    }
    if (turma) {
      // tenta carregar plano desta turma da API
      api.get(`/planobimestral?turma=${encodeURIComponent(turma)}`)
         .then(resp => {
           setTopics(resp.data.topics || []);
           setPlans(p => ({ ...p, [turma]: resp.data.topics || [] }));
         })
         .catch(err => {
           console.error("Erro ao carregar plano:", err);
           setTopics(plans[turma] || []);
         });
    } else {
      setTopics([]);
    }
    prevTurmaRef.current = turma;
    setEditIndex(null);
    setSelectedTopic("");
    setNomeProva("");
    setValorProva("");
    setNomeAvaliacao("");
    setValorAvaliacao("");
  }, [turma]);

  // Ao mudar de turma, buscar alunos via API
  useEffect(() => {
    if (!turma) {
      setStudents([]);
      return;
    }
    api.get(`/alunos?turma=${encodeURIComponent(turma)}`)
       .then(resp => setStudents(resp.data))
       .catch(err => {
         console.error("Erro ao carregar alunos:", err);
         setStudents([]);
       });
  }, [turma]);

  const handleSave = () => {
    const nome = (tipo === "Prova" ? nomeProva : nomeAvaliacao).trim();
    const valor = Number(tipo === "Prova" ? valorProva : valorAvaliacao);
    if (!nome || !valor) return;

    // validações
    if (tipo === "Prova" &&
        sumProvaPoints + valor - (editIndex !== null && topics[editIndex].tipo === "Prova" ? topics[editIndex].valor : 0) > 5
    ) {
      alert(`Limite de Prova (5) excedido. Restam ${remainingProvaPoints} pontos.`);  
      return;
    }
    if (sumPoints + valor - (editIndex !== null ? topics[editIndex].valor : 0) > 10) {
      alert(`Limite total (10) excedido. Restam ${remainingPoints} pontos.`);  
      return;
    }

    const item = { tipo, nome, valor };
    const novoTopics = editIndex !== null
      ? topics.map((t, i) => i === editIndex ? item : t)
      : [...topics, item];

    setTopics(novoTopics);
    setPlans(p => ({ ...p, [turma]: novoTopics }));
    setEditIndex(null);
    setSelectedTopic("");
    setNomeProva("");
    setValorProva("");
    setNomeAvaliacao("");
    setValorAvaliacao("");
  };

  const handleEdit = () => {
    const i = Number(selectedTopic);
    if (isNaN(i)) return;
    const t = topics[i];
    setTipo(t.tipo);
    if (t.tipo === "Prova") {
      setNomeProva(t.nome);
      setValorProva(t.valor);
    } else {
      setNomeAvaliacao(t.nome);
      setValorAvaliacao(t.valor);
    }
    setEditIndex(i);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Plano Bimestral</h1>

      <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow mb-6">
        <div>
          <label className="block mb-1">Turma</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={turma}
            onChange={e => setTurma(e.target.value)}
          >
            <option value="">Selecione a turma</option>
            {turmaOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block mb-1">Tipo</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            disabled={isLocked}
          >
            <option value="Prova">Prova</option>
            <option value="Avaliação">Avaliação</option>
          </select>
        </div>

        {tipo === "Prova" ? (
          <>
            <div>
              <label className="block mb-1">Nome da prova</label>
              <input
                type="text" maxLength={15}
                className="w-full border rounded px-3 py-2"
                value={nomeProva}
                onChange={e => setNomeProva(e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="block mb-1">Valor da prova</label>
              <input
                type="number" min={0}
                className="w-full border rounded px-3 py-2"
                value={valorProva}
                onChange={e => setValorProva(e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div className="col-span-2 text-sm text-gray-600">
              Soma Provas: {sumProvaPoints} / 5
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block mb-1">Nome da avaliação</label>
              <input
                type="text" maxLength={15}
                className="w-full border rounded px-3 py-2"
                value={nomeAvaliacao}
                onChange={e => setNomeAvaliacao(e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="block mb-1">Valor da avaliação</label>
              <input
                type="number" min={0}
                className="w-full border rounded px-3 py-2"
                value={valorAvaliacao}
                onChange={e => setValorAvaliacao(e.target.value)}
                disabled={isLocked}
              />
            </div>
          </>
        )}

        <div className="col-span-2 flex items-center space-x-4">
          <button
            onClick={handleSave}
            disabled={isLocked || ((tipo === "Prova" ? !nomeProva||!valorProva : !nomeAvaliacao||!valorAvaliacao))}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {editIndex !== null ? "Editar" : "Salvar"}
          </button>

          <select
            className="border rounded px-3 py-2"
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
          >
            <option value="">Editar tópico…</option>
            {topics.map((t, i) => (
              <option key={i} value={i}>
                {t.tipo} – {t.nome} ({t.valor})
              </option>
            ))}
          </select>

          <button
            onClick={handleEdit}
            disabled={!selectedTopic}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Editar
          </button>

          <span className="ml-auto text-gray-700">
            Pontos restantes: {remainingPoints} / 10
          </span>
        </div>
      </div>

      {planoConcluido && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">
          🎉 Plano concluído! Você atingiu os 10 pontos.
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full table-auto border-collapse">
          <thead className="bg-gray-100">
            <tr style={{ height: "6rem" }}>
              <th className="p-2 border text-left">Código</th>
              <th className="p-2 border text-left">Estudante</th>
              <th className="p-2 border text-left">Turma</th>
              {topics.map((t, idx) => (
                <th key={idx} className="p-2 border text-center">
                  {t.nome}<br/><span className="text-xs text-gray-500">({t.valor})</span>
                </th>
              ))}
              <th className="p-2 border text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map(a => (
                <tr key={a.codigo} className="hover:bg-gray-50">
                  <td className="p-2 border">{a.codigo}</td>
                  <td className="p-2 border">{a.nome}</td>
                  <td className="p-2 border">{a.turma}</td>
                  {topics.map((_, i) => (
                    <td key={i} className="p-2 border"></td>
                  ))}
                  <td className="p-2 border text-center font-semibold">
                    {sumPoints}/10
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4 + topics.length} className="p-4 text-center text-gray-500 italic">
                  Selecione uma turma.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
