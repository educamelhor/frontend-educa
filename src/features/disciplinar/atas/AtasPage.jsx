// src/features/disciplinar/atas/AtasPage.jsx
import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  PrinterIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  UserIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Estilos premium
const ANIM_CSS = `
@keyframes slideUp { from { opacity:0; transform:translateY(24px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
@keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
.ata-slide-up { animation: slideUp 0.32s cubic-bezier(0.16,1,0.3,1) both; }
.ata-fade-in  { animation: fadeIn 0.22s ease-out both; }

@media print {
  @page { size: A4; margin: 15mm; }
  body { background: #fff !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .print-header { border-bottom: 2px solid #1e3a8a; margin-bottom: 20px; padding-bottom: 10px; }
  .print-content { font-size: 12pt; line-height: 1.5; }
}
`;

function injectAnims() {
  if (document.getElementById('ata-page-anims')) return;
  const el = document.createElement('style');
  el.id = 'ata-page-anims';
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
}

// Mock inicial
const MOCK_ATAS = [
  {
    id: 1,
    titulo: 'Ata de Reunião de Pais e Mestres - Turma 3A',
    conteudo: 'Reunião realizada no dia 10/05/2026 para tratar do comportamento dos alunos no intervalo...',
    status: 'Rascunho',
    criadoPor: 'Sgt. Silva',
    criadoEm: '2026-05-10T14:30:00',
    editadoPor: 'Ten. Oliveira',
    editadoEm: '2026-05-11T09:15:00',
    finalizadoPor: null,
    finalizadoEm: null,
  },
  {
    id: 2,
    titulo: 'Ata de Ocorrência Disciplinar Coletiva',
    conteudo: 'Foi constatado que um grupo de alunos da turma 2B evadiu-se do colégio durante o horário de aula...',
    status: 'Finalizado',
    criadoPor: 'Cb. Mendes',
    criadoEm: '2026-05-12T10:00:00',
    editadoPor: null,
    editadoEm: null,
    finalizadoPor: 'Cap. Santos',
    finalizadoEm: '2026-05-12T16:45:00',
  }
];

