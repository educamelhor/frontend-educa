// src/features/secretaria/alunos/useAlunos.js

import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

/**
 * Hook para buscar alunos com suporte a filtros.
 *
 * @param {object} filtros
 * @param {number|string} [filtros.anoLetivo]  — Ano letivo (default: servidor calcula o padrão com corte 31/jan)
 * @param {number|string} [filtros.turmaId]    — Filtro por turma
 * @param {string}        [filtros.filtro]     — Busca textual (nome/código)
 * @param {string}        [filtros.status]     — "ativo" | "inativo" | ""
 */
export function useAlunos(filtros = {}) {
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlunos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.anoLetivo) params.ano_letivo = filtros.anoLetivo;
      if (filtros.turmaId) params.turma_id = filtros.turmaId;
      if (filtros.filtro) params.filtro = filtros.filtro;
      if (filtros.status) params.status = filtros.status;

      const res = await api.get("/api/alunos", { params });
      setAlunos(res.data);
    } catch (err) {
      console.error("Erro ao buscar alunos:", err);
    } finally {
      setLoading(false);
    }
  }, [filtros.anoLetivo, filtros.turmaId, filtros.filtro, filtros.status]);

  useEffect(() => {
    fetchAlunos();
  }, [fetchAlunos]);

  return { alunos, loading, reload: fetchAlunos };
}
