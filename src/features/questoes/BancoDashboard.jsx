// src/features/questoes/BancoDashboard.jsx
// 🏆 EDUCA.PROVA — Sprint 5: Dashboard de Estatísticas do Banco

import React, { useState, useEffect, useCallback } from 'react';

const api = async (path) => {
  const token = localStorage.getItem('token');
  const r = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const NIVEL_COR  = { facil: '#059669', medio: '#d97706', dificil: '#dc2626', enem: '#7c3aed' };
const NIVEL_LABEL= { facil: 'Fácil',   medio: 'Médio',   dificil: 'Difícil', enem: 'ENEM' };
const TIPO_LABEL = { objetiva: 'Objetiva', discursiva: 'Discursiva', verdadeiro_falso: 'V/F', associacao: 'Assoc.', lacuna: 'Lacuna' };
const TIPO_COR   = { objetiva: '#0e7490', discursiva: '#7c3aed', verdadeiro_falso: '#d97706', associacao: '#059669', lacuna: '#dc2626' };

/* ── Mini barra de progresso ────────────────────────────────────────────────── */
function BarraHorizontal({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
        <span style={{ color: '#334155', fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontWeight: 800 }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 99,
          background: color,
          transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────────────────── */
function StatCard({ icon, value, label, color, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 18px',
      border: `1.5px solid ${color}30`,
      boxShadow: `0 2px 12px ${color}10`,
      flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════════════════════ */
export default function BancoDashboard({ onCriarQuestao, onVerBanco }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/questoes/stats');
      setStats(data);
    } catch { setStats(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '60px 20px', justifyContent: 'center', color: '#94a3b8' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #0e7490', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      Carregando estatísticas...
    </div>
  );

  if (!stats) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
      <div style={{ fontSize: '2rem', marginBottom: 10 }}>📊</div>
      <div>Não foi possível carregar estatísticas.</div>
    </div>
  );

  const { totais = {}, porNivel = [], porDisciplina = [], porTipo = [], maisUsadas = [], recentes = [] } = stats;
  const maxDisc = Math.max(...porDisciplina.map(d => Number(d.total)), 1);
  const maxNivel = Math.max(...porNivel.map(n => Number(n.total)), 1);
  const maxTipo  = Math.max(...porTipo.map(t => Number(t.total)), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 60%, #1d4ed8 100%)',
        borderRadius: 14, padding: '18px 22px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ fontSize: '2.4rem' }}>📊</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>Dashboard do Banco de Questões</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: 2 }}>
            Visão geral do acervo pedagógico da escola
          </div>
        </div>
        <button onClick={carregar} style={{
          padding: '7px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700,
        }}>
          🔄 Atualizar
        </button>
        <button onClick={onCriarQuestao} style={{
          padding: '7px 16px', borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
          color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 800,
        }}>
          ✏️ Criar Questão
        </button>
      </div>

      {/* ── Cards de totais ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="📚" value={totais.total || 0}       label="Total"       color="#0e7490" sub={`${totais.ativas||0} ativas`} />
        <StatCard icon="✅" value={totais.ativas || 0}      label="Ativas"      color="#059669" />
        <StatCard icon="🔧" value={totais.rascunhos || 0}   label="Rascunhos"   color="#d97706" />
        <StatCard icon="📁" value={totais.arquivadas || 0}  label="Arquivadas"  color="#94a3b8" />
        <StatCard icon="🤝" value={totais.compartilhadas||0}label="Compartilhadas"color="#7c3aed" />
      </div>

      {/* ── Gráficos ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Nível */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            🎯 Por Nível
          </div>
          {porNivel.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>Sem dados</div>
          ) : (
            porNivel.map(n => (
              <BarraHorizontal
                key={n.nivel}
                label={NIVEL_LABEL[n.nivel] || n.nivel}
                value={Number(n.total)}
                max={maxNivel}
                color={NIVEL_COR[n.nivel] || '#64748b'}
              />
            ))
          )}
        </div>

        {/* Tipo */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            📝 Por Tipo
          </div>
          {porTipo.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>Sem dados</div>
          ) : (
            porTipo.map(t => (
              <BarraHorizontal
                key={t.tipo}
                label={TIPO_LABEL[t.tipo] || t.tipo}
                value={Number(t.total)}
                max={maxTipo}
                color={TIPO_COR[t.tipo] || '#64748b'}
              />
            ))
          )}
        </div>

        {/* Disciplina */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            📚 Por Disciplina
          </div>
          {porDisciplina.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>Sem dados</div>
          ) : (
            porDisciplina.map(d => (
              <BarraHorizontal
                key={d.disciplina}
                label={d.disciplina || '(sem disciplina)'}
                value={Number(d.total)}
                max={maxDisc}
                color="#0e7490"
              />
            ))
          )}
        </div>
      </div>

      {/* ── Mais usadas + Recentes ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Top Mais Usadas */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            🏆 Mais Utilizadas em Provas
            {maisUsadas.length > 0 && (
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>top {maisUsadas.length}</span>
            )}
          </div>
          {maisUsadas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              Nenhuma questão foi usada em provas ainda.
            </div>
          ) : (
            maisUsadas.map((q, i) => (
              <div key={q.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 0', borderBottom: i < maisUsadas.length - 1 ? '0.5px solid #f1f5f9' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#e2e8f0',
                  color: i < 3 ? '#fff' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {(q.conteudo_bruto || '').slice(0, 55)}{q.conteudo_bruto?.length > 55 ? '…' : ''}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 1 }}>
                    {q.disciplina || '—'} · {NIVEL_LABEL[q.nivel] || q.nivel}
                  </div>
                </div>
                <div style={{
                  flexShrink: 0, textAlign: 'center',
                  background: '#f0f9ff', color: '#0e7490',
                  padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800,
                  border: '1px solid #bae6fd',
                }}>
                  {q.vezes_utilizada}×
                </div>
              </div>
            ))
          )}
        </div>

        {/* Questões Recentes */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            🆕 Adicionadas Recentemente
          </div>
          {recentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              Nenhuma questão criada.
            </div>
          ) : (
            recentes.map((q, i) => {
              const cor = NIVEL_COR[q.nivel] || '#64748b';
              const data = new Date(q.criada_em);
              const diaStr = `${data.getDate().toString().padStart(2,'0')}/${(data.getMonth()+1).toString().padStart(2,'0')}/${data.getFullYear()}`;
              return (
                <div key={q.id} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '8px 0', borderBottom: i < recentes.length - 1 ? '0.5px solid #f1f5f9' : 'none',
                }}>
                  <div style={{
                    width: 8, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0, background: cor,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {(q.conteudo_bruto || '').slice(0, 60)}{q.conteudo_bruto?.length > 60 ? '…' : ''}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 1, display: 'flex', gap: 8 }}>
                      <span>{q.disciplina || '—'}</span>
                      <span>·</span>
                      <span style={{ color: cor, fontWeight: 700 }}>{NIVEL_LABEL[q.nivel] || q.nivel}</span>
                      <span>·</span>
                      <span>{diaStr}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {recentes.length > 0 && (
            <button onClick={onVerBanco} style={{
              marginTop: 12, width: '100%', padding: '7px', borderRadius: 8,
              border: '1.5px solid #e2e8f0', background: '#f8fafc',
              color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.76rem', fontWeight: 700,
            }}>
              Ver todo o banco →
            </button>
          )}
        </div>
      </div>

      {/* ── Ações rápidas ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a08, #0e749010)',
        borderRadius: 12, border: '1.5px solid #0e749020',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 800, flex: 1 }}>
          🚀 Ações rápidas
        </div>
        {[
          { label: '✏️ Nova Questão',     action: onCriarQuestao, primary: true },
          { label: '📚 Ver Banco',        action: onVerBanco },
          { label: '🔄 Atualizar Stats',  action: carregar },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: '0.8rem', fontWeight: 700,
            border: btn.primary ? 'none' : '1.5px solid #e2e8f0',
            background: btn.primary ? 'linear-gradient(135deg, #0e7490, #1d4ed8)' : '#fff',
            color: btn.primary ? '#fff' : '#334155',
          }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
