// ==================================================================================
// frontend/src/features/secretaria/horarios/components/GradeBase.jsx
// Componente base de grade semanal (reutilizado por turma e professor)
// Agora com seletor de layout:
//   • "dias-linhas"  (DEFAULT): linhas = dias | colunas = períodos  [layout atual]
//   • "dias-colunas"           : colunas = dias | linhas = períodos  [estilo Urânia]
// Mantém compatibilidade total com versões anteriores.
// ==================================================================================

import React from "react";

export default function GradeBase({
  titulo,
  dias = [1, 2, 3, 4, 5],
  periodosPorDia = {},
  celulaRender,
  legenda,
  layout = "dias-linhas", // NOVO: "dias-linhas" | "dias-colunas"
}) {
  const labelDia = (n) => ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][n] || n;

  // Maior quantidade de períodos encontrada entre os dias (fallback = 6 se não houver)
  const maxPeriodos = Math.max(0, ...dias.map((d) => (periodosPorDia[d]?.length || 0))) || 6;

  // =================================================================================
  // LAYOUT A: "dias-linhas" (COMPORTAMENTO ATUAL) — linhas = dias, colunas = períodos
  // =================================================================================
  if (layout === "dias-linhas") {
    return (
      <div className="bg-white rounded-2xl shadow p-4 border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-blue-900">{titulo}</h3>
          {legenda}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 border-b p-2 text-left">Dia</th>
                {[...Array(maxPeriodos)].map((_, i) => (
                  <th key={i} className="border-b p-2 text-center">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d}>
                  <td className="sticky left-0 bg-white z-10 border-b p-2 font-medium">
                    {labelDia(d)}
                  </td>
                  {[...Array(maxPeriodos)].map((_, i) => (
                    <td key={i} className="border-b p-2 align-top">
                      {celulaRender ? celulaRender({ dia: d, ordem: i + 1 }) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =================================================================================
  // LAYOUT B: "dias-colunas" (URÂNIA) — colunas = dias, linhas = períodos
  // =================================================================================
  return (
    <div className="bg-white rounded-2xl shadow p-4 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-900">{titulo}</h3>
        {legenda}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white z-10 border-b p-2 text-left">Período</th>
              {dias.map((d) => (
                <th key={d} className="border-b p-2 text-center">
                  {labelDia(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(maxPeriodos)].map((_, i) => {
              const ordem = i + 1;
              return (
                <tr key={ordem}>
                  {/* coluna fixa com o número do período */}
                  <td className="sticky left-0 bg-white z-10 border-b p-2 font-medium">#{ordem}</td>
                  {dias.map((d) => (
                    <td key={d} className="border-b p-2 align-top">
                      {celulaRender ? celulaRender({ dia: d, ordem }) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
