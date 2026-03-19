import React from "react";
import { DocumentTextIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

/**
 * Provas — Módulo Professores
 * ──────────────────────────────────────────
 * Placeholder para o submenu de Provas.
 * Será implementado no próximo passo.
 */
export default function Provas() {
  return (
    <div className="flex flex-col gap-6 w-full pb-20">
      {/* Header */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-md">
            <DocumentTextIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              Provas
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Crie, gerencie e envie provas para aprovação da coordenação.
            </p>
          </div>
        </div>
      </section>

      {/* Área principal — Em construção */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl mb-6">
            <DocumentTextIcon className="w-16 h-16 text-violet-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">
            Módulo em desenvolvimento
          </h3>
          <p className="text-sm text-gray-400 max-w-md leading-relaxed">
            A gestão de provas estará disponível em breve.
            Aqui você poderá criar provas, enviá-las para aprovação da coordenação
            e acompanhar o status de cada prova.
          </p>
          <div className="mt-6 flex items-center gap-2 text-violet-600 bg-violet-50 px-4 py-2 rounded-full">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Em breve</span>
          </div>
        </div>
      </section>
    </div>
  );
}
