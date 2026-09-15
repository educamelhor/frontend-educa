// src/features/professores/provas/CapaPreview.jsx
import React from 'react';

/**
 * Props:
 * - area, template, titulo, serie, bimestre, instrucoes
 * - scale: number (default 1)
 * - logoEsq / logoDir: url or null
 * - escolaNome: string
 * - customImage: dataURL or null
 * - imageZoom: number (default 1)
 * - imageOffsetX / imageOffsetY: number (default 0)
 *
 * LAYOUT NOTES
 * ─────────────────────────────────────────────────────────
 * Todos os templates usam flex-column encadeado a partir do
 * container raiz (height:842px explícito). NUNCA usamos
 * height:'100%' em filhos — isso quebra no html-to-image
 * porque a clonagem do DOM perde a herança de altura.
 * Com flex:1 encadeado, cada nível herda a altura do pai
 * via flex, resolvendo corretamente em todos os contextos.
 */
export default function CapaPreview({
  area, template, titulo, serie, bimestre,
  instrucoes = '', scale = 1,
  logoEsq = null, logoDir = null,
  escolaNome = 'ESCOLA',
  customImage = null,
  imageZoom = 1,
  imageOffsetX = 0,
  imageOffsetY = 0,
  imageHeight = 220,   // altura em px (escala 1:1) do bloco de imagem
  imageWidthPct = 100, // largura em % do container de imagem (0–100)
  imageFitMode = 'contain', // 'contain' | 'cover'
  imageFrame = true,       // borda / moldura elegante
  turmaNome = '',
}) {
  if (!area || !template) return null;

  // ─── Container raiz: dimensões explícitas ─────────────────────────────────
  const containerStyle = {
    width: 595,
    height: 842,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    fontFamily: 'Arial, Helvetica, sans-serif',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  };

  const baseSerie = [serie, bimestre ? `${bimestre}º BIMESTRE` : ''].filter(Boolean).join(' — ');
  const serieText = turmaNome ? `${baseSerie} - ${turmaNome}` : baseSerie;

  // ── Bloco de imagem no Campo 4 ─────────────────────────────────────────────
  function BottomImage({ mx = 0, mt = 0, borderRadius = 6 }) {
    if (!customImage) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          opacity: 0.3,
          color: area.cor,
          userSelect: 'none',
        }}>
          <div style={{ fontSize: 52, marginBottom: 4 }}>{area.emoji}</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {area.label}
          </div>
        </div>
      );
    }

    const isContain = imageFitMode === 'contain';

    return (
      <div style={{
        width: imageWidthPct < 100 ? `${imageWidthPct}%` : '100%',
        height: '100%',
        maxHeight: imageHeight,
        margin: `${mt}px auto 0 auto`,
        overflow: 'hidden',
        borderRadius: imageFrame ? borderRadius : 0,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        border: imageFrame ? `1.5px solid ${area.cor}35` : 'none',
        background: imageFrame ? '#ffffff' : 'transparent',
        boxShadow: imageFrame ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
      }}>
        <img
          src={customImage}
          alt="Imagem personalizada"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: isContain ? 'auto' : '100%',
            height: isContain ? 'auto' : '100%',
            objectFit: isContain ? 'contain' : 'cover',
            transform: `scale(${imageZoom}) translate(${imageOffsetX}%, ${imageOffsetY}%)`,
            transformOrigin: 'center center',
            display: 'block',
          }}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Template 1 — Clássico
  // ──────────────────────────────────────────────────────────────────────────
  if (template.id === 1) {
    return (
      <div style={containerStyle}>
        {/* Borda externa + fundo */}
        <div style={{
          flex: 1, background: area.corClaro,
          border: `3px solid ${area.cor}`, boxSizing: 'border-box',
          padding: 4, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Borda interna */}
          <div style={{
            flex: 1, border: `1px solid ${area.cor}`, boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', gap:10, minHeight:90, flexShrink:0 }}>
              {logoEsq
                ? <img src={logoEsq} style={{ width:70, height:70, objectFit:'contain' }} alt="" />
                : <div style={{ width:70, height:70, background:`${area.cor}22`, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{area.emoji}</div>}
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontWeight:900, fontSize:11, color:'#111' }}>{escolaNome}</div>
              </div>
              <div style={{ width:70, height:70, background:'#fff', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#666', border:'1px solid #ddd' }}>QR</div>
            </div>
            {/* Divisor */}
            <div style={{ height:2, background:area.cor, margin:'0 10px', flexShrink:0 }} />
            {/* Título */}
            <div style={{ textAlign:'center', padding:'12px 10px 6px', flexShrink:0 }}>
              <div style={{ fontSize:32, fontWeight:900, color:area.cor, lineHeight:1 }}>PROVÃO DE</div>
              <div style={{ fontSize:46, fontWeight:900, color:'#111', lineHeight:1.1 }}>{area.label}</div>
              {serieText && <div style={{ fontSize:22, fontWeight:900, color:area.cor, marginTop:6 }}>{serieText}</div>}
            </div>
            {/* Instruções */}
            <div style={{ margin:'8px 10px 0', background:area.corClaro, border:`1px solid ${area.cor}`, borderRadius:4, padding:'8px 12px', overflow:'hidden', flexShrink:0 }}>
              <div style={{ fontWeight:900, fontSize:10, textAlign:'center', marginBottom:6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
              <div style={{ fontSize:8, color:'#222', lineHeight:1.2, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
            </div>
            {/* Imagem no Campo 4 */}
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:0, overflow:'hidden', padding:'8px 10px' }}>
              <BottomImage mx={0} mt={0} borderRadius={4} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Template 2 — Moderno (4 Campos Claramente Delimitados)
  // ──────────────────────────────────────────────────────────────────────────
  if (template.id === 2) {
    return (
      <div style={containerStyle}>
        {/* Faixa lateral esquerda */}
        <div style={{ width:55, background:area.cor, display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 4px', flexShrink:0, position:'absolute', top:0, left:0, bottom:0 }}>
          {logoEsq
            ? <img src={logoEsq} style={{ width:44, height:44, objectFit:'contain' }} alt="" />
            : <div style={{ fontSize:26 }}>{area.emoji}</div>}
        </div>

        {/* Conteúdo principal */}
        <div style={{ flex:1, marginLeft:55, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
          {/* Top accent line */}
          <div style={{ height:6, background:area.cor, flexShrink:0 }} />

          {/* CAMPO 1: CABEÇALHO INSTITUCIONAL */}
          <div style={{ padding:'10px 14px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <div style={{ flex:1, paddingRight:8 }}>
              <div style={{ fontSize:7.5, fontWeight:800, color:area.cor, textTransform:'uppercase', letterSpacing:'0.02em', lineHeight:1.15 }}>
                SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL
              </div>
              <div style={{ fontSize:7, fontWeight:700, color:area.cor, marginTop:1 }}>
                COORDENAÇÃO REGIONAL DE ENSINO
              </div>
              <div style={{ fontSize:9.5, fontWeight:900, color:'#1e293b', marginTop:2 }}>
                {escolaNome}
              </div>
            </div>
            <div style={{ width:68, height:68, background:'#fff', border:'1px solid #e2e8f0', borderRadius:4, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontSize:8, color:'#64748b', flexShrink:0, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize:16, marginBottom:2 }}>📱</span>
              <span style={{ fontWeight:700, fontSize:7 }}>QR CODE</span>
            </div>
          </div>

          {/* Divisor duplo sofisticado (dourado + cor tema) */}
          <div style={{ height:2.5, background:'#b8860b', margin:'0 14px', flexShrink:0 }} />
          <div style={{ height:1, background:area.cor, margin:'1px 14px 0', flexShrink:0 }} />

          {/* CAMPO 2: IDENTIFICAÇÃO DA AVALIAÇÃO */}
          <div style={{ padding:'10px 14px 6px', flexShrink:0 }}>
            <div style={{ color:'#64748b', fontSize:11, fontWeight:800, letterSpacing:'0.06em' }}>PROVÃO DE</div>
            <div style={{ fontSize:46, fontWeight:900, color:area.cor, lineHeight:1.05, margin:'2px 0 4px' }}>{area.label}</div>
            {serieText && (
              <div style={{ fontSize:15, fontWeight:900, color:'#1e293b', background:`${area.cor}14`, display:'inline-block', padding:'3px 10px', borderRadius:4, borderLeft:`3px solid ${area.cor}` }}>
                {serieText}
              </div>
            )}
          </div>

          {/* CAMPO 3: CARD DE ORIENTAÇÕES AOS ESTUDANTES */}
          <div style={{
            margin:'6px 14px 0',
            padding:'8px 12px',
            borderRadius:6,
            border:`1.5px solid ${area.cor}35`,
            background:`${area.corClaro || '#f8fafc'}28`,
            flexShrink:0,
          }}>
            <div style={{ fontWeight:900, fontSize:9, color:area.cor, marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
              <span>📋</span> LEIA ATENTAMENTE AS INSTRUÇÕES:
            </div>
            <div style={{ fontSize:7.5, color:'#334155', lineHeight:1.25, whiteSpace:'pre-wrap' }}>
              {instrucoes}
            </div>
          </div>

          {/* CAMPO 4: ÁREA DESTINADA À IMAGEM / ILUSTRAÇÃO */}
          <div style={{
            flex:1,
            margin:'8px 14px 10px',
            display:'flex',
            flexDirection:'column',
            justifyContent:'center',
            alignItems:'center',
            minHeight:0,
            overflow:'hidden',
          }}>
            <BottomImage mx={0} mt={0} borderRadius={6} />
          </div>

          {/* Rodapé discreto */}
          <div style={{ padding:'0 14px 8px', fontSize:7, color:'#94a3b8', textAlign:'right', flexShrink:0 }}>
            EDUCA.MELHOR · 2026
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Template 3 — Formal
  // ──────────────────────────────────────────────────────────────────────────
  if (template.id === 3) {
    return (
      <div style={containerStyle}>
        <div style={{
          flex:1, background:'#f9f9f9', border:`4px solid ${area.cor}`, boxSizing:'border-box',
          padding:4, display:'flex', flexDirection:'column', overflow:'hidden',
        }}>
          <div style={{
            flex:1, border:`1px solid ${area.cor}`, boxSizing:'border-box',
            display:'flex', flexDirection:'column', overflow:'hidden',
          }}>
            {/* Header preenchido */}
            <div style={{ background:area.cor, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, minHeight:90, flexShrink:0 }}>
              {logoEsq
                ? <img src={logoEsq} style={{ width:65, height:65, objectFit:'contain' }} alt="" />
                : <div style={{ width:65, height:65, background:'rgba(255,255,255,0.2)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{area.emoji}</div>}
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontWeight:900, fontSize:11, color:'#fff' }}>{escolaNome}</div>
              </div>
              <div style={{ width:68, height:68, background:'rgba(255,255,255,0.95)', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#999' }}>QR</div>
            </div>
            {/* Título */}
            <div style={{ textAlign:'center', padding:'14px 16px 8px', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:area.cor }}>PROVÃO DE</div>
              <div style={{ fontSize:48, fontWeight:900, color:'#111', lineHeight:1.1 }}>{area.label}</div>
              {serieText && <div style={{ fontSize:20, fontWeight:900, color:area.cor, marginTop:4 }}>{serieText}</div>}
            </div>
            <div style={{ height:2, background:area.cor, margin:'0 16px', flexShrink:0 }} />
            {/* Instruções */}
            <div style={{ padding:'8px 16px', overflow:'hidden', flexShrink:0 }}>
              <div style={{ fontWeight:900, fontSize:10, color:'#000', textAlign:'center', marginBottom:6 }}>INSTRUÇÕES AO ESTUDANTE:</div>
              <div style={{ fontSize:8, color:'#222', lineHeight:1.2, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
            </div>
            {/* Imagem no Campo 4 */}
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:0, overflow:'hidden', padding:'6px 16px 10px' }}>
              <BottomImage mx={0} mt={0} borderRadius={4} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Template 4 — Colorido
  // ──────────────────────────────────────────────────────────────────────────
  if (template.id === 4) {
    return (
      <div style={containerStyle}>
        {/* Fundo colorido + header */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', padding:'14px 16px', gap:10, background:area.cor }}>
          {logoEsq
            ? <img src={logoEsq} style={{ width:72, height:72, objectFit:'contain' }} alt="" />
            : <div style={{ width:72, height:72, background:'rgba(255,255,255,0.15)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34 }}>{area.emoji}</div>}
          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{ fontWeight:900, fontSize:11, color:'rgba(255,255,255,0.95)' }}>{escolaNome}</div>
          </div>
          <div style={{ width:72, height:72, background:'rgba(255,255,255,0.95)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#666' }}>QR</div>
        </div>
        {/* Título sobre cor */}
        <div style={{ flexShrink:0, textAlign:'center', padding:'6px 16px', background:area.cor }}>
          <div style={{ fontSize:14, fontWeight:600, color:area.corClaro, opacity:0.9 }}>PROVÃO DE</div>
          <div style={{ fontSize:52, fontWeight:900, color:'#fff', lineHeight:1.1 }}>{area.label}</div>
        </div>
        {/* Card branco — instruções */}
        <div style={{ background:'#fff', margin:'0', padding:'10px 14px 4px 14px', overflow:'hidden', flexShrink:0 }}>
          {serieText && <div style={{ fontSize:20, fontWeight:900, color:area.cor, textAlign:'center', marginBottom:8 }}>{serieText}</div>}
          <div style={{ background:area.corClaro, border:`1.5px solid ${area.cor}`, borderRadius:6, padding:'8px 12px', overflow:'hidden' }}>
            <div style={{ fontWeight:900, fontSize:10, color:area.cor, textAlign:'center', marginBottom:6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
            <div style={{ fontSize:8, color:'#222', lineHeight:1.2, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
          </div>
        </div>
        {/* Imagem no Campo 4 */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:0, overflow:'hidden', padding:'6px 14px 10px', background:'#fff' }}>
          <BottomImage mx={0} mt={0} borderRadius={6} />
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Template 5 — Dark
  // ──────────────────────────────────────────────────────────────────────────
  if (template.id === 5) {
    return (
      <div style={containerStyle}>
        {/* Linha accent */}
        <div style={{ height:5, background:area.cor, flexShrink:0 }} />
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', gap:10, flexShrink:0 }}>
          {logoEsq
            ? <img src={logoEsq} style={{ width:68, height:68, objectFit:'contain' }} alt="" />
            : <div style={{ width:68, height:68, background:`${area.cor}33`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>{area.emoji}</div>}
          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{ fontWeight:900, fontSize:10, color:'#e2e8f0' }}>{escolaNome}</div>
          </div>
          <div style={{ width:70, height:70, background:'rgba(255,255,255,0.08)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#64748b', border:'1px solid #334155' }}>QR</div>
        </div>
        {/* Divisor */}
        <div style={{ height:1, background:area.cor, margin:'0 16px', flexShrink:0 }} />
        {/* Título */}
        <div style={{ textAlign:'center', padding:'12px 16px 8px', flexShrink:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:area.cor }}>PROVÃO DE</div>
          <div style={{ fontSize:48, fontWeight:900, color:'#f1f5f9', lineHeight:1.1 }}>{area.label}</div>
          {serieText && <div style={{ fontSize:18, fontWeight:900, color:area.cor, marginTop:4 }}>{serieText}</div>}
        </div>
        {/* Card dark — instruções */}
        <div style={{ margin:'8px 16px 0', background:'#1e293b', borderRadius:8, border:`1px solid ${area.cor}`, padding:'10px 14px', overflow:'hidden', flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:10, color:'#e2e8f0', textAlign:'center', marginBottom:6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
          <div style={{ fontSize:8, color:'#cbd5e1', lineHeight:1.2, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
        </div>
        {/* Imagem no Campo 4 */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:0, overflow:'hidden', padding:'6px 16px 10px' }}>
          <BottomImage mx={0} mt={0} borderRadius={6} />
        </div>
      </div>
    );
  }

  return null;
}
