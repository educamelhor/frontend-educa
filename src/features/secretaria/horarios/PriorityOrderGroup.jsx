import React, { useEffect, useMemo, useState } from "react";

/**
 * PriorityOrderGroup — Lista reordenável por setas ↑/↓ (GENÉRICO).
 *
 * Props:
 *  - items: Array<{ key: string, label: string, weightKey?: string }>
 *      key:       id lógico do item para controle da ordem
 *      label:     texto mostrado na UI
 *      weightKey: nome da chave de peso no regras_json.pesos (se omitido, usa a própria key)
 *  - value: string[]  -> ordem atual (array de keys)
 *  - onChange(next: string[])
 *  - disabled?: boolean
 *
 * Helpers exportados:
 *  - orderToWeightsGeneric(items, order, {max=10, min=0})
 *      → retorna objeto { [weightKey]: peso } escalonando do topo (max) ao fundo (min).
 */

export default function PriorityOrderGroup({ items = [], value, onChange, disabled }) {
  const knownKeys = useMemo(() => items.map(i => i.key), [items]);

  const initial = useMemo(() => {
    const onlyKnown = (Array.isArray(value) ? value : []).filter(k => knownKeys.includes(k));
    return onlyKnown.length ? onlyKnown : knownKeys;
  }, [value, knownKeys]);

  const [order, setOrder] = useState(initial);
  useEffect(() => { setOrder(initial); }, [initial]);

  function move(key, dir) {
    setOrder(prev => {
      const idx = prev.indexOf(key);
      if (idx === -1) return prev;
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      onChange?.(next);
      return next;
    });
  }

  return (
    <div className="bg-white p-4 rounded-xl border">
      <div className="mb-2">
        <h3 className="font-medium text-blue-900">Grupo A — Prioridade por ordem (setas)</h3>
        <p className="text-xs text-blue-700">
          Arrume a ordem de prioridade. Ao “rodar”, o sistema tenta atender o 1º item; se não der,
          tenta o 2º, e assim por diante.
        </p>
      </div>

      <ul className="space-y-2">
        {order.map((k, i) => {
          const item = items.find(it => it.key === k);
          if (!item) return null;
          return (
            <li key={k} className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-blue-50">
              <div className="text-blue-900 text-sm">
                <span className="inline-block w-5 font-semibold text-blue-700">{i + 1}º</span>
                {item.label}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled || i === 0}
                  onClick={() => move(k, "up")}
                  className="px-2 py-1 rounded-md border bg-white hover:bg-blue-50 disabled:opacity-50"
                  title="Mover para cima"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || i === order.length - 1}
                  onClick={() => move(k, "down")}
                  className="px-2 py-1 rounded-md border bg-white hover:bg-blue-50 disabled:opacity-50"
                  title="Mover para baixo"
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Converte ordem em pesos 0..10 (ou faixa customizada).
 *  Topo recebe `max`, último recebe `min` (escala linear).
 */
export function orderToWeightsGeneric(items, order, { max = 10, min = 0 } = {}) {
  const weights = {};
  const keys = items.map(i => i.key);
  const weightKey = (k) => (items.find(i => i.key === k)?.weightKey) || k;

  const ord = (Array.isArray(order) && order.length ? order : keys).filter(k => keys.includes(k));
  const n = Math.max(1, ord.length);
  const step = n === 1 ? 0 : (max - min) / (n - 1);

  ord.forEach((k, idx) => {
    const val = Math.round(max - idx * step);
    weights[weightKey(k)] = val;
  });
  return weights;
}
