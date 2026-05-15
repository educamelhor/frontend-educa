// src/features/disciplinar/atas/AtasPage.jsx
// ============================================================================
// Módulo Atas Disciplinares — CRUD + Rastreabilidade + Impressão Premium
// Integrado com /api/disciplinar-atas (backend real)
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  DocumentTextIcon,
  PlusIcon,
  PrinterIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  UserIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ── Animações CSS (injetadas no head) ─────────────────────────────────────
const ANIM_CSS = `
@keyframes ata-slide-up { from { opacity:0; transform:translateY(20px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
@keyframes ata-fade-in  { from { opacity:0 } to { opacity:1 } }
@keyframes ata-spin     { to { transform: rotate(360deg) } }
.ata-slide-up { animation: ata-slide-up 0.30s cubic-bezier(0.16,1,0.3,1) both; }
.ata-fade-in  { animation: ata-fade-in  0.22s ease-out both; }
.ata-spinner  { animation: ata-spin 0.8s linear infinite; }
`;
(function injectAnims() {
  if (document.getElementById('ata-page-css')) return;
  const el = document.createElement('style');
  el.id = 'ata-page-css';
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
})();

// ── Formatação de data ─────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

// ── Componente de Tag de Status ───────────────────────────────────────────
function StatusTag({ status }) {
  const isDone = status === 'Finalizado';
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: isDone ? '#dcfce7' : '#fef9c3',
      color:      isDone ? '#16a34a' : '#ca8a04',
      border:     `1px solid ${isDone ? '#bbf7d0' : '#fef08a'}`,
    }}>
      {status}
    </span>
  );
}

// ── Toast simples ─────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="ata-fade-in" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'error' ? '#fee2e2' : '#dcfce7',
      border: `1px solid ${type === 'error' ? '#fca5a5' : '#bbf7d0'}`,
      color: type === 'error' ? '#991b1b' : '#166534',
      padding: '12px 20px', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      fontSize: 14, fontWeight: 600, maxWidth: 320,
    }}>
      {msg}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
