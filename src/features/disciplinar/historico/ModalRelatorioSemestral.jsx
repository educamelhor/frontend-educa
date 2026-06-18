// src/features/disciplinar/historico/ModalRelatorioSemestral.jsx
// Relatório Semestral Quantitativo — Arts. 23 e 52 do Regulamento Disciplinar CCMDF
// Design premium com duas abas + impressão via window.print()
import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import api from "../../../services/api";

// ── Helpers ─────────────────────────────────────────────────────────────────
function getConceito(p) {
  if (p >= 10) return { label: "I - Excepcional",   color: "#7c3aed", bg: "#ede9fe" };
  if (p >= 9)  return { label: "II - Ótimo",         color: "#2563eb", bg: "#dbeafe" };
  if (p >= 7)  return { label: "III - Bom",          color: "#059669", bg: "#d1fae5" };
  if (p >= 5)  return { label: "IV - Regular",       color: "#d97706", bg: "#fef3c7" };
  if (p >= 2)  return { label: "V - Insuficiente",   color: "#ea580c", bg: "#ffedd5" };
  return              { label: "VI - Incompatível",  color: "#dc2626", bg: "#fee2e2" };
}

const MEDIDA_META = {
  "Advertência":       { icon: "📝", color: "#f59e0b", bg: "#fffbeb" },
  "Repreensão":        { icon: "⚠️", color: "#f97316", bg: "#fff7ed" },
  "Suspensão":         { icon: "🚫", color: "#ef4444", bg: "#fef2f2" },
  "Elogio":            { icon: "🌟", color: "#10b981", bg: "#ecfdf5" },
  "Mérito Disciplinar":{ icon: "🏅", color: "#6366f1", bg: "#eef2ff" },
};
function medidaMeta(medida) {
  return MEDIDA_META[medida] || { icon: "📋", color: "#6b7280", bg: "#f9fafb" };
}

// ── Estilos de impressão injetados via <style> ───────────────────────────────
const PRINT_CSS = `
@media print {
  body > *:not(#semestral-print-root) { display: none !important; }
  #semestral-print-root { display: block !important; position: static !important; }
  .no-print { display: none !important; }
  .print-page { page-break-after: always; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
  th { background: #1e3a5f; color: #fff; }
  h1, h2, h3 { color: #1e3a5f; }
}
`;

