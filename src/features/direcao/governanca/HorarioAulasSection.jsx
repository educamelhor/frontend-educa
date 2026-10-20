// src/features/direcao/governanca/HorarioAulasSection.jsx
// ============================================================================
// GOVERNANÇA — Categoria ANO LETIVO -> Item 3: HORÁRIO DAS AULAS POR TURNO
// Diretor seleciona o turno, define a quantidade de aulas do turno e define
// o horário de início e término de cada aula, com Assistente de Preenchimento
// Inteligente, Detecção Automática de Intervalo/Recreio e Visualizador (Olhinho).
// ============================================================================
import React, { useState, useMemo, useEffect } from "react";

const TURNOS_META = [
  {
    key: "matutino",
    label: "Matutino",
    emoji: "🌅",
    corTema: "#7c3aed",
    defaultInicio: "07:30",
    defaultQtd: 6,
    defaultDuracao: 50,
    defaultIntervaloApos: 3,
    defaultIntervaloMin: 15,
  },
  {
    key: "vespertino",
    label: "Vespertino",
    emoji: "☀️",
    corTema: "#7c3aed",
    defaultInicio: "13:30",
    defaultQtd: 6,
    defaultDuracao: 50,
    defaultIntervaloApos: 3,
    defaultIntervaloMin: 15,
  },
  {
    key: "noturno",
    label: "Noturno",
    emoji: "🌙",
    corTema: "#7c3aed",
    defaultInicio: "19:00",
    defaultQtd: 4,
    defaultDuracao: 45,
    defaultIntervaloApos: 2,
    defaultIntervaloMin: 15,
  },
  {
    key: "integral",
    label: "Integral",
    emoji: "🏫",
    corTema: "#7c3aed",
    defaultInicio: "07:30",
    defaultQtd: 8,
    defaultDuracao: 50,
    defaultIntervaloApos: 4,
    defaultIntervaloMin: 60,
  },
];

// Converte 'HH:MM' em minutos totais desde 00:00
function timeToMinutes(tStr) {
  if (!tStr || !/^\d{2}:\d{2}$/.test(String(tStr))) return null;
  const [h, m] = String(tStr).split(":").map(Number);
  return h * 60 + m;
}

