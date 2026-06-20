// src/features/plataforma/PlataformaModulos.jsx
// ============================================================================
// CEO Module Licensing — define which menus each school can access
// Two-panel: left = school list | right = module tree toggles
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Full module tree ──────────────────────────────────────────────────────────
const MODULOS_TREE = [
  {
    id: 'secretaria', label: 'Secretaria', icon: '📋',
    filhos: [
      { id: 'secretaria.alunos', label: 'Alunos' },
      { id: 'secretaria.responsaveis', label: 'Responsáveis' },
      { id: 'secretaria.cargas_horarias', label: 'Cargas Horárias' },
      { id: 'secretaria.disciplinas', label: 'Disciplinas' },
      { id: 'secretaria.turmas', label: 'Turmas' },
      { id: 'secretaria.professores', label: 'Professores' },
      { id: 'secretaria.boletim', label: 'Boletim (Edição)' },
      { id: 'secretaria.relatorios', label: 'Relatórios' },
      { id: 'secretaria.horarios', label: 'Horários' },
      { id: 'secretaria.agente', label: 'Agente' },
      { id: 'secretaria.tabela_codigos', label: 'Tabela de Códigos' },
      { id: 'secretaria.sincronizar_seedf', label: 'Sincronizar SEEDF' },
      { id: 'secretaria.modulacao', label: 'Modulação' },
    ]
  },
  {
    id: 'disciplinar', label: 'Disciplinar', icon: '⚖️',
    filhos: [
      { id: 'disciplinar.alunos', label: 'Alunos' },
      { id: 'disciplinar.historico', label: 'Histórico' },
      { id: 'disciplinar.atas', label: 'Atas' },
      { id: 'disciplinar.fo_coletivo', label: 'F.O. Coletivo' },
      { id: 'disciplinar.responsaveis', label: 'Responsáveis' },
      { id: 'disciplinar.liberacao', label: 'Liberação' },
      { id: 'disciplinar.metadados', label: 'Metadados' },
      { id: 'disciplinar.equipe', label: 'Gestão de Equipe' },
      { id: 'disciplinar.regimentos', label: 'Regimentos' },
      { id: 'disciplinar.manual', label: 'Manual' },
    ]
  },
  {
    id: 'pedagogico', label: 'Pedagógico', icon: '🎓',
    filhos: [
      { id: 'pedagogico.conselho', label: 'Conselho de Classe' },
      { id: 'pedagogico.conteudos', label: 'Conteúdos' },
      { id: 'pedagogico.solicitacoes', label: 'Solicitações' },
      { id: 'pedagogico.provas', label: 'Provas' },
      { id: 'pedagogico.correcoes', label: 'Correções' },
      { id: 'pedagogico.relatorios', label: 'Relatórios' },
    ]
  },
  {
    id: 'gabarito', label: 'Gabarito', icon: '✅',
    filhos: [
      { id: 'gabarito.gerar', label: 'Gerar / Imprimir' },
      { id: 'gabarito.corrigir_lote', label: 'Corrigir Lote' },
      { id: 'gabarito.corrigir', label: 'Corrigir' },
      { id: 'gabarito.resultados', label: 'Resultados' },
    ]
  },
  {
    id: 'frequencia', label: 'Frequência', icon: '📅',
    filhos: [
      { id: 'frequencia.atestados', label: 'Atestados' },
      { id: 'frequencia.relatorios', label: 'Relatórios' },
      { id: 'frequencia.busca_ativa', label: 'Busca Ativa' },
      { id: 'frequencia.conselho_tutelar', label: 'Conselho Tutelar' },
    ]
  },
  {
    id: 'biblioteca', label: 'Biblioteca', icon: '📚',
    filhos: [
      { id: 'biblioteca.acervo', label: 'Acervo' },
      { id: 'biblioteca.emprestimos', label: 'Empréstimos' },
      { id: 'biblioteca.alunos', label: 'Alunos Leitores' },
      { id: 'biblioteca.leitor_destaque', label: 'Leitor Destaque' },
      { id: 'biblioteca.concurso', label: 'Ranking & Concurso' },
      { id: 'biblioteca.metadados', label: 'Metadados' },
    ]
  },
  {
    id: 'professores', label: 'Professores', icon: '👩🏫',
    filhos: [
      { id: 'professores.planos', label: 'Planos' },
      { id: 'professores.avaliacoes', label: 'Avaliações' },
      { id: 'professores.conteudos', label: 'Conteúdos' },
      { id: 'professores.provas', label: 'Provas' },
      { id: 'professores.conselho', label: 'Conselho de Classe' },
      { id: 'professores.boletim', label: 'Boletim Manual' },
    ]
  },
  {
    id: 'monitoramento', label: 'Monitoramento', icon: '📡',
    filhos: [
      { id: 'monitoramento.painel', label: 'Painel' },
      { id: 'monitoramento.alertas', label: 'Alertas' },
      { id: 'monitoramento.embeddings', label: 'Embeddings' },
    ]
  },
  {
    id: 'questoes', label: 'Banco de Questões', icon: '❓',
    filhos: []
  },
  {
    id: 'agente_educa', label: 'Agente EDUCA', icon: '🤖',
    filhos: [
      { id: 'agente_educa.credenciais', label: 'Credenciais' },
      { id: 'agente_educa.planos', label: 'Planos' },
      { id: 'agente_educa.notas', label: 'Notas' },
    ]
  },
  {
    id: 'impressao', label: 'Impressão', icon: '🖨️',
    filhos: [
      { id: 'impressao.gabaritos', label: 'Gabaritos' },
      { id: 'impressao.boletins', label: 'Boletins' },
      { id: 'impressao.listas', label: 'Listas' },
      { id: 'impressao.documentos', label: 'Documentos' },
    ]
  },
  {
    id: 'ferramentas', label: 'Ferramentas', icon: '🔧',
    filhos: []
  },
  {
    id: 'direcao', label: 'Direção', icon: '🏛️',
    filhos: [
      { id: 'direcao.educa_capture', label: 'Educa-Capture' },
      { id: 'direcao.responsaveis', label: 'Responsáveis' },
      { id: 'direcao.cadastro', label: 'Cadastro de Membros' },
      { id: 'direcao.governanca', label: 'Governança' },
    ]
  },
];

