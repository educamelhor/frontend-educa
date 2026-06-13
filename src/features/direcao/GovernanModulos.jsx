import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MODULOS_TREE = [
  { id: 'secretaria', label: 'Secretaria', icon: '📋', filhos: [
    'secretaria.alunos', 'secretaria.responsaveis', 'secretaria.cargas_horarias',
    'secretaria.disciplinas', 'secretaria.turmas', 'secretaria.professores',
    'secretaria.boletim', 'secretaria.relatorios', 'secretaria.horarios',
    'secretaria.agente', 'secretaria.tabela_codigos', 'secretaria.sincronizar_seedf',
    'secretaria.modulacao',
  ]},
  { id: 'disciplinar', label: 'Disciplinar', icon: '⚖️', filhos: [
    'disciplinar.alunos', 'disciplinar.historico', 'disciplinar.atas',
    'disciplinar.fo_coletivo', 'disciplinar.responsaveis', 'disciplinar.liberacao',
    'disciplinar.metadados', 'disciplinar.equipe', 'disciplinar.regimentos',
    'disciplinar.manual',
  ]},
  { id: 'pedagogico', label: 'Pedagógico', icon: '🎓', filhos: [
    'pedagogico.conselho', 'pedagogico.conteudos', 'pedagogico.relatorios', 'pedagogico.correcoes',
  ]},
  { id: 'gabarito', label: 'Gabarito', icon: '📝', filhos: [
    'gabarito.gerar', 'gabarito.corrigir_lote', 'gabarito.corrigir', 'gabarito.resultados',
  ]},
  { id: 'frequencia', label: 'Frequência', icon: '📅', filhos: [
    'frequencia.atestados', 'frequencia.relatorios', 'frequencia.busca_ativa', 'frequencia.conselho_tutelar',
  ]},
  { id: 'biblioteca', label: 'Biblioteca', icon: '📚', filhos: [
    'biblioteca.acervo', 'biblioteca.emprestimos', 'biblioteca.alunos',
    'biblioteca.leitor_destaque', 'biblioteca.concurso', 'biblioteca.metadados',
  ]},
  { id: 'professores', label: 'Professores', icon: '👨🏫', filhos: [
    'professores.planos', 'professores.avaliacoes', 'professores.conteudos',
    'professores.provas', 'professores.boletim', 'professores.conselho',
  ]},
  { id: 'questoes', label: 'Questões', icon: '❓', filhos: [] },
  { id: 'agente_educa', label: 'Agente EDUCA', icon: '🤖', filhos: [
    'agente_educa.credenciais', 'agente_educa.planos', 'agente_educa.notas',
  ]},
  { id: 'impressao', label: 'Impressão', icon: '🖨️', filhos: [
    'impressao.gabaritos', 'impressao.boletins', 'impressao.listas', 'impressao.documentos',
  ]},
  { id: 'ferramentas', label: 'Ferramentas', icon: '🔧', filhos: [] },
  { id: 'direcao', label: 'Direção', icon: '🏛️', filhos: [
    'direcao.educa_capture', 'direcao.responsaveis', 'direcao.cadastro', 'direcao.governanca',
  ]},
  { id: 'monitoramento', label: 'Monitoramento', icon: '👁️', filhos: [
    'monitoramento.painel', 'monitoramento.alertas', 'monitoramento.embeddings',
  ]},
];

const PERFIS = [
  { id: 'secretario',  label: 'Secretário(a)',   icon: '📋', color: '#3b82f6' },
  { id: 'professor',   label: 'Professor(a)',     icon: '👨🏫', color: '#10b981' },
  { id: 'coordenador', label: 'Coordenador(a)',   icon: '🎯', color: '#f59e0b' },
  { id: 'supervisor',  label: 'Supervisor(a)',    icon: '👁️', color: '#8b5cf6' },
  { id: 'disciplinar', label: 'Disciplinar',      icon: '⚖️', color: '#ef4444' },
];

const apiBase = import.meta.env.VITE_API_URL || '';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatModuloLabel(key) {
  const parts = key.split('.');
  const name = parts[parts.length - 1];
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  };
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Toggle({ checked, onChange, locked }) {
  return (
    <div
      onClick={locked ? undefined : onChange}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: locked
          ? '#374151'
          : checked
          ? 'linear-gradient(90deg, #10b981, #059669)'
          : 'rgba(255,255,255,0.1)',
        position: 'relative',
        cursor: locked ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        border: locked ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2px',
        flexShrink: 0,
      }}
      title={locked ? 'Bloqueado pelo CEO' : checked ? 'Clique para desativar' : 'Clique para ativar'}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: locked ? '#6b7280' : '#fff',
          transform: checked && !locked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.55rem',
        }}
      >
        {locked ? '🔒' : ''}
      </div>
    </div>
  );
}

