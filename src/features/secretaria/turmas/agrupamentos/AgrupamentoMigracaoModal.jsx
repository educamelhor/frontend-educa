// src/features/secretaria/turmas/agrupamentos/AgrupamentoMigracaoModal.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  XMarkIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import api from "../../../../services/api";

export default function AgrupamentoMigracaoModal({
  open,
  onClose,
  anoLetivo = new Date().getFullYear(),
  onMigrated,
}) {
  const [legados, setLegados] = useState([]);
  const [pilotoJaExecutado, setPilotoJaExecutado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [selecionados, setSelecionados] = useState(new Set());
  const [planoSimulacao, setPlanoSimulacao] = useState(null);
  const [simulando, setSimulando] = useState(false);
  const [executando, setExecutando] = useState(false);

  const [resultadoExecucao, setResultadoExecucao] = useState(null);
  const [erro, setErro] = useState("");

  const carregarLegados = async () => {
    setCarregando(true);
    setErro("");
    setPlanoSimulacao(null);
    setResultadoExecucao(null);
    try {
      const res = await api.get(`/api/agrupamentos/migracao/legados?ano=${anoLetivo}`);
      const lista = res.data?.legados || [];
      setLegados(lista);
      setPilotoJaExecutado(res.data?.piloto_ja_executado || false);

      // Pré-seleciona o primeiro legado com notas para facilitar o piloto
      const primeiroComNota = lista.find((l) => l.alunos_com_nota > 0 && l.agrupamentos_migrados === 0);
      if (primeiroComNota) {
        setSelecionados(new Set([primeiroComNota.id]));
      } else {
        setSelecionados(new Set());
      }
    } catch (err) {
      console.error("Erro ao listar legados:", err);
      setErro("Não foi possível carregar as disciplinas legadas.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (open) {
      carregarLegados();
    }
  }, [open, anoLetivo]);

  if (!open) return null;

  const toggleSelecionado = (id) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPlanoSimulacao(null);
  };

  const selecionarTodos = () => {
    if (selecionados.size === legados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(legados.map((l) => l.id)));
    }
    setPlanoSimulacao(null);
  };

  // Simular Migração (Dry-Run obrigatório antes de gravar)
  const handleSimular = async () => {
    if (selecionados.size === 0) return;
    setSimulando(true);
    setErro("");
    try {
      const res = await api.post("/api/agrupamentos/migracao/executar", {
        ano_letivo: anoLetivo,
        disciplina_ids: Array.from(selecionados),
        modo: "dry-run",
      });
      setPlanoSimulacao(res.data?.plano || []);
    } catch (err) {
      setErro(err?.response?.data?.message || "Erro ao executar simulação.");
    } finally {
      setSimulando(false);
    }
  };

  // Executar Migração Real (1 piloto ou lote se piloto já foi feito)
  const handleExecutar = async (isPiloto = false) => {
    const ids = isPiloto
      ? [Array.from(selecionados)[0]]
      : Array.from(selecionados);

    if (ids.length === 0 || !ids[0]) return;

    const msg = isPiloto
      ? `Confirma a execução do PILOTO para 1 disciplina legada? Ela será convertida em Turma de Agrupamento com seus alunos enturmados.`
      : `Confirma a migração de ${ids.length} disciplinas legadas selecionadas para Turmas de Agrupamento?`;

    if (!window.confirm(msg)) return;

    setExecutando(true);
    setErro("");
    try {
      const res = await api.post("/api/agrupamentos/migracao/executar", {
        ano_letivo: anoLetivo,
        disciplina_ids: ids,
        modo: "executar",
        confirmar: true,
      });
      setResultadoExecucao(res.data?.resultado || []);
      setPlanoSimulacao(null);
      await carregarLegados();
      if (onMigrated) onMigrated();
    } catch (err) {
      setErro(err?.response?.data?.message || "Erro ao executar migração.");
    } finally {
      setExecutando(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Premium */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 p-6 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
              <BoltIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Assistente de Migração de Eletivas Legadas
              </h2>
              <p className="text-amber-100 text-xs mt-1">
                Converte disciplinas com padrão IFA/Eletiva para Turmas de Agrupamento sem alterar notas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all text-white z-10 cursor-pointer"
            title="Fechar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback / Erros */}
        {erro && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {erro}
          </div>
        )}

        {/* Conteúdo rolável */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Caixa explicativa de segurança */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-sm text-amber-950">
              <CheckCircleIcon className="w-4 h-4 text-amber-600" />
              <span>Garantia de Integridade e Não-Destrutividade</span>
            </div>
            <p>
              • <strong>Notas intocadas:</strong> as notas já lançadas permanecem exatamente como estão em <code>notas</code>.
            </p>
            <p>
              • <strong>Disciplinas preservadas:</strong> nenhuma disciplina legada é apagada ou renomeada. O sistema apenas cria as turmas de agrupamento correspondentes e enturma os alunos que tiveram notas no semestre.
            </p>
            <p>
              • <strong>Trava de Segurança:</strong> é obrigatório executar primeiro um <strong>Piloto com 1 disciplina</strong> para conferir o resultado antes de migrar em lote.
            </p>
          </div>

          {/* Resultado de Execução Concluída */}
          {resultadoExecucao && (
            <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                <span>Migração Concluída com Sucesso!</span>
              </div>
              <div className="space-y-2 text-xs">
                {resultadoExecucao.map((r) => (
                  <div key={r.disciplina_id} className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                    <div className="font-bold text-sm text-slate-800">{r.nome}</div>
                    <div className="text-slate-600 mt-1">
                      {r.criados && r.criados.length > 0 ? (
                        r.criados.map((c, i) => (
                          <span key={i} className="inline-block mr-3">
                            • {c.semestre}º Semestre: <strong>{c.alunos} alunos</strong> ({c.turno})
                          </span>
                        ))
                      ) : (
                        <span>Já estava totalmente migrado.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plano de Simulação (Dry-Run Visual) */}
          {planoSimulacao && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-900">
                  <span>📋 Simulação da Migração (Dry-Run)</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 text-xs">
                    {planoSimulacao.length} disciplina{planoSimulacao.length !== 1 ? "s" : ""} analisada{planoSimulacao.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-xs text-blue-700">Nenhum dado foi alterado ainda</span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {planoSimulacao.map((p) => (
                  <div
                    key={p.disciplina_id}
                    className="p-3.5 bg-white rounded-xl border border-blue-100 shadow-sm text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-sm text-slate-800">{p.nome}</span>
                      <span className="text-slate-400">ID: {p.disciplina_id}</span>
                    </div>

                    {p.semestres.length === 0 ? (
                      <div className="text-slate-500 italic">
                        Nenhum aluno com notas registradas em 2026.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {p.semestres.map((s, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1"
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-700">
                              <span>
                                Turma: <strong>{s.nome_agrupamento}</strong> ({s.semestre}º Semestre • {s.turno})
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                                {s.total_alunos} alunos
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500">
                              Turmas de Origem:{" "}
                              {Object.entries(s.por_turma || {})
                                .map(([tNome, qtd]) => `${tNome} (${qtd})`)
                                .join(", ")}
                            </div>

                            {s.ja_migrado && (
                              <div className="text-[11px] text-amber-700 font-medium">
                                ⚠️ Já migrado anteriormente como Agrupamento #{s.agrupamento_existente_id}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Botões para Executar */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-blue-200">
                {!pilotoJaExecutado ? (
                  <button
                    type="button"
                    disabled={executando}
                    onClick={() => handleExecutar(true)}
                    className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    {executando ? "Executando…" : "🚀 Executar Piloto (1ª Disciplina)"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={executando}
                    onClick={() => handleExecutar(false)}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    {executando
                      ? "Migrando em lote…"
                      : `🚀 Migrar em Lote (${selecionados.size} Selecionadas)`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tabela de Disciplinas Legadas Detectadas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span>Disciplinas Legadas Detectadas</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  {legados.length} encontradas
                </span>
              </h3>

              <button
                type="button"
                onClick={selecionarTodos}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                {selecionados.size === legados.length
                  ? "Desmarcar todas"
                  : "Selecionar todas"}
              </button>
            </div>

            {carregando ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Buscando disciplinas legadas…
              </div>
            ) : legados.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-500 text-sm">
                Nenhuma disciplina legada (IFA/Eletiva) encontrada para migração no ano letivo selecionado.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white shadow-sm">
                {legados.map((l) => {
                  const isSelected = selecionados.has(l.id);
                  const jaMigrada = l.agrupamentos_migrados > 0;

                  return (
                    <div
                      key={l.id}
                      onClick={() => toggleSelecionado(l.id)}
                      className={`p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition select-none ${
                        isSelected ? "bg-amber-50/60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            <span>{l.nome}</span>
                            {l.abreviatura && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                                {l.abreviatura}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>
                              Tipo: <strong>{l.tipo}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-indigo-600 font-semibold">
                              {l.alunos_com_nota} alunos com nota
                            </span>
                            {jaMigrada && (
                              <span className="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                Já migrada ({l.agrupamentos_migrados} agrupamento)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-amber-700">
                        {isSelected ? "Selecionada" : "+ Selecionar"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com botão de simulação */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {selecionados.size} disciplina{selecionados.size !== 1 ? "s" : ""} selecionada{selecionados.size !== 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={simulando || selecionados.size === 0}
              onClick={handleSimular}
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {simulando ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Simulando…</span>
                </>
              ) : (
                <>
                  <span>Simular Migração (Dry-Run)</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
