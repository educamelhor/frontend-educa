// src/features/questoes/components/ImagemParaQuestaoModal.jsx
// EDUCA.STUDIO AI — Clonador Multimodal de Questão por Print / Foto
// Detecta automaticamente qualquer um dos 7 modelos (em 1 ou 2 colunas), isola e compõe figuras
// via Multi-Bounding Box, identifica fonte real, sugere BNCC/Temas e resolve passo a passo.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../../../services/api';
import { TIPO_META, QuestaoCorpoEstruturado, MathText, resumirGabaritoQuestao } from '../utils/questaoRenderer';

const CONFIANCA_COLOR = { alta: '#059669', media: '#d97706', baixa: '#dc2626' };
const CONFIANCA_LABEL = { alta: '✅ Alta', media: '⚠️ Média', baixa: '❌ Baixa' };

export default function ImagemParaQuestaoModal({ onClose, onUsar, initialFile = null }) {
  const [etapa, setEtapa]           = useState('upload'); // upload | extraindo | revisao | erro
  const [arquivo, setArquivo]       = useState(null);
  const [preview, setPreview]       = useState(null);
  const [resultado, setResultado]   = useState(null);
  const [erroMsg, setErroMsg]       = useState('');
  const [isDrag, setIsDrag]         = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const inputRef = useRef();

  const selecionarArquivo = useCallback((file) => {
    if (!file) return;
    const tipo = file.type || 'image/png';
    if (!/^image\/(jpeg|png|webp|gif|bmp|tiff|avif)$/i.test(tipo)) {
      setErroMsg('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErroMsg('Imagem muito grande. Máximo: 12 MB.');
      return;
    }
    setErroMsg('');
    setArquivo(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (initialFile) {
      selecionarArquivo(initialFile);
    }
  }, [initialFile, selecionarArquivo]);

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) selecionarArquivo(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDrag(false);
    selecionarArquivo(e.dataTransfer.files?.[0]);
  };

  useEffect(() => {
    const handlePaste = (e) => {
      if (etapa !== 'upload' && etapa !== 'erro') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            selecionarArquivo(file);
            setPasteFlash(true);
            setTimeout(() => setPasteFlash(false), 1800);
            e.preventDefault();
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [etapa, selecionarArquivo]);

  const extrair = async () => {
    if (!arquivo) return;
    setEtapa('extraindo');
    setErroMsg('');

    try {
      const fd = new FormData();
      fd.append('imagem', arquivo);

      const { data } = await api.post('/api/questoes/extrair-imagem', fd);
      if (!data.ok) {
        throw new Error(data.message || 'Falha ao processar a imagem.');
      }
      setResultado(data);
      setEtapa('revisao');
    } catch (err) {
      const dataErr = err.response?.data;
      const baseMsg = dataErr?.message || err.message || 'Erro inesperado.';
      const detail = dataErr?.detail && dataErr.detail !== baseMsg ? ` (${dataErr.detail})` : '';
      setErroMsg(`${baseMsg}${detail}`);
      setEtapa('erro');
    }
  };

  const usar = () => {
    if (!resultado) return;
    onUsar(resultado);
    onClose();
  };

  const resetar = () => {
    setEtapa('upload');
    setArquivo(null);
    setPreview(null);
    setResultado(null);
    setErroMsg('');
  };

  const partesCount = resultado?.midia?.partes_count || (Array.isArray(resultado?.midia?.bboxes) ? resultado.midia.bboxes.length : 0);

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>📸</div>
          <div style={{ flex: 1 }}>
            <div style={styles.headerTitle}>EDUCA.STUDIO AI — Clonar Questão por Print / Foto</div>
            <div style={styles.headerSub}>
              {etapa === 'upload'    && 'Reconhece os 7 modelos (1 ou 2 colunas), une e recorta figuras automaticamente, identifica a banca e resolve'}
              {etapa === 'extraindo' && 'Agente Multimodal Gemini 2.5 lendo colunas, fórmulas LaTeX e reconstruindo ilustrações...'}
              {etapa === 'revisao'   && 'Confira a clonagem estruturada antes de enviar para o editor'}
              {etapa === 'erro'      && 'Ocorreu um problema ao analisar a imagem'}
            </div>
          </div>
          <button style={styles.btnClose} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {(etapa === 'upload' || etapa === 'erro') && (
            <>
              {pasteFlash && <div style={styles.pasteToast}>📋 Print capturado da área de transferência!</div>}

              <div
                style={{
                  ...styles.dropZone,
                  ...(isDrag ? styles.dropZoneActive : {}),
                  ...(preview ? styles.dropZoneWithPreview : {}),
                  ...(pasteFlash ? styles.dropZoneFlash : {}),
                }}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
                onDragLeave={() => setIsDrag(false)}
                onDrop={onDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={onInputChange}
                />

                {preview ? (
                  <img src={preview} alt="Preview" style={styles.previewImg} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.6rem', marginBottom: 8 }}>🖼️</div>
                    <div style={styles.dropText}>
                      Arraste um print/foto de questão ou <span style={styles.dropLink}>clique para selecionar</span>
                    </div>
                    <div style={styles.dropSub}>
                      Suporta questões em 1 ou 2 colunas (ENEM/Fuvest), Múltipla Escolha, Afirmativas, V/F, Colunas, Lacunas, Somatória e Discursiva!
                    </div>
                    <div style={styles.pasteHint}>
                      <span style={styles.kbdKey}>Ctrl</span>
                      <span style={styles.kbdPlus}>+</span>
                      <span style={styles.kbdKey}>V</span>
                      <span style={styles.pasteHintText}>para colar print direto da tela</span>
                    </div>
                  </div>
                )}
              </div>

              {preview && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button style={styles.btnTrocar} onClick={() => inputRef.current?.click()}>🔄 Trocar imagem</button>
                  <button style={styles.btnTrocar} onClick={resetar}>🗑️ Remover</button>
                </div>
              )}

              {erroMsg && <div style={styles.alertErro}>⚠️ {erroMsg}</div>}

              <div style={styles.footer}>
                <button style={styles.btnSecundario} onClick={onClose}>Cancelar</button>
                <button
                  style={{ ...styles.btnPrimario, ...(!arquivo ? styles.btnDisabled : {}) }}
                  disabled={!arquivo}
                  onClick={extrair}
                >
                  ✨ Clonar e Estruturar com IA
                </button>
              </div>
            </>
          )}

          {etapa === 'extraindo' && (
            <div style={styles.loadingWrap}>
              <div style={styles.spinner} />
              <div style={styles.loadingTitle}>Agentes EDUCA.STUDIO em ação...</div>
              <div style={styles.loadingSub}>
                1. Detectando layout (1 ou 2 colunas), enunciado e fórmulas LaTeX<br />
                2. Recortando e unindo ilustrações de todas as colunas (300 DPI)<br />
                3. Classificando BNCC/Temas e calculando resolução comentada
              </div>
              {preview && (
                <img src={preview} alt="Preview" style={{ ...styles.previewImg, marginTop: 14, maxHeight: 170 }} />
              )}
            </div>
          )}

          {etapa === 'revisao' && resultado && (
            <>
              <div style={styles.revisaoGrid}>
                {/* Coluna esquerda: Print original + Figura recortada/composta */}
                <div style={styles.revisaoImagem}>
                  <div style={styles.revisaoLabel}>Print enviado</div>
                  <img src={preview} alt="Original" style={styles.revisaoImg} />

                  {resultado.midia?.url && (
                    <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0369a1', marginBottom: 6, textTransform: 'uppercase' }}>
                        ✂️ Figura Isolada {partesCount > 1 ? `· ${partesCount} áreas unidas ` : ''}({resultado.midia.preset})
                      </div>
                      <img
                        src={resultado.midia.url}
                        alt="Figura isolada"
                        style={{ width: '100%', maxHeight: 175, objectFit: 'contain', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                  )}
                </div>

                {/* Coluna direita: Questão estruturada ao vivo */}
                <div style={styles.revisaoDados}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 99, background: '#0f172a', color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>
                      {TIPO_META[resultado.tipo]?.emoji} {TIPO_META[resultado.tipo]?.label || resultado.tipo}
                    </span>
                    {resultado.layout_origem === 'duas_colunas' && (
                      <span style={{ padding: '3px 10px', borderRadius: 99, background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', fontSize: '0.71rem', fontWeight: 800 }}>
                        📐 2 Colunas Unificadas
                      </span>
                    )}
                    {resultado.disciplina && (
                      <span style={{ padding: '3px 10px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>
                        {resultado.disciplina}
                      </span>
                    )}
                    {resultado.serie && (
                      <span style={{ padding: '3px 10px', borderRadius: 99, background: '#f3e8ff', color: '#7e22ce', fontSize: '0.72rem', fontWeight: 700 }}>
                        {resultado.serie}
                      </span>
                    )}
                    {resultado.habilidade_bncc && (
                      <span style={{ padding: '3px 10px', borderRadius: 99, background: '#ffedd5', color: '#c2410c', fontSize: '0.72rem', fontWeight: 700 }}>
                        BNCC: {resultado.habilidade_bncc}
                      </span>
                    )}
                    {resultado.fonte && (
                      <span style={{ padding: '3px 10px', borderRadius: 99, background: '#f1f5f9', color: '#334155', fontSize: '0.72rem', fontWeight: 700 }}>
                        📖 {resultado.fonte}
                      </span>
                    )}
                    {resultado.confianca && (
                      <span style={{
                        ...styles.confiancaBadge,
                        background: `${CONFIANCA_COLOR[resultado.confianca]}18`,
                        color: CONFIANCA_COLOR[resultado.confianca],
                        borderColor: `${CONFIANCA_COLOR[resultado.confianca]}40`,
                      }}>
                        {CONFIANCA_LABEL[resultado.confianca]}
                      </span>
                    )}
                  </div>

                  {/* Preview fiel da questão estruturada */}
                  <div style={styles.campoBlock}>
                    <QuestaoCorpoEstruturado questao={resultado} showGabarito={true} />
                  </div>

                  {/* Status do Gabarito + Resolução do Agente Solucionador */}
                  <div style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: resultado.gabarito_origem === 'marcado_na_imagem' ? '#ecfdf5' : '#fffbeb',
                    border: `1px solid ${resultado.gabarito_origem === 'marcado_na_imagem' ? '#6ee7b7' : '#fcd34d'}`,
                  }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: resultado.gabarito_origem === 'marcado_na_imagem' ? '#065f46' : '#92400e', marginBottom: 5 }}>
                      {resultado.gabarito_origem === 'marcado_na_imagem'
                        ? `✅ Gabarito identificado na imagem: ${resumirGabaritoQuestao(resultado)}`
                        : `🧠 Gabarito sugerido pelo Agente IA: ${resumirGabaritoQuestao(resultado)} (você confirmará em 1 clique no editor)`}
                    </div>
                    {resultado.explicacao && (
                      <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        <MathText text={resultado.explicacao} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.footer}>
                <button style={styles.btnSecundario} onClick={resetar}>← Outra imagem</button>
                <button style={styles.btnPrimario} onClick={usar}>
                  ✅ Abrir no Editor para Revisar / Salvar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 18, width: '100%', maxWidth: 960,
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 70px rgba(0,0,0,0.3)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
    background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 60%, #0284c7 100%)', flexShrink: 0,
  },
  headerIcon:  { fontSize: '1.5rem', background: 'rgba(255,255,255,0.16)', borderRadius: 10, padding: '6px 10px' },
  headerTitle: { color: '#fff', fontWeight: 800, fontSize: '1rem' },
  headerSub:   { color: 'rgba(255,255,255,0.82)', fontSize: '0.77rem', marginTop: 2 },
  btnClose: {
    background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8,
    color: '#fff', cursor: 'pointer', fontSize: '0.95rem', width: 32, height: 32,
  },
  body: { padding: 20, overflowY: 'auto', flex: 1, position: 'relative' },
  pasteToast: {
    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
    background: '#059669', color: '#fff', borderRadius: 10, padding: '8px 18px',
    fontSize: '0.84rem', fontWeight: 700, zIndex: 10,
  },
  dropZone: {
    border: '2px dashed #cbd5e1', borderRadius: 14, padding: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s', minHeight: 200,
  },
  dropZoneActive:      { borderColor: '#0e7490', background: '#f0fdff' },
  dropZoneWithPreview: { padding: 10, border: '2px solid #0e7490', background: '#f0fdff' },
  dropZoneFlash:       { borderColor: '#059669', background: '#f0fdf4' },
  dropText: { fontSize: '0.94rem', color: '#334155', marginBottom: 5, fontWeight: 600 },
  dropLink: { color: '#0e7490', fontWeight: 800, textDecoration: 'underline' },
  dropSub:  { fontSize: '0.76rem', color: '#64748b', marginBottom: 14, maxWidth: 520, marginInline: 'auto' },
  previewImg: { width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8 },
  pasteHint: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: '#f1f5f9', borderRadius: 8, padding: '5px 12px', fontSize: '0.75rem',
  },
  kbdKey: {
    background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 5,
    padding: '1px 7px', fontWeight: 700, fontSize: '0.73rem', color: '#334155', fontFamily: 'monospace',
  },
  kbdPlus: { color: '#94a3b8', fontWeight: 600 },
  pasteHintText: { color: '#64748b', marginLeft: 2 },
  btnTrocar: {
    background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8,
    padding: '5px 12px', fontSize: '0.78rem', color: '#475569', cursor: 'pointer', fontWeight: 600,
  },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 },
  spinner: {
    width: 44, height: 44, border: '4px solid #e2e8f0',
    borderTop: '4px solid #0e7490', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  loadingTitle: { fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' },
  loadingSub: { fontSize: '0.82rem', color: '#475569', textAlign: 'center', lineHeight: 1.65 },
  revisaoGrid: { display: 'grid', gridTemplateColumns: '0.9fr 1.5fr', gap: 16, marginBottom: 14 },
  revisaoImagem: { display: 'flex', flexDirection: 'column' },
  revisaoImg: { width: '100%', borderRadius: 10, border: '1.5px solid #e2e8f0', objectFit: 'contain', maxHeight: 280, background: '#f8fafc' },
  revisaoDados: { display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 470, paddingRight: 4 },
  revisaoLabel: { fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  confiancaBadge: { fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: '1px solid' },
  campoBlock: { background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e2e8f0' },
  alertErro: { marginTop: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: '0.82rem', color: '#b91c1c' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' },
  btnPrimario: {
    background: 'linear-gradient(135deg, #0e7490, #0284c7)', color: '#fff', border: 'none', borderRadius: 10,
    padding: '10px 22px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit',
  },
  btnSecundario: {
    background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0',
    borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
  },
  btnDisabled: { background: '#94a3b8', cursor: 'not-allowed' },
};
