// src/features/questoes/utils/questaoRenderer.jsx
// Motor universal de renderização das questões EDUCA.STUDIO AI (7 modelos + KaTeX + Smart Media)

import React, { useState, useEffect } from 'react';

export const TIPO_META = {
  objetiva:         { label: 'Múltipla Escolha', short: 'Objetiva',    emoji: '🔘' },
  afirmativas:      { label: 'Afirmativas (I, II, III)', short: 'Afirmativas', emoji: '🔢' },
  verdadeiro_falso: { label: 'Verdadeiro ou Falso', short: 'V / F',    emoji: '⚖️' },
  associacao:       { label: 'Associação de Colunas', short: 'Colunas', emoji: '🔗' },
  lacuna:           { label: 'Completar Lacunas', short: 'Lacunas',    emoji: '📝' },
  discursiva:       { label: 'Aberta / Discursiva', short: 'Discursiva', emoji: '✏️' },
  somatoria:        { label: 'Somatória (01, 02, 04...)', short: 'Somatória', emoji: '➕' },
};

export function parseJsonSafe(raw, fallback = null) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function criarEstruturaInicial(tipo) {
  switch (tipo) {
    case 'afirmativas':
      return {
        modelo: 'afirmativas',
        proposicoes: [
          { id: 1, romano: 'I', texto: '', correta: true },
          { id: 2, romano: 'II', texto: '', correta: false },
          { id: 3, romano: 'III', texto: '', correta: true },
        ],
        comando_fechamento: 'É correto apenas o que se afirma em:',
      };
    case 'verdadeiro_falso':
      return {
        modelo: 'verdadeiro_falso',
        submodo: 'direto', // 'direto' | 'sequencia'
        rotulo: 'VF',      // 'VF' | 'CE'
        exigir_justificativa_falsas: false,
        linhas_justificativa: 3,
        itens: [
          { id: 1, texto: '', gabarito: 'V' },
          { id: 2, texto: '', gabarito: 'F' },
          { id: 3, texto: '', gabarito: 'V' },
          { id: 4, texto: '', gabarito: 'F' },
        ],
      };
    case 'associacao':
      return {
        modelo: 'associacao',
        submodo: 'direto', // 'direto' | 'sequencia'
        titulo_coluna_a: 'Coluna A',
        titulo_coluna_b: 'Coluna B',
        coluna_a: [
          { id: 1, codigo: '1', texto: '' },
          { id: 2, codigo: '2', texto: '' },
          { id: 3, codigo: '3', texto: '' },
        ],
        coluna_b: [
          { id: 101, texto: '', vinculo_codigo: '2' },
          { id: 102, texto: '', vinculo_codigo: '1' },
          { id: 103, texto: '', vinculo_codigo: '3' },
        ],
      };
    case 'lacuna':
      return {
        modelo: 'lacuna',
        submodo: 'direto', // 'direto' | 'banco_palavras' | 'alternativas'
        lacunas: [],
        distratores_banco: [],
      };
    case 'somatoria':
      return {
        modelo: 'somatoria',
        proposicoes: [
          { valor: 1,  codigo: '01', texto: '', correta: true },
          { valor: 2,  codigo: '02', texto: '', correta: false },
          { valor: 4,  codigo: '04', texto: '', correta: true },
          { valor: 8,  codigo: '08', texto: '', correta: false },
          { valor: 16, codigo: '16', texto: '', correta: false },
        ],
        soma_correta: 5,
      };
    case 'discursiva':
      return {
        modelo: 'discursiva',
        formato_espaco: 'linhas', // 'linhas' | 'quadro_calculo' | 'nenhum'
        linhas_resposta: 6,
        altura_quadro_px: 140,
      };
    default:
      return {
        modelo: 'objetiva',
        layout_alternativas: 'lista',
      };
  }
}

/* ── Normalizador defensivo de escapes LaTeX (cura \t->\text, \f->\frac, \b->\beta, cursor Word e \text{} solto) ── */
export function normalizarTextoLatex(raw = '') {
  if (!raw) return '';
  let s = String(raw);
  s = s.replace(/\x08/g, '\\b').replace(/\x0c/g, '\\f');
  s = s.replace(/\x09(?=(?:ext|imes|heta|au\b|an\b|anh\b|o\b|op\b|riangle|ilde|frac|herefore|hickapprox|iny))/g, '\\t');
  s = s.replace(/\r(?!\n)(?=(?:ight|ho\b|angle|ceil|floor|aise))/g, '\\r');
  // Casar $$...$$ ANTES de $...$ na mesma passada p/ nunca deslocar delimitadores
  s = s.replace(/\$\$([^$]+)\$\$|\$([^$]+)\$/g, (_full, dispInner, inlInner) => {
    const isDisp = dispInner !== undefined;
    const inner = isDisp ? dispInner : inlInner;
    const fixed = inner
      .replace(/\x09/g, '\\t')
      .replace(/\r(?!\n)/g, '\\r')
      .replace(/\n(?=(?:abla|eq\b|u\b|otin|eg\b|atural|leq|geq|mid\b|parallel|sim\b|cong))/g, '\\n');
    return isDisp ? `$$${fixed}$$` : `$${fixed}$`;
  });
  const segs = s.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
  return segs
    .map((seg) => {
      if (seg.startsWith('$')) return seg;
      return seg
        .replace(/([a-zà-ÿ])\|([a-zà-ÿ])/g, '$1$2')
        .replace(/([A-Za-zÀ-ÿ0-9)\]])\|(?=\s|$|[.,;:!?])/g, '$1')
        .replace(
          /(?:-\s*)?(?:(?:\\(?:text|mathrm|mathbf)\{[^{}]+\}|\\frac\{[^{}]+\}\{[^{}]+\}|\\sqrt\{[^{}]+\})(?:[_^](?:\{[^{}]+\}|[A-Za-z0-9+-]+))*)+(?:\s*(?:[-+=→⇌]|\\rightarrow)\s*(?:(?:\\(?:text|mathrm|mathbf)\{[^{}]+\}|\\frac\{[^{}]+\}\{[^{}]+\})(?:[_^](?:\{[^{}]+\}|[A-Za-z0-9+-]+))*)+)*/g,
          (m) => `$${m.trim()}$`
        );
    })
    .join('');
}

