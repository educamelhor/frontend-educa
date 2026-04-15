// src/features/questoes/BulkImportModal.jsx
// 🚀 EDUCA.PROVA — Importação em massa de questões via texto colado

import React, { useState, useCallback } from 'react';

/* ── Parser de questões a partir de texto livre ─────────────────────────────
   Detecta padrões como:
   - "1. Texto" / "1) Texto" / "Questão 1 - Texto"
   - Alternativas: "a) texto" / "A. texto" / "(a) texto"
   - Marcadores de gabarito: "Gabarito: A" / "Resposta: B" / "* A)"
────────────────────────────────────────────────────────────────────────── */

function parseQuestoes(texto) {
  const questoes = [];
  if (!texto.trim()) return questoes;

  // Divide por marcadores de questão: "1." / "1)" / "Q1" / "Questão 1"
  const blocos = texto.split(/(?=(?:^|\n)\s*(?:questão\s*\d+|q\d+|\d+[\.\)])\s*[\-:]?\s*)/i)
    .map(b => b.trim())
    .filter(Boolean);

  for (const bloco of blocos) {
    const linhas = bloco.split('\n').map(l => l.trim()).filter(Boolean);
    if (!linhas.length) continue;

    // Extrai número da questão e enunciado da primeira linha
    let enunciado = '';
    const QUEST_RE = /^(?:questão\s*\d+|q\d+|\d+[\.\)])\s*[\-:]?\s*/i;
    const primeiraLinha = linhas[0].replace(QUEST_RE, '').trim();
    let enunciadoLinhas = [primeiraLinha];

    // Coleta linhas até encontrar alternativas
    let i = 1;
    while (i < linhas.length && !isAlternativa(linhas[i]) && !isGabarito(linhas[i])) {
      enunciadoLinhas.push(linhas[i]);
      i++;
    }
    enunciado = enunciadoLinhas.join(' ').trim();
    if (!enunciado) continue;

    // Coleta alternativas
    const alternativas = [];
    const LETRAS_ORD = ['A', 'B', 'C', 'D', 'E', 'F'];
    while (i < linhas.length && isAlternativa(linhas[i])) {
      const texto = linhas[i].replace(/^\s*[\(\[]?[a-eA-E][\)\]\.\s]+/, '').trim();
      const letra = LETRAS_ORD[alternativas.length] || String.fromCharCode(65 + alternativas.length);
      alternativas.push({ id: Date.now() + Math.random(), letra, texto, correta: false });
      i++;
    }

    // Detecta gabarito
    let correta = null;
    while (i < linhas.length) {
      const m = linhas[i].match(/gabarito\s*[:\-]?\s*([a-eA-E])|resposta\s*[:\-]?\s*([a-eA-E])|\*\s*([a-eA-E])\)/i);
      if (m) {
        correta = (m[1] || m[2] || m[3]).toUpperCase();
      }
      i++;
    }

    // Marca alternativa correta
    if (correta) {
      alternativas.forEach(a => { a.correta = a.letra === correta; });
    }

    // Se não tem alternativas mas tem uma marca *, extrai do enunciado
    if (alternativas.length === 0) {
      // Não é objetiva — questão discursiva
      questoes.push({ enunciado, tipo: 'discursiva', alternativas: [] });
    } else {
      questoes.push({ enunciado, tipo: 'objetiva', alternativas });
    }
  }

  return questoes;
}

function isAlternativa(linha) {
  return /^\s*[\(\[]?[a-eA-E][\)\]\.\s]{1,2}\S/.test(linha);
}
function isGabarito(linha) {
  return /gabarito|resposta\s*:/i.test(linha);
}

/* ── Constantes ─────────────────────────────────────────────────────────── */
const DISCIPLINAS = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Artes', 'Educação Física', 'Biologia', 'Física',
  'Química', 'Sociologia', 'Filosofia', 'Redação', 'PD',
];
const SERIES = [
  '6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF',
  '1º EM', '2º EM', '3º EM',
];
const NIVEIS = ['facil', 'medio', 'dificil', 'enem'];
const NIVEL_LABEL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', enem: 'ENEM' };

