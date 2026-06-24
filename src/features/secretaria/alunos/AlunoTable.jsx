// src/features/secretaria/alunos/AlunoTable.jsx

import React, { useState } from "react";
import {
  IdentificationIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/solid";
import { DocumentTextIcon as DocumentTextOutline } from "@heroicons/react/24/outline";
import FichaAluno from "./FichaAluno"; // ✅ isolado: cópia local no módulo Secretaria

// ────────────────────────────────────────────────────────────────
// Função utilitária para formatar datas no padrão brasileiro
// Aceita string ISO (YYYY-MM-DDTHH:mm:ss) ou já formatada DD/MM/YYYY
// ────────────────────────────────────────────────────────────────
function formatarDataBR(data) {
  if (!data) return "";
  const s = typeof data === "string" ? data : "";
  const onlyDate = s.split("T")[0];
  const [ano, mes, dia] = onlyDate.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  return s;
}
// ────────────────────────────────────────────────────────────────
/*
  Componente AlunoTable
  Responsável por exibir a lista de alunos em formato de tabela.

  Props:
  - alunos: lista de alunos a renderizar
  - loading: se true, exibe mensagem de carregamento
  - onDelete(aluno): callback para abrir/acionar o gerenciador (inativar/cancelar)
  - onEditar(aluno): callback quando clicado o botão de edição
  - onView(codigo): callback para abrir a ficha do aluno
  - onBoletim(codigo): callback para abrir o boletim do aluno
  - mostrarFicha / mostrarBoletim: flags para exibir/ocultar ações
*/
// ────────────────────────────────────────────────────────────────
export default function AlunoTable({
  alunos = [],
  loading,
  onDelete,
  onEditar,
  onBoletim,
  onTACE,
  onRelatorioDisciplinar,
  mostrarFicha = true,
  mostrarBoletim = true,
}) {
  // ✅ Controle do modal da ficha
  const [openFicha, setOpenFicha] = useState(false);
  const [codigoSelecionado, setCodigoSelecionado] = useState(null);

  const abrirFicha = (codigo) => {
    setCodigoSelecionado(codigo);
    setOpenFicha(true);
  };

  // ────────────────────────────────────────────────────────────────
  // Renderização condicional: estado de carregamento
  // ────────────────────────────────────────────────────────────────
  if (loading) return <p>Carregando alunos…</p>;

  // ────────────────────────────────────────────────────────────────
  // Renderização principal da tabela de alunos
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse mt-4">
        <thead className="bg-blue-100">
          <tr>
            <th className="p-2 border text-center">RE</th>
            <th className="p-2 border text-center">Estudante</th>
            <th className="p-2 border text-center">Data Nasc.</th>
            <th className="p-2 border text-center">Turma</th>
            <th className="p-2 border text-center">Ano</th>
            <th className="p-2 border text-center">Turno</th>
            <th className="p-2 border text-center">Ações</th>
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
              <td className="p-2 border text-left">
                {(aluno.estudante || "").toUpperCase()}
                {aluno.status === "inativo" && (
                  <span className="ml-2 font-bold text-xs uppercase tracking-wider text-gray-400">
                    (inativo)
                  </span>
                )}
              </td>
              <td className="p-2 border text-center">{formatarDataBR(aluno.data_nascimento)}</td>
              <td className="p-2 border text-center">{(aluno.turma || "").toUpperCase()}</td>
              <td className="p-2 border text-center">{aluno.ano_letivo || "—"}</td>
              <td className="p-2 border text-center">{(aluno.turno || "").toUpperCase()}</td>
              <td className="p-2 border text-center">
                <div className="flex justify-center gap-2">
                  {/* ✅ Ícone de ficha do estudante (abre modal) */}
                  {mostrarFicha && (
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      title="Ficha do Estudante"
                      onClick={() => abrirFicha(aluno.codigo)}
                    >
                      <IdentificationIcon className="w-5 h-5" />
                    </button>
                  )}

                  {onRelatorioDisciplinar && (
                    <button
                      className="text-blue-600 hover:text-blue-800 transition"
                      title="Relatório de Registros Disciplinares"
                      onClick={() => onRelatorioDisciplinar(aluno)}
                    >
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                    </button>
                  )}

                  {onTACE && (
                    <button
                      className="text-amber-600 hover:text-amber-800 transition"
                      title="T.A.C.E. — Termo de Ajuste de Conduta Escolar"
                      onClick={() => onTACE(aluno)}
                    >
                      <DocumentTextOutline className="w-5 h-5" />
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

                  {onEditar && (
                    <button
                      className="text-indigo-600 hover:text-indigo-800"
                      title="Editar"
                      onClick={() => onEditar(aluno)}
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  )}

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

      {/* ✅ Modal inline para ficha */}
      {openFicha && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-5xl h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setOpenFicha(false)}
              className="absolute top-2 right-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              ✕
            </button>
            <FichaAluno codigo={codigoSelecionado} />
          </div>
        </div>
      )}
    </div>
  );
}
