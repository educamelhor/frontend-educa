// src/features/questoes/components/SmartMediaCard.jsx
// EDUCA.STUDIO AI — Card Independente de Mídia Inteligente para Questões
// Suporta upload HD p/ DO Spaces, Preset de Escala (P/M/G/100%), Posição Semântica,
// Indicador de Nitidez 300 DPI, Filtro "Scanner Clean" e Recorte Interativo.

import React, { useState, useRef } from 'react';
import api from '../../../services/api';
import ImageCropperModal from './ImageCropperModal';

const PRESETS = [
  { key: 'P',    label: 'P (35%)',   desc: 'Compacta / Molécula' },
  { key: 'M',    label: 'M (55%)',   desc: 'Gráfico / Mapa padrão' },
  { key: 'G',    label: 'G (84%)',   desc: 'Diagrama largo / 2 quadros' },
  { key: '100%', label: '100%',      desc: 'Tirinha panorâmica' },
];

const POSICOES = [
  { key: 'apos_texto_apoio',          label: '⬆️ Antes do enunciado' },
  { key: 'entre_enunciado_e_comando', label: '↕️ Entre enunciado e comando' },
  { key: 'abaixo_comando',            label: '⬇️ Abaixo do comando' },
];

const ALINHAMENTOS = [
  { key: 'left',   label: '⬅ Esq' },
  { key: 'center', label: '⬌ Centro' },
  { key: 'right',  label: '➡ Dir' },
];

