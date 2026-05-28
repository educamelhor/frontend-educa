import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

/* ── Paleta de cores por disciplina ───────────────────────────────────── */
const DISC_PALETTE = {
  "Língua Portuguesa": { from: "#6366f1", to: "#8b5cf6", emoji: "📖", light: "#eef2ff" },
  "Matemática":        { from: "#0ea5e9", to: "#06b6d4", emoji: "📐", light: "#e0f2fe" },
  "Ciências":          { from: "#10b981", to: "#059669", emoji: "🔬", light: "#d1fae5" },
  "História":          { from: "#f59e0b", to: "#d97706", emoji: "🏛️", light: "#fef3c7" },
  "Geografia":         { from: "#ef4444", to: "#dc2626", emoji: "🌍", light: "#fee2e2" },
  "Inglês":            { from: "#3b82f6", to: "#1d4ed8", emoji: "🌐", light: "#dbeafe" },
  "Arte":              { from: "#ec4899", to: "#db2777", emoji: "🎨", light: "#fce7f3" },
  "Educação Física":   { from: "#f97316", to: "#ea580c", emoji: "⚽", light: "#ffedd5" },
  "Geometria":         { from: "#8b5cf6", to: "#7c3aed", emoji: "📏", light: "#ede9fe" },
};

const getPalette = (nome) =>
  DISC_PALETTE[nome] || { from: "#6366f1", to: "#4f46e5", emoji: "📚", light: "#eef2ff" };

const BIMESTRES = [
  { num: 0,  label: "Todos os Bimestres", icon: "∞" },
  { num: 1,  label: "1º Bimestre",        icon: "I"   },
  { num: 2,  label: "2º Bimestre",        icon: "II"  },
  { num: 3,  label: "3º Bimestre",        icon: "III" },
  { num: 4,  label: "4º Bimestre",        icon: "IV"  },
];

const SERIES_ORDER = ["6º ANO", "7º ANO", "8º ANO", "9º ANO"];

/* ── Spinner ─────────────────────────────────────────────────────────── */
const Spinner = ({ size = 20, color = "#6366f1" }) => (
  <span style={{
    width: size, height: size, borderRadius: "50%",
    border: `3px solid ${color}22`,
    borderTopColor: color,
    display: "inline-block",
    animation: "prof-spin 0.65s linear infinite",
  }} />
);

/* ── parseObjetivo: tópicos + subitens ────────────────────────────────── */
const parseObjetivo = (texto) => {
  if (!texto) return [];
  const topicos = [];
  let atual = null;
  for (const linha of texto.split("\n")) {
    const tMatch = linha.match(/^\s*(\d+)\.\s+(.+)/);
    const sMatch = linha.match(/^\s*[•\-]\s+(.+)/);
    if (tMatch) {
      atual = { texto: tMatch[2].trim(), subitens: [] };
      topicos.push(atual);
    } else if (sMatch && atual) {
      atual.subitens.push(sMatch[1].trim());
    } else {
      const raw = linha.replace(/^[•\-\*]\s*/, "").trim();
      if (raw) { atual = { texto: raw, subitens: [] }; topicos.push(atual); }
    }
  }
  return topicos;
};

