// src/features/professores/FichaProfessor.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { AcademicCapIcon } from "@heroicons/react/24/solid";

export default function FichaProfessor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [professor, setProfessor] = useState(null);
  const [erro, setErro] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // 1) Carrega dados do professor ao montar
  useEffect(() => {
    async function fetchProfessor() {
      try {
        const res = await api.get(`/api/professores/${id}`);
        setProfessor(res.data);
      } catch (err) {
        console.error("Erro ao buscar professor:", err);
        setErro(true);
      }
    }
    fetchProfessor();
  }, [id]);

  // 2) Tratamento de erro ao carregar professor
  if (erro) {
    return (
      <div className="min-h-screen bg-blue-50 flex justify-center py-10 px-4">
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 space-y-6">
          <p className="text-red-600">Não foi possível carregar os dados do professor.</p>
          <button
            onClick={() => navigate("/professores")}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            ← Voltar à lista
          </button>
        </div>
      </div>
    );
  }

  // 3) Enquanto carrega, exibe “Carregando”
  if (!professor) {
    return (
      <div className="min-h-screen bg-blue-50 flex justify-center items-center">
        <p>Carregando dados do professor…</p>
      </div>
    );
  }

  // 4) Monta URL da foto (se existir)
  const fotoUrl = professor.foto
    ? api.defaults.baseURL.replace(/\/api$/, "") + professor.foto
    : null;

  // 5) JSX principal
  return (
    <div className="min-h-screen bg-blue-50 flex justify-center py-10 px-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Botão “Voltar” dentro do cartão */}
        <button
          onClick={() => navigate("/professores")}
          className="mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          ← Voltar
        </button>

        <div className="flex items-center gap-4 mb-6">
          <AcademicCapIcon className="w-8 h-8 text-blue-900" />
          <h1 className="text-3xl font-bold text-blue-900">Ficha do Professor</h1>
        </div>

        <div className="flex gap-6">
          {/* Foto circular */}
          <div className="flex flex-col items-center">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={"Foto de " + professor.nome}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600">Sem foto</span>
              </div>
            )}
          </div>

          {/* Dados do professor */}
          <div className="flex flex-col gap-2">
            <p>
              <strong>Nome:</strong> {professor.nome}
            </p>
            <p>
              <strong>CPF:</strong> {professor.cpf}
            </p>
            <p>
              <strong>Data de Nascimento:</strong> {professor.data_nascimento}
            </p>
            <p>
              <strong>Sexo:</strong> {professor.sexo}
            </p>
            <p>
              <strong>Disciplina:</strong> {professor.disciplina_nome || "—"}
            </p>
          </div>
        </div>

        {/* Seções de Turmas e Relatórios (futuro) */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Turmas do Professor</h2>
            <p className="text-gray-600">Função futura</p>
          </div>
          <div className="bg-blue-50 p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Relatórios</h2>
            <p className="text-gray-600">Função futura</p>
          </div>
        </div>
      </div>
    </div>
  );
}
