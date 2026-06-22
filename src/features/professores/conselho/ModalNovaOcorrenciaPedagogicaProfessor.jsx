// features/professores/conselho/ModalNovaOcorrenciaPedagogicaProfessor.jsx
// ============================================================================
// Versão PROFESSOR do modal de ocorrência pedagógica.
//
// Governança aplicada:
//  ✅ Professor PODE registrar e visualizar ocorrências pedagógicas
//  ✅ Professor PODE selecionar categoria e ocorrência
//  ❌ Campo Descrição          — OCULTO para professor
//  ❌ Campo Registro Interno   — OCULTO para professor
//  ❌ Convocar responsável     — OCULTO (exclusivo coordenação/direção)
//
// Este arquivo é INDEPENDENTE de alunos/ModalNovaOcorrenciaPedagogica.jsx.
// NÃO altere o arquivo compartilhado para ajustar regras do professor.
// ============================================================================
import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "../../../services/api";

// ─── Categorias e ocorrências pedagógicas ────────────────────────────────────
const CATEGORIAS_PEDAGOGICAS = [
  {
    categoria: "Desempenho Acadêmico",
    itens: [
      "Dificuldade de aprendizagem persistente",
      "Baixo rendimento em avaliações",
      "Não realiza atividades em sala",
      "Não entrega tarefas/trabalhos",
      "Progresso significativo na disciplina",
      "Destaque em atividade avaliativa",
    ],
  },
  {
    categoria: "Comportamento em Sala",
    itens: [
      "Falta de atenção/concentração recorrente",
      "Uso indevido de celular em aula",
      "Conversa excessiva durante a aula",
      "Recusa em participar de atividades",
      "Participação exemplar na aula",
      "Colaboração positiva com colegas",
    ],
  },
  {
    categoria: "Frequência e Pontualidade",
    itens: [
      "Faltas consecutivas sem justificativa",
      "Atrasos recorrentes",
      "Saídas antecipadas frequentes",
      "Evasão de aula (saiu sem autorização)",
      "Frequência regular e comprometida",
    ],
  },
  {
    categoria: "Socioemocional",
    itens: [
      "Dificuldade de socialização",
      "Comportamento de isolamento",
      "Sinais de ansiedade ou estresse",
      "Conflito recorrente com colegas",
      "Demonstração de empatia e solidariedade",
      "Melhora perceptível na convivência",
    ],
  },
  {
    categoria: "Necessidades Especiais",
    itens: [
      "Necessidade de atendimento individualizado",
      "Adequação curricular necessária",
      "Encaminhamento para equipe multidisciplinar",
      "Adaptação de atividades/provas",
      "Evolução no plano educacional individualizado",
    ],
  },
  {
    categoria: "Outros",
    itens: [
      "Ocorrência não categorizada",
      "Observação geral do professor",
    ],
  },
];

