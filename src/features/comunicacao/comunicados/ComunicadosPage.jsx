// src/features/comunicacao/comunicados/ComunicadosPage.jsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../../../services/api';
import { AuthContext } from '../../../contexts/AuthContext';
import { 
  MegaphoneIcon, 
  PlusIcon, 
  XMarkIcon, 
  PhotoIcon, 
  DocumentIcon, 
  PencilSquareIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Helper date formatter
const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
};

export default function ComunicadosPage() {
  const { escolaId, user } = useContext(AuthContext);
  const perfil = String(localStorage.getItem('perfil') || '').toLowerCase().trim();
  const canManage = ['diretor', 'vice_diretor', 'coordenador', 'supervisor'].includes(perfil) || user?.role === 'sysadmin';

  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({ titulo: '', ativo: true, arquivo: null });
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState(null); // { type: 'img'|'pdf', url: '' }

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (escolaId) fetchComunicados();
  }, [escolaId]);

  const fetchComunicados = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/comunicados/${escolaId}`);
      if (data.ok) setComunicados(data.comunicados);
    } catch (err) {
      toast.error('Erro ao carregar comunicados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowed.includes(file.type)) {
        toast.error('Formato inválido. Use JPG, PNG ou PDF.');
        e.target.value = '';
        return;
      }
      setFormData({ ...formData, arquivo: file });
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl('PDF'); // indicator
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return toast.error('Título é obrigatório.');
    if (!isEditing && !formData.arquivo) return toast.error('Selecione uma imagem ou PDF.');

    setIsSubmitting(true);
    const form = new FormData();
    form.append('titulo', formData.titulo);
    form.append('ativo', formData.ativo ? '1' : '0');
    if (formData.arquivo) form.append('arquivo', formData.arquivo);

    try {
      if (isEditing) {
        await api.put(`/api/comunicados/${escolaId}/${isEditing}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Comunicado atualizado!');
      } else {
        await api.post(`/api/comunicados/${escolaId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Comunicado criado!');
      }
      setShowForm(false);
      resetForm();
      fetchComunicados();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar comunicado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta postagem?')) return;
    try {
      await api.delete(`/api/comunicados/${escolaId}/${id}`);
      toast.success('Excluído com sucesso.');
      setComunicados(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      toast.error('Erro ao excluir.');
    }
  };

  const editItem = (item) => {
    setIsEditing(item.id);
    setFormData({ titulo: item.titulo, ativo: item.ativo === 1, arquivo: null });
    setPreviewUrl(item.imagem_url.includes('.pdf') ? 'PDF' : item.imagem_url);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormData({ titulo: '', ativo: true, arquivo: null });
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openViewer = (url) => {
    if (!url) return;
    const isPdf = url.toLowerCase().includes('.pdf');
    setViewerContent({ type: isPdf ? 'pdf' : 'img', url });
    setViewerOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      {/* ── HEADER HERO ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-700/50 bg-slate-800/40 backdrop-blur-md pt-8 pb-10 px-6 sm:px-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <MegaphoneIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Comunicados Oficiais</h1>
              <p className="text-sm text-slate-400 mt-1">Mural digital da comunidade escolar</p>
            </div>
          </div>

          {canManage && !showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/20 active:scale-95"
            >
              <PlusIcon className="w-5 h-5" /> Nova Postagem
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 mt-8">
        {/* ── FORMULÁRIO DE GESTÃO (Se canManage e showForm) ───────────────────── */}
        {canManage && showForm && (
          <div className="mb-10 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm animate-fade-in-down">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Editar Postagem' : 'Criar Nova Postagem'}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-white transition">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6">
              {/* Image Preview / Upload Area */}
              <div 
                className="w-full md:w-64 h-48 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl === 'PDF' ? (
                  <div className="flex flex-col items-center justify-center">
                    <DocumentIcon className="w-12 h-12 text-rose-500 mb-2" />
                    <span className="text-xs font-semibold text-slate-300">Documento PDF</span>
                  </div>
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-sky-400 transition">
                    <PhotoIcon className="w-10 h-10 mb-2" />
                    <span className="text-xs font-medium">Clique para anexar imagem/PDF</span>
                  </div>
                )}
                
                {previewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40">
                    <span className="bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full">Trocar Arquivo</span>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                />
              </div>

              {/* Fields */}
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Título da Postagem</label>
                  <input
                    type="text"
                    placeholder="Ex: Reunião de Pais e Mestres"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
                    value={formData.titulo}
                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.ativo}
                      onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                  <span className="text-sm font-medium text-slate-300">{formData.ativo ? 'Publicado (Visível)' : 'Rascunho (Oculto)'}</span>
                </div>

                <div className="mt-auto flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-sky-500/20 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : 'Salvar Postagem'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── LISTAGEM (MURAL DE CARDS) ────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-500"></div>
          </div>
        ) : comunicados.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/20">
            <MegaphoneIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-300">Nenhum comunicado oficial</h3>
            <p className="text-sm text-slate-500 mt-1">
              {canManage ? 'Clique no botão acima para criar a primeira postagem.' : 'Nenhuma postagem foi feita pela direção.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {comunicados.map(c => {
              // Hide inactive for non-managers
              if (!canManage && c.ativo === 0) return null;
              const isPdf = c.imagem_url?.toLowerCase().includes('.pdf');

              return (
                <div 
                  key={c.id}
                  className={`group relative bg-slate-800 rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/10 ${c.ativo === 0 ? 'border-dashed border-slate-600 opacity-70 hover:opacity-100' : 'border-slate-700/60'}`}
                >
                  {/* Imagem / PDF Capa */}
                  <div 
                    className="w-full h-48 bg-slate-900 flex items-center justify-center cursor-pointer relative"
                    onClick={() => openViewer(c.imagem_url)}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-500/10 to-slate-900 text-rose-400">
                        <DocumentIcon className="w-12 h-12 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Documento PDF</span>
                      </div>
                    ) : (
                      <img src={c.imagem_url} alt={c.titulo} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                    )}

                    {/* Overlay de visualização */}
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition text-white bg-black/50 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm">
                        {isPdf ? 'Ler PDF' : 'Ampliar Imagem'}
                      </span>
                    </div>

                    {/* Badge Inativo */}
                    {c.ativo === 0 && (
                      <span className="absolute top-3 left-3 bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase shadow">Oculto</span>
                    )}
                  </div>

                  {/* Informações */}
                  <div className="p-5">
                    <h3 className="font-bold text-slate-100 text-[15px] leading-tight line-clamp-2 mb-2">
                      {c.titulo}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Publicado em {formatDate(c.criado_em)}
                    </p>
                  </div>

                  {/* Ações Gerenciais Flutuantes */}
                  {canManage && (
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => editItem(c)}
                        className="w-8 h-8 bg-slate-800/80 backdrop-blur-md rounded-full flex items-center justify-center text-sky-400 hover:text-white hover:bg-sky-500 transition shadow-lg"
                        title="Editar"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="w-8 h-8 bg-slate-800/80 backdrop-blur-md rounded-full flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500 transition shadow-lg"
                        title="Excluir"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── VIEWER MODAL (LIGHTBOX) ────────────────────────────────────────────── */}
      {viewerOpen && viewerContent && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 md:p-10 animate-fade-in">
          <button 
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition shadow-2xl"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          <div className="w-full h-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl relative flex items-center justify-center">
            {viewerContent.type === 'pdf' ? (
              <iframe 
                src={viewerContent.url} 
                className="w-full h-full border-none"
                title="Visualizador de PDF"
              />
            ) : (
              <img 
                src={viewerContent.url} 
                alt="Comunicado ampliado" 
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.4s ease-out forwards; }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}} />
    </div>
  );
}
