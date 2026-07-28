import React, { useState, useEffect } from "react";
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  XMarkIcon 
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../../services/api";

export default function DistribuicaoTab() {
  const [distribuicoes, setDistribuicoes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const fetchDistribuicoes = async () => {
    try {
      const { data } = await api.get("/api/merenda/distribuicoes");
      setDistribuicoes(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar distribuições.");
    }
  };

  useEffect(() => {
    fetchDistribuicoes();
  }, []);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setDataInicio(item.data_inicio ? item.data_inicio.split('T')[0] : "");
      setDataFim(item.data_fim ? item.data_fim.split('T')[0] : "");
    } else {
      setEditingId(null);
      setDataInicio("");
      setDataFim("");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setDataInicio("");
    setDataFim("");
  };

  const handleSave = async () => {
    if (!dataInicio || !dataFim) {
      toast.error("Preencha as datas de início e fim.");
      return;
    }
    if (dataInicio > dataFim) {
      toast.error("A data de fim não pode ser menor que a de início.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/merenda/distribuicoes/${editingId}`, {
          data_inicio: dataInicio,
          data_fim: dataFim
        });
        toast.success("Distribuição atualizada com sucesso!");
      } else {
        await api.post("/api/merenda/distribuicoes", {
          data_inicio: dataInicio,
          data_fim: dataFim
        });
        toast.success("Distribuição criada com sucesso!");
      }
      handleCloseModal();
      fetchDistribuicoes();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Erro ao salvar distribuição.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta distribuição?")) return;
    
    try {
      await api.delete(`/api/merenda/distribuicoes/${id}`);
      toast.success("Distribuição excluída.");
      fetchDistribuicoes();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Erro ao excluir distribuição.");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Ciclos de Distribuição</h2>
          <p className="text-sm text-gray-500">Acompanhe as remessas governamentais de merenda escolar.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Adicionar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100/90 border-b-2 border-gray-200 text-sm text-gray-600 shadow-sm">
              <th className="py-4 px-6 font-semibold tracking-wide">DISTRIBUIÇÃO</th>
              <th className="py-4 px-6 font-semibold tracking-wide">INÍCIO</th>
              <th className="py-4 px-6 font-semibold tracking-wide">FINAL</th>
              <th className="py-4 px-6 text-center font-semibold tracking-wide">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {distribuicoes.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-12 text-center text-gray-500">
                  Nenhuma distribuição registrada até o momento.
                </td>
              </tr>
            ) : (
              distribuicoes.map((item, index) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-bold rounded-lg border border-blue-200 shadow-sm">
                      {index + 1}ª
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-700 font-medium">
                    {new Date(item.data_inicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </td>
                  <td className="py-4 px-6 text-gray-700 font-medium">
                    {new Date(item.data_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL ADICIONAR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? "Editar Distribuição" : "Registrar Distribuição"}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Fim</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