const DPI_BADGE = {
  alta:  { label: '🟢 Nitidez 300 DPI', bg: '#ecfdf5', color: '#047857', border: '#6ee7b7' },
  media: { label: '🟡 Nitidez Média',   bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  baixa: { label: '🔴 Baixa Resolução (pode pixelar no A4)', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};

export default function SmartMediaCard({ imagem, midia, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [erro, setErro] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const imgUrl = midia?.url || imagem || null;

  const updateMidia = (partial) => {
    const nextMidia = {
      url: imgUrl,
      original_url: midia?.original_url || imgUrl,
      preset: midia?.preset || 'M',
      posicao: midia?.posicao || 'entre_enunciado_e_comando',
      alinhamento: midia?.alinhamento || 'center',
      scanner_clean: Boolean(midia?.scanner_clean),
      dpi_status: midia?.dpi_status || 'alta',
      legenda: midia?.legenda || '',
      credito: midia?.credito || '',
      ...midia,
      ...partial,
    };
    onChange(nextMidia.url, nextMidia);
  };

  const handleUploadFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem válido (PNG, JPG ou WEBP).');
      return;
    }
    setUploading(true);
    setErro('');
    try {
      const fd = new FormData();
      fd.append('imagem', file);
      fd.append('posicao', midia?.posicao || 'entre_enunciado_e_comando');
      const { data } = await api.post('/api/questoes/upload-imagem', fd);
      const novaMidia = data.midia || {
        url: data.url,
        original_url: data.url,
        preset: 'M',
        posicao: 'entre_enunciado_e_comando',
        alinhamento: 'center',
        dpi_status: 'alta',
        legenda: '',
        credito: '',
      };
      onChange(data.url, novaMidia);
    } catch (err) {
      setErro(err.response?.data?.message || err.message || 'Falha ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const toggleScannerClean = async () => {
    const sourceUrl = midia?.original_url || imgUrl;
    if (!sourceUrl || !/^https:\/\/[a-z0-9.-]*digitaloceanspaces\.com\//i.test(sourceUrl)) return;
    const novoValor = !midia?.scanner_clean;
    setReprocessing(true);
    setErro('');
    try {
      const { data } = await api.post('/api/questoes/processar-midia', {
        source_url: sourceUrl,
        bbox: midia?.bbox ? JSON.stringify(midia.bbox) : undefined,
        scanner_clean: novoValor ? '1' : '0',
        posicao: midia?.posicao || 'entre_enunciado_e_comando',
        preset: midia?.preset || undefined,
        alinhamento: midia?.alinhamento || 'center',
        legenda: midia?.legenda || '',
        credito: midia?.credito || '',
      });
      onChange(data.url, { ...data.midia, original_url: sourceUrl });
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível aplicar o filtro Scanner Clean.');
    } finally {
      setReprocessing(false);
    }
  };

  const handlePasteZone = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) {
          e.preventDefault();
          e.stopPropagation();
          handleUploadFile(f);
          break;
        }
      }
    }
  };

  if (!imgUrl) {
    return (
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); e.target.value = ''; }}
        />
        <div
          tabIndex={0}
          onPaste={handlePasteZone}
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleUploadFile(e.dataTransfer.files?.[0]); }}
          style={{
            border: `2px dashed ${drag ? '#0284c7' : '#cbd5e1'}`,
            background: drag ? '#f0f9ff' : '#f8fafc',
            borderRadius: 12,
            padding: '16px 14px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {uploading ? (
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0369a1' }}>
              ⏳ Otimizando figura em alta definição (300 DPI)...
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                🖼️ Clique, arraste ou cole aqui apenas a figura da questão
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                Auto-ajuste inteligente de escala (P/M/G/100%), corte de margens brancas e nitidez p/ prova A4
              </div>
            </>
          )}
        </div>
        {erro && <div style={{ color: '#dc2626', fontSize: '0.76rem', marginTop: 5 }}>⚠️ {erro}</div>}
      </div>
    );
  }

  const dpi = DPI_BADGE[midia?.dpi_status || 'alta'] || DPI_BADGE.alta;
  const presetAtual = midia?.preset || 'M';
  const posicaoAtual = midia?.posicao || 'entre_enunciado_e_comando';
  const alignAtual = midia?.alinhamento || 'center';
  const podeReprocessar = /^https:\/\/[a-z0-9.-]*digitaloceanspaces\.com\//i.test(midia?.original_url || imgUrl);

  return (
    <div style={{
      border: '1.5px solid #bae6fd',
      background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)',
      borderRadius: 12,
      padding: 12,
    }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); e.target.value = ''; }}
      />

      {showCropper && (
        <ImageCropperModal
          midia={midia || { url: imgUrl, original_url: imgUrl }}
          onApply={(novaMidia) => onChange(novaMidia.url, novaMidia)}
          onClose={() => setShowCropper(false)}
        />
      )}

      {/* Header do Estúdio de Mídia */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ✨ Mídia Independente
          </span>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: dpi.bg, color: dpi.color, border: `1px solid ${dpi.border}`,
          }}>
            {dpi.label}{midia?.width && midia?.height ? ` (${midia.width}×${midia.height}px)` : ''}
          </span>
          {midia?.preset_auto && midia.preset_auto === presetAtual && (
            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#0e7490', background: '#e0f2fe', padding: '2px 7px', borderRadius: 99 }}>
              Escala Auto: {presetAtual}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {podeReprocessar && (
            <>
              <button
                type="button"
                onClick={() => setShowCropper(true)}
                disabled={reprocessing || uploading}
                style={{
                  padding: '4px 9px', borderRadius: 7, border: '1px solid #7dd3fc',
                  background: '#fff', color: '#0369a1', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                ✂️ Ajustar Recorte
              </button>
              <button
                type="button"
                onClick={toggleScannerClean}
                disabled={reprocessing || uploading}
                title="Remove o fundo cinza/amarelado de fotos tiradas com celular de livros e provas"
                style={{
                  padding: '4px 9px', borderRadius: 7,
                  border: `1px solid ${midia?.scanner_clean ? '#059669' : '#cbd5e1'}`,
                  background: midia?.scanner_clean ? '#ecfdf5' : '#fff',
                  color: midia?.scanner_clean ? '#047857' : '#475569',
                  fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {reprocessing ? '⏳...' : `🖨️ Scanner Clean ${midia?.scanner_clean ? 'ON' : 'OFF'}`}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{ padding: '4px 9px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
          >
            🔄 Trocar
          </button>
          <button
            type="button"
            onClick={() => onChange(null, null)}
            style={{ padding: '4px 9px', borderRadius: 7, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer' }}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Preview proporcional real */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: 10, marginBottom: 10,
        display: 'flex',
        justifyContent: alignAtual === 'left' ? 'flex-start' : alignAtual === 'right' ? 'flex-end' : 'center',
      }}>
        <img
          src={imgUrl}
          alt="Preview da figura"
          style={{
            width: { P: '36%', M: '56%', G: '84%', '100%': '100%' }[presetAtual] || '56%',
            maxWidth: '100%',
            maxHeight: 220,
            objectFit: 'contain',
            borderRadius: 6,
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      {/* Controles de Escala + Alinhamento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>
            Proporção na Prova
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                title={p.desc}
                onClick={() => updateMidia({ preset: p.key })}
                style={{
                  padding: '4px 9px', borderRadius: 6, fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${presetAtual === p.key ? '#0284c7' : '#e2e8f0'}`,
                  background: presetAtual === p.key ? '#0284c7' : '#fff',
                  color: presetAtual === p.key ? '#fff' : '#475569',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>
            Alinhamento
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {ALINHAMENTOS.map(a => (
              <button
                key={a.key}
                type="button"
                onClick={() => updateMidia({ alinhamento: a.key })}
                style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${alignAtual === a.key ? '#0284c7' : '#e2e8f0'}`,
                  background: alignAtual === a.key ? '#e0f2fe' : '#fff',
                  color: alignAtual === a.key ? '#0369a1' : '#475569',
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posição semântica na questão */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>
          Posição Exata na Anatomia da Questão
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {POSICOES.map(pos => (
            <button
              key={pos.key}
              type="button"
              onClick={() => updateMidia({ posicao: pos.key })}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${posicaoAtual === pos.key ? '#0e7490' : '#e2e8f0'}`,
                background: posicaoAtual === pos.key ? '#ecfeff' : '#fff',
                color: posicaoAtual === pos.key ? '#0e7490' : '#475569',
              }}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda e Crédito */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8 }}>
        <input
          className="bq-input"
          style={{ fontSize: '0.78rem', padding: '6px 10px' }}
          placeholder="Legenda da figura (opcional)..."
          value={midia?.legenda || ''}
          onChange={e => updateMidia({ legenda: e.target.value })}
        />
        <input
          className="bq-input"
          style={{ fontSize: '0.78rem', padding: '6px 10px' }}
          placeholder="Crédito / Fonte da imagem (opcional)..."
          value={midia?.credito || ''}
          onChange={e => updateMidia({ credito: e.target.value })}
        />
      </div>

      {erro && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: 6 }}>⚠️ {erro}</div>}
    </div>
  );
}
