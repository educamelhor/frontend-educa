// src/features/alunos/useAlunos.js

import { useState, useEffect } from "react";
import api from "../../services/api"; // ajuste o caminho para “api” de acordo com a sua estrutura

export function useAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchAlunos() {
    try {
      const res = await api.get("/api/alunos");
      setAlunos(res.data);
    } catch (err) {
      console.error("Erro ao buscar alunos:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlunos();
  }, []);

  const reload = () => {
    setLoading(true);
    fetchAlunos();
  };

  // **Removi “erro” do return, pois não há estado “erro” aqui**
  return { alunos, loading, reload };
}
