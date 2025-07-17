// src/components/layout/Sidebar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  UsersIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  // Controle do grupo aberto
  const [openGroup, setOpenGroup] = useState(null); // null | "secretaria" | "pedagogico"
  // Controle do submenu Correções
  const [openCorrecoes, setOpenCorrecoes] = useState(false);

  const location = useLocation();

  const isActive = (to) => location.pathname.startsWith(to);

  return (
    <aside className="w-64 bg-blue-800 text-white flex-shrink-0">
      <nav className="p-4">
        <Link to="/" className="block py-2 px-3 rounded hover:bg-blue-700">
          Home
        </Link>
        <Link to="/alunos" className="block py-2 px-3 rounded hover:bg-blue-700">
          Gestão de Alunos
        </Link>
        <Link to="/professores" className="block py-2 px-3 rounded hover:bg-blue-700">
          Gestão de Professores
        </Link>
        <Link to="/questoes" className="block py-2 px-3 rounded hover:bg-blue-700">
          Banco de Questões
        </Link>

        {/* --- MENU SECRETARIA --- */}
        <button
          className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-6 transition"
          onClick={() =>
            setOpenGroup(openGroup === "secretaria" ? null : "secretaria")
          }
        >
          <BookOpenIcon className="h-5 w-5 mr-2" />
          <span className="flex-1 text-left">Secretaria</span>
          {openGroup === "secretaria" ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>
        {openGroup === "secretaria" && (
          <ul className="ml-4 mb-2">
            <li>
              <Link
                to="/secretaria/alunos"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/secretaria/alunos") ? "bg-blue-700" : ""}`}
              >
                <UsersIcon className="h-5 w-5 mr-2" /> Alunos
              </Link>
            </li>
            <li>
              <Link
                to="/secretaria/disciplinas"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/secretaria/disciplinas") ? "bg-blue-700" : ""}`}
              >
                <BookOpenIcon className="h-5 w-5 mr-2" /> Disciplinas
              </Link>
            </li>
            <li>
              <Link
                to="/secretaria/professores"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/secretaria/professores") ? "bg-blue-700" : ""}`}
              >
                <UsersIcon className="h-5 w-5 mr-2" /> Professores
              </Link>
            </li>
            <li>
              <Link
                to="/secretaria/turmas"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/secretaria/turmas") ? "bg-blue-700" : ""}`}
              >
                <AcademicCapIcon className="h-5 w-5 mr-2" /> Turmas
              </Link>
            </li>
          </ul>
        )}

        {/* --- MENU PEDAGÓGICO --- */}
        <button
          className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
          onClick={() => {
            if (openGroup === "pedagogico") {
              setOpenGroup(null);
              setOpenCorrecoes(false); // FECHA correções também
            } else {
              setOpenGroup("pedagogico");
            }
          }}
        >
          <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
          <span className="flex-1 text-left">Pedagógico</span>
          {openGroup === "pedagogico" ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>
        {openGroup === "pedagogico" && (
          <ul className="ml-4 mb-2">
            <li>
              <Link
                to="/pedagogico/horarios"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/pedagogico/horarios") ? "bg-blue-700" : ""}`}
              >
                <ClockIcon className="h-5 w-5 mr-2" /> Horários
              </Link>
            </li>
            <li>
              <Link
                to="/pedagogico/conselho"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/pedagogico/conselho") ? "bg-blue-700" : ""}`}
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" /> Conselho de Classe
              </Link>
            </li>
            <li>
              <Link
                to="/pedagogico/avaliacoes"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/pedagogico/avaliacoes") ? "bg-blue-700" : ""}`}
              >
                <PencilSquareIcon className="h-5 w-5 mr-2" /> Avaliações
              </Link>
            </li>
            <li>
              <Link
                to="/pedagogico/provas"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/pedagogico/provas") ? "bg-blue-700" : ""}`}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" /> Provas
              </Link>
            </li>

            {/* Submenu Correções */}
            <li>
              <button
                className="flex items-center w-full py-2 pl-6 pr-3 rounded hover:bg-blue-700 transition"
                onClick={() => setOpenCorrecoes((v) => !v)}
                type="button"
              >
                <BookOpenIcon className="h-5 w-5 mr-2" />
                <span className="flex-1 text-left">Correções</span>
                {openCorrecoes ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
              {openCorrecoes && (
                <ul className="ml-8 mb-2">
                  <li>
                    <Link
                      to="/pedagogico/correcoes/redacao"
                      className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${
                        isActive("/pedagogico/correcoes/redacao") ? "bg-blue-700" : ""
                      }`}
                    >
                      <PencilSquareIcon className="h-5 w-5 mr-2" /> Redação
                    </Link>
                  </li>
                  {/* NOVO ITEM GABARITO */}
                  <li>
                    <Link
                      to="/pedagogico/correcoes/gabarito"
                      className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${
                        isActive("/pedagogico/correcoes/gabarito") ? "bg-blue-700" : ""
                      }`}
                    >
                      <DocumentTextIcon className="h-5 w-5 mr-2" /> Gabarito
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <Link
                to="/pedagogico/graficos"
                className={`flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 ${isActive("/pedagogico/graficos") ? "bg-blue-700" : ""}`}
              >
                <ChartBarIcon className="h-5 w-5 mr-2" /> Gráficos
              </Link>
            </li>
          </ul>
        )}

      </nav>
    </aside>
  );
}
