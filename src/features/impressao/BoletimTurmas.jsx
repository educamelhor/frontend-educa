// src/features/impressao/BoletimTurmas.jsx
// ============================================================================
// Módulo IMPRESSÃO DE BOLETINS — Geração em lote por turma.
// v3 — Design premium, filtro pelo ano letivo mais recente, cards single-line.
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import {
  PrinterIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// ─── Constantes ───
const TURNOS = ["Matutino", "Vespertino", "Noturno"];

const TURNO_CONFIG = {
  Matutino:   { gradientStyle: "linear-gradient(135deg,#f59e0b,#ea580c)", borderColor: "#f59e0b", bgHover: "#fffbeb", emoji: "🌅" },
  Vespertino: { gradientStyle: "linear-gradient(135deg,#38bdf8,#2563eb)", borderColor: "#38bdf8", bgHover: "#f0f9ff", emoji: "☀️" },
  Noturno:    { gradientStyle: "linear-gradient(135deg,#818cf8,#7c3aed)", borderColor: "#818cf8", bgHover: "#f5f3ff", emoji: "🌙" },
};

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export default function BoletimTurmas() {
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [todosOsAnos, setTodosOsAnos] = useState([]); // todos os anos letivos disponíveis
  const [anoLetivo, setAnoLetivo] = useState(null);   // ano atualmente selecionado
  const [todasTurmas, setTodasTurmas] = useState([]); // todas as turmas (todos os anos)
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  const [progress, setProgress] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [turmaSendoGerada, setTurmaSendoGerada] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [turmasSucesso, setTurmasSucesso] = useState(new Set());

  // ── Buscar turmas e detectar todos os anos letivos disponíveis ──
  useEffect(() => {
    (async () => {
      setLoadingTurmas(true);
      try {
        const escola_id = localStorage.getItem("escola_id") || 1;
        const { data } = await api.get("/api/turmas", { params: { escola_id } });
        const todas = data || [];

        // Detecta todos os anos presentes
        const anosUnicos = [...new Set(
          todas.map((t) => Number(t.ano)).filter((a) => a > 2000)
        )].sort((a, b) => b - a); // decrescente (mais recente primeiro)

        const maiorAno = anosUnicos.length > 0 ? anosUnicos[0] : new Date().getFullYear();

        setTodosOsAnos(anosUnicos);
        setTodasTurmas(todas);
        setAnoLetivo(String(maiorAno));
        setTurmas(todas.filter((t) => Number(t.ano) === maiorAno));
      } catch {
        setAnoLetivo(String(new Date().getFullYear()));
        setTodasTurmas([]);
        setTodosOsAnos([]);
        setTurmas([]);
      } finally {
        setLoadingTurmas(false);
      }
    })();
  }, []);

  // ── Quando o ano selecionado muda, filtra as turmas correspondentes ──
  const handleChangeAno = (novoAno) => {
    setAnoLetivo(novoAno);
    setTurmas(todasTurmas.filter((t) => Number(t.ano) === Number(novoAno)));
    setTurnoSelecionado(null); // reseta turno ao trocar o ano
    setTurmasSucesso(new Set());
  };

  // ─── Turmas filtradas por turno ───
  const turmasFiltradas = useMemo(
    () =>
      turmas
        .filter((t) => turnoSelecionado && norm(t.turno) === norm(turnoSelecionado))
        .sort((a, b) => (a.turma || "").localeCompare(b.turma || "", "pt-BR")),
    [turmas, turnoSelecionado]
  );

  // ─── Gerar boletins ───
  const handleGerarBoletins = async (turma) => {
    if (gerando) return;
    setGerando(true);
    setTurmaSendoGerada(turma.id);
    setProgress(20);
    setSucesso(false);

    try {
      const { data } = await api.post(
        "/api/boletins/gerar",
        { turma_id: turma.id, ano: anoLetivo ? Number(anoLetivo) : undefined },
        { responseType: "blob", timeout: 180000 }
      );

      setProgress(85);

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Boletins_${(turma.turma || "turma").replace(/\s/g, "")}_${anoLetivo || ""}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setProgress(100);
      setSucesso(true);
      setTurmasSucesso((prev) => new Set([...prev, turma.id]));

      setTimeout(() => {
        setProgress(0);
        setGerando(false);
        setTurmaSendoGerada(null);
        setSucesso(false);
      }, 2200);
    } catch {
      setGerando(false);
      setTurmaSendoGerada(null);
      setProgress(0);
      setSucesso(false);
      alert("Erro ao gerar boletins. Tente novamente.");
    }
  };

  const handleClickTurno = (turno) => {
    setTurnoSelecionado(turno);
    setSucesso(false);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ══════════════════════════════════════════════
          HERO HEADER
      ══════════════════════════════════════════════ */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0c4a6e 100%)",
          borderRadius: 20,
          padding: "32px 40px",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Glow orbs */}
        <div style={{
          position: "absolute", top: -60, right: -60, width: 220, height: 220,
          background: "radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: "30%", width: 160, height: 160,
          background: "radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />

        {/* Título */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <PrinterIcon style={{ width: 28, height: 28, color: "#fff" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{
                margin: 0, color: "#fff", fontSize: 28, fontWeight: 800,
                fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.5px",
              }}>
                🖨️ Impressão de Boletins
              </h1>
              {/* Seletor de Ano Letivo */}
              {todosOsAnos.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    padding: "3px 8px", borderRadius: 99,
                    background: "rgba(56,189,248,0.15)",
                    border: "1px solid rgba(56,189,248,0.35)",
                    color: "#7dd3fc", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>Ano Letivo</span>
                  <select
                    value={anoLetivo || ""}
                    onChange={(e) => !gerando && handleChangeAno(e.target.value)}
                    disabled={gerando}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(56,189,248,0.4)",
                      color: "#e0f2fe",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: gerando ? "not-allowed" : "pointer",
                      outline: "none",
                    }}
                  >
                    {todosOsAnos.map((ano) => (
                      <option key={ano} value={String(ano)} style={{ background: "#1e3a5f", color: "#fff" }}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 14 }}>
              Selecione o turno e clique na turma para gerar e baixar o PDF dos boletins.
            </p>
          </div>
        </div>

        {/* Mini stats dos turnos */}
        <div style={{
          position: "relative", marginTop: 24,
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
        }}>
          {TURNOS.map((turno) => {
            const cfg = TURNO_CONFIG[turno];
            const count = loadingTurmas ? "—" : turmas.filter((t) => norm(t.turno) === norm(turno)).length;
            return (
              <div key={turno} style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: "10px 14px", textAlign: "center",
              }}>
                <div style={{ fontSize: 20 }}>{cfg.emoji}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13, marginTop: 2 }}>{turno}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 1 }}>
                  {count} turma{count !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          STEP 1 — TURNO
      ══════════════════════════════════════════════ */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          margin: "0 0 14px", fontSize: 15, fontWeight: 700,
          color: "#1e293b", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: 8,
            background: "#e0f2fe", color: "#0369a1",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, flexShrink: 0,
          }}>1</span>
          Selecione o Turno
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {TURNOS.map((turno) => {
            const cfg = TURNO_CONFIG[turno];
            const isActive = turnoSelecionado === turno;
            const count = loadingTurmas ? "—" : turmas.filter((t) => norm(t.turno) === norm(turno)).length;

            return (
              <button
                key={turno}
                onClick={() => !gerando && handleClickTurno(turno)}
                disabled={gerando}
                aria-label={`Selecionar turno ${turno}`}
                style={{
                  position: "relative", overflow: "hidden",
                  borderRadius: 16, padding: "18px 16px", textAlign: "left",
                  cursor: gerando ? "not-allowed" : "pointer",
                  border: isActive ? "2px solid transparent" : "2px solid #e2e8f0",
                  background: isActive ? cfg.gradientStyle : "#fff",
                  boxShadow: isActive
                    ? "0 8px 28px rgba(0,0,0,0.18)"
                    : "0 1px 4px rgba(0,0,0,0.06)",
                  transform: isActive ? "scale(1.02)" : "scale(1)",
                  transition: "all 0.2s ease",
                  opacity: gerando ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !gerando) {
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
                    e.currentTarget.style.transform = "scale(1.01)";
                    e.currentTarget.style.borderColor = cfg.borderColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>{cfg.emoji}</div>
                <div style={{
                  fontWeight: 800, fontSize: 17,
                  color: isActive ? "#fff" : "#1e293b",
                }}>
                  {turno}
                </div>
                <div style={{
                  fontSize: 12, marginTop: 2,
                  color: isActive ? "rgba(255,255,255,0.75)" : "#64748b",
                }}>
                  {count} turma{count !== 1 ? "s" : ""} disponível{count !== 1 ? "s" : ""}
                </div>
                {isActive && (
                  <CheckCircleIcon style={{
                    position: "absolute", top: 12, right: 12,
                    width: 20, height: 20, color: "rgba(255,255,255,0.9)",
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          STEP 2 — TURMAS
      ══════════════════════════════════════════════ */}
      {turnoSelecionado && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{
            margin: "0 0 14px", fontSize: 15, fontWeight: 700,
            color: "#1e293b", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: 8,
              background: "#d1fae5", color: "#065f46",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, flexShrink: 0,
            }}>2</span>
            Turmas — {turnoSelecionado}
            <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8", marginLeft: 2 }}>
              (clique para baixar o PDF)
            </span>
          </h2>

          {loadingTurmas ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "32px", color: "#64748b", justifyContent: "center",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                border: "2px solid #e2e8f0", borderTopColor: "#0ea5e9",
                animation: "spin 0.8s linear infinite",
              }} />
              Carregando turmas...
            </div>
          ) : turmasFiltradas.length > 0 ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 10,
            }}>
              {turmasFiltradas.map((turma) => {
                const isThisGerando = gerando && turmaSendoGerada === turma.id;
                const jaSucesso = turmasSucesso.has(turma.id);
                const isDisabled = gerando && !isThisGerando;

                return (
                  <button
                    key={turma.id}
                    onClick={() => handleGerarBoletins(turma)}
                    disabled={gerando}
                    title={`Gerar boletins — ${turma.turma}`}
                    aria-label={`Gerar boletins da turma ${turma.turma}`}
                    style={{
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: 6, padding: "12px 8px",
                      minHeight: 86,
                      borderRadius: 12,
                      border: isThisGerando
                        ? "2px solid #38bdf8"
                        : jaSucesso
                        ? "2px solid #34d399"
                        : "2px solid #e2e8f0",
                      background: isThisGerando
                        ? "#f0f9ff"
                        : jaSucesso
                        ? "#f0fdf4"
                        : "#fff",
                      cursor: gerando ? (isThisGerando ? "wait" : "not-allowed") : "pointer",
                      opacity: isDisabled ? 0.45 : 1,
                      boxShadow: (isThisGerando || jaSucesso)
                        ? "0 4px 14px rgba(0,0,0,0.1)"
                        : "0 1px 3px rgba(0,0,0,0.06)",
                      transform: isThisGerando ? "scale(0.96)" : "scale(1)",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!gerando && !jaSucesso) {
                        e.currentTarget.style.borderColor = "#38bdf8";
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(14,165,233,0.18)";
                        e.currentTarget.style.transform = "scale(1.04)";
                        e.currentTarget.style.background = "#f0f9ff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!gerando && !jaSucesso) {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.background = "#fff";
                      }
                    }}
                  >
                    {/* Ícone */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: isThisGerando ? "#e0f2fe" : jaSucesso ? "#d1fae5" : "#f1f5f9",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isThisGerando ? (
                        <div style={{
                          width: 14, height: 14, borderRadius: "50%",
                          border: "2px solid #bae6fd", borderTopColor: "#0284c7",
                          animation: "spin 0.8s linear infinite",
                        }} />
                      ) : jaSucesso ? (
                        <CheckCircleIcon style={{ width: 16, height: 16, color: "#059669" }} />
                      ) : (
                        <ArrowDownTrayIcon style={{ width: 16, height: 16, color: "#94a3b8" }} />
                      )}
                    </div>

                    {/* Nome da turma — SEMPRE UMA LINHA */}
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: isThisGerando ? "#0284c7" : jaSucesso ? "#059669" : "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                      lineHeight: 1.2,
                    }}>
                      {turma.turma}
                    </span>

                    {/* Status */}
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: isThisGerando ? "#38bdf8" : jaSucesso ? "#34d399" : "#cbd5e1",
                      whiteSpace: "nowrap", lineHeight: 1,
                    }}>
                      {isThisGerando ? "Gerando..." : jaSucesso ? "✓ Baixado!" : "Gerar PDF"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "40px 24px", borderRadius: 16,
              border: "2px dashed #e2e8f0", background: "#f8fafc",
              gap: 8, color: "#64748b",
            }}>
              <AcademicCapIcon style={{ width: 40, height: 40, color: "#cbd5e1" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Nenhuma turma encontrada</p>
              <p style={{ margin: 0, fontSize: 12, textAlign: "center" }}>
                Não há turmas do turno {turnoSelecionado} no ano letivo {anoLetivo}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          BARRA DE PROGRESSO
      ══════════════════════════════════════════════ */}
      {gerando && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            width: "100%", height: 6, borderRadius: 99,
            background: "#e2e8f0", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, #0ea5e9, #2563eb)",
              boxShadow: "0 0 12px rgba(14,165,233,0.5)",
              width: `${progress}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 6, fontSize: 12, color: "#64748b",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                border: "1.5px solid #e2e8f0", borderTopColor: "#0ea5e9",
                animation: "spin 0.8s linear infinite", flexShrink: 0,
              }} />
              Gerando PDF dos boletins...
            </span>
            <span style={{ fontWeight: 700, color: "#0ea5e9" }}>{progress}%</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUCESSO
      ══════════════════════════════════════════════ */}
      {sucesso && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 20px", borderRadius: 14,
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          boxShadow: "0 4px 16px rgba(52,211,153,0.15)",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#d1fae5",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <SparklesIcon style={{ width: 20, height: 20, color: "#059669" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#065f46" }}>
              Boletins gerados com sucesso!
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#059669" }}>
              O PDF foi baixado automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* Keyframe para spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
