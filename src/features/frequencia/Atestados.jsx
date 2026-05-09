// src/features/frequencia/Atestados.jsx
// ============================================================================
// Módulo FREQUÊNCIA — Atestados e Justificativas de Faltas
// Permite coordenadores/diretores registrar, editar e excluir justificativas.
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const TIPOS_JUSTIFICATIVA = [
  { value: "atestado_medico", label: "Atestado Médico", icon: "🏥", cor: "#ef4444" },
  { value: "atestado_acompanhamento", label: "Atestado de Acompanhamento", icon: "👨‍⚕️", cor: "#f97316" },
  { value: "atestado_obito", label: "Atestado de Óbito", icon: "🕊️", cor: "#6b7280" },
  { value: "atividades_militares", label: "Atividades Militares", icon: "🎖️", cor: "#059669" },
  { value: "convocacao_oficial", label: "Convocação Oficial", icon: "📋", cor: "#2563eb" },
  { value: "declaracao_trabalhista", label: "Declaração Trabalhista", icon: "💼", cor: "#7c3aed" },
  { value: "populacao_itinerancia", label: "População em Situação de Itinerância", icon: "🏕️", cor: "#d97706" },
  { value: "licenca_gestante", label: "Licença Gestante", icon: "🤰", cor: "#ec4899" },
  { value: "crenca_religiosa", label: "Lei Federal nº 13.796/2018 — Crença Religiosa", icon: "🙏", cor: "#8b5cf6" },
  { value: "estudante_atleta", label: "Estudante Atleta / Representação Oficial — País ou DF", icon: "🏅", cor: "#0891b2" },
  { value: "atividade_remota", label: "Atividade Remota (COVID-19)", icon: "💻", cor: "#6366f1" },
  { value: "intercambio", label: "Intercâmbio — Decreto nº 47.210 de 09/05/2025", icon: "✈️", cor: "#0d9488" },
];

const FORM_VAZIO = { aluno_id: "", tipo: "", data_inicio: "", data_fim: "", observacao: "", dias: 1 };
const ANO_LETIVO = String(new Date().getFullYear());

