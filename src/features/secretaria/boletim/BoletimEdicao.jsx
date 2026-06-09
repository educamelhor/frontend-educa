// src/features/secretaria/boletim/BoletimEdicao.jsx
// ============================================================================
// Tela de Gestão de Boletim (Edição e Fiscalização)
// - Aba 1: Ajustes e Regras (Mockup original mantido íntegro para futuras fases)
// - Aba 2: Acompanhamento de Lançamentos (Nova feature real com dados do backend)
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import {
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";

// Helper: ano letivo padrão (corte 31/jan)
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// ---------------------------------------------------------------------------
// Componente de botão liga/desliga (Mock original)
// ---------------------------------------------------------------------------
function TogglePill({ label, enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition
        ${enabled ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-700"}`}
    >
      <span
        className={`inline-block w-3 h-3 rounded-full mr-2 transition
        ${enabled ? "bg-white" : "bg-gray-500"}`}
      />
      {label}
    </button>
  );
}

// ============================================================================
// MOCKS ORIGINAIS (para manter a Aba 1 intocada)
// ============================================================================
const MOCK_ALUNOS = [
  { id: 1, codigo: "2023001", nome: "Ana Beatriz Souza", turma: "7º A" },
  { id: 2, codigo: "2023002", nome: "Bruno Silva", turma: "7º A" },
  { id: 3, codigo: "2023003", nome: "Carolina Lima", turma: "7º B" },
  { id: 4, codigo: "2023004", nome: "Diego Rocha", turma: "8º A" },
];

const MOCK_DISCIPLINAS = [
  { id: 10, nome: "Matemática" },
  { id: 11, nome: "Português" },
  { id: 12, nome: "Ciências" },
  { id: 13, nome: "Geografia" },
  { id: 14, nome: "História" },
];

const MOCK_NOTAS = {
  "1-10-1": 8.5,
  "1-11-1": 7.2,
  "1-12-1": 9.0,
  "2-10-1": 6.8,
  "2-11-1": 7.0,
  "3-10-1": 9.5,
};

function getKey(alunoId, disciplinaId, bimestre) {
  return `${alunoId}-${disciplinaId}-${bimestre}`;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function BoletimEdicao() {
  const [activeTab, setActiveTab] = useState("acompanhamento"); // default para o acompanhamento novo

  // --- Estados do Acompanhamento Real ---
  const [loadingAcomp, setLoadingAcomp] = useState(false);
  const [dadosAcomp, setDadosAcomp] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [anosLetivos, setAnosLetivos] = useState([anoLetivoPadrao()]);

  // Filtros ativos
  const [filtroBimestre, setFiltroBimestre] = useState(1);
  const [filtroTurno, setFiltroTurno] = useState("todos");
  const [filtroTurma, setFiltroTurma] = useState("todas");
  const [filtroDisciplina, setFiltroDisciplina] = useState("todas");
  const [filtroAnoLetivo, setFiltroAnoLetivo] = useState(anoLetivoPadrao());

  // Modal de Detalhes
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null); // { turma_id, turma_nome, disciplina_id, disciplina_nome, professor_nome, bimestre, total_alunos }
  const [alunosNotas, setAlunosNotas] = useState([]);
  const [buscaAlunoModal, setBuscaAlunoModal] = useState("");
  const [loadingModal, setLoadingModal] = useState(false);

  // Perfil e controle de governança gestora
  const perfil = String(localStorage.getItem("perfil") || "").toLowerCase().trim();
  const isDiretorOuVice = perfil === "diretor" || perfil === "vice_diretor";

  const [isEditMode, setIsEditMode] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [savingLancamentos, setSavingLancamentos] = useState(false);

  // --- Estados do Mock Original (Aba 1) ---
  const [controlesBimestre, setControlesBimestre] = useState({
    1: { edicaoProf: true, visivelPais: false, bianual: false },
    2: { edicaoProf: false, visivelPais: false, bianual: false },
    3: { edicaoProf: false, visivelPais: false, bianual: false },
    4: { edicaoProf: false, visivelPais: false, bianual: false },
  });
  const [bimestreSelecionadoMock, setBimestreSelecionadoMock] = useState(1);
  const [buscaMock, setBuscaMock] = useState("");
  const [alunoSelecionadoMock, setAlunoSelecionadoMock] = useState(null);
  const [notasEdicaoMock, setNotasEdicaoMock] = useState({});

  // ---------------------------------------------------------------------------
  // Carregamento de filtros no boot (disciplinas + anos letivos)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function carregarFiltrosEstaticos() {
      try {
        const [resDiscs, resAnos] = await Promise.all([
          api.get("/api/disciplinas"),
          api.get("/api/secretaria/relatorios/anos-letivos").catch(() => ({ data: [anoLetivoPadrao()] }))
        ]);
        setDisciplinas(resDiscs.data || []);
        if (Array.isArray(resAnos.data) && resAnos.data.length > 0) {
          setAnosLetivos(resAnos.data);
        }
      } catch (err) {
        console.error("Erro ao carregar disciplinas/anos:", err);
      }
    }
    carregarFiltrosEstaticos();
  }, []);

  // ---------------------------------------------------------------------------
  // Recarrega turmas sempre que o ano letivo selecionado mudar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function carregarTurmas() {
      try {
        const res = await api.get("/api/turmas", { params: { ano: filtroAnoLetivo } });
        setTurmas(res.data || []);
        setFiltroTurma("todas"); // reseta seleção ao trocar de ano
      } catch (err) {
        console.error("Erro ao carregar turmas:", err);
      }
    }
    carregarTurmas();
  }, [filtroAnoLetivo]);

  // ---------------------------------------------------------------------------
  // Carregar dados de Acompanhamento
  // ---------------------------------------------------------------------------
  const fetchAcompanhamento = async () => {
    setLoadingAcomp(true);
    try {
      const res = await api.get("/api/secretaria/relatorios/acompanhamento-notas", {
        params: {
          ano_letivo: filtroAnoLetivo,
          bimestre: filtroBimestre,
          turno: filtroTurno,
          disciplina_id: filtroDisciplina,
          turma_id: filtroTurma,
        }
      });
      setDadosAcomp(res.data?.dados || []);
    } catch (err) {
      console.error("Erro ao buscar dados do acompanhamento:", err);
      setDadosAcomp([]);
    } finally {
      setLoadingAcomp(false);
    }
  };

  useEffect(() => {
    if (activeTab === "acompanhamento") {
      fetchAcompanhamento();
    }
  }, [activeTab, filtroBimestre, filtroTurno, filtroTurma, filtroDisciplina, filtroAnoLetivo]);

  // ---------------------------------------------------------------------------
  // Carregar detalhes das notas da turma no modal
  // ---------------------------------------------------------------------------
  const abrirDetalhesLançamento = async (item) => {
    setModalData(item);
    setModalOpen(true);
    setIsEditMode(false);
    setLoadingModal(true);
    setBuscaAlunoModal("");
    try {
      const res = await api.get("/api/secretaria/relatorios/acompanhamento-notas/alunos", {
        params: {
          turma_id: item.turma_id,
          disciplina_id: item.disciplina_id,
          bimestre: filtroBimestre,
          ano_letivo: filtroAnoLetivo,
        }
      });
      setAlunosNotas(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar alunos e notas:", err);
      setAlunosNotas([]);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleEditChange = (alunoId, field, value) => {
    setAlunosNotas((prev) =>
      prev.map((a) => {
        if (a.aluno_id === alunoId) {
          return {
            ...a,
            [field]: value === "" ? null : value,
          };
        }
        return a;
      })
    );
  };

  const handleAbrirConfirmacaoSalvar = () => {
    for (const a of alunosNotas) {
      if (a.nota !== null && a.nota !== undefined && a.nota !== "") {
        const val = parseFloat(String(a.nota).replace(",", "."));
        if (Number.isNaN(val) || val < 0 || val > 10) {
          alert(`Nota inválida para o aluno ${a.nome}. Deve ser entre 0 e 10.`);
          return;
        }
      }
      if (a.faltas !== null && a.faltas !== undefined && a.faltas !== "") {
        const val = parseInt(a.faltas, 10);
        if (Number.isNaN(val) || val < 0) {
          alert(`Faltas inválidas para o aluno ${a.nome}. Deve ser maior ou igual a 0.`);
          return;
        }
      }
    }
    setConfirmSaveOpen(true);
  };

  const handleConfirmarSalvar = async () => {
    setSavingLancamentos(true);
    try {
      const payload = {
        turma_id: modalData.turma_id,
        disciplina_id: modalData.disciplina_id,
        bimestre: filtroBimestre,
        ano: filtroAnoLetivo,
        lancamentos: alunosNotas.map((a) => {
          let notaVal = a.nota === "" || a.nota === null || a.nota === undefined ? null : parseFloat(String(a.nota).replace(",", "."));
          let faltasVal = a.faltas === "" || a.faltas === null || a.faltas === undefined ? null : parseInt(a.faltas, 10);
          return {
            aluno_id: a.aluno_id,
            nota: notaVal,
            faltas: faltasVal,
          };
        }),
      };

      const res = await api.post("/api/professores/boletim/salvar", payload);
      if (res.data?.ok) {
        setIsEditMode(false);
        setConfirmSaveOpen(false);
        // Recarrega os dados do modal para ter certeza de que o backend salvou e formatou
        await abrirDetalhesLançamento(modalData);
        // Atualiza a tabela principal
        await fetchAcompanhamento();
      } else {
        alert(res.data?.message || "Erro ao salvar lançamentos.");
      }
    } catch (err) {
      console.error("Erro ao salvar lançamentos gestor:", err);
      alert(err?.response?.data?.message || "Erro interno ao salvar.");
    } finally {
      setSavingLancamentos(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Estatísticas calculadas dinamicamente
  // ---------------------------------------------------------------------------
  const stats = useMemo(() => {
    const total = dadosAcomp.length;
    let concluidos = 0;
    let parciais = 0;
    let pendentes = 0;
    let totalAlunosPrevistos = 0;
    let totalAlunosComNota = 0;

    dadosAcomp.forEach((d) => {
      const notaCount = Number(d.alunos_com_nota) || 0;
      const totalCount = Number(d.total_alunos) || 0;
      totalAlunosPrevistos += totalCount;
      totalAlunosComNota += notaCount;

      if (totalCount === 0) {
        pendentes++;
      } else if (notaCount === 0) {
        pendentes++;
      } else if (notaCount === totalCount) {
        concluidos++;
      } else {
        parciais++;
      }
    });

    const percentGlobal = totalAlunosPrevistos > 0
      ? Math.round((totalAlunosComNota / totalAlunosPrevistos) * 100)
      : 0;

    return {
      total,
      concluidos,
      parciais,
      pendentes,
      percentGlobal,
      concluidosPercent: total > 0 ? Math.round((concluidos / total) * 100) : 0,
      parciaisPercent: total > 0 ? Math.round((parciais / total) * 100) : 0,
      pendentesPercent: total > 0 ? Math.round((pendentes / total) * 100) : 0,
    };
  }, [dadosAcomp]);

  // Filtro de alunos dentro do modal
  const alunosModalFiltrados = useMemo(() => {
    if (!buscaAlunoModal.trim()) return alunosNotas;
    const q = buscaAlunoModal.toLowerCase();
    return alunosNotas.filter((a) =>
      String(a.nome).toLowerCase().includes(q) ||
      String(a.matricula).toLowerCase().includes(q)
    );
  }, [alunosNotas, buscaAlunoModal]);

  // Estatísticas rápidas do modal (notas da turma)
  const modalStats = useMemo(() => {
    const notasValidas = alunosNotas
      .map((a) => a.nota)
      .filter((n) => n != null && n !== "")
      .map(Number);

    if (notasValidas.length === 0) {
      return { media: "—", maior: "—", menor: "—", totalFaltas: alunosNotas.reduce((sum, a) => sum + (Number(a.faltas) || 0), 0) };
    }

    const sum = notasValidas.reduce((a, b) => a + b, 0);
    const media = (sum / notasValidas.length).toFixed(2).replace(".", ",");
    const maior = Math.max(...notasValidas).toFixed(2).replace(".", ",");
    const menor = Math.min(...notasValidas).toFixed(2).replace(".", ",");
    const totalFaltas = alunosNotas.reduce((sum, a) => sum + (Number(a.faltas) || 0), 0);

    return { media, maior, menor, totalFaltas };
  }, [alunosNotas]);

  // ---------------------------------------------------------------------------
  // Lógicas do Mock Original (Aba 1)
  // ---------------------------------------------------------------------------
  const listaFiltradaMock = useMemo(() => {
    if (!buscaMock.trim()) return MOCK_ALUNOS;
    const q = buscaMock.trim().toLowerCase();
    return MOCK_ALUNOS.filter((a) => {
      return (
        a.codigo.toLowerCase().includes(q) ||
        a.nome.toLowerCase().includes(q) ||
        a.turma.toLowerCase().includes(q)
      );
    });
  }, [buscaMock]);

  function getNotaAtualMock(alunoId, disciplinaId) {
    const key = getKey(alunoId, disciplinaId, bimestreSelecionadoMock);
    if (key in notasEdicaoMock) return notasEdicaoMock[key];
    if (key in MOCK_NOTAS) return MOCK_NOTAS[key];
    return "";
  }

  function handleChangeNotaMock(alunoId, disciplinaId, value) {
    const key = getKey(alunoId, disciplinaId, bimestreSelecionadoMock);
    setNotasEdicaoMock((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSalvarNotasMock() {
    if (!alunoSelecionadoMock) return;
    alert("Simulação de salvamento (fase designer).");
  }

  const bimestresMock = [
    { id: 1, label: "1º Bimestre", cor: "from-blue-500 to-blue-600" },
    { id: 2, label: "2º Bimestre", cor: "from-emerald-500 to-emerald-600" },
    { id: 3, label: "3º Bimestre", cor: "from-amber-500 to-amber-600" },
    { id: 4, label: "4º Bimestre", cor: "from-rose-500 to-rose-600" },
  ];

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 bg-blue-50 min-h-screen">
      <div className="px-6 py-6 space-y-6">
        
        {/* TÍTULO */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-blue-100 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-900 flex items-center gap-2">
              🎓 Gestão de Boletim
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Fiscalização de lançamentos de notas e controle de permissões por bimestre.
            </p>
          </div>

          {/* Seletor de Aba Premium */}
          <div className="inline-flex bg-white/80 p-1 rounded-xl shadow-sm border border-blue-100 backdrop-blur">
            <button
              onClick={() => setActiveTab("acompanhamento")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "acompanhamento"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50/50"
              }`}
            >
              <ChartBarIcon className="w-4 h-4" />
              Acompanhamento de Lançamentos
            </button>
            <button
              onClick={() => setActiveTab("edicao")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "edicao"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50/50"
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              Ajustes e Regras (Mock)
            </button>
          </div>
        </header>

        {/* =======================================================================
            ABA 2: ACOMPANHAMENTO DE LANÇAMENTOS (REAL)
            =======================================================================*/}
        {activeTab === "acompanhamento" && (
          <div className="space-y-6">
            
            {/* FILTROS */}
            <section className="bg-white border rounded-2xl shadow-sm p-5 flex flex-wrap items-end gap-4 border-blue-100">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                  📅 Ano Letivo
                </label>
                <select
                  value={filtroAnoLetivo}
                  onChange={(e) => setFiltroAnoLetivo(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                >
                  {anosLetivos.map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  ⏱️ Bimestre
                </label>
                <select
                  value={filtroBimestre}
                  onChange={(e) => setFiltroBimestre(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                >
                  {[1, 2, 3, 4].map((bim) => (
                    <option key={bim} value={bim}>{bim}º Bimestre</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  🌅 Turno
                </label>
                <select
                  value={filtroTurno}
                  onChange={(e) => { setFiltroTurno(e.target.value); setFiltroTurma("todas"); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                >
                  <option value="todos">Todos</option>
                  <option value="matutino">Matutino</option>
                  <option value="vespertino">Vespertino</option>
                  <option value="noturno">Noturno</option>
                </select>
              </div>

              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  🏫 Turma
                </label>
                <select
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                >
                  <option value="todas">Todas</option>
                  {turmas
                    .filter((t) =>
                      filtroTurno === "todos" ||
                      (t.turno || "").toLowerCase() === filtroTurno.toLowerCase()
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.turma} ({t.turno})</option>
                    ))}
                </select>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  📚 Disciplina
                </label>
                <select
                  value={filtroDisciplina}
                  onChange={(e) => setFiltroDisciplina(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                >
                  <option value="todas">Todas</option>
                  {disciplinas.map((d) => (
                    <option key={d.id} value={d.id}>{d.disciplina} ({d.etapa})</option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchAcompanhamento}
                className="px-4 py-2 border rounded-xl hover:bg-gray-50 transition shadow-sm text-sm font-semibold flex items-center gap-2 h-[38px] text-gray-700 bg-white"
                title="Recarregar dados"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loadingAcomp ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </section>

            {/* DASHBOARD CARDS */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Card */}
              <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Lançamentos Modulados</span>
                  <span className="text-3xl font-extrabold text-blue-900 mt-1 block">{stats.total}</span>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">
                  📚
                </div>
              </div>

              {/* Concluídos Card */}
              <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Concluídos (100%)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-emerald-700">{stats.concluidos}</span>
                    <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      {stats.concluidosPercent}%
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
              </div>

              {/* Parciais Card */}
              <div className="bg-white border border-amber-100 rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Em Digitação (Parcial)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-amber-700">{stats.parciais}</span>
                    <span className="text-xs text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                      {stats.parciaisPercent}%
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-6 h-6" />
                </div>
              </div>

              {/* Pendentes Card */}
              <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Pendentes (0%)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-red-700">{stats.pendentes}</span>
                    <span className="text-xs text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                      {stats.pendentesPercent}%
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                  <ExclamationCircleIcon className="w-6 h-6" />
                </div>
              </div>
            </section>

            {/* PROGRESSO GLOBAL */}
            <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-700">Progresso Geral de Digitação da Escola</span>
                <span className="font-bold text-blue-700">{stats.percentGlobal}% concluído</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-500 shadow"
                  style={{ width: `${stats.percentGlobal}%` }}
                />
              </div>
            </section>

            {/* TABELA DE ACOMPANHAMENTO */}
            <section className="bg-white border rounded-2xl shadow-sm border-blue-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-blue-50 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-800">Status dos Lançamentos por Modulação</h3>
                <span className="text-xs text-gray-500 font-medium">Filtro ativo: {filtroBimestre}º Bimestre</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100/60 font-semibold text-gray-600 border-b">
                    <tr>
                      <th className="px-5 py-3 text-left">Professor</th>
                      <th className="px-5 py-3 text-left">Turma</th>
                      <th className="px-5 py-3 text-left">Disciplina</th>
                      <th className="px-5 py-3 text-center">Turno</th>
                      <th className="px-5 py-3 text-center">Progresso</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingAcomp ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                          Buscando modulações e lançamentos no banco de dados...
                        </td>
                      </tr>
                    ) : dadosAcomp.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-500 font-medium">
                          Nenhum lançamento de notas encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      dadosAcomp.map((item, idx) => {
                        const noteCount = Number(item.alunos_com_nota) || 0;
                        const totalCount = Number(item.total_alunos) || 0;
                        const percent = totalCount > 0 ? Math.round((noteCount / totalCount) * 100) : 0;

                        // Status classification
                        let statusColor = "bg-red-50 text-red-700 border-red-200";
                        let statusLabel = "Pendente";
                        if (totalCount > 0 && noteCount === totalCount) {
                          statusColor = "bg-green-50 text-green-700 border-green-200";
                          statusLabel = "Concluído";
                        } else if (noteCount > 0) {
                          statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                          statusLabel = "Parcial";
                        }

                        return (
                          <tr key={idx} className="hover:bg-blue-50/20 transition">
                            <td className="px-5 py-3.5 font-bold text-gray-800">{item.professor_nome}</td>
                            <td className="px-5 py-3.5 font-semibold text-gray-700">{item.turma_nome}</td>
                            <td className="px-5 py-3.5 text-gray-700 font-medium">{item.disciplina_nome}</td>
                            <td className="px-5 py-3.5 text-center font-semibold text-gray-600 capitalize">{item.turno}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3 justify-center min-w-[130px]">
                                <span className="font-mono text-xs font-bold text-gray-600">{noteCount} / {totalCount}</span>
                                <div className="w-24 bg-gray-150 rounded-full h-2 overflow-hidden shadow-inner flex-1">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      percent === 100 ? "bg-green-500" : percent > 0 ? "bg-amber-500" : "bg-red-300"
                                    }`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <button
                                onClick={() => abrirDetalhesLançamento(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white transition shadow-sm"
                                title="Visualizar Notas Digitadas"
                              >
                                <EyeIcon className="w-3.5 h-3.5" />
                                Visualizar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}

        {/* =======================================================================
            ABA 1: AJUSTES E REGRAS (MOCKUP ORIGINAL)
            =======================================================================*/}
        {activeTab === "edicao" && (
          <div className="space-y-6">
            
            {/* BANNERS DE BIMESTRE */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {bimestresMock.map((b) => {
                const ctrl = controlesBimestre[b.id];
                const ativo = bimestreSelecionadoMock === b.id;

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBimestreSelecionadoMock(b.id)}
                    className={`relative rounded-xl shadow transition transform hover:-translate-y-0.5 text-left
                      bg-gradient-to-r ${b.cor} text-white p-4 ${
                      ativo ? "ring-2 ring-offset-2 ring-white/70" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold uppercase tracking-wide">
                        {b.label}
                      </span>
                      {ativo && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                          Bimestre ativo
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Edição professores</span>
                        <TogglePill
                          label={ctrl.edicaoProf ? "Liberada" : "Bloqueada"}
                          enabled={ctrl.edicaoProf}
                          onChange={(value) =>
                            setControlesBimestre((prev) => ({
                              ...prev,
                              [b.id]: { ...prev[b.id], edicaoProf: value },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs">Visível para pais/alunos</span>
                        <TogglePill
                          label={ctrl.visivelPais ? "Visível" : "Oculto"}
                          enabled={ctrl.visivelPais}
                          onChange={(value) =>
                            setControlesBimestre((prev) => ({
                              ...prev,
                              [b.id]: { ...prev[b.id], visivelPais: value },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs">Boletim bianual</span>
                        <TogglePill
                          label={ctrl.bianual ? "Ativo" : "Inativo"}
                          enabled={ctrl.bianual}
                          onChange={(value) =>
                            setControlesBimestre((prev) => ({
                              ...prev,
                              [b.id]: { ...prev[b.id], bianual: value },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>

            {/* BARRA DE BUSCA */}
            <section className="bg-white border rounded-xl shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Buscar aluno (código, nome ou turma)
                </label>
                <input
                  type="text"
                  value={buscaMock}
                  onChange={(e) => setBuscaMock(e.target.value)}
                  placeholder="Ex.: 2023001, Ana, 7º A..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs text-blue-900 min-w-[220px]">
                <div className="font-semibold">Filtro atual</div>
                <div>
                  Bimestre:{" "}
                  <span className="font-semibold">
                    {bimestresMock.find((b) => b.id === bimestreSelecionadoMock)?.label}
                  </span>
                </div>
                <div>
                  Alunos encontrados:{" "}
                  <span className="font-semibold">{listaFiltradaMock.length}</span>
                </div>
              </div>
            </section>

            {/* LISTA + DISCIPLINAS */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* LEFT: LISTA ALUNOS */}
              <div className="xl:col-span-2 bg-white border rounded-xl shadow-sm flex flex-col">
                <div className="border-b px-4 py-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Alunos</h2>
                  <span className="text-xs text-gray-500">Clique para carregar as notas.</span>
                </div>

                <div className="grid grid-cols-12 text-xs font-semibold text-gray-500 px-4 py-2 border-b bg-gray-50">
                  <div className="col-span-3">Código</div>
                  <div className="col-span-6">Estudante</div>
                  <div className="col-span-3 text-right">Turma</div>
                </div>

                <div className="flex-1 overflow-auto max-h-[300px]">
                  {listaFiltradaMock.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">Nenhum aluno encontrado.</div>
                  ) : (
                    <ul className="divide-y">
                      {listaFiltradaMock.map((a) => {
                        const ativo = alunoSelecionadoMock?.id === a.id;
                        return (
                          <li
                            key={a.id}
                            onClick={() => setAlunoSelecionadoMock(a)}
                            className={`px-4 py-2 text-sm cursor-pointer transition ${
                              ativo ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-3 font-mono text-xs">{a.codigo}</div>
                              <div className="col-span-6">
                                <span className="font-medium">{a.nome}</span>
                              </div>
                              <div className="col-span-3 text-xs text-right">{a.turma}</div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* RIGHT: DISCIPLINAS / NOTAS */}
              <div className="bg-white border rounded-xl shadow-sm flex flex-col">
                <div className="border-b px-4 py-3">
                  <h2 className="text-sm font-semibold text-gray-800">Disciplinas e Notas</h2>
                  {!alunoSelecionadoMock ? (
                    <p className="text-xs text-gray-500 mt-1">Selecione um estudante.</p>
                  ) : (
                    <p className="text-xs text-gray-600 mt-1 font-bold">
                      {alunoSelecionadoMock.nome} ({alunoSelecionadoMock.turma})
                    </p>
                  )}
                </div>

                <div className="px-4 py-2 border-b bg-gray-50 flex flex-wrap gap-2">
                  {bimestresMock.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBimestreSelecionadoMock(b.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                        bimestreSelecionadoMock === b.id
                          ? "bg-blue-700 text-white"
                          : "bg-white text-gray-700 border"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-auto px-4 py-3 max-h-[220px]">
                  {!alunoSelecionadoMock ? (
                    <div className="text-sm text-gray-500">Nenhum aluno selecionado.</div>
                  ) : (
                    <div className="space-y-2">
                      {MOCK_DISCIPLINAS.map((disc) => (
                        <div key={disc.id} className="flex items-center gap-2 py-1 border-b last:border-b-0">
                          <div className="flex-1 text-sm text-gray-800">{disc.nome}</div>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            className="w-20 px-2 py-1 border rounded-md text-sm text-right bg-gray-50"
                            value={getNotaAtualMock(alunoSelecionadoMock.id, disc.id)}
                            onChange={(e) =>
                              handleChangeNotaMock(alunoSelecionadoMock.id, disc.id, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 max-w-[65%]">
                    Esta é uma simulação. Na próxima etapa integraremos ao backend.
                  </p>
                  <button
                    type="button"
                    onClick={handleSalvarNotasMock}
                    disabled={!alunoSelecionadoMock}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 
                      hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Salvar alterações
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

      </div>

      {/* =======================================================================
          MODAL: VISUALIZAR NOTAS DA TURMA (MODO LEITURA)
          =======================================================================*/}
      {modalOpen && modalData && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-blue-100 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-750 to-blue-850 text-white flex justify-between items-center shadow-md">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-200">Fiscalização de Notas</span>
                <h2 className="text-lg font-bold flex items-center gap-1.5 mt-0.5">
                  🔍 Visualização de Lançamento
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {isDiretorOuVice && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(!isEditMode);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                      isEditMode
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-400"
                        : "bg-white/10 hover:bg-white/25 text-white border-white/20"
                    }`}
                  >
                    <span>{isEditMode ? "🔒" : "✏️"}</span>
                    {isEditMode ? "Cancelar Edição" : "Editar Lançamento"}
                  </button>
                )}
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setIsEditMode(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition focus:outline-none"
                  aria-label="Fechar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-Header Detalhes */}
            <div className="px-6 py-4 bg-blue-50/50 border-b flex flex-wrap gap-x-8 gap-y-2 text-xs font-medium text-gray-700">
              <div><strong>Docente:</strong> <span className="text-gray-950 font-bold">{modalData.professor_nome}</span></div>
              <div><strong>Turma:</strong> <span className="text-gray-950 font-bold">{modalData.turma_nome}</span></div>
              <div><strong>Disciplina:</strong> <span className="text-gray-950 font-bold">{modalData.disciplina_nome}</span></div>
              <div><strong>Bimestre:</strong> <span className="text-gray-950 font-bold">{filtroBimestre}º Bimestre</span></div>
              <div><strong>Ano Letivo:</strong> <span className="text-gray-950 font-bold">{filtroAnoLetivo}</span></div>
            </div>

            {/* Quick Stats do Modal */}
            <div className="px-6 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200/50">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Média da Turma</span>
                <span className="text-lg font-extrabold text-blue-800 mt-0.5 block">{modalStats.media}</span>
              </div>
              <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Maior Nota</span>
                <span className="text-lg font-extrabold text-emerald-800 mt-0.5 block">{modalStats.maior}</span>
              </div>
              <div className="bg-red-50/40 p-3 rounded-2xl border border-red-100">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Menor Nota</span>
                <span className="text-lg font-extrabold text-red-800 mt-0.5 block">{modalStats.menor}</span>
              </div>
              <div className="bg-amber-50/40 p-3 rounded-2xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Total Faltas</span>
                <span className="text-lg font-extrabold text-amber-800 mt-0.5 block">{modalStats.totalFaltas}</span>
              </div>
            </div>

            {/* Busca Interna Aluno */}
            <div className="px-6 py-4">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={buscaAlunoModal}
                  onChange={(e) => setBuscaAlunoModal(e.target.value)}
                  placeholder="Pesquisar aluno por nome ou matrícula..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-450 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Tabela de Alunos e Notas */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-inner bg-gray-50/20">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-150 font-bold text-gray-700 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left w-20">Foto</th>
                      <th className="px-4 py-2.5 text-left w-36">Matrícula</th>
                      <th className="px-4 py-2.5 text-left">Estudante</th>
                      <th className="px-4 py-2.5 text-right w-24">Faltas</th>
                      <th className="px-4 py-2.5 text-right w-28">Nota Lançada</th>
                      <th className="px-4 py-2.5 text-center w-28">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loadingModal ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500 font-semibold">
                          <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                          Buscando notas dos alunos no banco de dados...
                        </td>
                      </tr>
                    ) : alunosModalFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-medium">
                          Nenhum estudante correspondente na pesquisa.
                        </td>
                      </tr>
                    ) : (
                      alunosModalFiltrados.map((aluno, i) => {
                        const hasNota = aluno.nota != null && aluno.nota !== "";
                        const hasLancamento = hasNota || (aluno.faltas != null && aluno.faltas !== "");
                        
                        return (
                          <tr key={aluno.aluno_id || i} className="hover:bg-blue-50/20">
                            <td className="px-4 py-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-100 font-bold text-[10px] text-gray-600 shadow-sm">
                                {aluno.foto ? (
                                  <img
                                    src={aluno.foto}
                                    alt={aluno.nome}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = "none"; }}
                                  />
                                ) : (
                                  String(aluno.nome).substring(0, 2).toUpperCase()
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 font-mono font-bold text-gray-500">{aluno.matricula || "—"}</td>
                            <td className="px-4 py-2 font-bold text-gray-800 text-sm">{aluno.nome}</td>
                            <td className="px-4 py-2 text-right font-bold text-gray-700 text-sm">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={aluno.faltas ?? ""}
                                  onChange={(e) => handleEditChange(aluno.aluno_id, "faltas", e.target.value)}
                                  className="w-16 px-2 py-1 text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold bg-amber-50/15 text-gray-900"
                                />
                              ) : (
                                aluno.faltas ?? "—"
                              )}
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-gray-700 text-sm">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  placeholder="0,0"
                                  value={aluno.nota ?? ""}
                                  onChange={(e) => handleEditChange(aluno.aluno_id, "nota", e.target.value)}
                                  className="w-20 px-2 py-1 text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-extrabold bg-amber-50/15 text-blue-700"
                                />
                              ) : (
                                hasNota ? Number(aluno.nota).toFixed(2).replace(".", ",") : "—"
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {hasLancamento ? (
                                <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-bold text-[10px]">
                                  Lançada
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full font-bold text-[10px]">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
              <span className="text-[11px] text-gray-500 self-center font-medium mr-auto">
                📋 Visualização administrativa. As notas apresentadas são em tempo real.
              </span>
              {isEditMode && (
                <button
                  onClick={handleAbrirConfirmacaoSalvar}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  💾 Salvar Lançamentos
                </button>
              )}
              <button
                onClick={() => {
                  setModalOpen(false);
                  setIsEditMode(false);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
              >
                Concluir Visualização
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DO LANÇAMENTO GESTOR (PREMIUM MODAL) */}
      {confirmSaveOpen && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-emerald-100 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm text-3xl">
              📝
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Lançamento de Notas/Faltas</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Você está prestes a salvar as alterações de notas e faltas de toda a turma como <strong>Gestor Escolar</strong>.
              Isso atualizará os boletins oficiais e as informações dos diários dos alunos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSaveOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarSalvar}
                disabled={savingLancamentos}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2"
              >
                {savingLancamentos ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Confirmar Lançamento"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
