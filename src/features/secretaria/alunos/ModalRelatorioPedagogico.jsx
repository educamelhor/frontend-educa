import React, { useState, useEffect } from "react";
import {
    XMarkIcon, PencilSquareIcon, TrashIcon, EyeIcon,
    ClipboardDocumentCheckIcon, CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";
import ModalNovaOcorrenciaPedagogica from "./ModalNovaOcorrenciaPedagogica";

export default function ModalRelatorioPedagogico({ open, onClose, aluno }) {
    const [novaOcorrenciaOpen, setNovaOcorrenciaOpen] = useState(false);
    const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null);
    const [viewMode, setViewMode] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [ocorrencias, setOcorrencias] = useState([]);
    const [loading, setLoading] = useState(false);

    // Feedback modals
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [infoMensagem, setInfoMensagem] = useState("");

    // Finalização
    const [modalFinalizarOpen, setModalFinalizarOpen] = useState(false);
    const [ocorrenciaParaFinalizar, setOcorrenciaParaFinalizar] = useState(null);
    const [registrandoFinalizacao, setRegistrandoFinalizacao] = useState(false);

    // Exclusão
    const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
    const [ocorrenciaParaExcluir, setOcorrenciaParaExcluir] = useState(null);
    const [excluindo, setExcluindo] = useState(false);

    const perfil = String(localStorage.getItem("perfil") || "").toLowerCase();

    useEffect(() => {
        if (open && aluno?.id) {
            fetchOcorrencias();
        }
    }, [open, aluno]);

    const fetchOcorrencias = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas`);
            setOcorrencias(res.data);
        } catch (err) {
            console.error("Erro ao carregar registros pedagógicos", err);
        } finally {
            setLoading(false);
        }
    };

    // ──── Finalizar ────
    const handleOpenFinalizar = (oc) => {
        if (oc.status === "FINALIZADA") {
            setInfoMensagem("Este registro já está finalizado.");
            setModalInfoOpen(true);
            return;
        }
        if (oc.status === "CANCELADA") {
            setInfoMensagem("Este registro foi cancelado.");
            setModalInfoOpen(true);
            return;
        }
        setOcorrenciaParaFinalizar(oc);
        setModalFinalizarOpen(true);
    };

    const handleConfirmarFinalizacao = async () => {
        if (!ocorrenciaParaFinalizar) return;
        setRegistrandoFinalizacao(true);
        try {
            await api.put(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas/${ocorrenciaParaFinalizar.id}/finalizar`);
            fetchOcorrencias();
            setModalFinalizarOpen(false);
            setOcorrenciaParaFinalizar(null);
        } catch (err) {
            console.error("Erro ao finalizar:", err);
            alert("Erro ao finalizar o registro.");
        } finally {
            setRegistrandoFinalizacao(false);
        }
    };

    // ──── Editar ────
    const handleOpenEdit = (oc) => {
        if (oc.status === "FINALIZADA") {
            setInfoMensagem("Registros finalizados não podem ser editados.");
            setModalInfoOpen(true);
            return;
        }
        if (oc.status === "CANCELADA") {
            setInfoMensagem("Registros cancelados não podem ser editados.");
            setModalInfoOpen(true);
            return;
        }
        setOcorrenciaSelecionada(oc);
        setViewMode(false);
        setEditMode(true);
        setNovaOcorrenciaOpen(true);
    };

    // ──── Excluir ────
    const handleOpenDelete = (oc) => {
        if (oc.status !== "REGISTRADA") {
            setInfoMensagem("Apenas registros com status 'Registrada' podem ser excluídos.");
            setModalInfoOpen(true);
            return;
        }
        setOcorrenciaParaExcluir(oc);
        setModalExcluirOpen(true);
    };

    const handleConfirmarExclusao = async () => {
        if (!ocorrenciaParaExcluir) return;
        setExcluindo(true);
        try {
            await api.delete(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas/${ocorrenciaParaExcluir.id}`);
            fetchOcorrencias();
            setModalExcluirOpen(false);
            setOcorrenciaParaExcluir(null);
        } catch (err) {
            console.error("Erro ao excluir:", err);
            alert("Erro ao excluir o registro.");
        } finally {
            setExcluindo(false);
        }
    };

    // ──── Badge de status ────
    const statusBadge = (status) => {
        if (status === "FINALIZADA") return "text-green-700 bg-green-100 border-green-200";
        if (status === "CANCELADA") return "text-red-700 bg-red-100 border-red-200";
        return "text-emerald-700 bg-emerald-100 border-emerald-200";
    };

    // ──── Badge de categoria ────
    const categoriaBadge = (cat) => {
        const c = (cat || "").toLowerCase();
        if (c.includes("desempenho"))    return "bg-blue-100 text-blue-800 border-blue-200";
        if (c.includes("comportamento")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
        if (c.includes("frequência") || c.includes("frequencia")) return "bg-orange-100 text-orange-800 border-orange-200";
        if (c.includes("socioemocional")) return "bg-purple-100 text-purple-800 border-purple-200";
        if (c.includes("necessidades")) return "bg-pink-100 text-pink-800 border-pink-200";
        return "bg-gray-100 text-gray-700 border-gray-200";
    };

    if (!open || !aluno) return null;

    // Foto
    const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");
    const buildFotoURL = (path) => {
        if (!path) return null;
        return /^https?:\/\//i.test(path) ? path : `${apiBase}${path}`;
    };
    const fotoURL = buildFotoURL(aluno.foto);
    const PLACEHOLDER =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
        <rect width='100%' height='100%' rx='64' ry='64' fill='#e5e7eb'/>
      </svg>`
        );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-3">
                        <AcademicCapIcon className="h-6 w-6 text-emerald-800" />
                        <h2 className="text-xl font-bold text-emerald-900">Relatório Pedagógico</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" title="Fechar">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Cabeçalho do Estudante */}
                    <div className="flex items-center gap-6 mb-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                        <div className="flex-shrink-0">
                            <img
                                src={fotoURL || PLACEHOLDER}
                                alt={`Foto de ${aluno.estudante || ""}`}
                                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = PLACEHOLDER;
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-800 uppercase truncate">
                                {aluno.estudante ?? "NOME NÃO INFORMADO"}
                            </h3>
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold text-gray-700">Turma:</span>{" "}
                                {aluno.turma ?? "-"} {aluno.turno ? `(${aluno.turno})` : ""}
                            </p>
                            <p className="text-xs text-gray-500">
                                <span className="font-semibold text-gray-600">Código:</span> {aluno.codigo}
                            </p>
                        </div>

                        {/* Contador de registros */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Registros</span>
                                <span className="text-2xl font-bold text-emerald-700">{ocorrencias.length}</span>
                            </div>
                        </div>

                        <div className="flex-shrink-0">
                            <button
                                onClick={() => {
                                    setOcorrenciaSelecionada(null);
                                    setViewMode(false);
                                    setEditMode(false);
                                    setNovaOcorrenciaOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm"
                            >
                                + Adicionar
                            </button>
                        </div>
                    </div>

                    {/* Tabela */}
                    <div className="border rounded-lg overflow-hidden shadow-sm">
                        <table className="min-w-full text-left bg-white text-sm">
                            <thead className="bg-gray-100 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Registro</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Categoria</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Data</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Ocorrência</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500 italic">
                                            Carregando histórico...
                                        </td>
                                    </tr>
                                ) : ocorrencias.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500 italic">
                                            Nenhum registro pedagógico encontrado para este estudante.
                                        </td>
                                    </tr>
                                ) : (
                                    ocorrencias.map((oc) => (
                                        <tr key={oc.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-800">{oc.registro || oc.id}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${categoriaBadge(oc.categoria)}`}>
                                                    {oc.categoria}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{oc.data_ocorrencia}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <div className="font-semibold text-gray-800">{oc.motivo}</div>
                                                {oc.descricao && (
                                                    <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={oc.descricao}>
                                                        {oc.descricao}
                                                    </div>
                                                )}
                                                {Boolean(oc.convocar_responsavel) && (
                                                    <div className="mt-2">
                                                        <span className="inline-block px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full border border-red-200">
                                                            Responsável convocado
                                                        </span>
                                                        {oc.data_comparecimento_responsavel && (
                                                            <span className="inline-block ml-2 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full border border-green-200">
                                                                Compareceu: {oc.data_comparecimento_responsavel}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusBadge(oc.status)}`}>
                                                    {oc.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenFinalizar(oc)}
                                                        disabled={oc.status === "CANCELADA"}
                                                        className={`${
                                                            oc.status === "CANCELADA"
                                                                ? "text-gray-300 cursor-not-allowed"
                                                                : oc.status === "FINALIZADA"
                                                                ? "text-green-600 hover:text-green-800"
                                                                : "text-orange-500 hover:text-orange-700"
                                                        }`}
                                                        title={oc.status === "FINALIZADA" ? "Já finalizado" : "Finalizar"}
                                                    >
                                                        <ClipboardDocumentCheckIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setOcorrenciaSelecionada(oc);
                                                            setViewMode(true);
                                                            setEditMode(false);
                                                            setNovaOcorrenciaOpen(true);
                                                        }}
                                                        className="text-gray-600 hover:text-gray-800"
                                                        title="Visualizar"
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleOpenEdit(oc)} className="text-blue-600 hover:text-blue-800" title="Editar">
                                                        <PencilSquareIcon className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleOpenDelete(oc)} className="text-red-600 hover:text-red-800" title="Excluir">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Legenda — registrado por */}
                    {ocorrencias.some((oc) => oc.nome_usuario_registro) && (
                        <p className="text-xs text-gray-400 mt-3 text-right">
                            Os registros são rastreados por usuário — clique no ícone de visualização para ver detalhes.
                        </p>
                    )}
                </div>
            </div>

            {/* Modal de Criação / Visualização / Edição */}
            <ModalNovaOcorrenciaPedagogica
                open={novaOcorrenciaOpen}
                onClose={() => {
                    setNovaOcorrenciaOpen(false);
                    setOcorrenciaSelecionada(null);
                }}
                aluno={aluno}
                onOcorrenciaCriada={fetchOcorrencias}
                ocorrenciaInicial={ocorrenciaSelecionada}
                readonly={viewMode}
                editMode={editMode}
                perfilUsuario={perfil}
            />

            {/* Modal Finalizar */}
            {modalFinalizarOpen && ocorrenciaParaFinalizar && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">
                                {ocorrenciaParaFinalizar.convocar_responsavel ? "Confirmar Presença" : "Finalizar Registro"}
                            </h2>
                            <button
                                onClick={() => {
                                    setModalFinalizarOpen(false);
                                    setOcorrenciaParaFinalizar(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                {ocorrenciaParaFinalizar.convocar_responsavel
                                    ? <>Confirma a presença do responsável referente ao registro <strong>{ocorrenciaParaFinalizar.registro}</strong>?</>
                                    : <>Deseja finalizar o registro pedagógico <strong>{ocorrenciaParaFinalizar.registro}</strong>?</>}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setModalFinalizarOpen(false);
                                        setOcorrenciaParaFinalizar(null);
                                    }}
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmarFinalizacao}
                                    disabled={registrandoFinalizacao}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {registrandoFinalizacao ? "Finalizando..." : "Finalizar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Info */}
            {modalInfoOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">Aviso</h2>
                            <button onClick={() => setModalInfoOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-6 text-center">{infoMensagem}</p>
                            <div className="flex justify-center">
                                <button onClick={() => setModalInfoOpen(false)} className="px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition shadow-sm">
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Excluir */}
            {modalExcluirOpen && ocorrenciaParaExcluir && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-red-50">
                            <h2 className="text-lg font-bold text-red-800">Confirmar Exclusão</h2>
                            <button
                                onClick={() => {
                                    setModalExcluirOpen(false);
                                    setOcorrenciaParaExcluir(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-6">
                                Tem certeza que deseja excluir o registro pedagógico <strong>{ocorrenciaParaExcluir.registro || ocorrenciaParaExcluir.id}</strong>? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setModalExcluirOpen(false);
                                        setOcorrenciaParaExcluir(null);
                                    }}
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmarExclusao}
                                    disabled={excluindo}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {excluindo ? "Excluindo..." : "Excluir"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
