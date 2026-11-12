// src/features/secretaria/matriculas/ModalProjetoEnsinoMedio.jsx
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  SparklesIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";
import { normalizarCardEixoVisual } from "./ModalEixoEnsinoMedio";

export const CATALOGO_CARDS_EM = [
  {
    codigo: "IFA",
    sigla: "IFA",
    titulo: "IFA — Itinerário Formativo",
    subtitulo: "Percursos de Aprofundamento por Área do Conhecimento ou Formação Técnica",
    descricaoCurta: "Trilhas estruturadas conectadas às 4 áreas do conhecimento ou FTP (Lei nº 14.945/2024).",
    corGradiente: "from-purple-600 via-violet-600 to-indigo-700",
    corBgSuave: "bg-purple-50",
    corTexto: "text-purple-700",
    corBorda: "border-purple-200",
    corAnel: "ring-purple-500",
    iconeEmoji: "🧭",
    cargaSugerida: 4,
    exemploNome: "IFA — Robótica, Automação e Cidades Inteligentes",
  },
  {
    codigo: "ELETIVA",
    sigla: "ELETIVA",
    titulo: "Eletiva Orientada",
    subtitulo: "Oficinas Interdisciplinares Semestrais de Livre Escolha",
    descricaoCurta: "Projetos práticos semestrais escolhidos pelos estudantes conforme interesses e aptidões.",
    corGradiente: "from-blue-600 via-sky-600 to-cyan-700",
    corBgSuave: "bg-sky-50",
    corTexto: "text-sky-700",
    corBorda: "border-sky-200",
    corAnel: "ring-sky-500",
    iconeEmoji: "🎯",
    cargaSugerida: 2,
    exemploNome: "Eletiva — Educação Financeira e Empreendedorismo Jovem",
  },
  {
    codigo: "PCA",
    sigla: "PCA",
    titulo: "PCA — Percurso Comum de Aprofundamento",
    subtitulo: "Projetos Integradores de Contemplação e Pesquisa Aplicada",
    descricaoCurta: "Aprofundamento articulado entre componentes curriculares e resolução de problemas reais.",
    corGradiente: "from-emerald-600 via-teal-600 to-cyan-700",
    corBgSuave: "bg-emerald-50",
    corTexto: "text-emerald-700",
    corBorda: "border-emerald-200",
    corAnel: "ring-emerald-500",
    iconeEmoji: "🌐",
    cargaSugerida: 2,
    exemploNome: "PCA — Biotecnologia, Saúde Coletiva e Meio Ambiente",
  },
  {
    codigo: "PROJETO_VIDA",
    sigla: "PROJ. VIDA",
    titulo: "Projeto de Vida & Protagonismo",
    subtitulo: "Autoconhecimento, Carreira, Cidadania e Planejamento de Futuro",
    descricaoCurta: "Eixo estruturante de orientação acadêmica, socioemocional e mundo do trabalho.",
    corGradiente: "from-amber-500 via-orange-500 to-rose-600",
    corBgSuave: "bg-amber-50",
    corTexto: "text-amber-800",
    corBorda: "border-amber-200",
    corAnel: "ring-amber-500",
    iconeEmoji: "🌱",
    cargaSugerida: 2,
    exemploNome: "Projeto de Vida — Protagonismo Juvenil e Escolhas de Futuro",
  },
  {
    codigo: "PARTE_DIVERSIFICADA",
    sigla: "PD / LEM",
    titulo: "Parte Diversificada (PD1 / PD2 / PD3 / LEM)",
    subtitulo: "Componentes Diversificados da Matriz e Línguas Estrangeiras",
    descricaoCurta: "Organização de PD1, PD2, PD3, Espanhol/LEM e oficinas regionais em turmas específicas.",
    corGradiente: "from-slate-700 via-slate-800 to-indigo-900",
    corBgSuave: "bg-slate-100",
    corTexto: "text-slate-800",
    corBorda: "border-slate-300",
    corAnel: "ring-slate-600",
    iconeEmoji: "🧩",
    cargaSugerida: 2,
    exemploNome: "PD1 — Comunicação, Argumentação e Produção Multimídia",
  },
  {
    codigo: "PROJETO",
    sigla: "CLUBES",
    titulo: "Clubes Juvenis & Projetos Científicos",
    subtitulo: "Iniciação Científica, Olimpíadas, Artes, Cultura e Desporto",
    descricaoCurta: "Núcleos de protagonismo estudantil, feiras científicas, teatro, música e esportes.",
    corGradiente: "from-rose-600 via-pink-600 to-fuchsia-700",
    corBgSuave: "bg-rose-50",
    corTexto: "text-rose-700",
    corBorda: "border-rose-200",
    corAnel: "ring-rose-500",
    iconeEmoji: "🔬",
    cargaSugerida: 2,
    exemploNome: "Clube de Ciências — Olimpíadas de Matemática e Astronomia",
  },
];

