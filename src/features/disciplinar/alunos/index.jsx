import React, { useState, useEffect } from "react";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";
import AlunoTable from "../../secretaria/alunos/AlunoTable";
import Input from "../../../components/ui/Input";

function anoLetivoPadrao() {
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
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
