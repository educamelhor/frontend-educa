import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { CheckCircleIcon, ExclamationTriangleIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';

export default function PainelConflitosNotas() {
  const [conflitos, setConflitos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('ABERTO');
  const [resolvendoId, setResolvendoId] = useState(null);

  const fetchConflitos = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/migracao-conflitos?status=${statusFiltro}`);
      setConflitos(res.data);
    } catch (err) {
      console.error('Erro ao buscar conflitos de notas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflitos();
  }, [statusFiltro]);

  const handleResolver = async (conflitoId, notaEscolhidaId) => {
    if (!window.confirm('Confirma a escolha desta nota? A nota não escolhida será movida com segurança para o arquivo histórico.')) {
      return;
    }

    try {
      setResolvendoId(conflitoId);
      await api.post(`/migracao-conflitos/${conflitoId}/resolver`, {
        nota_escolhida_id: notaEscolhidaId
      });
      fetchConflitos();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao resolver conflito.');
    } finally {
      setResolvendoId(null);
    }
  };

  const abertosCount = conflitos.filter(c => c.status === 'ABERTO').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationTriangleIcon style={{ width: '28px', height: '28px', color: '#f59e0b' }} />
            Fila de Conflitos de Notas
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Resolução de notas conflitantes entre disciplinas legadas. A nota descartada é **arquivada permanentemente** com segurança.
          </p>
        </div>

        {/* Filtro de Status */}
        <div style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          {['ABERTO', 'RESOLVIDO', 'TODOS'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFiltro(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: statusFiltro === st ? '#fff' : 'transparent',
                color: statusFiltro === st ? '#1e293b' : '#64748b',
                boxShadow: statusFiltro === st ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {st === 'ABERTO' ? 'Pendentes' : st === 'RESOLVIDO' ? 'Resolvidos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Carregando fila de conflitos...</div>
      ) : conflitos.length === 0 ? (
        <div style={{ background: '#fff', padding: '48px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <CheckCircleIcon style={{ width: '48px', height: '48px', color: '#16a34a', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Nenhum conflito encontrado!</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
            {statusFiltro === 'ABERTO' ? 'Todos os conflitos de notas já foram devidamente analisados e resolvidos.' : 'Não há registros nesta categoria.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {conflitos.map((c) => {
            const isResolvido = c.status === 'RESOLVIDO';
            return (
              <div
                key={c.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: isResolvido ? '1px solid #cbd5e1' : '1px solid #fde68a',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  overflow: 'hidden'
                }}
              >
                {/* CABEÇALHO DO CARD */}
                <div style={{ background: isResolvido ? '#f8fafc' : '#fffbeb', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                      Turma: {c.turma_nome || 'Sem turma/inativo'} • {c.bimestre}º Bimestre ({c.ano})
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
                      Aluno: {c.aluno_nome} <span style={{ color: '#64748b', fontWeight: 500 }}>(ID: {c.aluno_id})</span>
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                      Disciplina: {c.disciplina_nome}
                    </span>
                    {isResolvido && (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircleIcon style={{ width: '14px', height: '14px' }} /> Resolvido
                      </span>
                    )}
                  </div>
                </div>

                {/* CORPO DE COMPARAÇÃO DAS DUAS NOTAS */}
                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* OPÇÃO 1 */}
                  <div
                    style={{
                      border: c.nota_escolhida_id === c.nota_id_1 ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: c.nota_escolhida_id === c.nota_id_1 ? '#f0fdf4' : '#fafafa',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>OPÇÃO 1 (ID Nota: {c.nota_id_1})</span>
                        <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          Etapa: {c.nota_1_etapa || 'FUNDAMENTAL'}
                        </span>
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>
                        {c.nota_1_valor !== null ? Number(c.nota_1_valor).toFixed(2) : 'NULO'}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginLeft: '8px' }}>
                          ({c.nota_1_faltas || 0} faltas)
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', marginBotton: 0 }}>
                        Lançada em: {c.nota_1_data ? new Date(c.nota_1_data).toLocaleDateString('pt-BR') : 'Data não registrada'}
                      </p>
                    </div>

                    {!isResolvido && (
                      <button
                        onClick={() => handleResolver(c.id, c.nota_id_1)}
                        disabled={resolvendoId === c.id}
                        style={{
                          marginTop: '16px',
                          width: '100%',
                          padding: '10px',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                        Manter esta Nota (Opção 1)
                      </button>
                    )}
                  </div>

                  {/* OPÇÃO 2 */}
                  <div
                    style={{
                      border: c.nota_escolhida_id === c.nota_id_2 ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: c.nota_escolhida_id === c.nota_id_2 ? '#f0fdf4' : '#fafafa',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>OPÇÃO 2 (ID Nota: {c.nota_id_2})</span>
                        <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          Etapa: {c.nota_2_etapa || 'MÉDIO'}
                        </span>
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>
                        {c.nota_2_valor !== null ? Number(c.nota_2_valor).toFixed(2) : 'NULO'}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginLeft: '8px' }}>
                          ({c.nota_2_faltas || 0} faltas)
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', marginBotton: 0 }}>
                        Lançada em: {c.nota_2_data ? new Date(c.nota_2_data).toLocaleDateString('pt-BR') : 'Data não registrada'}
                      </p>
                    </div>

                    {!isResolvido && (
                      <button
                        onClick={() => handleResolver(c.id, c.nota_id_2)}
                        disabled={resolvendoId === c.id}
                        style={{
                          marginTop: '16px',
                          width: '100%',
                          padding: '10px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                        Manter esta Nota (Opção 2)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
