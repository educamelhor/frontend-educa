// src/features/direcao/governanca/LogosEscola.jsx
// ============================================================================
// GESTÃO DE LOGOS INSTITUCIONAIS
// Diretor gerencia até 3 logos, definindo posição (esquerda / direita / nenhuma)
// e onde cada logo renderiza (boletim, documentos, gabaritos, convites).
// ============================================================================
import React, { useState, useRef, useCallback, useEffect } from "react";
import useEscolaLogos, { invalidateEscolaLogosCache } from "../../../hooks/useEscolaLogos";

function getApiRoot() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) return String(envUrl).replace(/\/api$/, "").replace(/\/$/, "");
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000";
  return "https://educa-backend-docker-659zo.ondigitalocean.app";
}
const API = getApiRoot();

const USO_OPTIONS = [
  { key: "boletim",    label: "📋 Boletins" },
  { key: "documentos", label: "📄 Documentos PDF" },
  { key: "gabarito",   label: "📝 Gabaritos" },
  { key: "convites",   label: "🎉 Convites e Divulgações" },
];

const POSICAO_META = {
  esquerda: { label: "Esquerda",  color: "#6366f1", bg: "#eef2ff" },
  direita:  { label: "Direita",   color: "#059669", bg: "#ecfdf5" },
  nenhuma:  { label: "Reserva",   color: "#94a3b8", bg: "#f8fafc" },
};

