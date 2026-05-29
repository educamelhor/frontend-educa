// src/features/secretaria/turmas/ListaTurmas.jsx

import React, { useState, useEffect } from "react";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/solid";
import Modal from "../../../components/ui/Modal";
import TurmaForm from "./TurmaForm";
import api from "../../../services/api";

function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

export default function ListaTurmas() {
  // Estados principais
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());
  const [isFormOpen, setFormOpen] = useState(false);
  const [toDeleteTurma, setToDeleteTurma] = useState(null);
  const [editingTurma, setEditingTurma] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Normalização / Mapeamento
  const [isNormalizationOpen, setIsNormalizationOpen] = useState(false);
  const [normalizationMap, setNormalizationMap] = useState({});
  const [savingNormalization, setSavingNormalization] = useState(false);

  // Sincroniza o mapa de normalização ao carregar ou abrir o modal
  useEffect(() => {
    const initialMap = {};
    turmas.forEach((t) => {
      initialMap[t.id] = t.nome_oficial || "";
    });
    setNormalizationMap(initialMap);
  }, [turmas, isNormalizationOpen]);

  // Salva normalizações de turmas via PATCH individual por turma
  const handleSaveNormalization = async () => {
    setSavingNormalization(true);
    try {
      const targetTurmas = turmas.filter(t => Number(t.ano) === Number(anoLetivo));
      await Promise.all(
        targetTurmas.map(t =>
          api.patch(`/api/turmas/${t.id}/nome-oficial`, {
            nome_oficial: normalizationMap[t.id] || ""
          })
        )
      );

      // Recarrega
      const { data } = await api.get("/api/turmas");
      setTurmas(data);
      setIsNormalizationOpen(false);
      setSuccessMessage("✅ Normalização das turmas salva com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar normalização de turmas:", err);
      alert("❌ Erro ao salvar normalização de turmas.");
    } finally {
      setSavingNormalization(false);
    }
  };

  // Carrega lista de turmas ao iniciar
  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/api/turmas");
        setTurmas(data);

        // Deriva os anos da própria lista ou API
        try {
          const res = await api.get("/api/matriculas/anos");
          setAnosLetivos(Array.isArray(res.data) ? res.data : [anoLetivoPadrao()]);
        } catch {
          const uniqueYears = Array.from(new Set(data.map(t => Number(t.ano)))).filter(Boolean).sort((a, b) => b - a);
          if (!uniqueYears.includes(anoLetivoPadrao())) uniqueYears.push(anoLetivoPadrao());
          setAnosLetivos(uniqueYears.sort((a, b) => b - a));
        }
      } catch (e) {
        console.error("Erro ao carregar turmas", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Função para normalizar texto (para o filtro)
  const normalize = (str = "") =>
    str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const term = normalize(search);

  // Salva nova turma ou edita existente
  async function handleSaveTurma(dados) {
    setLoading(true);
    try {
      const normalizeLocal = (str = "") =>
        str
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase()
          .trim();

      const novaTurma = normalizeLocal(dados.nome);
      const novoTurno = normalizeLocal(dados.turno);
      const novoAno = String(dados.ano);

      // ✅ FIX MÉDIO 5: escola_id não vem mais no payload — a lista de turmas já é filtrada pelo backend
      //  (turmas do usuário logado), então comparar apenas nome+turno+ano é suficiente.
      const duplicada = turmas.find((t) => {
        if (dados.id && t.id === dados.id) return false;
        return (
          normalizeLocal(t.turma) === novaTurma &&
          normalizeLocal(t.turno) === novoTurno &&
          String(t.ano) === novoAno
        );
      });

      if (duplicada) {
        alert(
          "⚠️ Já existe uma turma cadastrada com este nome, turno e ano."
        );
        return false;
      }

      // Decide entre criação e atualização
      if (dados.id) {
        await api.put(`/api/turmas/${dados.id}`, dados);
      } else {
        await api.post("/api/turmas", dados);
      }

      // Recarrega lista
      const { data } = await api.get("/api/turmas");
      setTurmas(data);
      setFormOpen(false);
      setSuccessMessage("✅ Turma salva com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);

      return true;
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar a turma. Verifique os dados e tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Confirmação para exclusão
  function confirmDeleteTurma(turma) {
    setToDeleteTurma(turma);
  }

  // Exclusão confirmada
  async function handleDeleteTurmaConfirmed() {
    if (!toDeleteTurma) return;
    setLoading(true);
    try {
      await api.delete(`/api/turmas/${toDeleteTurma.id}`);
      const { data } = await api.get("/api/turmas");
      setTurmas(data);
      setSuccessMessage("✅ Turma excluída com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao excluir turma.");
    } finally {
      setLoading(false);
      setToDeleteTurma(null);
    }
  }

  if (loading) return <p className="p-6">Carregando turmas...</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Cadastro de Turmas</h2>

      {/* Mensagem de sucesso */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          {successMessage}
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        {/* Botões à esquerda */}
        <div className="flex items-center gap-3">
          {anoLetivo === anoLetivoPadrao() && (
            <button
              onClick={() => {
                setEditingTurma(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-semibold text-sm"
              title="Adicionar Turma"
            >
              + Adicionar Turma
            </button>
          )}
          <button
            onClick={() => setIsNormalizationOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-50 border border-gray-200 transition shadow-sm font-bold text-sm shadow-inner"
            title="Mapeamento e Normalização de Turmas"
          >
            <span className="text-orange-500 font-extrabold tracking-tight">EDUCA.MELHOR</span>
            <span className="text-gray-400 font-light">/</span>
            <span className="text-emerald-500 font-extrabold tracking-tight">EDUCADF</span>
          </button>
        </div>

        {/* Filtro de Ano Letivo (Centro) */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-blue-200">
          <div className="flex items-center gap-1">
            <label htmlFor="filtro-ano" className="text-sm text-gray-600">Ano Letivo:</label>
            <select
              id="filtro-ano"
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm text-gray-800"
            >
              {anosLetivos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campo de busca */}
        <div className="flex flex-col items-end gap-2">
          <input
            type="text"
            placeholder="🔍 Filtrar turmas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="clear-right overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 border text-center">Turma</th>
              <th className="p-2 border text-center">Etapa</th>
              <th className="p-2 border text-center">Ano</th>
              <th className="p-2 border text-center">Turno</th>
              <th className="p-2 border text-center">Série</th>
              <th className="p-2 border text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas
              .filter((t) => Number(t.ano) === Number(anoLetivo))
              .filter(
                (t) =>
                  normalize(t.turma).includes(term) ||
                  normalize(t.etapa || "").includes(term) ||
                  normalize(String(t.ano) || "").includes(term) ||
                  normalize(t.turno).includes(term) ||
                  normalize(t.serie).includes(term)
              )
              .map((t) => (
                <tr key={t.id} className="hover:bg-blue-50">
                  <td className="p-2 border text-center uppercase">
                    {t.turma}
                  </td>
                  <td className="p-2 border text-center uppercase">
                    {t.etapa}
                  </td>
                  <td className="p-2 border text-center uppercase">
                    {t.ano}
                  </td>
                  <td className="p-2 border text-center uppercase">
                    {t.turno}
                  </td>
                  <td className="p-2 border text-center uppercase">
                    {t.serie}
                  </td>
                  <td className="p-2 border text-center space-x-2">
                    {/* Botão editar */}
                    <button
                      onClick={() => {
                        setEditingTurma({
                          ...t,
                          nome: t.turma,
                        });
                        setFormOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>

                    {/* Botão excluir */}
                    <button
                      onClick={() => confirmDeleteTurma(t)}
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

      {/* Modal de formulário */}
      <Modal open={isFormOpen} onClose={() => setFormOpen(false)}>
        <TurmaForm
          open={isFormOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingTurma(null);
          }}
          onSubmit={handleSaveTurma}
          turma={editingTurma}
        />
      </Modal>

      {/* Modal de exclusão */}
      <Modal open={!!toDeleteTurma} onClose={() => setToDeleteTurma(null)}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Confirmação</h3>
          <p>
            Tem certeza que deseja excluir a turma{" "}
            <strong>{toDeleteTurma?.turma}</strong>?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setToDeleteTurma(null)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Não
            </button>
            <button
              onClick={handleDeleteTurmaConfirmed}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sim
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Normalização / Mapeamento (EDUCA.MELHOR / EDUCADF) */}
      <Modal open={isNormalizationOpen} onClose={() => setIsNormalizationOpen(false)}>
        <div className="p-6 space-y-4 max-w-2xl w-full">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Mapeamento Global de Turmas</span>
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold">
                Ano Letivo {anoLetivo}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setIsNormalizationOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ×
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Mapeie o nome de cada turma local do <strong>EDUCA.MELHOR</strong> para a nomenclatura padrão correspondente no <strong>EDUCADF</strong>. Esses valores serão usados por todos os módulos do sistema.
          </p>

          <div className="max-h-[350px] overflow-y-auto pr-1 border rounded-xl divide-y divide-gray-100 bg-white">
            {turmas
              .filter(t => Number(t.ano) === Number(anoLetivo))
              .map((t) => (
                <div key={t.id} className="p-3 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-400 block">NOME LOCAL (EDUCA.MELHOR)</span>
                    <span className="text-sm font-bold text-gray-800 uppercase">{t.turma}</span>
                  </div>
                  <div className="flex flex-col gap-1 w-1/2">
                    <span className="text-[10px] font-bold text-emerald-600">PADRÃO OFICIAL (EDUCADF)</span>
                    <input
                      type="text"
                      value={normalizationMap[t.id] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNormalizationMap(prev => ({ ...prev, [t.id]: val }));
                      }}
                      placeholder="Ex: 6º Ano - A"
                      className="rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                    />
                  </div>
                </div>
              ))}
            {turmas.filter(t => Number(t.ano) === Number(anoLetivo)).length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                Nenhuma turma cadastrada para o ano letivo {anoLetivo}.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              onClick={() => setIsNormalizationOpen(false)}
              disabled={savingNormalization}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNormalization}
              disabled={savingNormalization}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm disabled:opacity-50"
            >
              {savingNormalization ? "Salvando..." : "Salvar Mapeamento"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
