// src/features/administrativo/index.jsx
// ============================================================================
// MÓDULO ADMINISTRATIVO — Gestão Unificada de Pessoas, Ponto & Ocorrências
// - Quadro Geral de Servidores (Professores, Direção, Secretaria, Terceirizados)
// - Frequência & Ponto Diário
// - Central de Abonos, Atestados, Ausências e Negociações Internas
// - Relatórios Gerenciais e Espelho Individual Imprimível
// ============================================================================

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  UserGroupIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useAdministrativoData } from "./useAdministrativoData";
import ServidoresTab from "./ServidoresTab";
import FrequenciaPontoTab from "./FrequenciaPontoTab";
import OcorrenciasTab from "./OcorrenciasTab";
import RelatoriosTab from "./RelatoriosTab";
import ModalOcorrenciaAdmin from "./ModalOcorrenciaAdmin";

const TABS_ADMIN = [
  {
    id: "servidores",
    path: "/administrativo/servidores",
    label: "Quadro de Servidores",
    sublabel: "Professores, Direção & Terceirizados",
    icon: UserGroupIcon,
  },
  {
    id: "frequencia",
    path: "/administrativo/frequencia",
    label: "Frequência & Ponto Diário",
    sublabel: "Presença, Horários & Chamada",
    icon: CalendarDaysIcon,
  },
  {
    id: "ocorrencias",
    path: "/administrativo/ocorrencias",
    label: "Abonos, Atestados & Acordos",
    sublabel: "Ausências e Negociações Internas",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    id: "relatorios",
    path: "/administrativo/relatorios",
    label: "Espelho & Relatórios",
    sublabel: "Saldo de Abonos & Impressão",
    icon: ChartBarIcon,
  },
];

function getTabFromPathname(pathname) {
  if (pathname.includes("/frequencia")) return "frequencia";
  if (pathname.includes("/ocorrencias")) return "ocorrencias";
  if (pathname.includes("/relatorios")) return "relatorios";
  return "servidores";
}

