// src/features/disciplinar/metadados/index.jsx
// =============================================================
import React, { useState, useMemo } from "react";
import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { AcademicCapIcon, SparklesIcon } from "@heroicons/react/24/solid";

// —— MOCK DATA GENERATORS (reagem ao período selecionado) ——————————————

const PERIODOS = {
  hoje:     { mult: 0.02, label: "Hoje — 20/03/2026",
              labelFinalizados: "Hoje",          seed: 1  },
  semana:   { mult: 0.12, label: "Semana 12 — Mar/2026",
              labelFinalizados: "Na Semana",      seed: 13 },
  mes:      { mult: 0.45, label: "Março/2026",
              labelFinalizados: "No Mês",         seed: 42 },
  bimestre: { mult: 0.70, label: "1º Bimestre/2026",
              labelFinalizados: "No Bimestre",    seed: 77 },
  ano:      { mult: 1.00, label: "Ano letivo 2026",
              labelFinalizados: "No Ano",         seed: 99 },
};

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generateMedidasData(periodo) {
  const { mult, seed } = PERIODOS[periodo];
  const rng = seededRandom(seed);
  const items = [
    { label: "Advertência Oral",    base: 84,  cor: "#f59e0b", bg: "#fffbeb" },
    { label: "Advertência Escrita", base: 52,  cor: "#f97316", bg: "#fff7ed" },
    { label: "Ações Educativas",    base: 38,  cor: "#a78bfa", bg: "#f5f3ff" },
    { label: "Suspensão",           base: 31,  cor: "#ef4444", bg: "#fef2f2" },
    { label: "Elogio Individual",   base: 24,  cor: "#22c55e", bg: "#f0fdf4" },
    { label: "Elogio Coletivo",     base: 7,   cor: "#06b6d4", bg: "#ecfeff" },
    { label: "Transferência",       base: 3,   cor: "#8b5cf6", bg: "#f5f3ff" },
  ];
  return items.map(d => ({
    ...d,
    qtd: Math.max(0, Math.round(d.base * mult + (rng() - 0.5) * 6)),
  }));
}

function generateComportamentoData(periodo) {
  const { mult, seed } = PERIODOS[periodo];
  const rng = seededRandom(seed + 100);
  const items = [
    { label: "I - Excepcional",  nota: "10.00",   base: 18,  cor: "#16a34a", bg: "#dcfce7" },
    { label: "II - Ótimo",       nota: "9.0–9.9", base: 65,  cor: "#3b82f6", bg: "#dbeafe" },
    { label: "III - Bom",        nota: "7.0–8.9", base: 142, cor: "#22c55e", bg: "#dcfce7" },
    { label: "IV - Regular",     nota: "5.0–6.9", base: 78,  cor: "#f59e0b", bg: "#fef9c3" },
    { label: "V - Insuficiente", nota: "2.0–4.9", base: 22,  cor: "#ea580c", bg: "#fff7ed" },
    { label: "VI - Incompatível",nota: "0–1.9",   base: 26,  cor: "#ef4444", bg: "#fee2e2" },
  ];
  const data = items.map(d => ({
    ...d,
    qtd: Math.max(0, Math.round(d.base * mult + (rng() - 0.5) * 10)),
  }));
  const total = data.reduce((s, d) => s + d.qtd, 0);
  return data.map((d, i) => ({
    ...d,
    pct: total ? Math.round((d.qtd / total) * 100) : 0,
  }));
}

function generateTopOcorrencias(periodo) {
  const { mult, seed } = PERIODOS[periodo];
  const rng = seededRandom(seed + 200);
  const items = [
    { label: "Uso indevido de celular em sala de aula", base: 34 },
    { label: "Desacato ao professor ou funcionário",    base: 28 },
    { label: "Envolver-se em rixa ou luta corporal",    base: 19 },
    { label: "Sair da sala de aula sem autorização",    base: 17 },
    { label: "Atraso reiterado na chegada à escola",    base: 14 },
    { label: "Vandalismo ou depredação do patrimônio",  base: 11 },
    { label: "Bullying ou intimidação de colegas",      base: 9  },
    { label: "Porte de material não permitido",         base: 6  },
  ];
  return items.map(d => ({
    ...d,
    qtd: Math.max(0, Math.round(d.base * mult + (rng() - 0.5) * 4)),
  }));
}

