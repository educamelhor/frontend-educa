// features/professores/conselho/ModalZoomFotoProfessor.jsx
// Arquivo EXCLUSIVO do módulo professores/conselho.
// NÃO compartilhado com outros módulos.
import React, { useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function ModalZoomFotoProfessor({ open, src, alt, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => ref.current?.focus(), 0);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className="relative outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition"
          title="Fechar"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <img
          src={src}
          alt={alt || "Foto do aluno"}
          className="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain"
        />
      </div>
    </div>
  );
}
