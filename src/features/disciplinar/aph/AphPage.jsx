import React, { useState } from 'react';
import { 
  HeartIcon, 
  ClockIcon, 
  ArchiveBoxIcon 
} from '@heroicons/react/24/outline';
import AphNovaOcorrencia from './AphNovaOcorrencia';
import AphHistorico from './AphHistorico';
import AphMaterial from './AphMaterial';

export default function AphPage() {
  const [activeTab, setActiveTab] = useState('novo');
  const [editRecord, setEditRecord] = useState(null);

  const tabs = [
    { id: 'novo', label: 'Novo Atendimento', icon: HeartIcon, component: AphNovaOcorrencia },
    { id: 'historico', label: 'Histórico APH', icon: ClockIcon, component: AphHistorico },
    { id: 'material', label: 'Material APH', icon: ArchiveBoxIcon, component: AphMaterial },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || AphNovaOcorrencia;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans pb-10">
      {/* Header / Title */}
      <div className="bg-white border-b border-gray-200 px-6 py-8 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <HeartIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Atendimento Pré-Hospitalar</h1>
              <p className="text-sm text-gray-500 mt-1">Gestão de ocorrências e saúde escolar</p>
            </div>
          </div>

          {/* Custom Tabs */}
          <div className="flex items-center gap-6 mt-8 overflow-x-auto no-scrollbar">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-3 border-b-2 transition-all font-medium text-sm whitespace-nowrap ${
                    isActive 
                      ? 'border-red-500 text-red-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto w-full px-6 py-8">
        <div className="animate-fade-in-up">
          <ActiveComponent onEdit={(record) => { setEditRecord(record); setActiveTab('novo'); }} editRecord={editRecord} onClearEdit={() => setEditRecord(null)} />
        </div>
      </div>
      
      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
