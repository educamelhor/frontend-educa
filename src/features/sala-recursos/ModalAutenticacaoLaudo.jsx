// src/features/sala-recursos/ModalAutenticacaoLaudo.jsx
import React, { useState } from "react";
import {
  XMarkIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

export default function ModalAutenticacaoLaudo({
  isOpen,
  onClose,
  laudo,
  modo = "download", // 'download' | 'view'
  onConfirmar
}) {
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen || !laudo) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!senha.trim()) {
      setErro("Por favor, digite a sua senha de acesso.");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      await onConfirmar(senha);
      setSenha("");
      onClose();
    } catch (err) {
      console.error("Erro na autenticação:", err);
      setErro(err.response?.data?.message || err.message || "Senha incorreta ou erro no download.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Topo do Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <LockClosedIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {modo === "download" ? "Download Protegido por Senha" : "Visualização Segura"}
              </h3>
              <p className="text-xs text-blue-200">Autenticação Pessoal • LGPD Sensível</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{erro}</span>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1 text-xs">
            <p className="text-slate-500 font-medium">Documento solicitado:</p>
            <p className="font-bold text-slate-900 text-sm">{laudo.titulo || laudo.tipo_documento || "Laudo Médico"}</p>
            {laudo.cid && (
              <p className="text-amber-800 font-bold">Classificação: CID {laudo.cid}</p>
            )}
          </div>

          <div className="text-xs text-slate-600 space-y-1.5">
            <p>
              Por determinação da <strong>LGPD (Art. 5º e 14)</strong> para dados médicos sigilosos, informe a sua <strong>senha de login</strong>.
            </p>
            {modo === "download" && (
              <p className="text-blue-900 font-semibold bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                🔒 O PDF baixado será protegido nativamente e <strong>só abrirá quando você digitar esta mesma senha</strong> no leitor de PDF.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Sua Senha de Login
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha de acesso ao sistema"
                className="w-full text-sm font-semibold border border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={carregando}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando || !senha.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {carregando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando...</span>
                </>
              ) : modo === "download" ? (
                <>
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Baixar PDF Protegido</span>
                </>
              ) : (
                <>
                  <EyeIcon className="w-4 h-4" />
                  <span>Descriptografar & Visualizar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
