// src/features/secretaria/index.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ListaProfessores from './professores/ListaProfessores';
import ListaTurmas      from './turmas/ListaTurmas';
import ListaDisciplinas from './disciplinas/ListaDisciplinas';
import ListaAlunos     from './alunos/ListaAlunos';

export default function Secretaria() {
  return (
    <Routes>
      <Route path="professores" element={<ListaProfessores />} />
      <Route path="turmas"      element={<ListaTurmas />} />
      <Route path="disciplinas" element={<ListaDisciplinas />} />
      <Route path="alunos"      element={<ListaAlunos    />} />
    </Routes>
  );
}
