// src/features/questoes/components/ImportarListaModal.jsx
// EDUCA.STUDIO AI — Fase 2: Importador Inteligente de Listas, Páginas e PDFs
// - Suporta PDFs (renderizados em HD no navegador via pdfjs-dist com seleção de páginas),
//   múltiplas fotos/prints de folhas de prova (1 ou 2 colunas) e texto colado do Word/Docs.
// - Individualiza cada questão nos 7 modelos universais, associa textos base compartilhados,
//   isola figuras no DO Spaces e abre a Fila de Revisão 1 a 1 com salvamento direto na Escola (EMQE) ou Global (EMQG).

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';
import api from '../../../services/api';
import SmartMediaCard from './SmartMediaCard';
import ImageCropperModal from './ImageCropperModal';
import ModelosEditor from './ModelosEditor';
import TagsInput from './TagsInput';
import { gerarLatex } from './LatexPreview';
import {
  TIPO_META,
  criarEstruturaInicial,
  QuestaoCorpoEstruturado,
  MathText,
  resumirGabaritoQuestao,
  inferirLetraCorretaPorEstrutura,
} from '../utils/questaoRenderer';

const DISCIPLINAS_LISTA = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Artes', 'Educação Física', 'Biologia', 'Física',
  'Química', 'Sociologia', 'Filosofia', 'Redação', 'PD',
];

const SERIES_LISTA = [
  '6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF',
  '1º EM', '2º EM', '3º EM', 'Ensino Superior',
];

const NIVEIS_LISTA = [
  { value: 'facil',   label: '⭐ Fácil' },
  { value: 'medio',   label: '⭐⭐ Médio' },
  { value: 'dificil', label: '⭐⭐⭐ Difícil' },
  { value: 'enem',    label: '🏆 ENEM' },
];

const MAX_PAGINAS_POR_LOTE = 10;

