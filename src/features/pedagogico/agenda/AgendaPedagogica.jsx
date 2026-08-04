// src/features/pedagogico/agenda/AgendaPedagogica.jsx
// ============================================================================
// AGENDA PEDAGÓGICA — Design premium estilo sistemaeducamelhor.com.br
// Cards temáticos com modal de cadastro de eventos por tema.
// ============================================================================
import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import {
  XMarkIcon,
  PlusIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  BeakerIcon,
  StarIcon,
  BookOpenIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

// ─── Configuração dos temas de agenda ─────────────────────────────────────────
const TEMAS = [
  {
    id: "semana_prova",
    label: "Semana de Prova",
    emoji: "📝",
    descricao: "Agende as datas das avaliações por bimestre.",
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)",
    shadow: "rgba(30,64,175,0.35)",
    accent: "#60a5fa",
    icon: AcademicCapIcon,
  },
  {
    id: "projeto",
    label: "Projetos",
    emoji: "🚀",
    descricao: "Projetos interdisciplinares e atividades especiais.",
    gradient: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
    shadow: "rgba(5,150,105,0.35)",
    accent: "#34d399",
    icon: BeakerIcon,
  },
  {
    id: "evento",
    label: "Eventos",
    emoji: "🎉",
    descricao: "Festividades, datas comemorativas e eventos escolares.",
    gradient: "linear-gradient(135deg, #581c87 0%, #7c3aed 100%)",
    shadow: "rgba(124,58,237,0.35)",
    accent: "#c4b5fd",
    icon: StarIcon,
  },
  {
    id: "reuniao",
    label: "Reuniões",
    emoji: "🤝",
    descricao: "Reuniões pedagógicas, de pais e responsáveis.",
    gradient: "linear-gradient(135deg, #92400e 0%, #d97706 100%)",
    shadow: "rgba(217,119,6,0.35)",
    accent: "#fcd34d",
    icon: UsersIcon,
  },
  {
    id: "conselho_classe",
    label: "Conselho de Classe",
    emoji: "📋",
    descricao: "Datas dos conselhos de classe por período letivo.",
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)",
    shadow: "rgba(2,132,199,0.35)",
    accent: "#38bdf8",
    icon: ClipboardDocumentListIcon,
  },
  {
    id: "recuperacao",
    label: "Recuperação",
    emoji: "📚",
    descricao: "Calendário de estudos e provas de recuperação.",
    gradient: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)",
    shadow: "rgba(220,38,38,0.35)",
    accent: "#fca5a5",
    icon: BookOpenIcon,
  },
];

const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

