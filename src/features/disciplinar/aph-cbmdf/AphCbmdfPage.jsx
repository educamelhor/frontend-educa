import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ─── Coordenadas do template PDF (pdfplumber) + calibração visual (+Δy) ─────────
// Template: 296.9 × 210.1mm (A4 landscape)                     Δy medido no print
// Campo      y_template  y_final  x_range        x_center
// NOME        100.7mm    108mm    106→280mm       193mm  (underline após "aluno(a):")
// TURMA       115.0mm    117mm    172→247mm       210mm  (underline após "turma")
// ESCOLA      126.5mm    131mm     16→138mm        77mm  (blank antes de "Colégio")
// PERÍODO     137.9mm    140mm     16→174mm        95mm  (underline antes "com carga")
const CERT = {
  name:    { x: 193,   y: 108,  fontBase: 15, fontMin: 9,  maxW: 160, align: 'center', color: [10,10,80],   bold: true  },
  turma:   { x: 210,   y: 117,  font: 10,                             align: 'center', color: [10,10,80],   bold: false },
  escola:  { x:  77,   y: 131,  font: 10,     maxW: 118,             align: 'center', color: [40,40,40],   bold: false },
  periodo: { x:  95.3, y: 140,  font: 10,                             align: 'center', color: [40,40,40],   bold: false },
};

