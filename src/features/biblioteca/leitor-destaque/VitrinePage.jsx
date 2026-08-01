import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Public API Base URL since we don't have the standard api interceptor with token
const API_URL = import.meta.env.VITE_API_URL || '';

export default function VitrinePage() {
  const { escolaId } = useParams();
  const [destaques, setDestaques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function fetchVitrine() {
      try {
        const { data } = await axios.get(`${API_URL}/api/biblioteca/vitrine/${escolaId}`);
        setDestaques(data.destaques || []);
      } catch (err) {
        setErro('Erro ao carregar a vitrine.');
      } finally {
        setLoading(false);
      }
    }
    fetchVitrine();
  }, [escolaId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (erro || destaques.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-center p-6">
        <span className="text-6xl mb-4">📚</span>
        <h1 className="text-2xl font-bold text-white mb-2">Nenhum Destaque Encontrado</h1>
        <p className="text-slate-400">Esta escola ainda não selecionou leitores destaque.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-x-hidden" style={{ background: 'radial-gradient(circle at top right, #1e1b4b, #0f172a)' }}>
      {/* Header Premium */}
      <header className="p-8 text-center" style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.8), transparent)' }}>
        <h1 className="text-4xl md:text-5xl font-black mb-2" style={{
          background: 'linear-gradient(135deg, #fbbf24, #d97706)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 8px rgba(217,119,6,0.3))'
        }}>
          Vitrine de Destaques
        </h1>
        <p className="text-slate-300 font-medium tracking-wide uppercase text-sm">As melhores resenhas da nossa escola</p>
      </header>

      {/* Grid de Resenhas com Glassmorphism */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destaques.map((resenha, idx) => (
            <div key={resenha.id || idx} className="group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2"
                 style={{
                   background: 'rgba(255, 255, 255, 0.03)',
                   backdropFilter: 'blur(12px)',
                   border: '1px solid rgba(255, 255, 255, 0.1)',
                   boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.05)',
                 }}>
              
              <div className="flex items-start gap-4 mb-5">
                {resenha.livro_capa ? (
                  <img src={resenha.livro_capa} alt={resenha.livro_titulo} className="w-20 h-28 object-cover rounded-xl shadow-lg border border-white/10 group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-20 h-28 bg-slate-800 rounded-xl flex items-center justify-center text-3xl border border-white/5">📖</div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white leading-tight mb-1">{resenha.livro_titulo}</h3>
                  <p className="text-xs text-amber-500 font-semibold mb-2">{resenha.livro_autor}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < (resenha.avaliacao || 5) ? '#f59e0b' : '#334155', fontSize: '0.9rem' }}>★</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-300 mb-6">
                {resenha.resumo && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Resumo</p>
                    <p className="line-clamp-3 leading-relaxed italic border-l-2 border-amber-500/30 pl-3">{resenha.resumo}</p>
                  </div>
                )}
                {resenha.resenha && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opinião do Leitor</p>
                    <p className="line-clamp-4 leading-relaxed">{resenha.resenha}</p>
                  </div>
                )}
                {resenha.favorito && (
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-900/10 border border-amber-500/20">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Trecho Favorito</p>
                    <p className="italic text-amber-100">"{resenha.favorito}"</p>
                  </div>
                )}
              </div>

              {/* Assinatura Anonimizada */}
              <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                  {resenha.turma_nome?.charAt(0) || 'L'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Leitor Destaque</p>
                  <p className="text-[10px] text-slate-400 font-medium">Turma: {resenha.turma_nome || 'N/D'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
