// src/features/professores/provas/Provas.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AREAS, TEMPLATES, SERIES_OPTIONS, TURNOS_OPTIONS, BIMESTRES_OPTIONS } from './templateDefinitions';
import CapaPreview from './CapaPreview';
import useEscolaLogos from '../../../hooks/useEscolaLogos';
import { jsPDF } from 'jspdf';

const ANO_CORRENTE = new Date().getFullYear();

function getToken() { return localStorage.getItem('token'); }
function getEscolaId() { return localStorage.getItem('escola_id'); }
function getApiRoot() {
  const env = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (env) return String(env).replace(/\/api$/, '').replace(/\/$/, '');
  if (window.location.hostname === 'localhost') return 'http://localhost:3000';
  return 'https://educa-backend-docker-659zo.ondigitalocean.app';
}
const API = getApiRoot();

function authH() {
  return { Authorization: `Bearer ${getToken()}`, 'x-escola-id': getEscolaId() || '' };
}

export default function Provas() {
  const [activeTab, setActiveTab] = useState('capas'); // 'capas' | 'nova'
  const [step, setStep] = useState(1); // wizard step 1-3
  const [capas, setCapas] = useState([]);
  const [loadingCapas, setLoadingCapas] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Custom image state ─────────────────────────────────────────────────
  const [customImage, setCustomImage] = useState(null); // dataURL
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const fileInputRef = useRef(null);
  const previewCaptureRef = useRef(null); // ref para captura do PDF local

  // Wizard state
  const [selectedArea, setSelectedArea] = useState(null); // AREAS item
  const [selectedTemplate, setSelectedTemplate] = useState(null); // TEMPLATES item
  const [form, setForm] = useState({
    titulo: '',
    serie: '',
    turno: '',
    bimestre: 1,
    ano: ANO_CORRENTE,
    instrucoes: '',
  });

  const { logoEsquerda, logoDireita } = useEscolaLogos();
  const escolaNome = localStorage.getItem('escola_nome') || 'ESCOLA';

  // ── Toast helper ────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Image upload handler ────────────────────────────────────────────────
  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomImage(ev.target.result);
      setImageZoom(1);
      setImageOffsetX(0);
      setImageOffsetY(0);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function removeCustomImage() {
    setCustomImage(null);
    setImageZoom(1);
    setImageOffsetX(0);
    setImageOffsetY(0);
  }

  // ── Load capas ──────────────────────────────────────────────────────────
  const loadCapas = useCallback(async () => {
    setLoadingCapas(true);
    try {
      const res = await fetch(`${API}/api/capa-provas`, { headers: authH() });
      const data = await res.json();
      if (data.ok) setCapas(data.capas || []);
    } catch (err) {
      showToast('Erro ao carregar capas.', 'error');
    } finally {
      setLoadingCapas(false);
    }
  }, []);

  useEffect(() => { loadCapas(); }, [loadCapas]);

  // ── Wizard navigation ───────────────────────────────────────────────────
  function goToStep(n) {
    if (n === 2 && !selectedArea) return;
    if (n === 3 && !selectedTemplate) return;
    setStep(n);
  }

  function selectArea(area) {
    setSelectedArea(area);
    setForm(f => ({
      ...f,
      titulo: `PROVÃO DE ${area.label}`,
      instrucoes: area.instrucoesPadrao,
    }));
    setStep(2);
  }

  function selectTemplate(t) {
    setSelectedTemplate(t);
    setStep(3);
  }

  // ── Generate PDF ────────────────────────────────────────────────────────
  async function handleGerar() {
    if (!selectedArea || !selectedTemplate) return;
    if (!form.titulo.trim() || !form.bimestre || !form.ano) {
      showToast('Preencha título, bimestre e ano.', 'error');
      return;
    }
    setGenerating(true);
    try {
      // 1) Salvar registro da capa no backend
      const res = await fetch(`${API}/api/capa-provas`, {
        method: 'POST',
        headers: { ...authH(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          area: selectedArea.id,
          serie: form.serie || null,
          turno: form.turno || null,
          bimestre: form.bimestre,
          ano: form.ano,
          template_id: selectedTemplate.id,
          instrucoes: form.instrucoes.trim() || null,
        }),
      });
      const created = await res.json();
      if (!created.ok) throw new Error(created.message || 'Erro ao salvar capa.');

      const fileName = `capa-${selectedArea.id.toLowerCase()}-${form.bimestre}bim-${form.ano}.pdf`;

      // Baixa o PDF do backend (cabeçaçalho institucional completo, QR, instruções)
      const pdfRes = await fetch(`${API}/api/capa-provas/${created.id}/pdf`, { headers: authH() });
      if (!pdfRes.ok) throw new Error('Erro ao gerar PDF.');
      const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());

      if (customImage) {
        // ── Imagem customizada: renderiza PDF do backend em canvas e sobrepõe imagem ──
        // Import dinâmico do pdfjs (já instalado no projeto)
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        // Renderiza página 1 em canvas com 2× de escala (1190×1684px)
        const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Carrega a imagem customizada (dataURL — sem CORS)
        const userImg = new Image();
        userImg.src = customImage;
        await new Promise((res, rej) => { userImg.onload = res; userImg.onerror = rej; });

        // Área de rodapé: últimos ~38% da página (onde a imagem temática padrão fica)
        const areaStartY = Math.round(canvas.height * 0.62);
        const areaH = canvas.height - areaStartY;
        const areaW = canvas.width;

        // Simula object-fit: cover + zoom/offset do usuário
        const iw = userImg.naturalWidth || userImg.width || 1;
        const ih = userImg.naturalHeight || userImg.height || 1;
        let coverW, coverH;
        if (iw / ih > areaW / areaH) {
          coverH = areaH; coverW = coverH * (iw / ih);
        } else {
          coverW = areaW; coverH = coverW / (iw / ih);
        }
        const finalW = coverW * imageZoom;
        const finalH = coverH * imageZoom;
        const cx = areaW / 2 + (imageOffsetX / 100) * areaW;
        const cy = areaStartY + areaH / 2 + (imageOffsetY / 100) * areaH;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, areaStartY, areaW, areaH);
        ctx.clip();
        ctx.clearRect(0, areaStartY, areaW, areaH);
        ctx.drawImage(userImg, cx - finalW / 2, cy - finalH / 2, finalW, finalH);
        ctx.restore();

        // Exporta como PDF A4
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        pdf.addImage(imgData, 'JPEG', 0, 0, 595.28, 841.89);
        pdf.save(fileName);
      } else {
        // ── Sem imagem customizada: baixa PDF do backend diretamente ──
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      showToast('✅ Capa gerada e baixada com sucesso!', 'success');
      loadCapas();
      setActiveTab('capas');
      resetWizard();
    } catch (err) {
      showToast(err.message || 'Erro ao gerar capa.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/api/capa-provas/${id}`, { method: 'DELETE', headers: authH() });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      showToast('Capa removida.', 'success');
      loadCapas();
    } catch (err) {
      showToast(err.message || 'Erro ao remover capa.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(id, area, bim, ano) {
    try {
      const res = await fetch(`${API}/api/capa-provas/${id}/pdf`, { headers: authH() });
      if (!res.ok) throw new Error('Erro ao baixar PDF.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capa-${area.toLowerCase()}-${bim}bim-${ano}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function resetWizard() {
    setStep(1);
    setSelectedArea(null);
    setSelectedTemplate(null);
    setForm({ titulo: '', serie: '', turno: '', bimestre: 1, ano: ANO_CORRENTE, instrucoes: '' });
    setCustomImage(null);
    setImageZoom(1);
    setImageOffsetX(0);
    setImageOffsetY(0);
  }

  // ── Area badge color helper ─────────────────────────────────────────────
  function getAreaDef(areaId) {
    return AREAS.find(a => a.id === areaId) || AREAS[4];
  }

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.type === 'error' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)' }}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={s.pageHeader}>
        <div style={s.pageIconWrap}>
          <span style={{ fontSize: 22 }}>📄</span>
        </div>
        <div>
          <h1 style={s.pageTitle}>Capas de Provas</h1>
          <p style={s.pageDesc}>Crie e baixe capas institucionais com QR code para identificação pelo EDUCA-SCAN</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button
            style={{ ...s.tabBtn, ...(activeTab === 'capas' ? s.tabBtnActive : {}) }}
            onClick={() => { setActiveTab('capas'); resetWizard(); }}
          >📋 Capas Criadas ({capas.length})</button>
          <button
            style={{ ...s.tabBtn, ...(activeTab === 'nova' ? s.tabBtnActive : {}), background: activeTab === 'nova' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : undefined, color: activeTab === 'nova' ? '#fff' : undefined }}
            onClick={() => { setActiveTab('nova'); setStep(1); }}
          >➕ Nova Capa</button>
        </div>
      </div>

      {/* ── TAB: CAPAS CRIADAS ─────────────────────────────────────────── */}
      {activeTab === 'capas' && (
        <div>
          {loadingCapas ? (
            <div style={s.emptyBox}><div style={s.spinner} /><p style={{ color:'#64748b', marginTop:12 }}>Carregando capas...</p></div>
          ) : capas.length === 0 ? (
            <div style={s.emptyBox}>
              <div style={{ fontSize:56, marginBottom:12 }}>📄</div>
              <h3 style={{ fontWeight:700, color:'#374151', marginBottom:6 }}>Nenhuma capa criada ainda</h3>
              <p style={{ color:'#6b7280', fontSize:14, marginBottom:20 }}>Clique em "Nova Capa" para criar a primeira.</p>
              <button style={s.primaryBtn} onClick={() => { setActiveTab('nova'); setStep(1); }}>➕ Criar primeira capa</button>
            </div>
          ) : (
            <div style={s.grid}>
              {capas.map(capa => {
                const areaDef = getAreaDef(capa.area);
                const templateDef = TEMPLATES.find(t => t.id === capa.template_id);
                return (
                  <div key={capa.id} style={s.capaCard}>
                    {/* Mini preview */}
                    <div style={{ ...s.capaThumb, background: areaDef.corClaro, borderBottom: `3px solid ${areaDef.cor}` }}>
                      <div style={{ position:'relative', overflow:'hidden', width:'100%', height:'100%' }}>
                        <CapaPreview
                          area={areaDef}
                          template={templateDef || TEMPLATES[0]}
                          titulo={capa.titulo}
                          serie={capa.serie}
                          bimestre={capa.bimestre}
                          instrucoes={capa.instrucoes || areaDef.instrucoesPadrao}
                          scale={0.185}
                          escolaNome={escolaNome}
                          logoEsq={logoEsquerda}
                          logoDir={logoDireita}
                        />
                      </div>
                    </div>
                    {/* Info */}
                    <div style={s.capaCardBody}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ ...s.areaBadge, background:areaDef.corClaro, color:areaDef.cor, border:`1px solid ${areaDef.cor}40` }}>
                          {areaDef.emoji} {areaDef.label}
                        </span>
                        <span style={{ ...s.areaBadge, background:'#f1f5f9', color:'#64748b' }}>
                          {templateDef?.nome || 'Clássico'}
                        </span>
                      </div>
                      <div style={s.capaTitle}>{capa.titulo}</div>
                      <div style={s.capaMeta}>
                        {capa.serie && <span>{capa.serie}</span>}
                        {capa.serie && <span>·</span>}
                        <span>{capa.bimestre}º Bimestre</span>
                        <span>·</span>
                        <span>{capa.ano}</span>
                      </div>
                      <div style={s.capaActions}>
                        <button
                          style={s.btnDownload}
                          onClick={() => handleDownload(capa.id, capa.area, capa.bimestre, capa.ano)}
                        >⬇️ Baixar PDF</button>
                        <button
                          style={s.btnDelete}
                          onClick={() => handleDelete(capa.id)}
                          disabled={deletingId === capa.id}
                        >{deletingId === capa.id ? '...' : '🗑️'}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: NOVA CAPA — WIZARD ────────────────────────────────────── */}
      {activeTab === 'nova' && (
        <div>
          {/* Steps indicator */}
          <div style={s.stepsBar}>
            {['Área', 'Modelo', 'Configurar'].map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <React.Fragment key={n}>
                  <button style={{ ...s.stepBtn, ...(active ? s.stepActive : done ? s.stepDone : s.stepIdle) }} onClick={() => goToStep(n)}>
                    <span style={s.stepNum}>{done ? '✓' : n}</span>
                    <span style={s.stepLabel}>{label}</span>
                  </button>
                  {i < 2 && <div style={{ ...s.stepLine, background: done ? '#6366f1' : '#e2e8f0' }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── Step 1: Choose Area ── */}
          {step === 1 && (
            <div>
              <h2 style={s.stepTitle}>Escolha a Área de Conhecimento</h2>
              <div style={s.areaGrid}>
                {AREAS.map(area => (
                  <button key={area.id} style={{ ...s.areaCard, border: `2px solid ${selectedArea?.id === area.id ? area.cor : '#e2e8f0'}`, background: selectedArea?.id === area.id ? area.corClaro : '#fff' }}
                    onClick={() => selectArea(area)}
                  >
                    <div style={{ fontSize:42, marginBottom:10 }}>{area.emoji}</div>
                    <div style={{ fontSize:18, fontWeight:800, color: area.cor, marginBottom:4 }}>{area.label}</div>
                    <div style={{ fontSize:11, color:'#64748b', lineHeight:1.4 }}>{area.disciplinas}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Choose Template ── */}
          {step === 2 && selectedArea && (
            <div>
              <h2 style={s.stepTitle}>Escolha o Modelo Visual</h2>
              <p style={s.stepDesc}>Todos os modelos suportam a cor de <strong style={{ color: selectedArea.cor }}>{selectedArea.label}</strong></p>
              <div style={s.templateGrid}>
                {TEMPLATES.map(t => (
                  <button key={t.id}
                    style={{ ...s.templateCard, border: `2px solid ${selectedTemplate?.id === t.id ? selectedArea.cor : '#e2e8f0'}`, outline: 'none' }}
                    onClick={() => selectTemplate(t)}
                  >
                    {/* Mini preview */}
                    <div style={{ width: 595*0.17, height: 842*0.17, overflow:'hidden', borderRadius:4, marginBottom:10, border:'1px solid #e2e8f0', position:'relative', flexShrink:0 }}>
                      <CapaPreview
                        area={selectedArea}
                        template={t}
                        titulo={`PROVÃO DE ${selectedArea.label}`}
                        serie="6º ANO"
                        bimestre={1}
                        instrucoes={selectedArea.instrucoesPadrao}
                        scale={0.17}
                        escolaNome={escolaNome}
                      />
                    </div>
                    <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:3 }}>{t.nome}</div>
                    <div style={{ fontSize:11, color:'#64748b', textAlign:'center' }}>{t.desc}</div>
                    {selectedTemplate?.id === t.id && (
                      <div style={{ position:'absolute', top:8, right:8, background: selectedArea.cor, borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:900 }}>✓</div>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button style={s.secondaryBtn} onClick={() => setStep(1)}>← Voltar</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Configure + Preview ── */}
          {step === 3 && selectedArea && selectedTemplate && (
            <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
              {/* Form */}
              <div style={{ flex:'0 0 380px' }}>
                <h2 style={s.stepTitle}>Configurar a Capa</h2>

                <label style={s.label}>Título da prova *</label>
                <input style={s.input} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: PROVÃO DE EXATAS" />

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={s.label}>Série / Ano</label>
                    <select style={s.input} value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}>
                      <option value="">-- Selecione --</option>
                      {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Turno</label>
                    <select style={s.input} value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}>
                      <option value="">-- Selecione --</option>
                      {TURNOS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={s.label}>Bimestre *</label>
                    <select style={s.input} value={form.bimestre} onChange={e => setForm(f => ({ ...f, bimestre: Number(e.target.value) }))}>
                      {BIMESTRES_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Ano letivo *</label>
                    <input style={s.input} type="number" value={form.ano} min={2020} max={2099} onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))} />
                  </div>
                </div>

                <label style={s.label}>Instruções (editável)</label>
                <textarea
                  style={{ ...s.input, height:180, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}
                  value={form.instrucoes}
                  onChange={e => setForm(f => ({ ...f, instrucoes: e.target.value }))}
                  placeholder="Instruções que aparecerão na capa..."
                />

                {/* ── Inserir Imagem ──────────────────────────────────── */}
                <div style={s.imageSection}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>🖼️ Imagem da Capa</span>
                    {!customImage && (
                      <button
                        id="btn-inserir-imagem"
                        style={s.btnInsertImage}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        + Inserir Imagem
                      </button>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display:'none' }}
                    onChange={handleImageUpload}
                  />

                  {customImage ? (
                    <div>
                      {/* Thumbnail + remove */}
                      <div style={s.imageThumbnailRow}>
                        <div style={s.imageThumbnailWrap}>
                          <img src={customImage} alt="Imagem selecionada" style={s.imageThumbnail} />
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:11, color:'#475569', margin:'0 0 8px' }}>Imagem carregada. Ajuste o zoom e a posição no preview ao lado.</p>
                          <div style={{ display:'flex', gap:6 }}>
                            <button style={s.btnChangeImage} onClick={() => fileInputRef.current?.click()}>🔄 Trocar</button>
                            <button style={s.btnRemoveImage} onClick={removeCustomImage}>✕ Remover</button>
                          </div>
                        </div>
                      </div>

                      {/* Zoom control */}
                      <div style={s.zoomRow}>
                        <span style={s.zoomLabel}>🔍 Zoom</span>
                        <button
                          style={s.zoomBtn}
                          onClick={() => setImageZoom(z => Math.max(0.5, parseFloat((z - 0.1).toFixed(1))))}
                          title="Diminuir zoom"
                        >−</button>
                        <input
                          type="range" min="0.5" max="2.5" step="0.05"
                          value={imageZoom}
                          onChange={e => setImageZoom(parseFloat(e.target.value))}
                          style={s.zoomSlider}
                        />
                        <button
                          style={s.zoomBtn}
                          onClick={() => setImageZoom(z => Math.min(2.5, parseFloat((z + 0.1).toFixed(1))))}
                          title="Aumentar zoom"
                        >+</button>
                        <span style={s.zoomValue}>{imageZoom.toFixed(1)}×</span>
                      </div>

                      {/* Offset X */}
                      <div style={s.zoomRow}>
                        <span style={s.zoomLabel}>↔ Pos. X</span>
                        <button style={s.zoomBtn} onClick={() => setImageOffsetX(x => Math.max(-50, x - 5))}>−</button>
                        <input
                          type="range" min="-50" max="50" step="1"
                          value={imageOffsetX}
                          onChange={e => setImageOffsetX(Number(e.target.value))}
                          style={s.zoomSlider}
                        />
                        <button style={s.zoomBtn} onClick={() => setImageOffsetX(x => Math.min(50, x + 5))}>+</button>
                        <span style={s.zoomValue}>{imageOffsetX > 0 ? '+' : ''}{imageOffsetX}%</span>
                      </div>

                      {/* Offset Y */}
                      <div style={s.zoomRow}>
                        <span style={s.zoomLabel}>↕ Pos. Y</span>
                        <button style={s.zoomBtn} onClick={() => setImageOffsetY(y => Math.max(-50, y - 5))}>−</button>
                        <input
                          type="range" min="-50" max="50" step="1"
                          value={imageOffsetY}
                          onChange={e => setImageOffsetY(Number(e.target.value))}
                          style={s.zoomSlider}
                        />
                        <button style={s.zoomBtn} onClick={() => setImageOffsetY(y => Math.min(50, y + 5))}>+</button>
                        <span style={s.zoomValue}>{imageOffsetY > 0 ? '+' : ''}{imageOffsetY}%</span>
                      </div>

                      {/* Reset position */}
                      <button
                        style={{ ...s.btnChangeImage, marginTop:4, fontSize:11 }}
                        onClick={() => { setImageZoom(1); setImageOffsetX(0); setImageOffsetY(0); }}
                      >↺ Resetar posição</button>
                    </div>
                  ) : (
                    <div style={s.imageEmptyHint}>
                      <span style={{ fontSize:28, opacity:0.4 }}>🖼️</span>
                      <p style={{ fontSize:11, color:'#94a3b8', margin:'6px 0 0' }}>Nenhuma imagem selecionada.<br/>A capa usará o design padrão do modelo.</p>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', gap:10, marginTop:16 }}>
                  <button style={s.secondaryBtn} onClick={() => setStep(2)}>← Voltar</button>
                  <button
                    style={{ ...s.primaryBtn, flex:1, opacity: generating ? 0.7 : 1 }}
                    onClick={handleGerar}
                    disabled={generating}
                  >
                    {generating ? '⏳ Gerando PDF...' : '📄 Gerar e Baixar PDF'}
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              <div style={{ flex:1 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:'#64748b', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>Pré-visualização</h3>
                <div style={{ width: 595*0.55, height: 842*0.55, overflow:'hidden', borderRadius:8, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', position:'relative' }}>
                  <CapaPreview
                    area={selectedArea}
                    template={selectedTemplate}
                    titulo={form.titulo}
                    serie={form.serie}
                    bimestre={form.bimestre}
                    instrucoes={form.instrucoes}
                    scale={0.55}
                    escolaNome={escolaNome}
                    logoEsq={logoEsquerda}
                    logoDir={logoDireita}
                    customImage={customImage}
                    imageZoom={imageZoom}
                    imageOffsetX={imageOffsetX}
                    imageOffsetY={imageOffsetY}
                  />
                </div>
                <p style={{ fontSize:11, color:'#94a3b8', marginTop:8, textAlign:'center' }}>Preview aproximado · PDF gerado em A4</p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  root: { padding:'0 0 40px', maxWidth:1200, margin:'0 auto' },

  toast: { position:'fixed', top:20, right:20, zIndex:9999, padding:'12px 22px', borderRadius:10, color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 8px 24px rgba(0,0,0,0.18)', animation:'none' },

  pageHeader: { display:'flex', alignItems:'center', gap:14, marginBottom:28, padding:'20px 24px', background:'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius:14, flexWrap:'wrap' },
  pageIconWrap: { width:46, height:46, borderRadius:11, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  pageTitle: { color:'#fff', fontSize:18, fontWeight:800, margin:0 },
  pageDesc: { color:'#94a3b8', fontSize:13, margin:'3px 0 0' },

  tabBtn: { padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', background:'rgba(255,255,255,0.08)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.12)', transition:'all .2s' },
  tabBtnActive: { background:'rgba(99,102,241,0.18)', color:'#a78bfa', border:'1px solid rgba(99,102,241,0.4)' },

  stepsBar: { display:'flex', alignItems:'center', marginBottom:28, background:'#fff', borderRadius:12, padding:'16px 24px', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', border:'1px solid #e2e8f0' },
  stepBtn: { display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', transition:'all .2s' },
  stepActive: { background:'#eef2ff', color:'#4f46e5' },
  stepDone: { background:'#f0fdf4', color:'#16a34a' },
  stepIdle: { color:'#94a3b8' },
  stepNum: { width:22, height:22, borderRadius:'50%', background:'currentColor', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 },
  stepLabel: { fontSize:13, fontWeight:700 },
  stepLine: { flex:1, height:2, margin:'0 6px' },

  stepTitle: { fontSize:20, fontWeight:800, color:'#1e293b', marginBottom:8 },
  stepDesc: { fontSize:13, color:'#64748b', marginBottom:20 },

  areaGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:16, marginBottom:24 },
  areaCard: { display:'flex', flexDirection:'column', alignItems:'center', padding:'28px 16px', borderRadius:14, cursor:'pointer', transition:'all .2s', background:'#fff', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', textAlign:'center' },

  templateGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16 },
  templateCard: { display:'flex', flexDirection:'column', alignItems:'center', padding:'16px', borderRadius:14, cursor:'pointer', transition:'all .2s', background:'#fff', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', position:'relative' },

  label: { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5, marginTop:14 },
  input: { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, color:'#1e293b', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#fff' },

  primaryBtn: { padding:'10px 20px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 },
  secondaryBtn: { padding:'9px 18px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontWeight:700, fontSize:13, cursor:'pointer' },

  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:18 },
  capaCard: { background:'#fff', borderRadius:14, boxShadow:'0 1px 8px rgba(0,0,0,0.07)', border:'1px solid #e2e8f0', overflow:'hidden' },
  capaThumb: { height: Math.round(842*0.185), overflow:'hidden', position:'relative' },
  capaCardBody: { padding:'12px 14px' },
  capaTitle: { fontWeight:700, fontSize:14, color:'#1e293b', margin:'6px 0 4px' },
  capaMeta: { display:'flex', gap:6, fontSize:11, color:'#64748b', flexWrap:'wrap' },
  capaActions: { display:'flex', gap:8, marginTop:12 },
  btnDownload: { flex:1, padding:'7px 10px', borderRadius:7, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' },
  btnDelete: { padding:'7px 10px', borderRadius:7, border:'1px solid #fee2e2', background:'#fff', fontSize:14, cursor:'pointer' },
  areaBadge: { padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:3 },

  emptyBox: { textAlign:'center', padding:'60px 24px', background:'#fff', borderRadius:14, border:'1px dashed #e2e8f0' },
  spinner: { width:36, height:36, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto' },

  // ── Image section styles ────────────────────────────────────────────────
  imageSection: {
    marginTop: 16,
    background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    padding: '14px',
  },
  btnInsertImage: {
    padding: '6px 14px',
    borderRadius: 7,
    border: '1.5px dashed #6366f1',
    background: '#eef2ff',
    color: '#4f46e5',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all .2s',
  },
  imageThumbnailRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  imageThumbnailWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    border: '2px solid #e2e8f0',
    flexShrink: 0,
    background: '#f1f5f9',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  btnChangeImage: {
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnRemoveImage: {
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid #fecaca',
    background: '#fff',
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  zoomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  zoomLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    width: 54,
    flexShrink: 0,
  },
  zoomBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: '1.5px solid #e2e8f0',
    background: '#fff',
    color: '#374151',
    fontWeight: 900,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    lineHeight: 1,
  },
  zoomSlider: {
    flex: 1,
    accentColor: '#6366f1',
    cursor: 'pointer',
  },
  zoomValue: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6366f1',
    width: 38,
    textAlign: 'right',
    flexShrink: 0,
  },
  imageEmptyHint: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 0 8px',
    textAlign: 'center',
  },
};
