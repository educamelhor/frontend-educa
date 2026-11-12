// src/features/questoes/components/ImageCropperModal.jsx
// Estúdio de Recorte Manual de Precisão (1 ou N Bounding Boxes 0..1000) sobre a imagem original no DO Spaces.
// Suporta seleção de múltiplas áreas (questões em 2 colunas / figuras duplas), costura de quebra de coluna
// e escolha entre arranjo Lado a Lado ou Empilhado.

import React, { useState, useRef } from 'react';
import api from '../../../services/api';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const BOX_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];

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
  const [dragging, setDragging] = useState(false);
  const startPtRef = useRef(null);
  const wrapRef = useRef(null);

  if (!sourceUrl) return null;

  const safeIdx = Math.min(activeIdx, Math.max(0, areas.length - 1));
  const currentArea = areas[safeIdx] || areas[0];

  const coordsRelativas = (clientX, clientY) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 500, y: 500 };
    const x = clamp(Math.round(((clientX - rect.left) / rect.width) * 1000), 0, 1000);
    const y = clamp(Math.round(((clientY - rect.top) / rect.height) * 1000), 0, 1000);
    return { x, y };
  };

  const updateBoxAt = (idx, newBbox) => {
    setAreas((prev) => prev.map((it, i) => (i === idx ? { ...it, bbox: newBbox } : it)));
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const pt = coordsRelativas(e.clientX, e.clientY);
    startPtRef.current = pt;
    setDragging(true);
    updateBoxAt(safeIdx, [pt.y, pt.x, clamp(pt.y + 30, 0, 1000), clamp(pt.x + 30, 0, 1000)]);
  };

  const onPointerMove = (e) => {
    if (!dragging || !startPtRef.current) return;
    const pt = coordsRelativas(e.clientX, e.clientY);
    const ymin = Math.min(startPtRef.current.y, pt.y);
    const ymax = Math.max(startPtRef.current.y, pt.y);
    const xmin = Math.min(startPtRef.current.x, pt.x);
    const xmax = Math.max(startPtRef.current.x, pt.x);
    updateBoxAt(safeIdx, [ymin, xmin, ymax, xmax]);
  };

  const onPointerUp = () => {
    setDragging(false);
    startPtRef.current = null;
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

  const aplicarRecorte = async () => {
    for (let i = 0; i < areas.length; i++) {
      const [ymin, xmin, ymax, xmax] = areas[i].bbox;
      if (ymax - ymin < 20 || xmax - xmin < 20) {
        setErro(`A Área ${i + 1} está muito pequena. Arraste sobre a imagem para demarcá-la.`);
        setActiveIdx(i);
        return;
      }
    }
    setLoading(true);
    setErro('');
    try {
      const payload = {
        source_url: sourceUrl,
        bboxes: JSON.stringify(areas),
        bbox: areas.length === 1 ? JSON.stringify(areas[0].bbox) : undefined,
        composicao_layout: composicaoLayout,
        coluna_divisao_x: midia?.coluna_divisao_x || 0,
        layout_origem: midia?.layout_origem || (areas.length > 1 ? 'duas_colunas' : 'coluna_unica'),
        scanner_clean: scannerClean ? '1' : '0',
        posicao: midia?.posicao || 'entre_enunciado_e_comando',
        alinhamento: midia?.alinhamento || 'center',
        legenda: midia?.legenda || '',
        credito: midia?.credito || '',
      };
      const { data } = await api.post('/api/questoes/processar-midia', payload);
      onApply({
        ...data.midia,
        original_url: sourceUrl,
      });
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
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 840,
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
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.82)' }}>
              Arraste sobre o print para isolar a figura ativa. Em questões de 2 colunas, adicione uma 2ª área para unir os dois lados!
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{
              position: 'relative', display: 'inline-block', cursor: 'crosshair',
              userSelect: 'none', touchAction: 'none', maxWidth: '100%',
              border: '2px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', background: '#fff',
            }}
          >
            <img
              src={sourceUrl}
              alt="Original para recorte"
              draggable={false}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '52vh', pointerEvents: 'none' }}
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
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: `${ymin / 10}%`,
                    left: `${xmin / 10}%`,
                    width: `${Math.max(1, (xmax - xmin) / 10)}%`,
                    height: `${Math.max(1, (ymax - ymin) / 10)}%`,
                    border: `${isAtiva ? '2.5px solid' : '2px dashed'} ${cor}`,
                    background: areas.length > 1 ? `${cor}${isAtiva ? '22' : '14'}` : 'transparent',
                    boxShadow: areas.length === 1 ? '0 0 0 9999px rgba(15, 23, 42, 0.50)' : 'none',
                    pointerEvents: isAtiva ? 'none' : 'auto',
                    cursor: isAtiva ? 'crosshair' : 'pointer',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: 2,
                    background: cor, color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                    padding: '1px 6px', borderRadius: 4, pointerEvents: 'none',
                  }}>
                    Área {idx + 1}{ar.continuacao ? ' 🔗' : ''}
                  </span>
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
            {loading ? '⏳ Compondo HD...' : `✂️ Aplicar Recorte HD${areas.length > 1 ? ` (${areas.length} áreas)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