export default function AtasPage() {
  const [atas, setAtas]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]         = useState(null);
  const [isViewing, setIsViewing] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [busca, setBusca]       = useState('');
  const [toast, setToast]       = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAtas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/disciplinar-atas');
      setAtas(data || []);
    } catch {
      showToast('Erro ao carregar atas.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAtas(); }, [fetchAtas]);

  const atasFiltradas = atas.filter(a =>
    a.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  // ── Handlers CRUD ────────────────────────────────────────────────────────
  const openNew   = ()    => { setForm({ titulo: '', conteudo: '' }); setIsViewing(false); setModalOpen(true); };
  const openEdit  = (ata) => { if (ata.status === 'Finalizado') return; setForm({ ...ata }); setIsViewing(false); setModalOpen(true); };
  const openView  = (ata) => { setForm({ ...ata }); setIsViewing(true); setModalOpen(true); };
  const closeModal = ()   => { setModalOpen(false); setForm(null); };

  const handleSave = async () => {
    if (!form.titulo?.trim() || !form.conteudo?.trim()) {
      showToast('Título e conteúdo são obrigatórios.', 'error'); return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/api/disciplinar-atas/${form.id}`, { titulo: form.titulo, conteudo: form.conteudo });
        showToast('Ata atualizada com sucesso!');
      } else {
        await api.post('/api/disciplinar-atas', { titulo: form.titulo, conteudo: form.conteudo });
        showToast('Ata criada com sucesso!');
      }
      closeModal();
      fetchAtas();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao salvar ata.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!form?.id) return;
    if (!window.confirm('Tem certeza que deseja finalizar esta ata? Ela não poderá mais ser editada.')) return;
    setSaving(true);
    try {
      await api.post(`/api/disciplinar-atas/${form.id}/finalizar`);
      showToast('Ata finalizada com sucesso!');
      closeModal();
      fetchAtas();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao finalizar ata.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (ata) => {
    setPrintingId(ata.id);
    try {
      const response = await api.get(`/api/disciplinar-atas/${ata.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      showToast('Erro ao gerar PDF. Tente novamente.', 'error');
    } finally {
      setPrintingId(null);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto pb-16">

      {/* ── TOAST ── */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ══ HERO HEADER ══════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-12 mb-8 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #172554 100%)' }}
      >
        {/* Bolha decorativa */}
        <div style={{ position:'absolute', top:'-30%', right:'-10%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
                 style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)' }}>
              <DocumentTextIcon style={{ width:14, height:14, color:'#bfdbfe' }} />
              <span style={{ fontSize:10, fontWeight:800, color:'#bfdbfe', letterSpacing:'0.1em', textTransform:'uppercase' }}>Gestão Disciplinar</span>
            </div>
            <h1 style={{ fontSize:32, fontWeight:800, color:'#fff', margin:'0 0 8px', letterSpacing:'-0.03em', lineHeight:1.15 }}>
              Atas e Registros Oficiais
            </h1>
            <p style={{ color:'rgba(219,234,254,0.8)', fontSize:15, margin:0, maxWidth:520, lineHeight:1.6 }}>
              Sistema seguro para criação, rastreabilidade e impressão oficial de atas disciplinares — com cabeçalho institucional completo.
            </p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={fetchAtas}
              title="Atualizar"
              style={{ padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer' }}
            >
              <ArrowPathIcon style={{ width:18, height:18 }} />
            </button>
            <button
              onClick={openNew}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 28px', borderRadius:14, border:'none', cursor:'pointer', background:'#fff', color:'#1e3a8a', fontSize:14, fontWeight:700, boxShadow:'0 6px 20px rgba(0,0,0,0.15)', transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; }}
            >
              <PlusIcon style={{ width:18, height:18 }} /> Nova Ata
            </button>
          </div>
        </div>
      </div>

      {/* ══ TABELA ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden ata-fade-in">
        <div className="p-6 md:p-8">

          {/* Busca */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar atas por título..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ width:'100%', padding:'12px 20px', borderRadius:12, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:14, outline:'none', boxSizing:'border-box' }}
              onFocus={e => { e.target.style.border='1.5px solid #1e3a8a'; e.target.style.background='#fff'; }}
              onBlur={e => { e.target.style.border='1.5px solid #e2e8f0'; e.target.style.background='#f8fafc'; }}
            />
          </div>

          {/* Loading */}
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:40, color:'#94a3b8', fontSize:14 }}>
              <div className="ata-spinner" style={{ width:20, height:20, border:'2.5px solid #e2e8f0', borderTopColor:'#1e3a8a', borderRadius:'50%' }} />
              Carregando atas...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Documento', 'Status', 'Autoria (Última Ação)', 'Ações'].map((h, i) => (
                      <th key={i} style={{ padding: '12px 16px', textAlign: i === 3 ? 'center' : 'left', fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {atasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                        <ExclamationTriangleIcon style={{ width:32, height:32, margin:'0 auto 8px', display:'block', opacity:0.4 }} />
                        {busca ? 'Nenhuma ata encontrada para esta busca.' : 'Nenhuma ata cadastrada ainda.'}
                      </td>
                    </tr>
                  ) : atasFiltradas.map((ata) => (
                    <tr
                      key={ata.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{ata.titulo}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>ID #{ata.id}</div>
                      </td>
                      <td style={{ padding: '16px' }}><StatusTag status={ata.status} /></td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
                          <UserIcon style={{ width: 14, height: 14 }} />
                          {ata.editado_por || ata.criado_por || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          <ClockIcon style={{ width: 13, height: 13 }} />
                          {fmtDate(ata.editado_em || ata.criado_em)}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button onClick={() => openView(ata)} title="Visualizar" style={{ padding: 8, borderRadius: 8, background: '#eff6ff', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>
                            <EyeIcon style={{ width: 15, height: 15 }} />
                          </button>
                          {ata.status !== 'Finalizado' && (
                            <button onClick={() => openEdit(ata)} title="Editar" style={{ padding: 8, borderRadius: 8, background: '#fef3c7', color: '#d97706', border: 'none', cursor: 'pointer' }}>
                              <PencilSquareIcon style={{ width: 15, height: 15 }} />
                            </button>
                          )}
                          <button
                            onClick={() => handlePrint(ata)}
                            title="Imprimir"
                            disabled={printingId === ata.id}
                            style={{ padding: 8, borderRadius: 8, background: '#e0e7ff', color: '#4338ca', border: 'none', cursor: printingId === ata.id ? 'not-allowed' : 'pointer', opacity: printingId === ata.id ? 0.6 : 1 }}
                          >
                            {printingId === ata.id
                              ? <div className="ata-spinner" style={{ width:15, height:15, border:'2px solid #c7d2fe', borderTopColor:'#4338ca', borderRadius:'50%' }} />
                              : <PrinterIcon style={{ width: 15, height: 15 }} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL CRUD / VIEW ════════════════════════════════════════════════ */}
      {modalOpen && form && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 ata-fade-in"
          style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="ata-slide-up bg-white w-full flex flex-col" style={{ maxWidth:720, maxHeight:'92vh', borderRadius:20, overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.25)' }}>

            {/* Header Modal */}
            <div style={{ padding:'20px 24px', background:'linear-gradient(135deg,#1e3a8a,#1e40af)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <h2 style={{ fontSize:17, fontWeight:800, color:'#fff', margin:0 }}>
                  {isViewing ? '📄 Visualizar Ata' : (form.id ? '✏️ Editar Ata' : '➕ Nova Ata')}
                </h2>
                {form.id && <p style={{ fontSize:11, color:'rgba(219,234,254,0.8)', margin:'2px 0 0' }}>ID #{form.id}</p>}
              </div>
              <button onClick={closeModal} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:8, color:'#fff', cursor:'pointer' }}>
                <XMarkIcon style={{ width:20, height:20 }} />
              </button>
            </div>

            {/* Body Modal */}
            <div style={{ padding:24, overflowY:'auto', flex:1 }}>

              {/* ── Rastreabilidade (se edição/view) ── */}
              {form.id && (
                <div style={{ background:'#f8fafc', padding:16, borderRadius:12, marginBottom:20, border:'1px solid #e2e8f0' }}>
                  <p style={{ fontWeight:800, color:'#0f172a', marginBottom:10, fontSize:13, margin:'0 0 10px' }}>🔍 Rastreabilidade do Documento</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:12 }}>
                    <div style={{ color:'#475569' }}>
                      <span style={{ fontWeight:700 }}>Criado por:</span> {form.criado_por || '—'}<br />
                      <span style={{ fontSize:11, color:'#94a3b8' }}>{fmtDate(form.criado_em)}</span>
                    </div>
                    <div style={{ color:'#475569' }}>
                      <span style={{ fontWeight:700 }}>Editado por:</span> {form.editado_por || '—'}<br />
                      <span style={{ fontSize:11, color:'#94a3b8' }}>{fmtDate(form.editado_em)}</span>
                    </div>
                    {form.status === 'Finalizado' && (
                      <div style={{ gridColumn:'1 / -1', color:'#16a34a', paddingTop:6, borderTop:'1px solid #e2e8f0' }}>
                        <span style={{ fontWeight:700 }}>✅ Finalizado por:</span> {form.finalizado_por || '—'} — {fmtDate(form.finalizado_em)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Título */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Título da Ata</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  disabled={isViewing}
                  placeholder="Ex: Ata de Reunião Disciplinar — Turma 3A"
                  style={{ width:'100%', padding:'12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:14, outline:'none', background: isViewing ? '#f8fafc' : '#fff', boxSizing:'border-box' }}
                  onFocus={e => !isViewing && (e.target.style.border='1.5px solid #1e3a8a')}
                  onBlur={e => (e.target.style.border='1.5px solid #e2e8f0')}
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Conteúdo do Registro</label>
                <textarea
                  rows={10}
                  value={form.conteudo}
                  onChange={e => setForm({ ...form, conteudo: e.target.value })}
                  disabled={isViewing}
                  placeholder="Descreva detalhadamente o ocorrido, as partes envolvidas e as medidas tomadas..."
                  style={{ width:'100%', padding:'12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:14, outline:'none', resize:'vertical', background: isViewing ? '#f8fafc' : '#fff', lineHeight:1.6, boxSizing:'border-box' }}
                  onFocus={e => !isViewing && (e.target.style.border='1.5px solid #1e3a8a')}
                  onBlur={e => (e.target.style.border='1.5px solid #e2e8f0')}
                />
              </div>

              {/* Preview Status */}
              {form.id && (
                <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Status atual:</span>
                  <StatusTag status={form.status} />
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div style={{ padding:'16px 24px', borderTop:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                {!isViewing && form.id && form.status !== 'Finalizado' && (
                  <button
                    onClick={handleFinalize}
                    disabled={saving}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:'none', cursor:'pointer', background:'#dcfce7', color:'#16a34a', fontWeight:700, fontSize:13 }}
                  >
                    <CheckCircleIcon style={{ width:16, height:16 }} />
                    Finalizar Ata
                  </button>
                )}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button
                  onClick={closeModal}
                  style={{ padding:'10px 20px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, cursor:'pointer', fontSize:14 }}
                >
                  {isViewing ? 'Fechar' : 'Cancelar'}
                </button>

                {!isViewing && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#1e3a8a,#1e40af)', color:'#fff', fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', fontSize:14, opacity: saving ? 0.7 : 1 }}
                  >
                    {saving
                      ? <><div className="ata-spinner" style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%' }} /> Salvando...</>
                      : 'Salvar Registro'
                    }
                  </button>
                )}

                {isViewing && (
                  <button
                    onClick={() => handlePrint(form)}
                    disabled={printingId === form.id}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4338ca,#6366f1)', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14 }}
                  >
                    {printingId === form.id
                      ? <><div className="ata-spinner" style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%' }} /> Gerando PDF...</>
                      : <><PrinterIcon style={{ width:16, height:16 }} /> Imprimir Documento</>
                    }
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
