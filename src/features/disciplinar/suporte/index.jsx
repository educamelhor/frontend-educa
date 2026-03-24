import React, { useState, useEffect } from "react";
import {
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// ── Animação de pulso suave via keyframes inline ──
const pulseKeyframes = `
@keyframes softPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.05); opacity: 0.85; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-8px); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

const FEATURES = [
  {
    icon: ChatBubbleLeftRightIcon,
    title: "Chat com Suporte",
    desc: "Converse em tempo real com nossa equipe de atendimento para resolver dúvidas ou reportar problemas.",
    color: "from-blue-500 to-blue-600",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: BookOpenIcon,
    title: "Base de Conhecimento",
    desc: "Tutoriais, guias passo a passo e perguntas frequentes sobre o módulo disciplinar.",
    color: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: WrenchScrewdriverIcon,
    title: "Diagnóstico do Sistema",
    desc: "Ferramentas automáticas para verificar integridade de dados e identificar inconsistências.",
    color: "from-amber-500 to-amber-600",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: ShieldCheckIcon,
    title: "Auditoria & Logs",
    desc: "Acompanhe todas as ações realizadas no módulo disciplinar com rastreabilidade completa.",
    color: "from-purple-500 to-purple-600",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
];

export default function SuporteDisciplinar() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [dots, setDots] = useState("");

  // Animação dos pontinhos "..."
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* ── Hero Section ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-10 mb-10 shadow-2xl">
          {/* Círculos decorativos */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Ícone animado */}
            <div
              className="mb-6 p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg"
              style={{ animation: "float 3s ease-in-out infinite" }}
            >
              <WrenchScrewdriverIcon className="h-14 w-14 text-amber-400" />
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
              Central de Suporte
            </h1>

            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-semibold tracking-wide">
                <SparklesIcon className="h-4 w-4" />
                EM DESENVOLVIMENTO
              </span>
            </div>

            <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-6">
              Estamos construindo uma experiência de suporte completa e integrada
              ao módulo disciplinar. Em breve, você terá acesso a ferramentas
              poderosas para resolver problemas, consultar tutoriais e muito mais.
            </p>

            {/* Barra de progresso animada */}
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-300/60 uppercase tracking-widest">
                  Progresso do Desenvolvimento
                </span>
                <span className="text-xs font-bold text-amber-400">Em breve</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500"
                  style={{
                    width: "35%",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s linear infinite",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Cards de funcionalidades futuras ── */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-1 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            O que está por vir
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Funcionalidades planejadas para o módulo de Suporte Disciplinar
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              const isHovered = hoveredCard === i;
              return (
                <div
                  key={i}
                  className={`
                    relative group rounded-xl border bg-white p-6
                    transition-all duration-300 cursor-default
                    ${isHovered
                      ? "border-blue-200 shadow-lg shadow-blue-100/50 -translate-y-1"
                      : "border-gray-100 shadow-sm hover:shadow-md"
                    }
                  `}
                  onMouseEnter={() => setHoveredCard(i)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Indicador de "em breve" */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 text-[10px] font-semibold uppercase tracking-wider">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400"
                        style={{ animation: "softPulse 2s ease-in-out infinite" }}
                      />
                      Em breve
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 p-3 rounded-xl ${feat.iconBg} transition-transform duration-300 ${
                        isHovered ? "scale-110" : ""
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${feat.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-gray-800 mb-1">
                        {feat.title}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Rodapé informativo ── */}
        <div className="text-center py-6 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Enquanto isso, para suporte imediato entre em contato com a equipe técnica
            do{" "}
            <span className="font-semibold text-blue-900">EDUCA.MELHOR</span>
            <span className="text-gray-300 ml-1">{dots}</span>
          </p>
        </div>
      </div>
    </>
  );
}
