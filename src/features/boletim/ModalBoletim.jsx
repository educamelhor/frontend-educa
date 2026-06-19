// src/features/conselho/ModalBoletim.jsx
// ============================================================================
// Modal de Boletim (usado em SECRETARIA e PEDAGÓGICO)
// Objetivo: exibir o mesmo rodapé do fluxo "Impressão"
// - Ranking Escola e Ranking Turma (APENAS 2025) → calculados no backend
// - Soma das notas (2024 + 2025)
// Implementação: renderizamos o componente BoletimPrint, que já possui
// a renderização padronizada do rodapé utilizada no PDF.
// Nenhum outro fluxo foi alterado.
// ============================================================================

import React from "react";
import BoletimPrint from "../boletim/BoletimPrint"; // ← mesmo componente usado na impressão

/**
 * Props
 * - open: boolean → controla a abertura do modal
 * - codigo: string|number → código do aluno
 * - onClose: function → callback para fechar o modal
 *
 * Observação:
 * - BoletimPrint aceita opcionalmente:
 *   • alunoPreCarregado (objeto do aluno)
 *   • notasPreCarregadas (array de notas)
 *   Esses props são úteis quando você já tem os dados em memória.
 *   No modal, normalmente basta passar "codigo".
 */
export default function ModalBoletim({ open, codigo, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white max-w-6xl w-full max-h-[95vh] overflow-y-auto rounded-xl shadow-lg p-4 relative">
        {/* ────────────────────────────────────────────────────────────────
            Botão Fechar
        ──────────────────────────────────────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-xl font-bold text-gray-700 hover:text-red-600"
          title="Fechar"
          type="button"
        >
          ×
        </button>

        {/* ────────────────────────────────────────────────────────────────
            Boletim com rodapé padronizado (igual ao PDF por turma)
            - exibirBotaoImprimir={false} → oculta o botão no modal
            - se em algum fluxo você já tiver aluno/notas em memória,
              pode otimizar passando:
              alunoPreCarregado={aluno} notasPreCarregadas={aluno.notas}
        ──────────────────────────────────────────────────────────────── */}
        <BoletimPrint
          codigo={codigo}
          exibirBotaoImprimir={false}
        />
      </div>
    </div>
  );
}
