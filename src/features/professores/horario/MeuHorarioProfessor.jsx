import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  CalendarDaysIcon,
  ClockIcon,
  AcademicCapIcon,
  PrinterIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  UserCircleIcon,
  BuildingLibraryIcon,
  CheckBadgeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const DIAS_NOMES = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

const DIAS_CURTOS = {
  1: 'SEG',
  2: 'TER',
  3: 'QUA',
  4: 'QUI',
  5: 'SEX',
  6: 'SÁB',
};

const PALETA_TURMAS = [
  { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', sub: 'text-blue-700', badge: 'bg-blue-600 text-white', hexBg: '#eff6ff', hexBorder: '#93c5fd', hexText: '#1e3a8a' },
  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', sub: 'text-emerald-700', badge: 'bg-emerald-600 text-white', hexBg: '#ecfdf5', hexBorder: '#6ee7b7', hexText: '#064e3b' },
  { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-900', sub: 'text-violet-700', badge: 'bg-violet-600 text-white', hexBg: '#f5f3ff', hexBorder: '#c4b5fd', hexText: '#4c1d95' },
  { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', sub: 'text-amber-700', badge: 'bg-amber-600 text-white', hexBg: '#fffbeb', hexBorder: '#fcd34d', hexText: '#78350f' },
  { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-900', sub: 'text-rose-700', badge: 'bg-rose-600 text-white', hexBg: '#fff1f2', hexBorder: '#fda4af', hexText: '#881337' },
  { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-900', sub: 'text-cyan-700', badge: 'bg-cyan-600 text-white', hexBg: '#ecfeff', hexBorder: '#67e8f9', hexText: '#164e63' },
  { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', sub: 'text-indigo-700', badge: 'bg-indigo-600 text-white', hexBg: '#eef2ff', hexBorder: '#a5b4fc', hexText: '#312e81' },
  { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-900', sub: 'text-teal-700', badge: 'bg-teal-600 text-white', hexBg: '#f0fdfa', hexBorder: '#5eead4', hexText: '#134e4a' },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-300', text: 'text-fuchsia-900', sub: 'text-fuchsia-700', badge: 'bg-fuchsia-600 text-white', hexBg: '#fdf4ff', hexBorder: '#f0abfc', hexText: '#701a75' },
  { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900', sub: 'text-orange-700', badge: 'bg-orange-600 text-white', hexBg: '#fff7ed', hexBorder: '#fdba74', hexText: '#7c2d12' },
];

function getCorTurma(turmaId) {
  const num = Math.abs(Number(turmaId) || 0);
  return PALETA_TURMAS[num % PALETA_TURMAS.length];
}

export default function MeuHorarioProfessor() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [dados, setDados] = useState(null);
  const [turnoAtivo, setTurnoAtivo] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');
  const [buscaProf, setBuscaProf] = useState('');

  // Dia da semana atual (1=Seg .. 6=Sáb, 0=Dom)
  const diaHoje = useMemo(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 6 ? d : null;
  }, []);

  const carregarHorario = useCallback(async (profIdParam = '') => {
    setLoading(true);
    setErro(null);
    try {
      const params = {};
      if (profIdParam) params.professor_id = profIdParam;
      const { data } = await api.get('/api/grade/meu-horario', { params });
      setDados(data);

      if (data?.professor?.id && !profIdParam) {
        setSelectedProfId(String(data.professor.id));
      }

      if (Array.isArray(data?.turnos) && data.turnos.length > 0) {
        setTurnoAtivo((prev) => {
          const existe = data.turnos.some((t) => t.turno === prev);
          return existe ? prev : data.turnos[0].turno;
        });
      } else {
        setTurnoAtivo('');
      }
    } catch (err) {
      console.error('[MeuHorarioProfessor] Erro ao carregar horário:', err);
      setErro(
        err?.response?.data?.message ||
          'Não foi possível carregar a grade horária no momento.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarHorario(selectedProfId);
  }, [carregarHorario, selectedProfId]);

  const turnoObj = useMemo(() => {
    if (!dados?.turnos?.length) return null;
    return dados.turnos.find((t) => t.turno === turnoAtivo) || dados.turnos[0];
  }, [dados, turnoAtivo]);

  // Mapa rápido da grade ativa: `${dia}_${ordem}` -> slot
  const slotsMap = useMemo(() => {
    const map = new Map();
    if (!turnoObj?.slots) return map;
    for (const s of turnoObj.slots) {
      map.set(`${Number(s.dia_semana)}_${Number(s.periodo_ordem)}`, s);
    }
    return map;
  }, [turnoObj]);

  // Aulas de hoje (em todos os turnos do professor)
  const aulasDeHoje = useMemo(() => {
    if (!diaHoje || !Array.isArray(dados?.turnos)) return [];
    const lista = [];
    for (const t of dados.turnos) {
      for (const s of t.slots || []) {
        if (Number(s.dia_semana) === diaHoje) {
          lista.push({
            ...s,
            turnoLabel: t.turno,
          });
        }
      }
    }
    return lista.sort((a, b) => {
      if (a.turnoLabel !== b.turnoLabel) return a.turnoLabel.localeCompare(b.turnoLabel);
      return Number(a.periodo_ordem) - Number(b.periodo_ordem);
    });
  }, [dados, diaHoje]);

  // Resumo por Turma + Disciplina no turno ativo
  const resumoTurmas = useMemo(() => {
    if (!turnoObj?.slots) return [];
    const map = new Map();
    for (const s of turnoObj.slots) {
      const k = `${s.turma_id}_${s.disciplina_id}`;
      if (!map.has(k)) {
        map.set(k, {
          turma_id: s.turma_id,
          turma_nome: s.turma_nome,
          serie: s.serie,
          disciplina_id: s.disciplina_id,
          disciplina_nome: s.disciplina_nome,
          disciplina_sigla: s.disciplina_sigla,
          aulas: 0,
          dias: new Set(),
        });
      }
      const item = map.get(k);
      item.aulas += 1;
      item.dias.add(Number(s.dia_semana));
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.turma_nome).localeCompare(String(b.turma_nome), 'pt-BR')
    );
  }, [turnoObj]);

  // Total de turmas distintas atendidas pelo professor
  const totalTurmasDistintas = useMemo(() => {
    if (!Array.isArray(dados?.turnos)) return 0;
    const set = new Set();
    for (const t of dados.turnos) {
      for (const s of t.slots || []) {
        if (s.turma_id) set.add(Number(s.turma_id));
      }
    }
    return set.size;
  }, [dados]);

  // Professores filtrados para o seletor da gestão
  const professoresFiltrados = useMemo(() => {
    const lista = Array.isArray(dados?.professores_escola) ? dados.professores_escola : [];
    if (!buscaProf.trim()) return lista;
    const q = buscaProf.trim().toLowerCase();
    return lista.filter((p) => String(p.nome || '').toLowerCase().includes(q));
  }, [dados?.professores_escola, buscaProf]);

  // Impressão Oficial em PDF (A4 Paisagem)
  const handleImprimirHorario = () => {
    if (!dados?.professor || !Array.isArray(dados?.turnos) || dados.turnos.length === 0) return;

    const escolaNome = dados?.escola?.nome || 'UNIDADE ESCOLAR';
    const profNome = dados.professor.nome || 'PROFESSOR(A)';
    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const paginasHtml = dados.turnos
      .map((tObj, idx) => {
        const dias = Array.isArray(tObj.dias_semana) && tObj.dias_semana.length > 0
          ? tObj.dias_semana
          : [1, 2, 3, 4, 5];
        const periodos = Array.isArray(tObj.periodos) ? tObj.periodos : [];
        const sMap = new Map();
        for (const s of tObj.slots || []) {
          sMap.set(`${Number(s.dia_semana)}_${Number(s.periodo_ordem)}`, s);
        }

        const linhasHtml = periodos
          .map((per) => {
            const pOrd = Number(per.ordem);
            const horarioStr =
              per.inicio && per.fim ? `${per.inicio} - ${per.fim}` : '';
            const colsHtml = dias
              .map((dia) => {
                const slot = sMap.get(`${Number(dia)}_${pOrd}`);
                if (!slot) {
                  return `<td style="border:1px solid #cbd5e1; padding:8px; text-align:center; color:#94a3b8; font-size:11px;">—</td>`;
                }
                const cor = getCorTurma(slot.turma_id);
                return `
                  <td style="border:1px solid #cbd5e1; padding:6px 8px; background:${cor.hexBg};">
                    <div style="font-weight:800; font-size:12px; color:${cor.hexText}; text-transform:uppercase;">
                      ${slot.turma_nome || `Turma ${slot.turma_id}`}
                    </div>
                    <div style="font-weight:600; font-size:10px; color:#334155; margin-top:2px;">
                      ${slot.disciplina_nome || slot.disciplina_sigla || ''}
                    </div>
                  </td>
                `;
              })
              .join('');

            return `
              <tr>
                <td style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc; text-align:center; font-weight:700; font-size:11px; color:#1e293b; width:115px;">
                  <div>${per.rotulo || `${pOrd}ª Aula`}</div>
                  ${horarioStr ? `<div style="font-size:10px; font-weight:500; color:#64748b; margin-top:2px;">${horarioStr}</div>` : ''}
                </td>
                ${colsHtml}
              </tr>
            `;
          })
          .join('');

        return `
          <div style="${idx > 0 ? 'page-break-before: always;' : ''} padding: 10px 0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:14px;">
              <div>
                <div style="font-size:15px; font-weight:800; color:#0f172a; text-transform:uppercase;">${escolaNome}</div>
                <div style="font-size:13px; font-weight:700; color:#1e40af; margin-top:3px;">
                  HORÁRIO INDIVIDUAL DO PROFESSOR — TURNO ${String(tObj.turno || '').toUpperCase()}
                </div>
                <div style="font-size:12px; color:#334155; margin-top:4px;">
                  <strong>Professor(a):</strong> ${profNome} &nbsp;|&nbsp;
                  <strong>Aulas no Turno:</strong> ${tObj.total_aulas || 0} aulas/semana &nbsp;|&nbsp;
                  <strong>Status:</strong> ${tObj.status === 'publicado' ? 'OFICIAL PUBLICADO' : 'EM ELABORAÇÃO (RASCUNHO)'}
                </div>
              </div>
              <div style="text-align:right; font-size:10px; color:#64748b;">
                <div>EDUCA.MELHOR — Gestão de Horários</div>
                <div>Emitido em ${dataGeracao}</div>
              </div>
            </div>

            <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
              <thead>
                <tr>
                  <th style="border:1px solid #94a3b8; background:#0f172a; color:#ffffff; padding:8px; font-size:11px; width:115px;">HORÁRIO / AULA</th>
                  ${dias
                    .map(
                      (d) =>
                        `<th style="border:1px solid #94a3b8; background:#0f172a; color:#ffffff; padding:8px; font-size:11px; text-transform:uppercase;">${
                          DIAS_NOMES[d] || `Dia ${d}`
                        }</th>`
                    )
                    .join('')}
                </tr>
              </thead>
              <tbody>
                ${linhasHtml}
              </tbody>
            </table>

            <div style="display:flex; justify-content:space-around; margin-top:38px; padding-top:12px; font-size:11px; color:#334155;">
              <div style="text-align:center; width:260px; border-top:1px solid #475569; padding-top:6px;">
                Assinatura do(a) Professor(a)<br/><strong>${profNome}</strong>
              </div>
              <div style="text-align:center; width:260px; border-top:1px solid #475569; padding-top:6px;">
                Coordenação Pedagógica / Direção
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const win = window.open('', '_blank', 'width=1120,height=800');
    if (!win) {
      alert('Permita pop-ups no navegador para gerar a impressão em PDF.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Horário Individual — ${profNome}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>
          ${paginasHtml}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 space-y-6">
      {/* CABEÇALHO PRINCIPAL */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                <CalendarDaysIcon className="w-4 h-4" />
                Portal do Professor
              </span>
              {dados?.escola?.nome && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  <BuildingLibraryIcon className="w-3.5 h-3.5 text-slate-500" />
                  {dados.escola.apelido || dados.escola.nome}
                </span>
              )}
              {turnoObj && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    turnoObj.status === 'publicado'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <CheckBadgeIcon className="w-4 h-4" />
                  {turnoObj.status === 'publicado'
                    ? 'Horário Oficial Publicado'
                    : 'Grade em Elaboração (Rascunho)'}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Meu Horário de Aulas
            </h1>

            <p className="text-sm text-slate-600">
              {dados?.professor ? (
                <>
                  Professor(a):{' '}
                  <span className="font-bold text-slate-900 uppercase">
                    {dados.professor.nome}
                  </span>
                </>
              ) : (
                'Consulte sua grade semanal de aulas por turno, horários de início/término e turmas.'
              )}
            </p>
          </div>

          {/* Ações Rápidas + Seletor de Professor (para Gestão) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {dados?.is_gestao && Array.isArray(dados?.professores_escola) && dados.professores_escola.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <UserCircleIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Visão Gestão — Professor(a)
                  </span>
                  <select
                    value={selectedProfId}
                    onChange={(e) => setSelectedProfId(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-2"
                  >
                    {professoresFiltrados.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => carregarHorario(selectedProfId)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
              title="Atualizar grade horária"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>

            <button
              type="button"
              onClick={handleImprimirHorario}
              disabled={!dados?.turnos?.length}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition cursor-pointer disabled:opacity-40"
            >
              <PrinterIcon className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>

            <button
              type="button"
              onClick={() => navigate('/professores/chamada')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition cursor-pointer"
            >
              <ClipboardDocumentCheckIcon className="w-4 h-4" />
              Ir para Chamada Digital
            </button>
          </div>
        </div>

        {/* CARDS DE INDICADORES RÁPIDOS */}
        {dados?.professor && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Carga Semanal na Grade
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {dados.total_aulas_semanais || 0}{' '}
                <span className="text-xs font-semibold text-slate-500">aulas/sem</span>
              </div>
            </div>

            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Turmas Atendidas
              </div>
              <div className="text-2xl font-extrabold text-indigo-700 mt-0.5">
                {totalTurmasDistintas}{' '}
                <span className="text-xs font-semibold text-slate-500">
                  {totalTurmasDistintas === 1 ? 'turma' : 'turmas'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Turnos Ativos
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                {dados?.turnos?.length || 0}{' '}
                <span className="text-xs font-semibold text-slate-500">
                  {(dados?.turnos || []).map((t) => t.turno).join(', ') || 'nenhum'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Aulas Hoje ({diaHoje ? DIAS_CURTOS[diaHoje] : 'DOM'})
              </div>
              <div className="text-2xl font-extrabold text-amber-600 mt-0.5">
                {aulasDeHoje.length}{' '}
                <span className="text-xs font-semibold text-slate-500">
                  {aulasDeHoje.length === 1 ? 'aula hoje' : 'aulas hoje'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ESTADO DE CARREGAMENTO OU ERRO */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <ArrowPathIcon className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Carregando sua grade horária...
          </p>
        </div>
      ) : erro ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-sm font-medium">
          {erro}
        </div>
      ) : !dados?.turnos?.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <AcademicCapIcon className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">
            Nenhuma grade horária localizada
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            {dados?.mensagem ||
              'A Secretaria Escolar ainda não publicou ou salvou horários vinculados ao seu cadastro neste ano letivo.'}
          </p>
        </div>
      ) : (
        <>
          {/* FAIXA INTELIGENTE: AULAS DE HOJE */}
          {diaHoje && aulasDeHoje.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
                    <SparklesIcon className="w-5 h-5 text-indigo-300" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight">
                      Suas Aulas de Hoje — {DIAS_NOMES[diaHoje]}
                    </h2>
                    <p className="text-xs text-indigo-200">
                      Sequência rápida das suas turmas do dia para facilitar o registro de presença e conteúdo.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/professores/chamada')}
                  className="self-start md:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-indigo-50 transition cursor-pointer"
                >
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-indigo-600" />
                  Abrir Chamada do Dia
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {aulasDeHoje.map((aula, idx) => (
                  <div
                    key={`${aula.turnoLabel}_${aula.periodo_ordem}_${idx}`}
                    className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/15 rounded-xl p-3 transition"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-200 mb-1">
                      <span>
                        {aula.periodo_ordem}ª Aula • {aula.turnoLabel.toUpperCase()}
                      </span>
                      {aula.hora_inicio && aula.hora_fim && (
                        <span className="text-emerald-300">
                          {aula.hora_inicio} - {aula.hora_fim}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-extrabold text-white truncate">
                      {aula.turma_nome}
                    </div>
                    <div className="text-xs font-medium text-slate-300 truncate mt-0.5">
                      {aula.disciplina_nome}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SELETOR DE TURNOS (SE HOUVER MAIS DE 1 OU PARA DESTAQUE) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {dados.turnos.map((t) => {
                const ativo = turnoObj?.turno === t.turno;
                return (
                  <button
                    key={t.turno}
                    type="button"
                    onClick={() => setTurnoAtivo(t.turno)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
                      ativo
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Turno {t.turno}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        ativo
                          ? 'bg-indigo-800 text-indigo-100'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.total_aulas} aulas
                    </span>
                  </button>
                );
              })}
            </div>

            {turnoObj?.updated_at && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4 text-slate-400" />
                Última atualização da grade:{' '}
                <strong className="text-slate-700">
                  {new Date(turnoObj.updated_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </strong>
              </div>
            )}
          </div>

          {/* QUADRO SEMANAL URÂNIA (GRADE DE HORÁRIOS DO TURNO ATIVO) */}
          {turnoObj && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-3.5 px-4 text-left text-xs font-extrabold uppercase tracking-wider w-36 border-r border-slate-800">
                        Horário / Aula
                      </th>
                      {(turnoObj.dias_semana || [1, 2, 3, 4, 5]).map((dia) => {
                        const isHoje = Number(dia) === diaHoje;
                        return (
                          <th
                            key={dia}
                            className={`py-3.5 px-4 text-center text-xs font-extrabold uppercase tracking-wider border-r border-slate-800 last:border-r-0 ${
                              isHoje ? 'bg-indigo-900' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>{DIAS_NOMES[dia] || `Dia ${dia}`}</span>
                              {isHoje && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                                  HOJE
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(turnoObj.periodos || []).map((per) => {
                      const pOrd = Number(per.ordem);
                      return (
                        <tr key={pOrd} className="hover:bg-slate-50/60 transition">
                          {/* Coluna do Período / Horário */}
                          <td className="p-3.5 bg-slate-50 border-r border-slate-200 align-middle">
                            <div className="font-extrabold text-xs text-slate-800 uppercase">
                              {per.rotulo || `${pOrd}ª Aula`}
                            </div>
                            {per.inicio && per.fim && (
                              <div className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                                <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                {per.inicio} - {per.fim}
                              </div>
                            )}
                          </td>

                          {/* Células dos Dias */}
                          {(turnoObj.dias_semana || [1, 2, 3, 4, 5]).map((dia) => {
                            const slot = slotsMap.get(`${Number(dia)}_${pOrd}`);
                            const isHoje = Number(dia) === diaHoje;

                            if (!slot) {
                              return (
                                <td
                                  key={`${dia}_${pOrd}`}
                                  className={`p-2.5 border-r border-slate-200 last:border-r-0 text-center align-middle ${
                                    isHoje ? 'bg-indigo-50/20' : ''
                                  }`}
                                >
                                  <span className="text-[11px] font-medium text-slate-300 select-none">
                                    Livre
                                  </span>
                                </td>
                              );
                            }

                            const cor = getCorTurma(slot.turma_id);

                            return (
                              <td
                                key={`${dia}_${pOrd}`}
                                className={`p-2 border-r border-slate-200 last:border-r-0 align-stretch ${
                                  isHoje ? 'bg-indigo-50/30' : ''
                                }`}
                              >
                                <div
                                  className={`h-full rounded-xl border ${cor.bg} ${cor.border} p-2.5 shadow-2xs flex flex-col justify-between transition hover:shadow-md`}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-tight ${cor.badge}`}
                                    >
                                      {slot.turma_nome}
                                    </span>
                                    {slot.hora_inicio && (
                                      <span className="text-[10px] font-bold text-slate-500">
                                        {slot.hora_inicio}
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    className={`text-xs font-bold ${cor.text} mt-2 line-clamp-2`}
                                    title={slot.disciplina_nome}
                                  >
                                    {slot.disciplina_nome}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RESUMO POR TURMA E DISCIPLINA NO TURNO */}
          {resumoTurmas.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 mb-3.5 flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-indigo-600" />
                Resumo de Turmas e Componentes ({turnoObj?.turno?.toUpperCase()})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {resumoTurmas.map((item) => {
                  const cor = getCorTurma(item.turma_id);
                  const diasOrd = Array.from(item.dias).sort((a, b) => a - b);
                  return (
                    <div
                      key={`${item.turma_id}_${item.disciplina_id}`}
                      className={`rounded-xl border ${cor.border} ${cor.bg} p-3.5 flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${cor.badge}`}
                          >
                            {item.turma_nome}
                          </span>
                          <span className="text-xs font-extrabold text-slate-800">
                            {item.aulas} {item.aulas === 1 ? 'aula/sem' : 'aulas/sem'}
                          </span>
                        </div>
                        <div className={`text-xs font-bold ${cor.text} mt-2`}>
                          {item.disciplina_nome}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-black/5">
                        {diasOrd.map((d) => (
                          <span
                            key={d}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/80 text-slate-700 border border-slate-200"
                          >
                            {DIAS_CURTOS[d] || `D${d}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