export default function AtasPage() {
  injectAnims();

  const [atas, setAtas] = useState(MOCK_ATAS);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [isViewing, setIsViewing] = useState(false);
  const [busca, setBusca] = useState('');

  // Usuario logado mock (na real viria do auth/localStorage)
  const usuarioAtual = localStorage.getItem('nome') || 'Usuário Logado';

  const atasFiltradas = atas.filter(a => a.titulo.toLowerCase().includes(busca.toLowerCase()));

  const openNew = () => {
    setForm({ titulo: '', conteudo: '', status: 'Rascunho' });
    setIsViewing(false);
    setModalOpen(true);
  };

  const openEdit = (ata) => {
    if (ata.status === 'Finalizado') return;
    setForm({ ...ata });
    setIsViewing(false);
    setModalOpen(true);
  };

  const openView = (ata) => {
    setForm({ ...ata });
    setIsViewing(true);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.titulo || !form.conteudo) return alert('Preencha título e conteúdo!');
    
    const agora = new Date().toISOString();

    if (form.id) {
      // Edição
      setAtas(atas.map(a => a.id === form.id ? {
        ...a,
        ...form,
        editadoPor: usuarioAtual,
        editadoEm: agora
      } : a));
    } else {
      // Criação
      setAtas([{
        ...form,
        id: Date.now(),
        criadoPor: usuarioAtual,
        criadoEm: agora,
        editadoPor: null,
        editadoEm: null,
        finalizadoPor: null,
        finalizadoEm: null
      }, ...atas]);
    }
    setModalOpen(false);
  };

  const handleFinalize = () => {
    if (!form.id) return; // Só finaliza se já existir
    if (!window.confirm('Tem certeza que deseja finalizar esta ata? Ela não poderá mais ser editada.')) return;
    
    const agora = new Date().toISOString();
    setAtas(atas.map(a => a.id === form.id ? {
      ...a,
      status: 'Finalizado',
      finalizadoPor: usuarioAtual,
      finalizadoEm: agora
    } : a));
    setModalOpen(false);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR');
  };

  const handlePrint = (ata) => {
    // Para simplificar a impressão na mesma janela
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão de Ata</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #000; }
            .header-tace {
              display: flex;
              align-items: center;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .header-tace img { width: 80px; height: 80px; margin-right: 20px; object-fit: contain; }
            .header-tace .text { flex: 1; text-align: center; }
            .header-tace h1 { margin: 0; font-size: 18px; text-transform: uppercase; color: #1e3a8a; }
            .header-tace h2 { margin: 5px 0 0; font-size: 14px; font-weight: normal; }
            .ata-title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
            .ata-content { font-size: 14px; line-height: 1.8; text-align: justify; white-space: pre-wrap; margin-bottom: 50px; }
            .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
            .signature-box { text-align: center; width: 40%; }
            .signature-line { border-top: 1px solid #000; margin-bottom: 5px; }
            .meta { font-size: 10px; color: #666; margin-top: 50px; border-top: 1px dashed #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header-tace">
            <!-- Brasão mock -->
            <div style="width:80px;height:80px;background:#e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-right:20px;">
              <span style="font-size:30px;">🛡️</span>
            </div>
            <div class="text">
              <h1>ESCOLA CÍVICO-MILITAR TACE</h1>
              <h2>SISTEMA EDUCACIONAL DE GESTÃO DISCIPLINAR</h2>
            </div>
          </div>
          
          <div class="ata-title">${ata.titulo}</div>
          
          <div class="ata-content">${ata.conteudo}</div>
          
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>${ata.criadoPor || 'Relator'}</div>
              <div style="font-size:12px;color:#555;">(Criação)</div>
            </div>
            ${ata.finalizadoPor ? `
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>${ata.finalizadoPor}</div>
              <div style="font-size:12px;color:#555;">(Homologação)</div>
            </div>
            ` : ''}
          </div>

          <div class="meta">
            <b>Rastreabilidade Documental:</b><br/>
            Documento ID: #${ata.id}<br/>
            Criado por: ${ata.criadoPor} em ${formatDate(ata.criadoEm)}<br/>
            ${ata.editadoPor ? `Última edição por: ${ata.editadoPor} em ${formatDate(ata.editadoEm)}<br/>` : ''}
            ${ata.finalizadoPor ? `Finalizado por: ${ata.finalizadoPor} em ${formatDate(ata.finalizadoEm)}<br/>` : 'Status: RASCUNHO'}
          </div>
          
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 no-print">
      {/* ══ HERO HEADER ══════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-12 mb-8 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #172554 100%)' }}
      >
        <div style={{ position:'absolute', top:'-30%', right:'-10%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
                 style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)' }}>
              <DocumentTextIcon style={{ width:14, height:14, color:'#bfdbfe' }} />
              <span style={{ fontSize:10, fontWeight:800, color:'#bfdbfe', letterSpacing:'0.1em', textTransform:'uppercase' }}>Gestão Disciplinar</span>
            </div>
            <h1 style={{ fontSize:34, fontWeight:800, color:'#fff', margin:'0 0 8px', letterSpacing:'-0.03em', lineHeight:1.15 }}>
              Atas e Registros Oficiais
            </h1>
            <p style={{ color:'rgba(219,234,254,0.8)', fontSize:16, margin:0, maxWidth:520, lineHeight:1.6 }}>
              Sistema seguro para criação, rastreabilidade e impressão oficial de atas disciplinares e pedagógicas.
            </p>
          </div>
          <button
            onClick={openNew}
            style={{
              display:'flex', alignItems:'center', gap:10, padding:'14px 28px', borderRadius:14, border:'none', cursor:'pointer',
              background:'#fff', color:'#1e3a8a', fontSize:14, fontWeight:700, boxShadow:'0 6px 20px rgba(0,0,0,0.15)', transition:'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; }}
          >
            <PlusIcon style={{ width:18, height:18 }} />
            Nova Ata
          </button>
        </div>
      </div>

      {/* Busca e Tabela */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden ata-fade-in">
        <div className="p-6 md:p-8">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar atas por título..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ width:'100%', padding:'12px 20px', borderRadius:12, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:14, outline:'none', transition:'all 0.2s' }}
              onFocus={e => { e.target.style.border='1.5px solid #1e3a8a'; e.target.style.background='#fff'; }}
              onBlur={e => { e.target.style.border='1.5px solid #e2e8f0'; e.target.style.background='#f8fafc'; }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Documento</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Autoria (Última Ação)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {atasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Nenhuma ata encontrada.</td>
                  </tr>
                ) : atasFiltradas.map((ata) => (
                  <tr key={ata.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{ata.titulo}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>ID: #{ata.id}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: ata.status === 'Finalizado' ? '#dcfce7' : '#fef9c3',
                        color: ata.status === 'Finalizado' ? '#16a34a' : '#ca8a04',
                        border: `1px solid ${ata.status === 'Finalizado' ? '#bbf7d0' : '#fef08a'}`
                      }}>
                        {ata.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
                        <UserIcon style={{ width: 14, height: 14 }} />
                        {ata.editadoPor || ata.criadoPor}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        <ClockIcon style={{ width: 14, height: 14 }} />
                        {formatDate(ata.editadoEm || ata.criadoEm)}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button onClick={() => openView(ata)} title="Visualizar" style={{ padding: 8, borderRadius: 8, background: '#f1f5f9', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>
                          <EyeIcon style={{ width: 16, height: 16 }} />
                        </button>
                        {ata.status !== 'Finalizado' && (
                          <button onClick={() => openEdit(ata)} title="Editar" style={{ padding: 8, borderRadius: 8, background: '#fef3c7', color: '#d97706', border: 'none', cursor: 'pointer' }}>
                            <PencilSquareIcon style={{ width: 16, height: 16 }} />
                          </button>
                        )}
                        <button onClick={() => handlePrint(ata)} title="Imprimir" style={{ padding: 8, borderRadius: 8, background: '#e0e7ff', color: '#4338ca', border: 'none', cursor: 'pointer' }}>
                          <PrinterIcon style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CRUD/VIEW */}
      {modalOpen && form && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 ata-fade-in" style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="ata-slide-up bg-white w-full flex flex-col" style={{ maxWidth: 700, maxHeight: '90vh', borderRadius: 20, overflow: 'hidden' }}>
            
            <div className="px-6 py-5 flex items-center justify-between" style={{ background: '#1e3a8a', color: '#fff' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                {isViewing ? 'Visualizar Ata' : (form.id ? 'Editar Ata' : 'Nova Ata')}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <XMarkIcon style={{ width: 24, height: 24 }} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              
              {/* Rastreabilidade Header (se existir) */}
              {form.id && (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8, fontSize: 13 }}>Rastreabilidade do Documento</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><b>Criado por:</b> {form.criadoPor} <br/> ({formatDate(form.criadoEm)})</div>
                    <div><b>Editado por:</b> {form.editadoPor || '—'} <br/> ({formatDate(form.editadoEm)})</div>
                    {form.status === 'Finalizado' && (
                      <div style={{ gridColumn: '1 / -1', marginTop: 8, color: '#16a34a' }}>
                        <b>Finalizado por:</b> {form.finalizadoPor} ({formatDate(form.finalizadoEm)})
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Título da Ata</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  disabled={isViewing}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: isViewing ? '#f8fafc' : '#fff' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Conteúdo do Registro</label>
                <textarea
                  rows={8}
                  value={form.conteudo}
                  onChange={e => setForm({ ...form, conteudo: e.target.value })}
                  disabled={isViewing}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', background: isViewing ? '#f8fafc' : '#fff' }}
                />
              </div>

            </div>

            <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div>
                {!isViewing && form.id && form.status !== 'Finalizado' && (
                  <button
                    onClick={handleFinalize}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 13
                    }}
                  >
                    <CheckCircleIcon style={{ width: 16, height: 16 }} /> Finalizar Ata
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isViewing ? 'Fechar' : 'Cancelar'}
                </button>
                {!isViewing && (
                  <button
                    onClick={handleSave}
                    style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Salvar Registro
                  </button>
                )}
                {isViewing && (
                  <button
                    onClick={() => handlePrint(form)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#4338ca', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <PrinterIcon style={{ width: 16, height: 16 }} /> Imprimir Documento
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
