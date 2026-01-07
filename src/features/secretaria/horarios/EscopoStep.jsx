// PATH: src/features/secretaria/horarios/EscopoStep.jsx
// STEP 1 (Escopo) — extraído do HorariosWizard.jsx sem alterar comportamento.

import React, { useEffect, useMemo, useRef } from "react";

const TURNOS = ["Matutino", "Vespertino", "Noturno", "Integral"];

// Helper: rótulo amigável da turma (mesmo do wizard)
const labelFromTurma = (t) =>
  t?.turma ||
  t?.nome ||
  t?.descricao ||
  [t?.serie, t?.turma].filter(Boolean).join(" ") ||
  `Turma ${t?.id}`;

export default function EscopoStep({
  // estado
  turno,
  setTurno,
  anoRef,
  setAnoRef,
  etapa,
  setEtapa,
  turmas,
  turmasChecked,
  setTurmasChecked,
  loadingTurmas,

  // navegação
  setStep,

  // erro
  setError,
}) {
  // Agora Ano é obrigatório no Escopo
  const canNextFromStep1 = turno && anoRef && turmasChecked.length > 0;

  // Etapas disponíveis agora respeitam turno + ano
  const etapasDisponiveis = useMemo(() => {
    const set = new Set();
    (turmas || []).forEach((t) => {
      const okTurno =
        !turno ||
        String(t.turno).toLowerCase() === String(turno).toLowerCase();

      const okAno = !anoRef || String(t.ano_ref || t.ano) === String(anoRef);

      if (okTurno && okAno) {
        if (t.etapa) set.add(t.etapa);
      }
    });

    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [turmas, turno, anoRef]);

  // Turmas filtradas agora respeitam turno + ano + etapa
  const turmasFiltradas = useMemo(() => {
    const list = Array.isArray(turmas) ? turmas : [];
    const f = list.filter((t) => {
      const okTurno =
        !turno ||
        String(t.turno).toLowerCase() === String(turno).toLowerCase();

      const okAno = !anoRef || String(t.ano_ref || t.ano) === String(anoRef);

      const okEtapa = !etapa || String(t.etapa) === String(etapa);

      return okTurno && okAno && okEtapa;
    });

    return [...f].sort((a, b) =>
      labelFromTurma(a).localeCompare(labelFromTurma(b))
    );
  }, [turmas, turno, anoRef, etapa]);

  // manter seleção consistente com o filtro atual
  useEffect(() => {
    setTurmasChecked((prev) =>
      prev.filter((id) => turmasFiltradas.some((t) => t.id === id))
    );
  }, [turno, anoRef, etapa, turmasFiltradas, setTurmasChecked]);

  // SELECT ALL
  const selectAllRef = useRef(null);
  const allVisibleIds = useMemo(
    () => turmasFiltradas.map((t) => t.id),
    [turmasFiltradas]
  );

  const allVisibleSelected = useMemo(
    () =>
      allVisibleIds.length > 0 &&
      allVisibleIds.every((id) => turmasChecked.includes(id)),
    [allVisibleIds, turmasChecked]
  );

  const someVisibleSelected = useMemo(
    () =>
      allVisibleIds.some((id) => turmasChecked.includes(id)) &&
      !allVisibleSelected,
    [allVisibleIds, turmasChecked, allVisibleSelected]
  );

  const visibleSelectedCount = useMemo(
    () => allVisibleIds.filter((id) => turmasChecked.includes(id)).length,
    [allVisibleIds, turmasChecked]
  );

  const allVisibleTotal = useMemo(() => allVisibleIds.length, [allVisibleIds]);

  useEffect(() => {
    if (selectAllRef.current)
      selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setTurmasChecked((prev) =>
        prev.filter((id) => !allVisibleIds.includes(id))
      );
    } else {
      setTurmasChecked((prev) =>
        Array.from(new Set([...prev, ...allVisibleIds]))
      );
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        {/* Turno */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Turno</h2>
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {TURNOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Ano (obrigatório) */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Ano</h2>
          <input
            type="number"
            placeholder="Ex: 2025"
            value={anoRef}
            onChange={(e) => setAnoRef(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-blue-700 mt-2">
            O ano é obrigatório para diferenciar turmas do mesmo turno em anos
            distintos.
          </p>
        </div>

        {/* Etapa */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Etapa / Modalidade{" "}
            <span className="text-sm text-blue-600">(opcional)</span>
          </h2>
          <select
            value={etapa}
            onChange={(e) => setEtapa(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Todas</option>
            {etapasDisponiveis.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Turmas */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-blue-900">Turmas</h2>
            <div className="flex items-center gap-3">
              {loadingTurmas && (
                <span className="text-sm text-blue-600">carregando…</span>
              )}
              <label className="flex items-center gap-2 text-sm text-blue-800">
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4"
                />
                Marcar todas{" "}
                {allVisibleTotal > 0
                  ? `(${visibleSelectedCount}/${allVisibleTotal})`
                  : ""}
              </label>
            </div>
          </div>

          <div className="max-h-80 overflow-auto pr-1">
            {turmasFiltradas.map((t) => {
              const label = labelFromTurma(t);
              const checked = turmasChecked.includes(t.id);
              return (
                <label
                  key={t.id}
                  className="flex items-center gap-3 py-2 border-b last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setTurmasChecked((prev) =>
                        e.target.checked
                          ? [...prev, t.id]
                          : prev.filter((x) => x !== t.id)
                      )
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-blue-900">{label}</span>
                </label>
              );
            })}

            {!loadingTurmas && turmasFiltradas.length === 0 && (
              <div className="text-sm text-blue-700 py-6">
                Nenhuma turma encontrada para o filtro atual (turno/ano/etapa).
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 flex justify-end gap-3">
        <button
          className="px-4 py-2 rounded-xl border border-blue-300 text-blue-800 hover:bg-blue-100"
          onClick={() => setTurmasChecked([])}
        >
          Limpar seleção
        </button>

        <button
          disabled={!canNextFromStep1}
          onClick={() => {
            if (!turno || !anoRef || turmasChecked.length === 0) {
              setError("Selecione turno, ano e ao menos uma turma.");
              return;
            }
            setStep(2);
          }}
          className={`px-5 py-2 rounded-xl shadow ${
            canNextFromStep1
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-blue-200 text-white cursor-not-allowed"
          }`}
        >
          Avançar
        </button>
      </div>
    </div>
  );
}
