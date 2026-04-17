import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AcademicCapIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  FunnelIcon,
  EyeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  LockOpenIcon,
} from "@heroicons/react/24/outline";

/**
 * Solicitações — Painel Multi-Tarefas da Coordenação / Direção
 * ──────────────────────────────────────────────────────────────
 * Centraliza todas as solicitações dos professores:
 * - Aprovação de PAP (Plano de Avaliação Pedagógica)
 * - Futuro: Currículo, Provas, Mecanografia, etc.
 */

// Helper para resolver URL pública de fotos (mesma lógica do HeaderGlobal)
const toPublicUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads/")) {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    const backendBase = isLocal
      ? "http://localhost:3000"
      : "https://educa-backend-docker-659zo.ondigitalocean.app";
    return `${backendBase}${path}`;
  }
  return path;
};

const CATEGORIAS = [
  { id: "pap",         label: "Planos de Avaliação (PAP)", icon: DocumentCheckIcon, cor: "indigo"  },
  // Futuras categorias:
  // { id: "curriculo",   label: "Currículo",                 icon: BookOpenIcon,     cor: "purple"  },
  // { id: "provas",      label: "Provas",                    icon: DocumentTextIcon, cor: "blue"    },
  // { id: "mecanografia",label: "Mecanografia / Cópias",     icon: PrinterIcon,      cor: "teal"    },
];

