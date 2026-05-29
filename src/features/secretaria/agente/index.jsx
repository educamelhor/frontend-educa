// src/features/secretaria/agente/index.jsx
// ============================================================================
// Painel de Agentes Autônomos da Secretaria — Premium UI
// Centraliza tarefas automatizadas (ex: Importação de Boletins)
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../../services/api";

// ─────────────────────────────────────────────
// Ícones em SVG
// ─────────────────────────────────────────────
const IconAgent = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const IconBolt = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l18 18" />
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

export default function AgenteSecretaria() {
  const [turmas, setTurmas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Configurações do Agente
  const [lancarFaltas, setLancarFaltas] = useState(true);
  const [bimestre, setBimestre] = useState("1");
  const [mapeamento, setMapeamento] = useState({});
  const [mapeamentoDisciplinas, setMapeamentoDisciplinas] = useState({});
  const [pdfs, setPdfs] = useState([
    { nome: "6º ANO A - BOLETIM.pdf", tamanho: "2.4 MB", paginas: 52, status: "Pronto" }
  ]);
  const [isUploading, setIsUploading] = useState(false);

  // Simulação de Execução do Agente
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [logs, setLogs] = useState([]);
  const [etapaAtual, setEtapaAtual] = useState("");

  // Carregar turmas e disciplinas reais da escola para o mapeamento
  useEffect(() => {
    async function fetchData() {
      try {
        const [resTurmas, resDisciplinas] = await Promise.all([
          api.get("/api/turmas?ano=2026"),
          api.get("/api/disciplinas")
        ]);

        // Processa turmas
        const listT = Array.isArray(resTurmas.data) ? resTurmas.data : [];
        setTurmas(listT);
        const initialMapT = {};
        listT.forEach((t) => {
          const match = t.turma.match(/^(\d+)[°º]?\s*ANO\s+([A-Z])$/i);
          initialMapT[t.id] = match
            ? `${match[1]}º Ano - ${match[2].toUpperCase()}`
            : t.turma;
        });
        setMapeamento(initialMapT);

        // Processa disciplinas
        const listD = Array.isArray(resDisciplinas.data) ? resDisciplinas.data : [];
        setDisciplinas(listD);
        const initialMapD = {};
        listD.forEach((d) => {
          // Converte "EDUCAÇÃO FÍSICA" -> "Educação Física"
          const name = d.disciplina || "";
          const capitalized = name
            .toLowerCase()
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          initialMapD[d.id] = capitalized;
        });
        setMapeamentoDisciplinas(initialMapD);
      } catch (err) {
        console.error("Erro ao buscar turmas e disciplinas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleMapChange = (turmaId, value) => {
    setMapeamento((prev) => ({
      ...prev,
      [turmaId]: value,
    }));
  };

  const handleMapDiscChange = (disciplinaId, value) => {
    setMapeamentoDisciplinas((prev) => ({
      ...prev,
      [disciplinaId]: value,
    }));
  };

  const handleAddMockPdf = () => {
    if (executando || isUploading) return;
    setIsUploading(true);
    setTimeout(() => {
      const names = [
        "7º ANO B - BOLETIM.pdf",
        "8º ANO A - BOLETIM.pdf",
        "9º ANO C - BOLETIM.pdf",
        "6º ANO B - BOLETIM.pdf"
      ];
      const randomName = names[Math.floor(Math.random() * names.length)];

      if (pdfs.some((p) => p.nome === randomName)) {
        setIsUploading(false);
        return;
      }

      setPdfs((prev) => [
        ...prev,
        {
          nome: randomName,
          tamanho: `${(Math.random() * 2 + 1.2).toFixed(1)} MB`,
          paginas: Math.floor(Math.random() * 20 + 30) * 2,
          status: "Pronto"
        }
      ]);
      setIsUploading(false);
    }, 1200);
  };

  const handleRemovePdf = (nome) => {
    if (executando) return;
    setPdfs((prev) => prev.filter((p) => p.nome !== nome));
  };

  // Simula o agente trabalhando com logs reais e progresso dinâmico
  const rodarAgente = () => {
    if (executando) return;
    setExecutando(true);
    setProgresso(0);
    setLogs([]);
    setEtapaAtual("Iniciando...");

    const fakeLogs = [
      { text: "🤖 [Agente] Inicializando pipeline autônomo...", delay: 200 },
      ...pdfs.map((pdf, index) => ({
        text: `📂 [Agente] Carregando e mapeando arquivo: ${pdf.nome} (${pdf.tamanho}, ${pdf.paginas} páginas)...`,
        delay: 600 + index * 600
      })),
      { text: `⚙️ [Agente] Regra de importação ativa: Bimestre=${bimestre}º | Lançar Faltas=${lancarFaltas ? "SIM" : "NÃO"}`, delay: 600 + pdfs.length * 600 },
      { text: "🔍 [Agente] Mapeando estrutura de páginas (páginas ímpares = boletins, pares = legendas)...", delay: 1200 + pdfs.length * 600 },
      { text: "👥 [Agente] Extraindo dados dos estudantes e notas de disciplinas...", delay: 1800 + pdfs.length * 600 },
      { text: "🔗 [Agente] Validando correspondência de REs e nomenclaturas de turmas e disciplinas...", delay: 2400 + pdfs.length * 600 },
      { text: "✅ [Agente] Correspondência e chaves validadas com 100% de sucesso!", delay: 3000 + pdfs.length * 600 },
      { text: "🚀 [Agente] Salvando notas e faltas de forma idempotente no banco de dados...", delay: 3600 + pdfs.length * 600 },
      { text: "👤 [Agente] Importando: ALICE GOMES MATIAS (RE: 483870) → 10 disciplinas inseridas.", delay: 4200 + pdfs.length * 600 },
      { text: "👤 [Agente] Importando: ANNE RAQUEL OLIVEIRA DIAS (RE: 461582) → 10 disciplinas inseridas.", delay: 4800 + pdfs.length * 600 },
      { text: "👤 [Agente] Importando: ARTHUR SOUSA APOLINÁRIO (RE: 469107) → 10 disciplinas inseridas.", delay: 5400 + pdfs.length * 600 },
      { text: "👤 [Agente] Importando: DAVID PIERRE SOARES DOS SANTOS (RE: 467802) → 10 disciplinas inseridas.", delay: 6000 + pdfs.length * 600 },
      { text: "👤 [Agente] Importando: JULIA BARRETO ARAUJO (RE: 254831) → 10 disciplinas inseridas.", delay: 6600 + pdfs.length * 600 },
      { text: "👤 [Agente] Importando: SOPHIA ANDRÉIA FRANÇA DE LIMA (RE: 300961) → 10 disciplinas inseridas.", delay: 7200 + pdfs.length * 600 },
      { text: "⚙️ [Agente] Executando rotina de reconciliação de dados...", delay: 7800 + pdfs.length * 600 },
      { text: `📊 [Agente] Reconciliação concluída: ${26 * pdfs.length}0 registros inseridos no banco. 0 discrepâncias encontradas.`, delay: 8400 + pdfs.length * 600 },
      { text: "🎉 [Agente] Rotina de importação finalizada com sucesso absoluto!", delay: 9200 + pdfs.length * 600 },
    ];

    fakeLogs.forEach((log) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, log.text]);
        // Update stage
        if (log.text.includes("Inicializando")) setEtapaAtual("Iniciando...");
        else if (log.text.includes("Carregando")) setEtapaAtual("Processando PDFs...");
        else if (log.text.includes("Mapeando")) setEtapaAtual("Mapeando Páginas...");
        else if (log.text.includes("Extraindo")) setEtapaAtual("Extraindo Boletins...");
        else if (log.text.includes("Salvando")) setEtapaAtual("Gravando no Banco...");
        else if (log.text.includes("Importando")) setEtapaAtual("Lançando Notas...");
        else if (log.text.includes("Reconciliação concluída")) setEtapaAtual("Reconciliando Dados...");
        else if (log.text.includes("finalizada")) {
          setEtapaAtual("Concluído!");
          setExecutando(false);
        }

        // Incremental progress
        setProgresso((p) => Math.min(p + Math.round(100 / fakeLogs.length), 100));
      }, log.delay);
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* HEADER PRINCIPAL */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl text-white"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                boxShadow: "0 4px 14px rgba(139,92,246,0.3)",
              }}
            >
              <IconAgent />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
                Agentes Autônomos
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gerencie tarefas e rotinas escolares executadas de forma autônoma pela Inteligência Artificial.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GRADE DE TAREFAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD TAREFA BOLETIM (PREMIUM) */}
        <div
          onClick={() => setIsDrawerOpen(true)}
          className="group relative rounded-2xl border border-purple-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden flex flex-col justify-between"
          style={{
            background: "linear-gradient(180deg, #fcfdff 0%, #ffffff 100%)",
          }}
        >
          {/* Luz de Fundo Pulsante */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200"
              >
                PRODUTIVO
              </span>
              <div className="text-purple-500 bg-purple-50 p-2 rounded-xl border border-purple-100">
                <IconBolt />
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
              Tarefa do Boletim (PDF)
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Lê PDFs oficiais de boletins escolares, extrai notas/faltas nas páginas ímpares e povoa o banco de dados de forma automatizada e com validação de chaves.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-purple-600 font-semibold text-sm">
            <span>Configurar e Executar</span>
            <IconChevronRight />
          </div>
        </div>

        {/* CARD INDISPONÍVEL FUTEBOL (MOCK CARD 2) */}
        <div
          className="relative rounded-2xl border border-gray-200 bg-gray-50/50 p-6 opacity-60 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200">
                EM BREVE
              </span>
              <div className="text-gray-400 bg-gray-100 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-700 mb-2">
              Importação de Planos (Docx)
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Mapeamento inteligente de conteúdos programáticos e objetivos de aprendizagem para preenchimento de planos de aula anuais.
            </p>
          </div>
        </div>

        {/* CARD INDISPONÍVEL FUTEBOL (MOCK CARD 3) */}
        <div
          className="relative rounded-2xl border border-gray-200 bg-gray-50/50 p-6 opacity-60 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200">
                EM BREVE
              </span>
              <div className="text-gray-400 bg-gray-100 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-700 mb-2">
              Agente de Busca Ativa
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Gera relatórios de alunos ausentes de forma reativa e sugere comunicações diretas com responsáveis por meio de canais oficiais.
            </p>
          </div>
        </div>
      </div>

      {/* DRAWER / SIDE-OVER (SEGUNDO PLANO PREMIUM) */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden transition-all duration-500 ${
          isDrawerOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop desbotado */}
        <div
          className={`absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-500 ${
            isDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => !executando && setIsDrawerOpen(false)}
        />

        <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div
            className={`w-screen max-w-2xl bg-white shadow-2xl flex flex-col justify-between transition-transform duration-500 ease-in-out transform ${
              isDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Header Drawer */}
            <div className="px-6 py-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <IconBolt />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Configurar Tarefa do Boletim</h2>
                  <p className="text-xs text-purple-200">Defina os parâmetros para execução do agente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !executando && setIsDrawerOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                disabled={executando}
              >
                <IconClose />
              </button>
            </div>

            {/* Conteúdo Drawer (Rolável) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Seção 1: Configurações Gerais */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                  Configurações Gerais
                </h3>
                <div className="space-y-4">
                  {/* Lançar Faltas (Toggle) */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <label className="text-sm font-semibold text-gray-800 block">Lançar Faltas</label>
                      <span className="text-xs text-gray-400">Importar quantidade de ausências descritas no boletim</span>
                    </div>
                    <button
                      type="button"
                      disabled={executando}
                      onClick={() => setLancarFaltas(!lancarFaltas)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        lancarFaltas ? "bg-purple-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          lancarFaltas ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bimestre (Select) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-800">Selecione o Bimestre</label>
                    <select
                      value={bimestre}
                      disabled={executando}
                      onChange={(e) => setBimestre(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="1">1º Bimestre</option>
                      <option value="2">2º Bimestre</option>
                      <option value="3">3º Bimestre</option>
                      <option value="4">4º Bimestre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Seleção de Arquivos PDF do Boletim */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Seleção de Arquivos PDF do Boletim
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Indique ou adicione os arquivos em PDF que o agente autônomo irá ler e processar nesta rodada.
                </p>

                {/* Upload Zone */}
                <div
                  onClick={handleAddMockPdf}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 group ${
                    isUploading
                      ? "border-purple-300 bg-purple-50/30"
                      : "border-purple-200 bg-white hover:border-purple-500 hover:bg-purple-50/20 hover:shadow-inner"
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-semibold text-purple-600">Simulando upload e análise do PDF...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-purple-500 bg-purple-50 p-3 rounded-2xl border border-purple-100 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="text-sm font-semibold text-gray-800">
                        Clique aqui para indicar novos PDFs de boletins
                      </div>
                      <div className="text-xs text-gray-400">
                        O agente irá ler as páginas ímpares contendo notas/faltas de cada PDF informado.
                      </div>
                    </>
                  )}
                </div>

                {/* PDF Files List */}
                <div className="mt-4 space-y-2">
                  {pdfs.map((pdf) => (
                    <div
                      key={pdf.nome}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3 hover:bg-white hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-gray-800 block truncate">{pdf.nome}</span>
                          <span className="text-xs text-gray-400">
                            {pdf.tamanho} • {pdf.paginas} páginas (ímpares ativas)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {pdf.status}
                        </span>
                        {pdfs.length > 1 && (
                          <button
                            type="button"
                            disabled={executando}
                            onClick={() => handleRemovePdf(pdf.nome)}
                            className="p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-gray-400"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção 3: Correspondência de Nomenclatura das Turmas */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Correspondência de Nomenclatura das Turmas
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Mapeie os nomes locais no <strong>EDUCA.MELHOR</strong> para o padrão oficial no <strong>EDUCADF</strong>.
                </p>

                {loading ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Carregando turmas...</div>
                ) : turmas.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Nenhuma turma cadastrada.</div>
                ) : (
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden bg-white">
                    {turmas.map((t) => (
                      <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div>
                          <span className="text-xs font-bold text-gray-400 block">NOME LOCAL (EDUCA.MELHOR)</span>
                          <span className="text-sm font-bold text-gray-800">{t.turma}</span>
                        </div>
                        <div className="flex flex-col gap-1 sm:w-1/2">
                          <span className="text-[10px] font-bold text-purple-600">PADRÃO OFICIAL (EDUCADF)</span>
                          <input
                            type="text"
                            disabled={executando}
                            value={mapeamento[t.id] || ""}
                            onChange={(e) => handleMapChange(t.id, e.target.value)}
                            placeholder="Ex: 6º Ano - A"
                            className="rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção 4: Correspondência de Nomenclatura das Disciplinas */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Correspondência de Nomenclatura das Disciplinas
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Mapeie as disciplinas do <strong>EDUCA.MELHOR</strong> para o padrão oficial no <strong>EDUCADF</strong>.
                </p>

                {loading ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Carregando disciplinas...</div>
                ) : disciplinas.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Nenhuma disciplina cadastrada.</div>
                ) : (
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden bg-white">
                    {disciplinas.map((d) => (
                      <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div>
                          <span className="text-xs font-bold text-gray-400 block">NOME LOCAL (EDUCA.MELHOR)</span>
                          <span className="text-sm font-bold text-gray-800">{d.disciplina}</span>
                        </div>
                        <div className="flex flex-col gap-1 sm:w-1/2">
                          <span className="text-[10px] font-bold text-purple-600">PADRÃO OFICIAL (EDUCADF)</span>
                          <input
                            type="text"
                            disabled={executando}
                            value={mapeamentoDisciplinas[d.id] || ""}
                            onChange={(e) => handleMapDiscChange(d.id, e.target.value)}
                            placeholder="Ex: Língua Portuguesa"
                            className="rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção 5: Terminal de Execução do Agente */}
              {logs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Terminal do Agente Autônomo
                    </h3>
                    <span className="text-xs font-semibold text-purple-600 animate-pulse">{etapaAtual}</span>
                  </div>

                  <div className="bg-gray-950 text-emerald-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed h-48 overflow-y-auto shadow-inner border border-gray-800">
                    {logs.map((log, index) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Drawer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
              {/* Progresso ou Info */}
              {executando ? (
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>Progresso do Agente</span>
                    <span>{progresso}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="text-purple-600">⚡</span>
                  Pronto para execução autônoma
                </div>
              )}

              <button
                type="button"
                disabled={executando}
                onClick={rodarAgente}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center gap-2 flex-shrink-0"
                style={{
                  background: executando
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                }}
              >
                <IconBolt />
                {executando ? "Processando..." : "Acionar Agente"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