function generateConvocacoes(periodo) {
  const { seed } = PERIODOS[periodo];
  const rng = seededRandom(seed + 300);
  const all = [
    { aluno: "JOÃOZINHO CAPIROTO DA SILVA", turma: "6º ANO A", registro: "0014", dataOcorrencia: "20/03/2026", medida: "Suspensão",          diasPendente: 0 },
    { aluno: "MARCOS VINICIUS PEREIRA",     turma: "7º ANO A", registro: "0012", dataOcorrencia: "18/03/2026", medida: "Ações Educativas",    diasPendente: 2 },
    { aluno: "RAFAEL SOUZA LIMA",           turma: "8º ANO B", registro: "0010", dataOcorrencia: "15/03/2026", medida: "Transferência",        diasPendente: 5 },
    { aluno: "ANA BEATRIZ COSTA",           turma: "9º ANO A", registro: "0008", dataOcorrencia: "12/03/2026", medida: "Suspensão",            diasPendente: 8 },
    { aluno: "LUCAS FERREIRA SANTOS",       turma: "6º ANO B", registro: "0006", dataOcorrencia: "10/03/2026", medida: "Advertência Escrita",  diasPendente: 10 },
  ];
  const count = Math.max(1, Math.round(all.length * (0.4 + rng() * 0.6)));
  return all.slice(0, count);
}

function generateReincidentes(periodo) {
  const { seed } = PERIODOS[periodo];
  const rng = seededRandom(seed + 400);
  const statuses = ["FINALIZADA", "REGISTRADA", "CANCELADA"];
  const turnos = ["Matutino", "Vespertino"];
  const base = [
    { aluno: "JOÃOZINHO CAPIROTO DA SILVA", turma: "6º ANO A", regs: 5, pts: 5.20 },
    { aluno: "MARCOS VINICIUS PEREIRA",     turma: "7º ANO A", regs: 4, pts: 4.80 },
    { aluno: "RAFAEL SOUZA LIMA",           turma: "8º ANO B", regs: 4, pts: 6.10 },
    { aluno: "THIAGO ALMEIDA NUNES",        turma: "9º ANO A", regs: 3, pts: 6.50 },
    { aluno: "ISABELA MENDES OLIVEIRA",     turma: "6º ANO B", regs: 3, pts: 7.20 },
  ];
  return base.map(b => ({
    ...b,
    turno: turnos[Math.floor(rng() * turnos.length)],
    status: statuses[Math.floor(rng() * statuses.length)],
  }));
}

function generateTermosPendentes(periodo) {
  const { seed } = PERIODOS[periodo];
  const rng = seededRandom(seed + 500);
  const all = [
    { responsavel: "MARIA DA SILVA SANTOS",   aluno: "JOÃOZINHO C. DA SILVA",  turma: "6º ANO A", telefone: "(63) 99912-3456" },
    { responsavel: "JOSÉ PEREIRA ALVES",       aluno: "MARCOS V. PEREIRA",      turma: "7º ANO A", telefone: "(63) 99887-6543" },
    { responsavel: "ANA PAULA LIMA",           aluno: "RAFAEL SOUZA LIMA",      turma: "8º ANO B", telefone: "(63) 99876-1234" },
    { responsavel: "CARLA NUNES FERREIRA",     aluno: "THIAGO A. NUNES",        turma: "9º ANO A", telefone: "(63) 99834-5678" },
    { responsavel: "FERNANDA OLIVEIRA COSTA",  aluno: "ISABELA M. OLIVEIRA",    turma: "6º ANO B", telefone: "(63) 99845-9012" },
  ];
  const count = Math.max(2, Math.round(all.length * (0.5 + rng() * 0.5)));
  return all.slice(0, count);
}

// —— SVG DONUT (sem dependências externas) ——————————————————————

function DonutChart({ data, size = 220 }) {
  const total = data.reduce((s, d) => s + d.qtd, 0);
  if (total === 0) return null;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const stroke = size * 0.16;
  let cumulative = 0;
  const segments = data.filter(d => d.qtd > 0).map(d => {
    const pct = d.qtd / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, start, pct };
  });
  const circumference = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.cor}
            strokeWidth={stroke}
            strokeDasharray={`${seg.pct * circumference} ${circumference}`}
            strokeDashoffset={-seg.start * circumference}
            strokeLinecap="butt"
            className="transition-all duration-500"
          />
        ))}
        <circle cx={cx} cy={cy} r={r - stroke / 2 + 2} fill="white" className="rotate-90" style={{ transformOrigin: "center" }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-4xl font-extrabold text-gray-800">{total}</span>
        <span className="text-sm text-gray-400 -mt-1">alunos</span>
      </div>
    </div>
  );
}

// —— HORIZONTAL BAR ————————————————————————————————————————————

function HBar({ label, qtd, maxQtd, cor, bg }) {
  const pct = maxQtd ? (qtd / maxQtd) * 100 : 0;
  return (
    <div className="flex items-center gap-4 group">
      <span className="text-sm text-gray-600 w-48 text-right truncate" title={label}>{label}</span>
      <div className="flex-1 h-8 rounded-full overflow-hidden" style={{ backgroundColor: bg || "#f3f4f6" }}>
        <div
          className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ease-out"
          style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: cor }}
        >
          <span className="text-white text-xs font-bold drop-shadow-sm">{qtd}</span>
        </div>
      </div>
    </div>
  );
}

