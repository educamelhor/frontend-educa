import React, { useState, useEffect, useRef } from "react";
import api from "../../services/api";

const TIPOS_ESCOLA = [
  "Infantil", "Anos Iniciais", "Anos Finais", "Ensino Médio",
  "Profissionalizante", "Integral", "CCMDF",
];
const ORIGENS = [
  { value: "publica", label: "Pública" },
  { value: "particular", label: "Particular" },
];

export default function PlataformaEscolas() {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // ── Modais ──────────────────────────────────
  const [modalCriar, setModalCriar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalDiretor, setModalDiretor] = useState(false);
  const [modalConfirm, setModalConfirm] = useState(null); // { tipo, escola }

  // Form Escola (criar/editar)
  const [editId, setEditId] = useState(null);
  const [fNome, setFNome] = useState("");
  const [fApelido, setFApelido] = useState("");
  const [fCidade, setFCidade] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fEndereco, setFEndereco] = useState("");
  const [fTipos, setFTipos] = useState([]);
  const [fOrigem, setFOrigem] = useState("");
  const [fCnpj, setFCnpj] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Form Diretor
  const [dirEscolaId, setDirEscolaId] = useState(null);
  const [dirNome, setDirNome] = useState("");
  const [dirCpf, setDirCpf] = useState("");
  const [dirEmail, setDirEmail] = useState("");
  const [dirPapel, setDirPapel] = useState("diretor");
  const [salvandoDir, setSalvandoDir] = useState(false);
  const [conviteResult, setConviteResult] = useState(null);

  // Dropdown menu (fixed position)
  const [menuAberto, setMenuAberto] = useState(null); // escola id
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, flipUp: false });
  const menuRef = useRef(null);
  const btnRefs = useRef({});

  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  // ── Fetch ───────────────────────────────────
  useEffect(() => { fetchEscolas(); }, []);

  const fetchEscolas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/plataforma/escolas");
      setEscolas(Array.isArray(data) ? data : data.escolas || []);
    } catch { mostrarMensagem("Erro ao carregar escolas.", "erro"); }
    finally { setLoading(false); }
  };

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 6000);
  };

  const algumModalAberto = modalCriar || modalEditar || modalDiretor || !!modalConfirm;

  // Componente de feedback reutilizável (dentro de modais ou na página)
  const renderMensagem = () =>
    mensagem.texto ? (
      <div className={`p-3 rounded-lg font-medium text-sm ${
        mensagem.tipo === "erro"
          ? "bg-red-100 text-red-800 border border-red-200"
          : "bg-green-100 text-green-800 border border-green-200"
      }`}>{mensagem.texto}</div>
    ) : null;

  // ── Helpers ─────────────────────────────────
  const toggleTipo = (t) => setFTipos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const fmtCNPJ = (v) => {
    const n = v.replace(/\D/g, "").slice(0, 14);
    if (n.length <= 2) return n;
    if (n.length <= 5) return n.replace(/(\d{2})(\d{0,3})/, "$1.$2");
    if (n.length <= 8) return n.replace(/(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
    if (n.length <= 12) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
    return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
  };

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

  const parseTipo = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v); } catch { return []; }
  };

  const resetFormEscola = () => {
    setEditId(null); setFNome(""); setFApelido(""); setFCidade(""); setFEstado(""); setFEndereco("");
    setFTipos([]); setFOrigem(""); setFCnpj("");
  };

  const resetFormDiretor = () => {
    setDirNome(""); setDirCpf(""); setDirEmail(""); setDirPapel("diretor"); setConviteResult(null);
  };

  // ── Actions ─────────────────────────────────
  const abrirCriar = () => { resetFormEscola(); setModalCriar(true); setMenuAberto(null); };

  const abrirEditar = (esc) => {
    setEditId(esc.id);
    setFNome(esc.nome || "");
    setFApelido(esc.apelido || "");
    setFCidade(esc.cidade || "");
    setFEstado(esc.estado || "");
    setFEndereco(esc.endereco || "");
    setFTipos(parseTipo(esc.tipo));
    setFOrigem(esc.origem || "");
    setFCnpj(esc.cnpj || "");
    setModalEditar(true);
    setMenuAberto(null);
  };

  const abrirDiretor = (esc) => {
    resetFormDiretor();
    setDirEscolaId(esc.id);
    const tipos = parseTipo(esc.tipo);
    setDirPapel(tipos.includes("CCMDF") ? "diretor_pedagogico" : "diretor");
    setModalDiretor(true);
    setMenuAberto(null);
  };

  const abrirConfirm = (tipo, escola) => {
    setModalConfirm({ tipo, escola });
    setMenuAberto(null);
  };

  // Criar escola
  const handleCriar = async (e) => {
    e.preventDefault();
    if (!fNome.trim()) return;
    setSalvando(true);
    try {
      await api.post("/api/plataforma/escolas", {
        nome: fNome.trim(), apelido: fApelido.trim() || undefined,
        endereco: fEndereco.trim() || undefined,
        cidade: fCidade.trim() || undefined, estado: fEstado.trim() || undefined,
        tipo: fTipos.length ? fTipos : undefined, origem: fOrigem || undefined,
        cnpj: fCnpj.trim() || undefined,
      });
      mostrarMensagem("✅ Escola criada!"); setModalCriar(false); resetFormEscola(); fetchEscolas();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao criar escola."}`, "erro");
    } finally { setSalvando(false); }
  };

  // Editar escola
  const handleEditar = async (e) => {
    e.preventDefault();
    if (!fNome.trim()) return;
    setSalvando(true);
    try {
      await api.put(`/api/plataforma/escolas/${editId}`, {
        nome: fNome.trim(), apelido: fApelido.trim() || undefined,
        endereco: fEndereco.trim() || undefined,
        cidade: fCidade.trim() || undefined, estado: fEstado.trim() || undefined,
        tipo: fTipos.length ? fTipos : [], origem: fOrigem || undefined,
        cnpj: fCnpj.trim() || undefined,
      });
      mostrarMensagem("✅ Escola atualizada!"); setModalEditar(false); resetFormEscola(); fetchEscolas();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao editar."}`, "erro");
    } finally { setSalvando(false); }
  };

  // Vincular diretor
  const handleCriarDiretor = async (e) => {
    e.preventDefault();
    if (!dirNome.trim() || !dirCpf.trim()) return;
    if (!validarCPF(dirCpf)) {
      mostrarMensagem("❌ CPF inválido. Verifique os dígitos informados.", "erro");
      return;
    }
    setSalvandoDir(true); setConviteResult(null);
    try {
      const { data } = await api.post(`/api/plataforma/escolas/${dirEscolaId}/diretor`, {
        nome: dirNome.trim(), cpf: dirCpf.replace(/\D/g, ""),
        email: dirEmail.trim() || undefined, papel: dirPapel,
      });
      setConviteResult(data);
      mostrarMensagem(`✅ ${data.papel_label || "Diretor"} vinculado!`);
      setDirNome(""); setDirCpf(""); setDirEmail("");
      fetchEscolas();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao vincular diretor."}`, "erro");
    } finally { setSalvandoDir(false); }
  };

  // Alterar status
  const handleAlterarStatus = async () => {
    if (!modalConfirm) return;
    const { tipo, escola } = modalConfirm;
    try {
      await api.patch(`/api/plataforma/escolas/${escola.id}/status`, { status: tipo });
      const labels = { bloqueada: "bloqueada", cancelada: "cancelada", ativa: "reativada" };
      mostrarMensagem(`✅ Escola ${labels[tipo] || tipo} com sucesso!`);
      setModalConfirm(null); fetchEscolas();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao alterar status."}`, "erro");
    }
  };

  // ── Escola selecionada é CCMDF? ─────────────
  const escolaDirIsCCMDF = () => {
    const esc = escolas.find(e => e.id === dirEscolaId);
    return esc ? parseTipo(esc.tipo).includes("CCMDF") : false;
  };
  const isCCMDF = escolaDirIsCCMDF();

  // ── Filtragem ───────────────────────────────
  const escolasFiltradas = escolas.filter((esc) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [esc.nome, esc.apelido, esc.cidade, esc.cnpj, esc.diretor, String(esc.id)]
      .some(v => String(v || "").toLowerCase().includes(q));
  });

  // ── Status helpers ──────────────────────────
  const statusBadge = (s) => {
    switch (s) {
      case "ativa": return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Ativa</span>;
      case "bloqueada": return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">Bloqueada</span>;
      case "cancelada": return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">Cancelada</span>;
      default: return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Ativa</span>;
    }
  };

  // ── Form de escola (reutilizável create/edit) ─
  const renderFormEscola = (onSubmit, btnLabel) => (
    <form onSubmit={onSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Escola *</label>
        <input type="text" required value={fNome} onChange={e => setFNome(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Ex: CEF 04 CEM" autoFocus />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Apelido</label>
        <input type="text" value={fApelido} onChange={e => setFApelido(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Ex: CEF04_PLAN" />
        <p className="text-xs text-slate-400 mt-1">Se vazio, será igual ao nome.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
        <input type="text" value={fEndereco} onChange={e => setFEndereco(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Setor Educacional, Lotes C/D" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
          <input type="text" value={fCidade} onChange={e => setFCidade(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Brasília" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
          <input type="text" value={fEstado} onChange={e => setFEstado(e.target.value.toUpperCase().slice(0,2))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="DF" maxLength={2} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
        <div className="flex flex-wrap gap-2">
          {TIPOS_ESCOLA.map(t => (
            <button key={t} type="button" onClick={() => toggleTipo(t)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                fTipos.includes(t) ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
              }`}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Origem</label>
        <div className="flex gap-6">
          {ORIGENS.map(o => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="origem" value={o.value} checked={fOrigem === o.value}
                onChange={() => setFOrigem(o.value)} className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-slate-700">{o.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
        <input type="text" value={fCnpj} onChange={e => setFCnpj(fmtCNPJ(e.target.value))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="00.000.000/0001-00" maxLength={18} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => { setModalCriar(false); setModalEditar(false); }}
          className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
        <button type="submit" disabled={salvando}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">{salvando ? "Salvando..." : btnLabel}</button>
      </div>
    </form>
  );

  // ── RENDER ──────────────────────────────────
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Escolas</h1>
        <button onClick={abrirCriar}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition shadow-sm">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>Adicionar</button>
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
          placeholder="Buscar por nome, cidade, CNPJ, diretor..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-500">Carregando...</div>
      ) : escolasFiltradas.length === 0 ? (
        <div className="text-center p-16 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-lg mb-2">{busca.trim() ? "Nenhuma escola encontrada." : "Nenhuma escola cadastrada."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Localização</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Origem</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Diretor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {escolasFiltradas.map((esc) => {
                const tipos = parseTipo(esc.tipo);
                const isCcmdf = tipos.includes("CCMDF");
                const isCancelada = esc.status === "cancelada";
                return (
                  <tr key={esc.id} className={`hover:bg-slate-50 transition ${isCancelada ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">#{esc.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{esc.nome}</div>
                      {esc.apelido && esc.apelido !== esc.nome && <div className="text-xs text-slate-400">{esc.apelido}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {esc.cidade || esc.estado ? `${esc.cidade || "–"} / ${esc.estado || "–"}` : <span className="text-slate-400 italic">–</span>}
                    </td>
                    <td className="px-4 py-3">
                      {tipos.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tipos.map(t => (
                            <span key={t} className={`px-2 py-0.5 rounded text-xs font-medium ${t === "CCMDF" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                              {t === "CCMDF" ? "🎖️ CCMDF" : t}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-slate-400 italic text-xs">–</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {esc.origem === "publica" ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">Pública</span>
                        : esc.origem === "particular" ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">Particular</span>
                        : <span className="text-slate-400 italic text-xs">–</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {isCcmdf ? (
                        <div className="space-y-1 text-xs">
                          <div><span className="font-medium text-slate-500">📚 Ped.:</span> {esc.diretor || <span className="text-slate-400 italic">–</span>}</div>
                          <div><span className="font-medium text-slate-500">🎖️ Cmd.:</span> {esc.comandante || <span className="text-slate-400 italic">–</span>}</div>
                        </div>
                      ) : esc.diretor || <span className="text-slate-400 italic">Sem diretor</span>}
                    </td>
                    <td className="px-4 py-3">{statusBadge(esc.status)}</td>

                    {/* ── AÇÕES (botão ⋮) ── */}
                    <td className="px-4 py-3 text-center">
                      <button
                        ref={el => { btnRefs.current[esc.id] = el; }}
                        onClick={() => {
                          if (menuAberto === esc.id) { setMenuAberto(null); return; }
                          const el = btnRefs.current[esc.id];
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            const flipUp = rect.bottom + 250 > window.innerHeight;
                            setMenuPos({
                              top: flipUp ? rect.top : rect.bottom + 4,
                              left: rect.right - 208,
                              flipUp,
                            });
                          }
                          setMenuAberto(esc.id);
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

      {/* ═══ DROPDOWN PORTAL (position:fixed, fora do overflow) ═══ */}
      {menuAberto && (() => {
        const esc = escolas.find(e => e.id === menuAberto);
        if (!esc) return null;
        const tipos = parseTipo(esc.tipo);
        const isCcmdf = tipos.includes("CCMDF");
        return (
          <>
            {/* Overlay de click-outside */}
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuAberto(null)} />
            <div
              ref={menuRef}
              className="fixed z-[70] w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1"
              style={{
                top: menuPos.flipUp ? undefined : menuPos.top,
                bottom: menuPos.flipUp ? (window.innerHeight - menuPos.top + 4) : undefined,
                left: Math.max(8, menuPos.left),
              }}
            >
              {/* 1) Editar */}
              <button onClick={() => abrirEditar(esc)}
                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition gap-2">
                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                Editar dados
              </button>

              <div className="border-t border-slate-100 my-1" />

              {/* 3) Bloquear / Desbloquear */}
              {esc.status === "ativa" && (
                <button onClick={() => abrirConfirm("bloqueada", esc)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Bloquear escola
                </button>
              )}
              {esc.status === "bloqueada" && (
                <button onClick={() => abrirConfirm("ativa", esc)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Desbloquear escola
                </button>
              )}

              {/* 4) Cancelar */}
              {esc.status !== "cancelada" && (
                <button onClick={() => abrirConfirm("cancelada", esc)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Cancelar escola
                </button>
              )}
            </div>
          </>
        );
      })()}

      {/* ═══════ MODAL CRIAR ═══════ */}
      {modalCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Nova Escola</h2>
              <button onClick={() => setModalCriar(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            {renderFormEscola(handleCriar, "Criar Escola")}
          </div>
        </div>
      )}

      {/* ═══════ MODAL EDITAR ═══════ */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Editar Escola #{editId}</h2>
              <button onClick={() => setModalEditar(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            {renderFormEscola(handleEditar, "Salvar Alterações")}
          </div>
        </div>
      )}

      {/* ═══════ MODAL DIRETOR ═══════ */}
      {modalDiretor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                Vincular Diretor — {escolas.find(e => e.id === dirEscolaId)?.nome || `#${dirEscolaId}`}
              </h2>
              <button onClick={() => { setModalDiretor(false); setConviteResult(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            <form onSubmit={handleCriarDiretor} className="p-6 space-y-4">
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
                        <input type="radio" name="dirPapel" value={o.value} checked={dirPapel === o.value} onChange={() => setDirPapel(o.value)} className="w-4 h-4 text-blue-600" />
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
                <button type="button" onClick={() => { setModalDiretor(false); setConviteResult(null); }}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" disabled={salvandoDir}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvandoDir ? "Vinculando..." : isCCMDF ? `Vincular ${dirPapel === "diretor_pedagogico" ? "Dir. Ped." : "Comandante"}` : "Vincular Diretor"}
                </button>
              </div>
            </form>
            {conviteResult && (
              <div className="mx-6 mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ {conviteResult.papel_label || "Diretor"} vinculado!</h3>
                <p className="text-sm text-green-700">Expira: {new Date(conviteResult.expira_em).toLocaleString("pt-BR")}</p>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-green-700 mb-1">Token de ativação:</label>
                  <input type="text" readOnly value={conviteResult.convite_token}
                    onClick={e => { e.target.select(); navigator.clipboard?.writeText(conviteResult.convite_token); }}
                    className="w-full border border-green-300 rounded px-2 py-1 text-xs font-mono bg-white text-green-900 cursor-pointer" />
                  <p className="text-xs text-green-600 mt-1">Clique para copiar.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MODAL CONFIRMAÇÃO (Bloquear/Cancelar/Desbloquear) ═══════ */}
      {modalConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            {modalConfirm.tipo === "cancelada" ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Cancelar escola?</h3>
                    <p className="text-sm text-slate-500">Esta ação é irreversível.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  A escola <strong>{modalConfirm.escola.nome}</strong> será cancelada permanentemente e não poderá ser reativada.
                </p>
              </>
            ) : modalConfirm.tipo === "bloqueada" ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Bloquear escola?</h3>
                    <p className="text-sm text-slate-500">Pode ser desbloqueada depois.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  A escola <strong>{modalConfirm.escola.nome}</strong> será bloqueada. Os usuários não poderão acessar o sistema enquanto estiver bloqueada.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Desbloquear escola?</h3>
                    <p className="text-sm text-slate-500">A escola voltará a funcionar normalmente.</p>
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModalConfirm(null)}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={handleAlterarStatus}
                className={`flex-1 font-medium py-2.5 rounded-lg transition text-white ${
                  modalConfirm.tipo === "cancelada" ? "bg-red-600 hover:bg-red-700"
                    : modalConfirm.tipo === "bloqueada" ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-green-600 hover:bg-green-700"
                }`}>
                {modalConfirm.tipo === "cancelada" ? "Sim, cancelar" : modalConfirm.tipo === "bloqueada" ? "Sim, bloquear" : "Sim, desbloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