// ── Group accent colors (cycle) ───────────────────────────────────────────────
const GROUP_COLORS = [
  { accent: '#6366f1', bg: 'rgba(99,102,241,0.06)' },
  { accent: '#3b82f6', bg: 'rgba(59,130,246,0.06)' },
  { accent: '#10b981', bg: 'rgba(16,185,129,0.06)' },
  { accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  { accent: '#ec4899', bg: 'rgba(236,72,153,0.06)' },
  { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.06)' },
  { accent: '#14b8a6', bg: 'rgba(20,184,166,0.06)' },
];

// ── Total leaf count ──────────────────────────────────────────────────────────
const TOTAL_MODULOS = MODULOS_TREE.reduce((acc, g) =>
  acc + (g.filhos.length > 0 ? g.filhos.length : 1), 0
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGroupState(grupo, ativos) {
  if (grupo.filhos.length === 0) {
    return ativos.has(grupo.id) ? 'all' : 'none';
  }
  const ativosCount = grupo.filhos.filter(f => ativos.has(f.id)).length;
  if (ativosCount === 0) return 'none';
  if (ativosCount === grupo.filhos.length) return 'all';
  return 'some';
}

function getGroupAccent(state, accent) {
  if (state === 'all') return '#10b981';
  if (state === 'some') return accent;
  return '#475569';
}

function getGroupBorder(state, accent) {
  if (state === 'all') return 'rgba(16,185,129,0.25)';
  if (state === 'some') return `${accent}40`;
  return 'rgba(255,255,255,0.06)';
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ isActive, onClick, size = 'md' }) {
  const [hover, setHover] = useState(false);
  const w = size === 'sm' ? 38 : 44;
  const h = size === 'sm' ? 20 : 24;
  const knob = size === 'sm' ? 16 : 20;
  const knobOffset = size === 'sm' ? 2 : 2;
  const knobActiveLeft = w - knob - knobOffset;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="switch"
      aria-checked={isActive}
      style={{
        width: w, height: h, borderRadius: h / 2,
        background: isActive
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : hover ? '#334155' : '#1e293b',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.25s cubic-bezier(0.4,0,0.2,1)',
        border: isActive ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isActive ? '0 0 12px rgba(99,102,241,0.35)' : 'none',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: knobOffset,
        left: isActive ? knobActiveLeft : knobOffset,
        width: knob, height: knob,
        borderRadius: '50%',
        background: isActive ? '#ffffff' : '#64748b',
        boxShadow: isActive
          ? '0 2px 6px rgba(0,0,0,0.4), 0 0 4px rgba(99,102,241,0.3)'
          : '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1), background 0.2s',
      }} />
    </div>
  );
}

