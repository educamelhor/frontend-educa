// src/features/pedagogico/conselho/ModalFichaAluno.jsx
// ============================================================================
// Modal da Ficha do Estudante — EXCLUSIVO do módulo PEDAGÓGICO
//
// Usa FichaAlunoPedagogico (isolado nesta pasta), que:
//  ✅ Exibe Relatório Pedagógico
//  ❌ NÃO exibe Relatório Disciplinar (exclusivo de militares em CCMDF)
//  ❌ NÃO exibe banner de upload de foto (foto vem do EDUCA-CAPTURE)
//
// Este arquivo NÃO é compartilhado com outros módulos.
// ============================================================================
import React, { useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import FichaAlunoPedagogico from "./FichaAlunoPedagogico";

export default function ModalFichaAluno({ open, codigo, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    setTimeout(() => dialogRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Fundo escurecido */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Conteúdo do modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ficha do Estudante"
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-6xl h-[90vh] overflow-hidden outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-blue-900">Ficha do Estudante</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Fechar"
          >
            <XMarkIcon className="h-6 w-6 text-gray-700" />
          </button>
        </div>

        {/*
          FichaAlunoPedagogico — versão isolada sem upload e sem Disciplinar.
          Relatório Disciplinar NUNCA renderiza aqui independente da escola.
        */}
        <div className="w-full h-full overflow-auto p-4 bg-blue-50">
          <FichaAlunoPedagogico codigo={codigo} />
        </div>
      </div>
    </div>
  );
}
