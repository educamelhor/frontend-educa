import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { 
  ChevronRightIcon, 
  UserCircleIcon, 
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const TURNOS = ["Matutino", "Vespertino", "Noturno"];

const TURNO_CONFIG = {
  Matutino:   { gradientStyle: "linear-gradient(135deg,#f59e0b,#ea580c)", borderColor: "#f59e0b", bgHover: "#fffbeb", emoji: "🌅" },
  Vespertino: { gradientStyle: "linear-gradient(135deg,#38bdf8,#2563eb)", borderColor: "#38bdf8", bgHover: "#f0f9ff", emoji: "☀️" },
  Noturno:    { gradientStyle: "linear-gradient(135deg,#818cf8,#7c3aed)", borderColor: "#818cf8", bgHover: "#f5f3ff", emoji: "🌙" },
};

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export default function AphSelecaoAluno({ onSelectAluno }) {
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  
  const [todasTurmas, setTodasTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  
  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingTurmas(true);
      try {
        const escola_id = localStorage.getItem("escola_id") || 1;
        const { data } = await api.get("/api/turmas", { params: { escola_id } });
        const turmasAtivas = (data || []).filter(t => t.ano == new Date().getFullYear());
        setTodasTurmas(turmasAtivas);
      } catch (err) {
        console.error("Erro ao buscar turmas:", err);
      } finally {
        setLoadingTurmas(false);
      }
    })();
  }, []);

  const handleSelectTurno = (turno) => {
    setTurnoSelecionado(turno);
    setTurmaSelecionada(null);
    setAlunos([]);
  };

  const handleSelectTurma = async (turma) => {
    setTurmaSelecionada(turma);
    setLoadingAlunos(true);
    try {
      const { data } = await api.get(`/api/turmas/${turma.id}/alunos`);
      setAlunos(Array.isArray(data) ? data : (data.alunos || []));
    } catch (err) {
      console.error("Erro ao buscar alunos:", err);
    } finally {
      setLoadingAlunos(false);
    }
  };

  const turmasDoTurno = useMemo(() => {
    if (!turnoSelecionado) return [];
    return todasTurmas
      .filter(t => norm(t.turno) === norm(turnoSelecionado))
      .sort((a, b) => (a.turma || "").localeCompare(b.turma || "", "pt-BR"));
  }, [todasTurmas, turnoSelecionado]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Localizar Estudante</h2>
        <p className="text-gray-500 text-sm mt-1">Selecione o turno, turma e estudante para iniciar o atendimento médico em 3 passos.</p>
      </div>

      {/* PASSO 1: Turno */}
      <div className="mb-10">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">1. Selecione o Turno</h3>
        {loadingTurmas ? (
          <div className="flex items-center gap-2 text-gray-400"><ArrowPathIcon className="w-5 h-5 animate-spin"/> Carregando turmas...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TURNOS.map(turno => {
              const cfg = TURNO_CONFIG[turno];
              const isActive = turnoSelecionado === turno;
              return (
                <button
                  key={turno}
                  onClick={() => handleSelectTurno(turno)}
                  style={{
                    borderColor: isActive ? cfg.borderColor : "transparent",
                    background: isActive ? cfg.gradientStyle : "#f8fafc",
                    color: isActive ? "#fff" : "#334155"
                  }}
                  className={`
                    relative p-6 rounded-2xl border-2 text-left transition-all duration-300
                    hover:-translate-y-1 hover:shadow-md
                    ${!isActive ? 'hover:bg-slate-100 border-gray-100' : 'shadow-lg shadow-blue-500/20'}
                  `}
                >
                  <div className="text-3xl mb-3">{cfg.emoji}</div>
                  <h4 className="font-bold text-xl">{turno}</h4>
                  <div className={`mt-1 text-sm ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                    Clique para ver turmas
                  </div>
                  {isActive && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 p-1.5 rounded-full">
                      <ChevronRightIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* PASSO 2: Turma */}
      {turnoSelecionado && (
        <div className="mb-10 animate-fade-in-up">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>2. Selecione a Turma</span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">{turmasDoTurno.length} turmas</span>
          </h3>
          <div className="flex flex-wrap gap-3">
            {turmasDoTurno.map(turma => (
              <button
                key={turma.id}
                onClick={() => handleSelectTurma(turma)}
                className={`
                  px-5 py-3 rounded-xl font-bold transition-all text-sm border
                  ${turmaSelecionada?.id === turma.id 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }
                `}
              >
                {turma.turma}
              </button>
            ))}
            {turmasDoTurno.length === 0 && (
              <div className="text-gray-400 italic text-sm">Nenhuma turma encontrada para este turno.</div>
            )}
          </div>
        </div>
      )}

      {/* PASSO 3: Aluno */}
      {turmaSelecionada && (
        <div className="animate-fade-in-up">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>3. Selecione o Estudante</span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">{alunos.length} alunos</span>
          </h3>
          
          {loadingAlunos ? (
            <div className="flex items-center gap-2 text-gray-400"><ArrowPathIcon className="w-5 h-5 animate-spin"/> Carregando alunos...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alunos.map(aluno => (
                <button
                  key={aluno.id}
                  onClick={() => onSelectAluno(aluno)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-red-300 hover:bg-red-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center border-2 border-transparent group-hover:border-red-200">
                    {aluno.foto_url ? (
                      <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircleIcon className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-gray-800 truncate group-hover:text-red-700">{aluno.nome}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Matrícula: {aluno.matricula || "S/N"}</div>
                  </div>
                </button>
              ))}
              {alunos.length === 0 && (
                <div className="text-gray-400 italic text-sm">Nenhum aluno encontrado nesta turma.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
