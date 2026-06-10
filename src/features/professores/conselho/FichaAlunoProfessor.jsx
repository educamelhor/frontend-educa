// src/features/professores/conselho/FichaAlunoProfessor.jsx
// ============================================================================
// Ficha do Estudante — Visão do Professor (arquivo INDEPENDENTE)
// - Informações do estudante: layout horizontal (3 colunas)
// - Sem botão "Escolher Pasta" / sem label "Selecionar Pasta e Inserir Foto"
// - Sem card Relatório Disciplinar (removido — acesso restrito à direção)
// - Card Relatório Pedagógico centralizado, cores mais escuras
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import ModalRelatorioPedagogico from "../../alunos/ModalRelatorioPedagogico";

// ── helpers ──────────────────────────────────────────────────────────────────
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

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
      <rect width='100%' height='100%' rx='64' ry='64' fill='#1e3a5f'/>
      <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle'
        font-family='Arial' font-size='36' fill='rgba(255,255,255,0.5)'>👤</text>
    </svg>`
  );

// ── Componente principal ──────────────────────────────────────────────────────
export default function FichaAlunoProfessor({ codigo }) {
  const [aluno, setAluno]               = useState(null);
  const [erro, setErro]                 = useState(null);
  const [modalPedagogico, setModalPedagogico] = useState(false);

  const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");

  useEffect(() => {
    if (!codigo) return;
    let alive = true;
    api.get(`/api/alunos/${codigo}`)
      .then(res => { if (alive) setAluno(res.data); })
      .catch(() => { if (alive) setErro("Não foi possível carregar os dados do aluno."); });
    return () => { alive = false; };
  }, [codigo]);

  // ── estados intermediários ────────────────────────────────────────────────
  if (erro) return (
    <div style={{ padding: "2rem", color: "#b91c1c", textAlign: "center" }}>
      {erro}
    </div>
  );

  if (!aluno) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "3rem 1rem", gap: "0.75rem", color: "#94a3b8",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6",
        animation: "fap-spin 0.8s linear infinite",
      }} />
      <span style={{ fontWeight: 600 }}>Carregando dados do aluno…</span>
    </div>
  );

  const fotoURL = buildFotoURL(aluno.foto, apiBase);
  const iniciais = (aluno.estudante || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();

  return (
    <>
      <style>{`
        @keyframes fap-spin   { to { transform: rotate(360deg); } }
        @keyframes fap-fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fap-wrap    { animation: fap-fadeUp 0.3s ease both; }
        .fap-ped:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 14px 36px rgba(4,120,87,0.3) !important;
          border-color: #059669 !important;
        }
      `}</style>

      <div className="fap-wrap" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>

        {/* ══ HEADER PREMIUM ══ */}
        <div style={{
          background: "linear-gradient(135deg, #0f2044 0%, #1d4ed8 55%, #3b82f6 100%)",
          padding: "1.5rem 1.75rem 2.75rem",
          position: "relative", overflow: "hidden",
        }}>
          {/* Círculos decorativos */}
          <div style={{ position:"absolute", top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-30, left:-30, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }} />

          <p style={{ color:"rgba(255,255,255,0.55)", fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", margin:"0 0 1rem" }}>
            🎓 Ficha do Estudante
          </p>

          <div style={{ display:"flex", alignItems:"center", gap:"1.1rem" }}>
            {/* Avatar */}
            <div style={{
              width:80, height:80, borderRadius:"50%",
              border:"3px solid rgba(255,255,255,0.5)",
              boxShadow:"0 0 0 5px rgba(255,255,255,0.12)",
              overflow:"hidden", flexShrink:0, background:"#1e3a5f",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {fotoURL ? (
                <img src={fotoURL} alt={`Foto de ${aluno.estudante}`}
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  onError={e => { e.currentTarget.onerror=null; e.currentTarget.src=PLACEHOLDER; }}
                />
              ) : (
                <span style={{ color:"rgba(255,255,255,0.7)", fontSize:"1.75rem", fontWeight:800 }}>{iniciais}</span>
              )}
            </div>

            {/* Nome + turma */}
            <div>
              <h2 style={{ color:"#fff", fontSize:"1.15rem", fontWeight:800, margin:"0 0 0.35rem", letterSpacing:"-0.02em", lineHeight:1.2 }}>
                {aluno.estudante || "—"}
              </h2>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                {aluno.turma && (
                  <span style={{ background:"rgba(255,255,255,0.15)", color:"#e0f2fe", fontSize:"0.75rem", fontWeight:700, padding:"0.18rem 0.65rem", borderRadius:"999px", border:"1px solid rgba(255,255,255,0.2)" }}>
                    📋 {aluno.turma}
                  </span>
                )}
                {aluno.turno && (
                  <span style={{ background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.75)", fontSize:"0.72rem", fontWeight:600, padding:"0.18rem 0.6rem", borderRadius:"999px" }}>
                    🕐 {aluno.turno}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══ PAINEL BRANCO sobreposição ══ */}
        <div style={{
          background:"#fff",
          borderRadius:"1.25rem 1.25rem 0 0",
          marginTop:"-1.5rem",
          padding:"1.25rem 1.5rem 1.5rem",
          position:"relative", zIndex:1,
          boxShadow:"0 -4px 20px rgba(0,0,0,0.07)",
        }}>

          {/* ── Informações horizontais (3 colunas) ── */}
          <p style={{ color:"#94a3b8", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.65rem" }}>
            Informações do Estudante
          </p>

          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
            background:"#f8fafc", border:"1px solid #e2e8f0",
            borderRadius:"0.875rem", overflow:"hidden",
            marginBottom:"1.5rem",
          }}>
            {[
              { label:"Código",            value: aluno.codigo ?? "—" },
              { label:"Data de Nascimento", value: formatDate(aluno.data_nascimento) },
              { label:"Sexo",              value: aluno.sexo ?? "—" },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{
                padding:"0.75rem 1rem",
                borderRight: i < arr.length - 1 ? "1px solid #e2e8f0" : "none",
              }}>
                <span style={{ color:"#64748b", fontSize:"0.7rem", fontWeight:700, display:"block", marginBottom:"0.15rem", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                  {label}
                </span>
                <span style={{ color:"#1e293b", fontSize:"0.95rem", fontWeight:800 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* ── Relatório Pedagógico (centralizado, sem Disciplinar) ── */}
          <p style={{ color:"#94a3b8", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.65rem" }}>
            Relatório
          </p>

          <div
            className="fap-ped"
            onClick={() => setModalPedagogico(true)}
            style={{
              background: "linear-gradient(135deg, #064e3b, #065f46)",
              border: "2px solid #059669",
              borderRadius: "1rem",
              padding: "1.2rem 1.5rem",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
              boxShadow: "0 4px 16px rgba(4,120,87,0.2)",
              maxWidth: 400,
              margin: "0 auto",
              display: "block",
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.5rem" }}>
              <span style={{ fontSize:"1.4rem" }}>📝</span>
              <span style={{ fontWeight:800, color:"#d1fae5", fontSize:"0.95rem" }}>Relatório Pedagógico</span>
            </div>
            <p style={{ color:"#6ee7b7", fontSize:"0.78rem", margin:"0 0 0.6rem", lineHeight:1.4 }}>
              Clique para visualizar o histórico pedagógico do estudante.
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:"0.35rem", color:"#34d399", fontSize:"0.75rem", fontWeight:700 }}>
              <span>Ver histórico</span>
              <span>→</span>
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
