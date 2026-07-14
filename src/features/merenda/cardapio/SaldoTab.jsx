import React, { useState, useEffect } from "react";
import { PrinterIcon, ClipboardDocumentCheckIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function SaldoTab() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isConferencia, setIsConferencia] = useState(false);
  const [conferenciaData, setConferenciaData] = useState({}); // { key: kg }

  useEffect(() => {
    fetchSaldoCompleto();
  }, []);

  const fetchSaldoCompleto = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/merenda/saldo-completo");
      setItens(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar saldo.");
    } finally {
      setLoading(false);
    }
  };

  const getEstoqueKey = (item) => `${item.produto_id}||${item.lote || ''}||${item.validade || ''}`;

  const toggleConferencia = () => {
    setIsConferencia(!isConferencia);
    if (!isConferencia) {
      setConferenciaData({});
    }
  };

  const handleConferenciaChange = (key, value) => {
    setConferenciaData(prev => ({ ...prev, [key]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col print:p-0 print:bg-white">
      {/* Cabeçalho que será ocultado na impressão */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Painel de Saldo</h2>
          <p className="text-sm text-gray-500">
            {isConferencia 
              ? "Modo Conferência: Digite o estoque físico para auditar diferenças."
              : "Consulte o saldo atual e gere o relatório de prestação de contas."}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {!isConferencia && (
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <PrinterIcon className="w-5 h-5" />
              Imprimir PDF
            </button>
          )}

          <button
            onClick={toggleConferencia}
            className={`px-5 py-2.5 font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ${
              isConferencia 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
            }`}
          >
            <ClipboardDocumentCheckIcon className="w-5 h-5" />
            {isConferencia ? "Sair da Conferência" : "Iniciar Conferência"}
          </button>
        </div>
      </div>

      {/* Título Visível Apenas na Impressão */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-800">Prestação de Contas - Saldo de Estoque</h1>
        <p className="text-sm text-gray-500 mt-1">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
      </div>

      {/* Tabela de Saldo */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm print:text-xs">
            <thead className="bg-gray-50 border-b-2 border-gray-100 text-gray-600 print:bg-white print:border-gray-800">
              <tr>
                <th className="py-4 px-6 font-semibold tracking-wide">PRODUTO / CATEGORIA</th>
                <th className="py-4 px-6 font-semibold tracking-wide">LOTE</th>
                <th className="py-4 px-6 font-semibold tracking-wide">VALIDADE</th>
                <th className="py-4 px-6 font-semibold tracking-wide text-right">SALDO SISTEMA</th>
                
                {isConferencia && (
                  <>
                    <th className="py-4 px-6 font-semibold tracking-wide text-center bg-emerald-50 text-emerald-800">DEPÓSITO (KG)</th>
                    <th className="py-4 px-6 font-semibold tracking-wide text-center">DIFERENÇA</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 print:divide-gray-200">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={isConferencia ? 6 : 4} className="py-12 text-center text-gray-500">
                    Nenhum gênero foi registrado no estoque até o momento.
                  </td>
                </tr>
              ) : (
                itens.map((item) => {
                  const key = getEstoqueKey(item);
                  const saldoSistemaKg = Number(item.saldo_kg);
                  const isZerado = saldoSistemaKg <= 0;
                  
                  // Calculos Conferência
                  const digitadoStr = conferenciaData[key];
                  const hasDigitado = digitadoStr !== undefined && digitadoStr !== "";
                  const depositoKg = hasDigitado ? parseFloat(digitadoStr) : null;
                  
                  let diferenca = null;
                  let colorClass = "text-gray-400";
                  let bgClass = "";
                  
                  if (hasDigitado && depositoKg !== null && !isNaN(depositoKg)) {
                    diferenca = depositoKg - saldoSistemaKg;
                    if (diferenca >= 0) {
                      colorClass = "text-emerald-600 font-bold";
                      bgClass = "bg-emerald-50";
                    } else {
                      colorClass = "text-red-600 font-bold";
                      bgClass = "bg-red-50";
                    }
                  }

                  return (
                    <tr key={key} className={`hover:bg-gray-50/50 transition-colors ${isZerado && !isConferencia ? 'opacity-60 grayscale' : ''}`}>
                      <td className="py-3 px-6">
                        <div className="font-semibold text-gray-800">{item.produto}</div>
                        <div className="text-xs text-gray-500">{item.marca} • {item.categoria}</div>
                      </td>
                      <td className="py-3 px-6">
                        {item.lote ? (
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 text-xs border border-gray-200">
                            {item.lote}
                          </span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-3 px-6 text-gray-600">
                        {item.validade ? (() => {
                          const [yyyy, mm, dd] = String(item.validade).split('T')[0].split('-');
                          return `${dd}/${mm}/${yyyy}`;
                        })() : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className={`text-base font-bold ${isZerado ? 'text-gray-400' : 'text-gray-800'}`}>
                          {saldoSistemaKg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 4 })} <span className="text-xs font-normal">kg</span>
                        </div>
                      </td>

                      {isConferencia && (
                        <>
                          <td className="py-3 px-4 bg-emerald-50/30 text-center align-middle">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={conferenciaData[key] || ""}
                              onChange={(e) => handleConferenciaChange(key, e.target.value)}
                              className="w-24 text-center px-2 py-1.5 border border-emerald-200 rounded outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-semibold text-emerald-900 bg-white shadow-inner mx-auto block"
                            />
                          </td>
                          <td className={`py-3 px-6 text-center ${bgClass}`}>
                            {hasDigitado && diferenca !== null ? (
                              <div className="flex items-center justify-center gap-1.5">
                                {diferenca >= 0 ? (
                                  <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <XCircleIcon className="w-5 h-5 text-red-500" />
                                )}
                                <span className={colorClass}>
                                  {diferenca > 0 ? '+' : ''}{diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
