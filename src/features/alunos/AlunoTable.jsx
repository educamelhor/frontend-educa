// src/features/alunos/AlunoTable.jsx
import React from "react";
import {
  EyeIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";

function formatarDataBR(data) {
  if (!data) return "";
  const s = typeof data === "string" ? data : "";
  const onlyDate = s.split("T")[0];
  const [ano, mes, dia] = onlyDate.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  return s;
}

export default function AlunoTable({
  alunos = [],
  loading,
  onDelete,
  onEditar,
  onView,
  onBoletim,
  mostrarFicha = true,
  mostrarBoletim = true,
}) {
  const navigate = useNavigate();

  if (loading) {
    return <p>Carregando alunos…</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse mt-4">
        <thead className="bg-blue-100">
          <tr>
            <th className="p-2 border text-center font-medium text-blue-900">Código</th>
            <th className="p-2 border text-left font-medium text-blue-900">Estudante</th>
            <th className="p-2 border text-center font-medium text-blue-900">Data Nasc.</th>
            <th className="p-2 border text-center font-medium text-blue-900">Sexo</th>
            <th className="p-2 border text-center font-medium text-blue-900">Turma</th>
            <th className="p-2 border text-center font-medium text-blue-900">Turno</th>
            <th className="p-2 border text-center font-medium text-blue-900">Ações</th>
          </tr>
        </thead>
        <tbody>
          {(alunos ?? []).map((aluno) => (
            <tr
              key={aluno.id}
              className={
                aluno.status === "inativo"
                  ? "bg-gray-100 text-gray-500 italic"
                  : "hover:bg-blue-50"
              }
            >
              <td className="p-2 border text-center">{aluno.codigo}</td>
              <td className="p-2 border">{(aluno.estudante || "").toUpperCase()}</td>
              <td className="p-2 border text-center">
                {formatarDataBR(aluno.data_nascimento)}
              </td>
              <td className="p-2 border text-center">{(aluno.sexo || "").toUpperCase()}</td>
              <td className="p-2 border text-center">{(aluno.turma || "").toUpperCase()}</td>
              <td className="p-2 border text-center">{(aluno.turno || "").toUpperCase()}</td>
              <td className="p-2 border text-center">
                <div className="flex justify-center gap-2">
                  {mostrarFicha && onView && (
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      title="Ficha do Estudante"
                      onClick={() => onView(aluno.codigo)}
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  )}

                  {mostrarBoletim && onBoletim && (
                    <button
                      className="text-green-600 hover:text-green-800"
                      title="Boletim"
                      onClick={() => onBoletim(aluno.codigo)}
                    >
                      <DocumentTextIcon className="w-5 h-5" />
                    </button>
                  )}

                  {/* Só mostra editar se a função for passada */}
                  {onEditar && (
                    <button
                      className="text-indigo-600 hover:text-indigo-800"
                      title="Editar"
                      onClick={() => onEditar(aluno)}
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  )}

                  {/* Só mostra excluir/inativar se a função for passada */}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(aluno)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir/Inativar"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
