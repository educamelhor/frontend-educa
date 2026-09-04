// src/features/sala-recursos/PainelSalaRecursos.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  SparklesIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  PlusIcon,
  FunnelIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  HeartIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import ModalConfigAlunoAEE from "./ModalConfigAlunoAEE";
import ModalLaudoMedico from "./ModalLaudoMedico";

export default function PainelSalaRecursos() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_alunos_aee: 0,
    total_laudos: 0,
    total_adequacoes: 0,
    total_atendimentos_mes: 0,
  });

  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const currentYear = new Date().getFullYear();
  const [anoLetivo, setAnoLetivo] = useState(() => {
    const saved = localStorage.getItem("ano_letivo");
    return saved ? Number(saved) : currentYear;
  });

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState("");
  const [turnoSelecionado, setTurnoSelecionado] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [statusAee, setStatusAee] = useState("ativo");
  const [apenasAee, setApenasAee] = useState(true);

  // Modais rápidos
  const [alunoConfigModal, setAlunoConfigModal] = useState(null);
  const [alunoLaudoModal, setAlunoLaudoModal] = useState(null);
  const [fotoZoom, setFotoZoom] = useState(null);

  // Fecha fotoZoom ao pressionar tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setFotoZoom(null);
    };
    if (fotoZoom) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fotoZoom]);

  const carregarStats = async (ano = anoLetivo) => {
    try {
      const res = await api.get("/api/sala-recursos/stats", { params: { ano_letivo: ano } });
      if (res.data) setStats(res.data);
    } catch (err) {
      console.error("Erro ao carregar estatísticas AEE:", err);
    }
  };

  const carregarTurmas = async (ano = anoLetivo) => {
    try {
      const res = await api.get("/api/turmas", { params: { ano } });
      const list = res.data?.turmas || res.data || [];
      setTurmas(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);
    }
  };

  const carregarAlunos = async () => {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      if (filtroTexto) params.append("filtro", filtroTexto);
      if (anoLetivo) params.append("ano_letivo", anoLetivo);
      if (turnoSelecionado) params.append("turno", turnoSelecionado);
      if (turmaSelecionada) params.append("turma_id", turmaSelecionada);
      if (statusAee) params.append("status_aee", statusAee);
      params.append("apenas_aee", apenasAee ? "1" : "0");

      const res = await api.get(`/api/sala-recursos/alunos?${params.toString()}`);
      setAlunos(res.data?.alunos || []);
    } catch (err) {
      console.error("Erro ao listar alunos AEE:", err);
      setErro("Não foi possível carregar a lista de estudantes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarStats(anoLetivo);
    carregarTurmas(anoLetivo);
  }, [anoLetivo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarAlunos();
    }, 250);
    return () => clearTimeout(timer);
  }, [filtroTexto, anoLetivo, turnoSelecionado, turmaSelecionada, statusAee, apenasAee]);

  const formatDate = (val) => {
    if (!val) return "—";
    try {
      const s = String(val).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
      }
      return new Date(val).toLocaleDateString("pt-BR");
    } catch {
      return "—";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <SparklesIcon className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              SALA DE RECURSOS (AEE)
            </h1>
            <p className="text-xs text-slate-500">
              Atendimento Educacional Especializado • Prontuários, Laudos e Adequações Curriculares
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/sala-recursos/adequacoes")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-sm font-bold border border-blue-200 transition-colors"
          >
            <ClipboardDocumentCheckIcon className="w-4 h-4 text-blue-700" />
            Adequações Curriculares
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alunos Atendidos</span>
            <div className="text-2xl font-black text-slate-900">{stats.total_alunos_aee}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Laudos Registrados</span>
            <div className="text-2xl font-black text-slate-900">{stats.total_laudos}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adequações Curriculares</span>
            <div className="text-2xl font-black text-slate-900">{stats.total_adequacoes}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sessões no Mês</span>
            <div className="text-2xl font-black text-slate-900">{stats.total_atendimentos_mes}</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3">
          {/* Busca Textual */}
          <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-4">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por nome do estudante, código ou CID..."
              className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Filtro por Ano Letivo */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <select
              value={anoLetivo}
              onChange={(e) => {
                const novoAno = Number(e.target.value);
                setAnoLetivo(novoAno);
                setTurmaSelecionada("");
              }}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold text-blue-900"
            >
              <option value={2026}>Ano Letivo: 2026</option>
              <option value={2025}>Ano Letivo: 2025</option>
              <option value={2024}>Ano Letivo: 2024</option>
            </select>
          </div>

          {/* Filtro por Turno */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <select
              value={turnoSelecionado}
              onChange={(e) => {
                setTurnoSelecionado(e.target.value);
                setTurmaSelecionada("");
              }}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
            >
              <option value="">Todos os Turnos</option>
              <option value="Matutino">Turno: Matutino</option>
              <option value="Vespertino">Turno: Vespertino</option>
              <option value="Noturno">Turno: Noturno</option>
              <option value="Integral">Turno: Integral</option>
            </select>
          </div>

          {/* Filtro por Turma */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <select
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
            >
              <option value="">Todas as Turmas</option>
              {turmas
                .filter((t) => !turnoSelecionado || String(t.turno || "").toLowerCase() === turnoSelecionado.toLowerCase())
                .map((t) => {
                  const nomeTurma = t.turma || t.nome || t.nome_oficial || t.serie || `Turma ${t.id}`;
                  return (
                    <option key={t.id} value={t.id}>
                      {nomeTurma} {t.turno ? `(${t.turno})` : ""}
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Filtro por Status AEE */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <select
              value={statusAee}
              onChange={(e) => setStatusAee(e.target.value)}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
            >
              <option value="ativo">Status: Ativos no AEE</option>
              <option value="em_avaliacao">Status: Em Avaliação</option>
              <option value="todos">Status: Todos</option>
              <option value="desligado">Status: Desligados</option>
            </select>
          </div>
        </div>

        {/* Toggle para mostrar todos os alunos da escola ou apenas os marcados para AEE */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold select-none">
            <input
              type="checkbox"
              checked={apenasAee}
              onChange={(e) => setApenasAee(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span>Exibir apenas estudantes laudados / cadastrados na Sala de Recursos</span>
          </label>

          <span className="text-slate-500 font-medium">
            Mostrando <strong>{alunos.length}</strong> estudante(s)
          </span>
        </div>
      </div>

      {/* Lista de Estudantes */}
      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Carregando estudantes...</p>
        </div>
      ) : alunos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Nenhum estudante encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {apenasAee
              ? "Nenhum estudante com laudo ou atendimento AEE ativo para os filtros selecionados. Desmarque o filtro acima para visualizar todos os estudantes da escola e configurá-los."
              : "Nenhum estudante localizado com o critério de busca."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Estudante</th>
                  <th className="py-3.5 px-3">Turma</th>
                  <th className="py-3.5 px-3">Diagnóstico / CID</th>
                  <th className="py-3.5 px-3">Atendimento AEE</th>
                  <th className="py-3.5 px-3 text-center">Adequações</th>
                  <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alunos.map((a) => (
                  <tr key={a.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => a.foto && setFotoZoom(a)}
                          className={`w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200 select-none ${
                            a.foto
                              ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all group relative overflow-hidden shadow-sm"
                              : ""
                          }`}
                          title={a.foto ? "Clique para ampliar a foto do estudante" : a.estudante}
                        >
                          {a.foto ? (
                            <>
                              <img src={a.foto} alt={a.estudante} className="w-full h-full rounded-xl object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                                <MagnifyingGlassPlusIcon className="w-4 h-4 text-white" />
                              </div>
                            </>
                          ) : (
                            a.estudante?.charAt(0) || "?"
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-snug">{a.estudante}</div>
                          <div className="text-[11px] text-slate-500">
                            Cód: {a.codigo || "—"} • Nasc: {formatDate(a.data_nascimento)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-xs">
                      <span className="font-semibold text-slate-800 block">{a.turma_nome || "—"}</span>
                      <span className="text-slate-500">{a.turma_turno || "—"}</span>
                    </td>

                    <td className="py-3.5 px-3">
                      {a.laudos && a.laudos.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {a.laudos.map((l, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200"
                              title={l.diagnostico}
                            >
                              CID {l.cid || "—"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => setAlunoLaudoModal(a)}
                          className="text-[11px] text-emerald-700 font-bold hover:underline"
                        >
                          + Adicionar Laudo
                        </button>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-xs">
                      <span className="font-semibold text-slate-800 block">
                        {a.tipo_atendimento ? a.tipo_atendimento.replace("Sala de Recursos Multifuncionais ", "") : "Não configurado"}
                      </span>
                      <span className="text-slate-500">
                        {a.turno_atendimento || "Contraturno"} {a.dias_semana ? `(${a.dias_semana})` : ""}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        a.total_adequacoes > 0 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                      }`}>
                        {a.total_adequacoes}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/sala-recursos/aluno/${a.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                        >
                          <AcademicCapIcon className="w-4 h-4" /> Prontuário AEE
                        </button>

                        <button
                          onClick={() => setAlunoConfigModal(a)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Configurar AEE"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais Rápidos */}
      <ModalConfigAlunoAEE
        isOpen={Boolean(alunoConfigModal)}
        onClose={() => setAlunoConfigModal(null)}
        aluno={alunoConfigModal}
        onSuccess={() => {
          carregarStats();
          carregarAlunos();
        }}
      />

      <ModalLaudoMedico
        isOpen={Boolean(alunoLaudoModal)}
        onClose={() => setAlunoLaudoModal(null)}
        aluno={alunoLaudoModal}
        onSuccess={() => {
          carregarStats();
          carregarAlunos();
        }}
      />

      {/* Modal de Zoom da Foto do Estudante */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setFotoZoom(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com Nome e Botão Fechar */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="pr-4">
                <h3 className="text-lg font-black text-white leading-tight">
                  {fotoZoom.estudante}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cód: <span className="text-slate-200 font-semibold">{fotoZoom.codigo || "—"}</span>
                  {fotoZoom.turma_nome && (
                    <> • Turma: <span className="text-blue-300 font-semibold">{fotoZoom.turma_nome}</span> {fotoZoom.turma_turno ? `(${fotoZoom.turma_turno})` : ""}</>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFotoZoom(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0"
                title="Fechar (Esc)"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Imagem Ampliada */}
            <div className="w-full flex justify-center py-2">
              <img
                src={fotoZoom.foto}
                alt={fotoZoom.estudante}
                className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain border-2 border-slate-700 shadow-2xl bg-black"
              />
            </div>

            {/* Rodapé / Dica */}
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <SparklesIcon className="w-4 h-4" /> Aluno Sala de Recursos (AEE)
              </span>
              <span>Clique fora ou no ✕ para fechar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