/* ── Componente principal ────────────────────────────────────────────────── */
export default function BulkImportModal({ onClose, onImportado }) {
  const [texto,       setTexto]       = useState('');
  const [questoesParsed, setQuestoesParsed] = useState([]);
  const [step,        setStep]        = useState(1); // 1=colar, 2=revisar, 3=concluído
  const [disciplina,  setDisciplina]  = useState('');
  const [serie,       setSerie]       = useState('');
  const [nivel,       setNivel]       = useState('medio');
  const [salvando,    setSalvando]    = useState(false);
  const [progresso,   setProgresso]   = useState({ feitas: 0, total: 0 });
  const [erros,       setErros]       = useState([]);

  const parsear = useCallback(() => {
    const q = parseQuestoes(texto);
    setQuestoesParsed(q);
    setStep(2);
  }, [texto]);

  const salvarTodas = async () => {
    if (!disciplina) { alert('Selecione a disciplina.'); return; }
    setSalvando(true);
    setProgresso({ feitas: 0, total: questoesParsed.length });
    const errosLocal = [];
    const token = localStorage.getItem('token');

    for (let i = 0; i < questoesParsed.length; i++) {
      const q = questoesParsed[i];
      try {
        const payload = {
          conteudo_bruto: q.enunciado,
          tipo: q.tipo,
          nivel,
          serie,
          disciplina,
          alternativas_json: JSON.stringify(q.alternativas),
          correta: q.alternativas.find(a => a.correta)?.letra || null,
          tags: '',
          status: 'ativa',
        };
        const r = await fetch('/api/questoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } catch (e) {
        errosLocal.push(`Q${i + 1}: ${e.message}`);
      }
      setProgresso({ feitas: i + 1, total: questoesParsed.length });
    }

    setErros(errosLocal);
    setSalvando(false);
    setStep(3);
    if (errosLocal.length === 0) onImportado?.();
  };

  const editar = (idx, campo, valor) => {
    setQuestoesParsed(prev => prev.map((q, i) =>
      i === idx ? { ...q, [campo]: valor } : q
    ));
  };

  const remover = (idx) => {
    setQuestoesParsed(prev => prev.filter((_, i) => i !== idx));
  };

  const EXEMPLO = `1. Qual é o valor de x na equação 2x + 4 = 10?
a) x = 1
b) x = 2
c) x = 3
d) x = 4
Gabarito: C

2. O Brasil foi colonizado por:
a) Espanha
b) Portugal
c) França
d) Inglaterra
Gabarito: B

3. A fotossíntese é realizada por:
a) Animais
b) Fungos
c) Plantas
d) Bactérias
Gabarito: C`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #0e7490)',
          padding: '18px 24px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: '2rem' }}>📥</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '1rem' }}>
              Importação em Massa
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', marginTop: 2 }}>
              Cole o texto das questões e o sistema extrai automaticamente
            </div>
          </div>
          {/* Steps */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step >= s ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                color: step >= s ? '#fff' : 'rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800,
              }}>{s}</div>
            ))}
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
            fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Corpo scrollável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── STEP 1: Colar texto ─────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {/* Disciplina */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    Disciplina *
                  </label>
                  <select value={disciplina} onChange={e => setDisciplina(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                    <option value="">— Selecione —</option>
                    {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {/* Série */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    Série / Ano
                  </label>
                  <select value={serie} onChange={e => setSerie(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                    <option value="">— Todas —</option>
                    {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Nível */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    Nível padrão
                  </label>
                  <select value={nivel} onChange={e => setNivel(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                    {NIVEIS.map(n => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
                  </select>
                </div>
              </div>

              {/* Dica de formato */}
              <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0369a1', marginBottom: 6 }}>
                  💡 Formato aceito:
                </div>
                <div style={{ fontSize: '0.72rem', color: '#0e7490', lineHeight: 1.7 }}>
                  <strong>Número</strong> + ponto/parêntese + enunciado → <code>1. Qual é...?</code> ou <code>1) Qual é...?</code><br/>
                  <strong>Alternativas</strong>: <code>a) texto</code>, <code>A. texto</code> ou <code>(a) texto</code><br/>
                  <strong>Gabarito</strong> (opcional): <code>Gabarito: C</code> ou <code>Resposta: B</code>
                </div>
                <button
                  onClick={() => setTexto(EXEMPLO)}
                  style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, border: '1px solid #bae6fd', background: '#fff', color: '#0369a1', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'inherit' }}>
                  📝 Carregar exemplo
                </button>
              </div>

              {/* Textarea */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                  Cole o texto das questões aqui:
                </label>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder="1. Digite ou cole suas questões aqui&#10;a) Alternativa A&#10;b) Alternativa B&#10;c) Alternativa C&#10;d) Alternativa D&#10;Gabarito: B&#10;&#10;2. Próxima questão..."
                  style={{
                    width: '100%', minHeight: 300, padding: '12px 14px',
                    borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: '0.83rem', fontFamily: 'monospace', lineHeight: 1.6,
                    resize: 'vertical', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0e7490'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                  {texto.split('\n').filter(Boolean).length} linhas · {texto.length} caracteres
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Revisar questões detectadas ─────────────────────── */}
          {step === 2 && (
            <div>
              <div style={{
                background: questoesParsed.length > 0 ? '#f0fdf4' : '#fef2f2',
                border: `1.5px solid ${questoesParsed.length > 0 ? '#86efac' : '#fca5a5'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: '1.4rem' }}>{questoesParsed.length > 0 ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: questoesParsed.length > 0 ? '#166534' : '#991b1b' }}>
                    {questoesParsed.length > 0
                      ? `${questoesParsed.length} questão(ões) detectada(s)!`
                      : 'Nenhuma questão detectada. Verifique o formato.'}
                  </div>
                  {questoesParsed.length > 0 && (
                    <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: 2 }}>
                      Revise abaixo antes de salvar. Você pode editar ou remover questões.
                    </div>
                  )}
                </div>
                <button onClick={() => setStep(1)} style={{
                  marginLeft: 'auto', padding: '5px 14px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', background: '#fff',
                  cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'inherit',
                }}>
                  ← Voltar e editar
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {questoesParsed.map((q, idx) => (
                  <div key={idx} style={{
                    background: '#fff', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        minWidth: 24, height: 24, borderRadius: '50%',
                        background: '#0e7490', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 800,
                      }}>{idx + 1}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>
                        {q.tipo}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#64748b', fontWeight: 700 }}>
                        {disciplina}
                      </span>
                      <button onClick={() => remover(idx)} style={{
                        marginLeft: 'auto', padding: '3px 10px', borderRadius: 6,
                        border: '1.5px solid #fca5a5', background: '#fef2f2',
                        color: '#dc2626', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'inherit',
                      }}>
                        🗑️ Remover
                      </button>
                    </div>

                    {/* Enunciado editável */}
                    <textarea
                      value={q.enunciado}
                      onChange={e => editar(idx, 'enunciado', e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1.5px solid #e2e8f0', fontSize: '0.82rem',
                        fontFamily: 'inherit', resize: 'vertical', minHeight: 60,
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* Alternativas */}
                    {q.alternativas.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {q.alternativas.map(alt => (
                          <div key={alt.letra} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '4px 8px', borderRadius: 6,
                            background: alt.correta ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${alt.correta ? '#86efac' : '#e2e8f0'}`,
                          }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: '50%',
                              background: alt.correta ? '#059669' : '#e2e8f0',
                              color: alt.correta ? '#fff' : '#64748b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', fontWeight: 800, flexShrink: 0,
                            }}>{alt.letra}</span>
                            <span style={{ fontSize: '0.78rem', color: '#334155', flex: 1 }}>{alt.texto}</span>
                            {alt.correta && (
                              <span style={{ fontSize: '0.64rem', color: '#059669', fontWeight: 700 }}>✓ GABARITO</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: Concluído ────────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>
                {erros.length === 0 ? '🎉' : '⚠️'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                {erros.length === 0
                  ? `${questoesParsed.length} questão(ões) importada(s) com sucesso!`
                  : `${questoesParsed.length - erros.length} importadas · ${erros.length} com erro`}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 24 }}>
                As questões já estão disponíveis no Banco de Questões.
              </div>
              {erros.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 12, marginBottom: 16, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.8rem', marginBottom: 6 }}>Erros:</div>
                  {erros.map((e, i) => <div key={i} style={{ fontSize: '0.74rem', color: '#7f1d1d' }}>{e}</div>)}
                </div>
              )}
              <button onClick={onClose} style={{
                padding: '10px 28px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #0e7490, #1d4ed8)',
                color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 800, fontFamily: 'inherit',
              }}>
                ✓ Fechar e ir ao banco
              </button>
            </div>
          )}

          {/* Barra de progresso ao salvar */}
          {salvando && (
            <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: '0.8rem', color: '#0e7490', fontWeight: 700, marginBottom: 8 }}>
                Salvando {progresso.feitas} de {progresso.total} questões...
              </div>
              <div style={{ height: 8, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{
                  width: `${progresso.total > 0 ? (progresso.feitas / progresso.total) * 100 : 0}%`,
                  height: '100%', borderRadius: 99,
                  background: 'linear-gradient(90deg, #0e7490, #1d4ed8)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#fafafa',
        }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            {step === 1 && 'Passo 1 de 3 — Cole o texto'}
            {step === 2 && `Passo 2 de 3 — Revise as ${questoesParsed.length} questões`}
            {step === 3 && 'Passo 3 de 3 — Concluído'}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              padding: '8px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0',
              background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.82rem', fontWeight: 700, color: '#64748b',
            }}>
              Cancelar
            </button>

            {step === 1 && (
              <button
                onClick={parsear}
                disabled={!texto.trim() || !disciplina}
                style={{
                  padding: '8px 22px', borderRadius: 8, border: 'none',
                  background: texto.trim() && disciplina ? 'linear-gradient(135deg, #0e7490, #1d4ed8)' : '#e2e8f0',
                  color: texto.trim() && disciplina ? '#fff' : '#94a3b8',
                  cursor: texto.trim() && disciplina ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 800,
                }}>
                🔍 Detectar questões →
              </button>
            )}

            {step === 2 && questoesParsed.length > 0 && (
              <button
                onClick={salvarTodas}
                disabled={salvando}
                style={{
                  padding: '8px 22px', borderRadius: 8, border: 'none',
                  background: salvando ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#fff', cursor: salvando ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 800,
                }}>
                {salvando ? `⏳ Salvando ${progresso.feitas}/${progresso.total}...` : `💾 Salvar ${questoesParsed.length} questões`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
