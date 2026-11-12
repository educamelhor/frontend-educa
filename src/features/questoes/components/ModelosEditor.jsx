// src/features/questoes/components/ModelosEditor.jsx
// Editores interativos especializados para TODOS os 7 modelos universais de questão EDUCA.STUDIO AI

import React, { useState } from 'react';
import api from '../../../services/api';
import TagsInput from './TagsInput';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/* ── Sub-bloco reutilizável de Alternativas A–E (com suporte a imagem por alternativa) ── */
function ListaAlternativasEditor({
  alternativas,
  onChangeAlternativas,
  onMarcarCorreta,
  onGerarDistratoresIA,
  gerandoDistratores,
  permitirImagem = true,
}) {
  const [uploadingAltId, setUploadingAltId] = useState(null);

  const setAlt = (id, field, val) => {
    onChangeAlternativas(alternativas.map(a => (a.id === id ? { ...a, [field]: val } : a)));
  };

  const addAlt = () => {
    if (alternativas.length >= 7) return;
    const letra = LETRAS[alternativas.length] || String.fromCharCode(65 + alternativas.length);
    onChangeAlternativas([...alternativas, { id: Date.now() + Math.random(), letra, texto: '', imagem_url: null, correta: false }]);
  };

  const removeAlt = (id) => {
    if (alternativas.length <= 2) return;
    const filtradas = alternativas.filter(a => a.id !== id).map((a, idx) => ({
      ...a,
      letra: LETRAS[idx] || String.fromCharCode(65 + idx),
    }));
    onChangeAlternativas(filtradas);
  };

  const uploadImgAlternativa = async (altId, file) => {
    if (!file) return;
    setUploadingAltId(altId);
    try {
      const fd = new FormData();
      fd.append('imagem', file);
      const { data } = await api.post('/api/questoes/upload-imagem', fd);
      setAlt(altId, 'imagem_url', data.url);
    } catch {
      alert('Falha ao enviar imagem da alternativa.');
    } finally {
      setUploadingAltId(null);
    }
  };

  return (
    <div>
      {onGerarDistratoresIA && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Dica: escreva e marque a alternativa correta e deixe a IA criar os 4 distratores!
          </span>
          <button
            type="button"
            onClick={onGerarDistratoresIA}
            disabled={gerandoDistratores}
            style={{
              padding: '5px 12px', borderRadius: 8, border: '1px solid #c4b5fd',
              background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
              color: '#6d28d9', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
            }}
          >
            {gerandoDistratores ? '⏳ Criando distratores...' : '✨ Gerar 4 Distratores com IA'}
          </button>
        </div>
      )}

      <div className="bq-alt-list">
        {alternativas.map((alt) => (
          <div key={alt.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className={`bq-alt-item${alt.correta ? ' correct' : ''}`}>
              <span className="bq-alt-letra">{alt.letra}</span>

              <input
                className="bq-alt-input"
                type="text"
                value={alt.texto}
                onChange={e => setAlt(alt.id, 'texto', e.target.value)}
                placeholder={`Texto da alternativa ${alt.letra} (aceita $LaTeX$)...`}
              />

              {permitirImagem && (
                <label
                  title="Adicionar imagem nesta alternativa"
                  style={{
                    cursor: 'pointer', padding: '4px 7px', borderRadius: 6,
                    background: alt.imagem_url ? '#e0f2fe' : '#f1f5f9',
                    color: alt.imagem_url ? '#0369a1' : '#64748b',
                    fontSize: '0.78rem', flexShrink: 0,
                  }}
                >
                  {uploadingAltId === alt.id ? '⏳' : '🖼️'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImgAlternativa(alt.id, f); e.target.value = ''; }}
                  />
                </label>
              )}

              <button
                type="button"
                className={`bq-alt-correct-btn${alt.correta ? ' active' : ''}`}
                onClick={() => onMarcarCorreta(alt.id)}
                title={alt.correta ? 'Alternativa correta' : 'Marcar como correta'}
              >
                {alt.correta && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className="bq-alt-remove-btn"
                onClick={() => removeAlt(alt.id)}
                title="Remover alternativa"
                disabled={alternativas.length <= 2}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {alt.imagem_url && (
              <div style={{ marginLeft: 38, display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={alt.imagem_url} alt={`Alt ${alt.letra}`} style={{ maxHeight: 72, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                <button
                  type="button"
                  onClick={() => setAlt(alt.id, 'imagem_url', null)}
                  style={{ fontSize: '0.7rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕ Remover imagem
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {alternativas.length < 7 && (
        <button type="button" className="bq-add-alt-btn" onClick={addAlt} style={{ marginTop: 8 }}>
          + Adicionar alternativa
        </button>
      )}
    </div>
  );
}

/* ── Componente Principal de Edição dos 7 Modelos ── */
export default function ModelosEditor({
  tipo,
  estrutura,
  onChangeEstrutura,
  alternativas,
  onChangeAlternativas,
  onMarcarCorreta,
  respostaAberta,
  onChangeRespostaAberta,
  enunciado,
  onChangeEnunciado,
  enunciadoRef,
  onGerarDistratoresIA,
  gerandoDistratores,
  onGerarEspelhoIA,
  gerandoEspelho,
}) {
  const est = estrutura || {};
  const patchEst = (partial) => onChangeEstrutura({ ...est, ...partial });

  /* ── 1) OBJETIVA (A–E) ── */
  if (tipo === 'objetiva') {
    return (
      <ListaAlternativasEditor
        alternativas={alternativas}
        onChangeAlternativas={onChangeAlternativas}
        onMarcarCorreta={onMarcarCorreta}
        onGerarDistratoresIA={onGerarDistratoresIA}
        gerandoDistratores={gerandoDistratores}
      />
    );
  }

  /* ── 2) AFIRMATIVAS (I, II, III, IV + Alternativas) ── */
  if (tipo === 'afirmativas') {
    const props = Array.isArray(est.proposicoes) ? est.proposicoes : [];

    const updateProp = (idx, field, val) => {
      const next = props.map((p, i) => (i === idx ? { ...p, [field]: val } : p));
      patchEst({ proposicoes: next });
    };

    const addProp = () => {
      if (props.length >= 6) return;
      const rom = ROMANOS[props.length] || String(props.length + 1);
      patchEst({ proposicoes: [...props, { id: Date.now(), romano: rom, texto: '', correta: false }] });
    };

    const removeProp = (idx) => {
      if (props.length <= 2) return;
      const next = props.filter((_, i) => i !== idx).map((p, i) => ({ ...p, romano: ROMANOS[i] || String(i + 1) }));
      patchEst({ proposicoes: next });
    };

    const formatarCombinacao = (romanosArr) => {
      if (romanosArr.length === 0) return 'Nenhuma das afirmativas está correta.';
      if (romanosArr.length === props.length) return `Todas as afirmativas (${romanosArr.join(', ')}) estão corretas.`;
      if (romanosArr.length === 1) return `Apenas ${romanosArr[0]}.`;
      const ult = romanosArr[romanosArr.length - 1];
      return `Apenas ${romanosArr.slice(0, -1).join(', ')} e ${ult}.`;
    };

    const gerarAlternativasAfirmativas = () => {
      const todos = props.map(p => p.romano);
      const certas = props.filter(p => p.correta).map(p => p.romano);
      const textoCorreto = formatarCombinacao(certas);

      // Gera combinações candidatas distintas da correta
      const candidatas = [];
      for (let mask = 1; mask < (1 << todos.length); mask++) {
        const comb = todos.filter((_, idx) => Boolean(mask & (1 << idx)));
        const txt = formatarCombinacao(comb);
        if (txt !== textoCorreto) candidatas.push(txt);
      }
      if (textoCorreto !== 'Nenhuma das afirmativas está correta.') {
        candidatas.push('Nenhuma das afirmativas está correta.');
      }

      const escolhidas = candidatas.slice(0, 4);
      const posCorreta = Math.min(2, escolhidas.length); // letra C por padrão
      escolhidas.splice(posCorreta, 0, textoCorreto);

      const novasAlts = escolhidas.slice(0, 5).map((txt, idx) => ({
        id: Date.now() + idx,
        letra: LETRAS[idx],
        texto: txt,
        imagem_url: null,
        correta: txt === textoCorreto,
      }));
      onChangeAlternativas(novasAlts);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="bq-label">Proposições em Algarismos Romanos (marque as verdadeiras)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {props.map((p, idx) => (
              <div key={p.id || idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 800, minWidth: 28, color: '#0f172a', fontSize: '0.85rem' }}>{p.romano}.</span>
                <input
                  className="bq-input"
                  style={{ flex: 1 }}
                  value={p.texto}
                  onChange={e => updateProp(idx, 'texto', e.target.value)}
                  placeholder={`Texto da proposição ${p.romano}...`}
                />
                <button
                  type="button"
                  onClick={() => updateProp(idx, 'correta', !p.correta)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: '0.73rem', fontWeight: 800, cursor: 'pointer',
                    border: `1.5px solid ${p.correta ? '#059669' : '#fca5a5'}`,
                    background: p.correta ? '#ecfdf5' : '#fef2f2',
                    color: p.correta ? '#059669' : '#dc2626',
                    minWidth: 68,
                  }}
                >
                  {p.correta ? '✓ Certa' : '✕ Falsa'}
                </button>
                {props.length > 2 && (
                  <button type="button" className="bq-alt-remove-btn" onClick={() => removeProp(idx)}>✕</button>
                )}
              </div>
            ))}
          </div>
          {props.length < 6 && (
            <button type="button" className="bq-add-alt-btn" onClick={addProp} style={{ marginTop: 6 }}>
              + Adicionar proposição ({ROMANOS[props.length]})
            </button>
          )}
        </div>

        <div className="bq-field">
          <label className="bq-label">Comando de fechamento (antes das alternativas)</label>
          <input
            className="bq-input"
            value={est.comando_fechamento ?? 'É correto apenas o que se afirma em:'}
            onChange={e => patchEst({ comando_fechamento: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
          <label className="bq-label" style={{ margin: 0 }}>Alternativas de Combinação (A–E)</label>
          <button
            type="button"
            onClick={gerarAlternativasAfirmativas}
            style={{
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #0e7490, #0284c7)',
              color: '#fff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
            }}
          >
            ⚡ Gerar Alternativas Automaticamente
          </button>
        </div>

        <ListaAlternativasEditor
          alternativas={alternativas}
          onChangeAlternativas={onChangeAlternativas}
          onMarcarCorreta={onMarcarCorreta}
          permitirImagem={false}
        />
      </div>
    );
  }

  /* ── 3) VERDADEIRO OU FALSO (Direto ou Sequência em A–E) ── */
  if (tipo === 'verdadeiro_falso') {
    const itens = Array.isArray(est.itens) ? est.itens : [];
    const submodo = est.submodo || 'direto';
    const rotulo = est.rotulo || 'VF';
    const posLabel = rotulo === 'CE' ? 'C' : 'V';
    const negLabel = rotulo === 'CE' ? 'E' : 'F';

    const setItem = (idx, field, val) => {
      patchEst({ itens: itens.map((it, i) => (i === idx ? { ...it, [field]: val } : it)) });
    };

    const addItem = () => {
      if (itens.length >= 8) return;
      patchEst({ itens: [...itens, { id: Date.now(), texto: '', gabarito: posLabel }] });
    };

    const removeItem = (idx) => {
      if (itens.length <= 2) return;
      patchEst({ itens: itens.filter((_, i) => i !== idx) });
    };

    const gerarSequenciasVF = () => {
      const seqCorreta = itens.map(i => i.gabarito || posLabel).join(' - ');
      const variantes = new Set();
      let tent = 0;
      while (variantes.size < 4 && tent < 40) {
        tent++;
        const mut = itens.map(i => (Math.random() > 0.5 ? posLabel : negLabel)).join(' - ');
        if (mut !== seqCorreta) variantes.add(mut);
      }
      const lista = [...variantes];
      lista.splice(1, 0, seqCorreta);
      onChangeAlternativas(lista.slice(0, 5).map((txt, idx) => ({
        id: Date.now() + idx,
        letra: LETRAS[idx],
        texto: txt,
        imagem_url: null,
        correta: txt === seqCorreta,
      })));
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Modo na Prova</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[
                { k: 'direto', l: '(   ) Marcação Direta nos itens' },
                { k: 'sequencia', l: '🔘 Sequência nas Alternativas A–E' },
              ].map(m => (
                <button
                  key={m.k}
                  type="button"
                  onClick={() => patchEst({ submodo: m.k })}
                  style={{
                    padding: '5px 10px', borderRadius: 7, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                    border: `1.5px solid ${submodo === m.k ? '#0e7490' : '#cbd5e1'}`,
                    background: submodo === m.k ? '#ecfeff' : '#fff',
                    color: submodo === m.k ? '#0e7490' : '#475569',
                  }}
                >{m.l}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Nomenclatura</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[
                { k: 'VF', l: 'V / F' },
                { k: 'CE', l: 'C / E (Estilo Cebraspe/PAS)' },
              ].map(r => (
                <button
                  key={r.k}
                  type="button"
                  onClick={() => {
                    const p = r.k === 'CE' ? 'C' : 'V';
                    const n = r.k === 'CE' ? 'E' : 'F';
                    patchEst({
                      rotulo: r.k,
                      itens: itens.map(i => ({ ...i, gabarito: ['V', 'C'].includes(i.gabarito) ? p : n })),
                    });
                  }}
                  style={{
                    padding: '5px 10px', borderRadius: 7, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                    border: `1.5px solid ${rotulo === r.k ? '#0e7490' : '#cbd5e1'}`,
                    background: rotulo === r.k ? '#ecfeff' : '#fff',
                    color: rotulo === r.k ? '#0e7490' : '#475569',
                  }}
                >{r.l}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {itens.map((it, idx) => {
            const isPos = ['V', 'C'].includes(it.gabarito);
            return (
              <div key={it.id || idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setItem(idx, 'gabarito', isPos ? negLabel : posLabel)}
                  title="Clique para alternar o gabarito deste item"
                  style={{
                    width: 42, height: 34, borderRadius: 8, fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                    border: `1.5px solid ${isPos ? '#059669' : '#dc2626'}`,
                    background: isPos ? '#ecfdf5' : '#fef2f2',
                    color: isPos ? '#059669' : '#dc2626',
                    flexShrink: 0,
                  }}
                >
                  {it.gabarito || posLabel}
                </button>
                <input
                  className="bq-input"
                  style={{ flex: 1 }}
                  value={it.texto}
                  onChange={e => setItem(idx, 'texto', e.target.value)}
                  placeholder={`Afirmativa ${idx + 1}...`}
                />
                {itens.length > 2 && (
                  <button type="button" className="bq-alt-remove-btn" onClick={() => removeItem(idx)}>✕</button>
                )}
              </div>
            );
          })}
        </div>

        {itens.length < 8 && (
          <button type="button" className="bq-add-alt-btn" onClick={addItem}>+ Adicionar assertiva</button>
        )}

        {submodo === 'direto' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(est.exigir_justificativa_falsas)}
                onChange={e => patchEst({ exigir_justificativa_falsas: e.target.checked })}
              />
              Imprimir linhas pedindo justificativa das afirmativas falsas
            </label>
            {est.exigir_justificativa_falsas && (
              <select
                className="bq-select"
                style={{ width: 110, padding: '4px 8px', fontSize: '0.78rem' }}
                value={est.linhas_justificativa || 3}
                onChange={e => patchEst({ linhas_justificativa: Number(e.target.value) })}
              >
                {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} linhas</option>)}
              </select>
            )}
          </div>
        ) : (
          <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="bq-label" style={{ margin: 0 }}>Alternativas de Sequência (A–E)</label>
              <button
                type="button"
                onClick={gerarSequenciasVF}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#0e7490', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ⚡ Gerar Sequências A–E
              </button>
            </div>
            <ListaAlternativasEditor
              alternativas={alternativas}
              onChangeAlternativas={onChangeAlternativas}
              onMarcarCorreta={onMarcarCorreta}
              permitirImagem={false}
            />
          </div>
        )}
      </div>
    );
  }

  /* ── 4) ASSOCIAÇÃO DE COLUNAS (Coluna A × Coluna B) ── */
  if (tipo === 'associacao') {
    const colA = Array.isArray(est.coluna_a) ? est.coluna_a : [];
    const colB = Array.isArray(est.coluna_b) ? est.coluna_b : [];
    const submodo = est.submodo || 'direto';

    const setA = (idx, texto) => {
      patchEst({ coluna_a: colA.map((c, i) => (i === idx ? { ...c, texto } : c)) });
    };
    const addA = () => {
      if (colA.length >= 7) return;
      const codigo = String(colA.length + 1);
      patchEst({ coluna_a: [...colA, { id: Date.now(), codigo, texto: '' }] });
    };
    const removeA = (idx) => {
      if (colA.length <= 2) return;
      patchEst({
        coluna_a: colA.filter((_, i) => i !== idx).map((c, i) => ({ ...c, codigo: String(i + 1) })),
      });
    };

    const setB = (idx, field, val) => {
      patchEst({ coluna_b: colB.map((c, i) => (i === idx ? { ...c, [field]: val } : c)) });
    };
    const addB = () => {
      if (colB.length >= 8) return;
      patchEst({ coluna_b: [...colB, { id: Date.now(), texto: '', vinculo_codigo: colA[0]?.codigo || '1' }] });
    };
    const removeB = (idx) => {
      if (colB.length <= 2) return;
      patchEst({ coluna_b: colB.filter((_, i) => i !== idx) });
    };

    const gerarSequenciasAssoc = () => {
      const seqCorreta = colB.map(b => b.vinculo_codigo || '-').join(' - ');
      const codigos = colA.map(a => a.codigo);
      const vars = new Set();
      let t = 0;
      while (vars.size < 4 && t < 40 && codigos.length >= 2) {
        t++;
        const emb = [...colB.map(b => b.vinculo_codigo || codigos[0])].sort(() => Math.random() - 0.5).join(' - ');
        if (emb !== seqCorreta) vars.add(emb);
      }
      const lista = [...vars];
      lista.splice(1, 0, seqCorreta);
      onChangeAlternativas(lista.slice(0, 5).map((txt, idx) => ({
        id: Date.now() + idx,
        letra: LETRAS[idx],
        texto: txt,
        imagem_url: null,
        correta: txt === seqCorreta,
      })));
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { k: 'direto', l: '(   ) Numeração Direta na Coluna B' },
            { k: 'sequencia', l: '🔘 Sequência nas Alternativas A–E' },
          ].map(m => (
            <button
              key={m.k}
              type="button"
              onClick={() => patchEst({ submodo: m.k })}
              style={{
                padding: '5px 10px', borderRadius: 7, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${submodo === m.k ? '#0e7490' : '#cbd5e1'}`,
                background: submodo === m.k ? '#ecfeff' : '#fff',
                color: submodo === m.k ? '#0e7490' : '#475569',
              }}
            >{m.l}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 12 }}>
          {/* Coluna A */}
          <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <input
              className="bq-input"
              style={{ fontWeight: 800, marginBottom: 8, fontSize: '0.8rem' }}
              value={est.titulo_coluna_a ?? 'Coluna A'}
              onChange={e => patchEst({ titulo_coluna_a: e.target.value })}
            />
            {colA.map((a, i) => (
              <div key={a.id || i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0e7490', minWidth: 24 }}>({a.codigo})</span>
                <input
                  className="bq-input"
                  style={{ flex: 1, fontSize: '0.82rem' }}
                  value={a.texto}
                  onChange={e => setA(i, e.target.value)}
                  placeholder={`Item ${a.codigo}...`}
                />
                {colA.length > 2 && <button type="button" className="bq-alt-remove-btn" onClick={() => removeA(i)}>✕</button>}
              </div>
            ))}
            <button type="button" className="bq-add-alt-btn" onClick={addA}>+ Item Coluna A</button>
          </div>

          {/* Coluna B */}
          <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <input
              className="bq-input"
              style={{ fontWeight: 800, marginBottom: 8, fontSize: '0.8rem' }}
              value={est.titulo_coluna_b ?? 'Coluna B'}
              onChange={e => patchEst({ titulo_coluna_b: e.target.value })}
            />
            {colB.map((b, i) => (
              <div key={b.id || i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <select
                  className="bq-select"
                  title="Par correto da Coluna A"
                  style={{ width: 64, padding: '5px 4px', fontWeight: 800, color: '#059669', fontSize: '0.8rem' }}
                  value={b.vinculo_codigo || ''}
                  onChange={e => setB(i, 'vinculo_codigo', e.target.value)}
                >
                  <option value="">—</option>
                  {colA.map(a => <option key={a.codigo} value={a.codigo}>({a.codigo})</option>)}
                </select>
                <input
                  className="bq-input"
                  style={{ flex: 1, fontSize: '0.82rem' }}
                  value={b.texto}
                  onChange={e => setB(i, 'texto', e.target.value)}
                  placeholder="Descrição correspondente..."
                />
                {colB.length > 2 && <button type="button" className="bq-alt-remove-btn" onClick={() => removeB(i)}>✕</button>}
              </div>
            ))}
            <button type="button" className="bq-add-alt-btn" onClick={addB}>+ Item Coluna B</button>
          </div>
        </div>

        {submodo === 'sequencia' && (
          <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="bq-label" style={{ margin: 0 }}>Alternativas de Sequência (de cima p/ baixo)</label>
              <button
                type="button"
                onClick={gerarSequenciasAssoc}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#0e7490', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ⚡ Gerar Sequências A–E
              </button>
            </div>
            <ListaAlternativasEditor
              alternativas={alternativas}
              onChangeAlternativas={onChangeAlternativas}
              onMarcarCorreta={onMarcarCorreta}
              permitirImagem={false}
            />
          </div>
        )}
      </div>
    );
  }

  /* ── 5) COMPLETAR LACUNAS ({{resposta}}) ── */
  if (tipo === 'lacuna') {
    const submodo = est.submodo || 'direto';
    const matches = [...String(enunciado || '').matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim()).filter(Boolean);

    const criarLacunaDaSelecao = () => {
      const el = enunciadoRef?.current;
      if (el && el.selectionStart !== el.selectionEnd) {
        const s = el.selectionStart;
        const e = el.selectionEnd;
        const sel = enunciado.slice(s, e).trim();
        if (sel) {
          const novoTexto = `${enunciado.slice(0, s)}{{${sel}}}${enunciado.slice(e)}`;
          onChangeEnunciado(novoTexto);
          const novasLacunas = [...String(novoTexto).matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim());
          patchEst({ lacunas: novasLacunas });
          return;
        }
      }
      const novo = `${enunciado}${enunciado && !enunciado.endsWith(' ') ? ' ' : ''}{{resposta}}`;
      onChangeEnunciado(novo);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          padding: '10px 12px', borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#0c4a6e' }}>
            💡 Selecione uma palavra no <strong>Enunciado acima</strong> e clique ao lado, ou escreva entre chaves duplas: <code>{'{{mitocôndria}}'}</code>
          </div>
          <button
            type="button"
            onClick={criarLacunaDaSelecao}
            style={{
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: '#0284c7', color: '#fff', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer',
            }}
          >
            [ ___ ] Criar Lacuna da Seleção
          </button>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 5 }}>
            LACUNAS DETECTADAS ({matches.length}):
          </div>
          {matches.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
              Nenhuma lacuna marcada ainda no enunciado.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {matches.map((m, idx) => (
                <span key={idx} style={{ padding: '3px 10px', borderRadius: 99, background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', fontSize: '0.76rem', fontWeight: 700 }}>
                  #{idx + 1}: {m}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="bq-label">Formato das Lacunas na Prova</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { k: 'direto', l: '✍️ Lacuna Aberta (________)' },
              { k: 'banco_palavras', l: '📦 Caixa com Banco de Palavras' },
              { k: 'alternativas', l: '🔘 Alternativas A–E ("respectivamente")' },
            ].map(m => (
              <button
                key={m.k}
                type="button"
                onClick={() => patchEst({ submodo: m.k, lacunas: matches })}
                style={{
                  padding: '5px 11px', borderRadius: 7, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${submodo === m.k ? '#0e7490' : '#cbd5e1'}`,
                  background: submodo === m.k ? '#ecfeff' : '#fff',
                  color: submodo === m.k ? '#0e7490' : '#475569',
                }}
              >{m.l}</button>
            ))}
          </div>
        </div>

        {submodo === 'banco_palavras' && (
          <div className="bq-field">
            <label className="bq-label">Palavras Distratoras Extras no Banco de Palavras (opcional)</label>
            <TagsInput
              tags={est.distratores_banco || []}
              onChange={(vals) => patchEst({ distratores_banco: vals, lacunas: matches })}
              placeholder="Digite palavras extras p/ confundir e pressione Enter..."
            />
          </div>
        )}

        {submodo === 'alternativas' && (
          <ListaAlternativasEditor
            alternativas={alternativas}
            onChangeAlternativas={onChangeAlternativas}
            onMarcarCorreta={onMarcarCorreta}
            permitirImagem={false}
          />
        )}
      </div>
    );
  }

  /* ── 6) SOMATÓRIA (01, 02, 04, 08, 16, 32) ── */
  if (tipo === 'somatoria') {
    const props = Array.isArray(est.proposicoes) ? est.proposicoes : [];
    const soma = props.reduce((acc, p) => acc + (p.correta ? Number(p.valor) : 0), 0);

    const setSom = (idx, field, val) => {
      const next = props.map((p, i) => (i === idx ? { ...p, [field]: val } : p));
      const novaSoma = next.reduce((acc, p) => acc + (p.correta ? Number(p.valor) : 0), 0);
      patchEst({ proposicoes: next, soma_correta: novaSoma });
    };

    const addSom = () => {
      if (props.length >= 7) return;
      const valor = 1 << props.length;
      const next = [...props, { valor, codigo: String(valor).padStart(2, '0'), texto: '', correta: false }];
      patchEst({ proposicoes: next, soma_correta: soma });
    };

    const removeSom = (idx) => {
      if (props.length <= 3) return;
      const next = props.filter((_, i) => i !== idx).map((p, i) => {
        const valor = 1 << i;
        return { ...p, valor, codigo: String(valor).padStart(2, '0') };
      });
      const novaSoma = next.reduce((acc, p) => acc + (p.correta ? Number(p.valor) : 0), 0);
      patchEst({ proposicoes: next, soma_correta: novaSoma });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', borderRadius: 10, background: '#0f172a', color: '#fff',
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            ➕ Marque as proposições verdadeiras — a soma é calculada automaticamente:
          </span>
          <span style={{
            padding: '4px 14px', borderRadius: 8, background: '#10b981', color: '#022c22',
            fontWeight: 900, fontSize: '1rem', fontFamily: 'monospace',
          }}>
            SOMA = {String(soma).padStart(2, '0')}
          </span>
        </div>

        {props.map((p, idx) => (
          <div key={p.valor || idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSom(idx, 'correta', !p.correta)}
              style={{
                width: 46, height: 34, borderRadius: 8, fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer',
                border: `1.5px solid ${p.correta ? '#059669' : '#cbd5e1'}`,
                background: p.correta ? '#059669' : '#f8fafc',
                color: p.correta ? '#fff' : '#475569',
              }}
            >
              {p.codigo}
            </button>
            <input
              className="bq-input"
              style={{ flex: 1 }}
              value={p.texto}
              onChange={e => setSom(idx, 'texto', e.target.value)}
              placeholder={`Proposição (${p.codigo})...`}
            />
            {props.length > 3 && <button type="button" className="bq-alt-remove-btn" onClick={() => removeSom(idx)}>✕</button>}
          </div>
        ))}

        {props.length < 7 && (
          <button type="button" className="bq-add-alt-btn" onClick={addSom}>
            + Adicionar proposição ({String(1 << props.length).padStart(2, '0')})
          </button>
        )}
      </div>
    );
  }

  /* ── 7) DISCURSIVA / ABERTA ── */
  const formato = est.formato_espaco || 'linhas';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="bq-label">Espaço de Resposta Impresso na Prova</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { k: 'linhas', l: '📝 Linhas Pautadas' },
              { k: 'quadro_calculo', l: '📐 Quadro em Branco (Cálculo / Desenho)' },
              { k: 'nenhum', l: '🚫 Sem espaço' },
            ].map(f => (
              <button
                key={f.k}
                type="button"
                onClick={() => patchEst({ formato_espaco: f.k })}
                style={{
                  padding: '5px 11px', borderRadius: 7, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${formato === f.k ? '#0e7490' : '#cbd5e1'}`,
                  background: formato === f.k ? '#ecfeff' : '#fff',
                  color: formato === f.k ? '#0e7490' : '#475569',
                }}
              >{f.l}</button>
            ))}
          </div>
        </div>

        {formato === 'linhas' && (
          <div>
            <label className="bq-label">Nº de Linhas</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[3, 5, 8, 12, 15].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => patchEst({ linhas_resposta: n })}
                  style={{
                    padding: '5px 9px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer',
                    border: `1.5px solid ${(est.linhas_resposta || 6) === n ? '#0284c7' : '#cbd5e1'}`,
                    background: (est.linhas_resposta || 6) === n ? '#0284c7' : '#fff',
                    color: (est.linhas_resposta || 6) === n ? '#fff' : '#475569',
                  }}
                >{n}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bq-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label className="bq-label" style={{ margin: 0 }}>Espelho Oficial de Correção / Resposta Esperada</label>
          {onGerarEspelhoIA && (
            <button
              type="button"
              onClick={onGerarEspelhoIA}
              disabled={gerandoEspelho}
              style={{
                padding: '4px 10px', borderRadius: 7, border: '1px solid #c4b5fd',
                background: '#f5f3ff', color: '#6d28d9', fontSize: '0.73rem', fontWeight: 800, cursor: 'pointer',
              }}
            >
              {gerandoEspelho ? '⏳ Gerando...' : '✨ Sugerir Espelho com IA'}
            </button>
          )}
        </div>
        <textarea
          className="bq-textarea"
          value={respostaAberta}
          onChange={e => onChangeRespostaAberta(e.target.value)}
          placeholder="Critérios objetivos de pontuação e resposta esperada (visível apenas no gabarito do professor)..."
        />
      </div>
    </div>
  );
}
