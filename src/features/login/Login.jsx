// src/features/login/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api"; // Serviço centralizado para requisições

export default function Login() {
  // 📌 Controle de etapas do fluxo de login
  const [etapa, setEtapa] = useState("login"); // "login" ou "codigo"

  // 📌 Campos do formulário
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");

  // 📌 Metadados do usuário e UI
  const [usuarioId, setUsuarioId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  /**
   * 1ª Etapa — Envia e-mail/celular + senha para gerar o código de confirmação
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", {
        emailOuCelular: usuario,
        senha,
      });

      // Armazena ID do usuário para usar na confirmação
      setUsuarioId(data.usuarioId);
      setEtapa("codigo");
    } catch (err) {
      alert(err.response?.data?.message || "Erro no login.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2ª Etapa — Confirma o código enviado por e-mail
   * ✅ IMPORTANTE: mesma regra de rota (prefixo /auth já é aplicado ao /api no baseURL)
   * Espera-se que o backend retorne token, nome, escola_id, nome_escola e perfil.
   */
  const handleConfirmar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/confirmar", {
        usuarioId,
        codigo,
      });

      // Salva dados no localStorage para uso global
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.nome || "Usuário");
      localStorage.setItem("escola_id", data.escola_id || 1);
      localStorage.setItem("nome_escola", data.nome_escola || "Escola não definida");
      localStorage.setItem("perfil", data.perfil || "aluno");

      setSuccess(true);

      // Redireciona após breve feedback
      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.message || "Erro na confirmação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen relative flex items-center justify-center">
      {/* 🌆 Fundo */}
      <div className="absolute inset-0 bg-[url('/login_wallpaper.png')] bg-repeat bg-[length:750px_750px]"></div>
      <div className="absolute inset-0 bg-blue-200/20"></div>

      {/* 🧾 Card */}
      <div className="relative z-10 bg-white/90 p-8 rounded-2xl shadow-xl w-96 min-h-[420px] flex flex-col justify-center">
        {success ? (
          <div className="text-center text-green-700 font-semibold text-lg animate-fadeIn">
            Login realizado com sucesso!
          </div>
        ) : etapa === "login" ? (
          // 🔐 Formulário de login
          <form onSubmit={handleLogin} className="flex flex-col space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-900">Login</h2>
            <input
              type="text"
              placeholder="E-mail"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300"
            />
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300"
            />
            <button className="bg-blue-600 text-white py-2 rounded-lg">
              Enviar código
            </button>

            {loading && (
              <div className="flex flex-col items-center mt-2 text-blue-600">
                <svg
                  className="animate-spin h-5 w-5 mb-1"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span className="text-sm font-medium">Verificando...</span>
              </div>
            )}
          </form>
        ) : (
          // 🔢 Formulário de confirmação de código
          <form onSubmit={handleConfirmar} className="flex flex-col space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-900">Confirmação</h2>
            <p className="text-center text-sm text-gray-600">
              Um código foi enviado para seu e-mail cadastrado.
            </p>
            <input
              type="text"
              placeholder="Digite o código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300"
            />
            <button className="bg-green-600 text-white py-2 rounded-lg">
              Confirmar
            </button>

            {loading && (
              <div className="flex flex-col items-center mt-2 text-green-600">
                <svg
                  className="animate-spin h-5 w-5 mb-1"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span className="text-sm font-medium">Verificando...</span>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
