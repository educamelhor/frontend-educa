// src/features/biblioteca/acervo/ConfirmarExclusaoModal.jsx
// ============================================================================
// Modal Premium de Confirmação para Inativação de Livro do Acervo
// Substitui o window.confirm padrão do navegador por um design elegante e seguro
// ============================================================================
import React, { useEffect } from 'react';

export default function ConfirmarExclusaoModal({ livro, onConfirm, onCancel, loading, error }) {
  // Fecha com a tecla Escape caso não esteja carregando
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, loading]);

  if (!livro) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-white border border-rose-100"
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          animation: 'modalEntrada 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Header Premium com Gradiente Carmim/Rubi */}
        <div
          className="relative px-6 pt-6 pb-5 text-white"
          style={{
            background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 55%, #ea580c 100%)',
          }}
        >
          {/* Brilho sutil no fundo */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          {/* Botão fechar (X) */}
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition disabled:opacity-40"
            title="Cancelar e fechar"
          >
            ✕
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-200 block">
                Biblioteca Escolar
              </span>
              <h3 className="text-xl font-black text-white leading-tight">
                Inativar Livro do Acervo
              </h3>
            </div>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Tem certeza de que deseja inativar esta obra do acervo da escola?
          </p>

          {/* Card Detalhado do Livro */}
          <div className="flex gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 items-start">
            {/* Capa Thumbnail */}
            <div
              className="w-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm"
              style={{
                aspectRatio: '2/3',
                background: livro.capa_url ? '#000' : 'linear-gradient(135deg, #064e3b, #0d9488)',
              }}
            >
              {livro.capa_url ? (
                <img
                  src={livro.capa_url}
                  alt={livro.titulo}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-2xl select-none">📗</span>
              )}
            </div>

            {/* Metadados da Obra */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                {livro.titulo}
              </h4>
              {livro.autor && (
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {livro.autor}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {livro.isbn && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono">
                    ISBN: {livro.isbn}
                  </span>
                )}
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
                  {livro.exemplares || 1} {livro.exemplares > 1 ? 'exemplares' : 'exemplar'}
                </span>
                {livro.local_estante && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700">
                    📍 {livro.local_estante}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card Informativo de Preservação de Histórico */}
          <div className="rounded-2xl p-3.5 bg-amber-50/90 border border-amber-200/90 flex items-start gap-3 text-amber-900">
            <span className="text-xl shrink-0 mt-0.5 select-none">🛡️</span>
            <div className="text-xs leading-relaxed space-y-1">
              <p className="font-bold text-amber-950">Histórico mantido e protegido</p>
              <p className="text-amber-800">
                O histórico de empréstimos anteriores, devoluções e resenhas registradas para esta obra será totalmente mantido. Ela apenas deixará de ficar disponível para novas retiradas.
              </p>
            </div>
          </div>

          {/* Alerta de Erro caso a requisição falhe */}
          {error && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-red-500/25 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Inativando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Sim, Inativar Livro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
