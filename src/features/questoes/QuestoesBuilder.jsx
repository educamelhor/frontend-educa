// src/features/questoes/QuestoesBuilder.jsx
// 🧩 Construtor de Questões — Puzzle Builder

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import TagsInput from './components/TagsInput';
import ImageUploader from './components/ImageUploader';
import LatexPreview, { gerarLatex } from './components/LatexPreview';
import ImagemParaQuestaoModal from './components/ImagemParaQuestaoModal';
import PublicarResultadoModal from './components/PublicarResultadoModal';
import ComentarioCorretaModal from './components/ComentarioCorretaModal';

/* ── Constantes ─────────────────────────────────────────── */
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

const TIPOS = [
  { value: 'objetiva',        label: 'Objetiva (A–E)', emoji: '🔘' },
  { value: 'discursiva',      label: 'Discursiva',     emoji: '✏️' },
  { value: 'verdadeiro_falso',label: 'V / F',          emoji: '⚖️' },
  { value: 'associacao',      label: 'Associação',     emoji: '🔗' },
  { value: 'lacuna',          label: 'Preencher Lacuna', emoji: '📝' },
];

const NIVEIS = [
  { value: 'facil',   label: '⭐ Fácil'   },
  { value: 'medio',   label: '⭐⭐ Médio'  },
  { value: 'dificil', label: '⭐⭐⭐ Difícil' },
  { value: 'enem',    label: '🏆 ENEM'   },
];

const SERIES = [
  '6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF',
  '1º EM', '2º EM', '3º EM', 'Ensino Superior',
];

const DISCIPLINAS = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Artes', 'Educação Física', 'Biologia', 'Física',
  'Química', 'Sociologia', 'Filosofia', 'Redação', 'PD',
];

const TEXTO_APOIO_FONTES = [
  'ENEM 2023', 'ENEM 2022', 'ENEM 2021', 'SAEB', 'PISA',
  'SEEDF', 'Própria', 'Adaptada de livro didático',
];

const mkAlt = (letra) => ({ id: Date.now() + Math.random(), letra, texto: '', correta: false });

const INITIAL_STATE = {
  disciplina: '',
  tipo: 'objetiva',
  nivel: 'medio',
  serie: '',
  enunciado: '',
  texto_apoio: '',
  fonte: '',
  alternativas: LETRAS.map(mkAlt),
  resposta_aberta: '',
  habilidade_bncc: '',
  explicacao: '',
  tags: [],
  temas: [],          // Temas/conteúdos para o banco global
  imagem: null,
  compartilhada: false,
};

