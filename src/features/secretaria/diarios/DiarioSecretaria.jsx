// features/secretaria/diarios/DiarioSecretaria.jsx
// ============================================================================
// Tela principal — SECRETARIA → Diários
//
// Permite visualizar (somente leitura) o diário de qualquer professor,
// filtrando por Ano Letivo, Bimestre, Turno e Turma.
// Ao clicar em 👁️ Visualizar, abre o ModalDiarioSecretaria.
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import ModalDiarioSecretaria from "./ModalDiarioSecretaria";
import {
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  LockClosedIcon,
  LockOpenIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

// ── Ano letivo padrão (mesmo critério do sistema) ────────────────────────────
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes  = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// ── Normalizar bimestre para exibição ────────────────────────────────────────
function labelBimestre(raw) {
  if (!raw) return "—";
  const match = String(raw).match(/\d/);
  return match ? `${match[0]}º Bimestre` : raw;
}

// ── Pill de Status do Plano ──────────────────────────────────────────────────
function PillStatus({ status }) {
  const styles = {
    APROVADO:   { bg: "rgba(16,185,129,0.15)", text: "#6ee7b7", border: "rgba(16,185,129,0.3)" },
    ENVIADO:    { bg: "rgba(59,130,246,0.15)", text: "#93c5fd", border: "rgba(59,130,246,0.3)" },
    RASCUNHO:   { bg: "rgba(148,163,184,0.15)", text: "#cbd5e1", border: "rgba(148,163,184,0.3)" },
    PENDENTE:   { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
    REPROVADO:  { bg: "rgba(239,68,68,0.15)",  text: "#fca5a5", border: "rgba(239,68,68,0.3)" },
  };
  const s = styles[status] || styles.RASCUNHO;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {status || "—"}
    </span>
  );
}

export default function DiarioSecretaria() {
  // ── Filtros ───────────────────────────────────────────────────────────────
  const [anosLetivos,      setAnosLetivos]      = useState([anoLetivoPadrao()]);
  const [filtroAno,        setFiltroAno]        = useState(anoLetivoPadrao());
  const [filtroBimestre,   setFiltroBimestre]   = useState("todos");
  const [filtroTurno,      setFiltroTurno]      = useState("todos");
  const [filtroTurma,      setFiltroTurma]      = useState("todas");
  const [filtroSemestre,   setFiltroSemestre]   = useState("todos"); // 'todos', '1' ou '2'
  const [turmas,           setTurmas]           = useState([]);
  const [buscaProfessor,   setBuscaProfessor]   = useState("");

  // ── Dados ─────────────────────────────────────────────────────────────────
  const [diarios,          setDiarios]          = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [erro,             setErro]             = useState(null);

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [modalPlano,       setModalPlano]       = useState(null);

  // ── Carregar anos letivos e turmas no boot ────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [resAnos, resTurmas] = await Promise.all([
          api.get("/api/secretaria/relatorios/anos-letivos").catch(() => ({ data: [anoLetivoPadrao()] })),
          api.get("/api/turmas"),
        ]);
        if (Array.isArray(resAnos.data) && resAnos.data.length > 0) {
          setAnosLetivos(resAnos.data);
        }
        setTurmas(Array.isArray(resTurmas.data) ? resTurmas.data : []);
      } catch {
        // silencioso — turmas ficam vazias
      }
    }
    init();
  }, []);

  // ── Turmas filtradas por ano + turno ──────────────────────────────────────
  const turmasFiltradas = useMemo(() =>
    turmas.filter((t) => {
      const anoOk   = Number(t.ano) === filtroAno;
      const turnoOk = filtroTurno === "todos" || t.turno?.toLowerCase() === filtroTurno;
      return anoOk && turnoOk;
    }),
    [turmas, filtroAno, filtroTurno]
  );

  // ── Buscar diários ─────────────────────────────────────────────────────────
  async function fetchDiarios() {
    setLoading(true);
    setErro(null);
    try {
      const params = { ano_letivo: filtroAno };
      if (filtroBimestre !== "todos") params.bimestre = filtroBimestre;
      if (filtroTurno    !== "todos") params.turno    = filtroTurno;
      if (filtroTurma    !== "todas") params.turma_id = filtroTurma;
      if (filtroSemestre !== "todos") params.semestre = Number(filtroSemestre);

      const res = await api.get("/api/secretaria/relatorios/diarios", { params });
      setDiarios(Array.isArray(res.data?.diarios) ? res.data.diarios : []);
    } catch (err) {
      console.error("[DiarioSecretaria] fetchDiarios:", err);
      setErro("Não foi possível carregar os diários. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  // Busca automática quando filtros mudam (exceto busca textual)
  useEffect(() => {
    fetchDiarios();
    // eslint-disable-next-line
  }, [filtroAno, filtroBimestre, filtroTurno, filtroTurma, filtroSemestre]);

  // ── Filtro local por professor ────────────────────────────────────────────
  const diariosFiltrados = useMemo(() => {
    if (!buscaProfessor.trim()) return diarios;
    const q = buscaProfessor.toLowerCase();
    return diarios.filter(
      (d) =>
        d.professor_nome?.toLowerCase().includes(q) ||
        d.disciplina_nome?.toLowerCase().includes(q) ||
        d.turma_nome?.toLowerCase().includes(q)
    );
  }, [diarios, buscaProfessor]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ── Cabeçalho ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardDocumentListIcon className="h-7 w-7 text-blue-600" />
          Diários
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualização administrativa dos diários de avaliação por professor e disciplina.
        </p>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────── */}
      <section
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6"
      >
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-600">
          <FunnelIcon className="h-4 w-4" /> Filtros
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Ano Letivo */}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">📅 Ano Letivo</label>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            >
              {anosLetivos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Bimestre */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">📋 Bimestre</label>
            <select
              value={filtroBimestre}
              onChange={(e) => setFiltroBimestre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            >
              <option value="todos">Todos</option>
              {[1, 2, 3, 4].map((b) => (
                <option key={b} value={b}>{b}º Bimestre</option>
              ))}
            </select>
          </div>

          {/* Turno */}
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">🕐 Turno</label>
            <select
              value={filtroTurno}
              onChange={(e) => { setFiltroTurno(e.target.value); setFiltroTurma("todas"); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            >
              <option value="todos">Todos</option>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
            </select>
          </div>

          {/* Turma */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">🏫 Turma</label>
            <select
              value={filtroTurma}
              onChange={(e) => { setFiltroTurma(e.target.value); setFiltroSemestre("todos"); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            >
              <option value="todas">Todas</option>
              {turmasFiltradas.map((t) => (
                <option key={t.id} value={t.id}>{t.turma} ({t.turno})</option>
              ))}
            </select>
          </div>

          {/* Semestre — aparece se a turma selecionada for semestral */}
          {(() => {
            const turmaSel = turmas.find(t => String(t.id) === String(filtroTurma));
            if (!turmaSel || turmaSel.regime !== 'semestral') return null;
            return (
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-semibold text-blue-600 mb-1.5">📅 Semestre</label>
                <select
                  value={filtroSemestre}
                  onChange={(e) => setFiltroSemestre(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition font-semibold text-blue-800"
                >
                  <option value="todos">Todos</option>
                  <option value="1">1º Semestre</option>
                  <option value="2">2º Semestre</option>
                </select>
              </div>
            );
          })()}

          {/* Atualizar */}
          <button
            onClick={fetchDiarios}
            className="px-4 py-2 border rounded-xl hover:bg-gray-50 transition shadow-sm text-sm font-semibold flex items-center gap-2 h-[38px] text-gray-700 bg-white"
            title="Recarregar"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {/* Busca textual */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="🔍 Pesquisar por professor, disciplina ou turma..."
            value={buscaProfessor}
            onChange={(e) => setBuscaProfessor(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
      </section>

      {/* ── Tabela de Diários ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div
          className="grid text-xs font-bold uppercase tracking-wider text-white px-4 py-3"
          style={{
            background: "linear-gradient(90deg, #1e3a5f 0%, #0f172a 100%)",
            gridTemplateColumns: "1fr 1fr 1fr 110px 110px 100px",
            gap: "8px",
          }}
        >
          <span>Professor</span>
          <span>Disciplina</span>
          <span>Turma / Turno</span>
          <span className="text-center">Bimestre</span>
          <span className="text-center">Status Plano</span>
          <span className="text-center">Ações</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-gray-500 text-sm">Carregando diários...</p>
          </div>
        )}

        {/* Erro */}
        {erro && !loading && (
          <div className="flex items-center gap-3 px-6 py-4 text-sm text-red-700 bg-red-50">
            ⚠️ {erro}
          </div>
        )}

        {/* Vazio */}
        {!loading && !erro && diariosFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <ClipboardDocumentListIcon className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500 text-sm font-medium">Nenhum diário encontrado para os filtros selecionados.</p>
            <p className="text-gray-400 text-xs">Ajuste os filtros acima e clique em Atualizar.</p>
          </div>
        )}

        {/* Linhas */}
        {!loading && !erro && diariosFiltrados.map((d, i) => (
          <div
            key={`${d.plano_id}_${i}`}
            className="grid items-center px-4 py-3 hover:bg-blue-50/30 transition-colors"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr 110px 110px 100px",
              gap: "8px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            {/* Professor */}
            <div>
              <p className="font-semibold text-sm text-gray-800 leading-tight">{d.professor_nome}</p>
            </div>

            {/* Disciplina */}
            <div>
              <span className="text-sm text-gray-700">{d.disciplina_nome}</span>
            </div>

            {/* Turma / Turno */}
            <div>
              <p className="text-sm text-gray-700 font-medium">{d.turma_nome}</p>
              <p className="text-xs text-gray-400">{d.turno}</p>
            </div>

            {/* Bimestre */}
            <div className="text-center">
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                {labelBimestre(d.bimestre)}
              </span>
            </div>

            {/* Status Plano */}
            <div className="text-center">
              <PillStatus status={d.plano_status} />
            </div>

            {/* Ações */}
            <div className="flex items-center justify-center gap-2">
              {/* Indicador Diário */}
              <span title={d.diario_fechado ? "Diário Fechado" : "Diário Aberto"}>
                {d.diario_fechado
                  ? <LockClosedIcon className="h-4 w-4 text-red-400" />
                  : <LockOpenIcon className="h-4 w-4 text-emerald-500" />
                }
              </span>

              {/* Visualizar */}
              <button
                onClick={() => setModalPlano(d)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #2563eb, #0891b2)" }}
                title="Visualizar Diário"
              >
                <EyeIcon className="h-3.5 w-3.5" />
                Ver
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Resumo ───────────────────────────────────────────────────── */}
      {!loading && !erro && diariosFiltrados.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          {diariosFiltrados.length} registro{diariosFiltrados.length !== 1 ? "s" : ""} encontrado{diariosFiltrados.length !== 1 ? "s" : ""}.
        </p>
      )}

      {/* ── Modal ────────────────────────────────────────────────────── */}
      {modalPlano && (
        <ModalDiarioSecretaria
          plano={modalPlano}
          onClose={() => setModalPlano(null)}
        />
      )}
    </div>
  );
}
