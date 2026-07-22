import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function ChegadaTab() {
  const [entradas, setEntradas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Modal form state
  const [selectedProdutoId, setSelectedProdutoId] = useState("");
  const [selectedOrigem, setSelectedOrigem] = useState("Governo (SEEDF)");
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
    setEditingId(null);
    setSelectedProdutoId("");
    setSelectedOrigem("Governo (SEEDF)");
    setLotes([{ quantidade_unidades: "", lote: "", validade: "" }]);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setSelectedProdutoId(item.produto_id.toString());
    setSelectedOrigem(item.origem || "Governo (SEEDF)");
    
    // Formata a data para yyyy-mm-dd
    let valFormatada = "";
    if (item.validade) {
      valFormatada = String(item.validade).split('T')[0];
    }

    setLotes([{ 
      quantidade_unidades: item.quantidade_unidades, 
      lote: item.lote || "", 
      validade: valFormatada 
    }]);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta entrada? O saldo do produto será afetado.")) return;
    try {
      await api.delete(`/api/merenda/entradas/${id}`);
      toast.success("Entrada excluída com sucesso.");
      fetchEntradas();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir entrada.");
    }
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
    
    const gramaturaStr = prod.gramatura.toLowerCase();
    const isGramsOrMl = (gramaturaStr.includes('g') && !gramaturaStr.includes('kg')) || gramaturaStr.includes('ml');
    
    // Tenta extrair número. Ex: "5,00", "5kg", "5.5"
    const parsed = parseFloat(prod.gramatura.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(parsed)) return 1;
    
    return isGramsOrMl ? parsed / 1000 : parsed;
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
      if (editingId) {
        // Se está editando, manda PUT para a primeira e única linha
        const editPayload = { ...payloadLotes[0], origem: selectedOrigem };
        await api.put(`/api/merenda/entradas/${editingId}`, editPayload);
        toast.success("Entrada atualizada com sucesso!");
      } else {
        await api.post("/api/merenda/entradas", {
          produto_id: selectedProdutoId,
          origem: selectedOrigem,
          lotes: payloadLotes
        });
        toast.success("Chegada registrada com sucesso!");
      }
      handleCloseModal();
      fetchEntradas();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Erro ao registrar chegada.");
    } finally {
      setSaving(false);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const entradasOrdenadas = [...entradas].sort((a, b) => {
    let valA = a[sortConfig.key] || "";
    let valB = b[sortConfig.key] || "";
    
    if (sortConfig.key === 'produto') {
      valA = (a.produto || "").toLowerCase();
      valB = (b.produto || "").toLowerCase();
      const compare = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? compare : -compare;
    }
    
    // Fallback normal para datas (como created_at, validade) e outros
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

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
              <th 
                className="py-4 px-6 font-semibold tracking-wide cursor-pointer hover:bg-gray-200/50 transition-colors"
                onClick={() => requestSort('created_at')}
              >
                <div className="flex items-center gap-2 select-none">
                  DATA
                  {sortConfig.key === 'created_at' && (
                    sortConfig.direction === 'asc' ? (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )
                  )}
                </div>
              </th>
              <th 
                className="py-4 px-6 font-semibold tracking-wide cursor-pointer hover:bg-gray-200/50 transition-colors text-center"
                onClick={() => requestSort('produto')}
              >
                <div className="flex items-center justify-center gap-2 select-none">
                  PRODUTO
                  {sortConfig.key === 'produto' && (
                    sortConfig.direction === 'asc' ? (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )
                  )}
                </div>
              </th>
              <th className="py-4 px-6 font-semibold tracking-wide">ORIGEM</th>
              <th className="py-4 px-6 font-semibold tracking-wide">UNIDADES</th>
              <th className="py-4 px-6 font-semibold tracking-wide">PESO TOTAL <span className="text-xs opacity-70 font-normal">(KG)</span></th>
              <th className="py-4 px-6 font-semibold tracking-wide">LOTE</th>
              <th 
                className="py-4 px-6 font-semibold tracking-wide cursor-pointer hover:bg-gray-200/50 transition-colors"
                onClick={() => requestSort('validade')}
              >
                <div className="flex items-center gap-2 select-none">
                  VALIDADE
                  {sortConfig.key === 'validade' && (
                    sortConfig.direction === 'asc' ? (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )
                  )}
                </div>
              </th>
              <th className="py-4 px-6 text-center font-semibold tracking-wide">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entradasOrdenadas.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-gray-500">
                  Nenhuma entrada registrada até o momento.
                </td>
              </tr>
            ) : (
              entradasOrdenadas.map((item) => (
                <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-4 px-6 text-gray-600">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="font-medium text-gray-800">{item.produto}</div>
                    <div className="text-xs text-gray-500">{item.marca}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full border border-blue-100">
                      {item.origem || 'Governo (SEEDF)'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{Number(item.quantidade_unidades)}</td>
                  <td className="py-4 px-6 font-semibold text-emerald-600">
                    {Number(item.peso_kg).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
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
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar Entrada"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir Entrada"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Gênero Alimentício</label>
                  <select
                    required
                    value={selectedProdutoId}
                    onChange={(e) => setSelectedProdutoId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  >
                    <option value="">Selecione um produto...</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.produto} {p.marca ? `- ${p.marca}` : ''} {p.gramatura ? `(${p.gramatura})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Origem</label>
                  <select
                    required
                    value={selectedOrigem}
                    onChange={(e) => setSelectedOrigem(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  >
                    <option value="Governo (SEEDF)">Governo (SEEDF)</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Doação">Doação</option>
                    <option value="Compra Direta">Compra Direta</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              {selectedProdutoId && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Lotes e Validades recebidos</h3>
                    {!editingId && (
                      <button
                        type="button"
                        onClick={addLote}
                        className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Adicionar lote
                      </button>
                    )}
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
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Lote</label>
                        <input
                          type="text"
                          required
                          value={loteItem.lote}
                          onChange={(e) => handleLoteChange(index, "lote", e.target.value)}
                          placeholder="Ex: L123"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-amber-400 font-mono text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Validade</label>
                        <input
                          type="date"
                          required
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
                      {!editingId && lotes.length > 1 && (
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
