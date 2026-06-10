import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";

// ─── Categorias e Ocorrências pedagógicas — fonte: LISTA_REGISTROS.xlsx ───
const CATEGORIAS_PEDAGOGICAS = [
    {
        categoria: "Rendimento e Participação Pedagógica (Positivo)",
        itens: [
            "Apresenta boa participação nas discussões em sala.",
            "Apresenta bom desempenho nas atividades realizadas.",
            "Apresenta progresso contínuo em seu rendimento escolar.",
            "Busca aprimorar seu desempenho escolar.",
            "Compreende com facilidade os conteúdos trabalhados.",
            "Contribui com ideias durante as atividades.",
            "Demonstra dedicação às atividades propostas.",
            "Demonstra evolução significativa na aprendizagem.",
            "Demonstra interesse pelas atividades propostas.",
            "Esforça-se para superar suas dificuldades.",
            "Mostra persistência diante dos desafios.",
            "Mostra-se envolvido nas propostas pedagógicas.",
            "Participa ativamente das aulas.",
            "Realiza as atividades com autonomia.",
            "Solicita ajuda quando necessário, demonstrando interesse em aprender.",
        ],
    },
    {
        categoria: "Rendimento e Participação Pedagógica (Negativo)",
        itens: [
            "Apresenta baixa participação nas atividades propostas.",
            "Apresenta dificuldade em manter a atenção durante as atividades propostas.",
            "Apresenta dificuldades em seguir instruções sequenciais.",
            "Apresenta dificuldades na compreensão das orientações dadas.",
            "Demonstra baixo rendimento nas atividades avaliativas.",
            "Demonstra dificuldade em aplicar os conteúdos trabalhados.",
            "Demonstra falta de organização na realização das atividades.",
            "Demonstra pouca autonomia na execução das tarefas.",
            "Demonstra pouco interesse em aprimorar seu desempenho escolar.",
            "Demostra ter dificuldades por falta de pré-requisitos.",
            "Estudante dorme em sala de aula.",
            "Evita envolver-se em atividades que exigem maior esforço cognitivo.",
            "Não acompanha o ritmo da turma nas propostas pedagógicas.",
            "Não busca esclarecimento de dúvidas durante as atividades.",
            "Não revisa ou corrige as atividades quando orientado.",
            "Necessita de constante mediação para realizar as atividades.",
            "Necessita de incentivo constante para manter-se engajado.",
            "Realiza as atividades com pouca dedicação e capricho.",
            "Realiza outras atividades durante a aula.",
        ],
    },
    {
        categoria: "Qualidade das Atividades (Positivo)",
        itens: [
            "Apresenta capricho na realização das atividades.",
            "Cumpre os prazos estabelecidos para entrega das atividades.",
            "Demonstra responsabilidade com as tarefas escolares.",
            "Mantém o material organizado.",
            "Registra adequadamente os conteúdos no caderno.",
        ],
    },
    {
        categoria: "Qualidade das Atividades (Negativo)",
        itens: [
            "Apresenta dificuldade em gerenciar o tempo durante as atividades.",
            "Apresenta dificuldade em registrar o conteúdo trabalhado.",
            "Apresenta registros desorganizados no caderno.",
            "Depende excessivamente de apoio para concluir tarefas.",
            "Entrega atividades incompletas ou com baixa qualidade.",
            "Esquece frequentemente de realizar tarefas de casa.",
            "Não cumpre prazos para entrega das atividades.",
            "Não demonstra evolução no desempenho das atividades propostas.",
            "Não mantém organização dos materiais e atividades escolares.",
            "Não mantém regularidade nos registros das atividades.",
            "Realiza as atividades de forma apressada, comprometendo o resultado.",
        ],
    },
    {
        categoria: "Convivência e Atitudes (Positivo)",
        itens: [
            "Contribui para um ambiente harmonioso em sala de aula.",
            "Demonstra atitudes de respeito e colaboração.",
            "Demostra ter hábito de estudo.",
            "É cooperativo nas atividades em grupo.",
            "Mantém bom relacionamento com colegas e professores.",
            "Respeita as normas e combinados da turma.",
        ],
    },
    {
        categoria: "Convivência e Atitudes (Negativo)",
        itens: [
            "Conversa durante as orientações e explicações.",
            "Não contribui para um ambiente harmonioso em sala de aula.",
            "Não demonstra atitudes de respeito e colaboração.",
            "Não demostra ter hábito de estudo.",
            "Não é cooperativo nas atividades em grupo.",
            "Não mantém bom relacionamento com colegas e professores.",
            "Não respeita as normas e combinados da turma.",
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

                    {/* Registro Interno */}
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
