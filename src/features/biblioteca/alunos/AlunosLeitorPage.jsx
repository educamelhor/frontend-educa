// src/features/biblioteca/alunos/AlunosLeitorPage.jsx
// ============================================================================
// Consulta de alunos e seu histórico de leitura + ranking por turma
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';

function TurmaCard({ turma, rank }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 transition"
      style={{
        background: rank < 3
          ? `linear-gradient(135deg, ${['rgba(251,191,36,0.12)', 'rgba(148,163,184,0.12)', 'rgba(180,120,60,0.12)'][rank]}, transparent)`
          : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        border: rank < 3 ? `1px solid ${['rgba(251,191,36,0.3)', 'rgba(148,163,184,0.3)', 'rgba(180,120,60,0.3)'][rank]}` : '1px solid #e2e8f0',
      }}
    >
      <span className="text-3xl">{medals[rank] || `#${rank + 1}`}</span>
      <div className="flex-1">
        <p className="font-bold text-slate-800">{turma.turma_nome}</p>
        <p className="text-xs text-slate-500">{turma.total_leitores} aluno{turma.total_leitores !== 1 ? 's' : ''} leitore{turma.total_leitores !== 1 ? 's' : ''}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-black" style={{ color: '#10b981' }}>{turma.total_emprestimos}</p>
        <p className="text-xs text-slate-400">empréstimos</p>
      </div>
    </div>
  );
}

