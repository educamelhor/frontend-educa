// src/features/secretaria/horarios/DisponibilidadePage.jsx
// ============================================================
// Grade interativa de disponibilidade dos professores.
// A direção marca quais horários cada professor pode ter aulas.
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api";

const DIAS = [
  { num: 1, label: "SEG", nome: "Segunda" },
  { num: 2, label: "TER", nome: "Terça"   },
  { num: 3, label: "QUA", nome: "Quarta"  },
  { num: 4, label: "QUI", nome: "Quinta"  },
  { num: 5, label: "SEX", nome: "Sexta"   },
  { num: 6, label: "SÁB", nome: "Sábado"  },
];

const STATUS_CICLO  = ["livre", "evitar", "indisponivel"];
const STATUS_COLORS = {
  livre:        { bg: "#dcfce7", border: "#22c55e", text: "#15803d", icon: "●" },
  evitar:       { bg: "#fef9c3", border: "#eab308", text: "#854d0e", icon: "◑" },
  indisponivel: { bg: "#f1f5f9", border: "#94a3b8", text: "#475569", icon: "✕" },
};

function proxStatus(s) {
  const idx = STATUS_CICLO.indexOf(s);
  return STATUS_CICLO[(idx + 1) % STATUS_CICLO.length];
}

// Célula de um período
function PeriodCell({ status, onToggle, tamanho = 36 }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.livre;
  return (
    <button
      onClick={onToggle}
      title={status}
      style={{
        width: tamanho, height: tamanho, borderRadius: 8,
        border: `2px solid ${c.border}`,
        background: c.bg,
        color: c.text,
        fontSize: 13, fontWeight: 700, cursor: "pointer",
        transition: "all 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {c.icon}
    </button>
  );
}

// Barra de progresso
function ProgressBar({ livre, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((livre / total) * 100)) : 0;
  const ok  = livre >= total;
  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: ok ? "#15803d" : "#b91c1c", fontWeight: 600, marginBottom: 3 }}>
        <span>{livre}/{total} slots</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: ok ? "#22c55e" : "#f87171",
          transition: "width 0.4s",
        }} />
      </div>
    </div>
  );
}

