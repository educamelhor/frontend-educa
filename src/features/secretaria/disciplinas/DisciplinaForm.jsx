import React, { useState, useEffect } from 'react';

const TIPOS = [
  { value: 'REGULAR',             label: 'Regular (Base Nacional)' },
  { value: 'PARTE_DIVERSIFICADA', label: 'Parte Diversificada (PD1/PD2/PD3)' },
  { value: 'IFA',                 label: 'IFA — Itinerário Formativo' },
  { value: 'PCA',                 label: 'PCA — Projeto de Contemplação de Área' },
  { value: 'ELETIVA',             label: 'Eletiva / Optativa' },
  { value: 'PROJETO',             label: 'Projeto Interdisciplinar' },
];

export default function DisciplinaForm({ open, onClose, onSubmit, disciplina }) {
  const [form, setForm] = useState({
    nome: '',
    abreviatura: '',
    nome_oficial: '',
    tipo: 'REGULAR',
    carga: 1,
    etapa: 'GERAL',
    turno: 'INTEGRAL'
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (disciplina) {
      setForm({
        id: disciplina.id ?? null,
        nome: disciplina.nome ?? disciplina.disciplina ?? '',
        abreviatura: disciplina.abreviatura ?? '',
        nome_oficial: disciplina.nome_oficial ?? '',
        tipo: disciplina.tipo ?? 'REGULAR',
        carga: disciplina.carga ?? 1,
        etapa: disciplina.etapa ?? 'GERAL',
        turno: disciplina.turno ?? 'INTEGRAL',
      });
    } else {
      setForm({
        id: null,
        nome: '',
        abreviatura: '',
        nome_oficial: '',
        tipo: 'REGULAR',
        carga: 1,
        etapa: 'GERAL',
        turno: 'INTEGRAL'
      });
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
    if (!form.nome.trim()) errs.nome = 'Nome da disciplina é obrigatório';
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

  const isEdit = !!form.id;

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
                  Catálogo Único de Disciplinas da Escola
                </p>
              </div>
            </div>
          </div>

          {/* ── Corpo ─────────────────────────────────────────────────────── */}
          <div style={{ padding: '22px 28px 8px' }}>

            {/* Disciplina + Abreviatura lado a lado */}
            <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1.2fr', gap:14, marginBottom:16 }}>
              {/* Campo: Disciplina */}
              <div>
                <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Disciplina <span style={{ color:'#ef4444' }}>*</span>
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

              {/* Campo: Abreviatura */}
              <div>
                <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Abreviatura <span style={{ fontSize:11, color:'#9ca3af', fontWeight:400, textTransform:'none' }}>(opcional)</span>
                </label>
                <input
                  name="abreviatura"
                  value={form.abreviatura}
                  onChange={e => {
                    const val = e.target.value.toUpperCase();
                    setForm(f => ({ ...f, abreviatura: val }));
                  }}
                  placeholder="Ex: PORT"
                  maxLength={15}
                  style={fieldStyle(false)}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle(false)}
                />
              </div>
            </div>

            {/* Campo: Tipo de Disciplina */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Tipo <span style={{ fontSize:10, color:'#9ca3af', fontWeight:400, textTransform:'none' }}>(categorização)</span>
              </label>
              <div style={{ position:'relative' }}>
                <select
                  name="tipo"
                  value={form.tipo || 'REGULAR'}
                  onChange={handleChange}
                  style={{ ...fieldStyle(false), paddingRight:34, appearance:'none', cursor:'pointer' }}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle(false)}
                >
                  {TIPOS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#6b7280', fontSize:11 }}>▼</span>
              </div>
              {(form.tipo === 'IFA' || form.tipo === 'PCA') && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'#eff6ff', border:'1px solid #93c5fd', borderRadius:8 }}>
                  <p style={{ margin:0, fontSize:12, color:'#1d4ed8' }}>
                    💡 Para {form.tipo}s, use o nome completo no campo Disciplina acima (ex: "{form.tipo === 'IFA' ? 'IFA - PRODUÇÃO TEXTUAL E COMUNICAÇÃO' : 'PCA - PROJETO INTERDISCIPLINAR DE CIÊNCIAS'}").
                  </p>
                </div>
              )}
            </div>

            {/* Campo: Padrão Oficial EDUCADF */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#059669', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Padrão Oficial <span style={{ fontSize:11, color:'#9ca3af', fontWeight:400, textTransform:'none' }}>(Mapeamento EDUCADF)</span>
              </label>
              <input
                name="nome_oficial"
                list="seedf-disciplinas-form-list"
                value={form.nome_oficial}
                onChange={handleChange}
                placeholder="Ex: LÍNGUA PORTUGUESA"
                style={fieldStyle(false)}
                onFocus={onFocusStyle}
                onBlur={onBlurStyle(false)}
              />
              <datalist id="seedf-disciplinas-form-list">
                <option value="LÍNGUA PORTUGUESA" />
                <option value="MATEMÁTICA" />
                <option value="CIÊNCIAS NATURAIS" />
                <option value="HISTÓRIA" />
                <option value="GEOGRAFIA" />
                <option value="ARTES" />
                <option value="EDUCAÇÃO FÍSICA" />
                <option value="LEM/INGLÊS" />
                <option value="LEM/ESPANHOL" />
                <option value="PARTE DIVERSIFICADA I" />
                <option value="PARTE DIVERSIFICADA II" />
                <option value="PARTE DIVERSIFICADA III" />
                <option value="ENSINO RELIGIOSO" />
                <option value="BIOLOGIA" />
                <option value="FÍSICA" />
                <option value="QUÍMICA" />
                <option value="FILOSOFIA" />
                <option value="SOCIOLOGIA" />
              </datalist>
            </div>

            {/* Banner explicativo de modelo limpo */}
            <div style={{
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              marginBottom: 10,
              fontSize: 12,
              color: '#64748b',
              lineHeight: 1.5
            }}>
              💡 <strong>Estrutura:</strong> A <em>Etapa</em> e o <em>Turno</em> estão vinculados às <strong>Turmas</strong>. A <em>Carga Horária Semanal</em> é definida de forma autônoma para cada turma no submenu <strong>Cargas Horárias</strong>.
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
