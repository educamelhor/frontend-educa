// src/features/sala-recursos/ImpressaoSalaRecursos.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  PrinterIcon,
  SparklesIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentCheckIcon,
  FunnelIcon,
  XMarkIcon,
  MagnifyingGlassPlusIcon
} from "@heroicons/react/24/outline";

const TIPOS_DOCUMENTO = [
  {
    id: "adequacao_seedf",
    titulo: "Adequação Curricular Padrão SEEDF",
    subtitulo: "Ficha oficial da SEEDF com grade de 4 colunas preenchida por disciplina e bimestre",
    icone: SparklesIcon,
    corBadge: "bg-blue-100 text-blue-800 border-blue-200",
    requerAluno: true,
    requerDisciplina: true,
  },
  {
    id: "adequacao_seedf_branco",
    titulo: "Ficha de Adequação SEEDF em Branco",
    subtitulo: "Modelo padrão da SEEDF com linhas pautadas para preenchimento manual pelos professores regentes",
    icone: DocumentDuplicateIcon,
    corBadge: "bg-amber-100 text-amber-800 border-amber-200",
    requerAluno: false,
    requerDisciplina: false,
  },
  {
    id: "prontuario_aee",
    titulo: "Prontuário Integrado do Estudante AEE",
    subtitulo: "Relatório 360° com histórico de laudos médicos, CIDs, configuração AEE e adequações",
    icone: DocumentTextIcon,
    corBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    requerAluno: true,
    requerDisciplina: false,
  },
];

const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre", "Anual"];

