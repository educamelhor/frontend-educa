// src/features/administrativo/MemorandoDevolucaoOficialSEEDF.jsx
// ============================================================================
// CLONE OFICIAL 1:1 DO MEMORANDO DE DEVOLUÇÃO DA SEEDF (GDF)
// Espelha fielmente o modelo oficial da Secretaria de Estado de Educação do DF
// ("Memo Dev KARLA.pdf"), com 3 blocos tabulares independentes, tipografia Arial,
// emblema oficial do Palácio do Buriti / GDF e 100% estilos inline para impressão A4.
// ============================================================================

import React from "react";
import brasaoDfImg from "./brasao-df.png";

const MESES_ABREV_SEEDF = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

// Formata 'YYYY-MM-DD' -> 'DD/MM/YYYY'
export function formatarDataBR(isoStr) {
  if (!isoStr) return "";
  const s = String(isoStr).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

// Formata 'Planaltina-DF' + '2026-11-03' -> 'Planaltina-DF, 03 de NOV de 2026.'
export function formatarLocalDataSEEDF(cidadeUf = "Planaltina-DF", dataIso = "") {
  const s = String(dataIso || new Date().toISOString().slice(0, 10))
    .trim()
    .slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    const mesIdx = Math.max(0, Math.min(11, Number(m) - 1));
    const mesAbrev = MESES_ABREV_SEEDF[mesIdx] || "NOV";
    return `${cidadeUf || "Planaltina-DF"}, ${d} de ${mesAbrev} de ${y}.`;
  }
  return `${cidadeUf || "Planaltina-DF"}, ${s}`;
}

// Emblema clássico P&B da Coluna do Buriti / Distrito Federal (idêntico ao Memo Dev KARLA.pdf)
function EmblemaBuritiSEEDF() {
  return (
    <svg
      width="56"
      height="60"
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* Silhueta da Coluna / Mastro Superior */}
      <path
        d="M49 4 L51 4 L54 44 C56 54 64 62 76 67 L24 67 C36 62 44 54 46 44 Z"
        fill="#111111"
      />
      {/* Círculo Central com Coluna de Brasília */}
      <circle
        cx="50"
        cy="72"
        r="14"
        fill="#ffffff"
        stroke="#111111"
        strokeWidth="2.5"
      />
      <path
        d="M39 67 L61 67 C56 71 56 74 61 78 L39 78 C44 74 44 71 39 67 Z"
        fill="#111111"
      />
      {/* Base Escalonada */}
      <rect x="26" y="88" width="48" height="3.2" fill="#111111" />
      <rect x="33" y="93" width="34" height="2.8" fill="#111111" />
      <text
        x="50"
        y="104"
        textAnchor="middle"
        fill="#111111"
        style={{
          fontSize: "7.2px",
          fontWeight: 700,
          fontFamily: "Arial, Helvetica, sans-serif",
          letterSpacing: "0.4px",
        }}
      >
        DISTRITO FEDERAL
      </text>
    </svg>
  );
}

