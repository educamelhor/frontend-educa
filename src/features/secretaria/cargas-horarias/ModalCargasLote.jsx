// src/features/secretaria/cargas-horarias/ModalCargasLote.jsx
// ============================================================================
// Modal — Cadastrar Cargas em Lote
// ---------------------------------------------------------------------------
// Fluxo de 2 etapas:
//   Etapa 1 — Selecionar turmas (checkboxes, filtradas por turno + ano)
//   Etapa 2 — Configurar disciplinas (mesmo conjunto para todas as turmas)
// Ao salvar: POST /api/cargas-horarias/definir-lote
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";

const asId = (v) => (v == null ? "" : String(v));

function getCarga(d) {
  if (!d) return 0;
  return Number(d.carga) || Number(d.carga_horaria) || Number(d.aulas) || 0;
}

export default function ModalCargasLote({ turno, turmas, onClose, onSaved }) {
  // ── Etapa ────────────────────────────────────────────────────────────────
  const [etapa, setEtapa] = useState(1); // 1 = selecionar turmas | 2 = disciplinas

  // ── Etapa 1: seleção de turmas ───────────────────────────────────────────
  const [turmasSelecionadas, setTurmasSelecionadas] = useState(new Set());

  const toggleTurma = (id) =>
    setTurmasSelecionadas((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleTodos = () => {
    if (turmasSelecionadas.size === turmas.length) {
      setTurmasSelecionadas(new Set());
    } else {
      setTurmasSelecionadas(new Set(turmas.map((t) => t.id)));
    }
  };

  const todasMarcadas = turmas.length > 0 && turmasSelecionadas.size === turmas.length;

  // ── Etapa 2: seleção de disciplinas ──────────────────────────────────────
  const [qtd, setQtd] = useState(1);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loadingDiscs, setLoadingDiscs] = useState(false);
  const [erroDiscs, setErroDiscs] = useState("");
  const [selecionadas, setSelecionadas] = useState([]);
  const [cargaPorId, setCargaPorId] = useState({});
  const [saving, setSaving] = useState(false);

  const escola_id = useMemo(() => localStorage.getItem("escola_id") || 1, []);

  // Carrega disciplinas ao entrar na etapa 2
  useEffect(() => {
    if (etapa !== 2) return;
    async function load() {
      setLoadingDiscs(true);
      setErroDiscs("");
      try {
        const { data } = await api.get("/api/disciplinas", {
          params: { escola_id, turno },
        });
        const arr = Array.isArray(data) ? data : [];
        const norm = arr.map((d, i) => ({
          id: asId(d.id ?? `disc-${i}`),
          nome: d.nome ?? d.disciplina ?? `Disciplina ${i + 1}`,
          ...d,
        }));
        setDisciplinas(norm);
        const cache = {};
        norm.forEach((d) => { cache[asId(d.id)] = getCarga(d); });
        setCargaPorId(cache);
        setSelecionadas([]);
      } catch {
        setErroDiscs("Não foi possível carregar as disciplinas.");
      } finally {
        setLoadingDiscs(false);
      }
    }
    load();
  }, [etapa, turno, escola_id]);

  const linhas = useMemo(() => {
    const n = Math.max(0, Math.min(30, Number(qtd) || 0));
    return Array.from({ length: n }, (_, i) => i);
  }, [qtd]);

  const escolhidasSet = useMemo(
    () => new Set(selecionadas.map(asId).filter(Boolean)),
    [selecionadas]
  );

  const totalCarga = useMemo(
    () => selecionadas.reduce((acc, id) => acc + (cargaPorId[asId(id)] || 0), 0),
    [selecionadas, cargaPorId]
  );

  const podeProsseguir = useMemo(() => {
    const n = Number(qtd) || 0;
    if (n === 0) return false;
    return Array.from({ length: n }).every((_, i) => !!selecionadas[i]);
  }, [qtd, selecionadas]);

  function handleSelect(idx, idDisc) {
    setSelecionadas((prev) => {
      const arr = [...prev];
      arr[idx] = asId(idDisc) || "";
      return arr;
    });
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  async function handleSalvar() {
    try {
      setSaving(true);
      const turma_ids = Array.from(turmasSelecionadas);
      const itens = selecionadas.filter(Boolean);
      const { data } = await api.post("/api/cargas-horarias/definir-lote", {
        escola_id,
        turma_ids,
        itens,
      });
      alert(`✅ ${data.message ?? "Cargas salvas com sucesso!"}`);
      onSaved?.();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || "Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto p-5 box-border">

      {/* Cabeçalho */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 font-medium mb-1">
          Turno: <span className="text-blue-700 font-semibold">{turno}</span>
        </p>
        <h2 className="text-xl font-bold text-blue-900">
          Cadastrar Cargas em Lote
        </h2>
        {/* Indicador de etapas */}
        <div className="flex items-center gap-2 mt-3">
          {[1, 2].map((n) => (
            <React.Fragment key={n}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  etapa === n
                    ? "bg-blue-700 text-white"
                    : etapa > n
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {etapa > n ? "✓" : n}
              </div>
              <span className={`text-xs font-medium ${etapa === n ? "text-blue-700" : "text-gray-400"}`}>
                {n === 1 ? "Selecionar turmas" : "Definir disciplinas"}
              </span>
              {n < 2 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── ETAPA 1: selecionar turmas ─────────────────────────────────────── */}
      {etapa === 1 && (
        <>
          {turmas.length === 0 ? (
            <p className="text-gray-500 text-sm p-3 bg-gray-50 rounded border">
              Nenhuma turma disponível para este turno/ano.
            </p>
          ) : (
            <>
              {/* Selecionar todas */}
              <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={todasMarcadas}
                  onChange={toggleTodos}
                  className="w-4 h-4 accent-blue-700"
                />
                <span className="text-sm font-semibold text-blue-800">
                  {todasMarcadas ? "Desmarcar todas" : "Selecionar todas"}
                  <span className="ml-2 text-gray-400 font-normal">
                    ({turmasSelecionadas.size}/{turmas.length})
                  </span>
                </span>
              </label>

              {/* Grade de turmas */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
                {turmas.map((t) => {
                  const marcada = turmasSelecionadas.has(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 cursor-pointer transition-all select-none ${
                        marcada
                          ? "bg-blue-700 border-blue-700 text-white shadow-md"
                          : "bg-white border-blue-200 text-blue-900 hover:border-blue-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => toggleTurma(t.id)}
                        className="sr-only"
                      />
                      <span className="font-bold text-sm leading-tight text-center">
                        {t.turma}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-between mt-5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => setEtapa(2)}
              disabled={turmasSelecionadas.size === 0}
              className={`px-5 py-2 rounded text-white text-sm font-semibold transition ${
                turmasSelecionadas.size > 0
                  ? "bg-blue-700 hover:bg-blue-800"
                  : "bg-blue-300 cursor-not-allowed"
              }`}
            >
              Próximo →
            </button>
          </div>
        </>
      )}

      {/* ── ETAPA 2: disciplinas ──────────────────────────────────────────── */}
      {etapa === 2 && (
        <>
          {/* Resumo das turmas selecionadas */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <strong>{turmasSelecionadas.size} turma(s) selecionada(s):</strong>{" "}
            {turmas
              .filter((t) => turmasSelecionadas.has(t.id))
              .map((t) => t.turma)
              .join(", ")}
          </div>

          {/* Quantidade de disciplinas */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Quantas disciplinas?
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              className="border rounded p-2 w-28"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Esse conjunto será aplicado a <strong>todas</strong> as turmas selecionadas.
            </p>
          </div>

          {/* Seleção de disciplinas */}
          {loadingDiscs ? (
            <div className="p-3 bg-gray-50 border rounded text-sm text-gray-500">
              Carregando disciplinas…
            </div>
          ) : erroDiscs ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {erroDiscs}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {linhas.map((i) => {
                const valor = asId(selecionadas[i] || "");
                return (
                  <div
                    key={i}
                    className="grid grid-cols-5 gap-2 items-center"
                  >
                    <div className="col-span-2 text-sm text-gray-600 font-medium">
                      Disciplina {i + 1}
                    </div>
                    <div className="col-span-3">
                      <select
                        value={valor}
                        onChange={(e) => handleSelect(i, e.target.value)}
                        className="border rounded p-2 w-full text-sm"
                      >
                        <option value="">— selecione —</option>
                        {disciplinas.map((d) => {
                          const idStr = asId(d.id);
                          const outra = escolhidasSet.has(idStr) && valor !== idStr;
                          return (
                            <option key={idStr} value={idStr} disabled={outra}>
                              {d.nome}
                              {getCarga(d) ? ` • ${getCarga(d)}h` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                );
              })}
              {linhas.length === 0 && (
                <div className="p-3 bg-gray-50 border rounded text-sm text-gray-500">
                  Informe a quantidade de disciplinas acima.
                </div>
              )}
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold text-blue-900">Total por turma:</span>{" "}
              <span className="font-bold text-blue-700">{totalCarga}h</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEtapa(1)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                ← Voltar
              </button>
              <button
                disabled={!podeProsseguir || saving}
                onClick={handleSalvar}
                className={`px-5 py-2 rounded text-white text-sm font-semibold transition ${
                  podeProsseguir && !saving
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-300 cursor-not-allowed"
                }`}
              >
                {saving
                  ? "Salvando…"
                  : `Salvar para ${turmasSelecionadas.size} turma(s)`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
