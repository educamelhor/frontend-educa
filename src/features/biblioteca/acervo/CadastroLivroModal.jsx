// src/features/biblioteca/acervo/CadastroLivroModal.jsx
// ============================================================================
// Modal de cadastro/edição de livro com ISBN lookup (Google Books API)
// Upload de imagem de capa + preview em tempo real
// ============================================================================
import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';

const CATEGORIAS = [
  { value: 'infantil', label: '🧒 Infantil' },
  { value: 'juvenil', label: '📗 Juvenil' },
  { value: 'adulto', label: '📘 Adulto' },
  { value: 'didatico', label: '📚 Didático' },
  { value: 'paradidatico', label: '📖 Paradidático' },
  { value: 'referencia', label: '🗂️ Referência' },
  { value: 'outro', label: '📦 Outro' },
];

function InputField({ label, name, value, onChange, type = 'text', placeholder, required, disabled }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300 transition disabled:opacity-50"
        style={{ borderColor: '#e2e8f0', background: disabled ? '#f8fafc' : '#fff', color: '#1e293b' }}
      />
    </div>
  );
}

export default function CadastroLivroModal({ livro, onClose }) {
  const isEdit = !!livro;
  const [form, setForm] = useState({
    titulo: '',
    autor: '',
    isbn: '',
    editora: '',
    ano_publicacao: '',
    genero: '',
    categoria: 'juvenil',
    sinopse: '',
    num_paginas: '',
    exemplares: 1,
    capa_url: '',
  });
  const [capaPreview, setCapaPreview] = useState(null);
  const [capaFile, setCapaFile] = useState(null);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnMsg, setIsbnMsg] = useState('');
  const [isbnBloqueado, setIsbnBloqueado] = useState(false); // livro já no catálogo universal
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (livro) {
      setForm({
        titulo: livro.titulo || '',
        autor: livro.autor || '',
        isbn: livro.isbn || '',
        editora: livro.editora || '',
        ano_publicacao: livro.ano_publicacao || '',
        genero: livro.genero || '',
        categoria: livro.categoria || 'juvenil',
        sinopse: livro.sinopse || '',
        num_paginas: livro.num_paginas || '',
        exemplares: livro.exemplares || 1,
        capa_url: livro.capa_url || '',
      });
      if (livro.capa_url) setCapaPreview(livro.capa_url);
    }
  }, [livro]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // ── Lookup ISBN: BD local → Google Books → Open Library → manual —————————
  // Aceita ISBN com ou sem traços (ex: 978-85-465-0145-8)
  const lookupISBN = async () => {
    const isbn = form.isbn.trim().replace(/[-\s]/g, '');
    if (!isbn || isbn.length < 10) {
      setIsbnMsg('⚠️ Digite um ISBN válido (10 ou 13 dígitos) — traços são aceitos');
      return;
    }
    setIsbnLoading(true);
    setIsbnMsg('🔍 Verificando no catálogo...');
    setIsbnBloqueado(false);

    // Helper: extrai apenas 4 dígitos do ano (Google Books retorna "Feb 2024", "2024-02", etc.)
    const limparAno = (v) => {
      if (!v) return '';
      const m = String(v).match(/\d{4}/);
      return m ? m[0] : '';
    };

    // Helper: aplica dados ao formulário
    const aplicarDados = (titulo, autor, editora, ano, sinopse, paginas, genero, capa, bloquear = false) => {
      setForm(f => ({
        ...f,
        titulo:         titulo    || f.titulo,
        autor:          autor     || f.autor,
        editora:        editora   || f.editora,
        ano_publicacao: limparAno(ano) || f.ano_publicacao,
        sinopse:        sinopse   || f.sinopse,
        num_paginas:    paginas   || f.num_paginas,
        genero:         genero    || f.genero,
        capa_url:       capa      || f.capa_url,
      }));
      if (capa) setCapaPreview(capa);
      if (bloquear) setIsbnBloqueado(true);
    };

    // ── TENTATIVA 1: BD local (catálogo universal) ────────────────────────────────────
    try {
      const { data: localData } = await api.get(`/api/biblioteca/acervo/buscar-isbn/${isbn}`);
      if (localData?.encontrado && localData.livro) {
        const l = localData.livro;
        const capa = l.capa_url?.startsWith('http') ? l.capa_url : l.capa_url ? undefined : undefined;
        aplicarDados(l.titulo, l.autor, l.editora, l.ano_publicacao, l.sinopse,
          l.num_paginas, l.genero, l.capa_url, true);
        const jaTemEstoque = localData.estoque?.ativo;
        setIsbnMsg(
          jaTemEstoque
            ? '✅ Livro já no seu acervo! Informe a quantidade de exemplares adicionais.'
            : '✅ Livro encontrado no catálogo universal! Metadados preenchidos. Informe os exemplares e cadastre.'
        );
        setIsbnLoading(false);
        return;
      }
    } catch {
      // BD local não acessível — continua para APIs externas
    }

    // ── TENTATIVA 2: Google Books ───────────────────────────────────────────────
    setIsbnMsg('🔍 Consultando Google Books...');
    try {
      for (const url of [
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1&langRestrict=pt`,
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`,
      ]) {
        const gbResp = await fetch(url);
        const gbData = await gbResp.json();
        if (gbData.items?.length > 0) {
          const info = gbData.items[0].volumeInfo;
          const capa = info.imageLinks?.thumbnail?.replace('http://', 'https://')
            || info.imageLinks?.smallThumbnail?.replace('http://', 'https://');
          aplicarDados(info.title, info.authors?.join(', '), info.publisher,
            info.publishedDate, info.description, info.pageCount, info.categories?.[0], capa);
          setIsbnMsg('✅ Encontrado via Google Books!');
          setIsbnLoading(false);
          return;
        }
      }
    } catch { /* continua */ }

    // ── TENTATIVA 3: Open Library ──────────────────────────────────────────────
    setIsbnMsg('🔍 Tentando Open Library...');
    try {
      const olResp = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const olData = await olResp.json();
      const chave  = `ISBN:${isbn}`;
      if (olData[chave]) {
        const l = olData[chave];
        const capa = l.cover?.large || l.cover?.medium || l.cover?.small;
        aplicarDados(l.title, l.authors?.map(a => a.name).join(', '),
          l.publishers?.map(p => p.name).join(', '), l.publish_date,
          l.notes || '', l.number_of_pages, l.subjects?.[0]?.name, capa);
        setIsbnMsg('✅ Encontrado via Open Library!');
        setIsbnLoading(false);
        return;
      }
    } catch { /* nenhuma fonte encontrou */ }

    // ── Não encontrado ─────────────────────────────────────────────────────────────
    setIsbnMsg(
      `❌ ISBN ${isbn} não encontrado em nenhuma base.\nPreencha os dados manualmente e cadastre normalmente.`
    );
    setIsbnLoading(false);
  };

  // ── Upload de capa ──────────────────────────────────────────────────────────
  const handleCapaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCapaFile(file);
    const reader = new FileReader();
    reader.onload = ev => setCapaPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Salvar ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) { setError('Título é obrigatório.'); return; }
    setSaving(true);
    setError('');
    try {
      let savedId = livro?.id;
      if (isEdit) {
        await api.put(`/api/biblioteca/acervo/${livro.id}`, form);
      } else {
        const { data } = await api.post('/api/biblioteca/acervo', form);
        savedId = data.livro?.id;
      }
      // Upload de capa se escolheu arquivo
      if (capaFile && savedId) {
        const fd = new FormData();
        fd.append('capa', capaFile);
        await api.post(`/api/biblioteca/acervo/${savedId}/capa`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar livro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: '#fff',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          animation: 'modalEntrada 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Header */}
        <div
          className="p-6 rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                {isEdit ? '✏️ Editar Livro' : '📚 Cadastrar Livro'}
              </h2>
              <p className="text-emerald-200 text-sm mt-0.5">
                {isEdit ? 'Atualize as informações do livro' : 'Preencha os dados ou use o ISBN para preenchimento automático'}
              </p>
            </div>
            <button
              onClick={() => onClose(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ISBN + Lookup */}
          <div
            className="rounded-xl p-4"
            style={{
              background: isbnBloqueado
                ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                : 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
              border: isbnBloqueado ? '1px solid #93c5fd' : '1px solid #bbf7d0',
            }}
          >
            <label className="block text-xs font-bold mb-2" style={{ color: isbnBloqueado ? '#1d4ed8' : '#065f46' }}>
              {isbnBloqueado
                ? '📚 Catálogo universal — metadados preenchidos automaticamente'
                : '🔍 Pesquisa por ISBN — Google Books • Open Library • Catálogo próprio'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="isbn"
                value={form.isbn}
                onChange={e => { handleChange(e); setIsbnBloqueado(false); setIsbnMsg(''); }}
                placeholder="Digite o ISBN (ex: 9788535902778 ou com traços)"
                className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300"
                style={{ borderColor: isbnBloqueado ? '#93c5fd' : '#86efac', background: '#fff', color: '#1e293b' }}
              />
              <button
                type="button"
                onClick={lookupISBN}
                disabled={isbnLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition"
                style={{
                  background: isbnLoading ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isbnLoading ? '⏳ Buscando...' : '🔍 Buscar'}
              </button>
            </div>
            {isbnMsg && (
              <p
                className="text-xs mt-2 font-medium"
                style={{
                  color: isbnMsg.startsWith('✅') ? '#059669'
                       : isbnMsg.startsWith('🔍') ? '#2563eb'
                       : '#dc2626',
                  whiteSpace: 'pre-line',
                }}
              >
                {isbnMsg}
              </p>
            )}
            {isbnBloqueado && (
              <p className="text-xs mt-1 text-blue-600 font-medium">
                🔒 Dados do catálogo universal. Apenas <strong>exemplares</strong> e <strong>categoria</strong> são editados pela escola.
              </p>
            )}
          </div>

          {/* Capa */}
          <div className="flex gap-4 items-start">
            <div
              className="w-24 h-32 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer"
              style={{
                background: capaPreview ? undefined : 'linear-gradient(135deg, #064e3b, #047857)',
                border: '2px dashed rgba(16,185,129,0.4)',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {capaPreview ? (
                <img src={capaPreview} alt="Capa" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs mt-1">Capa</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Imagem de capa</p>
              <p className="text-xs text-slate-400">Clique na imagem ao lado para escolher um arquivo, ou o ISBN preencherá automaticamente.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                Escolher arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCapaChange}
              />
            </div>
          </div>

          {/* Campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <InputField label="Título" name="titulo" value={form.titulo} onChange={handleChange} required placeholder="Título do livro" />
            </div>
            <InputField label="Autor(es)" name="autor" value={form.autor} onChange={handleChange} placeholder="Nome do autor" />
            <InputField label="Editora" name="editora" value={form.editora} onChange={handleChange} placeholder="Nome da editora" />
            <InputField label="Ano de publicação" name="ano_publicacao" value={form.ano_publicacao} onChange={handleChange} type="number" placeholder="2024" />
            <InputField label="Nº de páginas" name="num_paginas" value={form.num_paginas} onChange={handleChange} type="number" placeholder="200" />
            <InputField label="Gênero / Assunto" name="genero" value={form.genero} onChange={handleChange} placeholder="Ex: Ficção científica" />
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Categoria</label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300"
                style={{ borderColor: '#e2e8f0', background: '#fff', color: '#1e293b' }}
              >
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <InputField label="Quantidade de exemplares" name="exemplares" value={form.exemplares} onChange={handleChange} type="number" required />
          </div>

          {/* Sinopse */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Sinopse</label>
            <textarea
              name="sinopse"
              value={form.sinopse}
              onChange={handleChange}
              rows={4}
              placeholder="Resumo do livro..."
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              style={{ borderColor: '#e2e8f0', background: '#fff', color: '#1e293b' }}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: '#f1f5f9', color: '#475569' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition"
              style={{
                background: saving ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: saving ? 'none' : '0 4px 12px rgba(16,185,129,0.4)',
              }}
            >
              {saving ? '⏳ Salvando...' : isEdit ? '💾 Salvar alterações' : '📚 Cadastrar livro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
