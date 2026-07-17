// src/features/secretaria/horarios/WizardConfiguracaoGrade.jsx
// ============================================================
// Wizard premium multi-step para configurar a grade horaria
// de cada escola (multi-escola). 4 passos guiados.
// ============================================================
import React, { useState } from "react";
import api from "../../../services/api";

const TURNOS_CONFIG = [
  { id: "matutino",   label: "Matutino",   emoji: "☀️",  desc: "Manhã",  periodos_default: 5 },
  { id: "vespertino", label: "Vespertino", emoji: "🌤️", desc: "Tarde",  periodos_default: 5 },
  { id: "noturno",    label: "Noturno",    emoji: "🌙",  desc: "Noite", periodos_default: 4 },
];

const DIAS_SEMANA = [
  { num: 1, label: "Seg", nome: "Segunda" },
  { num: 2, label: "Ter", nome: "Terça"   },
  { num: 3, label: "Qua", nome: "Quarta"  },
  { num: 4, label: "Qui", nome: "Quinta"  },
  { num: 5, label: "Sex", nome: "Sexta"   },
  { num: 6, label: "Sáb", nome: "Sábado"  },
];

const S = {
  outer: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px", fontFamily: "'Montserrat', sans-serif",
  },
  card: {
    width: "100%", maxWidth: 700,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 24, padding: "48px 44px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
    color: "#f1f5f9",
  },
};

function Pill({ children, color = "#3b82f6" }) {
  return (
    <span style={{
      background: color + "30", border: `1px solid ${color}`,
      borderRadius: 8, padding: "4px 12px", fontSize: 13,
      color, fontWeight: 600, display: "inline-block",
    }}>{children}</span>
  );
}

