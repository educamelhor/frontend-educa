import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
    ExclamationTriangleIcon,
    ExclamationCircleIcon,
    XMarkIcon,
    CheckCircleIcon,
    UserIcon,
    IdentificationIcon,
    ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";
import AlunoTable from "../../secretaria/alunos/AlunoTable";
import Input from "../../../components/ui/Input";
import ModalTACE from "../../alunos/ModalTACE";
import ModalConfirmTACE from "./ModalConfirmTACE";
import ModalFichaAluno from "./ModalFichaAluno"; // ⭐ Modal premium independente do módulo Disciplinar

function anoLetivoPadrao() {
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// Calcula pontuação disciplinar:
// REGISTRADA + FINALIZADA contam normalmente
// CANCELADA é ignorada (já não conta positivo nem negativo)
// Art. 46 III: Suspensão = −0,50 por dia (multiplica pelo nº de dias registrado)
function calcularPontuacao(ocorrencias) {
    const PONTUACAO_INICIAL = 8.0;
    let pts = PONTUACAO_INICIAL;
    const lista = Array.isArray(ocorrencias) ? ocorrencias : [];
    for (const oc of lista) {
        if (oc.status === "CANCELADA") continue; // cancelada não conta
        let pontos = Number(oc.pontos) || 0;
        // Suspensão: pontos unitários (−0,50) × dias
        if (String(oc.medida_disciplinar).trim() === 'Suspensão' && Number(oc.dias_suspensao) > 0) {
            pontos = pontos * Number(oc.dias_suspensao);
        }
        pts += pontos;
    }
    return Math.max(0, Math.min(10, parseFloat(pts.toFixed(2))));
}

export default function AlunosDisciplinar() {
    const [manterFiltro, setManterFiltro] = useState(
        () => JSON.parse(localStorage.getItem("manterFiltroDisciplinar") || "false")
    );

    const [filtro, setFiltro] = useState(() => {
        if (JSON.parse(localStorage.getItem("manterFiltroDisciplinar") || "false")) {
            return localStorage.getItem("filtroDisciplinar") || "";
        }
        return "";
    });

    const [debouncedFiltro, setDebouncedFiltro] = useState(filtro);
    const [alunos, setAlunos] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 100;
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState("");

    const [anosLetivos, setAnosLetivos] = useState([]);
    const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());

    // TACE modal
    const [taceOpen, setTaceOpen] = useState(false);
    const [taceAluno, setTaceAluno] = useState(null);

    // Confirmação TACE (pontuação >= 5.0)
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAluno, setConfirmAluno] = useState(null);
    const [confirmPontuacao, setConfirmPontuacao] = useState(8.0);

    // ⭐ Ficha do Estudante — modal premium independente
    const [fichaOpen, setFichaOpen] = useState(false);
    const [fichaCodigo, setFichaCodigo] = useState(null);
    const handleVerFicha = (codigo) => { setFichaCodigo(codigo); setFichaOpen(true); };

    // Validação Relatório Disciplinar (dados ausentes)
    const [validacaoRelOpen, setValidacaoRelOpen] = useState(false);
    const [camposAusentesRel, setCamposAusentesRel] = useState([]);
    const [loadingRelatorio, setLoadingRelatorio] = useState(false);
    const [loadingPontuacao, setLoadingPontuacao] = useState(false);

    useEffect(() => {
        localStorage.setItem("manterFiltroDisciplinar", JSON.stringify(manterFiltro));
        if (!manterFiltro) localStorage.removeItem("filtroDisciplinar");
    }, [manterFiltro]);

    useEffect(() => {
        if (manterFiltro) localStorage.setItem("filtroDisciplinar", filtro);
    }, [filtro, manterFiltro]);

    useEffect(() => {
        const h = setTimeout(() => {
            setDebouncedFiltro(filtro);
            setPage(1);
        }, 400);
        return () => clearTimeout(h);
    }, [filtro]);

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

    function isBuscaInativos(termo) {
        const q = String(termo || "").trim();
        if (!q) return false;
        if (q === "000000") return true;
        const norm = q.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
        return norm.includes("inativo");
    }

    async function fetchAlunos() {
        try {
            setErro("");
            setLoading(true);

            const escolaId = localStorage.getItem("escola_id") || undefined;
            const somenteInativos = isBuscaInativos(debouncedFiltro);

            const params = {
                filtro: somenteInativos ? "" : debouncedFiltro,
                status: somenteInativos ? "inativo" : "",
                ano_letivo: anoLetivo || undefined,
                limit,
                offset: (page - 1) * limit,
                escola_id: escolaId,
            };

            const res = await api.get("/api/alunos", { params });

            let lista = [];
            let totalResp = 0;
            const data = res.data;

            if (Array.isArray(data)) {
                lista = data;
                totalResp = data.length;
            } else if (data && typeof data === "object") {
                lista = data.alunos || [];
                totalResp = Number(data.total || lista.length || 0);
            }

            setAlunos(lista);
            setTotal(totalResp);
        } catch (err) {
            console.error("Erro ao carregar alunos:", err);
            setErro("Erro ao carregar alunos.");
            setAlunos([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAlunos();
    }, [page, debouncedFiltro, anoLetivo]);

    // Auto-abrir modal Relatório Disciplinar via ?aluno=ID&tab=disciplinar
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const alunoId = searchParams.get("aluno");
        const tab = searchParams.get("tab");
        if (!alunoId || tab !== "disciplinar" || alunos.length === 0) return;
        const found = alunos.find((a) => String(a.id) === String(alunoId));
        if (found) {
            setTaceAluno(found);
            setTaceOpen(true);
        }
    }, [alunos, searchParams]);

    // ───────────────────────────────────────────────────────
    // Handler do clique no ícone TACE
    // Busca a pontuação do aluno e decide se exibe confirmação
    // ───────────────────────────────────────────────────────
    async function handleTACEClick(aluno) {
        setLoadingPontuacao(true);
        try {
            const ocRes = await api.get(`/api/alunos/${aluno.id}/ocorrencias`);
            const pontuacao = calcularPontuacao(ocRes.data);

            if (pontuacao >= 5.0) {
                // Comportamento Regular ou melhor → exige confirmação
                setConfirmAluno(aluno);
                setConfirmPontuacao(pontuacao);
                setConfirmOpen(true);
            } else {
                // Insuficiente ou Incompatível → abre direto
                setTaceAluno(aluno);
                setTaceOpen(true);
            }
        } catch (err) {
            console.error("Erro ao verificar pontuação:", err);
            // Em caso de erro, abre direto para não bloquear
            setTaceAluno(aluno);
            setTaceOpen(true);
        } finally {
            setLoadingPontuacao(false);
        }
    }

    // Confirmação aceita → abre o formulário TACE
    function handleConfirmTACE() {
        setConfirmOpen(false);
        setTaceAluno(confirmAluno);
        setTaceOpen(true);
        setConfirmAluno(null);
    }

    // ───────────────────────────────────────────────────────
    // Handler do clique no ícone Relatório Disciplinar
    // Abre o PDF do relatório em nova aba
    // ───────────────────────────────────────────────────────
    async function handleRelatorioDisciplinar(aluno) {
        setLoadingRelatorio(true);
        try {
            // 1) Validar dados antes de gerar PDF
            const validRes = await api.get(`/api/relatorio-disciplinar/validar/${aluno.id}`);
            if (!validRes.data.valido) {
                setCamposAusentesRel(validRes.data.ausentes || []);
                setValidacaoRelOpen(true);
                return;
            }

            // 2) Tudo OK → Abrir o PDF (mesmo padrão do TACE)
            const token = localStorage.getItem("token");
            const escolaId = localStorage.getItem("escola_id");
            const url = `${api.defaults.baseURL}/relatorio-disciplinar/${aluno.id}?token=${encodeURIComponent(token)}&escola_id=${encodeURIComponent(escolaId)}`;
            window.open(url, "_blank");
        } catch (err) {
            console.error("Erro ao gerar Relatório Disciplinar:", err);
            alert("Erro ao gerar o Relatório de Registros Disciplinares.");
        } finally {
            setLoadingRelatorio(false);
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="p-6 bg-blue-50 min-h-screen">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <AcademicCapIcon className="w-8 h-8 text-blue-900" />
                    <h1 className="text-3xl font-bold text-blue-900">Lista de Alunos - Disciplinar</h1>
                </div>
            </div>

            <div className="flex justify-between items-start mb-3">
                {/* Espaço vazio à esquerda (sem os botões de adicionar aqui) */}
                <div></div>

                {/* Card de Filtro (Ano Letivo) */}
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-blue-200">
                    <div className="flex items-center gap-1">
                        <label className="text-sm font-medium text-gray-600">Ano Letivo:</label>
                        <select
                            value={anoLetivo}
                            onChange={(e) => {
                                setAnoLetivo(Number(e.target.value));
                            }}
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-800 outline-none focus:ring focus:border-blue-300"
                        >
                            {[...new Set([...anosLetivos, anoLetivoPadrao()])].sort((a, b) => b - a).map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filtro Texto / Checkbox */}
                <div className="flex flex-col items-end gap-2 w-full max-w-sm">
                    <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            id="manterFiltroD"
                            checked={manterFiltro}
                            onChange={(e) => setManterFiltro(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="manterFiltroD" className="cursor-pointer select-none">
                            Manter filtro
                        </label>
                    </div>
                    <Input
                        placeholder="🔍 Buscar aluno, turma ou digite 'inativo'"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        className="w-full bg-white shadow-sm"
                    />
                </div>
            </div>

            {erro && <p className="text-red-600 font-medium mb-4">{erro}</p>}

            <AlunoTable
                alunos={alunos}
                loading={loading}
                mostrarFicha={true}
                mostrarBoletim={false}
                onEditar={null}
                onDelete={null}
                onView={handleVerFicha}
                onRelatorioDisciplinar={handleRelatorioDisciplinar}
            />

            {/* Loading overlay enquanto busca pontuação */}
            {loadingPontuacao && (
                <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3"
                         style={{ animation: "fadeScaleIn 0.2s ease-out" }}>
                        <style>{`
                            @keyframes fadeScaleIn {
                                from { opacity: 0; transform: scale(0.95); }
                                to   { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
                        <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                        <p className="text-sm font-medium text-gray-600">Verificando elegibilidade...</p>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação TACE (pontuação >= 5.0) */}
            <ModalConfirmTACE
                open={confirmOpen}
                onClose={() => { setConfirmOpen(false); setConfirmAluno(null); }}
                onConfirm={handleConfirmTACE}
                aluno={confirmAluno}
                pontuacao={confirmPontuacao}
            />

            {/* Loading overlay Relatório Disciplinar */}
            {loadingRelatorio && (
                <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3"
                         style={{ animation: "fadeScaleIn 0.2s ease-out" }}>
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-sm font-medium text-gray-600">Validando dados do relatório...</p>
                    </div>
                </div>
            )}

            {/* Modal Validação Relatório Disciplinar — Dados Ausentes */}
            {validacaoRelOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <style>{`
                        @keyframes alertSlideIn {
                            from { opacity: 0; transform: scale(0.92) translateY(20px); }
                            to   { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes pulseRing {
                            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
                            50%      { box-shadow: 0 0 24px 6px rgba(239, 68, 68, 0.15); }
                        }
                        @keyframes slideField {
                            from { opacity: 0; transform: translateX(-12px); }
                            to   { opacity: 1; transform: translateX(0); }
                        }
                    `}</style>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        style={{ animation: "alertSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
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
                                        style={{ animation: "pulseRing 2s ease-in-out infinite" }}
                                    >
                                        <ShieldExclamationIcon className="h-7 w-7 text-red-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white tracking-tight">
                                            Dados Incompletos
                                        </h2>
                                        <p className="text-red-300/70 text-xs mt-0.5">
                                            O Relatório Disciplinar não pode ser gerado
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setValidacaoRelOpen(false)}
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
                                    <strong>Atenção:</strong> O PDF do Relatório de Registros Disciplinares
                                    só poderá ser gerado quando todos os dados abaixo estiverem preenchidos.
                                </p>
                            </div>

                            {camposAusentesRel.map((grupo, gi) => {
                                const iconMap = {
                                    Estudante: <UserIcon className="h-4 w-4 text-blue-600" />,
                                    'Responsável Legal': <IdentificationIcon className="h-4 w-4 text-purple-600" />,
                                    'Registros Disciplinares': <ClipboardDocumentListIcon className="h-4 w-4 text-orange-600" />,
                                };
                                const bgMap = {
                                    Estudante: 'bg-blue-100',
                                    'Responsável Legal': 'bg-purple-100',
                                    'Registros Disciplinares': 'bg-orange-100',
                                };
                                return (
                                    <div
                                        key={gi}
                                        className="rounded-xl border border-gray-100 overflow-hidden"
                                        style={{ animation: `slideField 0.3s ease-out ${gi * 0.1}s both` }}
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
                                                    style={{ animation: `slideField 0.3s ease-out ${(gi * 0.1) + (ci * 0.05)}s both` }}
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
                                onClick={() => setValidacaoRelOpen(false)}
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

            {/* Modal TACE (formulário) */}
            <ModalTACE
                open={taceOpen}
                onClose={() => { setTaceOpen(false); setTaceAluno(null); }}
                aluno={taceAluno}
                onSaved={() => { /* Refresh handled by parent if needed */ }}
            />

            {/* ⭐ Modal Ficha do Estudante — design premium independente do módulo Disciplinar */}
            <ModalFichaAluno
                open={fichaOpen}
                codigo={fichaCodigo}
                onClose={() => { setFichaOpen(false); setFichaCodigo(null); }}
            />

            {/* Paginação */}
            {!loading && total > 0 && (
                <div className="flex gap-2 justify-center mt-4">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="px-2 py-2 text-blue-900 font-bold">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page * limit >= total}
                        className="px-4 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
}
