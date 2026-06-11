// src/features/questoes/components/LatexPreview.jsx
import React, { useMemo, useEffect, useRef } from 'react';

/**
 * Pré-visualização AO VIVO da questão com MathJax 3.
 * Fórmulas $...$ e \[...\] são renderizadas em tempo real.
 * Fallback: destaque em código se MathJax ainda não carregou.
 */

/** Dispara MathJax em um elemento específico */
function typesetElement(el) {
  if (!el) return;
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([el]).catch(() => {});
  }
}

/** Texto simples para fallback (antes do MathJax carregar) */
function TextoFallback({ text }) {
  if (!text) return null;
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      return (
        <code key={i} style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: '0.85em',
          background: '#f0f9ff',
          color: '#0369a1',
          padding: '1px 5px',
          borderRadius: 4,
          border: '1px solid #bae6fd',
        }}>
          {part}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function LatexPreview({ questao }) {
  const previewRef = useRef(null);

  // Re-tipeseta sempre que o enunciado ou alternativas mudam
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const timer = setTimeout(() => typesetElement(el), 120);
    return () => clearTimeout(timer);
  }, [questao?.enunciado, questao?.alternativas]);
  const { disciplina, tipo, nivel, serie, enunciado, alternativas = [], tags = [], habilidade_bncc, imagem } = questao;

  const hasContent = enunciado || alternativas.some(a => a.texto);
  const correta = alternativas.find(a => a.correta);

  const nivelLabel = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };
  const nivelColor = { facil: '#059669', medio: '#d97706', dificil: '#dc2626', enem: '#7c3aed' };
  const tipoLabel  = {
    objetiva: 'Objetiva', discursiva: 'Discursiva',
    verdadeiro_falso: 'V/F', associacao: 'Associação', lacuna: 'Lacuna',
  };

  return (
    <div className="bq-preview-panel" ref={previewRef}>
      <div className="bq-preview-header">
        <span className="bq-preview-title">👁️ Pré-visualização</span>
        <span className="bq-preview-pill">AO VIVO</span>
      </div>

      <div className="bq-preview-body">
        {/* Meta badges */}
        <div className="bq-preview-meta">
          {disciplina && (
            <span className="bq-badge bq-badge-disc">{disciplina}</span>
          )}
          {tipo && (
            <span className="bq-badge bq-badge-tipo">{tipoLabel[tipo] || tipo}</span>
          )}
          {nivel && (
            <span className="bq-badge" style={{
              background: `${nivelColor[nivel]}18`,
              color: nivelColor[nivel],
            }}>
              {nivelLabel[nivel] || nivel}
            </span>
          )}
          {serie && (
            <span className="bq-badge" style={{ background: '#f5f3ff', color: '#7c3aed' }}>{serie}</span>
          )}
          {habilidade_bncc && (
            <span className="bq-badge" style={{ background: '#fff7ed', color: '#c2410c' }}>
              {habilidade_bncc}
            </span>
          )}
        </div>

        {hasContent ? (
          <>
            {/* Número e linha decorativa */}
            <div className="bq-preview-questao-num">QUESTÃO 1</div>

            {/* Enunciado — MathJax renderiza $...$ automaticamente via typesetPromise */}
            {enunciado && (
              <p className="bq-preview-enunciado">
                {enunciado}
              </p>
            )}

            {/* Imagem */}
            {imagem && (
              <img
                src={imagem}
                alt="Imagem da questão"
                style={{
                  maxWidth: '100%',
                  maxHeight: 160,
                  objectFit: 'contain',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginBottom: 12,
                  display: 'block',
                }}
              />
            )}

            {/* Alternativas */}
            {tipo === 'objetiva' && alternativas.some(a => a.texto) && (
              <ul className="bq-preview-alts">
                {alternativas.filter(a => a.texto).map(alt => (
                  <li key={alt.id} className={`bq-preview-alt${alt.correta ? ' correct' : ''}`}>
                    <span className="bq-preview-alt-letra">({alt.letra})</span>
                    <span>{alt.texto}</span>
                    {alt.correta && (
                      <span style={{ marginLeft: 6, fontSize: '0.75rem' }}>✓</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {tipo === 'verdadeiro_falso' && (
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                {['Verdadeiro', 'Falso'].map(v => (
                  <span key={v} style={{
                    padding: '4px 14px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 99,
                    fontSize: '0.82rem',
                    color: '#475569',
                  }}>
                    ( ) {v}
                  </span>
                ))}
              </div>
            )}

            {tipo === 'discursiva' && (
              <div style={{
                marginTop: 10,
                border: '1px dashed #cbd5e1',
                borderRadius: 6,
                padding: '10px 12px',
                color: '#94a3b8',
                fontSize: '0.78rem',
              }}>
                ✏️ Espaço para resposta discursiva
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {tags.map(t => (
                  <span key={t} className="bq-tag-chip">{t}</span>
                ))}
              </div>
            )}

            {/* Gabarito */}
            {correta && (
              <div style={{
                marginTop: 14,
                padding: '6px 12px',
                background: '#ecfdf5',
                border: '1px solid #6ee7b7',
                borderRadius: 6,
                fontSize: '0.78rem',
                color: '#065f46',
                fontWeight: 700,
              }}>
                ✅ Gabarito: ({correta.letra}) {correta.texto ? `— ${correta.texto.substring(0, 40)}${correta.texto.length > 40 ? '...' : ''}` : ''}
              </div>
            )}

            {/* LaTeX gerado */}
            <LatexCode questao={questao} />
          </>
        ) : (
          <div className="bq-preview-empty">
            <div className="bq-preview-empty-icon">📝</div>
            <p>Preencha os campos ao lado<br />para ver a pré-visualização</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Sub-componente: mostra o código LaTeX gerado automaticamente */
function LatexCode({ questao }) {
  const latex = useMemo(() => gerarLatex(questao), [questao]);

  if (!questao.enunciado && !questao.alternativas?.some(a => a.texto)) return null;

  return (
    <div className="bq-latex-block" style={{ marginTop: 16 }}>
      <div className="bq-latex-title">LaTeX gerado</div>
      <pre className="bq-latex-code">{latex}</pre>
    </div>
  );
}

/** Gera LaTeX com base nos dados do formulário */
export function gerarLatex(questao) {
  const {
    disciplina = '',
    enunciado = '',
    alternativas = [],
    tipo = 'objetiva',
    nivel = '',
    habilidade_bncc = '',
  } = questao;

  const nivelLabel = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };

  let latex = '';
  latex += `\\noindent\n`;
  latex += `\\textbf{QUESTÃO} {\\color{orange}\\rule{7.5cm}{0.4pt}}\n\n`;

  if (habilidade_bncc) {
    latex += `% Habilidade BNCC: ${habilidade_bncc}\n`;
  }

  if (enunciado) {
    latex += `${enunciado}\n\n`;
  }

  if (tipo === 'objetiva' && alternativas.some(a => a.texto)) {
    const altsValidas = alternativas.filter(a => a.texto);
    if (altsValidas.length <= 3) {
      latex += `\\begin{tasks}(${altsValidas.length})\n`;
      altsValidas.forEach(alt => {
        latex += `  \\task (${alt.letra}) ${alt.texto}\n`;
      });
      latex += `\\end{tasks}\n`;
    } else {
      latex += `\\begin{enumerate}[label=\\textbf{(\\Alph*)}]\n`;
      altsValidas.forEach(alt => {
        latex += `  \\item ${alt.texto}\n`;
      });
      latex += `\\end{enumerate}\n`;
    }
  }

  if (tipo === 'discursiva') {
    latex += `\\begin{center}\n`;
    latex += `  \\underline{\\hspace{\\linewidth}}\n`;
    latex += `  \\underline{\\hspace{\\linewidth}}\n`;
    latex += `  \\underline{\\hspace{\\linewidth}}\n`;
    latex += `\\end{center}\n`;
  }

  latex += `\\vspace{0.4cm}\n`;
  return latex;
}
