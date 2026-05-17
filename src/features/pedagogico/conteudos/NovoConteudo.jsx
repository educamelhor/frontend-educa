import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const C = {
  bg: "#f1f5f9", card: "#fff",
  hdr: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)",
  ind: "#4f46e5", grn: "#10b981", gry: "#94a3b8",
  txt: "#1e293b", sub: "#64748b", bdr: "#e2e8f0",
};

const SERIES_POR_ETAPA = {
  FUNDAMENTAL:    [1,2,3,4,5,6,7,8,9].map(n => ({ label: `${n}º Ano`, anoId: n, serieLabel: `${n}º ANO` })),
  FUNDAMENTAL_I:  [1,2,3,4,5].map(n => ({ label: `${n}º Ano`, anoId: n, serieLabel: `${n}º ANO` })),
  FUNDAMENTAL_II: [6,7,8,9].map(n => ({ label: `${n}º Ano`, anoId: n, serieLabel: `${n}º ANO` })),
  MEDIO:          [1,2,3].map(n => ({ label: `${n}ª Série`, anoId: 9+n, serieLabel: `${n}ª SÉRIE` })),
};
const ETAPA_LABELS = {
  FUNDAMENTAL:    "Ensino Fundamental",
  FUNDAMENTAL_I:  "Ens. Fundamental — Anos Iniciais",
  FUNDAMENTAL_II: "Ens. Fundamental — Anos Finais",
  MEDIO:          "Ensino Médio",
};
function etapaLabel(e) {
  const k = (e || "").toUpperCase().replace(/[ÁÉÍÓÚ]/g, c => ({Á:"A",É:"E",Í:"I",Ó:"O",Ú:"U"}[c] || c)).replace(/\s+/g, "_");
  return ETAPA_LABELS[k] || e;
}
function seriesPorEtapa(e) {
  if (!e) return [];
  const k = (e || "").toUpperCase().replace(/[ÁÉÍÓÚ]/g, c => ({Á:"A",É:"E",Í:"I",Ó:"O",Ú:"U"}[c] || c)).replace(/\s+/g, "_");
  return SERIES_POR_ETAPA[k] || SERIES_POR_ETAPA.FUNDAMENTAL;
}

function Btn({ onClick, disabled, children, variant = "primary", style = {} }) {
  const v = variant === "success" ? { bg: C.grn, color: "#fff" }
    : variant === "outline" ? { bg: "transparent", color: C.ind, border: `1.5px solid ${C.ind}` }
    : { bg: C.ind, color: "#fff" };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "10px 24px", borderRadius: 10, border: v.border || "none",
        background: v.bg, color: v.color, fontWeight: 700, fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, ...style }}>
      {children}
    </button>
  );
}

function Lista({ items, selId, onSel, emptyMsg }) {
  if (!items.length) return <p style={{ color: C.gry, fontSize: 13 }}>{emptyMsg}</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onSel(it)}
          style={{ textAlign: "left", padding: "11px 16px", borderRadius: 10,
            border: `1.5px solid ${selId === it.id ? C.ind : C.bdr}`,
            background: selId === it.id ? "#eef2ff" : C.card,
            color: C.txt, cursor: "pointer", fontWeight: selId === it.id ? 700 : 400, fontSize: 14 }}>
          {it.texto}
        </button>
      ))}
    </div>
  );
}

function Card({ step, active, done, title, num, summary, children }) {
  const border = done ? C.grn : active ? C.ind : C.bdr;
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 24, marginBottom: 16,
      border: `2px solid ${border}`, boxShadow: "0 2px 16px rgba(0,0,0,.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: active ? 20 : 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%",
          background: done ? C.grn : active ? C.ind : "#e2e8f0",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {done
            ? <svg viewBox="0 0 24 24" width={18} fill="none" stroke="#fff" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
            : <span style={{ color: active ? "#fff" : C.gry, fontWeight: 700, fontSize: 15 }}>{num}</span>}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: done || active ? C.txt : C.gry }}>{title}</div>
          {done && summary && <div style={{ fontSize: 12, color: C.grn, marginTop: 2 }}>{summary}</div>}
        </div>
      </div>
      {active && children}
    </div>
  );
}

