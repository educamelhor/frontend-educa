// src/features/home/Home.jsx
// ============================================================================
// Dashboard HOME — Educa.Melhor
// Cards contextuais por perfil + indicadores da API + atalhos de módulos
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// ─── Ícones SVG inline ───────────────────────────────────────────────────────
const Icons = {
  Alunos: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Turmas: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Professores: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Ocorrencias: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Gabarito: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Livro: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Camera: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Frequencia: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Impressao: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  Agente: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Planos: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Secretaria: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Pedagogico: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  Visitantes: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPerfil() {
  return String(localStorage.getItem('perfil') || '').toLowerCase().trim();
}
function getNome() {
  return localStorage.getItem('nome') || localStorage.getItem('usuario') || '';
}
function getEscolaNome() {
  return localStorage.getItem('escola_nome') || localStorage.getItem('escola') || 'Educa.Melhor';
}
function getEscolaId() {
  return localStorage.getItem('escola_id') || '';
}
function getModulos() {
  try {
    const raw = localStorage.getItem('modulos_ativos');
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch { return null; }
}
function hasModulo(mod) {
  const mods = getModulos();
  return mods === null || mods.includes(mod);
}
function getHora() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
function formatarPerfil(p) {
  const map = {
    diretor: 'Diretor(a)',
    vice_diretor: 'Vice-Diretor(a)',
    coordenador: 'Coordenador(a)',
    supervisor: 'Supervisor(a)',
    secretario: 'Secretário(a)',
    secretaria: 'Secretário(a)',
    professor: 'Professor(a)',
    militar: 'Agente Disciplinar',
    comandante: 'Comandante',
    disciplinar: 'Agente Disciplinar',
    diretor_disciplinar: 'Diretor Disciplinar',
  };
  return map[p] || p;
}
function anoLetivo() {
  const m = new Date().getMonth() + 1; // 1-indexed
  return m <= 1 ? new Date().getFullYear() - 1 : new Date().getFullYear();
}

// ─── Card de Indicador ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sublabel, gradient, loading, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-95' : ''}`}
      style={{ background: gradient }}
    >
      <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
          {icon}
        </div>
        {onClick && (
          <div className="p-1 rounded-lg bg-white/10 mt-0.5 opacity-70">
            <Icons.ChevronRight />
          </div>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-9 w-20 rounded-lg bg-white/20 animate-pulse mb-1" />
        ) : (
          <div className="text-3xl font-bold tracking-tight">
            {value !== null && value !== undefined ? value.toLocaleString('pt-BR') : '—'}
          </div>
        )}
        <div className="text-sm font-semibold mt-1 text-white/90">{label}</div>
        {sublabel && <div className="text-xs text-white/65 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

// ─── Card de Atalho ───────────────────────────────────────────────────────────
function ShortcutCard({ icon, label, desc, to, badge, color }) {
  const navigate = useNavigate();
  const colorMap = {
    blue:    { bg: 'bg-blue-50 hover:bg-blue-100 border-blue-100',     icon: 'bg-blue-600 text-white',    text: 'text-blue-900',   badge: 'bg-blue-600'    },
    indigo:  { bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100', icon: 'bg-indigo-600 text-white', text: 'text-indigo-900', badge: 'bg-indigo-600'  },
    emerald: { bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100', icon: 'bg-emerald-600 text-white', text: 'text-emerald-900', badge: 'bg-emerald-600' },
    amber:   { bg: 'bg-amber-50 hover:bg-amber-100 border-amber-100',   icon: 'bg-amber-500 text-white',   text: 'text-amber-900',  badge: 'bg-amber-500'   },
    rose:    { bg: 'bg-rose-50 hover:bg-rose-100 border-rose-100',      icon: 'bg-rose-600 text-white',    text: 'text-rose-900',   badge: 'bg-rose-600'    },
    violet:  { bg: 'bg-violet-50 hover:bg-violet-100 border-violet-100', icon: 'bg-violet-600 text-white', text: 'text-violet-900', badge: 'bg-violet-600'  },
    cyan:    { bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-100',      icon: 'bg-cyan-600 text-white',    text: 'text-cyan-900',   badge: 'bg-cyan-600'    },
    teal:    { bg: 'bg-teal-50 hover:bg-teal-100 border-teal-100',      icon: 'bg-teal-600 text-white',    text: 'text-teal-900',   badge: 'bg-teal-600'    },
    orange:  { bg: 'bg-orange-50 hover:bg-orange-100 border-orange-100', icon: 'bg-orange-500 text-white', text: 'text-orange-900', badge: 'bg-orange-500'  },
    slate:   { bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200',   icon: 'bg-slate-600 text-white',   text: 'text-slate-900',  badge: 'bg-slate-600'   },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all duration-200 text-left group active:scale-95 ${c.bg}`}
    >
      <div className={`p-2.5 rounded-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${c.icon}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${c.text}`}>{label}</div>
        {desc && <div className="text-xs text-gray-500 mt-0.5 truncate">{desc}</div>}
      </div>
      {badge && (
        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full flex-shrink-0 ${c.badge}`}>
          {badge}
        </span>
      )}
      <span className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0">
        <Icons.ChevronRight />
      </span>
    </button>
  );
}

// ─── Skeleton de Atalho ───────────────────────────────────────────────────────
function SkeletonShortcut() {
  return (
    <div className="flex items-center gap-4 w-full p-4 rounded-xl border border-gray-100 bg-gray-50 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-28" />
        <div className="h-2.5 bg-gray-100 rounded w-40" />
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const perfil    = getPerfil();
  const nome      = getNome();
  const escolaNome = getEscolaNome();
  const escolaId  = getEscolaId();
  const ano       = anoLetivo();

  const isDiretor    = perfil === 'diretor' || perfil === 'vice_diretor';
  const isCoord      = perfil === 'coordenador';
  const isSupervisor = perfil === 'supervisor';
  const isSecretario = perfil === 'secretario' || perfil === 'secretaria';
  const isProfessor  = perfil === 'professor';
  const isMilitar    = perfil === 'militar' || perfil === 'comandante'
                    || perfil === 'disciplinar' || perfil === 'diretor_disciplinar';

  const isGestao = isDiretor || isCoord || isSupervisor;

  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);

  // ── Busca indicadores ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      const hoje = new Date().toISOString().slice(0, 10);

      try {
        const reqs = await Promise.allSettled([
          // [0] Alunos ativos (gestão + secretaria + professor)
          (!isMilitar)
            ? api.get(`/api/secretaria/relatorios/sintetico-matriculas?ano_letivo=${ano}`)
            : Promise.resolve(null),

          // [1] Turmas
          (!isMilitar)
            ? api.get(`/api/turmas?ano=${ano}`)
            : Promise.resolve(null),

          // [2] Professores (gestão)
          (isGestao || isSecretario)
            ? api.get('/api/professores')
            : Promise.resolve(null),

          // [3] Ocorrências este mês (gestão + militar)
          (isGestao || isMilitar)
            ? api.get('/api/registros-ocorrencias/historico?limit=1')
            : Promise.resolve(null),

          // [4] Visitantes hoje (gestão + monitoramento)
          (isGestao && hasModulo('monitoramento'))
            ? api.get(`/api/monitoramento/visitantes/historico?de=${hoje}&ate=${hoje}&pageSize=1`)
            : Promise.resolve(null),

          // [5] Atestados/Justificativas (gestão + professor)
          ((isGestao || isProfessor) && hasModulo('frequencia') && escolaId)
            ? api.get(`/api/frequencia/justificativas?escola_id=${escolaId}`)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const newStats = {};

        // [0] Total de alunos — endpoint sintetico-matriculas retorna { total_geral }
        const r0 = reqs[0].status === 'fulfilled' ? reqs[0].value : null;
        if (r0?.data?.total_geral !== undefined) {
          newStats.alunos = r0.data.total_geral;
        } else if (r0?.data) {
          newStats.alunos = extrairValor(r0.data, ['total_geral', 'total', 'count']);
        }

        // [1] Total de turmas — array de turmas
        const r1 = reqs[1].status === 'fulfilled' ? reqs[1].value : null;
        if (r1?.data) {
          if (Array.isArray(r1.data)) newStats.turmas = r1.data.length;
          else if (Array.isArray(r1.data.turmas)) newStats.turmas = r1.data.turmas.length;
          else newStats.turmas = extrairValor(r1.data, ['total', 'count']);
        }

        // [2] Total de professores — array
        const r2 = reqs[2].status === 'fulfilled' ? reqs[2].value : null;
        if (r2?.data) {
          if (Array.isArray(r2.data)) newStats.professores = r2.data.length;
          else newStats.professores = extrairValor(r2.data, ['total', 'count']);
        }

        // [3] Ocorrências — kpis.total
        const r3 = reqs[3].status === 'fulfilled' ? reqs[3].value : null;
        if (r3?.data?.kpis?.total !== undefined) {
          newStats.ocorrencias = r3.data.kpis.total;
        } else if (r3?.data) {
          newStats.ocorrencias = extrairValor(r3.data, ['total', 'count', 'kpis.total']);
        }

        // [4] Visitantes hoje — { total }
        const r4 = reqs[4].status === 'fulfilled' ? reqs[4].value : null;
        if (r4?.data) {
          newStats.visitantes = extrairValor(r4.data, ['total', 'count']);
        }

        // [5] Atestados — array de justificativas
        const r5 = reqs[5].status === 'fulfilled' ? reqs[5].value : null;
        if (r5?.data) {
          if (Array.isArray(r5.data)) newStats.atestados = r5.data.length;
          else newStats.atestados = extrairValor(r5.data, ['total', 'count']);
        }

        setStats(newStats);
      } catch (err) {
        console.warn('[Home] Erro ao buscar indicadores:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Cards de Indicadores por perfil ────────────────────────────────────────
  const statCards = useMemo(() => {
    const cards = [];

    if (!isMilitar) {
      cards.push({
        icon: <Icons.Alunos />,
        label: 'Estudantes',
        value: stats.alunos,
        sublabel: `Matriculados em ${ano}`,
        gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        onClick: isGestao ? () => navigate('/alunos') : undefined,
      });
      cards.push({
        icon: <Icons.Turmas />,
        label: 'Turmas',
        value: stats.turmas,
        sublabel: `Ano letivo ${ano}`,
        gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
        onClick: (isGestao || isSecretario) ? () => navigate('/secretaria/turmas') : undefined,
      });
    }

    if (isGestao || isSecretario) {
      cards.push({
        icon: <Icons.Professores />,
        label: 'Professores',
        value: stats.professores,
        sublabel: 'Corpo docente',
        gradient: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)',
        onClick: (isGestao || isSecretario) ? () => navigate('/secretaria/professores') : undefined,
      });
    }

    if (isGestao && hasModulo('monitoramento') && stats.visitantes !== undefined) {
      cards.push({
        icon: <Icons.Visitantes />,
        label: 'Visitantes Hoje',
        value: stats.visitantes,
        sublabel: 'Entradas registradas',
        gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 100%)',
        onClick: () => navigate('/monitoramento/visitantes/historico'),
      });
    }

    if (isGestao || isMilitar) {
      cards.push({
        icon: <Icons.Ocorrencias />,
        label: 'Ocorrências',
        value: stats.ocorrencias,
        sublabel: 'Total registrado',
        gradient: 'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)',
        onClick: () => navigate(isMilitar ? '/disciplinar/alunos' : '/disciplinar/alunos'),
      });
    }

    if ((isGestao || isProfessor) && hasModulo('frequencia') && stats.atestados !== undefined) {
      cards.push({
        icon: <Icons.Frequencia />,
        label: 'Atestados',
        value: stats.atestados,
        sublabel: 'Justificativas registradas',
        gradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
        onClick: () => navigate('/frequencia/atestados'),
      });
    }

    // Secretário: sem cards de disciplinar
    if (isSecretario) {
      return cards.filter(c => c.label !== 'Ocorrências');
    }

    return cards;
  }, [stats, isGestao, isMilitar, isSecretario, isProfessor, ano, navigate]);

  // ─── Atalhos contextuais por perfil ──────────────────────────────────────
  const atalhos = useMemo(() => {
    const all = [];

    if (isGestao) {
      if (hasModulo('secretaria.alunos'))
        all.push({ icon: <Icons.Alunos />, label: 'Estudantes', desc: 'Consultar e gerenciar alunos', to: '/alunos', color: 'blue' });
      if (hasModulo('secretaria'))
        all.push({ icon: <Icons.Secretaria />, label: 'Secretaria', desc: 'Turmas, professores e horários', to: '/secretaria/alunos', color: 'indigo' });
      if (hasModulo('pedagogico'))
        all.push({ icon: <Icons.Pedagogico />, label: 'Pedagógico', desc: 'Conselho, conteúdos e relatórios', to: '/pedagogico/conselho', color: 'emerald' });
      if (hasModulo('gabarito'))
        all.push({ icon: <Icons.Gabarito />, label: 'Gabarito', desc: 'Gerar, corrigir e visualizar resultados', to: '/gabarito', color: 'cyan', badge: 'NOVO' });
      if (hasModulo('frequencia'))
        all.push({ icon: <Icons.Frequencia />, label: 'Frequência', desc: 'Atestados, busca ativa e conselho tutelar', to: '/frequencia/atestados', color: 'teal' });
      if (hasModulo('biblioteca'))
        all.push({ icon: <Icons.Livro />, label: 'Biblioteca', desc: 'Acervo, empréstimos e ranking', to: '/biblioteca/acervo', color: 'amber', badge: 'NOVO' });
      if (hasModulo('monitoramento'))
        all.push({ icon: <Icons.Camera />, label: 'Monitoramento', desc: 'Painel ao vivo e controle de visitantes', to: '/monitoramento', color: 'violet' });
      if (hasModulo('impressao'))
        all.push({ icon: <Icons.Impressao />, label: 'Impressão', desc: 'Boletins, gabaritos e listas', to: '/impressao/boletins', color: 'slate' });
      if (hasModulo('agente_educa'))
        all.push({ icon: <Icons.Agente />, label: 'Agente EDUCA', desc: 'Automações e importações com IA', to: '/agente-educa/planos', color: 'orange', badge: 'IA' });
    }

    if (isSecretario) {
      all.push({ icon: <Icons.Alunos />, label: 'Alunos', desc: 'Cadastro e matrícula de estudantes', to: '/secretaria/alunos', color: 'blue' });
      all.push({ icon: <Icons.Secretaria />, label: 'Turmas', desc: 'Gerenciar turmas escolares', to: '/secretaria/turmas', color: 'indigo' });
      all.push({ icon: <Icons.Professores />, label: 'Professores', desc: 'Cadastro e ficha de docentes', to: '/secretaria/professores', color: 'emerald' });
      if (hasModulo('secretaria.boletim'))
        all.push({ icon: <Icons.Gabarito />, label: 'Boletim', desc: 'Editar notas e faltas', to: '/secretaria/boletim', color: 'amber' });
      if (hasModulo('secretaria.relatorios'))
        all.push({ icon: <Icons.Frequencia />, label: 'Relatórios', desc: 'Relatórios da secretaria', to: '/secretaria/relatorios', color: 'cyan', badge: 'NOVO' });
      all.push({ icon: <Icons.Agente />, label: 'Agente', desc: 'Importação automática de boletins', to: '/secretaria/agente', color: 'violet' });
    }

    if (isProfessor) {
      if (hasModulo('professores.planos'))
        all.push({ icon: <Icons.Planos />, label: 'Meus Planos', desc: 'Planos de aula e bimestral', to: '/professores/planos', color: 'blue' });
      if (hasModulo('professores.avaliacoes'))
        all.push({ icon: <Icons.Gabarito />, label: 'Avaliações', desc: 'Registrar notas e faltas', to: '/professores/avaliacoes', color: 'emerald' });
      if (hasModulo('professores.conteudos'))
        all.push({ icon: <Icons.Livro />, label: 'Conteúdos', desc: 'Conteúdos programáticos', to: '/professores/conteudos', color: 'amber' });
      if (hasModulo('professores.provas'))
        all.push({ icon: <Icons.Pedagogico />, label: 'Provas', desc: 'Gestão de provas', to: '/professores/provas', color: 'indigo' });
      if (hasModulo('gabarito'))
        all.push({ icon: <Icons.Gabarito />, label: 'Gabarito', desc: 'Corrigir e ver resultados', to: '/gabarito/corrigir', color: 'cyan' });
      if (hasModulo('frequencia'))
        all.push({ icon: <Icons.Frequencia />, label: 'Atestados', desc: 'Justificativas de alunos', to: '/frequencia/atestados', color: 'teal' });
      if (hasModulo('professores.conselho'))
        all.push({ icon: <Icons.Secretaria />, label: 'Conselho de Classe', desc: 'Participar do conselho', to: '/professores/conselho', color: 'violet' });
    }

    if (isMilitar) {
      all.push({ icon: <Icons.Ocorrencias />, label: 'Ocorrências', desc: 'Registrar e consultar F.O.', to: '/disciplinar/alunos', color: 'rose' });
      all.push({ icon: <Icons.Alunos />, label: 'Responsáveis', desc: 'Contato e notificações', to: '/disciplinar/responsaveis', color: 'amber' });
      all.push({ icon: <Icons.Agente />, label: 'F.O. Coletivo', desc: 'Registro de ocorrência em lote', to: '/disciplinar/fo-coletivo', color: 'orange' });
      all.push({ icon: <Icons.Frequencia />, label: 'Histórico', desc: 'Histórico disciplinar completo', to: '/disciplinar/historico', color: 'slate' });
      all.push({ icon: <Icons.Secretaria />, label: 'Atas', desc: 'Atas disciplinares', to: '/disciplinar/atas', color: 'indigo' });
      all.push({ icon: <Icons.Gabarito />, label: 'Liberação', desc: 'Liberação de alunos', to: '/disciplinar/liberacao', color: 'teal' });
    }

    return all;
  }, [isGestao, isSecretario, isProfessor, isMilitar]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const firstNameDisplay = nome ? nome.split(' ')[0] : formatarPerfil(perfil);

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn space-y-8 pb-8">

      {/* ── Hero de Boas-vindas ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-7 py-8 text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)' }}
      >
        {/* Esferas decorativas */}
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-64 h-32 rounded-full bg-blue-400/10 blur-2xl translate-y-1/2 pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-medium mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              {getHora()}, {firstNameDisplay}!
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
              {escolaNome}
            </h1>
            <p className="text-blue-300 text-sm mt-2">
              {formatarPerfil(perfil)} · Ano letivo {ano}
            </p>
          </div>

          {/* Data + Hora */}
          <div className="text-right hidden sm:block flex-shrink-0">
            <div className="text-4xl font-bold tabular-nums">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </div>
            <div className="text-blue-300 text-sm capitalize mt-0.5">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards de Indicadores ───────────────────────────────────────────── */}
      {(statCards.length > 0 || loading) && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-0.5">
            Indicadores
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl p-5 shadow-lg animate-pulse"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', opacity: 0.4 + i * 0.15 }}>
                    <div className="w-10 h-10 rounded-xl bg-white/20 mb-4" />
                    <div className="h-9 w-16 rounded-lg bg-white/20 mb-2" />
                    <div className="h-3 w-24 rounded bg-white/15" />
                  </div>
                ))
              : statCards.map((card, i) => (
                  <StatCard key={i} loading={false} {...card} />
                ))
            }
          </div>
        </section>
      )}

      {/* ── Atalhos de Módulos ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-0.5">
          Acesso rápido
        </h2>
        {loading && atalhos.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonShortcut key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {atalhos.map((item, i) => (
              <ShortcutCard key={i} {...item} />
            ))}
          </div>
        )}
      </section>

      {/* ── Rodapé ─────────────────────────────────────────────────────────── */}
      <div className="text-center text-xs text-gray-400 pt-2">
        EDUCA.MELHOR · Portal Escolar · {ano}
      </div>
    </div>
  );
}

// ─── Helper de extração segura de valores ────────────────────────────────────
function extrairValor(data, keys) {
  for (const key of keys) {
    const parts = key.split('.');
    let val = data;
    for (const p of parts) {
      if (val == null) break;
      val = val[p];
    }
    if (val !== undefined && val !== null && typeof val === 'number') return val;
    if (Array.isArray(val)) return val.length;
  }
  return null;
}
