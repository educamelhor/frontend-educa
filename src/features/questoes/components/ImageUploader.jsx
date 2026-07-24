// src/features/questoes/components/ImageUploader.jsx
// Upload de imagem via DO Spaces — retorna URL pública em vez de Base64
import React, { useRef, useState } from 'react';
import api from '../../../services/api';

export default function ImageUploader({ value, onChange }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState(null);

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      setErro('Arquivo muito grande. Máximo 10 MB.');
      return;
    }

    // Preview local imediato para UX (sem esperar o upload)
    const previewUrl = URL.createObjectURL(file);
    onChange(previewUrl); // mostra preview local enquanto faz upload

    setUploading(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append('imagem', file);

      const { data } = await api.post('/questoes/upload-imagem', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Substitui preview local pela URL permanente do Spaces
      URL.revokeObjectURL(previewUrl);
      onChange(data.url);
    } catch (err) {
      console.error('[ImageUploader] Erro no upload:', err);
      setErro('Erro ao enviar imagem. Tente novamente.');
      onChange(null);
      URL.revokeObjectURL(previewUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleChange = (e) => processFile(e.target.files[0]);

  if (value) {
    return (
      <div className="bq-img-preview">
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)', borderRadius: 8, color: '#fff',
            fontSize: '0.85rem', gap: 8, zIndex: 2,
          }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span> Enviando...
          </div>
        )}
        <img src={value} alt="Preview da questão" style={{ opacity: uploading ? 0.5 : 1 }} />
        <button
          type="button"
          className="bq-img-preview-remove"
          onClick={() => { onChange(null); setErro(null); }}
          title="Remover imagem"
          disabled={uploading}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`bq-img-drop${dragging ? ' dragging' : ''}${uploading ? ' uploading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{ cursor: uploading ? 'wait' : 'pointer' }}
      >
        <div className="bq-img-drop-icon">{uploading ? '⏳' : '🖼️'}</div>
        <p>
          <strong>{uploading ? 'Enviando...' : 'Clique para selecionar'}</strong>
          {!uploading && ' ou arraste a imagem aqui'}
        </p>
        <p style={{ marginTop: 4, fontSize: '0.74rem' }}>PNG, JPG, WEBP — Máx. 10 MB</p>
        {erro && (
          <p style={{ marginTop: 4, fontSize: '0.74rem', color: '#e74c3c' }}>⚠️ {erro}</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </>
  );
}
