// src/features/professores/ProfessorTable.jsx
// ============================================================================
// Tabela reutilizável de Professores (módulo de Professores)
// - Exibição de dados, incluindo **Turno** (novo).
// - Mantém botões de Ficha, Editar (onEdit) e Excluir/Inativar (onDelete).
// ============================================================================

import React from "react";
import { EyeIcon, DocumentTextIcon, PencilIcon } from "@heroicons/react/24/solid";
import { FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────
// Util: formata data YYYY-MM-DD → DD/MM/YYYY
function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Util: formata CPF 000.000.000-00
function formatarCPF(cpf = "") {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
// ─────────────────────────────────────────────────────────────

export default function ProfessorTable({ professores = [], loading, onDelete, onEdit }) {
  const navigate = useNavigate();

  if (loading) {
    return <p>Carregando professores…</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse mt-4">
        <thead className="bg-blue-100">
          <tr>
            <th className="p-2 border text-center">CPF</th>
            <th className="p-2 border text-center">Nome</th>
            <th className="p-2 border text-center">Data de Nasc.</th>
            <th className="p-2 border text-center">Sexo</th>
            <th className="p-2 border text-center">Turno</th>{/* ← NOVO */}
            <th className="p-2 border text-center">Disciplina</th>
            <th className="p-2 border text-center">Aulas</th>
            <th className="p-2 border text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {professores.map((p) => (
            <tr
              key={p.id}
              className={p.status === "inativo" ? "bg-gray-200" : "hover:bg-blue-50"}
            >
              <td className="p-2 border text-center">{formatarCPF(p.cpf)}</td>
              <td className="p-2 border text-left">{p.nome}</td>
              <td className="p-2 border text-center">{formatDate(p.data_nascimento)}</td>
              <td className="p-2 border text-center">{p.sexo}</td>
              <td className="p-2 border text-center">{(p.turno || "—").toUpperCase()}</td>{/* ← NOVO */}
              <td className="p-2 border text-center">{(p.disciplina_nome || "—").toUpperCase()}</td>
              <td className="p-2 border text-center">{p.aulas ?? "—"}</td>
              <td className="p-2 border text-center">
                <div className="flex justify-center gap-2">
                  {/* Ficha do professor */}
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    title="Ver Ficha"
                    onClick={() => navigate("/professores/" + p.id + "/ficha")}
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>

                  {/* Editar */}
                  <button
                    className="text-yellow-600 hover:text-yellow-800"
                    title="Editar"
                    onClick={() => onEdit && onEdit(p)}
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>

                  {/* Placeholder para ação futura */}
                  <button
                    className="text-green-600 hover:text-green-800"
                    title="Função futura"
                    onClick={() => alert("Função futura ainda será implementada")}
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                  </button>

                  {/* Excluir / Inativar */}
                  <button
                    onClick={() => onDelete(p)}
                    className="text-red-600 hover:text-red-800"
                    title="Excluir/Inativar"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
