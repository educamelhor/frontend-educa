// src/features/direcao/cadastro/CadastroMembros.jsx
// ============================================================================
// Módulo DIREÇÃO → Cadastro de Membros
// O diretor faz o pré-cadastro (CPF, nome, função/perfil).
// O membro depois completa seus dados (e-mail, senha, data de nascimento)
// via tela de auto-cadastro (/cadastro).
// Estilo: tabela semelhante à Gestão de Equipe (Disciplinar/Comandante)
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";

/* ═══════════════════════════════════════════════════════════
   Constantes
   ═══════════════════════════════════════════════════════════ */
const FUNCOES = [
  { value: 'administrativo',            label: 'Administrativo' },
  { value: 'aluno',                     label: 'Aluno' },
  { value: 'apoio',                     label: 'Apoio' },
  { value: 'biblioteca',                label: 'Biblioteca' },
  { value: 'coordenacao',               label: 'Coordenação' },
  { value: 'diretor',                   label: 'Diretor' },
  { value: 'disciplinar',               label: 'Disciplinar' },
  { value: 'educador_social',           label: 'Educador Social' },
  { value: 'merenda',                   label: 'Merenda' },
  { value: 'monitor',                   label: 'Monitor' },
  { value: 'orientador',                label: 'Orientador' },
  { value: 'pedagogo',                  label: 'Pedagogo' },
  { value: 'professor',                 label: 'Professor' },
  { value: 'psicopedagogia',            label: 'Psicopedagogia' },
  { value: 'psicologo',                 label: 'Psicólogo' },
  { value: 'responsavel',               label: 'Responsável' },
  { value: 'sala_recurso',              label: 'Sala de Recurso' },
  { value: 'secretaria',                label: 'Secretaria' },
  { value: 'supervisor_administrativo', label: 'Supervisor Administrativo' },
  { value: 'supervisor_pedagogico',     label: 'Supervisor Pedagógico' },
  { value: 'vice_diretor',              label: 'Vice-Diretor' },
  { value: 'vigilancia',                label: 'Vigilância' }
];

/* ═══════════════════════════════════════════════════════════
   Utilitários de CPF
   ═══════════════════════════════════════════════════════════ */
function fmtCPF(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.replace(/(\d{3})(\d)/, "$1.$2");
  if (d.length <= 9) return d.replace(/(\d{3})(\d{3})(\d)/, "$1.$2.$3");
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4").slice(0, 14);
}

function maskCPF(v) {
  return fmtCPF(String(v || "").replace(/\D/g, ""));
}

function validarCPF(cpfRaw) {
  const digits = String(cpfRaw || "").replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(digits.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(digits.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits.charAt(10))) return false;
  return true;
}

