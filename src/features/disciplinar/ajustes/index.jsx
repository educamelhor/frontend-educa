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

const MEDIDAS_DISCIPLINARES = [
  "Advertência Oral",
  "Advertência Escrita",
  "Suspensão",
  "Ações Educativas",
  "Transferência",
  "Elogio",
];

const TIPOS_OCORRENCIA = [
  "Leve",
  "Média",
  "Grave",
  "Individual",
  "Coletivo",
];

export default function AjustesDisciplinar() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [medidaDisciplinar, setMedidaDisciplinar] = useState("");
  const [tipoOcorrencia, setTipoOcorrencia] = useState("");
  const [descricaoOcorrencia, setDescricaoOcorrencia] = useState("");
  const [pontos, setPontos] = useState(0);
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Pesquisa
  const [busca, setBusca] = useState("");

  // Modal Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Registros filtrados + ordenados
  const registrosFiltrados = useMemo(() => {
    const lista = [...registros].sort((a, b) => {
      // Ordena por medida_disciplinar, depois tipo_ocorrencia, depois descricao
      const cmpMedida = a.medida_disciplinar.localeCompare(b.medida_disciplinar, "pt-BR", { sensitivity: "base" });
      if (cmpMedida !== 0) return cmpMedida;
      const cmpTipo = a.tipo_ocorrencia.localeCompare(b.tipo_ocorrencia, "pt-BR", { sensitivity: "base" });
      if (cmpTipo !== 0) return cmpTipo;
      return a.descricao_ocorrencia.localeCompare(b.descricao_ocorrencia, "pt-BR", { sensitivity: "base" });
    });
    if (!busca.trim()) return lista;
    const termo = busca.toLowerCase().trim();
    return lista.filter((t) =>
      t.descricao_ocorrencia.toLowerCase().includes(termo) ||
      t.medida_disciplinar.toLowerCase().includes(termo) ||
      t.tipo_ocorrencia.toLowerCase().includes(termo)
    );
  }, [registros, busca]);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/registros-ocorrencias");
      setRegistros(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao listar registros de ocorrências:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setMedidaDisciplinar("");
    setTipoOcorrencia("");
    setDescricaoOcorrencia("");
    setPontos(0);
    setAtivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setMedidaDisciplinar(item.medida_disciplinar || "");
    setTipoOcorrencia(item.tipo_ocorrencia || "");
    setDescricaoOcorrencia(item.descricao_ocorrencia || "");
    setPontos(item.pontos ?? 0);
    setAtivo(Boolean(item.ativo));
    setIsModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!medidaDisciplinar.trim()) return alert("A Medida Disciplinar é obrigatória.");
    if (!tipoOcorrencia.trim()) return alert("O Tipo de Ocorrência é obrigatório.");
    if (!descricaoOcorrencia.trim()) return alert("A Descrição da Ocorrência é obrigatória.");
    setSalvando(true);
    try {
      const stringVal = String(pontos).replace(',', '.');
      const valorPontos = Number(stringVal);
      const payload = {
        medida_disciplinar: medidaDisciplinar.trim(),
        tipo_ocorrencia: tipoOcorrencia.trim(),
        descricao_ocorrencia: descricaoOcorrencia.trim(),
        pontos: isNaN(valorPontos) ? 0 : valorPontos,
        ativo,
      };
      if (editingId) {
        await api.put(`/api/registros-ocorrencias/${editingId}`, payload);
      } else {
        await api.post("/api/registros-ocorrencias", payload);
      }
      setIsModalOpen(false);
      fetchRegistros();
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
      await api.delete(`/api/registros-ocorrencias/${deletingItem.id}`);
      setIsDeleteModalOpen(false);
      fetchRegistros();
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  };

  const totalAtivos = registros.filter((t) => t.ativo).length;
  const totalInativos = registros.filter((t) => !t.ativo).length;

  const getBadgeColor = (tipo) => {
    const t = (tipo || "").toLowerCase();
    if (t === "grave") return "bg-red-100 text-red-800";
    if (t === "média") return "bg-orange-100 text-orange-800";
    if (t === "leve") return "bg-yellow-100 text-yellow-800";
    if (t === "individual") return "bg-blue-100 text-blue-800";
    if (t === "coletivo") return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const getMedidaColor = (medida) => {
    const m = (medida || "").toLowerCase();
    if (m.includes("elogio")) return "bg-emerald-100 text-emerald-800";
    if (m.includes("suspensão")) return "bg-red-100 text-red-800";
    if (m.includes("transferência")) return "bg-purple-100 text-purple-800";
    if (m.includes("ações educativas")) return "bg-amber-100 text-amber-800";
    if (m.includes("escrita")) return "bg-orange-100 text-orange-800";
    return "bg-blue-100 text-blue-800"; // Advertência Oral
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Título + subtítulo */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight">Registros de Ocorrências</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Gerencie os registros de ocorrências disciplinares do módulo Disciplinar
            </p>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {registros.length} {registros.length === 1 ? "registro" : "registros"} cadastrado{registros.length !== 1 ? "s" : ""}
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
              placeholder="Buscar por descrição, medida ou tipo..."
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
            Novo Registro
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
        ) : registrosFiltrados.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center gap-2">
            <AdjustmentsHorizontalIcon className="w-10 h-10 text-gray-200" />
            <p className="text-gray-500 font-medium">
              {busca ? `Nenhum resultado para "${busca}"` : "Nenhum registro cadastrado ainda"}
            </p>
            {!busca && (
              <p className="text-sm text-gray-400">Clique em "Novo Registro" para adicionar o primeiro.</p>
            )}
          </div>
        ) : (
          <>
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[140px_90px_1fr_80px_100px_90px] items-center px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>Medida</span>
              <span className="text-center">Tipo</span>
              <span>Descrição da Ocorrência</span>
              <span className="text-center">Pontos</span>
              <span className="text-center">Status</span>
              <span className="text-center">Ações</span>
            </div>

            {/* Linhas */}
            <ul className="divide-y divide-gray-50">
              {registrosFiltrados.map((t, i) => (
                <li
                  key={t.id}
                  className="grid grid-cols-[140px_90px_1fr_80px_100px_90px] items-center px-6 py-4 hover:bg-blue-50/30 transition-colors group"
                >
                  {/* Medida Disciplinar */}
                  <div className="flex justify-start">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getMedidaColor(t.medida_disciplinar)}`}>
                      {t.medida_disciplinar}
                    </span>
                  </div>

                  {/* Tipo */}
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${getBadgeColor(t.tipo_ocorrencia)}`}>
                      {t.tipo_ocorrencia}
                    </span>
                  </div>

                  {/* Descrição */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-gray-800 leading-snug truncate">
                      {t.descricao_ocorrencia}
                    </span>
                  </div>

                  {/* Pontos */}
                  <div className={`flex justify-center text-sm font-bold ${t.pontos > 0 ? 'text-emerald-600' : t.pontos < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {t.pontos > 0 ? `+${Number(t.pontos).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}` : Number(t.pontos).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
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
                  ? `${registrosFiltrados.length} de ${registros.length} registro${registros.length !== 1 ? "s" : ""} encontrado${registrosFiltrados.length !== 1 ? "s" : ""}`
                  : `${registros.length} registro${registros.length !== 1 ? "s" : ""} cadastrado${registros.length !== 1 ? "s" : ""} • ordenados por medida, tipo e descrição`}
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
                {editingId ? "Editar Registro" : "Novo Registro de Ocorrência"}
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
            {/* Medida Disciplinar */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Medida Disciplinar <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={medidaDisciplinar}
                onChange={(e) => setMedidaDisciplinar(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition"
              >
                <option value="">-- Selecione --</option>
                {MEDIDAS_DISCIPLINARES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Ocorrência */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tipo de Ocorrência <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={tipoOcorrencia}
                onChange={(e) => setTipoOcorrencia(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition"
              >
                <option value="">-- Selecione --</option>
                {TIPOS_OCORRENCIA.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Descrição da Ocorrência */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Descrição da Ocorrência <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={descricaoOcorrencia}
                onChange={(e) => setDescricaoOcorrencia(e.target.value)}
                placeholder="Ex: Apresentar-se com uniforme diferente do estabelecido..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition placeholder-gray-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Pontos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Pontos
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pontos}
                  onChange={(e) => setPontos(e.target.value)}
                  placeholder="Ex: -0.1 ou 0.5"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition"
                />
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-end pb-1">
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
                  </div>
                </label>
              </div>
            </div>

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
            Excluir Registro de Ocorrência
          </Dialog.Title>
          <p className="text-sm text-gray-500 mb-6">
            Deseja excluir{" "}
            <strong className="text-gray-700">"{deletingItem?.descricao_ocorrencia}"</strong>?{" "}
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
