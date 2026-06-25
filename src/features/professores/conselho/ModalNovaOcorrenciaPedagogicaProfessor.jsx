// features/professores/conselho/ModalNovaOcorrenciaPedagogicaProfessor.jsx
// ============================================================================
// Modal de ocorrência pedagógica — perfil PROFESSOR (isolado)
//
// Governança:
//  ✅ Professor PODE registrar ocorrências (categoria + ocorrência)
//  ❌ Campo Descrição         — OCULTO
//  ❌ Campo Registro Interno  — OCULTO
//  ❌ Convocar responsável    — OCULTO
//
// EXCLUSIVO: professores/conselho. Não afeta outros módulos.
// ============================================================================

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "../../../services/api";

// \u2500\u2500\u2500 Lista OFICIAL de categorias e ocorr\u00eancias pedag\u00f3gicas \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Fonte: LISTA_REGISTROS.xlsx \u2014 atualizado em 2026-06
const CATEGORIAS_PEDAGOGICAS = [
  {
    categoria: "\uD83D\uDCDA Rendimento e participa\u00e7\u00e3o pedag\u00f3gica (positivo)",
    itens: [
      "Apresenta boa participa\u00e7\u00e3o nas discuss\u00f5es em sala.",
      "Apresenta bom desempenho nas atividades realizadas.",
      "Apresenta progresso cont\u00ednuo em seu rendimento escolar.",
      "Busca aprimorar seu desempenho escolar.",
      "Compreende com facilidade os conte\u00fados trabalhados.",
      "Contribui com ideias durante as atividades.",
      "Demonstra dedica\u00e7\u00e3o \u00e0s atividades propostas.",
      "Demonstra evolu\u00e7\u00e3o significativa na aprendizagem.",
      "Demonstra interesse pelas atividades propostas.",
      "Esfor\u00e7a-se para superar suas dificuldades.",
      "Mostra persist\u00eancia diante dos desafios.",
      "Mostra-se envolvido nas propostas pedag\u00f3gicas.",
      "Participa ativamente das aulas.",
      "Realiza as atividades com autonomia.",
      "Solicita ajuda quando necess\u00e1rio, demonstrando interesse em aprender.",
    ],
  },
  {
    categoria: "\uD83D\uDCDA Rendimento e participa\u00e7\u00e3o pedag\u00f3gica (negativo)",
    itens: [
      "Apresenta baixa participa\u00e7\u00e3o nas atividades propostas.",
      "Apresenta dificuldade em manter a aten\u00e7\u00e3o durante as atividades propostas.",
      "Apresenta dificuldades em seguir instru\u00e7\u00f5es sequenciais.",
      "Apresenta dificuldades na compreens\u00e3o das orienta\u00e7\u00f5es dadas.",
      "Demonstra baixo rendimento nas atividades avaliativas.",
      "Demonstra dificuldade em aplicar os conte\u00fados trabalhados.",
      "Demonstra falta de organiza\u00e7\u00e3o na realiza\u00e7\u00e3o das atividades.",
      "Demonstra pouca autonomia na execu\u00e7\u00e3o das tarefas.",
      "Demonstra pouco interesse em aprimorar seu desempenho escolar.",
      "Demostra ter dificuldades por falta de pr\u00e9-requisitos.",
      "Estudante dorme em sala de aula.",
      "Evita envolver-se em atividades que exigem maior esfor\u00e7o cognitivo.",
      "N\u00e3o acompanha o ritmo da turma nas propostas pedag\u00f3gicas.",
      "N\u00e3o busca esclarecimento de d\u00favidas durante as atividades.",
      "N\u00e3o revisa ou corrige as atividades quando orientado.",
      "Necessita de constante media\u00e7\u00e3o para realizar as atividades.",
      "Necessita de incentivo constante para manter-se engajado.",
      "Realiza as atividades com pouca dedica\u00e7\u00e3o e capricho.",
      "Realiza outras atividades durante a aula.",
    ],
  },
  {
    categoria: "\u270F\uFE0F Qualidade das atividades (positivo)",
    itens: [
      "Apresenta capricho na realiza\u00e7\u00e3o das atividades.",
      "Cumpre os prazos estabelecidos para entrega das atividades.",
      "Demonstra responsabilidade com as tarefas escolares.",
      "Mant\u00e9m o material organizado.",
      "Registra adequadamente os conte\u00fados no caderno.",
    ],
  },
  {
    categoria: "\u270F\uFE0F Qualidade das atividades (negativo)",
    itens: [
      "Apresenta dificuldade em gerenciar o tempo durante as atividades.",
      "Apresenta dificuldade em registrar o conte\u00fado trabalhado.",
      "Apresenta registros desorganizados no caderno.",
      "Depende excessivamente de apoio para concluir tarefas.",
      "Entrega atividades incompletas ou com baixa qualidade.",
      "Esquece frequentemente de realizar tarefas de casa.",
      "N\u00e3o cumpre prazos para entrega das atividades.",
      "N\u00e3o demonstra evolu\u00e7\u00e3o no desempenho das atividades propostas.",
      "N\u00e3o mant\u00e9m organiza\u00e7\u00e3o dos materiais e atividades escolares.",
      "N\u00e3o mant\u00e9m regularidade nos registros das atividades.",
      "Realiza as atividades de forma apressada, comprometendo o resultado.",
    ],
  },
  {
    categoria: "\uD83E\uDD1D Conviv\u00eancia e atitudes (positivo)",
    itens: [
      "Contribui para um ambiente harmonioso em sala de aula.",
      "Demonstra atitudes de respeito e colabora\u00e7\u00e3o.",
      "Demostra ter h\u00e1bito de estudo.",
      "\u00c9 cooperativo nas atividades em grupo.",
      "Mant\u00e9m bom relacionamento com colegas e professores.",
      "Respeita as normas e combinados da turma.",
    ],
  },
  {
    categoria: "\uD83E\uDD1D Conviv\u00eancia e atitudes (negativo)",
    itens: [
      "Conversa durante as orienta\u00e7\u00f5es e explica\u00e7\u00f5es.",
      "N\u00e3o contribui para um ambiente harmonioso em sala de aula.",
      "N\u00e3o demonstra atitudes de respeito e colabora\u00e7\u00e3o.",
      "N\u00e3o demostra ter h\u00e1bito de estudo.",
      "N\u00e3o \u00e9 cooperativo nas atividades em grupo.",
      "N\u00e3o mant\u00e9m bom relacionamento com colegas e professores.",
      "N\u00e3o respeita as normas e combinados da turma.",
    ],
  },
];


