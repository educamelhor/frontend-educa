// src/features/administrativo/MemorandoTab.jsx
// ============================================================================
// Aba 5: MEMORANDO — Central de Documentos Oficiais e Memorando de Devolução SEEDF
// - Gerencia e emite o Memorando de Devolução (clone 1:1 do modelo oficial SEEDF:
//   "Memo Dev KARLA.pdf").
// - Ao selecionar o professor/servidor no modal, preenche automaticamente Nome,
//   Matrícula, Disciplina, Cargo (PROF TEMP / PROFESSOR EB), Carga (1 / 2),
//   Data de Admissão, Turno (Mat. / Vesp. / Not.) e cruza com os lançamentos de
//   Abono, LTS e T.R.E. registrados no sistema.
// - Motor dedicado de Impressão / Salvar PDF A4 (página única, 100% fiel à SEEDF).
// ============================================================================

import React, { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  DocumentTextIcon,
  PlusIcon,
  PrinterIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import MemorandoDevolucaoOficialSEEDF, {
  formatarDataBR,
  formatarLocalDataSEEDF,
} from "./MemorandoDevolucaoOficialSEEDF";
import { normalizarTurno } from "./useAdministrativoData";

const STORAGE_KEY_UNIDADE = "educa_admin_seedf_unidade_cfg_v1";

const ESTILOS_IMPRESSAO_MEMO_SEEDF = `
  @page {
    size: A4 portrait;
    margin: 0mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    color: #000000;
  }
  .memorando-seedf-wrapper {
    margin: 0 !important;
    padding: 0 !important;
  }
  .memorando-seedf-page {
    width: 210mm !important;
    height: 296mm !important;
    max-height: 296mm !important;
    padding: 15mm 10mm !important;
    margin: 0 auto !important;
    background: #ffffff !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }
`;

const MOTIVOS_DEVOLUCAO_SEEDF = [
  "CONTRATO TEMPORÁRIO (008) A PROFESSORA DESISTIU DA CARÊNCIA",
  "CONTRATO TEMPORÁRIO (008) O PROFESSOR DESISTIU DA CARÊNCIA",
  "CONTRATO TEMPORÁRIO — RETORNO DO(A) SERVIDOR(A) TITULAR DA CARÊNCIA",
  "CONTRATO TEMPORÁRIO — TÉRMINO DE LICENÇA / AFASTAMENTO DO(A) TITULAR",
  "CONTRATO TEMPORÁRIO — ENCERRAMENTO DE CARÊNCIA PROVISÓRIA",
  "SERVIDOR(A) EFETIVO(A) — DEVOLUÇÃO À UNIDADE REGIONAL DE GESTÃO DE PESSOAS",
  "SERVIDOR(A) EFETIVO(A) — TÉRMINO DE EXERCÍCIO PROVISÓRIO / REMANEJAMENTO",
];

const FRASES_OBSERVACAO_RAPIDA = [
  "A professora efetiva retornara as atividades.",
  "O professor efetivo retornará às atividades.",
  "O(A) servidor(a) titular retornará às atividades normais na unidade.",
  "Desistência voluntária de carência temporária.",
];

const CARGOS_RAPIDOS_MEMO = [
  "PROF TEMP",
  "PROFESSOR EB",
  "ANALISTA GEST EDUC",
  "TEC GEST EDUC",
  "MONITOR G EDUC",
];

// Extrai disciplina limpa a partir do cadastro do servidor
function extrairDisciplinaServidor(srv) {
  if (!srv) return "";
  if (srv.disciplina && String(srv.disciplina).trim()) {
    return String(srv.disciplina).trim().toUpperCase();
  }
  if (srv.componente_curricular && String(srv.componente_curricular).trim()) {
    return String(srv.componente_curricular).trim().toUpperCase();
  }
  // Tenta extrair de "Regência (Língua Portuguesa)" em srv.setor
  const setorStr = String(srv.setor || "").trim();
  const matchReg = setorStr.match(/Regência\s*\(([^)]+)\)/i);
  if (matchReg && matchReg[1]) {
    return matchReg[1].trim().toUpperCase();
  }
  // Tenta extrair de "Professor(a) — Língua Portuguesa" em srv.cargo
  const cargoStr = String(srv.cargo || "").trim();
  if (cargoStr.includes("—")) {
    const partes = cargoStr.split("—");
    if (partes[1]) return partes[1].trim().toUpperCase();
  }
  return "";
}

// Extrai matrícula limpa para o Memorando SEEDF
function extrairMatriculaLimpa(srv) {
  if (!srv || !srv.matricula) return "";
  const m = String(srv.matricula).trim();
  if (
    m.startsWith("PROF-") ||
    m.startsWith("DIR-") ||
    m.startsWith("CAD-") ||
    m.startsWith("EQP-") ||
    m.startsWith("ADM-") ||
    m.startsWith("TERC-")
  ) {
    return "";
  }
  return m.replace(/\D/g, "") || m;
}