// Formata 'YYYY-MM-DD' ou ISO para 'DD/MM/YYYY' sem passar pelo objeto Date (evita bug UTC-3)
const fmtDataBR = (str) => {
  if (!str) return '—';
  const s = String(str).split('T')[0];
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}/${m}/${y}` : str;
};

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function Atestados() {
  const escolaId = localStorage.getItem("escola_id");
  const perfil = String(localStorage.getItem("perfil") || "").toLowerCase();
  const canRegister = ["diretor", "vice_diretor", "supervisor", "coordenador", "secretario", "orientador", "pedagogo"].includes(perfil);
  const isProfessor = perfil === "professor";
  const ANO_LETIVO = String(new Date().getFullYear());

  // ── Filtros ─────────────────────────────────
  const [turnos, setTurnos] = useState([]);
  const [turno, setTurno] = useState("");
  const [turmas, setTurmas] = useState([]);
  const [turmasFiltradas, setTurmasFiltradas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [alunos, setAlunos] = useState([]);
  const [justificativas, setJustificativas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroAluno, setFiltroAluno] = useState("");

  // ── Modal (novo/editar) ──────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // null = novo, number = editar
  const [modalTurmaId, setModalTurmaId] = useState("");
  const [modalAlunos, setModalAlunos] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  // ── Modal de exclusão ────────────────────────
  const [excluindoId, setExcluindoId] = useState(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);

  // ── Turnos ──────────────────────────────────
  useEffect(() => {
    api.get("/turnos")
      .then(r => setTurnos(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  // ── Turmas ──────────────────────────────────
  useEffect(() => {
    if (!escolaId) return;
    if (isProfessor) {
      // LGPD: professor vê apenas suas turmas do ano letivo atual
      api.get(`/professores/me/turmas?ano=${ANO_LETIVO}`)
        .then(r => {
          const lista = r.data?.turmas || [];
          setTurmas(lista);
          setTurmasFiltradas(lista);
        })
        .catch(() => { setTurmas([]); setTurmasFiltradas([]); });
    } else {
      // Coordenação/direção: todas as turmas do ano letivo atual
      api.get("/turmas")
        .then(r => {
          const all = (r.data || []).filter(t => String(t.ano) === ANO_LETIVO);
          setTurmas(all);
          setTurmasFiltradas(turno ? all.filter(t => (t.turno || "").toLowerCase() === turno.toLowerCase()) : all);
        })
        .catch(() => {});
    }
  }, [escolaId, isProfessor]);

  useEffect(() => {
    // Para professor, o filtro de turno não se aplica (já filtrou pelas suas turmas)
    if (isProfessor) return;
    setTurmasFiltradas(turno ? turmas.filter(t => (t.turno || "").toLowerCase() === turno.toLowerCase()) : turmas);
    setTurmaId("");
    setAlunos([]);
  }, [turno, turmas, isProfessor]);

  // ── Alunos do modal ─────────────────────────
  useEffect(() => {
    if (!modalTurmaId) { setModalAlunos([]); return; }
    api.get(`/turmas/${modalTurmaId}/alunos`)
      .then(r => setModalAlunos(r.data?.alunos || r.data || []))
      .catch(() => setModalAlunos([]));
  }, [modalTurmaId]);

  // ── Justificativas ──────────────────────────
  const carregarJustificativas = useCallback(async () => {
    if (!escolaId) return;
    setLoading(true);
    try {
      const params = { escola_id: escolaId };
      if (turmaId) params.turma_id = turmaId;
      if (filtroTipo) params.tipo = filtroTipo;
      const r = await api.get("/frequencia/justificativas", { params });
      setJustificativas(r.data || []);
    } catch {
      setJustificativas([]);
    } finally {
      setLoading(false);
    }
  }, [escolaId, turmaId, filtroTipo]);

  useEffect(() => { carregarJustificativas(); }, [carregarJustificativas]);

  // ── Calcular dias ────────────────────────────
  useEffect(() => {
    if (form.data_inicio && form.data_fim) {
      const d1 = new Date(form.data_inicio);
      const d2 = new Date(form.data_fim);
      const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      setForm(f => ({ ...f, dias: diff }));
    }
  }, [form.data_inicio, form.data_fim]);

  // ── Abrir modal novo ─────────────────────────
  const abrirModalNovo = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalTurmaId("");
    setModalAlunos([]);
    setErroModal("");
    setShowModal(true);
  };

  // ── Abrir modal editar ───────────────────────
  const abrirModalEditar = (j) => {
    setEditandoId(j.id);
    setForm({
      aluno_id: j.aluno_id,
      tipo: j.tipo,
      data_inicio: j.data_inicio ? j.data_inicio.slice(0, 10) : "",
      data_fim: j.data_fim ? j.data_fim.slice(0, 10) : "",
      observacao: j.observacao || "",
      dias: j.dias || 1,
    });
    setModalTurmaId(String(j.turma_id || ""));
    setErroModal("");
    setShowModal(true);
  };

  // ── Salvar (novo ou editar) ──────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.aluno_id || !form.tipo || !form.data_inicio || !form.data_fim) return;
    setSalvando(true);
    setErroModal("");
    try {
      if (editandoId) {
        // Editar
        await api.put(`/frequencia/justificativas/${editandoId}`, {
          tipo: form.tipo,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim,
          dias: form.dias,
          observacao: form.observacao,
        });
      } else {
        // Novo
        await api.post("/frequencia/justificativas", {
          ...form,
          escola_id: escolaId,
          turma_id: modalTurmaId,
        });
      }
      setShowModal(false);
      setForm(FORM_VAZIO);
      setModalTurmaId("");
      setModalAlunos([]);
      carregarJustificativas();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      if (status === 409) {
        setErroModal("⚠️ " + msg);
      } else {
        setErroModal("❌ Erro ao salvar: " + msg);
      }
    } finally {
      setSalvando(false);
    }
  };

  // ── Excluir ──────────────────────────────────
  const confirmarExclusao = (j) => {
    setItemParaExcluir(j);
    setConfirmandoExclusao(true);
  };

  const executarExclusao = async () => {
    if (!itemParaExcluir) return;
    setExcluindoId(itemParaExcluir.id);
    try {
      await api.delete(`/frequencia/justificativas/${itemParaExcluir.id}`);
      setConfirmandoExclusao(false);
      setItemParaExcluir(null);
      carregarJustificativas();
    } catch (err) {
      alert("Erro ao excluir: " + (err.response?.data?.error || err.message));
    } finally {
      setExcluindoId(null);
    }
  };

  // ── Info do tipo ─────────────────────────────
  const getTypeInfo = (val) => TIPOS_JUSTIFICATIVA.find(t => t.value === val);

  const justificativasFiltradas = justificativas.filter(j => {
    if (filtroAluno) {
      if (!(j.aluno_nome || "").toLowerCase().includes(filtroAluno.toLowerCase())) return false;
    }
    return true;
  });

  const stats = {
    total: justificativas.length,
    medico: justificativas.filter(j => j.tipo === "atestado_medico").length,
    acompanhamento: justificativas.filter(j => j.tipo === "atestado_acompanhamento").length,
    outros: justificativas.filter(j => !["atestado_medico", "atestado_acompanhamento"].includes(j.tipo)).length,
  };

  // ── Render ───────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* ═══ HEADER ═══ */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f766e 100%)",
        borderRadius: 16, padding: "28px 32px", marginBottom: 24,
        color: "#fff", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 180, height: 180,
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)", borderRadius: "50%",
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
          }}>📋</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Atestados e Justificativas
            </h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: "0.88rem", marginTop: 2 }}>
              {isProfessor
                ? `Consulta restrita às suas turmas · Ano letivo ${ANO_LETIVO}`
                : "Registro e acompanhamento de justificativas de faltas dos estudantes"}
            </p>
          </div>
        </div>
      </div>

      {/* Banner LGPD — só para professor */}
      {isProfessor && (
        <div style={{
          background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12,
          padding: "12px 18px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e40af" }}>Acesso LGPD restrito</div>
            <div style={{ fontSize: "0.76rem", color: "#3b82f6", marginTop: 2 }}>
              Você visualiza apenas os atestados dos alunos das suas turmas no ano letivo {ANO_LETIVO}.
              Nenhum dado sensível (CID, imagem) é exibido.
            </div>
          </div>
        </div>
      )}

      {/* ═══ CARDS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Registros", value: stats.total, icon: "📊", gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
          { label: "Atestados Médicos", value: stats.medico, icon: "🏥", gradient: "linear-gradient(135deg, #ef4444, #dc2626)" },
          { label: "Acompanhamento", value: stats.acompanhamento, icon: "👨‍⚕️", gradient: "linear-gradient(135deg, #f97316, #ea580c)" },
          { label: "Outros", value: stats.outros, icon: "📋", gradient: "linear-gradient(135deg, #0891b2, #0e7490)" },
        ].map((card, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: 14, padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: card.gradient,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", flexShrink: 0,
            }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ FILTROS + BOTÃO ═══ */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "18px 24px", marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb",
        display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center",
      }}>
        <select value={turno} onChange={e => setTurno(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 160, cursor: "pointer", outline: "none" }}>
          <option value="">Todos os turnos</option>
          {turnos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 200, cursor: "pointer", outline: "none" }}>
          <option value="">Todas as turmas ({turmasFiltradas.length})</option>
          {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.turma || t.nome}</option>)}
        </select>

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", fontWeight: 600, minWidth: 200, cursor: "pointer", outline: "none" }}>
          <option value="">Todos os tipos</option>
          {TIPOS_JUSTIFICATIVA.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>

        <input type="text" placeholder="🔍 Buscar aluno..." value={filtroAluno}
          onChange={e => setFiltroAluno(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f8fafc", fontSize: "0.88rem", flex: 1, minWidth: 180, outline: "none" }} />

        {canRegister && (
          <button onClick={abrirModalNovo} style={{
            padding: "10px 22px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #0f766e, #059669)",
            color: "#fff", fontWeight: 700, fontSize: "0.88rem",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 2px 8px rgba(15,118,110,0.3)", transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
            <span style={{ fontSize: 18 }}>+</span> Registrar Justificativa
          </button>
        )}
      </div>


      {/* ═══ TABELA ═══ */}
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>

        {/* CSS responsivo embutido */}
        <style>{`
          .atst-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .atst-table th, .atst-table td { overflow: hidden; }
          .atst-col-aluno   { width: 17%; }
          .atst-col-turma   { width: 7%; }
          .atst-col-tipo    { width: 17%; }
          .atst-col-periodo { width: 15%; }
          .atst-col-dias    { width: 5%; }
          .atst-col-obs     { width: 8%; }
          .atst-col-reg     { width: 13%; }
          .atst-col-data    { width: 9%; }
          .atst-col-acoes   { width: 9%; min-width: 76px; }
          .atst-tipo-label  { display: inline; }

          @media (max-width: 900px) {
            .atst-col-reg   { display: none; }
            .atst-col-data  { display: none; }
            .atst-col-aluno { width: 26%; }
            .atst-col-tipo  { width: 21%; }
            .atst-col-obs   { width: 12%; }
            .atst-col-acoes { width: 10%; min-width: 76px; }
          }
          @media (max-width: 640px) {
            .atst-col-obs   { display: none; }
            .atst-col-dias  { display: none; }
            .atst-tipo-label { display: none; }
            .atst-col-aluno { width: 40%; }
            .atst-col-tipo  { width: 18%; }
            .atst-col-acoes { width: 14%; min-width: 72px; }
          }
        `}</style>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>Carregando...
          </div>
        ) : justificativasFiltradas.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📋</div>
            <p style={{ fontWeight: 600, fontSize: "1.05rem" }}>Nenhuma justificativa registrada</p>
            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {canRegister ? "Clique em \"Registrar Justificativa\" para adicionar" : "Aguardando registros da coordenação/direção"}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="atst-table">
              <colgroup>
                <col className="atst-col-aluno" />
                <col className="atst-col-turma" />
                <col className="atst-col-tipo" />
                <col className="atst-col-periodo" />
                <col className="atst-col-dias" />
                <col className="atst-col-obs" />
                <col className="atst-col-reg" />
                <col className="atst-col-data" />
                {canRegister && <col className="atst-col-acoes" />}
              </colgroup>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {[
                    { label: "Aluno",          cls: "atst-col-aluno"  },
                    { label: "Turma",          cls: "atst-col-turma"  },
                    { label: "Tipo",           cls: "atst-col-tipo"   },
                    { label: "Período",        cls: "atst-col-periodo"},
                    { label: "Dias",           cls: "atst-col-dias"   },
                    { label: "Observação",     cls: "atst-col-obs"    },
                    { label: "Registrado por", cls: "atst-col-reg"    },
                    { label: "Data Reg.",      cls: "atst-col-data"   },
                    ...(canRegister ? [{ label: "Ações", cls: "atst-col-acoes" }] : []),
                  ].map(h => (
                    <th key={h.label} className={h.cls} style={{
                      padding: "10px 10px", textAlign: h.label === "Ações" || h.label === "Dias" ? "center" : "left",
                      fontSize: "0.72rem", fontWeight: 700, color: "#475569",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {justificativasFiltradas.map((j, i) => {
                  const typeInfo = getTypeInfo(j.tipo);
                  return (
                    <tr key={j.id || i} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                      {/* Aluno */}
                      <td className="atst-col-aluno" style={{ padding: "12px 10px", fontWeight: 600, color: "#1e293b", fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.aluno_nome || "—"}
                      </td>

                      {/* Turma */}
                      <td className="atst-col-turma" style={{ padding: "12px 8px", color: "#64748b", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.turma_nome || "—"}
                      </td>

                      {/* Tipo — ícone sempre + label apenas no desktop */}
                      <td className="atst-col-tipo" style={{ padding: "12px 8px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: `${typeInfo?.cor || "#6b7280"}15`,
                          color: typeInfo?.cor || "#6b7280",
                          padding: "3px 8px", borderRadius: 7,
                          fontSize: "0.74rem", fontWeight: 700,
                          maxWidth: "100%", overflow: "hidden",
                        }}>
                          <span style={{ flexShrink: 0 }}>{typeInfo?.icon || "📋"}</span>
                          <span className="atst-tipo-label" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {typeInfo?.label || j.tipo}
                          </span>
                        </span>
                      </td>

                      {/* Período */}
                      <td className="atst-col-periodo" style={{ padding: "12px 8px", color: "#475569", fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {fmtDataBR(j.data_inicio)} → {fmtDataBR(j.data_fim)}
                      </td>

                      {/* Dias */}
                      <td className="atst-col-dias" style={{ padding: "12px 8px", textAlign: "center" }}>
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "2px 7px", borderRadius: 7, fontWeight: 700, fontSize: "0.78rem" }}>{j.dias || 1}</span>
                      </td>

                      {/* Observação — truncada */}
                      <td className="atst-col-obs" style={{ padding: "12px 8px", color: "#64748b", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.observacao || "—"}
                      </td>

                      {/* Registrado por — oculto no mobile */}
                      <td className="atst-col-reg" style={{ padding: "12px 8px", color: "#64748b", fontSize: "0.76rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.registrado_por_nome || "—"}
                      </td>

                      {/* Data */}
                      <td className="atst-col-data" style={{ padding: "12px 8px", color: "#94a3b8", fontSize: "0.76rem", whiteSpace: "nowrap" }}>
                        {fmtDataBR(j.criado_em)}
                      </td>

                      {/* Ações — icon-only com tooltip */}
                      {canRegister && (
                        <td className="atst-col-acoes" style={{ padding: "10px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            {/* Editar */}
                            <button
                              onClick={() => abrirModalEditar(j)}
                              title="Editar justificativa"
                              style={{
                                width: 30, height: 30, borderRadius: 7,
                                border: "1.5px solid #d1d5db",
                                background: "#fff", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.85rem", transition: "all 0.15s", flexShrink: 0,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#2563eb"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#d1d5db"; }}>
                              ✏️
                            </button>
                            {/* Excluir */}
                            <button
                              onClick={() => confirmarExclusao(j)}
                              disabled={excluindoId === j.id}
                              title="Excluir justificativa"
                              style={{
                                width: 30, height: 30, borderRadius: 7,
                                border: "1.5px solid #fecaca",
                                background: "#fff", cursor: excluindoId === j.id ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.85rem", transition: "all 0.15s", flexShrink: 0,
                                opacity: excluindoId === j.id ? 0.5 : 1,
                              }}
                              onMouseEnter={e => { if (excluindoId !== j.id) { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#dc2626"; } }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#fecaca"; }}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ═══ MODAL — Registrar / Editar ═══ */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 9999, padding: 20,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 620,
            maxHeight: "90vh", overflow: "auto",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            animation: "slideUp 0.3s ease",
          }}>
            {/* Header */}
            <div style={{
              background: editandoId
                ? "linear-gradient(135deg, #1e40af, #2563eb)"
                : "linear-gradient(135deg, #1e3a5f, #0f766e)",
              padding: "24px 28px", borderRadius: "20px 20px 0 0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(255,255,255,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>{editandoId ? "✏️" : "📋"}</div>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", margin: 0 }}>
                    {editandoId ? "Editar Justificativa" : "Registrar Justificativa"}
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", margin: 0, marginTop: 2 }}>
                    {editandoId ? "Atualize os dados do registro" : "Preencha os dados da justificativa de falta"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
                width: 36, height: 36, cursor: "pointer", color: "#fff",
                fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} style={{ padding: "28px" }}>

              {/* Erro / duplicata */}
              {erroModal && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 20,
                  background: erroModal.startsWith("⚠️") ? "#fffbeb" : "#fef2f2",
                  border: `1.5px solid ${erroModal.startsWith("⚠️") ? "#fde68a" : "#fecaca"}`,
                  color: erroModal.startsWith("⚠️") ? "#92400e" : "#991b1b",
                  fontSize: "0.85rem", fontWeight: 600,
                }}>{erroModal}</div>
              )}

              {/* Turma + Aluno — só no modo NOVO */}
              {!editandoId && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Turma *</label>
                    <select value={modalTurmaId}
                      onChange={e => { setModalTurmaId(e.target.value); setForm(f => ({ ...f, aluno_id: "" })); }}
                      required
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600, outline: "none" }}>
                      <option value="">Selecione...</option>
                      {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.turma || t.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Aluno *</label>
                    <select value={form.aluno_id}
                      onChange={e => setForm(f => ({ ...f, aluno_id: e.target.value }))}
                      required
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600, outline: "none" }}>
                      <option value="">Selecione a turma primeiro</option>
                      {modalAlunos.map(a => <option key={a.id} value={a.id}>{a.nome || a.estudante}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Tipo de Justificativa */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 10, display: "block" }}>Tipo de Justificativa *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                  {TIPOS_JUSTIFICATIVA.map(tipo => (
                    <button key={tipo.value} type="button"
                      onClick={() => { setForm(f => ({ ...f, tipo: tipo.value })); setErroModal(""); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 10,
                        border: form.tipo === tipo.value ? `2px solid ${tipo.cor}` : "1.5px solid #e5e7eb",
                        background: form.tipo === tipo.value ? `${tipo.cor}10` : "#fff",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                        transform: form.tipo === tipo.value ? "scale(1.02)" : "scale(1)",
                      }}>
                      <span style={{ fontSize: 18 }}>{tipo.icon}</span>
                      <span style={{ fontSize: "0.76rem", fontWeight: 600, color: form.tipo === tipo.value ? tipo.cor : "#374151", lineHeight: 1.3 }}>{tipo.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Período + Dias */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Data Início *</label>
                  <input type="date" value={form.data_inicio}
                    onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                    required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Data Fim *</label>
                  <input type="date" value={form.data_fim}
                    onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                    required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 600, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Dias</label>
                  <div style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid #dbeafe", background: "#eff6ff",
                    fontSize: "1rem", fontWeight: 800, color: "#1d4ed8", textAlign: "center",
                  }}>{form.dias}</div>
                </div>
              </div>

              {/* Observação */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" }}>Detalhes adicionais</label>
                <textarea value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Detalhes adicionais..." rows={3}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", fontSize: "0.88rem", fontWeight: 500, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              {/* Botões */}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: "10px 24px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#fff",
                  fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", color: "#6b7280",
                }}>Cancelar</button>
                <button type="submit" disabled={salvando} style={{
                  padding: "10px 28px", borderRadius: 10, border: "none",
                  background: salvando ? "#9ca3af" : editandoId
                    ? "linear-gradient(135deg, #1e40af, #2563eb)"
                    : "linear-gradient(135deg, #0f766e, #059669)",
                  color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                  cursor: salvando ? "not-allowed" : "pointer",
                  boxShadow: salvando ? "none" : "0 2px 8px rgba(5,150,105,0.3)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {salvando ? "⏳ Salvando..." : editandoId ? "💾 Salvar Alterações" : "✅ Registrar Justificativa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL — Confirmar Exclusão ═══ */}
      {confirmandoExclusao && itemParaExcluir && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 10000, padding: 20,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440,
            boxShadow: "0 25px 50px rgba(0,0,0,0.2)", overflow: "hidden",
            animation: "slideUp 0.3s ease",
          }}>
            {/* Header vermelho */}
            <div style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🗑️</div>
              <div>
                <h3 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: 0 }}>Confirmar Exclusão</h3>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", margin: 0, marginTop: 2 }}>Essa ação não pode ser desfeita</p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "24px 28px" }}>
              <p style={{ color: "#374151", fontSize: "0.95rem", margin: "0 0 8px", fontWeight: 600 }}>
                Deseja excluir a justificativa abaixo?
              </p>
              <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginTop: 12 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: "0.88rem" }}>{itemParaExcluir.aluno_nome}</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#6b7280" }}>
                  {getTypeInfo(itemParaExcluir.tipo)?.label || itemParaExcluir.tipo} &nbsp;·&nbsp;
                  {fmtDataBR(itemParaExcluir.data_inicio)}
                  {" → "}
                  {fmtDataBR(itemParaExcluir.data_fim)}
                  &nbsp;·&nbsp; {itemParaExcluir.dias || 1} dia(s)
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button onClick={() => { setConfirmandoExclusao(false); setItemParaExcluir(null); }} style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #d1d5db",
                  background: "#fff", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", color: "#6b7280",
                }}>Cancelar</button>
                <button onClick={executarExclusao} disabled={!!excluindoId} style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "none",
                  background: excluindoId ? "#9ca3af" : "linear-gradient(135deg, #dc2626, #b91c1c)",
                  color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                  cursor: excluindoId ? "not-allowed" : "pointer",
                  boxShadow: excluindoId ? "none" : "0 2px 8px rgba(220,38,38,0.35)",
                }}>
                  {excluindoId ? "⏳ Excluindo..." : "🗑️ Confirmar Exclusão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