export default function AlunosLeitorPage() {
  const [tab, setTab] = useState('busca'); // 'busca' | 'turmas'
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunos, setAlunos] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [alunoSel, setAlunoSel] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [loadingHist, setLoadingHist] = useState(false);
  const [limitEmp, setLimitEmp] = useState(5);
  const [limitRes, setLimitRes] = useState(5);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const searchRef = useRef(null);

  const searchAlunos = useCallback(async (q) => {
    if (!q || q.length < 2) { setAlunos([]); return; }
    setBuscando(true);
    try {
      // O param correto da API de alunos é 'filtro', campo de nome é 'estudante'
      const { data } = await api.get('/api/alunos', { params: { filtro: q, limit: 10, status: 'ativo' } });
      // A API retorna { alunos: [...] } com campo 'estudante' (não 'nome')
      const lista = (data.alunos || data || []).map(a => ({
        ...a,
        nome: a.estudante || a.nome || '', // normaliza para 'nome' internamente
        turma_nome: a.turma || a.turma_nome || '',
      }));
      setAlunos(lista);
    } catch { setAlunos([]); }
    finally { setBuscando(false); }
  }, []);

  useEffect(() => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => searchAlunos(buscaAluno), 400);
    return () => clearTimeout(searchRef.current);
  }, [buscaAluno]);

  const loadHistorico = async (aluno) => {
    setAlunoSel(aluno);
    setAlunos([]);
    setBuscaAluno(aluno.nome);
    setLoadingHist(true);
    setLimitEmp(5);
    setLimitRes(5);
    try {
      const { data } = await api.get(`/api/biblioteca/alunos/${aluno.id}/historico`);
      setHistorico(data);
    } catch { setHistorico(null); }
    finally { setLoadingHist(false); }
  };

  // ─── calcula o ano letivo atual com corte em 15/02 (regra do sistema) ────────
  function anoLetivoAtual() {
    const hoje = new Date();
    const mes = hoje.getMonth() + 1; // 1-12
    const dia = hoje.getDate();
    // Antes de 15/fev → ainda é o ano letivo anterior
    if (mes < 2 || (mes === 2 && dia < 15)) return hoje.getFullYear() - 1;
    return hoje.getFullYear();
  }

  const loadTurmas = useCallback(async () => {
    setLoadingTurmas(true);
    try {
      const { data } = await api.get('/api/biblioteca/turmas/leitores');
      setTurmas(data.turmas || []);
    } catch { setTurmas([]); }
    finally { setLoadingTurmas(false); }
  }, []);

  useEffect(() => { if (tab === 'turmas') loadTurmas(); }, [tab]);

  const limpar = () => {
    setAlunoSel(null);
    setHistorico(null);
    setBuscaAluno('');
    setAlunos([]);
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, #4c1d95, #5b21b6, #7c3aed)', boxShadow: '0 8px 32px rgba(76,29,149,0.3)' }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">👩‍🎓</span>
          <h1 className="text-2xl font-black text-white">Alunos Leitores</h1>
        </div>
        <p className="text-purple-200 text-sm">Consulte o histórico de leitura individual e por turma</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'busca', label: '🔍 Busca Individual' }, { key: 'turmas', label: '🏫 Ranking por Turma' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition"
            style={{
              background: tab === t.key ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#f1f5f9',
              color: tab === t.key ? '#fff' : '#475569',
              boxShadow: tab === t.key ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'busca' && (
        <>
          {/* Busca */}
          <div className="relative mb-6">
            <div className="flex gap-3">
              <input
                value={buscaAluno}
                onChange={e => { setBuscaAluno(e.target.value); if (alunoSel) limpar(); }}
                placeholder="Digite o nome do aluno..."
                className="flex-1 px-4 py-3 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-purple-300"
                style={{ borderColor: '#e2e8f0', background: '#fff', color: '#1e293b' }}
              />
              {alunoSel && (
                <button onClick={limpar} className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', color: '#475569' }}>
                  Limpar
                </button>
              )}
            </div>
            {alunos.length > 0 && !alunoSel && (
              <div className="absolute w-full mt-1 rounded-xl shadow-xl border z-20 overflow-hidden" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                {buscando && <div className="py-3 text-center text-sm text-slate-400">Buscando...</div>}
                {alunos.map(a => (
                  <button key={a.id} onClick={() => loadHistorico(a)} className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b last:border-0 transition" style={{ borderColor: '#f1f5f9' }}>
                    <p className="font-semibold text-slate-800">{a.nome}</p>
                    <p className="text-xs text-slate-400">{a.turma_nome || a.turma || ''}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Histórico do aluno */}
          {loadingHist && (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Carregando histórico...</p>
            </div>
          )}

          {historico && alunoSel && !loadingHist && (
            <div>
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Livros lidos', value: historico.total_livros, icon: '📚', color: '#10b981' },
                  { label: 'Empréstimos', value: historico.emprestimos.length, icon: '📋', color: '#3b82f6' },
                  { label: 'Resenhas', value: historico.resenhas.length, icon: '✍️', color: '#8b5cf6' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl p-4 text-center" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <p className="text-3xl mb-1">{stat.icon}</p>
                    <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Timeline de empréstimos */}
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span>📋</span> Histórico de empréstimos
              </h3>
              {historico.emprestimos.length === 0 ? (
                <p className="text-sm text-slate-400 mb-6">Nenhum empréstimo encontrado.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {historico.emprestimos.slice(0, limitEmp).map((emp) => (
                    <div key={emp.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: emp.status === 'devolvido' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)' }}>
                        {emp.status === 'devolvido' ? '✅' : '📖'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-800">{emp.titulo}</p>
                        <p className="text-xs text-slate-400">{emp.autor}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{ color: emp.status === 'devolvido' ? '#10b981' : '#3b82f6' }}>
                          {emp.status === 'devolvido' ? 'Devolvido' : 'Em mãos'}
                        </p>
                        <p className="text-xs text-slate-400">{new Date(emp.data_emprestimo).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                  {historico.emprestimos.length > limitEmp && (
                    <button onClick={() => setLimitEmp(l => l + 5)} className="w-full py-2 mt-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition">
                      Ver mais empréstimos ({historico.emprestimos.length - limitEmp} restantes)
                    </button>
                  )}
                </div>
              )}

              {/* Resenhas */}
              {historico.resenhas.length > 0 && (
                <>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><span>✍️</span> Resenhas produzidas</h3>
                  <div className="space-y-3">
                    {historico.resenhas.slice(0, limitRes).map(r => (
                      <div key={r.id} className="p-4 rounded-2xl" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-sm text-purple-900">{r.livro_titulo}</p>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                            background: r.status === 'destaque' ? 'rgba(251,191,36,0.2)' : 'rgba(139,92,246,0.15)',
                            color: r.status === 'destaque' ? '#d97706' : '#7c3aed',
                          }}>
                            {r.status === 'destaque' ? '⭐ Destaque' : r.status}
                          </span>
                        </div>
                        {r.avaliacao && (
                          <div className="flex gap-0.5 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} style={{ color: i < r.avaliacao ? '#f59e0b' : '#e2e8f0', fontSize: '0.9rem' }}>★</span>
                            ))}
                          </div>
                        )}
                        {r.resenha && <p className="text-xs text-purple-700 line-clamp-3">{r.resenha}</p>}
                      </div>
                    ))}
                    {historico.resenhas.length > limitRes && (
                      <button onClick={() => setLimitRes(l => l + 5)} className="w-full py-2 mt-2 text-sm font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition">
                        Ver mais resenhas ({historico.resenhas.length - limitRes} restantes)
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {!alunoSel && !loadingHist && (
            <div className="text-center py-20 text-slate-400">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-sm">Busque um aluno pelo nome para ver seu histórico de leitura</p>
            </div>
          )}
        </>
      )}

      {tab === 'turmas' && (
        <>
          {loadingTurmas ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : turmas.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-5xl mb-3">🏫</p>
              <p>Nenhuma turma com leitura registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {turmas.map((t, i) => <TurmaCard key={t.turma_id} turma={t} rank={i} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