// Converte minutos desde 00:00 para 'HH:MM'
function minutesToTime(totalMin) {
  const normalized = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Formata minutos em ex: '5h05m' ou '50 min'
function formatDuration(mins) {
  if (!mins || mins <= 0) return "0 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}m` : `${h}h`;
}

// Gera array de aulas automaticamente a partir dos parâmetros
function gerarAulasAutomaticas(qtd, horaInicialStr, duracaoMin, intervaloAposAula, duracaoIntervaloMin) {
  const startMin = timeToMinutes(horaInicialStr) ?? 450; // 07:30 fallback
  const dur = Number(duracaoMin) || 50;
  const intApos = Number(intervaloAposAula) || 0;
  const intMin = Number(duracaoIntervaloMin) || 0;

  const lista = [];
  let cursor = startMin;
  for (let i = 1; i <= qtd; i++) {
    const ini = minutesToTime(cursor);
    const fim = minutesToTime(cursor + dur);
    lista.push({ numero: i, inicio: ini, fim: fim });
    cursor += dur;
    if (intApos > 0 && intMin > 0 && i === intApos && i < qtd) {
      cursor += intMin;
    }
  }
  return lista;
}

// Calcula estatísticas completas de um turno configurado
export function calcularEstatisticasHorarioTurno(horarioObj) {
  const aulas = horarioObj?.aulas || [];
  if (!Array.isArray(aulas) || aulas.length === 0) {
    return {
      configurado: false,
      quantidadeAulas: 0,
      inicioTurno: null,
      fimTurno: null,
      minutosEmAula: 0,
      minutosIntervalo: 0,
      qtdIntervalos: 0,
      duracaoMediaAula: 0,
      duracaoTotalTurno: 0,
    };
  }

  let minutosEmAula = 0;
  let minutosIntervalo = 0;
  let qtdIntervalos = 0;

  for (let i = 0; i < aulas.length; i++) {
    const mIni = timeToMinutes(aulas[i].inicio);
    const mFim = timeToMinutes(aulas[i].fim);
    if (mIni !== null && mFim !== null && mFim > mIni) {
      minutosEmAula += mFim - mIni;
    }
    if (i < aulas.length - 1) {
      const mProxIni = timeToMinutes(aulas[i + 1].inicio);
      if (mFim !== null && mProxIni !== null && mProxIni > mFim) {
        qtdIntervalos++;
        minutosIntervalo += mProxIni - mFim;
      }
    }
  }

  const primeiroIni = aulas[0]?.inicio || null;
  const ultimoFim = aulas[aulas.length - 1]?.fim || null;
  const mPrimeiro = timeToMinutes(primeiroIni);
  const mUltimo = timeToMinutes(ultimoFim);
  const duracaoTotalTurno =
    mPrimeiro !== null && mUltimo !== null && mUltimo > mPrimeiro
      ? mUltimo - mPrimeiro
      : minutosEmAula + minutosIntervalo;

  return {
    configurado: true,
    quantidadeAulas: aulas.length,
    inicioTurno: primeiroIni,
    fimTurno: ultimoFim,
    minutosEmAula,
    minutosIntervalo,
    qtdIntervalos,
    duracaoMediaAula: Math.round(minutosEmAula / aulas.length),
    duracaoTotalTurno,
  };
}

// ============================================================================
// COMPONENTE PRINCIPAL DA SEÇÃO HORÁRIO DAS AULAS
// ============================================================================
export default function HorarioAulasSection({
  apiBase,
  escolaId,
  token,
  perfil,
  anoLetivo,
  horarios = [],
  onRefreshState,
  showToast,
}) {
  // Modal de configuração/edição de horário de um turno
  const [modalConfigTurno, setModalConfigTurno] = useState(null);
  // { turnoKey: 'matutino' | 'vespertino' | 'noturno' | 'integral' }

  // Modal de visualização detalhada (Olhinho) de um turno
  const [modalVisualizarTurno, setModalVisualizarTurno] = useState(null);
  // { turnoKey: 'matutino' | ... }

  const getHorarioPorTurno = (turnoKey) =>
    (horarios || []).find((h) => String(h.turno).toLowerCase() === turnoKey) || null;

  const resumoTurnos = useMemo(() => {
    let turnosAtivos = 0;
    let totalTempos = 0;
    for (const tm of TURNOS_META) {
      const h = (horarios || []).find((x) => String(x.turno).toLowerCase() === tm.key);
      if (h && Array.isArray(h.aulas) && h.aulas.length > 0) {
        turnosAtivos++;
        totalTempos += h.aulas.length;
      }
    }
    return { turnosAtivos, totalTempos };
  }, [horarios]);

  return (
    <>
      {/* =====================================================================
          CONTAINER 3: HORÁRIO DAS AULAS (GRADE DE TEMPOS POR TURNO)
      ===================================================================== */}
      <div style={{
        margin: "0 20px 20px",
        padding: "20px",
        borderRadius: "14px",
        background: "linear-gradient(135deg, #f8fafc 0%, #f5f3ff 100%)",
        border: "1.5px solid #ddd6fe",
        boxShadow: "0 4px 14px rgba(124, 58, 237, 0.08)",
      }}>
        {/* Header do Container */}
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
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
              boxShadow: "0 4px 10px rgba(124, 58, 237, 0.25)",
            }}>
              ⏰
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#2e1065" }}>
                  Horário das Aulas (Grade de Tempos por Turno)
                </span>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  padding: "3px 9px",
                  borderRadius: 20,
                  background: "#ede9fe",
                  color: "#5b21b6",
                }}>
                  4 Turnos Autônomos
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>
                Selecione o turno, defina a quantidade de aulas e configure o horário de início e término de cada tempo de aula.
              </div>
            </div>
          </div>

          {/* Card de Resumo Acumulado dos Turnos */}
          <div style={{
            background: "#fff",
            border: "1.5px solid #ddd6fe",
            borderRadius: 12,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 2px 6px rgba(124, 58, 237, 0.06)",
          }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Turnos Configurados
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
                <span style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: resumoTurnos.turnosAtivos > 0 ? "#059669" : "#7c3aed",
                }}>
                  {resumoTurnos.totalTempos}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  {resumoTurnos.totalTempos === 1 ? "aula definida" : "aulas definidas"}
                </span>
              </div>
            </div>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: resumoTurnos.turnosAtivos > 0 ? "#d1fae5" : "#ede9fe",
              color: resumoTurnos.turnosAtivos > 0 ? "#047857" : "#6d28d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 11.5,
            }}>
              {resumoTurnos.turnosAtivos}/4
            </div>
          </div>
        </div>

        {/* Alerta Informativo */}
        <div style={{
          padding: "10px 14px",
          borderRadius: "10px",
          backgroundColor: "#ede9fe",
          borderLeft: "4px solid #7c3aed",
          color: "#4c1d95",
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
            <span>🔔</span>
            <span>
              Após configurar os horários de um turno, clique no ícone <strong>👁️ Olhinho</strong> no card para abrir o <strong>Quadro Oficial da Sineta Escolar</strong> com linha do tempo e status em tempo real.
            </span>
          </div>
        </div>

        {/* Grid com os 4 Badges de Turnos */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))",
          gap: 14,
        }}>
          {TURNOS_META.map((tm) => {
            const hObj = getHorarioPorTurno(tm.key);
            const stats = calcularEstatisticasHorarioTurno(hObj);

            return (
              <TurnoHorarioBadgeCard
                key={tm.key}
                turnoMeta={tm}
                horarioObj={hObj}
                stats={stats}
                onOpenEdit={() => setModalConfigTurno({ turnoKey: tm.key })}
                onOpenView={() => setModalVisualizarTurno({ turnoKey: tm.key })}
              />
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: CONFIGURAR / EDITAR HORÁRIOS DO TURNO
      ===================================================================== */}
      {modalConfigTurno && (
        <ModalConfigurarHorarioTurno
          turnoInicialKey={modalConfigTurno.turnoKey}
          anoLetivo={anoLetivo}
          escolaId={escolaId}
          token={token}
          perfil={perfil}
          apiBase={apiBase}
          horariosAtuais={horarios}
          onClose={() => setModalConfigTurno(null)}
          onSaved={(newState, msg) => {
            onRefreshState(newState);
            setModalConfigTurno(null);
            showToast(msg || "Horário das aulas salvo com sucesso!", "success");
          }}
        />
      )}

      {/* =====================================================================
          MODAL 2: OLHINHO — QUADRO OFICIAL DA SINETA ESCOLAR DO TURNO
      ===================================================================== */}
      {modalVisualizarTurno && (
        <ModalVisualizarHorarioTurno
          turnoKey={modalVisualizarTurno.turnoKey}
          anoLetivo={anoLetivo}
          horarios={horarios}
          onSelectTurno={(newKey) => setModalVisualizarTurno({ turnoKey: newKey })}
          onClose={() => setModalVisualizarTurno(null)}
          onEditTurno={(tKey) => {
            setModalVisualizarTurno(null);
            setModalConfigTurno({ turnoKey: tKey });
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// SUBCOMPONENTE: CARD / BADGE DE CADA TURNO (MATUTINO, VESPERTINO, NOTURNO, INTEGRAL)
// ============================================================================
function TurnoHorarioBadgeCard({
  turnoMeta,
  stats,
  onOpenEdit,
  onOpenView,
}) {
  const isConfigurado = Boolean(stats?.configurado);

  return (
    <div
      style={{
        background: isConfigurado
          ? "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)"
          : "#ffffff",
        border: isConfigurado ? "1.5px solid #10b981" : "1.5px dashed #cbd5e1",
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
      {/* Topo do Card: Nome do Turno + Olhinho + Botão Configurar/Editar */}
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
            {turnoMeta.emoji} {turnoMeta.label}
          </span>
        </div>

        {/* Ações: Olhinho (se configurado) + Botão Configurar/Editar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isConfigurado && (
            <button
              type="button"
              onClick={onOpenView}
              title="Visualizar Quadro Oficial da Sineta e Horários do Turno"
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
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenEdit}
            title={isConfigurado ? "Editar horários deste turno" : "Configurar quantidade de aulas e horários deste turno"}
            style={{
              height: 32,
              padding: "0 10px",
              borderRadius: 9,
              border: isConfigurado ? "1px solid #e2e8f0" : `1px solid ${turnoMeta.corTema}`,
              background: isConfigurado ? "#f8fafc" : turnoMeta.corTema,
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

      {/* Meio do Card: Início da 1ª Aula e Término da Última Aula */}
      {isConfigurado ? (
        <div
          onClick={onOpenView}
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
          title="Clique para abrir o quadro de horários deste turno"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>🟢 1ª Aula (Início):</span>
            <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: 12.5 }}>
              {stats.inicioTurno}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>🏁 {stats.quantidadeAulas}ª Aula (Fim):</span>
            <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: 12.5 }}>
              {stats.fimTurno}
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
          ⏰ Clique em <strong>Configurar</strong> para definir Aulas e Horários
        </div>
      )}

      {/* Rodapé do Card: Quantidade de Aulas + Indicadores de Intervalo / Duração */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        {isConfigurado ? (
          <>
            <div
              onClick={onOpenView}
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
              title="Quantidade de tempos de aula configurados neste turno"
            >
              <span>🔔</span>
              <span>
                {stats.quantidadeAulas} {stats.quantidadeAulas === 1 ? "aula" : "aulas"} ({stats.duracaoMediaAula}m)
              </span>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              {stats.qtdIntervalos > 0 && (
                <span
                  title={`${stats.qtdIntervalos} intervalo(s)/recreio somando ${stats.minutosIntervalo} min`}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    background: "#fef3c7",
                    color: "#b45309",
                    padding: "3px 7px",
                    borderRadius: 10,
                    border: "1px solid #fde68a",
                  }}
                >
                  ☕ {stats.minutosIntervalo}m int.
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
            ⏳ 0 aulas (não definido)
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 1: CONFIGURAR / EDITAR HORÁRIOS DO TURNO
// ============================================================================
function ModalConfigurarHorarioTurno({
  turnoInicialKey,
  anoLetivo,
  escolaId,
  token,
  perfil,
  apiBase,
  horariosAtuais = [],
  onClose,
  onSaved,
}) {
  const [turnoKey, setTurnoKey] = useState(turnoInicialKey || "matutino");
  const [quantidadeAulas, setQuantidadeAulas] = useState(6);
  const [aulas, setAulas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  // Estados do Gerador Inteligente (Auto-Fill)
  const [autoInicio, setAutoInicio] = useState("07:30");
  const [autoDuracao, setAutoDuracao] = useState(50);
  const [autoIntervaloApos, setAutoIntervaloApos] = useState(3);
  const [autoIntervaloMin, setAutoIntervaloMin] = useState(15);

  const turnoMetaAtual = TURNOS_META.find((t) => t.key === turnoKey) || TURNOS_META[0];

  // Carrega dados do turno selecionado (ou gera sugestão padrão inicial)
  useEffect(() => {
    const meta = TURNOS_META.find((t) => t.key === turnoKey) || TURNOS_META[0];
    setAutoInicio(meta.defaultInicio);
    setAutoDuracao(meta.defaultDuracao);
    setAutoIntervaloApos(meta.defaultIntervaloApos);
    setAutoIntervaloMin(meta.defaultIntervaloMin);

    const existente = (horariosAtuais || []).find((h) => String(h.turno).toLowerCase() === turnoKey);
    if (existente && Array.isArray(existente.aulas) && existente.aulas.length > 0) {
      setQuantidadeAulas(existente.aulas.length);
      setAulas(existente.aulas.map((a, idx) => ({
        numero: idx + 1,
        inicio: a.inicio || "07:30",
        fim: a.fim || "08:20",
      })));
    } else {
      const qtdPadrao = meta.defaultQtd;
      setQuantidadeAulas(qtdPadrao);
      setAulas(
        gerarAulasAutomaticas(
          qtdPadrao,
          meta.defaultInicio,
          meta.defaultDuracao,
          meta.defaultIntervaloApos,
          meta.defaultIntervaloMin
        )
      );
    }
    setErro("");
  }, [turnoKey, horariosAtuais]);

  // Ajusta a lista de aulas quando o Diretor altera a Quantidade de Aulas
  const handleChangeQuantidade = (novaQtdRaw) => {
    const novaQtd = Math.max(1, Math.min(15, Number(novaQtdRaw) || 1));
    setQuantidadeAulas(novaQtd);

    setAulas((prev) => {
      if (novaQtd === prev.length) return prev;
      if (novaQtd < prev.length) {
        return prev.slice(0, novaQtd);
      }
      // Adiciona novas aulas continuando do último horário de término
      const copia = [...prev];
      const dur = Number(autoDuracao) || 50;
      for (let i = copia.length + 1; i <= novaQtd; i++) {
        const antFim = copia[copia.length - 1]?.fim || autoInicio || "07:30";
        const mAnt = timeToMinutes(antFim) ?? 450;
        copia.push({
          numero: i,
          inicio: minutesToTime(mAnt),
          fim: minutesToTime(mAnt + dur),
        });
      }
      return copia;
    });
  };

  // Dispara o Gerador Inteligente em 1 clique
  const handleAplicarGerador = () => {
    const geradas = gerarAulasAutomaticas(
      quantidadeAulas,
      autoInicio,
      autoDuracao,
      autoIntervaloApos,
      autoIntervaloMin
    );
    setAulas(geradas);
  };

  const handleAulaTimeChange = (idx, campo, valor) => {
    setAulas((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item))
    );
  };

  const previewStats = useMemo(
    () => calcularEstatisticasHorarioTurno({ aulas }),
    [aulas]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    for (let i = 0; i < aulas.length; i++) {
      const a = aulas[i];
      if (!a.inicio || !a.fim) {
        setErro(`Preencha o horário de início e término da ${i + 1}ª aula.`);
        return;
      }
      if (a.inicio >= a.fim) {
        setErro(`Na ${i + 1}ª aula, o horário de início (${a.inicio}) deve ser menor que o término (${a.fim}).`);
        return;
      }
    }

    const nomeUsuario =
      localStorage.getItem("userName") ||
      localStorage.getItem("usuario_nome") ||
      localStorage.getItem("nome_usuario") ||
      localStorage.getItem("nome") ||
      "Diretor(a)";

    try {
      setSaving(true);
      const res = await fetch(`${apiBase}/api/governanca/ano-letivo-horario`, {
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
          turno: turnoKey,
          quantidade_aulas: quantidadeAulas,
          aulas,
          usuario_nome: nomeUsuario,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onSaved(
          {
            periodos: data.periodos,
            excecoes: data.excecoes,
            horarios: data.horarios,
          },
          data.message
        );
      } else {
        setErro(data.message || "Erro ao salvar horário das aulas.");
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
      backgroundColor: "rgba(15, 23, 42, 0.76)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10050,
      padding: 16,
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        borderRadius: 22,
        width: "96%",
        maxWidth: 740,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        boxShadow: "0 25px 60px -12px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(139, 92, 246, 0.5)",
        overflow: "hidden",
        animation: "scaleIn 0.2s ease",
      }}>
        {/* Cabeçalho do Modal */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)",
            }}>
              ⏰
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "#c4b5fd" }}>
                Configuração da Grade de Horários — {anoLetivo}
              </div>
              <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#fff" }}>
                Horário das Aulas — Turno {turnoMetaAtual.emoji} {turnoMetaAtual.label}
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
              width: 34,
              height: 34,
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            &times;
          </button>
        </div>

        {/* Corpo Scrollável */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
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

          {/* PASSO 1: SELECIONAR TURNO E QUANTIDADE DE AULAS */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
            marginBottom: 16,
          }}>
            {/* Seletor de Turno */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "12px 14px",
            }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 800, color: "#c4b5fd", textTransform: "uppercase", marginBottom: 8 }}>
                1. Selecione o Turno:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {TURNOS_META.map((tm) => {
                  const sel = tm.key === turnoKey;
                  return (
                    <button
                      key={tm.key}
                      type="button"
                      onClick={() => setTurnoKey(tm.key)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 9,
                        border: sel ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
                        background: sel
                          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                          : "rgba(0,0,0,0.25)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <span>{tm.emoji}</span>
                      <span>{tm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor de Quantidade de Aulas */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "12px 14px",
            }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 800, color: "#c4b5fd", textTransform: "uppercase", marginBottom: 8 }}>
                2. Quantidade de Aulas do Turno:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {[4, 5, 6, 7, 8, 9, 10].map((numOpt) => {
                  const ativo = Number(quantidadeAulas) === numOpt;
                  return (
                    <button
                      key={numOpt}
                      type="button"
                      onClick={() => handleChangeQuantidade(numOpt)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        border: ativo ? "1.5px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                        background: ativo ? "#7c3aed" : "rgba(0,0,0,0.25)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {numOpt}
                    </button>
                  );
                })}
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={quantidadeAulas}
                  onChange={(e) => handleChangeQuantidade(e.target.value)}
                  title="Digite outra quantidade (1 a 15)"
                  style={{
                    width: 54,
                    height: 34,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(0,0,0,0.4)",
                    color: "#fde047",
                    fontWeight: 800,
                    fontSize: 13.5,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                Total selecionado: <strong style={{ color: "#fff" }}>{quantidadeAulas} {quantidadeAulas === 1 ? "tempo de aula" : "tempos de aula"}</strong>
              </div>
            </div>
          </div>

          {/* ASSISTENTE DE PREENCHIMENTO INTELIGENTE EM 1 CLIQUE */}
          <div style={{
            background: "rgba(139, 92, 246, 0.12)",
            border: "1px solid rgba(139, 92, 246, 0.35)",
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 18,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#ddd6fe" }}>
                ⚡ Assistente de Geração Rápida (Opcional — preenche os horários em 1 clique):
              </span>
              <button
                type="button"
                onClick={handleAplicarGerador}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(139, 92, 246, 0.4)",
                }}
              >
                ⚡ Gerar / Recalcular Horários
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10.5, color: "#cbd5e1", marginBottom: 3 }}>Início da 1ª Aula</label>
                <input
                  type="time"
                  value={autoInicio}
                  onChange={(e) => setAutoInicio(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(0,0,0,0.35)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    colorScheme: "dark",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10.5, color: "#cbd5e1", marginBottom: 3 }}>Duração da Aula (min)</label>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={autoDuracao}
                  onChange={(e) => setAutoDuracao(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(0,0,0,0.35)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10.5, color: "#cbd5e1", marginBottom: 3 }}>Intervalo após qual aula?</label>
                <select
                  value={autoIntervaloApos}
                  onChange={(e) => setAutoIntervaloApos(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    boxSizing: "border-box",
                  }}
                >
                  <option value={0}>Sem intervalo</option>
                  {Array.from({ length: Math.max(0, quantidadeAulas - 1) }, (_, idx) => idx + 1).map((n) => (
                    <option key={n} value={n}>
                      Após a {n}ª Aula
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10.5, color: "#cbd5e1", marginBottom: 3 }}>Duração do Intervalo (min)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  disabled={Number(autoIntervaloApos) === 0}
                  value={autoIntervaloMin}
                  onChange={(e) => setAutoIntervaloMin(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(0,0,0,0.35)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    opacity: Number(autoIntervaloApos) === 0 ? 0.4 : 1,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          {/* PASSO 3: LISTA DE HORÁRIOS DE CADA AULA */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase" }}>
                3. Horário de Início e Término de Cada Aula (Editável Individualmente):
              </span>
              {previewStats.configurado && (
                <span style={{ fontSize: 11.5, color: "#6ee7b7", fontWeight: 700 }}>
                  Turno: {previewStats.inicioTurno} às {previewStats.fimTurno} ({formatDuration(previewStats.duracaoTotalTurno)})
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aulas.map((aula, idx) => {
                const mIni = timeToMinutes(aula.inicio);
                const mFim = timeToMinutes(aula.fim);
                const durMin = mIni !== null && mFim !== null && mFim > mIni ? mFim - mIni : null;

                // Verifica se há intervalo entre esta aula e a próxima
                let intervaloAposEsta = null;
                let conflitoComProxima = false;
                if (idx < aulas.length - 1) {
                  const mProxIni = timeToMinutes(aulas[idx + 1].inicio);
                  if (mFim !== null && mProxIni !== null) {
                    if (mProxIni > mFim) {
                      intervaloAposEsta = {
                        inicio: aula.fim,
                        fim: aulas[idx + 1].inicio,
                        minutos: mProxIni - mFim,
                      };
                    } else if (mProxIni < mFim) {
                      conflitoComProxima = true;
                    }
                  }
                }

                return (
                  <React.Fragment key={idx}>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: durMin === null
                          ? "1px solid #ef4444"
                          : "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      {/* Badge Número da Aula */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 110 }}>
                        <span style={{
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 12,
                          padding: "5px 11px",
                          borderRadius: 8,
                          display: "inline-block",
                        }}>
                          {idx + 1}ª Aula
                        </span>
                      </div>

                      {/* Inputs de Início e Término */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600 }}>Início:</span>
                          <input
                            type="time"
                            value={aula.inicio}
                            onChange={(e) => handleAulaTimeChange(idx, "inicio", e.target.value)}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 8,
                              border: "1px solid rgba(255,255,255,0.22)",
                              background: "rgba(0,0,0,0.4)",
                              color: "#fff",
                              fontSize: 13.5,
                              fontWeight: 800,
                              colorScheme: "dark",
                              outline: "none",
                            }}
                          />
                        </div>

                        <span style={{ color: "#64748b", fontWeight: 700 }}>→</span>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600 }}>Término:</span>
                          <input
                            type="time"
                            value={aula.fim}
                            onChange={(e) => handleAulaTimeChange(idx, "fim", e.target.value)}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 8,
                              border: "1px solid rgba(255,255,255,0.22)",
                              background: "rgba(0,0,0,0.4)",
                              color: "#fff",
                              fontSize: 13.5,
                              fontWeight: 800,
                              colorScheme: "dark",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>

                      {/* Pill de Duração da Aula */}
                      <div style={{ minWidth: 85, textAlign: "right" }}>
                        {durMin !== null ? (
                          <span style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: "#6ee7b7",
                            background: "rgba(16, 185, 129, 0.15)",
                            padding: "4px 9px",
                            borderRadius: 12,
                          }}>
                            ⏱️ {durMin} min
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#fca5a5",
                          }}>
                            ⚠️ Horário inválido
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Linha Automática de Intervalo / Recreio quando há janela entre esta aula e a próxima */}
                    {intervaloAposEsta && (
                      <div style={{
                        margin: "0 18px",
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "1px dashed rgba(245, 158, 11, 0.5)",
                        color: "#fde68a",
                        fontSize: 11.5,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <span>☕ Intervalo / Recreio detectado entre a {idx + 1}ª e a {idx + 2}ª Aula</span>
                        <span>
                          {intervaloAposEsta.inicio} às {intervaloAposEsta.fim} ({intervaloAposEsta.minutos} min)
                        </span>
                      </div>
                    )}

                    {conflitoComProxima && (
                      <div style={{
                        margin: "0 18px",
                        padding: "5px 12px",
                        borderRadius: 8,
                        background: "rgba(239, 68, 68, 0.18)",
                        border: "1px dashed #ef4444",
                        color: "#fca5a5",
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        ⚠️ Atenção: O início da {idx + 2}ª Aula ({aulas[idx + 1].inicio}) é anterior ao término da {idx + 1}ª Aula ({aula.fim}).
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(0,0,0,0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>
            Carga em sala: <strong style={{ color: "#6ee7b7" }}>{formatDuration(previewStats.minutosEmAula)}</strong>
            {previewStats.minutosIntervalo > 0 && (
              <> | Intervalo: <strong style={{ color: "#fde68a" }}>{previewStats.minutosIntervalo} min</strong></>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
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
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              style={{
                padding: "10px 22px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13.5,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
              }}
            >
              {saving ? "Salvando..." : `💾 Salvar Horários (${turnoMetaAtual.label})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL 2: OLHINHO — QUADRO OFICIAL DA SINETA ESCOLAR & TIMELINE DO TURNO
// ============================================================================
function ModalVisualizarHorarioTurno({
  turnoKey,
  anoLetivo,
  horarios = [],
  onSelectTurno,
  onClose,
  onEditTurno,
}) {
  const turnoMeta = TURNOS_META.find((t) => t.key === turnoKey) || TURNOS_META[0];
  const horarioObj = (horarios || []).find((h) => String(h.turno).toLowerCase() === turnoKey);
  const stats = useMemo(() => calcularEstatisticasHorarioTurno(horarioObj), [horarioObj]);

  // Minuto atual do relógio para destacar qual aula está acontecendo agora
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  if (!horarioObj || !stats.configurado) return null;

  const aulas = horarioObj.aulas || [];

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
        maxWidth: 820,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5)",
        animation: "scaleIn 0.2s ease",
      }}>
        {/* Header Escuro */}
        <div style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#fff",
          padding: "20px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
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
              {turnoMeta.emoji}
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
                  Quadro Oficial da Sineta Escolar — {anoLetivo}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.1)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  color: "#e2e8f0",
                }}>
                  {stats.inicioTurno} às {stats.fimTurno}
                </span>
              </div>
              <h2 style={{ margin: "3px 0 0", fontSize: 19, fontWeight: 800, color: "#fff" }}>
                Horário das Aulas — Turno {turnoMeta.label}
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => onEditTurno(turnoKey)}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✏️ Editar Horários
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
            >
              &times;
            </button>
          </div>
        </div>

        {/* Barra de Navegação Rápida entre Turnos Configurados + Estatísticas */}
        <div style={{
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TURNOS_META.map((tm) => {
              const h = (horarios || []).find((x) => String(x.turno).toLowerCase() === tm.key);
              const temDados = h && Array.isArray(h.aulas) && h.aulas.length > 0;
              const ativo = tm.key === turnoKey;
              return (
                <button
                  key={tm.key}
                  type="button"
                  disabled={!temDados}
                  onClick={() => temDados && onSelectTurno(tm.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: ativo ? "1.5px solid #059669" : "1px solid #e2e8f0",
                    background: ativo ? "#ecfdf5" : "#fff",
                    color: ativo ? "#047857" : temDados ? "#334155" : "#cbd5e1",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: temDados ? "pointer" : "not-allowed",
                  }}
                >
                  {tm.emoji} {tm.label} {temDados ? `(${h.aulas.length})` : ""}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, fontSize: 12, fontWeight: 700, color: "#334155" }}>
            <span>🔔 <strong>{stats.quantidadeAulas}</strong> aulas</span>
            <span>⏱️ Sala: <strong>{formatDuration(stats.minutosEmAula)}</strong></span>
            {stats.minutosIntervalo > 0 && (
              <span>☕ Recreio: <strong>{stats.minutosIntervalo} min</strong></span>
            )}
          </div>
        </div>

        {/* Lista Visual de Tempos de Aula e Intervalos */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
          background: "#f1f5f9",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {aulas.map((aula, idx) => {
              const mIni = timeToMinutes(aula.inicio);
              const mFim = timeToMinutes(aula.fim);
              const dur = mIni !== null && mFim !== null && mFim > mIni ? mFim - mIni : 0;
              const emAndamentoAgora = mIni !== null && mFim !== null && currentMin >= mIni && currentMin < mFim;

              let intervaloCard = null;
              if (idx < aulas.length - 1) {
                const mProxIni = timeToMinutes(aulas[idx + 1].inicio);
                if (mFim !== null && mProxIni !== null && mProxIni > mFim) {
                  intervaloCard = {
                    inicio: aula.fim,
                    fim: aulas[idx + 1].inicio,
                    minutos: mProxIni - mFim,
                    ativoAgora: currentMin >= mFim && currentMin < mProxIni,
                  };
                }
              }

              return (
                <React.Fragment key={idx}>
                  <div
                    style={{
                      background: emAndamentoAgora
                        ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
                        : "#ffffff",
                      border: emAndamentoAgora ? "2px solid #10b981" : "1.5px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 8,
                      }}>
                        {idx + 1}ª Aula
                      </span>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "#047857",
                        background: "#d1fae5",
                        padding: "3px 8px",
                        borderRadius: 10,
                      }}>
                        {dur} min
                      </span>
                    </div>

                    <div style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#0f172a",
                      fontFamily: "monospace",
                      letterSpacing: "-0.5px",
                    }}>
                      {aula.inicio} <span style={{ color: "#94a3b8", fontSize: 15 }}>até</span> {aula.fim}
                    </div>

                    {emAndamentoAgora && (
                      <div style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#047857",
                      }}>
                        🟢 Em andamento neste horário
                      </div>
                    )}
                  </div>

                  {intervaloCard && (
                    <div
                      style={{
                        background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                        border: "1.5px dashed #f59e0b",
                        borderRadius: 14,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: 12.5, color: "#b45309" }}>
                          ☕ Intervalo / Recreio
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          background: "#fde68a",
                          color: "#92400e",
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}>
                          {intervaloCard.minutos} min
                        </span>
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#78350f", fontFamily: "monospace" }}>
                        {intervaloCard.inicio} até {intervaloCard.fim}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Rodapé */}
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
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {horarioObj.atualizado_por_nome
              ? `Última atualização por ${horarioObj.atualizado_por_nome} em ${horarioObj.atualizado_em_fmt || ""}`
              : `Configuração oficial do turno ${turnoMeta.label}`}
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
    </div>
  );
}
