// src/features/secretaria/turmas/ListaTurmas.jsx

import React, { useState, useEffect } from "react";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/solid";
import Modal from "../../../components/ui/Modal";
import TurmaForm from "./TurmaForm";
import api from "../../../services/api";

export default function ListaTurmas() {
  // Estados principais
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setFormOpen] = useState(false);
  const [toDeleteTurma, setToDeleteTurma] = useState(null);
  const [editingTurma, setEditingTurma] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Carrega lista de turmas ao iniciar
  useEffect(() => {
    async function load() {
      const { data } = await api.get("/api/turmas");
      setTurmas(data);
      setLoading(false);
    }
    load();
  }, []);

  // Função para normalizar texto (para o filtro)
  const normalize = (str = "") =>
    str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const term = normalize(search);

  // Salva nova turma ou edita existente
  async function handleSaveTurma(dados) {
    setLoading(true);
    try {
      const normalizeLocal = (str = "") =>
        str
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase()
          .trim();

      const novaTurma = normalizeLocal(dados.nome);
      const novoTurno = normalizeLocal(dados.turno);
      const novoAno = String(dados.ano);
      const novaEscolaId = String(dados.escola_id);

      // 🔎 Verifica duplicidade considerando escola + nome + turno + ano
      const duplicada = turmas.find((t) => {
        if (dados.id && t.id === dados.id) return false;

        return (
          String(t.escola_id) === novaEscolaId &&
          normalizeLocal(t.turma) === novaTurma &&
          normalizeLocal(t.turno) === novoTurno &&
          String(t.ano) === novoAno
        );
      });

      if (duplicada) {
        alert(
          "⚠️ Já existe uma turma cadastrada com a mesma escola, nome, turno e ano."
        );
        return false;
      }

      // Decide entre criação e atualização
      if (dados.id) {
        await api.put(`/api/turmas/${dados.id}`, dados);
      } else {
        await api.post("/api/turmas", dados);
      }

      // Recarrega lista
      const { data } = await api.get("/api/turmas");
      setTurmas(data);
      setFormOpen(false);
      setSuccessMessage("✅ Turma salva com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);

      return true;
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar a turma. Verifique os dados e tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Confirmação para exclusão
  function confirmDeleteTurma(turma) {
    setToDeleteTurma(turma);
  }

  // Exclusão confirmada
  async function handleDeleteTurmaConfirmed() {
    if (!toDeleteTurma) return;
    setLoading(true);
    try {
      await api.delete(`/api/turmas/${toDeleteTurma.id}`);
      const { data } = await api.get("/api/turmas");
      setTurmas(data);
      setSuccessMessage("✅ Turma excluída com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao excluir turma.");
    } finally {
      setLoading(false);
      setToDeleteTurma(null);
    }
  }

  if (loading) return <p className="p-6">Carregando turmas...</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Cadastro de Turmas</h2>

      {/* Mensagem de sucesso */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          {successMessage}
        </div>
      )}

      {/* Botão para abrir formulário */}
      <button
        onClick={() => {
          setEditingTurma(null);
          setFormOpen(true);
        }}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + Adicionar Turma
      </button>

      {/* Campo de busca */}
      <input
        type="text"
        placeholder="🔍 Filtrar por Turma, Etapa, Ano, Turno ou Série"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="float-right mb-4 px-3 py-2 border rounded w-64"
      />

      {/* Tabela */}
      <div className="clear-right overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 border text-center">Turma</th>
              <th className="p-2 border text-center">Etapa</th>
              <th className="p-2 border text-center">Ano</th>
              <th className="p-2 border text-center">Turno</th>
              <th className="p-2 border text-center">Série</th>
              <th className="p-2 border text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas
              .filter(
                (t) =>
                  normalize(t.turma).includes(term) ||
                  normalize(t.etapa || "").includes(term) ||
                  normalize(String(t.ano) || "").includes(term) ||
                  normalize(t.turno).includes(term) ||
                  normalize(t.serie).includes(term)
              )
              .map((t) => (
                <tr key={t.id} className="hover:bg-blue-50">
                  <td className="p-2 border text-center uppercase">
                    {t.turma}
                  </td>
                  <td className="p-2 border text-center uppercase">
                    {t.etapa}
                  </td>
                  <td className="p-2 border text-center uppercase">
                    {t.ano}
                  </td>
                  <td className="p-2 border text-center uppercase">
                    {t.turno}
                  </td>
                  <td className="p-2 border text-center uppercase">
                    {t.serie}
                  </td>
                  <td className="p-2 border text-center space-x-2">
                    {/* Botão editar */}
                    <button
                      onClick={() => {
                        setEditingTurma({
                          ...t,
                          nome: t.turma,
                        });
                        setFormOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>

                    {/* Botão excluir */}
                    <button
                      onClick={() => confirmDeleteTurma(t)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal de formulário */}
      <Modal open={isFormOpen} onClose={() => setFormOpen(false)}>
        <TurmaForm
          open={isFormOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingTurma(null);
          }}
          onSubmit={handleSaveTurma}
          turma={editingTurma}
        />
      </Modal>

      {/* Modal de exclusão */}
      <Modal open={!!toDeleteTurma} onClose={() => setToDeleteTurma(null)}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Confirmação</h3>
          <p>
            Tem certeza que deseja excluir a turma{" "}
            <strong>{toDeleteTurma?.turma}</strong>?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setToDeleteTurma(null)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Não
            </button>
            <button
              onClick={handleDeleteTurmaConfirmed}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sim
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