export default function DisponibilidadePage({ config, turnoInicial, highlightProfId = null, onVoltar }) {
  // config = { turnos, dias_semana, periodos }
  const turnos        = config?.turnos      || ["matutino", "vespertino"];
  const diasLetivos   = config?.dias_semana || [1,2,3,4,5];
  const periodosPorTurno = config?.periodos || { matutino: 5, vespertino: 5 };

  const [turno, setTurno]           = useState(turnoInicial || turnos[0] || "matutino");
  const [professores, setProfessores] = useState([]);
  const [grid, setGrid]             = useState({});   // { profId: { dia: { ordem: status } } }
  const [dirty, setDirty]           = useState({});   // profIds modificados não salvos
  const [salvando, setSalvando]     = useState(false);
  const [busca, setBusca]           = useState("");
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg]               = useState("");
  const highlightRef                = useRef(null);

  const nPeriodos = periodosPorTurno[turno] || 5;
  const dias      = DIAS.filter(d => diasLetivos.includes(d.num));

  // Carrega professores do turno e disponibilidades existentes
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [resProfs, resDisp] = await Promise.all([
        api.get("/api/professores", { params: { turno } }),
        api.get("/api/disponibilidades", { params: { turno } }),
      ]);

      const listaProfs = Array.isArray(resProfs.data)
        ? resProfs.data
        : (resProfs.data?.professores || []);

      // filtra ativos e do turno
      const ativos = listaProfs.filter(p =>
        String(p.status || "ativo").toLowerCase() !== "inativo" &&
        String(p.turno || "").toLowerCase() === turno.toLowerCase()
      );
      setProfessores(ativos);

      // monta grid { profId: { dia: { ordem: status } } }
      const g = {};
      for (const p of ativos) {
        g[p.id] = {};
        for (const d of dias) {
          g[p.id][d.num] = {};
          for (let o = 1; o <= nPeriodos; o++) g[p.id][d.num][o] = "livre";
        }
      }

      const dispData = Array.isArray(resDisp.data) ? resDisp.data : [];
      for (const item of dispData) {
        if (g[item.professor_id]?.[item.dia]) {
          g[item.professor_id][item.dia][item.ordem] = item.status || "livre";
        }
      }

      setGrid(g);
      setDirty({});
    } catch (e) {
      console.error("Erro ao carregar disponibilidades", e);
    } finally {
      setCarregando(false);
    }
  }, [turno]);

  useEffect(() => { carregar(); }, [carregar]);

  // Scroll para professor destacado
  useEffect(() => {
    if (highlightRef.current && highlightProfId) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    }
  }, [highlightProfId, professores]);

  function toggleCell(profId, dia, ordem) {
    setGrid(prev => {
      const cur = prev[profId]?.[dia]?.[ordem] || "livre";
      return {
        ...prev,
        [profId]: { ...prev[profId], [dia]: { ...prev[profId][dia], [ordem]: proxStatus(cur) } }
      };
    });
    setDirty(prev => ({ ...prev, [profId]: true }));
  }

  async function salvarTudo() {
    const dirtyIds = Object.keys(dirty).map(Number);
    if (dirtyIds.length === 0) { setMsg("Nada para salvar."); setTimeout(() => setMsg(""), 2000); return; }
    setSalvando(true); setMsg("");
    const errors = [];

    for (const profId of dirtyIds) {
      for (const dia of dias) {
        const periodos = [];
        for (let o = 1; o <= nPeriodos; o++) {
          periodos.push({ ordem: o, status: grid[profId]?.[dia.num]?.[o] || "livre" });
        }
        try {
          await api.post("/api/disponibilidades/upsert", {
            professor_id: profId,
            turno: turno.toLowerCase(),
            dia_semana: dia.num,
            status_padrao: "livre",
            periodos,
          });
        } catch { errors.push(profId); }
      }
    }

    setSalvando(false);
    setDirty({});
    if (errors.length === 0) {
      setMsg(`✅ ${dirtyIds.length} professor(es) salvos com sucesso!`);
    } else {
      setMsg(`⚠️ Salvos com erros em ${errors.length} professor(es).`);
    }
    setTimeout(() => setMsg(""), 3500);
  }

  // Calcula slots livres de um professor
  function countLivres(profId) {
    let count = 0;
    for (const d of dias) {
      for (let o = 1; o <= nPeriodos; o++) {
        if ((grid[profId]?.[d.num]?.[o] || "livre") === "livre") count++;
      }
    }
    return count;
  }

  const maxSlots    = dias.length * nPeriodos;
  const profsFiltrados = professores.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );
  const nDirty = Object.keys(dirty).length;

  return (
    <div style={{ padding: "24px 0" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 22 }}>📅</span>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e3a5f" }}>
          Disponibilidade dos Professores
        </h2>
        <div style={{ flex: 1 }} />
        {/* Seletor de turno */}
        <div style={{ display: "flex", gap: 6 }}>
          {turnos.map(t => (
            <button key={t} onClick={() => setTurno(t)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: turno === t ? "#2563eb" : "#e2e8f0",
              color: turno === t ? "#fff" : "#475569",
              fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
              textTransform: "uppercase",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── Barra de ações ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍  Buscar professor…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            padding: "9px 16px", borderRadius: 8, border: "1px solid #cbd5e1",
            fontSize: 13, width: 240, outline: "none", color: "#1e293b",
          }}
        />
        <div style={{ flex: 1 }} />

        {/* Legenda */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, color: "#64748b" }}>
          {Object.entries(STATUS_COLORS).map(([k, c]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: c.bg, border: `2px solid ${c.border}`, display: "inline-block" }} />
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </span>
          ))}
        </div>

        {nDirty > 0 && (
          <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
            {nDirty} alteração(ões) não salva(s)
          </span>
        )}
        <button onClick={salvarTudo} disabled={salvando} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: nDirty > 0 ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#e2e8f0",
          color: nDirty > 0 ? "#fff" : "#94a3b8",
          fontWeight: 700, fontSize: 13, cursor: salvando ? "not-allowed" : "pointer",
          boxShadow: nDirty > 0 ? "0 4px 14px rgba(37,99,235,0.4)" : "none",
          transition: "all 0.2s",
        }}>
          {salvando ? "Salvando…" : "💾 Salvar Tudo"}
        </button>
      </div>

      {msg && (
        <div style={{
          marginBottom: 16, padding: "10px 16px", borderRadius: 8,
          background: msg.startsWith("✅") ? "#dcfce7" : "#fef9c3",
          color: msg.startsWith("✅") ? "#15803d" : "#854d0e",
          fontWeight: 600, fontSize: 13,
        }}>{msg}</div>
      )}

      {carregando ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Carregando…</div>
      ) : profsFiltrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 14 }}>
          Nenhum professor encontrado para o turno <b>{turno}</b>.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{
                  padding: "12px 16px", textAlign: "left", background: "#f8fafc",
                  borderBottom: "2px solid #e2e8f0", color: "#1e3a5f", fontWeight: 700,
                  position: "sticky", left: 0, zIndex: 2, minWidth: 220,
                }}>Professor</th>
                {dias.map(d => (
                  <th key={d.num} colSpan={nPeriodos} style={{
                    padding: "12px 8px", textAlign: "center", background: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0", color: "#1e3a5f", fontWeight: 700,
                    borderLeft: "1px solid #e2e8f0",
                  }}>
                    {d.label}
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>{d.nome}</div>
                  </th>
                ))}
                <th style={{
                  padding: "12px 16px", textAlign: "center", background: "#f8fafc",
                  borderBottom: "2px solid #e2e8f0", color: "#1e3a5f", fontWeight: 700,
                  borderLeft: "1px solid #e2e8f0", minWidth: 130,
                }}>Progresso</th>
              </tr>
              <tr>
                <th style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", position: "sticky", left: 0, zIndex: 2 }} />
                {dias.map(d =>
                  Array.from({ length: nPeriodos }, (_, i) => (
                    <th key={`${d.num}-${i}`} style={{
                      padding: "4px 4px", fontSize: 10, color: "#94a3b8", fontWeight: 500,
                      background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "center",
                      borderLeft: i === 0 ? "1px solid #e2e8f0" : "none",
                    }}>{i + 1}º</th>
                  ))
                )}
                <th style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", borderLeft: "1px solid #e2e8f0" }} />
              </tr>
            </thead>
            <tbody>
              {profsFiltrados.map((prof, rowIdx) => {
                const isHighlight = prof.id === highlightProfId;
                const isDirtyRow  = dirty[prof.id];
                const livres = countLivres(prof.id);
                return (
                  <tr
                    key={prof.id}
                    ref={isHighlight ? highlightRef : null}
                    style={{
                      background: isHighlight
                        ? "#fef9c3"
                        : isDirtyRow ? "#eff6ff" : rowIdx % 2 === 0 ? "#fff" : "#f8fafc",
                      transition: "background 0.3s",
                    }}
                  >
                    <td style={{
                      padding: "10px 16px", borderBottom: "1px solid #f1f5f9",
                      position: "sticky", left: 0, zIndex: 1, background: "inherit",
                      fontWeight: 600, color: isHighlight ? "#854d0e" : "#1e293b",
                      borderRight: "1px solid #e2e8f0",
                    }}>
                      {isHighlight && <span style={{ marginRight: 6, color: "#f59e0b" }}>→</span>}
                      <span style={{ fontSize: 13 }}>{prof.nome}</span>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
                        {prof.disciplina_nome}
                      </div>
                      {isDirtyRow && (
                        <span style={{
                          display: "inline-block", marginTop: 3,
                          fontSize: 10, color: "#f59e0b", fontWeight: 600,
                        }}>● não salvo</span>
                      )}
                    </td>
                    {dias.map(d => (
                      Array.from({ length: nPeriodos }, (_, i) => {
                        const ordem = i + 1;
                        const status = grid[prof.id]?.[d.num]?.[ordem] || "livre";
                        return (
                          <td key={`${d.num}-${ordem}`} style={{
                            padding: "8px 4px", borderBottom: "1px solid #f1f5f9",
                            textAlign: "center",
                            borderLeft: i === 0 ? "1px solid #e8eef6" : "none",
                          }}>
                            <PeriodCell
                              status={status}
                              onToggle={() => toggleCell(prof.id, d.num, ordem)}
                              tamanho={32}
                            />
                          </td>
                        );
                      })
                    ))}
                    <td style={{
                      padding: "8px 16px", borderBottom: "1px solid #f1f5f9",
                      borderLeft: "1px solid #e8eef6", verticalAlign: "middle",
                    }}>
                      <ProgressBar livre={livres} total={maxSlots} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
