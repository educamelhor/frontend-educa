// src/features/sala-recursos/ModalAdequacaoCurricular.jsx
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  XMarkIcon,
  DocumentCheckIcon,
  PrinterIcon,
  SparklesIcon,
  AcademicCapIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre", "Anual"];

const DISCIPLINAS_PADRAO = [
  "Língua Portuguesa",
  "Matemática",
  "Ciências Naturais",
  "História",
  "Geografia",
  "Arte",
  "Educação Física",
  "Língua Inglesa",
  "Ensino Religioso",
  "Geral / Todas as Disciplinas"
];

const SUGESTOES_METODOLOGIAS = [
  "Instruções curtas e sequenciadas passo a passo",
  "Uso de pistas visuais, esquemas e imagens de apoio",
  "Mediação e leitura compartilhada de enunciados",
  "Tempo estendido para realização de tarefas e avaliações",
  "Redução do volume de exercícios, mantendo os conceitos centrais",
  "Trabalho em duplas produtivas ou pequenos grupos",
  "Flexibilização de registro (oral, gravado, digital ou escrito)",
  "Intervalos de descanso e alternância de atividades"
];

const SUGESTOES_RECURSOS = [
  "Textos com fonte ampliada e maior espaçamento",
  "Material didático concreto e manipulável",
  "Pranchas de Comunicação Alternativa e Aumentativa (CAA)",
  "Uso de computador, tablet ou leitor de tela",
  "Lápis com engrossador, tesoura adaptada e plano inclinado",
  "Fones abafadores de ruído para controle sensorial",
  "Cartões de rotina e antecipação de atividades"
];

const SUGESTOES_AVALIACOES = [
  "Leitura mediada das questões da prova pelo aplicador",
  "Tempo estendido (50% a mais) para a realização da prova",
  "Prova adaptada com menor número de itens por página e fonte ampliada",
  "Permissão de respostas orais registradas pelo professor",
  "Avaliação processual contínua com ênfase nas produções em sala",
  "Uso de consulta a materiais visuais e tabelas de apoio",
  "Valorização do processo evolutivo individual sobre a nota comparativa"
];

