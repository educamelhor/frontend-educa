// src/features/landing/LandingPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import "@fontsource/montserrat/700.css";
import logo from "./logo.png"; // Logo sem fundo (transparente)

// Intro animada com logo centralizada
function LandingIntro({ onFinish }) {
  const [show, setShow] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      if (onFinish) onFinish();
    }, 4000); // duração da intro (ms)
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-500 to-yellow-400 animate-intro-fade">
      <div className="flex flex-col items-center">
        {/* Aqui removemos bg-white */}
        <div className="rounded-2xl shadow-2xl p-0 flex flex-col items-center scale-[1.08] animate-intro-logo">
          <img
            src={logo}
            alt="Logo Educa.Melhor"
            className="w-32 h-32 object-contain bg-transparent"
            style={{
              filter: "drop-shadow(0 6px 32px #0005)",
              background: "transparent"
            }}
            draggable={false}
          />
        </div>
        <h1
          className="text-4xl font-bold text-white mt-8 drop-shadow-xl animate-intro-fadeIn"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Educa.Melhor
        </h1>
        <div className="mt-2 text-white text-sm tracking-widest animate-intro-fadeIn">
          SISTEMA EDUCA.MELHOR
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);
  const navigate = useNavigate();

  return (
    <>
      {showIntro && <LandingIntro onFinish={() => setShowIntro(false)} />}
      {!showIntro && (
        <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900">
          {/* Conteúdo central */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <img
              src={logo}
              alt="Logo Educa.Melhor"
              className="w-24 h-24 shadow-xl mb-6 object-contain bg-transparent"
              style={{
                filter: "drop-shadow(0 4px 16px #0004)",
                background: "transparent"
              }}
              draggable={false}
            />
            <h1
              className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-4"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Educa.Melhor
            </h1>
            <p className="text-2xl text-blue-100 font-light mb-6 max-w-xl mx-auto text-center">
              O futuro da educação começa aqui.<br />
              Inove. Gerencie. Impacte vidas.
            </p>




            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-2xl text-xl font-semibold shadow-lg hover:scale-105 transition transform duration-200 hover:from-blue-500 hover:to-green-400 mt-8"
                  style={{
                  border: "2px solid #fff",
                  boxShadow: "0 2px 12px #0002",
                  minWidth: 270,
                  justifyContent: "center",
                }}
                autoFocus
             >
               <ArrowRightIcon className="h-6 w-6" />
               Entrar no sistema
             </button>
             <button
               onClick={() => navigate("/cadastro")}
               className="flex items-center gap-2 px-8 py-2 bg-gradient-to-r from-blue-100 to-green-200 text-blue-800 rounded-2xl text-lg font-semibold shadow hover:scale-105 transition transform duration-200 border-2 border-white mt-2"
               style={{
                 minWidth: 230,
                 justifyContent: "center",
                 fontWeight: 600,
                 letterSpacing: 0.4,
               }}
             >
               Quero me cadastrar
             </button>
          </div>





          </div>
          {/* Footer */}
          <footer className="text-center text-blue-200 pb-6 opacity-70">
            © {new Date().getFullYear()} Educa.Melhor • Versão 1.0 • contato@educamelhor.com.br
          </footer>
        </div>
      )}
    </>
  );
}
