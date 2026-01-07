// src/features/secretaria/horarios/ExecutarMock.jsx
// ==================================================================================
// Tela para rodar o mock e visualizar métricas/violações/grades
// - POST /api/grade/run-mock
// - Renderiza GradeTurma e GradeProfessor
// - Fallbacks robustos:
//   • periodosPorDia calculado diretamente das próprias grades recebidas
//   • aceita formatos variados (payload/data/resultado...), priorizando campos prontos
//   • painel "Ver JSON" para depuração
// - Mapas de nomes: disciplinas, professores e turmas
// - NOVO: Alternância de layout (Dias nas COLUNAS ⇄ Dias nas LINHAS) com botão no header
// ==================================================================================

import React, { useEffect, useMemo, useState } from "react";
import GradeTurma from "./GradeTurma.jsx";
import GradeProfessor from "./GradeProfessor.jsx";

/* ============================== NORMALIZADORES =============================== */

function pickRoot(json) {
  if (!json || typeof json !== "object") return json;
  for (const k of ["payload", "data", "resultado", "result", "solucao", "solution"]) {
    if (json[k] && typeof json[k] === "object") return json[k];
  }
  return json;
}

function normalizeResultado(jsonRaw) {
  const src = pickRoot(jsonRaw) || {};
  const out = { ...src };

  out.grade_por_turma =
    out.grade_por_turma || out.gradePorTurma || out.timetable_by_class || null;

  out.grade_por_professor =
    out.grade_por_professor || out.gradePorProfessor || out.timetable_by_teacher || null;

  out.metricas = out.metricas || out.metrics || {};
  out.violacoes = out.violacoes || out.violations || [];

  // Se a API trouxer uma lista de turmas com nomes, guardamos em out.turmas
  if (!out.turmas && Array.isArray(src?.turmas)) out.turmas = src.turmas;

  return out;
}

/* ============================== PERIODOS POR DIA ============================ */

function buildPeriodosPorDiaFromGrades(grade_por_turma, grade_por_professor) {
  const diasSet = new Set();
  const ordensPorDia = new Map();

  const add = (dia, ordem) => {
    if (!Number.isFinite(dia) || dia <= 0) return;
    if (!Number.isFinite(ordem) || ordem <= 0) return;
    diasSet.add(dia);
    if (!ordensPorDia.has(dia)) ordensPorDia.set(dia, new Set());
    ordensPorDia.get(dia).add(ordem);
  };

  if (grade_por_turma && typeof grade_por_turma === "object") {
    for (const turmaId of Object.keys(grade_por_turma)) {
      const porDia = grade_por_turma[turmaId] || {};
      for (const diaStr of Object.keys(porDia)) {
        const dia = Number(diaStr);
        const porOrdem = porDia[diaStr] || {};
        for (const ordemStr of Object.keys(porOrdem)) add(dia, Number(ordemStr));
      }
    }
  }

  if (grade_por_professor && typeof grade_por_professor === "object") {
    for (const profId of Object.keys(grade_por_professor)) {
      const porDia = grade_por_professor[profId] || {};
      for (const diaStr of Object.keys(porDia)) {
        const dia = Number(diaStr);
        const porOrdem = porDia[diaStr] || {};
        for (const ordemStr of Object.keys(porOrdem)) add(dia, Number(ordemStr));
      }
    }
  }

  const out = {};
  let maxOrd = 0;
  for (const dia of Array.from(diasSet).sort((a, b) => a - b)) {
    const ords = Array.from(ordensPorDia.get(dia) || []).sort((a, b) => a - b);
    maxOrd = Math.max(maxOrd, ords[ords.length - 1] || 0);
    out[dia] = ords.map((o) => ({ ordem: o }));
  }

  if (Object.keys(out).length === 0) {
    for (const d of [1, 2, 3, 4, 5]) out[d] = [1, 2, 3, 4, 5, 6].map((o) => ({ ordem: o }));
    return out;
  }
  if (Object.values(out).some((arr) => arr.length === 0)) {
    const useMax = Math.max(maxOrd, 6);
    for (const d of Object.keys(out).map(Number)) {
      if ((out[d] || []).length === 0) out[d] = Array.from({ length: useMax }, (_, i) => ({ ordem: i + 1 }));
    }
  }
  return out;
}

