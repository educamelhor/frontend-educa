/**
 * chamadaPdf.js
 * ------------------------------------------------------------
 * Utilitários 100% no navegador para a folha "Chamada para foto" do EDUCADF:
 *   1) lerFolhaEducaDF(): lê o PDF original (texto + vetores) e devolve turma,
 *      disciplina, colunas (data/aula/horário), alunos e a posição exata das bolhas;
 *   2) gerarPdfPreenchido(): desenha as marcas POR CIMA do PDF original (QR, código,
 *      marcas de canto e layout permanecem idênticos aos emitidos pelo EDUCADF);
 *   3) renderizarPagina(): rasteriza uma página (pré-visualização / PNG em alta resolução).
 *
 * Regras da folha: bolha marcada = faltou; em branco = presente; a coluna só é
 * importada pelo EDUCADF se a bolha "DEI ESTA AULA" (última linha) estiver marcada.
 * ------------------------------------------------------------
 */
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import { PDFDocument, rgb } from "pdf-lib";

const OPS = pdfjsLib.OPS;

// ---------- álgebra de matrizes (CTM do PDF) ----------
const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Agrupa valores numéricos próximos (tolerância em pt) e devolve o centro de cada grupo. */
function agrupar(valores, tol = 1.5) {
  const v = [...valores].sort((a, b) => a - b);
  const grupos = [];
  for (const n of v) {
    const g = grupos[grupos.length - 1];
    if (g && Math.abs(n - g[g.length - 1]) <= tol) g.push(n);
    else grupos.push([n]);
  }
  return grupos.map((g) => g.reduce((s, n) => s + n, 0) / g.length);
}

/** Junta fragmentos de texto da mesma linha e muito próximos (ex.: "1ª", "·", "08:45"). */
function mesclarTextos(itens) {
  const lista = itens
    .filter((i) => i.str && i.str.trim() !== "")
    .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width }))
    .sort((a, b) => (Math.abs(b.y - a.y) > 1.2 ? b.y - a.y : a.x - b.x));
  const out = [];
  for (const it of lista) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.y - it.y) <= 1.2 && it.x - (prev.x + prev.w) < 4) {
      const gap = it.x - (prev.x + prev.w) > 1 ? " " : "";
      prev.str = prev.str + gap + it.str;
      prev.w = it.x + it.w - prev.x;
    } else {
      out.push({ ...it });
    }
  }
  return out.map((o) => ({ ...o, str: o.str.replace(/\s+/g, " ").trim(), xc: o.x + o.w / 2 }));
}

