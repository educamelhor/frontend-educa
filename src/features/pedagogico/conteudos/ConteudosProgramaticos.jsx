import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./ConteudosProgramaticos.css";

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

// Mock de conteúdos por série+disciplina+bimestre
const MOCK_CONTEUDOS = [
  { id: 1, serie: "6º Ano", disciplina: "Língua Portuguesa", bimestre: "1º Bimestre", unidade: "Leitura e Interpretação", conteudo: "Gêneros textuais: narrativo, descritivo e argumentativo", objetivo: "Identificar e interpretar diferentes gêneros textuais", status: "APROVADO", itens: 4 },
  { id: 2, serie: "6º Ano", disciplina: "Língua Portuguesa", bimestre: "2º Bimestre", unidade: "Produção Textual", conteudo: "Conto, crônica e poema — características e produção", objetivo: "Produzir textos com coesão e coerência", status: "ENVIADO", itens: 3 },
  { id: 3, serie: "6º Ano", disciplina: "Matemática", bimestre: "1º Bimestre", unidade: "Números Naturais", conteudo: "Operações fundamentais, potenciação e radiciação", objetivo: "Resolver problemas com operações de números naturais", status: "APROVADO", itens: 6 },
  { id: 4, serie: "6º Ano", disciplina: "Matemática", bimestre: "2º Bimestre", unidade: "Frações e Decimais", conteudo: "Fração como parte de um todo, operações com frações", objetivo: "Compreender frações e aplicar em situações-problema", status: "RASCUNHO", itens: 2 },
  { id: 5, serie: "7º Ano", disciplina: "Ciências", bimestre: "1º Bimestre", unidade: "Célula e Vida", conteudo: "Célula animal e vegetal, organelas e funções vitais", objetivo: "Reconhecer as estruturas celulares e suas funções", status: "APROVADO", itens: 5 },
  { id: 6, serie: "7º Ano", disciplina: "História", bimestre: "1º Bimestre", unidade: "Idade Média", conteudo: "Feudalismo, Igreja Católica e poder medieval", objetivo: "Analisar o sistema feudal e sua estrutura social", status: "PENDENTE", itens: 0 },
  { id: 7, serie: "8º Ano", disciplina: "Geografia", bimestre: "1º Bimestre", unidade: "Geopolítica", conteudo: "Globalização, blocos econômicos e relações internacionais", objetivo: "Compreender o cenário geopolítico contemporâneo", status: "ENVIADO", itens: 3 },
  { id: 8, serie: "9º Ano", disciplina: "Matemática", bimestre: "1º Bimestre", unidade: "Álgebra", conteudo: "Funções: linear, quadrática e exponencial", objetivo: "Representar e analisar funções matemáticas", status: "APROVADO", itens: 7 },
];

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
  const [serieFiltro, setSerieFiltro]         = useState("Todas");
  const [discFiltro, setDiscFiltro]           = useState("Todas");
  const [bimestreFiltro, setBimestreFiltro]   = useState("Todos");
  const [statusFiltro, setStatusFiltro]       = useState("Todos");
  const [viewMode, setViewMode]               = useState("cards"); // "cards" | "table"
  const [modalOpen, setModalOpen]             = useState(false);
  const [detalheItem, setDetalheItem]         = useState(null);

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
      logos.left  = await loadImageAsBase64("/logo-escola-left.png");
      logos.right = await loadImageAsBase64("/LOGO_CCMDF.jpg");
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
      logos.left  = await loadImageAsBase64("/logo-escola-left.png");
      logos.right = await loadImageAsBase64("/LOGO_CCMDF.jpg");
    } catch (_) {}
    buildPdfHeaderOficial(doc, W, logos, hoje, "OBJETIVOS DE APRENDIZAGEM", data.disciplina_nome, bimStr, data.ano_letivo || 2026);

    const SERIES_ORDER = ["6º ANO","7º ANO","8º ANO","9º ANO"];
    const bimestresPresentes = bimNum
      ? [bimNum]
      : [...new Set(data.itens.map(i => i.bimestre))].sort();

    let curY = 54;
    const PAGE_BOTTOM = H - 18;
    const MX = 10;
    const CW = W - 20;
    const LINE_H = 4.5;
    const SUB_LINE_H = 4.2;

    for (const bim of bimestresPresentes) {
      const itensBim = bimNum ? data.itens : data.itens.filter(i => i.bimestre === bim);
      const bimLabel = `${bim}º Bimestre`;

      if (!bimNum) {
        if (curY > PAGE_BOTTOM - 18) {
          doc.addPage();
          buildPdfHeaderOficial(doc, W, logos, hoje, "OBJETIVOS DE APRENDIZAGEM", data.disciplina_nome, bimStr, data.ano_letivo || 2026);
          drawFooter(doc, W, H, data.escola_nome, bimLabel);
          curY = 54;
        }
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(MX, curY, CW, 12, 3, 3, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
        doc.text(`📅  ${bimLabel}`, MX + 6, curY + 8.5);
        curY += 16;
      }

      const bySerie = {};
      for (const item of itensBim) {
        const s = (item.serie || "Sem série").toUpperCase();
        if (!bySerie[s]) bySerie[s] = [];
        bySerie[s].push(item);
      }

      for (const serie of [...SERIES_ORDER, ...Object.keys(bySerie).filter(s => !SERIES_ORDER.includes(s))]) {
        const itens = bySerie[serie]; if (!itens) continue;
        const meta = SERIE_META[serie] || SERIE_META["6º ANO"];
        const [r,g,b] = meta.rgb;

        const porConteudo = {};
        for (const item of itens) {
          const chave = item.conteudo_seedf || "Conteúdo";
          if (!porConteudo[chave]) porConteudo[chave] = { ut: item.unidade_tematica || "", objetivos: [] };
          const txt = (item.objetivo_texto || "").trim();
          if (txt) porConteudo[chave].objetivos.push(txt);
        }
        if (Object.keys(porConteudo).every(k => !porConteudo[k].objetivos.length)) continue;

        if (curY > PAGE_BOTTOM - 28) {
          doc.addPage();
          buildPdfHeaderOficial(doc, W, logos, hoje, "OBJETIVOS DE APRENDIZAGEM", data.disciplina_nome, bimStr, data.ano_letivo || 2026);
          drawFooter(doc, W, H, data.escola_nome, !bimNum ? bimLabel : bimStr);
          curY = 54;
        }
        doc.setFillColor(r, g, b);
        doc.roundedRect(MX, curY, CW, 10, 2, 2, "F");
        doc.setFillColor(...meta.rgb.map(c => Math.max(c-25,0)));
        doc.triangle(W - MX - 25, curY, W - MX, curY, W - MX, curY + 10, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
        doc.text(serie, MX + 5, curY + 7);
        const cntTotal = itens.length;
        doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(220,235,255);
        doc.text(`${cntTotal} conteúdo${cntTotal!==1?"s":""}`, W - MX - 4, curY + 7, { align:"right" });
        curY += 14;

        for (const [conteudoKey, grupo] of Object.entries(porConteudo)) {
          if (!grupo.objetivos.length) continue;
          if (curY > PAGE_BOTTOM - 20) {
            doc.addPage();
            buildPdfHeaderOficial(doc, W, logos, hoje, "OBJETIVOS DE APRENDIZAGEM", data.disciplina_nome, bimStr, data.ano_letivo || 2026);
            drawFooter(doc, W, H, data.escola_nome, !bimNum ? bimLabel : bimStr);
            curY = 54;
          }
          doc.setFillColor(...meta.light);
          doc.roundedRect(MX, curY, CW, 8, 1.5, 1.5, "F");
          doc.setDrawColor(r, g, b); doc.setLineWidth(0.4);
          doc.roundedRect(MX, curY, CW, 8, 1.5, 1.5, "S");
          if (grupo.ut) {
            const utW = Math.min(doc.getTextWidth(grupo.ut) + 8, 55);
            doc.setFillColor(r, g, b);
            doc.roundedRect(MX + 2, curY + 1.5, utW, 5, 1, 1, "F");
            doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(255,255,255);
            doc.text(grupo.ut.substring(0,30), MX + 6, curY + 5);
          }
          const ctX = grupo.ut ? MX + 60 : MX + 4;
          const ctMaxW = CW - (ctX - MX) - 4;
          doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(30,41,59);
          const ctLines = doc.splitTextToSize(conteudoKey, ctMaxW);
          doc.text(ctLines[0], ctX, curY + 5.4);
          curY += 11;

          let numIdx = 1;
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
            doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
            doc.text(String(numIdx++), MX + 11, curY + 8.5, { align:"center" });
            let ty = curY + 6;
            if (topicos.length > 0) {
              for (const top of topicos) {
                const linhasTop = doc.splitTextToSize(top.texto, maxTextW);
                doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(22, 38, 68);
                doc.text(linhasTop, MX + 18, ty + 4);
                ty += linhasTop.length * LINE_H + 2;
                for (const sub of top.subitens) {
                  const linhasSub = doc.splitTextToSize(`• ${sub}`, maxTextW - 10);
                  doc.setFont("helvetica","normal"); doc.setFontSize(7.8); doc.setTextColor(60, 80, 110);
                  doc.text(linhasSub, MX + 25, ty + 3.5);
                  ty += linhasSub.length * SUB_LINE_H + 1.5;
                }
              }
            } else {
              const linhas = doc.splitTextToSize(objTxt, maxTextW);
              doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(22,38,68);
              doc.text(linhas, MX + 18, ty + 4);
            }
            curY += blockH + 3;
          }
          curY += 3;
        }
        curY += 5;
      }
      if (!bimNum) curY += 8;
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
        setTimeout(() => { setModalOpen(false); setSaveMsg(""); }, 1200);
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
    setMUnidadeId("");
    setUnidades([]);
    setErroUTs(null);
    // Também reseta conteúdos
    setMConteudoId("");
    setConteudos([]);
    setErroCTs(null);

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
    setMConteudoId("");
    setConteudos([]);
    setErroCTs(null);

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

  // Reseta estado completo do modal ao abrir
  const openModal = () => {
    setMSerie(""); setMDisciplina(""); setMBimestre(BIMESTRES_OPTS[0]);
    setMAno("2026"); setMUnidadeId(""); setUnidades([]); setErroUTs(null);
    setMConteudoId(""); setConteudos([]); setErroCTs(null);
    setObjetivos([]); setObjSubVisible(false); setNovoTopico(""); setNovosSubitens([""]);
    setTopicoError(false); setSaveMsg("");
    setExistingId(null); setExistingLoading(false);
    setModalOpen(true);
  };

  // Filtros aplicados
  const filtered = MOCK_CONTEUDOS.filter(c =>
    (serieFiltro    === "Todas" || c.serie       === serieFiltro) &&
    (discFiltro     === "Todas" || c.disciplina  === discFiltro) &&
    (bimestreFiltro === "Todos" || c.bimestre    === bimestreFiltro) &&
    (statusFiltro   === "Todos" || c.status      === statusFiltro)
  );

  // KPIs
  const total    = MOCK_CONTEUDOS.length;
  const aprovado = MOCK_CONTEUDOS.filter(c => c.status === "APROVADO").length;
  const revisao  = MOCK_CONTEUDOS.filter(c => c.status === "ENVIADO").length;
  const pendente = MOCK_CONTEUDOS.filter(c => c.status === "PENDENTE" || c.status === "RASCUNHO").length;
  const pctOk    = Math.round((aprovado / total) * 100);

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
      {viewMode === "cards" ? (
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
                    <button className="cp-icon-btn cp-icon-btn-edit" title="Editar">
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
                        <button className="cp-icon-btn cp-icon-btn-edit" title="Editar"><IcoEdit /></button>
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

      {/* ── Modal Novo Conteúdo ── */}
      {modalOpen && (
        <div className="cp-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <span className="cp-modal-icon"><IcoPlus /></span>
              <h2>Novo Conteúdo Programático</h2>
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

              {/* Seletores */}
              <div className="cp-form-grid">

                {/* Disciplina (obrigatório) */}
                <div className="cp-form-group cp-form-full">
                  <select
                    id="pdf-disc-select"
                    className="cp-select cp-select-full"
                    value={pdfDisc}
                    onChange={e => { setPdfDisc(e.target.value); setPdfErr(""); }}
                    style={{
                      borderColor: !pdfDisc ? "#f97316" : "#e2e8f0",
                      background: !pdfDisc ? "#fff7ed" : "#fff",
                    }}
                  >
                    <option value="">📚 Selecione a disciplina... (obrigatório)</option>
                    {DISCIPLINAS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>

                {/* Ano/Série (opcional) */}
                <div className="cp-form-group cp-form-full">
                  <label style={{ fontSize:"0.82rem", color:"#64748b", marginBottom:4, display:"block" }}>
                    Ano / Série <span style={{ color:"#94a3b8", fontWeight:400 }}>(opcional — vazio = todas as séries)</span>
                  </label>
                  <select
                    id="pdf-serie-select"
                    className="cp-select cp-select-full"
                    value={pdfSerie}
                    onChange={e => { setPdfSerie(e.target.value); setPdfErr(""); }}
                  >
                    <option value="">Todas as séries</option>
                    {SERIES_PDF.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Bimestre (opcional) */}
                <div className="cp-form-group cp-form-full">
                  <label style={{ fontSize:"0.82rem", color:"#64748b", marginBottom:4, display:"block" }}>
                    Bimestre <span style={{ color:"#94a3b8", fontWeight:400 }}>(opcional — vazio = todos os bimestres)</span>
                  </label>
                  <select
                    id="pdf-bim-select"
                    className="cp-select cp-select-full"
                    value={pdfBimestre}
                    onChange={e => { setPdfBimestre(e.target.value); setPdfErr(""); }}
                  >
                    <option value="">Todos os bimestres</option>
                    {BIMESTRES.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>

              </div>

              {/* Mensagem de erro */}
              {pdfErr && (
                <div style={{
                  background: "#fef2f2", border: "1px solid #fca5a5",
                  borderRadius: 8, padding: "10px 14px",
                  color: "#b91c1c", fontSize: "0.82rem", marginTop: 8,
                }}>
                  ⚠️ {pdfErr}
                </div>
              )}

              {/* Info pré-geração */}
              {pdfDisc && !pdfErr && (
                <div style={{
                  background: "#f0fdf4", border: "1px solid #86efac",
                  borderRadius: 8, padding: "10px 14px",
                  color: "#15803d", fontSize: "0.82rem", marginTop: 8,
                }}>
                  ✅ O PDF incluirá <strong>{pdfDisc}</strong>
                  {pdfSerie ? <>, série <strong>{pdfSerie}</strong></> : <>, <strong>todas as séries</strong></>}
                  {pdfBimestre ? <>, <strong>{parseInt(pdfBimestre)}º Bimestre</strong></> : <>, <strong>todos os bimestres</strong></>}.
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

