// src/components/layout/Sidebar.jsx
// ============================================================================
// Sidebar de navegação principal do sistema.
// Estrutura organizada em grupos: Secretaria, Pedagógico, Impressão, etc.
// Inclui controle de abertura automática de grupos conforme rota ativa.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  UsersIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  PrinterIcon,
  HomeIcon,
  UserGroupIcon,
  PencilSquareIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  WrenchIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const [openGroup, setOpenGroup] = useState(null);
  const [openCorrecoes, setOpenCorrecoes] = useState(false);
  const location = useLocation();

  // ─────────────────────────────────────────────────────────────
  // Abre automaticamente o grupo correto conforme a rota atual
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/secretaria')) setOpenGroup('secretaria');
    else if (p.startsWith('/pedagogico')) setOpenGroup('pedagogico');
    else if (p.startsWith('/impressao')) setOpenGroup('impressao');
    else if (p.startsWith('/monitoramento')) setOpenGroup('monitoramento');
    else setOpenGroup(null);
  }, [location.pathname]);

  // ─────────────────────────────────────────────────────────────
  // Utilidades de estilização
  // ─────────────────────────────────────────────────────────────
  const isActive = (to, exact = false) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  // Classe para links principais
  const getMainLinkClasses = (to) =>
    `flex items-center py-2 px-3 rounded hover:bg-blue-700 transition ${
      isActive(to) && to !== '/' ? 'text-green-400 font-bold bg-blue-700/50' : ''
    }`;

  // Classe para links de submenus (suporta match exato opcional)
  const getSubmenuLinkClasses = (to, exact = false) =>
    `flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 transition ${
      isActive(to, exact) ? 'text-green-400 font-bold bg-blue-700' : ''
    }`;

  // ─────────────────────────────────────────────────────────────
  // Renderização
  // ─────────────────────────────────────────────────────────────
  return (
    <aside className="w-64 bg-blue-800 text-white flex-shrink-0 h-screen overflow-y-auto">
      <nav className="p-4">
        {/* LINK: Home */}
        <Link to="/" className={getMainLinkClasses('/')}>
          <HomeIcon className="h-5 w-5 mr-2" />
          Home
        </Link>

        {/* LINK: Estudantes */}
        <Link to="/alunos" className={getMainLinkClasses('/alunos')}>
          <UserGroupIcon className="h-5 w-5 mr-2" />
          Estudantes
        </Link>

        {/* LINK: Professores (fora de Secretaria) */}
        <Link to="/professores" className={getMainLinkClasses('/professores')}>
          <AcademicCapIcon className="h-5 w-5 mr-2" />
          Gestão de Professores
        </Link>

        {/* LINK: Banco de Questões */}
        <Link to="/questoes" className={getMainLinkClasses('/questoes')}>
          <BookOpenIcon className="h-5 w-5 mr-2" />
          Banco de Questões
        </Link>

        {/* LINK: Ferramentas */}
        <Link to="/ferramentas" className={getMainLinkClasses('/ferramentas')}>
          <WrenchIcon className="h-5 w-5 mr-2" />
          Ferramentas
        </Link>

        {/* ───────────────────────────────
            GRUPO: Monitoramento
            (Painel + Visitantes: Registrar / Histórico)
        ─────────────────────────────── */}
        <button
          className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
          onClick={() =>
            setOpenGroup(openGroup === 'monitoramento' ? null : 'monitoramento')
          }
          type="button"
        >
          <UserGroupIcon className="h-5 w-5 mr-2" />
          <span className="flex-1 text-left">Monitoramento</span>
          {openGroup === 'monitoramento' ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        {openGroup === 'monitoramento' && (
          <ul className="ml-4 mb-2">
            <li>
              {/* Match EXATO para não ficar ativo em /monitoramento/visitantes/... */}
              <Link
                to="/monitoramento"
                className={getSubmenuLinkClasses('/monitoramento', true)}
              >
                <UserGroupIcon className="h-5 w-5 mr-2" /> Painel ao vivo
              </Link>
            </li>
            <li>
              <Link
                to="/monitoramento/visitantes/registrar"
                className={getSubmenuLinkClasses('/monitoramento/visitantes/registrar')}
              >
                <PencilSquareIcon className="h-5 w-5 mr-2" /> Visitantes — Registrar
              </Link>
            </li>
            <li>
              <Link
                to="/monitoramento/visitantes/historico"
                className={getSubmenuLinkClasses('/monitoramento/visitantes/historico')}
              >
                <ClockIcon className="h-5 w-5 mr-2" /> Visitantes — Histórico
              </Link>
            </li>
            <li>
              <Link
                to="/monitoramento/embeddings"
                className={getSubmenuLinkClasses('/monitoramento/embeddings')}
              >
                <ChartBarIcon className="h-5 w-5 mr-2" /> Embeddings — Gerar
              </Link>
            </li>
          </ul>
        )}

        {/* ───────────────────────────────
            GRUPO: Secretaria
        ─────────────────────────────── */}
        <button
          className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-6 transition"
          onClick={() => setOpenGroup(openGroup === 'secretaria' ? null : 'secretaria')}
          type="button"
        >
          <PencilSquareIcon className="h-5 w-5 mr-2" />
          <span className="flex-1 text-left">Secretaria</span>
          {openGroup === 'secretaria' ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        {openGroup === 'secretaria' && (
          <ul className="ml-4 mb-2">
            <li>
              <Link
                to="/secretaria/alunos"
                className={getSubmenuLinkClasses('/secretaria/alunos')}
              >
                <UsersIcon className="h-5 w-5 mr-2" /> Alunos
              </Link>
            </li>

            <li>
              <Link
                to="/secretaria/cargas-horarias"
                className={getSubmenuLinkClasses('/secretaria/cargas-horarias')}
              >
                <ClockIcon className="h-5 w-5 mr-2" /> Cargas Horárias
              </Link>
            </li>

            <li>
              <Link
                to="/secretaria/disciplinas"
                className={getSubmenuLinkClasses('/secretaria/disciplinas')}
              >
                <BookOpenIcon className="h-5 w-5 mr-2" /> Disciplinas
              </Link>
            </li>

            <li>
              <Link
                to="/secretaria/modulacao"
                className={getSubmenuLinkClasses('/secretaria/modulacao')}
              >
                <ClockIcon className="h-5 w-5 mr-2" /> Modulação
              </Link>
            </li>

            <li>
              <Link
                to="/secretaria/horarios"
                className={getSubmenuLinkClasses('/secretaria/horarios')}
              >
                <ClockIcon className="h-5 w-5 mr-2" /> Horários
              </Link>
            </li>

            <li>
              <Link
                to="/secretaria/professores"
                className={getSubmenuLinkClasses('/secretaria/professores')}
              >
                <UsersIcon className="h-5 w-5 mr-2" /> Professores
              </Link>
            </li>

            <li>
              <Link
                to="/secretaria/turmas"
                className={getSubmenuLinkClasses('/secretaria/turmas')}
              >
                <AcademicCapIcon className="h-5 w-5 mr-2" /> Turmas
              </Link>
            </li>

            {/* NOVO SUBMENU: Boletim */}
            <li>
              <Link
                to="/secretaria/boletim"
                className={getSubmenuLinkClasses('/secretaria/boletim')}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" /> Boletim
              </Link>
            </li>

            <li>
              <Link
                to="/secretaria/tabela-codigos"
                className={getSubmenuLinkClasses('/secretaria/tabela-codigos')}
              >
                <TableCellsIcon className="h-5 w-5 mr-2" /> Tabela Códigos
              </Link>
            </li>
          </ul>
        )}

        {/* ───────────────────────────────
            GRUPO: Pedagógico
        ─────────────────────────────── */}
        <button
          className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
          onClick={() => {
            if (openGroup === 'pedagogico') {
              setOpenGroup(null);
              setOpenCorrecoes(false);
            } else {
              setOpenGroup('pedagogico');
            }
          }}
          type="button"
        >
          <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
          <span className="flex-1 text-left">Pedagógico</span>
          {openGroup === 'pedagogico' ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        {openGroup === 'pedagogico' && (
          <ul className="ml-4 mb-2">
            <li>
              <Link
                to="/pedagogico/conselho"
                className={`flex items-center py-2 pl-6 pr-3 rounded transition ${
                  location.pathname.startsWith('/pedagogico/conselho')
                    ? 'bg-blue-700 text-green-400 font-semibold'
                    : 'hover:bg-blue-700'
                }`}
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" /> Conselho de Classe
              </Link>
            </li>




            <li>
              <Link
                to="/pedagogico/conteudos"
                className={getSubmenuLinkClasses('/pedagogico/conteudos')}
              >
                <BookOpenIcon className="h-5 w-5 mr-2" /> Conteúdos
              </Link>
            </li>






            <li>
              <Link
                to="/pedagogico/avaliacoes"
                className={getSubmenuLinkClasses('/pedagogico/avaliacoes')}
              >
                <PencilSquareIcon className="h-5 w-5 mr-2" /> Avaliações
              </Link>
            </li>

            <li>
              <Link
                to="/pedagogico/provas"
                className={getSubmenuLinkClasses('/pedagogico/provas')}
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
                      className={getSubmenuLinkClasses('/pedagogico/correcoes/redacao')}
                    >
                      <PencilSquareIcon className="h-5 w-5 mr-2" /> Redação
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/pedagogico/correcoes/gabarito"
                      className={getSubmenuLinkClasses('/pedagogico/correcoes/gabarito')}
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
                className={getSubmenuLinkClasses('/pedagogico/graficos')}
              >
                <ChartBarIcon className="h-5 w-5 mr-2" /> Gráficos
              </Link>
            </li>
          </ul>
        )}

        {/* ───────────────────────────────
            GRUPO: Impressão
        ─────────────────────────────── */}
        <button
          className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
          onClick={() => setOpenGroup(openGroup === 'impressao' ? null : 'impressao')}
          type="button"
        >
          <PrinterIcon className="h-5 w-5 mr-2" />
          <span className="flex-1 text-left">Impressão</span>
          {openGroup === 'impressao' ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        {openGroup === 'impressao' && (
          <ul className="ml-4 mb-2">
            <li>
              <Link
                to="/impressao/boletins"
                className={getSubmenuLinkClasses('/impressao/boletins')}
              >
                <ChartBarIcon className="h-5 w-5 mr-2" /> Boletins
              </Link>
            </li>
            <li>
              <Link
                to="/impressao/gabaritos"
                className={getSubmenuLinkClasses('/impressao/gabaritos')}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" /> Gabaritos
              </Link>
            </li>
            <li>
              <Link
                to="/impressao/listas"
                className={getSubmenuLinkClasses('/impressao/listas')}
              >
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Listas
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </aside>
  );
}
