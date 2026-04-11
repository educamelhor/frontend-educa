// src/features/disciplinar/fo-coletivo/FOColetivo.jsx
// ============================================================================
// F.O. COLETIVO — Formulário de Ocorrência em Lote
// Premium page para registrar medidas disciplinares para múltiplos alunos
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';
import {
  BoltIcon,
  PlusIcon,
  UsersIcon,
  CheckCircleIcon,
  XMarkIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

// ── Animações premium ───────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes foSlideUp { from { opacity:0; transform:translateY(24px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
@keyframes foFadeIn  { from { opacity:0 } to { opacity:1 } }
@keyframes foPulse   { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.25) } 50% { box-shadow:0 0 20px 4px rgba(239,68,68,0.12) } }
@keyframes foSpin    { to { transform:rotate(360deg) } }
@keyframes foRowIn   { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
.fo-slide-up { animation: foSlideUp 0.32s cubic-bezier(0.16,1,0.3,1) both; }
.fo-fade-in  { animation: foFadeIn 0.22s ease-out both; }
.fo-row-in   { animation: foRowIn 0.25s ease-out both; }
`;

function injectAnims() {
  if (document.getElementById('fo-coletivo-anims')) return;
  const el = document.createElement('style');
  el.id = 'fo-coletivo-anims';
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
}

// ── Medidas do dropdown (espelha ModalNovaOcorrencia) ───────────────────────
const MEDIDAS_DROPDOWN = [
  { label: 'Advertência Oral',    medida: 'Advertência Oral' },
  { label: 'Advertência Escrita', medida: 'Advertência Escrita' },
  { label: 'Suspensão',           medida: 'Suspensão' },
  { label: 'Ações Educativas',    medida: 'Ações Educativas' },
  { label: 'Elogio Individual',   medida: 'Elogio', tipoFixo: 'Individual' },
  { label: 'Elogio Coletivo',     medida: 'Elogio', tipoFixo: 'Coletivo' },
  { label: 'Transferência',       medida: 'Transferência' },
];

const TURNOS = [
  { label: 'Matutino',   value: 'matutino' },
  { label: 'Vespertino', value: 'vespertino' },
  { label: 'Noturno',    value: 'noturno' },
  { label: 'Integral',   value: 'integral' },
];

// Medidas que OBRIGAM convocação
const MEDIDAS_OBRIGATORIAS = ['Suspensão', 'Ações Educativas', 'Transferência'];

// ── Cor do badge de medida ───────────────────────────────────────────────────
function corMedida(medida) {
  const m = (medida || '').toLowerCase();
  if (m.includes('advertência oral'))   return { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' };
  if (m.includes('advertência escrita'))return { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' };
  if (m.includes('suspensão'))          return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
  if (m.includes('ações educativas'))   return { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' };
  if (m.includes('elogio'))             return { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' };
  if (m.includes('transferência'))      return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };
  return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
}

// ============================================================================
export default function FOColetivo() {
  injectAnims();

  // ── Filtros de seleção ───────────────────────────────────────────────────
  const [turno, setTurno]     = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [turnas, setTurmas]   = useState([]);
  const [turmasFiltradas, setTurmasFiltradas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  // ── Modal Nova Medida ────────────────────────────────────────────────────
  const [modalMedidaOpen, setModalMedidaOpen] = useState(false);
  const [medidaForm, setMedidaForm] = useState({
    data: new Date().toISOString().split('T')[0],
    medidaSelecionada: '',
    tipoSelecionado: '',
    motivo: '',
    descricao: '',
    registroInterno: '',
    diasSuspensao: '',
  });
  const [registrosOcorrencias, setRegistrosOcorrencias] = useState([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
  const [medidaConfirmada, setMedidaConfirmada] = useState(null); // medida salva para o lote

  // ── Lista de alunos ──────────────────────────────────────────────────────
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [alunosTurma, setAlunosTurma]     = useState([]);
  const [buscaAluno, setBuscaAluno]       = useState('');

  // ── Tabela de alunos selecionados ────────────────────────────────────────
  const [lote, setLote] = useState([]); // [{aluno, convocarResponsavel}]

  // ── Modal de confirmação ─────────────────────────────────────────────────
  const [modalConfirmOpen, setModalConfirmOpen]   = useState(false);
  const [registrandoLote, setRegistrandoLote]     = useState(false);
  const [feedbackLote, setFeedbackLote]           = useState(null); // {type, msg}

  // ── Consulta ocorrências no modal medida ────────────────────────────────
  const [consultaOpen, setConsultaOpen]   = useState(false);
  const [buscaConsulta, setBuscaConsulta] = useState('');

  // ── Efeitos iniciais ─────────────────────────────────────────────────────
  useEffect(() => {
    carregarTurmas();
    carregarRegistrosOcorrencias();
  }, []);

  useEffect(() => {
    const filtradas = turno
      ? turnas.filter(t => (t.turno || '').toLowerCase() === turno.toLowerCase())
      : turnas;
    setTurmasFiltradas(filtradas);
    setTurmaId('');
    setAlunosTurma([]);
    setBuscaAluno('');
  }, [turno, turnas]);

  useEffect(() => {
    if (turmaId) carregarAlunosTurma(turmaId);
  }, [turmaId]);

  // filtra registros de ocorrência pela medida selecionada
  useEffect(() => {
    if (!medidaForm.medidaSelecionada) { setRegistrosFiltrados([]); return; }
    const def = MEDIDAS_DROPDOWN.find(m => m.label === medidaForm.medidaSelecionada);
    if (!def) { setRegistrosFiltrados([]); return; }
    let filtered = registrosOcorrencias.filter(r => r.medida_disciplinar === def.medida);
    if (def.tipoFixo) filtered = filtered.filter(r => r.tipo_ocorrencia === def.tipoFixo);
    setRegistrosFiltrados(filtered);
    setMedidaForm(f => ({ ...f, motivo: '', tipoSelecionado: def.tipoFixo || '' }));
  }, [medidaForm.medidaSelecionada, registrosOcorrencias]);

  // ── Loaders ──────────────────────────────────────────────────────────────
  async function carregarTurmas() {
    setLoadingTurmas(true);
    try {
      const resp = await api.get('/api/turmas');
      setTurmas(resp.data || []);
    } catch (err) {
      console.error('[FOColetivo] Erro ao carregar turmas:', err);
    } finally {
      setLoadingTurmas(false);
    }
  }

  async function carregarRegistrosOcorrencias() {
    try {
      const resp = await api.get('/api/registros-ocorrencias');
      setRegistrosOcorrencias((resp.data || []).filter(r => r.ativo));
    } catch (err) {
      console.error('[FOColetivo] Erro ao carregar ocorrências:', err);
    }
  }

  async function carregarAlunosTurma(tid) {
    setLoadingAlunos(true);
    setBuscaAluno('');
    setAlunosTurma([]);
    try {
      const resp = await api.get(`/api/turmas/${tid}/alunos`);
      const alunos = (resp.data?.alunos || resp.data || []).sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      );
      setAlunosTurma(alunos);
    } catch (err) {
      console.error('[FOColetivo] Erro ao carregar alunos:', err);
    } finally {
      setLoadingAlunos(false);
    }
  }

  // ── Handlers Medida ───────────────────────────────────────────────────────
  function handleMedidaChange(label) {
    const obrigatoria = MEDIDAS_OBRIGATORIAS.includes(label);
    setMedidaForm(f => ({
      ...f,
      medidaSelecionada: label,
      motivo: '',
      diasSuspensao: '',
    }));
    // Seta tipo automaticamente
    const def = MEDIDAS_DROPDOWN.find(m => m.label === label);
    if (def?.tipoFixo) {
      setMedidaForm(f => ({ ...f, tipoSelecionado: def.tipoFixo }));
    }
  }

  function handleConfirmarMedida() {
    if (!medidaForm.medidaSelecionada || !medidaForm.motivo) return;
    const obrigatoria = MEDIDAS_OBRIGATORIAS.includes(medidaForm.medidaSelecionada);
    setMedidaConfirmada({ ...medidaForm, convocarObrigatorio: obrigatoria });
    setModalMedidaOpen(false);
    // Abre lista de alunos automaticamente se turma já selecionada
  }

  function handleSelecionarConsultaItem(registro) {
    const def = MEDIDAS_DROPDOWN.find(m => {
      if (m.medida !== registro.medida_disciplinar) return false;
      if (m.tipoFixo) return m.tipoFixo === registro.tipo_ocorrencia;
      return true;
    });
    if (def) setMedidaForm(f => ({ ...f, medidaSelecionada: def.label }));
    setMedidaForm(f => ({ ...f, motivo: registro.descricao_ocorrencia || '', tipoSelecionado: registro.tipo_ocorrencia || '' }));
    setConsultaOpen(false);
  }

  // ── Handlers Lote ─────────────────────────────────────────────────────────
  function adicionarAluno(aluno) {
    if (lote.find(l => l.aluno.id === aluno.id)) return; // já está
    const obrigatoria = medidaConfirmada?.convocarObrigatorio || false;
    setLote(prev => [...prev, { aluno, convocarResponsavel: obrigatoria }]);
  }

  function removerAluno(alunoId) {
    setLote(prev => prev.filter(l => l.aluno.id !== alunoId));
  }

  function toggleConvocar(alunoId) {
    const obrigatoria = medidaConfirmada?.convocarObrigatorio || false;
    if (obrigatoria) return; // não pode desmarcar
    setLote(prev => prev.map(l =>
      l.aluno.id === alunoId
        ? { ...l, convocarResponsavel: !l.convocarResponsavel }
        : l
    ));
  }

  // ── Registrar em lote ─────────────────────────────────────────────────────
  async function handleRegistrarLote() {
    if (!medidaConfirmada || lote.length === 0) return;
    setRegistrandoLote(true);
    setFeedbackLote(null);

    try {
      const resp = await api.post('/api/alunos/ocorrencias/lote', {
        data: medidaConfirmada.data,
        motivo: medidaConfirmada.motivo,
        tipoOcorrencia: medidaConfirmada.tipoSelecionado,
        descricao: medidaConfirmada.descricao,
        registroInterno: medidaConfirmada.registroInterno,
        diasSuspensao: medidaConfirmada.diasSuspensao ? Number(medidaConfirmada.diasSuspensao) : null,
        alunos: lote.map(l => ({
          alunoId: l.aluno.id,
          convocarResponsavel: l.convocarResponsavel,
        })),
      });

      const { total, sucesso, falhas } = resp.data;
      setFeedbackLote({
        type: 'success',
        msg: `✅ ${sucesso} de ${total} registros criados com sucesso!${falhas > 0 ? ` (${falhas} falharam)` : ''}`,
      });
      setLote([]);
      setMedidaConfirmada(null);
      setTimeout(() => setModalConfirmOpen(false), 2200);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao registrar em lote.';
      setFeedbackLote({ type: 'error', msg: `❌ ${msg}` });
    } finally {
      setRegistrandoLote(false);
    }
  }

  // ── Alunos filtrados por busca ────────────────────────────────────────────
  const alunosFiltradosBusca = alunosTurma.filter(a => {
    if (!buscaAluno) return true;
    const t = buscaAluno.toLowerCase();
    return (a.nome || '').toLowerCase().includes(t) || String(a.re || a.matricula || '').includes(t);
  });

  const turmaAtual = turnas.find(t => String(t.id) === String(turmaId));
  const cor = medidaConfirmada ? corMedida(medidaConfirmada.medidaSelecionada) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto pb-16">

      {/* ══ HERO HEADER ══════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-12 mb-8 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
      >
        {/* Glows */}
        <div style={{ position:'absolute', top:'-30%', right:'-10%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,0.12) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-20%', left:'-8%', width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
                 style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>
              <ClipboardDocumentListIcon style={{ width:12, height:12, color:'#f87171' }} />
              <span style={{ fontSize:10, fontWeight:800, color:'#f87171', letterSpacing:'0.1em', textTransform:'uppercase' }}>Módulo Disciplinar</span>
            </div>
            <h1 style={{ fontSize:34, fontWeight:800, color:'#fff', margin:'0 0 8px', letterSpacing:'-0.03em', lineHeight:1.15 }}>
              F.O. Coletivo
            </h1>
            <p style={{ color:'rgba(148,163,184,0.9)', fontSize:16, margin:0, maxWidth:520, lineHeight:1.6 }}>
              Registre medidas disciplinares para múltiplos alunos de forma ágil — mesmo fato, uma única operação em lote.
            </p>
          </div>

          {/* Stats card */}
          <div className="flex gap-4 flex-shrink-0">
            <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'16px 24px', minWidth:100, textAlign:'center', backdropFilter:'blur(12px)' }}>
              <div style={{ fontSize:32, fontWeight:800, color: lote.length > 0 ? '#f87171' : '#e2e8f0', lineHeight:1 }}>{lote.length}</div>
              <div style={{ fontSize:11, color:'rgba(148,163,184,0.7)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:4 }}>Alunos no Lote</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'16px 24px', minWidth:100, textAlign:'center', backdropFilter:'blur(12px)' }}>
              <div style={{ fontSize:32, fontWeight:800, color: medidaConfirmada ? '#4ade80' : '#e2e8f0', lineHeight:1 }}>
                {medidaConfirmada ? '✓' : '—'}
              </div>
              <div style={{ fontSize:11, color:'rgba(148,163,184,0.7)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:4 }}>Medida</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* ══ STEP 1: MEDIDA DISCIPLINAR ═══════════════════════════════════ */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Stripe topo */}
          <div style={{ height:3, background:'linear-gradient(90deg,#ef4444,#dc2626)' }} />
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(220,38,38,0.06))', border:'1px solid rgba(239,68,68,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ClipboardDocumentListIcon style={{ width:22, height:22, color:'#ef4444' }} />
                </div>
                <div>
                  <h2 style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:0 }}>Passo 1 — Medida Disciplinar</h2>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'2px 0 0' }}>Defina a medida e ocorrência que será aplicada a todos os alunos do lote</p>
                </div>
              </div>
              <button
                onClick={() => setModalMedidaOpen(true)}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'10px 20px', borderRadius:12, border:'none', cursor:'pointer',
                  background: medidaConfirmada
                    ? 'linear-gradient(135deg,#16a34a,#15803d)'
                    : 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color:'#fff', fontSize:13, fontWeight:700,
                  boxShadow: medidaConfirmada ? '0 4px 14px rgba(22,163,74,0.3)' : '0 4px 14px rgba(239,68,68,0.3)',
                  transition:'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; }}
              >
                {medidaConfirmada
                  ? <><CheckCircleIcon style={{width:16,height:16}} /> Alterar Medida</>
                  : <><PlusIcon style={{width:16,height:16}} /> Definir Medida</>}
              </button>
            </div>

            {/* Preview da medida confirmada */}
            {medidaConfirmada && cor && (
              <div className="fo-fade-in mt-5 p-4 rounded-2xl flex flex-wrap gap-4 items-center"
                   style={{ background: cor.bg, border:`1.5px solid ${cor.border}` }}>
                <span style={{ padding:'4px 12px', borderRadius:20, background: cor.bg, color: cor.color, border:`1px solid ${cor.border}`, fontSize:12, fontWeight:700 }}>
                  {medidaConfirmada.medidaSelecionada}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color: cor.color, margin:0 }}>{medidaConfirmada.motivo}</p>
                  {medidaConfirmada.descricao && (
                    <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {medidaConfirmada.descricao}
                    </p>
                  )}
                </div>
                <span style={{ fontSize:11, color:'#94a3b8', flexShrink:0 }}>📅 {medidaConfirmada.data}</span>
                {medidaConfirmada.convocarObrigatorio && (
                  <span style={{ padding:'3px 10px', borderRadius:20, background:'#fef2f2', color:'#991b1b', border:'1px solid #fecaca', fontSize:11, fontWeight:700 }}>
                    Convocação obrigatória
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ STEP 2: SELECIONAR TURMA ═════════════════════════════════════ */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div style={{ height:3, background:'linear-gradient(90deg,#3b82f6,#2563eb)' }} />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(37,99,235,0.06))', border:'1px solid rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <AcademicCapIcon style={{ width:22, height:22, color:'#3b82f6' }} />
              </div>
              <div>
                <h2 style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:0 }}>Passo 2 — Selecionar Turma</h2>
                <p style={{ fontSize:12, color:'#94a3b8', margin:'2px 0 0' }}>Filtre por turno e turma para carregar os alunos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Turno */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Turno</label>
                <div className="relative">
                  <select
                    value={turno}
                    onChange={e => setTurno(e.target.value)}
                    style={{ width:'100%', padding:'12px 40px 12px 16px', borderRadius:12, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:14, fontWeight:500, color:'#0f172a', outline:'none', appearance:'none', cursor:'pointer', transition:'all 0.2s' }}
                    onFocus={e => { e.target.style.border='1.5px solid #3b82f6'; e.target.style.background='#fff'; }}
                    onBlur={e => { e.target.style.border='1.5px solid #e2e8f0'; e.target.style.background='#f8fafc'; }}
                  >
                    <option value="">— Todos os turnos —</option>
                    {TURNOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDownIcon style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8', pointerEvents:'none' }} />
                </div>
              </div>

              {/* Turma */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Turma</label>
                <div className="relative">
                  <select
                    value={turmaId}
                    onChange={e => setTurmaId(e.target.value)}
                    disabled={loadingTurmas}
                    style={{ width:'100%', padding:'12px 40px 12px 16px', borderRadius:12, border:'1.5px solid #e2e8f0', background: loadingTurmas ? '#f1f5f9' : '#f8fafc', fontSize:14, fontWeight:500, color:'#0f172a', outline:'none', appearance:'none', cursor: loadingTurmas ? 'not-allowed' : 'pointer', transition:'all 0.2s' }}
                    onFocus={e => { if (!loadingTurmas) { e.target.style.border='1.5px solid #3b82f6'; e.target.style.background='#fff'; } }}
                    onBlur={e => { e.target.style.border='1.5px solid #e2e8f0'; e.target.style.background='#f8fafc'; }}
                  >
                    <option value="">— Selecione a turma —</option>
                    {turmasFiltradas.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.turma || t.nome || `Turma ${t.id}`}
                        {t.turno ? ` — ${t.turno.charAt(0).toUpperCase() + t.turno.slice(1)}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8', pointerEvents:'none' }} />
                </div>
              </div>
            </div>

            {/* Lista de alunos da turma */}
            {turmaId && (
              <div className="fo-fade-in mt-6">
                <div className="flex items-center justify-between mb-3">
                  <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:0 }}>
                    {loadingAlunos ? 'Carregando alunos…' : `${alunosTurma.length} aluno(s) em ${turmaAtual?.turma || turmaAtual?.nome || ''}`}
                  </p>
                  {!loadingAlunos && alunosTurma.length > 0 && !medidaConfirmada && (
                    <span style={{ fontSize:11, color:'#f59e0b', fontWeight:600, background:'#fffbeb', padding:'3px 10px', borderRadius:20, border:'1px solid #fde68a' }}>
                      ⚠️ Defina a medida antes de adicionar alunos
                    </span>
                  )}
                </div>

                {/* Busca */}
                {!loadingAlunos && alunosTurma.length > 0 && (
                  <input
                    type="text"
                    placeholder="Buscar por nome ou RE…"
                    value={buscaAluno}
                    onChange={e => setBuscaAluno(e.target.value)}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:12, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:13, marginBottom:10, outline:'none', transition:'all 0.2s', boxSizing:'border-box' }}
                    onFocus={e => { e.target.style.border='1.5px solid #3b82f6'; e.target.style.background='#fff'; }}
                    onBlur={e => { e.target.style.border='1.5px solid #e2e8f0'; e.target.style.background='#f8fafc'; }}
                  />
                )}

                {loadingAlunos && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:20, justifyContent:'center' }}>
                    <div style={{ width:20, height:20, border:'2px solid #e2e8f0', borderTop:'2px solid #3b82f6', borderRadius:'50%', animation:'foSpin 0.8s linear infinite' }} />
                    <span style={{ color:'#64748b', fontSize:13 }}>Carregando alunos…</span>
                  </div>
                )}

                {!loadingAlunos && alunosFiltradosBusca.length > 0 && (
                  <div style={{ maxHeight:260, overflowY:'auto', border:'1px solid #f1f5f9', borderRadius:12 }}>
                    {alunosFiltradosBusca.map((aluno, idx) => {
                      const jaAdicionado = lote.some(l => l.aluno.id === aluno.id);
                      return (
                        <div
                          key={aluno.id}
                          className="fo-row-in"
                          style={{
                            display:'flex', alignItems:'center', padding:'10px 14px', gap:12,
                            background: jaAdicionado ? '#f0fdf4' : idx % 2 === 0 ? '#fff' : '#f8fafc',
                            borderBottom: idx < alunosFiltradosBusca.length - 1 ? '1px solid #f1f5f9' : 'none',
                            animationDelay: `${idx * 0.03}s`,
                            transition:'background 0.15s',
                          }}
                        >
                          <div style={{ width:36, height:36, borderRadius:10, background: jaAdicionado ? '#dcfce7' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700, fontSize:14, color: jaAdicionado ? '#16a34a' : '#64748b' }}>
                            {jaAdicionado ? '✓' : (aluno.nome?.[0] || '?')}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {aluno.nome}
                            </p>
                            <p style={{ margin:'1px 0 0', fontSize:11, color:'#94a3b8' }}>
                              RE: {aluno.re || aluno.matricula || '—'}
                            </p>
                          </div>
                          <button
                            onClick={() => adicionarAluno(aluno)}
                            disabled={jaAdicionado || !medidaConfirmada}
                            style={{
                              padding:'6px 14px', borderRadius:10, border:'none', cursor: (jaAdicionado || !medidaConfirmada) ? 'not-allowed' : 'pointer',
                              background: jaAdicionado ? '#dcfce7' : !medidaConfirmada ? '#f1f5f9' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
                              color: jaAdicionado ? '#16a34a' : !medidaConfirmada ? '#94a3b8' : '#fff',
                              fontSize:12, fontWeight:700, flexShrink:0, transition:'all 0.15s',
                              opacity: !medidaConfirmada ? 0.5 : 1,
                            }}
                          >
                            {jaAdicionado ? 'Adicionado' : '+ Adicionar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!loadingAlunos && alunosTurma.length > 0 && alunosFiltradosBusca.length === 0 && (
                  <p style={{ textAlign:'center', color:'#94a3b8', fontSize:13, padding:16 }}>Nenhum aluno encontrado.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ STEP 3: LOTE DE ALUNOS ═══════════════════════════════════════ */}
        {lote.length > 0 && (
          <div className="fo-fade-in bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div style={{ height:3, background:'linear-gradient(90deg,#8b5cf6,#6d28d9)' }} />
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(109,40,217,0.06))', border:'1px solid rgba(139,92,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <UsersIcon style={{ width:22, height:22, color:'#8b5cf6' }} />
                </div>
                <div>
                  <h2 style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:0 }}>
                    Passo 3 — Lote ({lote.length} aluno{lote.length !== 1 ? 's' : ''})
                  </h2>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'2px 0 0' }}>
                    Ative individualmente a convocação do responsável quando necessário
                  </p>
                </div>
              </div>

              {/* Tabela do lote */}
              <div style={{ border:'1px solid #f1f5f9', borderRadius:16, overflow:'hidden' }}>
                {/* Cabeçalho */}
                <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 160px 60px', padding:'10px 16px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  <span>RE</span>
                  <span>Nome do Aluno</span>
                  <span style={{ textAlign:'center' }}>Convocar Resp.</span>
                  <span style={{ textAlign:'center' }}>Ação</span>
                </div>

                {/* Linhas */}
                {lote.map((item, idx) => {
                  const obrigatoria = medidaConfirmada?.convocarObrigatorio || false;
                  return (
                    <div
                      key={item.aluno.id}
                      className="fo-row-in"
                      style={{
                        display:'grid', gridTemplateColumns:'80px 1fr 160px 60px',
                        padding:'12px 16px', alignItems:'center',
                        background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                        borderBottom: idx < lote.length - 1 ? '1px solid #f1f5f9' : 'none',
                        animationDelay: `${idx * 0.04}s`,
                      }}
                    >
                      <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>
                        {item.aluno.re || item.aluno.matricula || '—'}
                      </span>
                      <span style={{ fontSize:13, fontWeight:600, color:'#0f172a', paddingRight:8 }}>
                        {item.aluno.nome}
                      </span>

                      {/* Toggle Convocar */}
                      <div style={{ display:'flex', justifyContent:'center' }}>
                        <button
                          onClick={() => toggleConvocar(item.aluno.id)}
                          disabled={obrigatoria}
                          title={obrigatoria ? 'Convocação obrigatória para esta medida' : 'Clique para alternar'}
                          style={{
                            position:'relative', width:48, height:26, borderRadius:13, border:'none', cursor: obrigatoria ? 'not-allowed' : 'pointer',
                            background: item.convocarResponsavel
                              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                              : '#e2e8f0',
                            transition:'background 0.25s', flexShrink:0,
                          }}
                        >
                          <div style={{
                            position:'absolute', top:3, left: item.convocarResponsavel ? 25 : 3,
                            width:20, height:20, borderRadius:'50%', background:'#fff',
                            boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
                            transition:'left 0.25s',
                          }} />
                        </button>
                        <span style={{ fontSize:11, color: item.convocarResponsavel ? '#dc2626' : '#94a3b8', marginLeft:8, fontWeight:600, minWidth:28 }}>
                          {item.convocarResponsavel ? 'Sim' : 'Não'}
                        </span>
                      </div>

                      {/* Remover */}
                      <div style={{ display:'flex', justifyContent:'center' }}>
                        <button
                          onClick={() => removerAluno(item.aluno.id)}
                          style={{ padding:6, borderRadius:8, border:'none', cursor:'pointer', background:'transparent', color:'#94a3b8', transition:'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.color='#dc2626'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}
                          title="Remover do lote"
                        >
                          <XMarkIcon style={{ width:16, height:16 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão Registrar em Lote */}
              <div style={{ marginTop:20, display:'flex', justifyContent:'flex-end' }}>
                <button
                  onClick={() => { setModalConfirmOpen(true); setFeedbackLote(null); }}
                  disabled={!medidaConfirmada}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'14px 28px', borderRadius:14, border:'none', cursor:'pointer',
                    background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                    color:'#fff', fontSize:14, fontWeight:700,
                    boxShadow:'0 6px 20px rgba(109,40,217,0.35)',
                    transition:'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(109,40,217,0.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(109,40,217,0.35)'; }}
                >
                  <CheckCircleIcon style={{ width:18, height:18 }} />
                  Registrar em Lote ({lote.length} aluno{lote.length !== 1 ? 's' : ''})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — NOVA MEDIDA DISCIPLINAR (sem convocar responsável)
      ══════════════════════════════════════════════════════════════════════ */}
      {modalMedidaOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 fo-fade-in"
          style={{ background:'rgba(15,23,42,0.7)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}
        >
          <div
            className="fo-slide-up bg-white w-full flex flex-col"
            style={{ maxWidth:520, maxHeight:'90vh', borderRadius:20, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.06)', overflow:'hidden' }}
          >
            {/* Header */}
            <div className="relative overflow-hidden flex-shrink-0" style={{ background:'linear-gradient(135deg,#1e3a5f 0%,#0f2847 50%,#0a1628 100%)' }}>
              <div style={{ position:'absolute', top:'-40%', right:'-15%', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.15) 0%,transparent 70%)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:'-30%', left:'-10%', width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,0.08) 0%,transparent 70%)', pointerEvents:'none' }} />
              <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div style={{ padding:10, borderRadius:14, background:'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(239,68,68,0.15))', border:'1px solid rgba(255,255,255,0.1)', animation:'foPulse 2.5s ease-in-out infinite' }}>
                    <ClipboardDocumentListIcon style={{ width:22, height:22, color:'#93c5fd' }} />
                  </div>
                  <div>
                    <h2 style={{ color:'#fff', fontSize:18, fontWeight:700, margin:0, letterSpacing:'-0.02em' }}>Nova Medida Disciplinar</h2>
                    <p style={{ color:'rgba(148,163,184,0.85)', fontSize:12, margin:'3px 0 0' }}>Defina a medida aplicada ao F.O. Coletivo</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMedidaOpen(false)}
                  style={{ padding:8, borderRadius:10, background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', transition:'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.4)'; }}
                >
                  <XMarkIcon style={{ width:20, height:20 }} />
                </button>
              </div>
            </div>

            {/* Corpo com scroll */}
            <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Data da Ocorrência</label>
                  <input
                    type="date"
                    value={medidaForm.data}
                    onChange={e => setMedidaForm(f => ({ ...f, data: e.target.value }))}
                    style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Medida Disciplinar</label>
                  <select
                    value={medidaForm.medidaSelecionada}
                    onChange={e => handleMedidaChange(e.target.value)}
                    required
                    style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box' }}
                  >
                    <option value="">— Selecione —</option>
                    {MEDIDAS_DROPDOWN.map(m => <option key={m.label} value={m.label}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Ocorrência */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Ocorrência</label>
                <select
                  value={medidaForm.motivo}
                  onChange={e => setMedidaForm(f => ({ ...f, motivo: e.target.value }))}
                  disabled={!medidaForm.medidaSelecionada}
                  required
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background: !medidaForm.medidaSelecionada ? '#f8fafc' : '#fff', boxSizing:'border-box' }}
                >
                  <option value="">— Selecione uma opção —</option>
                  {registrosFiltrados.map(t => <option key={t.id} value={t.descricao_ocorrencia}>{t.descricao_ocorrencia}</option>)}
                </select>
              </div>

              {/* Dias de Suspensão */}
              {medidaForm.medidaSelecionada === 'Suspensão' && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Dias de Suspensão (1–3)</label>
                  <input
                    type="number" min="1" max="3"
                    value={medidaForm.diasSuspensao}
                    onChange={e => setMedidaForm(f => ({ ...f, diasSuspensao: e.target.value }))}
                    placeholder="Informe de 1 a 3 dias"
                    style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }}
                  />
                </div>
              )}

              {/* Descrição */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Descrição <span style={{ fontWeight:400, color:'#94a3b8' }}>(opcional)</span></label>
                <textarea
                  rows={3}
                  value={medidaForm.descricao}
                  onChange={e => setMedidaForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Relato detalhado do ocorrido…"
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', resize:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>

              {/* Registro Interno */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>
                  Registro Interno <span style={{ fontWeight:400, color:'#94a3b8' }}>(uso interno — não impresso)</span>
                </label>
                <textarea
                  rows={2}
                  value={medidaForm.registroInterno}
                  onChange={e => setMedidaForm(f => ({ ...f, registroInterno: e.target.value }))}
                  placeholder="Anotações internas entre militares…"
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', resize:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>

              {/* Aviso medidas com convocação obrigatória */}
              {MEDIDAS_OBRIGATORIAS.includes(medidaForm.medidaSelecionada) && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', fontSize:12, color:'#92400e', marginBottom:12 }}>
                  ⚠️ Esta medida exige <strong>convocação obrigatória do responsável</strong> (Art. 16, § 1º). Todos os alunos do lote terão convocação marcada automaticamente.
                </div>
              )}

              {/* Nota: sem opção de convocar aqui (aplica individualmente na tabela) */}
              <div style={{ padding:'10px 14px', borderRadius:10, background:'#eff6ff', border:'1px solid #bfdbfe', fontSize:11, color:'#1e40af', display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ fontSize:14, lineHeight:1, flexShrink:0 }}>ℹ️</span>
                <span>A opção de <strong>convocar responsável</strong> será definida individualmente para cada aluno na tabela de lote (passo 3).</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 24px 18px', borderTop:'1px solid #f1f5f9', background:'#fafbfc', flexShrink:0 }}>
              {/* Consultar tabela */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'linear-gradient(135deg,#eff6ff,#f0f9ff)', border:'1px solid #bfdbfe', marginBottom:12, fontSize:11, color:'#1e40af' }}>
                <span>🤖</span>
                <span>Consultar Medidas Disciplinares disponíveis: </span>
                <button
                  type="button"
                  onClick={() => { setConsultaOpen(true); setBuscaConsulta(''); }}
                  style={{ background:'none', border:'none', padding:0, color:'#1d4ed8', fontWeight:700, cursor:'pointer', textDecoration:'underline', fontSize:11 }}
                >
                  abrir tabela
                </button>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button
                  onClick={() => setModalMedidaOpen(false)}
                  style={{ flex:1, padding:'11px', borderRadius:12, border:'1.5px solid #e5e7eb', fontSize:14, fontWeight:500, color:'#6b7280', cursor:'pointer', background:'transparent', transition:'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarMedida}
                  disabled={!medidaForm.medidaSelecionada || !medidaForm.motivo}
                  style={{
                    flex:2, padding:'12px', borderRadius:12, border:'none', cursor: (!medidaForm.medidaSelecionada || !medidaForm.motivo) ? 'not-allowed' : 'pointer',
                    background: (!medidaForm.medidaSelecionada || !medidaForm.motivo) ? '#e2e8f0' : 'linear-gradient(135deg,#1e3a5f,#0f2847)',
                    color: (!medidaForm.medidaSelecionada || !medidaForm.motivo) ? '#94a3b8' : '#fff',
                    fontSize:14, fontWeight:700,
                    boxShadow: (!medidaForm.medidaSelecionada || !medidaForm.motivo) ? 'none' : '0 4px 14px rgba(15,40,71,0.3)',
                    transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  }}
                >
                  <CheckCircleIcon style={{ width:16, height:16 }} /> Confirmar Medida
                </button>
              </div>
            </div>
          </div>

          {/* Sub-modal Consulta de Medidas */}
          {consultaOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
              <div className="fo-slide-up bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxWidth:720, maxHeight:'82vh', overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc' }}>
                  <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:0 }}>Consulta de Medidas Disciplinares</h3>
                  <button onClick={() => setConsultaOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                    <XMarkIcon style={{ width:20, height:20 }} />
                  </button>
                </div>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid #f1f5f9' }}>
                  <input
                    type="text"
                    placeholder="Pesquisar…"
                    value={buscaConsulta}
                    onChange={e => setBuscaConsulta(e.target.value)}
                    autoFocus
                    style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }}
                  />
                </div>
                <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
                        {['Medida','Tipo','Descrição da Ocorrência','Pontos'].map(h => (
                          <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {registrosOcorrencias
                        .filter(r => {
                          if (!buscaConsulta) return true;
                          const t = buscaConsulta.toLowerCase();
                          return (r.medida_disciplinar||'').toLowerCase().includes(t)
                            || (r.tipo_ocorrencia||'').toLowerCase().includes(t)
                            || (r.descricao_ocorrencia||'').toLowerCase().includes(t);
                        })
                        .map((r, idx) => {
                          const c = corMedida(r.medida_disciplinar);
                          return (
                            <tr
                              key={r.id}
                              onClick={() => handleSelecionarConsultaItem(r)}
                              style={{ background: idx%2===0?'#fff':'#fafbfc', borderBottom:'1px solid #f8fafc', cursor:'pointer', transition:'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
                              onMouseLeave={e => e.currentTarget.style.background=idx%2===0?'#fff':'#fafbfc'}
                            >
                              <td style={{ padding:'10px 14px' }}>
                                <span style={{ padding:'3px 10px', borderRadius:20, background:c.bg, color:c.color, border:`1px solid ${c.border}`, fontSize:11, fontWeight:700 }}>{r.medida_disciplinar}</span>
                              </td>
                              <td style={{ padding:'10px 14px', color:'#64748b', fontSize:12, textTransform:'capitalize' }}>{r.tipo_ocorrencia}</td>
                              <td style={{ padding:'10px 14px', color:'#374151' }}>{r.descricao_ocorrencia}</td>
                              <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color: Number(r.pontos)>0 ? '#16a34a' : Number(r.pontos)<0 ? '#dc2626' : '#64748b' }}>
                                {Number(r.pontos)>0?'+':''}{Number(r.pontos).toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL CONFIRMAÇÃO DE REGISTRO EM LOTE
      ══════════════════════════════════════════════════════════════════════ */}
      {modalConfirmOpen && medidaConfirmada && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 fo-fade-in"
          style={{ background:'rgba(15,23,42,0.75)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}
        >
          <div
            className="fo-slide-up bg-white w-full flex flex-col"
            style={{ maxWidth:480, borderRadius:20, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.4)', overflow:'hidden' }}
          >
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#4c1d95,#5b21b6)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ padding:10, borderRadius:14, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)' }}>
                  <CheckCircleIcon style={{ width:22, height:22, color:'#c4b5fd' }} />
                </div>
                <div>
                  <h2 style={{ color:'#fff', fontSize:17, fontWeight:700, margin:0 }}>Confirmar Registro em Lote</h2>
                  <p style={{ color:'rgba(196,181,253,0.8)', fontSize:11, margin:'2px 0 0' }}>Revise o resumo antes de confirmar</p>
                </div>
              </div>
              <button
                onClick={() => setModalConfirmOpen(false)}
                style={{ padding:7, borderRadius:9, background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.35)', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.35)'; }}
              >
                <XMarkIcon style={{ width:18, height:18 }} />
              </button>
            </div>

            {/* Corpo */}
            <div style={{ padding:'20px 24px', overflowY:'auto', maxHeight:'55vh' }}>

              {/* Resumo da medida */}
              {(() => {
                const c = corMedida(medidaConfirmada.medidaSelecionada);
                return (
                  <div style={{ padding:'14px', borderRadius:14, background:c.bg, border:`1.5px solid ${c.border}`, marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <span style={{ padding:'3px 12px', borderRadius:20, background:c.bg, color:c.color, border:`1px solid ${c.border}`, fontSize:12, fontWeight:700 }}>
                        {medidaConfirmada.medidaSelecionada}
                      </span>
                      <span style={{ fontSize:11, color:'#94a3b8' }}>📅 {medidaConfirmada.data}</span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, color:c.color, margin:'0 0 4px' }}>{medidaConfirmada.motivo}</p>
                    {medidaConfirmada.descricao && (
                      <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{medidaConfirmada.descricao}</p>
                    )}
                  </div>
                );
              })()}

              {/* Quantidade de alunos */}
              <div style={{ padding:'14px', borderRadius:14, background:'#f0fdf4', border:'1.5px solid #a7f3d0', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
                <UsersIcon style={{ width:22, height:22, color:'#059669', flexShrink:0 }} />
                <div>
                  <p style={{ fontSize:14, fontWeight:700, color:'#065f46', margin:0 }}>
                    {lote.length} aluno{lote.length !== 1 ? 's' : ''} no lote
                  </p>
                  <p style={{ fontSize:11, color:'#6b7280', margin:'2px 0 0' }}>
                    {lote.filter(l => l.convocarResponsavel).length > 0
                      ? `${lote.filter(l => l.convocarResponsavel).length} com convocação de responsável`
                      : 'Nenhum com convocação de responsável'}
                  </p>
                </div>
              </div>

              {/* Lista resumida */}
              <div style={{ border:'1px solid #f1f5f9', borderRadius:12, overflow:'hidden', marginBottom:4 }}>
                {lote.slice(0, 6).map((item, idx) => (
                  <div key={item.aluno.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px', background:idx%2===0?'#fff':'#fafbfc', borderBottom: idx < Math.min(lote.length, 6) - 1 ? '1px solid #f1f5f9' : 'none', fontSize:12 }}>
                    <span style={{ fontWeight:600, color:'#374151' }}>{item.aluno.nome}</span>
                    {item.convocarResponsavel && (
                      <span style={{ padding:'2px 8px', borderRadius:20, background:'#fef2f2', color:'#991b1b', border:'1px solid #fecaca', fontSize:10, fontWeight:700 }}>Convocar</span>
                    )}
                  </div>
                ))}
                {lote.length > 6 && (
                  <div style={{ padding:'8px 14px', background:'#f8fafc', textAlign:'center', fontSize:11, color:'#94a3b8' }}>
                    … e mais {lote.length - 6} aluno(s)
                  </div>
                )}
              </div>

              {/* Feedback */}
              {feedbackLote && (
                <div className="fo-fade-in" style={{ padding:'10px 14px', borderRadius:10, marginTop:12, background: feedbackLote.type==='success'?'#f0fdf4':'#fef2f2', border:`1px solid ${feedbackLote.type==='success'?'#a7f3d0':'#fecaca'}`, color: feedbackLote.type==='success'?'#065f46':'#991b1b', fontSize:13, fontWeight:600 }}>
                  {feedbackLote.msg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 24px 20px', borderTop:'1px solid #f1f5f9', background:'#fafbfc', display:'flex', gap:10 }}>
              <button
                onClick={() => setModalConfirmOpen(false)}
                disabled={registrandoLote}
                style={{ flex:1, padding:'11px', borderRadius:12, border:'1.5px solid #e5e7eb', fontSize:14, fontWeight:500, color:'#6b7280', cursor:'pointer', background:'transparent', transition:'all 0.2s', opacity: registrandoLote ? 0.5 : 1 }}
                onMouseEnter={e => { if (!registrandoLote) e.currentTarget.style.background='#f1f5f9'; }}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                Revisar
              </button>
              <button
                onClick={handleRegistrarLote}
                disabled={registrandoLote}
                style={{
                  flex:2, padding:'12px', borderRadius:12, border:'none', cursor: registrandoLote ? 'not-allowed' : 'pointer',
                  background: registrandoLote ? '#9ca3af' : 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                  color:'#fff', fontSize:14, fontWeight:700,
                  boxShadow: registrandoLote ? 'none' : '0 4px 14px rgba(109,40,217,0.35)',
                  transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}
              >
                {registrandoLote
                  ? <><div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'foSpin 0.8s linear infinite' }} /> Registrando…</>
                  : <><CheckCircleIcon style={{ width:17, height:17 }} /> Registrar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
