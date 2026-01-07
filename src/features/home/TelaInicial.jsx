// src/pages/TelaInicial.jsx

import React, { useState } from "react";
import { School, User, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";           // instância axios :contentReference[oaicite:0]{index=0}
import Toast from "../components/Toast";     // componente de feedback :contentReference[oaicite:1]{index=1}

export default function TelaInicial() {
  const navigate = useNavigate();
  const [escola, setEscola]     = useState("");
  const [usuario, setUsuario]   = useState("");
  const [senha, setSenha]       = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // exemplo de chamada de autenticação; ajuste endpoint conforme seu back‑end
      await api.post("/login", { escola, usuario, senha });
      // se OK, redireciona à página principal
      navigate("/principal");
    } catch (err) {
      console.error("Falha ao autenticar:", err);
      setToastMsg("Usuário ou senha inválidos");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-400 to-indigo-600">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        {/* Logo Educa.Melhor */}
        <img
          src="/LOGO_EDUCA_MELHOR.jpeg"
          alt="Logo Educa.Melhor"
          className="h-24 w-auto mx-auto mb-6"
        />

        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Login Plataforma Educa.Melhor
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Seleção de escola */}
          <div>
            <label className="block text-gray-700 mb-1">Escola</label>
            <div className="flex items-center border border-gray-300 rounded">
              <School className="ml-2 text-gray-500" />
              <select
                className="w-full px-3 py-2 focus:outline-none"
                value={escola}
                onChange={(e) => setEscola(e.target.value)}
              >
                <option value="" disabled>
                  Selecione sua escola
                </option>
                <option value="escola1">Escola A</option>
                <option value="escola2">Escola B</option>
              </select>
            </div>
          </div>

          {/* Campo de usuário */}
          <div>
            <label className="block text-gray-700 mb-1">Usuário</label>
            <div className="flex items-center border border-gray-300 rounded">
              <User className="ml-2 text-gray-500" />
              <input
                type="text"
                className="w-full px-3 py-2 focus:outline-none"
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </div>
          </div>

          {/* Campo de senha */}
          <div>
            <label className="block text-gray-700 mb-1">Senha</label>
            <div className="flex items-center border border-gray-300 rounded">
              <Lock className="ml-2 text-gray-500" />
              <input
                type="password"
                className="w-full px-3 py-2 focus:outline-none"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          </div>

          {/* Botão de login (só habilita quando todos os campos têm valor) */}
          <button
            type="submit"
            disabled={!escola || !usuario || !senha}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
          >
            Entrar
          </button>
        </form>
      </div>

      {/* Feedback de erro */}
      {toastMsg && (
        <Toast onClose={() => setToastMsg("")} duration={5000}>
          <div className="text-red-600">{toastMsg}</div>
        </Toast>
      )}
    </div>
  );
}
