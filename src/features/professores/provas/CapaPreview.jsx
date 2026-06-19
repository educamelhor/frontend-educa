// src/features/professores/provas/CapaPreview.jsx
import React from 'react';

/**
 * Props:
 * - area: object from AREAS (has cor, corClaro, label, emoji)
 * - template: object from TEMPLATES (has id, nome)
 * - titulo: string
 * - serie: string
 * - bimestre: number
 * - instrucoes: string
 * - scale: number (default 1 — for mini previews use 0.18)
 * - logoEsq: url string or null
 * - logoDir: url string or null
 * - escolaNome: string
 * - customImage: dataURL string or null  — imagem personalizada do usuário
 * - imageZoom: number (default 1) — fator de escala da imagem 0.5..2.0
 * - imageOffsetX: number (default 0) — deslocamento horizontal em %
 * - imageOffsetY: number (default 0) — deslocamento vertical em %
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

  const containerStyle = {
    width: 595,
    height: 842,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    fontFamily: 'Arial, Helvetica, sans-serif',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
  };

  const serieText = [serie, bimestre ? `${bimestre}º BIMESTRE` : ''].filter(Boolean).join(' - ');

  // ── Bloco de imagem customizada ──────────────────────────────────────────
  // Inserido entre o header e as instruções em cada template.
  // A altura varia por template para respeitar o espaço disponível.
  function CustomImageBlock({ height = 200, borderRadius = 0, mx = 0, mt = 0, mb = 0 }) {
    if (!customImage) return null;
    return (
      <div style={{
        width: `calc(100% - ${mx * 2}px)`,
        height,
        marginLeft: mx,
        marginRight: mx,
        marginTop: mt,
        marginBottom: mb,
        overflow: 'hidden',
        borderRadius,
        flexShrink: 0,
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

  // ── Template 1: Clássico ─────────────────────────────────────────────────
  if (template.id === 1) {
    return (
      <div style={containerStyle}>
        <div style={{ width: '100%', height: '100%', background: area.corClaro, border: `3px solid ${area.cor}`, boxSizing: 'border-box', padding: 4 }}>
          <div style={{ border: `1px solid ${area.cor}`, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10, minHeight: 90 }}>
              {logoEsq ? <img src={logoEsq} style={{ width: 70, height: 70, objectFit: 'contain' }} alt="" /> : <div style={{ width: 70, height: 70, background: `${area.cor}22`, borderRadius: 6, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 28 }}>{area.emoji}</div>}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 11, color: '#111' }}>{escolaNome}</div>
              </div>
              <div style={{ width: 70, height: 70, background: '#fff', borderRadius: 4, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 9, color:'#666', border:'1px solid #ddd' }}>QR</div>
            </div>
            {/* Divider */}
            <div style={{ height: 2, background: area.cor, margin: '0 10px' }} />
            {/* Title */}
            <div style={{ textAlign: 'center', padding: '12px 10px 6px' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: area.cor, lineHeight: 1 }}>PROVÃO DE</div>
              <div style={{ fontSize: 46, fontWeight: 900, color: '#111', lineHeight: 1.1 }}>{area.label}</div>
              {serieText && <div style={{ fontSize: 22, fontWeight: 900, color: area.cor, marginTop: 6 }}>{serieText}</div>}
            </div>

            {/* Custom Image Block */}
            <CustomImageBlock height={customImage ? 180 : 0} mx={10} mt={6} mb={6} borderRadius={4} />

            {/* Instructions */}
            <div style={{ flex: 1, margin: `${customImage ? 0 : 8}px 10px 10px`, background: area.corClaro, border: `1px solid ${area.cor}`, borderRadius: 4, padding: '8px 12px', overflow: 'hidden' }}>
              <div style={{ fontWeight: 900, fontSize: 10, textAlign: 'center', marginBottom: 6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
              <div style={{ fontSize: 8, color: '#222', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{instrucoes.slice(0, customImage ? 200 : 400)}{instrucoes.length > (customImage ? 200 : 400) ? '...' : ''}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Template 2: Moderno ──────────────────────────────────────────────────
  if (template.id === 2) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', height: '100%', background: '#fff' }}>
          {/* Left stripe */}
          <div style={{ width: 55, background: area.cor, display:'flex', flexDirection:'column', alignItems:'center', padding: '14px 4px', flexShrink: 0 }}>
            {logoEsq ? <img src={logoEsq} style={{ width: 44, height: 44, objectFit:'contain' }} alt="" /> : <div style={{ fontSize: 26 }}>{area.emoji}</div>}
          </div>
          {/* Content */}
          <div style={{ flex: 1, display:'flex', flexDirection:'column', padding: '0 14px' }}>
            <div style={{ height: 6, background: area.cor, margin:'0 -14px 12px', marginLeft: 0 }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color:'#333' }}>{escolaNome}</div>
              <div style={{ width: 70, height: 70, background:'#f5f5f5', border:'1px solid #ddd', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#999' }}>QR</div>
            </div>
            <div style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>PROVÃO DE</div>
            <div style={{ fontSize: 50, fontWeight: 900, color: area.cor, lineHeight: 1 }}>{area.label}</div>
            {serieText && <div style={{ fontSize: 18, fontWeight: 900, color: '#222', marginTop: 6 }}>{serieText}</div>}
            <div style={{ height: 2, background: area.cor, margin: '12px 0 8px' }} />

            {/* Custom Image Block */}
            <CustomImageBlock height={customImage ? 170 : 0} mt={0} mb={8} borderRadius={6} />

            <div style={{ fontWeight: 900, fontSize: 10, color:'#222', marginBottom: 6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES:</div>
            <div style={{ fontSize: 8, color:'#333', lineHeight: 1.4, flex:1, overflow:'hidden', whiteSpace:'pre-wrap' }}>{instrucoes.slice(0, customImage ? 180 : 500)}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Template 3: Formal ───────────────────────────────────────────────────
  if (template.id === 3) {
    return (
      <div style={containerStyle}>
        <div style={{ width:'100%', height:'100%', background:'#f9f9f9', border:`4px solid ${area.cor}`, boxSizing:'border-box', padding:4 }}>
          <div style={{ border:`1px solid ${area.cor}`, height:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
            {/* Filled header */}
            <div style={{ background: area.cor, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, minHeight:90 }}>
              {logoEsq ? <img src={logoEsq} style={{ width:65, height:65, objectFit:'contain' }} alt="" /> : <div style={{ width:65, height:65, background:'rgba(255,255,255,0.2)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{area.emoji}</div>}
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontWeight:900, fontSize:11, color:'#fff' }}>{escolaNome}</div>
              </div>
              <div style={{ width:68, height:68, background:'rgba(255,255,255,0.95)', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#999' }}>QR</div>
            </div>
            {/* Title */}
            <div style={{ textAlign:'center', padding:'14px 16px 8px' }}>
              <div style={{ fontSize:16, fontWeight:700, color:area.cor }}>PROVÃO DE</div>
              <div style={{ fontSize:48, fontWeight:900, color:'#111', lineHeight:1.1 }}>{area.label}</div>
              {serieText && <div style={{ fontSize:20, fontWeight:900, color:area.cor, marginTop:4 }}>{serieText}</div>}
            </div>
            <div style={{ height:2, background:area.cor, margin:'0 16px' }} />

            {/* Custom Image Block */}
            <CustomImageBlock height={customImage ? 185 : 0} mx={16} mt={8} mb={8} borderRadius={4} />

            {/* Instructions */}
            <div style={{ flex:1, padding:'8px 16px', overflow:'hidden' }}>
              <div style={{ fontWeight:900, fontSize:10, color:'#000', textAlign:'center', marginBottom:6 }}>INSTRUÇÕES AO ESTUDANTE:</div>
              <div style={{ fontSize:8, color:'#222', lineHeight:1.4, whiteSpace:'pre-wrap' }}>{instrucoes.slice(0, customImage ? 190 : 450)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Template 4: Colorido ─────────────────────────────────────────────────
  if (template.id === 4) {
    return (
      <div style={containerStyle}>
        <div style={{ width:'100%', height:'100%', background: area.cor }}>
          {/* Header on color */}
          <div style={{ display:'flex', alignItems:'center', padding:'14px 16px', gap:10 }}>
            {logoEsq ? <img src={logoEsq} style={{ width:72, height:72, objectFit:'contain' }} alt="" /> : <div style={{ width:72, height:72, background:'rgba(255,255,255,0.15)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34 }}>{area.emoji}</div>}
            <div style={{ flex:1, textAlign:'center' }}>
              <div style={{ fontWeight:900, fontSize:11, color:'rgba(255,255,255,0.95)' }}>{escolaNome}</div>
            </div>
            <div style={{ width:72, height:72, background:'rgba(255,255,255,0.95)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#666' }}>QR</div>
          </div>
          {/* Title on color */}
          <div style={{ textAlign:'center', padding:'6px 16px' }}>
            <div style={{ fontSize:14, fontWeight:600, color: area.corClaro, opacity:0.9 }}>PROVÃO DE</div>
            <div style={{ fontSize:52, fontWeight:900, color:'#fff', lineHeight:1.1 }}>{area.label}</div>
          </div>

          {/* Custom Image Block — shown above white card */}
          {customImage && (
            <div style={{ margin: '8px 16px 0', borderRadius: 8, overflow: 'hidden', height: 160, flexShrink: 0 }}>
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
          )}

          {/* White card bottom */}
          <div style={{ background:'#fff', margin: customImage ? '8px 16px 0' : '8px 16px 0', borderRadius:'8px 8px 0 0', flex:1, padding:'10px 14px', minHeight: customImage ? 230 : 460 }}>
            {serieText && <div style={{ fontSize:20, fontWeight:900, color:area.cor, textAlign:'center', marginBottom:8 }}>{serieText}</div>}
            <div style={{ background:area.corClaro, border:`1.5px solid ${area.cor}`, borderRadius:6, padding:'8px 12px' }}>
              <div style={{ fontWeight:900, fontSize:10, color:area.cor, textAlign:'center', marginBottom:6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
              <div style={{ fontSize:8, color:'#222', lineHeight:1.4, whiteSpace:'pre-wrap' }}>{instrucoes.slice(0, customImage ? 160 : 420)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Template 5: Dark ─────────────────────────────────────────────────────
  if (template.id === 5) {
    return (
      <div style={containerStyle}>
        <div style={{ width:'100%', height:'100%', background:'#0f172a', display:'flex', flexDirection:'column' }}>
          {/* Top accent line */}
          <div style={{ height:5, background:area.cor }} />
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', gap:10 }}>
            {logoEsq ? <img src={logoEsq} style={{ width:68, height:68, objectFit:'contain' }} alt="" /> : <div style={{ width:68, height:68, background:`${area.cor}33`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>{area.emoji}</div>}
            <div style={{ flex:1, textAlign:'center' }}>
              <div style={{ fontWeight:900, fontSize:10, color:'#e2e8f0' }}>{escolaNome}</div>
            </div>
            <div style={{ width:70, height:70, background:'rgba(255,255,255,0.08)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#64748b', border:'1px solid #334155' }}>QR</div>
          </div>
          {/* Divider */}
          <div style={{ height:1, background:area.cor, margin:'0 16px' }} />
          {/* Title */}
          <div style={{ textAlign:'center', padding:'12px 16px 8px' }}>
            <div style={{ fontSize:12, fontWeight:600, color:area.cor }}>PROVÃO DE</div>
            <div style={{ fontSize:48, fontWeight:900, color:'#f1f5f9', lineHeight:1.1 }}>{area.label}</div>
            {serieText && <div style={{ fontSize:18, fontWeight:900, color:area.cor, marginTop:4 }}>{serieText}</div>}
          </div>

          {/* Custom Image Block */}
          <CustomImageBlock height={customImage ? 175 : 0} mx={16} mt={4} mb={8} borderRadius={8} />

          {/* Instructions dark card */}
          <div style={{ flex:1, margin: customImage ? '0 16px 16px' : '8px 16px 16px', background:'#1e293b', borderRadius:8, border:`1px solid ${area.cor}`, padding:'10px 14px', overflow:'hidden' }}>
            <div style={{ fontWeight:900, fontSize:10, color:'#e2e8f0', textAlign:'center', marginBottom:6 }}>LEIA ATENTAMENTE AS INSTRUÇÕES SEGUINTES:</div>
            <div style={{ fontSize:8, color:'#cbd5e1', lineHeight:1.4, whiteSpace:'pre-wrap' }}>{instrucoes.slice(0, customImage ? 180 : 450)}</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
