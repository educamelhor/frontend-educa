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
  { value: "readaptado", label: "Servidor Readaptado" },
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

// Exemplos iniciais para demonstrar servidores sem acesso ao sistema (terceirizados/operacional)
function getDefaultCustomStaff() {
  return [
    {
      id: "adm-terc-1",
      nome: "Maria do Socorro Ferreira",
      cpf: "41829304155",
      matricula: "TERC-2026-01",
      cargo: "Auxiliar de Serviços Gerais (Limpeza)",
      categoria: "terceirizado",
      vinculo: "terceirizado",
      empresa: "Conservadora Brasília Ltda",
      carga_horaria: "44h",
      turno: "Integral",
      setor: "Conservação & Limpeza",
      horario_trabalho: "07:00 às 17:00",
      telefone: "(61) 99214-8810",
      email: "",
      acesso_sistema: false,
      ativo: true,
      origem: "administrativo",
      observacoes: "Responsável pelo Bloco Pedagógico A e Pátio Central.",
    },
    {
      id: "adm-terc-2",
      nome: "Antônio Carlos Magalhães Rocha",
      cpf: "52910483211",
      matricula: "TERC-2026-02",
      cargo: "Agente de Portaria e Controle de Acesso",
      categoria: "terceirizado",
      vinculo: "terceirizado",
      empresa: "Segurança Forte DF",
      carga_horaria: "12x36",
      turno: "Escala 12x36",
      setor: "Portaria Principal",
      horario_trabalho: "07:00 às 19:00",
      telefone: "(61) 98411-2390",
      email: "",
      acesso_sistema: false,
      ativo: true,
      origem: "administrativo",
      observacoes: "Plantão diurno par.",
    },
    {
      id: "adm-terc-3",
      nome: "Francisca das Chagas Oliveira",
      cpf: "63748291044",
      matricula: "TERC-2026-03",
      cargo: "Merendeira / Cozinheira Escolar",
      categoria: "apoio",
      vinculo: "terceirizado",
      empresa: "NutriMais Alimentação",
      carga_horaria: "44h",
      turno: "Matutino",
      setor: "Refeitório / Cozinha",
      horario_trabalho: "06:30 às 15:30",
      telefone: "(61) 99102-4451",
      email: "",
      acesso_sistema: false,
      ativo: true,
      origem: "administrativo",
      observacoes: "Cozinheira chefe do turno matutino.",
    },
    {
      id: "adm-serv-4",
      nome: "Sebastião Mendes da Silva",
      cpf: "71829364509",
      matricula: "SEEDF-184920",
      cargo: "Agente de Gestão Educacional — Conservação",
      categoria: "administrativo",
      vinculo: "readaptado",
      empresa: "SEEDF",
      carga_horaria: "40h",
      turno: "Vespertino",
      setor: "Mecanografia & Apoio Secretaria",
      horario_trabalho: "13:00 às 18:00",
      telefone: "(61) 98177-9012",
      email: "",
      acesso_sistema: false,
      ativo: true,
      origem: "administrativo",
      observacoes: "Servidor efetivo sem necessidade de login ativo no portal; atua na reprografia.",
    },
  ];
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

  // Persistência local (sincronizada e pronta para o backend na Etapa 2)
  const [customStaff, setCustomStaff] = useState(() => {
    try {
      const raw = localStorage.getItem(`educa_admin_custom_staff_v1_${escolaId}`);
      if (raw) return JSON.parse(raw);
      return getDefaultCustomStaff();
    } catch {
      return getDefaultCustomStaff();
    }
  });

  // Overrides permitem editar/complementar dados de professores ou membros da direção
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
      return raw ? JSON.parse(raw) : [];
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

  // Salvar alterações no localStorage
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

  // Busca automática de TODOS os professores + membros da direção/secretaria/equipe + Calendário Letivo da Governança
  const carregarDadosSistema = useCallback(async () => {
    setLoading(true);
    try {
      const anoAtual = new Date().getFullYear();
      const [resProf, resCad, resEq, resGov] = await Promise.allSettled([
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
      ]);

      if (resGov.status === "fulfilled" && resGov.value?.data?.ok) {
        setCalendarioGovernanca({
          periodos: resGov.value.data.periodos || [],
          excecoes: resGov.value.data.excecoes || [],
        });
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
  }, [escolaId]);

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

  // Se ainda não houver ocorrências salvas e já carregamos servidores, popula exemplos realistas no 1º uso
  useEffect(() => {
    if (loading || servidores.length === 0) return;
    const jaInicializou = localStorage.getItem(`educa_admin_occ_seed_v1_${escolaId}`);
    if (jaInicializou || ocorrencias.length > 0) return;

    const hoje = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 2);
    const semanaPassada = new Date(hoje);
    semanaPassada.setDate(hoje.getDate() - 8);
    const proxSemana = new Date(hoje);
    proxSemana.setDate(hoje.getDate() + 6);

    const s1 = servidores[0];
    const s2 = servidores[1] || servidores[0];
    const s3 = servidores[2] || servidores[0];
    const s4 = servidores[3] || servidores[0];

    const seedOcorrencias = [
      {
        id: "occ-seed-1",
        servidor_id: s1.id,
        servidor_nome: s1.nome,
        servidor_cargo: s1.cargo,
        servidor_categoria: s1.categoria,
        tipo: "abono",
        subtipo: "Abono de Ponto Anual (1º do ano)",
        data_inicio: fmt(semanaPassada),
        data_fim: fmt(semanaPassada),
        dias: 1,
        motivo: "Assuntos particulares inadiáveis (Abono regulamentar previsto em acordo coletivo/SEEDF).",
        autorizado_por: "Direção Escolar",
        status: "aprovado",
        criado_em: fmt(semanaPassada),
      },
      {
        id: "occ-seed-2",
        servidor_id: s2.id,
        servidor_nome: s2.nome,
        servidor_cargo: s2.cargo,
        servidor_categoria: s2.categoria,
        tipo: "atestado",
        subtipo: "Atestado Médico Próprio",
        data_inicio: fmt(ontem),
        data_fim: fmt(hoje),
        dias: 3,
        cid: "J06.9",
        medico: "Dr. Ricardo Albuquerque — CRM/DF 21.840",
        documento_ref: "ATEST-2026-089.pdf",
        motivo: "Afastamento médico por quadro viral agudo com recomendação de repouso.",
        autorizado_por: "Secretaria / RH",
        status: "homologado",
        criado_em: fmt(ontem),
      },
      {
        id: "occ-seed-3",
        servidor_id: s3.id,
        servidor_nome: s3.nome,
        servidor_cargo: s3.cargo,
        servidor_categoria: s3.categoria,
        tipo: "negociacao",
        subtipo: "Liberação com Reposição de Carga Horária",
        data_inicio: fmt(ontem),
        data_fim: fmt(ontem),
        dias: 1,
        data_compensacao: fmt(proxSemana),
        forma_compensacao: "Reposição de 4h no turno contrário em apoio pedagógico / projeto interdisciplinar.",
        motivo: "Participação em congresso externo / compromisso familiar previamente acordado com a Direção.",
        autorizado_por: "Diretor(a) Pedagógico",
        status: "pendente_reposicao",
        criado_em: fmt(ontem),
      },
      {
        id: "occ-seed-4",
        servidor_id: s4.id,
        servidor_nome: s4.nome,
        servidor_cargo: s4.cargo,
        servidor_categoria: s4.categoria,
        tipo: "ausencia",
        subtipo: "Atraso / Entrada Tardia Justificada",
        data_inicio: fmt(semanaPassada),
        data_fim: fmt(semanaPassada),
        dias: 1,
        horas_ausencia: "01h30min",
        motivo: "Problema no transporte público na via estrutural; comunicou a supervisão administrativa às 07h10.",
        autorizado_por: "Supervisor Administrativo",
        status: "registrado",
        criado_em: fmt(semanaPassada),
      },
    ];

    setOcorrencias(seedOcorrencias);
    localStorage.setItem(`educa_admin_occ_seed_v1_${escolaId}`, "1");
  }, [loading, servidores, ocorrencias.length, escolaId]);

  // ── Ações CRUD de Servidores ────────────────────────────────────────────────
  const salvarServidor = useCallback(
    async (dados) => {
      const id = dados.id;
      const isSystem = String(id || "").startsWith("sys-");

      if (isSystem) {
        setOverrides((prev) => ({
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            ...dados,
            atualizado_em: new Date().toISOString(),
          },
        }));
        return { ok: true, mode: "override" };
      }

      if (id) {
        setCustomStaff((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, ...dados, atualizado_em: new Date().toISOString() }
              : item
          )
        );
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

      // Se o gestor marcou "Conceder acesso ao sistema", também podemos pré-cadastrar em /api/direcao/cadastro
      if (dados.acesso_sistema && dados.cpf && escolaId && escolaId !== "default") {
        try {
          await api.post("/api/direcao/cadastro", {
            nome: dados.nome.trim(),
            cpf: limparCPF(dados.cpf),
            funcao: dados.funcao_sistema || dados.categoria || "administrativo",
            escola_id: Number(escolaId),
          });
          await carregarDadosSistema();
          return { ok: true, mode: "created_system" };
        } catch {
          // Se já existir ou falhar silenciosamente, garante no quadro local
        }
      }

      setCustomStaff((prev) => [novoServidor, ...prev]);
      return { ok: true, mode: "created_local", servidor: novoServidor };
    },
    [escolaId, carregarDadosSistema]
  );

  const alternarStatusServidor = useCallback((servidor) => {
    const novoStatus = !servidor.ativo;
    if (String(servidor.id).startsWith("sys-")) {
      setOverrides((prev) => ({
        ...prev,
        [servidor.id]: {
          ...(prev[servidor.id] || {}),
          ativo: novoStatus,
        },
      }));
    } else {
      setCustomStaff((prev) =>
        prev.map((s) => (s.id === servidor.id ? { ...s, ativo: novoStatus } : s))
      );
    }
  }, []);

  const excluirServidor = useCallback((servidor) => {
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
  }, []);

  // ── Ações CRUD de Ocorrências (Abonos, Atestados, Ausências, Negociações) ──
  const salvarOcorrencia = useCallback(
    (dados) => {
      const srv = servidores.find((s) => s.id === dados.servidor_id);
      const usrLogado = getUsuarioLogadoRastreabilidade();
      const payload = {
        ...dados,
        autorizado_por: dados.autorizado_por || usrLogado.resumo,
        servidor_nome: srv?.nome || dados.servidor_nome || "Servidor(a)",
        servidor_cargo: srv?.cargo || dados.servidor_cargo || "",
        servidor_categoria: srv?.categoria || dados.servidor_categoria || "administrativo",
        atualizado_em: new Date().toISOString(),
      };

      if (dados.id) {
        setOcorrencias((prev) =>
          prev.map((o) => (o.id === dados.id ? { ...o, ...payload } : o))
        );
      } else {
        const nova = {
          ...payload,
          id: `occ-${Date.now()}`,
          criado_em: new Date().toISOString().slice(0, 10),
        };
        setOcorrencias((prev) => [nova, ...prev]);
      }
    },
    [servidores]
  );

  const excluirOcorrencia = useCallback((id) => {
    setOcorrencias((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const atualizarStatusOcorrencia = useCallback((id, novoStatus) => {
    setOcorrencias((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: novoStatus } : o))
    );
  }, []);

  // ── Ações de Ponto Diário ───────────────────────────────────────────────────
  const registrarPontoServidor = useCallback((dataISO, servidorId, dadosPonto) => {
    setPontoDiario((prev) => {
      const doDia = prev[dataISO] || {};
      return {
        ...prev,
        [dataISO]: {
          ...doDia,
          [servidorId]: {
            ...(doDia[servidorId] || {}),
            ...dadosPonto,
            atualizado_em: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  // Lançamento Coletivo de Frequência & Ponto (Ponto Facultativo, Dia Letivo Móvel, Decreto, Paralisação, etc.)
  const registrarPontoColetivo = useCallback(
    ({
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
          });
          next[iso] = doDia;
        });
        return next;
      });
    },
    []
  );

  const marcarTodosPresentesNoDia = useCallback(
    (dataISO, listaServidores) => {
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
          }
        });
        return {
          ...prev,
          [dataISO]: doDia,
        };
      });
    },
    []
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
