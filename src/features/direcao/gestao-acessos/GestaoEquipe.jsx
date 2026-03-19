import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";

/* ═══════════════════════════════════════════════════════════
   Gestão de Equipe — Diretor Disciplinar (Comandante)
   Permite gerenciar monitores, inspetores e demais membros
   da equipe disciplinar da escola.
   ═══════════════════════════════════════════════════════════ */

const FUNCOES = [
  { value: "subcomandante_disciplinar", label: "Subcomandante Disciplinar" },
  { value: "supervisor_disciplinar", label: "Supervisor Disciplinar" },
  { value: "monitor_disciplinar", label: "Monitor Disciplinar" },
];

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

export default function GestaoEquipe() {
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  // Modal Adicionar/Editar
  const [modalAberto, setModalAberto] = useState(false); // "adicionar" | "editar" | false
  const [editId, setEditId] = useState(null);
  const [formNome, setFormNome] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formFuncao, setFormFuncao] = useState("monitor_disciplinar");
  const [formErro, setFormErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Modal Confirmar Status
  const [confirmModal, setConfirmModal] = useState(null); // { tipo, membro }
  const [executandoStatus, setExecutandoStatus] = useState(false);

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
      const { data } = await api.get(`/api/direcao/equipe?escola_id=${escolaId}`);
      setMembros(data.membros || []);
    } catch { mostrarMensagem("Erro ao carregar equipe.", "erro"); }
    finally { setLoading(false); }
  };

  const mostrarMensagem = (texto, tipo = "ok") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  // ── Filtragem ──
  const membrosFiltrados = membros.filter(m => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (m.nome || "").toLowerCase().includes(q)
      || (m.cpf || "").includes(q)
      || (m.funcao || "").toLowerCase().includes(q)
      || (m.email || "").toLowerCase().includes(q);
  });

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

  // ── Abrir Modal Adicionar ──
  const abrirAdicionar = () => {
    setEditId(null); setFormNome(""); setFormCpf(""); setFormEmail(""); setFormFuncao("monitor_disciplinar"); setFormErro("");
    setModalAberto("adicionar");
  };

  // ── Abrir Modal Editar ──
  const abrirEditar = (m) => {
    setEditId(m.id); setFormNome(m.nome); setFormCpf(m.cpf || ""); setFormEmail(m.email || "");
    setFormFuncao(m.funcao || "monitor_disciplinar"); setFormErro("");
    setMenuAberto(null);
    setModalAberto("editar");
  };

  // ── Salvar (Add / Edit) ──
  const handleSalvar = async (e) => {
    e.preventDefault();
    setFormErro("");
    if (!formNome.trim()) { setFormErro("Nome é obrigatório."); return; }
    if (!formCpf || formCpf.replace(/\D/g, "").length < 11) { setFormErro("CPF inválido."); return; }
    if (!validarCPF(formCpf)) { setFormErro("CPF inválido. Verifique os dígitos verificadores."); return; }
    setSalvando(true);
    try {
      if (modalAberto === "adicionar") {
        await api.post("/api/direcao/equipe", {
          nome: formNome.trim(),
          cpf: formCpf.replace(/\D/g, ""),
          email: formEmail.trim() || null,
          funcao: formFuncao,
          escola_id: Number(escolaId),
        });
        mostrarMensagem("✅ Membro adicionado com sucesso!");
      } else {
        await api.put(`/api/direcao/equipe/${editId}`, {
          nome: formNome.trim(),
          email: formEmail.trim() || null,
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
      await api.patch(`/api/direcao/equipe/${confirmModal.membro.id}/status`, {
        status: confirmModal.tipo,
      });
      mostrarMensagem(confirmModal.tipo === "ativo"
        ? `✅ ${confirmModal.membro.nome} reativado!`
        : `⚠️ ${confirmModal.membro.nome} ${confirmModal.tipo === "bloqueado" ? "bloqueado" : "cancelado"}.`
      );
      fetchMembros();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao alterar status."}`, "erro");
    } finally {
      setExecutandoStatus(false);
      setConfirmModal(null);
    }
  };

  // ── Dropdown Position ──
  const toggleMenu = (id) => {
    if (menuAberto === id) { setMenuAberto(null); return; }
    const btn = btnRefs.current[id];
    if (btn) {
      const r = btn.getBoundingClientRect();
      const flipUp = r.bottom + 200 > window.innerHeight;
      setMenuPos({ top: flipUp ? r.top - 4 : r.bottom + 4, left: r.right - 208, flipUp });
    }
    setMenuAberto(id);
  };

  // ── UI ──
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Equipe</h1>
        <p className="text-slate-500 mt-1">Gerencie os membros da equipe disciplinar da escola.</p>
      </div>

      {/* Mensagem */}
      {mensagem.texto && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${mensagem.tipo === "erro" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
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
            placeholder="Buscar por nome, CPF, função ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white" />
        </div>
        <button onClick={abrirAdicionar}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-sm whitespace-nowrap">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Adicionar
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
          <p className="text-sm mt-1">Clique em "+ Adicionar" para cadastrar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">CPF</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Função</th>
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
                    <div className="font-medium text-slate-800">{m.nome}</div>
                    {m.email && <div className="text-xs text-slate-400">{m.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      {funcaoLabel(m.funcao)}
                    </span>
                  </td>
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
            <div className="fixed z-[70] w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1"
              style={{ top: menuPos.flipUp ? undefined : menuPos.top, bottom: menuPos.flipUp ? window.innerHeight - menuPos.top : undefined, left: Math.max(8, menuPos.left) }}>
              {/* Editar */}
              <button onClick={() => abrirEditar(m)} disabled={!isAtivo}
                className={`flex items-center w-full px-4 py-2.5 text-sm gap-2 transition ${isAtivo ? "text-slate-700 hover:bg-slate-50" : "text-slate-400 cursor-not-allowed"}`}>
                <svg className={`h-4 w-4 ${isAtivo ? "text-blue-500" : "text-slate-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                Editar
              </button>
              <div className="border-t border-slate-100 my-1" />
              {/* Bloquear */}
              {isAtivo && (
                <button onClick={() => abrirConfirm("bloqueado", m)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Bloquear
                </button>
              )}
              {/* Reativar */}
              {!isAtivo && (
                <button onClick={() => abrirConfirm("ativo", m)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Reativar
                </button>
              )}
              {/* Cancelar */}
              {isAtivo && (
                <button onClick={() => abrirConfirm("cancelado", m)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Cancelar
                </button>
              )}
            </div>
          </>
        );
      })()}

      {/* ═══ MODAL ADICIONAR / EDITAR ═══ */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {modalAberto === "adicionar" ? "Adicionar Membro" : "Editar Membro"}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSalvar} className="p-6 space-y-4">
              {formErro && (
                <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                  {formErro}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nome do membro" autoFocus />
              </div>
              {modalAberto === "adicionar" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                  <input type="text" value={maskCPF(formCpf)}
                    onChange={e => setFormCpf(e.target.value.replace(/\D/g, "").slice(0, 11))} required maxLength={14}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    placeholder="000.000.000-00" inputMode="numeric" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="email@exemplo.com (opcional)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função *</label>
                <select value={formFuncao} onChange={e => setFormFuncao(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  {FUNCOES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvando ? "Salvando..." : modalAberto === "adicionar" ? "Adicionar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMAR STATUS ═══ */}
      {confirmModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {confirmModal.tipo === "cancelado" ? "Cancelar membro?" : confirmModal.tipo === "bloqueado" ? "Bloquear membro?" : "Reativar membro?"}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {confirmModal.tipo === "cancelado"
                ? `Deseja cancelar o acesso de ${confirmModal.membro.nome}?`
                : confirmModal.tipo === "bloqueado"
                ? `Deseja bloquear temporariamente ${confirmModal.membro.nome}?`
                : `Deseja reativar ${confirmModal.membro.nome}?`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} disabled={executandoStatus}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Voltar</button>
              <button onClick={handleAlterarStatus} disabled={executandoStatus}
                className={`flex-1 text-white font-medium py-2.5 rounded-lg transition ${
                  confirmModal.tipo === "cancelado" ? "bg-red-600 hover:bg-red-700"
                  : confirmModal.tipo === "bloqueado" ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-600 hover:bg-green-700"
                }`}>
                {executandoStatus ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
