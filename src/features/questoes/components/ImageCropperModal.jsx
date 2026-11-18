// src/features/questoes/components/ImageCropperModal.jsx
// Estúdio de Recorte Manual de Precisão (1 ou N Bounding Boxes 0..1000) sobre a imagem original no DO Spaces.
// Suporta redimensionamento pelas 8 alças (bordas/cantos), movimentação da caixa, redesenho livre,
// seleção de múltiplas áreas (questões em 2 colunas) e aplicação estrita das dimensões definidas pelo usuário.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../../services/api';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const BOX_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];
const MIN_BOX_SIZE = 20;

const HANDLE_SPECS = [
  { mode: 'nw', top: '0%',   left: '0%',   cursor: 'nwse-resize' },
  { mode: 'n',  top: '0%',   left: '50%',  cursor: 'ns-resize' },
  { mode: 'ne', top: '0%',   left: '100%', cursor: 'nesw-resize' },
  { mode: 'e',  top: '50%',  left: '100%', cursor: 'ew-resize' },
  { mode: 'se', top: '100%', left: '100%', cursor: 'nwse-resize' },
  { mode: 's',  top: '100%', left: '50%',  cursor: 'ns-resize' },
  { mode: 'sw', top: '100%', left: '0%',   cursor: 'nesw-resize' },
  { mode: 'w',  top: '50%',  left: '0%',   cursor: 'ew-resize' },
];