export default function NovoConteudo() {
  const nav = useNavigate();
  const btmRef = useRef(null);
  const escolaId = localStorage.getItem("escola_id");
  const nomeEscola = localStorage.getItem("nome_escola") || "Escola";

  // steps: 0=básico, 1=bncc, 2=seedf, 3=conteúdo
  const [step, setStep] = useState(0);
  const [bnccSub, setBnccSub] = useState(0); // 0=unidade, 1=objeto

  // BÁSICO
  const [etapas, setEtapas] = useState([]);
  const [etapa, setEtapa] = useState("");
  const [disciplinas, setDisciplinas] = useState([]);
  const [discId, setDiscId] = useState("");
  const [discNome, setDiscNome] = useState(""); // nome real p/ BNCC matching
  const [serieObj, setSerieObj] = useState(null); // {label, anoId, serieLabel}
  const [bimestre, setBimestre] = useState("");

  // BNCC
  const [unidades, setUnidades] = useState([]);
  const [unidadeSel, setUnidadeSel] = useState(null);
  const [objetos, setObjetos] = useState([]);
  const [objetoSel, setObjetoSel] = useState(null);
  const [loadingBncc, setLoadingBncc] = useState(false);

  // SEE-DF
  const [seedfList, setSeedfList] = useState([]);
  const [seedfSel, setSeedfSel] = useState(null);
  const [loadingSeedf, setLoadingSeedf] = useState(false);

  // CONTEÚDO
  const [topicos, setTopicos] = useState([{ id: 1, topico: "", subs: [""] }]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const scroll = () => setTimeout(() => btmRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  useEffect(() => {
    // Usa /api/disciplinas — endpoint já funcional da Secretaria
    // Retorna: [{id, disciplina, etapa, turno, carga, escola_id}]
    api.get("/api/disciplinas")
      .then(r => {
        const lista = Array.isArray(r.data) ? r.data : [];
        const discs = lista.map(d => ({
          id: d.id,
          nome: d.disciplina || d.nome || "",
          etapa: (d.etapa || "").toUpperCase(),
          tem_bncc: true, // assume true; BNCC step vai confirmar ao carregar
        }));
        const ets = [...new Set(discs.map(d => d.etapa))].filter(Boolean).sort();
        setDisciplinas(discs);
        setEtapas(ets);
        if (ets.length === 1) setEtapa(ets[0]);
      })
      .catch(() => {});
  }, []);

  async function avancarBasico() {
    if (!discId || !discNome || !serieObj || !bimestre) return;
    setLoadingBncc(true);
    try {
      const r = await api.get("/api/conteudos/admin/bncc/unidades", {
        params: { disciplina_nome: discNome, ano_id: serieObj.anoId }
      });
      setUnidades(r.data?.unidades || []);
    } catch { setUnidades([]); }
    finally { setLoadingBncc(false); }
    setUnidadeSel(null); setObjetos([]); setObjetoSel(null); setBnccSub(0);
    setStep(1); scroll();
  }

  async function selecionarUnidade(u) {
    setUnidadeSel(u); setObjetoSel(null);
    setLoadingBncc(true);
    try {
      const r = await api.get("/api/conteudos/admin/bncc/objetos", {
        params: { unidade_tematica_id: u.id }
      });
      setObjetos(r.data?.objetos || []);
    } catch { setObjetos([]); }
    finally { setLoadingBncc(false); }
    setBnccSub(1); scroll();
  }

  async function avancarBncc() {
    if (!unidadeSel && unidades.length > 0) return;
    setLoadingSeedf(true);
    try {
      const params = { disciplina_nome: discNome, serie: serieObj.serieLabel };
      if (unidadeSel) params.unidade_tematica_id = unidadeSel.id;
      const r = await api.get("/api/conteudos/admin/seedf/conteudos", { params });
      setSeedfList(r.data?.conteudos || []);
    } catch { setSeedfList([]); }
    finally { setLoadingSeedf(false); }
    setSeedfSel(null); setStep(2); scroll();
  }

  async function publicar() {
    setSaving(true);
    try {
      await api.post("/api/conteudos/admin/planejamento", {
        disciplina_id: Number(discId),
        serie: serieObj.serieLabel,
        bimestre: Number(bimestre),
        ano_letivo: new Date().getFullYear(),
        bncc_unidade_tematica_id: unidadeSel?.id || null,
        objeto_conhecimento_id: objetoSel?.id || null,
        seedf_conteudo_id: seedfSel?.id || null,
        texto: JSON.stringify(
          topicos.map(t => ({ topico: t.topico, subs: t.subs.filter(Boolean) }))
        ),
      });
      nav("/pedagogico/conteudos-programaticos");
    } catch { alert("Erro ao publicar. Tente novamente."); }
    finally { setSaving(false); }
  }

  // tópicos helpers
  const addTop = () => setTopicos(t => [...t, { id: Date.now(), topico: "", subs: [""] }]);
  const updTop = (id, v) => setTopicos(t => t.map(x => x.id === id ? { ...x, topico: v } : x));
  const rmTop = (id) => setTopicos(t => t.filter(x => x.id !== id));
  const addSub = (id) => setTopicos(t => t.map(x => x.id === id ? { ...x, subs: [...x.subs, ""] } : x));
  const updSub = (id, si, v) => setTopicos(t => t.map(x => x.id === id ? { ...x, subs: x.subs.map((s, i) => i === si ? v : s) } : x));

  const discSel = disciplinas.find(d => String(d.id) === String(discId));

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Montserrat','Inter',sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: C.hdr, padding: "28px 32px 32px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <button onClick={() => nav(-1)}
            style={{ background: "rgba(255,255,255,.12)", border: "none", borderRadius: 8,
              color: "#c7d2fe", padding: "6px 14px", cursor: "pointer", fontSize: 13, marginBottom: 16 }}>
            ← Voltar
          </button>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 }}>Novo Conteúdo Programático</h1>
          <p style={{ color: "#a5b4fc", margin: "6px 0 20px", fontSize: 14 }}>{nomeEscola}</p>

          {/* Stepper */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {["Básico", "BNCC", "SEE-DF", "Conteúdo"].map((lbl, i) => (
              <React.Fragment key={i}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%",
                    background: i < step ? C.grn : i === step ? "#fff" : "rgba(255,255,255,.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `2px solid ${i < step ? C.grn : i === step ? "#fff" : "rgba(255,255,255,.3)"}` }}>
                    {i < step
                      ? <svg viewBox="0 0 24 24" width={14} fill="none" stroke="#fff" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                      : <span style={{ fontSize: 12, fontWeight: 700, color: i === step ? C.ind : "rgba(255,255,255,.5)" }}>{i + 1}</span>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: i <= step ? "#c7d2fe" : "rgba(255,255,255,.3)" }}>{lbl}</span>
                </div>
                {i < 3 && <div style={{ flex: 1, height: 2, background: i < step ? C.grn : "rgba(255,255,255,.15)", margin: "0 8px", marginBottom: 18 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* STEPS */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 16px 60px" }}>

        {/* ── ETAPA 1: BÁSICO ── */}
        <Card num={1} title="Básico" active={step === 0} done={step > 0}
          summary={discNome ? `${discNome} · ${serieObj?.label} · ${bimestre}º Bimestre` : ""}>

          {/* Linha 1: Etapa + Disciplina */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase" }}>Etapa</label>
              <select value={etapa} onChange={e => { setEtapa(e.target.value); setDiscId(""); setDiscNome(""); setSerieObj(null); }}
                style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px",
                  border: `1.5px solid ${C.bdr}`, borderRadius: 10, fontSize: 14, background: C.card }}>
                <option value="">Selecione…</option>
                {etapas.map(et => <option key={et} value={et}>{etapaLabel(et)}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase" }}>Disciplina</label>
              <select value={discId}
                onChange={ev => {
                  const d = disciplinas.find(x => String(x.id) === ev.target.value);
                  setDiscId(ev.target.value);
                  setDiscNome(d?.nome || "");
                }}
                disabled={!etapa}
                style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px",
                  border: `1.5px solid ${C.bdr}`, borderRadius: 10, fontSize: 14,
                  background: C.card, opacity: !etapa ? .5 : 1 }}>
                <option value="">Selecione…</option>
                {disciplinas.filter(d => d.etapa === etapa).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nome}{!d.tem_bncc ? " (sem BNCC)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Série + Bimestre */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase" }}>Série / Ano</label>
              <select value={serieObj?.label || ""}
                onChange={e => setSerieObj(seriesPorEtapa(etapa).find(s => s.label === e.target.value) || null)}
                disabled={!etapa}
                style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px",
                  border: `1.5px solid ${C.bdr}`, borderRadius: 10, fontSize: 14,
                  background: C.card, opacity: !etapa ? .5 : 1 }}>
                <option value="">Selecione…</option>
                {seriesPorEtapa(etapa).map(s => <option key={s.label}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase" }}>Bimestre</label>
              <select value={bimestre} onChange={e => setBimestre(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px",
                  border: `1.5px solid ${C.bdr}`, borderRadius: 10, fontSize: 14, background: C.card }}>
                <option value="">Selecione…</option>
                {["1","2","3","4"].map(b => <option key={b} value={b}>{b}º Bimestre</option>)}
              </select>
            </div>
          </div>

          <Btn onClick={avancarBasico} disabled={!discId || !discNome || !serieObj || !bimestre || loadingBncc}>
            {loadingBncc ? "Carregando…" : "Avançar →"}
          </Btn>
        </Card>

        {/* ── ETAPA 2: BNCC ── */}
        {step >= 1 && (
          <Card num={2} title="BNCC — Base Nacional Comum Curricular" active={step === 1} done={step > 1}
            summary={unidadeSel ? `${unidadeSel.texto}${objetoSel ? " › " + objetoSel.texto : ""}` : ""}>

            {/* Sub-step A: Unidade Temática */}
            <div style={{ marginBottom: bnccSub >= 1 && unidadeSel ? 20 : 0 }}>
              <p style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>
                <strong>A)</strong> Selecione a <strong>Unidade Temática</strong>:
              </p>
              <Lista items={unidades} selId={unidadeSel?.id}
                onSel={selecionarUnidade}
                emptyMsg="Nenhuma unidade temática disponível para essa combinação." />
            </div>

            {/* Sub-step B: Objeto de Conhecimento (aparece após selecionar unidade) */}
            {bnccSub >= 1 && unidadeSel && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px dashed ${C.bdr}` }}>
                <p style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>
                  <strong>B)</strong> Selecione o <strong>Objeto de Conhecimento</strong> {loadingBncc ? "(carregando…)" : "(opcional):"}
                </p>
                <Lista items={objetos} selId={objetoSel?.id}
                  onSel={o => setObjetoSel(prev => prev?.id === o.id ? null : o)}
                  emptyMsg="Nenhum objeto de conhecimento encontrado para esta unidade." />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Btn variant="outline" onClick={() => { setStep(0); setBnccSub(0); }}>← Voltar</Btn>
              <Btn onClick={avancarBncc} disabled={(unidades.length > 0 && !unidadeSel) || loadingSeedf}>
                {loadingSeedf ? "Carregando…" : unidades.length === 0 ? "Pular →" : "Avançar →"}
              </Btn>
            </div>
          </Card>
        )}

        {/* ── ETAPA 3: SEE-DF ── */}
        {step >= 2 && (
          <Card num={3} title="SEE-DF — Currículo em Movimento" active={step === 2} done={step > 2}
            summary={seedfSel?.texto}>
            <p style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>
              Selecione o conteúdo do Currículo em Movimento da Secretaria de Educação do DF <em>(opcional)</em>:
            </p>
            <Lista items={seedfList} selId={seedfSel?.id}
              onSel={c => setSeedfSel(prev => prev?.id === c.id ? null : c)}
              emptyMsg="Nenhum conteúdo SEE-DF encontrado para essa combinação. Você pode avançar sem selecionar." />
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Btn variant="outline" onClick={() => setStep(1)}>← Voltar</Btn>
              <Btn onClick={() => { setStep(3); scroll(); }}>Avançar →</Btn>
            </div>
          </Card>
        )}

        {/* ── ETAPA 4: CONTEÚDO ── */}
        {step >= 3 && (
          <Card num={4} title="Conteúdo Programático — Tópicos" active={step === 3} done={false}>
            <p style={{ fontSize: 13, color: C.sub, marginBottom: 18 }}>
              Defina os tópicos e subtópicos do conteúdo programático:
            </p>

            {topicos.map((tp, ti) => (
              <div key={tp.id} style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 12,
                border: `1.5px solid ${C.bdr}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.ind,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{ti + 1}</div>
                  <input value={tp.topico} onChange={e => updTop(tp.id, e.target.value)}
                    placeholder={`Tópico ${ti + 1}…`}
                    style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${C.bdr}`,
                      borderRadius: 8, fontSize: 14, color: C.txt, outline: "none" }} />
                  {topicos.length > 1 &&
                    <button onClick={() => rmTop(tp.id)}
                      style={{ background: "#fef2f2", border: "none", borderRadius: 8, padding: "6px 10px",
                        color: "#dc2626", cursor: "pointer", fontSize: 18 }}>×</button>}
                </div>
                {tp.subs.map((sb, si) => (
                  <div key={si} style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 38, marginBottom: 8 }}>
                    <span style={{ color: C.gry, fontSize: 12 }}>└</span>
                    <input value={sb} onChange={e => updSub(tp.id, si, e.target.value)}
                      placeholder={`Subtópico ${si + 1}…`}
                      style={{ flex: 1, padding: "8px 12px", border: `1.5px solid ${C.bdr}`,
                        borderRadius: 8, fontSize: 13, color: C.txt, outline: "none" }} />
                  </div>
                ))}
                <button onClick={() => addSub(tp.id)}
                  style={{ marginLeft: 38, background: "none", border: "none", color: C.ind,
                    cursor: "pointer", fontSize: 13, fontWeight: 600 }}>＋ Subtópico</button>
              </div>
            ))}

            <button onClick={addTop}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#eef2ff",
                border: `1.5px dashed ${C.ind}`, borderRadius: 10, padding: "12px 20px",
                color: C.ind, cursor: "pointer", fontSize: 14, fontWeight: 600, marginBottom: 24, width: "100%" }}>
              ＋ Novo Tópico
            </button>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", borderTop: `1px solid ${C.bdr}`, paddingTop: 20 }}>
              <Btn variant="outline" onClick={() => setStep(2)}>← Voltar</Btn>
              <Btn variant="outline" onClick={() => setPreview(true)}>👁 Visualizar</Btn>
              <Btn variant="success" onClick={publicar} disabled={saving} style={{ marginLeft: "auto" }}>
                {saving ? "Publicando…" : "✓ Publicar"}
              </Btn>
            </div>
          </Card>
        )}

        <div ref={btmRef} />
      </div>

      {/* PREVIEW */}
      {preview && (
        <div onClick={() => setPreview(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", width: "100%", maxWidth: 680, maxHeight: "90vh",
              borderRadius: 16, overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.4)" }}>

            <div style={{ background: C.hdr, padding: "36px 40px 28px" }}>
              <div style={{ color: "#c7d2fe", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                CONTEÚDO PROGRAMÁTICO
              </div>
              <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "8px 0 4px" }}>
                {discNome}
              </h2>
              <p style={{ color: "#a5b4fc", fontSize: 14, margin: 0 }}>
                {serieObj?.label} · {bimestre}º Bimestre · {new Date().getFullYear()}
              </p>
              <p style={{ color: "#818cf8", fontSize: 12, margin: "6px 0 0" }}>{nomeEscola}</p>
            </div>

            <div style={{ padding: "28px 40px 36px", fontSize: 14, color: C.txt, lineHeight: 1.7 }}>
              {unidadeSel && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.ind, textTransform: "uppercase" }}>Unidade Temática — BNCC</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{unidadeSel.texto}</div>
                  {objetoSel && <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>Objeto: {objetoSel.texto}</div>}
                </div>
              )}
              {seedfSel && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0ea5e9", textTransform: "uppercase" }}>Conteúdo — SEE-DF</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{seedfSel.texto}</div>
                </div>
              )}
              <div style={{ borderTop: `1px solid ${C.bdr}`, paddingTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                  Tópicos e Subtópicos
                </div>
                {topicos.map((tp, i) => (
                  <div key={tp.id} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{i + 1}. {tp.topico || <em style={{ color: C.gry }}>Sem título</em>}</div>
                    {tp.subs.filter(Boolean).map((s, si) => (
                      <div key={si} style={{ paddingLeft: 24, color: C.sub, fontSize: 13, marginTop: 4 }}>• {s}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, padding: "0 40px 28px", justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setPreview(false)}>Fechar</Btn>
              <Btn onClick={() => window.print()}>🖨 Imprimir</Btn>
              <Btn variant="success" onClick={() => { setPreview(false); publicar(); }}>✓ Publicar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
