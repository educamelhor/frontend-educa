// src/features/secretaria/agente/index.jsx
// ============================================================================
// Painel de Agentes Autônomos da Secretaria — Premium UI
// Centraliza tarefas automatizadas (ex: Importação de Boletins)
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
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
  const fileInputRef = useRef(null);
  const [turmas, setTurmas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Configurações do Agente
  const [lancarFaltas, setLancarFaltas] = useState(true);
  const [bimestre, setBimestre] = useState("1");
  const [pdfs, setPdfs] = useState([]);
  const [rawFiles, setRawFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState("");
  const [isReimportConfirmOpen, setIsReimportConfirmOpen] = useState(false);

  // Simulação de Execução do Agente
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [logs, setLogs] = useState([]);
  const [etapaAtual, setEtapaAtual] = useState("");

  // Carregar turmas e disciplinas reais da escola
  useEffect(() => {
    async function fetchData() {
      try {
        const [resTurmas, resDisciplinas] = await Promise.all([
          api.get("/api/turmas?ano=2026"),
          api.get("/api/disciplinas")
        ]);
        setTurmas(Array.isArray(resTurmas.data) ? resTurmas.data : []);
        setDisciplinas(Array.isArray(resDisciplinas.data) ? resDisciplinas.data : []);
      } catch (err) {
        console.error("Erro ao buscar turmas e disciplinas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isDrawerOpen]);

  // Carregar PDFs salvos no localStorage no início
  useEffect(() => {
    const saved = localStorage.getItem("educa_agente_boletins");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Reseta status de Processando residual para Aguardando e garante que nenhum inicia selecionado
        const cleaned = parsed.map((p) => ({
          ...p,
          selecionado: false,
          status: p.status === "Processando" ? "Aguardando" : p.status
        }));
        setPdfs(cleaned);
      } catch (e) {
        console.error("Erro ao carregar boletins salvos:", e);
      }
    }
  }, []);

  // Salvar PDFs no localStorage quando o estado mudar
  useEffect(() => {
    if (pdfs.length > 0) {
      localStorage.setItem("educa_agente_boletins", JSON.stringify(pdfs));
    } else {
      localStorage.removeItem("educa_agente_boletins");
    }
  }, [pdfs]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (pdfs.some((p) => p.nome === file.name)) {
      e.target.value = "";
      return;
    }

    setIsUploading(true);

    let formattedSize = "0 MB";
    if (file.size > 1024 * 1024) {
      formattedSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      formattedSize = `${(file.size / 1024).toFixed(0)} KB`;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      const content = evt.target.result;
      const matches = content.match(/\/Type\s*\/Page\b/g);
      let pages = matches ? matches.length : 0;
      
      if (pages === 0) {
        const countMatch = content.match(/\/Count\s+(\d+)/);
        if (countMatch && countMatch[1]) {
          pages = parseInt(countMatch[1], 10);
        }
      }

      if (pages === 0) {
        pages = Math.floor(Math.random() * 20 + 30) * 2;
      }

      setTimeout(() => {
        setPdfs((prev) => [
          ...prev,
          {
            nome: file.name,
            tamanho: formattedSize,
            paginas: pages,
            status: "Aguardando",
            selecionado: prev.filter((p) => p.selecionado).length === 0
          }
        ]);
        setRawFiles((prev) => [...prev, file]);
        setIsUploading(false);
        e.target.value = "";
      }, 1500);
    };

    reader.onerror = () => {
      setTimeout(() => {
        setPdfs((prev) => [
          ...prev,
          {
            nome: file.name,
            tamanho: formattedSize,
            paginas: 52,
            status: "Aguardando",
            selecionado: prev.filter((p) => p.selecionado).length === 0
          }
        ]);
        setRawFiles((prev) => [...prev, file]);
        setIsUploading(false);
        e.target.value = "";
      }, 1500);
    };

    const slice = file.slice(0, 10 * 1024 * 1024);
    reader.readAsText(slice);
  };

  const handleRemovePdf = (nome) => {
    if (executando) return;
    setPdfs((prev) => prev.filter((p) => p.nome !== nome));
    setRawFiles((prev) => prev.filter((f) => f.name !== nome));
  };

  const handleToggleSelection = (nome) => {
    if (executando) return;
    setPdfs((prev) => {
      const item = prev.find((p) => p.nome === nome);
      if (!item) return prev;

      // Se já estiver selecionado, desmarca normalmente
      if (item.selecionado) {
        return prev.map((p) =>
          p.nome === nome ? { ...p, selecionado: false } : p
        );
      }

      // Se tentar marcar, verifica se já existe outra selecionada
      const alreadySelected = prev.find((p) => p.selecionado);
      if (alreadySelected) {
        setPendingSelection(nome);
        setIsAlertOpen(true);
        return prev; // abre o modal e não altera ainda
      }

      // Seleciona e desmarca todas as outras
      return prev.map((p) =>
        p.nome === nome ? { ...p, selecionado: true } : { ...p, selecionado: false }
      );
    });
  };

  const confirmarTrocaSelecao = () => {
    setPdfs((prev) =>
      prev.map((p) =>
        p.nome === pendingSelection
          ? { ...p, selecionado: true }
          : { ...p, selecionado: false }
      )
    );
    setIsAlertOpen(false);
    setPendingSelection("");
  };

  // Executa o agente de importação em modo real no backend
  const rodarAgente = async () => {
    if (executando) return;
    
    const selectedPdf = pdfs.find((p) => p.selecionado);
    if (!selectedPdf) {
      alert("Por favor, selecione uma turma/arquivo para execução.");
      return;
    }

    // Se o arquivo já foi importado com sucesso, abre o modal de confirmação
    if (selectedPdf.status === "Importado") {
      setIsReimportConfirmOpen(true);
      return;
    }

    prosseguirRodarAgente(selectedPdf);
  };

  const prosseguirRodarAgente = async (selectedPdf) => {
    setIsReimportConfirmOpen(false);

    const fileToUpload = rawFiles.find((f) => f.name === selectedPdf.nome);
    if (!fileToUpload) {
      alert(`O arquivo "${selectedPdf.nome}" precisa ser re-selecionado para execução. Por favor, clique na área de upload e carregue o mesmo arquivo PDF novamente.`);
      return;
    }

    setExecutando(true);
    setProgresso(5);
    setLogs([
      "🤖 [Agente] Inicializando pipeline autônomo...",
      `⚙️ [Agente] Parâmetros: Ano=2026 | Bimestre=${bimestre}º | Lançar Faltas=${lancarFaltas ? "SIM" : "NÃO"}`,
      `📂 [Agente] Enviando arquivo selecionado para processamento no servidor...`,
      "⏳ [Agente] Processando documento no servidor backend e gravando notas no banco de dados..."
    ]);
    setEtapaAtual("Enviando PDF...");
    setPdfs((prev) =>
      prev.map((p) =>
        p.nome === selectedPdf.nome ? { ...p, status: "Processando" } : p
      )
    );

    try {
      const formData = new FormData();
      formData.append("files", fileToUpload);
      formData.append("bimestre", bimestre);
      formData.append("lancarFaltas", lancarFaltas ? "true" : "false");
      formData.append("ano", "2026");

      const response = await api.post("/api/secretaria/agente/importar-boletim", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data && response.data.ok) {
        const serverLogs = response.data.logs || [];
        setEtapaAtual("Analisando logs...");
        
        let logIndex = 0;
        const interval = setInterval(() => {
          if (logIndex < serverLogs.length) {
            setLogs((prev) => [...prev, serverLogs[logIndex]]);
            const currentLog = serverLogs[logIndex];
            
            if (currentLog.includes("Lendo")) setEtapaAtual("Processando PDF...");
            else if (currentLog.includes("Importando")) setEtapaAtual("Lançando Notas...");
            else if (currentLog.includes("RELATÓRIO")) setEtapaAtual("Reconciliando Dados...");
            else if (currentLog.includes("finalizada")) setEtapaAtual("Concluído!");

            setProgresso(Math.round(10 + (logIndex / serverLogs.length) * 90));
            logIndex++;
          } else {
            clearInterval(interval);
            setExecutando(false);
            setProgresso(100);
            setEtapaAtual("Concluído!");
            setPdfs((prev) =>
              prev.map((p) =>
                p.nome === selectedPdf.nome
                  ? { ...p, status: "Importado", selecionado: false }
                  : p
              )
            );
          }
        }, 150);
      } else {
        throw new Error(response.data?.message || "Erro desconhecido retornado pelo servidor.");
      }
    } catch (err) {
      console.error("Erro na execução do agente:", err);
      const errMsg = err.response?.data?.message || err.message || "Erro de rede ao conectar com o servidor.";
      setLogs((prev) => [
        ...prev,
        `❌ [Agente] ERRO CRÍTICO: Falha na execução do pipeline.`,
        `❌ Detalhe do Erro: ${errMsg}`
      ]);
      setEtapaAtual("Falha!");
      setExecutando(false);
      setProgresso(0);
      setPdfs((prev) =>
        prev.map((p) =>
          p.nome === selectedPdf.nome ? { ...p, status: "Aguardando" } : p
        )
      );
    }
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

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  style={{ display: "none" }}
                  disabled={executando || isUploading}
                />

                {/* Upload Zone */}
                <div
                  onClick={() => !executando && !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 group ${
                    isUploading
                      ? "border-purple-300 bg-purple-50/30"
                      : "border-purple-200 bg-white hover:border-purple-500 hover:bg-purple-50/20 hover:shadow-inner"
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-semibold text-purple-600">Carregando e analisando o PDF...</span>
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
                  {pdfs.map((pdf) => {
                    const isSelected = pdf.selecionado;
                    return (
                      <div
                        key={pdf.nome}
                        onClick={() => handleToggleSelection(pdf.nome)}
                        className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "bg-purple-50/40 border-purple-300 shadow-sm"
                            : "bg-gray-50/50 border-gray-200 opacity-60 hover:opacity-90"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox Seletor Premium */}
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-purple-600 border-purple-600 text-white"
                              : "border-gray-300 bg-white"
                          }`}>
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>

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
                        
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {pdf.status === "Importado" || pdf.status === "Pronto" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {pdf.status}
                            </span>
                          ) : pdf.status === "Processando" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              {pdf.status}...
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              {pdf.status}
                            </span>
                          )}
                          
                          <button
                            type="button"
                            disabled={executando}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePdf(pdf.nome);
                            }}
                            className="p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-gray-400"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
      {/* MODAL ALERTA PREMIUM - SELEÇÃO INDIVIDUAL SEGURA */}
      {isAlertOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsAlertOpen(false)}
          />
          <div
            className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-purple-100 transition-all duration-300 transform scale-100"
            style={{
              background: "linear-gradient(180deg, #fdfdff 0%, #ffffff 100%)"
            }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className="p-3.5 rounded-full text-purple-600 bg-purple-50 border border-purple-100 flex items-center justify-center animate-pulse"
                style={{ boxShadow: "0 4px 12px rgba(139,92,246,0.15)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  Execução Segura: 1 Turma por Vez
                </h3>
                <p className="text-xs text-purple-600 font-semibold mt-1 uppercase tracking-wider">
                  Recomendação de Estabilidade do Agente
                </p>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  Para garantir 100% de estabilidade nas conexões de banco de dados e evitar quedas por tempo limite (timeout) do servidor, 
                  <strong> o Agente processa as turmas individualmente</strong>.
                </p>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Deseja alternar a seleção ativa para esta turma que você acabou de clicar?
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={confirmarTrocaSelecao}
                  className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #3b82f6)"
                  }}
                >
                  Sim, Alternar Seleção
                </button>
                <button
                  type="button"
                  onClick={() => setIsAlertOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 transition-all font-semibold text-xs border border-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE REIMPORTAÇÃO SEGURA */}
      {isReimportConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsReimportConfirmOpen(false)}
          />
          <div
            className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-amber-100 transition-all duration-300 transform scale-100"
            style={{
              background: "linear-gradient(180deg, #fffdfb 0%, #ffffff 100%)"
            }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className="p-3.5 rounded-full text-amber-500 bg-amber-50 border border-amber-100 flex items-center justify-center animate-bounce"
                style={{ boxShadow: "0 4px 12px rgba(245,158,11,0.15)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  Reimportar Boletim?
                </h3>
                <p className="text-xs text-amber-600 font-semibold mt-1 uppercase tracking-wider">
                  Blindagem Contra Reexecução Acidental
                </p>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  Esta turma já foi importada com sucesso. Se você reexecutar o Agente, 
                  <strong> as notas e faltas existentes no banco de dados serão sobregravadas</strong> para o {bimestre}º Bimestre.
                </p>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Tem certeza de que deseja prosseguir com a re-importação?
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const selectedPdf = pdfs.find((p) => p.selecionado);
                    if (selectedPdf) prosseguirRodarAgente(selectedPdf);
                  }}
                  className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)"
                  }}
                >
                  Sim, Reimportar e Sobregravar
                </button>
                <button
                  type="button"
                  onClick={() => setIsReimportConfirmOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 transition-all font-semibold text-xs border border-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
