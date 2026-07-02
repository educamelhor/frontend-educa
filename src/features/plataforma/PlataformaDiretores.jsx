import React, { useState, useEffect, useRef } from "react";
import api from "../../services/api";

export default function PlataformaDiretores() {
  const [diretores, setDiretores] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // Modais
  const [modalVincular, setModalVincular] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalSubstituir, setModalSubstituir] = useState(false);
  const [modalConfirm, setModalConfirm] = useState(null); // { tipo, diretor }
  const [modalExcluir, setModalExcluir] = useState(null); // diretor a excluir
  const [executandoExclusao, setExecutandoExclusao] = useState(false);
  const [modalCodigo, setModalCodigo] = useState(null); // { convite_token, expira_em, diretor_nome }
  const [gerandoCodigo, setGerandoCodigo] = useState(false);

  // Form Vincular
  const [dirEscolaId, setDirEscolaId] = useState("");
  const [dirNome, setDirNome] = useState("");
  const [dirCpf, setDirCpf] = useState("");
  const [dirEmail, setDirEmail] = useState("");
  const [dirPapel, setDirPapel] = useState("diretor");
  const [salvandoVinc, setSalvandoVinc] = useState(false);
  const [conviteResult, setConviteResult] = useState(null);

  // Form Editar
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // Form Substituir
  const [subDir, setSubDir] = useState(null); // diretor sendo substituído
  const [subNome, setSubNome] = useState("");
  const [subCpf, setSubCpf] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [salvandoSub, setSalvandoSub] = useState(false);
  const [subConviteResult, setSubConviteResult] = useState(null);

  // Dropdown
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, flipUp: false });
  const btnRefs = useRef({});

  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  // ── Fetch ───────────────────────────────────
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dirRes, escRes] = await Promise.all([
        api.get("/api/plataforma/diretores"),
        api.get("/api/plataforma/escolas"),
      ]);
      setDiretores(dirRes.data?.diretores || []);
      setEscolas(Array.isArray(escRes.data) ? escRes.data : escRes.data?.escolas || []);
    } catch { mostrarMensagem("Erro ao carregar dados.", "erro"); }
    finally { setLoading(false); }
  };

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 6000);
  };

  const algumModalAberto = modalVincular || modalEditar || modalSubstituir || !!modalConfirm || !!modalExcluir || !!modalCodigo;

  const renderMensagem = () =>
    mensagem.texto ? (
      <div className={`p-3 rounded-lg font-medium text-sm ${
        mensagem.tipo === "erro" ? "bg-red-100 text-red-800 border border-red-200"
          : "bg-green-100 text-green-800 border border-green-200"
      }`}>{mensagem.texto}</div>
    ) : null;

  // ── Helpers ─────────────────────────────────
  const fmtCPF = (v) => {
    const n = v.replace(/\D/g, "").slice(0, 11);
    if (n.length <= 3) return n;
    if (n.length <= 6) return n.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    if (n.length <= 9) return n.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
  };

  const validarCPF = (cpf) => {
    const nums = cpf.replace(/\D/g, "");
    if (nums.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(nums)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(nums[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === parseInt(nums[10]);
  };

  const cpfCompleto = (cpf) => cpf.replace(/\D/g, "").length === 11;

  const parseTipo = (v) => { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } };

  function escolaSelecionadaIsCCMDF() {
    if (!dirEscolaId) return false;
    const esc = escolas.find(e => String(e.id) === String(dirEscolaId));
    return esc ? parseTipo(esc.tipo).includes("CCMDF") : false;
  }
  const isCCMDF = escolaSelecionadaIsCCMDF();

  useEffect(() => {
    if (escolaSelecionadaIsCCMDF()) {
      if (dirPapel === "diretor") setDirPapel("diretor_pedagogico");
    } else { setDirPapel("diretor"); }
    setConviteResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirEscolaId]);

  const papelLabel = (papel) => {
    if (papel === "diretor_disciplinar") return "🎖️ Comandante";
    if (papel === "diretor_pedagogico") return "📚 Pedagógico";
    return "📚 Diretor";
  };

  // ── Actions ─────────────────────────────────
  // Vincular
  const resetVincular = () => { setDirEscolaId(""); setDirNome(""); setDirCpf(""); setDirEmail(""); setDirPapel("diretor"); setConviteResult(null); };
  const abrirVincular = () => { resetVincular(); setModalVincular(true); setMenuAberto(null); };

  const handleVincular = async (e) => {
    e.preventDefault();
    if (!dirEscolaId || !dirNome.trim() || !dirCpf.trim()) return;
    if (!validarCPF(dirCpf)) {
      mostrarMensagem("❌ CPF inválido. Verifique os dígitos informados.", "erro");
      return;
    }
    setSalvandoVinc(true); setConviteResult(null);
    try {
      const { data } = await api.post(`/api/plataforma/escolas/${dirEscolaId}/diretor`, {
        nome: dirNome.trim(), cpf: dirCpf.replace(/\D/g, ""), email: dirEmail.trim() || undefined, papel: dirPapel,
      });
      setConviteResult(data);
      mostrarMensagem(`✅ ${data.papel_label || "Diretor"} vinculado!`);
      setDirNome(""); setDirCpf(""); setDirEmail("");
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao vincular."}`, "erro");
    } finally { setSalvandoVinc(false); }
  };

  // Editar
  const abrirEditar = (d) => {
    setEditId(d.id); setEditNome(d.nome || ""); setEditEmail(d.email || "");
    setModalEditar(true); setMenuAberto(null);
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    if (!editNome.trim()) return;
    setSalvandoEdit(true);
    try {
      await api.put(`/api/plataforma/diretores/${editId}`, { nome: editNome.trim(), email: editEmail.trim() || undefined });
      mostrarMensagem("✅ Diretor atualizado!"); setModalEditar(false); fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao editar."}`, "erro");
    } finally { setSalvandoEdit(false); }
  };

  // Substituir
  const abrirSubstituir = (d) => {
    setSubDir(d); setSubNome(""); setSubCpf(""); setSubEmail(""); setSubConviteResult(null);
    setModalSubstituir(true); setMenuAberto(null);
  };

  const handleSubstituir = async (e) => {
    e.preventDefault();
    if (!subDir || !subNome.trim() || !subCpf.trim()) return;
    if (!validarCPF(subCpf)) {
      mostrarMensagem("❌ CPF inválido. Verifique os dígitos informados.", "erro");
      return;
    }
    setSalvandoSub(true); setSubConviteResult(null);
    try {
      // 1) Cancelar diretor atual
      await api.patch(`/api/plataforma/diretores/${subDir.id}/status`, { status: "cancelado" });
      // 2) Vincular novo
      // ✅ [GOVERNANÇA v2] 'militar' renomeado para 'diretor_disciplinar'
      const papel = subDir.perfil === "diretor_disciplinar" ? "diretor_disciplinar" : (subDir.perfil === "diretor" ? "diretor" : "diretor");
      // Detecta CCMDF para papel correto
      const escTipos = parseTipo(subDir.escola_tipo);
      const papelFinal = escTipos.includes("CCMDF")
        ? (subDir.perfil === "diretor_disciplinar" ? "diretor_disciplinar" : "diretor_pedagogico")
        : "diretor";
      const { data } = await api.post(`/api/plataforma/escolas/${subDir.escola_id}/diretor`, {
        nome: subNome.trim(), cpf: subCpf.replace(/\D/g, ""), email: subEmail.trim() || undefined, papel: papelFinal,
      });
      setSubConviteResult(data);
      mostrarMensagem(`✅ Diretor substituído com sucesso!`);
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao substituir."}`, "erro");
    } finally { setSalvandoSub(false); }
  };

  // Status
  const abrirConfirm = (tipo, d) => { setModalConfirm({ tipo, diretor: d }); setMenuAberto(null); };

  // Excluir
  const abrirExcluir = (d) => { setModalExcluir(d); setMenuAberto(null); };

  const handleExcluir = async () => {
    if (!modalExcluir || executandoExclusao) return;
    setExecutandoExclusao(true);
    try {
      await api.delete(`/api/plataforma/diretores/${modalExcluir.id}`);
      setModalExcluir(null);
      mostrarMensagem(`✅ Diretor excluído permanentemente!`);
      fetchAll();
    } catch (err) {
      console.error("Erro ao excluir diretor:", err);
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao excluir diretor."}`, "erro");
    } finally {
      setExecutandoExclusao(false);
    }
  };

  const [executandoStatus, setExecutandoStatus] = useState(false);

  const handleAlterarStatus = async () => {
    if (!modalConfirm || executandoStatus) return;
    const { tipo, diretor } = modalConfirm;
    setExecutandoStatus(true);
    try {
      await api.patch(`/api/plataforma/diretores/${diretor.id}/status`, { status: tipo });
      const labels = { bloqueado: "bloqueado", cancelado: "cancelado e desvinculado", ativo: "reativado" };
      setModalConfirm(null);
      mostrarMensagem(`✅ Diretor ${labels[tipo]}!`);
      fetchAll();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao alterar status."}`, "erro");
      setModalConfirm(null);
    } finally {
      setExecutandoStatus(false);
    }
  };

  // Regenerar código
  const handleRegenarCodigo = async (d) => {
    setGerandoCodigo(true);
    setMenuAberto(null);
    try {
      const { data } = await api.post(`/api/plataforma/diretores/${d.id}/regenerar-codigo`);
      setModalCodigo(data);
      mostrarMensagem(`✅ Novo código gerado para ${d.nome}!`);
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao gerar código."}`, "erro");
    } finally {
      setGerandoCodigo(false);
    }
  };

  // Determina status cadastro
  const cadastroStatus = (d) => {
    if (d.convite_usado_em) return "concluido";
    if (!d.convite_expira_em) return "sem_convite";
    if (new Date(d.convite_expira_em) < new Date()) return "expirado";
    return "pendente";
  };

  // ── Filtragem ───────────────────────────────
  const diretoresFiltrados = diretores.filter((d) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [d.nome, d.escola_nome, d.cidade, d.cpf, d.email, d.perfil, String(d.id)]
      .some(v => String(v || "").toLowerCase().includes(q));
  });

  // ── Status badge ────────────────────────────
  const statusBadge = (d) => {
    if (Number(d.ativo) === 1) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Ativo</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">Inativo</span>;
  };

  // ── RENDER ──────────────────────────────────
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Diretores</h1>
        <button onClick={abrirVincular}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg transition shadow-sm">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>Vincular Diretor</button>
      </div>

      {!algumModalAberto && mensagem.texto && (
        <div className={`mb-4 p-3 rounded-lg font-medium text-sm ${mensagem.tipo === "erro" ? "bg-red-100 text-red-800 border border-red-200" : "bg-green-100 text-green-800 border border-green-200"}`}>{mensagem.texto}</div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, escola, CPF, papel..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-500">Carregando...</div>
      ) : diretoresFiltrados.length === 0 ? (
        <div className="text-center p-16 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-lg mb-2">{busca.trim() ? "Nenhum diretor encontrado." : "Nenhum diretor vinculado."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Escola</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Localização</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Função</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Diretor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Cadastro</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {diretoresFiltrados.map((d) => {
                const isCancelado = !d.escola_id;
                return (
                  <tr key={d.id} className={`hover:bg-slate-50 transition ${isCancelado ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{d.escola_nome}</div>
                      <div className="text-xs text-slate-400">ID: {d.escola_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {d.cidade || d.estado ? `${d.cidade || "–"} / ${d.estado || "–"}` : <span className="text-slate-400 italic">–</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        d.papel === "diretor_disciplinar" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      }`}>{papelLabel(d.papel)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{d.nome}</div>
                      {d.cpf && <div className="text-xs text-slate-400">{fmtCPF(d.cpf)}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const st = cadastroStatus(d);
                        if (st === "concluido") return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">✅ Concluído</span>;
                        if (st === "expirado") return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">⏰ Expirado</span>;
                        if (st === "pendente") return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">⏳ Pendente</span>;
                        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500">–</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">{statusBadge(d)}</td>

                    {/* AÇÕES */}
                    <td className="px-4 py-3 text-center">
                      <button
                        ref={el => { btnRefs.current[d.id] = el; }}
                        onClick={() => {
                          if (menuAberto === d.id) { setMenuAberto(null); return; }
                          const el = btnRefs.current[d.id];
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            const flipUp = rect.bottom + 220 > window.innerHeight;
                            setMenuPos({ top: flipUp ? rect.top : rect.bottom + 4, left: rect.right - 208, flipUp });
                          }
                          setMenuAberto(d.id);
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-200 transition text-slate-500"
                        title="Ações"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ DROPDOWN PORTAL ═══ */}
      {menuAberto && (() => {
        const d = diretores.find(x => x.id === menuAberto);
        if (!d) return null;
        const isAtivo = Number(d.ativo) === 1;
        const isInativo = !isAtivo;
        return (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuAberto(null)} />
            <div className="fixed z-[70] w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1"
              style={{
                top: menuPos.flipUp ? undefined : menuPos.top,
                bottom: menuPos.flipUp ? (window.innerHeight - menuPos.top + 4) : undefined,
                left: Math.max(8, menuPos.left),
              }}>
              {/* 1) Editar */}
              <button
                onClick={() => { if (isAtivo) abrirEditar(d); }}
                disabled={isInativo}
                className={`flex items-center w-full px-4 py-2.5 text-sm transition gap-2 ${
                  isAtivo ? "text-slate-700 hover:bg-slate-50 cursor-pointer" : "text-slate-400 cursor-not-allowed"
                }`}>
                <svg className={`h-4 w-4 ${isAtivo ? "text-blue-500" : "text-slate-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                Editar dados
              </button>

              {/* 2) Substituir */}
              <button
                onClick={() => { if (isAtivo) abrirSubstituir(d); }}
                disabled={isInativo}
                className={`flex items-center w-full px-4 py-2.5 text-sm transition gap-2 ${
                  isAtivo ? "text-slate-700 hover:bg-slate-50 cursor-pointer" : "text-slate-400 cursor-not-allowed"
                }`}>
                <svg className={`h-4 w-4 ${isAtivo ? "text-indigo-500" : "text-slate-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                Substituir diretor
              </button>

              {/* 3) Gerar código (só para quem não finalizou cadastro) */}
              {cadastroStatus(d) !== "concluido" && isAtivo && (
                <button onClick={() => handleRegenarCodigo(d)} disabled={gerandoCodigo}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-teal-600 hover:bg-teal-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
                  {gerandoCodigo ? "Gerando..." : "Gerar código"}
                </button>
              )}

              <div className="border-t border-slate-100 my-1" />

              {/* 3) Bloquear */}
              {isAtivo && (
                <button onClick={() => abrirConfirm("bloqueado", d)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Bloquear
                </button>
              )}

              {/* 4) Desbloquear */}
              {isInativo && (
                <button onClick={() => abrirConfirm("ativo", d)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Reativar
                </button>
              )}

              {/* 5) Cancelar (desativar) */}
              {isAtivo && (
                <button onClick={() => abrirConfirm("cancelado", d)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Cancelar diretor
                </button>
              )}

              {/* 6) Excluir (só para inativos) */}
              {isInativo && (
                <button onClick={() => abrirExcluir(d)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  Excluir definitivamente
                </button>
              )}
            </div>
          </>
        );
      })()}

      {/* ═══════ MODAL VINCULAR ═══════ */}
      {modalVincular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Vincular Diretor</h2>
              <button onClick={() => { setModalVincular(false); setConviteResult(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            <form onSubmit={handleVincular} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Escola *</label>
                <select required value={dirEscolaId} onChange={e => setDirEscolaId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">Selecione uma escola</option>
                  {escolas.map(esc => {
                    const tag = parseTipo(esc.tipo).includes("CCMDF") ? " 🎖️ CCMDF" : "";
                    return <option key={esc.id} value={esc.id}>{esc.nome}{tag} (ID: {esc.id})</option>;
                  })}
                </select>
              </div>
              {isCCMDF && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <strong>🎖️ CCMDF</strong> — requer Dir. Pedagógico + Comandante
                </div>
              )}
              {isCCMDF && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Papel *</label>
                  <div className="flex gap-4">
                    {[{ value: "diretor_pedagogico", label: "Dir. Pedagógico" }, { value: "diretor_disciplinar", label: "Comandante" }].map(o => (
                      <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="papel" value={o.value} checked={dirPapel === o.value} onChange={() => setDirPapel(o.value)} className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-slate-700">{o.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                <input type="text" required value={dirNome} onChange={e => setDirNome(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Nome do diretor" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                <input type="text" required value={dirCpf} onChange={e => setDirCpf(fmtCPF(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:outline-none ${
                    cpfCompleto(dirCpf) && !validarCPF(dirCpf)
                      ? "border-red-400 focus:ring-red-400 bg-red-50"
                      : "border-slate-300 focus:ring-blue-500"
                  }`} placeholder="000.000.000-00" maxLength={14} />
                {cpfCompleto(dirCpf) && !validarCPF(dirCpf) && (
                  <p className="text-xs text-red-500 mt-1">⚠ CPF inválido — verifique os dígitos.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input type="email" value={dirEmail} onChange={e => setDirEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="diretor@escola.com.br" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalVincular(false); setConviteResult(null); }}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" disabled={salvandoVinc}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvandoVinc ? "Vinculando..." : "Vincular Diretor"}</button>
              </div>
            </form>
            {conviteResult && (() => {
              const linkVinc = `${window.location.origin}/ativar-diretor?token=${conviteResult.convite_token}`;
              const msgVinc = `Olá, *${dirNome || "Diretor(a)"}*! 👋\n\nSeu acesso ao sistema *Educa.Melhor* foi liberado.\n\nClique no link abaixo para criar sua senha e ativar sua conta:\n${linkVinc}\n\n⏰ Este link expira em: ${new Date(conviteResult.expira_em).toLocaleString("pt-BR")}\n\n_Equipe Educa.Melhor_`;
              return (
              <div className="mx-6 mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-3">✅ {conviteResult.papel_label || "Diretor"} vinculado!</h3>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Link de ativação</label>
                  <input type="text" readOnly value={linkVinc}
                    onClick={e => { e.target.select(); navigator.clipboard?.writeText(linkVinc); mostrarMensagem("📋 Link copiado!"); }}
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-xs font-mono bg-white text-green-900 cursor-pointer hover:bg-green-50 transition" />
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    Expira em: {new Date(conviteResult.expira_em).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard?.writeText(linkVinc); mostrarMensagem("📋 Link copiado!"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg transition text-xs">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                    Copiar link
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(msgVinc)}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition text-xs">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    Enviar via WhatsApp
                  </a>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══════ MODAL EDITAR ═══════ */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Editar Diretor</h2>
              <button onClick={() => setModalEditar(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            <form onSubmit={handleEditar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                <input type="text" required value={editNome} onChange={e => setEditNome(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalEditar(false)}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" disabled={salvandoEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvandoEdit ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ MODAL SUBSTITUIR ═══════ */}
      {modalSubstituir && subDir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Substituir Diretor</h2>
              <button onClick={() => { setModalSubstituir(false); setSubConviteResult(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            <div className="px-6 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                <strong>Substituindo:</strong> {subDir.nome} — {subDir.escola_nome}
                <br /><span className="text-xs text-slate-400">Este diretor será desvinculado e o novo assumirá a posição.</span>
              </div>
            </div>
            <form onSubmit={handleSubstituir} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do novo diretor *</label>
                <input type="text" required value={subNome} onChange={e => setSubNome(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Nome completo" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                <input type="text" required value={subCpf} onChange={e => setSubCpf(fmtCPF(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:outline-none ${
                    cpfCompleto(subCpf) && !validarCPF(subCpf)
                      ? "border-red-400 focus:ring-red-400 bg-red-50"
                      : "border-slate-300 focus:ring-blue-500"
                  }`} placeholder="000.000.000-00" maxLength={14} />
                {cpfCompleto(subCpf) && !validarCPF(subCpf) && (
                  <p className="text-xs text-red-500 mt-1">⚠ CPF inválido — verifique os dígitos.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input type="email" value={subEmail} onChange={e => setSubEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="novo@escola.com.br" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalSubstituir(false); setSubConviteResult(null); }}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" disabled={salvandoSub}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvandoSub ? "Substituindo..." : "Confirmar Substituição"}</button>
              </div>
            </form>
            {subConviteResult && (() => {
              const linkSub = `${window.location.origin}/ativar-diretor?token=${subConviteResult.convite_token}`;
              const msgSub = `Olá, *${subNome || "Diretor(a)"}*! 👋\n\nSeu acesso ao sistema *Educa.Melhor* foi liberado.\n\nClique no link abaixo para criar sua senha e ativar sua conta:\n${linkSub}\n\n⏰ Este link expira em: ${new Date(subConviteResult.expira_em).toLocaleString("pt-BR")}\n\n_Equipe Educa.Melhor_`;
              return (
              <div className="mx-6 mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-3">✅ Novo diretor vinculado!</h3>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Link de ativação</label>
                  <input type="text" readOnly value={linkSub}
                    onClick={e => { e.target.select(); navigator.clipboard?.writeText(linkSub); mostrarMensagem("📋 Link copiado!"); }}
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-xs font-mono bg-white text-green-900 cursor-pointer hover:bg-green-50 transition" />
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    Expira em: {new Date(subConviteResult.expira_em).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard?.writeText(linkSub); mostrarMensagem("📋 Link copiado!"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg transition text-xs">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                    Copiar link
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(msgSub)}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition text-xs">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    Enviar via WhatsApp
                  </a>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══════ MODAL CONFIRMAÇÃO ═══════ */}
      {modalConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            {modalConfirm.tipo === "cancelado" ? (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Cancelar diretor?</h3>
                  <p className="text-sm text-slate-500">O diretor <strong>{modalConfirm.diretor.nome}</strong> será desvinculado permanentemente.</p>
                </div>
              </div>
            ) : modalConfirm.tipo === "bloqueado" ? (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Bloquear diretor?</h3>
                  <p className="text-sm text-slate-500"><strong>{modalConfirm.diretor.nome}</strong> não poderá acessar o sistema.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Desbloquear diretor?</h3>
                  <p className="text-sm text-slate-500"><strong>{modalConfirm.diretor.nome}</strong> voltará a acessar o sistema.</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModalConfirm(null)} disabled={executandoStatus}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition disabled:opacity-50">Voltar</button>
              <button onClick={handleAlterarStatus} disabled={executandoStatus}
                className={`flex-1 font-medium py-2.5 rounded-lg transition text-white disabled:opacity-50 ${
                  modalConfirm.tipo === "cancelado" ? "bg-red-600 hover:bg-red-700"
                    : modalConfirm.tipo === "bloqueado" ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-green-600 hover:bg-green-700"
                }`}>
                {executandoStatus ? "Processando..." : modalConfirm.tipo === "cancelado" ? "Sim, cancelar" : modalConfirm.tipo === "bloqueado" ? "Sim, bloquear" : "Sim, desbloquear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL EXCLUIR DIRETOR ═══════ */}
      {modalExcluir && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header com gradiente vermelho */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Excluir Diretor</h3>
                  <p className="text-white/80 text-sm">Esta ação é irreversível</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">Atenção!</p>
                    <p>Todos os dados deste diretor serão <strong>removidos permanentemente</strong> do sistema, incluindo convites e códigos de acesso.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diretor</span>
                </div>
                <p className="font-bold text-slate-800 text-lg">{modalExcluir.nome}</p>
                {modalExcluir.cpf && (
                  <p className="text-sm text-slate-500">CPF: {fmtCPF(modalExcluir.cpf)}</p>
                )}
                {modalExcluir.escola_nome && (
                  <p className="text-sm text-slate-500">Escola: {modalExcluir.escola_nome}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setModalExcluir(null)}
                disabled={executandoExclusao}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
              >Cancelar</button>
              <button
                onClick={handleExcluir}
                disabled={executandoExclusao}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {executandoExclusao ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Excluindo...</>
                ) : (
                  <><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>Sim, excluir permanentemente</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL CÓDIGO DE ACESSO ═══════ */}
      {modalCodigo && (() => {
        const linkAtivacao = `${window.location.origin}/ativar-diretor?token=${modalCodigo.convite_token}`;
        const msgWhats = `Olá, *${modalCodigo.diretor_nome}*! 👋\n\nSeu acesso ao sistema *Educa.Melhor* foi liberado.\n\nClique no link abaixo para criar sua senha e ativar sua conta:\n${linkAtivacao}\n\n⏰ Este link expira em: ${new Date(modalCodigo.expira_em).toLocaleString("pt-BR")}\n\n_Equipe Educa.Melhor_`;
        const whatsUrl = `https://wa.me/?text=${encodeURIComponent(msgWhats)}`;

        return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Convite Gerado</h3>
                <p className="text-sm text-slate-500">{modalCodigo.diretor_nome}</p>
              </div>
            </div>

            {/* Link de ativação */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Link de ativação</label>
              <input
                type="text"
                readOnly
                value={linkAtivacao}
                onClick={e => { e.target.select(); navigator.clipboard?.writeText(linkAtivacao); mostrarMensagem("📋 Link copiado!"); }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono bg-white text-slate-700 cursor-pointer hover:bg-slate-50 transition"
              />
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                Expira em: {new Date(modalCodigo.expira_em).toLocaleString("pt-BR")}
              </p>
            </div>

            {/* Ações */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { navigator.clipboard?.writeText(linkAtivacao); mostrarMensagem("📋 Link copiado para a área de transferência!"); }}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition text-sm">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                Copiar link
              </button>
              <a
                href={whatsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition text-sm">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Enviar via WhatsApp
              </a>
            </div>

            <button
              onClick={() => setModalCodigo(null)}
              className="w-full border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-2.5 rounded-lg transition text-sm">
              Fechar
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