export default function SolicitacoesConteudos() {
  // ─── Estado geral ───
  const [categoriaAtiva, setCategoriaAtiva] = useState("pap");
  const [loading, setLoading] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  // ─── PAP (Planos de Avaliação) ───
  const [solicitacoesPAP, setSolicitacoesPAP] = useState([]);
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroDisciplina, setFiltroDisciplina] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // ─── Modal de detalhes ───
  const [modalDetalhe, setModalDetalhe] = useState(null); // { plano, itens[] }
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // ─── Modal de confirmação de ação ───
  const [modalAcao, setModalAcao] = useState(null); // { id, turma, disciplina, acao: "APROVADO" | "DEVOLVIDO" }
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [motivoDevolucao, setMotivoDevolucao] = useState("");

  // ─── Mensagem ───
  const [msg, setMsg] = useState(null);
  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // ─── Carregar solicitações ───
  const carregarSolicitacoes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/avaliacoes/solicitacoes/pendentes");
      if (data.ok) {
        setSolicitacoesPAP(data.solicitacoes || []);
        setUltimaAtualizacao(new Date());
      }
    } catch (err) {
      console.error("Erro ao carregar solicitações:", err);
      showMsg("error", "Erro ao carregar solicitações pendentes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  // ─── Ver detalhes do plano ───
  const verDetalhes = async (plano) => {
    setLoadingDetalhe(true);
    try {
      const { data } = await api.get(`/avaliacoes/${plano.id}`);
      setModalDetalhe({
        plano,
        itens: data.itens || [],
        status: data.status,
      });
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
      showMsg("error", "Erro ao carregar detalhes do plano.");
    } finally {
      setLoadingDetalhe(false);
    }
  };

  // ─── Executar ação (aprovar/devolver) ───
  const executarAcao = async () => {
    if (!modalAcao) return;

    // Validação: motivo obrigatório para devolução
    if (modalAcao.acao === "DEVOLVIDO" && !motivoDevolucao.trim()) {
      showMsg("error", "Informe o motivo da devolução.");
      return;
    }

    setProcessandoAcao(true);
    try {
      const payload = { status: modalAcao.acao };
      if (modalAcao.acao === "DEVOLVIDO") {
        payload.motivo = motivoDevolucao.trim();
      }

      const { data } = await api.patch(`/avaliacoes/${modalAcao.id}/status`, payload);
      if (data.ok) {
        showMsg("success", modalAcao.acao === "APROVADO"
          ? `Plano aprovado com sucesso! (${modalAcao.turma})`
          : `Plano devolvido para o professor. (${modalAcao.turma})`
        );
        setModalAcao(null);
        setMotivoDevolucao("");
        setModalDetalhe(null);
        carregarSolicitacoes();
      }
    } catch (err) {
      console.error("Erro ao executar ação:", err);
      const errMsg = err?.response?.data?.error || "Erro ao processar solicitação.";
      showMsg("error", errMsg);
    } finally {
      setProcessandoAcao(false);
    }
  };

  // ─── Filtragem ───
  const solicitacoesFiltradas = solicitacoesPAP.filter(s => {
    if (filtroTurma && !s.turmas?.toLowerCase().includes(filtroTurma.toLowerCase())) return false;
    if (filtroDisciplina && !s.disciplina?.toLowerCase().includes(filtroDisciplina.toLowerCase())) return false;
    return true;
  });

  // ─── KPIs ───
  const totalPendentes = solicitacoesPAP.length;
  const disciplinasUnicas = [...new Set(solicitacoesPAP.map(s => s.disciplina))].length;
  const professoresUnicos = [...new Set(solicitacoesPAP.map(s => s.professor_nome).filter(Boolean))].length;

  return (
    <div className="flex flex-col gap-6 w-full pb-20">

      {/* ═══ HEADER ═══ */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-md">
              <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                Solicitações
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Painel de governança — analise e gerencie solicitações dos professores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarFiltros(v => !v)}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                mostrarFiltros
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <FunnelIcon className="w-4 h-4 inline mr-1" />
              Filtros
            </button>
            <button
              onClick={carregarSolicitacoes}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 inline mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Filtros colapsáveis */}
        {mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Filtrar por turma..."
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            />
            <input
              type="text"
              placeholder="Filtrar por disciplina..."
              value={filtroDisciplina}
              onChange={(e) => setFiltroDisciplina(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
        )}
      </section>

      {/* ═══ MENSAGEM ═══ */}
      {msg && (
        <div className={`p-4 rounded-xl font-bold shadow-sm flex items-center gap-3 transition-all ${
          msg.type === "success" ? "bg-green-100 text-green-800 border border-green-200" :
          msg.type === "error" ? "bg-red-100 text-red-800 border border-red-200" :
          "bg-blue-100 text-blue-800 border border-blue-200"
        }`}>
          {msg.type === "success" ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <ClockIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pendentes</div>
              <div className="text-2xl font-black text-gray-800">{totalPendentes}</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <AcademicCapIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Professores</div>
              <div className="text-2xl font-black text-gray-800">{professoresUnicos}</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg">
              <DocumentCheckIcon className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Disciplinas</div>
              <div className="text-2xl font-black text-gray-800">{disciplinasUnicas}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS DE CATEGORIAS ═══ */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIAS.map(cat => {
          const CatIcon = cat.icon;
          const isActive = categoriaAtiva === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? `bg-${cat.cor}-50 text-${cat.cor}-700 border-2 border-${cat.cor}-200 shadow-sm`
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <CatIcon className="w-4 h-4" />
              {cat.label}
              {cat.id === "pap" && totalPendentes > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                  {totalPendentes}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ CONTEÚDO DA CATEGORIA ATIVA ═══ */}
      {categoriaAtiva === "pap" && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header da tabela */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DocumentCheckIcon className="w-6 h-6 text-white/80" />
              <div>
                <h3 className="text-lg font-bold text-white">Planos de Avaliação Pedagógica</h3>
                <p className="text-indigo-200 text-xs font-medium">PAPs enviados e solicitações de liberação dos professores</p>
              </div>
            </div>
            {ultimaAtualizacao && (
              <span className="text-xs text-indigo-200 font-medium">
                Atualizado: {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>

          {/* Tabela / Lista */}
          <div className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-gray-400">Carregando solicitações...</span>
                </div>
              </div>
            ) : solicitacoesFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <InboxIcon className="w-16 h-16 text-gray-200 mb-4" />
                <h4 className="text-lg font-bold text-gray-500">Nenhuma solicitação pendente</h4>
                <p className="text-sm text-gray-400 mt-1 max-w-sm">
                  Quando professores enviarem Planos de Avaliação para aprovação, eles aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Professor</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Turma</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Disciplina</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bimestre</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Recebido em</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {solicitacoesFiltradas.map(sol => (
                      <tr key={sol.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs overflow-hidden flex-shrink-0">
                              {sol.professor_foto ? (
                                <img
                                  src={toPublicUrl(sol.professor_foto)}
                                  alt={sol.professor_nome || "Professor"}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                              ) : null}
                              <span
                                className="w-full h-full flex items-center justify-center"
                                style={{ display: sol.professor_foto ? 'none' : 'flex' }}
                              >
                                {(sol.professor_nome || "?").charAt(0)}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-800 text-sm">
                              {sol.professor_nome || "Professor"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700 text-sm">{sol.turmas}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{sol.disciplina}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{sol.bimestre}</td>
                        <td className="px-6 py-4 text-center">
                          {sol.status === "LIBERACAO_SOLICITADA" ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                                Liberação
                              </span>
                              {sol.motivo_devolucao && (
                                <span
                                  className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 max-w-[180px] leading-tight text-left cursor-default"
                                  title={sol.motivo_devolucao}
                                >
                                  💬 {sol.motivo_devolucao.length > 60
                                    ? sol.motivo_devolucao.slice(0, 60) + "…"
                                    : sol.motivo_devolucao}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Novo PAP
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-gray-500">
                          {sol.updated_at ? new Date(sol.updated_at).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Ver detalhes */}
                            <button
                              onClick={() => verDetalhes(sol)}
                              className="p-2 rounded-lg bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 transition"
                              title="Ver detalhes do plano"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            {/* Aprovar / Liberar */}
                            {sol.status === "LIBERACAO_SOLICITADA" ? (
                              <button
                                onClick={() => setModalAcao({ id: sol.id, turma: sol.turmas, disciplina: sol.disciplina, acao: "APROVADO", isLiberacao: true })}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition"
                                title="Liberar plano para edição"
                              >
                                <LockOpenIcon className="w-3.5 h-3.5" />
                                Liberar
                              </button>
                            ) : (
                              <button
                                onClick={() => setModalAcao({ id: sol.id, turma: sol.turmas, disciplina: sol.disciplina, acao: "APROVADO", isLiberacao: false })}
                                className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition"
                                title="Aprovar plano"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                              </button>
                            )}
                            {/* Devolver / Negar */}
                            <button
                              onClick={() => setModalAcao({ id: sol.id, turma: sol.turmas, disciplina: sol.disciplina, acao: "DEVOLVIDO", isLiberacao: sol.status === "LIBERACAO_SOLICITADA" })}
                              className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition"
                              title={sol.status === "LIBERACAO_SOLICITADA" ? "Negar liberação" : "Devolver para o professor"}
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>{solicitacoesFiltradas.length} solicitação(ões) exibida(s)</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4" />
              Governança: professor solicita, coordenação decide
            </span>
          </div>
        </section>
      )}

      {/* ═══ MODAL — DETALHES DO PLANO ═══ */}
      {modalDetalhe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setModalDetalhe(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <DocumentCheckIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">Detalhes do Plano</h4>
                  <p className="text-indigo-200 text-sm font-medium">
                    {modalDetalhe.plano.professor_nome || "Professor"} — {modalDetalhe.plano.turmas}
                  </p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap gap-4 text-sm flex-shrink-0">
              <div className="bg-white border rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Disciplina</span>
                <span className="font-bold text-gray-800">{modalDetalhe.plano.disciplina}</span>
              </div>
              <div className="bg-white border rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Bimestre</span>
                <span className="font-bold text-gray-800">{modalDetalhe.plano.bimestre}</span>
              </div>
              <div className="bg-white border rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Turma</span>
                <span className="font-bold text-gray-800">{modalDetalhe.plano.turmas}</span>
              </div>
              <div className="bg-white border rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Pontos</span>
                <span className="font-bold text-gray-800">
                  {modalDetalhe.itens.reduce((acc, it) => acc + Number(it.nota_total || 0), 0)} / 10
                </span>
              </div>
            </div>

            {/* Tabela de itens */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b">Atividade</th>
                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b text-center">Valor</th>
                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b text-center">Frequência</th>
                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b text-center">Por ocor.</th>
                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b text-center">Fixo</th>
                  </tr>
                </thead>
                <tbody>
                  {(modalDetalhe.itens || []).map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-800 text-sm">{item.atividade}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-700">{item.nota_total}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.oportunidades || 1}</td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {((item.nota_total || 0) / (item.oportunidades || 1)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.fixo_direcao ? (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">FIXO</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer com ações */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
              <button
                onClick={() => setModalDetalhe(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition"
              >
                Fechar
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setModalAcao({
                      id: modalDetalhe.plano.id,
                      turma: modalDetalhe.plano.turmas,
                      disciplina: modalDetalhe.plano.disciplina,
                      acao: "DEVOLVIDO",
                      isLiberacao: modalDetalhe.plano.status === "LIBERACAO_SOLICITADA",
                    });
                  }}
                  className="px-5 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition"
                >
                  {modalDetalhe.plano.status === "LIBERACAO_SOLICITADA" ? "Negar Liberação" : "Devolver"}
                </button>
                <button
                  onClick={() => {
                    setModalAcao({
                      id: modalDetalhe.plano.id,
                      turma: modalDetalhe.plano.turmas,
                      disciplina: modalDetalhe.plano.disciplina,
                      acao: "APROVADO",
                      isLiberacao: modalDetalhe.plano.status === "LIBERACAO_SOLICITADA",
                    });
                  }}
                  className={`px-5 py-2.5 font-bold rounded-xl shadow-lg transition active:scale-95 ${
                    modalDetalhe.plano.status === "LIBERACAO_SOLICITADA"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25"
                      : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                  }`}
                >
                  {modalDetalhe.plano.status === "LIBERACAO_SOLICITADA" ? "🔓 Liberar para Edição" : "✓ Aprovar Plano"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL — CONFIRMAÇÃO DE AÇÃO ═══ */}
      {modalAcao && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { if (!processandoAcao) { setModalAcao(null); setMotivoDevolucao(""); } }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header com gradiente */}
            <div className={`px-6 py-5 ${
              modalAcao.acao === "APROVADO"
                ? modalAcao.isLiberacao
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-emerald-500 to-green-600"
                : "bg-gradient-to-r from-red-500 to-orange-500"
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {modalAcao.acao === "APROVADO"
                    ? modalAcao.isLiberacao
                      ? <LockOpenIcon className="w-7 h-7 text-white" />
                      : <ShieldCheckIcon className="w-7 h-7 text-white" />
                    : <ExclamationTriangleIcon className="w-7 h-7 text-white" />
                  }
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">
                    {modalAcao.acao === "APROVADO"
                      ? modalAcao.isLiberacao ? "Liberar Plano para Edição" : "Aprovar Plano"
                      : modalAcao.isLiberacao ? "Negar Solicitação de Liberação" : "Devolver Plano"
                    }
                  </h4>
                  <p className="text-white/80 text-sm font-medium">Confirme a ação</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className={`border rounded-xl px-4 py-3 mb-4 ${
                modalAcao.acao === "APROVADO"
                  ? modalAcao.isLiberacao ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Plano</span>
                <p className="font-bold text-gray-800">{modalAcao.turma} — {modalAcao.disciplina}</p>
              </div>

              {/* Aviso contextual: comportamento diferente para Novo PAP vs Liberação */}
              {modalAcao.isLiberacao && modalAcao.acao === "APROVADO" && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-sm font-semibold leading-snug">
                    Atenção: este plano já está aprovado e pode ter notas lançadas. Ao liberar, o professor poderá editar as atividades. Itens com notas lançadas não poderão ser removidos pelo sistema.
                  </p>
                </div>
              )}

              <p className="text-gray-600 text-sm leading-relaxed">
                {modalAcao.acao === "APROVADO"
                  ? modalAcao.isLiberacao
                    ? "Ao liberar, o professor poderá editar o plano e deverá reenviar para aprovação ao concluir."
                    : "Ao aprovar, o professor poderá iniciar o lançamento de notas no Registro de Avaliações."
                  : modalAcao.isLiberacao
                    ? "Ao negar, a solicitação de edição será recusada e o plano permanecerá protegido."
                    : "Ao devolver, o plano retornará ao professor para que seja revisado e reenviado."
                }
              </p>

              {/* Campo de motivo — somente para devolução */}
              {modalAcao.acao === "DEVOLVIDO" && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Motivo da devolução <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={motivoDevolucao}
                    onChange={(e) => setMotivoDevolucao(e.target.value)}
                    placeholder="Descreva o que precisa ser ajustado pelo professor..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-red-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-red-300 focus:border-red-300 outline-none resize-none transition"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Este motivo será exibido ao professor.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => { setModalAcao(null); setMotivoDevolucao(""); }}
                disabled={processandoAcao}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={executarAcao}
                disabled={processandoAcao}
                className={`px-5 py-2.5 font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 ${
                  modalAcao.acao === "APROVADO"
                    ? modalAcao.isLiberacao
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25"
                      : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                    : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-red-500/25"
                }`}
              >
                {processandoAcao
                  ? "Processando..."
                  : modalAcao.acao === "APROVADO"
                    ? modalAcao.isLiberacao ? "🔓 Confirmar Liberação" : "✓ Confirmar Aprovação"
                    : modalAcao.isLiberacao ? "Confirmar Negação" : "Confirmar Devolução"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