function renderLinhasComItalico(plainStr = '', keyPrefix = 'txt') {
  if (!plainStr) return null;
  const lines = String(plainStr).split('\n');
  return lines.map((ln, li) => {
    const italicParts = ln.split(/(\*[^\s*](?:[^*\n]*?[^\s*])?\*)/g);
    return (
      <React.Fragment key={`${keyPrefix}-l${li}`}>
        {italicParts.map((ip, ii) => {
          if (ip.length >= 3 && ip.startsWith('*') && ip.endsWith('*') && !ip.startsWith('**')) {
            return <em key={ii}>{ip.slice(1, -1)}</em>;
          }
          return <React.Fragment key={ii}>{ip}</React.Fragment>;
        })}
        {li < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

/* ── Renderização Matemática Real via KaTeX + Destaques Editoriais (**negrito**, *itálico*, __sublinhado__) ── */
export function MathText({ text = '', style, className }) {
  const [katexReady, setKatexReady] = useState(() => typeof window !== 'undefined' && Boolean(window.katex));

  useEffect(() => {
    if (katexReady || typeof window === 'undefined') return;
    const timer = setInterval(() => {
      if (window.katex) {
        setKatexReady(true);
        clearInterval(timer);
      }
    }, 300);
    const stop = setTimeout(() => clearInterval(timer), 8000);
    return () => { clearInterval(timer); clearTimeout(stop); };
  }, [katexReady]);

  if (!text) return null;
  const str = normalizarTextoLatex(text)
    .replace(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/gi, '**$1**')
    .replace(/<(?:i|em)>([\s\S]*?)<\/(?:i|em)>/gi, '*$1*')
    .replace(/<u>([\s\S]*?)<\/u>/gi, '__$1__');

  const renderInlineKatex = (expr, key) => {
    if (katexReady && window.katex) {
      try {
        const html = window.katex.renderToString(expr, {
          displayMode: false,
          throwOnError: false,
          strict: 'ignore',
        });
        return <span key={key} dangerouslySetInnerHTML={{ __html: html }} />;
      } catch {
        // fallback abaixo
      }
    }
    return (
      <code
        key={key}
        style={{
          fontFamily: "'Cambria Math', 'Times New Roman', serif",
          fontStyle: 'italic',
          background: '#f0f9ff',
          color: '#0369a1',
          padding: '1px 5px',
          borderRadius: 4,
        }}
      >
        {expr}
      </code>
    );
  };

  const renderInlineSegment = (segment, keyPrefix, depth = 0) => {
    if (!segment) return null;
    if (depth > 2) return renderLinhasComItalico(segment, keyPrefix);

    const tokens = segment.split(/(\*\*[\s\S]+?\*\*|__[^\s_](?:[\s\S]*?[^\s_])?__|\$[^$]+\$)/g);
    return tokens.map((tok, tIdx) => {
      if (!tok) return null;
      const tKey = `${keyPrefix}-${tIdx}`;
      if (tok.startsWith('$') && tok.endsWith('$') && tok.length > 2) {
        return renderInlineKatex(tok.slice(1, -1), tKey);
      }
      if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
        return <strong key={tKey}>{renderInlineSegment(tok.slice(2, -2), `${tKey}-b`, depth + 1)}</strong>;
      }
      if (tok.startsWith('__') && tok.endsWith('__') && tok.length > 4) {
        return <u key={tKey}>{renderInlineSegment(tok.slice(2, -2), `${tKey}-u`, depth + 1)}</u>;
      }
      return <React.Fragment key={tKey}>{renderLinhasComItalico(tok, tKey)}</React.Fragment>;
    });
  };

  const displayBlocks = str.split(/(\$\$[^$]+\$\$)/g);

  return (
    <span className={className} style={style}>
      {displayBlocks.map((part, idx) => {
        const isDisplay = part.startsWith('$$') && part.endsWith('$$') && part.length > 4;

        if (isDisplay) {
          const expr = part.slice(2, -2);
          if (katexReady && window.katex) {
            try {
              const html = window.katex.renderToString(expr, {
                displayMode: true,
                throwOnError: false,
                strict: 'ignore',
              });
              return (
                <span
                  key={idx}
                  style={{ display: 'block', margin: '6px 0', textAlign: 'center' }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch {
              // fallback abaixo
            }
          }
          return (
            <code
              key={idx}
              style={{
                display: 'block',
                margin: '6px 0',
                textAlign: 'center',
                fontFamily: "'Cambria Math', 'Times New Roman', serif",
                fontStyle: 'italic',
                background: '#f0f9ff',
                color: '#0369a1',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {expr}
            </code>
          );
        }

        // Remove \n redundante imediatamente colado em bloco display $$...$$
        let cleanPart = part;
        const prevPart = idx > 0 ? displayBlocks[idx - 1] : '';
        const nextPart = idx + 1 < displayBlocks.length ? displayBlocks[idx + 1] : '';
        if (prevPart.startsWith('$$') && prevPart.endsWith('$$') && prevPart.length > 4) {
          cleanPart = cleanPart.replace(/^\r?\n/, '');
        }
        if (nextPart.startsWith('$$') && nextPart.endsWith('$$') && nextPart.length > 4) {
          cleanPart = cleanPart.replace(/\r?\n$/, '');
        }
        return <React.Fragment key={idx}>{renderInlineSegment(cleanPart, `seg-${idx}`)}</React.Fragment>;
      })}
    </span>
  );
}

/* ── Figura Independente (Smart Media) ── */
export function SmartFigure({ midia, imagemUrl, modoProva = false }) {
  const m = parseJsonSafe(midia, null);
  const src = m?.url || imagemUrl;
  if (!src) return null;

  const presetMap = { P: '36%', M: '56%', G: '84%', '100%': '100%' };
  const widthPct = presetMap[m?.preset] || '58%';
  const align = ['left', 'center', 'right'].includes(m?.alinhamento) ? m.alinhamento : 'center';
  const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const legLimpa = String(m?.legenda || '').trim();
  const credBruto = String(m?.credito || '').trim();
  const credEhRodapeCaderno = /^(?:humanas|linguagens|matem[aá]tica|ci[êe]ncias)[\s\-–—_/0-9º°ªa-z]*$/i.test(credBruto);
  const credUtil = credBruto && !credEhRodapeCaderno && !legLimpa.toLowerCase().includes(credBruto.toLowerCase())
    ? `Fonte: ${credBruto}`
    : '';
  const legendaTxt = [legLimpa, credUtil].filter(Boolean).join(' — ');

  return (
    <figure style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: justifyMap[align],
      margin: modoProva ? '6px 0' : '10px 0',
      width: '100%',
    }}>
      <img
        src={src}
        alt={m?.legenda || 'Figura da questão'}
        style={{
          width: widthPct,
          maxWidth: '100%',
          maxHeight: modoProva ? 220 : 300,
          height: 'auto',
          objectFit: 'contain',
          borderRadius: modoProva ? 2 : 8,
          border: modoProva ? 'none' : '1px solid #e2e8f0',
          background: '#fff',
        }}
      />
      {legendaTxt && (
        <figcaption style={{
          width: widthPct,
          maxWidth: '100%',
          textAlign: align,
          fontSize: modoProva ? '7.5pt' : '0.73rem',
          color: modoProva ? '#444' : '#64748b',
          fontStyle: 'italic',
          marginTop: 3,
          lineHeight: 1.35,
        }}>
          {legendaTxt}
        </figcaption>
      )}
    </figure>
  );
}

/* ── Inferência determinística da alternativa correta (A–E) a partir das proposições/sequência ── */
export function inferirLetraCorretaPorEstrutura(tipo = 'objetiva', est = {}, alts = [], comandoContexto = '') {
  if (!Array.isArray(alts) || alts.length < 2) return '';

  if (tipo === 'afirmativas') {
    const props = Array.isArray(est?.proposicoes) ? est.proposicoes : [];
    if (props.length < 2) return '';
    const ctx = `${comandoContexto || ''} ${est?.comando_fechamento || ''}`;
    const pedeIncorretas = /\b(incorreta|incorretas|falsa|falsas|errada|erradas|exceto)\b/i.test(ctx);
    const todosRomanos = props.map((p) => String(p.romano || '').toUpperCase().trim()).filter(Boolean);
    const alvoSet = new Set(
      props
        .filter((p) => Boolean(p.correta) === !pedeIncorretas)
        .map((p) => String(p.romano || '').toUpperCase().trim())
        .filter(Boolean)
    );

    const candidatas = [];
    for (const alt of alts) {
      const txtSemSeculo = String(alt?.texto || '')
        .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
        .replace(/\bs[eé]culos?\s+[IVXLCDM]+\b/gi, ' ');
      let altSet = null;
      if (/\btodas\b/i.test(txtSemSeculo) && !/\bexceto\b/i.test(txtSemSeculo)) {
        altSet = new Set(todosRomanos);
      } else if (/\bnenhuma\b/i.test(txtSemSeculo)) {
        altSet = new Set();
      } else {
        const roms = [...txtSemSeculo.matchAll(/\b(I|II|III|IV|V|VI|VII|VIII)\b/g)].map((m) => m[1].toUpperCase());
        if (roms.length > 0) altSet = new Set(roms);
      }
      if (altSet && altSet.size === alvoSet.size && [...alvoSet].every((r) => altSet.has(r))) {
        candidatas.push(String(alt.letra || '').toUpperCase().trim());
      }
    }
    return candidatas.length === 1 ? candidatas[0] : '';
  }

  if (tipo === 'verdadeiro_falso' && est?.submodo === 'sequencia') {
    const seqAlvo = (est?.itens || []).map((i) => String(i.gabarito || '').toUpperCase().trim()).filter(Boolean);
    if (seqAlvo.length < 2) return '';
    const candidatas = [];
    for (const alt of alts) {
      const tokens = [...String(alt?.texto || '').toUpperCase().matchAll(/\b([VFCE])\b/g)].map((m) => m[1]);
      if (tokens.length === seqAlvo.length && tokens.every((t, k) => t === seqAlvo[k])) {
        candidatas.push(String(alt.letra || '').toUpperCase().trim());
      }
    }
    return candidatas.length === 1 ? candidatas[0] : '';
  }

  if (tipo === 'associacao' && est?.submodo === 'sequencia') {
    const seqAlvo = (est?.coluna_b || []).map((b) => String(b.vinculo_codigo || '').toUpperCase().trim()).filter(Boolean);
    if (seqAlvo.length < 2) return '';
    const candidatas = [];
    for (const alt of alts) {
      const tokens = [...String(alt?.texto || '').toUpperCase().matchAll(/[A-Z0-9]+/g)].map((m) => m[0]);
      if (tokens.length === seqAlvo.length && tokens.every((t, k) => t === seqAlvo[k])) {
        candidatas.push(String(alt.letra || '').toUpperCase().trim());
      }
    }
    return candidatas.length === 1 ? candidatas[0] : '';
  }

  return '';
}

/* ── Resumo textual do gabarito para qualquer um dos 7 modelos ── */
export function resumirGabaritoQuestao(questao) {
  if (!questao) return '—';
  const est = parseJsonSafe(questao.estrutura_json || questao.estrutura, {}) || {};
  const tipo = questao.tipo || est.modelo || 'objetiva';

  const rawAlts = questao.alternativas || parseJsonSafe(questao.alternativas_json, []) || [];
  const alts = (Array.isArray(rawAlts) ? rawAlts : []).filter(a => (a?.texto && String(a.texto).trim()) || a?.imagem_url);
  const temPlaceholderVazio = Array.isArray(rawAlts) && rawAlts.length > 0 && alts.length === 0;
  const altCorreta =
    alts.find(a => a.correta)?.letra ||
    (temPlaceholderVazio ? '' : (questao.correta || questao.gabarito)) ||
    inferirLetraCorretaPorEstrutura(tipo, est, alts, `${questao.enunciado ?? questao.conteudo_bruto ?? ''} ${questao.comando_final ?? ''}`);

  if (tipo === 'verdadeiro_falso' && (est.submodo || 'direto') === 'direto') {
    const seq = (est.itens || []).map(i => i.gabarito || 'V').join(' - ');
    return seq || altCorreta || '—';
  }
  if (tipo === 'associacao' && (est.submodo || 'direto') === 'direto') {
    const seq = (est.coluna_b || []).map(b => b.vinculo_codigo || '—').join(' - ');
    return seq || altCorreta || '—';
  }
  if (tipo === 'lacuna' && (est.submodo || 'direto') !== 'alternativas') {
    const texto = questao.enunciado ?? questao.conteudo_bruto ?? '';
    const matches = [...String(texto).matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim());
    const lacs = matches.length ? matches : (est.lacunas || []);
    return lacs.length ? lacs.join(' / ') : '—';
  }
  if (tipo === 'somatoria') {
    const s = est.soma_correta ?? questao.correta;
    return s !== undefined && s !== null && s !== '' ? String(s).padStart(2, '0') : '—';
  }
  if (tipo === 'discursiva') {
    return (questao.resposta_aberta || '').trim() ? 'Espelho definido' : 'Discursiva';
  }
  return altCorreta ? `(${altCorreta})` : '—';
}

/* ── Renderização Completa da Anatomia da Questão (Tela + Preview A4) ── */
export function QuestaoCorpoEstruturado({ questao, showGabarito = true, modoProva = false }) {
  if (!questao) return null;

  const est = parseJsonSafe(questao.estrutura_json || questao.estrutura, {}) || {};
  const midia = parseJsonSafe(questao.midia_json || questao.midia, null);
  const tipo = questao.tipo || est.modelo || 'objetiva';

  const enunciadoRaw = questao.enunciado ?? questao.conteudo_bruto ?? '';
  const comandoFinal = questao.comando_final ?? '';
  const textoApoio   = questao.texto_apoio ?? '';
  const fonte        = questao.fonte ?? '';
  const respostaAberta = questao.resposta_aberta ?? '';
  const imagemFallback = questao.imagem || questao.imagem_url || questao.imagem_base64 || null;

  const rawAlts = questao.alternativas || parseJsonSafe(questao.alternativas_json, []) || [];
  const alts = (Array.isArray(rawAlts) ? rawAlts : []).filter(a => (a?.texto && String(a.texto).trim()) || a?.imagem_url);
  const letraCorreta =
    alts.find(a => a.correta)?.letra ||
    questao.correta ||
    questao.gabarito ||
    inferirLetraCorretaPorEstrutura(tipo, est, alts, `${enunciadoRaw} ${comandoFinal}`);

  const posicaoFigura = ['apos_texto_apoio', 'entre_enunciado_e_comando', 'abaixo_comando'].includes(midia?.posicao)
    ? midia.posicao
    : 'entre_enunciado_e_comando';

  const fontBody = modoProva ? '10pt' : '0.9rem';

  const renderBlocoAlternativas = () => {
    if (!alts.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: modoProva ? 3 : 6, marginTop: modoProva ? 4 : 8 }}>
        {alts.map((alt, i) => {
          const letra = alt.letra || String.fromCharCode(65 + i);
          const isCorr = showGabarito && Boolean(alt.correta || (letraCorreta && letra === letraCorreta));
          return (
            <div
              key={alt.id || i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: modoProva ? 6 : 9,
                padding: modoProva ? '2px 4px' : '7px 11px',
                borderRadius: modoProva ? 3 : 8,
                background: isCorr ? '#f0fdf4' : modoProva ? 'transparent' : '#f8fafc',
                border: modoProva ? 'none' : `1.5px solid ${isCorr ? '#86efac' : '#e2e8f0'}`,
                fontSize: modoProva ? '9.8pt' : '0.86rem',
                color: isCorr ? '#14532d' : modoProva ? '#000' : '#334155',
              }}
            >
              <span style={{
                fontWeight: 800,
                flexShrink: 0,
                minWidth: modoProva ? 22 : 24,
                color: isCorr ? '#059669' : modoProva ? '#000' : '#475569',
              }}>
                ({letra})
              </span>
              <div style={{ flex: 1 }}>
                {alt.texto && <MathText text={alt.texto} />}
                {alt.imagem_url && (
                  <div style={{ marginTop: 4 }}>
                    <img
                      src={alt.imagem_url}
                      alt={`Alternativa ${letra}`}
                      style={{ maxWidth: 160, maxHeight: 105, objectFit: 'contain', borderRadius: 4, border: '1px solid #e2e8f0', background: '#fff' }}
                    />
                  </div>
                )}
              </div>
              {isCorr && (
                <span style={{ color: '#059669', fontWeight: 800, fontSize: modoProva ? '9pt' : '0.76rem', flexShrink: 0 }}>
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Enunciado com suporte a {{lacuna}}
  const renderEnunciado = () => {
    if (!enunciadoRaw) return null;
    if (tipo !== 'lacuna') {
      return (
        <div style={{ fontSize: fontBody, lineHeight: 1.62, textAlign: 'justify', color: modoProva ? '#000' : '#1e293b', margin: '4px 0' }}>
          <MathText text={enunciadoRaw} />
        </div>
      );
    }

    const parts = String(enunciadoRaw).split(/(\{\{[^}]+\}\})/g);
    return (
      <div style={{ fontSize: fontBody, lineHeight: 1.75, textAlign: 'justify', color: modoProva ? '#000' : '#1e293b', margin: '4px 0' }}>
        {parts.map((p, idx) => {
          if (p.startsWith('{{') && p.endsWith('}}')) {
            const resp = p.slice(2, -2).trim();
            if (showGabarito) {
              return (
                <span key={idx} style={{
                  display: 'inline-block', padding: '0 7px', margin: '0 2px',
                  borderBottom: '2px solid #059669', background: '#ecfdf5',
                  color: '#065f46', fontWeight: 700, borderRadius: '4px 4px 0 0',
                }}>
                  {resp || '___'}
                </span>
              );
            }
            const len = Math.max(8, Math.min(22, resp.length + 4));
            return (
              <span key={idx} style={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                {'_'.repeat(len)}
              </span>
            );
          }
          return <MathText key={idx} text={p} />;
        })}
      </div>
    );
  };

  return (
    <div>
      {/* 1. Texto de apoio */}
      {textoApoio && (
        <blockquote style={{
          borderLeft: `3px solid ${modoProva ? '#555' : '#0e7490'}`,
          background: modoProva ? '#f8f8f8' : '#f8fafc',
          padding: modoProva ? '4px 8px' : '8px 12px',
          margin: '0 0 8px',
          borderRadius: modoProva ? 0 : 6,
          fontSize: modoProva ? '9pt' : '0.82rem',
          fontStyle: 'italic',
          color: modoProva ? '#222' : '#475569',
        }}>
          <MathText text={textoApoio} />
          {fonte && (
            <footer style={{ fontSize: modoProva ? '7.8pt' : '0.73rem', fontStyle: 'normal', color: '#64748b', marginTop: 3 }}>
              — {fonte}
            </footer>
          )}
        </blockquote>
      )}

      {/* Figura após texto de apoio */}
      {posicaoFigura === 'apos_texto_apoio' && (
        <SmartFigure midia={midia} imagemUrl={imagemFallback} modoProva={modoProva} />
      )}

      {/* 2. Enunciado pré-figura */}
      {renderEnunciado()}

      {/* Figura entre enunciado e comando final (padrão) */}
      {posicaoFigura === 'entre_enunciado_e_comando' && (
        <SmartFigure midia={midia} imagemUrl={imagemFallback} modoProva={modoProva} />
      )}

      {/* 3. Comando final pós-figura (exceto quando deve vir entre a tabela/itens V-F e as alternativas de sequência) */}
      {(() => {
        const comandoPosCorpo = (tipo === 'associacao' || tipo === 'verdadeiro_falso') && (est.submodo || 'direto') === 'sequencia';
        if (!comandoFinal || comandoPosCorpo) return null;
        return (
          <div style={{
            fontSize: fontBody,
            lineHeight: 1.55,
            fontWeight: 600,
            color: modoProva ? '#000' : '#0f172a',
            margin: '5px 0 6px',
            textAlign: 'justify',
          }}>
            <MathText text={comandoFinal} />
          </div>
        );
      })()}

      {/* Figura abaixo do comando */}
      {posicaoFigura === 'abaixo_comando' && (
        <SmartFigure midia={midia} imagemUrl={imagemFallback} modoProva={modoProva} />
      )}

      {/* 4. Corpo específico dos 7 modelos */}
      {tipo === 'objetiva' && renderBlocoAlternativas()}

      {tipo === 'afirmativas' && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4, marginBottom: 6 }}>
            {(est.proposicoes || []).filter(p => p.texto?.trim()).map((p, i) => (
              <div key={p.id || i} style={{ fontSize: modoProva ? '9.6pt' : '0.85rem', color: modoProva ? '#000' : '#1e293b', display: 'flex', gap: 6, textAlign: 'left' }}>
                <strong style={{ minWidth: 24 }}>{p.romano || ['I', 'II', 'III', 'IV', 'V'][i]}.</strong>
                <span style={{ flex: 1 }}><MathText text={p.texto} /></span>
                {showGabarito && !modoProva && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: p.correta ? '#059669' : '#dc2626' }}>
                    {p.correta ? '✓ V' : '✕ F'}
                  </span>
                )}
              </div>
            ))}
          </div>
          {est.comando_fechamento && (
            <div style={{ fontSize: fontBody, fontWeight: 600, margin: '4px 0', color: modoProva ? '#000' : '#0f172a', textAlign: 'left' }}>
              <MathText text={est.comando_fechamento} />
            </div>
          )}
          {renderBlocoAlternativas()}
        </div>
      )}

      {tipo === 'verdadeiro_falso' && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(est.itens || []).filter(it => it.texto?.trim()).map((it, i) => {
              const mostrarDireto = showGabarito && (est.submodo || 'direto') === 'direto';
              return (
                <div key={it.id || i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: modoProva ? '9.6pt' : '0.85rem', textAlign: 'left' }}>
                  <span style={{
                    fontFamily: 'monospace', fontWeight: 800, whiteSpace: 'nowrap',
                    color: mostrarDireto ? (['V', 'C'].includes(it.gabarito) ? '#059669' : '#dc2626') : 'inherit',
                  }}>
                    ({mostrarDireto ? ` ${it.gabarito || 'V'} ` : '   '})
                  </span>
                  <span style={{ flex: 1 }}><MathText text={it.texto} /></span>
                </div>
              );
            })}
          </div>
          {(est.submodo || 'direto') === 'direto' && est.exigir_justificativa_falsas && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                Justifique as afirmativas falsas:
              </div>
              {Array.from({ length: Number(est.linhas_justificativa) || 3 }, (_, i) => (
                <div key={i} style={{ height: 15, borderBottom: '1px dotted #94a3b8', marginBottom: 3 }} />
              ))}
            </div>
          )}
          {(est.submodo || 'direto') === 'sequencia' && comandoFinal && (
            <div style={{ fontSize: fontBody, lineHeight: 1.5, fontWeight: 600, color: modoProva ? '#000' : '#0f172a', margin: '7px 0 4px', textAlign: 'left' }}>
              <MathText text={comandoFinal} />
            </div>
          )}
          {est.submodo === 'sequencia' && renderBlocoAlternativas()}
        </div>
      )}

      {tipo === 'associacao' && (() => {
        const colA = est.coluna_a || [];
        const colB = est.coluna_b || [];
        const avgA = colA.length ? colA.reduce((s, x) => s + String(x?.texto || '').length, 0) / colA.length : 25;
        const avgB = colB.length ? colB.reduce((s, x) => s + String(x?.texto || '').length, 0) / colB.length : 45;
        const widthColA = avgA <= avgB * 0.58 ? '37%' : '46%';
        const widthColB = avgA <= avgB * 0.58 ? '63%' : '54%';

        return (
          <div style={{ marginTop: 6 }}>
            {(colA.some(a => a.texto?.trim()) || colB.some(b => b.texto?.trim())) && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: modoProva ? '9pt' : '0.82rem', marginBottom: 6, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 10px', textAlign: 'left', verticalAlign: 'middle', width: widthColA }}>
                      {est.titulo_coluna_a || 'Coluna A'}
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 10px', textAlign: 'left', verticalAlign: 'middle', width: widthColB }}>
                      {est.titulo_coluna_b || 'Coluna B'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(colA.length, colB.length) }, (_, i) => {
                    const a = colA[i];
                    const b = colB[i];
                    const mostrarCod = showGabarito && (est.submodo || 'direto') === 'direto' && b?.vinculo_codigo;
                    return (
                      <tr key={i}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', verticalAlign: 'top', textAlign: 'left', lineHeight: 1.5 }}>
                          {a?.texto ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, textAlign: 'left' }}>
                              <strong style={{ flexShrink: 0 }}>({a.codigo || i + 1})</strong>
                              <span style={{ flex: 1, textAlign: 'left' }}><MathText text={a.texto} /></span>
                            </div>
                          ) : ''}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', verticalAlign: 'top', textAlign: 'left', lineHeight: 1.5 }}>
                          {b?.texto ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, textAlign: 'left' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0, color: mostrarCod ? '#059669' : 'inherit' }}>
                                ({mostrarCod ? ` ${b.vinculo_codigo} ` : '   '})
                              </span>
                              <span style={{ flex: 1, textAlign: 'left' }}><MathText text={b.texto} /></span>
                            </div>
                          ) : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {(est.submodo || 'direto') === 'sequencia' && comandoFinal && (
              <div style={{ fontSize: fontBody, lineHeight: 1.5, fontWeight: 600, color: modoProva ? '#000' : '#0f172a', margin: '7px 0 4px', textAlign: 'left' }}>
                <MathText text={comandoFinal} />
              </div>
            )}
            {est.submodo === 'sequencia' && renderBlocoAlternativas()}
          </div>
        );
      })()}

      {tipo === 'lacuna' && (
        <div style={{ marginTop: 6 }}>
          {est.submodo === 'banco_palavras' && (
            <div style={{
              border: '1px dashed #64748b', borderRadius: 6, padding: '6px 10px',
              background: '#f8fafc', fontSize: modoProva ? '9pt' : '0.8rem', marginBottom: 6,
            }}>
              <strong>Banco de palavras: </strong>
              {[...(est.lacunas || []), ...(est.distratores_banco || [])]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                .join('  ·  ') || '(adicione lacunas ou distratores)'}
            </div>
          )}
          {est.submodo === 'alternativas' && renderBlocoAlternativas()}
        </div>
      )}

      {tipo === 'somatoria' && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(est.proposicoes || []).filter(p => p.texto?.trim()).map((p, i) => (
              <div key={p.valor || i} style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: modoProva ? '9.6pt' : '0.85rem' }}>
                <strong style={{ fontFamily: 'monospace' }}>({p.codigo || String(p.valor).padStart(2, '0')})</strong>
                <span style={{ flex: 1 }}><MathText text={p.texto} /></span>
                {showGabarito && p.correta && <span style={{ color: '#059669', fontWeight: 800, fontSize: '0.78rem' }}>✓</span>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.04em' }}>SOMA:</span>
            <span style={{
              border: '1.5px solid #0f172a', borderRadius: 4, padding: '2px 10px',
              minWidth: 38, textAlign: 'center', fontWeight: 800,
              color: showGabarito ? '#059669' : '#0f172a',
              background: showGabarito ? '#ecfdf5' : '#fff',
            }}>
              {showGabarito ? String(est.soma_correta ?? 0).padStart(2, '0') : '\u00A0\u00A0'}
            </span>
          </div>
        </div>
      )}

      {tipo === 'discursiva' && (
        <div style={{ marginTop: 6 }}>
          {(est.formato_espaco || 'linhas') === 'quadro_calculo' ? (
            <div style={{
              width: '100%',
              height: Math.max(70, Math.min(240, Number(est.altura_quadro_px) || 120)),
              border: '1px solid #94a3b8',
              borderRadius: 6,
              background: '#fff',
            }} />
          ) : (est.formato_espaco || 'linhas') === 'nenhum' ? null : (
            <div>
              {Array.from({ length: Math.max(2, Math.min(15, Number(est.linhas_resposta) || 6)) }, (_, i) => (
                <div key={i} style={{ height: 16, borderBottom: '1px dotted #94a3b8', marginBottom: 3, width: '100%' }} />
              ))}
            </div>
          )}
          {showGabarito && respostaAberta && (
            <div style={{
              marginTop: 6, padding: '6px 10px', background: '#f0fdf4',
              borderLeft: '3px solid #059669', borderRadius: 4,
              fontSize: modoProva ? '8.5pt' : '0.8rem', color: '#14532d',
            }}>
              <strong>Espelho de correção: </strong>
              <MathText text={respostaAberta} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Gerador HTML string para o popup de impressão do navegador (ProvaPreview) ── */
export function renderQuestaoPrintHtml(it, idx, template, showGabarito = false) {
  const esc = (s = '') => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmtPrint = (s = '') =>
    esc(s)
      .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^\s_](?:[\s\S]*?[^\s_])?)__/g, '<u>$1</u>')
      .replace(/\*([^\s*](?:[^*\n]*?[^\s*])?)\*/g, '<em>$1</em>');

  const num = String(idx + 1).padStart(2, '0');
  const est = parseJsonSafe(it.estrutura_json, {}) || {};
  const midia = parseJsonSafe(it.midia_json, null);
  const tipo = it.tipo || est.modelo || (template === 'discursiva' ? 'discursiva' : 'objetiva');
  const alts = parseJsonSafe(it.alternativas_json, []) || [];
  const correta =
    (Array.isArray(alts) ? alts : []).find(a => a.correta)?.letra ||
    it.correta ||
    it.gabarito ||
    inferirLetraCorretaPorEstrutura(tipo, est, alts, `${it.conteudo_bruto || ''} ${it.comando_final || ''}`);

  const imgSrc = midia?.url || it.imagem_url || it.imagem_base64;
  const presetMap = { P: '36%', M: '56%', G: '84%', '100%': '100%' };
  const wCss = presetMap[midia?.preset] || '58%';
  const align = ['left', 'center', 'right'].includes(midia?.alinhamento) ? midia.alinhamento : 'center';
  const pos = ['apos_texto_apoio', 'entre_enunciado_e_comando', 'abaixo_comando'].includes(midia?.posicao)
    ? midia.posicao
    : 'entre_enunciado_e_comando';
  const legLimpa = String(midia?.legenda || '').trim();
  const credBruto = String(midia?.credito || '').trim();
  const credEhRodapeCaderno = /^(?:humanas|linguagens|matem[aá]tica|ci[êe]ncias)[\s\-–—_/0-9º°ªa-z]*$/i.test(credBruto);
  const credUtil = credBruto && !credEhRodapeCaderno && !legLimpa.toLowerCase().includes(credBruto.toLowerCase())
    ? `Fonte: ${credBruto}`
    : '';
  const legenda = [legLimpa, credUtil].filter(Boolean).join(' — ');

  const figHtml = imgSrc
    ? `<div style="text-align:${align};margin:6px 0"><img src="${esc(imgSrc)}" style="display:inline-block;width:${wCss};max-width:100%;max-height:220px;height:auto;object-fit:contain"/>${legenda ? `<div style="font-size:7.5pt;color:#555;font-style:italic">${esc(legenda)}</div>` : ''}</div>`
    : '';

  let enuncHtml = fmtPrint(it.conteudo_bruto || '').replace(/\n/g, '<br>');
  if (tipo === 'lacuna') {
    enuncHtml = enuncHtml.replace(/\{\{([^}]+)\}\}/g, (_, r) =>
      showGabarito ? `<strong style="color:#166534;text-decoration:underline">${r}</strong>` : '_'.repeat(Math.max(8, r.length + 4))
    );
  }

  const renderAlts = () => (Array.isArray(alts) ? alts : []).map(a => {
    const isCorr = showGabarito && (a.correta || a.letra === correta);
    const aImg = a.imagem_url ? `<div><img src="${esc(a.imagem_url)}" style="max-width:140px;max-height:95px;margin-top:2px"/></div>` : '';
    return `<div style="display:flex;gap:5px;padding:1.5px 0;font-size:9.8pt;${isCorr ? 'background:#f0fdf4;font-weight:700' : ''}"><span style="font-weight:700;min-width:22px">(${esc(a.letra)})</span><div style="flex:1">${fmtPrint(a.texto || '')}${aImg}</div></div>`;
  }).join('');

  const cmdPosCorpoPrint = (tipo === 'associacao' || tipo === 'verdadeiro_falso') && (est.submodo || 'direto') === 'sequencia';
  const cmdHtml = it.comando_final ? `<p style="font-size:10pt;font-weight:600;line-height:1.5;margin:4px 0;text-align:left">${fmtPrint(it.comando_final)}</p>` : '';

  let corpo = '';
  if (tipo === 'afirmativas') {
    const pHtml = (est.proposicoes || []).map((p, i) => `<div style="font-size:9.6pt;margin-bottom:2px;text-align:left"><strong>${esc(p.romano || ['I','II','III','IV','V'][i])}.</strong> ${fmtPrint(p.texto || '')}</div>`).join('');
    const cf = est.comando_fechamento ? `<div style="font-weight:600;margin:4px 0;font-size:9.8pt;text-align:left">${fmtPrint(est.comando_fechamento)}</div>` : '';
    corpo = `${pHtml}${cf}${renderAlts()}`;
  } else if (tipo === 'verdadeiro_falso') {
    const vHtml = (est.itens || []).map(x => `<div style="font-size:9.6pt;margin-bottom:2px;text-align:left"><span style="font-family:monospace;font-weight:700">( ${showGabarito && (est.submodo || 'direto') === 'direto' ? esc(x.gabarito || 'V') : '&nbsp;&nbsp;'} )</span> ${fmtPrint(x.texto || '')}</div>`).join('');
    corpo = `${vHtml}${cmdPosCorpoPrint ? cmdHtml : ''}${est.submodo === 'sequencia' ? renderAlts() : ''}`;
  } else if (tipo === 'associacao') {
    const colA = est.coluna_a || [];
    const colB = est.coluna_b || [];
    const avgA = colA.length ? colA.reduce((s, x) => s + String(x?.texto || '').length, 0) / colA.length : 25;
    const avgB = colB.length ? colB.reduce((s, x) => s + String(x?.texto || '').length, 0) / colB.length : 45;
    const wA = avgA <= avgB * 0.58 ? '37%' : '46%';
    const wB = avgA <= avgB * 0.58 ? '63%' : '54%';
    const n = Math.max(colA.length, colB.length);
    let rows = '';
    for (let i = 0; i < n; i++) {
      const a = colA[i]; const b = colB[i];
      rows += `<tr><td style="border:0.5pt solid #666;padding:4px 6px;text-align:left;vertical-align:top;width:${wA}">${a ? `<strong>(${esc(a.codigo || i + 1)})</strong> ${fmtPrint(a.texto || '')}` : ''}</td><td style="border:0.5pt solid #666;padding:4px 6px;text-align:left;vertical-align:top;width:${wB}">${b ? `<span style="font-family:monospace;font-weight:700">( ${showGabarito && (est.submodo || 'direto') === 'direto' ? esc(b.vinculo_codigo || '') : '&nbsp;&nbsp;'} )</span> ${fmtPrint(b.texto || '')}` : ''}</td></tr>`;
    }
    const hdr = `<thead><tr style="background:#f3f4f6"><th style="border:0.5pt solid #666;padding:4px 6px;text-align:left;width:${wA}">${esc(est.titulo_coluna_a || 'Coluna A')}</th><th style="border:0.5pt solid #666;padding:4px 6px;text-align:left;width:${wB}">${esc(est.titulo_coluna_b || 'Coluna B')}</th></tr></thead>`;
    corpo = `<table style="width:100%;border-collapse:collapse;font-size:9pt;margin:4px 0;text-align:left">${hdr}<tbody>${rows}</tbody></table>${cmdPosCorpoPrint ? cmdHtml : ''}${est.submodo === 'sequencia' ? renderAlts() : ''}`;
  } else if (tipo === 'lacuna') {
    const bp = est.submodo === 'banco_palavras'
      ? `<div style="border:0.7pt dashed #555;padding:4px 8px;font-size:9pt;margin:4px 0"><strong>Banco de palavras:</strong> ${[...(est.lacunas || []), ...(est.distratores_banco || [])].filter(Boolean).map(esc).join(' · ')}</div>`
      : '';
    corpo = `${bp}${est.submodo === 'alternativas' ? renderAlts() : ''}`;
  } else if (tipo === 'somatoria') {
    const sHtml = (est.proposicoes || []).map(p => `<div style="font-size:9.6pt;margin-bottom:2px;text-align:left"><strong>(${esc(p.codigo || String(p.valor).padStart(2, '0'))})</strong> ${fmtPrint(p.texto || '')}</div>`).join('');
    corpo = `${sHtml}<div style="text-align:right;margin-top:4px;font-weight:700;font-size:9.5pt">SOMA: <span style="border:1pt solid #000;padding:1px 10px">${showGabarito ? esc(String(est.soma_correta ?? 0).padStart(2, '0')) : '&nbsp;&nbsp;&nbsp;&nbsp;'}</span></div>`;
  } else if (tipo === 'discursiva') {
    corpo = (est.formato_espaco || 'linhas') === 'quadro_calculo'
      ? `<div style="height:${Number(est.altura_quadro_px) || 120}px;border:0.7pt solid #666;margin-top:4px"></div>`
      : Array.from({ length: Number(est.linhas_resposta) || 6 }, () => '<div style="height:16px;border-bottom:0.6pt dotted #999;margin-bottom:4px"></div>').join('');
  } else {
    corpo = renderAlts();
  }

  return `<div style="break-inside:avoid;page-break-inside:avoid;margin-bottom:10px;padding-bottom:8px;border-bottom:0.5pt dashed #ccc">
    <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-weight:700;font-size:10pt;text-transform:uppercase">QUESTÃO ${num}${it.fonte && !it.texto_apoio ? ` <span style="font-weight:600;font-size:8.5pt;text-transform:none">(${esc(it.fonte)})</span>` : ''}</span><span style="font-size:7.5pt;color:#666">${esc(it.disciplina || '')} ${it.habilidade_bncc ? `· ${esc(it.habilidade_bncc)}` : ''} · ${Number(it.valor_pontos || 1).toFixed(1)}pt</span></div>
    ${it.texto_apoio ? `<blockquote style="border-left:3px solid #555;padding:4px 8px;font-style:italic;font-size:9pt;margin:4px 0;background:#f8f8f8">${fmtPrint(it.texto_apoio).replace(/\n/g, '<br>')}${it.fonte ? `<footer style="font-size:8pt;font-style:normal">— ${esc(it.fonte)}</footer>` : ''}</blockquote>` : ''}
    ${pos === 'apos_texto_apoio' ? figHtml : ''}
    <p style="font-size:10pt;line-height:1.55;text-align:justify;margin:3px 0 4px">${enuncHtml}</p>
    ${pos === 'entre_enunciado_e_comando' ? figHtml : ''}
    ${!cmdPosCorpoPrint ? cmdHtml : ''}
    ${pos === 'abaixo_comando' ? figHtml : ''}
    ${corpo}
  </div>`;
}
