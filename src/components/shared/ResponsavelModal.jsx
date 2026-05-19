// src/components/shared/ResponsavelModal.jsx
// ─────────────────────────────────────────────────────────────
// Modal premium compartilhado entre Secretaria e Disciplinar
// Modos: "view" (somente leitura) e "edit" (formulário)
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import {
  UserGroupIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  IdentificationIcon,
  UserIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  LinkSlashIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";

// ── Formatters ──
function formatCpfDisplay(cpf) {
  if (!cpf) return "—";
  const d = String(cpf).replace(/\D/g, "").padStart(11, "0");
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatCpfInput(val) {
  return val
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
}

function formatTelefone(val) {
  return val
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{4,5})(\d{4})/, "$1-$2")
    .substring(0, 15);
}

function validarCPF(cpfRaw) {
  const digits = cpfRaw.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(digits.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(digits.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits.charAt(10))) return false;
  return true;
}

// ── Relacionamento display ──
const RELACIONAMENTO_MAP = {
  MAE: "Mãe",
  PAI: "Pai",
  RESPONSAVEL: "Responsável Legal",
  AVO: "Avô / Avó",
  TIA: "Tio / Tia",
  OUTRO: "Outro",
};

/**
 * @param {Object} props
 * @param {boolean} props.open      — whether the modal is visible
 * @param {"view"|"edit"} props.mode — "view" for read-only, "edit" for editing
 * @param {number|null} props.responsavelId — the ID to fetch (null → new)
 * @param {Function} props.onClose   — close handler
 * @param {Function} props.onSaved   — called after a successful save
 */
