import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  XMarkIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";

export default function MerendaCadastroPage() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    id: null,
    produto: "",
    gramatura: "",
    marca: "",
    validade: "",
    lote: "",
    categoria: "Perecível"
  });

  const [saving, setSaving] = useState(false);

  // Fetch data
  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/merenda/produtos");
      setProdutos(data || []);
    } catch (error) {
      console.error("Erro ao buscar produtos da merenda:", error);
      toast.error("Erro ao carregar lista de produtos.");
      setProdutos([]); // fallback para não quebrar a tela
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEditing(true);
      setFormData({
        id: item.id,
        produto: item.produto || "",
        gramatura: item.gramatura || "",
        marca: item.marca || "",
        validade: item.validade ? String(item.validade).split('T')[0] : "",
        lote: item.lote || "",
        categoria: item.categoria || "Perecível"
      });
    } else {
      setIsEditing(false);
      setFormData({
        id: null,
        produto: "",
        gramatura: "",
        marca: "",
        validade: "",
        lote: "",
        categoria: "Perecível"
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ id: null, produto: "", gramatura: "", marca: "", validade: "", lote: "", categoria: "Perecível" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.produto || !formData.categoria) {
      toast.error("Produto e Categoria são obrigatórios.");
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/api/merenda/produtos/${formData.id}`, formData);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await api.post("/api/merenda/produtos", formData);
        toast.success("Produto cadastrado com sucesso!");
      }
      handleCloseModal();
      fetchProdutos();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar o produto. Verifique os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    
    try {
      await api.delete(`/api/merenda/produtos/${id}`);
      toast.success("Produto excluído!");
      fetchProdutos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir o produto.");
    }
  };

  // Filtragem visual
  const produtosFiltrados = produtos.filter(p => 
    (p.produto || "").toLowerCase().includes(busca.toLowerCase()) ||
    (p.marca || "").toLowerCase().includes(busca.toLowerCase()) ||
    (p.lote || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 min-h-screen bg-gray-50/50">
      
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        {/* Efeito visual de fundo no header */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-amber-400 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-orange-500 opacity-10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20">
            <ArchiveBoxIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Cadastro de Gêneros Alimentícios</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie os produtos, marcas e validades do estoque da merenda</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produto, marca ou lote..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all text-sm"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/40 transition-all active:scale-95"
          >
            <PlusIcon className="w-5 h-5 stroke-2" />
            NOVO CADASTRO
          </button>
        </div>
      </div>

      {/* TABELA PREMIUM */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            <p className="font-medium animate-pulse text-amber-600">Carregando produtos...</p>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <ArchiveBoxIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">Nenhum produto encontrado</h3>
            <p className="text-gray-500 mt-1 max-w-md">Não há produtos cadastrados ou a busca não retornou resultados. Clique em "Novo Cadastro" para adicionar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/90 border-b-2 border-gray-200 text-sm text-gray-600 shadow-sm">
                  <th className="py-4 px-6 font-semibold tracking-wide">PRODUTO</th>
                  <th className="py-4 px-6 font-semibold tracking-wide">CATEGORIA</th>
                  <th className="py-4 px-6 font-semibold tracking-wide">GRAMATURA <span className="text-xs opacity-70 font-normal">(KG)</span></th>
                  <th className="py-4 px-6 font-semibold tracking-wide">MARCA</th>
                  <th className="py-4 px-6 font-semibold tracking-wide">VALIDADE</th>
                  <th className="py-4 px-6 font-semibold tracking-wide">LOTE</th>
                  <th className="py-4 px-6 font-semibold tracking-wide text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {produtosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-medium text-gray-800">{item.produto}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.categoria === 'Perecível' 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {item.categoria}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{item.gramatura || '-'}</td>
                    <td className="py-4 px-6 text-gray-600">{item.marca || '-'}</td>
                    <td className="py-4 px-6 text-gray-600">
                      {item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-4 px-6">
                      {item.lote ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded border border-gray-200">
                          {item.lote}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* MODAL PREMIUM DE CADASTRO/EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={handleCloseModal}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {isEditing ? (
                  <PencilSquareIcon className="w-5 h-5 text-amber-500" />
                ) : (
                  <PlusIcon className="w-5 h-5 text-amber-500 stroke-2" />
                )}
                {isEditing ? "Editar Produto" : "Novo Cadastro"}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                
                {/* Produto & Categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Produto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="produto"
                      value={formData.produto}
                      onChange={handleChange}
                      required
                      placeholder="Ex: Arroz Agulhinha"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Categoria <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="Perecível">Perecível</option>
                      <option value="Não perecível">Não perecível</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Gramatura
                    </label>
                    <input
                      type="text"
                      name="gramatura"
                      value={formData.gramatura}
                      onChange={handleChange}
                      placeholder="Ex: 5kg, 500g"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Marca & Lote */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      name="marca"
                      value={formData.marca}
                      onChange={handleChange}
                      placeholder="Ex: Tio João"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Lote
                    </label>
                    <input
                      type="text"
                      name="lote"
                      value={formData.lote}
                      onChange={handleChange}
                      placeholder="Ex: L123456"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Validade */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Validade
                  </label>
                  <input
                    type="date"
                    name="validade"
                    value={formData.validade}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all text-gray-700"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-md shadow-amber-500/30 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  {isEditing ? "Salvar Alterações" : "Cadastrar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
