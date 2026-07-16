// features/secretaria/diarios/ModalDiarioSecretaria.jsx
// ============================================================================
// Modal SOMENTE LEITURA do Diário de um professor — Módulo SECRETARIA
//
// Fluxo:
//  1. Recebe o `plano` (id, professor, disciplina, turma, bimestre) como prop
//  2. Busca os itens do plano (GET /api/avaliacoes/:id)
//  3. Busca os alunos da turma (GET /turmas/:turmaId/alunos)
//  4. Busca as notas granulares (GET /api/avaliacoes/:id/notas-diario?turma_id=X)
//  5. Monta tabela cruzada: alunos × colunas do plano
//
// Regras:
//  ❌ Nenhum campo é editável
//  ❌ Sem botões de salvar, exportar ou fechar diário
//  ✅ Visualização administrativa completa com cores por faixa de nota
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
  LockOpenIcon,
} from "@heroicons/react/24/outline";

// ── Cor da célula por nota ──────────────────────────────────────────────────
function corNota(nota) {
  if (nota === null || nota === undefined) return { bg: "#f8fafc", text: "#94a3b8", border: "#e2e8f0" };
  const n = Number(nota);
  if (n >= 7) return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  if (n < 5)  return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
  return { bg: "#fef9c3", text: "#854d0e", border: "#fde047" };
}

// ── Labels de bimestre normalizados ────────────────────────────────────────
function labelBimestre(raw) {
  if (!raw) return "—";
  const match = String(raw).match(/\d/);
  if (match) return `${match[0]}º Bimestre`;
  return raw;
}

