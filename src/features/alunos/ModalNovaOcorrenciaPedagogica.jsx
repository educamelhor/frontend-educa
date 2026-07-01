import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";

// ─── Lista MOCK provisória de categorias e ocorrências pedagógicas ───
const CATEGORIAS_PEDAGOGICAS = [
    {
        categoria: "Desempenho Acadêmico",
        itens: [
            "Dificuldade de aprendizagem persistente",
            "Baixo rendimento em avaliações",
            "Não realiza atividades em sala",
            "Não entrega tarefas/trabalhos",
            "Progresso significativo na disciplina",
            "Destaque em atividade avaliativa",
        ],
    },
    {
        categoria: "Comportamento em Sala",
        itens: [
            "Falta de atenção/concentração recorrente",
            "Uso indevido de celular em aula",
            "Conversa excessiva durante a aula",
            "Recusa em participar de atividades",
            "Participação exemplar na aula",
            "Colaboração positiva com colegas",
        ],
    },
    {
        categoria: "Frequência e Pontualidade",
        itens: [
            "Faltas consecutivas sem justificativa",
            "Atrasos recorrentes",
            "Saídas antecipadas frequentes",
            "Evasão de aula (saiu sem autorização)",
            "Frequência regular e comprometida",
        ],
    },
    {
        categoria: "Socioemocional",
        itens: [
            "Dificuldade de socialização",
            "Comportamento de isolamento",
            "Sinais de ansiedade ou estresse",
            "Conflito recorrente com colegas",
            "Demonstração de empatia e solidariedade",
            "Melhora perceptível na convivência",
        ],
    },
    {
        categoria: "Necessidades Especiais",
        itens: [
            "Necessidade de atendimento individualizado",
            "Adequação curricular necessária",
            "Encaminhamento para equipe multidisciplinar",
            "Adaptação de atividades/provas",
            "Evolução no plano educacional individualizado",
        ],
    },
    {
        categoria: "Outros",
        itens: [
            "Ocorrência não categorizada",
            "Observação geral do professor",
        ],
    },
];

