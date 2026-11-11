// src/features/secretaria/matriculas/ModalMatricularAlunosProjeto.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function ModalMatricularAlunosProjeto({
  aberto,
  onClose,
  turma,
  projeto,
  turmasRegulares = [],
  onMatriculado,
}) {
  const [busca, setBusca] = useState("");
  const [turmaOrigemId, setTurmaOrigemId] = useState("");
  const [mesmoTurno, setMesmoTurno] = useState(true);
  const [candidatos, setCandidatos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionados, setSelecionados] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const vagasRestantesIniciais =
    turma?.vagas_restantes !== null && turma?.vagas_restantes !== undefined
      ? Number(turma.vagas_restantes)
      : 999;

  const carregarCandidatos = useCallback(async () => {
    if (!aberto || !turma?.id) return;
    setCarregando(true);
    try {
      const res = await api.get(
        `/api/matriculas/projetos/turmas/${turma.id}/candidatos`,
        {
          params: {
            q: busca.trim() || undefined,
            turma_origem_id: turmaOrigemId || undefined,
            mesmo_turno: mesmoTurno ? "1" : "0",
            limite: 180,
          },
        }
      );
      setCandidatos(res.data?.candidatos || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erro ao pesquisar estudantes."
      );
    } finally {
      setCarregando(false);
    }
  }, [aberto, turma?.id, busca, turmaOrigemId, mesmoTurno]);

  useEffect(() => {
    if (!aberto) {
      setSelecionados([]);
      setBusca("");
      setTurmaOrigemId("");
      return;
    }
    const timer = setTimeout(() => {
      carregarCandidatos();
    }, 220);
    return () => clearTimeout(timer);
  }, [aberto, carregarCandidatos]);

  if (!aberto || !turma) return null;

  const vagasAposSelecao = Math.max(0, vagasRestantesIniciais - selecionados.length);

  const toggleAluno = (alunoId) => {
    setSelecionados((prev) => {
      if (prev.includes(alunoId)) {
        return prev.filter((id) => id !== alunoId);
      }
      if (prev.length >= vagasRestantesIniciais) {
        toast.error(
          `Limite atingido: restam apenas ${vagasRestantesIniciais} vaga(s) nesta turma.`
        );
        return prev;
      }
      return [...prev, alunoId];
    });
  };

  const selecionarVisiveisAteLimite = () => {
    const idsAtuais = new Set(selecionados);
    const novos = [...selecionados];
    for (const c of candidatos) {
      if (novos.length >= vagasRestantesIniciais) break;
      if (!idsAtuais.has(c.aluno_id)) {
        idsAtuais.add(c.aluno_id);
        novos.push(c.aluno_id);
      }
    }
    setSelecionados(novos);
  };

  const handleConfirmarMatricula = async () => {
    if (selecionados.length === 0) {
      toast.error("Selecione ao menos um estudante.");
      return;
    }
    setSalvando(true);
    try {
      const res = await api.post(
        `/api/matriculas/projetos/turmas/${turma.id}/matricular`,
        { aluno_ids: selecionados }
      );
      toast.success(
        res.data?.message ||
          `${selecionados.length} estudante(s) matriculado(s) na ${turma.apelido_turma}!`
      );
      if (onMatriculado) onMatriculado();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Não foi possível concluir a matrícula nesta turma."
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20">
                {turma.apelido_turma} • {turma.turno}
              </span>
              <span className="text-xs text-white/80">
                {turma.semestre === 0 ? "Anual" : `${turma.semestre}º Semestre`}
              </span>
            </div>
            <h3 className="text-lg font-bold mt-1">
              Matricular Estudantes — {projeto?.nome || turma.nome}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Vagas em Tempo Real */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-slate-600">
              Capacidade: <strong className="text-slate-900">{turma.capacidade ?? "Livre"}</strong>
            </span>
            <span className="text-slate-600">
              Já Matriculados: <strong className="text-slate-900">{turma.matriculados || 0}</strong>
            </span>
            <span className="text-indigo-700 font-bold">
              Selecionados agora: {selecionados.length}
            </span>
          </div>

          <span
            className={`px-3 py-1 rounded-full font-extrabold ${
              vagasAposSelecao === 0
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
            }`}
          >
            Vagas restantes após confirmar: {vagasAposSelecao}
          </span>
        </div>

        {/* Filtros de Pesquisa */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-3 relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar estudante por nome ou matrícula/código..."
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <select
                value={turmaOrigemId}
                onChange={(e) => setTurmaOrigemId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">Todas as Turmas Regulares</option>
                {turmasRegulares.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.nome} ({tr.turno})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mesmoTurno}
                onChange={(e) => setMesmoTurno(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
              Mostrar apenas estudantes do turno <strong>{turma.turno}</strong>
            </label>

            <div className="flex items-center gap-2">
              {candidatos.length > 0 && (
                <button
                  type="button"
                  onClick={selecionarVisiveisAteLimite}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Selecionar visíveis (até limite de vagas)
                </button>
              )}
              {selecionados.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelecionados([])}
                  className="text-rose-600 hover:text-rose-800 font-semibold ml-2 cursor-pointer"
                >
                  Limpar seleção
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Estudantes Candidatos */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {carregando ? (
            <div className="py-14 text-center text-sm text-slate-500">
              Buscando estudantes elegíveis...
            </div>
          ) : candidatos.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Nenhum estudante disponível encontrado para este filtro.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Estudantes já matriculados em qualquer turma deste projeto são ocultados automaticamente para evitar duplicidade.
              </p>
            </div>
          ) : (
            candidatos.map((cand) => {
              const marcado = selecionados.includes(cand.aluno_id);
              const outrosCount = Number(cand.outros_projetos_semestre || 0);
              return (
                <label
                  key={cand.aluno_id}
                  onClick={() => toggleAluno(cand.aluno_id)}
                  className={`flex items-center justify-between gap-3 px-5 py-3 cursor-pointer transition ${
                    marcado ? "bg-indigo-50/80" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => {}}
                      className="w-4 h-4 accent-indigo-600 rounded pointer-events-none"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {cand.nome}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span>Cód: {cand.codigo || "—"}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          Origem: {cand.turma_origem_nome} ({cand.turma_origem_turno})
                        </span>
                        {outrosCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                            Já em {outrosCount} projeto(s) no semestre
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {marcado && (
                    <CheckCircleIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            O estudante permanece vinculado à sua turma regular de origem.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarMatricula}
              disabled={salvando || selecionados.length === 0}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <UserPlusIcon className="w-4 h-4" />
              {salvando
                ? "Matriculando..."
                : `Confirmar Matrícula (${selecionados.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