export default function ModalAdequacaoCurricular({
  isOpen,
  onClose,
  aluno,
  adequacaoId = null,
  anoLetivo = new Date().getFullYear(),
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    aluno_id: aluno?.id || "",
    ano_letivo: anoLetivo,
    bimestre: "1º Bimestre",
    disciplina: "Língua Portuguesa",
    professor_regente: "",
    professor_aee: "",
    habilidades_prioritarias: "",
    metodologias_estrategias: "",
    recursos_didaticos: "",
    avaliacao_adaptada: "",
    parecer_conclusivo: "",
    status: "concluido"
  });

  useEffect(() => {
    if (!isOpen) return;

    setErro("");
    if (adequacaoId) {
      carregarAdequacao(adequacaoId);
    } else {
      setForm({
        aluno_id: aluno?.id || "",
        ano_letivo: anoLetivo,
        bimestre: "1º Bimestre",
        disciplina: "Língua Portuguesa",
        professor_regente: "",
        professor_aee: "",
        habilidades_prioritarias: "",
        metodologias_estrategias: "",
        recursos_didaticos: "",
        avaliacao_adaptada: "",
        parecer_conclusivo: "",
        status: "concluido"
      });
    }
  }, [isOpen, adequacaoId, aluno]);

  const carregarAdequacao = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/sala-recursos/adequacoes/${id}`);
      if (res.data) {
        setForm({
          aluno_id: res.data.aluno_id,
          ano_letivo: res.data.ano_letivo,
          bimestre: res.data.bimestre || "1º Bimestre",
          disciplina: res.data.disciplina || "Língua Portuguesa",
          professor_regente: res.data.professor_regente || "",
          professor_aee: res.data.professor_aee || "",
          habilidades_prioritarias: res.data.habilidades_prioritarias || "",
          metodologias_estrategias: res.data.metodologias_estrategias || "",
          recursos_didaticos: res.data.recursos_didaticos || "",
          avaliacao_adaptada: res.data.avaliacao_adaptada || "",
          parecer_conclusivo: res.data.parecer_conclusivo || "",
          status: res.data.status || "concluido"
        });
      }
    } catch (err) {
      console.error("Erro ao carregar adequação:", err);
      setErro("Não foi possível carregar os dados da adequação curricular.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSugestao = (campo, texto) => {
    setForm((prev) => {
      const atual = prev[campo] ? prev[campo].trim() : "";
      if (atual.includes(texto)) return prev;
      const novo = atual ? `${atual}\n• ${texto}` : `• ${texto}`;
      return { ...prev, [campo]: novo };
    });
  };

  const handleSalvar = async (gerarPdf = false) => {
    if (!form.aluno_id) {
      setErro("Estudante não identificado.");
      return;
    }
    if (!form.disciplina || !form.bimestre) {
      setErro("Selecione a disciplina e o bimestre.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      let savedId = adequacaoId;
      if (adequacaoId) {
        await api.put(`/api/sala-recursos/adequacoes/${adequacaoId}`, form);
      } else {
        const res = await api.post("/api/sala-recursos/adequacoes", form);
        savedId = res.data?.id;
      }

      if (gerarPdf && savedId) {
        // Abre o PDF institucional em nova aba
        const token = localStorage.getItem("token");
        const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");
        window.open(`${apiBase}/api/sala-recursos/adequacoes/${savedId}/pdf?token=${token}`, "_blank");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar adequação:", err);
      setErro(err.response?.data?.message || "Erro ao salvar adequação curricular.");
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <SparklesIcon className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {adequacaoId ? "Editar Adequação Curricular" : "Nova Adequação Curricular"}
              </h3>
              <p className="text-xs text-blue-200">
                {aluno ? `${aluno.estudante} • Código: ${aluno.codigo || "—"}` : "Atendimento Educacional Especializado (AEE)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {erro && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Linha de Metadados: Bimestre, Disciplina, Ano */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Bimestre / Período *
              </label>
              <select
                name="bimestre"
                value={form.bimestre}
                onChange={handleChange}
                className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                {BIMESTRES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Componente Curricular / Disciplina *
              </label>
              <select
                name="disciplina"
                value={form.disciplina}
                onChange={handleChange}
                className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                {DISCIPLINAS_PADRAO.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Ano Letivo
              </label>
              <input
                type="number"
                name="ano_letivo"
                value={form.ano_letivo}
                onChange={handleChange}
                className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Professores Responsáveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Professor(a) Regente da Disciplina
              </label>
              <input
                type="text"
                name="professor_regente"
                value={form.professor_regente}
                onChange={handleChange}
                placeholder="Nome do professor em sala comum"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Professor(a) da Sala de Recursos (AEE)
              </label>
              <input
                type="text"
                name="professor_aee"
                value={form.professor_aee}
                onChange={handleChange}
                placeholder="Nome do docente especialista do AEE"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Bloco 1: Habilidades Prioritárias */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">1</span>
                Objetivos e Habilidades Curriculares Prioritárias / Adaptadas (BNCC / SEEDF)
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Descreva quais habilidades e competências centrais do bimestre serão trabalhadas e adaptadas ao ritmo e potencialidades do estudante.
            </p>
            <textarea
              name="habilidades_prioritarias"
              value={form.habilidades_prioritarias}
              onChange={handleChange}
              rows={4}
              placeholder="Ex.: Compreensão e interpretação de textos curtos com apoio imagético; resolução de problemas aditivos com suporte de material manipulável..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Bloco 2: Metodologias e Estratégias */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center">2</span>
                Metodologias, Estratégias Pedagógicas e Mediação
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Como o conteúdo será ensinado e mediado para garantir a participação ativa e compreensão do estudante.
            </p>
            {/* Chips de sugestões rápidas */}
            <div className="flex flex-wrap gap-1.5 py-1">
              {SUGESTOES_METODOLOGIAS.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => handleAddSugestao("metodologias_estrategias", sug)}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-2.5 py-1 rounded-full border border-indigo-200 transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
            <textarea
              name="metodologias_estrategias"
              value={form.metodologias_estrategias}
              onChange={handleChange}
              rows={4}
              placeholder="Descreva as estratégias de ensino diferenciadas..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Bloco 3: Recursos Didáticos e Tecnologia Assistiva */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">3</span>
                Recursos Didáticos, Acessibilidade e Tecnologia Assistiva
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Materiais adaptados, softwares, dispositivos e ferramentas necessárias para o acesso ao currículo.
            </p>
            <div className="flex flex-wrap gap-1.5 py-1">
              {SUGESTOES_RECURSOS.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => handleAddSugestao("recursos_didaticos", sug)}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2.5 py-1 rounded-full border border-emerald-200 transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
            <textarea
              name="recursos_didaticos"
              value={form.recursos_didaticos}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva os recursos e tecnologias assistivas a serem disponibilizados..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Bloco 4: Avaliação Diferenciada */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">4</span>
                Critérios, Instrumentos e Formas de Avaliação Diferenciada
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Como o aprendizado será verificado de forma justa, inclusiva e condizente com as adequações propostas.
            </p>
            <div className="flex flex-wrap gap-1.5 py-1">
              {SUGESTOES_AVALIACOES.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => handleAddSugestao("avaliacao_adaptada", sug)}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium px-2.5 py-1 rounded-full border border-amber-200 transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
            <textarea
              name="avaliacao_adaptada"
              value={form.avaliacao_adaptada}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva os instrumentos avaliativos diferenciados..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-600"
            />
          </div>

          {/* Bloco 5: Parecer de Alinhamento */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center">5</span>
              Parecer de Alinhamento / Observações Finais (Opcional)
            </label>
            <textarea
              name="parecer_conclusivo"
              value={form.parecer_conclusivo}
              onChange={handleChange}
              rows={2}
              placeholder="Observações complementares entre regência, sala de recursos e coordenação..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-600"
            />
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSalvar(true)}
              disabled={salvando}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <PrinterIcon className="w-4 h-4" />
              Salvar e Gerar PDF
            </button>

            <button
              type="button"
              onClick={() => handleSalvar(false)}
              disabled={salvando}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-md transition-colors disabled:opacity-50"
            >
              <DocumentCheckIcon className="w-4 h-4" />
              {salvando ? "Salvando..." : "Salvar Adequação"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
