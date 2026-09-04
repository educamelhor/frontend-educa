// src/features/sala-recursos/ModalConfigAlunoAEE.jsx
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  XMarkIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

const TIPOS_ATENDIMENTO = [
  "Sala de Recursos Multifuncionais Tipo I (SRM I)",
  "Sala de Recursos Multifuncionais Tipo II (SRM II - Altas Habilidades)",
  "Sala de Recursos de Deficiência Visual (SRM-DV)",
  "Sala de Recursos de Surdez / Bilingue",
  "Apoio Pedagógico Especializado (APE)",
  "Itinerância",
  "Atendimento Domiciliar / Hospitalar"
];

const TURNOS_AEE = [
  "Contraturno",
  "Matutino",
  "Vespertino",
  "Noturno",
  "Integral"
];

export default function ModalConfigAlunoAEE({
  isOpen,
  onClose,
  aluno,
  anoLetivo = new Date().getFullYear(),
  onSuccess
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    ano_letivo: anoLetivo,
    tipo_atendimento: "Sala de Recursos Multifuncionais Tipo I (SRM I)",
    turno_atendimento: "Contraturno",
    dias_semana: "Segunda e Quarta",
    horario_atendimento: "14:00 - 15:30",
    status: "ativo",
    professor_aee: "",
    necessidades_especificas: "",
    atendimento_diferencial: 1
  });

  useEffect(() => {
    if (!isOpen || !aluno) return;
    setErro("");
    setForm({
      ano_letivo: anoLetivo,
      tipo_atendimento: aluno.tipo_atendimento || "Sala de Recursos Multifuncionais Tipo I (SRM I)",
      turno_atendimento: aluno.turno_atendimento || "Contraturno",
      dias_semana: aluno.dias_semana || "Segunda e Quarta",
      horario_atendimento: aluno.horario_atendimento || "14:00 - 15:30",
      status: aluno.status_aee || "ativo",
      professor_aee: aluno.professor_aee || "",
      necessidades_especificas: aluno.necessidades_especificas || "",
      atendimento_diferencial: 1
    });
  }, [isOpen, aluno, anoLetivo]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value
    }));
  };

  const handleSalvar = async () => {
    if (!aluno?.id) return;
    setSalvando(true);
    setErro("");

    try {
      await api.put(`/api/sala-recursos/alunos/${aluno.id}/config`, form);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar configuração AEE:", err);
      setErro(err.response?.data?.message || "Erro ao salvar configuração.");
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Cog6ToothIcon className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Configuração de Atendimento AEE</h3>
              <p className="text-xs text-blue-200">{aluno?.estudante} • Matrícula/Código: {aluno?.codigo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tipo de Sala / Atendimento
              </label>
              <select
                name="tipo_atendimento"
                value={form.tipo_atendimento}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600"
              >
                {TIPOS_ATENDIMENTO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Turno do Atendimento
              </label>
              <select
                name="turno_atendimento"
                value={form.turno_atendimento}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600"
              >
                {TURNOS_AEE.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Status no AEE
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600"
              >
                <option value="ativo">Ativo (Em Atendimento)</option>
                <option value="em_avaliacao">Em Avaliação Diagnóstica</option>
                <option value="desligado">Desligado / Concluído</option>
                <option value="transferido">Transferido</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Dias de Atendimento na Semana
              </label>
              <input
                type="text"
                name="dias_semana"
                value={form.dias_semana}
                onChange={handleChange}
                placeholder="Ex: Segunda e Quarta"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Horário do Atendimento
              </label>
              <input
                type="text"
                name="horario_atendimento"
                value={form.horario_atendimento}
                onChange={handleChange}
                placeholder="Ex: 14:00 às 15:30"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Professor(a) Especialista Responsável
              </label>
              <input
                type="text"
                name="professor_aee"
                value={form.professor_aee}
                onChange={handleChange}
                placeholder="Nome do docente da Sala de Recursos"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Necessidades Específicas / Apoios (Mobilidade, Educador Social, etc.)
              </label>
              <textarea
                name="necessidades_especificas"
                value={form.necessidades_especificas}
                onChange={handleChange}
                rows={3}
                placeholder="Ex.: Necessita de apoio para locomoção, uso de cadeira de rodas, atendimento com educador social voluntário..."
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-md transition-colors"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {salvando ? "Salvando..." : "Salvar Configuração"}
          </button>
        </div>
      </div>
    </div>
  );
}