function SkeletonCard() {
  const pulse = {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-pulse 1.5s infinite',
    borderRadius: 8,
  };
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ ...pulse, width: 36, height: 36 }} />
        <div style={{ ...pulse, width: 140, height: 20 }} />
        <div style={{ ...pulse, width: 80, height: 16, marginLeft: 'auto' }} />
      </div>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ ...pulse, width: `${40 + i * 15}%`, height: 14 }} />
          <div style={{ ...pulse, width: 44, height: 24, borderRadius: 12 }} />
        </div>
      ))}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      right: 28,
      zIndex: 9999,
      background: toast.type === 'success'
        ? 'linear-gradient(135deg, #065f46, #047857)'
        : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
      border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
      color: '#fff',
      borderRadius: 14,
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minWidth: 280,
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      animation: 'toast-in 0.3s ease',
    }}>
      <span style={{ fontSize: '1.2rem' }}>
        {toast.type === 'success' ? '✅' : '❌'}
      </span>
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
    </div>
  );
}

function ModuloRow({ modKey, checked, locked, isDefault, onToggle }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: 10,
        transition: 'background 0.15s ease',
        background: hovered && !locked ? 'rgba(255,255,255,0.04)' : 'transparent',
        cursor: locked ? 'not-allowed' : 'pointer',
        gap: 12,
      }}
      onClick={locked ? undefined : onToggle}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: locked ? '#4b5563' : checked ? '#10b981' : 'rgba(255,255,255,0.2)',
          flexShrink: 0,
          transition: 'background 0.2s',
        }} />
        <span style={{
          fontSize: '0.85rem',
          color: locked ? '#4b5563' : checked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
          fontWeight: checked && !locked ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'color 0.2s',
        }}>
          {formatModuloLabel(modKey)}
        </span>
        {isDefault && !locked && (
          <span style={{
            fontSize: '0.65rem',
            background: 'rgba(99,102,241,0.25)',
            color: '#a5b4fc',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 6,
            padding: '1px 6px',
            fontWeight: 600,
            letterSpacing: '0.03em',
            flexShrink: 0,
          }}>
            padrão
          </span>
        )}
        {locked && (
          <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>🔒</span>
        )}
      </div>
      <Toggle checked={checked} onChange={onToggle} locked={locked} />
    </div>
  );
}

