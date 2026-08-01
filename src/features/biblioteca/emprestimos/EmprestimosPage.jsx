// src/features/biblioteca/emprestimos/EmprestimosPage.jsx
// ============================================================================
// Controle de empréstimos com controle de estoque físico
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const STATUS_MAP = {
  ativo: { label: 'Ativo', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  devolvido: { label: 'Devolvido', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  atrasado: { label: 'Atrasado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function NovoEmprestimoModal({ onClose }) {
  const [busca, setBusca] = useState('');
  const [livros, setLivros] = useState([]);
  const [livroSel, setLivroSel] = useState(null);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunos, setAlunos] = useState([]);
  const [alunoSel, setAlunoSel] = useState(null);
  const [dataDev, setDataDev] = useState('');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const searchLivros = useCallback(async (q) => {
    if (!q) { setLivros([]); return; }
    try {
      const { data } = await api.get('/api/biblioteca/acervo', { params: { q, disponivel: '1', limit: 8 } });
      setLivros(data.livros || []);
    } catch { setLivros([]); }
  }, []);

  const searchAlunos = useCallback(async (q) => {
    if (!q) { setAlunos([]); return; }
    try {
      // param correto é 'filtro'; campo de nome é 'estudante'
      const { data } = await api.get('/api/alunos', { params: { filtro: q, limit: 8, status: 'ativo' } });
      const lista = (data.alunos || data || []).map(a => ({ ...a, nome: a.estudante || a.nome || '', turma_nome: a.turma || a.turma_nome || '' }));
      setAlunos(lista);
    } catch { setAlunos([]); }
  }, []);

  useEffect(() => { const t = setTimeout(() => searchLivros(busca), 400); return () => clearTimeout(t); }, [busca]);
  useEffect(() => { const t = setTimeout(() => searchAlunos(buscaAluno), 400); return () => clearTimeout(t); }, [buscaAluno]);

  const handleSalvar = async () => {
    if (!livroSel || !alunoSel) { setError('Selecione livro e aluno.'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/api/biblioteca/emprestimos', {
        livro_id: livroSel.id,
        aluno_id: alunoSel.id,
        data_prevista_devolucao: dataDev || null,
        observacao: obs || null,
      });
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar empréstimo.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', animation: 'modalEntrada 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
        <div className="p-5 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">📋 Novo Empréstimo</h2>
            <button onClick={() => onClose(false)} className="text-white/60 hover:text-white text-xl">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Livro */}
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-500">Livro (disponíveis)</label>
            {livroSel ? (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <span className="text-2xl">📗</span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-800">{livroSel.titulo}</p>
                  <p className="text-xs text-slate-500">{livroSel.autor} · {livroSel.exemplares_disponiveis} disponíveis</p>
                </div>
                <button onClick={() => { setLivroSel(null); setBusca(''); }} className="text-xs text-red-400 hover:text-red-600">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar livro..." className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-blue-300" style={{ borderColor: '#e2e8f0' }} />
                {livros.length > 0 && (
                  <div className="absolute w-full mt-1 rounded-xl shadow-lg border z-10 overflow-hidden" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                    {livros.map(l => (
                      <button key={l.id} onClick={() => { setLivroSel(l); setLivros([]); setBusca(''); }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b last:border-0 transition" style={{ borderColor: '#f1f5f9' }}>
                        <p className="font-semibold text-slate-800">{l.titulo}</p>
                        <p className="text-xs text-slate-400">{l.autor} · {l.exemplares_disponiveis} disponível(eis)</p>
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
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <span className="text-2xl">👤</span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-800">{alunoSel.nome}</p>
                  <p className="text-xs text-slate-500">{alunoSel.turma_nome || alunoSel.turma || ''}</p>
                </div>
                <button onClick={() => { setAlunoSel(null); setBuscaAluno(''); }} className="text-xs text-red-400 hover:text-red-600">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input value={buscaAluno} onChange={e => setBuscaAluno(e.target.value)} placeholder="Buscar aluno..." className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-blue-300" style={{ borderColor: '#e2e8f0' }} />
                {alunos.length > 0 && (
                  <div className="absolute w-full mt-1 rounded-xl shadow-lg border z-10 overflow-hidden" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                    {alunos.map(a => (
                      <button key={a.id} onClick={() => { setAlunoSel(a); setAlunos([]); setBuscaAluno(''); }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b last:border-0 transition" style={{ borderColor: '#f1f5f9' }}>
                        <p className="font-semibold text-slate-800">{a.nome}</p>
                        <p className="text-xs text-slate-400">{a.turma_nome || a.turma || ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data prevista */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-500">Data prevista de devolução</label>
              <input type="date" value={dataDev} onChange={e => setDataDev(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-blue-300" style={{ borderColor: '#e2e8f0' }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-500">Observação</label>
              <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-blue-300" style={{ borderColor: '#e2e8f0' }} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">⚠️ {error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => onClose(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', color: '#475569' }}>Cancelar</button>
            <button onClick={handleSalvar} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8, #1e40af)', boxShadow: saving ? 'none' : '0 4px 12px rgba(29,78,216,0.3)' }}>
              {saving ? '⏳ Registrando...' : '📋 Registrar empréstimo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmprestimosPage() {
  const [emprestimos, setEmprestimos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('ativo');
  const [modalNovo, setModalNovo] = useState(false);
  const [devolvendo, setDevolvendo] = useState(null);

  const fetchEmprestimos = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFiltro) params.status = statusFiltro;
      const { data } = await api.get('/api/biblioteca/emprestimos', { params });
      setEmprestimos(data.emprestimos || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [statusFiltro]);

  useEffect(() => { fetchEmprestimos(); }, [fetchEmprestimos]);

  const handleDevolver = async (id) => {
    setDevolvendo(id);
    try {
      await api.put(`/api/biblioteca/emprestimos/${id}/devolver`, {});
      fetchEmprestimos();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar devolução');
    } finally { setDevolvendo(null); }
  };

  const handleRenovar = async (id) => {
    const dias = window.prompt('Quantos dias a mais para devolução?', '7');
    if (dias === null) return;
    const qtd = parseInt(dias, 10);
    if (isNaN(qtd) || qtd <= 0) return alert('Quantidade de dias inválida');
    
    setDevolvendo(id);
    try {
      await api.put(`/api/biblioteca/emprestimos/${id}/renovar`, { dias_adicionais: qtd });
      fetchEmprestimos();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao renovar empréstimo');
    } finally { setDevolvendo(null); }
  };

  const isAtrasado = (emp) => {
    if (emp.status !== 'ativo' || !emp.data_prevista_devolucao) return false;
    return new Date(emp.data_prevista_devolucao) < new Date();
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8, #2563eb)', boxShadow: '0 8px 32px rgba(30,58,138,0.3)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">📋</span>
              <h1 className="text-2xl font-black text-white">Empréstimos</h1>
            </div>
            <p className="text-blue-200 text-sm">{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl text-white transition" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            ＋ Novo Empréstimo
          </button>
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { value: '', label: 'Todos' },
          { value: 'ativo', label: '🟢 Ativos' },
          { value: 'atrasado', label: '🔴 Atrasados' },
          { value: 'devolvido', label: '⚫ Devolvidos' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setStatusFiltro(opt.value)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: statusFiltro === opt.value ? 'linear-gradient(135deg, #1d4ed8, #1e40af)' : '#f1f5f9',
              color: statusFiltro === opt.value ? '#fff' : '#475569',
              boxShadow: statusFiltro === opt.value ? '0 2px 8px rgba(29,78,216,0.3)' : 'none',
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
              {['Livro', 'Aluno', 'Turma', 'Empréstimo', 'Devolução prevista', 'Status', 'Ação'].map(h => (
                <th key={h} className="text-left text-xs font-bold py-3 px-4" style={{ color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-t" style={{ borderColor: '#f1f5f9' }}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="py-3 px-4"><div className="h-3 bg-slate-100 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : emprestimos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                  📋 Nenhum empréstimo encontrado
                </td>
              </tr>
            ) : emprestimos.map(emp => {
              const atrasado = isAtrasado(emp);
              const statusDisplay = atrasado ? STATUS_MAP.atrasado : STATUS_MAP[emp.status] || STATUS_MAP.ativo;
              return (
                <tr key={emp.id} className="border-t hover:bg-slate-50 transition" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-sm text-slate-800 max-w-44 truncate">{emp.livro_titulo}</p>
                    {emp.livro_autor && <p className="text-xs text-slate-400">{emp.livro_autor}</p>}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{emp.aluno_nome}</td>
                  <td className="py-3 px-4 text-sm text-slate-500">{emp.turma_nome || '—'}</td>
                  <td className="py-3 px-4 text-sm text-slate-500">{new Date(emp.data_emprestimo).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3 px-4 text-sm" style={{ color: atrasado ? '#ef4444' : '#64748b', fontWeight: atrasado ? 700 : 400 }}>
                    {emp.data_prevista_devolucao ? new Date(emp.data_prevista_devolucao).toLocaleDateString('pt-BR') : '—'}
                    {atrasado && <span className="ml-1 text-xs">⚠️</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: statusDisplay.bg, color: statusDisplay.color }}>
                      {statusDisplay.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {emp.status !== 'devolvido' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDevolver(emp.id)} disabled={devolvendo === emp.id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition"
                          style={{ background: devolvendo === emp.id ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)' }}
                          title="Registrar devolução">
                          {devolvendo === emp.id ? '⏳' : '✅ Devolver'}
                        </button>
                        <button onClick={() => handleRenovar(emp.id)} disabled={devolvendo === emp.id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition"
                          style={{ background: devolvendo === emp.id ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                          title="Renovar prazo de devolução">
                          🔄 Renovar
                        </button>
                      </div>
                    )}
                    {emp.status === 'devolvido' && (
                      <span className="text-xs text-slate-400">{emp.data_devolucao ? new Date(emp.data_devolucao).toLocaleDateString('pt-BR') : '—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalNovo && <NovoEmprestimoModal onClose={(r) => { setModalNovo(false); if (r) fetchEmprestimos(); }} />}
    </div>
  );
}
