// src/features/secretaria/horarios/ExportarHorarioModal.jsx
// ============================================================================
// Central Oficial de Impressão e Exportação Vetorial PDF (Padrão Tier-1 / Urânia+)
// ============================================================================
// Modos Oficiais Disponíveis (em Gerar Horário e Horário Manual):
//   1) Mosaico Compacto de Professores em Lote (10 por folha 2×5 | 8 por folha 2×4 | 4 por folha 2×2)
//   2) Comunicado Docente Individual / Duplo com Recibo de Ciência (2 por folha c/ corte | 1 por folha A4)
//   3) Horário Oficial por Turma (1 por folha Porta de Sala c/ Legenda | Mosaico 6 ou 4 turmas por folha)
//   4) Quadro Geral Panorâmico do Turno (Mural da Sala dos Professores / Coordenação)
//
// Recursos Integrados:
//   - Sincronização automática dos horários reais (HH:MM) e intervalos via Direção > Governança
//   - Seletor de Acabamento: Executivo Colorido (HD) ou P&B Laser Econômico (Toner-Saver)
//   - Download Direto Vetorial (.pdf via jsPDF milimétrico, sem cabeçalhos de navegador)
//   - Visualização de Impressão HTML de Alta Definição (@media print A4 Paisagem)
// ============================================================================