export default function ImpressaoSalaRecursos() {
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const [anoLetivo, setAnoLetivo] = useState(() => {
    const saved = localStorage.getItem("ano_letivo");
    return saved ? Number(saved) : currentYear;
  });

  const [tipoDocSelecionado, setTipoDocSelecionado] = useState("adequacao_seedf");

  // Filtros de seleção de aluno
  const [turnoSelecionado, setTurnoSelecionado] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");

  // Dados carregados
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  // Parâmetros do documento
  const [bimestre, setBimestre] = useState("1º Bimestre");
  const [disciplina, setDisciplina] = useState("");
  const [professorRegente, setProfessorRegente] = useState("");
  const [adequacoesAluno, setAdequacoesAluno] = useState([]);

  // Modal de Foto Zoom
  const [fotoZoom, setFotoZoom] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setFotoZoom(null);
    };
    if (fotoZoom) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fotoZoom]);

  // Carrega turmas do ano letivo
  const carregarTurmas = async (ano = anoLetivo) => {
    try {
      const res = await api.get("/api/turmas", { params: { ano } });
      const list = res.data?.turmas || res.data || [];
      setTurmas(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);
    }
  };

  // Carrega alunos AEE
  const carregarAlunos = async () => {
    setLoadingAlunos(true);
    try {
      const params = new URLSearchParams();
      if (anoLetivo) params.append("ano_letivo", anoLetivo);
      if (turnoSelecionado) params.append("turno", turnoSelecionado);
      if (turmaSelecionada) params.append("turma_id", turmaSelecionada);
      if (filtroTexto) params.append("filtro", filtroTexto);
      params.append("apenas_aee", "1");

      const res = await api.get(`/api/sala-recursos/alunos?${params.toString()}`);
      const list = res.data?.alunos || [];
      setAlunos(list);

      // Se havia aluno selecionado, sincroniza
      if (alunoSelecionado) {
        const found = list.find((a) => a.id === alunoSelecionado.id);
        if (found) setAlunoSelecionado(found);
      }
    } catch (err) {
      console.error("Erro ao listar alunos:", err);
    } finally {
      setLoadingAlunos(false);
    }
  };

  // Carrega adequações do aluno selecionado
  const carregarAdequacoesAluno = async (alunoId) => {
    if (!alunoId) {
      setAdequacoesAluno([]);
      return;
    }
    try {
      const res = await api.get(`/api/sala-recursos/alunos/${alunoId}`);
      const adeqs = res.data?.adequacoes || [];
      setAdequacoesAluno(adeqs);
      if (adeqs.length > 0 && !disciplina) {
        setDisciplina(adeqs[0].disciplina || "");
        setBimestre(adeqs[0].bimestre || "1º Bimestre");
        setProfessorRegente(adeqs[0].professor_regente || "");
      }
    } catch (err) {
      console.error("Erro ao carregar adequações do aluno:", err);
    }
  };

  useEffect(() => {
    carregarTurmas(anoLetivo);
  }, [anoLetivo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarAlunos();
    }, 200);
    return () => clearTimeout(timer);
  }, [anoLetivo, turnoSelecionado, turmaSelecionada, filtroTexto]);

  useEffect(() => {
    if (alunoSelecionado?.id) {
      carregarAdequacoesAluno(alunoSelecionado.id);
    } else {
      setAdequacoesAluno([]);
    }
  }, [alunoSelecionado?.id, anoLetivo]);

  const handleImprimir = (opcao = {}) => {
    const token = localStorage.getItem("token");
    const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");

    let url = "";

    if (tipoDocSelecionado === "adequacao_seedf_branco" || opcao.emBranco) {
      // Ficha em branco (pode incluir cabeçalho do aluno ou ser 100% genérica)
      const params = new URLSearchParams({
        token,
        em_branco: "1",
        ano_letivo: String(anoLetivo),
        bimestre: opcao.bimestre || bimestre || "1°, 2°, 3° E 4° BIMESTRES",
        disciplina: opcao.disciplina || disciplina || "",
      });
      if (alunoSelecionado?.id) {
        params.append("aluno_id", String(alunoSelecionado.id));
      }
      url = `${apiBase}/api/sala-recursos/pdf/adequacao-seedf?${params.toString()}`;
    } else if (tipoDocSelecionado === "prontuario_aee") {
      if (!alunoSelecionado?.id) {
        alert("Por favor, selecione um estudante para gerar o prontuário.");
        return;
      }
      url = `${apiBase}/api/sala-recursos/pdf/prontuario/${alunoSelecionado.id}?token=${token}&ano_letivo=${anoLetivo}`;
    } else {
      // Adequação SEEDF Preenchida
      if (!alunoSelecionado?.id && !opcao.adequacaoId) {
        alert("Por favor, selecione um estudante para gerar a adequação curricular.");
        return;
      }

      const params = new URLSearchParams({
        token,
        ano_letivo: String(anoLetivo),
        bimestre: opcao.bimestre || bimestre || "1º Bimestre",
        disciplina: opcao.disciplina || disciplina || "",
        professor_regente: opcao.professorRegente || professorRegente || "",
      });

      if (opcao.adequacaoId) {
        params.append("adequacao_id", String(opcao.adequacaoId));
      } else if (alunoSelecionado?.id) {
        params.append("aluno_id", String(alunoSelecionado.id));
      }

      url = `${apiBase}/api/sala-recursos/pdf/adequacao-seedf?${params.toString()}`;
    }

    window.open(url, "_blank");
  };

  const formatDate = (val) => {
    if (!val) return "—";
    try {
      const s = String(val).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
      }
      return new Date(val).toLocaleDateString("pt-BR");
    } catch {
      return "—";
    }
  };

  const turmasFiltradas = turmas.filter(
    (t) => !turnoSelecionado || String(t.turno || "").toLowerCase() === turnoSelecionado.toLowerCase()
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/sala-recursos")}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Voltar ao Painel"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <PrinterIcon className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Central de Impressão — Sala de Recursos (AEE)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Emissão oficial de fichas padronizadas da SEEDF, adequações curriculares e prontuários
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleImprimir({ emBranco: true })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition-colors shadow-sm"
          >
            <DocumentDuplicateIcon className="w-4 h-4 text-amber-700" />
            Imprimir Ficha SEEDF em Branco
          </button>
        </div>
      </div>

      {/* Passo 1: Seleção do Tipo de Documento */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-black flex items-center justify-center">1</span>
            Selecione o Tipo de Documento Oficial
          </h2>
          <span className="text-xs text-slate-500">Padrão Secretaria de Estado de Educação do DF (SEEDF)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIPOS_DOCUMENTO.map((doc) => {
            const Icone = doc.icone;
            const isSelected = tipoDocSelecionado === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => setTipoDocSelecionado(doc.id)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-600 shadow-md ring-2 ring-blue-500/20"
                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    isSelected ? "bg-blue-700 text-white shadow-md shadow-blue-600/30" : "bg-slate-100 text-slate-700"
                  }`}>
                    <Icone className="w-6 h-6" />
                  </div>
                  {isSelected && (
                    <CheckCircleIcon className="w-6 h-6 text-blue-700" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {doc.titulo}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {doc.subtitulo}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className={`px-2 py-0.5 rounded-md font-bold border ${doc.corBadge}`}>
                    {doc.requerAluno ? "Requer Aluno" : "Modelo Geral / Avulso"}
                  </span>
                  <span className="text-blue-700 font-bold flex items-center gap-1">
                    Selecionar →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Passo 2: Filtros e Seleção do Estudante */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-black flex items-center justify-center">2</span>
            Filtros e Seleção do Estudante
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {alunos.length} estudante(s) AEE localizado(s)
          </span>
        </div>

        {/* Barra de Filtros Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Ano Letivo */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Ano Letivo</label>
            <select
              value={anoLetivo}
              onChange={(e) => {
                setAnoLetivo(Number(e.target.value));
                setTurmaSelecionada("");
                setAlunoSelecionado(null);
              }}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-bold text-blue-900"
            >
              <option value={2026}>2026 (Ano Atual)</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* Turno */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Turno</label>
            <select
              value={turnoSelecionado}
              onChange={(e) => {
                setTurnoSelecionado(e.target.value);
                setTurmaSelecionada("");
              }}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
            >
              <option value="">Todos os Turnos</option>
              <option value="Matutino">Matutino</option>
              <option value="Vespertino">Vespertino</option>
              <option value="Noturno">Noturno</option>
              <option value="Integral">Integral</option>
            </select>
          </div>

          {/* Turma */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Turma</label>
            <select
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="w-full text-sm py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
            >
              <option value="">Todas as Turmas</option>
              {turmasFiltradas.map((t) => {
                const nomeTurma = t.turma || t.nome || t.nome_oficial || t.serie || `Turma ${t.id}`;
                return (
                  <option key={t.id} value={t.id}>
                    {nomeTurma} {t.turno ? `(${t.turno})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Busca Textual */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Buscar por Nome / Cód / CID</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Nome, matrícula..."
                className="w-full text-sm pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Lista de Seleção de Estudantes */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Selecione o Estudante da Sala de Recursos:
          </label>

          {loadingAlunos ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Carregando estudantes...</p>
            </div>
          ) : alunos.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
              Nenhum estudante localizado com os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
              {alunos.map((al) => {
                const isSelected = alunoSelecionado?.id === al.id;
                return (
                  <div
                    key={al.id}
                    onClick={() => setAlunoSelecionado(al)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected
                        ? "bg-blue-50/90 border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                        : "bg-slate-50/60 border-slate-200 hover:border-blue-300 hover:bg-white"
                    }`}
                  >
                    {/* Foto com Zoom */}
                    <div
                      onClick={(e) => {
                        if (al.foto) {
                          e.stopPropagation();
                          setFotoZoom(al);
                        }
                      }}
                      className={`w-11 h-11 rounded-xl bg-white text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200 relative select-none ${
                        al.foto ? "cursor-pointer hover:ring-2 hover:ring-blue-500 group overflow-hidden" : ""
                      }`}
                      title={al.foto ? "Clique para ampliar" : al.estudante}
                    >
                      {al.foto ? (
                        <>
                          <img src={al.foto} alt={al.estudante} className="w-full h-full rounded-xl object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                            <MagnifyingGlassPlusIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                        </>
                      ) : (
                        al.estudante?.charAt(0) || "?"
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {al.estudante}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {al.turma_nome || "—"} ({al.turma_turno || "—"}) • Cód: {al.codigo || "—"}
                      </div>
                      {al.laudos && al.laudos.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {al.laudos.slice(0, 2).map((l, i) => (
                            <span key={i} className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[10px] font-bold rounded">
                              CID {l.cid || "—"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <CheckCircleIcon className="w-5 h-5 text-blue-700 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Parâmetros Específicos para Adequações Curriculares SEEDF */}
        {tipoDocSelecionado === "adequacao_seedf" && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Parâmetros da Adequação Curricular:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Período de Vigência / Bimestre</label>
                <select
                  value={bimestre}
                  onChange={(e) => setBimestre(e.target.value)}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
                >
                  {BIMESTRES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="1°, 2°, 3° E 4° BIMESTRES">1°, 2°, 3° E 4° BIMESTRES</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Componente Curricular / Disciplina</label>
                <input
                  type="text"
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Ex: Língua Portuguesa, Matemática..."
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Professor(a) Regente Responsável</label>
                <input
                  type="text"
                  value={professorRegente}
                  onChange={(e) => setProfessorRegente(e.target.value)}
                  placeholder="Nome do docente..."
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Atalhos para Adequações Já Cadastradas deste Aluno */}
            {adequacoesAluno.length > 0 && (
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-2">
                <span className="text-xs font-bold text-blue-900 block">
                  Adequações já registradas no sistema para {alunoSelecionado?.estudante}:
                </span>
                <div className="flex flex-wrap gap-2">
                  {adequacoesAluno.map((ad) => (
                    <button
                      key={ad.id}
                      onClick={() => handleImprimir({ adequacaoId: ad.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-300 shadow-sm transition-colors"
                    >
                      <PrinterIcon className="w-3.5 h-3.5 text-blue-700" />
                      {ad.bimestre} — {ad.disciplina} (Imprimir)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão de Ação Principal */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-amber-300" />
            Pronto para Emissão do Documento Oficial
          </h3>
          <p className="text-xs text-blue-200 mt-1">
            {alunoSelecionado
              ? `Documento configurado para: ${alunoSelecionado.estudante} • Ano Letivo ${anoLetivo}`
              : "Modelo selecionado para emissão • Padrão SEEDF"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleImprimir({ emBranco: true })}
            className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors"
          >
            📄 Imprimir Modelo em Branco
          </button>

          <button
            onClick={() => handleImprimir()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
          >
            <PrinterIcon className="w-5 h-5" />
            Gerar Documento PDF Oficial
          </button>
        </div>
      </div>

      {/* Modal de Zoom da Foto do Estudante */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setFotoZoom(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white leading-tight">
                  {fotoZoom.estudante}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cód: {fotoZoom.codigo || "—"} • Turma: {fotoZoom.turma_nome || "—"} ({fotoZoom.turma_turno || "—"})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFotoZoom(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Fechar (Esc)"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="w-full flex justify-center py-2">
              <img
                src={fotoZoom.foto}
                alt={fotoZoom.estudante}
                className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain border-2 border-slate-700 shadow-2xl bg-black"
              />
            </div>

            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <SparklesIcon className="w-4 h-4" /> Aluno Sala de Recursos (AEE)
              </span>
              <span>Clique fora ou no ✕ para fechar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
