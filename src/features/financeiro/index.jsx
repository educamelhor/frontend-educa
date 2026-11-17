// src/features/financeiro/index.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo Financeiro (Tela Inicial / Hub)
// Seleção entre os programas financeiros da unidade escolar:
//   1. PDAF — Programa de Descentralização Administrativa e Financeira
//   2. PDDE — Programa Dinheiro Direto na Escola
// ============================================================================

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default function FinanceiroModule() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho Institucional */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0">
          <BanknotesIcon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Gestão Escolar / Módulo Financeiro
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Programas de Execução Financeira
          </h1>
        </div>
      </div>

      {/* Seleção dos Dois Cards Principais */}
      <div className="space-y-4">
        <p className="text-sm text-slate-600 px-1">
          Selecione abaixo o programa financeiro que deseja gerenciar:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CARD 1: PDAF */}
          <div
            onClick={() => navigate("/financeiro/pdaf")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/financeiro/pdaf");
              }
            }}
            className="group relative bg-white rounded-3xl border-2 border-slate-200 hover:border-blue-500 p-7 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center group-hover:scale-105 transition">
                  <BuildingLibraryIcon className="w-8 h-8" />
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                  GDF • SEEDF
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-6 group-hover:text-blue-700 transition">
                PDAF
              </h2>
              <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-blue-700 mt-1 leading-snug">
                PDAF - PROGRAMA DE DESCENTRALIZAÇÃO ADMINISTRATIVA E FINANCEIRA
              </p>

              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Gestão e acompanhamento dos recursos distritais descentralizados para custeio e capital da unidade escolar.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Recursos Distritais
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm group-hover:bg-blue-700 transition">
                Acessar PDAF <ArrowRightIcon className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* CARD 2: PDDE */}
          <div
            onClick={() => navigate("/financeiro/pdde")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/financeiro/pdde");
              }
            }}
            className="group relative bg-white rounded-3xl border-2 border-slate-200 hover:border-emerald-500 p-7 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-500" />

            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
                  <BanknotesIcon className="w-8 h-8" />
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  MEC • FNDE
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-6 group-hover:text-emerald-700 transition">
                PDDE
              </h2>
              <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-emerald-700 mt-1 leading-snug">
                PDDE - PROGRAMA DINHEIRO DIRETO NA ESCOLA
              </p>

              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Gestão e acompanhamento dos recursos federais transferidos pelo FNDE para custeio e capital da unidade escolar.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Recursos Federais
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-sm group-hover:bg-emerald-700 transition">
                Acessar PDDE <ArrowRightIcon className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
