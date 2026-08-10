import React from 'react';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';

export default function AphMaterial() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
      <div className="p-4 bg-orange-50 text-orange-500 rounded-full mb-4">
        <ArchiveBoxIcon className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">Controle de Material</h2>
      <p className="text-gray-500 mt-2 max-w-md">
        Levantamento estatístico dos materiais mais utilizados nos atendimentos, auxiliando em novas compras e licitações.
      </p>
      
      {/* Aqui virá o dashboard de materiais */}
      <div className="mt-8 text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl p-6 w-full max-w-lg">
        Esta funcionalidade será implementada em breve.
      </div>
    </div>
  );
}
