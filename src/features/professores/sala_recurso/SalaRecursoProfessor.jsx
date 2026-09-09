// src/features/professores/sala_recurso/SalaRecursoProfessor.jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import toast from "react-hot-toast";
import {
  SparklesIcon,
  AcademicCapIcon,
  UserGroupIcon,
  DocumentTextIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  BookOpenIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  LightBulbIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

// Helper para calcular o status e a quantidade de campos preenchidos (de 4)
const getStatusAdequacao = (adeq) => {
  if (!adeq) return { status: "pendente", preenchidos: 0, total: 4 };
  const c1 = !!(adeq.habilidades_prioritarias && adeq.habilidades_prioritarias.trim());
  const c2 = !!(
    (adeq.metodologias_estrategias && adeq.metodologias_estrategias.trim()) ||
    (adeq.conteudos_adaptados && adeq.conteudos_adaptados.trim())
  );
  const c3 = !!(adeq.recursos_didaticos && adeq.recursos_didaticos.trim());
  const c4 = !!(adeq.avaliacao_adaptada && adeq.avaliacao_adaptada.trim());

  const preenchidos = [c1, c2, c3, c4].filter(Boolean).length;
  if (preenchidos === 0) return { status: "pendente", preenchidos: 0, total: 4 };
  if (preenchidos === 4) return { status: "concluido", preenchidos: 4, total: 4 };
  return { status: "andamento", preenchidos, total: 4 };
};

const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

// Sugestões pedagógicas rápidas para apoio ao professor
const SUGESTOES_RAPIDAS = {
  habilidades: [
    "Ampliar a capacidade de atenção, concentração e compreensão.",
    "Ampliar o vocabulário e as formas de comunicação.",
    "Aprimorar habilidades de vida diária e autonomia.",
    "Associar imagens, palavras, números ou quantidades.",
    "Compreender conceitos matemáticos fundamentais por meio de material concreto e recursos visuais.",
    "Demonstrar compreensão do conteúdo por meio de fala, gestos, desenhos, apontamentos ou outros recursos de comunicação.",
    "Desenvolver a autonomia e a participação do aluno nas atividades propostas.",
    "Desenvolver a coordenação motora fina e ampla por meio de atividades lúdicas.",
    "Desenvolver a coordenação motora por meio de pintura, recorte, colagem e traçados.",
    "Desenvolver a percepção, memória, raciocínio e associação.",
    "Desenvolver compreensão textual e identificação de ideias centrais com mediação individualizada.",
    "Desenvolver habilidades cognitivas, motoras, sociais e emocionais.",
    "Desenvolver noções de quantidade, sequência, espaço e tempo.",
    "Estimular a atenção e a permanência na atividade pelo tempo possível.",
    "Estimular a comunicação e a interação com colegas e professores.",
    "Estimular a expressão de ideias, sentimentos e necessidades.",
    "Expressar escolhas, preferências, sentimentos e necessidades.",
    "Expressar ideias com autonomia através de linguagem verbal, escrita orientada ou desenhos.",
    "Favorecer a inclusão e a participação ativa no ambiente escolar.",
    "Identificar diferenças e semelhanças entre objetos e figuras.",
    "Incentivar a resolução de situações-problema de acordo com as possibilidades do aluno.",
    "Interagir com os colegas, compartilhando materiais e participando de brincadeiras.",
    "Participar das atividades coletivas com suporte pedagógico e tempo estendido.",
    "Participar de atividades individuais e coletivas respeitando seus limites e possibilidades.",
    "Promover a autoestima, a confiança e o sentimento de pertencimento.",
    "Reconhecer cores, formas, números, letras, imagens ou objetos do cotidiano.",
    "Reconhecer e utilizar recursos de comunicação alternativa, quando necessário.",
    "Resolver pequenas situações-problema utilizando estratégias próprias.",
    "Seguir instruções simples, com apoio visual ou verbal quando necessário.",
  ],
  conteudos: [
    "Gêneros textuais curtos e estruturação de frases;",
    "Operações fundamentais e resolução de situações-problema ilustradas;",
    "Conceitos centrais da unidade com síntese visual e esquemas;",
    "Vocabulário temático contextualizado com imagens de apoio.",
  ],
  estrategias: [
    "Adaptar as atividades de acordo com o nível de desenvolvimento, ritmo e necessidades individuais de cada aluno.",
    "Adaptar materiais e recursos pedagógicos sempre que necessário, garantindo acessibilidade e participação.",
    "Apresentar as instruções de forma clara, objetiva e em pequenas etapas, utilizando demonstrações quando necessário.",
    "Incentivar a interação entre os alunos, promovendo atividades em duplas ou pequenos grupos.",
    "Instruções fragmentadas em etapas simples e sequenciais.",
    "Mediação direta e incentivo constante à participação ativa.",
    "Oferecer apoio individualizado durante a realização das atividades, reduzindo gradualmente a ajuda conforme o aluno desenvolve autonomia.",
    "Organizar o ambiente de maneira estruturada, segura e acessível, minimizando estímulos que possam dificultar a concentração.",
    "Permitir diferentes formas de participação e expressão, como fala, gestos, desenhos, apontamentos ou manipulação de objetos.",
    "Propor atividades que estimulem a coordenação motora, atenção, percepção, memória, comunicação e interação social.",
    "Realizar intervenções durante a atividade, observando as dificuldades e ajustando a proposta de acordo com as necessidades do aluno.",
    "Tempo estendido para realização de exercícios e atividades em sala.",
    "Textos em fonte ampliada (tamanho 14 ou 16) com espaçamento duplo.",
    "Uso de esquemas visuais, ilustrações e mapas conceituais.",
    "Utilizar imagens, figuras, cartões, objetos, jogos e recursos de comunicação alternativa para favorecer a aprendizagem.",
    "Utilizar materiais concretos, recursos visuais e atividades lúdicas para facilitar a compreensão do conteúdo.",
    "Utilizar repetição e retomada dos conteúdos, respeitando o tempo necessário para a aprendizagem.",
    "Valorizar as potencialidades e conquistas individuais, utilizando reforço positivo e incentivo.",
  ],
  avaliacao: [
    "Avaliação formativa e processual contínua com registros no portfólio pedagógico.",
    "Provas adaptadas com enunciados diretos e menor quantidade de itens por página.",
    "Valorização do progresso qualitativo, esforço e autonomia do estudante.",
    "Avaliação oral ou com suporte de recursos visuais quando necessário.",
  ],
};

export default function SalaRecursoProfessor() {
  const currentYear = new Date().getFullYear();
  const [anoLetivo, setAnoLetivo] = useState(() => {
    const saved = localStorage.getItem("ano_letivo");
    return saved ? Number(saved) : currentYear;
  });

  const [bimestre, setBimestre] = useState("1º Bimestre");
  const [turmas, setTurmas] = useState([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("");
  const [estudanteSelecionado, setEstudanteSelecionado] = useState("");

  // Dados dos alunos e adequações
  const [alunos, setAlunos] = useState([]);
  const [adequacoes, setAdequacoes] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);

  // Modal de edição da adequação curricular
  const [modalAdequacaoOpen, setModalAdequacaoOpen] = useState(false);
  const [alunoEmEdicao, setAlunoEmEdicao] = useState(null);
  const [salvandoAdequacao, setSalvandoAdequacao] = useState(false);

  // Campos do formulário de adequação (4 Colunas SEEDF)
  const [formId, setFormId] = useState(null);
  const [formHabilidades, setFormHabilidades] = useState("");
  const [formConteudos, setFormConteudos] = useState("");
  const [formEstrategias, setFormEstrategias] = useState("");
  const [formAvaliacao, setFormAvaliacao] = useState("");

  // Modal Zoom Foto
  const [fotoZoom, setFotoZoom] = useState(null);

  // Nome do professor logado
  const professorNome = useMemo(() => {
    return (
      localStorage.getItem("userName") ||
      localStorage.getItem("usuario_nome") ||
      localStorage.getItem("nome") ||
      "Professor(a)"
    );
  }, []);

  // 1. Carrega Turmas do Professor Logado
  useEffect(() => {
    const carregarTurmas = async () => {
      setLoadingInicial(true);
      try {
        const resTurmas = await api
          .get("/professores/me/turmas", { params: { ano: anoLetivo } })
          .catch(() => null);

        let turmasList = [];
        if (resTurmas?.data?.ok && Array.isArray(resTurmas.data.turmas)) {
          turmasList = resTurmas.data.turmas;
        } else {
          // Fallback para lista geral de turmas da escola se não for professor estrito
          const resFallback = await api
            .get("/api/turmas", { params: { ano: anoLetivo } })
            .catch(() => null);
          turmasList = resFallback?.data?.turmas || resFallback?.data || [];
        }
        setTurmas(turmasList);

        if (turmasList.length > 0) {
          setTurmaSelecionada((prev) => {
            const exists = turmasList.some((t) => String(t.id) === String(prev));
            return exists ? prev : String(turmasList[0].id);
          });
        } else {
          setTurmaSelecionada("");
        }
      } catch (err) {
        console.error("Erro ao carregar turmas:", err);
      } finally {
        setLoadingInicial(false);
      }
    };

    carregarTurmas();
  }, [anoLetivo]);

  // 2. Carrega Componentes Curriculares Vinculados ao Professor para a Turma Selecionada
  useEffect(() => {
    const carregarDisciplinas = async () => {
      if (!turmaSelecionada) {
        setDisciplinas([]);
        setDisciplinaSelecionada("");
        return;
      }

      try {
        // 1) Busca disciplinas que o professor leciona nesta turma específica
        const resDiscTurma = await api
          .get(`/professores/me/turmas/${turmaSelecionada}/disciplinas`)
          .catch(() => null);

        let discList = [];
        if (
          resDiscTurma?.data?.ok &&
          Array.isArray(resDiscTurma.data.disciplinas) &&
          resDiscTurma.data.disciplinas.length > 0
        ) {
          discList = resDiscTurma.data.disciplinas
            .map((d) => (typeof d === "string" ? d : d.nome))
            .filter(Boolean);
        } else {
          // 2) Fallback: busca disciplinas gerais moduladas do professor
          const resDiscGeral = await api
            .get("/professores/me/disciplinas", { params: { ano: anoLetivo } })
            .catch(() => null);

          if (
            resDiscGeral?.data?.ok &&
            Array.isArray(resDiscGeral.data.disciplinas) &&
            resDiscGeral.data.disciplinas.length > 0
          ) {
            discList = resDiscGeral.data.disciplinas
              .map((d) => (typeof d === "string" ? d : d.nome))
              .filter(Boolean);
          }
        }

        // Deduplica e ordena alfabeticamente
        discList = Array.from(new Set(discList)).sort((a, b) =>
          a.localeCompare(b, "pt-BR", { sensitivity: "base" })
        );

        setDisciplinas(discList);
        setDisciplinaSelecionada((prev) => {
          if (discList.includes(prev)) return prev;
          return discList[0] || "";
        });
      } catch (err) {
        console.error("Erro ao carregar disciplinas do professor:", err);
      }
    };

    carregarDisciplinas();
  }, [turmaSelecionada, anoLetivo]);

  // 2. Carrega Alunos AEE e Adequações da Turma Selecionada
  const carregarAlunosEAdequacoes = async () => {
    if (!turmaSelecionada) {
      setAlunos([]);
      setAdequacoes([]);
      return;
    }

    setLoadingAlunos(true);
    try {
      const [resAlunos, resAdequacoes] = await Promise.all([
        api.get("/api/sala-recursos/alunos", {
          params: {
            turma_id: turmaSelecionada,
            ano_letivo: anoLetivo,
            apenas_aee: "1",
          },
        }),
        api.get("/api/sala-recursos/adequacoes", {
          params: {
            turma_id: turmaSelecionada,
            ano_letivo: anoLetivo,
            bimestre,
            disciplina: disciplinaSelecionada,
          },
        }),
      ]);

      const alunosList = resAlunos.data?.alunos || [];
      const adeqList = resAdequacoes.data?.adequacoes || [];

      setAlunos(alunosList);
      setAdequacoes(adeqList);
    } catch (err) {
      console.error("Erro ao carregar alunos AEE da turma:", err);
    } finally {
      setLoadingAlunos(false);
    }
  };

  useEffect(() => {
    carregarAlunosEAdequacoes();
    setEstudanteSelecionado("");
  }, [turmaSelecionada, disciplinaSelecionada, bimestre, anoLetivo]);

  // Mapa de adequações por aluno_id
  const adequacaoPorAluno = useMemo(() => {
    const map = {};
    adequacoes.forEach((ad) => {
      map[ad.aluno_id] = ad;
    });
    return map;
  }, [adequacoes]);

  // Lista ordenada de estudantes da turma
  const alunosOrdenados = useMemo(() => {
    return [...alunos].sort((a, b) =>
      (a.estudante || "").localeCompare(b.estudante || "", "pt-BR", { sensitivity: "base" })
    );
  }, [alunos]);

  // Estudantes filtrados pelo dropdown
  const alunosFiltrados = useMemo(() => {
    if (!estudanteSelecionado) return alunosOrdenados;
    return alunosOrdenados.filter((a) => String(a.id) === String(estudanteSelecionado));
  }, [alunosOrdenados, estudanteSelecionado]);

  // Abrir Modal de Edição da Adequação
  const handleAbrirEdicao = (aluno) => {
    setAlunoEmEdicao(aluno);
    const existing = adequacaoPorAluno[aluno.id];
    if (existing) {
      setFormId(existing.id);
      setFormHabilidades(existing.habilidades_prioritarias || "");
      setFormConteudos(existing.metodologias_estrategias ? (existing.conteudos_adaptados || existing.metodologias_estrategias) : "");
      setFormEstrategias(existing.recursos_didaticos || existing.metodologias_estrategias || "");
      setFormAvaliacao(existing.avaliacao_adaptada || "");
    } else {
      setFormId(null);
      setFormHabilidades("");
      setFormConteudos("");
      setFormEstrategias("");
      setFormAvaliacao("");
    }
    setModalAdequacaoOpen(true);
  };

  // Salvar Adequação
  const handleSalvarAdequacao = async (andPrint = false) => {
    if (!alunoEmEdicao) return;

    const c1 = !!formHabilidades.trim();
    const c2 = !!formConteudos.trim();
    const c3 = !!formEstrategias.trim();
    const c4 = !!formAvaliacao.trim();
    const preenchidos = [c1, c2, c3, c4].filter(Boolean).length;

    const statusCalculado =
      preenchidos === 4 ? "concluido" : preenchidos > 0 ? "andamento" : "pendente";

    setSalvandoAdequacao(true);
    try {
      const payload = {
        id: formId,
        aluno_id: alunoEmEdicao.id,
        ano_letivo: anoLetivo,
        bimestre,
        disciplina: disciplinaSelecionada,
        professor_regente: professorNome,
        habilidades_prioritarias: formHabilidades.trim(),
        metodologias_estrategias: formConteudos.trim(),
        recursos_didaticos: formEstrategias.trim(),
        avaliacao_adaptada: formAvaliacao.trim(),
        status: statusCalculado,
      };

      const res = await api.post("/api/sala-recursos/adequacoes", payload);
      if (res.data?.ok) {
        if (preenchidos === 4) {
          toast.success("Adequação registrada com sucesso (4/4 campos preenchidos)!");
        } else if (preenchidos > 0) {
          toast.success(`Adequação salva em andamento (${preenchidos}/4 campos preenchidos).`);
        } else {
          toast("Adequação salva como pendente (campos vazios).", { icon: "ℹ️" });
        }

        await carregarAlunosEAdequacoes();

        if (andPrint) {
          handleImprimirPDF(alunoEmEdicao.id, res.data.id || formId);
        }

        setModalAdequacaoOpen(false);
      } else {
        toast.error(res.data?.message || "Erro ao salvar adequação.");
      }
    } catch (err) {
      console.error("Erro ao salvar adequação:", err);
      toast.error(err.response?.data?.message || "Erro de conexão ao salvar adequação.");
    } finally {
      setSalvandoAdequacao(false);
    }
  };

  // Imprimir PDF Oficial SEEDF
  const handleImprimirPDF = (alunoId, adeqId = null) => {
    const token = localStorage.getItem("token");
    const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");

    const params = new URLSearchParams({
      token,
      ano_letivo: String(anoLetivo),
      bimestre,
      disciplina: disciplinaSelecionada,
      professor_regente: professorNome,
    });

    if (adeqId) {
      params.append("adequacao_id", String(adeqId));
    } else if (alunoId) {
      params.append("aluno_id", String(alunoId));
    }

    const url = `${apiBase}/api/sala-recursos/pdf/adequacao-seedf?${params.toString()}`;
    window.open(url, "_blank");
  };

  // Helper para adicionar sugestão rápida com marcador (bolinha)
  const adicionarSugestao = (setter, currentValue, texto) => {
    const limpo = (currentValue || "").trim();
    if (!limpo) {
      setter(`• ${texto}`);
    } else {
      const base = limpo.startsWith("• ") || limpo.startsWith("- ") ? limpo : `• ${limpo}`;
      setter(`${base}\n• ${texto}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header com Identificação */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <SparklesIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Sala de Recursos — Adequações Curriculares (AEE)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
                Perfil Professor
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Docente: <strong className="text-slate-800">{professorNome}</strong> • Registro das adaptações curriculares (SEEDF) por turma e disciplina
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Ano Letivo</span>
            <span className="text-sm font-black text-blue-900">{anoLetivo}</span>
          </div>
        </div>
      </section>

      {/* Barra de Seleção de Bimestres (Tabs Modernas) */}
      <section className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BIMESTRES.map((bim) => {
            const isSelected = bimestre === bim;
            return (
              <button
                key={bim}
                onClick={() => setBimestre(bim)}
                className={`py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.01]"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                <ClockIcon className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                {bim}
              </button>
            );
          })}
        </div>
      </section>

      {/* Barra de Filtros (Turma, Disciplina e Busca) */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seletor de Turma */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserGroupIcon className="w-4 h-4 text-blue-600" />
              Sua Turma:
            </label>
            <select
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold text-slate-800"
            >
              {turmas.length === 0 ? (
                <option value="">Nenhuma turma localizada</option>
              ) : (
                turmas.map((t) => {
                  const nomeTurma = t.nome || t.turma || `Turma ${t.id}`;
                  return (
                    <option key={t.id} value={t.id}>
                      {nomeTurma} {t.turno ? `(${t.turno})` : ""}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Seletor de Disciplina */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BookOpenIcon className="w-4 h-4 text-blue-600" />
              Seu Componente Curricular:
            </label>
            <select
              value={disciplinaSelecionada}
              onChange={(e) => setDisciplinaSelecionada(e.target.value)}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold text-blue-900"
            >
              {disciplinas.length === 0 ? (
                <option value="">Nenhum componente vinculado</option>
              ) : (
                disciplinas.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Seletor de Estudante */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserGroupIcon className="w-4 h-4 text-blue-600" />
              Filtrar Estudante:
            </label>
            <select
              value={estudanteSelecionado}
              onChange={(e) => setEstudanteSelecionado(e.target.value)}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold text-slate-800"
            >
              <option value="">Todos os Estudantes ({alunos.length})</option>
              {alunosOrdenados.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.estudante} {a.codigo ? `(${a.codigo})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Lista de Estudantes AEE da Turma */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            Estudantes AEE da Turma ({alunosFiltrados.length})
          </h2>
          <span className="text-xs text-slate-500">
            Exibindo alunos com necessidade de atendimento diferenciado
          </span>
        </div>

        {loadingAlunos ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">Carregando estudantes da turma...</p>
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <InformationCircleIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">Nenhum estudante AEE localizado nesta turma</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Não foram encontrados alunos laudados ou cadastrados na Sala de Recursos para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alunosFiltrados.map((aluno) => {
              const adeq = adequacaoPorAluno[aluno.id];
              const infoStatus = getStatusAdequacao(adeq);
              const isPendente = infoStatus.status === "pendente";
              const isAndamento = infoStatus.status === "andamento";
              const isConcluido = infoStatus.status === "concluido";

              return (
                <div
                  key={aluno.id}
                  className={`bg-white rounded-2xl border-2 p-5 transition-all shadow-sm flex flex-col justify-between space-y-4 ${
                    isConcluido
                      ? "border-emerald-300 hover:border-emerald-500 hover:shadow-md"
                      : isAndamento
                      ? "border-amber-300 hover:border-amber-500 hover:shadow-md"
                      : "border-red-200 hover:border-red-400 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Foto com Zoom */}
                    <div
                      onClick={() => {
                        if (aluno.foto) setFotoZoom(aluno);
                      }}
                      className={`w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 flex-shrink-0 relative overflow-hidden select-none ${
                        aluno.foto ? "cursor-pointer hover:ring-2 hover:ring-blue-500 group" : ""
                      }`}
                      style={{ width: "56px", height: "56px" }}
                      title={aluno.foto ? "Clique para ampliar a foto" : aluno.estudante}
                    >
                      {aluno.foto ? (
                        <>
                          <img
                            src={aluno.foto}
                            alt={aluno.estudante}
                            className="w-full h-full object-cover rounded-2xl block"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                            <MagnifyingGlassPlusIcon className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <span className="text-base font-black text-slate-500">{aluno.estudante?.charAt(0) || "?"}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          {aluno.estudante}
                        </h3>

                        {/* Badges de Status (Vermelho, Amarelo, Verde) */}
                        {isConcluido ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border flex-shrink-0 bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                            ✓ Adequação Registrada
                          </span>
                        ) : isAndamento ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border flex-shrink-0 bg-amber-50 text-amber-900 border-amber-300 flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
                            Adequação em Andamento ({infoStatus.preenchidos}/4)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border flex-shrink-0 bg-red-50 text-red-800 border-red-200 flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5 text-red-500" />
                            ⏳ Pendente
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cód / Matrícula: <strong className="text-slate-700">{aluno.codigo || "—"}</strong> • Turma: {aluno.turma_nome || "—"} ({aluno.turma_turno || "—"})
                      </p>

                      {/* Badges de CIDs / Laudos */}
                      {aluno.laudos && aluno.laudos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {aluno.laudos.map((l, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-blue-50 text-blue-900 text-[10px] font-bold rounded-md border border-blue-200"
                            >
                              CID {l.cid || "—"} {l.diagnostico ? `(${l.diagnostico})` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo da Adequação do Bimestre */}
                  {isConcluido ? (
                    <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/80 text-xs text-slate-700 space-y-1.5">
                      <div>
                        <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wide">
                          Foco de Aprendizagem ({disciplinaSelecionada} • {bimestre}):
                        </span>
                        <p className="line-clamp-2 text-slate-600 mt-0.5">
                          {adeq.habilidades_prioritarias || "—"}
                        </p>
                      </div>
                      {adeq.recursos_didaticos && (
                        <div>
                          <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wide">
                            Estratégias / Recursos:
                          </span>
                          <p className="line-clamp-2 text-slate-600 mt-0.5">
                            {adeq.recursos_didaticos}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : isAndamento ? (
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs text-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 block text-[11px] uppercase tracking-wide">
                          Preenchimento Parcial ({disciplinaSelecionada} • {bimestre}):
                        </span>
                        <span className="text-[10px] font-black text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md">
                          {infoStatus.preenchidos} de 4 colunas
                        </span>
                      </div>
                      {adeq.habilidades_prioritarias?.trim() && (
                        <div>
                          <span className="font-semibold text-slate-800 text-[11px] block">1. Objetivos:</span>
                          <p className="line-clamp-1 text-slate-600">{adeq.habilidades_prioritarias}</p>
                        </div>
                      )}
                      {(adeq.conteudos_adaptados?.trim() || adeq.metodologias_estrategias?.trim()) && (
                        <div>
                          <span className="font-semibold text-slate-800 text-[11px] block">2. Conteúdos:</span>
                          <p className="line-clamp-1 text-slate-600">{adeq.conteudos_adaptados || adeq.metodologias_estrategias}</p>
                        </div>
                      )}
                      {adeq.recursos_didaticos?.trim() && (
                        <div>
                          <span className="font-semibold text-slate-800 text-[11px] block">3. Recursos:</span>
                          <p className="line-clamp-1 text-slate-600">{adeq.recursos_didaticos}</p>
                        </div>
                      )}
                      {adeq.avaliacao_adaptada?.trim() && (
                        <div>
                          <span className="font-semibold text-slate-800 text-[11px] block">4. Avaliação:</span>
                          <p className="line-clamp-1 text-slate-600">{adeq.avaliacao_adaptada}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50/50 p-3 rounded-xl border border-red-200/80 text-xs text-red-800">
                      Nenhuma adequação curricular registrada para <strong>{disciplinaSelecionada}</strong> no <strong>{bimestre}</strong>.
                    </div>
                  )}

                  {/* Ações */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleAbrirEdicao(aluno)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                        isConcluido
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                          : isAndamento
                          ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                          : "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20"
                      }`}
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      {isConcluido
                        ? "Editar Adequação"
                        : isAndamento
                        ? "Continuar Preenchimento"
                        : "Preencher Adequação"}
                    </button>

                    <button
                      onClick={() => handleImprimirPDF(aluno.id, adeq?.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors"
                      title="Gerar Ficha SEEDF em PDF"
                    >
                      <PrinterIcon className="w-4 h-4 text-blue-600" />
                      Imprimir PDF SEEDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal de Preenchimento da Adequação Curricular SEEDF */}
      {modalAdequacaoOpen && alunoEmEdicao && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto"
          onClick={() => setModalAdequacaoOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                  <SparklesIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    Adequação Curricular — {disciplinaSelecionada} ({bimestre})
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Estudante: <strong className="text-white">{alunoEmEdicao.estudante}</strong> • Turma: {alunoEmEdicao.turma_nome || "—"} ({alunoEmEdicao.turma_turno || "—"})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalAdequacaoOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Corpo do Formulário */}
            <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
              {/* Informativo SEEDF + Indicador de Progresso */}
              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <InformationCircleIcon className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-950 leading-relaxed">
                    Os 4 campos abaixo compõem as colunas oficiais da ficha padronizada pela <strong>SEEDF</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black border ${
                      ([
                        !!formHabilidades.trim(),
                        !!formConteudos.trim(),
                        !!formEstrategias.trim(),
                        !!formAvaliacao.trim(),
                      ].filter(Boolean).length === 4)
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : ([
                            !!formHabilidades.trim(),
                            !!formConteudos.trim(),
                            !!formEstrategias.trim(),
                            !!formAvaliacao.trim(),
                          ].filter(Boolean).length > 0)
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-red-100 text-red-800 border-red-300"
                    }`}
                  >
                    {[
                      !!formHabilidades.trim(),
                      !!formConteudos.trim(),
                      !!formEstrategias.trim(),
                      !!formAvaliacao.trim(),
                    ].filter(Boolean).length === 4
                      ? "✓ 4/4 Completo (Adequação Registrada)"
                      : [
                          !!formHabilidades.trim(),
                          !!formConteudos.trim(),
                          !!formEstrategias.trim(),
                          !!formAvaliacao.trim(),
                        ].filter(Boolean).length > 0
                      ? `⚠️ ${
                          [
                            !!formHabilidades.trim(),
                            !!formConteudos.trim(),
                            !!formEstrategias.trim(),
                            !!formAvaliacao.trim(),
                          ].filter(Boolean).length
                        }/4 Preenchidos (Em Andamento)`
                      : "🔴 0/4 Preenchidos (Pendente)"}
                  </span>
                </div>
              </div>

              {/* Coluna 1: Objetivos para as aprendizagens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    Objetivos para as aprendizagens (Foco Principal):
                  </label>
                  <span className="text-[11px] text-slate-500 italic">Descrever o foco principal do processo ensino-aprendizagem</span>
                </div>
                <textarea
                  rows={3}
                  value={formHabilidades}
                  onChange={(e) => setFormHabilidades(e.target.value)}
                  placeholder="Ex: Desenvolver a capacidade de leitura e interpretação com enunciados simplificados..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 leading-relaxed"
                />
                {/* Sugestões Rápidas */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 max-h-36 overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <LightBulbIcon className="w-3.5 h-3.5 text-amber-500" /> Sugestões ({SUGESTOES_RAPIDAS.habilidades.length}):
                  </span>
                  {SUGESTOES_RAPIDAS.habilidades.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      title={sug}
                      onClick={() => adicionarSugestao(setFormHabilidades, formHabilidades, sug)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[10px] font-medium rounded border border-slate-200 transition-colors text-left"
                    >
                      + {sug.length > 45 ? `${sug.slice(0, 45)}...` : sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coluna 2: Conteúdos / Unidades Didáticas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    Conteúdos / Unidades Didáticas Adaptadas:
                  </label>
                  <span className="text-[11px] text-slate-500 italic">Mencionar os conteúdos a serem trabalhados no bimestre</span>
                </div>
                <textarea
                  rows={3}
                  value={formConteudos}
                  onChange={(e) => setFormConteudos(e.target.value)}
                  placeholder="Ex: 1. Leitura e interpretação de textos narrativos curtos; 2. Produção de frases com apoio visual..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <LightBulbIcon className="w-3.5 h-3.5 text-amber-500" /> Sugestões:
                  </span>
                  {SUGESTOES_RAPIDAS.conteudos.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      title={sug}
                      onClick={() => adicionarSugestao(setFormConteudos, formConteudos, sug)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[10px] font-medium rounded border border-slate-200 transition-colors text-left"
                    >
                      + {sug.length > 45 ? `${sug.slice(0, 45)}...` : sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coluna 3: Estratégias Pedagógicas / Recursos Didáticos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    Estratégias Pedagógicas / Recursos Didáticos:
                  </label>
                  <span className="text-[11px] text-slate-500 italic">Metodologias, tecnologia assistiva, tempo estendido, recursos visuais</span>
                </div>
                <textarea
                  rows={3}
                  value={formEstrategias}
                  onChange={(e) => setFormEstrategias(e.target.value)}
                  placeholder="Ex: Textos em fonte ampliada (tamanho 14/16); Instruções fragmentadas; Apoio com mapas conceituais..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1 max-h-36 overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <LightBulbIcon className="w-3.5 h-3.5 text-amber-500" /> Sugestões ({SUGESTOES_RAPIDAS.estrategias.length}):
                  </span>
                  {SUGESTOES_RAPIDAS.estrategias.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      title={sug}
                      onClick={() => adicionarSugestao(setFormEstrategias, formEstrategias, sug)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[10px] font-medium rounded border border-slate-200 transition-colors text-left"
                    >
                      + {sug.length > 45 ? `${sug.slice(0, 45)}...` : sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coluna 4: Estratégias de Avaliação para a aprendizagem */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                    Estratégias de Avaliação para a aprendizagem:
                  </label>
                  <span className="text-[11px] text-slate-500 italic">Portfólios, observações, diário de bordo, provas adaptadas</span>
                </div>
                <textarea
                  rows={3}
                  value={formAvaliacao}
                  onChange={(e) => setFormAvaliacao(e.target.value)}
                  placeholder="Ex: Avaliação processual contínua com registros em portfólio; Provas adaptadas com itens reduzidos..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <LightBulbIcon className="w-3.5 h-3.5 text-amber-500" /> Sugestões:
                  </span>
                  {SUGESTOES_RAPIDAS.avaliacao.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      title={sug}
                      onClick={() => adicionarSugestao(setFormAvaliacao, formAvaliacao, sug)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[10px] font-medium rounded border border-slate-200 transition-colors text-left"
                    >
                      + {sug.length > 45 ? `${sug.slice(0, 45)}...` : sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setModalAdequacaoOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors w-full sm:w-auto"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={salvandoAdequacao}
                  onClick={() => handleSalvarAdequacao(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black shadow-sm transition-all w-full sm:w-auto"
                >
                  <PrinterIcon className="w-4 h-4" />
                  Salvar e Imprimir PDF
                </button>

                <button
                  type="button"
                  disabled={salvandoAdequacao}
                  onClick={() => handleSalvarAdequacao(false)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-500/30 transition-all w-full sm:w-auto"
                >
                  {salvandoAdequacao ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                  Salvar Adequação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom da Foto */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setFotoZoom(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black">{fotoZoom.estudante}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cód: {fotoZoom.codigo || "—"} • Turma: {fotoZoom.turma_nome || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFotoZoom(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <img
              src={fotoZoom.foto}
              alt={fotoZoom.estudante}
              className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain border border-slate-700 bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
