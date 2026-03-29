// src/features/disciplinar/suporte/index.jsx
// ============================================================================
// SAC — Sistema de Abertura de Chamados
// Premium, multi-escola, escalável
// O usuário abre chamados, acompanha status, e visualiza respostas do admin.
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

// ── Constantes ──
const CATEGORIAS = [
  { value: "orientacao", label: "Orientação", icon: "📘", desc: "Preciso de ajuda para usar o sistema" },
  { value: "problema", label: "Problema", icon: "🐛", desc: "Algo não está funcionando corretamente" },
  { value: "sugestao", label: "Sugestão", icon: "💡", desc: "Tenho uma ideia de melhoria" },
  { value: "duvida", label: "Dúvida", icon: "❓", desc: "Tenho uma dúvida sobre funcionalidade" },
  { value: "outro", label: "Outro", icon: "📝", desc: "Assunto diverso" },
];
const PRIORIDADES = [
  { value: "baixa", label: "Baixa", color: "#64748b", bg: "#f1f5f9" },
  { value: "media", label: "Média", color: "#f59e0b", bg: "#fffbeb" },
  { value: "alta", label: "Alta", color: "#ef4444", bg: "#fef2f2" },
  { value: "urgente", label: "Urgente", color: "#dc2626", bg: "#fef2f2" },
];
const STATUS_MAP = {
  aberto: { label: "Aberto", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: "🔵" },
  em_andamento: { label: "Em Andamento", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "🟡" },
  respondido: { label: "Respondido", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "🟢" },
  fechado: { label: "Fechado", color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "⚪" },
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export default function SuporteSAC() {
  const [view, setView] = useState("list"); // list | novo | detalhe
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [chamadoDetalhe, setChamadoDetalhe] = useState(null);

  // Form novo chamado
  const [categoria, setCategoria] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  const perfil = String(localStorage.getItem("perfil") || "").toLowerCase();
  const isAdmin = ["diretor", "militar", "coordenador"].includes(perfil);

  // Admin response form
  const [respostaTexto, setRespostaTexto] = useState("");
  const [respondendo, setRespondendo] = useState(false);

  const fetchChamados = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set("status", filtroStatus);
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      const { data } = await api.get(`/api/suporte/chamados?${params.toString()}`);
      setChamados(data?.chamados || []);
      setTotal(data?.total || 0);
    } catch {
      mostrarMsg("Erro ao carregar chamados", "erro");
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, filtroCategoria]);

  useEffect(() => { fetchChamados(); }, [fetchChamados]);

  const mostrarMsg = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const handleNovoChamado = async (e) => {
    e.preventDefault();
    if (!categoria) return mostrarMsg("Selecione uma categoria", "erro");
    if (!assunto.trim()) return mostrarMsg("Informe o assunto", "erro");
    if (!descricao.trim()) return mostrarMsg("Descreva o chamado", "erro");
    setSalvando(true);
    try {
      await api.post("/api/suporte/chamados", { categoria, prioridade, assunto: assunto.trim(), descricao: descricao.trim() });
      mostrarMsg("✅ Chamado aberto com sucesso!");
      setCategoria(""); setPrioridade("media"); setAssunto(""); setDescricao("");
      setView("list");
      fetchChamados();
    } catch (err) {
      mostrarMsg(`❌ ${err?.response?.data?.message || "Erro ao abrir chamado"}`, "erro");
    } finally {
      setSalvando(false);
    }
  };

  const verDetalhe = async (id) => {
    try {
      const { data } = await api.get(`/api/suporte/chamados/${id}`);
      setChamadoDetalhe(data);
      setView("detalhe");
      setRespostaTexto("");
    } catch {
      mostrarMsg("Erro ao carregar chamado", "erro");
    }
  };

  const handleResponder = async (id, novoStatus) => {
    setRespondendo(true);
    try {
      await api.patch(`/api/suporte/chamados/${id}/status`, {
        status: novoStatus,
        resposta: respostaTexto.trim() || undefined,
      });
      mostrarMsg("✅ Chamado atualizado!");
      verDetalhe(id);
      fetchChamados();
    } catch (err) {
      mostrarMsg(`❌ ${err?.response?.data?.message || "Erro ao atualizar"}`, "erro");
    } finally {
      setRespondendo(false);
    }
  };

  // ── Contadores para KPIs ──
  const counts = {
    aberto: chamados.filter(c => c.status === "aberto").length,
    em_andamento: chamados.filter(c => c.status === "em_andamento").length,
    respondido: chamados.filter(c => c.status === "respondido").length,
    fechado: chamados.filter(c => c.status === "fechado").length,
  };

  // ── Styles ──
  const S = {
    page: { width: "100%", minHeight: "100vh", padding: "32px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 },
    title: { fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 },
    subtitle: { fontSize: "0.88rem", color: "#64748b", marginTop: 4 },
    btnPrimary: {
      display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 12,
      border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
      fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", transition: "all 0.2s",
      boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
    },
    btnSecondary: {
      display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10,
      border: "1px solid #e2e8f0", background: "#fff", color: "#475569",
      fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s",
    },
    kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 },
    kpiCard: (c) => ({
      borderRadius: 14, padding: "16px 20px", border: `1px solid ${c}18`,
      background: `linear-gradient(135deg, ${c}06, ${c}03)`, cursor: "pointer", transition: "all 0.2s",
    }),
    kpiValue: { fontSize: "1.6rem", fontWeight: 800 },
    kpiLabel: { fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" },
    filterRow: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
    filterBtn: (active) => ({
      padding: "6px 14px", borderRadius: 8, border: active ? "1px solid #6366f1" : "1px solid #e2e8f0",
      background: active ? "rgba(99,102,241,0.08)" : "#fff", color: active ? "#6366f1" : "#64748b",
      fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s",
    }),
    card: (isHover) => ({
      borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(226,232,240,0.9)",
      background: "#fff", cursor: "pointer", transition: "all 0.25s",
      boxShadow: isHover ? "0 8px 24px rgba(99,102,241,0.08)" : "0 1px 3px rgba(0,0,0,0.03)",
      transform: isHover ? "translateY(-2px)" : "none",
    }),
    badge: (c) => ({
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8,
      fontSize: "0.7rem", fontWeight: 700, background: c.bg, color: c.color,
    }),
    priorityDot: (c) => ({
      display: "inline-block", width: 8, height: 8, borderRadius: 4, background: c, marginRight: 6,
    }),
    msgBar: (tipo) => ({
      padding: "12px 18px", borderRadius: 12, fontWeight: 600, fontSize: "0.88rem", marginBottom: 16,
      background: tipo === "erro" ? "#fef2f2" : "#f0fdf4", color: tipo === "erro" ? "#dc2626" : "#16a34a",
      border: tipo === "erro" ? "1px solid #fecaca" : "1px solid #bbf7d0",
    }),
    formSection: {
      maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 20,
      border: "1px solid #e2e8f0", padding: 32, boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    },
    formLabel: { display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: 6 },
    formInput: {
      width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0",
      fontSize: "0.9rem", color: "#334155", outline: "none", transition: "all 0.2s",
      background: "#fff",
    },
    formTextarea: {
      width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0",
      fontSize: "0.9rem", color: "#334155", outline: "none", transition: "all 0.2s",
      background: "#fff", minHeight: 120, resize: "vertical", fontFamily: "inherit",
    },
    catCard: (sel) => ({
      padding: "14px 16px", borderRadius: 14, cursor: "pointer", transition: "all 0.2s",
      border: sel ? "2px solid #6366f1" : "1px solid #e2e8f0",
      background: sel ? "rgba(99,102,241,0.04)" : "#fff",
      boxShadow: sel ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
    }),
    detalheCard: {
      maxWidth: 800, margin: "0 auto", background: "#fff", borderRadius: 20,
      border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    },
    detalheHeader: {
      padding: "24px 32px", borderBottom: "1px solid #f1f5f9",
      background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
    },
    detalheBody: { padding: "24px 32px" },
    responseBox: {
      padding: 20, borderRadius: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", marginTop: 20,
    },
    empty: { textAlign: "center", padding: "60px 32px", color: "#94a3b8" },
  };

  // ═══════════════════════════════════════════
  // RENDER: NOVO CHAMADO
  // ═══════════════════════════════════════════
  if (view === "novo") {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <div>
            <div style={S.title}>📝 Novo Chamado</div>
            <div style={S.subtitle}>Preencha todos os campos para abrir seu chamado de suporte</div>
          </div>
          <button style={S.btnSecondary} onClick={() => setView("list")}>← Voltar</button>
        </div>

        {mensagem.texto && <div style={S.msgBar(mensagem.tipo)}>{mensagem.texto}</div>}

        <form onSubmit={handleNovoChamado}>
          <div style={S.formSection}>
            {/* Categoria */}
            <div style={{ marginBottom: 24 }}>
              <label style={S.formLabel}>Categoria do chamado *</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {CATEGORIAS.map((cat) => (
                  <div key={cat.value} style={S.catCard(categoria === cat.value)}
                    onClick={() => setCategoria(cat.value)}>
                    <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{cat.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>{cat.label}</div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{cat.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prioridade */}
            <div style={{ marginBottom: 24 }}>
              <label style={S.formLabel}>Prioridade</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PRIORIDADES.map((p) => (
                  <button type="button" key={p.value}
                    style={{
                      ...S.filterBtn(prioridade === p.value),
                      borderColor: prioridade === p.value ? p.color : "#e2e8f0",
                      background: prioridade === p.value ? p.bg : "#fff",
                      color: prioridade === p.value ? p.color : "#64748b",
                    }}
                    onClick={() => setPrioridade(p.value)}>
                    <span style={S.priorityDot(p.color)} />{p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assunto */}
            <div style={{ marginBottom: 20 }}>
              <label style={S.formLabel}>Assunto *</label>
              <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)}
                placeholder="Resumo breve do seu chamado" style={S.formInput}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: 24 }}>
              <label style={S.formLabel}>Descrição detalhada *</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Descreva com o máximo de detalhes possível: o que aconteceu, onde ocorreu, qual o resultado esperado..."
                style={S.formTextarea}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4, textAlign: "right" }}>
                {descricao.length} caractere{descricao.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setView("list")} style={S.btnSecondary}>
                Cancelar
              </button>
              <button type="submit" disabled={salvando} style={{ ...S.btnPrimary, opacity: salvando ? 0.6 : 1 }}>
                {salvando ? "Enviando..." : "🚀 Enviar Chamado"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER: DETALHE DO CHAMADO
  // ═══════════════════════════════════════════
  if (view === "detalhe" && chamadoDetalhe) {
    const c = chamadoDetalhe;
    const st = STATUS_MAP[c.status] || STATUS_MAP.aberto;
    const cat = CATEGORIAS.find(x => x.value === c.categoria) || CATEGORIAS[4];
    const pri = PRIORIDADES.find(x => x.value === c.prioridade) || PRIORIDADES[1];

    return (
      <div style={S.page}>
        <div style={S.header}>
          <div>
            <div style={S.title}>{cat.icon} Chamado #{c.id}</div>
            <div style={S.subtitle}>Aberto em {fmtDate(c.created_at)}</div>
          </div>
          <button style={S.btnSecondary} onClick={() => { setView("list"); setChamadoDetalhe(null); }}>← Voltar</button>
        </div>

        {mensagem.texto && <div style={S.msgBar(mensagem.tipo)}>{mensagem.texto}</div>}

        <div style={S.detalheCard}>
          <div style={S.detalheHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={S.badge(st)}>{st.icon} {st.label}</span>
              <span style={{ ...S.badge({ bg: pri.bg, color: pri.color }), gap: 4 }}>
                <span style={S.priorityDot(pri.color)} />{pri.label}
              </span>
              <span style={S.badge({ bg: "rgba(99,102,241,0.08)", color: "#6366f1" })}>{cat.icon} {cat.label}</span>
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{c.assunto}</h2>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 6 }}>
              Por <strong style={{ color: "#475569" }}>{c.usuario_nome}</strong>
              {c.usuario_perfil && <span> ({c.usuario_perfil})</span>}
              {" · "}{fmtDate(c.created_at)}
            </div>
          </div>

          <div style={S.detalheBody}>
            {/* Descrição */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Descrição
              </h3>
              <div style={{
                padding: 20, borderRadius: 14, background: "#f8fafc", border: "1px solid #f1f5f9",
                fontSize: "0.9rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>
                {c.descricao}
              </div>
            </div>

            {/* Resposta do Admin */}
            {c.resposta_admin && (
              <div style={S.responseBox}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "0.7rem", fontWeight: 800,
                  }}>✓</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#166534" }}>
                      Resposta da equipe
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#16a34a" }}>
                      {c.respondido_por && `Por ${c.respondido_por} · `}{fmtDate(c.respondido_em)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "0.9rem", color: "#166534", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {c.resposta_admin}
                </div>
              </div>
            )}

            {/* Admin: responder */}
            {isAdmin && c.status !== "fechado" && (
              <div style={{ marginTop: 28, padding: 20, borderRadius: 14, background: "#fafafa", border: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 10 }}>
                  Responder / Atualizar Status
                </h3>
                <textarea
                  value={respostaTexto}
                  onChange={e => setRespostaTexto(e.target.value)}
                  placeholder="Escreva sua resposta ao chamado..."
                  style={{ ...S.formTextarea, minHeight: 80, marginBottom: 12 }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {c.status === "aberto" && (
                    <button style={{ ...S.btnSecondary, borderColor: "#f59e0b", color: "#f59e0b" }}
                      disabled={respondendo}
                      onClick={() => handleResponder(c.id, "em_andamento")}>
                      🟡 Em Andamento
                    </button>
                  )}
                  <button style={{ ...S.btnPrimary, background: "linear-gradient(135deg, #10b981, #059669)" }}
                    disabled={respondendo}
                    onClick={() => handleResponder(c.id, "respondido")}>
                    ✅ {respostaTexto.trim() ? "Enviar Resposta" : "Marcar Respondido"}
                  </button>
                  <button style={{ ...S.btnSecondary, borderColor: "#94a3b8", color: "#64748b" }}
                    disabled={respondendo}
                    onClick={() => handleResponder(c.id, "fechado")}>
                    ⬜ Fechar Chamado
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Histórico
              </h3>
              <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 20, marginLeft: 8 }}>
                <TimelineItem icon="🔵" title="Chamado aberto" date={c.created_at} desc={`Por ${c.usuario_nome}`} />
                {c.status !== "aberto" && (
                  <TimelineItem icon="🟡" title="Status atualizado" date={c.updated_at} desc={`Para: ${STATUS_MAP[c.status]?.label || c.status}`} />
                )}
                {c.respondido_em && (
                  <TimelineItem icon="🟢" title="Resposta enviada" date={c.respondido_em} desc={`Por ${c.respondido_por || "Admin"}`} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER: LISTA DE CHAMADOS
  // ═══════════════════════════════════════════
  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>
            🎧 Suporte
            <span style={{
              fontSize: "0.55rem", fontWeight: 800,
              background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#fff",
              padding: "3px 8px", borderRadius: 8, letterSpacing: "0.5px",
            }}>SAC</span>
          </div>
          <div style={S.subtitle}>
            Central de atendimento — abra chamados e acompanhe o andamento
          </div>
        </div>
        <button style={S.btnPrimary} onClick={() => { setView("novo"); setMensagem({ texto: "", tipo: "" }); }}>
          ✚ Novo Chamado
        </button>
      </div>

      {mensagem.texto && <div style={S.msgBar(mensagem.tipo)}>{mensagem.texto}</div>}

      {/* KPI Cards */}
      <div style={S.kpiRow}>
        {[
          { key: "aberto", label: "Abertos", v: counts.aberto, c: "#3b82f6" },
          { key: "em_andamento", label: "Em Andamento", v: counts.em_andamento, c: "#f59e0b" },
          { key: "respondido", label: "Respondidos", v: counts.respondido, c: "#10b981" },
          { key: "fechado", label: "Fechados", v: counts.fechado, c: "#64748b" },
        ].map((k) => (
          <div key={k.key} style={S.kpiCard(k.c)}
            onClick={() => setFiltroStatus(filtroStatus === k.key ? "" : k.key)}>
            <div style={{ ...S.kpiValue, color: k.c }}>{k.v}</div>
            <div style={S.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtro de Categorias */}
      <div style={S.filterRow}>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>Filtrar:</span>
        <button style={S.filterBtn(!filtroStatus && !filtroCategoria)}
          onClick={() => { setFiltroStatus(""); setFiltroCategoria(""); }}>
          Todos ({total})
        </button>
        {CATEGORIAS.map(cat => (
          <button key={cat.value}
            style={S.filterBtn(filtroCategoria === cat.value)}
            onClick={() => setFiltroCategoria(filtroCategoria === cat.value ? "" : cat.value)}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{
            width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : chamados.length === 0 ? (
        /* Empty State */
        <div style={S.empty}>
          <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>💬</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>
            {filtroStatus || filtroCategoria ? "Nenhum chamado com esses filtros" : "Nenhum chamado aberto"}
          </div>
          <div style={{ fontSize: "0.88rem", color: "#94a3b8", marginBottom: 20 }}>
            {filtroStatus || filtroCategoria
              ? "Tente remover os filtros para ver todos os chamados"
              : "Abra seu primeiro chamado clicando no botão acima"}
          </div>
          {!filtroStatus && !filtroCategoria && (
            <button style={S.btnPrimary} onClick={() => setView("novo")}>
              ✚ Abrir Primeiro Chamado
            </button>
          )}
        </div>
      ) : (
        /* Cards de Chamados */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {chamados.map((c) => (
            <ChamadoCard key={c.id} chamado={c} S={S} onClick={() => verDetalhe(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card individual de chamado ──
function ChamadoCard({ chamado: c, S, onClick }) {
  const [hover, setHover] = useState(false);
  const st = STATUS_MAP[c.status] || STATUS_MAP.aberto;
  const cat = CATEGORIAS.find(x => x.value === c.categoria) || CATEGORIAS[4];
  const pri = PRIORIDADES.find(x => x.value === c.prioridade) || PRIORIDADES[1];

  return (
    <div
      style={S.card(hover)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${st.color}15, ${st.color}08)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.2rem", border: `1px solid ${st.color}20`,
        }}>
          {cat.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>#{c.id}</span>
            <span style={S.badge(st)}>{st.icon} {st.label}</span>
            <span style={{ ...S.badge({ bg: pri.bg, color: pri.color }) }}>
              <span style={S.priorityDot(pri.color)} />{pri.label}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#334155", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.assunto}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            {c.usuario_nome}{c.usuario_perfil ? ` (${c.usuario_perfil})` : ""} · {fmtDate(c.created_at)}
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: hover ? "rgba(99,102,241,0.08)" : "transparent",
          color: hover ? "#6366f1" : "#cbd5e1", transition: "all 0.2s",
        }}>
          →
        </div>
      </div>

      {/* Preview da resposta */}
      {c.resposta_admin && (
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 8,
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          fontSize: "0.78rem", color: "#166534",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          ✅ Resposta: {c.resposta_admin}
        </div>
      )}
    </div>
  );
}

// ── Item de timeline ──
function TimelineItem({ icon, title, date, desc }) {
  return (
    <div style={{ position: "relative", marginBottom: 16, paddingBottom: 4 }}>
      <div style={{
        position: "absolute", left: -29, top: 2, width: 18, height: 18, borderRadius: 9,
        background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.6rem", border: "2px solid #e2e8f0",
      }}>
        {icon}
      </div>
      <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#334155" }}>{title}</div>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{desc} · {fmtDate(date)}</div>
    </div>
  );
}
