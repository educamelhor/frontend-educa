// src/features/sala-recursos/AdequacoesCurriculares.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  SparklesIcon,
  ArrowLeftIcon,
  PlusIcon,
  PrinterIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentCheckIcon,
  AcademicCapIcon
} from "@heroicons/react/24/outline";

import ModalAdequacaoCurricular from "./ModalAdequacaoCurricular";

const BIMESTRES = ["Todos", "1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre", "Anual"];

export default function AdequacoesCurriculares() {
  const navigate = useNavigate();

  const [adequacoes, setAdequacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [filtroTexto, setFiltroTexto] = useState("");
  const [bimestreFiltro, setBimestreFiltro] = useState("Todos");
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editAdequacaoId, setEditAdequacaoId] = useState(null);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  const carregarAdequacoes = async () => {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      if (bimestreFiltro !== "Todos") params.append("bimestre", bimestreFiltro);
      if (anoLetivo) params.append("ano_letivo", anoLetivo);

      const res = await api.get(`/api/sala-recursos/adequacoes?${params.toString()}`);
      setAdequacoes(res.data?.adequacoes || []);
    } catch (err) {
      console.error("Erro ao listar adequações:", err);
      setErro("Não foi possível carregar as adequações curriculares.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAdequacoes();
  }, [bimestreFiltro, anoLetivo]);

  const handleImprimir = (id) => {
    const token = localStorage.getItem("token");
    const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");
    window.open(`${apiBase}/api/sala-recursos/adequacoes/${id}/pdf?token=${token}`, "_blank");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta adequação curricular?")) return;
    try {
      await api.delete(`/api/sala-recursos/adequacoes/${id}`);
      carregarAdequacoes();
    } catch (err) {
      alert("Erro ao excluir adequação: " + (err.response?.data?.message || err.message));
    }
  };

  const adequacoesFiltradas = adequacoes.filter((a) => {
    if (!filtroTexto.trim()) return true;
    const txt = filtroTexto.toLowerCase();
    return (
      (a.aluno_nome && a.aluno_nome.toLowerCase().includes(txt)) ||
      (a.aluno_codigo && String(a.aluno_codigo).includes(txt)) ||
      (a.disciplina && a.disciplina.toLowerCase().includes(txt)) ||
      (a.turma_nome && a.turma_nome.toLowerCase().includes(txt))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/sala-recursos")}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-blue-700" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Adequações Curriculares da Unidade
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Registro, acompanhamento e emissão em PDF das flexibilizações pedagógicas
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditAdequacaoId(null);
            setAlunoSelecionado(null);
            navigate("/sala-recursos");
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
        >
          <PlusIcon className="w-4 h-4" /> Selecionar Aluno no Painel
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Filtrar por estudante, disciplina ou turma..."
            className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <select
            value={bimestreFiltro}
            onChange={(e) => setBimestreFiltro(e.target.value)}
            className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600"
          >
            {BIMESTRES.map((b) => (
              <option key={b} value={b}>Bimestre: {b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Adequações */}
      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Carregando adequações curriculares...</p>
        </div>
      ) : adequacoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <DocumentCheckIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Nenhuma adequação encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Acesse o prontuário de um estudante no painel da Sala de Recursos para cadastrar a primeira adequação curricular.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adequacoesFiltradas.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                    {a.bimestre} • {a.ano_letivo}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    {a.status || "Concluído"}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{a.aluno_nome}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Turma: <strong>{a.turma_nome || "—"}</strong> • Cód: {a.aluno_codigo || "—"}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="font-bold text-blue-900 text-sm">{a.disciplina}</div>
                  <div className="text-slate-600 line-clamp-2">
                    <strong>Habilidades:</strong> {a.habilidades_prioritarias || "—"}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleImprimir(a.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  <PrinterIcon className="w-4 h-4" /> Imprimir PDF
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/sala-recursos/aluno/${a.aluno_id}`)}
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold"
                    title="Ver prontuário do aluno"
                  >
                    Ver Aluno →
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir adequação"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ModalAdequacaoCurricular
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditAdequacaoId(null);
        }}
        aluno={alunoSelecionado}
        adequacaoId={editAdequacaoId}
        onSuccess={carregarAdequacoes}
      />
    </div>
  );
}