export default function ResponsavelModal({
  open,
  mode = "view",
  responsavelId = null,
  onClose,
  onSaved,
}) {
  // ── Loading state ──
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // ── Form state ──
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneSecundario, setTelefoneSecundario] = useState("");
  const [endereco, setEndereco] = useState("");
  const [alunoId, setAlunoId] = useState("");
  const [alunoNome, setAlunoNome] = useState("");
  const [relacionamento, setRelacionamento] = useState("RESPONSAVEL");

  // ── Autocomplete state ──
  const [buscaAlunoQuery, setBuscaAlunoQuery] = useState("");
  const [alunosOptions, setAlunosOptions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [buscandoAlunos, setBuscandoAlunos] = useState(false);
  const dropdownRef = useRef(null);

  // ── Save state ──
  const [salvando, setSalvando] = useState(false);

  // ── Confirm vinculo state ──
  const [confirmVinculo, setConfirmVinculo] = useState(null);

  // ── Confirm desvínculo state ──
  const [confirmDesvincular, setConfirmDesvincular] = useState(null); // { vinculo_id, aluno_nome }

  // ── Fetch data when opening ──
  useEffect(() => {
    if (!open) return;
    if (!responsavelId) {
      setData(null);
      resetForm();
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data: resp } = await api.get(`/api/responsaveis/${responsavelId}/detalhe`);
        setData(resp);
        populateForm(resp);
      } catch (err) {
        console.error("Erro ao buscar responsável:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, responsavelId]);

  function resetForm() {
    setNome(""); setCpf(""); setEmail(""); setTelefone("");
    setTelefoneSecundario(""); setEndereco(""); setAlunoId("");
    setAlunoNome(""); setRelacionamento("RESPONSAVEL");
    setBuscaAlunoQuery(""); setShowDropdown(false);
  }

  function populateForm(d) {
    setNome(d.nome || "");
    setCpf(d.cpf ? formatCpfInput(d.cpf) : "");
    setEmail(d.email || "");
    setTelefone(d.telefone_celular ? formatTelefone(d.telefone_celular) : "");
    setTelefoneSecundario(d.telefone_secundario ? formatTelefone(d.telefone_secundario) : "");
    setEndereco(d.endereco || "");
    setAlunoId(""); setAlunoNome("");
    setBuscaAlunoQuery(""); setShowDropdown(false);
    setRelacionamento("RESPONSAVEL");
  }

  // ── Click outside dropdown ──
  useEffect(() => {
    function handle(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Student autocomplete ──
  useEffect(() => {
    if (mode !== "edit" || !open) return;
    const t = setTimeout(async () => {
      if (buscaAlunoQuery.length < 2) { setAlunosOptions([]); return; }
      setBuscandoAlunos(true);
      try {
        const { data } = await api.get(`/api/responsaveis/buscar-alunos?busca=${buscaAlunoQuery}`);
        setAlunosOptions(data);
        setShowDropdown(true);
      } catch { /* silent */ } finally {
        setBuscandoAlunos(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [buscaAlunoQuery, mode, open]);

  // ── Validation ──
  const camposVazios = {
    nome: !nome.trim(),
    cpf: !cpf.trim(),
    telefone: !telefone.trim(),
    endereco: !endereco.trim(),
    aluno: !responsavelId && !alunoId,
  };
  const qtdVazios = Object.values(camposVazios).filter(Boolean).length;
  const canSave = nome.trim() && cpf.trim() && telefone.trim() && endereco.trim() && (responsavelId || alunoId);

  // ── Save ──
  async function handleSave(e) {
    e?.preventDefault();
    if (!nome.trim()) return alert("O nome não pode estar vazio.");
    if (!cpf.trim()) return alert("O CPF é obrigatório.");
    if (!validarCPF(cpf)) return alert("CPF inválido. Verifique os dígitos e tente novamente.");
    if (!telefone.trim()) return alert("O Telefone Principal é obrigatório.");
    if (!endereco.trim()) return alert("O Endereço é obrigatório.");
    if (!responsavelId && !alunoId) return alert("O vínculo com um estudante é obrigatório.");

    // Confirm new vinculo if editing + selected a new student
    if (responsavelId && alunoId) {
      setConfirmVinculo({ nome: alunoNome });
      return;
    }

    await executeSave();
  }

  async function executeSave(overridePayload) {
    setSalvando(true);
    try {
      const payload = overridePayload || {
        nome: nome.trim(),
        cpf: cpf.trim() || null,
        email: email.trim() || null,
        telefone_celular: telefone.trim() || null,
        telefone_secundario: telefoneSecundario.trim() || null,
        endereco: endereco.trim() || null,
        aluno_id: alunoId || null,
        relacionamento,
      };
      if (responsavelId) {
        await api.put(`/api/responsaveis/${responsavelId}`, payload);
      } else {
        await api.post("/api/responsaveis", payload);
      }
      setConfirmVinculo(null);
      onSaved?.();
      onClose?.();
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  // ── Desvincular aluno específico ──
  async function handleDesvincular() {
    if (!confirmDesvincular) return;
    setSalvando(true);
    try {
      await api.delete(`/api/responsaveis/vinculo/${confirmDesvincular.vinculo_id}`);
      setConfirmDesvincular(null);
      // Recarrega os dados atualizados do responsável
      const { data: resp } = await api.get(`/api/responsaveis/${responsavelId}/detalhe`);
      setData(resp);
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao desvincular aluno.");
    } finally {
      setSalvando(false);
    }
  }

  // ────────────────────────────────────────────
  //  VIEW MODE
  // ────────────────────────────────────────────
  function renderViewContent() {
    if (loading) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Carregando dados…</span>
        </div>
      );
    }
    if (!data) return null;

    const info = [
      { icon: IdentificationIcon, label: "CPF", value: formatCpfDisplay(data.cpf), mono: true },
      { icon: PhoneIcon, label: "Telefone Principal", value: data.telefone_celular ? formatTelefone(data.telefone_celular) : null },
      { icon: PhoneIcon, label: "Telefone Secundário", value: data.telefone_secundario ? formatTelefone(data.telefone_secundario) : null },
      { icon: EnvelopeIcon, label: "E-mail", value: data.email },
      { icon: MapPinIcon, label: "Endereço", value: data.endereco },
    ];

    return (
      <div className="space-y-5">
        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {info.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 bg-slate-50/80 rounded-xl px-4 py-3.5 border border-slate-100"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon className="w-4 h-4 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                  {item.label}
                </p>
                {item.value ? (
                  <p className={`text-sm text-gray-800 ${item.mono ? "font-mono" : "font-medium"} break-words`}>
                    {item.value}
                  </p>
                ) : (
                  <p className="text-sm text-gray-300 italic">Não informado</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Estudantes vinculados */}
        {data.alunos_detalhes && data.alunos_detalhes.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <AcademicCapIcon className="w-4 h-4" />
              Estudantes Vinculados
            </h4>
            <div className="space-y-2">
              {data.alunos_detalhes.map((al) => (
                <div
                  key={al.vinculo_id}
                  className="flex items-center gap-3 bg-blue-50/60 rounded-xl px-4 py-3 border border-blue-100"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-bold text-xs">
                      {(al.aluno_nome || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{al.aluno_nome}</p>
                    <p className="text-xs text-gray-400">RE: {al.aluno_codigo}</p>
                  </div>
                  {al.relacionamento && (
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {RELACIONAMENTO_MAP[al.relacionamento] || al.relacionamento}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────
  //  EDIT MODE
  // ────────────────────────────────────────────
  function renderEditContent() {
    if (loading) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Carregando dados…</span>
        </div>
      );
    }

    return (
      <form onSubmit={handleSave} className="space-y-4">
        {/* Warning banner */}
        {qtdVazios > 0 && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Campos obrigatórios pendentes</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Para salvar, preencha {qtdVazios === 1 ? "o" : "os"}{" "}
                <strong>{qtdVazios} campo{qtdVazios > 1 ? "s" : ""}</strong> restante{qtdVazios > 1 ? "s" : ""}.
              </p>
            </div>
          </div>
        )}

        {/* Nome */}
        <div>
          <label className={`block text-sm font-semibold mb-1.5 ${camposVazios.nome ? "text-red-600" : "text-gray-700"}`}>
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

        {/* CPF + Telefone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${camposVazios.cpf ? "text-red-600" : "text-gray-700"}`}>
              CPF *
            </label>
            <input
              type="text"
              required
              maxLength="14"
              value={cpf}
              onChange={(e) => setCpf(formatCpfInput(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-700"
            />
          </div>
          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${camposVazios.telefone ? "text-red-600" : "text-gray-700"}`}>
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

        {/* Tel 2 + Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700">
              Telefone 2 (Secundário)
              <span className="text-xs font-normal text-gray-400 ml-1">— opcional</span>
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
            <label className="block text-sm font-semibold mb-1.5 text-gray-700">
              E-mail
              <span className="text-xs font-normal text-gray-400 ml-1">— opcional</span>
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

        {/* Endereço */}
        <div>
          <label className={`block text-sm font-semibold mb-1.5 ${camposVazios.endereco ? "text-red-600" : "text-gray-700"}`}>
            Endereço *
          </label>
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Ex: QD 03 CJ F Lt 01 — Arapoanga, Planaltina-DF"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-700"
          />
        </div>

        {/* Estudantes já vinculados (view only, in edit mode) */}
        {data?.alunos_detalhes?.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AcademicCapIcon className="w-3.5 h-3.5" />
              Estudantes Vinculados ({data.alunos_detalhes.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {data.alunos_detalhes.map((al) => (
                <span
                  key={al.vinculo_id}
                  className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100 group"
                >
                  <AcademicCapIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {al.aluno_nome}
                  <span className="text-blue-400 font-normal">RE: {al.aluno_codigo}</span>
                  <button
                    type="button"
                    title="Desvincular estudante"
                    onClick={() => setConfirmDesvincular({ vinculo_id: al.vinculo_id, aluno_nome: al.aluno_nome })}
                    className="ml-0.5 w-4 h-4 rounded-full bg-red-100 hover:bg-red-500 flex items-center justify-center text-red-400 hover:text-white transition-all duration-150 flex-shrink-0"
                  >
                    <XMarkIcon className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Vincular Estudante */}
        <div className="pt-2 border-t border-gray-100" ref={dropdownRef}>
          <label className={`block text-sm font-semibold mb-1.5 mt-2 ${camposVazios.aluno ? "text-red-600" : "text-gray-700"}`}>
            {responsavelId ? "Adicionar Novo Vínculo de Estudante" : "Vincular Estudante *"}
          </label>
          {alunoId ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">{alunoNome}</span>
              </div>
              <button
                type="button"
                onClick={() => { setAlunoId(""); setAlunoNome(""); setBuscaAlunoQuery(""); }}
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
              {showDropdown && buscaAlunoQuery.length >= 2 && (
                <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5">
                  {buscandoAlunos ? (
                    <li className="px-4 py-3 text-sm text-gray-500 text-center flex justify-center gap-2 items-center">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      Buscando...
                    </li>
                  ) : alunosOptions.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-gray-500 text-center">Nenhum aluno encontrado.</li>
                  ) : (
                    alunosOptions.map((al) => (
                      <li
                        key={al.id}
                        onClick={() => { setAlunoId(al.id); setAlunoNome(al.estudante); setShowDropdown(false); }}
                        className="cursor-pointer px-4 py-2.5 hover:bg-blue-50 text-gray-700 text-sm border-b border-gray-50 last:border-0"
                      >
                        <div className="font-semibold">{al.estudante}</div>
                        {al.codigo && <div className="text-xs text-gray-400">RE: {al.codigo}</div>}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}

          {alunoId && (
            <div className="mt-3">
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
            {responsavelId ? "Adicione novos vínculos se necessário." : "Você poderá gerenciar mais vínculos posteriormente."}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando || !canSave}
            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed flex items-center gap-2 ${
              !canSave
                ? "bg-gray-300 shadow-gray-300/30"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 disabled:opacity-50"
            }`}
          >
            {salvando && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    );
  }

  // ────────────────────────────────────────────
  //  MAIN RENDER
  // ────────────────────────────────────────────
  const isView = mode === "view";
  const title = isView
    ? (data?.nome || "Responsável")
    : responsavelId
    ? "Editar Responsável"
    : "Novo Responsável";
  const subtitle = isView
    ? "Informações de contato e vínculos"
    : responsavelId
    ? "Atualize os dados de contato."
    : "Crie e vincule um responsável a um aluno.";

  return (
    <>
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-visible rounded-2xl bg-white shadow-2xl transition-all border border-gray-100">
                  {/* ── Premium Header ── */}
                  <div className={`px-7 py-5 rounded-t-2xl ${
                    isView
                      ? "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500"
                      : "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                          {isView ? (
                            <UserIcon className="w-6 h-6 text-white" />
                          ) : (
                            <PencilSquareIcon className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <Dialog.Title as="h3" className="text-lg font-bold text-white leading-tight truncate max-w-xs">
                            {title}
                          </Dialog.Title>
                          <p className={`text-sm mt-0.5 ${isView ? "text-slate-200" : "text-blue-100"}`}>
                            {subtitle}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5 text-white/80" />
                      </button>
                    </div>
                  </div>

                  {/* ── Body ── */}
                  <div className="px-7 py-6">
                    {isView ? renderViewContent() : renderEditContent()}

                    {/* Close button for view mode */}
                    {isView && !loading && (
                      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-xl shadow-sm transition-all active:scale-95"
                        >
                          Fechar
                        </button>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ── Confirm Vinculo Modal ── */}
      <Transition appear show={!!confirmVinculo} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setConfirmVinculo(null)}>
          <Transition.Child as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-7 shadow-2xl transition-all border border-gray-100 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <UserGroupIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <Dialog.Title as="h3" className="text-lg font-bold text-gray-800 mb-2">
                    Confirmar Novo Vínculo
                  </Dialog.Title>
                  <p className="text-sm text-gray-600 mb-1">Deseja vincular o estudante</p>
                  <p className="text-sm font-bold text-blue-700 bg-blue-50 inline-block px-3 py-1 rounded-lg mb-3">
                    {confirmVinculo?.nome}
                  </p>
                  <p className="text-sm text-gray-600 mb-6">a este responsável?</p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmVinculo(null)}
                      className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const payload = {
                          nome: nome.trim(),
                          cpf: cpf.trim() || null,
                          email: email.trim() || null,
                          telefone_celular: telefone.trim() || null,
                          telefone_secundario: telefoneSecundario.trim() || null,
                          endereco: endereco.trim() || null,
                          aluno_id: alunoId || null,
                          relacionamento,
                        };
                        executeSave(payload);
                      }}
                      disabled={salvando}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {salvando && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Sim, Vincular
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ── Modal Premium de Confirmação de Desvínculo ── */}
      <Transition appear show={!!confirmDesvincular} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setConfirmDesvincular(null)}>
          <Transition.Child as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-100">
                  {/* Header vermelho premium */}
                  <div className="bg-gradient-to-r from-red-600 via-red-500 to-rose-500 px-6 pt-6 pb-8 text-center relative">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30 mb-3">
                      <LinkSlashIcon className="w-7 h-7 text-white" />
                    </div>
                    <Dialog.Title as="h3" className="text-lg font-bold text-white leading-tight">
                      Desvincular Estudante
                    </Dialog.Title>
                    <p className="text-red-100 text-sm mt-1">Esta ação removerá o acesso deste responsável</p>
                  </div>

                  {/* Body */}
                  <div className="px-6 pb-6">
                    {/* Card com o nome do aluno — sobrepõe o header */}
                    <div className="-mt-5 mb-5 bg-white rounded-xl border border-red-100 shadow-lg shadow-red-500/10 px-4 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 font-bold text-sm">
                          {(confirmDesvincular?.aluno_nome || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Estudante</p>
                        <p className="text-sm font-bold text-gray-800">{confirmDesvincular?.aluno_nome}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-1.5">
                      Ao confirmar, este responsável <strong>perderá o acesso</strong> aos dados e comunicações relacionados a este estudante.
                    </p>
                    <p className="text-xs text-gray-400 mb-6">
                      ⚠️ Use em casos como divórcio ou mudança de guarda. O estudante permanece cadastrado normalmente.
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirmDesvincular(null)}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleDesvincular}
                        disabled={salvando}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-sm shadow-red-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {salvando
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <LinkSlashIcon className="w-4 h-4" />
                        }
                        Sim, Desvincular
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
