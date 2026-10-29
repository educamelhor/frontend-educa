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
  FingerPrintIcon,
  SparklesIcon,
  XMarkIcon,
  ClockIcon,
  ShieldCheckIcon,
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
    label: "CADASTRO",
    sublabel: "Professores, Direção & Terceirizados",
    icon: UserGroupIcon,
  },
  {
    id: "frequencia",
    path: "/administrativo/frequencia",
    label: "BIOMETRIA",
    sublabel: "Ponto Eletrônico & Leitura Biométrica",
    icon: CalendarDaysIcon,
    emBreve: true,
  },
  {
    id: "ocorrencias",
    path: "/administrativo/ocorrencias",
    label: "LANÇAMENTOS",
    sublabel: "Abonos, Atestados, Ausências & Acordos",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    id: "relatorios",
    path: "/administrativo/relatorios",
    label: "IMPRIMIR / PDF",
    sublabel: "Folha de Ponto Oficial SEEDF",
    icon: ChartBarIcon,
  },
];

function getTabFromPathname(pathname) {
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

  // Estado do Modal Prêmium "EM BREVE" da aba BIOMETRIA (Passo 18)
  const [modalBiometriaEmBreve, setModalBiometriaEmBreve] = useState(() =>
    location.pathname.includes("/frequencia")
  );

  // Estado do Modal Global de Ocorrências (acessível de qualquer aba)
  const [modalOccAberto, setModalOccAberto] = useState(false);
  const [occEdicao, setOccEdicao] = useState(null);
  const [srvPreSel, setSrvPreSel] = useState(null);
  const [tipoPreSel, setTipoPreSel] = useState("abono");
  const [dataPreSel, setDataPreSel] = useState(null);

  useEffect(() => {
    if (location.pathname.includes("/frequencia")) {
      setModalBiometriaEmBreve(true);
      const tabDestino =
        activeTab && activeTab !== "frequencia" ? activeTab : "servidores";
      setActiveTab(tabDestino);
      navigate(`/administrativo/${tabDestino}`, { replace: true });
      return;
    }
    setActiveTab(getTabFromPathname(location.pathname));
  }, [location.pathname, activeTab, navigate]);

  useEffect(() => {
    const handler = () => setModalBiometriaEmBreve(true);
    window.addEventListener("educa:abrir-modal-biometria-em-breve", handler);
    return () =>
      window.removeEventListener(
        "educa:abrir-modal-biometria-em-breve",
        handler
      );
  }, []);

  const handleTrocarAba = (tab) => {
    if (tab.id === "frequencia" || tab.emBreve) {
      setModalBiometriaEmBreve(true);
      return;
    }
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
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          {TABS_ADMIN.map((tab) => {
            const Icon = tab.icon;
            const isAtiva = activeTab === tab.id && !tab.emBreve;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTrocarAba(tab)}
                className={`p-3.5 rounded-2xl text-left transition-all flex items-center gap-3.5 border ${
                  isAtiva
                    ? "bg-white text-slate-900 border-white shadow-lg scale-[1.01]"
                    : "bg-white/10 hover:bg-white/15 text-white border-white/15"
                }`}
              >
                <div
                  className={`p-3 rounded-xl flex-shrink-0 ${
                    isAtiva
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white/10 text-cyan-200"
                  }`}
                >
                  <Icon className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-base sm:text-lg font-black tracking-wide truncate leading-tight ${
                        isAtiva ? "text-slate-900" : "text-white"
                      }`}
                    >
                      {tab.label}
                    </span>
                    {tab.emBreve && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/25 text-amber-200 border border-amber-300/40 flex-shrink-0">
                        EM BREVE
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs font-medium truncate mt-0.5 ${
                      isAtiva ? "text-slate-500" : "text-blue-200/85"
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

      {/* Mantém FrequenciaPontoTab intacto no código (desativado enquanto emBreve estiver ativo) */}
      {false && activeTab === "frequencia" && (
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

      {/* ── MODAL PRÊMIUM: BIOMETRIA — EM BREVE (PASSO 18) ── */}
      {modalBiometriaEmBreve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            {/* Header Gradiente Prêmium */}
            <div
              className="px-6 py-6 text-white relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0d9488 100%)",
              }}
            >
              <div
                className="absolute -right-10 -top-10 h-40 w-40 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(45,212,191,0.28) 0%, transparent 70%)",
                }}
              />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center shadow-inner flex-shrink-0">
                    <FingerPrintIcon className="h-8 w-8 text-teal-300" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-400/25 text-amber-200 border border-amber-300/40">
                      <SparklesIcon className="h-3 w-3 text-amber-300" />
                      EM BREVE
                    </span>
                    <h3 className="text-xl font-extrabold tracking-tight mt-1">
                      Módulo de Biometria
                    </h3>
                    <p className="text-xs text-teal-100/90 mt-0.5">
                      Ponto Eletrônico & Reconhecimento Biométrico Escolar
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalBiometriaEmBreve(false)}
                  className="p-1.5 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition"
                  title="Fechar"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/90 space-y-2">
                <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span>Recurso em Fase de Implantação</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  O módulo de <strong>BIOMETRIA</strong> será liberado assim que a integração com os terminais de leitura biométrica for implantada na unidade escolar.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <ShieldCheckIcon className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Fluxo Atual Ativo:</strong> Utilize normalmente as abas{" "}
                    <strong>CADASTRO</strong>, <strong>LANÇAMENTOS</strong> e{" "}
                    <strong>IMPRIMIR / PDF</strong> para gerenciar os servidores, registrar ocorrências e emitir as Folhas de Frequência oficiais da SEEDF.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setModalBiometriaEmBreve(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-white text-sm font-extrabold shadow-lg hover:opacity-95 transition"
                  style={{
                    background:
                      "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #0d9488 100%)",
                  }}
                >
                  Entendi, voltar ao sistema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
