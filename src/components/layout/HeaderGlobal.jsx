import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";

export default function HeaderGlobal() {
  // Estados para dados dinâmicos do usuário
  const [nomeEscola, setNomeEscola] = useState("");
  const [userName, setUserName] = useState("");
  const [perfil, setPerfil] = useState("");
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    /**
     * Recupera os dados do localStorage (definidos no login)
     * - userName: nome do usuário
     * - perfil: perfil do usuário (admin, professor, aluno...)
     * - nome_escola: nome completo da escola
     * - escola_id: usado para filtrar dados no backend
     */
    const savedName = localStorage.getItem("userName") || "Usuário";
    const savedPerfil = localStorage.getItem("perfil") || "aluno";
    const savedNomeEscola = localStorage.getItem("nome_escola") || "Escola não definida";

    setUserName(savedName);
    setPerfil(savedPerfil);
    setNomeEscola(savedNomeEscola);
  }, []);

  /**
   * Confirmação de logout:
   * Remove dados do localStorage e redireciona para login.
   */
  const handleLogoutConfirm = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("perfil");
    localStorage.removeItem("nome_escola");
    localStorage.removeItem("escola_id");
    navigate("/login");
  };

  /**
   * Gera as iniciais do nome para o avatar
   */
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-full px-8 py-5 bg-gradient-to-r from-blue-50 to-white shadow-md rounded-lg dark:from-gray-900 dark:to-gray-800 dark:shadow-lg flex justify-between items-center relative">
      {/* Nome da Escola (dinâmico) */}
      <h1
        className="text-4xl tracking-tight text-blue-900 dark:text-white"
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
        }}
      >
        {nomeEscola}
      </h1>

      {/* Área do usuário */}
      <div className="flex items-center gap-4">
        {/* Avatar com iniciais */}
        <div className="bg-blue-600 text-white rounded-full h-10 w-10 flex items-center justify-center font-semibold text-lg shadow">
          {getInitials(userName)}
        </div>

        {/* Nome e perfil */}
        <span className="text-blue-900 font-semibold">
          {userName} <span className="text-sm text-gray-600">({perfil})</span>
        </span>

        {/* Botão de sair */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sair
        </button>
      </div>

      {/* Modal de confirmação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 transform scale-95 animate-scaleUp">
            <h2 className="text-xl font-bold text-gray-800 mb-3 text-center">
              Confirmar Logout
            </h2>
            <p className="text-gray-600 text-center mb-5">
              Tem certeza que deseja sair da sua conta?
            </p>
            <div className="flex justify-around">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