// ─── Render template PDF como JPEG via pdfjs ─────────────────────────────────
async function renderTemplate(url) {
  const pdf  = await pdfjsLib.getDocument(url).promise;
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
const fmtPeriodo = (ini, fim) => {
  if (!ini) return '';
  if (!fim || ini === fim) return toBR(ini);
  return `${toBR(ini)} a ${toBR(fim)}`;
};

// ─── Paletas de turno ─────────────────────────────────────────────────────────
const TC = { MATUTINO:'#fbbf24', VESPERTINO:'#f97316', NOTURNO:'#818cf8', INTEGRAL:'#34d399' };
const TB = { MATUTINO:'rgba(251,191,36,.12)', VESPERTINO:'rgba(249,115,22,.12)', NOTURNO:'rgba(129,140,248,.12)', INTEGRAL:'rgba(52,211,153,.12)' };

// ─── Ícones SVG inline ────────────────────────────────────────────────────────
const IcoAdd      = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{width:13,height:13}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>;
const IcoRemove   = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:12,height:12}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>;
const IcoCheck    = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" style={{width:11,height:11}}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>;
const IcoSearch   = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>;
const IcoDownload = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:18,height:18}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>;
const IcoSpin     = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{width:18,height:18,animation:'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0A12 12 0 000 12h4z" opacity=".75"/></svg>;

const TURNOS = ['MATUTINO','VESPERTINO','NOTURNO','INTEGRAL'];

// ═══════════════════════════════════════════════════════════════════════════════
export default function AphCbmdfPage() {
  const nomeEscola = localStorage.getItem('nome_escola') || 'Escola';
  const ano        = new Date().getFullYear();

  // ── FILTROS ────────────────────────────────────────────────────────────────
  const [turnoFiltro,  setTurnoFiltro]  = useState('');
  const [turmaId,      setTurmaId]      = useState('');
  const [buscaAluno,   setBuscaAluno]   = useState('');
  const [turmas,       setTurmas]       = useState([]);
  const [alunosTurma,  setAlunosTurma]  = useState([]);   // janela da turma atual
  const [loadTurmas,   setLoadTurmas]   = useState(false);
  const [loadAlunos,   setLoadAlunos]   = useState(false);

  // ── LOTE — acumulador central (padrão F.O. Coletivo) ──────────────────────
  // Nunca é resetado ao trocar de turma.
  const [lote, setLote] = useState([]); // [{id, nome, turma, turno, estudante}]

  // ── PERÍODO DO CURSO ───────────────────────────────────────────────────────
  const [dtInicio, setDtInicio] = useState('');
  const [dtFim,    setDtFim]    = useState('');

  // ── UI ────────────────────────────────────────────────────────────────────
  const [gerando, setGerando] = useState(false);
  const [erro,    setErro]    = useState('');
  const [sucesso, setSucesso] = useState('');

  // ── Carrega turmas ao mudar turno ──────────────────────────────────────────
  useEffect(() => {
    setTurmas([]); setTurmaId(''); setAlunosTurma([]);
    if (!turnoFiltro) return;
    setLoadTurmas(true);
    api.get('/api/turmas', { params: { filtro: turnoFiltro, ano } })
      .then(r => setTurmas((r.data || []).filter(t => t.turno?.toUpperCase().includes(turnoFiltro))))
      .catch(() => setErro('Erro ao carregar turmas.'))
      .finally(() => setLoadTurmas(false));
  }, [turnoFiltro]);

  // ── Carrega alunos ao mudar turma ──────────────────────────────────────────
  useEffect(() => {
    if (!turmaId) { setAlunosTurma([]); return; }
    setBuscaAluno('');
    setLoadAlunos(true);
    api.get('/api/alunos', { params: { turma_id: turmaId, status: 'ativo', limit: 200 } })
      .then(r => setAlunosTurma(r.data?.alunos || []))
      .catch(() => setErro('Erro ao carregar alunos.'))
      .finally(() => setLoadAlunos(false));
    // lote NÃO é tocado — alunos já adicionados permanecem (padrão F.O. Coletivo)
  }, [turmaId]);

  // ── LOTE: adicionar / remover ─────────────────────────────────────────────
  const adicionarAluno = (aluno) => {
    if (lote.find(l => l.id === aluno.id)) return; // já está
    setLote(prev => [...prev, aluno]);
  };
  const removerDoLote = (id) => setLote(prev => prev.filter(a => a.id !== id));
  const limparLote    = ()   => setLote([]);

  // ── Filtragem local por busca ─────────────────────────────────────────────
  const turmaNome = turmas.find(t => String(t.id) === String(turmaId));
  const alunosFiltrados = buscaAluno.trim()
    ? alunosTurma.filter(a => {
        const n = (a.estudante || a.nome || '').toLowerCase();
        const re = (a.re || a.matricula || '').toLowerCase();
        return n.includes(buscaAluno.toLowerCase()) || re.includes(buscaAluno.toLowerCase());
      })
    : alunosTurma;

  // ── Geração de PDF em lote ─────────────────────────────────────────────────
  const gerarPdf = async () => {
    if (!lote.length || gerando) return;
    if (!dtInicio) { setErro('Informe o início do período do curso.'); return; }
    setGerando(true); setErro(''); setSucesso('');

    try {
      const bg         = await renderTemplate('/templates/certificado_aph_cbmdf.pdf');
      const doc        = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const periodT    = fmtPeriodo(dtInicio, dtFim);
      const escolaLabel = nomeEscola; // capturado do localStorage no login

      lote.forEach((aluno, i) => {
        if (i > 0) doc.addPage('a4', 'landscape');
        doc.addImage(bg, 'JPEG', 0, 0, 297, 210);

        const nome = (aluno.estudante || aluno.nome || '').toUpperCase();

        // ── NOME (redução automática para nomes longos) ────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(CERT.name.fontBase);
        doc.setTextColor(...CERT.name.color);
        let fs = CERT.name.fontBase;
        while (doc.getTextWidth(nome) > CERT.name.maxW && fs > CERT.name.fontMin) {
          fs -= 0.5;
          doc.setFontSize(fs);
        }
        doc.text(nome, CERT.name.x, CERT.name.y, { align: CERT.name.align });

        // ── TURMA ──────────────────────────────────────────────────────────
        const turmaLabel = aluno.turma || '';
        if (turmaLabel) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(CERT.turma.font);
          doc.setTextColor(...CERT.turma.color);
          doc.text(turmaLabel, CERT.turma.x, CERT.turma.y, { align: CERT.turma.align });
        }

        // ── ESCOLA (blank antes de "Colégio Cívico-Militar") ──────────────
        if (escolaLabel) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(CERT.escola.font);
          doc.setTextColor(...CERT.escola.color);
          // Reduz fonte se nome da escola for muito longo
          let fsEscola = CERT.escola.font;
          while (doc.getTextWidth(escolaLabel) > CERT.escola.maxW && fsEscola > 7) {
            fsEscola -= 0.5;
            doc.setFontSize(fsEscola);
          }
          doc.text(escolaLabel, CERT.escola.x, CERT.escola.y, { align: CERT.escola.align });
        }

        // ── PERÍODO ────────────────────────────────────────────────────────
        if (periodT) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(CERT.periodo.font);
          doc.setTextColor(...CERT.periodo.color);
          doc.text(periodT, CERT.periodo.x, CERT.periodo.y, { align: CERT.periodo.align });
        }
      });

      const fname = `certificados-aph-${(periodT || 'sem-periodo').replace(/\//g,'-').replace(/ /g,'')}.pdf`;
      doc.save(fname);
      setSucesso(`✅ ${lote.length} certificado(s) gerado(s)! Arquivo: ${fname}`);
    } catch (e) {
      console.error('[APH-CBMDF]', e);
      setErro('Erro ao gerar PDF. Verifique o console.');
    } finally {
      setGerando(false);
    }
  };

  // ─── Estilos utilitários ──────────────────────────────────────────────────
  const card = { background:'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16 };
  const lbl  = { display:'block', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:1, marginBottom:5 };
  const inp  = { width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, color:'#fff', padding:'9px 12px', fontSize:13, outline:'none', boxSizing:'border-box', colorScheme:'dark' };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:'100vh', background:'linear-gradient(135deg,#0a0f1e 0%,#0d1530 60%,#0a0f1e 100%)', padding:'28px 20px', fontFamily:"'Inter',sans-serif"}}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
            <div style={{background:'linear-gradient(135deg,#dc2626,#991b1b)',borderRadius:12,padding:'9px 13px',flexShrink:0}}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="white" style={{width:22,height:22}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25z"/>
              </svg>
            </div>
            <div>
              <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-0.5px'}}>Certificado APH-CBMDF</h1>
              <p style={{margin:0,fontSize:11,color:'rgba(255,255,255,0.4)'}}>Corpo de Bombeiros Militar do DF — Atendimento Pré-Hospitalar · {nomeEscola}</p>
            </div>
          </div>
          <span style={{background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:20,padding:'2px 12px',fontSize:10,color:'#fca5a5',fontWeight:700}}>🔒 ACESSO RESTRITO — PERFIL MILITAR</span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>

          {/* ═══════════════════════════════════════════
              PAINEL ESQUERDO: Seleção de alunos
          ═══════════════════════════════════════════ */}
          <div>

            {/* Filtros */}
            <div style={{...card, padding:20, marginBottom:16}}>
              <p style={{margin:'0 0 16px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:1}}>📋 Selecionar Alunos</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div>
                  <label style={lbl}>Turno</label>
                  <select value={turnoFiltro} onChange={e=>setTurnoFiltro(e.target.value)} style={{...inp,cursor:'pointer'}}>
                    <option value="">— Selecione —</option>
                    {TURNOS.map(t=><option key={t} value={t} style={{background:'#1e2a4a'}}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Turma {loadTurmas && <span style={{opacity:.5}}>...</span>}</label>
                  <select value={turmaId} onChange={e=>setTurmaId(e.target.value)} disabled={!turnoFiltro||loadTurmas}
                    style={{...inp,cursor:'pointer',opacity:!turnoFiltro?.5:1}}>
                    <option value="">— Turma —</option>
                    {turmas.map(t=><option key={t.id} value={t.id} style={{background:'#1e2a4a'}}>{t.turma||t.nome_oficial||`Turma ${t.id}`}</option>)}
                  </select>
                </div>
              </div>

              {/* Busca */}
              {alunosTurma.length > 0 && (
                <div style={{position:'relative'}}>
                  <label style={lbl}>Filtrar por nome / RE</label>
                  <span style={{position:'absolute',left:10,bottom:10,color:'rgba(255,255,255,0.35)'}}><IcoSearch /></span>
                  <input type="text" value={buscaAluno} onChange={e=>setBuscaAluno(e.target.value)}
                    placeholder="Buscar..." style={{...inp,paddingLeft:30}} />
                </div>
              )}
            </div>

            {/* Lista de alunos da turma atual */}
            {loadAlunos && (
              <div style={{...card,padding:20,textAlign:'center',color:'rgba(255,255,255,0.4)',fontSize:13}}>
                <IcoSpin /> Carregando alunos...
              </div>
            )}

            {!loadAlunos && alunosFiltrados.length > 0 && (
              <div style={{...card,overflow:'hidden'}}>
                {/* Header da turma atual */}
                <div style={{padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>
                      {turmaNome?.turma || 'Turma'}
                    </span>
                    {turmaNome?.turno && (
                      <span style={{fontSize:10,fontWeight:700,background:TB[turmaNome.turno]||'transparent',color:TC[turmaNome.turno]||'#fff',borderRadius:10,padding:'1px 7px'}}>
                        {turmaNome.turno}
                      </span>
                    )}
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{alunosFiltrados.length} aluno{alunosFiltrados.length!==1?'s':''}</span>
                  </div>
                  {/* Adicionar todos visíveis */}
                  <button
                    onClick={() => alunosFiltrados.forEach(a => adicionarAluno(a))}
                    style={{background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:8,padding:'4px 10px',color:'#fca5a5',fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                    <IcoAdd /> Todos
                  </button>
                </div>

                {/* Linhas de aluno */}
                <div style={{maxHeight:320,overflowY:'auto'}}>
                  {alunosFiltrados.map((aluno,idx) => {
                    const jaAdicionado = lote.some(l => l.id === aluno.id);
                    return (
                      <div key={aluno.id}
                        style={{display:'flex',alignItems:'center',gap:10,padding:'9px 18px',
                          borderBottom:'1px solid rgba(255,255,255,0.04)',
                          background:jaAdicionado?'rgba(16,185,129,0.05)':idx%2===0?'transparent':'rgba(255,255,255,0.015)'}}>

                        {/* Avatar / check */}
                        <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,
                          background:jaAdicionado?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.08)',
                          border:`1.5px solid ${jaAdicionado?'#10b981':'rgba(255,255,255,0.15)'}`,
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,
                          color:jaAdicionado?'#10b981':'rgba(255,255,255,0.5)'}}>
                          {jaAdicionado ? <IcoCheck /> : (aluno.estudante||aluno.nome||'?')[0].toUpperCase()}
                        </div>

                        {/* Nome */}
                        <span style={{flex:1,fontSize:12,color:jaAdicionado?'rgba(255,255,255,0.4)':'rgba(255,255,255,0.85)',fontWeight:jaAdicionado?400:500}}>
                          {aluno.estudante || aluno.nome}
                        </span>

                        {/* Botão adicionar / badge adicionado */}
                        {jaAdicionado ? (
                          <span style={{fontSize:9,color:'#10b981',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Adicionado</span>
                        ) : (
                          <button onClick={() => adicionarAluno(aluno)}
                            style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',border:'none',borderRadius:6,
                              padding:'5px 10px',color:'#fff',fontWeight:700,fontSize:10,cursor:'pointer',
                              display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                            <IcoAdd /> Adicionar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loadAlunos && !alunosTurma.length && !turmaId && (
              <div style={{textAlign:'center',padding:'40px 0',color:'rgba(255,255,255,0.2)'}}>
                <div style={{fontSize:40,marginBottom:8}}>🏅</div>
                <p style={{fontSize:12,margin:0}}>Selecione turno e turma para ver os alunos</p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════
              PAINEL DIREITO: Lote + Período + Gerar
          ═══════════════════════════════════════════ */}
          <div>

            {/* Período do curso */}
            <div style={{...card, padding:20, marginBottom:16}}>
              <p style={{margin:'0 0 16px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:1}}>📅 Período do Curso</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={lbl}>Data de início</label>
                  <input type="date" value={dtInicio}
                    onChange={e=>{setDtInicio(e.target.value); if(!dtFim) setDtFim(e.target.value);}}
                    style={inp} />
                </div>
                <div>
                  <label style={lbl}>Data de fim</label>
                  <input type="date" value={dtFim} min={dtInicio||undefined}
                    onChange={e=>setDtFim(e.target.value)} style={inp} />
                </div>
              </div>
              {dtInicio && (
                <div style={{marginTop:10,background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'8px 12px'}}>
                  <span style={{fontSize:12,color:'#fca5a5',fontWeight:600}}>Período no certificado: </span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>{fmtPeriodo(dtInicio,dtFim)}</span>
                </div>
              )}
            </div>

            {/* Alertas */}
            {erro   && <div style={{background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'10px 14px',marginBottom:12,color:'#fca5a5',fontSize:12}}>⚠️ {erro}</div>}
            {sucesso && <div style={{background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.3)',borderRadius:10,padding:'10px 14px',marginBottom:12,color:'#6ee7b7',fontSize:12}}>{sucesso}</div>}

            {/* LOTE — lista de alunos acumulados */}
            <div style={{...card, overflow:'hidden'}}>
              {/* Header do lote */}
              <div style={{padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>Lista para Certificação</span>
                  {lote.length > 0 && (
                    <span style={{background:'rgba(220,38,38,0.2)',border:'1px solid rgba(220,38,38,0.4)',borderRadius:20,padding:'1px 9px',fontSize:11,color:'#fca5a5',fontWeight:800}}>
                      {lote.length}
                    </span>
                  )}
                </div>
                {lote.length > 0 && (
                  <button onClick={limparLote}
                    style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:6,padding:'3px 8px',color:'#f87171',fontSize:10,cursor:'pointer',fontWeight:600}}>
                    Limpar tudo
                  </button>
                )}
              </div>

              {/* Linhas do lote */}
              {lote.length === 0 ? (
                <div style={{padding:'36px 18px',textAlign:'center',color:'rgba(255,255,255,0.2)'}}>
                  <p style={{margin:0,fontSize:12}}>Nenhum aluno adicionado.</p>
                  <p style={{margin:'4px 0 0',fontSize:11,opacity:.6}}>Use o painel esquerdo para adicionar alunos.</p>
                </div>
              ) : (
                <div style={{maxHeight:320,overflowY:'auto'}}>
                  {lote.map((aluno, idx) => (
                    <div key={aluno.id}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'8px 18px',
                        borderBottom:'1px solid rgba(255,255,255,0.04)',
                        background:idx%2===0?'transparent':'rgba(255,255,255,0.015)'}}>

                      <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',minWidth:24,textAlign:'right',flexShrink:0}}>
                        {String(idx+1).padStart(2,'0')}
                      </span>

                      <span style={{flex:1,fontSize:12,color:'rgba(255,255,255,0.8)',fontWeight:500}}>
                        {aluno.estudante || aluno.nome}
                      </span>

                      {aluno.turma && (
                        <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',flexShrink:0}}>{aluno.turma}</span>
                      )}

                      {aluno.turno && (
                        <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,
                          background:TB[aluno.turno]||'transparent',color:TC[aluno.turno]||'#fff',
                          borderRadius:10,padding:'1px 6px',flexShrink:0}}>
                          {aluno.turno}
                        </span>
                      )}

                      <button onClick={() => removerDoLote(aluno.id)}
                        style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:5,
                          padding:'4px 5px',color:'#f87171',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center'}}>
                        <IcoRemove />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão GERA CERTIFICADOS */}
              {lote.length > 0 && (
                <div style={{padding:'16px 18px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
                  <button onClick={gerarPdf} disabled={gerando||!dtInicio}
                    style={{width:'100%',background:!gerando&&dtInicio?'linear-gradient(135deg,#dc2626 0%,#991b1b 100%)':'rgba(255,255,255,0.1)',
                      border:'none',borderRadius:10,padding:'13px',color:'#fff',fontWeight:800,fontSize:14,
                      cursor:!gerando&&dtInicio?'pointer':'not-allowed',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                      opacity:!dtInicio?.55:1,
                      boxShadow:dtInicio?'0 4px 20px rgba(220,38,38,0.35)':'none',
                      transition:'all 0.2s'}}>
                    {gerando
                      ? <><IcoSpin /> Gerando PDF...</>
                      : <><IcoDownload /> GERA CERTIFICADOS ({lote.length})</>}
                  </button>
                  {!dtInicio && (
                    <p style={{margin:'8px 0 0',textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.35)'}}>
                      Defina o período do curso para habilitar a geração.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </>
  );
}