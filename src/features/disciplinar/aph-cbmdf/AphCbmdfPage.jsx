import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Worker pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ─── Configurações de posicionamento do certificado (A4 landscape = 297x210mm) ─
// Ajuste fino após teste visual:
const CERT_CONFIG = {
  nameX: 148.5, nameY: 109, nameFontSize: 22,
  nameFont: 'helvetica', nameStyle: 'bold', nameAlign: 'center',
  nameColor: [15, 30, 80],
  dateX: 148.5, dateY: 155, dateFontSize: 11,
  dateAlign: 'center', dateColor: [60, 60, 60],
};

// ─── Renderiza PDF template como DataURL via pdfjs ────────────────────────────
async function renderPdfPageAsDataUrl(pdfUrl) {
  const pdf  = await pdfjsLib.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(1);
  const scale    = 3;
  const viewport = page.getViewport({ scale });
  const canvas   = document.createElement('canvas');
  canvas.width   = viewport.width;
  canvas.height  = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.98);
}

// ─── Formata data em pt-BR ────────────────────────────────────────────────────
function formatDatePt(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const meses = ['janeiro','fevereiro','março','abril','maio','junho',
                  'julho','agosto','setembro','outubro','novembro','dezembro'];
  return `Brasília-DF, ${parseInt(d)} de ${meses[parseInt(m)-1]} de ${y}`;
}

// ─── Ícones SVG inline ────────────────────────────────────────────────────────
const Ico = {
  Search:   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>,
  Download: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{width:20,height:20}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>,
  Check:    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{width:12,height:12}}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>,
  Spin:     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{width:20,height:20,animation:'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0A12 12 0 000 12h4z" opacity=".75"/></svg>,
  Key:      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="white" style={{width:24,height:24}}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25z"/></svg>,
};

const TURNOS = ['MATUTINO','VESPERTINO','NOTURNO','INTEGRAL'];
const TURNO_COLOR = { MATUTINO:'#fbbf24', VESPERTINO:'#f97316', NOTURNO:'#818cf8', INTEGRAL:'#34d399' };
const TURNO_BG    = { MATUTINO:'rgba(251,191,36,.12)', VESPERTINO:'rgba(249,115,22,.12)', NOTURNO:'rgba(129,140,248,.12)', INTEGRAL:'rgba(52,211,153,.12)' };

