
// src/features/turmas/index.jsx
import React, { useState } from "react";
import ListaTurmas from "./ListaTurmas";
import TurmaForm from "./TurmaForm";

export default function Turmas() {
  // Estado para controle de abertura do formulário
  const [openForm, setOpenForm] = useState(false);

  // Estado para armazenar a turma que está sendo editada
  const [selectedTurma, setSelectedTurma] = useState(null);

  // Função para abrir formulário de nova turma
  const handleNovaTurma = () => {
    setSelectedTurma(null); // limpa seleção
    setOpenForm(true); // abre formulário
  };

  // Função para abrir formulário para edição
  const handleEditarTurma = (turma) => {
    setSelectedTurma(turma); // carrega dados no form
    setOpenForm(true);
  };

  // Função para fechar o formulário
  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedTurma(null);
  };

  return (
    <div>
      {/* Lista de turmas */}
      <ListaTurmas
        onNovaTurma={handleNovaTurma}
        onEditarTurma={handleEditarTurma}
      />

      {/* Formulário de cadastro/edição */}
      {openForm && (
        <TurmaForm
          open={openForm}
          onClose={handleCloseForm}
          turma={selectedTurma}
        />
      )}
    </div>
  );
}
