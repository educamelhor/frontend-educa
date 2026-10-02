// src/features/plataforma/CeoGovernancaBoletim.jsx
// ============================================================================
// GOVERNANÇA CEO — Painel de Prazos Bimestrais para Liberação do Boletim
// Define datas limite que forçam a liberação automática no App EDUCA MOBILE
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

export default function CeoGovernancaBoletim({ onMessage }) {
  const [datas, setDatas] = useState([
    { bimestre: 1, data_limite: "", descricao: "Limite 1º Bimestre" },
    { bimestre: 2, data_limite: "", descricao: "Limite 2º Bimestre" },
    { bimestre: 3, data_limite: "", descricao: "Limite 3º Bimestre" },
    { bimestre: 4, data_limite: "", descricao: "Limite 4º Bimestre" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDatas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/plataforma/governanca/boletim-datas");
      if (data.ok && Array.isArray(data.datas)) {
        setDatas((prev) =>
          prev.map((p) => {
            const found = data.datas.find((d) => Number(d.bimestre) === p.bimestre);
            return {
              ...p,
              data_limite: found?.data_limite || "",
              descricao: found?.descricao || p.descricao,
            };
          })
        );
      }
    } catch (err) {
      console.error("[CEO-GOV-BOLETIM] Erro ao buscar datas:", err);
      if (onMessage) onMessage("Erro ao carregar datas bimestrais.", "erro");
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    fetchDatas();
  }, [fetchDatas]);

  const handleChangeDate = (bimestre, value) => {
    setDatas((prev) =>
      prev.map((d) => (d.bimestre === bimestre ? { ...d, data_limite: value } : d))
    );
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = { datas };
      const { data } = await api.put("/api/plataforma/governanca/boletim-datas", payload);
      if (data.ok) {
        if (onMessage) onMessage("✅ Prazos bimestrais do CEO salvos com sucesso!", "sucesso");
        fetchDatas();
      } else {
        if (onMessage) onMessage(`❌ ${data.message || "Erro ao salvar."}`, "erro");
      }
    } catch (err) {
      console.error("[CEO-GOV-BOLETIM] Erro ao salvar:", err);
      if (onMessage) onMessage("❌ Falha na conexão ao salvar prazos.", "erro");
    } finally {
      setSaving(false);
    }
  };

  const hojeStr = new Date().toISOString().split("T")[0];

  const getStatusBadge = (dLim) => {
    if (!dLim) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          ⚪ Não configurado
        </span>
      );
    }
    if (hojeStr >= dLim) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          ⚡ Liberação Automática Ativa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
        🟢 Prazo Futuro
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30 mb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-indigo-800/50">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 text-2xl shadow-inner">
            📅
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Governança Central de Prazos Bimestrais
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-semibold uppercase tracking-wider">
                Boletim App Mobile
              </span>
            </h2>
            <p className="text-sm text-indigo-200/70 mt-0.5">
              Defina a data-limite bimestral. Quando <code className="text-amber-300 font-mono text-xs">HOJE &gt;= data_limite</code>, o boletim é liberado automaticamente no App EDUCA MOBILE para todas as escolas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <span>💾 Salvar Governança CEO</span>
            </>
          )}
        </button>
      </div>

      {/* Grid of 4 Bimestres */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {datas.map((d) => (
            <div
              key={d.bimestre}
              className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-indigo-500/20 flex flex-col justify-between hover:border-indigo-400/40 transition shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider">
                    {d.bimestre}º Bimestre
                  </span>
                  {getStatusBadge(d.data_limite)}
                </div>

                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Data-Limite para Liberação:
                </label>
                <input
                  type="date"
                  value={d.data_limite || ""}
                  onChange={(e) => handleChangeDate(d.bimestre, e.target.value)}
                  className="w-full bg-slate-900/90 border border-indigo-500/30 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                <span>Regra no App:</span>
                <span className="font-mono text-slate-300 font-semibold">
                  {d.data_limite
                    ? hojeStr >= d.data_limite
                      ? "⚡ Liberação Forçada (1)"
                      : "Direção Escolar"
                    : "Sem Data CEO"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
