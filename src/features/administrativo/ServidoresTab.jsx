// src/features/administrativo/ServidoresTab.jsx
// ============================================================================
// Aba 1: QUADRO UNIFICADO DE SERVIDORES, PROFESSORES & TERCEIRIZADOS
// - Lista automaticamente todos os Professores, Membros da Direção/Secretaria
//   e Servidores/Terceirizados (com ou sem acesso ao sistema).
// - Permite Cadastrar, Editar, Ativar/Inativar, Excluir, Lançar Ocorrências e
//   abrir o Prontuário / Dossiê 360º Individual do Servidor.
// ============================================================================

import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  IdentificationIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
  NoSymbolIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  CATEGORIAS_SERVIDOR,
  VINCULOS_SERVIDOR,
  CARGAS_HORARIAS,
  TURNOS_TRABALHO,
  LIMITE_ABONOS_ANUAL,
  TIPOS_OCORRENCIA_ADMIN,
  formatarCPF,
  limparCPF,
} from "./useAdministrativoData";

function getCategoriaMeta(cat) {
  return (
    CATEGORIAS_SERVIDOR.find((c) => c.value === cat) || {
      value: cat,
      label: "Servidor / Colaborador",
      cor: "#475569",
      bg: "#f1f5f9",
    }
  );
}

function getVinculoLabel(v) {
  return VINCULOS_SERVIDOR.find((x) => x.value === v)?.label || v || "Efetivo";
}

