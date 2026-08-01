import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

export default function BancoPerguntasPage() {
  const [perguntas, setPerguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novaPergunta, setNovaPergunta] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [editTexto, setEditTexto] = useState('');

  const fetchPerguntas = useCallback(async () => {
    setLoading(true);
    try {
      // { todas: true } para trazer inativas
      const { data } = await api.get('/api/biblioteca/perguntas', { params: { todas: true } });
      setPerguntas(data.perguntas || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerguntas();
  }, [fetchPerguntas]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novaPergunta.trim()) return;
    setSalvando(true);
    try {
      await api.post('/api/biblioteca/perguntas', {
        pergunta: novaPergunta,
        ordem: perguntas.length
      });
      setNovaPergunta('');
      fetchPerguntas();
    } catch (err) {
      alert('Erro ao adicionar pergunta');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await api.put(`/api/biblioteca/perguntas/${p.id}`, { ativa: !p.ativa });
      fetchPerguntas();
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta pergunta permanentemente? O histórico não será perdido, mas ela não aparecerá mais em novas resenhas.')) return;
    try {
      await api.delete(`/api/biblioteca/perguntas/${id}`);
      fetchPerguntas();
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
      fetchPerguntas();
    } catch (err) {
      alert('Erro ao editar');
    }
  };

  return (
    <div className="animate-fadeIn max-w-4xl mx-auto">
      {/* Header Premium */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, #1e293b, #334155, #475569)', boxShadow: '0 8px 32px rgba(30,41,59,0.3)' }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">📝</span>
          <h1 className="text-2xl font-black text-white">Banco de Perguntas</h1>
        </div>
        <p className="text-slate-300 text-sm">Gerencie as perguntas que os alunos deverão responder ao enviar uma resenha.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Qual o ensinamento principal do livro?"
            value={novaPergunta}
            onChange={(e) => setNovaPergunta(e.target.value)}
            disabled={salvando}
          />
          <button
            type="submit"
            disabled={salvando || !novaPergunta.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {salvando ? 'Adicionando...' : '+ Adicionar'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Carregando perguntas...
          </div>
        ) : perguntas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-5xl block mb-4">🤷‍♂️</span>
            Nenhuma pergunta cadastrada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {perguntas.map((p, idx) => (
              <div key={p.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition">
                <div className="mt-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {idx + 1}
                  </span>
                </div>
                
                <div className="flex-1">
                  {editando?.id === p.id ? (
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={editTexto}
                        onChange={(e) => setEditTexto(e.target.value)}
                        autoFocus
                      />
                      <button onClick={salvarEdicao} className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg">Salvar</button>
                      <button onClick={() => setEditando(null)} className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg">Cancelar</button>
                    </div>
                  ) : (
                    <p className={`text-slate-800 font-medium ${!p.ativa ? 'line-through text-slate-400' : ''}`}>
                      {p.pergunta}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                    <button
                      onClick={() => handleToggle(p)}
                      className={p.ativa ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}
                    >
                      {p.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button onClick={() => { setEditando(p); setEditTexto(p.pergunta); }} className="text-blue-500 hover:text-blue-600">
                      Editar
                    </button>
                    <span className="text-slate-300">•</span>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600">
                      Excluir
                    </button>
                  </div>
                </div>

                <div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.ativa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