export default function ModalNovaOcorrenciaPedagogicaProfessor({
  open,
  onClose,
  aluno,
  onOcorrenciaCriada,
  ocorrenciaInicial = null,
  readonly = false,
}) {
  const [data, setData] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [nextRegistro, setNextRegistro] = useState("...");

  // ❌ descricao e registroInterno — NÃO existem neste componente professor

  const itensFiltrados = React.useMemo(() => {
    if (!categoriaSelecionada) return [];
    const cat = CATEGORIAS_PEDAGOGICAS.find((c) => c.categoria === categoriaSelecionada);
    return cat ? cat.itens : [];
  }, [categoriaSelecionada]);

  useEffect(() => {
    if (!open) return;

    if (ocorrenciaInicial) {
      // Modo visualização — preenche com dados existentes
      let dt = ocorrenciaInicial.data_ocorrencia || "";
      if (dt.includes("/")) {
        const [dd, mm, yyyy] = dt.split("/");
        dt = `${yyyy}-${mm}-${dd}`;
      }
      setData(dt || new Date().toISOString().split("T")[0]);
      setCategoriaSelecionada(ocorrenciaInicial.categoria || "");
      setMotivo(ocorrenciaInicial.motivo || "");
    } else {
      // Modo criação — limpa tudo
      setData(new Date().toISOString().split("T")[0]);
      setCategoriaSelecionada("");
      setMotivo("");
      setNextRegistro("...");
      if (aluno?.id) {
        api
          .get(`/api/alunos/${aluno.id}/proxima-ocorrencia-pedagogica`)
          .then((res) => setNextRegistro(res.data.proximoRegistro))
          .catch(() => setNextRegistro("N/A"));
      }
    }
  }, [open, ocorrenciaInicial, aluno]);

  if (!open) return null;

  const isVisualizacao = Boolean(ocorrenciaInicial) || readonly;

  const handleCategoriaChange = (cat) => {
    setCategoriaSelecionada(cat);
    setMotivo("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas`, {
        data,
        categoria: categoriaSelecionada,
        motivo,
        // ❌ descricao — não enviado (professor não tem acesso)
        // ❌ registroInterno — não enviado (professor não tem acesso)
      });
      if (onOcorrenciaCriada) onOcorrenciaCriada();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar o registro pedagógico.");
    } finally {
      setSalvando(false);
    }
  };

  // ── Badge de status ──────────────────────────────────────────────────────
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
            {isVisualizacao ? "Detalhes do Registro Pedagógico" : "Novo Registro Pedagógico"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" title="Fechar">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form id="formPedagogicaProf" onSubmit={handleSubmit} className="px-5 py-4 overflow-y-auto space-y-3 flex-1 min-h-0">

          {isVisualizacao && (
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              ℹ️ Visualizando em modo <strong>somente leitura</strong>.
            </div>
          )}

          {/* Registro + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registro</label>
              <input
                type="text"
                disabled
                value={ocorrenciaInicial ? (ocorrenciaInicial.registro || ocorrenciaInicial.id) : nextRegistro}
                className="w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type={isVisualizacao ? "text" : "date"}
                required={!isVisualizacao}
                disabled={isVisualizacao}
                value={isVisualizacao ? (ocorrenciaInicial?.data_ocorrencia || "") : data}
                onChange={(e) => setData(e.target.value)}
                className={`w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none ${isVisualizacao ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            {isVisualizacao ? (
              <input type="text" disabled value={categoriaSelecionada} className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed" />
            ) : (
              <select
                required
                value={categoriaSelecionada}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none"
              >
                <option value="">-- Selecione a categoria --</option>
                {CATEGORIAS_PEDAGOGICAS.map((c) => (
                  <option key={c.categoria} value={c.categoria}>{c.categoria}</option>
                ))}
              </select>
            )}
          </div>

          {/* Ocorrência */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ocorrência</label>
            {isVisualizacao ? (
              <input type="text" disabled value={motivo} className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed" />
            ) : (
              <select
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={!categoriaSelecionada}
                className="w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Selecione --</option>
                {itensFiltrados.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            )}
          </div>

          {/* ❌ Campo Descrição — OCULTO para professor (governança) */}
          {/* ❌ Campo Registro Interno — OCULTO para professor (governança) */}
          {/* ❌ Convocar Responsável — OCULTO para professor */}

          {/* Status (somente visualização) */}
          {isVisualizacao && ocorrenciaInicial?.status && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${statusBadge(ocorrenciaInicial.status)}`}>
                {ocorrenciaInicial.status}
              </span>
            </div>
          )}

          {/* Registrado por */}
          {isVisualizacao && ocorrenciaInicial?.nome_usuario_registro && (
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
        </form>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
          {isVisualizacao ? (
            <button type="button" onClick={onClose} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition">
              Fechar
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 transition">
                Cancelar
              </button>
              <button
                type="submit"
                form="formPedagogicaProf"
                disabled={salvando}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {salvando ? "Registrando..." : "Registrar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
