import React from "react";

export default function SolicitacoesConteudos() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Coordenação — Solicitações de Conteúdos
          </h1>
          <p className="text-slate-600 mt-1">
            Painel oficial de governança pedagógica: analisar e decidir solicitações geradas pelos professores.
          </p>

          <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
              Escopos: CONTEXTO · ITEM_EDIT · ITEM_DELETE
            </span>
            <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
              Status: PENDENTE · ATENDIDO · NEGADO · CANCELADO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            disabled
            title="PASSO 2: habilitaremos o carregamento via API"
          >
            Atualizar
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
            disabled
            title="PASSO 3+: filtros e agrupamentos"
          >
            Filtros
          </button>
        </div>
      </div>

      {/* KPIs (placeholder) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-slate-500">Pendentes</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">—</div>
          <div className="text-xs text-slate-500 mt-2">
            PASSO 2: contador via GET (status=PENDENTE)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-slate-500">Por escopo</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">—</div>
          <div className="text-xs text-slate-500 mt-2">
            PASSO 5: visão gerencial (CONTEXTO / ITEM_EDIT / ITEM_DELETE)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-slate-500">Última atualização</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">—</div>
          <div className="text-xs text-slate-500 mt-2">
            PASSO 2: timestamp após carregar API
          </div>
        </div>
      </div>

      {/* Lista (placeholder premium) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold text-slate-800">Solicitações</div>
          <div className="text-xs text-slate-500">
            Padrão de governança: professor solicita, coordenação decide
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <div className="text-slate-800 font-semibold">
              Painel pronto (PASSO 1 concluído)
            </div>
            <p className="text-slate-600 mt-1">
              No PASSO 2 vamos consumir o endpoint de listagem e renderizar as solicitações pendentes.
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="font-semibold text-slate-800">Campos que serão exibidos</div>
                <ul className="mt-2 text-slate-600 list-disc pl-5 space-y-1">
                  <li>Professor solicitante</li>
                  <li>Data/hora</li>
                  <li>Escopo</li>
                  <li>Contexto completo</li>
                  <li>Motivo</li>
                  <li>Status</li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="font-semibold text-slate-800">Ações (PASSO 4)</div>
                <ul className="mt-2 text-slate-600 list-disc pl-5 space-y-1">
                  <li>✅ Liberar edição</li>
                  <li>❌ Negar solicitação</li>
                  <li className="text-slate-400">✍️ Comentário (futuro)</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
                PASSO 2: GET (PENDENTE)
              </span>
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
                PASSO 3: tabela + filtros
              </span>
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
                PASSO 4: PATCH (decisão)
              </span>
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
                PASSO 5: dashboard/agrupamentos
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