export default function ImageCropperModal({ midia, onApply, onClose }) {
  const sourceUrl = midia?.original_url || midia?.url;

  const [areas, setAreas] = useState(() => {
    if (Array.isArray(midia?.bboxes) && midia.bboxes.length > 0) {
      return midia.bboxes.map((it) => {
        const b = Array.isArray(it) ? it : it?.bbox;
        return {
          bbox: Array.isArray(b) && b.length === 4 ? b.map(Number) : [80, 80, 920, 920],
          continuacao: Boolean(it?.continuacao || it?.continuacao_quebra_coluna),
          coluna: it?.coluna || 'unica',
        };
      });
    }
    if (Array.isArray(midia?.bbox) && midia.bbox.length === 4) {
      return [{ bbox: midia.bbox.map(Number), continuacao: false, coluna: 'unica' }];
    }
    return [{ bbox: [80, 80, 920, 920], continuacao: false, coluna: 'unica' }];
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const [composicaoLayout, setComposicaoLayout] = useState(
    ['horizontal', 'vertical'].includes(midia?.composicao_layout) ? midia.composicao_layout : 'auto'
  );
  const [scannerClean, setScannerClean] = useState(Boolean(midia?.scanner_clean));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // dragRef: { mode: 'draw'|'move'|'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w', idx, startX, startY, origBox }
  const dragRef = useRef(null);
  const imgRef = useRef(null);
  const wrapRef = useRef(null);

  const safeIdx = Math.min(activeIdx, Math.max(0, areas.length - 1));
  const currentArea = areas[safeIdx] || areas[0];

  const coordsRelativas = useCallback((clientX, clientY) => {
    const el = imgRef.current || wrapRef.current;
    const rect = el?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 500, y: 500 };
    const x = clamp(Math.round(((clientX - rect.left) / rect.width) * 1000), 0, 1000);
    const y = clamp(Math.round(((clientY - rect.top) / rect.height) * 1000), 0, 1000);
    return { x, y };
  }, []);

  const updateBoxAt = useCallback((idx, newBbox) => {
    setAreas((prev) => prev.map((it, i) => (i === idx ? { ...it, bbox: newBbox } : it)));
  }, []);

  useEffect(() => {
    const handleWinMove = (e) => {
      const st = dragRef.current;
      if (!st) return;
      const pt = coordsRelativas(e.clientX, e.clientY);
      const dx = pt.x - st.startX;
      const dy = pt.y - st.startY;
      const [oy1, ox1, oy2, ox2] = st.origBox;

      if (st.mode === 'draw') {
        const ymin = Math.min(st.startY, pt.y);
        const ymax = Math.max(st.startY, pt.y);
        const xmin = Math.min(st.startX, pt.x);
        const xmax = Math.max(st.startX, pt.x);
        updateBoxAt(st.idx, [ymin, xmin, ymax, xmax]);
        return;
      }

      if (st.mode === 'move') {
        const boxH = oy2 - oy1;
        const boxW = ox2 - ox1;
        const ny1 = clamp(oy1 + dy, 0, 1000 - boxH);
        const nx1 = clamp(ox1 + dx, 0, 1000 - boxW);
        updateBoxAt(st.idx, [ny1, nx1, ny1 + boxH, nx1 + boxW]);
        return;
      }

      let ny1 = oy1;
      let nx1 = ox1;
      let ny2 = oy2;
      let nx2 = ox2;

      if (st.mode.includes('n')) ny1 = clamp(oy1 + dy, 0, oy2 - MIN_BOX_SIZE);
      if (st.mode.includes('s')) ny2 = clamp(oy2 + dy, oy1 + MIN_BOX_SIZE, 1000);
      if (st.mode.includes('w')) nx1 = clamp(ox1 + dx, 0, ox2 - MIN_BOX_SIZE);
      if (st.mode.includes('e')) nx2 = clamp(ox2 + dx, ox1 + MIN_BOX_SIZE, 1000);

      updateBoxAt(st.idx, [ny1, nx1, ny2, nx2]);
    };

    const handleWinUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handleWinMove);
    window.addEventListener('pointerup', handleWinUp);
    window.addEventListener('pointercancel', handleWinUp);
    return () => {
      window.removeEventListener('pointermove', handleWinMove);
      window.removeEventListener('pointerup', handleWinUp);
      window.removeEventListener('pointercancel', handleWinUp);
    };
  }, [coordsRelativas, updateBoxAt]);

  if (!sourceUrl) return null;

  const iniciarDrag = (e, mode, idxAlvo = safeIdx) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = coordsRelativas(e.clientX, e.clientY);
    const orig = (areas[idxAlvo]?.bbox || [80, 80, 920, 920]).slice();
    dragRef.current = {
      mode,
      idx: idxAlvo,
      startX: pt.x,
      startY: pt.y,
      origBox: orig,
    };
    if (mode === 'draw') {
      updateBoxAt(idxAlvo, [
        pt.y,
        pt.x,
        clamp(pt.y + MIN_BOX_SIZE, 0, 1000),
        clamp(pt.x + MIN_BOX_SIZE, 0, 1000),
      ]);
    }
  };

  const adicionarArea = () => {
    if (areas.length >= 4) return;
    const nova = { bbox: [60, 530, 420, 960], continuacao: false, coluna: 'unica' };
    const nextLen = areas.length;
    setAreas((prev) => [...prev, nova]);
    setActiveIdx(nextLen);
  };

  const removerArea = (idx) => {
    if (areas.length <= 1) return;
    setAreas((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx((prev) => Math.max(0, Math.min(prev, areas.length - 2)));
  };

  const toggleContinuacao = (checked) => {
    setAreas((prev) =>
      prev.map((it, i) => (i === safeIdx ? { ...it, continuacao: checked } : it))
    );
  };

  /* Fallback client-side via Canvas caso sourceUrl seja data:/blob: local fora do DO Spaces */
  const recortarLocalViaCanvas = async (bboxUnico) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem para recorte.'));
      img.src = sourceUrl;
    });
    const W = img.naturalWidth || 800;
    const H = img.naturalHeight || 600;
    const [ymin, xmin, ymax, xmax] = bboxUnico.map(Number);
    const sx = clamp(Math.round((xmin / 1000) * W), 0, W - 10);
    const sy = clamp(Math.round((ymin / 1000) * H), 0, H - 10);
    const sw = clamp(Math.round(((xmax - xmin) / 1000) * W), 10, W - sx);
    const sh = clamp(Math.round(((ymax - ymin) / 1000) * H), 10, H - sy);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.94));
    if (!blob) throw new Error('Falha ao gerar imagem recortada.');

    const fd = new FormData();
    fd.append('imagem', blob, `recorte_${Date.now()}.jpg`);
    fd.append('scanner_clean', scannerClean ? '1' : '0');
    fd.append('keep_original', '0');
    fd.append('posicao', midia?.posicao || 'entre_enunciado_e_comando');
    fd.append('legenda', midia?.legenda || '');
    fd.append('credito', midia?.credito || '');

    const { data } = await api.post('/api/questoes/upload-imagem', fd);
    return {
      ...(data.midia || {}),
      url: data.url || data.midia?.url,
      original_url: sourceUrl,
      bbox: [Math.round(ymin), Math.round(xmin), Math.round(ymax), Math.round(xmax)],
      bboxes: [{ bbox: [Math.round(ymin), Math.round(xmin), Math.round(ymax), Math.round(xmax)], coluna: 'unica', continuacao: false }],
    };
  };

  const aplicarRecorte = async () => {
    for (let i = 0; i < areas.length; i++) {
      const [ymin, xmin, ymax, xmax] = areas[i].bbox;
      if (ymax - ymin < MIN_BOX_SIZE || xmax - xmin < MIN_BOX_SIZE) {
        setErro(`A Área ${i + 1} está muito pequena. Arraste as alças ou redesenhe a área.`);
        setActiveIdx(i);
        return;
      }
    }
    setLoading(true);
    setErro('');
    try {
      const ehDoSpaces = /^https:\/\/[a-z0-9.-]*digitaloceanspaces\.com\//i.test(sourceUrl);
      let midiaResultante = null;

      if (ehDoSpaces) {
        const areasArredondadas = areas.map((a) => ({
          ...a,
          bbox: a.bbox.map((v) => clamp(Math.round(Number(v)), 0, 1000)),
        }));
        const payload = {
          source_url: sourceUrl,
          bboxes: JSON.stringify(areasArredondadas),
          bbox: areasArredondadas.length === 1 ? JSON.stringify(areasArredondadas[0].bbox) : undefined,
          recorte_manual: '1',
          composicao_layout: composicaoLayout,
          coluna_divisao_x: midia?.coluna_divisao_x || 0,
          layout_origem: midia?.layout_origem || (areasArredondadas.length > 1 ? 'duas_colunas' : 'coluna_unica'),
          scanner_clean: scannerClean ? '1' : '0',
          posicao: midia?.posicao || 'entre_enunciado_e_comando',
          alinhamento: midia?.alinhamento || 'center',
          legenda: midia?.legenda || '',
          credito: midia?.credito || '',
        };
        const { data } = await api.post('/api/questoes/processar-midia', payload);
        const urlNova = data?.midia?.url || data?.url;
        if (!urlNova) {
          throw new Error('O servidor não retornou a imagem recortada.');
        }
        midiaResultante = {
          ...(data.midia || {}),
          url: urlNova,
          original_url: sourceUrl,
          bbox: areasArredondadas[0].bbox,
          bboxes: areasArredondadas,
        };
      } else {
        midiaResultante = await recortarLocalViaCanvas(areas[0].bbox);
      }

      onApply(midiaResultante);
      onClose();
    } catch (err) {
      setErro(err.response?.data?.message || err.message || 'Erro ao recortar figura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10050,
        background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860,
        maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', background: 'linear-gradient(135deg, #0f172a, #0e7490)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
              ✂️ Estúdio de Recorte Inteligente {areas.length > 1 ? `(${areas.length} Áreas / 2 Colunas)` : ''}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.84)' }}>
              Arraste as bordas/cantos azuis para ajustar milimetricamente ou clique fora da caixa para desenhar nova seleção
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* Barra de Áreas (Multi-Box p/ 2 Colunas) */}
        <div style={{
          padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {areas.map((ar, idx) => {
              const cor = BOX_COLORS[idx % BOX_COLORS.length];
              const ativo = idx === safeIdx;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'inline-flex', alignItems: 'center', borderRadius: 8, overflow: 'hidden',
                    border: `1.5px solid ${ativo ? cor : '#cbd5e1'}`,
                    background: ativo ? `${cor}18` : '#fff',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    style={{
                      border: 'none', background: 'transparent', padding: '4px 10px',
                      fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                      color: ativo ? '#0f172a' : '#475569',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 99, background: cor, display: 'inline-block' }} />
                    Área {idx + 1}{ar.continuacao ? ' 🔗' : ''}
                  </button>
                  {areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerArea(idx)}
                      title="Remover esta área"
                      style={{
                        border: 'none', borderLeft: '1px solid #e2e8f0', background: 'transparent',
                        padding: '4px 7px', fontSize: '0.72rem', color: '#dc2626', cursor: 'pointer', fontWeight: 800,
                      }}
                    >✕</button>
                  )}
                </div>
              );
            })}

            {areas.length < 4 && (
              <button
                type="button"
                onClick={adicionarArea}
                style={{
                  padding: '5px 11px', borderRadius: 8, border: '1.5px dashed #0284c7',
                  background: '#f0f9ff', color: '#0369a1', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                }}
              >
                ➕ Adicionar Área (2ª Coluna)
              </button>
            )}
          </div>

          {areas.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginRight: 2 }}>Unir:</span>
              {[
                { key: 'auto', label: '✨ Auto' },
                { key: 'horizontal', label: '⬌ Lado a Lado' },
                { key: 'vertical', label: '⬍ Empilhadas' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setComposicaoLayout(opt.key)}
                  style={{
                    padding: '4px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    border: `1.5px solid ${composicaoLayout === opt.key ? '#0284c7' : '#cbd5e1'}`,
                    background: composicaoLayout === opt.key ? '#0284c7' : '#fff',
                    color: composicaoLayout === opt.key ? '#fff' : '#475569',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Canvas de recorte */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f1f5f9' }}>
          <div
            ref={wrapRef}
            onPointerDown={(e) => iniciarDrag(e, 'draw', safeIdx)}
            style={{
              position: 'relative', display: 'inline-block', cursor: 'crosshair',
              userSelect: 'none', touchAction: 'none', maxWidth: '100%',
              border: '2px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', background: '#fff',
            }}
          >
            <img
              ref={imgRef}
              src={sourceUrl}
              alt="Original para recorte"
              draggable={false}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '54vh', pointerEvents: 'none' }}
            />

            {areas.map((ar, idx) => {
              const [ymin, xmin, ymax, xmax] = ar.bbox;
              const cor = BOX_COLORS[idx % BOX_COLORS.length];
              const isAtiva = idx === safeIdx;
              return (
                <div
                  key={idx}
                  onPointerDown={(ev) => {
                    if (!isAtiva) {
                      ev.stopPropagation();
                      setActiveIdx(idx);
                      return;
                    }
                    iniciarDrag(ev, 'move', idx);
                  }}
                  style={{
                    position: 'absolute',
                    top: `${ymin / 10}%`,
                    left: `${xmin / 10}%`,
                    width: `${Math.max(1, (xmax - xmin) / 10)}%`,
                    height: `${Math.max(1, (ymax - ymin) / 10)}%`,
                    border: `${isAtiva ? '2.5px solid' : '2px dashed'} ${cor}`,
                    background: areas.length > 1 ? `${cor}${isAtiva ? '1c' : '12'}` : 'transparent',
                    boxShadow: areas.length === 1 ? '0 0 0 9999px rgba(15, 23, 42, 0.50)' : 'none',
                    cursor: isAtiva ? 'move' : 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: 2,
                    background: cor, color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                    padding: '1px 6px', borderRadius: 4, pointerEvents: 'none',
                  }}>
                    Área {idx + 1}{ar.continuacao ? ' 🔗' : ''}
                  </span>

                  {/* 8 Alças de Redimensionamento de Precisão */}
                  {isAtiva && HANDLE_SPECS.map((h) => (
                    <div
                      key={h.mode}
                      onPointerDown={(ev) => iniciarDrag(ev, h.mode, idx)}
                      style={{
                        position: 'absolute',
                        top: h.top,
                        left: h.left,
                        width: 12,
                        height: 12,
                        transform: 'translate(-50%, -50%)',
                        background: '#ffffff',
                        border: `2px solid ${cor}`,
                        borderRadius: 3,
                        cursor: h.cursor,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
                        zIndex: 4,
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scannerClean}
                  onChange={e => setScannerClean(e.target.checked)}
                />
                🖨️ Scanner Clean (clarear foto de papel)
              </label>

              {safeIdx > 0 && (
                <label
                  title="Use quando uma mesma fórmula ou tabela começou no rodapé da 1ª coluna e continuou no topo da 2ª coluna"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#0e7490', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(currentArea?.continuacao)}
                    onChange={e => toggleContinuacao(e.target.checked)}
                  />
                  🔗 Costurar sem vão abaixo da Área {safeIdx} (quebra de coluna)
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => updateBoxAt(safeIdx, [0, 0, 1000, 1000])}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1',
                background: '#fff', color: '#475569', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Selecionar imagem inteira
            </button>
          </div>

          {erro && (
            <div style={{ marginTop: 10, width: '100%', padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '0.8rem', border: '1px solid #fecaca' }}>
              ⚠️ {erro}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fff' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aplicarRecorte}
            disabled={loading}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0e7490, #0284c7)',
              color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Aplicando Recorte HD...' : `✂️ Aplicar Recorte HD${areas.length > 1 ? ` (${areas.length} áreas)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
