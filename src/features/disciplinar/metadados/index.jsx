// src/features/disciplinar/metadados/index.jsx
// =============================================================
import React, { useState, useEffect, useCallback } from "react";
import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { AcademicCapIcon, SparklesIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";

// ── Helpers ──────────────────────────────────────────────────
const PERIODOS = [
  { key: "hoje",     label: "Hoje" },
  { key: "semana",   label: "Esta Semana" },
  { key: "mes",      label: "Este Mês" },
  { key: "bimestre", label: "1º Bimestre" },
  { key: "ano",      label: "Ano Letivo" },
];

const COR_MEDIDA = {
  "Suspensão":           { cor: "#ef4444", bg: "#fef2f2" },
  "Advertência Oral":    { cor: "#f59e0b", bg: "#fffbeb" },
  "Advertência Escrita": { cor: "#f97316", bg: "#fff7ed" },
  "Ações Educativas":    { cor: "#a78bfa", bg: "#f5f3ff" },
  "Transferência":       { cor: "#8b5cf6", bg: "#f5f3ff" },
  "Elogio Individual":   { cor: "#22c55e", bg: "#f0fdf4" },
  "Elogio Coletivo":     { cor: "#06b6d4", bg: "#ecfeff" },
};

function corMedida(label) {
  for (const [k, v] of Object.entries(COR_MEDIDA)) {
    if ((label || "").includes(k.split(" ")[0])) return v;
  }
  return { cor: "#6366f1", bg: "#eef2ff" };
}

// ── SVG Donut ────────────────────────────────────────────────
function DonutChart({ data, size = 200 }) {
  const total = data.reduce((s, d) => s + d.qtd, 0);
  if (!total) return <p className="text-center text-gray-400 text-sm py-8">Sem dados</p>;
  const cx = size / 2, cy = size / 2, r = size * 0.38, stroke = size * 0.16;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  const segs = data.filter(d => d.qtd > 0).map(d => {
    const pct = d.qtd / total; const start = cum; cum += pct;
    return { ...d, start, pct };
  });
  return (
    <div className="relative flex justify-center" style={{ height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        {segs.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.cor} strokeWidth={stroke}
            strokeDasharray={`${s.pct * circ} ${circ}`} strokeDashoffset={-s.start * circ} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-extrabold text-gray-800">{total}</span>
        <span className="text-xs text-gray-400">alunos</span>
      </div>
    </div>
  );
}

// ── Horizontal Bar ───────────────────────────────────────────
function HBar({ label, qtd, maxQtd, cor, bg }) {
  const pct = maxQtd ? (qtd / maxQtd) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-sm text-gray-600 w-52 text-right truncate flex-shrink-0" title={label}>{label}</span>
      <div className="flex-1 h-7 rounded-full overflow-hidden" style={{ background: bg || "#f3f4f6" }}>
        <div className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
          style={{ width: `${Math.max(pct, 4)}%`, background: cor }}>
          <span className="text-white text-xs font-bold">{qtd}</span>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton loader ──────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

// ── TABS ─────────────────────────────────────────────────────
const TABS = [
  { key: "visao",         label: "Visão Geral",     icon: ChartBarIcon },
  { key: "comportamento", label: "Comportamento",    icon: AcademicCapIcon },
  { key: "convocacoes",   label: "Convocações",      icon: ClipboardDocumentListIcon },
  { key: "termos",        label: "Termos Pendentes", icon: ClipboardDocumentListIcon },
  { key: "reincidencia",  label: "Reincidência",     icon: SparklesIcon },
];

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function MetadadosDisciplinar() {
  const [periodo, setPeriodo] = useState("ano");
  const [tab, setTab] = useState("visao");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true); setErro("");
    try {
      const res = await api.get("/api/disciplinar-metadados", { params: { periodo } });
      setData(res.data);
    } catch (e) {
      setErro("Erro ao carregar metadados. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived ─────────────────────────────────────────────────
  const medidas   = data?.medidas || [];
  const comport   = data?.comportamento || [];
  const topOcorr  = data?.topOcorrencias || [];
  const convocs   = data?.convocacoes || [];
  const reinc     = data?.reincidentes || [];
  const termos    = data?.termos || [];
  const kpis      = data?.kpis || {};

  const maxMedida = Math.max(...medidas.map(d => Number(d.qtd)), 1);
  const maxOcorr  = Math.max(...topOcorr.map(d => Number(d.qtd)), 1);

  const medidasFmt = medidas.map(d => ({ ...d, ...corMedida(d.medida), label: d.medida, qtd: Number(d.qtd) }));

  function statusBadge(s) {
    const u = (s || "").toUpperCase();
    if (u === "FINALIZADA") return "bg-emerald-100 text-emerald-700";
    if (u === "CANCELADA")  return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
  }
  function medidaBadge(m) {
    const ml = (m || "").toLowerCase();
    if (ml.includes("suspensão"))    return "bg-red-100 text-red-700";
    if (ml.includes("transferência"))return "bg-purple-100 text-purple-700";
    if (ml.includes("ações"))        return "bg-amber-100 text-amber-700";
    if (ml.includes("escrita"))      return "bg-orange-100 text-orange-700";
    if (ml.includes("elogio"))       return "bg-emerald-100 text-emerald-700";
    return "bg-blue-100 text-blue-700";
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* HEADER ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 leading-tight">Metadados Disciplinares</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Inteligência e indicadores em tempo real — dados do banco de dados
              </p>
            </div>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
            title="Atualizar">
            <ArrowPathIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filtro de Período */}
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                periodo === p.key
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Erro ────────────────────────────────────────────────── */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm font-medium">
          {erro}
        </div>
      )}

      {/* KPI CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { emoji: "👥", label: "Convocações Pendentes", sub: "Responsáveis aguardando", val: kpis.convocacoes ?? "—" },
          { emoji: "⚠️", label: "Taxa de Reincidência",   sub: "Alunos com 3+ registros", val: kpis.reincidencia ?? "—" },
          { emoji: "📋", label: "Termos Pendentes",       sub: "Consentimento pendente",   val: kpis.termos ?? "—" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-lg">{k.emoji}</div>
            <div>
              {loading
                ? <Skeleton className="h-8 w-20 mb-2" />
                : <span className="text-3xl font-extrabold text-gray-800">{k.val}</span>
              }
              <p className="text-sm font-semibold text-gray-600">{k.label}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TABS ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 px-2 pt-2 gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl whitespace-nowrap transition-all ${
                  active ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30" : "text-gray-500 hover:bg-gray-50"
                }`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">

          {/* ─── VISÃO GERAL ─────────────────────────────────── */}
          {tab === "visao" && (
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Medidas Disciplinares por Tipo</h2>
                  <span className="text-sm text-gray-400">Total: {medidasFmt.reduce((s,d)=>s+d.qtd,0)}</span>
                </div>
                {loading
                  ? Array(5).fill(0).map((_,i)=><Skeleton key={i} className="h-7 mb-3" />)
                  : medidasFmt.length === 0
                    ? <p className="text-center text-gray-400 text-sm py-6">Nenhum registro no período.</p>
                    : <div className="space-y-3">{medidasFmt.map((d,i)=><HBar key={i} label={d.label} qtd={d.qtd} maxQtd={maxMedida} cor={d.cor} bg={d.bg}/>)}</div>
                }
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Top Ocorrências Registradas</h2>
                  <span className="text-sm text-gray-400">{topOcorr.length} mais frequentes</span>
                </div>
                {loading
                  ? Array(5).fill(0).map((_,i)=><Skeleton key={i} className="h-7 mb-3" />)
                  : topOcorr.length === 0
                    ? <p className="text-center text-gray-400 text-sm py-6">Nenhum registro no período.</p>
                    : <div className="space-y-3">
                        {topOcorr.map((d,i)=>{
                          const cores=["#6366f1","#8b5cf6","#a78bfa","#c084fc","#d8b4fe","#e9d5ff","#c4b5fd","#a5b4fc"];
                          return <HBar key={i} label={String(d.label||"").length>42?String(d.label).slice(0,40)+"...":d.label} qtd={Number(d.qtd)} maxQtd={maxOcorr} cor={cores[i]||"#a78bfa"} bg="#f5f3ff"/>;
                        })}
                      </div>
                }
              </div>
            </div>
          )}

          {/* ─── COMPORTAMENTO ───────────────────────────────── */}
          {tab === "comportamento" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide text-center">Distribuição Geral — {kpis.totalAlunos ?? "—"} alunos</h2>
              {loading
                ? <Skeleton className="h-48 w-48 rounded-full mx-auto" />
                : <DonutChart data={comport} />
              }
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                {comport.map((d,i)=>(
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-3 h-3 rounded-full inline-block" style={{background:d.cor}}/>
                    {d.label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                {comport.map((d,i)=>(
                  <div key={i} className="rounded-xl p-3 text-center border transition-transform hover:scale-105"
                    style={{background:d.bg,borderColor:d.cor+"33"}}>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{color:d.cor}}>{d.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{d.nota}</p>
                    <p className="text-2xl font-extrabold mt-1" style={{color:d.cor}}>{loading?"—":d.qtd}</p>
                    <p className="text-[10px] text-gray-400">{d.pct}% do total</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── CONVOCAÇÕES ─────────────────────────────────── */}
          {tab === "convocacoes" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Convocações Pendentes</h2>
                <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">{convocs.length} pendentes</span>
              </div>
              {loading ? <Skeleton className="h-40" /> : convocs.length === 0
                ? <p className="text-center text-gray-400 py-10">Nenhuma convocação pendente no período.</p>
                : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left">
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
                        {convocs.map((c,i)=>(
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-5 py-4 text-sm font-semibold text-gray-800">{c.aluno}</td>
                            <td className="px-5 py-4 text-sm text-gray-600 text-center">{c.turma}</td>
                            <td className="px-5 py-4 text-sm text-gray-500 text-center font-mono">{c.registro}</td>
                            <td className="px-5 py-4 text-sm text-gray-500 text-center">{c.dataOcorrencia}</td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${medidaBadge(c.medida)}`}>{c.medida}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`text-sm font-bold ${Number(c.diasPendente)===0?"text-red-600":Number(c.diasPendente)<=3?"text-orange-500":"text-gray-500"}`}>
                                {Number(c.diasPendente)===0?"Hoje":`${c.diasPendente} dia${Number(c.diasPendente)>1?"s":""}`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )}

          {/* ─── TERMOS PENDENTES ────────────────────────────── */}
          {tab === "termos" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Termos de Consentimento Pendentes</h2>
                <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">{termos.length} pendentes</span>
              </div>
              {loading ? <Skeleton className="h-40" /> : termos.length === 0
                ? <p className="text-center text-gray-400 py-10">Nenhum termo pendente no período.</p>
                : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left">
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
                        {termos.map((t,i)=>(
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-5 py-4 text-sm font-semibold text-gray-800">{t.responsavel}</td>
                            <td className="px-5 py-4 text-sm text-gray-600">{t.aluno}</td>
                            <td className="px-5 py-4 text-sm text-gray-500 text-center">{t.turma}</td>
                            <td className="px-5 py-4 text-sm text-gray-500 text-center font-mono">{t.telefone||"—"}</td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Pendente</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )}

          {/* ─── REINCIDÊNCIA ────────────────────────────────── */}
          {tab === "reincidencia" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Alunos Reincidentes (3+ registros)</h2>
                <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">{reinc.length} alunos</span>
              </div>
              {loading ? <Skeleton className="h-40" /> : reinc.length === 0
                ? <p className="text-center text-gray-400 py-10">Nenhum aluno reincidente no período.</p>
                : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left">
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
                        {reinc.map((r,i)=>(
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-5 py-4 text-sm font-semibold text-gray-800">{r.aluno}</td>
                            <td className="px-5 py-4 text-sm text-gray-600 text-center">{r.turma}</td>
                            <td className="px-5 py-4 text-sm text-gray-500 text-center">{r.turno||"—"}</td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 text-sm font-bold">{r.regs}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(r.status)}`}>{r.status}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`text-sm font-bold ${r.pts>=7?"text-emerald-600":r.pts>=5?"text-amber-600":"text-red-600"}`}>
                                {Number(r.pts).toFixed(2).replace(".",",")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            Metadados Disciplinares — Dados reais do banco de dados •{" "}
            Atualizado às {new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
          </p>
        </div>
      </div>
    </div>
  );
}
