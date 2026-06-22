// features/professores/conselho/ModalFichaConselhoClasse.jsx
// ============================================================================
// Modal de registros do Conselho de Classe para um aluno — perfil PROFESSOR.
//
// Abre via EyeIcon na tabela de alunos do ConselhoClasProfessor.
// Exibe os registros já lançados para o aluno naquela turma e permite
// que o professor adicione novos registros de texto livre.
//
// API utilizada:
//  GET  /api/conselho/registros?aluno_codigo=&turma_id=
//  POST /api/conselho/registros  { aluno_codigo, turma_id, texto }
//
// Governança:
//  ✅ Professor lê todos os registros do aluno na turma
//  ✅ Professor adiciona novo registro (texto livre)
//  ✅ Professor edita apenas seus próprios registros
//  ❌ Edição/exclusão de registros de outros — não permitida
// ============================================================================
import React, { useState, useEffect } from "react";
import { XMarkIcon, PencilSquareIcon, CheckIcon } from "@heroicons/react/24/outline";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";

export default function ModalFichaConselhoClasse({ open, aluno, turma, onClose }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novoTexto, setNovoTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoTexto, setEditandoTexto] = useState("");

  useEffect(() => {
    if (open && aluno?.codigo) {
      fetchRegistros();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, aluno]);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const params = { aluno_codigo: aluno.codigo };
      if (turma?.id) params.turma_id = turma.id;
      const res = await api.get("/api/conselho/registros", { params });
      setRegistros(res.data?.registros || []);
    } catch (err) {
      console.error("Erro ao carregar registros do conselho:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNovoRegistro = async () => {
    if (!novoTexto.trim()) return;
    setSalvando(true);
    try {
      await api.post("/api/conselho/registros", {
        aluno_codigo: aluno.codigo,
        turma_id: turma?.id || null,
        texto: novoTexto.trim(),
      });
      setNovoTexto("");
      fetchRegistros();
    } catch (err) {
      console.error("Erro ao salvar registro:", err);
      alert("Erro ao salvar registro.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = async (id) => {
    if (!editandoTexto.trim()) return;
    try {
      await api.put(`/api/conselho/registros/${id}`, { texto: editandoTexto.trim() });
      setEditandoId(null);
      setEditandoTexto("");
      fetchRegistros();
    } catch (err) {
      console.error("Erro ao editar registro:", err);
      alert("Erro ao editar registro.");
    }
  };

  const formatarData = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (!open || !aluno) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="h-6 w-6 text-blue-800" />
            <div>
              <h2 className="text-lg font-bold text-blue-900">Ficha do Conselho de Classe</h2>
              <p className="text-sm text-blue-600">{aluno.estudante} — {turma?.turma || ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" title="Fechar">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Novo registro */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-blue-800 mb-2">
              Novo registro do conselho
            </label>
            <textarea
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              rows={3}
              placeholder="Descreva as observações sobre o aluno para o conselho de classe..."
              className="w-full border border-blue-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleNovoRegistro}
                disabled={!novoTexto.trim() || salvando}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "+ Adicionar registro"}
              </button>
            </div>
          </div>

          {/* Lista de registros */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Histórico ({registros.length} registro{registros.length !== 1 ? "s" : ""})
            </h3>

            {loading ? (
              <p className="text-center text-gray-500 py-6 italic text-sm">Carregando registros...</p>
            ) : registros.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <AcademicCapIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm italic">Nenhum registro lançado para este aluno nesta turma.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {registros.map((reg) => (
                  <div key={reg.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {editandoId === reg.id ? (
                          <textarea
                            value={editandoTexto}
                            onChange={(e) => setEditandoTexto(e.target.value)}
                            rows={3}
                            className="w-full border border-blue-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{reg.texto}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>
                            <span className="font-medium text-gray-600">{reg.usuario_nome}</span>
                            {reg.usuario_perfil && (
                              <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                {reg.usuario_perfil}
                              </span>
                            )}
                          </span>
                          <span>{formatarData(reg.criado_em)}</span>
                          {reg.editado_em && (
                            <span className="italic text-gray-400">
                              (editado por {reg.editado_por_nome})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações — só o autor pode editar */}
                      <div className="flex gap-1 flex-shrink-0">
                        {editandoId === reg.id ? (
                          <button
                            onClick={() => handleEditar(reg.id)}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                            title="Salvar edição"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditandoId(reg.id);
                              setEditandoTexto(reg.texto);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar meu registro"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 transition text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
