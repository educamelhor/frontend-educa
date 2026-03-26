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
  const [openGabaritoPed, setOpenGabaritoPed] = useState(false);
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

  // ── Perfil do usuário logado ──
  const getPerfil = () =>
    String(localStorage.getItem('perfil') || '').toLowerCase().trim();
  const perfil = getPerfil();
  const isDisciplinar = perfil === 'disciplinar' || perfil === 'diretor_disciplinar' || perfil === 'militar';
  const isProfessor = perfil === 'professor';

  // Começando pelos 3 módulos solicitados
  const canConteudos = isScopeEscola && !isDisciplinar && !isProfessor && hasPerm('conteudos.visualizar');
  const canAvaliacoes = isScopeEscola && !isDisciplinar && !isProfessor && hasPerm('avaliacoes.visualizar');
  const canMonitoramento = isScopeEscola && !isDisciplinar && !isProfessor && hasPerm('monitoramento.visualizar');

  // Direção (Diretor) — Devices EDUCA-CAPTURE
  const canDirecaoDevices = isScopeEscola && !isDisciplinar && !isProfessor && hasPerm('capture_devices.gerenciar');


  // ─────────────────────────────────────────────────────────────
  // Abre automaticamente o grupo correto conforme a rota atual
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/secretaria')) {
      setOpenGroup('secretaria');
    }
    else if (p.startsWith('/disciplinar')) setOpenGroup('disciplinar');
    else if (p.startsWith('/pedagogico')) {
      setOpenGroup('pedagogico');
      // Auto-abrir submenu Correções se estiver em rota de correções
      if (p.startsWith('/pedagogico/correcoes')) setOpenCorrecoes(true);
      // Auto-abrir submenu Gabarito se estiver em rota de gabarito
      if (p.startsWith('/pedagogico/gabarito')) setOpenGabaritoPed(true);
    }
    else if (p.startsWith('/professores')) setOpenGroup('professores');
    else if (p.startsWith('/impressao')) setOpenGroup('impressao');
    else if (p.startsWith('/monitoramento')) setOpenGroup('monitoramento');
    else if (p.startsWith('/direcao')) setOpenGroup('direcao');
    else if (p.startsWith('/plataforma')) setOpenGroup('plataforma');
    else if (p.startsWith('/gabarito')) setOpenGroup('gabarito');
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
            {/* ─── GRUPO: Escolas (submenus) ─── */}
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 transition"
              onClick={() => setOpenGroup(openGroup === 'plataforma' ? null : 'plataforma')}
              type="button"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              <span className="flex-1 text-left">Escolas</span>
              {openGroup === 'plataforma' ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {openGroup === 'plataforma' && (
              <ul className="ml-4 mb-2">
                <li>
                  <Link
                    to="/plataforma/escolas"
                    className={getSubmenuLinkClasses('/plataforma/escolas', true)}
                  >
                    <HomeIcon className="h-5 w-5 mr-2" /> Escolas
                  </Link>
                </li>
                <li>
                  <Link
                    to="/plataforma/diretores"
                    className={getSubmenuLinkClasses('/plataforma/diretores', true)}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Diretores
                  </Link>
                </li>
              </ul>
            )}

            {/* LINK: Plataforma - Auditoria RBAC */}
            <Link to="/plataforma/auditoria-rbac" className={getMainLinkClasses('/plataforma/auditoria-rbac')}>
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Auditoria RBAC
            </Link>
          </>
        ) : (
          <>
            {/* LINK: Home */}
            {!isDisciplinar && !isProfessor && (
            <Link to="/" className={getMainLinkClasses('/')}>
              <HomeIcon className="h-5 w-5 mr-2" />
              Home
            </Link>
            )}

            {/* LINK: Estudantes */}
            {!isDisciplinar && !isProfessor && (
            <Link to="/alunos" className={getMainLinkClasses('/alunos')}>
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Estudantes
            </Link>
            )}

            {/* GRUPO: Professores (fora de Secretaria) */}
            {isProfessor ? (
            /* ── Professor: mostra grupo Professores sempre aberto + Gabarito ── */
            <>
            {/* Título do grupo Professores (sem toggle, sempre aberto) */}
            <div
              className="flex items-center w-full py-2 px-3 rounded mt-2"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <AcademicCapIcon className="h-5 w-5 mr-2" />
              <span className="flex-1 text-left font-semibold">Professores</span>
            </div>

            {/* Submenus sempre visíveis */}
            <ul className="ml-4 mb-2">
              <li>
                <Link
                  to="/professores/planos"
                  className={getSubmenuLinkClasses('/professores/planos')}
                >
                  <PencilSquareIcon className="h-5 w-5 mr-2" /> Planos
                </Link>
              </li>
              <li>
                <Link
                  to="/professores/avaliacoes"
                  className={getSubmenuLinkClasses('/professores/avaliacoes')}
                >
                  <TableCellsIcon className="h-5 w-5 mr-2" /> Avaliações
                </Link>
              </li>
              <li>
                <Link
                  to="/professores/conteudos"
                  className={getSubmenuLinkClasses('/professores/conteudos')}
                >
                  <BookOpenIcon className="h-5 w-5 mr-2" /> Conteúdos
                </Link>
              </li>
              <li>
                <Link
                  to="/professores/provas"
                  className={getSubmenuLinkClasses('/professores/provas')}
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" /> Provas
                </Link>
              </li>
            </ul>

            {/* ⭐ GABARITO — Módulo separado para Professor */}
            <Link
              to="/gabarito"
              className={getMainLinkClasses('/gabarito')}
              style={{
                marginTop: 4,
                background: isActive('/gabarito')
                  ? 'linear-gradient(90deg, rgba(6,182,212,0.15), transparent)'
                  : undefined,
              }}
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" style={{ color: isActive('/gabarito') ? '#22d3ee' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 700 }}>Gabarito</span>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '8px',
                letterSpacing: '0.5px',
              }}>NOVO</span>
            </Link>
            </>
            ) : !isDisciplinar && (
            <>
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
              onClick={() => setOpenGroup(openGroup === 'professores' ? null : 'professores')}
              type="button"
            >
              <AcademicCapIcon className="h-5 w-5 mr-2" />
              <span className="flex-1 text-left">Professores</span>
              {openGroup === 'professores' ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {openGroup === 'professores' && (
              <ul className="ml-4 mb-2">
                <li>
                  <Link
                    to="/professores/planos"
                    className={getSubmenuLinkClasses('/professores/planos')}
                  >
                    <PencilSquareIcon className="h-5 w-5 mr-2" /> Planos
                  </Link>
                </li>
                <li>
                  <Link
                    to="/professores/avaliacoes"
                    className={getSubmenuLinkClasses('/professores/avaliacoes')}
                  >
                    <TableCellsIcon className="h-5 w-5 mr-2" /> Avaliações
                  </Link>
                </li>
                <li>
                  <Link
                    to="/professores/conteudos"
                    className={getSubmenuLinkClasses('/professores/conteudos')}
                  >
                    <BookOpenIcon className="h-5 w-5 mr-2" /> Conteúdos
                  </Link>
                </li>
                <li>
                  <Link
                    to="/professores/provas"
                    className={getSubmenuLinkClasses('/professores/provas')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" /> Provas
                  </Link>
                </li>
              </ul>
            )}
            </>
            )}

            {/* LINK: Banco de Questões */}
            {!isDisciplinar && !isProfessor && (
            <Link to="/questoes" className={getMainLinkClasses('/questoes')}>
              <BookOpenIcon className="h-5 w-5 mr-2" />
              Banco de Questões
            </Link>
            )}

            {/* LINK: Ferramentas */}
            {!isDisciplinar && !isProfessor && (
            <Link to="/ferramentas" className={getMainLinkClasses('/ferramentas')}>
              <WrenchIcon className="h-5 w-5 mr-2" />
              Ferramentas
            </Link>
            )}

            {/* ⭐ MÓDULO GABARITO — Destaque Premium */}
            {!isDisciplinar && !isProfessor && (
            <>
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
              onClick={() => setOpenGroup(openGroup === 'gabarito' ? null : 'gabarito')}
              type="button"
              style={{
                background: openGroup === 'gabarito'
                  ? 'linear-gradient(90deg, rgba(6,182,212,0.15), transparent)'
                  : undefined,
              }}
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" style={{ color: openGroup === 'gabarito' ? '#22d3ee' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 700 }}>Gabarito</span>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '8px',
                letterSpacing: '0.5px',
                marginRight: 4,
              }}>NOVO</span>
              {openGroup === 'gabarito' ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {openGroup === 'gabarito' && (
              <ul className="ml-4 mb-2">
                <li>
                  <Link
                    to="/gabarito"
                    className={getSubmenuLinkClasses('/gabarito', true)}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" /> Painel
                  </Link>
                </li>
              </ul>
            )}
            </>
            )}
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
                <li>
                  <Link
                    to="/direcao/responsaveis"
                    className={getSubmenuLinkClasses('/direcao/responsaveis', true)}
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" /> Responsáveis
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








        {isScopeEscola && !isProfessor && (
          <>
            {/* ───────────────────────────────
                GRUPO: Disciplinar
            ─────────────────────────────── */}
            {isDisciplinar ? (
            /* ── Disciplinar/Militar: submenus sempre visíveis ── */
            <>
            <div
              className="flex items-center w-full py-2 px-3 rounded mt-6"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
              <span className="flex-1 text-left font-semibold">Disciplinar</span>
            </div>

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
                    to="/disciplinar/responsaveis"
                    className={getSubmenuLinkClasses('/disciplinar/responsaveis')}
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" /> Responsáveis
                  </Link>
                </li>
                {(perfil === 'diretor' || perfil === 'militar') && (
                <li>
                  <Link
                    to="/disciplinar/equipe"
                    className={getSubmenuLinkClasses('/disciplinar/equipe')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Gestão de Equipe
                  </Link>
                </li>
                )}
                <li>
                  <Link
                    to="/disciplinar/regimentos"
                    className={getSubmenuLinkClasses('/disciplinar/regimentos')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" /> Regimentos
                  </Link>
                </li>
                <li>
                  <Link
                    to="/disciplinar/metadados"
                    className={getSubmenuLinkClasses('/disciplinar/metadados')}
                  >
                    <TableCellsIcon className="h-5 w-5 mr-2" /> Metadados
                  </Link>
                </li>
                <li>
                  <Link
                    to="/disciplinar/suporte"
                    className={getSubmenuLinkClasses('/disciplinar/suporte')}
                  >
                    <WrenchIcon className="h-5 w-5 mr-2" /> Suporte
                  </Link>
                </li>
              </ul>
            </>
            ) : (
            /* ── Outros perfis (diretor, coordenador): toggle colapsável ── */
            <>
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
                {/* ── DESABILITADO no EDUCA.MELHOR_escola ──
                    Será recriado futuramente no EDUCA.MELHOR_ceo
                <li>
                  <Link
                    to="/disciplinar/ajustes"
                    className={getSubmenuLinkClasses('/disciplinar/ajustes')}
                  >
                    <WrenchIcon className="h-5 w-5 mr-2" /> Ajustes
                  </Link>
                </li>
                ── FIM DESABILITADO ── */}
                <li>
                  <Link
                    to="/disciplinar/responsaveis"
                    className={getSubmenuLinkClasses('/disciplinar/responsaveis')}
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" /> Responsáveis
                  </Link>
                </li>
                {(perfil === 'diretor' || perfil === 'militar') && (
                <li>
                  <Link
                    to="/disciplinar/equipe"
                    className={getSubmenuLinkClasses('/disciplinar/equipe')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Gestão de Equipe
                  </Link>
                </li>
                )}
                <li>
                  <Link
                    to="/disciplinar/regimentos"
                    className={getSubmenuLinkClasses('/disciplinar/regimentos')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" /> Regimentos
                  </Link>
                </li>
                <li>
                  <Link
                    to="/disciplinar/metadados"
                    className={getSubmenuLinkClasses('/disciplinar/metadados')}
                  >
                    <TableCellsIcon className="h-5 w-5 mr-2" /> Metadados
                  </Link>
                </li>
                <li>
                  <Link
                    to="/disciplinar/suporte"
                    className={getSubmenuLinkClasses('/disciplinar/suporte')}
                  >
                    <WrenchIcon className="h-5 w-5 mr-2" /> Suporte
                  </Link>
                </li>
              </ul>
            )}
            </>
            )}
          </>
        )}

        {isScopeEscola && !isDisciplinar && !isProfessor && (
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
                    to="/secretaria/responsaveis"
                    className={getSubmenuLinkClasses('/secretaria/responsaveis')}
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" /> Responsáveis
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
          </>
        )}

        {isScopeEscola && !isDisciplinar && !isProfessor && (
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
                  setOpenGabaritoPed(false);
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

                {canConteudos && (
                  <li>
                    <Link
                      to="/pedagogico/conteudos"
                      className={getSubmenuLinkClasses('/pedagogico/conteudos')}
                    >
                      <BookOpenIcon className="h-5 w-5 mr-2" /> Conteúdos
                    </Link>
                  </li>
                )}

                <li>
                  <Link
                    to="/pedagogico/coordenacao/solicitacoes"
                    className={getSubmenuLinkClasses('/pedagogico/coordenacao/solicitacoes')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Solicitações
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
                    </ul>
                  )}
                </li>

                {/* Submenu Gabarito (3 etapas) */}
                <li>
                  <button
                    className="flex items-center w-full py-2 pl-6 pr-3 rounded hover:bg-blue-700 transition"
                    onClick={() => setOpenGabaritoPed((v) => !v)}
                    type="button"
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    <span className="flex-1 text-left">Gabarito</span>
                    {openGabaritoPed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                  </button>

                  {openGabaritoPed && (
                    <ul className="ml-8 mb-2">
                      <li>
                        <Link
                          to="/pedagogico/gabarito/imprimir"
                          className={getSubmenuLinkClasses('/pedagogico/gabarito/imprimir')}
                        >
                          <PrinterIcon className="h-5 w-5 mr-2" /> Imprimir
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/pedagogico/gabarito/corrigir"
                          className={getSubmenuLinkClasses('/pedagogico/gabarito/corrigir')}
                        >
                          <CheckCircleIcon className="h-5 w-5 mr-2" /> Corrigir
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/pedagogico/gabarito/resultados"
                          className={getSubmenuLinkClasses('/pedagogico/gabarito/resultados')}
                        >
                          <ChartBarIcon className="h-5 w-5 mr-2" /> Resultados
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
          </>
        )}

        {isScopeEscola && !isDisciplinar && !isProfessor && (
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
