import React,{useState,useEffect,useCallback}from'react';
import api from'../../../services/api';
import{DocumentTextIcon,PlusIcon,PrinterIcon,CheckCircleIcon,PencilSquareIcon,UserIcon,ClockIcon,EyeIcon,XMarkIcon,ArrowPathIcon,TrashIcon,ExclamationTriangleIcon}from'@heroicons/react/24/outline';
const fmtD=iso=>iso?new Date(iso).toLocaleString('pt-BR'):'—';
const ANO=String(new Date().getFullYear());
function Tag({s}){const ok=s==='Finalizado';return<span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:ok?'#dcfce7':'#fef9c3',color:ok?'#16a34a':'#ca8a04',border:`1px solid ${ok?'#bbf7d0':'#fef08a'}`}}>{s}</span>;}
function Toast({m,t,onClose}){useEffect(()=>{const x=setTimeout(onClose,3500);return()=>clearTimeout(x);},[onClose]);return<div style={{position:'fixed',bottom:24,right:24,zIndex:9999,background:t==='err'?'#fee2e2':'#dcfce7',border:`1px solid ${t==='err'?'#fca5a5':'#bbf7d0'}`,color:t==='err'?'#991b1b':'#166534',padding:'12px 20px',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',fontSize:14,fontWeight:600}}>{m}</div>;}
export default function AtasPage(){
const[atas,setAtas]=useState([]);
const[loading,setLoading]=useState(true);
const[toast,setToast]=useState(null);
const[printId,setPrintId]=useState(null);
const[busca,setBusca]=useState('');
const[form,setForm]=useState(null);
const[viewing,setViewing]=useState(false);
const[saving,setSaving]=useState(false);
const[delTarget,setDelTarget]=useState(null);
const[deleting,setDeleting]=useState(false);
const[ctxOpen,setCtxOpen]=useState(false);
const[turno,setTurno]=useState('');
const[turmas,setTurmas]=useState([]);
const[turmaId,setTurmaId]=useState('');
const[turmaNome,setTurmaNome]=useState('');
const[alunos,setAlunos]=useState([]);
const[alunoId,setAlunoId]=useState('');
const ok=m=>setToast({m,t:'ok'});
const er=m=>setToast({m,t:'err'});
const fetchAtas=useCallback(async()=>{setLoading(true);try{const{data}=await api.get('/api/disciplinar-atas');setAtas(data||[]);}catch{er('Erro ao carregar.');}finally{setLoading(false);};},[]);
useEffect(()=>{fetchAtas();},[fetchAtas]);
useEffect(()=>{if(!ctxOpen)return;api.get('/api/turmas',{params:{escola_id:localStorage.getItem('escola_id')||1}}).then(r=>setTurmas((r.data||[]).filter(t=>String(t.ano)===ANO))).catch(()=>setTurmas([]));},[ctxOpen]);
useEffect(()=>{if(!turmaId){setAlunos([]);return;}api.get('/api/alunos',{params:{turma_id:turmaId,limit:200}}).then(r=>{const d=r.data;setAlunos(Array.isArray(d)?d:d?.alunos||[]);}).catch(()=>setAlunos([]));},[turmaId]);
const turmasFilt=turmas.filter(t=>!turno||t.turno?.toLowerCase()===turno.toLowerCase()).sort((a,b)=>(a.turma||'').localeCompare(b.turma||'','pt-BR'));
const filtered=atas.filter(a=>a.titulo.toLowerCase().includes(busca.toLowerCase()));
const openNew=()=>{setCtxOpen(true);setTurno('');setTurmaId('');setTurmaNome('');setAlunoId('');};
const confirmCtx=()=>{if(!turno||!turmaId){er('Turno e turma são obrigatórios.');return;}setCtxOpen(false);setForm({titulo:'',conteudo:'',turno,turma_id:turmaId,turma_nome:turmaNome,aluno_id:alunoId||null});setViewing(false);};
const openEdit=a=>{if(a.status==='Finalizado')return;setForm({...a});setViewing(false);};
const openView=a=>{setForm({...a});setViewing(true);};
const handleSave=async()=>{if(!form.titulo?.trim()||!form.conteudo?.trim()){er('Título e conteúdo obrigatórios.');return;}setSaving(true);try{if(form.id)await api.put(`/api/disciplinar-atas/${form.id}`,{titulo:form.titulo,conteudo:form.conteudo});else await api.post('/api/disciplinar-atas',{titulo:form.titulo,conteudo:form.conteudo,turno:form.turno,turma_id:form.turma_id,turma_nome:form.turma_nome,aluno_id:form.aluno_id});ok(form.id?'Atualizada!':'Criada!');setForm(null);fetchAtas();}catch(e){er(e?.response?.data?.error||'Erro.');}finally{setSaving(false);};};
const handleFinalize=async()=>{if(!form?.id||!window.confirm('Finalizar? Não poderá ser editada.'))return;setSaving(true);try{await api.post(`/api/disciplinar-atas/${form.id}/finalizar`);ok('Finalizada!');setForm(null);fetchAtas();}catch(e){er(e?.response?.data?.error||'Erro.');}finally{setSaving(false);};};
const handlePrint=async a=>{setPrintId(a.id);try{const r=await api.get(`/api/disciplinar-atas/${a.id}/pdf`,{responseType:'blob'});const u=URL.createObjectURL(new Blob([r.data],{type:'application/pdf'}));window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000);}catch{er('Erro ao gerar PDF.');}finally{setPrintId(null);}};
const handleDelete=async()=>{if(!delTarget)return;setDeleting(true);try{await api.delete(`/api/disciplinar-atas/${delTarget.id}`);ok('Excluída.');setDelTarget(null);fetchAtas();}catch(e){er(e?.response?.data?.error||'Erro.');}finally{setDeleting(false);}};
const BD='linear-gradient(135deg,#1e3a8a,#1e40af)';
const BTN={display:'flex',alignItems:'center',gap:8,padding:'14px 28px',borderRadius:14,border:'none',cursor:'pointer',background:'#fff',color:'#1e3a8a',fontSize:14,fontWeight:700};
const IBTN=p=>({padding:8,borderRadius:8,border:'none',cursor:'pointer',...p});
return(
<div style={{maxWidth:900,margin:'0 auto',paddingBottom:64}}>
{toast&&<Toast m={toast.m} t={toast.t} onClose={()=>setToast(null)}/>}
<div style={{background:BD,borderRadius:24,padding:'32px 40px',marginBottom:32,boxShadow:'0 8px 32px rgba(30,58,138,0.3)'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
<div>
<div style={{fontSize:10,fontWeight:800,color:'#bfdbfe',letterSpacing:'0.1em',marginBottom:8}}>📋 GESTÃO DISCIPLINAR</div>
<h1 style={{fontSize:28,fontWeight:800,color:'#fff',margin:0}}>Atas e Registros Oficiais</h1>
<p style={{color:'rgba(219,234,254,0.8)',margin:'8px 0 0',fontSize:14}}>Gestão completa com rastreabilidade e impressão institucional.</p>
</div>
<div style={{display:'flex',gap:8}}>
<button onClick={fetchAtas} style={{padding:12,borderRadius:12,border:'1px solid rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.1)',color:'#fff',cursor:'pointer'}}><ArrowPathIcon style={{width:18,height:18}}/></button>
<button onClick={openNew} style={BTN}><PlusIcon style={{width:18,height:18}}/>Nova Ata</button>
</div>
</div>
</div>
<div style={{background:'#fff',borderRadius:24,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
<div style={{padding:24}}>
<input type="text" placeholder="Buscar atas por título..." value={busca} onChange={e=>setBusca(e.target.value)} style={{width:'100%',padding:'12px 16px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
</div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
{['Documento','Status','Autoria','Ações'].map((h,i)=><th key={i} style={{padding:'12px 16px',textAlign:i===3?'center':'left',fontSize:11,color:'#64748b',fontWeight:800,textTransform:'uppercase'}}>{h}</th>)}
</tr></thead>
<tbody>
{loading?<tr><td colSpan={4} style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Carregando...</td></tr>
:filtered.length===0?<tr><td colSpan={4} style={{padding:40,textAlign:'center',color:'#94a3b8'}}><ExclamationTriangleIcon style={{width:32,height:32,margin:'0 auto 8px',display:'block',opacity:0.4}}/>{busca?'Nenhuma ata encontrada.':'Nenhuma ata cadastrada.'}</td></tr>
:filtered.map(a=><tr key={a.id} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:16}}><div style={{fontWeight:600,color:'#0f172a',fontSize:14}}>{a.titulo}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>ID #{a.id}{a.turma_nome&&` • ${a.turma_nome}`}{a.turno&&` • ${a.turno}`}</div></td>
<td style={{padding:16}}><Tag s={a.status}/></td>
<td style={{padding:16}}><div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#475569'}}><UserIcon style={{width:14,height:14}}/>{a.editado_por||a.criado_por||'—'}</div><div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#94a3b8',marginTop:4}}><ClockIcon style={{width:13,height:13}}/>{fmtD(a.editado_em||a.criado_em)}</div></td>
<td style={{padding:16,textAlign:'center'}}><div style={{display:'inline-flex',gap:6}}>
<button onClick={()=>openView(a)} title="Ver" style={IBTN({background:'#eff6ff',color:'#3b82f6'})}><EyeIcon style={{width:15,height:15}}/></button>
{a.status!=='Finalizado'&&<button onClick={()=>openEdit(a)} title="Editar" style={IBTN({background:'#fef3c7',color:'#d97706'})}><PencilSquareIcon style={{width:15,height:15}}/></button>}
<button onClick={()=>handlePrint(a)} disabled={printId===a.id} title="Imprimir" style={IBTN({background:'#e0e7ff',color:'#4338ca',opacity:printId===a.id?0.5:1})}><PrinterIcon style={{width:15,height:15}}/></button>
<button onClick={()=>setDelTarget(a)} title="Excluir" style={IBTN({background:'#fee2e2',color:'#dc2626'})}><TrashIcon style={{width:15,height:15}}/></button>
</div></td>
</tr>)}
</tbody>
</table>
</div>
</div>
{ctxOpen&&<div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.75)',zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>{if(e.target===e.currentTarget)setCtxOpen(false);}}>
<div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:480,maxHeight:'90vh',overflow:'auto',boxShadow:'0 24px 60px rgba(0,0,0,0.25)'}}>
<div style={{background:BD,padding:'20px 24px',borderRadius:'20px 20px 0 0'}}>
<h2 style={{color:'#fff',margin:0,fontSize:17,fontWeight:800}}>📋 Configurar Contexto da Ata</h2>
<p style={{color:'#bfdbfe',margin:'4px 0 0',fontSize:12}}>Selecione o contexto antes de criar o registro</p>
</div>
<div style={{padding:24}}>
<p style={{fontSize:12,fontWeight:700,color:'#374151',textTransform:'uppercase',marginBottom:8}}>Turno *</p>
<div style={{display:'flex',gap:8,marginBottom:20}}>
{['Matutino','Vespertino','Noturno'].map(t=><button key={t} onClick={()=>{setTurno(t);setTurmaId('');setTurmaNome('');setAlunoId('');}} style={{flex:1,padding:'10px 4px',borderRadius:10,border:`2px solid ${turno===t?'#1e3a8a':'#e2e8f0'}`,background:turno===t?'#eff6ff':'#fff',color:turno===t?'#1e3a8a':'#64748b',fontWeight:700,cursor:'pointer',fontSize:13}}>{t}</button>)}
</div>
{turno&&<><p style={{fontSize:12,fontWeight:700,color:'#374151',textTransform:'uppercase',marginBottom:8}}>Turma *</p>
<div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:20}}>
{turmasFilt.length===0?<p style={{color:'#94a3b8',fontSize:13}}>Nenhuma turma encontrada.</p>:turmasFilt.map(t=><button key={t.id} onClick={()=>{setTurmaId(t.id);setTurmaNome(t.turma);setAlunoId('');}} style={{padding:'7px 14px',borderRadius:8,border:`2px solid ${turmaId===t.id?'#1e3a8a':'#e2e8f0'}`,background:turmaId===t.id?'#1e3a8a':'#fff',color:turmaId===t.id?'#fff':'#374151',fontWeight:600,cursor:'pointer',fontSize:13}}>{t.turma}</button>)}
</div></>}
{turmaId&&<><p style={{fontSize:12,fontWeight:700,color:'#374151',textTransform:'uppercase',marginBottom:8}}>Aluno (opcional)</p>
<select value={alunoId} onChange={e=>setAlunoId(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:14,outline:'none',marginBottom:20}}>
<option value="">— Ata referente à turma completa —</option>
{alunos.map(a=><option key={a.id||a.aluno_id} value={a.id||a.aluno_id}>{a.estudante}{a.codigo?` (RE: ${a.codigo})`:''}</option>)}
</select></>}
<div style={{background:turmaId?'#eff6ff':'#f8fafc',borderRadius:10,padding:'10px 14px',marginBottom:20,border:'1px solid #e2e8f0',fontSize:13,color:'#475569'}}>
{turmaId?<>✅ <b>{turmaNome}</b> • {turno}{alunoId&&alunos.find(a=>(a.id||a.aluno_id)==alunoId)?<> • {alunos.find(a=>(a.id||a.aluno_id)==alunoId)?.estudante}</>:' • Turma completa'}</>:'Selecione turno e turma para continuar.'}
</div>
<div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
<button onClick={()=>setCtxOpen(false)} style={{padding:'10px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontWeight:600,cursor:'pointer'}}>Cancelar</button>
<button onClick={confirmCtx} style={{padding:'10px 24px',borderRadius:10,border:'none',background:BD,color:'#fff',fontWeight:700,cursor:'pointer'}}>Continuar →</button>
</div>
</div>
</div>
</div>}
{form&&<div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.75)',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>{if(e.target===e.currentTarget)setForm(null);}}>
<div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:720,maxHeight:'92vh',overflow:'auto',boxShadow:'0 24px 60px rgba(0,0,0,0.25)',display:'flex',flexDirection:'column'}}>
<div style={{background:BD,padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderRadius:'20px 20px 0 0'}}>
<div><h2 style={{color:'#fff',margin:0,fontSize:17,fontWeight:800}}>{viewing?'📄 Visualizar':form.id?'✏️ Editar':'➕ Nova Ata'}</h2>{form.id&&<p style={{color:'#bfdbfe',margin:'2px 0 0',fontSize:11}}>ID #{form.id}</p>}</div>
<button onClick={()=>setForm(null)} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:8,padding:8,color:'#fff',cursor:'pointer'}}><XMarkIcon style={{width:20,height:20}}/></button>
</div>
<div style={{padding:24,overflowY:'auto',flex:1}}>
{form.id&&<div style={{background:'#f8fafc',padding:16,borderRadius:12,marginBottom:20,border:'1px solid #e2e8f0',fontSize:12}}>
<p style={{fontWeight:800,color:'#0f172a',margin:'0 0 8px'}}>🔍 Rastreabilidade</p>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,color:'#475569'}}>
<div><b>Criado por:</b> {form.criado_por||'—'}<br/><span style={{fontSize:11,color:'#94a3b8'}}>{fmtD(form.criado_em)}</span></div>
<div><b>Editado por:</b> {form.editado_por||'—'}<br/><span style={{fontSize:11,color:'#94a3b8'}}>{fmtD(form.editado_em)}</span></div>
{form.status==='Finalizado'&&<div style={{gridColumn:'1/-1',color:'#16a34a',borderTop:'1px solid #e2e8f0',paddingTop:8}}><b>✅ Finalizado por:</b> {form.finalizado_por||'—'} — {fmtD(form.finalizado_em)}</div>}
</div>
{(form.turma_nome||form.turno)&&<p style={{margin:'8px 0 0',color:'#1e3a8a',fontSize:12}}>📌 Contexto: <b>{form.turma_nome}</b>{form.turno&&` • ${form.turno}`}</p>}
</div>}
<div style={{marginBottom:16}}>
<label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6,textTransform:'uppercase'}}>Título *</label>
<input type="text" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} disabled={viewing} placeholder="Ex: Ata de Reunião Disciplinar — Turma 3A" style={{width:'100%',padding:12,borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,outline:'none',background:viewing?'#f8fafc':'#fff',boxSizing:'border-box'}}/>
</div>
<div>
<label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6,textTransform:'uppercase'}}>Conteúdo *</label>
<textarea rows={10} value={form.conteudo} onChange={e=>setForm({...form,conteudo:e.target.value})} disabled={viewing} placeholder="Descreva detalhadamente o ocorrido..." style={{width:'100%',padding:12,borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:14,outline:'none',resize:'vertical',background:viewing?'#f8fafc':'#fff',lineHeight:1.6,boxSizing:'border-box'}}/>
</div>
{form.id&&<div style={{marginTop:12,display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12,color:'#64748b'}}>Status:</span><Tag s={form.status}/></div>}
</div>
<div style={{padding:'16px 24px',borderTop:'1px solid #e2e8f0',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div>{!viewing&&form.id&&form.status!=='Finalizado'&&<button onClick={handleFinalize} disabled={saving} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderRadius:10,border:'none',cursor:'pointer',background:'#dcfce7',color:'#16a34a',fontWeight:700,fontSize:13}}><CheckCircleIcon style={{width:16,height:16}}/>Finalizar</button>}</div>
<div style={{display:'flex',gap:10}}>
<button onClick={()=>setForm(null)} style={{padding:'10px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontWeight:600,cursor:'pointer'}}>{viewing?'Fechar':'Cancelar'}</button>
{!viewing&&<button onClick={handleSave} disabled={saving} style={{padding:'10px 22px',borderRadius:10,border:'none',background:BD,color:'#fff',fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>{saving?'Salvando...':'Salvar'}</button>}
{viewing&&<button onClick={()=>handlePrint(form)} disabled={printId===form.id} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#4338ca,#6366f1)',color:'#fff',fontWeight:700,cursor:'pointer'}}><PrinterIcon style={{width:16,height:16}}/>{printId===form.id?'Gerando...':'Imprimir'}</button>}
</div>
</div>
</div>
</div>}
{delTarget&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:80,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
<div style={{background:'#fff',borderRadius:20,maxWidth:400,width:'100%',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
<div style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',padding:'24px',textAlign:'center'}}>
<div style={{width:52,height:52,background:'rgba(255,255,255,0.2)',borderRadius:'50%',margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🗑️</div>
<h2 style={{color:'#fff',margin:0,fontSize:18,fontWeight:800}}>Excluir Ata</h2>
</div>
<div style={{padding:24,textAlign:'center'}}>
<p style={{color:'#0f172a',fontWeight:600,marginBottom:4,fontSize:15}}>{delTarget.titulo}</p>
<p style={{color:'#64748b',fontSize:13,marginBottom:4}}>ID #{delTarget.id}</p>
<p style={{color:'#dc2626',fontSize:13,marginBottom:24,fontWeight:600}}>⚠️ Esta ação é irreversível. O registro será permanentemente excluído.</p>
<div style={{display:'flex',gap:10,justifyContent:'center'}}>
<button onClick={()=>setDelTarget(null)} style={{padding:'10px 24px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontWeight:600,cursor:'pointer',fontSize:14}}>Cancelar</button>
<button onClick={handleDelete} disabled={deleting} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#dc2626,#b91c1c)',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14,opacity:deleting?0.7:1}}>{deleting?'Excluindo...':'Excluir Definitivamente'}</button>
</div>
</div>
</div>
</div>}
</div>
);}
