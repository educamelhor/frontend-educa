#!/usr/bin/env node
/**
 * verify-professores-conselho.mjs
 * ================================
 * Script de verificação de integridade do módulo Professores › Conselho.
 *
 * Execute antes de cada push para garantir que nenhum arquivo foi perdido:
 *   node verify-professores-conselho.mjs
 *
 * Retorna exit code 0 se tudo ok, 1 se houver problema.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname);
const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow= (s) => `\x1b[33m${s}\x1b[0m`;
const bold  = (s) => `\x1b[1m${s}\x1b[0m`;

let errors = 0;
let warnings = 0;

function check(label, condition, errorMsg, warnOnly = false) {
  if (condition) {
    console.log(green(`  ✅ ${label}`));
  } else {
    if (warnOnly) {
      console.log(yellow(`  ⚠️  ${label}: ${errorMsg}`));
      warnings++;
    } else {
      console.log(red(`  ❌ ${label}: ${errorMsg}`));
      errors++;
    }
  }
}

console.log(bold("\n🔍 Verificando módulo professores/conselho...\n"));

// ── 1. Arquivos obrigatórios ────────────────────────────────────────────────
console.log(bold("1. Arquivos do módulo:"));
const MODULO = "src/features/professores/conselho";
const REQUIRED_FILES = [
  "ConselhoClasseProfessor.jsx",
  "ModalFichaConselhoClasse.jsx",
  "ModalRelatorioPedagogicoProfessor.jsx",
  "ModalNovaOcorrenciaPedagogicaProfessor.jsx",
  "ModalZoomFotoProfessor.jsx",
  "index.js",
];

for (const file of REQUIRED_FILES) {
  const path = resolve(ROOT, MODULO, file);
  check(file, existsSync(path), `ARQUIVO FALTANDO — ${MODULO}/${file}`);
}

// ── 2. Rota no App.jsx ──────────────────────────────────────────────────────
console.log(bold("\n2. Rota em App.jsx:"));
const appPath = resolve(ROOT, "src/App.jsx");
if (existsSync(appPath)) {
  const appContent = readFileSync(appPath, "utf-8");

  // Verifica import
  check(
    "Import ConselhoClasseProfessor presente",
    appContent.includes("import ConselhoClasseProfessor from"),
    "App.jsx não importa ConselhoClasseProfessor"
  );

  // Verifica rota correta
  const rotaProfessor = appContent.match(/path="\/professores\/conselho"[^/]+\/>/);
  if (rotaProfessor) {
    const rota = rotaProfessor[0];
    check(
      "Rota /professores/conselho usa ConselhoClasseProfessor",
      rota.includes("ConselhoClasseProfessor"),
      `ROTA ERRADA! Usa "${rota}" — deve usar ConselhoClasseProfessor`
    );
    check(
      "Rota /professores/conselho NÃO usa ConselhoClasse incorretamente",
      !rota.includes("<ConselhoClasse />"),
      "ROTA ERRADA! Usa <ConselhoClasse /> — deve ser <ConselhoClasseProfessor />"
    );
  } else {
    check("Rota /professores/conselho encontrada", false, "Rota não encontrada no App.jsx");
  }
} else {
  check("App.jsx existe", false, "Arquivo não encontrado");
}

// ── 3. ConselhoClasseProfessor usa o endpoint correto ──────────────────────
console.log(bold("\n3. Endpoint de turmas:"));
const conselhoProfPath = resolve(ROOT, MODULO, "ConselhoClasseProfessor.jsx");
if (existsSync(conselhoProfPath)) {
  const content = readFileSync(conselhoProfPath, "utf-8");

  check(
    "Usa /professores/me/turmas (endpoint seguro)",
    content.includes("/professores/me/turmas"),
    "NÃO usa /professores/me/turmas — professor vai ver todas as turmas da escola!"
  );

  check(
    "NÃO usa /api/turmas (endpoint inseguro)",
    !content.includes('"/api/turmas"') && !content.includes("'/api/turmas'"),
    "AINDA usa /api/turmas — isso retorna TODAS as turmas da escola!"
  );

  check(
    "Extrai data.turmas da resposta da API",
    content.includes("data?.turmas") || content.includes("data.turmas"),
    "Não extrai data.turmas — API retorna {ok, turmas:[]}, não array direto",
    true
  );
}

// ── 4. Governança: campos proibidos para professor ─────────────────────────
console.log(bold("\n4. Governança (campos proibidos para professor):"));
const modalOcorrPath = resolve(ROOT, MODULO, "ModalNovaOcorrenciaPedagogicaProfessor.jsx");
if (existsSync(modalOcorrPath)) {
  const content = readFileSync(modalOcorrPath, "utf-8");

  check(
    "ModalNovaOcorrencia NÃO expõe campo Descrição visível",
    !content.includes('name="descricao"') && !content.includes("descricao") || content.includes("OCULTO"),
    "Campo descricao pode estar exposto para o professor",
    true
  );

  check(
    "ModalNovaOcorrencia NÃO expõe campo Registro Interno visível",
    !content.includes('name="registroInterno"') || content.includes("OCULTO"),
    "Campo registroInterno pode estar exposto para o professor",
    true
  );
}

// ── Resumo ──────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
if (errors === 0 && warnings === 0) {
  console.log(green(bold("✅ Tudo ok! Módulo íntegro e seguro.\n")));
  process.exit(0);
} else if (errors === 0) {
  console.log(yellow(bold(`⚠️  ${warnings} aviso(s). Verifique antes de fazer push.\n`)));
  process.exit(0);
} else {
  console.log(red(bold(`❌ ${errors} erro(s) crítico(s) encontrado(s)!`)));
  console.log(red("   Corrija antes de fazer push para não bugar a produção.\n"));
  process.exit(1);
}
