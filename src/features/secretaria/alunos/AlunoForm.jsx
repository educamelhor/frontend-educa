// src/features/alunos/AlunoForm.jsx
// ────────────────────────────────────────────────────────────────
// Componente: AlunoForm
// Finalidade: Modal de cadastro/edição de aluno (individual)
//
// Ajustes (PASSO 1 - já entregues e mantidos):
// 1) Normalizar data para <input type="date"> (YYYY-MM-DD)
// 2) Preencher automaticamente a TURMA ao abrir em modo de edição:
//    - Se não vier turma_id, mas vier o nome da turma (ex.: "1A"),
//      mapear pelo nome dentro da lista carregada de /api/turmas.
//
// Ajuste (PASSO 2 - atual):
// 3) Bloquear edição do campo CÓDIGO quando estiver em modo edição
//    (ou seja, quando existir initialData.id).
//
// Observação: Todo o restante foi preservado como já aprovado.
// ────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from "react";
import { Dialog } from "@headlessui/react";
import api from "../../../services/api";
import Input from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";

// ────────────────────────────────────────────────────────────────
// Normalizador / Abreviador e Validador Semântico de ANEE (SEEDF / EDUCADF)
// - Converte descrições oficiais em siglas: "TRANSTORNO DO ESPECTRO AUTISTA" -> "TEA"
// - Rejeita automaticamente dados espúrios (ex.: nomes de responsáveis/filiação,
//   endereços, telefones ou CPFs) herdados de importações legadas.
// ────────────────────────────────────────────────────────────────
const REGRAS_ANEES_SEEDF = [
  {
    sigla: "SC",
    descricao: "Surdocegueira",
    regexFrase: /SURDOCEGUEIR/,
    regexSigla: /^SC(\s*[-–:(].*)?$/,
  },
  {
    sigla: "TEA",
    descricao: "Transtorno do Espectro Autista",
    regexFrase: /ESPECTRO AUTISTA|\bAUTISM|\bASPERGER\b|SINDROME DE RETT|DESINTEGRATIVO DA INFANCIA/,
    regexSigla: /^TEA(\s*[-–:(].*)?$/,
  },
  {
    sigla: "TGD",
    descricao: "Transtorno Global do Desenvolvimento",
    regexFrase: /GLOBAL DO DESENVOLVIMENTO/,
    regexSigla: /^TGD(\s*[-–:(].*)?$/,
  },
  {
    sigla: "DF",
    descricao: "Deficiência Física",
    regexFrase:
      /DEFICIENCIA FISICA|DEFICIENCIA MOTORA|PARALISIA CEREBRAL|OSTOMIA|MOBILIDADE REDUZIDA|\bCADEIRANTE\b/,
    regexSigla: /^DF(\s*[-–:(].*)?$/,
  },
  {
    sigla: "DI",
    descricao: "Deficiência Intelectual",
    regexFrase: /DEFICIENCIA INTELECTUAL|DEFICIENCIA MENTAL|ATRASO COGNITIVO/,
    regexSigla: /^DI(\s*[-–:(].*)?$/,
  },
  {
    sigla: "DA",
    descricao: "Deficiência Auditiva",
    regexFrase: /DEFICIENCIA AUDITIVA|HIPOACUSIA/,
    regexSigla: /^DA(\s*[-–:(].*)?$/,
  },
  {
    sigla: "SURDEZ",
    descricao: "Surdez",
    regexFrase: /\bSURDEZ\b/,
    regexSigla: /^SURDEZ(\s*[-–:(].*)?$/,
    skipIfSurdocegueira: true,
  },
  {
    sigla: "BV",
    descricao: "Baixa Visão",
    regexFrase: /BAIXA VISAO|VISAO SUBNORMAL/,
    regexSigla: /^BV(\s*[-–:(].*)?$/,
  },
  {
    sigla: "VM",
    descricao: "Visão Monocular",
    regexFrase: /VISAO MONOCULAR/,
    regexSigla: /^VM(\s*[-–:(].*)?$/,
  },
  {
    sigla: "DV",
    descricao: "Deficiência Visual",
    regexFrase: /DEFICIENCIA VISUAL|\bCEGUEIRA\b/,
    regexSigla: /^DV(\s*[-–:(].*)?$/,
    skipIfSurdocegueira: true,
  },
  {
    sigla: "DMU",
    descricao: "Deficiência Múltipla",
    regexFrase: /DEFICIENCIAS? MULTIPLAS?/,
    regexSigla: /^DMU(\s*[-–:(].*)?$/,
  },
  {
    sigla: "AH/SD",
    descricao: "Altas Habilidades / Superdotação",
    regexFrase: /ALTAS HABILIDADES|SUPERDOTAC/,
    regexSigla: /^(AH_SD|AH\s+SD)(\s*[-–:(].*)?$/,
  },
  {
    sigla: "SD",
    descricao: "Síndrome de Down",
    regexFrase: /SINDROME DE DOWN|TRISSOMIA DO 21/,
    regexSigla: /^SD(\s*[-–:(].*)?$/,
  },
  {
    sigla: "TDAH",
    descricao: "Transtorno do Déficit de Atenção e Hiperatividade",
    regexFrase: /\bTDAH\b|DEFICIT DE ATENCAO|HIPERATIVIDADE/,
    regexSigla: /^(TDAH|TDA)(\s*[-–:(].*)?$/,
  },
  {
    sigla: "TOD",
    descricao: "Transtorno Opositivo Desafiador",
    regexFrase: /\bTOD\b|OPOSITOR DESAFIADOR|OPOSITIVO DESAFIADOR|DESAFIADOR OPOSITIVO/,
    regexSigla: /^TOD(\s*[-–:(].*)?$/,
  },
  {
    sigla: "TPAC",
    descricao: "Transtorno do Processamento Auditivo Central",
    regexFrase: /\bTPAC\b|\bDPAC\b|PROCESSAMENTO AUDITIVO CENTRAL/,
    regexSigla: /^(TPAC|DPAC|PAC)(\s*[-–:(].*)?$/,
  },
  {
    sigla: "TDL",
    descricao: "Transtorno do Desenvolvimento da Linguagem",
    regexFrase: /DESENVOLVIMENTO DA LINGUAGEM|ESPECIFICO DE LINGUAGEM|TRANSTORNO DE LINGUAGEM/,
    regexSigla: /^(TDL|DEL)(\s*[-–:(].*)?$/,
  },
  { sigla: "DISLEXIA", descricao: "Dislexia", regexFrase: /\bDISLEXIA\b/ },
  { sigla: "DISCALCULIA", descricao: "Discalculia", regexFrase: /\bDISCALCULIA\b/ },
  { sigla: "DISGRAFIA", descricao: "Disgrafia", regexFrase: /\bDISGRAFIA\b/ },
  { sigla: "DISORTOGRAFIA", descricao: "Disortografia", regexFrase: /\bDISORTOGRAFIA\b/ },
  { sigla: "DISLALIA", descricao: "Dislalia", regexFrase: /\bDISLALIA\b/ },
  {
    sigla: "TFE",
    descricao: "Transtorno Funcional Específico",
    regexFrase: /FUNCIONAL ESPECIFICO|ESPECIFICO DE APRENDIZAGEM/,
    regexSigla: /^TFE(\s*[-–:(].*)?$/,
  },
];

export function ehValorAneesLegitimo(raw, contexto = {}) {
  const limpar = (v) =>
    String(v ?? "")
      .replace(/[\u00A0\t\r\n]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

  const s = limpar(raw);
  if (!s) return false;

  const norm = (v) =>
    limpar(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();

  const sNorm = norm(s);
  if (!sNorm) return false;

  if (
    /^(-+|NAO(\s+POSSUI|\s+CONSTA|\s+INFORMADO|\s+SE\s+APLICA|\s+DECLARADO)?|NENHUM[A]?|SEM(\s+NECESSIDADE.*|\s+LAUDO|\s+ATENDIMENTO|\s+DEFICIENCIA)?|N\/?A|NULL|ATIVO|INATIVO|MATRICULADO|CURSANDO|TRANSFERIDO|MASCULINO|FEMININO|PENDENTE|RESPONSAVEL)$/.test(
      sNorm
    )
  ) {
    return false;
  }

  if (
    /^\d+$/.test(sNorm.replace(/[\s.()/-]+/g, "")) ||
    /^\d{2}\/\d{2}\/\d{4}$/.test(sNorm) ||
    /^\d{4}-\d{2}-\d{2}$/.test(sNorm)
  ) {
    return false;
  }

  const nomesProibidos = [
    contexto.estudante,
    contexto.nomeRegistro,
    contexto.nomeSocial,
    ...(Array.isArray(contexto.responsaveis) ? contexto.responsaveis : []),
  ]
    .map(norm)
    .filter((n) => n.length >= 3);

  for (const nomeProibido of nomesProibidos) {
    if (sNorm === nomeProibido) return false;
  }

  if (
    /\b(QUADRA|QD|CONJUNTO|CONJ|CJ|CASA|LOTE|LT|CHACARA|APTO|APARTAMENTO|BLOCO|AVENIDA|ESTRADA|RODOVIA|CONDOMINIO|RESIDENCIAL|FAZENDA|ESTANCIA|ARAPOANGA|PLANALTINA|JARDIM\s+RORIZ|MESTRE\s+D\s*ARMAS|SRL)\b/.test(
      sNorm
    )
  ) {
    return false;
  }

  const sProtegido = sNorm.replace(/\bAH\s*\/\s*SD\b/g, "AH_SD");
  const segmentos = sProtegido
    .split(/[,;|/]+/)
    .map((seg) => seg.trim())
    .filter(Boolean);

  if (segmentos.length === 0) return false;

  const REGEX_SIGLA_ISOLADA =
    /^(TEA|TGD|DF|DI|DA|DV|BV|VM|SC|DMU|AH_SD|AH\s+SD|SD|TDAH|TDA|TOD|TPAC|DPAC|PAC|TDL|DEL|TFE|SURDEZ|CEGUEIRA)(\s*[-–:(].*)?$/;
  const REGEX_CID = /\b(CID\s*[-:]?\s*[A-Z0-9]{2,6}|[FGHQ]\d{2}(\.\d+)?|6A\d{2}(\.\w+)?)\b/;
  const REGEX_CLINICO_AEE =
    /\b(TRANSTORN|DEFICIEN|AUTISM|ESPECTRO|ASPERGER|SINDROME\s+DE\s+RETT|DESINTEGRATIVO|SURDOCEGUEIR|SURDEZ|SURDO|SURDA|HIPOACUS|AUDITIV|AUDICAO|CEGUEIR|BAIXA\s+VISAO|VISAO\s+SUBNORMAL|VISAO\s+MONOCULAR|VISUAL|INTELECTUAL|MENTAL|FISIC|MOTOR|PARALISIA|OSTOMIA|MOBILIDADE|MULTIPL|ALTAS\s+HABILIDADES|SUPERDOT|SINDROME|TRISSOMIA|HIPERATIV|DEFICIT|ATENCAO|OPOSIT|DESAFIADOR|PROCESSAMENTO|LINGUAGEM|APRENDIZAGEM|DISLEX|DISCALCUL|DISGRAF|DISORTOGRAF|DISLAL|AFASIA|APRAXIA|DISFASIA|DISARTRIA|DISFLUENC|GAGUEIRA|MUTISMO|EPILEPS|CONVULS|ESQUIZOFREN|PSICOS|BIPOLAR|ANSIEDADE|DEPRESS|TOC|TOURETTE|NEURO|COGNITIV|ATRASO\s+(GLOBAL|NEURO|PSICOMOTOR|COGNITIV|DE\s+LINGUAGEM|DO\s+DESENVOLVIMENTO|MENTAL)|CADEIRANTE|CADEIRA\s+DE\s+RODAS|NANISMO|BAIXA\s+ESTATURA|MALFORMAC|AMPUTAC|HIDROCEFAL|MICROCEFAL|MIELOMENINGOCELE|DISTROFIA|ATROFIA|DISPLASIA|ESCLEROSE|FIBROSE|FIBROMIALG|ESCOLIOSE|CIFOSE|ARTRO|OSTEO|PLEGIA|PARESIA|ATAXIA|FISSURA|LABIOPALATIN|CARDIOPAT|NEFROPAT|HEPATOPAT|DIABET|HEMOFIL|FALCIFORME|CELIAC|COCLEAR|PROTESE|ORTESE|LIBRAS|BRAILLE|NECESSIDADES?\s+ESPECIAIS|EDUCACIONAL\s+ESPECIALIZAD|ATENDIMENTO\s+DIFERENCIAL|AEE|ANEE|ANEES)/;

  return segmentos.some(
    (seg) =>
      REGEX_SIGLA_ISOLADA.test(seg) ||
      REGEX_CID.test(seg) ||
      REGEX_CLINICO_AEE.test(seg)
  );
}

export function abreviarAneesEducaDF(raw, opcoes = {}) {
  const textoLimpo = String(raw ?? "")
    .replace(/[\u00A0\t\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!textoLimpo) {
    return { siglas: [], textoSiglas: "", itens: [], valido: false };
  }

  const permitirTextoLivreManual = Boolean(opcoes.permitirTextoLivreManual);
  const valido = ehValorAneesLegitimo(textoLimpo, opcoes.contexto || {});
  if (!valido && !permitirTextoLivreManual) {
    return { siglas: [], textoSiglas: "", itens: [], valido: false };
  }

  const textoProtegido = textoLimpo
    .replace(/\bAH\s*\/\s*SD\b/gi, "AH_SD")
    .replace(/ALTAS\s+HABILIDADES\s*\/\s*SUPERDOTA/gi, "ALTAS HABILIDADES E SUPERDOTA");

  const segmentos = textoProtegido
    .split(/[,;|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const vistos = new Set();
  const itens = [];

  for (const segBruto of segmentos) {
    const seg = segBruto.replace(/\bAH_SD\b/gi, "AH/SD");
    const segNorm = segBruto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!segNorm) continue;

    const temSurdocegueira = /SURDOCEGUEIR/.test(segNorm);
    let bateuRegra = false;

    for (const r of REGRAS_ANEES_SEEDF) {
      if (r.skipIfSurdocegueira && temSurdocegueira) continue;
      const matchFrase = r.regexFrase ? r.regexFrase.test(segNorm) : false;
      const matchSigla = r.regexSigla ? r.regexSigla.test(segNorm) : false;
      if (matchFrase || matchSigla) {
        bateuRegra = true;
        if (!vistos.has(r.sigla)) {
          vistos.add(r.sigla);
          itens.push({ sigla: r.sigla, descricao: r.descricao });
        }
      }
    }

    if (!bateuRegra && (permitirTextoLivreManual || ehValorAneesLegitimo(seg, opcoes.contexto || {}))) {
      const fallback = seg
        .replace(/\s*[-–]?\s*(BAIXAS?|M[EÉ]DIAS?|ALTAS?)\s+NECESSIDADES?\s+ESPECIAIS?/gi, "")
        .trim();
      const siglaFallback = (fallback || seg).toUpperCase();
      if (siglaFallback && !vistos.has(siglaFallback)) {
        vistos.add(siglaFallback);
        itens.push({ sigla: siglaFallback, descricao: seg });
      }
    }
  }

  const siglas = itens.map((i) => i.sigla);
  return {
    siglas,
    textoSiglas: siglas.join(", "),
    itens,
    valido: itens.length > 0,
  };
}

export default function AlunoForm({ open, onClose, onSubmit, initialData = {}, anoLetivo }) {
  // ────────────────────────────────────────────────────────────────
  // Helpers locais
  // ────────────────────────────────────────────────────────────────
  // Normaliza "YYYY-MM-DDTHH:mm:ss" -> "YYYY-MM-DD" para <input type="date">
  const normalizeDate = (s) => (typeof s === "string" ? s.split("T")[0] : "");

  // ────────────────────────────────────────────────────────────────
  // Estados dos campos
  // ────────────────────────────────────────────────────────────────
  const [codigo, setCodigo] = useState(initialData.codigo || "");
  const [estudante, setEstudante] = useState(
    initialData.nome_registro || initialData.estudante || ""
  );
  const [dataNascimento, setDataNascimento] = useState(
    initialData.data_nascimento ? normalizeDate(initialData.data_nascimento) : ""
  );
  const [turmaId, setTurmaId] = useState(
    initialData.turma_id ? String(initialData.turma_id) : ""
  );
  const [cpf, setCpf] = useState(initialData.cpf || "");
  const [atendimentoDiferencial, setAtendimentoDiferencial] = useState(
    initialData.atendimento_diferencial === 1 || initialData.atendimento_diferencial === true
  );
  const [aneesBrutoOriginal, setAneesBrutoOriginal] = useState(() => {
    const raw = String(initialData.anees || "").trim();
    return ehValorAneesLegitimo(raw, {
      estudante: initialData.estudante,
      nomeRegistro: initialData.nome_registro,
      nomeSocial: initialData.nome_social,
    })
      ? raw
      : "";
  });
  const [aneesInput, setAneesInput] = useState(
    () =>
      abreviarAneesEducaDF(initialData.anees || "", {
        contexto: {
          estudante: initialData.estudante,
          nomeRegistro: initialData.nome_registro,
          nomeSocial: initialData.nome_social,
        },
      }).textoSiglas
  );
  const [aneesEditadoManual, setAneesEditadoManual] = useState(false);
  const [usaNomeSocial, setUsaNomeSocial] = useState(
    initialData.usa_nome_social === 1 || initialData.usa_nome_social === true
  );
  const [nomeSocial, setNomeSocial] = useState(initialData.nome_social || "");
  const [turmas, setTurmas] = useState([]);
  const [modalAtivarOpen, setModalAtivarOpen] = useState(false);

  const resumoAneesAtual = useMemo(
    () =>
      abreviarAneesEducaDF(aneesInput, {
        permitirTextoLivreManual: aneesEditadoManual,
        contexto: {
          estudante,
          nomeRegistro: estudante,
          nomeSocial,
        },
      }),
    [aneesInput, aneesEditadoManual, estudante, nomeSocial]
  );

  const legendaAnees = useMemo(() => {
    if (resumoAneesAtual.itens.length === 0) {
      return "Siglas usuais: TEA, DF, DI, DA, DV, TDAH, TOD, TPAC, DMU, AH/SD.";
    }
    return resumoAneesAtual.itens
      .map((item) =>
        item.descricao && item.descricao.toUpperCase() !== item.sigla.toUpperCase()
          ? `${item.sigla} — ${item.descricao}`
          : item.sigla
      )
      .join(" · ");
  }, [resumoAneesAtual]);

  // ────────────────────────────────────────────────────────────────
  // Carrega lista de turmas quando o modal abre
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    api
      .get("/api/turmas")
      .then((res) => setTurmas(res.data))
      .catch((err) => console.error("Erro ao carregar turmas:", err));
  }, [open]);

  // ────────────────────────────────────────────────────────────────
  // Hidrata campos sempre que o modal abre (ou initialData muda)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setCodigo(initialData.codigo || "");
      setEstudante(initialData.nome_registro || initialData.estudante || "");
      setDataNascimento(normalizeDate(initialData.data_nascimento));
      setTurmaId(initialData.turma_id ? String(initialData.turma_id) : "");
      setCpf(initialData.cpf || "");
      const isAee =
        initialData.atendimento_diferencial === 1 ||
        initialData.atendimento_diferencial === true;
      setAtendimentoDiferencial(isAee);

      const ctxAluno = {
        estudante: initialData.estudante,
        nomeRegistro: initialData.nome_registro,
        nomeSocial: initialData.nome_social,
      };
      const rawAnees = String(initialData.anees || "").trim();
      const aneesValido = ehValorAneesLegitimo(rawAnees, ctxAluno) ? rawAnees : "";
      setAneesBrutoOriginal(aneesValido);
      setAneesInput(abreviarAneesEducaDF(aneesValido, { contexto: ctxAluno }).textoSiglas);
      setAneesEditadoManual(false);
      setUsaNomeSocial(
        initialData.usa_nome_social === 1 || initialData.usa_nome_social === true
      );
      setNomeSocial(initialData.nome_social || "");

      // Fallback defensivo caso initialData tenha vindo sem o campo `anees`
      if (isAee && initialData.codigo && typeof initialData.anees === "undefined") {
        let cancelado = false;
        api
          .get(`/api/alunos/${initialData.codigo}`)
          .then((res) => {
            if (cancelado || !res?.data) return;
            const fetchedAnees = String(res.data.anees || "").trim();
            if (ehValorAneesLegitimo(fetchedAnees, ctxAluno)) {
              setAneesBrutoOriginal(fetchedAnees);
              setAneesInput(
                (prev) =>
                  prev || abreviarAneesEducaDF(fetchedAnees, { contexto: ctxAluno }).textoSiglas
              );
            }
          })
          .catch(() => {});
        return () => {
          cancelado = true;
        };
      }
    }
  }, [open, initialData]);

  // ────────────────────────────────────────────────────────────────
  // PASSO 1 (mantido): Mapear nome da turma -> turma_id quando editar
  // Cenário: veio initialData.turma (ex.: "1A"), mas não veio turma_id.
  // Assim que a lista de turmas estiver carregada, tenta mapear.
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    // Se já há turma_id no initialData, não sobrescreve
    if (initialData?.turma_id) return;

    // Se existir nome da turma no initialData e já temos a lista
    if (initialData?.turma && Array.isArray(turmas) && turmas.length) {
      const alvo = String(initialData.turma).toUpperCase().trim();
      const match = turmas.find(
        (t) => String(t.turma).toUpperCase().trim() === alvo
      );
      if (match?.id) setTurmaId(String(match.id));
    }
  }, [open, initialData, turmas]);

  // ────────────────────────────────────────────────────────────────
  // Submit (mantido + suporte a Nome Social)
  // ────────────────────────────────────────────────────────────────
  const buildPayload = () => {
    const nomeRegistroTrim = String(estudante || "").trim();
    const nomeSocialTrim = String(nomeSocial || "").trim();
    const aneesDigitado = String(aneesInput || "").trim();
    let aneesParaSalvar = null;
    if (atendimentoDiferencial) {
      if (!aneesEditadoManual && aneesBrutoOriginal) {
        aneesParaSalvar = aneesBrutoOriginal;
      } else {
        aneesParaSalvar = aneesDigitado || null;
      }
    }
    return {
      codigo,
      estudante: usaNomeSocial ? nomeSocialTrim : nomeRegistroTrim,
      nome_registro: nomeRegistroTrim,
      usa_nome_social: usaNomeSocial ? 1 : 0,
      nome_social: usaNomeSocial ? nomeSocialTrim : null,
      data_nascimento: dataNascimento,
      turma_id: Number(turmaId),
      cpf,
      atendimento_diferencial: atendimentoDiferencial ? 1 : 0,
      anees: aneesParaSalvar,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (usaNomeSocial && !String(nomeSocial || "").trim()) {
      return;
    }

    const payload = buildPayload();

    let sucesso = false;

    if (initialData.id) {
      // aluno já existia — mantemos o status atual ou ativo (se undefined)
      sucesso = await onSubmit({
        ...initialData,
        ...payload,
        status: initialData.status || "ativo",
      });
    } else {
      // novo aluno
      sucesso = await onSubmit(payload);
    }

    if (sucesso) onClose();
  };

  // ────────────────────────────────────────────────────────────────
  // Ativação explícita
  // ────────────────────────────────────────────────────────────────
  const handleConfirmarAtivacao = async () => {
    if (usaNomeSocial && !String(nomeSocial || "").trim()) {
      setModalAtivarOpen(false);
      return;
    }

    const payload = buildPayload();

    const sucesso = await onSubmit({
      ...initialData,
      ...payload,
      status: "ativo",
    });

    if (sucesso) {
      setModalAtivarOpen(false);
      onClose();
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Renderização do modal
  // ────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <Dialog.Overlay className="fixed inset-0 bg-black/30" />
      <div className="bg-white rounded-lg w-full max-w-md max-h-[92vh] overflow-y-auto p-6 z-10">
        <Dialog.Title className="text-xl font-semibold mb-4">
          {initialData?.id ? "Editar Estudante" : "Adicionar Estudante"}
        </Dialog.Title>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* RE (Registro Estudantil) */}
          <div>
            <label className="block font-medium mb-1">RE (Registro Estudantil)</label>
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              className="w-full"
              disabled={!!initialData.id}     // 🔒 bloqueia edição quando existe ID
              title={initialData.id ? "Campo bloqueado durante a edição" : undefined}
            />
          </div>

          {/* Estudante (Nome Civil / Registro) */}
          <div>
            <label className="block font-medium mb-1">
              {usaNomeSocial ? "Estudante (Nome de Registro)" : "Estudante"}
            </label>
            <Input
              value={estudante}
              onChange={(e) => setEstudante(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* CPF */}
          <div>
            <label className="block font-medium mb-1">CPF do Estudante</label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full"
            />
          </div>

          {/* Atendimento Diferencial */}
          <div className="flex items-center space-x-2 mt-2 bg-slate-50 p-3 rounded border border-slate-200">
            <input
              type="checkbox"
              id="atendimento_diferencial"
              checked={atendimentoDiferencial}
              onChange={(e) => setAtendimentoDiferencial(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="atendimento_diferencial" className="font-medium text-slate-700 cursor-pointer">
              Estudante com Atendimento Diferencial (AEE)
            </label>
          </div>

          {/* Campo condicional logo abaixo do checkbox AEE — Deficiência / ANEE (abreviatura: TEA, DF, etc.) */}
          {atendimentoDiferencial && (
            <div className="bg-blue-50/60 p-3 rounded border border-blue-200 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label
                  htmlFor="anees_estudante"
                  className="block font-medium text-slate-800 text-sm"
                >
                  Deficiência / Necessidade (ANEE)
                </label>
                {resumoAneesAtual.itens.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {resumoAneesAtual.itens.map((item) => (
                      <span
                        key={item.sigla}
                        title={item.descricao || item.sigla}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm"
                      >
                        {item.sigla}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Input
                id="anees_estudante"
                value={aneesInput}
                onChange={(e) => {
                  setAneesInput(e.target.value);
                  setAneesEditadoManual(true);
                }}
                placeholder="Ex.: TEA, DF, DI, DA, DV, TDAH, AH/SD"
                className="w-full font-semibold text-slate-800"
              />

              {legendaAnees && (
                <p className="text-xs text-slate-600 leading-snug">
                  {legendaAnees}
                </p>
              )}
            </div>
          )}

          {/* Nome Social — Res. CNE/CP nº 1/2018 · Lei nº 9.394/96 · Dec. 8.727/2016 · Dec. DF 37.982/2017 */}
          <div className="flex items-center space-x-2 mt-2 bg-slate-50 p-3 rounded border border-slate-200">
            <input
              type="checkbox"
              id="usa_nome_social"
              checked={usaNomeSocial}
              onChange={(e) => setUsaNomeSocial(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="usa_nome_social"
              className="font-medium text-slate-700 cursor-pointer text-sm sm:text-base"
              title="Resolução CNE/CP nº 1/2018 (MEC), Lei nº 9.394/1996 (LDB), Decreto Federal nº 8.727/2016 e Decreto Distrital nº 37.982/2017"
            >
              Nome Social — Res. CNE/CP nº 1/2018 (Lei nº 9.394/96)
            </label>
          </div>

          {/* Campo condicional para inserir o Nome Social */}
          {usaNomeSocial && (
            <div className="bg-blue-50/60 p-3 rounded border border-blue-200 space-y-1">
              <label className="block font-medium text-slate-800 mb-1">
                Nome Social do Estudante
              </label>
              <Input
                value={nomeSocial}
                onChange={(e) => setNomeSocial(e.target.value)}
                placeholder="Informe o nome social do estudante"
                required={usaNomeSocial}
                className="w-full"
              />
              <p className="text-xs text-slate-500">
                Exibido em todas as listas, chamadas, diários, boletins e aplicativo.
              </p>
            </div>
          )}

          {/* Data de Nascimento */}
          <div>
            <label className="block font-medium mb-1">Data de Nascimento</label>
            <Input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Turma */}
          <div>
            <label className="block font-medium mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full border rounded p-2"
              required
            >
              <option value="">Selecione a turma</option>
              {turmas
                .filter((t) => !anoLetivo || Number(t.ano) === Number(anoLetivo))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.turma}
                  </option>
                ))}
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 mt-6">
            {initialData?.status === "inativo" && (
              <Button
                type="button"
                onClick={() => setModalAtivarOpen(true)}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm"
              >
                Ativar
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Salvar
            </Button>
          </div>
        </form>
      </div>

      {/* Modal Confirmar Ativação */}
      <Dialog
        open={modalAtivarOpen}
        onClose={() => setModalAtivarOpen(false)}
        className="fixed inset-0 z-[60] flex items-center justify-center"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <div className="bg-white rounded-lg w-full max-w-sm p-6 z-10 text-center shadow-xl">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmar Ativação</h3>
          <p className="text-gray-600 mb-6">
            Deseja reativar o estudante{" "}
            <strong>{usaNomeSocial && nomeSocial.trim() ? nomeSocial.trim() : estudante}</strong>?
          </p>
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              onClick={() => setModalAtivarOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarAtivacao}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Sim, Ativar
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog>
  );
}
