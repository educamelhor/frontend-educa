// src/features/questoes/components/ImageCropperModal.jsx
// Recorte manual de precisão (Bounding Box 0..1000) sobre a imagem original no DO Spaces

import React, { useState, useRef } from 'react';
import api from '../../../services/api';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default function ImageCropperModal({ midia, onApply, onClose }) {
  const sourceUrl = midia?.original_url || midia?.url;
  // Bbox inicial normalizado [ymin, xmin, ymax, xmax] em 0..1000
  const [box, setBox] = useState(() => {
    if (Array.isArray(midia?.bbox) && midia.bbox.length === 4) {
      return midia.bbox;
    }
    return [80, 80, 920, 920];
  });
  const [scannerClean, setScannerClean] = useState(Boolean(midia?.scanner_clean));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [dragging, setDragging] = useState(false);
  const startPtRef = useRef(null);
  const wrapRef = useRef(null);

  if (!sourceUrl) return null;

  const coordsRelativas = (clientX, clientY) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 500, y: 500 };
    const x = clamp(Math.round(((clientX - rect.left) / rect.width) * 1000), 0, 1000);
    const y = clamp(Math.round(((clientY - rect.top) / rect.height) * 1000), 0, 1000);
    return { x, y };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const pt = coordsRelativas(e.clientX, e.clientY);
    startPtRef.current = pt;
    setDragging(true);
    setBox([pt.y, pt.x, clamp(pt.y + 30, 0, 1000), clamp(pt.x + 30, 0, 1000)]);
  };

  const onPointerMove = (e) => {
    if (!dragging || !startPtRef.current) return;
    const pt = coordsRelativas(e.clientX, e.clientY);
    const ymin = Math.min(startPtRef.current.y, pt.y);
    const ymax = Math.max(startPtRef.current.y, pt.y);
    const xmin = Math.min(startPtRef.current.x, pt.x);
    const xmax = Math.max(startPtRef.current.x, pt.x);
    setBox([ymin, xmin, ymax, xmax]);
  };

  const onPointerUp = () => {
    setDragging(false);
    startPtRef.current = null;
  };

  const aplicarRecorte = async () => {
    const [ymin, xmin, ymax, xmax] = box;
    if (ymax - ymin < 25 || xmax - xmin < 25) {
      setErro('Arraste sobre a imagem para selecionar uma área maior para a figura.');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      const { data } = await api.post('/api/questoes/processar-midia', {
        source_url: sourceUrl,
        bbox: JSON.stringify([ymin, xmin, ymax, xmax]),
        scanner_clean: scannerClean ? '1' : '0',
        posicao: midia?.posicao || 'entre_enunciado_e_comando',
        alinhamento: midia?.alinhamento || 'center',
        legenda: midia?.legenda || '',
        credito: midia?.credito || '',
      });
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

  const [ymin, xmin, ymax, xmax] = box;

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
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', background: 'linear-gradient(135deg, #0f172a, #0e7490)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>✂️ Estúdio de Recorte da Figura</div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.78)' }}>
              Clique e arraste sobre a imagem para isolar apenas a ilustração, gráfico ou esquema
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* Canvas de recorte */}
        <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f1f5f9' }}>
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
              style={{ display: 'block', maxWidth: '100%', maxHeight: '56vh', pointerEvents: 'none' }}
            />
            {/* Máscara escurecida + janela de recorte */}
            <div
              style={{
                position: 'absolute',
                top: `${ymin / 10}%`,
                left: `${xmin / 10}%`,
                width: `${Math.max(1, (xmax - xmin) / 10)}%`,
                height: `${Math.max(1, (ymax - ymin) / 10)}%`,
                border: '2.5px solid #0ea5e9',
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.52)',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={scannerClean}
                onChange={e => setScannerClean(e.target.checked)}
              />
              🖨️ Aplicar filtro Scanner Clean (clarear fundo de foto de papel)
            </label>

            <button
              type="button"
              onClick={() => setBox([0, 0, 1000, 1000])}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1',
                background: '#fff', color: '#475569', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
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
            {loading ? '⏳ Processando HD...' : '✂️ Aplicar Recorte HD'}
          </button>
        </div>
      </div>
    </div>
  );
}
