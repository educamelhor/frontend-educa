// src/features/administrativo/FolhaPontoOficialSEEDF.jsx
// ============================================================================
// CLONE OFICIAL 1:1 DA FOLHA DE FREQUÊNCIA DA SEEDF (GDF)
// Contempla fielmente os 3 modelos oficiais do SIGEP / SEEDF:
//   1) EmitirFolha.pdf            -> Servidor Efetivo COM Função Gratificada
//   2) EmitirFolha_sem_função.pdf -> Servidor Efetivo SEM Função Gratificada
//   3) EmitirFolha_contrato.pdf   -> Professor / Servidor CONTRATO TEMPORÁRIO
// Renderiza exatamente 2 páginas A4 (Frente e Verso), 100% com estilos inline
// para fidelidade absoluta tanto em tela quanto na geração/impressão de PDF.
// ============================================================================

import React, { useMemo } from "react";
import {
  normalizarTurno,
  CATALOGO_CARGOS_SEEDF,
  FUNCOES_GRATIFICADAS_SEEDF,
} from "./useAdministrativoData";
import brasaoDfImg from "./brasao-df.png";

const MESES_EXTENSO = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

// Mapeia uma ocorrência ou status do ponto diário para o texto tracejado da coluna Assinatura (Pág. 1)
// e para o Código Oficial SIGEP de 5 dígitos (Pág. 2)
export function mapearOcorrenciaParaFolhaSEEDF(occ) {
  if (!occ) return null;
  const sub = String(occ.subtipo || "").toUpperCase();
  const tipo = String(occ.tipo || "").toLowerCase();
  const obs = String(occ.motivo || occ.observacao || "").toUpperCase();

  if (
    sub.includes("FERIAS") ||
    sub.includes("FÉRIAS") ||
    obs.includes("FERIAS") ||
    obs.includes("FÉRIAS")
  ) {
    return {
      textoAssinatura: "--- FERIAS ---",
      codigoSigep: "99902",
      descricaoCurta: "FÉRIAS REGULAMENTARES",
    };
  }
  if (sub.includes("TRE") || obs.includes("TRE")) {
    return {
      textoAssinatura: "--- ABONO TRE ---",
      codigoSigep: "00256",
      descricaoCurta: "ABONO TRE (SERV. ELEITORAL)",
    };
  }
  if (sub.includes("BIMESTRAL") || sub.includes("449")) {
    return {
      textoAssinatura: "--- ABONO LEI 449/93 ---",
      codigoSigep: "00219",
      descricaoCurta: "ABONO BIMESTRAL LEI 449/1993",
    };
  }
  if (tipo === "abono" || sub.includes("ABONO DE PONTO")) {
    return {
      textoAssinatura: "--- ABONO DE PONTO ---",
      codigoSigep: "00219",
      descricaoCurta: "ABONO DE PONTO ART. 151 LC 840",
    };
  }
  if (sub.includes("EXAME MEDICO") || sub.includes("118")) {
    return {
      textoAssinatura: "--- EXAME PREVENTIVO ---",
      codigoSigep: "00118",
      descricaoCurta: "EXAME MÉDICO PREV. ART. 62 LC 840",
    };
  }
  if (sub.includes("COMPARECIMENTO")) {
    return {
      textoAssinatura: "--- ATEST. COMPAREC. ---",
      codigoSigep: "",
      descricaoCurta: sub,
    };
  }
  if (tipo === "atestado") {
    return {
      textoAssinatura: "--- ATESTADO MEDICO ---",
      codigoSigep: "",
      descricaoCurta: sub || "ATESTADO MÉDICO DE ATÉ 03 DIAS",
    };
  }
  if (sub.includes("MATERNIDADE")) {
    return {
      textoAssinatura: "--- LIC. MATERNIDADE ---",
      codigoSigep: "",
      descricaoCurta: sub,
    };
  }
  if (sub.includes("PATERNIDADE")) {
    return {
      textoAssinatura: "--- LIC. PATERNIDADE ---",
      codigoSigep: "",
      descricaoCurta: sub,
    };
  }
  if (sub.includes("ADOTANTE")) {
    return {
      textoAssinatura: "--- LICENCA ADOTANTE ---",
      codigoSigep: "",
      descricaoCurta: sub,
    };
  }
  if (sub.includes("ACIDENTE")) {
    return {
      textoAssinatura: "--- LIC. ACIDENTE SERV ---",
      codigoSigep: "",
      descricaoCurta: sub,
    };
  }
  if (sub.includes("PESSOA DOENTE")) {
    return {
      textoAssinatura: "--- LIC. ACOMP. FAMILIA ---",
      codigoSigep: "",
      descricaoCurta: sub,
    };
  }
  if (tipo === "licenca") {
    return {
      textoAssinatura: "--- LICENCA MEDICA ---",
      codigoSigep: "",
      descricaoCurta: sub || "LICENÇA MÉDICA OU ODONTOLÓGICA",
    };
  }
  if (sub.includes("SANGUE")) {
    return {
      textoAssinatura: "--- DOACAO DE SANGUE ---",
      codigoSigep: "",
      descricaoCurta: "AFAST. DOAÇÃO DE SANGUE ART. 62",
    };
  }
  if (sub.includes("CASAMENTO")) {
    return {
      textoAssinatura: "--- AFAST. CASAMENTO ---",
      codigoSigep: "",
      descricaoCurta: "AFAST. CASAMENTO ART. 62 LC 840",
    };
  }
  if (sub.includes("FALECIMENTO")) {
    return {
      textoAssinatura: "--- AFAST. FALECIMENTO ---",
      codigoSigep: "",
      descricaoCurta: "AFAST. FALECIMENTO ART. 62 LC 840",
    };
  }
  if (sub.includes("JURI")) {
    return {
      textoAssinatura: "--- SERVICO DE JURI ---",
      codigoSigep: "",
      descricaoCurta: "AFAST. JÚRI / SERV. OBRIGATÓRIO",
    };
  }
  if (sub.includes("ELEITORAL")) {
    return {
      textoAssinatura: "--- AFAST. ELEITORAL ---",
      codigoSigep: "00256",
      descricaoCurta: sub,
    };
  }
  if (tipo === "afastamento") {
    return {
      textoAssinatura: "--- DISPENSA / AFAST. ---",
      codigoSigep: "",
      descricaoCurta: sub || "AFASTAMENTO LEGAL",
    };
  }
  if (sub.includes("PARALISACAO") || sub.includes("PARALISAÇÃO")) {
    return {
      textoAssinatura: "--- FALTA PARALISACAO ---",
      codigoSigep: "40034",
      descricaoCurta: "FALTA PARALISAÇÃO (40034)",
    };
  }
  if (sub.includes("HORAS NAO TRABALHADAS")) {
    return {
      textoAssinatura: "--- HORAS NAO TRAB. ---",
      codigoSigep: "40046",
      descricaoCurta: "HORAS NÃO TRABALHADAS (40046)",
    };
  }
  if (tipo === "ausencia" || sub.includes("FALTA")) {
    return {
      textoAssinatura: "--- FALTA ---",
      codigoSigep: "40010",
      descricaoCurta: sub || "FALTA (40010)",
    };
  }
  if (sub.includes("ADICIONAL NOTURNO")) {
    return {
      textoAssinatura: "",
      codigoSigep: "18077",
      descricaoCurta: "ADICIONAL NOTURNO (18077)",
    };
  }
  if (sub.includes("PONTO FACULTATIVO") || obs.includes("PONTO FACULTATIVO")) {
    return {
      textoAssinatura: "--- PONTO FACULTATIVO ---",
      codigoSigep: "",
      descricaoCurta: "PONTO FACULTATIVO",
    };
  }
  if (
    sub.includes("DIA LETIVO MÓVEL") ||
    sub.includes("DIA LETIVO MOVEL") ||
    obs.includes("DIA LETIVO MÓVEL")
  ) {
    return {
      textoAssinatura: "--- DIA LETIVO MOVEL ---",
      codigoSigep: "",
      descricaoCurta: "DIA LETIVO MÓVEL",
    };
  }
  if (sub.includes("RECESSO") || obs.includes("RECESSO")) {
    return {
      textoAssinatura: "--- RECESSO ---",
      codigoSigep: "",
      descricaoCurta: "RECESSO ESCOLAR",
    };
  }
  if (sub.includes("FERIADO") || obs.includes("FERIADO")) {
    return {
      textoAssinatura: "--- FERIADO ---",
      codigoSigep: "",
      descricaoCurta: "FERIADO",
    };
  }
  if (sub.includes("SUSP. DAS AULAS")) {
    return {
      textoAssinatura: "--- SUSP. DAS AULAS ---",
      codigoSigep: "",
      descricaoCurta: sub,
    };
  }
  if (sub.includes("NEGOCIAÇÃO INTERNA") || tipo === "negociacao") {
    return {
      textoAssinatura: "--- ACORDO / REPOSICAO ---",
      codigoSigep: "",
      descricaoCurta: sub || "NEGOCIAÇÃO INTERNA",
    };
  }

  return {
    textoAssinatura: `--- ${sub.slice(0, 18) || "OCORRENCIA"} ---`,
    codigoSigep: "",
    descricaoCurta: sub || "OCORRÊNCIA ADMINISTRATIVA",
  };
}

