// src/features/secretaria/horarios/ExportarHorarioModal.jsx
// ============================================================================
// Central de Exportação e Impressão Oficial de Horários (Padrão Urânia)
// Suporta 3 Relatórios Oficiais + Impressão Direta HD + Download PDF (jsPDF):
//   1) 📋 Quadro Geral do Turno (Matriz Mural Completa: Turmas × Dias/Aulas)
//   2) 🏫 Horário por Turma (Com Legenda de Disciplinas/Professores e Carga Semanal)
//   3) 👨‍🏫 Horário por Professor (Com Resumo de Turmas/Aulas e Linha de Assinatura)
// ============================================================================
import React, { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DIAS_LABEL = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

const DIAS_CURTO = {
  1: "SEG",
  2: "TER",
  3: "QUA",
  4: "QUI",
  5: "SEX",
  6: "SÁB",
};

const PALETA_PRINT = [
  { bg: "#eef2ff", text: "#1e1b4b", border: "#c7d2fe" },
  { bg: "#fffbeb", text: "#78350f", border: "#fde68a" },
  { bg: "#ecfdf5", text: "#064e3b", border: "#a7f3d0" },
  { bg: "#f0f9ff", text: "#0c4a6e", border: "#bae6fd" },
  { bg: "#fff1f2", text: "#881337", border: "#fecdd3" },
  { bg: "#f5f3ff", text: "#4c1d95", border: "#ddd6fe" },
  { bg: "#f7fee7", text: "#365314", border: "#d9f99d" },
  { bg: "#fff7ed", text: "#7c2d12", border: "#fed7aa" },
  { bg: "#ecfeff", text: "#164e63", border: "#a5f3fc" },
  { bg: "#fdf4ff", text: "#701a75", border: "#f5d0fe" },
];

function corPorDisciplina(discId) {
  const idx = Math.abs(Number(discId) || 0) % PALETA_PRINT.length;
  return PALETA_PRINT[idx];
}

function sansAccent(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function siglaDisciplina(nome) {
  const n = sansAccent(nome);
  if (!n) return "—";
  const palavras = n.split(" ").filter(Boolean);
  const compostas = ["EDUCACAO", "ED.", "ED", "CIENCIAS", "CIENCIA", "L. PORTUGUESA", "LINGUA"];
  const ehComposta =
    palavras.length >= 2 &&
    (compostas.includes(palavras[0].toUpperCase()) || palavras[0].length <= 2);
  if (ehComposta) {
    const iniciais = palavras
      .filter((w) => w.length > 1 && !["DE", "DA", "DO", "E"].includes(w.toLowerCase()))
      .map((w) => w[0].toUpperCase())
      .join("");
    return iniciais.slice(0, 5);
  }
  const base = palavras[0].toUpperCase();
  return base.length <= 4 ? base : base.slice(0, 4);
}

export function primeiroNomeProf(nome) {
  const n = String(nome || "").trim();
  if (!n) return "—";
  const partes = n.split(/\s+/);
  if (partes.length === 1) return partes[0].toUpperCase();
  return `${partes[0].toUpperCase()} ${partes[1][0].toUpperCase()}.`;
}

function obterNomeEscola() {
  try {
    const nome =
      localStorage.getItem("escola_nome") ||
      localStorage.getItem("nome_escola") ||
      JSON.parse(localStorage.getItem("user") || "{}")?.escola_nome;
    if (nome && String(nome).trim()) return String(nome).trim().toUpperCase();
  } catch {}
  return "UNIDADE ESCOLAR — SISTEMA EDUCA.MELHOR";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================================
// Gerador de Janela de Impressão de Alta Definição (HTML + CSS @media print)
// ============================================================================
function abrirJanelaImpressaoHtml(tituloJanela, bodyHtml) {
  const win = window.open("", "_blank", "width=1200,height=850");
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
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      background: #f1f5f9;
    }
    .no-print-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #1e3a8a;
      color: #fff;
      padding: 12px 20px;
      border-radius: 10px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .no-print-bar button {
      background: #22c55e;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .page-sheet {
      background: #fff;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      page-break-after: always;
      break-after: page;
    }
    .page-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .doc-header-left h1 {
      margin: 0;
      font-size: 15px;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .doc-header-left p {
      margin: 2px 0 0;
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .doc-header-right {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
    }
    table.grade-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.grade-table th,
    table.grade-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 4px;
      text-align: center;
      vertical-align: middle;
    }
    table.grade-table th {
      background: #1e3a8a;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .intervalo-row td {
      background: #f1f5f9 !important;
      color: #64748b !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 2px;
      padding: 3px !important;
    }
    .slot-box {
      border-radius: 6px;
      padding: 4px 3px;
      line-height: 1.2;
    }
    .slot-title {
      font-size: 12px;
      font-weight: 800;
    }
    .slot-sub {
      font-size: 10px;
      font-weight: 600;
      opacity: 0.88;
      margin-top: 1px;
    }
    .legend-box {
      margin-top: 10px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 10px;
      color: #334155;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .sign-row {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #475569;
    }
    .sign-line {
      width: 240px;
      border-top: 1px solid #64748b;
      text-align: center;
      padding-top: 4px;
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
        box-shadow: none;
        padding: 0;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>🖨️ Visualização Oficial de Impressão — ${escapeHtml(tituloJanela)}</strong>
      <span style="font-size:12px; opacity:0.85; margin-left:12px;">
        Dica: Na janela de impressão, escolha a impressora ou "Salvar como PDF" (Orientação: Paisagem).
      </span>
    </div>
    <button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  </div>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ============================================================================
// Builders HTML para os 3 Modelos (Quadro Geral, Por Turma, Por Professor)
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
  escolaNome = obterNomeEscola(),
}) {
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const isNoturno = String(turno).toLowerCase().includes("noturno");
  const intervaloApos = isNoturno ? 2 : 3;

  const sheets = turmaIds.map((tId) => {
    const nomeTurma = nomesTurmas[tId] || `Turma ${tId}`;
    const grade = gradePorTurma?.[tId] || {};
    const resumoDisc = new Map();
    let totalAulasTurma = 0;

    let rowsHtml = "";
    for (let ord = 1; ord <= periodosPorDia; ord++) {
      let cellsHtml = `<td style="font-weight:800; font-size:11px; background:#f8fafc; color:#1e3a8a; width:64px;">${ord}ª AULA</td>`;
      for (const dia of diasSemana) {
        const slot = grade?.[dia]?.[ord] || null;
        if (!slot || !slot.disciplina_id) {
          cellsHtml += `<td style="color:#cbd5e1; font-size:11px;">—</td>`;
        } else {
          totalAulasTurma++;
          const dId = slot.disciplina_id;
          const pId = slot.professor_id;
          const dNome = nomesDisciplinas[dId] || `Disc ${dId}`;
          const pNome = nomesProfessores[pId] || `Prof ${pId}`;
          const sigla = siglaDisciplina(dNome);
          const pCurto = primeiroNomeProf(pNome);
          const cor = corPorDisciplina(dId);

          const k = `${dId}|${pId}`;
          const prev = resumoDisc.get(k) || { sigla, dNome, pNome, qtd: 0, cor };
          prev.qtd++;
          resumoDisc.set(k, prev);

          cellsHtml += `<td>
            <div class="slot-box" style="background:${cor.bg}; color:${cor.text}; border:1px solid ${cor.border};">
              <div class="slot-title">${escapeHtml(dNome)}</div>
              <div class="slot-sub">${escapeHtml(pCurto)}</div>
            </div>
          </td>`;
        }
      }
      rowsHtml += `<tr>${cellsHtml}</tr>`;

      if (ord === intervaloApos && ord < periodosPorDia) {
        rowsHtml += `<tr class="intervalo-row"><td colspan="${diasSemana.length + 1}">☕ INTERVALO / RECREIO</td></tr>`;
      }
    }

    const legendaHtml = Array.from(resumoDisc.values())
      .sort((a, b) => a.dNome.localeCompare(b.dNome, "pt-BR"))
      .map(
        (item) =>
          `<span class="legend-item">
            <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${item.cor.bg};border:1px solid ${item.cor.border};"></span>
            <strong>${escapeHtml(item.sigla)}:</strong> ${escapeHtml(item.dNome)} — ${escapeHtml(item.pNome)} (${item.qtd}a)
          </span>`
      )
      .join("");

    return `<div class="page-sheet">
      <div class="doc-header">
        <div class="doc-header-left">
          <h1>${escapeHtml(escolaNome)}</h1>
          <p>HORÁRIO OFICIAL DE AULAS • TURNO: ${escapeHtml(String(turno).toUpperCase())} • ANO LETIVO ${new Date().getFullYear()}</p>
        </div>
        <div class="doc-header-right">
          <div class="doc-badge">🏫 ${escapeHtml(String(nomeTurma).toUpperCase().includes("TURMA") ? nomeTurma : `TURMA ${nomeTurma}`)}</div>
          <div style="font-size:10px; color:#64748b; margin-top:3px;">Total: ${totalAulasTurma} aulas semanais • Emissão: ${dataEmissao}</div>
        </div>
      </div>

      <table class="grade-table">
        <thead>
          <tr>
            <th style="width:64px;">AULA</th>
            ${diasSemana.map((d) => `<th>${escapeHtml(DIAS_LABEL[d] || `Dia ${d}`)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="legend-box">
        <strong style="color:#1e3a8a;">LEGENDA DE DISCIPLINAS E PROFESSORES:</strong>
        ${legendaHtml || "<span>Nenhuma aula alocada.</span>"}
      </div>
    </div>`;
  });

  return sheets.join("\n");
}

export function gerarHtmlHorarioPorProfessor({
  profIds,
  gradePorProfessor,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  escolaNome = obterNomeEscola(),
}) {
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const isNoturno = String(turno).toLowerCase().includes("noturno");
  const intervaloApos = isNoturno ? 2 : 3;

  const sheets = profIds.map((pId) => {
    const nomeProf = nomesProfessores[pId] || `Professor ${pId}`;
    const grade = gradePorProfessor?.[pId] || {};
    const resumoTurmas = new Map();
    let totalAulasProf = 0;

    let rowsHtml = "";
    for (let ord = 1; ord <= periodosPorDia; ord++) {
      let cellsHtml = `<td style="font-weight:800; font-size:11px; background:#f8fafc; color:#1e3a8a; width:64px;">${ord}ª AULA</td>`;
      for (const dia of diasSemana) {
        const slot = grade?.[dia]?.[ord] || null;
        if (!slot || !slot.turma_id) {
          cellsHtml += `<td style="color:#cbd5e1; font-size:11px;">—</td>`;
        } else {
          totalAulasProf++;
          const tId = slot.turma_id;
          const dId = slot.disciplina_id;
          const tNome = nomesTurmas[tId] || `Turma ${tId}`;
          const dNome = nomesDisciplinas[dId] || `Disc ${dId}`;
          const cor = corPorDisciplina(dId);

          const k = `${tId}|${dId}`;
          const prev = resumoTurmas.get(k) || { tNome, dNome, qtd: 0, cor };
          prev.qtd++;
          resumoTurmas.set(k, prev);

          cellsHtml += `<td>
            <div class="slot-box" style="background:${cor.bg}; color:${cor.text}; border:1px solid ${cor.border};">
              <div class="slot-title">${escapeHtml(tNome)}</div>
              <div class="slot-sub">${escapeHtml(dNome)}</div>
            </div>
          </td>`;
        }
      }
      rowsHtml += `<tr>${cellsHtml}</tr>`;

      if (ord === intervaloApos && ord < periodosPorDia) {
        rowsHtml += `<tr class="intervalo-row"><td colspan="${diasSemana.length + 1}">☕ INTERVALO / RECREIO</td></tr>`;
      }
    }

    const resumoHtml = Array.from(resumoTurmas.values())
      .sort((a, b) => a.tNome.localeCompare(b.tNome, "pt-BR", { numeric: true }))
      .map(
        (item) =>
          `<span class="legend-item">
            <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${item.cor.bg};border:1px solid ${item.cor.border};"></span>
            <strong>${escapeHtml(item.tNome)}:</strong> ${escapeHtml(item.dNome)} (${item.qtd} aula${item.qtd > 1 ? "s" : ""})
          </span>`
      )
      .join("");

    return `<div class="page-sheet">
      <div class="doc-header">
        <div class="doc-header-left">
          <h1>${escapeHtml(escolaNome)}</h1>
          <p>COMUNICADO INDIVIDUAL DE HORÁRIO DOCENTE • TURNO: ${escapeHtml(String(turno).toUpperCase())} • ANO LETIVO ${new Date().getFullYear()}</p>
        </div>
        <div class="doc-header-right">
          <div class="doc-badge">👨‍🏫 PROF(A). ${escapeHtml(nomeProf)}</div>
          <div style="font-size:10px; color:#64748b; margin-top:3px;">Carga Alocada no Turno: <strong>${totalAulasProf} aulas semanais</strong> • Emissão: ${dataEmissao}</div>
        </div>
      </div>

      <table class="grade-table">
        <thead>
          <tr>
            <th style="width:64px;">AULA</th>
            ${diasSemana.map((d) => `<th>${escapeHtml(DIAS_LABEL[d] || `Dia ${d}`)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="legend-box">
        <strong style="color:#1e3a8a;">RESUMO DE TURMAS E DISCIPLINAS (${totalAulasProf} AULAS):</strong>
        ${resumoHtml || "<span>Nenhuma aula alocada neste turno.</span>"}
      </div>

      <div class="sign-row">
        <div class="sign-line">Ciência do(a) Professor(a): ${escapeHtml(nomeProf)}</div>
        <div class="sign-line">Coordenação Pedagógica / Direção</div>
        <div>Data: ____/____/${new Date().getFullYear()}</div>
      </div>
    </div>`;
  });

  return sheets.join("\n");
}

export function gerarHtmlQuadroGeralMural({
  turmaIds,
  gradePorTurma,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana = [1, 2, 3, 4, 5],
  periodosPorDia = 6,
  turno = "matutino",
  escolaNome = obterNomeEscola(),
}) {
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  // Cabeçalho duplo: Linha 1 = Dias da Semana (colspan = periodosPorDia), Linha 2 = 1ª..Nª aula
  const headerDias = diasSemana
    .map((d) => `<th colspan="${periodosPorDia}" style="font-size:10px; padding:3px; border-left:2px solid #93c5fd;">${escapeHtml(DIAS_LABEL[d] || `Dia ${d}`)}</th>`)
    .join("");

  const headerPeriodos = diasSemana
    .map(() =>
      Array.from({ length: periodosPorDia }, (_, i) => `<th style="font-size:8px; padding:2px; background:#334155;">${i + 1}ª</th>`).join("")
    )
    .join("");

  const rowsHtml = turmaIds
    .map((tId) => {
      const nomeTurma = nomesTurmas[tId] || `Turma ${tId}`;
      const grade = gradePorTurma?.[tId] || {};
      let cells = `<td style="font-weight:800; font-size:9px; background:#f8fafc; color:#0f172a; text-align:left; padding:3px 5px; white-space:nowrap;">${escapeHtml(nomeTurma)}</td>`;

      for (const dia of diasSemana) {
        for (let ord = 1; ord <= periodosPorDia; ord++) {
          const slot = grade?.[dia]?.[ord] || null;
          const borderLeft = ord === 1 ? "border-left:2px solid #94a3b8;" : "";
          if (!slot || !slot.disciplina_id) {
            cells += `<td style="font-size:8px; color:#cbd5e1; padding:2px; ${borderLeft}">—</td>`;
          } else {
            const dId = slot.disciplina_id;
            const pId = slot.professor_id;
            const sigla = siglaDisciplina(nomesDisciplinas[dId] || "");
            const pCurto = String(nomesProfessores[pId] || "").trim().split(/\s+/)[0]?.slice(0, 6).toUpperCase() || "";
            const cor = corPorDisciplina(dId);
            cells += `<td style="padding:1px; background:${cor.bg}; color:${cor.text}; ${borderLeft}">
              <div style="font-size:8px; font-weight:800; line-height:1.05;">${escapeHtml(sigla)}</div>
              <div style="font-size:7px; opacity:0.85; line-height:1.05;">${escapeHtml(pCurto)}</div>
            </td>`;
          }
        }
      }
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div class="page-sheet">
    <div class="doc-header" style="margin-bottom:8px; padding-bottom:6px;">
      <div class="doc-header-left">
        <h1 style="font-size:13px;">${escapeHtml(escolaNome)} — QUADRO GERAL DE HORÁRIOS (MURAL DA COORDENAÇÃO)</h1>
        <p style="font-size:10px;">TURNO: ${escapeHtml(String(turno).toUpperCase())} • ${turmaIds.length} TURMAS • EMISSÃO: ${dataEmissao}</p>
      </div>
      <div class="doc-header-right">
        <div class="doc-badge" style="font-size:11px;">📋 VISÃO GLOBAL DO TURNO</div>
      </div>
    </div>

    <table class="grade-table" style="table-layout:auto;">
      <thead>
        <tr>
          <th rowspan="2" style="width:76px; font-size:9px;">TURMA</th>
          ${headerDias}
        </tr>
        <tr>
          ${headerPeriodos}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>`;
}

// ============================================================================
// Helpers de Acionamento Rápido (1 Clique por Card de Turma ou Professor)
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
  });
  abrirJanelaImpressaoHtml(`Horário — ${nome} (${turno})`, html);
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
  });
  abrirJanelaImpressaoHtml(`Horário Docente — ${nome} (${turno})`, html);
}

// ============================================================================
// Download Direto de Arquivo PDF via jsPDF + autoTable
// ============================================================================
function baixarPdfDireto({
  modoRelatorio,
  turmaIds,
  profIds,
  gradePorTurma,
  gradePorProfessor,
  nomesTurmas,
  nomesDisciplinas,
  nomesProfessores,
  diasSemana,
  periodosPorDia,
  turno,
}) {
  const escolaNome = obterNomeEscola();
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  if (modoRelatorio === "quadro_geral") {
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text(`${escolaNome} — QUADRO GERAL DO TURNO (${String(turno).toUpperCase()})`, 10, 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emissão: ${dataEmissao} • Total de Turmas: ${turmaIds.length}`, 10, 17);

    const headRow = ["TURMA"];
    for (const d of diasSemana) {
      for (let o = 1; o <= periodosPorDia; o++) {
        headRow.push(`${DIAS_CURTO[d] || d}\n${o}ª`);
      }
    }

    const bodyRows = turmaIds.map((tId) => {
      const row = [nomesTurmas[tId] || `Turma ${tId}`];
      const grade = gradePorTurma?.[tId] || {};
      for (const d of diasSemana) {
        for (let o = 1; o <= periodosPorDia; o++) {
          const slot = grade?.[d]?.[o];
          if (!slot || !slot.disciplina_id) {
            row.push("—");
          } else {
            const sigla = siglaDisciplina(nomesDisciplinas[slot.disciplina_id] || "");
            const prof = String(nomesProfessores[slot.professor_id] || "").trim().split(/\s+/)[0]?.slice(0, 6).toUpperCase() || "";
            row.push(`${sigla}\n${prof}`);
          }
        }
      }
      return row;
    });

    autoTable(doc, {
      startY: 20,
      head: [headRow],
      body: bodyRows,
      styles: { fontSize: 6.2, cellPadding: 1.2, halign: "center", valign: "middle" },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { fontStyle: "bold", halign: "left", cellWidth: 22 } },
      margin: { left: 8, right: 8 },
    });

    doc.save(`Quadro_Geral_${turno}.pdf`);
    return;
  }

  if (modoRelatorio === "por_turma") {
    turmaIds.forEach((tId, idx) => {
      if (idx > 0) doc.addPage();
      const nomeTurma = nomesTurmas[tId] || `Turma ${tId}`;
      const grade = gradePorTurma?.[tId] || {};

      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text(`${escolaNome}`, 14, 15);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`HORÁRIO DA TURMA: ${nomeTurma} — TURNO: ${String(turno).toUpperCase()}`, 14, 22);
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Ano Letivo ${new Date().getFullYear()} • Emissão: ${dataEmissao}`, 14, 27);

      const head = [["AULA", ...diasSemana.map((d) => DIAS_LABEL[d] || `Dia ${d}`)]];
      const body = [];
      const legendaSet = new Map();

      for (let o = 1; o <= periodosPorDia; o++) {
        const row = [`${o}ª AULA`];
        for (const d of diasSemana) {
          const slot = grade?.[d]?.[o];
          if (!slot || !slot.disciplina_id) {
            row.push("—");
          } else {
            const dNome = nomesDisciplinas[slot.disciplina_id] || `Disc ${slot.disciplina_id}`;
            const pNome = nomesProfessores[slot.professor_id] || `Prof ${slot.professor_id}`;
            row.push(`${dNome}\n(${primeiroNomeProf(pNome)})`);
            const k = `${slot.disciplina_id}|${slot.professor_id}`;
            const prev = legendaSet.get(k) || { dNome, pNome, qtd: 0 };
            prev.qtd++;
            legendaSet.set(k, prev);
          }
        }
        body.push(row);
      }

      autoTable(doc, {
        startY: 32,
        head,
        body,
        styles: { fontSize: 9.5, cellPadding: 4, halign: "center", valign: "middle" },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 26 } },
        margin: { left: 14, right: 14 },
      });

      const finalY = (doc.lastAutoTable?.finalY || 140) + 8;
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text("Disciplinas e Professores da Turma:", 14, finalY);
      doc.setTextColor(51, 65, 85);
      const legText = Array.from(legendaSet.values())
        .map((x) => `${x.dNome}: ${x.pNome} (${x.qtd}a)`)
        .join("   |   ");
      const splitLeg = doc.splitTextToSize(legText || "—", 268);
      doc.text(splitLeg, 14, finalY + 5);
    });

    doc.save(`Horarios_Turmas_${turno}.pdf`);
    return;
  }

  // Modo: por_professor
  profIds.forEach((pId, idx) => {
    if (idx > 0) doc.addPage();
    const nomeProf = nomesProfessores[pId] || `Professor ${pId}`;
    const grade = gradePorProfessor?.[pId] || {};

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text(`${escolaNome}`, 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`HORÁRIO INDIVIDUAL DOCENTE: ${nomeProf} — TURNO: ${String(turno).toUpperCase()}`, 14, 22);
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Ano Letivo ${new Date().getFullYear()} • Emissão: ${dataEmissao}`, 14, 27);

    const head = [["AULA", ...diasSemana.map((d) => DIAS_LABEL[d] || `Dia ${d}`)]];
    const body = [];
    const resumoSet = new Map();
    let totalAulas = 0;

    for (let o = 1; o <= periodosPorDia; o++) {
      const row = [`${o}ª AULA`];
      for (const d of diasSemana) {
        const slot = grade?.[d]?.[o];
        if (!slot || !slot.turma_id) {
          row.push("—");
        } else {
          totalAulas++;
          const tNome = nomesTurmas[slot.turma_id] || `Turma ${slot.turma_id}`;
          const dNome = nomesDisciplinas[slot.disciplina_id] || `Disc ${slot.disciplina_id}`;
          row.push(`${tNome}\n${dNome}`);
          const k = `${slot.turma_id}|${slot.disciplina_id}`;
          const prev = resumoSet.get(k) || { tNome, dNome, qtd: 0 };
          prev.qtd++;
          resumoSet.set(k, prev);
        }
      }
      body.push(row);
    }

    autoTable(doc, {
      startY: 32,
      head,
      body,
      styles: { fontSize: 9.5, cellPadding: 4, halign: "center", valign: "middle" },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 26 } },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc.lastAutoTable?.finalY || 140) + 8;
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(`Resumo (${totalAulas} aulas semanais):`, 14, finalY);
    doc.setTextColor(51, 65, 85);
    const resText = Array.from(resumoSet.values())
      .map((x) => `${x.tNome} — ${x.dNome} (${x.qtd}a)`)
      .join("   |   ");
    const splitRes = doc.splitTextToSize(resText || "—", 268);
    doc.text(splitRes, 14, finalY + 5);
  });

  doc.save(`Horarios_Professores_${turno}.pdf`);
}

// ============================================================================
// Componente Modal Principal de Exportação e Impressão
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
}) {
  const [modoRelatorio, setModoRelatorio] = useState("quadro_geral"); // "quadro_geral" | "por_turma" | "por_professor"
  const [turmaSelecionada, setTurmaSelecionada] = useState("TODAS");
  const [profSelecionado, setProfSelecionado] = useState("TODOS");

  const turmasOrdenadas = useMemo(() => {
    const ids = Object.keys(resultado?.grade_por_turma || {}).map(Number);
    return ids.sort((a, b) => {
      const nA = String(nomesTurmas[a] || a).toUpperCase();
      const nB = String(nomesTurmas[b] || b).toUpperCase();
      return nA.localeCompare(nB, "pt-BR", { numeric: true });
    });
  }, [resultado, nomesTurmas]);

  const professoresOrdenados = useMemo(() => {
    const ids = Object.keys(resultado?.grade_por_professor || {}).map(Number);
    return ids.sort((a, b) => {
      const nA = String(nomesProfessores[a] || a).toUpperCase();
      const nB = String(nomesProfessores[b] || b).toUpperCase();
      return nA.localeCompare(nB, "pt-BR", { numeric: true });
    });
  }, [resultado, nomesProfessores]);

  if (!aberto || !resultado) return null;

  const targetTurmaIds =
    turmaSelecionada === "TODAS" ? turmasOrdenadas : [Number(turmaSelecionada)];
  const targetProfIds =
    profSelecionado === "TODOS" ? professoresOrdenados : [Number(profSelecionado)];

  function handleImprimirColorido() {
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
      });
      abrirJanelaImpressaoHtml(`Quadro Geral — ${turno.toUpperCase()}`, html);
    } else if (modoRelatorio === "por_turma") {
      const html = gerarHtmlHorarioPorTurma({
        turmaIds: targetTurmaIds,
        gradePorTurma: resultado.grade_por_turma,
        nomesTurmas,
        nomesDisciplinas,
        nomesProfessores,
        diasSemana,
        periodosPorDia,
        turno,
      });
      abrirJanelaImpressaoHtml(`Horários por Turma — ${turno.toUpperCase()}`, html);
    } else {
      const html = gerarHtmlHorarioPorProfessor({
        profIds: targetProfIds,
        gradePorProfessor: resultado.grade_por_professor,
        nomesTurmas,
        nomesDisciplinas,
        nomesProfessores,
        diasSemana,
        periodosPorDia,
        turno,
      });
      abrirJanelaImpressaoHtml(`Horários por Professor — ${turno.toUpperCase()}`, html);
    }
  }

  function handleBaixarPdf() {
    baixarPdfDireto({
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
    });
  }

  const OPCOES_RELATORIO = [
    {
      id: "quadro_geral",
      icone: "📋",
      titulo: "Quadro Geral do Turno (Mural da Coordenação)",
      desc: "Matriz consolidada com todas as turmas nas linhas e todos os dias/aulas nas colunas em 1 folha paisagem.",
    },
    {
      id: "por_turma",
      icone: "🏫",
      titulo: "Horário Oficial por Turma (Porta de Sala / Alunos)",
      desc: "1 folha A4 Paisagem por turma com disciplinas coloridas, professores, intervalo e legenda completa no rodapé.",
    },
    {
      id: "por_professor",
      icone: "👨‍🏫",
      titulo: "Horário Individual por Professor (Comunicado Docente)",
      desc: "Agenda semanal de cada professor indicando a turma em cada aula, resumo de carga horária e campo de assinatura.",
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
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
        fontFamily: "'Montserrat', sans-serif",
      }}
      onClick={onFechar}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 620,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>🖨️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                Central de Impressão e Exportação PDF
              </h3>
              <span style={{ fontSize: 12, opacity: 0.88 }}>
                Turno {turno.toUpperCase()} • Padrão Oficial de Relatórios Escolares
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "none",
              color: "#fff",
              width: 32,
              height: 32,
              borderRadius: "50%",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div style={{ padding: "22px 24px" }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            1. Escolha o Modelo de Relatório:
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
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
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: ativo ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: ativo ? "#eff6ff" : "#f8fafc",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 24, lineHeight: 1.1 }}>{op.icone}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: ativo ? "#1e3a8a" : "#1e293b" }}>
                      {op.titulo}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>
                      {op.desc}
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={ativo}
                    onChange={() => setModoRelatorio(op.id)}
                    style={{ accentColor: "#2563eb", marginTop: 4 }}
                  />
                </div>
              );
            })}
          </div>

          {/* Filtro específico por Turma */}
          {modoRelatorio === "por_turma" && (
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                2. Filtrar Turma:
              </label>
              <select
                value={turmaSelecionada}
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1e293b",
                }}
              >
                <option value="TODAS">
                  📚 Todas as Turmas do Turno ({turmasOrdenadas.length} páginas)
                </option>
                {turmasOrdenadas.map((tId) => (
                  <option key={tId} value={tId}>
                    🏫 {nomesTurmas[tId] || `Turma ${tId}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro específico por Professor */}
          {modoRelatorio === "por_professor" && (
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                2. Filtrar Professor(a):
              </label>
              <select
                value={profSelecionado}
                onChange={(e) => setProfSelecionado(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1e293b",
                }}
              >
                <option value="TODOS">
                  👨‍🏫 Todos os Professores do Turno ({professoresOrdenados.length} páginas)
                </option>
                {professoresOrdenados.map((pId) => (
                  <option key={pId} value={pId}>
                    👨‍🏫 {nomesProfessores[pId] || `Professor ${pId}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div
          style={{
            padding: "16px 24px",
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
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleBaixarPdf}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "1px solid #2563eb",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📥 Baixar PDF Direto
            </button>

            <button
              type="button"
              onClick={handleImprimirColorido}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                background: "#1e3a8a",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 10px rgba(30, 58, 138, 0.25)",
              }}
            >
              🖨️ Imprimir Colorido (Alta Definição)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
