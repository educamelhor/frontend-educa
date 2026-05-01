// src/features/questoes/components/ImagemParaQuestaoModal.jsx
// Modal — Importar Questão via Imagem + Gemini Vision
// Fluxo: upload → preview → extração → revisão → pré-preenchimento

import React, { useState, useRef, useCallback } from 'react';

const CONFIANCA_COLOR = { alta: '#059669', media: '#d97706', baixa: '#dc2626' };
const CONFIANCA_LABEL = { alta: '✅ Alta', media: '⚠️ Média', baixa: '❌ Baixa' };

export default function ImagemParaQuestaoModal({ onClose, onUsar }) {
  const [etapa, setEtapa]         = useState('upload');   // upload | extraindo | revisao | erro
  const [arquivo, setArquivo]     = useState(null);
  const [preview, setPreview]     = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erroMsg, setErroMsg]     = useState('');
  const [isDrag, setIsDrag]       = useState(false);
  const inputRef = useRef();

  // ── Selecionar arquivo ─────────────────────────────────────────────────────
  const selecionarArquivo = useCallback((file) => {
    if (!file || !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setErroMsg('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErroMsg('Imagem muito grande. Máximo: 10 MB.');
      return;
    }
    setErroMsg('');
    setArquivo(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) selecionarArquivo(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDrag(false);
    selecionarArquivo(e.dataTransfer.files?.[0]);
  };

  // ── Chamar Gemini ──────────────────────────────────────────────────────────
  const extrair = async () => {
    if (!arquivo) return;
    setEtapa('extraindo');
    setErroMsg('');

    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('imagem', arquivo);

      const res = await fetch('/api/questoes/extrair-imagem', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Falha ao processar a imagem.');
      }

      setResultado(data);
      setEtapa('revisao');
    } catch (err) {
      setErroMsg(err.message || 'Erro inesperado.');
      setEtapa('erro');
    }
  };

  // ── Usar resultado → pré-preencher form ───────────────────────────────────
  const usar = () => {
    if (!resultado) return;

    // Monta no formato exato que o QuestoesBuilder.INITIAL_STATE espera
    const alternativas = (resultado.alternativas || []).map((a, i) => ({
      id:      Date.now() + i,
      letra:   a.letra,
      texto:   a.texto,
      correta: resultado.gabarito
        ? a.letra.toUpperCase() === resultado.gabarito.toUpperCase()
        : false,
    }));

    onUsar({
      enunciado:   resultado.enunciado || '',
      fonte:       resultado.fonte     || '',
      alternativas: alternativas.length >= 2 ? alternativas : undefined,
      tipo:        'objetiva',
    });
    onClose();
  };

  // ── Resetar ────────────────────────────────────────────────────────────────
  const resetar = () => {
    setEtapa('upload');
    setArquivo(null);
    setPreview(null);
    setResultado(null);
    setErroMsg('');
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>📷</div>
          <div style={{ flex: 1 }}>
            <div style={styles.headerTitle}>Importar Questão por Imagem</div>
            <div style={styles.headerSub}>
              {etapa === 'upload'   && 'Envie uma foto ou print da questão'}
              {etapa === 'extraindo'&& 'Gemini Vision analisando...'}
              {etapa === 'revisao'  && 'Revise antes de usar'}
              {etapa === 'erro'     && 'Ocorreu um erro'}
            </div>
          </div>
          <button style={styles.btnClose} onClick={onClose}>✕</button>
        </div>

        {/* Corpo */}
        <div style={styles.body}>

          {/* ── ETAPA: UPLOAD ── */}
          {(etapa === 'upload' || etapa === 'erro') && (
            <>
              {/* Drag & drop */}
              <div
                style={{
                  ...styles.dropZone,
                  ...(isDrag ? styles.dropZoneActive : {}),
                  ...(preview ? styles.dropZoneWithPreview : {}),
                }}
                onClick={() => inputRef.current.click()}
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
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🖼️</div>
                    <div style={styles.dropText}>
                      Arraste a imagem aqui ou <span style={styles.dropLink}>clique para selecionar</span>
                    </div>
                    <div style={styles.dropSub}>JPG, PNG ou WEBP · Máx. 10 MB</div>
                  </div>
                )}
              </div>

              {preview && (
                <button style={styles.btnTrocar} onClick={() => inputRef.current.click()}>
                  🔄 Trocar imagem
                </button>
              )}

              {erroMsg && (
                <div style={styles.alertErro}>⚠️ {erroMsg}</div>
              )}

              <div style={styles.footer}>
                <button style={styles.btnSecundario} onClick={onClose}>Cancelar</button>
                <button
                  style={{ ...styles.btnPrimario, ...(!arquivo ? styles.btnDisabled : {}) }}
                  disabled={!arquivo}
                  onClick={extrair}
                >
                  ✨ Extrair com Gemini
                </button>
              </div>
            </>
          )}

          {/* ── ETAPA: EXTRAINDO ── */}
          {etapa === 'extraindo' && (
            <div style={styles.loadingWrap}>
              <div style={styles.spinner} />
              <div style={styles.loadingTitle}>Analisando imagem...</div>
              <div style={styles.loadingSub}>
                O Gemini Vision está lendo o texto e estruturando a questão.<br />
                Isso leva de 2 a 5 segundos.
              </div>
              {preview && (
                <img src={preview} alt="Preview" style={{ ...styles.previewImg, marginTop: 16, maxHeight: 180 }} />
              )}
            </div>
          )}

          {/* ── ETAPA: REVISÃO ── */}
          {etapa === 'revisao' && resultado && (
            <>
              {/* Lado a lado: imagem + resultado */}
              <div style={styles.revisaoGrid}>
                {/* Imagem original */}
                <div style={styles.revisaoImagem}>
                  <div style={styles.revisaoLabel}>Imagem original</div>
                  <img src={preview} alt="Original" style={styles.revisaoImg} />
                </div>

                {/* Dados extraídos */}
                <div style={styles.revisaoDados}>
                  <div style={styles.revisaoLabel}>
                    Dados extraídos
                    {resultado.confianca && (
                      <span style={{
                        ...styles.confiancaBadge,
                        background: `${CONFIANCA_COLOR[resultado.confianca]}18`,
                        color: CONFIANCA_COLOR[resultado.confianca],
                        borderColor: `${CONFIANCA_COLOR[resultado.confianca]}40`,
                      }}>
                        Confiança: {CONFIANCA_LABEL[resultado.confianca] || resultado.confianca}
                      </span>
                    )}
                  </div>

                  {/* Fonte */}
                  {resultado.fonte && (
                    <div style={styles.campoBlock}>
                      <div style={styles.campoLabel}>Fonte</div>
                      <div style={styles.campoValor}>{resultado.fonte}</div>
                    </div>
                  )}

                  {/* Enunciado */}
                  <div style={styles.campoBlock}>
                    <div style={styles.campoLabel}>Enunciado</div>
                    <div style={{ ...styles.campoValor, fontWeight: 500 }}>{resultado.enunciado}</div>
                  </div>

                  {/* Alternativas */}
                  {resultado.alternativas?.length > 0 && (
                    <div style={styles.campoBlock}>
                      <div style={styles.campoLabel}>
                        Alternativas ({resultado.alternativas.length})
                        {resultado.gabarito && (
                          <span style={styles.gabaritoBadge}>Gabarito: {resultado.gabarito}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {resultado.alternativas.map((a) => {
                          const isGab = resultado.gabarito &&
                            a.letra.toUpperCase() === resultado.gabarito.toUpperCase();
                          return (
                            <div key={a.letra} style={{
                              ...styles.altRow,
                              ...(isGab ? styles.altRowCorreta : {}),
                            }}>
                              <span style={{
                                ...styles.altLetra,
                                ...(isGab ? { background: '#059669', color: '#fff' } : {}),
                              }}>{a.letra}</span>
                              <span>{a.texto}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {resultado.confianca === 'baixa' && (
                <div style={styles.alertAviso}>
                  ⚠️ Confiança baixa — a imagem pode estar desfocada ou parcialmente ilegível.
                  Revise cuidadosamente os dados antes de usar.
                </div>
              )}

              <div style={styles.footer}>
                <button style={styles.btnSecundario} onClick={resetar}>← Nova imagem</button>
                <button style={styles.btnPrimario} onClick={usar}>
                  ✅ Usar esta questão
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Estilos inline ─────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #0e7490, #0369a1)',
    flexShrink: 0,
  },
  headerIcon: { fontSize: '1.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '6px 10px' },
  headerTitle: { color: '#fff', fontWeight: 800, fontSize: '1rem' },
  headerSub:   { color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', marginTop: 2 },
  btnClose: {
    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
    color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 20, overflowY: 'auto', flex: 1 },

  // Upload
  dropZone: {
    border: '2px dashed #cbd5e1', borderRadius: 14, padding: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s',
    minHeight: 180,
  },
  dropZoneActive: { borderColor: '#0e7490', background: '#f0fdff' },
  dropZoneWithPreview: { padding: 8, border: '2px solid #0e7490', background: '#f0fdff' },
  dropText: { fontSize: '0.92rem', color: '#475569', marginBottom: 4 },
  dropLink: { color: '#0e7490', fontWeight: 700, textDecoration: 'underline' },
  dropSub:  { fontSize: '0.75rem', color: '#94a3b8' },
  previewImg: { width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 },
  btnTrocar: {
    marginTop: 8, background: 'none', border: '1px solid #cbd5e1',
    borderRadius: 8, padding: '4px 12px', fontSize: '0.78rem',
    color: '#64748b', cursor: 'pointer',
  },

  // Loading
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 },
  spinner: {
    width: 44, height: 44, border: '4px solid #e2e8f0',
    borderTop: '4px solid #0e7490', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingTitle: { fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' },
  loadingSub:   { fontSize: '0.82rem', color: '#64748b', textAlign: 'center', lineHeight: 1.5 },

  // Revisão
  revisaoGrid: { display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, marginBottom: 16 },
  revisaoImagem: { display: 'flex', flexDirection: 'column', gap: 6 },
  revisaoImg: { width: '100%', borderRadius: 10, border: '1.5px solid #e2e8f0', objectFit: 'contain', maxHeight: 380 },
  revisaoDados: { display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 420, paddingRight: 4 },
  revisaoLabel: {
    fontSize: '0.7rem', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  confiancaBadge: {
    fontSize: '0.68rem', fontWeight: 700,
    padding: '2px 8px', borderRadius: 99, border: '1px solid',
  },
  campoBlock: { background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0' },
  campoLabel: {
    fontSize: '0.7rem', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8,
  },
  campoValor: { fontSize: '0.88rem', color: '#0f172a', lineHeight: 1.5 },
  gabaritoBadge: {
    fontSize: '0.68rem', background: '#f0fdf4', color: '#059669',
    border: '1px solid #86efac', borderRadius: 99, padding: '1px 8px', fontWeight: 700,
  },
  altRow: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '5px 8px', borderRadius: 7,
    fontSize: '0.84rem', color: '#374151',
    background: '#fff', border: '1px solid #e2e8f0',
  },
  altRowCorreta: { background: '#f0fdf4', border: '1px solid #86efac' },
  altLetra: {
    flexShrink: 0, width: 22, height: 22, borderRadius: 6,
    background: '#e2e8f0', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem',
  },

  // Alertas
  alertErro:   { marginTop: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: '0.82rem', color: '#b91c1c' },
  alertAviso:  { marginTop: 4, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: '0.82rem', color: '#92400e' },

  // Footer
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' },
  btnPrimario: {
    background: '#0e7490', color: '#fff', border: 'none', borderRadius: 10,
    padding: '9px 20px', fontWeight: 700, fontSize: '0.88rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnSecundario: {
    background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0',
    borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: '0.85rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnDisabled: { background: '#94a3b8', cursor: 'not-allowed' },
};
