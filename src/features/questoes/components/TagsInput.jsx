// src/features/questoes/components/TagsInput.jsx
import React, { useState } from 'react';

const SUGESTOES = [
  'álgebra', 'funções', 'geometria', 'trigonometria', 'estatística',
  'probabilidade', 'equações', 'inequações', 'matrizes', 'vetores',
  'leitura', 'interpretação', 'gramática', 'redação', 'literatura',
  'fotossíntese', 'ecossistemas', 'células', 'genética', 'evolução',
  'segunda guerra', 'brasil colônia', 'revolução industrial',
  'cartografia', 'clima', 'biomas', 'urbanização',
  'ENEM', 'SAEB', 'vestibular', 'fácil', 'médio', 'difícil',
];

export default function TagsInput({ tags = [], onChange }) {
  const [input, setInput] = useState('');
  const [showSugest, setShowSugest] = useState(false);

  const sugestoesFiltradas = input.length >= 1
    ? SUGESTOES.filter(s =>
        s.toLowerCase().includes(input.toLowerCase()) &&
        !tags.includes(s)
      ).slice(0, 6)
    : [];

  const addTag = (tag) => {
    const clean = tag.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      onChange([...tags, clean]);
    }
    setInput('');
    setShowSugest(false);
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
    if (e.key === 'Escape') setShowSugest(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="bq-tags-container"
        onClick={() => document.getElementById('bq-tag-input')?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="bq-tag">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              title="Remover tag"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="bq-tag-input"
          className="bq-tag-input"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSugest(true); }}
          onKeyDown={handleKey}
          onFocus={() => setShowSugest(true)}
          onBlur={() => setTimeout(() => setShowSugest(false), 150)}
          placeholder={tags.length === 0 ? 'Digite e pressione Enter...' : ''}
          autoComplete="off"
        />
      </div>

      {showSugest && sugestoesFiltradas.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {sugestoesFiltradas.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => addTag(s)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 14px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: '0.84rem',
                color: '#334155',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.target.style.background = '#f1f5f9'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <p className="bq-helper">Pressione Enter ou vírgula para adicionar. Clique no ✕ para remover.</p>
    </div>
  );
}
