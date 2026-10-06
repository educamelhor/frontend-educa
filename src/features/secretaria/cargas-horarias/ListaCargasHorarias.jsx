// src/features/secretaria/cargas-horarias/ListaCargasHorarias.jsx
// ============================================================================
// Lista de Cargas Horárias (modo geral) + Editor por Turma (modo turma)
// ----------------------------------------------------------------------------
// Modo Geral (sem props de turma):
// - Header interno opcional (botão + busca) ou controles externos via props
// - Colunas: Código, Disciplina, Etapa, Turno, Ações
// - Modal de inclusão/edição (CargaHorariaForm)
// - Modal de confirmação de exclusão
//
// Modo Turma (quando prop `turma` é fornecida):
// - Exibe linhas editáveis das disciplinas já cadastradas para a turma
// - Cada linha tem select de disciplina e ícone de lixeira (limpa o campo)
// - “Salvar” envia apenas as disciplinas selecionadas (não vazias)
// - Se houver slots vazios ao salvar, a turma fica com menos disciplinas
// - Backend (POST /api/cargas-horarias/definir) recalcula o Total
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  TrashIcon,
  PencilSquareIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import Modal from "../../../components/ui/Modal";
import CargaHorariaForm from "./CargaHorariaForm";
import api from "../../../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Util: normaliza texto
// ─────────────────────────────────────────────────────────────────────────────
function normalize(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Util: normaliza id (string) e extrai carga da disciplina
// ─────────────────────────────────────────────────────────────────────────────
const asId = (v) => (v == null ? "" : String(v));
function getCargaFromDisciplina(d) {
  if (!d) return 0;
  return (
    Number(d.carga) ||
    Number(d.carga_horaria) ||
    Number(d.aulas) ||
    Number(d.horas) ||
    Number(d.weekly_hours) ||
    0
  );
}

// ============================================================================
// Componente
// ============================================================================
export default function ListaCargasHorarias({
  hideHeader = false, // quando true, oculta o header interno (modo geral)
  search: searchProp, // busca controlada externamente (opcional)
  onSearchChange, // setter externo da busca (opcional)

  // MODO TURMA — se `turma` estiver presente, renderiza o editor por turma
  turma = null, // { id, turma, ... }
  turno = null, // string opcional, ajuda a filtrar disciplinas do turno
  onSaved, // callback opcional após salvar no modo turma
  semestre = 1, // 1 ou 2 (usado quando turma.regime === 'semestral')
}) {
  // ==========================================================================
  // ESTADOS — MODO GERAL
  // ==========================================================================
  const [cargas, setCargas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(""); // erro de carregamento
  const [searchInternal, setSearchInternal] = useState("");
  const [isFormOpen, setFormOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);

  // Usa busca externa se passada via props, senão usa a interna
  const search = typeof searchProp === "string" ? searchProp : searchInternal;

  // ==========================================================================
  // ESTADOS — MODO TURMA
  // ==========================================================================
  const [disciplinas, setDisciplinas] = useState([]); // lista de disciplinas do turno
  const [selecionadas, setSelecionadas] = useState([]); // ids (string) — slots editáveis
  const [savingTurma, setSavingTurma] = useState(false);
  const [erroTurma, setErroTurma] = useState("");
  const [loadingTurma, setLoadingTurma] = useState(false);
  const escola_id = useMemo(() => localStorage.getItem("escola_id") || 1, []);

  // Conjunto de ids já escolhidos (para desabilitar repetição)
  const escolhidasSet = useMemo(
    () => new Set(selecionadas.map((it) => asId(it?.disciplina_id ?? it)).filter(Boolean)),
    [selecionadas]
  );

  // ==========================================================================
  // CARREGAMENTO — MODO GERAL
  // ==========================================================================
  useEffect(() => {
    if (turma) return; // no modo turma, a lista geral não é usada
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await api.get("/api/cargas-horarias");
        setCargas(data);
      } catch (err) {
        console.error("Falha ao carregar cargas horárias:", err);
        setLoadError(
          err?.response?.data?.message ||
            "Não foi possível carregar as cargas horárias. Verifique se a API está ativa e a tabela existe."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [turma]);

  // Escuta evento global para abrir modal de inclusão (modo geral)
  useEffect(() => {
    if (turma) return;
    const handler = () => {
      setEditing(null);
      setFormOpen(true);
    };
    document.addEventListener("cargas:abrirModalInclusao", handler);
    return () => document.removeEventListener("cargas:abrirModalInclusao", handler);
  }, [turma]);

  // ==========================================================================
  // CARREGAMENTO — MODO TURMA (disciplinas do turno + cargas já definidas)
  // ==========================================================================
  useEffect(() => {
    if (!turma) return;
    async function loadTurma() {
      setLoadingTurma(true);
      setErroTurma("");
      try {
        // 1) Disciplinas disponíveis (filtradas estritamente por tipo: REGULAR)
        const { data: dataDiscsRaw } = await api.get("/api/disciplinas", {
          params: { 
            escola_id, 
            tipo: "REGULAR",
          },
        });
        const discs = Array.isArray(dataDiscsRaw) ? dataDiscsRaw : [];
        const normalizadas = discs.map((d, i) => ({
          id: asId(d.id ?? d.codigo ?? `disc-${i}`),
          nome: d.nome ?? d.disciplina ?? d.titulo ?? `Disciplina ${i + 1}`,
          ...d,
        }));
        setDisciplinas(normalizadas);

        // 2) Cargas já definidas para a turma (filtradas por semestre)
        const { data: dataCargas } = await api.get("/api/cargas-horarias", {
          params: { turma_id: turma.id, semestre },
        });
        const itens = Array.isArray(dataCargas?.itens) ? dataCargas.itens : [];
        const slots = itens.map((it) => ({
          disciplina_id: asId(it.disciplina_id),
          carga: Number(it.carga) > 0 ? Number(it.carga) : 2,
        }));
        // Se não houver nada salvo, deixa 1 slot vazio para o usuário começar
        setSelecionadas(slots.length > 0 ? slots : [{ disciplina_id: "", carga: 2 }]);
      } catch (err) {
        console.error("Erro ao carregar dados do modo turma:", err);
        setErroTurma(
          err?.response?.data?.message || "Não foi possível carregar dados desta turma."
        );
      } finally {
        setLoadingTurma(false);
      }
    }
    loadTurma();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turma?.id, turma?.turno, turma?.etapa, turno, escola_id, semestre]);

  // ==========================================================================
  // AÇÕES — MODO GERAL
  // ==========================================================================
  async function handleSave(dados) {
    setLoading(true);
    setLoadError("");
    try {
      if (dados.id) {
        await api.put(`/api/cargas-horarias/${dados.id}`, dados);
      } else {
        await api.post("/api/cargas-horarias", dados);
      }
      const { data } = await api.get("/api/cargas-horarias");
      setCargas(data);

      setSuccessMessage("✅ Carga Horária salva com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);

      setFormOpen(false);
      return true;
    } catch (err) {
      console.error("Erro ao salvar carga horária:", err?.response?.data || err?.message);
      alert(err?.response?.data?.message || "Erro ao salvar carga horária.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(carga) {
    setToDelete(carga);
  }

  async function handleDeleteConfirmed() {
    if (!toDelete) return;
    setLoading(true);
    setLoadError("");
    try {
      await api.delete(`/api/cargas-horarias/${toDelete.id}`);
      const { data } = await api.get("/api/cargas-horarias");
      setCargas(data);

      setSuccessMessage("✅ Carga Horária excluída com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Erro ao excluir carga horária:", err?.response?.data || err?.message);
      alert(err?.response?.data?.message || "Erro ao excluir carga horária.");
    } finally {
      setLoading(false);
      setToDelete(null);
    }
  }

  // ==========================================================================
  // AÇÕES — MODO TURMA
  // ==========================================================================
  function handleSelectTurma(index, idDisc) {
    const idStr = asId(idDisc);
    setSelecionadas((prev) => {
      const novo = [...prev];
      const atual = novo[index] || { disciplina_id: "", carga: 2 };
      novo[index] = { ...atual, disciplina_id: idStr || "" };
      return novo;
    });
  }

  function handleCargaTurma(index, valorCarga) {
    const val = valorCarga === "" ? "" : Math.max(1, Math.min(30, Number(valorCarga) || 1));
    setSelecionadas((prev) => {
      const novo = [...prev];
      const atual = novo[index] || { disciplina_id: "", carga: 2 };
      novo[index] = { ...atual, carga: val };
      return novo;
    });
  }

  function handleClearTurma(index) {
    setSelecionadas((prev) => {
      const novo = [...prev];
      novo[index] = { disciplina_id: "", carga: 2 }; // limpa disciplina mas mantém slot
      return novo;
    });
  }

  function handleAddLinha() {
    setSelecionadas((prev) => [...prev, { disciplina_id: "", carga: 2 }]);
  }

  function handleRemoveLinha(index) {
    // Remove o slot por completo
    setSelecionadas((prev) => prev.filter((_, i) => i !== index));
  }

  const totalCargaTurma = useMemo(() => {
    return selecionadas.reduce((acc, it) => {
      if (!it?.disciplina_id) return acc;
      return acc + (Number(it.carga) || 0);
    }, 0);
  }, [selecionadas]);

  async function handleSalvarTurma() {
    try {
      setSavingTurma(true);
      // Envia somente itens preenchidos (com disciplina_id) e suas respectivas cargas
      const itens = selecionadas
        .filter((it) => it && it.disciplina_id)
        .map((it) => ({
          disciplina_id: Number(it.disciplina_id),
          carga: Number(it.carga) || 1,
        }));

      const payload = {
        escola_id,
        turma_id: turma?.id,
        semestre,
        itens,
      };

      const { data } = await api.post("/api/cargas-horarias/definir", payload);
      alert(`✅ Cargas salvas! Total: ${data?.totalCarga ?? totalCargaTurma} aulas.`);
      if (typeof onSaved === "function") onSaved(data);
    } catch (err) {
      console.error("Erro ao salvar cargas da turma:", err);
      alert(err?.response?.data?.message || "Erro ao salvar cargas da turma.");
    } finally {
      setSavingTurma(false);
    }
  }

  // Opções disponíveis por linha (desabilita as já escolhidas em outras linhas)
  function opcoesParaLinha(valorAtual) {
    return disciplinas.map((d) => {
      const idStr = asId(d.id);
      const escolhidaNestaLinha = valorAtual === idStr;
      const escolhidaEmOutraLinha = escolhidasSet.has(idStr) && !escolhidaNestaLinha;
      return { ...d, id: idStr, disabled: escolhidaEmOutraLinha };
    });
  }

  // ==========================================================================
  // RENDER — MODO TURMA
  // ==========================================================================
  if (turma) {
    return (
      <div className="p-5 bg-white rounded-2xl shadow-xl border border-slate-200">
        {/* Cabeçalho do Editor por Turma */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Alterar / Definir Disciplinas</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 uppercase">
                {turma?.turma ?? turma?.nome}
              </span>
            </h3>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>Total da turma:</span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 text-xs">
                {totalCargaTurma} {totalCargaTurma === 1 ? "aula" : "aulas"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddLinha}
              className="px-3.5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-1.5 text-xs font-bold transition shadow-sm cursor-pointer"
              title="Adicionar linha (novo slot)"
            >
              <PlusIcon className="w-4 h-4" />
              Adicionar linha
            </button>
            <button
              type="button"
              onClick={handleSalvarTurma}
              disabled={savingTurma}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 ${
                !savingTurma ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              {savingTurma ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando…</span>
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </div>

        {/* Estados de carregamento/erro (modo turma) */}
        {loadingTurma && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-medium text-center animate-pulse">
            Carregando disciplinas e cargas da turma…
          </div>
        )}
        {!loadingTurma && erroTurma && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {erroTurma}
          </div>
        )}

        {/* Linhas editáveis */}
        {!loadingTurma && !erroTurma && (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {selecionadas.length === 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-center text-xs">
                Nenhum slot definido. Clique em <strong>Adicionar linha</strong> para começar.
              </div>
            )}

            {selecionadas.map((item, idx) => {
              const valorId = asId(item?.disciplina_id ?? "");
              const opcoes = opcoesParaLinha(valorId);

              return (
                <div
                  key={idx}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  {/* Número da linha */}
                  <div className="sm:w-28 flex-shrink-0 text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>Disc. {idx + 1}</span>
                  </div>

                  {/* Dropdown com nome da disciplina */}
                  <div className="flex-1 min-w-0">
                    <select
                      value={valorId}
                      onChange={(e) => handleSelectTurma(idx, e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm font-medium text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    >
                      <option value="">— selecione a disciplina —</option>
                      {opcoes.map((d) => (
                        <option key={d.id} value={d.id} disabled={d.disabled}>
                          {d.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campo de carga horária (aulas) */}
                  <div className="flex items-center gap-1.5 justify-end sm:justify-start flex-shrink-0">
                    <label className="text-xs text-slate-500 font-bold sm:hidden">Carga:</label>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={item?.carga ?? ""}
                      onChange={(e) => handleCargaTurma(idx, e.target.value)}
                      placeholder="2"
                      className="w-16 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-center text-blue-900 bg-blue-50/40 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-slate-500 w-10">aulas</span>
                  </div>

                  {/* Ações: Limpar e Remover */}
                  <div className="flex items-center gap-1 justify-end flex-shrink-0 pl-1">
                    <button
                      type="button"
                      onClick={() => handleClearTurma(idx)}
                      className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                      title="Limpar disciplina deste slot"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveLinha(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remover esta linha"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // RENDER — MODO GERAL (lista/CRUD como no componente original)
  // ==========================================================================
  const term = normalize(search);

  return (
    <div className="p-6">
      {/* Header interno opcional */}
      {!hideHeader && (
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            Adicionar Carga Horária
          </button>

          <input
            type="text"
            placeholder="🔍 Filtrar por Código, Disciplina, Etapa ou Turno"
            value={search}
            onChange={(e) =>
              onSearchChange ? onSearchChange(e.target.value) : setSearchInternal(e.target.value)
            }
            className="border rounded p-2 w-80 placeholder-gray-500"
          />
        </div>
      )}

      {/* Estado: carregando */}
      {loading && (
        <div className="mb-4 p-4 bg-white rounded-lg border text-gray-700">
          Carregando cargas horárias…
        </div>
      )}

      {/* Estado: erro */}
      {!loading && loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {loadError}
        </div>
      )}

      {/* Estado: sucesso */}
      {!loading && successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
          {successMessage}
        </div>
      )}

      {/* Estado: vazio */}
      {!loading && !loadError && cargas.length === 0 && (
        <div className="p-4 bg-white border rounded text-gray-600">
          Nenhuma carga horária encontrada.
        </div>
      )}

      {/* Tabela */}
      {!loading && !loadError && cargas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse mt-4">
            <thead className="bg-blue-100">
              <tr>
                <th className="p-2 border text-center font-medium text-blue-900">Código</th>
                <th className="p-2 border text-center font-medium text-blue-900">Disciplina</th>
                <th className="p-2 border text-center font-medium text-blue-900">Etapa</th>
                <th className="p-2 border text-center font-medium text-blue-900">Turno</th>
                <th className="p-2 border text-center font-medium text-blue-900">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cargas
                .filter(
                  (c) =>
                    normalize(c.codigo).includes(term) ||
                    normalize(c.disciplina).includes(term) ||
                    normalize(c.etapa || "").includes(term) ||
                    normalize(c.turno || "").includes(term)
                )
                .map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50">
                    <td className="p-2 border text-center">{c.codigo}</td>
                    <td className="p-2 border text-center">{c.disciplina}</td>
                    <td className="p-2 border text-center">{c.etapa}</td>
                    <td className="p-2 border text-center">{c.turno}</td>
                    <td className="p-2 border text-center space-x-2">
                      {/* Ação: Editar */}
                      <button
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      {/* Ação: Excluir */}
                      <button
                        onClick={() => confirmDelete(c)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Formulário (modo geral) */}
      <Modal open={isFormOpen} onClose={() => setFormOpen(false)}>
        <CargaHorariaForm
          open={isFormOpen}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSave}
          carga={editing}
        />
      </Modal>

      {/* Modal Confirmação Exclusão (modo geral) */}
      <Modal open={!!toDelete} onClose={() => setToDelete(null)}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Confirmação</h3>
          <p>
            Tem certeza que deseja excluir a carga <strong>{toDelete?.codigo}</strong>?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setToDelete(null)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Não
            </button>
            <button
              onClick={handleDeleteConfirmed}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sim
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
