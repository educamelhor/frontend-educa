// src/features/questoes/components/ImageUploader.jsx
import React, { useRef, useState } from 'react';

export default function ImageUploader({ value, onChange }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
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
        <img src={value} alt="Preview da questão" />
        <button
          type="button"
          className="bq-img-preview-remove"
          onClick={() => onChange(null)}
          title="Remover imagem"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`bq-img-drop${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="bq-img-drop-icon">🖼️</div>
        <p><strong>Clique para selecionar</strong> ou arraste a imagem aqui</p>
        <p style={{ marginTop: 4, fontSize: '0.74rem' }}>PNG, JPG, WEBP — Máx. 5 MB</p>
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
