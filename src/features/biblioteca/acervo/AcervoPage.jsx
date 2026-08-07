// src/features/biblioteca/acervo/AcervoPage.jsx
// ============================================================================
// Catálogo premium de livros com busca, filtros, cards com capa e ISBN lookup
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';
import CadastroLivroModal from './CadastroLivroModal';

// ── Ícones SVG inline (sem dependência extra) ─────────────────────────────────
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IconPlus = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const IconBook = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const IconFilter = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CATEGORIAS = [
  { value: '', label: 'Todas as categorias' },
  { value: 'infantil', label: '🧒 Infantil' },
  { value: 'juvenil', label: '📗 Juvenil' },
  { value: 'adulto', label: '📘 Adulto' },
  { value: 'didatico', label: '📚 Didático' },
  { value: 'paradidatico', label: '📖 Paradidático' },
  { value: 'referencia', label: '🗂️ Referência' },
  { value: 'outro', label: '📦 Outro' },
];

function LivroCard({ livro, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const disponivel = livro.exemplares_disponiveis > 0;

  const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    if (envUrl) return String(envUrl).replace(/\/api$/, '').replace(/\/$/, '');
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (isLocal) return 'http://localhost:3000';
    return 'https://educa-backend-docker-659zo.ondigitalocean.app';
  };

  const capaUrl = livro.capa_url
    ? (livro.capa_url.startsWith('http') ? livro.capa_url : `${getApiBaseUrl()}${livro.capa_url}`)
    : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: hovered
          ? '0 20px 60px rgba(16,185,129,0.2), 0 0 0 1px rgba(16,185,129,0.3)'
          : '0 4px 20px rgba(0,0,0,0.3)',
        transform: hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Capa */}
      <div className="relative h-52 overflow-hidden">
        {capaUrl ? (
          <img
            src={capaUrl}
            alt={livro.titulo}
            className="w-full h-full object-cover"
            style={{ filter: hovered ? 'brightness(0.85)' : 'brightness(0.7)', transition: 'filter 0.3s' }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.3)' }}>
              <IconBook />
            </div>
            <p className="text-white/40 text-xs mt-2 px-3 text-center font-medium">{livro.titulo}</p>
          </div>
        )}

        {/* Badge disponibilidade */}
        <div className="absolute top-2 right-2">
          <span
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{
              background: disponivel
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            {disponivel ? `${livro.exemplares_disponiveis} disp.` : 'Esgotado'}
          </span>
        </div>

        {/* Overlay botões editar/excluir */}
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(livro); }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-transform hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#0f172a' }}
            >
              <IconEdit /> Editar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(livro); }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-transform hover:scale-105"
              style={{ background: '#ef4444', color: '#fff' }}
              title="Inativar livro na escola"
            >
              <IconTrash />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="font-bold text-sm leading-tight mb-1"
          style={{ color: '#f1f5f9', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {livro.titulo}
        </h3>
        {livro.autor && (
          <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>
            {livro.autor}
          </p>
        )}
        {livro.local_estante && (
          <p className="text-xs mb-2 font-medium" style={{ color: '#0d9488' }}>
            📍 {livro.local_estante}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            {CATEGORIAS.find(c => c.value === livro.categoria)?.label?.split(' ').slice(1).join(' ') || livro.categoria}
          </span>
          <div className="flex items-center gap-1">
            {livro.total_resenhas > 0 && (
              <span className="text-xs" style={{ color: '#f59e0b' }}>
                ✍️ {livro.total_resenhas}
              </span>
            )}
            <span className="text-xs" style={{ color: '#64748b' }}>
              {livro.exemplares} ex.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcervoPage() {
  const [livros, setLivros] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [disponivelFiltro, setDisponivelFiltro] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const searchTimer = useRef(null);
  const LIMIT = 24;

  const fetchLivros = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (busca) params.q = busca;
      if (categoria) params.categoria = categoria;
      if (disponivelFiltro) params.disponivel = '1';
      const { data } = await api.get('/api/biblioteca/acervo', { params });
      setLivros(data.livros || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erro ao carregar acervo:', err);
    } finally {
      setLoading(false);
    }
  }, [busca, categoria, disponivelFiltro]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchLivros(1);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [busca, categoria, disponivelFiltro]);

  const handleEdit = (livro) => {
    setEditando(livro);
    setModalOpen(true);
  };

  const handleModalClose = (refresh) => {
    setModalOpen(false);
    setEditando(null);
    if (refresh) fetchLivros(page);
  };

  const handleDelete = async (livro) => {
    if (window.confirm(`Tem certeza que deseja inativar o livro "${livro.titulo}" do seu acervo escolar? O histórico de empréstimos será mantido.`)) {
      try {
        await api.delete(`/api/biblioteca/acervo/${livro.id}`);
        fetchLivros(page);
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao inativar livro.');
      }
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0d9488 100%)',
          boxShadow: '0 8px 32px rgba(6,78,59,0.3)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">📚</span>
              <h1 className="text-2xl font-black text-white tracking-tight">Acervo da Biblioteca</h1>
            </div>
            <p className="text-emerald-200 text-sm">
              {total > 0 ? `${total} título${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}` : 'Nenhum livro cadastrado ainda'}
            </p>
          </div>
          <button
            onClick={() => { setEditando(null); setModalOpen(true); }}
            className="flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl transition-all"
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <IconPlus /> Cadastrar Livro
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div
        className="rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {/* Busca */}
        <div className="relative flex-1 min-w-52">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </div>
          <input
            type="text"
            placeholder="Buscar por título, autor ou ISBN..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300"
            style={{ borderColor: '#cbd5e1', background: '#fff', color: '#1e293b' }}
          />
        </div>

        {/* Categoria */}
        <div className="flex items-center gap-2">
          <IconFilter />
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            className="py-2.5 px-3 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300"
            style={{ borderColor: '#cbd5e1', background: '#fff', color: '#1e293b' }}
          >
            {CATEGORIAS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Disponível */}
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 select-none">
          <div
            onClick={() => setDisponivelFiltro(v => !v)}
            className="w-10 h-5 rounded-full relative transition-colors cursor-pointer"
            style={{ background: disponivelFiltro ? '#10b981' : '#cbd5e1' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
              style={{ left: disponivelFiltro ? '22px' : '2px' }}
            />
          </div>
          Só disponíveis
        </label>
      </div>

      {/* Grid de livros */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
              <div className="h-52 bg-slate-200" />
              <div className="p-3 bg-slate-100">
                <div className="h-3 bg-slate-200 rounded mb-2" />
                <div className="h-2 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : livros.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">📚</p>
          <h3 className="text-xl font-bold text-slate-600 mb-2">Acervo vazio</h3>
          <p className="text-slate-400 text-sm mb-6">
            {busca || categoria ? 'Nenhum livro encontrado com esses filtros.' : 'Comece cadastrando o primeiro livro da biblioteca.'}
          </p>
          {!busca && !categoria && (
            <button
              onClick={() => { setEditando(null); setModalOpen(true); }}
              className="inline-flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <IconPlus /> Cadastrar primeiro livro
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
            {livros.map(livro => (
              <LivroCard key={livro.id} livro={livro} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => { setPage(p => p - 1); fetchLivros(page - 1); }}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: page === 1 ? '#f1f5f9' : '#10b981',
                  color: page === 1 ? '#94a3b8' : '#fff',
                }}
              >
                ← Anterior
              </button>
              <span className="text-sm text-slate-500 font-medium">{page} / {totalPages}</span>
              <button
                onClick={() => { setPage(p => p + 1); fetchLivros(page + 1); }}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: page === totalPages ? '#f1f5f9' : '#10b981',
                  color: page === totalPages ? '#94a3b8' : '#fff',
                }}
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de cadastro/edição */}
      {modalOpen && (
        <CadastroLivroModal
          livro={editando}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
