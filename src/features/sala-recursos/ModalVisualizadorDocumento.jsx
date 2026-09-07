// src/features/sala-recursos/ModalVisualizadorDocumento.jsx
import React from "react";
import {
  XMarkIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

export default function ModalVisualizadorDocumento({
  isOpen,
  onClose,
  docData, // { dataUrl, filename, laudo, aluno }
  onDownload
}) {
  if (!isOpen || !docData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Topo do Visualizador */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {docData.laudo?.titulo || docData.laudo?.tipo_documento || "Visualização de Documento AEE"}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <LockClosedIcon className="w-2.5 h-2.5 inline" /> Descriptografado em Memória
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {docData.aluno?.estudante} {docData.laudo?.cid ? `• CID: ${docData.laudo.cid}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                title="Baixar cópia protegida com senha"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Baixar Protegido</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Fechar"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Área do Documento */}
        <div className="flex-1 bg-slate-800 relative w-full h-full">
          <iframe
            src={docData.dataUrl}
            title={docData.filename || "Documento AEE"}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
