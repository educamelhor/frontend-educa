// src/features/questoes/ProvaBuilder.jsx
// 🧩 EDUCA.PROVA — Sprint 3: Montador de Provas
// Drag & Drop nativo HTML5 · Templates visuais · Paginação do banco

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProvaPreview from './ProvaPreview';
import apiService from '../../services/api';


/* ── Templates ──────────────────────────────────────────────────────────────── */
const TEMPLATES = [
  {
    slug: 'objetiva_2col', label: 'Objetiva 2 Colunas',
    icon: '📋', desc: 'Alternativas A–E em 2 colunas',
    preview: ['Q1 ⬡⬡⬡⬡⬡', 'Q2 ⬡⬡⬡⬡⬡', '─────────────', 'Q3 ⬡⬡⬡⬡⬡', 'Q4 ⬡⬡⬡⬡⬡'],
    color: '#0e7490',
  },
  {
    slug: 'objetiva_1col', label: 'Objetiva 1 Coluna',
    icon: '📄', desc: 'Layout linear, questões em bloco',
    preview: ['Q1 ─────────────────', 'Q2 ─────────────────', 'Q3 ─────────────────'],
    color: '#1d4ed8',
  },
  {
    slug: 'discursiva', label: 'Discursiva',
    icon: '✍️', desc: 'Linhas para resposta escrita',
    preview: ['Q1 ─────────────────', '     _______________', '     _______________', 'Q2 ─────────────────'],
    color: '#7c3aed',
  },
  {
    slug: 'mista', label: 'Mista',
    icon: '🔀', desc: 'Objetivas + Discursivas',
    preview: ['Q1 ⬡⬡⬡⬡⬡', 'Q2 ─────────────', '   ____________'],
    color: '#059669',
  },
  {
    slug: 'enem', label: 'Simulado ENEM',
    icon: '🏆', desc: '5 alternativas · Caderno A/B',
    preview: ['Q1 ⬡⬡⬡⬡⬡', 'Q2 ⬡⬡⬡⬡⬡', 'Q3 ⬡⬡⬡⬡⬡', '─ 45 questões ─'],
    color: '#dc2626',
  },
];

/* ── Nível labels ────────────────────────────────────────────────────────────── */
const NIVEL_COLORS = { facil: '#059669', medio: '#d97706', dificil: '#dc2626', enem: '#7c3aed' };
const NIVEL_LABEL  = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };
const TIPO_LABEL   = { objetiva: 'Obj', discursiva: 'Disc', verdadeiro_falso: 'V/F', associacao: 'Assoc', lacuna: 'Lac' };

/* ── API helpers ────────────────────────────────────────────────────────────── */
// Usa o apiService (axios) configurado com a base URL correta do backend.
// NOTA: anteriormente usava fetch nativo com URL relativa, que apontava para o
// servidor Vercel em vez do backend DigitalOcean — causando "Nenhuma questão encontrada".
const api = async (path, opts = {}) => {
  const method = (opts.method || 'GET').toUpperCase();
  const body   = opts.body ? JSON.parse(opts.body) : undefined;

  const response = await apiService.request({
    url:    path,
    method,
    data:   body,
  });

  return response.data ?? null;
};

