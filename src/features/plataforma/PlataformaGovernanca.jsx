// src/features/plataforma/PlataformaGovernanca.jsx
// ============================================================================
// GOVERNANÇA (CEO) — Gerencia categorias e itens de configuração global
// Itens criados aqui serão propagados para todas as escolas
// ============================================================================
import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

const CORES_OPCOES = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#10b981", label: "Esmeralda" },
  { value: "#f59e0b", label: "Âmbar" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#64748b", label: "Cinza" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Violeta" },
];

const TIPOS_ITEM = [
  { value: "boolean", label: "Liga / Desliga" },
  { value: "select", label: "Lista de Opções" },
  { value: "text", label: "Texto Livre" },
];

export default function PlataformaGovernanca() {
  // ── State ──
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState(null);
  const [msg, setMsg] = useState(null);

  // Modal Categoria
  const [modalCat, setModalCat] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [fCatNome, setFCatNome] = useState("");
  const [fCatCor, setFCatCor] = useState("#6366f1");
  const [fCatOrdem, setFCatOrdem] = useState(0);
  const [savingCat, setSavingCat] = useState(false);

  // Modal Item
  const [modalItem, setModalItem] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [fItemCatId, setFItemCatId] = useState(null);
  const [fItemChave, setFItemChave] = useState("");
  const [fItemDescricao, setFItemDescricao] = useState("");
  const [fItemTipo, setFItemTipo] = useState("boolean");
  const [fItemOpcoes, setFItemOpcoes] = useState("");
  const [fItemValorPadrao, setFItemValorPadrao] = useState("0");
  const [fItemOrdem, setFItemOrdem] = useState(0);
  const [savingItem, setSavingItem] = useState(false);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'cat'|'item', id, nome }

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/plataforma/governanca/completo");
      if (data.ok) setCategorias(data.categorias || []);
    } catch {
      showMsg("Erro ao carregar dados.", "erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showMsg = (texto, tipo = "sucesso") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 4000);
  };

  // ── Categoria CRUD ──
  const openCatModal = (cat = null) => {
    setEditCat(cat);
    setFCatNome(cat?.nome || "");
    setFCatCor(cat?.cor || "#6366f1");
    setFCatOrdem(cat?.ordem ?? 0);
    setModalCat(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    if (!fCatNome.trim()) return;
    setSavingCat(true);
    try {
      if (editCat) {
        await api.put(`/api/plataforma/governanca/categorias/${editCat.id}`, {
          nome: fCatNome.trim(),
          cor: fCatCor,
          ordem: Number(fCatOrdem),
        });
        showMsg("✅ Categoria atualizada!");
      } else {
        await api.post("/api/plataforma/governanca/categorias", {
          nome: fCatNome.trim(),
          cor: fCatCor,
          ordem: Number(fCatOrdem),
        });
        showMsg("✅ Categoria criada!");
      }
      setModalCat(false);
      fetchAll();
    } catch (err) {
      showMsg(`❌ ${err?.response?.data?.message || "Erro ao salvar."}`, "erro");
    } finally {
      setSavingCat(false);
    }
  };

  // ── Item CRUD ──
  const openItemModal = (catId, item = null) => {
    setEditItem(item);
    setFItemCatId(catId);
    setFItemChave(item?.chave || "");
    setFItemDescricao(item?.descricao || "");
    setFItemTipo(item?.tipo || "boolean");
    setFItemOpcoes(
      item?.opcoes_json ? (Array.isArray(item.opcoes_json) ? item.opcoes_json.join(", ") : "") : ""
    );
    setFItemValorPadrao(item?.valor_padrao ?? "0");
    setFItemOrdem(item?.ordem ?? 0);
    setModalItem(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!fItemChave.trim() || !fItemDescricao.trim()) return;
    setSavingItem(true);

    const opcoesArr = fItemOpcoes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      categoria_id: fItemCatId,
      chave: fItemChave.trim(),
      descricao: fItemDescricao.trim(),
      tipo: fItemTipo,
      opcoes_json: opcoesArr.length ? opcoesArr : null,
      valor_padrao: fItemValorPadrao,
      ordem: Number(fItemOrdem),
    };

    try {
      if (editItem) {
        await api.put(`/api/plataforma/governanca/itens/${editItem.id}`, payload);
        showMsg("✅ Item atualizado!");
      } else {
        await api.post("/api/plataforma/governanca/itens", payload);
        showMsg("✅ Item criado!");
      }
      setModalItem(false);
      fetchAll();
    } catch (err) {
      showMsg(`❌ ${err?.response?.data?.message || "Erro ao salvar."}`, "erro");
    } finally {
      setSavingItem(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "cat") {
        await api.delete(`/api/plataforma/governanca/categorias/${confirmDelete.id}`);
        showMsg("✅ Categoria removida!");
      } else {
        await api.delete(`/api/plataforma/governanca/itens/${confirmDelete.id}`);
        showMsg("✅ Item removido!");
      }
      setConfirmDelete(null);
      fetchAll();
    } catch (err) {
      showMsg(`❌ ${err?.response?.data?.message || "Erro ao excluir."}`, "erro");
    }
  };

  // ── Total counts ──
  const totalCats = categorias.length;
  const totalItens = categorias.reduce((s, c) => s + (c.itens?.length || 0), 0);

  // ── RENDER ──
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8" style={{ fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif" }}>
      {/* Toast */}
      {msg && (
        <div
          className="fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl text-white font-semibold text-sm shadow-xl"
          style={{
            background: msg.tipo === "erro"
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #10b981, #059669)",
            animation: "slideIn .3s ease",
          }}
        >
          {msg.texto}
        </div>
      )}

      {/* Header */}
      <div
        className="rounded-2xl p-7 mb-6 flex items-center justify-between flex-wrap gap-4"
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: "-0.5px" }}>
              Governança
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Crie categorias e itens de configuração que serão disponibilizados para todas as escolas.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-xl font-bold text-white">{totalCats}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">categorias</div>
          </div>
          <div className="text-center px-5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-xl font-bold text-white">{totalItens}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">itens</div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-slate-500 text-sm">
          Itens criados aqui aparecerão automaticamente no painel <strong>Governança</strong> de cada escola.
        </p>
        <button
          onClick={() => openCatModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova Categoria
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-400 mt-4">Carregando...</p>
        </div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhuma categoria criada</h3>
          <p className="text-slate-400 text-sm mb-6">Comece criando sua primeira categoria de configuração.</p>
          <button
            onClick={() => openCatModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition"
          >
            + Nova Categoria
          </button>
        </div>
      ) : (
        /* ── CATEGORIAS LIST ── */
        <div className="space-y-4">
          {categorias.map((cat) => {
            const isExpanded = expandedCat === cat.id;
            const itens = cat.itens || [];
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: cat.cor || "#64748b" }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                  </div>
                  <button
                    className="flex-1 text-left"
                    onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  >
                    <div className="font-bold text-slate-800">{cat.nome}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {itens.length} {itens.length === 1 ? "item" : "itens"} · ordem: {cat.ordem}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {/* Add item */}
                    <button
                      onClick={() => openItemModal(cat.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 transition text-blue-600"
                      title="Adicionar item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                    {/* Edit category */}
                    <button
                      onClick={() => openCatModal(cat)}
                      className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-500"
                      title="Editar categoria"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    </button>
                    {/* Delete category */}
                    <button
                      onClick={() => setConfirmDelete({ type: "cat", id: cat.id, nome: cat.nome })}
                      className="p-2 rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600"
                      title="Excluir categoria"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                    {/* Expand */}
                    <button
                      onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400"
                    >
                      <svg
                        className="w-5 h-5 transition-transform"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Items */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {itens.length === 0 ? (
                      <div className="px-5 py-8 text-center text-slate-400 text-sm">
                        Nenhum item nesta categoria.{" "}
                        <button onClick={() => openItemModal(cat.id)} className="text-blue-600 font-semibold hover:underline">
                          Adicionar primeiro item
                        </button>
                      </div>
                    ) : (
                      itens.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-700">{item.descricao}</div>
                            <div className="flex items-center gap-3 mt-1">
                              <code className="text-xs text-slate-400 font-mono">{item.chave}</code>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  background:
                                    item.tipo === "boolean" ? "#dbeafe" :
                                    item.tipo === "select" ? "#fef3c7" : "#e0e7ff",
                                  color:
                                    item.tipo === "boolean" ? "#1d4ed8" :
                                    item.tipo === "select" ? "#92400e" : "#4338ca",
                                }}
                              >
                                {item.tipo}
                              </span>
                              <span className="text-xs text-slate-400">
                                padrão: <strong>{item.valor_padrao}</strong>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <button
                              onClick={() => openItemModal(cat.id, item)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 transition text-slate-400"
                              title="Editar item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: "item", id: item.id, nome: item.descricao })}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-300 hover:text-red-600"
                              title="Excluir item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL: Criar/Editar Categoria ═══ */}
      {modalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {editCat ? "Editar Categoria" : "Nova Categoria"}
              </h2>
              <button onClick={() => setModalCat(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveCat} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Categoria *</label>
                <input
                  type="text" required autoFocus value={fCatNome}
                  onChange={(e) => setFCatNome(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: Boletim, Professores, Coordenação..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_OPCOES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFCatCor(c.value)}
                      className={`w-9 h-9 rounded-xl transition-all ${
                        fCatCor === c.value ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-105"
                      }`}
                      style={{ background: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ordem</label>
                <input
                  type="number" value={fCatOrdem}
                  onChange={(e) => setFCatOrdem(e.target.value)}
                  className="w-24 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">Ordem de exibição (menor = primeiro).</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCat(false)}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={savingCat}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-50">
                  {savingCat ? "Salvando..." : editCat ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Criar/Editar Item ═══ */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {editItem ? "Editar Item" : "Novo Item"}
              </h2>
              <button onClick={() => setModalItem(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chave Identificadora *</label>
                <input
                  type="text" required autoFocus value={fItemChave}
                  onChange={(e) => setFItemChave(e.target.value.replace(/\s/g, "."))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: professor.visualiza_relatorio"
                />
                <p className="text-xs text-slate-400 mt-1">Identificador único. Use pontos para separar níveis.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
                <input
                  type="text" required value={fItemDescricao}
                  onChange={(e) => setFItemDescricao(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: Professor pode visualizar relatório disciplinar"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                  <select
                    value={fItemTipo}
                    onChange={(e) => setFItemTipo(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {TIPOS_ITEM.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Padrão</label>
                  <input
                    type="text" value={fItemValorPadrao}
                    onChange={(e) => setFItemValorPadrao(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={fItemTipo === "boolean" ? "0 ou 1" : "valor"}
                  />
                </div>
              </div>
              {fItemTipo === "select" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Opções (separadas por vírgula)</label>
                  <input
                    type="text" value={fItemOpcoes}
                    onChange={(e) => setFItemOpcoes(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Ex: padrao, personalizado"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ordem</label>
                <input
                  type="number" value={fItemOrdem}
                  onChange={(e) => setFItemOrdem(e.target.value)}
                  className="w-24 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalItem(false)}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={savingItem}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-50">
                  {savingItem ? "Salvando..." : editItem ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Confirmar exclusão ═══ */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">
                  Excluir {confirmDelete.type === "cat" ? "categoria" : "item"}?
                </h3>
                {confirmDelete.type === "cat" && (
                  <p className="text-xs text-red-500">Todos os itens desta categoria serão removidos.</p>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              <strong>{confirmDelete.nome}</strong> será removido permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition">
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        Categorias e itens criados aqui serão sincronizados automaticamente para todas as escolas quando um diretor acessar a Governança.
      </div>
    </div>
  );
}
