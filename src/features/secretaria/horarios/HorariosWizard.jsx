// PATH: src/features/secretaria/horarios/HorariosWizard.jsx

import React from "react";

import EscopoStep from "./EscopoStep.jsx";
import GradeTemporalStep from "./GradeTemporalStep.jsx";
import PreSolveStep from "./PreSolveStep.jsx";
import useHorariosWizardState from "./useHorariosWizardState.js";

function Stepper({ step, setStep }) {
  const steps = ["Escopo", "Grade temporal", "Pré-solve"];
  return (
    <div className="flex items-center gap-4 mb-6">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        return (
          <button
            key={label}
            onClick={() => setStep(idx)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${
              active
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-blue-800 border-blue-200 hover:border-blue-400"
            }`}
          >
            <span
              className={`w-6 h-6 grid place-items-center rounded-full ${
                active
                  ? "bg-white text-blue-700"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {idx}
            </span>
            <span className="font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function HorariosWizard() {
  const S = useHorariosWizardState();

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <Stepper step={S.step} setStep={S.setStep} />

      {!!S.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {S.error}
        </div>
      )}

      {S.step === 1 && (
        <EscopoStep
          turno={S.turno}
          setTurno={S.setTurno}
          anoRef={S.anoRef}
          setAnoRef={S.setAnoRef}
          etapa={S.etapa}
          setEtapa={S.setEtapa}
          turmas={S.turmas}
          turmasChecked={S.turmasChecked}
          setTurmasChecked={S.setTurmasChecked}
          loadingTurmas={S.loadingTurmas}
          setStep={S.setStep}
          setError={S.setError}
        />
      )}

      {S.step === 2 && (
        <GradeTemporalStep
          turno={S.turno}
          setTurno={S.setTurno}
          anoRef={S.anoRef}
          grade={S.grade}
          setGrade={S.setGrade}
          carregarGrade={S.carregarGrade}
          salvarGrade={S.salvarGrade}
          loadingGrade={S.loadingGrade}
          savingGrade={S.savingGrade}
          setStep={S.setStep}
          setError={S.setError}
        />
      )}

      {S.step === 3 && (
        <PreSolveStep
          turno={S.turno}
          anoRef={S.anoRef}
          turmasChecked={S.turmasChecked}
          executarPreSolve={S.executarPreSolve}
          runningPre={S.runningPre}
          preSolve={S.preSolve}
          payloadPreview={S.payloadPreview}
          setStep={S.setStep}
        />
      )}
    </div>
  );
}
