// src/features/administrativo/useAdministrativoData.js
// ============================================================================
// Hook e Camada de Dados Unificada do Módulo ADMINISTRATIVO
// - Integra automaticamente TODOS os usuários já cadastrados na escola:
//   1) Professores (/api/professores)
//   2) Membros da Direção / Secretaria / Coordenação / Apoio (/api/direcao/cadastro)
//   3) Equipe Disciplinar (/api/direcao/equipe)
// - Permite cadastrar, editar, inativar e excluir servidores COM ou SEM acesso
//   ao sistema (ex: terceirizados de limpeza, portaria, vigilância, merenda, etc.)
// - Gerencia Registros Administrativos: Frequência/Ponto Diário, Abonos Anuais,
//   Atestados Médicos, Ausências/Faltas e Negociações Internas (Banco de Horas).
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../services/api";

export const CATEGORIAS_SERVIDOR = [
  { value: "professor", label: "Docente / Professor", cor: "#2563eb", bg: "#dbeafe" },
  { value: "direcao", label: "Direção & Gestão", cor: "#7c3aed", bg: "#ede9fe" },
  { value: "pedagogico", label: "Coordenação & Pedagógico", cor: "#0891b2", bg: "#cffafe" },
  { value: "administrativo", label: "Secretaria & Administrativo", cor: "#059669", bg: "#d1fae5" },
  { value: "terceirizado", label: "Terceirizado (Limpeza / Portaria / Vig.)", cor: "#d97706", bg: "#fef3c7" },
  { value: "apoio", label: "Apoio Operacional / Merenda / Outros", cor: "#db2777", bg: "#fce7f3" },
  { value: "disciplinar", label: "Equipe Disciplinar / Militar", cor: "#475569", bg: "#f1f5f9" },
];

export const VINCULOS_SERVIDOR = [
  { value: "efetivo", label: "Efetivo (SEEDF)" },
  { value: "temporario", label: "Contrato Temporário" },
  { value: "terceirizado", label: "Terceirizado (Empresa)" },
  { value: "comissionado", label: "Cargo Comissionado" },
  { value: "voluntario", label: "Educador Social Voluntário" },
  { value: "estagiario", label: "Estagiário / Menor Aprendiz" },
];

export const CARGAS_HORARIAS = [
  { value: "40h", label: "40h Semanais (8h/dia)" },
  { value: "20h", label: "20h Semanais (4h/dia)" },
  { value: "30h", label: "30h Semanais (6h/dia)" },
  { value: "44h", label: "44h Semanais (CLT / Terceirizado)" },
  { value: "12x36", label: "Escala 12x36 (Vigilância / Portaria)" },
];

export const TURNOS_TRABALHO = [
  { value: "Matutino", label: "Matutino" },
  { value: "Vespertino", label: "Vespertino" },
  { value: "Integral", label: "Integral (Matutino + Vespertino)" },
  { value: "Noturno", label: "Noturno" },
  { value: "Escala 12x36", label: "Plantão 12x36" },
];

// ============================================================================
// CATÁLOGO OFICIAL SEEDF — CARREIRAS, CARGOS, SUB-CARGOS, PADRÕES E FUNÇÕES (FGE)
// Base Legal: Regimento Interno SEEDF (Dec. 38.631/2017), Regimento Escolar
// (Portaria 180/2019), Lei 5.105/2013 (Magistério), Lei 5.106/2013 e 7.353/2023
// (PPGE / Assistência à Educação) e Lei 5.326/2014 (FGE).
// ============================================================================

export const CARREIRAS_SEEDF = [
  {
    value: "magisterio",
    label: "Carreira Magistério Público do DF (Lei 5.105/2013)",
    vinculosPermitidos: ["efetivo", "temporario"],
  },
  {
    value: "ppge_assistencia",
    label: "Carreira Políticas Públicas e Gestão Educacional — PPGE / Assistência (Lei 7.353/2023)",
    vinculosPermitidos: ["efetivo", "comissionado"],
  },
  {
    value: "terceirizado_contrato",
    label: "Prestação de Serviços Terceirizados (Contratos Contínuos SEEDF)",
    vinculosPermitidos: ["terceirizado"],
  },
  {
    value: "gestao_ccmdf",
    label: "Gestão Compartilhada Cívico-Militar (CCMDF — SEEDF/SSP)",
    vinculosPermitidos: ["efetivo", "comissionado"],
  },
  {
    value: "voluntario_estagio",
    label: "Programa Educador Social Voluntário / Estágio",
    vinculosPermitidos: ["voluntario", "estagiario", "temporario"],
  },
];

// Hierarquia Oficial: Cargo -> Sub-cargos (Especialidades / Componentes) + Nomenclatura SIGEP
export const CATALOGO_CARGOS_SEEDF = [
  // ── 1. CARREIRA MAGISTÉRIO PÚBLICO ──
  {
    id: "peb_efetivo",
    carreira: "magisterio",
    categorias: ["professor", "direcao", "pedagogico"],
    vinculos: ["efetivo"],
    cargoLabel: "Professor de Educação Básica (PEB)",
    cargoSigep: "PROFESSOR DE EDUC. BASICA",
    exigePadraoSigep: true, // Ex: 25-PQ5, 01-PQ4
    subcargos: [
      "Atividades (Educação Infantil / Anos Iniciais)",
      "Língua Portuguesa",
      "Matemática",
      "Ciências Naturais",
      "Biologia",
      "Física",
      "Química",
      "História",
      "Geografia",
      "Língua Estrangeira Moderna — Inglês",
      "Língua Estrangeira Moderna — Espanhol",
      "Língua Estrangeira Moderna — Francês",
      "Educação Física",
      "Artes",
      "Filosofia",
      "Sociologia",
      "Sala de Recursos — AEE (Generalista)",
      "Sala de Recursos — Altas Habilidades / Superdotação",
      "Sala de Recursos — Deficiência Visual / Braille",
      "Sala de Recursos — Surdez / Libras",
      "Itinerância (Educação Especial)",
      "Readaptado — Apoio Técnico-Pedagógico / Biblioteca / Laboratório",
    ],
  },
  {
    id: "peb_temporario",
    carreira: "magisterio",
    categorias: ["professor"],
    vinculos: ["temporario"],
    cargoLabel: "Professor Substituto (Contrato Temporário)",
    cargoSigep: "PROFESSOR TEMPORARIO",
    exigePadraoSigep: false,
    subcargos: [
      "Atividades",
      "Língua Portuguesa",
      "Matemática",
      "Ciências Naturais",
      "Biologia",
      "Física",
      "Química",
      "História",
      "Geografia",
      "Inglês",
      "Espanhol",
      "Educação Física",
      "Artes",
      "Filosofia",
      "Sociologia",
      "Atendimento Educacional Especializado (AEE)",
    ],
  },
  {
    id: "pedagogo_orientador",
    carreira: "magisterio",
    categorias: ["pedagogico", "direcao"],
    vinculos: ["efetivo", "readaptado"],
    cargoLabel: "Pedagogo — Orientador Educacional",
    cargoSigep: "PEDAGOGO-ORIENTADOR EDUCACIONAL",
    exigePadraoSigep: true,
    subcargos: [
      "Orientação Educacional (SOE)",
      "Equipe Especializada de Apoio à Aprendizagem (EEAA — Pedagogia)",
      "Mediação de Conflitos e Rede de Proteção",
    ],
  },

  // ── 2. CARREIRA POLÍTICAS PÚBLICAS E GESTÃO EDUCACIONAL (PPGE / ASSISTÊNCIA) ──
  {
    id: "gestor_ppge",
    carreira: "ppge_assistencia",
    categorias: ["administrativo", "pedagogico", "direcao"],
    vinculos: ["efetivo", "comissionado", "readaptado"],
    cargoLabel: "Gestor em Políticas Públicas e Gestão Educacional (Analista)",
    cargoSigep: "GESTOR EM POL. PUB. E GESTAO EDUC.",
    exigePadraoSigep: false,
    subcargos: [
      "Administração",
      "Psicologia Escolar (EEAA)",
      "Serviço Social",
      "Biblioteconomia",
      "Tecnologia da Informação",
      "Nutrição Escolar",
      "Contabilidade / Finanças (PDAF)",
      "Direito e Legislação",
    ],
  },
  {
    id: "monitor_ppge",
    carreira: "ppge_assistencia",
    categorias: ["apoio", "pedagogico"],
    vinculos: ["efetivo", "readaptado"],
    cargoLabel: "Analista PPGE — Monitor de Gestão Educacional",
    cargoSigep: "MONITOR DE GESTAO EDUCACIONAL",
    exigePadraoSigep: false,
    subcargos: [
      "Apoio à Inclusão / Educação Especial (AEE)",
      "Apoio à Educação Infantil / Creche",
      "Monitoria de Pátio e Apoio Discente",
    ],
  },
  {
    id: "tecnico_ppge",
    carreira: "ppge_assistencia",
    categorias: ["administrativo", "direcao"],
    vinculos: ["efetivo", "comissionado", "readaptado"],
    cargoLabel: "Técnico em Políticas Públicas e Gestão Educacional",
    cargoSigep: "TECNICO DE GESTAO EDUCACIONAL",
    exigePadraoSigep: false,
    subcargos: [
      "Secretário Escolar (Escrituração e Vida Acadêmica)",
      "Apoio Administrativo (Secretaria / Pessoal / Patrimônio)",
      "Apoio Técnico de Laboratório / Multimeios",
    ],
  },
  {
    id: "agente_ppge",
    carreira: "ppge_assistencia",
    categorias: ["administrativo", "apoio"],
    vinculos: ["efetivo", "readaptado"],
    cargoLabel: "Agente de Gestão Educacional",
    cargoSigep: "AGENTE DE GESTAO EDUCACIONAL",
    exigePadraoSigep: false,
    subcargos: [
      "Conservação e Limpeza",
      "Copa e Cozinha (Alimentação Escolar)",
      "Portaria e Controle de Acesso",
      "Vigilância Patrimonial",
      "Mecanografia e Reprografia",
      "Serviços Gerais",
    ],
  },

  // ── 3. GESTÃO COMPARTILHADA CÍVICO-MILITAR (CCMDF) ──
  {
    id: "militar_ccmdf",
    carreira: "gestao_ccmdf",
    categorias: ["disciplinar"],
    vinculos: ["efetivo", "comissionado"],
    cargoLabel: "Militar do Corpo de Gestão Disciplinar (CCMDF)",
    cargoSigep: "AGENTE DE GESTAO DISCIPLINAR CCMDF",
    exigePadraoSigep: false,
    subcargos: [
      "Comandante Disciplinar (PMDF / CBMDF)",
      "Subcomandante Disciplinar (PMDF / CBMDF)",
      "Supervisor Disciplinar e de Atividades Cívico-Cidadãs",
      "Monitor Militar / Preceptor Disciplinar",
    ],
  },

  // ── 4. TERCEIRIZADOS E APOIO OPERACIONAL ──
  {
    id: "terceirizado_operacional",
    carreira: "terceirizado_contrato",
    categorias: ["terceirizado", "apoio"],
    vinculos: ["terceirizado"],
    cargoLabel: "Colaborador Terceirizado (Contrato SEEDF)",
    cargoSigep: "PRESTADOR DE SERVICO TERCEIRIZADO",
    exigePadraoSigep: false,
    subcargos: [
      "Auxiliar de Serviços Gerais (Conservação e Limpeza)",
      "Encarregado(a) de Limpeza",
      "Agente de Portaria e Controle de Acesso",
      "Vigilante Patrimonial Armado / Desarmado (12x36)",
      "Merendeira / Cozinheira Escolar",
      "Auxiliar de Cozinha / Copa",
      "Auxiliar de Manutenção Predial / Jardinagem",
    ],
  },

  // ── 5. EDUCADOR SOCIAL VOLUNTÁRIO / ESTAGIÁRIO ──
  {
    id: "educador_voluntario",
    carreira: "voluntario_estagio",
    categorias: ["apoio", "pedagogico"],
    vinculos: ["voluntario", "estagiario", "temporario"],
    cargoLabel: "Educador Social Voluntário (ESV) / Estagiário",
    cargoSigep: "EDUCADOR SOCIAL VOLUNTARIO",
    exigePadraoSigep: false,
    subcargos: [
      "Educador Social Voluntário — Apoio à Educação Integral / Oficinas",
      "Educador Social Voluntário — Apoio a Estudantes com Necessidades Especiais (ANEE)",
      "Apoio à Educação Integral / Oficinas",
      "Apoio a Estudantes com Necessidades Especiais (ANEE)",
      "Estagiário de Nível Superior (Licenciatura / Pedagogia)",
      "Jovem Aprendiz — Apoio Administrativo",
    ],
  },
];

