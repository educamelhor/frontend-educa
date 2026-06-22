// features/professores/conselho/ModalRelatorioPedagogicoProfessor.jsx
// ============================================================================
// Versão PROFESSOR do Relatório Pedagógico.
//
// Governança aplicada:
//  ✅ Professor PODE visualizar o histórico de registros pedagógicos
//  ✅ Professor PODE registrar novas ocorrências (sem Descrição/Reg.Interno)
//  ❌ Ação Finalizar        — OCULTA
//  ❌ Ação Editar           — OCULTA
//  ❌ Ação Excluir          — OCULTA
//  ❌ Campo Descrição       — OCULTO (no modal de detalhe/criação)
//  ❌ Campo Registro Interno— OCULTO (no modal de detalhe/criação)
//
// Este arquivo é INDEPENDENTE de alunos/ModalRelatorioPedagogico.jsx.
// NÃO altere o arquivo compartilhado para ajustar regras do professor.
// ============================================================================
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";
import ModalNovaOcorrenciaPedagogicaProfessor from "./ModalNovaOcorrenciaPedagogicaProfessor";

export default function ModalRelatorioPedagogicoProfessor({ open, onClose, aluno }) {
  const [novaOcorrenciaOpen, setNovaOcorrenciaOpen] = useState(false);
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(false);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && aluno?.id) {
      fetchOcorrencias();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, aluno]);

  const fetchOcorrencias = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas`);
      setOcorrencias(res.data);
    } catch (err) {
      console.error("Erro ao carregar registros pedagógicos", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Badge de status ────────────────────────────────────────────────────
  const statusBadge = (status) => {
    if (status === "FINALIZADA") return "text-green-700 bg-green-100 border-green-200";
    if (status === "CANCELADA")  return "text-red-700 bg-red-100 border-red-200";
    return "text-emerald-700 bg-emerald-100 border-emerald-200";
  };

  // ── Badge de categoria ─────────────────────────────────────────────────
  const categoriaBadge = (cat) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("desempenho"))    return "bg-blue-100 text-blue-800 border-blue-200";
    if (c.includes("comportamento")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (c.includes("frequência") || c.includes("frequencia")) return "bg-orange-100 text-orange-800 border-orange-200";
    if (c.includes("socioemocional")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (c.includes("necessidades")) return "bg-pink-100 text-pink-800 border-pink-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (!open || !aluno) return null;

  // Foto
  const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");
  const buildFotoURL = (path) => {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `${apiBase}${path}`;
  };
  const fotoURL = buildFotoURL(aluno.foto);
  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
        <rect width='100%' height='100%' rx='64' ry='64' fill='#e5e7eb'/>
      </svg>`
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="h-6 w-6 text-emerald-800" />
            <h2 className="text-xl font-bold text-emerald-900">Relatório Pedagógico</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" title="Fechar">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">

          {/* Aviso de governança */}
          <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            ℹ️ Como professor, você pode <strong>registrar</strong> novas ocorrências e visualizar o histórico.
            Edição, exclusão, finalização e os campos <strong>Descrição</strong> e <strong>Registro Interno</strong> são exclusivos da coordenação e direção.
          </div>

          {/* Cabeçalho do Estudante */}
          <div className="flex items-center gap-6 mb-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
            <div className="flex-shrink-0">
              <img
                src={fotoURL || PLACEHOLDER}
                alt={`Foto de ${aluno.estudante || ""}`}
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-800 uppercase truncate">
                {aluno.estudante ?? "NOME NÃO INFORMADO"}
              </h3>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-700">Turma:</span>{" "}
                {aluno.turma ?? "-"} {aluno.turno ? `(${aluno.turno})` : ""}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-600">Código:</span> {aluno.codigo}
              </p>
            </div>

            {/* Contador de registros */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Registros</span>
                <span className="text-2xl font-bold text-emerald-700">{ocorrencias.length}</span>
              </div>
            </div>

            {/* ✅ Botão + Adicionar — professor PODE registrar novas ocorrências */}
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  setOcorrenciaSelecionada(null);
                  setModoVisualizacao(false);
                  setNovaOcorrenciaOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm"
              >
                + Adicionar
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full text-left bg-white text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Registro</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Categoria</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Data</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Ocorrência</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-center">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 italic">
                      Carregando histórico...
                    </td>
                  </tr>
                ) : ocorrencias.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 italic">
                      Nenhum registro pedagógico encontrado para este estudante.
                    </td>
                  </tr>
                ) : (
                  ocorrencias.map((oc) => (
                    <tr key={oc.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{oc.registro || oc.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${categoriaBadge(oc.categoria)}`}>
                          {oc.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{oc.data_ocorrencia}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="font-semibold text-gray-800">{oc.motivo}</div>
                        {/* ❌ oc.descricao — OCULTO para professor */}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusBadge(oc.status)}`}>
                          {oc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* ✅ Visualizar — sem Finalizar, Editar ou Excluir */}
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setOcorrenciaSelecionada(oc);
                              setModoVisualizacao(true);
                              setNovaOcorrenciaOpen(true);
                            }}
                            className="text-gray-600 hover:text-gray-800"
                            title="Visualizar"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de criação/visualização — versão professor (sem Descrição e Registro Interno) */}
      <ModalNovaOcorrenciaPedagogicaProfessor
        open={novaOcorrenciaOpen}
        onClose={() => {
          setNovaOcorrenciaOpen(false);
          setOcorrenciaSelecionada(null);
          setModoVisualizacao(false);
        }}
        aluno={aluno}
        onOcorrenciaCriada={fetchOcorrencias}
        ocorrenciaInicial={ocorrenciaSelecionada}
        readonly={modoVisualizacao}
      />
    </div>
  );
}
