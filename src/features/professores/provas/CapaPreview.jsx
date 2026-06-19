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
}) {
  if (!area || !template) return null;

  // ─── Container raiz: dimensões explícitas ─────────────────────────────────
  // display:flex + flexDirection:column aqui é fundamental:
  // os filhos com flex:1 recebem a altura certa sem height:'100%'
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

  const serieText = [serie, bimestre ? `${bimestre}º BIMESTRE` : ''].filter(Boolean).join(' - ');
  const IMG_H = 200; // altura fixa da imagem no rodapé

  // ─── Bloco de imagem no rodapé (só quando customImage presente) ───────────
  function BottomImage({ mx = 0, mt = 0, borderRadius = 0 }) {
    if (!customImage) return null;
    return (
      <div style={{
        flexShrink: 0,
        height: IMG_H,
        marginLeft: mx,
        marginRight: mx,
        marginTop: mt,
        overflow: 'hidden',
        borderRadius,
        position: 'relative',
      }}>
        <img
          src={customImage}
          alt="Imagem personalizada"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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
    // Camadas de borda: outer (border 3px + padding 4) → inner (border 1px)
    // Ambas usam flex:1 encadeado; o flex-column vem do containerStyle raiz.
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
            {/* Instruções — flex:1 ocupa todo o espaço restante */}
            <div style={{ flex:1, margin:'8px 10px 0', background:area.corClaro, border:`1px solid ${area.cor}`, borderRadius:4, padding:'8px 12px', overflow:'hidden', minHeight:0 }}>
              <div style={{ fontWeight:900, fontSize:10, textAlign:'center', marginBottom:6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
              <div style={{ fontSize:8, color:'#222', lineHeight:1.4, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
            </div>
            {/* Imagem no rodapé */}
            <BottomImage mx={10} mt={6} borderRadius={4} />
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Template 2 — Moderno
  // ──────────────────────────────────────────────────────────────────────────
  if (template.id === 2) {
    return (
      <div style={containerStyle}>
        {/* Faixa lateral */}
        <div style={{ width:55, background:area.cor, display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 4px', flexShrink:0, position:'absolute', top:0, left:0, bottom:0 }}>
          {logoEsq
            ? <img src={logoEsq} style={{ width:44, height:44, objectFit:'contain' }} alt="" />
            : <div style={{ fontSize:26 }}>{area.emoji}</div>}
        </div>
        {/* Conteúdo (margem esq para faixa lateral) */}
        <div style={{ flex:1, marginLeft:55, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
          <div style={{ height:6, background:area.cor, flexShrink:0 }} />
          <div style={{ padding:'0 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, flexShrink:0, marginTop:12 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#333' }}>{escolaNome}</div>
            <div style={{ width:70, height:70, background:'#f5f5f5', border:'1px solid #ddd', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#999' }}>QR</div>
          </div>
          <div style={{ padding:'0 14px', flexShrink:0 }}>
            <div style={{ color:'#888', fontSize:12, fontWeight:600 }}>PROVÃO DE</div>
            <div style={{ fontSize:50, fontWeight:900, color:area.cor, lineHeight:1 }}>{area.label}</div>
            {serieText && <div style={{ fontSize:18, fontWeight:900, color:'#222', marginTop:6 }}>{serieText}</div>}
          </div>
          <div style={{ height:2, background:area.cor, margin:'12px 14px 8px', flexShrink:0 }} />
          <div style={{ padding:'0 14px', fontWeight:900, fontSize:10, color:'#222', marginBottom:6, flexShrink:0 }}>LEIA ATENTAMENTE AS INSTRUÇÕES:</div>
          {/* Instruções */}
          <div style={{ flex:1, padding:'0 14px', overflow:'hidden', minHeight:0 }}>
            <div style={{ fontSize:8, color:'#333', lineHeight:1.4, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
          </div>
          {/* Imagem no rodapé */}
          <BottomImage mx={14} mt={8} borderRadius={6} />
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
            {/* Instruções — flex:1, minHeight:0 é CRÍTICO para flex funcionar em html-to-image */}
            <div style={{ flex:1, padding:'8px 16px 0', overflow:'hidden', minHeight:0 }}>
              <div style={{ fontWeight:900, fontSize:10, color:'#000', textAlign:'center', marginBottom:6 }}>INSTRUÇÕES AO ESTUDANTE:</div>
              <div style={{ fontSize:8, color:'#222', lineHeight:1.4, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
            </div>
            {/* Imagem no rodapé */}
            <BottomImage mx={16} mt={8} borderRadius={4} />
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
        <div style={{ flex:1, background:'#fff', margin:'0 0 0', padding:'10px 14px 0 14px', overflow:'hidden', minHeight:0 }}>
          {serieText && <div style={{ fontSize:20, fontWeight:900, color:area.cor, textAlign:'center', marginBottom:8 }}>{serieText}</div>}
          <div style={{ background:area.corClaro, border:`1.5px solid ${area.cor}`, borderRadius:6, padding:'8px 12px', overflow:'hidden' }}>
            <div style={{ fontWeight:900, fontSize:10, color:area.cor, textAlign:'center', marginBottom:6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
            <div style={{ fontSize:8, color:'#222', lineHeight:1.4, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
          </div>
        </div>
        {/* Imagem no rodapé */}
        <BottomImage mx={0} mt={8} borderRadius={0} />
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
        <div style={{ flex:1, margin:'8px 16px 0', background:'#1e293b', borderRadius:'8px 8px 0 0', border:`1px solid ${area.cor}`, padding:'10px 14px', overflow:'hidden', minHeight:0 }}>
          <div style={{ fontWeight:900, fontSize:10, color:'#e2e8f0', textAlign:'center', marginBottom:6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
          <div style={{ fontSize:8, color:'#cbd5e1', lineHeight:1.4, whiteSpace:'pre-wrap' }}>{instrucoes}</div>
        </div>
        {/* Imagem no rodapé */}
        <BottomImage mx={16} mt={8} borderRadius={0} />
      </div>
    );
  }

  return null;
}
