// features/professores/conselho/ModalRegistroConselhoProfessor.jsx
// ============================================================================
// Modal de VISUALIZAÇÃO do Registro de Conselho de Classe — Perfil PROFESSOR
//
// Governança:
//  ✅ Professor pode VISUALIZAR os registros do conselho
//  ❌ Professor NÃO pode criar, editar ou excluir registros
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

  useEffect(() => {
    if (!open || !aluno?.codigo) return;
    setLoading(true);
    setErro(null);
    setRegistros([]);

    const params = { aluno_codigo: aluno.codigo };
    if (turmaId) params.turma_id = turmaId;

    api
      .get("/api/conselho/registros", { params })
      .then((res) => {
        setRegistros(Array.isArray(res.data?.registros) ? res.data.registros : []);
      })
      .catch(() => setErro("Não foi possível carregar os registros. Tente novamente."))
      .finally(() => setLoading(false));
  }, [open, aluno?.codigo, turmaId]);

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
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4"
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

          <div className="flex items-center gap-3">
            {/* Badge "Somente leitura" */}
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(251,191,36,0.15)",
                border: "1px solid rgba(251,191,36,0.35)",
                color: "#fbbf24",
              }}
            >
              👁 Somente leitura
            </span>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Conteúdo ───────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
              />
              <p className="text-blue-300 text-sm">Carregando registros...</p>
            </div>
          )}

          {erro && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              <span>⚠️</span> {erro}
            </div>
          )}

          {!loading && !erro && registros.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 text-slate-600" />
              <p className="text-slate-400 text-sm">
                Nenhum registro de conselho encontrado para este aluno.
              </p>
            </div>
          )}

          {!loading && registros.length > 0 && (
            <div className="flex flex-col gap-4">
              {registros.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(99,179,237,0.15)",
                  }}
                >
                  {/* Cabeçalho do registro */}
                  <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: "1px solid rgba(99,179,237,0.1)" }}>
                    <UserCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-semibold text-sm">
                        {reg.usuario_nome || "Usuário"}
                      </span>
                      {reg.usuario_perfil && (
                        <span
                          className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: "rgba(99,179,237,0.15)",
                            color: "#93c5fd",
                          }}
                        >
                          {reg.usuario_perfil}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <span>{formatarData(reg.criado_em)}</span>
                    </div>
                  </div>

                  {/* Texto do registro */}
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: "#cbd5e1" }}
                  >
                    {reg.texto || <em className="text-slate-500">Sem texto registrado.</em>}
                  </p>

                  {/* Editado por */}
                  {reg.editado_em && reg.editado_por_nome && (
                    <p className="mt-3 text-xs text-slate-500 italic">
                      Editado por {reg.editado_por_nome} em {formatarData(reg.editado_em)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="flex justify-end px-6 py-4"
          style={{ borderTop: "1px solid rgba(99,179,237,0.12)" }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
