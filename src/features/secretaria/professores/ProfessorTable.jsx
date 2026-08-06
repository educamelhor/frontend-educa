// src/features/secretaria/professores/ProfessorTable.jsx
// ============================================================================
// Tabela/Cards de Professores — NOVO MODELO UNIFICADO
// - 1 card por professor (não mais 1 linha por disciplina)
// - Vínculos (turno + disciplina + aulas) exibidos como tags
// - Botão "+ Vínculo" em cada card
// - Botão "×" em cada vínculo para remover individualmente
// ============================================================================

import React, { useState } from "react";
import {
  EyeIcon,
  PencilIcon,
  PlusCircleIcon,
  XCircleIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/solid";
import { FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────
function formatarCPF(cpf = "") {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
}

// Cores para turno
const turnoCores = {
  MATUTINO:   "bg-amber-100 text-amber-800 border-amber-200",
  VESPERTINO: "bg-orange-100 text-orange-800 border-orange-200",
  NOTURNO:    "bg-indigo-100 text-indigo-800 border-indigo-200",
  INTEGRAL:   "bg-emerald-100 text-emerald-800 border-emerald-200",
};
const turnoCorDefault = "bg-gray-100 text-gray-700 border-gray-200";

function TurnoTag({ turno }) {
  const t = String(turno || "").toUpperCase();
  const cor = turnoCores[t] || turnoCorDefault;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${cor} uppercase tracking-wide`}>
      {t}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
export default function ProfessorTable({
  professores = [],
  loading,
  onDelete,
  onEdit,
  onAdicionarVinculo,
  onRemoverVinculo,
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(new Set());

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-blue-600">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-medium">Carregando professores…</span>
      </div>
    );
  }

  if (!professores.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
        <AcademicCapIcon className="w-12 h-12 opacity-30" />
        <p className="text-sm font-medium">Nenhum professor encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 mt-4">
      {professores.map((p) => {
        const vinculos = p.vinculos || [];
        const isInativo = p.status === "inativo";
        const isExpanded = expanded.has(p.id);

        return (
          <div
            key={p.id}
            className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden ${
              isInativo ? "opacity-60 border-gray-200" : "border-blue-100 hover:shadow-md hover:border-blue-200"
            }`}
          >
            {/* Header do card */}
            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                isInativo ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white"
              }`}>
                {(p.nome || "?").charAt(0)}
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-bold text-sm truncate ${isInativo ? "text-gray-400" : "text-gray-800"}`}>
                    {p.nome}
                  </p>
                  {isInativo && (
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase">
                      INATIVO
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono">{formatarCPF(p.cpf)}</p>

                {/* Vínculos como tags (até 3 visíveis, resto recolhido) */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {vinculos.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">Sem vínculos</span>
                  ) : (
                    <>
                      {(isExpanded ? vinculos : vinculos.slice(0, 3)).map((v) => (
                        <div key={v.id ?? `${v.turno}-${v.disciplina_id}`} className="flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-lg px-2 py-0.5 group">
                          <TurnoTag turno={v.turno} />
                          <span className="text-[11px] font-semibold text-blue-700 truncate max-w-[120px]">
                            {(v.disciplina_nome || "—").toUpperCase()}
                          </span>
                          {v.aulas > 0 && (
                            <span className="text-[10px] text-blue-400">· {v.aulas}h</span>
                          )}
                          {onRemoverVinculo && v.id && (
                            <button
                              title="Remover vínculo"
                              onClick={() => onRemoverVinculo(p.id, v.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 ml-0.5"
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {vinculos.length > 3 && (
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="text-[11px] text-blue-500 hover:text-blue-700 font-bold transition-colors"
                        >
                          {isExpanded ? "▲ menos" : `+${vinculos.length - 3} mais`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* + Vínculo */}
                {onAdicionarVinculo && !isInativo && (
                  <button
                    title="Adicionar vínculo"
                    onClick={() => onAdicionarVinculo(p)}
                    className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-emerald-200 transition-all hover:shadow-sm"
                  >
                    <PlusCircleIcon className="w-3.5 h-3.5" />
                    Vínculo
                  </button>
                )}

                {/* Editar */}
                <button
                  title="Editar"
                  onClick={() => onEdit?.(p)}
                  className="p-1.5 rounded-xl text-yellow-600 hover:bg-yellow-50 hover:text-yellow-800 transition-all"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>

                {/* Ficha */}
                <button
                  title="Ver Ficha"
                  onClick={() => navigate("/professores/" + p.id + "/ficha")}
                  className="p-1.5 rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-all"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>

                {/* Excluir / Inativar */}
                <button
                  title="Excluir / Inativar"
                  onClick={() => onDelete?.(p)}
                  className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-all"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