// ── Copy modal ────────────────────────────────────────────────────────────────
function CopyModal({ escolas, escolaAtual, onConfirm, onClose }) {
  const [origemId, setOrigemId] = useState('');
  const [confirmHover, setConfirmHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  const origens = escolas.filter(e => e.id !== escolaAtual?.id);
  const origem = origens.find(e => String(e.id) === String(origemId));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 24,
        padding: '36px 40px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)',
        animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: 12 }}>📋</div>
        <h3 style={{
          fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9',
          textAlign: 'center', marginBottom: 8,
        }}>
          Copiar configuração
        </h3>
        <p style={{
          fontSize: '0.85rem', color: 'rgba(148,163,184,0.8)',
          textAlign: 'center', marginBottom: 28, lineHeight: 1.6,
        }}>
          Selecione a escola de origem. Isso substituirá a configuração atual de{' '}
          <strong style={{ color: '#f1f5f9' }}>{escolaAtual?.nome}</strong>.
        </p>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block', fontSize: '0.72rem', fontWeight: 700,
            color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: 8,
          }}>
            Escola de Origem
          </label>
          <select
            value={origemId}
            onChange={e => setOrigemId(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px',
              borderRadius: 12, fontSize: '0.9rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f1f5f9', outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">— Selecione uma escola —</option>
            {origens.map(e => (
              <option key={e.id} value={e.id} style={{ background: '#1e293b' }}>
                {e.nome} {e.apelido ? `(${e.apelido})` : ''}
              </option>
            ))}
          </select>
        </div>

        {origemId && (
          <div style={{
            marginBottom: 24, padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            fontSize: '0.82rem', color: '#fbbf24', lineHeight: 1.5,
          }}>
            ⚠️ A configuração atual de <strong>{escolaAtual?.nome}</strong> será <strong>substituída</strong> pelos módulos de <strong>{origem?.nome}</strong>.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: cancelHover ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: 'rgba(148,163,184,0.9)', fontWeight: 600, fontSize: '0.9rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Cancelar
          </button>
          <button
            disabled={!origemId}
            onClick={() => origemId && onConfirm(origemId)}
            onMouseEnter={() => setConfirmHover(true)}
            onMouseLeave={() => setConfirmHover(false)}
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 12,
              border: 'none',
              background: origemId
                ? confirmHover
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(255,255,255,0.06)',
              color: origemId ? '#fff' : 'rgba(148,163,184,0.4)',
              fontWeight: 700, fontSize: '0.9rem',
              cursor: origemId ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: origemId && confirmHover ? '0 8px 24px rgba(99,102,241,0.35)' : 'none',
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Module Group Card ─────────────────────────────────────────────────────────
function ModuloGrupo({ grupo, colorDef, ativos, onToggle, expandido, onToggleExpand }) {
  const [hoverGroup, setHoverGroup] = useState(false);
  const groupState = getGroupState(grupo, ativos);
  const accent = getGroupAccent(groupState, colorDef.accent);
  const borderColor = getGroupBorder(groupState, colorDef.accent);

  const hasSubs = grupo.filhos.length > 0;

  return (
    <div style={{
      borderRadius: 16,
      background: groupState === 'none'
        ? 'rgba(255,255,255,0.02)'
        : groupState === 'all'
          ? 'rgba(16,185,129,0.05)'
          : colorDef.bg,
      border: `1px solid ${borderColor}`,
      overflow: 'hidden',
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: groupState !== 'none' ? `0 4px 20px ${accent}18` : 'none',
    }}>
      {/* Group header row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          cursor: hasSubs ? 'pointer' : 'default',
          userSelect: 'none',
          background: hoverGroup && hasSubs ? 'rgba(255,255,255,0.03)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={() => hasSubs && setHoverGroup(true)}
        onMouseLeave={() => setHoverGroup(false)}
        onClick={() => hasSubs && onToggleExpand(grupo.id)}
      >
        {/* Expand chevron */}
        {hasSubs ? (
          <span style={{
            fontSize: '0.65rem', color: 'rgba(148,163,184,0.5)',
            transition: 'transform 0.2s',
            transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}>▶</span>
        ) : (
          <span style={{ width: 12 }} />
        )}

        {/* Icon */}
        <span style={{ fontSize: '1.3rem', lineHeight: 1, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}>
          {grupo.icon}
        </span>

        {/* Label */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.9rem', fontWeight: 700,
            color: groupState === 'none' ? 'rgba(148,163,184,0.7)' : '#f1f5f9',
            letterSpacing: '0.01em',
          }}>
            {grupo.label}
          </div>
          {hasSubs && (
            <div style={{
              fontSize: '0.65rem', fontWeight: 600,
              color: accent,
              marginTop: 1,
              opacity: 0.8,
            }}>
              {groupState === 'all' ? `${grupo.filhos.length}/${grupo.filhos.length} ativos` :
               groupState === 'some' ? `${grupo.filhos.filter(f => ativos.has(f.id)).length}/${grupo.filhos.length} ativos` :
               'nenhum ativo'}
            </div>
          )}
        </div>

        {/* Status pill */}
        <div style={{
          padding: '3px 10px', borderRadius: 20,
          fontSize: '0.6rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: groupState === 'all'
            ? 'rgba(16,185,129,0.15)'
            : groupState === 'some'
              ? `${colorDef.accent}20`
              : 'rgba(255,255,255,0.05)',
          color: accent,
          border: `1px solid ${accent}30`,
          whiteSpace: 'nowrap',
        }}>
          {groupState === 'all' ? '✓ ATIVO' : groupState === 'some' ? '◐ PARCIAL' : '○ OFF'}
        </div>

        {/* Group toggle */}
        <div onClick={e => e.stopPropagation()}>
          <ToggleSwitch
            isActive={ativos.has(grupo.id)}
            onClick={() => onToggle(grupo.id, 'group')}
          />
        </div>
      </div>

      {/* Submenu rows */}
      {hasSubs && expandido && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          {grupo.filhos.map((filho, fi) => {
            const isLast = fi === grupo.filhos.length - 1;
            const isOn = ativos.has(filho.id);
            return (
              <div
                key={filho.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 18px 10px 48px',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.03)',
                  transition: 'background 0.15s',
                }}
              >
                {/* Tree line indicator */}
                <span style={{
                  fontSize: '0.6rem',
                  color: isOn ? accent : 'rgba(148,163,184,0.25)',
                  transition: 'color 0.2s',
                }}>
                  {isLast ? '└─' : '├─'}
                </span>

                <span style={{
                  flex: 1, fontSize: '0.85rem',
                  color: isOn ? 'rgba(226,232,240,0.9)' : 'rgba(148,163,184,0.45)',
                  fontWeight: isOn ? 500 : 400,
                  transition: 'color 0.2s',
                }}>
                  {filho.label}
                </span>

                {/* Active dot */}
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isOn ? accent : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.2s',
                  boxShadow: isOn ? `0 0 6px ${accent}` : 'none',
                }} />

                <ToggleSwitch
                  isActive={isOn}
                  onClick={() => onToggle(filho.id, 'child', grupo)}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── School Status Badge ───────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    ativa:     { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Ativa',     dot: '#10b981' },
    bloqueada: { bg: 'rgba(249,115,22,0.15)', color: '#f97316', label: 'Bloqueada', dot: '#f97316' },
    cancelada: { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', label: 'Cancelada', dot: '#ef4444' },
  }[status] || { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: status || 'N/D', dot: '#64748b' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: '0.6rem', fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PlataformaModulos() {
  const [escolas, setEscolas] = useState([]);
  const [escolaId, setEscolaId] = useState(null);
  const [modulosAtivos, setModulosAtivos] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandidos, setExpandidos] = useState(new Set(MODULOS_TREE.map(m => m.id)));
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [refreshHover, setRefreshHover] = useState(false);
  const [saveHover, setSaveHover] = useState(false);
  const [activarHover, setActivarHover] = useState(false);
  const [desativarHover, setDesativarHover] = useState(false);
  const [error, setError] = useState(null);
  const [copyError, setCopyError] = useState(null);

  // Count active modules per school (for the left panel display)
  const [schoolModulosCounts, setSchoolModulosCounts] = useState({});

  // ── Load school list ────────────────────────────────────────────────────────
  const fetchEscolas = useCallback(async () => {
    setSchoolLoading(true);
    try {
      const { data } = await api.get('/api/plataforma/escolas');
      const list = Array.isArray(data?.escolas) ? data.escolas : Array.isArray(data) ? data : [];
      setEscolas(list);
    } catch (err) {
      console.error('[PlataformaModulos] erro ao buscar escolas:', err);
    } finally {
      setSchoolLoading(false);
    }
  }, []);

  useEffect(() => { fetchEscolas(); }, [fetchEscolas]);

  // ── Load modules for a school ───────────────────────────────────────────────
  const fetchModulos = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/plataforma/modulos/${id}`);
      const list = Array.isArray(data?.modulos) ? data.modulos : [];
      const ativos = new Set(
        list.filter(m => m.ativo).map(m => m.modulo)
      );

      // ── Normalizar estado: se filho está ativo, pai DEVE estar ativo ──────
      // Corrige estados inconsistentes que possam ter sido salvos no banco.
      MODULOS_TREE.forEach(grupo => {
        if (grupo.filhos.length > 0) {
          const algumFilhoAtivo = grupo.filhos.some(f => ativos.has(f.id));
          if (algumFilhoAtivo) ativos.add(grupo.id);
        }
      });
      // ── Direção inversa: pai ativo mas nenhum filho → desativa pai ────────
      MODULOS_TREE.forEach(grupo => {
        if (grupo.filhos.length > 0 && ativos.has(grupo.id)) {
          const algumFilhoAtivo = grupo.filhos.some(f => ativos.has(f.id));
          if (!algumFilhoAtivo) ativos.delete(grupo.id);
        }
      });

      setModulosAtivos(ativos);
      // Update count cache
      setSchoolModulosCounts(prev => ({ ...prev, [id]: ativos.size }));
    } catch (err) {
      console.error('[PlataformaModulos] erro ao buscar módulos:', err);
      setError('Não foi possível carregar os módulos desta escola.');
      setModulosAtivos(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  const selectEscola = useCallback((id) => {
    if (id === escolaId) return;
    setEscolaId(id);
    setSaved(false);
    setError(null);
    fetchModulos(id);
  }, [escolaId, fetchModulos]);

  // ── Toggle logic ────────────────────────────────────────────────────────────
  const handleToggle = useCallback((id, type, grupo) => {
    setSaved(false);
    setModulosAtivos(prev => {
      const next = new Set(prev);

      if (type === 'group') {
        const g = MODULOS_TREE.find(m => m.id === id);
        if (!g) return next;

        if (g.filhos.length === 0) {
          // Leaf-only group: simple toggle
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }

        // Usa estado REAL do pai no Set (não depende se todos filhos estão on)
        if (next.has(id)) {
          // Pai estava ON → desliga tudo
          g.filhos.forEach(f => next.delete(f.id));
          next.delete(id);
        } else {
          // Pai estava OFF → liga tudo
          g.filhos.forEach(f => next.add(f.id));
          next.add(id);
        }
        return next;
      }

      // Child toggle
      if (next.has(id)) {
        next.delete(id);
        // Pai só desativa quando TODOS os filhos estiverem off
        if (grupo) {
          const anyOn = grupo.filhos.some(f => f.id !== id && next.has(f.id));
          if (!anyOn) next.delete(grupo.id);
        }
      } else {
        next.add(id);
        // Filho ativo → pai ativa automaticamente (sem pai renderizado, filho é inacessível)
        if (grupo) next.add(grupo.id);
      }
      return next;
    });
  }, []);

  // ── Activate / Deactivate All ───────────────────────────────────────────────
  const activarTodos = useCallback(() => {
    setSaved(false);
    const all = new Set();
    MODULOS_TREE.forEach(g => {
      all.add(g.id);
      g.filhos.forEach(f => all.add(f.id));
    });
    setModulosAtivos(all);
  }, []);

  const desativarTodos = useCallback(() => {
    setSaved(false);
    setModulosAtivos(new Set());
  }, []);

  // ── Toggle expand group ─────────────────────────────────────────────────────
  const toggleExpand = useCallback((id) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────
  const salvar = useCallback(async () => {
    if (!escolaId) return;
    setSaving(true);
    setError(null);
    try {
      const modulos = [];
      MODULOS_TREE.forEach(g => {
        if (g.filhos.length === 0) {
          modulos.push({ modulo: g.id, ativo: modulosAtivos.has(g.id) });
        } else {
          modulos.push({ modulo: g.id, ativo: modulosAtivos.has(g.id) });
          g.filhos.forEach(f => {
            modulos.push({ modulo: f.id, ativo: modulosAtivos.has(f.id) });
          });
        }
      });
      await api.put(`/api/plataforma/modulos/${escolaId}`, { modulos });
      setSaved(true);
      setSchoolModulosCounts(prev => ({ ...prev, [escolaId]: modulosAtivos.size }));
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[PlataformaModulos] erro ao salvar:', err);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [escolaId, modulosAtivos]);

  // ── Copy from another school ────────────────────────────────────────────────
  const copiarDe = useCallback(async (origemId) => {
    if (!escolaId) return;
    setShowCopyModal(false);
    setLoading(true);
    setCopyError(null);
    try {
      await api.post(`/api/plataforma/modulos/${escolaId}/copiar-de/${origemId}`);
      await fetchModulos(escolaId);
      setSaved(false);
    } catch (err) {
      console.error('[PlataformaModulos] erro ao copiar:', err);
      setCopyError('Erro ao copiar configuração. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [escolaId, fetchModulos]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const escolaSelecionada = escolas.find(e => e.id === escolaId) || null;
  const escolasFiltradas = escolas.filter(e =>
    !search || e.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.apelido?.toLowerCase().includes(search.toLowerCase())
  );

  const countAtivos = modulosAtivos.size;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    page: {
      width: '100%', minHeight: '100vh',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      background: '#0f172a', color: '#f1f5f9',
    },
    hero: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 50%, #0f172a 100%)',
      padding: '36px 40px 48px',
      position: 'relative', overflow: 'hidden',
      borderBottom: '1px solid rgba(16,185,129,0.15)',
    },
    heroBg1: {
      position: 'absolute', top: -80, right: -60,
      width: 300, height: 300, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
      pointerEvents: 'none',
    },
    heroBg2: {
      position: 'absolute', bottom: -60, left: '35%',
      width: 220, height: 220, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
      pointerEvents: 'none',
    },
    heroInner: {
      position: 'relative', zIndex: 1,
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
    },
    badge: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: 'linear-gradient(135deg, #10b981, #059669)',
      fontSize: '0.6rem', fontWeight: 800, color: '#fff',
      textTransform: 'uppercase', letterSpacing: '0.8px',
      marginBottom: 12, boxShadow: '0 0 20px rgba(16,185,129,0.4)',
    },
    heroTitle: {
      fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
      fontWeight: 900, color: '#ffffff',
      letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: '0.9rem', color: 'rgba(148,163,184,0.8)', maxWidth: 440,
    },
    body: {
      display: 'flex', gap: 0,
      minHeight: 'calc(100vh - 200px)',
    },
    // ── LEFT PANEL ──
    leftPanel: {
      width: 320, flexShrink: 0,
      background: 'rgba(255,255,255,0.02)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0,
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
    },
    leftHeader: {
      padding: '20px 20px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      position: 'sticky', top: 0, zIndex: 10,
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(12px)',
    },
    searchInput: {
      width: '100%', padding: '10px 14px',
      borderRadius: 10, fontSize: '0.85rem',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#f1f5f9', outline: 'none',
      boxSizing: 'border-box',
    },
    // ── RIGHT PANEL ──
    rightPanel: {
      flex: 1, overflowY: 'auto',
      padding: '28px 36px',
      maxHeight: 'calc(100vh - 200px)',
    },
  };

  // ── Spinner ──
  const Spinner = ({ size = 32 }) => (
    <div style={{
      width: size, height: size,
      border: `${size / 12}px solid rgba(255,255,255,0.08)`,
      borderTop: `${size / 12}px solid #10b981`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  );

  const escolaModulosCount = escolaId
    ? (schoolModulosCounts[escolaId] !== undefined ? schoolModulosCounts[escolaId] : countAtivos)
    : 0;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .mod-fade { animation: fadeInUp 0.35s ease forwards; }
        .school-card:hover { background: rgba(255,255,255,0.05) !important; }
        .school-card { transition: background 0.15s, border-color 0.15s; }
        *::-webkit-scrollbar { width: 5px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        *::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        select option { background: #1e293b; color: #f1f5f9; }
      `}</style>

      {/* ════ HERO ════ */}
      <div style={S.hero}>
        <div style={S.heroBg1} />
        <div style={S.heroBg2} />
        <div style={S.heroInner}>
          <div>
            <div style={S.badge}>
              <span>🔐</span> CEO · Licenciamento de Módulos
            </div>
            <div style={S.heroTitle}>
              Módulos por Escola
              <br />
              <span style={{
                backgroundImage: 'linear-gradient(90deg, #34d399, #6366f1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Configuração de Acesso
              </span>
            </div>
            <div style={S.heroSubtitle}>
              {schoolLoading ? 'Carregando escolas...' : `${escolas.length} escola${escolas.length !== 1 ? 's' : ''} cadastrada${escolas.length !== 1 ? 's' : ''} · ${TOTAL_MODULOS} módulos disponíveis`}
            </div>
          </div>

          <button
            onClick={fetchEscolas}
            onMouseEnter={() => setRefreshHover(true)}
            onMouseLeave={() => setRefreshHover(false)}
            disabled={schoolLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 22px', borderRadius: 14,
              border: `1px solid ${refreshHover ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`,
              background: refreshHover ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
              color: refreshHover ? '#34d399' : 'rgba(148,163,184,0.9)',
              fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', transition: 'all 0.2s',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span style={{ animation: schoolLoading ? 'spin 0.8s linear infinite' : 'none', display: 'inline-block' }}>
              🔄
            </span>
            {schoolLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* ════ TWO-PANEL BODY ════ */}
      <div style={S.body}>

        {/* ── LEFT: School List ── */}
        <div style={S.leftPanel}>
          <div style={S.leftHeader}>
            <div style={{
              fontSize: '0.65rem', fontWeight: 800, color: 'rgba(148,163,184,0.6)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}>
              Escolas ({escolasFiltradas.length})
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Buscar escola..."
              style={S.searchInput}
            />
          </div>

          {/* School cards */}
          <div style={{ flex: 1, padding: '12px 12px' }}>
            {schoolLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spinner />
              </div>
            ) : escolasFiltradas.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 16px',
                color: 'rgba(148,163,184,0.45)', fontSize: '0.85rem',
              }}>
                {search ? 'Nenhuma escola encontrada.' : 'Nenhuma escola cadastrada.'}
              </div>
            ) : (
              escolasFiltradas.map(escola => {
                const isSelected = escola.id === escolaId;
                const count = schoolModulosCounts[escola.id];
                return (
                  <div
                    key={escola.id}
                    className="school-card"
                    onClick={() => selectEscola(escola.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      marginBottom: 6,
                      cursor: 'pointer',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.1))'
                        : 'transparent',
                      border: isSelected
                        ? '1px solid rgba(99,102,241,0.35)'
                        : '1px solid transparent',
                      boxShadow: isSelected ? '0 4px 16px rgba(99,102,241,0.2)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.82rem', fontWeight: 700,
                          color: isSelected ? '#f1f5f9' : 'rgba(226,232,240,0.75)',
                          lineHeight: 1.3, marginBottom: 3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {escola.nome}
                        </div>
                        {escola.apelido && (
                          <div style={{
                            fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {escola.apelido}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={escola.status} />
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 8,
                    }}>
                      {isSelected ? (
                        <div style={{
                          fontSize: '0.65rem', fontWeight: 700,
                          color: '#6366f1',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <span style={{
                            display: 'inline-block', width: 5, height: 5,
                            borderRadius: '50%', background: '#6366f1',
                            boxShadow: '0 0 6px rgba(99,102,241,0.8)',
                          }} />
                          Selecionada
                        </div>
                      ) : (
                        <div />
                      )}
                      <div style={{
                        fontSize: '0.65rem', fontWeight: 700,
                        color: isSelected ? '#818cf8' : 'rgba(148,163,184,0.4)',
                        background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                        padding: '2px 8px', borderRadius: 8,
                        border: isSelected ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                      }}>
                        {count !== undefined ? `${count}/${TOTAL_MODULOS}` : '—'} mód.
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Module tree ── */}
        <div style={S.rightPanel}>

          {/* Empty state */}
          {!escolaId && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: 480, textAlign: 'center',
            }}>
              <div style={{ fontSize: '5rem', marginBottom: 20, filter: 'grayscale(0.3)' }}>🏫</div>
              <div style={{
                fontSize: '1.3rem', fontWeight: 700, color: 'rgba(226,232,240,0.7)',
                marginBottom: 12,
              }}>
                Selecione uma escola
              </div>
              <div style={{
                fontSize: '0.9rem', color: 'rgba(148,163,184,0.45)',
                maxWidth: 340, lineHeight: 1.6,
              }}>
                Escolha uma escola na lista à esquerda para configurar quais módulos ela tem acesso.
              </div>
              <div style={{
                marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
              }}>
                {MODULOS_TREE.slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{
                    padding: '8px 16px', borderRadius: 20,
                    background: `${GROUP_COLORS[i % GROUP_COLORS.length].bg}`,
                    border: `1px solid ${GROUP_COLORS[i % GROUP_COLORS.length].accent}25`,
                    fontSize: '0.8rem', color: 'rgba(148,163,184,0.5)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>{m.icon}</span> {m.label}
                  </div>
                ))}
                <div style={{
                  padding: '8px 16px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.8rem', color: 'rgba(148,163,184,0.35)',
                }}>
                  +{MODULOS_TREE.length - 5} mais...
                </div>
              </div>
            </div>
          )}

          {/* School selected */}
          {escolaId && (
            <div className="mod-fade">

              {/* Top action bar */}
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: 12, marginBottom: 28, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 4,
                  }}>
                    {escolaSelecionada?.nome || '—'}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  }}>
                    {escolaSelecionada && <StatusBadge status={escolaSelecionada.status} />}
                    <span style={{
                      padding: '3px 12px', borderRadius: 20,
                      background: countAtivos > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                      border: countAtivos > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.7rem', fontWeight: 800,
                      color: countAtivos > 0 ? '#818cf8' : 'rgba(148,163,184,0.5)',
                    }}>
                      {countAtivos} / {TOTAL_MODULOS} módulos ativos
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={activarTodos}
                    onMouseEnter={() => setActivarHover(true)}
                    onMouseLeave={() => setActivarHover(false)}
                    style={{
                      padding: '9px 16px', borderRadius: 10,
                      border: `1px solid ${activarHover ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.25)'}`,
                      background: activarHover ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
                      color: '#34d399', fontWeight: 700, fontSize: '0.78rem',
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    ✓ Ativar Todos
                  </button>

                  <button
                    onClick={desativarTodos}
                    onMouseEnter={() => setDesativarHover(true)}
                    onMouseLeave={() => setDesativarHover(false)}
                    style={{
                      padding: '9px 16px', borderRadius: 10,
                      border: `1px solid ${desativarHover ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      background: desativarHover ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                      color: desativarHover ? '#f87171' : 'rgba(148,163,184,0.7)',
                      fontWeight: 700, fontSize: '0.78rem',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    ✕ Desativar Todos
                  </button>

                  <button
                    onClick={() => setShowCopyModal(true)}
                    style={{
                      padding: '9px 16px', borderRadius: 10,
                      border: '1px solid rgba(59,130,246,0.3)',
                      background: 'rgba(59,130,246,0.1)',
                      color: '#60a5fa', fontWeight: 700, fontSize: '0.78rem',
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    📋 Copiar de outra escola
                  </button>

                  {/* Save button */}
                  <button
                    onClick={salvar}
                    disabled={saving}
                    onMouseEnter={() => setSaveHover(true)}
                    onMouseLeave={() => setSaveHover(false)}
                    style={{
                      padding: '10px 22px', borderRadius: 12,
                      border: 'none',
                      background: saved
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : saveHover
                          ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff', fontWeight: 800, fontSize: '0.875rem',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 8,
                      boxShadow: saveHover && !saving
                        ? '0 8px 24px rgba(99,102,241,0.4)'
                        : saved
                          ? '0 8px 24px rgba(16,185,129,0.3)'
                          : '0 4px 12px rgba(99,102,241,0.25)',
                      opacity: saving ? 0.7 : 1,
                      transform: saveHover && !saving ? 'translateY(-1px)' : 'none',
                    }}
                  >
                    {saving ? (
                      <><Spinner size={16} /> Salvando...</>
                    ) : saved ? (
                      <>✓ Salvo!</>
                    ) : (
                      <>💾 Salvar Configuração</>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                marginBottom: 24,
                height: 4, borderRadius: 4,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${TOTAL_MODULOS > 0 ? (countAtivos / TOTAL_MODULOS) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #6366f1, #10b981)',
                  borderRadius: 4,
                  transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: '0 0 8px rgba(99,102,241,0.5)',
                }} />
              </div>

              {/* Error message */}
              {(error || copyError) && (
                <div style={{
                  marginBottom: 20, padding: '12px 16px',
                  borderRadius: 12,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>⚠️</span>
                  {error || copyError}
                  <button
                    onClick={() => { setError(null); setCopyError(null); }}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      color: '#fca5a5', cursor: 'pointer', fontSize: '1rem',
                    }}
                  >✕</button>
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                  <Spinner size={44} />
                </div>
              )}

              {/* Module tree */}
              {!loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {MODULOS_TREE.map((grupo, gi) => {
                    const colorDef = GROUP_COLORS[gi % GROUP_COLORS.length];
                    return (
                      <ModuloGrupo
                        key={grupo.id}
                        grupo={grupo}
                        colorDef={colorDef}
                        ativos={modulosAtivos}
                        onToggle={handleToggle}
                        expandido={expandidos.has(grupo.id)}
                        onToggleExpand={toggleExpand}
                      />
                    );
                  })}

                  {/* Bottom save bar */}
                  <div style={{
                    marginTop: 12,
                    padding: '20px 24px',
                    borderRadius: 16,
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                        Configuração de{' '}
                        <span style={{ color: '#818cf8' }}>{escolaSelecionada?.nome}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.55)' }}>
                        {countAtivos} módulos ativos de {TOTAL_MODULOS} disponíveis
                      </div>
                    </div>
                    <button
                      onClick={salvar}
                      disabled={saving}
                      style={{
                        padding: '12px 28px', borderRadius: 12,
                        border: 'none',
                        background: saved
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: saved
                          ? '0 8px 24px rgba(16,185,129,0.35)'
                          : '0 8px 24px rgba(99,102,241,0.35)',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: 8,
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? <><Spinner size={16} /> Salvando...</> :
                       saved ? '✓ Configuração salva!' :
                       '💾 Salvar Configuração'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Copy Modal ── */}
      {showCopyModal && (
        <CopyModal
          escolas={escolas}
          escolaAtual={escolaSelecionada}
          onConfirm={copiarDe}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </div>
  );
}
