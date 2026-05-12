import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/solid';
import DisciplinaForm from './DisciplinaForm';
import { PencilSquareIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

// ── Cores dos badges de etapa ────────────────────────────────────────────────
const ETAPA_STYLE = {
  INFANTIL:    { background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' },
  FUNDAMENTAL: { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
  'MÉDIO':     { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  GERAL:       { background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' },
};

// ── Cores dos badges de turno ─────────────────────────────────────────────────
const TURNO_STYLE = {
  DIURNO:     { background: '#f0f9ff', color: '#0369a1', border: '1px solid #7dd3fc' },
  INTEGRAL:   { background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d' },
  MATUTINO:   { background: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7' },
  VESPERTINO: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd' },
  NOTURNO:    { background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #4338ca' },
};

function EtapaBadge({ etapa }) {
  const st = ETAPA_STYLE[etapa?.toUpperCase()] || ETAPA_STYLE.GERAL;
  const label = etapa
    ? etapa.charAt(0).toUpperCase() + etapa.slice(1).toLowerCase()
    : 'Geral';
  return (
    <span style={{ ...st, display:'inline-block', padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
      {label}
    </span>
  );
}

function TurnoBadge({ turno }) {
  const TURNO_LABELS = { DIURNO:'Diurno', INTEGRAL:'Integral', MATUTINO:'Matutino', VESPERTINO:'Vespertino', NOTURNO:'Noturno' };
  const st = TURNO_STYLE[turno?.toUpperCase()] || TURNO_STYLE.INTEGRAL;
  return (
    <span style={{ ...st, display:'inline-block', padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
      {TURNO_LABELS[turno?.toUpperCase()] || turno || 'Integral'}
    </span>
  );
}

// ── Helpers de comparação de nomes ───────────────────────────────────────────
function normalizeStr(str = '') {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[\s_\-]/g, '');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ─────────────────────────────────────────────────────────────
export default function ListaDisciplinas() {
  const [disciplinas, setDisciplinas]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [isFormOpen, setFormOpen]       = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toDeleteDisciplina, setToDeleteDisciplina] = useState(null);
  const [editingDisciplina, setEditingDisciplina]   = useState(null);

  // ── Modal de confirmação de similaridade ──────────────────────────────────
  const [similarModal, setSimilarModal] = useState(null);
  // similarModal = { dadosPendentes, nomeExistente, mensagem } | null

// ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await api.get('/api/disciplinas');
      setDisciplinas(data);
      setLoading(false);
    }
    load();
  }, []);


// ─────────────────────────────────────────────────────────────
  const normalize = (str = '') =>
    str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const term = normalize(search).trim();

  // Aliases: permite digitar abreviações ou variações comuns
  const ETAPA_ALIASES = {
    'infantil': 'infantil',
    'fund': 'fundamental', 'fundamental': 'fundamental',
    'medio': 'medio', 'médio': 'medio', 'ensino medio': 'medio',
    'geral': 'geral',
  };
  const TURNO_ALIASES = {
    'diurno': 'diurno',
    'integral': 'integral', 'int': 'integral',
    'mat': 'matutino', 'matutino': 'matutino', 'manha': 'matutino', 'manhã': 'matutino',
    'vesp': 'vespertino', 'vespertino': 'vespertino', 'tarde': 'vespertino',
    'not': 'noturno', 'noturno': 'noturno', 'noite': 'noturno',
  };

  const matchesDisciplina = (d) => {
    if (!term) return true;
    const nome   = normalize(d.disciplina ?? d.nome ?? '');
    const etapa  = normalize(d.etapa ?? '');
    const turno  = normalize(d.turno ?? '');
    // Verifica nome direto
    if (nome.includes(term)) return true;
    // Verifica etapa (valor bruto + aliases)
    if (etapa.includes(term)) return true;
    if (ETAPA_ALIASES[term] && etapa.includes(ETAPA_ALIASES[term])) return true;
    // Verifica turno (valor bruto + aliases)
    if (turno.includes(term)) return true;
    if (TURNO_ALIASES[term] && turno.includes(TURNO_ALIASES[term])) return true;
    return false;
  };

// ─────────────────────────────────────────────────────────────

  // ── Executa o save real no backend ───────────────────────────────────────
  const _executarSave = async (dados) => {
    if (dados.id) {
      await api.put(`/api/disciplinas/${dados.id}`, dados);
    } else {
      await api.post('/api/disciplinas', dados);
    }
    const { data } = await api.get('/api/disciplinas');
    setDisciplinas(data);
    setSuccessMessage('✅ Disciplina salva com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
    setFormOpen(false);
    setEditingDisciplina(null);
  };

  // ── Verifica similaridade e salva (ou abre modal de confirmação) ──────────
  const handleSaveDisciplina = async (dados) => {
    setLoading(true);
    try {
      const nomeOriginal = dados.nome ?? dados.disciplina ?? '';
      const nomeNovo     = normalizeStr(nomeOriginal);
      const etapaNova    = (dados.etapa  ?? 'GERAL').toUpperCase();
      const turnoNovo    = (dados.turno  ?? 'INTEGRAL').toUpperCase();

      for (const d of disciplinas) {
        if (dados.id && d.id === dados.id) continue;

        const nomeExistente  = normalizeStr(d.nome ?? d.disciplina ?? '');
        const etapaExistente = (d.etapa  ?? 'GERAL').toUpperCase();
        const turnoExistente = (d.turno  ?? 'INTEGRAL').toUpperCase();

        if (etapaNova !== etapaExistente || turnoNovo !== turnoExistente) continue;

        // Regra 1: nome EXATAMENTE igual → bloqueia + sugere numeração
        if (nomeNovo === nomeExistente) {
          const base   = nomeOriginal.trim().replace(/\d+$/, '');
          const usados = disciplinas
            .filter(x => normalizeStr(x.nome ?? x.disciplina ?? '').replace(/\d+$/, '') === normalizeStr(base)
              && (x.etapa  ?? 'GERAL').toUpperCase()     === etapaNova
              && (x.turno  ?? 'INTEGRAL').toUpperCase()  === turnoNovo)
            .map(x => parseInt((x.nome ?? x.disciplina ?? '').match(/\d+$/)?.[0] ?? '0', 10))
            .filter(n => n > 0);
          const proximo = usados.length ? Math.max(...usados) + 1 : 1;
          setSimilarModal({
            tipo: 'exato',
            dadosPendentes: null,
            nomeExistente: d.nome || d.disciplina,
            sugestao: `${base.trim()}${proximo}`,
            mensagem: `Já existe "${d.nome || d.disciplina}" nesta etapa e turno.`,
          });
          setLoading(false);
          return false;
        }

        // Regra 2: mesma base + mesmo número (ex: PCA1 == PCA1) → bloqueia
        const baseNovo      = nomeNovo.replace(/\d+$/, '');
        const baseExistente = nomeExistente.replace(/\d+$/, '');
        if (baseNovo === baseExistente) {
          const numNovo  = nomeNovo.match(/\d+$/)?.[0];
          const numExist = nomeExistente.match(/\d+$/)?.[0];
          if (numNovo && numNovo === numExist) {
            setSimilarModal({
              tipo: 'exato',
              dadosPendentes: null,
              nomeExistente: d.nome || d.disciplina,
              sugestao: null,
              mensagem: `Já existe "${d.nome || d.disciplina}" com o mesmo número nesta etapa e turno.`,
            });
            setLoading(false);
            return false;
          }
        }

        // Regra 3: nome similar (Levenshtein ≤ 2) → abre modal de confirmação
        const dist = levenshtein(nomeNovo, nomeExistente);
        if (dist > 0 && dist <= 2) {
          setSimilarModal({
            tipo: 'similar',
            dadosPendentes: dados,
            nomeExistente: d.nome || d.disciplina,
            sugestao: null,
            mensagem: `O nome "${nomeOriginal.trim()}" é muito parecido com "${d.nome || d.disciplina}" (mesma etapa/turno).`,
          });
          setLoading(false);
          return false;
        }
      }

      await _executarSave(dados);
      return true;
    } catch (err) {
      console.error(err);
      setSimilarModal({
        tipo: 'exato', dadosPendentes: null, nomeExistente: '', sugestao: null,
        mensagem: err?.response?.data?.message || err?.response?.data?.error || 'Erro ao salvar disciplina.',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarSimilar = async () => {
    if (!similarModal?.dadosPendentes) { setSimilarModal(null); return; }
    setLoading(true);
    const pendente = similarModal.dadosPendentes;
    setSimilarModal(null);
    try {
      await _executarSave(pendente);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao salvar disciplina.';
      setSimilarModal({
        tipo: 'exato', dadosPendentes: null, nomeExistente: '', sugestao: null,
        mensagem: msg,
      });
    } finally {
      setLoading(false);
    }
  };

// ─────────────────────────────────────────────────────────────
  async function handleDeleteDisciplinaConfirmed() {


  if (!toDeleteDisciplina) return;
  setLoading(true);
  try {
    await api.delete(`/api/disciplinas/${toDeleteDisciplina.id}`);
    const { data } = await api.get("/api/disciplinas");
    setDisciplinas(data);
    setSuccessMessage("✅ Disciplina excluída com sucesso!");
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err) {
    console.error(err);
    const msgBackend = err?.response?.data?.message;
    alert(msgBackend || "Erro ao excluir disciplina.");
  } finally {
    setLoading(false);
    setToDeleteDisciplina(null);
  }
}


// ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Cadastro de Disciplinas</h2>

      {loading && <p className="text-gray-600">Carregando disciplinas...</p>}

      {!loading && (
        <>
          {/* Botão e campo de busca */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Adicionar Disciplina
            </button>

            <input
              type="text"
              placeholder="🔍 Disciplina, Etapa ou Turno..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded p-2 w-80 placeholder-gray-500"
            />
          </div>



          {/* BANNER DE SUCESSO */}
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
                  <th className="p-2 border text-center font-medium text-blue-900">Disciplina</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Etapa</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Turno</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Carga</th>
                  <th className="p-2 border text-center font-medium text-blue-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {disciplinas
                  .filter(matchesDisciplina)
                  .map(d => (
                    <tr key={d.id} className="hover:bg-blue-50">
                      <td className="p-2 border text-center uppercase">{d.disciplina}</td>
                      <td className="p-2 border text-center">
                        <EtapaBadge etapa={d.etapa} />
                      </td>
                      <td className="p-2 border text-center">
                        <TurnoBadge turno={d.turno} />
                      </td>
                      <td className="p-2 border text-center">{d.carga}</td>
                      <td className="p-2 border text-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingDisciplina(d);
                            setFormOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => setToDeleteDisciplina(d)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal de cadastro — DisciplinaForm gerencia seu próprio overlay premium */}
      {isFormOpen && (
        <DisciplinaForm
          open={isFormOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingDisciplina(null);
          }}
          onSubmit={handleSaveDisciplina}
          disciplina={editingDisciplina}
        />
      )}


      {/* Modal de exclusão */}
      {!!toDeleteDisciplina && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black opacity-30"
              onClick={() => setToDeleteDisciplina(null)}
            />
            <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full z-50">
              <div className="p-2 space-y-4">
                <h3 className="text-lg font-semibold">Confirmação</h3>
                <p>
                  Tem certeza que deseja excluir a disciplina{" "}
                  <strong>{toDeleteDisciplina?.disciplina}</strong>
                  {(toDeleteDisciplina?.etapa || toDeleteDisciplina?.turno) && (
                    <> (<EtapaBadge etapa={toDeleteDisciplina.etapa} /> <TurnoBadge turno={toDeleteDisciplina.turno} />)</>
                  )}
                  ?
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setToDeleteDisciplina(null)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Não
                  </button>
                  <button
                    onClick={handleDeleteDisciplinaConfirmed}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Sim, excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal de similaridade ────────────────────────────────────────────── */}
      {!!similarModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, maxWidth: 440, width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          }}>
            {/* Cabeçalho */}
            <div style={{
              background: similarModal.tipo === 'exato'
                ? 'linear-gradient(135deg,#dc2626,#f87171)'
                : 'linear-gradient(135deg,#d97706,#fbbf24)',
              padding: '18px 22px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700 }}>
                  {similarModal.tipo === 'exato' ? 'Disciplina já cadastrada' : 'Nome semelhante detectado'}
                </h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>
                  {similarModal.tipo === 'exato' ? 'Conflito de nome' : 'Confirme se são disciplinas distintas'}
                </p>
              </div>
            </div>

            {/* Corpo */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                {similarModal.mensagem}
              </p>

              {similarModal.sugestao && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #86efac',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>
                    💡 Sugestão: use <strong>"{similarModal.sugestao}"</strong> para diferenciá-la
                  </p>
                </div>
              )}

              {similarModal.tipo === 'similar' && (
                <div style={{
                  background: '#fffbeb', border: '1px solid #fcd34d',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
                    ⚠️ Se <strong>PCA</strong> e <strong>"{similarModal.nomeExistente}"</strong> são disciplinas diferentes
                    (ex: siglas distintas), clique em <em>"São distintas, criar mesmo assim"</em>.
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div style={{
              padding: '12px 24px 20px',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              borderTop: '1px solid #f0f0f0',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={() => setSimilarModal(null)}
                style={{
                  padding: '9px 20px', border: '1.5px solid #d1d5db',
                  borderRadius: 10, background: '#fff', color: '#374151',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {similarModal.tipo === 'exato' ? 'Entendido' : 'Cancelar'}
              </button>

              {similarModal.tipo === 'similar' && similarModal.dadosPendentes && (
                <button
                  onClick={handleConfirmarSimilar}
                  style={{
                    padding: '9px 20px', border: 'none', borderRadius: 10,
                    background: 'linear-gradient(135deg,#d97706,#f59e0b)',
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(217,119,6,0.35)',
                  }}
                >
                  São distintas, criar mesmo assim
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}