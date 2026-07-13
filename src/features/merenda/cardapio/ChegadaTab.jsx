import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function ChegadaTab() {
  const [entradas, setEntradas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal form state
  const [selectedProdutoId, setSelectedProdutoId] = useState("");
  const [lotes, setLotes] = useState([{ quantidade_unidades: "", lote: "", validade: "" }]);

  useEffect(() => {
    fetchEntradas();
    fetchProdutos();
  }, []);

  const fetchEntradas = async () => {
    try {
      const { data } = await api.get("/api/merenda/entradas");
      setEntradas(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar histórico de chegadas.");
    }
  };

  const fetchProdutos = async () => {
    try {
      const { data } = await api.get("/api/merenda/produtos");
      setProdutos(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar produtos.");
    }
  };

  // Funções de manipulação do modal
  const handleOpenModal = () => {
    setSelectedProdutoId("");
    setLotes([{ quantidade_unidades: "", lote: "", validade: "" }]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleLoteChange = (index, field, value) => {
    const newLotes = [...lotes];
    newLotes[index][field] = value;
    setLotes(newLotes);
  };

  const addLote = () => {
    setLotes([...lotes, { quantidade_unidades: "", lote: "", validade: "" }]);
  };

  const removeLote = (index) => {
    const newLotes = lotes.filter((_, i) => i !== index);
    setLotes(newLotes);
  };

  // Cálculo automático do peso
  const getProdutoGramatura = (produtoId) => {
    const prod = produtos.find(p => p.id === parseInt(produtoId));
    if (!prod || !prod.gramatura) return 1;
    // Tenta extrair número. Ex: "5,00", "5kg", "5.5"
    const parsed = parseFloat(prod.gramatura.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(parsed) ? 1 : parsed;
  };

  const calcularPeso = (produtoId, qtd) => {
    if (!qtd) return 0;
    const gramatura = getProdutoGramatura(produtoId);
    return (parseFloat(qtd) * gramatura).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProdutoId) {
      toast.error("Selecione um produto.");
      return;
    }

    // Prepara payload com peso calculado
    const gramatura = getProdutoGramatura(selectedProdutoId);
    const payloadLotes = lotes.map(l => ({
      quantidade_unidades: parseFloat(l.quantidade_unidades) || 0,
      peso_kg: (parseFloat(l.quantidade_unidades || 0) * gramatura),
      lote: l.lote,
      validade: l.validade
    })).filter(l => l.quantidade_unidades > 0);

    if (payloadLotes.length === 0) {
      toast.error("Adicione pelo menos um lote com quantidade válida.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/merenda/entradas", {
        produto_id: selectedProdutoId,
        lotes: payloadLotes
      });
      toast.success("Chegada registrada com sucesso!");
      handleCloseModal();
      fetchEntradas();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Erro ao registrar chegada.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Histórico de Chegadas</h2>
          <p className="text-sm text-gray-500">Acompanhe a movimentação de entrada de gêneros no estoque.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Registrar chegada
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100/90 border-b-2 border-gray-200 text-sm text-gray-600 shadow-sm">
              <th className="py-4 px-6 font-semibold tracking-wide">DATA</th>
              <th className="py-4 px-6 font-semibold tracking-wide">PRODUTO</th>
              <th className="py-4 px-6 font-semibold tracking-wide">UNIDADES</th>
              <th className="py-4 px-6 font-semibold tracking-wide">PESO TOTAL <span className="text-xs opacity-70 font-normal">(KG)</span></th>
              <th className="py-4 px-6 font-semibold tracking-wide">LOTE</th>
              <th className="py-4 px-6 font-semibold tracking-wide">VALIDADE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entradas.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-gray-500">
                  Nenhuma entrada registrada até o momento.
                </td>
              </tr>
            ) : (
              entradas.map((item) => (
                <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-4 px-6 text-gray-600">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-800">{item.produto}</div>
                    <div className="text-xs text-gray-500">{item.marca}</div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{Number(item.quantidade_unidades)}</td>
                  <td className="py-4 px-6 font-semibold text-emerald-600">
                    {Number(item.peso_kg).toLocaleString('pt-BR')} kg
                  </td>
                  <td className="py-4 px-6">
                    {item.lote ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded border border-gray-200">
                        {item.lote}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    {item.validade ? (() => {
                      const [yyyy, mm, dd] = String(item.validade).split('T')[0].split('-');
                      return `${dd}/${mm}/${yyyy}`;
                    })() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Registro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">Registrar Chegada</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gênero Alimentício
                </label>
                <select
                  required
                  value={selectedProdutoId}
                  onChange={(e) => setSelectedProdutoId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                >
                  <option value="">-- Selecione o produto --</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.produto} - {p.marca} ({p.gramatura} kg)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProdutoId && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Lotes e Validades recebidos</h3>
                    <button
                      type="button"
                      onClick={addLote}
                      className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Adicionar lote
                    </button>
                  </div>

                  {lotes.map((loteItem, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl relative items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Qtd (Unidades)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={loteItem.quantidade_unidades}
                          onChange={(e) => handleLoteChange(index, "quantidade_unidades", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Lote (opcional)</label>
                        <input
                          type="text"
                          value={loteItem.lote}
                          onChange={(e) => handleLoteChange(index, "lote", e.target.value)}
                          placeholder="Ex: L123"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-amber-400 font-mono text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Validade (opcional)</label>
                        <input
                          type="date"
                          value={loteItem.validade}
                          onChange={(e) => handleLoteChange(index, "validade", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Peso (KG)</label>
                        <div className="w-full px-3 py-2 bg-gray-200/50 border border-transparent rounded-lg text-gray-700 font-semibold cursor-not-allowed">
                          {calcularPeso(selectedProdutoId, loteItem.quantidade_unidades)}
                        </div>
                      </div>
                      {lotes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLote(index)}
                          className="p-2 mb-1 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Confirmar Chegada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
