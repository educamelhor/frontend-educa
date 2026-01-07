// src/features/secretaria/modulacao/DiagnosticoInsumos.jsx
// ============================================================================
// Diagnóstico de Insumos (Horários)
// - Consolida DEMANDA x OFERTA por Turno e por Disciplina
// - Badges de totais: Déficit (somatório dos gaps negativos) e Sobra (gaps positivos)
// - Atalho "Ir para Cargas Horárias" quando houver déficit
// - Mantém exportações CSV e impressão
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

// Normaliza texto para filtros
function normalize(str = "") {
  return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// CSV export helper
function exportToCSV(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      headers
        .map((h) => `"${String(r[h] ?? "").replace(/\r?\n/g, " ").replace(/;/g, ",")}"`)
        .join(";")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DiagnosticoInsumos({ turnoInicial = "" }) {
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────
  // Estados
  // ─────────────────────────────────────────────────────────────
  const [turnos, setTurnos] = useState([]);
  const [turno, setTurno] = useState(turnoInicial || "");
  const [carregandoTurnos, setCarregandoTurnos] = useState(false);
  const [erroTurnos, setErroTurnos] = useState("");

  const [resumo, setResumo] = useState([]);
  const [detalhe, setDetalhe] = useState([]);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [erroDiag, setErroDiag] = useState("");

  const [filtro, setFiltro] = useState("");
  const [somenteComGap, setSomenteComGap] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Carregar TURNOS
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadTurnos() {
      setCarregandoTurnos(true);
      setErroTurnos("");
      try {
        const { data } = await api.get("/api/turnos");
        setTurnos(Array.isArray(data) ? data : []);
      } catch {
        setErroTurnos("Não foi possível carregar os turnos.");
      } finally {
        setCarregandoTurnos(false);
      }
    }
    loadTurnos();
  }, []);

  useEffect(() => {
    if (turno) carregarDiagnostico(turno);
  }, [turno]);

  // ─────────────────────────────────────────────────────────────
  // Buscar Diagnóstico
  // ─────────────────────────────────────────────────────────────
  async function carregarDiagnostico(turnoSelecionado) {
    try {
      setLoadingDiag(true);
      setErroDiag("");
      const { data } = await api.get("/api/modulacao/diagnostico", {
        params: { turno: turnoSelecionado },
      });
      setResumo(Array.isArray(data?.resumo_por_disciplina) ? data.resumo_por_disciplina : []);
      setDetalhe(Array.isArray(data?.detalhe_por_turma) ? data.detalhe_por_turma : []);
    } catch {
      setErroDiag("Não foi possível carregar o diagnóstico para este turno.");
      setResumo([]);
      setDetalhe([]);
    } finally {
      setLoadingDiag(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Métricas (totais do TURNO: não dependem do filtro)
  // ─────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const items = Array.isArray(resumo) ? resumo : [];
    let deficitTotal = 0; // soma dos gaps negativos, em valor positivo
    let sobraTotal = 0;   // soma dos gaps positivos
    let countDeficit = 0;
    let countSobra = 0;

    for (const r of items) {
      const g = Number(r.gap) || 0;
      if (g < 0) {
        deficitTotal += -g;
        countDeficit++;
      } else if (g > 0) {
        sobraTotal += g;
        countSobra++;
      }
    }
    return {
      deficitTotal,
      sobraTotal,
      countDeficit,
      countSobra,
      hasDeficit: deficitTotal > 0,
    };
  }, [resumo]);

  // ─────────────────────────────────────────────────────────────
  // Tabela filtrada (para exibição)
  // ─────────────────────────────────────────────────────────────
  const tabelaFiltrada = useMemo(() => {
    let lista = Array.isArray(resumo) ? [...resumo] : [];
    const f = normalize(filtro);
    if (f) lista = lista.filter((r) => normalize(r.disciplina_nome).includes(f));
    if (somenteComGap) lista = lista.filter((r) => Number(r.gap) !== 0);
    lista.sort((a, b) => a.gap - b.gap);
    return lista;
  }, [resumo, filtro, somenteComGap]);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────
  function irParaCargas() {
    // abre a tela de Cargas Horárias (menu Secretaria)
    navigate("/secretaria/cargas-horarias");
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1100px] mx-auto p-4 md:p-6">
      {/* Título */}
      <h1
        className="text-3xl font-bold text-center text-blue-900 mb-6"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Diagnóstico de Insumos (Horários)
      </h1>

      {/* Seletor de Turno + Badges de totais + Atalho */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col gap-4">
          {/* Linha 1: Turno + estado de carregamento */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-blue-900">Turno:</label>
              <select
                className="border rounded px-3 py-2"
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
              >
                <option value="">Selecione…</option>
                {turnos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-gray-600">
              {carregandoTurnos ? "Carregando turnos…" : erroTurnos ? (
                <span className="text-red-600">{erroTurnos}</span>
              ) : null}
            </div>
          </div>

          {/* Linha 2: Badges + Atalho */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200"
                title="Somatório dos gaps negativos (aulas que faltam)"
              >
                Déficit total: {metrics.deficitTotal}
                {metrics.countDeficit > 0 ? ` (em ${metrics.countDeficit} disc.)` : ""}
              </span>
              <span
                className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200"
                title="Somatório dos gaps positivos (aulas de sobra)"
              >
                Sobra total: {metrics.sobraTotal}
                {metrics.countSobra > 0 ? ` (em ${metrics.countSobra} disc.)` : ""}
              </span>
            </div>

            <div className="flex gap-2">
              {metrics.hasDeficit && (
                <button
                  onClick={irParaCargas}
                  className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                  title="Abrir Cargas Horárias para ajustar a demanda"
                >
                  Ir para Cargas Horárias
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filtros da Tabela */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="🔍 Filtrar por disciplina"
            className="border rounded px-3 py-2 w-full md:w-80"
          />
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={somenteComGap}
              onChange={(e) => setSomenteComGap(e.target.checked)}
            />
            Mostrar apenas com déficit/sobra (gap ≠ 0)
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => tabelaFiltrada.length && exportToCSV(`diagnostico_${turno}_resumo.csv`, tabelaFiltrada)}
              disabled={!tabelaFiltrada.length}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              title="Exportar CSV (Resumo)"
            >
              Exportar Resumo (CSV)
            </button>
            <button
              onClick={() => detalhe.length && exportToCSV(`diagnostico_${turno}_detalhe_turmas.csv`, detalhe)}
              disabled={!detalhe.length}
              className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              title="Exportar CSV (Detalhe por Turma)"
            >
              Exportar Detalhe (CSV)
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
              title="Imprimir / Salvar em PDF"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Estado de carregamento/erro */}
      {loadingDiag && <p className="text-gray-600">Carregando diagnóstico…</p>}
      {erroDiag && <p className="text-red-600">{erroDiag}</p>}

      {/* Tabela Resumo por Disciplina */}
      {tabelaFiltrada.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 overflow-x-auto">
          <h2 className="text-2xl font-semibold text-blue-800 mb-4">Resumo por Disciplina — {turno}</h2>
          <table className="w-full border-collapse">
            <thead className="bg-blue-100">
              <tr>
                <th className="p-2 border text-center">Disciplina</th>
                <th className="p-2 border text-center">Demanda (carga necessária)</th>
                <th className="p-2 border text-center">Oferta (aulas ofertadas)</th>
                <th className="p-2 border text-center">Professores ativos</th>
                <th className="p-2 border text-center">GAP (oferta - demanda)</th>
                <th className="p-2 border text-center">Situação</th>
              </tr>
            </thead>
            <tbody>
              {tabelaFiltrada.map((r) => {
                const gap = Number(r.gap) || 0;
                const classe =
                  gap < 0 ? "bg-red-50 text-red-700"
                  : gap > 0 ? "bg-green-50 text-green-700"
                  : "text-blue-900";
                return (
                  <tr key={r.disciplina_id} className="hover:bg-blue-50">
                    <td className="p-2 border text-center font-semibold">{r.disciplina_nome}</td>
                    <td className="p-2 border text-center">{r.carga_necessaria}</td>
                    <td className="p-2 border text-center">{r.aulas_ofertadas}</td>
                    <td className="p-2 border text-center">{r.professores_ativos}</td>
                    <td className={`p-2 border text-center font-semibold ${classe}`}>{gap}</td>
                    <td className={`p-2 border text-center font-semibold ${classe}`}>{r.situacao}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detalhamento (por Turma) */}
      {detalhe.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Detalhe por Turma — {turno}</h2>
          <table className="w-full border-collapse">
            <thead className="bg-blue-100">
              <tr>
                <th className="p-2 border text-center">Turma</th>
                <th className="p-2 border text-center">Disciplina</th>
                <th className="p-2 border text-center">Carga</th>
              </tr>
            </thead>
            <tbody>
              {detalhe.map((d, idx) => (
                <tr key={`${d.turma_id}-${d.disciplina_id}-${idx}`} className="hover:bg-blue-50">
                  <td className="p-2 border text-center">{d.turma_nome}</td>
                  <td className="p-2 border text-center">{d.disciplina_nome}</td>
                  <td className="p-2 border text-center">{d.carga}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Estado vazio */}
      {turno && !loadingDiag && !erroDiag && tabelaFiltrada.length === 0 && (
        <div className="p-4 bg-gray-50 border rounded text-gray-600">
          Nenhum dado para exibir neste turno. Verifique se as turmas têm disciplinas definidas em
          <strong> Cargas Horárias</strong> e se há professores ativos com <em>turno</em>, <em>disciplina</em> e <em>aulas</em>.
        </div>
      )}
    </div>
  );
}
