import React, { useState, useEffect } from "react";
import { XMarkIcon, PencilSquareIcon, TrashIcon, EyeIcon, ClipboardDocumentCheckIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import api from "../../services/api";
import ModalNovaOcorrencia from "./ModalNovaOcorrencia";

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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
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

                        <div className="flex-shrink-0">
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
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${oc.status === 'FINALIZADA' || oc.status === 'Finalizado'
                                                    ? 'text-green-700 bg-green-100 border-green-200'
                                                    : 'text-blue-700 bg-blue-100 border-blue-200'
                                                    }`}>
                                                    {oc.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setInfoMensagem("Em breve essa funcionalidade será ativada.");
                                                            setModalInfoOpen(true);
                                                        }}
                                                        className="text-gray-500 hover:text-gray-800"
                                                        title="Imprimir"
                                                    >
                                                        <PrinterIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenComparecimento(oc)}
                                                        className={`${oc.status === 'FINALIZADA' || oc.status === 'Finalizado' ? 'text-green-600 hover:text-green-800' : 'text-orange-500 hover:text-orange-700'}`}
                                                        title={oc.convocar_responsavel ? "Registrar Comparecimento" : "Finalizar Registro"}
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
        </div>
    );
}
