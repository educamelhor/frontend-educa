import React, { useState, useEffect } from "react";
import {
    XMarkIcon, PencilSquareIcon, TrashIcon, EyeIcon, ClipboardDocumentCheckIcon,
    PrinterIcon, DocumentTextIcon, ExclamationTriangleIcon, ExclamationCircleIcon,
    CheckCircleIcon, UserIcon, IdentificationIcon, ClipboardDocumentListIcon,
    NoSymbolIcon, PhoneIcon, UserGroupIcon, DevicePhoneMobileIcon,
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
    const [bonusMerito, setBonusMerito] = useState({ bonusTotal: 0, totalBonusDias: 0 });

    // Estados do comparecimento
    const [modalComparecimentoOpen, setModalComparecimentoOpen] = useState(false);
    const [ocorrenciaParaComparecimento, setOcorrenciaParaComparecimento] = useState(null);
    const [registrandoComparecimento, setRegistrandoComparecimento] = useState(false);
    const [modoFinalizacao, setModoFinalizacao] = useState('presenca'); // 'presenca' | 'telefone' | 'nao_compareceu'

    // Estado do Modal de Informação (Padrão)
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [infoMensagem, setInfoMensagem] = useState("");

    // Estado do novo Modal de Observações (Internas)
    const [modalObservacaoOpen, setModalObservacaoOpen] = useState(false);
    const [observacaoInterna, setObservacaoInterna] = useState("");

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
    // Modal de aviso — status não finalizado (REGISTRADA) → permite imprimir mesmo assim
    const [modalImprimirNaoFinalOpen, setModalImprimirNaoFinalOpen] = useState(false);
    const [ocorrenciaParaImprimir, setOcorrenciaParaImprimir] = useState(null);

    useEffect(() => {
        if (open && aluno?.id) {
            fetchOcorrencias();
        }
    }, [open, aluno]);

    const fetchOcorrencias = async () => {
        setLoading(true);
        try {
            const [ocRes, meritoRes] = await Promise.all([
                api.get(`/api/alunos/${aluno.id}/ocorrencias`),
                api.get(`/api/relatorio-disciplinar/merito/${aluno.id}`).catch(() => ({ data: { bonusTotal: 0, totalBonusDias: 0 } }))
            ]);
            setOcorrencias(ocRes.data);
            setBonusMerito(meritoRes.data || { bonusTotal: 0, totalBonusDias: 0 });
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
        setModoFinalizacao(oc.convocar_responsavel ? 'presenca' : 'presenca');
        setOcorrenciaParaComparecimento(oc);
        setModalComparecimentoOpen(true);
    };

    const handleConfirmarComparecimento = async () => {
        if (!ocorrenciaParaComparecimento) return;
        setRegistrandoComparecimento(true);
        try {
            await api.put(
                `/api/alunos/${aluno.id}/ocorrencias/${ocorrenciaParaComparecimento.id}/comparecimento`,
                { modo: modoFinalizacao, observacao_interna: observacaoInterna }
            );
            fetchOcorrencias();
            setModalComparecimentoOpen(false);
            setModalObservacaoOpen(false);
            setOcorrenciaParaComparecimento(null);
            setObservacaoInterna("");
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
    // REGISTRADA + FINALIZADA afetam a pontuação; CANCELADA é ignorada
    const pontuacaoCalculada = React.useMemo(() => {
        let pontuacao = PONTUACAO_INICIAL;
        for (const oc of ocorrencias) {
            if (oc.status === 'CANCELADA') continue;
            const pts = Number(oc.pontos) || 0;
            pontuacao += pts;
        }
        // Adiciona bônus de mérito
        pontuacao += Number(bonusMerito.bonusTotal) || 0;
        // Limitar entre 0 e 10
        return Math.max(0, Math.min(10, parseFloat(pontuacao.toFixed(2))));
    }, [ocorrencias, bonusMerito]);

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
    // Executa a impressão (PDF) de um registro — chamado diretamente ou via modal de confirmação
    // skipValidacao = true quando o usuário já confirmou "Imprimir mesmo assim"
    const executarImpressao = async (oc, { skipValidacao = false } = {}) => {
        setLoadingImpressao(true);
        try {
            // Só valida se não for impressão forçada (o usuário já aceitou o aviso)
            if (!skipValidacao) {
                const validRes = await api.get(`/api/relatorio-disciplinar/validar/${aluno.id}/registro/${oc.id}`);
                if (!validRes.data.valido) {
                    setCamposAusentesRegistro(validRes.data.ausentes || []);
                    setOcorrenciaParaImprimir(oc); // salva para permitir imprimir mesmo assim
                    setValidacaoRegistroOpen(true);
                    return;
                }
            }
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

    const handleImprimirRegistro = async (oc) => {
        const statusUpper = String(oc.status || "").toUpperCase();

        // CANCELADA → bloqueia definitivamente
        if (statusUpper === "CANCELADA") {
            setStatusNaoImprime(oc.status);
            setModalStatusNaoImprime(true);
            return;
        }

        // REGISTRADA → avisa (registro não finalizado) e usuário decide
        if (statusUpper === "REGISTRADA") {
            setOcorrenciaParaImprimir(oc);
            setModalImprimirNaoFinalOpen(true);
            return;
        }

        // FINALIZADA → valida dados; se faltar dados mostra modal com opção de imprimir mesmo assim
        await executarImpressao(oc);
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
                                ) : ocorrencias.length === 0 && bonusMerito.bonusTotal === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500 italic">
                                            Nenhum registro disciplinar encontrado para este estudante.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                    {/* Linha de Mérito — sempre no topo se houver bônus */}
                                    {bonusMerito.bonusTotal > 0 && (
                                        <tr className="bg-emerald-50/60 border-l-4 border-emerald-400">
                                            <td className="px-4 py-3 font-medium text-emerald-700">★ Mérito</td>
                                            <td className="px-4 py-3 text-emerald-700 font-semibold">Mérito</td>
                                            <td className="px-4 py-3 text-gray-500 text-sm">—</td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-emerald-700">
                                                    Pontuação positiva por mérito de ausência de reincidência de registro.
                                                </div>
                                                <div className="text-xs text-emerald-600 mt-1">
                                                    🏅 {bonusMerito.totalBonusDias} dias sem registro negativo além do período de carência (60 dias)
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">FINALIZADA</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-emerald-700 font-bold text-sm">+{Number(bonusMerito.bonusTotal).toFixed(2).replace('.', ',')}</span>
                                            </td>
                                        </tr>
                                    )}
                                    {ocorrencias.map((oc) => (
                                        <tr key={oc.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-800">{oc.registro || oc.id}</td>
                                            <td className="px-4 py-3 text-gray-600 capitalize">{oc.tipo || '-'}</td>
                                            <td className="px-4 py-3 text-gray-600">{oc.data_ocorrencia}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <div className="font-semibold text-gray-800">{oc.motivo}</div>
                                                <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={oc.descricao}>{oc.descricao}</div>
                                                {/* Rastreabilidade — quem registrou e quem finalizou */}
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {oc.nome_usuario_registro && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full border border-indigo-200" title="Usuário que registrou">
                                                            <UserIcon className="h-3 w-3" />
                                                            Registrado por: {oc.nome_usuario_registro}
                                                        </span>
                                                    )}
                                                    {oc.nome_usuario_finalizacao && (oc.status === 'FINALIZADA' || oc.status === 'CANCELADA') && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
                                                            oc.status === 'CANCELADA'
                                                            ? 'text-red-700 bg-red-50 border-red-200'
                                                            : 'text-green-700 bg-green-50 border-green-200'
                                                        }`} title={oc.status === 'CANCELADA' ? 'Usuário que cancelou' : 'Usuário que finalizou'}>
                                                            <IdentificationIcon className="h-3 w-3" />
                                                            {oc.status === 'CANCELADA' ? 'Cancelado por:' : 'Finalizado por:'} {oc.nome_usuario_finalizacao}
                                                        </span>
                                                    )}
                                                    {oc.nome_usuario_impressao && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-full border border-purple-200" title="Usuário que imprimiu">
                                                            <PrinterIcon className="h-3 w-3" />
                                                            Impresso por: {oc.nome_usuario_impressao}
                                                        </span>
                                                    )}
                                                    {oc.nome_usuario_edicao && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-full border border-amber-200" title="Usuário que editou por último">
                                                            <PencilSquareIcon className="h-3 w-3" />
                                                            Editado por: {oc.nome_usuario_edicao}
                                                        </span>
                                                    )}
                                                </div>
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
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                                        oc.status === 'FINALIZADA' || oc.status === 'Finalizado'
                                                        ? 'text-green-700 bg-green-100 border-green-200'
                                                        : oc.status === 'CANCELADA'
                                                        ? 'text-red-700 bg-red-100 border-red-200'
                                                        : 'text-blue-700 bg-blue-100 border-blue-200'
                                                        }`}>
                                                        {oc.status}
                                                    </span>
                                                    {(() => {
                                                        try {
                                                            const visList = typeof oc.visualizacoes === 'string' ? JSON.parse(oc.visualizacoes) : oc.visualizacoes;
                                                            if (!Array.isArray(visList) || visList.length === 0) return null;
                                                            return (
                                                                <div className="mt-1 flex flex-col gap-1">
                                                                    {visList.map((vis, idx) => (
                                                                        <span key={idx} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md shadow-sm whitespace-nowrap transition-all hover:bg-emerald-100 hover:shadow" title={`Visualizado em ${vis.data}`}>
                                                                            <div className="relative flex items-center justify-center h-3 w-3">
                                                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                                                              <svg className="relative w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                            </div>
                                                                            <span className="tracking-wide uppercase">{vis.nome ? vis.nome.split(' ')[0] : 'Familiar'} {vis.master ? '(Master)' : ''}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        } catch { return null; }
                                                    })()}
                                                </div>
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
                                                        title={oc.status === 'CANCELADA' ? 'Registro cancelado — não pode ser finalizado' : 'Finalizar Registro'}
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
                                    ))}
                                    </>
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

            {/* Modal Premium — Finalizar Registro / Comparecimento */}
            {modalComparecimentoOpen && ocorrenciaParaComparecimento && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                >
                    <style>{`
                        @keyframes compSlideIn { from { opacity:0; transform:scale(0.92) translateY(20px) } to { opacity:1; transform:scale(1) translateY(0) } }
                        @keyframes compPulse { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,0.25) } 50% { box-shadow:0 0 20px 4px rgba(34,197,94,0.12) } }
                    `}</style>
                    <div
                        className="bg-white w-full max-w-md overflow-hidden flex flex-col"
                        style={{ borderRadius: 20, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)", animation: "compSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
                    >
                        {/* Header premium */}
                        <div className="relative overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 50%, #0f3a1f 100%)" }}>
                            <div style={{ position:"absolute",top:"-40%",right:"-15%",width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(34,197,94,0.15) 0%,transparent 70%)",pointerEvents:"none" }} />
                            <div style={{ position:"absolute",bottom:"-30%",left:"-10%",width:140,height:140,borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)",pointerEvents:"none" }} />
                            <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div style={{ padding:10, borderRadius:14, background:"linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))", border:"1px solid rgba(255,255,255,0.1)", animation:"compPulse 2.5s ease-in-out infinite" }}>
                                        <ClipboardDocumentCheckIcon className="h-6 w-6" style={{ color:"#86efac" }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color:"#fff", fontSize:18, fontWeight:700, margin:0, letterSpacing:"-0.02em", lineHeight:1.3 }}>Finalizar Registro</h2>
                                        <p style={{ color:"rgba(167,243,208,0.8)", fontSize:12, margin:"4px 0 0", lineHeight:1.5 }}>Registro nº {ocorrenciaParaComparecimento.registro || ocorrenciaParaComparecimento.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setModalComparecimentoOpen(false); setOcorrenciaParaComparecimento(null); }}
                                    style={{ padding:8, borderRadius:10, background:"transparent", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", transition:"all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#fff"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.4)"; }}
                                    title="Fechar"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Corpo — Cards de seleção */}
                        <div className="px-6 py-5 space-y-3 overflow-y-auto" style={{ maxHeight: "55vh" }}>
                            <p className="text-sm text-gray-600 mb-1">Selecione o modo de finalização:</p>

                            {/* Card 1 — Confirmar Presença */}
                            <button
                                type="button"
                                onClick={() => setModoFinalizacao('presenca')}
                                className="w-full text-left"
                                style={{
                                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                                    border: modoFinalizacao === 'presenca' ? "2px solid #16a34a" : "1.5px solid #e5e7eb",
                                    background: modoFinalizacao === 'presenca' ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "#fff",
                                    transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 12
                                }}
                            >
                                <div style={{ padding:8, borderRadius:10, background: modoFinalizacao === 'presenca' ? "#16a34a" : "#f3f4f6", flexShrink:0, transition:"all 0.2s" }}>
                                    <CheckCircleIcon className="h-5 w-5" style={{ color: modoFinalizacao === 'presenca' ? "#fff" : "#9ca3af" }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight:600, fontSize:14, color: modoFinalizacao === 'presenca' ? "#15803d" : "#374151", margin:0 }}>Confirmar presença</p>
                                    <p style={{ fontSize:11, color:"#6b7280", margin:"3px 0 0", lineHeight:1.4 }}>O responsável compareceu presencialmente. A data/hora será registrada.</p>
                                </div>
                            </button>

                            {/* Card 2 — Contato via Telefone */}
                            <button
                                type="button"
                                onClick={() => setModoFinalizacao('telefone')}
                                className="w-full text-left"
                                style={{
                                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                                    border: modoFinalizacao === 'telefone' ? "2px solid #2563eb" : "1.5px solid #e5e7eb",
                                    background: modoFinalizacao === 'telefone' ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" : "#fff",
                                    transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 12
                                }}
                            >
                                <div style={{ padding:8, borderRadius:10, background: modoFinalizacao === 'telefone' ? "#2563eb" : "#f3f4f6", flexShrink:0, transition:"all 0.2s" }}>
                                    <PhoneIcon className="h-5 w-5" style={{ color: modoFinalizacao === 'telefone' ? "#fff" : "#9ca3af" }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight:600, fontSize:14, color: modoFinalizacao === 'telefone' ? "#1d4ed8" : "#374151", margin:0 }}>Finalizar após contato via telefone</p>
                                    <p style={{ fontSize:11, color:"#6b7280", margin:"3px 0 0", lineHeight:1.4 }}>Responsável contatado por telefone. Será anotado no registro interno.</p>
                                </div>
                            </button>

                            {/* Card 3 — Responsável Convocado e Não Compareceu */}
                            <button
                                type="button"
                                onClick={() => setModoFinalizacao('nao_compareceu')}
                                className="w-full text-left"
                                style={{
                                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                                    border: modoFinalizacao === 'nao_compareceu' ? "2px solid #dc2626" : "1.5px solid #e5e7eb",
                                    background: modoFinalizacao === 'nao_compareceu' ? "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" : "#fff",
                                    transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 12
                                }}
                            >
                                <div style={{ padding:8, borderRadius:10, background: modoFinalizacao === 'nao_compareceu' ? "#dc2626" : "#f3f4f6", flexShrink:0, transition:"all 0.2s" }}>
                                    <UserGroupIcon className="h-5 w-5" style={{ color: modoFinalizacao === 'nao_compareceu' ? "#fff" : "#9ca3af" }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight:600, fontSize:14, color: modoFinalizacao === 'nao_compareceu' ? "#b91c1c" : "#374151", margin:0 }}>Responsável convocado e não compareceu</p>
                                    <p style={{ fontSize:11, color:"#6b7280", margin:"3px 0 0", lineHeight:1.4 }}>Encerra o registro sem comparecimento. Ficará registrado no histórico.</p>
                                </div>
                            </button>

                            {/* Card 4 — Responsável Não Convocado (tomou conhecimento pelo app) */}
                            <button
                                type="button"
                                onClick={() => setModoFinalizacao('nao_convocado')}
                                className="w-full text-left"
                                style={{
                                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                                    border: modoFinalizacao === 'nao_convocado' ? "2px solid #7c3aed" : "1.5px solid #e5e7eb",
                                    background: modoFinalizacao === 'nao_convocado' ? "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" : "#fff",
                                    transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 12
                                }}
                            >
                                <div style={{ padding:8, borderRadius:10, background: modoFinalizacao === 'nao_convocado' ? "#7c3aed" : "#f3f4f6", flexShrink:0, transition:"all 0.2s" }}>
                                    <DevicePhoneMobileIcon className="h-5 w-5" style={{ color: modoFinalizacao === 'nao_convocado' ? "#fff" : "#9ca3af" }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight:600, fontSize:14, color: modoFinalizacao === 'nao_convocado' ? "#6d28d9" : "#374151", margin:0 }}>Finalizar, responsável não foi convocado</p>
                                    <p style={{ fontSize:11, color:"#6b7280", margin:"3px 0 0", lineHeight:1.4 }}>Responsável tomou conhecimento do registro disciplinar através do aplicativo.</p>
                                </div>
                            </button>
                        </div>

                        {/* Footer premium */}
                        <div style={{ padding:"16px 24px 20px", borderTop:"1px solid #f1f5f9", background:"#fafbfc", flexShrink:0 }}>
                            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => { setModalComparecimentoOpen(false); setOcorrenciaParaComparecimento(null); }}
                                    style={{ flex:1, padding:"11px", borderRadius:12, border:"1.5px solid #e5e7eb", fontSize:14, fontWeight:500, color:"#6b7280", cursor:"pointer", background:"transparent", transition:"all 0.2s" }}
                                    onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"}
                                    onMouseLeave={e => e.currentTarget.style.background="transparent"}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModalObservacaoOpen(true)}
                                    disabled={registrandoComparecimento}
                                    style={{
                                        flex:2, padding:"12px 16px", borderRadius:12, border:"none", fontSize:14, fontWeight:600, color:"#fff",
                                        cursor: registrandoComparecimento ? "not-allowed" : "pointer",
                                        background: registrandoComparecimento ? "#9ca3af" : "linear-gradient(135deg, #14532d, #166534)",
                                        boxShadow: registrandoComparecimento ? "none" : "0 4px 14px rgba(20,83,45,0.3)",
                                        transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                                        opacity: registrandoComparecimento ? 0.7 : 1
                                    }}
                                    onMouseEnter={e => { if(!registrandoComparecimento) { e.currentTarget.style.boxShadow="0 6px 20px rgba(20,83,45,0.4)"; e.currentTarget.style.transform="translateY(-1px)"; } }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow="0 4px 14px rgba(20,83,45,0.3)"; e.currentTarget.style.transform="translateY(0)"; }}
                                >
                                    <CheckCircleIcon className="h-5 w-5" />Avançar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Observações Internas (Intermediário antes de finalizar) */}
            {modalObservacaoOpen && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center p-4"
                    style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                >
                    <style>{`
                        @keyframes obsSlideIn { from { opacity:0; transform:scale(0.92) translateY(20px) } to { opacity:1; transform:scale(1) translateY(0) } }
                    `}</style>
                    <div
                        className="bg-white w-full max-w-md overflow-hidden flex flex-col"
                        style={{ borderRadius: 20, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", animation: "obsSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
                    >
                        <div className="px-6 py-5 border-b flex items-center justify-between" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)" }}>
                            <h2 className="text-lg font-bold text-white m-0 flex items-center gap-2">
                                <ClipboardDocumentListIcon className="h-5 w-5 text-gray-300" />
                                Observações Internas
                            </h2>
                            <button
                                onClick={() => setModalObservacaoOpen(false)}
                                className="text-gray-400 hover:text-white transition"
                                title="Fechar"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-3 font-medium">
                                Deseja adicionar alguma observação sobre esta finalização? (Opcional)
                            </p>
                            <p className="text-xs text-amber-700 font-medium mb-4 bg-amber-50 p-2 rounded-lg border border-amber-200 inline-flex items-center gap-1.5">
                                <span>🔒</span> Registro Interno: visível apenas para a equipe disciplinar. Não sairá em impressões.
                            </p>
                            <textarea
                                value={observacaoInterna}
                                onChange={(e) => setObservacaoInterna(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none"
                                rows={4}
                                placeholder="Digite aqui alguma observação relevante..."
                            />
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setModalObservacaoOpen(false)}
                                disabled={registrandoComparecimento}
                                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarComparecimento}
                                disabled={registrandoComparecimento}
                                className="px-5 py-2 text-white bg-green-600 rounded-xl font-medium hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 shadow-sm"
                            >
                                {registrandoComparecimento ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Finalizando...</>
                                ) : (
                                    <><CheckCircleIcon className="h-5 w-5" /> Finalizar Registro</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Informação (Aviso) — Premium */}
            {modalInfoOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                >
                    <style>{`
                        @keyframes infoAvisoIn { from { opacity:0; transform:scale(0.92) translateY(18px) } to { opacity:1; transform:scale(1) translateY(0) } }
                        @keyframes infoAvisoPulse { 0%,100% { box-shadow:0 0 0 0 rgba(59,130,246,0.25) } 50% { box-shadow:0 0 18px 4px rgba(59,130,246,0.12) } }
                    `}</style>
                    <div
                        className="bg-white w-full max-w-sm overflow-hidden flex flex-col"
                        style={{ borderRadius: 20, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)", animation: "infoAvisoIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
                    >
                        {/* Header premium */}
                        <div className="relative overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f2847 50%, #0a1628 100%)" }}>
                            <div style={{ position:"absolute", top:"-40%", right:"-15%", width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.15) 0%,transparent 70%)", pointerEvents:"none" }} />
                            <div style={{ position:"absolute", bottom:"-30%", left:"-10%", width:120, height:120, borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />
                            <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div style={{ padding:10, borderRadius:12, background:"linear-gradient(135deg,rgba(59,130,246,0.2),rgba(16,185,129,0.15))", border:"1px solid rgba(255,255,255,0.1)", animation:"infoAvisoPulse 2.5s ease-in-out infinite" }}>
                                        <ExclamationTriangleIcon className="h-6 w-6" style={{ color:"#93c5fd" }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color:"#fff", fontSize:17, fontWeight:700, margin:0, letterSpacing:"-0.02em", lineHeight:1.3 }}>Aviso</h2>
                                        <p style={{ color:"rgba(148,163,184,0.8)", fontSize:11, margin:"3px 0 0" }}>Informação do sistema</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setModalInfoOpen(false)}
                                    style={{ padding:8, borderRadius:10, background:"transparent", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", transition:"all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#fff"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.4)"; }}
                                    title="Fechar"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Corpo */}
                        <div className="px-6 py-6">
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 mb-5">
                                <ExclamationTriangleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-800 leading-relaxed">{infoMensagem}</p>
                            </div>
                            <button
                                onClick={() => setModalInfoOpen(false)}
                                className="w-full"
                                style={{ padding:"12px", borderRadius:12, border:"none", fontSize:14, fontWeight:600, color:"#fff", cursor:"pointer", background:"linear-gradient(135deg, #1e3a5f, #0f2847)", boxShadow:"0 4px 14px rgba(15,40,71,0.3)", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow="0 6px 20px rgba(15,40,71,0.4)"; e.currentTarget.style.transform="translateY(-1px)"; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow="0 4px 14px rgba(15,40,71,0.3)"; e.currentTarget.style.transform="translateY(0)"; }}
                            >
                                <CheckCircleIcon className="h-5 w-5" />
                                Entendido
                            </button>
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

            {/* Modal Premium — Status Não Permite Impressão (APENAS CANCELADA) */}
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
                                    <p className="font-semibold mb-1">Registros cancelados não podem ser impressos.</p>
                                    <p className="text-amber-700 text-xs">
                                        Registros com status <strong>&ldquo;{statusNaoImprime}&rdquo;</strong> não possuem
                                        impressão disponível no sistema.
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

            {/* Modal Informativo — Impressão com Status NÃO Finalizado (REGISTRADA) */}
            {modalImprimirNaoFinalOpen && ocorrenciaParaImprimir && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <style>{`
                        @keyframes infoSlideIn {
                            from { opacity: 0; transform: scale(0.92) translateY(20px); }
                            to   { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes infoPulse {
                            0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.25); }
                            50%      { box-shadow: 0 0 20px 4px rgba(59,130,246,0.12); }
                        }
                    `}</style>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        style={{ animation: "infoSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
                    >
                        {/* Header premium — azul informativo */}
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f2847 50%, #0a1628 100%)" }} />
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

                            <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2.5 rounded-xl border"
                                        style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.1)", animation: "infoPulse 2.5s ease-in-out infinite" }}
                                    >
                                        <PrinterIcon className="h-7 w-7 text-blue-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white tracking-tight">
                                            {String(ocorrenciaParaImprimir.status || '').toUpperCase() === 'FINALIZADA'
                                                ? 'Confirmar impressão'
                                                : 'Registro não finalizado'}
                                        </h2>
                                        <p className="text-blue-300/70 text-xs mt-0.5">
                                            Status: <span className="font-semibold text-blue-200">{ocorrenciaParaImprimir.status}</span>
                                             &nbsp;· Registro nº {ocorrenciaParaImprimir.registro || ocorrenciaParaImprimir.id}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setModalImprimirNaoFinalOpen(false); setOcorrenciaParaImprimir(null); }}
                                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                                    title="Fechar"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Corpo informativo */}
                        <div className="px-6 py-5 space-y-4">
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200/60">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800 leading-relaxed space-y-1">
                                    {String(ocorrenciaParaImprimir.status || '').toUpperCase() === 'FINALIZADA' ? (
                                        <>
                                            <p className="font-semibold">Deseja gerar a impressão deste registro?</p>
                                            <p className="text-amber-700 text-xs">
                                                O registro está <strong>Finalizado</strong>. O documento PDF será gerado com todos os dados e assinaturas registradas.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-semibold">Ocorrência em andamento — processo ainda não encerrado</p>
                                            <p className="text-amber-700 text-xs">
                                                Este registro está com status <strong>REGISTRADA</strong>, o que indica que o processo disciplinar ainda não foi
                                                concluído. O documento gerado <strong>não conterá a data de ciência do responsável</strong> nem o
                                                encerramento formal da ocorrência, podendo comprometer sua validade documental.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {String(ocorrenciaParaImprimir.status || '').toUpperCase() !== 'FINALIZADA' && (
                                <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", borderColor: "#bbf7d0" }}>
                                    <span className="text-lg flex-shrink-0" style={{ lineHeight: 1, marginTop: 2 }}>✅</span>
                                    <p className="text-xs leading-relaxed" style={{ color: "#166534" }}>
                                        <strong>Recomendação:</strong> Antes de imprimir, utilize o botão{" "}
                                        <strong>Finalizar Registro</strong> para concluir o processo com o responsável.
                                        Registros finalizados possuem <strong>validade documental completa</strong> e
                                        rastreabilidade institucional garantida.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer com CANCELAR e IMPRIMIR */}
                        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => { setModalImprimirNaoFinalOpen(false); setOcorrenciaParaImprimir(null); }}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm
                                    hover:bg-gray-100 active:scale-[0.97] transition-all duration-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    const oc = ocorrenciaParaImprimir;
                                    setModalImprimirNaoFinalOpen(false);
                                    setOcorrenciaParaImprimir(null);
                                    await executarImpressao(oc, { skipValidacao: true });
                                }}
                                className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2
                                    active:scale-[0.97] transition-all duration-200"
                                style={{ background: "linear-gradient(135deg, #1e3a5f, #0f2847)", boxShadow: "0 4px 14px rgba(15,40,71,0.3)" }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,40,71,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,40,71,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
                            >
                                <PrinterIcon className="h-5 w-5" />
                                {String(ocorrenciaParaImprimir?.status || '').toUpperCase() === 'FINALIZADA'
                                    ? 'Imprimir'
                                    : 'Imprimir mesmo assim'}
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
                                            Cadastro do Responsável Incompleto
                                        </h2>
                                        <p className="text-red-300/70 text-xs mt-0.5">
                                            Dados ausentes identificados no registro
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
                                    <strong>Cadastro incompleto.</strong> O documento PDF deste registro pode ser gerado, porém
                                    estará <strong>parcialmente preenchido</strong> — os dados abaixo estão ausentes e não constarão
                                    na impressão. Atualize o cadastro do responsável para garantir um documento completo e com validade institucional.
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
                        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => { setValidacaoRegistroOpen(false); setOcorrenciaParaImprimir(null); }}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm
                                    hover:bg-gray-100 active:scale-[0.97] transition-all duration-200"
                            >
                                Entendido
                            </button>
                            {ocorrenciaParaImprimir && (
                                <button
                                    onClick={async () => {
                                        const oc = ocorrenciaParaImprimir;
                                        setValidacaoRegistroOpen(false);
                                        setOcorrenciaParaImprimir(null);
                                        await executarImpressao(oc, { skipValidacao: true });
                                    }}
                                    className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2
                                        active:scale-[0.97] transition-all duration-200"
                                    style={{ background: "linear-gradient(135deg, #1e3a5f, #0f2847)", boxShadow: "0 4px 14px rgba(15,40,71,0.3)" }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,40,71,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,40,71,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
                                >
                                    <PrinterIcon className="h-5 w-5" />
                                    Imprimir mesmo assim
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