// Renderiza uma fileira horizontal de quadrículas abertas no topo (estilo formulário SIGEP da Pág. 2)
// IMPORTANTE: 100% inline styles (display: inline-flex, flexDirection: row) para nunca empilhar no PDF!
function QuadriculasSIGEP({ digitos = [], totalCaixas = 1 }) {
  const arr = Array.from({ length: totalCaixas }, (_, i) => digitos[i] ?? "");
  return (
    <div
      className="quadriculas-sigep-row"
      style={{
        display: "inline-flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        verticalAlign: "middle",
      }}
    >
      {arr.map((char, idx) => (
        <div
          key={idx}
          style={{
            width: "19px",
            height: "22px",
            borderLeft: "1px solid #000",
            borderRight: idx === totalCaixas - 1 ? "1px solid #000" : "none",
            borderBottom: "1px solid #000",
            borderTop: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 400,
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#000",
            boxSizing: "border-box",
          }}
        >
          {char}
        </div>
      ))}
    </div>
  );
}

export default function FolhaPontoOficialSEEDF({
  servidor,
  mesReferencia = "2026-10",
  ocorrencias = [],
  pontoDiario = {},
  modeloForcado = "auto", // "auto" | "efetivo" | "efetivo_sem_funcao" | "temporario"
  dadosUnidade = {},
  preencherHorariosPonto = false,
  observacaoManual = "",
  onClicarDia = null,
  quebrarPaginaNoFinal = false,
}) {
  if (!servidor) return null;

  // Extrai Ano e Mês
  const [anoStr, mesStr] = String(mesReferencia || "2026-10").split("-");
  const anoNum = Number(anoStr) || new Date().getFullYear();
  const mesNum = Number(mesStr) || new Date().getMonth() + 1;
  const nomeMesExtenso = MESES_EXTENSO[mesNum - 1] || "OUTUBRO";
  const referenciaFormatada = `${nomeMesExtenso} / ${anoNum}`;
  const ultimoDiaMes = new Date(anoNum, mesNum, 0).getDate();

  // Determina o modelo oficial SEEDF a ser renderizado
  const vinculoNorm = String(servidor.vinculo || "").toLowerCase();
  const isTemporario =
    modeloForcado === "temporario" ||
    (modeloForcado === "auto" && vinculoNorm.includes("tempor"));

  // Determina se o servidor exerce função gratificada escolar (FGE — Lei nº 5.326/2014)
  const funcaoGratificadaServidor = useMemo(() => {
    if (modeloForcado === "efetivo_sem_funcao") return "";
    if (servidor.funcao_gratificada) {
      const fgeItem = FUNCOES_GRATIFICADAS_SEEDF.find(
        (f) => f.value === servidor.funcao_gratificada
      );
      if (fgeItem) return fgeItem.impressaoFolha || "";
      return String(servidor.funcao_gratificada).replace(/DFG-02/gi, "FGE-02");
    }
    const cargoUp = String(servidor.cargo || "").toUpperCase();
    if (cargoUp.includes("DIRETOR") && !cargoUp.includes("VICE")) {
      return "DIRETOR                                FGE-06";
    }
    if (cargoUp.includes("VICE")) {
      return "VICE-DIRETOR                           FGE-05";
    }
    if (cargoUp.includes("SUPERVISOR") && cargoUp.includes("NOTURNO")) {
      return "SUPERVISOR NOTURNO                     FGE-01";
    }
    if (cargoUp.includes("SUPERVISOR") && cargoUp.includes("PEDAG")) {
      return "SUPERVISOR PEDAGOGICO                  FGE-02";
    }
    if (cargoUp.includes("SUPERVISOR")) {
      return "SUPERVISOR ADMINISTRATIVO              FGE-02";
    }
    if (
      cargoUp.includes("CHEFE DE SECRETARIA") ||
      cargoUp.includes("SECRETÁRIO") ||
      cargoUp.includes("SECRETARIO")
    ) {
      return "CHEFE DE SECRETARIA                    FGE-02";
    }
    return "";
  }, [servidor, modeloForcado]);

  // Dados institucionais da Unidade Escolar (normaliza siglas curtas como CEF04-CCMDF para o nome oficial SEEDF)
  const orgaoTitulo =
    dadosUnidade.orgaoTitulo || "SECRETARIA DE ESTADO DE EDUCAÇÃO";
  const cnpjOrgao = dadosUnidade.cnpjOrgao || "00.394.676/0001-07";
  const uaCodigo = dadosUnidade.ua || "007";
  const creNome =
    dadosUnidade.cre || "COORDENAÇÃO REGIONAL DE ENSINO DE PLANALTINA";
  const codEstabelecimento = dadosUnidade.codigoExercicio || "990230000043";
  const nomeEstabelecimento = useMemo(() => {
    const raw = String(dadosUnidade.nomeEscola || "").trim().toUpperCase();
    if (!raw || raw === "CEF04-CCMDF" || raw === "CEF 04" || raw.length < 18) {
      return "CENTRO DE ENSINO FUNDAMENTAL 04 DE PLANALTINA - COLEGIO CM";
    }
    return raw;
  }, [dadosUnidade.nomeEscola]);

  // Dados funcionais do servidor formatados para o cabeçalho oficial
  const matriculaOficial =
    servidor.matricula &&
    !String(servidor.matricula).startsWith("PROF-") &&
    !String(servidor.matricula).startsWith("DIR-") &&
    !String(servidor.matricula).startsWith("EQP-") &&
    !String(servidor.matricula).startsWith("TERC-") &&
    !String(servidor.matricula).startsWith("ADM-") &&
    !String(servidor.matricula).startsWith("CAD-")
      ? servidor.matricula
      : isTemporario
      ? "7062701-0"
      : "0027596-4";

  const nomeServidorUpper = String(servidor.nome || "").toUpperCase();
  const chRaw = String(servidor.carga_horaria || "40h").toLowerCase();
  const chNumero = chRaw.includes("12x36")
    ? "40"
    : chRaw.replace(/\D/g, "") || "40";
  const isJornadaDupla = Number(chNumero) > 20;

  // Cargo/Especialidade e Disciplina dinâmicos conforme Catálogo Oficial SEEDF e Padrão SIGEP
  const cargoBase = useMemo(() => {
    if (isTemporario) {
      return "PROFESSOR TEMPORARIO";
    }
    const itemCat = CATALOGO_CARGOS_SEEDF.find(
      (c) => c.id === servidor.cargo_catalogo_id
    );
    const padrao = String(servidor.padrao_carreira || "25").padStart(2, "0");
    const etapa = String(servidor.etapa_titulacao || "PQ5").toUpperCase();
    const codigoSigepPadrao = `${padrao}-${etapa}`;

    if (itemCat) {
      if (itemCat.exigePadraoSigep) {
        return `${itemCat.cargoSigep}     ${codigoSigepPadrao}`;
      }
      return itemCat.cargoSigep;
    }

    const cargoUp = String(servidor.cargo || "").toUpperCase();
    const catNorm = String(servidor.categoria || "").toLowerCase();

    if (cargoUp.includes("ORIENTADOR") || cargoUp.includes("PEDAGOGO")) {
      return `PEDAGOGO-ORIENTADOR EDUC.     ${codigoSigepPadrao}`;
    }
    if (
      catNorm === "professor" ||
      cargoUp.includes("PROFESSOR") ||
      (catNorm === "direcao" && !cargoUp.includes("SECRETARI"))
    ) {
      return `PROFESSOR DE EDUC. BASICA     ${codigoSigepPadrao}`;
    }
    if (
      cargoUp.includes("SECRETÁRIO") ||
      cargoUp.includes("SECRETARIO") ||
      cargoUp.includes("TECNICO") ||
      cargoUp.includes("TÉCNICO")
    ) {
      return "TECNICO DE GESTAO EDUCACIONAL";
    }
    if (catNorm === "terceirizado" || vinculoNorm === "terceirizado") {
      return cargoUp.split("—")[0].trim() || "PRESTADOR DE SERVICO TERCEIRIZADO";
    }
    return cargoUp.split("—")[0].trim() || `PROFESSOR DE EDUC. BASICA     ${codigoSigepPadrao}`;
  }, [isTemporario, servidor, vinculoNorm]);

  const disciplinaExtr = useMemo(() => {
    if (servidor.subcargo && String(servidor.subcargo).trim()) {
      return String(servidor.subcargo).trim().toUpperCase();
    }
    const c = String(servidor.cargo || "");
    if (c.includes("—")) return c.split("—")[1].trim().toUpperCase();
    if (c.includes("-")) return c.split("-")[1].trim().toUpperCase();
    return "";
  }, [servidor.subcargo, servidor.cargo]);

  // Determina os rótulos de Turno Esquerdo e Turno Direito (sempre Matutino -> Vespertino -> Noturno)
  const turnosCabecalho = useMemo(() => {
    const tNorm = normalizarTurno(servidor.turno);
    if (isJornadaDupla || tNorm === "Integral") {
      if (tNorm === "Noturno") {
        return { esq: "Vespertino", dir: "Noturno" };
      }
      return { esq: "Matutino", dir: "Vespertino" };
    }
    if (tNorm === "Vespertino") {
      return { esq: "Matutino", dir: "Vespertino", ativoApenas: "dir" };
    }
    if (tNorm === "Noturno") {
      return { esq: "Matutino", dir: "Noturno", ativoApenas: "dir" };
    }
    return { esq: "Matutino", dir: "Vespertino", ativoApenas: "esq" };
  }, [servidor.turno, isJornadaDupla]);

  // Filtra ocorrências do servidor que intersectam o mês de referência
  const inicioMesISO = `${anoStr}-${String(mesNum).padStart(2, "0")}-01`;
  const fimMesISO = `${anoStr}-${String(mesNum).padStart(2, "0")}-${String(
    ultimoDiaMes
  ).padStart(2, "0")}`;

  const ocorrenciasDoMes = useMemo(() => {
    return ocorrencias
      .filter((o) => {
        if (o.servidor_id !== servidor.id) return false;
        if (o.status === "cancelado") return false;
        const ini = String(o.data_inicio || "");
        const fim = String(o.data_fim || o.data_inicio || "");
        return ini <= fimMesISO && fim >= inicioMesISO;
      })
      .sort((a, b) =>
        String(a.data_inicio || "").localeCompare(String(b.data_inicio || ""))
      );
  }, [ocorrencias, servidor.id, inicioMesISO, fimMesISO]);

  // Constrói o mapa dos 31 dias da tabela
  const linhasDias = useMemo(() => {
    const lista = [];
    for (let d = 1; d <= 31; d++) {
      const diaStr = String(d).padStart(2, "0");
      const dataISO = `${anoStr}-${String(mesNum).padStart(2, "0")}-${diaStr}`;
      const diaExisteNoMes = d <= ultimoDiaMes;

      let isFimDeSemana = false;
      if (diaExisteNoMes) {
        const dtObj = new Date(anoNum, mesNum - 1, d, 12, 0, 0);
        const dow = dtObj.getDay();
        isFimDeSemana = dow === 0 || dow === 6;
      }

      // Verifica se há ocorrência cobrindo este dia
      const occDia = diaExisteNoMes
        ? ocorrenciasDoMes.find((o) => {
            const ini = String(o.data_inicio || "");
            const fim = String(o.data_fim || o.data_inicio || "");
            return dataISO >= ini && dataISO <= fim;
          })
        : null;

      // Verifica se há registro no ponto diário
      const regPonto = diaExisteNoMes
        ? pontoDiario?.[dataISO]?.[servidor.id]
        : null;

      let infoMapeada = null;
      if (occDia) {
        infoMapeada = mapearOcorrenciaParaFolhaSEEDF(occDia);
      } else if (
        regPonto &&
        regPonto.status &&
        regPonto.status !== "presente" &&
        regPonto.status !== "pendente"
      ) {
        infoMapeada = mapearOcorrenciaParaFolhaSEEDF({
          tipo: regPonto.status === "falta" ? "ausencia" : regPonto.status,
          subtipo: regPonto.observacao || regPonto.status.toUpperCase(),
          motivo: regPonto.observacao || "",
        });
      }

      const sombreado = !diaExisteNoMes || isFimDeSemana;

      let assinaturaEsq = "";
      let entradaEsq = "";
      let saidaEsq = "";
      let assinaturaDir = "";
      let entradaDir = "";
      let saidaDir = "";

      if (!diaExisteNoMes) {
        assinaturaEsq = "------------";
        entradaEsq = "------";
        saidaEsq = "------";
        assinaturaDir = "------------";
        entradaDir = "------";
        saidaDir = "------";
      } else if (infoMapeada && infoMapeada.textoAssinatura) {
        if (turnosCabecalho.ativoApenas !== "dir") {
          assinaturaEsq = infoMapeada.textoAssinatura;
          entradaEsq = "------------";
          saidaEsq = "------------";
        }
        if (turnosCabecalho.ativoApenas !== "esq") {
          assinaturaDir = infoMapeada.textoAssinatura;
          entradaDir = "------------";
          saidaDir = "------------";
        }
      } else if (!isFimDeSemana && preencherHorariosPonto && regPonto) {
        if (turnosCabecalho.ativoApenas !== "dir") {
          entradaEsq = regPonto.entrada || "";
          saidaEsq = regPonto.saida || "";
        }
        if (turnosCabecalho.ativoApenas !== "esq") {
          entradaDir =
            regPonto.entrada_t2 ||
            (turnosCabecalho.ativoApenas === "dir" ? regPonto.entrada : "") ||
            "";
          saidaDir =
            regPonto.saida_t2 ||
            (turnosCabecalho.ativoApenas === "dir" ? regPonto.saida : "") ||
            "";
        }
      }

      lista.push({
        dia: diaStr,
        dataISO,
        diaExisteNoMes,
        isFimDeSemana,
        sombreado,
        occDia,
        assinaturaEsq,
        entradaEsq,
        saidaEsq,
        assinaturaDir,
        entradaDir,
        saidaDir,
      });
    }
    return lista;
  }, [
    anoStr,
    mesNum,
    ultimoDiaMes,
    anoNum,
    ocorrenciasDoMes,
    pontoDiario,
    servidor.id,
    turnosCabecalho,
    preencherHorariosPonto,
  ]);

  // Constrói as 6 linhas de quadrículas do RESUMO DA FREQUÊNCIA (Pág. 2 — Efetivo)
  const linhasResumoSigep = useMemo(() => {
    const preenchidas = ocorrenciasDoMes.slice(0, 6).map((occ) => {
      const m = mapearOcorrenciaParaFolhaSEEDF(occ);
      const cod = String(m?.codigoSigep || "00219")
        .padStart(5, "0")
        .slice(0, 5);
      const cargaDigito = isJornadaDupla ? "3" : "1";
      const qtdDias = String(occ.dias || 1).padStart(5, "0").slice(-5);

      const iniDia = String(occ.data_inicio || "").slice(8, 10) || "01";
      const fimDia =
        String(occ.data_fim || occ.data_inicio || "").slice(8, 10) || iniDia;

      return {
        oper: ["I"],
        codigo: cod.split(""),
        carga: [cargaDigito],
        meses: ["0", "1"],
        horasDias: qtdDias.split(""),
        diaInicio: iniDia.padStart(2, "0").split(""),
        diaFim: fimDia.padStart(2, "0").split(""),
      };
    });

    while (preenchidas.length < 6) {
      preenchidas.push({
        oper: [""],
        codigo: ["", "", "", "", ""],
        carga: [""],
        meses: ["", ""],
        horasDias: ["", "", "", "", ""],
        diaInicio: ["", ""],
        diaFim: ["", ""],
      });
    }
    return preenchidas;
  }, [ocorrenciasDoMes, isJornadaDupla]);

  // Texto consolidado de Observações (listando ocorrências do mês + observação manual)
  const textoObservacoesConsolidado = useMemo(() => {
    const partes = [];
    ocorrenciasDoMes.forEach((o) => {
      const dIni = String(o.data_inicio || "").slice(8, 10);
      const dFim = String(o.data_fim || o.data_inicio || "").slice(8, 10);
      const per =
        dIni === dFim
          ? `Dia ${dIni}/${String(mesNum).padStart(2, "0")}`
          : `Dias ${dIni} a ${dFim}/${String(mesNum).padStart(2, "0")}`;
      partes.push(
        `${per}: ${o.subtipo}${o.documento_ref ? ` (${o.documento_ref})` : ""}`
      );
    });
    if (
      dadosUnidade.observacaoPadraoFolha &&
      String(dadosUnidade.observacaoPadraoFolha).trim()
    ) {
      partes.push(String(dadosUnidade.observacaoPadraoFolha).trim());
    }
    if (observacaoManual && observacaoManual.trim()) {
      partes.push(observacaoManual.trim());
    }
    return partes.join("  |  ");
  }, [
    ocorrenciasDoMes,
    mesNum,
    observacaoManual,
    dadosUnidade.observacaoPadraoFolha,
  ]);

  return (
    <div
      className="folha-seedf-wrapper space-y-8 print:space-y-0"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000000",
      }}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          PÁGINA 1 — FRENTE DA FOLHA DE FREQUÊNCIA (EFETIVO OU TEMPORÁRIO)
         ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="folha-seedf-page bg-white mx-auto shadow-md print:shadow-none"
        style={{
          width: "210mm",
          height: "296mm",
          maxHeight: "296mm",
          padding: "7mm 9mm",
          boxSizing: "border-box",
          pageBreakAfter: "always",
          breakAfter: "page",
          overflow: "hidden",
        }}
      >
        {/* ── CABEÇALHO MODELO 1: SERVIDOR EFETIVO (EmitirFolha.pdf) ──
            Dividido em DOIS blocos separados por micro-espaço, seguidos de
            micro-espaço antes da Tabela de Assinaturas (fiel ao PDF da SEEDF) */}
        {!isTemporario ? (
          <>
            {/* BLOCO 1 DO CABEÇALHO: Brasão Oficial GDF + Secretaria + Folha de Frequência / Referência */}
            <div
              style={{
                width: "100%",
                border: "1px solid #000",
                boxSizing: "border-box",
              }}
            >
              {/* Parte Superior: Brasão GDF oficial à esquerda + Título Centralizado */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "54px",
                  padding: "3px 10px",
                  borderBottom: "1px solid #000",
                  boxSizing: "border-box",
                }}
              >
                <img
                  src={brasaoDfImg}
                  alt="Brasão do Distrito Federal"
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "3px",
                    width: "46px",
                    height: "48px",
                    objectFit: "contain",
                  }}
                />
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "19.5px",
                      fontWeight: 400,
                      letterSpacing: "0.3px",
                      lineHeight: 1.15,
                    }}
                  >
                    {orgaoTitulo}
                  </div>
                  <div style={{ fontSize: "11px", marginTop: "3px" }}>
                    CNPJ: {cnpjOrgao}
                  </div>
                </div>
              </div>

              {/* Parte Inferior do Bloco 1: Folha de Frequência | REFERÊNCIA */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "2px 6px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "15.5px", fontWeight: 400 }}>
                  Folha de Frequência
                </div>
                <div style={{ fontSize: "11.5px", paddingRight: "28px" }}>
                  <span>REFERÊNCIA:</span>
                  <span style={{ marginLeft: "14px", fontWeight: 400 }}>
                    {referenciaFormatada}
                  </span>
                </div>
              </div>
            </div>

            {/* MICRO-ESPAÇO (4px) + BLOCO 2: Dados da Escola (UA/Exercício) e Dados do Servidor */}
            <div
              style={{
                width: "100%",
                border: "1px solid #000",
                marginTop: "4px",
                boxSizing: "border-box",
              }}
            >
              {/* Sub-bloco Escola: UA e Exercício */}
              <div
                style={{
                  padding: "4px 6px",
                  borderBottom: "1px solid #000",
                  fontSize: "11px",
                  lineHeight: 1.5,
                  boxSizing: "border-box",
                }}
              >
                <div>
                  <span style={{ display: "inline-block", width: "42px" }}>
                    UA:
                  </span>
                  <span style={{ display: "inline-block", width: "46px" }}>
                    {uaCodigo}
                  </span>
                  <span>{creNome}</span>
                </div>
                <div>
                  <span style={{ display: "inline-block", width: "70px" }}>
                    Exercício:
                  </span>
                  <span style={{ display: "inline-block", width: "120px" }}>
                    {codEstabelecimento}
                  </span>
                  <span>{nomeEstabelecimento}</span>
                </div>
              </div>

              {/* Sub-bloco Servidor: Matrícula, Nome, Cargo/Especialidade, C.H. e Função */}
              <div
                style={{
                  padding: "4px 6px",
                  fontSize: "11px",
                  lineHeight: 1.55,
                  boxSizing: "border-box",
                }}
              >
                <div>
                  <span>Matrícula:</span>
                  <span
                    style={{
                      marginLeft: "12px",
                      display: "inline-block",
                      width: "92px",
                    }}
                  >
                    {matriculaOficial}
                  </span>
                  <span>Nome: &nbsp;{nomeServidorUpper}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div>
                    <span>Cargo/Especialidade: </span>
                    <span>{cargoBase}</span>
                  </div>
                  <div style={{ paddingRight: "48px" }}>
                    <span>C.H. &nbsp;{chNumero}</span>
                  </div>
                </div>
                <div>
                  <span style={{ display: "inline-block", width: "68px" }}>
                    Função:
                  </span>
                  <span>{funcaoGratificadaServidor}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── CABEÇALHO MODELO 2: CONTRATO TEMPORÁRIO (EmitirFolha_contrato.pdf) ── */
          <div
            style={{
              width: "100%",
              border: "1px solid #000",
              boxSizing: "border-box",
            }}
          >
            {/* Faixa 1: Brasão Oficial GDF + Títulos */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: "1px solid #000",
                minHeight: "60px",
                padding: "4px 10px",
                boxSizing: "border-box",
              }}
            >
              <img
                src={brasaoDfImg}
                alt="Brasão do Distrito Federal"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "4px",
                  width: "48px",
                  height: "50px",
                  objectFit: "contain",
                }}
              />
              <div style={{ textAlign: "center", lineHeight: 1.25 }}>
                <div style={{ fontSize: "14.5px" }}>
                  {orgaoTitulo}
                </div>
                <div style={{ fontSize: "14px" }}>{creNome}</div>
                <div style={{ fontSize: "14.5px" }}>
                  FOLHA DE FREQUÊNCIA - CONTRATO TEMPORÁRIO
                </div>
              </div>
            </div>

            {/* Faixa 2: Código do Estabelecimento | Nome do Estabelecimento | Referência */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "22% 52% 26%",
                borderBottom: "1px solid #000",
                fontSize: "10px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{ padding: "3px 6px", borderRight: "1px solid #000" }}
              >
                <div style={{ fontSize: "9px" }}>Código do Estabelecimento</div>
                <div style={{ fontSize: "11px", marginTop: "2px" }}>
                  {codEstabelecimento}
                </div>
              </div>
              <div
                style={{ padding: "3px 6px", borderRight: "1px solid #000" }}
              >
                <div style={{ fontSize: "9px" }}>Nome do Estabelecimento</div>
                <div
                  style={{
                    fontSize: "10.5px",
                    marginTop: "2px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {nomeEstabelecimento}
                </div>
              </div>
              <div style={{ padding: "3px 6px" }}>
                <div style={{ fontSize: "9px" }}>Referência</div>
                <div style={{ fontSize: "11px", marginTop: "2px" }}>
                  {referenciaFormatada}
                </div>
              </div>
            </div>

            {/* Faixa 3: Matrícula/Inscrição | Nome */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "22% 78%",
                borderBottom: "1px solid #000",
                fontSize: "10px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{ padding: "3px 6px", borderRight: "1px solid #000" }}
              >
                <div style={{ fontSize: "9px" }}>Matrícula/Inscrição</div>
                <div style={{ fontSize: "11px", marginTop: "2px" }}>
                  {matriculaOficial}
                </div>
              </div>
              <div style={{ padding: "3px 6px" }}>
                <div style={{ fontSize: "9px" }}>Nome</div>
                <div style={{ fontSize: "11px", marginTop: "2px" }}>
                  {nomeServidorUpper}
                </div>
              </div>
            </div>

            {/* Faixa 4: CARGO e DISCIPLINA */}
            <div
              style={{
                padding: "4px 6px",
                fontSize: "10.5px",
                lineHeight: 1.45,
                boxSizing: "border-box",
              }}
            >
              <div>CARGO: &nbsp;&nbsp;&nbsp;{cargoBase}</div>
              <div>DISCIPLINA: &nbsp;{disciplinaExtr}</div>
            </div>
          </div>
        )}

        {/* ── MICRO-ESPAÇO (5px) + TABELA PRINCIPAL DOS 31 DIAS (100% ALINHADA HORIZONTALMENTE) ── */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: isTemporario ? "0px" : "5px",
            border: "1px solid #000",
            tableLayout: "fixed",
            boxSizing: "border-box",
          }}
        >
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            {/* Linha 1: TURNO: Matutino | TURNO: Vespertino */}
            <tr style={{ height: "21px" }}>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "2px",
                }}
              />
              <th
                colSpan={3}
                style={{
                  border: "1px solid #000",
                  textAlign: "left",
                  padding: "2px 10px",
                  fontWeight: 400,
                  fontSize: "11.5px",
                }}
              >
                <span style={{ fontSize: "13px" }}>T</span>
                <span style={{ fontSize: "9.5px", letterSpacing: "0.5px" }}>
                  URNO:{" "}
                </span>
                <span style={{ fontSize: "12px" }}>{turnosCabecalho.esq}</span>
              </th>
              <th
                colSpan={3}
                style={{
                  border: "1px solid #000",
                  textAlign: "left",
                  padding: "2px 10px",
                  fontWeight: 400,
                  fontSize: "11.5px",
                }}
              >
                <span style={{ fontSize: "13px" }}>T</span>
                <span style={{ fontSize: "9.5px", letterSpacing: "0.5px" }}>
                  URNO:{" "}
                </span>
                <span style={{ fontSize: "12px" }}>{turnosCabecalho.dir}</span>
              </th>
            </tr>

            {/* Linha 2: Dia | Assinatura do Servidor | Entrada | Saída ... */}
            <tr style={{ height: "20px", fontSize: "10px" }}>
              <th
                style={{
                  border: "1px solid #000",
                  fontWeight: 400,
                  textAlign: "center",
                }}
              >
                Dia
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  fontWeight: 400,
                  textAlign: "left",
                  paddingLeft: "14px",
                }}
              >
                Assinatura do Servidor
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  fontWeight: 400,
                  textAlign: "center",
                }}
              >
                Entrada
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  fontWeight: 400,
                  textAlign: "center",
                }}
              >
                Saída
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  fontWeight: 400,
                  textAlign: "left",
                  paddingLeft: "14px",
                }}
              >
                Assinatura do Servidor
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  fontWeight: 400,
                  textAlign: "center",
                }}
              >
                Entrada
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  fontWeight: 400,
                  textAlign: "center",
                }}
              >
                Saída
              </th>
            </tr>
          </thead>

          <tbody>
            {linhasDias.map((row) => {
              const bgCell = row.sombreado ? "#bfbfbf" : "#ffffff";
              return (
                <tr
                  key={row.dia}
                  onClick={() => {
                    if (onClicarDia && row.diaExisteNoMes) {
                      onClicarDia(row.dataISO, row.occDia);
                    }
                  }}
                  title={
                    row.diaExisteNoMes && onClicarDia
                      ? `Clique para lançar ou editar ocorrência no dia ${row.dia}/${String(
                          mesNum
                        ).padStart(2, "0")}`
                      : undefined
                  }
                  className={
                    row.diaExisteNoMes && onClicarDia
                      ? "cursor-pointer hover:brightness-95 transition"
                      : ""
                  }
                  style={{
                    height: "19.8px",
                    backgroundColor: bgCell,
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                    fontSize: "10px",
                  }}
                >
                  <td
                    style={{
                      border: "1px solid #000",
                      textAlign: "center",
                      fontSize: "10px",
                    }}
                  >
                    {row.dia}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      textAlign: "center",
                      fontSize: "9.5px",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {row.assinaturaEsq}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      textAlign: "center",
                      fontSize: "9.5px",
                    }}
                  >
                    {row.entradaEsq}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      textAlign: "center",
                      fontSize: "9.5px",
                    }}
                  >
                    {row.saidaEsq}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      textAlign: "center",
                      fontSize: "9.5px",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {row.assinaturaDir}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      textAlign: "center",
                      fontSize: "9.5px",
                    }}
                  >
                    {row.entradaDir}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      textAlign: "center",
                      fontSize: "9.5px",
                    }}
                  >
                    {row.saidaDir}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── RODAPÉ DA PÁGINA 1 (100% DA LARGURA DA TABELA) ── */}
        {!isTemporario ? (
          /* Efetivo: Caixa de Observações na Página 1 (100% alinhada com a tabela) */
          <div
            style={{
              width: "100%",
              border: "1px solid #000",
              marginTop: "5px",
              minHeight: "86px",
              padding: "5px 8px",
              fontSize: "11px",
              boxSizing: "border-box",
            }}
          >
            <div>Observações:</div>
            {textoObservacoesConsolidado && (
              <div
                style={{
                  fontSize: "9.5px",
                  marginTop: "4px",
                  lineHeight: 1.35,
                }}
              >
                {textoObservacoesConsolidado}
              </div>
            )}
          </div>
        ) : (
          /* Contrato Temporário: Tabela OCORRÊNCIA | CARGA I | CARGA II na Página 1 */
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "12px",
              border: "1px solid #000",
              fontSize: "10px",
              boxSizing: "border-box",
            }}
          >
            <thead>
              <tr style={{ height: "20px" }}>
                <th
                  style={{
                    border: "1px solid #000",
                    fontWeight: 400,
                    width: "32%",
                    textAlign: "center",
                  }}
                >
                  OCORRÊNCIA
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    fontWeight: 400,
                    width: "34%",
                    textAlign: "center",
                  }}
                >
                  CARGA I (Nº DE HORAS)
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    fontWeight: 400,
                    width: "34%",
                    textAlign: "center",
                  }}
                >
                  CARGA II (Nº DE HORAS)
                </th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((idx) => {
                const occ = ocorrenciasDoMes[idx];
                const m = occ ? mapearOcorrenciaParaFolhaSEEDF(occ) : null;
                return (
                  <tr key={idx} style={{ height: "20px" }}>
                    <td
                      style={{
                        border: "1px solid #000",
                        padding: "2px 6px",
                        fontSize: "9.5px",
                        textAlign: "left",
                      }}
                    >
                      {m ? m.descricaoCurta : ""}
                    </td>
                    <td
                      style={{
                        border: "1px solid #000",
                        textAlign: "center",
                        fontSize: "9.5px",
                      }}
                    >
                      {occ ? `${occ.dias || 1} dia(s)` : ""}
                    </td>
                    <td
                      style={{
                        border: "1px solid #000",
                        textAlign: "center",
                        fontSize: "9.5px",
                      }}
                    >
                      {occ && isJornadaDupla ? `${occ.dias || 1} dia(s)` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PÁGINA 2 — VERSO DA FOLHA DE FREQUÊNCIA (RESUMO / ASSINATURAS)
         ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="folha-seedf-page bg-white mx-auto shadow-md print:shadow-none"
        style={{
          width: "210mm",
          height: "296mm",
          maxHeight: "296mm",
          padding: "7mm 9mm",
          boxSizing: "border-box",
          pageBreakAfter: quebrarPaginaNoFinal ? "always" : "auto",
          breakAfter: quebrarPaginaNoFinal ? "page" : "auto",
          overflow: "hidden",
        }}
      >
        {/* Cabeçalho Compacto da Página 2 (Comum a Efetivo e Temporário) */}
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "95px 46px 46px 1fr",
            border: "1px solid #000",
            fontSize: "11px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ padding: "4px 6px", borderRight: "1px solid #000" }}>
            <div style={{ fontSize: "9.5px" }}>
              M<span style={{ fontSize: "8.5px" }}>ATRÍCULA</span>
            </div>
            <div style={{ fontWeight: 700, marginTop: "3px" }}>
              {matriculaOficial}
            </div>
          </div>
          <div
            style={{
              padding: "4px 4px",
              borderRight: "1px solid #000",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px" }}>UA</div>
            <div style={{ marginTop: "3px" }}>{uaCodigo}</div>
          </div>
          <div
            style={{
              padding: "4px 4px",
              borderRight: "1px solid #000",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px" }}>CH</div>
            <div style={{ marginTop: "3px" }}>{chNumero}</div>
          </div>
          <div style={{ padding: "4px 8px" }}>
            <div style={{ fontSize: "9.5px" }}>
              L <span style={{ fontSize: "8.5px" }}>ocal de E</span>xercício
            </div>
            <div style={{ marginTop: "3px", fontSize: "11px" }}>
              {nomeEstabelecimento}
            </div>
          </div>
        </div>

        {!isTemporario ? (
          /* ── PÁGINA 2 MODELO EFETIVO: RESUMO DA FREQUÊNCIA + TABELA DE CÓDIGOS ── */
          <>
            {/* Quadro RESUMO DA FREQUÊNCIA (Quadrículas SIGEP perfeitamente alinhadas na horizontal) */}
            <div
              style={{
                width: "100%",
                borderLeft: "1px solid #000",
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
                padding: "6px 10px 14px 10px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "10.5px", marginBottom: "14px" }}>
                RESUMO DA FREQUÊNCIA
              </div>

              <div style={{ paddingLeft: "34px", paddingRight: "22px" }}>
                {/* Títulos das Colunas de Quadrículas */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "9.5px",
                    marginBottom: "5px",
                  }}
                >
                  <span style={{ width: "26px" }}>Oper.</span>
                  <span style={{ width: "95px" }}>Código</span>
                  <span style={{ width: "30px" }}>Carga</span>
                  <span style={{ width: "46px" }}>Nº meses</span>
                  <span style={{ width: "95px" }}>Nº de horas/dias</span>
                  <span style={{ width: "44px" }}>Dia início</span>
                  <span style={{ width: "44px" }}>Dia fim</span>
                </div>

                {/* 6 Fileiras Horizontais de Quadrículas */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "7px",
                  }}
                >
                  {linhasResumoSigep.map((ln, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <QuadriculasSIGEP digitos={ln.oper} totalCaixas={1} />
                      <QuadriculasSIGEP digitos={ln.codigo} totalCaixas={5} />
                      <QuadriculasSIGEP digitos={ln.carga} totalCaixas={1} />
                      <QuadriculasSIGEP digitos={ln.meses} totalCaixas={2} />
                      <QuadriculasSIGEP
                        digitos={ln.horasDias}
                        totalCaixas={5}
                      />
                      <QuadriculasSIGEP
                        digitos={ln.diaInicio}
                        totalCaixas={2}
                      />
                      <QuadriculasSIGEP digitos={ln.diaFim} totalCaixas={2} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Micro-espaço + Quadro LEGENDA e TABELA DE CÓDIGOS */}
            <div
              style={{
                width: "100%",
                border: "1px solid #000",
                marginTop: "6px",
                padding: "6px 8px 8px 8px",
                fontSize: "10px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "9.5px", marginBottom: "6px" }}>
                LEGENDA:
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingRight: "80px",
                  marginBottom: "6px",
                  fontSize: "10.5px",
                }}
              >
                <span>Oper. &nbsp;(operação)</span>
                <span>I &nbsp;- &nbsp;Inclusão</span>
                <span>A &nbsp;- &nbsp;Alteração</span>
                <span>E &nbsp;- &nbsp;Exclusão</span>
              </div>

              <div style={{ fontSize: "10px", marginBottom: "5px" }}>
                Tabela de Códigos
              </div>

              {/* Tabela Interna de Códigos */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #000",
                  fontSize: "9.5px",
                  boxSizing: "border-box",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{ height: "20px", borderBottom: "1px solid #000" }}
                  >
                    <th
                      style={{
                        borderRight: "1px solid #000",
                        width: "42px",
                        fontWeight: 400,
                        textAlign: "left",
                        paddingLeft: "4px",
                      }}
                    >
                      Código
                    </th>
                    <th
                      style={{
                        borderRight: "1px solid #000",
                        width: "44%",
                        fontWeight: 400,
                        textAlign: "left",
                        paddingLeft: "6px",
                      }}
                    >
                      Descrição
                    </th>
                    <th
                      style={{
                        borderRight: "1px solid #000",
                        width: "42px",
                        fontWeight: 400,
                        textAlign: "left",
                        paddingLeft: "4px",
                      }}
                    >
                      Código
                    </th>
                    <th
                      style={{
                        fontWeight: 400,
                        textAlign: "left",
                        paddingLeft: "8px",
                      }}
                    >
                      Descrição
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        padding: "4px",
                        verticalAlign: "top",
                        lineHeight: 1.65,
                        textAlign: "left",
                      }}
                    >
                      <div>10264</div>
                      <div>10265</div>
                      <div>10270</div>
                      <div style={{ marginBottom: "9px" }}>10368</div>
                      <div style={{ marginBottom: "9px" }}>10384</div>
                      <div>10267</div>
                      <div>10268</div>
                      <div>10528</div>
                    </td>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        padding: "4px 6px",
                        verticalAlign: "top",
                        lineHeight: 1.38,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ marginBottom: "3px" }}>
                        Gratificação por exercício Zona Rural - GAZR (CPMDF)
                      </div>
                      <div style={{ marginBottom: "3px" }}>
                        Gratificação de Atividade de Ensino Especial - GAEE
                      </div>
                      <div style={{ marginBottom: "3px" }}>
                        Gratificação de Atividade Pedagógica - GAPED
                      </div>
                      <div style={{ marginBottom: "3px" }}>
                        Gratificação de Atividade de Docência em Estabelecimento
                        de Ensino Diferenciado – GADEED
                      </div>
                      <div style={{ marginBottom: "3px" }}>
                        Gratificação de Atividade de Docência em Estabelecimento
                        de Restrição de Liberdade – GADERL
                      </div>
                      <div style={{ marginBottom: "3px" }}>
                        Gratificação de Atividade de Ensino Especial – GAEE
                        (CAE)
                      </div>
                      <div style={{ marginBottom: "3px" }}>
                        Gratificação de Atividade Zona Rural - GAZR (CAE)
                      </div>
                      <div>
                        Gratificação de Atividade de Suporte Educacional – GASE
                      </div>
                    </td>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        padding: "4px",
                        verticalAlign: "top",
                        lineHeight: 1.8,
                        textAlign: "left",
                      }}
                    >
                      <div>118</div>
                      <div>219</div>
                      <div>256</div>
                      <div>18077</div>
                      <div>40010</div>
                      <div>40034</div>
                      <div>40046</div>
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        verticalAlign: "top",
                        lineHeight: 1.8,
                        textAlign: "left",
                      }}
                    >
                      <div>Exame Preventivo, LC 840/2011, art. 62</div>
                      <div>Abono de ponto anual</div>
                      <div>TRE</div>
                      <div>Adicional Noturno</div>
                      <div>Falta</div>
                      <div>Falta paralisação</div>
                      <div>Horas não trabalhadas</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingRight: "90px",
                  marginTop: "6px",
                }}
              >
                <span>Carga:</span>
                <span>1 &nbsp;- &nbsp;Carga I</span>
                <span>2 &nbsp;- &nbsp;Carga II</span>
                <span>3 &nbsp;- &nbsp;Ambas as cargas</span>
              </div>
              <div style={{ marginTop: "4px" }}>
                <span style={{ display: "inline-block", width: "115px" }}>
                  Nº de meses:
                </span>
                <span>Previsão do período a ser incluído.</span>
              </div>
            </div>
          </>
        ) : (
          /* ── PÁGINA 2 MODELO CONTRATO TEMPORÁRIO: QUADRO DE OBSERVAÇÕES ── */
          <div
            style={{
              width: "100%",
              border: "1px solid #000",
              marginTop: "8px",
              minHeight: "98px",
              padding: "4px 8px",
              fontSize: "9.5px",
              boxSizing: "border-box",
            }}
          >
            <div>Observações:</div>
            {textoObservacoesConsolidado && (
              <div style={{ marginTop: "6px", lineHeight: 1.4 }}>
                {textoObservacoesConsolidado}
              </div>
            )}
          </div>
        )}

        {/* ── QUADRO DE ASSINATURAS (3 CAIXAS LADO A LADO — COMUM AOS DOIS MODELOS) ── */}
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "6px",
            marginTop: "6px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              border: "1px solid #000",
              height: "84px",
              padding: "5px 8px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontSize: "10px",
              boxSizing: "border-box",
            }}
          >
            <div>Responsável pelas informações</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: "3px" }}>
                Assinatura / matrícula
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #000",
              height: "84px",
              padding: "5px 8px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontSize: "10px",
              boxSizing: "border-box",
            }}
          >
            <div>Assinatura da Chefia</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: "3px" }}>
                Assinatura / carimbo
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #000",
              height: "84px",
              padding: "5px 8px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontSize: "10px",
              boxSizing: "border-box",
            }}
          >
            <div>Assinatura do Superior</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: "3px" }}>
                Assinatura / carimbo
              </div>
            </div>
          </div>
        </div>

        {/* ── QUADRO MENSAGEM (APENAS NO MODELO EFETIVO) ── */}
        {!isTemporario && (
          <div
            style={{
              width: "100%",
              border: "1px solid #000",
              marginTop: "6px",
              height: "138px",
              padding: "6px 10px",
              fontSize: "11px",
              boxSizing: "border-box",
            }}
          >
            <div>MENSAGEM</div>
          </div>
        )}
      </div>
    </div>
  );
}
