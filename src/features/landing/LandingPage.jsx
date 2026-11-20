// src/features/landing/LandingPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon, SparklesIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import "@fontsource/montserrat/700.css";
import logo from "./logo.png";

export default function LandingPage() {
  const navigate = useNavigate();
  // Fases da abertura cinematográfica:
  // "intro" (0 -> 2.8s: abertura solar viva)
  // "iris"  (2.8s -> 3.9s: abertura óptica circular revelando o portal azul)
  // "done"  (após 3.9s: camada de intro desmontada, portal 100% interativo)
  const [phase, setPhase] = useState("intro");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 2700;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 30);

    const tIris = setTimeout(() => setPhase("iris"), 2750);
    const tDone = setTimeout(() => setPhase("done"), 3950);

    return () => {
      clearInterval(interval);
      clearTimeout(tIris);
      clearTimeout(tDone);
    };
  }, []);

  const pularIntro = () => {
    if (phase === "done") return;
    setProgress(100);
    setPhase("iris");
    setTimeout(() => setPhase("done"), 950);
  };

  const portalVisivel = phase === "iris" || phase === "done";

  return (
    <div className="relative min-h-screen w-full overflow-hidden select-none bg-[#050d24]">
      <style>{`
        @keyframes orbitSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbitReverse {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
        @keyframes floatSoft {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes auroraDrift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
          50%      { transform: translate(30px, -25px) scale(1.12); opacity: 0.8; }
        }
        @keyframes btnShine {
          0%   { transform: translateX(-140%) skewX(-20deg); }
          100% { transform: translateX(260%) skewX(-20deg); }
        }
        @keyframes shockwaveRing {
          0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(4.5); opacity: 0; }
        }
        .landing-iris-layer {
          clip-path: circle(150% at 50% 45%);
          transition: clip-path 1.15s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.9s ease-in;
        }
        .landing-iris-layer.closing {
          clip-path: circle(0% at 50% 43%);
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════
          CAMADA 1 (BASE): PORTAL AZUL SAFIRA PREMIUM (Print 2 Evoluído)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 min-h-screen flex flex-col justify-between overflow-hidden"
        style={{
          background: "radial-gradient(circle at 50% 25%, #1d4ed8 0%, #1e3a8a 42%, #091538 85%, #04091a 100%)",
        }}
      >
        {/* Malha arquitetônica sutil + Auroras volumétricas */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at 50% 45%, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 45%, black 30%, transparent 80%)",
          }}
        />
        <div
          className="pointer-events-none absolute -top-32 left-1/4 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(56,189,248,0.35), transparent 70%)",
            animation: "auroraDrift 10s ease-in-out infinite",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-1/5 w-[480px] h-[480px] rounded-full blur-[130px]"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.25), transparent 70%)",
            animation: "auroraDrift 13s ease-in-out infinite reverse",
          }}
        />

        {/* Barra Superior Institucional Discreta */}
        <header
          className={`relative z-20 flex items-center justify-between px-6 sm:px-12 pt-6 transition-all duration-1000 ${
            portalVisivel ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-100 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ecossistema Educacional Inteligente</span>
          </div>
          <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-blue-200/80 font-medium">
            <ShieldCheckIcon className="h-4 w-4 text-sky-300" />
            <span>Ambiente Seguro & Criptografado</span>
          </div>
        </header>

        {/* Conteúdo Central Principal */}
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 text-center">
          {/* Halo + Emblema Central */}
          <div
            className={`relative mb-7 transition-all duration-1000 ${
              portalVisivel ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
            style={{ animation: "floatSoft 5s ease-in-out infinite" }}
          >
            {/* Anel orbital sutil */}
            <div
              className="pointer-events-none absolute -inset-5 rounded-full border border-sky-300/25"
              style={{ animation: "orbitSlow 24s linear infinite" }}
            >
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-300 shadow-[0_0_12px_#7dd3fc]" />
            </div>
            <div
              className="relative p-4 rounded-3xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.42)]"
              style={{
                background: "linear-gradient(145deg, #fbbf24 0%, #f59e0b 52%, #ea580c 100%)",
              }}
            >
              <img
                src={logo}
                alt="Logo Educa.Melhor"
                className="w-24 h-24 object-contain bg-transparent"
                style={{ filter: "grayscale(1) contrast(1.6) drop-shadow(0 6px 16px rgba(0,0,0,0.25))" }}
                draggable={false}
              />
            </div>
          </div>

          {/* Título Principal */}
          <h1
            className={`text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight mb-4 transition-all duration-1000 delay-100 ${
              portalVisivel ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{
              fontFamily: "'Montserrat', sans-serif",
              textShadow: "0 10px 35px rgba(0,0,0,0.35)",
            }}
          >
            Educa<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-emerald-300 to-amber-200">.Melhor</span>
          </h1>

          {/* Subtítulo Inspiracional */}
          <p
            className={`text-lg sm:text-2xl text-blue-100/90 font-light mb-9 max-w-xl mx-auto leading-relaxed transition-all duration-1000 delay-200 ${
              portalVisivel ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            O futuro da educação começa aqui.
            <span className="block font-medium text-white/95 mt-1">
              Inove. Gerencie. Impacte vidas.
            </span>
          </p>

          {/* CTAs Principais */}
          <div
            className={`flex flex-col items-center gap-4 w-full max-w-xs transition-all duration-1000 delay-300 ${
              portalVisivel ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <button
              onClick={() => navigate("/login")}
              autoFocus
              className="group relative overflow-hidden w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold text-white shadow-[0_12px_40px_rgba(16,185,129,0.38)] border border-white/40 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_16px_48px_rgba(56,189,248,0.5)] active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 55%, #2563eb 100%)",
              }}
            >
              {/* Feixe de luz metálico */}
              <span
                className="pointer-events-none absolute inset-y-0 w-20 bg-white/30 blur-sm"
                style={{ animation: "btnShine 3.6s ease-in-out infinite" }}
              />
              <span className="relative z-10">Entrar no sistema</span>
              <ArrowRightIcon className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
            </button>

            <button
              onClick={() => navigate("/cadastro")}
              className="group w-full flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-base font-semibold text-blue-50 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 shadow-lg transition-all duration-300 hover:scale-[1.02]"
            >
              <SparklesIcon className="h-4 w-4 text-emerald-300 transition-transform group-hover:rotate-12" />
              <span>Quero me cadastrar</span>
            </button>
          </div>
        </main>

        {/* Rodapé */}
        <footer className="relative z-20 text-center pb-6 px-4">
          <p className="text-blue-200/70 text-xs sm:text-sm mb-2">
            © {new Date().getFullYear()} Educa.Melhor • Ecossistema Integrado de Gestão • contato@educamelhor.com.br
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/suporte"
              className="text-blue-300 hover:text-white text-xs font-semibold underline underline-offset-4 transition-colors"
            >
              Suporte
            </a>
            <span className="text-blue-500/70 text-xs">•</span>
            <a
              href="/privacidade"
              className="text-blue-300 hover:text-white text-xs font-semibold underline underline-offset-4 transition-colors"
            >
              Política de Privacidade
            </a>
            <span className="text-blue-500/70 text-xs">•</span>
            <a
              href="/excluir-conta"
              className="text-blue-300 hover:text-white text-xs font-semibold underline underline-offset-4 transition-colors"
            >
              Excluir Conta
            </a>
          </div>
        </footer>
      </div>

      {/* Onda de Luz Dourada na Transição Íris */}
      {phase === "iris" && (
        <div
          className="pointer-events-none fixed left-1/2 top-[43%] z-40 w-44 h-44 rounded-full border-4 border-amber-300/80 shadow-[0_0_80px_rgba(251,191,36,0.9)]"
          style={{ animation: "shockwaveRing 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CAMADA 2 (TOPO): ABERTURA SOLAR LARANJA/OURO COM REVELAÇÃO EM ÍRIS (Print 1)
      ═══════════════════════════════════════════════════════════════════════ */}
      {phase !== "done" && (
        <div
          onClick={pularIntro}
          className={`landing-iris-layer fixed inset-0 z-30 flex flex-col items-center justify-center cursor-pointer ${
            phase === "iris" ? "closing" : ""
          }`}
          style={{
            background: "radial-gradient(circle at 50% 38%, #fbbf24 0%, #f59e0b 40%, #ea580c 88%, #c2410c 100%)",
          }}
        >
          {/* Anéis solares orbitais de precisão */}
          <div className="relative flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div
                className="pointer-events-none absolute w-56 h-56 rounded-full border border-white/25"
                style={{ animation: "orbitSlow 14s linear infinite" }}
              >
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_16px_#fff]" />
              </div>
              <div
                className="pointer-events-none absolute w-72 h-72 rounded-full border border-dashed border-white/20"
                style={{ animation: "orbitReverse 20s linear infinite" }}
              />

              {/* Cápsula Liquid Glass da Logo */}
              <div className="relative p-6 rounded-[2rem] bg-white/15 backdrop-blur-xl border border-white/35 shadow-[0_24px_70px_rgba(124,45,18,0.45)] animate-intro-logo">
                <img
                  src={logo}
                  alt="Logo Educa.Melhor"
                  className="w-28 h-28 sm:w-32 sm:h-32 object-contain bg-transparent"
                  style={{ filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.32))" }}
                  draggable={false}
                />
              </div>
            </div>

            {/* Nome & Tagline */}
            <h1
              className="text-4xl sm:text-5xl font-extrabold text-white mt-9 tracking-tight drop-shadow-xl animate-intro-fadeIn"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Educa.Melhor
            </h1>
            <div className="mt-2 text-white/90 text-xs sm:text-sm font-semibold tracking-[0.28em] uppercase animate-intro-fadeIn">
              SISTEMA EDUCA.MELHOR
            </div>

            {/* Barra de Progresso Luminosa Ultrafina */}
            <div className="mt-8 w-52 h-1 rounded-full bg-white/25 overflow-hidden backdrop-blur-sm">
              <div
                className="h-full rounded-full bg-white shadow-[0_0_12px_#fff] transition-all duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="mt-4 text-[11px] font-medium text-white/75 hover:text-white tracking-wider transition-opacity">
              Toque para avançar →
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
