// src/features/secretaria/horarios/HorarioManualPage.jsx
// ============================================================
// Aba ✍️ Horário Manual:
// Permite registrar manualmente a grade horária de cada professor
// (ideal para escolas que já possuem horário pronto no Urânia ou
// ingressam com o ano letivo em andamento).
// Layout espelhado em DisponibilidadePage:
// - Painel esquerdo: busca + lista de professores do turno
// - Área principal: cabeçalho do professor + colunas de dias (Seg a Sex/Sáb)
// - Em cada card (1º ao Nº horário): Combobox (digitação/filtro + Listbox)
//   dividido em:
//     1) ⭐ Turmas Moduladas do Professor
//     2) 🏫 Demais Turmas do Turno
// - Botão Salvar por professor selecionado
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../../../services/api";
import ExportarHorarioModal, { imprimirHorarioProfessorUnico } from "./ExportarHorarioModal.jsx";
import BadgeVigenciaHorario, {
  resolverVigenciaFrontend,
  filtrarProfessoresVigentesNoTurno,
  filtrarVinculosVigentesNoTurno,
} from "./BadgeVigenciaHorario.jsx";

const DIAS = [
  { num: 1, nome: "Segunda" },
  { num: 2, nome: "Terça"   },
  { num: 3, nome: "Quarta"  },
  { num: 4, nome: "Quinta"  },
  { num: 5, nome: "Sexta"   },
  { num: 6, nome: "Sábado"  },
];

function normText(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchMatch(candidate, query) {
  if (!query) return true;
  const qNorm = normText(query);
  if (!qNorm) return true;
  const cNorm = normText(candidate);
  if (cNorm.includes(qNorm)) return true;
  // Permite digitar "9c" ou "1a" e encontrar "9º ANO C" ou "1º ANO A"
  const cCompact = cNorm.replace(/\b(ano|serie|turma|ensino|medio|fundamental)\b/g, "").replace(/\s+/g, "");
  const qCompact = qNorm.replace(/\s+/g, "");
  return cCompact.includes(qCompact);
}

function naturalCompare(a, b) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", { numeric: true, sensitivity: "base" });
}

function getAnoLetivoAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  return hoje.getMonth() === 0 ? ano - 1 : ano;
}