// Funções Gratificadas Escolares (Lei 5.326/2014) e Funções Regimentais Internas
export const FUNCOES_GRATIFICADAS_SEEDF = [
  {
    value: "",
    label: "Sem Função Gratificada (Exercício Regular do Cargo)",
    simbolo: "",
    impressaoFolha: "",
  },
  {
    value: "DIRETOR_FGE06",
    label: "Diretor(a) de Unidade Escolar (CEF / CEM / CED / CEE) — FGE-06",
    simbolo: "FGE-06",
    impressaoFolha: "DIRETOR                                FGE-06",
  },
  {
    value: "VICE_DIRETOR_FGE05",
    label: "Vice-Diretor(a) de Unidade Escolar (CEF / CEM / CED / CEE) — FGE-05",
    simbolo: "FGE-05",
    impressaoFolha: "VICE-DIRETOR                           FGE-05",
  },
  {
    value: "DIRETOR_FGE04",
    label: "Diretor(a) de Escola Classe / CEI / Jardim de Infância — FGE-04",
    simbolo: "FGE-04",
    impressaoFolha: "DIRETOR                                FGE-04",
  },
  {
    value: "VICE_DIRETOR_FGE03",
    label: "Vice-Diretor(a) de Escola Classe / CEI / Jardim de Infância — FGE-03",
    simbolo: "FGE-03",
    impressaoFolha: "VICE-DIRETOR                           FGE-03",
  },
  {
    value: "CHEFE_SECRETARIA_FGE02",
    label: "Chefe de Secretaria Escolar — FGE-02",
    simbolo: "FGE-02",
    impressaoFolha: "CHEFE DE SECRETARIA                    FGE-02",
  },
  {
    value: "SUPERVISOR_PEDAGOGICO_FGE02",
    label: "Supervisor(a) Pedagógico Diurno — FGE-02",
    simbolo: "FGE-02",
    impressaoFolha: "SUPERVISOR PEDAGOGICO                  FGE-02",
  },
  {
    value: "SUPERVISOR_ADMIN_FGE02",
    label: "Supervisor(a) Administrativo Diurno — FGE-02",
    simbolo: "FGE-02",
    impressaoFolha: "SUPERVISOR ADMINISTRATIVO              FGE-02",
  },
  {
    value: "SUPERVISOR_NOTURNO_FGE01",
    label: "Supervisor(a) Noturno — FGE-01",
    simbolo: "FGE-01",
    impressaoFolha: "SUPERVISOR NOTURNO                     FGE-01",
  },
  {
    value: "COORDENADOR_PEDAGOGICO",
    label: "Coordenador(a) Pedagógico Local (Função Regimental s/ FGE)",
    simbolo: "COORD",
    impressaoFolha: "",
  },
  {
    value: "COMANDANTE_DISCIPLINAR",
    label: "Comandante Disciplinar (CCMDF)",
    simbolo: "CCMDF",
    impressaoFolha: "COMANDANTE DISCIPLINAR                 CCMDF",
  },
  {
    value: "SUBCOMANDANTE_DISCIPLINAR",
    label: "Subcomandante Disciplinar (CCMDF)",
    simbolo: "CCMDF",
    impressaoFolha: "SUBCOMANDANTE DISCIPLINAR              CCMDF",
  },
];

// Padrões Verticais (01 a 25) e Etapas Horizontais de Titulação (PQ1 a PQ6) para Folha SIGEP
export const PADROES_CARREIRA_SEEDF = Array.from({ length: 25 }, (_, i) => {
  const num = String(i + 1).padStart(2, "0");
  return { value: num, label: `Padrão ${num}` };
});

export const ETAPAS_TITULACAO_SEEDF = [
  { value: "PQ1", label: "PQ1 — Curso Normal (Magistério Médio)" },
  { value: "PQ2", label: "PQ2 — Licenciatura Curta" },
  { value: "PQ3", label: "PQ3 — Licenciatura Plena (Graduação)" },
  { value: "PQ4", label: "PQ4 — Especialização (Pós Lato Sensu)" },
  { value: "PQ5", label: "PQ5 — Mestrado (Stricto Sensu)" },
  { value: "PQ6", label: "PQ6 — Doutorado (Stricto Sensu)" },
];

// ============================================================================
// CONFIGURAÇÃO DE CPIP — COORDENAÇÃO PEDAGÓGICA INDIVIDUAL (NÃO PRESENCIAL)
// Aplicável aos Professores (Efetivos e Contrato Temporário) na Folha SEEDF
// ============================================================================
export const TURNOS_CPIP_SEEDF = [
  {
    value: "Matutino",
    label: "Matutino (1º Turno)",
    shortLabel: "Matutino",
    sigla: "Mat",
    icone: "☀️",
  },
  {
    value: "Vespertino",
    label: "Vespertino (2º Turno)",
    shortLabel: "Vespertino",
    sigla: "Vesp",
    icone: "🌤️",
  },
  {
    value: "Noturno",
    label: "Noturno (3º Turno)",
    shortLabel: "Noturno",
    sigla: "Not",
    icone: "🌙",
  },
];

