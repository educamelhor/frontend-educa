// src/features/sala-recursos/ModalRegistroAtendimento.jsx
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

export default function ModalRegistroAtendimento({
  isOpen,
  onClose,
  aluno,
  onSuccess
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const hojeFormatado = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    aluno_id: aluno?.id || "",
    data_atendimento: hojeFormatado,
    horario_inicio: "14:00",
    horario_fim: "15:00",
    presenca: 1,
    tipo_sessao: "Individual",
    atividades_realizadas: "",
    evolucao_observacoes: "",
    registrado_por: ""
  });

  useEffect(() => {
    if (!isOpen) return;
    setErro("");
    setForm({
      aluno_id: aluno?.id || "",
      data_atendimento: hojeFormatado,
      horario_inicio: "14:00",
      horario_fim: "15:00",
      presenca: 1,
      tipo_sessao: "Individual",
      atividades_realizadas: "",
      evolucao_observacoes: "",
      registrado_por: localStorage.getItem("nome") || ""
    });
  }, [isOpen, aluno]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value
    }));
  };

  const handleSalvar = async () => {
    if (!form.aluno_id) {
      setErro("Selecione um estudante.");
      return;
    }
    if (!form.data_atendimento) {
      setErro("Informe a data do atendimento.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      await api.post("/api/sala-recursos/atendimentos", form);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao registrar atendimento:", err);
      setErro(err.response?.data?.message || "Erro ao salvar atendimento.");
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-gradient-to-r from-violet-900 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ClockIcon className="w-6 h-6 text-violet-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Registrar Atendimento AEE</h3>
              <p className="text-xs text-violet-200">{aluno?.estudante}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Data do Atendimento *
              </label>
              <input
                type="date"
                name="data_atendimento"
                value={form.data_atendimento}
                onChange={handleChange}
                className="w-full text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tipo de Sessão
              </label>
              <select
                name="tipo_sessao"
                value={form.tipo_sessao}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-violet-600"
              >
                <option value="Individual">Individual</option>
                <option value="Pequeno Grupo">Pequeno Grupo (2 a 4 alunos)</option>
                <option value="Intervenção com Professor Regente">Intervenção com Professor Regente</option>
                <option value="Reunião com a Família / Responsável">Reunião com a Família / Responsável</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Horário Início
              </label>
              <input
                type="time"
                name="horario_inicio"
                value={form.horario_inicio}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Horário Término
              </label>
              <input
                type="time"
                name="horario_fim"
                value={form.horario_fim}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  name="presenca"
                  checked={Number(form.presenca) === 1}
                  onChange={handleChange}
                  className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Estudante compareceu ao atendimento (Presença confirmada)
                </span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Atividades e Jogos Pedagógicos Desenvolvidos
              </label>
              <textarea
                name="atividades_realizadas"
                value={form.atividades_realizadas}
                onChange={handleChange}
                rows={3}
                placeholder="Ex.: Trabalho com blocos lógicos, jogos de memória, leitura orientada de fábulas, treino de autonomia..."
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-violet-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Evolução, Respostas e Observações da Sessão
              </label>
              <textarea
                name="evolucao_observacoes"
                value={form.evolucao_observacoes}
                onChange={handleChange}
                rows={3}
                placeholder="Ex.: Estudante participou com entusiasmo, concluiu as tarefas propostas, demonstrou avanço na atenção concentrada..."
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-violet-600"
              />
            </div>
          </div>
        </div>

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
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold shadow-md transition-colors"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {salvando ? "Salvando..." : "Registrar Sessão"}
          </button>
        </div>
      </div>
    </div>
  );
}