// ─── Componente principal ──────────────────────────────────────────────────────
export default function AgendaPedagogica() {
  const [modalTema, setModalTema] = useState(null);   // tema aberto no modal
  const [eventos, setEventos] = useState({});          // { tema_id: [ ...eventos ] }
  const [loadingTema, setLoadingTema] = useState(null);
  const [counts, setCounts] = useState({});            // { tema_id: count }

  // Carrega contagem de eventos por tema ao montar
  useEffect(() => {
    TEMAS.forEach(async (t) => {
      try {
        const res = await api.get(`/api/agenda-pedagogica?tema=${t.id}&limit=1`);
        const total = res.data?.total ?? (Array.isArray(res.data) ? res.data.length : 0);
        setCounts((c) => ({ ...c, [t.id]: total }));
      } catch {
        setCounts((c) => ({ ...c, [t.id]: 0 }));
      }
    });
  }, []);

  const abrirModal = async (tema) => {
    setModalTema(tema);
    setLoadingTema(tema.id);
    try {
      const res = await api.get(`/api/agenda-pedagogica?tema=${tema.id}`);
      const lista = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.eventos)
          ? res.data.eventos
          : [];
      setEventos((e) => ({ ...e, [tema.id]: lista }));
    } catch {
      setEventos((e) => ({ ...e, [tema.id]: [] }));
    } finally {
      setLoadingTema(null);
    }
  };

  const fecharModal = () => setModalTema(null);

  const onEventoCriado = (temaId, total) => {
    setCounts((c) => ({ ...c, [temaId]: total }));
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f0f4ff 0%, #fafafa 60%, #f0fdf4 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "32px 24px 48px",
    }}>

      {/* ── HERO HEADER ─────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0f2847 0%, #1e3a5f 55%, #1a4a7a 100%)",
        borderRadius: 24,
        padding: "40px 48px 36px",
        marginBottom: 40,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(15,40,71,0.35)",
      }}>
        {/* Efeito decorativo */}
        <div style={{
          position: "absolute", top: -80, right: -60,
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: 80,
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "rgba(255,255,255,0.1)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30,
            flexShrink: 0,
          }}>
            📅
          </div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.45)",
              marginBottom: 6, display: "flex", alignItems: "center", gap: 6,
            }}>
              <CalendarDaysIcon style={{ width: 12, height: 12 }} />
              MÓDULO PEDAGÓGICO
            </div>
            <h1 style={{
              margin: 0, fontSize: 32, fontWeight: 900,
              color: "#fff", lineHeight: 1.2,
              letterSpacing: "-0.5px",
            }}>
              Agenda Pedagógica
            </h1>
            <p style={{
              margin: "8px 0 0", fontSize: 15,
              color: "rgba(255,255,255,0.6)",
              maxWidth: 520, lineHeight: 1.5,
            }}>
              Organize e agende as atividades do calendário escolar.
              Selecione um tema para cadastrar ou visualizar eventos.
            </p>
          </div>
        </div>
      </div>

      {/* ── GRID DE CARDS ────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 24,
      }}>
        {TEMAS.map((tema) => {
          const Icone = tema.icon;
          const count = counts[tema.id];
          return (
            <button
              key={tema.id}
              onClick={() => abrirModal(tema)}
              style={{
                background: tema.gradient,
                borderRadius: 20,
                padding: "28px 28px 24px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
                overflow: "hidden",
                boxShadow: `0 8px 32px ${tema.shadow}, 0 1px 0 rgba(255,255,255,0.08) inset`,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                e.currentTarget.style.boxShadow = `0 20px 48px ${tema.shadow}, 0 1px 0 rgba(255,255,255,0.12) inset`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = `0 8px 32px ${tema.shadow}, 0 1px 0 rgba(255,255,255,0.08) inset`;
              }}
            >
              {/* Brilho decorativo */}
              <div style={{
                position: "absolute", top: -40, right: -40,
                width: 140, height: 140, borderRadius: "50%",
                background: `radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />

              {/* Ícone + emoji */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "rgba(255,255,255,0.12)",
                  border: `1.5px solid rgba(255,255,255,0.18)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icone style={{ width: 24, height: 24, color: "#fff" }} />
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 99,
                  padding: "4px 12px",
                  fontSize: 12, fontWeight: 700,
                  color: "rgba(255,255,255,0.85)",
                }}>
                  {count == null ? "—" : `${count} ${count === 1 ? "evento" : "eventos"}`}
                </div>
              </div>

              {/* Emoji grande */}
              <div style={{ fontSize: 36, marginBottom: 10, lineHeight: 1 }}>
                {tema.emoji}
              </div>

              {/* Label */}
              <h2 style={{
                margin: "0 0 8px", fontSize: 20, fontWeight: 800,
                color: "#fff", lineHeight: 1.2,
                fontFamily: "'Inter', 'Montserrat', sans-serif",
              }}>
                {tema.label}
              </h2>

              {/* Descrição */}
              <p style={{
                margin: "0 0 20px", fontSize: 13,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.5,
              }}>
                {tema.descricao}
              </p>

              {/* CTA */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 10, padding: "8px 16px",
                fontSize: 13, fontWeight: 700, color: "#fff",
              }}>
                <PlusIcon style={{ width: 14, height: 14 }} />
                Gerenciar agenda
              </div>
            </button>
          );
        })}
      </div>

      {/* ── MODAL DO TEMA ────────────────────────────────────────────────────── */}
      {modalTema && (
        <ModalAgendaTema
          tema={modalTema}
          eventos={eventos[modalTema.id] || []}
          loading={loadingTema === modalTema.id}
          onClose={fecharModal}
          onEventoCriado={(total) => onEventoCriado(modalTema.id, total)}
          onEventosChange={(lista) =>
            setEventos((e) => ({ ...e, [modalTema.id]: lista }))
          }
        />
      )}
    </div>
  );
}

