import React, { useEffect, useState } from "react";

/**
 * SmartSliderGroup — Mockup Ideia 2 (Grupo A - Janelas)
 * Sliders 0..10 com acoplamento "inteligente":
 *  - Mover INÍCIO ↑ → FIM ↓ e MEIO tende ao equilíbrio (~5)
 *  - Mover FIM ↑ → INÍCIO ↓ e MEIO tende ao equilíbrio
 *  - Mover MEIO ↑/↓ → INÍCIO e FIM se aproximam do meio (equilíbrio)
 *
 * Props:
 * - value: { inicio: number, meio: number, fim: number } // 0..10
 * - onChange: (next) => void
 * - disabled?: boolean
 */
export default function SmartSliderGroup({ value, onChange, disabled }) {
  const clamp = (v) => Math.max(0, Math.min(10, Math.round(v)));
  const [vals, setVals] = useState({
    inicio: 3,
    meio: 5,
    fim: 3,
  });

  // hidrata inicial
  useEffect(() => {
    if (!value) return;
    setVals({
      inicio: clamp(Number(value.inicio ?? 3)),
      meio: clamp(Number(value.meio ?? 5)),
      fim: clamp(Number(value.fim ?? 3)),
    });
  }, [value]);

  // commit helper
  function commit(next) {
    setVals(next);
    onChange?.(next);
  }

  // heurística “inteligente” simples e suave
  function adjustFrom(key, v) {
    const curr = { ...vals };
    curr[key] = clamp(v);

    const towards = (from, target, factor = 0.4) => clamp(from + (target - from) * factor);

    if (key === "inicio") {
      // oposto (fim) vai para complemento
      curr.fim = clamp(10 - curr.inicio);
      // meio tende ao equilíbrio (5), mas levemente puxado pelo valor atual
      curr.meio = towards(curr.meio, 5 + (curr.inicio - 5) * 0.2, 0.7);
    } else if (key === "fim") {
      curr.inicio = clamp(10 - curr.fim);
      curr.meio = towards(curr.meio, 5 + (curr.fim - 5) * 0.2, 0.7);
    } else if (key === "meio") {
      // quando mexe no meio, início e fim caminham para o meio
      curr.inicio = towards(curr.inicio, 10 - Math.abs(curr.meio - 5), 0.6);
      curr.fim = towards(curr.fim, 10 - Math.abs(curr.meio - 5), 0.6);
    }

    commit(curr);
  }

  const Item = ({ id, label, val, onInput }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-medium text-blue-900">
          {label}
        </label>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-white">{val}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={val}
        onChange={(e) => onInput(Number(e.target.value))}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between text-[11px] text-blue-700/70 mt-1">
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-4 rounded-xl border">
      <div className="mb-2">
        <h3 className="font-medium text-blue-900">Grupo A — Janelas & posição do dia</h3>
        <p className="text-xs text-blue-700">Arraste os controles. Os opostos se ajustam automaticamente.</p>
      </div>

      <Item
        id="slider-inicio"
        label="Evitar janela no INÍCIO do dia"
        val={vals.inicio}
        onInput={(v) => adjustFrom("inicio", v)}
      />
      <Item
        id="slider-meio"
        label="Evitar janela no MEIO do dia"
        val={vals.meio}
        onInput={(v) => adjustFrom("meio", v)}
      />
      <Item
        id="slider-fim"
        label="Evitar janela no FIM do dia"
        val={vals.fim}
        onInput={(v) => adjustFrom("fim", v)}
      />
    </div>
  );
}
