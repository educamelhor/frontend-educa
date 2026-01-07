// PATH: src/features/secretaria/horarios/GradeTemporalStep.jsx
// STEP 2 (Grade Temporal) — extraído do HorariosWizard.jsx sem alterar comportamento.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const TURNOS = ["Matutino", "Vespertino", "Noturno", "Integral"];

const DIAS = [
  { id: 1, nome: "Segunda" },
  { id: 2, nome: "Terça" },
  { id: 3, nome: "Quarta" },
  { id: 4, nome: "Quinta" },
  { id: 5, nome: "Sexta" },
  { id: 6, nome: "Sábado" },
];

export default function GradeTemporalStep({
  // estado
  turno,
  setTurno,
  anoRef,

  grade,
  setGrade,

  // ações
  carregarGrade,
  salvarGrade,

  // flags
  loadingGrade,
  savingGrade,

  // navegação
  setStep,

  // erro
  setError,
}) {
  const navigate = useNavigate();

  /* ===== Navegação para Configurações Pedagógicas ===== */
  const onIrParaConfiguracoesPedagogicas = () => {
    navigate("/secretaria/horarios/configuracoes-pedagogicas", {
      state: {
        turno,
        anoRef,
      },
    });
  };

  // === REPEAT TOOL (copiar dia) ===
  const [copyFrom, setCopyFrom] = useState(1); // dia origem (1..6)
  const [copyTargets, setCopyTargets] = useState(new Set()); // dias destino
  const [copyMode, setCopyMode] = useState("overwrite"); // "overwrite" | "onlyEmpty"

  function toggleTarget(diaId) {
    setCopyTargets((prev) => {
      const s = new Set(prev);
      if (s.has(diaId)) s.delete(diaId);
      else s.add(diaId);
      return s;
    });
  }

  function clonePeriods(arr = []) {
    return arr.map((p) => ({
      ordem: Number(p.ordem),
      inicio: p.inicio,
      fim: p.fim,
    }));
  }

  function performCopy() {
    setGrade((prev) => {
      const src = clonePeriods(prev[copyFrom] || []);
      if (!src.length) return prev;

      const next = { ...prev };
      for (const d of copyTargets) {
        const isEmpty = !next[d] || next[d].length === 0;
        if (copyMode === "onlyEmpty" && !isEmpty) continue;
        next[d] = clonePeriods(src);
      }
      return next;
    });
  }

  function addPeriodo(diaId) {
    setGrade((prev) => {
      const atual = prev[diaId] ? [...prev[diaId]] : [];
      const nextOrd = atual.length
        ? Math.max(...atual.map((p) => p.ordem)) + 1
        : 1;
      return {
        ...prev,
        [diaId]: [...atual, { ordem: nextOrd, inicio: "", fim: "" }],
      };
    });
  }

  function rmPeriodo(diaId, ordem) {
    setGrade((prev) => ({
      ...prev,
      [diaId]: (prev[diaId] || []).filter((p) => p.ordem !== ordem),
    }));
  }

  function setPeriodo(diaId, ordem, campo, valor) {
    setGrade((prev) => ({
      ...prev,
      [diaId]: (prev[diaId] || []).map((p) =>
        p.ordem === ordem ? { ...p, [campo]: valor } : p
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={turno}
          onChange={(e) => setTurno(e.target.value)}
          className="border rounded-xl px-3 py-2"
        >
          {TURNOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          onClick={carregarGrade}
          className="px-3 py-2 rounded-xl border border-blue-300 text-blue-800 hover:bg-blue-100"
        >
          Recarregar
        </button>

        <button
          onClick={() => setStep(1)}
          className="px-3 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          Voltar
        </button>

        {/* BOTÃO — CONFIGURAÇÕES PEDAGÓGICAS */}
        <button
          onClick={onIrParaConfiguracoesPedagogicas}
          className="px-3 py-2 rounded-xl border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
        >
          Configurações pedagógicas
        </button>

        <button
          onClick={() => setStep(3)}
          className="ml-auto px-4 py-2 rounded-xl shadow bg-blue-600 text-white hover:bg-blue-700"
        >
          Avançar
        </button>
      </div>

      {/* Painel: Repetir dia para outros dias */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="grid md:grid-cols-3 gap-4 items-center">
          {/* Origem */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Copiar do dia
            </label>
            <select
              value={copyFrom}
              onChange={(e) => setCopyFrom(Number(e.target.value))}
              className="w-full border rounded-xl px-3 py-2"
            >
              {DIAS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Destinos */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Para (você pode marcar vários)
            </label>
            <div className="flex flex-wrap gap-3">
              {DIAS.filter((d) => d.id !== copyFrom).map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 text-blue-800"
                >
                  <input
                    type="checkbox"
                    checked={copyTargets.has(d.id)}
                    onChange={() => toggleTarget(d.id)}
                    className="w-4 h-4"
                  />
                  {d.nome}
                </label>
              ))}
            </div>
          </div>

          {/* Modo + ação */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Modo de cópia
            </label>

            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="copyMode"
                  value="overwrite"
                  checked={copyMode === "overwrite"}
                  onChange={(e) => setCopyMode(e.target.value)}
                />
                Sobrescrever
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="copyMode"
                  value="onlyEmpty"
                  checked={copyMode === "onlyEmpty"}
                  onChange={(e) => setCopyMode(e.target.value)}
                />
                Completar vazios
              </label>
            </div>

            <button
              onClick={performCopy}
              disabled={copyTargets.size === 0 || !(grade[copyFrom]?.length)}
              className={`px-4 py-2 rounded-xl shadow ${
                copyTargets.size === 0 || !(grade[copyFrom]?.length)
                  ? "bg-blue-200 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {loadingGrade ? (
        <div className="p-4 bg-white rounded-2xl shadow">Carregando grade…</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIAS.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-900">{d.nome}</h3>
                <button
                  onClick={() => addPeriodo(d.id)}
                  className="text-sm px-2 py-1 rounded-lg border border-blue-300 text-blue-800 hover:bg-blue-50"
                >
                  + período
                </button>
              </div>

              <div className="space-y-2">
                {(grade[d.id] || []).map((p) => (
                  <div
                    key={p.ordem}
                    className="grid grid-cols-5 items-center gap-2"
                  >
                    <span className="col-span-1 text-sm text-blue-900">
                      #{p.ordem}
                    </span>

                    <input
                      placeholder="HH:MM"
                      value={p.inicio}
                      onChange={(e) =>
                        setPeriodo(d.id, p.ordem, "inicio", e.target.value)
                      }
                      className="col-span-2 border rounded-xl px-3 py-2"
                    />

                    <input
                      placeholder="HH:MM"
                      value={p.fim}
                      onChange={(e) =>
                        setPeriodo(d.id, p.ordem, "fim", e.target.value)
                      }
                      className="col-span-2 border rounded-xl px-3 py-2"
                    />

                    <div className="col-span-5 flex justify-end">
                      <button
                        onClick={() => rmPeriodo(d.id, p.ordem)}
                        className="text-xs text-red-700 hover:underline"
                      >
                        remover
                      </button>
                    </div>
                  </div>
                ))}

                {!(grade[d.id]?.length) && (
                  <div className="text-sm text-blue-700">
                    Nenhum período — clique em “+ período”.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={salvarGrade}
          disabled={savingGrade}
          className={`px-5 py-2 rounded-xl shadow ${
            savingGrade ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {savingGrade ? "Salvando…" : "Salvar grade"}
        </button>
      </div>
    </div>
  );
}
