import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

export default function BancoPerguntasPage() {
  const [livros, setLivros] = useState([]);
  const [buscaLivro, setBuscaLivro] = useState('');
  const [livroSel, setLivroSel] = useState(null);

  const [perguntas, setPerguntas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novaPergunta, setNovaPergunta] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [editTexto, setEditTexto] = useState('');

  // Busca de livros
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!buscaLivro) { setLivros([]); return; }
      try {
        const { data } = await api.get('/api/biblioteca/acervo', { params: { q: buscaLivro, limit: 10 } });
        setLivros(data.livros || []);
      } catch (err) {
        console.error(err);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [buscaLivro]);

  const fetchPerguntas = useCallback(async (livroId) => {
    if (!livroId) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/biblioteca/perguntas', { params: { todas: true, livro_id: livroId } });
      setPerguntas(data.perguntas || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (livroSel) {
      fetchPerguntas(livroSel.id);
    }
  }, [livroSel, fetchPerguntas]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novaPergunta.trim() || !livroSel) return;
    setSalvando(true);
    try {
      await api.post('/api/biblioteca/perguntas', {
        livro_id: livroSel.id,
        pergunta: novaPergunta,
        ordem: perguntas.length
      });
      setNovaPergunta('');
      fetchPerguntas(livroSel.id);
    } catch (err) {
      alert('Erro ao adicionar pergunta');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await api.put(`/api/biblioteca/perguntas/${p.id}`, { ativa: !p.ativa });
      fetchPerguntas(livroSel.id);
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta pergunta permanentemente?')) return;
    try {
      await api.delete(`/api/biblioteca/perguntas/${id}`);
      fetchPerguntas(livroSel.id);
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  const salvarEdicao = async () => {
    if (!editTexto.trim()) return;
    try {
      await api.put(`/api/biblioteca/perguntas/${editando.id}`, { pergunta: editTexto });
      setEditando(null);
      setEditTexto('');
      fetchPerguntas(livroSel.id);
    } catch (err) {
      alert('Erro ao editar');
    }
  };

  return (
    <div className="animate-fadeIn max-w-5xl mx-auto space-y-6">
      {/* Header Premium */}
      <div className="rounded-3xl p-8 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">📖</div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <span className="text-blue-400">📝</span> Banco de Perguntas
          </h1>
          <p className="text-slate-300 font-medium text-lg">Crie uma "prova de leitura" personalizada para cada livro do acervo.</p>
        </div>
      </div>

      {!livroSel ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Selecione uma Obra</h2>
            <p className="text-slate-500 text-sm">Busque o livro para o qual deseja cadastrar perguntas avaliativas.</p>
          </div>
          <div className="relative max-w-2xl mx-auto">
            <input 
              type="text" 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none text-slate-700 font-medium text-lg shadow-inner"
              placeholder="Digite o título do livro..." 
              value={buscaLivro} 
              onChange={e => setBuscaLivro(e.target.value)} 
            />
            <span className="absolute left-4 top-4 text-slate-400 text-2xl">🔍</span>

            {livros.length > 0 && (
              <div className="absolute w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20">
                {livros.map(l => (
                  <button 
                    key={l.id} 
                    onClick={() => { setLivroSel(l); setLivros([]); setBuscaLivro(''); }} 
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 text-left"
                  >
                    {l.capa_url ? (
                      <img src={l.capa_url} alt={l.titulo} className="w-12 h-16 object-cover rounded-md shadow" />
                    ) : (
                      <div className="w-12 h-16 bg-slate-200 rounded-md flex items-center justify-center text-xl">📘</div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800 text-lg leading-tight">{l.titulo}</p>
                      <p className="text-sm font-medium text-blue-600">{l.autor}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Detalhes do Livro (Experiência Premium) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center sticky top-6">
              <div className="relative w-40 h-56 mb-6">
                {livroSel.capa_url ? (
                  <img src={livroSel.capa_url} alt={livroSel.titulo} className="w-full h-full object-cover rounded-xl shadow-2xl" />
                ) : (
                  <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center text-5xl shadow-2xl">📖</div>
                )}
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-1">{livroSel.titulo}</h2>
              <p className="text-blue-600 font-bold text-sm mb-4">{livroSel.autor}</p>
              
              <div className="w-full space-y-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                {livroSel.editora && <div className="flex justify-between"><span className="text-slate-500">Editora</span><span className="font-semibold text-slate-700">{livroSel.editora}</span></div>}
                {livroSel.ano && <div className="flex justify-between"><span className="text-slate-500">Ano</span><span className="font-semibold text-slate-700">{livroSel.ano}</span></div>}
                {livroSel.isbn && <div className="flex justify-between"><span className="text-slate-500">ISBN</span><span className="font-semibold text-slate-700">{livroSel.isbn}</span></div>}
              </div>

              <button 
                onClick={() => { setLivroSel(null); setPerguntas([]); }}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition"
              >
                ← Escolher outro livro
              </button>
            </div>
          </div>

          {/* Coluna Direita: Gerenciamento de Perguntas */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-blue-500">➕</span> Nova Pergunta Avaliativa
              </h3>
              <form onSubmit={handleAdd} className="flex gap-3">
                <input
                  type="text"
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none transition"
                  placeholder="Ex: Qual o conflito principal vivido pelo protagonista?"
                  value={novaPergunta}
                  onChange={(e) => setNovaPergunta(e.target.value)}
                  disabled={salvando}
                />
                <button
                  type="submit"
                  disabled={salvando || !novaPergunta.trim()}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-600/20"
                >
                  {salvando ? '...' : 'Salvar'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">📋 Perguntas Cadastradas</h3>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{perguntas.length} questões</span>
              </div>
              
              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-500 font-medium">Carregando avaliação...</p>
                </div>
              ) : perguntas.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="text-6xl block mb-4 opacity-50">📝</span>
                  <h3 className="text-xl font-bold text-slate-700 mb-1">Avaliação não configurada</h3>
                  <p className="text-slate-500">Este livro ainda não possui perguntas específicas. Adicione a primeira acima!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {perguntas.map((p, idx) => (
                    <div key={p.id} className={`p-6 flex items-start gap-4 transition ${!p.ativa ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                      <div className="mt-1">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-black shadow-sm ${p.ativa ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                          {idx + 1}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        {editando?.id === p.id ? (
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700"
                              value={editTexto}
                              onChange={(e) => setEditTexto(e.target.value)}
                              autoFocus
                            />
                            <button onClick={salvarEdicao} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow">Salvar</button>
                            <button onClick={() => setEditando(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg">Cancelar</button>
                          </div>
                        ) : (
                          <p className={`text-slate-800 font-semibold text-lg leading-snug mb-3 ${!p.ativa ? 'line-through text-slate-400' : ''}`}>
                            {p.pergunta}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <button
                            onClick={() => handleToggle(p)}
                            className={p.ativa ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}
                          >
                            {p.ativa ? 'Desativar' : 'Reativar'}
                          </button>
                          <span className="text-slate-200">|</span>
                          <button onClick={() => { setEditando(p); setEditTexto(p.pergunta); }} className="text-blue-600 hover:text-blue-700">
                            Editar
                          </button>
                          <span className="text-slate-200">|</span>
                          <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600">
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div>
                        {p.ativa ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 border border-green-200">Ativa</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 border border-slate-300">Inativa</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
