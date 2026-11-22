// src/features/questoes/components/TextoApoioToolbar.jsx
// Barra editorial dedicada para Texto de Apoio (Título, Subtítulo, Negrito, Itálico, Sublinhado, Parágrafos, LaTeX e Estruturação IA)

import React, { useState } from 'react';
import api from '../../../services/api';

export default function TextoApoioToolbar({
  textareaRef,
  value = '',
  disciplina = '',
  fonteAtual = '',
  onChange,
  onExtractedFonte = null,
}) {
  const [formattingIA, setFormattingIA] = useState(false);

  const wrapSelection = (marker, placeholder = 'trecho') => {
    const el = textareaRef?.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end);
      const inner = selected || placeholder;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const next = `${before}${marker}${inner}${marker}${after}`;
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + marker.length, start + marker.length + inner.length);
      });
    } else {
      onChange(`${value}${value && !value.endsWith(' ') ? ' ' : ''}${marker}${placeholder}${marker}`);
    }
  };

  const togglePrefixoLinha = (prefix, placeholder) => {
    const el = textareaRef?.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEndIdx = value.indexOf('\n', start);
      const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
      const linhaAtual = value.slice(lineStart, lineEnd);
      const semPrefixo = linhaAtual.replace(/^#{1,3}\s+/, '');
      const jaTinhaEste = linhaAtual.startsWith(`${prefix} `);
      const novaLinha = jaTinhaEste ? semPrefixo : `${prefix} ${semPrefixo || placeholder}`;
      const next = `${value.slice(0, lineStart)}${novaLinha}${value.slice(lineEnd)}`;
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = lineStart + novaLinha.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      const prefixBlock = `${prefix} ${placeholder}\n\n`;
      onChange(value ? `${prefixBlock}${value}` : `${prefix} ${placeholder}`);
    }
  };

  const inserirQuebraParagrafo = () => {
    const el = textareaRef?.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = `${value.slice(0, start)}\n\n${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + 2, start + 2);
      });
    } else {
      onChange(`${value}\n\n`);
    }
  };

  const estruturarComIA = async () => {
    if (!value?.trim() || formattingIA) return;
    setFormattingIA(true);
    try {
      const { data } = await api.post('/api/questoes/copiloto-ia', {
        acao: 'formatar_texto_apoio',
        texto: value,
        disciplina,
      });
      if (data?.texto_formatado) {
        onChange(data.texto_formatado);
      }
      if (data?.fonte_extraida && !fonteAtual?.trim() && onExtractedFonte) {
        onExtractedFonte(data.fonte_extraida);
      }
    } catch {
      // mantém texto atual caso haja falha de rede
    } finally {
      setFormattingIA(false);
    }
  };

  const btnStyle = {
    padding: '2px 7px',
    borderRadius: 5,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1.4,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      padding: '5px 8px',
      background: '#f8fafc',
      border: '1px solid #cbd5e1',
      borderBottom: 'none',
      borderRadius: '8px 8px 0 0',
    }}>
      <button
        type="button"
        title="Transforma a linha atual em Título do texto de apoio (# Título)"
        onClick={() => togglePrefixoLinha('#', 'Título do texto')}
        style={{ ...btnStyle, fontWeight: 800, color: '#0e7490' }}
      >
        H1 Título
      </button>
      <button
        type="button"
        title="Transforma a linha atual em Subtítulo / Linha fina (## Subtítulo)"
        onClick={() => togglePrefixoLinha('##', 'Subtítulo')}
        style={{ ...btnStyle, fontStyle: 'italic', color: '#334155' }}
      >
        H2 Subtítulo
      </button>
      <button
        type="button"
        title="Negrito (**trecho**)"
        onClick={() => wrapSelection('**', 'negrito')}
        style={{ ...btnStyle, fontWeight: 900 }}
      >
        B
      </button>
      <button
        type="button"
        title="Itálico (*trecho*)"
        onClick={() => wrapSelection('*', 'itálico')}
        style={{ ...btnStyle, fontStyle: 'italic', fontFamily: "'Times New Roman', serif" }}
      >
        I
      </button>
      <button
        type="button"
        title="Sublinhado (__trecho__) — ideal p/ termos grifados em Português, Inglês e Espanhol"
        onClick={() => wrapSelection('__', 'sublinhado')}
        style={{ ...btnStyle, textDecoration: 'underline' }}
      >
        S
      </button>
      <button
        type="button"
        title="Separar novo parágrafo ou estrofe (linha em branco dupla)"
        onClick={inserirQuebraParagrafo}
        style={btnStyle}
      >
        ¶ Parágrafo
      </button>
      <button
        type="button"
        title="Fórmula matemática inline ($...$)"
        onClick={() => wrapSelection('$', 'x^2')}
        style={{ ...btnStyle, fontFamily: "'Cambria Math', serif" }}
      >
        $x²$
      </button>

      <button
        type="button"
        onClick={estruturarComIA}
        disabled={formattingIA || !value?.trim()}
        title="Identifica automaticamente Título, Subtítulo, Parágrafos/Estrofes e destaques sem alterar as palavras do texto"
        style={{
          marginLeft: 'auto',
          padding: '3px 9px',
          borderRadius: 6,
          border: '1px solid #bae6fd',
          background: '#e0f2fe',
          color: '#0369a1',
          fontSize: '0.7rem',
          fontWeight: 800,
          cursor: (formattingIA || !value?.trim()) ? 'not-allowed' : 'pointer',
          opacity: !value?.trim() ? 0.55 : 1,
        }}
      >
        {formattingIA ? '⏳ Estruturando...' : '✨ Estruturar Texto IA'}
      </button>
    </div>
  );
}
