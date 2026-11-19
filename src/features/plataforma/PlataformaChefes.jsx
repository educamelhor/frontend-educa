import React, { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import { UNIDADES_CRE_SEEDF } from "./PlataformaRegionais";

export default function PlataformaChefes() {
  const [chefes, setChefes] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // Modais
  const [modalVincular, setModalVincular] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalSubstituir, setModalSubstituir] = useState(false);
  const [modalConfirm, setModalConfirm] = useState(null); // { tipo, chefe }
  const [modalExcluir, setModalExcluir] = useState(null); // chefe a excluir
  const [executandoExclusao, setExecutandoExclusao] = useState(false);
  const [modalCodigo, setModalCodigo] = useState(null); // { convite_token, expira_em, chefe_nome }
  const [gerandoCodigo, setGerandoCodigo] = useState(false);

  // Form Vincular
  const [chefeRegionalId, setChefeRegionalId] = useState("");
  const [chefeNome, setChefeNome] = useState("");
  const [chefeCpf, setChefeCpf] = useState("");
  const [chefeEmail, setChefeEmail] = useState("");
  const [chefePapel, setChefePapel] = useState("coordenador_regional");
  const [salvandoVinc, setSalvandoVinc] = useState(false);
  const [conviteResult, setConviteResult] = useState(null);

  // Form Editar
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPapel, setEditPapel] = useState("coordenador_regional");
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // Form Substituir
  const [subChefe, setSubChefe] = useState(null);
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

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [chRes, regRes] = await Promise.all([
        api.get("/api/plataforma/chefes"),
        api.get("/api/plataforma/regionais"),
      ]);
      setChefes(chRes.data?.chefes || []);
      setRegionais(Array.isArray(regRes.data) ? regRes.data : regRes.data?.regionais || []);
    } catch {
      mostrarMensagem("Erro ao carregar dados de chefes e regionais.", "erro");
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 6000);
  };

  const algumModalAberto = modalVincular || modalEditar || modalSubstituir || !!modalConfirm || !!modalExcluir || !!modalCodigo;

  const renderMensagem = () =>
    mensagem.texto ? (
      <div className={`p-3 rounded-lg font-medium text-sm ${
        mensagem.tipo === "erro"
          ? "bg-red-100 text-red-800 border border-red-200"
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

  const papelInfo = (papel) => {
    const found = UNIDADES_CRE_SEEDF.find(u => u.papelKey === papel);
    if (found) return found;
    return UNIDADES_CRE_SEEDF[0];
  };

  // ── Actions ─────────────────────────────────
  const resetVincular = () => {
    setChefeRegionalId("");
    setChefeNome("");
    setChefeCpf("");
    setChefeEmail("");
    setChefePapel("coordenador_regional");
    setConviteResult(null);
  };
  const abrirVincular = () => { resetVincular(); setModalVincular(true); setMenuAberto(null); };

  const handleVincular = async (e) => {
    e.preventDefault();
    if (!chefeRegionalId || !chefeNome.trim() || !chefeCpf.trim()) return;
    if (!validarCPF(chefeCpf)) {
      mostrarMensagem("❌ CPF inválido. Verifique os dígitos informados.", "erro");
      return;
    }
    setSalvandoVinc(true);
    setConviteResult(null);
    try {
      const { data } = await api.post(`/api/plataforma/regionais/${chefeRegionalId}/chefe`, {
        nome: chefeNome.trim(),
        cpf: chefeCpf.replace(/\D/g, ""),
        email: chefeEmail.trim() || undefined,
        papel: chefePapel,
      });
      setConviteResult(data);
      mostrarMensagem(`✅ ${data.papel_label || "Chefe"} vinculado(a)!`);
      setChefeNome("");
      setChefeCpf("");
      setChefeEmail("");
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao vincular chefe."}`, "erro");
    } finally {
      setSalvandoVinc(false);
    }
  };

  // Editar
  const abrirEditar = (c) => {
    setEditId(c.id);
    setEditNome(c.nome || "");
    setEditEmail(c.email || "");
    setEditPapel(c.papel || "coordenador_regional");
    setModalEditar(true);
    setMenuAberto(null);
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    if (!editNome.trim()) return;
    setSalvandoEdit(true);
    try {
      await api.put(`/api/plataforma/chefes/${editId}`, {
        nome: editNome.trim(),
        email: editEmail.trim() || undefined,
        papel: editPapel,
      });
      mostrarMensagem("✅ Chefe atualizado!");
      setModalEditar(false);
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao editar."}`, "erro");
    } finally {
      setSalvandoEdit(false);
    }
  };

  // Substituir
  const abrirSubstituir = (c) => {
    setSubChefe(c);
    setSubNome("");
    setSubCpf("");
    setSubEmail("");
    setSubConviteResult(null);
    setModalSubstituir(true);
    setMenuAberto(null);
  };

  const handleSubstituir = async (e) => {
    e.preventDefault();
    if (!subChefe || !subNome.trim() || !subCpf.trim()) return;
    if (!validarCPF(subCpf)) {
      mostrarMensagem("❌ CPF inválido. Verifique os dígitos informados.", "erro");
      return;
    }
    setSalvandoSub(true);
    setSubConviteResult(null);
    try {
      await api.patch(`/api/plataforma/chefes/${subChefe.id}/status`, { status: "cancelado" });
      const { data } = await api.post(`/api/plataforma/regionais/${subChefe.regional_id}/chefe`, {
        nome: subNome.trim(),
        cpf: subCpf.replace(/\D/g, ""),
        email: subEmail.trim() || undefined,
        papel: subChefe.papel || "coordenador_regional",
      });
      setSubConviteResult(data);
      mostrarMensagem("✅ Chefe substituído com sucesso!");
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao substituir chefe."}`, "erro");
    } finally {
      setSalvandoSub(false);
    }
  };

  // Status
  const abrirConfirm = (tipo, c) => { setModalConfirm({ tipo, chefe: c }); setMenuAberto(null); };

  // Excluir
  const abrirExcluir = (c) => { setModalExcluir(c); setMenuAberto(null); };

  const handleExcluir = async () => {
    if (!modalExcluir || executandoExclusao) return;
    setExecutandoExclusao(true);
    try {
      await api.delete(`/api/plataforma/chefes/${modalExcluir.id}`);
      setModalExcluir(null);
      mostrarMensagem("✅ Chefe excluído permanentemente!");
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao excluir chefe."}`, "erro");
    } finally {
      setExecutandoExclusao(false);
    }
  };

  const [executandoStatus, setExecutandoStatus] = useState(false);

  const handleAlterarStatus = async () => {
    if (!modalConfirm || executandoStatus) return;
    const { tipo, chefe } = modalConfirm;
    setExecutandoStatus(true);
    try {
      await api.patch(`/api/plataforma/chefes/${chefe.id}/status`, { status: tipo });
      const labels = { bloqueado: "bloqueado", cancelado: "cancelado e desvinculado", ativo: "reativado" };
      setModalConfirm(null);
      mostrarMensagem(`✅ Chefe ${labels[tipo]}!`);
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao alterar status."}`, "erro");
      setModalConfirm(null);
    } finally {
      setExecutandoStatus(false);
    }
  };

  // Regenerar código
  const handleRegenerarCodigo = async (c) => {
    setGerandoCodigo(true);
    setMenuAberto(null);
    try {
      const { data } = await api.post(`/api/plataforma/chefes/${c.id}/regenerar-codigo`);
      setModalCodigo(data);
      mostrarMensagem(`✅ Novo código gerado para ${c.nome}!`);
      fetchAll();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao gerar código."}`, "erro");
    } finally {
      setGerandoCodigo(false);
    }
  };

  const cadastroStatus = (c) => {
    if (c.convite_usado_em) return "concluido";
    if (!c.convite_expira_em) return "sem_convite";
    if (new Date(c.convite_expira_em) < new Date()) return "expirado";
    return "pendente";
  };

  const chefesFiltrados = chefes.filter((c) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const info = papelInfo(c.papel);
    return [c.nome, c.regional_nome, c.regional_apelido, c.cidade, c.cpf, c.email, info.sigla, info.chefeLabel, String(c.id)]
      .some(v => String(v || "").toLowerCase().includes(q));
  });

  const statusBadge = (c) => {
    if (Number(c.ativo) === 1) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Ativo</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">Inativo</span>;
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chefes de Coordenações Regionais (CRE / SEEDF)</h1>
          <p className="text-sm text-slate-500">
            Coordenadores Regionais de Ensino e Chefes das Unidades Orgânicas (UNIEB, UNIPLAT, UNIGEP, UNIAE e UNIAG)
          </p>
        </div>
        <button onClick={abrirVincular}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg transition shadow-sm">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Vincular Chefe
        </button>
      </div>

      {!algumModalAberto && mensagem.texto && (
        <div className={`mb-4 p-3 rounded-lg font-medium text-sm ${
          mensagem.tipo === "erro" ? "bg-red-100 text-red-800 border border-red-200" : "bg-green-100 text-green-800 border border-green-200"
        }`}>{mensagem.texto}</div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome do chefe, CRE/Regional, CPF, unidade (UNIEB, UNIPLAT, UNIGEP, UNIAE, UNIAG)..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-500">Carregando chefes...</div>
      ) : chefesFiltrados.length === 0 ? (
        <div className="text-center p-16 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-lg mb-2">{busca.trim() ? "Nenhum chefe encontrado." : "Nenhum chefe vinculado às Regionais."}</p>
          <p className="text-sm text-slate-400">Clique em "Vincular Chefe" para cadastrar o Coordenador Regional ou Chefes de Unidade (SEEDF).</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Regional (CRE)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Localização</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Função / Unidade SEEDF</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Chefe</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Cadastro</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chefesFiltrados.map((c) => {
                const isCancelado = !c.regional_id;
                const info = papelInfo(c.papel);
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 transition ${isCancelado ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{c.regional_nome || "Regional não definida"}</div>
                      <div className="text-xs text-slate-400">
                        {c.regional_apelido ? `${c.regional_apelido} • ` : ""}ID: {c.regional_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {c.cidade || c.estado ? `${c.cidade || "–"} / ${c.estado || "–"}` : <span className="text-slate-400 italic">–</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        title={`${info.nome}: ${info.resumo}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border ${info.cor}`}
                      >
                        <span>[{info.sigla}]</span>
                        <span>{info.chefeLabel}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.nome}</div>
                      {c.cpf && <div className="text-xs text-slate-400">{fmtCPF(c.cpf)}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const st = cadastroStatus(c);
                        if (st === "concluido") return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">✅ Concluído</span>;
                        if (st === "expirado") return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">⏰ Expirado</span>;
                        if (st === "pendente") return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">⏳ Pendente</span>;
                        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500">–</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">{statusBadge(c)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        ref={el => { btnRefs.current[c.id] = el; }}
                        onClick={() => {
                          if (menuAberto === c.id) { setMenuAberto(null); return; }
                          const el = btnRefs.current[c.id];
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            const flipUp = rect.bottom + 220 > window.innerHeight;
                            setMenuPos({ top: flipUp ? rect.top : rect.bottom + 4, left: rect.right - 208, flipUp });
                          }
                          setMenuAberto(c.id);
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
        const c = chefes.find(x => x.id === menuAberto);
        if (!c) return null;
        const isAtivo = Number(c.ativo) === 1;
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
              <button
                onClick={() => { if (isAtivo) abrirEditar(c); }}
                disabled={isInativo}
                className={`flex items-center w-full px-4 py-2.5 text-sm transition gap-2 ${
                  isAtivo ? "text-slate-700 hover:bg-slate-50 cursor-pointer" : "text-slate-400 cursor-not-allowed"
                }`}>
                <svg className={`h-4 w-4 ${isAtivo ? "text-blue-500" : "text-slate-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                Editar dados
              </button>

              <button
                onClick={() => { if (isAtivo) abrirSubstituir(c); }}
                disabled={isInativo}
                className={`flex items-center w-full px-4 py-2.5 text-sm transition gap-2 ${
                  isAtivo ? "text-slate-700 hover:bg-slate-50 cursor-pointer" : "text-slate-400 cursor-not-allowed"
                }`}>
                <svg className={`h-4 w-4 ${isAtivo ? "text-indigo-500" : "text-slate-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                Substituir chefe
              </button>

              {cadastroStatus(c) !== "concluido" && isAtivo && (
                <button onClick={() => handleRegenerarCodigo(c)} disabled={gerandoCodigo}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-teal-600 hover:bg-teal-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
                  {gerandoCodigo ? "Gerando..." : "Gerar código"}
                </button>
              )}

              <div className="border-t border-slate-100 my-1" />

              {isAtivo && (
                <button onClick={() => abrirConfirm("bloqueado", c)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Bloquear
                </button>
              )}

              {isInativo && (
                <button onClick={() => abrirConfirm("ativo", c)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Reativar
                </button>
              )}

              {isAtivo && (
                <button onClick={() => abrirConfirm("cancelado", c)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Cancelar chefe
                </button>
              )}

              {isInativo && (
                <button onClick={() => abrirExcluir(c)}
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
              <h2 className="text-lg font-bold text-slate-800">Vincular Chefe de Regional (CRE / SEEDF)</h2>
              <button onClick={() => { setModalVincular(false); setConviteResult(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            <form onSubmit={handleVincular} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coordenação Regional de Ensino (CRE) *</label>
                <select required value={chefeRegionalId} onChange={e => setChefeRegionalId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">Selecione uma Regional</option>
                  {regionais.map(reg => (
                    <option key={reg.id} value={reg.id}>
                      {reg.apelido ? `${reg.apelido} — ${reg.nome}` : reg.nome} (ID: {reg.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Unidade Orgânica SEEDF *</label>
                <select
                  value={chefePapel}
                  onChange={e => setChefePapel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {UNIDADES_CRE_SEEDF.map(u => (
                    <option key={u.papelKey} value={u.papelKey}>
                      [{u.sigla}] {u.chefeLabel} — {u.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {papelInfo(chefePapel).resumo}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                <input type="text" required value={chefeNome} onChange={e => setChefeNome(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nome do Coordenador Regional ou Chefe de Unidade" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                <input type="text" required value={chefeCpf} onChange={e => setChefeCpf(fmtCPF(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:outline-none ${
                    cpfCompleto(chefeCpf) && !validarCPF(chefeCpf)
                      ? "border-red-400 focus:ring-red-400 bg-red-50"
                      : "border-slate-300 focus:ring-blue-500"
                  }`} placeholder="000.000.000-00" maxLength={14} />
                {cpfCompleto(chefeCpf) && !validarCPF(chefeCpf) && (
                  <p className="text-xs text-red-500 mt-1">⚠ CPF inválido — verifique os dígitos.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input type="email" value={chefeEmail} onChange={e => setChefeEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="chefe@edu.se.df.gov.br" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalVincular(false); setConviteResult(null); }}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoVinc}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvandoVinc ? "Vinculando..." : "Vincular Chefe"}
                </button>
              </div>
            </form>
            {conviteResult && (() => {
              const linkVinc = `${window.location.origin}/ativar-diretor?token=${conviteResult.convite_token}`;
              const msgVinc = `Olá, *${chefeNome || "Chefe Regional"}*! 👋\n\nSeu acesso ao sistema *Educa.Melhor* (${conviteResult.papel_label || "Coordenação Regional"}) foi liberado.\n\nClique no link abaixo para criar sua senha e ativar sua conta:\n${linkVinc}\n\n⏰ Este link expira em: ${new Date(conviteResult.expira_em).toLocaleString("pt-BR")}\n\n_Equipe Educa.Melhor_`;
              return (
                <div className="mx-6 mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 mb-3">✅ {conviteResult.papel_label || "Chefe"} vinculado(a)!</h3>
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Link de ativação</label>
                    <input type="text" readOnly value={linkVinc}
                      onClick={e => { e.target.select(); navigator.clipboard?.writeText(linkVinc); mostrarMensagem("📋 Link copiado!"); }}
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-xs font-mono bg-white text-green-900 cursor-pointer hover:bg-green-50 transition" />
                    <p className="text-xs text-green-600 mt-1">
                      Expira em: {new Date(conviteResult.expira_em).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard?.writeText(linkVinc); mostrarMensagem("📋 Link copiado!"); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg transition text-xs">
                      Copiar link
                    </button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(msgVinc)}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition text-xs">
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
              <h2 className="text-lg font-bold text-slate-800">Editar Chefe Regional</h2>
              <button onClick={() => setModalEditar(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            <form onSubmit={handleEditar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Unidade SEEDF</label>
                <select
                  value={editPapel}
                  onChange={e => setEditPapel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {UNIDADES_CRE_SEEDF.map(u => (
                    <option key={u.papelKey} value={u.papelKey}>
                      [{u.sigla}] {u.chefeLabel}
                    </option>
                  ))}
                </select>
              </div>
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
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvandoEdit ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ MODAL SUBSTITUIR ═══════ */}
      {modalSubstituir && subChefe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Substituir Chefe</h2>
              <button onClick={() => { setModalSubstituir(false); setSubConviteResult(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            <div className="px-6 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                <strong>Substituindo:</strong> {subChefe.nome} — {subChefe.regional_nome} ({papelInfo(subChefe.papel).chefeLabel})
                <br /><span className="text-xs text-slate-400">O chefe atual será desativado e o novo assumirá a mesma função na Regional.</span>
              </div>
            </div>
            <form onSubmit={handleSubstituir} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do novo chefe *</label>
                <input type="text" required value={subNome} onChange={e => setSubNome(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nome completo" autoFocus />
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
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="novo.chefe@edu.se.df.gov.br" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalSubstituir(false); setSubConviteResult(null); }}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoSub}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvandoSub ? "Substituindo..." : "Confirmar Substituição"}
                </button>
              </div>
            </form>
            {subConviteResult && (() => {
              const linkSub = `${window.location.origin}/ativar-diretor?token=${subConviteResult.convite_token}`;
              const msgSub = `Olá, *${subNome || "Chefe Regional"}*! 👋\n\nSeu acesso ao sistema *Educa.Melhor* foi liberado.\n\nClique no link abaixo para criar sua senha e ativar sua conta:\n${linkSub}\n\n⏰ Este link expira em: ${new Date(subConviteResult.expira_em).toLocaleString("pt-BR")}\n\n_Equipe Educa.Melhor_`;
              return (
                <div className="mx-6 mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 mb-3">✅ Novo chefe vinculado!</h3>
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Link de ativação</label>
                    <input type="text" readOnly value={linkSub}
                      onClick={e => { e.target.select(); navigator.clipboard?.writeText(linkSub); mostrarMensagem("📋 Link copiado!"); }}
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-xs font-mono bg-white text-green-900 cursor-pointer hover:bg-green-50 transition" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard?.writeText(linkSub); mostrarMensagem("📋 Link copiado!"); }}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg transition text-xs">
                      Copiar link
                    </button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(msgSub)}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition text-xs">
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
                  <h3 className="font-bold text-slate-800">Cancelar chefe?</h3>
                  <p className="text-sm text-slate-500">O chefe <strong>{modalConfirm.chefe.nome}</strong> será desativado.</p>
                </div>
              </div>
            ) : modalConfirm.tipo === "bloqueado" ? (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Bloquear chefe?</h3>
                  <p className="text-sm text-slate-500"><strong>{modalConfirm.chefe.nome}</strong> não poderá acessar o sistema.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Reativar chefe?</h3>
                  <p className="text-sm text-slate-500"><strong>{modalConfirm.chefe.nome}</strong> voltará a acessar o sistema.</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModalConfirm(null)} disabled={executandoStatus}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition disabled:opacity-50">
                Voltar
              </button>
              <button onClick={handleAlterarStatus} disabled={executandoStatus}
                className={`flex-1 font-medium py-2.5 rounded-lg transition text-white disabled:opacity-50 ${
                  modalConfirm.tipo === "cancelado" ? "bg-red-600 hover:bg-red-700"
                    : modalConfirm.tipo === "bloqueado" ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-green-600 hover:bg-green-700"
                }`}>
                {executandoStatus ? "Processando..." : modalConfirm.tipo === "cancelado" ? "Sim, cancelar" : modalConfirm.tipo === "bloqueado" ? "Sim, bloquear" : "Sim, reativar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL EXCLUIR CHEFE ═══════ */}
      {modalExcluir && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5">
              <h3 className="text-white font-bold text-lg">Excluir Chefe Regional</h3>
              <p className="text-white/80 text-sm">Esta ação é irreversível</p>
            </div>
            <div className="px-6 py-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <p className="font-bold text-slate-800 text-lg">{modalExcluir.nome}</p>
                {modalExcluir.cpf && <p className="text-sm text-slate-500">CPF: {fmtCPF(modalExcluir.cpf)}</p>}
                {modalExcluir.regional_nome && <p className="text-sm text-slate-500">Regional: {modalExcluir.regional_nome}</p>}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setModalExcluir(null)} disabled={executandoExclusao}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={handleExcluir} disabled={executandoExclusao}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition">
                {executandoExclusao ? "Excluindo..." : "Sim, excluir permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL CÓDIGO DE ACESSO ═══════ */}
      {modalCodigo && (() => {
        const linkAtivacao = `${window.location.origin}/ativar-diretor?token=${modalCodigo.convite_token}`;
        const msgWhats = `Olá, *${modalCodigo.chefe_nome}*! 👋\n\nSeu acesso ao sistema *Educa.Melhor* foi liberado.\n\nClique no link abaixo para criar sua senha e ativar sua conta:\n${linkAtivacao}\n\n⏰ Este link expira em: ${new Date(modalCodigo.expira_em).toLocaleString("pt-BR")}\n\n_Equipe Educa.Melhor_`;
        const whatsUrl = `https://wa.me/?text=${encodeURIComponent(msgWhats)}`;

        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
              <h3 className="font-bold text-slate-800 text-lg mb-1">Convite Gerado</h3>
              <p className="text-sm text-slate-500 mb-4">{modalCodigo.chefe_nome}</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Link de ativação</label>
                <input
                  type="text"
                  readOnly
                  value={linkAtivacao}
                  onClick={e => { e.target.select(); navigator.clipboard?.writeText(linkAtivacao); mostrarMensagem("📋 Link copiado!"); }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono bg-white text-slate-700 cursor-pointer"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Expira em: {new Date(modalCodigo.expira_em).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { navigator.clipboard?.writeText(linkAtivacao); mostrarMensagem("📋 Link copiado!"); }}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition text-sm">
                  Copiar link
                </button>
                <a href={whatsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition text-sm">
                  Enviar via WhatsApp
                </a>
              </div>
              <button onClick={() => setModalCodigo(null)}
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
