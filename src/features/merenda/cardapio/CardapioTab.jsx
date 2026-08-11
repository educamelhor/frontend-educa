import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, PencilSquareIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function CardapioTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cardapios, setCardapios] = useState([]);
  
  const [estoque, setEstoque] = useState([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [refeicoesServidas, setRefeicoesServidas] = useState(null);
  const [refeicoesCardapio, setRefeicoesCardapio] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Custom Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: null, type: "danger" });
  
  // Missing Items Modal State
  const [missingItemsModal, setMissingItemsModal] = useState({ isOpen: false, items: [] });
  const [pendingReceitaSelection, setPendingReceitaSelection] = useState({ receitaNome: "", novosItens: [] });
  
  // Edit Item Modal State
  const [editItemModal, setEditItemModal] = useState({ isOpen: false, itemKey: null, kgInput: "", produto: "" });

  // Intelligent Modal State (Assistente de Estoque)
  const [intelligentModalConfig, setIntelligentModalConfig] = useState({
    isOpen: false,
    type: null, 
    item: null,
    kgNecessario: 0,
    saldoKg: 0,
    refParaCalculo: 0,
    kgInput: ""
  });

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [dataCardapio, setDataCardapio] = useState("");
  const [nomeCardapio, setNomeCardapio] = useState("");
  const [turnoCardapio, setTurnoCardapio] = useState("Todos");
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(""); // para a listbox

  // Receitas State
  const [isReceitaModalOpen, setIsReceitaModalOpen] = useState(false);
  const [receitas, setReceitas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [nomeReceita, setNomeReceita] = useState("");
  const [itensReceita, setItensReceita] = useState([]); 
  const [selectedProdutoId, setSelectedProdutoId] = useState("");
  const [editingReceitaId, setEditingReceitaId] = useState(null);
  const [savingReceita, setSavingReceita] = useState(false);

  const fetchReceitasEProdutos = async () => {
    try {
      const [resRec, resProd] = await Promise.all([
        api.get("/api/merenda/receitas"),
        api.get("/api/merenda/produtos")
      ]);
      setReceitas(resRec.data);
      setProdutos(resProd.data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados de receitas.");
    }
  };

  const openReceitaModal = () => {
    setNomeReceita("");
    setItensReceita([]);
    setEditingReceitaId(null);
    setSelectedProdutoId("");
    fetchReceitasEProdutos();
    setIsReceitaModalOpen(true);
  };

  const handleEditReceita = (receita) => {
    setEditingReceitaId(receita.id);
    setNomeReceita(receita.nome);
    setItensReceita(receita.itens.map(i => ({
      id: i.id,
      produto: i.produto,
      marca: i.marca,
      categoria: i.categoria
    })));
  };

  const handleDeleteReceita = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta receita?")) return;
    try {
      await api.delete(`/api/merenda/receitas/${id}`);
      toast.success("Receita excluída com sucesso.");
      fetchReceitasEProdutos();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir receita.");
    }
  };

  const handleSaveReceita = async () => {
    if (!nomeReceita) return toast.error("Informe o nome da receita.");
    if (itensReceita.length === 0) return toast.error("Adicione ao menos um ingrediente.");
    setSavingReceita(true);
    try {
      const payload = {
        nome: nomeReceita,
        itens: itensReceita.map(i => i.id)
      };
      if (editingReceitaId) {
        await api.put(`/api/merenda/receitas/${editingReceitaId}`, payload);
        toast.success("Receita atualizada.");
      } else {
        await api.post("/api/merenda/receitas", payload);
        toast.success("Receita cadastrada.");
      }
      setNomeReceita("");
      setItensReceita([]);
      setEditingReceitaId(null);
      fetchReceitasEProdutos();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar receita.");
    } finally {
      setSavingReceita(false);
    }
  };

  const handleAddProdutoReceita = () => {
    if (!selectedProdutoId) return;
    const prod = produtos.find(p => p.id === parseInt(selectedProdutoId));
    if (!prod) return;
    if (itensReceita.some(i => i.id === prod.id)) {
      return toast.error("Ingrediente já adicionado.");
    }
    setItensReceita([...itensReceita, prod]);
    setSelectedProdutoId("");
  };

  useEffect(() => {
    fetchCardapios();
    fetchEstoque();
    fetchReceitasEProdutos();
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
      const servidas = data.refeicoes_servidas !== undefined && data.refeicoes_servidas !== null
        ? data.refeicoes_servidas
        : (data.total_alunos || 0);
      setRefeicoesServidas(servidas);
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
      setRefeicoesCardapio(cardapioExistente.refeicoes_cardapio != null ? String(cardapioExistente.refeicoes_cardapio) : "");
      const formatItens = cardapioExistente.itens.map(i => {
        const estKey = `${i.produto_id}||${i.lote || ''}||${i.validade || ''}`;
        const itemEstoque = estoque.find(e => getEstoqueKey(e) === estKey) || {};
        return {
          key: estKey,
          produto_id: i.produto_id,
          lote: i.lote,
          validade: i.validade,
          produto: i.produto,
          marca: i.marca,
          quantidade_kg: Number(i.quantidade_kg),
          gramaturaStr: i.gramaturaStr || itemEstoque.gramatura,
          percapita_kg: itemEstoque.percapita_kg,
          saldo_kg: itemEstoque.saldo_kg
        };
      });
      setItensSelecionados(formatItens);
    } else {
      setEditingId(null);
      const diaFormatado = day ? String(day).padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');
      const mesFormatado = String(month + 1).padStart(2, '0');
      setDataCardapio(`${year}-${mesFormatado}-${diaFormatado}`);
      setNomeCardapio("");
      setTurnoCardapio("Todos");
      setRefeicoesCardapio("");
      setItensSelecionados([]);
    }
    setSelectedLoteId("");
    fetchEstoque();
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleLoteSelect = (value) => {
    if (!value) {
      setSelectedLoteId("");
      return;
    }
    const itemEstoque = estoque.find(e => getEstoqueKey(e) === value);
    if (itemEstoque && !itemEstoque.percapita_id) {
      toast.error("Falta per capita! Configure na aba 'PER CAPITA' antes de adicionar ao cardápio.");
      setSelectedLoteId("");
      return;
    }
    setSelectedLoteId(value);
  };

  const handleReceitaSelectParaCardapio = (receitaNome) => {
    setNomeCardapio(receitaNome);
    if (!receitaNome) {
      setItensSelecionados([]);
      return;
    }
    const receita = receitas.find(r => r.nome === receitaNome);
    if (!receita) return;

    const refParaCalculo = refeicoesCardapio ? parseInt(refeicoesCardapio, 10) : (refeicoesServidas !== null ? refeicoesServidas : totalAlunos);
    const novosItens = [];
    const itensComProblema = []; // Para erro de Per Capita ou Saldo Zero

    for (const prod of receita.itens) {
      const temPercapita = estoque.some(e => e.produto_id === prod.id && e.percapita_id);
      const lotesDisponiveis = estoque.filter(e => e.produto_id === prod.id && Number(e.saldo_kg) > 0 && e.percapita_id);
      
      if (!temPercapita || lotesDisponiveis.length === 0) {
        itensComProblema.push(prod.produto);
        // Mesmo com problema, adicionamos à lista com valores zerados para o usuário gerenciar
        // Tentamos buscar a marca e gramatura caso exista no estoque (ou no cadastro geral, se estivesse disponível)
        const itemEstoqueBase = estoque.find(e => e.produto_id === prod.id) || {};
        
        novosItens.push({
          key: `${prod.id}||PENDENTE||${Date.now()}_${Math.random()}`,
          produto_id: prod.id,
          lote: "-",
          validade: null,
          produto: prod.produto,
          marca: itemEstoqueBase.marca || "-",
          quantidade_kg: 0,
          gramaturaStr: itemEstoqueBase.gramatura || "-",
          percapita_kg: itemEstoqueBase.percapita_kg || 0,
          saldo_kg: 0
        });
        continue;
      }

      // Procura um lote válido com saldo > 0
      lotesDisponiveis.sort((a, b) => new Date(a.validade || '9999-12-31') - new Date(b.validade || '9999-12-31'));
      const itemEstoque = lotesDisponiveis[0];
      const kgNecessario = Number(itemEstoque.percapita_kg) * refParaCalculo;
      const saldoKg = Number(itemEstoque.saldo_kg);
      const previewKg = kgNecessario > saldoKg ? saldoKg : kgNecessario;

      novosItens.push({
        key: getEstoqueKey(itemEstoque),
        produto_id: itemEstoque.produto_id,
        lote: itemEstoque.lote,
        validade: itemEstoque.validade,
        produto: itemEstoque.produto,
        marca: itemEstoque.marca,
        quantidade_kg: previewKg,
        gramaturaStr: itemEstoque.gramatura,
        percapita_kg: itemEstoque.percapita_kg,
        saldo_kg: itemEstoque.saldo_kg
      });
    }

    if (itensComProblema.length > 0) {
      setPendingReceitaSelection({ receitaNome, novosItens });
      setMissingItemsModal({ isOpen: true, items: itensComProblema });
      return;
    }

    setItensSelecionados(novosItens);
  };

  const handleConfirmReceitaSelection = () => {
    setItensSelecionados(pendingReceitaSelection.novosItens);
    setMissingItemsModal({ isOpen: false, items: [] });
    setPendingReceitaSelection({ receitaNome: "", novosItens: [] });
  };

  const handleCancelReceitaSelection = () => {
    setNomeCardapio("");
    setItensSelecionados([]);
    setMissingItemsModal({ isOpen: false, items: [] });
    setPendingReceitaSelection({ receitaNome: "", novosItens: [] });
  };

  const handleAddItem = () => {
    if (!selectedLoteId) return;
    const itemEstoque = estoque.find(e => getEstoqueKey(e) === selectedLoteId);
    if (!itemEstoque) return;

    if (itensSelecionados.find(i => i.key === selectedLoteId)) {
      toast.error("Este lote já foi adicionado ao cardápio.");
      return;
    }

    const refParaCalculo = refeicoesCardapio ? parseInt(refeicoesCardapio, 10) : (refeicoesServidas !== null ? refeicoesServidas : totalAlunos);
    const kgNecessario = Number(itemEstoque.percapita_kg) * refParaCalculo;
    const saldoKg = Number(itemEstoque.saldo_kg);
    const previewKg = kgNecessario > saldoKg ? saldoKg : kgNecessario;

    setItensSelecionados(prev => [...prev, {
      key: selectedLoteId,
      produto_id: itemEstoque.produto_id,
      lote: itemEstoque.lote,
      validade: itemEstoque.validade,
      produto: itemEstoque.produto,
      marca: itemEstoque.marca,
      quantidade_kg: previewKg,
      gramaturaStr: itemEstoque.gramatura,
      percapita_kg: itemEstoque.percapita_kg,
      saldo_kg: itemEstoque.saldo_kg
    }]);
    setSelectedLoteId("");
  };

  const [intelligentQueue, setIntelligentQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const processNextInQueue = (currentQueue, currentItens) => {
    const problemIndex = currentQueue.findIndex(q => q.type === 3 || q.type === 4);
    
    if (problemIndex === -1) {
      // Resolve all items
      const resolvedItens = currentItens.map(i => {
         const qItem = currentQueue.find(q => q.item.key === i.key);
         return { ...i, quantidade_kg: qItem ? qItem.kgUsado : i.quantidade_kg };
      });
      setItensSelecionados(resolvedItens);
      setIsProcessingQueue(false);
      setIntelligentQueue([]);
      setIntelligentModalConfig({ isOpen: false, item: null });
      executeSubmit(resolvedItens);
      return;
    }

    const problem = currentQueue[problemIndex];
    setIntelligentModalConfig({
      isOpen: true,
      type: problem.type,
      item: problem.item,
      kgNecessario: problem.kgNecessario,
      saldoKg: problem.saldoKg,
      refParaCalculo: problem.refParaCalculo,
      kgInput: problem.type === 4 ? String(problem.saldoKg) : String(problem.kgNecessario),
      queueIndex: problemIndex
    });
  };

  const confirmIntelligentAdd = (kgUsadoStr) => {
    const kgUsado = parseFloat(kgUsadoStr);
    if (isNaN(kgUsado) || kgUsado <= 0) return toast.error("Quantidade inválida.");

    const newItens = itensSelecionados.map(i => {
      if (i.key === intelligentModalConfig.item.key) {
         return { ...i, quantidade_kg: kgUsado };
      }
      return i;
    });
    setItensSelecionados(newItens);

    const newQueue = [...intelligentQueue];
    newQueue[intelligentModalConfig.queueIndex].type = 2; // Resolved
    newQueue[intelligentModalConfig.queueIndex].kgUsado = kgUsado;
    
    setIntelligentQueue(newQueue);
    processNextInQueue(newQueue, newItens);
  };

  const handleRefeicoesChange = (e) => {
    const val = e.target.value;
    setRefeicoesCardapio(val);
    
    const refParaCalculo = val
      ? parseInt(val, 10)
      : (refeicoesServidas !== null ? refeicoesServidas : totalAlunos);

    if (itensSelecionados.length > 0) {
      setItensSelecionados(prev => prev.map(item => {
        const itemEstoque = estoque.find(est => getEstoqueKey(est) === item.key);
        if (itemEstoque) {
          const kgNecessario = Number(itemEstoque.percapita_kg) * refParaCalculo;
          const saldoKg = Number(itemEstoque.saldo_kg);
          // Atualiza respeitando o limite do saldo
          const kgUsado = kgNecessario > saldoKg ? saldoKg : kgNecessario;
          return { ...item, quantidade_kg: kgUsado };
        }
        return item;
      }));
    }
  };

  const handleRemoveItem = (key) => setItensSelecionados(itensSelecionados.filter(i => i.key !== key));

  const handleSaveEditItem = () => {
    const kg = parseFloat(editItemModal.kgInput);
    if (isNaN(kg) || kg < 0) return toast.error("Valor inválido.");
    setItensSelecionados(prev => prev.map(i => i.key === editItemModal.itemKey ? { ...i, quantidade_kg: kg } : i));
    setEditItemModal({ isOpen: false, itemKey: null, kgInput: "", produto: "" });
  };

  const calcularUnidades = (kg, gramaturaStr) => {
    if (!kg) return 0;
    let gramatura = 1;
    if (gramaturaStr) {
      const str = gramaturaStr.toLowerCase();
      const isGramsOrMl = (str.includes('g') && !str.includes('kg')) || str.includes('ml');
      const parsed = parseFloat(gramaturaStr.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        gramatura = isGramsOrMl ? parsed / 1000 : parsed;
      }
    }
    return (parseFloat(kg) / gramatura).toFixed(4);
  };

  const executeSubmit = async (finalItens) => {
    const refFinal = refeicoesCardapio
      ? parseInt(refeicoesCardapio, 10)
      : (refeicoesServidas !== null ? refeicoesServidas : totalAlunos);

    const payload = {
      data_cardapio: dataCardapio,
      nome: nomeCardapio,
      turno: turnoCardapio,
      refeicoes_cardapio: refFinal,
      itens: finalItens.map(i => ({
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
      toast.error("Adicione ao menos um gênero alimentício antes de salvar o cardápio.");
      return;
    }
    
    const refParaCalculo = refeicoesCardapio ? parseInt(refeicoesCardapio, 10) : (refeicoesServidas !== null ? refeicoesServidas : totalAlunos);
    const queue = [];
    
    for (let item of itensSelecionados) {
      const kgNecessario = Number(item.percapita_kg) * refParaCalculo;
      const saldoKg = Number(item.saldo_kg);
      
      if (saldoKg < kgNecessario) {
        queue.push({ type: 4, item, kgNecessario, saldoKg, refParaCalculo });
      } else if (saldoKg >= kgNecessario && saldoKg < kgNecessario * 2) {
        queue.push({ type: 3, item, kgNecessario, saldoKg, refParaCalculo });
      } else {
        queue.push({ type: 2, item, kgNecessario, saldoKg, refParaCalculo, kgUsado: kgNecessario });
      }
    }

    setIntelligentQueue(queue);
    setIsProcessingQueue(true);
    processNextInQueue(queue, itensSelecionados);
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
            onClick={() => openReceitaModal()}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nova Receita
          </button>
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                <div className="md:col-span-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Refeição (Receita)</label>
                  <select
                    required
                    value={nomeCardapio}
                    onChange={(e) => handleReceitaSelectParaCardapio(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-gray-700 font-medium bg-gray-50/50"
                  >
                    <option value="">Selecione uma receita...</option>
                    {receitas.map(r => (
                      <option key={r.id} value={r.nome}>{r.nome}</option>
                    ))}
                  </select>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Refeições desse Cardápio
                    <span className="ml-1 text-xs font-normal text-gray-400">(fallback: {refeicoesServidas !== null ? refeicoesServidas : totalAlunos})</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalAlunos}
                    value={refeicoesCardapio}
                    onChange={handleRefeicoesChange}
                    placeholder={String(refeicoesServidas !== null ? refeicoesServidas : totalAlunos)}
                    className="w-full px-4 py-3 border border-emerald-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-gray-700 font-semibold bg-emerald-50/30"
                  />
                </div>
                <div className="md:col-span-2">
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
                      onChange={(e) => handleLoteSelect(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    >
                      <option value="">Selecione um lote em estoque...</option>
                      {estoque.map(e => {
                        const hasPerc = !!e.percapita_id;
                        let text = `${e.produto} - ${e.marca}`;
                        if (e.lote) text += ` | Lote: ${e.lote}`;
                        text += ` | Saldo: ${Number(e.saldo_kg).toLocaleString('pt-BR')} kg`;
                        if (!hasPerc) text += ' (FALTA PER CAPITA)';
                        return (
                          <option key={getEstoqueKey(e)} value={getEstoqueKey(e)}>
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
                  O consumo será debitado baseado em <b>
                    {refeicoesCardapio
                      ? `${refeicoesCardapio} refeições desse cardápio`
                      : `${refeicoesServidas !== null ? refeicoesServidas : totalAlunos} refeições servidas (padrão)`}
                  </b>.
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
                        <th className="py-3 px-4 text-center font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itensSelecionados.map(item => (
                        <tr key={item.key} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{item.produto} - {item.marca}</td>
                          <td className="py-3 px-4 text-gray-600">{item.lote || '-'}</td>
                          <td className="py-3 px-4 font-bold text-red-500">- {item.quantidade_kg.toLocaleString('pt-BR')} kg</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditItemModal({ isOpen: true, itemKey: item.key, kgInput: String(item.quantidade_kg), produto: item.produto })}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar Quantidade"
                              >
                                <PencilSquareIcon className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.key)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover"
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

      {/* Modal Inteligente de Assistente de Estoque */}
      {intelligentModalConfig.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className={`px-6 py-5 border-b flex items-center gap-4 ${intelligentModalConfig.type === 4 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className={`p-2.5 rounded-full shadow-sm ${intelligentModalConfig.type === 4 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className={`text-xl font-bold tracking-tight ${intelligentModalConfig.type === 4 ? 'text-red-900' : 'text-amber-900'}`}>
                {intelligentModalConfig.type === 4 ? "Saldo Insuficiente" : "Aviso de Saldo Crítico"}
              </h3>
            </div>
            
            <div className="p-6 bg-white space-y-5">
              <p className="text-gray-700 text-[15px] leading-relaxed">
                {intelligentModalConfig.type === 4 ? (
                  <>
                    Atenção! A per capita exige <b>{intelligentModalConfig.kgNecessario.toLocaleString('pt-BR')} kg</b> para as {intelligentModalConfig.refParaCalculo} refeições deste cardápio, mas você possui apenas <b>{intelligentModalConfig.saldoKg.toLocaleString('pt-BR')} kg</b> deste lote no depósito.
                  </>
                ) : (
                  <>
                    O saldo atual de <b>{intelligentModalConfig.saldoKg.toLocaleString('pt-BR')} kg</b> atende este cardápio ({intelligentModalConfig.kgNecessario.toLocaleString('pt-BR')} kg), mas deixará um resto de <b>{(intelligentModalConfig.saldoKg - intelligentModalConfig.kgNecessario).toLocaleString('pt-BR')} kg</b> no depósito, o que é <span className="text-amber-600 font-semibold">insuficiente para um próximo cardápio idêntico</span>.
                  </>
                )}
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quantidade a consumir neste cardápio (kg):</label>
                <input
                  type="number"
                  min="0"
                  max={intelligentModalConfig.saldoKg}
                  step="0.001"
                  value={intelligentModalConfig.kgInput}
                  onChange={(e) => setIntelligentModalConfig(prev => ({...prev, kgInput: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-gray-800 font-bold bg-white shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ações Rápidas:</p>
                
                {intelligentModalConfig.type === 3 && (
                  <button
                    onClick={() => setIntelligentModalConfig(prev => ({...prev, kgInput: String(prev.kgNecessario)}))}
                    className="w-full py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-left transition-colors"
                  >
                    👉 <b>Manter Per capita:</b> Usar {intelligentModalConfig.kgNecessario.toLocaleString('pt-BR')} kg e deixar o resto
                  </button>
                )}

                <button
                  onClick={() => setIntelligentModalConfig(prev => ({...prev, kgInput: String(prev.saldoKg)}))}
                  className="w-full py-2 px-4 text-sm font-medium text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 rounded-lg text-left transition-colors"
                >
                  🧨 <b>Zerar Estoque:</b> Consumir todos os {intelligentModalConfig.saldoKg.toLocaleString('pt-BR')} kg
                </button>

                {intelligentModalConfig.type === 3 && (
                  <button
                    onClick={() => setIntelligentModalConfig(prev => ({...prev, kgInput: String(prev.saldoKg / 2)}))}
                    className="w-full py-2 px-4 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-lg text-left transition-colors"
                  >
                    ⚖️ <b>Dividir Saldo:</b> Consumir {(intelligentModalConfig.saldoKg / 2).toLocaleString('pt-BR')} kg (Metade agora, metade depois)
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => setIntelligentModalConfig({ isOpen: false, type: null, item: null, kgNecessario: 0, saldoKg: 0, refParaCalculo: 0, kgInput: "" })}
                className="px-6 py-2.5 text-gray-700 font-semibold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmIntelligentAdd(intelligentModalConfig.kgInput)}
                className="px-6 py-2.5 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all bg-emerald-500 hover:bg-emerald-600"
              >
                Confirmar Gênero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestão de Receitas */}
      {isReceitaModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            {/* Header Modal */}
            <div className="px-6 sm:px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50">
              <div>
                <h2 className="text-2xl font-black text-indigo-900 tracking-tight">
                  Gestão de Receitas
                </h2>
                <p className="text-sm font-medium text-indigo-600/80 mt-1">Crie receitas para agilizar a montagem do cardápio</p>
              </div>
              <button
                onClick={() => setIsReceitaModalOpen(false)}
                className="p-2.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 sm:px-8 overflow-y-auto flex-1 bg-gray-50/30 flex flex-col gap-8">
              
              {/* Form de Criação/Edição */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{editingReceitaId ? 'Editar Receita' : 'Nova Receita'}</h3>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nome da Receita</label>
                    <input
                      type="text"
                      value={nomeReceita}
                      onChange={(e) => setNomeReceita(e.target.value)}
                      placeholder="Ex: Galinhada"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-gray-700 font-medium bg-gray-50/50"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Adicionar Gênero (Ingrediente)</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={selectedProdutoId}
                      onChange={(e) => setSelectedProdutoId(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 bg-gray-50/50"
                    >
                      <option value="">Selecione um gênero...</option>
                      {produtos.map(p => (
                        <option key={p.id} value={p.id}>{p.produto} - {p.marca}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddProdutoReceita}
                      className="px-5 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-xl transition-colors whitespace-nowrap"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {itensReceita.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                          <th className="py-3 px-4">Gênero</th>
                          <th className="py-3 px-4">Marca</th>
                          <th className="py-3 px-4 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensReceita.map(item => (
                          <tr key={item.id} className="border-t border-gray-100">
                            <td className="py-3 px-4 font-medium text-gray-800">{item.produto}</td>
                            <td className="py-3 px-4 text-gray-600">{item.marca}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setItensReceita(itensReceita.filter(i => i.id !== item.id))}
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
                
                <div className="flex justify-end gap-3">
                  {editingReceitaId && (
                    <button
                      onClick={() => {
                        setNomeReceita("");
                        setItensReceita([]);
                        setEditingReceitaId(null);
                      }}
                      className="px-6 py-2.5 text-gray-700 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      Cancelar Edição
                    </button>
                  )}
                  <button
                    onClick={handleSaveReceita}
                    disabled={savingReceita}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {savingReceita ? "Salvando..." : (editingReceitaId ? "Atualizar Receita" : "Salvar Receita")}
                  </button>
                </div>
              </div>

              {/* Tabela de Receitas Salvas */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Receitas Cadastradas</h3>
                {receitas.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                    <p className="text-gray-500 font-medium">Nenhuma receita cadastrada ainda.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="py-4 px-5">Nome da Receita</th>
                          <th className="py-4 px-5">Ingredientes</th>
                          <th className="py-4 px-5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {receitas.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-5 font-bold text-gray-800">{r.nome}</td>
                            <td className="py-4 px-5 text-gray-600">
                              <div className="flex flex-wrap gap-1">
                                {r.itens?.map(i => (
                                  <span key={i.id} className="px-2 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded border border-gray-200 shadow-sm">
                                    {i.produto}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditReceita(r)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <PencilSquareIcon className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReceita(r.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir"
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
              
            </div>
            {/* Footer Modal */}
            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsReceitaModalOpen(false)}
                className="px-6 py-2.5 text-gray-700 font-semibold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Fechar
              </button>
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

      {/* Modal Premium para Itens Sem Per Capita / Sem Saldo */}
      {missingItemsModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="px-6 py-5 border-b flex items-center gap-4 bg-amber-50 border-amber-100">
              <div className="bg-amber-100 p-2.5 rounded-full text-amber-600 shadow-sm flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-amber-900">
                Atenção: Itens Incompletos
              </h3>
            </div>
            <div className="p-6 bg-white space-y-4">
              <p className="text-gray-700 text-[15px] leading-relaxed">
                A receita selecionada possui itens que ainda não têm <b>Saldo</b> no estoque ou não possuem a <b>Per Capita</b> cadastrada:
              </p>
              <div className="flex flex-wrap gap-2">
                {missingItemsModal.items.map((item, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-semibold rounded-lg border border-amber-100">
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-gray-600 text-sm mt-2">
                Você pode continuar e gerenciar estes itens diretamente na lista (ex: excluir ou inserir manualmente depois).
              </p>
            </div>
            <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={handleCancelReceitaSelection}
                className="px-6 py-2.5 text-gray-700 font-semibold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReceitaSelection}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Continuar Mesmo Assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini Modal para Editar Quantidade */}
      {editItemModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b flex items-center gap-3 bg-blue-50 border-blue-100">
              <PencilSquareIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-900">Ajustar Quantidade</h3>
            </div>
            <div className="p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {editItemModal.produto}
              </label>
              <p className="text-xs text-gray-500 mb-3">Informe a quantidade em kg (baixa no estoque)</p>
              <input
                type="number"
                min="0"
                step="0.001"
                value={editItemModal.kgInput}
                onChange={(e) => setEditItemModal(prev => ({ ...prev, kgInput: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-gray-800 font-bold"
                autoFocus
              />
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditItemModal({ isOpen: false, itemKey: null, kgInput: "", produto: "" })}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditItem}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
