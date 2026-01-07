// src/features/monitoramento/CamerasList.jsx
// Lista mínima de câmeras (para o Painel), sem vídeo real ainda.

import React, { useEffect, useState } from "react";

export default function CamerasList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("anju.token") || "";
        const escola_id = localStorage.getItem("escola_id") || localStorage.getItem("escolaId") || "";
        const res = await fetch("/api/monitoramento/cameras", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(escola_id ? { "x-escola-id": escola_id } : {}),
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-3 text-sm text-gray-600">Carregando câmeras…</div>;
  }
  if (err) {
    return <div className="p-3 text-sm text-red-600">Falha ao carregar: {err}</div>;
  }
  if (!items.length) {
    return <div className="p-3 text-sm text-gray-600">Nenhuma câmera cadastrada.</div>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {items.map((cam) => (
        <div key={cam.id} className="border rounded-xl bg-white shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="font-medium">{cam.nome}</div>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${
                cam.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                             : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              {cam.enabled ? "ATIVA" : "INATIVA"}
            </span>
          </div>
          <div className="px-4 pb-4 text-sm text-gray-600">
            <div>Slug: <span className="font-mono">{cam.slug}</span></div>
            <div>Tipo: {cam.tipo}</div>
            <div>Status: <span className="font-medium">UNKNOWN</span></div>
            <div className="mt-2 text-xs text-gray-500">
              (No próximo passo este card exibirá o <em>frame</em> anotado e overlays)
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
