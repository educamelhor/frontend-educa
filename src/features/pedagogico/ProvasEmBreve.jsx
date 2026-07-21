import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function ProvasEmBreve() {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow p-8 text-center border border-gray-100 max-w-2xl mx-auto mt-10">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <DocumentTextIcon className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Módulo de Provas</h2>
        <p className="text-gray-500 mb-6 leading-relaxed">
          O módulo completo de Provas está em desenvolvimento e estará disponível em breve. 
          A criação de <strong>Capas de Provas Institucionais</strong> foi movida para o menu <strong>Gabarito</strong>.
        </p>
      </div>
    </div>
  );
}
