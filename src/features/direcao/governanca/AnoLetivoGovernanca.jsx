// src/features/direcao/governanca/AnoLetivoGovernanca.jsx
// ============================================================================
// GOVERNANÇA — Categoria ANO LETIVO
// Gestão Autônoma por Bimestres (1º ao 4º) e por Semestres (1º e 2º)
// Inclui Calendário Interativo (Dom–Sáb), Sábados Letivos e Dias Não Letivos
// com Modal Premium de Justificativa e Contador Dinâmico de Dias Letivos.
// ============================================================================
import React, { useState, useMemo } from "react";

const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_LONGO = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

// Converte string 'YYYY-MM-DD' para objeto Date seguro (meio-dia local)
function parseDateSafe(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return null;
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// Formata 'YYYY-MM-DD' para 'DD/MM/AAAA'
function formatDateBr(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return "—";
  const [y, m, d] = String(dateStr).split("-");
  return `${d}/${m}/${y}`;
}

// Formata objeto Date para 'YYYY-MM-DD'
function toIsoDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Calcula estatísticas completas de dias letivos para um período [data_inicio, data_fim]
export function calcularEstatisticasPeriodo(dataInicioStr, dataFimStr, excecoesList = []) {
  const dtIni = parseDateSafe(dataInicioStr);
  const dtFim = parseDateSafe(dataFimStr);
  if (!dtIni || !dtFim || dtIni > dtFim) {
    return {
      configurado: false,
      totalDiasLetivos: 0,
      diasUteisPadrao: 0,
      sabadosLetivos: 0,
      diasUteisDesmarcados: 0,
      totalDiasCorridos: 0,
    };
  }

  // Mapa de exceções por data 'YYYY-MM-DD'
  const mapExc = {};
  for (const exc of excecoesList) {
    if (exc && exc.data) {
      mapExc[exc.data] = exc;
    }
  }

  let totalDiasLetivos = 0;
  let diasUteisPadrao = 0;
  let sabadosLetivos = 0;
  let diasUteisDesmarcados = 0;
  let totalDiasCorridos = 0;

  const cursor = new Date(dtIni.getTime());
  while (cursor <= dtFim) {
    totalDiasCorridos++;
    const iso = toIsoDate(cursor);
    const dow = cursor.getDay(); // 0 = Dom, 1..5 = Seg..Sex, 6 = Sáb
    const exc = mapExc[iso];

    if (dow >= 1 && dow <= 5) {
      diasUteisPadrao++;
      if (exc && Number(exc.status_letivo) === 0) {
        diasUteisDesmarcados++;
      } else {
        totalDiasLetivos++;
      }
    } else if (dow === 6) {
      if (exc && Number(exc.status_letivo) === 1) {
        sabadosLetivos++;
        totalDiasLetivos++;
      }
    }
    // Domingo (dow === 0) nunca é letivo
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    configurado: true,
    totalDiasLetivos,
    diasUteisPadrao,
    sabadosLetivos,
    diasUteisDesmarcados,
    totalDiasCorridos,
  };
}

// Gera lista de meses ({ year, month }) entre dataInicio e dataFim
function gerarMesesDoIntervalo(dataInicioStr, dataFimStr) {
  const dtIni = parseDateSafe(dataInicioStr);
  const dtFim = parseDateSafe(dataFimStr);
  if (!dtIni || !dtFim || dtIni > dtFim) return [];

  const meses = [];
  let y = dtIni.getFullYear();
  let m = dtIni.getMonth(); // 0..11
  const endY = dtFim.getFullYear();
  const endM = dtFim.getMonth();

  while (y < endY || (y === endY && m <= endM)) {
    meses.push({ year: y, month: m });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
    if (meses.length > 24) break; // trava de segurança
  }
  return meses;
}

// ============================================================================
// COMPONENTE PRINCIPAL DA CATEGORIA ANO LETIVO
// ============================================================================
export default function AnoLetivoGovernanca({
  apiBase,
  escolaId,
  token,
  perfil,
  anoLetivo,
  setAnoLetivo,
  periodos,
  excecoes,
  onRefreshState,
  showToast,
}) {
  // Modal de edição de datas (Início e Fim) de um Bimestre ou Semestre
  const [modalEditarPeriodo, setModalEditarPeriodo] = useState(null);
  // { tipo: 'bimestre'|'semestre', numero: 1..4, data_inicio: '', data_fim: '' }

  // Modal de visualização do Calendário Interativo (Olhinho)
  const [modalCalendario, setModalCalendario] = useState(null);
  // { tipo: 'bimestre'|'semestre', numero: 1..4 }

  const getPeriodoObj = (tipo, numero) =>
    (periodos || []).find((p) => p.tipo === tipo && Number(p.numero) === Number(numero)) || null;

  const getExcecoesPeriodo = (tipo, numero) =>
    (excecoes || []).filter((e) => e.tipo === tipo && Number(e.numero) === Number(numero));

  // Cálculo acumulado dos 4 Bimestres
  const resumoBimestres = useMemo(() => {
    let totalDias = 0;
    let configurados = 0;
    let totalSabados = 0;
    let totalDesmarcados = 0;
    for (let b = 1; b <= 4; b++) {
      const p = (periodos || []).find((x) => x.tipo === "bimestre" && Number(x.numero) === b);
      const excs = (excecoes || []).filter((e) => e.tipo === "bimestre" && Number(e.numero) === b);
      if (p?.data_inicio && p?.data_fim) {
        const st = calcularEstatisticasPeriodo(p.data_inicio, p.data_fim, excs);
        if (st.configurado) {
          configurados++;
          totalDias += st.totalDiasLetivos;
          totalSabados += st.sabadosLetivos;
          totalDesmarcados += st.diasUteisDesmarcados;
        }
      }
    }
    return { totalDias, configurados, totalSabados, totalDesmarcados };
  }, [periodos, excecoes]);

  // Cálculo acumulado dos 2 Semestres
  const resumoSemestres = useMemo(() => {
    let totalDias = 0;
    let configurados = 0;
    let totalSabados = 0;
    let totalDesmarcados = 0;
    for (let s = 1; s <= 2; s++) {
      const p = (periodos || []).find((x) => x.tipo === "semestre" && Number(x.numero) === s);
      const excs = (excecoes || []).filter((e) => e.tipo === "semestre" && Number(e.numero) === s);
      if (p?.data_inicio && p?.data_fim) {
        const st = calcularEstatisticasPeriodo(p.data_inicio, p.data_fim, excs);
        if (st.configurado) {
          configurados++;
          totalDias += st.totalDiasLetivos;
          totalSabados += st.sabadosLetivos;
          totalDesmarcados += st.diasUteisDesmarcados;
        }
      }
    }
    return { totalDias, configurados, totalSabados, totalDesmarcados };
  }, [periodos, excecoes]);

  const anoAtualSistema = new Date().getFullYear();
  const opcoesAnos = [anoAtualSistema - 1, anoAtualSistema, anoAtualSistema + 1];

  return (
    <div style={{ padding: "4px 0 8px" }}>
      {/* Barra Superior de Contexto do Ano Letivo */}
      <div style={{
        margin: "12px 20px 8px",
        padding: "14px 18px",
        borderRadius: 12,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 19,
            boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)",
          }}>
            🗓️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: "-0.2px" }}>
              Autonomia de Calendário Escolar &amp; Controle de Dias Letivos
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              Configure os períodos da sua unidade escolar e clique no ícone <strong>👁️ Olhinho</strong> para gerenciar sábados letivos e feriados/recessos.
            </div>
          </div>
        </div>

        {/* Seletor de Ano Letivo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>Ano de Referência:</span>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.08)", padding: 4, borderRadius: 10 }}>
            {opcoesAnos.map((anoOpt) => {
              const ativo = Number(anoLetivo) === anoOpt;
              return (
                <button
                  key={anoOpt}
                  type="button"
                  onClick={() => setAnoLetivo(anoOpt)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: "none",
                    background: ativo ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
                    color: ativo ? "#fff" : "#cbd5e1",
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {anoOpt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          CONTAINER 1: ORGANIZAÇÃO POR BIMESTRES (4 BADGES)
      ===================================================================== */}
      <div style={{
        margin: "14px 20px 18px",
        padding: "20px",
        borderRadius: "14px",
        background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
        border: "1.5px solid #bfdbfe",
        boxShadow: "0 4px 14px rgba(59, 130, 246, 0.08)",
      }}>
        {/* Header do Container Bimestral */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
              boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)",
            }}>
              📊
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#1e1b4b" }}>
                  Organização por Bimestres (Ensino Regular)
                </span>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  padding: "3px 9px",
                  borderRadius: 20,
                  background: "#dbeafe",
                  color: "#1e40af",
                }}>
                  4 Bimestres
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>
                Defina o início e o término de cada um dos 4 bimestres letivos de {anoLetivo} e acompanhe a contagem oficial de dias letivos.
              </div>
            </div>
          </div>

          {/* Card de Soma Acumulada dos 4 Bimestres */}
          <div style={{
            background: "#fff",
            border: "1.5px solid #bfdbfe",
            borderRadius: 12,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 2px 6px rgba(37, 99, 235, 0.06)",
          }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Total Acumulado (Bimestres)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
                <span style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: resumoBimestres.totalDias >= 200 ? "#059669" : "#1d4ed8",
                }}>
                  {resumoBimestres.totalDias}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  / 200 dias letivos
                </span>
              </div>
            </div>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: resumoBimestres.totalDias >= 200 ? "#d1fae5" : "#eff6ff",
              color: resumoBimestres.totalDias >= 200 ? "#047857" : "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 11.5,
            }}>
              {Math.min(100, Math.round((resumoBimestres.totalDias / 200) * 100))}%
            </div>
          </div>
        </div>

        {/* Alerta Informativo */}
        <div style={{
          padding: "10px 14px",
          borderRadius: "10px",
          backgroundColor: "#dbeafe",
          borderLeft: "4px solid #2563eb",
          color: "#1e3a8a",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>💡</span>
            <span>
              Após definir o início e o término de um bimestre, clique no ícone <strong>👁️ Olhinho</strong> no card para abrir o calendário interativo, incluir <strong>sábados letivos</strong> ou desmarcar <strong>feriados/recessos</strong>.
            </span>
          </div>
          {(resumoBimestres.totalSabados > 0 || resumoBimestres.totalDesmarcados > 0) && (
            <div style={{ display: "flex", gap: 8, fontSize: 11, fontWeight: 700 }}>
              {resumoBimestres.totalSabados > 0 && (
                <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 12 }}>
                  +{resumoBimestres.totalSabados} sáb. letivo(s)
                </span>
              )}
              {resumoBimestres.totalDesmarcados > 0 && (
                <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 12 }}>
                  -{resumoBimestres.totalDesmarcados} não letivo(s)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Grid com os 4 Badges de Bimestres */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))",
          gap: 14,
        }}>
          {[1, 2, 3, 4].map((bim) => {
            const pObj = getPeriodoObj("bimestre", bim);
            const excs = getExcecoesPeriodo("bimestre", bim);
            const stats = calcularEstatisticasPeriodo(pObj?.data_inicio, pObj?.data_fim, excs);

            return (
              <PeriodoBadgeCard
                key={`bim-${bim}`}
                titulo={`${bim}º Bimestre`}
                subtitulo={`Bimestre ${bim} de ${anoLetivo}`}
                corTema="#2563eb"
                corBgAtivo="linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)"
                periodo={pObj}
                stats={stats}
                onOpenEdit={() =>
                  setModalEditarPeriodo({
                    tipo: "bimestre",
                    numero: bim,
                    titulo: `${bim}º Bimestre (${anoLetivo})`,
                    data_inicio: pObj?.data_inicio || "",
                    data_fim: pObj?.data_fim || "",
                  })
                }
                onOpenCalendar={() =>
                  setModalCalendario({
                    tipo: "bimestre",
                    numero: bim,
                    titulo: `${bim}º Bimestre — Ano Letivo ${anoLetivo}`,
                  })
                }
              />
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          CONTAINER 2: ORGANIZAÇÃO POR SEMESTRES (2 BADGES)
      ===================================================================== */}
      <div style={{
        margin: "0 20px 20px",
        padding: "20px",
        borderRadius: "14px",
        background: "linear-gradient(135deg, #f8fafc 0%, #ecfdf5 100%)",
        border: "1.5px solid #a7f3d0",
        boxShadow: "0 4px 14px rgba(16, 185, 129, 0.08)",
      }}>
        {/* Header do Container Semestral */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
              boxShadow: "0 4px 10px rgba(5, 150, 105, 0.25)",
            }}>
              🏛️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#064e3b" }}>
                  Organização por Semestres (EJA / Semestral)
                </span>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  padding: "3px 9px",
                  borderRadius: 20,
                  background: "#d1fae5",
                  color: "#065f46",
                }}>
                  2 Semestres Independentes
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>
                Configuração autônoma organizada em 2 semestres letivos, com calendário próprio e controle individual de sábados e recessos.
              </div>
            </div>
          </div>

          {/* Card de Soma Acumulada dos 2 Semestres */}
          <div style={{
            background: "#fff",
            border: "1.5px solid #a7f3d0",
            borderRadius: 12,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 2px 6px rgba(5, 150, 105, 0.06)",
          }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Total Acumulado (Semestres)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
                <span style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#059669",
                }}>
                  {resumoSemestres.totalDias}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  dias letivos
                </span>
              </div>
            </div>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "#d1fae5",
              color: "#047857",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 11.5,
            }}>
              {resumoSemestres.configurados}/2
            </div>
          </div>
        </div>

        {/* Grid com os 2 Badges de Semestres */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 14,
        }}>
          {[1, 2].map((sem) => {
            const pObj = getPeriodoObj("semestre", sem);
            const excs = getExcecoesPeriodo("semestre", sem);
            const stats = calcularEstatisticasPeriodo(pObj?.data_inicio, pObj?.data_fim, excs);

            return (
              <PeriodoBadgeCard
                key={`sem-${sem}`}
                titulo={`${sem}º Semestre`}
                subtitulo={`Semestre ${sem} de ${anoLetivo}`}
                corTema="#059669"
                corBgAtivo="linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)"
                periodo={pObj}
                stats={stats}
                onOpenEdit={() =>
                  setModalEditarPeriodo({
                    tipo: "semestre",
                    numero: sem,
                    titulo: `${sem}º Semestre (${anoLetivo})`,
                    data_inicio: pObj?.data_inicio || "",
                    data_fim: pObj?.data_fim || "",
                  })
                }
                onOpenCalendar={() =>
                  setModalCalendario({
                    tipo: "semestre",
                    numero: sem,
                    titulo: `${sem}º Semestre — Ano Letivo ${anoLetivo}`,
                  })
                }
              />
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: CONFIGURAR / EDITAR DATAS DE INÍCIO E TÉRMINO
      ===================================================================== */}
      {modalEditarPeriodo && (
        <ModalConfigurarDatasPeriodo
          modalData={modalEditarPeriodo}
          anoLetivo={anoLetivo}
          escolaId={escolaId}
          token={token}
          perfil={perfil}
          apiBase={apiBase}
          excecoesAtuais={getExcecoesPeriodo(modalEditarPeriodo.tipo, modalEditarPeriodo.numero)}
          onClose={() => setModalEditarPeriodo(null)}
          onSaved={(newState, msg) => {
            onRefreshState(newState);
            setModalEditarPeriodo(null);
            showToast(msg || "Período salvo com sucesso!", "success");
          }}
        />
      )}

      {/* =====================================================================
          MODAL 2: CALENDÁRIO INTERATIVO (OLHINHO) + MODAL DE JUSTIFICATIVA
      ===================================================================== */}
      {modalCalendario && (
        <ModalCalendarioInterativo
          modalInfo={modalCalendario}
          anoLetivo={anoLetivo}
          escolaId={escolaId}
          token={token}
          perfil={perfil}
          apiBase={apiBase}
          periodo={getPeriodoObj(modalCalendario.tipo, modalCalendario.numero)}
          excecoes={getExcecoesPeriodo(modalCalendario.tipo, modalCalendario.numero)}
          onClose={() => setModalCalendario(null)}
          onEditDates={() => {
            const pObj = getPeriodoObj(modalCalendario.tipo, modalCalendario.numero);
            const info = { ...modalCalendario };
            setModalCalendario(null);
            setModalEditarPeriodo({
              tipo: info.tipo,
              numero: info.numero,
              titulo: info.titulo,
              data_inicio: pObj?.data_inicio || "",
              data_fim: pObj?.data_fim || "",
            });
          }}
          onStateUpdated={(newState, msg) => {
            onRefreshState(newState);
            if (msg) showToast(msg, "success");
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE: CARD / BADGE DE CADA BIMESTRE OU SEMESTRE
// ============================================================================
function PeriodoBadgeCard({
  titulo,
  corTema,
  corBgAtivo,
  periodo,
  stats,
  onOpenEdit,
  onOpenCalendar,
}) {
  const isConfigurado = Boolean(periodo?.data_inicio && periodo?.data_fim && stats?.configurado);

  return (
    <div
      style={{
        background: isConfigurado ? corBgAtivo : "#ffffff",
        border: isConfigurado ? `1.5px solid #10b981` : "1.5px dashed #cbd5e1",
        borderRadius: "14px",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
        boxShadow: isConfigurado
          ? "0 4px 12px rgba(16, 185, 129, 0.08)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "all 0.2s ease",
        position: "relative",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      {/* Topo do Card: Título + Ícone Olhinho + Botão Editar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isConfigurado ? "#10b981" : "#cbd5e1",
              boxShadow: isConfigurado ? "0 0 8px rgba(16, 185, 129, 0.6)" : "none",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span style={{
            fontWeight: 800,
            fontSize: 14.5,
            color: "#1e293b",
            whiteSpace: "nowrap",
          }}>
            {titulo}
          </span>
        </div>

        {/* Ações: Olhinho (se configurado) + Botão Configurar/Editar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isConfigurado && (
            <button
              type="button"
              onClick={onOpenCalendar}
              title="Visualizar Calendário Letivo, Sábados Letivos e Feriados"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: "1.5px solid #10b981",
                background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                color: "#047857",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.22)",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              {/* Ícone Olhinho SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenEdit}
            title={isConfigurado ? "Editar datas de início e término" : "Configurar datas de início e término"}
            style={{
              height: 32,
              padding: "0 10px",
              borderRadius: 9,
              border: isConfigurado ? "1px solid #e2e8f0" : `1px solid ${corTema}`,
              background: isConfigurado ? "#f8fafc" : corTema,
              color: isConfigurado ? "#334155" : "#ffffff",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            <span>✏️</span>
            <span>{isConfigurado ? "Editar" : "Configurar"}</span>
          </button>
        </div>
      </div>

      {/* Meio do Card: Intervalo de Datas */}
      {isConfigurado ? (
        <div
          onClick={onOpenCalendar}
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            border: "1px solid #d1fae5",
            borderRadius: 10,
            padding: "9px 11px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
          title="Clique para abrir o calendário deste período"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>🟢 Início:</span>
            <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: 12.5 }}>
              {formatDateBr(periodo.data_inicio)}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>🏁 Término:</span>
            <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: 12.5 }}>
              {formatDateBr(periodo.data_fim)}
            </strong>
          </div>
        </div>
      ) : (
        <div
          onClick={onOpenEdit}
          style={{
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: 10,
            padding: "12px 10px",
            textAlign: "center",
            cursor: "pointer",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          📅 Clique em <strong>Configurar</strong> para definir Início e Término
        </div>
      )}

      {/* Rodapé do Card: Badge Contador de Dias Letivos */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        {isConfigurado ? (
          <>
            <div
              onClick={onOpenCalendar}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                padding: "5px 11px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)",
              }}
              title="Quantidade oficial de dias letivos contabilizados neste período"
            >
              <span>🗓️</span>
              <span>
                {stats.totalDiasLetivos} {stats.totalDiasLetivos === 1 ? "dia letivo" : "dias letivos"}
              </span>
            </div>

            {/* Indicadores extras de sábados ou dias desmarcados */}
            <div style={{ display: "flex", gap: 4 }}>
              {stats.sabadosLetivos > 0 && (
                <span
                  title={`${stats.sabadosLetivos} sábado(s) marcado(s) como letivo(s)`}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    background: "#dcfce7",
                    color: "#15803d",
                    padding: "3px 7px",
                    borderRadius: 10,
                    border: "1px solid #86efac",
                  }}
                >
                  +{stats.sabadosLetivos} sáb.
                </span>
              )}
              {stats.diasUteisDesmarcados > 0 && (
                <span
                  title={`${stats.diasUteisDesmarcados} dia(s) útil(eis) desmarcado(s) (feriados/recessos)`}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    background: "#fef2f2",
                    color: "#b91c1c",
                    padding: "3px 7px",
                    borderRadius: 10,
                    border: "1px solid #fecaca",
                  }}
                >
                  -{stats.diasUteisDesmarcados} fer./rec.
                </span>
              )}
            </div>
          </>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              color: "#94a3b8",
              background: "#f1f5f9",
              padding: "4px 10px",
              borderRadius: 20,
            }}
          >
            ⏳ 0 dias letivos (não definido)
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 1: CONFIGURAR / EDITAR DATAS DE INÍCIO E TÉRMINO DO PERÍODO
// ============================================================================
function ModalConfigurarDatasPeriodo({
  modalData,
  anoLetivo,
  escolaId,
  token,
  perfil,
  apiBase,
  excecoesAtuais,
  onClose,
  onSaved,
}) {
  const [dataInicio, setDataInicio] = useState(modalData.data_inicio || `${anoLetivo}-02-01`);
  const [dataFim, setDataFim] = useState(modalData.data_fim || `${anoLetivo}-04-30`);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const previewStats = useMemo(
    () => calcularEstatisticasPeriodo(dataInicio, dataFim, excecoesAtuais),
    [dataInicio, dataFim, excecoesAtuais]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (!dataInicio || !dataFim) {
      setErro("Informe a Data de Início e a Data de Término.");
      return;
    }
    if (dataInicio > dataFim) {
      setErro("A Data de Início não pode ser maior que a Data de Término.");
      return;
    }

    const nomeUsuario =
      localStorage.getItem("userName") ||
      localStorage.getItem("usuario_nome") ||
      localStorage.getItem("nome_usuario") ||
      localStorage.getItem("nome") ||
      "Diretor(a)";

    try {
      setSaving(true);
      const res = await fetch(`${apiBase}/api/governanca/ano-letivo-periodo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-escola-id": escolaId,
          "x-perfil": perfil,
        },
        body: JSON.stringify({
          escola_id: escolaId,
          ano_letivo: anoLetivo,
          tipo: modalData.tipo,
          numero: modalData.numero,
          data_inicio: dataInicio,
          data_fim: dataFim,
          usuario_nome: nomeUsuario,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onSaved({ periodos: data.periodos || [], excecoes: data.excecoes || [] }, data.message);
      } else {
        setErro(data.message || "Não foi possível salvar o período.");
      }
    } catch {
      setErro("Erro de conexão com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.72)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10050,
      padding: 16,
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: 22,
        width: "100%",
        maxWidth: 480,
        padding: "28px",
        color: "#fff",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(16, 185, 129, 0.5)",
        animation: "scaleIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
            }}>
              📅
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "#6ee7b7" }}>
                Configuração de Período Letivo
              </div>
              <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#fff" }}>
                {modalData.titulo}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#cbd5e1",
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            &times;
          </button>
        </div>

        {erro && (
          <div style={{
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid #ef4444",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12.5,
            color: "#fca5a5",
            fontWeight: 600,
            marginBottom: 16,
          }}>
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                🟢 Data de Início:
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                  colorScheme: "dark",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                🏁 Data de Término:
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {/* Card de Pré-visualização de Dias Letivos */}
          <div style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 22,
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6ee7b7", marginBottom: 8 }}>
              ✨ Pré-visualização Automática do Período:
            </div>
            {previewStats.configurado ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
                    {previewStats.totalDiasLetivos} dias letivos
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                    Seg–Sex: {previewStats.diasUteisPadrao} | Sáb. incluídos: +{previewStats.sabadosLetivos} | Desmarcados: -{previewStats.diasUteisDesmarcados}
                  </div>
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#d1fae5",
                  background: "rgba(16, 185, 129, 0.25)",
                  padding: "6px 10px",
                  borderRadius: 8,
                }}>
                  👁️ Olhinho será habilitado
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "#fca5a5" }}>
                Selecione um intervalo válido (Início &le; Término) para calcular os dias letivos.
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#cbd5e1",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !previewStats.configurado}
              style={{
                flex: 1.5,
                padding: "12px",
                borderRadius: 12,
                border: "none",
                background: previewStats.configurado
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "#475569",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13.5,
                cursor: saving || !previewStats.configurado ? "not-allowed" : "pointer",
                boxShadow: previewStats.configurado ? "0 6px 18px rgba(16, 185, 129, 0.35)" : "none",
              }}
            >
              {saving ? "Salvando..." : "💾 Salvar Período Letivo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 2: CALENDÁRIO INTERATIVO DO BIMESTRE / SEMESTRE (ÍCONE OLHINHO)
// ============================================================================
function ModalCalendarioInterativo({
  modalInfo,
  anoLetivo,
  escolaId,
  token,
  perfil,
  apiBase,
  periodo,
  excecoes,
  onClose,
  onEditDates,
  onStateUpdated,
}) {
  // Sub-modal de Justificativa quando o Diretor clica num Sábado ou num Dia Letivo
  const [modalJustificativa, setModalJustificativa] = useState(null);
  // { dataIso: 'YYYY-MM-DD', dow: 0..6, modo: 'incluir_sabado'|'desmarcar_letivo'|'gerenciar_desmarcado', motivoAtual: '' }

  if (!periodo || !periodo.data_inicio || !periodo.data_fim) {
    return null;
  }

  const meses = useMemo(
    () => gerarMesesDoIntervalo(periodo.data_inicio, periodo.data_fim),
    [periodo.data_inicio, periodo.data_fim]
  );

  const stats = useMemo(
    () => calcularEstatisticasPeriodo(periodo.data_inicio, periodo.data_fim, excecoes),
    [periodo.data_inicio, periodo.data_fim, excecoes]
  );

  const mapExcecoes = useMemo(() => {
    const m = {};
    for (const e of excecoes || []) {
      if (e?.data) m[e.data] = e;
    }
    return m;
  }, [excecoes]);

  // Handler de clique num quadradinho de dia do calendário
  const handleDayClick = (isoDate, dow, dentroDoIntervalo) => {
    if (!dentroDoIntervalo) return;

    // Regra 5.5: Domingo nunca pode ser marcado como letivo
    if (dow === 0) return;

    const excExistente = mapExcecoes[isoDate];

    if (dow === 6) {
      // É SÁBADO
      const isAtualmenteLetivo = excExistente && Number(excExistente.status_letivo) === 1;
      if (!isAtualmenteLetivo) {
        // Sábado padrão (não letivo) -> Diretor quer marcar como Sábado Letivo (Verde)
        setModalJustificativa({
          dataIso: isoDate,
          dow,
          modo: "incluir_sabado",
          tituloModal: "Marcar Sábado como Dia Letivo",
          subtituloModal: "Descreva a atividade extra ou reposição que justifica este sábado como dia letivo.",
          motivoAtual: "",
        });
      } else {
        // Sábado que já estava verde -> Diretor clicou para desmarcá-lo (ou editar motivo)
        setModalJustificativa({
          dataIso: isoDate,
          dow,
          modo: "desmarcar_sabado_letivo",
          tituloModal: "Desmarcar Sábado Letivo",
          subtituloModal: "Este sábado estava marcado como letivo. Informe o motivo para desmarcá-lo (ou atualize sua justificativa).",
          motivoAtual: excExistente.motivo || "",
        });
      }
    } else {
      // É SEGUNDA A SEXTA (Dia útil)
      const foiDesmarcado = excExistente && Number(excExistente.status_letivo) === 0;
      if (!foiDesmarcado) {
        // Dia útil atualmente VERDE (letivo) -> Diretor clicou para desmarcar (Item 5.6)
        setModalJustificativa({
          dataIso: isoDate,
          dow,
          modo: "desmarcar_dia_util",
          tituloModal: "Desmarcar Dia Letivo",
          subtituloModal: "Informe a justificativa (feriado, recesso, ponto facultativo, etc.) para que este dia deixe de ser contabilizado como letivo.",
          motivoAtual: "",
        });
      } else {
        // Dia útil que havia sido desmarcado -> Diretor pode restaurar como letivo (verde) ou editar justificativa
        setModalJustificativa({
          dataIso: isoDate,
          dow,
          modo: "gerenciar_dia_desmarcado",
          tituloModal: "Dia Não Letivo (Justificado)",
          subtituloModal: "Você pode restaurar este dia útil como Dia Letivo (verde) ou atualizar a justificativa registrada.",
          motivoAtual: excExistente.motivo || "",
        });
      }
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.78)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10050,
      padding: 16,
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: 22,
        width: "96%",
        maxWidth: 1040,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5)",
        animation: "scaleIn 0.2s ease",
      }}>
        {/* ── HEADER PREMIUM ESCURO DO CALENDÁRIO ── */}
        <div style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          padding: "20px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
            }}>
              🗓️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: "#6ee7b7",
                }}>
                  Calendário Interativo Oficial
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.1)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  color: "#e2e8f0",
                }}>
                  {formatDateBr(periodo.data_inicio)} até {formatDateBr(periodo.data_fim)}
                </span>
              </div>
              <h2 style={{ margin: "3px 0 0", fontSize: 19, fontWeight: 800, color: "#fff" }}>
                {modalInfo.titulo}
              </h2>
            </div>
          </div>

          {/* Placar de Contagem em Tempo Real no Topo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              background: "rgba(16, 185, 129, 0.18)",
              border: "1.5px solid #10b981",
              borderRadius: 12,
              padding: "7px 14px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#6ee7b7", lineHeight: 1.1 }}>
                {stats.totalDiasLetivos}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#d1fae5", textTransform: "uppercase" }}>
                Dias Letivos
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "7px 12px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#86efac", lineHeight: 1.1 }}>
                +{stats.sabadosLetivos}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1", textTransform: "uppercase" }}>
                Sábados Letivos
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "7px 12px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fca5a5", lineHeight: 1.1 }}>
                -{stats.diasUteisDesmarcados}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1", textTransform: "uppercase" }}>
                Não Letivos
              </div>
            </div>

            <button
              type="button"
              onClick={onEditDates}
              style={{
                padding: "9px 13px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Alterar data de início ou término deste período"
            >
              ✏️ Alterar Datas
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: 20,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Fechar calendário"
            >
              &times;
            </button>
          </div>
        </div>

        {/* ── BARRA DE LEGENDA E INSTRUÇÕES INTERATIVAS ── */}
        <div style={{
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          padding: "11px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#1e293b" }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: "linear-gradient(135deg, #10b981, #059669)", display: "inline-block" }} />
              Dia Letivo (Seg–Sex)
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#1e293b" }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: "linear-gradient(135deg, #059669, #047857)", border: "2px solid #fde047", display: "inline-block" }} />
              ★ Sábado Letivo (Ativado)
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#1e293b" }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: "#fef2f2", border: "1.5px dashed #ef4444", display: "inline-block" }} />
              Dia Desmarcado (Feriado/Recesso)
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#64748b" }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: "#ffffff", border: "1.5px dashed #94a3b8", display: "inline-block" }} />
              Sábado Padrão (Clique p/ tornar letivo)
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#94a3b8" }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: "#f1f5f9", display: "inline-block" }} />
              Domingo (Bloqueado)
            </span>
          </div>

          <div style={{ fontSize: 11.5, color: "#475569", fontWeight: 600 }}>
            👆 <strong>Interativo:</strong> Clique em qualquer <strong>Sábado</strong> ou <strong>Dia Letivo</strong> para justificar alterações.
          </div>
        </div>

        {/* ── CORPO SCROLLÁVEL: GRID DE MESES + EXTRATO DE JUSTIFICATIVAS ── */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "22px 24px",
          background: "#f1f5f9",
        }}>
          {/* Grid de Meses */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(295px, 1fr))",
            gap: 18,
          }}>
            {meses.map(({ year, month }) => (
              <MesCalendarioCard
                key={`${year}-${month}`}
                year={year}
                month={month}
                dataInicio={periodo.data_inicio}
                dataFim={periodo.data_fim}
                mapExcecoes={mapExcecoes}
                onDayClick={handleDayClick}
              />
            ))}
          </div>

          {/* Extrato de Justificativas e Ocorrências do Período */}
          <div style={{
            marginTop: 22,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            padding: "16px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                <span>📋 Registro de Justificativas deste Período</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: "#f1f5f9",
                  color: "#475569",
                  padding: "2px 8px",
                  borderRadius: 12,
                }}>
                  {(excecoes || []).length} registro(s)
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: "#64748b" }}>
                Clique sobre um registro ou direto no dia do calendário para editar/reverter
              </span>
            </div>

            {(excecoes || []).length === 0 ? (
              <div style={{
                padding: "16px",
                borderRadius: 10,
                background: "#f8fafc",
                color: "#64748b",
                fontSize: 12.5,
                textAlign: "center",
              }}>
                Nenhuma exceção registrada neste período. Todos os dias de segunda a sexta estão ativos como letivos e nenhum sábado extra foi adicionado.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {excecoes.map((exc) => {
                  const isSabadoLetivo = Number(exc.status_letivo) === 1;
                  const dtObj = parseDateSafe(exc.data);
                  const dow = dtObj ? dtObj.getDay() : 1;
                  return (
                    <div
                      key={exc.id || exc.data}
                      onClick={() => handleDayClick(exc.data, dow, true)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: isSabadoLetivo ? "1px solid #86efac" : "1px solid #fecaca",
                        background: isSabadoLetivo ? "#f0fdf4" : "#fef2f2",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                      title="Clique para editar ou reverter esta justificativa"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: 12,
                          color: isSabadoLetivo ? "#15803d" : "#b91c1c",
                        }}>
                          {isSabadoLetivo ? "★ Sábado Letivo Incluído" : "⛔ Dia Letivo Desmarcado"}
                        </span>
                        <span style={{
                          fontFamily: "monospace",
                          fontWeight: 700,
                          fontSize: 11.5,
                          color: "#334155",
                          background: "rgba(255,255,255,0.8)",
                          padding: "2px 6px",
                          borderRadius: 6,
                        }}>
                          {formatDateBr(exc.data)} ({DIAS_SEMANA_CURTO[dow]})
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600 }}>
                        “{exc.motivo}”
                      </div>
                      {exc.usuario_nome && (
                        <div style={{ fontSize: 10.5, color: "#64748b" }}>
                          Registrado por {exc.usuario_nome} {exc.atualizado_em_fmt ? `em ${exc.atualizado_em_fmt}` : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RODAPÉ DO MODAL DO CALENDÁRIO ── */}
        <div style={{
          padding: "14px 24px",
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>
            📊 Resumo Oficial: <strong>{stats.totalDiasLetivos} dias letivos</strong> ({stats.diasUteisPadrao - stats.diasUteisDesmarcados} dias de Seg–Sex + {stats.sabadosLetivos} sábado(s) letivo(s)).
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Concluir e Fechar
          </button>
        </div>
      </div>

      {/* ── MODAL PREMIUM DE JUSTIFICATIVA (SÁBADO LETIVO OU DESMARCAR DIA) ── */}
      {modalJustificativa && (
        <ModalJustificativaDiaLetivo
          justificativaInfo={modalJustificativa}
          anoLetivo={anoLetivo}
          tipo={modalInfo.tipo}
          numero={modalInfo.numero}
          escolaId={escolaId}
          token={token}
          perfil={perfil}
          apiBase={apiBase}
          onClose={() => setModalJustificativa(null)}
          onSuccess={(newState, msg) => {
            setModalJustificativa(null);
            onStateUpdated(newState, msg);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE: CARD DE UM MÊS NO CALENDÁRIO (DOMINGO A SÁBADO)
// ============================================================================
function MesCalendarioCard({
  year,
  month,
  dataInicio,
  dataFim,
  mapExcecoes,
  onDayClick,
}) {
  const primeiroDiaMes = new Date(year, month, 1, 12, 0, 0);
  const ultimoDiaMes = new Date(year, month + 1, 0, 12, 0, 0);
  const totalDiasMes = ultimoDiaMes.getDate();
  const offsetInicioSemana = primeiroDiaMes.getDay(); // 0 (Dom) .. 6 (Sáb)

  const celulas = [];
  for (let i = 0; i < offsetInicioSemana; i++) {
    celulas.push(null);
  }
  for (let d = 1; d <= totalDiasMes; d++) {
    const dt = new Date(year, month, d, 12, 0, 0);
    celulas.push({
      day: d,
      iso: toIsoDate(dt),
      dow: dt.getDay(),
    });
  }

  // Conta quantos dias letivos há neste mês dentro do período
  let letivosNoMes = 0;
  for (const c of celulas) {
    if (!c) continue;
    const dentro = c.iso >= dataInicio && c.iso <= dataFim;
    if (!dentro) continue;
    const exc = mapExcecoes[c.iso];
    if (c.dow >= 1 && c.dow <= 5) {
      if (!(exc && Number(exc.status_letivo) === 0)) letivosNoMes++;
    } else if (c.dow === 6) {
      if (exc && Number(exc.status_letivo) === 1) letivosNoMes++;
    }
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e2e8f0",
      padding: "14px 16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Cabeçalho do Mês */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: "1px solid #f1f5f9",
      }}>
        <span style={{ fontWeight: 800, fontSize: 14.5, color: "#0f172a" }}>
          {MESES_NOMES[month]} <span style={{ color: "#64748b", fontWeight: 600 }}>{year}</span>
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 800,
          color: "#047857",
          background: "#d1fae5",
          padding: "2px 8px",
          borderRadius: 12,
        }}>
          {letivosNoMes} {letivosNoMes === 1 ? "dia letivo" : "dias letivos"}
        </span>
      </div>

      {/* Cabeçalho dos Dias da Semana (Dom a Sáb) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
        marginBottom: 6,
        textAlign: "center",
      }}>
        {DIAS_SEMANA_CURTO.map((label, idx) => (
          <div
            key={label}
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: idx === 0 ? "#ef4444" : idx === 6 ? "#059669" : "#64748b",
              textTransform: "uppercase",
              padding: "2px 0",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grade dos Dias */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 5,
      }}>
        {celulas.map((cel, idx) => {
          if (!cel) {
            return <div key={`empty-${idx}`} style={{ height: 36 }} />;
          }

          const dentroDoPeriodo = cel.iso >= dataInicio && cel.iso <= dataFim;
          const exc = mapExcecoes[cel.iso];
          const isDomingo = cel.dow === 0;
          const isSabado = cel.dow === 6;
          const isDiaUtil = cel.dow >= 1 && cel.dow <= 5;

          const isSabadoLetivo = isSabado && exc && Number(exc.status_letivo) === 1;
          const isDiaUtilDesmarcado = isDiaUtil && exc && Number(exc.status_letivo) === 0;
          const isVerdeLetivo = dentroDoPeriodo && ((isDiaUtil && !isDiaUtilDesmarcado) || isSabadoLetivo);

          let bg = "#f8fafc";
          let color = "#cbd5e1";
          let border = "1px solid transparent";
          let cursor = "default";
          let title = `${formatDateBr(cel.iso)} (${DIAS_SEMANA_LONGO[cel.dow]})`;

          if (!dentroDoPeriodo) {
            bg = "#f8fafc";
            color = "#cbd5e1";
            border = "1px solid #f1f5f9";
            cursor = "not-allowed";
            title += " — Fora do intervalo configurado para este período";
          } else if (isDomingo) {
            bg = "#f1f5f9";
            color = "#94a3b8";
            border = "1px solid #e2e8f0";
            cursor = "not-allowed";
            title += " — Domingo (Nunca pode ser marcado como dia letivo)";
          } else if (isSabadoLetivo) {
            bg = "linear-gradient(135deg, #059669 0%, #047857 100%)";
            color = "#ffffff";
            border = "2px solid #fde047";
            cursor = "pointer";
            title += ` — ★ SÁBADO LETIVO: "${exc.motivo}" (Clique para gerenciar/desmarcar)`;
          } else if (isSabado) {
            bg = "#ffffff";
            color = "#334155";
            border = "1.5px dashed #94a3b8";
            cursor = "pointer";
            title += " — Sábado (Não letivo por padrão. Clique para marcar como Sábado Letivo)";
          } else if (isDiaUtilDesmarcado) {
            bg = "#fef2f2";
            color = "#b91c1c";
            border = "1.5px dashed #ef4444";
            cursor = "pointer";
            title += ` — ⛔ DIA NÃO LETIVO: "${exc.motivo}" (Clique para restaurar ou editar motivo)`;
          } else if (isVerdeLetivo) {
            bg = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
            color = "#ffffff";
            border = "1px solid #059669";
            cursor = "pointer";
            title += " — Dia Letivo (Clique se desejar desmarcar com justificativa)";
          }

          return (
            <button
              key={cel.iso}
              type="button"
              disabled={!dentroDoPeriodo || isDomingo}
              onClick={() => onDayClick(cel.iso, cel.dow, dentroDoPeriodo)}
              title={title}
              style={{
                height: 36,
                borderRadius: 8,
                background: bg,
                color,
                border,
                cursor,
                fontWeight: isVerdeLetivo || isDiaUtilDesmarcado ? 800 : 600,
                fontSize: 12.5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                padding: 0,
                transition: "transform 0.12s ease, box-shadow 0.12s ease",
                boxShadow: isVerdeLetivo ? "0 2px 5px rgba(16, 185, 129, 0.25)" : "none",
                opacity: !dentroDoPeriodo ? 0.4 : 1,
              }}
            >
              <span>{cel.day}</span>
              {isSabadoLetivo && (
                <span style={{
                  position: "absolute",
                  top: 1,
                  right: 3,
                  fontSize: 8,
                  color: "#fde047",
                  lineHeight: 1,
                }}>
                  ★
                </span>
              )}
              {isDiaUtilDesmarcado && (
                <span style={{
                  position: "absolute",
                  top: 1,
                  right: 3,
                  fontSize: 8,
                  color: "#ef4444",
                  lineHeight: 1,
                }}>
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 3: MODAL PREMIUM DE JUSTIFICATIVA (SÁBADO LETIVO / DESMARCAR DIA LETIVO)
// ============================================================================
function ModalJustificativaDiaLetivo({
  justificativaInfo,
  anoLetivo,
  tipo,
  numero,
  escolaId,
  token,
  perfil,
  apiBase,
  onClose,
  onSuccess,
}) {
  const [motivo, setMotivo] = useState(justificativaInfo.motivoAtual || "");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const { dataIso, dow, modo, tituloModal, subtituloModal } = justificativaInfo;
  const isIncluirSabado = modo === "incluir_sabado";

  const sugestoesRapidas = isIncluirSabado
    ? [
        "Sábado Letivo — Reposição de Aulas",
        "Projeto Pedagógico / Atividade Extra",
        "Feira de Ciências / Mostra Cultural",
        "Simulado / Avaliação Institucional",
        "Culminância de Projetos Escolares",
      ]
    : [
        "Feriado Nacional / Distrital",
        "Recesso Escolar Oficial",
        "Ponto Facultativo",
        "Conselho de Classe",
        "Coordenação / Jornada Pedagógica",
      ];

  const enviarExcecao = async (acaoEscolhida, motivoTexto) => {
    setErro("");
    if (acaoEscolhida !== "restaurar_dia_util" && !String(motivoTexto || "").trim()) {
      setErro("Por favor, descreva o motivo/justificativa antes de confirmar.");
      return;
    }

    const nomeUsuario =
      localStorage.getItem("userName") ||
      localStorage.getItem("usuario_nome") ||
      localStorage.getItem("nome_usuario") ||
      localStorage.getItem("nome") ||
      "Diretor(a)";

    try {
      setSaving(true);
      const res = await fetch(`${apiBase}/api/governanca/ano-letivo-excecao`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-escola-id": escolaId,
          "x-perfil": perfil,
        },
        body: JSON.stringify({
          escola_id: escolaId,
          ano_letivo: anoLetivo,
          tipo,
          numero,
          data: dataIso,
          acao: acaoEscolhida,
          motivo: String(motivoTexto || "").trim(),
          usuario_nome: nomeUsuario,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onSuccess({ periodos: data.periodos || [], excecoes: data.excecoes || [] }, data.message);
      } else {
        setErro(data.message || "Não foi possível registrar a alteração.");
      }
    } catch {
      setErro("Erro de conexão com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modo === "incluir_sabado") {
      enviarExcecao("marcar_sabado_letivo", motivo);
    } else if (modo === "desmarcar_sabado_letivo") {
      enviarExcecao("desmarcar_dia_letivo", motivo);
    } else if (modo === "desmarcar_dia_util") {
      enviarExcecao("desmarcar_dia_letivo", motivo);
    } else if (modo === "gerenciar_dia_desmarcado") {
      enviarExcecao("desmarcar_dia_letivo", motivo);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.78)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10100,
      padding: 16,
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        borderRadius: 22,
        width: "100%",
        maxWidth: 500,
        padding: "28px",
        color: "#fff",
        boxShadow: isIncluirSabado
          ? "0 25px 50px -12px rgba(16, 185, 129, 0.35), 0 0 0 2px #10b981"
          : "0 25px 50px -12px rgba(245, 158, 11, 0.35), 0 0 0 2px #f59e0b",
        animation: "scaleIn 0.2s ease",
      }}>
        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: isIncluirSabado
              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
              : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
          }}>
            {isIncluirSabado ? "★" : "📝"}
          </div>
          <div>
            <div style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: 1.3,
              textTransform: "uppercase",
              color: isIncluirSabado ? "#6ee7b7" : "#fde68a",
            }}>
              Justificativa Oficial da Direção
            </div>
            <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#fff" }}>
              {tituloModal}
            </h3>
          </div>
        </div>

        {/* Badge da Data Selecionada */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
        }}>
          <span style={{ color: "#cbd5e1" }}>📅 Data selecionada:</span>
          <strong style={{ color: "#fef08a", fontSize: 13.5 }}>
            {formatDateBr(dataIso)} — {DIAS_SEMANA_LONGO[dow]}
          </strong>
        </div>

        <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 14px" }}>
          {subtituloModal}
        </p>

        {erro && (
          <div style={{
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid #ef4444",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 12,
            color: "#fca5a5",
            fontWeight: 600,
            marginBottom: 14,
          }}>
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Sugestões Rápidas em Pílulas */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
              ⚡ Sugestões rápidas (clique para preencher):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sugestoesRapidas.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setMotivo(sug)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 16,
                    border: motivo === sug ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.16)",
                    background: motivo === sug ? "rgba(16, 185, 129, 0.25)" : "rgba(255,255,255,0.06)",
                    color: "#e2e8f0",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
              Motivo / Justificativa da Direção: *
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                isIncluirSabado
                  ? "Ex.: Sábado letivo destinado à reposição de aulas e feira pedagógica..."
                  : "Ex.: Feriado nacional / Recesso escolar conforme calendário oficial..."
              }
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(0,0,0,0.35)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Botão extra caso seja um dia útil que estava desmarcado e o diretor queira restaurá-lo para Verde */}
          {modo === "gerenciar_dia_desmarcado" && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                disabled={saving}
                onClick={() => enviarExcecao("restaurar_dia_util", "Dia restaurado como letivo pela Direção")}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: 12,
                  border: "1.5px solid #10b981",
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#6ee7b7",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                🟢 Restaurar como Dia Letivo Normal (Ficar Verde)
              </button>
            </div>
          )}

          {/* Botões Principais */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#cbd5e1",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1.6,
                padding: "12px",
                borderRadius: 12,
                border: "none",
                background: isIncluirSabado
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: isIncluirSabado ? "#ffffff" : "#0f172a",
                fontWeight: 800,
                fontSize: 13.5,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
              }}
            >
              {saving
                ? "Salvando..."
                : isIncluirSabado
                ? "✅ Confirmar e Marcar Verde"
                : modo === "desmarcar_sabado_letivo"
                ? "Confirmar e Desmarcar Sábado"
                : modo === "gerenciar_dia_desmarcado"
                ? "Salvar Nova Justificativa"
                : "Confirmar e Desmarcar Dia Letivo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