function GroupCard({ group, modulos, ceoCeiling, defaultModulos, onToggleModulo, onToggleGroup }) {
  const [collapsed, setCollapsed] = useState(false);

  const relevantFilhos = group.filhos.filter(m => ceoCeiling.has(m) || group.filhos.length === 0);
  const allFilhos = group.filhos.length > 0 ? group.filhos : [];

  // Count active children
  const ceoFilhos = allFilhos.filter(m => ceoCeiling.has(m));
  const activeCount = ceoFilhos.filter(m => modulos[m] === true).length;
  const lockedCount = allFilhos.filter(m => !ceoCeiling.has(m)).length;
  const totalVisible = allFilhos.length;

  // Parent is a leaf module (no children)
  const isLeaf = allFilhos.length === 0;
  const parentLocked = !ceoCeiling.has(group.id) && isLeaf;
  const parentChecked = isLeaf ? (modulos[group.id] === true) : activeCount > 0;

  const allCeoActive = ceoFilhos.length > 0 && ceoFilhos.every(m => modulos[m] === true);

  if (totalVisible === 0 && !isLeaf) return null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'border-color 0.2s ease',
    }}>
      {/* Card Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{
          fontSize: '1.3rem',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 10,
          flexShrink: 0,
        }}>
          {group.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>
            {group.label}
          </div>
          {!isLeaf && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {activeCount}/{ceoFilhos.length} módulos ativos
              {lockedCount > 0 && ` · ${lockedCount} bloqueado${lockedCount > 1 ? 's' : ''}`}
            </div>
          )}
        </div>

        {/* Parent-level toggle for groups with children */}
        {!isLeaf && ceoFilhos.length > 0 && (
          <div
            onClick={e => { e.stopPropagation(); onToggleGroup(group, !allCeoActive); }}
            style={{ marginRight: 8 }}
          >
            <Toggle
              checked={allCeoActive}
              onChange={() => onToggleGroup(group, !allCeoActive)}
              locked={false}
            />
          </div>
        )}

        {/* Leaf-level toggle */}
        {isLeaf && (
          <div onClick={e => e.stopPropagation()}>
            <Toggle
              checked={parentChecked}
              onChange={() => onToggleModulo(group.id)}
              locked={parentLocked}
            />
          </div>
        )}

        <span style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.75rem',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          marginLeft: 4,
        }}>
          ▼
        </span>
      </div>

      {/* Children */}
      {!collapsed && !isLeaf && (
        <div style={{ padding: '8px 12px 12px' }}>
          {allFilhos.map(modKey => {
            const locked = !ceoCeiling.has(modKey);
            const checked = modulos[modKey] === true;
            const isDefault = !locked && defaultModulos.has(modKey);
            return (
              <ModuloRow
                key={modKey}
                modKey={modKey}
                checked={checked}
                locked={locked}
                isDefault={isDefault}
                onToggle={() => onToggleModulo(modKey)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function GovernanModulos() {
  const [perfil, setPerfil] = useState('secretario');
  const [modulos, setModulos] = useState({});        // { 'modulo.key': true|false }
  const [defaultModulos, setDefaultModulos] = useState(new Set()); // modules where diretor_ativo was null
  const [ceoCeiling, setCeoCeiling] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const escolaNome = localStorage.getItem('escola_nome') || 'Escola';
  const escolaId = localStorage.getItem('escola_id') || '';

  // ── Show toast ─────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch data ─────────────────────────────
  const fetchData = useCallback(async (perfilId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const headers = { Authorization: `Bearer ${token}` };

      const [dirRes, ceoRes] = await Promise.all([
        fetch(`${apiBase}/api/direcao/modulos/${perfilId}`, { headers }),
        fetch(`${apiBase}/api/plataforma/modulos/${escolaId}`, { headers }),
      ]);

      if (!dirRes.ok) throw new Error(`Erro ao carregar configuração do perfil (${dirRes.status})`);
      if (!ceoRes.ok) throw new Error(`Erro ao carregar teto do CEO (${ceoRes.status})`);

      const dirData = await dirRes.json();
      const ceoData = await ceoRes.json();

      // Build CEO ceiling set
      const ceiling = new Set(
        (ceoData.modulos || [])
          .filter(m => m.ativo)
          .map(m => m.modulo)
      );
      setCeoCeiling(ceiling);

      // Build modulos map + track defaults
      const map = {};
      const defaults = new Set();

      (dirData.modulos || []).forEach(({ modulo, ceo_ativo, diretor_ativo }) => {
        if (!ceo_ativo) {
          map[modulo] = false;
        } else if (diretor_ativo === null || diretor_ativo === undefined) {
          map[modulo] = true; // default ON
          defaults.add(modulo);
        } else {
          map[modulo] = diretor_ativo;
        }
      });

      setModulos(map);
      setDefaultModulos(defaults);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [escolaId]);

  useEffect(() => {
    fetchData(perfil);
  }, [perfil, fetchData]);

  // ── Toggle single module ───────────────────
  const handleToggleModulo = useCallback((modKey) => {
    setModulos(prev => {
      const newVal = !prev[modKey];
      return { ...prev, [modKey]: newVal };
    });
    setDefaultModulos(prev => {
      const next = new Set(prev);
      next.delete(modKey);
      return next;
    });
  }, []);

  // ── Toggle group (all CEO-enabled children) ─
  const handleToggleGroup = useCallback((group, targetState) => {
    setModulos(prev => {
      const next = { ...prev };
      group.filhos.forEach(m => {
        if (ceoCeiling.has(m)) {
          next[m] = targetState;
        }
      });
      return next;
    });
    setDefaultModulos(prev => {
      const next = new Set(prev);
      group.filhos.forEach(m => next.delete(m));
      return next;
    });
  }, [ceoCeiling]);

  // ── Save ───────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(modulos).map(([modulo, ativo]) => ({ modulo, ativo }));
      const res = await fetch(`${apiBase}/api/direcao/modulos/${perfil}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ modulos: payload }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Erro ${res.status}`);
      }
      // Clear defaults after save
      setDefaultModulos(new Set());
      showToast('Configuração salva com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Falha ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Active profile meta ────────────────────
  const perfilMeta = PERFIS.find(p => p.id === perfil);

  // ── Styles ────────────────────────────────
  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#e2e8f0',
    },
    inner: {
      maxWidth: 960,
      margin: '0 auto',
      padding: '0 24px 60px',
    },
  };

  // ─────────────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`
        @keyframes skeleton-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>

      <div style={styles.inner}>

        {/* ── Header ─────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30,27,75,0.95), rgba(15,23,42,0.95))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0 0 24px 24px',
          padding: '32px 0 28px',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                }}>
                  🔧
                </div>
                <h1 style={{
                  margin: 0,
                  fontSize: '1.7rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #e2e8f0, #a5b4fc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}>
                  Módulos por Perfil
                </h1>
              </div>
              <p style={{
                margin: '0 0 12px',
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.45)',
                maxWidth: 520,
                lineHeight: 1.6,
              }}>
                Configure quais funcionalidades cada função da escola pode acessar.
                As permissões do CEO são o limite máximo.
              </p>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: '0.78rem',
                color: '#a5b4fc',
                fontWeight: 600,
              }}>
                🏫 {escolaNome}
              </span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                padding: '12px 28px',
                borderRadius: 12,
                border: 'none',
                background: saving || loading
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: saving || loading ? 'rgba(255,255,255,0.3)' : '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
                boxShadow: saving || loading ? 'none' : '0 8px 20px rgba(99,102,241,0.35)',
                whiteSpace: 'nowrap',
                alignSelf: 'flex-start',
              }}
              onMouseEnter={e => {
                if (!saving && !loading) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {saving ? (
                <>
                  <span style={{
                    width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                  Salvando…
                </>
              ) : (
                <>💾 Salvar Configuração</>
              )}
            </button>
          </div>
        </div>

        {/* ── Profile Tabs ───────────────────────── */}
        <div style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 28,
          scrollbarWidth: 'none',
        }}>
          {PERFIS.map(p => {
            const isActive = p.id === perfil;
            return (
              <button
                key={p.id}
                onClick={() => setPerfil(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 50,
                  border: isActive
                    ? `1.5px solid ${p.color}`
                    : '1.5px solid rgba(255,255,255,0.1)',
                  background: isActive
                    ? `${p.color}22`
                    : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? `0 4px 16px ${p.color}33` : 'none',
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                  }
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Error State ─────────────────────────── */}
        {error && !loading && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 14,
            padding: '24px',
            textAlign: 'center',
            marginBottom: 28,
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: '0.95rem', color: '#fca5a5', fontWeight: 600, marginBottom: 6 }}>
              Falha ao carregar dados
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
              {error}
            </div>
            <button
              onClick={() => fetchData(perfil)}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.2)',
                color: '#fca5a5',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              🔄 Tentar Novamente
            </button>
          </div>
        )}

        {/* ── Warning Banner ─────────────────────── */}
        {!loading && !error && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>⚠️</span>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
              <strong style={{ color: '#fbbf24' }}>Atenção:</strong>{' '}
              Módulos bloqueados (🔒) foram desabilitados pelo CEO e não podem ser alterados pelo Diretor.
              Módulos sem configuração prévia aparecerão como{' '}
              <span style={{ color: '#a5b4fc', fontWeight: 600 }}>ATIVADOS por padrão</span>{' '}
              (indicados como{' '}
              <span style={{
                background: 'rgba(99,102,241,0.25)',
                border: '1px solid rgba(99,102,241,0.35)',
                borderRadius: 4,
                padding: '0 4px',
                color: '#a5b4fc',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}>padrão</span>).
            </div>
          </div>
        )}

        {/* ── Module Grid ────────────────────────── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : !error ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
            gap: 16,
            animation: 'fadeInUp 0.35s ease',
          }}>
            {MODULOS_TREE.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                modulos={modulos}
                ceoCeiling={ceoCeiling}
                defaultModulos={defaultModulos}
                onToggleModulo={handleToggleModulo}
                onToggleGroup={handleToggleGroup}
              />
            ))}
          </div>
        ) : null}

        {/* ── Active Profile Summary ──────────────── */}
        {!loading && !error && perfilMeta && (
          <div style={{
            marginTop: 32,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${perfilMeta.color}33`,
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${perfilMeta.color}22`,
              border: `1px solid ${perfilMeta.color}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              flexShrink: 0,
            }}>
              {perfilMeta.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                Perfil selecionado
              </div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem' }}>
                {perfilMeta.label}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Módulos ativos', value: Object.values(modulos).filter(Boolean).length, color: '#10b981' },
                { label: 'Módulos inativos', value: Object.values(modulos).filter(v => v === false).length, color: '#ef4444' },
                { label: 'Disponíveis (CEO)', value: ceoCeiling.size, color: '#6366f1' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Toast ──────────────────────────────── */}
      <Toast toast={toast} />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
