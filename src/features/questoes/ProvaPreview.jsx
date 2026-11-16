// src/features/questoes/ProvaPreview.jsx
// 🎨 EDUCA.PROVA — Estúdio A4 Paginado em Tempo Real + Exportação Nativa (.DOCX, PDF Playwright, PDF LaTeX e Impressão)
// Clona cirurgicamente o Modelo 01 ("9º ANO-EXATAS.docx") com autonomia total por escola.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import apiService from '../../services/api';
import {
  QuestaoCorpoEstruturado,
  resumirGabaritoQuestao,
  renderQuestaoPrintHtml,
} from './utils/questaoRenderer';
import {
  PROVA_TEMPLATES,
  CORES_FAIXA_QUESTAO,
  DEFAULT_MODELO_01_CONFIG,
  gerarTextoRodapeAutomatico,
  salvarPreferenciasModeloEscola,
} from './utils/provaTemplates';

const NIVEL_LABEL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };

function getCfg(prova) {
  if (!prova) return {};
  const raw = prova.config_json;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

async function extrairMensagemErroAxios(err, fallbackMsg = 'Erro inesperado no servidor.') {
  try {
    const data = err?.response?.data;
    if (data instanceof Blob) {
      const txt = await data.text();
      try {
        const parsed = JSON.parse(txt);
        return [parsed.message, parsed.detail].filter(Boolean).join(' — ') || fallbackMsg;
      } catch {
        return txt.slice(0, 220) || fallbackMsg;
      }
    }
    if (data && typeof data === 'object') {
      return [data.message, data.detail].filter(Boolean).join(' — ') || fallbackMsg;
    }
  } catch {}
  return err?.message || fallbackMsg;
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
   BLOCO DE QUESTÃO — MODELO 01 (QUESTÃO XX + FAIXA SÓLIDA LARANJA #FF7F00)
══════════════════════════════════════════════════════════════════════════════ */
function QuestaoModelo01Card({ item, idx, corDestaque, fontBody, estiloAlternativa, mostrarMeta, modoGabarito }) {
  const num = String(idx + 1).padStart(2, '0');
  const pontos = Number(item.valor_pontos || 1);
  const fontHeader = fontBody === '10pt' ? '10.8pt' : '11.8pt';

  return (
    <div style={{ marginBottom: 11, fontFamily: "'Times New Roman', Times, serif", color: '#000' }}>
      {/* Linha separadora clonada do 9º ANO-EXATAS.docx: QUESTÃO 01 + retângulo sólido até o fim da coluna */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span style={{
          fontWeight: 700,
          fontSize: fontHeader,
          color: '#000',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          QUESTÃO {num}
          {item.fonte && !item.texto_apoio && (
            <span style={{ fontWeight: 400, fontSize: '9pt', marginLeft: 4 }}>
              ({item.fonte})
            </span>
          )}
        </span>
        <span style={{
          flex: 1,
          height: '12pt',
          background: corDestaque || '#FF7F00',
          minWidth: 18,
          display: 'block',
        }} />
        {mostrarMeta && (
          <span style={{ fontSize: '8pt', color: '#333', whiteSpace: 'nowrap' }}>
            {pontos.toFixed(1)} pt
          </span>
        )}
      </div>

      <QuestaoCorpoEstruturado
        questao={item}
        showGabarito={modoGabarito}
        modoProva={true}
        estiloAlternativa={estiloAlternativa}
        fontBodyOverride={fontBody}
        lineHeightOverride={1.36}
        estiloEditorialLimpo={true}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   QUESTÃO CLÁSSICA — Modelos 02 a 06
══════════════════════════════════════════════════════════════════════════════ */
function QuestaoA4Classica({ item, idx, template, modoGabarito }) {
  const num = String(idx + 1).padStart(2, '0');
  const pontos = Number(item.valor_pontos || 1);
  const itemNormalizado = template === 'discursiva' ? { ...item, tipo: 'discursiva' } : item;

  return (
    <div style={{
      breakInside: 'avoid', pageBreakInside: 'avoid',
      marginBottom: 10, paddingBottom: 8,
      borderBottom: '0.5pt dashed #ccc',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontWeight: 700, fontSize: '10pt', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          QUESTÃO {num}
          {item.fonte && !item.texto_apoio && (
            <span style={{ fontWeight: 600, fontSize: '8.5pt', textTransform: 'none', color: '#444', marginLeft: 5 }}>
              ({item.fonte})
            </span>
          )}
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

      <QuestaoCorpoEstruturado
        questao={itemNormalizado}
        showGabarito={modoGabarito}
        modoProva={true}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAGINADOR A4 REAL EM DUAS COLUNAS (FOLHA A FOLHA · MOLDURA FECHADA · RODAPÉ EXTERNO)
══════════════════════════════════════════════════════════════════════════════ */
function CadernoPaginadoA4({
  itens,
  liveCfg,
  rodapeTexto,
  modoGabarito = false,
  zoom = 0.88,
  onTelemetriaPaginas,
}) {
  const probeContainerRef = useRef(null);
  const colRefSample = useRef(null);
  const [paginasCols, setPaginasCols] = useState([]); // Array<{ left: number[], right: number[] }>
  const [imgTick, setImgTick] = useState(0);

  const corDestaque = liveCfg.cor_destaque || '#FF7F00';
  const fontBody = liveCfg.densidade_fonte || '11pt';
  const fontHeader = fontBody === '10pt' ? '10.8pt' : '11.8pt';
  const estiloAlt = liveCfg.estilo_alternativa || 'minuscula_parentese';
  const mostrarDivisoresDisc = liveCfg.mostrar_divisores_disciplina ?? true;
  const mostrarMeta = Boolean(liveCfg.mostrar_meta_questao);
  const numerarRodape = Boolean(liveCfg.numerar_paginas_rodape);
  const fechamento = liveCfg.fechamento_caderno || 'nenhum';

  // Monta sequência linear de blocos (divisores de disciplina + questões + fechamento)
  const flowDescriptors = useMemo(() => {
    const list = [];
    let ultimaDisc = '';
    itens.forEach((it, idx) => {
      const discUp = String(it.disciplina || '').trim().toUpperCase();
      if (mostrarDivisoresDisc && discUp && discUp !== ultimaDisc) {
        ultimaDisc = discUp;
        list.push({ key: `disc_${idx}_${discUp}`, kind: 'disc', label: discUp, keepNext: true });
      }
      list.push({ key: `q_${it.item_id || it.id || idx}`, kind: 'questao', item: it, idx, keepNext: false });
    });
    if (fechamento === 'rascunho') {
      list.push({ key: 'fech_rascunho', kind: 'rascunho', keepNext: false });
    } else if (fechamento === 'boa_prova') {
      list.push({ key: 'fech_boaprova', kind: 'boa_prova', keepNext: false });
    }
    return list;
  }, [itens, mostrarDivisoresDisc, fechamento]);

  const renderFlowBlock = (desc) => {
    if (desc.kind === 'disc') {
      return (
        <div style={{
          textAlign: 'center', fontWeight: 700, fontSize: fontHeader,
          margin: '2px 0 9px', fontFamily: "'Times New Roman', Times, serif", color: '#000',
        }}>
          <span style={{ textDecoration: 'underline' }}>{desc.label}</span>
        </div>
      );
    }
    if (desc.kind === 'rascunho') {
      return (
        <div style={{ marginTop: 12, textAlign: 'center', fontFamily: "'Times New Roman', Times, serif", color: '#000' }}>
          <div style={{ fontWeight: 700, textDecoration: 'underline', fontSize: fontHeader, marginBottom: 6 }}>
            RASCUNHO
          </div>
          <div style={{ height: 110 }} />
        </div>
      );
    }
    if (desc.kind === 'boa_prova') {
      return (
        <div style={{
          marginTop: 14, textAlign: 'center', fontWeight: 700,
          fontSize: fontHeader, fontFamily: "'Times New Roman', Times, serif", color: '#000',
        }}>
          BOA PROVA!
        </div>
      );
    }
    return (
      <QuestaoModelo01Card
        item={desc.item}
        idx={desc.idx}
        corDestaque={corDestaque}
        fontBody={fontBody}
        estiloAlternativa={estiloAlt}
        mostrarMeta={mostrarMeta}
        modoGabarito={modoGabarito}
      />
    );
  };

  // Mede alturas reais e empacota coluna por coluna
  const recalcularPaginacao = useCallback(() => {
    const probe = probeContainerRef.current;
    if (!probe) return;
    const maxColH = colRefSample.current?.clientHeight
      ? Math.max(420, colRefSample.current.clientHeight - 2)
      : 1002; // ~265.5mm a 96dpi

    const children = Array.from(probe.children);
    if (children.length === 0) {
      setPaginasCols([{ left: [], right: [] }]);
      if (onTelemetriaPaginas) onTelemetriaPaginas({ totalPaginas: 1, ocupacaoUltimaPct: 0 });
      return;
    }

    const medidas = children.map((el, i) => {
      const st = window.getComputedStyle(el);
      const mt = parseFloat(st.marginTop) || 0;
      const mb = parseFloat(st.marginBottom) || 0;
      return {
        i,
        h: el.offsetHeight + mt + mb,
        keepNext: Boolean(flowDescriptors[i]?.keepNext),
      };
    });

    const cols = [[]];
    const colHeights = [0];

    for (let k = 0; k < medidas.length; k++) {
      const m = medidas[k];
      const nextH = m.keepNext && medidas[k + 1] ? medidas[k + 1].h : 0;
      const curIdx = cols.length - 1;
      if (cols[curIdx].length > 0 && colHeights[curIdx] + m.h + nextH > maxColH) {
        cols.push([]);
        colHeights.push(0);
      }
      const targetIdx = cols.length - 1;
      cols[targetIdx].push(m.i);
      colHeights[targetIdx] += m.h;
    }

    const sheets = [];
    const totalSheets = Math.max(1, Math.ceil(cols.length / 2));
    for (let p = 0; p < totalSheets; p++) {
      sheets.push({
        left: cols[p * 2] || [],
        right: cols[p * 2 + 1] || [],
      });
    }

    const lastLeftH = colHeights[(totalSheets - 1) * 2] || 0;
    const lastRightH = colHeights[(totalSheets - 1) * 2 + 1] || 0;
    const ocupacaoUltimaPct = Math.min(100, Math.round(((lastLeftH + lastRightH) / (2 * maxColH)) * 100));

    setPaginasCols(sheets);
    if (onTelemetriaPaginas) {
      onTelemetriaPaginas({ totalPaginas: totalSheets, ocupacaoUltimaPct });
    }
  }, [flowDescriptors, onTelemetriaPaginas]);

  useEffect(() => {
    const t = setTimeout(recalcularPaginacao, 45);
    return () => clearTimeout(t);
  }, [recalcularPaginacao, corDestaque, fontBody, estiloAlt, mostrarMeta, modoGabarito, imgTick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, position: 'relative' }}>
      {/* Sonda invisível de largura idêntica a 1 coluna do caderno A4 (84.8mm) */}
      <div
        ref={probeContainerRef}
        onLoadCapture={() => setImgTick((n) => n + 1)}
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: '84.8mm',
          visibility: 'hidden',
          pointerEvents: 'none',
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: fontBody,
          lineHeight: 1.36,
        }}
      >
        {flowDescriptors.map((desc) => (
          <div key={desc.key}>{renderFlowBlock(desc)}</div>
        ))}
      </div>

      {/* Renderização real das folhas A4 */}
      {(paginasCols.length ? paginasCols : [{ left: [], right: [] }]).map((sheet, pIdx) => {
        const folhaFisica = Math.floor(pIdx / 2) + 1;
        const face = pIdx % 2 === 0 ? 'Frente' : 'Verso';
        return (
          <div key={pIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {/* Etiqueta da Folha no Estúdio */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '4px 14px', borderRadius: 99,
              background: 'rgba(15, 23, 42, 0.78)', border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#e2e8f0', fontSize: '0.73rem', fontWeight: 700,
            }}>
              <span>📄 Página {pIdx + 1} de {paginasCols.length}</span>
              <span style={{ color: '#94a3b8' }}>·</span>
              <span style={{ color: '#fb923c' }}>Folha {folhaFisica} ({face})</span>
            </div>

            {/* Wrapper com escala de zoom preservando fluxo visual */}
            <div style={{
              width: `calc(210mm * ${zoom})`,
              height: `calc(297mm * ${zoom})`,
              position: 'relative',
            }}>
              <div style={{
                width: '210mm',
                height: '297mm',
                background: '#ffffff',
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                boxShadow: '0 14px 44px rgba(0,0,0,0.45)',
                overflow: 'hidden',
              }}>
                {/* Moldura preta fechada 2.25pt nos 4 lados */}
                <div style={{
                  position: 'absolute',
                  top: '8.5mm',
                  left: '9.5mm',
                  right: '9.5mm',
                  bottom: '14mm',
                  border: '2.25pt solid #000000',
                  padding: '4.5mm 5mm',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 0.85pt minmax(0, 1fr)',
                    columnGap: '5.5mm',
                  }}>
                    {/* Coluna Esquerda */}
                    <div
                      ref={pIdx === 0 ? colRefSample : null}
                      style={{ minWidth: 0, height: '100%', overflow: 'hidden' }}
                    >
                      {sheet.left.map((dIdx) => {
                        const desc = flowDescriptors[dIdx];
                        return desc ? <div key={desc.key}>{renderFlowBlock(desc)}</div> : null;
                      })}
                    </div>

                    {/* Linha vertical divisória central */}
                    <div style={{ width: '0.85pt', height: '100%', background: '#000000' }} />

                    {/* Coluna Direita */}
                    <div style={{ minWidth: 0, height: '100%', overflow: 'hidden' }}>
                      {sheet.right.map((dIdx) => {
                        const desc = flowDescriptors[dIdx];
                        return desc ? <div key={desc.key}>{renderFlowBlock(desc)}</div> : null;
                      })}
                    </div>
                  </div>
                </div>

                {/* Rodapé posicionado ESTRITAMENTE FORA (abaixo) da moldura da página */}
                <div style={{
                  position: 'absolute',
                  left: '9.5mm',
                  right: '9.5mm',
                  bottom: '4.2mm',
                  height: '7.5mm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Times New Roman', Times, serif",
                  fontSize: '11pt',
                  color: '#000000',
                  letterSpacing: '0.02em',
                }}>
                  <span style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rodapeTexto}
                  </span>
                  {numerarRodape && (
                    <span style={{ position: 'absolute', right: 0, fontSize: '9pt', color: '#333' }}>
                      Pág. {pIdx + 1}/{paginasCols.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
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
          {['Nº', 'Resposta', 'Pontos', 'Disciplina', 'Nível', 'BNCC'].map((h) => (
            <th key={h} style={{ background: '#1e293b', color: '#fff', padding: '5px 6px', textAlign: 'center', fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {itens.map((it, idx) => {
          const corr = resumirGabaritoQuestao(it);
          const nivel = NIVEL_LABEL[it.nivel] || it.nivel || '—';
          return (
            <tr key={idx} style={{ background: idx % 2 ? '#f8fafc' : '#fff' }}>
              <td style={{ padding: '4px 6px', border: '0.5pt solid #cbd5e1', textAlign: 'center', fontWeight: 700 }}>{String(idx + 1).padStart(2, '0')}</td>
              <td style={{ padding: '4px 6px', border: '0.5pt solid #cbd5e1', textAlign: 'center', fontWeight: 700, color: '#166534' }}>{corr}</td>
              <td style={{ padding: '4px 6px', border: '0.5pt solid #cbd5e1', textAlign: 'center' }}>{Number(it.valor_pontos || 1).toFixed(1)}</td>
              <td style={{ padding: '4px 6px', border: '0.5pt solid #cbd5e1', textAlign: 'center', fontSize: '8.5pt' }}>{it.disciplina || '—'}</td>
              <td style={{ padding: '4px 6px', border: '0.5pt solid #cbd5e1', textAlign: 'center' }}>{nivel}</td>
              <td style={{ padding: '4px 6px', border: '0.5pt solid #cbd5e1', textAlign: 'center', fontSize: '8pt', color: '#7c3aed' }}>{it.habilidade_bncc || '—'}</td>
            </tr>
          );
        })}
        <tr style={{ borderTop: '2pt solid #1e293b', fontWeight: 700, background: '#f1f5f9' }}>
          <td colSpan={2} style={{ padding: '5px 6px', textAlign: 'right' }}>TOTAL</td>
          <td style={{ padding: '5px 6px', textAlign: 'center' }}>{totalPts.toFixed(1)}</td>
          <td colSpan={3} />
        </tr>
      </tbody>
    </table>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CABEÇALHO A4 — Modelos Clássicos (02 a 06)
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

      {sh('cab_titulo') && (
        <div style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #000', paddingTop: 5, marginTop: 4 }}>
          {prova.titulo || 'Avaliação'}
        </div>
      )}

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
   COMPONENTE PRINCIPAL — ProvaPreview
══════════════════════════════════════════════════════════════════════════════ */
export default function ProvaPreview({ provaId, onClose, onUpdated }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState('prova');
  const [gerando,      setGerando]      = useState(false);
  const [gerandoLatex, setGerandoLatex] = useState(false);
  const [gerandoDocx,  setGerandoDocx]  = useState(false);
  const [feedback,     setFeedback]     = useState(null);
  const [incGab,       setIncGab]       = useState(false);
  const [zoom,         setZoom]         = useState(0.86);

  // Estado interativo do Modelo / Configurações de Diagramação ao Vivo
  const [liveTemplate, setLiveTemplate] = useState('modelo_01_provao');
  const [liveCfg,      setLiveCfg]      = useState({ ...DEFAULT_MODELO_01_CONFIG });
  const [dirtyCfg,     setDirtyCfg]     = useState(false);
  const [telemetriaPag, setTelemetriaPag] = useState({ totalPaginas: 1, ocupacaoUltimaPct: 100 });

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    if (!provaId) return;
    setLoading(true);
    apiService.get(`/api/provas/${provaId}`)
      .then((res) => {
        const p = res.data || {};
        const cfgInicial = getCfg(p);
        const tpl = cfgInicial.modelo_slug || p.template_slug || 'modelo_01_provao';
        setData({ ...p, template_slug: tpl });
        setLiveTemplate(tpl);
        setLiveCfg({
          ...DEFAULT_MODELO_01_CONFIG,
          ...cfgInicial,
          modelo_slug: tpl,
        });
        setDirtyCfg(false);
      })
      .catch(() => setFeedback({ msg: 'Erro ao carregar prova.', type: 'error' }))
      .finally(() => setLoading(false));
  }, [provaId]);

  const toast = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3200);
  };

  const patchLiveCfg = (partial) => {
    setLiveCfg((prev) => ({ ...prev, ...partial }));
    setDirtyCfg(true);
  };

  const changeLiveTemplate = (novoSlug) => {
    setLiveTemplate(novoSlug);
    setLiveCfg((prev) => ({ ...prev, modelo_slug: novoSlug }));
    setDirtyCfg(true);
  };

  // Persiste ajustes visuais feitos no Estúdio antes de exportar PDF/DOCX/LaTeX
  const persistirAjustesSeNecessario = useCallback(async () => {
    if (!data || !dirtyCfg) return;
    const cfgSincronizada = { ...liveCfg, modelo_slug: liveTemplate };
    try {
      await apiService.put(`/api/provas/${provaId}`, {
        titulo: data.titulo,
        disciplina: data.disciplina,
        turma: data.turma,
        bimestre: data.bimestre,
        ano_letivo: data.ano_letivo,
        template_slug: liveTemplate,
        config_json: cfgSincronizada,
        status: data.status || 'montando',
      });
      setData((prev) => (prev ? { ...prev, template_slug: liveTemplate, config_json: cfgSincronizada } : prev));
      setDirtyCfg(false);
      if (onUpdated) onUpdated({ template_slug: liveTemplate, config_json: cfgSincronizada });
    } catch (err) {
      console.warn('[ProvaPreview] Falha ao persistir modelo antes de exportar:', err);
    }
  }, [data, dirtyCfg, provaId, liveTemplate, liveCfg, onUpdated]);

  const salvarComoPadraoEscola = () => {
    salvarPreferenciasModeloEscola({
      template_slug: liveTemplate,
      cor_destaque: liveCfg.cor_destaque,
      densidade_fonte: liveCfg.densidade_fonte,
      estilo_alternativa: liveCfg.estilo_alternativa,
      mostrar_divisores_disciplina: liveCfg.mostrar_divisores_disciplina,
      fechamento_caderno: liveCfg.fechamento_caderno,
    });
    toast('⭐ Modelo e estilo definidos como padrão desta escola!', 'success');
  };

  // ── Dados derivados ────────────────────────────────────────────────────────
  const prova      = data || {};
  const escola     = localStorage.getItem('nome_escola') || localStorage.getItem('escola_nome') || 'EDUCA.MELHOR';
  const isModelo01 = liveTemplate === 'modelo_01_provao';
  const is2col     = ['modelo_01_provao', 'objetiva_2col', 'enem'].includes(liveTemplate);

  const itensRaw = data?.itens || [];
  const itens = useMemo(() => {
    return liveCfg.embaralhar_questoes ? shuffleArr(itensRaw) : itensRaw;
  }, [itensRaw, liveCfg.embaralhar_questoes]);

  const totalPts      = itens.reduce((s, it) => s + Number(it.valor_pontos || 1), 0);
  const comCab        = isModelo01 ? false : (liveCfg.com_cabecalho ?? true);
  const comMarg       = liveCfg.com_margem ?? true;
  const rodapeAutoM01 = gerarTextoRodapeAutomatico(prova, liveCfg);
  const rodapeStr     = liveCfg.rodape_texto ? `EDUCA.PROVA · ${liveCfg.rodape_texto}` : 'EDUCA.PROVA';
  const mostrarInstr  = !isModelo01 && (liveCfg.cabecalho_itens?.cab_instrucoes ?? true) && comCab;
  const cabItens      = liveCfg.cabecalho_itens ?? {};
  const sh            = (k) => cabItens[k] ?? true;

  // ── LaTeX preview ──────────────────────────────────────────────────────────
  const gerarLatex = useCallback(() => {
    if (!data) return '';
    const corHex = String(liveCfg.cor_destaque || '#FF7F00').replace('#', '').toUpperCase();
    const questoes = itens.map((it, idx) => {
      let alts = [];
      try {
        alts = Array.isArray(it.alternativas_json)
          ? it.alternativas_json
          : JSON.parse(it.alternativas_json || '[]');
      } catch {}
      const num = String(idx + 1).padStart(2, '0');
      const altsLatex = alts.map((a) => `\t\\item[${String(a.letra || '').toLowerCase()})] ${a.texto || ''}`).join('\n');
      return `\\noindent\n\\textbf{QUESTÃO ${num}}\\hspace{0.2cm}{\\color{corDestaque}\\leaders\\hrule height 8.8pt depth 2.2pt\\hfill\\kern0pt}\\par\\vspace{2pt}\n\n${it.conteudo_bruto || ''}\n\n${alts.length > 0 ? `\\begin{itemize}\n${altsLatex}\n\\end{itemize}` : ''}\n\n\\vspace{.35cm}`;
    });
    return `\\documentclass{article}\n\\definecolor{corDestaque}{HTML}{${corHex}}\n\n\\begin{document}\n\t\\fontsize{${liveCfg.densidade_fonte || '11pt'}}{13.5pt}\\selectfont\n\n\t${is2col ? '\\begin{multicols*}{2}\n\t\t\\setlength{\\columnseprule}{0.85pt}\n' : ''}\n${questoes.join('\n\n')}\n\t${is2col ? '\\end{multicols*}' : ''}\n\t% Rodapé externo fora da moldura: ${rodapeAutoM01}\n\\end{document}`;
  }, [data, itens, is2col, liveCfg.cor_destaque, liveCfg.densidade_fonte, rodapeAutoM01]);

  // ── IMPRIMIR via browser (usa paginação folha a folha real no Modelo 01!) ──
  const imprimirBrowser = useCallback(async () => {
    if (!data) return;
    await persistirAjustesSeNecessario();

    const win = window.open('', '_blank', 'width=960,height=760');
    if (!win) {
      toast('⚠️ Popup bloqueado. Permita pop-ups para imprimir.', 'warn');
      return;
    }

    if (isModelo01) {
      // Busca o HTML oficial paginado folha a folha diretamente do backend para fidelidade 100%
      try {
        const gabParam = incGab ? '?gabarito=1' : '';
        const res = await apiService.get(`/api/provas/${provaId}/html${gabParam}`, { responseType: 'text' });
        const rawHtml = typeof res.data === 'string' ? res.data : String(res.data || '');
        const autoPrintPatch = rawHtml.replace(
          'document.body.dataset.paginated = \'ready\';',
          'document.body.dataset.paginated = \'ready\'; setTimeout(function(){ window.focus(); window.print(); }, 280);'
        );
        win.document.open();
        win.document.write(autoPrintPatch);
        win.document.close();
        return;
      } catch {
        // Fallback local se necessário
      }
    }

    // Impressão clássica para Modelos 02..06
    let cabHtml = '';
    if (comCab) {
      const logoHtml   = sh('cab_logo')   ? `<div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;border:1.5px solid #333;font-size:20px;flex-shrink:0">🏫</div>` : '';
      const escolaHtml = sh('cab_escola') ? `<div style="flex:1;text-align:center"><div style="font-size:11.5pt;font-weight:700;text-transform:uppercase">${escola}</div><div style="font-size:8.5pt;color:#333">Sistema de Ensino EDUCA.MELHOR</div></div>` : '';
      const topoHtml   = (sh('cab_logo') || sh('cab_escola')) ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">${logoHtml}${escolaHtml}</div>` : '';
      const tituloHtml = sh('cab_titulo') ? `<div style="text-align:center;font-size:13pt;font-weight:700;text-transform:uppercase;border-top:1px solid #000;padding-top:5px;margin-top:4px">${prova.titulo||'Avaliação'}</div>` : '';
      cabHtml = `<div style="border:2px solid #000;padding:6px 10px;margin-bottom:6px">${topoHtml}${tituloHtml}</div>`;
    }

    const questoesHtml = itens.map((it, idx) => renderQuestaoPrintHtml(it, idx, liveTemplate, false, {
      isModelo01: false,
      corDestaque: liveCfg.cor_destaque,
      estiloAlternativa: liveCfg.estilo_alternativa,
      fontBody: liveCfg.densidade_fonte || '10pt',
    })).join('');

    const margem = comMarg ? '10mm 12mm 14mm' : '4mm';
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${prova.titulo||'Prova'}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Times New Roman',serif;font-size:10.5pt;line-height:1.5;color:#000;background:#fff}
        @page{size:A4;margin:${margem}}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
        .pagina{width:210mm;min-height:297mm;margin:0 auto;padding:${margem}}
        .questoes-grid{${is2col?'column-count:2;column-gap:10mm;column-rule:0.8pt solid #555':''}}
        img{max-width:100%;height:auto;object-fit:contain}
      </style></head><body><div class="pagina">${cabHtml}<div class="questoes-grid">${questoesHtml}</div></div>
      <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script></body></html>`);
    win.document.close();
  }, [data, persistirAjustesSeNecessario, isModelo01, incGab, provaId, comCab, sh, escola, prova.titulo, itens, liveTemplate, liveCfg, comMarg, is2col]);

  // ── Download Word Editável (.DOCX OpenXML) ─────────────────────────────────
  const downloadDocx = useCallback(async () => {
    if (!data) return;
    setGerandoDocx(true);
    try {
      await persistirAjustesSeNecessario();
      const escolaEnc = encodeURIComponent(escola);
      const gab = incGab ? '&gabarito=1' : '';
      const res = await apiService.get(`/api/provas/${provaId}/docx?escola=${escolaEnc}${gab}`, { responseType: 'blob' });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(data.titulo || 'prova').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('📝 Arquivo Word (.docx) gerado e baixado com sucesso!', 'success');
    } catch (err) {
      const msg = await extrairMensagemErroAxios(err, 'Erro ao gerar Word (.docx).');
      toast(`❌ ${msg}`, 'error');
    } finally {
      setGerandoDocx(false);
    }
  }, [data, persistirAjustesSeNecessario, escola, incGab, provaId]);

  // ── Download PDF Rápido via backend (Playwright A4 Paginado) ───────────────
  const downloadPdf = useCallback(async () => {
    if (!data) return;
    setGerando(true);
    try {
      await persistirAjustesSeNecessario();
      const escolaEnc = encodeURIComponent(escola);
      const gab = incGab ? '&gabarito=1' : '';
      const res = await apiService.get(`/api/provas/${provaId}/pdf?escola=${escolaEnc}${gab}`, { responseType: 'blob' });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(data.titulo || 'prova').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('✅ PDF A4 gerado e baixado com sucesso!', 'success');
    } catch (err) {
      const msg = await extrairMensagemErroAxios(err, 'Erro ao gerar PDF A4.');
      toast(`❌ ${msg}`, 'error');
    } finally {
      setGerando(false);
    }
  }, [data, persistirAjustesSeNecessario, escola, incGab, provaId]);

  // ── Download PDF Premium via LaTeX/Tectonic ───────────────────────────────
  const downloadLatexPdf = useCallback(async () => {
    if (!data) return;
    setGerandoLatex(true);
    try {
      await persistirAjustesSeNecessario();
      const escolaEnc = encodeURIComponent(escola);
      const gab = incGab ? '&gabarito=1' : '';
      const res = await apiService.get(
        `/api/provas/${provaId}/pdf-latex?escola=${escolaEnc}${gab}`,
        { responseType: 'blob' }
      );
      const blob = res.data;
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${(data.titulo || 'prova').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-latex.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('⭐ PDF LaTeX gerado com sucesso!', 'success');
    } catch (err) {
      const msg = await extrairMensagemErroAxios(err, 'Erro ao gerar PDF LaTeX.');
      toast(`❌ ${msg}`, 'error');
    } finally {
      setGerandoLatex(false);
    }
  }, [data, persistirAjustesSeNecessario, escola, incGab, provaId]);

  if (!provaId) return null;

  const busy = gerando || gerandoLatex || gerandoDocx;
  const folhasFrenteVerso = Math.ceil((telemetriaPag.totalPaginas || 1) / 2);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
      animation: 'bq-fadein 0.2s ease',
    }}>
      {feedback && (
        <div style={{
          position: 'fixed', top: 18, right: 24, zIndex: 2100,
          padding: '10px 20px', borderRadius: 10,
          background: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'error' ? '#fef2f2' : '#fffbeb',
          border: `1.5px solid ${feedback.type === 'success' ? '#86efac' : feedback.type === 'error' ? '#fca5a5' : '#fcd34d'}`,
          color: feedback.type === 'success' ? '#166534' : feedback.type === 'error' ? '#991b1b' : '#92400e',
          fontWeight: 700, fontSize: '0.84rem', boxShadow: '0 6px 24px rgba(0,0,0,0.28)',
        }}>{feedback.msg}</div>
      )}

      {/* ── BARRA SUPERIOR 1: Título + Visualizações + Exportações ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0e7490 100%)',
        padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.64rem', color: '#fb923c', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Estúdio Editorial A4
            </span>
            {isModelo01 && data && (
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, padding: '2px 9px', borderRadius: 99,
                background: 'rgba(251, 146, 60, 0.18)', color: '#fdba74', border: '1px solid rgba(251, 146, 60, 0.35)',
              }}>
                📄 {telemetriaPag.totalPaginas} pág. A4 ({folhasFrenteVerso} folha{folhasFrenteVerso > 1 ? 's' : ''} F/V) · Ocupação final: {telemetriaPag.ocupacaoUltimaPct}%
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.94rem', color: '#fff', fontWeight: 800, marginTop: 1 }}>
            {prova.titulo || 'Carregando...'}
          </div>
        </div>

        {data && (
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 3 }}>
            {[
              { key: 'prova',    label: '📋 Caderno' },
              { key: 'gabarito', label: '✅ Gabarito' },
              { key: 'latex',    label: '</> LaTeX' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                style={{
                  padding: '5px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: view === tab.key ? '#fff' : 'transparent',
                  color: view === tab.key ? '#0f172a' : 'rgba(255,255,255,0.82)',
                  fontWeight: 700, fontSize: '0.76rem',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {data && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#e2e8f0', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={incGab} onChange={(e) => setIncGab(e.target.checked)} style={{ width: 14, height: 14 }} />
            Anexar gabarito
          </label>
        )}

        {data && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={imprimirBrowser}
              disabled={busy}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 700 }}
            >
              🖨️ Imprimir
            </button>

            <button
              onClick={downloadDocx}
              disabled={busy}
              title="Baixar arquivo Microsoft Word (.docx) 100% editável com moldura, 2 colunas, faixas e figuras"
              style={{ padding: '7px 13px', borderRadius: 8, border: 'none', background: gerandoDocx ? '#64748b' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 800, boxShadow: '0 2px 10px rgba(37,99,235,0.35)' }}
            >
              {gerandoDocx ? '⏳ Gerando Word...' : '📝 Word (.docx)'}
            </button>

            <button
              onClick={downloadPdf}
              disabled={busy}
              title="Baixar PDF A4 paginado pronto para gráfica"
              style={{ padding: '7px 13px', borderRadius: 8, border: 'none', background: gerando ? '#64748b' : 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 800, boxShadow: '0 2px 10px rgba(234,88,12,0.35)' }}
            >
              {gerando ? '⏳ Gerando PDF...' : '📥 Baixar PDF A4'}
            </button>

            <button
              onClick={downloadLatexPdf}
              disabled={busy}
              title="Compilar PDF científico via LaTeX/Tectonic"
              style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: gerandoLatex ? '#64748b' : 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 800 }}
            >
              {gerandoLatex ? '⏳ LaTeX...' : '⭐ PDF LaTeX'}
            </button>
          </div>
        )}

        <button
          onClick={async () => { await persistirAjustesSeNecessario(); onClose(); }}
          style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: '1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Fechar (Esc)"
        >
          ×
        </button>
      </div>

      {/* ── BARRA SUPERIOR 2: Controles Editoriais ao Vivo (Autonomia da Escola) ── */}
      {data && view !== 'latex' && (
        <div style={{
          background: '#1e293b', padding: '8px 18px', display: 'flex', alignItems: 'center',
          gap: 14, flexWrap: 'wrap', borderBottom: '1px solid #334155', flexShrink: 0,
        }}>
          {/* Seletor de Modelo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>Modelo:</span>
            <select
              value={liveTemplate}
              onChange={(e) => changeLiveTemplate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              {PROVA_TEMPLATES.map((t) => (
                <option key={t.slug} value={t.slug}>{t.numero} — {t.label}</option>
              ))}
            </select>
          </div>

          {isModelo01 && (
            <>
              {/* Cor da Faixa Separadora */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>Faixa:</span>
                {CORES_FAIXA_QUESTAO.map((c) => {
                  const active = (liveCfg.cor_destaque || '#FF7F00').toUpperCase() === c.hex.toUpperCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => patchLiveCfg({ cor_destaque: c.hex })}
                      title={`${c.nome} — ${c.desc}`}
                      style={{
                        width: 18, height: 18, borderRadius: 4, background: c.hex, cursor: 'pointer',
                        border: active ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.25)',
                        boxShadow: active ? `0 0 0 2px ${c.hex}` : 'none',
                      }}
                    />
                  );
                })}
                <input
                  type="color"
                  value={liveCfg.cor_destaque || '#FF7F00'}
                  onChange={(e) => patchLiveCfg({ cor_destaque: e.target.value })}
                  title="Escolher cor personalizada da escola"
                  style={{ width: 22, height: 20, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
              </div>

              {/* Densidade Tipográfica (Economia de Papel) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>Fonte:</span>
                {[
                  { v: '10pt', lbl: '10pt Econômica' },
                  { v: '11pt', lbl: '11pt Padrão' },
                  { v: '12pt', lbl: '12pt Original' },
                ].map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => patchLiveCfg({ densidade_fonte: d.v })}
                    style={{
                      padding: '3px 8px', borderRadius: 5, fontSize: '0.71rem', fontWeight: 700, cursor: 'pointer',
                      border: '1px solid #475569',
                      background: (liveCfg.densidade_fonte || '11pt') === d.v ? '#ea580c' : '#0f172a',
                      color: '#fff',
                    }}
                  >
                    {d.lbl}
                  </button>
                ))}
              </div>

              {/* Estilo de Alternativa */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => patchLiveCfg({
                    estilo_alternativa: liveCfg.estilo_alternativa === 'maiuscula_parenteses'
                      ? 'minuscula_parentese'
                      : 'maiuscula_parenteses',
                  })}
                  style={{
                    padding: '3px 8px', borderRadius: 5, fontSize: '0.71rem', fontWeight: 700, cursor: 'pointer',
                    border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0',
                  }}
                  title="Alternar formato das letras das alternativas"
                >
                  Opções: {liveCfg.estilo_alternativa === 'maiuscula_parenteses' ? '(A) (B)' : 'a) b)'}
                </button>

                <button
                  type="button"
                  onClick={() => patchLiveCfg({ mostrar_divisores_disciplina: !(liveCfg.mostrar_divisores_disciplina ?? true) })}
                  style={{
                    padding: '3px 8px', borderRadius: 5, fontSize: '0.71rem', fontWeight: 700, cursor: 'pointer',
                    border: '1px solid #475569',
                    background: (liveCfg.mostrar_divisores_disciplina ?? true) ? 'rgba(14,116,144,0.45)' : '#0f172a',
                    color: '#e2e8f0',
                  }}
                >
                  {(liveCfg.mostrar_divisores_disciplina ?? true) ? '✓ Divisores Disciplina' : 'Divisores Disciplina'}
                </button>

                <select
                  value={liveCfg.fechamento_caderno || 'nenhum'}
                  onChange={(e) => patchLiveCfg({ fechamento_caderno: e.target.value })}
                  style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: '0.71rem', fontWeight: 700 }}
                  title="Bloco final após a última questão"
                >
                  <option value="nenhum">Sem fechamento extra</option>
                  <option value="rascunho">+ Espaço RASCUNHO</option>
                  <option value="boa_prova">+ BOA PROVA!</option>
                </select>
              </div>

              {/* Texto do Rodapé Externo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 210 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>Rodapé externo:</span>
                <input
                  type="text"
                  value={liveCfg.rodape_texto || ''}
                  onChange={(e) => patchLiveCfg({ rodape_texto: e.target.value })}
                  placeholder={gerarTextoRodapeAutomatico(prova, { rodape_texto: '' })}
                  style={{
                    flex: 1, padding: '3px 8px', borderRadius: 5, border: '1px solid #475569',
                    background: '#0f172a', color: '#f8fafc', fontSize: '0.73rem',
                  }}
                />
              </div>
            </>
          )}

          {/* Zoom + Salvar Padrão Escola */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            {[0.72, 0.86, 1].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                style={{
                  padding: '3px 7px', borderRadius: 5, fontSize: '0.69rem', fontWeight: 700, cursor: 'pointer',
                  border: '1px solid #475569', background: zoom === z ? '#334155' : '#0f172a', color: '#e2e8f0',
                }}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
            <button
              type="button"
              onClick={salvarComoPadraoEscola}
              title="Define este modelo e estilo como padrão automático para as próximas provas desta escola"
              style={{
                padding: '3px 9px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                border: '1px solid rgba(250, 204, 21, 0.45)', background: 'rgba(250, 204, 21, 0.14)', color: '#fde047',
              }}
            >
              ⭐ Padrão da Escola
            </button>
          </div>
        </div>
      )}

      {/* Dica proativa de economia de papel quando última página tem ocupação muito baixa */}
      {data && isModelo01 && view === 'prova' && telemetriaPag.totalPaginas > 1 && telemetriaPag.ocupacaoUltimaPct > 0 && telemetriaPag.ocupacaoUltimaPct <= 24 && liveCfg.densidade_fonte !== '10pt' && (
        <div style={{
          background: '#431407', color: '#fed7aa', padding: '5px 18px', fontSize: '0.74rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderBottom: '1px solid #7c2d12',
        }}>
          <span>💡 A última página está com apenas <strong>{telemetriaPag.ocupacaoUltimaPct}%</strong> de ocupação.</span>
          <button
            type="button"
            onClick={() => patchLiveCfg({ densidade_fonte: '10pt' })}
            style={{ padding: '2px 10px', borderRadius: 99, border: 'none', background: '#ea580c', color: '#fff', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
          >
            Testar Fonte 10pt Econômica (-1 página)
          </button>
        </div>
      )}

      {/* ── ÁREA CENTRAL DE PREVIEW ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '24px 16px 40px', background: '#334155' }}>
        {loading ? (
          <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 12, fontSize: '1rem' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #ea580c', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            Montando páginas A4 da prova...
          </div>
        ) : !data ? (
          <div style={{ color: '#f87171', textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>❌</div>
            Não foi possível carregar a prova.
          </div>
        ) : view === 'prova' && isModelo01 ? (
          <CadernoPaginadoA4
            itens={itens}
            liveCfg={liveCfg}
            rodapeTexto={rodapeAutoM01}
            modoGabarito={false}
            zoom={zoom}
            onTelemetriaPaginas={setTelemetriaPag}
          />
        ) : view === 'gabarito' && isModelo01 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
            {/* Folha de Resumo do Gabarito Oficial */}
            <div style={{
              width: '210mm', background: '#fff', padding: '14mm 16mm',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)', border: '2.25pt solid #000',
              fontFamily: "'Times New Roman', Times, serif", color: '#000',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '13pt', fontWeight: 700, textDecoration: 'underline', textTransform: 'uppercase' }}>
                  GABARITO OFICIAL — {prova.titulo || 'AVALIAÇÃO'}
                </div>
                <div style={{ fontSize: '9.5pt', color: '#334155', marginTop: 3 }}>
                  {rodapeAutoM01}
                </div>
              </div>
              <GabaritoTabela itens={itens} />
            </div>

            {/* Caderno completo com respostas marcadas */}
            <CadernoPaginadoA4
              itens={itens}
              liveCfg={liveCfg}
              rodapeTexto={`${rodapeAutoM01} — GABARITO`}
              modoGabarito={true}
              zoom={zoom}
            />
          </div>
        ) : (
          /* Modelos Clássicos 02..06 e aba LaTeX */
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
            {view === 'prova' && (
              <>
                {comCab && <CabecalhoA4 prova={prova} cfg={liveCfg} escola={escola} />}
                {mostrarInstr && (
                  <div style={{ border: '1px solid #000', padding: '5px 10px', marginBottom: 8, fontSize: '8.5pt' }}>
                    <strong>INSTRUÇÕES:</strong>
                    <ol style={{ marginLeft: 18, marginTop: 3 }}>
                      <li>Esta avaliação contém <strong>{itens.length} questão(ões)</strong> no total de <strong>{totalPts.toFixed(1)} ponto(s)</strong>.</li>
                      <li>Leia cada questão com atenção antes de responder.</li>
                      <li>{liveTemplate === 'discursiva' || liveTemplate === 'mista' ? 'Responda nas linhas abaixo de cada questão com letra legível.' : 'Marque apenas uma alternativa por questão.'}</li>
                    </ol>
                  </div>
                )}
                <div style={{ ...(is2col ? { columnCount: 2, columnGap: '10mm', columnRuleWidth: '0.8pt', columnRuleStyle: 'solid', columnRuleColor: '#555' } : {}) }}>
                  {itens.map((it, idx) => (
                    <QuestaoA4Classica key={it.item_id || it.id || idx} item={it} idx={idx} template={liveTemplate} modoGabarito={false} />
                  ))}
                </div>
                <div style={{
                  marginTop: 24, height: '10mm', borderTop: '0.5px solid #aaa',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '6.5pt', color: '#555', background: '#fff',
                }}>
                  <span>{[escola, prova.bimestre ? `${prova.bimestre}º Bimestre` : prova.ano_letivo].filter(Boolean).join(' — ')}</span>
                  <span style={{ fontWeight: 700, color: '#0e7490' }}>{rodapeStr}</span>
                </div>
              </>
            )}

            {view === 'gabarito' && (
              <>
                <div style={{ border: '2px solid #000', padding: '6px 10px', marginBottom: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase' }}>GABARITO — {prova.titulo || 'Avaliação'}</div>
                </div>
                <GabaritoTabela itens={itens} />
              </>
            )}

            {view === 'latex' && (
              <div>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#7dd3fc', fontWeight: 700, fontSize: '0.8rem' }}>📄 Código LaTeX do Caderno</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(gerarLatex()); toast('✅ LaTeX copiado!', 'success'); }}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1.5px solid #0e7490', background: '#0e7490', color: '#fff', cursor: 'pointer', fontSize: '0.74rem', fontFamily: 'inherit', fontWeight: 700 }}
                  >
                    📋 Copiar
                  </button>
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
        .katex { font-size: 1.03em !important; }
      `}</style>
    </div>
  );
}
