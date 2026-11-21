// src/features/financeiro/ModalPortariaPdaf.jsx
// ============================================================================
// Modal Clean — Cadastro e Edição de Portaria PDAF (Ordinário ou Emenda Parlamentar)
// Suporta Saldo Reprogramado do Ano Anterior + Transporte Automático entre Trimestres
// + Metadados Oficiais da 5ª Aba (Emenda Parlamentar: Deputado, SEI, Destinação)
// ============================================================================

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { XMarkIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import {
  formatBRL,
  maskMoedaInput,
  numberToMoedaInput,
  parseMoedaInput,
  hojeIso,
} from "./financeiroUtils";

export default function ModalPortariaPdaf({
  aberto,
  onFechar,
  exercicio,
  trimestreSugerido = 1,
  portariaEdicao = null,
  onSalvo,
}) {
  const [tipo, setTipo] = useState("ORDINARIO");
  const [numeroPortaria, setNumeroPortaria] = useState("");
  const [dataPortaria, setDataPortaria] = useState(hojeIso());
  const [tituloPortaria, setTituloPortaria] = useState("");
  const [ehReprogramado, setEhReprogramado] = useState(false);
  const [trimestreEntrada, setTrimestreEntrada] = useState(trimestreSugerido || 1);
  const [custeioStr, setCusteioStr] = useState("");
  const [capitalStr, setCapitalStr] = useState("");

  // Campos exclusivos de Emenda Parlamentar (Aba 5 da planilha SEEDF)
  const [deputado, setDeputado] = useState("");
  const [processoSeiLiberacao, setProcessoSeiLiberacao] = useState("");
  const [dataPagamentoCredito, setDataPagamentoCredito] = useState("");
  const [destinacaoOficio, setDestinacaoOficio] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    if (portariaEdicao) {
      setTipo(portariaEdicao.tipo || "ORDINARIO");
      setNumeroPortaria(portariaEdicao.numero_portaria || "");
      setDataPortaria(portariaEdicao.data_portaria || "");
      setTituloPortaria(portariaEdicao.titulo_portaria || "");
      setEhReprogramado(Boolean(portariaEdicao.eh_reprogramado));
      setTrimestreEntrada(Number(portariaEdicao.trimestre_entrada || 1));
      setCusteioStr(numberToMoedaInput(portariaEdicao.credito_custeio));
      setCapitalStr(numberToMoedaInput(portariaEdicao.credito_capital));
      setDeputado(portariaEdicao.deputado || "");
      setProcessoSeiLiberacao(portariaEdicao.processo_sei_liberacao || "");
      setDataPagamentoCredito(portariaEdicao.data_pagamento_credito || "");
      setDestinacaoOficio(portariaEdicao.destinacao_oficio || "");
    } else {
      setTipo("ORDINARIO");
      setNumeroPortaria("");
      setDataPortaria(hojeIso());
      setTituloPortaria("");
      setEhReprogramado(false);
      setTrimestreEntrada(trimestreSugerido || 1);
      setCusteioStr("");
      setCapitalStr("");
      setDeputado("");
      setProcessoSeiLiberacao("");
      setDataPagamentoCredito("");
      setDestinacaoOficio("");
    }
  }, [aberto, portariaEdicao, trimestreSugerido]);

  if (!aberto) return null;

  const valorCusteio = parseMoedaInput(custeioStr);
  const valorCapital = parseMoedaInput(capitalStr);
  const totalPortaria = valorCusteio + valorCapital;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!numeroPortaria.trim()) {
      toast.error("Informe o código da Portaria (ex.: 122/2026 ou 048/2025).");
      return;
    }
    if (totalPortaria <= 0) {
      toast.error("Informe o valor de Crédito Custeio e/ou Crédito Capital.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        exercicio,
        tipo,
        numero_portaria: numeroPortaria.trim(),
        titulo_portaria: tituloPortaria.trim() || undefined,
        data_portaria: dataPortaria || null,
        eh_reprogramado: ehReprogramado,
        trimestre_entrada: ehReprogramado ? 1 : Number(trimestreEntrada),
        credito_custeio: valorCusteio,
        credito_capital: valorCapital,
        deputado: tipo === "EMENDA" ? deputado.trim() || null : null,
        processo_sei_liberacao: tipo === "EMENDA" ? processoSeiLiberacao.trim() || null : null,
        data_pagamento_credito: tipo === "EMENDA" ? dataPagamentoCredito || null : null,
        destinacao_oficio: tipo === "EMENDA" ? destinacaoOficio.trim() || null : null,
      };

      if (portariaEdicao?.id) {
        await api.put(`/api/financeiro/pdaf/portarias/${portariaEdicao.id}`, payload);
        toast.success("Portaria atualizada!");
      } else {
        await api.post("/api/financeiro/pdaf/portarias", payload);
        toast.success("Portaria registrada!");
      }

      if (onSalvo) await onSalvo();
      onFechar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar Portaria.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-blue-200" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                PDAF • Exercício {exercicio}
              </span>
              <h2 className="text-lg font-bold">
                {portariaEdicao ? "Editar Portaria" : "Cadastrar Portaria de Recurso"}
              </h2>
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

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Seleção de Tipo: Ordinário vs Emenda */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "ORDINARIO", label: "PDAF Ordinário" },
              { value: "EMENDA", label: "Emenda Parlamentar" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTipo(opt.value)}
                className={`py-2.5 px-4 rounded-xl text-sm font-bold border transition cursor-pointer ${
                  tipo === opt.value
                    ? "bg-green-600 text-white border-green-600 shadow-sm"
                    : "bg-white text-blue-900 border-blue-300 hover:bg-blue-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Origem do Crédito: Saldo Reprogramado do Ano Anterior vs Liberação Nova */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ehReprogramado}
                onChange={(e) => {
                  setEhReprogramado(e.target.checked);
                  if (e.target.checked) setTrimestreEntrada(1);
                }}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                Saldo reprogramado de exercício anterior (entra na abertura do 1º Trimestre/{exercicio})
              </span>
            </label>

            {!ehReprogramado && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-semibold text-slate-600">
                  Trimestre de entrada do recurso em {exercicio}:
                </span>
                <select
                  value={trimestreEntrada}
                  onChange={(e) => setTrimestreEntrada(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                >
                  <option value={1}>1º Trimestre (Jan–Mar)</option>
                  <option value={2}>2º Trimestre (Abr–Jun)</option>
                  <option value={3}>3º Trimestre (Jul–Set)</option>
                  <option value={4}>4º Trimestre (Out–Dez)</option>
                </select>
              </div>
            )}
          </div>

          {/* Número, Data e Rótulo */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nº / Ano da Portaria *
              </label>
              <input
                type="text"
                value={numeroPortaria}
                onChange={(e) => setNumeroPortaria(e.target.value)}
                placeholder="Ex.: 122/2026"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data de Publicação
              </label>
              <input
                type="date"
                value={dataPortaria}
                onChange={(e) => setDataPortaria(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição Curta (Opcional)
              </label>
              <input
                type="text"
                value={tituloPortaria}
                onChange={(e) => setTituloPortaria(e.target.value)}
                placeholder="Automático: PORT Nº - Data"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Valores Custeio e Capital */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
              <label className="block text-xs font-extrabold uppercase text-blue-900 mb-1">
                {ehReprogramado ? `Saldo Custeio Reprogramado (R$)` : `Crédito Custeio (R$)`}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={custeioStr}
                onChange={(e) => setCusteioStr(maskMoedaInput(e.target.value))}
                placeholder="0,00"
                className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-base font-extrabold text-right text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
              <label className="block text-xs font-extrabold uppercase text-emerald-900 mb-1">
                {ehReprogramado ? `Saldo Capital Reprogramado (R$)` : `Crédito Capital (R$)`}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={capitalStr}
                onChange={(e) => setCapitalStr(maskMoedaInput(e.target.value))}
                placeholder="0,00"
                className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-base font-extrabold text-right text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Campos Oficiais da 5ª Aba: EMENDA PARLAMENTAR */}
          {tipo === "EMENDA" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-violet-800">
                Dados da Ficha de Emenda Parlamentar (Aba Específica SEEDF)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deputado(a) Autor(a)
                  </label>
                  <input
                    type="text"
                    value={deputado}
                    onChange={(e) => setDeputado(e.target.value)}
                    placeholder="Nome do parlamentar"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Processo SEI de Liberação
                  </label>
                  <input
                    type="text"
                    value={processoSeiLiberacao}
                    onChange={(e) => setProcessoSeiLiberacao(e.target.value)}
                    placeholder="Ex.: 00080-00012345/2026-00"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data do Crédito na Conta
                  </label>
                  <input
                    type="date"
                    value={dataPagamentoCredito}
                    onChange={(e) => setDataPagamentoCredito(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destinação do Recurso (Ofício do Deputado)
                  </label>
                  <input
                    type="text"
                    value={destinacaoOficio}
                    onChange={(e) => setDestinacaoOficio(e.target.value)}
                    placeholder="Objeto descrito no ofício parlamentar"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-600">
              Total da Portaria:{" "}
              <strong className="text-slate-900 text-sm">{formatBRL(totalPortaria)}</strong>
            </span>

            <div className="flex items-center gap-2.5">
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
                {salvando ? "Salvando..." : portariaEdicao ? "Salvar Alterações" : "Cadastrar Portaria"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
