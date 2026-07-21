// src/features/secretaria/horarios/WizardConfiguracaoGrade.jsx
import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const TURNOS_CONFIG = [
  { id: "matutino",   label: "Matutino",   emoji: "☀️",  desc: "Manhã",  periodos_default: 5 },
  { id: "vespertino", label: "Vespertino", emoji: "🌤️", desc: "Tarde",  periodos_default: 5 },
  { id: "noturno",    label: "Noturno",    emoji: "🌙",  desc: "Noite", periodos_default: 4 },
];

const DIAS_SEMANA = [
  { num: 1, label: "Seg", nome: "Segunda" },
  { num: 2, label: "Ter", nome: "Terça"   },
  { num: 3, label: "Qua", nome: "Quarta"  },
  { num: 4, label: "Qui", nome: "Quinta"  },
  { num: 5, label: "Sex", nome: "Sexta"   },
  { num: 6, label: "Sáb", nome: "Sábado"  },
];

const S = {
  outer: {
    flex: 1,
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "20px 16px",
    fontFamily: "'Montserrat', sans-serif",
    minHeight: "100vh"
  },
  card: {
    width: "100%", maxWidth: 680,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20, padding: "32px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.5)",
    color: "#f1f5f9",
  },
};

function Pill({ children, color = "#3b82f6" }) {
  return (
    <span style={{
      background: color + "30", border: `1px solid ${color}`,
      borderRadius: 8, padding: "4px 12px", fontSize: 13,
      color, fontWeight: 600, display: "inline-block",
    }}>{children}</span>
  );
}

