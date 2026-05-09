import React, { useState, useEffect } from 'react';

// Opções de etapa (mesmo padrão de TurmaForm)
const ETAPAS = [
  { value: 'INFANTIL',    label: 'Infantil' },
  { value: 'FUNDAMENTAL', label: 'Fundamental' },
  { value: 'MÉDIO',       label: 'Médio' },
  { value: 'GERAL',       label: 'Geral (todas as etapas)' },
];

const TURNOS = [
  { value: 'INTEGRAL',   label: 'Integral (Mat. + Vesp.)' },
  { value: 'MATUTINO',   label: 'Matutino' },
  { value: 'VESPERTINO', label: 'Vespertino' },
  { value: 'NOTURNO',    label: 'Noturno' },
  { value: 'INTEGRAL',   label: 'Integral' },
];

// ─── Paletas de cores ────────────────────────────────────────────────────────
const ETAPA_COLORS = {
  INFANTIL:    { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  FUNDAMENTAL: { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  'MÉDIO':     { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  GERAL:       { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
};

const TURNO_COLORS = {
  INTEGRAL:   { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  MATUTINO:   { bg: '#ecfdf5', color: '#047857', border: '#6ee7b7' },
  VESPERTINO: { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  NOTURNO:    { bg: '#1e1b4b', color: '#c7d2fe', border: '#4338ca' },
};

export default function DisciplinaForm({ open, onClose, onSubmit, disciplina }) {
  const [form, setForm] = useState({ nome: '', carga: '', etapa: 'FUNDAMENTAL', turno: 'INTEGRAL' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (disciplina) {
      setForm({
        id: disciplina.id ?? null,
        nome: disciplina.nome ?? disciplina.disciplina ?? '',
        carga: disciplina.carga ?? '',
        etapa: disciplina.etapa ?? 'FUNDAMENTAL',
        turno: disciplina.turno ?? 'INTEGRAL',
      });
    } else {
      setForm({ id: null, nome: '', carga: '', etapa: 'FUNDAMENTAL', turno: 'INTEGRAL' });
      setErrors({});
    }
  }, [open, disciplina]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.nome.trim()) errs.nome  = 'Nome é obrigatório';
    if (!form.carga)        errs.carga = 'Carga é obrigatória';
    if (!form.etapa)        errs.etapa = 'Etapa é obrigatória';
    if (!form.turno)        errs.turno = 'Turno é obrigatório';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true);
    const ok = await onSubmit(form);
    setSending(false);
    if (ok) onClose();
  };

  if (!open) return null;

  const etapaCor = ETAPA_COLORS[form.etapa] || ETAPA_COLORS.GERAL;
  const turnoCor = TURNO_COLORS[form.turno] || TURNO_COLORS.INTEGRAL;
  const isEdit   = !!form.id;

  // Estilos de campo reutilizável
  const fieldStyle = hasError => ({
    width: '100%',
    padding: '11px 14px',
    border: hasError ? '2px solid #ef4444' : '1.5px solid #d1d5db',
    borderRadius: 10,
    fontSize: 15,
    color: '#111827',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const onFocusStyle = e => {
    e.target.style.borderColor = '#3b82f6';
    e.target.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.12)';
  };
  const onBlurStyle = (hasError) => e => {
    e.target.style.borderColor = hasError ? '#ef4444' : '#d1d5db';
    e.target.style.boxShadow   = 'none';
  };

  return (
    <>
      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 49,
        }}
        onClick={onClose}
      />

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        width: '100%',
        maxWidth: 500,
        padding: '0 16px',
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
            borderRadius: 20,
            boxShadow: '0 25px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)',
            padding: '22px 28px 18px',
            position: 'relative',
          }}>
            <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, background:'rgba(255,255,255,0.08)', borderRadius:'50%' }} />
            <div style={{ position:'absolute', bottom:-30, left:-15, width:80, height:80, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }} />

            <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
              <div style={{ width:44, height:44, background:'rgba(255,255,255,0.2)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                📚
              </div>
              <div>
                <h2 style={{ margin:0, color:'#fff', fontSize:18, fontWeight:700, letterSpacing:'-0.3px' }}>
                  {isEdit ? 'Editar Disciplina' : 'Nova Disciplina'}
                </h2>
                <p style={{ margin:0, color:'rgba(255,255,255,0.75)', fontSize:13, marginTop:2 }}>
                  {isEdit ? 'Altere os dados abaixo' : 'Preencha os dados da disciplina'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Corpo ─────────────────────────────────────────────────────── */}
          <div style={{ padding: '22px 28px 8px' }}>

            {/* Campo: Disciplina */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Disciplina
              </label>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Ex: Português"
                style={fieldStyle(errors.nome)}
                onFocus={onFocusStyle}
                onBlur={onBlurStyle(errors.nome)}
              />
              {errors.nome && <p style={{ margin:'4px 0 0', fontSize:12, color:'#ef4444' }}>⚠ {errors.nome}</p>}
            </div>

            {/* Etapa + Turno lado a lado */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>

              {/* Campo: Etapa */}
              <div>
                <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Etapa
                </label>
                <div style={{ position:'relative' }}>
                  <select
                    name="etapa"
                    value={form.etapa}
                    onChange={handleChange}
                    style={{ ...fieldStyle(errors.etapa), paddingRight:34, appearance:'none', cursor:'pointer' }}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle(errors.etapa)}
                  >
                    {ETAPAS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#6b7280', fontSize:11 }}>▼</span>
                </div>
                {errors.etapa && <p style={{ margin:'4px 0 0', fontSize:12, color:'#ef4444' }}>⚠ {errors.etapa}</p>}
              </div>

              {/* Campo: Turno */}
              <div>
                <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Turno
                </label>
                <div style={{ position:'relative' }}>
                  <select
                    name="turno"
                    value={form.turno}
                    onChange={handleChange}
                    style={{ ...fieldStyle(errors.turno), paddingRight:34, appearance:'none', cursor:'pointer' }}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle(errors.turno)}
                  >
                    {TURNOS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#6b7280', fontSize:11 }}>▼</span>
                </div>
                {errors.turno && <p style={{ margin:'4px 0 0', fontSize:12, color:'#ef4444' }}>⚠ {errors.turno}</p>}
              </div>
            </div>

            {/* Preview badges */}
            {(form.etapa || form.turno) && (
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6, marginBottom:14 }}>
                {form.etapa && (
                  <span style={{
                    display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                    background: etapaCor.bg, color: etapaCor.color, border: `1px solid ${etapaCor.border}`,
                  }}>
                    {ETAPAS.find(e => e.value === form.etapa)?.label.split(' ')[0]}
                  </span>
                )}
                {form.turno && (
                  <span style={{
                    display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                    background: turnoCor.bg, color: turnoCor.color, border: `1px solid ${turnoCor.border}`,
                  }}>
                    {TURNOS.find(t => t.value === form.turno)?.label}
                  </span>
                )}
                {form.nome && (
                  <span style={{ fontSize:12, color:'#6b7280' }}>
                    → boletim: <strong>"{form.nome.trim()}"</strong>
                  </span>
                )}
              </div>
            )}

            {/* Campo: Carga Horária */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Carga Semanal (aulas)
              </label>
              <div style={{ position:'relative' }}>
                <input
                  name="carga"
                  type="number"
                  min="1"
                  max="30"
                  value={form.carga}
                  onChange={handleChange}
                  placeholder="Ex: 5"
                  style={{ ...fieldStyle(errors.carga), paddingRight:50 }}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle(errors.carga)}
                />
                <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'#9ca3af', fontWeight:500 }}>aulas</span>
              </div>
              {errors.carga && <p style={{ margin:'4px 0 0', fontSize:12, color:'#ef4444' }}>⚠ {errors.carga}</p>}
            </div>
          </div>

          {/* ── Rodapé ────────────────────────────────────────────────────── */}
          <div style={{
            padding: '16px 28px 24px',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            borderTop: '1px solid #f0f0f0',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding:'10px 22px', border:'1.5px solid #d1d5db', borderRadius:10, background:'#fff', color:'#374151', fontSize:14, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e => { e.target.style.background='#f9fafb'; e.target.style.borderColor='#9ca3af'; }}
              onMouseLeave={e => { e.target.style.background='#fff'; e.target.style.borderColor='#d1d5db'; }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              style={{
                padding:'10px 28px', border:'none', borderRadius:10,
                background: sending
                  ? 'linear-gradient(135deg, #93c5fd, #67e8f9)'
                  : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #06b6d4 100%)',
                color:'#fff', fontSize:14, fontWeight:700,
                cursor: sending ? 'wait' : 'pointer',
                boxShadow: sending ? 'none' : '0 4px 14px rgba(59,130,246,0.4)',
                transition:'all 0.2s', letterSpacing:'0.2px',
              }}
              onMouseEnter={e => { if (!sending) { e.target.style.transform='translateY(-1px)'; e.target.style.boxShadow='0 6px 18px rgba(59,130,246,0.5)'; }}}
              onMouseLeave={e => { e.target.style.transform='none'; e.target.style.boxShadow = sending ? 'none' : '0 4px 14px rgba(59,130,246,0.4)'; }}
            >
              {sending ? '⏳ Salvando…' : isEdit ? '✔ Salvar Alterações' : '+ Cadastrar Disciplina'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
