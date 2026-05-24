// src/features/biblioteca/metadados/MetadadosPage.jsx
// ============================================================================
// Dashboard analítico + configurações do módulo Biblioteca
// ============================================================================
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

function StatCard({ icon, label, value, color, gradient }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: gradient || '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: `0 4px 24px ${color}22`,
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}33` }}
      >
        {icon}
      </div>
      <div>
        <p className="text-3xl font-black" style={{ color }}>{value ?? '—'}</p>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function BarChart({ items, valueKey, labelKey, color = '#10b981', title }) {
  if (!items || items.length === 0) return null;
  const max = Math.max(...items.map(i => i[valueKey] || 0));
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => {
          const pct = max > 0 ? ((item[valueKey] / max) * 100).toFixed(1) : 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <p className="text-xs text-slate-600 w-28 flex-shrink-0 truncate font-medium">{item[labelKey]}</p>
              <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                <div
                  className="h-full rounded-full flex items-center pl-2 transition-all"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    minWidth: pct > 0 ? '2rem' : 0,
                    transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <span className="text-white text-xs font-bold">{item[valueKey]}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MetadadosPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: resp } = await api.get('/api/biblioteca/metadados');
        setData(resp);
      } catch { setData(null); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Carregando dados...</p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const generos = data?.generos || [];
  const maisLidos = data?.mais_lidos || [];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 8px 32px rgba(30,41,59,0.3)' }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">📊</span>
          <h1 className="text-2xl font-black text-white">Painel da Biblioteca</h1>
        </div>
        <p className="text-slate-400 text-sm">Visão geral do acervo, leitores e atividades</p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard icon="📚" label="Títulos no acervo" value={stats.total_livros} color="#10b981" />
        <StatCard icon="📋" label="Empréstimos ativos" value={stats.emprestimos_ativos} color="#3b82f6" />
        <StatCard icon="⚠️" label="Em atraso" value={stats.emprestimos_atrasados} color="#ef4444" />
        <StatCard icon="⭐" label="Leitores destaque" value={stats.total_destaques} color="#f59e0b" />
        <StatCard icon="👤" label="Alunos leitores" value={stats.alunos_leitores} color="#8b5cf6" />
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <BarChart
          items={maisLidos}
          valueKey="total_emprestimos"
          labelKey="titulo"
          color="#10b981"
          title="📚 Livros mais emprestados"
        />
        <BarChart
          items={generos}
          valueKey="total"
          labelKey="genero"
          color="#7c3aed"
          title="🏷️ Distribuição por gênero"
        />
      </div>

      {/* Livros mais lidos — Cards */}
      {maisLidos.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span>🏆</span> Top {Math.min(maisLidos.length, 10)} — Mais Emprestados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {maisLidos.slice(0, 10).map((livro, i) => {
              const getApiBaseUrl = () => {
                const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
                if (envUrl) return String(envUrl).replace(/\/api$/, '').replace(/\/$/, '');
                const host = window.location.hostname;
                return host === 'localhost' || host === '127.0.0.1'
                  ? 'http://localhost:3000'
                  : 'https://educa-backend-docker-659zo.ondigitalocean.app';
              };
              const capa = livro.capa_url
                ? (livro.capa_url.startsWith('http') ? livro.capa_url : `${getApiBaseUrl()}${livro.capa_url}`)
                : null;
              return (
                <div key={livro.id} className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div className="h-36 relative">
                    {capa ? (
                      <img src={capa} alt={livro.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #064e3b, #047857)' }}>
                        <span className="text-3xl">📚</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs"
                      style={{ background: i < 3 ? '#f59e0b' : '#1e293b', color: '#fff' }}>
                      {i + 1}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{livro.titulo}</p>
                    <p className="text-xs text-slate-400 mt-1">{livro.total_emprestimos} empréstimos</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instruções de uso */}
      <div className="mt-8 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0' }}>
        <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">💡 Dicas de uso do módulo</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { icon: '🔍', text: 'Use o ISBN na aba Acervo para preencher automaticamente título, autor e capa via Google Books' },
            { icon: '📋', text: 'Registre empréstimos e devoluções para manter o controle de estoque atualizado em tempo real' },
            { icon: '⭐', text: 'Aprove resenhas na aba Leitor Destaque e promova os melhores para "Destaque" ganham pontuação extra' },
            { icon: '🏆', text: 'Crie concursos na aba Concurso para motivar a leitura com ranking e culminância literária' },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
              <span className="text-xl flex-shrink-0">{tip.icon}</span>
              <p className="text-sm text-emerald-800">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
