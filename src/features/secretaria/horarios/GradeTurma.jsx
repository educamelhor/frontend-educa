// ==================================================================================
// frontend/src/features/secretaria/horarios/GradeTurma.jsx
// Renderiza a grade por turma com nomes amigáveis, rótulo compacto, cor por disciplina
// (estilo Urânia) e suporte completo a Edição Interativa (Click-to-Swap / Move / Lock).
// ==================================================================================

import React from "react";
import GradeBase from "./GradeBase.jsx";

export default function GradeTurma({
  turma,
  resultado,
  periodosPorDia,
  maps = {},
  layoutMode,
  interativo = false,
  selecao = null,
  avaliarDestino = null,
  onCellClick = null,
  onToggleLock = null,
}) {
  const dadosTurma = resultado?.grade_por_turma?.[turma.id] || {};
  const disciplinaById = maps.disciplinaById || {};
  const professorById = maps.professorById || {};

  function getSlot(dia, ordem) {
    const d = dadosTurma?.[dia] || dadosTurma?.[String(dia)];
    const o = dadosTurma?.[ordem] || dadosTurma?.[String(ordem)];
    const a = d?.[ordem] || d?.[String(ordem)];
    if (a) return a;
    const b = o?.[dia] || o?.[String(dia)];
    return b || null;
  }

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

  function profCompacto(nome) {
    const n = sansAccent(String(nome || ""));
    if (!n) return "";
    const p = n.split(" ");
    return p[0].toUpperCase();
  }

  const PALETA = [
    { bg: "bg-indigo-50",  text: "text-indigo-800",  ring: "ring-indigo-200" },
    { bg: "bg-amber-50",   text: "text-amber-800",   ring: "ring-amber-200" },
    { bg: "bg-emerald-50", text: "text-emerald-800", ring: "ring-emerald-200" },
    { bg: "bg-sky-50",     text: "text-sky-800",     ring: "ring-sky-200" },
    { bg: "bg-rose-50",    text: "text-rose-800",    ring: "ring-rose-200" },
    { bg: "bg-violet-50",  text: "text-violet-800",  ring: "ring-violet-200" },
    { bg: "bg-lime-50",    text: "text-lime-800",    ring: "ring-lime-200" },
    { bg: "bg-orange-50",  text: "text-orange-800",  ring: "ring-orange-200" },
    { bg: "bg-cyan-50",    text: "text-cyan-800",    ring: "ring-cyan-200" },
    { bg: "bg-fuchsia-50", text: "text-fuchsia-800", ring: "ring-fuchsia-200" },
  ];

  function corDisciplina(discId) {
    const i = Math.abs(Number(discId) || 0) % PALETA.length;
    return PALETA[i];
  }

  const selecaoNestaTurma =
    interativo && selecao && Number(selecao.turmaId) === Number(turma.id);

  const celulaRender = ({ dia, ordem }) => {
    const slot = getSlot(dia, ordem);
    const aval =
      selecaoNestaTurma && typeof avaliarDestino === "function"
        ? avaliarDestino(turma.id, dia, ordem)
        : null;

    // 1) Caso de célula vazia
    if (!slot) {
      if (selecaoNestaTurma && aval) {
        if (aval.status === "livre") {
          return (
            <div
              onClick={() => onCellClick && onCellClick({ turmaId: turma.id, dia, ordem, slot: null })}
              title={aval.motivo || "Clique para mover a aula selecionada para este horário livre"}
              className="rounded-xl px-2 py-2.5 text-center border-2 border-dashed border-emerald-500 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100 cursor-pointer transition-all shadow-sm"
            >
              <div className="text-[11px] font-bold leading-tight">🟢 Mover cá</div>
              <div className="text-[10px] opacity-80 leading-tight">Horário livre</div>
            </div>
          );
        }
        if (aval.status === "aviso") {
          return (
            <div
              onClick={() => onCellClick && onCellClick({ turmaId: turma.id, dia, ordem, slot: null })}
              title={aval.motivo || "Mover com ressalva de preferência"}
              className="rounded-xl px-2 py-2.5 text-center border-2 border-dashed border-amber-500 bg-amber-50/90 text-amber-800 hover:bg-amber-100 cursor-pointer transition-all shadow-sm"
            >
              <div className="text-[11px] font-bold leading-tight">🟡 Mover cá</div>
              <div className="text-[10px] opacity-80 leading-tight">{aval.label || "Evitar"}</div>
            </div>
          );
        }
        if (aval.status === "bloqueado" || aval.status === "indisponivel") {
          return (
            <div
              onClick={() => onCellClick && onCellClick({ turmaId: turma.id, dia, ordem, slot: null })}
              title={aval.motivo || "Horário indisponível ou com choque de professor"}
              className="rounded-xl px-2 py-2.5 text-center border border-dashed border-red-300 bg-red-50/60 text-red-700 cursor-not-allowed opacity-75"
            >
              <div className="text-[11px] font-bold leading-tight">🚫 {aval.label || "Choque"}</div>
              <div className="text-[9px] truncate opacity-85 leading-tight">{aval.resumoCurto || "Indisponível"}</div>
            </div>
          );
        }
      }

      return <div className="text-gray-300 text-xs py-2 text-center select-none">—</div>;
    }

    // 2) Célula ocupada
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
    const isLocked = Boolean(slot.locked);

    // Estilo interativo quando há seleção ativa nesta turma
    let extraClasses = interativo
      ? "cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all group"
      : "";
    let statusBadge = null;
    let tooltipText = `${discNome} — ${profNome}${isLocked ? " (Fixado 📌)" : ""}`;

    if (selecaoNestaTurma && aval) {
      if (aval.status === "origem") {
        extraClasses =
          "cursor-pointer ring-2 ring-blue-600 bg-blue-100 text-blue-950 shadow-md scale-[1.02] transition-all";
        statusBadge = (
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-200/80 rounded px-1 mb-0.5 inline-block">
            🎯 Selecionada
          </div>
        );
        tooltipText = "Clique novamente para cancelar a seleção";
      } else if (aval.status === "livre") {
        extraClasses =
          "cursor-pointer ring-2 ring-emerald-500 hover:bg-emerald-50/90 transition-all shadow-sm";
        statusBadge = (
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-200/80 rounded px-1 mb-0.5 inline-block">
            🟢 ⇄ Trocar
          </div>
        );
        tooltipText = aval.motivo || `Trocar com ${discNome} (${profNome})`;
      } else if (aval.status === "aviso") {
        extraClasses =
          "cursor-pointer ring-2 ring-amber-500 hover:bg-amber-50/90 transition-all shadow-sm";
        statusBadge = (
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/80 rounded px-1 mb-0.5 inline-block">
            🟡 ⇄ {aval.label || "Ressalva"}
          </div>
        );
        tooltipText = aval.motivo || `Trocar com ressalva: ${discNome} (${profNome})`;
      } else if (aval.status === "bloqueado" || aval.status === "indisponivel") {
        extraClasses = "cursor-not-allowed ring-1 ring-red-300 opacity-60 transition-all";
        statusBadge = (
          <div className="text-[9px] font-bold uppercase tracking-wider text-red-800 bg-red-200/80 rounded px-1 mb-0.5 inline-block">
            🚫 {aval.label || "Conflito"}
          </div>
        );
        tooltipText = aval.motivo || "Troca bloqueada por conflito de professor ou indisponibilidade";
      }
    } else if (interativo) {
      tooltipText += " — Clique para mover ou trocar de horário";
    }

    return (
      <div
        onClick={() => onCellClick && onCellClick({ turmaId: turma.id, dia, ordem, slot })}
        className={`relative rounded-xl px-2 py-1.5 text-center ${bg} ${text} ${isLocked ? "ring-2 ring-amber-500/90 shadow-sm" : `ring-1 ${ring}`} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] ${extraClasses}`}
        title={tooltipText}
      >
        {/* Botão de fixar/desafixar rápido (badge / alfinete) */}
        {(isLocked || (interativo && !selecaoNestaTurma)) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleLock) onToggleLock({ turmaId: turma.id, dia, ordem, slot });
            }}
            style={
              isLocked
                ? {
                    position: "absolute",
                    top: -6,
                    right: -4,
                    fontSize: 9,
                    fontWeight: 800,
                    lineHeight: 1,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "#fff",
                    border: "1.5px solid #fff",
                    borderRadius: 999,
                    padding: "2px 5px",
                    boxShadow: "0 2px 4px rgba(217, 119, 6, 0.35)",
                    cursor: interativo ? "pointer" : "default",
                    zIndex: 5,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                    letterSpacing: "0.02em",
                  }
                : {
                    position: "absolute",
                    top: 2,
                    right: 3,
                    fontSize: 10,
                    lineHeight: 1,
                    background: "rgba(255,255,255,0.75)",
                    borderRadius: 999,
                    border: "none",
                    padding: "2px 4px",
                    cursor: interativo ? "pointer" : "default",
                  }
            }
            className={isLocked ? "opacity-100 hover:brightness-110 transition-all" : "opacity-0 group-hover:opacity-75 hover:!opacity-100 transition-opacity"}
            title={
              isLocked
                ? "Aula FIXADA (Horário Manual). Não sofre alterações ao gerar novo horário. Clique para desafixar."
                : "Clique no alfinete para FIXAR (travar) esta aula neste horário."
            }
          >
            {isLocked ? "📌 FIXO" : "📌"}
          </button>
        )}

        {statusBadge}
        <div className="text-sm font-semibold leading-tight">{cod}</div>
        <div className="text-[11px] opacity-80 leading-tight">{profShort}</div>
      </div>
    );
  };

  const diasDinamicos = Object.keys(periodosPorDia || {})
    .map(Number)
    .filter((n) => n >= 1 && n <= 6)
    .sort((a, b) => a - b);

  return (
    <GradeBase
      titulo={`Grade da Turma ${turma.nome}`}
      periodosPorDia={periodosPorDia}
      celulaRender={celulaRender}
      dias={diasDinamicos.length > 0 ? diasDinamicos : [1, 2, 3, 4, 5]}
      layout={layoutMode}
    />
  );
}
