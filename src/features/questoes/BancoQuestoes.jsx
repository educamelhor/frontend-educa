// src/features/questoes/BancoQuestoes.jsx
// 🧩 EDUCA.PROVA — Tab Manager (módulo raiz)

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './questoes.css';
import BancoDashboard    from './BancoDashboard';
import QuestoesBanco     from './QuestoesBanco';
import BancoGlobal       from './BancoGlobal';
import QuestoesBuilder   from './QuestoesBuilder';
import ProvaBuilder      from './ProvaBuilder';
import ProvasHistorico   from './ProvasHistorico';


/* ── Ícones SVG inline ───────────────────────────────────── */
const IconGlobal = () => (
  <svg className="bq-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);
const IconBanco = () => (
  <svg className="bq-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);
const IconBuilder = () => (
  <svg className="bq-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconProva = () => (
  <svg className="bq-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconProvas = () => (
  <svg className="bq-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

/* ── Componente principal ─────────────────────────────────── */
export default function BancoQuestoes() {
  const [activeTab, setActiveTab]             = useState('dashboard');
  const [editingQuestao, setEditingQuestao]   = useState(null);
  const [refreshKey, setRefreshKey]           = useState(0);
  const [dashboardKey, setDashboardKey]       = useState(0); // força refresh do dashboard
  const [provasRefreshKey, setProvasRefreshKey] = useState(0);
  const [totalQuestoes, setTotalQuestoes]     = useState(null);
  const [escola, setEscola]                   = useState({ nome: 'EDUCA.PROVA', sigla: 'EP' });

  /* Carrega info da escola para o header */
  useEffect(() => {
    const stored = localStorage.getItem('escola');
    if (stored) {
      try { setEscola(JSON.parse(stored)); } catch {}
    }
    // Busca total de questões para o badge via api axios (não fetch relativo)
    api.get('/api/questoes/stats')
      .then(({ data }) => setTotalQuestoes(data?.totais?.total ?? data?.totais?.ativas ?? 0))
      .catch(() => setTotalQuestoes(0));
  }, [refreshKey]);

  /* Quando salva uma questão: atualiza contadores e dashboard */
  const handleSaved = () => {
    setRefreshKey(k => k + 1);
    setDashboardKey(k => k + 1);
    setEditingQuestao(null);
  };

  /* Quando arquiva ou exclui uma questão no banco: sincroniza header e dashboard */
  const handleRemovida = () => {
    setRefreshKey(k => k + 1);
    setDashboardKey(k => k + 1);
  };

  /* Quando clica "Editar" num card */
  const handleEdit = (questao) => {
    setEditingQuestao(questao);
    setActiveTab('criar');
  };

  const goToCreate = () => {
    setEditingQuestao(null);
    setActiveTab('criar');
  };

  // Rótulo da escola: mesma fonte que o HeaderGlobal usa ("nome_escola")
  const escolaLabel = localStorage.getItem('nome_escola')
    || localStorage.getItem('escola_apelido')
    || escola.apelido
    || (escola.nome !== 'EDUCA.PROVA' ? escola.nome : null)
    || 'da Escola';

  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <svg className="bq-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    },
    {
      key: 'banco',
      label: `Banco ${escolaLabel}`,
      icon: <IconBanco />,
      count: totalQuestoes !== null ? totalQuestoes : null,
    },
    {
      key: 'global',
      label: 'Banco Global',
      icon: <IconGlobal />,
    },
    {
      key: 'criar',
      label: editingQuestao ? 'Editar Questão' : 'Criar Questão',
      icon: <IconBuilder />,
    },
    {
      key: 'prova',
      label: 'Montar Prova',
      icon: <IconProva />,
    },
    {
      key: 'historico',
      label: 'Provas Salvas',
      icon: <IconProvas />,
    },
  ];

  return (
    <div className="bq-module">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bq-header">
        <div className="bq-header-top">
          <div className="bq-header-icon">🧩</div>
          <div className="bq-header-text">
            <div className="bq-header-title">
              BANCO DE QUESTÕES
              <span style={{
                fontSize: '0.65rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)',
                padding: '2px 8px', borderRadius: 99, marginLeft: 10,
                letterSpacing: '0.04em', verticalAlign: 'middle',
              }}>
                🏫 {escolaLabel}
              </span>
            </div>
            <div className="bq-header-subtitle">
              EDUCA.PROVA — Construtor Inteligente de Provas
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="bq-header-badge">
              <span>⚡</span>
              LaTeX Engine
            </div>
            <div className="bq-header-badge">
              <span>📄</span>
              PDF Premium
            </div>
          </div>
        </div>

        {/* Stats header */}
        {totalQuestoes !== null && (
          <div className="bq-header-stats">
            <div className="bq-stat-chip">
              📚 <span><strong>{totalQuestoes}</strong> questões no banco</span>
            </div>
            <div className="bq-stat-chip">
              🧩 <span><strong>Blocos customizáveis</strong></span>
            </div>
            <div className="bq-stat-chip">
              🎯 <span><strong>Alinhado BNCC</strong></span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bq-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`bq-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => {
                if (tab.key !== 'criar') setEditingQuestao(null);
                setActiveTab(tab.key);
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== null && tab.count !== undefined && (
                <span className="bq-tab-count">{tab.count}</span>
              )}
              {tab.badge && (
                <span className="bq-tab-badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ───────────────────────────────────── */}
      <div className="bq-content">

        {/* Tab: Dashboard */}
        {activeTab === 'dashboard' && (
          <BancoDashboard
            key={dashboardKey}      // força remontagem e re-fetch quando questão é salva
            refreshKey={dashboardKey}
            escolaLabel={escolaLabel}
            onCriarQuestao={goToCreate}
            onVerBanco={() => setActiveTab('banco')}
          />
        )}

        {/* Tab: Banco da Escola */}
        {activeTab === 'banco' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <button className="bq-btn bq-btn-primary" onClick={goToCreate}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nova Questão
              </button>
            </div>
            <QuestoesBanco onEdit={handleEdit} refreshKey={refreshKey} onRemovida={handleRemovida} />
          </>
        )}

        {/* Tab: Banco Global EDUCA.MELHOR */}
        {activeTab === 'global' && (
          <BancoGlobal />
        )}

        {/* Tab: Criar / Editar */}
        {activeTab === 'criar' && (
          <QuestoesBuilder
            editingQuestao={editingQuestao}
            onSaved={handleSaved}
            onCancel={() => { setEditingQuestao(null); setActiveTab('banco'); }}
          />
        )}

        {/* Tab: Montar Prova */}
        {activeTab === 'prova' && (
          <ProvaBuilder
            onProvasSalvas={() => setProvasRefreshKey(k => k + 1)}
          />
        )}

        {/* Tab: Provas Salvas */}
        {activeTab === 'historico' && (
          <ProvasHistorico
            refreshKey={provasRefreshKey}
            onEdit={(prova) => setActiveTab('prova')}
          />
        )}
      </div>
    </div>
  );
}
