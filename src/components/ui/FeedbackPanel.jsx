// src/components/ui/FeedbackPanel.jsx

import React from "react";

export default function FeedbackPanel({ feedback, progress, onClose }) {
  if (!feedback) return null;

  return (
    <div className="mt-2 relative max-w-xs">
      <div className="block p-3 bg-white border border-gray-200 rounded shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-1 right-1 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>

        {feedback.status === "processando" && (
          <>
            <p className="text-gray-600 mb-2">
              Processando importação turma {feedback.turma}…
            </p>
            <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
              <div
                className="h-2 bg-blue-600"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {feedback.status === "sucesso" && (
          <>
            <p className="text-gray-800">
              📄 Localizados: {feedback.localizados}
            </p>
            <p className="text-green-600">
              ✅ Inseridos: {feedback.inseridos}
            </p>
            <p className="text-yellow-600">
              ⚠️ Já existiam: {feedback.jaExistiam}
            </p>
            <p className="text-blue-600">
              🔄 Reativados: {feedback.reativados}
            </p>
            <p className="text-red-600">
              ❌ Inativados: {feedback.inativados}
            </p>
            {feedback.message && (
              <p className="text-gray-700 mt-2">{feedback.message}</p>
            )}
          </>
        )}

        {feedback.status === "erro" && (
          <p className="text-red-600">
            ❌ Erro: {feedback.message}
          </p>
        )}
      </div>
    </div>
  );
}
