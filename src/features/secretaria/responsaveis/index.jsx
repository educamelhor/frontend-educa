// src/features/secretaria/responsaveis/index.jsx
// ────────────────────────────────────────────────────────────────
// Lista de Responsáveis (Secretaria) — visual idêntico ao módulo Disciplinar
// ────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import api from "../../../services/api";
import ResponsavelModal from "../../../components/shared/ResponsavelModal";

// ── Helper: ano letivo padrão ──
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// ── Formatar CPF ──
function formatarCPF(cpf) {
  if (!cpf) return "—";
  const digits = String(cpf).replace(/\D/g, "").padStart(11, "0");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatTelefone(val) {
  return (val || "")
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{4,5})(\d{4})/, "$1-$2")
    .substring(0, 15);
}

export default function ListaResponsaveis() {
  // ── Filtro / Busca ──
  const [filtro, setFiltro] = useState("");
  const [debouncedFiltro, setDebouncedFiltro] = useState("");

  // ── Dados ──
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 100;
  const [loading, setLoading] = useState(true);

  // ── Ano Letivo ──
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());

  // ── Shared Modal (View / Edit / New) ──
  const [sharedModal, setSharedModal] = useState({ open: false, mode: "view", id: null });

  // ── Modal Exclusão ──
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // ── Modal Consentimento de Imagem ──
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentItem, setConsentItem] = useState(null);
  const [alunosConsentimento, setAlunosConsentimento] = useState([]);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [salvandoConsentimento, setSalvandoConsentimento] = useState(false);
  const [consentimentoSucesso, setConsentimentoSucesso] = useState(false);

  // ── Modal Impressão Termo ──
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState(null);
  const [printAlunos, setPrintAlunos] = useState([]);
  const [carregandoPrintAlunos, setCarregandoPrintAlunos] = useState(false);

  // ── Debounce (400ms) ──
  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedFiltro(filtro);
      setPage(1);
    }, 400);
    return () => clearTimeout(h);
  }, [filtro]);

  // ── Carregar anos letivos ──
  useEffect(() => {
    async function carregarAnos() {
      try {
        const res = await api.get("/api/matriculas/anos");
        setAnosLetivos(Array.isArray(res.data) ? res.data : []);
      } catch {
        setAnosLetivos([anoLetivoPadrao()]);
      }
    }
    carregarAnos();
  }, []);

  // ── Buscar responsáveis ──
  async function fetchResponsaveis() {
    try {
      setLoading(true);
      const params = {
        filtro: debouncedFiltro || undefined,
        ano_letivo: anoLetivo || undefined,
        limit,
        offset: (page - 1) * limit,
      };
      const res = await api.get("/api/responsaveis/secretaria", { params });
      const data = res.data || {};
      setRegistros(data.rows || []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      console.error("Erro ao carregar responsáveis:", err);
      setRegistros([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResponsaveis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedFiltro, anoLetivo]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ── Handlers Modal ──
  const openNewModal = () => setSharedModal({ open: true, mode: "edit", id: null });
  const openViewModal = (reg) => setSharedModal({ open: true, mode: "view", id: reg.responsavel_id });
  const openEditModal = (reg) => setSharedModal({ open: true, mode: "edit", id: reg.responsavel_id });
  const closeSharedModal = () => setSharedModal({ open: false, mode: "view", id: null });

  const openDeleteModal = (reg) => {
    setDeletingItem(reg);
    setIsDeleteModalOpen(true);
  };

  async function handleDelete() {
    if (!deletingItem) return;
    setExcluindo(true);
    try {
      await api.delete(`/api/responsaveis/${deletingItem.responsavel_id}`);
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
      fetchResponsaveis();
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  // ── Consentimento de Imagem ──
  const openConsentModal = async (reg) => {
    // Monta um objeto compatível com o modal (usa responsavel_id como id)
    const item = { id: reg.responsavel_id, nome: reg.responsavel, cpf: reg.cpf };
    setConsentItem(item);
    setAlunosSelecionados([]);
    setConsentimentoSucesso(false);
    setIsConsentModalOpen(true);
    setCarregandoAlunos(true);
    try {
      const { data } = await api.get(`/api/responsaveis/${reg.responsavel_id}/alunos`);
      setAlunosConsentimento(Array.isArray(data) ? data : []);
      const naoAutorizados = (Array.isArray(data) ? data : [])
        .filter((a) => Number(a.consentimento_imagem) !== 1)
        .map((a) => a.aluno_id);
      setAlunosSelecionados(naoAutorizados);
    } catch (err) {
      console.error("Erro ao buscar alunos para consentimento:", err);
      setAlunosConsentimento([]);
    } finally {
      setCarregandoAlunos(false);
    }
  };

  const handleSalvarConsentimento = async () => {
    if (!consentItem || alunosSelecionados.length === 0) return;
    setSalvandoConsentimento(true);
    try {
      await api.post(`/api/responsaveis/${consentItem.id}/consentimento-imagem`, {
        aluno_ids: alunosSelecionados,
      });
      setConsentimentoSucesso(true);
      fetchResponsaveis();
    } catch (err) {
      console.error("Erro ao registrar consentimento:", err);
      alert("Erro ao registrar o consentimento. Tente novamente.");
    } finally {
      setSalvandoConsentimento(false);
    }
  };

  // ── Impressão Termo PDF ──
  const handlePrintTermo = async (reg) => {
    const item = { id: reg.responsavel_id, nome: reg.responsavel, cpf: reg.cpf };
    setPrintItem(item);
    setCarregandoPrintAlunos(true);
    setIsPrintModalOpen(true);
    try {
      const { data } = await api.get(`/api/responsaveis/${reg.responsavel_id}/alunos`);
      const alunos = Array.isArray(data) ? data : [];
      setPrintAlunos(alunos);
      if (alunos.length === 1) {
        setIsPrintModalOpen(false);
        gerarTermoPDF(reg.responsavel_id, alunos[0].aluno_id);
      }
    } catch (err) {
      console.error("Erro ao buscar alunos para impressão:", err);
      setPrintAlunos([]);
    } finally {
      setCarregandoPrintAlunos(false);
    }
  };

  const gerarTermoPDF = (respId, alId) => {
    const token = localStorage.getItem("token");
    const escolaId = localStorage.getItem("escola_id");
    const url = `${api.defaults.baseURL}/termo-consentimento/${respId}/${alId}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "x-escola-id": escolaId },
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
      .then((blob) => { window.open(URL.createObjectURL(blob), "_blank"); })
      .catch((err) => { console.error("Erro ao gerar PDF:", err); alert("Erro ao gerar o Termo de Consentimento."); });
  };

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── HEADER ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight">Responsáveis</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Consulte, edite e registre familiares e responsáveis
            </p>
          </div>
        </div>

        {/* Badge contagem + Filtro Ano Letivo */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {total} {total === 1 ? "responsável" : "responsáveis"} vinculado{total !== 1 ? "s" : ""}
          </div>

          {/* Filtro de Ano Letivo */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <label htmlFor="filtro-ano-resp" className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Ano Letivo:
            </label>
            <select
              id="filtro-ano-resp"
              value={anoLetivo}
              onChange={(e) => { setAnoLetivo(Number(e.target.value)); setPage(1); }}
              className="border-0 bg-transparent text-sm font-semibold text-gray-700 focus:outline-none focus:ring-0 cursor-pointer"
            >
              {anosLetivos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de busca + Botão Novo */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar responsável, aluno ou CPF..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all whitespace-nowrap"
          >
            <PlusIcon className="w-4 h-4" />
            Novo Registro
          </button>
        </div>
      </div>

      {/* ── LISTA ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando dados...</span>
          </div>
        ) : registros.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center gap-2">
            <UserGroupIcon className="w-10 h-10 text-gray-200" />
            <p className="text-gray-500 font-medium">
              {filtro ? `Nenhum resultado para "${filtro}"` : "Nenhum responsável registrado"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">RE</th>
                  <th className="px-6 py-4 font-semibold">Aluno</th>
                  <th className="px-6 py-4 font-semibold">Responsável</th>
                  <th className="px-6 py-4 font-semibold">CPF</th>
                  <th className="px-6 py-4 font-semibold text-center w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registros.map((reg) => (
                  <tr key={reg.vinculo_id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-500 font-mono">
                      {reg.re || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {(reg.aluno || "").toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {(reg.responsavel || "").toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {formatarCPF(reg.cpf)}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openViewModal(reg)}
                          className="p-1.5 text-gray-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Visualizar dados"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openConsentModal(reg)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Termo de Consentimento de Imagem"
                        >
                          <DevicePhoneMobileIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintTermo(reg)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Imprimir Termo de Consentimento (PDF)"
                        >
                          <PrinterIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(reg)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar responsável"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(reg)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover vínculo"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-400">
          <span>{total} registros no total</span>
          <div className="flex items-center gap-2">
            {filtro && <span>Exibindo {registros.length} resultados</span>}
            {totalPages > 1 && (
              <>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-colors text-xs font-semibold"
                >
                  ← Anterior
                </button>
                <span className="text-gray-500 font-semibold">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= total}
                  className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-colors text-xs font-semibold"
                >
                  Próxima →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── SHARED MODAL (View / Edit / New) ── */}
      <ResponsavelModal
        open={sharedModal.open}
        mode={sharedModal.mode}
        responsavelId={sharedModal.id}
        onClose={closeSharedModal}
        onSaved={fetchResponsaveis}
      />

      {/* ── MODAL EXCLUIR VÍNCULO ─────────────────── */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-7 text-center shadow-2xl transition-all border border-gray-100">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-4 ring-8 ring-red-50/50">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <Dialog.Title as="h3" className="text-xl font-bold text-gray-800 mb-2">
                    Remover Vínculo?
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 mb-6 px-2">
                    Tem certeza que deseja remover o vínculo de{" "}
                    <span className="font-semibold text-gray-700">{deletingItem?.responsavel}</span>{" "}
                    com <span className="font-semibold text-gray-700">{deletingItem?.aluno}</span>?
                  </p>

                  <div className="bg-orange-50 text-orange-800 text-xs px-4 py-3 rounded-lg mb-6 text-left leading-relaxed">
                    <span className="font-semibold block mb-0.5">Aviso:</span>
                    Esta ação apenas remove o acesso da sua escola aos dados deste responsável. O cadastro global permanecerá intacto.
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 focus:outline-none transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={excluindo}
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 shadow-sm shadow-red-600/30 focus:outline-none active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                    >
                      {excluindo && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      Sim, Remover
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ── MODAL CONSENTIMENTO DE IMAGEM ──────────── */}
      <Transition appear show={isConsentModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => { if (!salvandoConsentimento) { setIsConsentModalOpen(false); setConsentimentoSucesso(false); } }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-100">
                  <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-7 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                        <ShieldCheckIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Dialog.Title as="h3" className="text-lg font-bold text-white leading-tight">
                          Termo de Consentimento
                        </Dialog.Title>
                        <p className="text-emerald-100 text-sm mt-0.5">Uso de Imagem e Dados Biométricos</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-7 py-5">
                    {consentimentoSucesso ? (
                      <div className="flex flex-col items-center text-center py-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 ring-8 ring-emerald-50/50">
                          <CheckCircleSolidIcon className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-800 mb-1">Consentimento Registrado!</h4>
                        <p className="text-sm text-gray-500 max-w-xs">
                          O termo foi registrado com sucesso. As imagens dos estudantes autorizados agora podem ser exibidas no sistema EDUCA.MELHOR.
                        </p>
                        <button
                          onClick={() => { setIsConsentModalOpen(false); setConsentimentoSucesso(false); }}
                          className="mt-6 px-6 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-700 transition-colors"
                        >
                          Fechar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 mb-4 border border-slate-100">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-700 font-bold text-sm">
                              {(consentItem?.nome || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{consentItem?.nome}</p>
                            <p className="text-xs text-gray-400">{consentItem?.cpf ? formatarCPF(consentItem.cpf) : "CPF não informado"}</p>
                          </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                          <p className="text-xs text-amber-900 leading-relaxed">
                            <span className="font-bold">Declaração:</span> O(a) responsável acima identificado(a) compareceu
                            presencialmente à escola e assinou o <span className="font-semibold">Termo de Consentimento para Uso
                            de Imagem e Dados Biométricos do(s) Aluno(s)</span>, autorizando a captura, armazenamento
                            e exibição da imagem do estudante no sistema EDUCA.MELHOR e aplicativos vinculados,
                            em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
                          </p>
                        </div>

                        <div className="mb-5">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Estudantes vinculados
                          </label>

                          {carregandoAlunos ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                              <div className="w-5 h-5 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
                              <span className="text-sm">Carregando alunos...</span>
                            </div>
                          ) : alunosConsentimento.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-sm">
                              Nenhum aluno vinculado encontrado.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {alunosConsentimento.map((aluno) => {
                                const jaAutorizado = Number(aluno.consentimento_imagem) === 1;
                                const selecionado = alunosSelecionados.includes(aluno.aluno_id);
                                return (
                                  <label
                                    key={aluno.aluno_id}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all cursor-pointer ${
                                      jaAutorizado
                                        ? "bg-emerald-50 border-emerald-200"
                                        : selecionado
                                        ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                                  >
                                    {jaAutorizado ? (
                                      <CheckCircleSolidIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    ) : (
                                      <input
                                        type="checkbox"
                                        checked={selecionado}
                                        onChange={() => {
                                          setAlunosSelecionados((prev) =>
                                            prev.includes(aluno.aluno_id)
                                              ? prev.filter((id) => id !== aluno.aluno_id)
                                              : [...prev, aluno.aluno_id]
                                          );
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium truncate ${jaAutorizado ? "text-emerald-800" : "text-gray-800"}`}>
                                        {aluno.aluno_nome}
                                      </p>
                                      {aluno.aluno_codigo && (
                                        <p className="text-xs text-gray-400">Cód: {aluno.aluno_codigo}</p>
                                      )}
                                    </div>
                                    {jaAutorizado && (
                                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        ✓ Autorizado
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => { setIsConsentModalOpen(false); setConsentimentoSucesso(false); }}
                            disabled={salvandoConsentimento}
                            className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            onClick={handleSalvarConsentimento}
                            disabled={salvandoConsentimento || alunosSelecionados.length === 0}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 focus:outline-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                          >
                            {salvandoConsentimento && (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {salvandoConsentimento ? "Registrando..." : "Confirmar Consentimento"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ── MODAL SELECIONAR ALUNO PARA IMPRESSÃO ──────── */}
      <Transition appear show={isPrintModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsPrintModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-100">
                  <div className="bg-gradient-to-r from-violet-600 via-violet-500 to-purple-500 px-7 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                        <PrinterIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Dialog.Title as="h3" className="text-lg font-bold text-white leading-tight">
                          Gerar Termo de Consentimento
                        </Dialog.Title>
                        <p className="text-violet-100 text-sm mt-0.5">Selecione o(a) aluno(a)</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-7 py-5">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 mb-4 border border-slate-100">
                      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
                        <span className="text-violet-700 font-bold text-sm">
                          {(printItem?.nome || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{printItem?.nome}</p>
                        <p className="text-xs text-gray-400">{printItem?.cpf ? formatarCPF(printItem.cpf) : "CPF não informado"}</p>
                      </div>
                    </div>

                    {carregandoPrintAlunos ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
                        <span className="text-sm">Carregando alunos...</span>
                      </div>
                    ) : printAlunos.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Nenhum aluno vinculado encontrado.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600 mb-2">
                          Clique no aluno para gerar o PDF:
                        </p>
                        {printAlunos.map((aluno) => (
                          <button
                            key={aluno.aluno_id}
                            onClick={() => {
                              setIsPrintModalOpen(false);
                              gerarTermoPDF(printItem.id, aluno.aluno_id);
                            }}
                            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 border border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                              <PrinterIcon className="w-4 h-4 text-gray-400 group-hover:text-violet-600 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{aluno.aluno_nome}</p>
                              {aluno.aluno_codigo && (
                                <p className="text-xs text-gray-400">RE: {aluno.aluno_codigo}</p>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Gerar PDF →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setIsPrintModalOpen(false)}
                        className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 focus:outline-none transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
