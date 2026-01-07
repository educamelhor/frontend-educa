// src/features/monitoramento/MonitoramentoPainel.jsx
// ============================================================================
// Painel de Monitoramento (Tela Cheia)
// - Exibe 3 câmeras em layout de grade (1 grande + 2 menores)
// - Seção mínima "Câmeras cadastradas" usando <CamerasList />
// - Botão para voltar ao modo normal de monitoramento
// - Mantém estilo leve com Tailwind
// ============================================================================

import React from "react";
import { useNavigate } from "react-router-dom";
import StreamCamera from "./StreamCamera.jsx";
import CamerasList from "./CamerasList.jsx";

export default function MonitoramentoPainel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      {/* Cabeçalho */}
      <header className="px-4 md:px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
          Monitoramento — Tela Cheia
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/monitoramento")}
            className="px-3 py-2 rounded-md bg-white border border-blue-300 text-blue-900 font-semibold hover:bg-blue-100"
            title="Voltar para o modo normal"
          >
            ← Voltar
          </button>
        </div>
      </header>

      {/* Grid das câmeras */}
      <main className="flex-1 px-4 md:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Câmera 1 grande (span 2 colunas) */}
          <div className="lg:col-span-2">
            <StreamCamera cameraId={1} titulo="Câmera 1 — Entrada (Centro)" />
          </div>

          {/* Câmeras 2 e 3 lado a lado */}
          <div>
            <StreamCamera cameraId={2} titulo="Câmera 2 — Entrada (Direita)" />
          </div>
          <div>
            <StreamCamera cameraId={3} titulo="Câmera 3 — Entrada (Esquerda)" />
          </div>
        </div>

        {/* Seção mínima - Lista de câmeras cadastradas */}
        <section className="mt-8">
          <div className="bg-white border border-blue-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-blue-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-blue-900">Câmeras cadastradas</h2>
              {/* espaço reservado para futuro: botão “Gerenciar” */}
            </div>

            {/* A lista já faz o fetch em /api/monitoramento/cameras e exibe nome/RTSP/status */}
            <div className="p-4">
              <CamerasList />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
