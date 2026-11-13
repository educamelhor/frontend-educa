// src/features/questoes/QuestoesBuilder.jsx
// 🧩 EDUCA.STUDIO AI — Estúdio Inteligente de Criação e Clonagem de Questões (7 Modelos Universais)

import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import TagsInput from './components/TagsInput';
import SmartMediaCard from './components/SmartMediaCard';
import MathToolbar from './components/MathToolbar';
import ModelosEditor from './components/ModelosEditor';
import LatexPreview, { gerarLatex } from './components/LatexPreview';
import ImagemParaQuestaoModal from './components/ImagemParaQuestaoModal';
import ImportarListaModal from './components/ImportarListaModal';
import PublicarResultadoModal from './components/PublicarResultadoModal';
import ComentarioCorretaModal from './components/ComentarioCorretaModal';
import {
  criarEstruturaInicial,
  parseJsonSafe,
  resumirGabaritoQuestao,
} from './utils/questaoRenderer';

/* ── Constantes ─────────────────────────────────────────── */
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

const TIPOS = [
  { value: 'objetiva',         label: 'Objetiva (A–E)',        emoji: '🔘' },
  { value: 'afirmativas',      label: 'Afirmativas (I, II...)', emoji: '🔢' },
  { value: 'verdadeiro_falso', label: 'V / F',                 emoji: '⚖️' },
  { value: 'associacao',       label: 'Colunas',               emoji: '🔗' },
  { value: 'lacuna',           label: 'Completar Lacunas',     emoji: '📝' },
  { value: 'somatoria',        label: 'Somatória (01, 02...)', emoji: '➕' },
  { value: 'discursiva',       label: 'Discursiva / Aberta',   emoji: '✏️' },
];

const NIVEIS = [
  { value: 'facil',   label: '⭐ Fácil' },
  { value: 'medio',   label: '⭐⭐ Médio' },
  { value: 'dificil', label: '⭐⭐⭐ Difícil' },
  { value: 'enem',    label: '🏆 ENEM' },
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
  'ENEM 2024', 'ENEM 2023', 'ENEM 2022', 'PAS-UnB', 'FUVEST', 'UNICAMP',
  'UECE', 'Acafe-SC', 'SAEB', 'SEEDF', 'Autoral / Própria',
];

const mkAlt = (letra) => ({ id: Date.now() + Math.random(), letra, texto: '', imagem_url: null, correta: false });

const createInitialState = () => ({
  disciplina: '',
  tipo: 'objetiva',
  nivel: 'medio',
  serie: '',
  enunciado: '',
  comando_final: '',
  texto_apoio: '',
  fonte: '',
  alternativas: LETRAS.map(mkAlt),
  estrutura: criarEstruturaInicial('objetiva'),
  resposta_aberta: '',
  habilidade_bncc: '',
  explicacao: '',
  tags: [],
  temas: [],
  imagem: null,
  midia: null,
  compartilhada: true,
});

