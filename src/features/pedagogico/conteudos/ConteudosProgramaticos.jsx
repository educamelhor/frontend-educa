import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./ConteudosProgramaticos.css";
import useEscolaLogos from "../../../hooks/useEscolaLogos";

// ── Dados mock ─────────────────────────────────────────────────────────────
const SERIES = ["6º Ano", "7º Ano", "8º Ano", "9º Ano"];

const DISCIPLINAS = [
  "Língua Portuguesa", "Matemática", "Ciências", "História",
  "Geografia", "Inglês", "Arte", "Educação Física", "Geometria",
];

// Mapeamento: nome da disciplina → disciplina_id real da tabela `disciplinas`
const DISC_ID_MAP = {
  "Língua Portuguesa": 48, "Matemática": 21, "Ciências": 25,
  "História": 24, "Geografia": 23, "Inglês": 30,
  "Arte": 26, "Educação Física": 27, "Geometria": 29,
};

const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

const STATUS_COLORS = {
  APROVADO:   { bg: "#d1fae5", text: "#065f46", dot: "#10b981", label: "Aprovado" },
  ENVIADO:    { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6", label: "Em Revisão" },
  RASCUNHO:   { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8", label: "Rascunho" },
  PENDENTE:   { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", label: "Pendente" },
};

const COR_SERIE = {
  "6º Ano": "#6366f1", "7º Ano": "#0ea5e9",
  "8º Ano": "#10b981", "9º Ano": "#f59e0b",
};

// (MOCK_CONTEUDOS mantido apenas como referência de formato — substituído por dados reais da API)
const MOCK_CONTEUDOS = [];

// ── Ícones SVG inline ──────────────────────────────────────────────────────
const IcoPlus  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="cp-icon"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoEye   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="cp-icon"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoBook  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IcoFilter = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IcoStats  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcoPDF    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><polyline points="9 9 10 9"/></svg>;

// ── Componente principal ───────────────────────────────────────────────────
export default function ConteudosProgramaticos() {
  const { logoEsquerda, logoDireita } = useEscolaLogos();
  const [serieFiltro, setSerieFiltro]         = useState("Todas");
  const [discFiltro, setDiscFiltro]           = useState("Todas");
  const [bimestreFiltro, setBimestreFiltro]   = useState("Todos");
  const [statusFiltro, setStatusFiltro]       = useState("Todos");
  const [viewMode, setViewMode]               = useState("cards"); // "cards" | "table"
  const [modalOpen, setModalOpen]             = useState(false);
  const [detalheItem, setDetalheItem]         = useState(null);

  // Lista real vinda do backend
  const [listaReal, setListaReal]             = useState([]);
  const [listaLoading, setListaLoading]       = useState(false);
  const [listaErr, setListaErr]               = useState(null);

  // Normaliza série do BD ("6º ANO") para exibição ("6º Ano")
  const normSerieDisplay = (s) => {
    if (!s) return "";
    return s.replace(/\bANO\b/i, "Ano").replace(/\bano\b/i, "Ano")
            .replace(/º /g, "º ").trim();
  };

  // Recarrega a lista sempre que os filtros de tela mudam
  const carregarLista = async () => {
    try {
      setListaLoading(true);
      setListaErr(null);
      const params = { ano_letivo: 2026 };
      if (serieFiltro    !== "Todas") params.serie       = serieFiltro.toUpperCase().replace("Ano", "ANO");
      if (discFiltro     !== "Todas") params.disciplina_nome = discFiltro;
      if (bimestreFiltro !== "Todos") params.bimestre    = parseInt(bimestreFiltro);
      if (statusFiltro   !== "Todos") params.status       = statusFiltro;
      const { data } = await api.get("/conteudos/admin/lista", { params });
      if (data?.ok) {
        // Normaliza serie para exibição
        setListaReal((data.registros || []).map(r => ({
          ...r,
          serie:          normSerieDisplay(r.serie),
          bimestre:       r.bimestre_label || `${r.bimestre}º Bimestre`,
          objetivo:       r.objetivo_preview || "",
        })));
      }
    } catch (e) {
      setListaErr("Não foi possível carregar os conteúdos.");
    } finally {
      setListaLoading(false);
    }
  };

  // Estado do modal PDF
  const [pdfModalOpen, setPdfModalOpen]   = useState(false);
  const [pdfDisc, setPdfDisc]             = useState("");
  const [pdfSerie, setPdfSerie]           = useState(""); // opcional
  const [pdfBimestre, setPdfBimestre]     = useState(""); // opcional
  const [pdfLoading, setPdfLoading]       = useState(false);
  const [pdfErr, setPdfErr]               = useState("");
  const [pdfTipo, setPdfTipo]             = useState("interno"); // "interno" | "alunos"

  // Opções de Ano/Série para o modal PDF
  const SERIES_PDF = ["6º Ano", "7º Ano", "8º Ano", "9º Ano"];

  // Abre / fecha modal PDF
  const openPdfModal = () => {
    setPdfDisc(""); setPdfSerie(""); setPdfBimestre(""); setPdfErr(""); setPdfTipo("interno"); setPdfModalOpen(true);
  };

  // ── Helper: carrega imagem como base64 (async) ─────────────────────────────
  const loadImageAsBase64 = (src) => new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve({ data: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  // ── Helper: cabeçalho OFICIAL premium (estilo Lista de Assinatura) ───────────
  const buildPdfHeaderOficial = (doc, W, logos, hoje, titulo, disciplina, bimStr, anoLetivo) => {
    // Fundo branco para o cabeçalho
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, 44, "F");

    // Logos
    const logoH = 20;
    if (logos.left)  doc.addImage(logos.left.data,  "PNG", 10,  4, (logos.left.w  / logos.left.h)  * logoH, logoH);
    if (logos.right) doc.addImage(logos.right.data, "PNG", W - 10 - (logos.right.w / logos.right.h) * logoH, 4, (logos.right.w / logos.right.h) * logoH, logoH);

    // Texto central do cabeçalho oficial
    const cx = W / 2;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 40, 85);
    doc.text("SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL", cx, 8, { align: "center" });
    doc.text("COORDENAÇÃO REGIONAL DE ENSINO DE PLANALTINA", cx, 13, { align: "center" });
    doc.text("CENTRO DE ENSINO FUNDAMENTAL 04 DE PLANALTINA — CEF04-CCMDF", cx, 18, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(50, 60, 80);
    doc.text("Setor Educacional, Lotes C/D", cx, 23, { align: "center" });

    // Linha dupla separadora dourada
    doc.setDrawColor(192, 152, 40); doc.setLineWidth(0.9);
    doc.line(10, 27, W - 10, 27);
    doc.setDrawColor(192, 152, 40); doc.setLineWidth(0.3);
    doc.line(10, 28.5, W - 10, 28.5);

    // Título principal
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(15, 40, 85);
    doc.text(titulo, cx, 35.5, { align: "center" });

    // Faixa de metadados
    doc.setFillColor(12, 28, 68); doc.roundedRect(10, 39, W - 20, 8, 0, 0, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    const metaY = 44.2;
    const colW  = (W - 20) / 4;
    const metaItems = [
      { label: "DISCIPLINA", val: disciplina },
      { label: "BIMESTRE",   val: bimStr },
      { label: "ANO LETIVO", val: String(anoLetivo) },
      { label: "EMISSÃO",    val: hoje },
    ];
    metaItems.forEach((m, i) => {
      const xPos = 10 + colW * i + colW / 2;
      doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(180, 200, 255);
      doc.text(m.label, xPos, metaY - 1.8, { align: "center" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
      doc.text(m.val, xPos, metaY + 1.5, { align: "center" });
    });

    // Linha dourada abaixo da faixa
    doc.setDrawColor(192, 152, 40); doc.setLineWidth(1.2);
    doc.line(10, 48, W - 10, 48);
  };

  // ── Helper: rodapé de página premium ─────────────────────────────────────────
  const drawFooter = (doc, W, H, escolaNome, bimStr) => {
    const pn = doc.internal.getCurrentPageInfo().pageNumber;
    // Linha fina
    doc.setDrawColor(192, 152, 40); doc.setLineWidth(0.4);
    doc.line(10, H - 12, W - 10, H - 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(80, 90, 110);
    doc.text(`${escolaNome} — ${bimStr} — Ano Letivo 2026`, 10, H - 8);
    doc.text(`Página ${pn}`, W - 10, H - 8, { align: "right" });
    doc.setFont("helvetica", "italic"); doc.setFontSize(5.5); doc.setTextColor(150, 160, 180);
    doc.text("Gerado automaticamente pelo Sistema EDUCA MELHOR — Uso interno pedagógico", W / 2, H - 4.5, { align: "center" });
  };

  // ── Helper: parseia objetivo_texto em tópicos + subitens ─────────────────────
  const parseObjetivo = (texto) => {
    if (!texto) return [];
    const topicos = [];
    let atual = null;
    for (const linha of texto.split("\n")) {
      const tMatch = linha.match(/^\s*(\d+)[\.\)\s]+(.+)/);
      const sMatch = linha.match(/^\s*[\u2022\-\*]\s+(.+)/) || linha.match(/^\s{3,}(.+)/);
      if (tMatch) {
        atual = { num: tMatch[1], texto: tMatch[2].trim(), subitens: [] };
        topicos.push(atual);
      } else if (sMatch && atual) {
        const sub = (sMatch[1] || "").trim();
        if (sub) atual.subitens.push(sub);
      } else {
        const raw = linha.replace(/^[\u2022\-\*]\s*/, "").trim();
        if (raw && !atual) {
          atual = { num: topicos.length + 1, texto: raw, subitens: [] };
          topicos.push(atual);
        } else if (raw && atual && raw !== atual.texto) {
          atual.subitens.push(raw);
        }
      }
    }
    return topicos;
  };

  // Paletas por série
  const SERIE_META = {
    "6º ANO": { rgb:[63,81,181],  light:[235,238,252], accent:[92,107,192],  label:"6° ANO" },
    "7º ANO": { rgb:[2,136,209],  light:[225,245,254], accent:[3,155,229],   label:"7° ANO" },
    "8º ANO": { rgb:[0,137,123],  light:[224,242,241], accent:[0,150,136],   label:"8° ANO" },
    "9º ANO": { rgb:[230,81,0],   light:[255,243,224], accent:[245,124,0],   label:"9° ANO" },
  };

  // ── PDF INTERNO premium — tabela hierárquica por série ────────────────────────
  const gerarPdfInterno = async (doc, W, H, hoje, data, bimNum) => {
    const bimStr = `${bimNum}º Bimestre`;
    const logos = {};
    try {
      logos.left  = await loadImageAsBase64(logoEsquerda);
      logos.right = await loadImageAsBase64(logoDireita);
    } catch (_) {}
    buildPdfHeaderOficial(doc, W, logos, hoje, "CONTEÚDO PROGRAMÁTICO", data.disciplina_nome, bimStr, data.ano_letivo || 2026);

    const SERIES_ORDER = ["6º ANO","7º ANO","8º ANO","9º ANO"];
    const bySerie = {};
    for (const item of data.itens) {
      const s = (item.serie || "Sem série").toUpperCase();
      if (!bySerie[s]) bySerie[s] = [];
      bySerie[s].push(item);
    }
    let curY = 54;
    const PAGE_BOTTOM = H - 18;
    const MX = 10; const CW = W - 20;

    for (const serie of [...SERIES_ORDER, ...Object.keys(bySerie).filter(s => !SERIES_ORDER.includes(s))]) {
      const itens = bySerie[serie]; if (!itens) continue;
      const meta = SERIE_META[serie] || SERIE_META["6º ANO"];
      const [r,g,b] = meta.rgb;

      if (curY > PAGE_BOTTOM - 30) {
        doc.addPage();
        buildPdfHeaderOficial(doc, W, logos, hoje, "CONTEÚDO PROGRAMÁTICO", data.disciplina_nome, bimStr, data.ano_letivo || 2026);
        drawFooter(doc, W, H, data.escola_nome, bimStr);
        curY = 54;
      }

      // Cabeçalho da série — estilo faixa sólida com texto branco
      doc.setFillColor(r, g, b);
      doc.roundedRect(MX, curY, CW, 9, 1.5, 1.5, "F");
      // Ícone de badge lateral claro
      doc.setFillColor(255, 255, 255, 0.15);
      doc.roundedRect(MX + 2, curY + 1.5, 18, 6, 1, 1, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(r, g, b);
      doc.text(serie, MX + 11, curY + 5.8, { align: "center" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      const cntTxt = `${itens.length} registro${itens.length !== 1 ? "s" : ""}`;
      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(220,235,255);
      doc.text(cntTxt, W - MX - 3, curY + 5.8, { align: "right" });
      curY += 12;

      // Tabela premium com cores da série
      const rows = itens.map((item, idx) => {
        // Formata o objetivo_texto com tópicos e subitems
        const objTexto = item.objetivo_texto || "—";
        return [String(idx + 1), item.unidade_tematica || "—", item.conteudo_seedf || "—", objTexto];
      });

      autoTable(doc, {
        startY: curY,
        head: [["#", "Unidade Temática\nBNCC", "Conteúdo\nCurrículo em Movimento - SEEDF", "Objetivo de Aprendizagem\nCEF04-CCMDF"]],
        body: rows,
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
          valign: "top",
          overflow: "linebreak",
          lineColor: [210, 220, 235],
          lineWidth: 0.15,
          textColor: [30, 41, 59],
        },
        headStyles: {
          fillColor: [r, g, b],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
          halign: "center",
        },
        alternateRowStyles: { fillColor: meta.light },
        columnStyles: {
          0: { cellWidth: 7,  halign: "center", fontStyle: "bold", textColor: [r, g, b] },
          1: { cellWidth: 38, fontStyle: "bold", textColor: [30,41,59] },
          2: { cellWidth: 58 },
          3: { cellWidth: "auto" },
        },
        margin: { left: MX, right: MX },
        tableLineColor: [210, 220, 235],
        tableLineWidth: 0.2,
        didParseCell: (hookData) => {
          // Subitens na coluna do Objetivo (col 3) renderizados com recuo
          if (hookData.column.index === 3 && hookData.section === "body") {
            const txt = hookData.cell.raw || "";
            if (txt.includes("\n")) {
              hookData.cell.text = txt.split("\n");
            }
          }
        },
        didDrawCell: (hookData) => {
          // Linha esquerda colorida na coluna #
          if (hookData.column.index === 0 && hookData.section === "body") {
            doc.setFillColor(...meta.accent.split ? [r,g,b] : meta.rgb);
            doc.rect(hookData.cell.x, hookData.cell.y, 1.2, hookData.cell.height, "F");
          }
        },
        didDrawPage: () => {
          buildPdfHeaderOficial(doc, W, logos, hoje, "CONTEÚDO PROGRAMÁTICO", data.disciplina_nome, bimStr, data.ano_letivo || 2026);
          drawFooter(doc, W, H, data.escola_nome, bimStr);
        },
      });
      curY = doc.lastAutoTable.finalY + 7;
    }
    drawFooter(doc, W, H, data.escola_nome, bimStr);
  };

  // ── PDF ALUNOS premium — cards com objetivos e subitens ─────────────────────
  const gerarPdfAlunos = async (doc, W, H, hoje, data, bimNum) => {
    const bimStr = bimNum ? `${bimNum}º Bimestre` : "Ano Letivo";
    const logos = {};
    try {
      logos.left  = await loadImageAsBase64(logoEsquerda);
      logos.right = await loadImageAsBase64(logoDireita);
    } catch (_) {}
    buildPdfHeaderOficial(doc, W, logos, hoje, "OBJETIVOS DE APRENDIZAGEM", data.disciplina_nome, bimStr, data.ano_letivo || 2026);

    const SERIES_ORDER = ["6º ANO","7º ANO","8º ANO","9º ANO"];
    const bimestresPresentes = bimNum
      ? [bimNum]
      : [...new Set(data.itens.map(i => i.bimestre))].sort();

    // Coleta todas as séries presentes
    const todasSeries = [...new Set(data.itens.map(i => (i.serie || "Sem série").toUpperCase()))];
    const seriesOrdenadas = [...SERIES_ORDER.filter(s => todasSeries.includes(s)),
                             ...todasSeries.filter(s => !SERIES_ORDER.includes(s))];

    let curY = 54;
    const PAGE_BOTTOM = H - 18;
    const MX = 10;
    const CW = W - 20;
    const LINE_H = 4.5;
    const SUB_LINE_H = 4.2;

    // ── Loop externo: SÉRIE → interno: BIMESTRE ─────────────────────────────
    for (const serie of seriesOrdenadas) {
      const meta = SERIE_META[serie] || SERIE_META["6º ANO"];
      const [r,g,b] = meta.rgb;

      // Verifica se esta série tem dados em algum bimestre
      const itensDeSSerie = data.itens.filter(i => (i.serie || "Sem série").toUpperCase() === serie);
      if (!itensDeSSerie.length) continue;

      // Banner principal da SÉRIE (aparece uma vez, antes de todos os bimestres)
      if (curY > PAGE_BOTTOM - 28) {
        doc.addPage();
        buildPdfHeaderOficial(doc, W, logos, hoje, "OBJETIVOS DE APRENDIZAGEM", data.disciplina_nome, bimStr, data.ano_letivo || 2026);
        drawFooter(doc, W, H, data.escola_nome, bimStr);
        curY = 54;
      }
      doc.setFillColor(r, g, b);
      doc.roundedRect(MX, curY, CW, 12, 2, 2, "F");
      doc.setFillColor(...meta.rgb.map(c => Math.max(c - 25, 0)));
      doc.triangle(W - MX - 30, curY, W - MX, curY, W - MX, curY + 12, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
      doc.text(serie, MX + 5, curY + 8.5);
      const cntSerie = itensDeSSerie.length;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(220, 235, 255);
      doc.text(`${cntSerie} objetivo${cntSerie !== 1 ? "s" : ""}`, W - MX - 4, curY + 8, { align: "right" });
      curY += 16;

      // ── Loop interno: BIMESTRES desta série ──────────────────────────────
      for (const bim of bimestresPresentes) {
        const itensBim = data.itens.filter(i =>
          (i.serie || "Sem série").toUpperCase() === serie &&
          i.bimestre === bim
        );
        if (!itensBim.length) continue;

        const bimLabel = `${bim}º Bimestre`;

        // Banner do bimestre (só quando há múltiplos bimestres)
        if (!bimNum) {
          if (curY > PAGE_BOTTOM - 18) {
            doc.addPage();
            buildPdfHeaderOficial(doc, W, logos, hoje, "OBJETIVOS DE APRENDIZAGEM", data.disciplina_nome, bimStr, data.ano_letivo || 2026);
            drawFooter(doc, W, H, data.escola_nome, bimLabel);
            curY = 54;
          }
          doc.setFillColor(241, 245, 249); // slate-100
          doc.roundedRect(MX + 2, curY, CW - 4, 9, 2, 2, "F");
          doc.setDrawColor(r, g, b); doc.setLineWidth(0.3);
          doc.roundedRect(MX + 2, curY, CW - 4, 9, 2, 2, "S");
          // Pill esquerda colorida
          doc.setFillColor(r, g, b);
          doc.roundedRect(MX + 2, curY, 3, 9, 1, 1, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(r, g, b);
          doc.text(bimLabel, MX + 9, curY + 6.2);
          curY += 13;
        }

        // Conteúdos agrupados por conteudo_seedf
        const porConteudo = {};
        for (const item of itensBim) {
          const chave = item.conteudo_seedf || "Conteúdo";
          if (!porConteudo[chave]) porConteudo[chave] = { ut: item.unidade_tematica || "", objetivos: [] };
          const txt = (item.objetivo_texto || "").trim();
          if (txt) porConteudo[chave].objetivos.push(txt);
        }

        let numIdx = 1;
        for (const [, grupo] of Object.entries(porConteudo)) {
          if (!grupo.objetivos.length) continue;
          for (const objTxt of grupo.objetivos) {
            const topicos = parseObjetivo(objTxt);
            const maxTextW = CW - 24;
            let blockH = 6;
            if (topicos.length > 0) {
              for (const top of topicos) {
                const linhasTop = doc.splitTextToSize(top.texto, maxTextW);
                blockH += linhasTop.length * LINE_H + 2;
                for (const sub of top.subitens) {
                  const linhasSub = doc.splitTextToSize(`• ${sub}`, maxTextW - 10);
                  blockH += linhasSub.length * SUB_LINE_H + 1.5;
                }
              }
            } else {
              const linhas = doc.splitTextToSize(objTxt, maxTextW);
              blockH += linhas.length * LINE_H;
            }
            blockH += 5;
            blockH = Math.max(blockH, 16);
            if (curY + blockH > PAGE_BOTTOM) {
              doc.addPage();
              buildPdfHeaderOficial(doc, W, logos, hoje, "OBJETIVOS DE APRENDIZAGEM", data.disciplina_nome, bimStr, data.ano_letivo || 2026);
              drawFooter(doc, W, H, data.escola_nome, !bimNum ? bimLabel : bimStr);
              curY = 54;
            }
            doc.setFillColor(250, 251, 254);
            doc.roundedRect(MX, curY, CW, blockH, 2, 2, "F");
            doc.setDrawColor(215, 220, 235); doc.setLineWidth(0.2);
            doc.roundedRect(MX, curY, CW, blockH, 2, 2, "S");
            doc.setFillColor(r, g, b);
            doc.roundedRect(MX, curY, 3.5, blockH, 1, 1, "F");
            doc.setFillColor(r, g, b);
            doc.circle(MX + 11, curY + 7, 4, "F");
            doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
            doc.text(String(numIdx++), MX + 11, curY + 8.5, { align: "center" });
            let ty = curY + 6;
            if (topicos.length > 0) {
              for (const top of topicos) {
                const linhasTop = doc.splitTextToSize(top.texto, maxTextW);
                doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(22, 38, 68);
                doc.text(linhasTop, MX + 18, ty + 4);
                ty += linhasTop.length * LINE_H + 2;
                for (const sub of top.subitens) {
                  const linhasSub = doc.splitTextToSize(`• ${sub}`, maxTextW - 10);
                  doc.setFont("helvetica", "normal"); doc.setFontSize(7.8); doc.setTextColor(60, 80, 110);
                  doc.text(linhasSub, MX + 25, ty + 3.5);
                  ty += linhasSub.length * SUB_LINE_H + 1.5;
                }
              }
            } else {
              const linhas = doc.splitTextToSize(objTxt, maxTextW);
              doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(22, 38, 68);
              doc.text(linhas, MX + 18, ty + 4);
            }
            curY += blockH + 3;
          }
        }
        curY += 4; // espaço entre bimestres
      }
      curY += 8; // espaço entre séries
    }
    drawFooter(doc, W, H, data.escola_nome, bimStr);
  };

  // ── Orquestra: chama o gerador correto conforme o tipo ──────────────────────
  const gerarPDF = async () => {
    if (!pdfDisc) return;
    const discId = DISC_ID_MAP[pdfDisc];
    if (!discId) { setPdfErr("Disciplina não mapeada."); return; }

    const bimNum = pdfBimestre ? parseInt(pdfBimestre) : null;
    const serieParam = pdfSerie ? pdfSerie.toUpperCase().replace("ANO", "ANO").trim() : null;

    setPdfLoading(true); setPdfErr("");
    try {
      const params = { disciplina_id: discId, ano_letivo: 2026 };
      if (bimNum) params.bimestre = bimNum;
      if (serieParam) params.serie = serieParam;

      const { data } = await api.get("/conteudos/admin/relatorio/pdf-data", { params });
      if (!data?.ok || !data.itens?.length) {
        setPdfErr("Nenhum dado encontrado para essa seleção.");
        setPdfLoading(false);
        return;
      }
      const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W    = doc.internal.pageSize.getWidth();
      const H    = doc.internal.pageSize.getHeight();
      const hoje = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });

      if (pdfTipo === "interno") {
        await gerarPdfInterno(doc, W, H, hoje, data, bimNum);
      } else {
        await gerarPdfAlunos(doc, W, H, hoje, data, bimNum);
      }

      const blob    = doc.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      setPdfModalOpen(false);
    } catch (e) {
      const status = e?.response?.status;
      const errData = e?.response?.data;
      if (status === 403) {
        setPdfErr("Sem permissão para gerar este relatório. Fale com o administrador.");
      } else if (status === 404) {
        setPdfErr("Recurso não encontrado no servidor. Verifique a conexão.");
      } else if (status === 500) {
        setPdfErr("Erro interno no servidor. Tente novamente em instantes.");
      } else {
        setPdfErr(errData?.message || errData?.erro || "Erro ao gerar PDF. Tente novamente.");
      }
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Estado do modal (novo conteúdo) ──────────────────────────────────────
  const BIMESTRES_OPTS = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
  const [mSerie, setMSerie]           = useState("");
  const [mDisciplina, setMDisciplina] = useState("");
  const [mBimestre, setMBimestre]     = useState(BIMESTRES_OPTS[0]);
  const [mAno, setMAno]               = useState("2026");
  const [mUnidadeId, setMUnidadeId]   = useState("");

  // Unidades Temáticas carregadas da API
  const [unidades, setUnidades]         = useState([]);
  const [loadingUTs, setLoadingUTs]     = useState(false);
  const [erroUTs, setErroUTs]           = useState(null);

  // Conteúdos SEEDF carregados da API
  const [mConteudoId, setMConteudoId]   = useState("");
  const [conteudos, setConteudos]       = useState([]);
  const [loadingCTs, setLoadingCTs]     = useState(false);
  const [erroCTs, setErroCTs]           = useState(null);

  // Ref para pré-preencher UT e Conteúdo SEEDF ao abrir modal em modo edição
  // Evita que os useEffects de carregamento cascata apaguem os IDs originais
  const prefillRef = useRef({ unidadeId: null, conteudoId: null });

  // ── Objetivos de Aprendizagem (tópicos + subitens) ──────────────────────
  const escolaApelido = localStorage.getItem("escola_apelido")
                     || localStorage.getItem("nome_escola")
                     || "Escola";
  const [objetivos, setObjetivos]           = useState([]); // [{ id, texto, subitens: [{id,texto}] }]
  const [objSubVisible, setObjSubVisible]   = useState(false);
  const [novoTopico, setNovoTopico]         = useState("");
  const [novosSubitens, setNovosSubitens]   = useState([""]);
  const [topicoError, setTopicoError]       = useState(false);

  // ── Registro existente (carregar para edição) ────────────────────────────
  const [existingId, setExistingId]         = useState(null);   // id do registro no BD
  const [existingLoading, setExistingLoading] = useState(false); // checando...

  // Converte texto estruturado "1. Tópico\n   • Subitem" de volta para array [{id,texto,subitens}]
  const parseTextoToObjetivos = (texto) => {
    if (!texto) return [];
    const result = [];
    let atual = null;
    for (const linha of texto.split("\n")) {
      const tMatch = linha.match(/^\s*(\d+)\.\s+(.+)/);
      const sMatch = linha.match(/^\s*•\s+(.+)/);
      if (tMatch) {
        atual = { id: `obj-${Date.now()}-${result.length}`, texto: tMatch[2].trim(), subitens: [] };
        result.push(atual);
      } else if (sMatch && atual) {
        atual.subitens.push({ id: `si-${Date.now()}-${atual.subitens.length}`, texto: sMatch[1].trim() });
      } else {
        const raw = linha.replace(/^[•\-\*]\s*/, "").trim();
        if (raw) {
          // Linha sem número (dados importados) → trata como tópico
          atual = { id: `obj-${Date.now()}-${result.length}`, texto: raw, subitens: [] };
          result.push(atual);
        }
      }
    }
    return result;
  };

  // ── Estado do save ────────────────────────────────────────────────
  const [savingConteudo, setSavingConteudo] = useState(false);
  const [saveMsg, setSaveMsg]               = useState("");

  const addSubitemInput    = () => setNovosSubitens(p => [...p, ""]);
  const editSubitem        = (i, v) => setNovosSubitens(p => p.map((s, idx) => idx === i ? v : s));
  const removeSubitemInput = (i)    => setNovosSubitens(p => p.filter((_, idx) => idx !== i));

  // ── Edição inline de tópico existente ──────────────────────────────────────
  const [editandoObjId, setEditandoObjId]       = useState(null);  // id do obj em edição
  const [editTexto, setEditTexto]               = useState("");
  const [editSubitens, setEditSubitens]         = useState([""]);

  const startEditTopico = (obj) => {
    setEditandoObjId(obj.id);
    setEditTexto(obj.texto);
    // Monta array de strings dos subitems (adiciona 1 campo vazio ao final para novo)
    setEditSubitens(obj.subitens.length > 0
      ? [...obj.subitens.map(s => s.texto), ""]
      : [""]);
    setObjSubVisible(false); // fecha o form de NOVO tópico enquanto edita
  };

  const cancelEditTopico = () => {
    setEditandoObjId(null);
    setEditTexto("");
    setEditSubitens([""]);
  };

  const saveEditTopico = (id) => {
    const texto = editTexto.trim();
    if (!texto) return; // não salva vazio
    const subitens = editSubitens
      .map(s => s.trim()).filter(Boolean)
      .map((s, i) => ({ id: `si-${Date.now()}-${i}`, texto: s }));
    setObjetivos(p => p.map(o =>
      o.id === id ? { ...o, texto, subitens } : o
    ));
    cancelEditTopico();
  };

  const addEditSubitem    = () => setEditSubitens(p => [...p, ""]);
  const changeEditSubitem = (i, v) => setEditSubitens(p => p.map((s, idx) => idx === i ? v : s));
  const removeEditSubitem = (i) => setEditSubitens(p => p.filter((_, idx) => idx !== i));

  // Confirma o tópico com subitens e reseta o editor
  const addTopico = () => {
    const texto = novoTopico.trim();
    if (!texto) {
      setTopicoError(true);          // destaca o campo em vermelho
      setTimeout(() => setTopicoError(false), 1500); // remove após 1.5s
      return;
    }
    setTopicoError(false);
    const subitens = novosSubitens
      .map(s => s.trim()).filter(Boolean)
      .map((s, i) => ({ id: `si-${Date.now()}-${i}`, texto: s }));
    setObjetivos(p => [...p, { id: `obj-${Date.now()}`, texto, subitens }]);
    setNovoTopico("");
    setNovosSubitens([""]);
    setObjSubVisible(false);
  };

  const removeTopico  = (id)       => setObjetivos(p => p.filter(o => o.id !== id));
  const removeSubitem = (oId, sId) => setObjetivos(p =>
    p.map(o => o.id === oId ? { ...o, subitens: o.subitens.filter(s => s.id !== sId) } : o)
  );

  // Salva o conteúdo programatico na API
  const salvarConteudo = async (statusEnvio) => {
    // Validações mínimas
    if (!mSerie || !mDisciplina || !mBimestre || !mAno || !mUnidadeId || !mConteudoId) {
      setSaveMsg("Preencha todos os campos: Série, Disciplina, Bimestre, Ano, Unidade Temática e Conteúdo SEEDF.");
      return;
    }
    if (objetivos.length === 0) {
      setSaveMsg("Adicione ao menos um Objetivo de Aprendizagem antes de salvar.");
      return;
    }

    const disciplinaId = DISC_ID_MAP[mDisciplina];
    if (!disciplinaId) { setSaveMsg("Disciplina não reconhecida."); return; }

    // Formata os objetivos como texto estruturado
    const textoObj = objetivos.map((obj, i) => {
      let t = `${i + 1}. ${obj.texto}`;
      if (obj.subitens.length > 0)
        t += "\n" + obj.subitens.map(s => `   • ${s.texto}`).join("\n");
      return t;
    }).join("\n\n");

    const bimestreNum = parseInt(mBimestre); // "1º Bimestre" → 1

    try {
      setSavingConteudo(true);
      setSaveMsg("");
      const { data } = await api.post("/conteudos/admin/planejamento", {
        disciplina_id:            disciplinaId,
        serie:                    mSerie.toUpperCase(),
        bimestre:                 bimestreNum,
        ano_letivo:               Number(mAno),
        bncc_unidade_tematica_id: Number(mUnidadeId),
        seedf_conteudo_id:        Number(mConteudoId),
        texto:                    textoObj,
      });
      if (data?.ok) {
        setSaveMsg(statusEnvio === "enviar" ? "✅ Conteúdo enviado com sucesso!" : "✅ Salvo como rascunho!");
        setTimeout(() => { setModalOpen(false); setSaveMsg(""); carregarLista(); }, 1200);
      } else {
        setSaveMsg(data?.message || "Erro ao salvar.");
      }
    } catch (e) {
      setSaveMsg(e?.response?.data?.message || "Erro de conexão. Tente novamente.");
    } finally {
      setSavingConteudo(false);
    }
  };

  // Mapa: nome da série → ano_id (número do ano escolar)
  const serieToAnoId = { "6º Ano": 6, "7º Ano": 7, "8º Ano": 8, "9º Ano": 9 };

  // 1º Efeito: carrega UTs quando série + disciplina são selecionadas
  useEffect(() => {
    // Ao trocar série/disciplina só reseta UT/Conteúdo se NÃO há pré-preenchimento pendente
    const hasPrefill = prefillRef.current.unidadeId != null;
    if (!hasPrefill) {
      setMUnidadeId("");
      setUnidades([]);
      setErroUTs(null);
      setMConteudoId("");
      setConteudos([]);
      setErroCTs(null);
    }

    const ano_id = serieToAnoId[mSerie];
    if (!ano_id || !mDisciplina) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingUTs(true);
        const { data } = await api.get("/conteudos/admin/bncc/unidades", {
          params: { disciplina_nome: mDisciplina, ano_id },
        });
        if (cancelled) return;
        setUnidades(Array.isArray(data?.unidades) ? data.unidades : []);
        setErroUTs(null);
        // Se há pré-preenchimento pendente (modo edição), aplica o ID da UT
        if (prefillRef.current.unidadeId != null) {
          setMUnidadeId(String(prefillRef.current.unidadeId));
          // NÃO limpa o prefillRef aqui — o 2º efeito (UTs → Conteúdos) ainda precisa do conteudoId
        }
      } catch (e) {
        if (!cancelled) { setUnidades([]); setErroUTs("Não foi possível carregar as Unidades Temáticas."); }
      } finally {
        if (!cancelled) setLoadingUTs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mSerie, mDisciplina]);

  // 2º Efeito: carrega Conteúdos SEEDF quando UT é selecionada
  useEffect(() => {
    // Ao trocar UT só reseta Conteúdo se NÃO há pré-preenchimento pendente
    const hasPrefill = prefillRef.current.conteudoId != null;
    if (!hasPrefill) {
      setMConteudoId("");
      setConteudos([]);
      setErroCTs(null);
    }

    if (!mUnidadeId || !mDisciplina || !mSerie) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingCTs(true);
        const { data } = await api.get("/conteudos/admin/seedf/conteudos", {
          params: {
            disciplina_nome: mDisciplina,
            serie: mSerie.toUpperCase(),   // ex: '6º ANO'
            unidade_tematica_id: mUnidadeId,
          },
        });
        if (cancelled) return;
        setConteudos(Array.isArray(data?.conteudos) ? data.conteudos : []);
        setErroCTs(null);
        // Se há pré-preenchimento pendente (modo edição), aplica o ID do Conteúdo SEEDF
        if (prefillRef.current.conteudoId != null) {
          setMConteudoId(String(prefillRef.current.conteudoId));
          // Limpa o ref após aplicar ambos os valores
          prefillRef.current = { unidadeId: null, conteudoId: null };
        }
      } catch (e) {
        if (!cancelled) { setConteudos([]); setErroCTs("Não foi possível carregar os Conteúdos SEEDF."); }
      } finally {
        if (!cancelled) setLoadingCTs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mUnidadeId]);

  // 3º Efeito: verifica/carrega registro existente quando Conteúdo SEEDF é selecionado
  useEffect(() => {
    setExistingId(null);
    // Limpa objetivos ao trocar conteúdo (serão recarregados se existir)
    setObjetivos([]);
    setObjSubVisible(false);
    setNovoTopico(""); setNovosSubitens([""]);

    const discId = DISC_ID_MAP[mDisciplina];
    if (!mConteudoId || !mSerie || !mDisciplina || !mBimestre || !discId) return;

    let cancelled = false;
    (async () => {
      try {
        setExistingLoading(true);
        const { data } = await api.get("/conteudos/admin/planejamento/check", {
          params: {
            disciplina_id:            discId,
            serie:                    mSerie.toUpperCase(),
            bimestre:                 parseInt(mBimestre),
            ano_letivo:               Number(mAno),
            seedf_conteudo_id:        Number(mConteudoId),
          },
        });
        if (cancelled) return;
        if (data?.found && data.registro) {
          setExistingId(data.registro.id);
          const parsed = parseTextoToObjetivos(data.registro.texto || "");
          setObjetivos(parsed);
        }
      } catch (e) {
        // Falha silenciosa — não bloqueia o usuário
        console.warn("[check existente] erro:", e?.message);
      } finally {
        if (!cancelled) setExistingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mConteudoId]);

  // Reseta estado completo do modal ao abrir (NOVO)
  const openModal = () => {
    prefillRef.current = { unidadeId: null, conteudoId: null }; // garante sem pré-preenchimento
    setMSerie(""); setMDisciplina(""); setMBimestre(BIMESTRES_OPTS[0]);
    setMAno("2026"); setMUnidadeId(""); setUnidades([]); setErroUTs(null);
    setMConteudoId(""); setConteudos([]); setErroCTs(null);
    setObjetivos([]); setObjSubVisible(false); setNovoTopico(""); setNovosSubitens([""]);
    setTopicoError(false); setSaveMsg("");
    setExistingId(null); setExistingLoading(false);
    setEditMode(false);
    setModalOpen(true);
  };

  // ── Estado de modo edição ─────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false); // true quando editando item existente

  // Abre modal PRÉ-POPULADO com dados do item para EDITAR
  const openEditModal = async (item) => {
    // Reseta tudo primeiro (sem pré-preenchimento)
    prefillRef.current = { unidadeId: null, conteudoId: null };
    setMSerie(""); setMDisciplina(""); setMBimestre(BIMESTRES_OPTS[0]);
    setMAno("2026"); setMUnidadeId(""); setUnidades([]); setErroUTs(null);
    setMConteudoId(""); setConteudos([]); setErroCTs(null);
    setObjetivos([]); setObjSubVisible(false); setNovoTopico(""); setNovosSubitens([""]);
    setTopicoError(false); setSaveMsg("");
    setExistingId(item.id || null);
    setExistingLoading(false);
    setEditMode(true);
    setModalOpen(true);

    // Pré-popula campos básicos (sem esperar API — já temos os dados do item da lista)
    const serieDisplay = normSerieDisplay(item.serie);
    const discNome = item.disciplina || "";
    const bimStr = item.bimestre || "1º Bimestre";

    // Objetivos: parseia o texto completo do item (já vem na lista)
    if (item.texto_completo) {
      setObjetivos(parseTextoToObjetivos(item.texto_completo));
    } else if (item.objetivo) {
      setObjetivos(parseTextoToObjetivos(item.objetivo));
    }

    // ✅ IDs de UT BNCC e Conteúdo SEEDF vêm diretamente do item da lista
    // (o backend foi corrigido para incluir bncc_unidade_tematica_id e seedf_conteudo_id)
    const unidadeId  = item.bncc_unidade_tematica_id || null;
    const conteudoId = item.seedf_conteudo_id || null;

    if (unidadeId && conteudoId) {
      // Define prefillRef ANTES de setar mSerie/mDisciplina para que os
      // useEffects de cascata apliquem os valores corretos ao terminar de carregar as listas
      prefillRef.current = { unidadeId, conteudoId };
    } else {
      // Fallback: busca os IDs no backend caso o item não os tenha
      try {
        const discId = DISC_ID_MAP[discNome] || item.disciplina_id;
        if (discId) {
          const { data } = await api.get("/conteudos/admin/planejamento/check", {
            params: {
              disciplina_id: discId,
              serie:         serieDisplay.toUpperCase().replace("Ano", "ANO"),
              bimestre:      parseInt(bimStr),
              ano_letivo:    2026,
              seedf_conteudo_id: conteudoId || 0,
            },
          });
          if (data?.found && data.registro) {
            const reg = data.registro;
            if (reg.texto) setObjetivos(parseTextoToObjetivos(reg.texto));
            setExistingId(reg.id);
            if (reg.bncc_unidade_tematica_id && reg.seedf_conteudo_id) {
              prefillRef.current = {
                unidadeId:  reg.bncc_unidade_tematica_id,
                conteudoId: reg.seedf_conteudo_id,
              };
            }
          }
        }
      } catch (e) {
        console.warn("[openEditModal] erro ao buscar IDs:", e?.message);
      }
    }

    // Dispara os useEffects de cascata APÓS definir o prefillRef
    setMBimestre(bimStr);
    setMSerie(serieDisplay);
    setMDisciplina(discNome);
  };

  // Carrega lista real ao montar e ao fechar modal (para refletir novos cadastros)
  useEffect(() => { carregarLista(); }, [serieFiltro, discFiltro, bimestreFiltro, statusFiltro]);

  // Filtros aplicados (dados reais, filtro já aplicado via API)
  const filtered = listaReal;

  // KPIs calculados a partir dos dados reais
  const total    = listaReal.length;
  const aprovado = listaReal.filter(c => c.status === "APROVADO").length;
  const revisao  = listaReal.filter(c => c.status === "ENVIADO").length;
  const pendente = listaReal.filter(c => c.status === "PENDENTE" || c.status === "RASCUNHO").length;
  const pctOk    = total > 0 ? Math.round((aprovado / total) * 100) : 0;

  return (
    <div className="cp-root">
      {/* ── Header ── */}
      <div className="cp-header">
        <div className="cp-header-left">
          <div className="cp-header-icon"><IcoBook /></div>
          <div>
            <h1 className="cp-title">Conteúdos Programáticos</h1>
            <p className="cp-subtitle">Gestão curricular por série, disciplina e bimestre</p>
          </div>
        </div>
        <div className="cp-header-actions">
          <button className="cp-btn-pdf" onClick={openPdfModal} id="btn-gera-pdf">
            <IcoPDF /> Gera PDF
          </button>
          <button className="cp-btn-outline" onClick={() => setViewMode(v => v === "cards" ? "table" : "cards")}>
            <IcoStats /> {viewMode === "cards" ? "Visualização em tabela" : "Visualização em cards"}
          </button>
          <button className="cp-btn-primary" onClick={openModal}>
            <IcoPlus /> Novo Conteúdo
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="cp-kpi-row">
        <div className="cp-kpi cp-kpi-total">
          <span className="cp-kpi-num">{total}</span>
          <span className="cp-kpi-label">Registros totais</span>
          <div className="cp-kpi-bar"><div style={{ width: "100%", background: "#6366f1" }} /></div>
        </div>
        <div className="cp-kpi cp-kpi-ok">
          <span className="cp-kpi-num">{aprovado}</span>
          <span className="cp-kpi-label">Aprovados</span>
          <div className="cp-kpi-bar"><div style={{ width: `${pctOk}%`, background: "#10b981" }} /></div>
        </div>
        <div className="cp-kpi cp-kpi-rev">
          <span className="cp-kpi-num">{revisao}</span>
          <span className="cp-kpi-label">Em revisão</span>
          <div className="cp-kpi-bar"><div style={{ width: `${Math.round((revisao/total)*100)}%`, background: "#3b82f6" }} /></div>
        </div>
        <div className="cp-kpi cp-kpi-pend">
          <span className="cp-kpi-num">{pendente}</span>
          <span className="cp-kpi-label">Pendentes / Rascunho</span>
          <div className="cp-kpi-bar"><div style={{ width: `${Math.round((pendente/total)*100)}%`, background: "#f59e0b" }} /></div>
        </div>
        <div className="cp-kpi cp-kpi-prog">
          <span className="cp-kpi-num">{pctOk}%</span>
          <span className="cp-kpi-label">Conclusão geral</span>
          <div className="cp-progress-ring">
            <svg viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${pctOk} ${100 - pctOk}`} strokeDashoffset="25" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="cp-filters">
        <div className="cp-filter-label"><IcoFilter /> Filtros</div>

        <select className="cp-select" value={serieFiltro} onChange={e => setSerieFiltro(e.target.value)}>
          <option value="Todas">Todas as séries</option>
          {SERIES.map(s => <option key={s}>{s}</option>)}
        </select>

        <select className="cp-select" value={discFiltro} onChange={e => setDiscFiltro(e.target.value)}>
          <option value="Todas">Todas as disciplinas</option>
          {DISCIPLINAS.map(d => <option key={d}>{d}</option>)}
        </select>

        <select className="cp-select" value={bimestreFiltro} onChange={e => setBimestreFiltro(e.target.value)}>
          <option value="Todos">Todos os bimestres</option>
          {BIMESTRES.map(b => <option key={b}>{b}</option>)}
        </select>

        <select className="cp-select" value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="Todos">Todos os status</option>
          <option value="APROVADO">Aprovado</option>
          <option value="ENVIADO">Em revisão</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="PENDENTE">Pendente</option>
        </select>

        <span className="cp-filter-count">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Conteúdo principal ── */}
      {listaLoading ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, padding: "48px 0", color: "#6366f1", fontSize: "0.92rem",
        }}>
          <span style={{
            width: 22, height: 22, border: "3px solid #e0e7ff",
            borderTopColor: "#6366f1", borderRadius: "50%",
            display: "inline-block", animation: "cp-spin 0.7s linear infinite",
          }} />
          Carregando conteúdos...
        </div>
      ) : listaErr ? (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
          padding: "16px 20px", color: "#b91c1c", fontSize: "0.85rem", margin: "16px 0",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          {listaErr}
          <button onClick={carregarLista} style={{
            marginLeft: "auto", padding: "4px 12px", borderRadius: 6,
            border: "1px solid #fca5a5", background: "#fff", color: "#b91c1c",
            cursor: "pointer", fontSize: "0.8rem",
          }}>Tentar novamente</button>
        </div>
      ) : viewMode === "cards" ? (
        <div className="cp-cards-grid">
          {filtered.length === 0 && (
            <div className="cp-empty">
              <IcoBook />
              <p>Nenhum conteúdo encontrado para os filtros selecionados.</p>
            </div>
          )}
          {filtered.map(item => {
            const st = STATUS_COLORS[item.status] || STATUS_COLORS.RASCUNHO;
            const corSerie = COR_SERIE[item.serie] || "#6366f1";
            return (
              <div key={item.id} className="cp-card" style={{ "--serie-color": corSerie }}>
                <div className="cp-card-top">
                  <div className="cp-card-serie" style={{ background: corSerie + "18", color: corSerie }}>
                    {item.serie}
                  </div>
                  <div className="cp-card-status" style={{ background: st.bg, color: st.text }}>
                    <span className="cp-status-dot" style={{ background: st.dot }} />
                    {st.label}
                  </div>
                </div>

                <div className="cp-card-disciplina">{item.disciplina}</div>
                <div className="cp-card-bimestre">{item.bimestre}</div>

                <div className="cp-card-unidade">{item.unidade}</div>
                <p className="cp-card-conteudo">{item.conteudo}</p>
                <p className="cp-card-objetivo"><strong>Objetivo:</strong> {item.objetivo}</p>

                <div className="cp-card-footer">
                  <span className="cp-card-itens">{item.itens} iten{item.itens !== 1 ? "s" : ""}</span>
                  <div className="cp-card-btns">
                    <button className="cp-icon-btn cp-icon-btn-view" title="Visualizar" onClick={() => setDetalheItem(item)}>
                      <IcoEye />
                    </button>
                    <button className="cp-icon-btn cp-icon-btn-edit" title="Editar" onClick={() => openEditModal(item)}>
                      <IcoEdit />
                    </button>
                    {item.status === "ENVIADO" && (
                      <button className="cp-icon-btn cp-icon-btn-approve" title="Aprovar">
                        <IcoCheck />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Tabela ── */
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th>Série</th>
                <th>Disciplina</th>
                <th>Bimestre</th>
                <th>Unidade Temática - BNCC</th>
                <th>Conteúdo</th>
                <th>Itens</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="cp-table-empty">Nenhum resultado encontrado.</td></tr>
              )}
              {filtered.map((item, i) => {
                const st = STATUS_COLORS[item.status] || STATUS_COLORS.RASCUNHO;
                const corSerie = COR_SERIE[item.serie] || "#6366f1";
                return (
                  <tr key={item.id} className={i % 2 === 0 ? "cp-tr-even" : ""}>
                    <td>
                      <span className="cp-pill" style={{ background: corSerie + "18", color: corSerie }}>{item.serie}</span>
                    </td>
                    <td className="cp-td-bold">{item.disciplina}</td>
                    <td>{item.bimestre}</td>
                    <td>{item.unidade}</td>
                    <td className="cp-td-conteudo">{item.conteudo}</td>
                    <td className="cp-td-center">{item.itens}</td>
                    <td>
                      <span className="cp-status-badge" style={{ background: st.bg, color: st.text }}>
                        <span className="cp-status-dot" style={{ background: st.dot }} />
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <div className="cp-td-actions">
                        <button className="cp-icon-btn cp-icon-btn-view" title="Visualizar" onClick={() => setDetalheItem(item)}><IcoEye /></button>
                        <button className="cp-icon-btn cp-icon-btn-edit" title="Editar" onClick={() => openEditModal(item)}><IcoEdit /></button>
                        {item.status === "ENVIADO" && (
                          <button className="cp-icon-btn cp-icon-btn-approve" title="Aprovar"><IcoCheck /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* ── Modal VISUALIZAR ── */}
      {detalheItem && (() => {
        try {
        const item = detalheItem;
        const statusKey = typeof item.status === "string" ? item.status : String(item.status || "RASCUNHO");
        const st = STATUS_COLORS[statusKey] || STATUS_COLORS.RASCUNHO;
        const corSerie = COR_SERIE[item.serie] || "#6366f1";
        const textoObj = typeof (item.texto_completo || item.objetivo) === "string"
          ? (item.texto_completo || item.objetivo || "")
          : String(item.texto_completo || item.objetivo || "");
        const topicos = parseObjetivo(textoObj);
        return (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(15,23,42,0.72)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "flex-start", justifyContent: "center",
              padding: "24px 16px", overflowY: "auto",
            }}
            onClick={() => setDetalheItem(null)}
          >
            <div
              style={{
                background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640,
                boxShadow: "0 32px 80px rgba(0,0,0,.28)", overflow: "hidden",
                marginTop: 8, animation: "cp-fadein .2s ease",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header do modal */}
              <div style={{
                background: `linear-gradient(135deg, ${corSerie}dd, ${corSerie})`,
                padding: "20px 24px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem",
                  }}>📋</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                      {item.disciplina}
                    </h2>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      {[item.serie, item.bimestre].map((tag, i) => (
                        <span key={i} style={{
                          fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", fontWeight: 600,
                          background: "rgba(255,255,255,0.18)", borderRadius: 20, padding: "2px 10px",
                        }}>{tag}</span>
                      ))}
                      <span style={{
                        fontSize: "0.72rem", fontWeight: 700,
                        background: st.bg, color: st.text,
                        borderRadius: 20, padding: "2px 10px",
                      }}>
                        <span style={{ background: st.dot, width: 6, height: 6, borderRadius: "50%", display: "inline-block", marginRight: 4 }} />
                        {st.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => openEditModal(item)}
                    style={{
                      background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)",
                      borderRadius: 10, padding: "7px 14px", cursor: "pointer",
                      color: "#fff", fontSize: "0.8rem", fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <IcoEdit /> Editar
                  </button>
                  <button
                    onClick={() => setDetalheItem(null)}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)", border: "none",
                      color: "#fff", fontSize: "1.2rem", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✕</button>
                </div>
              </div>

              {/* Corpo */}
              <div style={{ padding: "20px 24px", maxHeight: "72vh", overflowY: "auto" }}>

                {/* Metadados em grid */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20,
                }}>
                  {[
                    { label: "Unidade Temática - BNCC", value: item.unidade || "—" },
                    { label: "Conteúdo SEEDF", value: item.conteudo || "—" },
                    { label: "Ano Letivo", value: item.ano_letivo || "2026" },
                    { label: "Itens de Aprendizagem", value: `${item.itens || 0} objetivo${item.itens !== 1 ? "s" : ""}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      background: "#f8fafc", border: "1px solid #e5e7eb",
                      borderRadius: 10, padding: "10px 14px",
                    }}>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.4 }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Objetivos de Aprendizagem */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                    paddingBottom: 8, borderBottom: `2px solid ${corSerie}30`,
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: corSerie + "20", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "0.9rem",
                    }}>🎯</span>
                    <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>
                      Objetivos de Aprendizagem
                    </h3>
                    <span style={{
                      marginLeft: "auto", fontSize: "0.72rem", fontWeight: 700,
                      background: corSerie + "18", color: corSerie,
                      borderRadius: 20, padding: "2px 10px",
                    }}>{topicos.length} tópico{topicos.length !== 1 ? "s" : ""}</span>
                  </div>

                  {topicos.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
                      <p style={{ margin: 0, fontSize: "0.85rem" }}>Nenhum objetivo registrado.</p>
                    </div>
                  ) : (
                    topicos.map((top, ti) => (
                      <div key={ti} style={{
                        background: "#fafbff", border: "1px solid #e5e7eb",
                        borderRadius: 10, padding: "12px 14px 12px 44px",
                        position: "relative", marginBottom: 8,
                      }}>
                        {/* Barra lateral */}
                        <div style={{
                          position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
                          borderRadius: "10px 0 0 10px", background: corSerie,
                        }} />
                        {/* Número */}
                        <div style={{
                          position: "absolute", left: 10, top: 10,
                          width: 22, height: 22, borderRadius: "50%",
                          background: corSerie,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.68rem", fontWeight: 800, color: "#fff",
                        }}>{top.num || ti + 1}</div>
                        <p style={{ margin: 0, fontSize: "0.87rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.5 }}>
                          {top.texto}
                        </p>
                        {top.subitens?.length > 0 && (
                          <ul style={{ margin: "6px 0 0", paddingLeft: 16, listStyle: "none" }}>
                            {top.subitens.map((sub, si) => (
                              <li key={si} style={{ display: "flex", gap: 6, marginBottom: 3, fontSize: "0.8rem", color: "#475569" }}>
                                <span style={{ color: corSerie, flexShrink: 0 }}>•</span>
                                <span>{typeof sub === "string" ? sub : sub.texto}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: "14px 24px", borderTop: "1px solid #f1f5f9",
                display: "flex", justifyContent: "flex-end", gap: 10,
                background: "#fafbff",
              }}>
                <button
                  onClick={() => { setDetalheItem(null); openEditModal(item); }}
                  style={{
                    background: `linear-gradient(135deg, ${corSerie}, ${corSerie}cc)`,
                    border: "none", borderRadius: 10, padding: "9px 20px",
                    color: "#fff", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  <IcoEdit /> Editar este conteúdo
                </button>
                <button
                  onClick={() => setDetalheItem(null)}
                  style={{
                    background: "#f1f5f9", border: "none", borderRadius: 10,
                    padding: "9px 20px", color: "#64748b", fontSize: "0.85rem",
                    fontWeight: 600, cursor: "pointer",
                  }}
                >Fechar</button>
              </div>
            </div>
          </div>
        );
        } catch (err) {
          console.error("[ModalVisualizarConteudo] erro ao renderizar:", err);
          return null;
        }
      })()}

      {/* ── Modal Novo Conteúdo ── */}
      {modalOpen && (
        <div className="cp-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <span className="cp-modal-icon"><IcoPlus /></span>
              <h2>{editMode ? "Editar Conteúdo Programático" : "Novo Conteúdo Programático"}</h2>
            </div>
            <div className="cp-modal-body">
              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Série</label>
                  <select
                    className="cp-select cp-select-full"
                    value={mSerie}
                    onChange={e => setMSerie(e.target.value)}
                  >
                    <option value="">Selecione a série...</option>
                    {SERIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Disciplina</label>
                  <select
                    className="cp-select cp-select-full"
                    value={mDisciplina}
                    onChange={e => setMDisciplina(e.target.value)}
                  >
                    <option value="">Selecione a disciplina...</option>
                    {DISCIPLINAS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Bimestre</label>
                  <select
                    className="cp-select cp-select-full"
                    value={mBimestre}
                    onChange={e => setMBimestre(e.target.value)}
                  >
                    {BIMESTRES_OPTS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Ano Letivo</label>
                  <select
                    className="cp-select cp-select-full"
                    value={mAno}
                    onChange={e => setMAno(e.target.value)}
                  >
                    <option>2026</option><option>2025</option>
                  </select>
                </div>
              </div>

              {/* Unidade Temática - BNCC: carrega automaticamente com Série + Disciplina */}
              <div className="cp-form-group cp-form-full">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Unidade Temática - BNCC
                  {loadingUTs && (
                    <span style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 600 }}>
                      ⏳ Carregando...
                    </span>
                  )}
                </label>

                {!mSerie || !mDisciplina ? (
                  <div className="cp-ut-hint">
                    Selecione a <strong>Série</strong> e a <strong>Disciplina</strong> para carregar as Unidades Temáticas da BNCC.
                  </div>
                ) : erroUTs ? (
                  <div className="cp-ut-erro">{erroUTs}</div>
                ) : loadingUTs ? (
                  <select className="cp-select cp-select-full" disabled>
                    <option>Carregando Unidades Temáticas BNCC...</option>
                  </select>
                ) : unidades.length === 0 ? (
                  <div className="cp-ut-hint cp-ut-vazio">
                    Nenhuma Unidade Temática encontrada para <strong>{mDisciplina}</strong> — {mSerie}.
                  </div>
                ) : (
                  <select
                    className="cp-select cp-select-full"
                    value={mUnidadeId}
                    onChange={e => setMUnidadeId(e.target.value)}
                  >
                    <option value="">Selecione uma Unidade Temática BNCC...</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.texto}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Conteúdo - Currículo em Movimento - SEEDF: carrega ao selecionar UT */}
              <div className="cp-form-group cp-form-full">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Conteúdo - Currículo em Movimento - SEEDF
                  {loadingCTs && (
                    <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
                      ⏳ Carregando...
                    </span>
                  )}
                </label>

                {!mUnidadeId ? (
                  <div className="cp-ut-hint">
                    Selecione a <strong>Unidade Temática - BNCC</strong> para carregar os Conteúdos do Currículo em Movimento - SEEDF.
                  </div>
                ) : erroCTs ? (
                  <div className="cp-ut-erro">{erroCTs}</div>
                ) : loadingCTs ? (
                  <select className="cp-select cp-select-full" disabled>
                    <option>Carregando conteúdos SEEDF...</option>
                  </select>
                ) : conteudos.length === 0 ? (
                  <div className="cp-ut-hint cp-ut-vazio">
                    Nenhum conteúdo SEEDF encontrado para esta Unidade Temática.
                    <br />
                    <span style={{ fontSize: "0.78rem", opacity: 0.8 }}>Isso pode ocorrer para tópicos não catalogados no Currículo em Movimento.</span>
                  </div>
                ) : (
                  <select
                    className="cp-select cp-select-full"
                    value={mConteudoId}
                    onChange={e => setMConteudoId(e.target.value)}
                    style={{ height: "auto" }}
                  >
                    <option value="">Selecione um conteúdo do Currículo em Movimento...</option>
                    {conteudos.map(c => (
                      <option key={c.id} value={c.id} title={c.texto}>
                        {c.texto.length > 100 ? c.texto.substring(0, 100) + "…" : c.texto}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {/* ── OBJETIVO DE APRENDIZAGEM ─ input sempre visível, subitens ao focar ── */}
              <div className="cp-form-group cp-form-full">
                <label>
                  Objetivo de Aprendizagem
                  <span style={{ color: "#6366f1", fontWeight: 700 }}>{" "}- {escolaApelido}</span>
                </label>

                {/* Banner: verificando BD */}
                {existingLoading && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "#f0f9ff", border: "1px solid #bae6fd",
                    borderRadius: 8, padding: "8px 12px", marginBottom: 10,
                    fontSize: "0.8rem", color: "#0369a1",
                  }}>
                    <span className="cp-spin">⏳</span>
                    Verificando se já existe objetivo cadastrado para esta seleção...
                  </div>
                )}

                {/* Banner: registro existente carregado */}
                {!existingLoading && existingId && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    background: "#fffbeb", border: "1px solid #fcd34d",
                    borderRadius: 8, padding: "10px 14px", marginBottom: 10,
                  }}>
                    <span style={{ fontSize: "1.1rem" }}>✏️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#92400e", fontSize: "0.82rem" }}>
                        Editando registro existente
                      </div>
                      <div style={{ color: "#b45309", fontSize: "0.75rem", marginTop: 2 }}>
                        Os objetivos abaixo foram carregados do banco de dados. Edite à vontade — ao salvar, o registro será atualizado.
                        Para adicionar um novo objetivo independente, clique em <strong>+ Adicionar tópico</strong>.
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Descartar carregamento e começar do zero"
                      onClick={() => { setObjetivos([]); setExistingId(null); }}
                      style={{
                        background: "none", border: "1px solid #fbbf24", borderRadius: 6,
                        cursor: "pointer", color: "#92400e", fontSize: "0.72rem",
                        padding: "3px 8px", whiteSpace: "nowrap",
                      }}
                    >
                      Limpar
                    </button>
                  </div>
                )}

                {/* Banner: sem registro (novo cadastro) */}
                {!existingLoading && !existingId && mConteudoId && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "#f0fdf4", border: "1px solid #86efac",
                    borderRadius: 8, padding: "8px 12px", marginBottom: 10,
                    fontSize: "0.78rem", color: "#166534",
                  }}>
                    <span>🆕</span>
                    Nenhum objetivo cadastrado para esta combinação. Adicione abaixo.
                  </div>
                )}

                {/* Tópicos já confirmados */}
                {objetivos.length > 0 && (
                  <div className="cp-obj-lista">
                    {objetivos.map((obj, oi) => (
                      <div key={obj.id} className="cp-obj-card">

                        {/* Linha do tópico */}
                        <div className="cp-obj-card-top">
                          <div className="cp-obj-num">{oi + 1}</div>
                          <div className="cp-obj-texto">{obj.texto}</div>
                          {/* Botão editar */}
                          <button
                            type="button"
                            className="cp-obj-edit"
                            title="Editar tópico e subitens"
                            onClick={() => editandoObjId === obj.id
                              ? cancelEditTopico()
                              : startEditTopico(obj)}
                          >
                            {editandoObjId === obj.id ? "✕" : "✏️"}
                          </button>
                          <button type="button" className="cp-obj-del"
                            onClick={() => removeTopico(obj.id)} title="Remover tópico">🗑</button>
                        </div>

                        {/* Subitens existentes (quando NÃO está editando) */}
                        {editandoObjId !== obj.id && obj.subitens.length > 0 && (
                          <ul className="cp-obj-subitens">
                            {obj.subitens.map(s => (
                              <li key={s.id}>
                                <span className="cp-obj-bullet">◦</span>
                                <span className="cp-obj-sub-txt">{s.texto}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* ── FORMULÁRIO DE EDIÇÃO INLINE ── */}
                        {editandoObjId === obj.id && (
                          <div className="cp-obj-editor" style={{ marginTop: 8, background: "#f8fafc", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>

                            {/* Campo do tópico */}
                            <div style={{ marginBottom: 8 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>
                                Tópico principal
                              </label>
                              <input
                                type="text"
                                className="cp-input"
                                style={{ width: "100%", boxSizing: "border-box" }}
                                value={editTexto}
                                autoFocus
                                onChange={e => setEditTexto(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEditTopico(obj.id); } }}
                              />
                            </div>

                            {/* Subitens em edição */}
                            <div className="cp-obj-editor-label" style={{ marginBottom: 6 }}>
                              ◦ Subitens <span style={{ fontWeight: 400, fontSize: "0.72rem" }}>(opcional)</span>
                            </div>
                            {editSubitens.map((sub, i) => (
                              <div key={i} className="cp-obj-sub-row">
                                <input
                                  type="text"
                                  className="cp-input"
                                  placeholder={`Subitem ${i + 1}...`}
                                  value={sub}
                                  onChange={e => changeEditSubitem(i, e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEditSubitem(); } }}
                                />
                                {editSubitens.length > 1 && (
                                  <button type="button" className="cp-obj-del cp-obj-del-sm"
                                    onClick={() => removeEditSubitem(i)}>✕</button>
                                )}
                              </div>
                            ))}
                            <button type="button" className="cp-obj-add-sub" onClick={addEditSubitem}>
                              + subitem
                            </button>

                            {/* Ações */}
                            <div className="cp-obj-editor-actions" style={{ marginTop: 10 }}>
                              <button type="button" className="cp-btn-outline"
                                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                                onClick={cancelEditTopico}>
                                Cancelar
                              </button>
                              <button type="button" className="cp-btn-primary"
                                style={{ padding: "5px 16px", fontSize: "0.78rem" }}
                                onClick={() => saveEditTopico(obj.id)}>
                                ✓ Confirmar
                              </button>
                            </div>

                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}


                {/* Input do tópico — SEMPRE visível, sem seta de dropdown */}
                <input
                  type="text"
                  className={`cp-input${topicoError ? " cp-input-error" : ""}`}
                  style={{ width: "100%", boxSizing: "border-box" }}
                  placeholder={objetivos.length === 0
                    ? "O que o aluno deverá ser capaz de fazer ao final..."
                    : "Adicionar outro tópico..."}
                  value={novoTopico}
                  onChange={e => { setNovoTopico(e.target.value); setTopicoError(false); if (e.target.value) setObjSubVisible(true); }}
                  onFocus={() => setObjSubVisible(true)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addTopico(); } }}
                />

                {/* Subitens — aparecem ao focar/digitar */}
                {objSubVisible && (
                  <div className="cp-obj-editor">
                    <div className="cp-obj-editor-label">
                      ◦ Subitens <span style={{ fontWeight: 400, fontSize: "0.72rem" }}>(opcional)</span>
                    </div>
                    {novosSubitens.map((sub, i) => (
                      <div key={i} className="cp-obj-sub-row">
                        <input
                          type="text"
                          className="cp-input"
                          placeholder={`Subitem ${i + 1}...`}
                          value={sub}
                          onChange={e => editSubitem(i, e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubitemInput(); } }}
                        />
                        {novosSubitens.length > 1 && (
                          <button type="button" className="cp-obj-del cp-obj-del-sm"
                            onClick={() => removeSubitemInput(i)}>✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="cp-obj-add-sub" onClick={addSubitemInput}>
                      + subitem
                    </button>
                    <div className="cp-obj-editor-actions">
                      <button type="button" className="cp-btn-outline"
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                        onClick={() => { setObjSubVisible(false); setNovoTopico(""); setNovosSubitens([""]); setTopicoError(false); }}>
                        Cancelar
                      </button>
                      {/* botão sempre habilitado — valida internamente e destaca campo */}
                      <button type="button" className="cp-btn-primary"
                        style={{ padding: "6px 16px", fontSize: "0.82rem" }}
                        onClick={addTopico}>
                        ✓ Confirmar tópico
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
            <div className="cp-modal-footer">
              {saveMsg && (
                <span style={{
                  fontSize: "0.82rem", fontWeight: 600, flex: 1,
                  color: saveMsg.startsWith("✅") ? "#10b981" : "#ef4444"
                }}>{saveMsg}</span>
              )}
              <button className="cp-btn-outline"
                onClick={() => setModalOpen(false)}
                disabled={savingConteudo}>Cancelar</button>
              <button className="cp-btn-primary"
                onClick={() => salvarConteudo("rascunho")}
                disabled={savingConteudo}>
                {savingConteudo ? "⏳ Salvando..." : "Salvar como Rascunho"}
              </button>
              <button className="cp-btn-success"
                onClick={() => salvarConteudo("enviar")}
                disabled={savingConteudo}>
                {savingConteudo ? "⏳ Enviando..." : "Salvar e Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Detalhe ── */}
      {detalheItem && (
        <div className="cp-modal-overlay" onClick={() => setDetalheItem(null)}>
          <div className="cp-modal cp-modal-detalhe" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <span className="cp-modal-icon" style={{ background: (COR_SERIE[detalheItem.serie] || "#6366f1") + "22", color: COR_SERIE[detalheItem.serie] || "#6366f1" }}>
                <IcoBook />
              </span>
              <div>
                <h2>{detalheItem.disciplina}</h2>
                <p style={{ color: "#64748b", fontSize: "0.85rem" }}>{detalheItem.serie} — {detalheItem.bimestre}</p>
              </div>
            </div>
            <div className="cp-modal-body">
              <div className="cp-detalhe-grid">
                <div className="cp-detalhe-field"><span>Unidade Temática - BNCC</span><strong>{detalheItem.unidade}</strong></div>
                <div className="cp-detalhe-field"><span>Status</span>
                  <span className="cp-status-badge" style={{ background: STATUS_COLORS[detalheItem.status].bg, color: STATUS_COLORS[detalheItem.status].text }}>
                    <span className="cp-status-dot" style={{ background: STATUS_COLORS[detalheItem.status].dot }} />
                    {STATUS_COLORS[detalheItem.status].label}
                  </span>
                </div>
                <div className="cp-detalhe-field cp-detalhe-full"><span>Conteúdo - Currículo em Movimento - SEEDF</span><p>{detalheItem.conteudo}</p></div>
                <div className="cp-detalhe-field cp-detalhe-full"><span>Objetivo de Aprendizagem - {localStorage.getItem("escola_apelido") || "Escola"}</span><p>{detalheItem.objetivo}</p></div>
                <div className="cp-detalhe-field"><span>Total de Itens</span><strong>{detalheItem.itens} itens cadastrados</strong></div>
              </div>
              {detalheItem.status === "ENVIADO" && (
                <div className="cp-detalhe-actions-bar">
                  <p>Este conteúdo está aguardando aprovação da coordenação.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="cp-btn-outline">Solicitar Ajuste</button>
                    <button className="cp-btn-success"><IcoCheck /> Aprovar Conteúdo</button>
                  </div>
                </div>
              )}
            </div>
            <div className="cp-modal-footer">
              <button className="cp-btn-outline" onClick={() => setDetalheItem(null)}>Fechar</button>
              <button className="cp-btn-primary"><IcoEdit /> Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Gera PDF ── */}
      {pdfModalOpen && (
        <div className="cp-modal-overlay" onClick={() => setPdfModalOpen(false)}>
          <div className="cp-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="cp-modal-header" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", borderRadius: "16px 16px 0 0", padding: "20px 24px" }}>
              <span className="cp-modal-icon" style={{ background: "#ffffff22", color: "#fff" }}>
                <IcoPDF />
              </span>
              <div>
                <h2 style={{ color: "#fff", margin: 0, fontSize: "1.1rem" }}>Gerar PDF</h2>
                <p style={{ color: "#c7d2fe", fontSize: "0.8rem", margin: "2px 0 0" }}>
                  Relatório de Conteúdo Programático — CEF04-CCMDF
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="cp-modal-body">

              {/* Preview do cabeçalho do PDF */}
              <div style={{
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                borderRadius: 10, padding: "14px 18px", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.92rem" }}>CEF04-CCMDF</div>
                  <div style={{ color: "#c7d2fe", fontSize: "0.72rem" }}>Conteúdo Programático — Ano Letivo 2026</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {pdfDisc && (
                      <span style={{ background: "#4f46e5", color: "#e0e7ff", fontSize: "0.7rem", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                        {pdfDisc}
                      </span>
                    )}
                    {pdfSerie && (
                      <span style={{ background: "#4f46e5", color: "#e0e7ff", fontSize: "0.7rem", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                        {pdfSerie}
                      </span>
                    )}
                    {pdfBimestre && (
                      <span style={{ background: "#4f46e5", color: "#e0e7ff", fontSize: "0.7rem", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                        {parseInt(pdfBimestre)}º Bimestre
                      </span>
                    )}
                    {!pdfDisc && (
                      <span style={{ color: "#a5b4fc", fontSize: "0.7rem" }}>Selecione a disciplina abaixo ↓</span>
                    )}
                  </div>
                </div>
                <div style={{ color: "#c7d2fe", opacity: 0.6, fontSize: "2.5rem" }}>📄</div>
              </div>

              {/* ── Seletor de Tipo de PDF ── */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display:"block", fontWeight:600, color:"#374151", fontSize:"0.85rem", marginBottom:8 }}>
                  Tipo de Relatório <span style={{ color:"#ef4444" }}>*</span>
                </label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>

                  {/* Interno */}
                  <button
                    type="button"
                    id="pdf-tipo-interno"
                    onClick={() => setPdfTipo("interno")}
                    style={{
                      border: pdfTipo === "interno" ? "2px solid #6366f1" : "2px solid #e2e8f0",
                      borderRadius: 10, padding: "12px 10px", cursor:"pointer", textAlign:"left",
                      background: pdfTipo === "interno" ? "#eef2ff" : "#f8fafc",
                      transition: "all .18s",
                    }}
                  >
                    <div style={{ fontSize:"1.2rem", marginBottom:4 }}>🏫</div>
                    <div style={{ fontWeight:700, fontSize:"0.82rem", color: pdfTipo==="interno"?"#4338ca":"#374151" }}>
                      Pedagógico (Interno)
                    </div>
                    <div style={{ fontSize:"0.7rem", color:"#64748b", marginTop:3 }}>
                      Tabela completa: UT-BNCC, Conteúdo SEEDF e Objetivos
                    </div>
                  </button>

                  {/* Alunos */}
                  <button
                    type="button"
                    id="pdf-tipo-alunos"
                    onClick={() => setPdfTipo("alunos")}
                    style={{
                      border: pdfTipo === "alunos" ? "2px solid #10b981" : "2px solid #e2e8f0",
                      borderRadius: 10, padding: "12px 10px", cursor:"pointer", textAlign:"left",
                      background: pdfTipo === "alunos" ? "#f0fdf4" : "#f8fafc",
                      transition: "all .18s",
                    }}
                  >
                    <div style={{ fontSize:"1.2rem", marginBottom:4 }}>👨‍👩‍👧 </div>
                    <div style={{ fontWeight:700, fontSize:"0.82rem", color: pdfTipo==="alunos"?"#059669":"#374151" }}>
                      Alunos / Responsáveis
                    </div>
                    <div style={{ fontSize:"0.7rem", color:"#64748b", marginTop:3 }}>
                      Apenas Objetivos únicos, sem repetição (EDUCA MOBILE)
                    </div>
                  </button>

                </div>
              </div>

              {/* ── Filtros Premium ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Card: Disciplina (obrigatória) */}
                <div style={{
                  border: pdfDisc ? "1.5px solid #6366f1" : "1.5px solid #fed7aa",
                  borderRadius: 12,
                  background: pdfDisc ? "#fafbff" : "#fffbf7",
                  padding: "12px 14px",
                  transition: "all .2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: pdfDisc ? "#eef2ff" : "#fff7ed",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1rem",
                      }}>📚</span>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>Disciplina</span>
                    </div>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: pdfDisc ? "#eef2ff" : "#fef3c7",
                      color: pdfDisc ? "#4f46e5" : "#d97706",
                    }}>
                      {pdfDisc ? "✓ Selecionada" : "Obrigatório"}
                    </span>
                  </div>
                  <select
                    id="pdf-disc-select"
                    value={pdfDisc}
                    onChange={e => { setPdfDisc(e.target.value); setPdfErr(""); }}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      border: pdfDisc ? "1.5px solid #a5b4fc" : "1.5px solid #fbbf24",
                      background: "#fff", fontSize: "0.88rem", color: "#1e293b",
                      fontWeight: pdfDisc ? 600 : 400,
                      cursor: "pointer", outline: "none", appearance: "none",
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236366f1' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                      backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: 16,
                    }}
                  >
                    <option value="">Selecione a disciplina...</option>
                    {DISCIPLINAS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>

                {/* Linha divisória com label "Filtros opcionais" */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Filtros opcionais
                  </span>
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                </div>

                {/* Cards opcionais: Série + Bimestre lado a lado */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

                  {/* Card: Ano/Série */}
                  <div style={{
                    border: pdfSerie ? "1.5px solid #3b82f6" : "1.5px solid #e2e8f0",
                    borderRadius: 12,
                    background: pdfSerie ? "#eff6ff" : "#f8fafc",
                    padding: "12px 12px",
                    transition: "all .2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: pdfSerie ? "#dbeafe" : "#f1f5f9",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.85rem",
                        }}>🎓</span>
                        <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#1e293b" }}>Ano / Série</span>
                      </div>
                    </div>
                    <select
                      id="pdf-serie-select"
                      value={pdfSerie}
                      onChange={e => { setPdfSerie(e.target.value); setPdfErr(""); }}
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8,
                        border: pdfSerie ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                        background: "#fff", fontSize: "0.82rem", color: pdfSerie ? "#1d4ed8" : "#64748b",
                        fontWeight: pdfSerie ? 600 : 400,
                        cursor: "pointer", outline: "none", appearance: "none",
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                        backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: 14,
                      }}
                    >
                      <option value="">Todas as séries</option>
                      {SERIES_PDF.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {!pdfSerie && (
                      <div style={{ fontSize: "0.67rem", color: "#94a3b8", marginTop: 5, textAlign: "center" }}>
                        vazio = todas
                      </div>
                    )}
                  </div>

                  {/* Card: Bimestre */}
                  <div style={{
                    border: pdfBimestre ? "1.5px solid #10b981" : "1.5px solid #e2e8f0",
                    borderRadius: 12,
                    background: pdfBimestre ? "#f0fdf4" : "#f8fafc",
                    padding: "12px 12px",
                    transition: "all .2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: pdfBimestre ? "#d1fae5" : "#f1f5f9",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.85rem",
                        }}>📅</span>
                        <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#1e293b" }}>Bimestre</span>
                      </div>
                    </div>
                    <select
                      id="pdf-bim-select"
                      value={pdfBimestre}
                      onChange={e => { setPdfBimestre(e.target.value); setPdfErr(""); }}
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8,
                        border: pdfBimestre ? "1.5px solid #6ee7b7" : "1.5px solid #e2e8f0",
                        background: "#fff", fontSize: "0.82rem", color: pdfBimestre ? "#065f46" : "#64748b",
                        fontWeight: pdfBimestre ? 600 : 400,
                        cursor: "pointer", outline: "none", appearance: "none",
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                        backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: 14,
                      }}
                    >
                      <option value="">Todos os bimestres</option>
                      {BIMESTRES.map(b => <option key={b}>{b}</option>)}
                    </select>
                    {!pdfBimestre && (
                      <div style={{ fontSize: "0.67rem", color: "#94a3b8", marginTop: 5, textAlign: "center" }}>
                        vazio = todos
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Mensagem de erro */}
              {pdfErr && (
                <div style={{
                  background: "#fef2f2", border: "1px solid #fca5a5",
                  borderRadius: 10, padding: "10px 14px",
                  color: "#b91c1c", fontSize: "0.82rem", marginTop: 4,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: "1rem" }}>⚠️</span> {pdfErr}
                </div>
              )}

              {/* Resumo do que será gerado */}
              {pdfDisc && !pdfErr && (
                <div style={{
                  background: "linear-gradient(135deg, #f0fdf4, #eff6ff)",
                  border: "1.5px solid #6ee7b7",
                  borderRadius: 10, padding: "12px 14px", marginTop: 4,
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "#d1fae5", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "1rem", flexShrink: 0,
                  }}>✅</span>
                  <div style={{ fontSize: "0.82rem", color: "#15803d", lineHeight: 1.5 }}>
                    <strong>{pdfDisc}</strong>
                    {" · "}
                    <span style={{ color: pdfSerie ? "#1d4ed8" : "#64748b" }}>
                      {pdfSerie ? <strong>{pdfSerie}</strong> : "Todas as séries"}
                    </span>
                    {" · "}
                    <span style={{ color: pdfBimestre ? "#065f46" : "#64748b" }}>
                      {pdfBimestre ? <strong>{parseInt(pdfBimestre)}º Bimestre</strong> : "Todos os bimestres"}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="cp-modal-footer">
              <button className="cp-btn-outline" onClick={() => setPdfModalOpen(false)} disabled={pdfLoading}>
                Cancelar
              </button>
              <button
                id="btn-gerar-pdf-confirm"
                className="cp-btn-pdf"
                style={{ padding: "10px 22px", fontSize: "0.9rem", fontWeight: 700 }}
                disabled={!pdfDisc || pdfLoading}
                onClick={gerarPDF}
              >
                {pdfLoading
                  ? <><span className="cp-spin">⏳</span> Gerando PDF...</>
                  : <><IcoPDF /> GERAR PDF</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

