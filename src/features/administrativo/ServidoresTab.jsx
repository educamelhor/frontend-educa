// src/features/administrativo/ServidoresTab.jsx
// ============================================================================
// Aba 1: QUADRO UNIFICADO DE SERVIDORES, PROFESSORES & TERCEIRIZADOS
// - Lista automaticamente todos os Professores, Membros da Direção/Secretaria
//   e Servidores/Terceirizados (com ou sem acesso ao sistema).
// - Permite Cadastrar, Editar, Ativar/Inativar, Excluir, Lançar Ocorrências e
//   abrir o Prontuário / Dossiê 360º Individual do Servidor.
// ============================================================================

import React, { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../../services/api";
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
  CARREIRAS_SEEDF,
  CATALOGO_CARGOS_SEEDF,
  FUNCOES_GRATIFICADAS_SEEDF,
  PADROES_CARREIRA_SEEDF,
  ETAPAS_TITULACAO_SEEDF,
  LIMITE_ABONOS_ANUAL,
  TIPOS_OCORRENCIA_ADMIN,
  formatarCPF,
  limparCPF,
} from "./useAdministrativoData";
import brasaoDfImg from "./brasao-df.png";

function converterArquivoImagemParaDataUrl(file, onDone) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const rawDataUrl = ev.target?.result;
    if (!rawDataUrl) return;
    if (file.type === "image/svg+xml") {
      onDone(String(rawDataUrl));
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 220;
        let w = img.width || maxDim;
        let h = img.height || maxDim;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        onDone(canvas.toDataURL("image/png"));
      } catch {
        onDone(String(rawDataUrl));
      }
    };
    img.onerror = () => onDone(String(rawDataUrl));
    img.src = String(rawDataUrl);
  };
  reader.readAsDataURL(file);
}

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
  if (v === "readaptado") return "Efetivo (SEEDF)";
  return VINCULOS_SERVIDOR.find((x) => x.value === v)?.label || v || "Efetivo";
}

function getFuncaoGratificadaMeta(val) {
  if (!val) return null;
  const v = String(val).trim();
  if (!v) return null;
  const found = FUNCOES_GRATIFICADAS_SEEDF.find(
    (f) =>
      f.value === v ||
      (f.impressaoFolha && f.impressaoFolha.trim() === v) ||
      (f.label && f.label.toUpperCase() === v.toUpperCase())
  );
  if (found && found.value) return found;
  return {
    value: v,
    label: v,
    simbolo: v.includes("FGE")
      ? (v.match(/FGE-\d+/i)?.[0] || "FGE").toUpperCase()
      : "FUNÇÃO",
    impressaoFolha: v,
  };
}

