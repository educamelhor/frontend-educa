// ==================================================================================
// frontend/src/features/secretaria/horarios/GradeTurma.jsx
// Renderiza a grade por turma (mock/real) com nomes amigáveis + rótulo compacto
// e cor por disciplina (estilo Urânia).
// Agora aceita prop `layoutMode` e a repassa para o GradeBase como `layout`.
// ==================================================================================

import React from "react";
import GradeBase from "./GradeBase.jsx";

/**
 * Props
 * - turma: { id, nome }
 * - resultado: { grade_por_turma: { [turmaId]: { [dia]: { [ordem]: slot } } } }
 *   slot: { disciplina_id, professor_id, ... }
 * - periodosPorDia: { [dia]: [{ ordem }] }
 * - maps?: {
 *     disciplinaById?: { [id]: string },
 *     professorById?: { [id]: string },
 *     turmaById?: { [id]: string } // opcional (não usado aqui, mas mantido p/ simetria)
 *   }
 * - layoutMode?: "dias-linhas" | "dias-colunas"   // visual da malha (default controlado fora)
 */
export default function GradeTurma({ turma, resultado, periodosPorDia, maps = {}, layoutMode }) {
  const dadosTurma = resultado?.grade_por_turma?.[turma.id] || {};
  const disciplinaById = maps.disciplinaById || {};
  const professorById = maps.professorById || {};

  // ---------------------------------------------------------------------------
  // Helpers: acesso ao slot (suporta dia->ordem e ordem->dia)
  // ---------------------------------------------------------------------------
  function getSlot(dia, ordem) {
    const d = dadosTurma?.[dia] || dadosTurma?.[String(dia)];
    const o = dadosTurma?.[ordem] || dadosTurma?.[String(ordem)];
    const a = d?.[ordem] || d?.[String(ordem)];
    if (a) return a;
    const b = o?.[dia] || o?.[String(dia)];
    return b || null;
  }

  // ---------------------------------------------------------------------------
  // Helpers de rótulo compacto
  // ---------------------------------------------------------------------------

  function sansAccent(s) {
    return (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function codDisciplina(nome) {
    const n = sansAccent(String(nome || ""));
    if (!n) return "";
    const palavras = n.split(" ").filter(Boolean);
    const compostas = ["EDUCACAO", "ED.", "ED", "CIENCIAS", "CIENCIA", "L. PORTUGUESA", "LINGUA"];
    const ehComposta = palavras.length >= 2 && (compostas.includes(palavras[0].toUpperCase()) || palavras[0].length <= 2);
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

  function profCompacto(nome) {
    const n = sansAccent(String(nome || ""));
    if (!n) return "";
    const ws = n.split(" ").filter(Boolean);
    if (ws.length === 1) return ws[0].toUpperCase();
    const ultimo = ws[ws.length - 1].toUpperCase();
    if (ultimo.length < 3) {
      return ws.map((w) => w[0]?.toUpperCase()).filter(Boolean).join(".") + ".";
    }
    return ultimo;
  }

  // ---------------------------------------------------------------------------
  // Paleta determinística por disciplina_id (pastéis legíveis no tema)
  // ---------------------------------------------------------------------------
  const PALETA = [
    { bg: "bg-indigo-50",   text: "text-indigo-800",   ring: "ring-indigo-200" },
    { bg: "bg-amber-50",    text: "text-amber-800",    ring: "ring-amber-200" },
    { bg: "bg-emerald-50",  text: "text-emerald-800",  ring: "ring-emerald-200" },
    { bg: "bg-sky-50",      text: "text-sky-800",      ring: "ring-sky-200" },
    { bg: "bg-rose-50",     text: "text-rose-800",     ring: "ring-rose-200" },
    { bg: "bg-violet-50",   text: "text-violet-800",   ring: "ring-violet-200" },
    { bg: "bg-lime-50",     text: "text-lime-800",     ring: "ring-lime-200" },
    { bg: "bg-orange-50",   text: "text-orange-800",   ring: "ring-orange-200" },
    { bg: "bg-cyan-50",     text: "text-cyan-800",     ring: "ring-cyan-200" },
    { bg: "bg-fuchsia-50",  text: "text-fuchsia-800",  ring: "ring-fuchsia-200" },
  ];
  function corDisciplina(discId) {
    const i = Math.abs(Number(discId) || 0) % PALETA.length;
    return PALETA[i];
  }

  // ---------------------------------------------------------------------------
  // Renderização da célula (compacta + colorida)
  // ---------------------------------------------------------------------------
  const celulaRender = ({ dia, ordem }) => {
    const slot = getSlot(dia, ordem);
    if (!slot) return <div className="text-gray-300 text-xs">—</div>;

    const discId = slot.disciplina_id ?? slot.disciplina ?? null;
    const profId = slot.professor_id ?? slot.professor ?? null;

    const discNome =
      (discId != null && (disciplinaById[String(discId)] || disciplinaById[discId])) ||
      (discId != null ? `Disc ${discId}` : "—");

    const profNome =
      (profId != null && (professorById[String(profId)] || professorById[profId])) ||
      (profId != null ? `Prof. ${profId}` : "—");

    const cod = codDisciplina(discNome);
    const profShort = profCompacto(profNome);
    const { bg, text, ring } = corDisciplina(discId);

    return (
      <div
        className={`rounded-xl px-2 py-1.5 text-center ${bg} ${text} ring-1 ${ring} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]`}
        title={`${discNome} — ${profNome}`}
      >
        <div className="text-sm font-semibold leading-tight">{cod}</div>
        <div className="text-[11px] opacity-80 leading-tight">{profShort}</div>
      </div>
    );
  };

  return (
    <GradeBase
      titulo={`Grade da Turma ${turma.nome}`}
      periodosPorDia={periodosPorDia}
      celulaRender={celulaRender}
      dias={[1, 2, 3, 4, 5]}
      layout={layoutMode}  // <<< repassa o modo atual para o GradeBase
    />
  );
}