const SERIES_OPCOES = ["1ª Série", "2ª Série", "3ª Série"];
const TURNOS_OPCOES = ["Matutino", "Vespertino", "Noturno", "Integral"];

export default function ModalProjetoEnsinoMedio({
  aberto,
  onClose,
  onSalvo,
  categoriaInicial = "ELETIVA",
  anoLetivoPadrao = new Date().getFullYear(),
  semestrePadrao = 1,
  projetoEditando = null,
  catalogoEixos = null,
}) {
  const isEdicao = Boolean(projetoEditando?.id);
  const listaEixos =
    Array.isArray(catalogoEixos) && catalogoEixos.length > 0
      ? catalogoEixos.map(normalizarCardEixoVisual)
      : CATALOGO_CARDS_EM;

  const [categoria, setCategoria] = useState(categoriaInicial);
  const [nome, setNome] = useState("");
  const [abreviatura, setAbreviatura] = useState("");
  const [professorIdealizador, setProfessorIdealizador] = useState("");
  const [turno, setTurno] = useState("Matutino");
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao);
  const [semestre, setSemestre] = useState(semestrePadrao);
  const [series, setSeries] = useState(["1ª Série", "2ª Série", "3ª Série"]);
  const [cargaSemanal, setCargaSemanal] = useState(2);
  const [qtdTurmas, setQtdTurmas] = useState(1);
  const [vagasPorTurma, setVagasPorTurma] = useState(35);
  const [sinopse, setSinopse] = useState("");
  const [inscricaoAberta, setInscricaoAberta] = useState(true);
  const [ativoMobile, setAtivoMobile] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    if (projetoEditando) {
      setCategoria(projetoEditando.categoria || "ELETIVA");
      setNome(projetoEditando.nome || "");
      setAbreviatura(projetoEditando.abreviatura || "");
      setProfessorIdealizador(projetoEditando.professor_idealizador || "");
      setTurno(projetoEditando.turno || "Matutino");
      setAnoLetivo(Number(projetoEditando.ano_letivo || anoLetivoPadrao));
      setSemestre(Number(projetoEditando.semestre ?? 1));
      setSeries(
        Array.isArray(projetoEditando.series) && projetoEditando.series.length > 0
          ? projetoEditando.series
          : ["1ª Série", "2ª Série", "3ª Série"]
      );
      setCargaSemanal(Number(projetoEditando.carga_semanal || 2));
      setQtdTurmas(
        Number(
          projetoEditando.turmas?.length ||
            projetoEditando.qtd_turmas_planejadas ||
            1
        )
      );
      setVagasPorTurma(Number(projetoEditando.vagas_por_turma || 35));
      setSinopse(projetoEditando.sinopse || "");
      setInscricaoAberta(projetoEditando.inscricao_aberta !== false);
      setAtivoMobile(projetoEditando.ativo_mobile !== false);
    } else {
      const card =
        listaEixos.find((c) => c.codigo === categoriaInicial) ||
        listaEixos[0] ||
        CATALOGO_CARDS_EM[1];
      setCategoria(card.codigo);
      setNome("");
      setAbreviatura("");
      setProfessorIdealizador("");
      setTurno("Matutino");
      setAnoLetivo(anoLetivoPadrao);
      setSemestre(semestrePadrao === "TODOS" ? 1 : Number(semestrePadrao ?? 1));
      setSeries(["1ª Série", "2ª Série", "3ª Série"]);
      setCargaSemanal(card.cargaSugerida || 2);
      setQtdTurmas(2);
      setVagasPorTurma(35);
      setSinopse("");
      setInscricaoAberta(true);
      setAtivoMobile(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, projetoEditando, categoriaInicial, anoLetivoPadrao, semestrePadrao]);

  if (!aberto) return null;

  const cardAtual =
    listaEixos.find((c) => c.codigo === categoria) ||
    listaEixos[0] ||
    CATALOGO_CARDS_EM[0];

  const toggleSerie = (serie) => {
    setSeries((prev) => {
      if (prev.includes(serie)) {
        if (prev.length === 1) return prev; // mantém ao menos 1 série
        return prev.filter((s) => s !== serie);
      }
      return [...prev, serie];
    });
  };

  const totalVagasCalculadas =
    Math.max(1, Number(qtdTurmas || 1)) * Math.max(1, Number(vagasPorTurma || 1));

  const minTurmasPermitidas = isEdicao
    ? Math.max(1, projetoEditando?.turmas?.length || 1)
    : 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do projeto / componente.");
      return;
    }
    if (!sinopse.trim()) {
      toast.error("Preencha a sinopse pedagógica para orientar a escolha dos estudantes.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        categoria,
        nome: nome.trim(),
        abreviatura: abreviatura.trim() || undefined,
        professor_idealizador: professorIdealizador.trim() || undefined,
        turno,
        ano_letivo: Number(anoLetivo),
        semestre: Number(semestre),
        series,
        carga_semanal: Number(cargaSemanal),
        qtd_turmas: Number(qtdTurmas),
        vagas_por_turma: Number(vagasPorTurma),
        sinopse: sinopse.trim(),
        inscricao_aberta: inscricaoAberta,
        ativo_mobile: ativoMobile,
      };

      let res;
      if (isEdicao) {
        res = await api.put(`/api/matriculas/projetos/${projetoEditando.id}`, payload);
        toast.success("Projeto atualizado com sucesso!");
      } else {
        res = await api.post("/api/matriculas/projetos", payload);
        toast.success(
          res.data?.message ||
            `Projeto criado com ${qtdTurmas} turma(s) de ${vagasPorTurma} vagas!`
        );
      }

      if (onSalvo) onSalvo(res.data?.projeto);
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Não foi possível salvar o projeto. Verifique os dados informados.";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fadeIn">
        {/* Cabeçalho Premium com Gradiente Dinâmico */}
        <div className={`bg-gradient-to-r ${cardAtual.corGradiente} px-6 py-5 text-white`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/20">
                {cardAtual.iconeEmoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                    {isEdicao ? "Editar Projeto & Turmas" : "Novo Projeto • Ensino Médio"}
                  </span>
                  <span className="text-xs text-white/80 font-medium">
                    Ano Letivo {anoLetivo}
                  </span>
                </div>
                <h2 className="text-xl font-bold mt-1 leading-tight">
                  {cardAtual.titulo}
                </h2>
                <p className="text-xs text-white/85 mt-0.5">
                  {cardAtual.subtitulo}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
              title="Fechar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Seletor rápido de Eixo / Categoria caso queira alternar */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Eixo Curricular do Novo Ensino Médio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {listaEixos.map((item) => {
                const selecionado = item.codigo === categoria;
                return (
                  <button
                    key={item.codigo}
                    type="button"
                    onClick={() => {
                      setCategoria(item.codigo);
                      if (!isEdicao) setCargaSemanal(item.cargaSugerida || 2);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                      selecionado
                        ? `${item.corBgSuave} ${item.corTexto} ${item.corBorda} ring-2 ${item.corAnel}`
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-base">{item.iconeEmoji}</span>
                    <span className="truncate">{item.sigla}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nome do Projeto + Sigla */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome do Projeto / Disciplina <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={120}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={`Ex: ${cardAtual.exemploNome}`}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sigla <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                maxLength={20}
                value={abreviatura}
                onChange={(e) => setAbreviatura(e.target.value.toUpperCase())}
                placeholder="Automática"
                className="w-full px-3.5 py-2.5 text-sm uppercase rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              />
            </div>
          </div>

          {/* Turno, Semestre e Carga Horária */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Turno de Oferta <span className="text-rose-500">*</span>
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
              >
                {TURNOS_OPCOES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Semestre de Escolha <span className="text-rose-500">*</span>
              </label>
              <select
                value={semestre}
                onChange={(e) => setSemestre(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
              >
                <option value={1}>1º Semestre</option>
                <option value={2}>2º Semestre</option>
                <option value={0}>Anual (1º e 2º Semestres)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Carga Semanal (Aulas) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <ClockIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cargaSemanal}
                  onChange={(e) => setCargaSemanal(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Séries Elegíveis + Professor Idealizador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Séries do Ensino Médio Elegíveis
              </label>
              <div className="flex flex-wrap gap-2">
                {SERIES_OPCOES.map((s) => {
                  const ativa = series.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSerie(s)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                        ativa
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <AcademicCapIcon className="w-4 h-4" />
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Professor(a) Proponente / Referência{" "}
                <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                maxLength={120}
                value={professorIdealizador}
                onChange={(e) => setProfessorIdealizador(e.target.value)}
                placeholder="Ex: Prof. Carlos Eduardo / Equipe de Ciências"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          {/* Bloco Destaque: Quantidade de Turmas e Vagas por Turma */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-sky-50/80 border border-indigo-200/80 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserGroupIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Dimensionamento de Turmas e Vagas do Projeto
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantidade de Turmas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={minTurmasPermitidas}
                  max={20}
                  value={qtdTurmas}
                  onChange={(e) => setQtdTurmas(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {isEdicao
                    ? `Atualmente possui ${minTurmasPermitidas} turma(s). Aumente se desejar abrir novas turmas.`
                    : "Cria automaticamente Turma 01, Turma 02... na tabela do projeto."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantidade de Alunos (Vagas) em cada Turma <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={vagasPorTurma}
                  onChange={(e) => setVagasPorTurma(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Limite máximo de matrículas por turma antes de bloquear por lotação.
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-indigo-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-700 flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                Oferta consolidada:{" "}
                <strong className="text-indigo-900">
                  {Math.max(1, Number(qtdTurmas || 1))} turma(s)
                </strong>{" "}
                ×{" "}
                <strong className="text-indigo-900">
                  {Math.max(1, Number(vagasPorTurma || 1))} estudantes
                </strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-extrabold shadow-sm">
                Total: {totalVagasCalculadas} vagas ofertadas
              </span>
            </div>
          </div>

          {/* Sinopse Pedagógica */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sinopse do Projeto (Apresentação para Escolha do Estudante){" "}
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {sinopse.length}/2000 caracteres
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={2000}
              value={sinopse}
              onChange={(e) => setSinopse(e.target.value)}
              placeholder="Apresente a proposta do projeto, metodologias práticas, oficinas previstas e como este percurso contribui para a formação e escolha semestral do estudante do Ensino Médio..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-y"
              required
            />
          </div>

          {/* Toggle Inscrição Aberta + Visibilidade Educa Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition">
              <div>
                <span className="text-sm font-semibold text-slate-800 block">
                  Inscrição aberta aos estudantes
                </span>
                <span className="text-xs text-slate-500">
                  Permite confirmação e troca de turma no semestre.
                </span>
              </div>
              <input
                type="checkbox"
                checked={inscricaoAberta}
                onChange={(e) => setInscricaoAberta(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </label>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-sm font-semibold text-slate-800 block">
                  Exibir no app Educa Mobile
                </span>
                <span className="text-xs text-slate-500">
                  Controla se este projeto aparece no card do aplicativo.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ativoMobile}
                onClick={() => setAtivoMobile((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-extrabold transition cursor-pointer shrink-0 ${
                  ativoMobile
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-200/70 border-slate-300 text-slate-600"
                }`}
              >
                <span>{ativoMobile ? "ON" : "OFF"}</span>
                <span
                  className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                    ativoMobile ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                      ativoMobile ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${cardAtual.corGradiente} hover:opacity-95 shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60`}
            >
              <CheckCircleIcon className="w-5 h-5" />
              {salvando
                ? "Processando..."
                : isEdicao
                ? "Salvar Alterações"
                : `Criar Projeto e ${Math.max(1, Number(qtdTurmas || 1))} Turma(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
