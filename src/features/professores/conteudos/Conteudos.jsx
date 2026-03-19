import React from "react";
import { BookOpenIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

/**
 * Conteúdos — Módulo Professores
 * ──────────────────────────────────────────
 * Placeholder para o submenu de Conteúdos.
 * Será implementado no próximo passo.
 */
export default function Conteudos() {
  return (
    <div className="flex flex-col gap-6 w-full pb-20">
      {/* Header */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-md">
            <BookOpenIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              Conteúdos
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Gerencie os conteúdos programáticos das suas disciplinas.
            </p>
          </div>
        </div>
      </section>

      {/* Área principal — Em construção */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-5 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl mb-6">
            <BookOpenIcon className="w-16 h-16 text-teal-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">
            Módulo em desenvolvimento
          </h3>
          <p className="text-sm text-gray-400 max-w-md leading-relaxed">
            O gerenciamento de conteúdos programáticos estará disponível em breve.
            Aqui você poderá organizar e planejar os conteúdos de cada disciplina por bimestre.
          </p>
          <div className="mt-6 flex items-center gap-2 text-teal-600 bg-teal-50 px-4 py-2 rounded-full">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Em breve</span>
          </div>
        </div>
      </section>
    </div>
  );
}