/* ── Componente de conteúdo de um bimestre/série ──────────────────────── */
function ObjetivoCard({ numero, objetivo, corRgb }) {
  const topicos = parseObjetivo(objetivo.objetivo_texto || "");
  const [r, g, b] = corRgb;
  return (
    <div style={{
      background: "#fafbff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: "14px 16px 14px 48px",
      position: "relative",
      marginBottom: 8,
      transition: "box-shadow .15s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      {/* Barra lateral */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        borderRadius: "12px 0 0 12px",
        background: `rgb(${r},${g},${b})`,
      }} />
      {/* Número */}
      <div style={{
        position: "absolute", left: 12, top: 12,
        width: 24, height: 24, borderRadius: "50%",
        background: `rgb(${r},${g},${b})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.72rem", fontWeight: 800, color: "#fff",
      }}>{numero}</div>

      {topicos.length > 0 ? topicos.map((top, ti) => (
        <div key={ti} style={{ marginBottom: top.subitens.length ? 6 : 0 }}>
          <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.5 }}>
            {top.texto}
          </p>
          {top.subitens.map((sub, si) => (
            <div key={si} style={{
              display: "flex", gap: 6, marginTop: 3, paddingLeft: 12,
              fontSize: "0.81rem", color: "#475569", lineHeight: 1.45,
            }}>
              <span style={{ color: `rgb(${r},${g},${b})`, flexShrink: 0, marginTop: 1 }}>•</span>
              <span>{sub}</span>
            </div>
          ))}
        </div>
      )) : (
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#1e293b", lineHeight: 1.5 }}>
          {objetivo.objetivo_texto}
        </p>
      )}
    </div>
  );
}

/* ── Bloco de uma série ───────────────────────────────────────────────── */
function SerieBloco({ serie, itens, palette }) {
  const normSerie = (s) => {
    const m = s.match(/(\d+)/);
    if (m) return `${m[1]}º Ano`;
    return s;
  };

  const porConteudo = {};
  for (const item of itens) {
    const chave = item.conteudo_seedf || "Conteúdo";
    if (!porConteudo[chave]) porConteudo[chave] = { objetivos: [] };
    if ((item.objetivo_texto || "").trim()) porConteudo[chave].objetivos.push(item);
  }

  // Cria uma cor baseada no índice da série para variar a tonalidade
  const parseHex = (hex) => {
    const v = hex.replace("#", "");
    return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
  };
  const rgb = parseHex(palette.from);
  let numIdx = 1;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Banner da série */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        borderRadius: 10, padding: "10px 16px", marginBottom: 12,
        boxShadow: `0 4px 12px ${palette.from}40`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.1rem" }}>{palette.emoji}</span>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff", letterSpacing: "0.02em" }}>
            {normSerie(serie)}
          </span>
        </div>
        <span style={{
          fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.85)",
          background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "2px 10px",
        }}>
          {itens.length} objetivo{itens.length !== 1 ? "s" : ""}
        </span>
      </div>

      {Object.values(porConteudo).map((grupo, gi) =>
        grupo.objetivos.map((obj) => (
          <ObjetivoCard
            key={`${gi}-${numIdx}`}
            numero={numIdx++}
            objetivo={obj}
            corRgb={rgb}
          />
        ))
      )}
    </div>
  );
}

/* ── Viewer de conteúdos ──────────────────────────────────────────────── */
function ConteudoViewer({ disciplina, bimestre, onClose }) {
  const [dados, setDados]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState(null);
  const palette = getPalette(disciplina.nome);
  const bimLabel = bimestre === 0 ? "Todos os Bimestres" : `${bimestre}º Bimestre`;

  useEffect(() => {
    let cancelled = false;
    const carregarDados = async () => {
      try {
        setLoading(true); setErro(null);
        const params = {
          disciplina_id: disciplina.id,
          ano_letivo: 2026,
        };
        if (bimestre !== 0) params.bimestre = bimestre;
        const { data } = await api.get("/conteudos/admin/relatorio/pdf-data", { params });
        if (cancelled) return;
        if (data?.ok) setDados(data);
        else setErro("Nenhum conteúdo encontrado para esta disciplina.");
      } catch (e) {
        if (!cancelled) setErro("Não foi possível carregar os conteúdos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    carregarDados();
    return () => { cancelled = true; };
  }, [disciplina.id, bimestre]);

  // Agrupa itens: serie → bimestre → itens
  const buildEstrutura = () => {
    if (!dados?.itens?.length) return [];
    const bimPresentes = bimestre !== 0
      ? [bimestre]
      : [...new Set(dados.itens.map(i => i.bimestre))].sort();

    const todasSeries = [...new Set(dados.itens.map(i => (i.serie || "").toUpperCase()))];
    const seriesOrdenadas = [
      ...SERIES_ORDER.filter(s => todasSeries.includes(s)),
      ...todasSeries.filter(s => !SERIES_ORDER.includes(s)),
    ];

    return seriesOrdenadas.map(serie => ({
      serie,
      bimestres: bimPresentes.map(bim => ({
        bim,
        itens: dados.itens.filter(i =>
          (i.serie || "").toUpperCase() === serie && i.bimestre === bim
        ),
      })).filter(b => b.itens.length > 0),
    })).filter(s => s.bimestres.length > 0);
  };

  const estrutura = dados ? buildEstrutura() : [];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "24px 16px", overflowY: "auto",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 760,
        boxShadow: "0 32px 80px rgba(0,0,0,.25)",
        overflow: "hidden", marginTop: 8,
      }}>
        {/* Header do viewer */}
        <div style={{
          background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
            }}>{palette.emoji}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#fff" }}>
                {disciplina.nome}
              </h2>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                Objetivos de Aprendizagem — {bimLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)", border: "none",
            color: "#fff", fontSize: "1.2rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Corpo */}
        <div style={{ padding: "24px 24px", maxHeight: "75vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 48 }}>
              <Spinner size={36} color={palette.from} />
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Carregando conteúdos...</p>
            </div>
          ) : erro ? (
            <div style={{
              background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12,
              padding: "20px 24px", textAlign: "center", color: "#b91c1c",
            }}>
              <p style={{ margin: 0, fontSize: "0.88rem" }}>⚠️ {erro}</p>
            </div>
          ) : estrutura.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 48, color: "#94a3b8",
            }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>📭</div>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                Nenhum conteúdo cadastrado para {bimLabel}.
              </p>
            </div>
          ) : (
            estrutura.map(({ serie, bimestres: bims }) => (
              <div key={serie} style={{ marginBottom: 32 }}>
                {/* Se múltiplos bimestres, agrupa por bimestre dentro da série */}
                {bims.map(({ bim, itens }) => (
                  <div key={bim}>
                    {bimestre === 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        marginBottom: 14, marginTop: bim !== bims[0].bim ? 20 : 0,
                      }}>
                        <div style={{
                          height: 1, flex: 1, background: "#e5e7eb",
                        }} />
                        <span style={{
                          fontSize: "0.75rem", fontWeight: 700, color: palette.from,
                          background: palette.light, borderRadius: 20,
                          padding: "3px 12px", border: `1px solid ${palette.from}30`,
                        }}>
                          {bim}º Bimestre
                        </span>
                        <div style={{ height: 1, flex: 1, background: "#e5e7eb" }} />
                      </div>
                    )}
                    <SerieBloco serie={serie} itens={itens} palette={palette} />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Card de Disciplina com efeito flip/expand para bimestre ─────────── */
function DisciplinaCard({ disciplina, onSelect }) {
  const [flipped, setFlipped] = useState(false);
  const palette = getPalette(disciplina.nome);

  return (
    <div
      style={{
        perspective: 1000,
        width: "100%",
        height: flipped ? "auto" : 180,
        cursor: "pointer",
      }}
      onClick={() => !flipped && setFlipped(true)}
    >
      <div style={{
        position: "relative",
        width: "100%",
        transformStyle: "preserve-3d",
        transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        minHeight: 180,
      }}>

        {/* ── FRENTE do card ── */}
        <div style={{
          position: flipped ? "absolute" : "relative",
          inset: 0,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          borderRadius: 18,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: `0 8px 32px ${palette.from}40`,
          minHeight: 180,
          overflow: "hidden",
        }}>
          {/* Círculo decorativo de fundo */}
          <div style={{
            position: "absolute", right: -20, top: -20,
            width: 120, height: 120, borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
          }} />
          <div style={{
            position: "absolute", right: 20, bottom: -30,
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }} />

          <div style={{ position: "relative" }}>
            <div style={{
              fontSize: "2.2rem", marginBottom: 10, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.15))",
            }}>{palette.emoji}</div>
            <h3 style={{
              margin: 0, fontSize: "1.05rem", fontWeight: 800,
              color: "#fff", lineHeight: 1.3,
            }}>{disciplina.nome}</h3>
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "relative",
          }}>
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.75)",
              background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              Toque para ver conteúdos
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "1rem",
            }}>→</div>
          </div>
        </div>

        {/* ── VERSO do card (seleção de bimestre) ── */}
        <div style={{
          position: "absolute",
          inset: 0,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "#fff",
          borderRadius: 18,
          border: `2px solid ${palette.from}30`,
          boxShadow: `0 8px 32px ${palette.from}20`,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 180,
        }}>
          {/* Mini header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.2rem" }}>{palette.emoji}</span>
              <span style={{
                fontWeight: 800, fontSize: "0.88rem",
                background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {disciplina.nome}
              </span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFlipped(false); }}
              style={{
                background: "#f1f5f9", border: "none", borderRadius: 8,
                padding: "3px 10px", cursor: "pointer", fontSize: "0.75rem",
                color: "#64748b", fontWeight: 600,
              }}
            >✕ Fechar</button>
          </div>

          <p style={{ margin: "0 0 4px", fontSize: "0.76rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Selecione o bimestre
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {BIMESTRES.map(b => (
              <button
                key={b.num}
                onClick={e => { e.stopPropagation(); onSelect(disciplina, b.num); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 14px",
                  background: palette.light,
                  border: `1.5px solid ${palette.from}25`,
                  borderRadius: 10, cursor: "pointer",
                  transition: "all .15s",
                  textAlign: "left",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = palette.from;
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.querySelector(".bim-icon").style.color = "#fff";
                  e.currentTarget.querySelector(".bim-label").style.color = "#fff";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = palette.light;
                  e.currentTarget.style.color = "";
                  e.currentTarget.querySelector(".bim-icon").style.color = palette.from;
                  e.currentTarget.querySelector(".bim-label").style.color = "#1e293b";
                }}
              >
                <span className="bim-icon" style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "rgba(255,255,255,0.6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", fontWeight: 900, color: palette.from,
                  flexShrink: 0, transition: "color .15s",
                }}>{b.icon}</span>
                <span className="bim-label" style={{
                  fontSize: "0.84rem", fontWeight: 600, color: "#1e293b",
                  transition: "color .15s",
                }}>{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────────────── */
export default function Conteudos() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [erro, setErro]               = useState(null);
  const [viewer, setViewer]           = useState(null); // { disciplina, bimestre }

  const carregarDisciplinas = useCallback(async () => {
    try {
      setLoading(true); setErro(null);
      const { data } = await api.get("/professores/me/disciplinas");
      setDisciplinas(data?.disciplinas || []);
    } catch (e) {
      setErro("Não foi possível carregar suas disciplinas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarDisciplinas(); }, [carregarDisciplinas]);

  const handleSelect = (disciplina, bimestre) => {
    setViewer({ disciplina, bimestre });
  };

  return (
    <>
      <style>{`
        @keyframes prof-spin { to { transform: rotate(360deg); } }
        @keyframes prof-fadein { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .prof-disc-card { animation: prof-fadein .35s ease both; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%", paddingBottom: 40 }}>

        {/* ── Header Premium ──────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)",
          borderRadius: 20, padding: "28px 32px", marginBottom: 28,
          position: "relative", overflow: "hidden",
        }}>
          {/* Orbs decorativos */}
          <div style={{
            position: "absolute", right: -40, top: -40, width: 200, height: 200,
            borderRadius: "50%", background: "rgba(99,102,241,0.15)",
          }} />
          <div style={{
            position: "absolute", right: 80, bottom: -60, width: 140, height: 140,
            borderRadius: "50%", background: "rgba(139,92,246,0.1)",
          }} />

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem", boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
              }}>📚</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#fff" }}>
                  Conteúdos Programáticos
                </h1>
                <p style={{ margin: 0, fontSize: "0.84rem", color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                  Consulte os objetivos de aprendizagem das suas disciplinas
                </p>
              </div>
            </div>

            {/* Tags informativas */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { icon: "🎯", label: "Objetivos de Aprendizagem" },
                { icon: "📅", label: "Por bimestre" },
                { icon: "🎓", label: "Todos os anos/séries" },
              ].map((tag, i) => (
                <span key={i} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20, padding: "4px 12px",
                  fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontWeight: 600,
                }}>
                  {tag.icon} {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grid de disciplinas ──────────────────────────── */}
        {loading ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 16, padding: "60px 0",
          }}>
            <Spinner size={40} />
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
              Carregando suas disciplinas...
            </p>
          </div>
        ) : erro ? (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 14, padding: "20px 24px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: "1.4rem" }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: "#b91c1c" }}>{erro}</p>
              <button onClick={carregarDisciplinas} style={{
                background: "none", border: "none", color: "#6366f1",
                cursor: "pointer", fontSize: "0.82rem", padding: 0, marginTop: 4, fontWeight: 600,
              }}>→ Tentar novamente</button>
            </div>
          </div>
        ) : disciplinas.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 0", color: "#94a3b8",
          }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🔍</div>
            <h3 style={{ margin: "0 0 8px", color: "#64748b", fontWeight: 700 }}>
              Nenhuma disciplina encontrada
            </h3>
            <p style={{ margin: 0, fontSize: "0.88rem" }}>
              Verifique se sua modulação está configurada corretamente.
            </p>
          </div>
        ) : (
          <>
            <p style={{
              margin: "0 0 20px", fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {disciplinas.length} disciplina{disciplinas.length !== 1 ? "s" : ""} encontrada{disciplinas.length !== 1 ? "s" : ""}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}>
              {disciplinas.map((disc, i) => (
                <div
                  key={disc.id}
                  className="prof-disc-card"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <DisciplinaCard disciplina={disc} onSelect={handleSelect} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Viewer de conteúdos (modal) ─────────────────── */}
      {viewer && (
        <ConteudoViewer
          disciplina={viewer.disciplina}
          bimestre={viewer.bimestre}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