export default function AdministrativoModule() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    servidores,
    ocorrencias,
    pontoDiario,
    statsPorServidor,
    loading,
    biometriaAtiva,
    alternarBiometria,
    calendarioGovernanca,
    recarregarSistema,
    salvarServidor,
    alternarStatusServidor,
    excluirServidor,
    salvarOcorrencia,
    excluirOcorrencia,
    atualizarStatusOcorrencia,
    registrarPontoServidor,
    registrarPontoColetivo,
    marcarTodosPresentesNoDia,
  } = useAdministrativoData();

  const [activeTab, setActiveTab] = useState(() =>
    getTabFromPathname(location.pathname)
  );

  // Estado do Modal Global de Ocorrências (acessível de qualquer aba)
  const [modalOccAberto, setModalOccAberto] = useState(false);
  const [occEdicao, setOccEdicao] = useState(null);
  const [srvPreSel, setSrvPreSel] = useState(null);
  const [tipoPreSel, setTipoPreSel] = useState("abono");
  const [dataPreSel, setDataPreSel] = useState(null);

  useEffect(() => {
    setActiveTab(getTabFromPathname(location.pathname));
  }, [location.pathname]);

  const handleTrocarAba = (tab) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  const abrirModalNovaOcorrencia = (servidor = null, tipo = "abono", data = null) => {
    setOccEdicao(null);
    setSrvPreSel(servidor);
    setTipoPreSel(tipo);
    setDataPreSel(data);
    setModalOccAberto(true);
  };

  const abrirModalEditarOcorrencia = (occ) => {
    setOccEdicao(occ);
    setSrvPreSel(null);
    setModalOccAberto(true);
  };

  const handleSalvarOcorrencia = (dados) => {
    salvarOcorrencia(dados);
    toast.success(
      dados.id
        ? "Registro administrativo atualizado com sucesso!"
        : "Registro lançado no prontuário do servidor!"
    );
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header Executivo Premium do Módulo Administrativo ── */}
      <div
        className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden print:hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0369a1 100%)",
        }}
      >
        {/* Efeito decorativo sutil */}
        <div
          className="absolute -right-12 -top-12 h-56 w-56 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(56,189,248,0.22) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
              <BriefcaseIcon className="h-8 w-8 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">
                  Gestão Administrativa & RH Escolar
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  {servidores.filter((s) => s.ativo).length} Profissionais Ativos
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                Módulo Administrativo
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5 max-w-2xl">
                Controle unificado de frequência, abonos anuais, atestados médicos, ausências e negociações internas de professores, direção, servidores e terceirizados.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                recarregarSistema();
                toast.success("Quadro sincronizado com Professores e Direção!");
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition"
              title="Sincronizar novamente com Professores e Direção"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Sincronizar Base</span>
            </button>

            <button
              type="button"
              onClick={() => abrirModalNovaOcorrencia(null, "abono")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-lg transition"
            >
              <PlusIcon className="h-4 w-4 stroke-[2.5]" />
              <span>Lançar Registro / Ocorrência</span>
            </button>
          </div>
        </div>

        {/* ── Navegação de Submódulos / Abas ── */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-white/15">
          {TABS_ADMIN.map((tab) => {
            const Icon = tab.icon;
            const isAtiva = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTrocarAba(tab)}
                className={`p-3 rounded-2xl text-left transition-all flex items-center gap-3 border ${
                  isAtiva
                    ? "bg-white text-slate-900 border-white shadow-lg scale-[1.01]"
                    : "bg-white/10 hover:bg-white/15 text-white border-white/15"
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 ${
                    isAtiva
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-cyan-200"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-extrabold truncate ${
                      isAtiva ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {tab.label}
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      isAtiva ? "text-slate-500" : "text-blue-200/80"
                    }`}
                  >
                    {tab.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conteúdo da Aba Selecionada ── */}
      {activeTab === "servidores" && (
        <ServidoresTab
          servidores={servidores}
          ocorrencias={ocorrencias}
          statsPorServidor={statsPorServidor}
          loading={loading}
          onSalvarServidor={salvarServidor}
          onAlternarStatus={alternarStatusServidor}
          onExcluirServidor={excluirServidor}
          onAbrirModalOcorrencia={abrirModalNovaOcorrencia}
          onAtualizarStatusOcorrencia={atualizarStatusOcorrencia}
          onExcluirOcorrencia={excluirOcorrencia}
        />
      )}

      {activeTab === "frequencia" && (
        <FrequenciaPontoTab
          servidores={servidores}
          ocorrencias={ocorrencias}
          pontoDiario={pontoDiario}
          biometriaAtiva={biometriaAtiva}
          onAlternarBiometria={alternarBiometria}
          calendarioGovernanca={calendarioGovernanca}
          onRegistrarPonto={registrarPontoServidor}
          onRegistrarPontoColetivo={registrarPontoColetivo}
          onMarcarTodosPresentes={marcarTodosPresentesNoDia}
          onAbrirModalOcorrencia={abrirModalNovaOcorrencia}
        />
      )}

      {activeTab === "ocorrencias" && (
        <OcorrenciasTab
          ocorrencias={ocorrencias}
          statsPorServidor={statsPorServidor}
          onAbrirModalNovo={abrirModalNovaOcorrencia}
          onAbrirModalEditar={abrirModalEditarOcorrencia}
          onAtualizarStatus={atualizarStatusOcorrencia}
          onExcluirOcorrencia={excluirOcorrencia}
        />
      )}

      {activeTab === "relatorios" && (
        <RelatoriosTab
          servidores={servidores}
          ocorrencias={ocorrencias}
          pontoDiario={pontoDiario}
          statsPorServidor={statsPorServidor}
          onAbrirModalOcorrencia={abrirModalNovaOcorrencia}
          onAbrirModalEditarOcorrencia={abrirModalEditarOcorrencia}
          onSalvarServidor={salvarServidor}
        />
      )}

      {/* ── Modal Global de Ocorrências Administrativas ── */}
      <ModalOcorrenciaAdmin
        aberto={modalOccAberto}
        onClose={() => setModalOccAberto(false)}
        onSave={handleSalvarOcorrencia}
        servidores={servidores}
        statsPorServidor={statsPorServidor}
        registroEdicao={occEdicao}
        servidorPreSelecionado={srvPreSel}
        tipoInicial={tipoPreSel}
        dataInicial={dataPreSel}
      />
    </div>
  );
}
