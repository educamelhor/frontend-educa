// src/features/questoes/utils/provaTemplates.jsx
// Catálogo Oficial de Modelos de Prova por Escola + Persistência de Autonomia Escolar

import React from 'react';

export const CORES_FAIXA_QUESTAO = [
  { hex: '#FF7F00', nome: 'Laranja Original (Modelo)', desc: 'Idêntico ao 9º ANO-EXATAS.docx' },
  { hex: '#0E7490', nome: 'Azul Petróleo Educa', desc: 'Identidade institucional moderna' },
  { hex: '#1E3A8A', nome: 'Azul Royal Acadêmico', desc: 'Clássico para colégios e militares' },
  { hex: '#15803D', nome: 'Verde Institucional', desc: 'Suave e de alto contraste' },
  { hex: '#991B1B', nome: 'Bordô Tradicional', desc: 'Destaque sóbrio para simulados' },
  { hex: '#334155', nome: 'Grafite Econômico (P&B)', desc: 'Otimizado para copiadoras monocromáticas' },
];

export const DEFAULT_MODELO_01_CONFIG = {
  cor_destaque: '#FF7F00',
  densidade_fonte: '11pt', // '10pt' | '11pt' | '12pt'
  estilo_alternativa: 'minuscula_parentese', // 'minuscula_parentese' -> a) | 'maiuscula_parenteses' -> (A)
  mostrar_divisores_disciplina: true,
  mostrar_meta_questao: false,
  numerar_paginas_rodape: false,
  fechamento_caderno: 'nenhum', // 'nenhum' | 'rascunho' | 'boa_prova'
  rodape_texto: '',
  com_cabecalho: false,
  com_margem: true,
  embaralhar_alternativas: 0,
  embaralhar_questoes: 0,
};

export const PROVA_TEMPLATES = [
  {
    slug: 'modelo_01_provao',
    numero: 'MODELO 01',
    badge: 'OFICIAL · SEM CABEÇALHO',
    label: 'Caderno Provão 2 Colunas',
    icon: '📙',
    color: '#ea580c',
    colunas: 2,
    semCabecalho: true,
    rodapeExterno: true,
    desc: 'Moldura A4 fechada · 2 colunas com linha central · Faixa sólida nas questões · Rodapé externo fora da margem (padrão Capa Separada)',
  },
  {
    slug: 'objetiva_2col',
    numero: 'MODELO 02',
    badge: 'COM CABEÇALHO',
    label: 'Avaliação 2 Colunas c/ Cabeçalho',
    icon: '📋',
    color: '#0e7490',
    colunas: 2,
    semCabecalho: false,
    rodapeExterno: false,
    desc: 'Inclui cabeçalho completo da escola, nome do aluno, turma e instruções na 1ª página + 2 colunas',
  },
  {
    slug: 'enem',
    numero: 'MODELO 03',
    badge: 'SIMULADO',
    label: 'Caderno Estilo ENEM',
    icon: '🏆',
    color: '#dc2626',
    colunas: 2,
    semCabecalho: false,
    rodapeExterno: false,
    desc: 'Diagramação densa em 2 colunas com instruções oficiais de cartão-resposta',
  },
  {
    slug: 'objetiva_1col',
    numero: 'MODELO 04',
    badge: 'LINEAR',
    label: 'Lista / Avaliação 1 Coluna',
    icon: '📄',
    color: '#1d4ed8',
    colunas: 1,
    semCabecalho: false,
    rodapeExterno: false,
    desc: 'Questões em largura total (1 coluna), ideal para Ensino Fundamental I ou listas comentadas',
  },
  {
    slug: 'discursiva',
    numero: 'MODELO 05',
    badge: 'ABERTA',
    label: 'Caderno Discursivo',
    icon: '✍️',
    color: '#7c3aed',
    colunas: 1,
    semCabecalho: false,
    rodapeExterno: false,
    desc: 'Converte ou exibe linhas pautadas e quadros de cálculo para respostas escritas',
  },
  {
    slug: 'mista',
    numero: 'MODELO 06',
    badge: 'HÍBRIDA',
    label: 'Avaliação Mista',
    icon: '🔀',
    color: '#059669',
    colunas: 1,
    semCabecalho: false,
    rodapeExterno: false,
    desc: 'Combina questões objetivas e discursivas com cabeçalho escolar tradicional',
  },
];

