// src/features/secretaria/relatorios/RelatoriosSecretaria.jsx
import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";

function anoLetivoPadrao() {
  const m = new Date().getMonth() + 1;
  return m <= 1 ? new Date().getFullYear() - 1 : new Date().getFullYear();
}

const CORES_SERIE = {
  "6º Ano": { bg: "#6366f1", light: "rgba(99,102,241,0.12)" },
  "7º Ano": { bg: "#0ea5e9", light: "rgba(14,165,233,0.12)" },
  "8º Ano": { bg: "#10b981", light: "rgba(16,185,129,0.12)" },
  "9º Ano": { bg: "#f59e0b", light: "rgba(245,158,11,0.12)" },
  "Outra":  { bg: "#94a3b8", light: "rgba(148,163,184,0.12)" },
};

const TURNOS = ["todos", "MATUTINO", "VESPERTINO", "NOTURNO"];

/* ─── Mini componente de card métrica ─── */
function MetricCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: "20px 24px",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
      borderLeft: `5px solid ${color}`,
      minWidth: 160,
      flex: 1,
    }}>
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color, marginTop: 4, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ─── Barra de progresso horizontal ─── */
function BarraProgresso({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{label}</span>
        <span style={{ fontSize: 13, color: "#64748b" }}>{value} alunos ({pct}%)</span>
      </div>
      <div style={{ height: 10, background: "#e2e8f0", borderRadius: 99 }}>
        <div style={{ height: 10, background: color, borderRadius: 99, width: `${pct}%`, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

/* ─── Tab button ─── */
function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
        transition: "all 0.2s",
        background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.08)",
        color: active ? "#fff" : "rgba(255,255,255,0.7)",
        boxShadow: active ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
      }}
    >
      {children}
    </button>
  );
}

