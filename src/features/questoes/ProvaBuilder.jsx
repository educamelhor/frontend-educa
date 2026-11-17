// src/features/questoes/ProvaBuilder.jsx
// 🧩 EDUCA.PROVA — Montador Inteligente de Provas + Galeria de Modelos por Escola
// Inclui Modelo 01 Oficial (clone cirúrgico de "9º ANO-EXATAS.docx"), autonomia de estilo por escola e sincronização atômica.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProvaPreview from './ProvaPreview';
import apiService from '../../services/api';
import {
  PROVA_TEMPLATES,
  CORES_FAIXA_QUESTAO,
  DEFAULT_MODELO_01_CONFIG,
  MiniaturaModeloProva,
  getPreferenciasModeloEscola,
  salvarPreferenciasModeloEscola,
  gerarTextoRodapeAutomatico,
} from './utils/provaTemplates';

const NIVEL_COLORS = { facil: '#059669', medio: '#d97706', dificil: '#dc2626', enem: '#7c3aed' };
const NIVEL_LABEL  = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };
const TIPO_LABEL   = {
  objetiva: 'Obj', afirmativas: 'Afirm', discursiva: 'Disc',
  verdadeiro_falso: 'V/F', associacao: 'Colunas', lacuna: 'Lac', somatoria: 'Soma',
};

const api = async (path, opts = {}) => {
  const method = (opts.method || 'GET').toUpperCase();
  const body   = opts.body ? JSON.parse(opts.body) : undefined;
  const response = await apiService.request({ url: path, method, data: body });
  return response.data ?? null;
};

