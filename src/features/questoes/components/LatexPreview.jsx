// src/features/questoes/components/LatexPreview.jsx
// Pré-visualização AO VIVO em padrão A4 + KaTeX + Smart Media + todos os 7 modelos

import React, { useMemo } from 'react';
import {
  TIPO_META,
  QuestaoCorpoEstruturado,
  MathText,
  resumirGabaritoQuestao,
} from '../utils/questaoRenderer';

export default function LatexPreview({ questao, codigo }) {
  const {
    disciplina,
    tipo = 'objetiva',
    nivel,
    serie,
    enunciado,
    comando_final,
    texto_apoio,
    fonte,
    alternativas = [],
    estrutura,
    midia,
    imagem,
    tags = [],
    temas = [],
    habilidade_bncc,
    explicacao,
  } = questao;

  const hasContent = Boolean(
    enunciado || comando_final || texto_apoio || imagem || midia?.url ||
    alternativas.some(a => a.texto || a.imagem_url) ||
    (estrutura?.proposicoes || []).some(p => p.texto) ||
    (estrutura?.itens || []).some(i => i.texto) ||
    (estrutura?.coluna_a || []).some(c => c.texto)
  );

  const nivelLabel = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };
  const nivelColor = { facil: '#059669', medio: '#d97706', dificil: '#dc2626', enem: '#7c3aed' };
  const gabaritoResumo = resumirGabaritoQuestao(questao);

  return (
    <div className="bq-preview-panel">
      <div className="bq-preview-header">
        <span className="bq-preview-title">👁️ Espelho Editorial A4</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {codigo && (
            <span style={{
              fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 800,
              padding: '2px 8px', borderRadius: 6, background: '#0f172a', color: '#38bdf8',
            }}>
              {codigo}
            </span>
          )}
          <span className="bq-preview-pill">KA-TEX LIVE</span>
        </div>
      </div>

      <div className="bq-preview-body">
        {/* Meta badges */}
        <div className="bq-preview-meta">
          {disciplina && <span className="bq-badge bq-badge-disc">{disciplina}</span>}
          {tipo && (
            <span className="bq-badge bq-badge-tipo">
              {TIPO_META[tipo]?.emoji} {TIPO_META[tipo]?.short || tipo}
            </span>
          )}
          {nivel && (
            <span className="bq-badge" style={{ background: `${nivelColor[nivel]}18`, color: nivelColor[nivel] }}>
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
            <div className="bq-preview-questao-num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>QUESTÃO 01 {fonte && !texto_apoio ? <span style={{ fontWeight: 600, fontSize: '0.76rem', color: '#64748b' }}>({fonte})</span> : null}</span>
              {codigo && <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#64748b' }}>{codigo}</span>}
            </div>

            {/* Anatomia completa e fiel da questão */}
            <QuestaoCorpoEstruturado questao={questao} showGabarito={true} />

            {/* Temas & Tags */}
            {(temas.length > 0 || tags.length > 0) && (
              <div style={{ marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {temas.map(t => (
                  <span key={`tm-${t}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                    📌 {t}
                  </span>
                ))}
                {tags.map(t => (
                  <span key={`tg-${t}`} className="bq-tag-chip">{t}</span>
                ))}
              </div>
            )}

            {/* Gabarito Resumido */}
            {gabaritoResumo && gabaritoResumo !== '—' && (
              <div style={{
                marginTop: 12, padding: '7px 12px', background: '#ecfdf5',
                border: '1px solid #6ee7b7', borderRadius: 8,
                fontSize: '0.78rem', color: '#065f46', fontWeight: 700,
              }}>
                ✅ Gabarito Oficial: {gabaritoResumo}
              </div>
            )}

            {/* Resolução comentada */}
            {explicacao && (
              <div style={{
                marginTop: 8, padding: '8px 12px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderLeft: '3px solid #0e7490', borderRadius: 8,
                fontSize: '0.76rem', color: '#334155', lineHeight: 1.55,
              }}>
                <div style={{ fontWeight: 800, color: '#0e7490', marginBottom: 3, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  💡 Resolução Comentada (Professor)
                </div>
                <MathText text={explicacao} />
              </div>
            )}

            <LatexCode questao={questao} />
          </>
        ) : (
          <div className="bq-preview-empty">
            <div className="bq-preview-empty-icon">🧩</div>
            <p>Monte a questão ao lado ou clone um print (Ctrl+V)<br />para visualizar o espelho editorial em tempo real</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LatexCode({ questao }) {
  const latex = useMemo(() => gerarLatex(questao), [questao]);
  if (!questao.enunciado && !questao.alternativas?.some(a => a.texto)) return null;

  return (
    <details style={{ marginTop: 14 }}>
      <summary style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
        &lt;/&gt; Ver código LaTeX gerado (Tectonic)
      </summary>
      <div className="bq-latex-block" style={{ marginTop: 6 }}>
        <pre className="bq-latex-code">{latex}</pre>
      </div>
    </details>
  );
}

function converterMarkdownEditorialParaLatex(raw = '') {
  if (!raw) return '';
  const segs = String(raw).split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
  return segs
    .map((seg) => {
      if (seg.startsWith('$')) return seg;
      return seg
        .replace(/\*\*([\s\S]+?)\*\*/g, '\\textbf{$1}')
        .replace(/__([^\s_](?:[\s\S]*?[^\s_])?)__/g, '\\underline{$1}')
        .replace(/\*([^\s*](?:[^*\n]*?[^\s*])?)\*/g, '\\textit{$1}');
    })
    .join('');
}

export function gerarLatex(questao) {
  const {
    enunciado = '',
    comando_final = '',
    texto_apoio = '',
    fonte = '',
    alternativas = [],
    estrutura = {},
    midia = null,
    tipo = 'objetiva',
    habilidade_bncc = '',
  } = questao;

  let latex = `\\noindent\n\\textbf{QUESTÃO}${fonte && !texto_apoio ? ` (${fonte})` : ''} {\\color{orange}\\rule{7.5cm}{0.4pt}}\n\n`;
  if (habilidade_bncc) latex += `% BNCC: ${habilidade_bncc}\n`;
  if (texto_apoio) latex += `\\begin{quote}\\itshape ${converterMarkdownEditorialParaLatex(texto_apoio)}${fonte ? ` — ${fonte}` : ''}\\end{quote}\n\n`;
  if (enunciado) latex += `${converterMarkdownEditorialParaLatex(enunciado)}\n\n`;
  if (midia?.url || questao.imagem) {
    const w = { P: '0.36\\linewidth', M: '0.56\\linewidth', G: '0.84\\linewidth', '100%': '0.98\\linewidth' }[midia?.preset] || '0.56\\linewidth';
    latex += `\\begin{center}\\includegraphics[width=${w}]{figura.jpg}\\end{center}\n\n`;
  }
  if (comando_final) latex += `\\textbf{${converterMarkdownEditorialParaLatex(comando_final)}}\n\n`;

  const altsValidas = alternativas.filter(a => a.texto?.trim());
  if (tipo === 'afirmativas') {
    (estrutura.proposicoes || []).filter(p => p.texto?.trim()).forEach(p => {
      latex += `\\noindent \\textbf{${p.romano}.} ${converterMarkdownEditorialParaLatex(p.texto)}\\\\\n`;
    });
    if (estrutura.comando_fechamento) latex += `\\textbf{${converterMarkdownEditorialParaLatex(estrutura.comando_fechamento)}}\n\n`;
  } else if (tipo === 'verdadeiro_falso') {
    (estrutura.itens || []).filter(i => i.texto?.trim()).forEach(i => {
      latex += `\\noindent (\\hspace{0.4cm}) ${converterMarkdownEditorialParaLatex(i.texto)}\\\\\n`;
    });
  } else if (tipo === 'somatoria') {
    (estrutura.proposicoes || []).filter(p => p.texto?.trim()).forEach(p => {
      latex += `\\noindent \\textbf{(${p.codigo})} ${converterMarkdownEditorialParaLatex(p.texto)}\\\\\n`;
    });
    latex += `\\begin{flushright}\\textbf{SOMA:} \\framebox[1.4cm]{\\rule{0pt}{0.4cm}}\\end{flushright}\n`;
  } else if (tipo === 'discursiva') {
    const n = Number(estrutura.linhas_resposta) || 5;
    for (let i = 0; i < n; i++) latex += `\\noindent\\underline{\\hspace{\\linewidth}}\\\\\n`;
  }

  if (['objetiva', 'afirmativas'].includes(tipo) || estrutura?.submodo === 'sequencia' || estrutura?.submodo === 'alternativas') {
    if (altsValidas.length > 0) {
      latex += `\\begin{enumerate}[label=\\textbf{(\\Alph*)}]\n`;
      altsValidas.forEach(alt => { latex += `  \\item ${converterMarkdownEditorialParaLatex(alt.texto)}\n`; });
      latex += `\\end{enumerate}\n`;
    }
  }

  latex += `\\vspace{0.4cm}\n`;
  return latex;
}
