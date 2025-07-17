import React from "react";

export default function ModalCodigoUnico({ open, codigo, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">Código já existe</h2>
        <p className="mb-6">
          O código <strong>{codigo}</strong> já está em uso por outro aluno.  
          Deseja continuar mesmo assim?
        </p>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-100">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
