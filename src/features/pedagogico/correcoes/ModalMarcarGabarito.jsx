import React, { useState, useEffect } from "react";

// Injeção dinâmica da fonte Orbitron (Google Fonts)
function useOrbitronFont() {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);
}

export default function ModalMarcarGabarito({
  open,
  onClose,
  numQuestoes,
  numAlternativas,
  onSave,
  nomeGabarito,
  gabaritoInicial = []
}) {
  useOrbitronFont();
  const alternativasLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").slice(0, numAlternativas);

  // Preenche o gabarito inicial se disponível
  const [gabarito, setGabarito] = useState(() =>
    gabaritoInicial.length === numQuestoes
      ? gabaritoInicial.map(alt =>
          alternativasLabels.indexOf(alt) >= 0 ? alternativasLabels.indexOf(alt) : null
        )
      : Array(numQuestoes).fill(null)
  );

  // Sempre que abrir, reseta ou preenche com o que veio
  useEffect(() => {
    if (open) {
      setGabarito(
        gabaritoInicial.length === numQuestoes
          ? gabaritoInicial.map(alt =>
              alternativasLabels.indexOf(alt) >= 0 ? alternativasLabels.indexOf(alt) : null
            )
          : Array(numQuestoes).fill(null)
      );
    }
    // eslint-disable-next-line
  }, [open, numQuestoes, numAlternativas, gabaritoInicial.join(",")]);

  function marcarResposta(questaoIdx, alternativaIdx) {
    const novo = [...gabarito];
    novo[questaoIdx] = alternativaIdx;
    setGabarito(novo);
  }

  function handleSalvar() {
    const faltantes = [];
    gabarito.forEach((r, i) => {
      if (r === null) faltantes.push(i + 1);
    });

    if (faltantes.length > 0) {
      alert(
        "Por favor, marque todas as questões!\n" +
        "Faltam marcar: " +
        faltantes.map(num => String(num).padStart(2, "0")).join(", ")
      );
      return;
    }
    onSave(gabarito.map(idx => alternativasLabels[idx]));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-black/70 to-blue-950/90 backdrop-blur-[2px]">
      <div
        className="animate-fade-in shadow-2xl rounded-3xl w-full max-w-2xl p-0 border-t-8"
        style={{
          // Glassmorphism com leve textura
          background: "linear-gradient(120deg, rgba(29,42,77,0.92) 10%, rgba(27,31,48,0.84) 100%)",
          borderTopColor: "#7DD3FC", // cyan-300
          boxShadow: "0 6px 48px 0 rgba(15,40,80,0.18)",
          overflow: "hidden",
        }}
      >
        <div className="flex flex-col items-center px-7 pt-6 pb-4" style={{ background: "none" }}>
          {/* Ícone SVG animado */}
          <span style={{ marginBottom: -4, marginTop: 2 }}>
            <svg width={48} height={48} fill="none" viewBox="0 0 48 48">
              <defs>
                <radialGradient id="star-grad" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#fbbf24"/>
                  <stop offset="80%" stopColor="#3b82f6"/>
                  <stop offset="100%" stopColor="#111827"/>
                </radialGradient>
              </defs>
              <polygon
                points="24,5 29.39,18.02 43.51,18.02 32.06,27.48 37.45,40.5 24,31.98 10.55,40.5 15.94,27.48 4.49,18.02 18.61,18.02"
                fill="url(#star-grad)"
                stroke="#fff"
                strokeWidth="2"
                style={{
                  filter: "drop-shadow(0 2px 6px #38bdf8aa)",
                  transform: "scale(1.12)",
                  animation: "star-rotate 2.6s linear infinite"
                }}
              />
              <style>{`
                @keyframes star-rotate {
                  0% { transform: scale(1.12) rotate(0deg);}
                  100% { transform: scale(1.12) rotate(360deg);}
                }
              `}</style>
            </svg>
          </span>
          {/* Título estiloso */}
          <div
            className="text-2xl tracking-wide mt-1 mb-1"
            style={{
              fontFamily: "'Orbitron', Arial, sans-serif",
              color: "#38bdf8",
              letterSpacing: 2,
              textShadow: "0 2px 8px #111d",
              fontWeight: 700
            }}
          >
            Gabarito Oficial
          </div>
          {/* Nome do gabarito */}
          {nomeGabarito && (
            <div className="text-base font-semibold text-gray-100 bg-gradient-to-l from-blue-900/70 to-slate-700/60 px-5 py-2 rounded-xl border border-blue-400 mb-2 shadow-inner">
              {nomeGabarito}
            </div>
          )}
        </div>
        <div className="overflow-x-auto px-3 pb-2 pt-0" style={{ maxHeight: "56vh", overflowY: "auto" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-1 text-center text-gray-400 bg-transparent">#</th>
                {alternativasLabels.map((alt, i) => (
                  <th key={i} className="p-1 text-center text-gray-400 bg-transparent">{alt}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numQuestoes }).map((_, qIdx) => (
                <tr key={qIdx}>
                  <td className="text-center font-semibold text-gray-300 bg-transparent">{String(qIdx + 1).padStart(2, "0")}</td>
                  {alternativasLabels.map((alt, aIdx) => (
                    <td key={aIdx} className="text-center bg-transparent">
                      <button
                        type="button"
                        onClick={() => marcarResposta(qIdx, aIdx)}
                        className="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-75 focus:outline-none mx-auto"
                        style={{
                          background: gabarito[qIdx] === aIdx
                            ? "linear-gradient(120deg, #111 70%, #38bdf8 160%)"
                            : "rgba(255,255,255,0.10)",
                          borderColor: gabarito[qIdx] === aIdx ? "#38bdf8" : "#888c",
                          color: gabarito[qIdx] === aIdx ? "#fff" : "#98a",
                          fontWeight: 700,
                          fontFamily: "'Orbitron', Arial, sans-serif",
                          fontSize: "1.09em",
                          boxShadow: gabarito[qIdx] === aIdx ? "0 0 10px #38bdf877" : undefined,
                          userSelect: "none",
                          cursor: "pointer"
                        }}
                        aria-label={alt}
                      >
                        {alt}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between mt-3 px-6 pb-2">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-lg"
            onClick={handleSalvar}
            type="button"
          >
            Salvar Gabarito Oficial
          </button>
        </div>
      </div>
    </div>
  );
}