// Detecta turnos ativos (Mat / Vesp / Not) a partir da jornada e CPIP do servidor
function detectarTurnosServidor(srv) {
  if (!srv) {
    return { mat: true, vesp: true, not: false };
  }
  const chNum = Number(String(srv.carga_horaria || "40").replace(/\D/g, "")) || 40;
  const tNorm = normalizarTurno(srv.turno || "Integral");
  const t1Norm = srv.turno_1 ? normalizarTurno(srv.turno_1) : "";
  const t2Norm = srv.turno_2 ? normalizarTurno(srv.turno_2) : "";
  const tCpip = srv.cpip_turno ? normalizarTurno(srv.cpip_turno) : "";

  const todosTurnos = [tNorm, t1Norm, t2Norm, tCpip].join(" ");
  let mat = todosTurnos.includes("Matutino") || tNorm === "Integral";
  let vesp = todosTurnos.includes("Vespertino") || tNorm === "Integral";
  let not = todosTurnos.includes("Noturno");

  if (chNum >= 40 && !not) {
    mat = true;
    vesp = true;
  }
  if (!mat && !vesp && !not) {
    mat = true;
  }
  return { mat, vesp, not };
}

export default function MemorandoTab({
  servidores = [],
  ocorrencias = [],
  memorandos = [],
  onSalvarMemorando,
  onExcluirMemorando,
}) {
  const memoPrintRef = useRef(null);

  // Carrega configuração institucional da unidade escolar
  const dadosUnidade = useMemo(() => {
    try {
      const escId = localStorage.getItem("escola_id") || "default";
      const raw =
        localStorage.getItem(`${STORAGE_KEY_UNIDADE}_${escId}`) ||
        localStorage.getItem(STORAGE_KEY_UNIDADE);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {
      codigoExercicio: "990230000043",
      nomeEscola: "CENTRO DE ENSINO FUNDAMENTAL 04 DE PLANALTINA - COLEGIO CM",
    };
  }, []);

  const nomeEscolaExtensoPadrao = useMemo(() => {
    const raw = String(dadosUnidade?.nomeEscola || "").trim();
    if (
      !raw ||
      raw.toUpperCase().includes("CEF04") ||
      raw.toUpperCase().includes("FUNDAMENTAL 04 DE PLANALTINA")
    ) {
      return "Centro de Ensino Fundamental 04 de Planaltina - Colégio Cívico-Militar do Distrito Federal";
    }
    return raw;
  }, [dadosUnidade]);

  const [buscaLista, setBuscaLista] = useState("");
  const [memoSelecionadoId, setMemoSelecionadoId] = useState(
    () => memorandos[0]?.id || ""
  );

  // Estado do Modal de Emissão / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [buscaServidorModal, setBuscaServidorModal] = useState("");
  const [filtroVinculoModal, setFiltroVinculoModal] = useState("todos"); // "todos" | "temporario" | "efetivo"

  const anoAtual = new Date().getFullYear();
  const hojeISO = new Date().toISOString().slice(0, 10);

  const criarFormInicial = (srv = null) => {
    const isTemp = srv
      ? String(srv.vinculo || "").toLowerCase().includes("tempor")
      : true;
    const chNum = srv
      ? Number(String(srv.carga_horaria || "40").replace(/\D/g, "")) || 40
      : 40;
    const turnos = detectarTurnosServidor(srv);

    return {
      id: "",
      tipo_memo: "devolucao",
      numero_memo: `SN/${anoAtual}`,
      cidade_uf: "Planaltina-DF",
      data_emissao: hojeISO,
      local_data_custom: "",
      unidade_escolar: nomeEscolaExtensoPadrao,
      destinatario: "UNIDADE REGIONAL DE GESTAO DE PESSOAS",
      codigo_unidade: dadosUnidade?.codigoExercicio || "990230000043",
      estilo_logo: "buriti_classico", // "buriti_classico" | "brasao_gdf"
      servidor_id: srv?.id || "",
      servidor_nome: srv ? String(srv.nome || "").toUpperCase() : "",
      matricula: extrairMatriculaLimpa(srv),
      disciplina: extrairDisciplinaServidor(srv),
      serie: "",
      cargo: isTemp ? "PROF TEMP" : "PROFESSOR EB",
      carga_1: true,
      carga_2: chNum > 20,
      data_admissao: srv?.data_admissao || "",
      turno_mat: turnos.mat,
      turno_vesp: turnos.vesp,
      turno_not: turnos.not,
      ultimo_dia_frequencia: hojeISO,
      motivo: MOTIVOS_DEVOLUCAO_SEEDF[0],
      abono_opcao: "nao_usufruiu", // "nao_usufruiu" | "usufruiu" | "nao_faz_jus"
      dias_abono: "",
      lts_opcao: "nao_usufruiu", // "nao_usufruiu" | "usufruiu"
      dias_lts: "",
      tre_usufruiu: false,
      dias_tre: "",
      observacao_complementar: "A professora efetiva retornara as atividades.",
    };
  };

  const [formMemo, setFormMemo] = useState(() => criarFormInicial(null));

  // Quando a lista de memorandos mudar e nenhum estiver selecionado, seleciona o primeiro
  useEffect(() => {
    if (memorandos.length > 0 && !memorandos.some((m) => m.id === memoSelecionadoId)) {
      setMemoSelecionadoId(memorandos[0].id);
    }
  }, [memorandos, memoSelecionadoId]);

  // Servidores ativos ordenados alfabeticamente
  const servidoresAtivos = useMemo(() => {
    return [...servidores]
      .filter((s) => s.ativo !== false)
      .sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
          sensitivity: "base",
        })
      );
  }, [servidores]);

  // Filtra servidores dentro do modal de seleção
  const servidoresFiltradosModal = useMemo(() => {
    return servidoresAtivos.filter((s) => {
      const vinc = String(s.vinculo || "").toLowerCase();
      if (filtroVinculoModal === "temporario" && !vinc.includes("tempor")) {
        return false;
      }
      if (filtroVinculoModal === "efetivo" && vinc.includes("tempor")) {
        return false;
      }
      if (!buscaServidorModal.trim()) return true;
      const q = buscaServidorModal.toLowerCase().trim();
      return (
        String(s.nome || "").toLowerCase().includes(q) ||
        String(s.matricula || "").toLowerCase().includes(q) ||
        String(s.cargo || "").toLowerCase().includes(q) ||
        String(s.setor || "").toLowerCase().includes(q) ||
        String(s.cpf || "").includes(q)
      );
    });
  }, [servidoresAtivos, filtroVinculoModal, buscaServidorModal]);

  // Resumo inteligente de ocorrências do servidor selecionado no modal (Abono, LTS, TRE no ano)
  const resumoOcorrenciasServidorModal = useMemo(() => {
    if (!formMemo.servidor_id) {
      return { diasAbono: 0, diasLts: 0, diasTre: 0, totalRegistros: 0 };
    }
    let diasAbono = 0;
    let diasLts = 0;
    let diasTre = 0;
    let totalRegistros = 0;

    ocorrencias.forEach((occ) => {
      if (occ.servidor_id !== formMemo.servidor_id) return;
      if (occ.status === "cancelado") return;
      const anoOcc = String(occ.data_inicio || "").slice(0, 4);
      if (anoOcc && Number(anoOcc) !== anoAtual) return;

      const qtd = Math.max(1, Number(occ.dias) || 1);
      const subUp = String(occ.subtipo || "").toUpperCase();
      const tipoLow = String(occ.tipo || "").toLowerCase();

      if (subUp.includes("TRE") || subUp.includes("ELEITORAL")) {
        diasTre += qtd;
        totalRegistros++;
      } else if (tipoLow === "abono" || subUp.includes("ABONO")) {
        diasAbono += qtd;
        totalRegistros++;
      } else if (
        tipoLow === "licenca" ||
        tipoLow === "atestado" ||
        subUp.includes("ATESTADO") ||
        subUp.includes("LICENCA") ||
        subUp.includes("LICENÇA")
      ) {
        diasLts += qtd;
        totalRegistros++;
      }
    });

    return { diasAbono, diasLts, diasTre, totalRegistros };
  }, [ocorrencias, formMemo.servidor_id, anoAtual]);

  // Ao escolher um servidor no modal, preenche automaticamente todos os dados funcionais e cruza ocorrências
  const handleSelecionarServidorNoModal = (srv) => {
    if (!srv) return;
    const isTemp = String(srv.vinculo || "").toLowerCase().includes("tempor");
    const chNum =
      Number(String(srv.carga_horaria || "40").replace(/\D/g, "")) || 40;
    const turnos = detectarTurnosServidor(srv);

    // Calcula se o servidor teve abono, LTS ou TRE no ano para sugerir automaticamente
    let diasAbonoCalc = 0;
    let diasLtsCalc = 0;
    let diasTreCalc = 0;
    ocorrencias.forEach((occ) => {
      if (occ.servidor_id !== srv.id || occ.status === "cancelado") return;
      const anoOcc = String(occ.data_inicio || "").slice(0, 4);
      if (anoOcc && Number(anoOcc) !== anoAtual) return;
      const qtd = Math.max(1, Number(occ.dias) || 1);
      const subUp = String(occ.subtipo || "").toUpperCase();
      const tipoLow = String(occ.tipo || "").toLowerCase();
      if (subUp.includes("TRE") || subUp.includes("ELEITORAL")) {
        diasTreCalc += qtd;
      } else if (tipoLow === "abono" || subUp.includes("ABONO")) {
        diasAbonoCalc += qtd;
      } else if (tipoLow === "licenca" || tipoLow === "atestado") {
        diasLtsCalc += qtd;
      }
    });

    setFormMemo((prev) => ({
      ...prev,
      servidor_id: srv.id,
      servidor_nome: String(srv.nome || "").toUpperCase(),
      matricula: extrairMatriculaLimpa(srv),
      disciplina: extrairDisciplinaServidor(srv) || prev.disciplina,
      cargo: isTemp ? "PROF TEMP" : "PROFESSOR EB",
      carga_1: true,
      carga_2: chNum > 20,
      data_admissao: srv.data_admissao || prev.data_admissao || "",
      turno_mat: turnos.mat,
      turno_vesp: turnos.vesp,
      turno_not: turnos.not,
      abono_opcao: diasAbonoCalc > 0 ? "usufruiu" : "nao_usufruiu",
      dias_abono: diasAbonoCalc > 0 ? String(diasAbonoCalc) : "",
      lts_opcao: diasLtsCalc > 0 ? "usufruiu" : "nao_usufruiu",
      dias_lts: diasLtsCalc > 0 ? String(diasLtsCalc) : "",
      tre_usufruiu: diasTreCalc > 0,
      dias_tre: diasTreCalc > 0 ? String(diasTreCalc) : "",
    }));
  };

  // Abre modal para criar novo Memorando de Devolução
  const handleAbrirNovoMemorando = (srvPreSelecionado = null) => {
    const srvInicial = srvPreSelecionado || servidoresAtivos[0] || null;
    const base = criarFormInicial(srvInicial);
    setBuscaServidorModal("");
    setFiltroVinculoModal("todos");
    setFormMemo(base);
    if (srvInicial) {
      setTimeout(() => handleSelecionarServidorNoModal(srvInicial), 0);
    }
    setModalAberto(true);
  };

  // Abre modal para editar um Memorando existente
  const handleAbrirEditarMemorando = (memo) => {
    if (!memo) return;
    setBuscaServidorModal("");
    setFiltroVinculoModal("todos");
    setFormMemo({
      ...criarFormInicial(null),
      ...memo,
    });
    setModalAberto(true);
  };

  // Duplica um memorando existente
  const handleDuplicarMemorando = async (memo) => {
    if (!memo) return;
    const copia = {
      ...memo,
      id: "",
      numero_memo: memo.numero_memo || `SN/${anoAtual}`,
      data_emissao: hojeISO,
    };
    const res = await onSalvarMemorando?.(copia);
    if (res?.memorando?.id) {
      setMemoSelecionadoId(res.memorando.id);
    }
    toast.success("Memorando duplicado com sucesso!");
  };

  const handleConfirmarSalvarModal = async (e) => {
    if (e) e.preventDefault();
    if (!String(formMemo.servidor_nome || "").trim()) {
      toast.error("Informe ou selecione o(a) Professor(a) / Servidor(a).");
      return;
    }
    const res = await onSalvarMemorando?.(formMemo);
    if (res?.memorando?.id) {
      setMemoSelecionadoId(res.memorando.id);
    }
    setModalAberto(false);
    toast.success(
      formMemo.id
        ? "Memorando de Devolução atualizado!"
        : "Memorando de Devolução gerado com sucesso!"
    );
  };

  // Memorandos filtrados na barra lateral
  const memorandosFiltrados = useMemo(() => {
    if (!buscaLista.trim()) return memorandos;
    const q = buscaLista.toLowerCase().trim();
    return memorandos.filter(
      (m) =>
        String(m.servidor_nome || "").toLowerCase().includes(q) ||
        String(m.matricula || "").toLowerCase().includes(q) ||
        String(m.numero_memo || "").toLowerCase().includes(q) ||
        String(m.disciplina || "").toLowerCase().includes(q) ||
        String(m.motivo || "").toLowerCase().includes(q)
    );
  }, [memorandos, buscaLista]);

  // Memorando atualmente exibido no Espelho 1:1 SEEDF (ou preview de demonstração caso ainda não haja nenhum salvo)
  const memorandoAtivo = useMemo(() => {
    const encontrado = memorandos.find((m) => m.id === memoSelecionadoId);
    if (encontrado) return encontrado;
    if (memorandos.length > 0) return memorandos[0];

    // Se ainda não houver memorando emitido, monta um preview padrão com o 1º professor ativo (ou modelo SEEDF)
    const srvDemo =
      servidoresAtivos.find((s) =>
        String(s.vinculo || "").toLowerCase().includes("tempor")
      ) ||
      servidoresAtivos[0] ||
      null;

    if (srvDemo) {
      const turnos = detectarTurnosServidor(srvDemo);
      const chNum =
        Number(String(srvDemo.carga_horaria || "40").replace(/\D/g, "")) || 40;
      return {
        id: "preview-seedf",
        _isPreview: true,
        numero_memo: `SN/${anoAtual}`,
        cidade_uf: "Planaltina-DF",
        data_emissao: hojeISO,
        unidade_escolar: nomeEscolaExtensoPadrao,
        destinatario: "UNIDADE REGIONAL DE GESTAO DE PESSOAS",
        codigo_unidade: dadosUnidade?.codigoExercicio || "990230000043",
        estilo_logo: "buriti_classico",
        servidor_id: srvDemo.id,
        servidor_nome: String(srvDemo.nome || "").toUpperCase(),
        matricula: extrairMatriculaLimpa(srvDemo) || "70757690",
        disciplina: extrairDisciplinaServidor(srvDemo) || "LÍNGUA PORTUGUESA",
        serie: "",
        cargo: String(srvDemo.vinculo || "").toLowerCase().includes("tempor")
          ? "PROF TEMP"
          : "PROFESSOR EB",
        carga_1: true,
        carga_2: chNum > 20,
        data_admissao: srvDemo.data_admissao || hojeISO,
        turno_mat: turnos.mat,
        turno_vesp: turnos.vesp,
        turno_not: turnos.not,
        ultimo_dia_frequencia: hojeISO,
        motivo: "CONTRATO TEMPORÁRIO (008) A PROFESSORA DESISTIU DA CARÊNCIA",
        abono_opcao: "nao_usufruiu",
        dias_abono: "",
        lts_opcao: "nao_usufruiu",
        dias_lts: "",
        tre_usufruiu: false,
        dias_tre: "",
        observacao_complementar: "A professora efetiva retornara as atividades.",
      };
    }

    return {
      id: "preview-seedf",
      _isPreview: true,
      numero_memo: "SN/2026",
      cidade_uf: "Planaltina-DF",
      data_emissao: "2026-11-03",
      unidade_escolar: nomeEscolaExtensoPadrao,
      destinatario: "UNIDADE REGIONAL DE GESTAO DE PESSOAS",
      codigo_unidade: dadosUnidade?.codigoExercicio || "990230000043",
      estilo_logo: "buriti_classico",
      servidor_nome: "KARLA ALVES CAMPOS",
      matricula: "70757690",
      disciplina: "LÍNGUA PORTUGUESA",
      serie: "",
      cargo: "PROF TEMP",
      carga_1: true,
      carga_2: true,
      data_admissao: "2026-10-13",
      turno_mat: true,
      turno_vesp: true,
      turno_not: false,
      ultimo_dia_frequencia: "2026-11-03",
      motivo: "CONTRATO TEMPORÁRIO (008) A PROFESSORA DESISTIU DA CARÊNCIA",
      abono_opcao: "nao_usufruiu",
      dias_abono: "",
      lts_opcao: "nao_usufruiu",
      dias_lts: "",
      tre_usufruiu: false,
      dias_tre: "",
      observacao_complementar: "A professora efetiva retornara as atividades.",
    };
  }, [
    memorandos,
    memoSelecionadoId,
    servidoresAtivos,
    anoAtual,
    hojeISO,
    nomeEscolaExtensoPadrao,
    dadosUnidade,
  ]);

  // Motor dedicado de Impressão / Salvar PDF A4 1:1
  const handleImprimirMemorando = () => {
    if (!memoPrintRef.current) {
      window.print();
      return;
    }

    const conteudoHTML = memoPrintRef.current.innerHTML;
    const nomeLimpo = String(memorandoAtivo?.servidor_nome || "SERVIDOR")
      .replace(/\s+/g, "_")
      .toUpperCase();
    const tituloDoc = `Memorando_Devolucao_SEEDF_${nomeLimpo}`;

    const printWin = window.open("", "_blank", "width=1024,height=900");
    if (!printWin) {
      toast.error(
        "Permita pop-ups no navegador para gerar o PDF oficial do Memorando."
      );
      window.print();
      return;
    }

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>${tituloDoc}</title>
          <style>${ESTILOS_IMPRESSAO_MEMO_SEEDF}</style>
        </head>
        <body>
          ${conteudoHTML}
          <script>
            window.onload = function() {
              var imgs = Array.prototype.slice.call(document.images || []);
              var promises = imgs.map(function(img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function(resolve) {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              });
              Promise.all(promises).then(function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 250);
              });
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* ── Barra de Topo / Ações Rápidas do Módulo Memorando ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Central de Memorandos Oficiais (SEEDF)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  Modelo Oficial UNIGEP / SEEDF
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Selecione o(a) professor(a), confira ou ajuste as informações básicas no modal e gere o{" "}
                <strong>Memorando de Devolução</strong> idêntico ao padrão oficial da SEEDF.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleAbrirNovoMemorando(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-md transition"
            >
              <PlusIcon className="h-4 w-4 stroke-[2.5]" />
              <span>Novo Memorando de Devolução</span>
            </button>

            <button
              type="button"
              onClick={() =>
                memorandoAtivo?._isPreview
                  ? handleAbrirNovoMemorando(
                      servidores.find((s) => s.id === memorandoAtivo.servidor_id) ||
                        null
                    )
                  : handleAbrirEditarMemorando(memorandoAtivo)
              }
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition"
            >
              <PencilSquareIcon className="h-4 w-4 text-blue-600" />
              <span>
                {memorandoAtivo?._isPreview
                  ? "Personalizar / Emitir Este"
                  : "Editar Memorando"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleImprimirMemorando}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-md transition"
            >
              <PrinterIcon className="h-4 w-4 stroke-[2.2]" />
              <span>Imprimir / Salvar PDF A4</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Grid Principal: Coluna Esquerda (Histórico + Emissão Rápida por Professor) | Direita (Espelho 1:1 SEEDF) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda (4 cols em telas XL): Lista de Memorandos Emitidos & Seleção Rápida de Professor */}
        <div className="xl:col-span-4 space-y-5 print:hidden">
          {/* Card 1: Memorandos Emitidos / Salvos */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Memorandos Emitidos ({memorandos.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Clique em um documento para visualizar, editar ou imprimir
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAbrirNovoMemorando(null)}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm transition"
              >
                <PlusIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Emitir</span>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Busca */}
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaLista}
                  onChange={(e) => setBuscaLista(e.target.value)}
                  placeholder="Buscar por professor, matrícula ou nº..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {memorandosFiltrados.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                  <DocumentTextIcon className="h-8 w-8 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-700">
                    {memorandos.length === 0
                      ? "Nenhum memorando emitido ainda"
                      : "Nenhum memorando encontrado para esta busca"}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Clique em <strong>Novo Memorando de Devolução</strong> ou escolha um professor abaixo para gerar o documento oficial SEEDF.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {memorandosFiltrados.map((item) => {
                    const selecionado = memorandoAtivo?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setMemoSelecionadoId(item.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                          selecionado
                            ? "bg-blue-50/90 border-blue-400 shadow-sm"
                            : "bg-white hover:bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800">
                                MEMO nº {item.numero_memo || "SN/2026"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                {item.cargo || "PROF TEMP"}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-1">
                              {item.servidor_nome}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              Matrícula: <strong>{item.matricula || "—"}</strong>{" "}
                              {item.disciplina ? `• ${item.disciplina}` : ""}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Último dia:{" "}
                              <strong>
                                {formatarDataBR(
                                  item.ultimo_dia_frequencia || item.data_emissao
                                )}
                              </strong>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-1 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleAbrirEditarMemorando(item)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition"
                              title="Editar Memorando"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicarMemorando(item)}
                              className="p-1.5 rounded-lg hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition"
                              title="Duplicar Memorando"
                            >
                              <DocumentDuplicateIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Deseja excluir o Memorando de Devolução de ${item.servidor_nome}?`
                                  )
                                ) {
                                  onExcluirMemorando?.(item.id);
                                  toast.success("Memorando excluído.");
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-slate-500 hover:text-red-600 transition"
                              title="Excluir Memorando"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Seleção Rápida de Professor para Gerar Memorando */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200/80">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                  Gerar Rápido por Professor / Servidor
                </h3>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Clique em um profissional para abrir o modal já preenchido
              </p>
            </div>

            <div className="p-3.5 max-h-[280px] overflow-y-auto space-y-1.5">
              {servidoresAtivos.slice(0, 25).map((srv) => {
                const isTemp = String(srv.vinculo || "")
                  .toLowerCase()
                  .includes("tempor");
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => handleAbrirNovoMemorando(srv)}
                    className="w-full p-2.5 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 flex items-center justify-between gap-2 text-left transition group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-950 truncate">
                        {srv.nome}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {extrairDisciplinaServidor(srv) || srv.cargo || "Docente"}{" "}
                        {extrairMatriculaLimpa(srv)
                          ? `• Mat. ${extrairMatriculaLimpa(srv)}`
                          : ""}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase flex-shrink-0 ${
                        isTemp
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {isTemp ? "TEMP" : "EFETIVO"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna Direita (8 cols em telas XL): Visualização 1:1 do Memorando de Devolução SEEDF */}
        <div className="xl:col-span-8 space-y-3">
          {memorandoAtivo?._isPreview && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2.5 text-xs text-amber-900">
                <InformationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Visualização de Modelo SEEDF:</strong> Clique em{" "}
                  <strong>Novo Memorando de Devolução</strong> para selecionar o(a) professor(a), preencher os dados no modal e salvar no histórico da escola.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleAbrirNovoMemorando(
                    servidores.find((s) => s.id === memorandoAtivo.servidor_id) ||
                      null
                  )
                }
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex-shrink-0 transition"
              >
                Preencher no Modal
              </button>
            </div>
          )}

          {/* Container A4 com scroll horizontal suave em telas menores */}
          <div className="bg-slate-200/70 rounded-3xl p-4 sm:p-6 border border-slate-300/80 overflow-x-auto">
            <div ref={memoPrintRef}>
              <MemorandoDevolucaoOficialSEEDF
                memorando={memorandoAtivo}
                dadosUnidade={dadosUnidade}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL INTELIGENTE: GERAR / EDITAR MEMORANDO DE DEVOLUÇÃO (MODELO SEEDF)
         ══════════════════════════════════════════════════════════════════════ */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
            {/* Header do Modal */}
            <div
              className="px-6 py-4 text-white flex items-center justify-between gap-4 flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0284c7 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                    Padrão Oficial UNIGEP / SEEDF
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                    {formMemo.id
                      ? "Editar Memorando de Devolução"
                      : "Gerar Memorando de Devolução"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="p-2 rounded-xl hover:bg-white/15 text-white/85 hover:text-white transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo do Modal com Scroll */}
            <form
              onSubmit={handleConfirmarSalvarModal}
              className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1"
            >
              {/* Banner informativo padrão Folha/Documento SEEDF */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <span>
                  Todos os campos em <strong>verde claro</strong> abaixo compõem diretamente o{" "}
                  <strong>Memorando de Devolução Oficial da SEEDF</strong> a ser impresso / salvo em PDF.
                </span>
              </div>

              {/* ── SEÇÃO 1: SELEÇÃO DO PROFESSOR / SERVIDOR ── */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4 text-emerald-700" />
                    <span>1. Selecionar Professor(a) / Servidor(a)</span>
                  </label>

                  {/* Filtros rápidos de vínculo */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: "todos", label: "Todos" },
                      { id: "temporario", label: "Contrato Temporário" },
                      { id: "efetivo", label: "Efetivos" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFiltroVinculoModal(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          filtroVinculoModal === f.id
                            ? "bg-emerald-700 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Busca + Select rápido */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5 relative">
                    <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={buscaServidorModal}
                      onChange={(e) => setBuscaServidorModal(e.target.value)}
                      placeholder="Filtrar por nome ou matrícula..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <select
                      value={formMemo.servidor_id || ""}
                      onChange={(e) => {
                        const srv = servidores.find(
                          (s) => s.id === e.target.value
                        );
                        if (srv) handleSelecionarServidorNoModal(srv);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">
                        -- Selecione um(a) professor(a) cadastrado(a) ou digite abaixo --
                      </option>
                      {servidoresFiltradosModal.map((srv) => {
                        const isTemp = String(srv.vinculo || "")
                          .toLowerCase()
                          .includes("tempor");
                        const mat = extrairMatriculaLimpa(srv);
                        return (
                          <option key={srv.id} value={srv.id}>
                            {srv.nome} {mat ? `— Mat: ${mat}` : ""} (
                            {isTemp ? "Contrato Temporário" : "Efetivo"})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Campos Funcionais do Quadro 2 do Memorando */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nome do(a) Servidor(a) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formMemo.servidor_nome}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          servidor_nome: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Ex: KARLA ALVES CAMPOS"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Matrícula
                    </label>
                    <input
                      type="text"
                      value={formMemo.matricula}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          matricula: e.target.value,
                        }))
                      }
                      placeholder="Ex: 70757690"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Data de Admissão
                    </label>
                    <input
                      type="date"
                      value={formMemo.data_admissao || ""}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          data_admissao: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Disciplina / Componente Curricular
                    </label>
                    <input
                      type="text"
                      value={formMemo.disciplina}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          disciplina: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Ex: LÍNGUA PORTUGUESA"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Série (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formMemo.serie}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          serie: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Ex: 6º ao 9º"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cargo (Sigla Oficial SEEDF)
                    </label>
                    <input
                      type="text"
                      value={formMemo.cargo}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          cargo: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Ex: PROF TEMP"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {CARGOS_RAPIDOS_MEMO.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            setFormMemo((p) => ({ ...p, cargo: c }))
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                            formMemo.cargo === c
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Linha Carga (1 e 2) + Turno (Mat, Vesp, Not) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-white border border-emerald-200">
                    <div className="text-[11px] font-extrabold text-slate-700 mb-2">
                      Carga Horária no Memorando:
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormMemo((p) => ({ ...p, carga_1: !p.carga_1 }))
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                          formMemo.carga_1
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        1 ({formMemo.carga_1 ? "X" : " "}) — 1ª Carga
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormMemo((p) => ({ ...p, carga_2: !p.carga_2 }))
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                          formMemo.carga_2
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        2 ({formMemo.carga_2 ? "X" : " "}) — 2ª Carga
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-emerald-200">
                    <div className="text-[11px] font-extrabold text-slate-700 mb-2">
                      Turno(s) de Atuação:
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { key: "turno_mat", label: "Mat." },
                        { key: "turno_vesp", label: "Vesp." },
                        { key: "turno_not", label: "Not." },
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() =>
                            setFormMemo((p) => ({ ...p, [t.key]: !p[t.key] }))
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                            formMemo[t.key]
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {t.label} ({formMemo[t.key] ? "X" : " "})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SEÇÃO 2: NÚMERO DO MEMO, DATA DO ÚLTIMO DIA E MOTIVO DA DEVOLUÇÃO ── */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4 text-emerald-700" />
                  <span>
                    2. Dados do Memorando, Último Dia de Frequência e Motivo
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      MEMO nº
                    </label>
                    <input
                      type="text"
                      value={formMemo.numero_memo}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          numero_memo: e.target.value,
                        }))
                      }
                      placeholder="Ex: SN/2026 ou 014/2026"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cidade / Localidade
                    </label>
                    <input
                      type="text"
                      value={formMemo.cidade_uf}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          cidade_uf: e.target.value,
                        }))
                      }
                      placeholder="Ex: Planaltina-DF"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Data do Memorando
                    </label>
                    <input
                      type="date"
                      value={formMemo.data_emissao || ""}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          data_emissao: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <div className="text-[10px] text-emerald-800 mt-0.5 font-semibold">
                      Imprime:{" "}
                      {formatarLocalDataSEEDF(
                        formMemo.cidade_uf,
                        formMemo.data_emissao
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Último Dia de Frequência *
                    </label>
                    <input
                      type="date"
                      required
                      value={formMemo.ultimo_dia_frequencia || ""}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          ultimo_dia_frequencia: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Motivo da Devolução (clique em um modelo oficial ou digite livremente) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formMemo.motivo}
                    onChange={(e) =>
                      setFormMemo((p) => ({
                        ...p,
                        motivo: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Ex: CONTRATO TEMPORÁRIO (008) A PROFESSORA DESISTIU DA CARÊNCIA"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {MOTIVOS_DEVOLUCAO_SEEDF.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setFormMemo((p) => ({ ...p, motivo: m }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border text-left transition ${
                          formMemo.motivo === m
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── SEÇÃO 3: QUADRO "INFORMAMOS AINDA QUE" (ABONO, LTS, T.R.E. E OBSERVAÇÃO FINAL) ── */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <SparklesIcon className="h-4 w-4 text-emerald-700" />
                    <span>
                      3. Declarações de Abono, LTS (Portaria nº 40/2011), T.R.E. e Observação
                    </span>
                  </label>

                  {resumoOcorrenciasServidorModal.totalRegistros > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 text-[11px] font-bold">
                      Detectado no ano:{" "}
                      {resumoOcorrenciasServidorModal.diasAbono}d Abono •{" "}
                      {resumoOcorrenciasServidorModal.diasLts}d LTS/Atestado •{" "}
                      {resumoOcorrenciasServidorModal.diasTre}d TRE
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Bloco Abono */}
                  <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-2">
                    <div className="text-xs font-extrabold text-slate-800">
                      Abono de Ponto (LC 840/2011)
                    </div>
                    {[
                      { id: "nao_usufruiu", label: "( X ) Não usufruiu abono." },
                      {
                        id: "usufruiu",
                        label: "( X ) Usufruiu dia(s) de abono(s)",
                      },
                      {
                        id: "nao_faz_jus",
                        label: "( X ) Não faz juz ao abono.",
                      },
                    ].map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() =>
                          setFormMemo((p) => ({ ...p, abono_opcao: op.id }))
                        }
                        className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold border transition ${
                          formMemo.abono_opcao === op.id
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                    {formMemo.abono_opcao === "usufruiu" && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Quantidade de dias de abono usufruídos:
                        </label>
                        <input
                          type="text"
                          value={formMemo.dias_abono}
                          onChange={(e) =>
                            setFormMemo((p) => ({
                              ...p,
                              dias_abono: e.target.value,
                            }))
                          }
                          placeholder="Ex: 02"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bloco LTS */}
                  <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-2">
                    <div className="text-xs font-extrabold text-slate-800">
                      LTS (Portaria nº 40 de 11/03/2011)
                    </div>
                    {[
                      {
                        id: "nao_usufruiu",
                        label: "( X ) Não usufruiu LTS",
                      },
                      {
                        id: "usufruiu",
                        label: "( X ) Usufruiu dia(s) de LTS",
                      },
                    ].map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() =>
                          setFormMemo((p) => ({ ...p, lts_opcao: op.id }))
                        }
                        className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold border transition ${
                          formMemo.lts_opcao === op.id
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                    {formMemo.lts_opcao === "usufruiu" && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Quantidade de dias de LTS:
                        </label>
                        <input
                          type="text"
                          value={formMemo.dias_lts}
                          onChange={(e) =>
                            setFormMemo((p) => ({
                              ...p,
                              dias_lts: e.target.value,
                            }))
                          }
                          placeholder="Ex: 03"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bloco T.R.E. */}
                  <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-2">
                    <div className="text-xs font-extrabold text-slate-800">
                      Dias do T.R.E. (Justiça Eleitoral)
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormMemo((p) => ({
                          ...p,
                          tre_usufruiu: false,
                          dias_tre: "",
                        }))
                      }
                      className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold border transition ${
                        !formMemo.tre_usufruiu
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ( &nbsp; ) Não usufruiu T.R.E. (Deixar em branco)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormMemo((p) => ({ ...p, tre_usufruiu: true }))
                      }
                      className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold border transition ${
                        formMemo.tre_usufruiu
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ( X ) Usufruiu dia(s) do T.R.E.
                    </button>
                    {formMemo.tre_usufruiu && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Quantidade de dias do T.R.E.:
                        </label>
                        <input
                          type="text"
                          value={formMemo.dias_tre}
                          onChange={(e) =>
                            setFormMemo((p) => ({
                              ...p,
                              dias_tre: e.target.value,
                            }))
                          }
                          placeholder="Ex: 02"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Observação Complementar */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Observação Final do Quadro (Ex: &quot;A professora efetiva retornara as atividades.&quot;)
                  </label>
                  <input
                    type="text"
                    value={formMemo.observacao_complementar}
                    onChange={(e) =>
                      setFormMemo((p) => ({
                        ...p,
                        observacao_complementar: e.target.value,
                      }))
                    }
                    placeholder="Ex: A professora efetiva retornara as atividades."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {FRASES_OBSERVACAO_RAPIDA.map((frase) => (
                      <button
                        key={frase}
                        type="button"
                        onClick={() =>
                          setFormMemo((p) => ({
                            ...p,
                            observacao_complementar: frase,
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-emerald-100 text-slate-700 border border-slate-200 transition"
                      >
                        {frase}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setFormMemo((p) => ({
                          ...p,
                          observacao_complementar: "",
                        }))
                      }
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-red-50 text-red-600 border border-red-200 transition"
                    >
                      Deixar em branco
                    </button>
                  </div>
                </div>
              </div>

              {/* ── SEÇÃO 4: CABEÇALHO DA UNIDADE ESCOLAR E DESTINATÁRIO ── */}
              <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <BuildingLibraryIcon className="h-4 w-4 text-emerald-700" />
                  <span>4. Cabeçalho da Unidade Escolar & Destinatário</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-12">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nome da Unidade Escolar no Cabeçalho
                    </label>
                    <input
                      type="text"
                      value={formMemo.unidade_escolar}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          unidade_escolar: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Destinatário — Ao(À)
                    </label>
                    <input
                      type="text"
                      value={formMemo.destinatario}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          destinatario: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Código da Unidade
                    </label>
                    <input
                      type="text"
                      value={formMemo.codigo_unidade}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          codigo_unidade: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Emblema do Cabeçalho
                    </label>
                    <select
                      value={formMemo.estilo_logo || "buriti_classico"}
                      onChange={(e) =>
                        setFormMemo((p) => ({
                          ...p,
                          estilo_logo: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="buriti_classico">
                        Coluna do Buriti P&B (Padrão Memo)
                      </option>
                      <option value="brasao_gdf">Brasão GDF Colorido</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="h-4 w-4 stroke-[2.5]" />
                  <span>
                    {formMemo.id
                      ? "Salvar Alterações no Memorando"
                      : "Gerar Memorando de Devolução"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
