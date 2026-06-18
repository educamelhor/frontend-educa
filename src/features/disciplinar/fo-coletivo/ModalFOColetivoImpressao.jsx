// src/features/disciplinar/fo-coletivo/ModalFOColetivoImpressao.jsx
// ============================================================================
// Modal Premium — F.O. COLETIVO IMPRESSÃO
// Lista registros coletivos de uma data e permite imprimir individualmente
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';
import {
  XMarkIcon,
  PrinterIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

// ── Animações ────────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes fciSlideUp { from { opacity:0; transform:translateY(28px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
@keyframes fciFadeIn  { from { opacity:0 } to { opacity:1 } }
@keyframes fciRowIn   { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
@keyframes fciSpin    { to { transform:rotate(360deg) } }
@keyframes fciPrint   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
.fci-slide-up { animation: fciSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
.fci-fade-in  { animation: fciFadeIn 0.2s ease-out both; }
.fci-row-in   { animation: fciRowIn 0.22s ease-out both; }
`;

function injectAnims() {
  if (document.getElementById('fci-anims')) return;
  const el = document.createElement('style');
  el.id = 'fci-anims';
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  d.setHours(d.getHours() - 3); // UTC-3
  return d.toISOString().split('T')[0];
}
function isoToBr(iso) {
  if (!iso) return '';
  const [y, m, dia] = iso.split('-');
  return `${dia}/${m}/${y}`;
}
function corMedida(medida) {
  const m = (medida || '').toLowerCase();
  if (m.includes('advertência oral'))    return { bg:'#fef9c3', color:'#854d0e', border:'#fde68a' };
  if (m.includes('advertência escrita')) return { bg:'#fff7ed', color:'#9a3412', border:'#fed7aa' };
  if (m.includes('suspensão'))           return { bg:'#fef2f2', color:'#991b1b', border:'#fecaca' };
  if (m.includes('ações educativas'))    return { bg:'#f5f3ff', color:'#5b21b6', border:'#ddd6fe' };
  if (m.includes('elogio'))             return { bg:'#ecfdf5', color:'#065f46', border:'#a7f3d0' };
  if (m.includes('transferência'))       return { bg:'#f1f5f9', color:'#334155', border:'#cbd5e1' };
  return { bg:'#f8fafc', color:'#475569', border:'#e2e8f0' };
}
function statusBadge(status) {
  if (status === 'FINALIZADA') return { bg:'#dcfce7', color:'#166534', label:'Finalizada' };
  if (status === 'CANCELADA')  return { bg:'#fee2e2', color:'#991b1b', label:'Cancelada' };
  return { bg:'#dbeafe', color:'#1d4ed8', label:'Registrada' };
}
function getApiBase() {
  // Mesma lógica do api.js — suporta ambos os nomes de variável
  const envUrl =
    import.meta.env?.VITE_API_BASE_URL ||
    import.meta.env?.VITE_API_URL;

  const normalize = (url) => {
    let u = String(url || "").trim().replace(/\/+$/, "");
    if (!u) return "";
    // Remove /api do final para que a URL seja só a raiz (adicionamos /api nas chamadas)
    if (u.endsWith("/api")) u = u.slice(0, -4);
    return u;
  };

  const base = normalize(envUrl);
  if (base) return base;

  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal) return "http://localhost:3000";

  // Produção: fallback explícito para o backend (igual ao api.js)
  return "https://educa-backend-docker-659zo.ondigitalocean.app";
}
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}
function getEscolaId() {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user') || '{}';
    return JSON.parse(raw)?.escola_id || '';
  } catch { return ''; }
}

// ============================================================================
export default function ModalFOColetivoImpressao({ onClose }) {
  injectAnims();

  const [date, setDate]           = useState(todayISO());
  const [lotes, setLotes]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [selectedIds, setSelected]= useState(new Set()); // Set<ocorrencia_id>
  const [printing, setPrinting]   = useState(false);
  const [printQueue, setPrintQueue] = useState([]); // [{aluno_id, ocorrencia_id, estudante}]
  const [printProgress, setPrintProgress] = useState(0); // quantos foram impressos
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // Carregar ao montar e ao mudar data
  useEffect(() => { fetchLotes(); }, [date]);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/alunos/ocorrencias/coletivos?data=${date}`);
      const data = res.data;
      setLotes(data.lotes || []);
      // Pré-selecionar todos
      const allIds = new Set();
      (data.lotes || []).forEach(l => l.alunos.forEach(a => allIds.add(a.ocorrencia_id)));
      setSelected(allIds);
    } catch (e) {
      setError('Erro ao buscar registros coletivos.');
      setLotes([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  // ── Seleção ────────────────────────────────────────────────────────────────
  const totalAlunos = lotes.reduce((s, l) => s + l.alunos.length, 0);
  const totalSelecionados = selectedIds.size;

  function toggleAluno(ocId) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(ocId) ? n.delete(ocId) : n.add(ocId);
      return n;
    });
  }

  function toggleLote(lote) {
    const allSel = lote.alunos.every(a => selectedIds.has(a.ocorrencia_id));
    setSelected(prev => {
      const n = new Set(prev);
      lote.alunos.forEach(a => allSel ? n.delete(a.ocorrencia_id) : n.add(a.ocorrencia_id));
      return n;
    });
  }

  function selectAll() {
    const all = new Set();
    lotes.forEach(l => l.alunos.forEach(a => all.add(a.ocorrencia_id)));
    setSelected(all);
  }
  function deselectAll() { setSelected(new Set()); }

  // ── Impressão ──────────────────────────────────────────────────────────────
  function handleImprimir() {
    // Coletar selecionados na ordem: lote → aluno
    const queue = [];
    lotes.forEach(lote => {
      lote.alunos.forEach(a => {
        if (selectedIds.has(a.ocorrencia_id)) {
          queue.push({ aluno_id: a.aluno_id, ocorrencia_id: a.ocorrencia_id, estudante: a.estudante });
        }
      });
    });
    if (queue.length === 0) return;
    setPrintQueue(queue);
    setPrintProgress(0);
    setPrinting(true);
  }

  // Efeito de impressão sequencial com delay
  useEffect(() => {
    if (!printing || printQueue.length === 0) return;
    if (printProgress >= printQueue.length) {
      setPrinting(false);
      return;
    }
    const item = printQueue[printProgress];
    const token   = getToken();
    const escolaId = getEscolaId();
    const url = `${getApiBase()}/api/relatorio-disciplinar/${item.aluno_id}/registro/${item.ocorrencia_id}?token=${encodeURIComponent(token)}&escola_id=${escolaId}`;
    window.open(url, '_blank', 'noopener');
    const timer = setTimeout(() => setPrintProgress(p => p + 1), 900);
    return () => clearTimeout(timer);
  }, [printing, printProgress, printQueue]);

  // ── Navegação de data (dia anterior / próximo) ────────────────────────────
  function changeDay(delta) {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const isPrinting = printing && printProgress < printQueue.length;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 fci-fade-in"
      style={{ background:'rgba(15,23,42,0.75)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget && !isPrinting) onClose(); }}
    >
      <div
        className="fci-slide-up bg-white w-full flex flex-col"
        style={{
          maxWidth: 720,
          maxHeight: '92vh',
          borderRadius: 24,
          boxShadow: '0 32px 64px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div
          className="relative overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}
        >
          {/* Glow orbs */}
          <div style={{ position:'absolute', top:'-40%', right:'-10%', width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,0.15) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'-30%', left:'-8%', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)', pointerEvents:'none' }} />

          <div className="relative z-10 px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div style={{ padding:11, borderRadius:16, background:'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(59,130,246,0.15))', border:'1px solid rgba(255,255,255,0.12)' }}>
                <PrinterIcon style={{ width:24, height:24, color:'#f87171' }} />
              </div>
              <div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:20, padding:'3px 10px', marginBottom:4 }}>
                  <ClipboardDocumentListIcon style={{ width:11, height:11, color:'#f87171' }} />
                  <span style={{ fontSize:10, fontWeight:800, color:'#f87171', letterSpacing:'0.1em', textTransform:'uppercase' }}>Módulo Disciplinar</span>
                </div>
                <h2 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:0, letterSpacing:'-0.02em' }}>
                  F.O. Coletivo — Impressão
                </h2>
                <p style={{ color:'rgba(148,163,184,0.8)', fontSize:12, margin:'2px 0 0' }}>
                  Selecione os alunos e imprima individualmente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isPrinting}
              style={{ padding:9, borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor: isPrinting ? 'not-allowed' : 'pointer', color:'rgba(255,255,255,0.5)', transition:'all 0.2s', opacity: isPrinting ? 0.5 : 1 }}
              onMouseEnter={e => { if (!isPrinting) { e.currentTarget.style.background='rgba(255,255,255,0.14)'; e.currentTarget.style.color='#fff'; }}}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.5)'; }}
            >
              <XMarkIcon style={{ width:20, height:20 }} />
            </button>
          </div>

          {/* ── Barra de data ────────────────────────────────────────────── */}
          <div className="relative z-10 px-6 pb-5 flex items-center gap-3 flex-wrap">
            {/* Botão dia anterior */}
            <button
              onClick={() => changeDay(-1)}
              style={{ padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', cursor:'pointer', color:'rgba(255,255,255,0.7)', transition:'all 0.15s', display:'flex', alignItems:'center' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.color='#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(255,255,255,0.7)'; }}
              title="Dia anterior"
            >
              <ChevronLeftIcon style={{ width:16, height:16 }} />
            </button>

            {/* Seletor de data */}
            <div style={{ position:'relative', display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, padding:'8px 14px', cursor:'pointer' }}
              onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.focus()}
            >
              <CalendarDaysIcon style={{ width:16, height:16, color:'#93c5fd', flexShrink:0 }} />
              <span style={{ color:'#fff', fontSize:14, fontWeight:700 }}>{isoToBr(date)}</span>
              <input
                ref={dateRef}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}
              />
            </div>

            {/* Botão dia seguinte */}
            <button
              onClick={() => changeDay(1)}
              style={{ padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', cursor:'pointer', color:'rgba(255,255,255,0.7)', transition:'all 0.15s', display:'flex', alignItems:'center' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.color='#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(255,255,255,0.7)'; }}
              title="Próximo dia"
            >
              <ChevronRightIcon style={{ width:16, height:16 }} />
            </button>

            <button
              onClick={fetchLotes}
              disabled={loading}
              style={{ padding:'8px 14px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', cursor: loading ? 'not-allowed' : 'pointer', color:'rgba(255,255,255,0.7)', transition:'all 0.15s', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600 }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.color='#fff'; }}}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(255,255,255,0.7)'; }}
            >
              <ArrowPathIcon style={{ width:15, height:15, animation: loading ? 'fciSpin 0.7s linear infinite' : 'none' }} />
              Atualizar
            </button>

            {/* Counter badges */}
            {!loading && totalAlunos > 0 && (
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                <span style={{ padding:'6px 14px', borderRadius:20, background:'rgba(59,130,246,0.2)', border:'1px solid rgba(59,130,246,0.3)', color:'#93c5fd', fontSize:12, fontWeight:700 }}>
                  {totalAlunos} aluno{totalAlunos !== 1 ? 's' : ''}
                </span>
                {totalSelecionados > 0 && (
                  <span style={{ padding:'6px 14px', borderRadius:20, background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', fontSize:12, fontWeight:700 }}>
                    {totalSelecionados} selecionado{totalSelecionados !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ CORPO (scrollável) ═══════════════════════════════════════════════ */}
        <div style={{ flex:1, overflowY:'auto', padding:'0' }}>

          {/* Loading */}
          {loading && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:60 }}>
              <div style={{ width:24, height:24, border:'3px solid #e2e8f0', borderTop:'3px solid #3b82f6', borderRadius:'50%', animation:'fciSpin 0.7s linear infinite' }} />
              <span style={{ color:'#64748b', fontSize:14 }}>Carregando registros…</span>
            </div>
          )}

          {/* Erro */}
          {!loading && error && (
            <div style={{ margin:24, padding:16, borderRadius:14, background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', gap:10 }}>
              <ExclamationTriangleIcon style={{ width:20, height:20, color:'#dc2626', flexShrink:0 }} />
              <span style={{ color:'#991b1b', fontSize:13, fontWeight:600 }}>{error}</span>
            </div>
          )}

          {/* Vazio */}
          {!loading && !error && lotes.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:'48px 24px' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ClipboardDocumentListIcon style={{ width:30, height:30, color:'#94a3b8' }} />
              </div>
              <p style={{ color:'#64748b', fontSize:15, fontWeight:600, textAlign:'center', margin:0 }}>
                Nenhum F.O. Coletivo encontrado em {isoToBr(date)}
              </p>
              <p style={{ color:'#94a3b8', fontSize:13, textAlign:'center', margin:0 }}>
                Use os botões de navegação para escolher outra data
              </p>
            </div>
          )}

          {/* Lista de lotes */}
          {!loading && lotes.length > 0 && (
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Ações rápidas */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button
                  onClick={selectAll}
                  style={{ padding:'5px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='#e2e8f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='#f8fafc'; }}
                >
                  Selecionar todos
                </button>
                <button
                  onClick={deselectAll}
                  style={{ padding:'5px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='#e2e8f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='#f8fafc'; }}
                >
                  Desmarcar todos
                </button>
                <span style={{ marginLeft:'auto', fontSize:12, color:'#94a3b8' }}>
                  {lotes.length} lote{lotes.length !== 1 ? 's' : ''} — {isoToBr(date)}
                </span>
              </div>

              {/* Lotes */}
              {lotes.map((lote, loteIdx) => {
                const cor = corMedida(lote.medida_disciplinar);
                const allLoteSel = lote.alunos.every(a => selectedIds.has(a.ocorrencia_id));
                const someLoteSel = lote.alunos.some(a => selectedIds.has(a.ocorrencia_id));

                return (
                  <div
                    key={lote.lote_id}
                    className="fci-fade-in"
                    style={{
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 18,
                      overflow: 'hidden',
                      animationDelay: `${loteIdx * 0.06}s`,
                    }}
                  >
                    {/* Cabeçalho do lote */}
                    <div
                      style={{
                        padding: '14px 18px',
                        background: cor.bg,
                        borderBottom: `1.5px solid ${cor.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleLote(lote)}
                    >
                      {/* Checkbox lote */}
                      <div style={{
                        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                        border: `2px solid ${allLoteSel ? cor.color : '#cbd5e1'}`,
                        background: allLoteSel ? cor.color : someLoteSel ? `${cor.color}30` : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {allLoteSel && <CheckIcon style={{ width:13, height:13, color:'#fff' }} />}
                        {!allLoteSel && someLoteSel && <div style={{ width:8, height:2, background: cor.color, borderRadius:2 }} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ padding:'3px 10px', borderRadius:20, background: cor.color, color:'#fff', fontSize:11, fontWeight:800 }}>
                            {lote.medida_disciplinar}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: cor.color }}>
                            {lote.motivo}
                          </span>
                        </div>
                        {lote.descricao && (
                          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lote.descricao}
                          </p>
                        )}
                      </div>

                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color: cor.color, fontWeight:700 }}>
                          <UsersIcon style={{ width:14, height:14 }} />
                          {lote.alunos.length} aluno{lote.alunos.length !== 1 ? 's' : ''}
                        </span>
                        {lote.registrado_por && (
                          <span style={{ fontSize:11, color:'#94a3b8', background:'rgba(0,0,0,0.05)', padding:'2px 8px', borderRadius:20 }}>
                            {lote.registrado_por}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Alunos do lote */}
                    <div>
                      {lote.alunos.map((aluno, idx) => {
                        const sel = selectedIds.has(aluno.ocorrencia_id);
                        const sb = statusBadge(aluno.status);
                        const isPrintingThis = isPrinting && printQueue[printProgress]?.ocorrencia_id === aluno.ocorrencia_id;

                        return (
                          <div
                            key={aluno.ocorrencia_id}
                            className="fci-row-in"
                            onClick={() => toggleAluno(aluno.ocorrencia_id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '11px 18px',
                              gap: 12,
                              background: sel ? '#f0f9ff' : idx % 2 === 0 ? '#fff' : '#fafbfc',
                              borderBottom: idx < lote.alunos.length - 1 ? '1px solid #f1f5f9' : 'none',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              animationDelay: `${idx * 0.04}s`,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = sel ? '#e0f2fe' : '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = sel ? '#f0f9ff' : idx % 2 === 0 ? '#fff' : '#fafbfc'; }}
                          >
                            {/* Checkbox aluno */}
                            <div
                              style={{
                                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                border: `2px solid ${sel ? '#3b82f6' : '#cbd5e1'}`,
                                background: sel ? '#3b82f6' : '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}
                            >
                              {sel && <CheckIcon style={{ width:11, height:11, color:'#fff' }} />}
                            </div>

                            {/* Avatar */}
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, background: sel ? '#dbeafe' : '#f1f5f9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 14, color: sel ? '#1d4ed8' : '#64748b',
                              flexShrink: 0, transition: 'all 0.15s',
                            }}>
                              {(aluno.estudante?.[0] || '?').toUpperCase()}
                            </div>

                            {/* Nome + Turma */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {aluno.estudante}
                              </p>
                              <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8' }}>
                                {aluno.codigo ? `Cód: ${aluno.codigo}` : ''}
                                {aluno.codigo && aluno.turma ? ' · ' : ''}
                                {aluno.turma || ''}
                                {aluno.turno ? ` (${aluno.turno})` : ''}
                              </p>
                            </div>

                            {/* Status badge */}
                            <span style={{ padding:'3px 10px', borderRadius:20, background: sb.bg, color: sb.color, fontSize:11, fontWeight:700, flexShrink:0 }}>
                              {sb.label}
                            </span>

                            {/* Botão imprimir individual */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const token = getToken();
                                const escolaId = getEscolaId();
                                const url = `${getApiBase()}/api/relatorio-disciplinar/${aluno.aluno_id}/registro/${aluno.ocorrencia_id}?token=${encodeURIComponent(token)}&escola_id=${escolaId}`;
                                window.open(url, '_blank', 'noopener');
                              }}
                              title={`Imprimir F.O. de ${aluno.estudante}`}
                              style={{
                                padding:'7px 10px', borderRadius:9,
                                border: isPrintingThis ? 'none' : '1.5px solid #e2e8f0',
                                background: isPrintingThis ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '#f8fafc',
                                color: isPrintingThis ? '#fff' : '#64748b',
                                cursor: 'pointer', flexShrink: 0, display:'flex', alignItems:'center',
                                transition: 'all 0.2s',
                                animation: isPrintingThis ? 'fciPrint 0.6s ease-in-out infinite' : 'none',
                              }}
                              onMouseEnter={e => { if (!isPrintingThis) { e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='#fff'; e.currentTarget.style.border='1.5px solid #ef4444'; }}}
                              onMouseLeave={e => { if (!isPrintingThis) { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.color='#64748b'; e.currentTarget.style.border='1.5px solid #e2e8f0'; }}}
                            >
                              <PrinterIcon style={{ width:15, height:15 }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ RODAPÉ ══════════════════════════════════════════════════════════ */}
        <div
          style={{
            flexShrink: 0,
            padding: '16px 24px',
            borderTop: '1.5px solid #f1f5f9',
            background: '#fafbfc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Info progresso de impressão */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isPrinting ? (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:18, height:18, border:'2.5px solid #fecaca', borderTop:'2.5px solid #ef4444', borderRadius:'50%', animation:'fciSpin 0.7s linear infinite', flexShrink:0 }} />
                <span style={{ fontSize:13, color:'#ef4444', fontWeight:700 }}>
                  Imprimindo {printProgress + 1} de {printQueue.length}: {printQueue[printProgress]?.estudante}…
                </span>
              </div>
            ) : (
              <span style={{ fontSize:13, color:'#64748b' }}>
                {totalSelecionados > 0
                  ? `${totalSelecionados} aluno${totalSelecionados !== 1 ? 's' : ''} selecionado${totalSelecionados !== 1 ? 's' : ''} para impressão`
                  : 'Nenhum aluno selecionado'}
              </span>
            )}
          </div>

          {/* Botões */}
          <div style={{ display:'flex', gap:10, flexShrink:0 }}>
            <button
              onClick={onClose}
              disabled={isPrinting}
              style={{
                padding:'11px 22px', borderRadius:12, border:'1.5px solid #e2e8f0',
                background:'#fff', color:'#374151', fontSize:13, fontWeight:700,
                cursor: isPrinting ? 'not-allowed' : 'pointer', transition:'all 0.2s',
                opacity: isPrinting ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!isPrinting) e.currentTarget.style.background='#f1f5f9'; }}
              onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}
            >
              Cancelar
            </button>

            <button
              onClick={handleImprimir}
              disabled={totalSelecionados === 0 || isPrinting}
              style={{
                display:'flex', alignItems:'center', gap:9,
                padding:'11px 24px', borderRadius:12, border:'none',
                background: totalSelecionados === 0 || isPrinting
                  ? '#e2e8f0'
                  : 'linear-gradient(135deg,#ef4444,#dc2626)',
                color: totalSelecionados === 0 || isPrinting ? '#94a3b8' : '#fff',
                fontSize:13, fontWeight:800, cursor: totalSelecionados === 0 || isPrinting ? 'not-allowed' : 'pointer',
                boxShadow: totalSelecionados > 0 && !isPrinting ? '0 6px 20px rgba(239,68,68,0.35)' : 'none',
                transition:'all 0.2s',
              }}
              onMouseEnter={e => { if (totalSelecionados > 0 && !isPrinting) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(239,68,68,0.45)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow = totalSelecionados > 0 && !isPrinting ? '0 6px 20px rgba(239,68,68,0.35)' : 'none'; }}
            >
              <PrinterIcon style={{ width:17, height:17 }} />
              {isPrinting ? `Imprimindo… (${printProgress}/${printQueue.length})` : `Imprimir${totalSelecionados > 0 ? ` (${totalSelecionados})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
