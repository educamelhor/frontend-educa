// src/pages/Professores.jsx

import React, { useState, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";
import api from "../services/api";

export default function Professores() {
  const [professores, setProfessores] = useState([]);
  const [filtro, setFiltro] = useState("");

  // 1) ao montar, buscar lista de professores da API
  useEffect(() => {
    api
      .get("/professores")
      .then((resp) => {
        setProfessores(resp.data);
      })
      .catch((err) => {
        console.error("Erro ao carregar professores:", err);
      });
  }, []);

  // 2) deletar professor
  function handleDelete(prof) {
    if (!window.confirm(`Excluir o professor ${prof.nome}?`)) return;
    api
      .delete(`/professores/${prof.cpf}`)
      .then(() => {
        setProfessores((prev) => prev.filter((p) => p.cpf !== prof.cpf));
      })
      .catch((err) => {
        console.error("Erro ao excluir professor:", err);
      });
  }

  // 3) editar professor via prompts simples
  function handleEdit(prof) {
    const novoNome = window.prompt("Nome:", prof.nome);
    if (novoNome == null) return;
    const novaDisciplina = window.prompt("Disciplina:", prof.disciplina);
    if (novaDisciplina == null) return;

    api
      .put(`/professores/${prof.cpf}`, {
        ...prof,
        nome: novoNome,
        disciplina: novaDisciplina,
      })
      .then((resp) => {
        setProfessores((prev) =>
          prev.map((p) => (p.cpf === prof.cpf ? resp.data : p))
        );
      })
      .catch((err) => {
        console.error("Erro ao editar professor:", err);
      });
  }

  // 4) filtro de busca
  const termo = filtro.toLowerCase();
  const listaFiltrada = professores.filter((p) =>
    p.nome.toLowerCase().includes(termo) ||
    p.cpf.includes(termo) ||
    p.disciplina.toLowerCase().includes(termo)
  );

  return (
    <div className="p-6 bg-blue-50 min-h-screen space-y-6">
      <h1 className="text-3xl font-bold text-blue-900">👩‍🏫 Gestão de Professores</h1>

      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="🔍 Buscar professor"
          className="border p-2 rounded w-1/3"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto bg-white rounded shadow p-4">
        <table className="w-full table-auto">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-3 border">CPF</th>
              <th className="p-3 border">Nome</th>
              <th className="p-3 border">Disciplina</th>
              <th className="p-3 border">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.length > 0 ? (
              listaFiltrada.map((prof) => (
                <tr key={prof.cpf} className="hover:bg-blue-50">
                  <td className="p-3 border">{prof.cpf}</td>
                  <td className="p-3 border">{prof.nome}</td>
                  <td className="p-3 border">{prof.disciplina}</td>
                  <td className="p-3 border flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(prof)}
                      className="text-green-600 hover:text-green-800"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(prof)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500">
                  Nenhum professor encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