// —— MAIN COMPONENT ————————————————————————————————————————————

const TABS = [
  { key: "visao",         label: "Visão Geral",      icon: ChartBarIcon },
  { key: "comportamento", label: "Comportamento",     icon: AcademicCapIcon },
  { key: "convocacoes",   label: "Convocações",       icon: ClipboardDocumentListIcon },
  { key: "termos",        label: "Termos Pendentes",  icon: ClipboardDocumentListIcon },
  { key: "reincidencia",  label: "Reincidência",      icon: SparklesIcon },
];

export default function MetadadosDisciplinar() {
  const [periodo, setPeriodo] = useState("ano");
  const [tab, setTab] = useState("visao");

  const medidas       = useMemo(() => generateMedidasData(periodo),      [periodo]);
  const comportamento = useMemo(() => generateComportamentoData(periodo), [periodo]);
  const topOcorr      = useMemo(() => generateTopOcorrencias(periodo),   [periodo]);
  const convocacoes   = useMemo(() => generateConvocacoes(periodo),      [periodo]);
  const reincidentes  = useMemo(() => generateReincidentes(periodo),     [periodo]);
  const termos        = useMemo(() => generateTermosPendentes(periodo),  [periodo]);

  const totalMedidas  = medidas.reduce((s, d) => s + d.qtd, 0);
  const totalAlunos   = comportamento.reduce((s, d) => s + d.qtd, 0);
  const maxMedida     = Math.max(...medidas.map(d => d.qtd), 1);
  const maxOcorr      = Math.max(...topOcorr.map(d => d.qtd), 1);

  const kpiConvocacoes  = convocacoes.length;
  const kpiReincidencia = totalAlunos > 0
    ? ((reincidentes.length / totalAlunos) * 100).toFixed(1) + "%"
    : "0%";
  const kpiTermos = termos.length;

  const getMedidaBadge = (medida) => {
    const m = (medida || "").toLowerCase();
    if (m.includes("suspensão"))    return "bg-red-100 text-red-700";
    if (m.includes("transferência"))return "bg-purple-100 text-purple-700";
    if (m.includes("ações"))        return "bg-amber-100 text-amber-700";
    if (m.includes("escrita"))      return "bg-orange-100 text-orange-700";
    if (m.includes("elogio"))       return "bg-emerald-100 text-emerald-700";
    return "bg-blue-100 text-blue-700";
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "FINALIZADA") return "bg-emerald-100 text-emerald-700";
    if (s === "CANCELADA")  return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ══ BANNER DEMONSTRAÇÃO ══ */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100 flex-shrink-0">
            <SparklesIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">
              📊 Dados de Demonstração
            </p>
            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
              Os indicadores exibidos nesta página são <strong>simulados</strong> para fins de visualização.
              Em breve, serão integrados com dados reais do banco de dados do sistema.
            </p>
          </div>
        </div>
      </div>

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight">Metadados Disciplinares</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Inteligência e indicadores do módulo Disciplinar — dados de demonstração
            </p>
          </div>
        </div>

        {/* Filtro de Período */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(PERIODOS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setPeriodo(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                periodo === key
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Convocações Pendentes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <span className="text-lg" role="img" aria-label="grupo">👥</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-800">{kpiConvocacoes}</span>
              <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">↓ -2</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">Convocações Pendentes</p>
            <p className="text-xs text-gray-400">Responsáveis aguardando</p>
          </div>
        </div>

        {/* Taxa de Reincidência */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <span className="text-lg" role="img" aria-label="alerta">⚠️</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-800">{kpiReincidencia}</span>
              <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">↓ -1.3%</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">Taxa de Reincidência</p>
            <p className="text-xs text-gray-400">Alunos com 3+ registros</p>
          </div>
        </div>

        {/* Termos Pendentes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <span className="text-lg" role="img" aria-label="documento">📋</span>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-gray-800">{kpiTermos}</span>
            <p className="text-sm font-semibold text-gray-600">Termos Pendentes</p>
            <p className="text-xs text-gray-400">Consentimento de imagem</p>
          </div>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-2 pt-2 gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* ─── VISÃO GERAL ──────────────────────── */}
          {tab === "visao" && (
            <div className="space-y-8">
              {/* Medidas por Tipo */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
                    Medidas Disciplinares por Tipo
                  </h2>
                  <span className="text-sm text-gray-400">Total: {totalMedidas}</span>
                </div>
                <div className="space-y-3">
                  {medidas.map((d, i) => (
                    <HBar key={i} label={d.label} qtd={d.qtd} maxQtd={maxMedida} cor={d.cor} bg={d.bg} />
                  ))}
                </div>
              </div>

              {/* Top Ocorrências */}
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
                    Top Ocorrências Registradas
                  </h2>
                  <span className="text-sm text-gray-400">{topOcorr.length} mais frequentes</span>
                </div>
                <div className="space-y-3">
                  {topOcorr.map((d, i) => {
                    const cores = ["#6366f1","#8b5cf6","#a78bfa","#c084fc","#d8b4fe","#e9d5ff","#c4b5fd","#a5b4fc"];
                    return (
                      <HBar
                        key={i}
                        label={d.label.length > 42 ? d.label.substring(0, 40) + "..." : d.label}
                        qtd={d.qtd}
                        maxQtd={maxOcorr}
                        cor={cores[i] || "#a78bfa"}
                        bg="#f5f3ff"
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── COMPORTAMENTO ────────────────────── */}
          {tab === "comportamento" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide text-center">
                Distribuição Geral
              </h2>

              {/* Donut */}
              <div className="flex justify-center relative" style={{ height: 220 }}>
                <DonutChart data={comportamento} />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                {comportamento.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: d.cor }} />
                    {d.label}
                  </div>
                ))}
              </div>

              {/* Conceitos detail cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                {comportamento.map((d, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 text-center border transition-transform hover:scale-105"
                    style={{ backgroundColor: d.bg, borderColor: d.cor + "33" }}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: d.cor }}>
                      {d.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{d.nota}</p>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: d.cor }}>
                      {d.qtd}
                    </p>
                    <p className="text-[10px] text-gray-400">{d.pct}% do total</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── CONVOCAÇÕES ──────────────────────── */}
          {tab === "convocacoes" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg" role="img" aria-label="grupo">👥</span>
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
                    Convocações de Responsáveis Pendentes
                  </h2>
                </div>
                <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">
                  {convocacoes.length} pendentes
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Aluno</th>
                      <th className="px-5 py-3 text-center">Turma</th>
                      <th className="px-5 py-3 text-center">Registro</th>
                      <th className="px-5 py-3 text-center">Data</th>
                      <th className="px-5 py-3 text-center">Medida</th>
                      <th className="px-5 py-3 text-center">Dias Pendente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {convocacoes.map((c, i) => (
                      <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4 text-sm font-semibold text-gray-800">{c.aluno}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 text-center">{c.turma}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 text-center font-mono">{c.registro}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 text-center">{c.dataOcorrencia}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getMedidaBadge(c.medida)}`}>
                            {c.medida}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-bold ${c.diasPendente === 0 ? "text-red-600" : c.diasPendente <= 3 ? "text-orange-500" : "text-gray-500"}`}>
                            {c.diasPendente === 0 ? "Hoje" : `${c.diasPendente} dia${c.diasPendente > 1 ? "s" : ""}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── TERMOS PENDENTES ─────────────────── */}
          {tab === "termos" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg" role="img" aria-label="documento">📋</span>
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
                    Termos de Consentimento Pendentes
                  </h2>
                </div>
                <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
                  {termos.length} pendentes
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Responsável</th>
                      <th className="px-5 py-3">Aluno</th>
                      <th className="px-5 py-3 text-center">Turma</th>
                      <th className="px-5 py-3 text-center">Telefone</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {termos.map((t, i) => (
                      <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4 text-sm font-semibold text-gray-800">{t.responsavel}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{t.aluno}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 text-center">{t.turma}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 text-center font-mono">{t.telefone}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            Pendente
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── REINCIDÊNCIA ─────────────────────── */}
          {tab === "reincidencia" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg" role="img" aria-label="alerta">⚠️</span>
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
                    Alunos Reincidentes
                  </h2>
                </div>
                <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">
                  {reincidentes.length} alunos com 3+ registros
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Aluno</th>
                      <th className="px-5 py-3 text-center">Turma</th>
                      <th className="px-5 py-3 text-center">Turno</th>
                      <th className="px-5 py-3 text-center">Registros</th>
                      <th className="px-5 py-3 text-center">Último Status</th>
                      <th className="px-5 py-3 text-center">Pontuação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reincidentes.map((r, i) => (
                      <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4 text-sm font-semibold text-gray-800">{r.aluno}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 text-center">{r.turma}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 text-center">{r.turno}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 text-sm font-bold">
                            {r.regs}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-bold ${r.pts >= 7 ? "text-emerald-600" : r.pts >= 5 ? "text-amber-600" : "text-red-600"}`}>
                            {r.pts.toFixed(2).replace(".", ",")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            Metadados Disciplinares v1.0 — Atualizado em 20/03/2026 às{" "}
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            {" "}• Dados de demonstração (mock)
          </p>
        </div>
      </div>
    </div>
  );
}
