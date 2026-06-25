import React, { useState, useEffect } from "react";
import { XMarkIcon, MagnifyingGlassIcon, ShieldExclamationIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import api from "../../../services/api";

// CSS de animações premium (injeção única)
const ANIM_ID = "modal-nova-ocorrencia-anims";
const ANIM_CSS = `
@keyframes novaOcFadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes novaOcSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes novaOcPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.25) } 50% { box-shadow: 0 0 20px 4px rgba(239,68,68,0.12) } }
`;

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
    // Injeta animações premium uma única vez
    useEffect(() => {
        if (document.getElementById(ANIM_ID)) return;
        const el = document.createElement("style");
        el.id = ANIM_ID;
        el.textContent = ANIM_CSS;
        document.head.appendChild(el);
    }, []);
    const [data, setData] = useState("");
    const [medidaSelecionada, setMedidaSelecionada] = useState("");
    const [tipoSelecionado, setTipoSelecionado] = useState("");
    const [motivo, setMotivo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [registroInterno, setRegistroInterno] = useState("");
    const [convocarResponsavel, setConvocarResponsavel] = useState(false);
    const [diasSuspensao, setDiasSuspensao] = useState("");
    const [atenuantes, setAtenuantes] = useState([]);
    const [agravantes, setAgravantes] = useState([]);
    const [circunstanciasOpen, setCircunstanciasOpen] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [nextRegistro, setNextRegistro] = useState("");
    const [registrosOcorrencias, setRegistrosOcorrencias] = useState([]);
    const [consultaOpen, setConsultaOpen] = useState(false);
    const [buscaConsulta, setBuscaConsulta] = useState("");
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [cancelando, setCancelando] = useState(false);
    const [dataConvocacao, setDataConvocacao] = useState('');  // YYYY-MM-DD ou ''

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
                setRegistroInterno(ocorrenciaInicial.registro_interno || "");
                setConvocarResponsavel(Boolean(ocorrenciaInicial.convocar_responsavel));
                // Carregar data de convocação salva (formato dd/mm/yyyy → yyyy-mm-dd)
                if (ocorrenciaInicial.data_convocacao) {
                    const dc = ocorrenciaInicial.data_convocacao;
                    if (dc.includes('/')) {
                        const [dd, mm, yyyy] = dc.split('/');
                        setDataConvocacao(`${yyyy}-${mm}-${dd}`);
                    } else {
                        setDataConvocacao(dc);
                    }
                } else {
                    setDataConvocacao('');
                }
                setDiasSuspensao(ocorrenciaInicial.dias_suspensao != null ? String(ocorrenciaInicial.dias_suspensao) : "");
                // Carregar atenuantes/agravantes salvos
                try { setAtenuantes(JSON.parse(ocorrenciaInicial.atenuantes || '[]')); } catch { setAtenuantes([]); }
                try { setAgravantes(JSON.parse(ocorrenciaInicial.agravantes || '[]')); } catch { setAgravantes([]); }
                setCircunstanciasOpen(
                    (JSON.parse(ocorrenciaInicial.atenuantes || '[]').length > 0) ||
                    (JSON.parse(ocorrenciaInicial.agravantes || '[]').length > 0)
                );
            } else {
                setData(new Date().toISOString().split("T")[0]);
                setMedidaSelecionada("");
                setTipoSelecionado("");
                setMotivo("");
                setDescricao("");
                setRegistroInterno("");
                setConvocarResponsavel(false);
                setDataConvocacao('');
                setDiasSuspensao("");
                setAtenuantes([]);
                setAgravantes([]);
                setCircunstanciasOpen(false);
                setNextRegistro("Carregando...");
                if (aluno?.id) {
                    api.get(`/api/alunos/${aluno.id}/proxima-ocorrencia`)
                        .then(res => setNextRegistro(res.data.proximoRegistro))
                        .catch(err => setNextRegistro("N/A"));
                }
            }
        }
    }, [open, ocorrenciaInicial, aluno]);

    // Medidas que OBRIGAM convocação de responsável (Art. 16, § 1º)
    const MEDIDAS_CONVOCACAO_OBRIGATORIA = ["Suspensão", "Ações Educativas", "Transferência"];
    const convocacaoObrigatoria = MEDIDAS_CONVOCACAO_OBRIGATORIA.includes(medidaSelecionada);

    // Sempre que medidaSelecionada mudar → forçar convocarResponsavel se obrigatória
    React.useEffect(() => {
        if (MEDIDAS_CONVOCACAO_OBRIGATORIA.includes(medidaSelecionada)) {
            setConvocarResponsavel(true);
        }
    }, [medidaSelecionada]);

    if (!open) return null;

    const handleMedidaChange = (label) => {
        setMedidaSelecionada(label);
        setMotivo("");
        setDiasSuspensao("");

        // Se a medida exige convocação obrigatória, marcar automaticamente
        if (MEDIDAS_CONVOCACAO_OBRIGATORIA.includes(label)) {
            setConvocarResponsavel(true);
        } else {
            // Liberar para decisão do militar
            setConvocarResponsavel(false);
        }

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
                    registroInterno,
                    convocarResponsavel,
                    dataConvocacao: dataConvocacao || null,
                    atenuantes,
                    agravantes
                });
            } else {
                // Enviar tipo_ocorrencia junto para resolver ambiguidade de Elogios
                const payload = {
                    data,
                    motivo,
                    tipoOcorrencia: tipoSelecionado,
                    registroInterno,
                    descricao,
                    convocarResponsavel,
                    dataConvocacao: dataConvocacao || null,
                    atenuantes,
                    agravantes
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

    const tituloModal = readonly ? "Detalhes da Medida Disciplinar" : editMode ? "Editar Medida Disciplinar" : "Nova Medida Disciplinar";
    const subtituloModal = readonly ? "Visualização — somente leitura" : editMode ? "Ajuste os dados e salve as alterações" : "Registre uma nova medida disciplinar";

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", animation: "novaOcFadeIn 0.2s ease-out" }}
        >
            <div
                className="bg-white w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                style={{ borderRadius: "20px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)", animation: "novaOcSlideUp 0.3s ease-out" }}
            >
                {/* ═══ HEADER PREMIUM ═══ */}
                <div className="relative overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f2847 50%, #0a1628 100%)" }}>
                    {/* Glows decorativos */}
                    <div style={{ position: "absolute", top: "-40%", right: "-15%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: "-30%", left: "-10%", width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

                    <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                style={{ padding: 10, borderRadius: 14, background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(239,68,68,0.15))", border: "1px solid rgba(255,255,255,0.1)", animation: "novaOcPulse 2.5s ease-in-out infinite" }}
                            >
                                {readonly ? <ShieldExclamationIcon className="h-6 w-6" style={{ color: "#93c5fd" }} /> : <PencilSquareIcon className="h-6 w-6" style={{ color: "#93c5fd" }} />}
                            </div>
                            <div>
                                <h2 style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.3 }}>
                                    {tituloModal}
                                </h2>
                                <p style={{ color: "rgba(148,163,184,0.9)", fontSize: 12, margin: "4px 0 0", lineHeight: 1.5 }}>
                                    {subtituloModal}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ padding: 8, borderRadius: 10, background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", transition: "all 0.2s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                            title="Fechar"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* ═══ CORPO COM SCROLL ═══ */}
                <form id="formOcorrencia" onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-4 flex-1 min-h-0">
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

                    {/* ── Circunstâncias Atenuantes/Agravantes (Arts. 34/35) ────────────── */}
                    {(() => {
                        const ATENUANTES_LIST = [
                            'Aluno novato ≤ 3 meses (Art. 34, I)',
                            'Comportamento Ótimo ou Excepcional ≥ 9,0 (Art. 34, II)',
                            'Primeira falta disciplinar (Art. 34, III)',
                            'Histórico de atividades relevantes na escola (Art. 34, IV)',
                            'Cometida em defesa própria ou de outrem (Art. 34, V)',
                        ];
                        const AGRAVANTES_LIST = [
                            'Chefe de turma (Art. 35, I)',
                            'Comportamento Insuficiente ou Incompatível < 5,0 (Art. 35, II)',
                            'Reincidência em falta da mesma classificação (Art. 35, III)',
                            'Prática simultânea de 2 ou mais faltas (Art. 35, IV)',
                            'Participação coletiva — 2 ou mais alunos (Art. 35, V)',
                            'Abuso de função ou posição de liderança (Art. 35, VI)',
                            'Praticada em público, em forma ou na sala de aula (Art. 35, VII)',
                            'Premeditação no cometimento da falta (Art. 35, VIII)',
                            'Praticada contra chefe de turma (Art. 35, IX)',
                        ];
                        const toggleItem = (list, setList, item) => {
                            setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
                        };
                        const totalMarcadas = atenuantes.length + agravantes.length;
                        return (
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                                {/* Header colapsável */}
                                <button
                                    type="button"
                                    onClick={() => setCircunstanciasOpen(o => !o)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: circunstanciasOpen ? '#f8fafc' : '#f9fafb', border: 'none', cursor: 'pointer', gap: 8 }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                        <span>⚖️</span>
                                        Circunstâncias Atenuantes / Agravantes
                                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>(Arts. 34/35 — opcional)</span>
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {totalMarcadas > 0 && (
                                            <span style={{ fontSize: 11, background: '#6366f1', color: '#fff', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>
                                                {totalMarcadas} marcada{totalMarcadas > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <span style={{ fontSize: 16, color: '#6b7280', transition: 'transform 0.2s', transform: circunstanciasOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
                                    </span>
                                </button>

                                {/* Conteúdo */}
                                {circunstanciasOpen && (
                                    <div style={{ padding: '12px 14px 14px', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        {/* Atenuantes */}
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ width: 10, height: 10, borderRadius: 99, background: '#10b981', display: 'inline-block' }}></span>
                                                Atenuantes
                                            </div>
                                            {ATENUANTES_LIST.map(item => (
                                                <label key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, cursor: readonly ? 'not-allowed' : 'pointer', opacity: readonly ? 0.6 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={readonly}
                                                        checked={atenuantes.includes(item)}
                                                        onChange={() => toggleItem(atenuantes, setAtenuantes, item)}
                                                        style={{ marginTop: 2, accentColor: '#10b981', width: 14, height: 14, flexShrink: 0 }}
                                                    />
                                                    <span style={{ fontSize: 12, color: atenuantes.includes(item) ? '#065f46' : '#374151', lineHeight: 1.4, fontWeight: atenuantes.includes(item) ? 600 : 400 }}>{item}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {/* Agravantes */}
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ width: 10, height: 10, borderRadius: 99, background: '#f59e0b', display: 'inline-block' }}></span>
                                                Agravantes
                                            </div>
                                            {AGRAVANTES_LIST.map(item => (
                                                <label key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, cursor: readonly ? 'not-allowed' : 'pointer', opacity: readonly ? 0.6 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={readonly}
                                                        checked={agravantes.includes(item)}
                                                        onChange={() => toggleItem(agravantes, setAgravantes, item)}
                                                        style={{ marginTop: 2, accentColor: '#f59e0b', width: 14, height: 14, flexShrink: 0 }}
                                                    />
                                                    <span style={{ fontSize: 12, color: agravantes.includes(item) ? '#92400e' : '#374151', lineHeight: 1.4, fontWeight: agravantes.includes(item) ? 600 : 400 }}>{item}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Registro Interno — comunicação interna entre militares, não é impresso */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Registro Interno
                            {!readonly && (
                                <span className="ml-1 text-xs text-gray-400 font-normal">(uso interno — não será impresso)</span>
                            )}
                        </label>
                        <textarea
                            disabled={readonly}
                            rows="3"
                            placeholder="Anotações internas entre militares..."
                            value={registroInterno}
                            onChange={(e) => setRegistroInterno(e.target.value)}
                            className={`w-full border rounded p-2 focus:ring focus:border-blue-300 outline-none resize-none ${readonly ? 'bg-gray-100 text-gray-600 placeholder-gray-400 cursor-not-allowed' : ''}`}
                        ></textarea>
                    </div>

                    {/* Checkbox Convocar Responsável + Data de Convocação */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <input
                                type="checkbox"
                                id="convocarResp"
                                disabled={readonly || convocacaoObrigatoria}
                                checked={convocarResponsavel}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setConvocarResponsavel(checked);
                                    if (!checked) setDataConvocacao('');
                                }}
                                className={`w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${readonly || convocacaoObrigatoria ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            />
                            <label htmlFor="convocarResp" className={`text-sm font-medium text-gray-700 select-none ${readonly || convocacaoObrigatoria ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                Convocar Responsável
                            </label>
                            {/* Chip de data se selecionada */}
                            {convocarResponsavel && dataConvocacao && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: '#eff6ff', border: '1px solid #bfdbfe',
                                    borderRadius: 20, padding: '2px 10px',
                                    fontSize: 12, fontWeight: 600, color: '#1d4ed8'
                                }}>
                                    📅 {dataConvocacao.split('-').reverse().join('/')}
                                    {!readonly && (
                                        <button
                                            type="button"
                                            onClick={() => setDataConvocacao('')}
                                            style={{ marginLeft: 4, color: '#93c5fd', fontWeight: 700, fontSize: 14, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                            title="Remover data"
                                        >×</button>
                                    )}
                                </span>
                            )}
                        </div>

                        {/* Calendário — aparece ao marcar o checkbox de convocação */}
                        {convocarResponsavel && !readonly && (
                            <div style={{ marginLeft: 22, marginTop: 6 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                    📅 Data para comparecimento (opcional)
                                </label>
                                <input
                                    type="date"
                                    value={dataConvocacao}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDataConvocacao(e.target.value)}
                                    style={{
                                        border: '1.5px solid #bfdbfe',
                                        borderRadius: 8,
                                        padding: '6px 10px',
                                        fontSize: 13,
                                        color: '#1e3a5f',
                                        background: '#f0f7ff',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        width: 'auto',
                                    }}
                                />
                                {dataConvocacao && (
                                    <button
                                        type="button"
                                        onClick={() => setDataConvocacao('')}
                                        style={{ marginLeft: 8, fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                    >Limpar data</button>
                                )}
                            </div>
                        )}

                        {convocacaoObrigatoria && !readonly && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 ml-6">
                                Convocação obrigatória conforme <strong>Art. 16, § 1º</strong>
                            </p>
                        )}

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

                {/* ═══ FOOTER PREMIUM ═══ */}
                <div style={{ padding: "16px 24px 20px", borderTop: "1px solid #f1f5f9", background: "#fafbfc", flexShrink: 0 }}>
                    {/* Info EDUCA-MOBILE se não for readonly */}
                    {!readonly && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 13px", borderRadius: 10, background: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)", border: "1px solid #bfdbfe", marginBottom: 14, fontSize: 11, color: "#1e40af", lineHeight: 1.5 }}>
                            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>🤖</span>
                            <span>
                                Consultar Medidas Disciplinares disponíveis: <button type="button" onClick={() => { setConsultaOpen(true); setBuscaConsulta(""); }} style={{ background: "none", border: "none", padding: 0, color: "#1d4ed8", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>abrir tabela</button>
                            </span>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        {readonly ? (
                            <>
                                {(ocorrenciaInicial?.status === 'FINALIZADA' ||
                                  (ocorrenciaInicial?.status === 'REGISTRADA' && ocorrenciaInicial?.convocar_responsavel)) && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmCancelOpen(true)}
                                        style={{ flex: 1, padding: "11px 16px", borderRadius: 12, border: "1.5px solid #fecaca", fontSize: 14, fontWeight: 600, color: "#b91c1c", cursor: "pointer", background: "transparent", transition: "all 0.2s" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        Registrar Cancelamento
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{ flex: 2, padding: "12px 16px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg, #1e3a5f, #0f2847)", boxShadow: "0 4px 14px rgba(15,40,71,0.3)", transition: "all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,40,71,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,40,71,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
                                >
                                    Fechar Detalhes
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 14, fontWeight: 500, color: "#6b7280", cursor: "pointer", background: "transparent", transition: "all 0.2s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    form="formOcorrencia"
                                    disabled={salvando}
                                    style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600, color: "#fff", cursor: salvando ? "not-allowed" : "pointer", background: salvando ? "#9ca3af" : "linear-gradient(135deg, #1e3a5f, #0f2847)", boxShadow: salvando ? "none" : "0 4px 14px rgba(15,40,71,0.3)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: salvando ? 0.7 : 1 }}
                                    onMouseEnter={e => { if (!salvando) { e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,40,71,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,40,71,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
                                >
                                    {salvando ? (
                                        <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />{editMode ? "Salvando..." : "Registrando..."}</>
                                    ) : (
                                        <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>{editMode ? "Salvar Alterações" : "Registrar"}</>
                                    )}
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