/* ── Subcomponente: Recorte Visual de Precisão da Questão na Página Original ── */
function RecortePaginaPreview({ pageSrc, questaoBbox, verPaginaInteira, onTogglePaginaInteira }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const hasValidBbox = Array.isArray(questaoBbox) && questaoBbox.length === 4
    && (questaoBbox[2] - questaoBbox[0]) >= 25
    && (questaoBbox[3] - questaoBbox[1]) >= 40;

  useEffect(() => {
    setLoaded(false);
    if (!pageSrc || verPaginaInteira || !hasValidBbox) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled || !canvasRef.current) return;
      const W = img.naturalWidth || 1000;
      const H = img.naturalHeight || 1400;
      const [y1, x1, y2, x2] = questaoBbox.map(Number);
      const padY = 18;
      const padX = 18;
      const ny1 = Math.max(0, y1 - padY);
      const nx1 = Math.max(0, x1 - padX);
      const ny2 = Math.min(1000, y2 + padY);
      const nx2 = Math.min(1000, x2 + padX);

      const sx = Math.round((nx1 / 1000) * W);
      const sy = Math.round((ny1 / 1000) * H);
      const sw = Math.max(40, Math.round(((nx2 - nx1) / 1000) * W));
      const sh = Math.max(30, Math.round(((ny2 - ny1) / 1000) * H));

      const canvas = canvasRef.current;
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sw, sh);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      setLoaded(true);
    };
    img.onerror = () => setLoaded(false);
    img.src = pageSrc;

    return () => { cancelled = true; };
  }, [pageSrc, questaoBbox, verPaginaInteira, hasValidBbox]);

  if (!pageSrc) return null;

  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, gap: 6 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {verPaginaInteira || !hasValidBbox ? '📄 Página Original Enviada' : '🔎 Recorte Original da Questão'}
        </span>
        {hasValidBbox && (
          <button
            type="button"
            onClick={onTogglePaginaInteira}
            style={{
              background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6,
              padding: '3px 8px', fontSize: '0.69rem', fontWeight: 700, color: '#0e7490', cursor: 'pointer',
            }}
          >
            {verPaginaInteira ? '🔎 Focar na Questão' : '📄 Ver Página Inteira'}
          </button>
        )}
      </div>

      {!verPaginaInteira && hasValidBbox ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          overflow: 'hidden', display: 'flex', justifyContent: 'center', maxHeight: 290,
        }}>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%', maxHeight: 285, width: 'auto', height: 'auto',
              objectFit: 'contain', display: loaded ? 'block' : 'none',
            }}
          />
          {!loaded && (
            <img
              src={pageSrc}
              alt="Original"
              style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain' }}
            />
          )}
        </div>
      ) : (
        <div style={{
          position: 'relative', background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 8, overflow: 'auto', maxHeight: 310, textAlign: 'center',
        }}>
          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
            <img
              src={pageSrc}
              alt="Página inteira"
              style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
            />
            {hasValidBbox && (
              <div
                style={{
                  position: 'absolute',
                  top: `${questaoBbox[0] / 10}%`,
                  left: `${questaoBbox[1] / 10}%`,
                  height: `${(questaoBbox[2] - questaoBbox[0]) / 10}%`,
                  width: `${(questaoBbox[3] - questaoBbox[1]) / 10}%`,
                  border: '2px solid #0284c7',
                  background: 'rgba(14, 165, 233, 0.14)',
                  borderRadius: 4,
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Renderiza 1 página do PDF em Blob JPEG otimizado (~220 DPI, upload leve < 300 KB) ── */
async function renderizarPaginaPdfBlob(pdfDoc, pageNum, targetMaxDim = 1900) {
  const page = await pdfDoc.getPage(pageNum);
  const vpBase = page.getViewport({ scale: 1 });
  const idealScale = Math.min(2.4, Math.max(1.7, targetMaxDim / Math.max(vpBase.width, vpBase.height, 1)));
  const viewport = page.getViewport({ scale: idealScale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  return blob;
}

function formatarCronometro(segundosTotais) {
  const s = Math.max(0, Math.floor(Number(segundosTotais) || 0));
  const min = String(Math.floor(s / 60)).padStart(2, '0');
  const seg = String(s % 60).padStart(2, '0');
  return `${min}:${seg}`;
}

function esperarMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Renderiza miniatura leve p/ seletor de páginas do PDF ── */
async function renderizarMiniaturaPdfDataUrl(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const vpBase = page.getViewport({ scale: 1 });
  const thumbScale = 260 / Math.max(vpBase.width, 1);
  const viewport = page.getViewport({ scale: thumbScale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.72);
}

export default function ImportarListaModal({
  onClose,
  onImportado,
  onAbrirNoEstudio = null,
}) {
  // Etapas: 'upload' | 'processando' | 'revisao' | 'resumo'
  const [etapa, setEtapa] = useState('upload');
  const [modoFonte, setModoFonte] = useState('visual'); // 'visual' (PDF/Fotos) | 'texto'

  // Configurações globais sugeridas opcionais
  const [discPadrao, setDiscPadrao] = useState('');
  const [seriePadrao, setSeriePadrao] = useState('');

  // Estado PDF / Imagens de Páginas
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfNome, setPdfNome] = useState('');
  const [pdfTotalPaginas, setPdfTotalPaginas] = useState(0);
  const [pdfThumbs, setPdfThumbs] = useState({}); // { [pageNum]: dataUrl }
  const [pdfLimiteThumbs, setPdfLimiteThumbs] = useState(12);
  const [paginasSelecionadas, setPaginasSelecionadas] = useState([]); // [1, 2, ...]
  const [loadingPdf, setLoadingPdf] = useState(false);

  const [arquivosImagens, setArquivosImagens] = useState([]); // [{ id, file, previewUrl, nome }]
  const [textoBruto, setTextoBruto] = useState('');
  const [isDrag, setIsDrag] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  // Telemetria em tempo real estilo Solver Urânia (Zero Timeout via Background Job + Polling)
  const [telemetria, setTelemetria] = useState({
    jobId: null,
    faseEnvio: false,
    enviadas: 0,
    totalPaginas: 0,
    concluidas: 0,
    comErro: 0,
    totalQuestoes: 0,
    etapaAtual: '',
    modeloAtivo: '',
    iniciadoLocalMs: 0,
    elapsedSegundos: 0,
    paginas: [],
    parando: false,
  });
  const jobAtivoRef = useRef(null);
  const mapaPreviewPaginasRef = useRef({});
  const unmountedRef = useRef(false);

  // Fila de Revisão 1 a 1
  const [fila, setFila] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [abaDireita, setAbaDireita] = useState('preview'); // 'preview' | 'editar'
  const [verPaginaInteira, setVerPaginaInteira] = useState(false);
  const [salvandoAcao, setSalvandoAcao] = useState(''); // '' | 'escola' | 'global'
  const [erroItem, setErroItem] = useState('');
  const [copiadoCodigo, setCopiadoCodigo] = useState('');
  const [showManualCropModal, setShowManualCropModal] = useState(false);
  const [teveAlgumaSalva, setTeveAlgumaSalva] = useState(false);

  const fileInputRef = useRef(null);
  const enunciadoEditRef = useRef(null);
  const objectUrlsRef = useRef([]);

  const registrarObjectUrl = (url) => {
    if (url) objectUrlsRef.current.push(url);
    return url;
  };

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      objectUrlsRef.current.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch { /* ignore */ }
      });
    };
  }, []);

  // Cronômetro suave em tempo real (1s) durante o processamento assíncrono
  useEffect(() => {
    if (etapa !== 'processando' || !telemetria.iniciadoLocalMs) return;
    const timer = setInterval(() => {
      setTelemetria((prev) => ({
        ...prev,
        elapsedSegundos: Math.max(0, Math.floor((Date.now() - prev.iniciadoLocalMs) / 1000)),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [etapa, telemetria.iniciadoLocalMs]);

  /* ── Carregamento de PDF no Navegador ── */
  const carregarArquivoPdf = useCallback(async (file) => {
    setLoadingPdf(true);
    setErroMsg('');
    try {
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      setArquivosImagens([]);
      setPdfDoc(doc);
      setPdfNome(file.name);
      setPdfTotalPaginas(doc.numPages);
      const limiteInicial = Math.min(doc.numPages, 12);
      setPdfLimiteThumbs(limiteInicial);

      // Seleciona por padrão até as 4 primeiras páginas
      const selInicial = Array.from({ length: Math.min(doc.numPages, 4) }, (_, i) => i + 1);
      setPaginasSelecionadas(selInicial);

      const thumbs = {};
      for (let p = 1; p <= limiteInicial; p++) {
        thumbs[p] = await renderizarMiniaturaPdfDataUrl(doc, p);
      }
      setPdfThumbs(thumbs);
    } catch (err) {
      console.error('[ImportarListaModal] Erro ao ler PDF:', err);
      setErroMsg('Não foi possível abrir este arquivo PDF. Verifique se não está protegido por senha.');
    } finally {
      setLoadingPdf(false);
    }
  }, []);

  const carregarMaisMiniaturasPdf = async () => {
    if (!pdfDoc || pdfLimiteThumbs >= pdfTotalPaginas) return;
    setLoadingPdf(true);
    try {
      const novoLimite = Math.min(pdfTotalPaginas, pdfLimiteThumbs + 12);
      const novas = { ...pdfThumbs };
      for (let p = pdfLimiteThumbs + 1; p <= novoLimite; p++) {
        novas[p] = await renderizarMiniaturaPdfDataUrl(pdfDoc, p);
      }
      setPdfThumbs(novas);
      setPdfLimiteThumbs(novoLimite);
    } finally {
      setLoadingPdf(false);
    }
  };

  /* ── Seleção de Arquivos (PDF ou Múltiplas Imagens) ── */
  const processarArquivosEntrada = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setErroMsg('');

    const pdfFile = files.find((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''));
    if (pdfFile) {
      await carregarArquivoPdf(pdfFile);
      return;
    }

    const imgFiles = files.filter((f) => /^image\/(jpeg|jpg|png|webp|gif|bmp)$/i.test(f.type || ''));
    if (!imgFiles.length) {
      setErroMsg('Selecione um arquivo PDF ou imagens de páginas (PNG, JPG ou WEBP).');
      return;
    }

    setPdfDoc(null);
    setPdfNome('');
    setPdfTotalPaginas(0);
    setPdfThumbs({});

    setArquivosImagens((prev) => {
      const combinados = [...prev];
      for (const f of imgFiles) {
        if (combinados.length >= MAX_PAGINAS_POR_LOTE) break;
        const pUrl = registrarObjectUrl(URL.createObjectURL(f));
        combinados.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file: f,
          previewUrl: pUrl,
          nome: f.name || `Página ${combinados.length + 1}`,
        });
      }
      return combinados;
    });
  }, [carregarArquivoPdf]);

  /* ── Suporte a Ctrl+V de print de página inteira na tela de upload ── */
  useEffect(() => {
    if (etapa !== 'upload' || modoFonte !== 'visual') return;
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgs = [];
      for (const it of items) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) imgs.push(f);
        }
      }
      if (imgs.length > 0) {
        e.preventDefault();
        processarArquivosEntrada(imgs);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [etapa, modoFonte, processarArquivosEntrada]);

  const togglePaginaPdf = (p) => {
    setPaginasSelecionadas((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (prev.length >= MAX_PAGINAS_POR_LOTE) {
        setErroMsg(`Selecione no máximo ${MAX_PAGINAS_POR_LOTE} páginas por lote para manter alta velocidade.`);
        return prev;
      }
      setErroMsg('');
      return [...prev, p].sort((a, b) => a - b);
    });
  };

  /* ── Converte item retornado pela API p/ estado editável rico na Fila ── */
  const hidratarItemFila = (q, idxGlobal, paginaLocalPreview = null) => {
    const tipo = q.tipo || 'objetiva';
    const est = q.estrutura_json || criarEstruturaInicial(tipo);
    const precisaConfirmarGabarito = q.gabarito_origem !== 'marcado_na_imagem' && tipo !== 'discursiva';

    let alts = Array.isArray(q.alternativas) && q.alternativas.length > 0
      ? q.alternativas
      : [
          { id: 1, letra: 'A', texto: '', imagem_url: null, correta: false },
          { id: 2, letra: 'B', texto: '', imagem_url: null, correta: false },
          { id: 3, letra: 'C', texto: '', imagem_url: null, correta: false },
          { id: 4, letra: 'D', texto: '', imagem_url: null, correta: false },
        ];

    const altsComConteudo = alts.filter((a) => (a?.texto && String(a.texto).trim()) || a?.imagem_url);

    if (altsComConteudo.length > 0 && !altsComConteudo.some((a) => a.correta)) {
      const letraInferida =
        String(q.gabarito || '').toUpperCase().trim() ||
        inferirLetraCorretaPorEstrutura(tipo, est, altsComConteudo, `${q.enunciado || ''} ${q.comando_final || ''}`);
      if (letraInferida && altsComConteudo.some((a) => String(a.letra || '').toUpperCase().trim() === letraInferida)) {
        alts = alts.map((a) => ({
          ...a,
          correta: Boolean(((a?.texto && String(a.texto).trim()) || a?.imagem_url) && String(a.letra || '').toUpperCase().trim() === letraInferida),
        }));
      }
    }

    const gabaritoValido =
      alts.filter((a) => (a?.texto && String(a.texto).trim()) || a?.imagem_url).find((a) => a.correta)?.letra ||
      (altsComConteudo.length > 0 ? q.gabarito : null) ||
      null;

    return {
      ...q,
      uid: q.id_fila || `q_${Date.now()}_${idxGlobal}`,
      ordem_fila: idxGlobal + 1,
      pagina_local_preview: paginaLocalPreview || q.pagina_original_url || null,
      estrutura: est,
      estrutura_json: est,
      imagem: q.midia?.url || q.imagem_url || null,
      alternativas: alts,
      gabarito: gabaritoValido,
      gabarito_confirmado: !precisaConfirmarGabarito && (tipo === 'discursiva' || tipo === 'somatoria' || Boolean(gabaritoValido) || (tipo === 'verdadeiro_falso' && (est.submodo || 'direto') === 'direto') || (tipo === 'associacao' && (est.submodo || 'direto') === 'direto') || (tipo === 'lacuna' && (est.submodo || 'direto') !== 'alternativas')),
      status_fila: 'pendente', // 'pendente' | 'salva_escola' | 'publicada_global' | 'ignorada'
      questao_id_salva: null,
      codigo_escola: null,
      codigo_global: null,
    };
  };

  /* ── Abre a Fila de Revisão hidratando cada questão com o preview local da sua página ── */
  const finalizarJobParaRevisao = useCallback((statusData) => {
    const mapaLocal = mapaPreviewPaginasRef.current || {};
    const questoesBrutas = Array.isArray(statusData?.questoes) ? statusData.questoes : [];
    const lista = questoesBrutas.map((q, idx) =>
      hidratarItemFila(q, idx, mapaLocal[q.pagina_origem] || null)
    );

    if (!lista.length) {
      if (statusData?.status === 'cancelado') {
        setEtapa('upload');
        return;
      }
      const motivo = statusData?.erro_msg || statusData?.avisos?.[0]
        || 'Nenhuma questão foi encontrada nas páginas selecionadas. Verifique se contêm exercícios visíveis.';
      setErroMsg(motivo);
      setEtapa('upload');
      return;
    }

    setFila(lista);
    setActiveIdx(0);
    setAbaDireita('preview');
    setVerPaginaInteira(false);
    if (Array.isArray(statusData?.avisos) && statusData.avisos.length > 0) {
      setErroItem(`Aviso parcial: ${statusData.avisos.join(' · ')}. As ${lista.length} questões extraídas estão prontas abaixo.`);
    } else {
      setErroItem('');
    }
    setEtapa('revisao');
  }, []);

  /* ── Botão Estilo Urânia: "Parar Agora e Revisar Questões Já Prontas" (ou Cancelar) ── */
  const pararOuCancelarJob = async () => {
    const jid = jobAtivoRef.current;
    setTelemetria((prev) => ({ ...prev, parando: true, etapaAtual: 'Interrompendo fila e consolidando questões já prontas...' }));
    if (!jid) {
      setEtapa('upload');
      return;
    }
    try {
      const { data } = await api.post(`/api/questoes/jobs/${jid}/cancelar`, {}, { timeout: 15000 });
      jobAtivoRef.current = null;
      finalizarJobParaRevisao(data);
    } catch {
      jobAtivoRef.current = null;
      setEtapa('upload');
    }
  };

  /* ── Dispara Extração Assíncrona em Background (Zero Timeout de 30s/60s + Telemetria ao Vivo) ── */
  const iniciarExtracao = async () => {
    setErroMsg('');
    setErroItem('');

    let tarefasPaginas = [];
    if (modoFonte === 'texto') {
      if (textoBruto.trim().length < 20) {
        setErroMsg('Cole o texto contendo ao menos uma questão completa.');
        return;
      }
    } else {
      if (pdfDoc) {
        if (!paginasSelecionadas.length) {
          setErroMsg('Selecione ao menos 1 página do PDF para individualizar.');
          return;
        }
        for (const pNum of paginasSelecionadas) {
          tarefasPaginas.push({ tipo: 'pdf', pageNum: pNum, label: `Página ${pNum}` });
        }
      } else if (arquivosImagens.length > 0) {
        arquivosImagens.forEach((arq, idx) => {
          tarefasPaginas.push({
            tipo: 'img',
            pageNum: idx + 1,
            file: arq.file,
            previewUrl: arq.previewUrl,
            label: `Folha ${idx + 1}`,
          });
        });
      } else {
        setErroMsg('Envie um arquivo PDF ou adicione fotos/prints das páginas da lista.');
        return;
      }
    }

    const totalPags = modoFonte === 'texto' ? 1 : tarefasPaginas.length;
    const inicioMs = Date.now();
    mapaPreviewPaginasRef.current = {};

    setTelemetria({
      jobId: null,
      faseEnvio: modoFonte === 'visual',
      enviadas: 0,
      totalPaginas: totalPags,
      concluidas: 0,
      comErro: 0,
      totalQuestoes: 0,
      etapaAtual: modoFonte === 'texto'
        ? 'Iniciando individualização da lista em texto no motor assíncrono...'
        : `Preparando ${totalPags} página(s) em alta nitidez para leitura paralela...`,
      modeloAtivo: '',
      iniciadoLocalMs: inicioMs,
      elapsedSegundos: 0,
      paginas: tarefasPaginas.map((t, idx) => ({
        ordem: idx + 1,
        pagina_numero: t.pageNum,
        status: 'preparando',
        etapa: 'Aguardando envio...',
        questoes_count: 0,
      })),
      parando: false,
    });
    setEtapa('processando');

    try {
      // 1) Cria o Job Assíncrono (HTTP 202 < 150ms)
      const { data: jobResp } = await api.post(
        '/api/questoes/jobs',
        {
          modo: modoFonte === 'texto' ? 'texto' : 'visual',
          total_paginas: totalPags,
          disciplina: discPadrao,
          serie: seriePadrao,
          texto: modoFonte === 'texto' ? textoBruto : '',
        },
        { timeout: 20000 }
      );

      const jobId = jobResp?.jobId;
      if (!jobId) throw new Error('Não foi possível iniciar o motor assíncrono de questões.');
      jobAtivoRef.current = jobId;
      setTelemetria((prev) => ({ ...prev, jobId }));

      // 2) Se for visual (PDF/Fotos), rasteriza e despacha cada página em background (< 250ms/pág)
      //    O servidor já começa a processar na IA a Página 1 e 2 imediatamente enquanto as demais sobem!
      if (modoFonte === 'visual') {
        for (let i = 0; i < tarefasPaginas.length; i++) {
          if (unmountedRef.current || jobAtivoRef.current !== jobId) return;
          const t = tarefasPaginas[i];

          setTelemetria((prev) => ({
            ...prev,
            etapaAtual: `Renderizando e enviando ${t.label} (${i + 1} de ${tarefasPaginas.length})...`,
          }));

          let blobEnvio = null;
          let localPreviewUrl = null;
          if (t.tipo === 'pdf') {
            blobEnvio = await renderizarPaginaPdfBlob(pdfDoc, t.pageNum);
            localPreviewUrl = registrarObjectUrl(URL.createObjectURL(blobEnvio));
          } else {
            blobEnvio = t.file;
            localPreviewUrl = t.previewUrl;
          }
          mapaPreviewPaginasRef.current[t.pageNum] = localPreviewUrl;

          const fd = new FormData();
          fd.append('imagem', blobEnvio, `pagina_${t.pageNum}.jpg`);
          fd.append('pagina_numero', String(t.pageNum));
          fd.append('ordem_lote', String(i + 1));

          await api.post(`/api/questoes/jobs/${jobId}/pagina`, fd, { timeout: 25000 });

          setTelemetria((prev) => ({
            ...prev,
            enviadas: i + 1,
            faseEnvio: i + 1 < tarefasPaginas.length,
            paginas: prev.paginas.map((p, pIdx) =>
              pIdx === i && p.status === 'preparando'
                ? { ...p, status: 'fila', etapa: 'Na fila de visão...' }
                : p
            ),
          }));
        }
      }

      // 3) Loop de Telemetria em Tempo Real (Polling leve < 50ms a cada 1.4s — Zero Timeout!)
      let falhasRedeSeguidas = 0;
      while (!unmountedRef.current && jobAtivoRef.current === jobId) {
        await esperarMs(1400);
        if (unmountedRef.current || jobAtivoRef.current !== jobId) return;

        try {
          const { data: st } = await api.get(`/api/questoes/jobs/${jobId}`, { timeout: 15000 });
          falhasRedeSeguidas = 0;

          setTelemetria((prev) => ({
            ...prev,
            faseEnvio: false,
            concluidas: st.paginas_concluidas || 0,
            comErro: st.paginas_com_erro || 0,
            totalQuestoes: st.total_questoes || 0,
            etapaAtual: st.etapa_atual || prev.etapaAtual,
            modeloAtivo: st.modelo_ativo || prev.modeloAtivo,
            paginas: Array.isArray(st.paginas) && st.paginas.length > 0 ? st.paginas : prev.paginas,
          }));

          if (st.status === 'concluido' || st.status === 'cancelado') {
            jobAtivoRef.current = null;
            finalizarJobParaRevisao(st);
            return;
          }

          if (st.status === 'erro') {
            jobAtivoRef.current = null;
            if ((st.questoes || []).length > 0) {
              finalizarJobParaRevisao(st);
              return;
            }
            throw new Error(st.erro_msg || st.avisos?.[0] || 'Falha ao processar páginas no Agente Multimodal.');
          }
        } catch (pollErr) {
          // Se foi erro definitivo de negócio lançado acima, propaga para o catch externo
          if (!pollErr.response && !pollErr.code && jobAtivoRef.current === null) {
            throw pollErr;
          }
          falhasRedeSeguidas++;
          if (falhasRedeSeguidas >= 5) {
            throw pollErr;
          }
        }
      }
    } catch (err) {
      jobAtivoRef.current = null;
      const d = err.response?.data;
      setErroMsg(
        d?.message
          ? `${d.message}${d.detail && d.detail !== d.message ? ` (${d.detail})` : ''}`
          : (err.message || 'Erro ao processar páginas.')
      );
      setEtapa('upload');
    }
  };

  /* ── Helpers de Edição do Item Atual na Fila ── */
  const currentItem = fila[activeIdx] || null;

  const patchCurrentItem = (partial) => {
    setErroItem('');
    setFila((prev) =>
      prev.map((it, idx) => {
        if (idx !== activeIdx) return it;
        const next = { ...it, ...partial };
        if (partial.estrutura) next.estrutura_json = partial.estrutura;
        if (partial.midia !== undefined) next.imagem = partial.midia?.url || partial.imagem || null;
        return next;
      })
    );
  };

  const mudarTipoItemAtual = (novoTipo) => {
    const novaEst = criarEstruturaInicial(novoTipo);
    patchCurrentItem({
      tipo: novoTipo,
      estrutura: novaEst,
      estrutura_json: novaEst,
      gabarito_confirmado: novoTipo === 'discursiva' ? true : currentItem?.gabarito_confirmado,
    });
  };

  const marcarCorretaItemAtual = (altId) => {
    if (!currentItem) return;
    const novasAlts = (currentItem.alternativas || []).map((a) => ({ ...a, correta: a.id === altId }));
    patchCurrentItem({ alternativas: novasAlts, gabarito_confirmado: true });
  };

  /* ── Avança automaticamente para a próxima questão pendente (ou resumo final) ── */
  const avancarParaProximaPendente = (filaAtualizada) => {
    setErroItem('');
    setVerPaginaInteira(false);
    const total = filaAtualizada.length;
    for (let offset = 1; offset <= total; offset++) {
      const cand = (activeIdx + offset) % total;
      if (filaAtualizada[cand].status_fila === 'pendente') {
        setActiveIdx(cand);
        setAbaDireita('preview');
        return;
      }
    }
    setEtapa('resumo');
  };

  /* ── Validação e Montagem do Payload Canônico para POST /api/questoes ── */
  const validarItemParaSalvar = (item) => {
    if (!item.disciplina?.trim()) return 'Selecione a disciplina da questão.';
    if (!item.enunciado?.trim()) return 'O enunciado da questão está vazio.';

    const est = item.estrutura || {};
    const precisaAlts =
      item.tipo === 'objetiva' ||
      item.tipo === 'afirmativas' ||
      (item.tipo === 'verdadeiro_falso' && est.submodo === 'sequencia') ||
      (item.tipo === 'associacao' && est.submodo === 'sequencia') ||
      (item.tipo === 'lacuna' && est.submodo === 'alternativas');

    if (precisaAlts) {
      const preenchidas = (item.alternativas || []).filter((a) => a.texto?.trim() || a.imagem_url);
      if (preenchidas.length < 2) return 'A questão precisa de ao menos 2 alternativas preenchidas (clique em "Editar Campos").';
      if (!preenchidas.some((a) => a.correta)) return 'Marque a alternativa correta antes de salvar (clique em "Editar Campos").';
    }

    if (!item.gabarito_confirmado && item.tipo !== 'discursiva') {
      return 'Confirme em 1 clique o gabarito sugerido pela IA no card amarelo antes de salvar.';
    }

    return null;
  };

  const montarPayloadApi = (item) => {
    const est = { ...(item.estrutura || criarEstruturaInicial(item.tipo)), modelo: item.tipo };
    if (item.tipo === 'lacuna') {
      est.lacunas = [...String(item.enunciado || '').matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim()).filter(Boolean);
    }

    const altsFiltradas = (item.alternativas || []).filter((a) => a.texto?.trim() || a.imagem_url);
    const altCorreta = altsFiltradas.find((a) => a.correta);

    let corretaFinal = altCorreta?.letra || null;
    if (item.tipo === 'somatoria') {
      corretaFinal = String(est.soma_correta ?? 0);
    } else if (item.tipo === 'verdadeiro_falso' && (est.submodo || 'direto') === 'direto') {
      corretaFinal = (est.itens || []).filter((i) => i.texto?.trim()).map((i) => i.gabarito || 'V').join('-').slice(0, 10) || null;
    }

    const temasGarantidos = Array.isArray(item.temas) && item.temas.filter(Boolean).length > 0
      ? item.temas.filter(Boolean)
      : [item.disciplina || 'Geral'];

    const rawImg = item.midia?.url || item.imagem || null;
    const isBase64 = Boolean(rawImg && String(rawImg).startsWith('data:'));

    const latex = gerarLatex({
      ...item,
      estrutura: est,
      alternativas: altsFiltradas,
      temas: temasGarantidos,
    });

    return {
      conteudo_bruto:    item.enunciado,
      comando_final:     item.comando_final || null,
      latex_formatado:   latex,
      tipo:              item.tipo,
      nivel:             item.nivel || 'medio',
      serie:             item.serie || null,
      disciplina:        item.disciplina,
      habilidade_bncc:   item.habilidade_bncc || null,
      texto_apoio:       item.texto_apoio || null,
      fonte:             item.fonte || null,
      alternativas_json: altsFiltradas.length > 0 ? JSON.stringify(altsFiltradas) : null,
      estrutura_json:    JSON.stringify(est),
      correta:           corretaFinal,
      resposta_aberta:   item.resposta_aberta || null,
      tags:              Array.isArray(item.tags) ? item.tags.join(',') : '',
      temas:             JSON.stringify(temasGarantidos),
      imagem_url:        !isBase64 ? rawImg : null,
      imagem_base64:     isBase64 ? rawImg : null,
      midia_json:        item.midia ? JSON.stringify(item.midia) : null,
      explicacao:        item.explicacao || null,
      compartilhada:     1,
      status:            'ativa',
    };
  };

  /* ── Salvar no Banco da Escola (EMQE) ou Banco Global (EMQE + EMQG) ── */
  const salvarQuestaoAtual = async (publicarGlobal = false) => {
    if (!currentItem) return;
    const erroValidacao = validarItemParaSalvar(currentItem);
    if (erroValidacao) {
      setErroItem(erroValidacao);
      return;
    }

    setSalvandoAcao(publicarGlobal ? 'global' : 'escola');
    setErroItem('');

    try {
      let localId = currentItem.questao_id_salva;
      let codigoEscola = currentItem.codigo_escola;

      if (!localId) {
        const { data } = await api.post('/api/questoes', montarPayloadApi(currentItem));
        localId = data.id;
        codigoEscola = data.codigo || `EMQE-${String(data.numero_q || data.id).padStart(5, '0')}`;
      } else {
        await api.put(`/api/questoes/${localId}`, montarPayloadApi(currentItem));
      }

      let codigoGlobal = currentItem.codigo_global;
      if (publicarGlobal) {
        const { data: pubData } = await api.post(`/api/questoes/${localId}/publicar`);
        codigoGlobal = pubData.codigo || `EMQG-${String(pubData.global_id || localId).padStart(5, '0')}`;
      }

      const novoStatus = publicarGlobal ? 'publicada_global' : 'salva_escola';
      const novaFila = fila.map((it, idx) =>
        idx === activeIdx
          ? {
              ...it,
              status_fila: novoStatus,
              questao_id_salva: localId,
              codigo_escola: codigoEscola,
              codigo_global: codigoGlobal,
            }
          : it
      );

      setFila(novaFila);
      setTeveAlgumaSalva(true);
      onImportado?.({ manterAberto: true });
      avancarParaProximaPendente(novaFila);
    } catch (err) {
      setErroItem(err.response?.data?.message || err.message || 'Falha ao salvar a questão.');
    } finally {
      setSalvandoAcao('');
    }
  };

  const ignorarQuestaoAtual = () => {
    const novaFila = fila.map((it, idx) =>
      idx === activeIdx && it.status_fila === 'pendente'
        ? { ...it, status_fila: 'ignorada' }
        : it
    );
    setFila(novaFila);
    avancarParaProximaPendente(novaFila);
  };

  const copiarTexto = (cod) => {
    if (!cod) return;
    navigator.clipboard?.writeText(cod);
    setCopiadoCodigo(cod);
    setTimeout(() => setCopiadoCodigo(''), 1800);
  };

  const fecharModal = () => {
    if (jobAtivoRef.current) {
      const jid = jobAtivoRef.current;
      jobAtivoRef.current = null;
      api.post(`/api/questoes/jobs/${jid}/cancelar`).catch(() => {});
    }
    if (teveAlgumaSalva) onImportado?.({ manterAberto: false });
    onClose?.();
  };

  // Contadores da Fila
  const totalSalvas = fila.filter((q) => q.status_fila === 'salva_escola' || q.status_fila === 'publicada_global').length;
  const totalPendentes = fila.filter((q) => q.status_fila === 'pendente').length;

  return (
    <div
      style={S.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && etapa !== 'processando' && !salvandoAcao) fecharModal();
      }}
    >
      <div style={{ ...S.modal, maxWidth: etapa === 'revisao' ? 1220 : 880 }}>
        {/* ── Cabeçalho Oficial EDUCA.STUDIO AI ── */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={S.headerIcon}>📚</div>
            <div>
              <div style={S.headerTitle}>
                EDUCA.STUDIO AI — Importador Inteligente de Listas, Páginas e PDFs
              </div>
              <div style={S.headerSubtitle}>
                {etapa === 'upload' && 'Envie um PDF de prova/lista, fotos de páginas inteiras (1 ou 2 colunas) ou cole o texto para individualizar questão por questão'}
                {etapa === 'processando' && (telemetria.etapaAtual || 'Motor Assíncrono EDUCA.STUDIO AI em execução...')}
                {etapa === 'revisao' && `Fila de Revisão Individual 1 a 1 · ${totalSalvas} salva(s) · ${totalPendentes} pendente(s) de ${fila.length}`}
                {etapa === 'resumo' && `Importação concluída · ${totalSalvas} questão(ões) catalogada(s) com código único`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {etapa === 'revisao' && (
              <button
                type="button"
                onClick={() => setEtapa('resumo')}
                style={{
                  background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.32)',
                  borderRadius: 8, padding: '6px 12px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                }}
              >
                📊 Ver Resumo ({totalSalvas}/{fila.length})
              </button>
            )}
            {etapa !== 'processando' && (
              <button type="button" style={S.closeBtn} onClick={fecharModal} title="Fechar">✕</button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ETAPA 1 — UPLOAD DE PDF, FOTOS DE PÁGINAS OU TEXTO BRUTO
        ══════════════════════════════════════════════════════════════════ */}
        {etapa === 'upload' && (
          <div style={S.body}>
            {/* Seletor de Modo */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setModoFonte('visual'); setErroMsg(''); }}
                style={{
                  flex: 1, minWidth: 230, padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
                  border: `2px solid ${modoFonte === 'visual' ? '#0284c7' : '#e2e8f0'}`,
                  background: modoFonte === 'visual' ? '#f0f9ff' : '#fff',
                  color: modoFonte === 'visual' ? '#0c4a6e' : '#475569',
                  fontWeight: 800, fontSize: '0.84rem', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: '1.35rem' }}>📄</span>
                <div>
                  <div>PDF da Prova / Fotos de Páginas Inteiras</div>
                  <div style={{ fontSize: '0.71rem', fontWeight: 500, color: '#64748b' }}>
                    Preserva figuras, gráficos, esquemas 2D, fórmulas e layout em 2 colunas (ENEM)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setModoFonte('texto'); setErroMsg(''); }}
                style={{
                  flex: 1, minWidth: 230, padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
                  border: `2px solid ${modoFonte === 'texto' ? '#0284c7' : '#e2e8f0'}`,
                  background: modoFonte === 'texto' ? '#f0f9ff' : '#fff',
                  color: modoFonte === 'texto' ? '#0c4a6e' : '#475569',
                  fontWeight: 800, fontSize: '0.84rem', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: '1.35rem' }}>📝</span>
                <div>
                  <div>Colar Texto de Lista (Word / Docs)</div>
                  <div style={{ fontSize: '0.71rem', fontWeight: 500, color: '#64748b' }}>
                    Separa listas textuais nos 7 modelos, formata LaTeX e resolve gabaritos
                  </div>
                </div>
              </button>
            </div>

            {/* Dicas globais opcionais */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10,
              background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0',
            }}>
              <div>
                <label style={S.miniLabel}>Disciplina padrão (opcional — IA detecta automaticamente)</label>
                <select style={S.select} value={discPadrao} onChange={(e) => setDiscPadrao(e.target.value)}>
                  <option value="">✨ Detectar automaticamente por questão</option>
                  {DISCIPLINAS_LISTA.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={S.miniLabel}>Série padrão (opcional — IA sugere automaticamente)</label>
                <select style={S.select} value={seriePadrao} onChange={(e) => setSeriePadrao(e.target.value)}>
                  <option value="">✨ Sugerir automaticamente</option>
                  {SERIES_LISTA.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {modoFonte === 'visual' ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    processarArquivosEntrada(e.target.files);
                    e.target.value = '';
                  }}
                />

                {!pdfDoc && arquivosImagens.length === 0 ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
                    onDragLeave={() => setIsDrag(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDrag(false); processarArquivosEntrada(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDrag ? '#0284c7' : '#94a3b8'}`,
                      background: isDrag ? '#e0f2fe' : '#f8fafc',
                      borderRadius: 14, padding: '34px 24px', textAlign: 'center', cursor: 'pointer',
                      transition: 'all 0.18s',
                    }}
                  >
                    <div style={{ fontSize: '2.6rem', marginBottom: 8 }}>📑</div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                      Arraste seu PDF de Prova/Lista ou Fotos das Páginas (ou pressione Ctrl+V)
                    </div>
                    <div style={{ fontSize: '0.79rem', color: '#64748b', maxWidth: 560, margin: '0 auto' }}>
                      Suporta arquivos <strong>.PDF</strong> (com escolha das páginas que deseja extrair) ou múltiplas imagens <strong>PNG / JPG / WEBP</strong> em 1 ou 2 colunas.
                    </div>
                  </div>
                ) : pdfDoc ? (
                  /* Seletor Visual de Páginas do PDF */
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                          📕 {pdfNome} · <span style={{ color: '#0284c7' }}>{pdfTotalPaginas} página(s)</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Clique nas páginas que contêm as questões que deseja importar ({paginasSelecionadas.length} selecionada(s), máx. {MAX_PAGINAS_POR_LOTE} por lote)
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          style={S.smallGhostBtn}
                          onClick={() => setPaginasSelecionadas(
                            Array.from({ length: Math.min(pdfTotalPaginas, MAX_PAGINAS_POR_LOTE) }, (_, i) => i + 1)
                          )}
                        >
                          Selecionar {Math.min(pdfTotalPaginas, MAX_PAGINAS_POR_LOTE)} primeiras
                        </button>
                        <button type="button" style={S.smallGhostBtn} onClick={() => setPaginasSelecionadas([])}>
                          Limpar seleção
                        </button>
                        <button
                          type="button"
                          style={{ ...S.smallGhostBtn, color: '#dc2626', borderColor: '#fecaca' }}
                          onClick={() => { setPdfDoc(null); setPdfThumbs({}); setPaginasSelecionadas([]); }}
                        >
                          Trocar arquivo
                        </button>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(126px, 1fr))',
                      gap: 10, maxHeight: 310, overflowY: 'auto', padding: 4,
                    }}>
                      {Array.from({ length: pdfLimiteThumbs }, (_, i) => i + 1).map((pNum) => {
                        const checked = paginasSelecionadas.includes(pNum);
                        return (
                          <div
                            key={pNum}
                            onClick={() => togglePaginaPdf(pNum)}
                            style={{
                              borderRadius: 10, padding: 6, cursor: 'pointer', position: 'relative',
                              border: `2px solid ${checked ? '#0284c7' : '#e2e8f0'}`,
                              background: checked ? '#e0f2fe' : '#fff',
                              boxShadow: checked ? '0 3px 10px rgba(2,132,199,0.18)' : 'none',
                              transition: 'all 0.14s',
                            }}
                          >
                            <div style={{
                              position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 6,
                              background: checked ? '#0284c7' : 'rgba(255,255,255,0.9)',
                              border: `1.5px solid ${checked ? '#0284c7' : '#94a3b8'}`,
                              color: '#fff', fontWeight: 900, fontSize: '0.75rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {checked ? '✓' : ''}
                            </div>
                            {pdfThumbs[pNum] ? (
                              <img
                                src={pdfThumbs[pNum]}
                                alt={`Pág ${pNum}`}
                                style={{ width: '100%', height: 145, objectFit: 'contain', background: '#fff', borderRadius: 6 }}
                              />
                            ) : (
                              <div style={{ height: 145, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                                Carregando...
                              </div>
                            )}
                            <div style={{ textAlign: 'center', fontSize: '0.73rem', fontWeight: 800, color: checked ? '#0369a1' : '#475569', marginTop: 5 }}>
                              Página {pNum}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {pdfLimiteThumbs < pdfTotalPaginas && (
                      <div style={{ textAlign: 'center', marginTop: 10 }}>
                        <button type="button" style={S.smallGhostBtn} onClick={carregarMaisMiniaturasPdf} disabled={loadingPdf}>
                          {loadingPdf ? '⏳ Renderizando...' : `➕ Mostrar mais páginas (${pdfLimiteThumbs} de ${pdfTotalPaginas})`}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Lista de Múltiplas Fotos/Prints de Páginas */
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                        🖼️ {arquivosImagens.length} página(s)/folha(s) pronta(s) para individualização
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {arquivosImagens.length < MAX_PAGINAS_POR_LOTE && (
                          <button type="button" style={S.smallGhostBtn} onClick={() => fileInputRef.current?.click()}>
                            ➕ Adicionar mais folhas
                          </button>
                        )}
                        <button
                          type="button"
                          style={{ ...S.smallGhostBtn, color: '#dc2626', borderColor: '#fecaca' }}
                          onClick={() => setArquivosImagens([])}
                        >
                          Limpar tudo
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))', gap: 10 }}>
                      {arquivosImagens.map((arq, idx) => (
                        <div key={arq.id} style={{ background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: 6, position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => setArquivosImagens((p) => p.filter((x) => x.id !== arq.id))}
                            style={{
                              position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 99,
                              border: 'none', background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '0.7rem', cursor: 'pointer',
                            }}
                            title="Remover folha"
                          >✕</button>
                          <img src={arq.previewUrl} alt={arq.nome} style={{ width: '100%', height: 140, objectFit: 'contain', borderRadius: 6 }} />
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', textAlign: 'center', marginTop: 4 }}>
                            Folha {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Modo Texto Bruto */
              <div>
                <textarea
                  value={textoBruto}
                  onChange={(e) => setTextoBruto(e.target.value)}
                  placeholder={`Cole aqui sua lista completa de exercícios do Word, Google Docs ou PDF...\n\nExemplo:\nTexto para as questões 1 e 2:\n(...)\n\n1. (ENEM) Uma partícula move-se com velocidade constante...\na) 10 m/s\nb) 20 m/s\n...\n\n2. Julgue os itens a seguir em (V) Verdadeiro ou (F) Falso:\n( ) A energia mecânica se conserva na ausência de atrito...`}
                  style={{
                    width: '100%', minHeight: 240, padding: 14, borderRadius: 12,
                    border: '1.5px solid #cbd5e1', fontSize: '0.84rem', lineHeight: 1.6,
                    fontFamily: 'inherit', color: '#0f172a', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 4 }}>
                  💡 O Agente IA detecta automaticamente Múltipla Escolha, Afirmativas (I, II, III), V/F, Colunas, Lacunas, Somatória e Discursivas, além de converter fórmulas para LaTeX.
                </div>
              </div>
            )}

            {erroMsg && <div style={S.errorBanner}>⚠️ {erroMsg}</div>}

            <div style={S.footer}>
              <button type="button" style={S.secondaryBtn} onClick={fecharModal}>Cancelar</button>
              <button
                type="button"
                style={{
                  ...S.primaryBtn,
                  opacity: loadingPdf ? 0.65 : 1,
                }}
                disabled={loadingPdf}
                onClick={iniciarExtracao}
              >
                ✨ Individualizar Questões com IA
                {modoFonte === 'visual' && pdfDoc && paginasSelecionadas.length > 0 ? ` (${paginasSelecionadas.length} pág.)` : ''}
                {modoFonte === 'visual' && !pdfDoc && arquivosImagens.length > 0 ? ` (${arquivosImagens.length} folha(s))` : ''}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ETAPA 1.5 — PAINEL DE TELEMETRIA ASSÍNCRONA (ARQUITETURA GERAR HORÁRIOS)
        ══════════════════════════════════════════════════════════════════ */}
        {etapa === 'processando' && (() => {
          const totalP = Math.max(1, telemetria.totalPaginas || 1);
          const emAndamento = (telemetria.paginas || []).filter((p) => p.status === 'processando').length;
          const pctEnvio = telemetria.faseEnvio
            ? Math.round((telemetria.enviadas / totalP) * 18)
            : 18;
          const pctIA = Math.round(
            (((telemetria.concluidas + telemetria.comErro) + emAndamento * 0.45) / totalP) * 80
          );
          const pctTotal = Math.min(97, Math.max(8, pctEnvio + pctIA));

          return (
            <div style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Topo: Spinner + Status ao vivo + Cronômetro */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 14, flexWrap: 'wrap', background: '#f8fafc', padding: '14px 18px',
                borderRadius: 14, border: '1.5px solid #cbd5e1',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 240 }}>
                  <div style={S.spinner} />
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                      {telemetria.etapaAtual || 'Individualizando questões em segundo plano...'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>
                      Execução assíncrona em segundo plano (sem limite de 30s) · Recorte de figuras 300 DPI + LaTeX + Gabarito IA
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {telemetria.modeloAtivo && (
                    <span style={{
                      background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc',
                      borderRadius: 99, padding: '5px 11px', fontSize: '0.73rem', fontWeight: 800,
                    }}>
                      ⚡ {telemetria.modeloAtivo}
                    </span>
                  )}
                  <span style={{
                    background: '#0f172a', color: '#fff', borderRadius: 99,
                    padding: '6px 13px', fontSize: '0.82rem', fontWeight: 800, fontFamily: 'monospace',
                  }}>
                    ⏱️ {formatarCronometro(telemetria.elapsedSegundos)}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Contínua */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                  <span>Progresso global do lote</span>
                  <span>{pctTotal}%</span>
                </div>
                <div style={{ width: '100%', background: '#e2e8f0', height: 11, borderRadius: 99, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pctTotal}%`,
                      background: 'linear-gradient(90deg, #0e7490, #0284c7, #10b981)',
                      transition: 'width 0.45s ease',
                    }}
                  />
                </div>
              </div>

              {/* Cards de Telemetria (estilo Gerar Horários) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10 }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    📄 Páginas Processadas
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                    {telemetria.concluidas} <span style={{ fontSize: '0.84rem', color: '#64748b', fontWeight: 700 }}>/ {totalP}</span>
                  </div>
                </div>

                <div style={{
                  background: telemetria.totalQuestoes > 0 ? '#ecfdf5' : '#f8fafc',
                  border: `1.5px solid ${telemetria.totalQuestoes > 0 ? '#6ee7b7' : '#e2e8f0'}`,
                  borderRadius: 11, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: telemetria.totalQuestoes > 0 ? '#047857' : '#64748b', textTransform: 'uppercase' }}>
                    🎯 Questões Já Prontas
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: telemetria.totalQuestoes > 0 ? '#065f46' : '#0f172a', marginTop: 2 }}>
                    {telemetria.totalQuestoes} <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>individualizada(s)</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    🚀 Workers Paralelos
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0369a1', marginTop: 5 }}>
                    {emAndamento > 0 ? `${emAndamento} página(s) lendo simultaneamente` : 'Sincronizando fila...'}
                  </div>
                </div>
              </div>

              {/* Grade de Status por Página em Tempo Real */}
              {modoFonte === 'visual' && telemetria.paginas.length > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 8, maxHeight: 190, overflowY: 'auto', padding: 2,
                }}>
                  {telemetria.paginas.map((p) => {
                    const stMeta = {
                      preparando:  { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', badge: '📤 Enviando' },
                      fila:        { bg: '#f8fafc', border: '#cbd5e1', color: '#475569', badge: '⏳ Na Fila' },
                      processando: { bg: '#e0f2fe', border: '#0284c7', color: '#0c4a6e', badge: '🔄 Lendo na IA' },
                      concluida:   { bg: '#ecfdf5', border: '#10b981', color: '#065f46', badge: `✅ +${p.questoes_count} quest.` },
                      erro:        { bg: '#fef2f2', border: '#fca5a5', color: '#b91c1c', badge: '⚠️ Aviso' },
                    }[p.status] || { bg: '#f8fafc', border: '#cbd5e1', color: '#475569', badge: '⏳ Fila' };

                    return (
                      <div
                        key={p.ordem}
                        style={{
                          background: stMeta.bg,
                          border: `1.5px solid ${stMeta.border}`,
                          borderRadius: 10, padding: '8px 10px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
                        }}
                      >
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: stMeta.color }}>
                          Pág. {p.pagina_numero}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: stMeta.color }}>
                          {stMeta.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rodapé de Controle Imediato ("Parar e Usar Questões Já Prontas" ou Cancelar) */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0',
              }}>
                <button
                  type="button"
                  disabled={telemetria.parando}
                  onClick={pararOuCancelarJob}
                  style={S.smallGhostBtn}
                >
                  ✕ Cancelar importação
                </button>

                {telemetria.totalQuestoes > 0 && (
                  <button
                    type="button"
                    disabled={telemetria.parando}
                    onClick={pararOuCancelarJob}
                    style={{
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      padding: '10px 18px', fontSize: '0.82rem', fontWeight: 800,
                      cursor: telemetria.parando ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(5,150,105,0.28)',
                    }}
                  >
                    {telemetria.parando
                      ? '⏳ Abrindo fila...'
                      : `⏹️ Parar Agora e Revisar as ${telemetria.totalQuestoes} Questões Já Prontas`}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════
            ETAPA 2 — FILA DE REVISÃO INDIVIDUAL 1 A 1 (LADO A LADO)
        ══════════════════════════════════════════════════════════════════ */}
        {etapa === 'revisao' && currentItem && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Barra Horizontal Navegável da Fila (Q1, Q2, Q3...) */}
            <div style={{
              display: 'flex', gap: 7, overflowX: 'auto', padding: '10px 18px',
              background: '#f8fafc', borderBottom: '1px solid #e2e8f0', alignItems: 'center',
            }}>
              {fila.map((q, idx) => {
                const isAtiva = idx === activeIdx;
                const statusColors = {
                  pendente:         { bg: '#fff',    border: '#cbd5e1', text: '#334155', dot: '⏳' },
                  salva_escola:     { bg: '#ecfdf5', border: '#10b981', text: '#065f46', dot: '🏫' },
                  publicada_global: { bg: '#e0f2fe', border: '#0284c7', text: '#075985', dot: '🌐' },
                  ignorada:         { bg: '#f1f5f9', border: '#cbd5e1', text: '#94a3b8', dot: '⏭️' },
                }[q.status_fila] || { bg: '#fff', border: '#cbd5e1', text: '#334155', dot: '⏳' };

                return (
                  <button
                    key={q.uid}
                    type="button"
                    onClick={() => { setActiveIdx(idx); setErroItem(''); setVerPaginaInteira(false); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                      padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
                      background: isAtiva ? '#0f172a' : statusColors.bg,
                      color: isAtiva ? '#fff' : statusColors.text,
                      border: `2px solid ${isAtiva ? '#0284c7' : statusColors.border}`,
                      fontWeight: 800, fontSize: '0.76rem',
                    }}
                  >
                    <span>{statusColors.dot}</span>
                    <span>Q{idx + 1}</span>
                    <span style={{ opacity: 0.78, fontWeight: 600 }}>
                      {TIPO_META[q.tipo]?.emoji || '🔘'}
                    </span>
                    {q.codigo_escola && (
                      <span style={{
                        fontFamily: 'monospace', fontSize: '0.68rem',
                        background: isAtiva ? 'rgba(16,185,129,0.25)' : '#d1fae5',
                        color: isAtiva ? '#6ee7b7' : '#065f46',
                        padding: '1px 5px', borderRadius: 4,
                      }}>
                        {q.codigo_global || q.codigo_escola}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Corpo Dividido: Esquerda (Página/Recorte + SmartMediaCard) | Direita (Preview/Edição + Gabarito) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: currentItem.pagina_local_preview || currentItem.midia ? 'minmax(300px, 38%) 1fr' : '1fr',
              gap: 16, padding: '14px 18px', overflowY: 'auto', maxHeight: '64vh',
            }}>
              {/* ── COLUNA ESQUERDA: Origem Visual + Mídia Independente ── */}
              {(currentItem.pagina_local_preview || currentItem.midia) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {currentItem.pagina_local_preview && (
                    <RecortePaginaPreview
                      pageSrc={currentItem.pagina_local_preview}
                      questaoBbox={currentItem.questao_bbox}
                      verPaginaInteira={verPaginaInteira}
                      onTogglePaginaInteira={() => setVerPaginaInteira((v) => !v)}
                    />
                  )}

                  {/* Card Independente de Figura da Questão */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 11, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0e7490', textTransform: 'uppercase' }}>
                        🖼️ Figura Independente desta Questão
                      </span>
                      {!currentItem.midia && currentItem.pagina_original_url && (
                        <button
                          type="button"
                          onClick={() => setShowManualCropModal(true)}
                          style={{
                            background: '#f0f9ff', color: '#0369a1', border: '1px solid #7dd3fc',
                            borderRadius: 7, padding: '4px 9px', fontSize: '0.71rem', fontWeight: 800, cursor: 'pointer',
                          }}
                        >
                          ✂️ Recortar Figura da Página
                        </button>
                      )}
                    </div>

                    <SmartMediaCard
                      imagem={currentItem.imagem}
                      midia={currentItem.midia}
                      onChange={(novaUrl, novaMidia) => {
                        patchCurrentItem({ imagem: novaUrl, imagem_url: novaUrl, midia: novaMidia });
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ── COLUNA DIREITA: Metadados, Preview / Edição Rápida e Confirmação de Gabarito ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                {/* Barra compacta editável de Classificação */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 8,
                  background: '#f8fafc', padding: 10, borderRadius: 11, border: '1px solid #e2e8f0',
                }}>
                  <div>
                    <label style={S.miniLabel}>Modelo (7 Tipos)</label>
                    <select style={S.selectCompact} value={currentItem.tipo} onChange={(e) => mudarTipoItemAtual(e.target.value)}>
                      {Object.entries(TIPO_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.emoji} {v.short}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={S.miniLabel}>Disciplina *</label>
                    <select style={S.selectCompact} value={currentItem.disciplina || ''} onChange={(e) => patchCurrentItem({ disciplina: e.target.value })}>
                      <option value="">Selecione...</option>
                      {DISCIPLINAS_LISTA.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.miniLabel}>Série</label>
                    <select style={S.selectCompact} value={currentItem.serie || ''} onChange={(e) => patchCurrentItem({ serie: e.target.value })}>
                      <option value="">Todas</option>
                      {SERIES_LISTA.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.miniLabel}>Dificuldade</label>
                    <select style={S.selectCompact} value={currentItem.nivel || 'medio'} onChange={(e) => patchCurrentItem({ nivel: e.target.value })}>
                      {NIVEIS_LISTA.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.miniLabel}>Banca / Fonte</label>
                    <input
                      style={S.inputCompact}
                      value={currentItem.fonte || ''}
                      onChange={(e) => patchCurrentItem({ fonte: e.target.value })}
                      placeholder="Ex: ENEM 2024"
                    />
                  </div>
                  <div>
                    <label style={S.miniLabel}>BNCC</label>
                    <input
                      style={S.inputCompact}
                      value={currentItem.habilidade_bncc || ''}
                      onChange={(e) => patchCurrentItem({ habilidade_bncc: e.target.value.toUpperCase() })}
                      placeholder="Ex: EM13MAT302"
                    />
                  </div>
                </div>

                {/* Alternador Preview Formatado vs Edição Rápida + Abrir no Estúdio */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 9 }}>
                    <button
                      type="button"
                      onClick={() => setAbaDireita('preview')}
                      style={{
                        padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.77rem', fontWeight: 800,
                        background: abaDireita === 'preview' ? '#fff' : 'transparent',
                        color: abaDireita === 'preview' ? '#0f172a' : '#64748b',
                        boxShadow: abaDireita === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      👁️ Visualização Editorial
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbaDireita('editar')}
                      style={{
                        padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.77rem', fontWeight: 800,
                        background: abaDireita === 'editar' ? '#fff' : 'transparent',
                        color: abaDireita === 'editar' ? '#0284c7' : '#64748b',
                        boxShadow: abaDireita === 'editar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      ✏️ Editar Campos / Alternativas
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {currentItem.numero_original && (
                      <span style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 700 }}>
                        Nº na folha: <strong>{currentItem.numero_original}</strong> (Pág. {currentItem.pagina_origem || 1})
                      </span>
                    )}
                    {onAbrirNoEstudio && (
                      <button
                        type="button"
                        onClick={() => onAbrirNoEstudio(currentItem)}
                        style={S.smallGhostBtn}
                        title="Carrega esta questão no Estúdio Completo de 4 blocos"
                      >
                        🔧 Abrir no Estúdio Completo
                      </button>
                    )}
                  </div>
                </div>

                {/* Conteúdo Principal: Preview ou Edição */}
                {abaDireita === 'preview' ? (
                  <div style={{
                    background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12,
                    padding: '16px 18px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                  }}>
                    <QuestaoCorpoEstruturado questao={currentItem} showGabarito={true} />
                  </div>
                ) : (
                  <div style={{
                    background: '#fff', border: '1.5px solid #bae6fd', borderRadius: 12,
                    padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    <div>
                      <label style={S.miniLabel}>Texto de Apoio / Texto Base Compartilhado (opcional)</label>
                      <textarea
                        style={{ ...S.textareaCompact, minHeight: 68 }}
                        value={currentItem.texto_apoio || ''}
                        onChange={(e) => patchCurrentItem({ texto_apoio: e.target.value })}
                        placeholder="Texto base antes do enunciado..."
                      />
                    </div>
                    <div>
                      <label style={S.miniLabel}>Enunciado Principal * (use $...$ para LaTeX inline ou $$...$$ para equação em destaque)</label>
                      <textarea
                        ref={enunciadoEditRef}
                        style={{ ...S.textareaCompact, minHeight: 88 }}
                        value={currentItem.enunciado || ''}
                        onChange={(e) => patchCurrentItem({ enunciado: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={S.miniLabel}>Comando Final / Pergunta Pós-Figura (opcional)</label>
                      <input
                        style={S.inputCompact}
                        value={currentItem.comando_final || ''}
                        onChange={(e) => patchCurrentItem({ comando_final: e.target.value })}
                        placeholder="Ex: Assinale a alternativa correta:"
                      />
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                      <ModelosEditor
                        tipo={currentItem.tipo}
                        estrutura={currentItem.estrutura}
                        onChangeEstrutura={(novaEst) => {
                          const letraInf = inferirLetraCorretaPorEstrutura(
                            currentItem.tipo,
                            novaEst,
                            currentItem.alternativas,
                            `${currentItem.enunciado || ''} ${currentItem.comando_final || ''}`
                          );
                          const altsSincronizadas = letraInf
                            ? (currentItem.alternativas || []).map((a) => ({
                                ...a,
                                correta: String(a.letra || '').toUpperCase().trim() === letraInf,
                              }))
                            : currentItem.alternativas;
                          patchCurrentItem({
                            estrutura: novaEst,
                            alternativas: altsSincronizadas,
                            gabarito: letraInf || currentItem.gabarito,
                            gabarito_confirmado: true,
                          });
                        }}
                        alternativas={currentItem.alternativas}
                        onChangeAlternativas={(novasAlts) => patchCurrentItem({ alternativas: novasAlts, gabarito_confirmado: true })}
                        onMarcarCorreta={marcarCorretaItemAtual}
                        respostaAberta={currentItem.resposta_aberta || ''}
                        onChangeRespostaAberta={(val) => patchCurrentItem({ resposta_aberta: val })}
                        enunciado={currentItem.enunciado || ''}
                        onChangeEnunciado={(val) => patchCurrentItem({ enunciado: val })}
                        enunciadoRef={enunciadoEditRef}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={S.miniLabel}>Temas / Conteúdos *</label>
                        <TagsInput
                          tags={currentItem.temas || []}
                          onChange={(novosTemas) => patchCurrentItem({ temas: novosTemas })}
                        />
                      </div>
                      <div>
                        <label style={S.miniLabel}>Resolução Comentada do Professor</label>
                        <textarea
                          style={{ ...S.textareaCompact, minHeight: 62 }}
                          value={currentItem.explicacao || ''}
                          onChange={(e) => patchCurrentItem({ explicacao: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Card de Gabarito + Confirmação em 1 Clique (Regra Oficial #3) */}
                <div style={{
                  padding: '11px 14px', borderRadius: 11,
                  background: currentItem.gabarito_confirmado ? '#ecfdf5' : '#fffbeb',
                  border: `1.5px solid ${currentItem.gabarito_confirmado ? '#6ee7b7' : '#f59e0b'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: currentItem.gabarito_confirmado ? '#065f46' : '#92400e' }}>
                      {currentItem.gabarito_origem === 'marcado_na_imagem'
                        ? `✅ Gabarito identificado no material original: ${resumirGabaritoQuestao(currentItem)}`
                        : currentItem.gabarito_confirmado
                          ? `✅ Gabarito revisado e confirmado: ${resumirGabaritoQuestao(currentItem)}`
                          : `🧠 Gabarito resolvido pelo Agente IA: ${resumirGabaritoQuestao(currentItem)}`}
                    </div>

                    {!currentItem.gabarito_confirmado && currentItem.tipo !== 'discursiva' && (
                      <button
                        type="button"
                        onClick={() => patchCurrentItem({ gabarito_confirmado: true })}
                        style={{
                          background: '#059669', color: '#fff', border: 'none', borderRadius: 8,
                          padding: '6px 13px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(5,150,105,0.28)',
                        }}
                      >
                        ✓ Confirmar Gabarito ({resumirGabaritoQuestao(currentItem)})
                      </button>
                    )}
                  </div>

                  {currentItem.explicacao && (
                    <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.58, marginTop: 6, whiteSpace: 'pre-line' }}>
                      <MathText text={currentItem.explicacao} />
                    </div>
                  )}
                </div>

                {erroItem && <div style={S.errorBanner}>⚠️ {erroItem}</div>}
              </div>
            </div>

            {/* Rodapé de Ação 1 a 1 */}
            <div style={S.footerQueue}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={S.smallGhostBtn}
                  disabled={activeIdx === 0 || Boolean(salvandoAcao)}
                  onClick={() => { setActiveIdx((i) => Math.max(0, i - 1)); setErroItem(''); }}
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  style={S.smallGhostBtn}
                  disabled={activeIdx >= fila.length - 1 || Boolean(salvandoAcao)}
                  onClick={() => { setActiveIdx((i) => Math.min(fila.length - 1, i + 1)); setErroItem(''); }}
                >
                  Próxima →
                </button>
                <button
                  type="button"
                  style={{ ...S.smallGhostBtn, color: '#64748b' }}
                  disabled={Boolean(salvandoAcao)}
                  onClick={ignorarQuestaoAtual}
                >
                  ⏭️ Ignorar e Avançar
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {currentItem.codigo_escola && (
                  <button
                    type="button"
                    onClick={() => copiarTexto(currentItem.codigo_global || currentItem.codigo_escola)}
                    style={{
                      background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7',
                      borderRadius: 8, padding: '7px 11px', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer',
                    }}
                    title="Clique para copiar o código"
                  >
                    {copiadoCodigo === (currentItem.codigo_global || currentItem.codigo_escola)
                      ? '✓ Copiado!'
                      : `📋 ${currentItem.codigo_global || currentItem.codigo_escola}`}
                  </button>
                )}

                <button
                  type="button"
                  disabled={Boolean(salvandoAcao)}
                  onClick={() => salvarQuestaoAtual(false)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '10px 16px', borderRadius: 10, border: '1.5px solid #0e7490',
                    background: 'linear-gradient(135deg, #0f172a, #0e7490)',
                    color: '#fff', fontWeight: 800, fontSize: '0.82rem', cursor: salvandoAcao ? 'not-allowed' : 'pointer',
                  }}
                >
                  {salvandoAcao === 'escola'
                    ? '⏳ Salvando na Escola...'
                    : currentItem.questao_id_salva
                      ? '🏫 Atualizar na Escola → Próxima'
                      : '🏫 Salvar no Banco da Escola → Próxima'}
                </button>

                <button
                  type="button"
                  disabled={Boolean(salvandoAcao)}
                  onClick={() => salvarQuestaoAtual(true)}
                  style={{
                    ...S.primaryBtn,
                    padding: '10px 16px',
                  }}
                >
                  {salvandoAcao === 'global'
                    ? '⏳ Publicando no Global...'
                    : '🌐 Salvar & Publicar no Global → Próxima'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ETAPA 3 — RESUMO FINAL COM CÓDIGOS EMQE / EMQG COPIÁVEIS
        ══════════════════════════════════════════════════════════════════ */}
        {etapa === 'resumo' && (
          <div style={S.body}>
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5, #f0f9ff)',
              border: '1.5px solid #6ee7b7', borderRadius: 12, padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#065f46' }}>
                  🎉 Revisão da Lista Concluída — {totalSalvas} de {fila.length} questão(ões) salva(s)!
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 2 }}>
                  Clique em qualquer código abaixo para copiá-lo ou volte à fila caso deseje revisar questões pendentes/ignoradas.
                </div>
              </div>
              {fila.length > 0 && (
                <button type="button" style={S.smallGhostBtn} onClick={() => setEtapa('revisao')}>
                  ← Voltar à Fila de Revisão
                </button>
              )}
            </div>

            <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 11 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>#</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>Questão / Modelo</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>Disciplina</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>Status & Código Único</th>
                  </tr>
                </thead>
                <tbody>
                  {fila.map((q, idx) => (
                    <tr key={q.uid} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>
                        Q{idx + 1}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'left', color: '#0f172a' }}>
                        <span style={{ fontWeight: 700 }}>{TIPO_META[q.tipo]?.emoji} {TIPO_META[q.tipo]?.short}</span>
                        {' · '}
                        <span style={{ color: '#64748b' }}>
                          {String(q.enunciado || '').slice(0, 68)}{String(q.enunciado || '').length > 68 ? '...' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'left', color: '#334155', fontWeight: 600 }}>
                        {q.disciplina || '—'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {q.codigo_escola && (
                            <button
                              type="button"
                              onClick={() => copiarTexto(q.codigo_escola)}
                              style={{
                                background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7',
                                borderRadius: 6, padding: '2px 8px', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.73rem', cursor: 'pointer',
                              }}
                            >
                              {copiadoCodigo === q.codigo_escola ? '✓ Copiado' : `🏫 ${q.codigo_escola}`}
                            </button>
                          )}
                          {q.codigo_global && (
                            <button
                              type="button"
                              onClick={() => copiarTexto(q.codigo_global)}
                              style={{
                                background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc',
                                borderRadius: 6, padding: '2px 8px', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.73rem', cursor: 'pointer',
                              }}
                            >
                              {copiadoCodigo === q.codigo_global ? '✓ Copiado' : `🌐 ${q.codigo_global}`}
                            </button>
                          )}
                          {!q.codigo_escola && (
                            <button
                              type="button"
                              onClick={() => { setActiveIdx(idx); setEtapa('revisao'); }}
                              style={{
                                background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1',
                                borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              {q.status_fila === 'ignorada' ? '⏭️ Ignorada (Revisar)' : '⏳ Pendente (Revisar)'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={S.footer}>
              <button
                type="button"
                style={S.secondaryBtn}
                onClick={() => {
                  setFila([]);
                  setEtapa('upload');
                  setErroMsg('');
                }}
              >
                📥 Importar Outra Lista / PDF
              </button>
              <button type="button" style={S.primaryBtn} onClick={fecharModal}>
                ✅ Concluir e Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Recorte Manual Direto sobre a Página Original (quando a questão não tinha recorte automático) */}
      {showManualCropModal && currentItem?.pagina_original_url && (
        <ImageCropperModal
          midia={{
            original_url: currentItem.pagina_original_url,
            url: currentItem.pagina_original_url,
            bbox: currentItem.questao_bbox || [150, 100, 750, 900],
          }}
          onApply={(novaUrl, novaMidia) => {
            patchCurrentItem({ imagem: novaUrl, imagem_url: novaUrl, midia: novaMidia });
            setShowManualCropModal(false);
          }}
          onClose={() => setShowManualCropModal(false)}
        />
      )}
    </div>
  );
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
  },
  modal: {
    background: '#fff', borderRadius: 16, width: '100%',
    maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(15, 23, 42, 0.36)',
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 60%, #0284c7 100%)',
    padding: '15px 20px', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  headerIcon: {
    width: 40, height: 40, borderRadius: 11,
    background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.35rem', flexShrink: 0,
  },
  headerTitle: { fontSize: '0.98rem', fontWeight: 800, letterSpacing: '-0.01em' },
  headerSubtitle: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8, border: 'none',
    background: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 800, cursor: 'pointer',
  },
  body: {
    padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14,
  },
  miniLabel: {
    display: 'block', fontSize: '0.67rem', fontWeight: 800, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
  },
  select: {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
    fontSize: '0.82rem', color: '#0f172a', background: '#fff', fontFamily: 'inherit',
  },
  selectCompact: {
    width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid #cbd5e1',
    fontSize: '0.78rem', color: '#0f172a', background: '#fff', fontFamily: 'inherit', fontWeight: 600,
  },
  inputCompact: {
    width: '100%', padding: '6px 9px', borderRadius: 7, border: '1px solid #cbd5e1',
    fontSize: '0.78rem', color: '#0f172a', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  textareaCompact: {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
    fontSize: '0.82rem', color: '#0f172a', background: '#fff', fontFamily: 'inherit',
    lineHeight: 1.55, resize: 'vertical', boxSizing: 'border-box',
  },
  smallGhostBtn: {
    padding: '6px 11px', borderRadius: 8, border: '1px solid #cbd5e1',
    background: '#fff', color: '#334155', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
  },
  errorBanner: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
    padding: '10px 14px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600,
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9',
  },
  footerQueue: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    padding: '12px 18px', background: '#f8fafc', borderTop: '1.5px solid #e2e8f0',
  },
  secondaryBtn: {
    padding: '10px 18px', borderRadius: 10, border: '1px solid #cbd5e1',
    background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
  },
  primaryBtn: {
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #0284c7, #0e7490)',
    color: '#fff', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.28)',
  },
  spinner: {
    width: 44, height: 44, borderRadius: '50%',
    border: '4px solid #e0f2fe', borderTopColor: '#0284c7',
    animation: 'bq-spin 0.8s linear infinite',
  },
};