export default function ModalDiarioSecretaria({ plano, onClose }) {
  const [loading, setLoading]         = useState(true);
  const [erro, setErro]               = useState(null);
  const [itens, setItens]             = useState([]);      // colunas do diário
  const [alunos, setAlunos]           = useState([]);      // lista ordenada
  const [notas, setNotas]             = useState({});      // { "alunoId_itemIdx_opIdx": valor }
  const [buscaAluno, setBuscaAluno]   = useState("");

  useEffect(() => {
    if (!plano?.plano_id) return;
    let cancelled = false;

    async function carregar() {
      setLoading(true);
      setErro(null);
      try {
        const [resPlano, resAlunos, resNotas] = await Promise.all([
          api.get(`/avaliacoes/${plano.plano_id}`),
          api.get(`/turmas/${plano.turma_id}/alunos`),
          api.get(`/avaliacoes/${plano.plano_id}/notas-diario`, {
            params: { turma_id: plano.turma_id },
          }),
        ]);

        if (cancelled) return;

        setItens(resPlano.data?.itens || []);
        setAlunos(
          Array.isArray(resAlunos.data)
            ? resAlunos.data
            : resAlunos.data?.alunos || []
        );
        setNotas(resNotas.data?.notas || {});
      } catch (err) {
        if (!cancelled) setErro("Não foi possível carregar o diário. Tente novamente.");
        console.error("[ModalDiarioSecretaria]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    carregar();
    return () => { cancelled = true; };
  }, [plano?.plano_id, plano?.turma_id]);

  // ── Filtro de busca ─────────────────────────────────────────────────────
  const alunosFiltrados = alunos.filter((a) => {
    if (!buscaAluno.trim()) return true;
    const q = buscaAluno.toLowerCase();
    return (
      String(a.nome || a.estudante || "").toLowerCase().includes(q) ||
      String(a.codigo || "").toLowerCase().includes(q)
    );
  });

  // ── Nota de um aluno para um item e oportunidade ────────────────────────
  function getNota(alunoId, itemIdx, opIdx) {
    return notas[`${alunoId}_${itemIdx}_${opIdx}`] ?? null;
  }

  // ── Calcular total para exibição final (soma das notas) ────────────────
  function calcTotal(alunoId) {
    if (!itens.length) return null;
    let total = 0;
    let temNota = false;
    itens.forEach((item, idx) => {
      const ops = item.oportunidades || 1;
      for (let op = 0; op < ops; op++) {
        const n = getNota(alunoId, idx, op);
        if (n !== null) { total += Number(n); temNota = true; }
      }
    });
    if (!temNota) return null;
    return total.toFixed(1);
  }

  if (!plano) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full rounded-2xl shadow-2xl my-4"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
          border: "1px solid rgba(99,179,237,0.2)",
          maxWidth: "90vw",
          minWidth: "min(95vw, 900px)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          className="flex items-start justify-between px-6 py-4 flex-shrink-0 sticky top-0 z-10 rounded-t-2xl"
          style={{
            background: "linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(99,179,237,0.08) 100%)",
            borderBottom: "1px solid rgba(99,179,237,0.18)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Diário — {plano.disciplina_nome}
              </h2>
              <p className="text-xs text-blue-300 mt-0.5">
                {plano.professor_nome} · {plano.turma_nome} · {plano.turno} · {labelBimestre(plano.bimestre)} · {plano.ano}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Badge Diário Fechado/Aberto */}
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={
                plano.diario_fechado
                  ? { background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }
                  : { background: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)" }
              }
            >
              {plano.diario_fechado
                ? <><LockClosedIcon className="h-3.5 w-3.5" /> Diário Fechado</>
                : <><LockOpenIcon className="h-3.5 w-3.5" /> Diário Aberto</>
              }
            </span>

            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Badge somente leitura ───────────────────────────────────── */}
        <div className="px-6 pt-3 pb-1">
          <span className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 px-3 py-1 rounded-full">
            👁️ Visualização administrativa — somente leitura
          </span>
        </div>

        {/* ── Busca de Aluno ─────────────────────────────────────────── */}
        <div className="px-6 py-3">
          <input
            type="text"
            placeholder="Pesquisar aluno por nome ou matrícula..."
            value={buscaAluno}
            onChange={(e) => setBuscaAluno(e.target.value)}
            className="w-full max-w-sm px-4 py-2 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(99,179,237,0.25)",
              color: "#f1f5f9",
            }}
          />
        </div>

        {/* ── Corpo ──────────────────────────────────────────────────── */}
        <div className="px-4 pb-6 overflow-x-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-blue-300 text-sm">Carregando diário...</p>
            </div>
          )}

          {erro && !loading && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm my-4"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              ⚠️ {erro}
            </div>
          )}

          {!loading && !erro && (
            <>
              {itens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                  <ClipboardDocumentListIcon className="h-10 w-10 text-slate-600" />
                  <p className="text-slate-400 text-sm">Plano sem itens de avaliação cadastrados.</p>
                </div>
              ) : (
                <table className="w-full text-sm border-collapse" style={{ minWidth: "700px" }}>
                  <thead>
                    <tr>
                      {/* Cabeçalho estático */}
                      <th
                        className="sticky left-0 z-10 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                        style={{
                          background: "rgba(15,23,42,0.95)",
                          color: "#93c5fd",
                          borderBottom: "2px solid rgba(99,179,237,0.25)",
                          minWidth: "220px",
                        }}
                      >
                        Estudante
                      </th>

                      {/* Colunas dinâmicas do plano */}
                      {itens.map((item, idx) => {
                        const ops = item.oportunidades || 1;
                        return Array.from({ length: ops }, (_, opIdx) => (
                          <th
                            key={`${idx}_${opIdx}`}
                            className="px-2 py-2.5 text-center text-xs font-semibold whitespace-nowrap"
                            style={{
                              background: "rgba(15,23,42,0.8)",
                              color: "#cbd5e1",
                              borderBottom: "2px solid rgba(99,179,237,0.25)",
                              maxWidth: "90px",
                            }}
                            title={item.atividade}
                          >
                            <span className="block truncate max-w-[80px]">
                              {item.atividade}
                              {ops > 1 ? ` (${opIdx + 1})` : ""}
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              Max {item.nota_total || 10} pts
                            </span>
                          </th>
                        ));
                      })}

                      {/* Coluna Total */}
                      <th
                        className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide"
                        style={{
                          background: "rgba(15,23,42,0.8)",
                          color: "#93c5fd",
                          borderBottom: "2px solid rgba(99,179,237,0.25)",
                          minWidth: "70px",
                        }}
                      >
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {alunosFiltrados.length === 0 && (
                      <tr>
                        <td
                          colSpan={itens.reduce((acc, i) => acc + (i.oportunidades || 1), 0) + 2}
                          className="px-4 py-8 text-center text-slate-400 text-sm"
                        >
                          Nenhum aluno encontrado.
                        </td>
                      </tr>
                    )}

                    {alunosFiltrados.map((aluno, rowIdx) => {
                      const alunoId = aluno.id || aluno.aluno_id;
                      const totalNota = calcTotal(alunoId);
                      const mediaCor = corNota(totalNota ? Number(totalNota) : null);

                      return (
                        <tr
                          key={alunoId}
                          style={{
                            background: rowIdx % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                          }}
                        >
                          {/* Nome do aluno — coluna fixa */}
                          <td
                            className="sticky left-0 z-10 px-3 py-2 font-medium"
                            style={{
                              background: rowIdx % 2 === 0 ? "#0f1a2e" : "#111f38",
                              color: "#e2e8f0",
                              borderBottom: "1px solid rgba(99,179,237,0.08)",
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-white leading-tight">
                                {aluno.nome || aluno.estudante}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                RE {aluno.matricula || aluno.codigo || "N/D"}
                              </span>
                            </div>
                          </td>

                          {/* Células de notas */}
                          {itens.map((item, idx) => {
                            const ops = item.oportunidades || 1;
                            return Array.from({ length: ops }, (_, opIdx) => {
                              const nota = getNota(alunoId, idx, opIdx);
                              const cor = corNota(nota);
                              return (
                                <td
                                  key={`${idx}_${opIdx}`}
                                  className="px-2 py-2 text-center font-bold text-sm"
                                  style={{
                                    background: nota !== null ? cor.bg : "transparent",
                                    color: nota !== null ? cor.text : "#475569",
                                    border: nota !== null ? `1px solid ${cor.border}` : "1px solid transparent",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {nota !== null ? Number(nota).toFixed(1).replace(".", ",") : "—"}
                                </td>
                              );
                            });
                          })}

                          {/* Total */}
                          <td
                            className="px-2 py-2 text-center font-bold text-sm"
                            style={{
                              background: totalNota !== null ? mediaCor.bg : "transparent",
                              color: totalNota !== null ? mediaCor.text : "#475569",
                              borderBottom: "1px solid rgba(99,179,237,0.08)",
                            }}
                          >
                            {totalNota !== null ? totalNota.replace(".", ",") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Legenda */}
              <div className="flex items-center gap-4 mt-4 px-2 flex-wrap">
                <span className="text-xs text-slate-500">Legenda:</span>
                {[
                  { label: "≥ 7,0 (Aprovado)", bg: "#dcfce7", text: "#15803d" },
                  { label: "5,0 – 6,9 (Recuperação)", bg: "#fef9c3", text: "#854d0e" },
                  { label: "< 5,0 (Reprovado)", bg: "#fee2e2", text: "#b91c1c" },
                  { label: "Sem nota", bg: "transparent", text: "#475569" },
                ].map(({ label, bg, text }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded border"
                      style={{ background: bg, borderColor: text + "55" }}
                    />
                    <span className="text-xs" style={{ color: "#94a3b8" }}>{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div
          className="flex justify-end px-6 py-4 rounded-b-2xl"
          style={{ borderTop: "1px solid rgba(99,179,237,0.15)" }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
