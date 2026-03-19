import React, { useEffect, useState } from "react";

/**
 * ModalAdicionarItemPlano.jsx
 * ------------------------------------------------------------
 * Modal para inclusão de uma nova atividade avaliativa
 * Ordem de campos (conforme especificação):
 *  a) Atividade avaliativa (nome)
 *  b) Data início
 *  c) Data final
 *  d) Nota total
 *  e) Oportunidades
 *  f) Nota invertida
 *  g) Descrição
 * ------------------------------------------------------------
 */

export default function ModalAdicionarItemPlano({
  open,
  onClose,
  onSalvar,

  modo = "adicionar", // "adicionar" | "editar"


  atividade,
  setAtividade,

  dataInicio,
  setDataInicio,

  dataFinal,
  setDataFinal,

  notaTotal,
  setNotaTotal,

  oportunidades,
  setOportunidades,

  notaInvertida,
  setNotaInvertida,

  descricao,
  setDescricao,
}) {






  if (!open) return null;

  const [alerta, setAlerta] = useState(null); // { type, text }

  useEffect(() => {
    // sempre que abrir o modal, limpamos alerta
    if (open) setAlerta(null);
  }, [open]);

  return (










    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Fundo escurecido */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >





        <div className="px-6 py-5 border-b">
          <h4 className="text-xl font-bold text-blue-900">
            {modo === "editar" ? "Editar atividade avaliativa" : "Adicionar atividade avaliativa"}
          </h4>
          <p className="text-sm text-gray-500">
            {modo === "editar"
              ? "Ajuste os dados e clique em Atualizar para salvar as alterações."
              : "Preencha os dados e clique em Salvar para incluir uma nova linha."}
          </p>
        </div>









        <div className="p-6 space-y-5">
          {/* a) Atividade avaliativa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Atividade avaliativa
            </label>
            <input
              type="text"
              value={atividade}
              onChange={(e) => setAtividade(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Ex: Caderno, Teste, Prova..."
            />
          </div>

          {/* b/c) Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Data início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Data final
              </label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* d/e/f) Nota total / Oportunidades / Nota invertida */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nota total
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={notaTotal}
                onChange={(e) => setNotaTotal(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Ex: 10"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Oportunidades
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={oportunidades}
                onChange={(e) => setOportunidades(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Ex: 1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nota invertida
              </label>
              <input
                type="number"
                step="0.1"
                value={notaInvertida}
                onChange={(e) => setNotaInvertida(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Ex: 0,2"
              />
            </div>
          </div>

          {/* g) Descrição */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Observações e detalhes (opcional)..."
            />
          </div>
        </div>








        {/* Alerta do modal (ex.: pontuação excedida) */}
        {alerta && (
          <div
            className={`mx-6 mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${
              alerta.type === "success"
                ? "bg-green-100 text-green-800"
                : alerta.type === "warn"
                  ? "bg-yellow-100 text-yellow-800"
                  : alerta.type === "info"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800"
            }`}
          >
            {alerta.text}
          </div>
        )}

        <div className="px-6 py-5 border-t flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition"
          >
            Cancelar
          </button>







          <button
            type="button"
            onClick={() => {
              const resp = onSalvar?.();

              // se não retornar nada, mantém comportamento antigo
              if (!resp) return;

              if (resp.ok) {
                // fecha o modal e limpa alerta
                setAlerta(null);
                onClose?.();
              } else {
                // mantém aberto e mostra alerta dentro do modal
                setAlerta({
                  type: resp.type || "error",
                  text: resp.text || "Ação não permitida.",
                });
              }
            }}
            className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow transition"
          >
            {modo === "editar" ? "Atualizar" : "Salvar"}
          </button>










        </div>
      </div>
    </div>
  );
}
