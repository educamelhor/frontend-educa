import React, { useState, useEffect, useRef } from "react";
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// ═══════════════════════════════════════════════════════════════
// ModalConfirmTACE
// Modal premium de confirmação para registro de TACE quando
// o comportamento do estudante NÃO é "Insuficiente" ou "Incompatível".
// Cita o Art. 22 § 2º do Regimento Disciplinar.
// ═══════════════════════════════════════════════════════════════

function getComportamentoInfo(pontuacao) {
  if (pontuacao >= 10) return { label: "Excepcional", grau: "I", color: "emerald", risk: "muito baixo" };
  if (pontuacao >= 9)  return { label: "Ótimo",       grau: "II", color: "blue",    risk: "baixo" };
  if (pontuacao >= 7)  return { label: "Bom",         grau: "III", color: "green",  risk: "moderado" };
  if (pontuacao >= 5)  return { label: "Regular",     grau: "IV", color: "amber",   risk: "atenção" };
  if (pontuacao >= 2)  return { label: "Insuficiente", grau: "V", color: "orange",  risk: "alto" };
  return                       { label: "Incompatível", grau: "VI", color: "red",    risk: "crítico" };
}

const colorMap = {
  emerald: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    score: "text-emerald-600",
    glow: "shadow-emerald-200/60",
  },
  blue: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    score: "text-blue-600",
    glow: "shadow-blue-200/60",
  },
  green: {
    badge: "bg-green-100 text-green-700 border-green-200",
    score: "text-green-600",
    glow: "shadow-green-200/60",
  },
  amber: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    score: "text-amber-600",
    glow: "shadow-amber-200/60",
  },
  orange: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    score: "text-orange-600",
    glow: "shadow-orange-200/60",
  },
  red: {
    badge: "bg-red-100 text-red-700 border-red-200",
    score: "text-red-600",
    glow: "shadow-red-200/60",
  },
};

export default function ModalConfirmTACE({ open, onClose, onConfirm, aluno, pontuacao }) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) {
      setClosing(false);
      // Small delay so the animation triggers
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  const handleClose = () => {
    setClosing(true);
    setVisible(false);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 280);
  };

  const handleConfirm = () => {
    setClosing(true);
    setVisible(false);
    setTimeout(() => {
      setClosing(false);
      onConfirm();
    }, 280);
  };

  // Click fora fecha
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) handleClose();
  };

  if (!open && !closing) return null;

  const info = getComportamentoInfo(pontuacao);
  const colors = colorMap[info.color] || colorMap.amber;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300
        ${visible ? "bg-black/50 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none pointer-events-none"}`}
    >
      <style>{`
        @keyframes confirmSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(24px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes confirmSlideOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to   { opacity: 0; transform: scale(0.92) translateY(24px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.25); }
          50%      { box-shadow: 0 0 20px 4px rgba(245, 158, 11, 0.15); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .confirm-card-enter { animation: confirmSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .confirm-card-exit  { animation: confirmSlideOut 0.28s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
      `}</style>

      <div
        className={`w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden
          ${closing ? "confirm-card-exit" : "confirm-card-enter"}`}
      >
        {/* ═══════ Cabeçalho com gradiente ═══════ */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-amber-950 to-orange-950" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/8 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                   style={{ animation: "pulseGlow 2s ease-in-out infinite" }}>
                <ShieldExclamationIcon className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Atenção — Registro de T.A.C.E.
                </h2>
                <p className="text-amber-300/60 text-xs mt-0.5">
                  Verificação de elegibilidade regimental
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
              title="Fechar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ═══════ Corpo ═══════ */}
        <div className="px-6 py-5 space-y-5">
          {/* Badge do estudante + pontuação */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 uppercase truncate">
                {aluno?.estudante || "ESTUDANTE"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                RE: {aluno?.codigo || "—"} · Turma: {aluno?.turma || "—"}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className={`flex items-center justify-center w-14 h-14 rounded-xl border-2 shadow-lg
                bg-white ${colorMap[info.color]?.glow || ""} border-gray-200`}
              >
                <span className={`text-xl font-extrabold ${colors.score}`}>
                  {pontuacao.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colors.badge}`}>
                {info.grau} — {info.label}
              </span>
            </div>
          </div>

          {/* Alerta regimental */}
          <div className="relative rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="p-1.5 rounded-lg bg-amber-100">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-900">
                  Regimento Disciplinar — Art. 22, § 2º
                </p>
                <blockquote className="text-xs text-amber-800/80 leading-relaxed italic border-l-2 border-amber-300 pl-3">
                  "O Termo de Adequação de Conduta Escolar poderá ser proposto aos alunos que
                  ingressarem no comportamento <strong className="text-amber-900 not-italic">Insuficiente</strong> ou{" "}
                  <strong className="text-amber-900 not-italic">Incompatível</strong>."
                </blockquote>
                <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-white/70 border border-amber-100">
                  <InformationCircleIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    O comportamento atual deste estudante é{" "}
                    <strong className="font-bold">{info.label} ({info.grau})</strong>, com pontuação{" "}
                    <strong>{pontuacao.toFixed(2).replace(".", ",")}</strong>.
                    O TACE é recomendado para comportamentos{" "}
                    <strong>Insuficiente (V)</strong> ou <strong>Incompatível (VI)</strong>.
                    Deseja prosseguir mesmo assim?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ Footer ═══════ */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm
              hover:bg-gray-100 hover:border-gray-300 active:scale-[0.97]
              transition-all duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="group px-6 py-2.5 rounded-xl text-white font-semibold text-sm
              bg-gradient-to-r from-amber-600 to-orange-600
              shadow-md shadow-amber-600/20
              hover:from-amber-500 hover:to-orange-500 hover:shadow-lg hover:shadow-amber-500/30
              active:scale-[0.97]
              transition-all duration-200
              flex items-center gap-2"
          >
            <DocumentTextIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
            Sim, prosseguir com o TACE
          </button>
        </div>
      </div>
    </div>
  );
}
