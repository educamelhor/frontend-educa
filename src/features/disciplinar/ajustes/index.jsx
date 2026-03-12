import React, { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";
import { Dialog } from "@headlessui/react";

export default function AjustesDisciplinar() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Pesquisa
  const [busca, setBusca] = useState("");

  // Modal Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Tipos filtrados + ordenados alfabeticamente
  const tiposFiltrados = useMemo(() => {
    const lista = [...tipos].sort((a, b) =>
      a.motivo.localeCompare(b.motivo, "pt-BR", { sensitivity: "base" })
    );
    if (!busca.trim()) return lista;
    const termo = busca.toLowerCase().trim();
    return lista.filter((t) => t.motivo.toLowerCase().includes(termo));
  }, [tipos, busca]);

  const fetchTipos = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/tipos-ocorrencia");
      setTipos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao listar tipos de ocorrência:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setMotivo("");
    setAtivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setMotivo(item.motivo);
    setAtivo(Boolean(item.ativo));
    setIsModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) return alert("O motivo não pode estar vazio.");
    setSalvando(true);
    try {
      if (editingId) {
        await api.put(`/api/tipos-ocorrencia/${editingId}`, { motivo: motivo.trim(), ativo });
      } else {
        await api.post("/api/tipos-ocorrencia", { motivo: motivo.trim(), ativo });
      }
      setIsModalOpen(false);
      fetchTipos();
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setExcluindo(true);
    try {
      await api.delete(`/api/tipos-ocorrencia/${deletingItem.id}`);
      setIsDeleteModalOpen(false);
      fetchTipos();
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  };

  const totalAtivos = tipos.filter((t) => t.ativo).length;
  const totalInativos = tipos.filter((t) => !t.ativo).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Título + subtítulo */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight">Ajustes Disciplinares</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Gerencie os tipos de ocorrência do módulo Disciplinar
            </p>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {tipos.length} {tipos.length === 1 ? "tipo" : "tipos"} cadastrado{tipos.length !== 1 ? "s" : ""}
          </div>
          {totalAtivos > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              {totalAtivos} ativo{totalAtivos !== 1 ? "s" : ""}
            </div>
          )}
          {totalInativos > 0 && (
            <div className="flex items-center gap-2 bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
              {totalInativos} inativo{totalInativos !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Barra de pesquisa + botão */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar tipo de ocorrência..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm shadow-blue-600/30 transition-all whitespace-nowrap"
          >
            <PlusIcon className="w-4 h-4" />
            Novo Tipo
          </button>
        </div>
      </div>

      {/* ── TABELA ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando registros...</span>
          </div>
        ) : tiposFiltrados.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center gap-2">
            <AdjustmentsHorizontalIcon className="w-10 h-10 text-gray-200" />
            <p className="text-gray-500 font-medium">
              {busca ? `Nenhum resultado para "${busca}"` : "Nenhum tipo cadastrado ainda"}
            </p>
            {!busca && (
              <p className="text-sm text-gray-400">Clique em "Novo Tipo" para adicionar o primeiro.</p>
            )}
          </div>
        ) : (
          <>
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[1fr_110px_100px] items-center px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>Tipo de Ocorrência</span>
              <span className="text-center">Status</span>
              <span className="text-center">Ações</span>
            </div>

            {/* Linhas */}
            <ul className="divide-y divide-gray-50">
              {tiposFiltrados.map((t, i) => (
                <li
                  key={t.id}
                  className="grid grid-cols-[1fr_110px_100px] items-center px-6 py-4 hover:bg-blue-50/30 transition-colors group"
                >
                  {/* Motivo */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center select-none">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-800 leading-snug truncate">
                      {t.motivo}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    {t.ativo ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                        Inativo
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-center gap-1">
                    <button
                      title="Editar"
                      onClick={() => openEditModal(t)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      title="Excluir"
                      onClick={() => openDeleteModal(t)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Rodapé */}
            <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {busca
                  ? `${tiposFiltrados.length} de ${tipos.length} tipo${tipos.length !== 1 ? "s" : ""} encontrado${tiposFiltrados.length !== 1 ? "s" : ""}`
                  : `${tipos.length} tipo${tipos.length !== 1 ? "s" : ""} cadastrado${tipos.length !== 1 ? "s" : ""} • ordenados alfabeticamente`}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL: NOVO / EDITAR ───────────────────── */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <Dialog.Panel className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <AdjustmentsHorizontalIcon className="w-4 h-4 text-blue-600" />
              </div>
              <Dialog.Title className="text-base font-bold text-gray-800">
                {editingId ? "Editar Tipo" : "Novo Tipo de Ocorrência"}
              </Dialog.Title>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Descrição do Tipo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Uso indevido do celular em sala"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition placeholder-gray-400"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  id="checkAtivo"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${ativo ? "bg-blue-600" : "bg-gray-200"}`} />
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${ativo ? "translate-x-4" : ""}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 select-none">
                  {ativo ? "Ativo" : "Inativo"}
                </p>
                <p className="text-xs text-gray-400 select-none">
                  {ativo ? "Visível no menu de registro de ocorrências" : "Oculto do menu de registro"}
                </p>
              </div>
            </label>

            <div className="flex gap-3 pt-2 border-t border-gray-100 mt-2 justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 shadow-sm shadow-blue-600/30"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </Dialog>

      {/* ── MODAL: EXCLUIR ─────────────────────────── */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <Dialog.Panel className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          </div>
          <Dialog.Title className="text-base font-bold text-gray-900 mb-1">
            Excluir Tipo de Ocorrência
          </Dialog.Title>
          <p className="text-sm text-gray-500 mb-6">
            Deseja excluir{" "}
            <strong className="text-gray-700">"{deletingItem?.motivo}"</strong>?{" "}
            Esta ação não poderá ser desfeita.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={excluindo}
              onClick={handleDelete}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >

              {excluindo ? "Aguarde..." : "Excluir"}
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}
