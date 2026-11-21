// src/features/financeiro/ModalUexPdaf.jsx
// ============================================================================
// Modal Clean — Identificação Oficial da Unidade Executora (Caixa Escolar / UEx)
// Preenche o cabeçalho padrão das 5 abas da planilha de Prestação de Contas SEEDF
// ============================================================================

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { XMarkIcon, BuildingLibraryIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { maskCpfCnpj } from "./financeiroUtils";

export default function ModalUexPdaf({ aberto, onFechar, uex, onSalvo }) {
  const [nomeUex, setNomeUex] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setNomeUex(uex?.nome_uex || "");
    setCnpj(maskCpfCnpj(uex?.cnpj || ""));
    setEndereco(uex?.endereco || "");
  }, [aberto, uex]);

  if (!aberto) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nomeUex.trim()) {
      toast.error("Informe o nome da Unidade Executora (Caixa Escolar).");
      return;
    }
    setSalvando(true);
    try {
      await api.put("/api/financeiro/pdaf/uex", {
        nome_uex: nomeUex.trim(),
        cnpj: cnpj.trim(),
        endereco: endereco.trim(),
      });
      toast.success("Identificação da Caixa Escolar salva!");
      if (onSalvo) await onSalvo();
      onFechar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar identificação da UEx.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BuildingLibraryIcon className="w-6 h-6 text-blue-200" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Cabeçalho Oficial da Prestação de Contas
              </span>
              <h2 className="text-lg font-bold">Unidade Executora (Caixa Escolar)</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              UNIDADE EXECUTORA (RAZÃO SOCIAL DA CAIXA ESCOLAR) *
            </label>
            <input
              type="text"
              value={nomeUex}
              onChange={(e) => setNomeUex(e.target.value)}
              placeholder="Ex.: CAIXA ESCOLAR DO CEF04 DE PLANALTINA"
              required
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              CNPJ DA CAIXA ESCOLAR *
            </label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(maskCpfCnpj(e.target.value))}
              placeholder="00.000.000/0001-00"
              required
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ENDEREÇO COMPLETO
            </label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex.: SETOR EDUCACIONAL LOTES C/D PLANALTINA - DF"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {salvando ? "Salvando..." : "Salvar Identificação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
