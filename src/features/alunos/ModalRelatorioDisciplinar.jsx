import React, { useState, useEffect } from "react";
import {
    XMarkIcon, PencilSquareIcon, TrashIcon, EyeIcon, ClipboardDocumentCheckIcon,
    PrinterIcon, DocumentTextIcon, ExclamationTriangleIcon, ExclamationCircleIcon,
    CheckCircleIcon, UserIcon, IdentificationIcon, ClipboardDocumentListIcon,
    NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { AcademicCapIcon, ShieldExclamationIcon } from "@heroicons/react/24/solid";
import api from "../../services/api";
import ModalNovaOcorrencia from "./ModalNovaOcorrencia";
import ModalTACE from "./ModalTACE";
import ModalConfirmTACE from "../disciplinar/alunos/ModalConfirmTACE";

export default function ModalRelatorioDisciplinar({ open, onClose, aluno }) {
    const [novaOcorrenciaOpen, setNovaOcorrenciaOpen] = useState(false);
    const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null);
    const [viewMode, setViewMode] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [ocorrencias, setOcorrencias] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estados do comparecimento
    const [modalComparecimentoOpen, setModalComparecimentoOpen] = useState(false);
    const [ocorrenciaParaComparecimento, setOcorrenciaParaComparecimento] = useState(null);
    const [registrandoComparecimento, setRegistrandoComparecimento] = useState(false);

    // Estado do Modal de Informação (Padrão)
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [infoMensagem, setInfoMensagem] = useState("");

    // Estados de Exclusão
    const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
    const [ocorrenciaParaExcluir, setOcorrenciaParaExcluir] = useState(null);
    const [excluindo, setExcluindo] = useState(false);

    // Estado do Modal de Confirmação TACE (Art. 22 § 2º)
    const [confirmTaceOpen, setConfirmTaceOpen] = useState(false);

    // Estado do Modal do TACE (preenchimento)
    const [taceModalOpen, setTaceModalOpen] = useState(false);

    // Estados — Impressão de Registro Individual
    const [loadingImpressao, setLoadingImpressao] = useState(false);
    const [modalStatusNaoImprime, setModalStatusNaoImprime] = useState(false);
    const [statusNaoImprime, setStatusNaoImprime] = useState("");
    const [validacaoRegistroOpen, setValidacaoRegistroOpen] = useState(false);
    const [camposAusentesRegistro, setCamposAusentesRegistro] = useState([]);

    useEffect(() => {
        if (open && aluno?.id) {
            fetchOcorrencias();
        }
    }, [open, aluno]);

    const fetchOcorrencias = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/alunos/${aluno.id}/ocorrencias`);
            setOcorrencias(res.data);
        } catch (err) {
            console.error("Erro ao carregar ocorrências", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenComparecimento = (oc) => {
        if (oc.status === 'FINALIZADA' || oc.status === 'Finalizado') {
            setInfoMensagem("Esta ocorrência já está finalizada.");
            setModalInfoOpen(true);
            return;
        }
        if (oc.status === 'CANCELADA') {
            setInfoMensagem("Esta ocorrência foi cancelada e não pode ser finalizada.");
            setModalInfoOpen(true);
            return;
        }
        setOcorrenciaParaComparecimento(oc);
        setModalComparecimentoOpen(true);
    };

    const handleConfirmarComparecimento = async () => {
        if (!ocorrenciaParaComparecimento) return;
        setRegistrandoComparecimento(true);
        try {
            await api.put(`/api/alunos/${aluno.id}/ocorrencias/${ocorrenciaParaComparecimento.id}/comparecimento`);
            fetchOcorrencias();
            setModalComparecimentoOpen(false);
            setOcorrenciaParaComparecimento(null);
        } catch (err) {
            console.error("Erro ao registrar comparecimento:", err);
            alert("Erro ao registrar comparecimento.");
        } finally {
            setRegistrandoComparecimento(false);
        }
    };

    const handleOpenEdit = (oc) => {
        if (oc.status === 'FINALIZADA' || oc.status === 'Finalizado') {
            setInfoMensagem("Ocorrências com o status 'Finalizada' não podem mais ser editadas.");
            setModalInfoOpen(true);
            return;
        }
        if (oc.status === 'CANCELADA') {
            setInfoMensagem("Ocorrências com o status 'Cancelada' não podem mais ser editadas.");
            setModalInfoOpen(true);
            return;
        }
        setOcorrenciaSelecionada(oc);
        setViewMode(false);
        setEditMode(true);
        setNovaOcorrenciaOpen(true);
    };

    const handleOpenDelete = (oc) => {
        if (oc.status === 'FINALIZADA' || oc.status === 'Finalizado' || oc.status === 'CANCELADA') {
            setInfoMensagem("Ocorrências com o status 'Finalizada' ou 'Cancelada' não podem ser excluídas.");
            setModalInfoOpen(true);
            return;
        }

        if (oc.convocar_responsavel) {
            setInfoMensagem("Ocorrências com convocação de responsável pendente não podem ser excluídas.");
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
            await api.delete(`/api/alunos/${aluno.id}/ocorrencias/${ocorrenciaParaExcluir.id}`);
            fetchOcorrencias();
            setModalExcluirOpen(false);
            setOcorrenciaParaExcluir(null);
        } catch (err) {
            console.error("Erro ao excluir ocorrência:", err);
            alert("Erro ao excluir a ocorrência.");
        } finally {
            setExcluindo(false);
        }
    };

    // ==================== PONTUAÇÃO & COMPORTAMENTO ====================
    const PONTUACAO_INICIAL = 8.00;

    // Calcula a pontuação: pontos do BD já possuem sinal correto
    // (negativo para medidas disciplinares, positivo para elogios)
    // Apenas ocorrências com status FINALIZADA afetam a pontuação
    const pontuacaoCalculada = React.useMemo(() => {
        let pontuacao = PONTUACAO_INICIAL;
        for (const oc of ocorrencias) {
            if (oc.status !== 'FINALIZADA' && oc.status !== 'Finalizado') continue;
            const pts = Number(oc.pontos) || 0;
            pontuacao += pts;
        }
        // Limitar entre 0 e 10
        return Math.max(0, Math.min(10, parseFloat(pontuacao.toFixed(2))));
    }, [ocorrencias]);

    // Classifica o comportamento conforme Art. 45
    const getComportamento = (nota) => {
        if (nota >= 10.0) return { label: "I - Excepcional", cor: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
        if (nota >= 9.0)  return { label: "II - Ótimo",      cor: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200" };
        if (nota >= 7.0)  return { label: "III - Bom",       cor: "text-green-700",   bg: "bg-green-50",   border: "border-green-200" };
        if (nota >= 5.0)  return { label: "IV - Regular",    cor: "text-yellow-700",  bg: "bg-yellow-50",  border: "border-yellow-200" };
        if (nota >= 2.0)  return { label: "V - Insuficiente",cor: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200" };
        return               { label: "VI - Incompatível",   cor: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" };
    };

    const comportamento = getComportamento(pontuacaoCalculada);

    // Abre o PDF do TACE
    const abrirTacePDF = () => {
        const token = localStorage.getItem("token");
        const escolaId = localStorage.getItem("escola_id");
        const url = `${api.defaults.baseURL}/tace/${aluno.id}?token=${encodeURIComponent(token)}&escola_id=${encodeURIComponent(escolaId)}`;
        window.open(url, "_blank");
    };

    // Handler "Gerar TACE" com verificação de elegibilidade
    const handleGerarTACE = () => {
        if (pontuacaoCalculada >= 5.0) {
            // Comportamento Regular ou melhor → exige confirmação
            setConfirmTaceOpen(true);
        } else {
            // Insuficiente ou Incompatível → abre modal TACE direto
            setTaceModalOpen(true);
        }
    };
    // ==================================================================

    // ==================== IMPRESSÃO INDIVIDUAL ====================
    const handleImprimirRegistro = async (oc) => {
        // 1) Status CANCELADA ou REGISTRADA → modal premium informando
        const statusUpper = String(oc.status || "").toUpperCase();
        if (statusUpper === "CANCELADA" || statusUpper === "REGISTRADA") {
            setStatusNaoImprime(oc.status);
            setModalStatusNaoImprime(true);
            return;
        }

        // 2) Status FINALIZADA → validar + gerar PDF
        setLoadingImpressao(true);
        try {
            const validRes = await api.get(`/api/relatorio-disciplinar/validar/${aluno.id}/registro/${oc.id}`);
            if (!validRes.data.valido) {
                setCamposAusentesRegistro(validRes.data.ausentes || []);
                setValidacaoRegistroOpen(true);
                return;
            }

            // Tudo OK → abrir PDF do registro individual
            const token = localStorage.getItem("token");
            const escolaId = localStorage.getItem("escola_id");
            const url = `${api.defaults.baseURL}/relatorio-disciplinar/${aluno.id}/registro/${oc.id}?token=${encodeURIComponent(token)}&escola_id=${encodeURIComponent(escolaId)}`;
            window.open(url, "_blank");
        } catch (err) {
            console.error("Erro ao imprimir registro disciplinar:", err);
            alert("Erro ao gerar impressão do registro disciplinar.");
        } finally {
            setLoadingImpressao(false);
        }
    };
    // ==================================================================

    if (!open || !aluno) return null;

    // Usa o mesmo método de buildFotoURL existente
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
                {/* Header do Modal */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-3">
                        <AcademicCapIcon className="h-6 w-6 text-blue-900" />
                        <h2 className="text-xl font-bold text-gray-800">Relatório Disciplinar</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        title="Fechar"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Cabeçalho do Estudante */}
                    <div className="flex items-center gap-6 mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
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

                        {/* Pontuação e Comportamento */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pontuação</span>
                                <span className="text-2xl font-bold text-gray-800">{pontuacaoCalculada.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="w-px h-12 bg-gray-200"></div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comportamento</span>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${comportamento.cor} ${comportamento.bg} ${comportamento.border}`}>
                                    {comportamento.label}
                                </span>
                            </div>
                        </div>

                        <div className="flex-shrink-0 flex flex-col gap-2">
                            <button
                                onClick={handleGerarTACE}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-900 to-blue-700 text-amber-100 font-medium rounded-lg hover:from-blue-800 hover:to-blue-600 transition shadow-sm"
                                title="Gerar Termo de Ajuste de Conduta Escolar (PDF)"
                            >
                                <DocumentTextIcon className="h-5 w-5" />
                                Gerar TACE
                            </button>
                            <button
                                onClick={() => {
                                    setOcorrenciaSelecionada(null);
                                    setViewMode(false);
                                    setEditMode(false);
                                    setNovaOcorrenciaOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
                            >
                                + Adicionar
                            </button>
                        </div>
                    </div>

                    {/* Tabela de Ocorrências / Relatório */}
                    <div className="border rounded-lg overflow-hidden shadow-sm">
                        <table className="min-w-full text-left bg-white text-sm">
                            <thead className="bg-gray-100 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Registro</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Tipo</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Data</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Descrição</th>
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
                                            Nenhum registro disciplinar encontrado para este estudante.
                                        </td>
                                    </tr>
                                ) : (
                                    ocorrencias.map((oc) => (
                                        <tr key={oc.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-800">{oc.registro || oc.id}</td>
                                            <td className="px-4 py-3 text-gray-600 capitalize">{oc.tipo || '-'}</td>
                                            <td className="px-4 py-3 text-gray-600">{oc.data_ocorrencia}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <div className="font-semibold text-gray-800">{oc.motivo}</div>
                                                <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={oc.descricao}>{oc.descricao}</div>
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
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                                    oc.status === 'FINALIZADA' || oc.status === 'Finalizado'
                                                    ? 'text-green-700 bg-green-100 border-green-200'
                                                    : oc.status === 'CANCELADA'
                                                    ? 'text-red-700 bg-red-100 border-red-200'
                                                    : 'text-blue-700 bg-blue-100 border-blue-200'
                                                    }`}>
                                                    {oc.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleImprimirRegistro(oc)}
                                                        disabled={loadingImpressao}
                                                        className={`transition ${loadingImpressao ? 'text-gray-300 cursor-wait' : 'text-gray-500 hover:text-gray-800'}`}
                                                        title="Imprimir Registro"
                                                    >
                                                        <PrinterIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenComparecimento(oc)}
                                                        disabled={oc.status === 'CANCELADA'}
                                                        className={`${
                                                            oc.status === 'CANCELADA'
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : oc.status === 'FINALIZADA' || oc.status === 'Finalizado'
                                                            ? 'text-green-600 hover:text-green-800'
                                                            : 'text-orange-500 hover:text-orange-700'
                                                        }`}
                                                        title={oc.status === 'CANCELADA' ? 'Registro cancelado — não pode ser finalizado' : oc.convocar_responsavel ? "Registrar Comparecimento" : "Finalizar Registro"}
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
                                                        className="text-gray-600 hover:text-gray-800" title="Visualizar ocorrência">
                                                        <EyeIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEdit(oc)}
                                                        className="text-blue-600 hover:text-blue-800" title="Editar ocorrência">
                                                        <PencilSquareIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDelete(oc)}
                                                        className="text-red-600 hover:text-red-800" title="Excluir ocorrência">
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
                </div>
            </div>

            {/* Modal Filha de Criação / Visualização de Ocorrência */}
            <ModalNovaOcorrencia
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
            />

            {/* Modal de Confirmação de Comparecimento */}
            {modalComparecimentoOpen && ocorrenciaParaComparecimento && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">
                                {ocorrenciaParaComparecimento.convocar_responsavel ? "Confirmar Presença" : "Finalizar Registro"}
                            </h2>
                            <button
                                onClick={() => {
                                    setModalComparecimentoOpen(false);
                                    setOcorrenciaParaComparecimento(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition"
                                title="Fechar"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {ocorrenciaParaComparecimento.convocar_responsavel ? (
                                <>
                                    <p className="text-gray-700 mb-4">
                                        Confirma a presença do responsável referente ao registro disciplinar <strong>{ocorrenciaParaComparecimento.registro || ocorrenciaParaComparecimento.id}</strong>?
                                    </p>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Ao confirmar, a data atual será salva no histórico e o registro será encerrado.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-gray-700 mb-4">
                                        Não houve convocação de responsável para o registro <strong>{ocorrenciaParaComparecimento.registro || ocorrenciaParaComparecimento.id}</strong>. Deseja finalizá-lo mesmo assim?
                                    </p>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Ao confirmar, o registro será encerrado permanentemente.
                                    </p>
                                </>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setModalComparecimentoOpen(false);
                                        setOcorrenciaParaComparecimento(null);
                                    }}
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmarComparecimento}
                                    disabled={registrandoComparecimento}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {registrandoComparecimento ? "Confirmando..." : (ocorrenciaParaComparecimento.convocar_responsavel ? "Confirmar Presença" : "Finalizar")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Informação (Aviso) */}
            {modalInfoOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">Aviso</h2>
                            <button
                                onClick={() => setModalInfoOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition"
                                title="Fechar"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-6 text-center">
                                {infoMensagem}
                            </p>
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setModalInfoOpen(false)}
                                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-sm"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
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
                                title="Fechar"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-6">
                                Tem certeza que deseja excluir o registro disciplinar <strong>{ocorrenciaParaExcluir.registro || ocorrenciaParaExcluir.id}</strong>? Esta ação não pode ser desfeita.
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

            {/* Modal de Confirmação TACE (Art. 22 § 2º) */}
            <ModalConfirmTACE
                open={confirmTaceOpen}
                onClose={() => setConfirmTaceOpen(false)}
                onConfirm={() => {
                    setConfirmTaceOpen(false);
                    setTaceModalOpen(true);
                }}
                aluno={aluno}
                pontuacao={pontuacaoCalculada}
            />

            {/* Modal TACE (preenchimento dos campos) */}
            <ModalTACE
                open={taceModalOpen}
                onClose={() => setTaceModalOpen(false)}
                aluno={aluno}
                onSaved={() => {
                    fetchOcorrencias();
                }}
            />

            {/* Loading overlay Impressão de Registro */}
            {loadingImpressao && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3"
                         style={{ animation: "fadeScaleIn 0.2s ease-out" }}>
                        <style>{`
                            @keyframes fadeScaleIn {
                                from { opacity: 0; transform: scale(0.95); }
                                to   { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-sm font-medium text-gray-600">Validando dados para impressão...</p>
                    </div>
                </div>
            )}

            {/* Modal Premium — Status Não Permite Impressão (CANCELADA / REGISTRADA) */}
            {modalStatusNaoImprime && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <style>{`
                        @keyframes premiumSlideIn {
                            from { opacity: 0; transform: scale(0.92) translateY(20px); }
                            to   { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes shimmerGlow {
                            0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.2); }
                            50%      { box-shadow: 0 0 20px 4px rgba(251, 191, 36, 0.1); }
                        }
                    `}</style>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        style={{ animation: "premiumSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
                    >
                        {/* Header gradiente premium */}
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-950" />
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl" />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-orange-400/8 rounded-full blur-2xl" />

                            <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                                        style={{ animation: "shimmerGlow 2s ease-in-out infinite" }}
                                    >
                                        <NoSymbolIcon className="h-7 w-7 text-amber-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white tracking-tight">
                                            Impressão Indisponível
                                        </h2>
                                        <p className="text-amber-300/70 text-xs mt-0.5">
                                            Registro com status: {statusNaoImprime}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setModalStatusNaoImprime(false)}
                                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                                    title="Fechar"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Corpo */}
                        <div className="px-6 py-5 space-y-4">
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200/60">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800 leading-relaxed">
                                    <p className="font-semibold mb-1">Apenas registros com status &ldquo;Finalizada&rdquo; podem ser impressos.</p>
                                    <p className="text-amber-700 text-xs">
                                        Registros com status <strong>&ldquo;{statusNaoImprime}&rdquo;</strong> não
                                        possuem impressão disponível no sistema. Para imprimir, o registro precisa
                                        ser finalizado pela equipe gestora.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end">
                            <button
                                onClick={() => setModalStatusNaoImprime(false)}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-800 to-amber-600 text-white font-semibold text-sm
                                    shadow-md shadow-amber-900/20
                                    hover:from-amber-700 hover:to-amber-500 hover:shadow-lg
                                    active:scale-[0.97]
                                    transition-all duration-200
                                    flex items-center gap-2"
                            >
                                <CheckCircleIcon className="h-5 w-5" />
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Validação Registro Individual — Dados Ausentes */}
            {validacaoRegistroOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <style>{`
                        @keyframes alertSlideIn2 {
                            from { opacity: 0; transform: scale(0.92) translateY(20px); }
                            to   { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes pulseRing2 {
                            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
                            50%      { box-shadow: 0 0 24px 6px rgba(239, 68, 68, 0.15); }
                        }
                        @keyframes slideField2 {
                            from { opacity: 0; transform: translateX(-12px); }
                            to   { opacity: 1; transform: translateX(0); }
                        }
                    `}</style>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        style={{ animation: "alertSlideIn2 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
                    >
                        {/* Header gradiente vermelho */}
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-rose-900 to-orange-950" />
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-orange-500/8 rounded-full blur-2xl" />

                            <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                                        style={{ animation: "pulseRing2 2s ease-in-out infinite" }}
                                    >
                                        <ShieldExclamationIcon className="h-7 w-7 text-red-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white tracking-tight">
                                            Dados Incompletos
                                        </h2>
                                        <p className="text-red-300/70 text-xs mt-0.5">
                                            A impressão do registro não pode ser gerada
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setValidacaoRegistroOpen(false)}
                                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                                    title="Fechar"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Corpo — Lista de campos ausentes */}
                        <div className="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/60">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    <strong>Atenção:</strong> A impressão do registro disciplinar
                                    só poderá ser gerada quando todos os dados abaixo estiverem preenchidos.
                                </p>
                            </div>

                            {camposAusentesRegistro.map((grupo, gi) => {
                                const iconMap = {
                                    Estudante: <UserIcon className="h-4 w-4 text-blue-600" />,
                                    'Responsável Legal': <IdentificationIcon className="h-4 w-4 text-purple-600" />,
                                    'Registro Disciplinar': <ClipboardDocumentListIcon className="h-4 w-4 text-orange-600" />,
                                };
                                const bgMap = {
                                    Estudante: 'bg-blue-100',
                                    'Responsável Legal': 'bg-purple-100',
                                    'Registro Disciplinar': 'bg-orange-100',
                                };
                                return (
                                    <div
                                        key={gi}
                                        className="rounded-xl border border-gray-100 overflow-hidden"
                                        style={{ animation: `slideField2 0.3s ease-out ${gi * 0.1}s both` }}
                                    >
                                        <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                                            <div className={`p-1.5 rounded-lg ${bgMap[grupo.categoria] || 'bg-gray-100'}`}>
                                                {iconMap[grupo.categoria] || <ExclamationCircleIcon className="h-4 w-4 text-gray-600" />}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                                {grupo.categoria}
                                            </span>
                                            <span className="ml-auto text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                                {grupo.campos.length} {grupo.campos.length === 1 ? "campo" : "campos"}
                                            </span>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {grupo.campos.map((campo, ci) => (
                                                <div
                                                    key={ci}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/30 transition"
                                                    style={{ animation: `slideField2 0.3s ease-out ${(gi * 0.1) + (ci * 0.05)}s both` }}
                                                >
                                                    <ExclamationCircleIcon className="h-4 w-4 text-red-400 flex-shrink-0" />
                                                    <span className="text-sm text-gray-700">{campo}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end">
                            <button
                                onClick={() => setValidacaoRegistroOpen(false)}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold text-sm
                                    shadow-md shadow-blue-900/20
                                    hover:from-blue-800 hover:to-blue-600 hover:shadow-lg
                                    active:scale-[0.97]
                                    transition-all duration-200
                                    flex items-center gap-2"
                            >
                                <CheckCircleIcon className="h-5 w-5" />
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