export default function MemorandoDevolucaoOficialSEEDF({
  memorando = {},
  dadosUnidade = {},
}) {
  const numeroMemo =
    memorando.numero_memo !== undefined && String(memorando.numero_memo).trim()
      ? String(memorando.numero_memo).trim()
      : "SN/2026";

  const cidadeUf =
    memorando.cidade_uf ||
    dadosUnidade.memoCidadeUf ||
    dadosUnidade.cidadeUf ||
    "Planaltina-DF";

  const textoLocalData =
    memorando.local_data_custom && String(memorando.local_data_custom).trim()
      ? String(memorando.local_data_custom).trim()
      : formatarLocalDataSEEDF(cidadeUf, memorando.data_emissao);

  const nomeUnidadeEscolar =
    memorando.unidade_escolar ||
    dadosUnidade.memoUnidadeEscolar ||
    dadosUnidade.nomeEscolaExtensoMemo ||
    dadosUnidade.nomeEscola ||
    "Centro de Ensino Fundamental 04 de Planaltina - Colégio Cívico-Militar do Distrito Federal";

  const destinatario =
    memorando.destinatario ||
    dadosUnidade.memoDestinatario ||
    "UNIDADE REGIONAL DE GESTAO DE PESSOAS";

  const codigoUnidade =
    memorando.codigo_unidade ||
    dadosUnidade.memoCodigoUnidade ||
    dadosUnidade.codigoExercicio ||
    "990230000043";

  const nomeServidor = String(
    memorando.servidor_nome || ""
  )
    .trim()
    .toUpperCase();

  // Remove hífens na matrícula para ficar igual ao modelo SEEDF (ex: 70757690) se o usuário desejar, ou preserva o digitado
  const matriculaServidor = String(memorando.matricula || "").trim();
  const disciplinaServidor = String(memorando.disciplina || "")
    .trim()
    .toUpperCase();
  const serieServidor = String(memorando.serie || "").trim().toUpperCase();
  const cargoServidor = String(memorando.cargo || "PROF TEMP")
    .trim()
    .toUpperCase();

  const carga1 = memorando.carga_1 !== false;
  const carga2 = Boolean(memorando.carga_2);

  const dataAdmissaoBR = formatarDataBR(memorando.data_admissao);

  const turnoMat = Boolean(memorando.turno_mat);
  const turnoVesp = Boolean(memorando.turno_vesp);
  const turnoNot = Boolean(memorando.turno_not);

  const ultimoDiaBR = formatarDataBR(
    memorando.ultimo_dia_frequencia || memorando.data_emissao
  );

  const motivoDevolucao = String(
    memorando.motivo ||
      "CONTRATO TEMPORÁRIO (008) A PROFESSORA DESISTIU DA CARÊNCIA"
  ).trim();

  // Status de Abono: 'nao_usufruiu' | 'usufruiu' | 'nao_faz_jus' | 'nenhum'
  const abonoOpcao = memorando.abono_opcao || "nao_usufruiu";
  const diasAbono = String(memorando.dias_abono || "").trim();

  // Status de LTS: 'nao_usufruiu' | 'usufruiu' | 'nenhum'
  const ltsOpcao = memorando.lts_opcao || "nao_usufruiu";
  const diasLts = String(memorando.dias_lts || "").trim();

  // Status de T.R.E.: boolean
  const treUsufruiu = Boolean(memorando.tre_usufruiu);
  const diasTre = String(memorando.dias_tre || "").trim();

  const observacaoComplementar =
    memorando.observacao_complementar !== undefined
      ? String(memorando.observacao_complementar)
      : "A professora efetiva retornara as atividades.";

  // Usa exatamente o mesmo logo das folhas de ponto (brasao-df.png ou logo personalizado da unidade)
  const modoLogoCabecalho = dadosUnidade?.modoLogoCabecalho || "brasao_gdf";
  const srcLogoEsquerda =
    modoLogoCabecalho === "ocultar"
      ? null
      : modoLogoCabecalho === "personalizado" &&
        String(dadosUnidade?.logoEsquerdaDataUrl || "").trim()
      ? String(dadosUnidade.logoEsquerdaDataUrl).trim()
      : brasaoDfImg;

  return (
    <div
      className="memorando-seedf-wrapper"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000000",
      }}
    >
      <div
        className="memorando-seedf-page bg-white mx-auto shadow-md print:shadow-none"
        style={{
          width: "210mm",
          height: "296mm",
          maxHeight: "296mm",
          padding: "15mm 10mm",
          boxSizing: "border-box",
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            QUADRO 1 — CABEÇALHO DO MEMORANDO DE DEVOLUÇÃO
           ══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            width: "100%",
            border: "1px solid #000",
            boxSizing: "border-box",
          }}
        >
          {/* Topo: Brasão Oficial GDF à esquerda + Título Central + Linha MEMO nº / Data */}
          <div
            style={{
              position: "relative",
              minHeight: "94px",
              padding: "8px 8px 5px 10px",
              borderBottom: "1px solid #000",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            {/* Mesmo logo usado nas folhas de ponto no canto superior esquerdo */}
            {srcLogoEsquerda && (
              <img
                src={srcLogoEsquerda}
                alt="Brasão / Logo Institucional"
                style={{
                  position: "absolute",
                  left: "18px",
                  top: "6px",
                  width: "54px",
                  height: "54px",
                  objectFit: "contain",
                }}
              />
            )}

            {/* Título centralizado */}
            <div
              style={{
                textAlign: "center",
                fontSize: "14.5px",
                fontWeight: 700,
                marginTop: "14px",
                letterSpacing: "0.1px",
              }}
            >
              Memorando de Devolução
            </div>

            {/* Linha inferior: MEMO nº à esquerda e Cidade/Data à direita */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: "28px",
                fontSize: "12.5px",
                lineHeight: 1.2,
              }}
            >
              <div>
                <span>MEMO nº</span>
                <span style={{ marginLeft: "18px" }}>{numeroMemo}</span>
              </div>
              <div>{textoLocalData}</div>
            </div>
          </div>

          {/* Linha 2: Nome da Unidade Escolar */}
          <div
            style={{
              padding: "4px 6px",
              borderBottom: "1px solid #000",
              fontSize: "12.5px",
              lineHeight: 1.3,
              boxSizing: "border-box",
            }}
          >
            {nomeUnidadeEscolar}
          </div>

          {/* Linha 3: Destinatário (Ao/À) + Código da Unidade */}
          <div
            style={{
              display: "flex",
              width: "100%",
              fontSize: "12.5px",
              lineHeight: 1.3,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "76%",
                padding: "4px 6px",
                borderRight: "1px solid #000",
                boxSizing: "border-box",
              }}
            >
              Ao(À) {destinatario}
            </div>
            <div
              style={{
                width: "24%",
                padding: "4px 6px",
                boxSizing: "border-box",
              }}
            >
              Código: {codigoUnidade}
            </div>
          </div>
        </div>

        {/* Espaçamento entre Quadro 1 e Quadro 2 (fiel ao PDF da SEEDF) */}
        <div style={{ height: "11px" }} />

        {/* ══════════════════════════════════════════════════════════════════
            QUADRO 2 — IDENTIFICAÇÃO DO SERVIDOR E MOTIVO DA DEVOLUÇÃO
           ══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            width: "100%",
            border: "1px solid #000",
            boxSizing: "border-box",
          }}
        >
          {/* Linha 1: Nome */}
          <div
            style={{
              padding: "2px 6px 5px 6px",
              borderBottom: "1px solid #000",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: "9.5px", lineHeight: 1.1 }}>Nome</div>
            <div
              style={{
                fontSize: "13.5px",
                fontWeight: 700,
                paddingLeft: "40px",
                marginTop: "2px",
                minHeight: "17px",
              }}
            >
              {nomeServidor}
            </div>
          </div>

          {/* Linha 2: Matrícula | Disciplina | Série | Cargo */}
          <div
            style={{
              display: "flex",
              width: "100%",
              borderBottom: "1px solid #000",
              minHeight: "37px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "20%",
                padding: "2px 6px 5px 6px",
                borderRight: "1px solid #000",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "9.5px", lineHeight: 1.1 }}>
                Matrícula
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  paddingLeft: "16px",
                  marginTop: "3px",
                }}
              >
                {matriculaServidor}
              </div>
            </div>

            <div
              style={{
                width: "48%",
                padding: "2px 6px 5px 6px",
                borderRight: "1px solid #000",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "9.5px", lineHeight: 1.1 }}>
                Disciplina
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  paddingLeft: "4px",
                  marginTop: "3px",
                }}
              >
                {disciplinaServidor}
              </div>
            </div>

            <div
              style={{
                width: "10%",
                padding: "2px 6px 5px 6px",
                borderRight: "1px solid #000",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "9.5px", lineHeight: 1.1 }}>Série</div>
              <div
                style={{
                  fontSize: "12.5px",
                  paddingLeft: "4px",
                  marginTop: "3px",
                }}
              >
                {serieServidor}
              </div>
            </div>

            <div
              style={{
                width: "22%",
                padding: "2px 6px 5px 6px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: "9.5px",
                  lineHeight: 1.1,
                  paddingLeft: "4px",
                }}
              >
                Cargo
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  paddingLeft: "6px",
                  marginTop: "3px",
                }}
              >
                {cargoServidor}
              </div>
            </div>
          </div>

          {/* Linha 3: Carga | Data Admissão | Turno */}
          <div
            style={{
              display: "flex",
              width: "100%",
              borderBottom: "1px solid #000",
              minHeight: "37px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "33.5%",
                padding: "2px 6px 5px 6px",
                borderRight: "1px solid #000",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "9.5px", lineHeight: 1.1 }}>Carga</div>
              <div
                style={{
                  fontSize: "12.5px",
                  paddingLeft: "44px",
                  marginTop: "3px",
                  whiteSpace: "pre",
                }}
              >
                {`1 ( ${carga1 ? "X" : " "} )       2 (${carga2 ? "X" : " "})`}
              </div>
            </div>

            <div
              style={{
                width: "28.5%",
                padding: "2px 6px 5px 6px",
                borderRight: "1px solid #000",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: "9.5px",
                  lineHeight: 1.1,
                  paddingLeft: "22px",
                }}
              >
                Data Admissão
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  paddingLeft: "22px",
                  marginTop: "3px",
                }}
              >
                {dataAdmissaoBR}
              </div>
            </div>

            <div
              style={{
                width: "38%",
                padding: "2px 6px 5px 6px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: "9.5px",
                  lineHeight: 1.1,
                  paddingLeft: "6px",
                }}
              >
                Turno
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  paddingLeft: "26px",
                  marginTop: "3px",
                  whiteSpace: "pre",
                }}
              >
                {`Mat. (${turnoMat ? "X" : " "})    Vesp. (${
                  turnoVesp ? "X" : " "
                })   Not. ( ${turnoNot ? "X" : "  "} )`}
              </div>
            </div>
          </div>

          {/* Linha 4: Último dia de frequência + Motivo */}
          <div
            style={{
              padding: "8px 10px 10px 10px",
              fontSize: "12.5px",
              lineHeight: 1.5,
              boxSizing: "border-box",
            }}
          >
            <div>
              Informamos que o último dia de frequência nesta unidade foi{" "}
              {ultimoDiaBR}.
            </div>
            <div style={{ marginTop: "9px" }}>Motivo: {motivoDevolucao}</div>
          </div>
        </div>

        {/* Espaçamento entre Quadro 2 e Quadro 3 (fiel ao PDF da SEEDF) */}
        <div style={{ height: "11px" }} />

        {/* ══════════════════════════════════════════════════════════════════
            QUADRO 3 — INFORMAÇÕES COMPLEMENTARES (ABONO / LTS / TRE) E ASSINATURAS
           ══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            width: "100%",
            border: "1px solid #000",
            boxSizing: "border-box",
          }}
        >
          {/* Parte Superior: Declarações */}
          <div
            style={{
              padding: "6px 10px 10px 10px",
              borderBottom: "1px solid #000",
              fontSize: "12.5px",
              lineHeight: 1.5,
              boxSizing: "border-box",
            }}
          >
            <div>Informamos ainda que:</div>

            <div style={{ marginTop: "10px", whiteSpace: "pre" }}>
              {`(${
                abonoOpcao === "nao_usufruiu" ? " X" : "   "
              }) Não usufruiu abono.`}
            </div>
            <div style={{ marginTop: "8px", whiteSpace: "pre" }}>
              {`(${
                abonoOpcao === "usufruiu" ? " X" : "   "
              }) Usufruiu           (${
                abonoOpcao === "usufruiu" && diasAbono
                  ? diasAbono.padStart(6, " ").padEnd(13, " ")
                  : "                       "
              }) dia(s) de abono(s) - Lei Complementar 840/2011.`}
            </div>
            <div style={{ marginTop: "8px", whiteSpace: "pre" }}>
              {`(${
                abonoOpcao === "nao_faz_jus" ? " X" : "   "
              }) Não faz juz ao abono.`}
            </div>

            <div style={{ marginTop: "20px", whiteSpace: "pre" }}>
              {`(${
                ltsOpcao === "nao_usufruiu" ? " X" : "   "
              }) Não usufruiu LTS (Portaria n° 40 de 11/03/2011)`}
            </div>
            <div style={{ marginTop: "8px", whiteSpace: "pre" }}>
              {`(${
                ltsOpcao === "usufruiu" ? " X" : "   "
              }) Usufruiu           (${
                ltsOpcao === "usufruiu" && diasLts
                  ? diasLts.padStart(6, " ").padEnd(13, " ")
                  : "                       "
              }) dia(s) de LTS (Portaria n° 40 de 11/03/2011)`}
            </div>

            <div style={{ marginTop: "18px", whiteSpace: "pre" }}>
              {`(${
                treUsufruiu ? " X" : "   "
              }) Usufruiu           (${
                treUsufruiu && diasTre
                  ? diasTre.padStart(6, " ").padEnd(13, " ")
                  : "                       "
              }) dia(s) do T.R.E.`}
            </div>

            <div
              style={{
                marginTop: "12px",
                minHeight: "18px",
                whiteSpace: "pre-wrap",
              }}
            >
              {observacaoComplementar}
            </div>
          </div>

          {/* Parte Inferior: Assinatura do(a) Servidor(a) | Carimbo e Assinatura do(a) Diretor(a) */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "148px",
              boxSizing: "border-box",
            }}
          >
            {/* Coluna Esquerda */}
            <div
              style={{
                width: "50%",
                borderRight: "1px solid #000",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "12px 18px 34px 18px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "88%",
                  borderTop: "1px solid #000",
                  paddingTop: "6px",
                  textAlign: "center",
                  fontSize: "12.5px",
                }}
              >
                Assinatura do(a) Servidor(a)
              </div>
            </div>

            {/* Coluna Direita */}
            <div
              style={{
                width: "50%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "12px 18px 34px 18px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "88%",
                  borderTop: "1px solid #000",
                  paddingTop: "6px",
                  textAlign: "center",
                  fontSize: "12.5px",
                }}
              >
                Carimbo e Assinatura do(a) Diretor(a)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
