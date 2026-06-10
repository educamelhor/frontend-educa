// src/features/professores/conselho/FichaAlunoProfessor.jsx
// ============================================================================
// Ficha do Estudante — Visão do Professor (arquivo INDEPENDENTE)
// - Sem botão "Escolher Pasta" / sem label "Selecionar Pasta e Inserir Foto"
// - Relatório Pedagógico: clicável (abre modal)
// - Relatório Disciplinar: informativo apenas (mostra pontuação, sem acesso)
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import ModalRelatorioPedagogico from "../../alunos/ModalRelatorioPedagogico";

// ── helpers ─────────────────────────────────────────────────────────────────
function formatDate(value) {
  if (!value) return "—";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    }
    const d = new Date(value);
    const s = d.toLocaleDateString("pt-BR");
    return s && s !== "Invalid Date" ? s : "—";
  } catch {
    return "—";
  }
}

function buildFotoURL(path, apiBase) {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : `${apiBase}${path}`;
}

// ── badge de pontuação disciplinar ───────────────────────────────────────────
function disciplinarBadge(total) {
  if (total === 0) return { label: "Sem ocorrências", bg: "#f0fdf4", color: "#15803d", dot: "#22c55e", icon: "✅" };
  if (total <= 2)  return { label: `${total} ocorrência${total > 1 ? "s" : ""}`, bg: "#fefce8", color: "#a16207", dot: "#eab308", icon: "⚠️" };
  if (total <= 5)  return { label: `${total} ocorrências`, bg: "#fff7ed", color: "#c2410c", dot: "#f97316", icon: "🔶" };
  return             { label: `${total} ocorrências`, bg: "#fef2f2", color: "#b91c1c", dot: "#ef4444", icon: "🔴" };
}

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
      <rect width='100%' height='100%' rx='64' ry='64' fill='#1e3a5f'/>
      <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle'
        font-family='Arial' font-size='36' fill='rgba(255,255,255,0.5)'>👤</text>
    </svg>`
  );

// ── Componente principal ─────────────────────────────────────────────────────
export default function FichaAlunoProfessor({ codigo }) {
  const [aluno, setAluno]                       = useState(null);
  const [erro, setErro]                         = useState(null);
  const [ocorrenciasTotal, setOcorrenciasTotal] = useState(null); // null = loading
  const [modalPedagogico, setModalPedagogico]   = useState(false);

  const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");

  // ── carrega dados do aluno ──────────────────────────────────────────────
  useEffect(() => {
    if (!codigo) return;
    let alive = true;

    async function fetchAluno() {
      try {
        const res = await api.get(`/api/alunos/${codigo}`);
        if (!alive) return;
        const a = res.data;
        setAluno(a);
        // carrega contagem de ocorrências disciplinares
        if (a?.id) fetchDisciplinar(a.id);
      } catch {
        if (alive) setErro("Não foi possível carregar os dados do aluno.");
      }
    }

    async function fetchDisciplinar(alunoId) {
      try {
        const res = await api.get(`/api/alunos/${alunoId}/ocorrencias`);
        const lista = Array.isArray(res.data) ? res.data : (res.data?.ocorrencias || []);
        if (alive) setOcorrenciasTotal(lista.length);
      } catch {
        if (alive) setOcorrenciasTotal(0);
      }
    }

    fetchAluno();
    return () => { alive = false; };
  }, [codigo]);

  // ── estados intermediários ───────────────────────────────────────────────
  if (erro) return (
    <div style={{ padding: "2rem", color: "#b91c1c", textAlign: "center" }}>
      {erro}
    </div>
  );

  if (!aluno) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: "0.75rem", color: "#94a3b8" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6", animation: "fap-spin 0.8s linear infinite" }} />
      <span style={{ fontWeight: 600 }}>Carregando dados do aluno…</span>
    </div>
  );

  const fotoURL = buildFotoURL(aluno.foto, apiBase);
  const badge   = ocorrenciasTotal !== null ? disciplinarBadge(ocorrenciasTotal) : null;
  const iniciais = (aluno.estudante || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();

  return (
    <>
      <style>{`
        @keyframes fap-spin   { to { transform: rotate(360deg); } }
        @keyframes fap-fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fap-card { animation: fap-fadeUp 0.35s ease both; }
        .fap-card-ped:hover  { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(16,185,129,0.2) !important; }
        .fap-info-row:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
      `}</style>

      {/* ══ WRAPPER ══ */}
      <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", minHeight: "100%" }}>

        {/* ══ HEADER PREMIUM ══ */}
        <div style={{
          background: "linear-gradient(135deg, #0f2044 0%, #1d4ed8 55%, #3b82f6 100%)",
          padding: "2rem 2rem 3.5rem",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Círculos decorativos */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

          {/* Ícone topo */}
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 1.25rem" }}>
            🎓 Ficha do Estudante
          </p>

          {/* Foto + nome */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            {/* Avatar */}
            <div style={{
              width: 88, height: 88, borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.5)",
              boxShadow: "0 0 0 5px rgba(255,255,255,0.12)",
              overflow: "hidden", flexShrink: 0, background: "#1e3a5f",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {fotoURL ? (
                <img
                  src={fotoURL}
                  alt={`Foto de ${aluno.estudante}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
                />
              ) : (
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "2rem", fontWeight: 800 }}>
                  {iniciais}
                </span>
              )}
            </div>

            {/* Nome e turma */}
            <div>
              <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.3rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {aluno.estudante || "—"}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                {aluno.turma && (
                  <span style={{ background: "rgba(255,255,255,0.15)", color: "#e0f2fe", fontSize: "0.78rem", fontWeight: 700, padding: "0.2rem 0.7rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.2)" }}>
                    📋 {aluno.turma}
                  </span>
                )}
                {aluno.turno && (
                  <span style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", fontSize: "0.73rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: "999px" }}>
                    🕐 {aluno.turno}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══ CARTÃO BRANCO QUE SOBREPÕE O HEADER ══ */}
        <div style={{
          background: "#fff",
          borderRadius: "1.5rem 1.5rem 0 0",
          marginTop: "-1.75rem",
          padding: "1.5rem 1.75rem",
          position: "relative",
          zIndex: 1,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
          minHeight: "calc(100% - 180px)",
        }}>

          {/* ── Grade de informações ── */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.75rem" }}>
              Informações do Estudante
            </p>
            <div style={{ background: "#f8fafc", borderRadius: "1rem", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              {[
                { label: "Código",           value: aluno.codigo ?? "—" },
                { label: "Data de Nascimento", value: formatDate(aluno.data_nascimento) },
                { label: "Sexo",              value: aluno.sexo ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="fap-info-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 1rem" }}>
                  <span style={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 600 }}>{label}</span>
                  <span style={{ color: "#1e293b", fontSize: "0.85rem", fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Cards Relatórios ── */}
          <p style={{ color: "#94a3b8", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.75rem" }}>
            Relatórios
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>

            {/* ── Card Pedagógico (clicável) ── */}
            <div
              className="fap-card fap-card-ped"
              onClick={() => setModalPedagogico(true)}
              style={{
                background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                border: "1.5px solid #bbf7d0",
                borderRadius: "1rem",
                padding: "1.1rem 1rem",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 2px 8px rgba(16,185,129,0.08)",
                animationDelay: "0.05s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>📝</span>
                <span style={{ fontWeight: 800, color: "#065f46", fontSize: "0.88rem" }}>Relatório Pedagógico</span>
              </div>
              <p style={{ color: "#047857", fontSize: "0.75rem", margin: 0, lineHeight: 1.4 }}>
                Clique para visualizar o histórico pedagógico do estudante.
              </p>
              <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.3rem", color: "#10b981", fontSize: "0.72rem", fontWeight: 700 }}>
                <span>Ver histórico</span>
                <span>→</span>
              </div>
            </div>

            {/* ── Card Disciplinar (informativo) ── */}
            <div
              className="fap-card"
              style={{
                background: badge ? badge.bg : "#f8fafc",
                border: badge ? `1.5px solid ${badge.dot}33` : "1.5px solid #e2e8f0",
                borderRadius: "1rem",
                padding: "1.1rem 1rem",
                cursor: "not-allowed",
                animationDelay: "0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>📋</span>
                <span style={{ fontWeight: 800, color: "#1e293b", fontSize: "0.88rem" }}>Relatório Disciplinar</span>
              </div>

              {/* Pontuação */}
              {ocorrenciasTotal === null ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.78rem" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #e2e8f0", borderTop: "2px solid #3b82f6", animation: "fap-spin 0.8s linear infinite" }} />
                  <span>Carregando...</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>{badge.icon}</span>
                    <span style={{ fontWeight: 800, color: badge.color, fontSize: "0.88rem" }}>
                      {badge.label}
                    </span>
                  </div>
                  <span style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 500 }}>
                    🔒 Acesso restrito à direção
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Relatório Pedagógico ── */}
      {modalPedagogico && (
        <ModalRelatorioPedagogico
          open={modalPedagogico}
          onClose={() => setModalPedagogico(false)}
          aluno={aluno}
        />
      )}
    </>
  );
}
