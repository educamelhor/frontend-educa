import React, { useState, useEffect } from "react";
import { PlusIcon, PencilSquareIcon, TrashIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import api from "../../../services/api";
import { Dialog } from "@headlessui/react";

export default function AjustesDisciplinar() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Modal Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const fetchTipos = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/tipos-ocorrencia");
      setTipos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao listar tipos de ocorrencia:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setMotivo("");
    setAtivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setMotivo(item.motivo);
    setAtivo(Boolean(item.ativo));
    setIsModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) return alert("O motivo não pode estar vazio.");
    
    setSalvando(true);
    try {
      if (editingId) {
        await api.put(`/api/tipos-ocorrencia/${editingId}`, { motivo: motivo.trim(), ativo });
      } else {
        await api.post("/api/tipos-ocorrencia", { motivo: motivo.trim(), ativo });
      }
      setIsModalOpen(false);
      fetchTipos();
    } catch (err) {
      console.error("Erro salvar:", err);
      alert(err?.response?.data?.error || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setExcluindo(true);
    try {
      await api.delete(`/api/tipos-ocorrencia/${deletingItem.id}`);
      setIsDeleteModalOpen(false);
      fetchTipos();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert(err?.response?.data?.error || "Erro ao excluir. Este item pode estar em uso.");
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ajustes Disciplinares</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os tipos de ocorrência listados na Secretaria e Pedagógico.</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all shadow-blue-600/20"
        >
          <PlusIcon className="w-5 h-5" />
          Novo Registro
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Recuperando registros...</div>
        ) : tipos.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Nenhum tipo de ocorrência cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Motivo da Ocorrência</th>
                  <th className="px-6 py-4 font-semibold w-32 border-l border-gray-100 text-center">Status</th>
                  <th className="px-6 py-4 font-semibold w-32 border-l border-gray-100 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tipos.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {t.motivo}
                    </td>
                    <td className="px-6 py-4 border-l border-gray-50 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        t.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {t.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-l border-gray-50 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          title="Editar"
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 focus:ring focus:ring-blue-100 rounded-lg transition"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button
                          title="Excluir"
                          onClick={() => openDeleteModal(t)}
                          className="p-1.5 text-red-500 hover:bg-red-50 focus:ring focus:ring-red-100 rounded-lg transition"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVO / EDITAR */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      >
        <Dialog.Panel className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
          <div className="px-6 py-5 border-b border-gray-100">
            <Dialog.Title className="text-lg font-bold text-gray-800">
              {editingId ? "Editar Registro" : "Novo Registro"}
            </Dialog.Title>
            <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1"
                aria-label="Voltar"
            >✕</button>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo / Descrição Curta</label>
              <input
                type="text"
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Uso indevido do celular"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
               <input
                 type="checkbox"
                 id="checkAtivo"
                 checked={ativo}
                 onChange={(e) => setAtivo(e.target.checked)}
                 className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
               />
               <label htmlFor="checkAtivo" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                 Registro Ativo (Visível na lista)
               </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </Dialog>


      {/* MODAL: EXCLUIR */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      >
        <Dialog.Panel className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Excluir Registro</Dialog.Title>
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja excluir <strong>"{deletingItem?.motivo}"</strong>? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {excluindo ? "Aguarde..." : "Sim, Excluir"}
              </button>
            </div>
        </Dialog.Panel>
      </Dialog>

    </div>
  );
}
