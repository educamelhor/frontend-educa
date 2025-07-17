import { useState, useEffect } from "react";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/solid";
import Modal from "../../../components/ui/Modal";
import TurmaForm from "./TurmaForm";
import api from "../../../services/api";

export default function ListaTurmas() {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setFormOpen] = useState(false);
  const [toDeleteTurma, setToDeleteTurma] = useState(null);
  const [editingTurma, setEditingTurma] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await api.get("/api/turmas");
      setTurmas(data);
      setLoading(false);
    }
    load();
  }, []);

  const normalize = (str = "") =>
    str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const term = normalize(search);

  async function handleSaveTurma(dados) {
    setLoading(true);
    try {
      const normalize = (str = "") =>
        str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

      const novaTurma = normalize(dados.turma);
      const novoTurno = normalize(dados.turno);
      const novaEscolaId = String(dados.escola_id);

      const duplicada = turmas.find((t) => {
        if (dados.id && t.id === dados.id) return false;
        return (
          String(t.escola_id) === novaEscolaId &&
          normalize(t.turma) === novaTurma &&
          normalize(t.turno) === novoTurno
        );
      });

      if (duplicada) {
        alert("⚠️ Já existe uma turma com esta escola, nome e turno.");
        return;
      }

      if (dados.id) {
        await api.put(`/api/turmas/${dados.id}`, dados);
      } else {
        await api.post("/api/turmas", dados);
      }

      const { data } = await api.get("/api/turmas");
      setTurmas(data);
      setFormOpen(false);
      setSuccessMessage("✅ Turma salva com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar turma.");
    } finally {
      setLoading(false);
    }
  }

  function confirmDeleteTurma(turma) {
    setToDeleteTurma(turma);
  }

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
      alert("Erro ao excluir turma.");
    } finally {
      setLoading(false);
      setToDeleteTurma(null);
    }
  }

  if (loading) return <p className="p-6">Carregando turmas...</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Cadastro de Turmas</h2>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          {successMessage}
        </div>
      )}

      <button
        onClick={() => {
          setEditingTurma(null); // <-- ADICIONE ISSO!
          setFormOpen(true);
        }}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + Adicionar Turma
      </button>

      <input
        type="text"
        placeholder="🔍 Filtrar por Escola, Turma, Turno ou Série"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="float-right mb-4 px-3 py-2 border rounded w-64"
      />

      <div className="clear-right overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 border text-center">Escola</th>
              <th className="p-2 border text-center">Turma</th>
              <th className="p-2 border text-center">Turno</th>
              <th className="p-2 border text-center">Série</th>
              <th className="p-2 border text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas
              .filter(
                (t) =>
                  normalize(t.escola).includes(term) ||
                  normalize(t.turma).includes(term) ||
                  normalize(t.turno).includes(term) ||
                  normalize(t.serie).includes(term)
              )
              .map((t) => (
                <tr key={t.id} className="hover:bg-blue-50">
                  <td className="p-2 border text-center uppercase">{t.escola}</td>
                  <td className="p-2 border text-center uppercase">{t.turma}</td>
                  <td className="p-2 border text-center uppercase">{t.turno}</td>
                  <td className="p-2 border text-center uppercase">{t.serie}</td>
                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingTurma(t);
                        setFormOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
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

      <Modal open={!!toDeleteTurma} onClose={() => setToDeleteTurma(null)}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Confirmação</h3>
          <p>
            Tem certeza que deseja excluir a turma{" "}
            <strong>{toDeleteTurma?.turma}</strong> da escola{" "}
            <strong>{toDeleteTurma?.escola}</strong>?
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