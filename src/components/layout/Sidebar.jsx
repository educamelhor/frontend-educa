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

  // ─────────────────────────────────────────────────────────────
  // MÓDULOS — Licenciamento por escola (CEO configura)
  // null = sem restrição (backward compatible)
  // [] = nada licenciado
  // ['gabarito', 'gabarito.gerar'] = apenas esses
  // ─────────────────────────────────────────────────────────────
  const parseModulos = () => {
    try {
      const raw = localStorage.getItem('modulos_ativos');
      if (!raw) return null; // backward compatible: mostra tudo
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  };

  // Estado reativo: atualiza quando localStorage muda (ex: após login/logout)
  const [_modulos, setModulos] = React.useState(parseModulos);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'modulos_ativos' || e.key === null) {
        setModulos(parseModulos());
      }
    };
    window.addEventListener('storage', onStorage);
    // Relê ao montar E ao navegar (login redireciona para /home na mesma tab,
    // o evento 'storage' NÃO dispara na mesma tab — useLocation resolve isso)
    setModulos(parseModulos());
    return () => window.removeEventListener('storage', onStorage);
  }, [location.pathname]);

  // ── Garante que o refresh rode sempre após um page load (hard refresh incluído) ──
  // Ctrl+Shift+R no Chrome NÃO limpa sessionStorage, então o debounce ficaria bloqueado.
  useEffect(() => {
    sessionStorage.removeItem('modulos_last_refresh');
  }, []); // apenas na montagem do componente

  // ── Refresh automático: busca módulos atualizados do servidor ──
  // CEO muda configuração → escola reflete em até 30 segundos sem precisar de logout.
  useEffect(() => {
    const refreshFromServer = async () => {
      try {
        const lastRefresh = parseInt(sessionStorage.getItem('modulos_last_refresh') || '0');
        const agora = Date.now();
        const rawModulos = localStorage.getItem('modulos_ativos');
        // Bypass se modulos está [] (estado errado) OU se passou o debounce de 30s
        const modulosParecemVazios = rawModulos === '[]' || rawModulos === '';
        if (!modulosParecemVazios && agora - lastRefresh < 30 * 1000) return;

        const token = localStorage.getItem('token');
        if (!token) return;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiBase}/api/auth/modulos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.ok) return;

        sessionStorage.setItem('modulos_last_refresh', String(Date.now()));

        if (Array.isArray(data.modulos_ativos)) {
          const rawCurrent = localStorage.getItem('modulos_ativos');
          const current = rawCurrent && rawCurrent !== 'null'
            ? JSON.parse(rawCurrent) : [];
          const incoming = data.modulos_ativos;
          const sortedCurrent = Array.isArray(current)
            ? [...current].sort().join(',') : '';
          const sortedIncoming = [...incoming].sort().join(',');
          if (sortedCurrent !== sortedIncoming) {
            localStorage.setItem('modulos_ativos', JSON.stringify(incoming));
            setModulos(incoming);
          }
        } else if (data.modulos_ativos === null) {
          // CEO / super_admin / sem escola → acesso IRRESTRITO
          const rawCurrent = localStorage.getItem('modulos_ativos');
          if (rawCurrent && rawCurrent !== 'null') {
            localStorage.removeItem('modulos_ativos');
            setModulos(null);
          }
        }
      } catch (_) { /* silent fail */ }
    };
    refreshFromServer();
  }, [location.pathname]); // verifica a cada navegação

  // hasModulo: null = sem restrição = true; array = verifica se contém o módulo
  const hasModulo = (mod) => _modulos === null || _modulos.includes(mod);

  // ── Perfil do usuário logado ──
  const getPerfil = () =>
    String(localStorage.getItem('perfil') || '').toLowerCase().trim();
  const perfil = getPerfil();
  const isDisciplinar = perfil === 'disciplinar' || perfil === 'diretor_disciplinar' || perfil === 'militar';
  const isProfessor = perfil === 'professor';
  const isSecretario = perfil === 'secretario' || perfil === 'secretaria';

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
    if (!isScopeEscola || isDisciplinar) return;
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

  const isDirecao = perfil === 'diretor' || perfil === 'vice_diretor';
  const isBoletimManualEnabled = avaliacaoGovConfig?.["escola.permitir_boletim_manual"] === "1";
  const canSeeBoletimManual = isBoletimManualEnabled || isDirecao;

  // Quem pode ver o módulo Gabarito?
  // - Diretor / vice_diretor / secretaria: SEMPRE
  // - Coordenador: se coordenador.acessa_gabarito === '1'
  // - Supervisor: se supervisor.acessa_gabarito === '1'
  const isCoord = perfil === 'coordenador';
  const isSuperv = perfil === 'supervisor';
  const canGabarito = (() => {
    if (isDisciplinar) return false;          // militar/comandante: sem acesso
    if (!isScopeEscola) return false;
    if (isSecretario) return false; // secretário: sem acesso ao Gabarito
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
    else if (p.startsWith('/biblioteca')) setOpenGroup('biblioteca');
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
            {/* LINK: Plataforma - Dashboard */}
            <Link
              to="/plataforma/dashboard"
              className={getMainLinkClasses('/plataforma/dashboard')}
              style={{
                marginBottom: 4,
                background: isActive('/plataforma/dashboard')
                  ? 'linear-gradient(90deg, rgba(99,102,241,0.2), transparent)'
                  : undefined,
              }}
            >
              <HomeIcon className="h-5 w-5 mr-2" style={{ color: isActive('/plataforma/dashboard') ? '#818cf8' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 700 }}>Dashboard</span>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '8px',
                letterSpacing: '0.5px',
              }}>CEO</span>
            </Link>

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

            {/* LINK: Plataforma - Módulos */}
            <Link
              to="/plataforma/modulos"
              className={getMainLinkClasses('/plataforma/modulos')}
              style={{
                marginTop: 4,
                background: isActive('/plataforma/modulos')
                  ? 'linear-gradient(90deg, rgba(16,185,129,0.15), transparent)'
                  : undefined,
              }}
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" style={{ color: isActive('/plataforma/modulos') ? '#34d399' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 600 }}>Módulos</span>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '8px',
                letterSpacing: '0.5px',
              }}>LIC</span>
            </Link>

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
            {!isDisciplinar && !isProfessor && !isCoord && !isSecretario && (
            <Link to="/home" className={getMainLinkClasses('/home')}>
              <HomeIcon className="h-5 w-5 mr-2" />
              Home
            </Link>
            )}

            {/* LINK: Estudantes */}
            {!isDisciplinar && !isProfessor && !isCoord && !isSecretario && hasModulo('secretaria.alunos') && (
            <Link to="/alunos" className={getMainLinkClasses('/alunos')}>
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Estudantes
            </Link>
            )}

            {/* GRUPO: Professores (fora de Secretaria) */}
            {isProfessor && hasModulo('professores') ? (
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
              {hasModulo('professores.planos') && (
              <li>
                <Link
                  to="/professores/planos"
                  className={getSubmenuLinkClasses('/professores/planos')}
                >
                  <PencilSquareIcon className="h-5 w-5 mr-2" /> Planos
                </Link>
              </li>
              )}
              {hasModulo('professores.avaliacoes') && (
              <li>
                <Link
                  to="/professores/avaliacoes"
                  className={getSubmenuLinkClasses('/professores/avaliacoes')}
                >
                  <TableCellsIcon className="h-5 w-5 mr-2" /> Avaliações
                </Link>
              </li>
              )}
              {hasModulo('professores.conteudos') && (
              <li>
                <Link
                  to="/professores/conteudos"
                  className={getSubmenuLinkClasses('/professores/conteudos')}
                >
                  <BookOpenIcon className="h-5 w-5 mr-2" /> Conteúdos
                </Link>
              </li>
              )}
              {hasModulo('professores.provas') && (
              <li>
                <Link
                  to="/professores/provas"
                  className={getSubmenuLinkClasses('/professores/provas')}
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" /> Provas
                </Link>
              </li>
              )}
              {canSeeBoletimManual && hasModulo('professores.boletim') && (
                <li>
                  <Link
                    to="/professores/boletim"
                    className={getSubmenuLinkClasses('/professores/boletim')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Boletim
                  </Link>
                </li>
              )}
              {hasModulo('professores.conselho') && (
              <li>
                <Link
                  to="/professores/conselho"
                  className={getSubmenuLinkClasses('/professores/conselho')}
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" /> Conselho de Classe
                </Link>
              </li>
              )}
            </ul>

            </>
            ) : !isDisciplinar && !isCoord && !isSecretario && hasModulo('professores') && (
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
                {hasModulo('professores.planos') && (
                <li>
                  <Link
                    to="/professores/planos"
                    className={getSubmenuLinkClasses('/professores/planos')}
                  >
                    <PencilSquareIcon className="h-5 w-5 mr-2" /> Planos
                  </Link>
                </li>
                )}
                {hasModulo('professores.avaliacoes') && (
                <li>
                  <Link
                    to="/professores/avaliacoes"
                    className={getSubmenuLinkClasses('/professores/avaliacoes')}
                  >
                    <TableCellsIcon className="h-5 w-5 mr-2" /> Avaliações
                  </Link>
                </li>
                )}
                {hasModulo('professores.conteudos') && (
                <li>
                  <Link
                    to="/professores/conteudos"
                    className={getSubmenuLinkClasses('/professores/conteudos')}
                  >
                    <BookOpenIcon className="h-5 w-5 mr-2" /> Conteúdos
                  </Link>
                </li>
                )}
                {hasModulo('professores.provas') && (
                <li>
                  <Link
                    to="/professores/provas"
                    className={getSubmenuLinkClasses('/professores/provas')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" /> Provas
                  </Link>
                </li>
                )}
                {canSeeBoletimManual && hasModulo('professores.boletim') && (
                  <li>
                    <Link
                      to="/professores/boletim"
                      className={getSubmenuLinkClasses('/professores/boletim')}
                    >
                      <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Boletim
                    </Link>
                  </li>
                )}
                {hasModulo('professores.conselho') && (
                <li>
                  <Link
                    to="/professores/conselho"
                    className={getSubmenuLinkClasses('/professores/conselho')}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" /> Conselho de Classe
                  </Link>
                </li>
                )}
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
            {canBancoQuestoes && hasModulo('questoes') && (
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
            {!isDisciplinar && !isProfessor && !isCoord && !isSecretario && hasModulo('ferramentas') && (
            <Link to="/ferramentas" className={getMainLinkClasses('/ferramentas')}>
              <WrenchIcon className="h-5 w-5 mr-2" />
              Ferramentas
            </Link>
            )}

            {/* ────────────────────────────────
                GRUPO: BIBLIOTECA
                Acesso: direção, coordenação, supervisão, sala recurso
                Restrito: professor, militar/disciplinar, coordenador de turma
            ──────────────────────────────── */}
            {isScopeEscola && !isDisciplinar && !isProfessor && !isCoord && !isSecretario && hasModulo('biblioteca') && (
            <>
            <button
              className="flex items-center w-full py-2 px-3 rounded hover:bg-blue-700 mt-2 transition"
              onClick={() => setOpenGroup(openGroup === 'biblioteca' ? null : 'biblioteca')}
              type="button"
              style={{
                background: openGroup === 'biblioteca'
                  ? 'linear-gradient(90deg, rgba(16,185,129,0.18), transparent)'
                  : undefined,
              }}
            >
              <BookOpenIcon className="h-5 w-5 mr-2" style={{ color: openGroup === 'biblioteca' ? '#34d399' : undefined }} />
              <span className="flex-1 text-left" style={{ fontWeight: 700 }}>Biblioteca</span>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '8px',
                letterSpacing: '0.5px',
                marginRight: 4,
              }}>NOVO</span>
              {openGroup === 'biblioteca' ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>

            {openGroup === 'biblioteca' && (
              <ul className="ml-4 mb-2">
                {hasModulo('biblioteca.acervo') && (
                <li>
                  <Link
                    to="/biblioteca/acervo"
                    className={getSubmenuLinkClasses('/biblioteca/acervo')}
                    style={{
                      background: isActive('/biblioteca/acervo')
                        ? 'linear-gradient(90deg, rgba(16,185,129,0.18), transparent)'
                        : undefined,
                    }}
                  >
                    <BookOpenIcon className="h-5 w-5 mr-2" style={{ color: isActive('/biblioteca/acervo') ? '#34d399' : undefined }} />
                    <span className="flex-1">Acervo</span>
                  </Link>
                </li>
                )}
                {hasModulo('biblioteca.emprestimos') && (
                <li>
                  <Link
                    to="/biblioteca/emprestimos"
                    className={getSubmenuLinkClasses('/biblioteca/emprestimos')}
                    style={{
                      background: isActive('/biblioteca/emprestimos')
                        ? 'linear-gradient(90deg, rgba(59,130,246,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" style={{ color: isActive('/biblioteca/emprestimos') ? '#60a5fa' : undefined }} />
                    <span className="flex-1">Empréstimos</span>
                  </Link>
                </li>
                )}
                {hasModulo('biblioteca.alunos') && (
                <li>
                  <Link
                    to="/biblioteca/alunos"
                    className={getSubmenuLinkClasses('/biblioteca/alunos')}
                    style={{
                      background: isActive('/biblioteca/alunos')
                        ? 'linear-gradient(90deg, rgba(139,92,246,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" style={{ color: isActive('/biblioteca/alunos') ? '#a78bfa' : undefined }} />
                    <span className="flex-1">Alunos Leitores</span>
                  </Link>
                </li>
                )}
                {hasModulo('biblioteca.leitor_destaque') && (
                <li>
                  <Link
                    to="/biblioteca/leitor-destaque"
                    className={getSubmenuLinkClasses('/biblioteca/leitor-destaque')}
                    style={{
                      background: isActive('/biblioteca/leitor-destaque')
                        ? 'linear-gradient(90deg, rgba(245,158,11,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <span className="mr-2 text-base" style={{ lineHeight: 1 }}>⭐</span>
                    <span className="flex-1" style={{ color: isActive('/biblioteca/leitor-destaque') ? '#fbbf24' : undefined }}>Leitor Destaque</span>
                  </Link>
                </li>
                )}
                {hasModulo('biblioteca.concurso') && (
                <li>
                  <Link
                    to="/biblioteca/concurso"
                    className={getSubmenuLinkClasses('/biblioteca/concurso')}
                    style={{
                      background: isActive('/biblioteca/concurso')
                        ? 'linear-gradient(90deg, rgba(20,184,166,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" style={{ color: isActive('/biblioteca/concurso') ? '#2dd4bf' : undefined }} />
                    <span className="flex-1">Ranking & Concurso</span>
                  </Link>
                </li>
                )}
                {hasModulo('biblioteca.metadados') && (
                <li>
                  <Link
                    to="/biblioteca/metadados"
                    className={getSubmenuLinkClasses('/biblioteca/metadados')}
                    style={{
                      background: isActive('/biblioteca/metadados')
                        ? 'linear-gradient(90deg, rgba(100,116,139,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <TableCellsIcon className="h-5 w-5 mr-2" style={{ color: isActive('/biblioteca/metadados') ? '#94a3b8' : undefined }} />
                    <span className="flex-1">Painel / Metadados</span>
                  </Link>
                </li>
                )}
              </ul>
            )}
            </>
            )}
          </>
        )}

        {/* ═══════════════════════════════
            MÓDULO GABARITO UNIFICADO
            Professor/Coord: Corrigir + Resultados
            Direção/Supervisor: TODAS as etapas
            Secretário/Militar: sem acesso
        ═══════════════════════════════ */}
        {canGabarito && hasModulo('gabarito') && (
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
                {canGabaritoAdmin && hasModulo('gabarito.gerar') && (
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
                {canGabaritoAdmin && hasModulo('gabarito.corrigir_lote') && (
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
                {hasModulo('gabarito.corrigir') && (
                <li>
                  <Link
                    to="/gabarito/corrigir"
                    className={getSubmenuLinkClasses('/gabarito/corrigir', true)}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" /> Corrigir
                  </Link>
                </li>
                )}
                {/* Resultados — todos com canGabarito */}
                {hasModulo('gabarito.resultados') && (
                <li>
                  <Link
                    to="/gabarito/resultados"
                    className={getSubmenuLinkClasses('/gabarito/resultados')}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" /> Resultados
                  </Link>
                </li>
                )}
              </ul>
            )}
          </>
        )}

        {/* ───────────────────────────────
            GRUPO: Direção (Diretor)
            (Dispositivos EDUCA-CAPTURE)
        ─────────────────────────────── */}
        {(canDirecaoDevices || canGovernanca) && hasModulo('direcao') && (
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
                {hasModulo('direcao.educa_capture') && (
                <li>
                  <Link
                    to="/direcao/diretor"
                    className={getSubmenuLinkClasses('/direcao/diretor', true)}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Educa-Capture
                  </Link>
                </li>
                )}
                {hasModulo('direcao.responsaveis') && (
                <li>
                  <Link
                    to="/direcao/responsaveis"
                    className={getSubmenuLinkClasses('/direcao/responsaveis', true)}
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" /> Responsáveis
                  </Link>
                </li>
                )}
                {hasModulo('direcao.cadastro') && (
                <li>
                  <Link
                    to="/direcao/cadastro"
                    className={getSubmenuLinkClasses('/direcao/cadastro', true)}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Cadastro
                  </Link>
                </li>
                )}
                {canGovernanca && hasModulo('direcao.governanca') && (
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
        {canMonitoramento && hasModulo('monitoramento') && (
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
                {hasModulo('monitoramento.painel') && (
                <li>
                  {/* Match EXATO para não ficar ativo em /monitoramento/visitantes/... */}
                  <Link
                    to="/monitoramento"
                    className={getSubmenuLinkClasses('/monitoramento', true)}
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" /> Painel ao vivo
                  </Link>
                </li>
                )}

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
                {hasModulo('monitoramento.embeddings') && (
                <li>
                  <Link
                    to="/monitoramento/embeddings"
                    className={getSubmenuLinkClasses('/monitoramento/embeddings')}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" /> Embeddings — Gerar
                  </Link>
                </li>
                )}
              </ul>
            )}
          </>
        )}








        {isScopeEscola && !isProfessor && !isCoord && !isSecretario && hasModulo('disciplinar') && (
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
                {hasModulo('disciplinar.alunos') && (
                <li>
                  <Link
                    to="/disciplinar/alunos"
                    className={getSubmenuLinkClasses('/disciplinar/alunos')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Alunos
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.responsaveis') && (
                <li>
                  <Link
                    to="/disciplinar/responsaveis"
                    className={getSubmenuLinkClasses('/disciplinar/responsaveis')}
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" /> Responsáveis
                  </Link>
                </li>
                )}
                {(perfil === 'diretor' || perfil === 'militar') && hasModulo('disciplinar.equipe') && (
                <li>
                  <Link
                    to="/disciplinar/equipe"
                    className={getSubmenuLinkClasses('/disciplinar/equipe')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Gestão de Equipe
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.fo_coletivo') && (
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
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.historico') && (
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
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.atas') && (
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
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.liberacao') && (
                <li>
                  <Link
                    to="/disciplinar/liberacao"
                    className={getSubmenuLinkClasses('/disciplinar/liberacao')}
                    style={{
                      background: isActive('/disciplinar/liberacao')
                        ? 'linear-gradient(90deg, rgba(5,150,105,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" style={{ color: isActive('/disciplinar/liberacao') ? '#059669' : undefined }} />
                    <span className="flex-1">Liberação</span>
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.metadados') && (
                <li>
                  <Link
                    to="/disciplinar/metadados"
                    className={getSubmenuLinkClasses('/disciplinar/metadados')}
                  >
                    <TableCellsIcon className="h-5 w-5 mr-2" /> Metadados
                  </Link>
                </li>
                )}
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
                {hasModulo('disciplinar.alunos') && (
                <li>
                  <Link
                    to="/disciplinar/alunos"
                    className={getSubmenuLinkClasses('/disciplinar/alunos')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Alunos
                  </Link>
                </li>
                )}
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
                {hasModulo('disciplinar.responsaveis') && (
                <li>
                  <Link
                    to="/disciplinar/responsaveis"
                    className={getSubmenuLinkClasses('/disciplinar/responsaveis')}
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" /> Responsáveis
                  </Link>
                </li>
                )}
                {(perfil === 'diretor' || perfil === 'militar') && hasModulo('disciplinar.equipe') && (
                <li>
                  <Link
                    to="/disciplinar/equipe"
                    className={getSubmenuLinkClasses('/disciplinar/equipe')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Gestão de Equipe
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.fo_coletivo') && (
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
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.historico') && (
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
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.atas') && (
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
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.liberacao') && (
                <li>
                  <Link
                    to="/disciplinar/liberacao"
                    className={getSubmenuLinkClasses('/disciplinar/liberacao')}
                    style={{
                      background: isActive('/disciplinar/liberacao')
                        ? 'linear-gradient(90deg, rgba(5,150,105,0.15), transparent)'
                        : undefined,
                    }}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" style={{ color: isActive('/disciplinar/liberacao') ? '#059669' : undefined }} />
                    <span className="flex-1">Liberação</span>
                  </Link>
                </li>
                )}
                {hasModulo('disciplinar.metadados') && (
                <li>
                  <Link
                    to="/disciplinar/metadados"
                    className={getSubmenuLinkClasses('/disciplinar/metadados')}
                  >
                    <TableCellsIcon className="h-5 w-5 mr-2" /> Metadados
                  </Link>
                </li>
                )}
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
        {isScopeEscola && !isSecretario && (
          <>
            {hasModulo('disciplinar.regimentos') && (
            <Link
              to="/disciplinar/regimentos"
              className={getMainLinkClasses('/disciplinar/regimentos')}
              style={{ marginTop: 8 }}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" /> Regimentos
            </Link>
            )}

            {hasModulo('disciplinar.manual') && (
            <Link
              to="/disciplinar/manual"
              className={getMainLinkClasses('/disciplinar/manual')}
            >
              <BookOpenIcon className="h-5 w-5 mr-2" /> Manual
            </Link>
            )}

            <Link
              to="/disciplinar/suporte"
              className={getMainLinkClasses('/disciplinar/suporte')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5 mr-2" /> Suporte
            </Link>
          </>
        )}

        {canAgenteEduca && hasModulo('agente_educa') && (
          <>
            {/* ───────────────────────────────
                GRUPO: Agente EDUCA
            ─────────────────────────────── */}
            {!isSecretario && (
              <>
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
                    {hasModulo('agente_educa.credenciais') && (
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
                    )}
                    {hasModulo('agente_educa.planos') && (
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
                    )}
                    {hasModulo('agente_educa.notas') && (
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
                    )}
                  </ul>
                )}
              </>
            )}

            {/* ─── GRUPO: Secretaria (Professor NÃO tem acesso) ─── */}
            {!isProfessor && hasModulo('secretaria') && (
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
                {hasModulo('secretaria.alunos') && (
                <li>
                  <Link
                    to="/secretaria/alunos"
                    className={getSubmenuLinkClasses('/secretaria/alunos')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Alunos
                  </Link>
                </li>
                )}

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

                {hasModulo('secretaria.modulacao') && (
                <li>
                  <Link
                    to="/secretaria/modulacao"
                    className={getSubmenuLinkClasses('/secretaria/modulacao')}
                  >
                    <ClockIcon className="h-5 w-5 mr-2" /> Modulação
                  </Link>
                </li>
                )}

                {hasModulo('secretaria.horarios') && (
                <li>
                  <Link
                    to="/secretaria/horarios"
                    className={getSubmenuLinkClasses('/secretaria/horarios')}
                  >
                    <ClockIcon className="h-5 w-5 mr-2" /> Horários
                  </Link>
                </li>
                )}

                {hasModulo('secretaria.professores') && (
                <li>
                  <Link
                    to="/secretaria/professores"
                    className={getSubmenuLinkClasses('/secretaria/professores')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Professores
                  </Link>
                </li>
                )}

                <li>
                  <Link
                    to="/secretaria/turmas"
                    className={getSubmenuLinkClasses('/secretaria/turmas')}
                  >
                    <AcademicCapIcon className="h-5 w-5 mr-2" /> Turmas
                  </Link>
                </li>

                {/* NOVO SUBMENU: Boletim */}
                {hasModulo('secretaria.boletim') && (
                <li>
                  <Link
                    to="/secretaria/boletim"
                    className={getSubmenuLinkClasses('/secretaria/boletim')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" /> Boletim
                  </Link>
                </li>
                )}

                {/* NOVO SUBMENU: Agente */}
                <li>
                  <Link
                    to="/secretaria/agente"
                    className={getSubmenuLinkClasses('/secretaria/agente')}
                  >
                    <BoltIcon className="h-5 w-5 mr-2" /> Agente
                  </Link>
                </li>

                {hasModulo('secretaria.tabela_codigos') && (
                <li>
                  <Link
                    to="/secretaria/tabela-codigos"
                    className={getSubmenuLinkClasses('/secretaria/tabela-codigos')}
                  >
                    <TableCellsIcon className="h-5 w-5 mr-2" /> Tabela Códigos
                  </Link>
                </li>
                )}

                {/* Relatórios */}
                {hasModulo('secretaria.relatorios') && (
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
                )}

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

        {isScopeEscola && !isDisciplinar && !isProfessor && !isSecretario && hasModulo('pedagogico') && (
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
                {hasModulo('pedagogico.conselho') && (
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
                )}

                {canConteudos && hasModulo('pedagogico.conteudos') && (
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
                {hasModulo('pedagogico.relatorios') && (
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
                )}

              </ul>
            )}
          </>
        )}

        {isScopeEscola && !isDisciplinar && !isProfessor && !isSecretario && hasModulo('frequencia') && (
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
                {hasModulo('frequencia.atestados') && (
                <li>
                  <Link
                    to="/frequencia/atestados"
                    className={getSubmenuLinkClasses('/frequencia/atestados')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" /> Atestados
                  </Link>
                </li>
                )}
                {hasModulo('frequencia.relatorios') && (
                <li>
                  <Link
                    to="/frequencia/relatorios"
                    className={getSubmenuLinkClasses('/frequencia/relatorios')}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" /> Relatórios
                  </Link>
                </li>
                )}
                {hasModulo('frequencia.busca_ativa') && (
                <li>
                  <Link
                    to="/frequencia/busca-ativa"
                    className={getSubmenuLinkClasses('/frequencia/busca-ativa')}
                  >
                    <UsersIcon className="h-5 w-5 mr-2" /> Busca Ativa
                  </Link>
                </li>
                )}
                {hasModulo('frequencia.conselho_tutelar') && (
                <li>
                  <Link
                    to="/frequencia/conselho-tutelar"
                    className={getSubmenuLinkClasses('/frequencia/conselho-tutelar')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Conselho Tutelar
                  </Link>
                </li>
                )}
              </ul>
            )}
          </>
        )}

        {isScopeEscola && !isDisciplinar && !isProfessor && !isCoord && hasModulo('impressao') && (
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
                {hasModulo('impressao.boletins') && (
                <li>
                  <Link
                    to="/impressao/boletins"
                    className={getSubmenuLinkClasses('/impressao/boletins')}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" /> Boletins
                  </Link>
                </li>
                )}
                {hasModulo('impressao.gabaritos') && (
                <li>
                  <Link
                    to="/impressao/gabaritos"
                    className={getSubmenuLinkClasses('/impressao/gabaritos')}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" /> Gabaritos
                  </Link>
                </li>
                )}
                {hasModulo('impressao.listas') && (
                <li>
                  <Link
                    to="/impressao/listas"
                    className={getSubmenuLinkClasses('/impressao/listas')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" /> Listas
                  </Link>
                </li>
                )}
                {hasModulo('impressao.documentos') && (
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
                )}
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
