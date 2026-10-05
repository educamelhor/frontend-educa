// src/features/secretaria/turmas/agrupamentos/AgrupamentoEnturmacaoModal.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  XMarkIcon,
  UserPlusIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import api from "../../../../services/api";

export default function AgrupamentoEnturmacaoModal({
  open,
  onClose,
  agrupamento,
  onUpdated,
}) {
  const [turmasOrigem, setTurmasOrigem] = useState([]);
  const [turmaOrigemSelecionada, setTurmaOrigemSelecionada] = useState("");
  const [busca, setBusca] = useState("");

  const [alunosEnturmados, setAlunosEnturmados] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Confirmação de choques de agrupamento (conflitos de período)
  const [conflitosAlerta, setConflitosAlerta] = useState(null);

  // Aba ativa no modal: "enturmar" ou "enturmados"
  const [abaAtiva, setAbaAtiva] = useState("enturmar");

  const carregarDadosIniciais = async () => {
    if (!agrupamento?.id) return;
    setCarregando(true);
    setErro("");
    try {
      const [resTurmas, resEnturmados] = await Promise.all([
        api.get("/api/turmas"),
        api.get(`/api/agrupamentos/${agrupamento.id}/alunos`),
      ]);

      const turmasAno = (Array.isArray(resTurmas.data) ? resTurmas.data : []).filter(
        (t) => Number(t.ano) === Number(agrupamento.ano_letivo)
      );
      setTurmasOrigem(turmasAno);
      setAlunosEnturmados(resEnturmados.data || []);
      setSelecionados(new Set());
    } catch (err) {
      console.error("Erro ao carregar dados de enturmação:", err);
      setErro("Não foi possível carregar os dados de enturmação.");
    } finally {
      setCarregando(false);
    }
  };

  const carregarCandidatos = async () => {
    if (!agrupamento?.id) return;
    try {
      const params = {
        ano: agrupamento.ano_letivo,
        turma_id: turmaOrigemSelecionada || undefined,
        q: busca.trim() || undefined,
        limite: 150,
      };
      const res = await api.get(`/api/agrupamentos/${agrupamento.id}/candidatos`, { params });
      setCandidatos(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar candidatos:", err);
    }
  };

  useEffect(() => {
    if (open) {
      carregarDadosIniciais();
    }
  }, [open, agrupamento?.id]);

  useEffect(() => {
    if (open && agrupamento?.id) {
      const timer = setTimeout(() => {
        carregarCandidatos();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, agrupamento?.id, turmaOrigemSelecionada, busca]);

  if (!open || !agrupamento) return null;

  // Toggle de seleção de aluno candidato
  const toggleSelecionado = (alunoId) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(alunoId)) next.delete(alunoId);
      else next.add(alunoId);
      return next;
    });
  };

  // Selecionar todos os candidatos visíveis
  const toggleSelecionarTodos = () => {
    if (selecionados.size === candidatos.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(candidatos.map((c) => c.id)));
    }
  };

  // Submeter enturmação
  const handleEnturmar = async (forcarConfirmacao = false) => {
    if (selecionados.size === 0) return;
    setSalvando(true);
    setErro("");
    setConflitosAlerta(null);

    try {
      const payload = {
        aluno_ids: Array.from(selecionados),
        confirmar: forcarConfirmacao,
      };
      const res = await api.post(`/api/agrupamentos/${agrupamento.id}/alunos`, payload);

      setSucesso(`✅ ${res.data.adicionados} aluno(s) enturmado(s) com sucesso!`);
      setTimeout(() => setSucesso(""), 4000);
      setSelecionados(new Set());
      await carregarDadosIniciais();
      await carregarCandidatos();
      if (onUpdated) onUpdated();
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.requer_confirmacao) {
        setConflitosAlerta(err.response.data.conflitos || []);
      } else {
        setErro(err?.response?.data?.message || "Não foi possível enturmar os alunos.");
      }
    } finally {
      setSalvando(false);
    }
  };

  // Desenturmar aluno
  const handleDesenturmar = async (alunoId, nome) => {
    if (!window.confirm(`Deseja remover "${nome}" desta turma de agrupamento?`)) {
      return;
    }
    try {
      await api.post(`/api/agrupamentos/${agrupamento.id}/alunos/remover`, {
        aluno_ids: [alunoId],
      });
      await carregarDadosIniciais();
      await carregarCandidatos();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err?.response?.data?.message || "Não foi possível remover o aluno.");
    }
  };

  // Vagas
  const totalEnturmados = alunosEnturmados.length;
  const capacidade = agrupamento.capacidade ? Number(agrupamento.capacidade) : null;
  const vagasLivres = capacidade !== null ? Math.max(0, capacidade - totalEnturmados) : null;
  const pctOcupacao = capacidade !== null ? Math.min(100, Math.round((totalEnturmados / capacidade) * 100)) : null;

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
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-6 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
              <UserPlusIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Enturmação Mista de Alunos
              </h2>
              <p className="text-blue-100 text-xs mt-1">
                Turma: <strong className="text-white">{agrupamento.nome}</strong> • {agrupamento.turno} • {agrupamento.semestre}º Semestre
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

        {/* Indicador de Vagas e Ocupação */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-600">Alunos Enturmados:</span>
              <span className="text-sm font-bold text-slate-900">{totalEnturmados}</span>
            </div>
            {capacidade !== null && (
              <>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Capacidade:</span>
                  <strong className="font-bold text-slate-900">{capacidade} vagas</strong>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span>Vagas restantes:</span>
                  <strong
                    className={`font-bold ${
                      vagasLivres === 0
                        ? "text-red-600"
                        : vagasLivres <= 5
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {vagasLivres}
                  </strong>
                </div>
              </>
            )}
          </div>

          {capacidade !== null && (
            <div className="w-36 flex items-center gap-2">
              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pctOcupacao >= 100
                      ? "bg-red-500"
                      : pctOcupacao >= 80
                      ? "bg-amber-500"
                      : "bg-indigo-600"
                  }`}
                  style={{ width: `${pctOcupacao}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-600">{pctOcupacao}%</span>
            </div>
          )}
        </div>

        {/* Seletor de Abas: Adicionar Alunos vs Ver Já Enturmados */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setAbaAtiva("enturmar")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              abaAtiva === "enturmar"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>Buscar & Enturmar Alunos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px]">
              {candidatos.length} disponíveis
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("enturmados")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              abaAtiva === "enturmados"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>Alunos na Turma</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
              {alunosEnturmados.length}
            </span>
          </button>
        </div>

        {/* Feedback Messages */}
        {erro && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl font-medium">
            {sucesso}
          </div>
        )}

        {/* Alerta de Choque de Horário / Agrupamento Duplo */}
        {conflitosAlerta && (
          <div className="m-4 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Alunos com outro agrupamento no mesmo período ({conflitosAlerta.length})
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Os seguintes estudantes já estão alocados em outra turma mista no mesmo período. Deseja confirmar a enturmação mista mesmo assim?
                </p>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto bg-white/70 rounded-xl p-2.5 border border-amber-200 text-xs divide-y divide-amber-100">
              {conflitosAlerta.map((c) => (
                <div key={c.aluno_id} className="py-1.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{c.nome}</span>
                  <div className="flex gap-1.5">
                    {c.agrupamentos.map((ag) => (
                      <span
                        key={ag.agrupamento_id}
                        className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium"
                      >
                        {ag.nome} ({ag.turno})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConflitosAlerta(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleEnturmar(true)}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
              >
                Confirmar e Enturmar Mesmo Assim
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto flex-1">
          {abaAtiva === "enturmar" ? (
            <div className="space-y-4">
              {/* Filtros de Origem */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou matrícula…"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <select
                    value={turmaOrigemSelecionada}
                    onChange={(e) => setTurmaOrigemSelecionada(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:border-indigo-500 outline-none bg-white font-medium"
                  >
                    <option value="">— Todas as turmas regulares de origem —</option>
                    {turmasOrigem.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} ({t.turno}) - {t.etapa || t.serie}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barra de Ação em Lote */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={candidatos.length > 0 && selecionados.size === candidatos.length}
                    onChange={toggleSelecionarTodos}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Selecionar todos ({candidatos.length})</span>
                </label>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    disabled={salvando || selecionados.size === 0}
                    onClick={() => handleEnturmar(false)}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {salvando ? "Enturmando…" : `+ Enturmar Selecionados (${selecionados.size})`}
                  </button>
                </div>
              </div>

              {/* Lista de Alunos Candidatos */}
              {carregando ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Carregando lista de alunos…
                </div>
              ) : candidatos.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Nenhum aluno encontrado com os filtros aplicados.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto bg-white shadow-sm">
                  {candidatos.map((al) => {
                    const isSelected = selecionados.has(al.id);
                    return (
                      <div
                        key={al.id}
                        onClick={() => toggleSelecionado(al.id)}
                        className={`p-3 flex items-center justify-between hover:bg-indigo-50/50 cursor-pointer transition select-none ${
                          isSelected ? "bg-indigo-50/80" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // tratado no onClick do container
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <div>
                            <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                              <span>{al.nome}</span>
                              {al.matricula && (
                                <span className="text-[11px] text-slate-400 font-normal">
                                  Matrícula: {al.matricula}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>
                                Turma Base: <strong className="text-slate-700">{al.turma_nome}</strong> ({al.turma_turno})
                              </span>
                              {al.outros_agrupamentos > 0 && (
                                <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px] flex items-center gap-1">
                                  <span>⚠️</span> {al.outros_agrupamentos} outro agrupamento
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-indigo-600">
                          {isSelected ? "Selecionado" : "+ Selecionar"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Aba: Alunos já Enturmados */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Estudantes Matriculados nesta Turma de Agrupamento
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Total: <strong>{alunosEnturmados.length} alunos</strong>
                </span>
              </div>

              {alunosEnturmados.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Nenhum aluno enturmado nesta turma ainda. Vá para a aba "Buscar & Enturmar Alunos".
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                  {alunosEnturmados.map((al, idx) => (
                    <div
                      key={al.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800">
                            {al.nome}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>
                              Turma de Origem: <strong className="text-slate-700">{al.turma_origem || "—"}</strong>
                            </span>
                            {al.matricula && (
                              <span>• Matrícula: {al.matricula}</span>
                            )}
                            <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                              Ativo
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDesenturmar(al.aluno_id, al.nome)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                        title="Remover aluno do agrupamento"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Desenturmar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm transition cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