function fmtDataBR(iso) {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function ServidoresTab({
  servidores = [],
  ocorrencias = [],
  statsPorServidor = {},
  loading = false,
  onSalvarServidor,
  onAlternarStatus,
  onExcluirServidor,
  onAbrirModalOcorrencia,
  onAtualizarStatusOcorrencia,
  onExcluirOcorrencia,
}) {
  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroAcesso, setFiltroAcesso] = useState("todos"); // todos | com_acesso | sem_acesso
  const [filtroVinculo, setFiltroVinculo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("ativos"); // ativos | inativos | todos

  // Modal Cadastro / Edição de Servidor
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [servidorEditando, setServidorEditando] = useState(null);
  const [salvandoForm, setSalvandoForm] = useState(false);

  // Estado do formulário de Servidor
  const [form, setForm] = useState({
    id: null,
    nome: "",
    cpf: "",
    matricula: "",
    cargo: "",
    categoria: "terceirizado",
    vinculo: "terceirizado",
    empresa: "",
    carga_horaria: "40h",
    turno: "Integral",
    setor: "",
    horario_trabalho: "07:30 às 17:30",
    telefone: "",
    email: "",
    acesso_sistema: false,
    funcao_sistema: "administrativo",
    ativo: true,
    observacoes: "",
  });

  // Modal Dossiê / Prontuário 360º do Servidor
  const [dossieServidorId, setDossieServidorId] = useState(null);

  // Modal Confirmação de Exclusão
  const [confirmExcluir, setConfirmExcluir] = useState(null);

  const dossieServidor = useMemo(
    () => servidores.find((s) => s.id === dossieServidorId) || null,
    [servidores, dossieServidorId]
  );

  // KPIs do Quadro Geral
  const kpis = useMemo(() => {
    const ativos = servidores.filter((s) => s.ativo);
    const totalProfs = ativos.filter((s) => s.categoria === "professor").length;
    const totalGestaoAdmin = ativos.filter((s) =>
      ["direcao", "pedagogico", "administrativo", "disciplinar"].includes(s.categoria)
    ).length;
    const totalTerceirizadosApoio = ativos.filter((s) =>
      ["terceirizado", "apoio"].includes(s.categoria) || s.vinculo === "terceirizado"
    ).length;
    const comAcesso = ativos.filter((s) => s.acesso_sistema).length;
    const semAcesso = ativos.filter((s) => !s.acesso_sistema).length;

    return {
      totalAtivos: ativos.length,
      totalGeral: servidores.length,
      totalProfs,
      totalGestaoAdmin,
      totalTerceirizadosApoio,
      comAcesso,
      semAcesso,
    };
  }, [servidores]);

  // Lista Filtrada
  const servidoresFiltrados = useMemo(() => {
    return servidores.filter((s) => {
      if (filtroStatus === "ativos" && !s.ativo) return false;
      if (filtroStatus === "inativos" && s.ativo) return false;
      if (filtroCategoria !== "todos" && s.categoria !== filtroCategoria) return false;
      if (filtroVinculo !== "todos" && s.vinculo !== filtroVinculo) return false;
      if (filtroAcesso === "com_acesso" && !s.acesso_sistema) return false;
      if (filtroAcesso === "sem_acesso" && s.acesso_sistema) return false;

      if (!busca.trim()) return true;
      const q = busca.toLowerCase().trim();
      return (
        (s.nome || "").toLowerCase().includes(q) ||
        (s.cpf || "").includes(q) ||
        formatarCPF(s.cpf).includes(q) ||
        (s.matricula || "").toLowerCase().includes(q) ||
        (s.cargo || "").toLowerCase().includes(q) ||
        (s.setor || "").toLowerCase().includes(q) ||
        (s.empresa || "").toLowerCase().includes(q)
      );
    });
  }, [servidores, filtroStatus, filtroCategoria, filtroVinculo, filtroAcesso, busca]);

  // Abrir modal de Novo Servidor
  const abrirNovoServidor = () => {
    setServidorEditando(null);
    setForm({
      id: null,
      nome: "",
      cpf: "",
      matricula: "",
      cargo: "",
      categoria: "terceirizado",
      vinculo: "terceirizado",
      empresa: "",
      carga_horaria: "44h",
      turno: "Integral",
      setor: "",
      horario_trabalho: "07:00 às 17:00",
      telefone: "",
      email: "",
      acesso_sistema: false,
      funcao_sistema: "administrativo",
      ativo: true,
      observacoes: "",
    });
    setModalFormAberto(true);
  };

  // Abrir modal de Edição de Servidor
  const abrirEditarServidor = (srv) => {
    setServidorEditando(srv);
    setForm({
      id: srv.id,
      nome: srv.nome || "",
      cpf: formatarCPF(srv.cpf) === "—" ? "" : formatarCPF(srv.cpf),
      matricula: srv.matricula || "",
      cargo: srv.cargo || "",
      categoria: srv.categoria || "administrativo",
      vinculo: srv.vinculo || "efetivo",
      empresa: srv.empresa || "SEEDF",
      carga_horaria: srv.carga_horaria || "40h",
      turno: srv.turno || "Integral",
      setor: srv.setor || "",
      horario_trabalho: srv.horario_trabalho || "07:30 às 17:30",
      telefone: srv.telefone || "",
      email: srv.email || "",
      acesso_sistema: Boolean(srv.acesso_sistema),
      funcao_sistema: srv.funcao_sistema || "administrativo",
      ativo: Boolean(srv.ativo),
      observacoes: srv.observacoes || "",
    });
    setModalFormAberto(true);
  };

  const handleSalvarForm = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome completo do servidor ou colaborador.");
      return;
    }
    if (!form.cargo.trim()) {
      toast.error("Informe o cargo ou função desempenhada na escola.");
      return;
    }

    setSalvandoForm(true);
    try {
      await onSalvarServidor({
        ...form,
        nome: form.nome.trim(),
        cpf: limparCPF(form.cpf),
        cargo: form.cargo.trim(),
        matricula: form.matricula.trim() || `ADM-${Date.now().toString().slice(-4)}`,
        empresa: form.empresa.trim() || (form.vinculo === "terceirizado" ? "Empresa Terceirizada" : "SEEDF"),
        setor: form.setor.trim() || form.cargo.trim(),
      });
      toast.success(
        servidorEditando
          ? "Dados funcionais do servidor atualizados!"
          : "Servidor / colaborador cadastrado com sucesso!"
      );
      setModalFormAberto(false);
    } catch {
      toast.error("Não foi possível salvar os dados do servidor.");
    } finally {
      setSalvandoForm(false);
    }
  };

  const ocorrenciasDoDossie = useMemo(() => {
    if (!dossieServidor) return [];
    return ocorrencias
      .filter((o) => o.servidor_id === dossieServidor.id)
      .sort((a, b) => String(b.data_inicio || "").localeCompare(String(a.data_inicio || "")));
  }, [ocorrencias, dossieServidor]);

  return (
    <div className="space-y-6">
      {/* ── KPIs Executivos ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <UserGroupIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total na Escola
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {kpis.totalAtivos}
              <span className="text-xs font-normal text-slate-400 ml-1">ativos</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Todos os quadros unificados
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <AcademicCapIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Corpo Docente
            </div>
            <div className="text-2xl font-extrabold text-indigo-700">
              {kpis.totalProfs}
            </div>
            <div className="text-[11px] text-slate-500">
              Professores sincronizados
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <BuildingOffice2Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Gestão & Secretaria
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">
              {kpis.totalGestaoAdmin}
            </div>
            <div className="text-[11px] text-slate-500">
              Direção, coord. e técnicos
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <WrenchScrewdriverIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Terceirizados & Apoio
            </div>
            <div className="text-2xl font-extrabold text-amber-700">
              {kpis.totalTerceirizadosApoio}
            </div>
            <div className="text-[11px] text-slate-500">
              Limpeza, portaria, merenda
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Acesso ao Sistema
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-emerald-600">
                {kpis.comAcesso} <span className="text-[10px] font-semibold">c/ login</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-lg font-extrabold text-amber-600">
                {kpis.semAcesso} <span className="text-[10px] font-semibold">internos</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Com e sem acesso ao portal
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de Busca, Filtros e Botões de Ação ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Busca */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar servidor por nome, CPF, matrícula, cargo, disciplina, setor ou empresa..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Botões Principais */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onAbrirModalOcorrencia(null, "abono")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition"
            >
              <CalendarDaysIcon className="h-4 w-4" />
              + Registrar Abono / Atestado / Acordo
            </button>

            <button
              type="button"
              onClick={abrirNovoServidor}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 transition"
              style={{
                background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Cadastrar Servidor / Terceirizado
            </button>
          </div>
        </div>

        {/* Filtros Secundários */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="todos">📂 Todas as Categorias ({servidores.length})</option>
            {CATEGORIAS_SERVIDOR.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={filtroAcesso}
            onChange={(e) => setFiltroAcesso(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="todos">🔐 Todos (Com e Sem Acesso ao Sistema)</option>
            <option value="com_acesso">✅ Com Acesso ao Sistema (Professores / Direção)</option>
            <option value="sem_acesso">📋 Sem Acesso ao Sistema (Terceirizados / Registro Interno)</option>
          </select>

          <select
            value={filtroVinculo}
            onChange={(e) => setFiltroVinculo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="todos">🏛️ Todos os Vínculos Funcionais</option>
            {VINCULOS_SERVIDOR.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ativos">🟢 Somente Servidores Ativos</option>
            <option value="inativos">🔴 Somente Inativos / Desligados</option>
            <option value="todos">📋 Todos os Status</option>
          </select>
        </div>
      </div>

      {/* ── Tabela Unificada de Servidores ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Relação Geral de Servidores e Colaboradores
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {servidoresFiltrados.length} exibidos
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Sincronizado automaticamente com <strong>Professores</strong> e <strong>Cadastro da Direção</strong>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              Unificando professores, direção, secretaria e quadro administrativo...
            </p>
          </div>
        ) : servidoresFiltrados.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserGroupIcon className="h-12 w-12 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-700">
              Nenhum servidor encontrado com os filtros selecionados
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Ajuste os filtros de busca ou clique em &ldquo;Cadastrar Servidor / Terceirizado&rdquo; para incluir um novo profissional.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3.5 px-4">Servidor / Identificação</th>
                  <th className="py-3.5 px-4">Cargo / Lotação / Empresa</th>
                  <th className="py-3.5 px-4">Origem & Acesso</th>
                  <th className="py-3.5 px-4">Vínculo & Jornada</th>
                  <th className="py-3.5 px-4">Abonos / Ocorrências (Ano)</th>
                  <th className="py-3.5 px-4 text-center">Situação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {servidoresFiltrados.map((srv) => {
                  const catMeta = getCategoriaMeta(srv.categoria);
                  const st = statsPorServidor[srv.id] || {
                    abonosUsados: 0,
                    abonosRestantes: LIMITE_ABONOS_ANUAL,
                    diasAtestado: 0,
                    totalAusencias: 0,
                    negociacoesPendentes: 0,
                  };
                  const iniciais = String(srv.nome || "S")
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={srv.id}
                      className={`hover:bg-blue-50/40 transition ${
                        !srv.ativo ? "opacity-60 bg-slate-50/60" : ""
                      }`}
                    >
                      {/* Servidor / Identificação */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-xl font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-sm"
                            style={{
                              backgroundColor: catMeta.bg,
                              color: catMeta.cor,
                              border: `1px solid ${catMeta.cor}30`,
                            }}
                          >
                            {iniciais}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setDossieServidorId(srv.id)}
                              className="font-bold text-slate-800 hover:text-blue-700 text-left transition flex items-center gap-1.5"
                            >
                              <span>{srv.nome}</span>
                            </button>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                              <span>CPF: {formatarCPF(srv.cpf)}</span>
                              {srv.matricula && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[11px] text-slate-600">
                                    Mat: {srv.matricula}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo / Lotação */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {srv.cargo}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {srv.setor || catMeta.label}
                          {srv.empresa ? ` • ${srv.empresa}` : ""}
                        </div>
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                          style={{
                            backgroundColor: catMeta.bg,
                            color: catMeta.cor,
                          }}
                        >
                          {catMeta.label}
                        </span>
                      </td>

                      {/* Origem & Acesso ao Sistema */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          {srv.acesso_sistema ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheckIcon className="h-3.5 w-3.5" />
                              Com Acesso ao Sistema
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <IdentificationIcon className="h-3.5 w-3.5" />
                              Sem Acesso (Interno)
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-medium pl-1">
                            {srv.origem === "professores"
                              ? "Sincronizado de Professores"
                              : srv.origem === "direcao"
                              ? "Sincronizado da Direção"
                              : srv.origem === "disciplinar"
                              ? "Sincronizado Equipe Militar"
                              : "Cadastro Administrativo"}
                          </span>
                        </div>
                      </td>

                      {/* Vínculo & Jornada */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-bold text-slate-700">
                          {getVinculoLabel(srv.vinculo)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">{srv.carga_horaria || "40h"}</span> • {srv.turno || "Integral"}
                        </div>
                        {srv.horario_trabalho && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            🕒 {srv.horario_trabalho}
                          </div>
                        )}
                      </td>

                      {/* Abonos / Ocorrências no Ano */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 max-w-[185px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-600">Abonos:</span>
                            <span
                              className={`font-extrabold ${
                                st.abonosUsados >= LIMITE_ABONOS_ANUAL
                                  ? "text-red-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {st.abonosUsados}/{LIMITE_ABONOS_ANUAL} usados
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (st.abonosUsados / LIMITE_ABONOS_ANUAL) * 100
                                )}%`,
                                backgroundColor:
                                  st.abonosUsados >= LIMITE_ABONOS_ANUAL
                                    ? "#dc2626"
                                    : st.abonosUsados >= 3
                                    ? "#f59e0b"
                                    : "#10b981",
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {st.diasAtestado > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                🏥 {st.diasAtestado}d atestado
                              </span>
                            )}
                            {st.negociacoesPendentes > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                🤝 {st.negociacoesPendentes} acordo pend.
                              </span>
                            )}
                            {st.totalAusencias > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                ⚠️ {st.totalAusencias} ausência(s)
                              </span>
                            )}
                            {st.diasAtestado === 0 &&
                              st.negociacoesPendentes === 0 &&
                              st.totalAusencias === 0 && (
                                <span className="text-[10px] text-slate-400">
                                  Sem afastamentos
                                </span>
                              )}
                          </div>
                        </div>
                      </td>

                      {/* Situação */}
                      <td className="py-3.5 px-4 text-center">
                        {!srv.ativo ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            Inativo
                          </span>
                        ) : st.emAfastamentoHoje ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Em {st.motivoAfastamentoHoje === "atestado" ? "Atestado" : "Abono/Acordo"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            Ativo
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDossieServidorId(srv.id)}
                            title="Abrir Prontuário / Dossiê 360º do Servidor"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1"
                          >
                            <IdentificationIcon className="h-4 w-4" />
                            <span className="hidden xl:inline">Dossiê</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onAbrirModalOcorrencia(srv, "abono")}
                            title="Lançar Abono, Atestado, Ausência ou Negociação"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition"
                          >
                            <CalendarDaysIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => abrirEditarServidor(srv)}
                            title="Editar Dados Funcionais / Jornada"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onAlternarStatus(srv);
                              toast.success(
                                srv.ativo
                                  ? `${srv.nome} marcado como inativo.`
                                  : `${srv.nome} reativado no quadro!`
                              );
                            }}
                            title={srv.ativo ? "Inativar Servidor" : "Reativar Servidor"}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white transition"
                          >
                            <NoSymbolIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmExcluir(srv)}
                            title="Excluir da listagem administrativa"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CADASTRAR / EDITAR SERVIDOR (COM OU SEM ACESSO AO SISTEMA)
         ══════════════════════════════════════════════════════════════════════ */}
      {modalFormAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div
              className="px-6 py-4 flex items-center justify-between text-white"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
              }}
            >
              <div>
                <h3 className="text-lg font-bold">
                  {servidorEditando
                    ? "Editar Dados Funcionais do Servidor"
                    : "Cadastrar Servidor / Colaborador / Terceirizado"}
                </h3>
                <p className="text-xs text-blue-200">
                  Cadastre profissionais com ou sem acesso ao sistema para controle de ponto, abonos e ocorrências
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalFormAberto(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarForm} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Nome, CPF e Matrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: Raimundo Nonato de Souza"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Categoria, Cargo e Matrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Categoria no Quadro *
                  </label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
                  >
                    {CATEGORIAS_SERVIDOR.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Cargo / Função *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.cargo}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    placeholder="Ex: Auxiliar de Limpeza / Vigilante"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Matrícula / Contrato
                  </label>
                  <input
                    type="text"
                    value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                    placeholder="Ex: SEEDF-19203 ou TERC-04"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Vínculo, Empresa/Órgão e Setor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Vínculo Funcional
                  </label>
                  <select
                    value={form.vinculo}
                    onChange={(e) => setForm({ ...form, vinculo: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
                  >
                    {VINCULOS_SERVIDOR.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Órgão / Empresa Terceirizada
                  </label>
                  <input
                    type="text"
                    value={form.empresa}
                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                    placeholder="Ex: SEEDF ou Conservadora Ltda"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Setor / Lotação Interna
                  </label>
                  <input
                    type="text"
                    value={form.setor}
                    onChange={(e) => setForm({ ...form, setor: e.target.value })}
                    placeholder="Ex: Portaria / Bloco B / Cozinha"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Carga Horária, Turno e Horário de Trabalho */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Carga Horária
                  </label>
                  <select
                    value={form.carga_horaria}
                    onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {CARGAS_HORARIAS.map((ch) => (
                      <option key={ch.value} value={ch.value}>
                        {ch.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Turno
                  </label>
                  <select
                    value={form.turno}
                    onChange={(e) => setForm({ ...form, turno: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {TURNOS_TRABALHO.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Horário Padrão (Ponto)
                  </label>
                  <input
                    type="text"
                    value={form.horario_trabalho}
                    onChange={(e) => setForm({ ...form, horario_trabalho: e.target.value })}
                    placeholder="Ex: 07:30 às 17:30"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              {/* Contato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="(61) 99999-0000"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="servidor@educa.df.gov.br"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Opção de Acesso ao Sistema */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                    Acesso ao Sistema EDUCA.MELHOR
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Desmarque para servidores terceirizados ou operacionais que não fazem login no sistema, mas precisam constar na folha de ponto e controle de ocorrências.
                  </p>
                </div>
                <label className="inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={form.acesso_sistema}
                    onChange={(e) =>
                      setForm({ ...form, acesso_sistema: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Observações Funcionais / Restrições / Anotações
                </label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Ex: Servidor em readaptação funcional / Responsável pelo portão lateral..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalFormAberto(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoForm}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-95"
                  style={{
                    background: "linear-gradient(135deg, #0f172a, #2563eb)",
                  }}
                >
                  {salvandoForm
                    ? "Salvando..."
                    : servidorEditando
                    ? "Salvar Alterações"
                    : "Concluir Cadastro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL / DRAWER: PRONTUÁRIO & DOSSIÊ 360º DO SERVIDOR
         ══════════════════════════════════════════════════════════════════════ */}
      {dossieServidor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8">
            {/* Header do Dossiê */}
            <div
              className="px-6 py-5 text-white flex flex-wrap items-center justify-between gap-4"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #0284c7 100%)",
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-xl font-extrabold text-white border border-white/25">
                  {String(dossieServidor.nome || "S")
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-extrabold tracking-tight">
                      {dossieServidor.nome}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white">
                      {dossieServidor.acesso_sistema ? "Com Acesso ao Sistema" : "Registro Interno (Sem Login)"}
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {dossieServidor.cargo} • CPF: {formatarCPF(dossieServidor.cpf)} • Matrícula: {dossieServidor.matricula || "—"}
                  </p>
                  <p className="text-xs text-cyan-200 mt-0.5">
                    Vínculo: {getVinculoLabel(dossieServidor.vinculo)} ({dossieServidor.empresa || "SEEDF"}) • Jornada: {dossieServidor.carga_horaria} ({dossieServidor.turno})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAbrirModalOcorrencia(dossieServidor, "abono");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  <PlusIcon className="h-4 w-4" />
                  Novo Registro p/ Servidor
                </button>
                <button
                  type="button"
                  onClick={() => setDossieServidorId(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Termômetro de Abonos e Indicadores do Servidor */}
              {(() => {
                const st = statsPorServidor[dossieServidor.id] || {
                  abonosUsados: 0,
                  abonosRestantes: LIMITE_ABONOS_ANUAL,
                  diasAtestado: 0,
                  totalAtestados: 0,
                  totalAusencias: 0,
                  negociacoesPendentes: 0,
                  negociacoesConcluidas: 0,
                };
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="text-xs font-bold uppercase text-emerald-800">
                        Cota de Abonos Anuais
                      </div>
                      <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                        {st.abonosUsados} / {LIMITE_ABONOS_ANUAL}
                      </div>
                      <div className="text-xs text-emerald-700 mt-0.5">
                        Restam <strong>{st.abonosRestantes}</strong> abono(s) no ano
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                      <div className="text-xs font-bold uppercase text-blue-800">
                        Atestados & Licenças
                      </div>
                      <div className="text-2xl font-extrabold text-blue-700 mt-1">
                        {st.diasAtestado} <span className="text-xs font-semibold">dia(s)</span>
                      </div>
                      <div className="text-xs text-blue-700 mt-0.5">
                        Em {st.totalAtestados} registro(s) médico(s)
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
                      <div className="text-xs font-bold uppercase text-purple-800">
                        Negociações Internas
                      </div>
                      <div className="text-2xl font-extrabold text-purple-700 mt-1">
                        {st.negociacoesPendentes} <span className="text-xs font-semibold">pendente(s)</span>
                      </div>
                      <div className="text-xs text-purple-700 mt-0.5">
                        {st.negociacoesConcluidas} já compensada(s)
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-red-50/70 border border-red-200">
                      <div className="text-xs font-bold uppercase text-red-800">
                        Ausências / Atrasos
                      </div>
                      <div className="text-2xl font-extrabold text-red-700 mt-1">
                        {st.totalAusencias}
                      </div>
                      <div className="text-xs text-red-700 mt-0.5">
                        Ocorrências de ponto no ano
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Histórico Cronológico do Servidor */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                    Histórico de Frequência, Abonos, Atestados e Acordos ({ocorrenciasDoDossie.length})
                  </h4>
                  <div className="flex gap-1.5">
                    {TIPOS_OCORRENCIA_ADMIN.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => onAbrirModalOcorrencia(dossieServidor, t.value)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border hover:opacity-90 transition"
                        style={{
                          backgroundColor: t.bg,
                          color: t.cor,
                          borderColor: t.border,
                        }}
                      >
                        + {t.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {ocorrenciasDoDossie.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-sm">
                    Nenhuma ocorrência (abono, atestado, ausência ou negociação interna) registrada para este servidor até o momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ocorrenciasDoDossie.map((occ) => {
                      const meta =
                        TIPOS_OCORRENCIA_ADMIN.find((t) => t.value === occ.tipo) ||
                        TIPOS_OCORRENCIA_ADMIN[0];
                      return (
                        <div
                          key={occ.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="px-2.5 py-0.5 rounded-full text-xs font-extrabold"
                                style={{
                                  backgroundColor: meta.bg,
                                  color: meta.cor,
                                }}
                              >
                                {meta.label}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {occ.subtipo}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                • {fmtDataBR(occ.data_inicio)}
                                {occ.data_fim && occ.data_fim !== occ.data_inicio
                                  ? ` até ${fmtDataBR(occ.data_fim)}`
                                  : ""}{" "}
                                ({occ.dias || 1} dia{Number(occ.dias) > 1 ? "s" : ""})
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {occ.motivo}
                            </p>

                            {occ.tipo === "atestado" && (occ.cid || occ.medico) && (
                              <div className="text-[11px] text-blue-700 font-medium">
                                🏥 {occ.medico ? `Médico: ${occ.medico}` : ""}{" "}
                                {occ.cid ? `• CID: ${occ.cid}` : ""}{" "}
                                {occ.documento_ref ? `• Doc: ${occ.documento_ref}` : ""}
                              </div>
                            )}

                            {occ.tipo === "negociacao" && (
                              <div className="text-[11px] text-purple-700 font-medium">
                                🤝 Plano de Reposição: {occ.forma_compensacao || "A definir"}{" "}
                                {occ.data_compensacao
                                  ? `(Data prevista: ${fmtDataBR(occ.data_compensacao)})`
                                  : ""}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {occ.tipo === "negociacao" &&
                              occ.status === "pendente_reposicao" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAtualizarStatusOcorrencia(occ.id, "compensado");
                                    toast.success("Acordo marcado como Compensado/Quitado!");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                                >
                                  ✓ Quitar Reposição
                                </button>
                              )}
                            <button
                              type="button"
                              onClick={() => {
                                onExcluirOcorrencia(occ.id);
                                toast.success("Registro removido.");
                              }}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                              title="Excluir registro"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <ExclamationTriangleIcon className="h-7 w-7 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">
                Remover Servidor da Listagem?
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Deseja remover <strong>{confirmExcluir.nome}</strong> do quadro administrativo? Você também pode optar por apenas <strong>Inativar</strong> o registro para preservar o histórico.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmExcluir(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onAlternarStatus(confirmExcluir);
                  setConfirmExcluir(null);
                  toast.success("Servidor inativado com histórico preservado.");
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold"
              >
                Apenas Inativar
              </button>
              <button
                type="button"
                onClick={() => {
                  onExcluirServidor(confirmExcluir);
                  setConfirmExcluir(null);
                  toast.success("Servidor removido da listagem.");
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
