// src/features/secretaria/turmas/agrupamentos/AgrupamentoEnturmacaoModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import {
  XMarkIcon,
  UserPlusIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import api from "../../../../services/api";

function normalizaTexto(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function AgrupamentoEnturmacaoModal({
  open,
  onClose,
  agrupamento,
  onUpdated,
}) {
  // ─── Turnos e Turmas de Origem ───────────────────────────────────────────
  const [turmasOrigem, setTurmasOrigem] = useState([]);
  const [turnoOrigemSelecionado, setTurnoOrigemSelecionado] = useState(
    agrupamento?.turno || "Noturno"
  );
  const [turmaOrigemSelecionada, setTurmaOrigemSelecionada] = useState("");
  const [busca, setBusca] = useState("");

  // ─── Alunos Enturmados e Candidatos ───────────────────────────────────────
  const [alunosEnturmados, setAlunosEnturmados] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());

  // ─── Estados de Carregamento e Mensagens ──────────────────────────────────
  const [carregando, setCarregando] = useState(true);
  const [carregandoCandidatos, setCarregandoCandidatos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Confirmação de choques de agrupamento (conflitos de período)
  const [conflitosAlerta, setConflitosAlerta] = useState(null);

  // Aba ativa no modal: "enturmar" ou "enturmados"
  const [abaAtiva, setAbaAtiva] = useState("enturmar");

  // Atualiza turno inicial ao abrir para corresponder ao agrupamento
  useEffect(() => {
    if (agrupamento?.turno) {
      setTurnoOrigemSelecionado(agrupamento.turno);
    }
  }, [agrupamento?.turno]);

  // Carrega turmas da escola e alunos já enturmados
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

  // Turnos disponíveis que possuem turmas cadastradas
  const turnosDisponiveis = useMemo(() => {
    const listaPadrao = ["Matutino", "Vespertino", "Noturno", "Integral"];
    const set = new Set();
    turmasOrigem.forEach((t) => {
      if (t.turno) {
        const turnMatch = listaPadrao.find(
          (p) => normalizaTexto(p) === normalizaTexto(t.turno)
        );
        if (turnMatch) set.add(turnMatch);
        else set.add(t.turno);
      }
    });
    // Se a lista estiver vazia ou não achar, mantém os padrões
    return Array.from(set).length > 0 ? Array.from(set) : listaPadrao;
  }, [turmasOrigem]);

  // Turmas filtradas pelo turno selecionado (e etapa, se aplicável)
  const turmasDoTurno = useMemo(() => {
    return turmasOrigem.filter((t) => {
      if (
        turnoOrigemSelecionado &&
        normalizaTexto(t.turno) !== normalizaTexto(turnoOrigemSelecionado)
      ) {
        return false;
      }
      // Se agrupamento tiver etapa definida (ex: Médio), filtra turmas do Médio
      if (agrupamento?.etapa && t.etapa) {
        if (normalizaTexto(t.etapa) !== normalizaTexto(agrupamento.etapa)) return false;
      }
      return true;
    });
  }, [turmasOrigem, turnoOrigemSelecionado, agrupamento?.etapa]);

  // Se trocar de turno e a turma selecionada não pertencer a esse turno, reseta
  useEffect(() => {
    if (turmaOrigemSelecionada) {
      const pertence = turmasDoTurno.some(
        (t) => String(t.id) === String(turmaOrigemSelecionada)
      );
      if (!pertence) {
        setTurmaOrigemSelecionada("");
        setCandidatos([]);
        setSelecionados(new Set());
      }
    }
  }, [turnoOrigemSelecionado, turmasDoTurno, turmaOrigemSelecionada]);

  // Carrega alunos candidatos da turma selecionada
  const carregarCandidatos = async () => {
    if (!agrupamento?.id) return;
    if (!turmaOrigemSelecionada) {
      setCandidatos([]);
      return;
    }

    setCarregandoCandidatos(true);
    try {
      const params = {
        ano: agrupamento.ano_letivo,
        turma_id: turmaOrigemSelecionada,
        q: busca.trim() || undefined,
        limite: 300, // traz todos os alunos da turma
      };
      const res = await api.get(`/api/agrupamentos/${agrupamento.id}/candidatos`, {
        params,
      });
      setCandidatos(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar candidatos:", err);
    } finally {
      setCarregandoCandidatos(false);
    }
  };

  useEffect(() => {
    if (open) {
      carregarDadosIniciais();
    }
  }, [open, agrupamento?.id]);

  useEffect(() => {
    if (open && agrupamento?.id && turmaOrigemSelecionada) {
      const timer = setTimeout(() => {
        carregarCandidatos();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open, agrupamento?.id, turmaOrigemSelecionada, busca]);

  if (!open || !agrupamento) return null;

  // Toggle de seleção individual
  const toggleSelecionado = (alunoId) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(alunoId)) next.delete(alunoId);
      else next.add(alunoId);
      return next;
    });
  };

  // Selecionar Turma Inteira (ou desmarcar todos)
  const handleSelecionarTurmaInteira = () => {
    if (selecionados.size === candidatos.length && candidatos.length > 0) {
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

    const turmaNome =
      turmasDoTurno.find((t) => String(t.id) === String(turmaOrigemSelecionada))
        ?.nome || "turma";

    try {
      const payload = {
        aluno_ids: Array.from(selecionados),
        confirmar: forcarConfirmacao,
      };
      const res = await api.post(
        `/api/agrupamentos/${agrupamento.id}/alunos`,
        payload
      );

      const qtd = res.data.adicionados;
      setSucesso(
        `✅ ${qtd} aluno(s) da turma ${turmaNome} enturmado(s) com sucesso!`
      );
      setTimeout(() => setSucesso(""), 4500);

      setSelecionados(new Set());
      await carregarDadosIniciais();
      await carregarCandidatos();
      if (onUpdated) onUpdated();
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.requer_confirmacao) {
        setConflitosAlerta(err.response.data.conflitos || []);
      } else {
        setErro(
          err?.response?.data?.message || "Não foi possível enturmar os alunos."
        );
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

  // Métricas de vagas
  const totalEnturmados = alunosEnturmados.length;
  const capacidade = agrupamento.capacidade ? Number(agrupamento.capacidade) : null;
  const vagasLivres =
    capacidade !== null ? Math.max(0, capacidade - totalEnturmados) : null;
  const pctOcupacao =
    capacidade !== null
      ? Math.min(100, Math.round((totalEnturmados / capacidade) * 100))
      : null;

  const turmaObjSelecionada = turmasDoTurno.find(
    (t) => String(t.id) === String(turmaOrigemSelecionada)
  );

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header Premium ──────────────────────────────────────────────── */}
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
                Turma: <strong className="text-white">{agrupamento.nome}</strong> • Turno:{" "}
                <span className="font-semibold text-white">{agrupamento.turno}</span> •{" "}
                {agrupamento.semestre}º Semestre
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

        {/* ── Indicador de Vagas e Ocupação ───────────────────────────────── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
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

        {/* ── Seletor de Abas Principais do Modal ──────────────────────────── */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-200 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={() => setAbaAtiva("enturmar")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              abaAtiva === "enturmar"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>Buscar & Enturmar Alunos</span>
            {turmaOrigemSelecionada && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                {candidatos.length} disponíveis
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("enturmados")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              abaAtiva === "enturmados"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>Alunos na Turma</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              {alunosEnturmados.length}
            </span>
          </button>
        </div>

        {/* ── Mensagens de Feedback ───────────────────────────────────────── */}
        {erro && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex-shrink-0 font-medium">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl flex-shrink-0 font-bold flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* ── Alerta de Choque de Horário ──────────────────────────────────── */}
        {conflitosAlerta && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 space-y-3 flex-shrink-0">
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
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleEnturmar(true)}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Confirmar e Enturmar Mesmo Assim
              </button>
            </div>
          </div>
        )}

        {/* ── Conteúdo das Abas ────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {abaAtiva === "enturmar" ? (
            <div className="space-y-5">
              {/* ── PASSO 1: SELEÇÃO SEQUENCIAL DE TURNO (Pills) ───────────── */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>Selecione o Turno de Origem:</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Origem dos estudantes
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {turnosDisponiveis.map((t) => {
                    const isAtivo = normalizaTexto(turnoOrigemSelecionado) === normalizaTexto(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTurnoOrigemSelecionado(t);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isAtivo
                            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-100 scale-105"
                            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-sm"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── PASSO 2: SELEÇÃO SEQUENCIAL DE TURMA (Pills) ───────────── */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>Selecione a Turma Regular:</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {turmasDoTurno.length} turma(s) em {turnoOrigemSelecionado}
                  </span>
                </div>

                {turmasDoTurno.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 italic">
                    Nenhuma turma regular cadastrada para o turno {turnoOrigemSelecionado} neste ano letivo.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                    {turmasDoTurno.map((turma) => {
                      const isAtiva = String(turmaOrigemSelecionada) === String(turma.id);
                      return (
                        <button
                          key={turma.id}
                          type="button"
                          onClick={() => {
                            setTurmaOrigemSelecionada(turma.id);
                            setSelecionados(new Set());
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isAtiva
                              ? "bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-100 scale-105"
                              : "bg-white hover:bg-indigo-50/60 text-slate-700 border border-slate-200/90 shadow-sm hover:border-indigo-300"
                          }`}
                        >
                          <span>{turma.nome}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                              isAtiva ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {turma.etapa || turma.serie || "Regular"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── PASSO 3: LISTA DE ALUNOS DA TURMA SELECIONADA ───────────── */}
              {!turmaOrigemSelecionada ? (
                <div className="py-12 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 space-y-2">
                  <UserPlusIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">
                    Clique em uma turma acima no Passo 2 para carregar seus alunos
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Você poderá selecionar a turma inteira de uma só vez ou escolher alunos individualmente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Cabeçalho da Lista + Selecionar Turma Inteira + Ações */}
                  <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Botão Selecionar Turma Inteira */}
                      <button
                        type="button"
                        onClick={handleSelecionarTurmaInteira}
                        disabled={candidatos.length === 0}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                          selecionados.size === candidatos.length && candidatos.length > 0
                            ? "bg-indigo-700 text-white hover:bg-indigo-800"
                            : "bg-white text-indigo-700 hover:bg-indigo-100/60 border border-indigo-200"
                        }`}
                      >
                        <CheckIcon className="w-4 h-4" />
                        <span>
                          {selecionados.size === candidatos.length && candidatos.length > 0
                            ? "Desmarcar Todos"
                            : `Selecionar Turma Inteira (${candidatos.length})`}
                        </span>
                      </button>

                      <span className="text-xs font-bold text-slate-700">
                        {selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Busca Rápida na Turma */}
                    <div className="relative w-full sm:w-60">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar aluno na turma…"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      />
                    </div>

                    {/* Botão Principal: Enturmar no Agrupamento */}
                    <button
                      type="button"
                      disabled={salvando || selecionados.size === 0}
                      onClick={() => handleEnturmar(false)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-100 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {salvando ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          <span>Enturmando…</span>
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="w-4 h-4" />
                          <span>+ Inserir na Turma ({selecionados.size})</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lista de Alunos da Turma */}
                  {carregandoCandidatos ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Carregando alunos da turma {turmaObjSelecionada?.nome}…
                    </div>
                  ) : candidatos.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Nenhum aluno disponível para enturmação nesta turma (todos já podem ter sido enturmados ou nenhum corresponde à busca).
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white shadow-sm">
                      {candidatos.map((al) => {
                        const isSelected = selecionados.has(al.id);
                        return (
                          <div
                            key={al.id}
                            onClick={() => toggleSelecionado(al.id)}
                            className={`p-3 flex items-center justify-between hover:bg-indigo-50/40 cursor-pointer transition select-none ${
                              isSelected ? "bg-indigo-50/70" : ""
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
                                <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                                  <span>{al.nome}</span>
                                  {al.matricula && (
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      Matrícula: {al.matricula}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                  <span>Turma Base: <strong>{al.turma_nome}</strong></span>
                                  {al.outros_agrupamentos > 0 && (
                                    <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px] flex items-center gap-1">
                                      <span>⚠️</span> {al.outros_agrupamentos} outro agrupamento
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div
                              className={`text-xs font-bold ${
                                isSelected ? "text-indigo-700" : "text-slate-400 hover:text-indigo-600"
                              }`}
                            >
                              {isSelected ? "✓ Selecionado" : "+ Selecionar"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── ABA: ALUNOS JÁ ENTURMADOS NESTA TURMA DE AGRUPAMENTO ─────── */
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
                <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Nenhum aluno enturmado nesta turma ainda. Vá para a aba "Buscar & Enturmar Alunos" e selecione uma turma de origem.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm max-h-96 overflow-y-auto">
                  {alunosEnturmados.map((al, idx) => (
                    <div
                      key={al.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-800">
                            {al.nome}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>
                              Turma de Origem: <strong className="text-slate-700">{al.turma_origem || "—"}</strong>
                            </span>
                            {al.matricula && (
                              <span>• Matrícula: {al.matricula}</span>
                            )}
                            <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                              Ativo
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDesenturmar(al.aluno_id, al.nome)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
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

        {/* ── Rodapé ──────────────────────────────────────────────────────── */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {alunosEnturmados.length} aluno(s) enturmado(s) de {capacidade || "livre"} vagas
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer shadow-sm"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
