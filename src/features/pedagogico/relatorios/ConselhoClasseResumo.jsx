// src/features/pedagogico/relatorios/ConselhoClasseResumo.jsx
// ============================================================================
// Relatório Premium — Conselho de Classe - Resumo
//
// Fluxo de 3 etapas:
//   ETAPA 1 → Selecionar Turno
//   ETAPA 2 → Selecionar Turma
//   ETAPA 3 → Exibir alunos + registros de todos os professores + Gerar PDF
//
// Acessível em: Pedagógico → Relatórios → Conselho de Classe — Resumo
// ============================================================================

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { getFotoURL } from "../../../utils/foto";

// ─── Utilitários ─────────────────────────────────────────────────────────────
function anoLetivoPadrao() {
  const hoje = new Date();
  return hoje.getMonth() + 1 <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

function normalizaTurno(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function formatarDataHora(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// ─── Config de perfis ─────────────────────────────────────────────────────────
const PERFIL_CONFIG = {
  professor:   { label: "Professor",    color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)"  },
  coordenador: { label: "Coordenador",  color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)"  },
  diretor:     { label: "Diretor",      color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.2)"  },
  vice_diretor:{ label: "Vice-Diretor", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  pedagogo:    { label: "Pedagogo",     color: "#06b6d4", bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.2)"   },
};
function perfilCfg(perfil) {
  return PERFIL_CONFIG[perfil] || { label: perfil || "Usuário", color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)" };
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ size = 24, color = "#6366f1" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="40 60" strokeDashoffset="0" />
    </svg>
  );
}

// ─── Foto do aluno com fallback (Iniciais) ───────────────────────────────────
function FotoAluno({ aluno, stamp }) {
  const [imgError, setImgError] = useState(false);
  const src = getFotoURL(aluno, { stamp });
  const nomeAluno = aluno?.nome || aluno?.estudante || "AL";
  
  const iniciais = nomeAluno
    .split(" ")
    .filter(n => n.trim().length > 0)
    .slice(0, 2)
    .map(n => n[0])
    .join("")
    .toUpperCase();

  if (imgError || !src || src.includes("placeholder.png")) {
    return (
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        border: "3px solid rgba(255,255,255,0.2)", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        background: "linear-gradient(135deg, #1e3a5f, #3b82f6)",
        color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.2rem", fontWeight: "bold", fontFamily: "inherit"
      }}>
        {iniciais}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={nomeAluno}
      onError={() => setImgError(true)}
      style={{
        width: 56, height: 56, borderRadius: "50%", objectFit: "cover",
        border: "3px solid rgba(255,255,255,0.2)", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    />
  );
}

// ─── Card de registro de um professor ────────────────────────────────────────
function RegistroCard({ reg }) {
  const cfg = perfilCfg(reg.usuario_perfil);
  return (
    <div style={{
      display: "flex", gap: 14, padding: "14px 16px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 10, marginBottom: 8,
    }}>
      {/* Avatar inicial */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}55)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: "0.85rem", fontWeight: 800,
        boxShadow: `0 2px 8px ${cfg.color}40`,
      }}>
        {(reg.usuario_nome || "?").charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Cabeçalho do registro */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>
            {reg.usuario_nome || "—"}
          </span>
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px",
            borderRadius: 999, background: cfg.color + "22", color: cfg.color,
            border: `1px solid ${cfg.border}`, letterSpacing: "0.3px",
          }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginLeft: "auto" }}>
            {formatarDataHora(reg.criado_em)}
          </span>
        </div>

        {/* Texto da observação */}
        <p style={{
          margin: 0, fontSize: "0.88rem", color: "#374151",
          lineHeight: 1.65, whiteSpace: "pre-wrap",
        }}>
          {reg.texto}
        </p>

        {/* Se foi editado */}
        {reg.editado_em && (
          <p style={{ margin: "6px 0 0", fontSize: "0.68rem", color: "#94a3b8", fontStyle: "italic" }}>
            Editado em {formatarDataHora(reg.editado_em)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Card de aluno ────────────────────────────────────────────────────────────
function AlunoCard({ aluno, stamp, numero }) {
  const [aberto, setAberto] = useState(true);
  const nRegs = aluno.registros?.length || 0;

  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0",
      marginBottom: 20,
    }}>
      {/* Cabeçalho do aluno */}
      <div
        onClick={() => setAberto(v => !v)}
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #1a4480 60%, #0f2d5a 100%)",
          padding: "14px 20px",
          display: "flex", alignItems: "center", gap: 16,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Número */}
        <div style={{
          minWidth: 38, height: 38, borderRadius: 10,
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 900, fontSize: "1.05rem", flexShrink: 0,
        }}>
          {String(numero || aluno.numero_chamada || "").padStart(2, "0")}
        </div>

        {/* Foto */}
        <FotoAluno aluno={aluno} stamp={stamp} />

        {/* Nome */}
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.2px" }}>
            {aluno.nome}
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", marginTop: 2 }}>
            {nRegs === 0 ? "Nenhuma observação registrada" : `${nRegs} observaç${nRegs === 1 ? "ão" : "ões"} registrada${nRegs === 1 ? "" : "s"}`}
          </div>
        </div>

        {/* Badge contador */}
        {nRegs > 0 && (
          <div style={{
            minWidth: 32, height: 32, borderRadius: "50%",
            background: nRegs > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: "0.9rem",
            boxShadow: nRegs > 0 ? "0 2px 8px rgba(16,185,129,0.4)" : "none",
          }}>
            {nRegs}
          </div>
        )}

        {/* Chevron */}
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2.5}
          style={{ transition: "transform 0.25s", transform: aberto ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Corpo (registros) — animação de colapso via height */}
      <div style={{
        padding: aberto ? "16px 20px 8px" : "0 20px",
        maxHeight: aberto ? 9999 : 0, overflow: "hidden",
        transition: "max-height 0.35s ease, padding 0.25s",
      }}>
        {nRegs === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 16px", borderRadius: 10,
            background: "#f8fafc", border: "1px dashed #e2e8f0",
            color: "#94a3b8", fontSize: "0.85rem",
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth={2}>
              <path strokeLinecap="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Nenhuma observação registrada para este aluno nesta turma.</span>
          </div>
        ) : (
          aluno.registros.map(reg => <RegistroCard key={reg.id} reg={reg} />)
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ConselhoClasseResumo() {
  const navigate = useNavigate();
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());
  const [anosLetivos, setAnosLetivos] = useState([]);

  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [dados, setDados] = useState(null); // { turma, alunos }
  const [loadingDados, setLoadingDados] = useState(false);
  const [erro, setErro] = useState(null);

  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [fotoStamp] = useState(Date.now());

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  // ── Anos letivos ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/api/matriculas/anos")
      .then(r => setAnosLetivos(Array.isArray(r.data) ? r.data : [anoLetivoPadrao()]))
      .catch(() => setAnosLetivos([anoLetivoPadrao()]));
  }, []);

  // ── Turmas ────────────────────────────────────────────────────────────────
  const fetchTurmas = useCallback(async () => {
    setLoadingTurmas(true);
    try {
      const escola_id = localStorage.getItem("escola_id") || 1;
      const { data } = await api.get("/api/turmas", { params: { escola_id, ano: anoLetivo } });
      setTurmas(Array.isArray(data) ? data : []);
    } catch {
      setTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  }, [anoLetivo]);

  useEffect(() => { fetchTurmas(); }, [fetchTurmas, anoLetivo]);

  // ── Selecionar turno ──────────────────────────────────────────────────────
  const handleTurno = (t) => {
    setTurnoSelecionado(t);
    setTurmaSelecionada(null);
    setDados(null);
    setErro(null);
  };

  // ── Selecionar turma → carregar dados ────────────────────────────────────
  const handleTurma = async (turma) => {
    setTurmaSelecionada(turma);
    setDados(null);
    setErro(null);
    setLoadingDados(true);
    try {
      const { data } = await api.get("/api/conselho/resumo-turma", {
        params: { turma_id: turma.id, ano_letivo: anoLetivo },
      });
      setDados(data);
    } catch (e) {
      setErro("Não foi possível carregar os dados. Tente novamente.");
    } finally {
      setLoadingDados(false);
    }
  };

  // ── Gerar PDF ─────────────────────────────────────────────────────────────
  const handleGerarPDF = async () => {
    if (!turmaSelecionada?.id || gerandoPDF) return;
    setGerandoPDF(true);
    try {
      const resp = await api.get("/api/conselho/resumo-turma/pdf", {
        params: { turma_id: turmaSelecionada.id, ano_letivo: anoLetivo },
        responseType: "blob",
        timeout: 90000,
      });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
    const nomeTurma = (turmaSelecionada.turma || turmaSelecionada.nome || "turma").replace(/\s/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      link.setAttribute("download", `Conselho_${nomeTurma}_${anoLetivo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      alert("Erro ao gerar o PDF. Verifique sua conexão e tente novamente.");
    } finally {
      setGerandoPDF(false);
    }
  };

  // ── Turmas filtradas por turno (ano já vem filtrado da API) ────────────────
  const turmasFiltradas = turmas.filter(
    t => turnoSelecionado &&
      normalizaTurno(t.turno) === normalizaTurno(turnoSelecionado)
  );

  // ── Estatísticas ──────────────────────────────────────────────────────────
  const totalAlunos    = dados?.alunos?.length || 0;
  const totalRegistros = dados?.alunos?.reduce((acc, a) => acc + (a.registros?.length || 0), 0) || 0;
  const alunosSemObs   = dados?.alunos?.filter(a => (a.registros?.length || 0) === 0).length || 0;

  const ICON_ARROW_LEFT = (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Montserrat, 'Inter', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0f2d5a 0%, #1e3a5f 40%, #1a4480 100%)",
        borderRadius: 20, padding: "36px 40px", marginBottom: 32,
        boxShadow: "0 8px 32px rgba(15,45,90,0.4)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: 200, width: 160, height: 160, background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative", flexWrap: "wrap" }}>
          {/* Botão voltar */}
          <button
            onClick={() => navigate("/pedagogico/relatorios")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
              fontSize: "0.78rem", cursor: "pointer", backdropFilter: "blur(4px)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          >
            {ICON_ARROW_LEFT} Relatórios
          </button>

          {/* Ícone */}
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, boxShadow: "0 6px 20px rgba(99,102,241,0.4)", flexShrink: 0,
          }}>👥</div>

          {/* Texto */}
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Conselho de Classe — Resumo
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", margin: "4px 0 0" }}>
              Visão consolidada das observações de todos os professores • Ano letivo {anoLetivo}
            </p>
          </div>

          {/* Seletor de ano */}
          <select
            value={anoLetivo}
            onChange={e => { setAnoLetivo(Number(e.target.value)); setTurmaSelecionada(null); setDados(null); }}
            style={{
              padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)", color: "#fff",
              fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
              backdropFilter: "blur(4px)",
            }}
          >
            {anosLetivos.map(a => <option key={a} value={a} style={{ color: "#1e293b", background: "#fff" }}>{a}</option>)}
          </select>
        </div>

        {/* KPIs (quando dados carregados) */}
        {dados && (
          <div style={{
            display: "flex", gap: 24, marginTop: 28, paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap",
          }}>
            {[
              { label: "Turma",        value: dados.turma?.turma || dados.turma?.nome || turmaSelecionada?.turma || turmaSelecionada?.nome, color: "#c7d2fe" },
              { label: "Turno",        value: dados.turma?.turno || "—",          color: "#c7d2fe" },
              { label: "Alunos",       value: totalAlunos,                         color: "#c7d2fe" },
              { label: "Observações",  value: totalRegistros,                      color: "#10b981" },
              { label: "Sem Obs.",     value: alunosSemObs,                        color: alunosSemObs > 0 ? "#f59e0b" : "#10b981" },
            ].map(k => (
              <div key={k.label} style={{ textAlign: "center", minWidth: 60 }}>
                <div style={{ color: k.color, fontSize: "1.6rem", fontWeight: 800, lineHeight: 1 }}>{k.value}</div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem", marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ETAPA 1: Turno ───────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.78rem", fontWeight: 800,
            background: turnoSelecionado ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
          }}>1</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1e293b" }}>Selecione o Turno</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Filtra as turmas disponíveis</div>
          </div>
          {turnoSelecionado && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "#10b981", fontSize: "0.8rem", fontWeight: 700 }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {turnoSelecionado}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {turnos.map(t => {
            const ativo = turnoSelecionado === t;
            const icones = { Matutino: "🌅", Vespertino: "🌇", Noturno: "🌙" };
            return (
              <button key={t} onClick={() => handleTurno(t)} style={{
                flex: "1 1 120px", padding: "16px 20px", borderRadius: 12, cursor: "pointer",
                border: ativo ? "2px solid #6366f1" : "2px solid #e2e8f0",
                background: ativo ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" : "#f8fafc",
                color: ativo ? "#fff" : "#374151",
                fontWeight: 700, fontSize: "0.92rem", fontFamily: "inherit",
                boxShadow: ativo ? "0 4px 16px rgba(99,102,241,0.35)" : "none",
                transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
                onMouseEnter={e => { if (!ativo) e.currentTarget.style.borderColor = "#6366f1"; }}
                onMouseLeave={e => { if (!ativo) e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                <span style={{ fontSize: "1.2rem" }}>{icones[t]}</span> {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ETAPA 2: Turma ───────────────────────────────────────────────── */}
      {turnoSelecionado && (
        <div style={{
          background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
          animation: "fadeSlideIn 0.3s ease",
        }}>
          <style>{`
            @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.78rem", fontWeight: 800,
              background: turmaSelecionada ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
            }}>2</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1e293b" }}>Selecione a Turma</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {turmasFiltradas.length} turma{turmasFiltradas.length !== 1 ? "s" : ""} encontrada{turmasFiltradas.length !== 1 ? "s" : ""} no turno {turnoSelecionado} em {anoLetivo}
              </div>
            </div>
          </div>

          {loadingTurmas ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
              <Spinner />
            </div>
          ) : turmasFiltradas.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: "0.88rem" }}>
              Nenhuma turma encontrada para o turno {turnoSelecionado} no ano letivo {anoLetivo}.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {turmasFiltradas.map(turma => {
                const ativo = turmaSelecionada?.id === turma.id;
                const nomeTurma = turma.turma || turma.nome || "—";
                return (
                  <button key={turma.id} onClick={() => handleTurma(turma)} style={{
                    padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                    border: ativo ? "2px solid #1e3a5f" : "2px solid #e2e8f0",
                    background: ativo ? "linear-gradient(135deg, #1e3a5f, #1a4480)" : "#f8fafc",
                    color: ativo ? "#fff" : "#374151",
                    fontWeight: 700, fontSize: "0.88rem",
                    boxShadow: ativo ? "0 4px 14px rgba(30,58,95,0.35)" : "none",
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { if (!ativo) e.currentTarget.style.borderColor = "#1e3a5f"; }}
                    onMouseLeave={e => { if (!ativo) e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    {nomeTurma}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ETAPA 3: Resultado ──────────────────────────────────────────── */}
      {turmaSelecionada && (
        <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12, marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "0.78rem", fontWeight: 800,
                background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff",
              }}>3</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1e293b" }}>
                  {turmaSelecionada.turma} — {turnoSelecionado}
                </div>
                {dados && (
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {totalAlunos} alunos · {totalRegistros} observações no total
                  </div>
                )}
              </div>
            </div>

            {/* Botão Gerar PDF */}
            {dados && (
              <button
                onClick={handleGerarPDF}
                disabled={gerandoPDF}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "11px 22px", borderRadius: 12, cursor: gerandoPDF ? "default" : "pointer",
                  border: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.88rem",
                  background: gerandoPDF
                    ? "linear-gradient(135deg, #64748b, #475569)"
                    : "linear-gradient(135deg, #1e3a5f 0%, #1a4480 100%)",
                  color: "#fff",
                  boxShadow: gerandoPDF ? "none" : "0 4px 16px rgba(30,58,95,0.4)",
                  transition: "all 0.2s",
                  opacity: gerandoPDF ? 0.8 : 1,
                }}
                onMouseEnter={e => { if (!gerandoPDF) e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {gerandoPDF ? (
                  <><Spinner size={18} color="#fff" /> Gerando PDF...</>
                ) : (
                  <>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Gerar PDF
                  </>
                )}
              </button>
            )}
          </div>

          {/* Estado de loading */}
          {loadingDados && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 16, padding: 60, background: "#fff", borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
            }}>
              <Spinner size={40} />
              <p style={{ color: "#64748b", fontWeight: 600, margin: 0 }}>
                Carregando registros do conselho...
              </p>
            </div>
          )}

          {/* Erro */}
          {erro && !loadingDados && (
            <div style={{
              display: "flex", alignItems: "center", gap: 14, padding: "20px 24px",
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 14, color: "#b91c1c",
            }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{erro}</span>
            </div>
          )}

          {/* Lista de alunos */}
          {dados && !loadingDados && (
            <>
              {dados.alunos.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: 60, background: "#fff", borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)", color: "#94a3b8",
                }}>
                  <div style={{ fontSize: "3rem", marginBottom: 12 }}>📋</div>
                  <p style={{ fontWeight: 600, fontSize: "1rem" }}>
                    Nenhum aluno encontrado nesta turma para o ano letivo {anoLetivo}.
                  </p>
                </div>
              ) : (
                dados.alunos.map((aluno, idx) => (
                  <AlunoCard key={aluno.codigo} aluno={aluno} stamp={fotoStamp} numero={idx + 1} />
                ))
              )}

              {/* Rodapé informativo */}
              <div style={{
                textAlign: "center", padding: "16px 0 8px",
                color: "#94a3b8", fontSize: "0.75rem",
              }}>
                Relatório gerado em {new Date().toLocaleString("pt-BR")} · Turma {turmaSelecionada.nome} · Ano letivo {anoLetivo}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
