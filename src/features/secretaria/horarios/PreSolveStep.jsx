// PATH: src/features/secretaria/horarios/PreSolveStep.jsx
// STEP 3 (Pré-solve) — extraído do HorariosWizard.jsx sem alterar comportamento.

import React from "react";
import { useNavigate } from "react-router-dom";

export default function PreSolveStep({
  // contexto
  turno,
  anoRef,
  turmasChecked,

  // ações
  executarPreSolve,
  runningPre,

  // resultados
  preSolve,
  payloadPreview,

  // navegação
  setStep,
}) {
  const navigate = useNavigate();

  const onIrParaLayout = () => {
    navigate("/secretaria/horarios/layout", {
      state: { turno, anoRef, turmaIds: turmasChecked },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          Pré-solve (validações)
        </h2>

        <p className="text-sm text-blue-800 mb-3">
          Turno: <strong>{turno}</strong> • Ano: <strong>{anoRef}</strong> •
          Turmas selecionadas: <strong>{turmasChecked.length}</strong>
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep(2)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Voltar
          </button>

          <button
            onClick={executarPreSolve}
            disabled={runningPre || turmasChecked.length === 0}
            className={`px-4 py-2 rounded-xl shadow ${
              runningPre ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {runningPre ? "Executando…" : "Executar Pré-solve"}
          </button>

          <button
            onClick={onIrParaLayout}
            disabled={!turmasChecked.length || (preSolve?.errors && preSolve.errors.length > 0)}
            className="ml-auto px-4 py-2 rounded-xl shadow bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Ir para Layout
          </button>
        </div>
      </div>

      {preSolve && (
        <div className="grid md:grid-cols-2 gap-4">
          {(preSolve?.errors?.length > 0 || preSolve?.warnings?.length > 0) && (
            <div className={`bg-white rounded-2xl shadow p-4 border-l-4 ${preSolve?.errors?.length ? 'border-red-500' : 'border-amber-500'}`}>
              
              {preSolve?.errors?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <span>❌</span> Erros Críticos (Geração Bloqueada)
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-red-600 text-sm">
                    {preSolve.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preSolve?.warnings?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <span>⚠️</span> Avisos
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-amber-700 text-sm">
                    {preSolve.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {(!preSolve?.errors?.length && !preSolve?.warnings?.length) && (
            <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-emerald-500 flex items-center">
                <span className="text-emerald-600 font-medium">Tudo certo! Nenhum aviso ou erro encontrado.</span>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Estatísticas</h3>
            <pre className="text-xs text-blue-900 bg-blue-50 rounded-xl p-3 overflow-auto">
              {JSON.stringify(preSolve?.stats || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {payloadPreview && (
        <div className="bg-white rounded-2xl shadow p-4">
          <details>
            <summary className="cursor-pointer text-blue-900 font-semibold">
              Ver payload do solver (preview)
            </summary>
            <pre className="text-xs text-blue-900 bg-blue-50 rounded-xl p-3 overflow-auto mt-3">
              {JSON.stringify(payloadPreview, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
