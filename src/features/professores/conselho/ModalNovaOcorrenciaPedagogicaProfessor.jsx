// features/professores/conselho/ModalNovaOcorrenciaPedagogicaProfessor.jsx
// ============================================================================
// Versão PROFESSOR do modal de ocorrência pedagógica.
//
// Governança aplicada:
//  ❌ Campo Descrição          — OCULTO para professor
//  ❌ Campo Registro Interno   — OCULTO para professor
//  ❌ Botão de salvar          — professor sempre em modo somente leitura
//  ❌ Convocar responsável     — OCULTO para professor
//
// Este arquivo é INDEPENDENTE de alunos/ModalNovaOcorrenciaPedagogica.jsx.
// NÃO altere o arquivo compartilhado para ajustar regras do professor.
// ============================================================================
import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function ModalNovaOcorrenciaPedagogicaProfessor({
  open,
  onClose,
  ocorrenciaInicial = null,
}) {
  const [data, setData] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (open && ocorrenciaInicial) {
      let dt = ocorrenciaInicial.data_ocorrencia || "";
      if (dt.includes("/")) {
        const [dd, mm, yyyy] = dt.split("/");
        dt = `${yyyy}-${mm}-${dd}`;
      }
      setData(dt || new Date().toISOString().split("T")[0]);
      setCategoriaSelecionada(ocorrenciaInicial.categoria || "");
      setMotivo(ocorrenciaInicial.motivo || "");
    }
  }, [open, ocorrenciaInicial]);

  if (!open) return null;

  // ── Badge de status ──────────────────────────────────────────────────
  const statusBadge = (status) => {
    if (status === "FINALIZADA") return "text-green-700 bg-green-100 border-green-200";
    if (status === "CANCELADA")  return "text-red-700 bg-red-100 border-red-200";
    return "text-emerald-700 bg-emerald-100 border-emerald-200";
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-5 py-3 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50 flex-shrink-0">
          <h2 className="text-lg font-bold text-emerald-900">
            Detalhes do Registro Pedagógico
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" title="Fechar">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body — somente leitura, sem Descrição e sem Registro Interno */}
        <div className="px-5 py-4 overflow-y-auto space-y-3 flex-1 min-h-0">

          {/* Aviso de perfil */}
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            ℹ️ Você está visualizando este registro em modo <strong>somente leitura</strong>.
          </div>

          {/* Registro + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registro</label>
              <input
                type="text"
                disabled
                value={ocorrenciaInicial?.registro || ocorrenciaInicial?.id || ""}
                className="w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="text"
                disabled
                value={ocorrenciaInicial?.data_ocorrencia || ""}
                className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <input
              type="text"
              disabled
              value={categoriaSelecionada}
              className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Ocorrência */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ocorrência</label>
            <input
              type="text"
              disabled
              value={motivo}
              className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* ❌ Campo Descrição — OCULTO para professor (governança) */}
          {/* ❌ Campo Registro Interno — OCULTO para professor (governança) */}
          {/* ❌ Convocar Responsável — OCULTO para professor */}

          {/* Status */}
          {ocorrenciaInicial?.status && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span
                className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${statusBadge(
                  ocorrenciaInicial.status
                )}`}
              >
                {ocorrenciaInicial.status}
              </span>
            </div>
          )}

          {/* Registrado por */}
          {ocorrenciaInicial?.nome_usuario_registro && (
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-md">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Registrado por: </span>
                {ocorrenciaInicial.nome_usuario_registro}
              </p>
              {ocorrenciaInicial.nome_usuario_finalizacao && (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Finalizado por: </span>
                  {ocorrenciaInicial.nome_usuario_finalizacao}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