export const TEMPLATE_LABEL_MAP = PROVA_TEMPLATES.reduce((acc, t) => {
  acc[t.slug] = `${t.icon} ${t.numero}: ${t.label}`;
  return acc;
}, {});

function getStorageKeyEscola() {
  const escId = localStorage.getItem('escola_id') || localStorage.getItem('nome_escola') || 'default';
  return `@educa_prova_modelo_escola_v1:${escId}`;
}

export function getPreferenciasModeloEscola() {
  try {
    const raw = localStorage.getItem(getStorageKeyEscola());
    if (!raw) {
      return {
        template_slug: 'modelo_01_provao',
        ...DEFAULT_MODELO_01_CONFIG,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      template_slug: parsed.template_slug || 'modelo_01_provao',
      ...DEFAULT_MODELO_01_CONFIG,
      ...parsed,
    };
  } catch {
    return {
      template_slug: 'modelo_01_provao',
      ...DEFAULT_MODELO_01_CONFIG,
    };
  }
}

export function salvarPreferenciasModeloEscola(prefs = {}) {
  try {
    const atual = getPreferenciasModeloEscola();
    const novo = { ...atual, ...prefs, salvo_em: Date.now() };
    localStorage.setItem(getStorageKeyEscola(), JSON.stringify(novo));
    return novo;
  } catch {
    return prefs;
  }
}

export function gerarTextoRodapeAutomatico(prova = {}, cfg = {}) {
  const manual = String(cfg?.rodape_texto || '').trim();
  if (manual) return manual;
  const partes = [
    String(prova?.titulo || prova?.disciplina || 'PROVÃO').trim().toUpperCase(),
    prova?.turma ? String(prova.turma).trim().toUpperCase() : '',
    prova?.bimestre ? `${prova.bimestre}º BIMESTRE` : '',
  ].filter(Boolean);
  return partes.join(' - ') || 'AVALIAÇÃO BIMESTRAL';
}

/* ── Miniatura Gráfica Realista A4 p/ Galeria de Seleção de Modelos ─────────── */
export function MiniaturaModeloProva({ slug = 'modelo_01_provao', accentColor = '#FF7F00' }) {
  if (slug === 'modelo_01_provao') {
    const barColor = accentColor || '#FF7F00';
    return (
      <div style={{
        width: '100%', height: 118, background: '#ffffff', borderRadius: 4,
        border: '1px solid #cbd5e1', padding: '6px 7px 12px', position: 'relative',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)', boxSizing: 'border-box',
      }}>
        {/* Moldura preta fechada da folha */}
        <div style={{
          width: '100%', height: '100%', border: '1.8px solid #0f172a',
          padding: '4px 5px', display: 'grid', gridTemplateColumns: '1fr 1px 1fr',
          columnGap: 5, boxSizing: 'border-box',
        }}>
          {/* Coluna 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 5.5, fontWeight: 900, textAlign: 'center', textDecoration: 'underline', color: '#0f172a' }}>
              CIÊNCIAS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 5, fontWeight: 900, color: '#0f172a' }}>QUESTÃO 01</span>
              <span style={{ flex: 1, height: 4.5, background: barColor, borderRadius: 0.5 }} />
            </div>
            <div style={{ height: 2, background: '#cbd5e1', width: '100%' }} />
            <div style={{ height: 2, background: '#cbd5e1', width: '88%' }} />
            <div style={{ height: 2, background: '#e2e8f0', width: '65%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
              <span style={{ fontSize: 5, fontWeight: 900, color: '#0f172a' }}>QUESTÃO 02</span>
              <span style={{ flex: 1, height: 4.5, background: barColor, borderRadius: 0.5 }} />
            </div>
            <div style={{ height: 2, background: '#cbd5e1', width: '96%' }} />
            <div style={{ height: 2, background: '#cbd5e1', width: '80%' }} />
          </div>

          {/* Linha vertical central divisória */}
          <div style={{ background: '#0f172a', width: 1, height: '100%' }} />

          {/* Coluna 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 5, fontWeight: 900, color: '#0f172a' }}>QUESTÃO 03</span>
              <span style={{ flex: 1, height: 4.5, background: barColor, borderRadius: 0.5 }} />
            </div>
            <div style={{ height: 2, background: '#cbd5e1', width: '100%' }} />
            <div style={{ height: 2, background: '#cbd5e1', width: '90%' }} />
            <div style={{ fontSize: 5.5, fontWeight: 900, textAlign: 'center', textDecoration: 'underline', color: '#0f172a', marginTop: 2 }}>
              MATEMÁTICA
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 5, fontWeight: 900, color: '#0f172a' }}>QUESTÃO 04</span>
              <span style={{ flex: 1, height: 4.5, background: barColor, borderRadius: 0.5 }} />
            </div>
            <div style={{ height: 2, background: '#cbd5e1', width: '94%' }} />
            <div style={{ height: 2, background: '#e2e8f0', width: '72%' }} />
          </div>
        </div>

        {/* Rodapé FORA da moldura inferior */}
        <div style={{
          position: 'absolute', bottom: 2, left: 6, right: 6,
          textAlign: 'center', fontSize: 5.2, fontWeight: 700, color: '#0f172a',
          fontFamily: 'serif', letterSpacing: '0.03em',
        }}>
          PROVÃO EXATAS - 9º ANO - 3º BIMESTRE
        </div>
      </div>
    );
  }

  const is2Col = slug === 'objetiva_2col' || slug === 'enem';
  const isDisc = slug === 'discursiva';
  return (
    <div style={{
      width: '100%', height: 118, background: '#ffffff', borderRadius: 4,
      border: '1px solid #cbd5e1', padding: 6, display: 'flex', flexDirection: 'column', gap: 4,
      boxSizing: 'border-box',
    }}>
      {/* Cabeçalho institucional */}
      <div style={{ border: '1.2px solid #334155', padding: '2px 4px', borderRadius: 2 }}>
        <div style={{ height: 3, width: '60%', margin: '0 auto 2px', background: '#334155', borderRadius: 1 }} />
        <div style={{ height: 2, width: '90%', background: '#cbd5e1' }} />
      </div>

      {is2Col ? (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1px 1fr', columnGap: 5 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 3, width: '55%', background: '#0e7490' }} />
            <div style={{ height: 2, width: '95%', background: '#cbd5e1' }} />
            <div style={{ height: 2, width: '80%', background: '#e2e8f0' }} />
            <div style={{ height: 3, width: '55%', background: '#0e7490', marginTop: 3 }} />
            <div style={{ height: 2, width: '90%', background: '#cbd5e1' }} />
          </div>
          <div style={{ background: '#94a3b8', width: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 3, width: '55%', background: '#0e7490' }} />
            <div style={{ height: 2, width: '95%', background: '#cbd5e1' }} />
            <div style={{ height: 2, width: '80%', background: '#e2e8f0' }} />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ height: 3, width: '35%', background: isDisc ? '#7c3aed' : '#1d4ed8' }} />
          <div style={{ height: 2, width: '100%', background: '#cbd5e1' }} />
          {isDisc ? (
            <>
              <div style={{ borderBottom: '1px dotted #94a3b8', height: 4 }} />
              <div style={{ borderBottom: '1px dotted #94a3b8', height: 4 }} />
              <div style={{ borderBottom: '1px dotted #94a3b8', height: 4 }} />
            </>
          ) : (
            <>
              <div style={{ height: 2, width: '75%', background: '#e2e8f0' }} />
              <div style={{ height: 2, width: '70%', background: '#e2e8f0' }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
