
// src/features/secretaria/turmas/index.jsx
import React, { useState } from "react";
import {
  BuildingOffice2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import ListaTurmas from "./ListaTurmas";
import ListaAgrupamentos from "./agrupamentos/ListaAgrupamentos";

export default function Turmas() {
  const [abaAtiva, setAbaAtiva] = useState("regulares"); // "regulares" | "agrupamentos"

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho da Página com Abas */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>Gestão de Turmas</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Secretaria Escolar
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administração de turmas regulares da base nacional e turmas de agrupamento do Novo Ensino Médio
          </p>
        </div>

        {/* Seletor de Abas Estilo Segmented Control */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva("regulares")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              abaAtiva === "regulares"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <BuildingOffice2Icon className={`w-4 h-4 ${abaAtiva === "regulares" ? "text-white" : "text-indigo-600"}`} />
            <span>Turmas Regulares</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("agrupamentos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              abaAtiva === "agrupamentos"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <UserGroupIcon className={`w-4 h-4 ${abaAtiva === "agrupamentos" ? "text-white" : "text-indigo-600"}`} />
            <span>Turmas de Agrupamento</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                abaAtiva === "agrupamentos"
                  ? "bg-white/20 text-white"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              IFA / Eletivas
            </span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {abaAtiva === "regulares" ? (
        <ListaTurmas />
      ) : (
        <ListaAgrupamentos />
      )}
    </div>
  );
}
