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
  // ── DISCIPLINAR: módulo reservado — sempre ativo para perfis militares.
  // O CEO não gerencia este módulo. Omitido intencionalmente da lista.
  {
    id: 'pedagogico', label: 'Pedagógico', icon: '🎓',
    filhos: [
      { id: 'pedagogico.conselho', label: 'Conselho de Classe' },
      { id: 'pedagogico.conteudos', label: 'Conteúdos' },
      { id: 'pedagogico.relatorios', label: 'Relatórios' },
      { id: 'pedagogico.correcoes', label: 'Correções' },
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
  {
    id: 'merenda', label: 'Merenda', icon: '🍽️',
    filhos: [
      { id: 'merenda.cadastro', label: 'Cadastro' },
      { id: 'merenda.cardapio', label: 'Cardápio' },
      { id: 'merenda.relatorios', label: 'Relatórios' },
    ]
  },
  {
    id: 'comunicacao', label: 'Comunicação', icon: '💬',
    filhos: [
      { id: 'comunicacao.avisos', label: 'Avisos' },
      { id: 'comunicacao.comunicados', label: 'Comunicados' },
      { id: 'comunicacao.mural', label: 'Mural' },
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

// ── Lista de perfis gerenciáveis pelo CEO ─────────────────────────────────────
// Regras:
// - 'secretario' removido: duplicata de 'secretaria'
// - 'visitante'  removido: duplicata de 'vigilancia'
// - 'subcomandante', 'supervisor_disciplinar', 'monitor_disciplinar' removidos:
//   módulo DISCIPLINAR é padrão/fixo para escolas CCMDF — CEO não o gerencia.
const PERFIS_LISTA = [
  { key: 'diretor',         label: 'Diretor Pedagógico' },
  { key: 'vice_diretor',    label: 'Vice-Diretor' },
  { key: 'professor',       label: 'Professor' },
  { key: 'coordenador',     label: 'Coordenador' },
  { key: 'supervisor',      label: 'Supervisor' },
  { key: 'pedagogo',        label: 'Pedagogo' },
  { key: 'secretaria',      label: 'Secretaria' },
  { key: 'orientador',      label: 'Orientador' },
  { key: 'aluno',           label: 'Aluno' },
  { key: 'biblioteca',      label: 'Biblioteca' },
  { key: 'educador_social', label: 'Educador Social' },
  { key: 'merenda',         label: 'Merenda' },
  { key: 'psicologo',       label: 'Psicólogo' },
  { key: 'responsavel',     label: 'Responsável' },
  { key: 'vigilancia',      label: 'Vigilância' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function PlataformaModulos() {
  const [escolas, setEscolas] = useState([]);
  const [escolaId, setEscolaId] = useState(null);
  const [perfilSel, setPerfilSel] = useState(null); // perfil selecionado (Passo 5)
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

  // ── Manutensão Programada ──
  const [manutData, setManutData] = useState(null);
  const [manutInicio, setManutInicio] = useState('');
  const [manutFim, setManutFim] = useState('');
  const [manutMsg, setManutMsg] = useState('O sistema está em manutenção programada.');
  const [manutSaving, setManutSaving] = useState(false);
  const [manutError, setManutError] = useState(null);
  const [showManutConfirm, setShowManutConfirm] = useState(false);

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

  // ── Fetch manutenção status ──
  const [manutEncerrada, setManutEncerrada] = useState(false);
  const manutAnteriorRef = React.useRef(null);

  const fetchManutencao = useCallback(async () => {
    try {
      const { data } = await api.get('/api/plataforma/manutencao');
      const novo = data?.manutencao || null;
      // Detecta transição: era ativa → agora null (expirou)
      if (manutAnteriorRef.current && !novo) {
        setManutEncerrada(true);
        setTimeout(() => setManutEncerrada(false), 8000);
      }
      manutAnteriorRef.current = novo;
      setManutData(novo);
    } catch { setManutData(null); }
  }, []);

  useEffect(() => { fetchManutencao(); }, [fetchManutencao]);

  // Auto-refresh a cada 30s quando manutenção está ativa
  useEffect(() => {
    if (!manutData) return;
    const interval = setInterval(fetchManutencao, 30000);
    return () => clearInterval(interval);
  }, [manutData, fetchManutencao]);

  const handleAtivarManutencao = () => {
    if (!manutInicio || !manutFim) { setManutError('Informe início e fim.'); return; }
    const dtInicio = new Date(manutInicio);
    const dtFim = new Date(manutFim);
    if (dtFim <= dtInicio) { setManutError("'Fim' deve ser posterior a 'Início'."); return; }
    setManutError(null);
    setShowManutConfirm(true);
  };

  const handleConfirmarManutencao = async () => {
    setShowManutConfirm(false);
    setManutSaving(true); setManutError(null);
    try {
      await api.post('/api/plataforma/manutencao', {
        // datetime-local dá horário local (Brasília) — converte para UTC ISO
        inicio: new Date(manutInicio).toISOString(),
        fim: new Date(manutFim).toISOString(),
        mensagem: manutMsg,
      });
      await fetchManutencao();
      setManutInicio(''); setManutFim('');
    } catch (err) {
      setManutError(err.response?.data?.message || 'Erro ao ativar manutenção.');
    } finally { setManutSaving(false); }
  };

  const handleCancelarManutencao = async () => {
    setManutSaving(true); setManutError(null);
    try {
      await api.delete('/api/plataforma/manutencao');
      setManutData(null);
    } catch (err) {
      setManutError(err.response?.data?.message || 'Erro ao cancelar.');
    } finally { setManutSaving(false); }
  };

  // ── Load modules for a school (+ optional perfil) ─────────────────────────
  const fetchModulos = useCallback(async (id, perfil) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const url = perfil
        ? `/api/plataforma/modulos/${id}/perfil/${perfil}`
        : `/api/plataforma/modulos/${id}`;
      const { data } = await api.get(url);
      const list = Array.isArray(data?.modulos) ? data.modulos : [];
      const ativos = new Set(
        list.filter(m => m.ativo).map(m => m.modulo)
      );

      // ── Normalizar estado: se filho está ativo, pai DEVE estar ativo ──────
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
      if (!perfil) {
        setSchoolModulosCounts(prev => ({ ...prev, [id]: ativos.size }));
      }
    } catch (err) {
      console.error('[PlataformaModulos] erro ao buscar módulos:', err);
      setError('Não foi possível carregar os módulos.');
      setModulosAtivos(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  const selectEscola = useCallback((id) => {
    if (id === escolaId) return;
    setEscolaId(id);
    setPerfilSel(null);     // reseta perfil ao trocar de escola
    setModulosAtivos(new Set());
    setSaved(false);
    setError(null);
  }, [escolaId]);

  const selectPerfil = useCallback((perfil) => {
    if (perfil === perfilSel) return;
    setPerfilSel(perfil);
    setSaved(false);
    setError(null);
    if (escolaId) fetchModulos(escolaId, perfil);
  }, [perfilSel, escolaId, fetchModulos]);

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

  // ── Save (por perfil quando perfilSel definido) ────────────────────────────
  const salvar = useCallback(async () => {
    if (!escolaId) return;
    if (!perfilSel) { setError('Selecione um perfil antes de salvar.'); return; }
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
      await api.put(`/api/plataforma/modulos/${escolaId}/perfil/${perfilSel}`, { modulos });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[PlataformaModulos] erro ao salvar:', err);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [escolaId, perfilSel, modulosAtivos]);

  // ── Copy from another school (por perfil) ──────────────────────────────────
  const copiarDe = useCallback(async (origemId) => {
    if (!escolaId || !perfilSel) return;
    setShowCopyModal(false);
    setLoading(true);
    setCopyError(null);
    try {
      await api.post(`/api/plataforma/modulos/${escolaId}/copiar-de/${origemId}/perfil/${perfilSel}`);
      await fetchModulos(escolaId, perfilSel);
      setSaved(false);
    } catch (err) {
      console.error('[PlataformaModulos] erro ao copiar:', err);
      setCopyError('Erro ao copiar configuração. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [escolaId, perfilSel, fetchModulos]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const escolaSelecionada = escolas.find(e => e.id === escolaId) || null;
  const escolasFiltradas = escolas.filter(e =>
    !search || e.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.apelido?.toLowerCase().includes(search.toLowerCase())
  );

  const countAtivos = modulosAtivos.size;

  // ── Perfil icons ─────────────────────────────────────────────────────────
  const PERFIL_ICONS = {
    diretor: '🎓', vice_diretor: '👔', professor: '👩‍🏫',
    coordenador: '📋', supervisor: '🔍', pedagogo: '📚',
    secretaria: '🗂️', orientador: '🧭', aluno: '👨‍🎓',
    biblioteca: '📖', educador_social: '🤝', merenda: '🍽️',
    psicologo: '🧠', responsavel: '👨‍👩‍👧', vigilancia: '🔒',
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    page: {
      width: '100%', height: '100vh',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      background: '#060d1f', color: '#f1f5f9',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    },
    hero: {
      padding: '0 28px', height: 60, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      background: 'rgba(6,13,31,0.98)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      position: 'relative', zIndex: 100,
    },
    heroInner: {
      width: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
    },
    heroLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    heroIconBox: {
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(99,102,241,0.45)',
    },
    heroTitle: {
      fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9',
      letterSpacing: '-0.02em',
    },
    heroSub: {
      fontSize: '0.65rem', color: 'rgba(148,163,184,0.5)', marginTop: 1,
    },
    body: {
      display: 'flex', flex: 1,
      overflow: 'hidden',
    },
    leftPanel: {
      width: 252, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.016)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      overflow: 'hidden',
    },
    leftHeader: {
      padding: '14px 13px 11px', flexShrink: 0,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    panelLabel: {
      fontSize: '0.57rem', fontWeight: 800, letterSpacing: '0.09em',
      color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase', marginBottom: 9,
    },
    searchBox: {
      width: '100%', padding: '8px 11px', borderRadius: 8,
      fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
    },
    schoolList: { flex: 1, overflowY: 'auto', padding: '8px 8px' },
    mainPanel: {
      flex: 1, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    },
    mainInner: {
      padding: '20px 26px', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 16,
    },
  };

  // ── Spinner ──────────────────────────────────────────────────────────────
  const Spinner = ({ size = 32 }) => (
    <div style={{
      width: size, height: size,
      border: `${Math.max(2, size / 12)}px solid rgba(255,255,255,0.06)`,
      borderTop: `${Math.max(2, size / 12)}px solid #6366f1`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
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
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .mod-fade { animation: fadeInUp 0.28s ease forwards; }
        .s-row { transition: all 0.15s; cursor: pointer; }
        .s-row:hover { background: rgba(255,255,255,0.035) !important; }
        .p-chip { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .p-chip:hover { transform: translateY(-3px) !important; border-color: rgba(99,102,241,0.45) !important; box-shadow: 0 8px 22px rgba(99,102,241,0.22) !important; }
        .p-chip:hover .p-chip-icon { transform: scale(1.15); }
        .p-chip-icon { transition: transform 0.2s; display: inline-block; }
        .action-btn { transition: all 0.18s; }
        .action-btn:hover { opacity: 0.85 !important; transform: translateY(-1px) !important; }
        .save-main:hover { transform: translateY(-1px) !important; box-shadow: 0 8px 24px rgba(99,102,241,0.45) !important; }
        .refresh-btn:hover { background: rgba(255,255,255,0.07) !important; color: #f1f5f9 !important; }
        *::-webkit-scrollbar { width: 3px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
        *::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.13); }
        select option { background: #1e293b; color: #f1f5f9; }
      `}</style>

      {/* ══ HERO BAR ══ */}
      <div style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroLeft}>
            <div style={S.heroIconBox}>🔐</div>
            <div>
              <div style={S.heroTitle}>Módulos por Escola · Configuração de Acesso</div>
              <div style={S.heroSub}>
                {schoolLoading
                  ? 'Carregando escolas...'
                  : `${escolas.length} escola${escolas.length !== 1 ? 's' : ''} · ${TOTAL_MODULOS} módulos disponíveis`}
              </div>
            </div>
          </div>
          <button
            className="refresh-btn"
            onClick={fetchEscolas}
            disabled={schoolLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(148,163,184,0.75)',
              fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            <span style={{ animation: schoolLoading ? 'spin 0.7s linear infinite' : 'none', display: 'inline-block' }}>⟳</span>
            {schoolLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={S.body}>

        {/* ─ LEFT: Schools ─ */}
        <div style={S.leftPanel}>
          <div style={S.leftHeader}>
            <div style={S.panelLabel}>Escolas ({escolasFiltradas.length})</div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Buscar..."
              style={S.searchBox}
            />
          </div>
          <div style={S.schoolList}>
            {schoolLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            ) : escolasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 12px', color: 'rgba(148,163,184,0.3)', fontSize: '0.75rem' }}>
                {search ? 'Nenhuma encontrada.' : 'Nenhuma escola.'}
              </div>
            ) : (
              escolasFiltradas.map(escola => {
                const isSel = escola.id === escolaId;
                const count = schoolModulosCounts[escola.id];
                return (
                  <div
                    key={escola.id}
                    className="s-row"
                    onClick={() => selectEscola(escola.id)}
                    style={{
                      padding: '10px 11px', borderRadius: 10, marginBottom: 4,
                      background: isSel
                        ? 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.1))'
                        : 'transparent',
                      border: isSel
                        ? '1px solid rgba(99,102,241,0.4)'
                        : '1px solid transparent',
                      boxShadow: isSel ? '0 3px 14px rgba(99,102,241,0.18)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.76rem', fontWeight: 700,
                          color: isSel ? '#f1f5f9' : 'rgba(203,213,225,0.75)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{escola.nome}</div>
                        {escola.apelido && (
                          <div style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {escola.apelido}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={escola.status} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{
                        fontSize: '0.57rem', fontWeight: 700,
                        color: isSel ? '#818cf8' : 'rgba(148,163,184,0.3)',
                        background: isSel ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.03)',
                        padding: '1px 7px', borderRadius: 5,
                      }}>
                        {count !== undefined ? `${count}/${TOTAL_MODULOS}` : '—'} mód.
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─ MAIN PANEL ─ */}
        <div style={S.mainPanel}>
          <div style={S.mainInner}>

            {/* ── MANUTENÇÃO PROGRAMADA ── */}
            <div style={{
              padding: '14px 20px', borderRadius: 13, flexShrink: 0,
              background: manutData ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${manutData ? 'rgba(245,158,11,0.22)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.3s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: manutData ? 11 : 0 }}>
                <span style={{ fontSize: '1rem' }}>🔧</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f1f5f9' }}>Manutenção Programada</span>
                {manutData ? (
                  <span style={{
                    padding: '2px 7px', borderRadius: 20, fontSize: '0.55rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: manutData.em_andamento ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: manutData.em_andamento ? '#f87171' : '#fbbf24',
                    border: `1px solid ${manutData.em_andamento ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  }}>
                    {manutData.em_andamento ? '● Em andamento' : '◑ Agendada'}
                  </span>
                ) : (
                  <span style={{
                    padding: '2px 7px', borderRadius: 20, fontSize: '0.55rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: 'rgba(16,185,129,0.1)', color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.18)',
                  }}>● Sistema Normal</span>
                )}
                {manutEncerrada && (
                  <span style={{
                    padding: '2px 9px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 700,
                    background: 'rgba(16,185,129,0.12)', color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.22)', animation: 'fadeIn 0.4s ease',
                  }}>✅ Manutenção encerrada — acesso restaurado</span>
                )}
              </div>

              {manutData ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.55)', marginBottom: 3 }}>Período</div>
                    <div style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600 }}>
                      {new Date(manutData.inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} →{' '}
                      {new Date(manutData.fim).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </div>
                    {manutData.mensagem && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', marginTop: 3 }}>{manutData.mensagem}</div>
                    )}
                  </div>
                  <button
                    onClick={handleCancelarManutencao}
                    disabled={manutSaving}
                    style={{
                      padding: '7px 15px', borderRadius: 9, border: 'none',
                      background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                      color: '#fff', fontWeight: 700, fontSize: '0.77rem',
                      cursor: manutSaving ? 'not-allowed' : 'pointer',
                      opacity: manutSaving ? 0.6 : 1,
                      boxShadow: '0 3px 10px rgba(239,68,68,0.28)',
                    }}
                  >{manutSaving ? 'Cancelando...' : '✕ Cancelar Manutenção'}</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 11 }}>
                  {[
                    { label: 'Início', value: manutInicio, onChange: e => setManutInicio(e.target.value), type: 'datetime-local', flex: '1 1 150px' },
                    { label: 'Fim',    value: manutFim,    onChange: e => setManutFim(e.target.value),    type: 'datetime-local', flex: '1 1 150px' },
                  ].map(({ label, value, onChange, type, flex }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex }}>
                      <label style={{ fontSize: '0.57rem', fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input type={type} value={value} onChange={onChange} style={{
                        padding: '7px 9px', borderRadius: 8, fontSize: '0.78rem',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#f1f5f9', outline: 'none',
                      }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '2 1 180px' }}>
                    <label style={{ fontSize: '0.57rem', fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mensagem</label>
                    <input
                      type="text" value={manutMsg} onChange={e => setManutMsg(e.target.value)}
                      placeholder="Mensagem para os usuários"
                      style={{
                        padding: '7px 9px', borderRadius: 8, fontSize: '0.78rem',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#f1f5f9', outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleAtivarManutencao}
                    disabled={manutSaving}
                    style={{
                      padding: '7px 15px', borderRadius: 9, border: 'none',
                      background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                      color: '#fff', fontWeight: 700, fontSize: '0.77rem',
                      cursor: manutSaving ? 'not-allowed' : 'pointer',
                      opacity: manutSaving ? 0.6 : 1,
                      boxShadow: '0 3px 10px rgba(245,158,11,0.28)', flexShrink: 0,
                    }}
                  >{manutSaving ? 'Ativando...' : '🚀 Ativar Manutenção'}</button>
                </div>
              )}
              {manutError && (
                <div style={{ marginTop: 9, padding: '7px 11px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
                  fontSize: '0.73rem', color: '#f87171' }}>{manutError}</div>
              )}
            </div>

            {/* ── EMPTY: no school ── */}
            {!escolaId && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 320 }}>
                <div style={{ fontSize: '3rem', marginBottom: 14, opacity: 0.35 }}>🏫</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(226,232,240,0.45)', marginBottom: 7 }}>Selecione uma escola</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(148,163,184,0.3)', maxWidth: 280, lineHeight: 1.6 }}>
                  Escolha uma escola na lista à esquerda para configurar os módulos por perfil.
                </div>
              </div>
            )}

            {/* ── SCHOOL SELECTED — PROFILE GRID ── */}
            {escolaId && !perfilSel && (
              <div className="mod-fade" style={{ flex: 1 }}>
                {/* School card */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                  padding: '14px 18px', borderRadius: 13,
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.18)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                  }}>🏫</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 3 }}>
                      {escolaSelecionada?.nome}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {escolaSelecionada && <StatusBadge status={escolaSelecionada.status} />}
                      <span style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.45)' }}>
                        {escolaModulosCount > 0 ? `${escolaModulosCount} módulos configurados` : 'Nenhum módulo configurado ainda'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile label */}
                <div style={{
                  fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.09em',
                  color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase',
                  marginBottom: 13,
                }}>
                  Selecione o perfil para configurar
                </div>

                {/* Profile grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 9,
                }}>
                  {PERFIS_LISTA.map(p => (
                    <div
                      key={p.key}
                      className="p-chip"
                      onClick={() => selectPerfil(p.key)}
                      style={{
                        padding: '16px 10px 14px',
                        borderRadius: 13,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        textAlign: 'center',
                        userSelect: 'none',
                      }}
                    >
                      <div className="p-chip-icon" style={{ fontSize: '1.4rem', marginBottom: 7, lineHeight: 1 }}>
                        {PERFIL_ICONS[p.key] || '👤'}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(203,213,225,0.72)', lineHeight: 1.3 }}>
                        {p.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SCHOOL + PROFILE — MODULE CONFIGURATION ── */}
            {escolaId && perfilSel && (
              <div className="mod-fade" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Header bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Breadcrumb / school info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: 'rgba(148,163,184,0.45)', marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(203,213,225,0.6)' }}>{escolaSelecionada?.nome}</span>
                      <span>›</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>
                        {PERFIL_ICONS[perfilSel] || '👤'} {PERFIS_LISTA.find(p => p.key === perfilSel)?.label || perfilSel}
                      </span>
                      <button
                        onClick={() => { setPerfilSel(null); setModulosAtivos(new Set()); setSaved(false); }}
                        style={{
                          padding: '1px 8px', borderRadius: 5,
                          border: '1px solid rgba(255,255,255,0.09)',
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(148,163,184,0.55)', fontSize: '0.62rem',
                          cursor: 'pointer',
                        }}
                      >← trocar</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      {escolaSelecionada && <StatusBadge status={escolaSelecionada.status} />}
                      <span style={{
                        padding: '2px 9px', borderRadius: 20,
                        background: countAtivos > 0 ? 'rgba(99,102,241,0.13)' : 'rgba(255,255,255,0.04)',
                        border: countAtivos > 0 ? '1px solid rgba(99,102,241,0.28)' : '1px solid rgba(255,255,255,0.06)',
                        fontSize: '0.62rem', fontWeight: 800,
                        color: countAtivos > 0 ? '#818cf8' : 'rgba(148,163,184,0.4)',
                      }}>
                        {countAtivos} / {TOTAL_MODULOS} módulos ativos
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="action-btn"
                      onClick={activarTodos}
                      style={{
                        padding: '7px 13px', borderRadius: 8,
                        border: '1px solid rgba(16,185,129,0.28)',
                        background: 'rgba(16,185,129,0.08)',
                        color: '#34d399', fontWeight: 700, fontSize: '0.73rem',
                        cursor: 'pointer',
                      }}
                    >✓ Ativar Todos</button>
                    <button
                      className="action-btn"
                      onClick={desativarTodos}
                      style={{
                        padding: '7px 13px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(148,163,184,0.65)', fontWeight: 700, fontSize: '0.73rem',
                        cursor: 'pointer',
                      }}
                    >✕ Desativar Todos</button>
                    <button
                      className="action-btn"
                      onClick={() => setShowCopyModal(true)}
                      style={{
                        padding: '7px 13px', borderRadius: 8,
                        border: '1px solid rgba(59,130,246,0.28)',
                        background: 'rgba(59,130,246,0.07)',
                        color: '#60a5fa', fontWeight: 700, fontSize: '0.73rem',
                        cursor: 'pointer',
                      }}
                    >📋 Copiar de outra escola</button>
                    <button
                      className="save-main"
                      onClick={salvar}
                      disabled={saving}
                      onMouseEnter={() => setSaveHover(true)}
                      onMouseLeave={() => setSaveHover(false)}
                      style={{
                        padding: '8px 20px', borderRadius: 10, border: 'none',
                        background: saved
                          ? 'linear-gradient(135deg,#10b981,#059669)'
                          : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: saved ? '0 4px 14px rgba(16,185,129,0.3)' : '0 4px 14px rgba(99,102,241,0.3)',
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? <><Spinner size={13} /> Salvando...</> : saved ? '✓ Salvo!' : '💾 Salvar'}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{
                    height: '100%',
                    width: `${TOTAL_MODULOS > 0 ? (countAtivos / TOTAL_MODULOS) * 100 : 0}%`,
                    background: 'linear-gradient(90deg,#6366f1,#10b981)',
                    borderRadius: 3,
                    transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: '0 0 6px rgba(99,102,241,0.5)',
                  }} />
                </div>

                {/* Error */}
                {(error || copyError) && (
                  <div style={{
                    padding: '9px 13px', borderRadius: 9,
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
                    color: '#fca5a5', fontSize: '0.78rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                  }}>
                    <span>⚠️</span> {error || copyError}
                    <button
                      onClick={() => { setError(null); setCopyError(null); }}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem' }}
                    >✕</button>
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spinner size={38} />
                  </div>
                )}

                {/* ── 2-column module grid ── */}
                {!loading && (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 10,
                    }}>
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
                    </div>

                    {/* Bottom save bar */}
                    <div style={{
                      padding: '14px 20px', borderRadius: 12,
                      background: 'rgba(99,102,241,0.04)',
                      border: '1px solid rgba(99,102,241,0.12)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                          Configuração de{' '}
                          <span style={{ color: '#818cf8' }}>{escolaSelecionada?.nome}</span>
                          <span style={{ color: 'rgba(148,163,184,0.5)', margin: '0 6px' }}>·</span>
                          <span style={{ color: '#34d399', fontSize: '0.75rem' }}>
                            {PERFIL_ICONS[perfilSel]} {PERFIS_LISTA.find(p => p.key === perfilSel)?.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'rgba(148,163,184,0.45)' }}>
                          {countAtivos} módulos ativos de {TOTAL_MODULOS} disponíveis
                        </div>
                      </div>
                      <button
                        onClick={salvar}
                        disabled={saving}
                        style={{
                          padding: '9px 22px', borderRadius: 10, border: 'none',
                          background: saved
                            ? 'linear-gradient(135deg,#10b981,#059669)'
                            : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          color: '#fff', fontWeight: 800, fontSize: '0.83rem',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          boxShadow: saved
                            ? '0 5px 16px rgba(16,185,129,0.28)'
                            : '0 5px 16px rgba(99,102,241,0.28)',
                          transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', gap: 7,
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        {saving ? <><Spinner size={13} /> Salvando...</> : saved ? '✓ Configuração salva!' : '💾 Salvar Configuração'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ══ MODAL: Confirmação Manutenção ══ */}
      {showManutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: 'linear-gradient(135deg,#1e293b,#0f172a)',
            border: '1px solid rgba(245,158,11,0.28)',
            borderRadius: 20, padding: '30px 34px',
            width: '100%', maxWidth: 430,
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            animation: 'slideUp 0.28s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 10 }}>🔧</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: 6 }}>
              Confirmar Manutenção
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'rgba(148,163,184,0.65)', textAlign: 'center', marginBottom: 18, lineHeight: 1.6 }}>
              {new Date(manutInicio) <= new Date()
                ? 'A manutenção será ativada IMEDIATAMENTE.'
                : 'A manutenção será ativada no horário agendado.'}
            </p>
            <div style={{
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)',
              borderRadius: 10, padding: '11px 15px', marginBottom: 18,
              fontSize: '0.78rem', color: '#fbbf24', lineHeight: 1.7,
            }}>
              <div><strong>Início:</strong> {manutInicio ? new Date(manutInicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</div>
              <div><strong>Fim:</strong> {manutFim ? new Date(manutFim).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</div>
              <div><strong>Mensagem:</strong> "{manutMsg}"</div>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button
                onClick={() => setShowManutConfirm(false)}
                style={{
                  flex: 1, padding: '10px 18px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'transparent', color: 'rgba(148,163,184,0.8)',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >Cancelar</button>
              <button
                onClick={handleConfirmarManutencao}
                style={{
                  flex: 1, padding: '10px 18px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer', boxShadow: '0 5px 16px rgba(245,158,11,0.28)',
                }}
              >🚀 Confirmar e Ativar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Copy ══ */}
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