/* ============================== COMPONENTE ================================= */

export default function ExecutarMock() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const [turno, setTurno] = useState("Matutino");
  const [idsStr, setIdsStr] = useState("");

  const [basePorDia, setBasePorDia] = useState({});
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);

  const [showDebug, setShowDebug] = useState(false);
  const [rawJson, setRawJson] = useState(null);

  // NOVO: layout global para as grades (dias-colunas ↔ dias-linhas)
  const [layoutMode, setLayoutMode] = useState("dias-colunas");

  // Mapas de nomes
  const [disciplinaById, setDisciplinaById] = useState({});
  const [professorById, setProfessorById] = useState({});
  const [turmaById, setTurmaById] = useState({});

  // Carrega /api/grade/base (opcional)
  useEffect(() => {
    (async () => {
      try {
        const url = `/api/grade/base?turno=${encodeURIComponent(turno)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json?.dias)) {
          const o = {};
          for (const d of json.dias) o[d.dia] = d.periodos || [];
          setBasePorDia(o);
        } else if (json && typeof json === "object") {
          setBasePorDia(json);
        }
      } catch {}
    })();
  }, [turno, token]);

  function parseIds() {
    return idsStr
      .split(/[,;\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  // Carrega nomes de disciplinas, professores e TURMAS
  async function carregarMapasDeNomes(norm) {
    const promises = [
      fetch("/api/disciplinas", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      fetch("/api/professores", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      fetch("/api/turmas", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
    ];

    const [dRes, pRes, tRes] = await Promise.all(promises);

    try {
      if (dRes?.ok) {
        const lista = await dRes.json();
        const map = {};
        for (const d of lista || [])
          if (d?.id != null) map[String(d.id)] = d?.nome ?? d?.disciplina ?? d?.titulo ?? `Disc ${d.id}`;
        setDisciplinaById(map);
      }
    } catch {}

    try {
      if (pRes?.ok) {
        const lista = await pRes.json();
        const map = {};
        for (const p of lista || [])
          if (p?.id != null) map[String(p.id)] = p?.nome ?? p?.professor ?? `Prof. ${p.id}`;
        setProfessorById(map);
      }
    } catch {}

    try {
      if (tRes?.ok) {
        const lista = await tRes.json();
        const map = {};
        for (const t of lista || [])
          if (t?.id != null) map[String(t.id)] = t?.nome ?? t?.turma ?? `Turma ${t.id}`;
        setTurmaById(map);
      } else if (Array.isArray(norm?.turmas)) {
        // fallback se a própria resposta já trouxe as turmas nomeadas
        const map = {};
        for (const t of norm.turmas)
          if (t?.id != null) map[String(t.id)] = t?.nome ?? t?.turma ?? `Turma ${t.id}`;
        setTurmaById(map);
      }
    } catch {}
  }

  async function runMock() {
    try {
      setRodando(true);
      setErro("");
      setResultado(null);
      setRawJson(null);

      const turma_ids = parseIds();
      if (!turno || turma_ids.length === 0) {
        setErro("Informe o turno e pelo menos 1 ID de turma.");
        setRodando(false);
        return;
      }

      const res = await fetch("/api/grade/run-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ turno, turma_ids }),
      });

      const jsonRaw = await res.json();
      setRawJson(jsonRaw);
      if (!res.ok || jsonRaw?.ok === false) throw new Error(jsonRaw?.error || "Falha na execução");

      const norm = normalizeResultado(jsonRaw);
      setResultado(norm);

      const colunas = buildPeriodosPorDiaFromGrades(norm.grade_por_turma, norm.grade_por_professor);
      setBasePorDia(colunas);

      // carrega mapas (inclui TURMAS)
      carregarMapasDeNomes(norm);
    } catch (e) {
      setErro(e.message || "Erro ao rodar mock");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário / Header */}
      <div className="bg-white p-4 rounded-2xl border shadow">
        <h2 className="text-lg font-semibold text-blue-900">Gerar Horário (Mock)</h2>

        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col">
            <span className="text-gray-700 mb-1">Turno</span>
            <select value={turno} onChange={(e) => setTurno(e.target.value)} className="border rounded px-2 py-1">
              <option>Matutino</option>
              <option>Vespertino</option>
              <option>Noturno</option>
            </select>
          </label>
          <label className="flex flex-col md:col-span-2">
            <span className="text-gray-700 mb-1">IDs de Turmas (separados por vírgula)</span>
            <input
              value={idsStr}
              onChange={(e) => setIdsStr(e.target.value)}
              placeholder="ex.: 147 ou 147,148,149"
              className="border rounded px-2 py-1"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={runMock}
            disabled={rodando}
            className={`px-4 py-2 rounded text-white ${rodando ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {rodando ? "Gerando..." : "Gerar Horário (Mock)"}
          </button>

          {/* NOVO: Alternância de layout (afeta GradeTurma e GradeProfessor) */}
          <button
            onClick={() => setLayoutMode((m) => (m === "dias-colunas" ? "dias-linhas" : "dias-colunas"))}
            className="px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            title={
              layoutMode === "dias-colunas"
                ? "Atualmente: Dias nas COLUNAS • Clique para trocar para Dias nas LINHAS"
                : "Atualmente: Dias nas LINHAS • Clique para trocar para Dias nas COLUNAS"
            }
          >
            {layoutMode === "dias-colunas" ? "Layout: Dias nas colunas" : "Layout: Dias nas linhas"}
          </button>

          {erro && <span className="text-red-600 text-sm self-center">{erro}</span>}

          {rawJson && (
            <button
              onClick={() => setShowDebug((v) => !v)}
              className="ml-auto px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {showDebug ? "Esconder JSON" : "Ver JSON"}
            </button>
          )}
        </div>
      </div>

      {/* DEBUG */}
      {showDebug && rawJson && (
        <pre className="bg-slate-900 text-slate-100 text-xs p-3 rounded-xl overflow-auto border border-slate-700">
          {JSON.stringify(rawJson, null, 2)}
        </pre>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border shadow">
            <h3 className="font-semibold text-blue-900 mb-2">Métricas</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-600">Aulas alocadas:</span> <b>{resultado.metricas?.aulas_alocadas ?? 0}</b></div>
              <div><span className="text-gray-600">Aulas demanda:</span> <b>{resultado.metricas?.aulas_demanda ?? 0}</b></div>
              <div><span className="text-gray-600">Cobertura:</span> <b>{Math.round((resultado.metricas?.cobertura ?? 0) * 100)}%</b></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Grades por Turma */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-900">Grades por Turma</h3>
              {Object.keys(resultado.grade_por_turma || {}).length === 0 ? (
                <p className="text-sm text-gray-600">Nenhuma turma encontrada no retorno.</p>
              ) : (
                Object.keys(resultado.grade_por_turma).map((id) => (
                  <GradeTurma
                    key={id}
                    turma={{ id: Number(id), nome: turmaById[String(id)] || `Turma ${id}` }}
                    resultado={resultado}
                    periodosPorDia={basePorDia}
                    maps={{ disciplinaById, professorById, turmaById }}
                    layoutMode={layoutMode}          // <<<<<<<<<<<<<<<<<<<<<<<< repasse do layout
                  />
                ))
              )}
            </div>

            {/* Grades por Professor */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-900">Grades por Professor</h3>
              {Object.keys(resultado.grade_por_professor || {}).length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum professor encontrado no retorno.</p>
              ) : (
                Object.keys(resultado.grade_por_professor).map((id) => (
                  <GradeProfessor
                    key={id}
                    professor={{ id: Number(id), nome: professorById[String(id)] || `Prof. ${id}` }}
                    resultado={resultado}
                    periodosPorDia={basePorDia}
                    maps={{ disciplinaById, turmaById }}
                    layoutMode={layoutMode}          // <<<<<<<<<<<<<<<<<<<<<<<< repasse do layout
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
