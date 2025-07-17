// src/features/alunos/useAlunos.js

import { useState, useEffect } from "react";
import api from "../../../services/api";

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




  const salvarAluno = async (dados, alunoBase = {}) => {
  try {
    // Se está editando (já tem id), apenas atualiza direto!
    if (alunoBase.id) {
      await api.put(`/api/alunos/${alunoBase.id}`, {
        estudante: dados.estudante,
        data_nascimento: dados.data_nascimento,
        sexo: dados.sexo,
        turma_id: dados.turma_id,
        status: "ativo",
      });
      await fetchAlunos();
      return true;
    }

    // Só faz verificação de duplicidade ao ADICIONAR novo aluno!
    const res = await api.get(`/api/alunos/por-codigo/${dados.codigo}`);
    const alunoExistente = res.data;

    if (alunoExistente.status === "ativo") {
      alert("❌ Já existe um aluno ativo com esse código.");
      return false;
    }

    const desejaAtivar = confirm("Já existe um aluno com este código, mas está inativo. Deseja reativá-lo?");
    if (!desejaAtivar) return false;

    await api.put(`/api/alunos/${alunoExistente.id}`, {
      ...alunoExistente,
      status: "ativo",
    });
    await fetchAlunos();
    return true;

  } catch (err) {
    if (err.response?.status === 404) {
      try {
        await api.post("/api/alunos", dados);
        await fetchAlunos();
        return true;
      } catch (e) {
        alert("❌ Erro ao salvar aluno.");
        return false;
      }
    } else {
      alert("❌ Erro ao verificar código.");
      return false;
    }
  }
};










  const excluirOuInativarAluno = async ({ id, status }) => {
    try {
      if (status === "inativo") {
        await api.put(`/api/alunos/${id}`, { status: "inativo" });
      } else if (status === "excluir") {
        await api.delete(`/api/alunos/${id}`);
      }
      await fetchAlunos();
    } catch (err) {
      console.error("Erro ao excluir ou inativar aluno:", err);
    }
  };

  return {
    alunos,
    salvarAluno,
    loading,
    reload,
    excluirOuInativarAluno, // agora disponível
  };
}