async function lerPagina(page) {
  // ---- vetores: bolhas (círculos) e marcas de canto (quadrados) ----
  const ol = await page.getOperatorList();
  let ctm = [1, 0, 0, 1, 0, 0];
  const pilha = [];
  const circulos = [];
  const quadrados = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i];
    const args = ol.argsArray[i];
    if (fn === OPS.save) pilha.push(ctm.slice());
    else if (fn === OPS.restore) ctm = pilha.pop() || ctm;
    else if (fn === OPS.transform) ctm = mul(args, ctm);
    else if (fn === OPS.constructPath) {
      const [ops, coords] = args;
      let ci = 0;
      let curvas = 0;
      let retangulo = false;
      const pts = [];
      for (const op of ops) {
        if (op === OPS.moveTo || op === OPS.lineTo) { pts.push(apply(ctm, coords[ci], coords[ci + 1])); ci += 2; }
        else if (op === OPS.curveTo) { curvas++; for (let k = 0; k < 6; k += 2) pts.push(apply(ctm, coords[ci + k], coords[ci + k + 1])); ci += 6; }
        else if (op === OPS.rectangle) {
          retangulo = true;
          const [x, y, w, h] = [coords[ci], coords[ci + 1], coords[ci + 2], coords[ci + 3]];
          pts.push(apply(ctm, x, y), apply(ctm, x + w, y + h));
          ci += 4;
        } else if (op === OPS.curveTo2 || op === OPS.curveTo3) { curvas++; ci += 4; }
      }
      if (!pts.length) continue;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
      const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      if (curvas >= 4 && Math.abs(w - h) < 0.6 && w > 6 && w < 20) circulos.push({ cx, cy, d: w });
      else if (retangulo && Math.abs(w - h) < 1 && w > 10 && w < 30) quadrados.push({ cx, cy, w });
    }
  }
  if (circulos.length < 12) throw new Error("Não encontrei as bolhas da folha. O PDF parece não ser uma folha de chamada do EDUCADF.");

  const cxs = agrupar(circulos.map((c) => c.cx));
  const cys = agrupar(circulos.map((c) => c.cy)).sort((a, b) => b - a); // topo → base
  const diametro = circulos.reduce((s, c) => s + c.d, 0) / circulos.length;

  // ---- texto ----
  const tc = await page.getTextContent();
  const textos = mesclarTextos(tc.items);
  const todo = textos.map((t) => t.str).join(" ");

  const codigo = (todo.match(/DP1\*[\w*]+/) || [])[0] || null;
  const periodoM = todo.match(/(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/);
  const folhaM = todo.match(/FOLHA\s+(\d+)\s+DE\s+(\d+)/i);

  // título (maior fonte do topo): "8º Ano - A · ARTES"
  const tituloItem = tc.items
    .filter((i) => i.str && i.str.includes("·") && i.transform[3] > 11)
    .sort((a, b) => b.transform[3] - a.transform[3])[0];
  const titulo = tituloItem ? tituloItem.str.trim() : (textos.find((t) => /·/.test(t.str) && !/^\d/.test(t.str)) || {}).str || "";
  const escola = (textos.find((t) => /CENTRO|ESCOLA|COL[ÉE]GIO/i.test(t.str)) || {}).str || "";

  // ---- cabeçalho das colunas (datas e aulas) ----
  const passo = cxs.length > 1 ? cxs[1] - cxs[0] : 34.5;
  const topo = cys[0];
  const faixa = textos.filter((t) => t.y > topo + 3 && t.y < topo + 40 && t.xc > cxs[0] - passo / 2);
  const datas = faixa.filter((t) => /^\d{2}\/\d{2}$/.test(t.str));
  const aulas = faixa
    .map((t) => ({ ...t, m: t.str.match(/^(?:(\d+)\s*ª\s*·\s*)?(\d{2}:\d{2})$/) }))
    .filter((t) => t.m);

  const colunas = cxs.map((cx, col) => {
    const d = datas.map((t) => ({ t, dist: Math.abs(t.xc - cx) })).sort((a, b) => a.dist - b.dist)[0];
    const dataBr = d && d.dist <= passo * 0.8 ? d.t.str : null;
    const a = aulas.map((t) => ({ t, dist: Math.abs(t.xc - cx) })).sort((x, y) => x.dist - y.dist)[0];
    const aula = a && a.dist <= passo * 0.5 ? a.t.m : null;
    return {
      col,
      cx,
      dataBr,
      ordem: aula && aula[1] ? Number(aula[1]) : null,
      horario: aula ? aula[2] : null,
      semAula: !dataBr,
    };
  });

  // ---- alunos (coluna esquerda); as bolhas ficam alinhadas ao TOPO de cada linha ----
  const limiteNome = cxs[0] - passo / 2;
  const topoLinha = cys.map((y) => y + 7.3);
  const nomes = textos.filter((t) => t.x < limiteNome && t.y < topoLinha[0] + 1 && t.y > cys[cys.length - 1] - 22);
  const linhas = cys.map(() => []);
  for (const t of nomes) {
    const yc = t.y + 3;
    let idx = -1;
    for (let r = 0; r < cys.length; r++) {
      const sup = topoLinha[r];
      const inf = r + 1 < cys.length ? topoLinha[r + 1] : cys[r] - 22;
      if (yc <= sup + 0.5 && yc > inf) { idx = r; break; }
    }
    if (idx >= 0) linhas[idx].push(t);
  }
  const rotulos = linhas.map((l) => l.sort((a, b) => b.y - a.y).map((t) => t.str).join(" ").replace(/\s+/g, " ").trim());
  const deiIdx = rotulos.findIndex((r) => /^DEI ESTA AULA/i.test(r));
  const idxDei = deiIdx >= 0 ? deiIdx : cys.length - 1;
  const alunos = [];
  rotulos.forEach((r, linha) => {
    if (linha === idxDei) return;
    const m = r.match(/^(\d+)\s*·\s*(.+)$/);
    if (m) alunos.push({ linha, nr: Number(m[1]), nome: m[2].trim() });
  });

  return {
    codigo,
    folhaIdx: folhaM ? Number(folhaM[1]) : null,
    folhaTotal: folhaM ? Number(folhaM[2]) : null,
    periodoBr: periodoM ? [periodoM[1], periodoM[2]] : null,
    titulo,
    escola,
    colunas,
    cys,
    idxDei,
    alunos,
    diametro,
    cantos: quadrados.length,
    avisos: circulos.length !== cxs.length * cys.length ? [`Bolhas lidas (${circulos.length}) diferem da grade ${cxs.length}×${cys.length}.`] : [],
  };
}

