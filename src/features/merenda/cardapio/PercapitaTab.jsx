import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function PercapitaTab() {
  const [itens, setItens] = useState([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [selectedProdutoId, setSelectedProdutoId] = useState("");
  const [percapitaKg, setPercapitaKg] = useState("");

  useEffect(() => {
    fetchPercapita();
  }, []);

  const fetchPercapita = async () => {
    try {
      const { data } = await api.get("/api/merenda/percapita");
      setTotalAlunos(data.total_alunos || 0);
      setRefeicoesServidas(data.refeicoes_servidas !== undefined ? data.refeicoes_servidas : null);
      setItens(data.itens || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados de per capita.");
    }
  };

  const handleOpenModal = (produtoId = "", currentPercapita = "") => {
    setSelectedProdutoId(String(produtoId));
    setPercapitaKg(currentPercapita);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente remover a configuração de per capita deste produto?")) return;
    try {
      await api.delete(`/api/merenda/percapita/${id}`);
      toast.success("Per capita removida com sucesso.");
      fetchPercapita();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover per capita.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProdutoId) {
      toast.error("Selecione um produto.");
      return;
    }
    const percapitaNum = parseFloat(percapitaKg);
    if (!percapitaNum || percapitaNum <= 0) {
      toast.error("A per capita deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/merenda/percapita", {
        produto_id: selectedProdutoId,
        percapita_kg: percapitaNum,
      });
      toast.success("Per capita configurada com sucesso!");
      handleCloseModal();
      fetchPercapita();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar per capita.");
    } finally {
      setSaving(false);
    }
  };

  const [refeicoesServidas, setRefeicoesServidas] = useState(null);
  const [isServidasModalOpen, setIsServidasModalOpen] = useState(false);
  const [tempServidas, setTempServidas] = useState("");

  const servidasVal = refeicoesServidas !== null ? refeicoesServidas : totalAlunos;

  const handleOpenServidasModal = () => {
    setTempServidas(servidasVal.toString());
    setIsServidasModalOpen(true);
  };

  const handleSaveServidas = async (e) => {
    e.preventDefault();
    const val = parseInt(tempServidas, 10);
    if (isNaN(val) || val < 0) {
      toast.error("Insira um valor numérico válido.");
      return;
    }
    if (val > totalAlunos) {
      toast.error("A quantidade de refeições servidas não pode ser superior à quantidade de alunos ativos.");
      return;
    }

    try {
      await api.post("/api/merenda/config/refeicoes-servidas", {
        refeicoes_servidas: val
      });
      setRefeicoesServidas(val);
      setIsServidasModalOpen(false);
      toast.success("Quantidade de refeições servidas salva com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar a quantidade de refeições servidas.");
    }
  };

  const calcularRefeicoes = (saldoKg, percapita) => {
    if (!percapita || !servidasVal || servidasVal === 0) return 0;
    const kgPorRefeicao = parseFloat(percapita) * servidasVal;
    if (kgPorRefeicao === 0) return 0;
    return Math.floor(parseFloat(saldoKg) / kgPorRefeicao);
  };

  // Agrupar produtos únicos para o Select do Modal (para não mostrar arroz 3 vezes se tiver 3 lotes)
  const produtosUnicos = [];
  const mapProdutos = new Map();
  itens.forEach(item => {
    if (!mapProdutos.has(item.produto_id)) {
      mapProdutos.set(item.produto_id, true);
      produtosUnicos.push({
        id: item.produto_id,
        nome: `${item.produto} - ${item.marca}`,
        temPercapita: !!item.percapita_id
      });
    }
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Per capita e Rendimento</h2>
          <p className="text-sm text-gray-500">
            Configure o consumo por aluno e veja a previsão de refeições do estoque atual.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div 
            onClick={handleOpenServidasModal}
            className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex flex-col items-end cursor-pointer hover:bg-emerald-100 transition-colors"
            title="Clique para ajustar as Refeições Servidas"
          >
            <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider flex items-center gap-1">
              Refeições Servidas
              <PencilSquareIcon className="w-3 h-3" />
            </span>
            <span className="text-xl font-bold text-emerald-600">{servidasVal}</span>
          </div>

          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex flex-col items-end">
            <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Alunos Ativos</span>
            <span className="text-xl font-bold text-amber-600">{totalAlunos}</span>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Cadastrar Per capita
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/90 border-b-2 border-gray-200 text-sm text-gray-600 shadow-sm">
                <th className="py-4 px-6 font-semibold tracking-wide">PRODUTO (ESTOQUE)</th>
                <th className="py-4 px-6 font-semibold tracking-wide">LOTE / VAL.</th>
                <th className="py-4 px-6 font-semibold tracking-wide">SALDO (KG)</th>
                <th className="py-4 px-6 font-semibold tracking-wide">PER CAPITA (KG)</th>
                <th className="py-4 px-6 font-semibold tracking-wide text-center">QUANTIDADE DE REFEIÇÕES</th>
                <th className="py-4 px-6 text-center font-semibold tracking-wide">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    Não há itens com saldo no estoque para configurar per capita.
                  </td>
                </tr>
              ) : (
                itens.map((item, index) => {
                  const refeicoes = calcularRefeicoes(item.saldo_kg, item.percapita_kg);
                  return (
                    <tr key={index} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-800">{item.produto}</div>
                        <div className="text-xs text-gray-500">{item.marca}</div>
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
                      <td className="py-4 px-6 font-semibold text-gray-700">
                        {Number(item.saldo_kg).toLocaleString('pt-BR')} kg
                      </td>
                      <td className="py-4 px-6">
                        {item.percapita_kg ? (
                          <span className="font-semibold text-blue-600">{Number(item.percapita_kg).toLocaleString('pt-BR')} kg/aluno</span>
                        ) : (
                          <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100">Não configurada</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {item.percapita_kg ? (
                          <div className="flex flex-col items-center">
                            <span className={`text-xl font-bold ${refeicoes < 3 ? 'text-red-500' : refeicoes < 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {refeicoes}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Refeições</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 font-bold">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {item.percapita_id ? (
                            <>
                              <button
                                onClick={() => handleOpenModal(item.produto_id, item.percapita_kg)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar Per capita"
                              >
                                <PencilSquareIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.percapita_id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir Per capita"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenModal(item.produto_id, "")}
                              className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-200 transition-colors"
                            >
                              Configurar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">
                {percapitaKg ? 'Editar Per capita' : 'Cadastrar Per capita'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Produto</label>
                <select
                  required
                  value={selectedProdutoId}
                  onChange={(e) => setSelectedProdutoId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                >
                  <option value="">Selecione o produto...</option>
                  {produtosUnicos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.temPercapita ? '(Já configurado)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Per capita por Aluno (KG)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    step="0.0001"
                    min="0.0001"
                    value={percapitaKg}
                    onChange={(e) => setPercapitaKg(e.target.value)}
                    placeholder="Ex: 0.05"
                    className="w-full pl-4 pr-12 py-2 border border-amber-300 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-amber-50/30 font-semibold"
                  />
                  <span className="absolute right-4 top-2 text-gray-400 font-semibold text-sm">KG</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Informe a quantidade em quilos. Ex: 50 gramas = 0.05
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Salvar Per capita"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Refeições Servidas */}
      {isServidasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">
                Refeições Servidas
              </h3>
              <button onClick={() => setIsServidasModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveServidas} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quantidade</label>
                <input
                  type="number"
                  required
                  min="0"
                  max={totalAlunos}
                  value={tempServidas}
                  onChange={(e) => setTempServidas(e.target.value)}
                  className="w-full px-4 py-2 border border-emerald-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Informe quantas refeições serão efetivamente servidas. (Máximo: {totalAlunos})
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsServidasModalOpen(false)}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-md transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
