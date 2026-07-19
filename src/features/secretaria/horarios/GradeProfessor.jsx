// ==================================================================================
// frontend/src/features/secretaria/horarios/GradeProfessor.jsx
// Renderiza a grade por professor (mock/real) com nomes amigáveis + rótulo compacto
// e cor por disciplina (estilo Urânia).
// Agora aceita prop `layoutMode` e a repassa para o GradeBase como `layout`.
// ==================================================================================

import React from "react";
import GradeBase from "./GradeBase.jsx";

/**
 * Props
 * - professor: { id, nome }
 * - resultado: { grade_por_professor: { [profId]: { [dia]: { [ordem]: slot } } } }
 *   onde slot contém ao menos: { turma_id, disciplina_id }
 * - periodosPorDia: { [dia]: [{ ordem }] }
 * - maps?: {
 *     disciplinaById?: { [id]: string },
 *     turmaById?: { [id]: string }        // opcional (fallback mostra "Turma {id}")
 *   }
 * - layoutMode?: "dias-linhas" | "dias-colunas"   // visual da malha (default controlado fora)
 */
export default function GradeProfessor({ professor, resultado, periodosPorDia, maps = {}, layoutMode }) {
  const dadosProf = resultado?.grade_por_professor?.[professor.id] || {};
  const disciplinaById = maps.disciplinaById || {};
  const turmaById = maps.turmaById || {};

  // ---------------------------------------------------------------------------
  // Helper: pega o slot funcionando com os dois formatos (dia→ordem ou ordem→dia)
  // ---------------------------------------------------------------------------
  function getSlot(dia, ordem) {
    const d = dadosProf?.[dia] || dadosProf?.[String(dia)];
    const o = dadosProf?.[ordem] || dadosProf?.[String(ordem)];
    const a = d?.[ordem] || d?.[String(ordem)];
    if (a) return a;
    const b = o?.[dia] || o?.[String(dia)];
    return b || null;
  }

  // ---------------------------------------------------------------------------
  // Helpers de rótulo compacto (iguais ao GradeTurma para consistência visual)
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
    const ehComposta =
      palavras.length >= 2 && (compostas.includes(palavras[0].toUpperCase()) || palavras[0].length <= 2);

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

  // Turma: usa nome se houver; senão "Turma {id}"
  function turmaCompacta(nome, id) {
    if (!nome) return id != null ? `Turma ${id}` : "—";
    // O usuário solicitou o nome completo (ex: 8º ANO C) ao invés de abreviado
    return String(nome).toUpperCase();
  }

  // Paleta determinística por disciplina_id (mesma do GradeTurma)
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

    const turmaId = slot.turma_id ?? slot.turma ?? null;
    const discId  = slot.disciplina_id ?? slot.disciplina ?? null;

    const turmaNomeFull =
      (turmaId != null && (turmaById[String(turmaId)] || turmaById[turmaId])) ||
      (turmaId != null ? `Turma ${turmaId}` : "—");

    const discNome =
      (discId != null && (disciplinaById[String(discId)] || disciplinaById[discId])) ||
      (discId != null ? `Disc ${discId}` : "—");

    const turmaShort = turmaCompacta(turmaNomeFull, turmaId);
    const cod = codDisciplina(discNome);
    const { bg, text, ring } = corDisciplina(discId);

    return (
      <div
        className={`rounded-xl px-2 py-1.5 text-center ${bg} ${text} ring-1 ${ring} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]`}
        title={`${turmaNomeFull} — ${discNome}`}
      >
        <div className="text-sm font-semibold leading-tight">{turmaShort}</div>
        <div className="text-[11px] opacity-80 leading-tight">{cod}</div>
      </div>
    );
  };

  return (
    <GradeBase
      titulo={`Agenda do Prof. ${professor.nome || professor.id}`}
      periodosPorDia={periodosPorDia}
      celulaRender={celulaRender}
      dias={[1, 2, 3, 4, 5]}
      layout={layoutMode}  // <<< repassa o modo atual para o GradeBase
    />
  );
}
