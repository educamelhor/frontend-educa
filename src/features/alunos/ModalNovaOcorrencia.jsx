import React, { useState } from "react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";

// Mapeamento das opções do dropdown "Medida Disciplinar"
// Para Elogios, separamos Individual/Coletivo pois compartilham o mesmo medida_disciplinar="Elogio" no BD
const MEDIDAS_DROPDOWN = [
    { label: "Advertência Oral",   medida: "Advertência Oral" },
    { label: "Advertência Escrita", medida: "Advertência Escrita" },
    { label: "Suspensão",          medida: "Suspensão" },
    { label: "Ações Educativas",   medida: "Ações Educativas" },
    { label: "Elogio Individual",  medida: "Elogio", tipoFixo: "Individual" },
    { label: "Elogio Coletivo",    medida: "Elogio", tipoFixo: "Coletivo" },
    { label: "Transferência",      medida: "Transferência" },
];

export default function ModalNovaOcorrencia({ open, onClose, aluno, onOcorrenciaCriada, ocorrenciaInicial = null, readonly = false, editMode = false }) {
    const [data, setData] = useState("");
    const [medidaSelecionada, setMedidaSelecionada] = useState("");
    const [tipoSelecionado, setTipoSelecionado] = useState("");
    const [motivo, setMotivo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [convocarResponsavel, setConvocarResponsavel] = useState(false);
    const [diasSuspensao, setDiasSuspensao] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [nextRegistro, setNextRegistro] = useState("");
    const [registrosOcorrencias, setRegistrosOcorrencias] = useState([]);
    const [consultaOpen, setConsultaOpen] = useState(false);
    const [buscaConsulta, setBuscaConsulta] = useState("");
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [cancelando, setCancelando] = useState(false);

    // Obter a definição do dropdown a partir da label selecionada
    const getDefinicao = (label) => MEDIDAS_DROPDOWN.find(m => m.label === label);

    // Filtrar ocorrências com base na medida selecionada
    // O tipo é auto-determinado (cada medida tem exatamente 1 tipo)
    const registrosFiltrados = React.useMemo(() => {
        if (!medidaSelecionada) return [];
        const def = getDefinicao(medidaSelecionada);
        if (!def) return [];

        let filtered = registrosOcorrencias.filter(r =>
            r.medida_disciplinar === def.medida
        );

        // Para Elogios (Individual/Coletivo), filtrar pelo tipoFixo
        if (def.tipoFixo) {
            filtered = filtered.filter(r => r.tipo_ocorrencia === def.tipoFixo);
        }

        return filtered;
    }, [registrosOcorrencias, medidaSelecionada]);

    React.useEffect(() => {
        if (open) {
            // Buscar os registros de ocorrência cadastrados no sistema
            api.get('/api/registros-ocorrencias').then(res => {
               const ativos = res.data.filter(t => t.ativo);
               setRegistrosOcorrencias(ativos);

               if (ocorrenciaInicial && ocorrenciaInicial.motivo) {
                   const found = ativos.find(t => t.descricao_ocorrencia === ocorrenciaInicial.motivo);
                   if (found) {
                       // Reconstruir a label da medida selecionada
                       const medidaDef = MEDIDAS_DROPDOWN.find(m => {
                           if (m.medida !== found.medida_disciplinar) return false;
                           if (m.tipoFixo) return m.tipoFixo === found.tipo_ocorrencia;
                           return true;
                       });
                       if (medidaDef) setMedidaSelecionada(medidaDef.label);
                       setTipoSelecionado(found.tipo_ocorrencia);
                   }
               }
            }).catch(err => console.error("Erro ao buscar registros:", err));

            if (ocorrenciaInicial) {
                let dt = ocorrenciaInicial.data_ocorrencia || "";
                if (dt.includes("/")) {
                    const [dd, mm, yyyy] = dt.split("/");
                    dt = `${yyyy}-${mm}-${dd}`;
                }
                setData(dt || new Date().toISOString().split("T")[0]);

                setMotivo(ocorrenciaInicial.motivo || "");
                setDescricao(ocorrenciaInicial.descricao || "");
                setConvocarResponsavel(Boolean(ocorrenciaInicial.convocar_responsavel));
                setDiasSuspensao(ocorrenciaInicial.dias_suspensao != null ? String(ocorrenciaInicial.dias_suspensao) : "");
            } else {
                setData(new Date().toISOString().split("T")[0]);
                setMedidaSelecionada("");
                setTipoSelecionado("");
                setMotivo("");
                setDescricao("");
                setConvocarResponsavel(false);
                setDiasSuspensao("");
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

    const handleMedidaChange = (label) => {
        setMedidaSelecionada(label);
        setMotivo("");
        setDiasSuspensao("");
        // Auto-determinar o tipo (cada medida tem exatamente 1 tipo)
        const def = getDefinicao(label);
        if (def) {
            if (def.tipoFixo) {
                setTipoSelecionado(def.tipoFixo);
            } else {
                const tipos = [...new Set(
                    registrosOcorrencias
                        .filter(r => r.medida_disciplinar === def.medida)
                        .map(r => r.tipo_ocorrencia)
                )];
                setTipoSelecionado(tipos.length === 1 ? tipos[0] : "");
            }
        } else {
            setTipoSelecionado("");
        }
    };

    // Selecionar registro da consulta e preencher automaticamente o formulário
    const handleSelecionarConsulta = (registro) => {
        // 1. Encontrar a label correta no MEDIDAS_DROPDOWN
        const medidaDef = MEDIDAS_DROPDOWN.find(m => {
            if (m.medida !== registro.medida_disciplinar) return false;
            if (m.tipoFixo) return m.tipoFixo === registro.tipo_ocorrencia;
            return true;
        });

        if (medidaDef) {
            setMedidaSelecionada(medidaDef.label);
        }

        // 2. Definir tipo + ocorrência
        setTipoSelecionado(registro.tipo_ocorrencia || "");
        setMotivo(registro.descricao_ocorrencia || "");
        setDiasSuspensao("");

        // 3. Fechar o modal de consulta
        setConsultaOpen(false);
    };

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
                // Enviar tipo_ocorrencia junto para resolver ambiguidade de Elogios
                const payload = {
                    data,
                    motivo,
                    tipoOcorrencia: tipoSelecionado,
                    descricao,
                    convocarResponsavel
                };
                // Incluir dias de suspensão se a medida for Suspensão
                if (medidaSelecionada === "Suspensão" && diasSuspensao) {
                    payload.diasSuspensao = Number(diasSuspensao);
                }
                await api.post(`/api/alunos/${aluno.id}/ocorrencias`, payload);
            }
            if (onOcorrenciaCriada) onOcorrenciaCriada();
            onClose();
        } catch (err) {
            console.error(err);
            alert(`Erro ao ${editMode ? 'atualizar' : 'registrar'} a medida disciplinar.`);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header fixo */}
                <div className="px-5 py-3 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">
                        {readonly ? "Detalhes da Medida Disciplinar" : editMode ? "Editar Medida Disciplinar" : "Nova Medida Disciplinar"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        title="Fechar"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Corpo com scroll */}
                <form id="formOcorrencia" onSubmit={handleSubmit} className="px-5 py-4 overflow-y-auto space-y-3 flex-1 min-h-0">
                    {/* Registro + Data na mesma linha */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registro</label>
                            <input
                                type="text"
                                disabled
                                value={ocorrenciaInicial ? (ocorrenciaInicial.registro || ocorrenciaInicial.id) : nextRegistro}
                                className="w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                        </div>
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
                    </div>

                    {/* Medida Disciplinar */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Medida Disciplinar</label>
                        {readonly || editMode ? (
                            <input
                                type="text"
                                disabled
                                value={medidaSelecionada}
                                className="w-full border rounded p-2 bg-gray-100 text-gray-600 placeholder-gray-400 cursor-not-allowed"
                            />
                        ) : (
                            <select
                                required
                                value={medidaSelecionada}
                                onChange={(e) => handleMedidaChange(e.target.value)}
                                className="w-full border rounded p-2 focus:ring focus:border-blue-300 outline-none"
                            >
                                <option value="">-- Selecione a medida --</option>
                                {MEDIDAS_DROPDOWN.map(m => (
                                    <option key={m.label} value={m.label}>{m.label}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Tipo de Ocorrência — removido da UI (cada medida tem exatamente 1 tipo)
                       O tipo é auto-determinado pelo handleMedidaChange e salvo internamente */}

                    {/* Ocorrência (filtrada por Tipo de Ocorrência) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ocorrência</label>
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
                                disabled={!medidaSelecionada}
                                className="w-full border rounded p-2 focus:ring focus:border-blue-300 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">-- Selecione uma opção --</option>
                                {registrosFiltrados.map(t => (
                                    <option key={t.id} value={t.descricao_ocorrencia}>{t.descricao_ocorrencia}</option>
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
                            placeholder="Relato detalhado do ocorrido..."
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className={`w-full border rounded p-2 focus:ring focus:border-blue-300 outline-none resize-none ${readonly ? 'bg-gray-100 text-gray-600 placeholder-gray-400 cursor-not-allowed' : ''}`}
                        ></textarea>
                    </div>

                    {/* Checkbox Convocar Responsável */}
                    <div className="flex flex-col gap-2">
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

                        {/* Dias de Suspensão — só aparece quando Medida = Suspensão */}
                        {medidaSelecionada === "Suspensão" && (
                            <div className="mt-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dias de Suspensão</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="3"
                                    required
                                    disabled={readonly}
                                    value={diasSuspensao}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || (Number(val) >= 1 && Number(val) <= 3)) {
                                            setDiasSuspensao(val);
                                        }
                                    }}
                                    placeholder="Informe de 1 a 3 dias"
                                    className={`w-full border rounded p-2 focus:ring focus:border-blue-300 outline-none ${readonly ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        )}

                        {/* Exibir Nome do Usuário que Finalizou */}
                        {readonly && ocorrenciaInicial?.nome_usuario_finalizacao && (
                            <div className="mt-1 p-3 bg-gray-50 border border-gray-100 rounded-md">
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Finalizado por: </span>
                                    {ocorrenciaInicial.nome_usuario_finalizacao}
                                </p>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer fixo com botões */}
                <div className="px-5 py-3 border-t bg-gray-50 flex items-center flex-shrink-0">
                    {!readonly && (
                        <button
                            type="button"
                            onClick={() => { setConsultaOpen(true); setBuscaConsulta(""); }}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition font-medium"
                        >
                            Consultar Medidas Disciplinares
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        {readonly ? (
                            <>
                                {(ocorrenciaInicial?.status === 'FINALIZADA' || 
                                  (ocorrenciaInicial?.status === 'REGISTRADA' && ocorrenciaInicial?.convocar_responsavel)) && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmCancelOpen(true)}
                                        className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition font-medium"
                                    >
                                        Registrar Cancelamento
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                    Fechar Detalhes
                                </button>
                            </>
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
                                    form="formOcorrencia"
                                    disabled={salvando}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {salvando ? (editMode ? "Salvando..." : "Registrando...") : (editMode ? "Salvar Alterações" : "Registrar")}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Consulta de Medidas Disciplinares */}
            {consultaOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-5 py-3 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
                            <h2 className="text-lg font-bold text-gray-800">Consulta de Medidas Disciplinares</h2>
                            <button
                                onClick={() => setConsultaOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition"
                                title="Fechar"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Barra de Pesquisa */}
                        <div className="px-5 py-3 border-b bg-white flex-shrink-0">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar por medida, tipo, descrição ou pontos..."
                                    value={buscaConsulta}
                                    onChange={(e) => setBuscaConsulta(e.target.value)}
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none text-sm transition"
                                />
                            </div>
                        </div>

                        {/* Tabela de resultados */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-gray-100 border-b sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold text-gray-700">Medida Disciplinar</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-700">Tipo</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-700">Descrição da Ocorrência</th>
                                        <th className="px-4 py-2.5 font-semibold text-gray-700 text-center">Pontos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(() => {
                                        const termo = buscaConsulta.toLowerCase().trim();
                                        const filtrados = registrosOcorrencias.filter(r => {
                                            if (!termo) return true;
                                            return (
                                                (r.medida_disciplinar || '').toLowerCase().includes(termo) ||
                                                (r.tipo_ocorrencia || '').toLowerCase().includes(termo) ||
                                                (r.descricao_ocorrencia || '').toLowerCase().includes(termo) ||
                                                String(r.pontos).includes(termo)
                                            );
                                        });

                                        if (filtrados.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500 italic">
                                                        Nenhum registro encontrado.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const corMedida = (medida) => {
                                            const m = (medida || '').toLowerCase();
                                            if (m.includes('advertência oral'))   return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                                            if (m.includes('advertência escrita')) return 'bg-orange-100 text-orange-800 border-orange-200';
                                            if (m.includes('suspensão'))           return 'bg-red-100 text-red-800 border-red-200';
                                            if (m.includes('ações educativas'))    return 'bg-purple-100 text-purple-800 border-purple-200';
                                            if (m.includes('elogio'))              return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                                            if (m.includes('transferência'))       return 'bg-gray-200 text-gray-800 border-gray-300';
                                            return 'bg-gray-100 text-gray-700 border-gray-200';
                                        };

                                        return filtrados.map(r => (
                                            <tr
                                                key={r.id}
                                                className="hover:bg-blue-50 transition cursor-pointer"
                                                onClick={() => handleSelecionarConsulta(r)}
                                                title="Clique para selecionar esta ocorrência"
                                            >
                                                <td className="px-4 py-2.5">
                                                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border cursor-pointer hover:scale-105 hover:shadow-sm transition-transform ${corMedida(r.medida_disciplinar)}`}>
                                                        {r.medida_disciplinar}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-600 capitalize">{r.tipo_ocorrencia}</td>
                                                <td className="px-4 py-2.5 text-gray-700">{r.descricao_ocorrencia}</td>
                                                <td className={`px-4 py-2.5 text-center font-semibold ${
                                                    Number(r.pontos) > 0 ? 'text-emerald-600' : Number(r.pontos) < 0 ? 'text-red-600' : 'text-gray-500'
                                                }`}>
                                                    {Number(r.pontos) > 0 ? '+' : ''}{Number(r.pontos).toFixed(1)}
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
                            <span className="text-xs text-gray-500">
                                {registrosOcorrencias.length} registro(s) cadastrado(s)
                            </span>
                            <button
                                type="button"
                                onClick={() => setConsultaOpen(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Confirmação de Cancelamento */}
            {confirmCancelOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b bg-red-50">
                            <h3 className="text-lg font-bold text-red-800">Confirmar Cancelamento</h3>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                Tem certeza que deseja <strong>cancelar</strong> esta medida disciplinar?
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                A pontuação correspondente será revertida e o seu nome será registrado como responsável pelo cancelamento.
                            </p>
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
                                        await api.put(`/api/alunos/${aluno.id}/ocorrencias/${ocorrenciaInicial.id}/cancelamento`);
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
