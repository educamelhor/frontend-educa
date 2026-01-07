// src/features/secretaria/horarios/ModalDisponibilidadeProfessor.jsx
// ============================================================================
// Modal simples para editar disponibilidades (por professor/dia).
// - Lista períodos 1..N (N informado via prop totalPeriodos).
// - Cada período alterna entre: livre → evitar → indisponivel → (loop).
// - Carrega do backend (GET /api/disponibilidades) e salva (POST /upsert).
// - Turno é normalizado para minúsculo no request.
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";

const STATUS = ["livre", "evitar", "indisponivel"];

function nextStatus(s) {
  const i = STATUS.indexOf(String(s || "livre"));
  return STATUS[(i + 1) % STATUS.length];
}

export default function ModalDisponibilidadeProfessor({
  open,
  onClose,
  professor,            // { id, nome }
  turno,                // "Matutino" | "Vespertino" | ...
  diaSemana,            // number (1..6/7 conforme seu padrão)
  totalPeriodos = 6,    // número de períodos do dia (ex.: 6)
}) {
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [periodos, setPeriodos] = useState(() =>
    Array.from({ length: totalPeriodos }, (_, i) => ({
      ordem: i + 1,
      status: "livre",
    }))
  );

  // Recria array quando totalPeriodos muda
  useEffect(() => {
    setPeriodos(Array.from({ length: totalPeriodos }, (_, i) => ({
      ordem: i + 1,
      status: "livre",
    })));
  }, [totalPeriodos, open]);

  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const turnoNorm = String(turno || "").toLowerCase();

  // Carregar do backend ao abrir
  useEffect(() => {
    if (!open || !professor?.id || !diaSemana) return;

    (async () => {
      try {
        setCarregando(true);
        const url = `/api/disponibilidades?turno=${encodeURIComponent(turno)}&professor_id=${professor.id}&dia_semana=${diaSemana}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const arr = await res.json();

        // arr vem expandido: [{professor_id, dia, ordem, status}, ...]
        // Monta um mapa por ordem e aplica nos períodos locais.
        const map = new Map(arr.map((it) => [Number(it.ordem), String(it.status || "livre")]));
        setPeriodos((prev) =>
          prev.map((p) => ({
            ordem: p.ordem,
            status: map.get(p.ordem) || "livre",
          }))
        );
      } catch (e) {
        console.error("Falha ao carregar disponibilidades:", e);
      } finally {
        setCarregando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, professor?.id, diaSemana, turno]);

  function toggle(ordem) {
    setPeriodos((prev) =>
      prev.map((p) =>
        p.ordem === ordem ? { ...p, status: nextStatus(p.status) } : p
      )
    );
  }

  async function salvar() {
    if (!professor?.id || !diaSemana) return;
    try {
      setSalvando(true);
      const res = await fetch("/api/disponibilidades/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          professor_id: Number(professor.id),
          turno: turnoNorm,            // backend normaliza; aqui já vai minúsculo
          dia_semana: Number(diaSemana),
          status_padrao: "livre",
          periodos: periodos.map((p) => ({
            ordem: Number(p.ordem),
            status: String(p.status || "livre"),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Falha ao salvar");
      onClose?.(true); // true = salvou
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert("Não foi possível salvar as disponibilidades. Veja o console.");
    } finally {
      setSalvando(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onClose?.(false)}
      />
      {/* card */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl">
        {/* header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-blue-900">
            Disponibilidade — {professor?.nome || "Professor"} — Dia {diaSemana}
          </h2>
          <p className="text-sm text-gray-500">
            Turno: <span className="uppercase">{turnoNorm}</span>
          </p>
        </div>

        {/* body */}
        <div className="p-6 space-y-4">
          {carregando ? (
            <p className="text-sm text-gray-600">Carregando...</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {periodos.map((p) => (
                  <button
                    key={p.ordem}
                    onClick={() => toggle(p.ordem)}
                    className={[
                      "rounded-xl border px-4 py-3 text-sm font-medium transition",
                      p.status === "livre" && "bg-green-50 border-green-300 text-green-800 hover:bg-green-100",
                      p.status === "evitar" && "bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100",
                      p.status === "indisponivel" && "bg-red-50 border-red-300 text-red-800 hover:bg-red-100",
                    ].filter(Boolean).join(" ")}
                    title="Clique para alternar (livre → evitar → indisponível)"
                  >
                    <div className="text-xs text-gray-500 mb-0.5">Período</div>
                    <div className="text-base">#{p.ordem}</div>
                    <div className="mt-1 text-xs opacity-80">{p.status}</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200">livre</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 border border-yellow-200">evitar</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200">indisponível</span>
                <span className="ml-auto">Clique para alternar</span>
              </div>
            </>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={() => onClose?.(false)}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
