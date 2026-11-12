// src/features/questoes/components/MathToolbar.jsx
// Barra rápida de inserção de fórmulas LaTeX / Química com 1 clique

import React from 'react';

const SNIPPETS = [
  { label: 'a/b',    title: 'Fração',             tex: '$\\frac{a}{b}$' },
  { label: '√x',     title: 'Raiz quadrada',      tex: '$\\sqrt{x}$' },
  { label: 'x²',     title: 'Potência / Expoente', tex: '$x^{2}$' },
  { label: 'xₙ',     title: 'Índice subscrito',   tex: '$x_{1}$' },
  { label: 'H₂O',    title: 'Fórmula Química',    tex: '$\\text{H}_2\\text{O}$' },
  { label: '→',      title: 'Reação / Implica',   tex: '$\\rightarrow$' },
  { label: '⇌',      title: 'Equilíbrio Químico', tex: '$\\rightleftharpoons$' },
  { label: 'v⃗',     title: 'Vetor',              tex: '$\\vec{v}$' },
  { label: 'Δ',      title: 'Delta',              tex: '$\\Delta$' },
  { label: 'π',      title: 'Pi',                 tex: '$\\pi$' },
  { label: 'θ',      title: 'Theta / Ângulo',     tex: '$\\theta$' },
  { label: '≤',      title: 'Menor ou igual',     tex: '$\\leq$' },
  { label: '≥',      title: 'Maior ou igual',     tex: '$\\geq$' },
  { label: '≠',      title: 'Diferente',          tex: '$\\neq$' },
  { label: '±',      title: 'Mais ou menos',      tex: '$\\pm$' },
  { label: '×10ⁿ',   title: 'Notação científica', tex: '$1,5 \\times 10^{3}$' },
];

export default function MathToolbar({ textareaRef, value = '', onChange, onConvertLatex, convertingLatex = false }) {
  const insertSnippet = (tex) => {
    const el = textareaRef?.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end   = el.selectionEnd;
      const before = value.slice(0, start);
      const after  = value.slice(end);
      const next = `${before}${tex}${after}`;
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + tex.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      onChange(`${value}${value && !value.endsWith(' ') ? ' ' : ''}${tex}`);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
      padding: '6px 8px', background: '#f8fafc',
      border: '1px solid #e2e8f0', borderBottom: 'none',
      borderRadius: '8px 8px 0 0',
    }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', marginRight: 4, textTransform: 'uppercase' }}>
        ∑ Fórmulas:
      </span>
      {SNIPPETS.map((s) => (
        <button
          key={s.label}
          type="button"
          title={`${s.title} (${s.tex})`}
          onClick={() => insertSnippet(s.tex)}
          style={{
            padding: '2px 7px', borderRadius: 5,
            border: '1px solid #cbd5e1', background: '#fff',
            color: '#0f172a', fontSize: '0.74rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Cambria Math', serif",
            lineHeight: 1.4,
          }}
        >
          {s.label}
        </button>
      ))}

      {onConvertLatex && (
        <button
          type="button"
          onClick={onConvertLatex}
          disabled={convertingLatex || !value?.trim()}
          title="Converte fórmulas digitadas informalmente (ex: x^2, H2SO4) para LaTeX profissional"
          style={{
            marginLeft: 'auto', padding: '3px 9px', borderRadius: 6,
            border: '1px solid #bae6fd', background: '#e0f2fe',
            color: '#0369a1', fontSize: '0.7rem', fontWeight: 700,
            cursor: (convertingLatex || !value?.trim()) ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: !value?.trim() ? 0.55 : 1,
          }}
        >
          {convertingLatex ? '⏳ Formatando...' : '✨ Formatar LaTeX IA'}
        </button>
      )}
    </div>
  );
}