export default function ModalNovaOcorrenciaPedagogicaProfessor({
  open, onClose, aluno, onOcorrenciaCriada,
  ocorrenciaInicial = null, readonly = false,
}) {
  const [data, setData] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [nextRegistro, setNextRegistro] = useState("...");

  const itensFiltrados = React.useMemo(() => {
    if (!categoriaSelecionada) return [];
    const cat = CATEGORIAS_PEDAGOGICAS.find((c) => c.categoria === categoriaSelecionada);
    return cat ? cat.itens : [];
  }, [categoriaSelecionada]);

  useEffect(() => {
    if (!open) return;
    if (ocorrenciaInicial) {
      let dt = ocorrenciaInicial.data_ocorrencia || "";
      if (dt.includes("/")) {
        const [dd, mm, yyyy] = dt.split("/");
        dt = `${yyyy}-${mm}-${dd}`;
      }
      setData(dt || new Date().toISOString().split("T")[0]);
      setCategoriaSelecionada(ocorrenciaInicial.categoria || "");
      setMotivo(ocorrenciaInicial.motivo || "");
    } else {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas`, {
        data, categoria: categoriaSelecionada, motivo,
        // ❌ descricao — não enviado (professor não tem acesso)
        // ❌ registroInterno — não enviado
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

  const statusBadge = (status) => {
    if (status === "FINALIZADA") return "text-green-700 bg-green-100 border-green-200";
    if (status === "CANCELADA")  return "text-red-700 bg-red-100 border-red-200";
    return "text-emerald-700 bg-emerald-100 border-emerald-200";
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        <div className="px-5 py-3 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50 flex-shrink-0">
          <h2 className="text-lg font-bold text-emerald-900">
            {isVisualizacao ? "Detalhes do Registro Pedagógico" : "Novo Registro Pedagógico"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form id="formPedagogicaProf" onSubmit={handleSubmit} className="px-5 py-4 overflow-y-auto space-y-3 flex-1 min-h-0">

          {isVisualizacao && (
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              ℹ️ Visualizando em modo <strong>somente leitura</strong>.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registro</label>
              <input
                type="text" disabled
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            {isVisualizacao ? (
              <input type="text" disabled value={categoriaSelecionada} className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed" />
            ) : (
              <select
                required
                value={categoriaSelecionada}
                onChange={(e) => { setCategoriaSelecionada(e.target.value); setMotivo(""); }}
                className="w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none"
              >
                <option value="">-- Selecione a categoria --</option>
                {CATEGORIAS_PEDAGOGICAS.map((c) => (
                  <option key={c.categoria} value={c.categoria}>{c.categoria}</option>
                ))}
              </select>
            )}
          </div>

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

          {/* ❌ Descrição — OCULTO para professor */}
          {/* ❌ Registro Interno — OCULTO para professor */}

          {isVisualizacao && ocorrenciaInicial?.status && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${statusBadge(ocorrenciaInicial.status)}`}>
                {ocorrenciaInicial.status}
              </span>
            </div>
          )}

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
                type="submit" form="formPedagogicaProf"
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