/* ══════════════════════════════════════════════════════════════════════════════
   TEMPLATE SELECTOR
══════════════════════════════════════════════════════════════════════════════ */
function TemplateSelector({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
      {TEMPLATES.map(t => {
        const active = value === t.slug;
        return (
          <div
            key={t.slug}
            onClick={() => onChange(t.slug)}
            style={{
              cursor: 'pointer', borderRadius: 10, padding: '12px 10px',
              border: `2px solid ${active ? t.color : '#e2e8f0'}`,
              background: active ? `${t.color}0e` : '#fff',
              textAlign: 'center', transition: 'all 0.15s',
              boxShadow: active ? `0 0 0 3px ${t.color}30` : '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: active ? t.color : '#1e293b' }}>
              {t.label}
            </div>
            <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: 2 }}>{t.desc}</div>
            {/* mini preview */}
            <div style={{
              marginTop: 8, padding: '6px 4px',
              background: active ? '#fff' : '#f8fafc', borderRadius: 6,
              border: `1px solid ${active ? `${t.color}30` : '#e2e8f0'}`,
              fontSize: '0.5rem', color: active ? t.color : '#94a3b8',
              lineHeight: 1.7, textAlign: 'left', fontFamily: 'monospace',
            }}>
              {t.preview.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            {active && (
              <div style={{ marginTop: 6, fontSize: '0.65rem', fontWeight: 700, color: t.color }}>
                ✓ Selecionado
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   QUESTAO CARD — painel esquerdo (banco)
══════════════════════════════════════════════════════════════════════════════ */
function BancoQuestaoCard({ questao, onAdd, onDuplicate, jaAdicionada }) {
  const nivel = questao.nivel || 'medio';
  return (
    <div
      draggable
      onDragStart={e => {
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
        opacity: jaAdicionada ? 0.7 : 1,
      }}
    >
      {/* Nível dot */}
      <div style={{
        width: 6, borderRadius: 3, alignSelf: 'stretch', flexShrink: 0,
        background: NIVEL_COLORS[nivel] || '#94a3b8',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Meta badges */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
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

      {/* Ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {/* Botão adicionar */}
        <button
          onClick={() => !jaAdicionada && onAdd(questao)}
          disabled={jaAdicionada}
          title={jaAdicionada ? 'Já adicionada' : 'Adicionar à prova'}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: jaAdicionada ? '#86efac' : '#0e7490',
            border: 'none', cursor: jaAdicionada ? 'default' : 'pointer',
            color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          {jaAdicionada ? '✓' : '+'}
        </button>
        {/* Botão duplicar */}
        {onDuplicate && (
          <button
            onClick={() => onDuplicate(questao.id)}
            title="Duplicar questão"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#f1f5f9', border: '1.5px solid #e2e8f0',
              cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.target.style.background = '#e2e8f0'}
            onMouseLeave={e => e.target.style.background = '#f1f5f9'}
          >
            📄
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PROVA ITEM — painel direito (questões selecionadas)
══════════════════════════════════════════════════════════════════════════════ */
function ProvaItem({ item, idx, total, onRemove, onChangePontos, onDragStart, onDragOver, onDrop }) {
  const nivel = item.nivel || 'medio';
  let alts = [];
  try { alts = JSON.parse(item.alternativas_json || '[]'); } catch {}

  return (
    <div
      draggable
      onDragStart={() => onDragStart(idx)}
      onDragOver={e => { e.preventDefault(); onDragOver(idx); }}
      onDrop={() => onDrop(idx)}
      style={{
        padding: '10px 14px', borderRadius: 10, marginBottom: 8,
        background: '#fff', border: '1.5px solid #e2e8f0',
        display: 'flex', gap: 10, alignItems: 'flex-start',
        cursor: 'grab', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* drag handle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 6, flexShrink: 0, cursor: 'grab' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 2 }}>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
          </div>
        ))}
      </div>

      {/* Número */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #0e7490, #1d4ed8)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.78rem', fontWeight: 800,
      }}>
        {idx + 1}
      </div>

      {/* Conteúdo */}
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

      {/* Pontuação */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number"
          min="0.25" max="100" step="0.25"
          value={item._pontos ?? 1}
          onChange={e => onChangePontos(idx, Number(e.target.value))}
          onClick={e => e.stopPropagation()}
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

      {/* Remover */}
      <button
        onClick={() => onRemove(idx)}
        style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
          background: '#fff', border: '1.5px solid #fca5a5',
          color: '#dc2626', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', fontFamily: 'inherit', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.target.style.background = '#fef2f2'; }}
        onMouseLeave={e => { e.target.style.background = '#fff'; }}
        title="Remover da prova"
      >
        ×
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAINEL CONFIG DA PROVA
══════════════════════════════════════════════════════════════════════════════ */
function ProvaConfig({ config, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
      {/* Título */}
      <div style={{ gridColumn: '1/-1' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Título da Prova *
        </label>
        <input
          type="text" placeholder="Ex: Avaliação Bimestral de Matemática"
          value={config.titulo}
          onChange={e => onChange({ titulo: e.target.value })}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4,
            border: '1.5px solid #e2e8f0', fontSize: '0.88rem', fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Disciplina */}
      <div>
        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Disciplina
        </label>
        <input
          type="text" placeholder="Ex: Matemática"
          value={config.disciplina}
          onChange={e => onChange({ disciplina: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #e2e8f0', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      {/* Turma */}
      <div>
        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Turma
        </label>
        <input
          type="text" placeholder="Ex: 9º A"
          value={config.turma}
          onChange={e => onChange({ turma: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #e2e8f0', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      {/* Bimestre */}
      <div>
        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Bimestre
        </label>
        <select
          value={config.bimestre}
          onChange={e => onChange({ bimestre: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #e2e8f0', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}
        >
          <option value="">Selecione</option>
          {[1,2,3,4].map(b => <option key={b} value={b}>{b}º Bimestre</option>)}
        </select>
      </div>

      {/* Ano */}
      <div>
        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ano Letivo
        </label>
        <input
          type="number" placeholder={new Date().getFullYear()}
          value={config.ano_letivo}
          onChange={e => onChange({ ano_letivo: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, border: '1.5px solid #e2e8f0', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      {/* Embaralhar alternativas — Sprint 5 */}
      <div style={{ gridColumn: '1/-1' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}
          onClick={() => onChange({ embaralhar_alternativas: config.embaralhar_alternativas ? 0 : 1 })}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
            border: `2px solid ${config.embaralhar_alternativas ? '#0e7490' : '#cbd5e1'}`,
            background: config.embaralhar_alternativas ? '#0e7490' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>
            {config.embaralhar_alternativas ? <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>✓</span> : null}
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>🔀 Embaralhar alternativas</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Mistura a ordem das alternativas automaticamente ao gerar o PDF</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — ProvaBuilder
══════════════════════════════════════════════════════════════════════════════ */
export default function ProvaBuilder({ onProvasSalvas }) {
  // ── Config da prova ──────────────────────────────────────────────────────
  const [provaId,    setProvaId]    = useState(null);
  const [config, setConfig] = useState({
    titulo: '', disciplina: '', turma: '', bimestre: '', ano_letivo: new Date().getFullYear(),
    template_slug: 'objetiva_2col', embaralhar_alternativas: 0,
  });

  const [itens,      setItens]      = useState([]); // [{questao_id, conteudo_bruto, nivel, ...pontos}]

  // ── Banco de questões (painel esquerdo) ──────────────────────────────────
  const [banco,        setBanco]       = useState([]);
  const [bancoBusca,   setBancoBusca]  = useState('');
  const [bancoDisc,    setBancoDisc]   = useState('');
  const [bancoNivel,   setBancoNivel]  = useState('');
  const [bancoPage,    setBancoPage]   = useState(1);
  const [bancoTotal,   setBancoTotal]  = useState(0);
  const [bancoLoading, setBancoLoading]= useState(false);
  const bancoTimer = useRef(null);

  // ── UI states ────────────────────────────────────────────────────────────
  const [saving,      setSaving]      = useState(false);
  const [feedback,    setFeedback]    = useState(null);
  const [activeTab,   setActiveTab]   = useState('questoes');
  const [dropOver,    setDropOver]    = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [metaQuestoes, setMetaQuestoes] = useState(10); // meta de questoes por prova
  const dragFromBancoRef = useRef(null);
  const dragIdxRef       = useRef(null);


  // ── Carregar banco ───────────────────────────────────────────────────────
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
    } catch { setBanco([]); }
    finally { setBancoLoading(false); }
  }, [bancoBusca, bancoDisc, bancoNivel]);

  useEffect(() => {
    clearTimeout(bancoTimer.current);
    bancoTimer.current = setTimeout(() => { setBancoPage(1); carregarBanco(1); }, bancoBusca ? 350 : 0);
    return () => clearTimeout(bancoTimer.current);
  }, [bancoBusca, bancoDisc, bancoNivel]);

  useEffect(() => { carregarBanco(bancoPage); }, [bancoPage]);

  // ── IDs já adicionados ───────────────────────────────────────────────────
  const adicionadosIds = new Set(itens.map(i => i.questao_id));

  // ── Adicionar questão ────────────────────────────────────────────────────
  const addQuestao = (questao) => {
    if (adicionadosIds.has(questao.id)) return;
    setItens(prev => [...prev, {
      _tempId: Date.now(),
      questao_id: questao.id,
      _pontos: 1,
      ...questao,
    }]);
    toast('✅ Questão adicionada!', 'success');
  };

  // ── Duplicar questão do banco ─────────────────────────────────────────────
  const duplicarQuestao = async (id) => {
    try {
      const r = await api(`/api/questoes/${id}/duplicar`, { method: 'POST' });
      if (r) { toast('📄 Questão duplicada no banco!', 'success'); carregarBanco(bancoPage); }
    } catch { toast('❌ Erro ao duplicar.', 'error'); }
  };

  // ── Remover questão ──────────────────────────────────────────────────────
  const removeItem = (idx) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Drag & Drop dentro da lista da prova ─────────────────────────────────
  const handleDragStart = (idx) => { dragIdxRef.current = idx; };
  const handleDragOver  = (_idx) => {};
  const handleDrop      = (toIdx) => {
    const fromIdx = dragIdxRef.current;
    if (fromIdx === null || fromIdx === toIdx) return;
    setItens(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    dragIdxRef.current = null;
  };

  // ── Drop zone da prova (drag do banco) ───────────────────────────────────
  const handleDropZone = (e) => {
    e.preventDefault();
    setDropOver(false);
    const json = e.dataTransfer.getData('questao_json');
    if (json) {
      try { addQuestao(JSON.parse(json)); } catch {}
    }
  };

  // ── Pontuação ────────────────────────────────────────────────────────────
  const changePontos = (idx, val) => {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, _pontos: val } : it));
  };

  const totalPontos = itens.reduce((s, it) => s + (Number(it._pontos) || 0), 0);

  // ── Config update ─────────────────────────────────────────────────────────
  const updateConfig = (partial) => setConfig(c => ({ ...c, ...partial }));

  // ── Toast ─────────────────────────────────────────────────────────────────
  const toast = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2800);
  };

  // ── SALVAR PROVA ──────────────────────────────────────────────────────────
  const salvar = async (statusFinal = 'montando') => {
    if (!config.titulo.trim()) { toast('⚠️ Informe o título da prova.', 'warn'); return; }
    if (itens.length === 0)    { toast('⚠️ Adicione ao menos uma questão.', 'warn'); return; }
    setSaving(true);
    try {
      let id = provaId;
      const body = { ...config, status: statusFinal };

      if (!id) {
        const res = await api('/api/provas', { method: 'POST', body: JSON.stringify(body) });
        id = res.id;
        setProvaId(id);
      } else {
        await api(`/api/provas/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      }

      // Salva itens (simplificado: recria todos)
      // Para MVP, salva via endpoint add para novos itens
      for (const item of itens) {
        if (!item._serverItemId) {
          const r = await api(`/api/provas/${id}/questoes`, {
            method: 'POST',
            body: JSON.stringify({ questao_id: item.questao_id, valor_pontos: item._pontos || 1 }),
          });
          item._serverItemId = r?.id;
        }
      }

      // Reordena
      const ordemPayload = itens.map((it, idx) => ({ id: it._serverItemId, ordem: idx + 1 }))
                                .filter(it => it.id);
      if (ordemPayload.length > 0) {
        await api(`/api/provas/${id}/reordenar`, { method: 'POST', body: JSON.stringify({ ordem: ordemPayload }) });
      }

      toast(statusFinal === 'pronta' ? '🎉 Prova finalizada com sucesso!' : '✅ Prova salva como rascunho!', 'success');
      if (onProvasSalvas) onProvasSalvas();
    } catch (err) {
      toast(`❌ Erro: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── NOVA PROVA ────────────────────────────────────────────────────────────
  const novaProva = () => {
    setProvaId(null);
    setConfig({ titulo: '', disciplina: '', turma: '', bimestre: '', ano_letivo: new Date().getFullYear(), template_slug: 'objetiva_2col' });
    setItens([]);
    toast('🆕 Nova prova iniciada.', 'info');
  };

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  const templateAtivo = TEMPLATES.find(t => t.slug === config.template_slug) || TEMPLATES[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0 }}>

      {/* Toast */}
      {feedback && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 2000,
          padding: '10px 20px', borderRadius: 10,
          background: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'error' ? '#fef2f2' : feedback.type === 'warn' ? '#fffbeb' : '#f0f9ff',
          border: `1.5px solid ${feedback.type === 'success' ? '#86efac' : feedback.type === 'error' ? '#fca5a5' : feedback.type === 'warn' ? '#fcd34d' : '#bae6fd'}`,
          color: feedback.type === 'success' ? '#166534' : feedback.type === 'error' ? '#991b1b' : feedback.type === 'warn' ? '#92400e' : '#0369a1',
          fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          animation: 'bq-fadein 0.2s ease',
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Header da prova em construção */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 50%, #1d4ed8 100%)',
        borderRadius: 14, padding: '16px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {provaId ? `Prova #${provaId}` : 'Nova prova'}
          </div>
          <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 800, marginTop: 2 }}>
            {config.titulo || 'Sem título ainda...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            {totalPontos.toFixed(2)} pts · {templateAtivo.icon} {templateAtivo.label}
          </div>

          {/* Indicador de progresso */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
                {itens.length} / <input
                  type="number" min={1} max={100}
                  value={metaQuestoes}
                  onChange={e => setMetaQuestoes(Math.max(1, Number(e.target.value)))}
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: 34, padding: '1px 4px', borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff', fontFamily: 'inherit',
                    fontSize: '0.7rem', fontWeight: 700, textAlign: 'center',
                  }}
                  title="Meta de questões"
                /> questões
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: itens.length >= metaQuestoes ? '#4ade80' : 'rgba(255,255,255,0.45)' }}>
                {itens.length >= metaQuestoes ? '\u2713 Meta!' : `faltam ${metaQuestoes - itens.length}`}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)', width: 180, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${Math.min(100, (itens.length / metaQuestoes) * 100)}%`,
                background: itens.length >= metaQuestoes
                  ? 'linear-gradient(90deg,#4ade80,#22c55e)'
                  : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={novaProva} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700 }}>
            🆕 Nova
          </button>
          <button onClick={() => salvar('montando')} disabled={saving} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700 }}>
            💾 Salvar
          </button>
          {provaId && (
            <button onClick={() => setShowPreview(true)} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700 }}>
              👁️ Preview / PDF
            </button>
          )}
          <button onClick={() => salvar('pronta')} disabled={saving} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 800 }}>
            {saving ? '⏳ Salvando...' : '✅ Finalizar Prova'}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && provaId && (
        <ProvaPreview
          provaId={provaId}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Corpo: 2 painéis */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, minHeight: 0 }}>

        {/* ── Painel esquerdo: Banco ────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0',
            padding: '14px', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📚 Banco de Questões
            </div>

            <input
              type="search" placeholder="Buscar questão..."
              value={bancoBusca} onChange={e => setBancoBusca(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text" placeholder="Disciplina"
                value={bancoDisc} onChange={e => setBancoDisc(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontFamily: 'inherit' }}
              />
              <select
                value={bancoNivel} onChange={e => { setBancoNivel(e.target.value); setBancoPage(1); }}
                style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontFamily: 'inherit', background: '#fff' }}
              >
                <option value="">Nível</option>
                {Object.entries(NIVEL_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'right' }}>
              {bancoTotal} questão(ões) · Pg {bancoPage}
            </div>
          </div>

          {/* Lista scrollável */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', paddingRight: 2 }}>
            {bancoLoading ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: '0.82rem' }}>
                ⏳ Carregando...
              </div>
            ) : banco.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: '0.82rem' }}>
                Nenhuma questão encontrada.
              </div>
            ) : (
              banco.map(q => (
                <BancoQuestaoCard
                  key={q.id} questao={q}
                  onAdd={addQuestao}
                  onDuplicate={duplicarQuestao}
                  jaAdicionada={adicionadosIds.has(q.id)}
                />
              ))
            )}

            {/* Paginação mini */}
            {bancoTotal > 15 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                <button onClick={() => setBancoPage(p => Math.max(1, p - 1))} disabled={bancoPage <= 1}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>←</button>
                <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '28px' }}>{bancoPage}</span>
                <button onClick={() => setBancoPage(p => p + 1)} disabled={banco.length < 15}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>→</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Painel direito: Prova ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Tabs: Questões | Template */}
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {[
              { key: 'config',   label: '⚙️ Configurações' },
              { key: 'questoes', label: `📋 Questões (${itens.length})` },
              { key: 'template', label: `${templateAtivo.icon} Template` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: activeTab === tab.key ? '#fff' : 'transparent',
                  color: activeTab === tab.key ? '#0e7490' : '#64748b',
                  boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}>{tab.label}</button>
            ))}
          </div>

          {/* ── Tab: Configurações ── */}
          {activeTab === 'config' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 16 }}>
              <ProvaConfig config={config} onChange={updateConfig} />
            </div>
          )}

          {/* ── Tab: Questões ── */}
          {activeTab === 'questoes' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDropOver(true); }}
                onDragLeave={() => setDropOver(false)}
                onDrop={handleDropZone}
                style={{
                  flexShrink: 0, padding: '12px 16px',
                  borderRadius: 10, border: `2px dashed ${dropOver ? '#0e7490' : '#cbd5e1'}`,
                  background: dropOver ? '#f0f9ff' : '#f8fafc',
                  textAlign: 'center', fontSize: '0.8rem',
                  color: dropOver ? '#0369a1' : '#94a3b8',
                  transition: 'all 0.15s', fontWeight: 600,
                }}
              >
                {dropOver ? '📥 Solte a questão aqui' : '👆 Arraste questões do banco ou clique em "+"'}
              </div>

              {/* Lista de questões da prova */}
              {itens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 10 }}>📋</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>Prova em branco</div>
                  <p style={{ fontSize: '0.8rem', marginTop: 6 }}>
                    Adicione questões do banco ao lado para montar sua prova.
                  </p>
                </div>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 380px)', paddingRight: 2 }}>
                  {itens.map((item, idx) => (
                    <ProvaItem
                      key={item._tempId || item.questao_id}
                      item={item} idx={idx} total={itens.length}
                      onRemove={removeItem}
                      onChangePontos={changePontos}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
                  ))}
                </div>
              )}

              {/* Rodapé com totais */}
              {itens.length > 0 && (
                <div style={{
                  flexShrink: 0, padding: '10px 14px',
                  background: 'linear-gradient(135deg, #f0f9ff, #eff6ff)',
                  borderRadius: 10, border: '1.5px solid #bae6fd',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 700 }}>
                    📊 {itens.length} questão(ões)
                  </span>
                  <span style={{ fontSize: '1rem', color: '#0e7490', fontWeight: 800 }}>
                    Total: {totalPontos.toFixed(2)} pts
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600 }}>
                    Média: {(totalPontos / itens.length).toFixed(2)} pts/questão
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Template ── */}
          {activeTab === 'template' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                🎨 Escolha o Layout da Prova
              </div>
              <TemplateSelector value={config.template_slug} onChange={v => updateConfig({ template_slug: v })} />

              {/* Info do template selecionado */}
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: `${templateAtivo.color}0d`,
                border: `1.5px solid ${templateAtivo.color}30`,
                borderRadius: 10,
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: templateAtivo.color, marginBottom: 4 }}>
                  {templateAtivo.icon} {templateAtivo.label} — selecionado
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {templateAtivo.desc}. Use o botão "👁️ Preview / PDF" para visualizar e baixar o PDF.
                </div>
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff', borderRadius: 8, border: `1px solid ${templateAtivo.color}20` }}>
                  <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Preview</div>
                  {templateAtivo.preview.map((l, i) => (
                    <div key={i} style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: templateAtivo.color, lineHeight: 1.8 }}>{l}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
