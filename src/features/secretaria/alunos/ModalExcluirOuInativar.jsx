// src/features/secretaria/alunos/ModalExcluirOuInativar.jsx
// ────────────────────────────────────────────────────────────────
// Componente: ModalExcluirOuInativar
// Finalidade: Modal para inativar um aluno (sem opção de excluir)
// Props:
// - open: controla visibilidade do modal
// - onClose: callback para fechar o modal
// - aluno: objeto do aluno selecionado
// - onDelete: (mantido por compatibilidade, porém não utilizado aqui)
// - onInactivate: callback disparado ao confirmar "Inativar"
// Observações:
// • Removido o botão "Excluir" e sua lógica associada.
// • Mantidos os botões "Inativar" e "Cancelar".
// • Não fazemos chamada de API aqui; apenas disparamos os callbacks.
// ────────────────────────────────────────────────────────────────

import React from "react";

export default function ModalExcluirOuInativar({
  open,
  onClose,
  aluno,
  onDelete,       // mantido por compatibilidade (não utilizado)
  onInactivate,
}) {
  // Se modal fechado ou sem aluno, não renderiza
  if (!open || !aluno) return null;

  // ────────────────────────────────────────────────────────────────
  // Inativação: apenas notifica o componente pai via onInactivate()
  // (O pai decide a chamada à API / atualização da lista)
  // ────────────────────────────────────────────────────────────────
  const handleInactivate = async () => {
    try {
      if (onInactivate) onInactivate();
    } catch (err) {
      console.error("❌ Erro ao inativar aluno:", err);
      alert("Erro ao inativar aluno.");
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
          O que deseja fazer com o aluno{" "}
          <span className="font-semibold">
            {aluno.estudante || aluno.nome}
          </span>
          ?
        </p>

        {/* Botões de ação */}
        <div className="flex justify-end gap-2">
          {/* Botão Inativar (permanece) */}
          <button
            onClick={handleInactivate}
            className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600"
          >
            Inativar
          </button>

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
