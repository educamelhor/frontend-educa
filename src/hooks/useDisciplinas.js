// src/hooks/useDisciplinas.js
import { useState, useEffect } from "react";
import api from "../services/api";

export function useDisciplinas() {
  const [disciplinas, setDisciplinas] = useState([]);

  useEffect(() => {
    api
      .get("/api/disciplinas")
      .then((res) => setDisciplinas(res.data))
      .catch((err) => {
        console.error("Erro ao carregar disciplinas:", err);
      });
  }, []);

  return { disciplinas };
}
