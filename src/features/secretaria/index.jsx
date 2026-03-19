// src/features/secretaria/index.jsx
// ============================================================================
// Rotas do módulo "Secretaria"
// Centraliza os submódulos: Professores, Turmas, Disciplinas, Alunos e Cargas Horárias
// ============================================================================

import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Submódulos
import ListaProfessores from './professores/ListaProfessores';
import ListaTurmas from './turmas/ListaTurmas';
import ListaDisciplinas from './disciplinas/ListaDisciplinas';
import ListaCargasHorarias from './cargas-horarias/ListaCargasHorarias';
import Alunos from "./alunos";
import CargasHorariasPage from "./cargas-horarias";
import ListaResponsaveis from "./responsaveis";

// ============================================================================
// Componente principal da Secretaria
// ============================================================================
export default function Secretaria() {
  return (
    <Routes>
      {/* Professores */}
      <Route path="professores" element={<ListaProfessores />} />

      {/* Turmas */}
      <Route path="turmas" element={<ListaTurmas />} />

      {/* Disciplinas */}
      <Route path="disciplinas" element={<ListaDisciplinas />} />

      {/* Cargas Horárias */}
      <Route path="cargas-horarias" element={<CargasHorariasPage />} />

      {/* Alunos */}
      <Route path="alunos" element={<Alunos />} />

      {/* Responsáveis */}
      <Route path="responsaveis" element={<ListaResponsaveis />} />
    </Routes>
  );
}
