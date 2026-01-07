// src/features/questoes/BancoQuestoes.jsx

import React from "react";
import { FaBookOpen } from "react-icons/fa";

/**
 * Página Banco de Questões com modelo de interface para seleção de modelos,
 * lista de questionamentos e pré-visualização de questões.
 */
export default function BancoQuestoes() {
  // Exemplo de modelos de questões
  const modelos = Array.from({ length: 10 }, (_, i) => `Modelo_${i + 1}`);

  return (
    <div className="p-8 bg-green-100 min-h-screen">
      {/* Cabeçalho da página */}
      <header className="flex items-center mb-8">
        <FaBookOpen className="text-3xl mr-3 text-blue-800" />
        <h1 className="text-3xl font-bold text-blue-800">BANCO DE QUESTÕES</h1>
      </header>

      {/* Grid de cards */}
      <div className="grid grid-cols-3 gap-6">
        {/* Card 1: Modelos de Questões */}
        <div className="bg-white p-6 rounded shadow flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Modelos de Questões</h2>
          <select
            size={5}
            className="flex-1 border border-gray-300 rounded p-2 overflow-y-auto"
          >
            {modelos.map((modelo, idx) => (
              <option key={idx} value={modelo}>
                {modelo}
              </option>
            ))}
          </select>
        </div>

        {/* Card 2: Placeholder para Futuro Conteúdo */}
        <div className="bg-white p-6 rounded shadow">card_2</div>

        {/* Card 3: cartão maior para detalhes ou pré-visualização */}
        <div className="col-span-2 bg-white p-6 rounded shadow">card_3</div>
      </div>
    </div>
  );
}