// ─── Modal de agenda por tema ──────────────────────────────────────────────────
function ModalAgendaTema({ tema, eventos, loading, onClose, onEventoCriado, onEventosChange }) {
  const Icone = tema.icon;
  const dialogRef = useRef(null);
  const [form, setForm] = useState({
    titulo: "",
    bimestre: "",
    data_inicio: "",
    data_fim: "",
    descricao: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => dialogRef.current?.focus(), 0);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const resetForm = () =>
    setForm({ titulo: "", bimestre: "", data_inicio: "", data_fim: "", descricao: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data_inicio) {
      setErro("Preencha o título e a data de início.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      const payload = { tema: tema.id, ...form };
      if (editandoId) {
        const res = await api.put(`/api/agenda-pedagogica/${editandoId}`, payload);
        const atualizado = res.data?.evento ?? res.data;
        const nova = eventos.map((ev) => ev.id === editandoId ? { ...ev, ...atualizado } : ev);
        onEventosChange(nova);
        setEditandoId(null);
      } else {
        const res = await api.post("/api/agenda-pedagogica", payload);
        const criado = res.data?.evento ?? res.data;
        const nova = [criado, ...eventos];
        onEventosChange(nova);
        onEventoCriado(nova.length);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setErro("Erro ao salvar o evento. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (ev) => {
    setEditandoId(ev.id);
    setForm({
      titulo: ev.titulo ?? "",
      bimestre: ev.bimestre ?? "",
      data_inicio: ev.data_inicio?.slice(0, 10) ?? "",
      data_fim: ev.data_fim?.slice(0, 10) ?? "",
      descricao: ev.descricao ?? "",
    });
    dialogRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este evento?")) return;
    try {
      await api.delete(`/api/agenda-pedagogica/${id}`);
      const nova = eventos.filter((ev) => ev.id !== id);
      onEventosChange(nova);
      onEventoCriado(nova.length);
    } catch {
      alert("Erro ao excluir. Tente novamente.");
    }
  };

  const formatarData = (iso) => {
    if (!iso) return "—";
    try {
      const [y, m, d] = iso.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    } catch { return iso; }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10, padding: "10px 13px",
    fontSize: 14, color: "#1e293b",
    outline: "none", fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
    background: "#fff",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }} onClick={onClose} />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Agenda — ${tema.label}`}
        style={{
          position: "relative",
          width: "min(780px, 96vw)",
          maxHeight: "92vh",
          borderRadius: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          outline: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div style={{
          background: tema.gradient,
          padding: "28px 32px 24px",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* brilho deco */}
          <div style={{
            position: "absolute", top: -60, right: -40, width: 220, height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <button
            onClick={onClose}
            title="Fechar"
            style={{
              position: "absolute", top: 16, right: 16,
              padding: 6, borderRadius: 8, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
          >
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarDaysIcon style={{ width: 11, height: 11 }} />
            AGENDA PEDAGÓGICA
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
              flexShrink: 0,
            }}>
              {tema.emoji}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
                {tema.label}
              </h2>
              <p style={{ margin: "5px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                {tema.descricao}
              </p>
            </div>
          </div>
        </div>

        {/* ── CORPO COM SCROLL ── */}
        <div style={{
          flex: 1, overflowY: "auto",
          background: "#f8fafc",
          display: "flex", flexDirection: "column", gap: 0,
        }}>

          {/* Formulário */}
          <form onSubmit={handleSubmit} style={{ padding: "24px 32px", background: "#fff", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#64748b",
              marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: tema.accent || "#3b82f6", display: "inline-block" }} />
              {editandoId ? "Editar evento" : "Novo evento"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {/* Título */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Título *
                </label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder={`Ex: Prova de Matemática — ${tema.label}`}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {/* Bimestre */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Bimestre
                </label>
                <select
                  value={form.bimestre}
                  onChange={(e) => setForm((f) => ({ ...f, bimestre: e.target.value }))}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">— Todos / Geral</option>
                  {BIMESTRES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Data início */}
              {/* Data início */}
              <div style={{ gridColumn: tema.id === 'semana_prova' ? 'span 2' : 'span 1' }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  {tema.id === 'semana_prova' ? 'Data da prova *' : 'Data de início *'}
                </label>
                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {/* Data fim */}
              {tema.id !== 'semana_prova' && (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Data de término
                </label>
                <input
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              )}

              {/* Descrição */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Observações
                </label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  placeholder="Detalhes adicionais sobre o evento..."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {erro && (
              <div style={{ marginBottom: 12, padding: "9px 13px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
                ⚠️ {erro}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {editandoId && (
                <button
                  type="button"
                  onClick={() => { resetForm(); setEditandoId(null); }}
                  style={{
                    padding: "9px 20px", background: "#f1f5f9", color: "#475569",
                    border: "1px solid #e2e8f0", borderRadius: 10,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando}
                style={{
                  padding: "9px 22px",
                  background: salvando ? "#e2e8f0" : tema.gradient,
                  color: salvando ? "#94a3b8" : "#fff",
                  border: "none", borderRadius: 10,
                  fontSize: 13, fontWeight: 700,
                  cursor: salvando ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: salvando ? "none" : "0 4px 14px rgba(0,0,0,0.2)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (!salvando) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {salvando ? "Salvando…" : (
                  <>
                    {editandoId ? <CheckIcon style={{ width: 15, height: 15 }} /> : <PlusIcon style={{ width: 15, height: 15 }} />}
                    {editandoId ? "Salvar alterações" : "Adicionar evento"}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Lista de eventos */}
          <div style={{ padding: "20px 32px 32px" }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#64748b",
              marginBottom: 14, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ flex: 1 }}>
                Eventos agendados
                <span style={{
                  marginLeft: 8, fontSize: 10,
                  background: "#e0e7ff", color: "#3730a3",
                  borderRadius: 99, padding: "2px 8px", fontWeight: 700,
                }}>
                  {eventos.length}
                </span>
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: "3px solid #e2e8f0", borderTopColor: "#3b82f6",
                  animation: "spin 0.7s linear infinite",
                  margin: "0 auto 12px",
                }} />
                <p style={{ fontSize: 13 }}>Carregando eventos…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
              </div>
            ) : eventos.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "48px 0",
                background: "#fff", borderRadius: 16,
                border: "1px dashed #e2e8f0",
              }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>{tema.emoji}</div>
                <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
                  Nenhum evento agendado ainda.
                </p>
                <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
                  Use o formulário acima para adicionar o primeiro evento.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {eventos.map((ev) => (
                  <EventoCard
                    key={ev.id}
                    ev={ev}
                    tema={tema}
                    onEditar={handleEditar}
                    onExcluir={handleExcluir}
                    formatarData={formatarData}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          padding: "14px 32px",
          background: "#fff", borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 22px",
              background: "#f1f5f9", color: "#475569",
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

// ─── Card de evento na lista ───────────────────────────────────────────────────
function EventoCard({ ev, tema, onEditar, onExcluir, formatarData }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e9eef5",
        borderLeft: `4px solid ${tema.accent || "#3b82f6"}`,
        borderRadius: "0 14px 14px 0",
        padding: "14px 18px",
        display: "flex", gap: 14, alignItems: "flex-start",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{ev.titulo}</span>
          {ev.bimestre && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: "#e0e7ff", color: "#3730a3",
              borderRadius: 99, padding: "2px 8px",
            }}>
              {ev.bimestre}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b" }}>
          <span>📅 {formatarData(ev.data_inicio)}{ev.data_fim && ev.data_fim !== ev.data_inicio ? ` → ${formatarData(ev.data_fim)}` : ""}</span>
          {ev.descricao && <span style={{ color: "#94a3b8", fontStyle: "italic" }}>· {ev.descricao}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onEditar(ev)}
          title="Editar"
          style={{
            padding: 6, borderRadius: 8, border: "none",
            background: "transparent", color: "#94a3b8", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#3b82f6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
        >
          <PencilSquareIcon style={{ width: 16, height: 16 }} />
        </button>
        <button
          onClick={() => onExcluir(ev.id)}
          title="Excluir"
          style={{
            padding: 6, borderRadius: 8, border: "none",
            background: "transparent", color: "#94a3b8", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
        >
          <TrashIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}
