// src/features/questoes/ProvaPreview.jsx
// 🎨 EDUCA.PROVA — Preview A4 + Geração de PDF
// Usa config_json da prova para renderizar cabeçalho/rodapé dinâmicos

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../../services/api';

/* ── LaTeX inline renderer ─────────────────────────────────────────────────── */
function LatexText({ text = '' }) {
  if (!text) return null;
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('$') && p.endsWith('$')
          ? <span key={i} style={{ fontStyle: 'italic', letterSpacing: '0.01em', fontFamily: "'IM Fell English', serif" }}>{p.slice(1, -1)}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

/* ── helpers ────────────────────────────────────────────────────────────────── */
const NIVEL_LABEL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };

function getCfg(prova) {
  if (!prova) return {};
  const raw = prova.config_json;
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════════════════════════════════════════════
   QUESTÃO — renderização A4
══════════════════════════════════════════════════════════════════════════════ */
function QuestaoA4({ item, idx, template, modoGabarito }) {
  let alts = [];
  try { alts = JSON.parse(item.alternativas_json || '[]'); } catch {}
  const isDisc = template === 'discursiva' || (template === 'mista' && item.tipo === 'discursiva');
  const correta = alts.find(a => a.correta)?.letra || item.correta;
  const num = String(idx + 1).padStart(2, '0');
  const pontos = Number(item.valor_pontos || 1);

  return (
    <div style={{
      breakInside: 'avoid', pageBreakInside: 'avoid',
      marginBottom: 10, paddingBottom: 8,
      borderBottom: '0.5pt dashed #ccc',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontWeight: 700, fontSize: '10pt', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          QUESTÃO {num}
        </span>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '7.5pt' }}>
          {item.disciplina && (
            <span style={{ padding: '1px 5px', border: '0.7pt solid #1d4ed8', color: '#1d4ed8', borderRadius: 3 }}>
              {item.disciplina}
            </span>
          )}
          {item.habilidade_bncc && (
            <span style={{ padding: '1px 5px', border: '0.7pt solid #7c3aed', color: '#7c3aed', borderRadius: 3 }}>
              {item.habilidade_bncc}
            </span>
          )}
          <span style={{ padding: '1px 5px', border: '0.7pt solid #999', color: '#666', borderRadius: 3 }}>
            {pontos} pt{pontos !== 1 ? 's' : ''}
          </span>
        </span>
      </div>

      {item.texto_apoio && (
        <blockquote style={{
          borderLeft: '3px solid #555', paddingLeft: 8, margin: '4px 0',
          fontStyle: 'italic', fontSize: '9.5pt', color: '#333',
          background: '#f8f8f8', padding: '4px 8px',
        }}>
          <LatexText text={item.texto_apoio} />
          {item.fonte && <footer style={{ fontSize: '8pt', fontStyle: 'normal', color: '#666', marginTop: 2 }}>— {item.fonte}</footer>}
        </blockquote>
      )}

      <p style={{ fontSize: '10.5pt', lineHeight: 1.6, textAlign: 'justify', margin: '3px 0 4px', fontFamily: "'Source Serif 4', 'Times New Roman', serif" }}>
        <LatexText text={item.conteudo_bruto} />
      </p>

      {item.imagem_base64 && (
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <img src={item.imagem_base64} alt="Figura" style={{ maxWidth: '85%', maxHeight: 130, border: '0.5pt solid #ccc' }} />
        </div>
      )}

      {isDisc ? (
        <div style={{ marginTop: 4 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ height: 16, borderBottom: '0.6pt dotted #999', marginBottom: 4, width: '100%' }} />
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 3 }}>
          {alts.map((a, i) => {
            const isCorr = modoGabarito && (a.correta || a.letra === correta);
            return (
              <div key={i} style={{
                display: 'flex', gap: 5, padding: '2px 0',
                fontSize: '10pt', alignItems: 'flex-start',
                background: isCorr ? '#f0fdf4' : 'transparent',
              }}>
                <span style={{ fontWeight: 700, flexShrink: 0, minWidth: 20, color: isCorr ? '#166534' : 'inherit' }}>
                  ({a.letra})
                </span>
                <span style={{ flex: 1 }}>
                  <LatexText text={a.texto} />
                  {isCorr && <span style={{ color: '#166534', marginLeft: 6, fontSize: '9pt' }}>✔</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   GABARITO TABELA
══════════════════════════════════════════════════════════════════════════════ */
function GabaritoTabela({ itens }) {
  const totalPts = itens.reduce((s, it) => s + Number(it.valor_pontos || 1), 0);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginTop: 8 }}>
      <thead>
        <tr>
          {['Nº', 'Resposta', 'Pontos', 'Disciplina', 'Nível', 'BNCC'].map(h => (
            <th key={h} style={{ background: '#333', color: '#fff', padding: '4px 6px', textAlign: 'center', fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {itens.map((it, idx) => {
          let alts = [];
          try { alts = JSON.parse(it.alternativas_json || '[]'); } catch {}
          const corr = alts.find(a => a.correta)?.letra || it.correta || '—';
          const nivel = NIVEL_LABEL[it.nivel] || it.nivel || '—';
          return (
            <tr key={idx} style={{ background: idx % 2 ? '#f5f5f5' : '#fff' }}>
              <td style={{ padding: '3px 6px', border: '0.5pt solid #ccc', textAlign: 'center', fontWeight: 700 }}>{String(idx + 1).padStart(2, '0')}</td>
              <td style={{ padding: '3px 6px', border: '0.5pt solid #ccc', textAlign: 'center', fontWeight: 700, color: '#166534' }}>{corr}</td>
              <td style={{ padding: '3px 6px', border: '0.5pt solid #ccc', textAlign: 'center' }}>{Number(it.valor_pontos || 1).toFixed(1)}</td>
              <td style={{ padding: '3px 6px', border: '0.5pt solid #ccc', textAlign: 'center', fontSize: '8.5pt' }}>{it.disciplina || '—'}</td>
              <td style={{ padding: '3px 6px', border: '0.5pt solid #ccc', textAlign: 'center' }}>{nivel}</td>
              <td style={{ padding: '3px 6px', border: '0.5pt solid #ccc', textAlign: 'center', fontSize: '8pt', color: '#7c3aed' }}>{it.habilidade_bncc || '—'}</td>
            </tr>
          );
        })}
        <tr style={{ borderTop: '2pt solid #333', fontWeight: 700, background: '#f0f0f0' }}>
          <td colSpan={2} style={{ padding: '4px 6px', textAlign: 'right' }}>TOTAL</td>
          <td style={{ padding: '4px 6px', textAlign: 'center' }}>{totalPts.toFixed(1)}</td>
          <td colSpan={3} />
        </tr>
      </tbody>
    </table>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CABEÇALHO A4 — dinâmico baseado em config_json.cabecalho_itens
══════════════════════════════════════════════════════════════════════════════ */
function CabecalhoA4({ prova, cfg, escola }) {
  const itens = cfg.cabecalho_itens ?? {
    cab_escola: true, cab_logo: true, cab_titulo: true, cab_nome: true,
    cab_disc: true, cab_turma: true, cab_bimestre: true, cab_ano: true,
    cab_data: true, cab_nota: true, cab_instrucoes: true,
  };
  const sh = (k) => itens[k] ?? true;

  return (
    <div style={{ border: '2px solid #000', padding: '6px 10px', marginBottom: 6 }}>
      {/* Escola + Logo */}
      {(sh('cab_escola') || sh('cab_logo')) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {sh('cab_logo') && (
            <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #333', fontSize: '20px', flexShrink: 0 }}>
              🏫
            </div>
          )}
          {sh('cab_escola') && (
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '11.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{escola}</div>
              <div style={{ fontSize: '8.5pt', color: '#333' }}>Sistema de Ensino EDUCA.MELHOR</div>
            </div>
          )}
        </div>
      )}

      {/* Título */}
      {sh('cab_titulo') && (
        <div style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #000', paddingTop: 5, marginTop: 4 }}>
          {prova.titulo || 'Avaliação'}
        </div>
      )}

      {/* Grade de identificação */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', marginTop: 5, borderTop: '1px solid #ccc', paddingTop: 5 }}>
        {sh('cab_nome') && (
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'flex-end', gap: 5, fontSize: '9pt', paddingBottom: 2, borderBottom: '0.5px solid #555' }}>
            <span style={{ fontWeight: 700, flexShrink: 0 }}>Nome:</span>
            <span style={{ flex: 1 }} />
          </div>
        )}
        {sh('cab_disc') && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, fontSize: '9pt', paddingBottom: 2, borderBottom: '0.5px solid #555' }}>
            <span style={{ fontWeight: 700 }}>Disciplina:</span>
            <span>{prova.disciplina || ''}</span>
          </div>
        )}
        {sh('cab_turma') && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, fontSize: '9pt', paddingBottom: 2, borderBottom: '0.5px solid #555' }}>
            <span style={{ fontWeight: 700 }}>Turma:</span>
            <span>{prova.turma || ''}</span>
          </div>
        )}
        {(sh('cab_bimestre') || sh('cab_ano')) && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, fontSize: '9pt', paddingBottom: 2, borderBottom: '0.5px solid #555' }}>
            <span style={{ fontWeight: 700 }}>
              {[
                sh('cab_bimestre') && prova.bimestre ? `${prova.bimestre}º Bimestre` : '',
                sh('cab_ano') && prova.ano_letivo ? String(prova.ano_letivo) : '',
              ].filter(Boolean).join('  ')}
            </span>
          </div>
        )}
        {sh('cab_data') && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, fontSize: '9pt', paddingBottom: 2, borderBottom: '0.5px solid #555' }}>
            <span style={{ fontWeight: 700 }}>Data:</span>
            <span>___/___/______</span>
          </div>
        )}
        {sh('cab_nota') && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, fontSize: '9pt', paddingBottom: 2, borderBottom: '0.5px solid #555', gridColumn: !sh('cab_data') ? '2' : undefined }}>
            <span style={{ fontWeight: 700 }}>Nota:</span>
            <span>___________</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════════════════ */
