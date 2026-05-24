// src/features/biblioteca/leitor-destaque/LeitorDestaquePage.jsx
// ============================================================================
// Hub do Leitor Destaque: gerenciamento de resenhas, aprovações e vitrine
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const STATUS_OPTS = [
  { value: '', label: 'Todas' },
  { value: 'enviado', label: '📨 Enviadas' },
  { value: 'aprovado', label: '✅ Aprovadas' },
  { value: 'destaque', label: '⭐ Destaque' },
];

function ResenhaCard({ resenha, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const changeStatus = async (newStatus, pontuacao = 0) => {
    setLoading(true);
    try {
      await api.put(`/api/biblioteca/resenhas/${resenha.id}/status`, { status: newStatus, pontuacao });
      onStatusChange();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar status');
    } finally { setLoading(false); }
  };

  const stars = resenha.avaliacao || 0;

  return (
    <div
      className="rounded-2xl overflow-hidden transition"
      style={{
        background: '#fff',
        border: resenha.status === 'destaque'
          ? '2px solid rgba(251,191,36,0.5)'
          : '1px solid #e2e8f0',
        boxShadow: resenha.status === 'destaque'
          ? '0 8px 32px rgba(251,191,36,0.15)'
          : '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header da resenha */}
      <div className="p-4" style={{
        background: resenha.status === 'destaque'
          ? 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.05))'
          : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {resenha.status === 'destaque' && <span className="text-lg">⭐</span>}
              <p className="font-black text-slate-800">{resenha.aluno_nome}</p>
              <span className="text-xs text-slate-400">•</span>
              <p className="text-xs text-slate-500">{resenha.turma_nome || ''}</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#7c3aed' }}>📖 {resenha.livro_titulo}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
              background: {
                enviado: 'rgba(59,130,246,0.12)', aprovado: 'rgba(16,185,129,0.12)',
                destaque: 'rgba(251,191,36,0.2)', rascunho: 'rgba(100,116,139,0.1)',
              }[resenha.status] || 'rgba(100,116,139,0.1)',
              color: {
                enviado: '#1d4ed8', aprovado: '#059669',
                destaque: '#b45309', rascunho: '#64748b',
              }[resenha.status] || '#64748b',
            }}>
              {STATUS_OPTS.find(s => s.value === resenha.status)?.label || resenha.status}
            </span>
            {stars > 0 && (
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < stars ? '#f59e0b' : '#e2e8f0', fontSize: '0.8rem' }}>★</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-3">
        {resenha.resumo && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Resumo</p>
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{resenha.resumo}</p>
          </div>
        )}
        {resenha.resenha && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Resenha</p>
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">{resenha.resenha}</p>
          </div>
        )}
        {resenha.favorito && (
          <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #fdf4ff, #faf5ff)', border: '1px solid #e9d5ff' }}>
            <p className="text-xs font-bold text-purple-400 mb-1">✨ Trecho favorito</p>
            <p className="text-sm text-purple-800 italic leading-relaxed">"{resenha.favorito}"</p>
          </div>
        )}

        {/* Respostas JSON */}
        {resenha.respostas_json && (() => {
          try {
            const resps = typeof resenha.respostas_json === 'string'
              ? JSON.parse(resenha.respostas_json) : resenha.respostas_json;
            if (!Array.isArray(resps) || resps.length === 0) return null;
            return (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Perguntas respondidas</p>
                {resps.map((r, i) => (
                  <div key={i} className="p-2 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <p className="text-xs font-semibold text-slate-600 mb-0.5">{r.pergunta}</p>
                    <p className="text-xs text-slate-700">{r.resposta}</p>
                  </div>
                ))}
              </div>
            );
          } catch { return null; }
        })()}

        {/* Pontuação e ações */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
          <p className="text-xs text-slate-400">
            {new Date(resenha.criado_em).toLocaleDateString('pt-BR')}
            {resenha.pontuacao > 0 && <span className="ml-2 font-bold text-amber-600">🏆 {resenha.pontuacao} pts</span>}
          </p>
          <div className="flex gap-2">
            {resenha.status === 'enviado' && (
              <button onClick={() => changeStatus('aprovado', 10)} disabled={loading}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                ✅ Aprovar
              </button>
            )}
            {resenha.status === 'aprovado' && (
              <button onClick={() => changeStatus('destaque', 25)} disabled={loading}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                ⭐ Destacar
              </button>
            )}
            {resenha.status === 'destaque' && (
              <button onClick={() => changeStatus('aprovado', 10)} disabled={loading}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition"
                style={{ background: '#f1f5f9', color: '#64748b' }}>
                Remover destaque
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NovaResenhaModal({ onClose }) {
  const [livros, setLivros] = useState([]);
  const [buscaLivro, setBuscaLivro] = useState('');
  const [livroSel, setLivroSel] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunoSel, setAlunoSel] = useState(null);
  const [form, setForm] = useState({ resumo: '', resenha: '', favorito: '', avaliacao: 5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!buscaLivro) { setLivros([]); return; }
      const { data } = await api.get('/api/biblioteca/acervo', { params: { q: buscaLivro, limit: 6 } });
      setLivros(data.livros || []);
    }, 400);
    return () => clearTimeout(t);
  }, [buscaLivro]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!buscaAluno) { setAlunos([]); return; }
      // param correto é 'filtro'; campo de nome é 'estudante'
      const { data } = await api.get('/api/alunos', { params: { filtro: buscaAluno, limit: 6, status: 'ativo' } });
      const lista = (data.alunos || data || []).map(a => ({ ...a, nome: a.estudante || a.nome || '', turma_nome: a.turma || a.turma_nome || '' }));
      setAlunos(lista);
    }, 400);
    return () => clearTimeout(t);
  }, [buscaAluno]);

  const handleSave = async () => {
    if (!livroSel || !alunoSel) { setError('Selecione livro e aluno.'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/api/biblioteca/resenhas', {
        livro_id: livroSel.id, aluno_id: alunoSel.id,
        turma_id: alunoSel.turma_id || null,
        ...form, avaliacao: parseInt(form.avaliacao),
      });
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar resenha.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', animation: 'modalEntrada 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
        <div className="p-5 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #4c1d95, #6d28d9)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">✍️ Registrar Resenha</h2>
            <button onClick={() => onClose(false)} className="text-white/60 hover:text-white text-xl">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Livro */}
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-500">Livro</label>
            {livroSel ? (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fdf4ff', border: '1px solid #e9d5ff' }}>
                <span>📖</span>
                <p className="font-semibold text-sm flex-1 text-purple-900">{livroSel.titulo}</p>
                <button onClick={() => { setLivroSel(null); setBuscaLivro(''); }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input value={buscaLivro} onChange={e => setBuscaLivro(e.target.value)} placeholder="Buscar livro..." className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-purple-300" style={{ borderColor: '#e2e8f0' }} />
                {livros.length > 0 && (
                  <div className="absolute w-full mt-1 rounded-xl shadow-lg border z-10 overflow-hidden" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                    {livros.map(l => (
                      <button key={l.id} onClick={() => { setLivroSel(l); setLivros([]); setBuscaLivro(''); }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 border-b last:border-0">
                        <p className="font-semibold text-slate-800">{l.titulo}</p>
                        <p className="text-xs text-slate-400">{l.autor}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Aluno */}
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-500">Aluno</label>
            {alunoSel ? (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <span>👤</span>
                <p className="font-semibold text-sm flex-1 text-blue-900">{alunoSel.nome}</p>
                <button onClick={() => { setAlunoSel(null); setBuscaAluno(''); }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input value={buscaAluno} onChange={e => setBuscaAluno(e.target.value)} placeholder="Buscar aluno..." className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-purple-300" style={{ borderColor: '#e2e8f0' }} />
                {alunos.length > 0 && (
                  <div className="absolute w-full mt-1 rounded-xl shadow-lg border z-10 overflow-hidden" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                    {alunos.map(a => (
                      <button key={a.id} onClick={() => { setAlunoSel(a); setAlunos([]); setBuscaAluno(''); }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 border-b last:border-0">
                        <p className="font-semibold text-slate-800">{a.nome}</p>
                        <p className="text-xs text-slate-400">{a.turma_nome || ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Avaliação */}
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-500">Avaliação (estrelas)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} onClick={() => setForm(f => ({ ...f, avaliacao: v }))} className="text-2xl transition" style={{ color: v <= form.avaliacao ? '#f59e0b' : '#e2e8f0' }}>★</button>
              ))}
            </div>
          </div>

          {/* Resumo / Resenha / Favorito */}
          {[
            { key: 'resumo', label: 'Resumo do livro', rows: 3, placeholder: 'Escreva um resumo breve...' },
            { key: 'resenha', label: 'Resenha crítica', rows: 4, placeholder: 'O que achou do livro? O que mais gostou?' },
            { key: 'favorito', label: 'Trecho favorito', rows: 2, placeholder: 'Trecho que mais te marcou...' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold mb-1 text-slate-500">{f.label}</label>
              <textarea value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                rows={f.rows} placeholder={f.placeholder}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                style={{ borderColor: '#e2e8f0' }} />
            </div>
          ))}

          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">⚠️ {error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => onClose(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', color: '#475569' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: saving ? 'none' : '0 4px 12px rgba(124,58,237,0.3)' }}>
              {saving ? '⏳ Salvando...' : '✍️ Salvar resenha'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeitorDestaquePage() {
  const [resenhas, setResenhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('enviado');
  const [modalNova, setModalNova] = useState(false);

  const fetchResenhas = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFiltro) params.status = statusFiltro;
      const { data } = await api.get('/api/biblioteca/resenhas', { params });
      setResenhas(data.resenhas || []);
    } catch { setResenhas([]); }
    finally { setLoading(false); }
  }, [statusFiltro]);

  useEffect(() => { fetchResenhas(); }, [fetchResenhas]);

  const destaques = resenhas.filter(r => r.status === 'destaque');
  const outras = resenhas.filter(r => r.status !== 'destaque');

  return (
    <div className="animate-fadeIn">
      {/* Header premium */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, #92400e, #b45309, #d97706)', boxShadow: '0 8px 32px rgba(146,64,14,0.3)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">⭐</span>
              <h1 className="text-2xl font-black text-white">Leitor Destaque</h1>
            </div>
            <p className="text-amber-200 text-sm">Gerencie resenhas, aprove e destaque os melhores leitores</p>
          </div>
          <button onClick={() => setModalNova(true)} className="flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl text-white transition" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            ✍️ Nova Resenha
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_OPTS.map(opt => (
          <button key={opt.value} onClick={() => setStatusFiltro(opt.value)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: statusFiltro === opt.value ? 'linear-gradient(135deg, #d97706, #b45309)' : '#f1f5f9',
              color: statusFiltro === opt.value ? '#fff' : '#475569',
              boxShadow: statusFiltro === opt.value ? '0 2px 8px rgba(217,119,6,0.3)' : 'none',
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ border: '1px solid #f1f5f9' }}>
              <div className="h-4 bg-slate-100 rounded mb-3 w-1/2" />
              <div className="h-3 bg-slate-100 rounded mb-2" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : resenhas.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">✍️</p>
          <p className="text-slate-400 text-sm">Nenhuma resenha encontrada com esse filtro.</p>
        </div>
      ) : (
        <>
          {/* Destaques (só quando filtro = 'destaque' ou 'todos') */}
          {destaques.length > 0 && (
            <div className="mb-6">
              <h2 className="flex items-center gap-2 font-bold text-slate-700 mb-3">
                <span>⭐</span> Leitores em Destaque
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {destaques.map(r => <ResenhaCard key={r.id} resenha={r} onStatusChange={fetchResenhas} />)}
              </div>
            </div>
          )}
          {outras.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {outras.map(r => <ResenhaCard key={r.id} resenha={r} onStatusChange={fetchResenhas} />)}
            </div>
          )}
        </>
      )}

      {modalNova && <NovaResenhaModal onClose={(r) => { setModalNova(false); if (r) fetchResenhas(); }} />}
    </div>
  );
}
