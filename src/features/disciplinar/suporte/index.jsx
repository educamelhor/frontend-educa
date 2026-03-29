// src/features/disciplinar/suporte/index.jsx
// ============================================================================
// SAC Técnico — Sistema de Chamados (ESCOLA → CEO/Equipe Técnica)
// O usuário abre chamados de suporte técnico e acompanha as respostas
// da equipe técnica EDUCA.MELHOR. Ninguém na escola responde aqui.
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

// ── Categorias técnicas ──
const CATEGORIAS = [
  { value: "bug", label: "Bug / Erro", icon: "🐛", desc: "Algo não funciona como esperado" },
  { value: "acesso", label: "Acesso / Login", icon: "🔐", desc: "Erro de login, senha ou redirecionamento" },
  { value: "performance", label: "Lentidão", icon: "🐢", desc: "O sistema está lento ou travando" },
  { value: "duvida", label: "Dúvida Técnica", icon: "❓", desc: "Não sei como usar determinada função" },
  { value: "sugestao", label: "Sugestão", icon: "💡", desc: "Tenho uma ideia de melhoria" },
  { value: "outro", label: "Outro", icon: "📝", desc: "Assunto técnico diverso" },
];
const PRIORIDADES = [
  { value: "baixa", label: "Baixa", color: "#64748b", bg: "#f1f5f9" },
  { value: "media", label: "Média", color: "#f59e0b", bg: "#fffbeb" },
  { value: "alta", label: "Alta", color: "#ef4444", bg: "#fef2f2" },
  { value: "urgente", label: "Urgente", color: "#dc2626", bg: "#fef2f2" },
];
const STATUS_MAP = {
  aberto: { label: "Aberto", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: "🔵" },
  em_andamento: { label: "Analisando", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "🟡" },
  respondido: { label: "Respondido", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "🟢" },
  fechado: { label: "Resolvido", color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "⚪" },
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export default function SuporteSAC() {
  const [view, setView] = useState("list");
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [chamadoDetalhe, setChamadoDetalhe] = useState(null);

  // Form
  const [categoria, setCategoria] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  const fetchChamados = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set("status", filtroStatus);
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      const { data } = await api.get(`/api/suporte/chamados?${params.toString()}`);
      setChamados(data?.chamados || []);
      setTotal(data?.total || 0);
    } catch { mostrarMsg("Erro ao carregar chamados", "erro"); }
    finally { setLoading(false); }
  }, [filtroStatus, filtroCategoria]);

  useEffect(() => { fetchChamados(); }, [fetchChamados]);

  const mostrarMsg = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const handleNovo = async (e) => {
    e.preventDefault();
    if (!categoria) return mostrarMsg("Selecione uma categoria", "erro");
    if (!assunto.trim()) return mostrarMsg("Informe o assunto", "erro");
    if (!descricao.trim()) return mostrarMsg("Descreva o problema", "erro");
    setSalvando(true);
    try {
      await api.post("/api/suporte/chamados", { categoria, prioridade, assunto: assunto.trim(), descricao: descricao.trim() });
      mostrarMsg("✅ Chamado enviado para a equipe técnica EDUCA.MELHOR!");
      setCategoria(""); setPrioridade("media"); setAssunto(""); setDescricao("");
      setView("list"); fetchChamados();
    } catch (err) {
      mostrarMsg(`❌ ${err?.response?.data?.message || "Erro ao enviar chamado"}`, "erro");
    } finally { setSalvando(false); }
  };

  const verDetalhe = async (id) => {
    try {
      const { data } = await api.get(`/api/suporte/chamados/${id}`);
      setChamadoDetalhe(data); setView("detalhe");
    } catch { mostrarMsg("Erro ao carregar chamado", "erro"); }
  };

  const counts = {
    aberto: chamados.filter(c => c.status === "aberto").length,
    em_andamento: chamados.filter(c => c.status === "em_andamento").length,
    respondido: chamados.filter(c => c.status === "respondido").length,
    fechado: chamados.filter(c => c.status === "fechado").length,
  };

  // ══════ STYLES ══════
  const S = {
    page: { width: "100%", minHeight: "100vh", padding: "32px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 },
    title: { fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 },
    sub: { fontSize: "0.88rem", color: "#64748b", marginTop: 4 },
    btnPri: {
      display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 12,
      border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
      fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
      transition: "all 0.2s",
    },
    btnSec: {
      display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10,
      border: "1px solid #e2e8f0", background: "#fff", color: "#475569",
      fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s",
    },
    msgBar: (t) => ({
      padding: "12px 18px", borderRadius: 12, fontWeight: 600, fontSize: "0.88rem", marginBottom: 16,
      background: t === "erro" ? "#fef2f2" : "#f0fdf4", color: t === "erro" ? "#dc2626" : "#16a34a",
      border: t === "erro" ? "1px solid #fecaca" : "1px solid #bbf7d0",
    }),
    kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 },
    kpiCard: (c, active) => ({
      borderRadius: 14, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s",
      border: active ? `2px solid ${c}` : `1px solid ${c}18`,
      background: `linear-gradient(135deg, ${c}08, ${c}03)`,
      transform: active ? "scale(1.02)" : "none",
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
    card: (h) => ({
      borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(226,232,240,0.9)",
      background: "#fff", cursor: "pointer", transition: "all 0.25s",
      boxShadow: h ? "0 8px 24px rgba(99,102,241,0.08)" : "0 1px 3px rgba(0,0,0,0.03)",
      transform: h ? "translateY(-2px)" : "none",
    }),
    formSect: {
      maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 20,
      border: "1px solid #e2e8f0", padding: 32, boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    },
    lbl: { display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: 6 },
    inp: {
      width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0",
      fontSize: "0.9rem", color: "#334155", outline: "none", transition: "border 0.2s", background: "#fff",
    },
    txt: {
      width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0",
      fontSize: "0.9rem", color: "#334155", outline: "none", transition: "border 0.2s",
      background: "#fff", minHeight: 120, resize: "vertical", fontFamily: "inherit",
    },
    catCard: (s) => ({
      padding: "14px 16px", borderRadius: 14, cursor: "pointer", transition: "all 0.2s",
      border: s ? "2px solid #6366f1" : "1px solid #e2e8f0",
      background: s ? "rgba(99,102,241,0.04)" : "#fff",
      boxShadow: s ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
    }),
    detCard: {
      maxWidth: 800, margin: "0 auto", background: "#fff", borderRadius: 20,
      border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    },
    detHead: {
      padding: "24px 32px", borderBottom: "1px solid #f1f5f9",
      background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
    },
    detBody: { padding: "24px 32px" },
    empty: { textAlign: "center", padding: "60px 32px", color: "#94a3b8" },
  };

  // ═══════════════════════════════════════════
  // VIEW: NOVO CHAMADO
  // ═══════════════════════════════════════════
  if (view === "novo") return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.title}>📝 Novo Chamado Técnico</div>
          <div style={S.sub}>Descreva o problema técnico para a equipe EDUCA.MELHOR</div>
        </div>
        <button style={S.btnSec} onClick={() => setView("list")}>← Voltar</button>
      </div>

      {mensagem.texto && <div style={S.msgBar(mensagem.tipo)}>{mensagem.texto}</div>}

      {/* Info box */}
      <div style={{
        maxWidth: 720, margin: "0 auto 20px", padding: "14px 20px", borderRadius: 14,
        background: "linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04))",
        border: "1px solid rgba(99,102,241,0.12)", display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: "1.3rem" }}>🎧</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#4338ca" }}>Este chamado será enviado diretamente para a equipe técnica</div>
          <div style={{ fontSize: "0.75rem", color: "#6366f1" }}>Você receberá a resposta aqui mesmo. Tempo médio de resposta: 24h úteis.</div>
        </div>
      </div>

      <form onSubmit={handleNovo}>
        <div style={S.formSect}>
          {/* Categoria */}
          <div style={{ marginBottom: 24 }}>
            <label style={S.lbl}>Qual tipo de problema? *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {CATEGORIAS.map(cat => (
                <div key={cat.value} style={S.catCard(categoria === cat.value)} onClick={() => setCategoria(cat.value)}>
                  <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{cat.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>{cat.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{cat.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Prioridade */}
          <div style={{ marginBottom: 24 }}>
            <label style={S.lbl}>Prioridade</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRIORIDADES.map(p => (
                <button type="button" key={p.value}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontWeight: 600, fontSize: "0.78rem",
                    cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center",
                    border: prioridade === p.value ? `1px solid ${p.color}` : "1px solid #e2e8f0",
                    background: prioridade === p.value ? p.bg : "#fff",
                    color: prioridade === p.value ? p.color : "#64748b",
                  }}
                  onClick={() => setPrioridade(p.value)}>
                  <span style={S.prDot(p.color)} />{p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assunto */}
          <div style={{ marginBottom: 20 }}>
            <label style={S.lbl}>Assunto *</label>
            <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)}
              placeholder="Ex: Erro ao acessar página de notas" style={S.inp}
              onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: 24 }}>
            <label style={S.lbl}>Descrição detalhada *</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva o que aconteceu, em qual tela, qual erro apareceu, se possível cole a mensagem de erro..."
              style={S.txt}
              onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4, textAlign: "right" }}>
              {descricao.length} caractere{descricao.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setView("list")} style={S.btnSec}>Cancelar</button>
            <button type="submit" disabled={salvando} style={{ ...S.btnPri, opacity: salvando ? 0.6 : 1 }}>
              {salvando ? "Enviando..." : "🚀 Enviar Chamado"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  // ═══════════════════════════════════════════
  // VIEW: DETALHE
  // ═══════════════════════════════════════════
  if (view === "detalhe" && chamadoDetalhe) {
    const c = chamadoDetalhe;
    const st = STATUS_MAP[c.status] || STATUS_MAP.aberto;
    const cat = CATEGORIAS.find(x => x.value === c.categoria) || CATEGORIAS[5];
    const pri = PRIORIDADES.find(x => x.value === c.prioridade) || PRIORIDADES[1];

    return (
      <div style={S.page}>
        <div style={S.header}>
          <div>
            <div style={S.title}>{cat.icon} Chamado #{c.id}</div>
            <div style={S.sub}>Aberto em {fmtDate(c.created_at)}</div>
          </div>
          <button style={S.btnSec} onClick={() => { setView("list"); setChamadoDetalhe(null); }}>← Voltar</button>
        </div>

        {mensagem.texto && <div style={S.msgBar(mensagem.tipo)}>{mensagem.texto}</div>}

        <div style={S.detCard}>
          <div style={S.detHead}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={S.badge(st)}>{st.icon} {st.label}</span>
              <span style={{ ...S.badge({ bg: pri.bg, color: pri.color }) }}>
                <span style={S.prDot(pri.color)} />{pri.label}
              </span>
              <span style={S.badge({ bg: "rgba(99,102,241,0.08)", color: "#6366f1" })}>{cat.icon} {cat.label}</span>
            </div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{c.assunto}</h2>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 6 }}>
              Enviado por <strong style={{ color: "#475569" }}>{c.usuario_nome}</strong>
              {c.usuario_perfil && <span> ({c.usuario_perfil})</span>}
              {" · "}{fmtDate(c.created_at)}
            </div>
          </div>

          <div style={S.detBody}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Descrição do Problema
              </h3>
              <div style={{
                padding: 20, borderRadius: 14, background: "#f8fafc", border: "1px solid #f1f5f9",
                fontSize: "0.9rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>
                {c.descricao}
              </div>
            </div>

            {/* Resposta da equipe técnica */}
            {c.resposta_ceo ? (
              <div style={{
                padding: 20, borderRadius: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "0.7rem", fontWeight: 800,
                  }}>✓</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#166534" }}>Resposta da Equipe Técnica EDUCA.MELHOR</div>
                    <div style={{ fontSize: "0.72rem", color: "#16a34a" }}>
                      {c.respondido_por && `${c.respondido_por} · `}{fmtDate(c.respondido_em)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "0.9rem", color: "#166534", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {c.resposta_ceo}
                </div>
              </div>
            ) : c.status === "aberto" ? (
              <div style={{
                padding: 16, borderRadius: 12, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)",
                fontSize: "0.85rem", color: "#3b82f6", display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: "1.1rem" }}>⏳</span>
                Aguardando análise da equipe técnica...
              </div>
            ) : c.status === "em_andamento" ? (
              <div style={{
                padding: 16, borderRadius: 12, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)",
                fontSize: "0.85rem", color: "#d97706", display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: "1.1rem" }}>🔧</span>
                A equipe técnica está analisando seu chamado...
              </div>
            ) : null}

            {/* Timeline */}
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Histórico
              </h3>
              <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 20, marginLeft: 8 }}>
                <TLine icon="🔵" t="Chamado enviado" d={c.created_at} s={`Por ${c.usuario_nome}`} />
                {c.status !== "aberto" && <TLine icon="🟡" t="Equipe técnica atualizou" d={c.updated_at} s={`Status: ${st.label}`} />}
                {c.respondido_em && <TLine icon="🟢" t="Resposta recebida" d={c.respondido_em} s={`Por ${c.respondido_por || "Equipe Técnica"}`} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // VIEW: LISTA
  // ═══════════════════════════════════════════
  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.title}>
            🎧 Suporte Técnico
            <span style={{
              fontSize: "0.55rem", fontWeight: 800,
              background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#fff",
              padding: "3px 8px", borderRadius: 8, letterSpacing: "0.5px",
            }}>SAC</span>
          </div>
          <div style={S.sub}>Comunique problemas técnicos diretamente para a equipe EDUCA.MELHOR</div>
        </div>
        <button style={S.btnPri} onClick={() => { setView("novo"); setMensagem({ texto: "", tipo: "" }); }}>
          ✚ Novo Chamado
        </button>
      </div>

      {mensagem.texto && <div style={S.msgBar(mensagem.tipo)}>{mensagem.texto}</div>}

      {/* KPIs */}
      <div style={S.kpiRow}>
        {[
          { key: "aberto", label: "Abertos", v: counts.aberto, c: "#3b82f6" },
          { key: "em_andamento", label: "Analisando", v: counts.em_andamento, c: "#f59e0b" },
          { key: "respondido", label: "Respondidos", v: counts.respondido, c: "#10b981" },
          { key: "fechado", label: "Resolvidos", v: counts.fechado, c: "#64748b" },
        ].map(k => (
          <div key={k.key} style={S.kpiCard(k.c, filtroStatus === k.key)} onClick={() => setFiltroStatus(filtroStatus === k.key ? "" : k.key)}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={S.filterRow}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Categoria:</span>
        <button style={S.filterBtn(!filtroCategoria)} onClick={() => setFiltroCategoria("")}>Todas</button>
        {CATEGORIAS.map(cat => (
          <button key={cat.value} style={S.filterBtn(filtroCategoria === cat.value)}
            onClick={() => setFiltroCategoria(filtroCategoria === cat.value ? "" : cat.value)}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : chamados.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🎧</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>
            {filtroStatus || filtroCategoria ? "Nenhum chamado com esses filtros" : "Nenhum chamado registrado"}
          </div>
          <div style={{ fontSize: "0.88rem", color: "#94a3b8", marginBottom: 20 }}>
            {filtroStatus || filtroCategoria ? "Remova os filtros para ver todos" : "Encontrou um problema? Comunique à equipe técnica"}
          </div>
          {!filtroStatus && !filtroCategoria && (
            <button style={S.btnPri} onClick={() => setView("novo")}>✚ Abrir Primeiro Chamado</button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {chamados.map(c => <ChamadoItem key={c.id} c={c} S={S} onClick={() => verDetalhe(c.id)} />)}
        </div>
      )}
    </div>
  );
}

function ChamadoItem({ c, S, onClick }) {
  const [h, setH] = useState(false);
  const st = STATUS_MAP[c.status] || STATUS_MAP.aberto;
  const cat = CATEGORIAS.find(x => x.value === c.categoria) || CATEGORIAS[5];
  const pri = PRIORIDADES.find(x => x.value === c.prioridade) || PRIORIDADES[1];

  return (
    <div style={S.card(h)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${st.color}12, ${st.color}06)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.15rem", border: `1px solid ${st.color}18`,
        }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>#{c.id}</span>
            <span style={S.badge(st)}>{st.icon} {st.label}</span>
            <span style={{ ...S.badge({ bg: pri.bg, color: pri.color }) }}><span style={S.prDot(pri.color)} />{pri.label}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.assunto}</div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{fmtDate(c.created_at)}</div>
        </div>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: h ? "rgba(99,102,241,0.08)" : "transparent",
          color: h ? "#6366f1" : "#cbd5e1", transition: "all 0.2s", fontWeight: 700,
        }}>→</div>
      </div>
      {c.resposta_ceo && (
        <div style={{
          marginTop: 8, padding: "6px 12px", borderRadius: 8,
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          fontSize: "0.75rem", color: "#166534", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>✅ Resposta: {c.resposta_ceo}</div>
      )}
    </div>
  );
}

function TLine({ icon, t, d, s }) {
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <div style={{
        position: "absolute", left: -29, top: 2, width: 16, height: 16, borderRadius: 8,
        background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.55rem", border: "2px solid #e2e8f0",
      }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#334155" }}>{t}</div>
      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{s} · {fmtDate(d)}</div>
    </div>
  );
}
