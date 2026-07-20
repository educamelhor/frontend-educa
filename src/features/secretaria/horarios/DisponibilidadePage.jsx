// src/features/secretaria/horarios/DisponibilidadePage.jsx
// ============================================================
// Layout redesenhado: painel esquerdo de professores + cards de dias
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

// ── Constantes ────────────────────────────────────────────────
const DIAS = [
  { num: 1, nome: "Segunda" },
  { num: 2, nome: "Terça"   },
  { num: 3, nome: "Quarta"  },
  { num: 4, nome: "Quinta"  },
  { num: 5, nome: "Sexta"   },
  { num: 6, nome: "Sábado"  },
];

const STATUS_CICLO = ["livre", "evitar", "indisponivel"];

const STATUS_STYLE = {
  livre:        { bg: "#22c55e", hover: "#16a34a", label: "Livre",         text: "#fff" },
  evitar:       { bg: "#f59e0b", hover: "#d97706", label: "Evitar",        text: "#fff" },
  indisponivel: { bg: "#ef4444", hover: "#dc2626", label: "Excluir",       text: "#fff" },
};

function proxStatus(s) {
  const idx = STATUS_CICLO.indexOf(s);
  return STATUS_CICLO[(idx + 1) % STATUS_CICLO.length];
}

// ── Componente principal ───────────────────────────────────────
export default function DisponibilidadePage({ config, turnoInicial, highlightProfId = null }) {
  const turnos           = config?.turnos      || ["matutino", "vespertino"];
  const diasLetivos      = config?.dias_semana || [1, 2, 3, 4, 5];
  const periodosPorTurno = config?.periodos    || { matutino: 5, vespertino: 5 };

  const [turno, setTurno]             = useState(turnoInicial || turnos[0] || "matutino");
  const [professores, setProfessores] = useState([]);
  const [profSel, setProfSel]         = useState(null);   // professor selecionado
  const [grid, setGrid]               = useState({});     // { profId: { dia: { ordem: status } } }
  const [dirty, setDirty]             = useState({});
  const [salvando, setSalvando]       = useState(false);
  const [msg, setMsg]                 = useState("");
  const [carregando, setCarregando]   = useState(true);
  const [busca, setBusca]             = useState("");
  const [showModalLimpar, setShowModalLimpar] = useState(false);

  const nPeriodos = periodosPorTurno[turno] || 5;
  const dias      = DIAS.filter(d => diasLetivos.includes(d.num));

  // ── Carga de dados ───────────────────────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [resProfs, resDisp] = await Promise.all([
        api.get("/api/professores", { params: { turno } }),
        api.get("/api/disponibilidades", { params: { turno } }),
      ]);

      const lista = Array.isArray(resProfs.data)
        ? resProfs.data
        : (resProfs.data?.professores || []);

      // NOVO: professor pode ter vínculos em múltiplos turnos.
      // Filtra quem tem pelo menos 1 vínculo no turno selecionado.
      const ativos = lista.filter(p => {
        if (String(p.status || "ativo").toLowerCase() === "inativo") return false;
        const vinculos = Array.isArray(p.vinculos) ? p.vinculos : [];
        if (vinculos.length > 0) {
          return vinculos.some(v => String(v.turno || "").toLowerCase() === turno.toLowerCase());
        }
        // fallback para modelo legado (p.turno)
        return String(p.turno || "").toLowerCase() === turno.toLowerCase();
      });
      setProfessores(ativos);

      // monta grid zerado (tudo livre)
      const g = {};
      for (const p of ativos) {
        g[p.id] = {};
        for (const d of dias) {
          g[p.id][d.num] = {};
          for (let o = 1; o <= nPeriodos; o++) g[p.id][d.num][o] = "livre";
        }
      }

      // preenche com dados salvos
      const disp = Array.isArray(resDisp.data) ? resDisp.data : [];
      for (const item of disp) {
        if (g[item.professor_id]?.[item.dia]) {
          g[item.professor_id][item.dia][item.ordem] = item.status || "livre";
        }
      }

      setGrid(g);
      setDirty({});

      // seleciona highlight ou primeiro
      if (highlightProfId && ativos.find(p => p.id === highlightProfId)) {
        setProfSel(highlightProfId);
      } else if (ativos.length > 0 && !profSel) {
        setProfSel(ativos[0].id);
      }
    } catch (e) {
      console.error("Erro ao carregar disponibilidades", e);
    } finally {
      setCarregando(false);
    }
  }, [turno]); // eslint-disable-line

  useEffect(() => { carregar(); }, [carregar]);

  // ── Toggle de slot ────────────────────────────────────────────
  function toggle(dia, ordem) {
    if (!profSel) return;
    setGrid(prev => {
      const cur = prev[profSel]?.[dia]?.[ordem] || "livre";
      return {
        ...prev,
        [profSel]: {
          ...prev[profSel],
          [dia]: { ...prev[profSel][dia], [ordem]: proxStatus(cur) },
        },
      };
    });
    setDirty(prev => ({ ...prev, [profSel]: true }));
  }

  // ── Salvar ────────────────────────────────────────────────────
  async function salvarTudo() {
    const ids = Object.keys(dirty).map(Number);
    if (ids.length === 0) {
      setMsg("Nada para salvar.");
      setTimeout(() => setMsg(""), 2500);
      return;
    }
    setSalvando(true);
    setMsg("");
    let erros = 0;
    for (const profId of ids) {
      for (const d of dias) {
        const periodos = [];
        for (let o = 1; o <= nPeriodos; o++) {
          periodos.push({ ordem: o, status: grid[profId]?.[d.num]?.[o] || "livre" });
        }
        try {
          await api.post("/api/disponibilidades/upsert", {
            professor_id: profId,
            turno:        turno.toLowerCase(),
            dia_semana:   d.num,
            status_padrao: "livre",
            periodos,
          });
        } catch { erros++; }
      }
    }
    setSalvando(false);
    setDirty({});
    setMsg(erros > 0 ? `⚠️ ${erros} erros ao salvar.` : "✅ Salvo com sucesso!");
    setTimeout(() => setMsg(""), 3000);
  }

  // ── Limpar Tudo ───────────────────────────────────────────────
  // Reseta TODOS os professores para "livre" em todos os slots e salva no BD.
  // Útil para: inicializar professores sem dados ou limpar restrições antigas.
  async function executarLimparTudo() {
    const total = professores.length;
    if (total === 0) return;
    
    setShowModalLimpar(false);

    // 1) Monta grid zerado (tudo livre) para todos os professores
    const novoGrid = {};
    const novoDirty = {};
    for (const p of professores) {
      novoGrid[p.id] = {};
      novoDirty[p.id] = true;
      for (const d of dias) {
        novoGrid[p.id][d.num] = {};
        for (let o = 1; o <= nPeriodos; o++) novoGrid[p.id][d.num][o] = "livre";
      }
    }
    setGrid(novoGrid);
    setDirty(novoDirty);

    // 2) Salva todos no BD imediatamente
    setSalvando(true);
    setMsg("🧹 Limpando e salvando todos os professores…");
    let erros = 0;
    let salvos = 0;
    for (const p of professores) {
      for (const d of dias) {
        const periodos = [];
        for (let o = 1; o <= nPeriodos; o++) periodos.push({ ordem: o, status: "livre" });
        try {
          await api.post("/api/disponibilidades/upsert", {
            professor_id:  p.id,
            turno:         turno.toLowerCase(),
            dia_semana:    d.num,
            status_padrao: "livre",
            periodos,
          });
          salvos++;
        } catch { erros++; }
      }
    }
    setSalvando(false);
    setDirty({});
    const msg = erros > 0
      ? `⚠️ Concluído com ${erros} erros. ${salvos} registros salvos.`
      : `✅ ${total} professores inicializados como Livre!`;
    setMsg(msg);
    setTimeout(() => setMsg(""), 4000);
  }

  // ── Helpers ───────────────────────────────────────────────────
  const profsFiltrados = professores.filter(p =>
    !busca || `${p.nome} ${p.disciplina_nome || ""}`.toLowerCase().includes(busca.toLowerCase())
  );

  const profAtual = professores.find(p => p.id === profSel);

  const temDirty = Object.keys(dirty).length > 0;

  // ordinal
  const ord = n => `${n}º`;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", display: "flex", flexDirection: "column", gap: 0, flex: 1, minHeight: 0 }}>

      {/* ── Barra superior ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid #e2e8f0",
        background: "#fff", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📅</span>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e3a5f" }}>
            Disponibilidade dos Professores
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Seletor de turno */}
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            {turnos.map(t => (
              <button key={t} onClick={() => setTurno(t)} style={{
                padding: "8px 18px", border: "none", cursor: "pointer",
                background: turno === t ? "#2563eb" : "#fff",
                color:      turno === t ? "#fff"    : "#64748b",
                fontWeight: 700, fontSize: 12, textTransform: "uppercase",
                letterSpacing: 0.5, transition: "all 0.18s",
              }}>
                {t}
              </button>
            ))}
          </div>

          {/* Limpar Tudo */}
          <button onClick={() => setShowModalLimpar(true)} disabled={salvando} title="Apaga todas as marcações e inicializa todos os professores como Livre" style={{
            padding: "8px 18px", borderRadius: 8,
            border: "1px solid #fca5a5",
            background: salvando ? "#e2e8f0" : "#fff1f2",
            color: salvando ? "#94a3b8" : "#dc2626",
            fontWeight: 700, fontSize: 13,
            cursor: salvando ? "not-allowed" : "pointer",
            transition: "all 0.18s",
          }}
            onMouseEnter={e => { if (!salvando) { e.currentTarget.style.background = "#fecdd3"; } }}
            onMouseLeave={e => { if (!salvando) { e.currentTarget.style.background = "#fff1f2"; } }}
          >
            🧹 Limpar Tudo
          </button>

          {/* Salvar */}
          <button onClick={salvarTudo} disabled={salvando || !temDirty} style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: temDirty ? "#2563eb" : "#e2e8f0",
            color: temDirty ? "#fff" : "#94a3b8",
            fontWeight: 700, fontSize: 13, cursor: temDirty ? "pointer" : "not-allowed",
            transition: "all 0.18s",
          }}>
            {salvando ? "Salvando…" : "💾 Salvar Tudo"}
          </button>
        </div>

        {msg && (
          <div style={{
            width: "100%", textAlign: "center", fontSize: 13, fontWeight: 600,
            color: msg.startsWith("✅") ? "#15803d" : msg.startsWith("⚠️") ? "#b45309" : "#64748b",
          }}>{msg}</div>
        )}
      </div>

      {/* ── Corpo: painel esquerdo + área de dias ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* ── Painel esquerdo — Lista de professores ── */}
        <div style={{
          width: 240, flexShrink: 0,
          borderRight: "1px solid #e2e8f0",
          background: "#f8fafc",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header do painel */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              👤 Professores
            </div>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar…"
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 7,
                border: "1px solid #e2e8f0", fontSize: 12,
                background: "#fff", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
            {carregando ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 24 }}>Carregando…</div>
            ) : profsFiltrados.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: 20 }}>Nenhum professor</div>
            ) : profsFiltrados.map(p => {
              const sel     = p.id === profSel;
              const isDirty = dirty[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => setProfSel(p.id)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "10px 12px", borderRadius: 9, marginBottom: 4,
                    border: sel ? "2px solid #2563eb" : "2px solid transparent",
                    background: sel ? "#eff6ff" : "transparent",
                    cursor: "pointer", transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: sel ? 700 : 600, color: sel ? "#1d4ed8" : "#1e293b", lineHeight: 1.3 }}>
                    {p.nome}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {p.disciplina_nome || p.disciplina || "—"}
                  </div>
                  {isDirty && (
                    <span style={{
                      position: "absolute", top: 8, right: 8,
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#f59e0b",
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(STATUS_STYLE).map(([s, c]) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: c.bg, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#64748b" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Área principal — Cards dos dias ── */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", background: "#f1f5f9", padding: "20px 16px" }}>

          {/* Badge do professor selecionado */}
          {profAtual ? (
            <div style={{
              display: "flex", justifyContent: "center", marginBottom: 20,
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "#1e3a5f", color: "#fff",
                padding: "10px 22px", borderRadius: 40,
                boxShadow: "0 4px 16px rgba(30,58,95,0.25)",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800,
                }}>
                  {profAtual.nome?.[0] || "?"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{profAtual.nome}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>
                    {profAtual.disciplina_nome || profAtual.disciplina || "—"} · {turno.charAt(0).toUpperCase() + turno.slice(1)}
                  </div>
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 600,
                }}>
                  {nPeriodos} aulas/dia
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: "center", color: "#94a3b8", fontSize: 14, marginBottom: 20,
              background: "#fff", borderRadius: 12, padding: "16px 24px",
              border: "2px dashed #e2e8f0",
            }}>
              ← Selecione um professor na lista para configurar a disponibilidade
            </div>
          )}

          {/* Cards dos dias */}
          {carregando ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Carregando…</div>
          ) : (
            <div style={{ display: "flex", gap: 12, flexWrap: "nowrap", justifyContent: "stretch", width: "100%" }}>
              {dias.map(d => (
                <div key={d.num} style={{
                  flex: 1,
                  background: "#fff",
                  borderRadius: 16,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                  border: "1px solid #e2e8f0",
                  padding: "14px 12px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  minWidth: 0,
                }}>
                  {/* Nome do dia */}
                  <div style={{
                    fontSize: 12, fontWeight: 800, color: "#1e3a5f",
                    textTransform: "uppercase", letterSpacing: 0.8,
                    paddingBottom: 8, borderBottom: "2px solid #e2e8f0", width: "100%", textAlign: "center",
                  }}>
                    {d.nome}
                  </div>

                  {/* Botões de slot */}
                  {Array.from({ length: nPeriodos }, (_, i) => i + 1).map(ordem => {
                    const status  = (profSel && grid[profSel]?.[d.num]?.[ordem]) || "livre";
                    const sc      = STATUS_STYLE[status];
                    const ativo   = !!profSel;
                    return (
                      <button
                        key={ordem}
                        onClick={() => toggle(d.num, ordem)}
                        disabled={!ativo}
                        title={ativo ? `${d.nome} · ${ord(ordem)} aula · ${sc.label}` : "Selecione um professor"}
                        style={{
                          width: "100%", height: 38, borderRadius: 20,
                          border: "none",
                          background: ativo ? sc.bg : "#e2e8f0",
                          color: ativo ? sc.text : "#94a3b8",
                          fontWeight: 700, fontSize: 13,
                          cursor: ativo ? "pointer" : "not-allowed",
                          transition: "all 0.15s",
                          boxShadow: ativo ? `0 2px 8px ${sc.bg}88` : "none",
                        }}
                        onMouseEnter={e => { if (ativo) e.currentTarget.style.background = sc.hover; }}
                        onMouseLeave={e => { if (ativo) e.currentTarget.style.background = sc.bg; }}
                      >
                        {status === "livre" ? ord(ordem) : `${ord(ordem)} - ${sc.label}`}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Limpar Tudo ── */}
      {showModalLimpar && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", width: 420, borderRadius: 16, padding: 32,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            textAlign: "center"
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "#fee2e2",
              color: "#dc2626", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              ⚠️
            </div>
            <h3 style={{ margin: "0 0 12px", fontSize: 20, color: "#1e293b", fontWeight: 700 }}>
              Confirmar Limpeza Total
            </h3>
            <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14, lineHeight: 1.5 }}>
              Isso vai apagar <strong>todas as marcações</strong> de Evitar/Excluir de <strong>{professores.length} professores</strong> e salvar tudo como Livre.
              <br /><br />Esta ação não pode ser desfeita. Deseja continuar?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setShowModalLimpar(false)}
                style={{
                  padding: "10px 24px", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", color: "#64748b", fontWeight: 600, cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Cancelar
              </button>
              <button
                onClick={executarLimparTudo}
                style={{
                  padding: "10px 24px", borderRadius: 8, border: "none",
                  background: "#ef4444", color: "#fff", fontWeight: 600, cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#dc2626"}
                onMouseLeave={e => e.currentTarget.style.background = "#ef4444"}
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
