import { useState, useEffect } from "react";
import api from "../../services/api";

export function useProfessores() {
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função async para buscar professores
  async function fetchProfessores() {
    try {
      const res = await api.get("/api/professores");
      setProfessores(res.data);
    } catch (err) {
      console.error("Erro ao buscar professores:", err);
    } finally {
      setLoading(false);
    }
  }

  // Executa a busca ao montar o hook
  useEffect(() => {
    fetchProfessores();
  }, []);

  // Expor também um reload para forçar nova busca
  const reload = () => {
    setLoading(true);
    fetchProfessores();
  };

  return { professores, loading, reload };
}