function inferirDadosCatalogoServidor(srv) {
  if (srv.cargo_catalogo_id) {
    return {
      cargo_catalogo_id: srv.cargo_catalogo_id,
      subcargo: srv.subcargo || "",
    };
  }
  const cat = String(srv.categoria || "").toLowerCase();
  const vinc = String(srv.vinculo || "efetivo").toLowerCase();
  const cargoRaw = String(srv.cargo || "");
  const partes = cargoRaw.split("—").map((p) => p.trim());
  const subExtraido = partes.length > 1 ? partes.slice(1).join(" — ") : "";

  if (vinc === "voluntario" || vinc === "estagiario") {
    return {
      cargo_catalogo_id: "educador_voluntario",
      subcargo: srv.subcargo || subExtraido,
    };
  }
  if (cat === "professor") {
    return {
      cargo_catalogo_id: vinc.includes("tempor") ? "peb_temporario" : "peb_efetivo",
      subcargo: srv.subcargo || subExtraido,
    };
  }
  if (cat === "terceirizado" || vinc === "terceirizado") {
    return {
      cargo_catalogo_id: "terceirizado_operacional",
      subcargo: srv.subcargo || subExtraido,
    };
  }
  if (cat === "disciplinar") {
    return {
      cargo_catalogo_id: "militar_ccmdf",
      subcargo: srv.subcargo || subExtraido,
    };
  }
  if (cargoRaw.toLowerCase().includes("orientador")) {
    return {
      cargo_catalogo_id: "pedagogo_orientador",
      subcargo: srv.subcargo || subExtraido,
    };
  }
  if (cat === "administrativo") {
    return {
      cargo_catalogo_id: "tecnico_ppge",
      subcargo: srv.subcargo || subExtraido,
    };
  }
  return {
    cargo_catalogo_id: "",
    subcargo: srv.subcargo || subExtraido,
  };
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

  // Estado do formulário de Servidor (com suporte ao Catálogo Oficial SEEDF)
  const [form, setForm] = useState({
    id: null,
    nome: "",
    cpf: "",
    matricula: "",
    cargo: "",
    cargo_catalogo_id: "terceirizado_operacional",
    subcargo: "",
    funcao_gratificada: "",
    padrao_carreira: "25",
    etapa_titulacao: "PQ5",
    categoria: "terceirizado",
    vinculo: "terceirizado",
    empresa: "",
    carga_horaria: "40h",
    turno: "Integral",
    setor: "",
    exibir_lotacao_folha: false,
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

  // Modal Premium Concatenado: Inativação & Exclusão Hierárquica
  // { servidor: obj, modo: 'inativar' | 'excluir', inativadoNesteFluxo: boolean }
  const [modalCicloVida, setModalCicloVida] = useState(null);

  // Modal CADASTRAR HORÁRIO / CABEÇALHO (Passo 14 — Configuração Multi-Escola da Folha de Ponto)
  const [modalHorarioCabecalhoAberto, setModalHorarioCabecalhoAberto] = useState(false);
  const [cfgHorarioCabecalho, setCfgHorarioCabecalho] = useState(() => {
    const padrao = {
      // 1. Cabeçalho Institucional / Mantenedora / Brasão (PASSO 23)
      orgaoTitulo: "SECRETARIA DE ESTADO DE EDUCAÇÃO",
      cnpjOrgao: "00.394.676/0001-07",
      ua: "007",
      cre: "COORDENAÇÃO REGIONAL DE ENSINO DE PLANALTINA",
      modoLogoCabecalho: "brasao_gdf", // "brasao_gdf" | "personalizado" | "ocultar"
      logoEsquerdaDataUrl: "",
      exibirLogoDireita: false,
      logoDireitaDataUrl: "",
      // 2. Identificação da Unidade Escolar (Exercício & Lotação Padrão — PASSO 21)
      codigoExercicio: "990230000043",
      nomeEscola: "CENTRO DE ENSINO FUNDAMENTAL 04 DE PLANALTINA - COLEGIO CM",
      codigoLotacaoPadrao: "",
      nomeLotacaoPadrao: "",
      siglaEscola: "CEF04-CCMDF",
      cidadeUF: "Planaltina - DF",
      // 3. Grade de Horários Padrão dos Turnos da Escola
      matutinoEntrada: "07:30",
      matutinoSaida: "12:30",
      vespertinoEntrada: "13:00",
      vespertinoSaida: "18:00",
      noturnoEntrada: "19:00",
      noturnoSaida: "23:00",
      intervaloAlmoco: "12:00 às 13:00",
      toleranciaMinutos: "15",
      preencherHorariosPadraoNaFolha: false,
      // 4. Assinaturas / Chefia, Responsável, Superior e Observação Institucional da Folha (PASSO 20)
      imprimirAssinaturasNaFolha: true,
      responsavelFrequenciaNome: "",
      responsavelFrequenciaCargo: "CHEFE DE SECRETARIA — FGE-02",
      nomeChefiaImediata: "",
      cargoChefiaImediata: "DIRETOR — FGE-06",
      nomeSuperiorAssinatura: "",
      cargoSuperiorAssinatura: "VICE-DIRETOR — FGE-05",
      observacaoPadraoFolha: "",
      mensagemQuadroVerso: "",
    };
    try {
      const escId = localStorage.getItem("escola_id") || "default";
      const salvo =
        localStorage.getItem(`educa_admin_seedf_unidade_cfg_v1_${escId}`) ||
        localStorage.getItem("educa_admin_seedf_unidade_cfg_v1");
      if (salvo) {
        const parsed = JSON.parse(salvo);
        return { ...padrao, ...parsed };
      }
    } catch {
      // ignore
    }
    return padrao;
  });

  useEffect(() => {
    const onCfgUpdated = (e) => {
      if (e?.detail) {
        setCfgHorarioCabecalho((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener("educa:unidade-cfg-updated", onCfgUpdated);
    return () =>
      window.removeEventListener("educa:unidade-cfg-updated", onCfgUpdated);
  }, []);

  const handleSalvarHorarioCabecalho = async (e) => {
    e.preventDefault();
    try {
      const escId = localStorage.getItem("escola_id") || "default";
      const cfgStr = JSON.stringify(cfgHorarioCabecalho);
      localStorage.setItem("educa_admin_seedf_unidade_cfg_v1", cfgStr);
      localStorage.setItem(`educa_admin_seedf_unidade_cfg_v1_${escId}`, cfgStr);

      window.dispatchEvent(
        new CustomEvent("educa:unidade-cfg-updated", {
          detail: cfgHorarioCabecalho,
        })
      );

      if (escId && escId !== "default") {
        await api.put("/api/administrativo/config-unidade", {
          escola_id: Number(escId),
          config: cfgHorarioCabecalho,
        });
      }

      toast.success(
        "Configurações de Horário e Cabeçalho da Escola salvas no sistema para as Folhas de Ponto!"
      );
      setModalHorarioCabecalhoAberto(false);
    } catch {
      toast.error("Não foi possível salvar as configurações de cabeçalho.");
    }
  };

  const servidorCicloAtual = useMemo(() => {
    if (!modalCicloVida?.servidor) return null;
    return (
      servidores.find((s) => s.id === modalCicloVida.servidor.id) ||
      modalCicloVida.servidor
    );
  }, [servidores, modalCicloVida]);

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

  // Lista Filtrada (sempre em ordem alfabética estrita por nome, independente do status ou filtro)
  const servidoresFiltrados = useMemo(() => {
    return servidores
      .filter((s) => {
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
      })
      .sort((a, b) =>
        String(a.nome || "")
          .trim()
          .localeCompare(String(b.nome || "").trim(), "pt-BR", {
            sensitivity: "base",
          })
      );
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
      cargo_catalogo_id: "terceirizado_operacional",
      subcargo: "",
      funcao_gratificada: "",
      padrao_carreira: "25",
      etapa_titulacao: "PQ5",
      categoria: "terceirizado",
      vinculo: "terceirizado",
      empresa: "",
      carga_horaria: "44h",
      turno: "Integral",
      setor: "",
      exibir_lotacao_folha: false,
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
    const { cargo_catalogo_id, subcargo } = inferirDadosCatalogoServidor(srv);
    setForm({
      id: srv.id,
      nome: srv.nome || "",
      cpf: formatarCPF(srv.cpf) === "—" ? "" : formatarCPF(srv.cpf),
      matricula: srv.matricula || "",
      cargo: srv.cargo || "",
      cargo_catalogo_id: cargo_catalogo_id || "",
      subcargo: subcargo || "",
      funcao_gratificada: srv.funcao_gratificada || "",
      padrao_carreira: srv.padrao_carreira || "25",
      etapa_titulacao: srv.etapa_titulacao || "PQ5",
      categoria: srv.categoria || "administrativo",
      vinculo: srv.vinculo || "efetivo",
      empresa: srv.empresa || "SEEDF",
      carga_horaria: srv.carga_horaria || "40h",
      turno: srv.turno || "Integral",
      setor: srv.setor || "",
      exibir_lotacao_folha: Boolean(srv.exibir_lotacao_folha),
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
          {/* Busca (reduzida para acomodar os dois botões de ação na mesma linha) */}
          <div className="relative flex-1 min-w-[220px]">
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar servidor por nome, CPF, matrícula, cargo, disciplina, setor..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-inner bg-slate-50/40 focus:bg-white transition"
            />
          </div>

          {/* Botões Principais da Aba: CADASTRAR HORÁRIO / CABEÇALHO + CADASTRAR SERVIDOR / TERCEIRIZADO */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                try {
                  const escId = String(localStorage.getItem("escola_id") || "1");
                  const salvo =
                    localStorage.getItem(`educa_admin_seedf_unidade_cfg_v1_${escId}`) ||
                    localStorage.getItem("educa_admin_seedf_unidade_cfg_v1");
                  if (salvo) {
                    const parsed = JSON.parse(salvo);
                    setCfgHorarioCabecalho((prev) => ({ ...prev, ...parsed }));
                  }
                } catch {
                  // ignore
                }
                setModalHorarioCabecalhoAberto(true);
              }}
              className="group relative inline-flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #0f172a 0%, #312e81 55%, #4338ca 100%)",
                boxShadow:
                  "0 10px 25px -5px rgba(49, 46, 129, 0.48), 0 0 0 3px rgba(99, 102, 241, 0.16)",
              }}
              title="Configurar Cabeçalho Institucional e Horários Padrão da Escola para as Folhas de Ponto"
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(circle at 85% 20%, rgba(255,255,255,0.25), transparent 60%)",
                }}
              />
              <span
                className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-transform duration-200 group-hover:scale-105"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08))",
                  border: "1px solid rgba(255,255,255,0.32)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35)",
                }}
              >
                <ClockIcon className="h-5 w-5 text-white stroke-[2.3]" />
              </span>
              <span className="relative text-xs sm:text-[13px] font-extrabold tracking-wide text-white whitespace-nowrap">
                CADASTRAR HORÁRIO / CABEÇALHO
              </span>
            </button>

            <button
              type="button"
              onClick={abrirNovoServidor}
              className="group relative inline-flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%)",
                boxShadow:
                  "0 10px 25px -5px rgba(37, 99, 235, 0.55), 0 0 0 3px rgba(59, 130, 246, 0.18)",
              }}
            >
              {/* Efeito de brilho sutil no hover */}
              <span
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(circle at 85% 20%, rgba(255,255,255,0.28), transparent 60%)",
                }}
              />

              {/* Ícone em cápsula iluminada */}
              <span
                className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.26), rgba(255,255,255,0.1))",
                  border: "1px solid rgba(255,255,255,0.35)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
                }}
              >
                <PlusIcon className="h-5 w-5 text-white stroke-[2.6]" />
                <SparklesIcon className="h-3 w-3 text-amber-300 absolute -top-1 -right-1 drop-shadow" />
              </span>

              {/* Texto limpo e direto */}
              <span className="relative text-xs sm:text-[13px] font-extrabold tracking-wide text-white whitespace-nowrap">
                CADASTRAR SERVIDOR / TERCEIRIZADO
              </span>
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
                        <div className="font-semibold text-slate-800 text-xs flex flex-wrap items-center gap-1.5">
                          <span>{srv.cargo}</span>
                          {(() => {
                            const fgeMeta = getFuncaoGratificadaMeta(srv.funcao_gratificada);
                            if (!fgeMeta) return null;
                            return (
                              <span
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title={fgeMeta.label}
                              >
                                🏛️ {fgeMeta.simbolo || "FGE"}
                              </span>
                            );
                          })()}
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
                        <div className="inline-flex items-center justify-end gap-1.5">
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
                            onClick={() => abrirEditarServidor(srv)}
                            title="Editar Dados Funcionais / Jornada"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModalCicloVida({
                                servidor: srv,
                                modo: "inativar",
                                inativadoNesteFluxo: false,
                              })
                            }
                            title={
                              srv.ativo
                                ? "Inativar Cadastro (Preservando Histórico)"
                                : "Reativar Cadastro no Quadro Ativo"
                            }
                            className={`p-1.5 rounded-lg transition ${
                              srv.ativo
                                ? "bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white"
                                : "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white"
                            }`}
                          >
                            {srv.ativo ? (
                              <NoSymbolIcon className="h-4 w-4" />
                            ) : (
                              <ArrowPathIcon className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModalCicloVida({
                                servidor: srv,
                                modo: "excluir",
                                inativadoNesteFluxo: false,
                              })
                            }
                            title="Fluxo Hierárquico de Exclusão de Cadastro"
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
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
              {/* Legenda do Mapeamento de Edição da Folha de Ponto (PASSO 19) */}
              <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-300 flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex-shrink-0 shadow-sm">
                    🖨️
                  </span>
                  <div className="text-xs text-emerald-950 leading-snug">
                    <span className="font-extrabold uppercase tracking-wide">
                      Mapeamento da Folha de Ponto:
                    </span>{" "}
                    Os campos destacados em{" "}
                    <span className="px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-950 font-extrabold border border-emerald-400">
                      verde claro
                    </span>{" "}
                    são renderizados diretamente na Folha de Frequência Oficial SEEDF impressa para assinatura do servidor.
                  </div>
                </div>
                <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-white text-emerald-800 border border-emerald-300 flex-shrink-0">
                  13 Campos na Folha
                </span>
              </div>

              {/* Nome, CPF e Matrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-300/90">
                  <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: Raimundo Nonato de Souza"
                    className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Seletor 1: Categoria no Quadro, Vínculo Funcional e Matrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-300/90">
                  <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                    Categoria no Quadro *
                  </label>
                  <select
                    value={form.categoria}
                    onChange={(e) => {
                      const novaCat = e.target.value;
                      let novoVinc = form.vinculo;
                      if (novaCat === "terceirizado") novoVinc = "terceirizado";
                      else if (novaCat === "professor" && form.vinculo === "terceirizado") novoVinc = "efetivo";
                      const sugerido = CATALOGO_CARGOS_SEEDF.find(
                        (item) =>
                          item.categorias.includes(novaCat) &&
                          item.vinculos.includes(novoVinc)
                      ) || CATALOGO_CARGOS_SEEDF.find((item) => item.categorias.includes(novaCat));
                      setForm({
                        ...form,
                        categoria: novaCat,
                        vinculo: novoVinc,
                        cargo_catalogo_id: sugerido ? sugerido.id : form.cargo_catalogo_id,
                      });
                    }}
                    className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {CATEGORIAS_SERVIDOR.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-300/90">
                  <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                    Vínculo Funcional *
                  </label>
                  <select
                    value={form.vinculo === "readaptado" ? "efetivo" : form.vinculo}
                    onChange={(e) => {
                      const novoVinc = e.target.value;
                      const sugerido =
                        CATALOGO_CARGOS_SEEDF.find(
                          (item) =>
                            item.categorias.includes(form.categoria) &&
                            item.vinculos.includes(novoVinc)
                        ) ||
                        CATALOGO_CARGOS_SEEDF.find((item) =>
                          item.vinculos.includes(novoVinc)
                        );
                      setForm({
                        ...form,
                        vinculo: novoVinc,
                        cargo_catalogo_id: sugerido ? sugerido.id : form.cargo_catalogo_id,
                        ...(novoVinc === "voluntario" && !form.cargo.trim()
                          ? { cargo: "Educador Social Voluntário (ESV)" }
                          : {}),
                      });
                    }}
                    className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {VINCULOS_SERVIDOR.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-300/90">
                  <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                    Matrícula / Contrato SIGEP
                  </label>
                  <input
                    type="text"
                    value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                    placeholder="Ex: 0027596-4 ou TERC-04"
                    className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* ── PAINEL NORMATIVO SEEDF: CARGO, SUB-CARGO (ESPECIALIDADE), FUNÇÃO (FGE) E PADRÃO SIGEP ── */}
              {(() => {
                const cargosRecomendados = CATALOGO_CARGOS_SEEDF.filter(
                  (c) =>
                    c.categorias.includes(form.categoria) ||
                    c.vinculos.includes(form.vinculo)
                );
                const itemCatalogoAtual = CATALOGO_CARGOS_SEEDF.find(
                  (c) => c.id === form.cargo_catalogo_id
                );
                const listaSubcargos = itemCatalogoAtual?.subcargos || [];
                const mostrarPadraoSigep =
                  (form.vinculo === "efetivo" || form.vinculo === "readaptado") &&
                  (itemCatalogoAtual?.exigePadraoSigep ||
                    form.categoria === "professor" ||
                    form.categoria === "direcao" ||
                    form.categoria === "pedagogico");

                return (
                  <div className="bg-emerald-50/75 p-4 rounded-xl border-2 border-emerald-300 space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950">
                        🏛️ Padronização Funcional SEEDF (Cargo, Especialidade, FGE & SIGEP)
                      </span>
                      {itemCatalogoAtual?.cargoSigep && (
                        <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[10px] font-mono font-bold text-emerald-900">
                          SIGEP: {itemCatalogoAtual.cargoSigep}
                        </span>
                      )}
                    </div>

                    {/* Seletor 2: Cargo Oficial SEEDF + Seletor 3: Sub-cargo / Especialidade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                          Cargo Oficial SEEDF (Catálogo)
                        </label>
                        <select
                          value={form.cargo_catalogo_id || "custom"}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "custom") {
                              setForm({
                                ...form,
                                cargo_catalogo_id: "custom",
                                subcargo: "",
                              });
                              return;
                            }
                            const sel = CATALOGO_CARGOS_SEEDF.find((c) => c.id === val);
                            const primeiroSub = sel?.subcargos?.[0] || "";
                            const novoCargoComp = sel
                              ? primeiroSub
                                ? `${sel.cargoLabel} — ${primeiroSub}`
                                : sel.cargoLabel
                              : form.cargo;
                            setForm({
                              ...form,
                              cargo_catalogo_id: val,
                              subcargo: primeiroSub,
                              cargo: novoCargoComp,
                            });
                          }}
                          className="w-full rounded-xl border border-emerald-400 bg-emerald-100/60 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <optgroup label="Cargos Compatíveis com a Categoria / Vínculo">
                            {cargosRecomendados.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.cargoLabel}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Todos os Cargos do Catálogo SEEDF">
                            {CATALOGO_CARGOS_SEEDF.filter(
                              (c) => !cargosRecomendados.some((r) => r.id === c.id)
                            ).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.cargoLabel}
                              </option>
                            ))}
                          </optgroup>
                          <option value="custom">
                            ✍️ Outro Cargo / Digitação Livre
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                          Sub-cargo / Especialidade / Disciplina
                        </label>
                        {listaSubcargos.length > 0 && form.cargo_catalogo_id !== "custom" ? (
                          <select
                            value={form.subcargo}
                            onChange={(e) => {
                              const sub = e.target.value;
                              const baseLabel =
                                itemCatalogoAtual?.cargoLabel || "Servidor";
                              setForm({
                                ...form,
                                subcargo: sub,
                                cargo: sub ? `${baseLabel} — ${sub}` : baseLabel,
                              });
                            }}
                            className="w-full rounded-xl border border-emerald-400 bg-emerald-100/60 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            <option value="">
                              — Selecionar Especialidade / Componente —
                            </option>
                            {listaSubcargos.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={form.subcargo}
                            onChange={(e) =>
                              setForm({ ...form, subcargo: e.target.value })
                            }
                            placeholder="Ex: Matemática / Portaria / Limpeza"
                            className="w-full rounded-xl border border-emerald-400 bg-emerald-100/60 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* Campo Editável do Nome Final do Cargo + Seletor 4: Função Gratificada Escolar (FGE) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                          Cargo / Função (Descrição Final Editável) *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.cargo}
                          onChange={(e) =>
                            setForm({ ...form, cargo: e.target.value })
                          }
                          placeholder="Ex: Professor de Educação Básica (PEB) — Matemática"
                          className="w-full rounded-xl border border-emerald-400 bg-emerald-100/60 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                          Função Gratificada Escolar (FGE — Lei 5.326/2014)
                        </label>
                        <select
                          value={form.funcao_gratificada}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              funcao_gratificada: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-emerald-400 bg-emerald-100/60 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          {FUNCOES_GRATIFICADAS_SEEDF.map((fn) => (
                            <option key={fn.value} value={fn.value}>
                              {fn.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Seletor Condicional: Padrão Vertical (01 a 25) + Etapa de Titulação (PQ1 a PQ6) */}
                    {mostrarPadraoSigep && (
                      <div className="pt-2 border-t border-emerald-300/80 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-emerald-950 mb-1">
                            Padrão na Carreira (01 a 25)
                          </label>
                          <select
                            value={form.padrao_carreira || "25"}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                padrao_carreira: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-emerald-400 bg-emerald-100/60 px-3 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            {PADROES_CARREIRA_SEEDF.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-emerald-950 mb-1">
                            Etapa de Titulação (PQ1 a PQ6)
                          </label>
                          <select
                            value={form.etapa_titulacao || "PQ5"}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                etapa_titulacao: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-emerald-400 bg-emerald-100/60 px-3 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            {ETAPAS_TITULACAO_SEEDF.map((et) => (
                              <option key={et.value} value={et.value}>
                                {et.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-start sm:justify-end pb-0.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900 text-white text-xs font-extrabold shadow-sm">
                            Código SIGEP na Folha:{" "}
                            <span className="font-mono text-amber-300">
                              {`${form.padrao_carreira || "25"}-${form.etapa_titulacao || "PQ5"}`}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Órgão/Empresa e Setor/Lotação Interna */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                  <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                    Setor / Lotação (Opcional)
                  </label>
                  <input
                    type="text"
                    value={form.setor}
                    onChange={(e) => setForm({ ...form, setor: e.target.value })}
                    placeholder="Ex: CRE PLANALTINA ou 990230000000 - CRE PLANALTINA"
                    className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(form.exibir_lotacao_folha)}
                      onChange={(e) =>
                        setForm({ ...form, exibir_lotacao_folha: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-emerald-500 text-emerald-700 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] font-bold text-emerald-900 leading-tight">
                      Imprimir linha <strong className="underline">Lotação:</strong> na Folha de Ponto (quando divergir de Exercício)
                    </span>
                  </label>
                </div>
              </div>

              {/* Carga Horária, Turno e Horário de Trabalho */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-300/90">
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    Carga Horária
                  </label>
                  <select
                    value={form.carga_horaria}
                    onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })}
                    className="w-full rounded-lg border border-emerald-400 px-3 py-2 text-sm font-semibold text-slate-900 bg-emerald-50/90 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {CARGAS_HORARIAS.map((ch) => (
                      <option key={ch.value} value={ch.value}>
                        {ch.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-300/90">
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    Turno
                  </label>
                  <select
                    value={form.turno}
                    onChange={(e) => setForm({ ...form, turno: e.target.value })}
                    className="w-full rounded-lg border border-emerald-400 px-3 py-2 text-sm font-semibold text-slate-900 bg-emerald-50/90 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {TURNOS_TRABALHO.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
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
                    {(() => {
                      const fgeMeta = getFuncaoGratificadaMeta(
                        dossieServidor.funcao_gratificada
                      );
                      if (!fgeMeta) return null;
                      return (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/25 text-amber-200 border border-amber-300/40">
                          🏛️ {fgeMeta.label}
                        </span>
                      );
                    })()}
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

      {/* ── MODAL PREMIUM CONCATENADO: INATIVAÇÃO & EXCLUSÃO HIERÁRQUICA ── */}
      {modalCicloVida && servidorCicloAtual && (() => {
        const srv = servidorCicloAtual;
        const modo = modalCicloVida.modo; // 'inativar' | 'excluir'
        const isAtivo = Boolean(srv.ativo);
        const catMeta = getCategoriaMeta(srv.categoria);
        const stSrv = statsPorServidor[srv.id] || {
          abonosUsados: 0,
          totalAtestados: 0,
          totalAusencias: 0,
          negociacoesPendentes: 0,
          negociacoesConcluidas: 0,
        };
        const totalRegistrosHistoricos =
          (stSrv.abonosUsados || 0) +
          (stSrv.totalAtestados || 0) +
          (stSrv.totalAusencias || 0) +
          (stSrv.negociacoesPendentes || 0) +
          (stSrv.negociacoesConcluidas || 0);

        const headerGradient =
          modo === "excluir"
            ? "linear-gradient(135deg, #450a0a 0%, #991b1b 55%, #dc2626 100%)"
            : isAtivo
            ? "linear-gradient(135deg, #451a03 0%, #b45309 55%, #d97706 100%)"
            : "linear-gradient(135deg, #064e3b 0%, #047857 55%, #059669 100%)";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
              {/* Cabeçalho Premium */}
              <div
                className="px-6 py-5 text-white flex items-start justify-between gap-4"
                style={{ background: headerGradient }}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
                    {modo === "excluir" ? (
                      <TrashIcon className="h-6 w-6 text-white" />
                    ) : isAtivo ? (
                      <NoSymbolIcon className="h-6 w-6 text-amber-200" />
                    ) : (
                      <ArrowPathIcon className="h-6 w-6 text-emerald-200" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
                        {modo === "excluir"
                          ? "Protocolo de Segurança em 2 Etapas"
                          : isAtivo
                          ? "Gestão de Status Funcional"
                          : "Reintegração ao Quadro Ativo"}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold tracking-tight mt-1">
                      {modo === "excluir"
                        ? "Fluxo Hierárquico de Exclusão de Servidor"
                        : isAtivo
                        ? "Confirmar Inativação de Cadastro?"
                        : "Confirmar Reativação do Servidor?"}
                    </h3>
                    <p className="text-xs text-white/85 mt-0.5">
                      {modo === "excluir"
                        ? "Para proteção do acervo escolar, nenhum cadastro ativo pode ser excluído diretamente."
                        : isAtivo
                        ? "O servidor sairá das chamadas diárias ativas, mantendo 100% do histórico preservado."
                        : "O servidor voltará imediatamente para a listagem ativa e para a chamada diária de ponto."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalCicloVida(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0"
                  title="Fechar"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Corpo do Modal */}
              <div className="p-6 space-y-5">
                {/* Card de Identificação do Servidor */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-sm"
                      style={{
                        background: catMeta.bg,
                        color: catMeta.cor,
                        border: `1px solid ${catMeta.cor}30`,
                      }}
                    >
                      {String(srv.nome || "S")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {srv.nome}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isAtivo
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {isAtivo ? "● Cadastro Ativo" : "● Cadastro Inativo"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {srv.cargo || catMeta.label} • Vínculo:{" "}
                        <strong className="text-slate-700">
                          {getVinculoLabel(srv.vinculo)}
                        </strong>{" "}
                        {srv.cpf ? `• CPF: ${formatarCPF(srv.cpf)}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-right flex-shrink-0">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Acervo Vinculado
                    </div>
                    <div className="text-xs font-extrabold text-slate-800">
                      {totalRegistrosHistoricos} ocorrência(s) + Ponto
                    </div>
                  </div>
                </div>

                {/* ── MODO 1: INATIVAR / REATIVAR ── */}
                {modo === "inativar" && (
                  <>
                    {isAtivo ? (
                      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
                        <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                          <ShieldCheckIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                          Por que a Inativação é o padrão seguro do sistema?
                        </div>
                        <ul className="text-xs text-amber-900/90 space-y-1.5 pl-1 leading-relaxed">
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-amber-600">✓</span>
                            <span>
                              <strong>Preservação Total do Histórico:</strong> Todos os registros de frequência diária, abonos, atestados médicos, negociações internas e relatórios permanecem intactos para auditoria da Secretaria/SEEDF.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-amber-600">✓</span>
                            <span>
                              <strong>Limpeza da Chamada Diária:</strong> O servidor deixa de aparecer nas listas operacionais do dia a dia, evitando lançamentos acidentais.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-amber-600">✓</span>
                            <span>
                              <strong>Reversível a Qualquer Momento:</strong> Caso o servidor retorne à unidade escolar, basta filtrar por <em>"Apenas Inativos"</em> e reativar seu cadastro com 1 clique.
                            </span>
                          </li>
                        </ul>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider">
                          <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                          Reintegração Imediata ao Quadro Ativo
                        </div>
                        <p className="text-xs text-emerald-900/90 leading-relaxed">
                          Ao confirmar a reativação, <strong>{srv.nome}</strong> voltará a figurar entre os servidores ativos da escola, reconectando todo o seu histórico anterior e habilitando seu nome na Frequência & Ponto Diário.
                        </p>
                      </div>
                    )}

                    {/* Rodapé do Modo Inativar / Reativar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setModalCicloVida({
                            servidor: srv,
                            modo: "excluir",
                            inativadoNesteFluxo: false,
                          })
                        }
                        className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition text-left"
                      >
                        Precisa excluir definitivamente? Abrir fluxo hierárquico →
                      </button>

                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setModalCicloVida(null)}
                          className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onAlternarStatus(srv);
                            setModalCicloVida(null);
                            toast.success(
                              isAtivo
                                ? `${srv.nome} inativado com sucesso! Histórico 100% preservado.`
                                : `${srv.nome} reativado no quadro de servidores!`
                            );
                          }}
                          className={`px-5 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md transition flex items-center gap-1.5 ${
                            isAtivo
                              ? "bg-amber-600 hover:bg-amber-700"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                        >
                          {isAtivo ? (
                            <>
                              <NoSymbolIcon className="h-4 w-4" />
                              Confirmar Inativação
                            </>
                          ) : (
                            <>
                              <ArrowPathIcon className="h-4 w-4" />
                              Confirmar Reativação
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── MODO 2: FLUXO HIERÁRQUICO DE EXCLUSÃO (INATIVAR ➔ EXCLUIR) ── */}
                {modo === "excluir" && (
                  <>
                    {/* Stepper Visual das 2 Etapas Hierárquicas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Etapa 1 */}
                      <div
                        className={`p-3.5 rounded-2xl border-2 transition ${
                          isAtivo
                            ? "bg-amber-50/90 border-amber-400 shadow-sm"
                            : "bg-emerald-50/80 border-emerald-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              isAtivo
                                ? "bg-amber-200 text-amber-900"
                                : "bg-emerald-200 text-emerald-900"
                            }`}
                          >
                            1ª Etapa Obrigatória
                          </span>
                          {!isAtivo ? (
                            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <ClockIcon className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="font-extrabold text-xs text-slate-900 mt-2">
                          Inativação Prévia do Servidor
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {isAtivo
                            ? "Pendente: o servidor ainda está Ativo no quadro."
                            : modalCicloVida.inativadoNesteFluxo
                            ? "Concluída agora! Servidor já está Inativo."
                            : "Concluída: o servidor já se encontra Inativo."}
                        </div>
                      </div>

                      {/* Etapa 2 */}
                      <div
                        className={`p-3.5 rounded-2xl border-2 transition ${
                          isAtivo
                            ? "bg-slate-100/80 border-slate-200 opacity-75"
                            : "bg-red-50/80 border-red-300 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              isAtivo
                                ? "bg-slate-200 text-slate-600"
                                : "bg-red-200 text-red-900"
                            }`}
                          >
                            2ª Etapa Final
                          </span>
                          <TrashIcon
                            className={`h-5 w-5 ${
                              isAtivo ? "text-slate-400" : "text-red-600"
                            }`}
                          />
                        </div>
                        <div className="font-extrabold text-xs text-slate-900 mt-2">
                          Exclusão Definitiva do Registro
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {isAtivo
                            ? "🔒 Bloqueada até que o cadastro seja inativado."
                            : "🔓 Liberada para confirmação definitiva."}
                        </div>
                      </div>
                    </div>

                    {/* Alerta Educativo sobre a Importância do Histórico */}
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                      <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs uppercase tracking-wider">
                        <ShieldCheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        Importância de Manter o Histórico Funcional
                      </div>
                      <p className="text-xs text-blue-900/90 leading-relaxed">
                        Mesmo quando um professor, servidor ou colaborador terceirizado encerra seu contrato ou muda de escola,{" "}
                        <strong>manter o cadastro apenas como INATIVO</strong> preserva a memória institucional da unidade (folhas de ponto passadas, atestados entregues, abonos concedidos e termos de reposição).{" "}
                        <span className="underline decoration-blue-400">
                          A exclusão definitiva só deve ser utilizada para cadastros feitos por engano ou em duplicidade.
                        </span>
                      </p>
                    </div>

                    {/* Ações Inteligentes conforme a Etapa Atual */}
                    {isAtivo ? (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-900 leading-relaxed">
                            <strong>Ação Bloqueada na 1ª Etapa:</strong> Como{" "}
                            <strong>{srv.nome}</strong> está <strong>ATIVO</strong>, escolha abaixo se deseja apenas inativá-lo (recomendado) ou avançar para a 2ª etapa:
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setModalCicloVida(null)}
                            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onAlternarStatus(srv);
                              setModalCicloVida(null);
                              toast.success(
                                `${srv.nome} foi inativado! Histórico funcional preservado com segurança.`
                              );
                            }}
                            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <NoSymbolIcon className="h-4 w-4" />
                            Apenas Inativar e Manter Histórico (Recomendado)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onAlternarStatus(srv);
                              setModalCicloVida((prev) => ({
                                ...prev,
                                servidor: { ...srv, ativo: false },
                                inativadoNesteFluxo: true,
                              }));
                              toast.success(
                                "1ª Etapa cumprida: Servidor inativado. 2ª Etapa (Exclusão) liberada."
                              );
                            }}
                            className="px-3.5 py-2.5 rounded-xl border border-red-300 bg-white hover:bg-red-50 text-red-700 text-xs font-bold transition flex items-center justify-center gap-1"
                            title="Inativa o cadastro agora e libera o botão de exclusão definitiva"
                          >
                            Inativar p/ Liberar Exclusão →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-red-900 leading-relaxed">
                            {modalCicloVida.inativadoNesteFluxo ? (
                              <>
                                <strong>1ª Etapa Concluída!</strong> O cadastro de{" "}
                                <strong>{srv.nome}</strong> já foi inativado. Você pode encerrar agora mantendo o histórico preservado, ou confirmar a{" "}
                                <strong>Exclusão Definitiva</strong>.
                              </>
                            ) : (
                              <>
                                <strong>Pré-requisito atendido:</strong> O cadastro de{" "}
                                <strong>{srv.nome}</strong> já se encontra{" "}
                                <strong>INATIVO</strong>. Tem certeza de que deseja excluir definitivamente este registro da listagem administrativa?
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setModalCicloVida(null)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <ShieldCheckIcon className="h-4 w-4" />
                            Manter Apenas Inativo (Preservar Histórico)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onExcluirServidor(srv);
                              setModalCicloVida(null);
                              toast.success(
                                `Cadastro de ${srv.nome} excluído definitivamente da listagem.`
                              );
                            }}
                            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Confirmar Exclusão Definitiva
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CADASTRAR HORÁRIO / CABEÇALHO (PASSO 14 — AUTONOMIA MULTI-ESCOLA)
         ══════════════════════════════════════════════════════════════════════ */}
      {modalHorarioCabecalhoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            {/* Header idêntico ao padrão do modal Cadastrar Servidor / Terceirizado */}
            <div
              className="px-6 py-4 flex items-center justify-between text-white"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
              }}
            >
              <div>
                <h3 className="text-lg font-bold">
                  Cadastrar Horário / Cabeçalho da Unidade Escolar
                </h3>
                <p className="text-xs text-blue-200">
                  Parâmetros institucionais e grade de horários que serão renderizados nas Folhas de Ponto (Espelho & Relatórios)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalHorarioCabecalhoAberto(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSalvarHorarioCabecalho}
              className="p-6 space-y-5 max-h-[82vh] overflow-y-auto"
            >
              {/* Legenda do Mapeamento de Edição da Folha de Ponto (PASSO 19 / PASSO 20) */}
              <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-300 flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex-shrink-0 shadow-sm">
                    🖨️
                  </span>
                  <div className="text-xs text-emerald-950 leading-snug">
                    <span className="font-extrabold uppercase tracking-wide">
                      Mapeamento da Folha de Ponto:
                    </span>{" "}
                    Os campos destacados em{" "}
                    <span className="px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-950 font-extrabold border border-emerald-400">
                      verde claro
                    </span>{" "}
                    são renderizados diretamente no cabeçalho, nos quadros de Assinatura (Responsável, Chefia e Superior) e no quadro de Observações da Folha de Frequência Oficial SEEDF.
                  </div>
                </div>
                <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-white text-emerald-800 border border-emerald-300 flex-shrink-0">
                  19 Campos na Folha
                </span>
              </div>

              {/* 1. CABEÇALHO INSTITUCIONAL / ÓRGÃO MANTENEDOR / BRASÃO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <BuildingOffice2Icon className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    1. Cabeçalho Institucional (Órgão / Mantenedora / Regional / Brasão)
                  </span>
                </div>

                {/* PASSO 23 — ITEM 5: Logo / Brasão do Cabeçalho */}
                <div className="p-3 rounded-xl bg-emerald-50/75 border border-emerald-300/90 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase text-emerald-950">
                      Logo / Brasão do Cabeçalho da Folha de Ponto
                    </span>

                    <div className="inline-flex flex-wrap rounded-xl border border-emerald-400 bg-white p-1 gap-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            modoLogoCabecalho: "brasao_gdf",
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                          (cfgHorarioCabecalho.modoLogoCabecalho || "brasao_gdf") ===
                          "brasao_gdf"
                            ? "bg-emerald-700 text-white shadow-sm"
                            : "text-slate-700 hover:bg-emerald-50"
                        }`}
                      >
                        🏛️ Brasão Oficial GDF (Padrão)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            modoLogoCabecalho: "personalizado",
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                          cfgHorarioCabecalho.modoLogoCabecalho === "personalizado"
                            ? "bg-emerald-700 text-white shadow-sm"
                            : "text-slate-700 hover:bg-emerald-50"
                        }`}
                      >
                        🖼️ Logo / Brasão Personalizado
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            modoLogoCabecalho: "ocultar",
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                          cfgHorarioCabecalho.modoLogoCabecalho === "ocultar"
                            ? "bg-slate-800 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        📄 Ocultar (Papel Timbrado)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Coluna 1: Brasão / Logo Principal (Esquerda do Cabeçalho) */}
                    <div className="p-2.5 rounded-xl bg-white/85 border border-emerald-300 flex items-center gap-3">
                      <div className="h-14 w-14 rounded-lg border border-emerald-300 bg-white flex items-center justify-center p-1 flex-shrink-0">
                        {cfgHorarioCabecalho.modoLogoCabecalho === "ocultar" ? (
                          <span className="text-[10px] font-bold text-slate-400 text-center leading-tight">
                            Sem Brasão
                          </span>
                        ) : (
                          <img
                            src={
                              cfgHorarioCabecalho.modoLogoCabecalho ===
                                "personalizado" &&
                              cfgHorarioCabecalho.logoEsquerdaDataUrl
                                ? cfgHorarioCabecalho.logoEsquerdaDataUrl
                                : brasaoDfImg
                            }
                            alt="Preview Brasão Esquerdo"
                            className="max-h-12 max-w-12 object-contain"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="text-[11px] font-extrabold uppercase text-emerald-950">
                          Brasão Principal (Esquerda do Topo)
                        </div>
                        {cfgHorarioCabecalho.modoLogoCabecalho ===
                        "personalizado" ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer transition shadow-sm">
                                Enviar Imagem (PNG/JPG/SVG)
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    converterArquivoImagemParaDataUrl(
                                      f,
                                      (dataUrl) => {
                                        setCfgHorarioCabecalho((prev) => ({
                                          ...prev,
                                          modoLogoCabecalho: "personalizado",
                                          logoEsquerdaDataUrl: dataUrl,
                                        }));
                                      }
                                    );
                                  }}
                                />
                              </label>
                              {cfgHorarioCabecalho.logoEsquerdaDataUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCfgHorarioCabecalho({
                                      ...cfgHorarioCabecalho,
                                      logoEsquerdaDataUrl: "",
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg border border-slate-300 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={
                                cfgHorarioCabecalho.logoEsquerdaDataUrl?.startsWith(
                                  "data:"
                                )
                                  ? ""
                                  : cfgHorarioCabecalho.logoEsquerdaDataUrl || ""
                              }
                              onChange={(e) =>
                                setCfgHorarioCabecalho({
                                  ...cfgHorarioCabecalho,
                                  logoEsquerdaDataUrl: e.target.value,
                                })
                              }
                              placeholder="Ou cole a URL da imagem do Brasão..."
                              className="w-full rounded-lg border border-emerald-400 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-slate-800 outline-none"
                            />
                          </div>
                        ) : (
                          <p className="text-[11px] text-emerald-900 leading-snug">
                            {cfgHorarioCabecalho.modoLogoCabecalho === "ocultar"
                              ? "O cabeçalho será impresso sem imagem de brasão à esquerda."
                              : "Utilizando o Brasão Oficial do Distrito Federal (GDF / SEEDF)."}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Coluna 2: 2º Brasão / Logo da Escola à Direita (Opcional — Ex: CCMDF / Escola) */}
                    <div className="p-2.5 rounded-xl bg-white/85 border border-emerald-300 flex items-center gap-3">
                      <div className="h-14 w-14 rounded-lg border border-emerald-300 bg-white flex items-center justify-center p-1 flex-shrink-0">
                        {cfgHorarioCabecalho.exibirLogoDireita &&
                        cfgHorarioCabecalho.logoDireitaDataUrl ? (
                          <img
                            src={cfgHorarioCabecalho.logoDireitaDataUrl}
                            alt="Preview Logo Direita"
                            className="max-h-12 max-w-12 object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 text-center leading-tight">
                            Opcional (Direita)
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(
                              cfgHorarioCabecalho.exibirLogoDireita
                            )}
                            onChange={(e) =>
                              setCfgHorarioCabecalho({
                                ...cfgHorarioCabecalho,
                                exibirLogoDireita: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded border-emerald-500 text-emerald-700"
                          />
                          <span className="text-[11px] font-extrabold uppercase text-emerald-950">
                            2º Brasão / Logo da Escola à Direita (Opcional)
                          </span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer transition shadow-sm">
                            Enviar Logo Direita
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                converterArquivoImagemParaDataUrl(
                                  f,
                                  (dataUrl) => {
                                    setCfgHorarioCabecalho((prev) => ({
                                      ...prev,
                                      exibirLogoDireita: true,
                                      logoDireitaDataUrl: dataUrl,
                                    }));
                                  }
                                );
                              }}
                            />
                          </label>
                          {cfgHorarioCabecalho.logoDireitaDataUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setCfgHorarioCabecalho({
                                  ...cfgHorarioCabecalho,
                                  exibirLogoDireita: false,
                                  logoDireitaDataUrl: "",
                                })
                              }
                              className="px-2 py-1 rounded-lg border border-slate-300 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={
                            cfgHorarioCabecalho.logoDireitaDataUrl?.startsWith(
                              "data:"
                            )
                              ? ""
                              : cfgHorarioCabecalho.logoDireitaDataUrl || ""
                          }
                          onChange={(e) =>
                            setCfgHorarioCabecalho({
                              ...cfgHorarioCabecalho,
                              exibirLogoDireita: Boolean(e.target.value.trim()),
                              logoDireitaDataUrl: e.target.value,
                            })
                          }
                          placeholder="Ex: Logo CCMDF / Brasão da Escola (URL ou Upload)"
                          className="w-full rounded-lg border border-emerald-400 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                    <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                      Órgão / Secretaria / Mantenedora (Topo da Folha) *
                    </label>
                    <input
                      type="text"
                      required
                      value={cfgHorarioCabecalho.orgaoTitulo}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          orgaoTitulo: e.target.value,
                        })
                      }
                      placeholder="Ex: SECRETARIA DE ESTADO DE EDUCAÇÃO"
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                    <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                      CNPJ Institucional
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.cnpjOrgao}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          cnpjOrgao: e.target.value,
                        })
                      }
                      placeholder="Ex: 00.394.676/0001-07"
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                    <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                      Código UA (Regional)
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.ua}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          ua: e.target.value,
                        })
                      }
                      placeholder="Ex: 007"
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                    <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                      Coordenação Regional de Ensino (CRE) / Diretoria Regional
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.cre}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          cre: e.target.value,
                        })
                      }
                      placeholder="Ex: COORDENAÇÃO REGIONAL DE ENSINO DE PLANALTINA"
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. IDENTIFICAÇÃO DA UNIDADE ESCOLAR (LOCAL DE EXERCÍCIO E LOTAÇÃO) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <AcademicCapIcon className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    2. Identificação da Unidade Escolar (Local de Exercício e Lotação)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                    <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                      Código do Estabelecimento (Exercício)
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.codigoExercicio}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          codigoExercicio: e.target.value,
                        })
                      }
                      placeholder="Ex: 990230000043"
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                    <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                      Nome Oficial da Unidade Escolar (Impresso na Folha) *
                    </label>
                    <input
                      type="text"
                      required
                      value={cfgHorarioCabecalho.nomeEscola}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          nomeEscola: e.target.value,
                        })
                      }
                      placeholder="Ex: CENTRO DE ENSINO FUNDAMENTAL 04 DE PLANALTINA - COLEGIO CM"
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Linha Lotação: (Opcional — caso divirja de Exercício na Unidade Escolar) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                    <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                      Código da Lotação Padrão (Opcional)
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.codigoLotacaoPadrao || ""}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          codigoLotacaoPadrao: e.target.value,
                        })
                      }
                      placeholder="Ex: 990230000000 (se divergir)"
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                    <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                      Lotação Padrão na Folha (Opcional — só preencha se divergir de Exercício)
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.nomeLotacaoPadrao || ""}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          nomeLotacaoPadrao: e.target.value,
                        })
                      }
                      placeholder="Deixe vazio se Lotação = Exercício (ou informe ex: CRE PLANALTINA / UNIDADE CEDENTE)"
                      className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Sigla / Identificação Curta da Escola
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.siglaEscola}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          siglaEscola: e.target.value,
                        })
                      }
                      placeholder="Ex: CEF04-CCMDF"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Cidade / UF (Localidade)
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.cidadeUF}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          cidadeUF: e.target.value,
                        })
                      }
                      placeholder="Ex: Planaltina - DF"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 3. GRADE DE HORÁRIOS PADRÃO DOS TURNOS DA ESCOLA */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-indigo-700" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      3. Grade de Horários Padrão dos Turnos da Escola
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Referência para Ponto Diário e Biometria (Não impresso na folha física)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Turno Matutino */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="text-xs font-extrabold text-amber-700 uppercase">
                      ☀️ Turno Matutino
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Entrada
                        </label>
                        <input
                          type="time"
                          value={cfgHorarioCabecalho.matutinoEntrada}
                          onChange={(e) =>
                            setCfgHorarioCabecalho({
                              ...cfgHorarioCabecalho,
                              matutinoEntrada: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Saída
                        </label>
                        <input
                          type="time"
                          value={cfgHorarioCabecalho.matutinoSaida}
                          onChange={(e) =>
                            setCfgHorarioCabecalho({
                              ...cfgHorarioCabecalho,
                              matutinoSaida: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Turno Vespertino */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="text-xs font-extrabold text-blue-700 uppercase">
                      🌤️ Turno Vespertino
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Entrada
                        </label>
                        <input
                          type="time"
                          value={cfgHorarioCabecalho.vespertinoEntrada}
                          onChange={(e) =>
                            setCfgHorarioCabecalho({
                              ...cfgHorarioCabecalho,
                              vespertinoEntrada: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Saída
                        </label>
                        <input
                          type="time"
                          value={cfgHorarioCabecalho.vespertinoSaida}
                          onChange={(e) =>
                            setCfgHorarioCabecalho({
                              ...cfgHorarioCabecalho,
                              vespertinoSaida: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Turno Noturno */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="text-xs font-extrabold text-indigo-900 uppercase">
                      🌙 Turno Noturno
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Entrada
                        </label>
                        <input
                          type="time"
                          value={cfgHorarioCabecalho.noturnoEntrada}
                          onChange={(e) =>
                            setCfgHorarioCabecalho({
                              ...cfgHorarioCabecalho,
                              noturnoEntrada: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Saída
                        </label>
                        <input
                          type="time"
                          value={cfgHorarioCabecalho.noturnoSaida}
                          onChange={(e) =>
                            setCfgHorarioCabecalho({
                              ...cfgHorarioCabecalho,
                              noturnoSaida: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Intervalo / Almoço Padrão (Jornada 40h / 20h+20h)
                    </label>
                    <input
                      type="text"
                      value={cfgHorarioCabecalho.intervaloAlmoco}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          intervaloAlmoco: e.target.value,
                        })
                      }
                      placeholder="Ex: 12:00 às 13:00"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Tolerância de Registro / Biometria (Minutos)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={cfgHorarioCabecalho.toleranciaMinutos}
                      onChange={(e) =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          toleranciaMinutos: e.target.value,
                        })
                      }
                      placeholder="Ex: 15"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 4. QUADROS DE ASSINATURA (RESPONSÁVEL, CHEFIA IMEDIATA, SUPERIOR) E OBSERVAÇÃO PADRÃO DA FOLHA (PASSO 20) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <DocumentTextIcon className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    4. Quadros de Assinatura (Responsável, Chefia e Superior) & Observações da Folha
                  </span>
                </div>

                {/* Seletor de Modo: Imprimir Nome/Cargo abaixo da linha vs Deixar em Branco para Carimbo */}
                <div className="p-3 rounded-xl bg-emerald-50/85 border-2 border-emerald-300 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-950">
                      Modo de Preenchimento dos Quadros de Assinatura (Verso e Frente Contrato Temporário)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          imprimirAssinaturasNaFolha: true,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        cfgHorarioCabecalho.imprimirAssinaturasNaFolha !== false
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                          : "bg-white text-slate-700 border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={cfgHorarioCabecalho.imprimirAssinaturasNaFolha !== false}
                        onChange={() =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            imprimirAssinaturasNaFolha: true,
                          })
                        }
                        className="mt-0.5 h-4 w-4 text-emerald-700"
                      />
                      <div>
                        <div className="text-xs font-extrabold">
                          🖨️ Imprimir Nome e Cargo abaixo da linha de assinatura
                        </div>
                        <div
                          className={`text-[11px] leading-snug mt-0.5 ${
                            cfgHorarioCabecalho.imprimirAssinaturasNaFolha !== false
                              ? "text-emerald-100"
                              : "text-slate-500"
                          }`}
                        >
                          Renderiza automaticamente os nomes e cargos preenchidos abaixo no Verso (Efetivo/Temporário) e na Frente (Contrato Temporário).
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCfgHorarioCabecalho({
                          ...cfgHorarioCabecalho,
                          imprimirAssinaturasNaFolha: false,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        cfgHorarioCabecalho.imprimirAssinaturasNaFolha === false
                          ? "bg-slate-800 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-700 border-emerald-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={cfgHorarioCabecalho.imprimirAssinaturasNaFolha === false}
                        onChange={() =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            imprimirAssinaturasNaFolha: false,
                          })
                        }
                        className="mt-0.5 h-4 w-4 text-slate-800"
                      />
                      <div>
                        <div className="text-xs font-extrabold">
                          🖋️ Deixar em branco para Carimbo Manual
                        </div>
                        <div
                          className={`text-[11px] leading-snug mt-0.5 ${
                            cfgHorarioCabecalho.imprimirAssinaturasNaFolha === false
                              ? "text-slate-300"
                              : "text-slate-500"
                          }`}
                        >
                          Imprime apenas os rótulos padrão (&ldquo;Assinatura / matrícula&rdquo; e &ldquo;Assinatura / carimbo&rdquo;) para carimbo físico na escola.
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3 Quadros de Assinatura da Folha (Responsável pelas Informações | Chefia Imediata | Superior) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                  {/* Quadro 1: Responsável pelas informações (Secretaria) */}
                  <div className="p-3 rounded-xl bg-emerald-50/75 border border-emerald-300/90 space-y-2.5">
                    <div className="border-b border-emerald-200 pb-1">
                      <span className="text-[11px] font-extrabold uppercase text-emerald-950">
                        1º Quadro: Responsável pelas Informações
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-emerald-950 mb-1">
                        Nome (Secretaria / Ponto)
                      </label>
                      <input
                        type="text"
                        value={cfgHorarioCabecalho.responsavelFrequenciaNome || ""}
                        onChange={(e) =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            responsavelFrequenciaNome: e.target.value,
                          })
                        }
                        placeholder="Ex: MARIA APARECIDA DA SILVA"
                        className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-emerald-950 mb-1">
                        Cargo / Função / Matrícula
                      </label>
                      <input
                        type="text"
                        value={cfgHorarioCabecalho.responsavelFrequenciaCargo || ""}
                        onChange={(e) =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            responsavelFrequenciaCargo: e.target.value,
                          })
                        }
                        placeholder="Ex: CHEFE DE SECRETARIA — FGE-02"
                        className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Quadro 2: Assinatura da Chefia (Direção / Chefia Imediata) */}
                  <div className="p-3 rounded-xl bg-emerald-50/75 border border-emerald-300/90 space-y-2.5">
                    <div className="border-b border-emerald-200 pb-1">
                      <span className="text-[11px] font-extrabold uppercase text-emerald-950">
                        2º Quadro: Assinatura da Chefia
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-emerald-950 mb-1">
                        Nome da Chefia Imediata / Diretor(a)
                      </label>
                      <input
                        type="text"
                        value={cfgHorarioCabecalho.nomeChefiaImediata || ""}
                        onChange={(e) =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            nomeChefiaImediata: e.target.value,
                          })
                        }
                        placeholder="Ex: ANDRÉ LUIZ MORAIS DOS SANTOS"
                        className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-emerald-950 mb-1">
                        Cargo / Função da Chefia Imediata
                      </label>
                      <input
                        type="text"
                        value={cfgHorarioCabecalho.cargoChefiaImediata || ""}
                        onChange={(e) =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            cargoChefiaImediata: e.target.value,
                          })
                        }
                        placeholder="Ex: DIRETOR — FGE-06"
                        className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Quadro 3: Assinatura do Superior (Supervisor / Vice-Direção / Superior) */}
                  <div className="p-3 rounded-xl bg-emerald-50/75 border border-emerald-300/90 space-y-2.5">
                    <div className="border-b border-emerald-200 pb-1">
                      <span className="text-[11px] font-extrabold uppercase text-emerald-950">
                        3º Quadro: Assinatura do Superior
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-emerald-950 mb-1">
                        Nome do Superior / Supervisor
                      </label>
                      <input
                        type="text"
                        value={cfgHorarioCabecalho.nomeSuperiorAssinatura || ""}
                        onChange={(e) =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            nomeSuperiorAssinatura: e.target.value,
                          })
                        }
                        placeholder="Ex: CARLOS EDUARDO PEREIRA"
                        className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-emerald-950 mb-1">
                        Cargo / Função do Superior
                      </label>
                      <input
                        type="text"
                        value={cfgHorarioCabecalho.cargoSuperiorAssinatura || ""}
                        onChange={(e) =>
                          setCfgHorarioCabecalho({
                            ...cfgHorarioCabecalho,
                            cargoSuperiorAssinatura: e.target.value,
                          })
                        }
                        placeholder="Ex: VICE-DIRETOR — FGE-05"
                        className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                  <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                    Observação Institucional Padrão no Quadro &ldquo;Observações:&rdquo; da Folha (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={cfgHorarioCabecalho.observacaoPadraoFolha}
                    onChange={(e) =>
                      setCfgHorarioCabecalho({
                        ...cfgHorarioCabecalho,
                        observacaoPadraoFolha: e.target.value,
                      })
                    }
                    placeholder="Texto institucional opcional que será exibido automaticamente no quadro de Observações das folhas de frequência da unidade..."
                    className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* PASSO 22 — ITEM 4: Texto do Quadro MENSAGEM (Verso da Folha) */}
                <div className="p-2.5 rounded-xl bg-emerald-50/75 border border-emerald-300/90">
                  <label className="block text-xs font-bold uppercase text-emerald-950 mb-1">
                    Texto do Quadro MENSAGEM (Verso da Folha — Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={cfgHorarioCabecalho.mensagemQuadroVerso || ""}
                    onChange={(e) =>
                      setCfgHorarioCabecalho({
                        ...cfgHorarioCabecalho,
                        mensagemQuadroVerso: e.target.value,
                      })
                    }
                    placeholder="Ex: Devolver a folha de frequência devidamente assinada e sem rasuras na Secretaria Escolar até o 2º dia útil do mês subsequente."
                    className="w-full rounded-xl border border-emerald-400 bg-emerald-50/90 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Rodapé idêntico ao modal Cadastrar Servidor */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalHorarioCabecalhoAberto(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-95"
                  style={{
                    background: "linear-gradient(135deg, #0f172a, #2563eb)",
                  }}
                >
                  Salvar Horários & Cabeçalho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