// ── Componente Combobox de cada Slot (1º, 2º, 3º...) ────────────
function SlotTurmaCombobox({
  ordem,
  diaNome,
  disabled,
  value,           // { turma_id, disciplina_id, turma_nome, disciplina_nome, locked, origem } | null
  opcoesModuladas, // [{ key, turma_id, turma_nome, disciplina_id, disciplina_nome, aulas_previstas }]
  opcoesDemais,    // [{ key, turma_id, turma_nome, disciplina_id, disciplina_nome }]
  alocadosCountMap,// { "turmaId-discId": count }
  ocupacaoMap,     // { turmaId: { professor_id, professor_nome, disciplina_nome } } (outro prof neste dia/ordem)
  mostrarDiscNoCard,
  horarioInfo,     // { inicio, fim } opcional vindo da Governança
  onSelect,        // (opt | null) => void
  onToggleLock,    // () => void
}) {
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Fecha listbox ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
        setFiltro("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [aberto]);

  const modFiltradas = useMemo(() => {
    return opcoesModuladas.filter(op =>
      compactSearchMatch(`${op.turma_nome} ${op.disciplina_nome || ""}`, filtro)
    );
  }, [opcoesModuladas, filtro]);

  const demaisFiltradas = useMemo(() => {
    return opcoesDemais.filter(op =>
      compactSearchMatch(`${op.turma_nome} ${op.disciplina_nome || ""}`, filtro)
    );
  }, [opcoesDemais, filtro]);

  const flatOpcoes = useMemo(() => {
    return [...modFiltradas, ...demaisFiltradas];
  }, [modFiltradas, demaisFiltradas]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [filtro, aberto]);

  const conflitoAtual = value?.turma_id ? ocupacaoMap?.[Number(value.turma_id)] : null;

  function abrirEdicao() {
    if (disabled) return;
    setAberto(true);
    setFiltro("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 15);
  }

  function handleEscolher(op) {
    onSelect(op);
    setAberto(false);
    setFiltro("");
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      setAberto(false);
      setFiltro("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatOpcoes.length > 0) {
        setHighlightIdx(prev => (prev + 1) % flatOpcoes.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatOpcoes.length > 0) {
        setHighlightIdx(prev => (prev - 1 + flatOpcoes.length) % flatOpcoes.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatOpcoes.length > 0 && flatOpcoes[highlightIdx]) {
        handleEscolher(flatOpcoes[highlightIdx]);
      }
    } else if ((e.key === "Backspace" || e.key === "Delete") && !filtro && value) {
      onSelect(null);
    }
  }

  const temValor = !!(value && value.turma_id);
  const isLocked = !!(temValor && value?.locked);

  // Cores do card conforme estado (Fixo Manual vs Espelho do Solver vs Conflito vs Vazio)
  let cardBg = "#f8fafc";
  let cardBorder = "1.5px dashed #cbd5e1";
  let badgeBg = "#e2e8f0";
  let badgeColor = "#475569";

  if (temValor) {
    if (conflitoAtual) {
      cardBg = "#fef2f2";
      cardBorder = "1.5px solid #ef4444";
      badgeBg = "#ef4444";
      badgeColor = "#fff";
    } else if (isLocked) {
      cardBg = "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)";
      cardBorder = "2px solid #d97706";
      badgeBg = "#d97706";
      badgeColor = "#fff";
    } else {
      cardBg = "#eff6ff";
      cardBorder = "1.5px solid #3b82f6";
      badgeBg = "#2563eb";
      badgeColor = "#fff";
    }
  } else if (aberto) {
    cardBg = "#fff";
    cardBorder = "1.5px solid #2563eb";
    badgeBg = "#dbeafe";
    badgeColor = "#1d4ed8";
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      {/* Card principal do slot */}
      <div
        onClick={() => {
          if (!aberto) abrirEdicao();
        }}
        title={
          disabled
            ? "Selecione um professor"
            : conflitoAtual
            ? `⚠️ Conflito: ${value?.turma_nome} já está ocupada por ${conflitoAtual.professor_nome} neste horário`
            : temValor
            ? `${diaNome} · ${ordem}º horário · ${value.turma_nome}${value.disciplina_nome ? ` (${value.disciplina_nome})` : ""}${
                isLocked ? " — 📌 HORÁRIO FIXADO (protegido contra alterações no Solver)" : " — Espelho do Rascunho (ainda não fixado)"
              }`
            : `${diaNome} · ${ordem}º horário · Clique para selecionar ou digitar a turma`
        }
        style={{
          width: "100%",
          minHeight: 44,
          borderRadius: 12,
          border: cardBorder,
          background: disabled ? "#f1f5f9" : cardBg,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 7px",
          boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          boxShadow: aberto
            ? "0 0 0 3px rgba(37, 99, 235, 0.15)"
            : isLocked
            ? "0 2px 8px rgba(217, 119, 6, 0.22)"
            : temValor
            ? "0 2px 6px rgba(37, 99, 235, 0.10)"
            : "none",
        }}
      >
        {/* Número da aula (1º, 2º...) */}
        <span
          style={{
            minWidth: 26,
            height: 24,
            borderRadius: 8,
            background: badgeBg,
            color: badgeColor,
            fontSize: 11,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          title={
            horarioInfo?.inicio && horarioInfo?.fim
              ? `${ordem}º Horário (${horarioInfo.inicio} – ${horarioInfo.fim})`
              : `${ordem}º Horário`
          }
        >
          {ordem}º
        </span>

        {/* Conteúdo: Input de busca quando aberto OU Rótulo quando fechado */}
        {aberto ? (
          <input
            ref={inputRef}
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={temValor ? `${value.turma_nome} (digite p/ filtrar...)` : "Digite ou selecione a turma..."}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12,
              fontWeight: 600,
              color: "#1e293b",
              fontFamily: "inherit",
            }}
          />
        ) : temValor ? (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: conflitoAtual ? "#b91c1c" : isLocked ? "#78350f" : "#1e3a5f",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              <span>{conflitoAtual ? "⚠️ " : ""}{value.turma_nome}</span>
            </div>
            {(mostrarDiscNoCard || conflitoAtual) && (
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: conflitoAtual ? "#dc2626" : isLocked ? "#b45309" : "#2563eb",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.15,
              }}>
                {conflitoAtual
                  ? `Choque: ${conflitoAtual.professor_nome?.split(" ")[0] || "Outro prof."}`
                  : value.disciplina_nome}
              </div>
            )}
          </div>
        ) : (
          <span style={{
            flex: 1,
            minWidth: 0,
            fontSize: 11,
            fontWeight: 500,
            color: "#94a3b8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {horarioInfo?.inicio ? `${horarioInfo.inicio} · Turma…` : "Turma…"}
          </span>
        )}

        {/* Badge / Botão de Alfinete (📌 FIXO) quando há turma alocada */}
        {temValor && !aberto && (
          <button
            type="button"
            title={
              isLocked
                ? "📌 Aula FIXADA manualmente! Clique para desafixar apenas este horário."
                : "Clique para fixar (📌) este horário individualmente."
            }
            onClick={e => {
              e.stopPropagation();
              if (onToggleLock) onToggleLock();
            }}
            style={{
              border: isLocked ? "1px solid #d97706" : "1px dashed #cbd5e1",
              background: isLocked ? "#f59e0b" : "rgba(255,255,255,0.75)",
              color: isLocked ? "#fff" : "#64748b",
              height: 20,
              padding: isLocked ? "0 5px" : "0 4px",
              borderRadius: 6,
              fontSize: 9.5,
              fontWeight: 800,
              lineHeight: 1,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              flexShrink: 0,
              boxShadow: isLocked ? "0 1px 3px rgba(180,83,9,0.3)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span>📌</span>
            {isLocked && <span style={{ letterSpacing: 0.2 }}>FIXO</span>}
          </button>
        )}

        {/* Botão limpar (×) ou seta do listbox (▾) */}
        {temValor && !aberto ? (
          <button
            type="button"
            title="Limpar horário"
            onClick={e => {
              e.stopPropagation();
              onSelect(null);
            }}
            style={{
              border: "none",
              background: "rgba(15, 23, 42, 0.08)",
              color: isLocked ? "#78350f" : "#475569",
              width: 19,
              height: 19,
              borderRadius: "50%",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              padding: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#fee2e2";
              e.currentTarget.style.color = "#dc2626";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.08)";
              e.currentTarget.style.color = isLocked ? "#78350f" : "#475569";
            }}
          >
            ×
          </button>
        ) : (
          <span
            onClick={e => {
              e.stopPropagation();
              if (disabled) return;
              if (aberto) {
                setAberto(false);
                setFiltro("");
              } else {
                abrirEdicao();
              }
            }}
            style={{
              fontSize: 10,
              color: aberto ? "#2563eb" : "#94a3b8",
              flexShrink: 0,
              padding: "0 2px",
              userSelect: "none",
            }}
          >
            {aberto ? "▴" : "▾"}
          </span>
        )}
      </div>

      {/* Dropdown / Listbox */}
      {aberto && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            width: 250,
            maxHeight: 280,
            overflowY: "auto",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
            zIndex: 100,
            padding: "6px 0",
          }}
        >
          {/* Opção de deixar vago quando já tem turma */}
          {temValor && (
            <div
              onClick={() => handleEscolher(null)}
              style={{
                padding: "7px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#dc2626",
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span>🧹</span> Deixar horário vago (limpar)
            </div>
          )}

          {/* Grupo 1: Turmas Moduladas do Professor */}
          {modFiltradas.length > 0 && (
            <div>
              <div
                style={{
                  padding: "6px 12px 4px",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#1d4ed8",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  background: "#f8fafc",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                ⭐ Turmas Moduladas do Professor
              </div>
              {modFiltradas.map((op, i) => {
                const flatIndex = i;
                const isHighlighted = highlightIdx === flatIndex;
                const isSelected =
                  temValor &&
                  Number(value.turma_id) === Number(op.turma_id) &&
                  Number(value.disciplina_id) === Number(op.disciplina_id);
                const ocupadaPorOutro = ocupacaoMap?.[Number(op.turma_id)];
                const alocadas = alocadosCountMap?.[`${op.turma_id}-${op.disciplina_id}`] || 0;
                const previstas = Number(op.aulas_previstas) || 0;
                const completa = previstas > 0 && alocadas >= previstas;

                return (
                  <div
                    key={`mod-${op.key}`}
                    onMouseEnter={() => setHighlightIdx(flatIndex)}
                    onClick={() => handleEscolher(op)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      background: isHighlighted ? "#eff6ff" : isSelected ? "#f0fdf4" : "#fff",
                      borderLeft: isSelected ? "3px solid #22c55e" : "3px solid transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                        {op.turma_nome}
                      </span>
                      {previstas > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 10,
                            background: completa ? "#dcfce7" : "#dbeafe",
                            color: completa ? "#15803d" : "#1d4ed8",
                          }}
                        >
                          {alocadas}/{previstas} {completa ? "✓" : "aulas"}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
                        {op.disciplina_nome}
                      </span>
                      {ocupadaPorOutro && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#b91c1c",
                            background: "#fee2e2",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          ⚠️ {ocupadaPorOutro.professor_nome?.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grupo 2: Demais Turmas do Turno */}
          {demaisFiltradas.length > 0 && (
            <div>
              <div
                style={{
                  padding: "6px 12px 4px",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  background: "#f8fafc",
                  borderTop: modFiltradas.length > 0 ? "1px solid #e2e8f0" : "none",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                🏫 Demais Turmas do Turno
              </div>
              {demaisFiltradas.map((op, j) => {
                const flatIndex = modFiltradas.length + j;
                const isHighlighted = highlightIdx === flatIndex;
                const isSelected =
                  temValor &&
                  Number(value.turma_id) === Number(op.turma_id) &&
                  Number(value.disciplina_id) === Number(op.disciplina_id);
                const ocupadaPorOutro = ocupacaoMap?.[Number(op.turma_id)];

                return (
                  <div
                    key={`dem-${op.key}`}
                    onMouseEnter={() => setHighlightIdx(flatIndex)}
                    onClick={() => handleEscolher(op)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      background: isHighlighted ? "#f1f5f9" : isSelected ? "#f0fdf4" : "#fff",
                      borderLeft: isSelected ? "3px solid #22c55e" : "3px solid transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        {op.turma_nome}
                      </span>
                      {ocupadaPorOutro && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#b91c1c",
                            background: "#fee2e2",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          ⚠️ {ocupadaPorOutro.professor_nome?.split(" ")[0]}
                        </span>
                      )}
                    </div>
                    {op.disciplina_nome && (
                      <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
                        {op.disciplina_nome}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {flatOpcoes.length === 0 && (
            <div style={{ padding: "14px 12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
              Nenhuma turma encontrada para "{filtro}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente Principal da Página ──────────────────────────────
export default function HorarioManualPage({ config, turnoInicial }) {
  const turnos           = config?.turnos      || ["matutino", "vespertino"];
  const diasLetivos      = config?.dias_semana || [1, 2, 3, 4, 5];
  const periodosPorTurno = config?.periodos    || { matutino: 5, vespertino: 5 };

  const [turno, setTurno]             = useState(turnoInicial || turnos[0] || "matutino");
  const [professores, setProfessores] = useState([]);
  const [turmasTurno, setTurmasTurno] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [alocacoesMod, setAlocacoesMod] = useState([]); // registros vindos de /api/modulacao

  const [profSel, setProfSel]         = useState(null);
  // grid: { [profId]: { [dia]: { [ordem]: { turma_id, disciplina_id, turma_nome, disciplina_nome, locked, origem } | null } } }
  const [grid, setGrid]               = useState({});
  const [dirty, setDirty]             = useState({});
  const [salvando, setSalvando]       = useState(false);
  const [msg, setMsg]                 = useState("");
  const [carregando, setCarregando]   = useState(true);
  const [busca, setBusca]             = useState("");
  const [conflitoModal, setConflitoModal] = useState(null); // { message, conflicts }
  const [fixadoModal, setFixadoModal] = useState(null);     // { profNome, totalFixadas }
  const [showModalExportar, setShowModalExportar] = useState(false);

  const nPeriodos = periodosPorTurno[turno] || 5;
  const dias      = DIAS.filter(d => diasLetivos.includes(d.num));
  const vigencia  = resolverVigenciaFrontend(config);
  const horariosTurnoAtivo = config?.horarios_por_turno?.[String(turno || "").toLowerCase()] || {};

  // Estrutura consolidada para a Central de Impressão e Exportação PDF em Lote
  const dadosExportacao = useMemo(() => {
    const tMap = {};
    for (const t of turmasTurno) {
      tMap[t.id] = t.turma || t.nome || `Turma ${t.id}`;
    }
    const dMap = {};
    for (const d of disciplinas) {
      dMap[d.id] = d.nome || d.disciplina || `Disc ${d.id}`;
    }
    const pMap = {};
    for (const p of professores) {
      pMap[p.id] = p.nome || `Professor ${p.id}`;
    }

    const gradePorTurma = {};
    for (const t of turmasTurno) {
      gradePorTurma[t.id] = {};
    }

    let totalSlotsTurno = 0;
    for (const [pIdStr, diasObj] of Object.entries(grid || {})) {
      const pId = Number(pIdStr);
      for (const [diaStr, ordObj] of Object.entries(diasObj || {})) {
        const diaNum = Number(diaStr);
        for (const [ordStr, cell] of Object.entries(ordObj || {})) {
          const ordNum = Number(ordStr);
          if (!cell || !cell.turma_id) continue;
          totalSlotsTurno++;
          const tId = Number(cell.turma_id);
          if (cell.turma_nome && !tMap[tId]) tMap[tId] = cell.turma_nome;
          if (cell.disciplina_nome && cell.disciplina_id && !dMap[cell.disciplina_id]) {
            dMap[cell.disciplina_id] = cell.disciplina_nome;
          }
          if (!gradePorTurma[tId]) gradePorTurma[tId] = {};
          if (!gradePorTurma[tId][diaNum]) gradePorTurma[tId][diaNum] = {};
          gradePorTurma[tId][diaNum][ordNum] = {
            turma_id: tId,
            disciplina_id: cell.disciplina_id,
            professor_id: pId,
            locked: Boolean(cell.locked),
            origem: cell.origem || "manual",
          };
        }
      }
    }

    return {
      resultado: {
        grade_por_professor: grid,
        grade_por_turma: gradePorTurma,
      },
      nomesTurmas: tMap,
      nomesDisciplinas: dMap,
      nomesProfessores: pMap,
      totalSlotsTurno,
    };
  }, [grid, turmasTurno, disciplinas, professores]);

  // ── Carga de dados do turno ──────────────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(true);
    setMsg("");
    try {
      const anoAtual = getAnoLetivoAtual();
      const [resProfs, resTurmas, resDiscs, resMod, resGrade] = await Promise.all([
        api.get("/api/professores", { params: { turno } }).catch(() => ({ data: [] })),
        api.get("/api/turmas", { params: { turno, ano: anoAtual } }).catch(() => ({ data: [] })),
        api.get("/api/disciplinas").catch(() => ({ data: [] })),
        api.get("/api/modulacao", { params: { turno, semestre: vigencia.semestre_atual } }).catch(() => ({ data: { turmas: [], alocacoes: [] } })),
        api.get("/api/grade/manual", { params: { turno: turno.toLowerCase() } }).catch(() => ({ data: { slots: [] } })),
      ]);

      // 1) Professores ativos no turno e semestre vigente
      const listaProfs = Array.isArray(resProfs.data)
        ? resProfs.data
        : (resProfs.data?.professores || []);

      const ativos = filtrarProfessoresVigentesNoTurno(listaProfs, turno, vigencia.semestre_atual);
      ativos.sort((a, b) => naturalCompare(a.nome, b.nome));
      setProfessores(ativos);

      // 2) Turmas do turno
      const rawTurmas = Array.isArray(resTurmas.data)
        ? resTurmas.data
        : (resTurmas.data?.turmas || resMod.data?.turmas || []);
      const turmasNorm = rawTurmas
        .map(t => ({
          id: Number(t.id ?? t.turma_id),
          nome: String(t.nome ?? t.turma ?? t.sigla ?? "").trim(),
          turno: t.turno,
        }))
        .filter(t => t.id && t.nome && (!t.turno || String(t.turno).toLowerCase() === turno.toLowerCase()));
      turmasNorm.sort((a, b) => naturalCompare(a.nome, b.nome));
      setTurmasTurno(turmasNorm);

      // 3) Disciplinas
      const rawDiscs = Array.isArray(resDiscs.data) ? resDiscs.data : [];
      setDisciplinas(rawDiscs);

      const turmaMap = {};
      for (const t of turmasNorm) turmaMap[t.id] = t.nome;
      const discMap = {};
      for (const d of rawDiscs) discMap[d.id] = d.nome || d.disciplina || `Disc ${d.id}`;

      // 4) Modulação do turno
      const alocs = Array.isArray(resMod.data?.alocacoes) ? resMod.data.alocacoes : [];
      setAlocacoesMod(alocs);

      // 5) Monta grid inicial dos professores com os slots já salvos em grade_slot
      const g = {};
      for (const p of ativos) {
        g[p.id] = {};
        for (const d of dias) {
          g[p.id][d.num] = {};
          for (let o = 1; o <= nPeriodos; o++) {
            g[p.id][d.num][o] = null;
          }
        }
      }

      const slotsSalvos = Array.isArray(resGrade.data?.slots) ? resGrade.data.slots : [];
      for (const s of slotsSalvos) {
        const pId = Number(s.professor_id);
        const diaNum = Number(s.dia ?? s.dia_semana);
        const ordNum = Number(s.ordem ?? s.periodo_ordem);
        const tId = Number(s.turma_id);
        const dId = Number(s.disciplina_id);
        if (!pId || !diaNum || !ordNum || !tId) continue;
        if (!g[pId]) g[pId] = {};
        if (!g[pId][diaNum]) g[pId][diaNum] = {};
        const isLockedSlot = Boolean(Number(s.locked));
        g[pId][diaNum][ordNum] = {
          turma_id: tId,
          disciplina_id: dId,
          turma_nome: s.turma_nome || turmaMap[tId] || `Turma ${tId}`,
          disciplina_nome: s.disciplina_nome || discMap[dId] || "",
          locked: isLockedSlot,
          origem: s.origem || (isLockedSlot ? "manual" : "solver"),
        };
      }

      setGrid(g);
      setDirty({});

      if (ativos.length > 0) {
        setProfSel(prev => (prev && ativos.some(p => p.id === prev) ? prev : ativos[0].id));
      } else {
        setProfSel(null);
      }
    } catch (e) {
      console.error("Erro ao carregar dados do Horário Manual:", e);
    } finally {
      setCarregando(false);
    }
  }, [turno, nPeriodos]); // eslint-disable-line

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── Disciplinas vinculadas a um professor no turno ───────────
  const getDisciplinasObj = useCallback(
    (p) => {
      if (!p) return [];
      const map = new Map();

      // 1) A partir da modulação no turno
      for (const a of alocacoesMod) {
        if (Number(a.professor_id) === Number(p.id) && a.disciplina_id) {
          map.set(Number(a.disciplina_id), a.disciplina_nome || `Disc ${a.disciplina_id}`);
        }
      }

      // 2) A partir de p.vinculos vigentes no turno e semestre
      const vincVigentes = Array.isArray(p.vinculos_vigentes) && p.vinculos_vigentes.length > 0
        ? p.vinculos_vigentes
        : filtrarVinculosVigentesNoTurno(p.vinculos, turno, vigencia.semestre_atual);
      for (const v of vincVigentes) {
        if (v.disciplina_id) {
          map.set(Number(v.disciplina_id), v.disciplina_nome || `Disc ${v.disciplina_id}`);
        }
      }

      // 3) Fallback legado (p.disciplina_id / p.disciplina_nome)
      if (map.size === 0 && (p.disciplina_id || p.disciplina_nome || p.disciplina)) {
        const dNome = p.disciplina_nome || p.disciplina || "Disciplina";
        let dId = Number(p.disciplina_id) || null;
        if (!dId) {
          const found = disciplinas.find(
            d => normText(d.nome || d.disciplina) === normText(dNome)
          );
          if (found) dId = Number(found.id);
        }
        if (dId) map.set(dId, dNome);
      }

      return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
    },
    [alocacoesMod, turno, disciplinas]
  );

  const getDisciplinasNomes = useCallback(
    (p) => {
      const objs = getDisciplinasObj(p);
      if (objs.length > 0) return objs.map(o => o.nome);
      const fallback = p?.disciplina_nome || p?.disciplina;
      return fallback ? [fallback] : ["—"];
    },
    [getDisciplinasObj]
  );

  const profAtual = useMemo(
    () => professores.find(p => p.id === profSel) || null,
    [professores, profSel]
  );

  // ── Opções do Listbox para o Professor Selecionado ───────────
  // Grupo 1: Turmas em que o professor está modulado no turno
  // Grupo 2: Demais turmas do turno
  const { opcoesModuladas, opcoesDemais, mostrarDiscNoCard } = useMemo(() => {
    if (!profAtual) {
      return { opcoesModuladas: [], opcoesDemais: [], mostrarDiscNoCard: false };
    }

    const discsProf = getDisciplinasObj(profAtual);
    const defaultDisc = discsProf[0] || {
      id: disciplinas[0]?.id || 1,
      nome: disciplinas[0]?.nome || disciplinas[0]?.disciplina || "Disciplina",
    };

    // Filtra alocações da modulação para este professor com turma_id
    const modProf = alocacoesMod.filter(
      a => Number(a.professor_id) === Number(profAtual.id) && a.turma_id != null
    );

    const seenKeys = new Set();
    const modList = [];

    for (const m of modProf) {
      const tId = Number(m.turma_id);
      const dId = Number(m.disciplina_id);
      const key = `${tId}-${dId}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const turmaInfo = turmasTurno.find(t => Number(t.id) === tId);
      const turmaNome = m.turma_nome || turmaInfo?.nome || `Turma ${tId}`;
      const discNome = m.disciplina_nome || defaultDisc.nome;

      modList.push({
        key,
        turma_id: tId,
        turma_nome: turmaNome,
        disciplina_id: dId,
        disciplina_nome: discNome,
        aulas_previstas: Number(m.aulas) || 0,
        isModulada: true,
      });
    }

    modList.sort((a, b) => {
      const cmp = naturalCompare(a.turma_nome, b.turma_nome);
      return cmp !== 0 ? cmp : naturalCompare(a.disciplina_nome, b.disciplina_nome);
    });

    // Demais turmas do turno (combinadas com as disciplinas do professor)
    const discsParaDemais = discsProf.length > 0 ? discsProf : [defaultDisc];
    const demaisList = [];

    for (const t of turmasTurno) {
      for (const d of discsParaDemais) {
        const key = `${t.id}-${d.id}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        demaisList.push({
          key,
          turma_id: Number(t.id),
          turma_nome: t.nome,
          disciplina_id: Number(d.id),
          disciplina_nome: d.nome,
          aulas_previstas: 0,
          isModulada: false,
        });
      }
    }

    const uniqueDiscIds = new Set(
      [...modList, ...demaisList].map(x => Number(x.disciplina_id)).filter(Boolean)
    );

    return {
      opcoesModuladas: modList,
      opcoesDemais: demaisList,
      mostrarDiscNoCard: uniqueDiscIds.size > 1,
    };
  }, [profAtual, alocacoesMod, turmasTurno, getDisciplinasObj, disciplinas]);

  // ── Contagem de aulas alocadas e fixadas por professor e por (turma, disc) ──
  const statsPorProfessor = useMemo(() => {
    const map = {};
    for (const p of professores) {
      let totalAlocadas = 0;
      let totalFixadas = 0;
      const porTurmaDisc = {};
      const pGrid = grid[p.id] || {};
      for (const d of dias) {
        for (let o = 1; o <= nPeriodos; o++) {
          const cell = pGrid[d.num]?.[o];
          if (cell && cell.turma_id) {
            totalAlocadas++;
            if (cell.locked) totalFixadas++;
            const k = `${cell.turma_id}-${cell.disciplina_id}`;
            porTurmaDisc[k] = (porTurmaDisc[k] || 0) + 1;
          }
        }
      }

      // Total previsto na modulação para este professor no turno
      const previstasMod = alocacoesMod
        .filter(a => Number(a.professor_id) === Number(p.id) && a.turma_id != null)
        .reduce((acc, cur) => acc + (Number(cur.aulas) || 0), 0);

      map[p.id] = {
        totalAlocadas,
        totalFixadas,
        todasFixadas: totalAlocadas > 0 && totalFixadas === totalAlocadas,
        previstasMod,
        porTurmaDisc,
      };
    }
    return map;
  }, [professores, grid, dias, nPeriodos, alocacoesMod]);

  // ── Mapa de ocupação de turmas por OUTROS professores em cada (dia, ordem) ──
  // ocupacaoPorSlot[dia][ordem][turma_id] = { professor_id, professor_nome, disciplina_nome }
  const ocupacaoPorSlot = useMemo(() => {
    const out = {};
    for (const d of dias) {
      out[d.num] = {};
      for (let o = 1; o <= nPeriodos; o++) {
        out[d.num][o] = {};
      }
    }

    for (const p of professores) {
      if (Number(p.id) === Number(profSel)) continue;
      const pGrid = grid[p.id] || {};
      for (const d of dias) {
        for (let o = 1; o <= nPeriodos; o++) {
          const cell = pGrid[d.num]?.[o];
          if (cell && cell.turma_id) {
            out[d.num][o][Number(cell.turma_id)] = {
              professor_id: p.id,
              professor_nome: p.nome,
              disciplina_nome: cell.disciplina_nome,
            };
          }
        }
      }
    }
    return out;
  }, [professores, profSel, grid, dias, nPeriodos]);

  // ── Alterar um slot do professor selecionado ─────────────────
  function handleSelectSlot(diaNum, ordem, opcao) {
    if (!profSel) return;
    setGrid(prev => ({
      ...prev,
      [profSel]: {
        ...(prev[profSel] || {}),
        [diaNum]: {
          ...(prev[profSel]?.[diaNum] || {}),
          [ordem]: opcao
            ? {
                turma_id: Number(opcao.turma_id),
                disciplina_id: Number(opcao.disciplina_id),
                turma_nome: opcao.turma_nome,
                disciplina_nome: opcao.disciplina_nome,
                locked: true,
                origem: "manual",
              }
            : null,
        },
      },
    }));
    setDirty(prev => ({ ...prev, [profSel]: true }));
  }

  // ── Alternar fixação (📌) de um único slot diretamente no card ──
  async function handleToggleSlotLock(diaNum, ordem) {
    if (!profSel) return;
    const cell = grid[profSel]?.[diaNum]?.[ordem];
    if (!cell || !cell.turma_id || !cell.disciplina_id) return;

    const novoLocked = !cell.locked;
    setGrid(prev => ({
      ...prev,
      [profSel]: {
        ...(prev[profSel] || {}),
        [diaNum]: {
          ...(prev[profSel]?.[diaNum] || {}),
          [ordem]: {
            ...cell,
            locked: novoLocked,
            origem: novoLocked ? "manual" : "solver",
          },
        },
      },
    }));

    try {
      await api.post("/api/grade/slot/upsert", {
        turno: turno.toLowerCase(),
        turma_id: Number(cell.turma_id),
        dia: diaNum,
        ordem,
        disciplina_id: Number(cell.disciplina_id),
        professor_id: profSel,
        origem: novoLocked ? "manual" : "solver",
        locked: novoLocked,
      });
    } catch {
      setDirty(prev => ({ ...prev, [profSel]: true }));
    }
  }

  // ── Limpar grade apenas do professor selecionado ─────────────
  function limparProfessorAtual() {
    if (!profSel) return;
    setGrid(prev => {
      const limpo = {};
      for (const d of dias) {
        limpo[d.num] = {};
        for (let o = 1; o <= nPeriodos; o++) {
          limpo[d.num][o] = null;
        }
      }
      return { ...prev, [profSel]: limpo };
    });
    setDirty(prev => ({ ...prev, [profSel]: true }));
    const primeiroNome = profAtual?.nome?.split(" ")[0] || "Professor";
    setMsg(`ℹ️ Grade limpa na tela. Clique em '📌 Fixar Horário ${primeiroNome}' para confirmar.`);
  }

  // ── Fixar (ou Desafixar) Horário Completo do Professor Selecionado ──
  async function salvarProfessorAtual(substituirConflitos = false, lockFlag = true) {
    if (!profSel) return;
    setSalvando(true);
    setMsg("");
    setConflitoModal(null);

    try {
      const pGrid = grid[profSel] || {};
      const slotsPayload = [];
      for (const d of dias) {
        for (let o = 1; o <= nPeriodos; o++) {
          const cell = pGrid[d.num]?.[o];
          if (cell && cell.turma_id && cell.disciplina_id) {
            slotsPayload.push({
              dia: d.num,
              ordem: o,
              turma_id: Number(cell.turma_id),
              disciplina_id: Number(cell.disciplina_id),
            });
          }
        }
      }

      await api.post("/api/grade/manual/professor", {
        turno: turno.toLowerCase(),
        professor_id: profSel,
        slots: slotsPayload,
        substituir_conflitos: substituirConflitos,
        locked: lockFlag,
      });

      // Se substituiu conflitos, recarrega do backend para refletir a remoção no outro professor
      if (substituirConflitos) {
        await carregar();
      } else {
        // Atualiza imediatamente os cards na tela com o status locked = lockFlag (📌 FIXO)
        setGrid(prev => {
          const profMap = { ...(prev[profSel] || {}) };
          for (const d of dias) {
            profMap[d.num] = { ...(profMap[d.num] || {}) };
            for (let o = 1; o <= nPeriodos; o++) {
              const c = profMap[d.num][o];
              if (c && c.turma_id) {
                profMap[d.num][o] = {
                  ...c,
                  locked: Boolean(lockFlag),
                  origem: lockFlag ? "manual" : "solver",
                };
              }
            }
          }
          return { ...prev, [profSel]: profMap };
        });

        setDirty(prev => {
          const copia = { ...prev };
          delete copia[profSel];
          return copia;
        });
      }

      const nomeCompleto = profAtual?.nome || "Professor";
      const primeiroNome = nomeCompleto.split(" ")[0];

      if (lockFlag && slotsPayload.length > 0) {
        setFixadoModal({
          profNome: nomeCompleto,
          primeiroNome,
          totalFixadas: slotsPayload.length,
        });
      } else if (!lockFlag) {
        setMsg(`🔓 Todas as ${slotsPayload.length} aulas de ${primeiroNome} foram desafixadas (liberadas para o Solver).`);
        setTimeout(() => setMsg(""), 4500);
      } else {
        setMsg(`✅ Horário de ${primeiroNome} atualizado com sucesso!`);
        setTimeout(() => setMsg(""), 4000);
      }
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      if (status === 409 && data?.code === "TURMA_CONFLITO") {
        setConflitoModal({
          message: data.error || "Conflito de horário detectado em uma ou mais turmas.",
          conflicts: data.conflicts || [],
        });
      } else {
        setMsg(`⚠️ ${data?.error || "Erro ao fixar horário do professor."}`);
      }
    } finally {
      setSalvando(false);
    }
  }

  const profsFiltrados = professores.filter(p =>
    !busca ||
    normText(`${p.nome} ${getDisciplinasNomes(p).join(" ")}`).includes(normText(busca))
  );

  const isProfAtualDirty = !!(profSel && dirty[profSel]);
  const statsAtual = (profSel && statsPorProfessor[profSel]) || {
    totalAlocadas: 0,
    totalFixadas: 0,
    todasFixadas: false,
    previstasMod: 0,
    porTurmaDisc: {},
  };
  const primeiroNomeProfAtual = profAtual ? profAtual.nome.split(" ")[0] : "Professor";

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", display: "flex", flexDirection: "column", gap: 0, flex: 1, minHeight: 0 }}>

      {/* ── Barra superior (mesmo padrão de DisponibilidadePage) ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid #e2e8f0",
        background: "#fff", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✍️</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e3a5f" }}>
                Horário Manual dos Professores
              </h2>
              <BadgeVigenciaHorario config={config} variant="inline" showSubtext={false} />
            </div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
              Espelha o último horário salvo • Ajuste aulas manualmente ou clique em <b>📌 Fixar Horário</b> para blindar o professor no Solver
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Seletor de turno */}
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            {turnos.map(t => (
              <button
                key={t}
                onClick={() => setTurno(t)}
                style={{
                  padding: "8px 18px", border: "none", cursor: "pointer",
                  background: turno === t ? "#2563eb" : "#fff",
                  color:      turno === t ? "#fff"    : "#64748b",
                  fontWeight: 700, fontSize: 12, textTransform: "uppercase",
                  letterSpacing: 0.5, transition: "all 0.18s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Central de Impressão e Exportação PDF em Lote (Todos os Professores / Turmas / Mural) */}
          <button
            type="button"
            onClick={() => setShowModalExportar(true)}
            disabled={carregando || dadosExportacao.totalSlotsTurno === 0}
            title="Imprimir ou baixar PDF em lote (Mosaico 10/folha, 2/folha c/ assinatura, Turmas ou Mural)"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: carregando || dadosExportacao.totalSlotsTurno === 0 ? "#f8fafc" : "#fff",
              color: carregando || dadosExportacao.totalSlotsTurno === 0 ? "#94a3b8" : "#1e3a8a",
              fontWeight: 700,
              fontSize: 12,
              cursor: carregando || dadosExportacao.totalSlotsTurno === 0 ? "not-allowed" : "pointer",
              transition: "all 0.18s",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🖨️ Imprimir / PDF
          </button>

          {/* Limpar grade do professor selecionado */}
          <button
            onClick={limparProfessorAtual}
            disabled={salvando || !profSel}
            title="Limpa os horários preenchidos para o professor selecionado"
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid #fca5a5",
              background: salvando || !profSel ? "#f1f5f9" : "#fff1f2",
              color: salvando || !profSel ? "#94a3b8" : "#dc2626",
              fontWeight: 700, fontSize: 12,
              cursor: salvando || !profSel ? "not-allowed" : "pointer",
              transition: "all 0.18s",
            }}
          >
            🧹 Limpar Professor
          </button>

          {/* Desafixar Horário do Professor (aparece quando o professor possui aulas fixadas) */}
          {statsAtual.totalFixadas > 0 && (
            <button
              onClick={() => salvarProfessorAtual(false, false)}
              disabled={salvando || !profSel}
              title={`Remove a fixação (📌) das aulas de ${primeiroNomeProfAtual} sem apagar o horário`}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#475569",
                fontWeight: 700,
                fontSize: 12,
                cursor: salvando || !profSel ? "not-allowed" : "pointer",
                transition: "all 0.18s",
              }}
            >
              🔓 Desafixar {primeiroNomeProfAtual}
            </button>
          )}

          {/* Botão Único e Claro: Fixar Horário do Professor Selecionado */}
          <button
            onClick={() => salvarProfessorAtual(false, true)}
            disabled={salvando || !profSel}
            title={`Salva e fixa (📌) todas as aulas em tela do(a) professor(a) ${profAtual?.nome || ""}`}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: statsAtual.todasFixadas && !isProfAtualDirty ? "1.5px solid #b45309" : "none",
              background: !profSel
                ? "#e2e8f0"
                : isProfAtualDirty
                ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                : statsAtual.todasFixadas
                ? "linear-gradient(135deg, #d97706, #b45309)"
                : "linear-gradient(135deg, #1e3a5f, #0f172a)",
              color: !profSel ? "#94a3b8" : "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: salvando || !profSel ? "not-allowed" : "pointer",
              transition: "all 0.18s",
              boxShadow: isProfAtualDirty
                ? "0 4px 12px rgba(37,99,235,0.35)"
                : statsAtual.todasFixadas
                ? "0 3px 10px rgba(217,119,6,0.3)"
                : "0 2px 8px rgba(15,23,42,0.2)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {salvando
              ? "Fixando…"
              : statsAtual.todasFixadas && !isProfAtualDirty
              ? `📌 Horário ${primeiroNomeProfAtual} Fixado ✓`
              : `📌 Fixar Horário ${primeiroNomeProfAtual}`}
          </button>
        </div>

        {msg && (
          <div style={{
            width: "100%", textAlign: "center", fontSize: 13, fontWeight: 600,
            color: msg.startsWith("✅") || msg.startsWith("📌") ? "#15803d" : msg.startsWith("⚠️") ? "#b45309" : "#1d4ed8",
            background: msg.startsWith("✅") || msg.startsWith("📌") ? "#f0fdf4" : msg.startsWith("⚠️") ? "#fffbeb" : "#eff6ff",
            padding: "6px 12px", borderRadius: 8,
          }}>
            {msg}
          </div>
        )}
      </div>

      {/* ── Corpo: painel esquerdo + área de dias ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* ── Painel esquerdo — Lista de professores ── */}
        <div style={{
          width: 265, flexShrink: 0,
          borderRight: "1px solid #e2e8f0",
          background: "#f8fafc",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header do painel */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              👤 Professores ({profsFiltrados.length})
            </div>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar professor ou disciplina…"
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 7,
                border: "1px solid #e2e8f0", fontSize: 12,
                background: "#fff", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Lista de professores */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
            {carregando ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 24 }}>Carregando…</div>
            ) : profsFiltrados.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: 20 }}>Nenhum professor</div>
            ) : profsFiltrados.map(p => {
              const sel = p.id === profSel;
              const isDirty = !!dirty[p.id];
              const st = statsPorProfessor[p.id] || { totalAlocadas: 0, totalFixadas: 0, todasFixadas: false, previstasMod: 0 };
              const completo = st.previstasMod > 0 && st.totalAlocadas >= st.previstasMod;

              return (
                <button
                  key={p.id}
                  onClick={() => setProfSel(p.id)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "10px 12px", borderRadius: 9, marginBottom: 4,
                    border: sel
                      ? "2px solid #2563eb"
                      : st.todasFixadas
                      ? "1.5px solid #f59e0b"
                      : "2px solid transparent",
                    background: sel
                      ? "#eff6ff"
                      : st.todasFixadas
                      ? "#fffbeb"
                      : "transparent",
                    cursor: "pointer", transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: sel ? 700 : 600, color: sel ? "#1d4ed8" : "#1e293b", lineHeight: 1.3 }}>
                      {p.nome}
                    </div>
                    {/* Contador de aulas alocadas */}
                    {(st.totalAlocadas > 0 || st.previstasMod > 0) && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 10,
                        flexShrink: 0,
                        background: completo ? "#dcfce7" : st.totalAlocadas > 0 ? "#dbeafe" : "#f1f5f9",
                        color: completo ? "#15803d" : st.totalAlocadas > 0 ? "#1d4ed8" : "#64748b",
                      }}>
                        {st.previstasMod > 0 ? `${st.totalAlocadas}/${st.previstasMod}` : `${st.totalAlocadas}a`}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 5 }}>
                    {getDisciplinasNomes(p).map(d => (
                      <span
                        key={d}
                        style={{
                          background: sel ? "#bfdbfe" : "#e2e8f0",
                          color: sel ? "#1d4ed8" : "#475569",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {d}
                      </span>
                    ))}

                    {/* Badge nítido de Horário Fixado (📌) na lista lateral */}
                    {st.totalFixadas > 0 && (
                      <span
                        title={
                          st.todasFixadas
                            ? `Todas as ${st.totalFixadas} aulas deste professor estão fixadas (📌) e protegidas no Solver`
                            : `${st.totalFixadas} de ${st.totalAlocadas} aulas fixadas manualmente (📌)`
                        }
                        style={{
                          background: st.todasFixadas ? "#f59e0b" : "#fef3c7",
                          color: st.todasFixadas ? "#fff" : "#b45309",
                          border: "1px solid #d97706",
                          padding: "1px 6px",
                          borderRadius: 6,
                          fontSize: 9.5,
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        📌 {st.todasFixadas ? "FIXADO" : `${st.totalFixadas} fixa(s)`}
                      </span>
                    )}
                  </div>

                  {isDirty && (
                    <span
                      title="Alterações não salvas"
                      style={{
                        position: "absolute", bottom: 8, right: 8,
                        width: 8, height: 8, borderRadius: "50%",
                        background: "#f59e0b",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                background: "#f59e0b", border: "1.5px solid #b45309",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: "#fff", flexShrink: 0,
              }}>
                📌
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e" }}>Aula Fixada (Protegida)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: "#2563eb", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>Alocada (Espelho Solver)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px dashed #cbd5e1", background: "#f8fafc", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>Horário Vago / Coord.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>Choque de Turma</span>
            </div>
          </div>
        </div>

        {/* ── Área principal — Cabeçalho do Professor + Cards dos Dias ── */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", background: "#f1f5f9", padding: "20px 16px" }}>

          {/* Pílula do professor selecionado + Status de Fixação + Imprimir */}
          {profAtual ? (
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 20,
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 12,
                background: "#1e3a5f", color: "#fff",
                padding: "10px 22px", borderRadius: 40,
                boxShadow: "0 4px 16px rgba(30,58,95,0.25)",
                flexWrap: "wrap",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: statsAtual.todasFixadas ? "#d97706" : "#2563eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800,
                }}>
                  {profAtual.nome?.[0] || "?"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{profAtual.nome}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {getDisciplinasNomes(profAtual).map(d => (
                      <span key={d} style={{
                        background: "rgba(255,255,255,0.25)",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {d}
                      </span>
                    ))}
                    <span style={{
                      background: "rgba(0,0,0,0.15)",
                      color: "#93c5fd",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}>
                      {turno.charAt(0).toUpperCase() + turno.slice(1)}
                    </span>
                  </div>
                </div>

                <div style={{
                  background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 700,
                }}>
                  {statsAtual.previstasMod > 0
                    ? `${statsAtual.totalAlocadas} / ${statsAtual.previstasMod} aulas alocadas`
                    : `${statsAtual.totalAlocadas} aulas alocadas`}
                </div>

                {/* Selo Nítido de Status de Fixação no Cabeçalho Central (substitui o antigo botão Salvar duplicado) */}
                {isProfAtualDirty ? (
                  <button
                    type="button"
                    onClick={() => salvarProfessorAtual(false, true)}
                    disabled={salvando}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: "1px solid #fcd34d",
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "#fff",
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: salvando ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 8px rgba(245,158,11,0.35)",
                    }}
                  >
                    {salvando ? "Fixando…" : `📌 Confirmar e Fixar Alterações`}
                  </button>
                ) : statsAtual.todasFixadas ? (
                  <span
                    title="Todas as aulas deste professor estão fixadas manualmente e protegidas contra alterações no Solver"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "#fff",
                      border: "1px solid #fde68a",
                      borderRadius: 20,
                      padding: "5px 14px",
                      fontSize: 11.5,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      boxShadow: "0 2px 8px rgba(217,119,6,0.35)",
                    }}
                  >
                    📌 HORÁRIO FIXADO ({statsAtual.totalFixadas}/{statsAtual.totalAlocadas})
                  </span>
                ) : statsAtual.totalFixadas > 0 ? (
                  <button
                    type="button"
                    onClick={() => salvarProfessorAtual(false, true)}
                    disabled={salvando}
                    title={`Clique para salvar e fixar todas as aulas de ${primeiroNomeProfAtual}`}
                    style={{
                      background: "rgba(245, 158, 11, 0.25)",
                      color: "#fde68a",
                      border: "1px solid rgba(253, 230, 138, 0.5)",
                      borderRadius: 20,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: salvando ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    📌 {statsAtual.totalFixadas} de {statsAtual.totalAlocadas} aulas fixadas
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => salvarProfessorAtual(false, true)}
                    disabled={salvando}
                    title={`Clique para salvar e fixar o horário de ${primeiroNomeProfAtual}`}
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      color: "#cbd5e1",
                      border: "1px dashed rgba(255,255,255,0.3)",
                      borderRadius: 20,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: salvando ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    🔓 Espelho do Rascunho (Não fixado)
                  </button>
                )}

                {/* Botão Imprimir Horário Individual do Professor */}
                <button
                  type="button"
                  onClick={() => {
                    imprimirHorarioProfessorUnico({
                      profId: profAtual.id,
                      gradePorProfessor: grid,
                      nomesTurmas: dadosExportacao.nomesTurmas,
                      nomesDisciplinas: dadosExportacao.nomesDisciplinas,
                      nomesProfessores: dadosExportacao.nomesProfessores,
                      diasSemana: diasLetivos,
                      periodosPorDia: nPeriodos,
                      turno,
                      config,
                    });
                  }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.4)",
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  title="Imprimir horário individual deste professor"
                >
                  🖨️ Imprimir
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: "center", color: "#94a3b8", fontSize: 14, marginBottom: 20,
              background: "#fff", borderRadius: 12, padding: "16px 24px",
              border: "2px dashed #e2e8f0",
            }}>
              ← Selecione um professor na lista para visualizar ou fixar o horário manual
            </div>
          )}

          {/* Cards dos dias (SEGUNDA a SEXTA / SÁBADO) */}
          {carregando ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Carregando…</div>
          ) : (
            <div style={{ display: "flex", gap: 12, flexWrap: "nowrap", justifyContent: "stretch", width: "100%" }}>
              {dias.map(d => (
                <div
                  key={d.num}
                  style={{
                    flex: 1,
                    background: "#fff",
                    borderRadius: 16,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                    border: "1px solid #e2e8f0",
                    padding: "14px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 165,
                  }}
                >
                  {/* Nome do dia */}
                  <div style={{
                    fontSize: 12, fontWeight: 800, color: "#1e3a5f",
                    textTransform: "uppercase", letterSpacing: 0.8,
                    paddingBottom: 8, borderBottom: "2px solid #e2e8f0", width: "100%", textAlign: "center",
                  }}>
                    {d.nome}
                  </div>

                  {/* Slots de 1º até nPeriodosº */}
                  {Array.from({ length: nPeriodos }, (_, i) => i + 1).map(ordem => {
                    const cellValue = (profSel && grid[profSel]?.[d.num]?.[ordem]) || null;
                    const ocupacaoSlot = ocupacaoPorSlot?.[d.num]?.[ordem] || {};

                    return (
                      <SlotTurmaCombobox
                        key={ordem}
                        ordem={ordem}
                        diaNome={d.nome}
                        disabled={!profSel}
                        value={cellValue}
                        opcoesModuladas={opcoesModuladas}
                        opcoesDemais={opcoesDemais}
                        alocadosCountMap={statsAtual.porTurmaDisc}
                        ocupacaoMap={ocupacaoSlot}
                        mostrarDiscNoCard={mostrarDiscNoCard}
                        horarioInfo={horariosTurnoAtivo?.[ordem] || horariosTurnoAtivo?.[String(ordem)] || null}
                        onSelect={op => handleSelectSlot(d.num, ordem, op)}
                        onToggleLock={() => handleToggleSlotLock(d.num, ordem)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Painel inferior: Resumo das Turmas Moduladas para conferência rápida */}
          {profAtual && !carregando && (
            <div style={{
              marginTop: 24, background: "#fff", padding: "18px 24px",
              borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e3a5f", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📊</span> Conferência de Modulação — {profAtual.nome.split(" ")[0]}
                </h3>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Clique em qualquer card acima para alterar a turma, no ícone <b>📌</b> para fixar uma aula isolada ou em <b>📌 Fixar Horário {primeiroNomeProfAtual}</b> para fixar todas
                </span>
              </div>

              {opcoesModuladas.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  ℹ️ Este professor ainda não possui turmas vinculadas no módulo <b>Modulação</b> para este turno. Você pode selecionar qualquer turma do turno diretamente nos cards acima.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {opcoesModuladas.map(op => {
                    const alocadas = statsAtual.porTurmaDisc[`${op.turma_id}-${op.disciplina_id}`] || 0;
                    const previstas = Number(op.aulas_previstas) || 0;
                    const ok = previstas > 0 && alocadas === previstas;
                    const excesso = previstas > 0 && alocadas > previstas;

                    return (
                      <div
                        key={op.key}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 12px",
                          borderRadius: 10,
                          border: ok
                            ? "1px solid #86efac"
                            : excesso
                            ? "1px solid #fcd34d"
                            : "1px solid #cbd5e1",
                          background: ok ? "#f0fdf4" : excesso ? "#fffbeb" : "#f8fafc",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>{op.turma_nome}</span>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>({op.disciplina_nome})</span>
                        <span style={{
                          fontWeight: 800,
                          fontSize: 11,
                          padding: "1px 7px",
                          borderRadius: 8,
                          background: ok ? "#22c55e" : excesso ? "#f59e0b" : "#e2e8f0",
                          color: ok || excesso ? "#fff" : "#475569",
                        }}>
                          {alocadas}/{previstas} {ok ? "✓" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Premium de Confirmação de Fixação de Horário (📌) ── */}
      {fixadoModal && (
        <div
          onClick={() => setFixadoModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.68)",
            backdropFilter: "blur(6px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 520,
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.45)",
              border: "1px solid #fde68a",
            }}
          >
            {/* Header Premium */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 60%, #78350f 100%)",
                padding: "22px 26px",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "2px solid #fde68a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  flexShrink: 0,
                  boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
                }}
              >
                📌
              </div>
              <div>
                <span
                  style={{
                    background: "rgba(245, 158, 11, 0.25)",
                    border: "1px solid rgba(253, 230, 138, 0.5)",
                    color: "#fde68a",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 9px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "inline-block",
                    marginBottom: 5,
                  }}
                >
                  Horário Blindado no Solver • Turno {turno.toUpperCase()}
                </span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>
                  Horário de {fixadoModal.primeiroNome} Fixado!
                </h3>
              </div>
            </div>

            {/* Corpo do Modal */}
            <div style={{ padding: "24px 26px" }}>
              <p style={{ margin: "0 0 18px", fontSize: 14, color: "#334155", lineHeight: 1.6, fontWeight: 500 }}>
                Todas as <strong>{fixadoModal.totalFixadas} aulas</strong> do(a) professor(a){" "}
                <strong style={{ color: "#1e3a5f" }}>{fixadoModal.profNome}</strong> foram{" "}
                <strong style={{ color: "#b45309" }}>fixadas manualmente (📌)</strong>.
              </p>

              <div
                style={{
                  background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                  border: "1.5px solid #f59e0b",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>🛡️</span>
                <div style={{ fontSize: 12.5, color: "#78350f", lineHeight: 1.5, fontWeight: 600 }}>
                  Mesmo em uma nova tentativa de geração de horário na aba <b>⚡ Gerar Horário</b> (com a opção{" "}
                  <i>"📌 Respeitar Aulas Fixas"</i> ativa), o horário deste(a) professor(a){" "}
                  <b>não sofrerá alterações</b>.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 22,
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Aulas Protegidas
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#b45309", marginTop: 2 }}>
                    📌 {fixadoModal.totalFixadas} aulas fixas
                  </div>
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Como Desafixar?
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#334155", marginTop: 3 }}>
                    Botão 🔓 Desafixar {fixadoModal.primeiroNome}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setFixadoModal(null)}
                  style={{
                    width: "100%",
                    padding: "12px 24px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  ✅ Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Conflito de Turma (opção de revisar ou substituir) ── */}
      {conflitoModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", width: 460, maxWidth: "92%", borderRadius: 16, padding: 28,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
            textAlign: "center",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "#fef2f2",
              color: "#dc2626", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              ⚠️
            </div>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, color: "#1e293b", fontWeight: 700 }}>
              Choque de Horário na Turma
            </h3>
            <p style={{ margin: "0 0 20px", color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
              {conflitoModal.message}
              <br /><br />
              Deseja revisar o horário ou substituir o professor anterior nesta(s) aula(s)?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setConflitoModal(null)}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "1px solid #cbd5e1",
                  background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >
                Revisar Horário
              </button>
              <button
                onClick={() => salvarProfessorAtual(true, true)}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                Substituir e Fixar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Central Oficial de Impressão e Exportação PDF (Individual e Lote Mosaico) ── */}
      <ExportarHorarioModal
        aberto={showModalExportar}
        onFechar={() => setShowModalExportar(false)}
        resultado={dadosExportacao.resultado}
        turno={turno}
        nomesTurmas={dadosExportacao.nomesTurmas}
        nomesDisciplinas={dadosExportacao.nomesDisciplinas}
        nomesProfessores={dadosExportacao.nomesProfessores}
        diasSemana={diasLetivos}
        periodosPorDia={nPeriodos}
        config={config}
        modoInicial="por_professor"
      />
    </div>
  );
}