/* ── Bloco colapsável ────────────────────────────────────── */
function Block({ num, title, subtitle, rightAction, open, onToggle, children }) {
  return (
    <div className={`bq-block${open ? ' bq-block--open' : ''}`}>
      <div className="bq-block-header" onClick={onToggle}>
        <span className="bq-block-num">{num}</span>
        <div style={{ flex: 1 }}>
          <div className="bq-block-title">{title}</div>
          {subtitle && <div className="bq-block-subtitle">{subtitle}</div>}
        </div>
        {rightAction && (
          <div onClick={e => e.stopPropagation()} style={{ marginRight: 8 }}>
            {rightAction}
          </div>
        )}
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
  const [form, setForm] = useState(createInitialState);
  const [openBlocks, setOpenBlocks] = useState({ 1: true, 2: true, 3: true, 4: true });
  const [saving, setSaving] = useState(false);
  const [modalResultado, setModalResultado] = useState(null);
  const [showImagemModal, setShowImagemModal] = useState(false);
  const [showListaModal, setShowListaModal] = useState(false);
  const [pastedFileForModal, setPastedFileForModal] = useState(null);

  // Estados do Copiloto IA
  const [copilotoLoading, setCopilotoLoading] = useState(''); // '' | 'metadados' | 'latex' | 'distratores' | 'resolver'
  const [gabaritoPendenteConfirmacao, setGabaritoPendenteConfirmacao] = useState(false);

  // Modal de justificativa da alternativa correta
  const [showComentarioModal, setShowComentarioModal] = useState(false);
  const [altCorretaInfoModal, setAltCorretaInfoModal] = useState(null);

  // Rastreia rascunho/questão já persistida na sessão atual
  const [savedDraftId, setSavedDraftId] = useState(null);
  const [savedCodigo, setSavedCodigo]   = useState(null);

  const enunciadoRef = useRef(null);

  /* Popula formulário no modo edição */
  useEffect(() => {
    if (editingQuestao) {
      let alts = LETRAS.map(mkAlt);
      try {
        const parsedAlts = parseJsonSafe(editingQuestao.alternativas_json, []);
        if (Array.isArray(parsedAlts) && parsedAlts.length > 0) {
          alts = parsedAlts.map((a, idx) => {
            const letra = String(a?.letra || a?.letter || LETRAS[idx] || String.fromCharCode(65 + idx)).toUpperCase();
            return {
              id: a?.id || (idx + 1),
              letra,
              texto: typeof a === 'object' ? (a.texto || a.text || a.conteudo || '') : String(a || ''),
              imagem_url: typeof a === 'object' ? (a.imagem_url || null) : null,
              correta: Boolean(a?.correta || (editingQuestao.correta && letra === String(editingQuestao.correta).toUpperCase())),
            };
          });
        }
      } catch {}
      while (alts.length < 2) alts.push(mkAlt(LETRAS[alts.length]));

      const tagsArr = typeof editingQuestao.tags === 'string'
        ? editingQuestao.tags.split(',').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(editingQuestao.tags) ? editingQuestao.tags : []);

      const rawTemas = parseJsonSafe(editingQuestao.temas, []);
      const temasArr = Array.isArray(rawTemas) ? rawTemas : [];

      const tipoEd = editingQuestao.tipo || 'objetiva';
      const estEd  = parseJsonSafe(editingQuestao.estrutura_json, null) || criarEstruturaInicial(tipoEd);
      const midEd  = parseJsonSafe(editingQuestao.midia_json, null);

      setForm({
        disciplina:      editingQuestao.disciplina || '',
        tipo:            tipoEd,
        nivel:           editingQuestao.nivel || 'medio',
        serie:           editingQuestao.serie || '',
        enunciado:       editingQuestao.conteudo_bruto || '',
        comando_final:   editingQuestao.comando_final || '',
        texto_apoio:     editingQuestao.texto_apoio || '',
        fonte:           editingQuestao.fonte || '',
        alternativas:    alts,
        estrutura:       estEd,
        resposta_aberta: editingQuestao.resposta_aberta || '',
        habilidade_bncc: editingQuestao.habilidade_bncc || '',
        explicacao:      editingQuestao.explicacao || '',
        tags:            tagsArr,
        temas:           temasArr,
        imagem:          midEd?.url || editingQuestao.imagem_url || editingQuestao.imagem_base64 || null,
        midia:           midEd,
        compartilhada:   editingQuestao.compartilhada !== undefined ? Boolean(editingQuestao.compartilhada) : true,
      });
      setSavedCodigo(editingQuestao.codigo || `EMQE-${String(editingQuestao.numero_q || editingQuestao.id).padStart(5, '0')}`);
      setSavedDraftId(null);
      setGabaritoPendenteConfirmacao(false);
      setOpenBlocks({ 1: true, 2: true, 3: true, 4: true });
    } else {
      setForm(createInitialState());
      setSavedCodigo(null);
      setSavedDraftId(null);
      setGabaritoPendenteConfirmacao(false);
    }
  }, [editingQuestao]);

  /* Atalho Global Ctrl+V na tela Criar Questão: abre o Clonador IA na hora se colar print */
  useEffect(() => {
    const onGlobalPaste = (e) => {
      if (showImagemModal || showListaModal) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            setPastedFileForModal(f);
            setShowImagemModal(true);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onGlobalPaste);
    return () => window.removeEventListener('paste', onGlobalPaste);
  }, [showImagemModal, showListaModal]);

  /* Guarda de navegação para rascunho não finalizado */
  useEffect(() => {
    if (!savedDraftId) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Você tem um rascunho salvo ainda não ativado.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [savedDraftId]);

  const toggle = (n) => setOpenBlocks(p => ({ ...p, [n]: !p[n] }));
  const set    = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const trocarTipo = (novoTipo) => {
    setForm(prev => ({
      ...prev,
      tipo: novoTipo,
      estrutura: prev.estrutura?.modelo === novoTipo ? prev.estrutura : criarEstruturaInicial(novoTipo),
    }));
    setOpenBlocks(p => ({ ...p, 3: true }));
  };

  /* ── Recebe clonagem completa do Agente Multimodal Gemini 2.5 ── */
  const handleUsarExtracao = (dados) => {
    const novoTipo = dados.tipo || 'objetiva';
    const altsExtraidas = Array.isArray(dados.alternativas) && dados.alternativas.length >= 2
      ? dados.alternativas.map((a, idx) => ({
          id: Date.now() + idx,
          letra: String(a.letra || LETRAS[idx] || String.fromCharCode(65 + idx)).toUpperCase(),
          texto: a.texto || '',
          imagem_url: a.imagem_url || null,
          correta: Boolean(a.correta || (dados.gabarito && String(a.letra).toUpperCase() === String(dados.gabarito).toUpperCase())),
        }))
      : LETRAS.map(mkAlt);

    setForm(prev => ({
      ...prev,
      tipo:            novoTipo,
      disciplina:      dados.disciplina || prev.disciplina,
      serie:           dados.serie      || prev.serie,
      nivel:           dados.nivel      || prev.nivel,
      fonte:           dados.fonte      || prev.fonte,
      habilidade_bncc: dados.habilidade_bncc || prev.habilidade_bncc,
      temas:           dados.temas?.length ? dados.temas : prev.temas,
      tags:            dados.tags?.length  ? dados.tags  : prev.tags,
      texto_apoio:     dados.texto_apoio   || '',
      enunciado:       dados.enunciado     || prev.enunciado,
      comando_final:   dados.comando_final || '',
      alternativas:    altsExtraidas,
      estrutura:       dados.estrutura_json || criarEstruturaInicial(novoTipo),
      midia:           dados.midia || null,
      imagem:          dados.midia?.url || dados.imagem_url || null,
      resposta_aberta: dados.resposta_aberta || '',
      explicacao:      dados.explicacao || prev.explicacao,
    }));

    // Se o gabarito foi resolvido pela IA (sem marcação explícita no print), exige 1 clique de confirmação!
    const precisaConfirmar = dados.gabarito_origem !== 'marcado_na_imagem' && !dados.gabarito_confirmado && novoTipo !== 'discursiva';
    setGabaritoPendenteConfirmacao(precisaConfirmar);
    setOpenBlocks({ 1: true, 2: true, 3: true, 4: true });
  };

  const marcarCorreta = (id) => {
    setGabaritoPendenteConfirmacao(false);
    setForm(p => ({
      ...p,
      alternativas: p.alternativas.map(a => ({ ...a, correta: a.id === id })),
    }));
    const alt = form.alternativas.find(a => a.id === id);
    if (alt && !form.explicacao?.trim()) {
      setAltCorretaInfoModal({ id, letra: alt.letra, texto: alt.texto });
      setShowComentarioModal(true);
    }
  };

  /* ── Ações do Copiloto Pedagógico IA ── */
  const acionarCopilotoMetadados = async () => {
    if (!form.enunciado.trim()) {
      setModalResultado({ tipo: 'warning', titulo: 'Enunciado vazio', mensagem: 'Digite o enunciado primeiro para o Copiloto sugerir a classificação e a BNCC.' });
      return;
    }
    setCopilotoLoading('metadados');
    try {
      const { data } = await api.post('/api/questoes/copiloto-ia', {
        acao: 'sugerir_metadados',
        enunciado: form.enunciado,
        comando_final: form.comando_final,
        alternativas: form.alternativas,
        estrutura_json: form.estrutura,
      });
      setForm(p => ({
        ...p,
        disciplina:      data.disciplina || p.disciplina,
        serie:           data.serie      || p.serie,
        nivel:           ['facil', 'medio', 'dificil', 'enem'].includes(data.nivel) ? data.nivel : p.nivel,
        habilidade_bncc: data.habilidade_bncc || p.habilidade_bncc,
        temas:           Array.isArray(data.temas) && data.temas.length ? data.temas : p.temas,
        tags:            Array.isArray(data.tags) && data.tags.length   ? data.tags  : p.tags,
      }));
      setOpenBlocks(p => ({ ...p, 1: true, 4: true }));
    } catch (err) {
      setModalResultado({ tipo: 'error', titulo: 'Copiloto IA', mensagem: err.response?.data?.message || 'Falha ao classificar questão.' });
    } finally {
      setCopilotoLoading('');
    }
  };

  const acionarCopilotoLatex = async () => {
    if (!form.enunciado.trim()) return;
    setCopilotoLoading('latex');
    try {
      const { data } = await api.post('/api/questoes/copiloto-ia', {
        acao: 'converter_latex',
        texto: form.enunciado,
      });
      if (data.texto_formatado) set('enunciado', data.texto_formatado);
    } catch (err) {
      setModalResultado({ tipo: 'error', titulo: 'Copiloto LaTeX', mensagem: err.response?.data?.message || 'Erro ao formatar fórmulas.' });
    } finally {
      setCopilotoLoading('');
    }
  };

  const acionarCopilotoDistratores = async () => {
    const corr = form.alternativas.find(a => a.correta && a.texto?.trim());
    if (!form.enunciado.trim() || !corr) {
      setModalResultado({
        tipo: 'warning',
        titulo: 'Informe a alternativa correta',
        mensagem: 'Preencha o enunciado, digite o texto da alternativa correta e marque-a em verde para a IA gerar os 4 distratores.',
      });
      return;
    }
    setCopilotoLoading('distratores');
    try {
      const { data } = await api.post('/api/questoes/copiloto-ia', {
        acao: 'gerar_distratores',
        disciplina: form.disciplina,
        enunciado: form.enunciado,
        comando_final: form.comando_final,
        resposta_correta: corr.texto,
      });
      const dists = Array.isArray(data.distratores) ? data.distratores : [];
      let dIdx = 0;
      const novasAlts = form.alternativas.map(a => {
        if (a.id === corr.id) return a;
        const txt = dists[dIdx++] || a.texto;
        return { ...a, texto: txt, correta: false };
      });
      setForm(p => ({
        ...p,
        alternativas: novasAlts,
        explicacao: p.explicacao || data.explicacao || '',
      }));
    } catch (err) {
      setModalResultado({ tipo: 'error', titulo: 'Copiloto IA', mensagem: err.response?.data?.message || 'Erro ao gerar distratores.' });
    } finally {
      setCopilotoLoading('');
    }
  };

  const acionarCopilotoResolucao = async () => {
    if (!form.enunciado.trim()) {
      setModalResultado({ tipo: 'warning', titulo: 'Enunciado obrigatório', mensagem: 'Escreva o enunciado antes de solicitar a resolução passo a passo.' });
      return;
    }
    setCopilotoLoading('resolver');
    try {
      const { data } = await api.post('/api/questoes/copiloto-ia', {
        acao: 'resolver_e_comentar',
        tipo: form.tipo,
        enunciado: form.enunciado,
        comando_final: form.comando_final,
        alternativas: form.alternativas,
        estrutura_json: form.estrutura,
      });
      setForm(p => ({
        ...p,
        explicacao: data.resolucao_comentada || p.explicacao,
        resposta_aberta: p.tipo === 'discursiva' ? (data.resposta_aberta_espelho || p.resposta_aberta) : p.resposta_aberta,
      }));
      setOpenBlocks(p => ({ ...p, 4: true }));
    } catch (err) {
      setModalResultado({ tipo: 'error', titulo: 'Copiloto IA', mensagem: err.response?.data?.message || 'Erro ao gerar resolução.' });
    } finally {
      setCopilotoLoading('');
    }
  };

  /* ── Validação Completa dos 7 Modelos ── */
  const validar = (exigirTemasGlobal = false) => {
    if (!form.disciplina) return 'Selecione a disciplina no Bloco ①.';
    if (!form.enunciado.trim()) return 'O enunciado é obrigatório.';
    if (form.imagem && String(form.imagem).startsWith('blob:')) {
      return 'Aguarde o término do envio da imagem.';
    }

    const est = form.estrutura || {};
    const precisaAlts =
      form.tipo === 'objetiva' ||
      form.tipo === 'afirmativas' ||
      (form.tipo === 'verdadeiro_falso' && est.submodo === 'sequencia') ||
      (form.tipo === 'associacao' && est.submodo === 'sequencia') ||
      (form.tipo === 'lacuna' && est.submodo === 'alternativas');

    if (form.tipo === 'afirmativas') {
      const validas = (est.proposicoes || []).filter(p => p.texto?.trim());
      if (validas.length < 2) return 'Preencha ao menos 2 proposições romanas (I, II...).';
    }
    if (form.tipo === 'verdadeiro_falso') {
      const validas = (est.itens || []).filter(i => i.texto?.trim());
      if (validas.length < 2) return 'Preencha ao menos 2 assertivas de Verdadeiro/Falso.';
    }
    if (form.tipo === 'associacao') {
      const valA = (est.coluna_a || []).filter(a => a.texto?.trim());
      const valB = (est.coluna_b || []).filter(b => b.texto?.trim());
      if (valA.length < 2 || valB.length < 2) return 'Preencha ao menos 2 itens em cada coluna da associação.';
    }
    if (form.tipo === 'lacuna') {
      const lacs = [...form.enunciado.matchAll(/\{\{([^}]+)\}\}/g)];
      if (lacs.length === 0) return 'Marque ao menos uma lacuna no enunciado usando {{resposta}} ou o botão "[ ___ ] Criar Lacuna".';
    }
    if (form.tipo === 'somatoria') {
      const validas = (est.proposicoes || []).filter(p => p.texto?.trim());
      if (validas.length < 2) return 'Preencha ao menos 2 proposições na somatória.';
    }

    if (precisaAlts) {
      const preenchidas = form.alternativas.filter(a => a.texto?.trim() || a.imagem_url);
      if (preenchidas.length < 2) return 'Adicione ao menos 2 alternativas preenchidas.';
      if (!form.alternativas.some(a => a.correta)) return 'Marque a alternativa correta em verde.';
    }

    if (gabaritoPendenteConfirmacao) {
      return 'Confirme em 1 clique o gabarito sugerido pelo Agente IA no banner amarelo antes de ativar ou publicar.';
    }

    if (exigirTemasGlobal && (!form.temas || form.temas.length === 0)) {
      return 'Adicione ao menos 1 Tema/Conteúdo no Bloco ① para publicar no Banco Global.';
    }

    return null;
  };

  /* ── Monta Payload Canônico para a API ── */
  const buildPayload = (status) => {
    const est = { ...(form.estrutura || criarEstruturaInicial(form.tipo)), modelo: form.tipo };
    if (form.tipo === 'lacuna') {
      est.lacunas = [...String(form.enunciado || '').matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim()).filter(Boolean);
    }

    const altsFiltradas = form.alternativas.filter(a => a.texto?.trim() || a.imagem_url);
    const altCorreta = altsFiltradas.find(a => a.correta);

    let corretaFinal = altCorreta?.letra || null;
    if (form.tipo === 'somatoria') {
      corretaFinal = String(est.soma_correta ?? 0);
    } else if (form.tipo === 'verdadeiro_falso' && (est.submodo || 'direto') === 'direto') {
      corretaFinal = (est.itens || []).filter(i => i.texto?.trim()).map(i => i.gabarito || 'V').join('-').slice(0, 10) || null;
    }

    const latex = gerarLatex(form);
    const rawImg = form.midia?.url || form.imagem || null;
    const isBase64 = Boolean(rawImg && String(rawImg).startsWith('data:'));

    return {
      conteudo_bruto:    form.enunciado,
      comando_final:     form.comando_final || null,
      latex_formatado:   latex,
      tipo:              form.tipo,
      nivel:             form.nivel,
      serie:             form.serie || null,
      disciplina:        form.disciplina || null,
      habilidade_bncc:   form.habilidade_bncc || null,
      texto_apoio:       form.texto_apoio || null,
      fonte:             form.fonte || null,
      alternativas_json: altsFiltradas.length > 0 ? JSON.stringify(altsFiltradas) : null,
      estrutura_json:    JSON.stringify(est),
      correta:           corretaFinal,
      resposta_aberta:   form.resposta_aberta || null,
      tags:              form.tags.join(','),
      temas:             form.temas.length > 0 ? JSON.stringify(form.temas) : null,
      imagem_url:        !isBase64 ? rawImg : null,
      imagem_base64:     isBase64  ? rawImg : null,
      midia_json:        form.midia ? JSON.stringify(form.midia) : null,
      explicacao:        form.explicacao || null,
      compartilhada:     form.compartilhada ? 1 : 0,
      status,
    };
  };

  /* ── Helper interno que cria ou atualiza no banco local ── */
  const persistirNoBancoEscola = async (status) => {
    const targetId = savedDraftId || editingQuestao?.id;
    if (targetId) {
      const { data } = await api.put(`/api/questoes/${targetId}`, buildPayload(status));
      const codigo = data.codigo || savedCodigo || `EMQE-${String(targetId).padStart(5, '0')}`;
      setSavedCodigo(codigo);
      return { id: targetId, codigo };
    } else {
      const { data } = await api.post('/api/questoes', buildPayload(status));
      const codigo = data.codigo || `EMQE-${String(data.numero_q || data.id).padStart(5, '0')}`;
      setSavedCodigo(codigo);
      return { id: data.id, codigo };
    }
  };

  /* 1) Salvar Rascunho */
  const handleSaveRascunho = async () => {
    if (!form.enunciado.trim()) {
      setModalResultado({ tipo: 'error', titulo: 'Atenção', mensagem: 'Preencha ao menos o enunciado para salvar como rascunho.' });
      return;
    }
    setSaving(true);
    try {
      const { id, codigo } = await persistirNoBancoEscola('rascunho');
      if (!editingQuestao) setSavedDraftId(id);
      setModalResultado({
        tipo: 'success',
        titulo: 'Rascunho Salvo!',
        mensagem: 'Sua questão foi salva como rascunho na escola e já recebeu seu código único.',
        codigo,
        codigoLabel: 'CÓDIGO DO BANCO DA ESCOLA',
        acoes: [
          { label: '🏫 Ativar no Banco da Escola', primary: true, onClick: () => { setModalResultado(null); handleSalvarEscola(); } },
          { label: 'Continuar Editando', onClick: () => setModalResultado(null) },
        ],
      });
    } catch (err) {
      setModalResultado({ tipo: 'error', titulo: 'Erro ao Salvar', mensagem: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  /* 2) Salvar APENAS no Banco da Escola (Ativa local, sem publicar no Global) */
  const handleSalvarEscola = async () => {
    const erro = validar(false);
    if (erro) {
      setModalResultado({ tipo: 'error', titulo: 'Revisão Necessária', mensagem: erro });
      return;
    }
    setSaving(true);
    try {
      const { id, codigo } = await persistirNoBancoEscola('ativa');
      setSavedDraftId(null);
      setModalResultado({
        tipo: 'success',
        titulo: editingQuestao ? 'Questão Atualizada na Escola!' : 'Salva no Banco da Escola!',
        mensagem: 'A questão está ativa exclusivamente no acervo da sua instituição e pronta para uso em provas. Use o código abaixo para localizá-la rapidamente.',
        codigo,
        codigoLabel: 'CÓDIGO DO BANCO DA ESCOLA',
        acoes: [
          {
            label: '➕ Criar Nova Questão',
            primary: true,
            onClick: () => {
              setModalResultado(null);
              setForm(createInitialState());
              setSavedDraftId(null);
              setSavedCodigo(null);
              onSaved?.();
            },
          },
          {
            label: '🌐 Publicar também no Global',
            onClick: async () => {
              setModalResultado(null);
              setSavedDraftId(id);
              await handlePublicarGlobal(id, codigo);
            },
          },
          { label: 'Fechar', onClick: () => setModalResultado(null) },
        ],
      });
    } catch (err) {
      setModalResultado({ tipo: 'error', titulo: 'Erro ao Salvar na Escola', mensagem: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  /* 3) Salvar e Publicar no Banco Global EDUCA.MELHOR */
  const handlePublicarGlobal = async (forcedId = null, forcedCodigoEscola = null) => {
    const erro = validar(true);
    if (erro) {
      setModalResultado({ tipo: 'error', titulo: 'Revisão para Banco Global', mensagem: erro });
      return;
    }
    setSaving(true);
    try {
      let questaoId = forcedId;
      let codigoEscola = forcedCodigoEscola;
      if (!questaoId) {
        const resLocal = await persistirNoBancoEscola('ativa');
        questaoId = resLocal.id;
        codigoEscola = resLocal.codigo;
      }
      const { data: pub } = await api.post(`/api/questoes/${questaoId}/publicar`);
      setSavedDraftId(null);
      setModalResultado({
        tipo: 'success',
        titulo: editingQuestao ? 'Questão Sincronizada!' : 'Publicada no Banco Global!',
        mensagem: 'Questão salva no banco da sua escola e compartilhada no Banco Global EDUCA.MELHOR.',
        codigo: pub.codigo,
        codigoLabel: 'CÓDIGO DO BANCO GLOBAL',
        codigoSecundario: codigoEscola,
        codigoSecundarioLabel: 'CÓDIGO NA SUA ESCOLA',
        acoes: [
          {
            label: '➕ Criar Nova Questão',
            primary: true,
            onClick: () => {
              setModalResultado(null);
              setForm(createInitialState());
              setSavedDraftId(null);
              setSavedCodigo(null);
              onSaved?.();
            },
          },
          { label: 'Fechar', onClick: () => setModalResultado(null) },
        ],
      });
    } catch (err) {
      setModalResultado({ tipo: 'error', titulo: 'Erro ao Publicar', mensagem: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLimpar = () => {
    setForm(createInitialState());
    setSavedDraftId(null);
    setSavedCodigo(null);
    setGabaritoPendenteConfirmacao(false);
  };

  const isEditing = Boolean(editingQuestao);

  return (
    <div className="bq-builder">
      {/* ── Coluna esquerda: Estúdio de Criação ── */}
      <div className="bq-builder-form">

        {/* ── Hub Superior EDUCA.STUDIO AI ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 65%, #0284c7 100%)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 12, color: '#fff',
          boxShadow: '0 6px 20px rgba(14,116,144,0.22)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.08em', background: 'rgba(255,255,255,0.16)', padding: '2px 8px', borderRadius: 99 }}>
                  EDUCA.STUDIO AI
                </span>
                {savedCodigo && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, fontFamily: 'monospace', background: '#022c22', color: '#6ee7b7', padding: '2px 8px', borderRadius: 6, border: '1px solid #10b981' }}>
                    {savedCodigo}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '5px 0 2px', color: '#fff' }}>
                {isEditing ? `✏️ Editando Questão ${savedCodigo || `#${editingQuestao.id}`}` : '🧩 Estúdio Inteligente de Questões'}
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
                Monte passo a passo nos 7 modelos ou pressione <strong>Ctrl+V</strong> em qualquer lugar para clonar um print/foto com IA
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {isEditing && (
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 9, padding: '8px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  ← Cancelar edição
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowListaModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'rgba(255,255,255,0.16)', color: '#ffffff',
                  border: '1.5px solid rgba(255,255,255,0.42)', borderRadius: 10,
                  padding: '8px 14px', fontSize: '0.82rem', fontWeight: 800,
                  cursor: 'pointer', backdropFilter: 'blur(4px)',
                }}
                title="Importe um PDF de prova, fotos de páginas inteiras ou lista em texto para revisar 1 a 1"
              >
                <span>📚</span> Importar Lista / PDF
              </button>

              <button
                type="button"
                onClick={() => { setPastedFileForModal(null); setShowImagemModal(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: '#ffffff', color: '#0f172a', border: 'none', borderRadius: 10,
                  padding: '9px 15px', fontSize: '0.82rem', fontWeight: 800,
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                }}
              >
                <span>📸</span> Clonar Print / Foto (Ctrl+V)
              </button>
            </div>
          </div>
        </div>

        {/* ── Banner de Confirmação Obrigatória do Gabarito IA ── */}
        {gabaritoPendenteConfirmacao && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            background: 'linear-gradient(90deg, #fffbeb, #fef3c7)',
            border: '1.5px solid #f59e0b', borderRadius: 12,
            padding: '11px 14px', marginBottom: 12,
          }}>
            <span style={{ fontSize: '1.3rem' }}>🧠</span>
            <div style={{ flex: 1, minWidth: 210 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400e' }}>
                Gabarito resolvido pelo Agente IA: <span style={{ color: '#065f46' }}>{resumirGabaritoQuestao(form)}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#78350f' }}>
                O print não continha marcação oficial. Confira a resolução no Bloco ④ e confirme em 1 clique (ou altere a resposta).
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGabaritoPendenteConfirmacao(false)}
              style={{
                background: '#059669', color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
              }}
            >
              ✓ Confirmar Gabarito
            </button>
          </div>
        )}

        {/* ══ BLOCO 1 — Modelo & Classificação ══ */}
        <Block
          num="①"
          title="Modelo & Classificação Pedagógica"
          subtitle="Escolha um dos 7 modelos universais, disciplina, nível e temas"
          open={openBlocks[1]}
          onToggle={() => toggle(1)}
          rightAction={
            <button
              type="button"
              onClick={acionarCopilotoMetadados}
              disabled={copilotoLoading === 'metadados'}
              style={{
                padding: '4px 10px', borderRadius: 7, border: '1px solid #bae6fd',
                background: '#f0f9ff', color: '#0369a1', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
              }}
            >
              {copilotoLoading === 'metadados' ? '⏳ Classificando...' : '✨ Auto-Classificar IA'}
            </button>
          }
        >
          {/* Seletor dos 7 Modelos */}
          <div className="bq-field" style={{ marginBottom: 14 }}>
            <label className="bq-label">Modelo Estrutural da Questão</label>
            <div className="bq-tipo-pills">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  className={`bq-tipo-pill${form.tipo === t.value ? ' selected' : ''}`}
                  onClick={() => trocarTipo(t.value)}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

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

          {/* Temas */}
          <div className="bq-field" style={{ marginBottom: 12 }}>
            <label className="bq-label">
              Tema / Conteúdo
              <span style={{
                fontSize: '0.68rem', color: '#0369a1', fontWeight: 700,
                marginLeft: 8, background: '#e0f2fe', padding: '1px 7px', borderRadius: 99,
              }}>obrigatório p/ Banco Global</span>
            </label>
            <TagsInput
              tags={form.temas}
              onChange={(val) => set('temas', val)}
              placeholder="Ex: Cinemática, Aminoácidos... pressione Enter"
            />
          </div>

          {/* Nível */}
          <div className="bq-field">
            <label className="bq-label">Nível de Dificuldade</label>
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

        {/* ══ BLOCO 2 — Enunciado, Figura Independente & Comando ══ */}
        <Block
          num="②"
          title="Enunciado & Mídia Independente"
          subtitle="Texto principal, fórmulas LaTeX, figura auto-ajustável e comando pós-figura"
          open={openBlocks[2]}
          onToggle={() => toggle(2)}
        >
          {/* Texto de apoio + Banca/Fonte */}
          <details open={Boolean(form.texto_apoio || form.fonte)} style={{ marginBottom: 12 }}>
            <summary style={{
              fontSize: '0.8rem', color: '#0e7490', cursor: 'pointer',
              fontWeight: 700, marginBottom: 8, userSelect: 'none',
            }}>
              📖 Fonte / Banca & Texto de Apoio (opcional)
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div className="bq-field">
                <label className="bq-label">Fonte / Banca Examinadora</label>
                <input
                  className="bq-input"
                  value={form.fonte}
                  onChange={e => set('fonte', e.target.value)}
                  placeholder="Ex: ENEM 2023, UECE, Acafe-SC, Autoral..."
                  list="bq-fonte-list"
                />
                <datalist id="bq-fonte-list">
                  {TEXTO_APOIO_FONTES.map(f => <option key={f} value={f} />)}
                </datalist>
              </div>
              <div className="bq-field">
                <label className="bq-label">Texto base / Poema / Tirinha textual (antes do enunciado)</label>
                <textarea
                  className="bq-textarea"
                  value={form.texto_apoio}
                  onChange={e => set('texto_apoio', e.target.value)}
                  placeholder="Trecho de reportagem, poema ou texto motivador..."
                />
              </div>
            </div>
          </details>

          {/* Enunciado + MathToolbar */}
          <div className="bq-field" style={{ marginBottom: 12 }}>
            <label className="bq-label">
              {form.tipo === 'lacuna' ? 'Texto com Lacunas ({{resposta}})' : 'Enunciado Principal'} <span className="required">*</span>
            </label>
            <MathToolbar
              textareaRef={enunciadoRef}
              value={form.enunciado}
              onChange={(val) => set('enunciado', val)}
              onConvertLatex={acionarCopilotoLatex}
              convertingLatex={copilotoLoading === 'latex'}
            />
            <textarea
              ref={enunciadoRef}
              className="bq-textarea large"
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              value={form.enunciado}
              onChange={e => set('enunciado', e.target.value)}
              placeholder={
                form.tipo === 'lacuna'
                  ? 'Ex: A organela responsável pela respiração celular é a {{mitocôndria}}, que produz {{ATP}}.'
                  : 'Ex: Atente à seguinte representação química-estrutural de um aminoácido...'
              }
            />
          </div>

          {/* Estúdio de Mídia Independente */}
          <div className="bq-field" style={{ marginBottom: 12 }}>
            <label className="bq-label">Figura / Gráfico / Esquema da Questão (Status Independente)</label>
            <SmartMediaCard
              imagem={form.imagem}
              midia={form.midia}
              onChange={(url, midiaObj) => {
                setForm(p => ({ ...p, imagem: url, midia: midiaObj }));
              }}
            />
          </div>

          {/* Comando Final Pós-Figura */}
          <div className="bq-field">
            <label className="bq-label">
              Comando Pós-Figura <span style={{ fontWeight: 400, color: '#64748b', textTransform: 'none' }}>(opcional — aparece logo abaixo da figura)</span>
            </label>
            <input
              className="bq-input"
              value={form.comando_final}
              onChange={e => set('comando_final', e.target.value)}
              placeholder='Ex: "Considerando a figura acima, assinale a afirmação verdadeira."'
            />
          </div>
        </Block>

        {/* ══ BLOCO 3 — Estrutura de Resposta dos 7 Modelos ══ */}
        <Block
          num="③"
          title="Estrutura da Resposta & Gabarito"
          subtitle="Configure itens, colunas, lacunas, alternativas ou espelho de correção"
          open={openBlocks[3]}
          onToggle={() => toggle(3)}
        >
          <ModelosEditor
            tipo={form.tipo}
            estrutura={form.estrutura}
            onChangeEstrutura={(novaEst) => {
              setGabaritoPendenteConfirmacao(false);
              set('estrutura', novaEst);
            }}
            alternativas={form.alternativas}
            onChangeAlternativas={(novasAlts) => {
              setGabaritoPendenteConfirmacao(false);
              set('alternativas', novasAlts);
            }}
            onMarcarCorreta={marcarCorreta}
            respostaAberta={form.resposta_aberta}
            onChangeRespostaAberta={(val) => set('resposta_aberta', val)}
            enunciado={form.enunciado}
            onChangeEnunciado={(val) => set('enunciado', val)}
            enunciadoRef={enunciadoRef}
            onGerarDistratoresIA={acionarCopilotoDistratores}
            gerandoDistratores={copilotoLoading === 'distratores'}
            onGerarEspelhoIA={acionarCopilotoResolucao}
            gerandoEspelho={copilotoLoading === 'resolver'}
          />
        </Block>

        {/* ══ BLOCO 4 — BNCC, Tags & Resolução Comentada ══ */}
        <Block
          num="④"
          title="BNCC, Tags & Resolução Comentada"
          subtitle="Indexação curricular e resolução passo a passo exclusiva do professor"
          open={openBlocks[4]}
          onToggle={() => toggle(4)}
          rightAction={
            <button
              type="button"
              onClick={acionarCopilotoResolucao}
              disabled={copilotoLoading === 'resolver'}
              style={{
                padding: '4px 10px', borderRadius: 7, border: '1px solid #86efac',
                background: '#ecfdf5', color: '#047857', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
              }}
            >
              {copilotoLoading === 'resolver' ? '⏳ Resolvendo...' : '✨ Resolver com IA'}
            </button>
          }
        >
          <div className="bq-field-row">
            <div className="bq-field">
              <label className="bq-label">Habilidade BNCC</label>
              <input
                className="bq-input"
                value={form.habilidade_bncc}
                onChange={e => set('habilidade_bncc', e.target.value.toUpperCase())}
                placeholder="Ex: EM13CNT202, EF09MA09"
                maxLength={18}
              />
            </div>
            <div className="bq-field">
              <label className="bq-label">Visibilidade Interna na Escola</label>
              <label className="bq-checkbox-label" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  className="bq-checkbox"
                  checked={form.compartilhada}
                  onChange={e => set('compartilhada', e.target.checked)}
                />
                Compartilhar com demais professores da escola
              </label>
            </div>
          </div>

          <div className="bq-field" style={{ marginBottom: 12 }}>
            <label className="bq-label">Tags de Busca Rápida</label>
            <TagsInput tags={form.tags} onChange={(val) => set('tags', val)} />
          </div>

          <div className="bq-field">
            <label className="bq-label">Resolução Comentada Passo a Passo (Professor)</label>
            <textarea
              className="bq-textarea"
              value={form.explicacao}
              onChange={e => set('explicacao', e.target.value)}
              placeholder="Resolução passo a passo com fórmulas $LaTeX$ (não sai na folha do aluno)..."
            />
          </div>
        </Block>

        {/* ══ Barra de Ações Separadas (Rascunho | Banco da Escola | Banco Global) ══ */}
        <div className="bq-builder-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="bq-btn bq-btn-outline"
            onClick={handleLimpar}
            disabled={saving}
          >
            Limpar
          </button>

          <button
            type="button"
            className="bq-btn bq-btn-outline"
            onClick={handleSaveRascunho}
            disabled={saving}
          >
            💾 Rascunho
          </button>

          <button
            type="button"
            onClick={handleSalvarEscola}
            disabled={saving}
            title="Salva a questão ativa apenas no banco interno da sua escola (gera código EMQE)"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 10,
              border: '1.5px solid #0e7490',
              background: 'linear-gradient(135deg, #0f172a, #0e7490)',
              color: '#fff', fontWeight: 800, fontSize: '0.84rem',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {saving ? '⏳...' : (isEditing ? '🏫 Salvar no Banco da Escola' : '🏫 Salvar no Banco da Escola')}
          </button>

          <button
            type="button"
            className="bq-btn bq-btn-primary"
            onClick={() => handlePublicarGlobal()}
            disabled={saving}
            title="Salva no Banco da Escola e também publica no Banco Global EDUCA.MELHOR"
          >
            {saving ? <span className="bq-spinner" /> : '🌐 Salvar e Publicar no Global'}
          </button>
        </div>
      </div>

      {/* ── Coluna direita: Espelho Editorial A4 ao Vivo ── */}
      <LatexPreview questao={form} codigo={savedCodigo || 'NOVO'} />

      {/* ── Modal Clonador Multimodal (Print / Foto) ── */}
      {showImagemModal && (
        <ImagemParaQuestaoModal
          initialFile={pastedFileForModal}
          onClose={() => { setShowImagemModal(false); setPastedFileForModal(null); }}
          onUsar={handleUsarExtracao}
        />
      )}

      {/* ── Modal Fase 2: Importador Inteligente de Listas, Páginas e PDFs ── */}
      {showListaModal && (
        <ImportarListaModal
          onClose={() => setShowListaModal(false)}
          onImportado={() => { onSaved?.(); }}
          onAbrirNoEstudio={(qExtraida) => {
            handleUsarExtracao(qExtraida);
            setShowListaModal(false);
          }}
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
            if (texto) setOpenBlocks(p => ({ ...p, 4: true }));
          }}
          onPular={() => {
            setShowComentarioModal(false);
            setAltCorretaInfoModal(null);
          }}
        />
      )}

      {/* ── Modal Resultado (com Códigos EMQE / EMQG copiáveis) ── */}
      {modalResultado && (
        <PublicarResultadoModal
          tipo={modalResultado.tipo}
          titulo={modalResultado.titulo}
          mensagem={modalResultado.mensagem}
          codigo={modalResultado.codigo}
          codigoLabel={modalResultado.codigoLabel}
          codigoSecundario={modalResultado.codigoSecundario}
          codigoSecundarioLabel={modalResultado.codigoSecundarioLabel}
          acoes={modalResultado.acoes}
          onClose={() => setModalResultado(null)}
        />
      )}
    </div>
  );
}
