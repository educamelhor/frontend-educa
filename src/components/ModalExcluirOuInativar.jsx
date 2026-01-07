// src/components/ModalExcluirOuInativar.jsx
import React from "react";
import { Dialog } from "@headlessui/react";

export default function ModalExcluirOuInativar({ open, onClose, onConfirm }) {
  return (
    <Dialog
      open={!!open}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-sm w-full z-50">
          <Dialog.Title className="text-lg font-bold text-gray-800">
            Escolha uma ação
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 mb-4">
            Deseja <strong>excluir</strong> definitivamente ou{" "}
            <strong>inativar</strong> o estudante?
          </Dialog.Description>
          <div className="flex justify-between gap-4">
            <button
              onClick={() => onConfirm("excluir")}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Excluir
            </button>
            <button
              onClick={() => onConfirm("inativar")}
              className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Inativar
            </button>
          </div>
          <button
            onClick={onClose}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>
    </Dialog>
  );
}
