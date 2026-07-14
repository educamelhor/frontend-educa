// src/features/monitoramento/ModalGerenciarCameras.jsx
import React, { useEffect, useState } from "react";

export default function ModalGerenciarCameras({ isOpen, onClose, onRefresh }) {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // null = list view; {} = creating new; {id: 1, ...} = editing existing
  const [editingCamera, setEditingCamera] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const token = localStorage.getItem("token") || localStorage.getItem("anju.token") || "";
  const escolaId = localStorage.getItem("escola_id") || localStorage.getItem("escolaId") || "";

  useEffect(() => {
    if (isOpen) {
      setEditingCamera(null);
      loadCameras();
    }
  }, [isOpen]);

  async function loadCameras() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/monitoramento/cameras", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-escola-id": escolaId,
        },
      });
      if (!res.ok) throw new Error("Erro ao carregar câmeras");
      const data = await res.json();
      setCameras(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Tem certeza que deseja excluir esta câmera? Esta ação não pode ser desfeita.")) return;
    try {
      const res = await fetch(`/api/monitoramento/cameras/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-escola-id": escolaId,
        },
      });
      if (!res.ok) throw new Error("Erro ao excluir");
      await loadCameras();
      if (onRefresh) onRefresh();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const isNew = !editingCamera.id;
      const url = isNew ? "/api/monitoramento/cameras" : `/api/monitoramento/cameras/${editingCamera.id}`;
      const method = isNew ? "POST" : "PATCH";

      // Auto-generate slug if missing
      const slug = editingCamera.slug || editingCamera.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const payload = { ...editingCamera, slug, tipo: "rtsp" };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-escola-id": escolaId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao salvar câmera");
      }

      setEditingCamera(null);
      await loadCameras();
      if (onRefresh) onRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-blue-900 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
          <h2 className="text-xl font-bold">Gerenciar Câmeras</h2>
          <button onClick={onClose} className="text-white hover:text-red-300 font-bold text-xl leading-none">
            &times;
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          {error && <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}

          {editingCamera ? (
            // ================= FORMULÁRIO DE EDIÇÃO =================
            <form onSubmit={handleSave} className="flex flex-col gap-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-900 border-b pb-2">
                {editingCamera.id ? "Editar Câmera" : "Nova Câmera"}
              </h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Câmera</label>
                <input
                  type="text"
                  required
                  value={editingCamera.nome || ""}
                  onChange={e => setEditingCamera({...editingCamera, nome: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Portão Principal"
                />
              </div>

              <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <input
                  type="checkbox"
                  id="enabledCheck"
                  checked={editingCamera.enabled !== 0 && editingCamera.enabled !== false}
                  onChange={e => setEditingCamera({...editingCamera, enabled: e.target.checked ? 1 : 0})}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label htmlFor="enabledCheck" className="text-sm font-semibold text-blue-900 cursor-pointer">
                  Câmera Ativa (Monitorando)
                </label>
              </div>

              {/* Opções Avançadas (Ocultas por padrão para não assustar o usuário) */}
              <div className="mt-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  {showAdvanced ? "Ocultar" : "Mostrar"} configurações técnicas avançadas
                </button>
                
                {showAdvanced && (
                  <div className="mt-4 flex flex-col gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">URL RTSP (Stream de Vídeo)</label>
                      <input
                        type="text"
                        value={editingCamera.rtsp_url || ""}
                        onChange={e => setEditingCamera({...editingCamera, rtsp_url: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        placeholder="rtsp://admin:senha@192.168.0.10:554/stream"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Geralmente preenchido automaticamente pelo instalador local.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Identificador (Slug)</label>
                      <input
                        type="text"
                        value={editingCamera.slug || ""}
                        onChange={e => setEditingCamera({...editingCamera, slug: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-gray-100"
                        placeholder="Gerado automaticamente"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingCamera(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-semibold hover:bg-gray-100"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? "Salvando..." : "Salvar Câmera"}
                </button>
              </div>
            </form>
          ) : (
            // ================= LISTA DE CÂMERAS =================
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-600 text-sm">Gerencie os nomes e o status das câmeras instaladas na sua escola.</p>
                <button
                  onClick={() => {
                    setEditingCamera({ nome: "", enabled: 1 });
                    setShowAdvanced(false);
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-emerald-700 text-sm flex items-center gap-1"
                >
                  <span>+</span> Adicionar Câmera
                </button>
              </div>

              {loading ? (
                <div className="text-center py-10 text-gray-500">Carregando câmeras...</div>
              ) : cameras.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-500">Nenhuma câmera cadastrada.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-blue-50 border-b border-blue-100">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-blue-900 text-sm">Câmera</th>
                        <th className="py-3 px-4 font-semibold text-blue-900 text-sm w-32">Status</th>
                        <th className="py-3 px-4 font-semibold text-blue-900 text-sm w-32 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cameras.map(cam => (
                        <tr key={cam.id} className="hover:bg-gray-50 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-800">{cam.nome}</div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{cam.slug}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                              cam.enabled 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}>
                              {cam.enabled ? "ATIVA" : "INATIVA"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setEditingCamera(cam);
                                setShowAdvanced(false);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-sm mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(cam.id)}
                              className="text-red-600 hover:text-red-800 font-semibold text-sm"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
