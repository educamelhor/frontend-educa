// src/features/secretaria/professores/VinculoForm.jsx
// ============================================================
// Modal premium para ADICIONAR ou EDITAR vínculos do professor
// (turno + disciplina + aulas)
// ============================================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import {
  XMarkIcon,
  ClockIcon,
  BookOpenIcon,
  AcademicCapIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/solid";
import api from "../../../services/api";

const norm = (v) => String(v ?? "").trim().toUpperCase();

// ─── Mini-modal de seleção de disciplina ──────────────────────
function DisciplinaModal({ open, disciplinas, selectedId, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return disciplinas;
    return disciplinas.filter(d =>
      (d.disciplina ?? d.nome ?? "").toLowerCase().includes(q) ||
      (d.etapa ?? "").toLowerCase().includes(q)
    );
  }, [disciplinas, search]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      style={{ zIndex: 200000 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 480, maxHeight: "75vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-4 flex justify-between items-center text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><BookOpenIcon className="w-5 h-5 text-white" /></div>
            <div>
              <h3 className="text-base font-bold">Selecionar Disciplina</h3>
              <p className="text-blue-200 text-xs">{disciplinas.length} disponíveis</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all">
            <XMarkIcon className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="p-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar disciplina…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Nenhuma disciplina encontrada</p>
          ) : (
            filtered.map(d => {
              const isSelected = String(d.id) === String(selectedId);
              return (
                <button
                  key={d.id}
                  onClick={() => { onSelect(d); onClose(); }}
                  className={`w-full px-4 py-3 flex items-center justify-between text-left border-b border-gray-50 transition-all hover:bg-blue-50 ${isSelected ? "bg-blue-50" : ""}`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                      {(d.disciplina ?? d.nome ?? "—").toUpperCase()}
                    </p>
                    {d.etapa && <p className="text-xs text-gray-400">{d.etapa}</p>}
                  </div>
                  {isSelected && <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Componente principal ──────────────────────────────────────
export default function VinculoForm({ open, onClose, onSalvar, professor }) {
  const [form, setForm] = useState({ turno: "", disciplina_id: "", aulas: 2 });
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [disciplinas, setDisciplinas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [discModalOpen, setDiscModalOpen] = useState(false);

  const selectedDisc = useMemo(
    () => disciplinas.find(d => String(d.id) === String(form.disciplina_id)),
    [disciplinas, form.disciplina_id]
  );

  useEffect(() => {
    if (!open) return;
    setForm({ turno: "", disciplina_id: "", aulas: 2 });
    setErros({});
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const resDisc = await api.get("/api/disciplinas", { headers: { Authorization: `Bearer ${token}` } });
        setDisciplinas(resDisc.data || []);
        const resTurnos = await api.get("/api/turnos", { headers: { Authorization: `Bearer ${token}` } });
        const lista = Array.isArray(resTurnos.data) ? resTurnos.data : [];
        const normalizados = lista.map(t => typeof t === "string" ? norm(t) : norm(t?.nome ?? t?.turno ?? "")).filter(Boolean);
        setTurnos(Array.from(new Set(normalizados.length ? normalizados : ["MATUTINO", "VESPERTINO", "NOTURNO", "INTEGRAL"])));
      } catch (e) { console.error("Erro ao carregar dados:", e); }
    })();
  }, [open]);

  const validar = () => {
    const e = {};
    if (!form.turno) e.turno = "Selecione o turno";
    if (!form.disciplina_id) e.disciplina_id = "Selecione uma disciplina";
    if (form.aulas < 0 || form.aulas > 40) e.aulas = "Entre 0 e 40";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length) { setErros(novosErros); return; }
    setEnviando(true);
    const ok = await onSalvar({ turno: form.turno, disciplina_id: Number(form.disciplina_id), aulas: Number(form.aulas) });
    setEnviando(false);
    if (ok) onClose();
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg flex flex-col transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 p-5 flex justify-between items-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-12 -translate-y-12 blur-2xl" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/20 p-2 rounded-xl"><PlusCircleIcon className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Novo Vínculo</h2>
              <p className="text-emerald-100 text-xs opacity-90 truncate max-w-[240px]">
                {professor?.nome || "Professor"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all z-10">
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gray-50/50">
          {/* Turno */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 ml-1">
              <ClockIcon className="w-4 h-4 text-emerald-600" /> Turno
            </label>
            <select
              value={form.turno}
              onChange={e => setForm(p => ({ ...p, turno: e.target.value }))}
              className="w-full h-11 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none px-3 font-medium text-gray-700"
            >
              <option value="">Selecione o turno...</option>
              {turnos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {erros.turno && <p className="text-red-500 text-xs mt-1 ml-1 italic">{erros.turno}</p>}
          </div>

          {/* Disciplina */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 ml-1">
              <BookOpenIcon className="w-4 h-4 text-emerald-600" /> Disciplina
            </label>
            <button
              type="button"
              onClick={() => setDiscModalOpen(true)}
              className={`w-full h-11 border rounded-xl bg-white shadow-sm px-3 flex items-center gap-2 transition-all outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-400 group ${erros.disciplina_id ? "border-red-400" : "border-gray-200"}`}
            >
              {selectedDisc ? (
                <span className="font-bold text-gray-800 text-sm flex-1 text-left truncate">
                  {(selectedDisc.disciplina ?? selectedDisc.nome ?? "—").toUpperCase()}
                </span>
              ) : (
                <span className="text-gray-400 text-sm flex-1 text-left">Selecione a disciplina...</span>
              )}
              <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-emerald-400 transition-colors" />
            </button>
            {erros.disciplina_id && <p className="text-red-500 text-xs mt-1 ml-1 italic">{erros.disciplina_id}</p>}
          </div>

          {/* Aulas */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 ml-1">
              <AcademicCapIcon className="w-4 h-4 text-emerald-600" /> Carga horária semanal (aulas)
            </label>
            <input
              type="number"
              min={0} max={40}
              value={form.aulas}
              onChange={e => setForm(p => ({ ...p, aulas: Number(e.target.value) }))}
              className="w-full px-3 border outline-none h-11 rounded-xl shadow-sm border-gray-200 focus:ring-2 focus:ring-emerald-500 font-bold text-center text-emerald-700"
            />
            {erros.aulas && <p className="text-red-500 text-xs mt-1 ml-1 italic">{erros.aulas}</p>}
          </div>

          {/* Rodapé */}
          <div className="pt-4 border-t border-gray-200 flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-all text-sm">
              CANCELAR
            </button>
            <button type="submit" disabled={enviando}
              className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 text-sm">
              {enviando ? "SALVANDO..." : "ADICIONAR VÍNCULO"}
            </button>
          </div>
        </form>
      </div>

      <DisciplinaModal
        open={discModalOpen}
        disciplinas={disciplinas}
        selectedId={form.disciplina_id}
        onSelect={d => setForm(p => ({ ...p, disciplina_id: d.id }))}
        onClose={() => setDiscModalOpen(false)}
      />
    </div>,
    document.body
  );
}
