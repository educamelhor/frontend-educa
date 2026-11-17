// src/features/questoes/utils/useOpcoesEscolaQuestoes.js
// Hook compartilhado e cacheado por escola (`escola_id`) para alimentar todos os seletores de
// Disciplinas, Itinerários, Séries e Turmas do módulo Banco de Questões (EDUCA.PROVA / EDUCA.STUDIO AI)
// diretamente a partir do banco de dados da escola logada.

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const FALLBACK_DISCIPLINAS = [
  'Português', 'Redação', 'Inglês', 'Espanhol', 'Artes', 'Educação Física',
  'Matemática', 'Ciências', 'Biologia', 'Física', 'Química',
  'História', 'Geografia', 'Filosofia', 'Sociologia', 'PCA', 'PD',
];

const FALLBACK_SERIES = [
  '6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF',
  '1ª Série EM', '2ª Série EM', '3ª Série EM',
];

const ORDEM_PEDAGOGICA = [
  'Português', 'Redação', 'Inglês', 'Espanhol', 'Francês', 'Artes', 'Educação Física',
  'Matemática', 'Geometria', 'Ciências', 'Biologia', 'Física', 'Química',
  'História', 'Geografia', 'Filosofia', 'Sociologia', 'Ensino Religioso',
  'Projeto de Vida', 'PCA', 'PD', 'PD1', 'PD2', 'PD3',
];

const REGEX_SLOT_INTERNO = /^(?:IFA|ELETIVA|PROJETO|AGRUP(?:AMENTO)?|TURMA|OFICINA)_+[A-ZÀ-Ú0-9]/i;

const MAPA_CANON = {
  'PORTUGUES': 'Português',
  'LINGUA PORTUGUESA': 'Português',
  'L PORTUGUESA': 'Português',
  'LP': 'Português',
  'REDACAO': 'Redação',
  'MATEMATICA': 'Matemática',
  'GEOMETRIA': 'Geometria',
  'CIENCIAS': 'Ciências',
  'CIENCIAS NATURAIS': 'Ciências',
  'HISTORIA': 'História',
  'GEOGRAFIA': 'Geografia',
  'INGLES': 'Inglês',
  'LEM INGLES': 'Inglês',
  'LINGUA INGLESA': 'Inglês',
  'ESPANHOL': 'Espanhol',
  'LEM ESPANHOL': 'Espanhol',
  'LINGUA ESPANHOLA': 'Espanhol',
  'FRANCES': 'Francês',
  'ARTES': 'Artes',
  'ARTE': 'Artes',
  'EDUCACAO FISICA': 'Educação Física',
  'ED FISICA': 'Educação Física',
  'ENSINO RELIGIOSO': 'Ensino Religioso',
  'BIOLOGIA': 'Biologia',
  'FISICA': 'Física',
  'QUIMICA': 'Química',
  'SOCIOLOGIA': 'Sociologia',
  'FILOSOFIA': 'Filosofia',
  'PROJETO DE VIDA': 'Projeto de Vida',
  'PCA': 'PCA',
  'PD': 'PD',
  'PD1': 'PD1',
  'PD 1': 'PD1',
  'PD2': 'PD2',
  'PD 2': 'PD2',
  'PD3': 'PD3',
  'PD 3': 'PD3',
};

