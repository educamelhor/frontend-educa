// src/features/direcao/governanca/Governanca.jsx
// ============================================================================
// GOVERNANÇA — Painel de configurações da escola
// Diretor e Vice-Diretor gerenciam permissões e políticas do EDUCA.MELHOR
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ── Mapa de ícones SVG por categoria (inline para zero deps) ──
const CATEGORY_META = {
  boletim: {
    label: "Boletim",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#6366f1",
  },
  professores: {
    label: "Professores",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#10b981",
  },
  coordenacao: {
    label: "Coordenação",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "#f59e0b",
  },
  supervisao: {
    label: "Supervisão",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    color: "#ec4899",
  },
  secretaria: {
    label: "Secretaria",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    color: "#06b6d4",
  },
  geral: {
    label: "Geral",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    color: "#64748b",
  },
};

// Categorias serão exibidas na ordem retornada pelo backend (definida pelo CEO)

export default function Governanca() {
  const [configsPorCategoria, setConfigsPorCategoria] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedCats, setExpandedCats] = useState(new Set());
  const [pendingChanges, setPendingChanges] = useState({}); // { id: valor }

  const escolaId = localStorage.getItem("escola_id");
  const token = localStorage.getItem("token");
  const perfil = String(localStorage.getItem("perfil") || "").toLowerCase();

  // ── Fetch configurações ──
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/governanca?escola_id=${escolaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-escola-id": escolaId,
          "x-perfil": perfil,
        },
      });
      const data = await res.json();
      if (data.ok) {
        setConfigsPorCategoria(data.configuracoes || {});
        // Expand all by default on first load
        setExpandedCats(new Set(Object.keys(data.configuracoes || {})));
      } else {
        showToast(data.message || "Erro ao carregar configurações", "error");
      }
    } catch (err) {
      showToast("Erro de conexão com o servidor", "error");
    } finally {
      setLoading(false);
    }
  }, [escolaId, token, perfil]);

  useEffect(() => {
    if (escolaId && token) fetchConfigs();
  }, [fetchConfigs, escolaId, token]);

  // ── Toast ──
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Toggle categoria ──
  const toggleCat = (cat) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── Alterar valor localmente ──
  const handleChange = (id, newVal) => {
    setPendingChanges((prev) => ({ ...prev, [id]: newVal }));
    // Atualiza UI imediatamente
    setConfigsPorCategoria((prev) => {
      const copy = { ...prev };
      for (const cat of Object.keys(copy)) {
        copy[cat] = copy[cat].map((cfg) =>
          cfg.id === id ? { ...cfg, valor: String(newVal) } : cfg
        );
      }
      return copy;
    });
  };

  // ── Salvar tudo ──
  const handleSave = async () => {
    const items = Object.entries(pendingChanges).map(([id, valor]) => ({
      id: Number(id),
      valor: String(valor),
    }));
    if (items.length === 0) {
      showToast("Nenhuma alteração pendente.", "info");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API}/api/governanca/batch/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-escola-id": escolaId,
          "x-perfil": perfil,
        },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`✅ ${data.message}`, "success");
        setPendingChanges({});
      } else {
        showToast(data.message || "Erro ao salvar", "error");
      }
    } catch {
      showToast("Erro de conexão ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  const hasPending = Object.keys(pendingChanges).length > 0;

  // ── Categorias na ordem retornada pelo backend (ordem do CEO) ──
  const orderedCats = Object.keys(configsPorCategoria);

  // ── Total de configs ──
  const totalConfigs = Object.values(configsPorCategoria).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div style={styles.root}>
      {/* ── TOAST ── */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background:
              toast.type === "error"
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : toast.type === "info"
                ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                : "linear-gradient(135deg, #10b981, #059669)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: 32, height: 32 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 style={styles.headerTitle}>Governança</h1>
            <p style={styles.headerSub}>
              Configure permissões, políticas e regras do EDUCA.MELHOR para sua escola.
            </p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.statsBox}>
            <span style={styles.statsNumber}>{totalConfigs}</span>
            <span style={styles.statsLabel}>configurações</span>
          </div>
          <div style={styles.statsBox}>
            <span style={styles.statsNumber}>{orderedCats.length}</span>
            <span style={styles.statsLabel}>categorias</span>
          </div>
        </div>
      </div>

      {/* ── BARRA SALVAR (fixa quando há pendentes) ── */}
      {hasPending && (
        <div style={styles.saveBar}>
          <span style={styles.saveBarText}>
            ⚠️ Você tem <strong>{Object.keys(pendingChanges).length}</strong> alteração(ões) não
            salvas
          </span>
          <button
            style={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "💾 Salvar Alterações"}
          </button>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p style={{ color: "#6b7280", marginTop: 16 }}>Carregando configurações...</p>
        </div>
      ) : (
        /* ── CATEGORIAS ── */
        <div style={styles.grid}>
          {orderedCats.map((cat) => {
            const meta = CATEGORY_META[cat] || {
              label: cat.charAt(0).toUpperCase() + cat.slice(1),
              icon: CATEGORY_META.geral.icon,
              gradient: CATEGORY_META.geral.gradient,
              color: CATEGORY_META.geral.color,
            };
            const isExpanded = expandedCats.has(cat);
            const items = configsPorCategoria[cat] || [];

            return (
              <div key={cat} style={styles.categoryCard}>
                {/* Topo da categoria */}
                <button
                  style={styles.categoryHeader}
                  onClick={() => toggleCat(cat)}
                  type="button"
                >
                  <div
                    style={{
                      ...styles.categoryIconCircle,
                      background: meta.gradient,
                    }}
                  >
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={styles.categoryName}>{meta.label}</div>
                    <div style={styles.categoryCount}>
                      {items.length} {items.length === 1 ? "configuração" : "configurações"}
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      width: 20,
                      height: 20,
                      color: "#9ca3af",
                      transition: "transform .2s ease",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Items */}
                {isExpanded && (
                  <div style={styles.itemsList}>
                    {items.map((cfg) => (
                      <ConfigItem
                        key={cfg.id}
                        cfg={cfg}
                        color={meta.color}
                        onChange={handleChange}
                        isPending={pendingChanges[cfg.id] !== undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FOOTER INFO ── */}
      {!loading && (
        <div style={styles.footer}>
          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16, marginRight: 6, color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span style={{ color: "#9ca3af", fontSize: 13 }}>
            Apenas <strong>Diretor</strong> e <strong>Vice-Diretor</strong> podem alterar estas configurações.
            As opções disponíveis são gerenciadas centralmente pela plataforma EDUCA.MELHOR.
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIG ITEM — Linha individual de configuração
// ═══════════════════════════════════════════════════════════════
function ConfigItem({ cfg, color, onChange, isPending }) {
  const isBool = cfg.tipo === "boolean";
  const isSelect = cfg.tipo === "select";
  const isOn = String(cfg.valor) === "1" || String(cfg.valor).toLowerCase() === "true";

  return (
    <div
      style={{
        ...styles.configItem,
        borderLeft: isPending ? `3px solid ${color}` : "3px solid transparent",
        background: isPending ? "rgba(99, 102, 241, 0.03)" : "transparent",
      }}
    >
      <div style={styles.configInfo}>
        <div style={styles.configDescricao}>{cfg.descricao || cfg.chave}</div>
        <div style={styles.configChave}>{cfg.chave}</div>
      </div>

      <div style={styles.configControl}>
        {isBool ? (
          <button
            type="button"
            onClick={() => onChange(cfg.id, isOn ? "0" : "1")}
            style={{
              ...styles.toggle,
              background: isOn
                ? `linear-gradient(135deg, ${color}, ${color}cc)`
                : "#e5e7eb",
            }}
            title={isOn ? "Ativado — clique para desativar" : "Desativado — clique para ativar"}
          >
            <div
              style={{
                ...styles.toggleKnob,
                transform: isOn ? "translateX(20px)" : "translateX(2px)",
              }}
            />
          </button>
        ) : isSelect ? (
          <select
            value={cfg.valor}
            onChange={(e) => onChange(cfg.id, e.target.value)}
            style={styles.selectInput}
          >
            {(cfg.opcoes_json || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={cfg.valor}
            onChange={(e) => onChange(cfg.id, e.target.value)}
            style={styles.textInput}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES — Premium inline styles
// ═══════════════════════════════════════════════════════════════
const styles = {
  root: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "0 8px",
    fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
  },

  // Toast
  toast: {
    position: "fixed",
    top: 24,
    right: 24,
    zIndex: 9999,
    padding: "12px 24px",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    animation: "slideIn .3s ease",
  },

  // Header
  headerCard: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: 16,
    padding: "28px 32px",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  headerSub: {
    fontSize: 14,
    color: "#94a3b8",
    margin: "4px 0 0",
    maxWidth: 420,
  },
  headerRight: {
    display: "flex",
    gap: 20,
  },
  statsBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: "12px 20px",
    minWidth: 80,
  },
  statsNumber: {
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
  },
  statsLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginTop: 2,
  },

  // Save bar
  saveBar: {
    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
    border: "1px solid #f59e0b",
    borderRadius: 12,
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  saveBarText: {
    fontSize: 14,
    color: "#92400e",
  },
  saveBtn: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 24px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    transition: "all .2s ease",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
  },

  // Loading
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  // Grid
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  // Category
  categoryCard: {
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
    transition: "box-shadow .2s ease",
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "18px 20px",
    border: "none",
    background: "none",
    cursor: "pointer",
    gap: 14,
    transition: "background .15s ease",
  },
  categoryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
  },
  categoryCount: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },

  // Items
  itemsList: {
    borderTop: "1px solid #f1f5f9",
  },
  configItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px 14px 23px",
    borderBottom: "1px solid #f8fafc",
    gap: 16,
    transition: "background .15s ease",
  },
  configInfo: {
    flex: 1,
    minWidth: 0,
  },
  configDescricao: {
    fontSize: 14,
    color: "#334155",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  configChave: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "'Courier New', monospace",
    marginTop: 3,
  },
  configControl: {
    flexShrink: 0,
  },

  // Toggle switch
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: "background .2s ease",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#fff",
    position: "absolute",
    top: 2,
    transition: "transform .2s ease",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
  },

  // Select
  selectInput: {
    padding: "8px 32px 8px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
    outline: "none",
    appearance: "auto",
    minWidth: 100,
  },

  // Text
  textInput: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    fontSize: 13,
    fontWeight: 500,
    color: "#334155",
    outline: "none",
    minWidth: 120,
    transition: "border .15s ease",
  },

  // Footer
  footer: {
    display: "flex",
    alignItems: "center",
    marginTop: 24,
    padding: "16px 0",
    borderTop: "1px solid #f1f5f9",
  },
};

// ── CSS Keyframes (injected once) ──
if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideIn {
      from { transform: translateX(60px); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(styleEl);
}