/* ═══════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════ */
export default function CadastroMembros() {
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos"); // "todos" | "ativo" | "inativo"
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  // Modal Adicionar/Editar
  const [modalAberto, setModalAberto] = useState(false); // "adicionar" | "editar" | false
  const [editId, setEditId] = useState(null);
  const [formNome, setFormNome] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formFuncao, setFormFuncao] = useState("coordenador");
  const [formErro, setFormErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Modal Confirmar Status
  const [confirmModal, setConfirmModal] = useState(null); // { tipo, membro }
  const [executandoStatus, setExecutandoStatus] = useState(false);

  // Modal Excluir
  const [excluirModal, setExcluirModal] = useState(null); // membro
  const [executandoExcluir, setExecutandoExcluir] = useState(false);

  // Dropdown
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, flipUp: false });
  const btnRefs = useRef({});

  const escolaId = localStorage.getItem("escola_id");

  // ── Fetch ──
  useEffect(() => { fetchMembros(); }, []);

  const fetchMembros = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/direcao/cadastro?escola_id=${escolaId}`);
      setMembros(data.membros || []);
    } catch { mostrarMensagem("Erro ao carregar cadastros.", "erro"); }
    finally { setLoading(false); }
  };

  const mostrarMensagem = (texto, tipo = "ok") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  // ── Filtragem ──
  const membrosFiltrados = membros.filter(m => {
    // Filtro de status
    if (filtroStatus === "ativo" && Number(m.ativo) !== 1) return false;
    if (filtroStatus === "inativo" && Number(m.ativo) !== 0) return false;

    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (m.nome || "").toLowerCase().includes(q)
      || (m.cpf || "").includes(q)
      || fmtCPF(m.cpf).includes(q)
      || (m.funcao || "").toLowerCase().includes(q)
      || funcaoLabel(m.funcao).toLowerCase().includes(q);
  });

  // ── Stats ──
  const totalAtivos = membros.filter(m => Number(m.ativo) === 1).length;
  const totalInativos = membros.filter(m => Number(m.ativo) === 0).length;

  // ── Helpers ──
  const funcaoLabel = (f) => FUNCOES.find(x => x.value === f)?.label || f;

  const statusBadge = (m) => {
    const ativo = Number(m.ativo) === 1;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
        {ativo ? "Ativo" : "Inativo"}
      </span>
    );
  };

  const cadastroStatusBadge = (m) => {
    const completo = m.cadastro_completo;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${completo ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        {completo ? "Completo" : "Pendente"}
      </span>
    );
  };

  // ── Abrir Modal Adicionar ──
  const abrirAdicionar = () => {
    setEditId(null); setFormNome(""); setFormCpf(""); setFormFuncao("coordenador"); setFormErro("");
    setModalAberto("adicionar");
  };

  // ── Abrir Modal Editar ──
  const abrirEditar = (m) => {
    setEditId(m.id); setFormNome(m.nome); setFormCpf(m.cpf || ""); setFormFuncao(m.funcao || "coordenador"); setFormErro("");
    setMenuAberto(null);
    setModalAberto("editar");
  };

  // ── Salvar (Add / Edit) ──
  const handleSalvar = async (e) => {
    e.preventDefault();
    setFormErro("");
    if (!formNome.trim()) { setFormErro("Nome é obrigatório."); return; }
    if (modalAberto === "adicionar") {
      if (!formCpf || formCpf.replace(/\D/g, "").length < 11) { setFormErro("CPF inválido."); return; }
      if (!validarCPF(formCpf)) { setFormErro("CPF inválido. Verifique os dígitos verificadores."); return; }
    }
    setSalvando(true);
    try {
      if (modalAberto === "adicionar") {
        await api.post("/api/direcao/cadastro", {
          nome: formNome.trim(),
          cpf: formCpf.replace(/\D/g, ""),
          funcao: formFuncao,
          escola_id: Number(escolaId),
        });
        mostrarMensagem("✅ Membro pré-cadastrado com sucesso! O membro pode completar o cadastro em /cadastro.");
      } else {
        await api.put(`/api/direcao/cadastro/${editId}`, {
          nome: formNome.trim(),
          funcao: formFuncao,
        });
        mostrarMensagem("✅ Dados atualizados!");
      }
      setModalAberto(false);
      fetchMembros();
    } catch (err) {
      setFormErro(err?.response?.data?.message || "Erro ao salvar.");
    } finally { setSalvando(false); }
  };

  // ── Alterar Status ──
  const abrirConfirm = (tipo, membro) => {
    setMenuAberto(null);
    setConfirmModal({ tipo, membro });
  };

  const handleAlterarStatus = async () => {
    if (!confirmModal) return;
    setExecutandoStatus(true);
    try {
      await api.patch(`/api/direcao/cadastro/${confirmModal.membro.id}/status`, {
        status: confirmModal.tipo,
      });
      mostrarMensagem(confirmModal.tipo === "ativo"
        ? `✅ ${confirmModal.membro.nome} reativado!`
        : `⚠️ ${confirmModal.membro.nome} inativado.`
      );
      fetchMembros();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao alterar status."}`, "erro");
    } finally {
      setExecutandoStatus(false);
      setConfirmModal(null);
    }
  };

  // ── Excluir ──
  const abrirExcluir = (membro) => {
    setMenuAberto(null);
    setExcluirModal(membro);
  };

  const handleExcluir = async () => {
    if (!excluirModal) return;
    setExecutandoExcluir(true);
    try {
      await api.delete(`/api/direcao/cadastro/${excluirModal.id}`);
      mostrarMensagem(`🗑️ ${excluirModal.nome} removido com sucesso.`);
      fetchMembros();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao excluir."}`, "erro");
    } finally {
      setExecutandoExcluir(false);
      setExcluirModal(null);
    }
  };

  // ── Dropdown Position ──
  const toggleMenu = (id) => {
    if (menuAberto === id) { setMenuAberto(null); return; }
    const btn = btnRefs.current[id];
    if (btn) {
      const r = btn.getBoundingClientRect();
      const flipUp = r.bottom + 240 > window.innerHeight;
      setMenuPos({ top: flipUp ? r.top - 4 : r.bottom + 4, left: r.right - 208, flipUp });
    }
    setMenuAberto(id);
  };

  // ── UI ──
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style>{`
        @keyframes cadastroSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cadastro-animate-in { animation: cadastroSlideIn 0.3s ease-out; }
      `}</style>

      {/* ── Header Premium ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
          }}>
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cadastro de Membros</h1>
            <p className="text-slate-500 text-sm">Gerencie o pré-cadastro dos membros da escola. Eles completam o cadastro pelo sistema.</p>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          border: '1px solid #bfdbfe',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <div className="text-sm font-medium text-blue-600">Total</div>
          <div className="text-2xl font-bold text-blue-800">{membros.length}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1px solid #bbf7d0',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <div className="text-sm font-medium text-green-600">Ativos</div>
          <div className="text-2xl font-bold text-green-800">{totalAtivos}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          border: '1px solid #fecaca',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <div className="text-sm font-medium text-red-600">Inativos</div>
          <div className="text-2xl font-bold text-red-800">{totalInativos}</div>
        </div>
      </div>

      {/* Mensagem */}
      {mensagem.texto && (
        <div className={`cadastro-animate-in mb-4 px-4 py-3 rounded-lg text-sm font-medium ${mensagem.tipo === "erro" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {mensagem.texto}
        </div>
      )}

      {/* Barra top */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou função..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white" />
        </div>

        {/* Filtro de Status */}
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium">
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>

        <button onClick={abrirAdicionar}
          className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-sm whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Pré-Cadastrar Membro
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      ) : membrosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="h-12 w-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
          <p className="font-medium">Nenhum membro encontrado</p>
          <p className="text-sm mt-1">Clique em "Pré-Cadastrar Membro" para começar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">CPF</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Função (Perfil)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Cadastro</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {membrosFiltrados.map(m => {
                const isAtivo = Number(m.ativo) === 1;
                return (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{fmtCPF(m.cpf)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: isAtivo
                          ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                          : 'linear-gradient(135deg, #94a3b8, #64748b)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 14,
                        flexShrink: 0,
                      }}>
                        {(m.nome || "?")[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{m.nome}</div>
                        {m.email && <div className="text-xs text-slate-400">{m.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      {funcaoLabel(m.funcao)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{cadastroStatusBadge(m)}</td>
                  <td className="px-4 py-3">{statusBadge(m)}</td>
                  <td className="px-4 py-3 text-center">
                    <button ref={el => btnRefs.current[m.id] = el} onClick={() => toggleMenu(m.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition inline-flex">
                      <svg className="h-5 w-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
            {membrosFiltrados.length} registro{membrosFiltrados.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* ═══ DROPDOWN PORTAL ═══ */}
      {menuAberto && (() => {
        const m = membros.find(x => x.id === menuAberto);
        if (!m) return null;
        const isAtivo = Number(m.ativo) === 1;
        return (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuAberto(null)} />
            <div className="fixed z-[70] w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1"
              style={{ top: menuPos.flipUp ? undefined : menuPos.top, bottom: menuPos.flipUp ? window.innerHeight - menuPos.top : undefined, left: Math.max(8, menuPos.left) }}>
              {/* Editar */}
              <button onClick={() => abrirEditar(m)}
                className="flex items-center w-full px-4 py-2.5 text-sm gap-2 transition text-slate-700 hover:bg-slate-50">
                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                Editar
              </button>
              <div className="border-t border-slate-100 my-1" />
              {/* Inativar */}
              {isAtivo && (
                <button onClick={() => abrirConfirm("inativo", m)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Inativar
                </button>
              )}
              {/* Reativar */}
              {!isAtivo && (
                <button onClick={() => abrirConfirm("ativo", m)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  Reativar
                </button>
              )}
              <div className="border-t border-slate-100 my-1" />
              {/* Excluir */}
              <button onClick={() => abrirExcluir(m)}
                className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                Excluir
              </button>
            </div>
          </>
        );
      })()}

      {/* ═══ MODAL ADICIONAR / EDITAR ═══ */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 cadastro-animate-in">
            {/* Header  */}
            <div style={{
              background: modalAberto === "adicionar"
                ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                : 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              padding: '20px 24px',
              borderRadius: '16px 16px 0 0',
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      {modalAberto === "adicionar"
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      }
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {modalAberto === "adicionar" ? "Pré-Cadastrar Membro" : "Editar Membro"}
                  </h2>
                </div>
                <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white transition">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {modalAberto === "adicionar" && (
                <p className="mt-2 text-sm text-white/70">
                  Insira CPF, nome e função. O membro completará o cadastro autonomamente.
                </p>
              )}
            </div>

            <form onSubmit={handleSalvar} className="p-6 space-y-4">
              {formErro && (
                <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                  {formErro}
                </div>
              )}
              {modalAberto === "adicionar" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                  <input type="text" value={maskCPF(formCpf)}
                    onChange={e => setFormCpf(e.target.value.replace(/\D/g, "").slice(0, 11))} required maxLength={14}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    placeholder="000.000.000-00" inputMode="numeric" autoFocus />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nome do membro" autoFocus={modalAberto === "editar"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função (Perfil) *</label>
                <select value={formFuncao} onChange={e => setFormFuncao(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  {FUNCOES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              {/* Info box */}
              {modalAberto === "adicionar" && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Após o pré-cadastro, o membro poderá acessar <strong>/cadastro</strong> para completar seus dados (e-mail, senha, data de nascimento).
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex-1 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                  {salvando ? "Salvando..." : modalAberto === "adicionar" ? "Pré-Cadastrar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMAR STATUS ═══ */}
      {confirmModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 cadastro-animate-in">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {confirmModal.tipo === "ativo" ? "Reativar membro?" : "Inativar membro?"}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {confirmModal.tipo === "ativo"
                ? `Deseja reativar ${confirmModal.membro.nome}?`
                : `Deseja inativar ${confirmModal.membro.nome}? O acesso ao sistema será suspenso.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} disabled={executandoStatus}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Voltar</button>
              <button onClick={handleAlterarStatus} disabled={executandoStatus}
                className={`flex-1 text-white font-medium py-2.5 rounded-lg transition ${
                  confirmModal.tipo === "ativo" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"
                }`}>
                {executandoStatus ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMAR EXCLUSÃO ═══ */}
      {excluirModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 cadastro-animate-in">
            <div className="flex items-center gap-3 mb-4">
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Excluir membro?</h3>
                <p className="text-sm text-slate-500">Esta ação é permanente.</p>
              </div>
            </div>
            <div className="mb-5 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm text-red-700">
                O membro <strong>{excluirModal.nome}</strong> (CPF: {fmtCPF(excluirModal.cpf)}) será removido do sistema.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setExcluirModal(null)} disabled={executandoExcluir}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={handleExcluir} disabled={executandoExcluir}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition">
                {executandoExcluir ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
