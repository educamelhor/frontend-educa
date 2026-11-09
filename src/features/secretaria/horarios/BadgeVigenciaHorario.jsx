// src/features/secretaria/horarios/BadgeVigenciaHorario.jsx
// ============================================================================
// Badge e Utilitários de Vigência Acadêmica (Semestre / Ano Letivo Atual)
// Garante indicação visual clara e filtragem consistente do semestre vigente
// em todas as abas de Secretaria > Horários (Disponibilidade, Diagnóstico,
// Gerar Horário e Horário Manual).
// ============================================================================
import React from "react";

export function resolverVigenciaFrontend(config = null) {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1; // 1..12
  const anoPadrao = mes === 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const semPadrao = mes === 1 || mes >= 7 ? 2 : 1;
  const bimPadrao =
    mes === 1 ? 4 : mes <= 4 ? 1 : mes <= 6 ? 2 : mes <= 9 ? 3 : 4;

  const v = config?.vigencia || null;
  const anoLetivo = Number(v?.ano_letivo || config?.ano_letivo || anoPadrao);
  const semestreAtual = Number(
    v?.semestre_referencia || v?.semestre_atual || config?.semestre_atual || semPadrao
  );
  const bimestreAtual = Number(v?.bimestre_atual || bimPadrao);

  return {
    ano_letivo: anoLetivo,
    semestre_atual: semestreAtual === 2 ? 2 : 1,
    bimestre_atual: bimestreAtual,
    possui_semestral: Boolean(v?.possui_semestral),
    possui_anual: Boolean(v?.possui_anual),
    regime_predominante: v?.regime_predominante || "anual",
    periodo_semestre: v?.periodo_semestre || null,
    periodo_bimestre: v?.periodo_bimestre || null,
    label_curto: `${semestreAtual === 2 ? 2 : 1}º Semestre / ${anoLetivo}`,
    label_completo: `${semestreAtual === 2 ? 2 : 1}º Semestre / ${anoLetivo} • Cargas e Turmas Vigentes`,
  };
}

/**
 * Filtra os vínculos de um professor para o turno e semestre vigentes
 * (mantém vínculos anuais `semestre = 0/null` e vínculos do semestre ativo).
 */
export function filtrarVinculosVigentesNoTurno(vinculos = [], turno = "", semestreAtual = 2) {
  if (!Array.isArray(vinculos) || vinculos.length === 0) return [];
  const tAlvo = String(turno || "").trim().toLowerCase();
  const semAlvo = Number(semestreAtual) === 2 ? 2 : 1;

  const doTurno = vinculos.filter(
    (v) => !tAlvo || String(v?.turno || "").trim().toLowerCase() === tAlvo
  );
  if (doTurno.length === 0) return [];

  const doSemestre = doTurno.filter((v) => {
    const s = Number(v?.semestre ?? 0);
    return !s || s === 0 || s === semAlvo;
  });

  return doSemestre;
}

/**
 * Filtra a lista de professores ativos para o turno e semestre vigentes.
 * Se a escola possuir vínculos semestrais, exibe apenas professores com vínculo
 * Anual (0) ou no Semestre Vigente (1 ou 2), ocultando vínculos exclusivos de semestre encerrado.
 */
export function filtrarProfessoresVigentesNoTurno(lista = [], turno = "", semestreAtual = 2) {
  if (!Array.isArray(lista) || lista.length === 0) return [];
  const tAlvo = String(turno || "").trim().toLowerCase();
  const semAlvo = Number(semestreAtual) === 2 ? 2 : 1;

  const ativosTurno = lista.filter((p) => {
    if (String(p?.status || "ativo").toLowerCase() === "inativo") return false;
    const vinculos = Array.isArray(p?.vinculos) ? p.vinculos : [];
    if (vinculos.length > 0) {
      return vinculos.some(
        (v) => String(v?.turno || "").trim().toLowerCase() === tAlvo
      );
    }
    return String(p?.turno || "").trim().toLowerCase() === tAlvo;
  });

  // Filtra pelo semestre ativo (anual = 0 ou semestre === semAlvo)
  const ativosSemestre = ativosTurno
    .map((p) => {
      const vinculos = Array.isArray(p?.vinculos) ? p.vinculos : [];
      if (vinculos.length === 0) return p;
      const vincVigentes = filtrarVinculosVigentesNoTurno(vinculos, tAlvo, semAlvo);
      if (vincVigentes.length === 0) return null;
      return {
        ...p,
        vinculos_vigentes: vincVigentes,
      };
    })
    .filter(Boolean);

  // Fallback defensivo: caso nenhuma linha case com o semestre (ex.: escola legada), retorna ativosTurno
  return ativosSemestre.length > 0 ? ativosSemestre : ativosTurno;
}

export default function BadgeVigenciaHorario({
  config = null,
  variant = "inline", // "inline" | "shell"
  showSubtext = true,
}) {
  const vig = resolverVigenciaFrontend(config);
  const is2Sem = vig.semestre_atual === 2;

  const tooltipText = `Horário vinculado automaticamente às turmas, cargas horárias e modulação do ${vig.semestre_atual}º Semestre letivo de ${vig.ano_letivo} (${vig.bimestre_atual}º Bimestre vigente).`;

  if (variant === "shell") {
    return (
      <div
        title={tooltipText}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 12px",
          borderRadius: 999,
          background: is2Sem
            ? "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)"
            : "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
          border: is2Sem ? "1px solid #c4b5fd" : "1px solid #6ee7b7",
          color: is2Sem ? "#5b21b6" : "#065f46",
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: is2Sem ? "#7c3aed" : "#10b981",
            boxShadow: is2Sem
              ? "0 0 0 3px rgba(124, 58, 237, 0.18)"
              : "0 0 0 3px rgba(16, 185, 129, 0.18)",
            flexShrink: 0,
          }}
        />
        <span>🗓️ Vigência: {vig.label_curto}</span>
      </div>
    );
  }

  return (
    <div
      title={tooltipText}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        borderRadius: 999,
        background: is2Sem
          ? "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)"
          : "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
        border: is2Sem ? "1.5px solid #c4b5fd" : "1.5px solid #6ee7b7",
        color: is2Sem ? "#5b21b6" : "#065f46",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: is2Sem ? "#7c3aed" : "#10b981",
          boxShadow: is2Sem
            ? "0 0 0 3px rgba(124, 58, 237, 0.2)"
            : "0 0 0 3px rgba(16, 185, 129, 0.2)",
          flexShrink: 0,
        }}
      />
      <span>🗓️ Referência: {vig.label_curto}</span>
      {showSubtext && (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: "1px 7px",
            borderRadius: 999,
            background: is2Sem ? "rgba(124, 58, 237, 0.12)" : "rgba(16, 185, 129, 0.14)",
            color: is2Sem ? "#6d28d9" : "#047857",
          }}
        >
          Cargas e Turmas Vigentes
        </span>
      )}
    </div>
  );
}
