import React, { useState } from "react";
import { 
  ClipboardDocumentListIcon,
  TruckIcon,
  ScaleIcon,
  BanknotesIcon,
  CalendarDaysIcon
} from "@heroicons/react/24/outline";

export default function MerendaCardapioPage() {
  const [activeTab, setActiveTab] = useState("chegada");

  const tabs = [
    { id: "chegada", label: "CHEGADA DE GÊNEROS", icon: <TruckIcon className="w-5 h-5" /> },
    { id: "percapita", label: "PERCÁPITA", icon: <ScaleIcon className="w-5 h-5" /> },
    { id: "cardapio", label: "CARDÁPIO", icon: <CalendarDaysIcon className="w-5 h-5" /> },
    { id: "saldo", label: "SALDO", icon: <BanknotesIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="p-6 md:p-8 min-h-screen bg-gray-50/50">
      
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        {/* Efeito visual de fundo no header */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-amber-400 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-orange-500 opacity-10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20">
            <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Gestão de Cardápio e Estoque</h1>
            <p className="text-sm text-gray-500 mt-1">Controle de chegadas, cardápios diários e saldo de merenda</p>
          </div>
        </div>
      </div>

      {/* TABS MENU */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-amber-50 text-amber-600 shadow-sm border border-amber-100"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABS CONTENT */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
        {activeTab === "chegada" && (
          <div className="p-8 text-center text-gray-500">
            <TruckIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-700">Tabela: Chegada de Gêneros</h3>
            <p className="text-sm mt-1">A renderização desta tabela será detalhada no próximo passo.</p>
          </div>
        )}

        {activeTab === "percapita" && (
          <div className="p-8 text-center text-gray-500">
            <ScaleIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-700">Tabela: Percápita</h3>
            <p className="text-sm mt-1">A renderização desta tabela será detalhada no próximo passo.</p>
          </div>
        )}

        {activeTab === "cardapio" && (
          <div className="p-8 text-center text-gray-500">
            <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-700">Tabela: Cardápio</h3>
            <p className="text-sm mt-1">A renderização desta tabela será detalhada no próximo passo.</p>
          </div>
        )}

        {activeTab === "saldo" && (
          <div className="p-8 text-center text-gray-500">
            <BanknotesIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-700">Tabela: Saldo</h3>
            <p className="text-sm mt-1">A renderização desta tabela será detalhada no próximo passo.</p>
          </div>
        )}
      </div>

    </div>
  );
}