export default function RelatoriosSecretaria() {
  const [abaAtiva, setAbaAtiva] = useState("matriculas");
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());
  const [turno, setTurno] = useState("todos");
  const [serie, setSerie] = useState("todas");
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // Dados dos relatórios
  const [dadosMatriculas, setDadosMatriculas] = useState(null);
  const [dadosIdades, setDadosIdades] = useState(null);
  const [dadosTurmas, setDadosTurmas] = useState(null);
  const [dadosGenero, setDadosGenero] = useState(null);

  // Buscar anos letivos
  useEffect(() => {
    api.get("/api/secretaria/relatorios/anos-letivos")
      .then(r => setAnosLetivos(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAnosLetivos([anoLetivoPadrao()]));
  }, []);

  // Buscar dados conforme aba
  useEffect(() => {
    fetchRelatorio();
  }, [abaAtiva, anoLetivo, turno, serie]);

  async function fetchRelatorio() {
    setLoading(true);
    setErro("");
    try {
      const params = { ano_letivo: anoLetivo, turno };
      if (abaAtiva === "matriculas") {
        const r = await api.get("/api/secretaria/relatorios/sintetico-matriculas", { params });
        setDadosMatriculas(r.data);
      } else if (abaAtiva === "idades") {
        const r = await api.get("/api/secretaria/relatorios/idades", { params: { ...params, serie } });
        setDadosIdades(r.data);
      } else if (abaAtiva === "turmas") {
        const r = await api.get("/api/secretaria/relatorios/turmas", { params });
        setDadosTurmas(r.data);
      } else if (abaAtiva === "genero") {
        const r = await api.get("/api/secretaria/relatorios/genero", { params });
        setDadosGenero(r.data);
      }
    } catch (e) {
      setErro("Erro ao carregar relatório. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  const [gerandoPdf, setGerandoPdf] = useState(false);

  async function handleImprimir() {
    setGerandoPdf(true);
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo, turno });
      if (abaAtiva === "idades" && serie !== "todas") params.set("serie", serie);
      const endpointMap = {
        matriculas: "sintetico-matriculas",
        idades: "idades",
        turmas: "turmas",
        genero: "genero",
      };
      const endpoint = endpointMap[abaAtiva] || "sintetico-matriculas";
      const r = await api.get(`/api/secretaria/relatorios/pdf/${endpoint}?${params}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      alert("Erro ao gerar PDF. Verifique a conexão.");
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      {/* HERO HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #312e81 60%, #4c1d95 100%)",
        padding: "32px 32px 40px",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(139,92,246,0.15)" }} />
        <div style={{ position: "absolute", bottom: -40, left: "40%", width: 140, height: 140, borderRadius: "50%", background: "rgba(99,102,241,0.1)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 12, padding: "8px 10px", fontSize: 22 }}>📊</div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>Secretaria</div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>Relatórios</h1>
            </div>
          </div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: 14, maxWidth: 560 }}>
            Análise completa dos dados de matrículas, idades, turmas e distribuição dos estudantes.
          </p>

          {/* TABS */}
          <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
            <Tab active={abaAtiva === "matriculas"} onClick={() => setAbaAtiva("matriculas")}>📋 Matrículas</Tab>
            <Tab active={abaAtiva === "idades"} onClick={() => setAbaAtiva("idades")}>🎂 Idades</Tab>
            <Tab active={abaAtiva === "turmas"} onClick={() => setAbaAtiva("turmas")}>🏫 Turmas</Tab>
            <Tab active={abaAtiva === "genero"} onClick={() => setAbaAtiva("genero")}>👥 Gênero</Tab>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "14px 32px",
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Ano Letivo:</label>
          <select
            value={anoLetivo}
            onChange={e => setAnoLetivo(Number(e.target.value))}
            style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, color: "#1e293b", background: "#f8fafc" }}
          >
            {anosLetivos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Turno:</label>
          <select
            value={turno}
            onChange={e => setTurno(e.target.value)}
            style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, color: "#1e293b", background: "#f8fafc" }}
          >
            {TURNOS.map(t => <option key={t} value={t}>{t === "todos" ? "Todos os Turnos" : t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
        </div>

        {abaAtiva === "idades" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Série:</label>
            <select
              value={serie}
              onChange={e => setSerie(e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, color: "#1e293b", background: "#f8fafc" }}
            >
              <option value="todas">Todas as séries</option>
              {["6","7","8","9"].map(s => <option key={s} value={s}>{s}º Ano</option>)}
            </select>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            onClick={fetchRelatorio}
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            🔄 Atualizar
          </button>
          <button
            onClick={handleImprimir}
            disabled={gerandoPdf}
            style={{ background: gerandoPdf ? "#94a3b8" : "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: gerandoPdf ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: gerandoPdf ? 0.7 : 1 }}
          >
            {gerandoPdf ? (
              <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #94a3b8", borderTopColor: "#475569", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Gerando PDF...</>
            ) : (
              <>🖨️ Imprimir PDF</>
            )}
          </button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
        {erro && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 10, padding: "12px 18px", marginBottom: 20, fontWeight: 600 }}>
            ⚠️ {erro}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ color: "#6366f1", fontWeight: 700, fontSize: 15 }}>Gerando relatório...</div>
          </div>
        )}

        {/* ABA: MATRÍCULAS */}
        {!loading && abaAtiva === "matriculas" && dadosMatriculas && (
          <div>
            {dadosMatriculas.total_geral === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#64748b' }}>Nenhuma matrícula encontrada</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Não há alunos matriculados com os filtros selecionados.</div>
              </div>
            ) : (
              <>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <MetricCard label="Total de Alunos" value={dadosMatriculas.total_geral} color="#6366f1" sub={`Ano letivo ${dadosMatriculas.ano_letivo}`} />
              {dadosMatriculas.por_serie.map(s => (
                <MetricCard key={s.serie} label={s.serie} value={s.total} color={CORES_SERIE[s.serie]?.bg || "#94a3b8"} />
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Distribuição por Série</h2>
              {dadosMatriculas.por_serie.map(s => (
                <BarraProgresso key={s.serie} label={s.serie} value={s.total} total={dadosMatriculas.total_geral} color={CORES_SERIE[s.serie]?.bg || "#94a3b8"} />
              ))}
            </div>

            {/* Detalhado por turno */}
            {dadosMatriculas.detalhado?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Detalhamento por Série e Turno</h2>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Série", "Turno", "Alunos"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosMatriculas.detalhado.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: CORES_SERIE[row.serie]?.light || "#f1f5f9", color: CORES_SERIE[row.serie]?.bg || "#64748b", padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{row.serie}</span>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569", fontWeight: 600 }}>{row.turno}</td>
                        <td style={{ padding: "10px 14px", fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* ABA: IDADES */}
        {!loading && abaAtiva === "idades" && dadosIdades && (
          <div>
            {dadosIdades.total === 0 && dadosIdades.sem_data_nascimento === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#64748b' }}>Nenhum aluno encontrado</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Não há alunos com os filtros selecionados. Tente outro turno ou série.</div>
              </div>
            ) : (
              <>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <MetricCard label="Total com DOB" value={dadosIdades.total} color="#0ea5e9" sub="Com data de nascimento" />
              <MetricCard label="Sem Data Nasc." value={dadosIdades.sem_data_nascimento} color="#f59e0b" sub="Dado ausente" />
            </div>

            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Distribuição por Faixa Etária</h2>
              {dadosIdades.distribuicao.map((f, i) => {
                const cores = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316"];
                return (
                  <BarraProgresso key={i} label={f.label} value={f.total} total={dadosIdades.total} color={cores[i % cores.length]} />
                );
              })}
            </div>

            {/* Lista de alunos */}
            {dadosIdades.alunos?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
                  Lista Nominal ({dadosIdades.alunos.length} alunos)
                </h2>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                      <tr>
                        {["Estudante", "Série", "Turma", "Turno", "Data Nasc.", "Idade"].map(h => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dadosIdades.alunos.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{a.estudante}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ background: CORES_SERIE[a.serie]?.light || "#f1f5f9", color: CORES_SERIE[a.serie]?.bg || "#64748b", padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{a.serie}</span>
                          </td>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#64748b" }}>{a.turma}</td>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#64748b" }}>{a.turno}</td>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#64748b" }}>{a.data_nascimento ? new Date(a.data_nascimento.includes('T') ? a.data_nascimento : a.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                          <td style={{ padding: "8px 12px", fontSize: 14, fontWeight: 800, color: "#6366f1" }}>{a.idade} anos</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* ABA: TURMAS */}
        {!loading && abaAtiva === "turmas" && dadosTurmas && (
          <div>
            {dadosTurmas.total_geral === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#64748b' }}>Nenhuma turma encontrada</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Não há turmas com alunos matriculados para os filtros selecionados.</div>
              </div>
            ) : (<>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <MetricCard label="Total de Alunos" value={dadosTurmas.total_geral} color="#10b981" sub={`Ano letivo ${dadosTurmas.ano_letivo}`} />
              <MetricCard label="Total de Turmas" value={dadosTurmas.turmas?.length || 0} color="#0ea5e9" />
            </div>

            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Alunos por Turma</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Turma", "Série", "Turno", "Alunos", ""].map((h, i) => (
                      <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosTurmas.turmas?.map((t, i) => {
                    const pct = dadosTurmas.total_geral > 0 ? Math.round((t.total_alunos / dadosTurmas.total_geral) * 100) : 0;
                    const cor = CORES_SERIE[t.serie]?.bg || "#94a3b8";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{t.turma}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: CORES_SERIE[t.serie]?.light || "#f1f5f9", color: cor, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{t.serie}</span>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "#64748b" }}>{t.turno}</td>
                        <td style={{ padding: "10px 14px", fontSize: 16, fontWeight: 800, color: cor }}>{t.total_alunos}</td>
                        <td style={{ padding: "10px 14px", minWidth: 120 }}>
                          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99 }}>
                            <div style={{ height: 8, background: cor, borderRadius: 99, width: `${pct}%`, transition: "width 0.6s ease" }} />
                          </div>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{pct}% do total</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>)}
          </div>
        )}

        {/* ABA: GÊNERO */}
        {!loading && abaAtiva === "genero" && dadosGenero && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <MetricCard label="Total" value={dadosGenero.totais?.total || 0} color="#8b5cf6" />
              <MetricCard label="Masculino" value={dadosGenero.totais?.M || 0} color="#0ea5e9" sub={`${dadosGenero.totais?.total > 0 ? Math.round((dadosGenero.totais.M / dadosGenero.totais.total) * 100) : 0}%`} />
              <MetricCard label="Feminino" value={dadosGenero.totais?.F || 0} color="#ec4899" sub={`${dadosGenero.totais?.total > 0 ? Math.round((dadosGenero.totais.F / dadosGenero.totais.total) * 100) : 0}%`} />
              {dadosGenero.totais?.outro > 0 && <MetricCard label="Não informado" value={dadosGenero.totais.outro} color="#94a3b8" />}
            </div>

            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Distribuição por Série e Gênero</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Série", "Gênero", "Alunos", ""].map((h, i) => (
                      <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosGenero.detalhado?.map((row, i) => {
                    const cor = row.sexo === "M" ? "#0ea5e9" : row.sexo === "F" ? "#ec4899" : "#94a3b8";
                    const total = dadosGenero.totais?.total || 1;
                    const pct = Math.round((row.total / total) * 100);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: CORES_SERIE[row.serie]?.light || "#f1f5f9", color: CORES_SERIE[row.serie]?.bg || "#64748b", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{row.serie}</span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ color: cor, fontWeight: 700, fontSize: 13 }}>{row.sexo === "M" ? "♂ Masculino" : row.sexo === "F" ? "♀ Feminino" : "Não informado"}</span>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 16, fontWeight: 800, color: cor }}>{row.total}</td>
                        <td style={{ padding: "10px 14px", minWidth: 140 }}>
                          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99 }}>
                            <div style={{ height: 8, background: cor, borderRadius: 99, width: `${pct}%`, transition: "width 0.6s ease" }} />
                          </div>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{pct}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
