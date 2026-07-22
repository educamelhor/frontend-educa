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

import { useState, useEffect, useMemo } from "react";
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
    () => new Set(selecionadas.map(asId).filter(Boolean)),
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
        // 1) Disciplinas disponíveis (por escola/turno, se turno vier)
        const { data: dataDiscsRaw } = await api.get("/api/disciplinas", {
          params: { escola_id, turno },
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
        const ids = itens.map((it) => asId(it.disciplina_id));
        // Se não houver nada salvo, deixa 1 slot vazio para o usuário começar
        setSelecionadas(ids.length > 0 ? ids : [""]);
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
  }, [turma?.id, turno, escola_id, semestre]);

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
      novo[index] = idStr || "";
      return novo;
    });
  }

  function handleClearTurma(index) {
    setSelecionadas((prev) => {
      const novo = [...prev];
      novo[index] = ""; // limpa a linha (slot permanece)
      return novo;
    });
  }

  function handleAddLinha() {
    setSelecionadas((prev) => [...prev, ""]);
  }

  function handleRemoveLinha(index) {
    // Remove o slot por completo
    setSelecionadas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSalvarTurma() {
    try {
      setSavingTurma(true);
      // Envia somente os ids preenchidos (não vazios)
      const itens = selecionadas.filter(Boolean);
      const payload = {
        // Caso o backend use req.user.escola_id, escola_id será ignorado,
        // mas mantemos por compatibilidade
        escola_id,
        turma_id: turma?.id,
        semestre,
        itens,
      };
      const { data } = await api.post("/api/cargas-horarias/definir", payload);
      // Feedback simples
      alert(`✅ Cargas salvas! Total: ${data?.totalCarga ?? 0}`);
      // Callback opcional para que o pai recarregue a tabela
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
      <div className="p-4 bg-white rounded-lg shadow-md border">
        {/* Cabeçalho do Editor por Turma */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="text-xl font-semibold text-blue-800">
            Alterar / Definir Disciplinas — Turma {turma?.turma}
          </h3>

          <div className="flex gap-2">
            <button
              onClick={handleAddLinha}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              title="Adicionar linha (novo slot)"
            >
              <PlusIcon className="w-5 h-5" />
              Adicionar linha
            </button>
            <button
              onClick={handleSalvarTurma}
              disabled={savingTurma}
              className={`px-4 py-2 rounded text-white ${
                !savingTurma ? "bg-green-600 hover:bg-green-700" : "bg-green-300 cursor-not-allowed"
              }`}
            >
              {savingTurma ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Estados de carregamento/erro (modo turma) */}
        {loadingTurma && (
          <div className="mb-4 p-4 bg-gray-50 border rounded text-gray-700">
            Carregando disciplinas e cargas da turma…
          </div>
        )}
        {!loadingTurma && erroTurma && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {erroTurma}
          </div>
        )}

        {/* Linhas editáveis */}
        {!loadingTurma && !erroTurma && (
          <div className="space-y-3">
            {selecionadas.length === 0 && (
              <div className="p-3 bg-gray-50 border rounded text-gray-600">
                Nenhum slot definido. Clique em <strong>Adicionar linha</strong> para começar.
              </div>
            )}

            {selecionadas.map((valor, idx) => {
              const opcoes = opcoesParaLinha(valor);
              const cargaSelecionada =
                disciplinas.find((d) => asId(d.id) === asId(valor)) || null;
              const carga = getCargaFromDisciplina(cargaSelecionada);

              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                >
                  <div className="sm:col-span-2 text-sm text-gray-600 font-medium">
                    Disciplina {idx + 1}
                  </div>

                  <div className="sm:col-span-8 min-w-0">
                    <div className="flex items-center gap-2">
                      <select
                        value={asId(valor || "")}
                        onChange={(e) => handleSelectTurma(idx, e.target.value)}
                        className="border rounded p-2 w-full min-w-0 max-w-full"
                      >
                        <option value="">— selecione —</option>
                        {opcoes.map((d) => (
                          <option key={d.id} value={d.id} disabled={d.disabled}>
                            {d.nome}
                            {getCargaFromDisciplina(d) ? ` • ${getCargaFromDisciplina(d)}h` : ""}
                          </option>
                        ))}
                      </select>

                      {/* Lixeira (limpar slot) */}
                      <button
                        onClick={() => handleClearTurma(idx)}
                        className="text-red-600 hover:text-red-800"
                        title="Limpar disciplina deste slot"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>

                      {/* Remover linha por completo (opcional) */}
                      <button
                        onClick={() => handleRemoveLinha(idx)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Remover esta linha"
                      >
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2 text-sm text-gray-700 text-center sm:text-left">
                    {carga ? <span className="px-2 py-1 bg-blue-50 border rounded">Carga: {carga}</span> : <span className="text-gray-400">—</span>}
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
