// src/features/plataforma/BancoMaster.jsx
// ============================================================================
// EDUCA.MELHOR — Banco Master (CEO)
// Painel de gestão das questões premium com preview interativo estilo estudante
// Duas colunas: tabela (esquerda) + preview detalhado (direita)
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

// ── LaTeX inline renderer ────────────────────────────────────────────────────
function LatexText({ text = '' }) {
  if (!text) return null;
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('$') && p.endsWith('$')
          ? <span key={i} style={{ fontStyle: 'italic', fontFamily: "'IM Fell English', Georgia, serif" }}>{p.slice(1, -1)}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    rascunho:  { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Rascunho' },
    revisao:   { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6', label: 'Revisão' },
    publicado: { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'Aprovada' },
    arquivado: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: 'Arquivada' },
  }[status] || { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: status };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem',
      fontWeight: 700, letterSpacing: '0.3px',
      background: cfg.bg, color: cfg.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}

// ── Nível badge ──────────────────────────────────────────────────────────────
function NivelBadge({ nivel }) {
  const cfg = {
    basico:        { color: '#10b981', label: 'Básico' },
    intermediario: { color: '#f59e0b', label: 'Intermediário' },
    avancado:      { color: '#f97316', label: 'Avançado' },
    vestibular:    { color: '#8b5cf6', label: 'Vestibular' },
    enem:          { color: '#7c3aed', label: 'ENEM' },
  }[nivel] || { color: '#6b7280', label: nivel };

  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 700, color: cfg.color,
      background: `${cfg.color}18`, padding: '2px 7px', borderRadius: 6,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Seção colapsável ─────────────────────────────────────────────────────────
function Secao({ titulo, icone, children, defaultOpen = false, accentColor = '#7c3aed', lock = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 12, border: `1px solid ${accentColor}28`, borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => !lock && setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: `${accentColor}10`,
          border: 'none', cursor: lock ? 'default' : 'pointer',
          color: '#e2e8f0', fontWeight: 700, fontSize: '0.82rem',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1rem' }}>{icone}</span>
        <span style={{ flex: 1, color: accentColor }}>{titulo}</span>
        {!lock && (
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        )}
      </button>
      {open && (
        <div style={{ padding: '12px 14px', background: 'rgba(15,17,23,0.4)', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.7 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Preview da questão (coluna direita) ──────────────────────────────────────
function QuestaoPreview({ questao, onAprovar, onArquivar, aprovando }) {
  const [altSelecionada, setAltSelecionada] = useState(null);
  const [mostrarGabarito, setMostrarGabarito] = useState(false);
  const [respostaVerificada, setRespostaVerificada] = useState(false);

  // Reset ao trocar de questão
  useEffect(() => {
    setAltSelecionada(null);
    setMostrarGabarito(false);
    setRespostaVerificada(false);
  }, [questao?.id]);

  if (!questao) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, color: '#475569',
      }}>
        <span style={{ fontSize: '3rem' }}>⭐</span>
        <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Selecione uma questão para visualizar</p>
        <p style={{ fontSize: '0.8rem', color: '#334155', textAlign: 'center', maxWidth: 280 }}>
          Clique em qualquer linha da tabela para ver o preview completo com a experiência do estudante
        </p>
      </div>
    );
  }

  let alts = [];
  try {
    alts = Array.isArray(questao.alternativas_json)
      ? questao.alternativas_json
      : JSON.parse(questao.alternativas_json || '[]');
  } catch {}

  let dicas = [];
  try { dicas = Array.isArray(questao.dicas) ? questao.dicas : JSON.parse(questao.dicas || '[]'); } catch {}

  const corretaLetra = questao.correta;
  const corretaObj = alts.find(a => a.letra === corretaLetra || a.correta);

  const verificarResposta = () => setRespostaVerificada(true);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 2px' }}>
      {/* Header da questão */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.1))',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 16,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#a78bfa', fontSize: '0.9rem' }}>
              {questao.codigo || `EMQM-${String(questao.id).padStart(5,'0')}`}
            </span>
            <StatusBadge status={questao.status} />
            <NivelBadge nivel={questao.nivel} />
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            <strong style={{ color: '#c4b5fd' }}>{questao.disciplina}</strong>
            {questao.conteudo && <> — {questao.conteudo}</>}
            {questao.tema && <> › {questao.tema}</>}
          </div>
          {questao.fonte && (
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
              📚 {questao.fonte}{questao.ano_fonte ? ` (${questao.ano_fonte})` : ''}
            </div>
          )}
        </div>

        {/* Ações CEO */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {questao.status !== 'publicado' && (
            <button
              onClick={onAprovar}
              disabled={aprovando}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: aprovando ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                opacity: aprovando ? 0.7 : 1,
              }}
            >
              {aprovando ? '...' : '✓ Aprovar'}
            </button>
          )}
          {questao.status === 'rascunho' && (
            <button
              onClick={onArquivar}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)',
                cursor: 'pointer', background: 'transparent',
                color: '#f87171', fontWeight: 700, fontSize: '0.78rem',
              }}
            >
              Arquivar
            </button>
          )}
        </div>
      </div>

      {/* ENUNCIADO */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '14px 16px', marginBottom: 12,
        color: '#e2e8f0', fontSize: '0.92rem', lineHeight: 1.8,
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', letterSpacing: '1px', marginBottom: 8 }}>
          ENUNCIADO
        </div>

        {/* 1️⃣ Texto do enunciado (parte inicial — antes da imagem) */}
        <LatexText text={questao.enunciado} />

        {/* 2️⃣ Imagem da questão (tamanho controlado — premium mas proporcional) */}
        {questao.imagem_url && (
          <div style={{ textAlign: 'center', margin: '14px 0' }}>
            <img
              src={questao.imagem_url}
              alt="Figura da questão"
              style={{
                display: 'inline-block',
                maxWidth: '55%',
                maxHeight: 260,
                height: 'auto',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* 3️⃣ Texto complementar (parte após a imagem — ex: "Considerando a figura acima...") */}
        {questao.texto_apoio && (
          <div style={{ marginTop: questao.imagem_url ? 4 : 12 }}>
            <LatexText text={questao.texto_apoio} />
          </div>
        )}
      </div>


      {/* ALTERNATIVAS (objetiva) */}
      {alts.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', letterSpacing: '1px', marginBottom: 8 }}>
            ALTERNATIVAS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alts.map((alt) => {
              const letra = alt.letra || alt.key;
              const isSelected = altSelecionada === letra;
              const isCorreta = letra === corretaLetra;
              const showResult = respostaVerificada;

              let bg = 'rgba(255,255,255,0.04)';
              let border = '1px solid rgba(255,255,255,0.08)';
              let color = '#cbd5e1';

              if (showResult) {
                if (isCorreta) { bg = 'rgba(16,185,129,0.15)'; border = '1px solid #10b981'; color = '#10b981'; }
                else if (isSelected) { bg = 'rgba(239,68,68,0.12)'; border = '1px solid #ef4444'; color = '#f87171'; }
              } else if (isSelected) {
                bg = 'rgba(124,58,237,0.2)'; border = '1px solid rgba(124,58,237,0.6)'; color = '#c4b5fd';
              }

              return (
                <button
                  key={letra}
                  onClick={() => !respostaVerificada && setAltSelecionada(letra)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 14px', borderRadius: 8, border, background: bg,
                    cursor: respostaVerificada ? 'default' : 'pointer',
                    color, fontSize: '0.88rem', lineHeight: 1.6, textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    minWidth: 24, height: 24, borderRadius: '50%',
                    border: `2px solid currentColor`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.78rem', flexShrink: 0,
                  }}>
                    {showResult && isCorreta ? '✓' : showResult && isSelected ? '✗' : letra}
                  </span>
                  <LatexText text={alt.texto} />
                </button>
              );
            })}
          </div>

          {/* Botão verificar */}
          {!respostaVerificada && (
            <button
              onClick={verificarResposta}
              disabled={!altSelecionada}
              style={{
                marginTop: 10, width: '100%', padding: '9px', borderRadius: 8,
                border: 'none', cursor: altSelecionada ? 'pointer' : 'not-allowed',
                background: altSelecionada
                  ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                  : 'rgba(255,255,255,0.05)',
                color: altSelecionada ? '#fff' : '#475569',
                fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
              }}
            >
              Verificar resposta
            </button>
          )}

          {respostaVerificada && (
            <div style={{
              marginTop: 10, padding: '8px 14px', borderRadius: 8,
              background: altSelecionada === corretaLetra ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
              color: altSelecionada === corretaLetra ? '#10b981' : '#f87171',
              fontWeight: 700, fontSize: '0.84rem', textAlign: 'center',
            }}>
              {altSelecionada === corretaLetra ? '🎉 Resposta correta!' : `❌ Incorreto. A resposta correta é (${corretaLetra})`}
            </div>
          )}
        </div>
      )}

      {/* DIVISOR ÁREA DO ESTUDANTE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4))' }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
          ⭐ ÁREA DE ESTUDO
        </span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(124,58,237,0.4), transparent)' }} />
      </div>

      {/* GABARITO */}
      <Secao titulo="Gabarito" icone="🎯" accentColor="#10b981">
        <div style={{
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 8, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(16,185,129,0.2)', border: '2px solid #10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: '#10b981', fontSize: '1rem', flexShrink: 0,
          }}>
            {corretaLetra || '?'}
          </span>
          <div style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>
            {corretaObj ? <LatexText text={corretaObj.texto} /> : questao.correta_texto || '—'}
          </div>
        </div>
      </Secao>

      {/* COMENTÁRIO DO GABARITO */}
      {questao.gabarito_comentado && (
        <Secao titulo="Comentário do Gabarito" icone="💬" accentColor="#3b82f6">
          <div style={{ lineHeight: 1.8 }}>
            <LatexText text={questao.gabarito_comentado} />
          </div>
        </Secao>
      )}

      {/* DICAS */}
      {dicas.length > 0 && (
        <Secao titulo={`Dicas (${dicas.length})`} icone="💡" accentColor="#f59e0b">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dicas.map((dica, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '8px 12px',
                background: 'rgba(245,158,11,0.08)', borderRadius: 8,
                border: '1px solid rgba(245,158,11,0.2)',
              }}>
                <span style={{
                  minWidth: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.72rem', flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ fontSize: '0.85rem', color: '#fde68a' }}><LatexText text={dica} /></span>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* RESOLUÇÃO COMPLETA */}
      {questao.resolucao_completa && (
        <Secao titulo="Resolução Completa" icone="📐" accentColor="#a855f7">
          <div style={{ lineHeight: 1.9, whiteSpace: 'pre-line' }}>
            <LatexText text={questao.resolucao_completa} />
          </div>
        </Secao>
      )}

      {/* CONCEITO CHAVE */}
      {questao.conceito_chave && (
        <Secao titulo="Conceito-Chave" icone="🧠" accentColor="#06b6d4">
          <div style={{ lineHeight: 1.7 }}>
            <LatexText text={questao.conceito_chave} />
          </div>
        </Secao>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//   COMPONENTE PRINCIPAL — BancoMaster
// ══════════════════════════════════════════════════════════════════════════════
export default function BancoMaster() {
  const [questoes, setQuestoes] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({ disciplina: '', nivel: '', status: '', q: '' });
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, aprovadas: 0, rascunhos: 0 });

  const debounceRef = useRef(null);

  const carregar = useCallback(async (cursor = 0, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ after_id: cursor, limit: 30 });
      if (filtros.disciplina) params.set('disciplina', filtros.disciplina);
      if (filtros.nivel)      params.set('nivel', filtros.nivel);
      if (filtros.status)     params.set('status', filtros.status);
      if (filtros.q)          params.set('q', filtros.q); // busca futura

      const { data } = await api.get(`/master/questoes?${params}`);
      const novas = data.data || [];

      setQuestoes(prev => append ? [...prev, ...novas] : novas);
      setNextCursor(data.next_cursor);
      setHasMore(data.has_more);

      // Calcula stats localmente
      const todas = append ? [...questoes, ...novas] : novas;
      setStats({
        total: todas.length,
        aprovadas: todas.filter(q => q.status === 'publicado').length,
        rascunhos: todas.filter(q => q.status === 'rascunho').length,
      });

      // Atualiza a questão selecionada se ela foi alterada
      if (selecionada) {
        const atualizada = novas.find(q => q.id === selecionada.id);
        if (atualizada) setSelecionada(atualizada);
      }
    } catch (err) {
      console.error('[BancoMaster] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [filtros, selecionada?.id]);

  // Debounce nos filtros
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => carregar(0, false), 350);
    return () => clearTimeout(debounceRef.current);
  }, [filtros]);

  const aprovarQuestao = async () => {
    if (!selecionada) return;
    setAprovando(true);
    try {
      await api.patch(`/master/questoes/${selecionada.id}/publicar`);
      await carregar(0, false);
    } catch (err) {
      alert('Erro ao aprovar questão: ' + (err?.response?.data?.error || err.message));
    } finally {
      setAprovando(false);
    }
  };

  const arquivarQuestao = async () => {
    if (!selecionada || !window.confirm('Arquivar esta questão?')) return;
    try {
      await api.patch(`/master/questoes/${selecionada.id}`, { status: 'arquivado' });
      setSelecionada(null);
      await carregar(0, false);
    } catch (err) {
      alert('Erro ao arquivar: ' + (err?.response?.data?.error || err.message));
    }
  };

  const DISCIPLINAS = ['Matemática','Português','História','Geografia','Ciências','Física','Química','Biologia','Inglês','Artes','Educação Física'];
  const NIVEIS = [
    { value: 'basico', label: 'Básico' },
    { value: 'intermediario', label: 'Intermediário' },
    { value: 'avancado', label: 'Avançado' },
    { value: 'vestibular', label: 'Vestibular' },
    { value: 'enem', label: 'ENEM' },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0f1117', color: '#e2e8f0',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>

      {/* HEADER */}
      <div style={{
        padding: '18px 24px 14px',
        borderBottom: '1px solid rgba(124,58,237,0.2)',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.04))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>⭐</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9' }}>Banco Master</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Questões premium EDUCA.MELHOR — gestão exclusiva CEO</p>
          </div>

          {/* Stats */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            {[
              { label: 'Total', value: stats.total, color: '#a78bfa' },
              { label: 'Aprovadas', value: stats.aprovadas, color: '#10b981' },
              { label: 'Rascunhos', value: stats.rascunhos, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="🔍 Buscar questão..."
            value={filtros.q}
            onChange={e => setFiltros(f => ({ ...f, q: e.target.value }))}
            style={{
              flex: 2, minWidth: 180, padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0', fontSize: '0.82rem', outline: 'none',
            }}
          />
          {[
            { key: 'disciplina', opts: DISCIPLINAS, placeholder: 'Disciplina' },
            { key: 'nivel', opts: NIVEIS, placeholder: 'Nível', isObj: true },
            { key: 'status', opts: ['rascunho','revisao','publicado','arquivado'], placeholder: 'Status' },
          ].map(f => (
            <select
              key={f.key}
              value={filtros[f.key]}
              onChange={e => setFiltros(prev => ({ ...prev, [f.key]: e.target.value }))}
              style={{
                padding: '6px 10px', borderRadius: 8, fontSize: '0.8rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">{f.placeholder}</option>
              {f.isObj
                ? f.opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
                : f.opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)
              }
            </select>
          ))}
          {Object.values(filtros).some(Boolean) && (
            <button
              onClick={() => setFiltros({ disciplina: '', nivel: '', status: '', q: '' })}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem',
              }}
            >
              ✕ Limpar
            </button>
          )}
        </div>
      </div>

      {/* BODY: DUAS COLUNAS */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* COLUNA ESQUERDA — tabela de questões */}
        <div style={{
          width: '40%', minWidth: 320, borderRight: '1px solid rgba(124,58,237,0.15)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {loading && questoes.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
                <p style={{ fontSize: '0.82rem' }}>Carregando questões...</p>
              </div>
            </div>
          ) : questoes.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                <p style={{ fontSize: '0.85rem' }}>Nenhuma questão encontrada</p>
                <p style={{ fontSize: '0.75rem', color: '#334155', marginTop: 4 }}>Use o sub-agente para importar questões</p>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Cabeçalho da tabela */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(124,58,237,0.1)', position: 'sticky', top: 0, zIndex: 1 }}>
                    {['Questão', 'Descrição', 'Status'].map(col => (
                      <th key={col} style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed',
                        letterSpacing: '0.8px', textTransform: 'uppercase',
                        borderBottom: '1px solid rgba(124,58,237,0.2)',
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {questoes.map((q, i) => {
                    const isAtiva = selecionada?.id === q.id;
                    return (
                      <tr
                        key={q.id}
                        onClick={() => setSelecionada(q)}
                        style={{
                          cursor: 'pointer',
                          background: isAtiva
                            ? 'linear-gradient(90deg, rgba(124,58,237,0.2), rgba(124,58,237,0.05))'
                            : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                          borderLeft: isAtiva ? '3px solid #7c3aed' : '3px solid transparent',
                          transition: 'all 0.1s',
                        }}
                        onMouseEnter={e => { if (!isAtiva) e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; }}
                        onMouseLeave={e => { if (!isAtiva) e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}
                      >
                        <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontFamily: 'monospace', color: isAtiva ? '#a78bfa' : '#64748b', whiteSpace: 'nowrap' }}>
                          {q.codigo || `EMQM-${String(q.id).padStart(5,'0')}`}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: isAtiva ? '#e2e8f0' : '#94a3b8' }}>
                          <div style={{ fontWeight: 600, color: isAtiva ? '#c4b5fd' : '#94a3b8' }}>{q.disciplina}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 1 }}>
                            {[q.conteudo, q.tema].filter(Boolean).join(' › ')}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <StatusBadge status={q.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Carregar mais */}
              {hasMore && (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <button
                    onClick={() => carregar(nextCursor, true)}
                    disabled={loading}
                    style={{
                      padding: '7px 20px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.4)',
                      background: 'transparent', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem',
                    }}
                  >
                    {loading ? 'Carregando...' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA — preview */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column',
        }}>
          <QuestaoPreview
            questao={selecionada}
            onAprovar={aprovarQuestao}
            onArquivar={arquivarQuestao}
            aprovando={aprovando}
          />
        </div>
      </div>
    </div>
  );
}
