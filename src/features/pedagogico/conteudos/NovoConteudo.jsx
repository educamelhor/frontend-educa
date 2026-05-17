import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

// ── Dados de seleção ──────────────────────────────────────────────
const MODALIDADES = ["Ensino Fundamental – Anos Finais", "Ensino Médio"];
const SERIES = {
  "Ensino Fundamental – Anos Finais": ["6º Ano", "7º Ano", "8º Ano", "9º Ano"],
  "Ensino Médio": ["1ª Série", "2ª Série", "3ª Série"],
};
const DISCIPLINAS = [
  "Língua Portuguesa","Matemática","Ciências","História","Geografia",
  "Inglês","Arte","Educação Física","Ensino Religioso","Geometria",
];
const BIMESTRES = ["1º Bimestre","2º Bimestre","3º Bimestre","4º Bimestre"];

// ── Paleta ────────────────────────────────────────────────────────
const C = {
  bg: "#f1f5f9",
  card: "#fff",
  hdr: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)",
  indigo: "#4f46e5",
  green: "#10b981",
  gray: "#94a3b8",
  text: "#1e293b",
  sub: "#64748b",
  border: "#e2e8f0",
  step: {
    done:    { bg:"#d1fae5", border:"#10b981", num:"#10b981", txt:"#065f46" },
    active:  { bg:"#eef2ff", border:"#4f46e5", num:"#4f46e5", txt:"#3730a3" },
    pending: { bg:"#f8fafc", border:"#e2e8f0", num:"#94a3b8", txt:"#94a3b8" },
  },
};

// ── Helpers ───────────────────────────────────────────────────────
const Sel = ({ label, value, onChange, opts }) => (
  <div style={{ flex:1, minWidth:180 }}>
    <label style={{ fontSize:12, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:".5px" }}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ display:"block", width:"100%", marginTop:6, padding:"10px 12px",
        border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, color:C.text,
        background:C.card, outline:"none", cursor:"pointer" }}>
      <option value="">Selecione…</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  </div>
);

const StepHeader = ({ num, title, status, summary }) => {
  const s = C.step[status];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom: status==="active" ? 20 : 0 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", background: status==="done" ? C.green : status==="active" ? C.indigo : "#e2e8f0",
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {status==="done"
          ? <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#fff" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
          : <span style={{ color: status==="active"?"#fff":"#94a3b8", fontWeight:700, fontSize:15 }}>{num}</span>}
      </div>
      <div>
        <div style={{ fontSize:16, fontWeight:700, color: status==="pending"?C.gray:C.text }}>{title}</div>
        {status==="done" && summary && <div style={{ fontSize:12, color:C.green, marginTop:2 }}>{summary}</div>}
      </div>
    </div>
  );
};

const Btn = ({ onClick, disabled, children, variant="primary", style={} }) => {
  const v = variant==="primary" ? { bg:C.indigo, color:"#fff" }
          : variant==="success" ? { bg:C.green,  color:"#fff" }
          : variant==="outline" ? { bg:"transparent", color:C.indigo, border:`1.5px solid ${C.indigo}` }
          : { bg:"#f1f5f9", color:C.sub };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:"11px 28px", borderRadius:10, border:v.border||"none",
        background:v.bg, color:v.color, fontWeight:700, fontSize:14,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1,
        transition:"all .2s", ...style }}>
      {children}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════
