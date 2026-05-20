// src/components/layout/Sidebar.jsx
// ============================================================================
// Sidebar de navegação principal do sistema.
// Estrutura organizada em grupos: Secretaria, Pedagógico, Impressão, etc.
// Inclui controle de abertura automática de grupos conforme rota ativa.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
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
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  XMarkIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

export default function Sidebar({ isOpen, onClose }) {
  // Para perfis militares o grupo Disciplinar fica sempre expandido
  const [openGroup, setOpenGroup] = useState(
    () => {
      const p = String(localStorage.getItem('perfil') || '').toLowerCase().trim();
      return (p === 'militar' || p === 'comandante') ? 'disciplinar' : null;
    }
  );
  const [openCorrecoes, setOpenCorrecoes] = useState(false);
  const [openGabaritoPed, setOpenGabaritoPed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
  const canConteudos = isScopeEscola && !isDisciplinar && !isProfessor && hasPerm('conteudos:ver');
  const canAvaliacoes = isScopeEscola && !isDisciplinar && !isProfessor && hasPerm('avaliacoes.visualizar');
  const canMonitoramento = isScopeEscola && !isDisciplinar && !isProfessor && hasPerm('monitoramento.visualizar');

  // Direção (Diretor) — Devices EDUCA-CAPTURE
  const canDirecaoDevices = isScopeEscola && !isDisciplinar && !isProfessor && hasPerm('capture_devices.gerenciar');

  // Governança — Diretor e Vice-Diretor
  const canGovernanca = isScopeEscola && !isDisciplinar && !isProfessor && (perfil === 'diretor' || perfil === 'vice_diretor');

  // Banco de Questões — restrito a Direção e Coordenação (em desenvolvimento/aprovação)
  const canBancoQuestoes = isScopeEscola && !isDisciplinar && (perfil === 'diretor' || perfil === 'vice_diretor' || perfil === 'coordenador');

  // ── Governança: controle de acesso ao Gabarito ──
  const [avaliacaoGovConfig, setAvaliacaoGovConfig] = useState(null);

  useEffect(() => {
    if (!isScopeEscola || isDisciplinar || isProfessor) return;
    const escolaId = localStorage.getItem('escola_id');
    if (!escolaId) return;
    (async () => {
      try {
        const resp = await api.get('/api/governanca/avaliacao-config', {
          params: { escola_id: escolaId },
        });
        setAvaliacaoGovConfig(resp.data?.config || null);
      } catch {
        setAvaliacaoGovConfig(null);
      }
    })();
  }, []);

  // Quem pode ver o módulo Gabarito?
  // - Diretor / vice_diretor / secretaria: SEMPRE
  // - Coordenador: se coordenador.acessa_gabarito === '1'
  // - Supervisor: se supervisor.acessa_gabarito === '1'
  const isCoord = perfil === 'coordenador';
  const isSuperv = perfil === 'supervisor';
  const canGabarito = (() => {
    if (isDisciplinar) return false;          // militar/comandante: sem acesso
    if (!isScopeEscola) return false;
    if (perfil === 'secretaria') return false; // secretário: sem acesso ao Gabarito
    if (isProfessor) return true;              // professor: acesso limitado (Corrigir + Resultados)
    if (isCoord) return avaliacaoGovConfig?.['coordenador.acessa_gabarito'] === '1';
    if (isSuperv) return avaliacaoGovConfig?.['supervisor.acessa_gabarito'] === '1';
    return true; // diretor, vice_diretor, etc.
  })();

  // Governança: perfis com acesso administrativo completo ao Gabarito (Gerar + Corrigir Lote)
  const canGabaritoAdmin = canGabarito && !isProfessor && !isCoord;

  // ── Agente EDUCA: disponível a TODOS exceto militar e comandante (CCMDF) ──
  const isMilitar = perfil === 'militar' || perfil === 'comandante';
  const canAgenteEduca = isScopeEscola && !isMilitar;


  // ─────────────────────────────────────────────────────────────
  // Abre automaticamente o grupo correto conforme a rota atual
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/secretaria')) {
      setOpenGroup('secretaria');
    }
    else if (p.startsWith('/disciplinar') && !/^\/(disciplinar\/(regimentos|manual|suporte))/.test(p)) setOpenGroup('disciplinar');
    else if (p.startsWith('/pedagogico')) {
      setOpenGroup('pedagogico');
      // Auto-abrir submenu Correções se estiver em rota de correções
      if (p.startsWith('/pedagogico/correcoes')) setOpenCorrecoes(true);
      // (Gabarito migrado para menu unificado /gabarito)
    }
    else if (p.startsWith('/professores')) setOpenGroup('professores');
    else if (p.startsWith('/impressao')) setOpenGroup('impressao');
    else if (p.startsWith('/frequencia')) setOpenGroup('frequencia');
    else if (p.startsWith('/monitoramento')) setOpenGroup('monitoramento');
    else if (p.startsWith('/direcao')) setOpenGroup('direcao');
    else if (p.startsWith('/plataforma')) setOpenGroup('plataforma');
    else if (p.startsWith('/gabarito')) setOpenGroup('gabarito');
    else if (p.startsWith('/agente-educa')) setOpenGroup('agente-educa');
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
    <aside className={`sidebar-aside ${isOpen ? 'sidebar-open' : ''}`}>
      <nav className="p-4">
        {/* Botão fechar — visível apenas em mobile */}
        <div className="sidebar-close-btn">
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-blue-700 flex items-center justify-center transition"
            title="Fechar menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
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

            {/* LINK: Plataforma - Usage Insights */}
            <Link
              to="/plataforma/usage"
              className={getMainLinkClasses('/plataforma/usage')}
              style={{
                marginTop: 4,
                background: isActive('/plataforma/usage')
                  ? 'linear-gradient(90deg, rgba(99,102,241,0.15), transparent)'
                  : undefined,
              }}
            >
              <ChartBarIcon className="h-5 w-5 mr-2" style={{ color: isActive('/plataforma/usage') ? '#a78bfa' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 600 }}>Usage Insights</span>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '8px',
                letterSpacing: '0.5px',
              }}>NOVO</span>
            </Link>

            {/* LINK: Plataforma - Auditoria RBAC */}
            <Link to="/plataforma/auditoria-rbac" className={getMainLinkClasses('/plataforma/auditoria-rbac')}>
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Auditoria RBAC
            </Link>

            {/* LINK: Plataforma - Suporte Técnico (SAC) */}
            <Link
              to="/plataforma/suporte"
              className={getMainLinkClasses('/plataforma/suporte')}
              style={{
                marginTop: 4,
                background: isActive('/plataforma/suporte')
                  ? 'linear-gradient(90deg, rgba(99,102,241,0.15), transparent)'
                  : undefined,
              }}
            >
              <QuestionMarkCircleIcon className="h-5 w-5 mr-2" style={{ color: isActive('/plataforma/suporte') ? '#a78bfa' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 600 }}>Suporte Técnico</span>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '8px',
                letterSpacing: '0.5px',
              }}>SAC</span>
            </Link>

            {/* LINK: Plataforma - Governança */}
            <Link
              to="/plataforma/governanca"
              className={getMainLinkClasses('/plataforma/governanca')}
              style={{
                marginTop: 4,
                background: isActive('/plataforma/governanca')
                  ? 'linear-gradient(90deg, rgba(99,102,241,0.15), transparent)'
                  : undefined,
              }}
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" style={{ color: isActive('/plataforma/governanca') ? '#a78bfa' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 600 }}>Governança</span>
            </Link>
          </>
        ) : (
          <>
            {/* LINK: Home */}
            {!isDisciplinar && !isProfessor && !isCoord && (
            <Link to="/" className={getMainLinkClasses('/')}>
              <HomeIcon className="h-5 w-5 mr-2" />
              Home
            </Link>
            )}

            {/* LINK: Estudantes */}
            {!isDisciplinar && !isProfessor && !isCoord && (
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

            </>
            ) : !isDisciplinar && !isCoord && (
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

            {/* ─── FREQUÊNCIA (professor): sempre aberto, só Frequência + Atestados ─── */}
            {isProfessor && (
              <>
                <div
                  className="flex items-center w-full py-2 px-3 rounded mt-2"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <ClipboardDocumentListIcon className="h-5 w-5 mr-2" style={{ color: '#10b981' }} />
                  <span className="flex-1 text-left font-semibold">Frequência</span>
                </div>
                <ul className="ml-4 mb-2">
                  <li>
                    <Link
                      to="/frequencia/atestados"
                      className={getSubmenuLinkClasses('/frequencia/atestados')}
                    >
                      <DocumentTextIcon className="h-5 w-5 mr-2" /> Atestados
                    </Link>
                  </li>
                </ul>
              </>
            )}

            {/* LINK: Banco de Questões — restrito a Direção e Coordenação */}
            {canBancoQuestoes && (
            <Link
              to="/questoes"
              className={getMainLinkClasses('/questoes')}
              style={{
                background: isActive('/questoes')
                  ? 'linear-gradient(90deg, rgba(14,116,144,0.2), transparent)'
                  : undefined,
              }}
            >
              <BookOpenIcon className="h-5 w-5 mr-2" style={{ color: isActive('/questoes') ? '#06b6d4' : undefined }} />
              <span className="flex-1 text-left">Banco de Questões</span>
              <span style={{
                fontSize: '0.52rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #0e7490, #1d4ed8)',
                color: '#fff', padding: '2px 5px', borderRadius: '6px',
                letterSpacing: '0.4px',
              }}>NOVO</span>
            </Link>
            )}

            {/* LINK: Ferramentas */}
            {!isDisciplinar && !isProfessor && !isCoord && (
            <Link to="/ferramentas" className={getMainLinkClasses('/ferramentas')}>
              <WrenchIcon className="h-5 w-5 mr-2" />
              Ferramentas
            </Link>
            )}
          </>
        )}

        {/* ═══════════════════════════════
            MÓDULO GABARITO UNIFICADO
            Professor/Coord: Corrigir + Resultados
            Direção/Supervisor: TODAS as etapas
            Secretário/Militar: sem acesso
        ═══════════════════════════════ */}
        {canGabarito && (
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
                {/* Gerar / Imprimir — somente direção/supervisor */}
                {canGabaritoAdmin && (
                <li>
                  <Link
                    to="/gabarito/gerar"
                    className={getSubmenuLinkClasses('/gabarito/gerar')}
                  >
                    <PrinterIcon className="h-5 w-5 mr-2" /> Gerar / Imprimir
                  </Link>
                </li>
                )}
                {/* Corrigir Lote — somente direção/supervisor */}
                {canGabaritoAdmin && (
                <li>
                  <Link
                    to="/gabarito/corrigir-lote"
                    className={getSubmenuLinkClasses('/gabarito/corrigir-lote')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Corrigir Lote
                  </Link>
                </li>
                )}
                {/* Corrigir — todos com canGabarito */}
                <li>
                  <Link
                    to="/gabarito/corrigir"
                    className={getSubmenuLinkClasses('/gabarito/corrigir', true)}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" /> Corrigir
                  </Link>
                </li>
                {/* Resultados — todos com canGabarito */}
                <li>
                  <Link
                    to="/gabarito/resultados"
                    className={getSubmenuLinkClasses('/gabarito/resultados')}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" /> Resultados
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* ───────────────────────────────
            GRUPO: Direção (Diretor)
            (Dispositivos EDUCA-CAPTURE)
        ─────────────────────────────── */}
        {(canDirecaoDevices || canGovernanca) && (
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
                <li>
                  <Link
                    to="/direcao/cadastro"
                    className={getSubmenuLinkClasses('/direcao/cadastro', true)}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Cadastro
                  </Link>
                </li>
                {canGovernanca && (
                <li>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenGroup('direcao');
                      navigate('/direcao/governanca');
                    }}
                    className={getSubmenuLinkClasses('/direcao/governanca', true)}
                    style={{
                      background: isActive('/direcao/governanca', true)
                        ? 'linear-gradient(90deg, rgba(99,102,241,0.18), transparent)'
                        : undefined,
                      width: '100%',
                      border: 'none',
                      color: 'inherit',
                      font: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Cog6ToothIcon className="h-5 w-5 mr-2" style={{ color: isActive('/direcao/governanca', true) ? '#a78bfa' : undefined }} /> Governança
                  </button>
                </li>
                )}
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








        {isScopeEscola && !isProfessor && !isCoord && (
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
                    to="/disciplinar/fo-coletivo"
                    className={getSubmenuLinkClasses('/disciplinar/fo-coletivo')}
                    style={{
                      background: isActive('/disciplinar/fo-coletivo')
                        ? 'linear-gradient(90deg, rgba(239,68,68,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <BoltIcon className="h-5 w-5 mr-2" style={{ color: isActive('/disciplinar/fo-coletivo') ? '#f87171' : undefined }} />
                    <span className="flex-1">F.O. Coletivo</span>
                    <span style={{ fontSize:'0.5rem', fontWeight:800, background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', padding:'1px 5px', borderRadius:'6px', letterSpacing:'0.5px' }}>NOVO</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/disciplinar/historico"
                    className={getSubmenuLinkClasses('/disciplinar/historico')}
                    style={{
                      background: isActive('/disciplinar/historico')
                        ? 'linear-gradient(90deg, rgba(245,158,11,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <ClockIcon className="h-5 w-5 mr-2" style={{ color: isActive('/disciplinar/historico') ? '#f59e0b' : undefined }} />
                    <span className="flex-1">Histórico</span>
                    <span style={{ fontSize:'0.5rem', fontWeight:800, background:'linear-gradient(135deg,#f59e0b,#ea580c)', color:'#fff', padding:'1px 5px', borderRadius:'6px', letterSpacing:'0.5px' }}>NOVO</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/disciplinar/atas"
                    className={getSubmenuLinkClasses('/disciplinar/atas')}
                    style={{
                      background: isActive('/disciplinar/atas')
                        ? 'linear-gradient(90deg, rgba(30,58,138,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" style={{ color: isActive('/disciplinar/atas') ? '#1e3a8a' : undefined }} />
                    <span className="flex-1">Atas</span>
                    <span style={{ fontSize:'0.5rem', fontWeight:800, background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', color:'#fff', padding:'1px 5px', borderRadius:'6px', letterSpacing:'0.5px' }}>PREMIUM</span>
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
              </ul>
            </>
            ) : (
            /* ── Outros perfis (diretor, coordenador): toggle colapsável ── */
            <>
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-6 transition"
              // Militares: submenu sempre fixo, não permite colapsar
              onClick={() => !isMilitar && setOpenGroup(openGroup === 'disciplinar' ? null : 'disciplinar')}
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
                    to="/disciplinar/fo-coletivo"
                    className={getSubmenuLinkClasses('/disciplinar/fo-coletivo')}
                    style={{
                      background: isActive('/disciplinar/fo-coletivo')
                        ? 'linear-gradient(90deg, rgba(239,68,68,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <BoltIcon className="h-5 w-5 mr-2" style={{ color: isActive('/disciplinar/fo-coletivo') ? '#f87171' : undefined }} />
                    <span className="flex-1">F.O. Coletivo</span>
                    <span style={{ fontSize:'0.5rem', fontWeight:800, background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', padding:'1px 5px', borderRadius:'6px', letterSpacing:'0.5px' }}>NOVO</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/disciplinar/historico"
                    className={getSubmenuLinkClasses('/disciplinar/historico')}
                    style={{
                      background: isActive('/disciplinar/historico')
                        ? 'linear-gradient(90deg, rgba(245,158,11,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <ClockIcon className="h-5 w-5 mr-2" style={{ color: isActive('/disciplinar/historico') ? '#f59e0b' : undefined }} />
                    <span className="flex-1">Histórico</span>
                    <span style={{ fontSize:'0.5rem', fontWeight:800, background:'linear-gradient(135deg,#f59e0b,#ea580c)', color:'#fff', padding:'1px 5px', borderRadius:'6px', letterSpacing:'0.5px' }}>NOVO</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/disciplinar/atas"
                    className={getSubmenuLinkClasses('/disciplinar/atas')}
                    style={{
                      background: isActive('/disciplinar/atas')
                        ? 'linear-gradient(90deg, rgba(30,58,138,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" style={{ color: isActive('/disciplinar/atas') ? '#1e3a8a' : undefined }} />
                    <span className="flex-1">Atas</span>
                    <span style={{ fontSize:'0.5rem', fontWeight:800, background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', color:'#fff', padding:'1px 5px', borderRadius:'6px', letterSpacing:'0.5px' }}>PREMIUM</span>
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
              </ul>
            )}
            </>
            )}
          </>
        )}

        {/* ───────────────────────────────
            MENUS INDEPENDENTES: Regimentos, Manual, Suporte
            (Acessíveis a qualquer usuário logado)
        ─────────────────────────────── */}
        {isScopeEscola && (
          <>
            <Link
              to="/disciplinar/regimentos"
              className={getMainLinkClasses('/disciplinar/regimentos')}
              style={{ marginTop: 8 }}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" /> Regimentos
            </Link>

            <Link
              to="/disciplinar/manual"
              className={getMainLinkClasses('/disciplinar/manual')}
            >
              <BookOpenIcon className="h-5 w-5 mr-2" /> Manual
            </Link>

            <Link
              to="/disciplinar/suporte"
              className={getMainLinkClasses('/disciplinar/suporte')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5 mr-2" /> Suporte
            </Link>
          </>
        )}

        {canAgenteEduca && (
          <>
            {/* ───────────────────────────────
                GRUPO: Agente EDUCA
            ─────────────────────────────── */}
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-6 transition"
              onClick={() => setOpenGroup(openGroup === 'agente-educa' ? null : 'agente-educa')}
              type="button"
              style={{
                background: openGroup === 'agente-educa'
                  ? 'linear-gradient(90deg, rgba(234,179,8,0.15), transparent)'
                  : undefined,
              }}
            >
              <BoltIcon className="h-5 w-5 mr-2" style={{ color: openGroup === 'agente-educa' ? '#eab308' : undefined }} />
              <span className="flex-1 text-left font-bold">Agente EDUCA</span>
              {openGroup === 'agente-educa' ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {openGroup === 'agente-educa' && (
              <ul className="ml-4 mb-2">
                <li>
                  <Link
                    to="/agente-educa/credenciais"
                    className={getSubmenuLinkClasses('/agente-educa/credenciais')}
                  >
                    <Cog6ToothIcon className="h-5 w-5 mr-2" /> Credenciais
                    <span style={{
                      marginLeft: 6, fontSize: '0.52rem', fontWeight: 800,
                      background: 'linear-gradient(135deg,#475569,#64748b)',
                      color: '#fff', padding: '1px 5px', borderRadius: 6,
                      letterSpacing: '0.4px', whiteSpace: 'nowrap',
                    }}>ETAPA 0</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/agente-educa/planos"
                    className={getSubmenuLinkClasses('/agente-educa/planos')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                    Planos
                    <span style={{
                      marginLeft: 6, fontSize: '0.52rem', fontWeight: 800,
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      color: '#fff', padding: '1px 5px', borderRadius: 6,
                      letterSpacing: '0.4px',
                    }}>ETAPA 1</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/agente-educa/notas"
                    className={getSubmenuLinkClasses('/agente-educa/notas')}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Notas
                    <span style={{
                      marginLeft: 6, fontSize: '0.52rem', fontWeight: 800,
                      background: 'linear-gradient(135deg,#10b981,#0891b2)',
                      color: '#fff', padding: '1px 5px', borderRadius: 6,
                      letterSpacing: '0.4px',
                    }}>ETAPA 2</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* ─── GRUPO: Secretaria (Professor NÃO tem acesso) ─── */}
            {!isProfessor && (
            <>
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

                {/* Relatórios */}
                <li>
                  <Link
                    to="/secretaria/relatorios"
                    className={getSubmenuLinkClasses('/secretaria/relatorios')}
                    style={{
                      background: isActive('/secretaria/relatorios')
                        ? 'linear-gradient(90deg, rgba(99,102,241,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" style={{ color: isActive('/secretaria/relatorios') ? '#818cf8' : undefined }} />
                    <span className="flex-1">Relatórios</span>
                    <span style={{
                      fontSize: '0.5rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff',
                      padding: '1px 5px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px',
                    }}>NOVO</span>
                  </Link>
                </li>

                {/* Sincronizar SEEDF */}
                <li>
                  <Link
                    to="/secretaria/sincronizar-seedf"
                    className={getSubmenuLinkClasses('/secretaria/sincronizar-seedf')}
                    style={{
                      background: isActive('/secretaria/sincronizar-seedf')
                        ? 'linear-gradient(90deg, rgba(59,130,246,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="flex-1">Sincronizar SEEDF</span>
                    <span style={{
                      fontSize: '0.5rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: '#fff',
                      padding: '1px 5px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px',
                    }}>NOVO</span>
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
                      to="/pedagogico/conteudos-programaticos"
                      className={getSubmenuLinkClasses('/pedagogico/conteudos-programaticos')}
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

                {/* Gabarito migrado para menu unificado (/gabarito) */}

                {/* Relatórios Pedagógicos */}
                <li>
                  <Link
                    to="/pedagogico/relatorios"
                    className={getSubmenuLinkClasses('/pedagogico/relatorios')}
                    style={{
                      background: isActive('/pedagogico/relatorios')
                        ? 'linear-gradient(90deg, rgba(99,102,241,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" style={{ color: isActive('/pedagogico/relatorios') ? '#818cf8' : undefined }} />
                    <span className="flex-1">Relatórios</span>
                    <span style={{
                      fontSize: '0.5rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff',
                      padding: '1px 5px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px',
                    }}>NOVO</span>
                  </Link>
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
                GRUPO: Frequência
            ─────────────────────────────── */}
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
              onClick={() => setOpenGroup(openGroup === 'frequencia' ? null : 'frequencia')}
              type="button"
              style={{
                background: openGroup === 'frequencia'
                  ? 'linear-gradient(90deg, rgba(16,185,129,0.15), transparent)'
                  : undefined,
              }}
            >
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" style={{ color: openGroup === 'frequencia' ? '#10b981' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 700 }}>Frequência</span>
              <span style={{
                fontSize: '0.5rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #10b981, #0891b2)',
                color: '#fff',
                padding: '1px 5px',
                borderRadius: '6px',
                letterSpacing: '0.5px',
                marginRight: 4,
              }}>NOVO</span>
              {openGroup === 'frequencia' ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {openGroup === 'frequencia' && (
              <ul className="ml-4 mb-2">
                <li>
                  <Link
                    to="/frequencia/atestados"
                    className={getSubmenuLinkClasses('/frequencia/atestados')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" /> Atestados
                  </Link>
                </li>
                <li>
                  <Link
                    to="/frequencia/relatorios"
                    className={getSubmenuLinkClasses('/frequencia/relatorios')}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" /> Relatórios
                  </Link>
                </li>
                <li>
                  <Link
                    to="/frequencia/busca-ativa"
                    className={getSubmenuLinkClasses('/frequencia/busca-ativa')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Busca Ativa
                  </Link>
                </li>
                <li>
                  <Link
                    to="/frequencia/conselho-tutelar"
                    className={getSubmenuLinkClasses('/frequencia/conselho-tutelar')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Conselho Tutelar
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {isScopeEscola && !isDisciplinar && !isProfessor && !isCoord && (
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
                <li>
                  <Link
                    to="/impressao/documentos"
                    className={getSubmenuLinkClasses('/impressao/documentos')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    <span className="flex-1">Documentos</span>
                    <span style={{
                      fontSize: '0.5rem', fontWeight: 800,
                      background: 'linear-gradient(135deg, #1e3a5f, #1565a0)',
                      color: '#fff', padding: '1px 5px', borderRadius: '6px',
                      letterSpacing: '0.5px',
                    }}>NOVO</span>
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
