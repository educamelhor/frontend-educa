// src/features/pedagogico/conselho/ModalFichaConselhoClasse.jsx
// ============================================================================
// Ficha do Conselho de Classe — módulo PEDAGÓGICO (coordenação/direção)
//
// Abre via EyeIcon na tabela de alunos do ConselhoClasse.
//
// Regra LGPD: backend retorna foto=null quando consentimento_imagem≠1.
// Se foto=null → exibe iniciais. Nunca exibe foto sem consentimento.
//
// Diferença do módulo Professor:
//   ✅ Coordenação/Direção pode ver e editar TODOS os registros (sem restrição)
//   ✅ Todos os campos visíveis
//
// API:
//   GET  /api/conselho/registros?aluno_codigo=&turma_id=
//   POST /api/conselho/registros  { aluno_codigo, turma_id, texto }
//   PUT  /api/conselho/registros/:id  { texto }
//
// EXCLUSIVO: pedagogico/conselho. Não afeta outros módulos.
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  PencilSquareIcon,
  CheckIcon,
  XCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../../../services/api";
import { getFotoURL } from "../../../utils/foto";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(nome) {
  if (!nome) return "?";
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatarData(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

const AVATAR_COLORS = [
  ["#1e3a5f", "#3b82f6"], ["#064e3b", "#10b981"], ["#581c87", "#a855f7"],
  ["#7f1d1d", "#ef4444"], ["#92400e", "#f59e0b"], ["#0c4a6e", "#0ea5e9"],
  ["#1e1b4b", "#6366f1"],
];

function getAvatarColors(nome) {
  if (!nome) return AVATAR_COLORS[0];
  return AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length];
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ModalFichaConselhoClasse({ open, aluno, turma, onClose }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novoTexto, setNovoTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoTexto, setEditandoTexto] = useState("");
  const [fotoError, setFotoError] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open && aluno?.codigo) {
      setFotoError(false);
      fetchRegistros();
    }
    if (!open) {
      setNovoTexto("");
      setEditandoId(null);
      setEditandoTexto("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, aluno]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => dialogRef.current?.focus(), 0);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const params = { aluno_codigo: aluno.codigo };
      if (turma?.id) params.turma_id = turma.id;
      const res = await api.get("/api/conselho/registros", { params });
      setRegistros(res.data?.registros || []);
    } catch (err) {
      console.error("[ConselhoClasse] Erro ao carregar registros:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNovoRegistro = async () => {
    if (!novoTexto.trim()) return;
    setSalvando(true);
    try {
      await api.post("/api/conselho/registros", {
        aluno_codigo: aluno.codigo,
        turma_id: turma?.id || null,
        texto: novoTexto.trim(),
      });
      setNovoTexto("");
      fetchRegistros();
    } catch (err) {
      console.error("[ConselhoClasse] Erro ao salvar:", err);
      alert("Erro ao salvar o registro.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = async (id) => {
    if (!editandoTexto.trim()) return;
    try {
      await api.put(`/api/conselho/registros/${id}`, { texto: editandoTexto.trim() });
      setEditandoId(null);
      setEditandoTexto("");
      fetchRegistros();
    } catch (err) {
      console.error("[ConselhoClasse] Erro ao editar:", err);
      alert("Erro ao editar o registro.");
    }
  };

  if (!open || !aluno) return null;

  // LGPD: backend retorna foto=null se sem consentimento
  const fotoURL = !fotoError ? getFotoURL(aluno) : null;
  const mostrarFoto = !!(aluno.foto || aluno.foto_url) && !fotoError;
  const initials = getInitials(aluno.estudante);
  const [avatarBg, avatarText] = getAvatarColors(aluno.estudante);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="relative flex flex-col outline-none"
        style={{
          width: "min(860px, 96vw)", maxHeight: "92vh",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0f2847 0%, #1e3a5f 55%, #1a4a7a 100%)",
          padding: "28px 32px 24px", position: "relative", flexShrink: 0,
        }}>
          <div style={{
            position: "absolute", top: -60, right: -40,
            width: 200, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,179,237,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <button
            onClick={onClose}
            title="Fechar"
            style={{
              position: "absolute", top: 16, right: 16,
              padding: 6, borderRadius: 8, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
          >
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>

          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 16,
          }}>
            📋 CONSELHO DE CLASSE
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Avatar com LGPD */}
            <div style={{ flexShrink: 0, position: "relative" }}>
              {mostrarFoto ? (
                <img
                  src={fotoURL}
                  alt={aluno.estudante}
                  style={{
                    width: 72, height: 72, borderRadius: "50%", objectFit: "cover",
                    border: "3px solid rgba(255,255,255,0.25)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  }}
                  onError={() => setFotoError(true)}
                />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${avatarBg}, ${avatarText})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, fontWeight: 800, color: "#fff",
                  border: "3px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  letterSpacing: "-1px",
                }}>
                  {initials}
                </div>
              )}
              <div style={{
                position: "absolute", bottom: 3, right: 3,
                width: 14, height: 14, borderRadius: "50%",
                background: "#22c55e", border: "2px solid #0f2847",
              }} />
            </div>

            {/* Dados */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                margin: 0, fontSize: 20, fontWeight: 800, color: "#fff",
                lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {aluno.estudante}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {turma?.turma && (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)",
                    borderRadius: 99, padding: "4px 12px", border: "1px solid rgba(255,255,255,0.15)",
                  }}>🎓 {turma.turma}</span>
                )}
                {aluno.turno && (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)",
                    borderRadius: 99, padding: "4px 12px", border: "1px solid rgba(255,255,255,0.15)",
                  }}>🕐 {aluno.turno}</span>
                )}
                {aluno.codigo && (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)",
                    borderRadius: 99, padding: "4px 12px", border: "1px solid rgba(255,255,255,0.08)",
                  }}># {aluno.codigo}</span>
                )}
              </div>
            </div>

            {/* Counter */}
            <div style={{
              flexShrink: 0, textAlign: "center",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, padding: "10px 20px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                Registros
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#60a5fa", lineHeight: 1.1 }}>
                {loading ? "…" : registros.length}
              </div>
            </div>
          </div>
        </div>

        {/* ── CORPO ──────────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "24px 32px",
          background: "#f8fafc", display: "flex", flexDirection: "column", gap: 20,
        }}>
          {/* Novo registro */}
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 14, padding: "20px 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#64748b", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
              Novo registro do conselho
            </div>
            <textarea
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              rows={3}
              placeholder="Registre as observações do conselho de classe sobre este aluno…"
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1.5px solid #e2e8f0", borderRadius: 10,
                padding: "12px 14px", fontSize: 14, color: "#1e293b",
                resize: "vertical", outline: "none", lineHeight: 1.55,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={handleNovoRegistro}
                disabled={!novoTexto.trim() || salvando}
                style={{
                  padding: "9px 20px",
                  background: novoTexto.trim() && !salvando ? "linear-gradient(135deg, #1e3a5f, #2563eb)" : "#e2e8f0",
                  color: novoTexto.trim() && !salvando ? "#fff" : "#94a3b8",
                  border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  cursor: novoTexto.trim() && !salvando ? "pointer" : "not-allowed",
                  boxShadow: novoTexto.trim() && !salvando ? "0 4px 12px rgba(37,99,235,0.3)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {salvando ? "Salvando…" : "+ Adicionar registro"}
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#64748b", marginBottom: 14,
            }}>
              Histórico
              <span style={{
                marginLeft: 8, fontSize: 10,
                background: "#e0e7ff", color: "#3730a3",
                borderRadius: 99, padding: "2px 8px", fontWeight: 700,
              }}>
                {registros.length}
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                <style>{`@keyframes spin-ped { to { transform: rotate(360deg); }}`}</style>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: "3px solid #e2e8f0", borderTopColor: "#3b82f6",
                  animation: "spin-ped 0.7s linear infinite", margin: "0 auto 12px",
                }} />
                <p style={{ fontSize: 13 }}>Carregando registros…</p>
              </div>
            ) : registros.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
                background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0",
              }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  Nenhum registro lançado para este aluno nesta turma.
                </p>
                <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
                  Seja o primeiro a registrar uma observação.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {registros.map((reg) => (
                  <div
                    key={reg.id}
                    style={{
                      background: "#fff", border: "1px solid #e9eef5",
                      borderRadius: 14, padding: "16px 20px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      transition: "box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editandoId === reg.id ? (
                          <textarea
                            value={editandoTexto}
                            onChange={(e) => setEditandoTexto(e.target.value)}
                            rows={3}
                            autoFocus
                            style={{
                              width: "100%", boxSizing: "border-box",
                              border: "1.5px solid #3b82f6", borderRadius: 8,
                              padding: "10px 12px", fontSize: 14, resize: "vertical",
                              outline: "none", boxShadow: "0 0 0 3px rgba(59,130,246,0.12)",
                            }}
                          />
                        ) : (
                          <p style={{ margin: 0, fontSize: 14, color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {reg.texto}
                          </p>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{reg.usuario_nome}</span>
                          {reg.usuario_perfil && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "#dbeafe", color: "#1d4ed8", borderRadius: 99, padding: "2px 8px", textTransform: "capitalize" }}>
                              {reg.usuario_perfil}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{formatarData(reg.criado_em)}</span>
                          {reg.editado_em && (
                            <span style={{ fontSize: 11, color: "#cbd5e1", fontStyle: "italic" }}>
                              · editado por {reg.editado_por_nome}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações — coordenação/direção pode editar TODOS */}
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {editandoId === reg.id ? (
                          <>
                            <button
                              onClick={() => handleEditar(reg.id)}
                              title="Salvar"
                              style={{ padding: 6, borderRadius: 8, border: "none", cursor: "pointer", background: "#dcfce7", color: "#16a34a" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#bbf7d0"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "#dcfce7"; }}
                            >
                              <CheckIcon style={{ width: 16, height: 16 }} />
                            </button>
                            <button
                              onClick={() => { setEditandoId(null); setEditandoTexto(""); }}
                              title="Cancelar"
                              style={{ padding: 6, borderRadius: 8, border: "none", cursor: "pointer", background: "#fee2e2", color: "#dc2626" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#fecaca"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                            >
                              <XCircleIcon style={{ width: 16, height: 16 }} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setEditandoId(reg.id); setEditandoTexto(reg.texto); }}
                            title="Editar registro"
                            style={{ padding: 6, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#94a3b8" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#3b82f6"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                          >
                            <PencilSquareIcon style={{ width: 16, height: 16 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: "16px 32px", background: "#fff",
          borderTop: "1px solid #e9eef5",
          display: "flex", justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 22px", background: "#f1f5f9", color: "#475569",
              border: "1px solid #e2e8f0", borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
