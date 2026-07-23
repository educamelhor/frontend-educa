// src/features/professores/provas/Provas.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AREAS, TEMPLATES, SERIES_OPTIONS, TURNOS_OPTIONS, BIMESTRES_OPTIONS } from './templateDefinitions';
import CapaPreview from './CapaPreview';
import useEscolaLogos from '../../../hooks/useEscolaLogos';
import { jsPDF } from 'jspdf';

const ANO_CORRENTE = new Date().getFullYear();

// ── Utilitários de cor para manipulação de pixels no canvas ──────────────────
function _rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0;
  const l = (max+min)/2;
  if (max !== min) {
    const d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return [h*360, s*100, l*100];
}

function _hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1-l);
  const f = n => {
    const k = (n + h/30) % 12;
    return Math.round(255*(l - a*Math.max(Math.min(k-3,9-k,1),-1)));
  };
  return [f(0), f(8), f(4)];
}

function _hexToHsl(hex) {
  return _rgbToHsl(
    parseInt(hex.slice(1,3),16),
    parseInt(hex.slice(3,5),16),
    parseInt(hex.slice(5,7),16)
  );
}

/**
 * Percorre os pixels do canvas e substitui pixels cuja matiz (hue) esteja
 * próxima de `fromHex` pela matiz de `toHex`, preservando luminosidade.
 * Pixels neutros (baixa saturação) ou de hue diferente não são alterados.
 */