export default function ProvaPreview({ provaId, onClose }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState('prova');
  const [gerando,  setGerando]  = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [incGab,   setIncGab]   = useState(false);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    if (!provaId) return;
    setLoading(true);
    apiService.get(`/api/provas/${provaId}`)
      .then(res => setData(res.data))
      .catch(() => setFeedback({ msg: 'Erro ao carregar prova.', type: 'error' }))
      .finally(() => setLoading(false));
  }, [provaId]);

  const toast = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  // ── Dados derivados ────────────────────────────────────────────────────────
  const prova    = data || {};
  const cfg      = useMemo(() => getCfg(prova), [data]); // eslint-disable-line
  const escola   = localStorage.getItem('escola_nome') || 'EDUCA.MELHOR';
  const template = prova.template_slug || 'objetiva_2col';
  const is2col   = ['objetiva_2col', 'enem'].includes(template);

  const itensRaw = data?.itens || [];
  const itens = useMemo(() => {
    return cfg.embaralhar_questoes ? shuffleArr(itensRaw) : itensRaw;
  }, [itensRaw, cfg.embaralhar_questoes]); // eslint-disable-line

  const totalPts       = itens.reduce((s, it) => s + Number(it.valor_pontos || 1), 0);
  const comCab         = cfg.com_cabecalho ?? true;
  const comMarg        = cfg.com_margem    ?? true;
  const rodapeTxt      = cfg.rodape_texto  ?? '';
  const rodapeStr      = rodapeTxt ? `EDUCA.PROVA · ${rodapeTxt}` : 'EDUCA.PROVA';
  const mostrarInstr   = (cfg.cabecalho_itens?.cab_instrucoes ?? true) && comCab;
  const cabItens       = cfg.cabecalho_itens ?? {};
  const sh             = (k) => cabItens[k] ?? true;

  // ── LaTeX ──────────────────────────────────────────────────────────────────
  const gerarLatex = useCallback(() => {
    if (!data) return '';
    const questoes = itens.map((it, idx) => {
      let alts = [];
      try { alts = JSON.parse(it.alternativas_json || '[]'); } catch {}
      const num = String(idx + 1).padStart(2, '0');
      const altsLatex = alts.map(a => `\t\\item[(${a.letra})] ${a.texto || ''}`).join('\n');
      return `\\noindent\n\\textbf{QUESTÃO-${num}} {\\color{azul}\\rule{7.1cm}{0.4pt}}\n\n${it.conteudo_bruto || ''}\n\n${alts.length > 0 ? `\\begin{itemize}\n${altsLatex}\n\\end{itemize}` : ''}\n\n\\vspace{.4cm}`;
    });
    return `\\documentclass{article}\n\\input{PACOTES.tex}\n\\input{BORDAS.tex}\n\n\\begin{document}\n\t\\fontsize{12pt}{14pt}\\selectfont\n\n\t${is2col ? '\\begin{multicols}{2}\n\t\t\\setlength{\\columnseprule}{1pt}\n' : ''}\n${questoes.join('\n\n')}\n\t${is2col ? '\\end{multicols}' : ''}\n\\end{document}`;
  }, [data, itens, is2col]);

  // ── IMPRIMIR via browser ───────────────────────────────────────────────────
  const imprimirBrowser = useCallback(() => {
    if (!data) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { toast('⚠️ Popup bloqueado. Permita pop-ups e tente novamente.', 'warn'); return; }

    // HTML cabeçalho dinâmico
    let cabHtml = '';
    if (comCab) {
      const logoHtml   = sh('cab_logo')   ? `<div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;border:1.5px solid #333;font-size:20px;flex-shrink:0">🏫</div>` : '';
      const escolaHtml = sh('cab_escola') ? `<div style="flex:1;text-align:center"><div style="font-size:11.5pt;font-weight:700;text-transform:uppercase">${escola}</div><div style="font-size:8.5pt;color:#333">Sistema de Ensino EDUCA.MELHOR</div></div>` : '';
      const topoHtml   = (sh('cab_logo') || sh('cab_escola')) ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">${logoHtml}${escolaHtml}</div>` : '';
      const tituloHtml = sh('cab_titulo') ? `<div style="text-align:center;font-size:13pt;font-weight:700;text-transform:uppercase;border-top:1px solid #000;padding-top:5px;margin-top:4px">${prova.titulo||'Avaliação'}</div>` : '';

      let gradeRows = '';
      if (sh('cab_nome')) gradeRows += `<div style="grid-column:1/-1;display:flex;align-items:flex-end;gap:5px;font-size:9pt;padding-bottom:2px;border-bottom:0.5px solid #555"><span style="font-weight:700">Nome:</span><span style="flex:1"></span></div>`;
      if (sh('cab_disc')) gradeRows += `<div style="display:flex;align-items:flex-end;gap:5px;font-size:9pt;padding-bottom:2px;border-bottom:0.5px solid #555"><span style="font-weight:700">Disciplina:</span>${prova.disciplina||''}</div>`;
      if (sh('cab_turma')) gradeRows += `<div style="display:flex;align-items:flex-end;gap:5px;font-size:9pt;padding-bottom:2px;border-bottom:0.5px solid #555"><span style="font-weight:700">Turma:</span>${prova.turma||''}</div>`;
      const bimAno = [sh('cab_bimestre')&&prova.bimestre?`${prova.bimestre}º Bimestre`:'', sh('cab_ano')&&prova.ano_letivo?String(prova.ano_letivo):''].filter(Boolean).join('  ');
      if (bimAno) gradeRows += `<div style="display:flex;align-items:flex-end;gap:5px;font-size:9pt;padding-bottom:2px;border-bottom:0.5px solid #555"><span style="font-weight:700">${bimAno}</span></div>`;
      if (sh('cab_data')) gradeRows += `<div style="display:flex;align-items:flex-end;gap:5px;font-size:9pt;padding-bottom:2px;border-bottom:0.5px solid #555"><span style="font-weight:700">Data:</span>___/___/______</div>`;
      if (sh('cab_nota')) gradeRows += `<div style="display:flex;align-items:flex-end;gap:5px;font-size:9pt;padding-bottom:2px;border-bottom:0.5px solid #555"><span style="font-weight:700">Nota:</span>___________</div>`;

      const gradeHtml = gradeRows ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;margin-top:5px;border-top:1px solid #ccc;padding-top:5px">${gradeRows}</div>` : '';
      cabHtml = `<div style="border:2px solid #000;padding:6px 10px;margin-bottom:6px">${topoHtml}${tituloHtml}${gradeHtml}</div>`;
    }

    // Instruções
    let instrHtml = '';
    if (mostrarInstr) {
      instrHtml = `<div style="border:1px solid #000;padding:5px 10px;margin-bottom:8px;font-size:8.5pt"><strong>INSTRUÇÕES:</strong><ol style="margin-left:18px;margin-top:3px"><li>Esta avaliação contém <strong>${itens.length} questão(ões)</strong> no total de <strong>${totalPts.toFixed(1)} ponto(s)</strong>.</li><li>Leia cada questão com atenção antes de responder.</li><li>${template==='discursiva'||template==='mista'?'Responda nas linhas abaixo de cada questão.':'Marque apenas uma alternativa por questão.'}</li></ol></div>`;
    }

    // Questões
    const questoesHtml = itens.map((it, idx) => {
      let alts = [];
      try { alts = JSON.parse(it.alternativas_json || '[]'); } catch {}
      const num = String(idx + 1).padStart(2, '0');
      const isDisc = template === 'discursiva' || (template === 'mista' && it.tipo === 'discursiva');
      const altsHtml = alts.map(a => `<div style="display:flex;gap:5px;padding:1px 0;font-size:10pt"><span style="font-weight:700;min-width:22px">(${a.letra})</span><span>${(a.texto||'').replace(/\$([^$]+)\$/g,'<i>$1</i>')}</span></div>`).join('');
      const linhasHtml = Array.from({length:6}, () => '<div style="height:16px;border-bottom:0.6pt dotted #999;margin-bottom:4px"></div>').join('');
      return `<div style="break-inside:avoid;page-break-inside:avoid;margin-bottom:10px;padding-bottom:8px;border-bottom:0.5pt dashed #ccc">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-weight:700;font-size:10pt;text-transform:uppercase">QUESTÃO ${num}</span><span style="font-size:7.5pt;color:#666">${it.disciplina||''} ${it.habilidade_bncc?`· ${it.habilidade_bncc}`:''} · ${Number(it.valor_pontos||1).toFixed(1)}pt</span></div>
        ${it.texto_apoio?`<blockquote style="border-left:3px solid #555;padding:4px 8px;font-style:italic;font-size:9.5pt;margin:4px 0;background:#f8f8f8">${it.texto_apoio}</blockquote>`:''}
        <p style="font-size:10.5pt;line-height:1.6;text-align:justify;margin:3px 0 4px">${(it.conteudo_bruto||'').replace(/\$([^$]+)\$/g,'<i>$1</i>')}</p>
        ${it.imagem_base64?`<div style="text-align:center;margin:4px 0"><img src="${it.imagem_base64}" style="max-width:85%;max-height:130px;border:0.5pt solid #ccc"/></div>`:''}
        ${isDisc ? linhasHtml : altsHtml}
      </div>`;
    }).join('');

    // Gabarito
    const gabaritoHtml = incGab ? `<div style="page-break-before:always;margin-top:20px">
      <div style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:13pt;text-transform:uppercase;margin-bottom:8px">GABARITO — ${prova.titulo||''}</div>
      <table style="width:100%;border-collapse:collapse;font-size:9.5pt">
        <thead><tr>${['Nº','Resp.','Pts','Disciplina','Nível'].map(h=>`<th style="background:#333;color:#fff;padding:4px 6px;text-align:center;font-size:8pt">${h}</th>`).join('')}</tr></thead>
        <tbody>${itens.map((it,i)=>{
          let a2=[]; try{a2=JSON.parse(it.alternativas_json||'[]');}catch{}
          const corr=a2.find(a=>a.correta)?.letra||it.correta||'—';
          const niv={facil:'Fácil',medio:'Médio',dificil:'Difícil',enem:'ENEM'}[it.nivel]||'—';
          return `<tr style="background:${i%2?'#f5f5f5':'#fff'}"><td style="padding:3px 6px;border:0.5pt solid #ccc;text-align:center;font-weight:700">${String(i+1).padStart(2,'0')}</td><td style="padding:3px 6px;border:0.5pt solid #ccc;text-align:center;font-weight:700;color:#166534">${corr}</td><td style="padding:3px 6px;border:0.5pt solid #ccc;text-align:center">${Number(it.valor_pontos||1).toFixed(1)}</td><td style="padding:3px 6px;border:0.5pt solid #ccc;text-align:center;font-size:8.5pt">${it.disciplina||'—'}</td><td style="padding:3px 6px;border:0.5pt solid #ccc;text-align:center">${niv}</td></tr>`;
        }).join('')}
        <tr style="border-top:2pt solid #333;font-weight:700"><td colspan="2" style="text-align:right;padding:4px 6px">TOTAL</td><td style="padding:4px 6px;text-align:center">${totalPts.toFixed(1)}</td><td colspan="2"></td></tr>
        </tbody>
      </table>
    </div>` : '';

    const margem = comMarg ? '10mm 12mm 14mm' : '4mm';
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${prova.titulo||'Prova'}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Source Serif 4','Times New Roman',serif;font-size:11pt;line-height:1.55;color:#000;background:#fff}
        @page{size:A4;margin:${margem}}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
        .pagina{width:210mm;min-height:297mm;margin:0 auto;padding:${margem}}
        .questoes-grid{${is2col?'column-count:2;column-gap:10mm;column-rule:0.8pt solid #555':''}}
        @media print{.pagina{width:100%}}
      </style>
    </head><body>
      <div class="pagina">
        ${cabHtml}${instrHtml}
        <div class="questoes-grid">${questoesHtml}</div>
        ${gabaritoHtml}
        <div style="position:fixed;bottom:8mm;left:12mm;right:12mm;font-size:7.5pt;color:#666;border-top:0.5pt solid #999;padding-top:3px;display:flex;justify-content:space-between">
          <span>${escola} — ${prova.disciplina||''} — ${prova.bimestre?prova.bimestre+'º Bimestre':''} ${prova.ano_letivo||''}</span>
          <span>${rodapeStr}</span>
        </div>
      </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 800);
  }, [data, itens, incGab, cfg, comCab, comMarg, mostrarInstr, rodapeStr, is2col, template, totalPts, escola, prova, sh]);

  // ── Download PDF via backend ───────────────────────────────────────────────
  const downloadPdf = useCallback(async () => {
    if (!data) return;
    setGerando(true);
    try {
      const escolaEnc = encodeURIComponent(escola);
      const gab = incGab ? '&gabarito=1' : '';
      const res = await apiService.get(`/api/provas/${provaId}/pdf?escola=${escolaEnc}${gab}`, { responseType: 'blob' });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(data.titulo||'prova').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('✅ PDF gerado e baixado com sucesso!', 'success');
    } catch (err) {
      toast(`❌ ${err?.response?.data?.message || err.message}. Use "Imprimir" como alternativa.`, 'error');
    } finally {
      setGerando(false);
    }
  }, [data, provaId, incGab, escola]);

  if (!provaId) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
      animation: 'bq-fadein 0.2s ease',
    }}>
      {feedback && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 2000,
          padding: '10px 20px', borderRadius: 10,
          background: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'error' ? '#fef2f2' : '#fffbeb',
          border: `1.5px solid ${feedback.type === 'success' ? '#86efac' : feedback.type === 'error' ? '#fca5a5' : '#fcd34d'}`,
          color: feedback.type === 'success' ? '#166534' : feedback.type === 'error' ? '#991b1b' : '#92400e',
          fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>{feedback.msg}</div>
      )}

      {/* Toolbar */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 70%, #1d4ed8 100%)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>📄</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Preview da Prova</div>
          <div style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 800 }}>{prova.titulo || 'Carregando...'}</div>
          {data && (
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
              {itens.length} questão(ões) · {totalPts.toFixed(1)} pts{cfg.embaralhar_questoes ? ' · 🎲 embaralhadas' : ''}
            </div>
          )}
        </div>

        {data && (
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 4 }}>
            {[
              { key: 'prova',    label: '📋 Prova' },
              { key: 'gabarito', label: '✅ Gabarito' },
              { key: 'latex',    label: '</> LaTeX' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setView(tab.key)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: view === tab.key ? '#fff' : 'transparent',
                  color: view === tab.key ? '#0e7490' : 'rgba(255,255,255,0.8)',
                  fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s',
                }}
              >{tab.label}</button>
            ))}
          </div>
        )}

        {data && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
            <input type="checkbox" checked={incGab} onChange={e => setIncGab(e.target.checked)} style={{ width: 14, height: 14 }} />
            Incluir gabarito
          </label>
        )}

        {data && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={imprimirBrowser} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700 }}>
              🖨️ Imprimir
            </button>
            <button onClick={downloadPdf} disabled={gerando} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: gerando ? '#64748b' : 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', cursor: gerando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 800 }}>
              {gerando ? '⏳ Gerando...' : '📥 Baixar PDF'}
            </button>
          </div>
        )}

        <button onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '1.2rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => e.target.style.background = 'rgba(220,38,38,0.4)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
          title="Fechar (Esc)"
        >×</button>
      </div>

      {/* Área de preview */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '24px 16px', background: '#334155' }}>
        {loading ? (
          <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 12, fontSize: '1rem' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #0e7490', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            Carregando prova...
          </div>
        ) : !data ? (
          <div style={{ color: '#f87171', textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>❌</div>
            Não foi possível carregar a prova.
          </div>
        ) : (
          <div style={{
            width: '210mm', minHeight: '297mm',
            background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            padding: comMarg ? '10mm 12mm 14mm' : '4mm',
            fontFamily: "'Source Serif 4', 'Times New Roman', serif",
            fontSize: '11pt', lineHeight: 1.55, color: '#000',
            position: 'relative',
            border: '1.5px solid #000',
            ...(view === 'latex' ? { fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: '8.5pt', background: '#0f172a', color: '#7dd3fc' } : {}),
          }}>

            {/* ── VIEW: Prova ── */}
            {view === 'prova' && (
              <>
                {comCab && <CabecalhoA4 prova={prova} cfg={cfg} escola={escola} />}
                {mostrarInstr && (
                  <div style={{ border: '1px solid #000', padding: '5px 10px', marginBottom: 8, fontSize: '8.5pt' }}>
                    <strong>INSTRUÇÕES:</strong>
                    <ol style={{ marginLeft: 18, marginTop: 3 }}>
                      <li>Esta avaliação contém <strong>{itens.length} questão(ões)</strong> no total de <strong>{totalPts.toFixed(1)} ponto(s)</strong>.</li>
                      <li>Leia cada questão com atenção antes de responder.</li>
                      <li>{template === 'discursiva' || template === 'mista' ? 'Responda nas linhas abaixo de cada questão com letra legível.' : 'Marque apenas uma alternativa por questão.'}</li>
                    </ol>
                  </div>
                )}
                <div style={{ ...(is2col ? { columnCount: 2, columnGap: '10mm', columnRuleWidth: '0.8pt', columnRuleStyle: 'solid', columnRuleColor: '#555' } : {}) }}>
                  {itens.map((it, idx) => (
                    <QuestaoA4 key={it.id || idx} item={it} idx={idx} template={template} modoGabarito={false} />
                  ))}
                </div>
                {/* Rodapé — 1cm fixo ao fim do conteúdo */}
                <div style={{
                  marginTop: 24,
                  height: '10mm', maxHeight: '10mm',
                  borderTop: '0.5px solid #aaa',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '6.5pt', color: '#555',
                  overflow: 'hidden', background: '#fff',
                }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '48%' }}>
                    {[escola, prova.bimestre ? prova.bimestre + 'º Bimestre' : prova.ano_letivo].filter(Boolean).join(' — ')}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '48%', fontWeight: 700, color: '#0e7490', textAlign: 'right' }}>
                    {rodapeStr}
                  </span>
                </div>
              </>
            )}

            {/* ── VIEW: Gabarito ── */}
            {view === 'gabarito' && (
              <>
                <div style={{ border: '2px solid #000', padding: '6px 10px', marginBottom: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase' }}>GABARITO — {prova.titulo || 'Avaliação'}</div>
                  <div style={{ fontSize: '8.5pt', color: '#666', marginTop: 3 }}>
                    {escola} · {prova.disciplina} · {prova.bimestre ? prova.bimestre + 'º Bimestre' : ''} {prova.ano_letivo || ''}
                  </div>
                </div>
                <GabaritoTabela itens={itens} />
                <div style={{ marginTop: 16, borderTop: '1.5pt solid #333', paddingTop: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '10pt', textTransform: 'uppercase', marginBottom: 8, color: '#0e7490' }}>Questões com gabarito marcado</div>
                  <div style={{ ...(is2col ? { columnCount: 2, columnGap: '10mm', columnRuleWidth: '0.8pt', columnRuleStyle: 'solid', columnRuleColor: '#555' } : {}) }}>
                    {itens.map((it, idx) => (
                      <QuestaoA4 key={it.id || idx} item={it} idx={idx} template={template} modoGabarito={true} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── VIEW: LaTeX ── */}
            {view === 'latex' && (
              <div>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#7dd3fc', fontWeight: 700, fontSize: '0.8rem' }}>📄 Código LaTeX — compatível com PROJETO_PROVA.tex</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(gerarLatex()); toast('✅ LaTeX copiado!', 'success'); }}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1.5px solid #0e7490', background: '#0e7490', color: '#fff', cursor: 'pointer', fontSize: '0.74rem', fontFamily: 'inherit', fontWeight: 700 }}
                  >📋 Copiar</button>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '8pt', lineHeight: 1.65, color: '#7dd3fc' }}>
                  {gerarLatex()}
                </pre>
              </div>
            )}

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bq-fadein { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
