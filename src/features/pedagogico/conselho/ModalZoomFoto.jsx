import React, { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function ModalZoomFoto({ open, src, alt, onClose }) {
  const dialogRef = useRef(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);

    setTimeout(() => {
      setAnimate(true);
      dialogRef.current?.focus();
    }, 10);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      setAnimate(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Fundo escuro com fade-in */}
      <div
        className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-300 ${
          animate ? "bg-black/70 opacity-100" : "bg-black/0 opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Container centralizado com efeito pop */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`relative max-w-[95vw] max-h-[90vh] bg-transparent outline-none transform transition-all duration-300 ease-out flex justify-center items-center ${
          animate ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Imagem com sombra, borda e brilho pulsante */}
        <div
          className={`relative rounded-lg border-4 border-white shadow-lg transition-all duration-500 ${
            animate ? "pulse-border" : ""
          }`}
        >
          <img
            src={src}
            alt={alt || "Foto do aluno"}
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
          />
          {/* Botão fechar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100 transition"
            title="Fechar"
          >
            <XMarkIcon className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
}