export default function NovoConteudo() {
  const navigate  = useNavigate();
  const bottomRef = useRef(null);
  const escolaId  = localStorage.getItem("escola_id");
  const nomeEscola = localStorage.getItem("nome_escola") || "Escola";

  // Etapas reveladas: 0=básico, 1=bncc, 2=seedf, 3=conteudo, 4=revisao
  const [step, setStep] = useState(0);

  // Step 1 – BÁSICO
  const [modalidade, setModalidade] = useState("");
  const [serie, setSerie]           = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [bimestre, setBimestre]     = useState("");

  // Step 2 – BNCC
  const [temasBncc, setTemasBncc]     = useState([]);
  const [temaSel, setTemaSel]         = useState(null);
  const [loadingBncc, setLoadingBncc] = useState(false);

  // Step 3 – SEE-DF
  const [conteudosSeedf, setConteudosSeedf]   = useState([]);
  const [conteudoSel, setConteudoSel]         = useState(null);
  const [objetivosSeedf, setObjetivosSeedf]   = useState([]);
  const [objetivoSel, setObjetivoSel]         = useState(null);

  // Step 4 – CONTEÚDO livre
  const [topicos, setTopicos] = useState([{ id:1, topico:"", subs:[""] }]);

  // Preview PDF
  const [preview, setPreview] = useState(false);
  const [saving, setSaving]   = useState(false);

  const scroll = () => setTimeout(()=>bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);

  // ── Avançar Etapa 1 ──────────────────────────────────────────
  async function avancarBasico() {
    if (!modalidade || !serie || !disciplina || !bimestre) return;
    setLoadingBncc(true);
    try {
      const r = await api.get(`/api/conteudos/admin/contexto/opcoes`, {
        params: { disciplina_id: disciplina, serie, escola_id: escolaId }
      });
      if (r.data?.ok) {
        setTemasBncc(r.data.temas || []);
        setConteudosSeedf(r.data.conteudos || []);
        setObjetivosSeedf(r.data.objetivos || []);
      }
    } catch { setTemasBncc([]); setConteudosSeedf([]); }
    finally { setLoadingBncc(false); }
    setStep(1); scroll();
  }

  // ── Tópicos dinâmicos ─────────────────────────────────────────
  const addTopico = () =>
    setTopicos(t=>[...t, { id:Date.now(), topico:"", subs:[""] }]);
  const updTopico = (id, val) =>
    setTopicos(t=>t.map(x=>x.id===id?{...x, topico:val}:x));
  const addSub = (id) =>
    setTopicos(t=>t.map(x=>x.id===id?{...x,subs:[...x.subs,""]}:x));
  const updSub = (id, si, val) =>
    setTopicos(t=>t.map(x=>x.id===id?{...x,subs:x.subs.map((s,i)=>i===si?val:s)}:x));
  const rmTopico = (id) =>
    setTopicos(t=>t.filter(x=>x.id!==id));

  // ── Publicar ─────────────────────────────────────────────────
  async function publicar() {
    setSaving(true);
    try {
      await api.post("/api/conteudos/admin/planejamento", {
        disciplina_id: disciplina,
        serie, bimestre: bimestre.charAt(0),
        ano_letivo: new Date().getFullYear(),
        bncc_unidade_tematica_id: temaSel?.id,
        seedf_conteudo_id: conteudoSel?.id,
        texto: topicos.map(t=>`${t.topico}\n${t.subs.join("\n")}`).join("\n\n"),
      });
      navigate("/pedagogico/conteudos-programaticos");
    } catch { alert("Erro ao publicar."); }
    finally { setSaving(false); }
  }

  const stepStatus = (n) => n < step ? "done" : n===step ? "active" : "pending";

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'Montserrat','Inter',sans-serif" }}>

      {/* HEADER */}
      <div style={{ background:C.hdr, padding:"28px 32px 32px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:.08,
          backgroundImage:"radial-gradient(circle at 20% 50%,#fff 1px,transparent 1px),radial-gradient(circle at 80% 20%,#fff 1px,transparent 1px)",
          backgroundSize:"40px 40px" }} />
        <div style={{ position:"relative", maxWidth:820, margin:"0 auto" }}>
          <button onClick={()=>navigate(-1)}
            style={{ background:"rgba(255,255,255,.12)", border:"none", borderRadius:8,
              color:"#c7d2fe", padding:"6px 14px", cursor:"pointer", fontSize:13, marginBottom:16 }}>
            ← Voltar
          </button>
          <h1 style={{ color:"#fff", fontSize:26, fontWeight:800, margin:0 }}>Novo Conteúdo Programático</h1>
          <p style={{ color:"#a5b4fc", margin:"6px 0 20px", fontSize:14 }}>{nomeEscola}</p>

          {/* Step bar */}
          <div style={{ display:"flex", gap:0, alignItems:"center" }}>
            {["Básico","BNCC","SEE-DF","Conteúdo"].map((lbl,i)=>(
              <React.Fragment key={i}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%",
                    background: i<step ? C.green : i===step ? "#fff" : "rgba(255,255,255,.15)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    border: `2px solid ${i<step?C.green:i===step?"#fff":"rgba(255,255,255,.3)"}` }}>
                    {i<step
                      ? <svg viewBox="0 0 24 24" width={14} fill="none" stroke="#fff" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                      : <span style={{ fontSize:12, fontWeight:700, color:i===step?C.indigo:"rgba(255,255,255,.5)" }}>{i+1}</span>}
                  </div>
                  <span style={{ fontSize:10, fontWeight:600, color:i<=step?"#c7d2fe":"rgba(255,255,255,.3)", whiteSpace:"nowrap" }}>{lbl}</span>
                </div>
                {i<3 && <div style={{ flex:1, height:2, background:i<step?C.green:"rgba(255,255,255,.15)", margin:"0 8px", marginBottom:18 }}/>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* STEPS */}
      <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 16px 60px" }}>

        {/* ── ETAPA 1: BÁSICO ───────────────────────────────────── */}
        <div style={{ background:C.card, borderRadius:16, padding:24, marginBottom:16,
          border:`2px solid ${step===0?C.indigo:step>0?C.green:C.border}`,
          boxShadow:"0 2px 16px rgba(0,0,0,.06)" }}>
          <StepHeader num={1} title="Básico" status={stepStatus(0)}
            summary={step>0 ? `${modalidade} · ${serie} · ${disciplina} · ${bimestre}` : ""} />
          {step===0 && (
            <>
              <div style={{ display:"flex", flexWrap:"wrap", gap:14, marginBottom:16 }}>
                <Sel label="Modalidade" value={modalidade} onChange={v=>{setModalidade(v);setSerie("");}} opts={MODALIDADES} />
                <Sel label="Série" value={serie} onChange={setSerie} opts={modalidade?SERIES[modalidade]:[]} />
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:14, marginBottom:24 }}>
                <Sel label="Disciplina" value={disciplina} onChange={setDisciplina} opts={DISCIPLINAS} />
                <Sel label="Bimestre" value={bimestre} onChange={setBimestre} opts={BIMESTRES} />
              </div>
              <Btn onClick={avancarBasico} disabled={!modalidade||!serie||!disciplina||!bimestre||loadingBncc}>
                {loadingBncc ? "Carregando…" : "Avançar →"}
              </Btn>
            </>
          )}
        </div>

        {/* ── ETAPA 2: BNCC ─────────────────────────────────────── */}
        {step>=1 && (
          <div style={{ background:C.card, borderRadius:16, padding:24, marginBottom:16,
            border:`2px solid ${step===1?C.indigo:step>1?C.green:C.border}`,
            boxShadow:"0 2px 16px rgba(0,0,0,.06)" }}>
            <StepHeader num={2} title="BNCC — Unidade Temática" status={stepStatus(1)}
              summary={temaSel?.texto} />
            {step===1 && (
              <>
                <p style={{ fontSize:13, color:C.sub, marginBottom:16 }}>Selecione a unidade temática da Base Nacional Comum Curricular:</p>
                {temasBncc.length===0
                  ? <p style={{ color:C.gray, fontSize:13 }}>Nenhuma unidade temática disponível para esta combinação.</p>
                  : <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:280, overflowY:"auto" }}>
                    {temasBncc.map(t=>(
                      <button key={t.id} onClick={()=>setTemaSel(t)}
                        style={{ textAlign:"left", padding:"12px 16px", borderRadius:10, border:`1.5px solid ${temaSel?.id===t.id?C.indigo:C.border}`,
                          background:temaSel?.id===t.id?"#eef2ff":C.card, color:C.text, cursor:"pointer",
                          fontWeight:temaSel?.id===t.id?700:400, fontSize:14 }}>
                        {t.texto}
                      </button>
                    ))}
                  </div>
                }
                <div style={{ display:"flex", gap:10, marginTop:20 }}>
                  <Btn variant="outline" onClick={()=>{setStep(0);}}>← Voltar</Btn>
                  <Btn onClick={()=>{setStep(2);scroll();}} disabled={!temaSel&&temasBncc.length>0}>
                    {temasBncc.length===0?"Pular →":"Avançar →"}
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ETAPA 3: SEE-DF ───────────────────────────────────── */}
        {step>=2 && (
          <div style={{ background:C.card, borderRadius:16, padding:24, marginBottom:16,
            border:`2px solid ${step===2?C.indigo:step>2?C.green:C.border}`,
            boxShadow:"0 2px 16px rgba(0,0,0,.06)" }}>
            <StepHeader num={3} title="SEE-DF — Currículo em Movimento" status={stepStatus(2)}
              summary={conteudoSel?.texto} />
            {step===2 && (
              <>
                <p style={{ fontSize:13, color:C.sub, marginBottom:16 }}>Selecione o conteúdo do Currículo em Movimento da Secretaria de Educação do DF:</p>
                {conteudosSeedf.length===0
                  ? <p style={{ color:C.gray, fontSize:13 }}>Nenhum conteúdo SEE-DF disponível. Você pode avançar sem selecionar.</p>
                  : <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:280, overflowY:"auto" }}>
                    {conteudosSeedf.map(c=>(
                      <button key={c.id} onClick={()=>setConteudoSel(c)}
                        style={{ textAlign:"left", padding:"12px 16px", borderRadius:10, border:`1.5px solid ${conteudoSel?.id===c.id?"#0ea5e9":C.border}`,
                          background:conteudoSel?.id===c.id?"#f0f9ff":C.card, color:C.text, cursor:"pointer",
                          fontWeight:conteudoSel?.id===c.id?700:400, fontSize:14 }}>
                        {c.texto}
                      </button>
                    ))}
                  </div>
                }
                <div style={{ display:"flex", gap:10, marginTop:20 }}>
                  <Btn variant="outline" onClick={()=>setStep(1)}>← Voltar</Btn>
                  <Btn onClick={()=>{setStep(3);scroll();}}>Avançar →</Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ETAPA 4: CONTEÚDO ─────────────────────────────────── */}
        {step>=3 && (
          <div style={{ background:C.card, borderRadius:16, padding:24, marginBottom:16,
            border:`2px solid ${step===3?C.indigo:C.green}`,
            boxShadow:"0 2px 16px rgba(0,0,0,.06)" }}>
            <StepHeader num={4} title="Conteúdo Programático — Tópicos" status={stepStatus(3)} />
            {step===3 && (
              <>
                <p style={{ fontSize:13, color:C.sub, marginBottom:20 }}>
                  Defina os tópicos e subtópicos do conteúdo. Clique em <strong>＋ Subtópico</strong> para adicionar subdivisões.
                </p>
                {topicos.map((tp, ti) => (
                  <div key={tp.id} style={{ background:"#f8fafc", borderRadius:12, padding:16, marginBottom:14,
                    border:`1.5px solid ${C.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:C.indigo,
                        color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:13, fontWeight:700, flexShrink:0 }}>{ti+1}</div>
                      <input value={tp.topico} onChange={e=>updTopico(tp.id,e.target.value)}
                        placeholder={`Tópico ${ti+1}…`}
                        style={{ flex:1, padding:"10px 14px", border:`1.5px solid ${C.border}`,
                          borderRadius:8, fontSize:14, color:C.text, outline:"none" }} />
                      {topicos.length>1 &&
                        <button onClick={()=>rmTopico(tp.id)}
                          style={{ background:"#fef2f2", border:"none", borderRadius:8, padding:"6px 10px",
                            color:"#dc2626", cursor:"pointer", fontSize:18 }}>×</button>}
                    </div>
                    {tp.subs.map((sb,si)=>(
                      <div key={si} style={{ display:"flex", alignItems:"center", gap:8, marginLeft:38, marginBottom:8 }}>
                        <span style={{ color:C.gray, fontSize:12 }}>└</span>
                        <input value={sb} onChange={e=>updSub(tp.id,si,e.target.value)}
                          placeholder={`Subtópico ${si+1}…`}
                          style={{ flex:1, padding:"8px 12px", border:`1.5px solid ${C.border}`,
                            borderRadius:8, fontSize:13, color:C.text, outline:"none", background:C.card }} />
                      </div>
                    ))}
                    <button onClick={()=>addSub(tp.id)}
                      style={{ marginLeft:38, background:"none", border:"none", color:C.indigo,
                        cursor:"pointer", fontSize:13, fontWeight:600, padding:"4px 0" }}>
                      ＋ Subtópico
                    </button>
                  </div>
                ))}
                <button onClick={addTopico}
                  style={{ display:"flex", alignItems:"center", gap:8, background:"#eef2ff",
                    border:`1.5px dashed ${C.indigo}`, borderRadius:10, padding:"12px 20px",
                    color:C.indigo, cursor:"pointer", fontSize:14, fontWeight:600, marginBottom:24, width:"100%" }}>
                  ＋ Novo Tópico
                </button>

                {/* Ações finais */}
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", borderTop:`1px solid ${C.border}`, paddingTop:20 }}>
                  <Btn variant="outline" onClick={()=>setStep(2)}>← Voltar</Btn>
                  <Btn variant="outline" onClick={()=>setPreview(true)}>
                    <span>👁 Visualizar PDF</span>
                  </Btn>
                  <Btn variant="success" onClick={publicar} disabled={saving} style={{ marginLeft:"auto" }}>
                    {saving ? "Publicando…" : "✓ Publicar"}
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── MODAL PREVIEW ─────────────────────────────────────────── */}
      {preview && (
        <div onClick={()=>setPreview(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:"#fff", width:"100%", maxWidth:680, maxHeight:"90vh",
              borderRadius:16, overflow:"auto", boxShadow:"0 24px 80px rgba(0,0,0,.4)" }}>

            {/* Capa do PDF */}
            <div style={{ background:C.hdr, padding:"36px 40px 28px" }}>
              <div style={{ color:"#c7d2fe", fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>
                CONTEÚDO PROGRAMÁTICO
              </div>
              <h2 style={{ color:"#fff", fontSize:22, fontWeight:800, margin:"8px 0 4px" }}>{disciplina}</h2>
              <p style={{ color:"#a5b4fc", fontSize:14, margin:0 }}>
                {serie} · {bimestre} · {new Date().getFullYear()}
              </p>
              <p style={{ color:"#818cf8", fontSize:12, margin:"8px 0 0" }}>{nomeEscola}</p>
            </div>

            {/* Corpo */}
            <div style={{ padding:"28px 40px 36px", fontSize:14, color:C.text, lineHeight:1.7 }}>
              {temaSel && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.indigo, textTransform:"uppercase", letterSpacing:1 }}>Unidade Temática — BNCC</div>
                  <div style={{ fontWeight:600, marginTop:4 }}>{temaSel.texto}</div>
                </div>
              )}
              {conteudoSel && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#0ea5e9", textTransform:"uppercase", letterSpacing:1 }}>Conteúdo — SEE-DF</div>
                  <div style={{ fontWeight:600, marginTop:4 }}>{conteudoSel.texto}</div>
                </div>
              )}
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>Tópicos e Subtópicos</div>
                {topicos.map((tp,i)=>(
                  <div key={tp.id} style={{ marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:C.text }}>
                      {i+1}. {tp.topico || <em style={{ color:C.gray }}>Sem título</em>}
                    </div>
                    {tp.subs.filter(Boolean).map((s,si)=>(
                      <div key={si} style={{ paddingLeft:24, color:C.sub, fontSize:13, marginTop:4 }}>• {s}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé do modal */}
            <div style={{ display:"flex", gap:12, padding:"0 40px 28px", justifyContent:"flex-end" }}>
              <Btn variant="outline" onClick={()=>setPreview(false)}>Fechar</Btn>
              <Btn onClick={()=>window.print()}>🖨 Imprimir</Btn>
              <Btn variant="success" onClick={()=>{setPreview(false);publicar();}}>✓ Publicar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
