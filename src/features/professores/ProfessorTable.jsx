import React from "react";
import { EyeIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";		

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}



export default function ProfessorTable({ professores = [], loading, onDelete }) {
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
            <th className="p-2 border">Nome</th>
            <th className="p-2 border text-center">Data de Nasc.</th>
            <th className="p-2 border text-center">Sexo</th>
            <th className="p-2 border text-center">Disciplina</th>
            <th className="p-2 border text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {professores.map((p) => (
            <tr
              key={p.id}
              className={p.status === "inativo" ? "bg-gray-200" : "hover:bg-blue-50"}
            >
              <td className="p-2 border text-center">{p.cpf}</td>
              <td className="p-2 border">{p.nome}</td>
              <td className="p-2 border text-center">{formatDate(p.data_nascimento)}</td>
              <td className="p-2 border text-center">{p.sexo}</td>
              <td className="p-2 border text-center">{p.disciplina_nome || "—"}</td>
              <td className="p-2 border text-center">
                <div className="flex justify-center gap-2">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    title="Ver Ficha"
                    onClick={() => navigate("/professores/" + p.id + "/ficha")}
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button
                    className="text-green-600 hover:text-green-800"
                    title="Função futura"
                    onClick={() => alert("Função futura ainda será implementada")}
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                  </button>
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
