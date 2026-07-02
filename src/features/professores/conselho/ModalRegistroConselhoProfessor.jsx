// features/professores/conselho/ModalRegistroConselhoProfessor.jsx
// ============================================================================
// Modal de REGISTRO de Conselho de Classe — Perfil PROFESSOR
//
// Governança:
//  ✅ Professor pode VISUALIZAR todos os registros do conselho
//  ✅ Professor pode CRIAR seu próprio registro
//  ❌ Professor NÃO pode editar registros de outros
//
// Isolado do módulo pedagógico. Alterações aqui não afetam ConselhoClasse.
// ============================================================================

import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function formatarData(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ModalRegistroConselhoProfessor({
  open,
  aluno,        // { codigo, estudante }
  turmaId,      // turma_id atual
  onClose,
}) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  // Novo registro
  const [novoTexto, setNovoTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState(null);
  const [erroSalvar, setErroSalvar] = useState(null);

  // Edição e Exclusão
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdit, setTextoEdit] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  
  const [excluindoId, setExcluindoId] = useState(null);
  const [excluindoLoad, setExcluindoLoad] = useState(false);

  const currentUserId = React.useMemo(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return 0;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return Number(payload.usuario_id || payload.usuarioId || payload.id || 0);
    } catch {
      return 0;
    }
  }, []);

  function carregarRegistros() {
    if (!aluno?.codigo) return;
    setLoading(true);
    setErro(null);

    const params = { aluno_codigo: aluno.codigo };
    if (turmaId) params.turma_id = turmaId;

    api
      .get("/api/conselho/registros", { params })
      .then((res) => {
        setRegistros(Array.isArray(res.data?.registros) ? res.data.registros : []);
      })
      .catch(() => setErro("Não foi possível carregar os registros."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!open) return;
    setNovoTexto("");
    setSucessoMsg(null);
    setErroSalvar(null);
    carregarRegistros();
    // eslint-disable-next-line
  }, [open, aluno?.codigo, turmaId]);

  async function handleSalvar() {
    if (!novoTexto.trim()) return;
    setSalvando(true);
    setErroSalvar(null);
    setSucessoMsg(null);

    try {
      await api.post("/api/conselho/registros", {
        aluno_codigo: aluno.codigo,
        turma_id: turmaId,
        texto: novoTexto.trim(),
        usuario_perfil: "professor",
      });
      setNovoTexto("");
      setSucessoMsg("Registro salvo com sucesso!");
      carregarRegistros();
      setTimeout(() => setSucessoMsg(null), 3000);
    } catch {
      setErroSalvar("Erro ao salvar o registro. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarEdicao(id) {
    if (!textoEdit.trim()) return;
    setSalvandoEdicao(true);
    try {
      await api.put(`/api/conselho/registros/${id}`, { texto: textoEdit.trim() });
      setEditandoId(null);
      carregarRegistros();
    } catch {
      alert("Erro ao editar o registro.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function handleExcluirClick(id) {
    setExcluindoId(id);
  }

  async function confirmarExclusao() {
    if (!excluindoId) return;
    setExcluindoLoad(true);
    try {
      await api.delete(`/api/conselho/registros/${excluindoId}`);
      setExcluindoId(null);
      carregarRegistros();
    } catch {
      alert("Erro ao excluir o registro.");
    } finally {
      setExcluindoLoad(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
          border: "1px solid rgba(99,179,237,0.25)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{
            background: "linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(99,179,237,0.08) 100%)",
            borderBottom: "1px solid rgba(99,179,237,0.18)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Registro de Conselho de Classe
              </h2>
              <p className="text-sm text-blue-300 font-medium">
                {aluno?.estudante || "Aluno"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* ── Registros existentes ───────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-blue-300 text-sm">Carregando registros...</p>
            </div>
          )}

          {erro && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              ⚠️ {erro}
            </div>
          )}

          {!loading && !erro && registros.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <ClipboardDocumentListIcon className="h-10 w-10 text-slate-600" />
              <p className="text-slate-400 text-sm">
                Nenhum registro encontrado. Seja o primeiro a registrar!
              </p>
            </div>
          )}

          {!loading && registros.length > 0 && (
            <div className="flex flex-col gap-3 mb-2">
              {registros.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-xl p-4 transition-all"
                  style={{
                    background: reg.excluido ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(99,179,237,0.15)",
                    opacity: reg.excluido ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2 pb-2" style={{ borderBottom: "1px solid rgba(99,179,237,0.1)" }}>
                    <UserCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <span className="text-white font-semibold text-sm flex-1 min-w-0">
                      {reg.usuario_nome || "Usuário"}
                    </span>
                    {!reg.excluido && reg.usuario_perfil && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                        style={{ background: "rgba(99,179,237,0.15)", color: "#93c5fd" }}
                      >
                        {reg.usuario_perfil}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <span>{formatarData(reg.criado_em)}</span>
                    </div>

                    {!reg.excluido && Number(reg.usuario_id) === currentUserId && (
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => {
                            setEditandoId(reg.id);
                            setTextoEdit(reg.texto);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-400 transition"
                          title="Editar Registro"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleExcluirClick(reg.id)}
                          className="p-1 text-slate-400 hover:text-red-400 transition"
                          title="Excluir Registro"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {reg.excluido ? (
                    <p className="text-sm italic" style={{ color: "#94a3b8" }}>
                      Essa mensagem foi excluída por {reg.excluido_por_nome || "um usuário"} no dia {formatarData(reg.excluido_em)}.
                    </p>
                  ) : editandoId === reg.id ? (
                    <div className="mt-2">
                      <textarea
                        value={textoEdit}
                        onChange={(e) => setTextoEdit(e.target.value)}
                        className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none transition-all mb-2"
                        rows={3}
                        style={{
                          background: "rgba(0,0,0,0.2)",
                          border: "1px solid rgba(99,179,237,0.3)",
                          color: "#f1f5f9",
                        }}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditandoId(null)}
                          className="px-3 py-1 rounded text-xs font-medium text-slate-300 hover:bg-white/10"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSalvarEdicao(reg.id)}
                          disabled={salvandoEdicao}
                          className="px-3 py-1 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                        >
                          {salvandoEdicao ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#cbd5e1" }}>
                        {reg.texto || <em className="text-slate-500">Sem texto.</em>}
                      </p>
                      {reg.editado_em && reg.editado_por_nome && (
                        <p className="mt-2 text-xs italic" style={{ color: "#64748b" }}>
                          Editado por {reg.editado_por_nome} em {formatarData(reg.editado_em)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Formulário: novo registro ──────────────────────────────────── */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(99,179,237,0.15)" }}
        >
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">
            Novo Registro
          </p>

          {sucessoMsg && (
            <div
              className="mb-3 px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.3)",
                color: "#6ee7b7",
              }}
            >
              ✅ {sucessoMsg}
            </div>
          )}

          {erroSalvar && (
            <div
              className="mb-3 px-4 py-2 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              ⚠️ {erroSalvar}
            </div>
          )}

          <textarea
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            placeholder="Escreva sua observação sobre o aluno no conselho de classe..."
            rows={3}
            className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(99,179,237,0.25)",
              color: "#f1f5f9",
              caretColor: "#60a5fa",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(99,179,237,0.6)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(99,179,237,0.25)")}
          />

          <div className="flex justify-end gap-3 mt-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Fechar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando || !novoTexto.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: salvando || !novoTexto.trim()
                  ? "rgba(59,130,246,0.3)"
                  : "linear-gradient(135deg, #2563eb, #0891b2)",
                boxShadow: novoTexto.trim() ? "0 4px 14px rgba(37,99,235,0.35)" : "none",
              }}
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar Registro"}
            </button>
          </div>
        </div>
      </div>

      {excluindoId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700 p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <TrashIcon className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Excluir Registro?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Esta ação removerá o conteúdo da sua mensagem. A exclusão ficará registrada no histórico.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setExcluindoId(null)}
                disabled={excluindoLoad}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={excluindoLoad}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition disabled:opacity-50"
              >
                {excluindoLoad ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
