// src/features/questoes/BancoGlobal.jsx
// 🌐 Banco Global EDUCA.MELHOR — questões compartilhadas entre todas as escolas

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

/* ── Utilitários ── */
const NIVEL_LABEL  = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };
const NIVEL_COLOR  = { facil: '#059669', medio: '#d97706', dificil: '#dc2626', enem: '#7c3aed' };
const TIPO_LABEL   = { objetiva: 'Objetiva', discursiva: 'Discursiva', verdadeiro_falso: 'V/F', associacao: 'Assoc.', lacuna: 'Lacuna' };

function parseTags(raw) {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return String(raw).split(',').map(s => s.trim()).filter(Boolean); }
}

function decodificarToken() {
  try {
    const t = localStorage.getItem('token') || '';
    const payload = t.split('.')[1];
    if (!payload) return {};
    return JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));
  } catch { return {}; }
}

/* ── Modal confirmação exclusão global ── */
function ExcluirGlobalModal({ q, onConfirm, onCancel }) {
  const [passo, setPasso] = useState(null);
  if (!q) return null;
  const preview = (q.conteudo_bruto || '').slice(0, 80);
  const overlay = { position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(15,23,42,0.72)',backdropFilter:'blur(6px)' };
  const box     = { background:'#fff',borderRadius:20,padding:'26px 26px 22px',width:420,maxWidth:'92vw',boxShadow:'0 24px 80px rgba(0,0,0,0.28)',fontFamily:'inherit' };

  if (passo === 'confirmar') return (
    <div style={overlay}><div style={box}>
      <div style={{ textAlign:'center',marginBottom:16 }}>
        <div style={{ width:56,height:56,borderRadius:14,margin:'0 auto 10px',background:'linear-gradient(135deg,#fee2e2,#fecaca)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem' }}>🌐🗑️</div>
        <div style={{ fontWeight:800,fontSize:'1rem',color:'#0f172a' }}>Remover do Banco Global?</div>
        <div style={{ fontSize:'0.78rem',color:'#64748b',marginTop:6,lineHeight:1.5 }}>A questão será removida do banco global. Cópias nas escolas <strong>não</strong> serão afetadas.</div>
      </div>
      <div style={{ background:'#fef2f2',borderRadius:10,padding:'9px 13px',fontSize:'0.78rem',color:'#7f1d1d',border:'1px solid #fecaca',marginBottom:18 }}>{preview}{q.conteudo_bruto?.length>80?'...':''}</div>
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        <button onClick={onConfirm} style={{ padding:'12px',borderRadius:10,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#dc2626,#b91c1c)',color:'#fff',fontWeight:800,fontSize:'0.9rem',fontFamily:'inherit' }}>✅ Entendi — Remover do Banco Global</button>
        <button onClick={()=>setPasso(null)} style={{ padding:'11px',borderRadius:10,border:'1.5px solid #e2e8f0',cursor:'pointer',background:'#f8fafc',color:'#64748b',fontWeight:600,fontSize:'0.875rem',fontFamily:'inherit' }}>← Cancelar — voltar</button>
      </div>
    </div></div>
  );

  return (
    <div style={overlay}><div style={box}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
        <div style={{ width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#ede9fe,#fee2e2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0 }}>⚠️</div>
        <div>
          <div style={{ fontWeight:800,fontSize:'0.95rem',color:'#0f172a' }}>Gerenciar Questão Global</div>
          <div style={{ fontSize:'0.72rem',color:'#64748b',marginTop:2 }}>Esta ação afeta o Banco Global EDUCA.MELHOR</div>
        </div>
      </div>
      <div style={{ background:'#f8fafc',borderRadius:10,padding:'9px 13px',fontSize:'0.78rem',color:'#475569',border:'1px solid #e0e7ff',marginBottom:18 }}>{preview}{q.conteudo_bruto?.length>80?'...':''}</div>
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        <button onClick={()=>setPasso('confirmar')} style={{ padding:'11px',borderRadius:10,border:'1.5px solid #fecaca',cursor:'pointer',background:'#fff',color:'#dc2626',fontWeight:700,fontSize:'0.875rem',display:'flex',alignItems:'center',gap:8,fontFamily:'inherit' }}>
          <span>🌐🗑️</span> Remover do Banco Global — ação irreversível
        </button>
        <button onClick={onCancel} style={{ padding:'10px',borderRadius:10,border:'1.5px solid #e2e8f0',cursor:'pointer',background:'#f8fafc',color:'#64748b',fontWeight:600,fontSize:'0.875rem',fontFamily:'inherit' }}>Cancelar</button>
      </div>
    </div></div>
  );
}

/* ── Toast interno ── */
function Toast({ msg, tipo, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = tipo === 'ok' ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#dc2626,#b91c1c)';
  return (
    <div style={{ position:'fixed', bottom:28, right:28, zIndex:10000, background:bg, color:'#fff', borderRadius:14, padding:'14px 20px', fontWeight:700, fontSize:'0.9rem', boxShadow:'0 8px 32px rgba(0,0,0,0.22)', maxWidth:360, display:'flex', gap:10, alignItems:'center', fontFamily:'inherit' }}>
      <span style={{ fontSize:'1.3rem' }}>{tipo==='ok'?'✅':'❌'}</span>
      {msg}
    </div>
  );
}

/* ── Modal de detalhe ── */
function DetalhesModal({ q, onUsar, usando, onClose }) {
  if (!q) return null;
  let alts = [];
  try { alts = JSON.parse(q.alternativas_json || '[]'); } catch {}
  const tags = parseTags(q.tags);
  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(15,23,42,0.7)',backdropFilter:'blur(6px)' }}>
      <div style={{ background:'#fff',borderRadius:20,width:560,maxWidth:'95vw',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,0.28)',fontFamily:'inherit' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1e1b4b,#312e81)',borderRadius:'20px 20px 0 0',padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          <div>
            <div style={{ color:'rgba(255,255,255,0.6)',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.08em' }}>BANCO GLOBAL EDUCA.MELHOR</div>
            <div style={{ color:'#a5b4fc',fontSize:'1rem',fontWeight:800,marginTop:4 }}>{q.codigo}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)',border:'none',borderRadius:8,color:'#fff',cursor:'pointer',padding:'6px 10px',fontSize:'1.1rem' }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px 24px' }}>
          {/* Badges */}
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:14 }}>
            {q.disciplina && <span style={{ fontSize:'0.72rem',fontWeight:700,background:'#ede9fe',color:'#5b21b6',borderRadius:99,padding:'2px 10px' }}>{q.disciplina}</span>}
            {q.tipo && <span style={{ fontSize:'0.72rem',fontWeight:700,background:'#f1f5f9',color:'#475569',borderRadius:99,padding:'2px 10px' }}>{TIPO_LABEL[q.tipo]||q.tipo}</span>}
            {q.nivel && <span style={{ fontSize:'0.72rem',fontWeight:700,borderRadius:99,padding:'2px 10px',background:`${NIVEL_COLOR[q.nivel]}18`,color:NIVEL_COLOR[q.nivel] }}>{NIVEL_LABEL[q.nivel]||q.nivel}</span>}
            {q.habilidade_bncc && <span style={{ fontSize:'0.72rem',fontWeight:700,background:'#fff7ed',color:'#c2410c',borderRadius:99,padding:'2px 10px' }}>{q.habilidade_bncc}</span>}
            {q.uso_count > 0 && <span style={{ fontSize:'0.72rem',fontWeight:700,background:'#f0f9ff',color:'#0369a1',borderRadius:99,padding:'2px 10px',border:'1px solid #bae6fd' }}>📊 {q.uso_count}× usado</span>}
          </div>
          {/* Enunciado */}
          <div style={{ fontSize:'0.9rem',color:'#1e293b',lineHeight:1.7,marginBottom:16,fontWeight:500 }}>{q.conteudo_bruto}</div>
          {/* Alternativas */}
          {alts.length > 0 && (
            <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:16 }}>
              {alts.map((alt, i) => {
                const letra = String.fromCharCode(65+i);
                const isCorreta = q.correta === letra;
                return (
                  <div key={i} style={{ display:'flex',gap:10,alignItems:'flex-start',padding:'8px 12px',borderRadius:10,background:isCorreta?'#f0fdf4':'#f8fafc',border:`1.5px solid ${isCorreta?'#86efac':'#e2e8f0'}` }}>
                    <span style={{ fontWeight:800,color:isCorreta?'#059669':'#94a3b8',minWidth:20,fontSize:'0.82rem' }}>{letra}</span>
                    <span style={{ fontSize:'0.83rem',color:'#334155' }}>{typeof alt === 'object' ? alt.texto||alt.text||JSON.stringify(alt) : alt}</span>
                    {isCorreta && <span style={{ marginLeft:'auto',fontSize:'0.75rem',color:'#059669',fontWeight:700 }}>✓ Correta</span>}
                  </div>
                );
              })}
            </div>
          )}
          {/* Fonte / Tags */}
          {q.fonte && <div style={{ fontSize:'0.75rem',color:'#64748b',marginBottom:8 }}>📖 Fonte: {q.fonte}</div>}
          {tags.length > 0 && <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:16 }}>{tags.map(t=><span key={t} style={{ fontSize:'0.68rem',background:'#f1f5f9',color:'#64748b',borderRadius:99,padding:'2px 8px',border:'1px solid #e2e8f0' }}>{t}</span>)}</div>}
          {/* Ação */}
          <button onClick={onUsar} disabled={usando} style={{ width:'100%',padding:'13px',borderRadius:12,border:'none',cursor:usando?'not-allowed':'pointer',background:usando?'#e2e8f0':'linear-gradient(135deg,#4f46e5,#7c3aed)',color:usando?'#94a3b8':'#fff',fontWeight:800,fontSize:'0.95rem',fontFamily:'inherit',transition:'opacity .15s' }}>
            {usando ? '⏳ Adicionando...' : '➕ Usar no Meu Banco de Questões'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Card de questão global ── */
function CardGlobal({ q, onVer, onUsar, usando, isAutor, onExcluir }) {
  const tags = parseTags(q.tags);
  return (
    <div onClick={() => onVer(q)} style={{ background:'#fff',borderRadius:16,padding:'16px',cursor:'pointer',border:'1.5px solid #e0e7ff',boxShadow:'0 2px 8px rgba(79,70,229,0.06)',transition:'all .2s',position:'relative',overflow:'hidden' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='#818cf8'; e.currentTarget.style.boxShadow='0 8px 24px rgba(79,70,229,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='#e0e7ff'; e.currentTarget.style.boxShadow='0 2px 8px rgba(79,70,229,0.06)'; e.currentTarget.style.transform='none'; }}>
      {/* Faixa top */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#4f46e5,#7c3aed)' }} />
      {/* Código + badge autoria */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,marginTop:4 }}>
        <div style={{ fontSize:'0.65rem',fontWeight:800,color:'#818cf8',letterSpacing:'0.08em' }}>{q.codigo}</div>
        {isAutor && <span style={{ fontSize:'0.62rem',fontWeight:700,background:'#ede9fe',color:'#5b21b6',borderRadius:99,padding:'1px 7px' }}>✍️ Minha</span>}
      </div>
      {/* Badges */}
      <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:8 }}>
        {q.disciplina && <span style={{ fontSize:'0.68rem',fontWeight:700,background:'#ede9fe',color:'#5b21b6',borderRadius:99,padding:'1px 8px' }}>{q.disciplina}</span>}
        {q.tipo && <span style={{ fontSize:'0.68rem',background:'#f1f5f9',color:'#64748b',borderRadius:99,padding:'1px 7px',fontWeight:600 }}>{TIPO_LABEL[q.tipo]||q.tipo}</span>}
        {q.nivel && <span style={{ fontSize:'0.68rem',fontWeight:700,borderRadius:99,padding:'1px 8px',background:`${NIVEL_COLOR[q.nivel]}18`,color:NIVEL_COLOR[q.nivel] }}>{NIVEL_LABEL[q.nivel]}</span>}
      </div>
      {/* Enunciado */}
      <p style={{ fontSize:'0.8rem',color:'#334155',lineHeight:1.55,margin:'0 0 10px',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{q.conteudo_bruto||'(sem enunciado)'}</p>
      {/* Footer */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:6 }}>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap',flex:1,minWidth:0 }}>
          {tags.slice(0,2).map(t=><span key={t} style={{ fontSize:'0.62rem',background:'#f8fafc',color:'#94a3b8',border:'1px solid #e2e8f0',borderRadius:99,padding:'1px 6px' }}>{t}</span>)}
          {q.uso_count > 0 && <span style={{ fontSize:'0.62rem',fontWeight:700,background:'#eff6ff',color:'#3b82f6',borderRadius:99,padding:'1px 7px',border:'1px solid #bfdbfe' }}>📊 {q.uso_count}×</span>}
        </div>
        <div style={{ display:'flex',gap:5,flexShrink:0 }}>
          {isAutor && (
            <button onClick={e=>{e.stopPropagation();onExcluir(q);}} title="Remover do Banco Global"
              style={{ fontSize:'0.8rem',background:'#fff',color:'#dc2626',border:'1.5px solid #fecaca',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit' }}>🗑️</button>
          )}
          <button onClick={e=>{e.stopPropagation();onUsar(q);}} disabled={usando}
            style={{ fontSize:'0.7rem',fontWeight:700,background:usando?'#e2e8f0':'linear-gradient(135deg,#4f46e5,#7c3aed)',color:usando?'#94a3b8':'#fff',border:'none',borderRadius:8,padding:'5px 10px',cursor:usando?'not-allowed':'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>
            {usando ? '⏳' : '➕ Usar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function BancoGlobal() {
  const { professor_id: meuProfId, perfil: meuPerfil } = decodificarToken();
  const isGestor = ['diretor','coordenador','admin','militar'].includes(meuPerfil);

  const [questoes,          setQuestoes]          = useState([]);
  const [stats,             setStats]             = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [pagination,        setPagination]        = useState({ total:0, page:1, pages:1 });
  const [detalhe,           setDetalhe]           = useState(null);
  const [usando,            setUsando]            = useState(null);
  const [toast,             setToast]             = useState(null);
  const [page,              setPage]              = useState(1);
  const [questaoParaExcluir,setQuestaoParaExcluir]= useState(null);

  // Filtros
  const [busca,    setBusca]    = useState('');
  const [filtDisc, setFiltDisc] = useState('');
  const [filtNivel,setFiltNivel]= useState('');
  const [filtSerie,setFiltSerie]= useState('');
  const [ordenar,  setOrdenar]  = useState('mais_usadas');
  const [disciplinas, setDisciplinas] = useState([]);

  const buscaTimer = useRef(null);
  const LIMIT = 24;

  /* Stats globais */
  const carregarStats = useCallback(async () => {
    try {
      const { data } = await api.get('/api/questoes/global/stats');
      setStats(data);
      setDisciplinas((data.porDisciplina || []).map(d => d.disciplina).filter(Boolean));
    } catch {}
  }, []);

  /* Listagem */
  const carregar = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT, ordenar });
      if (busca)     params.set('busca', busca);
      if (filtDisc)  params.set('disciplina', filtDisc);
      if (filtNivel) params.set('nivel', filtNivel);
      if (filtSerie) params.set('serie', filtSerie);
      const { data } = await api.get(`/api/questoes/global?${params}`);
      setQuestoes(data.questoes || []);
      setPagination(data.pagination || { total:0, page:1, pages:1 });
    } catch { setQuestoes([]); }
    finally  { setLoading(false); }
  }, [busca, filtDisc, filtNivel, filtSerie, ordenar]);

  useEffect(() => { carregarStats(); }, [carregarStats]);

  useEffect(() => {
    clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(() => { setPage(1); carregar(1); }, busca ? 350 : 0);
    return () => clearTimeout(buscaTimer.current);
  }, [busca, filtDisc, filtNivel, filtSerie, ordenar, carregar]);

  useEffect(() => { carregar(page); }, [page]);

  /* Usar questão */
  const usarQuestao = async (q) => {
    setUsando(q.id);
    try {
      await api.post(`/api/questoes/global/${q.id}/usar`, { contexto: 'banco' });
      setToast({ msg: `✨ "${(q.conteudo_bruto||'').slice(0,50)}..." adicionada ao seu banco!`, tipo: 'ok' });
      setDetalhe(null);
      carregarStats();
    } catch (err) {
      setToast({ msg: err?.response?.data?.message || 'Erro ao adicionar questão.', tipo: 'erro' });
    } finally { setUsando(null); }
  };

  /* Excluir do banco global */
  const excluirDoGlobal = async (q) => {
    try {
      await api.delete(`/api/questoes/global/${q.id}`);
      setQuestoes(p => p.filter(x => x.id !== q.id));
      setPagination(p => ({ ...p, total: Math.max(0, p.total - 1) }));
      setQuestaoParaExcluir(null);
      carregarStats();
      setToast({ msg: `Questão ${q.codigo} removida do Banco Global.`, tipo: 'ok' });
    } catch (err) {
      setToast({ msg: err?.response?.data?.message || 'Erro ao remover questão.', tipo: 'erro' });
      setQuestaoParaExcluir(null);
    }
  };

  /* Filtros ativos */
  const limpar = () => { setBusca(''); setFiltDisc(''); setFiltNivel(''); setFiltSerie(''); setOrdenar('mais_usadas'); setPage(1); };
  const temFiltro = busca || filtDisc || filtNivel || filtSerie;

  /* Styles reutilizáveis */
  const selectStyle = { padding:'8px 12px', borderRadius:10, border:'1.5px solid #e0e7ff', background:'#fff', color:'#374151', fontSize:'0.82rem', fontFamily:'inherit', cursor:'pointer', outline:'none' };
  const statCard = (icon, val, label, color) => (
    <div style={{ background:'#fff', borderRadius:14, padding:'16px 20px', border:'1.5px solid #e0e7ff', display:'flex', alignItems:'center', gap:14, minWidth:130 }}>
      <div style={{ width:42, height:42, borderRadius:12, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem' }}>{icon}</div>
      <div>
        <div style={{ fontSize:'1.5rem', fontWeight:900, color, lineHeight:1 }}>{val ?? '—'}</div>
        <div style={{ fontSize:'0.7rem', color:'#94a3b8', fontWeight:600, marginTop:2 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:'inherit', minHeight:500 }}>
      {/* Toast */}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Modal exclusão global */}
      <ExcluirGlobalModal q={questaoParaExcluir} onConfirm={() => excluirDoGlobal(questaoParaExcluir)} onCancel={() => setQuestaoParaExcluir(null)} />

      {/* Modal detalhe */}
      <DetalhesModal q={detalhe} usando={usando===detalhe?.id} onUsar={() => usarQuestao(detalhe)} onClose={() => setDetalhe(null)} />

      {/* ── Banner ── */}
      <div style={{ background:'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%)', borderRadius:20, padding:'24px 28px', marginBottom:24, color:'#fff' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', flexShrink:0 }}>🌐</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'1.1rem', fontWeight:900, letterSpacing:'0.02em' }}>BANCO GLOBAL EDUCA.MELHOR</div>
            <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)', marginTop:3 }}>Questões publicadas e compartilhadas por todas as escolas da plataforma</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:99, padding:'4px 12px', fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.8)', border:'1px solid rgba(255,255,255,0.15)' }}>🔓 Acesso Universal</div>
            <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:99, padding:'4px 12px', fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.8)', border:'1px solid rgba(255,255,255,0.15)' }}>🏅 Curado</div>
          </div>
        </div>

        {/* Stats KPIs */}
        {stats && (
          <div style={{ display:'flex', gap:12, marginTop:20, flexWrap:'wrap' }}>
            {statCard('📚', stats.totais?.total, 'Questões publicadas', '#818cf8')}
            {statCard('🔥', stats.totais?.total_usos ?? 0, 'Total de usos', '#f59e0b')}
            {statCard('🎓', stats.porDisciplina?.length, 'Disciplinas', '#34d399')}
          </div>
        )}
      </div>

      {/* ── Filtros ── */}
      <div style={{ background:'#fff', borderRadius:16, padding:'16px 20px', marginBottom:20, border:'1.5px solid #e0e7ff', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        {/* Busca */}
        <div style={{ flex:'1 1 220px', position:'relative' }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'0.9rem' }}>🔍</span>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por enunciado, tags, BNCC..."
            style={{ width:'100%', padding:'8px 12px 8px 34px', borderRadius:10, border:'1.5px solid #e0e7ff', fontSize:'0.82rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
        </div>

        <select value={filtDisc} onChange={e=>setFiltDisc(e.target.value)} style={selectStyle}>
          <option value="">Todas as disciplinas</option>
          {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={filtNivel} onChange={e=>setFiltNivel(e.target.value)} style={selectStyle}>
          <option value="">Todos os níveis</option>
          {Object.entries(NIVEL_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select value={filtSerie} onChange={e=>setFiltSerie(e.target.value)} style={selectStyle}>
          <option value="">Todas as séries</option>
          {['6º Ano','7º Ano','8º Ano','9º Ano','1º Ano EM','2º Ano EM','3º Ano EM'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>

        <select value={ordenar} onChange={e=>setOrdenar(e.target.value)} style={selectStyle}>
          <option value="mais_usadas">🔥 Mais usadas</option>
          <option value="recentes">🆕 Mais recentes</option>
          <option value="disciplina">📚 Por disciplina</option>
        </select>

        {temFiltro && (
          <button onClick={limpar} style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid #e0e7ff', background:'#f8fafc', color:'#64748b', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* ── Contagem + Paginação superior ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        {!loading && (
          <span style={{ fontSize:'0.82rem', color:'#64748b' }}>
            {pagination.total > 0
              ? `${pagination.total} questão(ões) ${temFiltro ? 'encontrada(s)':'no banco global'} · Página ${pagination.page} de ${pagination.pages}`
              : 'Nenhuma questão encontrada'}
          </span>
        )}
        <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
          <button disabled={page<=1||loading} onClick={()=>setPage(p=>Math.max(1,p-1))}
            style={{ padding:'5px 14px', borderRadius:8, border:'1.5px solid #e0e7ff', background:'#fff', color: page<=1?'#cbd5e1':'#4f46e5', fontWeight:600, cursor:page<=1?'default':'pointer', fontSize:'0.78rem', fontFamily:'inherit' }}>← Anterior</button>
          <button disabled={page>=pagination.pages||loading} onClick={()=>setPage(p=>Math.min(pagination.pages,p+1))}
            style={{ padding:'5px 14px', borderRadius:8, border:'1.5px solid #e0e7ff', background:'#fff', color:page>=pagination.pages?'#cbd5e1':'#4f46e5', fontWeight:600, cursor:page>=pagination.pages?'default':'pointer', fontSize:'0.78rem', fontFamily:'inherit' }}>Próxima →</button>
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', color:'#818cf8', gap:14 }}>
          <div style={{ width:40, height:40, border:'3px solid #e0e7ff', borderTop:'3px solid #4f46e5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          <span style={{ fontWeight:600, fontSize:'0.9rem' }}>Carregando banco global...</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : questoes.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>🌐</div>
          <div style={{ fontWeight:800, fontSize:'1.1rem', color:'#1e293b', marginBottom:6 }}>{temFiltro ? 'Nenhuma questão encontrada' : 'Banco global vazio'}</div>
          <p style={{ color:'#64748b', fontSize:'0.85rem' }}>{temFiltro ? 'Ajuste os filtros ou tente outra busca.' : 'Seja o primeiro a publicar uma questão no banco global!'}</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {questoes.map(q => (
            <CardGlobal
              key={q.id} q={q}
              onVer={setDetalhe}
              onUsar={usarQuestao}
              usando={usando===q.id}
              isAutor={isGestor || (meuProfId && Number(q.professor_id_origem) === Number(meuProfId))}
              onExcluir={setQuestaoParaExcluir}
            />
          ))}
        </div>
      )}

      {/* Paginação inferior */}
      {pagination.pages > 1 && !loading && (
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:28 }}>
          {Array.from({ length: Math.min(pagination.pages, 7) }, (_,i) => i+1).map(p => (
            <button key={p} onClick={()=>setPage(p)} style={{ width:34,height:34,borderRadius:8,border:`1.5px solid ${p===page?'#4f46e5':'#e0e7ff'}`,background:p===page?'#4f46e5':'#fff',color:p===page?'#fff':'#475569',cursor:'pointer',fontWeight:700,fontSize:'0.82rem',fontFamily:'inherit' }}>{p}</button>
          ))}
          {pagination.pages > 7 && <span style={{ display:'flex',alignItems:'center',color:'#94a3b8',fontSize:'0.82rem' }}>... {pagination.pages}</span>}
        </div>
      )}
    </div>
  );
}
