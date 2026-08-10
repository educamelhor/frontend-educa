import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

export default function AphHistorico() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
      <div className="p-4 bg-blue-50 text-blue-500 rounded-full mb-4">
        <ClockIcon className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">Histórico de Atendimentos</h2>
      <p className="text-gray-500 mt-2 max-w-md">
        Pesquise por um estudante para ver todo o histórico de reincidências de atendimentos médicos e intercorrências.
      </p>
      
      {/* Aqui virá a listagem futura */}
      <div className="mt-8 text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl p-6 w-full max-w-lg">
        Esta funcionalidade será implementada em breve.
      </div>
    </div>
  );
}
