// src/features/secretaria/responsaveis/index.jsx
// ────────────────────────────────────────────────────────────────
// Lista de Responsáveis (Secretaria)
// - Busca responsáveis vinculados a alunos da escola
// - Debounce no filtro de busca
// - Paginação
// - Colunas: RE | Aluno | Responsável | CPF | Ações
// ────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import {
  UserGroupIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import api from "../../../services/api";

// ── Helper: ano letivo padrão (espelha lógica do backend) ──
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

// ── Formatar CPF: 000.000.000-00 ──
function formatarCPF(cpf) {
  if (!cpf) return "—";
  const digits = String(cpf).replace(/\D/g, "").padStart(11, "0");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function ListaResponsaveis() {
  // ── Filtro ──
  const [filtro, setFiltro] = useState("");
  const [debouncedFiltro, setDebouncedFiltro] = useState("");

  // ── Dados ──
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 100;
  const [loading, setLoading] = useState(true);

  // ── Ano Letivo ──
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());

  // ── Debounce (400ms) ──
  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedFiltro(filtro);
      setPage(1);
    }, 400);
    return () => clearTimeout(h);
  }, [filtro]);

  // ── Carregar anos letivos ──
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

  // ── Buscar responsáveis ──
  async function fetchResponsaveis() {
    try {
      setLoading(true);
      const params = {
        filtro: debouncedFiltro || undefined,
        ano_letivo: anoLetivo || undefined,
        limit,
        offset: (page - 1) * limit,
      };

      const res = await api.get("/api/responsaveis/secretaria", { params });
      const data = res.data || {};
      setRegistros(data.rows || []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      console.error("Erro ao carregar responsáveis:", err);
      setRegistros([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResponsaveis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedFiltro, anoLetivo]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="w-8 h-8 text-blue-900" />
          <h1 className="text-3xl font-bold text-blue-900">
            Lista de Responsáveis
          </h1>
        </div>
      </div>

      {/* Controles: Ano Letivo + Busca */}
      <div className="flex justify-between items-start mb-3">
        {/* Filtro de Ano Letivo */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-blue-200">
          <div className="flex items-center gap-1">
            <label htmlFor="filtro-ano-resp" className="text-sm text-gray-600 whitespace-nowrap">Ano Letivo:</label>
            <select
              id="filtro-ano-resp"
              value={anoLetivo}
              onChange={(e) => { setAnoLetivo(Number(e.target.value)); setPage(1); }}
              className="border rounded px-2 py-1 text-sm text-gray-800"
            >
              {anosLetivos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Busca à direita */}
        <div className="flex flex-col items-end gap-2">
          <input
            type="text"
            placeholder="🔍 Buscar responsável, aluno ou CPF"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse mt-4">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 border text-center">RE</th>
              <th className="p-2 border text-center">Aluno</th>
              <th className="p-2 border text-center">Responsável</th>
              <th className="p-2 border text-center">CPF</th>
              <th className="p-2 border text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Carregando responsáveis…
                </td>
              </tr>
            ) : registros.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Nenhum responsável encontrado.
                </td>
              </tr>
            ) : (
              registros.map((reg) => (
                <tr key={reg.vinculo_id} className="hover:bg-blue-50">
                  <td className="p-2 border text-center font-medium">
                    {reg.re || "—"}
                  </td>
                  <td className="p-2 border text-left">
                    {(reg.aluno || "").toUpperCase()}
                  </td>
                  <td className="p-2 border text-left">
                    {(reg.responsavel || "").toUpperCase()}
                  </td>
                  <td className="p-2 border text-center font-mono text-sm">
                    {formatarCPF(reg.cpf)}
                  </td>
                  <td className="p-2 border text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        title="Visualizar"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Editar"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        title="Remover vínculo"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
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
    </div>
  );
}
