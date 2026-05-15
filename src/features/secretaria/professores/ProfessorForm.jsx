// src/features/professores/ProfessorForm.jsx
// ============================================================================
// Formulário de Professor - DESIGN PREMIUM
// - Suporta criação e edição.
// - NOVO CADASTRO: obrigatórios = CPF, Nome, Turno, Disciplina, Aulas.
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { Button } from "../../../components/ui/Button";
import {
  AcademicCapIcon,
  XMarkIcon,
  IdentificationIcon,
  UserIcon,
  CalendarDaysIcon,
  ClockIcon,
  BookOpenIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import api from "../../../services/api";

// ─────────────────────────────────────────────────────────────
// Util
const toStr = (v) => (v == null ? "" : String(v));
const norm  = (v) => toStr(v).trim().toUpperCase();

// ─────────────────────────────────────────────────────────────
// Badges
const ETAPA_STYLES = {
  fundamental: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  médio:       { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  medio:       { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
};
const TURNO_STYLE = { bg: "#1e3a5f", text: "#ffffff" };

function EtapaBadge({ etapa, inverted }) {
  const key = (etapa ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const s = ETAPA_STYLES[key] ?? { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
  if (inverted) {
    return (
      <span style={{ background: "rgba(255,255,255,0.22)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
        {(etapa ?? "").toUpperCase()}
      </span>
    );
  }
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {(etapa ?? "").toUpperCase()}
    </span>
  );
}

function TurnoBadge({ turno, inverted }) {
  if (inverted) {
    return (
      <span style={{ background: "rgba(255,255,255,0.22)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
        {(turno ?? "").toUpperCase()}
      </span>
    );
  }
  return (
    <span style={{ background: TURNO_STYLE.bg, color: TURNO_STYLE.text, borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {(turno ?? "").toUpperCase()}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal premium de seleção de disciplina
function DisciplinaModal({ open, disciplinas, selectedId, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return disciplinas;
    return disciplinas.filter(d => {
      const nome  = (d.disciplina ?? d.nome ?? "").toLowerCase();
      const etapa = (d.etapa ?? "").toLowerCase();
      const turno = (d.turno ?? "").toLowerCase();
      return nome.includes(q) || etapa.includes(q) || turno.includes(q);
    });
  }, [disciplinas, search]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ zIndex: 100000 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 520, maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-5 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute -top-8 -left-8 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
              <BookOpenIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Selecionar Disciplina</h3>
              <p className="text-blue-200 text-xs">{disciplinas.length} disciplina{disciplinas.length !== 1 ? "s" : ""} disponível{disciplinas.length !== 1 ? "is" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all z-10">
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, etapa ou turno…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">Nenhuma disciplina encontrada</p>
          ) : (
            filtered.map(d => {
              const isSelected = String(d.id) === String(selectedId);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { onSelect(d); onClose(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30"
                      : "hover:bg-blue-50"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? "bg-white/20" : "bg-blue-100 group-hover:bg-blue-200"
                  }`}>
                    {isSelected
                      ? <CheckIcon className="w-4 h-4 text-white" />
                      : <BookOpenIcon className="w-4 h-4 text-blue-600" />}
                  </div>

                  {/* Name */}
                  <span className={`font-bold text-sm flex-1 ${isSelected ? "text-white" : "text-gray-800"}`}>
                    {(d.disciplina ?? d.nome ?? "—").toUpperCase()}
                  </span>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {d.etapa && <EtapaBadge etapa={d.etapa} inverted={isSelected} />}
                    {d.turno && <TurnoBadge turno={d.turno} inverted={isSelected} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// Validação de CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────
export default function ProfessorForm({ open, onClose, onSubmit, onActivate, professor }) {
  const [form, setForm] = useState({ turno: "", disciplina_id: "", aulas: 0, status: "" });
  const [erros, setErros]     = useState({});
  const [enviando, setEnviando] = useState(false);
  const [disciplinas, setDisciplinas] = useState([]);
  const [turnos, setTurnos]   = useState([]);
  const [discModalOpen, setDiscModalOpen] = useState(false);

  const isEditMode = !!professor;

  const selectedDisc = useMemo(
    () => disciplinas.find(d => String(d.id) === String(form.disciplina_id)),
    [disciplinas, form.disciplina_id]
  );

  useEffect(() => {
    if (!open) return;
    if (professor) {
      setForm({
        id: professor.id ?? null,
        cpf: professor.cpf ?? "",
        nome: professor.nome ?? "",
        data_nascimento: professor.data_nascimento ?? "",
        sexo: professor.sexo ?? "",
        turno: norm(professor.turno),
        disciplina_id: professor.disciplina_id ?? "",
        aulas: professor.aulas ?? 0,
        status: professor.status ?? "ativo",
      });
    } else {
      setForm({ cpf: "", nome: "", data_nascimento: "", sexo: "", turno: "", disciplina_id: "", aulas: 0, status: "ativo" });
    }
    setErros({});
  }, [open, professor]);

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const resDisc = await api.get("/api/disciplinas", { headers: { Authorization: `Bearer ${token}` } });
        setDisciplinas(resDisc.data || []);
        const resTurnos = await api.get("/api/turnos", { headers: { Authorization: `Bearer ${token}` } });
        const listaBruta = Array.isArray(resTurnos.data) ? resTurnos.data : [];
        const normalizados = listaBruta.map(t => typeof t === "string" ? norm(t) : norm(t?.nome ?? t?.turno ?? "")).filter(Boolean);
        const uniq = Array.from(new Set(normalizados.length ? normalizados : ["MATUTINO", "VESPERTINO", "NOTURNO", "INTEGRAL"]));
        setTurnos(uniq);
      } catch (e) { console.error("Erro ao carregar dados auxiliares:", e); }
    })();
  }, [open]);

  const mascaraCPF = (v) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "cpf" ? mascaraCPF(value) : name === "nome" ? value.toUpperCase() : name === "turno" ? norm(value) : value,
    }));
  };

  const turnoOptions = useMemo(() => turnos.map(t => ({ value: norm(t), label: norm(t) })), [turnos]);

  const validar = () => {
    const e = {};
    if (isEditMode) {
      if (!form.turno) e.turno = "Selecione o turno";
      if (!form.disciplina_id) e.disciplina_id = "Selecione uma disciplina";
      if (form.aulas < 0 || form.aulas > 30) e.aulas = "Informe um valor entre 0 e 30";
      return e;
    }
    if (!form.cpf) e.cpf = "CPF obrigatório";
    else if (!validarCPF(form.cpf)) e.cpf = "CPF inválido";
    if (!form.nome) e.nome = "Nome obrigatório";
    if (!form.turno) e.turno = "Selecione o turno";
    if (!form.disciplina_id) e.disciplina_id = "Selecione uma disciplina";
    if (form.aulas === "" || form.aulas === null || form.aulas === undefined || Number(form.aulas) < 0 || Number(form.aulas) > 30)
      e.aulas = "Carga horária inválida (0-30)";
    return e;
  };

  const handleAtivar = async () => {
    if (!professor?.id) return;
    setEnviando(true);
    const ok = await onActivate(professor.id);
    setEnviando(false);
    if (ok) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length) { setErros(novosErros); return; }
    setEnviando(true);
    const ok = await onSubmit(form);
    setEnviando(false);
    if (ok) onClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl w-full flex flex-col transform transition-all duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* CABEÇALHO */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 flex justify-between items-center text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16 blur-2xl" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <IdentificationIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {isEditMode ? "Editar Docente" : "Cadastrar Professor"}
                </h2>
                <p className="text-blue-100 text-sm opacity-90">
                  {isEditMode ? "Atualize as informações no sistema" : "Realize o pré-cadastro de um novo docente"}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all duration-200 z-10 group">
              <XMarkIcon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 bg-gray-50/50 overflow-y-auto overflow-x-hidden max-h-[80vh]">
            {/* IDENTIFICAÇÃO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 ml-1">
                  <HashtagIcon className="w-4 h-4 text-blue-600" /> CPF
                </label>
                <input
                  name="cpf" value={form.cpf} onChange={handleChange} readOnly={isEditMode}
                  className={`w-full px-3 border h-11 rounded-xl shadow-sm border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none ${isEditMode ? "bg-gray-100/50 text-gray-500 cursor-not-allowed border-none font-medium" : "bg-white"}`}
                />
                {erros.cpf && <p className="text-red-500 text-xs mt-1 ml-1 font-medium italic">{erros.cpf}</p>}
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 ml-1">
                  <UserIcon className="w-4 h-4 text-blue-600" /> Nome Completo
                </label>
                <input
                  name="nome" value={form.nome} onChange={handleChange} readOnly={isEditMode}
                  className={`w-full px-3 border h-11 rounded-xl shadow-sm border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none ${isEditMode ? "bg-gray-100/50 text-gray-500 cursor-not-allowed border-none font-medium" : "bg-white"}`}
                />
                {erros.nome && <p className="text-red-500 text-xs mt-1 ml-1 font-medium italic">{erros.nome}</p>}
              </div>
            </div>

            {/* DADOS COMPLEMENTARES */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 opacity-75">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-blue-800 ml-1 uppercase tracking-wider">
                  <CalendarDaysIcon className="w-3.5 h-3.5" /> Data de Nascimento
                </label>
                <input type="date" name="data_nascimento" value={form.data_nascimento ? form.data_nascimento.substring(0, 10) : ""} disabled
                  className="w-full px-3 border outline-none h-10 rounded-lg bg-gray-100/30 text-gray-400 border-blue-200 border-dashed cursor-not-allowed text-xs" />
              </div>
              <div className="space-y-1 opacity-75">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-blue-800 ml-1 uppercase tracking-wider">
                  <UserIcon className="w-3.5 h-3.5" /> Gênero
                </label>
                <select name="sexo" value={form.sexo} disabled
                  className="w-full h-10 border rounded-lg bg-gray-100/30 text-gray-400 border-blue-200 border-dashed cursor-not-allowed text-xs px-3">
                  <option value="">Aguardando login...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>

            {/* MODULAÇÃO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Turno */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 ml-1">
                  <ClockIcon className="w-4 h-4 text-blue-600" /> Turno
                </label>
                <select name="turno" value={form.turno || ""} onChange={handleChange}
                  className="w-full h-11 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none px-3 transition-all font-medium text-gray-700">
                  <option value="">Selecione...</option>
                  {turnoOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {erros.turno && <p className="text-red-500 text-xs mt-1 ml-1 font-medium italic">{erros.turno}</p>}
              </div>

              {/* Disciplina — abre modal premium */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 ml-1">
                  <BookOpenIcon className="w-4 h-4 text-blue-600" /> Disciplina
                </label>
                <button
                  type="button"
                  onClick={() => setDiscModalOpen(true)}
                  className={`w-full h-11 border rounded-xl bg-white shadow-sm px-3 flex items-center gap-2 transition-all outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 hover:shadow-blue-100 group ${
                    erros.disciplina_id ? "border-red-400 ring-1 ring-red-300" : "border-gray-200"
                  }`}
                >
                  {selectedDisc ? (
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
                      <span className="font-bold text-gray-800 text-sm truncate">
                        {(selectedDisc.disciplina ?? selectedDisc.nome ?? "—").toUpperCase()}
                      </span>
                      {selectedDisc.etapa && <EtapaBadge etapa={selectedDisc.etapa} />}
                      {selectedDisc.turno && <TurnoBadge turno={selectedDisc.turno} />}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm flex-1 text-left">Selecione...</span>
                  )}
                  <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-blue-400 transition-colors" />
                </button>
                {erros.disciplina_id && <p className="text-red-500 text-xs mt-1 ml-1 font-medium italic">{erros.disciplina_id}</p>}
              </div>

              {/* Aulas */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 ml-1">
                  <AcademicCapIcon className="w-4 h-4 text-blue-600" /> Aulas
                </label>
                <input type="number" name="aulas" min={0} max={30} value={form.aulas} onChange={handleChange}
                  className="w-full px-3 border outline-none h-11 rounded-xl shadow-sm border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all font-bold text-center text-blue-700" />
                {erros.aulas && <p className="text-red-500 text-xs mt-1 ml-1 font-medium italic">{erros.aulas}</p>}
              </div>
            </div>

            {/* RODAPÉ */}
            <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:w-auto">
                {isEditMode && form.status === "inativo" && (
                  <Button type="button" onClick={handleAtivar} disabled={enviando}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5">
                    <AcademicCapIcon className="w-5 h-5 text-white" />
                    REATIVAR DOCENTE
                  </Button>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <Button type="button" onClick={onClose}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-all">
                  CANCELAR
                </Button>
                <Button type="submit" disabled={enviando}
                  className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/40 transition-all hover:-translate-y-0.5">
                  {enviando ? "SALVANDO..." : "SALVAR"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de seleção de disciplina */}
      <DisciplinaModal
        open={discModalOpen}
        disciplinas={disciplinas}
        selectedId={form.disciplina_id}
        onSelect={d => {
          setForm(prev => ({ ...prev, disciplina_id: d.id }));
          setErros(prev => ({ ...prev, disciplina_id: undefined }));
        }}
        onClose={() => setDiscModalOpen(false)}
      />
    </>
  );
}