function parseCfgSafe(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

/* ══════════════════════════════════════════════════════════════════════════════
   GALERIA DE MODELOS DA ESCOLA (COM MINIATURAS A4 REALISTAS)
══════════════════════════════════════════════════════════════════════════════ */
function GaleriaModelosEscola({ value, accentColor, padraoEscolaSlug, onChange, onDefinirPadrao }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))', gap: 12 }}>
        {PROVA_TEMPLATES.map((t) => {
          const active = value === t.slug;
          const isPadrao = padraoEscolaSlug === t.slug;
          return (
            <div
              key={t.slug}
              onClick={() => onChange(t.slug)}
              style={{
                cursor: 'pointer',
                borderRadius: 12,
                padding: 12,
                border: `2px solid ${active ? t.color : '#e2e8f0'}`,
                background: active ? `${t.color}0a` : '#ffffff',
                transition: 'all 0.16s ease',
                boxShadow: active ? `0 4px 16px ${t.color}24` : '0 1px 3px rgba(15,23,42,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.06em',
                  padding: '2px 7px', borderRadius: 99,
                  background: active ? t.color : '#f1f5f9',
                  color: active ? '#ffffff' : '#475569',
                }}>
                  {t.numero}
                </span>
                {isPadrao && (
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                    background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047',
                  }}>
                    ⭐ Padrão da Escola
                  </span>
                )}
              </div>

              {/* Miniatura gráfica A4 */}
              <MiniaturaModeloProva slug={t.slug} accentColor={accentColor} />

              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: active ? t.color : '#0f172a' }}>
                  {t.icon} {t.label}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
                  {t.desc}
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: active ? t.color : '#94a3b8' }}>
                  {active ? '✓ Modelo ativo nesta prova' : 'Clique para selecionar'}
                </span>
                {active && !isPadrao && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDefinirPadrao(t.slug); }}
                    style={{
                      padding: '2px 8px', borderRadius: 6, border: '1px solid #cbd5e1',
                      background: '#fff', color: '#334155', fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    ⭐ Tornar padrão
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   QUESTAO CARD — Painel Esquerdo (Banco)
══════════════════════════════════════════════════════════════════════════════ */
function BancoQuestaoCard({ questao, onAdd, onDuplicate, jaAdicionada }) {
  const nivel = questao.nivel || 'medio';
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('questao_id', String(questao.id));
        e.dataTransfer.setData('questao_json', JSON.stringify(questao));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      style={{
        padding: '10px 12px', borderRadius: 8, marginBottom: 8,
        background: jaAdicionada ? '#f0fdf4' : '#fff',
        border: `1.5px solid ${jaAdicionada ? '#86efac' : '#e2e8f0'}`,
        cursor: jaAdicionada ? 'default' : 'grab',
        display: 'flex', gap: 10, alignItems: 'flex-start',
        transition: 'box-shadow 0.15s',
        opacity: jaAdicionada ? 0.72 : 1,
      }}
    >
      <div style={{
        width: 6, borderRadius: 3, alignSelf: 'stretch', flexShrink: 0,
        background: NIVEL_COLORS[nivel] || '#94a3b8',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, fontFamily: 'monospace', padding: '1px 6px', borderRadius: 5, background: '#0f172a', color: '#38bdf8' }}>
            {questao.codigo || `EMQE-${String(questao.numero_q || questao.id).padStart(5, '0')}`}
          </span>
          {questao.disciplina && (
            <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8' }}>
              {questao.disciplina}
            </span>
          )}
          <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: `${NIVEL_COLORS[nivel]}18`, color: NIVEL_COLORS[nivel] }}>
            {NIVEL_LABEL[nivel]}
          </span>
          {questao.tipo && (
            <span style={{ fontSize: '0.64rem', color: '#64748b', padding: '1px 6px', borderRadius: 99, background: '#f1f5f9' }}>
              {TIPO_LABEL[questao.tipo] || questao.tipo}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.79rem', color: '#334155', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {questao.conteudo_bruto || '(sem enunciado)'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => !jaAdicionada && onAdd(questao)}
          disabled={jaAdicionada}
          title={jaAdicionada ? 'Já adicionada' : 'Adicionar à prova'}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: jaAdicionada ? '#86efac' : '#0e7490',
            border: 'none', cursor: jaAdicionada ? 'default' : 'pointer',
            color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >
          {jaAdicionada ? '✓' : '+'}
        </button>
        {onDuplicate && (
          <button
            onClick={() => onDuplicate(questao.id)}
            title="Duplicar questão"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#f1f5f9', border: '1.5px solid #e2e8f0',
              cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
            }}
          >
            📄
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PROVA ITEM — Painel Direito (Questões Selecionadas)
══════════════════════════════════════════════════════════════════════════════ */
function ProvaItem({ item, idx, accentColor, onRemove, onChangePontos, onDragStart, onDragOver, onDrop }) {
  const nivel = item.nivel || 'medio';
  let alts = [];
  if (Array.isArray(item.alternativas_json)) alts = item.alternativas_json;
  else { try { alts = JSON.parse(item.alternativas_json || '[]'); } catch {} }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(idx)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
      onDrop={() => onDrop(idx)}
      style={{
        padding: '10px 14px', borderRadius: 10, marginBottom: 8,
        background: '#fff', border: '1.5px solid #e2e8f0',
        display: 'flex', gap: 10, alignItems: 'flex-start',
        cursor: 'grab', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 6, flexShrink: 0 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 2 }}>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
          </div>
        ))}
      </div>

      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: accentColor || '#ea580c',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.78rem', fontWeight: 900,
      }}>
        {String(idx + 1).padStart(2, '0')}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 3 }}>
          {item.disciplina && (
            <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8' }}>
              {item.disciplina}
            </span>
          )}
          <span style={{ fontSize: '0.64rem', padding: '1px 6px', borderRadius: 99, background: `${NIVEL_COLORS[nivel]}18`, color: NIVEL_COLORS[nivel], fontWeight: 700 }}>
            {NIVEL_LABEL[nivel]}
          </span>
          {alts.length > 0 && (
            <span style={{ fontSize: '0.63rem', color: '#94a3b8' }}>{alts.length} alt.</span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.79rem', color: '#334155', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.conteudo_bruto || '(sem enunciado)'}
        </p>
      </div>

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number"
          min="0.1" max="100" step="0.25"
          value={item._pontos ?? 1}
          onChange={(e) => onChangePontos(idx, Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 56, padding: '4px 6px', borderRadius: 6,
            border: '1.5px solid #bae6fd', textAlign: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: '#0369a1',
            background: '#f0f9ff', fontFamily: 'inherit',
          }}
          title="Pontuação desta questão"
        />
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>pts</span>
      </div>

      <button
        onClick={() => onRemove(idx)}
        style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
          background: '#fff', border: '1.5px solid #fca5a5',
          color: '#dc2626', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', fontFamily: 'inherit',
        }}
        title="Remover da prova"
      >
        ×
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAINEL CONFIGURAÇÕES + PERSONALIZAÇÃO DO MODELO 01
══════════════════════════════════════════════════════════════════════════════ */
function ProvaConfigPanel({ config, layoutCfg, onChange, onChangeLayout }) {
  const isModelo01 = config.template_slug === 'modelo_01_provao';
  const rodapePreview = gerarTextoRodapeAutomatico(config, layoutCfg);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Título / Área do Caderno *
          </label>
          <input
            type="text"
            placeholder="Ex: PROVÃO EXATAS  ou  AVALIAÇÃO DE HISTÓRIA"
            value={config.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Disciplina / Bloco
          </label>
          <input
            type="text"
            placeholder="Ex: Ciências e Matemática"
            value={config.disciplina}
            onChange={(e) => onChange({ disciplina: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #cbd5e1', fontSize: '0.86rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Série / Turma
          </label>
          <input
            type="text"
            placeholder="Ex: 9º ANO"
            value={config.turma}
            onChange={(e) => onChange({ turma: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #cbd5e1', fontSize: '0.86rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Bimestre
          </label>
          <select
            value={config.bimestre}
            onChange={(e) => onChange({ bimestre: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #cbd5e1', fontSize: '0.86rem', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}
          >
            <option value="">Selecione</option>
            {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b}º Bimestre</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ano Letivo
          </label>
          <input
            type="number"
            value={config.ano_letivo}
            onChange={(e) => onChange({ ano_letivo: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #cbd5e1', fontSize: '0.86rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Painel dedicado às especificações do Modelo 01 */}
      {isModelo01 && (
        <div style={{
          padding: 14, borderRadius: 12, background: '#fff7ed',
          border: '1.5px solid #fed7aa', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📙 Ajustes do Modelo 01 (Caderno 2 Colunas · Sem Cabeçalho · Rodapé Externo)</span>
          </div>

          {/* Rodapé fora da margem */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c2d12', textTransform: 'uppercase' }}>
              Texto do Rodapé (impresso fora da moldura inferior da página)
            </label>
            <input
              type="text"
              value={layoutCfg.rodape_texto || ''}
              onChange={(e) => onChangeLayout({ rodape_texto: e.target.value })}
              placeholder={gerarTextoRodapeAutomatico(config, { rodape_texto: '' })}
              style={{ width: '100%', padding: '7px 11px', borderRadius: 8, marginTop: 4, border: '1.5px solid #fdba74', background: '#fff', fontSize: '0.84rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '0.7rem', color: '#9a3412', marginTop: 3 }}>
              Prévia atual no rodapé externo: <strong>{rodapePreview}</strong>
            </div>
          </div>

          {/* Cor da faixa separadora de cada questão */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c2d12', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Cor do Retângulo Separador de cada Questão
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {CORES_FAIXA_QUESTAO.map((c) => {
                const sel = (layoutCfg.cor_destaque || '#FF7F00').toUpperCase() === c.hex.toUpperCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => onChangeLayout({ cor_destaque: c.hex })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8,
                      border: sel ? `2px solid ${c.hex}` : '1px solid #cbd5e1',
                      background: '#fff', cursor: 'pointer', fontSize: '0.73rem', fontWeight: sel ? 800 : 600, color: '#1e293b',
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: c.hex, display: 'inline-block' }} />
                    {c.nome.split(' ')[0]}
                  </button>
                );
              })}
              <input
                type="color"
                value={layoutCfg.cor_destaque || '#FF7F00'}
                onChange={(e) => onChangeLayout({ cor_destaque: e.target.value })}
                title="Cor livre da escola"
                style={{ width: 32, height: 30, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>

            {/* Prévia real da barra QUESTÃO 01 */}
            <div style={{
              marginTop: 8, padding: '8px 12px', background: '#fff', borderRadius: 8,
              border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: "'Times New Roman', Times, serif",
            }}>
              <span style={{ fontWeight: 700, fontSize: '11.5pt', color: '#000' }}>QUESTÃO 01</span>
              <span style={{ flex: 1, height: '12pt', background: layoutCfg.cor_destaque || '#FF7F00' }} />
            </div>
          </div>

          {/* Densidade + Formato Alternativa + Fechamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: '0.67rem', fontWeight: 800, color: '#7c2d12', textTransform: 'uppercase' }}>Tamanho da Fonte</label>
              <select
                value={layoutCfg.densidade_fonte || '11pt'}
                onChange={(e) => onChangeLayout({ densidade_fonte: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, marginTop: 3, border: '1px solid #fdba74', background: '#fff', fontSize: '0.78rem' }}
              >
                <option value="10pt">10pt (Econômica)</option>
                <option value="11pt">11pt (Equilibrada)</option>
                <option value="12pt">12pt (Original DOCX)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.67rem', fontWeight: 800, color: '#7c2d12', textTransform: 'uppercase' }}>Letras das Opções</label>
              <select
                value={layoutCfg.estilo_alternativa || 'minuscula_parentese'}
                onChange={(e) => onChangeLayout({ estilo_alternativa: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, marginTop: 3, border: '1px solid #fdba74', background: '#fff', fontSize: '0.78rem' }}
              >
                <option value="minuscula_parentese">a) b) c) d) — Padrão DOCX</option>
                <option value="maiuscula_parenteses">(A) (B) (C) (D)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.67rem', fontWeight: 800, color: '#7c2d12', textTransform: 'uppercase' }}>Final do Caderno</label>
              <select
                value={layoutCfg.fechamento_caderno || 'nenhum'}
                onChange={(e) => onChangeLayout({ fechamento_caderno: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, marginTop: 3, border: '1px solid #fdba74', background: '#fff', fontSize: '0.78rem' }}
              >
                <option value="nenhum">Apenas questões</option>
                <option value="rascunho">Bloco RASCUNHO</option>
                <option value="boa_prova">Mensagem BOA PROVA!</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#7c2d12', fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layoutCfg.mostrar_divisores_disciplina ?? true}
                onChange={(e) => onChangeLayout({ mostrar_divisores_disciplina: e.target.checked })}
              />
              Inserir título sublinhado ao mudar de disciplina (ex.: CIÊNCIAS / MATEMÁTICA)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#7c2d12', fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(layoutCfg.numerar_paginas_rodape)}
                onChange={(e) => onChangeLayout({ numerar_paginas_rodape: e.target.checked })}
              />
              Exibir Pág. X/Y no rodapé externo
            </label>
          </div>
        </div>
      )}

      {/* Embaralhar alternativas */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}
        onClick={() => onChangeLayout({ embaralhar_alternativas: layoutCfg.embaralhar_alternativas ? 0 : 1 })}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${layoutCfg.embaralhar_alternativas ? '#0e7490' : '#cbd5e1'}`,
          background: layoutCfg.embaralhar_alternativas ? '#0e7490' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {layoutCfg.embaralhar_alternativas ? <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>✓</span> : null}
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>🔀 Embaralhar alternativas na impressão</div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Permuta automaticamente as letras A–E ao gerar o caderno</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — ProvaBuilder
══════════════════════════════════════════════════════════════════════════════ */
export default function ProvaBuilder({ onProvasSalvas, editingProva = null, onClearEditingProva = null }) {
  const prefsEscola = getPreferenciasModeloEscola();
  const [padraoEscolaSlug, setPadraoEscolaSlug] = useState(prefsEscola.template_slug || 'modelo_01_provao');

  const [provaId, setProvaId] = useState(null);
  const [config, setConfig] = useState({
    titulo: '',
    disciplina: '',
    turma: '',
    bimestre: '',
    ano_letivo: new Date().getFullYear(),
    template_slug: prefsEscola.template_slug || 'modelo_01_provao',
  });
  const [layoutCfg, setLayoutCfg] = useState({
    ...DEFAULT_MODELO_01_CONFIG,
    cor_destaque: prefsEscola.cor_destaque || '#FF7F00',
    densidade_fonte: prefsEscola.densidade_fonte || '11pt',
    estilo_alternativa: prefsEscola.estilo_alternativa || 'minuscula_parentese',
    mostrar_divisores_disciplina: prefsEscola.mostrar_divisores_disciplina ?? true,
    fechamento_caderno: prefsEscola.fechamento_caderno || 'nenhum',
  });

  const [itens, setItens] = useState([]);

  // Banco de questões (painel esquerdo)
  const [banco,        setBanco]        = useState([]);
  const [bancoBusca,   setBancoBusca]   = useState('');
  const [bancoDisc,    setBancoDisc]    = useState('');
  const [bancoNivel,   setBancoNivel]   = useState('');
  const [bancoPage,    setBancoPage]    = useState(1);
  const [bancoTotal,   setBancoTotal]   = useState(0);
  const [bancoLoading, setBancoLoading] = useState(false);
  const bancoTimer = useRef(null);

  // UI states
  const [saving,       setSaving]       = useState(false);
  const [feedback,     setFeedback]     = useState(null);
  const [activeTab,    setActiveTab]    = useState('questoes');
  const [dropOver,     setDropOver]     = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [metaQuestoes, setMetaQuestoes] = useState(10);
  const dragIdxRef = useRef(null);

  const toast = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2900);
  };

  // Carrega prova salva quando o usuário clica em "Editar" em Provas Salvas
  useEffect(() => {
    if (!editingProva?.id) return;
    let ativo = true;
    (async () => {
      try {
        const full = await api(`/api/provas/${editingProva.id}`);
        if (!ativo || !full) return;
        const cfgSalva = parseCfgSafe(full.config_json);
        const tplSalvo = cfgSalva.modelo_slug || full.template_slug || 'modelo_01_provao';
        setProvaId(full.id);
        setConfig({
          titulo: full.titulo || '',
          disciplina: full.disciplina || '',
          turma: full.turma || '',
          bimestre: full.bimestre || '',
          ano_letivo: full.ano_letivo || new Date().getFullYear(),
          template_slug: tplSalvo,
        });
        setLayoutCfg({
          ...DEFAULT_MODELO_01_CONFIG,
          ...cfgSalva,
          modelo_slug: tplSalvo,
        });
        const itensCarregados = (full.itens || []).map((it) => ({
          ...it,
          _tempId: `srv_${it.id}`,
          _serverItemId: it.id,
          questao_id: it.questao_id,
          _pontos: Number(it.valor_pontos || 1),
        }));
        setItens(itensCarregados);
        toast(`✏️ Editando "${full.titulo || 'Prova'}"`, 'info');
      } catch {
        toast('❌ Não foi possível carregar os itens da prova para edição.', 'error');
      }
    })();
    return () => { ativo = false; };
  }, [editingProva]);

  // Carregar banco
  const carregarBanco = useCallback(async (page = 1) => {
    setBancoLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, status: 'ativa' });
      if (bancoBusca) params.set('busca', bancoBusca);
      if (bancoDisc)  params.set('disciplina', bancoDisc);
      if (bancoNivel) params.set('nivel', bancoNivel);
      const data = await api(`/api/questoes?${params}`);
      if (Array.isArray(data)) {
        setBanco(data);
        setBancoTotal(data.length);
      } else {
        setBanco(data?.questoes || []);
        setBancoTotal(data?.pagination?.total || 0);
      }
    } catch {
      setBanco([]);
    } finally {
      setBancoLoading(false);
    }
  }, [bancoBusca, bancoDisc, bancoNivel]);

  useEffect(() => {
    clearTimeout(bancoTimer.current);
    bancoTimer.current = setTimeout(() => { setBancoPage(1); carregarBanco(1); }, bancoBusca ? 350 : 0);
    return () => clearTimeout(bancoTimer.current);
  }, [bancoBusca, bancoDisc, bancoNivel, carregarBanco]);

  useEffect(() => { carregarBanco(bancoPage); }, [bancoPage, carregarBanco]);

  const adicionadosIds = new Set(itens.map((i) => i.questao_id));

  const addQuestao = (questao) => {
    if (adicionadosIds.has(questao.id)) return;
    setItens((prev) => [...prev, {
      _tempId: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      questao_id: questao.id,
      _pontos: 1,
      ...questao,
    }]);
    toast('✅ Questão adicionada!', 'success');
  };

  const duplicarQuestao = async (id) => {
    try {
      const r = await api(`/api/questoes/${id}/duplicar`, { method: 'POST' });
      if (r) { toast('📄 Questão duplicada no banco!', 'success'); carregarBanco(bancoPage); }
    } catch { toast('❌ Erro ao duplicar.', 'error'); }
  };

  const removeItem = (idx) => {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx) => { dragIdxRef.current = idx; };
  const handleDragOver  = () => {};
  const handleDrop      = (toIdx) => {
    const fromIdx = dragIdxRef.current;
    if (fromIdx === null || fromIdx === toIdx) return;
    setItens((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    dragIdxRef.current = null;
  };

  const handleDropZone = (e) => {
    e.preventDefault();
    setDropOver(false);
    const json = e.dataTransfer.getData('questao_json');
    if (json) {
      try { addQuestao(JSON.parse(json)); } catch {}
    }
  };

  const changePontos = (idx, val) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, _pontos: val } : it)));
  };

  // Agrupa automaticamente questões da mesma disciplina (ex.: todas de Ciências e depois todas de Matemática)
  const agruparPorDisciplina = () => {
    if (itens.length < 2) return;
    const ordemVistas = [];
    itens.forEach((it) => {
      const d = String(it.disciplina || 'Geral').trim();
      if (!ordemVistas.includes(d)) ordemVistas.push(d);
    });
    const agrupados = [...itens].sort(
      (a, b) => ordemVistas.indexOf(String(a.disciplina || 'Geral').trim()) - ordemVistas.indexOf(String(b.disciplina || 'Geral').trim())
    );
    setItens(agrupados);
    toast('📚 Questões agrupadas por bloco de disciplina!', 'success');
  };

  const totalPontos = itens.reduce((s, it) => s + (Number(it._pontos) || 0), 0);
  const updateConfig = (partial) => setConfig((c) => ({ ...c, ...partial }));
  const updateLayoutCfg = (partial) => setLayoutCfg((c) => ({ ...c, ...partial }));

  const definirPadraoEscola = (slug) => {
    salvarPreferenciasModeloEscola({
      template_slug: slug,
      cor_destaque: layoutCfg.cor_destaque,
      densidade_fonte: layoutCfg.densidade_fonte,
      estilo_alternativa: layoutCfg.estilo_alternativa,
      mostrar_divisores_disciplina: layoutCfg.mostrar_divisores_disciplina,
      fechamento_caderno: layoutCfg.fechamento_caderno,
    });
    setPadraoEscolaSlug(slug);
    toast('⭐ Modelo padrão desta escola atualizado!', 'success');
  };

  // Persiste prova + lista completa sincronizada de questões e retorna o ID salvo
  const salvarInterno = async (statusFinal = 'montando', permitirTituloAuto = false) => {
    let tituloFinal = config.titulo.trim();
    if (!tituloFinal) {
      if (!permitirTituloAuto) {
        toast('⚠️ Informe o título da prova na aba Configurações.', 'warn');
        setActiveTab('config');
        return null;
      }
      tituloFinal = config.disciplina
        ? `PROVÃO ${config.disciplina.toUpperCase()}`
        : 'CADERNO DE PROVA';
      setConfig((prev) => ({ ...prev, titulo: tituloFinal }));
    }
    if (itens.length === 0) {
      toast('⚠️ Adicione ao menos uma questão à prova.', 'warn');
      return null;
    }

    setSaving(true);
    try {
      let id = provaId;
      const tplAtivoSalvar = config.template_slug || 'modelo_01_provao';
      const payload = {
        ...config,
        template_slug: tplAtivoSalvar,
        titulo: tituloFinal,
        status: statusFinal,
        config_json: { ...layoutCfg, modelo_slug: tplAtivoSalvar },
      };

      if (!id) {
        const res = await api('/api/provas', { method: 'POST', body: JSON.stringify(payload) });
        id = res.id;
        setProvaId(id);
      } else {
        await api(`/api/provas/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      }

      // Sincroniza atomicamente todas as questões (adições, exclusões, pontos e ordem)
      const syncPayload = itens.map((it) => ({
        questao_id: it.questao_id,
        valor_pontos: Number(it._pontos) || 1,
      }));
      const syncRes = await api(`/api/provas/${id}/sincronizar-questoes`, {
        method: 'PUT',
        body: JSON.stringify({ itens: syncPayload }),
      });

      if (Array.isArray(syncRes?.itens)) {
        const idMap = new Map(syncRes.itens.map((r) => [Number(r.ordem) - 1, r.id]));
        setItens((prev) => prev.map((it, idx) => ({ ...it, _serverItemId: idMap.get(idx) || it._serverItemId })));
      }

      if (onProvasSalvas) onProvasSalvas();
      return id;
    } catch (err) {
      const msgDetalhe = err?.response?.data?.detail || err?.response?.data?.message || err.message;
      toast(`❌ Erro ao salvar: ${msgDetalhe}`, 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const salvar = async (statusFinal = 'montando') => {
    const id = await salvarInterno(statusFinal, false);
    if (id) {
      toast(statusFinal === 'pronta' ? '🎉 Prova finalizada com sucesso!' : '✅ Rascunho salvo com sucesso!', 'success');
    }
  };

  const abrirPreviewDireto = async () => {
    if (itens.length === 0) {
      toast('⚠️ Adicione ao menos 1 questão para visualizar o Caderno A4.', 'warn');
      return;
    }
    const id = await salvarInterno(provaId ? undefined : 'montando', true);
    if (id) setShowPreview(true);
  };

  const novaProva = () => {
    const prefs = getPreferenciasModeloEscola();
    setProvaId(null);
    setConfig({
      titulo: '',
      disciplina: '',
      turma: '',
      bimestre: '',
      ano_letivo: new Date().getFullYear(),
      template_slug: prefs.template_slug || 'modelo_01_provao',
    });
    setLayoutCfg({
      ...DEFAULT_MODELO_01_CONFIG,
      cor_destaque: prefs.cor_destaque || '#FF7F00',
      densidade_fonte: prefs.densidade_fonte || '11pt',
      estilo_alternativa: prefs.estilo_alternativa || 'minuscula_parentese',
      mostrar_divisores_disciplina: prefs.mostrar_divisores_disciplina ?? true,
      fechamento_caderno: prefs.fechamento_caderno || 'nenhum',
    });
    setItens([]);
    if (onClearEditingProva) onClearEditingProva();
    toast('🆕 Nova prova iniciada com o modelo padrão da escola.', 'info');
  };

  const templateAtivo = PROVA_TEMPLATES.find((t) => t.slug === config.template_slug) || PROVA_TEMPLATES[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0 }}>
      {feedback && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 2000,
          padding: '10px 20px', borderRadius: 10,
          background: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'error' ? '#fef2f2' : feedback.type === 'warn' ? '#fffbeb' : '#f0f9ff',
          border: `1.5px solid ${feedback.type === 'success' ? '#86efac' : feedback.type === 'error' ? '#fca5a5' : feedback.type === 'warn' ? '#fcd34d' : '#bae6fd'}`,
          color: feedback.type === 'success' ? '#166534' : feedback.type === 'error' ? '#991b1b' : feedback.type === 'warn' ? '#92400e' : '#0369a1',
          fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Header da prova em construção */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 55%, #1d4ed8 100%)',
        borderRadius: 14, padding: '16px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: '0.65rem', color: '#fdba74', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {provaId ? `Editando Prova #${provaId}` : 'Montagem de Caderno de Prova'} · {templateAtivo.numero}
          </div>
          <div style={{ fontSize: '1.02rem', color: '#fff', fontWeight: 800, marginTop: 2 }}>
            {config.titulo || 'Sem título ainda (clique em Configurações)...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
            {totalPontos.toFixed(2)} pts · {templateAtivo.icon} {templateAtivo.label}
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
                {itens.length} /{' '}
                <input
                  type="number" min={1} max={100}
                  value={metaQuestoes}
                  onChange={(e) => setMetaQuestoes(Math.max(1, Number(e.target.value)))}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 36, padding: '1px 4px', borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff', fontFamily: 'inherit',
                    fontSize: '0.7rem', fontWeight: 700, textAlign: 'center',
                  }}
                />{' '}
                questões
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: itens.length >= metaQuestoes ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                {itens.length >= metaQuestoes ? '✓ Meta atingida!' : `faltam ${metaQuestoes - itens.length}`}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)', width: 190, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${Math.min(100, (itens.length / metaQuestoes) * 100)}%`,
                background: itens.length >= metaQuestoes
                  ? 'linear-gradient(90deg,#4ade80,#22c55e)'
                  : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                transition: 'width 0.35s ease',
              }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={novaProva}
            style={{ padding: '8px 13px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.79rem', fontWeight: 700 }}
          >
            🆕 Nova
          </button>
          <button
            onClick={() => salvar('montando')}
            disabled={saving}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.79rem', fontWeight: 700 }}
          >
            💾 Salvar Rascunho
          </button>
          <button
            onClick={abrirPreviewDireto}
            disabled={saving}
            style={{
              padding: '8px 15px', borderRadius: 8, border: '1.5px solid rgba(251,146,60,0.65)',
              background: 'rgba(234,88,12,0.28)', color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 800,
            }}
          >
            👁️ Estúdio A4 / PDF / Word
          </button>
          <button
            onClick={() => salvar('pronta')}
            disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 800 }}
          >
            {saving ? '⏳ Salvando...' : '✅ Finalizar Prova'}
          </button>
        </div>
      </div>

      {/* Modal do Estúdio A4 Paginado */}
      {showPreview && provaId && (
        <ProvaPreview
          provaId={provaId}
          onClose={() => setShowPreview(false)}
          onUpdated={({ template_slug, config_json }) => {
            if (template_slug) setConfig((prev) => ({ ...prev, template_slug }));
            if (config_json) setLayoutCfg((prev) => ({ ...prev, ...config_json }));
          }}
        />
      )}

      {/* Corpo: 2 painéis */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, minHeight: 0 }}>
        {/* Painel esquerdo: Banco */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0',
            padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📚 Banco de Questões
            </div>

            <input
              type="search"
              placeholder="Código, enunciado, BNCC..."
              value={bancoBusca}
              onChange={(e) => setBancoBusca(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Disciplina"
                value={bancoDisc}
                onChange={(e) => setBancoDisc(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontFamily: 'inherit' }}
              />
              <select
                value={bancoNivel}
                onChange={(e) => { setBancoNivel(e.target.value); setBancoPage(1); }}
                style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontFamily: 'inherit', background: '#fff' }}
              >
                <option value="">Nível</option>
                {Object.entries(NIVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'right' }}>
              {bancoTotal} questão(ões) · Pg {bancoPage}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', paddingRight: 2 }}>
            {bancoLoading ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: '0.82rem' }}>⏳ Carregando...</div>
            ) : banco.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: '0.82rem' }}>Nenhuma questão encontrada.</div>
            ) : (
              banco.map((q) => (
                <BancoQuestaoCard
                  key={q.id}
                  questao={q}
                  onAdd={addQuestao}
                  onDuplicate={duplicarQuestao}
                  jaAdicionada={adicionadosIds.has(q.id)}
                />
              ))
            )}

            {bancoTotal > 15 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                <button
                  onClick={() => setBancoPage((p) => Math.max(1, p - 1))}
                  disabled={bancoPage <= 1}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  ←
                </button>
                <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '28px' }}>{bancoPage}</span>
                <button
                  onClick={() => setBancoPage((p) => p + 1)}
                  disabled={banco.length < 15}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Painel direito: Prova */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {[
              { key: 'questoes', label: `📋 Questões (${itens.length})` },
              { key: 'template', label: `${templateAtivo.icon} Modelos da Escola` },
              { key: 'config',   label: '⚙️ Dados & Rodapé' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: activeTab === tab.key ? '#fff' : 'transparent',
                  color: activeTab === tab.key ? '#0e7490' : '#64748b',
                  boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'config' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 16 }}>
              <ProvaConfigPanel
                config={config}
                layoutCfg={layoutCfg}
                onChange={updateConfig}
                onChangeLayout={updateLayoutCfg}
              />
            </div>
          )}

          {activeTab === 'questoes' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
                  onDragLeave={() => setDropOver(false)}
                  onDrop={handleDropZone}
                  style={{
                    flex: 1, padding: '11px 16px',
                    borderRadius: 10, border: `2px dashed ${dropOver ? '#0e7490' : '#cbd5e1'}`,
                    background: dropOver ? '#f0f9ff' : '#f8fafc',
                    textAlign: 'center', fontSize: '0.8rem',
                    color: dropOver ? '#0369a1' : '#64748b',
                    fontWeight: 600,
                  }}
                >
                  {dropOver ? '📥 Solte a questão aqui' : '👆 Arraste questões do banco ou clique em "+"'}
                </div>

                {itens.length >= 2 && (
                  <button
                    type="button"
                    onClick={agruparPorDisciplina}
                    title="Ordena automaticamente as questões agrupando cada disciplina em bloco contínuo (ex: Ciências -> Matemática)"
                    style={{
                      padding: '10px 13px', borderRadius: 10, border: '1.5px solid #bae6fd',
                      background: '#f0f9ff', color: '#0369a1', fontSize: '0.75rem', fontWeight: 800,
                      cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                    }}
                  >
                    📚 Agrupar por Disciplina
                  </button>
                )}
              </div>

              {itens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 10 }}>📙</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#475569' }}>Caderno em branco</div>
                  <p style={{ fontSize: '0.8rem', marginTop: 6 }}>
                    Adicione questões do banco ao lado e clique em <strong>👁️ Estúdio A4 / PDF / Word</strong> para visualizar o modelo diagramado.
                  </p>
                </div>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 380px)', paddingRight: 2 }}>
                  {itens.map((item, idx) => (
                    <ProvaItem
                      key={item._tempId || item.questao_id}
                      item={item}
                      idx={idx}
                      accentColor={config.template_slug === 'modelo_01_provao' ? layoutCfg.cor_destaque : '#0e7490'}
                      onRemove={removeItem}
                      onChangePontos={changePontos}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
                  ))}
                </div>
              )}

              {itens.length > 0 && (
                <div style={{
                  flexShrink: 0, padding: '10px 14px',
                  background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                  borderRadius: 10, border: '1.5px solid #fed7aa',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                }}>
                  <span style={{ fontSize: '0.82rem', color: '#9a3412', fontWeight: 700 }}>
                    📊 {itens.length} questão(ões) · {templateAtivo.numero}
                  </span>
                  <span style={{ fontSize: '0.96rem', color: '#c2410c', fontWeight: 800 }}>
                    Total: {totalPontos.toFixed(2)} pts
                  </span>
                  <button
                    type="button"
                    onClick={abrirPreviewDireto}
                    style={{
                      padding: '5px 12px', borderRadius: 7, border: 'none',
                      background: '#ea580c', color: '#fff', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    👁️ Ver Caderno A4 Paginado →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'template' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎨 Catálogo de Modelos da Escola
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                    Cada escola pode escolher livremente o modelo de cada avaliação ou fixar seu modelo institucional padrão.
                  </div>
                </div>
              </div>

              <GaleriaModelosEscola
                value={config.template_slug}
                accentColor={layoutCfg.cor_destaque}
                padraoEscolaSlug={padraoEscolaSlug}
                onChange={(slug) => updateConfig({ template_slug: slug })}
                onDefinirPadrao={definirPadraoEscola}
              />

              {config.template_slug === 'modelo_01_provao' && (
                <div style={{ marginTop: 16 }}>
                  <ProvaConfigPanel
                    config={config}
                    layoutCfg={layoutCfg}
                    onChange={updateConfig}
                    onChangeLayout={updateLayoutCfg}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
