// src/features/secretaria/professores/ListaProfessores.jsx
// ============================================================================
// Lista de Professores (Secretaria)
// - Exibe, filtra, inclui, edita e exclui professores.
// - Agora inclui a coluna e a busca por **Turno**.
// - Mantida a integração com ProfessorForm (o Turno já foi adicionado no form).
// ============================================================================

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';
import Modal from '../../../components/ui/Modal';
import ProfessorForm from '../professores/ProfessorForm';
import { PencilSquareIcon } from "@heroicons/react/24/solid";

// Util: formata CPF 000.000.000-00
function formatarCPF(cpf = "") {
  const d = String(cpf).replace(/\D/g, "").padStart(11, "0");
  if (d.length !== 11) return cpf;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// ─────────────────────────────────────────────────────────────
export default function ListaProfessores() {
  // Estados principais
  const [professores, setProfessores] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toDelete, setToDelete]         = useState(null);
  const [editingProfessor, setEditingProfessor] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Carrega professores e disciplinas
  useEffect(() => {
    async function loadAll() {
      const [pRes, dRes] = await Promise.all([
        api.get('/api/professores'),
        api.get('/api/disciplinas'),
      ]);
      setProfessores(pRes.data);
      setDisciplinas(dRes.data);
      setLoading(false);
    }
    loadAll();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Utilidades para filtro
  const normalize = (str = "") =>
    str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const term = normalize(search);

  // (Reservado) Distância de Levenshtein – útil em validações futuras
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  // ─────────────────────────────────────────────────────────────
  // Salvar (incluir/editar)
  async function handleSaveProfessor(dados) {
    setLoading(true);
    try {
      // Evita duplicidade exata de CPF + DISCIPLINA
      const conflito = professores.find((p) => {
        if (dados.id && p.id === dados.id) return false; // ignora o próprio
        return p.cpf === dados.cpf && String(p.disciplina_id) === String(dados.disciplina_id);
      });

      if (conflito) {
        alert("⚠️ Já existe um professor com este CPF para essa disciplina.");
        setLoading(false);
        return false;
      }

      if (dados.id) {
        await api.put(`/api/professores/${dados.id}`, dados);
      } else {
        await api.post('/api/professores', dados);
      }

      const { data } = await api.get('/api/professores');
      setProfessores(data);

      setSuccessMessage('✅ Professor cadastrado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setIsFormOpen(false);
      return true;
    } catch (err) {
      console.error("Erro ao salvar professor:", err.response?.data || err.message);
      alert("Erro ao salvar. Tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Exclusão
  function confirmDelete(prof) {
    setToDelete(prof);
  }

  async function handleDeleteConfirmed() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/professores/${toDelete.id}`);
      const { data } = await api.get('/api/professores');
      setProfessores(data);

      setSuccessMessage('✅ Professor excluído com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao excluir professor.';
      alert(`Falha na operação: ${msg}`);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  // helper: nome da disciplina
  function getDiscLabel(prof) {
    const disc = disciplinas.find(d => d.id === prof.disciplina_id);
    return disc ? (disc.disciplina ?? disc.nome) : '—';
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Cadastro de Professores</h2>

      {loading && <p className="text-gray-600">Carregando professores...</p>}

      {!loading && (
        <>
          {/* Ações superiores: Adicionar + Busca */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Adicionar Professor
            </button>

            <input
              type="text"
              placeholder="🔍 Filtrar por CPF, Nome, Turno ou Disciplina"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded p-2 w-80 placeholder-gray-500"
            />
          </div>

          {/* Banner de sucesso */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              {successMessage}
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse mt-4">
              <thead className="bg-blue-100">
                <tr>
                  <th className="p-2 border text-center font-medium text-blue-900">CPF</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Nome</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Data Nasc.</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Sexo</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Turno</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Disciplina</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Aulas</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {professores
                  .filter(p => {
                    const cpfMatch   = (p.cpf || "").includes(search);
                    const nomeMatch  = normalize(p.nome).includes(term);
                    const turnoMatch = normalize(p.turno || "").includes(term);
                    const discObj    = disciplinas.find(d => d.id === p.disciplina_id);
                    const discName   = discObj ? (discObj.disciplina ?? discObj.nome) : '';
                    const discMatch  = normalize(discName).includes(term);
                    return cpfMatch || nomeMatch || turnoMatch || discMatch;
                  })
                  .map(p => {
                    const discLabel = getDiscLabel(p);
                    return (
                      <tr key={p.id} className="hover:bg-blue-50">
                        <td className="p-2 border text-center">{formatarCPF(p.cpf)}</td>
                        <td className="p-2 border uppercase">{p.nome}</td>
                        <td className="p-2 border text-center">
                          {p.data_nascimento
                            ? new Date(p.data_nascimento).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="p-2 border text-center">{p.sexo}</td>
                        <td className="p-2 border text-center uppercase">{(p.turno || '—')}</td>
                        <td className="p-2 border text-center uppercase">{discLabel}</td>
                        <td className="p-2 border text-center">{p.aulas}</td>
                        <td className="p-2 border text-center space-x-2">
                          {/* Editar */}
                          <button
                            onClick={() => {
                              setEditingProfessor(p);
                              setIsFormOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => confirmDelete(p)}
                            className="inline p-1 hover:bg-red-100 rounded"
                          >
                            <TrashIcon className="h-5 w-5 text-red-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal: Formulário */}
      <Modal open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <ProfessorForm
          open={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProfessor(null);
          }}
          onSubmit={handleSaveProfessor}
          professor={editingProfessor}
        />
      </Modal>

      {/* ================================================================
          MODAL PREMIUM: Confirmação de Exclusão de Professor
          ================================================================ */}
      {!!toDelete && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleting && setToDelete(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '95%',
              maxWidth: 480,
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(160deg, #fff 60%, #fef2f2 100%)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(220,38,38,0.15)',
              animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* ── CSS animation via style tag ── */}
            <style>{`
              @keyframes modalSlideIn {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes pulseRing {
                0%   { transform: scale(0.8); opacity: 0; }
                50%  { opacity: 0.4; }
                100% { transform: scale(1.5); opacity: 0; }
              }
              @keyframes spinDelete {
                to { transform: rotate(360deg); }
              }
            `}</style>

            {/* ── Header com gradiente de perigo ── */}
            <div style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              padding: '28px 24px 24px',
              textAlign: 'center',
              position: 'relative',
            }}>
              {/* Ícone animado */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                <div style={{
                  position: 'absolute', inset: -8,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  animation: 'pulseRing 2s ease-out infinite',
                }} />
                <div style={{
                  width: 56, height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>
                  ⚠️
                </div>
              </div>
              <h3 style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.01em',
              }}>
                Excluir Professor
              </h3>
              <p style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: 13,
                margin: '6px 0 0',
              }}>
                Esta ação é irreversível
              </p>
            </div>

            {/* ── Corpo ── */}
            <div style={{ padding: '24px 24px 20px' }}>
              <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                Tem certeza que deseja excluir permanentemente o professor abaixo?
              </p>

              {/* Card com dados do professor */}
              <div style={{
                marginTop: 16,
                padding: '14px 16px',
                borderRadius: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #dc2626, #f87171)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 18,
                    flexShrink: 0,
                  }}>
                    {(toDelete.nome || '?')[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontWeight: 700, color: '#1f2937', fontSize: 15,
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {toDelete.nome}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>
                      CPF: {formatarCPF(toDelete.cpf)}
                      {toDelete.turno ? ` · ${toDelete.turno.toUpperCase()}` : ''}
                      {getDiscLabel(toDelete) !== '—' ? ` · ${getDiscLabel(toDelete)}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Aviso sobre dados relacionados */}
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 10,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <span style={{ fontSize: 16, lineHeight: '20px' }}>💡</span>
                <p style={{ color: '#92400e', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  Serão removidos também os registros de <strong>modulação</strong> e <strong>preferências de horário</strong> vinculados a este professor.
                </p>
              </div>
            </div>

            {/* ── Footer com botões ── */}
            <div style={{
              padding: '0 24px 24px',
              display: 'flex', gap: 12, justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setToDelete(null)}
                disabled={deleting}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: deleting ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!deleting) { e.target.style.background = '#f3f4f6'; e.target.style.borderColor = '#9ca3af'; }}}
                onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#d1d5db'; }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                style={{
                  padding: '10px 28px',
                  borderRadius: 10,
                  border: 'none',
                  background: deleting
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: deleting ? 'none' : '0 4px 14px rgba(220,38,38,0.4)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!deleting) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(220,38,38,0.5)'; }}}
                onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(220,38,38,0.4)'; }}
              >
                {deleting ? (
                  <>
                    <span style={{
                      width: 16, height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spinDelete 0.6s linear infinite',
                    }} />
                    Excluindo...
                  </>
                ) : (
                  'Sim, Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

