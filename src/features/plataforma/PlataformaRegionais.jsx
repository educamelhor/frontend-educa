import React, { useState, useEffect, useRef } from "react";
import api from "../../services/api";

// ── Unidades Orgânicas oficiais de uma CRE na SEEDF ──
export const UNIDADES_CRE_SEEDF = [
  {
    sigla: "GABINETE",
    nome: "Gabinete da CRE",
    chefeLabel: "Coordenador(a) Regional de Ensino",
    papelKey: "coordenador_regional",
    cor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    resumo: "Coordenação geral política, pedagógica e administrativa da Regional junto à SEEDF e às unidades escolares.",
  },
  {
    sigla: "UNIEB",
    nome: "Unidade Regional de Educação Básica",
    chefeLabel: "Chefe da UNIEB",
    papelKey: "chefe_unieb",
    cor: "bg-blue-100 text-blue-700 border-blue-200",
    resumo: "Articulação pedagógica, Projeto Político-Pedagógico (PPP), Educação Inclusiva/AEE, avaliação e combate à evasão.",
  },
  {
    sigla: "UNIPLAT",
    nome: "Unidade Reg. de Planejamento Educacional e Tecnologia",
    chefeLabel: "Chefe da UNIPLAT",
    papelKey: "chefe_uniplat",
    cor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    resumo: "Planejamento de rede, matrículas, escrituração escolar, Censo Escolar (Educacenso) e tecnologia educacional.",
  },
  {
    sigla: "UNIGEP",
    nome: "Unidade Regional de Gestão de Pessoas",
    chefeLabel: "Chefe da UNIGEP",
    papelKey: "chefe_unigep",
    cor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    resumo: "Vida funcional dos servidores, modulação, distribuição de carga horária, carências, ponto, abonos e licenças.",
  },
  {
    sigla: "UNIAE",
    nome: "Unidade Reg. de Infraestrutura e Apoio ao Estudante",
    chefeLabel: "Chefe da UNIAE",
    papelKey: "chefe_uniae",
    cor: "bg-amber-100 text-amber-800 border-amber-200",
    resumo: "Alimentação escolar (merenda), transporte escolar, assistência ao estudante, obras, manutenção e serviços terceirizados.",
  },
  {
    sigla: "UNIAG",
    nome: "Unidade Regional de Administração Geral",
    chefeLabel: "Chefe da UNIAG",
    papelKey: "chefe_uniag",
    cor: "bg-purple-100 text-purple-700 border-purple-200",
    resumo: "Execução administrativa, financeira, patrimônio, contratos e prestação de contas (PDAF / PDDE).",
  },
];

// ── Catálogo oficial das 14 Coordenações Regionais de Ensino da SEEDF ──
export const CATALOGO_CRES_SEEDF = [
  { codigo: "CRE-PP",   nome: "Coordenação Regional de Ensino do Plano Piloto",       apelido: "CRE Plano Piloto",       cidade: "Brasília (Plano Piloto / Cruzeiro)", estado: "DF" },
  { codigo: "CRE-GAMA", nome: "Coordenação Regional de Ensino do Gama",               apelido: "CRE Gama",               cidade: "Gama",                               estado: "DF" },
  { codigo: "CRE-TAG",  nome: "Coordenação Regional de Ensino de Taguatinga",         apelido: "CRE Taguatinga",         cidade: "Taguatinga / Águas Claras",          estado: "DF" },
  { codigo: "CRE-BRAZ", nome: "Coordenação Regional de Ensino de Brazlândia",         apelido: "CRE Brazlândia",         cidade: "Brazlândia",                         estado: "DF" },
  { codigo: "CRE-SOB",  nome: "Coordenação Regional de Ensino de Sobradinho",         apelido: "CRE Sobradinho",         cidade: "Sobradinho",                         estado: "DF" },
  { codigo: "CRE-PLAN", nome: "Coordenação Regional de Ensino de Planaltina",         apelido: "CRE Planaltina",         cidade: "Planaltina",                         estado: "DF" },
  { codigo: "CRE-PAR",  nome: "Coordenação Regional de Ensino do Paranoá",            apelido: "CRE Paranoá",            cidade: "Paranoá / Itapoã",                   estado: "DF" },
  { codigo: "CRE-NB",   nome: "Coordenação Regional de Ensino do Núcleo Bandeirante", apelido: "CRE Núcleo Bandeirante", cidade: "Núcleo Bandeirante / Riacho Fundo",  estado: "DF" },
  { codigo: "CRE-CEIL", nome: "Coordenação Regional de Ensino de Ceilândia",          apelido: "CRE Ceilândia",          cidade: "Ceilândia",                          estado: "DF" },
  { codigo: "CRE-GUA",  nome: "Coordenação Regional de Ensino do Guará",              apelido: "CRE Guará",              cidade: "Guará / Estrutural",                 estado: "DF" },
  { codigo: "CRE-SAM",  nome: "Coordenação Regional de Ensino de Samambaia",          apelido: "CRE Samambaia",          cidade: "Samambaia",                          estado: "DF" },
  { codigo: "CRE-SM",   nome: "Coordenação Regional de Ensino de Santa Maria",        apelido: "CRE Santa Maria",        cidade: "Santa Maria",                        estado: "DF" },
  { codigo: "CRE-SS",   nome: "Coordenação Regional de Ensino de São Sebastião",      apelido: "CRE São Sebastião",      cidade: "São Sebastião / Jardim Botânico",    estado: "DF" },
  { codigo: "CRE-REC",  nome: "Coordenação Regional de Ensino do Recanto das Emas",   apelido: "CRE Recanto das Emas",   cidade: "Recanto das Emas",                   estado: "DF" },
];

