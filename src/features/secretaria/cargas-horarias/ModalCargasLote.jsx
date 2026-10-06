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
  // Cada item: { disciplina_id: string, carga: number | string }
  const [selecionadas, setSelecionadas] = useState([]);
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
          params: { 
            escola_id, 
            turno,
            modo_oferta: 'TURMA',
            apenas_regulares: true,
          },
        });
        const arr = Array.isArray(data) ? data : [];
        const norm = arr.map((d, i) => ({
          id: asId(d.id ?? `disc-${i}`),
          nome: d.nome ?? d.disciplina ?? `Disciplina ${i + 1}`,
          ...d,
        }));
        setDisciplinas(norm);
        setSelecionadas([{ disciplina_id: "", carga: 2 }]);
      } catch {
        setErroDiscs("Não foi possível carregar as disciplinas.");
      } finally {
        setLoadingDiscs(false);
      }
    }
    load();
  }, [etapa, turno, escola_id]);

  const handleQtdChange = (novaQtd) => {
    const n = Math.max(0, Math.min(35, Number(novaQtd) || 0));
    setQtd(novaQtd);
    setSelecionadas((prev) => {
      const arr = [...prev];
      if (n > arr.length) {
        for (let i = arr.length; i < n; i++) {
          arr.push({ disciplina_id: "", carga: 2 });
        }
      } else if (n < arr.length) {
        arr.splice(n);
      }
      return arr;
    });
  };

  const linhas = useMemo(() => {
    const n = Math.max(0, Math.min(35, Number(qtd) || 0));
    return Array.from({ length: n }, (_, i) => i);
  }, [qtd]);

  const escolhidasSet = useMemo(
    () => new Set(selecionadas.map((it) => asId(it?.disciplina_id)).filter(Boolean)),
    [selecionadas]
  );

  const totalCarga = useMemo(() => {
    return linhas.reduce((acc, i) => {
      const it = selecionadas[i];
      if (!it?.disciplina_id) return acc;
      return acc + (Number(it.carga) || 0);
    }, 0);
  }, [linhas, selecionadas]);

  const podeProsseguir = useMemo(() => {
    const n = Number(qtd) || 0;
    if (n === 0) return false;
    return linhas.every((i) => {
      const it = selecionadas[i];
      return Boolean(it?.disciplina_id && Number(it?.carga) > 0);
    });
  }, [linhas, selecionadas, qtd]);

  function handleSelect(idx, idDisc) {
    const idStr = asId(idDisc);
    setSelecionadas((prev) => {
      const arr = [...prev];
      const atual = arr[idx] || { disciplina_id: "", carga: 2 };
      arr[idx] = { ...atual, disciplina_id: idStr || "" };
      return arr;
    });
  }

  function handleCargaChange(idx, valorCarga) {
    const val = valorCarga === "" ? "" : Math.max(1, Math.min(30, Number(valorCarga) || 1));
    setSelecionadas((prev) => {
      const arr = [...prev];
      const atual = arr[idx] || { disciplina_id: "", carga: 2 };
      arr[idx] = { ...atual, carga: val };
      return arr;
    });
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  async function handleSalvar() {
    try {
      setSaving(true);
      const turma_ids = Array.from(turmasSelecionadas);
      const itens = linhas
        .map((i) => selecionadas[i])
        .filter((it) => it && it.disciplina_id)
        .map((it) => ({
          disciplina_id: Number(it.disciplina_id),
          carga: Number(it.carga) || 1,
        }));

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
          <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Quantas disciplinas por turma?
              </label>
              <p className="text-[11px] text-slate-500">
                Esse conjunto será aplicado a <strong>todas</strong> as turmas selecionadas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={35}
                value={qtd}
                onChange={(e) => handleQtdChange(e.target.value)}
                className="border border-slate-300 rounded-lg p-1.5 w-16 text-center text-sm font-bold bg-white"
              />
              <span className="text-xs font-bold text-slate-600 uppercase">disc.</span>
            </div>
          </div>

          {/* Seleção de disciplinas */}
          {loadingDiscs ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              Carregando disciplinas…
            </div>
          ) : erroDiscs ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {erroDiscs}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {linhas.map((i) => {
                const item = selecionadas[i] || { disciplina_id: "", carga: 2 };
                const valorId = asId(item.disciplina_id);

                return (
                  <div
                    key={i}
                    className="p-2 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                  >
                    <div className="sm:w-24 flex-shrink-0 text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      <span>Disc. {i + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <select
                        value={valorId}
                        onChange={(e) => handleSelect(i, e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 w-full text-xs font-medium text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      >
                        <option value="">— selecione a disciplina —</option>
                        {disciplinas.map((d) => {
                          const idStr = asId(d.id);
                          const outra = escolhidasSet.has(idStr) && valorId !== idStr;
                          return (
                            <option key={idStr} value={idStr} disabled={outra}>
                              {d.nome}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 justify-end sm:justify-start flex-shrink-0">
                      <label className="text-xs text-slate-500 font-bold sm:hidden">Carga:</label>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={item.carga ?? ""}
                        onChange={(e) => handleCargaChange(i, e.target.value)}
                        placeholder="2"
                        className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center text-blue-900 bg-blue-50/40 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-xs font-semibold text-slate-500">aulas</span>
                    </div>
                  </div>
                );
              })}
              {linhas.length === 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  Informe a quantidade de disciplinas acima.
                </div>
              )}
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className="text-slate-500 uppercase">Total por turma:</span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200">
                {totalCarga} {totalCarga === 1 ? "aula" : "aulas"}
              </span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEtapa(1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                ← Voltar
              </button>
              <button
                type="button"
                disabled={!podeProsseguir || saving}
                onClick={handleSalvar}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer ${
                  podeProsseguir && !saving
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
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
