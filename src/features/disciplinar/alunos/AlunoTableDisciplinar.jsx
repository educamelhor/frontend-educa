// src/features/disciplinar/alunos/AlunoTableDisciplinar.jsx
// ============================================================
// TABELA DE ALUNOS — Módulo DISCIPLINAR (isolado)
// Usa FichaAlunoDisciplinar internamente (sem pedagogico, sem upload)
// ============================================================
import React, { useState } from "react";
import {
  IdentificationIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/solid";
import { DocumentTextIcon as DocumentTextOutline } from "@heroicons/react/24/outline";
import FichaAlunoDisciplinar from "./FichaAlunoDisciplinar";

function formatarDataBR(data) {
  if (!data) return "";
  const s = typeof data === "string" ? data : "";
  const onlyDate = s.split("T")[0];
  const [ano, mes, dia] = onlyDate.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  return s;
}

/*
  Props:
  - alunos: lista de alunos a renderizar
  - loading: se true, exibe mensagem de carregamento
  - mostrarFicha: se true, exibe botão de ficha (abre FichaAlunoDisciplinar)
  - onRelatorioDisciplinar(aluno): callback para abrir relatório disciplinar
  - onTACE(aluno): callback para TACE
*/
export default function AlunoTableDisciplinar({
  alunos = [],
  loading,
  mostrarFicha = true,
  mostrarBoletim = false,
  onRelatorioDisciplinar,
  onTACE,
}) {
  const [openFicha, setOpenFicha] = useState(false);
  const [codigoSelecionado, setCodigoSelecionado] = useState(null);

  const abrirFicha = (codigo) => {
    setCodigoSelecionado(codigo);
    setOpenFicha(true);
  };

  if (loading) return <p>Carregando alunos…</p>;

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
                  {/* Ficha do aluno — abre FichaAlunoDisciplinar (sem pedagógico) */}
                  {mostrarFicha && (
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      title="Ficha do Estudante"
                      onClick={() => abrirFicha(aluno.codigo)}
                    >
                      <IdentificationIcon className="w-5 h-5" />
                    </button>
                  )}

                  {/* Relatório Disciplinar */}
                  {onRelatorioDisciplinar && (
                    <button
                      className="text-blue-600 hover:text-blue-800 transition"
                      title="Relatório de Registros Disciplinares"
                      onClick={() => onRelatorioDisciplinar(aluno)}
                    >
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                    </button>
                  )}

                  {/* TACE */}
                  {onTACE && (
                    <button
                      className="text-amber-600 hover:text-amber-800 transition"
                      title="T.A.C.E. — Termo de Ajuste de Conduta Escolar"
                      onClick={() => onTACE(aluno)}
                    >
                      <DocumentTextOutline className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal inline com FichaAlunoDisciplinar — apenas Relatório Disciplinar */}
      {openFicha && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-5xl h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setOpenFicha(false)}
              className="absolute top-2 right-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              ✕
            </button>
            <FichaAlunoDisciplinar codigo={codigoSelecionado} />
          </div>
        </div>
      )}
    </div>
  );
}
