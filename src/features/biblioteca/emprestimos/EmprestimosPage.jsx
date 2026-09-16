// src/features/biblioteca/emprestimos/EmprestimosPage.jsx
// ============================================================================
// Controle de empréstimos com controle de estoque físico
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../services/api';

const STATUS_MAP = {
  ativo: { label: 'Ativo', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  devolvido: { label: 'Devolvido', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  atrasado: { label: 'Atrasado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const OPCOES_DIAS = [3, 5, 7, 10, 14];

const TURNO_STYLES = {
  Matutino: { emoji: '🌅', label: 'Matutino', color: '#d97706', bgActive: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#fde68a' },
  Vespertino: { emoji: '☀️', label: 'Vespertino', color: '#0284c7', bgActive: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: '#bae6fd' },
  Noturno: { emoji: '🌙', label: 'Noturno', color: '#7c3aed', bgActive: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#ddd6fe' },
  Integral: { emoji: '🏫', label: 'Integral', color: '#059669', bgActive: 'linear-gradient(135deg, #10b981, #059669)', border: '#a7f3d0' },
};

function formatarDataISO(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function somarDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return formatarDataISO(d);
}

function formatarDataLegivel(isoStr) {
  if (!isoStr) return '';
  const [ano, mes, dia] = isoStr.split('-').map(Number);
  if (!ano || !mes || !dia) return '';
  const d = new Date(ano, mes - 1, dia);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Calcula o ano letivo atual com corte em 15/02 (regra canônica do sistema) ──
function anoLetivoAtual() {
  const stored = localStorage.getItem('ano_letivo') || localStorage.getItem('anoLetivo');
  if (stored && !isNaN(Number(stored))) return Number(stored);
  const hoje = new Date();
  const mes = hoje.getMonth() + 1; // 1-12
  const dia = hoje.getDate();
  if (mes < 2 || (mes === 2 && dia < 15)) return hoje.getFullYear() - 1;
  return hoje.getFullYear();
}

function NovoEmprestimoModal({ onClose }) {
  // ── Livro ──
  const [buscaLivro, setBuscaLivro] = useState('');
  const [livros, setLivros] = useState([]);
  const [livroSel, setLivroSel] = useState(null);
  const [loadingLivros, setLoadingLivros] = useState(false);

  // ── Turmas & Alunos ──
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [turnoSel, setTurnoSel] = useState(null);
  const [turmaSel, setTurmaSel] = useState(null);
  const [alunosTurma, setAlunosTurma] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [filtroAlunoTexto, setFiltroAlunoTexto] = useState('');
  const [listaAlunosAberta, setListaAlunosAberta] = useState(false);
  const [alunoSel, setAlunoSel] = useState(null);

  // ── Prazo (Dias & Data) ──
  const [diasSel, setDiasSel] = useState(7);
  const [dataDev, setDataDev] = useState(() => somarDias(7));
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Busca de livros com debounce
  const searchLivros = useCallback(async (q) => {
    if (!q.trim()) { setLivros([]); return; }
    setLoadingLivros(true);
    try {
      const { data } = await api.get('/api/biblioteca/acervo', { params: { q, disponivel: '1', limit: 8 } });
      setLivros(data.livros || []);
    } catch { setLivros([]); }
    finally { setLoadingLivros(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchLivros(buscaLivro), 350);
    return () => clearTimeout(t);
  }, [buscaLivro, searchLivros]);

  // Carrega turmas da escola filtradas pelo ano letivo atual
  useEffect(() => {
    (async () => {
      setLoadingTurmas(true);
      try {
        const anoAtual = anoLetivoAtual();
        const { data } = await api.get('/api/turmas', { params: { ano: anoAtual } });
        const lista = (Array.isArray(data) ? data : [])
          .filter(t => !t.ano || String(t.ano) === String(anoAtual));
        setTurmas(lista);
      } catch (err) {
        console.error('Erro ao carregar turmas:', err);
      } finally {
        setLoadingTurmas(false);
      }
    })();
  }, []);

  // Extrai turnos presentes nas turmas do ano letivo atual
  const turnosDisponiveis = useMemo(() => {
    const set = new Set();
    turmas.forEach(t => {
      if (t.turno) {
        const tr = t.turno.trim();
        const cap = tr.charAt(0).toUpperCase() + tr.slice(1).toLowerCase();
        set.add(cap);
      }
    });
    const padrao = ['Matutino', 'Vespertino', 'Noturno', 'Integral'];
    const ordenados = padrao.filter(p => set.has(p));
    set.forEach(s => { if (!ordenados.includes(s)) ordenados.push(s); });
    return ordenados.length > 0 ? ordenados : ['Matutino', 'Vespertino', 'Noturno'];
  }, [turmas]);

  // Turmas filtradas pelo turno selecionado e ordenadas alfabética/numericamente
  const turmasDoTurno = useMemo(() => {
    if (!turnoSel) return [];
    return turmas
      .filter(t => (t.turno || '').toLowerCase().trim() === turnoSel.toLowerCase().trim())
      .sort((a, b) => (a.turma || '').localeCompare(b.turma || '', 'pt-BR', { numeric: true, sensitivity: 'base' }));
  }, [turmas, turnoSel]);

  // Alunos filtrados dentro da turma
  const alunosFiltrados = useMemo(() => {
    if (!filtroAlunoTexto.trim()) return alunosTurma;
    const q = filtroAlunoTexto.toLowerCase().trim();
    return alunosTurma.filter(a => (a.nome || '').toLowerCase().includes(q) || (a.matricula || '').toLowerCase().includes(q));
  }, [alunosTurma, filtroAlunoTexto]);

  // Selecionar turno
  const handleSelecionarTurno = (turno) => {
    setTurnoSel(turno);
    setTurmaSel(null);
    setAlunosTurma([]);
    setListaAlunosAberta(false);
    setFiltroAlunoTexto('');
    setAlunoSel(null);
  };

  // Selecionar turma
  const handleSelecionarTurma = async (turma) => {
    if (turmaSel?.id === turma.id && listaAlunosAberta) {
      setListaAlunosAberta(false);
      return;
    }
    setTurmaSel(turma);
    setLoadingAlunos(true);
    setListaAlunosAberta(true);
    setFiltroAlunoTexto('');
    try {
      const anoAtual = anoLetivoAtual();
      const { data } = await api.get(`/api/turmas/${turma.id}/alunos`, { params: { ano: anoAtual, ano_letivo: anoAtual } });
      const list = Array.isArray(data) ? data : (data.alunos || []);
      setAlunosTurma(list);
    } catch (err) {
      console.error('Erro ao buscar alunos da turma:', err);
      setAlunosTurma([]);
    } finally {
      setLoadingAlunos(false);
    }
  };

  // Selecionar estudante: preenche o campo e fecha a gaveta
  const handleSelecionarAluno = (aluno) => {
    setAlunoSel({
      id: aluno.id,
      nome: aluno.nome,
      matricula: aluno.matricula,
      turma_nome: turmaSel?.turma || '',
      foto: aluno.foto,
    });
    setListaAlunosAberta(false);
    setFiltroAlunoTexto('');
    setError('');
  };

  // Trocar dias pré-selecionados
  const handleSelecionarDias = (dias) => {
    setDiasSel(dias);
    setDataDev(somarDias(dias));
  };

  // Digitar ou escolher data no calendário
  const handleDataManual = (val) => {
    setDataDev(val);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const [ano, mes, dia] = (val || '').split('-').map(Number);
    if (ano && mes && dia) {
      const dTarget = new Date(ano, mes - 1, dia);
      dTarget.setHours(0, 0, 0, 0);
      const diff = Math.round((dTarget - hoje) / (1000 * 60 * 60 * 24));
      if (OPCOES_DIAS.includes(diff)) {
        setDiasSel(diff);
      } else {
        setDiasSel(null);
      }
    } else {
      setDiasSel(null);
    }
  };

  // Submeter empréstimo
  const handleSalvar = async () => {
    if (!livroSel) { setError('Selecione um livro para o empréstimo.'); return; }
    if (!alunoSel) { setError('Selecione o estudante que pegará o livro.'); return; }
    setSaving(true);
    setError('');
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: '#ffffff',
          boxShadow: '0 25px 60px -15px rgba(30, 58, 138, 0.45)',
          animation: 'modalEntrada 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Top Header com Gradiente Premium */}
        <div
          className="p-5 sm:p-6 text-white relative overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)' }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl border border-white/20 shadow-inner">
                📖
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight leading-none text-white">Novo Empréstimo</h2>
                <p className="text-blue-100 text-xs mt-1 font-medium">Selecione o livro, a turma, o aluno e o prazo de devolução</p>
              </div>
            </div>
            <button
              onClick={() => onClose(false)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all text-sm font-bold border border-white/10"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* ── ETAPA 1: LIVRO DISPONÍVEL ── */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-black inline-flex items-center justify-center">1</span>
                Livro (Disponíveis no Acervo)
              </span>
              {livroSel && (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Exemplar Selecionado
                </span>
              )}
            </label>

            {livroSel ? (
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/80 shadow-sm transition-all">
                {livroSel.capa_url ? (
                  <img
                    src={livroSel.capa_url}
                    alt={livroSel.titulo}
                    className="w-12 h-16 object-cover rounded-xl shadow border border-emerald-200/60 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-xl bg-emerald-600/10 border border-emerald-200 flex items-center justify-center text-2xl flex-shrink-0">
                    📗
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate leading-snug">{livroSel.titulo}</p>
                  <p className="text-xs text-slate-600 font-medium truncate mt-0.5">{livroSel.autor || 'Autor não informado'}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                      {livroSel.exemplares_disponiveis} disponível(eis)
                    </span>
                    {livroSel.local_estante && (
                      <span className="text-[11px] font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
                        📍 {livroSel.local_estante}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setLivroSel(null); setBuscaLivro(''); }}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-white/80 hover:bg-red-50 border border-red-200 rounded-xl transition-all shadow-xs flex-shrink-0"
                >
                  ✕ Trocar
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  🔍
                </div>
                <input
                  type="text"
                  value={buscaLivro}
                  onChange={e => setBuscaLivro(e.target.value)}
                  placeholder="Digite o título, autor ou código do livro..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm border border-slate-200 bg-slate-50/60 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-800"
                />
                {loadingLivros && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Buscando...
                  </div>
                )}

                {livros.length > 0 && (
                  <div className="absolute w-full mt-2 rounded-2xl shadow-xl border border-slate-200 bg-white z-20 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {livros.map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => { setLivroSel(l); setLivros([]); setBuscaLivro(''); setError(''); }}
                        className="w-full text-left p-3 hover:bg-blue-50/80 transition flex items-center gap-3"
                      >
                        {l.capa_url ? (
                          <img src={l.capa_url} alt="" className="w-9 h-12 object-cover rounded-lg shadow-xs flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-base flex-shrink-0">📘</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate leading-snug">{l.titulo}</p>
                          <p className="text-xs text-slate-500 truncate">{l.autor || 'Autor não informado'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            {l.exemplares_disponiveis} disp.
                          </span>
                          {l.local_estante && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-28 font-medium">📍 {l.local_estante}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ETAPA 2: ALUNO (TURNO -> TURMA -> ALUNO) ── */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-black inline-flex items-center justify-center">2</span>
                Estudante (Seleção Inteligente por Turno e Turma)
              </span>
              {alunoSel && (
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Aluno Vinculado
                </span>
              )}
            </label>

            {/* Aluno Selecionado (Card de Destaque) */}
            {alunoSel ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm flex-shrink-0">
                    {alunoSel.foto ? (
                      <img src={alunoSel.foto} alt="" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate leading-snug">{alunoSel.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                        {alunoSel.turma_nome || 'Turma não informada'}
                      </span>
                      {alunoSel.matricula && (
                        <span className="text-xs text-slate-500 font-medium">
                          Matrícula: {alunoSel.matricula}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAlunoSel(null);
                    setListaAlunosAberta(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-100/60 border border-blue-200 rounded-xl transition-all shadow-xs flex-shrink-0"
                >
                  ✕ Trocar Aluno
                </button>
              </div>
            ) : null}

            {/* Painel Clicável: Seleção de Turno */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                  <span>Passo 1:</span> Selecione o Turno do Aluno:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {turnosDisponiveis.map(turno => {
                    const conf = TURNO_STYLES[turno] || { emoji: '📚', bgActive: 'linear-gradient(135deg, #1e40af, #2563eb)', color: '#1e40af' };
                    const isAtivo = turnoSel === turno;
                    const countTurmas = turmas.filter(t => (t.turno || '').toLowerCase().trim() === turno.toLowerCase().trim()).length;
                    return (
                      <button
                        key={turno}
                        type="button"
                        onClick={() => handleSelecionarTurno(turno)}
                        style={{
                          background: isAtivo ? conf.bgActive : '#ffffff',
                          color: isAtivo ? '#ffffff' : '#334155',
                          borderColor: isAtivo ? 'transparent' : '#e2e8f0',
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-1 shadow-xs hover:scale-[1.02] active:scale-[0.98] ${isAtivo ? 'shadow-md shadow-blue-500/20 ring-2 ring-blue-300' : 'hover:bg-white hover:border-slate-300'}`}
                      >
                        <span className="text-lg">{conf.emoji}</span>
                        <span>{turno}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${isAtivo ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {countTurmas} {countTurmas === 1 ? 'turma' : 'turmas'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Passo 2: Seleção de Turma (oculta quando o aluno já foi selecionado) */}
              {turnoSel && !alunoSel && (
                <div className="pt-3 border-t border-slate-200/70 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <span>Passo 2:</span> Selecione a Turma do turno {turnoSel}:
                    </p>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {turmasDoTurno.length} {turmasDoTurno.length === 1 ? 'turma disponível' : 'turmas disponíveis'}
                    </span>
                  </div>

                  {loadingTurmas ? (
                    <div className="p-3 text-center text-xs text-slate-400">Carregando turmas...</div>
                  ) : turmasDoTurno.length === 0 ? (
                    <div className="p-3 bg-white rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                      Nenhuma turma cadastrada no turno {turnoSel}.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {turmasDoTurno.map(t => {
                        const isTurmaAtiva = turmaSel?.id === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleSelecionarTurma(t)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-150 flex items-center gap-1.5 shadow-xs hover:scale-105 active:scale-95 ${isTurmaAtiva ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200 shadow-blue-500/25' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'}`}
                          >
                            <span>👥</span>
                            <span>{t.turma}</span>
                            {isTurmaAtiva && listaAlunosAberta && (
                              <span className="ml-1 text-[10px] bg-blue-700/80 px-1.5 py-0.5 rounded-md text-blue-100">
                                Aberta
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Passo 3: Lista de Alunos da Turma Selecionada */}
              {turmaSel && !alunoSel && listaAlunosAberta && (
                <div className="pt-3 border-t border-slate-200/70 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Passo 3:</span> Clique no nome do estudante da turma <span className="text-blue-600 font-black">{turmaSel.turma}</span>:
                    </p>
                    <button
                      type="button"
                      onClick={() => setListaAlunosAberta(false)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
                    >
                      Fechar lista ✕
                    </button>
                  </div>

                  {alunosTurma.length > 8 && (
                    <div className="relative">
                      <input
                        type="text"
                        value={filtroAlunoTexto}
                        onChange={e => setFiltroAlunoTexto(e.target.value)}
                        placeholder="Filtrar aluno por nome..."
                        className="w-full px-3 py-1.5 pl-8 rounded-xl text-xs border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
                    </div>
                  )}

                  {loadingAlunos ? (
                    <div className="p-6 text-center text-xs font-medium text-blue-600 flex items-center justify-center gap-2 bg-white rounded-xl border border-slate-100">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Carregando estudantes da turma...
                    </div>
                  ) : alunosFiltrados.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                      {alunosTurma.length === 0 ? 'Nenhum estudante matriculado nesta turma.' : 'Nenhum estudante corresponde ao filtro.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                      {alunosFiltrados.map(a => {
                        const isSelecionado = alunoSel?.id === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleSelecionarAluno(a)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] ${isSelecionado ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm' : 'bg-white text-slate-800 border-slate-200/90 hover:bg-blue-50 hover:border-blue-300'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelecionado ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {a.foto ? (
                                <img src={a.foto} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                '👤'
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs truncate leading-snug ${isSelecionado ? 'font-black text-white' : 'font-bold text-slate-800'}`}>
                                {a.nome}
                              </p>
                              <p className={`text-[10px] truncate ${isSelecionado ? 'text-blue-100' : 'text-slate-400'}`}>
                                Matrícula: {a.matricula || 'S/N'}
                              </p>
                            </div>
                            <span className={`text-xs ${isSelecionado ? 'text-white' : 'text-slate-400'}`}>
                              {isSelecionado ? '✓' : '→'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── ETAPA 3: PRAZO DE DEVOLUÇÃO (DIAS & DATA) ── */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-black inline-flex items-center justify-center">3</span>
                Prazo e Data Prevista de Devolução
              </span>
              {dataDev && (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 capitalize">
                  📅 {formatarDataLegivel(dataDev)}
                </span>
              )}
            </label>

            {/* Botões inteligentes de Dias de Empréstimo */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600">Selecione a quantidade de dias:</p>
              <div className="grid grid-cols-5 gap-2">
                {OPCOES_DIAS.map(dias => {
                  const isAtivo = diasSel === dias;
                  return (
                    <button
                      key={dias}
                      type="button"
                      onClick={() => handleSelecionarDias(dias)}
                      style={{
                        background: isAtivo ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : '#ffffff',
                        color: isAtivo ? '#ffffff' : '#334155',
                        borderColor: isAtivo ? 'transparent' : '#cbd5e1',
                      }}
                      className={`py-2.5 rounded-xl text-xs font-black border transition-all duration-150 flex flex-col items-center justify-center shadow-xs hover:scale-105 active:scale-95 ${isAtivo ? 'ring-2 ring-blue-300 shadow-md shadow-blue-500/20' : 'hover:bg-blue-50/60 hover:border-blue-300'}`}
                    >
                      <span className="text-sm leading-none">{dias}</span>
                      <span className={`text-[10px] font-semibold mt-0.5 ${isAtivo ? 'text-blue-100' : 'text-slate-400'}`}>dias</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs: Data Específica e Observação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Ou selecione a data no calendário:
                </label>
                <input
                  type="date"
                  value={dataDev}
                  onChange={e => handleDataManual(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Observação <span className="text-slate-400 font-normal">(opcional)</span>:
                </label>
                <input
                  type="text"
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Ex: Devolver antes do recesso..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-800 border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Alerta de erro se houver */}
          {error && (
            <div className="p-3.5 rounded-2xl text-xs font-bold text-red-700 bg-red-50 border border-red-200 flex items-center gap-2 animate-fadeIn">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 sm:p-5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-all shadow-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving || !livroSel || !alunoSel}
            style={{
              background: saving || !livroSel || !alunoSel ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              boxShadow: saving || !livroSel || !alunoSel ? 'none' : '0 4px 14px rgba(29, 78, 216, 0.35)',
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 disabled:cursor-not-allowed hover:brightness-105 active:scale-98"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Registrar Empréstimo</span>
              </>
            )}
          </button>
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
