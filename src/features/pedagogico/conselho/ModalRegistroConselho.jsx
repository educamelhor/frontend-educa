// src/features/pedagogico/conselho/ModalRegistroConselho.jsx
// ============================================================================
// Modal premium — REGISTRO DE CONSELHO DE CLASSE
// Exibe histórico de registros por aluno + formulário para novo registro.
// Acessível por: professor, coordenador, supervisor, diretor, vice-diretor.
// Rastreabilidade: data, autor, perfil.
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import { getFotoURL } from "../../../utils/foto";

// ── Mapa de cores por perfil ───────────────────────────────────────────────
const PERFIL_LABEL = {
  professor:    { label: "Professor",     bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  coordenador:  { label: "Coordenador",   bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  supervisor:   { label: "Supervisor",    bg: "#fdf4ff", color: "#7e22ce", dot: "#a855f7" },
  diretor:      { label: "Diretor",       bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  vice_diretor: { label: "Vice-Diretor",  bg: "#fefce8", color: "#a16207", dot: "#eab308" },
  secretario:   { label: "Secretário",    bg: "#f8fafc", color: "#475569", dot: "#94a3b8" },
  secretaria:   { label: "Secretaria",    bg: "#f8fafc", color: "#475569", dot: "#94a3b8" },
};

function perfilInfo(perfil) {
  const key = String(perfil || "").toLowerCase();
  return PERFIL_LABEL[key] || { label: perfil || "Usuário", bg: "#f8fafc", color: "#475569", dot: "#94a3b8" };
}

function formatarData(dtStr) {
  if (!dtStr) return "";
  const d = new Date(dtStr);
  if (isNaN(d)) return dtStr;
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} às ${hora}`;
}

// ── Ícones inline ──────────────────────────────────────────────────────────
const IcoX = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
    <path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
  </svg>
);
const IcoSend = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
  </svg>
);
const IcoClipboard = () => (
  <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
    <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
  </svg>
);
const IcoSpin = () => (
  <div style={{
    width: 18, height: 18, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    animation: "rc-spin 0.7s linear infinite",
    display: "inline-block",
  }} />
);

// ── Componente principal ───────────────────────────────────────────────────
export default function ModalRegistroConselho({ aluno, turma, onClose }) {
  const [registros, setRegistros]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [texto, setTexto]                 = useState("");
  const [enviando, setEnviando]           = useState(false);
  const [erro, setErro]                   = useState(null);
  const feedRef                           = useRef(null);

  // Dados do usuário logado (para exibir "você" nos registros)
  const usuarioNome = localStorage.getItem("nome_usuario") || localStorage.getItem("nome") || "Usuário";

  // ── Carrega registros ───────────────────────────────────────────────────
  useEffect(() => {
    carregarRegistros();
    // eslint-disable-next-line
  }, [aluno?.codigo]);

  async function carregarRegistros() {
    if (!aluno?.codigo) return;
    setLoading(true);
    setErro(null);
    try {
      const params = { aluno_codigo: aluno.codigo };
      if (turma?.id) params.turma_id = turma.id;
      const { data } = await api.get("/conselho/registros", { params });
      setRegistros(data.registros || []);
    } catch (err) {
      console.error("[CONSELHO] Erro ao carregar:", err);
      setErro("Não foi possível carregar os registros.");
    } finally {
      setLoading(false);
    }
  }

  // ── Envia novo registro ─────────────────────────────────────────────────
  async function handleEnviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      const { data } = await api.post("/conselho/registros", {
        aluno_codigo: aluno.codigo,
        turma_id: turma?.id || null,
        texto: texto.trim(),
      });

      // Adiciona o novo registro no topo (sem recarregar tudo)
      const novoRegistro = {
        id: data.id,
        aluno_codigo: aluno.codigo,
        turma_id: turma?.id || null,
        texto: texto.trim(),
        usuario_nome: data.usuario_nome || usuarioNome,
        usuario_perfil: data.usuario_perfil || "professor",
        criado_em: data.criado_em || new Date().toISOString(),
      };
      setRegistros(prev => [novoRegistro, ...prev]);
      setTexto("");

      // Scroll para o topo do feed
      feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[CONSELHO] Erro ao enviar:", err);
      setErro("Erro ao salvar o registro. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  // ── Foto do aluno ───────────────────────────────────────────────────────
  const fotoSrc = aluno?.foto_url || getFotoURL(aluno) || null;
  const turmaNome = turma?.nome || turma?.turma || "";

  return (
    <>
      {/* Animação de spin */}
      <style>{`
        @keyframes rc-spin { to { transform: rotate(360deg); } }
        @keyframes rc-fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .rc-registro-item { animation: rc-fadeIn 0.3s ease; }
      `}</style>

      {/* ── Overlay ── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}
      >
        {/* ── Modal Container ── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 680,
            maxHeight: "90vh",
            background: "#fff",
            borderRadius: "1.5rem",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ── Header ── */}
          <div style={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #2563eb 100%)",
            padding: "1.5rem 1.75rem 1.25rem",
            position: "relative",
            flexShrink: 0,
          }}>
            {/* Título */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: "0.75rem", padding: "0.6rem",
                backdropFilter: "blur(8px)",
              }}>
                <IcoClipboard />
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                  Registro de Conselho de Classe
                </p>
                <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 800, margin: "0.1rem 0 0", letterSpacing: "-0.02em" }}>
                  Histórico do Estudante
                </h2>
              </div>
            </div>

            {/* Card do aluno */}
            <div style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: "1rem", padding: "0.85rem 1.1rem",
              display: "flex", alignItems: "center", gap: "0.875rem",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
            }}>
              {fotoSrc ? (
                <img
                  src={fotoSrc}
                  alt={aluno?.estudante}
                  style={{
                    width: 48, height: 48, borderRadius: "50%",
                    objectFit: "cover", border: "2px solid rgba(255,255,255,0.4)",
                    flexShrink: 0,
                  }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.25rem", color: "#fff", fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {(aluno?.estudante || "?")[0]}
                </div>
              )}
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: 0, lineHeight: 1.2 }}>
                  {aluno?.estudante || "—"}
                </p>
                {turmaNome && (
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", margin: "0.2rem 0 0" }}>
                    Turma {turmaNome}
                  </p>
                )}
              </div>

              {/* Contador de registros */}
              {!loading && (
                <div style={{ marginLeft: "auto" }}>
                  <span style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff", fontWeight: 800,
                    fontSize: "0.75rem", padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                  }}>
                    {registros.length} registro{registros.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Botão fechar */}
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "rgba(255,255,255,0.15)",
                border: "none", borderRadius: "0.5rem",
                color: "#fff", cursor: "pointer",
                width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            >
              <IcoX />
            </button>
          </div>

          {/* ── Feed de Registros ── */}
          <div
            ref={feedRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.25rem 1.5rem",
              display: "flex", flexDirection: "column", gap: "0.875rem",
              background: "#f8fafc",
            }}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "3rem 0", color: "#94a3b8" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6",
                  animation: "rc-spin 0.8s linear infinite",
                }} />
                <p style={{ fontWeight: 600, margin: 0 }}>Carregando registros...</p>
              </div>
            ) : registros.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "3rem 1rem", color: "#94a3b8", gap: "0.75rem",
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "0.25rem",
                }}>
                  <IcoClipboard />
                </div>
                <p style={{ fontWeight: 700, color: "#64748b", margin: 0, fontSize: "1rem" }}>
                  Nenhum registro ainda
                </p>
                <p style={{ color: "#94a3b8", margin: 0, textAlign: "center", fontSize: "0.875rem", maxWidth: 280 }}>
                  Seja o primeiro a registrar uma observação sobre este estudante no Conselho de Classe.
                </p>
              </div>
            ) : (
              registros.map((reg) => {
                const pi = perfilInfo(reg.usuario_perfil);
                return (
                  <div
                    key={reg.id}
                    className="rc-registro-item"
                    style={{
                      background: "#fff",
                      borderRadius: "1rem",
                      padding: "1rem 1.2rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    {/* Cabeçalho do card */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.6rem" }}>
                      {/* Avatar por inicial */}
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: pi.bg,
                        border: `2px solid ${pi.dot}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: "0.85rem", color: pi.color,
                        flexShrink: 0,
                      }}>
                        {(reg.usuario_nome || "U")[0].toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>
                            {reg.usuario_nome}
                          </span>
                          <span style={{
                            background: pi.bg, color: pi.color,
                            fontSize: "0.65rem", fontWeight: 800,
                            padding: "0.15rem 0.55rem", borderRadius: "999px",
                            textTransform: "uppercase", letterSpacing: "0.05em",
                          }}>
                            {pi.label}
                          </span>
                        </div>
                        <p style={{ color: "#94a3b8", fontSize: "0.72rem", margin: 0, marginTop: "0.1rem" }}>
                          {formatarData(reg.criado_em)}
                        </p>
                      </div>

                      {/* Linha indicadora */}
                      <div style={{
                        width: 4, height: 36, borderRadius: 4,
                        background: pi.dot, flexShrink: 0,
                      }} />
                    </div>

                    {/* Texto do registro */}
                    <p style={{
                      color: "#334155", fontSize: "0.9rem", lineHeight: 1.65,
                      margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {reg.texto}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Formulário de Novo Registro ── */}
          <form
            onSubmit={handleEnviar}
            style={{
              padding: "1rem 1.5rem 1.25rem",
              borderTop: "1px solid #f1f5f9",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            {erro && (
              <div style={{
                background: "#fef2f2", color: "#dc2626",
                borderRadius: "0.65rem", padding: "0.6rem 0.9rem",
                fontSize: "0.82rem", fontWeight: 600,
                marginBottom: "0.75rem",
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                ⚠️ {erro}
              </div>
            )}

            <label style={{ display: "block", fontWeight: 700, color: "#1e293b", fontSize: "0.82rem", marginBottom: "0.5rem", letterSpacing: "0.02em" }}>
              Novo Registro
            </label>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Descreva as observações pertinentes ao conselho de classe sobre este estudante..."
                rows={3}
                disabled={enviando}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  borderRadius: "0.875rem",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "0.9rem",
                  lineHeight: 1.55,
                  resize: "vertical", minHeight: 72, maxHeight: 160,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  fontFamily: "inherit",
                  color: "#1e293b",
                  background: "#f8fafc",
                }}
                onFocus={e => {
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                  e.target.style.background = "#fff";
                }}
                onBlur={e => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "#f8fafc";
                }}
              />
              <button
                type="submit"
                disabled={!texto.trim() || enviando}
                style={{
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.875rem",
                  background: !texto.trim() || enviando
                    ? "#e2e8f0"
                    : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                  color: !texto.trim() || enviando ? "#94a3b8" : "#fff",
                  border: "none", cursor: !texto.trim() || enviando ? "not-allowed" : "pointer",
                  fontWeight: 800, fontSize: "0.85rem",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  transition: "all 0.2s",
                  flexShrink: 0, alignSelf: "flex-end",
                  boxShadow: !texto.trim() || enviando ? "none" : "0 4px 14px rgba(29,78,216,0.35)",
                  minWidth: 100, justifyContent: "center",
                  height: 44,
                }}
              >
                {enviando ? <IcoSpin /> : <IcoSend />}
                {enviando ? "Salvando..." : "Registrar"}
              </button>
            </div>

            {/* Info de rastreabilidade */}
            <p style={{ color: "#94a3b8", fontSize: "0.7rem", margin: "0.5rem 0 0", fontWeight: 500 }}>
              📋 Registrado em seu nome · Visível a todos os professores desta turma
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
