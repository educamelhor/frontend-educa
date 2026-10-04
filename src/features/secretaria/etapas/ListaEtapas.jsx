import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

const OPCOES_ETAPAS = [
  { nome: 'Infantil',             sigla: 'INF' },
  { nome: 'Fundamental',          sigla: 'FUND' },
  { nome: 'Médio',                sigla: 'MED' },
  { nome: 'EJA',                  sigla: 'EJA' },
  { nome: 'Fundamental Integral', sigla: 'FUND_INT' },
  { nome: 'Médio Integral',       sigla: 'MED_INT' },
  { nome: 'Médio Técnico',        sigla: 'MED_TEC' },
];

export default function ListaEtapas() {
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState(null);
  const [toDeleteEtapa, setToDeleteEtapa] = useState(null);
  const [form, setForm] = useState({ nome: '', sigla: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchEtapas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/etapas');
      setEtapas(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar etapas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEtapas();
  }, []);

  const handleOpenModal = (etp = null) => {
    setError('');
    if (etp) {
      setEditingEtapa(etp);
      setForm({ nome: etp.nome, sigla: etp.sigla || '' });
    } else {
      setEditingEtapa(null);
      setForm({ nome: 'Infantil', sigla: 'INF' });
    }
    setModalOpen(true);
  };

  const handleSelectNome = (nomeSelecionado) => {
    const encontrado = OPCOES_ETAPAS.find(op => op.nome === nomeSelecionado);
    setForm({
      nome: nomeSelecionado,
      sigla: encontrado ? encontrado.sigla : ''
    });
    if (error) setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setError('Selecione uma etapa de ensino.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        nome: form.nome.trim(),
        sigla: form.sigla.trim(),
        ordem: editingEtapa ? editingEtapa.ordem : (etapas.length + 1)
      };

      if (editingEtapa) {
        await api.put(`/etapas/${editingEtapa.id}`, payload);
        setSuccessMessage('Etapa atualizada com sucesso!');
      } else {
        await api.post('/etapas', payload);
        setSuccessMessage('Etapa cadastrada com sucesso!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
      setModalOpen(false);
      fetchEtapas();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar etapa.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = (etp) => {
    setDeleteError('');
    setToDeleteEtapa(etp);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!toDeleteEtapa) return;
    try {
      setDeleting(true);
      setDeleteError('');
      await api.delete(`/etapas/${toDeleteEtapa.id}`);
      setDeleteModalOpen(false);
      setToDeleteEtapa(null);
      setSuccessMessage('Etapa excluída com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchEtapas();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Erro ao excluir etapa.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleAtiva = async (etp) => {
    try {
      await api.put(`/etapas/${etp.id}`, {
        nome: etp.nome,
        sigla: etp.sigla,
        ordem: etp.ordem || 1,
        ativa: etp.ativa ? 0 : 1
      });
      fetchEtapas();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao alterar status da etapa.');
    }
  };

  const fieldStyle = (hasError) => ({
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

  const onFocusStyle = (e) => {
    e.target.style.borderColor = '#3b82f6';
    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
  };

  const onBlurStyle = (hasError) => (e) => {
    e.target.style.borderColor = hasError ? '#ef4444' : '#d1d5db';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* ── Cabeçalho da Página ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            Gestão de Etapas de Ensino
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Cadastre e organize as etapas de ensino para vincular às turmas da sua escola.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #06b6d4 100%)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(59,130,246,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.35)'; }}
        >
          <PlusIcon style={{ width: '18px', height: '18px' }} />
          Nova Etapa
        </button>
      </div>

      {/* ── Mensagem de Sucesso ───────────────────────────────────────── */}
      {successMessage && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#166534',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ✓ {successMessage}
        </div>
      )}

      {/* ── Tabela de Etapas ───────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Carregando etapas...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 20px', fontWeight: 700 }}>Nome da Etapa</th>
                <th style={{ padding: '14px 20px', fontWeight: 700 }}>Sigla</th>
                <th style={{ padding: '14px 20px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {etapas.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Nenhuma etapa cadastrada no momento. Clique em "+ Nova Etapa" para iniciar.
                  </td>
                </tr>
              ) : (
                etapas.map((etp) => (
                  <tr key={etp.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }} className="hover:bg-slate-50">
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                      {etp.nome}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                      }}>
                        {etp.sigla || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        onClick={() => handleToggleAtiva(etp)}
                        title="Clique para alternar o status"
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: etp.ativa ? '#dcfce7' : '#fee2e2',
                          color: etp.ativa ? '#15803d' : '#b91c1c',
                          border: `1px solid ${etp.ativa ? '#86efac' : '#fca5a5'}`
                        }}
                      >
                        {etp.ativa ? <CheckIcon style={{ width: '13px', height: '13px' }} /> : <XMarkIcon style={{ width: '13px', height: '13px' }} />}
                        {etp.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenModal(etp)}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            color: '#2563eb',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'all 0.15s'
                          }}
                          title="Editar Etapa"
                          onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                          onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                        >
                          <PencilSquareIcon style={{ width: '16px', height: '16px' }} />
                        </button>

                        <button
                          onClick={() => handleOpenDeleteModal(etp)}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'all 0.15s'
                          }}
                          title="Excluir Etapa"
                          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                        >
                          <TrashIcon style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL PRÊMIUM: CRIAÇÃO / EDIÇÃO DE ETAPA ─────────────────── */}
      {modalOpen && (
        <>
          {/* Overlay com blur */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(4px)',
              zIndex: 49,
            }}
            onClick={() => setModalOpen(false)}
          />

          {/* Modal Card */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            width: '100%',
            maxWidth: 480,
            padding: '0 16px',
            boxSizing: 'border-box'
          }}>
            <form
              onSubmit={handleSave}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
                borderRadius: 20,
                boxShadow: '0 25px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.12)',
                overflow: 'hidden',
              }}
            >
              {/* Cabeçalho com Gradiente */}
              <div style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)',
                padding: '22px 28px 18px',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: -30, left: -15, width: 80, height: 80, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    🎓
                  </div>
                  <div>
                    <h2 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
                      {editingEtapa ? 'Editar Etapa de Ensino' : 'Nova Etapa de Ensino'}
                    </h2>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>
                      Estrutura curricular e pedagógica da unidade escolar
                    </p>
                  </div>
                </div>
              </div>

              {/* Corpo do Modal */}
              <div style={{ padding: '24px 28px 12px' }}>
                {error && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '16px',
                    fontWeight: 600
                  }}>
                    ⚠ {error}
                  </div>
                )}

                {/* Campo: Nome da Etapa (Listbox) */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Nome da Etapa <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.nome}
                      onChange={(e) => handleSelectNome(e.target.value)}
                      style={{
                        ...fieldStyle(false),
                        paddingRight: 36,
                        appearance: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}
                      onFocus={onFocusStyle}
                      onBlur={onBlurStyle(false)}
                    >
                      <option value="" disabled>Selecione uma etapa de ensino...</option>
                      {OPCOES_ETAPAS.map((op) => (
                        <option key={op.nome} value={op.nome}>
                          {op.nome}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280', fontSize: 12 }}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Campo: Sigla (Renderizada automaticamente) */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sigla Oficial <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, textTransform: 'none' }}>(preenchida automaticamente)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      readOnly
                      value={form.sigla}
                      placeholder="Sigla gerada automaticamente"
                      style={{
                        ...fieldStyle(false),
                        background: '#f8fafc',
                        color: '#1e293b',
                        fontWeight: 700,
                        letterSpacing: '0.8px',
                        cursor: 'default'
                      }}
                    />
                    {form.sigla && (
                      <span style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        Auto
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner Informativo */}
                <div style={{
                  padding: '10px 14px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#1e40af',
                  lineHeight: 1.5
                }}>
                  💡 Ao cadastrar a etapa, ela estará imediatamente disponível para associação com as <strong>Turmas</strong> da escola.
                </div>
              </div>

              {/* Rodapé com Botões */}
              <div style={{
                padding: '16px 28px 24px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: '1px solid #f0f0f0',
              }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '10px 22px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: 10,
                    background: '#fff',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 26px',
                    border: 'none',
                    borderRadius: 10,
                    background: saving
                      ? 'linear-gradient(135deg, #93c5fd, #67e8f9)'
                      : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #06b6d4 100%)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving ? 'wait' : 'pointer',
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(59,130,246,0.4)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(59,130,246,0.5)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = saving ? 'none' : '0 4px 14px rgba(59,130,246,0.4)'; }}
                >
                  {saving ? 'Salvando...' : editingEtapa ? 'Salvar Alterações' : 'Salvar Etapa'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── MODAL PRÊMIUM: EXCLUSÃO DE ETAPA ─────────────────────────── */}
      {deleteModalOpen && toDeleteEtapa && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(4px)',
              zIndex: 59,
            }}
            onClick={() => setDeleteModalOpen(false)}
          />

          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 60,
            width: '100%',
            maxWidth: 440,
            padding: '0 16px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 20,
              boxShadow: '0 25px 60px rgba(0,0,0,0.22)',
              overflow: 'hidden',
              border: '1px solid rgba(239,68,68,0.15)'
            }}>
              {/* Cabeçalho Vermelho com Gradiente */}
              <div style={{
                background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 60%, #f87171 100%)',
                padding: '22px 28px 18px',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    🗑️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 }}>
                      Excluir Etapa
                    </h3>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>
                      Confirmação de segurança
                    </p>
                  </div>
                </div>
              </div>

              {/* Corpo */}
              <div style={{ padding: '22px 26px 14px' }}>
                {deleteError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '16px',
                    fontWeight: 600
                  }}>
                    ⚠ {deleteError}
                  </div>
                )}

                <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: 1.5 }}>
                  Tem certeza que deseja remover a etapa{' '}
                  <strong style={{ color: '#0f172a' }}>"{toDeleteEtapa.nome}"</strong>{' '}
                  <span style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {toDeleteEtapa.sigla}
                  </span>
                  ?
                </p>

                <div style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#92400e',
                  lineHeight: 1.4
                }}>
                  🛡 <strong>Proteção:</strong> Caso esta etapa esteja associada a alguma turma ou vínculo de professor, o sistema impedirá a exclusão para manter a integridade dos seus dados.
                </div>
              </div>

              {/* Rodapé */}
              <div style={{
                padding: '16px 26px 22px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: '1px solid #f1f5f9'
              }}>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: 10,
                    background: '#fff',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteConfirmed}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: 10,
                    background: deleting
                      ? '#fca5a5'
                      : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: deleting ? 'wait' : 'pointer',
                    boxShadow: deleting ? 'none' : '0 4px 14px rgba(220,38,38,0.35)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { if (!deleting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(220,38,38,0.45)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = deleting ? 'none' : '0 4px 14px rgba(220,38,38,0.35)'; }}
                >
                  {deleting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