function recolorCanvas(ctx, W, H, fromHex, toHex) {
  const [fH] = _hexToHsl(fromHex);
  const [tH, tS] = _hexToHsl(toHex);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] < 20) continue; // skip transparente
    const [h, s, l] = _rgbToHsl(d[i], d[i+1], d[i+2]);
    // Distância de matiz com wrap-around (0–360°)
    const dist = Math.min(Math.abs(h-fH), 360-Math.abs(h-fH));
    // Só altera pixels coloridos (s>20%) com hue próximo ao da área (±45°)
    if (s > 20 && dist < 45) {
      const newS = tS > 0 ? Math.max(tS * (s/100), 20) : 0;
      const [nr, ng, nb] = _hslToRgb(tH, newS, l);
      d[i] = nr; d[i+1] = ng; d[i+2] = nb;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function getToken() { return localStorage.getItem('token'); }
function getEscolaId() { return localStorage.getItem('escola_id'); }
function getApiRoot() {
  const env = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (env) return String(env).replace(/\/api$/, '').replace(/\/$/, '');
  if (window.location.hostname === 'localhost') return 'http://localhost:3000';
  return 'https://educa-backend-docker-659zo.ondigitalocean.app';
}
const API = getApiRoot();

function authH() {
  return { Authorization: `Bearer ${getToken()}`, 'x-escola-id': getEscolaId() || '' };
}

export default function CapasProvas() {
  const [activeTab, setActiveTab] = useState('capas'); // 'capas' | 'nova'
  const [step, setStep] = useState(1); // wizard step 1-3
  const [capas, setCapas] = useState([]);
  const [loadingCapas, setLoadingCapas] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingCapaId, setEditingCapaId] = useState(null); // null = nova | id = editando
  const [confirmDelete, setConfirmDelete] = useState(null); // null | { id, titulo }

  // ── Custom image state ─────────────────────────────────────────────
  const [customImage, setCustomImage] = useState(null); // dataURL
  const [noCustomImage, setNoCustomImage] = useState(false); // usuário optou por nenhuma imagem
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [imageHeight, setImageHeight] = useState(200);  // altura em px (escala 1:1)
  const [imageWidthPct, setImageWidthPct] = useState(100); // largura em % (50–100)
  const fileInputRef = useRef(null);
  const previewCaptureRef = useRef(null);

  // ── Custom color state ─────────────────────────────────────────────────
  const [customColor, setCustomColor] = useState(null); // null = usar cor da área

  // Wizard state
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({
    titulo: '',
    serie: '',
    turno: '',
    bimestre: 1,
    ano: ANO_CORRENTE,
    instrucoes: '',
    avaliacao_id: '',
    turma_id: '',
  });

  const [avaliacoes, setAvaliacoes] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [todasTurmas, setTodasTurmas] = useState([]); // todas as turmas da escola

  const loadAvaliacoes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/gabarito-avaliacoes`, { headers: authH() });
      const data = await res.json();
      setAvaliacoes(data || []);
    } catch (err) {
      console.error('Erro ao carregar avaliações', err);
    }
  }, []);

  const loadTodasTurmas = useCallback(async (ano) => {
    try {
      // Filtra pelo ano letivo para não buscar turmas de outros anos
      const url = ano
        ? `${API}/api/turmas?ano=${ano}`
        : `${API}/api/turmas`;
      const res = await fetch(url, { headers: authH() });
      const data = await res.json();
      setTodasTurmas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar turmas da escola', err);
    }
  }, []);

  const loadTurmas = useCallback(async (avaliacaoId) => {
    if (!avaliacaoId) {
      setTurmas([]);
      return;
    }
    try {
      const res = await fetch(`${API}/api/gabarito-avaliacoes/${avaliacaoId}/turmas-vinculadas`, { headers: authH() });
      const data = await res.json();
      setTurmas(data || []);
    } catch (err) {
      console.error('Erro ao carregar turmas vinculadas', err);
    }
  }, []);

  // Filtragem inteligente de avaliações (Opção B)
  // Filtra por Bimestre, Turno, Ano e Série (via lookup nas turmas da escola)
  const avaliacoesFiltradas = React.useMemo(() => {
    return avaliacoes.filter(av => {
      // Filtro por bimestre: s\u00f3 filtra se AMBOS est\u00e3o definidos
      // O BD pode armazenar bimestre como n\u00famero (2) ou como texto ("2º Bimestre")
      // parseInt("2º Bimestre") = 2, parseInt("2") = 2 — funciona para ambos os formatos
      if (form.bimestre && av.bimestre) {
        const avBim = parseInt(String(av.bimestre), 10);
        if (!isNaN(avBim) && avBim !== Number(form.bimestre)) return false;
      }

      // Filtro por turno: case-insensitive; se o gabarito não tem turno, deixa passar
      if (form.turno && av.turno) {
        if (av.turno.toUpperCase().trim() !== form.turno.toUpperCase().trim()) return false;
      }

      // Filtro por ano letivo (usando o ano de criação do gabarito)
      if (form.ano && av.created_at) {
        const anoGabarito = new Date(av.created_at).getFullYear();
        if (anoGabarito !== Number(form.ano)) return false;
      }

      // Filtro por série (Opção B): ao menos uma turma vinculada deve pertencer à série
      // Se o gabarito não tem turmas_ids (criado por turno inteiro), deixa passar
      if (form.serie && todasTurmas.length > 0 && av.turmas_ids && av.turmas_ids.length > 0) {
        // Normaliza os ids para comparar como números
        const idsGabarito = av.turmas_ids.map(Number);
        const turmasDoGabarito = todasTurmas.filter(t => idsGabarito.includes(Number(t.id)));
        const serieUpper = form.serie.toUpperCase().trim();
        // A API retorna o nome da turma no campo 'turma' (alias de nome) e a série no campo 'serie'
        const temSerie = turmasDoGabarito.some(t => {
          const nomeTurma = (t.turma || t.nome || '').toUpperCase();
          const serieTurma = (t.serie || '').toUpperCase();
          return nomeTurma.includes(serieUpper) || serieTurma.includes(serieUpper);
        });
        if (!temSerie) return false;
      }

      return true;
    });
  }, [avaliacoes, todasTurmas, form.bimestre, form.turno, form.ano, form.serie]);

  // Se a avaliação selecionada sair da lista filtrada, resetar
  useEffect(() => {
    if (form.avaliacao_id && avaliacoesFiltradas.length > 0) {
      const ainda = avaliacoesFiltradas.some(av => String(av.id) === String(form.avaliacao_id));
      if (!ainda) {
        setForm(f => ({ ...f, avaliacao_id: '', turma_id: '' }));
      }
    }
  }, [avaliacoesFiltradas, form.avaliacao_id]);

  useEffect(() => { loadAvaliacoes(); }, [loadAvaliacoes]);
  useEffect(() => { loadTodasTurmas(form.ano); }, [loadTodasTurmas, form.ano]);
  useEffect(() => { loadTurmas(form.avaliacao_id); }, [form.avaliacao_id, loadTurmas]);

  const { logoEsquerda, logoDireita } = useEscolaLogos();
  const escolaNome = localStorage.getItem('escola_nome') || 'ESCOLA';

  // ── Toast helper ────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Image upload handler ────────────────────────────────────────────────
  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setCustomImage(ev.target.result);
      setNoCustomImage(false); // inserir imagem cancela o "sem imagem"
      setImageZoom(1); setImageOffsetX(0); setImageOffsetY(0);
      setImageHeight(200);
      setImageWidthPct(100);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function removeCustomImage() {
    setCustomImage(null);
    setNoCustomImage(false);
    setImageZoom(1); setImageOffsetX(0); setImageOffsetY(0);
    setImageHeight(200);
    setImageWidthPct(100);
  }

  // ── Load capas ──────────────────────────────────────────────────────────
  const loadCapas = useCallback(async () => {
    setLoadingCapas(true);
    try {
      const res = await fetch(`${API}/api/capa-provas`, { headers: authH() });
      const data = await res.json();
      if (data.ok) setCapas(data.capas || []);
    } catch (err) {
      showToast('Erro ao carregar capas.', 'error');
    } finally {
      setLoadingCapas(false);
    }
  }, []);

  useEffect(() => { loadCapas(); }, [loadCapas]);

  // ── Wizard navigation ───────────────────────────────────────────────────
  function goToStep(n) {
    if (n === 2 && !selectedArea) return;
    if (n === 3 && !selectedTemplate) return;
    setStep(n);
  }

  function selectArea(area) {
    setSelectedArea(area);
    setForm(f => ({
      ...f,
      titulo: `PROVÃO DE ${area.label}`,
      instrucoes: area.instrucoesPadrao,
    }));
    setStep(2);
  }

  function selectTemplate(t) {
    setSelectedTemplate(t);
    setStep(3);
  }

  // ── Generate PDF ────────────────────────────────────────────────────────
  async function handleGerar() {
    if (!selectedArea || !selectedTemplate) return;
    if (!form.titulo.trim() || !form.bimestre || !form.ano) {
      showToast('Preencha título, bimestre e ano.', 'error');
      return;
    }
    setGenerating(true);
    try {
      // 1) Salvar registro da capa no backend
      const res = await fetch(`${API}/api/capa-provas`, {
        method: 'POST',
        headers: { ...authH(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          area: selectedArea.id,
          serie: form.serie || null,
          turno: form.turno || null,
          bimestre: form.bimestre,
          ano: form.ano,
          template_id: selectedTemplate.id,
          instrucoes: form.instrucoes.trim() || null,
          avaliacao_id: form.avaliacao_id || null,
          turma_id: form.turma_id || null,
        }),
      });
      const created = await res.json();
      if (!created.ok) throw new Error(created.message || 'Erro ao salvar capa.');

      const fileName = `capa-${selectedArea.id.toLowerCase()}-${form.bimestre}bim-${form.ano}.pdf`;

      // Monta URL do PDF com parâmetros opcionais:
      // - ?color=   → backend gera com cor correta desde o início
      // - &noImage=1 → backend omite a imagem temática padrão
      const hasCustomColor = customColor && customColor.toLowerCase() !== selectedArea.cor.toLowerCase();
      const pdfParams = new URLSearchParams();
      if (hasCustomColor)  pdfParams.set('color', customColor);
      if (customImage || noCustomImage) pdfParams.set('noImage', '1');
      const pdfParamStr = pdfParams.toString() ? `?${pdfParams.toString()}` : '';
      const pdfRes = await fetch(`${API}/api/capa-provas/${created.id}/pdf${pdfParamStr}`, { headers: authH() });
      if (!pdfRes.ok) throw new Error('Erro ao gerar PDF.');
      const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());

      // Usa canvas quando há imagem customizada para sobrepor OU quando o usuário
      // optou por "sem imagem" — neste caso, o canvas garante a limpeza da zona
      // mesmo que o backend não tenha removido a imagem padrão via ?noImage=1.
      const needsCanvas = !!customImage || noCustomImage;

      if (needsCanvas) {
        // ── Canvas pipeline: renderiza PDF → limpa zona de imagem → [overlay] ──
        // noCustomImage: apenas limpa (zona fica branca)
        // customImage: limpa e desenha imagem do usuário por cima

        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        // Renderiza página 1 em canvas 2× (1190×1684px)
        const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        // ══ PASSO 1: Limpar zona completa do template (remove coliseu totalmente) ══
        // Valores medidos com PDFKit real (instrTextH HUMANAS, font 8.8pt, lineGap 0.5, paraGap 2)
        // clearY DEVE ser >= instrTextEnd para não clipar o item 7:
        //
        // T1 Clássico:  instrEnd=969px, imageStart=1057px → clearY=1030px (centro do gap)
        // T2 Moderno:   instrEnd=979px, imageStart=999px  → clearY=990px  (centro do gap)
        // T3 Formal:    instrEnd=1035px, imageStart=1051px → clearY=1044px (centro do gap)
        // T4 Colorido:  instrEnd=1015px, imageStart=1103px → clearY=1060px (centro do gap)
        // T5 Dark:      instrEnd=949px,  imageStart=1037px → clearY=993px  (centro do gap)
        const TEMPLATE_ZONES = {
          1: { x: 72,  y: 1030, w: 1046, maxY: 1614 },
          2: { x: 124, y: 990,  w: 1066, maxY: 1646 },
          3: { x: 48,  y: 1044, w: 1094, maxY: 1634 },
          4: { x: 0,   y: 1060, w: 1190, maxY: 1646 },
          5: { x: 0,   y: 993,  w: 1190, maxY: 1646 },
        };
        const cz = TEMPLATE_ZONES[selectedTemplate.id] || TEMPLATE_ZONES[2];

        // Tenta refinar com headers CORS do backend quando disponíveis
        const hX = parseInt(pdfRes.headers.get('X-Image-Zone-X') || '');
        const hY = parseInt(pdfRes.headers.get('X-Image-Zone-Y') || '');
        const SCALE = 2;
        const clearX    = hX > 0 ? hX * SCALE : cz.x;
        const clearY    = hY > 0 ? hY * SCALE : cz.y;
        const clearW    = cz.w;
        const clearMaxY = cz.maxY;

        // Apaga TUDO na zona (clearRect remove pixels do pdfjs independente de ?noImage=1)
        ctx.clearRect(clearX, clearY, clearW, clearMaxY - clearY);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(clearX, clearY, clearW, clearMaxY - clearY);

        // ══ PASSO 2: Desenhar imagem do usuário (somente se não for "Sem imagem") ════
        if (customImage) {
          const zoneW = clearW;
          const zoneH_max = clearMaxY - clearY; // altura máxima disponível

          // Largura: imageWidthPct% da zona, centrada
          const drawW  = Math.min((imageWidthPct / 100) * zoneW, zoneW);
          const drawX  = clearX + (zoneW - drawW) / 2;

          // Altura: imageHeight pts × 2, limitada ao máximo da zona
          const drawH  = Math.min(imageHeight * 2, zoneH_max);
          // Âncora: parte inferior da zona (igual ao comportamento das imagens padrão)
          const drawY  = clearMaxY - drawH;

          // Carrega imagem do usuário
          const userImg = new Image();
          userImg.src = customImage;
          await new Promise((res, rej) => { userImg.onload = res; userImg.onerror = rej; });

          const iw = userImg.naturalWidth  || userImg.width  || 1;
          const ih = userImg.naturalHeight || userImg.height || 1;

          // Mode cover: escala para preencher drawW × drawH sem distorcer
          let coverW, coverH;
          if (iw / ih > drawW / drawH) {
            coverH = drawH; coverW = coverH * (iw / ih);
          } else {
            coverW = drawW; coverH = coverW / (iw / ih);
          }
          // Aplica zoom do usuário (sempre ≥ 1 para não deixar bordas brancas)
          const z = Math.max(1, imageZoom);
          coverW *= z;
          coverH *= z;

          const cx = drawX + drawW / 2 + (imageOffsetX / 100) * drawW;
          const cy = drawY + drawH / 2 + (imageOffsetY / 100) * drawH;
          ctx.save();
          ctx.beginPath();
          ctx.rect(drawX, drawY, drawW, drawH);
          ctx.clip();
          ctx.drawImage(userImg, cx - coverW / 2, cy - coverH / 2, coverW, coverH);
          ctx.restore();
        }
        // noCustomImage: zona já foi limpa acima com branco — nenhuma imagem é desenhada

        // Exporta para PDF A4
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        pdf.addImage(imgData, 'JPEG', 0, 0, 595.28, 841.89);
        pdf.save(fileName);
      } else {
        // ── Download direto — nenhuma customização visual ──
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      const oldCapaId = editingCapaId; // captura antes do resetWizard
      showToast(oldCapaId ? '✅ Capa atualizada e baixada com sucesso!' : '✅ Capa gerada e baixada com sucesso!', 'success');
      loadCapas();
      setActiveTab('capas');
      resetWizard();
      // Exclui o registro antigo após criar o novo com sucesso
      if (oldCapaId) {
        try {
          await fetch(`${API}/api/capa-provas/${oldCapaId}`, { method: 'DELETE', headers: authH() });
          loadCapas();
        } catch { /* ignora falha silenciosamente */ }
      }
    } catch (err) {
      showToast(err.message || 'Erro ao gerar capa.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/api/capa-provas/${id}`, { method: 'DELETE', headers: authH() });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      showToast('Capa removida.', 'success');
      loadCapas();
    } catch (err) {
      showToast(err.message || 'Erro ao remover capa.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(id, area, bim, ano) {
    try {
      const res = await fetch(`${API}/api/capa-provas/${id}/pdf`, { headers: authH() });
      if (!res.ok) throw new Error('Erro ao baixar PDF.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capa-${area.toLowerCase()}-${bim}bim-${ano}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function resetWizard() {
    setStep(1);
    setSelectedArea(null);
    setSelectedTemplate(null);
    setForm({ titulo: '', serie: '', turno: '', bimestre: 1, ano: ANO_CORRENTE, instrucoes: '' });
    setCustomImage(null);
    setNoCustomImage(false);
    setImageZoom(1);
    setImageOffsetX(0);
    setImageOffsetY(0);
    setImageHeight(200);
    setImageWidthPct(100);
    setCustomColor(null);
    setEditingCapaId(null);
  }

  // ── Inicia edição de uma capa existente ───────────────────────────────────────────────
  function startEdit(capa) {
    const areaDef = AREAS.find(a => a.id === capa.area) || AREAS[0];
    const templateDef = TEMPLATES.find(t => t.id === capa.template_id) || TEMPLATES[0];
    setSelectedArea(areaDef);
    setSelectedTemplate(templateDef);
    setForm({
      titulo: capa.titulo || '',
      serie: capa.serie || '',
      turno: capa.turno || '',
      bimestre: capa.bimestre || 1,
      ano: capa.ano || ANO_CORRENTE,
      instrucoes: capa.instrucoes || areaDef.instrucoesPadrao || '',
    });
    setEditingCapaId(capa.id);
    setCustomColor(null);
    setCustomImage(null);
    setNoCustomImage(false);
    setImageZoom(1);
    setImageOffsetX(0);
    setImageOffsetY(0);
    setImageHeight(200);
    setImageWidthPct(100);
    setStep(3); // vai direto para Configurar
    setActiveTab('nova');
  }

  // ── Area badge color helper ─────────────────────────────────────────────
  function getAreaDef(areaId) {
    return AREAS.find(a => a.id === areaId) || AREAS[4];
  }

  // ── Utilitários de cor ──────────────────────────────────────────────────
  // Converte hex para HSL [h, s, l]
  function hexToHSL(hex) {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0;
    const l = (max+min)/2;
    if (max !== min) {
      const d = max-min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h = ((g-b)/d + (g<b?6:0))/6; break;
        case g: h = ((b-r)/d + 2)/6; break;
        case b: h = ((r-g)/d + 4)/6; break;
      }
    }
    return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
  }

  // Converte HSL para hex
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1-l);
    const f = n => {
      const k = (n + h/30) % 12;
      return Math.round(255*(l - a*Math.max(Math.min(k-3,9-k,1),-1)))
        .toString(16).padStart(2,'0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  // Gera corClaro (alta luminosidade, mesma matiz)
  function makeCorClaro(hex) {
    const [h, s] = hexToHSL(hex);
    return hslToHex(h, Math.max(s-15, 8), 94);
  }

  // Área efetiva (com cor sobrescrita se customColor)
  const effectiveArea = selectedArea
    ? customColor
      ? { ...selectedArea, cor: customColor, corClaro: makeCorClaro(customColor) }
      : selectedArea
    : null;

  // Paleta premium de cores curadas
  const COLOR_PALETTE = [
    { hex:'#6366F1', name:'Índigo' },
    { hex:'#8B5CF6', name:'Violeta' },
    { hex:'#EC4899', name:'Rosa' },
    { hex:'#EF4444', name:'Vermelho' },
    { hex:'#F97316', name:'Laranja' },
    { hex:'#EAB308', name:'Âmbar' },
    { hex:'#22C55E', name:'Verde' },
    { hex:'#10B981', name:'Esmeralda' },
    { hex:'#14B8A6', name:'Ciano' },
    { hex:'#0EA5E9', name:'Azul Claro' },
    { hex:'#3B82F6', name:'Azul' },
    { hex:'#1E40AF', name:'Marinho' },
    { hex:'#7C3AED', name:'Ametista' },
    { hex:'#BE185D', name:'Carmesim' },
    { hex:'#0F766E', name:'Petróleo' },
    { hex:'#1E293B', name:'Grafite' },
  ];

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.type === 'error' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Modal Premium de Confirmação de Exclusão ────────────────── */}
      {confirmDelete && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'rgba(15,23,42,0.72)',
          backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          animation:'fadeInOverlay .2s ease',
        }} onClick={() => setConfirmDelete(null)}>
          <div style={{
            background:'linear-gradient(145deg,#1e293b,#0f172a)',
            border:'1px solid rgba(99,102,241,0.3)',
            borderRadius:20,
            padding:'36px 32px 28px',
            width:380, maxWidth:'92vw',
            boxShadow:'0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            display:'flex', flexDirection:'column', alignItems:'center', gap:16,
            animation:'slideUpModal .25s cubic-bezier(0.34,1.56,0.64,1)',
          }} onClick={e => e.stopPropagation()}>
            {/* Ícone animado */}
            <div style={{
              width:72, height:72, borderRadius:'50%',
              background:'linear-gradient(135deg,#fee2e2,#fecaca)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:32, boxShadow:'0 0 0 8px rgba(239,68,68,0.15)',
              animation:'pulseDelete 2s ease infinite',
            }}>🗑️</div>

            {/* Título */}
            <div style={{ textAlign:'center' }}>
              <div style={{ fontWeight:800, fontSize:18, color:'#f1f5f9', marginBottom:6 }}>
                Excluir Capa?
              </div>
              <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.5 }}>
                Você está prestes a excluir permanentemente:
              </div>
              <div style={{
                marginTop:10, padding:'10px 16px', borderRadius:10,
                background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
                fontSize:13, fontWeight:700, color:'#fca5a5',
              }}>
                "{confirmDelete.titulo}"
              </div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:8 }}>
                Esta ação não pode ser desfeita.
              </div>
            </div>

            {/* Botões */}
            <div style={{ display:'flex', gap:10, width:'100%', marginTop:4 }}>
              <button
                style={{
                  flex:1, padding:'12px 0', borderRadius:10,
                  border:'1px solid rgba(255,255,255,0.1)',
                  background:'rgba(255,255,255,0.06)',
                  color:'#94a3b8', fontWeight:600, fontSize:14,
                  cursor:'pointer', transition:'all .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                onClick={() => setConfirmDelete(null)}
              >Cancelar</button>
              <button
                style={{
                  flex:1, padding:'12px 0', borderRadius:10,
                  border:'none',
                  background: deletingId === confirmDelete.id
                    ? 'rgba(239,68,68,0.4)'
                    : 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color:'#fff', fontWeight:700, fontSize:14,
                  cursor: deletingId === confirmDelete.id ? 'not-allowed' : 'pointer',
                  boxShadow:'0 4px 14px rgba(239,68,68,0.4)',
                  transition:'all .15s',
                }}
                onMouseEnter={e => { if(deletingId !== confirmDelete.id) e.currentTarget.style.transform='scale(1.03)'; }}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
                disabled={deletingId === confirmDelete.id}
                onClick={async () => {
                  const id = confirmDelete.id;
                  await handleDelete(id);
                  setConfirmDelete(null);
                }}
              >
                {deletingId === confirmDelete.id ? '⏳ Excluindo...' : '🗑️ Excluir'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeInOverlay { from { opacity:0 } to { opacity:1 } }
            @keyframes slideUpModal { from { opacity:0; transform:translateY(24px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
            @keyframes pulseDelete { 0%,100% { box-shadow:0 0 0 8px rgba(239,68,68,0.15) } 50% { box-shadow:0 0 0 14px rgba(239,68,68,0.08) } }
          `}</style>
        </div>
      )}

      {/* Page header */}
      <div style={s.pageHeader}>
        <div style={s.pageIconWrap}>
          <span style={{ fontSize: 22 }}>📄</span>
        </div>
        <div>
          <h1 style={s.pageTitle}>Capas de Provas</h1>
          <p style={s.pageDesc}>Crie e baixe capas institucionais com QR code para identificação pelo EDUCA-SCAN</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button
            style={{ ...s.tabBtn, ...(activeTab === 'capas' ? s.tabBtnActive : {}) }}
            onClick={() => { setActiveTab('capas'); resetWizard(); }}
          >📋 Capas Criadas ({capas.length})</button>
          <button
            style={{ ...s.tabBtn, ...(activeTab === 'nova' ? s.tabBtnActive : {}), background: activeTab === 'nova' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : undefined, color: activeTab === 'nova' ? '#fff' : undefined }}
            onClick={() => { setActiveTab('nova'); setStep(1); }}
          >➕ Nova Capa</button>
        </div>
      </div>

      {/* ── TAB: CAPAS CRIADAS ─────────────────────────────────────────── */}
      {activeTab === 'capas' && (
        <div>
          {loadingCapas ? (
            <div style={s.emptyBox}><div style={s.spinner} /><p style={{ color:'#64748b', marginTop:12 }}>Carregando capas...</p></div>
          ) : capas.length === 0 ? (
            <div style={s.emptyBox}>
              <div style={{ fontSize:56, marginBottom:12 }}>📄</div>
              <h3 style={{ fontWeight:700, color:'#374151', marginBottom:6 }}>Nenhuma capa criada ainda</h3>
              <p style={{ color:'#6b7280', fontSize:14, marginBottom:20 }}>Clique em "Nova Capa" para criar a primeira.</p>
              <button style={s.primaryBtn} onClick={() => { setActiveTab('nova'); setStep(1); }}>➕ Criar primeira capa</button>
            </div>
          ) : (
            <div style={s.grid}>
              {capas.map(capa => {
                const areaDef = getAreaDef(capa.area);
                const templateDef = TEMPLATES.find(t => t.id === capa.template_id);
                return (
                  <div key={capa.id} style={s.capaCard}>
                    {/* Mini preview */}
                    <div style={{ ...s.capaThumb, background: areaDef.corClaro, borderBottom: `3px solid ${areaDef.cor}` }}>
                      <div style={{ position:'relative', overflow:'hidden', width:'100%', height:'100%' }}>
                        <CapaPreview
                          area={areaDef}
                          template={templateDef || TEMPLATES[0]}
                          titulo={capa.titulo}
                          serie={capa.serie}
                          bimestre={capa.bimestre}
                          instrucoes={capa.instrucoes || areaDef.instrucoesPadrao}
                          scale={0.185}
                          escolaNome={escolaNome}
                          logoEsq={logoEsquerda}
                          logoDir={logoDireita}
                        />
                      </div>
                    </div>
                    {/* Info */}
                    <div style={s.capaCardBody}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ ...s.areaBadge, background:areaDef.corClaro, color:areaDef.cor, border:`1px solid ${areaDef.cor}40` }}>
                          {areaDef.emoji} {areaDef.label}
                        </span>
                        <span style={{ ...s.areaBadge, background:'#f1f5f9', color:'#64748b' }}>
                          {templateDef?.nome || 'Clássico'}
                        </span>
                      </div>
                      <div style={s.capaTitle}>{capa.titulo}</div>
                      <div style={s.capaMeta}>
                        {capa.serie && <span>{capa.serie}</span>}
                        {capa.serie && <span>·</span>}
                        <span>{capa.bimestre}º Bimestre</span>
                        <span>·</span>
                        <span>{capa.ano}</span>
                      </div>
                      <div style={s.capaActions}>
                        <button
                          style={s.btnDownload}
                          onClick={() => handleDownload(capa.id, capa.area, capa.bimestre, capa.ano)}
                        >⬇️ Baixar PDF</button>
                        <button
                          style={s.btnEdit}
                          title="Editar capa"
                          onClick={() => startEdit(capa)}
                        >✏️</button>
                        <button
                          style={s.btnDelete}
                          onClick={() => setConfirmDelete({ id: capa.id, titulo: capa.titulo })}
                          title="Excluir capa"
                        >{deletingId === capa.id ? '...' : '🗑️'}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: NOVA CAPA — WIZARD ────────────────────────────────────── */}
      {activeTab === 'nova' && (
        <div>
          {/* Banner modo edição */}
          {editingCapaId && (
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'linear-gradient(135deg,#fef3c7,#fde68a)',
              border:'1.5px solid #f59e0b', borderRadius:10,
              padding:'10px 16px', marginBottom:16,
            }}>
              <span style={{ fontSize:20 }}></span>
              <div>
                <span style={{ fontWeight:800, fontSize:13, color:'#92400e' }}>Modo Edição</span>
                <span style={{ fontSize:12, color:'#b45309', marginLeft:8 }}>
                  Altere os dados e clique em “Gerar e Baixar PDF” para salvar as mudanças.
                </span>
              </div>
              <button
                style={{ marginLeft:'auto', padding:'5px 12px', borderRadius:6, border:'1.5px solid #f59e0b', background:'#fff', color:'#92400e', fontWeight:700, fontSize:12, cursor:'pointer' }}
                onClick={() => { setEditingCapaId(null); resetWizard(); }}
              >✕ Cancelar edição</button>
            </div>
          )}

          {/* Steps indicator */}
          <div style={s.stepsBar}>
            {['Área', 'Modelo', 'Configurar'].map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <React.Fragment key={n}>
                  <button style={{ ...s.stepBtn, ...(active ? s.stepActive : done ? s.stepDone : s.stepIdle) }} onClick={() => goToStep(n)}>
                    <span style={s.stepNum}>{done ? '✓' : n}</span>
                    <span style={s.stepLabel}>{label}</span>
                  </button>
                  {i < 2 && <div style={{ ...s.stepLine, background: done ? '#6366f1' : '#e2e8f0' }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── Step 1: Choose Area ── */}
          {step === 1 && (
            <div>
              <h2 style={s.stepTitle}>Escolha a Área de Conhecimento</h2>
              <div style={s.areaGrid}>
                {AREAS.map(area => (
                  <button key={area.id} style={{ ...s.areaCard, border: `2px solid ${selectedArea?.id === area.id ? area.cor : '#e2e8f0'}`, background: selectedArea?.id === area.id ? area.corClaro : '#fff' }}
                    onClick={() => selectArea(area)}
                  >
                    <div style={{ fontSize:42, marginBottom:10 }}>{area.emoji}</div>
                    <div style={{ fontSize:18, fontWeight:800, color: area.cor, marginBottom:4 }}>{area.label}</div>
                    <div style={{ fontSize:11, color:'#64748b', lineHeight:1.4 }}>{area.disciplinas}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Choose Template ── */}
          {step === 2 && selectedArea && (
            <div>
              <h2 style={s.stepTitle}>Escolha o Modelo Visual</h2>
              <p style={s.stepDesc}>Todos os modelos suportam a cor de <strong style={{ color: effectiveArea.cor }}>{selectedArea.label}</strong></p>
              <div style={s.templateGrid}>
                {TEMPLATES.map(t => (
                  <button key={t.id}
                    style={{ ...s.templateCard, border: `2px solid ${selectedTemplate?.id === t.id ? effectiveArea.cor : '#e2e8f0'}`, outline: 'none' }}
                    onClick={() => selectTemplate(t)}
                  >
                    {/* Mini preview */}
                    <div style={{ width: 595*0.17, height: 842*0.17, overflow:'hidden', borderRadius:4, marginBottom:10, border:'1px solid #e2e8f0', position:'relative', flexShrink:0 }}>
                      <CapaPreview
                        area={effectiveArea}
                        template={t}
                        titulo={`PROVÃO DE ${selectedArea.label}`}
                        serie="6º ANO"
                        bimestre={1}
                        instrucoes={selectedArea.instrucoesPadrao}
                        scale={0.17}
                        escolaNome={escolaNome}
                      />
                    </div>
                    <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:3 }}>{t.nome}</div>
                    <div style={{ fontSize:11, color:'#64748b', textAlign:'center' }}>{t.desc}</div>
                    {selectedTemplate?.id === t.id && (
                      <div style={{ position:'absolute', top:8, right:8, background: effectiveArea.cor, borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:900 }}>✓</div>
                    )}</button>
                ))}
              </div>

              {/* ── Seletor de Cor Premium ── */}
              <div style={s.colorSection}>
                <div style={s.colorSectionHeader}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background: `linear-gradient(135deg, ${effectiveArea.cor}, ${makeCorClaro(effectiveArea.cor)})`, flexShrink:0, boxShadow:`0 0 8px ${effectiveArea.cor}55` }} />
                    <span style={{ fontWeight:800, fontSize:13, color:'#f1f5f9' }}>Personalizar Cor da Capa</span>
                  </div>
                  {customColor && (
                    <button
                      style={{ fontSize:11, color:'#6366f1', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:'2px 8px', borderRadius:4, transition:'background .2s' }}
                      onClick={() => setCustomColor(null)}
                    >↺ Restaurar padrão</button>
                  )}
                </div>
                <p style={{ fontSize:11, color:'#94a3b8', margin:'0 0 14px', lineHeight:1.5 }}>
                  Escolha uma cor para bordas, cabeçalho e destaques — aplicada em tempo real no preview.
                </p>
                {/* Grade de cores */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                  {/* Cor da área (padrão) */}
                  <button
                    title={`Padrão — ${selectedArea.label}`}
                    style={{
                      ...s.colorSwatch,
                      background: selectedArea.cor,
                      boxShadow: !customColor ? `0 0 0 3px #fff, 0 0 0 5px ${selectedArea.cor}, 0 4px 12px ${selectedArea.cor}66` : `0 2px 8px ${selectedArea.cor}44`,
                      transform: !customColor ? 'scale(1.15)' : 'scale(1)',
                    }}
                    onClick={() => setCustomColor(null)}
                  >
                    {!customColor && <span style={{ fontSize:10, color:'#fff', fontWeight:900 }}>✓</span>}</button>
                  {/* Paleta curada */}
                  {COLOR_PALETTE.map(({ hex, name }) => (
                    <button
                      key={hex}
                      title={name}
                      style={{
                        ...s.colorSwatch,
                        background: hex,
                        boxShadow: customColor === hex
                          ? `0 0 0 3px #fff, 0 0 0 5px ${hex}, 0 4px 12px ${hex}66`
                          : `0 2px 8px ${hex}44`,
                        transform: customColor === hex ? 'scale(1.15)' : 'scale(1)',
                      }}
                      onClick={() => setCustomColor(hex)}
                    >
                      {customColor === hex && <span style={{ fontSize:10, color:'#fff', fontWeight:900 }}>✓</span>}</button>
                  ))}
                  {/* Picker personalizado */}
                  <label
                    title="Cor personalizada"
                    style={{
                      ...s.colorSwatch,
                      background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                      cursor:'pointer',
                      overflow:'hidden',
                      position:'relative',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow: COLOR_PALETTE.every(p => p.hex !== customColor) && customColor
                        ? `0 0 0 3px #fff, 0 0 0 5px ${customColor}, 0 4px 12px ${customColor}66`
                        : '0 2px 8px rgba(0,0,0,0.18)',
                      transform: COLOR_PALETTE.every(p => p.hex !== customColor) && customColor ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    <span style={{ fontSize:14, filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>+</span>
                    <input
                      type="color"
                      value={customColor || selectedArea.cor}
                      onChange={e => setCustomColor(e.target.value)}
                      style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}
                    />
                  </label>
                </div>
                {/* Chip cor ativa */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:14, height:14, borderRadius:3, background: effectiveArea.cor, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:'#cbd5e1', fontWeight:600 }}>
                    {customColor
                      ? `Cor personalizada: ${customColor.toUpperCase()}`
                      : `Cor padrão da área: ${selectedArea.cor.toUpperCase()}`
                    }
                  </span>
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button style={s.secondaryBtn} onClick={() => setStep(1)}>← Voltar</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Configure + Preview ── */}
          {step === 3 && effectiveArea && selectedTemplate && (
            <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
              {/* Form */}
              <div style={{ flex:'0 0 380px' }}>
                <h2 style={s.stepTitle}>Configurar a Capa</h2>

                <label style={s.label}>Título da prova *</label>
                <input style={s.input} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: PROVÃO DE EXATAS" />

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={s.label}>Série / Ano</label>
                    <select style={s.input} value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}>
                      <option value="">-- Selecione --</option>
                      {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Turno</label>
                    <select style={s.input} value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}>
                      <option value="">-- Selecione --</option>
                      {TURNOS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={s.label}>Bimestre *</label>
                    <select style={s.input} value={form.bimestre} onChange={e => setForm(f => ({ ...f, bimestre: Number(e.target.value) }))}>
                      {BIMESTRES_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Ano letivo *</label>
                    <input style={s.input} type="number" value={form.ano} min={2020} max={2099} onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))} />
                  </div>
                </div>

                <div style={s.row}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Avaliação do Gabarito (Vinculação)</label>
                    <select style={s.input} value={form.avaliacao_id || ''} onChange={e => {
                      setForm(f => ({ ...f, avaliacao_id: e.target.value, turma_id: '' }));
                    }}>
                      <option value="">-- Nenhuma (Capa Avulsa) --</option>
                      {avaliacoesFiltradas.length === 0 && (form.serie || form.turno || form.bimestre) ? (
                        <option value="" disabled>Nenhum gabarito encontrado para os filtros selecionados</option>
                      ) : (
                        avaliacoesFiltradas.map(av => (
                          <option key={av.id} value={av.id}>{av.titulo} ({new Date(av.created_at).getFullYear()})</option>
                        ))
                      )}
                    </select>
                    {/* DEBUG TEMPORÁRIO */}
                    <div style={{ fontSize: 10, color: '#444', marginTop: 4, lineHeight: 1.6, background: '#f0f4ff', padding: '5px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                      {(() => {
                        const passB = avaliacoes.filter(av => !(form.bimestre && av.bimestre && Number(av.bimestre) !== Number(form.bimestre))).length;
                        const passT = avaliacoes.filter(av => !(form.turno && av.turno && av.turno.toUpperCase().trim() !== form.turno.toUpperCase().trim())).length;
                        const passA = avaliacoes.filter(av => !(form.ano && av.created_at && new Date(av.created_at).getFullYear() !== Number(form.ano))).length;
                        const bimsUnicos = [...new Set(avaliacoes.map(av => String(av.bimestre)))].join(', ');
                        const turnosUnicos = [...new Set(avaliacoes.map(av => String(av.turno)))].join(', ');
                        return (
                          <span>
                            📊 Total: {avaliacoes.length} | Filtrados: {avaliacoesFiltradas.length} | Turmas: {todasTurmas.length}<br/>
                            bimestre={form.bimestre} → passam: {passB}/27 | bimestres no BD: [{bimsUnicos}]<br/>
                            turno="{form.turno}" → passam: {passT}/27 | turnos no BD: [{turnosUnicos}]<br/>
                            ano={form.ano} → passam: {passA}/27
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  {form.avaliacao_id && (
                    <div style={{ flex: 1 }}>
                      <label style={s.label}>Turma Específica</label>
                      <select style={s.input} value={form.turma_id || ''} onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))}>
                        <option value="">-- Selecione a Turma --</option>
                        {turmas.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <label style={s.label}>Instruções (editável)</label>
                <textarea
                  style={{ ...s.input, height:180, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}
                  value={form.instrucoes}
                  onChange={e => setForm(f => ({ ...f, instrucoes: e.target.value }))}
                  placeholder="Instruções que aparecerão na capa..."
                />

                {/* ── Inserir Imagem ──────────────────────────────────── */}
                <div style={s.imageSection}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>🖼️ Imagem da Capa</span>
                    <div style={{ display:'flex', gap:6 }}>
                      {/* Botão Sem imagem — toggle */}
                      <button
                        id="btn-sem-imagem"
                        title="Gerar capa sem nenhuma imagem"
                        style={{
                          ...s.btnNoImage,
                          ...(noCustomImage ? s.btnNoImageActive : {}),
                        }}
                        onClick={() => {
                          const next = !noCustomImage;
                          setNoCustomImage(next);
                          if (next) { setCustomImage(null); }
                        }}
                      >
                        {noCustomImage ? '✓ Sem imagem' : '🚫 Sem imagem'}
                      </button>
                      {/* Botão Inserir Imagem — só aparece quando não há imagem e não está em "sem imagem" */}
                      {!customImage && !noCustomImage && (
                        <button
                          id="btn-inserir-imagem"
                          style={s.btnInsertImage}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          + Inserir Imagem</button>
                      )}
                    </div>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display:'none' }}
                    onChange={handleImageUpload}
                  />

                  {customImage ? (
                    <div>
                      {/* Thumbnail + remove */}
                      <div style={s.imageThumbnailRow}>
                        <div style={s.imageThumbnailWrap}>
                          <img src={customImage} alt="Imagem selecionada" style={s.imageThumbnail} />
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:11, color:'#475569', margin:'0 0 8px' }}>Imagem carregada. Ajuste o zoom e a posição no preview ao lado.</p>
                          <div style={{ display:'flex', gap:6 }}>
                            <button style={s.btnChangeImage} onClick={() => fileInputRef.current?.click()}>🔄 Trocar</button>
                            <button style={s.btnRemoveImage} onClick={removeCustomImage}>✕ Remover</button>
                          </div>
                        </div>
                      </div>

                      {/* Zoom control */}
                      <div style={s.zoomRow}>
                        <span style={s.zoomLabel}>🔍 Zoom</span>
                        <button
                          style={s.zoomBtn}
                          onClick={() => setImageZoom(z => Math.max(0.5, parseFloat((z - 0.1).toFixed(1))))}
                        >−</button>
                        <input
                          type="range" min="0.5" max="2.5" step="0.05"
                          value={imageZoom}
                          onChange={e => setImageZoom(parseFloat(e.target.value))}
                          style={s.zoomSlider}
                        />
                        <button
                          style={s.zoomBtn}
                          onClick={() => setImageZoom(z => Math.min(2.5, parseFloat((z + 0.1).toFixed(1))))}
                        >+</button>
                        <span style={s.zoomValue}>{imageZoom.toFixed(1)}×</span>
                      </div>

                      {/* Offset X */}
                      <div style={s.zoomRow}>
                        <span style={s.zoomLabel}>↔ Pos. X</span>
                        <button style={s.zoomBtn} onClick={() => setImageOffsetX(x => Math.max(-50, x - 5))}>−</button>
                        <input
                          type="range" min="-50" max="50" step="1"
                          value={imageOffsetX}
                          onChange={e => setImageOffsetX(Number(e.target.value))}
                          style={s.zoomSlider}
                        />
                        <button style={s.zoomBtn} onClick={() => setImageOffsetX(x => Math.min(50, x + 5))}>+</button>
                        <span style={s.zoomValue}>{imageOffsetX > 0 ? '+' : ''}{imageOffsetX}%</span>
                      </div>

                      {/* Offset Y */}
                      <div style={s.zoomRow}>
                        <span style={s.zoomLabel}>↕ Pos. Y</span>
                        <button style={s.zoomBtn} onClick={() => setImageOffsetY(y => Math.max(-50, y - 5))}>−</button>
                        <input
                          type="range" min="-50" max="50" step="1"
                          value={imageOffsetY}
                          onChange={e => setImageOffsetY(Number(e.target.value))}
                          style={s.zoomSlider}
                        />
                        <button style={s.zoomBtn} onClick={() => setImageOffsetY(y => Math.min(50, y + 5))}>+</button>
                        <span style={s.zoomValue}>{imageOffsetY > 0 ? '+' : ''}{imageOffsetY}%</span>
                      </div>

                      {/* Separador tamanho */}
                      <div style={{ height:'1px', background:'#e2e8f0', margin:'4px 0 6px' }} />

                      {/* Altura da imagem */}
                      <div style={s.zoomRow}>
                        <span style={s.zoomLabel}>⇕ Altura</span>
                        <button style={s.zoomBtn} onClick={() => setImageHeight(h => Math.max(80, h - 10))}>−</button>
                        <input
                          type="range" min="80" max="340" step="10"
                          value={imageHeight}
                          onChange={e => setImageHeight(Number(e.target.value))}
                          style={s.zoomSlider}
                        />
                        <button style={s.zoomBtn} onClick={() => setImageHeight(h => Math.min(340, h + 10))}>+</button>
                        <span style={s.zoomValue}>{imageHeight}px</span>
                      </div>

                      {/* Largura da imagem */}
                      <div style={s.zoomRow}>
                        <span style={s.zoomLabel}>⇔ Largura</span>
                        <button style={s.zoomBtn} onClick={() => setImageWidthPct(w => Math.max(40, w - 5))}>−</button>
                        <input
                          type="range" min="40" max="100" step="5"
                          value={imageWidthPct}
                          onChange={e => setImageWidthPct(Number(e.target.value))}
                          style={s.zoomSlider}
                        />
                        <button style={s.zoomBtn} onClick={() => setImageWidthPct(w => Math.min(100, w + 5))}>+</button>
                        <span style={s.zoomValue}>{imageWidthPct}%</span>
                      </div>

                      {/* Reset tudo */}
                      <button
                        style={{ ...s.btnChangeImage, marginTop:4, fontSize:11 }}
                        onClick={() => { setImageZoom(1); setImageOffsetX(0); setImageOffsetY(0); setImageHeight(200); setImageWidthPct(100); }}
                      >↺ Resetar tudo</button>
                    </div>
                  ) : noCustomImage ? (
                    /* Estado: usuário optou por nenhuma imagem */
                    <div style={{ ...s.imageEmptyHint, background:'#fef2f2', border:'1px dashed #fca5a5', borderRadius:8 }}>
                      <span style={{ fontSize:28 }}>🚫</span>
                      <p style={{ fontSize:11, color:'#dc2626', margin:'6px 0 6px', fontWeight:600 }}>Capa sem imagem</p>
                      <p style={{ fontSize:10, color:'#ef4444', margin:0 }}>A área de imagem ficará em branco no PDF.</p>
                      <button
                        style={{ marginTop:8, fontSize:10, padding:'4px 10px', borderRadius:5, border:'1px solid #fca5a5', background:'#fff', color:'#dc2626', cursor:'pointer' }}
                        onClick={() => setNoCustomImage(false)}
                      >↩ Cancelar</button>
                    </div>
                  ) : (
                    <div style={s.imageEmptyHint}>
                      <span style={{ fontSize:28, opacity:0.4 }}>🖼️</span>
                      <p style={{ fontSize:11, color:'#94a3b8', margin:'6px 0 0' }}>Nenhuma imagem selecionada.<br/>A capa usará o design padrão do modelo.</p>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', gap:10, marginTop:16 }}>
                  <button style={s.secondaryBtn} onClick={() => setStep(2)}>← Voltar</button>
                  <button
                    style={{ ...s.primaryBtn, flex:1, opacity: generating ? 0.7 : 1 }}
                    onClick={handleGerar}
                    disabled={generating}
                  >
                    {generating ? '⏳ Gerando PDF...' : '📄 Gerar e Baixar PDF'}</button>
                </div>
              </div>

              {/* Live Preview */}
              <div style={{ flex:1 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:'#64748b', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>Pré-visualização</h3>
                <div style={{ width: 595*0.55, height: 842*0.55, overflow:'hidden', borderRadius:8, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', position:'relative' }}>
                  <CapaPreview
                    area={effectiveArea}
                    template={selectedTemplate}
                    titulo={form.titulo}
                    serie={form.serie}
                    bimestre={form.bimestre}
                    instrucoes={form.instrucoes}
                    scale={0.55}
                    escolaNome={escolaNome}
                    logoEsq={logoEsquerda}
                    logoDir={logoDireita}
                    customImage={customImage}
                    imageZoom={imageZoom}
                    imageOffsetX={imageOffsetX}
                    imageOffsetY={imageOffsetY}
                    imageHeight={imageHeight}
                    imageWidthPct={imageWidthPct}
                  />
                </div>
                <p style={{ fontSize:11, color:'#94a3b8', marginTop:8, textAlign:'center' }}>Preview aproximado · PDF gerado em A4</p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  root: { padding:'0 0 40px', maxWidth:1200, margin:'0 auto' },

  toast: { position:'fixed', top:20, right:20, zIndex:9999, padding:'12px 22px', borderRadius:10, color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 8px 24px rgba(0,0,0,0.18)', animation:'none' },

  pageHeader: { display:'flex', alignItems:'center', gap:14, marginBottom:28, padding:'20px 24px', background:'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius:14, flexWrap:'wrap' },
  pageIconWrap: { width:46, height:46, borderRadius:11, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  pageTitle: { color:'#fff', fontSize:18, fontWeight:800, margin:0 },
  pageDesc: { color:'#94a3b8', fontSize:13, margin:'3px 0 0' },

  tabBtn: { padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', background:'rgba(255,255,255,0.08)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.12)', transition:'all .2s' },
  tabBtnActive: { background:'rgba(99,102,241,0.18)', color:'#a78bfa', border:'1px solid rgba(99,102,241,0.4)' },

  stepsBar: { display:'flex', alignItems:'center', marginBottom:28, background:'#fff', borderRadius:12, padding:'16px 24px', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', border:'1px solid #e2e8f0' },
  stepBtn: { display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', transition:'all .2s' },
  stepActive: { background:'#eef2ff', color:'#4f46e5' },
  stepDone: { background:'#f0fdf4', color:'#16a34a' },
  stepIdle: { color:'#94a3b8' },
  stepNum: { width:22, height:22, borderRadius:'50%', background:'currentColor', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 },
  stepLabel: { fontSize:13, fontWeight:700 },
  stepLine: { flex:1, height:2, margin:'0 6px' },

  stepTitle: { fontSize:20, fontWeight:800, color:'#1e293b', marginBottom:8 },
  stepDesc: { fontSize:13, color:'#64748b', marginBottom:20 },

  areaGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:16, marginBottom:24 },
  areaCard: { display:'flex', flexDirection:'column', alignItems:'center', padding:'28px 16px', borderRadius:14, cursor:'pointer', transition:'all .2s', background:'#fff', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', textAlign:'center' },

  templateGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16 },
  templateCard: { display:'flex', flexDirection:'column', alignItems:'center', padding:'16px', borderRadius:14, cursor:'pointer', transition:'all .2s', background:'#fff', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', position:'relative' },

  label: { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5, marginTop:14 },
  input: { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, color:'#1e293b', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#fff' },

  primaryBtn: { padding:'10px 20px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 },
  secondaryBtn: { padding:'9px 18px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontWeight:700, fontSize:13, cursor:'pointer' },

  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:18 },
  capaCard: { background:'#fff', borderRadius:14, boxShadow:'0 1px 8px rgba(0,0,0,0.07)', border:'1px solid #e2e8f0', overflow:'hidden' },
  capaThumb: { height: Math.round(842*0.185), overflow:'hidden', position:'relative' },
  capaCardBody: { padding:'12px 14px' },
  capaTitle: { fontWeight:700, fontSize:14, color:'#1e293b', margin:'6px 0 4px' },
  capaMeta: { display:'flex', gap:6, fontSize:11, color:'#64748b', flexWrap:'wrap' },
  capaActions: { display:'flex', gap:8, marginTop:12 },
  btnDownload: { flex:1, padding:'7px 10px', borderRadius:7, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' },
  btnEdit: { padding:'7px 10px', borderRadius:7, border:'1px solid #bfdbfe', background:'#eff6ff', color:'#1d4ed8', fontSize:14, cursor:'pointer', transition:'background .15s' },
  btnDelete: { padding:'7px 10px', borderRadius:7, border:'1px solid #fee2e2', background:'#fff', fontSize:14, cursor:'pointer' },
  areaBadge: { padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:3 },

  emptyBox: { textAlign:'center', padding:'60px 24px', background:'#fff', borderRadius:14, border:'1px dashed #e2e8f0' },
  spinner: { width:36, height:36, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto' },

  // ── Image section styles ────────────────────────────────────────────────
  imageSection: {
    marginTop: 16,
    background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    padding: '14px',
  },
  btnInsertImage: {
    padding: '6px 14px',
    borderRadius: 7,
    border: '1.5px dashed #6366f1',
    background: '#eef2ff',
    color: '#4f46e5',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all .2s',
  },
  btnNoImage: {
    padding: '6px 12px',
    borderRadius: 7,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    color: '#64748b',
    fontWeight: 700,
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all .2s',
    whiteSpace: 'nowrap',
  },
  btnNoImageActive: {
    border: '1.5px solid #ef4444',
    background: '#fef2f2',
    color: '#dc2626',
  },
  imageThumbnailRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  imageThumbnailWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    border: '2px solid #e2e8f0',
    flexShrink: 0,
    background: '#f1f5f9',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  btnChangeImage: {
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnRemoveImage: {
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid #fecaca',
    background: '#fff',
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  zoomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  zoomLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    width: 54,
    flexShrink: 0,
  },
  zoomBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: '1.5px solid #e2e8f0',
    background: '#fff',
    color: '#374151',
    fontWeight: 900,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    lineHeight: 1,
  },
  zoomSlider: {
    flex: 1,
    accentColor: '#6366f1',
    cursor: 'pointer',
  },
  zoomValue: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6366f1',
    width: 38,
    textAlign: 'right',
    flexShrink: 0,
  },
  imageEmptyHint: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 0 8px',
    textAlign: 'center',
  },

  // ── Color picker section ─────────────────────────────────────────────────
  colorSection: {
    marginTop: 20,
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: 14,
    padding: '18px 20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  },
  colorSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.18s',
    outline: 'none',
    padding: 0,
  },
};

