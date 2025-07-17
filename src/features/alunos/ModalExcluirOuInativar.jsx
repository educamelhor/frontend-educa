// src/components/ModalExcluirOuInativar.jsx
import React, { useState } from "react";
import { Dialog } from "@headlessui/react";

export default function ModalExcluirOuInativar({
  open,
  onClose,
  aluno,
  onDelete,       // função para excluir de fato
  onInactivate,   // função para inativar de fato
}) {
  const [step, setStep] = useState("choice"); // "choice" | "confirmDelete" | "confirmInactivate"


   if (!aluno) return null; // ← proteção contra undefined

  // sempre que fechar todo o fluxo, resetamos para o passo inicial
  function fecharTudo() {
    setStep("choice");
    onClose();
  }

  return (
    <Dialog open={open} onClose={fecharTudo} className="fixed inset-0 z-50 flex items-center justify-center">
      <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
      <div className="bg-white rounded-lg max-w-sm w-full p-6 z-10">
        {step === "choice" && (
          <>
            <Dialog.Title className="text-lg font-medium mb-4">
              Deseja EXCLUIR ou INATIVAR o estudante abaixo?
            </Dialog.Title>
            <div className="mb-4 space-y-1 text-sm">
              <p><strong>Código:</strong> {aluno.codigo}</p>
              <p><strong>Estudante:</strong> {aluno.estudante}</p>
              <p><strong>Turma:</strong> {aluno.turma}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={fecharTudo}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep("confirmDelete")}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Excluir
              </button>
              <button
                onClick={() => setStep("confirmInactivate")}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Inativar
              </button>
            </div>
          </>
        )}

        {step === "confirmDelete" && (
          <>
            <Dialog.Title className="text-lg font-medium mb-4">
              Tem certeza que deseja <span className="text-red-600">excluir</span> este estudante?
            </Dialog.Title>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStep("choice")}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Não
              </button>
              <button


                onClick={async () => {
                   await onDelete(aluno.id);
                   fecharTudo();
                 }}



                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sim
              </button>
            </div>
          </>
        )}

        {step === "confirmInactivate" && (
          <>
            <Dialog.Title className="text-lg font-medium mb-4">
              Tem certeza que deseja <span className="text-yellow-600">inativar</span> este estudante?
            </Dialog.Title>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStep("choice")}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Não
              </button>
              <button


                onClick={async () => {
                   await onInactivate(aluno.id);
                   fecharTudo();
                 }}



                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Sim
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