export default function ModalNovaOcorrenciaPedagogica({
    open,
    onClose,
    aluno,
    onOcorrenciaCriada,
    ocorrenciaInicial = null,
    readonly = false,
    editMode = false,
    perfilUsuario = "",
}) {
    const [data, setData] = useState("");
    const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
    const [motivo, setMotivo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [registroInterno, setRegistroInterno] = useState("");
    const [convocarResponsavel, setConvocarResponsavel] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [nextRegistro, setNextRegistro] = useState("");
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [cancelando, setCancelando] = useState(false);

    // Perfis que podem convocar responsável
    const isPerfConvocacao = ["coordenador", "supervisor", "diretor", "vice_diretor", "diretor_disciplinar"].includes(perfilUsuario);

    // Professor não visualiza Descrição nem Registro Interno
    const isProfessor = String(perfilUsuario || "").toLowerCase().trim() === "professor";

    // Itens filtrados pela categoria selecionada
    const itensFiltrados = React.useMemo(() => {
        if (!categoriaSelecionada) return [];
        const cat = CATEGORIAS_PEDAGOGICAS.find((c) => c.categoria === categoriaSelecionada);
        return cat ? cat.itens : [];
    }, [categoriaSelecionada]);

    useEffect(() => {
        if (open) {
            if (ocorrenciaInicial) {
                let dt = ocorrenciaInicial.data_ocorrencia || "";
                if (dt.includes("/")) {
                    const [dd, mm, yyyy] = dt.split("/");
                    dt = `${yyyy}-${mm}-${dd}`;
                }
                setData(dt || new Date().toISOString().split("T")[0]);
                setCategoriaSelecionada(ocorrenciaInicial.categoria || "");
                setMotivo(ocorrenciaInicial.motivo || "");
                setDescricao(ocorrenciaInicial.descricao || "");
                setRegistroInterno(ocorrenciaInicial.registro_interno || "");
                setConvocarResponsavel(Boolean(ocorrenciaInicial.convocar_responsavel));
            } else {
                setData(new Date().toISOString().split("T")[0]);
                setCategoriaSelecionada("");
                setMotivo("");
                setDescricao("");
                setRegistroInterno("");
                setConvocarResponsavel(false);
                setNextRegistro("...");
                if (aluno?.id) {
                    api.get(`/api/alunos/${aluno.id}/proxima-ocorrencia-pedagogica`)
                        .then((res) => setNextRegistro(res.data.proximoRegistro))
                        .catch(() => setNextRegistro("N/A"));
                }
            }
        }
    }, [open, ocorrenciaInicial, aluno]);

    if (!open) return null;

    const handleCategoriaChange = (cat) => {
        setCategoriaSelecionada(cat);
        setMotivo("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            if (editMode && ocorrenciaInicial) {
                await api.put(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas/${ocorrenciaInicial.id}`, {
                    descricao,
                    registroInterno,
                    convocarResponsavel,
                });
            } else {
                await api.post(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas`, {
                    data,
                    categoria: categoriaSelecionada,
                    motivo,
                    descricao,
                    registroInterno,
                    convocarResponsavel,
                });
            }
            if (onOcorrenciaCriada) onOcorrenciaCriada();
            onClose();
        } catch (err) {
            console.error(err);
            alert(`Erro ao ${editMode ? "atualizar" : "registrar"} o registro pedagógico.`);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-5 py-3 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50 flex-shrink-0">
                    <h2 className="text-lg font-bold text-emerald-900">
                        {readonly ? "Detalhes do Registro Pedagógico" : editMode ? "Editar Registro Pedagógico" : "Novo Registro Pedagógico"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" title="Fechar">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <form id="formPedagogica" onSubmit={handleSubmit} className="px-5 py-4 overflow-y-auto space-y-3 flex-1 min-h-0">
                    {/* Registro + Data */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registro</label>
                            <input
                                type="text"
                                disabled
                                value={ocorrenciaInicial ? ocorrenciaInicial.registro || ocorrenciaInicial.id : nextRegistro}
                                className="w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                            <input
                                type="date"
                                required
                                disabled={readonly || editMode}
                                value={data}
                                onChange={(e) => setData(e.target.value)}
                                className={`w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none ${readonly || editMode ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
                            />
                        </div>
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                        {readonly || editMode ? (
                            <input type="text" disabled value={categoriaSelecionada} className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed" />
                        ) : (
                            <select
                                required
                                value={categoriaSelecionada}
                                onChange={(e) => handleCategoriaChange(e.target.value)}
                                className="w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none"
                            >
                                <option value="">-- Selecione a categoria --</option>
                                {CATEGORIAS_PEDAGOGICAS.map((c) => (
                                    <option key={c.categoria} value={c.categoria}>
                                        {c.categoria}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Ocorrência */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ocorrência</label>
                        {readonly || editMode ? (
                            <input type="text" disabled value={motivo} className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed" />
                        ) : (
                            <select
                                required
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                disabled={!categoriaSelecionada}
                                className="w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">-- Selecione --</option>
                                {itensFiltrados.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Descrição */}
                    {!isProfessor && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea
                                disabled={readonly}
                                rows="3"
                                placeholder="Relato detalhado da situação pedagógica..."
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                className={`w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none resize-none ${readonly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
                            />
                        </div>
                    )}

                    {/* Registro Interno */}
                    {!isProfessor && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Registro Interno
                                {!readonly && <span className="ml-1 text-xs text-gray-400 font-normal">(uso interno — não será impresso)</span>}
                            </label>
                            <textarea
                                disabled={readonly}
                                rows="2"
                                placeholder="Anotações internas..."
                                value={registroInterno}
                                onChange={(e) => setRegistroInterno(e.target.value)}
                                className={`w-full border rounded p-2 focus:ring focus:border-emerald-300 outline-none resize-none ${readonly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
                            />
                        </div>
                    )}

                    {/* Convocar Responsável — só coord/supervisor/direção */}
                    {isPerfConvocacao && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="convocarRespPed"
                                disabled={readonly}
                                checked={convocarResponsavel}
                                onChange={(e) => setConvocarResponsavel(e.target.checked)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="convocarRespPed" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                Convocar Responsável
                            </label>
                        </div>
                    )}

                    {/* Registrado por / Finalizado por */}
                    {readonly && ocorrenciaInicial?.nome_usuario_registro && (
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-md">
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Registrado por: </span>
                                {ocorrenciaInicial.nome_usuario_registro}
                            </p>
                            {ocorrenciaInicial.nome_usuario_finalizacao && (
                                <p className="text-sm text-gray-700 mt-1">
                                    <span className="font-semibold">Finalizado por: </span>
                                    {ocorrenciaInicial.nome_usuario_finalizacao}
                                </p>
                            )}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="px-5 py-3 border-t bg-gray-50 flex items-center flex-shrink-0">
                    <div className="flex gap-3 ml-auto">
                        {readonly ? (
                            <>
                                {(ocorrenciaInicial?.status === "FINALIZADA" || ocorrenciaInicial?.status === "REGISTRADA") &&
                                    ocorrenciaInicial?.status !== "CANCELADA" &&
                                    isPerfConvocacao && (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmCancelOpen(true)}
                                            className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition font-medium"
                                        >
                                            Registrar Cancelamento
                                        </button>
                                    )}
                                <button type="button" onClick={onClose} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition">
                                    Fechar Detalhes
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 transition">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    form="formPedagogica"
                                    disabled={salvando}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    {salvando ? (editMode ? "Salvando..." : "Registrando...") : editMode ? "Salvar Alterações" : "Registrar"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Cancelamento */}
            {confirmCancelOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b bg-red-50">
                            <h3 className="text-lg font-bold text-red-800">Confirmar Cancelamento</h3>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                Tem certeza que deseja <strong>cancelar</strong> este registro pedagógico?
                            </p>
                            <p className="text-sm text-gray-500 mt-2">O seu nome será registrado como responsável pelo cancelamento.</p>
                        </div>
                        <div className="px-6 py-3 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmCancelOpen(false)}
                                disabled={cancelando}
                                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 transition"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                disabled={cancelando}
                                onClick={async () => {
                                    setCancelando(true);
                                    try {
                                        await api.put(`/api/alunos/${aluno.id}/ocorrencias-pedagogicas/${ocorrenciaInicial.id}/cancelamento`);
                                        setConfirmCancelOpen(false);
                                        if (onOcorrenciaCriada) onOcorrenciaCriada();
                                        onClose();
                                    } catch (err) {
                                        console.error("Erro ao cancelar:", err);
                                        alert("Erro ao registrar o cancelamento.");
                                    } finally {
                                        setCancelando(false);
                                    }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {cancelando ? "Cancelando..." : "Confirmar Cancelamento"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