const ORIGENS = [
  { value: "publica", label: "Pública (SEEDF / Rede Estadual)" },
  { value: "particular", label: "Particular / Rede Privada" },
];

export default function PlataformaRegionais() {
  const [regionais, setRegionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarGuiaSeedf, setMostrarGuiaSeedf] = useState(false);

  // ── Modais ──────────────────────────────────
  const [modalCriar, setModalCriar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalChefe, setModalChefe] = useState(false);
  const [modalConfirm, setModalConfirm] = useState(null); // { tipo, regional }

  // Form Regional (criar/editar)
  const [editId, setEditId] = useState(null);
  const [presetCre, setPresetCre] = useState("");
  const [fNome, setFNome] = useState("");
  const [fApelido, setFApelido] = useState("");
  const [fCidade, setFCidade] = useState("");
  const [fEstado, setFEstado] = useState("DF");
  const [fEndereco, setFEndereco] = useState("");
  const [fTipos, setFTipos] = useState(["GABINETE", "UNIEB", "UNIPLAT", "UNIGEP", "UNIAE", "UNIAG"]);
  const [fOrigem, setFOrigem] = useState("publica");
  const [fCnpj, setFCnpj] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Form Chefe (vincular direto pela Regional)
  const [chefeRegionalId, setChefeRegionalId] = useState(null);
  const [chefeNome, setChefeNome] = useState("");
  const [chefeCpf, setChefeCpf] = useState("");
  const [chefeEmail, setChefeEmail] = useState("");
  const [chefePapel, setChefePapel] = useState("coordenador_regional");
  const [salvandoChefe, setSalvandoChefe] = useState(false);
  const [conviteResult, setConviteResult] = useState(null);

  // Dropdown menu (fixed position)
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, flipUp: false });
  const menuRef = useRef(null);
  const btnRefs = useRef({});

  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  useEffect(() => { fetchRegionais(); }, []);

  const fetchRegionais = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/plataforma/regionais");
      setRegionais(Array.isArray(data) ? data : data.regionais || []);
    } catch {
      mostrarMensagem("Erro ao carregar regionais.", "erro");
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 6000);
  };

  const algumModalAberto = modalCriar || modalEditar || modalChefe || !!modalConfirm;

  const renderMensagem = () =>
    mensagem.texto ? (
      <div className={`p-3 rounded-lg font-medium text-sm ${
        mensagem.tipo === "erro"
          ? "bg-red-100 text-red-800 border border-red-200"
          : "bg-green-100 text-green-800 border border-green-200"
      }`}>{mensagem.texto}</div>
    ) : null;

  // ── Helpers ─────────────────────────────────
  const toggleTipo = (sigla) =>
    setFTipos(prev => prev.includes(sigla) ? prev.filter(x => x !== sigla) : [...prev, sigla]);

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

  const resetFormRegional = () => {
    setEditId(null);
    setPresetCre("");
    setFNome("");
    setFApelido("");
    setFCidade("");
    setFEstado("DF");
    setFEndereco("");
    setFTipos(["GABINETE", "UNIEB", "UNIPLAT", "UNIGEP", "UNIAE", "UNIAG"]);
    setFOrigem("publica");
    setFCnpj("");
  };

  const resetFormChefe = () => {
    setChefeNome("");
    setChefeCpf("");
    setChefeEmail("");
    setChefePapel("coordenador_regional");
    setConviteResult(null);
  };

  const handleSelecionarPresetCre = (codigo) => {
    setPresetCre(codigo);
    const item = CATALOGO_CRES_SEEDF.find(c => c.codigo === codigo);
    if (item) {
      setFNome(item.nome);
      setFApelido(item.apelido);
      setFCidade(item.cidade);
      setFEstado(item.estado);
      setFOrigem("publica");
      setFTipos(["GABINETE", "UNIEB", "UNIPLAT", "UNIGEP", "UNIAE", "UNIAG"]);
    }
  };

  // ── Actions ─────────────────────────────────
  const abrirCriar = () => { resetFormRegional(); setModalCriar(true); setMenuAberto(null); };

  const abrirEditar = (reg) => {
    setEditId(reg.id);
    setPresetCre("");
    setFNome(reg.nome || "");
    setFApelido(reg.apelido || "");
    setFCidade(reg.cidade || "");
    setFEstado(reg.estado || "DF");
    setFEndereco(reg.endereco || "");
    const t = parseTipo(reg.tipo);
    setFTipos(t.length ? t : ["GABINETE", "UNIEB", "UNIPLAT", "UNIGEP", "UNIAE", "UNIAG"]);
    setFOrigem(reg.origem || "publica");
    setFCnpj(reg.cnpj || "");
    setModalEditar(true);
    setMenuAberto(null);
  };

  const abrirChefe = (reg) => {
    resetFormChefe();
    setChefeRegionalId(reg.id);
    setModalChefe(true);
    setMenuAberto(null);
  };

  const abrirConfirm = (tipo, regional) => {
    setModalConfirm({ tipo, regional });
    setMenuAberto(null);
  };

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!fNome.trim()) return;
    setSalvando(true);
    try {
      await api.post("/api/plataforma/regionais", {
        nome: fNome.trim(),
        apelido: fApelido.trim() || undefined,
        codigo_cre: presetCre || undefined,
        endereco: fEndereco.trim() || undefined,
        cidade: fCidade.trim() || undefined,
        estado: fEstado.trim() || "DF",
        tipo: fTipos.length ? fTipos : undefined,
        origem: fOrigem || "publica",
        cnpj: fCnpj.trim() || undefined,
      });
      mostrarMensagem("✅ Regional criada com sucesso!");
      setModalCriar(false);
      resetFormRegional();
      fetchRegionais();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao criar regional."}`, "erro");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    if (!fNome.trim()) return;
    setSalvando(true);
    try {
      await api.put(`/api/plataforma/regionais/${editId}`, {
        nome: fNome.trim(),
        apelido: fApelido.trim() || undefined,
        endereco: fEndereco.trim() || undefined,
        cidade: fCidade.trim() || undefined,
        estado: fEstado.trim() || undefined,
        tipo: fTipos.length ? fTipos : [],
        origem: fOrigem || undefined,
        cnpj: fCnpj.trim() || undefined,
      });
      mostrarMensagem("✅ Regional atualizada!");
      setModalEditar(false);
      resetFormRegional();
      fetchRegionais();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao editar regional."}`, "erro");
    } finally {
      setSalvando(false);
    }
  };

  const handleCriarChefe = async (e) => {
    e.preventDefault();
    if (!chefeNome.trim() || !chefeCpf.trim()) return;
    if (!validarCPF(chefeCpf)) {
      mostrarMensagem("❌ CPF inválido. Verifique os dígitos informados.", "erro");
      return;
    }
    setSalvandoChefe(true);
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
      fetchRegionais();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao vincular chefe."}`, "erro");
    } finally {
      setSalvandoChefe(false);
    }
  };

  const handleAlterarStatus = async () => {
    if (!modalConfirm) return;
    const { tipo, regional } = modalConfirm;
    try {
      await api.patch(`/api/plataforma/regionais/${regional.id}/status`, { status: tipo });
      const labels = { bloqueada: "bloqueada", cancelada: "cancelada", ativa: "reativada" };
      mostrarMensagem(`✅ Regional ${labels[tipo] || tipo} com sucesso!`);
      setModalConfirm(null);
      fetchRegionais();
    } catch (err) {
      mostrarMensagem(`❌ ${err?.response?.data?.message || "Erro ao alterar status."}`, "erro");
    }
  };

  // ── Filtragem ───────────────────────────────
  const regionaisFiltradas = regionais.filter((reg) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const chefesNomes = (reg.chefes || []).map(c => c.nome).join(" ");
    return [reg.nome, reg.apelido, reg.cidade, reg.cnpj, reg.coordenador_regional, chefesNomes, String(reg.id)]
      .some(v => String(v || "").toLowerCase().includes(q));
  });

  const statusBadge = (s) => {
    switch (s) {
      case "ativa": return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Ativa</span>;
      case "bloqueada": return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">Bloqueada</span>;
      case "cancelada": return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">Cancelada</span>;
      default: return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Ativa</span>;
    }
  };

  const renderFormRegional = (onSubmit, btnLabel, isCriar = false) => (
    <form onSubmit={onSubmit} className="p-6 space-y-4">
      {isCriar && (
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-blue-800 mb-1.5">
            🏛️ Catálogo Oficial SEEDF — 14 Coordenações Regionais de Ensino (Opcional)
          </label>
          <select
            value={presetCre}
            onChange={e => handleSelecionarPresetCre(e.target.value)}
            className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Preencher manualmente ou escolher uma CRE da SEEDF --</option>
            {CATALOGO_CRES_SEEDF.map(c => (
              <option key={c.codigo} value={c.codigo}>
                {c.apelido} — {c.cidade}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-blue-600 mt-1">
            Ao selecionar uma CRE acima, os campos e as Unidades Orgânicas padrão da SEEDF são preenchidos automaticamente.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Regional (CRE) *</label>
        <input type="text" required value={fNome} onChange={e => setFNome(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Ex: Coordenação Regional de Ensino de Planaltina" autoFocus />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Sigla / Apelido</label>
        <input type="text" value={fApelido} onChange={e => setFApelido(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Ex: CRE Planaltina" />
        <p className="text-xs text-slate-400 mt-1">Se vazio, será igual ao nome.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Endereço da Sede Regional</label>
        <input type="text" value={fEndereco} onChange={e => setFEndereco(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Ex: Setor Educacional, Lote A — Planaltina/DF" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Região Administrativa / Cidade</label>
          <input type="text" value={fCidade} onChange={e => setFCidade(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Planaltina" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
          <input type="text" value={fEstado} onChange={e => setFEstado(e.target.value.toUpperCase().slice(0, 2))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="DF" maxLength={2} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Unidades Orgânicas da Regional (Estrutura SEEDF)
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Selecione as unidades/setores ativos nesta Coordenação Regional de Ensino:
        </p>
        <div className="flex flex-wrap gap-2">
          {UNIDADES_CRE_SEEDF.map(u => {
            const ativo = fTipos.includes(u.sigla);
            return (
              <button
                key={u.sigla}
                type="button"
                onClick={() => toggleTipo(u.sigla)}
                title={`${u.nome}: ${u.resumo}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left ${
                  ativo
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                }`}
              >
                {u.sigla} <span className={`font-normal ${ativo ? "text-blue-100" : "text-slate-400"}`}>• {u.nome.replace("Unidade Regional de ", "").replace("Unidade Reg. de ", "")}</span>
              </button>
            );
          })}
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
          placeholder="00.039.468/0001-01" maxLength={18} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => { setModalCriar(false); setModalEditar(false); }}
          className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={salvando}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
          {salvando ? "Salvando..." : btnLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Coordenações Regionais de Ensino (Regionais)</h1>
          <p className="text-sm text-slate-500">
            Gestão de Coordenações Regionais de Ensino (padrão SEEDF — 14 CREs e Unidades Orgânicas UNIEB, UNIPLAT, UNIGEP, UNIAE e UNIAG)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarGuiaSeedf(v => !v)}
            className="flex items-center gap-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3.5 py-2.5 rounded-lg transition text-sm"
          >
            <span>🏛️</span>
            <span>{mostrarGuiaSeedf ? "Ocultar Estrutura SEEDF" : "Estrutura CRE / SEEDF"}</span>
          </button>
          <button onClick={abrirCriar}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition shadow-sm">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Adicionar Regional
          </button>
        </div>
      </div>

      {/* Painel Explicativo da Estrutura Oficial SEEDF */}
      {mostrarGuiaSeedf && (
        <div className="mb-6 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-blue-800/40">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-300 bg-blue-900/60 px-2.5 py-0.5 rounded-full">
                Organograma Oficial SEEDF
              </span>
              <h3 className="text-lg font-bold mt-1">
                Como funcionam as 14 Coordenações Regionais de Ensino (CREs) e seus Chefes
              </h3>
            </div>
            <button onClick={() => setMostrarGuiaSeedf(false)} className="text-blue-300 hover:text-white text-sm">✕</button>
          </div>
          <p className="text-xs text-blue-100/90 mb-4 leading-relaxed">
            Na Secretaria de Estado de Educação do Distrito Federal (SEEDF), cada Região Administrativa conta com uma <strong>Coordenação Regional de Ensino (CRE)</strong> responsável por supervisionar as escolas de sua jurisdição. Cada CRE é liderada por um <strong>Coordenador(a) Regional de Ensino</strong> e estruturada em <strong>5 Unidades Orgânicas</strong> chefiadas por seus respectivos Chefes de Unidade:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {UNIDADES_CRE_SEEDF.map(u => (
              <div key={u.sigla} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-amber-300">{u.sigla}</span>
                  <span className="text-[11px] text-blue-200 font-medium">{u.chefeLabel}</span>
                </div>
                <div className="text-xs font-semibold text-white mb-1">{u.nome}</div>
                <p className="text-[11px] text-blue-100/80 leading-snug">{u.resumo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
          placeholder="Buscar por nome da CRE, sigla, cidade/RA, CNPJ, coordenador ou chefe..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-500">Carregando regionais...</div>
      ) : regionaisFiltradas.length === 0 ? (
        <div className="text-center p-16 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-lg mb-2">{busca.trim() ? "Nenhuma regional encontrada." : "Nenhuma Coordenação Regional de Ensino cadastrada."}</p>
          <p className="text-sm text-slate-400 mb-4">Clique em "Adicionar Regional" para cadastrar uma CRE da SEEDF e vincular seus Chefes.</p>
          <button onClick={abrirCriar} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + Cadastrar Primeira Regional
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Coordenação Regional (CRE)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Região / UF</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Unidades Orgânicas (SEEDF)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Origem</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Chefia Vinculada</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regionaisFiltradas.map((reg) => {
                const tipos = parseTipo(reg.tipo);
                const isCancelada = reg.status === "cancelada";
                const chefesAtivos = (reg.chefes || []).filter(c => Number(c.ativo) === 1);
                return (
                  <tr key={reg.id} className={`hover:bg-slate-50 transition ${isCancelada ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">#{reg.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{reg.nome}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {reg.apelido && reg.apelido !== reg.nome && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{reg.apelido}</span>
                        )}
                        {Number(reg.total_escolas) > 0 && (
                          <span className="text-xs text-slate-500">{reg.total_escolas} escola(s) vinculada(s)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {reg.cidade || reg.estado ? `${reg.cidade || "–"} / ${reg.estado || "–"}` : <span className="text-slate-400 italic">–</span>}
                    </td>
                    <td className="px-4 py-3">
                      {tipos.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tipos.map(t => {
                            const info = UNIDADES_CRE_SEEDF.find(u => u.sigla === t);
                            return (
                              <span
                                key={t}
                                title={info ? `${info.nome} — ${info.resumo}` : t}
                                className={`px-2 py-0.5 rounded text-xs font-semibold border ${info?.cor || "bg-blue-100 text-blue-700 border-blue-200"}`}
                              >
                                {t}
                              </span>
                            );
                          })}
                        </div>
                      ) : <span className="text-slate-400 italic text-xs">–</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {reg.origem === "publica" ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">Pública</span>
                      ) : reg.origem === "particular" ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">Particular</span>
                      ) : <span className="text-slate-400 italic text-xs">–</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {chefesAtivos.length > 0 ? (
                        <div className="space-y-1 text-xs">
                          {chefesAtivos.map(c => {
                            const uInfo = UNIDADES_CRE_SEEDF.find(u => u.papelKey === c.cargo_regional);
                            const badgeSigla = uInfo ? uInfo.sigla : "CHEFE";
                            return (
                              <div key={c.id} className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-500">[{badgeSigla}]</span>
                                <span className="text-slate-800 font-medium">{c.nome}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Sem chefe vinculado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(reg.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        ref={el => { btnRefs.current[reg.id] = el; }}
                        onClick={() => {
                          if (menuAberto === reg.id) { setMenuAberto(null); return; }
                          const el = btnRefs.current[reg.id];
                          if (el) {
                            const rect = el.getBoundingClientRect();
                            const flipUp = rect.bottom + 250 > window.innerHeight;
                            setMenuPos({
                              top: flipUp ? rect.top : rect.bottom + 4,
                              left: rect.right - 208,
                              flipUp,
                            });
                          }
                          setMenuAberto(reg.id);
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
        const reg = regionais.find(r => r.id === menuAberto);
        if (!reg) return null;
        return (
          <>
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
              <button onClick={() => abrirEditar(reg)}
                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition gap-2">
                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                Editar dados
              </button>

              {reg.status !== "cancelada" && (
                <button onClick={() => abrirChefe(reg)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition gap-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
                  Vincular chefe
                </button>
              )}

              <div className="border-t border-slate-100 my-1" />

              {reg.status === "ativa" && (
                <button onClick={() => abrirConfirm("bloqueada", reg)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Bloquear regional
                </button>
              )}
              {reg.status === "bloqueada" && (
                <button onClick={() => abrirConfirm("ativa", reg)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Desbloquear regional
                </button>
              )}

              {reg.status !== "cancelada" && (
                <button onClick={() => abrirConfirm("cancelada", reg)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Cancelar regional
                </button>
              )}
            </div>
          </>
        );
      })()}

      {/* ═══════ MODAL CRIAR ═══════ */}
      {modalCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Nova Coordenação Regional de Ensino (CRE)</h2>
              <button onClick={() => setModalCriar(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            {renderFormRegional(handleCriar, "Criar Regional", true)}
          </div>
        </div>
      )}

      {/* ═══════ MODAL EDITAR ═══════ */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Editar Regional #{editId}</h2>
              <button onClick={() => setModalEditar(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            {renderFormRegional(handleEditar, "Salvar Alterações", false)}
          </div>
        </div>
      )}

      {/* ═══════ MODAL VINCULAR CHEFE ═══════ */}
      {modalChefe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                Vincular Chefe — {regionais.find(r => r.id === chefeRegionalId)?.apelido || `#${chefeRegionalId}`}
              </h2>
              <button onClick={() => { setModalChefe(false); setConviteResult(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4">{renderMensagem()}</div>
            <form onSubmit={handleCriarChefe} className="p-6 space-y-4">
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
                <button type="button" onClick={() => { setModalChefe(false); setConviteResult(null); }}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoChefe}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
                  {salvandoChefe ? "Vinculando..." : "Vincular Chefe"}
                </button>
              </div>
            </form>
            {conviteResult && (
              <div className="mx-6 mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ {conviteResult.papel_label || "Chefe"} vinculado(a)!</h3>
                <p className="text-sm text-green-700">Expira: {new Date(conviteResult.expira_em).toLocaleString("pt-BR")}</p>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-green-700 mb-1">Link de ativação:</label>
                  <input type="text" readOnly value={`${window.location.origin}/ativar-diretor?token=${conviteResult.convite_token}`}
                    onClick={e => {
                      e.target.select();
                      navigator.clipboard?.writeText(`${window.location.origin}/ativar-diretor?token=${conviteResult.convite_token}`);
                      mostrarMensagem("📋 Link copiado!");
                    }}
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
                    <h3 className="font-bold text-slate-800">Cancelar regional?</h3>
                    <p className="text-sm text-slate-500">Esta ação é irreversível.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  A regional <strong>{modalConfirm.regional.nome}</strong> será cancelada permanentemente e não poderá ser reativada.
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
                    <h3 className="font-bold text-slate-800">Bloquear regional?</h3>
                    <p className="text-sm text-slate-500">Pode ser desbloqueada depois.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  A regional <strong>{modalConfirm.regional.nome}</strong> será bloqueada temporariamente.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Desbloquear regional?</h3>
                  <p className="text-sm text-slate-500">A regional voltará a funcionar normalmente.</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModalConfirm(null)}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition">
                Cancelar
              </button>
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
