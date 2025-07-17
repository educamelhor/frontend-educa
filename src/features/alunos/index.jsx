// src/features/alunos/index.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // <-- IMPORTANTE
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import AlunoTable from "./AlunoTable";
import Input from "../../components/ui/Input";
import styles from "./styles.module.css";
import api from "../../services/api";

export default function Alunos() {
  const [filtro, setFiltro] = useState("");
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate(); // <-- DEFINA AQUI

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const res = await api.get("/api/alunos");
        setAlunos(res.data);
      } catch (err) {
        console.error("Erro ao carregar alunos:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  // Função para navegar para a ficha do aluno
  function handleView(codigo) {
    navigate(`/alunos/${codigo}/ficha`);
  }

  // Função para navegar para o boletim do aluno
  function handleBoletim(codigo) {
    navigate(`/alunos/${codigo}/boletim`);
  }

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* cabeçalho */}
      <div className="flex items-center gap-2 mb-6">
        <AcademicCapIcon className="w-8 h-8 text-blue-900" />
        <h1 className="text-3xl font-bold text-blue-900">Lista de Alunos</h1>
      </div>

      {/* barra de busca */}
      <div className="flex justify-end mb-6">
        <Input
          placeholder="🔍 Buscar aluno"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-64"
        />
      </div>

      {/* tabela ou carregando */}
      {loading ? (
        <div className="text-blue-700 text-sm italic mb-4">
          🔄 Tabela de alunos carregando...
        </div>
      ) : (
        <AlunoTable
          alunos={alunos}
          filtro={filtro}
          mostrarFicha={true}
          mostrarBoletim={true}
          onView={handleView}
          onBoletim={handleBoletim}
          loading={loading}
        />
      )}
    </div>
  );
}
