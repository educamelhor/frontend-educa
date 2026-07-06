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
  LockClosedIcon,
  BookOpenIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

/**
 * Solicitações — Painel Multi-Tarefas da Coordenação / Direção
 * ──────────────────────────────────────────────────────────────
 * Centraliza todas as solicitações dos professores:
 * - Aprovação de PAP (Plano de Avaliação Pedagógica)
 * - Reabertura de Diário fechado
 * - Boletins (futuro)
 */

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
  { id: "pap",       label: "Planos de Avaliação (PAP)", icon: DocumentCheckIcon, cor: "indigo" },
  { id: "reabertura",label: "Reabertura de Diário",       icon: LockOpenIcon,      cor: "amber"  },
  { id: "boletins",  label: "Boletins",                   icon: DocumentTextIcon,  cor: "emerald"},
];

const avatarLetter = (nome) => (nome || "?").charAt(0).toUpperCase();

export default function SolicitacoesConteudos() {
  // ─── Estado geral ───
  const [categoriaAtiva, setCategoriaAtiva] = useState("pap");
  const [loading, setLoading]               = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  // ─── PAP ───
  const [solicitacoesPAP, setSolicitacoesPAP]       = useState([]);
  const [filtroTurma, setFiltroTurma]               = useState("");
  const [filtroDisciplina, setFiltroDisciplina]     = useState("");
  const [mostrarFiltros, setMostrarFiltros]         = useState(false);
  const [modalDetalhe, setModalDetalhe]             = useState(null);
  const [loadingDetalhe, setLoadingDetalhe]         = useState(false);
  const [modalAcao, setModalAcao]                   = useState(null);
  const [processandoAcao, setProcessandoAcao]       = useState(false);
  const [motivoDevolucao, setMotivoDevolucao]       = useState("");

  // ─── Reabertura de Diário ───
  const [solicitacoesReabertura, setSolicitacoesReabertura] = useState([]);
  const [loadingReabertura, setLoadingReabertura]           = useState(false);
  const [filtroStatusReab, setFiltroStatusReab]             = useState("PENDENTE");
  const [modalReabertura, setModalReabertura]               = useState(null); // { sol, acao: "APROVADA"|"NEGADA" }
  const [respostaReabertura, setRespostaReabertura]         = useState("");
  const [processandoReabertura, setProcessandoReabertura]   = useState(false);

  // ─── Mensagem ───
  const [msg, setMsg] = useState(null);
  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4500);
  };

  // ─── Carregar PAPs ───
  const carregarPAPs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/avaliacoes/solicitacoes/pendentes");
      if (data.ok) {
        setSolicitacoesPAP(data.solicitacoes || []);
        setUltimaAtualizacao(new Date());
      }
    } catch (err) {
      showMsg("error", "Erro ao carregar solicitações de PAP.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Carregar Reabertura ───
  const carregarReabertura = useCallback(async (status = "PENDENTE") => {
    setLoadingReabertura(true);
    try {
      const { data } = await api.get(`/avaliacoes/solicitacoes-reabertura?status=${status}`);
      if (data.ok) setSolicitacoesReabertura(data.solicitacoes || []);
    } catch (err) {
      showMsg("error", "Erro ao carregar solicitações de reabertura.");
    } finally {
      setLoadingReabertura(false);
    }
  }, []);

  useEffect(() => { carregarPAPs(); carregarReabertura("PENDENTE"); }, [carregarPAPs, carregarReabertura]);

  // ─── Ver detalhes PAP ───
  const verDetalhes = async (plano) => {
    setLoadingDetalhe(true);
    try {
      const { data } = await api.get(`/avaliacoes/${plano.id}`);
      setModalDetalhe({ plano, itens: data.itens || [], status: data.status });
    } catch {
      showMsg("error", "Erro ao carregar detalhes do plano.");
    } finally {
      setLoadingDetalhe(false);
    }
  };

  // ─── Executar ação PAP ───
  const executarAcao = async () => {
    if (!modalAcao) return;
    if (modalAcao.acao === "DEVOLVIDO" && !motivoDevolucao.trim()) {
      showMsg("error", "Informe o motivo da devolução.");
      return;
    }
    setProcessandoAcao(true);
    try {
      const statusFinal = modalAcao.acao === "APROVADO" && modalAcao.isLiberacao ? "LIBERADO" : modalAcao.acao;
      const payload = { status: statusFinal };
      if (modalAcao.acao === "DEVOLVIDO") payload.motivo = motivoDevolucao.trim();
      const { data } = await api.patch(`/avaliacoes/${modalAcao.id}/status`, payload);
      if (data.ok) {
        showMsg("success", modalAcao.acao === "APROVADO"
          ? `✅ Plano aprovado! (${modalAcao.turma})`
          : `↩️ Plano devolvido ao professor. (${modalAcao.turma})`);
        setModalAcao(null); setMotivoDevolucao(""); setModalDetalhe(null);
        carregarPAPs();
      }
    } catch (err) {
      showMsg("error", err?.response?.data?.error || "Erro ao processar solicitação.");
    } finally {
      setProcessandoAcao(false);
    }
  };

  // ─── Responder Reabertura ───
  const responderReabertura = async () => {
    if (!modalReabertura) return;
    if (modalReabertura.acao === "NEGADA" && !respostaReabertura.trim()) {
      showMsg("error", "Informe o motivo da negação.");
      return;
    }
    setProcessandoReabertura(true);
    try {
      const { data } = await api.patch(
        `/avaliacoes/solicitacoes-reabertura/${modalReabertura.sol.id}`,
        { status: modalReabertura.acao, resposta: respostaReabertura.trim() || null }
      );
      if (data.ok) {
        showMsg("success", modalReabertura.acao === "APROVADA"
          ? "🔓 Diário reaberto! O professor já pode editar as notas."
          : "❌ Solicitação negada.");
        setModalReabertura(null); setRespostaReabertura("");
        carregarReabertura(filtroStatusReab);
      }
    } catch (err) {
      showMsg("error", err?.response?.data?.error || "Erro ao processar resposta.");
    } finally {
      setProcessandoReabertura(false);
    }
  };

  // ─── Filtragem PAP ───
  const solicitacoesFiltradas = solicitacoesPAP.filter(s => {
    if (filtroTurma && !s.turmas?.toLowerCase().includes(filtroTurma.toLowerCase())) return false;
    if (filtroDisciplina && !s.disciplina?.toLowerCase().includes(filtroDisciplina.toLowerCase())) return false;
    return true;
  });

  // ─── KPIs ───
  const totalPAP        = solicitacoesPAP.length;
  const totalReabertura = solicitacoesReabertura.filter(s => s.status === "PENDENTE").length;
  const disciplinasUnicas   = [...new Set(solicitacoesPAP.map(s => s.disciplina))].length;
  const professoresUnicos   = [...new Set(solicitacoesPAP.map(s => s.professor_nome).filter(Boolean))].length;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

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
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Solicitações</h2>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Painel de governança — analise e gerencie solicitações dos professores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarFiltros(v => !v)}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                mostrarFiltros ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <FunnelIcon className="w-4 h-4 inline mr-1" />Filtros
            </button>
            <button
              onClick={() => { carregarPAPs(); carregarReabertura(filtroStatusReab); }}
              disabled={loading || loadingReabertura}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 inline mr-1 ${(loading || loadingReabertura) ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Filtrar por turma..." value={filtroTurma}
              onChange={e => setFiltroTurma(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
            <input type="text" placeholder="Filtrar por disciplina..." value={filtroDisciplina}
              onChange={e => setFiltroDisciplina(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
          </div>
        )}
      </section>

      {/* ═══ MENSAGEM ═══ */}
      {msg && (
        <div className={`p-4 rounded-xl font-bold shadow-sm flex items-center gap-3 transition-all ${
          msg.type === "success" ? "bg-green-100 text-green-800 border border-green-200" :
          msg.type === "error"   ? "bg-red-100 text-red-800 border border-red-200" :
          "bg-blue-100 text-blue-800 border border-blue-200"
        }`}>
          {msg.type === "success" ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg"><ClockIcon className="w-5 h-5 text-amber-600" /></div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">PAPs Pendentes</div>
              <div className="text-2xl font-black text-gray-800">{totalPAP}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg"><LockClosedIcon className="w-5 h-5 text-amber-600" /></div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reaberturas</div>
              <div className="text-2xl font-black text-gray-800">{totalReabertura}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg"><AcademicCapIcon className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Professores</div>
              <div className="text-2xl font-black text-gray-800">{professoresUnicos}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg"><DocumentCheckIcon className="w-5 h-5 text-violet-600" /></div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Disciplinas</div>
              <div className="text-2xl font-black text-gray-800">{disciplinasUnicas}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIAS.map(cat => {
          const CatIcon = cat.icon;
          const isActive = categoriaAtiva === cat.id;
          const badge = cat.id === "pap" ? totalPAP : cat.id === "reabertura" ? totalReabertura : 0;
          return (
            <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                isActive
                  ? `bg-${cat.cor}-50 text-${cat.cor}-700 border-${cat.cor}-200 shadow-sm`
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <CatIcon className="w-4 h-4" />
              {cat.label}
              {badge > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ CONTEÚDO: PAP ═══ */}
      {categoriaAtiva === "pap" && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                                <img src={toPublicUrl(sol.professor_foto)} alt={sol.professor_nome || "Professor"}
                                  className="w-full h-full object-cover"
                                  onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
                              ) : null}
                              <span className="w-full h-full flex items-center justify-center" style={{ display: sol.professor_foto ? "none" : "flex" }}>
                                {avatarLetter(sol.professor_nome)}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-800 text-sm">{sol.professor_nome || "Professor"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700 text-sm">{sol.turmas}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{sol.disciplina}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{sol.bimestre}</td>
                        <td className="px-6 py-4 text-center">
                          {sol.status === "LIBERACAO_SOLICITADA" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                              <LockOpenIcon className="w-3.5 h-3.5" />Liberação
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                              <ClockIcon className="w-3.5 h-3.5" />Novo PAP
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-gray-500">
                          {sol.updated_at ? new Date(sol.updated_at).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => verDetalhes(sol)}
                              className="p-2 rounded-lg bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 transition" title="Ver detalhes">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            {sol.status === "LIBERACAO_SOLICITADA" ? (
                              <button onClick={() => setModalAcao({ id: sol.id, turma: sol.turmas, disciplina: sol.disciplina, acao: "APROVADO", isLiberacao: true })}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition" title="Liberar">
                                <LockOpenIcon className="w-3.5 h-3.5" />Liberar
                              </button>
                            ) : (
                              <button onClick={() => setModalAcao({ id: sol.id, turma: sol.turmas, disciplina: sol.disciplina, acao: "APROVADO", isLiberacao: false })}
                                className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition" title="Aprovar">
                                <CheckCircleIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setModalAcao({ id: sol.id, turma: sol.turmas, disciplina: sol.disciplina, acao: "DEVOLVIDO", isLiberacao: sol.status === "LIBERACAO_SOLICITADA" })}
                              className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition" title="Devolver">
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
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>{solicitacoesFiltradas.length} solicitação(ões) exibida(s)</span>
            <span className="flex items-center gap-1.5"><ShieldCheckIcon className="w-4 h-4" />Governança: professor solicita, coordenação decide</span>
          </div>
        </section>
      )}

      {/* ═══ CONTEÚDO: REABERTURA DE DIÁRIO ═══ */}
      {categoriaAtiva === "reabertura" && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Banner header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <LockOpenIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reabertura de Diário</h3>
                <p className="text-amber-100 text-xs font-medium">Solicitações de professores para reabrir diários fechados</p>
              </div>
            </div>
            {/* Filtro de status */}
            <div className="flex items-center gap-2">
              {["PENDENTE","APROVADA","NEGADA","todas"].map(st => (
                <button key={st}
                  onClick={() => { setFiltroStatusReab(st); carregarReabertura(st); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filtroStatusReab === st
                      ? "bg-white text-amber-700 shadow"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {st === "todas" ? "Todas" : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Cards de reabertura */}
          <div className="p-6">
            {loadingReabertura ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-gray-400">Carregando solicitações...</span>
                </div>
              </div>
            ) : solicitacoesReabertura.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                  <LockClosedIcon className="w-10 h-10 text-amber-300" />
                </div>
                <h4 className="text-lg font-bold text-gray-500">Nenhuma solicitação de reabertura</h4>
                <p className="text-sm text-gray-400 mt-1 max-w-sm">
                  {filtroStatusReab === "PENDENTE"
                    ? "Quando professores solicitarem reabertura de diários fechados, elas aparecerão aqui."
                    : `Nenhuma solicitação com status "${filtroStatusReab.toLowerCase()}".`}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {solicitacoesReabertura.map(sol => {
                  const isPendente = sol.status === "PENDENTE";
                  const isAprovada = sol.status === "APROVADA";
                  return (
                    <div key={sol.id}
                      className="rounded-2xl border overflow-hidden transition-all hover:shadow-md"
                      style={{
                        borderColor: isPendente ? "rgba(245,158,11,0.3)" : isAprovada ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
                        background: isPendente ? "rgba(255,251,235,0.6)" : isAprovada ? "rgba(240,253,244,0.6)" : "rgba(254,242,242,0.6)",
                      }}
                    >
                      {/* Status strip */}
                      <div className="px-5 py-2 flex items-center gap-2"
                        style={{
                          background: isPendente ? "rgba(245,158,11,0.12)" : isAprovada ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        }}
                      >
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                          isPendente ? "bg-amber-500 text-white" : isAprovada ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                        }`}>
                          {isPendente ? "⏳ PENDENTE" : isAprovada ? "✅ APROVADA" : "❌ NEGADA"}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">Solicitado em {formatDate(sol.criado_em)}</span>
                      </div>

                      <div className="p-5">
                        <div className="flex flex-col sm:flex-row gap-5">
                          {/* Coluna esquerda: professor */}
                          <div className="flex items-center gap-3 sm:w-56 flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-lg overflow-hidden flex-shrink-0 shadow">
                              {sol.professor_foto ? (
                                <img src={toPublicUrl(sol.professor_foto)} alt={sol.professor_nome}
                                  className="w-full h-full object-cover"
                                  onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
                              ) : null}
                              <span style={{ display: sol.professor_foto ? "none" : "flex" }}>
                                {avatarLetter(sol.professor_nome)}
                              </span>
                            </div>
                            <div>
                              <div className="font-black text-gray-800 text-sm leading-tight">{sol.professor_nome || "Professor"}</div>
                              <div className="text-xs text-gray-400 font-medium mt-0.5">Professor(a)</div>
                            </div>
                          </div>

                          {/* Coluna central: dados */}
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Turma</div>
                              <div className="font-black text-gray-800 text-sm">{sol.turma_nome || "—"}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Disciplina</div>
                              <div className="font-black text-gray-800 text-sm">{sol.disciplina || "—"}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bimestre</div>
                              <div className="font-black text-gray-800 text-sm">{sol.bimestre || "—"}</div>
                            </div>
                            {sol.aluno_nome && (
                              <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 col-span-2 sm:col-span-3">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Aluno com nota a alterar</div>
                                <div className="font-bold text-gray-800 text-sm">👤 {sol.aluno_nome}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Motivo */}
                        <div className="mt-4 rounded-xl p-4 border"
                          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}>
                          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">📝 Motivo da solicitação</div>
                          <p className="text-gray-700 text-sm leading-relaxed">{sol.motivo}</p>
                        </div>

                        {/* Resposta (se já respondida) */}
                        {sol.resposta_pedagogico && (
                          <div className="mt-3 rounded-xl p-4 border"
                            style={{
                              background: isAprovada ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                              borderColor: isAprovada ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                            }}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1"
                              style={{ color: isAprovada ? "#059669" : "#dc2626" }}>
                              💬 Resposta do Pedagógico ({formatDate(sol.respondido_em)})
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">{sol.resposta_pedagogico}</p>
                          </div>
                        )}

                        {/* Ações (somente pendentes) */}
                        {isPendente && (
                          <div className="mt-4 flex gap-3 justify-end">
                            <button
                              onClick={() => { setModalReabertura({ sol, acao: "NEGADA" }); setRespostaReabertura(""); }}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm transition active:scale-95"
                            >
                              <XCircleIcon className="w-4 h-4" />
                              Negar Reabertura
                            </button>
                            <button
                              onClick={() => { setModalReabertura({ sol, acao: "APROVADA" }); setRespostaReabertura(""); }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition active:scale-95"
                              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 4px 14px rgba(245,158,11,0.35)" }}
                            >
                              <LockOpenIcon className="w-4 h-4" />
                              🔓 Aprovar — Reabrir Diário
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>{solicitacoesReabertura.length} solicitação(ões) exibida(s)</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4" />Aprovação remove o fechamento — professor poderá editar novamente
            </span>
          </div>
        </section>
      )}

      {/* ═══ CONTEÚDO: BOLETINS (futuro) ═══ */}
      {categoriaAtiva === "boletins" && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <DocumentTextIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Boletins</h3>
              <p className="text-emerald-100 text-xs font-medium">Visualize e gerencie os boletins exportados pelos professores</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <BookOpenIcon className="w-10 h-10 text-emerald-300" />
            </div>
            <h4 className="text-lg font-bold text-gray-500">Em breve</h4>
            <p className="text-sm text-gray-400 mt-2 max-w-sm">
              O painel de boletins estará disponível em breve. Aqui você poderá visualizar, filtrar e gerar relatórios dos boletins de todos os alunos.
            </p>
            <span className="mt-4 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">🚧 Em desenvolvimento</span>
          </div>
        </section>
      )}

      {/* ═══ MODAL — DETALHES DO PLANO (PAP) ═══ */}
      {modalDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setModalDetalhe(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><DocumentCheckIcon className="w-7 h-7 text-white" /></div>
                <div>
                  <h4 className="text-lg font-black text-white">Detalhes do Plano</h4>
                  <p className="text-indigo-200 text-sm font-medium">{modalDetalhe.plano.professor_nome || "Professor"} — {modalDetalhe.plano.turmas}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap gap-4 text-sm flex-shrink-0">
              {[["Disciplina", modalDetalhe.plano.disciplina], ["Bimestre", modalDetalhe.plano.bimestre], ["Turma", modalDetalhe.plano.turmas],
                ["Total Pontos", `${modalDetalhe.itens.reduce((acc, it) => acc + Number(it.nota_total || 0), 0)} / 10`]
              ].map(([label, val]) => (
                <div key={label} className="bg-white border rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">{label}</span>
                  <span className="font-bold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
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
                      <td className="px-4 py-3 text-center text-gray-600">{((item.nota_total || 0) / (item.oportunidades || 1)).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {item.fixo_direcao
                          ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">FIXO</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
              <button onClick={() => setModalDetalhe(null)} className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition">Fechar</button>
              <div className="flex gap-3">
                <button onClick={() => setModalAcao({ id: modalDetalhe.plano.id, turma: modalDetalhe.plano.turmas, disciplina: modalDetalhe.plano.disciplina, acao: "DEVOLVIDO", isLiberacao: modalDetalhe.plano.status === "LIBERACAO_SOLICITADA" })}
                  className="px-5 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition">
                  {modalDetalhe.plano.status === "LIBERACAO_SOLICITADA" ? "Negar Liberação" : "Devolver"}
                </button>
                <button onClick={() => setModalAcao({ id: modalDetalhe.plano.id, turma: modalDetalhe.plano.turmas, disciplina: modalDetalhe.plano.disciplina, acao: "APROVADO", isLiberacao: modalDetalhe.plano.status === "LIBERACAO_SOLICITADA" })}
                  className={`px-5 py-2.5 font-bold rounded-xl shadow-lg transition active:scale-95 ${
                    modalDetalhe.plano.status === "LIBERACAO_SOLICITADA"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25"
                      : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                  }`}>
                  {modalDetalhe.plano.status === "LIBERACAO_SOLICITADA" ? "🔓 Liberar para Edição" : "✓ Aprovar Plano"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL — CONFIRMAÇÃO DE AÇÃO PAP ═══ */}
      {modalAcao && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { if (!processandoAcao) { setModalAcao(null); setMotivoDevolucao(""); } }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`px-6 py-5 ${
              modalAcao.acao === "APROVADO"
                ? modalAcao.isLiberacao ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-green-600"
                : "bg-gradient-to-r from-red-500 to-orange-500"
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {modalAcao.acao === "APROVADO"
                    ? modalAcao.isLiberacao ? <LockOpenIcon className="w-7 h-7 text-white" /> : <ShieldCheckIcon className="w-7 h-7 text-white" />
                    : <ExclamationTriangleIcon className="w-7 h-7 text-white" />}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">
                    {modalAcao.acao === "APROVADO"
                      ? modalAcao.isLiberacao ? "Liberar Plano para Edição" : "Aprovar Plano"
                      : modalAcao.isLiberacao ? "Negar Solicitação de Liberação" : "Devolver Plano"}
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
              {modalAcao.isLiberacao && modalAcao.acao === "APROVADO" && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-sm font-semibold leading-snug">
                    Atenção: este plano já está aprovado e pode ter notas lançadas. Ao liberar, o professor poderá editar as atividades.
                  </p>
                </div>
              )}
              <p className="text-gray-600 text-sm leading-relaxed">
                {modalAcao.acao === "APROVADO"
                  ? modalAcao.isLiberacao ? "Ao liberar, o professor poderá editar o plano e deverá reenviar para aprovação ao concluir." : "Ao aprovar, o professor poderá iniciar o lançamento de notas no Registro de Avaliações."
                  : modalAcao.isLiberacao ? "Ao negar, a solicitação de edição será recusada e o plano permanecerá protegido." : "Ao devolver, o plano retornará ao professor para revisão."}
              </p>
              {modalAcao.acao === "DEVOLVIDO" && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Motivo da devolução <span className="text-red-500">*</span>
                  </label>
                  <textarea value={motivoDevolucao} onChange={e => setMotivoDevolucao(e.target.value)}
                    placeholder="Descreva o que precisa ser ajustado pelo professor..." rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-red-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-red-300 outline-none resize-none transition" />
                  <p className="text-[11px] text-gray-400 mt-1">Este motivo será exibido ao professor.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => { setModalAcao(null); setMotivoDevolucao(""); }} disabled={processandoAcao}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition">Cancelar</button>
              <button onClick={executarAcao} disabled={processandoAcao}
                className={`px-5 py-2.5 font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 ${
                  modalAcao.acao === "APROVADO"
                    ? modalAcao.isLiberacao ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                    : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                }`}>
                {processandoAcao ? "Processando..." : modalAcao.acao === "APROVADO"
                  ? modalAcao.isLiberacao ? "🔓 Confirmar Liberação" : "✓ Confirmar Aprovação"
                  : modalAcao.isLiberacao ? "Confirmar Negação" : "Confirmar Devolução"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL — RESPOSTA REABERTURA DE DIÁRIO ═══ */}
      {modalReabertura && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => { if (!processandoReabertura) { setModalReabertura(null); setRespostaReabertura(""); } }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`px-6 py-5 ${modalReabertura.acao === "APROVADA" ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-red-500 to-rose-600"}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {modalReabertura.acao === "APROVADA" ? <LockOpenIcon className="w-7 h-7 text-white" /> : <XCircleIcon className="w-7 h-7 text-white" />}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">
                    {modalReabertura.acao === "APROVADA" ? "🔓 Aprovar Reabertura" : "❌ Negar Reabertura"}
                  </h4>
                  <p className="text-white/80 text-sm">
                    {modalReabertura.acao === "APROVADA" ? "O diário será desbloqueado para edição" : "A solicitação será recusada"}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              {/* Resumo */}
              <div className="rounded-xl p-4 mb-4 border" style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Professor</div>
                    <div className="font-bold text-gray-800">{modalReabertura.sol.professor_nome || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Turma</div>
                    <div className="font-bold text-gray-800">{modalReabertura.sol.turma_nome || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Disciplina</div>
                    <div className="font-bold text-gray-800">{modalReabertura.sol.disciplina || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Bimestre</div>
                    <div className="font-bold text-gray-800">{modalReabertura.sol.bimestre || "—"}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Motivo solicitado pelo professor</div>
                  <p className="text-gray-700 text-sm leading-relaxed">{modalReabertura.sol.motivo}</p>
                </div>
              </div>

              {/* Aviso APROVADA */}
              {modalReabertura.acao === "APROVADA" && (
                <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-sm leading-snug">
                    <strong>Atenção:</strong> Ao aprovar, o registro de fechamento será <strong>removido</strong> e o professor poderá editar e relançar notas livremente.
                  </p>
                </div>
              )}

              {/* Resposta / justificativa */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {modalReabertura.acao === "NEGADA" ? <>Motivo da negação <span className="text-red-500">*</span></> : "Observação (opcional)"}
                </label>
                <textarea
                  value={respostaReabertura}
                  onChange={e => setRespostaReabertura(e.target.value)}
                  placeholder={modalReabertura.acao === "NEGADA"
                    ? "Explique ao professor por que a reabertura foi negada..."
                    : "Deixe uma observação para o professor (ex: prazo para correção)..."}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 outline-none resize-none transition ${
                    modalReabertura.acao === "NEGADA" ? "border-red-200 focus:ring-red-300" : "border-amber-200 focus:ring-amber-300"
                  }`}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => { setModalReabertura(null); setRespostaReabertura(""); }} disabled={processandoReabertura}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition">Cancelar</button>
              <button onClick={responderReabertura} disabled={processandoReabertura}
                className={`px-5 py-2.5 font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 text-white ${
                  modalReabertura.acao === "APROVADA"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                }`}>
                {processandoReabertura ? "Processando..." : modalReabertura.acao === "APROVADA" ? "🔓 Sim, Reabrir Diário" : "❌ Confirmar Negação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
