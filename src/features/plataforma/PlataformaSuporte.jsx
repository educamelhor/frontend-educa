// src/features/plataforma/PlataformaSuporte.jsx
// ============================================================================
// Painel de Suporte Técnico — CEO/Plataforma
// Visualiza TODOS os chamados de TODAS as escolas, responde e gerencia.
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

const CATEGORIAS = [
  { value: "bug", label: "Bug / Erro", icon: "🐛" },
  { value: "acesso", label: "Acesso / Login", icon: "🔐" },
  { value: "performance", label: "Lentidão", icon: "🐢" },
  { value: "duvida", label: "Dúvida Técnica", icon: "❓" },
  { value: "sugestao", label: "Sugestão", icon: "💡" },
  { value: "outro", label: "Outro", icon: "📝" },
];
const PRIORIDADES = {
  baixa: { label: "Baixa", color: "#64748b", bg: "#f1f5f9" },
  media: { label: "Média", color: "#f59e0b", bg: "#fffbeb" },
  alta: { label: "Alta", color: "#ef4444", bg: "#fef2f2" },
  urgente: { label: "Urgente", color: "#dc2626", bg: "#fef2f2" },
};
const STATUS_MAP = {
  aberto: { label: "Aberto", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: "🔵" },
  em_andamento: { label: "Em Andamento", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "🟡" },
  respondido: { label: "Respondido", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "🟢" },
  fechado: { label: "Resolvido", color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "⚪" },
};
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) +
    " às " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export default function PlataformaSuporte() {
  const [chamados, setChamados] = useState([]);
  const [kpis, setKpis] = useState({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [selected, setSelected] = useState(null); // chamado selecionado para detalhe
  const [resposta, setResposta] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const [msg, setMsg] = useState({ t: "", tipo: "" });

  const fetchChamados = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filtroStatus) p.set("status", filtroStatus);
      if (filtroPrioridade) p.set("prioridade", filtroPrioridade);
      const { data } = await api.get(`/api/plataforma/suporte/chamados?${p.toString()}`);
      setChamados(data?.chamados || []);
      setKpis(data?.kpis || {});
      setTotal(data?.total || 0);
    } catch { showMsg("Erro ao carregar chamados", "erro"); }
    finally { setLoading(false); }
  }, [filtroStatus, filtroPrioridade]);

  useEffect(() => { fetchChamados(); }, [fetchChamados]);

  const showMsg = (t, tipo = "ok") => {
    setMsg({ t, tipo }); setTimeout(() => setMsg({ t: "", tipo: "" }), 5000);
  };

  const verDetalhe = async (id) => {
    try {
      const { data } = await api.get(`/api/plataforma/suporte/chamados/${id}`);
      setSelected(data); setResposta(data.resposta_ceo || "");
    } catch { showMsg("Erro ao carregar chamado", "erro"); }
  };

  const handleResponder = async (novoStatus) => {
    if (!selected) return;
    setRespondendo(true);
    try {
      await api.patch(`/api/plataforma/suporte/chamados/${selected.id}`, {
        status: novoStatus,
        resposta: resposta.trim() || undefined,
      });
      showMsg("✅ Chamado atualizado!"); setSelected(null); fetchChamados();
    } catch (err) {
      showMsg(`❌ ${err?.response?.data?.message || "Erro"}`, "erro");
    } finally { setRespondendo(false); }
  };

  // ── STYLES ──
  const S = {
    page: { width: "100%", minHeight: "100vh", padding: "32px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" },
    header: { marginBottom: 28 },
    title: { fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 },
    sub: { fontSize: "0.88rem", color: "#64748b", marginTop: 4 },
    kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 },
    kpiCard: (c, active) => ({
      borderRadius: 14, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s",
      border: active ? `2px solid ${c}` : `1px solid ${c}15`,
      background: active ? `${c}08` : `linear-gradient(135deg, ${c}05, transparent)`,
      transform: active ? "scale(1.02)" : "none",
    }),
    msgBar: (t) => ({
      padding: "12px 18px", borderRadius: 12, fontWeight: 600, fontSize: "0.88rem", marginBottom: 16,
      background: t === "erro" ? "#fef2f2" : "#f0fdf4", color: t === "erro" ? "#dc2626" : "#16a34a",
      border: t === "erro" ? "1px solid #fecaca" : "1px solid #bbf7d0",
    }),
    filterRow: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
    filterBtn: (a) => ({
      padding: "5px 12px", borderRadius: 8, border: a ? "1px solid #6366f1" : "1px solid #e2e8f0",
      background: a ? "rgba(99,102,241,0.06)" : "#fff", color: a ? "#6366f1" : "#64748b",
      fontWeight: 600, fontSize: "0.75rem", cursor: "pointer", transition: "all 0.2s",
    }),
    badge: (c) => ({
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8,
      fontSize: "0.7rem", fontWeight: 700, background: c.bg, color: c.color,
    }),
    prDot: (c) => ({ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: c, marginRight: 6 }),
    splitter: { display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20, alignItems: "start" },
    listCard: (h, sel) => ({
      borderRadius: 14, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s",
      border: sel ? "2px solid #6366f1" : "1px solid #e2e8f0",
      background: sel ? "rgba(99,102,241,0.02)" : "#fff",
      boxShadow: h ? "0 4px 16px rgba(99,102,241,0.06)" : "0 1px 2px rgba(0,0,0,0.02)",
    }),
    detPanel: {
      position: "sticky", top: 32, borderRadius: 20, border: "1px solid #e2e8f0",
      background: "#fff", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    },
    detHead: {
      padding: "20px 24px", borderBottom: "1px solid #f1f5f9",
      background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
    },
    detBody: { padding: "20px 24px" },
    txtArea: {
      width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0",
      fontSize: "0.88rem", color: "#334155", outline: "none", fontFamily: "inherit",
      minHeight: 100, resize: "vertical", transition: "border 0.2s", background: "#fff",
    },
    btnPri: (bg) => ({
      display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
      border: "none", background: bg || "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
      fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s",
    }),
    btnSec: {
      display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
      border: "1px solid #e2e8f0", background: "#fff", color: "#475569",
      fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s",
    },
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>
          🎧 Central de Suporte
          <span style={{
            fontSize: "0.55rem", fontWeight: 800,
            background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#fff",
            padding: "3px 8px", borderRadius: 8,
          }}>CEO</span>
        </div>
        <div style={S.sub}>Chamados técnicos de todas as escolas — gerencie e responda</div>
      </div>

      {msg.t && <div style={S.msgBar(msg.tipo)}>{msg.t}</div>}

      {/* KPIs */}
      <div style={S.kpiRow}>
        {[
          { k: "", label: "Total", v: kpis.total_geral || 0, c: "#8b5cf6" },
          { k: "aberto", label: "Abertos", v: kpis.abertos || 0, c: "#3b82f6" },
          { k: "em_andamento", label: "Analisando", v: kpis.em_andamento || 0, c: "#f59e0b" },
          { k: "respondido", label: "Respondidos", v: kpis.respondidos || 0, c: "#10b981" },
          { k: "fechado", label: "Fechados", v: kpis.fechados || 0, c: "#64748b" },
        ].map(item => (
          <div key={item.k} style={S.kpiCard(item.c, filtroStatus === item.k)}
            onClick={() => setFiltroStatus(filtroStatus === item.k ? "" : item.k)}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: item.c }}>{item.v}</div>
            <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</div>
          </div>
        ))}
        {/* Special: urgentes */}
        {(kpis.urgentes_pendentes || 0) > 0 && (
          <div style={{
            ...S.kpiCard("#dc2626", false),
            background: "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(220,38,38,0.02))",
            border: "2px solid rgba(220,38,38,0.3)",
          }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626" }}>🚨 {kpis.urgentes_pendentes}</div>
            <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#dc2626", textTransform: "uppercase" }}>Urgentes</div>
          </div>
        )}
      </div>

      {/* Filtros de prioridade */}
      <div style={S.filterRow}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Prioridade:</span>
        <button style={S.filterBtn(!filtroPrioridade)} onClick={() => setFiltroPrioridade("")}>Todas</button>
        {Object.entries(PRIORIDADES).map(([k, v]) => (
          <button key={k} style={S.filterBtn(filtroPrioridade === k)} onClick={() => setFiltroPrioridade(filtroPrioridade === k ? "" : k)}>
            <span style={S.prDot(v.color)} />{v.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : chamados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#475569" }}>Nenhum chamado{filtroStatus ? ` com status "${filtroStatus}"` : ""}</div>
          <div style={{ fontSize: "0.85rem", marginTop: 6 }}>Todas as escolas estão sem pendências técnicas!</div>
        </div>
      ) : (
        /* Splitter: lista + detalhe */
        <div style={S.splitter}>
          {/* Left: Lista */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>
              {total} chamado{total !== 1 ? "s" : ""}
            </div>
            {chamados.map(c => <ListItem key={c.id} c={c} S={S} sel={selected?.id === c.id} onClick={() => verDetalhe(c.id)} />)}
          </div>

          {/* Right: Detalhe / Responder */}
          {selected && (() => {
            const c = selected;
            const st = STATUS_MAP[c.status] || STATUS_MAP.aberto;
            const cat = CATEGORIAS.find(x => x.value === c.categoria) || CATEGORIAS[5];
            const pri = PRIORIDADES[c.prioridade] || PRIORIDADES.media;
            const escola = c._escola_nome || c.escola_nome || `Escola #${c.escola_id}`;

            return (
              <div style={S.detPanel}>
                <div style={S.detHead}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={S.badge(st)}>{st.icon} {st.label}</span>
                        <span style={{ ...S.badge({ bg: pri.bg, color: pri.color }) }}><span style={S.prDot(pri.color)} />{pri.label}</span>
                        <span style={S.badge({ bg: "rgba(99,102,241,0.08)", color: "#6366f1" })}>{cat.icon} {cat.label}</span>
                      </div>
                      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>#{c.id} — {c.assunto}</h2>
                    </div>
                    <button style={{ ...S.btnSec, padding: "4px 10px", fontSize: "0.72rem" }} onClick={() => setSelected(null)}>✕</button>
                  </div>

                  {/* Escola + Usuário */}
                  <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      🏫 <strong style={{ color: "#334155" }}>{escola}</strong>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      👤 <strong style={{ color: "#334155" }}>{c.usuario_nome}</strong>
                      {c.usuario_perfil && <span> ({c.usuario_perfil})</span>}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>📅 {fmtDate(c.created_at)}</div>
                  </div>
                </div>

                <div style={S.detBody}>
                  {/* Descrição */}
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Descrição</h4>
                    <div style={{
                      padding: 16, borderRadius: 12, background: "#f8fafc", border: "1px solid #f1f5f9",
                      fontSize: "0.88rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap",
                    }}>
                      {c.descricao}
                    </div>
                  </div>

                  {/* Resposta existente */}
                  {c.resposta_ceo && (
                    <div style={{
                      padding: 14, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 16,
                    }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#166534", marginBottom: 4 }}>
                        ✅ Resposta anterior {c.respondido_por && `(${c.respondido_por})`}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#166534", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {c.resposta_ceo}
                      </div>
                    </div>
                  )}

                  {/* Form responder */}
                  {c.status !== "fechado" && (
                    <>
                      <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                        Escrever Resposta
                      </h4>
                      <textarea
                        value={resposta} onChange={e => setResposta(e.target.value)}
                        placeholder="Escreva sua resposta técnica para o usuário..."
                        style={S.txtArea}
                        onFocus={e => e.target.style.borderColor = "#6366f1"}
                        onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                      />
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                        {c.status === "aberto" && (
                          <button style={S.btnPri("linear-gradient(135deg, #f59e0b, #d97706)")} disabled={respondendo}
                            onClick={() => handleResponder("em_andamento")}>🟡 Em Andamento</button>
                        )}
                        <button style={S.btnPri("linear-gradient(135deg, #10b981, #059669)")} disabled={respondendo}
                          onClick={() => handleResponder("respondido")}>
                          ✅ {resposta.trim() ? "Enviar Resposta" : "Marcar Respondido"}
                        </button>
                        <button style={S.btnPri("linear-gradient(135deg, #64748b, #475569)")} disabled={respondendo}
                          onClick={() => handleResponder("fechado")}>⬜ Fechar</button>
                      </div>
                    </>
                  )}

                  {c.status === "fechado" && (
                    <div style={{
                      padding: 14, borderRadius: 12, background: "rgba(100,116,139,0.05)", border: "1px solid rgba(100,116,139,0.12)",
                      fontSize: "0.85rem", color: "#64748b", textAlign: "center",
                    }}>
                      ✅ Este chamado foi resolvido e fechado
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function ListItem({ c, S, sel, onClick }) {
  const [h, setH] = useState(false);
  const st = STATUS_MAP[c.status] || STATUS_MAP.aberto;
  const cat = CATEGORIAS.find(x => x.value === c.categoria) || CATEGORIAS[5];
  const pri = PRIORIDADES[c.prioridade] || PRIORIDADES.media;
  const escola = c._escola_nome || c.escola_nome || `#${c.escola_id}`;

  return (
    <div style={S.listCard(h, sel)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${st.color}12, ${st.color}06)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem", border: `1px solid ${st.color}15`,
        }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>#{c.id}</span>
            <span style={{ ...S.badge(st), padding: "2px 7px", fontSize: "0.62rem" }}>{st.icon} {st.label}</span>
            {c.prioridade === "urgente" && (
              <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#dc2626", background: "#fef2f2", padding: "2px 6px", borderRadius: 4 }}>🚨 URGENTE</span>
            )}
          </div>
          <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.assunto}</div>
          <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>
            🏫 {escola} · 👤 {c.usuario_nome} · {fmtDate(c.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
