import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";

export default function ModalNovaOcorrencia({ open, onClose, aluno, onOcorrenciaCriada, ocorrenciaInicial = null, readonly = false, editMode = false }) {
    const [data, setData] = useState("");
    const [motivo, setMotivo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [convocarResponsavel, setConvocarResponsavel] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [nextRegistro, setNextRegistro] = useState("");

    React.useEffect(() => {
        if (open) {
            if (ocorrenciaInicial) {
                // Se o backend retorna YYYY-MM-DD, já estará OK para o input type date
                // Mas se precisar converter, fazemos isso. Vamos usar data_ocorrencia ou raw
                // Se data_ocorrencia vier DD/MM/YYYY, o input type date buga. Vamos tentar separar e remontar se necessário.
                let dt = ocorrenciaInicial.data_ocorrencia || "";
                if (dt.includes("/")) {
                    const [dd, mm, yyyy] = dt.split("/");
                    dt = `${yyyy}-${mm}-${dd}`;
                }
                setData(dt || new Date().toISOString().split("T")[0]);

                // Mapear motivo. Pode ser q não esteja na lista default, mas no select vamos forçar renderizar se não encontrar
                setMotivo(ocorrenciaInicial.motivo || "");
                setDescricao(ocorrenciaInicial.descricao || "");
                setConvocarResponsavel(Boolean(ocorrenciaInicial.convocar_responsavel));
            } else {
                setData(new Date().toISOString().split("T")[0]);
                setMotivo("");
                setDescricao("");
                setConvocarResponsavel(false);
                setNextRegistro("Carregando...");
                if (aluno?.id) {
                    api.get(`/api/alunos/${aluno.id}/proxima-ocorrencia`)
                        .then(res => setNextRegistro(res.data.proximoRegistro))
                        .catch(err => setNextRegistro("N/A"));
                }
            }
        }
    }, [open, ocorrenciaInicial, aluno]);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            if (editMode && ocorrenciaInicial) {
                await api.put(`/api/alunos/${aluno.id}/ocorrencias/${ocorrenciaInicial.id}`, {
                    descricao,
                    convocarResponsavel
                });
            } else {
                await api.post(`/api/alunos/${aluno.id}/ocorrencias`, {
                    data,
                    motivo,
                    descricao,
                    convocarResponsavel
                });
            }
            // Opcionalmente recarregar tbm
            if (onOcorrenciaCriada) onOcorrenciaCriada();
            onClose();
        } catch (err) {
            console.error(err);
            alert(`Erro ao ${editMode ? 'atualizar' : 'registrar'} a ocorrência.`);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {readonly ? "Detalhes da Ocorrência" : editMode ? "Editar Ocorrência" : "Nova Ocorrência Disciplinar"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        title="Fechar"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    {/* Registro */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registro</label>
                        <input
                            type="text"
                            disabled
                            value={ocorrenciaInicial ? (ocorrenciaInicial.registro || ocorrenciaInicial.id) : nextRegistro}
                            className="w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                    </div>

                    {/* Data */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data da Ocorrência</label>
                        <input
                            type="date"
                            required
                            disabled={readonly || editMode}
                            value={data}
                            onChange={(e) => setData(e.target.value)}
                            className={`w-full border rounded p-2 focus:ring focus:border-blue-300 outline-none ${readonly || editMode ? 'bg-gray-100 text-gray-600 placeholder-gray-400 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    {/* Opções pré-definidas */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ocorrência</label>
                        {readonly || editMode ? (
                            <input
                                type="text"
                                disabled
                                value={motivo}
                                className="w-full border rounded p-2 bg-gray-100 text-gray-600 placeholder-gray-400 cursor-not-allowed"
                            />
                        ) : (
                            <select
                                required
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                className="w-full border rounded p-2 focus:ring focus:border-blue-300 outline-none"
                            >
                                <option value="">-- Selecione uma opção --</option>
                                <option value="Sair da sala sem autorização do professor">Sair da sala sem autorização do professor</option>
                                <option value="Chegar atrasado após o intervalo">Chegar atrasado após o intervalo</option>
                                <option value="Atrapalhando aula com conversa">Atrapalhando aula com conversa</option>
                                <option value="Desrespeito aos colegas/professores">Desrespeito aos colegas/professores</option>
                                <option value="Uso de celular em sala">Uso de celular indevido em sala</option>
                                <option value="Outros">Outros</option>
                            </select>
                        )}
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <textarea
                            required
                            disabled={readonly}
                            rows="4"
                            placeholder="Relato detalhado do ocorrido..."
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className={`w-full border rounded p-2 focus:ring focus:border-blue-300 outline-none resize-none ${readonly ? 'bg-gray-100 text-gray-600 placeholder-gray-400 cursor-not-allowed' : ''}`}
                        ></textarea>
                    </div>

                    {/* Checkbox Convocar Responsável */}
                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="convocarResp"
                                disabled={readonly}
                                checked={convocarResponsavel}
                                onChange={(e) => setConvocarResponsavel(e.target.checked)}
                                className={`w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${readonly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            />
                            <label htmlFor="convocarResp" className={`text-sm font-medium text-gray-700 select-none ${readonly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                Convocar Responsável
                            </label>
                        </div>
                        {/* Exibir Nome do Usuário que Finalizou */}
                        {readonly && ocorrenciaInicial?.nome_usuario_finalizacao && (
                            <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-md">
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Finalizado por: </span>
                                    {ocorrenciaInicial.nome_usuario_finalizacao}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Botões */}
                    <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
                        {readonly ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                Fechar Detalhes
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {salvando ? (editMode ? "Salvando..." : "Registrando...") : (editMode ? "Salvar Alterações" : "Registrar")}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
