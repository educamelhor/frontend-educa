// src/features/secretaria/professores/ListaProfessores.jsx
// ============================================================================
// Lista de Professores (Secretaria)
// - Exibe, filtra, inclui, edita e exclui professores.
// - Agora inclui a coluna e a busca por **Turno**.
// - Mantida a integração com ProfessorForm (o Turno já foi adicionado no form).
// ============================================================================

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';
import Modal from '../../../components/ui/Modal';
import ProfessorForm from '../professores/ProfessorForm';
import { PencilSquareIcon } from "@heroicons/react/24/solid";

// ─────────────────────────────────────────────────────────────
export default function ListaProfessores() {
  // Estados principais
  const [professores, setProfessores] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toDelete, setToDelete]         = useState(null);
  const [editingProfessor, setEditingProfessor] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // Carrega professores e disciplinas
  useEffect(() => {
    async function loadAll() {
      const [pRes, dRes] = await Promise.all([
        api.get('/api/professores'),
        api.get('/api/disciplinas'),
      ]);
      setProfessores(pRes.data);
      setDisciplinas(dRes.data);
      setLoading(false);
    }
    loadAll();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Utilidades para filtro
  const normalize = (str = "") =>
    str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const term = normalize(search);

  // (Reservado) Distância de Levenshtein – útil em validações futuras
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  // ─────────────────────────────────────────────────────────────
  // Salvar (incluir/editar)
  async function handleSaveProfessor(dados) {
    setLoading(true);
    try {
      // Evita duplicidade exata de CPF + DISCIPLINA
      const conflito = professores.find((p) => {
        if (dados.id && p.id === dados.id) return false; // ignora o próprio
        return p.cpf === dados.cpf && String(p.disciplina_id) === String(dados.disciplina_id);
      });

      if (conflito) {
        alert("⚠️ Já existe um professor com este CPF para essa disciplina.");
        setLoading(false);
        return false;
      }

      if (dados.id) {
        await api.put(`/api/professores/${dados.id}`, dados);
      } else {
        await api.post('/api/professores', dados);
      }

      const { data } = await api.get('/api/professores');
      setProfessores(data);

      setSuccessMessage('✅ Professor cadastrado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setIsFormOpen(false);
      return true;
    } catch (err) {
      console.error("Erro ao salvar professor:", err.response?.data || err.message);
      alert("Erro ao salvar. Tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Exclusão
  function confirmDelete(prof) {
    setToDelete(prof);
  }

  async function handleDeleteConfirmed() {
    if (!toDelete) return;
    setLoading(true);
    try {
      await api.delete(`/api/professores/${toDelete.id}`);
      const { data } = await api.get('/api/professores');
      setProfessores(data);

      setSuccessMessage('✅ Professor excluído com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      alert('Erro ao excluir professor.');
    } finally {
      setLoading(false);
      setToDelete(null);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Cadastro de Professores</h2>

      {loading && <p className="text-gray-600">Carregando professores...</p>}

      {!loading && (
        <>
          {/* Ações superiores: Adicionar + Busca */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Adicionar Professor
            </button>

            <input
              type="text"
              placeholder="🔍 Filtrar por CPF, Nome, Turno ou Disciplina"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded p-2 w-80 placeholder-gray-500"
            />
          </div>

          {/* Banner de sucesso */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              {successMessage}
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse mt-4">
              <thead className="bg-blue-100">
                <tr>
                  <th className="p-2 border text-center font-medium text-blue-900">CPF</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Nome</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Data Nasc.</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Sexo</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Turno</th>{/* ← NOVO */}
                  <th className="p-2 border text-center font-medium text-blue-900">Disciplina</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Aulas</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {professores
                  .filter(p => {
                    const cpfMatch   = (p.cpf || "").includes(search);
                    const nomeMatch  = normalize(p.nome).includes(term);
                    const turnoMatch = normalize(p.turno || "").includes(term); // ← NOVO
                    const discObj    = disciplinas.find(d => d.id === p.disciplina_id);
                    const discName   = discObj ? (discObj.disciplina ?? discObj.nome) : '';
                    const discMatch  = normalize(discName).includes(term);
                    return cpfMatch || nomeMatch || turnoMatch || discMatch;
                  })
                  .map(p => {
                    const disc = disciplinas.find(d => d.id === p.disciplina_id);
                    const discLabel = disc ? (disc.disciplina ?? disc.nome) : '—';
                    return (
                      <tr key={p.id} className="hover:bg-blue-50">
                        <td className="p-2 border text-center">{p.cpf}</td>
                        <td className="p-2 border uppercase">{p.nome}</td>
                        <td className="p-2 border text-center">
                          {p.data_nascimento
                            ? new Date(p.data_nascimento).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="p-2 border text-center">{p.sexo}</td>
                        <td className="p-2 border text-center uppercase">{(p.turno || '—')}</td>{/* ← NOVO */}
                        <td className="p-2 border text-center uppercase">{discLabel}</td>
                        <td className="p-2 border text-center">{p.aulas}</td>
                        <td className="p-2 border text-center space-x-2">
                          {/* Editar */}
                          <button
                            onClick={() => {
                              setEditingProfessor(p);
                              setIsFormOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => confirmDelete(p)}
                            className="inline p-1 hover:bg-red-100 rounded"
                          >
                            <TrashIcon className="h-5 w-5 text-red-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal: Formulário */}
      <Modal open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <ProfessorForm
          open={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProfessor(null);
          }}
          onSubmit={handleSaveProfessor}
          professor={editingProfessor}
        />
      </Modal>

      {/* Modal: Confirmação de exclusão */}
      <Modal open={!!toDelete} onClose={() => setToDelete(null)}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Confirmação</h3>
          <p>
            Tem certeza que deseja excluir o professor{" "}
            <strong>{toDelete?.nome}</strong> (CPF: {toDelete?.cpf}) na
            disciplina <strong>{toDelete?.disciplina_nome}</strong>?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setToDelete(null)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Não
            </button>
            <button
              onClick={handleDeleteConfirmed}
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