function ResumoCard({ icon, titulo, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "12px 16px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          {titulo}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

export default function WizardConfiguracaoGrade({ onConcluir, configInicial }) {
  const [passo, setPasso]       = useState(1);
  const [turnos, setTurnos]     = useState(configInicial?.turnos || ["matutino", "vespertino"]);
  const [dias, setDias]         = useState(configInicial?.dias_semana || [1, 2, 3, 4, 5]);
  const [periodos, setPeriodos] = useState(configInicial?.periodos || { matutino: 5, vespertino: 5, noturno: 4 });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState([]);
  
  // Regras Gerais
  const rg = configInicial?.regras_gerais || {};
  const [regrasGerais, setRegrasGerais] = useState({
    preferencia_aulas_duplas: rg.preferencia_aulas_duplas !== undefined ? rg.preferencia_aulas_duplas : true,
    aulas_duplas_separar_recreio: rg.aulas_duplas_separar_recreio !== undefined ? rg.aulas_duplas_separar_recreio : false,
    max_aulas_mesmo_dia: rg.max_aulas_mesmo_dia || 2,
    recreio_apos_periodo: rg.recreio_apos_periodo || { matutino: 3, vespertino: 3, noturno: 2 },
    disciplinas_excludentes: rg.disciplinas_excludentes || []
  });

  const [selDisc1, setSelDisc1] = useState("");
  const [selDisc2, setSelDisc2] = useState("");

  useEffect(() => {
    api.get("/api/disciplinas").then(res => {
      setDisciplinasDisponiveis(Array.isArray(res.data) ? res.data : (res.data?.disciplinas || []));
    }).catch(err => console.error("Erro ao carregar disciplinas:", err));
  }, []);

  const toggleTurno = (id) =>
    setTurnos(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const toggleDia = (num) =>
    setDias(prev =>
      prev.includes(num) ? prev.filter(d => d !== num) : [...prev, num].sort((a, b) => a - b)
    );

  const setPeriodoTurno = (turnoId, n) =>
    setPeriodos(prev => ({ ...prev, [turnoId]: n }));

  const setRecreioTurno = (turnoId, n) =>
    setRegrasGerais(prev => ({ ...prev, recreio_apos_periodo: { ...prev.recreio_apos_periodo, [turnoId]: n } }));

  const addExcludente = () => {
    if (selDisc1 && selDisc2 && selDisc1 !== selDisc2) {
      // Ordenar os IDs para evitar duplicação invertida
      const par = [selDisc1, selDisc2].sort();
      const jahExiste = regrasGerais.disciplinas_excludentes.some(p => p[0] === par[0] && p[1] === par[1]);
      if (!jahExiste) {
        setRegrasGerais(prev => ({ ...prev, disciplinas_excludentes: [...prev.disciplinas_excludentes, par] }));
      }
      setSelDisc1(""); setSelDisc2("");
    }
  };

  const removeExcludente = (idx) => {
    setRegrasGerais(prev => ({
      ...prev,
      disciplinas_excludentes: prev.disciplinas_excludentes.filter((_, i) => i !== idx)
    }));
  };

  const getDiscNome = (idStr) => {
    const idNum = parseInt(idStr, 10);
    const d = disciplinasDisponiveis.find(x => x.id === idNum || String(x.id) === idStr);
    return d ? (d.nome || d.descricao || String(idStr)) : String(idStr);
  };

  const podeAvancar =
    (passo === 1 && turnos.length > 0) ||
    (passo === 2 && dias.length > 0)   ||
    (passo === 3 && turnos.every(t => (periodos[t] || 0) > 0)) ||
    passo === 4 || passo === 5 || passo === 6 || passo === 7;

  async function confirmar() {
    setSalvando(true); setErro("");
    try {
      const periodosAtivos = {};
      turnos.forEach(t => { periodosAtivos[t] = periodos[t] || 5; });
      await api.post("/api/escola/configuracao-grade", {
        turnos, dias_semana: dias, periodos: periodosAtivos, regras_gerais: regrasGerais
      });
      onConcluir({ turnos, dias_semana: dias, periodos: periodosAtivos, regras_gerais: regrasGerais });
    } catch {
      setErro("Erro ao salvar. Verifique sua conexão e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const passoLabels = ["Turnos", "Dias", "Períodos", "Regras", "Recreio", "Conflitos", "Revisão"];

  return (
    <div style={S.outer}>
      <div style={S.card}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>⚙️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
            Configuração da Grade Horária
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
            Configure regras globais e a inteligência do algoritmo.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
          {passoLabels.map((label, idx) => {
            const num = idx + 1;
            const ativo = num === passo;
            const concluido = num < passo;
            return (
              <React.Fragment key={num}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: concluido ? "#10b981" : ativo ? "#3b82f6" : "rgba(255,255,255,0.08)",
                    border: ativo ? "2px solid #60a5fa" : "2px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: "#fff",
                    boxShadow: ativo ? "0 0 12px rgba(59,130,246,0.5)" : "none",
                    transition: "all 0.3s",
                  }}>
                    {concluido ? "✓" : num}
                  </div>
                  <span style={{ fontSize: 9, color: ativo ? "#93c5fd" : "#475569", fontWeight: ativo ? 700 : 400 }}>
                    {label}
                  </span>
                </div>
                {idx < passoLabels.length - 1 && (
                  <div style={{
                    height: 2, width: 14, margin: "0 2px", marginBottom: 18,
                    background: concluido ? "#10b981" : "rgba(255,255,255,0.08)",
                    transition: "background 0.3s",
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ minHeight: 240 }}>
          {/* PASSO 1, 2, 3 = Turnos, Dias, Periodos */}
          {passo === 1 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                Quais turnos a escola oferece?
              </h2>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
                {TURNOS_CONFIG.map(t => {
                  const sel = turnos.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTurno(t.id)} style={{
                      width: 140, padding: "16px 12px", borderRadius: 16,
                      border: sel ? "2px solid #3b82f6" : "2px solid rgba(255,255,255,0.1)",
                      background: sel ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
                      cursor: "pointer", color: "#fff", transition: "all 0.2s",
                      boxShadow: sel ? "0 0 16px rgba(59,130,246,0.3)" : "none",
                      transform: sel ? "translateY(-2px) scale(1.02)" : "scale(1)",
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{t.emoji}</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                      {sel && <div style={{ marginTop: 8, color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>✓ Selecionado</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {passo === 2 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>
                Quais são os dias letivos?
              </h2>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {DIAS_SEMANA.map(d => {
                  const sel = dias.includes(d.num);
                  return (
                    <button key={d.num} onClick={() => toggleDia(d.num)} style={{
                      width: 68, height: 68, borderRadius: 12,
                      border: sel ? "2px solid #10b981" : "2px solid rgba(255,255,255,0.1)",
                      background: sel ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.04)",
                      cursor: "pointer", color: "#fff", transition: "all 0.2s",
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{d.label}</div>
                      <div style={{ color: sel ? "#6ee7b7" : "#94a3b8", fontSize: 10, marginTop: 2 }}>{d.nome}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {passo === 3 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>
                Quantas aulas por dia em cada turno?
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TURNOS_CONFIG.filter(t => turnos.includes(t.id)).map(t => (
                  <div key={t.id} style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{t.emoji}</span>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(t.id === "noturno" ? [3, 4, 5] : [4, 5, 6, 7]).map(n => (
                        <button key={n} onClick={() => setPeriodoTurno(t.id, n)} style={{
                          width: 38, height: 38, borderRadius: 8,
                          border: periodos[t.id] === n ? "2px solid #f59e0b" : "2px solid rgba(255,255,255,0.1)",
                          background: periodos[t.id] === n ? "rgba(245,158,11,0.22)" : "rgba(255,255,255,0.04)",
                          color: periodos[t.id] === n ? "#fbbf24" : "#94a3b8",
                          fontWeight: 800, fontSize: 15, cursor: "pointer", transition: "all 0.15s",
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 4: Regras de Aulas */}
          {passo === 4 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>
                Regras e Padrões de Alocação
              </h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={regrasGerais.preferencia_aulas_duplas}
                      onChange={e => setRegrasGerais({...regrasGerais, preferencia_aulas_duplas: e.target.checked})}
                      style={{ width: 20, height: 20, accentColor: "#3b82f6" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Preferencialmente Aulas Duplas</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>O algoritmo tentará sempre juntar aulas da mesma disciplina de forma geminada (duas seguidas).</div>
                    </div>
                  </label>
                </div>

                <div style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={regrasGerais.aulas_duplas_separar_recreio}
                      onChange={e => setRegrasGerais({...regrasGerais, aulas_duplas_separar_recreio: e.target.checked})}
                      style={{ width: 20, height: 20, accentColor: "#f59e0b" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Permitir separar aulas pelo Recreio/Intervalo</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Se marcado, uma aula dupla pode ter a 1ª parte antes do recreio e a 2ª parte depois. Se desmarcado, o algoritmo bloqueia essa divisão.</div>
                    </div>
                  </label>
                </div>

                <div style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Máximo de aulas do professor no mesmo dia (RC02)</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>O mesmo professor não entrará na mesma turma mais do que X vezes num mesmo dia.</div>
                  <select 
                    value={regrasGerais.max_aulas_mesmo_dia}
                    onChange={e => setRegrasGerais({...regrasGerais, max_aulas_mesmo_dia: parseInt(e.target.value)})}
                    style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 12px", color: "#fff", borderRadius: 6, width: "100%" }}
                  >
                    <option value={1}>1 aula (Apenas simples)</option>
                    <option value={2}>2 aulas (Aulas Duplas no máximo)</option>
                    <option value={3}>3 aulas no dia</option>
                    <option value={4}>4 aulas no dia</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 5: Recreio */}
          {passo === 5 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                Horário do Intervalo (Recreio)
              </h2>
              <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginBottom: 20 }}>
                Após qual aula acontece o intervalo em cada turno?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TURNOS_CONFIG.filter(t => turnos.includes(t.id)).map(t => {
                  const maxPeriodos = periodos[t.id] || 5;
                  const atuais = regrasGerais.recreio_apos_periodo || {};
                  return (
                  <div key={t.id} style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{t.emoji}</span>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    </div>
                    <select 
                      value={atuais[t.id] || 3}
                      onChange={e => setRecreioTurno(t.id, parseInt(e.target.value))}
                      style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 12px", color: "#fff", borderRadius: 6 }}
                    >
                      <option value={0}>Sem intervalo</option>
                      {Array.from({length: maxPeriodos - 1}).map((_, i) => (
                        <option key={i+1} value={i+1}>Após a {i+1}ª aula</option>
                      ))}
                    </select>
                  </div>
                )})}
              </div>
            </div>
          )}

          {/* PASSO 6: Disciplinas Conflitantes */}
          {passo === 6 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                Disciplinas Conflitantes
              </h2>
              <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginBottom: 20 }}>
                Evitar que turmas tenham estas duas disciplinas no mesmo dia.
              </p>
              
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select value={selDisc1} onChange={e => setSelDisc1(e.target.value)} style={{ flex: 1, background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", padding: "8px", color: "#fff", borderRadius: 6 }}>
                    <option value="">Selecione...</option>
                    {disciplinasDisponiveis.map(d => <option key={d.id} value={d.id}>{d.nome || d.descricao}</option>)}
                  </select>
                  <span style={{ fontWeight: "bold", color: "#64748b" }}>X</span>
                  <select value={selDisc2} onChange={e => setSelDisc2(e.target.value)} style={{ flex: 1, background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", padding: "8px", color: "#fff", borderRadius: 6 }}>
                    <option value="">Selecione...</option>
                    {disciplinasDisponiveis.map(d => <option key={d.id} value={d.id}>{d.nome || d.descricao}</option>)}
                  </select>
                  <button onClick={addExcludente} disabled={!selDisc1 || !selDisc2 || selDisc1===selDisc2} style={{
                    padding: "8px 12px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: "bold"
                  }}>+</button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {regrasGerais.disciplinas_excludentes.map((par, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "8px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{getDiscNome(par[0])} <span style={{ color:"#ef4444" }}>⚔️</span> {getDiscNome(par[1])}</span>
                    <button onClick={() => removeExcludente(idx)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                ))}
                {regrasGerais.disciplinas_excludentes.length === 0 && (
                  <div style={{ textAlign: "center", fontSize: 12, color: "#64748b" }}>Nenhum par conflitante cadastrado.</div>
                )}
              </div>
            </div>
          )}

          {/* PASSO 7: Revisão */}
          {passo === 7 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>
                Tudo pronto! Revise antes de confirmar.
              </h2>
              
              <ResumoCard icon="🔄" titulo="Turnos & Dias">
                {turnos.map(t => <Pill key={t} color="#3b82f6">{t}</Pill>)}
                <div style={{ width: "100%", height: 1 }} />
                {DIAS_SEMANA.filter(d => dias.includes(d.num)).map(d => <Pill key={d.num} color="#10b981">{d.nome}</Pill>)}
              </ResumoCard>

              <ResumoCard icon="⚙️" titulo="Regras Pedagógicas">
                <Pill color={regrasGerais.preferencia_aulas_duplas ? "#10b981" : "#64748b"}>Aulas Duplas</Pill>
                <Pill color={regrasGerais.max_aulas_mesmo_dia ? "#3b82f6" : "#64748b"}>Max {regrasGerais.max_aulas_mesmo_dia}/dia</Pill>
                {!regrasGerais.aulas_duplas_separar_recreio && <Pill color="#f59e0b">Recreio não quebra duplas</Pill>}
                {regrasGerais.disciplinas_excludentes.length > 0 && <Pill color="#ef4444">{regrasGerais.disciplinas_excludentes.length} Conflitos</Pill>}
              </ResumoCard>

              {erro && <p style={{ color: "#f87171", textAlign: "center", marginTop: 16, fontSize: 13 }}>{erro}</p>}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
          <button onClick={() => setPasso(p => p - 1)} disabled={passo === 1} style={{
            padding: "10px 20px", borderRadius: 8,
            border: passo === 1 ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.2)",
            background: passo === 1 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.08)",
            color: passo === 1 ? "#64748b" : "#e2e8f0",
            cursor: passo === 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s",
          }}>← Voltar</button>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[1,2,3,4,5,6,7].map(n => (
              <div key={n} style={{
                width: n === passo ? 16 : 4, height: 4, borderRadius: 2,
                background: n <= passo ? "#3b82f6" : "rgba(255,255,255,0.12)", transition: "all 0.3s",
              }} />
            ))}
          </div>

          {passo < 7 ? (
            <button onClick={() => podeAvancar && setPasso(p => p + 1)} disabled={!podeAvancar} style={{
              padding: "10px 24px", borderRadius: 8, background: podeAvancar ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.06)",
              border: "none", color: podeAvancar ? "#fff" : "#64748b", cursor: podeAvancar ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 700, boxShadow: podeAvancar ? "0 4px 14px rgba(59,130,246,0.4)" : "none", transition: "all 0.2s",
            }}>Próximo →</button>
          ) : (
            <button onClick={confirmar} disabled={salvando} style={{
              padding: "10px 24px", borderRadius: 8, background: salvando ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #10b981, #059669)",
              border: "none", color: "#fff", cursor: salvando ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700, boxShadow: salvando ? "none" : "0 4px 14px rgba(16,185,129,0.4)", transition: "all 0.2s",
            }}>
              {salvando ? "Salvando…" : "✓ Confirmar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
