import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import api from "../../../services/api";

export default function ResponsaveisDisciplinar() {
  const [responsaveis, setResponsaveis] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form fields
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneSecundario, setTelefoneSecundario] = useState("");
  const [alunoId, setAlunoId] = useState("");
  const [alunoNome, setAlunoNome] = useState("");
  const [relacionamento, setRelacionamento] = useState("RESPONSAVEL");

  const [salvando, setSalvando] = useState(false);

  // Pesquisa Restrita na tela
  const [buscaTela, setBuscaTela] = useState("");

  // Pesquisa Aluno (Autocomplete)
  const [buscandoAlunos, setBuscandoAlunos] = useState(false);
  const [alunosOptions, setAlunosOptions] = useState([]);
  const [buscaAlunoQuery, setBuscaAlunoQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Modal Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Fechar dropdown de aluno se clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchResponsaveis = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/responsaveis");
      setResponsaveis(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao listar responsáveis:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponsaveis();
  }, []);

  // Debounce e busca de alunos
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!isModalOpen || editingId || buscaAlunoQuery.length < 2) {
        setAlunosOptions([]);
        return;
      }
      setBuscandoAlunos(true);
      try {
        const { data } = await api.get(`/api/responsaveis/buscar-alunos?busca=${buscaAlunoQuery}`);
        setAlunosOptions(data);
        setShowDropdown(true);
      } catch (err) {
        console.error("Erro ao buscar alunos", err);
      } finally {
        setBuscandoAlunos(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [buscaAlunoQuery, isModalOpen, editingId]);

  const responsaveisFiltrados = useMemo(() => {
    const lista = [...responsaveis].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
    if (!buscaTela.trim()) return lista;
    const termo = buscaTela.toLowerCase().trim();
    const termoNumerico = termo.replace(/\D/g, ""); // Remove non-digits for CPF/Phone search

    return lista.filter((r) => {
      const matchNome = r.nome.toLowerCase().includes(termo);
      const matchAluno = r.alunos_vinculados && r.alunos_vinculados.toLowerCase().includes(termo);
      const matchCpf = r.cpf && termoNumerico && r.cpf.replace(/\D/g, "").includes(termoNumerico);
      const matchTelefone = r.telefone_celular && termoNumerico && r.telefone_celular.replace(/\D/g, "").includes(termoNumerico);
      const matchTelefoneSec = r.telefone_secundario && termoNumerico && r.telefone_secundario.replace(/\D/g, "").includes(termoNumerico);

      return matchNome || matchAluno || matchCpf || matchTelefone || matchTelefoneSec;
    });
  }, [responsaveis, buscaTela]);

  const openNewModal = () => {
    setEditingId(null);
    setNome("");
    setCpf("");
    setEmail("");
    setTelefone("");
    setTelefoneSecundario("");
    setAlunoId("");
    setAlunoNome("");
    setRelacionamento("RESPONSAVEL");
    setBuscaAlunoQuery("");
    setShowDropdown(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setNome(item.nome);
    setCpf(item.cpf || "");
    setEmail(item.email || "");
    setTelefone(item.telefone_celular || "");
    setTelefoneSecundario(item.telefone_secundario || "");
    // Edição apenas atualiza dados do responsável, não o aluno.
    setAlunoId("");
    setAlunoNome("");
    setIsModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return alert("O nome não pode estar vazio.");
    if (!cpf.trim()) return alert("O CPF é obrigatório.");
    if (!telefone.trim()) return alert("O Telefone Principal é obrigatório.");
    
    // Na criação do registro, é obrigatório vincular um estudante.
    if (!editingId && !alunoId) {
       return alert("O vínculo com um estudante é obrigatório.");
    }

    setSalvando(true);
    try {
      if (editingId) {
        await api.put(`/api/responsaveis/${editingId}`, { 
          nome: nome.trim(), 
          cpf: cpf.trim() || null, 
          email: email.trim() || null, 
          telefone_celular: telefone.trim() || null,
          telefone_secundario: telefoneSecundario.trim() || null,
          aluno_id: alunoId || null,
          relacionamento 
        });
      } else {
        await api.post("/api/responsaveis", { 
          nome: nome.trim(), 
          cpf: cpf.trim() || null, 
          email: email.trim() || null, 
          telefone_celular: telefone.trim() || null,
          telefone_secundario: telefoneSecundario.trim() || null,
          aluno_id: alunoId || null,
          relacionamento // Usando o estado selecionado ('MÃE', 'PAI', etc.)
        });
      }
      setIsModalOpen(false);
      fetchResponsaveis();
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setExcluindo(true);
    try {
      await api.delete(`/api/responsaveis/${deletingItem.id}`);
      setIsDeleteModalOpen(false);
      fetchResponsaveis();
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  };

  const formatCpf = (val) => {
    return val
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatTelefone = (val) => {
    return val
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4,5})(\d{4})/, "$1-$2")
      .substring(0, 15);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── HEADER ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight">Responsáveis</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Consulte, edite e registre familiares e responsáveis
            </p>
          </div>
        </div>

        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {responsaveis.length} {responsaveis.length === 1 ? "responsável" : "responsáveis"} vinculado{responsaveis.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou aluno..."
              value={buscaTela}
              onChange={(e) => setBuscaTela(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all whitespace-nowrap"
          >
            <PlusIcon className="w-4 h-4" />
            Novo Registro
          </button>
        </div>
      </div>

      {/* ── LISTA ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando dados...</span>
          </div>
        ) : responsaveisFiltrados.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center gap-2">
            <UserGroupIcon className="w-10 h-10 text-gray-200" />
            <p className="text-gray-500 font-medium">
              {buscaTela ? `Nenhum resultado para "${buscaTela}"` : "Nenhum responsável registrado"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Nome do Responsável</th>
                  <th className="px-6 py-4 font-semibold">CPF</th>
                  <th className="px-6 py-4 font-semibold">Contato</th>
                  <th className="px-6 py-4 font-semibold">Alunos Vinculados</th>
                  <th className="px-6 py-4 font-semibold text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {responsaveisFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {item.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {item.cpf ? formatCpf(item.cpf) : <span className="text-gray-300 italic">Não informado</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        {item.telefone_celular && <span>1º: {formatTelefone(item.telefone_celular)}</span>}
                        {item.telefone_secundario && <span>2º: {formatTelefone(item.telefone_secundario)}</span>}
                        {item.email && <span className="text-xs text-gray-400">{item.email}</span>}
                        {!item.telefone_celular && !item.telefone_secundario && !item.email && <span className="text-gray-300 italic text-sm">Sem contato</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                      {item.alunos_vinculados ? (
                        <ul className="flex flex-col gap-1">
                          {item.alunos_vinculados.split(', ').map((aluno, idx) => (
                            <li key={idx} className="truncate" title={aluno}>• {aluno}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-red-400 text-xs bg-red-50 px-2 py-1 rounded-full">Sem vínculo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => alert("Em breve irá liberar acesso ao app EDUCA-MOBILE para os responsáveis.")}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Autorizar app EDUCA-MOBILE"
                        >
                          <DevicePhoneMobileIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar responsável"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover vínculo"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-400">
          <span>{responsaveis.length} registros no total</span>
          {buscaTela && <span>Exibindo {responsaveisFiltrados.length} resultados</span>}
        </div>
      </div>

      {/* ── MODAL NOVO/EDITAR ────────────────────── */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-visible rounded-2xl bg-white p-7 shadow-2xl transition-all border border-gray-100">
                  <Dialog.Title as="h3" className="text-xl font-bold text-gray-800 mb-1">
                    {editingId ? "Editar Responsável" : "Novo Responsável"}
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 mb-6">
                    {editingId ? "Atualize os dados de contato." : "Crie e vincule um responsável a um aluno."}
                  </p>

                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        autoFocus
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: Maria José da Silva"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          CPF *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength="14"
                          value={cpf}
                          onChange={(e) => setCpf(formatCpf(e.target.value))}
                          placeholder="000.000.000-00"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Telefone Principal *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength="15"
                          value={telefone}
                          onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Telefone 2 (Secundário)
                        </label>
                        <input
                          type="text"
                          maxLength="15"
                          value={telefoneSecundario}
                          onChange={(e) => setTelefoneSecundario(formatTelefone(e.target.value))}
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="maria@email.com"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-700"
                        />
                      </div>
                    </div>

                    {/* Vínculo de Aluno (Adicionar novo vínculo) */}
                    <div className="pt-2 border-t border-gray-100" ref={dropdownRef}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 mt-2">
                        {editingId ? "Novo Vínculo de Estudante (Opcional)" : "Vincular Estudante *"}
                      </label>
                        {alunoId ? (
                          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-xl">
                            <div className="flex items-center gap-2">
                              <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                              <span className="text-sm font-semibold text-blue-900">{alunoNome}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAlunoId("");
                                setAlunoNome("");
                                setBuscaAlunoQuery("");
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                            >
                              Remover
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                              type="text"
                              value={buscaAlunoQuery}
                              onChange={(e) => setBuscaAlunoQuery(e.target.value)}
                              placeholder="Pesquise o nome do estudante..."
                              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                            {/* Autocomplete Dropdown */}
                            {showDropdown && (buscaAlunoQuery.length >= 2) && (
                              <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                {buscandoAlunos ? (
                                  <li className="relative cursor-default select-none px-4 py-3 text-sm text-gray-500 text-center flex justify-center gap-2 items-center">
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" /> Buscando...
                                  </li>
                                ) : alunosOptions.length === 0 ? (
                                  <li className="relative cursor-default select-none px-4 py-3 text-sm text-gray-500 text-center">
                                    Nenhum aluno encontrado.
                                  </li>
                                ) : (
                                  alunosOptions.map((al) => (
                                    <li
                                      key={al.id}
                                      onClick={() => {
                                        setAlunoId(al.id);
                                        setAlunoNome(al.estudante);
                                        setShowDropdown(false);
                                      }}
                                      className="relative cursor-pointer select-none px-4 py-2.5 hover:bg-blue-50 text-gray-700 text-sm border-b border-gray-50 last:border-0"
                                    >
                                      <div className="font-semibold">{al.estudante}</div>
                                      {al.codigo && <div className="text-xs text-gray-400">Código: {al.codigo}</div>}
                                    </li>
                                  ))
                                )}
                              </ul>
                            )}
                          </div>
                        )}
                        
                        {alunoId && (
                           <div className="mt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                              Grau de Parentesco / Vínculo *
                            </label>
                            <select
                              value={relacionamento}
                              onChange={(e) => setRelacionamento(e.target.value)}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-no-repeat bg-[position:right_10px_center]"
                            >
                              <option value="MAE">Mãe</option>
                              <option value="PAI">Pai</option>
                              <option value="RESPONSAVEL">Responsável Legal (Padrão)</option>
                              <option value="AVO">Avô / Avó</option>
                              <option value="TIA">Tio / Tia</option>
                              <option value="OUTRO">Outro</option>
                            </select>
                           </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2.5 ml-1">
                          Você poderá gerenciar mais vínculos posteriormente.
                        </p>
                      </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={salvando}
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {salvando && (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        Salvar
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ── MODAL EXCLUIR VÍNCULO ─────────────────── */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-7 text-center shadow-2xl transition-all border border-gray-100">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-4 ring-8 ring-red-50/50">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <Dialog.Title as="h3" className="text-xl font-bold text-gray-800 mb-2">
                    Remover Vínculo?
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 mb-6 px-2">
                    Tem certeza que deseja remover todos os vínculos de <span className="font-semibold text-gray-700">{deletingItem?.nome}</span> com a sua escola?
                  </p>

                  <div className="bg-orange-50 text-orange-800 text-xs px-4 py-3 rounded-lg mb-6 text-left leading-relaxed">
                    <span className="font-semibold block mb-0.5">Aviso:</span>
                    Esta ação apenas remove o acesso da sua escola aos dados deste responsável. O cadastro global permanecerá intacto.
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 focus:outline-none transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={excluindo}
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 shadow-sm shadow-red-600/30 focus:outline-none active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                    >
                      {excluindo && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      Sim, Remover
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
