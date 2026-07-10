import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ─── Coordenadas no A4 landscape (297×210mm) — ajuste fino disponível ─────────
// Linha de referência do template visual:
//   y≈88  → Nome do aluno (underline após "o(a) aluno(a):")
//   y≈103 → Turma (blank após "turma ___")
//   y≈133 → Período (blank antes de "com carga horária")
const CERT = {
  name:    { x: 148.5, y: 88,  fontBase: 16, fontMin: 10, maxW: 215, align: 'center', color: [15,30,80],   bold: true  },
  turma:   { x: 195,   y: 104, font: 10,                  align: 'center', color: [15,30,80],   bold: false },
  periodo: { x: 85,    y: 133, font: 10,                  align: 'center', color: [40,40,40],   bold: false },
};

// ─── Render PDF template via pdfjs ───────────────────────────────────────────
async function renderTemplate(pdfUrl) {
  const pdf  = await pdfjsLib.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(1);
  const vp   = page.getViewport({ scale: 3 });
  const cv   = document.createElement('canvas');
  cv.width   = vp.width;
  cv.height  = vp.height;
  await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
  return cv.toDataURL('image/jpeg', 0.98);
}

// ─── Formata data BR: YYYY-MM-DD → DD/MM/YYYY ────────────────────────────────
const toBR = d => { if (!d) return ''; const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y}`; };
const periodo = (ini, fim) => {
  if (!ini && !fim) return '';
  if (!fim || ini === fim) return toBR(ini);
  return `${toBR(ini)} a ${toBR(fim)}`;
};

// ─── Ícones SVG inline ────────────────────────────────────────────────────────
const Ico = {
  Search:   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>,
  Add:      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>,
  Trash:    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>,
  Download: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{width:20,height:20}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>,
  Check:    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{width:11,height:11}}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>,
  Spin:     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{width:20,height:20,animation:'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0A12 12 0 000 12h4z" opacity=".75"/></svg>,
};

const TURNOS = ['MATUTINO','VESPERTINO','NOTURNO','INTEGRAL'];
const TC = { MATUTINO:'#fbbf24', VESPERTINO:'#f97316', NOTURNO:'#818cf8', INTEGRAL:'#34d399' };
const TB = { MATUTINO:'rgba(251,191,36,.12)', VESPERTINO:'rgba(249,115,22,.12)', NOTURNO:'rgba(129,140,248,.12)', INTEGRAL:'rgba(52,211,153,.12)' };

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AphCbmdfPage() {
  const nomeEscola = localStorage.getItem('nome_escola') || 'Escola';
  const ano        = new Date().getFullYear();

  // Filtros de seleção de turma
  const [turnoFiltro, setTurnoFiltro] = useState('');
  const [turmaId,     setTurmaId]     = useState('');
  const [busca,       setBusca]       = useState('');
  const [turmas,      setTurmas]      = useState([]);

  // Pool de turmas adicionadas (multi-turma)
  const [turmasAdicionadas, setTurmasAdicionadas] = useState([]); // [{id,nome,turno,alunos:[]}]
  const alunosTodos = turmasAdicionadas.flatMap(t => t.alunos);

  // Seleção
  const [selecionados, setSelecionados] = useState(new Set());

  // Período do curso
  const [dtInicio, setDtInicio] = useState('');
  const [dtFim,    setDtFim]    = useState('');

  // UI
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [loadingAdd,    setLoadingAdd]    = useState(false);
  const [gerando,       setGerando]       = useState(false);
  const [erro,          setErro]          = useState('');
  const [sucesso,       setSucesso]       = useState('');

  // ── Carrega turmas ao mudar turno ─────────────────────────────────────────
  useEffect(() => {
    setTurmas([]); setTurmaId('');
    if (!turnoFiltro) return;
    setLoadingTurmas(true);
    api.get('/api/turmas', { params: { filtro: turnoFiltro, ano } })
      .then(r => setTurmas((r.data||[]).filter(t => t.turno?.toUpperCase().includes(turnoFiltro))))
      .catch(() => setErro('Erro ao carregar turmas.'))
      .finally(() => setLoadingTurmas(false));
  }, [turnoFiltro]);

  // ── Adicionar turma ao pool ────────────────────────────────────────────────
  const adicionarTurma = useCallback(async () => {
    if (!turmaId) return;
    // Evitar duplicatas
    if (turmasAdicionadas.find(t => String(t.id) === String(turmaId))) {
      setErro('Essa turma já foi adicionada.'); return;
    }
    setErro(''); setLoadingAdd(true);
    try {
      const r = await api.get('/api/alunos', {
        params: { turma_id: turmaId, status: 'ativo', limit: 200, ...(busca.trim() ? { filtro: busca.trim() } : {}) }
      });
      const alunos = r.data?.alunos || [];
      const turmaNome = turmas.find(t => String(t.id) === String(turmaId));
      const novasTurma = {
        id: turmaId,
        nome: turmaNome?.turma || turmaNome?.nome_oficial || `Turma ${turmaId}`,
        turno: turmaNome?.turno || '',
        alunos,
      };
      setTurmasAdicionadas(prev => [...prev, novasTurma]);
      // Selecionar todos os alunos novos por padrão
      setSelecionados(prev => {
        const next = new Set(prev);
        alunos.forEach(a => next.add(a.id));
        return next;
      });
      setTurmaId(''); setBusca('');
    } catch {
      setErro('Erro ao carregar alunos da turma.');
    } finally { setLoadingAdd(false); }
  }, [turmaId, turmasAdicionadas, turmas, busca]);

  // ── Remover turma do pool ──────────────────────────────────────────────────
  const removerTurma = (id) => {
    const turmaRemovida = turmasAdicionadas.find(t => String(t.id) === String(id));
    setTurmasAdicionadas(prev => prev.filter(t => String(t.id) !== String(id)));
    if (turmaRemovida) {
      const idsRemover = new Set(turmaRemovida.alunos.map(a => a.id));
      setSelecionados(prev => { const n = new Set(prev); idsRemover.forEach(i => n.delete(i)); return n; });
    }
  };

  // ── Seleção ───────────────────────────────────────────────────────────────
  const toggle      = id  => setSelecionados(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleTodos = ()  => setSelecionados(selecionados.size===alunosTodos.length ? new Set() : new Set(alunosTodos.map(a=>a.id)));
  const todosSel    = alunosTodos.length>0 && selecionados.size===alunosTodos.length;
  const parcialSel  = selecionados.size>0 && selecionados.size<alunosTodos.length;

  // ── Geração de PDF ────────────────────────────────────────────────────────
  const gerarPdf = async () => {
    if (!selecionados.size || gerando) return;
    if (!dtInicio) { setErro('Informe o início do período do curso.'); return; }
    setGerando(true); setErro(''); setSucesso('');

    try {
      const bg   = await renderTemplate('/templates/certificado_aph_cbmdf.pdf');
      const doc  = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
      const lista = alunosTodos.filter(a => selecionados.has(a.id));
      const periodTxt = periodo(dtInicio, dtFim);

      lista.forEach((aluno, i) => {
        if (i>0) doc.addPage('a4','landscape');

        // Fundo: template oficial (297×210mm)
        doc.addImage(bg, 'JPEG', 0, 0, 297, 210);

        const nome = (aluno.estudante || aluno.nome || '').toUpperCase();

        // ── Nome (com redução automática para nomes longos) ──────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(CERT.name.fontBase);
        doc.setTextColor(...CERT.name.color);
        let fs = CERT.name.fontBase;
        while (doc.getTextWidth(nome) > CERT.name.maxW && fs > CERT.name.fontMin) {
          fs -= 0.5;
          doc.setFontSize(fs);
        }
        doc.text(nome, CERT.name.x, CERT.name.y, { align: CERT.name.align });

        // ── Turma ─────────────────────────────────────────────────────────
        const turmaNome = aluno.turma || '';
        if (turmaNome) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(CERT.turma.font);
          doc.setTextColor(...CERT.turma.color);
          doc.text(turmaNome, CERT.turma.x, CERT.turma.y, { align: CERT.turma.align });
        }

        // ── Período ───────────────────────────────────────────────────────
        if (periodTxt) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(CERT.periodo.font);
          doc.setTextColor(...CERT.periodo.color);
          doc.text(periodTxt, CERT.periodo.x, CERT.periodo.y, { align: CERT.periodo.align });
        }
      });

      doc.save(`certificados-aph-${periodTxt.replace(/\//g,'-').replace(/ a /,'-')}.pdf`);
      setSucesso(`${lista.length} certificado(s) gerado(s) com sucesso!`);
    } catch(e) {
      console.error('[APH-CBMDF]', e);
      setErro('Erro ao gerar certificados. Verifique o console.');
    } finally { setGerando(false); }
  };

  // ── Estilos utilitários ───────────────────────────────────────────────────
  const card  = { background:'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:24 };
  const lbl   = { display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 };
  const inp   = { width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, color:'#fff', padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box', colorScheme:'dark' };
  const btnPrimary = (active) => ({ background: active ? 'linear-gradient(135deg,#dc2626,#991b1b)' : 'rgba(255,255,255,0.1)', border:'none', borderRadius:8, padding:'10px 20px', color:'#fff', fontWeight:700, fontSize:13, cursor: active ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:8, opacity: active ? 1 : 0.5, transition:'all 0.2s' });

  return (
    <>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:'100vh', background:'linear-gradient(135deg,#0a0f1e 0%,#0d1530 50%,#0a0f1e 100%)', padding:'32px 24px', fontFamily:"'Inter',sans-serif"}}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{marginBottom:28}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
            <div style={{background:'linear-gradient(135deg,#dc2626,#991b1b)',borderRadius:12,padding:'10px 14px'}}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="white" style={{width:24,height:24}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25z"/>
              </svg>
            </div>
            <div>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#fff',letterSpacing:'-0.5px'}}>Certificado APH-CBMDF</h1>
              <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,0.45)'}}>Corpo de Bombeiros Militar do DF — Atendimento Pré-Hospitalar</p>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <span style={{background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:20,padding:'2px 12px',fontSize:11,color:'#fca5a5',fontWeight:600}}>🔒 ACESSO RESTRITO — PERFIL MILITAR</span>
            <span style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'2px 12px',fontSize:11,color:'rgba(255,255,255,0.6)'}}>{nomeEscola}</span>
            <span style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'2px 12px',fontSize:11,color:'rgba(255,255,255,0.6)'}}>Ano letivo {ano}</span>
          </div>
        </div>

        {/* ── Painel: Seleção de turmas + Período ──────────────────────── */}
        <div style={{...card, marginBottom:24}}>
          <p style={{margin:'0 0 20px',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1}}>⚙️ Configuração do Certificado</p>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:16}}>

            {/* Turno */}
            <div>
              <label style={lbl}>Turno</label>
              <select value={turnoFiltro} onChange={e=>setTurnoFiltro(e.target.value)} style={{...inp,cursor:'pointer'}}>
                <option value="">— Selecione —</option>
                {TURNOS.map(t=><option key={t} value={t} style={{background:'#1e2a4a'}}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>

            {/* Turma */}
            <div>
              <label style={lbl}>Turma {loadingTurmas && <span style={{opacity:.5}}>carregando...</span>}</label>
              <select value={turmaId} onChange={e=>setTurmaId(e.target.value)} disabled={!turnoFiltro||loadingTurmas}
                style={{...inp,cursor:'pointer',opacity:!turnoFiltro?.5:1}}>
                <option value="">— Selecione a turma —</option>
                {turmas.map(t=><option key={t.id} value={t.id} style={{background:'#1e2a4a'}}>{t.turma||t.nome_oficial||`Turma ${t.id}`}</option>)}
              </select>
            </div>

            {/* Início do período */}
            <div>
              <label style={lbl}>Início do curso</label>
              <input type="date" value={dtInicio} onChange={e=>{setDtInicio(e.target.value); if(!dtFim)setDtFim(e.target.value);}} style={inp} />
            </div>

            {/* Fim do período */}
            <div>
              <label style={lbl}>Fim do curso</label>
              <input type="date" value={dtFim} onChange={e=>setDtFim(e.target.value)} min={dtInicio||undefined} style={inp} />
              {dtInicio && dtFim && (
                <p style={{margin:'4px 0 0',fontSize:11,color:'rgba(255,255,255,0.35)'}}>
                  Período: {toBR(dtInicio)}{dtFim!==dtInicio? ` a ${toBR(dtFim)}`:''}
                </p>
              )}
            </div>
          </div>

          {/* Botão Adicionar Turma */}
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={adicionarTurma} disabled={!turmaId||loadingAdd} style={btnPrimary(!!turmaId&&!loadingAdd)}>
              {loadingAdd ? <>{Ico.Spin} Carregando...</> : <>{Ico.Add} ADICIONAR TURMA</>}
            </button>
            {turmasAdicionadas.length > 0 && (
              <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,0.35)'}}>
                {turmasAdicionadas.reduce((s,t)=>s+t.alunos.length,0)} aluno(s) no total
              </p>
            )}
          </div>

          {/* Chips das turmas adicionadas */}
          {turmasAdicionadas.length > 0 && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}>
              {turmasAdicionadas.map(t => (
                <div key={t.id} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:20,padding:'4px 12px'}}>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.75)',fontWeight:600}}>{t.nome}</span>
                  <span style={{fontSize:10,color:TC[t.turno]||'#fff',fontWeight:700}}>{t.turno}</span>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>({t.alunos.length})</span>
                  <button onClick={()=>removerTurma(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.7)',padding:0,display:'flex',alignItems:'center'}}>
                    {Ico.Trash}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Alertas ───────────────────────────────────────────────────── */}
        {erro   && <div style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'12px 16px',marginBottom:16,color:'#fca5a5',fontSize:14}}>⚠️ {erro}</div>}
        {sucesso && <div style={{background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',borderRadius:10,padding:'12px 16px',marginBottom:16,color:'#6ee7b7',fontSize:14}}>✅ {sucesso}</div>}

        {/* ── Lista de alunos ───────────────────────────────────────────── */}
        {alunosTodos.length > 0 && (
          <div style={{...card,padding:0,overflow:'hidden',marginBottom:24}}>
            {/* Cabeçalho */}
            <div style={{padding:'14px 24px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={toggleTodos} style={{width:19,height:19,borderRadius:4,flexShrink:0,cursor:'pointer',
                  background:todosSel?'#dc2626':parcialSel?'rgba(220,38,38,0.4)':'rgba(255,255,255,0.1)',
                  border:`2px solid ${todosSel||parcialSel?'#dc2626':'rgba(255,255,255,0.3)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {(todosSel||parcialSel) && Ico.Check}
                </button>
                <span style={{color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:600}}>
                  Lista combinada — {turmasAdicionadas.map(t=>t.nome).join(', ')}
                </span>
                <span style={{background:'rgba(255,255,255,0.1)',borderRadius:20,padding:'2px 10px',fontSize:12,color:'rgba(255,255,255,0.45)'}}>
                  {alunosTodos.length} aluno{alunosTodos.length!==1?'s':''}
                </span>
              </div>
              {selecionados.size>0 && (
                <span style={{background:'rgba(220,38,38,0.2)',border:'1px solid rgba(220,38,38,0.4)',borderRadius:20,padding:'3px 12px',fontSize:12,color:'#fca5a5',fontWeight:700}}>
                  {selecionados.size} selecionado{selecionados.size!==1?'s':''}
                </span>
              )}
            </div>

            {/* Linhas por turma */}
            <div style={{maxHeight:440,overflowY:'auto'}}>
              {turmasAdicionadas.map(turma => (
                <React.Fragment key={turma.id}>
                  {/* Separador de turma */}
                  <div style={{padding:'6px 24px',background:'rgba(220,38,38,0.08)',borderBottom:'1px solid rgba(220,38,38,0.15)',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,fontWeight:700,color:'#fca5a5',textTransform:'uppercase',letterSpacing:1}}>{turma.nome}</span>
                    <span style={{fontSize:10,color:TC[turma.turno]||'#fff',fontWeight:700,background:TB[turma.turno]||'transparent',borderRadius:10,padding:'1px 7px'}}>{turma.turno}</span>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>— {turma.alunos.length} aluno{turma.alunos.length!==1?'s':''}</span>
                  </div>
                  {turma.alunos.map((aluno, idx) => {
                    const sel = selecionados.has(aluno.id);
                    return (
                      <div key={aluno.id} onClick={()=>toggle(aluno.id)}
                        style={{display:'flex',alignItems:'center',gap:14,padding:'10px 24px',cursor:'pointer',
                          borderBottom:'1px solid rgba(255,255,255,0.04)',
                          background:sel?'rgba(220,38,38,0.07)':idx%2===0?'transparent':'rgba(255,255,255,0.015)',
                          borderLeft:`3px solid ${sel?'#dc2626':'transparent'}`}}>
                        <div style={{width:16,height:16,borderRadius:3,flexShrink:0,
                          background:sel?'#dc2626':'rgba(255,255,255,0.07)',
                          border:`2px solid ${sel?'#dc2626':'rgba(255,255,255,0.2)'}`,
                          display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {sel && Ico.Check}
                        </div>
                        <span style={{fontSize:12,color:'rgba(255,255,255,0.3)',minWidth:26,textAlign:'right'}}>{String(idx+1).padStart(2,'0')}</span>
                        <span style={{flex:1,fontSize:14,fontWeight:sel?700:400,color:sel?'#fff':'rgba(255,255,255,0.75)'}}>{aluno.estudante||aluno.nome}</span>
                        <span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{aluno.turma}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ── Rodapé + botão GERA ───────────────────────────────────────── */}
        {alunosTodos.length > 0 && (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
            <div>
              <p style={{margin:0,color:'rgba(255,255,255,0.4)',fontSize:13}}>
                {!selecionados.size ? 'Selecione ao menos 1 aluno para gerar.' :
                 `${selecionados.size} certificado${selecionados.size!==1?'s':''} · período: ${periodo(dtInicio,dtFim)||'(defina o período)'}`}
              </p>
            </div>
            <button onClick={gerarPdf} disabled={!selecionados.size||gerando||!dtInicio}
              style={{background:selecionados.size&&!gerando&&dtInicio?'linear-gradient(135deg,#dc2626 0%,#991b1b 100%)':'rgba(255,255,255,0.1)',
                border:'none',borderRadius:12,padding:'14px 30px',color:'#fff',fontWeight:800,fontSize:15,
                cursor:selecionados.size&&!gerando&&dtInicio?'pointer':'not-allowed',
                display:'flex',alignItems:'center',gap:10,
                opacity:!selecionados.size||!dtInicio?.5:1,
                boxShadow:selecionados.size&&dtInicio?'0 4px 24px rgba(220,38,38,0.4)':'none',
                transition:'all 0.2s'}}>
              {gerando ? <>{Ico.Spin} Gerando PDF...</> : <>{Ico.Download} GERA CERTIFICADOS ({selecionados.size})</>}
            </button>
          </div>
        )}

        {/* Estado vazio */}
        {turmasAdicionadas.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.25)'}}>
            <div style={{fontSize:56,marginBottom:12}}>🏅</div>
            <p style={{fontSize:15,margin:0,fontWeight:600,color:'rgba(255,255,255,0.35)'}}>Adicione turmas para começar</p>
            <p style={{fontSize:13,margin:'8px 0 0',opacity:.6}}>Selecione turno → turma → clique "Adicionar Turma".<br/>Você pode adicionar múltiplas turmas antes de gerar.</p>
          </div>
        )}

      </div>
    </>
  );
}