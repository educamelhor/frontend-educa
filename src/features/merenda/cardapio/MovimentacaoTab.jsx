import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function MovimentacaoTab() {
  const [saidas, setSaidas] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal form state
  const [selectedLoteId, setSelectedLoteId] = useState("");
  const [tipoMovimentacao, setTipoMovimentacao] = useState("Transferência");
  const [quantidadeUnidades, setQuantidadeUnidades] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    fetchSaidas();
    fetchEstoque();
  }, []);

  const fetchSaidas = async () => {
    try {
      const { data } = await api.get("/api/merenda/saidas");
      setSaidas(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar histórico de movimentação.");
    }
  };

  const fetchEstoque = async () => {
    try {
      const { data } = await api.get("/api/merenda/estoque");
      setEstoque(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar estoque.");
    }
  };

  // Identificador único temporário para o select (mistura id do produto com lote e validade)
  const getEstoqueKey = (item) => {
    return `${item.produto_id}||${item.lote || ''}||${item.validade || ''}`;
  };

  const handleOpenModal = () => {
    setSelectedLoteId("");
    setTipoMovimentacao("Transferência");
    setQuantidadeUnidades("");
    setObservacao("");
    fetchEstoque(); // Atualiza o saldo antes de abrir o modal
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente estornar esta movimentação? O saldo será devolvido ao estoque.")) return;
    try {
      await api.delete(`/api/merenda/saidas/${id}`);
      toast.success("Movimentação estornada com sucesso.");
      fetchSaidas();
      fetchEstoque();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao estornar movimentação.");
    }
  };

  const selectedEstoqueItem = estoque.find(e => getEstoqueKey(e) === selectedLoteId);

  const calcularPeso = (qtd) => {
    if (!qtd || !selectedEstoqueItem) return 0;
    // Extrai a gramatura. Ex: "5,00", "5kg", "5.5"
    let gramatura = 1;
    if (selectedEstoqueItem.gramatura) {
      const parsed = parseFloat(selectedEstoqueItem.gramatura.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(parsed)) gramatura = parsed;
    }
    return (parseFloat(qtd) * gramatura).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEstoqueItem) {
      toast.error("Selecione um item do estoque.");
      return;
    }

    const qtdNum = parseFloat(quantidadeUnidades);
    if (!qtdNum || qtdNum <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    if (qtdNum > Number(selectedEstoqueItem.saldo_unidades)) {
      toast.error(`Quantidade não permitida! O saldo disponível é de apenas ${selectedEstoqueItem.saldo_unidades} unidades.`);
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/merenda/saidas", {
        produto_id: selectedEstoqueItem.produto_id,
        lote: selectedEstoqueItem.lote,
        validade: selectedEstoqueItem.validade,
        quantidade_unidades: qtdNum,
        peso_kg: calcularPeso(qtdNum),
        tipo_movimentacao: tipoMovimentacao,
        observacao: observacao
      });
      toast.success("Movimentação registrada com sucesso!");
      handleCloseModal();
      fetchSaidas();
      fetchEstoque();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Erro ao registrar movimentação.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Movimentação de Gêneros</h2>
          <p className="text-sm text-gray-500">Registre transferências para outras escolas ou descarte de itens impróprios.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Registrar Movimentação
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/90 border-b-2 border-gray-200 text-sm text-gray-600 shadow-sm">
                <th className="py-4 px-6 font-semibold tracking-wide">DATA</th>
                <th className="py-4 px-6 font-semibold tracking-wide">PRODUTO</th>
                <th className="py-4 px-6 font-semibold tracking-wide">TIPO MOV.</th>
                <th className="py-4 px-6 font-semibold tracking-wide">UNIDADES</th>
                <th className="py-4 px-6 font-semibold tracking-wide">PESO TOTAL <span className="text-xs opacity-70 font-normal">(KG)</span></th>
                <th className="py-4 px-6 font-semibold tracking-wide">LOTE / VAL.</th>
                <th className="py-4 px-6 font-semibold tracking-wide">OBSERVAÇÃO</th>
                <th className="py-4 px-6 text-center font-semibold tracking-wide">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {saidas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    Nenhuma movimentação registrada até o momento.
                  </td>
                </tr>
              ) : (
                saidas.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-800">{item.produto}</div>
                      <div className="text-xs text-gray-500">{item.marca}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                        item.tipo_movimentacao === 'Transferência' 
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {item.tipo_movimentacao}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-700">-{Number(item.quantidade_unidades)}</td>
                    <td className="py-4 px-6 font-semibold text-red-500">
                      -{Number(item.peso_kg).toLocaleString('pt-BR')} kg
                    </td>
                    <td className="py-4 px-6">
                      {item.lote ? (
                        <div className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded border border-gray-200 inline-block mb-1">
                          {item.lote}
                        </div>
                      ) : <span className="text-gray-400">-</span>}
                      <div className="text-xs text-gray-500 mt-1">
                        {item.validade ? (() => {
                          const [yyyy, mm, dd] = String(item.validade).split('T')[0].split('-');
                          return `${dd}/${mm}/${yyyy}`;
                        })() : ''}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600 text-sm max-w-xs truncate" title={item.observacao}>
                      {item.observacao || '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Estornar Movimentação"
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
      </div>

      {/* Modal Inteligente de Movimentação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">Registrar Movimentação</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Item em Estoque</label>
                <select
                  required
                  value={selectedLoteId}
                  onChange={(e) => setSelectedLoteId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                >
                  <option value="">Selecione um item com saldo...</option>
                  {estoque.map(e => {
                    let text = `${e.produto} - ${e.marca}`;
                    if (e.lote) text += ` | Lote: ${e.lote}`;
                    text += ` | Saldo: ${Number(e.saldo_unidades)} und`;
                    return (
                      <option key={getEstoqueKey(e)} value={getEstoqueKey(e)}>
                        {text}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedLoteId && (
                <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 mb-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Movimentação</label>
                      <select
                        required
                        value={tipoMovimentacao}
                        onChange={(e) => setTipoMovimentacao(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-amber-400 text-sm"
                      >
                        <option value="Transferência">Transferência para outra unidade</option>
                        <option value="Gênero Impróprio">Gênero Impróprio / Descarte</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Qtd a Retirar (Unidades)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max={selectedEstoqueItem ? Number(selectedEstoqueItem.saldo_unidades) : ""}
                        step="0.01"
                        value={quantidadeUnidades}
                        onChange={(e) => setQuantidadeUnidades(e.target.value)}
                        placeholder={`Máx: ${selectedEstoqueItem ? Number(selectedEstoqueItem.saldo_unidades) : ""}`}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-amber-50/30"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Peso (KG)</label>
                      <div className="w-full px-3 py-2 bg-gray-200/50 border border-transparent rounded-lg text-gray-700 font-semibold cursor-not-allowed">
                        {calcularPeso(quantidadeUnidades)}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Observação (Destino, Motivo, etc.)</label>
                    <textarea
                      rows="2"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Ex: Enviado para a escola X..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-amber-400 text-sm resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedLoteId}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Confirmar Movimentação"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