function normKey(s = '') {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatarDisciplinaClientFallback(raw = '') {
  const txt = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!txt || REGEX_SLOT_INTERNO.test(txt)) return null;
  const k = normKey(txt);
  if (MAPA_CANON[k]) return MAPA_CANON[k];
  if (/[a-zà-ú]/.test(txt)) return txt;
  const preps = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'para', 'com', 'a', 'o']);
  const siglas = new Set(['IFA', 'PCA', 'PD', 'PD1', 'PD2', 'PD3', 'EJA', 'TI', 'IA', 'I', 'II', 'III']);
  return txt
    .split(' ')
    .map((w, idx) => {
      const kw = normKey(w);
      if (siglas.has(kw)) return w.toUpperCase();
      const lw = w.toLowerCase();
      if (idx > 0 && preps.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(' ');
}

function normalizarSerieClientFallback(serieOuTurma = '', etapa = '') {
  const bruto = String(serieOuTurma || '').trim();
  if (!bruto) return null;
  const k = normKey(bruto);
  const ek = normKey(etapa);
  const ehMedio = /\b(?:EM|EMI|MEDIO|SERIE)\b/.test(k) || /\bMEDIO\b/.test(ek);

  const mEm = k.match(/^(?:EM\s*)?([1-4])\s*(?:A|O)?\s*(?:SERIE|ANO\s+EM|EM)\b/);
  if (mEm || (ehMedio && /^[1-4]\b/.test(k))) {
    const n = mEm ? Number(mEm[1]) : Number(k.match(/^([1-4])/)[1]);
    return `${n}ª Série EM`;
  }
  const mEf = k.match(/^([1-9])\s*(?:O|A)?\s*ANO(?:\s+EF)?\b/);
  if (mEf && !ehMedio) {
    return `${Number(mEf[1])}º Ano EF`;
  }
  return bruto;
}

function obterChaveEscolaSessao() {
  try {
    const lsEscola = localStorage.getItem('escola_id');
    if (lsEscola) return `esc_${lsEscola}`;
    const token = localStorage.getItem('token') || '';
    const part = token.split('.')[1];
    if (part) {
      const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
      if (payload?.escola_id) return `esc_${payload.escola_id}`;
    }
  } catch { /* ignore */ }
  return 'esc_default';
}

// Cache em memória por escola_id (TTL 60s + deduplicação de requests concorrentes)
const _cachePorEscola = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function buscarCatalogoEscolaApi(chaveEscola, forceRefresh = false) {
  const agora = Date.now();
  const cached = _cachePorEscola.get(chaveEscola);

  if (!forceRefresh && cached) {
    if (cached.dados && cached.expiraEm > agora) {
      return cached.dados;
    }
    if (cached.inflight) {
      return cached.inflight;
    }
  }

  const promise = (async () => {
    try {
      const sufixo = forceRefresh ? '?refresh=1' : '';
      const { data } = await api.get(`/api/questoes/opcoes-escola${sufixo}`);
      if (data && Array.isArray(data.disciplinas)) {
        const normalizado = {
          escolaId: data.escola_id || null,
          escolaNome: data.escola_nome || '',
          escolaApelido: data.escola_apelido || '',
          anoLetivo: data.ano_letivo || new Date().getFullYear(),
          disciplinas: data.disciplinas,
          itinerarios: Array.isArray(data.itinerarios) ? data.itinerarios : [],
          todasDisciplinas: Array.isArray(data.todas_disciplinas)
            ? data.todas_disciplinas
            : [...data.disciplinas, ...(data.itinerarios || [])],
          series: Array.isArray(data.series) && data.series.length > 0 ? data.series : FALLBACK_SERIES,
          turmas: Array.isArray(data.turmas) ? data.turmas : [],
        };
        _cachePorEscola.set(chaveEscola, {
          dados: normalizado,
          expiraEm: Date.now() + CACHE_TTL_MS,
          inflight: null,
        });
        return normalizado;
      }
    } catch {
      // Fallback resiliente direto em /api/disciplinas + /api/turmas caso o container esteja reiniciando
      try {
        const [resDisc, resTurmas] = await Promise.all([
          api.get('/api/disciplinas').catch(() => ({ data: [] })),
          api.get('/api/turmas').catch(() => ({ data: [] })),
        ]);

        const discRows = Array.isArray(resDisc.data) ? resDisc.data : [];
        const turmasRows = Array.isArray(resTurmas.data) ? resTurmas.data : [];

        const regMap = new Map();
        const itinMap = new Map();
        discRows.forEach((d) => {
          const nome = formatarDisciplinaClientFallback(d.nome || d.disciplina);
          if (!nome) return;
          const k = normKey(nome);
          const tUp = String(d.tipo || 'REGULAR').toUpperCase();
          if (['IFA', 'ELETIVA', 'PROJETO', 'OFICINA', 'TRILHA'].includes(tUp)) {
            if (!regMap.has(k) && !itinMap.has(k)) itinMap.set(k, nome);
          } else {
            regMap.set(k, nome);
            itinMap.delete(k);
          }
        });

        const anos = turmasRows.map((t) => Number(t.ano) || 0).filter((a) => a > 2000);
        const maxAno = anos.length > 0 ? Math.max(...anos) : 0;
        const turmasAtivas = maxAno > 0 ? turmasRows.filter((t) => Number(t.ano) === maxAno) : turmasRows;

        const seriesMap = new Map();
        const turmasUnicas = [];
        const turmasKeys = new Set();

        turmasAtivas.forEach((t) => {
          const nomeTurma = String(t.turma || t.nome || '').trim();
          const sc = normalizarSerieClientFallback(t.serie || nomeTurma, t.etapa);
          if (sc && !seriesMap.has(normKey(sc))) seriesMap.set(normKey(sc), sc);
          if (nomeTurma && !turmasKeys.has(normKey(nomeTurma))) {
            turmasKeys.add(normKey(nomeTurma));
            turmasUnicas.push({ id: t.id, nome: nomeTurma, serie: sc || '', turno: t.turno || '' });
          }
        });

        const disciplinas = regMap.size > 0
          ? [...regMap.values()].sort((a, b) => {
              const ia = ORDEM_PEDAGOGICA.indexOf(a);
              const ib = ORDEM_PEDAGOGICA.indexOf(b);
              if (ia !== -1 && ib !== -1) return ia - ib;
              if (ia !== -1) return -1;
              if (ib !== -1) return 1;
              return a.localeCompare(b, 'pt-BR');
            })
          : FALLBACK_DISCIPLINAS;

        const itinerarios = [...itinMap.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const series = seriesMap.size > 0 ? [...seriesMap.values()] : FALLBACK_SERIES;

        const fallbackConstruido = {
          escolaId: null,
          escolaNome: '',
          escolaApelido: '',
          anoLetivo: maxAno || new Date().getFullYear(),
          disciplinas,
          itinerarios,
          todasDisciplinas: [...disciplinas, ...itinerarios],
          series,
          turmas: turmasUnicas,
        };
        _cachePorEscola.set(chaveEscola, {
          dados: fallbackConstruido,
          expiraEm: Date.now() + 20 * 1000,
          inflight: null,
        });
        return fallbackConstruido;
      } catch { /* ignore */ }
    }

    const estatico = {
      escolaId: null,
      escolaNome: '',
      escolaApelido: '',
      anoLetivo: new Date().getFullYear(),
      disciplinas: FALLBACK_DISCIPLINAS,
      itinerarios: [],
      todasDisciplinas: FALLBACK_DISCIPLINAS,
      series: FALLBACK_SERIES,
      turmas: [],
    };
    _cachePorEscola.set(chaveEscola, { dados: estatico, expiraEm: Date.now() + 10 * 1000, inflight: null });
    return estatico;
  })();

  _cachePorEscola.set(chaveEscola, { ...(cached || {}), inflight: promise });
  return promise;
}

export function useOpcoesEscolaQuestoes() {
  const chaveEscola = obterChaveEscolaSessao();
  const inicial = _cachePorEscola.get(chaveEscola)?.dados || null;

  const [catalogo, setCatalogo] = useState(
    inicial || {
      escolaId: null,
      escolaNome: '',
      escolaApelido: '',
      anoLetivo: new Date().getFullYear(),
      disciplinas: FALLBACK_DISCIPLINAS,
      itinerarios: [],
      todasDisciplinas: FALLBACK_DISCIPLINAS,
      series: FALLBACK_SERIES,
      turmas: [],
    }
  );
  const [loadingOpcoes, setLoadingOpcoes] = useState(!inicial);

  const recarregarOpcoes = useCallback(async (force = true) => {
    setLoadingOpcoes(true);
    try {
      const dados = await buscarCatalogoEscolaApi(obterChaveEscolaSessao(), force);
      setCatalogo(dados);
    } finally {
      setLoadingOpcoes(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    const key = obterChaveEscolaSessao();
    buscarCatalogoEscolaApi(key, false).then((dados) => {
      if (ativo && dados) {
        setCatalogo(dados);
        setLoadingOpcoes(false);
      }
    });
    return () => { ativo = false; };
  }, [chaveEscola]);

  return {
    ...catalogo,
    loadingOpcoes,
    recarregarOpcoes,
  };
}

/**
 * Renderiza os `<option>` / `<optgroup>` de disciplinas da escola logada,
 * preservando qualquer valor previamente salvo na questão caso venha do Banco Global.
 */
export function renderOpcoesDisciplinaEscola({ disciplinas = [], itinerarios = [], valorAtual = '' }) {
  const atual = String(valorAtual || '').trim();
  const todasKeys = new Set([...disciplinas, ...itinerarios].map((d) => normKey(d)));
  const precisaExtra = Boolean(atual && !todasKeys.has(normKey(atual)));

  if (itinerarios.length > 0) {
    return React.createElement(
      React.Fragment,
      null,
      precisaExtra ? React.createElement('option', { key: `__extra_${atual}`, value: atual }, atual) : null,
      React.createElement(
        'optgroup',
        { label: 'Disciplinas da Escola' },
        disciplinas.map((d) => React.createElement('option', { key: d, value: d }, d))
      ),
      React.createElement(
        'optgroup',
        { label: 'Itinerários / Projetos da Escola' },
        itinerarios.map((it) => React.createElement('option', { key: it, value: it }, it))
      )
    );
  }

  return React.createElement(
    React.Fragment,
    null,
    precisaExtra ? React.createElement('option', { key: `__extra_${atual}`, value: atual }, atual) : null,
    disciplinas.map((d) => React.createElement('option', { key: d, value: d }, d))
  );
}

/**
 * Renderiza os `<option>` de séries derivadas das turmas cadastradas na escola logada.
 */
export function renderOpcoesSerieEscola({ series = [], valorAtual = '' }) {
  const atual = String(valorAtual || '').trim();
  const existeExato = series.some((s) => s === atual);

  return React.createElement(
    React.Fragment,
    null,
    atual && !existeExato ? React.createElement('option', { key: `__extra_s_${atual}`, value: atual }, atual) : null,
    series.map((s) => React.createElement('option', { key: s, value: s }, s))
  );
}