function ResumoCard({ icon, titulo, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, padding: "16px 20px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          {titulo}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

export default function WizardConfiguracaoGrade({ onConcluir }) {
  const [passo, setPasso]       = useState(1);
  const [turnos, setTurnos]     = useState(["matutino", "vespertino"]);
  const [dias, setDias]         = useState([1, 2, 3, 4, 5]);
  const [periodos, setPeriodos] = useState({ matutino: 5, vespertino: 5, noturno: 4 });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");

  const toggleTurno = (id) =>
    setTurnos(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const toggleDia = (num) =>
    setDias(prev =>
      prev.includes(num) ? prev.filter(d => d !== num) : [...prev, num].sort((a, b) => a - b)
    );

  const setPeriodoTurno = (turnoId, n) =>
    setPeriodos(prev => ({ ...prev, [turnoId]: n }));

  const podeAvancar =
    (passo === 1 && turnos.length > 0) ||
    (passo === 2 && dias.length > 0)   ||
    (passo === 3 && turnos.every(t => (periodos[t] || 0) > 0)) ||
    passo === 4;

  async function confirmar() {
    setSalvando(true); setErro("");
    try {
      const periodosAtivos = {};
      turnos.forEach(t => { periodosAtivos[t] = periodos[t] || 5; });
      await api.post("/api/escola/configuracao-grade", {
        turnos, dias_semana: dias, periodos: periodosAtivos,
      });
      onConcluir({ turnos, dias_semana: dias, periodos: periodosAtivos });
    } catch {
      setErro("Erro ao salvar. Verifique sua conexão e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const passoLabels = ["Turnos", "Dias Letivos", "Períodos", "Revisão"];

  return (
    <div style={S.outer}>
      <div style={S.card}>
        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>⚙️</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
            Configuração da Grade Horária
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            Configure uma vez — o sistema se adapta à realidade da sua escola.
          </p>
        </div>

        {/* ── Stepper ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 48 }}>
          {passoLabels.map((label, idx) => {
            const num = idx + 1;
            const ativo = num === passo;
            const concluido = num < passo;
            return (
              <React.Fragment key={num}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: concluido ? "#10b981" : ativo ? "#3b82f6" : "rgba(255,255,255,0.08)",
                    border: ativo ? "2px solid #60a5fa" : "2px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: "#fff",
                    boxShadow: ativo ? "0 0 18px rgba(59,130,246,0.55)" : "none",
                    transition: "all 0.35s",
                  }}>
                    {concluido ? "✓" : num}
                  </div>
                  <span style={{ fontSize: 11, color: ativo ? "#93c5fd" : "#475569", fontWeight: ativo ? 700 : 400 }}>
                    {label}
                  </span>
                </div>
                {idx < 3 && (
                  <div style={{
                    height: 2, width: 64, margin: "0 6px", marginBottom: 22,
                    background: concluido ? "#10b981" : "rgba(255,255,255,0.08)",
                    transition: "background 0.35s",
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Conteúdo ── */}
        <div style={{ minHeight: 260 }}>

          {/* PASSO 1 — Turnos */}
          {passo === 1 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 19, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                Quais turnos a escola oferece?
              </h2>
              <p style={{ textAlign: "center", color: "#475569", fontSize: 13, marginBottom: 32 }}>
                Selecione todos os turnos ativos. Você poderá ajustar depois.
              </p>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                {TURNOS_CONFIG.map(t => {
                  const sel = turnos.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTurno(t.id)} style={{
                      width: 170, padding: "26px 16px", borderRadius: 18,
                      border: sel ? "2px solid #3b82f6" : "2px solid rgba(255,255,255,0.1)",
                      background: sel ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
                      cursor: "pointer", color: "#fff", transition: "all 0.22s",
                      boxShadow: sel ? "0 0 22px rgba(59,130,246,0.35)" : "none",
                      transform: sel ? "translateY(-3px) scale(1.03)" : "scale(1)",
                    }}>
                      <div style={{ fontSize: 38, marginBottom: 10 }}>{t.emoji}</div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{t.desc}</div>
                      {sel && <div style={{ marginTop: 10, color: "#60a5fa", fontSize: 12, fontWeight: 600 }}>✓ Selecionado</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSO 2 — Dias letivos */}
          {passo === 2 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 19, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                Quais são os dias letivos?
              </h2>
              <p style={{ textAlign: "center", color: "#475569", fontSize: 13, marginBottom: 32 }}>
                Selecione os dias em que a escola tem aulas normalmente.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {DIAS_SEMANA.map(d => {
                  const sel = dias.includes(d.num);
                  return (
                    <button key={d.num} onClick={() => toggleDia(d.num)} style={{
                      width: 82, height: 82, borderRadius: 16,
                      border: sel ? "2px solid #10b981" : "2px solid rgba(255,255,255,0.1)",
                      background: sel ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.04)",
                      cursor: "pointer", color: "#fff", transition: "all 0.22s",
                      boxShadow: sel ? "0 0 18px rgba(16,185,129,0.35)" : "none",
                      transform: sel ? "translateY(-3px) scale(1.05)" : "scale(1)",
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{d.label}</div>
                      <div style={{ color: sel ? "#6ee7b7" : "#475569", fontSize: 11, marginTop: 4 }}>{d.nome}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSO 3 — Períodos por turno */}
          {passo === 3 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 19, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                Quantas aulas por dia em cada turno?
              </h2>
              <p style={{ textAlign: "center", color: "#475569", fontSize: 13, marginBottom: 32 }}>
                Isso define os horários disponíveis na grade de disponibilidade dos professores.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {TURNOS_CONFIG.filter(t => turnos.includes(t.id)).map(t => (
                  <div key={t.id} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14, padding: "20px 24px",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{t.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>aulas por dia</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(t.id === "noturno" ? [3, 4, 5] : [4, 5, 6, 7]).map(n => (
                        <button key={n} onClick={() => setPeriodoTurno(t.id, n)} style={{
                          width: 46, height: 46, borderRadius: 10,
                          border: periodos[t.id] === n ? "2px solid #f59e0b" : "2px solid rgba(255,255,255,0.1)",
                          background: periodos[t.id] === n ? "rgba(245,158,11,0.22)" : "rgba(255,255,255,0.04)",
                          color: periodos[t.id] === n ? "#fbbf24" : "#64748b",
                          fontWeight: 800, fontSize: 17, cursor: "pointer", transition: "all 0.18s",
                          boxShadow: periodos[t.id] === n ? "0 0 14px rgba(245,158,11,0.45)" : "none",
                          transform: periodos[t.id] === n ? "scale(1.12)" : "scale(1)",
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 4 — Revisão */}
          {passo === 4 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 19, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                Tudo pronto! Revise antes de confirmar.
              </h2>
              <p style={{ textAlign: "center", color: "#475569", fontSize: 13, marginBottom: 28 }}>
                Você pode ajustar estas configurações depois.
              </p>

              <ResumoCard icon="🔄" titulo="Turnos ativos">
                {turnos.map(t => {
                  const cfg = TURNOS_CONFIG.find(x => x.id === t);
                  return <Pill key={t} color="#3b82f6">{cfg?.emoji} {cfg?.label}</Pill>;
                })}
              </ResumoCard>

              <ResumoCard icon="📅" titulo="Dias letivos">
                {DIAS_SEMANA.filter(d => dias.includes(d.num)).map(d => (
                  <Pill key={d.num} color="#10b981">{d.nome}</Pill>
                ))}
              </ResumoCard>

              <ResumoCard icon="⏱️" titulo="Períodos por turno">
                {turnos.map(t => {
                  const cfg = TURNOS_CONFIG.find(x => x.id === t);
                  return (
                    <Pill key={t} color="#f59e0b">
                      {cfg?.emoji} {cfg?.label}: {periodos[t]} aulas/dia
                    </Pill>
                  );
                })}
              </ResumoCard>

              {erro && (
                <p style={{ color: "#f87171", textAlign: "center", marginTop: 16, fontSize: 13 }}>
                  {erro}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Navegação ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 44 }}>
          <button onClick={() => setPasso(p => p - 1)} disabled={passo === 1} style={{
            padding: "12px 24px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: passo === 1 ? "#334155" : "#94a3b8",
            cursor: passo === 1 ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 500, transition: "all 0.2s",
          }}>← Voltar</button>

          {/* dots */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[1,2,3,4].map(n => (
              <div key={n} style={{
                width: n === passo ? 22 : 8, height: 8, borderRadius: 4,
                background: n <= passo ? "#3b82f6" : "rgba(255,255,255,0.12)",
                transition: "all 0.3s",
              }} />
            ))}
          </div>

          {passo < 4 ? (
            <button onClick={() => podeAvancar && setPasso(p => p + 1)} disabled={!podeAvancar} style={{
              padding: "12px 28px", borderRadius: 10,
              background: podeAvancar
                ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                : "rgba(255,255,255,0.06)",
              border: "none",
              color: podeAvancar ? "#fff" : "#334155",
              cursor: podeAvancar ? "pointer" : "not-allowed",
              fontSize: 14, fontWeight: 700,
              boxShadow: podeAvancar ? "0 4px 18px rgba(59,130,246,0.45)" : "none",
              transition: "all 0.22s",
            }}>Próximo →</button>
          ) : (
            <button onClick={confirmar} disabled={salvando} style={{
              padding: "12px 32px", borderRadius: 10,
              background: salvando
                ? "rgba(255,255,255,0.06)"
                : "linear-gradient(135deg, #10b981, #059669)",
              border: "none", color: "#fff",
              cursor: salvando ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 700,
              boxShadow: salvando ? "none" : "0 4px 18px rgba(16,185,129,0.45)",
              transition: "all 0.22s",
            }}>
              {salvando ? "Salvando…" : "✓ Confirmar e Começar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