export const DIAS_SEMANA_CPIP_SEEDF = [
  { dow: 1, label: "2ª Feira", shortLabel: "2ª Seg", sigla: "2ª" },
  { dow: 2, label: "3ª Feira", shortLabel: "3ª Ter", sigla: "3ª" },
  { dow: 3, label: "4ª Feira", shortLabel: "4ª Qua", sigla: "4ª" },
  { dow: 4, label: "5ª Feira", shortLabel: "5ª Qui", sigla: "5ª" },
  { dow: 5, label: "6ª Feira", shortLabel: "6ª Sex", sigla: "6ª" },
];

export const ATALHOS_CPIP_SEEDF = [
  { id: "ter_qui", label: "⚡ 3ª e 5ª (Ter/Qui)", dias: [2, 4] },
  { id: "seg_sex", label: "⚡ 2ª e 6ª (Seg/Sex)", dias: [1, 5] },
  { id: "ter_qua_qui", label: "⚡ 3ª, 4ª e 5ª", dias: [2, 3, 4] },
  { id: "qua", label: "⚡ Apenas 4ª (Qua)", dias: [3] },
];

export function isServidorElegivelCPIP(servidorOuForm) {
  if (!servidorOuForm) return false;
  const cat = String(servidorOuForm.categoria || "").toLowerCase();
  const cargo = String(servidorOuForm.cargo || "").toUpperCase();
  const catId = String(servidorOuForm.cargo_catalogo_id || "").toLowerCase();
  return (
    cat === "professor" ||
    cat === "docente" ||
    cat === "pedagogico" ||
    catId.includes("peb") ||
    catId.includes("pedagogo") ||
    cargo.includes("PROFESSOR") ||
    cargo.includes("PEDAGOGO") ||
    cargo.includes("ORIENTADOR") ||
    cargo.includes("COORDENADOR")
  );
}

export function formatarResumoCPIP(servidorOuForm) {
  if (!servidorOuForm) return null;
  const diasRaw = Array.isArray(servidorOuForm.cpip_dias)
    ? servidorOuForm.cpip_dias.map(Number).filter((d) => d >= 1 && d <= 5)
    : [];
  const diasOrdenados = Array.from(new Set(diasRaw)).sort((a, b) => a - b);
  if (diasOrdenados.length === 0) return null;

  const turnoPadrao = servidorOuForm.cpip_turno || "Vespertino";
  const turnosPorDia =
    servidorOuForm.cpip_turnos_por_dia &&
    typeof servidorOuForm.cpip_turnos_por_dia === "object"
      ? servidorOuForm.cpip_turnos_por_dia
      : {};

  const mapaSiglaTurno = {
    Matutino: "Mat",
    Vespertino: "Vesp",
    Noturno: "Not",
  };

  const turnosUsados = new Set(
    diasOrdenados.map((d) => turnosPorDia[d] || turnoPadrao)
  );
  const mesmoTurno = turnosUsados.size === 1;
  const turnoUnico = Array.from(turnosUsados)[0] || turnoPadrao;

  const siglasDias = diasOrdenados.map((d) => {
    const metaDia = DIAS_SEMANA_CPIP_SEEDF.find((x) => x.dow === d);
    const tDia = turnosPorDia[d] || turnoPadrao;
    if (mesmoTurno) return metaDia ? metaDia.sigla : `${d}ª`;
    return `${metaDia ? metaDia.sigla : `${d}ª`}(${mapaSiglaTurno[tDia] || tDia})`;
  });

  const nomesDias = diasOrdenados.map((d) => {
    const metaDia = DIAS_SEMANA_CPIP_SEEDF.find((x) => x.dow === d);
    const tDia = turnosPorDia[d] || turnoPadrao;
    if (mesmoTurno) return metaDia ? metaDia.label : `${d}ª Feira`;
    return `${metaDia ? metaDia.label : `${d}ª Feira`} (${tDia})`;
  });

  return {
    diasOrdenados,
    turnoPadrao: turnoUnico,
    mesmoTurno,
    textoCurto: mesmoTurno
      ? `${siglasDias.join(", ")} (${mapaSiglaTurno[turnoUnico] || turnoUnico})`
      : siglasDias.join(", "),
    textoLongo: mesmoTurno
      ? `${nomesDias.join(", ")} — Turno ${turnoUnico}`
      : nomesDias.join(", "),
  };
}


export const TIPOS_OCORRENCIA_ADMIN = [
  {
    value: "abono",
    label: "Abono de Ponto (LC 840 / TRE)",
    shortLabel: "Abono",
    cor: "#059669",
    bg: "#d1fae5",
    border: "#6ee7b7",
    icone: "sparkles",
    descricao: "Abono anual Art. 151 LC 840/2011, Abono Bimestral Lei 449/1993 e Abono TRE",
  },
  {
    value: "atestado",
    label: "Atestado & Exame Médico",
    shortLabel: "Atestado",
    cor: "#2563eb",
    bg: "#dbeafe",
    border: "#93c5fd",
    icone: "document",
    descricao: "Atestado até 3 dias, comparecimento servidor/família/Subsaúde, atividade terapêutica e exame periódico",
  },
  {
    value: "licenca",
    label: "Licença Médica / Familiar",
    shortLabel: "Licença",
    cor: "#0284c7",
    bg: "#e0f2fe",
    border: "#7dd3fc",
    icone: "shield",
    descricao: "Licença médica/odontológica, acompanhamento familiar, maternidade, paternidade, adotante e acidente",
  },
  {
    value: "afastamento",
    label: "Afastamento & Dispensa Legal",
    shortLabel: "Afastamento",
    cor: "#d97706",
    bg: "#fef3c7",
    border: "#fcd34d",
    icone: "briefcase",
    descricao: "Casamento, falecimento, doação de sangue, serviço eleitoral, júri e dispensas por decreto",
  },
  {
    value: "ausencia",
    label: "Falta, Paralisação & Horas",
    shortLabel: "Ausência / Falta",
    cor: "#dc2626",
    bg: "#fee2e2",
    border: "#fca5a5",
    icone: "exclamation",
    descricao: "Falta, falta injustificada, falta paralisação, horas não trabalhadas e atraso/saída",
  },
  {
    value: "negociacao",
    label: "Negociação & Calendário",
    shortLabel: "Outros",
    cor: "#7c3aed",
    bg: "#ede9fe",
    border: "#c4b5fd",
    icone: "handshake",
    descricao: "Acordo interno de reposição, dia letivo móvel, ponto facultativo, recesso, sábado letivo e suspensão de aulas",
  },
];

export const LIMITE_ABONOS_ANUAL = 5;

export function getUsuarioLogadoRastreabilidade() {
  try {
    let nome = (localStorage.getItem("userName") || "").trim();
    let perfil = (localStorage.getItem("perfil") || "").trim().toLowerCase();
    let email = (localStorage.getItem("email") || "").trim();
    let cpf = (localStorage.getItem("cpf") || "").trim();

    // Fallback: decodifica payload do JWT caso algum campo não esteja salvo isoladamente
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("plataforma_token") ||
      "";
    if (token && token.split(".").length === 3) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);
        if (!nome || nome === "Usuário") {
          nome = String(
            payload?.nome || payload?.name || payload?.userName || nome || ""
          ).trim();
        }
        if (!perfil) {
          perfil = String(payload?.perfil || payload?.role || "")
            .trim()
            .toLowerCase();
        }
        if (!email) {
          email = String(payload?.email || "").trim();
        }
        if (!cpf) {
          cpf = String(payload?.cpf || "").trim();
        }
      } catch {
        // silencioso
      }
    }

    const mapaPerfis = {
      diretor: "Diretor(a)",
      direcao: "Direção Escolar",
      vice_diretor: "Vice-Diretor(a)",
      secretaria: "Secretaria Escolar",
      secretario: "Secretário(a) Escolar",
      administrativo: "Supervisor(a) / Administrativo",
      supervisor: "Supervisor(a) Administrativo",
      coordenador: "Coordenador(a) Pedagógico",
      pedagogico: "Equipe Pedagógica",
      professor: "Professor(a)",
      disciplinar: "Equipe Disciplinar",
      militar: "Gestão Cívico-Militar",
      ceo: "CEO / Plataforma",
      admin: "Administrador do Sistema",
    };

    const cargoFormatado =
      mapaPerfis[perfil] ||
      (perfil
        ? perfil.charAt(0).toUpperCase() + perfil.slice(1)
        : "Gestão Escolar");

    const nomeFinal =
      nome && nome !== "Usuário" ? nome : "Usuário Autenticado";
    const resumo = `${nomeFinal} • ${cargoFormatado}`;

    return {
      nome: nomeFinal,
      perfil: cargoFormatado,
      email,
      cpf,
      resumo,
    };
  } catch {
    return {
      nome: "Usuário Autenticado",
      perfil: "Gestão Escolar",
      email: "",
      cpf: "",
      resumo: "Usuário Autenticado • Gestão Escolar",
    };
  }
}

