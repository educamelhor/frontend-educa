// src/features/secretaria/cargas-horarias/ModalDefinirCargas.jsx
// ============================================================================
// Modal – Definir Cargas por Disciplina
// ----------------------------------------------------------------------------
// Objetivo:
// - Vincular componentes curriculares a uma turma e definir a carga horária
//   específica (aulas/semana) de cada disciplina nesta turma.
// - Salvar a definição via POST /api/cargas-horarias/definir.
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";

const asId = (v) => (v == null ? "" : String(v));

export default function ModalDefinirCargas({ turno, turma, onClose, semestre = 1 }) {
  const [qtd, setQtd] = useState(1);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // Cada slot guarda: { disciplina_id: string, carga: number | string }
  const [itens, setItens] = useState([]);
  const [saving, setSaving] = useState(false);

  const escola_id = useMemo(() => localStorage.getItem("escola_id") || 1, []);

  // --------------------------------------------------------------------------
  // Carga inicial: disciplinas disponíveis + cargas já vinculadas à turma
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErro("");
      try {
        // 1) Disciplinas regulares do turno e etapa da turma
        const [resDiscs, resCargas] = await Promise.all([
          api.get("/api/disciplinas", {
            params: {
              escola_id,
              turno: turma?.turno || turno,
              etapa: turma?.etapa,
              modo_oferta: "TURMA",
              apenas_regulares: true,
            },
          }),
          turma?.id
            ? api
                .get("/api/cargas-horarias", {
                  params: { turma_id: turma.id, semestre },
                })
                .catch(() => ({ data: { itens: [] } }))
            : Promise.resolve({ data: { itens: [] } }),
        ]);

        const rawDiscs = Array.isArray(resDiscs.data) ? resDiscs.data : [];
        const normalizadas = rawDiscs.map((d, i) => ({
          id: asId(d.id ?? d.codigo ?? `disc-${i}`),
          nome: d.nome ?? d.disciplina ?? d.titulo ?? `Disciplina ${i + 1}`,
          ...d,
        }));
        setDisciplinas(normalizadas);

        // 2) Cargas já existentes da turma
        const itensSalvos = Array.isArray(resCargas.data?.itens) ? resCargas.data.itens : [];
        if (itensSalvos.length > 0) {
          setQtd(itensSalvos.length);
          setItens(
            itensSalvos.map((it) => ({
              disciplina_id: asId(it.disciplina_id),
              carga: Number(it.carga) > 0 ? Number(it.carga) : 2,
            }))
          );
        } else {
          setQtd(1);
          setItens([{ disciplina_id: "", carga: 2 }]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do modal de cargas:", err);
        setErro("Não foi possível carregar as disciplinas do turno.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [turno, turma?.id, turma?.turno, turma?.etapa, escola_id, semestre]);

  // --------------------------------------------------------------------------
  // Sincroniza o array 'itens' quando 'qtd' muda
  // --------------------------------------------------------------------------
  const handleQtdChange = (novaQtd) => {
    const n = Math.max(0, Math.min(35, Number(novaQtd) || 0));
    setQtd(novaQtd);
    setItens((prev) => {
      const novo = [...prev];
      if (n > novo.length) {
        for (let i = novo.length; i < n; i++) {
          novo.push({ disciplina_id: "", carga: 2 });
        }
      } else if (n < novo.length) {
        novo.splice(n);
      }
      return novo;
    });
  };

  const linhas = useMemo(() => {
    const n = Math.max(0, Math.min(35, Number(qtd) || 0));
    return Array.from({ length: n }, (_, idx) => idx);
  }, [qtd]);

  // Conjunto de disciplinas já escolhidas para desabilitar duplicidade
  const escolhidasSet = useMemo(() => {
    return new Set(
      itens
        .slice(0, Number(qtd) || 0)
        .map((it) => asId(it?.disciplina_id))
        .filter(Boolean)
    );
  }, [itens, qtd]);

  // --------------------------------------------------------------------------
  // Handlers de edição por linha
  // --------------------------------------------------------------------------
  const handleSelectDisciplina = (index, idDisc) => {
    const idStr = asId(idDisc);
    setItens((prev) => {
      const novo = [...prev];
      const atual = novo[index] || { disciplina_id: "", carga: 2 };
      novo[index] = {
        ...atual,
        disciplina_id: idStr || "",
        carga: atual.carga ? atual.carga : 2,
      };
      return novo;
    });
  };

  const handleCargaChange = (index, valorCarga) => {
    const valor = valorCarga === "" ? "" : Math.max(1, Math.min(30, Number(valorCarga) || 1));
    setItens((prev) => {
      const novo = [...prev];
      const atual = novo[index] || { disciplina_id: "", carga: 2 };
      novo[index] = {
        ...atual,
        carga: valor,
      };
      return novo;
    });
  };

  // --------------------------------------------------------------------------
  // Total da carga horária somando os inputs de cada disciplina
  // --------------------------------------------------------------------------
  const totalCarga = useMemo(() => {
    return linhas.reduce((acc, i) => {
      const it = itens[i];
      if (!it?.disciplina_id) return acc;
      return acc + (Number(it.carga) || 0);
    }, 0);
  }, [linhas, itens]);

  // Validação: todas as linhas precisam de disciplina e carga preenchida
  const podeProsseguir = useMemo(() => {
    const n = Number(qtd) || 0;
    if (n === 0) return false;
    return linhas.every((i) => {
      const it = itens[i];
      return Boolean(it?.disciplina_id && Number(it?.carga) > 0);
    });
  }, [linhas, itens, qtd]);

  // --------------------------------------------------------------------------
  // Salvar
  // --------------------------------------------------------------------------
  async function handleSalvar() {
    try {
      setSaving(true);
      const itensValidos = linhas
        .map((i) => itens[i])
        .filter((it) => it && it.disciplina_id)
        .map((it) => ({
          disciplina_id: Number(it.disciplina_id),
          carga: Number(it.carga) || 1,
        }));

      const payload = {
        escola_id,
        turma_id: turma?.id,
        semestre,
        itens: itensValidos,
      };

      const { data } = await api.post("/api/cargas-horarias/definir", payload);

      alert(`✅ Cargas salvas com sucesso!\nTotal da turma: ${data?.totalCarga ?? totalCarga} aulas.`);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar cargas:", err?.response?.data || err?.message);
      alert(err?.response?.data?.message || "Erro ao salvar cargas da turma. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-5 box-border bg-white rounded-2xl">
      {/* Cabeçalho */}
      <div className="mb-4 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <span>Turno:</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold uppercase border border-blue-200">
            {turno}
          </span>
          <span className="text-slate-300">•</span>
          <span>Turma:</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold uppercase border border-indigo-200">
            {turma?.turma ?? turma?.nome}
          </span>
          {turma?.regime === "semestral" && (
            <>
              <span className="text-slate-300">•</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                {semestre}º Semestre
              </span>
            </>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Definir Cargas por Disciplina
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Selecione os componentes curriculares desta turma e informe a carga horária semanal (aulas) de cada um.
        </p>
      </div>

      {/* Quantidade de Disciplinas */}
      <div className="mb-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Quantas disciplinas nesta turma?
          </label>
          <p className="text-[11px] text-slate-500">
            Defina o número de linhas para organizar a matriz desta turma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={35}
            value={qtd}
            onChange={(e) => handleQtdChange(e.target.value)}
            className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-center bg-white shadow-inner focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <span className="text-xs font-bold text-slate-600 uppercase">disciplinas</span>
        </div>
      </div>

      {/* Lista Dinâmica de Disciplinas */}
      {loading ? (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-medium text-slate-500 animate-pulse">
          Carregando disciplinas disponíveis…
        </div>
      ) : erro ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {erro}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {linhas.map((i) => {
            const item = itens[i] || { disciplina_id: "", carga: 2 };
            const valorId = asId(item.disciplina_id);

            return (
              <div
                key={i}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                {/* Rótulo da linha */}
                <div className="sm:w-28 flex-shrink-0 text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[10px]">
                    {i + 1}
                  </span>
                  <span>Disc. {i + 1}</span>
                </div>

                {/* Dropdown com nome limpo da disciplina */}
                <div className="flex-1 min-w-0">
                  <select
                    value={valorId}
                    onChange={(e) => handleSelectDisciplina(i, e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                  >
                    <option value="">— Selecione a disciplina —</option>
                    {disciplinas.map((d) => {
                      const idStr = asId(d.id);
                      const escolhidaEmOutraLinha =
                        escolhidasSet.has(idStr) && valorId !== idStr;

                      return (
                        <option
                          key={idStr}
                          value={idStr}
                          disabled={escolhidaEmOutraLinha}
                        >
                          {d.nome}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Input editável de carga horária (aulas) */}
                <div className="flex items-center gap-1.5 justify-end sm:justify-start flex-shrink-0 pl-1">
                  <label className="text-xs text-slate-500 font-bold sm:hidden">Carga:</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={item.carga ?? ""}
                    onChange={(e) => handleCargaChange(i, e.target.value)}
                    placeholder="2"
                    className="w-16 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-center text-blue-900 bg-blue-50/40 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-500 w-10">aulas</span>
                </div>
              </div>
            );
          })}

          {linhas.length === 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              Defina a quantidade de disciplinas acima para preencher.
            </div>
          )}
        </div>
      )}

      {/* Rodapé com Totalizador e Ações */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold text-slate-500">Total da Turma:</span>
          <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-base">
            {totalCarga} {totalCarga === 1 ? "aula" : "aulas"}
          </span>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!podeProsseguir || saving}
            onClick={handleSalvar}
            className={`px-5 py-2 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center gap-1.5 ${
              podeProsseguir && !saving
                ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
            title={podeProsseguir ? "" : "Selecione uma disciplina e carga para todas as linhas"}
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Salvando…</span>
              </>
            ) : (
              "Salvar Cargas"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
