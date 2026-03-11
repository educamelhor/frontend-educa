// src/features/secretaria/alunos/ModalExcluirOuInativar.jsx
// ────────────────────────────────────────────────────────────────
// Componente: ModalExcluirOuInativar
// Finalidade: Modal para inativar um aluno (sem opção de excluir)
// Props:
// - open: controla visibilidade do modal
// - onClose: callback para fechar o modal
// - aluno: objeto do aluno selecionado
// - onDelete: callback disparado ao confirmar "Excluir" (se já inativo)
// - onInactivate: callback disparado ao confirmar "Inativar" (se ativo)
// Observações:
// • Ajustado para inativar alunos ativos e excluir definitivamente alunos já inativos.
// • Não fazemos chamada de API aqui; apenas disparamos os callbacks.
// ────────────────────────────────────────────────────────────────

import React from "react";

export default function ModalExcluirOuInativar({
  open,
  onClose,
  aluno,
  onDelete,
  onInactivate,
}) {
  // Se modal fechado ou sem aluno, não renderiza
  if (!open || !aluno) return null;

  const inativo = aluno.status === "inativo";

  // ────────────────────────────────────────────────────────────────
  // Callbacks
  // ────────────────────────────────────────────────────────────────
  const handleInactivate = async () => {
    try {
      if (onInactivate) onInactivate();
    } catch (err) {
      console.error("❌ Erro ao inativar aluno:", err);
      alert("Erro ao inativar aluno.");
    }
  };

  const handleDelete = async () => {
    try {
      if (onDelete) onDelete();
    } catch (err) {
      console.error("❌ Erro ao excluir aluno:", err);
      alert("Erro ao excluir aluno.");
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Renderização
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
        {/* Título */}
        <h2 className="text-lg font-bold mb-4">Gerenciar Aluno</h2>

        {/* Mensagem */}
        <p className="mb-4">
          {inativo ? (
            <>
              Deseja <strong>EXCLUIR DEFINITIVAMENTE</strong> o aluno{" "}
              <span className="font-semibold text-red-600">
                {aluno.estudante || aluno.nome}
              </span>
              ?
              <br />
              <span className="text-sm text-gray-500 mt-2 block">
                Essa ação não pode ser desfeita. Todo o histórico, notas e fotos poderão ser perdidos.
              </span>
            </>
          ) : (
            <>
              O que deseja fazer com o aluno{" "}
              <span className="font-semibold">
                {aluno.estudante || aluno.nome}
              </span>
              ?
              <br />
              <span className="text-sm text-gray-500 mt-2 block">
                O aluno será apenas inativado para manter seu histórico.
              </span>
            </>
          )}
        </p>

        {/* Botões de ação */}
        <div className="flex justify-end gap-2">
          {inativo ? (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-medium"
            >
              Excluir Definitivamente
            </button>
          ) : (
            <button
              onClick={handleInactivate}
              className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600"
            >
              Inativar
            </button>
          )}

          {/* Botão Cancelar (permanece) */}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
