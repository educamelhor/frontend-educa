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
  // RBAC (perfis/permissoes) — lidos do localStorage
  // ─────────────────────────────────────────────────────────────
  const getPermissoes = () => {
    try {
      const raw = localStorage.getItem('permissoes');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const getScope = () =>
    String(localStorage.getItem('scope') || 'escola').toLowerCase().trim();

  const scope = getScope();
  const isScopeEscola = scope === 'escola';
  const isScopePlataforma = scope === 'plataforma';

  const hasPerm = (perm) => getPermissoes().includes(perm);

  // Começando pelos 3 módulos solicitados
  const canConteudos = isScopeEscola && hasPerm('conteudos.visualizar');
  const canAvaliacoes = isScopeEscola && hasPerm('avaliacoes.visualizar');
  const canMonitoramento = isScopeEscola && hasPerm('monitoramento.visualizar');

  // Direção (Diretor) — Devices EDUCA-CAPTURE
  const canDirecaoDevices = isScopeEscola && hasPerm('capture_devices.gerenciar');


  // ─────────────────────────────────────────────────────────────
  // Abre automaticamente o grupo correto conforme a rota atual
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/secretaria')) {
      setOpenGroup('secretaria');
    }
    else if (p.startsWith('/disciplinar')) setOpenGroup('disciplinar');
    else if (p.startsWith('/pedagogico')) setOpenGroup('pedagogico');
    else if (p.startsWith('/impressao')) setOpenGroup('impressao');
    else if (p.startsWith('/monitoramento')) setOpenGroup('monitoramento');
    else if (p.startsWith('/direcao')) setOpenGroup('direcao');
    else setOpenGroup(null);
  }, [location.pathname]);

  // ─────────────────────────────────────────────────────────────
  // Utilidades de estilização
  // ─────────────────────────────────────────────────────────────
  const isActive = (to, exact = false) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  // Classe para links principais
  const getMainLinkClasses = (to) =>
    `flex items-center py-2 px-3 rounded hover:bg-blue-700 transition ${isActive(to) && to !== '/' ? 'text-green-400 font-bold bg-blue-700/50' : ''
    }`;

  // Classe para links de submenus (suporta match exato opcional)
  const getSubmenuLinkClasses = (to, exact = false) =>
    `flex items-center py-2 pl-6 pr-3 rounded hover:bg-blue-700 transition ${isActive(to, exact) ? 'text-green-400 font-bold bg-blue-700' : ''
    }`;

  // ─────────────────────────────────────────────────────────────
  // Renderização
  // ─────────────────────────────────────────────────────────────
  return (
    <aside className="w-64 bg-blue-800 text-white flex-shrink-0 h-screen overflow-y-auto">
      <nav className="p-4">
        {isScopePlataforma ? (
          <>
            {/* LINK: Plataforma - Escolas */}
            <Link to="/plataforma/escolas" className={getMainLinkClasses('/plataforma/escolas')}>
              <HomeIcon className="h-5 w-5 mr-2" />
              Plataforma - Escolas
            </Link>

            {/* LINK: Plataforma - Auditoria RBAC */}
            <Link to="/plataforma/auditoria-rbac" className={getMainLinkClasses('/plataforma/auditoria-rbac')}>
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Auditoria RBAC
            </Link>
          </>
        ) : (
          <>
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
          </>
        )}

        {/* ───────────────────────────────
            GRUPO: Direção (Diretor)
            (Dispositivos EDUCA-CAPTURE)
        ─────────────────────────────── */}
        {canDirecaoDevices && (
          <>
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
              onClick={() =>
                setOpenGroup(openGroup === 'direcao' ? null : 'direcao')
              }
              type="button"
            >
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
              <span className="flex-1 text-left">Direção</span>
              {openGroup === 'direcao' ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {openGroup === 'direcao' && (
              <ul className="ml-4 mb-2">
                <li>
                  <Link
                    to="/direcao/diretor"
                    className={getSubmenuLinkClasses('/direcao/diretor', true)}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Educa-Capture
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* ───────────────────────────────
            GRUPO: Monitoramento
            (Painel + Visitantes: Registrar / Histórico)
        ─────────────────────────────── */}
        {canMonitoramento && (
          <>
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
          </>
        )}

        {isScopeEscola && (
          <>
            {/* ───────────────────────────────
                GRUPO: Disciplinar
            ─────────────────────────────── */}
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-6 transition"
              onClick={() => setOpenGroup(openGroup === 'disciplinar' ? null : 'disciplinar')}
              type="button"
            >
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
              <span className="flex-1 text-left">Disciplinar</span>
              {openGroup === 'disciplinar' ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {openGroup === 'disciplinar' && (
              <ul className="ml-4 mb-2">
                <li>
                  <Link
                    to="/disciplinar/alunos"
                    className={getSubmenuLinkClasses('/disciplinar/alunos')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Alunos
                  </Link>
                </li>

                <li>
                  <Link
                    to="/disciplinar/ajustes"
                    className={getSubmenuLinkClasses('/disciplinar/ajustes')}
                  >
                    <WrenchIcon className="h-5 w-5 mr-2" /> Ajustes
                  </Link>
                </li>

                <li>
                  <Link
                    to="/disciplinar/responsaveis"
                    className={getSubmenuLinkClasses('/disciplinar/responsaveis')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Responsáveis
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {isScopeEscola && (
          <>
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
                    to="/secretaria/disciplinas"
                    className={getSubmenuLinkClasses('/secretaria/disciplinas')}
                  >
                    <BookOpenIcon className="h-5 w-5 mr-2" /> Disciplinas
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
              </ul>
            )}
          </>
        )}

        {isScopeEscola && (
          <>
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
                    className={`flex items-center py-2 pl-6 pr-3 rounded transition ${location.pathname.startsWith('/pedagogico/conselho')
                        ? 'bg-blue-700 text-green-400 font-semibold'
                        : 'hover:bg-blue-700'
                      }`}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" /> Conselho de Classe
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {isScopeEscola && (
          <>
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
          </>
        )}

        {/* ───────────────────────────────
            Plataforma (CEO)
            ✅ REMOVIDO do Sistema Escolar: a plataforma é uma SPA separada
        ─────────────────────────────── */}

      </nav>
    </aside>
  );
}
