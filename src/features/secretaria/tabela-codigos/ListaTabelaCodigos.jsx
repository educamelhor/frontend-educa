// src/features/secretaria/tabela-codigos/ListaTabelaCodigos.jsx
import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";

export default function ListaTabelaCodigos({ searchTerm, reload, onEditar }) {
  // ────────────────────────────────────────────────
  // Estado principal da lista
  // ────────────────────────────────────────────────
  const [codigos, setCodigos] = useState([]);

  // ────────────────────────────────────────────────
  // Busca os códigos do backend na montagem do componente
  // ────────────────────────────────────────────────
  useEffect(() => {
    fetchCodigos();
  }, [reload]);

  const fetchCodigos = async () => {
    try {
      const res = await api.get("/api/codigos");
      setCodigos(res.data || []);
    } catch (err) {
      console.error("Erro ao buscar códigos:", err);
      alert("Erro ao carregar códigos.");
    }
  };

  // ────────────────────────────────────────────────
  // Função para excluir um código
  // ────────────────────────────────────────────────
  const handleExcluir = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este código?")) return;
    try {
      await api.delete(`/api/codigos/${id}`);
      setCodigos((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Erro ao excluir código:", err);
      alert("Erro ao excluir código.");
    }
  };

  // ────────────────────────────────────────────────
  // Função para editar (exemplo: apenas alerta, pode abrir modal futuramente)
  // ────────────────────────────────────────────────
  const handleEditar = (codigo) => {
    alert(`Função de editar chamada para o código: ${codigo.codigo}`);
    // Aqui podemos abrir o modal de edição reutilizando o mesmo formulário
  };

  // ────────────────────────────────────────────────
  // Filtragem simples baseada no termo de busca
  // ────────────────────────────────────────────────
  const filtrados = codigos.filter(
    (c) =>
      c.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.disciplina?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ────────────────────────────────────────────────
  // Renderização da tabela
  // ────────────────────────────────────────────────
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm text-gray-700">
        <thead className="bg-blue-100 text-gray-900">
          <tr>
            <th className="px-4 py-2 border">Código</th>
            <th className="px-4 py-2 border">Tipo</th>
            <th className="px-4 py-2 border">Disciplina</th>
            <th className="px-4 py-2 border">Etapa</th>
            <th className="px-4 py-2 border">Turno</th>
            <th className="px-4 py-2 border">Sequencial</th>
            <th className="px-4 py-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-4 text-gray-500">
                Nenhum código encontrado.
              </td>
            </tr>
          ) : (
            filtrados.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 border">{c.codigo}</td>
                <td className="px-4 py-2 border">{c.tipo}</td>
                <td className="px-4 py-2 border">{c.disciplina}</td>
                <td className="px-4 py-2 border">{c.etapa}</td>
                <td className="px-4 py-2 border">{c.turno}</td>
                <td className="px-4 py-2 border">{c.sequencial}</td>
                <td className="px-4 py-2 border flex gap-2 justify-center">
                  {/* Botão Excluir */}
                  <button
                    onClick={() => handleExcluir(c.id)}
                    className="text-red-600 hover:text-red-800 transition"
                    title="Excluir"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