const toIso = (dm, ini, fim) => {
  // dm = "dd/mm"; ano vem do período (suporta virada de ano)
  const [d, m] = dm.split("/").map(Number);
  const [di, mi, ai] = ini.split("/").map(Number);
  const [, mf, af] = fim.split("/").map(Number);
  let ano = ai;
  if (af !== ai && m < mi) ano = af;
  if (af === ai && mf < m) ano = ai; // improvável; mantém o ano inicial
  return `${ano}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/**
 * Lê o PDF do EDUCADF (1+ páginas) e devolve o "modelo" usado pela tela.
 * @param {File} arquivo
 */
export async function lerFolhaEducaDF(arquivo) {
  const buf = await arquivo.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;

  const folhas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const f = await lerPagina(page);
    folhas.push({ pageIndex: p - 1, ...f });
  }

  const grupos = [...new Set(folhas.map((f) => (f.codigo ? f.codigo.split("*").slice(0, 3).join("*") : "?")))];
  if (grupos.length > 1) {
    throw new Error("O PDF reúne folhas de turmas/disciplinas diferentes. Envie um arquivo por turma e disciplina.");
  }

  const base = folhas[0];
  const [ini, fim] = base.periodoBr || [null, null];
  const [turma, disciplina] = (base.titulo || "").split("·").map((s) => s.trim());

  // mapa horário → ordem da aula (aprendido nas colunas que trazem "1ª · 08:45")
  const mapaOrdem = new Map();
  folhas.forEach((f) => f.colunas.forEach((c) => { if (c.ordem && c.horario) mapaOrdem.set(c.horario, c.ordem); }));

  const avisos = folhas.flatMap((f, i) => f.avisos.map((a) => `Folha ${i + 1}: ${a}`));
  const colunas = [];
  folhas.forEach((f) => {
    f.colunas.forEach((c) => {
      const data = c.dataBr && ini ? toIso(c.dataBr, ini, fim) : null;
      const ordem = c.ordem || (c.horario ? mapaOrdem.get(c.horario) || null : null);
      const col = { ...c, ordem, data, pageIndex: f.pageIndex, key: `${f.pageIndex}:${c.col}` };
      colunas.push(col);
    });
  });

  // todas as folhas devem trazer os mesmos alunos
  folhas.forEach((f, i) => {
    if (i > 0 && f.alunos.map((a) => a.nr).join(",") !== base.alunos.map((a) => a.nr).join(",")) {
      avisos.push(`Folha ${i + 1} tem lista de alunos diferente da folha 1.`);
    }
  });
  if (!base.alunos.length) avisos.push("Não consegui ler a lista de alunos.");

  return {
    arquivoNome: arquivo.name,
    bytes,
    titulo: base.titulo,
    turma: turma || "",
    disciplina: disciplina || "",
    escola: base.escola,
    periodo: { ini, fim },
    grupo: grupos[0],
    alunos: base.alunos,
    folhas,
    colunas,
    avisos,
  };
}

/**
 * Desenha as marcas sobre o PDF ORIGINAL.
 * @param modelo     retorno de lerFolhaEducaDF
 * @param faltas     { [colKey]: number[] }  (índices de LINHA da folha)
 * @param confirmadas Set<colKey>            colunas com "DEI ESTA AULA"
 * @returns Uint8Array do PDF gerado
 */
export async function gerarPdfPreenchido(modelo, faltas, confirmadas, { raio = 4.5, cor = [0.05, 0.05, 0.07], estilo = "x" } = {}) {
  const doc = await PDFDocument.load(modelo.bytes.slice(0), { ignoreEncryption: true });
  const paginas = doc.getPages();
  const cor3 = rgb(...cor);
  // "cheio": bolha preenchida | "x": dois traços cruzados (marca de caneta)
  const marcar = (pg, x, y) => {
    if (estilo === "x") {
      const d = 3.4;
      pg.drawLine({ start: { x: x - d, y: y - d }, end: { x: x + d, y: y + d }, thickness: 1.5, color: cor3 });
      pg.drawLine({ start: { x: x - d, y: y + d }, end: { x: x + d, y: y - d }, thickness: 1.5, color: cor3 });
    } else {
      pg.drawCircle({ x, y, size: raio, color: cor3 });
    }
  };
  for (const f of modelo.folhas) {
    const pg = paginas[f.pageIndex];
    for (const c of modelo.colunas.filter((x) => x.pageIndex === f.pageIndex)) {
      if (c.semAula || !confirmadas.has(c.key)) continue; // só colunas confirmadas entram
      for (const linha of faltas[c.key] || []) marcar(pg, c.cx, f.cys[linha]);
      marcar(pg, c.cx, f.cys[f.idxDei]);
    }
  }
  return await doc.save();
}

/** Rasteriza uma página do PDF (gerado ou original). dpi=72 equivale a 1 px por pt. */
export async function renderizarPagina(bytes, pageIndex, dpi = 110) {
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: dpi / 72 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