export default function ModalRelatorioSemestral({ open, onClose, escolaNome }) {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  const [aba, setAba]             = useState("art23");
  const [semestre, setSemestre]   = useState(mesAtual <= 6 ? 1 : 2);
  const [ano, setAno]             = useState(anoAtual);
  const [dados, setDados]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState(null);
  const printRef                  = useRef(null);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const fn = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  // Buscar dados ao abrir ou mudar semestre/ano
  useEffect(() => {
    if (!open) return;
    setDados(null);
    setErro(null);
    setLoading(true);
    api.get(`/api/relatorio-disciplinar/semestral?semestre=${semestre}&ano=${ano}`)
      .then(r => setDados(r.data))
      .catch(e => setErro(e?.response?.data?.error || e?.message || "Erro ao carregar dados."))
      .finally(() => setLoading(false));
  }, [open, semestre, ano]);

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  const nomeSemestre = semestre === 1 ? "1º Semestre" : "2º Semestre";
  const periodoStr   = semestre === 1 ? `Jan–Jun/${ano}` : `Jul–Dez/${ano}`;

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* Overlay */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          id="semestral-print-root"
          ref={printRef}
          style={{ position: "relative", background: "#fff", borderRadius: 20, width: "95vw", maxWidth: 860, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "sem-in 0.25s cubic-bezier(0.16,1,0.3,1)" }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`@keyframes sem-in { from { opacity:0; transform:scale(0.95) translateY(16px); } to { opacity:1; transform:none; } }`}</style>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ background: "linear-gradient(135deg, #0f2044 0%, #1d4ed8 60%, #3b82f6 100%)", padding: "20px 24px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                  📊 RELATÓRIO SEMESTRAL QUANTITATIVO
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>
                  {nomeSemestre} / {ano}
                </h2>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                  {escolaNome || "Módulo Disciplinar"} · {periodoStr}
                </div>
              </div>

              {/* Seletores */}
              <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={semestre}
                  onChange={e => setSemestre(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", outline: "none" }}
                >
                  <option value={1} style={{ color: "#000" }}>1º Semestre</option>
                  <option value={2} style={{ color: "#000" }}>2º Semestre</option>
                </select>
                <select
                  value={ano}
                  onChange={e => setAno(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", outline: "none" }}
                >
                  {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => (
                    <option key={a} value={a} style={{ color: "#000" }}>{a}</option>
                  ))}
                </select>
                <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <XMarkIcon style={{ width: 20, height: 20 }} />
                </button>
              </div>
            </div>

            {/* Abas */}
            <div className="no-print" style={{ display: "flex", gap: 4 }}>
              {[
                { id: "art23", label: "📊 Quantitativo (Art. 23)" },
                { id: "art52", label: "🎖️ Comportamento (Art. 52)" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAba(tab.id)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: 12,
                    background: aba === tab.id ? "#fff" : "rgba(255,255,255,0.1)",
                    color: aba === tab.id ? "#1e3a5f" : "rgba(255,255,255,0.7)",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Conteúdo ────────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {/* Loading */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 0", color: "#6b7280" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#1e3a5f", animation: "sem-spin 0.8s linear infinite" }} />
                <span style={{ fontWeight: 600 }}>Carregando dados do semestre…</span>
                <style>{`@keyframes sem-spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Erro */}
            {erro && !loading && (
              <div style={{ padding: "20px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, color: "#b91c1c", fontWeight: 600 }}>
                ❌ {erro}
              </div>
            )}

            {/* ── ABA ART. 23 ── */}
            {!loading && !erro && dados && aba === "art23" && (
              <div>
                {/* KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Total de Registros",    value: dados.art23.kpi.total || 0,              color: "#6366f1", icon: "📊" },
                    { label: "Alunos Envolvidos",     value: dados.art23.kpi.alunos_envolvidos || 0,  color: "#1d4ed8", icon: "👥" },
                    { label: "Finalizadas",            value: dados.art23.kpi.finalizadas || 0,        color: "#059669", icon: "✅" },
                    { label: "Em Aberto",              value: dados.art23.kpi.registradas || 0,        color: "#d97706", icon: "⏳" },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Medidas por tipo */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    Ocorrências por Tipo de Medida
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {dados.art23.porMedida.filter(m => m.medida !== 'BONUS_MEDIA').map(m => {
                      const meta = medidaMeta(m.medida);
                      return (
                        <div key={m.medida} style={{ background: meta.bg, border: `1px solid ${meta.color}30`, borderRadius: 12, padding: "12px 14px" }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{meta.icon}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: meta.color }}>{m.total}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 6 }}>{m.medida}</div>
                          <div style={{ fontSize: 10, color: "#6b7280" }}>
                            ✅ {m.finalizadas} finalizadas · ⏳ {m.registradas} em aberto
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Por turma */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    Ocorrências por Turma — sem identificação nominal (Art. 23)
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#1e3a5f", color: "#fff" }}>
                          {["Turma", "Turno", "Total", "Ativas", "Suspensões", "Dias Susp.", "Positivos"].map(h => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: h === "Turma" || h === "Turno" ? "left" : "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dados.art23.porTurma.map((r, i) => (
                          <tr key={r.turma + r.turno} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "9px 12px", fontWeight: 700, color: "#1e293b" }}>{r.turma}</td>
                            <td style={{ padding: "9px 12px", color: "#64748b" }}>{r.turno}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700 }}>{r.total}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", color: "#1d4ed8" }}>{r.ativas}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", color: Number(r.suspensoes) > 0 ? "#dc2626" : "#6b7280", fontWeight: Number(r.suspensoes) > 0 ? 700 : 400 }}>{r.suspensoes}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", color: Number(r.dias_suspensao) > 0 ? "#dc2626" : "#6b7280" }}>{r.dias_suspensao}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", color: "#059669", fontWeight: 700 }}>{r.positivos}</td>
                          </tr>
                        ))}
                        {dados.art23.porTurma.length === 0 && (
                          <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Nenhuma ocorrência no período.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top motivos + Responsáveis lado a lado */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                  {/* Top motivos */}
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                      🔝 Top 5 Motivos Mais Frequentes
                    </h3>
                    {dados.art23.topMotivos.length === 0 && (
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>Nenhum registro no período.</p>
                    )}
                    {dados.art23.topMotivos.map((m, i) => (
                      <div key={m.motivo} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1e3a5f", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", lineHeight: 1.3 }}>{m.motivo}</div>
                          <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", marginTop: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(100, (m.total / (dados.art23.topMotivos[0]?.total || 1)) * 100)}%`, background: "linear-gradient(90deg, #1e3a5f, #3b82f6)", borderRadius: 99 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#1e3a5f", flexShrink: 0 }}>{m.total}</span>
                      </div>
                    ))}
                  </div>

                  {/* Responsáveis */}
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                      👨‍👩‍👧 Convocação de Responsáveis
                    </h3>
                    {[
                      { label: "Convocados",   value: dados.art23.responsaveis.convocados  || 0, color: "#1d4ed8", icon: "📢" },
                      { label: "Comparecidos", value: dados.art23.responsaveis.comparecidos|| 0, color: "#059669", icon: "✅" },
                      { label: "Pendentes",    value: dados.art23.responsaveis.pendentes   || 0, color: "#dc2626", icon: "⏳" },
                    ].map(({ label, value, color, icon }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#374151" }}>{icon} {label}</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão imprimir */}
                <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
                  <button
                    onClick={handlePrint}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg, #0f2044, #1d4ed8)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    <PrinterIcon style={{ width: 18, height: 18 }} />
                    Imprimir / Salvar PDF
                  </button>
                </div>
              </div>
            )}

            {/* ── ABA ART. 52 ── */}
            {!loading && !erro && dados && aba === "art52" && (
              <div>
                {/* Alerta legal */}
                <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, marginBottom: 20, display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>⚖️</span>
                  <div style={{ fontSize: 12, color: "#92400e" }}>
                    <strong>Art. 52 — USO INTERNO:</strong> Esta relação deve ser encaminhada pelo Supervisor Disciplinar ao Comandante Disciplinar e ao Diretor Pedagógico-Administrativo ao final do semestre. Alunos com comportamento <em>Regular, Insuficiente ou Incompatível</em> (pontuação &lt; 7,0).
                  </div>
                </div>

                {/* Contagem */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: "#374151" }}>
                    <strong style={{ color: dados.art52.length > 0 ? "#dc2626" : "#059669", fontSize: 18 }}>{dados.art52.length}</strong>
                    {" "}aluno{dados.art52.length !== 1 ? "s" : ""} com comportamento abaixo do Bom
                    {" "}· <span style={{ color: "#6b7280" }}>{nomeSemestre} {ano}</span>
                  </div>
                </div>

                {dados.art52.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Excelente! Nenhum aluno abaixo de Bom neste semestre.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#1e3a5f", color: "#fff" }}>
                          {["Cód.", "Nome", "Turma", "Turno", "Pontuação", "Conceito"].map(h => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: h === "Nome" || h === "Turma" ? "left" : "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dados.art52.map((al, i) => {
                          const conceito = getConceito(al.pontuacao);
                          return (
                            <tr key={al.codigo} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "9px 12px", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>{al.codigo}</td>
                              <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1e293b" }}>{al.nome}</td>
                              <td style={{ padding: "9px 12px", color: "#374151" }}>{al.turma}</td>
                              <td style={{ padding: "9px 12px", color: "#64748b", textAlign: "center" }}>{al.turno}</td>
                              <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 800, color: conceito.color, fontSize: 15 }}>{al.pontuacao.toFixed(2)}</td>
                              <td style={{ padding: "9px 12px", textAlign: "center" }}>
                                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, color: conceito.color, background: conceito.bg, border: `1px solid ${conceito.color}40` }}>
                                  {conceito.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Botão imprimir */}
                <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16 }}>
                  <button
                    onClick={handlePrint}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg, #0f2044, #1d4ed8)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    <PrinterIcon style={{ width: 18, height: 18 }} />
                    Imprimir / Salvar PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