import React, { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { resolverVigenciaFrontend } from "./BadgeVigenciaHorario";

const DIAS_LABEL = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

const DIAS_CURTO = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

const DIAS_UPPER = {
  1: "SEG",
  2: "TER",
  3: "QUA",
  4: "QUI",
  5: "SEX",
  6: "SÁB",
};

const PALETA_PRINT = [
  { bg: "#eef2ff", text: "#1e1b4b", border: "#a5b4fc", rgbBg: [238, 242, 255], rgbText: [30, 27, 75], rgbBorder: [165, 180, 252] },
  { bg: "#ecfdf5", text: "#064e3b", border: "#6ee7b7", rgbBg: [236, 253, 245], rgbText: [6, 78, 59], rgbBorder: [110, 231, 183] },
  { bg: "#fffbeb", text: "#78350f", border: "#fcd34d", rgbBg: [255, 251, 235], rgbText: [120, 53, 15], rgbBorder: [252, 211, 77] },
  { bg: "#f0f9ff", text: "#0c4a6e", border: "#7dd3fc", rgbBg: [240, 249, 255], rgbText: [12, 74, 110], rgbBorder: [125, 211, 252] },
  { bg: "#fff1f2", text: "#881337", border: "#fda4af", rgbBg: [255, 241, 242], rgbText: [136, 19, 55], rgbBorder: [253, 164, 175] },
  { bg: "#f5f3ff", text: "#4c1d95", border: "#c4b5fd", rgbBg: [245, 243, 255], rgbText: [76, 29, 149], rgbBorder: [196, 181, 253] },
  { bg: "#f7fee7", text: "#365314", border: "#bef264", rgbBg: [247, 254, 231], rgbText: [54, 83, 20], rgbBorder: [190, 242, 100] },
  { bg: "#fff7ed", text: "#7c2d12", border: "#fdba74", rgbBg: [255, 247, 237], rgbText: [124, 45, 18], rgbBorder: [253, 186, 116] },
  { bg: "#ecfeff", text: "#164e63", border: "#67e8f9", rgbBg: [236, 254, 255], rgbText: [22, 78, 99], rgbBorder: [103, 232, 249] },
  { bg: "#fdf4ff", text: "#701a75", border: "#f0abfc", rgbBg: [253, 244, 255], rgbText: [112, 26, 117], rgbBorder: [240, 171, 252] },
];

function corPorChave(idNum, colorido = true) {
  if (!colorido) {
    return {
      bg: "#ffffff",
      text: "#0f172a",
      border: "#94a3b8",
      rgbBg: [255, 255, 255],
      rgbText: [15, 23, 42],
      rgbBorder: [148, 163, 184],
    };
  }
  const idx = Math.abs(Number(idNum) || 0) % PALETA_PRINT.length;
  return PALETA_PRINT[idx];
}

function sansAccent(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitiza strings para a fonte vetorial padrão Helvetica (WinAnsi / ISO-8859-1) do jsPDF,
 * preservando todos os acentos do português (Á, É, Ç, º, ª, ·) e evitando caracteres fora de Latin-1.
 */
function pdfSafeText(str) {
  return String(str ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "\u00B7")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Abreviação canônica inteligente de disciplinas (compatível com SEEDF / Ensino Médio / Anos Finais).
 */
export function siglaDisciplina(nome, siglaExplicita = "") {
  const exp = String(siglaExplicita || "").trim();
  if (exp && exp.length <= 6) return exp.toUpperCase();

  const raw = String(nome || "").trim();
  if (!raw) return "-";

  // Tratamento especial para códigos de Itinerários Formativos (ex.: IFA_ADRIANO -> IFA, IFA_1 -> IFA_1)
  const upperRaw = sansAccent(raw).toUpperCase();
  if (/^IFA[_-\s]*\d+$/i.test(upperRaw)) {
    return upperRaw.replace(/\s+/g, "");
  }
  if (upperRaw.startsWith("IFA_") || upperRaw.startsWith("IFA ")) {
    return "IFA";
  }

  const MAPA_CANONICO = {
    MATEMATICA: "MAT",
    PORTUGUES: "PORT",
    "LINGUA PORTUGUESA": "PORT",
    "L. PORTUGUESA": "PORT",
    BIOLOGIA: "BIO",
    FISICA: "FÍS",
    QUIMICA: "QUÍ",
    HISTORIA: "HIST",
    GEOGRAFIA: "GEO",
    FILOSOFIA: "FIL",
    SOCIOLOGIA: "SOC",
    "EDUCACAO FISICA": "ED.F",
    "ED. FISICA": "ED.F",
    "ED FISICA": "ED.F",
    INGLES: "ING",
    "LINGUA INGLESA": "ING",
    "LEM - INGLES": "ING",
    ESPANHOL: "ESP",
    "LINGUA ESPANHOLA": "ESP",
    "LEM - ESPANHOL": "ESP",
    CIENCIAS: "CIÊN",
    "CIENCIAS NATURAIS": "CIÊN",
    ARTES: "ART",
    ARTE: "ART",
    "ENSINO RELIGIOSO": "E.REL",
    REDACAO: "RED",
    LITERATURA: "LIT",
    "PROJETO DE VIDA": "P.VID",
  };

  if (MAPA_CANONICO[upperRaw]) return MAPA_CANONICO[upperRaw];

  const palavras = upperRaw.split(" ").filter(Boolean);
  if (palavras.length === 1) {
    return palavras[0].length <= 5 ? palavras[0] : palavras[0].slice(0, 4);
  }

  const conectivos = new Set(["DE", "DA", "DO", "DAS", "DOS", "E", "O", "A", "OS", "AS", "EM", "NO", "NA"]);
  const significativas = palavras.filter((w) => !conectivos.has(w));
  if (significativas.length >= 2) {
    if (significativas.length === 2 && significativas[0].length >= 3 && significativas[1].length >= 3) {
      return `${significativas[0][0]}.${significativas[1].slice(0, 3)}`;
    }
    const iniciais = significativas.map((w) => w[0]).join("");
    if (iniciais.length >= 2) return iniciais.slice(0, 5);
  }

  const base = (significativas[0] || palavras[0]);
  return base.slice(0, 4);
}

/**
 * Converte nomes longos de turmas (ex.: "3º ANO B", "8º ANO F", "1ª SÉRIE A")
 * em códigos compactos de alta legibilidade (ex.: "3ºB", "8ºF", "1ªA").
 */
export function siglaTurmaCurta(nomeTurma) {
  const s = String(nomeTurma || "")
    .replace(/^TURMA\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "-";

  const m = s.match(
    /^(\d+)\s*([ºª°])?\s*(?:ANO|SERIE|SÉRIE|EM|EF|ENSINO\s+M[EÉ]DIO|ENSINO\s+FUNDAMENTAL)?\s*[-–]?\s*([A-Z0-9]{1,3})$/i
  );
  if (m) {
    const ordChar = m[2] ? (m[2] === "ª" ? "ª" : "º") : "º";
    return `${m[1]}${ordChar}${m[3].toUpperCase()}`;
  }

  if (s.length <= 7) return s.toUpperCase();
  return s
    .replace(/\b(ANO|SERIE|SÉRIE)\b/gi, "")
    .replace(/\s+/g, "")
    .slice(0, 7)
    .toUpperCase();
}

export function primeiroNomeProf(nome) {
  const n = String(nome || "").trim();
  if (!n) return "-";
  const partes = n.split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].toUpperCase();
  const ignorar = new Set(["DE", "DA", "DO", "DAS", "DOS"]);
  const segundo = partes.slice(1).find((p) => !ignorar.has(p.toUpperCase())) || partes[1];
  return `${partes[0].toUpperCase()} ${segundo[0].toUpperCase()}.`;
}

export function nomeProfCompactoTopo(nome, maxChars = 28) {
  const n = String(nome || "").trim().toUpperCase();
  if (!n) return "-";
  if (n.length <= maxChars) return n;
  const partes = n.split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return n.slice(0, maxChars);
  const ignorar = new Set(["DE", "DA", "DO", "DAS", "DOS"]);
  const uteis = partes.filter((p) => !ignorar.has(p));
  const abrev = `${uteis[0]} ${uteis.slice(1, -1).map((p) => `${p[0]}.`).join(" ")} ${uteis[uteis.length - 1]}`.replace(/\s+/g, " ");
  return abrev.length <= maxChars ? abrev : `${uteis[0]} ${uteis[uteis.length - 1]}`.slice(0, maxChars);
}

function obterDadosEscola(config = null) {
  let nome = config?.escola?.nome || "";
  let apelido = config?.escola?.apelido || "";
  try {
    if (!nome) {
      nome =
        localStorage.getItem("escola_nome") ||
        localStorage.getItem("nome_escola") ||
        JSON.parse(localStorage.getItem("user") || "{}")?.escola_nome ||
        "";
    }
    if (!apelido) {
      apelido =
        localStorage.getItem("escola_apelido") ||
        JSON.parse(localStorage.getItem("user") || "{}")?.escola_apelido ||
        "";
    }
  } catch {
    // fallback silencioso
  }
  const nomeLimpo = String(nome || apelido || "UNIDADE ESCOLAR").trim().toUpperCase();
  const apelidoLimpo = String(apelido || "").trim().toUpperCase();
  return {
    nome: nomeLimpo,
    apelido: apelidoLimpo,
    tituloHeader:
      apelidoLimpo && !nomeLimpo.includes(apelidoLimpo)
        ? `${apelidoLimpo} — ${nomeLimpo}`
        : nomeLimpo,
  };
}

/**
 * Resolve horários reais (HH:MM) e posição exata do recreio/intervalo para o turno,
 * priorizando Direção > Governança (`horarios_por_turno` / `intervalos_por_turno`)
 * e `regras_gerais.recreio_apos_periodo[turno]`.
 */
export function resolverGradeTemporalTurno({
  config = null,
  turno = "matutino",
  periodosPorDia = 6,
}) {
  const turnoKey = String(turno || "matutino").toLowerCase().trim();
  const mapaHorarios = config?.horarios_por_turno?.[turnoKey] || {};
  const intervaloGov = config?.intervalos_por_turno?.[turnoKey] || null;
  const recreioWizardRaw = config?.regras_gerais?.recreio_apos_periodo?.[turnoKey];
  const bloquearRecreio = config?.regras_gerais?.bloquear_duplas_no_recreio !== false;

  let intervaloApos = null;
  if (intervaloGov?.apos_periodo) {
    intervaloApos = Number(intervaloGov.apos_periodo);
  } else if (recreioWizardRaw !== undefined && recreioWizardRaw !== null) {
    intervaloApos = Number(recreioWizardRaw);
  } else {
    intervaloApos = periodosPorDia <= 4 ? 2 : 3;
  }

  if (!bloquearRecreio && !intervaloGov) {
    intervaloApos = 0;
  }

  let possuiHorariosReais = false;
  const periodos = [];
  for (let ord = 1; ord <= periodosPorDia; ord++) {
    const h = mapaHorarios?.[ord] || mapaHorarios?.[String(ord)] || null;
    const inicio = h?.inicio ? String(h.inicio).slice(0, 5) : null;
    const fim = h?.fim ? String(h.fim).slice(0, 5) : null;
    if (inicio) possuiHorariosReais = true;
    periodos.push({
      ordem: ord,
      inicio,
      fim,
      labelMosaico: inicio || `${ord}ª`,
      labelCompleto: inicio && fim ? `${ord}ª · ${inicio}-${fim}` : `${ord}ª AULA`,
      subHorario: inicio && fim ? `${inicio} – ${fim}` : "",
    });
  }

  const labelIntervalo =
    intervaloGov?.inicio && intervaloGov?.fim
      ? `INTERVALO (${intervaloGov.inicio} – ${intervaloGov.fim})`
      : "INTERVALO / RECREIO";

  const vigencia = resolverVigenciaFrontend(config);

  return {
    turnoKey,
    periodos,
    possuiHorariosReais,
    intervaloApos: intervaloApos > 0 && intervaloApos < periodosPorDia ? intervaloApos : 0,
    intervaloInicio: intervaloGov?.inicio || null,
    intervaloFim: intervaloGov?.fim || null,
    labelIntervalo,
    vigenciaLabel: vigencia.label_curto,
    anoLetivo: vigencia.ano_letivo,
  };
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function contarAulasGradeProf(grade, diasSemana, periodosPorDia) {
  let total = 0;
  for (const d of diasSemana) {
    const col = grade?.[d] || grade?.[String(d)] || {};
    for (let o = 1; o <= periodosPorDia; o++) {
      const slot = col?.[o] || col?.[String(o)] || null;
      if (slot && (slot.turma_id || slot.disciplina_id)) total++;
    }
  }
  return total;
}

function contarAulasGradeTurma(grade, diasSemana, periodosPorDia) {
  let total = 0;
  for (const d of diasSemana) {
    const col = grade?.[d] || grade?.[String(d)] || {};
    for (let o = 1; o <= periodosPorDia; o++) {
      const slot = col?.[o] || col?.[String(o)] || null;
      if (slot && slot.disciplina_id) total++;
    }
  }
  return total;
}

// ============================================================================
// Ícone SVG Institucional Limpo (Substitui Emojis Crus na Impressão)
// ============================================================================
const BRASAO_ESCOLA_SVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="20" height="20" rx="5" fill="#0f172a"/>
  <path d="M12 6L5.5 9.5L12 13L18.5 9.5L12 6Z" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M7.5 11V15.2C7.5 16.5 9.5 17.6 12 17.6C14.5 17.6 16.5 16.5 16.5 15.2V11" stroke="#93c5fd" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

// ============================================================================
// Janela de Impressão Vetorial HTML (@media print A4 Paisagem Milimétrico)
// ============================================================================
function abrirJanelaImpressaoHtml(tituloJanela, bodyHtml, { pbLaser = false } = {}) {
  const win = window.open("", "_blank", "width=1260,height=880");
  if (!win) {
    alert("Permita pop-ups no navegador para abrir a visualização de impressão.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(tituloJanela)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 7mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      background: #e2e8f0;
    }
    body.modo-pb .color-fill {
      background: #ffffff !important;
      color: #0f172a !important;
      border-color: #64748b !important;
    }
    body.modo-pb .thead-dark th {
      background: #f1f5f9 !important;
      color: #0f172a !important;
      border-color: #334155 !important;
    }
    body.modo-pb .card-head-dark {
      background: #f8fafc !important;
      color: #0f172a !important;
      border-bottom: 1.5px solid #0f172a !important;
    }
    body.modo-pb .card-head-badge {
      background: #ffffff !important;
      color: #0f172a !important;
      border: 1px solid #334155 !important;
    }
    .no-print-bar {
      max-width: 283mm;
      margin: 0 auto 14px auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #0f172a;
      color: #fff;
      padding: 11px 18px;
      border-radius: 10px;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2);
    }
    .no-print-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-bar {
      border: none;
      padding: 8px 15px;
      border-radius: 7px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-toggle-pb {
      background: #334155;
      color: #f8fafc;
      border: 1px solid #475569;
    }
    .btn-print-main {
      background: #2563eb;
      color: #fff;
    }
    .page-sheet {
      width: 283mm;
      min-height: 196mm;
      max-height: 196mm;
      margin: 0 auto 16px auto;
      background: #fff;
      padding: 4mm 5mm;
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .page-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .inst-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.6px solid #0f172a;
      padding-bottom: 2.2mm;
      margin-bottom: 2.8mm;
      flex-shrink: 0;
    }
    .inst-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .inst-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.3px;
      margin: 0;
      line-height: 1.15;
    }
    .inst-sub {
      font-size: 9.5px;
      font-weight: 600;
      color: #475569;
      margin: 1px 0 0 0;
    }
    .inst-meta {
      text-align: right;
      font-size: 9px;
      color: #334155;
      line-height: 1.3;
    }
    .inst-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background: #eff6ff;
      border: 1px solid #93c5fd;
      color: #1e3a8a;
      font-weight: 800;
      font-size: 9.5px;
      text-transform: uppercase;
    }
    /* Grid Mosaico (2x5, 2x4, 2x3, 2x2) */
    .mosaico-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2.4mm 4mm;
      align-content: start;
    }
    .mini-card {
      border: 1px solid #64748b;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #fff;
    }
    .card-head-dark {
      background: #0f172a;
      color: #ffffff;
      padding: 1.1mm 2.2mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 9.2px;
      font-weight: 800;
      letter-spacing: 0.2px;
    }
    .card-head-badge {
      background: rgba(255,255,255,0.16);
      color: #f8fafc;
      padding: 0.4mm 1.8mm;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 700;
      white-space: nowrap;
    }
    table.mini-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      flex: 1;
    }
    table.mini-table th,
    table.mini-table td {
      border: 0.6px solid #94a3b8;
      text-align: center;
      vertical-align: middle;
      padding: 0.5mm 0.8mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    table.mini-table th {
      background: #e2e8f0;
      color: #0f172a;
      font-size: 7.8px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .hor-cell {
      background: #f8fafc;
      color: #0f172a;
      font-weight: 800;
      font-size: 7.6px;
      width: 14mm;
    }
    .vago-dots {
      color: #94a3b8;
      font-size: 7.5px;
      letter-spacing: 1px;
    }
    .break-divider td {
      padding: 0 !important;
      height: 1.3mm !important;
      background: #cbd5e1 !important;
      font-size: 5.5px !important;
      line-height: 1.3mm !important;
      color: #334155 !important;
      font-weight: 700 !important;
      letter-spacing: 0.8px;
    }
    /* Tabelas de Página Inteira / Meia Folha */
    table.full-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.full-table th,
    table.full-table td {
      border: 1px solid #94a3b8;
      text-align: center;
      vertical-align: middle;
      padding: 4px 5px;
    }
    table.full-table thead th {
      background: #0f172a;
      color: #fff;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 6px 4px;
    }
    .inst-footer {
      margin-top: auto;
      padding-top: 1.5mm;
      border-top: 0.6px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 7.8px;
      color: #64748b;
      flex-shrink: 0;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
      .page-sheet {
        width: 100%;
        min-height: 197mm;
        max-height: 197mm;
        margin: 0;
        padding: 0;
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body class="${pbLaser ? "modo-pb" : ""}">
  <div class="no-print-bar">
    <div>
      <strong style="font-size:13.5px;">Visualização Oficial de Impressão — ${escapeHtml(tituloJanela)}</strong>
      <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">
        Orientação recomendada: <strong>Paisagem (A4)</strong> · Desmarque "Cabeçalhos e rodapés" na janela da impressora para acabamento limpo.
      </div>
    </div>
    <div class="no-print-actions">
      <button class="btn-bar btn-toggle-pb" onclick="document.body.classList.toggle('modo-pb')">
        Alternar Colorido / P&amp;B Laser
      </button>
      <button class="btn-bar btn-print-main" onclick="window.print()">
        Imprimir / Salvar PDF
      </button>
    </div>
  </div>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function renderInstHeaderHtml({ escolaTitulo, subtitulo, pillDireita, paginaAtual, totalPaginas, dataEmissao }) {
  return `<div class="inst-header">
    <div class="inst-brand">
      ${BRASAO_ESCOLA_SVG}
      <div>
        <h1 class="inst-title">${escapeHtml(escolaTitulo)}</h1>
        <p class="inst-sub">${escapeHtml(subtitulo)}</p>
      </div>
    </div>
    <div class="inst-meta">
      <div class="inst-pill color-fill">${escapeHtml(pillDireita)}</div>
      <div style="margin-top:2px;">Emissão: ${escapeHtml(dataEmissao)} &nbsp;·&nbsp; <strong>Página ${paginaAtual} de ${totalPaginas}</strong></div>
    </div>
  </div>`;
}

function renderInstFooterHtml({ vigenciaLabel, turno }) {
  return `<div class="inst-footer">
    <span>Documento Oficial da Secretaria Escolar · Turno ${escapeHtml(String(turno).toUpperCase())} · Vigência ${escapeHtml(vigenciaLabel)}</span>
    <span>Gerado pelo Sistema EDUCA.MELHOR</span>
  </div>`;
}

// ============================================================================
// 1. HTML Mosaico Compacto de Professores (10, 8 ou 4 por Folha A4 — Urânia+)
// ============================================================================
export function gerarHtmlMosaicoProfessores({
  profIds,
  gradePorProfessor,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  config = null,
  porPagina = 10,
  colorido = true,
}) {
  const escola = obterDadosEscola(config);
  const temporal = resolverGradeTemporalTurno({ config, turno, periodosPorDia });
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const paginas = chunkArray(profIds, porPagina);
  const totalPaginas = Math.max(1, paginas.length);
  const rowsCount = Math.ceil(porPagina / 2);
  const isAmplo = porPagina <= 8;

  return paginas
    .map((grupoProfIds, pageIdx) => {
      const cardsHtml = grupoProfIds
        .map((pId) => {
          const nomeCompleto = nomesProfessores[pId] || `Professor ${pId}`;
          const nomeTopo = nomeProfCompactoTopo(nomeCompleto, 32);
          const grade = gradePorProfessor?.[pId] || {};
          const totalAulas = contarAulasGradeProf(grade, diasSemana, periodosPorDia);

          let linhasTabela = "";
          for (const per of temporal.periodos) {
            const ord = per.ordem;
            let cols = `<td class="hor-cell">${escapeHtml(per.labelMosaico)}</td>`;

            for (const dia of diasSemana) {
              const slot = grade?.[dia]?.[ord] || grade?.[String(dia)]?.[String(ord)] || null;
              if (!slot || !slot.turma_id) {
                cols += `<td class="vago-dots">· · · · · ·</td>`;
              } else {
                const tNome = nomesTurmas[slot.turma_id] || `T${slot.turma_id}`;
                const dNome = nomesDisciplinas[slot.disciplina_id] || "";
                const tSigla = siglaTurmaCurta(tNome);
                const dSigla = siglaDisciplina(dNome, slot.disciplina_sigla);
                const cor = corPorChave(slot.disciplina_id || slot.turma_id, colorido);

                // Verifica geminação com aula adjacente (sem atravessar intervalo)
                const antSlot = ord > 1 && ord - 1 !== temporal.intervaloApos ? grade?.[dia]?.[ord - 1] : null;
                const proxSlot = ord < periodosPorDia && ord !== temporal.intervaloApos ? grade?.[dia]?.[ord + 1] : null;
                const geminada =
                  (antSlot && Number(antSlot.turma_id) === Number(slot.turma_id) && Number(antSlot.disciplina_id) === Number(slot.disciplina_id)) ||
                  (proxSlot && Number(proxSlot.turma_id) === Number(slot.turma_id) && Number(proxSlot.disciplina_id) === Number(slot.disciplina_id));

                const leftBar = geminada ? `border-left: 2.2px solid ${colorido ? cor.text : "#0f172a"};` : "";

                if (isAmplo && periodosPorDia <= 6) {
                  cols += `<td class="color-fill" style="background:${cor.bg}; color:${cor.text}; ${leftBar}">
                    <div style="font-size:8px; font-weight:800; line-height:1.05;">${escapeHtml(tSigla)} / ${escapeHtml(dSigla)}</div>
                  </td>`;
                } else {
                  cols += `<td class="color-fill" style="background:${cor.bg}; color:${cor.text}; font-size:7.6px; font-weight:800; ${leftBar}">
                    ${escapeHtml(`${tSigla}/${dSigla}`)}
                  </td>`;
                }
              }
            }

            linhasTabela += `<tr>${cols}</tr>`;

            if (temporal.intervaloApos === ord && ord < periodosPorDia) {
              const txtInt =
                temporal.intervaloInicio && temporal.intervaloFim
                  ? `INTERVALO ${temporal.intervaloInicio}–${temporal.intervaloFim}`
                  : "";
              linhasTabela += `<tr class="break-divider"><td colspan="${diasSemana.length + 1}">${escapeHtml(txtInt)}</td></tr>`;
            }
          }

          return `<div class="mini-card">
            <div class="card-head-dark">
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(nomeTopo)}</span>
              <span class="card-head-badge">${totalAulas} aula${totalAulas === 1 ? "" : "s"}</span>
            </div>
            <table class="mini-table">
              <thead class="thead-dark">
                <tr>
                  <th style="width:14mm;">Hor</th>
                  ${diasSemana.map((d) => `<th>${escapeHtml(DIAS_CURTO[d] || `D${d}`)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${linhasTabela}
              </tbody>
            </table>
          </div>`;
        })
        .join("");

      return `<div class="page-sheet">
        ${renderInstHeaderHtml({
          escolaTitulo: escola.tituloHeader,
          subtitulo: `RELATÓRIO CONSOLIDADO DE HORÁRIOS DOCENTES (INDIVIDUAL EM LOTE) · ${temporal.vigenciaLabel.toUpperCase()}`,
          pillDireita: `TURNO ${String(turno).toUpperCase()} · ${profIds.length} DOCENTES`,
          paginaAtual: pageIdx + 1,
          totalPaginas,
          dataEmissao,
        })}
        <div class="mosaico-grid" style="grid-template-rows: repeat(${rowsCount}, minmax(0, 1fr));">
          ${cardsHtml}
        </div>
        ${renderInstFooterHtml({ vigenciaLabel: temporal.vigenciaLabel, turno })}
      </div>`;
    })
    .join("\n");
}

// ============================================================================
// 2. HTML Comunicado Docente com Recibo (2 por Folha c/ Corte ou 1 por Folha)
// ============================================================================
export function gerarHtmlHorarioPorProfessor({
  profIds,
  gradePorProfessor,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  config = null,
  porPagina = 1, // 1 ou 2 (meia folha com guia de corte)
  colorido = true,
}) {
  const escola = obterDadosEscola(config);
  const temporal = resolverGradeTemporalTurno({ config, turno, periodosPorDia });
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  if (porPagina === 2) {
    const pares = chunkArray(profIds, 2);
    const totalPaginas = Math.max(1, pares.length);

    return pares
      .map((dupla, pageIdx) => {
        const blocosHtml = dupla
          .map((pId, idxInPage) => {
            const nomeProf = nomesProfessores[pId] || `Professor ${pId}`;
            const grade = gradePorProfessor?.[pId] || {};
            const resumoTurmas = new Map();
            let totalAulasProf = 0;

            let rowsHtml = "";
            for (const per of temporal.periodos) {
              const ord = per.ordem;
              let cells = `<td style="font-weight:800; font-size:9px; background:#f8fafc; color:#0f172a; width:24mm; padding:2.5px 4px;">
                <div>${escapeHtml(per.inicio ? `${ord}ª · ${per.inicio}` : `${ord}ª AULA`)}</div>
              </td>`;

              for (const dia of diasSemana) {
                const slot = grade?.[dia]?.[ord] || grade?.[String(dia)]?.[String(ord)] || null;
                if (!slot || !slot.turma_id) {
                  cells += `<td style="color:#94a3b8; font-size:8.5px; padding:2.5px;">· · · · · ·</td>`;
                } else {
                  totalAulasProf++;
                  const tNome = nomesTurmas[slot.turma_id] || `Turma ${slot.turma_id}`;
                  const dNome = nomesDisciplinas[slot.disciplina_id] || `Disc ${slot.disciplina_id}`;
                  const dSigla = siglaDisciplina(dNome, slot.disciplina_sigla);
                  const cor = corPorChave(slot.disciplina_id, colorido);
                  const k = `${slot.turma_id}|${slot.disciplina_id}`;
                  const prev = resumoTurmas.get(k) || { tNome, dNome, qtd: 0 };
                  prev.qtd++;
                  resumoTurmas.set(k, prev);

                  cells += `<td class="color-fill" style="background:${cor.bg}; color:${cor.text}; padding:2.5px 4px;">
                    <span style="font-weight:800; font-size:9.5px;">${escapeHtml(tNome)}</span>
                    <span style="font-size:8.5px; opacity:0.88;"> · ${escapeHtml(dSigla)}</span>
                  </td>`;
                }
              }
              rowsHtml += `<tr>${cells}</tr>`;

              if (temporal.intervaloApos === ord && ord < periodosPorDia) {
                rowsHtml += `<tr class="break-divider"><td colspan="${diasSemana.length + 1}">${escapeHtml(temporal.labelIntervalo)}</td></tr>`;
              }
            }

            const resumoTxt = Array.from(resumoTurmas.values())
              .map((x) => `${x.tNome} (${x.dNome}: ${x.qtd}a)`)
              .join("  ·  ");

            const separadorCorte =
              idxInPage === 0 && dupla.length === 2
                ? `<div style="border-top:1px dashed #64748b; margin:2.8mm 0; text-align:center; font-size:7.5px; color:#64748b; line-height:0;">
                     <span style="background:#fff; padding:0 8px;">Linha de corte — Destaque para entrega individual</span>
                   </div>`
                : "";

            return `<div style="flex:1; display:flex; flex-direction:column; justify-content:space-between; border:1px solid #cbd5e1; border-radius:6px; padding:2.8mm 3.5mm;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #0f172a; padding-bottom:1.5mm; margin-bottom:2mm;">
                  <div>
                    <div style="font-size:10.5px; font-weight:800; color:#0f172a;">${escapeHtml(escola.tituloHeader)}</div>
                    <div style="font-size:8.5px; color:#475569; font-weight:600;">COMUNICADO DE HORÁRIO DOCENTE · TURNO ${escapeHtml(String(turno).toUpperCase())} · ${escapeHtml(temporal.vigenciaLabel.toUpperCase())}</div>
                  </div>
                  <div style="text-align:right;">
                    <div class="inst-pill color-fill" style="font-size:9.5px;">PROF(A). ${escapeHtml(nomeProf)}</div>
                    <div style="font-size:8px; color:#475569; margin-top:1px;">Carga no turno: <strong>${totalAulasProf} aulas</strong> · Emissão: ${dataEmissao}</div>
                  </div>
                </div>
                <table class="full-table">
                  <thead class="thead-dark">
                    <tr>
                      <th style="width:24mm; font-size:8.5px; padding:3px;">HORÁRIO</th>
                      ${diasSemana.map((d) => `<th style="font-size:8.5px; padding:3px;">${escapeHtml(DIAS_LABEL[d] || `Dia ${d}`)}</th>`).join("")}
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
                <div style="font-size:8px; color:#334155; margin-top:1.5mm; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  <strong>Turmas:</strong> ${escapeHtml(resumoTxt || "Nenhuma aula alocada.")}
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:8px; color:#334155; margin-top:2mm; padding-top:1.5mm;">
                <div style="width:78mm; border-top:1px solid #475569; text-align:center; padding-top:2px;">Ciência: ${escapeHtml(nomeProf)}</div>
                <div style="width:65mm; border-top:1px solid #475569; text-align:center; padding-top:2px;">Coordenação / Direção</div>
                <div>Recebido em: ____/____/${temporal.anoLetivo} &nbsp;(Pág. ${pageIdx + 1}/${totalPaginas})</div>
              </div>
            </div>${separadorCorte}`;
          })
          .join("");

        return `<div class="page-sheet" style="justify-content:flex-start;">${blocosHtml}</div>`;
      })
      .join("\n");
  }

  // 1 Professor por Folha A4 Paisagem (Executivo Completo)
  const totalPaginas = Math.max(1, profIds.length);
  return profIds
    .map((pId, idx) => {
      const nomeProf = nomesProfessores[pId] || `Professor ${pId}`;
      const grade = gradePorProfessor?.[pId] || {};
      const resumoTurmas = new Map();
      let totalAulasProf = 0;

      let rowsHtml = "";
      for (const per of temporal.periodos) {
        const ord = per.ordem;
        let cellsHtml = `<td style="font-weight:800; font-size:10.5px; background:#f8fafc; color:#0f172a; width:30mm;">
          <div>${ord}ª AULA</div>
          ${per.subHorario ? `<div style="font-size:9px; font-weight:600; color:#475569; margin-top:1px;">${escapeHtml(per.subHorario)}</div>` : ""}
        </td>`;

        for (const dia of diasSemana) {
          const slot = grade?.[dia]?.[ord] || grade?.[String(dia)]?.[String(ord)] || null;
          if (!slot || !slot.turma_id) {
            cellsHtml += `<td style="color:#94a3b8; font-size:10px;">· · · · · · · ·</td>`;
          } else {
            totalAulasProf++;
            const tId = slot.turma_id;
            const dId = slot.disciplina_id;
            const tNome = nomesTurmas[tId] || `Turma ${tId}`;
            const dNome = nomesDisciplinas[dId] || `Disc ${dId}`;
            const cor = corPorChave(dId, colorido);

            const k = `${tId}|${dId}`;
            const prev = resumoTurmas.get(k) || { tNome, dNome, qtd: 0, cor };
            prev.qtd++;
            resumoTurmas.set(k, prev);

            cellsHtml += `<td class="color-fill" style="background:${cor.bg}; color:${cor.text};">
              <div style="font-size:12px; font-weight:800;">${escapeHtml(tNome)}</div>
              <div style="font-size:9.5px; font-weight:600; opacity:0.88; margin-top:1px;">${escapeHtml(dNome)}</div>
            </td>`;
          }
        }
        rowsHtml += `<tr>${cellsHtml}</tr>`;

        if (temporal.intervaloApos === ord && ord < periodosPorDia) {
          rowsHtml += `<tr class="break-divider" style="height:5mm;"><td colspan="${diasSemana.length + 1}" style="font-size:9px !important; padding:2px !important;">${escapeHtml(temporal.labelIntervalo)}</td></tr>`;
        }
      }

      const resumoHtml = Array.from(resumoTurmas.values())
        .sort((a, b) => a.tNome.localeCompare(b.tNome, "pt-BR", { numeric: true }))
        .map(
          (item) =>
            `<span style="display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border:1px solid #cbd5e1; border-radius:4px; background:#f8fafc;">
              <strong>${escapeHtml(item.tNome)}:</strong> ${escapeHtml(item.dNome)} (${item.qtd} aula${item.qtd > 1 ? "s" : ""})
            </span>`
        )
        .join(" ");

      return `<div class="page-sheet">
        ${renderInstHeaderHtml({
          escolaTitulo: escola.tituloHeader,
          subtitulo: `COMUNICADO INDIVIDUAL DE HORÁRIO DOCENTE · TURNO ${String(turno).toUpperCase()} · ${temporal.vigenciaLabel.toUpperCase()}`,
          pillDireita: `PROF(A). ${nomeProf} · ${totalAulasProf} AULAS`,
          paginaAtual: idx + 1,
          totalPaginas,
          dataEmissao,
        })}

        <table class="full-table" style="margin-top:1mm;">
          <thead class="thead-dark">
            <tr>
              <th style="width:30mm;">HORÁRIO</th>
              ${diasSemana.map((d) => `<th>${escapeHtml(DIAS_LABEL[d] || `Dia ${d}`)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div style="margin-top:3.5mm; padding-top:2.5mm; border-top:1px solid #e2e8f0; font-size:9.5px; color:#1e293b; display:flex; flex-wrap:wrap; gap:5px; align-items:center;">
          <strong style="color:#0f172a; margin-right:4px;">RESUMO DE MODULAÇÃO (${totalAulasProf} AULAS):</strong>
          ${resumoHtml || "<span>Nenhuma aula alocada neste turno.</span>"}
        </div>

        <div style="margin-top:auto; padding-top:6mm; display:flex; justify-content:space-between; align-items:flex-end; font-size:9.5px; color:#334155;">
          <div style="width:85mm; border-top:1px solid #475569; text-align:center; padding-top:4px;">
            Ciência do(a) Professor(a)<br/><strong>${escapeHtml(nomeProf)}</strong>
          </div>
          <div style="width:75mm; border-top:1px solid #475569; text-align:center; padding-top:4px;">
            Coordenação Pedagógica / Direção Escolar
          </div>
          <div style="padding-bottom:4px;">Data de ciência: ____/____/${temporal.anoLetivo}</div>
        </div>

        ${renderInstFooterHtml({ vigenciaLabel: temporal.vigenciaLabel, turno })}
      </div>`;
    })
    .join("\n");
}

// ============================================================================
// 3. HTML Horários por Turma (1 por Folha Porta de Sala OU Mosaico 6 / 4)
// ============================================================================
export function gerarHtmlHorarioPorTurma({
  turmaIds,
  gradePorTurma,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  config = null,
  porPagina = 1, // 1, 4 ou 6
  colorido = true,
}) {
  const escola = obterDadosEscola(config);
  const temporal = resolverGradeTemporalTurno({ config, turno, periodosPorDia });
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  // Mosaico Compacto de Turmas (4 ou 6 turmas por folha A4)
  if (porPagina > 1) {
    const paginas = chunkArray(turmaIds, porPagina);
    const totalPaginas = Math.max(1, paginas.length);
    const rowsCount = Math.ceil(porPagina / 2);

    return paginas
      .map((grupoTurmas, pageIdx) => {
        const cardsHtml = grupoTurmas
          .map((tId) => {
            const nomeTurma = nomesTurmas[tId] || `Turma ${tId}`;
            const grade = gradePorTurma?.[tId] || {};
            const totalAulas = contarAulasGradeTurma(grade, diasSemana, periodosPorDia);

            let linhas = "";
            for (const per of temporal.periodos) {
              const ord = per.ordem;
              let cols = `<td class="hor-cell">${escapeHtml(per.labelMosaico)}</td>`;
              for (const dia of diasSemana) {
                const slot = grade?.[dia]?.[ord] || grade?.[String(dia)]?.[String(ord)] || null;
                if (!slot || !slot.disciplina_id) {
                  cols += `<td class="vago-dots">· · · · · ·</td>`;
                } else {
                  const dNome = nomesDisciplinas[slot.disciplina_id] || "";
                  const pNome = nomesProfessores[slot.professor_id] || "";
                  const dSigla = siglaDisciplina(dNome, slot.disciplina_sigla);
                  const pCurto = String(pNome).trim().split(/\s+/)[0]?.slice(0, 8).toUpperCase() || "";
                  const cor = corPorChave(slot.disciplina_id, colorido);
                  cols += `<td class="color-fill" style="background:${cor.bg}; color:${cor.text};">
                    <div style="font-size:8px; font-weight:800; line-height:1.05;">${escapeHtml(dSigla)}</div>
                    <div style="font-size:6.8px; opacity:0.88; line-height:1.05;">${escapeHtml(pCurto)}</div>
                  </td>`;
                }
              }
              linhas += `<tr>${cols}</tr>`;
              if (temporal.intervaloApos === ord && ord < periodosPorDia) {
                linhas += `<tr class="break-divider"><td colspan="${diasSemana.length + 1}"></td></tr>`;
              }
            }

            return `<div class="mini-card">
              <div class="card-head-dark">
                <span>${escapeHtml(String(nomeTurma).toUpperCase())}</span>
                <span class="card-head-badge">${totalAulas} aulas/sem</span>
              </div>
              <table class="mini-table">
                <thead class="thead-dark">
                  <tr>
                    <th style="width:14mm;">Hor</th>
                    ${diasSemana.map((d) => `<th>${escapeHtml(DIAS_CURTO[d] || `D${d}`)}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>
            </div>`;
          })
          .join("");

        return `<div class="page-sheet">
          ${renderInstHeaderHtml({
            escolaTitulo: escola.tituloHeader,
            subtitulo: `CADERNO COMPACTO DE HORÁRIOS POR TURMA · ${temporal.vigenciaLabel.toUpperCase()}`,
            pillDireita: `TURNO ${String(turno).toUpperCase()} · ${turmaIds.length} TURMAS`,
            paginaAtual: pageIdx + 1,
            totalPaginas,
            dataEmissao,
          })}
          <div class="mosaico-grid" style="grid-template-rows: repeat(${rowsCount}, minmax(0, 1fr));">
            ${cardsHtml}
          </div>
          ${renderInstFooterHtml({ vigenciaLabel: temporal.vigenciaLabel, turno })}
        </div>`;
      })
      .join("\n");
  }

  // 1 Turma por Folha A4 (Cartaz Oficial de Porta de Sala / Mural)
  const totalPaginas = Math.max(1, turmaIds.length);
  return turmaIds
    .map((tId, idx) => {
      const nomeTurma = nomesTurmas[tId] || `Turma ${tId}`;
      const grade = gradePorTurma?.[tId] || {};
      const resumoDisc = new Map();
      let totalAulasTurma = 0;

      let rowsHtml = "";
      for (const per of temporal.periodos) {
        const ord = per.ordem;
        let cellsHtml = `<td style="font-weight:800; font-size:10.5px; background:#f8fafc; color:#0f172a; width:30mm;">
          <div>${ord}ª AULA</div>
          ${per.subHorario ? `<div style="font-size:9px; font-weight:600; color:#475569; margin-top:1px;">${escapeHtml(per.subHorario)}</div>` : ""}
        </td>`;

        for (const dia of diasSemana) {
          const slot = grade?.[dia]?.[ord] || grade?.[String(dia)]?.[String(ord)] || null;
          if (!slot || !slot.disciplina_id) {
            cellsHtml += `<td style="color:#94a3b8; font-size:10px;">· · · · · · · ·</td>`;
          } else {
            totalAulasTurma++;
            const dId = slot.disciplina_id;
            const pId = slot.professor_id;
            const dNome = nomesDisciplinas[dId] || `Disc ${dId}`;
            const pNome = nomesProfessores[pId] || `Prof ${pId}`;
            const sigla = siglaDisciplina(dNome, slot.disciplina_sigla);
            const pCurto = primeiroNomeProf(pNome);
            const cor = corPorChave(dId, colorido);

            const k = `${dId}|${pId}`;
            const prev = resumoDisc.get(k) || { sigla, dNome, pNome, qtd: 0, cor };
            prev.qtd++;
            resumoDisc.set(k, prev);

            cellsHtml += `<td class="color-fill" style="background:${cor.bg}; color:${cor.text};">
              <div style="font-size:12px; font-weight:800;">${escapeHtml(dNome)}</div>
              <div style="font-size:9.5px; font-weight:600; opacity:0.88; margin-top:1px;">${escapeHtml(pCurto)}</div>
            </td>`;
          }
        }
        rowsHtml += `<tr>${cellsHtml}</tr>`;

        if (temporal.intervaloApos === ord && ord < periodosPorDia) {
          rowsHtml += `<tr class="break-divider" style="height:5mm;"><td colspan="${diasSemana.length + 1}" style="font-size:9px !important; padding:2px !important;">${escapeHtml(temporal.labelIntervalo)}</td></tr>`;
        }
      }

      const legendaHtml = Array.from(resumoDisc.values())
        .sort((a, b) => a.dNome.localeCompare(b.dNome, "pt-BR"))
        .map(
          (item) =>
            `<span style="display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border:1px solid #cbd5e1; border-radius:4px; background:#f8fafc;">
              <strong>${escapeHtml(item.sigla)}:</strong> ${escapeHtml(item.dNome)} — ${escapeHtml(item.pNome)} (${item.qtd}a)
            </span>`
        )
        .join(" ");

      const tituloTurma = String(nomeTurma).toUpperCase().includes("TURMA")
        ? String(nomeTurma).toUpperCase()
        : `TURMA ${String(nomeTurma).toUpperCase()}`;

      return `<div class="page-sheet">
        ${renderInstHeaderHtml({
          escolaTitulo: escola.tituloHeader,
          subtitulo: `QUADRO OFICIAL DE AULAS DA TURMA · TURNO ${String(turno).toUpperCase()} · ${temporal.vigenciaLabel.toUpperCase()}`,
          pillDireita: `${tituloTurma} · ${totalAulasTurma} AULAS`,
          paginaAtual: idx + 1,
          totalPaginas,
          dataEmissao,
        })}

        <table class="full-table" style="margin-top:1mm;">
          <thead class="thead-dark">
            <tr>
              <th style="width:30mm;">HORÁRIO</th>
              ${diasSemana.map((d) => `<th>${escapeHtml(DIAS_LABEL[d] || `Dia ${d}`)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div style="margin-top:3.5mm; padding-top:2.5mm; border-top:1px solid #e2e8f0; font-size:9.5px; color:#1e293b; display:flex; flex-wrap:wrap; gap:5px; align-items:center;">
          <strong style="color:#0f172a; margin-right:4px;">CORPO DOCENTE DA TURMA:</strong>
          ${legendaHtml || "<span>Nenhuma aula alocada.</span>"}
        </div>

        ${renderInstFooterHtml({ vigenciaLabel: temporal.vigenciaLabel, turno })}
      </div>`;
    })
    .join("\n");
}

// ============================================================================
// 4. HTML Quadro Geral Panorâmico (Mural da Sala dos Professores)
// ============================================================================
export function gerarHtmlQuadroGeralMural({
  turmaIds,
  gradePorTurma,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  config = null,
  colorido = true,
}) {
  const escola = obterDadosEscola(config);
  const temporal = resolverGradeTemporalTurno({ config, turno, periodosPorDia });
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  const turmasPorFolha = 22;
  const paginas = chunkArray(turmaIds, turmasPorFolha);
  const totalPaginas = Math.max(1, paginas.length);

  return paginas
    .map((grupoTurmas, pageIdx) => {
      const headerDias = diasSemana
        .map(
          (d) =>
            `<th colspan="${periodosPorDia}" style="font-size:9.5px; padding:3px; border-left:2px solid #93c5fd;">${escapeHtml(
              DIAS_LABEL[d] || `Dia ${d}`
            )}</th>`
        )
        .join("");

      const headerPeriodos = diasSemana
        .map(() =>
          temporal.periodos
            .map((p) => {
              const borderBreak = temporal.intervaloApos === p.ordem ? "border-right:2px dashed #f59e0b;" : "";
              const borderDay = p.ordem === 1 ? "border-left:2px solid #64748b;" : "";
              return `<th style="font-size:7.2px; padding:2px 1px; background:#334155; color:#fff; ${borderDay} ${borderBreak}">
                <div>${p.ordem}ª</div>
                ${p.inicio ? `<div style="font-size:6.3px; opacity:0.85; font-weight:600;">${escapeHtml(p.inicio)}</div>` : ""}
              </th>`;
            })
            .join("")
        )
        .join("");

      const rowsHtml = grupoTurmas
        .map((tId) => {
          const nomeTurma = nomesTurmas[tId] || `Turma ${tId}`;
          const grade = gradePorTurma?.[tId] || {};
          let cells = `<td style="font-weight:800; font-size:8.5px; background:#f8fafc; color:#0f172a; text-align:left; padding:2px 5px; white-space:nowrap;">${escapeHtml(
            nomeTurma
          )}</td>`;

          for (const dia of diasSemana) {
            for (const p of temporal.periodos) {
              const ord = p.ordem;
              const slot = grade?.[dia]?.[ord] || grade?.[String(dia)]?.[String(ord)] || null;
              const borderLeft = ord === 1 ? "border-left:2px solid #64748b;" : "";
              const borderBreak = temporal.intervaloApos === ord ? "border-right:1.8px dashed #94a3b8;" : "";

              if (!slot || !slot.disciplina_id) {
                cells += `<td style="font-size:7.5px; color:#cbd5e1; padding:1.5px; ${borderLeft} ${borderBreak}">·</td>`;
              } else {
                const sigla = siglaDisciplina(nomesDisciplinas[slot.disciplina_id] || "", slot.disciplina_sigla);
                const pCurto =
                  String(nomesProfessores[slot.professor_id] || "")
                    .trim()
                    .split(/\s+/)[0]
                    ?.slice(0, 6)
                    .toUpperCase() || "";
                const cor = corPorChave(slot.disciplina_id, colorido);
                cells += `<td class="color-fill" style="padding:1px; background:${cor.bg}; color:${cor.text}; ${borderLeft} ${borderBreak}">
                  <div style="font-size:7.6px; font-weight:800; line-height:1.05;">${escapeHtml(sigla)}</div>
                  <div style="font-size:6.5px; opacity:0.88; line-height:1.05;">${escapeHtml(pCurto)}</div>
                </td>`;
              }
            }
          }
          return `<tr>${cells}</tr>`;
        })
        .join("");

      return `<div class="page-sheet">
        ${renderInstHeaderHtml({
          escolaTitulo: escola.tituloHeader,
          subtitulo: `QUADRO GERAL PANORÂMICO (MURAL DA SALA DOS PROFESSORES E COORDENAÇÃO) · ${temporal.vigenciaLabel.toUpperCase()}`,
          pillDireita: `TURNO ${String(turno).toUpperCase()} · ${turmaIds.length} TURMAS`,
          paginaAtual: pageIdx + 1,
          totalPaginas,
          dataEmissao,
        })}
        <table class="full-table" style="table-layout:auto;">
          <thead class="thead-dark">
            <tr>
              <th rowspan="2" style="width:22mm; font-size:8.5px;">TURMA</th>
              ${headerDias}
            </tr>
            <tr>${headerPeriodos}</tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${renderInstFooterHtml({ vigenciaLabel: temporal.vigenciaLabel, turno })}
      </div>`;
    })
    .join("\n");
}

// ============================================================================
// Helpers Rápidos de 1 Clique (Cards Individuais em Gerar Horário / Manual)
// ============================================================================
export function imprimirHorarioTurmaUnica({
  turmaId,
  gradePorTurma,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  config = null,
}) {
  const nome = nomesTurmas[turmaId] || `Turma ${turmaId}`;
  const html = gerarHtmlHorarioPorTurma({
    turmaIds: [turmaId],
    gradePorTurma,
    nomesTurmas,
    nomesDisciplinas,
    nomesProfessores,
    diasSemana,
    periodosPorDia,
    turno,
    config,
    porPagina: 1,
    colorido: true,
  });
  abrirJanelaImpressaoHtml(`Horário da Turma — ${nome} (${turno})`, html);
}

export function imprimirHorarioProfessorUnico({
  profId,
  gradePorProfessor,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  config = null,
}) {
  const nome = nomesProfessores[profId] || `Professor ${profId}`;
  const html = gerarHtmlHorarioPorProfessor({
    profIds: [profId],
    gradePorProfessor,
    nomesTurmas,
    nomesDisciplinas,
    nomesProfessores,
    diasSemana,
    periodosPorDia,
    turno,
    config,
    porPagina: 1,
    colorido: true,
  });
  abrirJanelaImpressaoHtml(`Horário Docente — ${nome} (${turno})`, html);
}

// ============================================================================
// Motor Vetorial Nativo jsPDF (Download Direto .PDF — Precisão Milimétrica A4)
// ============================================================================
function desenharCabecalhoPdf(doc, {
  escolaTitulo,
  subtitulo,
  pillDireita,
  paginaAtual,
  totalPaginas,
  dataEmissao,
  vigenciaLabel,
  turno,
  colorido = true,
}) {
  // Brasão vetorial minimalista à esquerda
  if (colorido) {
    doc.setFillColor(15, 23, 42);
  } else {
    doc.setFillColor(40, 40, 40);
  }
  doc.roundedRect(8, 6.5, 7, 7, 1.2, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("EM", 11.5, 11.2, { align: "center" });

  // Título da Escola e Subtítulo
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(pdfSafeText(escolaTitulo), 17, 10);

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.text(pdfSafeText(subtitulo), 17, 13.6);

  // Badge direita + Paginação
  const pillSafe = pdfSafeText(pillDireita);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  const pillW = doc.getTextWidth(pillSafe) + 5;
  const pillX = 289 - pillW;
  if (colorido) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(147, 197, 253);
    doc.setTextColor(30, 58, 138);
  } else {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(100, 116, 139);
    doc.setTextColor(15, 23, 42);
  }
  doc.roundedRect(pillX, 6.3, pillW, 4.6, 1, 1, "FD");
  doc.text(pillSafe, pillX + pillW / 2, 9.4, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    pdfSafeText(`Emissão: ${dataEmissao}  ·  Página ${paginaAtual} de ${totalPaginas}`),
    289,
    13.7,
    { align: "right" }
  );

  // Linha mestra separadora do cabeçalho
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);
  doc.line(8, 15.5, 289, 15.5);

  // Rodapé institucional discreto
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(8, 203.2, 289, 203.2);
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    pdfSafeText(`Documento Oficial da Secretaria Escolar · Turno ${String(turno).toUpperCase()} · Vigência ${vigenciaLabel}`),
    8,
    206.3
  );
  doc.text("Sistema EDUCA.MELHOR", 289, 206.3, { align: "right" });
}

function desenharMosaicoVetorialPdf(doc, {
  itensIds,
  tipoItem, // "professor" | "turma"
  gradeMap,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana,
  periodosPorDia,
  temporal,
  escola,
  turno,
  porPagina,
  colorido,
  dataEmissao,
}) {
  const paginas = chunkArray(itensIds, porPagina);
  const totalPaginas = Math.max(1, paginas.length);
  const colsGrid = 2;
  const rowsGrid = Math.ceil(porPagina / colsGrid);

  const areaX = 8;
  const areaY = 17.5;
  const areaW = 281;
  const areaH = 183.8;
  const gapX = 4.5;
  const gapY = rowsGrid >= 5 ? 2.2 : 3.2;

  const cardW = (areaW - gapX * (colsGrid - 1)) / colsGrid;
  const cardH = (areaH - gapY * (rowsGrid - 1)) / rowsGrid;

  paginas.forEach((grupoIds, pageIdx) => {
    if (pageIdx > 0) doc.addPage();

    desenharCabecalhoPdf(doc, {
      escolaTitulo: escola.tituloHeader,
      subtitulo:
        tipoItem === "professor"
          ? `RELATÓRIO DE HORÁRIOS DOCENTES (INDIVIDUAL EM LOTE) · ${temporal.vigenciaLabel.toUpperCase()}`
          : `CADERNO COMPACTO DE HORÁRIOS POR TURMA · ${temporal.vigenciaLabel.toUpperCase()}`,
      pillDireita:
        tipoItem === "professor"
          ? `TURNO ${String(turno).toUpperCase()} · ${itensIds.length} DOCENTES`
          : `TURNO ${String(turno).toUpperCase()} · ${itensIds.length} TURMAS`,
      paginaAtual: pageIdx + 1,
      totalPaginas,
      dataEmissao,
      vigenciaLabel: temporal.vigenciaLabel,
      turno,
      colorido,
    });

    grupoIds.forEach((itemId, idx) => {
      const colIdx = idx % colsGrid;
      const rowIdx = Math.floor(idx / colsGrid);
      const x0 = areaX + colIdx * (cardW + gapX);
      const y0 = areaY + rowIdx * (cardH + gapY);

      const grade = gradeMap?.[itemId] || {};
      const nomeItem =
        tipoItem === "professor"
          ? nomeProfCompactoTopo(nomesProfessores[itemId] || `Professor ${itemId}`, 34)
          : String(nomesTurmas[itemId] || `Turma ${itemId}`).toUpperCase();
      const totalAulas =
        tipoItem === "professor"
          ? contarAulasGradeProf(grade, diasSemana, periodosPorDia)
          : contarAulasGradeTurma(grade, diasSemana, periodosPorDia);

      const headBarH = rowsGrid >= 5 ? 4.6 : 5.4;
      const tableHeadH = rowsGrid >= 5 ? 4.0 : 4.6;
      const temIntervalo = temporal.intervaloApos > 0 && temporal.intervaloApos < periodosPorDia;
      const breakH = temIntervalo ? 1.3 : 0;
      const rowH = (cardH - headBarH - tableHeadH - breakH) / Math.max(1, periodosPorDia);

      // Barra superior da mini-grade
      if (colorido) {
        doc.setFillColor(15, 23, 42);
        doc.rect(x0, y0, cardW, headBarH, "F");
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.3);
        doc.rect(x0, y0, cardW, headBarH, "FD");
        doc.setTextColor(15, 23, 42);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(rowsGrid >= 5 ? 7.6 : 8.2);
      doc.text(pdfSafeText(nomeItem), x0 + 2, y0 + headBarH * 0.72);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      if (colorido) doc.setTextColor(191, 219, 254);
      doc.text(
        pdfSafeText(`${totalAulas} aula${totalAulas === 1 ? "" : "s"}`),
        x0 + cardW - 2,
        y0 + headBarH * 0.72,
        { align: "right" }
      );

      // Cabeçalho das colunas (Hor | Seg | Ter | Qua | Qui | Sex)
      const horColW = 14.5;
      const dayColW = (cardW - horColW) / diasSemana.length;
      const yTh = y0 + headBarH;

      doc.setFillColor(226, 232, 240);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.2);
      doc.rect(x0, yTh, horColW, tableHeadH, "FD");
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.text("Hor", x0 + horColW / 2, yTh + tableHeadH * 0.7, { align: "center" });

      diasSemana.forEach((dia, dIdx) => {
        const cx = x0 + horColW + dIdx * dayColW;
        doc.setFillColor(226, 232, 240);
        doc.rect(cx, yTh, dayColW, tableHeadH, "FD");
        doc.text(pdfSafeText(DIAS_CURTO[dia] || `D${dia}`), cx + dayColW / 2, yTh + tableHeadH * 0.7, {
          align: "center",
        });
      });

      // Linhas dos períodos
      let curY = yTh + tableHeadH;
      temporal.periodos.forEach((per) => {
        const ord = per.ordem;

        // Coluna Hor
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(148, 163, 184);
        doc.rect(x0, curY, horColW, rowH, "FD");
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(rowsGrid >= 5 ? 6.7 : 7.2);
        doc.text(pdfSafeText(per.labelMosaico), x0 + horColW / 2, curY + rowH * 0.68, {
          align: "center",
        });

        // Células dos dias
        diasSemana.forEach((dia, dIdx) => {
          const cx = x0 + horColW + dIdx * dayColW;
          const slot = grade?.[dia]?.[ord] || grade?.[String(dia)]?.[String(ord)] || null;
          const ocupado = tipoItem === "professor" ? Boolean(slot?.turma_id) : Boolean(slot?.disciplina_id);

          if (!ocupado) {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(180, 190, 203);
            doc.rect(cx, curY, dayColW, rowH, "FD");
            doc.setTextColor(160, 174, 192);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.text(". . . . . . .", cx + dayColW / 2, curY + rowH * 0.62, { align: "center" });
          } else {
            const cor = corPorChave(slot.disciplina_id || slot.turma_id, colorido);
            doc.setFillColor(...cor.rgbBg);
            doc.setDrawColor(148, 163, 184);
            doc.rect(cx, curY, dayColW, rowH, "FD");

            doc.setTextColor(...cor.rgbText);
            doc.setFont("helvetica", "bold");

            if (tipoItem === "professor") {
              const tSigla = siglaTurmaCurta(nomesTurmas[slot.turma_id] || `T${slot.turma_id}`);
              const dSigla = siglaDisciplina(nomesDisciplinas[slot.disciplina_id] || "", slot.disciplina_sigla);
              const textoCelula = pdfSafeText(`${tSigla}/${dSigla}`);
              doc.setFontSize(rowsGrid >= 5 ? 6.8 : 7.4);
              doc.text(textoCelula, cx + dayColW / 2, curY + rowH * 0.68, { align: "center" });
            } else {
              const dSigla = siglaDisciplina(nomesDisciplinas[slot.disciplina_id] || "", slot.disciplina_sigla);
              const pCurto =
                String(nomesProfessores[slot.professor_id] || "")
                  .trim()
                  .split(/\s+/)[0]
                  ?.slice(0, 6)
                  .toUpperCase() || "";
              if (rowH >= 5.4 && pCurto) {
                doc.setFontSize(6.6);
                doc.text(pdfSafeText(dSigla), cx + dayColW / 2, curY + rowH * 0.46, { align: "center" });
                doc.setFont("helvetica", "normal");
                doc.setFontSize(5.5);
                doc.text(pdfSafeText(pCurto), cx + dayColW / 2, curY + rowH * 0.84, { align: "center" });
              } else {
                doc.setFontSize(6.5);
                doc.text(pdfSafeText(`${dSigla}${pCurto ? `/${pCurto.slice(0, 4)}` : ""}`), cx + dayColW / 2, curY + rowH * 0.68, {
                  align: "center",
                });
              }
            }
          }
        });

        curY += rowH;

        // Divisória sutil de intervalo na posição exata configurada para o turno
        if (temporal.intervaloApos === ord && ord < periodosPorDia) {
          doc.setFillColor(203, 213, 225);
          doc.setDrawColor(148, 163, 184);
          doc.rect(x0, curY, cardW, breakH, "FD");
          curY += breakH;
        }
      });

      // Moldura externa nítida da mini-grade
      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.32);
      doc.rect(x0, y0, cardW, cardH, "D");
    });
  });
}

export function baixarPdfVetorialOficial({
  modoRelatorio,
  turmaIds,
  profIds,
  gradePorTurma,
  gradePorProfessor,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  config = null,
  densidadeProfessor = 10, // 10 | 8 | 4 | 2 | 1
  densidadeTurma = 1,      // 1 | 4 | 6
  colorido = true,
}) {
  const escola = obterDadosEscola(config);
  const temporal = resolverGradeTemporalTurno({ config, turno, periodosPorDia });
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const sufixoSemestre = `S${resolverVigenciaFrontend(config).semestre_atual}_${temporal.anoLetivo}`;

  // ── MODO 1: QUADRO GERAL PANORÂMICO ──
  if (modoRelatorio === "quadro_geral") {
    const turmasPorFolha = 22;
    const paginas = chunkArray(turmaIds, turmasPorFolha);
    const totalPaginas = Math.max(1, paginas.length);

    paginas.forEach((grupoTurmas, pageIdx) => {
      if (pageIdx > 0) doc.addPage();
      desenharCabecalhoPdf(doc, {
        escolaTitulo: escola.tituloHeader,
        subtitulo: `QUADRO GERAL PANORÂMICO DO TURNO · ${temporal.vigenciaLabel.toUpperCase()}`,
        pillDireita: `TURNO ${String(turno).toUpperCase()} · ${turmaIds.length} TURMAS`,
        paginaAtual: pageIdx + 1,
        totalPaginas,
        dataEmissao,
        vigenciaLabel: temporal.vigenciaLabel,
        turno,
        colorido,
      });

      const headRow = ["TURMA"];
      for (const d of diasSemana) {
        for (const p of temporal.periodos) {
          headRow.push(pdfSafeText(`${DIAS_UPPER[d] || d}\n${p.inicio || `${p.ordem}ª`}`));
        }
      }

      const bodyRows = grupoTurmas.map((tId) => {
        const row = [pdfSafeText(nomesTurmas[tId] || `Turma ${tId}`)];
        const grade = gradePorTurma?.[tId] || {};
        for (const d of diasSemana) {
          for (const p of temporal.periodos) {
            const slot = grade?.[d]?.[p.ordem] || grade?.[String(d)]?.[String(p.ordem)];
            if (!slot || !slot.disciplina_id) {
              row.push("·");
            } else {
              const sigla = siglaDisciplina(nomesDisciplinas[slot.disciplina_id] || "", slot.disciplina_sigla);
              const prof =
                String(nomesProfessores[slot.professor_id] || "")
                  .trim()
                  .split(/\s+/)[0]
                  ?.slice(0, 6)
                  .toUpperCase() || "";
              row.push(pdfSafeText(`${sigla}\n${prof}`));
            }
          }
        }
        return row;
      });

      autoTable(doc, {
        startY: 18,
        head: [headRow],
        body: bodyRows,
        styles: {
          fontSize: 6.1,
          cellPadding: 1.0,
          halign: "center",
          valign: "middle",
          lineColor: [148, 163, 184],
          lineWidth: 0.15,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: colorido ? [15, 23, 42] : [226, 232, 240],
          textColor: colorido ? 255 : [15, 23, 42],
          fontStyle: "bold",
        },
        columnStyles: { 0: { fontStyle: "bold", halign: "left", cellWidth: 22, fillColor: [248, 250, 252] } },
        margin: { left: 8, right: 8, bottom: 10 },
      });
    });

    doc.save(`Quadro_Geral_${turno.toUpperCase()}_${sufixoSemestre}.pdf`);
    return;
  }

  // ── MODO 2: HORÁRIO POR TURMA ──
  if (modoRelatorio === "por_turma") {
    if (densidadeTurma > 1) {
      desenharMosaicoVetorialPdf(doc, {
        itensIds: turmaIds,
        tipoItem: "turma",
        gradeMap: gradePorTurma,
        nomesTurmas,
        nomesDisciplinas,
        nomesProfessores,
        diasSemana,
        periodosPorDia,
        temporal,
        escola,
        turno,
        porPagina: densidadeTurma,
        colorido,
        dataEmissao,
      });
      doc.save(`Horarios_Turmas_Lote_${turno.toUpperCase()}_${sufixoSemestre}.pdf`);
      return;
    }

    const totalPaginas = Math.max(1, turmaIds.length);
    turmaIds.forEach((tId, idx) => {
      if (idx > 0) doc.addPage();
      const nomeTurma = nomesTurmas[tId] || `Turma ${tId}`;
      const grade = gradePorTurma?.[tId] || {};
      const totalAulas = contarAulasGradeTurma(grade, diasSemana, periodosPorDia);

      desenharCabecalhoPdf(doc, {
        escolaTitulo: escola.tituloHeader,
        subtitulo: `QUADRO OFICIAL DE AULAS DA TURMA · TURNO ${String(turno).toUpperCase()} · ${temporal.vigenciaLabel.toUpperCase()}`,
        pillDireita: `TURMA ${String(nomeTurma).toUpperCase()} · ${totalAulas} AULAS`,
        paginaAtual: idx + 1,
        totalPaginas,
        dataEmissao,
        vigenciaLabel: temporal.vigenciaLabel,
        turno,
        colorido,
      });

      const head = [["HORÁRIO", ...diasSemana.map((d) => pdfSafeText(DIAS_LABEL[d] || `Dia ${d}`))]];
      const body = [];
      const legendaSet = new Map();

      temporal.periodos.forEach((per) => {
        const o = per.ordem;
        const row = [pdfSafeText(per.inicio && per.fim ? `${o}ª AULA\n${per.inicio} - ${per.fim}` : `${o}ª AULA`)];
        for (const d of diasSemana) {
          const slot = grade?.[d]?.[o] || grade?.[String(d)]?.[String(o)];
          if (!slot || !slot.disciplina_id) {
            row.push(". . . . . . .");
          } else {
            const dNome = nomesDisciplinas[slot.disciplina_id] || `Disc ${slot.disciplina_id}`;
            const pNome = nomesProfessores[slot.professor_id] || `Prof ${slot.professor_id}`;
            row.push(pdfSafeText(`${dNome}\n(${primeiroNomeProf(pNome)})`));
            const k = `${slot.disciplina_id}|${slot.professor_id}`;
            const prev = legendaSet.get(k) || { dNome, pNome, qtd: 0 };
            prev.qtd++;
            legendaSet.set(k, prev);
          }
        }
        body.push(row);

        if (temporal.intervaloApos === o && o < periodosPorDia) {
          body.push([
            {
              content: pdfSafeText(temporal.labelIntervalo),
              colSpan: diasSemana.length + 1,
              styles: {
                fillColor: [226, 232, 240],
                textColor: [51, 65, 85],
                fontStyle: "bold",
                fontSize: 7.5,
                cellPadding: 1.5,
              },
            },
          ]);
        }
      });

      autoTable(doc, {
        startY: 19,
        head,
        body,
        styles: {
          fontSize: 9.2,
          cellPadding: 3.5,
          halign: "center",
          valign: "middle",
          lineColor: [148, 163, 184],
          lineWidth: 0.2,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: colorido ? [15, 23, 42] : [226, 232, 240],
          textColor: colorido ? 255 : [15, 23, 42],
          fontStyle: "bold",
        },
        columnStyles: { 0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 30 } },
        margin: { left: 8, right: 8 },
      });

      const finalY = Math.min(188, (doc.lastAutoTable?.finalY || 145) + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text("Corpo Docente da Turma:", 8, finalY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const legText = Array.from(legendaSet.values())
        .map((x) => `${x.dNome}: ${x.pNome} (${x.qtd}a)`)
        .join("   |   ");
      const splitLeg = doc.splitTextToSize(pdfSafeText(legText || "Nenhuma aula alocada."), 281);
      doc.text(splitLeg, 8, finalY + 4.5);
    });

    doc.save(`Horarios_Turmas_${turno.toUpperCase()}_${sufixoSemestre}.pdf`);
    return;
  }

  // ── MODO 3: HORÁRIOS DE PROFESSORES (MOSAICO 10/8/4, DUPLO C/ CORTE 2 OU INDIVIDUAL 1) ──
  if (densidadeProfessor >= 4) {
    desenharMosaicoVetorialPdf(doc, {
      itensIds: profIds,
      tipoItem: "professor",
      gradeMap: gradePorProfessor,
      nomesTurmas,
      nomesDisciplinas,
      nomesProfessores,
      diasSemana,
      periodosPorDia,
      temporal,
      escola,
      turno,
      porPagina: densidadeProfessor,
      colorido,
      dataEmissao,
    });
    doc.save(`Horarios_Docentes_Lote_${turno.toUpperCase()}_${sufixoSemestre}.pdf`);
    return;
  }

  if (densidadeProfessor === 2) {
    const pares = chunkArray(profIds, 2);
    const totalPaginas = Math.max(1, pares.length);

    pares.forEach((dupla, pageIdx) => {
      if (pageIdx > 0) doc.addPage();

      dupla.forEach((pId, idxSlot) => {
        const yBase = idxSlot === 0 ? 7 : 107.5;
        const nomeProf = nomesProfessores[pId] || `Professor ${pId}`;
        const grade = gradePorProfessor?.[pId] || {};
        const resumoSet = new Map();
        let totalAulas = 0;

        // Cabeçalho compacto do recibo
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.25);
        doc.roundedRect(8, yBase, 281, 93, 1.5, 1.5, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(pdfSafeText(escola.tituloHeader), 12, yBase + 5.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.4);
        doc.setTextColor(71, 85, 105);
        doc.text(
          pdfSafeText(`COMUNICADO DE HORÁRIO DOCENTE · TURNO ${String(turno).toUpperCase()} · ${temporal.vigenciaLabel.toUpperCase()}`),
          12,
          yBase + 9.2
        );

        const head = [["HORÁRIO", ...diasSemana.map((d) => pdfSafeText(DIAS_LABEL[d] || `Dia ${d}`))]];
        const body = [];

        temporal.periodos.forEach((per) => {
          const o = per.ordem;
          const row = [pdfSafeText(per.inicio ? `${o}ª · ${per.inicio}` : `${o}ª AULA`)];
          for (const d of diasSemana) {
            const slot = grade?.[d]?.[o] || grade?.[String(d)]?.[String(o)];
            if (!slot || !slot.turma_id) {
              row.push(". . . . . .");
            } else {
              totalAulas++;
              const tNome = nomesTurmas[slot.turma_id] || `Turma ${slot.turma_id}`;
              const dNome = nomesDisciplinas[slot.disciplina_id] || "";
              const dSigla = siglaDisciplina(dNome, slot.disciplina_sigla);
              row.push(pdfSafeText(`${tNome} · ${dSigla}`));
              const k = `${slot.turma_id}|${slot.disciplina_id}`;
              const prev = resumoSet.get(k) || { tNome, dNome, qtd: 0 };
              prev.qtd++;
              resumoSet.set(k, prev);
            }
          }
          body.push(row);

          if (temporal.intervaloApos === o && o < periodosPorDia) {
            body.push([
              {
                content: pdfSafeText(temporal.labelIntervalo),
                colSpan: diasSemana.length + 1,
                styles: { fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: "bold", fontSize: 6.2, cellPadding: 0.7 },
              },
            ]);
          }
        });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 58, 138);
        doc.text(pdfSafeText(`PROF(A). ${nomeProf}  (${totalAulas} aulas)`), 285, yBase + 6, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(pdfSafeText(`Emissão: ${dataEmissao} · Pág. ${pageIdx + 1}/${totalPaginas}`), 285, yBase + 9.4, { align: "right" });

        autoTable(doc, {
          startY: yBase + 11.5,
          head,
          body,
          styles: {
            fontSize: 7.4,
            cellPadding: periodosPorDia >= 6 ? 1.4 : 1.9,
            halign: "center",
            valign: "middle",
            lineColor: [148, 163, 184],
            lineWidth: 0.18,
            textColor: [15, 23, 42],
          },
          headStyles: {
            fillColor: colorido ? [15, 23, 42] : [226, 232, 240],
            textColor: colorido ? 255 : [15, 23, 42],
            fontStyle: "bold",
            cellPadding: 1.5,
          },
          columnStyles: { 0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 25 } },
          margin: { left: 12, right: 12 },
        });

        // Assinaturas no rodapé da meia-folha
        const ySign = yBase + 88.5;
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.2);
        doc.line(12, ySign - 3, 92, ySign - 3);
        doc.line(110, ySign - 3, 178, ySign - 3);
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(pdfSafeText(`Ciência: ${nomeProfCompactoTopo(nomeProf, 32)}`), 52, ySign, { align: "center" });
        doc.text("Coordenação / Direção", 144, ySign, { align: "center" });
        doc.text(pdfSafeText(`Recebido em: ____/____/${temporal.anoLetivo}`), 285, ySign, { align: "right" });

        if (idxSlot === 0 && dupla.length === 2) {
          doc.setDrawColor(148, 163, 184);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(8, 103.8, 289, 103.8);
          doc.setLineDashPattern([], 0);
        }
      });
    });

    doc.save(`Comunicados_Docentes_2porFolha_${turno.toUpperCase()}_${sufixoSemestre}.pdf`);
    return;
  }

  // 1 Professor por Página A4 Executiva
  const totalPaginas = Math.max(1, profIds.length);
  profIds.forEach((pId, idx) => {
    if (idx > 0) doc.addPage();
    const nomeProf = nomesProfessores[pId] || `Professor ${pId}`;
    const grade = gradePorProfessor?.[pId] || {};
    const resumoSet = new Map();
    let totalAulas = contarAulasGradeProf(grade, diasSemana, periodosPorDia);

    desenharCabecalhoPdf(doc, {
      escolaTitulo: escola.tituloHeader,
      subtitulo: `COMUNICADO INDIVIDUAL DE HORÁRIO DOCENTE · TURNO ${String(turno).toUpperCase()} · ${temporal.vigenciaLabel.toUpperCase()}`,
      pillDireita: `PROF(A). ${nomeProfCompactoTopo(nomeProf, 28)} · ${totalAulas} AULAS`,
      paginaAtual: idx + 1,
      totalPaginas,
      dataEmissao,
      vigenciaLabel: temporal.vigenciaLabel,
      turno,
      colorido,
    });

    const head = [["HORÁRIO", ...diasSemana.map((d) => pdfSafeText(DIAS_LABEL[d] || `Dia ${d}`))]];
    const body = [];

    temporal.periodos.forEach((per) => {
      const o = per.ordem;
      const row = [pdfSafeText(per.inicio && per.fim ? `${o}ª AULA\n${per.inicio} - ${per.fim}` : `${o}ª AULA`)];
      for (const d of diasSemana) {
        const slot = grade?.[d]?.[o] || grade?.[String(d)]?.[String(o)];
        if (!slot || !slot.turma_id) {
          row.push(". . . . . . .");
        } else {
          const tNome = nomesTurmas[slot.turma_id] || `Turma ${slot.turma_id}`;
          const dNome = nomesDisciplinas[slot.disciplina_id] || `Disc ${slot.disciplina_id}`;
          row.push(pdfSafeText(`${tNome}\n${dNome}`));
          const k = `${slot.turma_id}|${slot.disciplina_id}`;
          const prev = resumoSet.get(k) || { tNome, dNome, qtd: 0 };
          prev.qtd++;
          resumoSet.set(k, prev);
        }
      }
      body.push(row);

      if (temporal.intervaloApos === o && o < periodosPorDia) {
        body.push([
          {
            content: pdfSafeText(temporal.labelIntervalo),
            colSpan: diasSemana.length + 1,
            styles: {
              fillColor: [226, 232, 240],
              textColor: [51, 65, 85],
              fontStyle: "bold",
              fontSize: 7.5,
              cellPadding: 1.5,
            },
          },
        ]);
      }
    });

    autoTable(doc, {
      startY: 19,
      head,
      body,
      styles: {
        fontSize: 9.2,
        cellPadding: 3.4,
        halign: "center",
        valign: "middle",
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: colorido ? [15, 23, 42] : [226, 232, 240],
        textColor: colorido ? 255 : [15, 23, 42],
        fontStyle: "bold",
      },
      columnStyles: { 0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 30 } },
      margin: { left: 8, right: 8 },
    });

    const finalY = Math.min(176, (doc.lastAutoTable?.finalY || 142) + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafeText(`Resumo de Modulação (${totalAulas} aulas semanais):`), 8, finalY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const resText = Array.from(resumoSet.values())
      .map((x) => `${x.tNome} - ${x.dNome} (${x.qtd}a)`)
      .join("   |   ");
    const splitRes = doc.splitTextToSize(pdfSafeText(resText || "Nenhuma aula alocada."), 281);
    doc.text(splitRes, 8, finalY + 4.5);

    // Linhas de ciência e assinatura
    const signY = 197;
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.25);
    doc.line(8, signY - 4, 98, signY - 4);
    doc.line(118, signY - 4, 198, signY - 4);
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    doc.text(pdfSafeText(`Ciência do(a) Professor(a): ${nomeProfCompactoTopo(nomeProf, 32)}`), 53, signY, {
      align: "center",
    });
    doc.text("Coordenação Pedagógica / Direção", 158, signY, { align: "center" });
    doc.text(pdfSafeText(`Data: ____/____/${temporal.anoLetivo}`), 289, signY, { align: "right" });
  });

  const nomeArquivo =
    profIds.length === 1
      ? `Horario_Docente_${sansAccent(nomesProfessores[profIds[0]] || "Professor").replace(/\s+/g, "_")}_${turno.toUpperCase()}.pdf`
      : `Horarios_Docentes_${turno.toUpperCase()}_${sufixoSemestre}.pdf`;
  doc.save(nomeArquivo);
}

// ============================================================================
// Componente Modal Principal da Central de Impressão e Exportação PDF
// ============================================================================
export default function ExportarHorarioModal({
  aberto,
  onFechar,
  resultado,
  turno = "matutino",
  nomesTurmas = {},
  nomesDisciplinas = {},
  nomesProfessores = {},
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  config = null,
  modoInicial = "por_professor",
}) {
  const [modoRelatorio, setModoRelatorio] = useState(modoInicial); // "por_professor" | "por_turma" | "quadro_geral"
  const [turmaSelecionada, setTurmaSelecionada] = useState("TODAS");
  const [profSelecionado, setProfSelecionado] = useState("TODOS");
  const [densidadeProfessor, setDensidadeProfessor] = useState(10); // 10 | 8 | 2 | 1
  const [densidadeTurma, setDensidadeTurma] = useState(1);          // 1 | 6 | 4
  const [temaCores, setTemaCores] = useState("colorido");           // "colorido" | "pb_laser"
  const [apenasComAulas, setApenasComAulas] = useState(true);

  const temporal = useMemo(
    () => resolverGradeTemporalTurno({ config, turno, periodosPorDia }),
    [config, turno, periodosPorDia]
  );

  const turmasOrdenadas = useMemo(() => {
    const ids = Object.keys(resultado?.grade_por_turma || {}).map(Number).filter(Boolean);
    const filtrados = apenasComAulas
      ? ids.filter((id) => contarAulasGradeTurma(resultado?.grade_por_turma?.[id], diasSemana, periodosPorDia) > 0)
      : ids;
    const base = filtrados.length > 0 ? filtrados : ids;
    return base.sort((a, b) => {
      const nA = String(nomesTurmas[a] || a).toUpperCase();
      const nB = String(nomesTurmas[b] || b).toUpperCase();
      return nA.localeCompare(nB, "pt-BR", { numeric: true });
    });
  }, [resultado, nomesTurmas, apenasComAulas, diasSemana, periodosPorDia]);

  const professoresOrdenados = useMemo(() => {
    const ids = Object.keys(resultado?.grade_por_professor || {}).map(Number).filter(Boolean);
    const filtrados = apenasComAulas
      ? ids.filter((id) => contarAulasGradeProf(resultado?.grade_por_professor?.[id], diasSemana, periodosPorDia) > 0)
      : ids;
    const base = filtrados.length > 0 ? filtrados : ids;
    return base.sort((a, b) => {
      const nA = String(nomesProfessores[a] || a).toUpperCase();
      const nB = String(nomesProfessores[b] || b).toUpperCase();
      return nA.localeCompare(nB, "pt-BR", { numeric: true });
    });
  }, [resultado, nomesProfessores, apenasComAulas, diasSemana, periodosPorDia]);

  if (!aberto || !resultado) return null;

  const targetTurmaIds =
    turmaSelecionada === "TODAS" ? turmasOrdenadas : [Number(turmaSelecionada)];
  const targetProfIds =
    profSelecionado === "TODOS" ? professoresOrdenados : [Number(profSelecionado)];

  const densidadeProfEfetiva = targetProfIds.length === 1 ? 1 : densidadeProfessor;
  const densidadeTurmaEfetiva = targetTurmaIds.length === 1 ? 1 : densidadeTurma;
  const isColorido = temaCores === "colorido";

  const estimativaPaginas = (() => {
    if (modoRelatorio === "quadro_geral") return Math.max(1, Math.ceil(turmasOrdenadas.length / 22));
    if (modoRelatorio === "por_turma") return Math.max(1, Math.ceil(targetTurmaIds.length / densidadeTurmaEfetiva));
    return Math.max(1, Math.ceil(targetProfIds.length / densidadeProfEfetiva));
  })();

  function handleVisualizarImprimir() {
    if (modoRelatorio === "quadro_geral") {
      const html = gerarHtmlQuadroGeralMural({
        turmaIds: turmasOrdenadas,
        gradePorTurma: resultado.grade_por_turma,
        nomesTurmas,
        nomesDisciplinas,
        nomesProfessores,
        diasSemana,
        periodosPorDia,
        turno,
        config,
        colorido: isColorido,
      });
      abrirJanelaImpressaoHtml(`Quadro Geral — ${turno.toUpperCase()}`, html, { pbLaser: !isColorido });
      return;
    }

    if (modoRelatorio === "por_turma") {
      const html = gerarHtmlHorarioPorTurma({
        turmaIds: targetTurmaIds,
        gradePorTurma: resultado.grade_por_turma,
        nomesTurmas,
        nomesDisciplinas,
        nomesProfessores,
        diasSemana,
        periodosPorDia,
        turno,
        config,
        porPagina: densidadeTurmaEfetiva,
        colorido: isColorido,
      });
      abrirJanelaImpressaoHtml(`Horários por Turma — ${turno.toUpperCase()}`, html, { pbLaser: !isColorido });
      return;
    }

    if (densidadeProfEfetiva >= 4) {
      const html = gerarHtmlMosaicoProfessores({
        profIds: targetProfIds,
        gradePorProfessor: resultado.grade_por_professor,
        nomesTurmas,
        nomesDisciplinas,
        nomesProfessores,
        diasSemana,
        periodosPorDia,
        turno,
        config,
        porPagina: densidadeProfEfetiva,
        colorido: isColorido,
      });
      abrirJanelaImpressaoHtml(`Relatório de Professores em Lote — ${turno.toUpperCase()}`, html, {
        pbLaser: !isColorido,
      });
      return;
    }

    const html = gerarHtmlHorarioPorProfessor({
      profIds: targetProfIds,
      gradePorProfessor: resultado.grade_por_professor,
      nomesTurmas,
      nomesDisciplinas,
      nomesProfessores,
      diasSemana,
      periodosPorDia,
      turno,
      config,
      porPagina: densidadeProfEfetiva,
      colorido: isColorido,
    });
    abrirJanelaImpressaoHtml(`Horários Docentes — ${turno.toUpperCase()}`, html, { pbLaser: !isColorido });
  }

  function handleBaixarPdfVetorial() {
    baixarPdfVetorialOficial({
      modoRelatorio,
      turmaIds: modoRelatorio === "por_turma" ? targetTurmaIds : turmasOrdenadas,
      profIds: targetProfIds,
      gradePorTurma: resultado.grade_por_turma,
      gradePorProfessor: resultado.grade_por_professor,
      nomesTurmas,
      nomesDisciplinas,
      nomesProfessores,
      diasSemana,
      periodosPorDia,
      turno,
      config,
      densidadeProfessor: densidadeProfEfetiva,
      densidadeTurma: densidadeTurmaEfetiva,
      colorido: isColorido,
    });
  }

  const OPCOES_RELATORIO = [
    {
      id: "por_professor",
      icone: "👨‍🏫",
      titulo: "Relatório de Professores (Lote Compacto Mosaico ou Individual)",
      desc: "Imprima todos os docentes em mosaico compacto (10 ou 8 por folha A4), comunicado duplo com recibo (2/folha) ou ficha individual.",
    },
    {
      id: "por_turma",
      icone: "🏫",
      titulo: "Horário Oficial por Turma (Porta de Sala ou Caderno em Lote)",
      desc: "Cartaz A4 completo com legenda docente para afixar em sala ou mosaico compacto (6 ou 4 turmas por folha).",
    },
    {
      id: "quadro_geral",
      icone: "📋",
      titulo: "Quadro Geral Panorâmico (Mural da Sala dos Professores)",
      desc: "Matriz consolidada cruzando todas as turmas e horários reais do turno em visão global.",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15, 23, 42, 0.68)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
        fontFamily: "'Montserrat', sans-serif",
      }}
      onClick={onFechar}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 690,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 25px 55px -12px rgba(15, 23, 42, 0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Premium */}
        <div
          style={{
            padding: "16px 24px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 25 }}>🖨️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800 }}>
                Central Oficial de Impressão e Exportação PDF
              </h3>
              <span style={{ fontSize: 11.5, color: "#bfdbfe", fontWeight: 600 }}>
                Turno {turno.toUpperCase()} · Vigência {temporal.vigenciaLabel} · Estimativa:{" "}
                <strong style={{ color: "#fff" }}>
                  {estimativaPaginas} folha{estimativaPaginas === 1 ? "" : "s"} A4
                </strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            style={{
              background: "rgba(255,255,255,0.16)",
              border: "none",
              color: "#fff",
              width: 32,
              height: 32,
              borderRadius: "50%",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Status de Sincronização dos Horários Reais (Governança) */}
        <div
          style={{
            padding: "9px 24px",
            background: temporal.possuiHorariosReais ? "#f0fdf4" : "#fffbeb",
            borderBottom: `1px solid ${temporal.possuiHorariosReais ? "#bbf7d0" : "#fde68a"}`,
            fontSize: 11.5,
            color: temporal.possuiHorariosReais ? "#166534" : "#92400e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            fontWeight: 600,
          }}
        >
          {temporal.possuiHorariosReais ? (
            <span>
              🕒 Horários reais sincronizados de <strong>Direção &gt; Governança</strong> (ex.:{" "}
              {temporal.periodos[0]?.inicio}–{temporal.periodos[0]?.fim}
              {temporal.intervaloApos > 0 ? ` · Intervalo após ${temporal.intervaloApos}ª aula` : ""})
            </span>
          ) : (
            <span>
              ℹ️ Exibindo numeração de aulas (1ª a {periodosPorDia}ª). Cadastre os horários HH:MM em{" "}
              <strong>Direção &gt; Governança</strong> para exibir no relógio.
            </span>
          )}
        </div>

        {/* Corpo Rolável */}
        <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 11.5,
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              marginBottom: 8,
            }}
          >
            1. Tipo de Documento Oficial:
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {OPCOES_RELATORIO.map((op) => {
              const ativo = modoRelatorio === op.id;
              return (
                <div
                  key={op.id}
                  onClick={() => setModoRelatorio(op.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: ativo ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: ativo ? "#eff6ff" : "#f8fafc",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 22, lineHeight: 1.1 }}>{op.icone}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: ativo ? "#1e3a8a" : "#1e293b" }}>
                      {op.titulo}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.35 }}>
                      {op.desc}
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={ativo}
                    onChange={() => setModoRelatorio(op.id)}
                    style={{ accentColor: "#2563eb", marginTop: 3 }}
                  />
                </div>
              );
            })}
          </div>

          {/* Configurações de Escopo e Densidade — MODO PROFESSOR */}
          {modoRelatorio === "por_professor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: "#475569",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  2. Selecionar Docentes:
                </label>
                <select
                  value={profSelecionado}
                  onChange={(e) => setProfSelecionado(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0f172a",
                    background: "#fff",
                  }}
                >
                  <option value="TODOS">
                    Em Lote — Todos os Professores do Turno ({professoresOrdenados.length} docentes)
                  </option>
                  {professoresOrdenados.map((pId) => (
                    <option key={pId} value={pId}>
                      Individual — {nomesProfessores[pId] || `Professor ${pId}`}
                    </option>
                  ))}
                </select>
              </div>

              {profSelecionado === "TODOS" && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: "#475569",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    3. Formato do Lote (Aproveitamento de Papel A4):
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {[
                      {
                        val: 10,
                        titulo: "10 por folha (Mosaico 2×5)",
                        sub: `Ultra-compacto c/ siglas · ${Math.max(1, Math.ceil(professoresOrdenados.length / 10))} pág.`,
                      },
                      {
                        val: 8,
                        titulo: "8 por folha (Mosaico 2×4)",
                        sub: `Compacto amplo · ${Math.max(1, Math.ceil(professoresOrdenados.length / 8))} pág.`,
                      },
                      {
                        val: 2,
                        titulo: "2 por folha c/ Assinatura",
                        sub: `Meia-folha destacável · ${Math.max(1, Math.ceil(professoresOrdenados.length / 2))} pág.`,
                      },
                      {
                        val: 1,
                        titulo: "1 por folha (A4 Inteira)",
                        sub: `Ficha individual completa · ${professoresOrdenados.length} pág.`,
                      },
                    ].map((opt) => {
                      const sel = densidadeProfessor === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setDensidadeProfessor(opt.val)}
                          style={{
                            textAlign: "left",
                            padding: "9px 12px",
                            borderRadius: 10,
                            border: sel ? "2px solid #2563eb" : "1px solid #cbd5e1",
                            background: sel ? "#eff6ff" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: sel ? "#1e3a8a" : "#0f172a" }}>
                            {opt.titulo}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{opt.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configurações de Escopo e Densidade — MODO TURMA */}
          {modoRelatorio === "por_turma" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: "#475569",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  2. Selecionar Turmas:
                </label>
                <select
                  value={turmaSelecionada}
                  onChange={(e) => setTurmaSelecionada(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0f172a",
                    background: "#fff",
                  }}
                >
                  <option value="TODAS">
                    Em Lote — Todas as Turmas do Turno ({turmasOrdenadas.length} turmas)
                  </option>
                  {turmasOrdenadas.map((tId) => (
                    <option key={tId} value={tId}>
                      Individual — {nomesTurmas[tId] || `Turma ${tId}`}
                    </option>
                  ))}
                </select>
              </div>

              {turmaSelecionada === "TODAS" && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: "#475569",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    3. Formato de Impressão das Turmas:
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {[
                      { val: 1, titulo: "1 por folha (Porta)", sub: `${turmasOrdenadas.length} pág. c/ legenda` },
                      { val: 4, titulo: "4 por folha (2×2)", sub: `${Math.max(1, Math.ceil(turmasOrdenadas.length / 4))} pág. compacto` },
                      { val: 6, titulo: "6 por folha (2×3)", sub: `${Math.max(1, Math.ceil(turmasOrdenadas.length / 6))} pág. caderno` },
                    ].map((opt) => {
                      const sel = densidadeTurma === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setDensidadeTurma(opt.val)}
                          style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: sel ? "2px solid #2563eb" : "1px solid #cbd5e1",
                            background: sel ? "#eff6ff" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 800, color: sel ? "#1e3a8a" : "#0f172a" }}>
                            {opt.titulo}
                          </div>
                          <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{opt.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Acabamento Gráfico (Colorido vs Laser P&B) + Filtro de Grades Vazias */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: "#475569" }}>ACABAMENTO:</span>
              <button
                type="button"
                onClick={() => setTemaCores("colorido")}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: temaCores === "colorido" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                  background: temaCores === "colorido" ? "#dbeafe" : "#fff",
                  color: temaCores === "colorido" ? "#1e3a8a" : "#475569",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🎨 Executivo Colorido
              </button>
              <button
                type="button"
                onClick={() => setTemaCores("pb_laser")}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: temaCores === "pb_laser" ? "1.5px solid #0f172a" : "1px solid #cbd5e1",
                  background: temaCores === "pb_laser" ? "#e2e8f0" : "#fff",
                  color: "#0f172a",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🖨️ P&amp;B Laser (Economia de Toner)
              </button>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={apenasComAulas}
                onChange={(e) => setApenasComAulas(e.target.checked)}
                style={{ accentColor: "#2563eb" }}
              />
              Ocultar grades vazias
            </label>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onFechar}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleVisualizarImprimir}
              style={{
                padding: "9px 16px",
                borderRadius: 8,
                border: "1px solid #1e3a8a",
                background: "#eff6ff",
                color: "#1e3a8a",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🖨️ Visualizar e Imprimir
            </button>

            <button
              type="button"
              onClick={handleBaixarPdfVetorial}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.25)",
              }}
            >
              📥 Baixar PDF Oficial ({estimativaPaginas} {estimativaPaginas === 1 ? "folha" : "folhas"})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
