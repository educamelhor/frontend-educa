import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ListaEtapas() {
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState(null);
  const [form, setForm] = useState({ nome: '', sigla: '', ordem: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchEtapas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/etapas');
      setEtapas(res.data);
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
      setForm({ nome: etp.nome, sigla: etp.sigla || '', ordem: etp.ordem || 1 });
    } else {
      setEditingEtapa(null);
      setForm({ nome: '', sigla: '', ordem: etapas.length + 1 });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setError('O nome da etapa é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      if (editingEtapa) {
        await api.put(`/etapas/${editingEtapa.id}`, form);
      } else {
        await api.post('/etapas', form);
      }
      setModalOpen(false);
      fetchEtapas();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar etapa.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtiva = async (etp) => {
    try {
      await api.put(`/etapas/${etp.id}`, {
        nome: etp.nome,
        sigla: etp.sigla,
        ordem: etp.ordem,
        ativa: etp.ativa ? 0 : 1
      });
      fetchEtapas();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao alterar status da etapa.');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Gestão de Etapas de Ensino</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Cadastre e organize as etapas de ensino (Fundamental, Médio, EJA, Integrais, etc.) para vincular às turmas.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563eb',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
          }}
        >
          <PlusIcon style={{ width: '18px', height: '18px' }} />
          Nova Etapa
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando etapas...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px', width: '60px' }}>Ordem</th>
                <th style={{ padding: '12px 16px' }}>Nome da Etapa</th>
                <th style={{ padding: '12px 16px' }}>Sigla</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {etapas.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Nenhuma etapa cadastrada.</td>
                </tr>
              ) : (
                etapas.map((etp) => (
                  <tr key={etp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#334155' }}>{etp.ordem}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{etp.nome}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        {etp.sigla || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        onClick={() => handleToggleAtiva(etp)}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: etp.ativa ? '#dcfce7' : '#fee2e2',
                          color: etp.ativa ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {etp.ativa ? <CheckIcon style={{ width: '14px', height: '14px' }} /> : <XMarkIcon style={{ width: '14px', height: '14px' }} />}
                        {etp.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenModal(etp)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          padding: '6px'
                        }}
                        title="Editar Etapa"
                      >
                        <PencilIcon style={{ width: '18px', height: '18px' }} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              {editingEtapa ? 'Editar Etapa' : 'Nova Etapa de Ensino'}
            </h2>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Nome da Etapa *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Fundamental, Médio, EJA..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Sigla</label>
                  <input
                    type="text"
                    value={form.sigla}
                    onChange={(e) => setForm({ ...form, sigla: e.target.value })}
                    placeholder="Ex: FUND, MED"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Ordem de Exibição</label>
                  <input
                    type="number"
                    value={form.ordem}
                    onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {saving ? 'Salvando...' : 'Salvar Etapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
