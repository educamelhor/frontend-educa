import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';
import Modal from '../../../components/ui/Modal';
import DisciplinaForm from './DisciplinaForm';
import { PencilSquareIcon } from "@heroicons/react/24/solid";

// ─────────────────────────────────────────────────────────────
export default function ListaDisciplinas() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [isFormOpen, setFormOpen]     = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toDeleteDisciplina, setToDeleteDisciplina] = useState(null);
  const [editingDisciplina, setEditingDisciplina] = useState(null);

// ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await api.get('/api/disciplinas');
      setDisciplinas(data);
      setLoading(false);
    }
    load();
  }, []);


// ─────────────────────────────────────────────────────────────
  const normalize = (str = '') =>
    str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const term = normalize(search);

// ─────────────────────────────────────────────────────────────
  
async function handleSaveDisciplina(dados) {
  setLoading(true);
  try {
    const normalize = (str = "") =>
      str
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[\s_\-]/g, "");

    const nomeOriginal = dados.nome ?? dados.disciplina ?? "";
    const nomeNovo = normalize(nomeOriginal);

    function levenshtein(a, b) {
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1];
          } else {
            dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
          }
        }
      }
      return dp[m][n];
    }

    for (const d of disciplinas) {
      // ⚠️ IGNORA a própria disciplina ao editar
      if (dados.id && d.id === dados.id) continue;

      const nomeExistente = normalize(d.nome ?? d.disciplina ?? "");

      // 1. Nome exatamente igual → bloqueia
      if (nomeNovo === nomeExistente) {
        alert(`⚠️ Já existe uma disciplina com esse nome ("${d.nome || d.disciplina}").\nPara corrigir, você deve excluir a duplicada antes de editar.`);
        return;
      }

      // 2. Sequência numérica (ex: artes → artes-2)
      const baseNovo = nomeNovo.replace(/\d+$/, "");
      const baseExistente = nomeExistente.replace(/\d+$/, "");
      const regexNumeroFinal = /\d+$/;

      if (baseNovo === baseExistente && regexNumeroFinal.test(nomeNovo)) {
        const numeroNovo = nomeNovo.match(/\d+$/)?.[0];
        const numeroExistente = nomeExistente.match(/\d+$/)?.[0];

        if (numeroNovo && numeroNovo === numeroExistente) {
          alert(`⚠️ Já existe uma disciplina semelhante com o número ${numeroNovo}. Altere o número para evitar duplicidade.`);
          return;
        }

        const confirmar = confirm(
          `⚠️ Já existe a disciplina "${d.nome || d.disciplina}".\nDeseja realmente criar "${nomeOriginal}" como uma variação numerada?`
        );
        if (!confirmar) return;

        continue; // pula o restante das verificações (incluindo Levenshtein)
      }

      // 3. Erros de digitação leves
      const distancia = levenshtein(nomeNovo, nomeExistente);
      if (distancia > 0 && distancia <= 2) {
        alert(`⚠️ Nome muito semelhante ao já existente: "${d.nome || d.disciplina}".\nCorrija o nome antes de salvar.`);
        return;
      }
    }

    // Se passou em todas as verificações:
    if (dados.id) {
      await api.put(`/api/disciplinas/${dados.id}`, dados);
    } else {
      await api.post("/api/disciplinas", dados);
    }

    const { data } = await api.get("/api/disciplinas");
    setDisciplinas(data);
    setSuccessMessage("✅ Disciplina salva com sucesso!");
    setTimeout(() => setSuccessMessage(""), 3000);
    setFormOpen(false);
    setEditingDisciplina(null);
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar disciplina.");
  } finally {
    setLoading(false);
  }
}







// ─────────────────────────────────────────────────────────────
  async function handleDeleteDisciplinaConfirmed() {
  if (!toDeleteDisciplina) return;
  setLoading(true);
  try {
    await api.delete(`/api/disciplinas/${toDeleteDisciplina.id}`);
    const { data } = await api.get("/api/disciplinas");
    setDisciplinas(data);
    setSuccessMessage("✅ Disciplina excluída com sucesso!");
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir disciplina.");
  } finally {
    setLoading(false);
    setToDeleteDisciplina(null);
  }
}



// ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Cadastro de Disciplinas</h2>

      {loading && <p className="text-gray-600">Carregando disciplinas...</p>}

      {!loading && (
        <>
          {/* Botão e campo de busca */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Adicionar Disciplina
            </button>

            <input
              type="text"
              placeholder="🔍 Filtrar por Disciplina"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded p-2 w-80 placeholder-gray-500"
            />
          </div>



          {/* BANNER DE SUCESSO */}
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
                  <th className="p-2 border text-center font-medium text-blue-900">Disciplina</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Carga</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {disciplinas
                  .filter(d => normalize(d.disciplina).includes(term))
                  .map(d => (
                    <tr key={d.id} className="hover:bg-blue-50">
                      <td className="p-2 border text-center uppercase">{d.disciplina}</td>
                      <td className="p-2 border text-center">{d.carga}</td>
                      <td className="p-2 border text-center space-x-2">





                        <button
                          onClick={() => {
                            setEditingDisciplina(d);
                            setFormOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>






                        <button
                          onClick={() => setToDeleteDisciplina(d)}
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
        </>
      )}

      {/* Modal de cadastro */}
      <Modal open={isFormOpen} onClose={() => {
        setFormOpen(false);
        setEditingDisciplina(null);
      }}>
        <DisciplinaForm
          open={isFormOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingDisciplina(null);
          }}
          onSubmit={handleSaveDisciplina}
          disciplina={editingDisciplina}
        />
      </Modal>


     

      <Modal open={!!toDeleteDisciplina} onClose={() => setToDeleteDisciplina(null)}>
  <div className="p-6 space-y-4">
    <h3 className="text-lg font-semibold">Confirmação</h3>
    <p>
      Tem certeza que deseja excluir a disciplina{" "}
      <strong>{toDeleteDisciplina?.disciplina}</strong>?
    </p>
    <div className="flex justify-end space-x-2">
      <button
        onClick={() => setToDeleteDisciplina(null)}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Não
      </button>
      <button
        onClick={handleDeleteDisciplinaConfirmed}
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