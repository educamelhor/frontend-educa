import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, PencilSquareIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function CardapioTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cardapios, setCardapios] = useState([]);
  
  const [estoque, setEstoque] = useState([]);
  const [totalAlunos, setTotalAlunos] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Custom Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: null, type: "danger" });

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [dataCardapio, setDataCardapio] = useState("");
  const [nomeCardapio, setNomeCardapio] = useState("");
  const [turnoCardapio, setTurnoCardapio] = useState("Todos");
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(""); // para a listbox

  useEffect(() => {
    fetchCardapios();
    fetchEstoque();
  }, [currentDate]);

  const fetchCardapios = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const { data } = await api.get(`/api/merenda/cardapio?mes=${year}-${month}`);
      setCardapios(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar cardápios.");
    }
  };

  const fetchEstoque = async () => {
    try {
      const { data } = await api.get("/api/merenda/percapita");
      setTotalAlunos(data.total_alunos || 0);
      setEstoque(data.itens || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar estoque disponível.");
    }
  };

  // Funções de Calendário
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getEstoqueKey = (item) => `${item.produto_id}||${item.lote || ''}||${item.validade || ''}`;

  const openModal = (day = null, cardapioExistente = null) => {
    if (cardapioExistente) {
      setEditingId(cardapioExistente.id);
      setDataCardapio(String(cardapioExistente.data_cardapio).split('T')[0]);
      setNomeCardapio(cardapioExistente.nome);
      setTurnoCardapio(cardapioExistente.turno || "Todos");
      const formatItens = cardapioExistente.itens.map(i => ({
        key: `${i.produto_id}||${i.lote || ''}||${i.validade || ''}`,
        produto_id: i.produto_id,
        lote: i.lote,
        validade: i.validade,
        produto: i.produto,
        marca: i.marca,
        quantidade_kg: Number(i.quantidade_kg)
      }));
      setItensSelecionados(formatItens);
    } else {
      setEditingId(null);
      const diaFormatado = day ? String(day).padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');
      const mesFormatado = String(month + 1).padStart(2, '0');
      setDataCardapio(`${year}-${mesFormatado}-${diaFormatado}`);
      setNomeCardapio("");
      setTurnoCardapio("Todos");
      setItensSelecionados([]);
    }
    setSelectedLoteId("");
    fetchEstoque();
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleAddItem = () => {
    if (!selectedLoteId) return;
    const itemEstoque = estoque.find(e => getEstoqueKey(e) === selectedLoteId);
    if (!itemEstoque) return;

    if (itensSelecionados.find(i => i.key === selectedLoteId)) {
      toast.error("Este lote já foi adicionado ao cardápio.");
      return;
    }

    if (!itemEstoque.percapita_id) {
      toast.error("Este produto não possui percápita configurada.");
      return;
    }

    const kgNecessario = Number(itemEstoque.percapita_kg) * totalAlunos;
    const saldoKg = Number(itemEstoque.saldo_kg);

    const proceedAddItem = (kgUsado) => {
      setItensSelecionados(prev => [...prev, {
        key: selectedLoteId,
        produto_id: itemEstoque.produto_id,
        lote: itemEstoque.lote,
        validade: itemEstoque.validade,
        produto: itemEstoque.produto,
        marca: itemEstoque.marca,
        quantidade_kg: kgUsado,
        gramaturaStr: itemEstoque.gramatura
      }]);
      setSelectedLoteId("");
    };

    if (kgNecessario > saldoKg) {
      setConfirmConfig({
        isOpen: true,
        title: "Atenção: Saldo Insuficiente",
        message: `O saldo deste lote é de ${saldoKg.toLocaleString('pt-BR')}kg, mas a percápita exige ${kgNecessario.toLocaleString('pt-BR')}kg para ${totalAlunos} alunos.\n\nDeseja utilizar todo o saldo restante deste lote mesmo assim?`,
        type: "warning",
        onConfirm: () => {
          proceedAddItem(saldoKg);
          setConfirmConfig({ isOpen: false });
        }
      });
      return;
    }
    
    proceedAddItem(kgNecessario);
  };

  const handleRemoveItem = (key) => setItensSelecionados(itensSelecionados.filter(i => i.key !== key));

  const calcularUnidades = (kg, gramaturaStr) => {
    if (!kg) return 0;
    let gramatura = 1;
    if (gramaturaStr) {
      const str = gramaturaStr.toLowerCase();
      const isGrams = str.includes('g') && !str.includes('kg');
      const parsed = parseFloat(gramaturaStr.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        gramatura = isGrams ? parsed / 1000 : parsed;
      }
    }
    return (parseFloat(kg) / gramatura).toFixed(4);
  };

  const executeSubmit = async () => {
    const payload = {
      data_cardapio: dataCardapio,
      nome: nomeCardapio,
      turno: turnoCardapio,
      itens: itensSelecionados.map(i => ({
        produto_id: i.produto_id,
        lote: i.lote,
        validade: i.validade,
        quantidade_kg: i.quantidade_kg,
        quantidade_unidades: calcularUnidades(i.quantidade_kg, i.gramaturaStr || "1")
      }))
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/merenda/cardapio/${editingId}`, payload);
        toast.success("Cardápio atualizado com sucesso!");
      } else {
        await api.post("/api/merenda/cardapio", payload);
        toast.success("Cardápio registrado e estoque baixado com sucesso!");
      }
      closeModal();
      fetchCardapios();
      fetchEstoque();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Erro ao salvar cardápio.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nomeCardapio || !dataCardapio) {
      toast.error("Preencha a data e o nome do cardápio.");
      return;
    }
    
    if (itensSelecionados.length === 0) {
      setConfirmConfig({
        isOpen: true,
        title: "Cardápio Vazio",
        message: "Você não incluiu nenhum gênero alimentício. Deseja salvar o cardápio vazio?",
        type: "warning",
        onConfirm: () => {
          setConfirmConfig({ isOpen: false });
          executeSubmit();
        }
      });
      return;
    }
    
    executeSubmit();
  };

  const handleDelete = (id, nome) => {
    setConfirmConfig({
      isOpen: true,
      title: "Cancelar Cardápio",
      message: `ATENÇÃO! Deseja realmente CANCELAR o cardápio "${nome}"?\nOs itens consumidos serão devolvidos ao estoque automaticamente.`,
      type: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        try {
          await api.delete(`/api/merenda/cardapio/${id}`);
          toast.success("Cardápio cancelado e estoque estornado.");
          fetchCardapios();
          fetchEstoque();
        } catch (err) {
          console.error(err);
          toast.error("Erro ao cancelar cardápio.");
        }
      }
    });
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Gestão de Cardápio</h2>
          <p className="text-sm text-gray-500">Planeje as refeições e debite automaticamente do estoque.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-bold text-gray-700 w-32 text-center">
              {monthNames[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button
            onClick={() => openModal()}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Novo Cardápio
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
          {weekDays.map(wd => (
            <div key={wd} className="py-3 text-center text-xs font-bold text-gray-500 tracking-wider uppercase">
              {wd}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-gray-200 gap-[1px]">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="bg-gray-50" />;
            
            const dataStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = new Date().toISOString().split('T')[0] === dataStr;
            const cardapiosDoDia = cardapios.filter(c => String(c.data_cardapio).split('T')[0] === dataStr);

            return (
              <div 
                key={day} 
                onClick={() => openModal(day, cardapiosDoDia[0] || null)}
                className={`bg-white p-2 min-h-[120px] transition-all group cursor-pointer ${isToday ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/10' : 'hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-amber-500 text-white' : 'text-gray-600'}`}>
                    {day}
                  </span>
                  <button 
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-500 transition-all"
                    title="Adicionar Cardápio neste dia"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 overflow-y-auto max-h-[80px] no-scrollbar">
                  {cardapiosDoDia.map(c => (
                    <div 
                      key={c.id} 
                      className="group/badge relative bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg p-2 text-xs font-semibold text-emerald-800 shadow-sm transition-all"
                    >
                      <div className="break-words leading-tight" title={`${c.nome}${c.turno && c.turno !== 'Todos' ? ` (${c.turno})` : ''}`}>
                        🍲 {c.nome} {c.turno && c.turno !== 'Todos' ? `(${c.turno})` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Planejar Cardápio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Editar Cardápio' : 'Planejar Cardápio'}
              </h3>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                <div className="md:col-span-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Refeição (Nome)</label>
                  <input
                    type="text"
                    required
                    value={nomeCardapio}
                    onChange={(e) => setNomeCardapio(e.target.value)}
                    placeholder="Ex: Galinhada e Suco de Melão"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-gray-700 font-medium bg-gray-50/50"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Turno</label>
                  <select
                    value={turnoCardapio}
                    onChange={(e) => setTurnoCardapio(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-gray-700 font-medium bg-gray-50/50"
                  >
                    <option value="Todos">Todos os Turnos</option>
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Noturno">Noturno</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data (Referência)</label>
                  <input
                    type="date"
                    disabled
                    value={dataCardapio}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100/70 text-gray-500 font-semibold cursor-not-allowed"
                    title="A data é definida pelo dia selecionado no calendário"
                  />
                </div>
              </div>

              <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Selecione Gêneros para a Receita</label>
                    <select
                      value={selectedLoteId}
                      onChange={(e) => setSelectedLoteId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    >
                      <option value="">Selecione um lote em estoque...</option>
                      {estoque.map(e => {
                        const hasPerc = !!e.percapita_id;
                        let text = `${e.produto} - ${e.marca}`;
                        if (e.lote) text += ` | Lote: ${e.lote}`;
                        text += ` | Saldo: ${Number(e.saldo_kg).toLocaleString('pt-BR')} kg`;
                        if (!hasPerc) text += ' (S/ PERCÁPITA)';
                        return (
                          <option key={getEstoqueKey(e)} value={getEstoqueKey(e)} disabled={!hasPerc}>
                            {text}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedLoteId}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Adicionar Gênero
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  O consumo será debitado baseado em <b>{totalAlunos} alunos ativos</b>.
                </p>
              </div>

              {itensSelecionados.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Produto</th>
                        <th className="py-3 px-4 font-semibold">Lote</th>
                        <th className="py-3 px-4 font-semibold">Consumo (Baixa)</th>
                        <th className="py-3 px-4 text-center font-semibold">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itensSelecionados.map(item => (
                        <tr key={item.key} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{item.produto} - {item.marca}</td>
                          <td className="py-3 px-4 text-gray-600">{item.lote || '-'}</td>
                          <td className="py-3 px-4 font-bold text-red-500">- {item.quantidade_kg.toLocaleString('pt-BR')} kg</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.key)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </form>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-3xl">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => { closeModal(); handleDelete(editingId, nomeCardapio); }}
                  className="px-5 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <TrashIcon className="w-5 h-5" />
                  Excluir Cardápio
                </button>
              ) : (
                <div></div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 text-gray-700 font-semibold hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    editingId ? "Salvar Alterações" : "Salvar Cardápio e Baixar Estoque"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Premium de Confirmação e Avisos */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className={`px-6 py-5 border-b flex items-center gap-4 ${confirmConfig.type === 'danger' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
              {confirmConfig.type === 'danger' ? (
                <div className="bg-red-100 p-2.5 rounded-full text-red-600 shadow-sm">
                  <TrashIcon className="w-6 h-6" />
                </div>
              ) : (
                <div className="bg-amber-100 p-2.5 rounded-full text-amber-600 shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
              )}
              <h3 className={`text-xl font-bold tracking-tight ${confirmConfig.type === 'danger' ? 'text-red-900' : 'text-amber-900'}`}>
                {confirmConfig.title}
              </h3>
            </div>
            <div className="p-6 bg-white">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-[15px]">{confirmConfig.message}</p>
            </div>
            <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => setConfirmConfig({ isOpen: false, title: "", message: "", onConfirm: null, type: "danger" })}
                className="px-6 py-2.5 text-gray-700 font-semibold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className={`px-6 py-2.5 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all ${confirmConfig.type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
