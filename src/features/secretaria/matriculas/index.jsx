// src/features/secretaria/matriculas/index.jsx
// ============================================================================
// EDUCA.MELHOR — Secretaria > Matrículas
// Centraliza a seleção entre os dois submódulos:
//   1. NOVA      — Matrícula regular de estudantes na unidade escolar (Em breve)
//   2. PROJETOS  — Disciplinas, Turmas e Escolha Semestral do Novo Ensino Médio
// ============================================================================

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserPlusIcon,
  RocketLaunchIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckBadgeIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import ProjetosEnsinoMedioPage from "./ProjetosEnsinoMedioPage";

function NovaMatriculaPlaceholder({ onIrParaProjetos, onVoltarHub }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center max-w-3xl mx-auto my-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5">
        <UserPlusIcon className="w-8 h-8" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
        <ClockIcon className="w-3.5 h-3.5" />
        Aguardando Próxima Etapa de Implementação
      </span>

      <h2 className="text-2xl font-extrabold text-slate-900 mt-4">
        Submódulo NOVA MATRÍCULA
      </h2>

      <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-xl mx-auto">
        Este ambiente está reservado para o fluxo completo de admissão e matrícula regular de novos estudantes na unidade escolar (cadastro cadastral, vínculo de responsáveis, documentação e enturmação na base comum).
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onVoltarHub}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Voltar para Matrículas
        </button>

        <button
          type="button"
          onClick={onIrParaProjetos}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 shadow-md transition cursor-pointer"
        >
          <RocketLaunchIcon className="w-4 h-4" />
          Acessar Submódulo PROJETOS
        </button>
      </div>
    </div>
  );
}

export default function MatriculasModule() {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname.replace(/\/+$/, "");
  const abaAtiva = path.endsWith("/nova")
    ? "NOVA"
    : path.endsWith("/projetos")
    ? "PROJETOS"
    : "HUB";

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho Institucional + Navegação Rápida entre Hub / Nova / Projetos */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shrink-0">
            <ClipboardDocumentListIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <span>Secretaria Escolar</span>
              <span>/</span>
              <span>Central de Matrículas</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {abaAtiva === "HUB" && "Matrículas da Unidade Escolar"}
              {abaAtiva === "NOVA" && "Matrículas • Nova Matrícula Regular"}
              {abaAtiva === "PROJETOS" &&
                "Matrículas • Projetos do Novo Ensino Médio"}
            </h1>
          </div>
        </div>

        {/* Seletor rápido quando já estiver dentro de um submódulo */}
        {abaAtiva !== "HUB" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/secretaria/matriculas")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Início Matrículas
            </button>

            <button
              type="button"
              onClick={() => navigate("/secretaria/matriculas/nova")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                abaAtiva === "NOVA"
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <UserPlusIcon className="w-4 h-4" />
              NOVA
            </button>

            <button
              type="button"
              onClick={() => navigate("/secretaria/matriculas/projetos")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                abaAtiva === "PROJETOS"
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <RocketLaunchIcon className="w-4 h-4" />
              PROJETOS
            </button>
          </div>
        )}
      </div>

      {/* HUB DE SELEÇÃO: DOIS CARDS GRANDES (NOVA & PROJETOS) */}
      {abaAtiva === "HUB" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 px-1">
            Selecione abaixo a modalidade de matrícula que deseja operar na Secretaria:
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD GRANDE 1: NOVA */}
            <div
              onClick={() => navigate("/secretaria/matriculas/nova")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/secretaria/matriculas/nova");
                }
              }}
              className="group relative bg-white rounded-3xl border-2 border-slate-200 hover:border-amber-400 p-7 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
                    <UserPlusIcon className="w-8 h-8" />
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    <ClockIcon className="w-3.5 h-3.5" />
                    Em Breve
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 mt-6 group-hover:text-amber-700 transition">
                  NOVA
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mt-0.5">
                  Matrícula Regular de Estudantes na Escola
                </p>

                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  Admissão de novos alunos na unidade de ensino, conferência cadastral, vinculação de responsáveis legais e enturmação nas turmas regulares do ano letivo.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-500">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Ingresso individual e transferência recebida
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Alocação direta em turmas da Formação Geral Básica
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Reservado para futura implementação
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 group-hover:translate-x-1 transition">
                  Visualizar <ArrowRightIcon className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* CARD GRANDE 2: PROJETOS */}
            <div
              onClick={() => navigate("/secretaria/matriculas/projetos")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/secretaria/matriculas/projetos");
                }
              }}
              className="group relative bg-gradient-to-br from-white via-indigo-50/30 to-sky-50/40 rounded-3xl border-2 border-indigo-200 hover:border-indigo-500 p-7 sm:p-8 shadow-sm hover:shadow-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600" />

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition">
                    <RocketLaunchIcon className="w-8 h-8" />
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckBadgeIcon className="w-4 h-4" />
                    Ativo • Novo Ensino Médio
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 mt-6 group-hover:text-indigo-700 transition">
                  PROJETOS
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mt-0.5">
                  IFA • Eletivas • PCA • Projeto de Vida • PDs • Clubes
                </p>

                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  Criação ágil das disciplinas e turmas semestrais do Novo Ensino Médio com sinopse orientadora, dimensionamento automático de turmas e controle de vagas em tempo real para a escolha dos estudantes.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                    6 Cards estruturantes (IFA, Eletiva, PCA, Projeto de Vida, PDs e Clubes)
                  </li>
                  <li className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                    Geração automática de múltiplas turmas com badges de seleção e vagas restantes
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-indigo-100 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600">
                  Integrado à Modulação, Horários e Boletim
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md group-hover:bg-indigo-700 transition">
                  Entrar em Projetos <ArrowRightIcon className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMÓDULO: NOVA (Placeholder) */}
      {abaAtiva === "NOVA" && (
        <NovaMatriculaPlaceholder
          onVoltarHub={() => navigate("/secretaria/matriculas")}
          onIrParaProjetos={() => navigate("/secretaria/matriculas/projetos")}
        />
      )}

      {/* SUBMÓDULO: PROJETOS (Implementação Completa) */}
      {abaAtiva === "PROJETOS" && <ProjetosEnsinoMedioPage />}
    </div>
  );
}