/* ── Bloco colapsável ────────────────────────────────────── */
function Block({ num, title, subtitle, open, onToggle, children }) {
  return (
    <div className={`bq-block${open ? ' bq-block--open' : ''}`}>
      <div className="bq-block-header" onClick={onToggle}>
        <span className="bq-block-num">{num}</span>
        <div style={{ flex: 1 }}>
          <div className="bq-block-title">{title}</div>
          {subtitle && <div className="bq-block-subtitle">{subtitle}</div>}
        </div>
        <svg className={`bq-block-chevron${open ? ' open' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && <div className="bq-block-body">{children}</div>}
    </div>
  );
}

/* ── Componente principal ────────────────────────────────── */
export default function QuestoesBuilder({ editingQuestao, onSaved, onCancel }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [openBlocks, setOpenBlocks] = useState({ 1: true, 2: true, 3: true, 4: false });
  const [saving, setSaving] = useState(false);
  const [modalResultado, setModalResultado] = useState(null);
  const [showImagemModal, setShowImagemModal] = useState(false);
  // Modal de justificativa da alternativa correta
  const [showComentarioModal, setShowComentarioModal]   = useState(false);
  const [altCorretaInfoModal, setAltCorretaInfoModal]   = useState(null); // { id, letra, texto }
  // Rastreia ID de rascunho salvo mas ainda não publicado no banco global
  const [savedDraftId, setSavedDraftId] = useState(null);

  /* Popula formulário no modo edição */
  useEffect(() => {
    if (editingQuestao) {
      let alts = LETRAS.map(mkAlt);
      try { alts = JSON.parse(editingQuestao.alternativas_json || '[]'); } catch {}
      // Normaliza alternativas: garante ao menos 5
      while (alts.length < 2) alts.push(mkAlt(LETRAS[alts.length]));

      let tagsArr = [];
      try {
        const raw = editingQuestao.tags;
        tagsArr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',').map(t => t.trim()).filter(Boolean) : []);
      } catch {}

      let temasArr = [];
      try {
        const rawT = editingQuestao.temas;
        temasArr = Array.isArray(rawT) ? rawT
          : (typeof rawT === 'string' ? JSON.parse(rawT) : []);
      } catch {}

      setForm({
        disciplina:   editingQuestao.disciplina || '',
        tipo:         editingQuestao.tipo || 'objetiva',
        nivel:        editingQuestao.nivel || 'medio',
        serie:        editingQuestao.serie || '',
        enunciado:    editingQuestao.conteudo_bruto || '',
        texto_apoio:  editingQuestao.texto_apoio || '',
        fonte:        editingQuestao.fonte || '',
        alternativas: alts,
        resposta_aberta: editingQuestao.resposta_aberta || '',
        habilidade_bncc: editingQuestao.habilidade_bncc || '',
        explicacao:   editingQuestao.explicacao || '',
        tags:         tagsArr,
        temas:        temasArr,
        imagem:       editingQuestao.imagem_base64 || null,
        compartilhada: editingQuestao.compartilhada || false,
      });
      setOpenBlocks({ 1: true, 2: true, 3: true, 4: false });
    } else {
      setForm(INITIAL_STATE);
    }
  }, [editingQuestao]);

  // Guarda de navegação: avisa ao fechar o browser com rascunho pendente
  useEffect(() => {
    if (!savedDraftId) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Você tem uma questão salva como rascunho que ainda não foi publicada.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [savedDraftId]);

  const toggle = (n) => setOpenBlocks(p => ({ ...p, [n]: !p[n] }));
  const set    = (field, val) => setForm(p => ({ ...p, [field]: val }));
  const setAlt = (id, field, val) =>
    setForm(p => ({
      ...p,
      alternativas: p.alternativas.map(a => a.id === id ? { ...a, [field]: val } : a),
    }));

  // ── Preenche form com dados extraídos pelo Gemini ──────────────────────
  const handleUsarExtracao = (dados) => {
    setForm(prev => ({
      ...prev,
      enunciado:    dados.enunciado   || prev.enunciado,
      fonte:        dados.fonte       || prev.fonte,
      tipo:         dados.tipo        || prev.tipo,
      alternativas: dados.alternativas && dados.alternativas.length >= 2
        ? dados.alternativas
        : prev.alternativas,
    }));
    setOpenBlocks({ 1: true, 2: true, 3: true, 4: false });
    setModalResultado({
      tipo: 'success',
      titulo: 'Imagem importada com sucesso!',
      mensagem: '✨ O enunciado e as alternativas foram preenchidos automaticamente. Revise os dados antes de publicar.',
    });
  };

  const marcarCorreta = (id) => {
    // 1. Marca a alternativa como correta no form
    setForm(p => ({
      ...p,
      alternativas: p.alternativas.map(a => ({ ...a, correta: a.id === id })),
    }));
    // 2. Abre modal premium pedindo justificativa
    const alt = form.alternativas.find(a => a.id === id);
    if (alt) {
      setAltCorretaInfoModal({ id, letra: alt.letra, texto: alt.texto });
      setShowComentarioModal(true);
    }
  };

  const addAlt = () => {
    if (form.alternativas.length >= 7) return;
    const proxLetra = LETRAS[form.alternativas.length] || String.fromCharCode(65 + form.alternativas.length);
    setForm(p => ({
      ...p,
      alternativas: [...p.alternativas, mkAlt(proxLetra)],
    }));
  };

  const removeAlt = (id) => {
    if (form.alternativas.length <= 2) return;
    setForm(p => ({
      ...p,
      alternativas: p.alternativas.filter(a => a.id !== id),
    }));
  };

  /* Validação — tipo, nível e temas agora são obrigatórios */
  const validar = () => {
    if (!form.disciplina)         return 'Selecione a disciplina.';
    if (!form.tipo)               return 'Selecione o tipo de questão.';
    if (!form.nivel)              return 'Selecione o nível de dificuldade.';
    if (!form.temas || form.temas.length === 0)
                                  return 'Adicione ao menos 1 tema/conteúdo.';
    if (!form.enunciado.trim())   return 'O enunciado é obrigatório.';
    if (form.tipo === 'objetiva') {
      const preenchidas = form.alternativas.filter(a => a.texto.trim());
      if (preenchidas.length < 2) return 'Adicione ao menos 2 alternativas.';
      if (!form.alternativas.some(a => a.correta)) return 'Marque a alternativa correta.';
    }
    return null;
  };

  /* Monta payload para API */
  const buildPayload = (status) => {
    const correta = form.alternativas.find(a => a.correta);
    const latex = gerarLatex(form);
    return {
      conteudo_bruto:    form.enunciado,
      latex_formatado:   latex,
      tipo:              form.tipo,
      nivel:             form.nivel,
      serie:             form.serie,
      disciplina:        form.disciplina,
      habilidade_bncc:   form.habilidade_bncc,
      texto_apoio:       form.texto_apoio,
      fonte:             form.fonte,
      alternativas_json: JSON.stringify(form.alternativas.filter(a => a.texto.trim())),
      correta:           correta?.letra || null,
      resposta_aberta:   form.resposta_aberta,
      tags:              form.tags.join(','),
      temas:             form.temas.length > 0 ? JSON.stringify(form.temas) : null,
      imagem_base64:     form.imagem || null,
      explicacao:        form.explicacao,
      compartilhada:     form.compartilhada ? 1 : 0,
      status,
    };
  };

  /* Limpar tela com confirmação se há rascunho pendente */
  const handleLimpar = () => {
    if (savedDraftId) {
      setModalResultado({
        tipo: 'warning',
        titulo: 'Rascunho não publicado',
        mensagem: 'Você tem uma questão salva como rascunho que ainda não foi publicada no Banco Global. Deseja publicar antes de limpar?',
        acoes: [
          { label: '🌐 Publicar Agora', primary: true, onClick: () => { setModalResultado(null); handlePublicar(); } },
          { label: 'Descartar Rascunho', onClick: () => { setModalResultado(null); setSavedDraftId(null); setForm(INITIAL_STATE); } },
          { label: 'Cancelar', onClick: () => setModalResultado(null) },
        ],
      });
    } else {
      setForm(INITIAL_STATE);
      setSavedDraftId(null);
    }
  };

  /* Salvar no banco (rascunho ou ativa) */
  const handlePublicar = async () => {
    const erro = validar();
    if (erro) { setModalResultado({ tipo: 'error', titulo: 'Campo obrigatório', mensagem: erro }); return; }
    setSaving(true);
    try {
      let questaoId;
      const draftId = savedDraftId || (editingQuestao?.id);
      if (draftId) {
        await api.put(`/api/questoes/${draftId}`, buildPayload('ativa'));
        questaoId = draftId;
      } else {
        const { data } = await api.post('/api/questoes', buildPayload('ativa'));
        questaoId = data.id;
      }
      setSavedDraftId(null);
      setModalResultado({
        tipo: 'success',
        titulo: editingQuestao ? 'Questão Atualizada!' : 'Questão Publicada!',
        mensagem: editingQuestao
          ? 'As alterações foram salvas com sucesso.'
          : 'Sua questão foi salva e está disponível no Banco Global. Qualquer escola pode visualizá-la!',
        acoes: [
          {
            label: '➕ Nova Questão', primary: true,
            onClick: () => {
              setModalResultado(null);
              setForm(INITIAL_STATE);
              setSavedDraftId(null);
              onSaved?.();
            },
          },
          { label: 'Fechar', onClick: () => setModalResultado(null) },
        ],
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erro ao publicar.';
      setModalResultado({ tipo: 'error', titulo: 'Erro ao Salvar', mensagem: msg });
    } finally {
      setSaving(false);
    }
  };

  /* Salvar como Rascunho — mantém formulário preenchido */
  const handleSaveRascunho = async () => {
    if (!form.enunciado.trim()) {
      setModalResultado({ tipo: 'error', titulo: 'Atenção', mensagem: 'Preencha ao menos o enunciado antes de salvar.' });
      return;
    }
    setSaving(true);
    try {
      let questaoId;
      const draftId = savedDraftId || (editingQuestao?.id);
      if (draftId) {
        await api.put(`/api/questoes/${draftId}`, buildPayload('rascunho'));
        questaoId = draftId;
      } else {
        const { data } = await api.post('/api/questoes', buildPayload('rascunho'));
        questaoId = data.id;
        setSavedDraftId(questaoId); // marca como rascunho pendente
      }
      setModalResultado({
        tipo: 'success',
        titulo: 'Rascunho Salvo!',
        mensagem: 'Questão salva como rascunho. Continue editando e publique no banco global quando estiver pronta.',
        acoes: [
          { label: '🌐 Publicar Agora', primary: true, onClick: () => { setModalResultado(null); handlePublicar(); } },
          { label: 'Continuar Editando', onClick: () => setModalResultado(null) },
        ],
      });
      // Não reseta form, não chama onSaved
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erro ao salvar rascunho.';
      setModalResultado({ tipo: 'error', titulo: 'Erro ao Salvar', mensagem: msg });
    } finally {
      setSaving(false);
    }
  };

  // Compat: mantém handleSave para uso legado interno
  const handleSave = (status) => status === 'rascunho' ? handleSaveRascunho() : handlePublicar();

  const isEditing = !!editingQuestao;

  return (
    <div className="bq-builder">
      {/* ── Coluna esquerda: formulário ── */}
      <div className="bq-builder-form">

        {/* Banner de rascunho pendente */}
        {savedDraftId && !isEditing && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(90deg, #78350f, #92400e)',
            color: '#fff', borderRadius: 10, padding: '10px 14px',
            marginBottom: 12, fontSize: '0.85rem', fontWeight: 600,
            boxShadow: '0 2px 8px rgba(120,53,15,0.35)',
          }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <span style={{ flex: 1 }}>
              Rascunho salvo (ID #{savedDraftId}) — questão ainda não publicada no Banco Global.
            </span>
            <button
              onClick={() => handlePublicar()}
              disabled={saving}
              style={{
                background: '#f59e0b', color: '#1c1917', border: 'none',
                borderRadius: 8, padding: '5px 14px', fontWeight: 700,
                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? 'Publicando...' : '🌐 Publicar Agora'}
            </button>
          </div>
        )}
        {/* Título da ação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {isEditing ? `✏️ Editando Questão #${editingQuestao.id}` : '🧩 Nova Questão'}
          </h2>
          {isEditing && (
            <button className="bq-btn bq-btn-ghost" onClick={onCancel} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
              ← Cancelar edição
            </button>
          )}
          {/* Botão Gemini Vision */}
          {!isEditing && (
            <button
              type="button"
              onClick={() => setShowImagemModal(true)}
              style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #0e7490, #0369a1)',
                color: '#fff', border: 'none', borderRadius: 9,
                padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(14,116,144,0.3)',
              }}
            >
              📷 Importar da Imagem
            </button>
          )}
        </div>

        {/* ══ BLOCO 1 — Classificação ══ */}
        <Block
          num="①"
          title="Classificação"
          subtitle="Disciplina, tema, tipo, nível e série"
          open={openBlocks[1]}
          onToggle={() => toggle(1)}
        >
          {/* Disciplina + Série */}
          <div className="bq-field-row">
            <div className="bq-field">
              <label className="bq-label">Disciplina <span className="required">*</span></label>
              <select className="bq-select" value={form.disciplina} onChange={e => set('disciplina', e.target.value)}>
                <option value="">— Selecione —</option>
                {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="bq-field">
              <label className="bq-label">Série / Ano</label>
              <select className="bq-select" value={form.serie} onChange={e => set('serie', e.target.value)}>
                <option value="">— Todas —</option>
                {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Tema / Conteúdo — obrigatório */}
          <div className="bq-field" style={{ marginBottom: 12 }}>
            <label className="bq-label">
              Tema / Conteúdo <span className="required">*</span>
              <span style={{
                fontSize: '0.7rem', color: '#059669', fontWeight: 600,
                marginLeft: 8, background: '#f0fdf4', padding: '1px 7px',
                borderRadius: 99, letterSpacing: '0.01em',
              }}>para busca no banco global</span>
            </label>
            <TagsInput
              tags={form.temas}
              onChange={(val) => set('temas', val)}
              placeholder="Ex: Fotossíntese, Célula... pressione Enter para adicionar"
            />
            <p className="bq-helper">Adicione os temas/conteúdos desta questão. Pressione Enter para confirmar cada tema.</p>
          </div>

          {/* Tipo */}
          <div className="bq-field" style={{ marginBottom: 12 }}>
            <label className="bq-label">Tipo de Questão <span className="required">*</span></label>
            <div className="bq-tipo-pills">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  className={`bq-tipo-pill${form.tipo === t.value ? ' selected' : ''}`}
                  onClick={() => set('tipo', t.value)}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nível */}
          <div className="bq-field">
            <label className="bq-label">Nível de Dificuldade <span className="required">*</span></label>
            <div className="bq-nivel-pills">
              {NIVEIS.map(n => (
                <button
                  key={n.value}
                  type="button"
                  className={`bq-nivel-pill${form.nivel === n.value ? ' selected' : ''}`}
                  data-nivel={n.value}
                  onClick={() => set('nivel', n.value)}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </Block>

        {/* ══ BLOCO 2 — Enunciado ══ */}
        <Block
          num="②"
          title="Enunciado"
          subtitle="Texto principal + imagem de apoio"
          open={openBlocks[2]}
          onToggle={() => toggle(2)}
        >
          <div className="bq-field" style={{ marginBottom: 12 }}>
            <label className="bq-label">
              Texto do enunciado <span className="required">*</span>
              <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>
                — Use $expressão$ para LaTeX inline
              </span>
            </label>
            <textarea
              className="bq-textarea large"
              value={form.enunciado}
              onChange={e => set('enunciado', e.target.value)}
              placeholder="Ex: Determine o valor de $x$ na equação $2x^2 - 5x + 3 = 0$..."
            />
          </div>

          {/* Imagem */}
          <div className="bq-field" style={{ marginBottom: 12 }}>
            <label className="bq-label">Imagem do enunciado</label>
            <ImageUploader
              value={form.imagem}
              onChange={(val) => set('imagem', val)}
            />
          </div>

          {/* Texto de apoio */}
          <details>
            <summary style={{
              fontSize: '0.8rem', color: '#475569', cursor: 'pointer',
              fontWeight: 600, marginBottom: 8, userSelect: 'none',
            }}>
              📄 Adicionar texto de apoio / contexto
            </summary>
            <div style={{ marginTop: 10 }}>
              <div className="bq-field" style={{ marginBottom: 8 }}>
                <label className="bq-label">Texto de apoio</label>
                <textarea
                  className="bq-textarea"
                  value={form.texto_apoio}
                  onChange={e => set('texto_apoio', e.target.value)}
                  placeholder="Leia o texto abaixo e responda..."
                />
              </div>
              <div className="bq-field">
                <label className="bq-label">Fonte</label>
                <input
                  className="bq-input"
                  value={form.fonte}
                  onChange={e => set('fonte', e.target.value)}
                  placeholder="Ex: ENEM 2022, Adaptado de IBGE..."
                  list="bq-fonte-list"
                />
                <datalist id="bq-fonte-list">
                  {TEXTO_APOIO_FONTES.map(f => <option key={f} value={f} />)}
                </datalist>
              </div>
            </div>
          </details>
        </Block>

        {/* ══ BLOCO 3 — Alternativas (condicional) ══ */}
        {form.tipo === 'objetiva' && (
          <Block
            num="③"
            title="Alternativas"
            subtitle="Marque a alternativa correta"
            open={openBlocks[3]}
            onToggle={() => toggle(3)}
          >
            <div className="bq-alt-list">
              {form.alternativas.map((alt) => (
                <div
                  key={alt.id}
                  className={`bq-alt-item${alt.correta ? ' correct' : ''}`}
                >
                  <span className="bq-alt-letra">{alt.letra}</span>

                  <input
                    className="bq-alt-input"
                    type="text"
                    value={alt.texto}
                    onChange={e => setAlt(alt.id, 'texto', e.target.value)}
                    placeholder={`Alternativa ${alt.letra}...`}
                  />

                  {/* Marcar como correta */}
                  <button
                    type="button"
                    className={`bq-alt-correct-btn${alt.correta ? ' active' : ''}`}
                    onClick={() => marcarCorreta(alt.id)}
                    title={alt.correta ? 'Alternativa correta' : 'Marcar como correta'}
                  >
                    {alt.correta ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </button>

                  {/* Remover */}
                  <button
                    type="button"
                    className="bq-alt-remove-btn"
                    onClick={() => removeAlt(alt.id)}
                    title="Remover alternativa"
                    disabled={form.alternativas.length <= 2}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {form.alternativas.length < 7 && (
              <button type="button" className="bq-add-alt-btn" onClick={addAlt}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Adicionar alternativa
              </button>
            )}

            <div className="bq-info-box" style={{ marginTop: 12 }}>
              <span>💡</span>
              <span>Clique no círculo da direita para marcar a alternativa correta. Ela ficará destacada em verde.</span>
            </div>
          </Block>
        )}

        {/* Discursiva: gabarito textual */}
        {form.tipo === 'discursiva' && (
          <Block
            num="③"
            title="Resposta Esperada"
            subtitle="Gabarito comentado para correção"
            open={openBlocks[3]}
            onToggle={() => toggle(3)}
          >
            <div className="bq-field">
              <label className="bq-label">Resposta esperada / modelo de gabarito</label>
              <textarea
                className="bq-textarea"
                value={form.resposta_aberta}
                onChange={e => set('resposta_aberta', e.target.value)}
                placeholder="Descreva os pontos essenciais para uma resposta completa..."
              />
            </div>
          </Block>
        )}

        {/* ══ BLOCO 4 — Metadados ══ */}
        <Block
          num="④"
          title="Metadados e Tags"
          subtitle="BNCC, tags e resolução comentada"
          open={openBlocks[4]}
          onToggle={() => toggle(4)}
        >

          <div className="bq-field-row">
            <div className="bq-field" style={{ gridColumn: '1 / -1' }}>
              <label className="bq-label">Tags</label>
              <TagsInput tags={form.tags} onChange={(val) => set('tags', val)} />
            </div>
          </div>

          <div className="bq-field-row">
            <div className="bq-field">
              <label className="bq-label">Habilidade BNCC</label>
              <input
                className="bq-input"
                value={form.habilidade_bncc}
                onChange={e => set('habilidade_bncc', e.target.value.toUpperCase())}
                placeholder="Ex: EF09MA01"
                maxLength={15}
              />
              <p className="bq-helper">Código da habilidade (ex: EF07CI01, EM13MAT102)</p>
            </div>
            <div className="bq-field">
              <label className="bq-label">Compartilhar</label>
              <label className="bq-checkbox-label" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  className="bq-checkbox"
                  checked={form.compartilhada}
                  onChange={e => set('compartilhada', e.target.checked)}
                />
                Visível para outros professores da escola
              </label>
            </div>
          </div>

          <div className="bq-field">
            <label className="bq-label">Resolução comentada</label>
            <textarea
              className="bq-textarea"
              value={form.explicacao}
              onChange={e => set('explicacao', e.target.value)}
              placeholder="Explique passo a passo a resolução desta questão..."
            />
            <p className="bq-helper">Não aparece na prova. Serve como gabarito detalhado para o professor.</p>
          </div>
        </Block>

        {/* ══ Ações ══ */}
        <div className="bq-builder-actions">
          <button
            type="button"
            className="bq-btn bq-btn-outline"
            onClick={handleLimpar}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Limpar
          </button>

          <button
            type="button"
            className="bq-btn bq-btn-outline"
            onClick={() => handleSave('rascunho')}
            disabled={saving}
          >
            {saving ? <span className="bq-spinner" style={{ borderTopColor: '#475569' }} /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            Salvar Rascunho
          </button>

          <button
            type="button"
            className="bq-btn bq-btn-primary"
            onClick={() => handleSave('ativa')}
            disabled={saving}
            title={isEditing ? 'Salvar alterações' : 'Salva a questão e publica no Banco Global EDUCA.MELHOR'}
          >
            {saving ? <span className="bq-spinner" /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            )}
            {isEditing ? 'Salvar Alterações' : '🌐 Salvar no Banco Global'}
          </button>
        </div>
      </div>

      {/* ── Coluna direita: preview ── */}
      <LatexPreview questao={form} />

      {/* ── Modal Importar da Imagem ── */}
      {showImagemModal && (
        <ImagemParaQuestaoModal
          onClose={() => setShowImagemModal(false)}
          onUsar={handleUsarExtracao}
        />
      )}

      {/* ── Modal Comentário da Alternativa Correta ── */}
      {showComentarioModal && altCorretaInfoModal && (
        <ComentarioCorretaModal
          letraCorreta={altCorretaInfoModal.letra}
          textoCorreta={altCorretaInfoModal.texto}
          comentarioAtual={form.explicacao}
          onSalvar={(texto) => {
            set('explicacao', texto);
            setShowComentarioModal(false);
            setAltCorretaInfoModal(null);
            // Abre o bloco 4 para o usuário ver o campo preenchido
            if (texto) setOpenBlocks(p => ({ ...p, 4: true }));
          }}
          onPular={() => {
            setShowComentarioModal(false);
            setAltCorretaInfoModal(null);
          }}
        />
      )}

      {/* ── Modal de Resultado Premium ── */}
      {modalResultado && (
        <PublicarResultadoModal
          tipo={modalResultado.tipo}
          titulo={modalResultado.titulo}
          mensagem={modalResultado.mensagem}
          codigo={modalResultado.codigo}
          acoes={modalResultado.acoes}
          onClose={() => setModalResultado(null)}
        />
      )}
    </div>
  );
}