// ─── Subcomponente: Modal de Nome da Logo ─────────────────────────────────────
function ModalNomeLogo({ arquivo, onConfirm, onCancel }) {
  const [nome, setNome] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Pré-preenche com o nome do arquivo (sem extensão)
    if (arquivo?.name) {
      const semExt = arquivo.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setNome(semExt.charAt(0).toUpperCase() + semExt.slice(1));
    }
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [arquivo]);

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Preview da imagem selecionada */}
        {arquivo && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img
              src={URL.createObjectURL(arquivo)}
              alt="preview"
              style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain", borderRadius: 8, border: "1px solid #e2e8f0" }}
            />
          </div>
        )}
        <div style={s.modalIcon}>🏷️</div>
        <h3 style={s.modalTitle}>Nome desta logo</h3>
        <p style={s.modalDesc}>
          Dê um nome para identificar esta logo no sistema.<br />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Ex: Brasão da escola, Logo SEEDF, Logo CCMDF</span>
        </p>
        <input
          ref={inputRef}
          type="text"
          placeholder="Nome da logo..."
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && nome.trim()) onConfirm(nome.trim());
            if (e.key === "Escape") onCancel();
          }}
          style={{
            width: "100%", marginTop: 14, padding: "10px 14px",
            borderRadius: 8, border: "1.5px solid #6366f1",
            fontSize: 14, outline: "none", boxSizing: "border-box",
            fontFamily: "inherit",
          }}
          maxLength={100}
        />
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button style={s.btnCancel} onClick={onCancel}>Cancelar</button>
          <button
            style={{ ...s.btnConfirm, opacity: nome.trim() ? 1 : 0.5 }}
            onClick={() => { if (nome.trim()) onConfirm(nome.trim()); }}
            disabled={!nome.trim()}
          >
            ✅ Confirmar upload
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function LogosEscola({ showToast }) {
  const { logos, loading, reload } = useEscolaLogos();
  const [uploading, setUploading]       = useState(false);
  const [dragging, setDragging]         = useState(null);
  const [conflito, setConflito]         = useState(null);
  const [editingLabel, setEditingLabel] = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [pendingFile, setPendingFile]   = useState(null); // arquivo aguardando nome
  const uploadRef = useRef(null);

  const token    = localStorage.getItem("token");
  const escolaId = localStorage.getItem("escola_id");

  // Fallback de toast se o componente pai não passar showToast
  const toast = useCallback((msg, type = "info") => {
    if (typeof showToast === "function") {
      showToast(msg, type);
    } else {
      if (type === "error") alert("❌ " + msg);
      else console.info("[LogosEscola]", msg);
    }
  }, [showToast]);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "x-escola-id": escolaId || "",
  };

  // ─── Validação do arquivo (antes de pedir o nome) ───────────────────────────
  const handleFileChange = useCallback((file) => {
    if (!file) return;
    if (logos.length >= 3) {
      toast("Limite de 3 logos atingido. Remova uma antes de adicionar.", "error");
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast("Formato não permitido. Use PNG, JPG ou SVG.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Arquivo muito grande. Máximo: 5 MB.", "error");
      return;
    }
    // Arquivo válido → abre modal de nome
    setPendingFile(file);
  }, [logos, toast]);

  // ─── Upload com nome confirmado ────────────────────────────────────────────
  const handleUploadComNome = useCallback(async (label) => {
    if (!pendingFile || !label) return;
    setPendingFile(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("foto", pendingFile);
      fd.append("label", label);

      const res = await fetch(`${API}/api/escola-logos/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "x-escola-id": escolaId || "" },
        body: fd,
      });

      let data;
      try { data = await res.json(); }
      catch { throw new Error(`Erro no servidor (${res.status})`); }

      if (!res.ok || !data.ok) throw new Error(data.message || `Erro ${res.status} no upload`);

      invalidateEscolaLogosCache();
      reload();
      toast("✅ Logo enviada e processada com sucesso!", "success");
    } catch (err) {
      console.error("[LogosEscola] upload error:", err);
      toast(err.message || "Erro ao enviar logo. Tente novamente.", "error");
    } finally {
      setUploading(false);
    }
  }, [pendingFile, token, escolaId, reload, toast]);

  // ─── Alterar posição ───────────────────────────────────────────────────────
  const handlePosicao = useCallback(async (id, posicao, forcar = false) => {
    try {
      const res = await fetch(
        `${API}/api/escola-logos/${id}/posicao${forcar ? "?forcar=1" : ""}`,
        {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ posicao }),
        }
      );
      const data = await res.json();

      if (res.status === 409 && data.conflito) {
        setConflito({ id, posicao, logo_conflito: data.logo_conflito });
        return;
      }
      if (!data.ok) throw new Error(data.message || "Erro ao alterar posição");

      invalidateEscolaLogosCache();
      reload();
      toast("✅ Posição atualizada!", "success");
    } catch (err) {
      toast(err.message || "Erro ao alterar posição", "error");
    }
  }, [authHeaders, reload, toast]);

  // ─── Alterar usos ─────────────────────────────────────────────────────────
  const handleUsos = useCallback(async (id, usos) => {
    try {
      const res = await fetch(`${API}/api/escola-logos/${id}/usos`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ usos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      invalidateEscolaLogosCache();
      reload();
    } catch (err) {
      toast(err.message || "Erro ao salvar usos", "error");
    }
  }, [authHeaders, reload, toast]);

  // ─── Salvar label ─────────────────────────────────────────────────────────
  const handleSaveLabel = useCallback(async () => {
    if (!editingLabel?.value?.trim()) return;
    try {
      const res = await fetch(`${API}/api/escola-logos/${editingLabel.id}/label`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ label: editingLabel.value.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setEditingLabel(null);
      invalidateEscolaLogosCache();
      reload();
      toast("Nome atualizado!", "success");
    } catch (err) {
      toast(err.message || "Erro ao salvar nome", "error");
    }
  }, [editingLabel, authHeaders, reload, toast]);

  // ─── Remover logo ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    try {
      const res = await fetch(`${API}/api/escola-logos/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setDeletingId(null);
      invalidateEscolaLogosCache();
      reload();
      toast("Logo removida.", "success");
    } catch (err) {
      toast(err.message || "Erro ao remover logo", "error");
    }
  }, [authHeaders, reload, toast]);

  // ─── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = useCallback((e, posicao) => {
    e.preventDefault();
    setDragging(null);
    const id = e.dataTransfer.getData("logo_id");
    if (id) handlePosicao(Number(id), posicao);
  }, [handlePosicao]);

  const logoEsq = logos.find(l => l.posicao === "esquerda");
  const logoDir = logos.find(l => l.posicao === "direita");

  return (
    <div style={s.root}>
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div style={s.sectionHeader}>
        <div style={s.sectionIconWrap}>
          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <div>
          <h2 style={s.sectionTitle}>Logos &amp; Identidade Visual</h2>
          <p style={s.sectionDesc}>Gerencie até 3 logos. Defina posição e onde cada uma aparece nos documentos.</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={s.badge}>{logos.length}/3 logos</span>
          {logos.length < 3 && (
            <button
              style={{ ...s.uploadBtn, opacity: uploading ? 0.7 : 1 }}
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={s.spinnerSm} /> Processando...
                </span>
              ) : "＋ Adicionar logo"}
            </button>
          )}
          <input
            ref={uploadRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            style={{ display: "none" }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFileChange(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* ─── MAPA VISUAL DE POSIÇÕES ──────────────────────────────────────── */}
      <div style={s.mapaCard}>
        <p style={s.mapaLabel}>Pré-visualização do cabeçalho dos documentos</p>
        <div style={s.mapaRow}>

          {/* Drop zone esquerda */}
          <div
            style={{
              ...s.dropZone,
              borderColor: dragging === "esquerda" ? "#6366f1" : "#c7d2fe",
              background: dragging === "esquerda" ? "#eef2ff" : "#f5f6ff",
            }}
            onDragOver={e => { e.preventDefault(); setDragging("esquerda"); }}
            onDragLeave={() => setDragging(null)}
            onDrop={e => handleDrop(e, "esquerda")}
          >
            {logoEsq ? (
              <img src={logoEsq.url_thumb} alt={logoEsq.label} style={s.dropPreview} />
            ) : (
              <div style={s.dropEmpty}>
                <span style={{ fontSize: 28, opacity: 0.4 }}>🖼️</span>
                <span style={s.dropEmptyText}>Logo esquerda</span>
                <span style={s.dropEmptyHint}>Arraste ou clique em "Definir posição"</span>
              </div>
            )}
          </div>

          {/* Centro */}
          <div style={s.mapaCentro}>
            <div style={s.mapaCentroLine} />
            <div style={{ textAlign: "center" }}>
              <div style={s.mapaCentroTitle}>CABEÇALHO INSTITUCIONAL</div>
              <div style={s.mapaCentroSub}>Nome da escola · INEP · Secretaria</div>
            </div>
            <div style={s.mapaCentroLine} />
          </div>

          {/* Drop zone direita */}
          <div
            style={{
              ...s.dropZone,
              borderColor: dragging === "direita" ? "#059669" : "#a7f3d0",
              background: dragging === "direita" ? "#ecfdf5" : "#f0fdf9",
            }}
            onDragOver={e => { e.preventDefault(); setDragging("direita"); }}
            onDragLeave={() => setDragging(null)}
            onDrop={e => handleDrop(e, "direita")}
          >
            {logoDir ? (
              <img src={logoDir.url_thumb} alt={logoDir.label} style={s.dropPreview} />
            ) : (
              <div style={s.dropEmpty}>
                <span style={{ fontSize: 28, opacity: 0.4 }}>🖼️</span>
                <span style={s.dropEmptyText}>Logo direita</span>
                <span style={s.dropEmptyHint}>Arraste ou clique em "Definir posição"</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── GALERIA DE LOGOS ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={s.loadingBox}>
          <div style={s.spinner} />
          <p style={{ color: "#6b7280", marginTop: 12 }}>Carregando logos...</p>
        </div>
      ) : logos.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
          <h3 style={{ fontWeight: 700, color: "#374151", marginBottom: 6 }}>Nenhuma logo cadastrada</h3>
          <p style={{ color: "#6b7280", fontSize: 14 }}>Clique em "＋ Adicionar logo" para começar.</p>
        </div>
      ) : (
        <div style={s.gallery}>
          {logos.map(logo => {
            const posM = POSICAO_META[logo.posicao] || POSICAO_META.nenhuma;
            const usos = Array.isArray(logo.usos) ? logo.usos : [];

            return (
              <div
                key={logo.id}
                style={s.logoCard}
                draggable
                onDragStart={e => e.dataTransfer.setData("logo_id", String(logo.id))}
              >
                {/* Preview thumb */}
                <div style={s.thumbWrap}>
                  <img
                    src={logo.url_thumb}
                    alt={logo.label}
                    style={s.thumbImg}
                    onError={e => { e.target.style.display = "none"; }}
                  />
                </div>

                {/* Info */}
                <div style={s.cardBody}>
                  {/* Label */}
                  {editingLabel?.id === logo.id ? (
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <input
                        style={s.labelInput}
                        value={editingLabel.value}
                        onChange={e => setEditingLabel(prev => ({ ...prev, value: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveLabel(); if (e.key === "Escape") setEditingLabel(null); }}
                        autoFocus
                      />
                      <button style={s.btnSm} onClick={handleSaveLabel}>✓</button>
                      <button style={{ ...s.btnSm, background: "#f1f5f9", color: "#475569" }} onClick={() => setEditingLabel(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={s.logoLabel}>{logo.label}</span>
                      <button
                        style={s.iconBtn}
                        title="Renomear"
                        onClick={() => setEditingLabel({ id: logo.id, value: logo.label })}
                      >✏️</button>
                    </div>
                  )}

                  {/* Badge posição atual */}
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ ...s.posBadge, background: posM.bg, color: posM.color, border: `1px solid ${posM.color}30` }}>
                      {posM.label === "Esquerda" ? "◀ " : posM.label === "Direita" ? "▶ " : "○ "}
                      {posM.label}
                    </span>
                  </div>

                  {/* Seletor de posição */}
                  <div style={s.posRow}>
                    <span style={s.posLabel}>Posição:</span>
                    {["esquerda", "direita", "nenhuma"].map(p => (
                      <button
                        key={p}
                        style={{
                          ...s.posBtn,
                          background: logo.posicao === p ? POSICAO_META[p].color : "#f8fafc",
                          color: logo.posicao === p ? "#fff" : "#475569",
                          border: `1px solid ${logo.posicao === p ? POSICAO_META[p].color : "#e2e8f0"}`,
                        }}
                        onClick={() => handlePosicao(logo.id, p)}
                      >
                        {p === "esquerda" ? "◀ Esq." : p === "direita" ? "Dir. ▶" : "Reserva"}
                      </button>
                    ))}
                  </div>

                  {/* Checkboxes de uso */}
                  <div style={s.usosSection}>
                    <span style={s.posLabel}>Usar em:</span>
                    <div style={s.usosGrid}>
                      {USO_OPTIONS.map(opt => (
                        <label key={opt.key} style={s.usoLabel}>
                          <input
                            type="checkbox"
                            checked={usos.includes(opt.key)}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...usos, opt.key]
                                : usos.filter(u => u !== opt.key);
                              handleUsos(logo.id, next);
                            }}
                            style={{ marginRight: 4, accentColor: posM.color }}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Remover */}
                <button
                  style={s.deleteBtn}
                  title="Remover logo"
                  onClick={() => setDeletingId(logo.id)}
                >🗑️</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL NOME DA LOGO (substitui o prompt()) ────────────────────── */}
      {pendingFile && (
        <ModalNomeLogo
          arquivo={pendingFile}
          onConfirm={handleUploadComNome}
          onCancel={() => setPendingFile(null)}
        />
      )}

      {/* ─── MODAL CONFLITO DE POSIÇÃO ────────────────────────────────────── */}
      {conflito && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalIcon}>⚠️</div>
            <h3 style={s.modalTitle}>Posição já ocupada</h3>
            <p style={s.modalDesc}>
              A logo <strong>"{conflito.logo_conflito?.label}"</strong> já ocupa a posição{" "}
              <strong>{POSICAO_META[conflito.posicao]?.label}</strong>.
              <br />
              Deseja movê-la para <strong>Reserva</strong> e ocupar a posição com a nova logo?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button style={s.btnCancel} onClick={() => setConflito(null)}>Cancelar</button>
              <button
                style={s.btnConfirm}
                onClick={() => {
                  handlePosicao(conflito.id, conflito.posicao, true);
                  setConflito(null);
                }}
              >
                Sim, mover e definir posição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CONFIRMAR EXCLUSÃO ─────────────────────────────────────── */}
      {deletingId && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalIcon}>🗑️</div>
            <h3 style={s.modalTitle}>Remover logo?</h3>
            <p style={s.modalDesc}>Esta ação é irreversível. A imagem será removida do servidor e do banco de dados.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button style={s.btnCancel} onClick={() => setDeletingId(null)}>Cancelar</button>
              <button
                style={{ ...s.btnConfirm, background: "#ef4444" }}
                onClick={() => handleDelete(deletingId)}
              >
                Remover definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  root: { marginBottom: 24 },

  sectionHeader: {
    display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
    padding: "18px 24px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: 14, flexWrap: "wrap",
  },
  sectionIconWrap: {
    width: 44, height: 44, borderRadius: 10,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: 700, margin: 0 },
  sectionDesc:  { color: "#94a3b8", fontSize: 13, margin: "3px 0 0" },
  badge: {
    padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    background: "rgba(99,102,241,0.15)", color: "#a78bfa", border: "1px solid rgba(99,102,241,0.3)",
  },
  uploadBtn: {
    padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none",
    transition: "opacity .2s", display: "flex", alignItems: "center", gap: 6,
  },
  spinnerSm: {
    display: "inline-block", width: 13, height: 13,
    border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff",
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },

  // Mapa de posições
  mapaCard: {
    background: "#fff", borderRadius: 14, padding: "20px 24px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20, border: "1px solid #e2e8f0",
  },
  mapaLabel: { color: "#64748b", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 },
  mapaRow: { display: "flex", gap: 16, alignItems: "stretch", minHeight: 120 },
  dropZone: {
    flex: "0 0 160px", border: "2px dashed", borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all .2s", cursor: "pointer", padding: 8,
  },
  dropPreview: { maxWidth: "100%", maxHeight: 90, objectFit: "contain", borderRadius: 6 },
  dropEmpty: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 12 },
  dropEmptyText: { fontSize: 12, fontWeight: 600, color: "#64748b" },
  dropEmptyHint: { fontSize: 10, color: "#94a3b8", textAlign: "center" },
  mapaCentro: { flex: 1, display: "flex", alignItems: "center", gap: 12 },
  mapaCentroLine: { flex: 1, height: 1, background: "#e2e8f0" },
  mapaCentroTitle: { color: "#1e293b", fontSize: 12, fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" },
  mapaCentroSub:   { color: "#94a3b8", fontSize: 10, textAlign: "center", whiteSpace: "nowrap" },

  // Gallery
  gallery: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  logoCard: {
    background: "#fff", borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
    border: "1px solid #e2e8f0", overflow: "hidden", position: "relative",
    display: "flex", flexDirection: "column", cursor: "grab",
    transition: "box-shadow .2s",
  },
  thumbWrap: {
    background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
    display: "flex", alignItems: "center", justifyContent: "center",
    height: 110, padding: 12,
  },
  thumbImg: { maxWidth: "100%", maxHeight: 90, objectFit: "contain" },
  cardBody: { padding: "14px 16px", flex: 1 },
  logoLabel: { fontWeight: 600, fontSize: 14, color: "#1e293b" },
  posBadge: { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  posRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  posLabel: { fontSize: 11, fontWeight: 600, color: "#64748b", marginRight: 2, whiteSpace: "nowrap" },
  posBtn: {
    padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
    transition: "all .15s",
  },
  usosSection: { borderTop: "1px solid #f1f5f9", paddingTop: 10, marginTop: 4 },
  usosGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", marginTop: 6 },
  usoLabel: { fontSize: 12, color: "#475569", display: "flex", alignItems: "center", cursor: "pointer" },
  deleteBtn: {
    position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.9)",
    border: "1px solid #e2e8f0", borderRadius: 8, width: 30, height: 30,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontSize: 14, transition: "all .15s",
  },
  labelInput: {
    flex: 1, padding: "4px 8px", borderRadius: 6, border: "1px solid #6366f1",
    fontSize: 13, outline: "none",
  },
  iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "0 2px" },
  btnSm: {
    padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: "#6366f1", color: "#fff", border: "none", cursor: "pointer",
  },

  // Loading/Empty
  loadingBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: 48 },
  spinner: {
    width: 36, height: 36, border: "3px solid #e2e8f0",
    borderTop: "3px solid #6366f1", borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  emptyState: {
    textAlign: "center", padding: "48px 24px",
    background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0",
  },

  // Modal
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
  },
  modal: {
    background: "#fff", borderRadius: 16, padding: 32, maxWidth: 440, width: "90%",
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
  },
  modalIcon:  { fontSize: 36, textAlign: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#1e293b", textAlign: "center", margin: "0 0 10px" },
  modalDesc:  { fontSize: 14, color: "#475569", lineHeight: 1.6, textAlign: "center" },
  btnCancel: {
    padding: "8px 20px", borderRadius: 8, border: "1px solid #e2e8f0",
    background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13,
  },
  btnConfirm: {
    padding: "8px 20px", borderRadius: 8, border: "none",
    background: "#6366f1", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13,
  },
};
