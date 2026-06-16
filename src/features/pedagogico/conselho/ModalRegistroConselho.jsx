// src/features/pedagogico/conselho/ModalRegistroConselho.jsx
// Modal — Registro de Conselho de Classe
// Compartilhado entre Pedagógico (ConselhoClasse) e Professores (ConselhoClasseProfessor)
// GET  /api/conselho/registros?aluno_codigo=X&turma_id=Y  → lista registros
// POST /api/conselho/registros                             → cria novo registro
import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import api from "../../../services/api";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function avatarColor(nome) {
  const colors = ["#1d4ed8","#0369a1","#059669","#7c3aed","#b45309","#be123c","#0f766e"];
  let hash = 0;
  for (let i = 0; i < (nome || "").length; i++) hash = (nome.charCodeAt(i) + hash * 31) & 0xFFFFFFFF;
  return colors[Math.abs(hash) % colors.length];
}

export default function ModalRegistroConselho({ aluno, turma, onClose }) {
  const [registros, setRegistros]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [texto, setTexto]           = useState("");
  const [enviando, setEnviando]     = useState(false);
  const [erro, setErro]             = useState(null);
  const bottomRef                   = useRef(null);
  const textareaRef                 = useRef(null);

  const alunoCodigo = aluno?.codigo;
  const turmaId     = turma?.id || null;

  // ── Buscar registros ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!alunoCodigo) return;
    setLoading(true);
    api.get("/api/conselho/registros", { params: { aluno_codigo: alunoCodigo, turma_id: turmaId } })
      .then(res => setRegistros(res.data?.registros || []))
      .catch(() => setErro("Não foi possível carregar os registros."))
      .finally(() => setLoading(false));
  }, [alunoCodigo, turmaId]);

  // ── Rolar para o último registro ────────────────────────────────────────────
  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [registros, loading]);

  // ── Fechar com ESC ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Enviar novo registro ────────────────────────────────────────────────────
  const handleEnviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await api.post("/api/conselho/registros", {
        aluno_codigo: alunoCodigo,
        turma_id:     turmaId,
        texto:        t,
      });
      const novo = {
        id:              res.data.id,
        texto:           t,
        usuario_nome:    res.data.usuario_nome    || "Você",
        usuario_perfil:  res.data.usuario_perfil  || "",
        criado_em:       res.data.criado_em       || new Date().toISOString(),
      };
      setRegistros(prev => [...prev, novo]);
      setTexto("");
      textareaRef.current?.focus();
    } catch {
      setErro("Falha ao salvar registro. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEnviar();
  };

  // ── Badge de perfil ─────────────────────────────────────────────────────────
  const perfilBadge = (perfil) => {
    const map = {
      diretor:      { label: "Diretor",      bg: "#1e3a5f", color: "#bfdbfe" },
      coordenador:  { label: "Coordenação",  bg: "#064e3b", color: "#d1fae5" },
      professor:    { label: "Professor",    bg: "#78350f", color: "#fde68a" },
    };
    const p = String(perfil || "").toLowerCase();
    const style = map[p] || { label: perfil || "Usuário", bg: "#374151", color: "#e5e7eb" };
    return (
      <span style={{ background: style.bg, color: style.color, fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: "999px", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registro de Conselho de Classe"
        style={{ position: "relative", background: "#fff", borderRadius: "1.25rem", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", width: "95vw", maxWidth: 540, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter','Segoe UI',sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0f2044 0%, #1d4ed8 60%, #3b82f6 100%)", padding: "1.1rem 1.4rem", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.2rem" }}>👁️ Registro de Conselho</p>
              <h2 style={{ color: "#fff", fontSize: "1rem", fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{aluno?.estudante || "—"}</h2>
              {turma?.turma && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", margin: "0.1rem 0 0" }}>📋 {turma.turma}</p>}
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "0.5rem", padding: "0.4rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <XMarkIcon style={{ width: 20, height: 20, color: "#fff" }} />
            </button>
          </div>
        </div>

        {/* Timeline de registros */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", background: "#f8fafc" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 0", gap: "0.75rem", color: "#94a3b8" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6", animation: "mrc-spin 0.8s linear infinite" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Carregando registros…</span>
            </div>
          ) : registros.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 0", color: "#94a3b8" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
              <p style={{ fontWeight: 600, margin: 0 }}>Nenhum registro de conselho ainda.</p>
              <p style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>Use o campo abaixo para adicionar o primeiro.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {registros.map((r) => {
                const iniciais = (r.usuario_nome || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
                const cor = avatarColor(r.usuario_nome);
                return (
                  <div key={r.id} style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start" }}>
                    {/* Avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontWeight: 800, fontSize: "0.75rem" }}>
                      {iniciais}
                    </div>
                    {/* Bubble */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#1e293b" }}>{r.usuario_nome}</span>
                        {perfilBadge(r.usuario_perfil)}
                        <span style={{ color: "#94a3b8", fontSize: "0.7rem", marginLeft: "auto" }}>{formatDateTime(r.criado_em)}</span>
                      </div>
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0 0.75rem 0.75rem 0.75rem", padding: "0.65rem 0.9rem", fontSize: "0.85rem", color: "#334155", lineHeight: 1.5, boxShadow: "0 2px 6px rgba(0,0,0,0.04)", whiteSpace: "pre-wrap" }}>
                        {r.texto}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Área de novo registro */}
        <div style={{ flexShrink: 0, padding: "0.9rem 1.25rem 1rem", borderTop: "1px solid #e2e8f0", background: "#fff" }}>
          {erro && <p style={{ color: "#dc2626", fontSize: "0.78rem", marginBottom: "0.5rem", fontWeight: 600 }}>⚠️ {erro}</p>}
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite o registro de conselho… (Ctrl+Enter para enviar)"
              rows={3}
              style={{ flex: 1, resize: "none", border: "1px solid #cbd5e1", borderRadius: "0.75rem", padding: "0.65rem 0.9rem", fontSize: "0.875rem", lineHeight: 1.5, color: "#1e293b", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", background: "#f8fafc" }}
              onFocus={e => e.target.style.borderColor = "#3b82f6"}
              onBlur={e => e.target.style.borderColor = "#cbd5e1"}
            />
            <button
              onClick={handleEnviar}
              disabled={!texto.trim() || enviando}
              style={{ background: texto.trim() && !enviando ? "linear-gradient(135deg, #1d4ed8, #3b82f6)" : "#e2e8f0", color: texto.trim() && !enviando ? "#fff" : "#94a3b8", border: "none", borderRadius: "0.75rem", padding: "0.65rem 0.9rem", cursor: texto.trim() && !enviando ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
              title="Enviar registro (Ctrl+Enter)"
            >
              {enviando
                ? <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "mrc-spin 0.8s linear infinite" }} />
                : <PaperAirplaneIcon style={{ width: 20, height: 20 }} />}
            </button>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.68rem", marginTop: "0.35rem" }}>Ctrl+Enter para enviar</p>
        </div>
      </div>

      <style>{`@keyframes mrc-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