export function limparCPF(v) {
  return String(v || "").replace(/\D/g, "");
}

export function formatarCPF(v) {
  const d = limparCPF(v);
  if (d.length !== 11) return v || "—";
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function normalizarTurno(t = "") {
  const s = String(t || "").toLowerCase().trim();
  if (!s) return "";
  if (s.includes("vesp") || s.includes("tarde")) return "Vespertino";
  if (s.includes("mat") || s.includes("manh")) return "Matutino";
  if (s.includes("not") || s.includes("noit")) return "Noturno";
  if (s.includes("12x36") || s.includes("plant")) return "Escala 12x36";
  if (s.includes("int") || s.includes("diurn")) return "Integral";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function getHorarioPadraoPorTurno(turno = "") {
  const norm = normalizarTurno(turno);
  if (norm === "Vespertino") return "13:00 às 18:00";
  if (norm === "Matutino") return "07:30 às 12:30";
  if (norm === "Noturno") return "19:00 às 22:30";
  if (norm === "Escala 12x36") return "07:00 às 19:00";
  return "07:30 às 17:30";
}

const ORDEM_CRONOLOGICA_TURNO = {
  Matutino: 1,
  Vespertino: 2,
  Noturno: 3,
  "Escala 12x36": 4,
};

// Retorna a estrutura de 1º e 2º Turno (separados pelo intervalo de almoço para jornadas > 20h)
// Garante SEMPRE a ordem cronológica da esquerda para a direita: MATUTINO ➔ VESPERTINO ➔ NOTURNO
export function getTurnosEJornadaServidor(srv = {}) {
  const normTurno = normalizarTurno(srv?.turno || "Matutino");
  const ch = String(srv?.carga_horaria || "40h").toLowerCase();
  const temDoisTurnos =
    Boolean(srv?.turno_2) ||
    ((ch.includes("40") || ch.includes("44") || ch.includes("20+20") || normTurno === "Integral") &&
      !ch.includes("12x36"));

  // Caso de turno único (ex: 20h ou 12x36)
  if (!temDoisTurnos) {
    const nomeUnico = srv?.turno_1
      ? normalizarTurno(srv.turno_1)
      : normTurno === "Integral"
      ? "Matutino"
      : normTurno || "Matutino";
    const padraoUnico = getHorarioPadraoPorTurno(nomeUnico).split(" às ");
    return {
      temDoisTurnos: false,
      turno1: {
        nome: nomeUnico,
        entrada: srv?.entrada_1 || padraoUnico[0] || "07:30",
        saida: srv?.saida_1 || padraoUnico[1] || "12:30",
      },
      turno2: null,
    };
  }

  // Caso de 2 turnos (40h / 20+20 / 44h / Integral): define os dois turnos e ordena cronologicamente
  let rawT1 = srv?.turno_1 ? normalizarTurno(srv.turno_1) : null;
  let rawT2 = srv?.turno_2 ? normalizarTurno(srv.turno_2) : null;

  if (!rawT1 || !rawT2) {
    if (normTurno === "Noturno") {
      rawT1 = rawT1 || "Vespertino";
      rawT2 = rawT2 || "Noturno";
    } else {
      // Para servidores diurnos de 40h/44h (Matutino, Vespertino ou Integral),
      // os dois turnos são Matutino (1º) e Vespertino (2º)
      rawT1 = "Matutino";
      rawT2 = "Vespertino";
    }
  }

  // Monta objetos candidatos e ordena por ORDEM_CRONOLOGICA_TURNO (Matutino [1] -> Vespertino [2] -> Noturno [3])
  const p1 = getHorarioPadraoPorTurno(rawT1).split(" às ");
  const p2 = getHorarioPadraoPorTurno(rawT2).split(" às ");

  const candidatos = [
    {
      nome: rawT1,
      entrada: srv?.entrada_1 || p1[0] || "07:30",
      saida: srv?.saida_1 || p1[1] || "12:30",
      peso: ORDEM_CRONOLOGICA_TURNO[rawT1] || 99,
    },
    {
      nome: rawT2,
      entrada: srv?.entrada_2 || p2[0] || "13:00",
      saida: srv?.saida_2 || p2[1] || "18:00",
      peso: ORDEM_CRONOLOGICA_TURNO[rawT2] || 99,
    },
  ].sort((a, b) => a.peso - b.peso);

  return {
    temDoisTurnos: true,
    turno1: {
      nome: candidatos[0].nome,
      entrada: candidatos[0].entrada,
      saida: candidatos[0].saida,
    },
    turno2: {
      nome: candidatos[1].nome,
      entrada: candidatos[1].entrada,
      saida: candidatos[1].saida,
    },
  };
}

// Verifica se uma data ISO ('YYYY-MM-DD') é Dia Letivo conforme Direção -> Governança -> Ano Letivo
export function verificarDiaLetivoGovernanca(dataISO, calendarioGov = {}) {
  if (!dataISO || !/^\d{4}-\d{2}-\d{2}$/.test(String(dataISO))) {
    return { isLetivo: true, label: "Dia Letivo", detalhe: "Calendário Escolar" };
  }
  const [y, m, d] = String(dataISO).split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  const dow = dt.getDay(); // 0 = Dom, 1..5 = Seg..Sex, 6 = Sáb

  const periodos = Array.isArray(calendarioGov?.periodos) ? calendarioGov.periodos : [];
  const excecoes = Array.isArray(calendarioGov?.excecoes) ? calendarioGov.excecoes : [];

  const exc = excecoes.find((e) => e && e.data === dataISO);
  if (exc) {
    if (Number(exc.status_letivo) === 0) {
      return {
        isLetivo: false,
        label: "Dia Não Letivo (Governança)",
        detalhe: exc.motivo || exc.descricao || "Feriado / Recesso cadastrado na Governança",
      };
    }
    if (Number(exc.status_letivo) === 1) {
      return {
        isLetivo: true,
        label: dow === 6 ? "Sábado Letivo (Governança)" : "Dia Letivo (Governança)",
        detalhe: exc.motivo || exc.descricao || "Dia letivo oficial confirmado na Governança",
      };
    }
  }

  if (dow === 0) {
    return {
      isLetivo: false,
      label: "Domingo (Não Letivo)",
      detalhe: "Fim de semana — sem expediente letivo regular",
    };
  }

  if (dow === 6) {
    return {
      isLetivo: false,
      label: "Sábado (Não Letivo)",
      detalhe: "Sábado sem marcação de Sábado Letivo na Governança",
    };
  }

  // Segunda a Sexta (dow 1..5): verifica se está dentro de algum Bimestre/Semestre configurado na Governança
  const periodosValidos = periodos.filter((p) => p && p.data_inicio && p.data_fim);
  if (periodosValidos.length > 0) {
    const periodoAtivo = periodosValidos.find(
      (p) => dataISO >= p.data_inicio && dataISO <= p.data_fim
    );
    if (periodoAtivo) {
      const nomePer =
        periodoAtivo.tipo === "semestre"
          ? `${periodoAtivo.numero}º Semestre`
          : `${periodoAtivo.numero}º Bimestre`;
      return {
        isLetivo: true,
        label: `Dia Letivo (${nomePer})`,
        detalhe: `Dentro do calendário oficial da Governança (${nomePer})`,
      };
    } else {
      return {
        isLetivo: false,
        label: "Recesso / Fora do Bimestre",
        detalhe: "Data fora dos períodos bimestrais configurados em Direção → Governança",
      };
    }
  }

  return {
    isLetivo: true,
    label: "Dia Letivo (Seg–Sex)",
    detalhe: "Dia útil letivo padrão",
  };
}

function mapFuncaoToCategoria(funcao = "") {
  const f = String(funcao || "").toLowerCase().trim();
  if (f === "professor") return "professor";
  if (["diretor", "vice_diretor", "supervisor_administrativo", "supervisor_pedagogico"].includes(f)) return "direcao";
  if (["coordenacao", "coordenador", "orientador", "pedagogo", "psicopedagogia", "psicologo", "sala_recurso"].includes(f)) return "pedagogico";
  if (["secretaria", "secretario", "administrativo", "biblioteca"].includes(f)) return "administrativo";
  if (["vigilancia", "portaria", "limpeza", "terceirizado"].includes(f)) return "terceirizado";
  if (["disciplinar", "diretor_disciplinar", "comandante", "monitor", "monitor_disciplinar"].includes(f)) return "disciplinar";
  return "apoio";
}

function mapFuncaoLabel(funcao = "") {
  const map = {
    diretor: "Diretor(a)",
    vice_diretor: "Vice-Diretor(a)",
    coordenacao: "Coordenador(a) Pedagógico",
    coordenador: "Coordenador(a) Pedagógico",
    secretaria: "Secretário(a) Escolar",
    secretario: "Secretário(a) Escolar",
    administrativo: "Assistente Administrativo",
    supervisor_administrativo: "Supervisor(a) Administrativo",
    supervisor_pedagogico: "Supervisor(a) Pedagógico",
    orientador: "Orientador(a) Educacional",
    pedagogo: "Pedagogo(a)",
    psicopedagogia: "Psicopedagogo(a)",
    psicologo: "Psicólogo(a) Escolar",
    sala_recurso: "Professor(a) Sala de Recursos (AEE)",
    biblioteca: "Bibliotecário(a) / Agente de Leitura",
    apoio: "Agente de Apoio Educacional",
    educador_social: "Educador(a) Social",
    merenda: "Agente de Alimentação Escolar (Merenda)",
    vigilancia: "Vigilante / Segurança Patrimonial",
    disciplinar: "Agente Disciplinar",
    monitor: "Monitor(a) Escolar",
    professor: "Professor(a) Regente",
  };
  return map[String(funcao || "").toLowerCase().trim()] || funcao || "Servidor(a)";
}

// IDs antigos de demonstração (mock) removidos para garantir 100% dados reais da escola
const LEGACY_MOCK_STAFF_IDS = new Set([
  "adm-terc-1",
  "adm-terc-2",
  "adm-terc-3",
  "adm-serv-4",
]);

const LEGACY_MOCK_OCC_IDS = new Set([
  "occ-seed-1",
  "occ-seed-2",
  "occ-seed-3",
  "occ-seed-4",
]);

function filtrarMocksStaff(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((item) => item && !LEGACY_MOCK_STAFF_IDS.has(String(item.id)));
}

function filtrarMocksOcorrencias(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((item) => item && !LEGACY_MOCK_OCC_IDS.has(String(item.id)));
}

export function useAdministrativoData() {
  const escolaId = localStorage.getItem("escola_id") || "default";

  const STORAGE_KEYS = useMemo(
    () => ({
      customStaff: `educa_admin_custom_staff_v1_${escolaId}`,
      overrides: `educa_admin_overrides_v1_${escolaId}`,
      ocorrencias: `educa_admin_ocorrencias_v1_${escolaId}`,
      ponto: `educa_admin_ponto_v1_${escolaId}`,
      biometria: `educa_admin_biometria_v1_${escolaId}`,
      syncedBackend: `educa_admin_backend_synced_v1_${escolaId}`,
    }),
    [escolaId]
  );

  const [systemUsers, setSystemUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado da Biometria (Ponto Eletrônico): OFF por padrão na SEEDF (usa fallback Presente em dias letivos)
  const [biometriaAtiva, setBiometriaAtiva] = useState(() => {
    try {
      const raw = localStorage.getItem(`educa_admin_biometria_v1_${escolaId}`);
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  });

  // Calendário Letivo sincronizado de Direção -> Governança -> Ano Letivo
  const [calendarioGovernanca, setCalendarioGovernanca] = useState({
    periodos: [],
    excecoes: [],
  });

  // Cache local sincronizado com o banco de dados MySQL (/api/administrativo)
  const [customStaff, setCustomStaff] = useState(() => {
    try {
      const raw = localStorage.getItem(`educa_admin_custom_staff_v1_${escolaId}`);
      if (raw) return filtrarMocksStaff(JSON.parse(raw));
      return [];
    } catch {
      return [];
    }
  });

  // Overrides permitem editar/complementar a Ficha Funcional SIGEP de professores ou membros da direção
  const [overrides, setOverrides] = useState(() => {
    try {
      const raw = localStorage.getItem(`educa_admin_overrides_v1_${escolaId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [ocorrencias, setOcorrencias] = useState(() => {
    try {
      const raw = localStorage.getItem(`educa_admin_ocorrencias_v1_${escolaId}`);
      return raw ? filtrarMocksOcorrencias(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  });

  const [pontoDiario, setPontoDiario] = useState(() => {
    try {
      const raw = localStorage.getItem(`educa_admin_ponto_v1_${escolaId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Atualizar cache local automaticamente
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.customStaff, JSON.stringify(customStaff));
    } catch {}
  }, [customStaff, STORAGE_KEYS.customStaff]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.overrides, JSON.stringify(overrides));
    } catch {}
  }, [overrides, STORAGE_KEYS.overrides]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ocorrencias, JSON.stringify(ocorrencias));
    } catch {}
  }, [ocorrencias, STORAGE_KEYS.ocorrencias]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ponto, JSON.stringify(pontoDiario));
    } catch {}
  }, [pontoDiario, STORAGE_KEYS.ponto]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.biometria, JSON.stringify(biometriaAtiva));
    } catch {}
  }, [biometriaAtiva, STORAGE_KEYS.biometria]);

  const alternarBiometria = useCallback((novoValor) => {
    setBiometriaAtiva((prev) =>
      typeof novoValor === "boolean" ? novoValor : !prev
    );
  }, []);

  // Busca automática de TODOS os professores + membros da direção/secretaria/equipe + Calendário Letivo + Dados do Módulo Administrativo no MySQL
  const carregarDadosSistema = useCallback(async () => {
    setLoading(true);
    try {
      const anoAtual = new Date().getFullYear();

      // Migração transparente única: se houver dados reais no navegador antes da conexão MySQL, envia ao backend
      if (escolaId && escolaId !== "default") {
        const jaSincronizou = localStorage.getItem(STORAGE_KEYS.syncedBackend);
        if (!jaSincronizou) {
          try {
            const cfgLocalRaw =
              localStorage.getItem(`educa_admin_seedf_unidade_cfg_v1_${escolaId}`) ||
              localStorage.getItem("educa_admin_seedf_unidade_cfg_v1");
            const cfgLocal = cfgLocalRaw ? JSON.parse(cfgLocalRaw) : null;
            const staffLocal = filtrarMocksStaff(
              JSON.parse(localStorage.getItem(STORAGE_KEYS.customStaff) || "[]")
            );
            const ovLocal = JSON.parse(
              localStorage.getItem(STORAGE_KEYS.overrides) || "{}"
            );
            const occLocal = filtrarMocksOcorrencias(
              JSON.parse(localStorage.getItem(STORAGE_KEYS.ocorrencias) || "[]")
            );

            const temDadosReaisLocais =
              Boolean(cfgLocal) ||
              staffLocal.length > 0 ||
              Object.keys(ovLocal || {}).length > 0 ||
              occLocal.length > 0;

            if (temDadosReaisLocais) {
              await api.post("/api/administrativo/sync-local", {
                escola_id: Number(escolaId),
                configUnidade: cfgLocal,
                customStaff: staffLocal,
                overrides: ovLocal,
                ocorrencias: occLocal,
              });
            }
            localStorage.setItem(STORAGE_KEYS.syncedBackend, "1");
          } catch {
            //Continua normalmente se o backend ainda estiver atualizando
          }
        }
      }

      const [resProf, resCad, resEq, resGov, resAdm] = await Promise.allSettled([
        api.get("/api/professores"),
        escolaId && escolaId !== "default"
          ? api.get(`/api/direcao/cadastro?escola_id=${escolaId}`)
          : Promise.resolve({ data: { membros: [] } }),
        escolaId && escolaId !== "default"
          ? api.get(`/api/direcao/equipe?escola_id=${escolaId}`)
          : Promise.resolve({ data: { membros: [] } }),
        escolaId && escolaId !== "default"
          ? api.get(`/api/governanca/ano-letivo-config?escola_id=${escolaId}&ano=${anoAtual}`)
          : Promise.resolve({ data: { ok: false } }),
        escolaId && escolaId !== "default"
          ? api.get(`/api/administrativo/bootstrap?escola_id=${escolaId}`)
          : Promise.resolve({ data: { ok: false } }),
      ]);

      if (resGov.status === "fulfilled" && resGov.value?.data?.ok) {
        setCalendarioGovernanca({
          periodos: resGov.value.data.periodos || [],
          excecoes: resGov.value.data.excecoes || [],
        });
      }

      // Hidrata os estados com os dados persistidos no MySQL (/api/administrativo/bootstrap)
      if (resAdm.status === "fulfilled" && resAdm.value?.data?.ok) {
        const admData = resAdm.value.data;

        if (Array.isArray(admData.customStaff)) {
          setCustomStaff(filtrarMocksStaff(admData.customStaff));
        }
        if (admData.overrides && typeof admData.overrides === "object") {
          setOverrides(admData.overrides);
        }
        if (Array.isArray(admData.ocorrencias)) {
          setOcorrencias(filtrarMocksOcorrencias(admData.ocorrencias));
        }
        if (admData.pontoDiario && typeof admData.pontoDiario === "object") {
          setPontoDiario((prev) => ({ ...prev, ...admData.pontoDiario }));
        }
        if (admData.configUnidade && typeof admData.configUnidade === "object") {
          try {
            const cfgStr = JSON.stringify(admData.configUnidade);
            localStorage.setItem("educa_admin_seedf_unidade_cfg_v1", cfgStr);
            localStorage.setItem(
              `educa_admin_seedf_unidade_cfg_v1_${escolaId}`,
              cfgStr
            );
            window.dispatchEvent(
              new CustomEvent("educa:unidade-cfg-updated", {
                detail: admData.configUnidade,
              })
            );
          } catch {}
        }
      }

      const profsRaw =
        resProf.status === "fulfilled" && Array.isArray(resProf.value?.data)
          ? resProf.value.data
          : [];
      const cadRaw =
        resCad.status === "fulfilled" && Array.isArray(resCad.value?.data?.membros)
          ? resCad.value.data.membros
          : [];
      const eqRaw =
        resEq.status === "fulfilled" && Array.isArray(resEq.value?.data?.membros)
          ? resEq.value.data.membros
          : [];

      const mapaPorChave = new Map();

      // 1) Processa Professores cadastrados
      profsRaw.forEach((p) => {
        const cpfLimpo = limparCPF(p.cpf);
        const chave = cpfLimpo ? `cpf:${cpfLimpo}` : `prof:${p.id}`;
        const vinculos = Array.isArray(p.vinculos) ? p.vinculos : [];
        const turnosSet = new Set(
          vinculos.map((v) => normalizarTurno(v.turno)).filter(Boolean)
        );
        if (p.turno) {
          const tn = normalizarTurno(p.turno);
          if (tn) turnosSet.add(tn);
        }
        const turnosArr = Array.from(turnosSet);
        const turnoLabel =
          turnosArr.length > 1
            ? "Integral"
            : turnosArr[0] || "Matutino";

        const disciplinasArr = [
          ...new Set(
            vinculos.map((v) => v.disciplina_nome).filter(Boolean)
          ),
        ];
        if (!disciplinasArr.length && p.disciplina_nome) {
          disciplinasArr.push(p.disciplina_nome);
        }

        const totalAulas = vinculos.reduce(
          (acc, v) => acc + (Number(v.aulas) || 0),
          Number(p.aulas) || 0
        );

        mapaPorChave.set(chave, {
          id: `sys-prof-${p.id}`,
          system_id: p.id,
          nome: p.nome || "Professor(a)",
          cpf: cpfLimpo,
          matricula: p.matricula || `PROF-${p.id}`,
          cargo:
            disciplinasArr.length > 0
              ? `Professor(a) — ${disciplinasArr.slice(0, 2).join(", ")}${disciplinasArr.length > 2 ? "..." : ""}`
              : "Professor(a) Regente",
          categoria: "professor",
          vinculo: "efetivo",
          empresa: "SEEDF",
          carga_horaria: totalAulas > 0 && totalAulas <= 20 ? "20h" : "40h",
          turno: turnoLabel,
          setor:
            disciplinasArr.length > 0
              ? `Regência (${disciplinasArr.join(", ")})`
              : "Corpo Docente",
          horario_trabalho: getHorarioPadraoPorTurno(turnoLabel),
          telefone: p.telefone || p.celular || "",
          email: p.email || "",
          acesso_sistema: true,
          cadastro_completo: true,
          ativo: p.status ? String(p.status).toLowerCase() !== "inativo" : Number(p.ativo ?? 1) !== 0,
          origem: "professores",
          foto: p.foto || null,
          observacoes: "",
        });
      });

      // 2) Processa Membros da Direção / Secretaria / Coordenação / Equipe Cadastrada
      cadRaw.forEach((m) => {
        const funcaoNorm = String(m.funcao || "").toLowerCase().trim();
        // Ignora aluno/responsavel caso exista na tabela de membros
        if (funcaoNorm === "aluno" || funcaoNorm === "responsavel") return;

        const cpfLimpo = limparCPF(m.cpf);
        const chave = cpfLimpo ? `cpf:${cpfLimpo}` : `cad:${m.id}`;

        if (mapaPorChave.has(chave)) {
          // Já existe (ex: professor que também tem função na direção/coordenação)
          const atual = mapaPorChave.get(chave);
          const cargoExtra = mapFuncaoLabel(funcaoNorm);
          if (!atual.cargo.includes(cargoExtra) && funcaoNorm !== "professor") {
            atual.cargo = `${cargoExtra} / ${atual.cargo}`;
            atual.categoria = mapFuncaoToCategoria(funcaoNorm);
          }
          if (m.email && !atual.email) atual.email = m.email;
          return;
        }

        mapaPorChave.set(chave, {
          id: `sys-cad-${m.id}`,
          system_id: m.id,
          nome: m.nome || "Servidor(a)",
          cpf: cpfLimpo,
          matricula: `CAD-${m.id}`,
          cargo: mapFuncaoLabel(funcaoNorm),
          funcao_sistema: funcaoNorm,
          categoria: mapFuncaoToCategoria(funcaoNorm),
          vinculo: funcaoNorm === "vigilancia" ? "terceirizado" : "efetivo",
          empresa: "SEEDF",
          carga_horaria: "40h",
          turno: "Integral",
          setor: mapFuncaoLabel(funcaoNorm),
          horario_trabalho: "07:30 às 17:30",
          telefone: "",
          email: m.email || "",
          acesso_sistema: true,
          cadastro_completo: Number(m.cadastro_completo) === 1,
          ativo: Number(m.ativo ?? 1) === 1,
          origem: "direcao",
          observacoes: "",
        });
      });

      // 3) Processa Equipe Disciplinar / Militar se houver
      eqRaw.forEach((eq) => {
        const cpfLimpo = limparCPF(eq.cpf);
        const chave = cpfLimpo ? `cpf:${cpfLimpo}` : `eq:${eq.id}`;
        if (mapaPorChave.has(chave)) return;

        mapaPorChave.set(chave, {
          id: `sys-eq-${eq.id}`,
          system_id: eq.id,
          nome: eq.nome || "Membro Equipe",
          cpf: cpfLimpo,
          matricula: `EQ-${eq.id}`,
          cargo: mapFuncaoLabel(eq.funcao || "disciplinar"),
          categoria: "disciplinar",
          vinculo: "efetivo",
          empresa: "CCMDF / SEEDF",
          carga_horaria: "40h",
          turno: "Integral",
          setor: "Gestão Disciplinar",
          horario_trabalho: "07:00 às 17:00",
          telefone: "",
          email: eq.email || "",
          acesso_sistema: true,
          cadastro_completo: true,
          ativo: Number(eq.ativo ?? 1) === 1,
          origem: "disciplinar",
          observacoes: "",
        });
      });

      setSystemUsers(Array.from(mapaPorChave.values()));
    } catch (err) {
      console.error("[Administrativo] Erro ao unificar usuários do sistema:", err);
    } finally {
      setLoading(false);
    }
  }, [escolaId, STORAGE_KEYS]);

  useEffect(() => {
    carregarDadosSistema();
  }, [carregarDadosSistema]);

  // Lista final unificada (Usuários do Sistema + Overrides administrativos + Servidores Customizados/Terceirizados)
  const servidores = useMemo(() => {
    const listaSistema = systemUsers
      .map((u) => {
        const ov = overrides[u.id] || (u.cpf ? overrides[`cpf:${u.cpf}`] : null) || {};
        if (ov._deleted) return null;
        return {
          ...u,
          ...ov,
          id: u.id,
        };
      })
      .filter(Boolean);

    const cpfsSistema = new Set(
      listaSistema.map((s) => limparCPF(s.cpf)).filter(Boolean)
    );

    const listaCustom = customStaff.filter((c) => {
      if (!c || LEGACY_MOCK_STAFF_IDS.has(String(c.id))) return false;
      const cpfC = limparCPF(c.cpf);
      if (cpfC && cpfsSistema.has(cpfC)) return false;
      return true;
    });

    return [...listaSistema, ...listaCustom].sort((a, b) =>
      String(a.nome || "")
        .trim()
        .localeCompare(String(b.nome || "").trim(), "pt-BR", {
          sensitivity: "base",
        })
    );
  }, [systemUsers, overrides, customStaff]);

  // ── Ações CRUD de Servidores (Persistidas no MySQL via /api/administrativo/servidores) ──
  const salvarServidor = useCallback(
    async (dados) => {
      const id = dados.id;
      const isSystem = String(id || "").startsWith("sys-");

      if (isSystem) {
        const novoOverride = {
          ...(overrides[id] || {}),
          ...dados,
          id,
          atualizado_em: new Date().toISOString(),
        };
        setOverrides((prev) => ({
          ...prev,
          [id]: novoOverride,
        }));

        if (escolaId && escolaId !== "default") {
          try {
            await api.post("/api/administrativo/servidores", {
              escola_id: Number(escolaId),
              tipo_registro: "override",
              servidor: novoOverride,
            });
          } catch (err) {
            console.error("[Administrativo] Erro ao salvar override no backend:", err);
          }
        }
        return { ok: true, mode: "override" };
      }

      if (id) {
        const atualizado = {
          ...(customStaff.find((item) => item.id === id) || {}),
          ...dados,
          id,
          cpf: limparCPF(dados.cpf),
          atualizado_em: new Date().toISOString(),
        };
        setCustomStaff((prev) =>
          prev.map((item) => (item.id === id ? atualizado : item))
        );

        if (escolaId && escolaId !== "default") {
          try {
            await api.post("/api/administrativo/servidores", {
              escola_id: Number(escolaId),
              tipo_registro: "custom",
              servidor: atualizado,
            });
          } catch (err) {
            console.error("[Administrativo] Erro ao atualizar servidor no backend:", err);
          }
        }
        return { ok: true, mode: "update" };
      }

      // Novo servidor cadastrado no módulo Administrativo
      const novoId = `adm-serv-${Date.now()}`;
      const novoServidor = {
        ...dados,
        id: novoId,
        cpf: limparCPF(dados.cpf),
        ativo: dados.ativo !== undefined ? Boolean(dados.ativo) : true,
        origem: "administrativo",
        criado_em: new Date().toISOString(),
      };

      // Se o gestor marcou "Conceder acesso ao sistema", também pré-cadastra em /api/direcao/cadastro
      if (dados.acesso_sistema && dados.cpf && escolaId && escolaId !== "default") {
        try {
          await api.post("/api/direcao/cadastro", {
            nome: dados.nome.trim(),
            cpf: limparCPF(dados.cpf),
            funcao: dados.funcao_sistema || dados.categoria || "administrativo",
            escola_id: Number(escolaId),
          });
          // Salva também os metadados completos da ficha funcional por CPF
          const chaveCpf = `cpf:${limparCPF(dados.cpf)}`;
          setOverrides((prev) => ({
            ...prev,
            [chaveCpf]: { ...novoServidor, id: chaveCpf },
          }));
          await api.post("/api/administrativo/servidores", {
            escola_id: Number(escolaId),
            tipo_registro: "override",
            servidor: { ...novoServidor, id: chaveCpf },
          });
          await carregarDadosSistema();
          return { ok: true, mode: "created_system" };
        } catch {
          // Se já existir ou falhar, garante no quadro administrativo
        }
      }

      setCustomStaff((prev) => [novoServidor, ...prev]);

      if (escolaId && escolaId !== "default") {
        try {
          await api.post("/api/administrativo/servidores", {
            escola_id: Number(escolaId),
            tipo_registro: "custom",
            servidor: novoServidor,
          });
        } catch (err) {
          console.error("[Administrativo] Erro ao criar servidor no backend:", err);
        }
      }

      return { ok: true, mode: "created_local", servidor: novoServidor };
    },
    [escolaId, carregarDadosSistema, overrides, customStaff]
  );

  const alternarStatusServidor = useCallback(
    async (servidor) => {
      const novoStatus = !servidor.ativo;
      const isSystem = String(servidor.id).startsWith("sys-");

      if (isSystem) {
        const novoOv = {
          ...(overrides[servidor.id] || {}),
          id: servidor.id,
          ativo: novoStatus,
          atualizado_em: new Date().toISOString(),
        };
        setOverrides((prev) => ({
          ...prev,
          [servidor.id]: novoOv,
        }));
        if (escolaId && escolaId !== "default") {
          try {
            await api.post("/api/administrativo/servidores", {
              escola_id: Number(escolaId),
              tipo_registro: "override",
              servidor: novoOv,
            });
          } catch {}
        }
      } else {
        const atualizado = {
          ...servidor,
          ativo: novoStatus,
          atualizado_em: new Date().toISOString(),
        };
        setCustomStaff((prev) =>
          prev.map((s) => (s.id === servidor.id ? atualizado : s))
        );
        if (escolaId && escolaId !== "default") {
          try {
            await api.post("/api/administrativo/servidores", {
              escola_id: Number(escolaId),
              tipo_registro: "custom",
              servidor: atualizado,
            });
          } catch {}
        }
      }
    },
    [escolaId, overrides]
  );

  const excluirServidor = useCallback(
    async (servidor) => {
      if (String(servidor.id).startsWith("sys-")) {
        setOverrides((prev) => ({
          ...prev,
          [servidor.id]: {
            ...(prev[servidor.id] || {}),
            _deleted: true,
          },
        }));
      } else {
        setCustomStaff((prev) => prev.filter((s) => s.id !== servidor.id));
      }

      if (escolaId && escolaId !== "default") {
        try {
          await api.delete(
            `/api/administrativo/servidores/${encodeURIComponent(
              servidor.id
            )}?escola_id=${escolaId}`
          );
        } catch (err) {
          console.error("[Administrativo] Erro ao excluir servidor no backend:", err);
        }
      }
    },
    [escolaId]
  );

  // ── Ações CRUD de Ocorrências (Persistidas no MySQL via /api/administrativo/ocorrencias) ──
  const salvarOcorrencia = useCallback(
    async (dados) => {
      const usrLogado = getUsuarioLogadoRastreabilidade();

      // Suporte a Lançamento em Lote (múltiplos servidores/categorias de uma só vez)
      if (
        dados?.lancamento_em_lote &&
        Array.isArray(dados?.servidores_ids) &&
        dados.servidores_ids.length > 0
      ) {
        const loteId = `lote-${Date.now()}`;
        const hojeStr = new Date().toISOString().slice(0, 10);
        const tsIso = new Date().toISOString();
        const {
          lancamento_em_lote,
          servidores_ids,
          resumo_lote_categoria,
          ...restoDados
        } = dados;

        const novasOcorrencias = servidores_ids
          .map((srvId, idx) => {
            const srv = servidores.find((s) => s.id === srvId);
            if (!srv) return null;
            return {
              ...restoDados,
              id: `occ-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              lote_id: loteId,
              lancamento_em_lote: true,
              resumo_lote_categoria: resumo_lote_categoria || "Lote Coletivo",
              servidor_id: srv.id,
              servidor_nome: srv.nome || "Servidor(a)",
              servidor_cargo: srv.cargo || "",
              servidor_categoria: srv.categoria || "administrativo",
              autorizado_por: dados.autorizado_por || usrLogado.resumo,
              criado_em: hojeStr,
              atualizado_em: tsIso,
            };
          })
          .filter(Boolean);

        if (novasOcorrencias.length > 0) {
          setOcorrencias((prev) => [...novasOcorrencias, ...prev]);
          if (escolaId && escolaId !== "default") {
            try {
              await api.post("/api/administrativo/ocorrencias", {
                escola_id: Number(escolaId),
                ocorrencias: novasOcorrencias,
              });
            } catch (err) {
              console.error("[Administrativo] Erro ao salvar lote de ocorrências no backend:", err);
            }
          }
        }
        return { ok: true, lote: true, quantidade: novasOcorrencias.length };
      }

      const srv = servidores.find((s) => s.id === dados.servidor_id);
      const payload = {
        ...dados,
        autorizado_por: dados.autorizado_por || usrLogado.resumo,
        servidor_nome: srv?.nome || dados.servidor_nome || "Servidor(a)",
        servidor_cargo: srv?.cargo || dados.servidor_cargo || "",
        servidor_categoria: srv?.categoria || dados.servidor_categoria || "administrativo",
        atualizado_em: new Date().toISOString(),
      };

      let occFinal = null;
      if (dados.id) {
        occFinal = {
          ...(ocorrencias.find((o) => o.id === dados.id) || {}),
          ...payload,
          id: dados.id,
        };
        setOcorrencias((prev) =>
          prev.map((o) => (o.id === dados.id ? occFinal : o))
        );
      } else {
        occFinal = {
          ...payload,
          id: `occ-${Date.now()}`,
          criado_em: new Date().toISOString().slice(0, 10),
        };
        setOcorrencias((prev) => [occFinal, ...prev]);
      }

      if (escolaId && escolaId !== "default" && occFinal) {
        try {
          await api.post("/api/administrativo/ocorrencias", {
            escola_id: Number(escolaId),
            ocorrencia: occFinal,
          });
        } catch (err) {
          console.error("[Administrativo] Erro ao salvar ocorrência no backend:", err);
        }
      }

      return { ok: true, lote: false, quantidade: 1 };
    },
    [servidores, escolaId, ocorrencias]
  );

  const excluirOcorrencia = useCallback(
    async (id) => {
      setOcorrencias((prev) => prev.filter((o) => o.id !== id));
      if (escolaId && escolaId !== "default" && id) {
        try {
          await api.delete(
            `/api/administrativo/ocorrencias/${encodeURIComponent(
              id
            )}?escola_id=${escolaId}`
          );
        } catch (err) {
          console.error("[Administrativo] Erro ao excluir ocorrência no backend:", err);
        }
      }
    },
    [escolaId]
  );

  const atualizarStatusOcorrencia = useCallback(
    async (id, novoStatus) => {
      setOcorrencias((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: novoStatus } : o))
      );
      if (escolaId && escolaId !== "default" && id) {
        try {
          await api.patch(
            `/api/administrativo/ocorrencias/${encodeURIComponent(id)}/status`,
            {
              escola_id: Number(escolaId),
              status: novoStatus,
            }
          );
        } catch (err) {
          console.error("[Administrativo] Erro ao atualizar status da ocorrência no backend:", err);
        }
      }
    },
    [escolaId]
  );

  // ── Ações de Ponto Diário (Persistidas no MySQL via /api/administrativo/ponto) ──
  const registrarPontoServidor = useCallback(
    async (dataISO, servidorId, dadosPonto) => {
      const novoPonto = {
        ...(pontoDiario?.[dataISO]?.[servidorId] || {}),
        ...dadosPonto,
        atualizado_em: new Date().toISOString(),
      };

      setPontoDiario((prev) => {
        const doDia = prev[dataISO] || {};
        return {
          ...prev,
          [dataISO]: {
            ...doDia,
            [servidorId]: novoPonto,
          },
        };
      });

      if (escolaId && escolaId !== "default") {
        try {
          await api.post("/api/administrativo/ponto", {
            escola_id: Number(escolaId),
            entries: [
              {
                data_iso: dataISO,
                servidor_id: servidorId,
                dados: novoPonto,
              },
            ],
          });
        } catch {}
      }
    },
    [escolaId, pontoDiario]
  );

  // Lançamento Coletivo de Frequência & Ponto (Ponto Facultativo, Dia Letivo Móvel, Decreto, Paralisação, etc.)
  const registrarPontoColetivo = useCallback(
    async ({
      dataInicio,
      dataFim,
      servidoresAlvo = [],
      status = "abono",
      observacao = "",
    }) => {
      const dtIniStr = dataInicio || new Date().toISOString().slice(0, 10);
      const dtFimStr = dataFim && dataFim >= dtIniStr ? dataFim : dtIniStr;

      const datasIntervalo = [];
      const [yI, mI, dI] = dtIniStr.split("-").map(Number);
      const [yF, mF, dF] = dtFimStr.split("-").map(Number);
      const cur = new Date(yI, mI - 1, dI, 12, 0, 0);
      const end = new Date(yF, mF - 1, dF, 12, 0, 0);

      while (cur <= end && datasIntervalo.length < 60) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        datasIntervalo.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }

      const entriesToSync = [];

      setPontoDiario((prev) => {
        const next = { ...prev };
        datasIntervalo.forEach((iso) => {
          const doDia = { ...(next[iso] || {}) };
          servidoresAlvo.forEach((srv) => {
            const turnosSrv = getTurnosEJornadaServidor(srv);
            if (!status || status === "limpar") {
              doDia[srv.id] = {
                status: null,
                _desmarcado: true,
                entrada: turnosSrv.turno1.entrada,
                saida: turnosSrv.turno1.saida,
                entrada_2: turnosSrv.turno2 ? turnosSrv.turno2.entrada : "",
                saida_2: turnosSrv.turno2 ? turnosSrv.turno2.saida : "",
                observacao: "",
                atualizado_em: new Date().toISOString(),
              };
            } else {
              const isPresenca = status === "presente" || status === "atraso";
              doDia[srv.id] = {
                ...(doDia[srv.id] || {}),
                status,
                _desmarcado: false,
                coletivo: true,
                entrada: isPresenca ? turnosSrv.turno1.entrada : "—",
                saida: isPresenca ? turnosSrv.turno1.saida : "—",
                entrada_2: turnosSrv.turno2
                  ? isPresenca
                    ? turnosSrv.turno2.entrada
                    : "—"
                  : "",
                saida_2: turnosSrv.turno2
                  ? isPresenca
                    ? turnosSrv.turno2.saida
                    : "—"
                  : "",
                observacao: observacao || doDia[srv.id]?.observacao || "",
                atualizado_em: new Date().toISOString(),
              };
            }
            entriesToSync.push({
              data_iso: iso,
              servidor_id: srv.id,
              dados: doDia[srv.id],
            });
          });
          next[iso] = doDia;
        });
        return next;
      });

      if (escolaId && escolaId !== "default" && entriesToSync.length > 0) {
        try {
          await api.post("/api/administrativo/ponto", {
            escola_id: Number(escolaId),
            entries: entriesToSync,
          });
        } catch {}
      }
    },
    [escolaId]
  );

  const marcarTodosPresentesNoDia = useCallback(
    async (dataISO, listaServidores) => {
      const entriesToSync = [];

      setPontoDiario((prev) => {
        const doDia = { ...(prev[dataISO] || {}) };
        listaServidores.forEach((srv) => {
          if (!doDia[srv.id] || !doDia[srv.id].status) {
            const turnosSrv = getTurnosEJornadaServidor(srv);
            doDia[srv.id] = {
              status: "presente",
              _desmarcado: false,
              entrada: turnosSrv.turno1.entrada,
              saida: turnosSrv.turno1.saida,
              entrada_2: turnosSrv.turno2 ? turnosSrv.turno2.entrada : "",
              saida_2: turnosSrv.turno2 ? turnosSrv.turno2.saida : "",
              observacao: "",
              atualizado_em: new Date().toISOString(),
            };
            entriesToSync.push({
              data_iso: dataISO,
              servidor_id: srv.id,
              dados: doDia[srv.id],
            });
          }
        });
        return {
          ...prev,
          [dataISO]: doDia,
        };
      });

      if (escolaId && escolaId !== "default" && entriesToSync.length > 0) {
        try {
          await api.post("/api/administrativo/ponto", {
            escola_id: Number(escolaId),
            entries: entriesToSync,
          });
        } catch {}
      }
    },
    [escolaId]
  );

  // ── Estatísticas por Servidor (Saldo de Abonos, Dias de Atestado, etc.) ────
  const statsPorServidor = useMemo(() => {
    const anoAtual = String(new Date().getFullYear());
    const mapa = {};

    servidores.forEach((s) => {
      mapa[s.id] = {
        abonosUsados: 0,
        abonosRestantes: LIMITE_ABONOS_ANUAL,
        diasAtestado: 0,
        totalAtestados: 0,
        totalAusencias: 0,
        negociacoesPendentes: 0,
        negociacoesConcluidas: 0,
        emAfastamentoHoje: false,
        motivoAfastamentoHoje: null,
      };
    });

    const hojeISO = new Date().toISOString().slice(0, 10);

    ocorrencias.forEach((occ) => {
      const st = mapa[occ.servidor_id];
      if (!st) return;

      const anoOcc = String(occ.data_inicio || "").slice(0, 4);
      const isAnoAtual = !anoOcc || anoOcc === anoAtual;

      if (occ.tipo === "abono" && isAnoAtual && occ.status !== "cancelado") {
        const isTRE = String(occ.subtipo || "").toLowerCase().includes("tre");
        if (!isTRE) {
          st.abonosUsados += Number(occ.dias) || 1;
          st.abonosRestantes = Math.max(0, LIMITE_ABONOS_ANUAL - st.abonosUsados);
        }
      } else if (occ.tipo === "atestado" || occ.tipo === "licenca") {
        st.totalAtestados += 1;
        st.diasAtestado += Number(occ.dias) || 1;
      } else if (occ.tipo === "afastamento") {
        st.totalAfastamentos = (st.totalAfastamentos || 0) + 1;
        st.diasAfastamento = (st.diasAfastamento || 0) + (Number(occ.dias) || 1);
      } else if (occ.tipo === "ausencia") {
        st.totalAusencias += 1;
      } else if (occ.tipo === "negociacao") {
        if (occ.status === "pendente_reposicao") st.negociacoesPendentes += 1;
        else if (occ.status === "compensado") st.negociacoesConcluidas += 1;
      }

      if (
        occ.data_inicio &&
        occ.data_fim &&
        hojeISO >= occ.data_inicio &&
        hojeISO <= occ.data_fim &&
        occ.status !== "cancelado"
      ) {
        st.emAfastamentoHoje = true;
        st.motivoAfastamentoHoje = occ.tipo;
      }
    });

    return mapa;
  }, [servidores, ocorrencias]);

  return {
    servidores,
    ocorrencias,
    pontoDiario,
    statsPorServidor,
    loading,
    biometriaAtiva,
    alternarBiometria,
    calendarioGovernanca,
    recarregarSistema: carregarDadosSistema,
    salvarServidor,
    alternarStatusServidor,
    excluirServidor,
    salvarOcorrencia,
    excluirOcorrencia,
    atualizarStatusOcorrencia,
    registrarPontoServidor,
    registrarPontoColetivo,
    marcarTodosPresentesNoDia,
  };
}