// ─── Componente ───────────────────────────────────────────────────────────────
export default function AphCbmdfPage() {
  const nomeEscola = localStorage.getItem('nome_escola') || 'Escola';
  const anoLetivo  = new Date().getFullYear();

  const [turnoFiltro, setTurnoFiltro]   = useState('');
  const [turmaId, setTurmaId]           = useState('');
  const [busca, setBusca]               = useState('');
  const [turmas, setTurmas]             = useState([]);
  const [alunos, setAlunos]             = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [dataCert, setDataCert]         = useState(new Date().toISOString().slice(0,10));
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [gerando, setGerando]           = useState(false);
  const [erro, setErro]                 = useState('');
  const [sucesso, setSucesso]           = useState('');

  // Carrega turmas ao mudar turno
  useEffect(() => {
    setTurmas([]); setTurmaId(''); setAlunos([]); setSelecionados(new Set());
    if (!turnoFiltro) return;
    setLoadingTurmas(true);
    api.get('/api/turmas', { params: { filtro: turnoFiltro, ano: anoLetivo } })
      .then(r => setTurmas((r.data||[]).filter(t => t.turno?.toUpperCase().includes(turnoFiltro))))
      .catch(() => setErro('Erro ao carregar turmas.'))
      .finally(() => setLoadingTurmas(false));
  }, [turnoFiltro]);

  // Carrega alunos ao mudar turma
  const buscarAlunos = useCallback(() => {
    if (!turmaId) return;
    setErro(''); setLoadingAlunos(true); setSelecionados(new Set());
    const params = { turma_id: turmaId, status: 'ativo', limit: 200 };
    if (busca.trim()) params.filtro = busca.trim();
    api.get('/api/alunos', { params })
      .then(r => setAlunos(r.data?.alunos || []))
      .catch(() => setErro('Erro ao carregar alunos.'))
      .finally(() => setLoadingAlunos(false));
  }, [turmaId, busca]);

  useEffect(() => { if (turmaId) buscarAlunos(); }, [turmaId]);

  // Seleção
  const toggle      = id  => setSelecionados(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleTodos = ()  => setSelecionados(selecionados.size===alunos.length ? new Set() : new Set(alunos.map(a=>a.id)));
  const todosSel    = alunos.length>0 && selecionados.size===alunos.length;
  const parcialSel  = selecionados.size>0 && selecionados.size<alunos.length;

  // Gera PDF em lote
  const gerarPdf = async () => {
    if (!selecionados.size || gerando || !dataCert) return;
    setGerando(true); setErro(''); setSucesso('');
    try {
      const bgUrl = await renderPdfPageAsDataUrl('/templates/certificado_aph_cbmdf.pdf');
      const doc   = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
      const lista = alunos.filter(a => selecionados.has(a.id));
      const dataPt = formatDatePt(dataCert);

      lista.forEach((aluno, i) => {
        if (i>0) doc.addPage('a4','landscape');
        // Fundo: template oficial
        doc.addImage(bgUrl, 'JPEG', 0, 0, 297, 210);
        // Nome do aluno
        doc.setFont(CERT_CONFIG.nameFont, CERT_CONFIG.nameStyle);
        doc.setFontSize(CERT_CONFIG.nameFontSize);
        doc.setTextColor(...CERT_CONFIG.nameColor);
        doc.text((aluno.estudante||aluno.nome||'').toUpperCase(), CERT_CONFIG.nameX, CERT_CONFIG.nameY, {align:CERT_CONFIG.nameAlign});
        // Data
        doc.setFont('helvetica','normal');
        doc.setFontSize(CERT_CONFIG.dateFontSize);
        doc.setTextColor(...CERT_CONFIG.dateColor);
        doc.text(dataPt, CERT_CONFIG.dateX, CERT_CONFIG.dateY, {align:CERT_CONFIG.dateAlign});
      });

      doc.save(`certificados-aph-cbmdf-${dataCert}.pdf`);
      setSucesso(`${lista.length} certificado(s) gerado(s) com sucesso!`);
    } catch(e) {
      console.error('[APH-CBMDF]', e);
      setErro('Erro ao gerar certificados. Verifique o console.');
    } finally { setGerando(false); }
  };

  const turmaNome = turmas.find(t=>String(t.id)===String(turmaId));

  // Estilos reutilizáveis
  const card = { background:'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:24 };
  const label = { display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 };
  const input = { width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, color:'#fff', padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box', colorScheme:'dark' };

  return (
    <>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <div style={{minHeight:'100vh', background:'linear-gradient(135deg,#0a0f1e 0%,#0d1530 50%,#0a0f1e 100%)', padding:'32px 24px', fontFamily:"'Inter',sans-serif"}}>

        {/* Header */}
        <div style={{marginBottom:32}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
            <div style={{background:'linear-gradient(135deg,#dc2626,#991b1b)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {Ico.Key}
            </div>
            <div>
              <h1 style={{margin:0,fontSize:26,fontWeight:800,color:'#fff',letterSpacing:'-0.5px'}}>Certificado APH-CBMDF</h1>
              <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,0.45)'}}>Corpo de Bombeiros Militar do DF — Atendimento Pré-Hospitalar</p>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[['🔒 ACESSO RESTRITO — PERFIL MILITAR','rgba(220,38,38,0.15)','rgba(220,38,38,0.3)','#fca5a5'],
              [nomeEscola,'rgba(255,255,255,0.08)','rgba(255,255,255,0.15)','rgba(255,255,255,0.6)'],
              [`Ano letivo ${anoLetivo}`,'rgba(255,255,255,0.08)','rgba(255,255,255,0.15)','rgba(255,255,255,0.6)'],
            ].map(([txt,bg,br,c],i) => (
              <span key={i} style={{background:bg,border:`1px solid ${br}`,borderRadius:20,padding:'2px 12px',fontSize:11,color:c,fontWeight:600}}>{txt}</span>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div style={{...card, marginBottom:24}}>
          <p style={{margin:'0 0 20px',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1}}>⚙️ Filtros</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16}}>

            {/* Turno */}
            <div>
              <label style={label}>Turno</label>
              <select value={turnoFiltro} onChange={e=>setTurnoFiltro(e.target.value)} style={{...input,cursor:'pointer'}}>
                <option value="">— Selecione —</option>
                {TURNOS.map(t=><option key={t} value={t} style={{background:'#1e2a4a'}}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>

            {/* Turma */}
            <div>
              <label style={label}>Turma {loadingTurmas && <span style={{opacity:.5}}>carregando...</span>}</label>
              <select value={turmaId} onChange={e=>setTurmaId(e.target.value)} disabled={!turnoFiltro||loadingTurmas}
                style={{...input,cursor:'pointer',opacity:!turnoFiltro?.5:1}}>
                <option value="">— Todas as turmas —</option>
                {turmas.map(t=><option key={t.id} value={t.id} style={{background:'#1e2a4a'}}>{t.turma||t.nome_oficial||`Turma ${t.id}`}</option>)}
              </select>
            </div>

            {/* Busca */}
            <div>
              <label style={label}>Buscar por nome</label>
              <div style={{position:'relative'}}>
                <input type="text" value={busca} onChange={e=>setBusca(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&buscarAlunos()}
                  placeholder="Nome do aluno..." style={{...input,paddingRight:36}} />
                <button onClick={buscarAlunos} disabled={!turmaId}
                  style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.5)',padding:0}}>
                  {Ico.Search}
                </button>
              </div>
            </div>

            {/* Data */}
            <div>
              <label style={label}>Data do certificado</label>
              <input type="date" value={dataCert} onChange={e=>setDataCert(e.target.value)} style={input} />
              {dataCert && <p style={{margin:'4px 0 0',fontSize:11,color:'rgba(255,255,255,0.35)'}}>{formatDatePt(dataCert)}</p>}
            </div>
          </div>

          <button onClick={buscarAlunos} disabled={!turmaId||loadingAlunos}
            style={{marginTop:16,background:turmaId?'linear-gradient(135deg,#dc2626,#991b1b)':'rgba(255,255,255,0.1)',
              border:'none',borderRadius:8,padding:'10px 24px',color:'#fff',fontWeight:700,fontSize:14,
              cursor:turmaId?'pointer':'not-allowed',display:'flex',alignItems:'center',gap:8,opacity:!turmaId?.5:1}}>
            {loadingAlunos ? <>{Ico.Spin} Buscando...</> : <>{Ico.Search} BUSCAR ALUNOS</>}
          </button>
        </div>

        {/* Alertas */}
        {erro   && <div style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'12px 16px',marginBottom:16,color:'#fca5a5',fontSize:14}}>⚠️ {erro}</div>}
        {sucesso && <div style={{background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',borderRadius:10,padding:'12px 16px',marginBottom:16,color:'#6ee7b7',fontSize:14}}>✅ {sucesso}</div>}

        {/* Lista de alunos */}
        {alunos.length > 0 && (
          <div style={{...card,padding:0,overflow:'hidden',marginBottom:24}}>
            {/* Cabeçalho */}
            <div style={{padding:'16px 24px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={toggleTodos} style={{
                  width:20,height:20,borderRadius:5,flexShrink:0,cursor:'pointer',
                  background:todosSel?'#dc2626':parcialSel?'rgba(220,38,38,0.4)':'rgba(255,255,255,0.1)',
                  border:`2px solid ${todosSel||parcialSel?'#dc2626':'rgba(255,255,255,0.3)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                }}>
                  {(todosSel||parcialSel) && Ico.Check}
                </button>
                <span style={{color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:600}}>
                  {turmaNome ? `${turmaNome.turma||'Turma'} — ${turmaNome.turno}` : 'Alunos'}
                </span>
                <span style={{background:'rgba(255,255,255,0.1)',borderRadius:20,padding:'2px 10px',fontSize:12,color:'rgba(255,255,255,0.45)'}}>
                  {alunos.length} aluno{alunos.length!==1?'s':''}
                </span>
              </div>
              {selecionados.size>0 && (
                <span style={{background:'rgba(220,38,38,0.2)',border:'1px solid rgba(220,38,38,0.4)',borderRadius:20,padding:'3px 12px',fontSize:12,color:'#fca5a5',fontWeight:700}}>
                  {selecionados.size} selecionado{selecionados.size!==1?'s':''}
                </span>
              )}
            </div>

            {/* Linhas */}
            <div style={{maxHeight:420,overflowY:'auto'}}>
              {alunos.map((aluno,idx) => {
                const sel = selecionados.has(aluno.id);
                const t   = aluno.turno || '';
                return (
                  <div key={aluno.id} onClick={()=>toggle(aluno.id)}
                    style={{display:'flex',alignItems:'center',gap:16,padding:'11px 24px',
                      cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)',
                      background:sel?'rgba(220,38,38,0.08)':idx%2===0?'transparent':'rgba(255,255,255,0.02)',
                      borderLeft:`3px solid ${sel?'#dc2626':'transparent'}`,transition:'background 0.15s'}}>

                    <div style={{width:17,height:17,borderRadius:4,flexShrink:0,
                      background:sel?'#dc2626':'rgba(255,255,255,0.08)',
                      border:`2px solid ${sel?'#dc2626':'rgba(255,255,255,0.2)'}`,
                      display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {sel && Ico.Check}
                    </div>

                    <span style={{fontSize:12,color:'rgba(255,255,255,0.3)',minWidth:26,textAlign:'right'}}>
                      {String(idx+1).padStart(2,'0')}
                    </span>

                    <span style={{flex:1,fontSize:14,fontWeight:sel?700:500,color:sel?'#fff':'rgba(255,255,255,0.8)'}}>
                      {aluno.estudante||aluno.nome}
                    </span>

                    <span style={{fontSize:12,color:'rgba(255,255,255,0.35)',minWidth:90,textAlign:'right'}}>
                      {aluno.turma}
                    </span>

                    {t && (
                      <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,
                        background:TURNO_BG[t]||'rgba(255,255,255,0.08)',
                        color:TURNO_COLOR[t]||'#fff',borderRadius:20,padding:'2px 8px',minWidth:82,textAlign:'center'}}>
                        {t}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rodapé — botão principal */}
        {alunos.length > 0 && (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
            <p style={{margin:0,color:'rgba(255,255,255,0.45)',fontSize:13}}>
              {!selecionados.size
                ? 'Selecione ao menos 1 aluno para gerar os certificados.'
                : `${selecionados.size} certificado${selecionados.size!==1?'s':''} será${selecionados.size!==1?'ão':''} gerado${selecionados.size!==1?'s':''} — ${formatDatePt(dataCert)}`}
            </p>
            <button onClick={gerarPdf} disabled={!selecionados.size||gerando||!dataCert}
              style={{
                background:selecionados.size&&!gerando&&dataCert?'linear-gradient(135deg,#dc2626 0%,#b91c1c 50%,#991b1b 100%)':'rgba(255,255,255,0.1)',
                border:'none',borderRadius:12,padding:'14px 32px',color:'#fff',fontWeight:800,fontSize:15,
                cursor:selecionados.size&&!gerando?'pointer':'not-allowed',
                display:'flex',alignItems:'center',gap:10,opacity:!selecionados.size||!dataCert?.5:1,
                boxShadow:selecionados.size?'0 4px 24px rgba(220,38,38,0.4)':'none',
                transition:'all 0.2s',letterSpacing:.5,
              }}>
              {gerando ? <>{Ico.Spin} Gerando PDF...</> : <>{Ico.Download} GERA CERTIFICADOS ({selecionados.size})</>}
            </button>
          </div>
        )}

        {/* Estados vazios */}
        {!loadingAlunos && alunos.length===0 && turmaId && (
          <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.3)'}}>
            <div style={{fontSize:48,marginBottom:12}}>👥</div>
            <p style={{fontSize:15,margin:0}}>Nenhum aluno encontrado.</p>
          </div>
        )}
        {!turmaId && (
          <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.25)'}}>
            <div style={{fontSize:56,marginBottom:12}}>🏅</div>
            <p style={{fontSize:15,margin:0,fontWeight:600,color:'rgba(255,255,255,0.35)'}}>Selecione turno e turma para começar</p>
            <p style={{fontSize:13,margin:'8px 0 0',opacity:.6}}>O sistema gerará um certificado APH-CBMDF por aluno selecionado em formato A4 horizontal.</p>
          </div>
        )}
      </div>
    </>
  );
}