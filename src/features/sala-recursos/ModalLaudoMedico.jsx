// src/features/sala-recursos/ModalLaudoMedico.jsx
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  XMarkIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

export default function ModalLaudoMedico({
  isOpen,
  onClose,
  aluno,
  laudo = null,
  onSuccess
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    cid: "",
    diagnostico: "",
    medico_nome: "",
    medico_crm: "",
    medico_especialidade: "Neuropediatria",
    data_laudo: "",
    data_validade: "",
    medicamentos: "",
    acompanhamento_externo: "",
    observacoes: ""
  });

  useEffect(() => {
    if (!isOpen) return;
    setErro("");
    if (laudo) {
      setForm({
        cid: laudo.cid || "",
        diagnostico: laudo.diagnostico || "",
        medico_nome: laudo.medico_nome || "",
        medico_crm: laudo.medico_crm || "",
        medico_especialidade: laudo.medico_especialidade || "Neuropediatria",
        data_laudo: laudo.data_laudo || "",
        data_validade: laudo.data_validade || "",
        medicamentos: laudo.medicamentos || "",
        acompanhamento_externo: laudo.acompanhamento_externo || "",
        observacoes: laudo.observacoes || ""
      });
    } else {
      setForm({
        cid: "",
        diagnostico: "",
        medico_nome: "",
        medico_crm: "",
        medico_especialidade: "Neuropediatria",
        data_laudo: "",
        data_validade: "",
        medicamentos: "",
        acompanhamento_externo: "",
        observacoes: ""
      });
    }
  }, [isOpen, laudo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSalvar = async () => {
    if (!aluno?.id) return;
    if (!form.cid && !form.diagnostico) {
      setErro("Informe ao menos o código CID ou a descrição do diagnóstico.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      if (laudo?.id) {
        await api.put(`/api/sala-recursos/laudos/${laudo.id}`, form);
      } else {
        await api.post(`/api/sala-recursos/alunos/${aluno.id}/laudos`, form);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar laudo:", err);
      setErro(err.response?.data?.message || "Erro ao salvar laudo médico.");
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <DocumentTextIcon className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{laudo ? "Editar Laudo Médico" : "Novo Laudo / Diagnóstico Clínico"}</h3>
              <p className="text-xs text-emerald-200">{aluno?.estudante} • Código: {aluno?.codigo}</p>
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
                Classificação CID (CID-10 ou CID-11) *
              </label>
              <input
                type="text"
                name="cid"
                value={form.cid}
                onChange={handleChange}
                placeholder="Ex.: F84.0, F90.0, G80, H54..."
                className="w-full text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Especialidade Médica
              </label>
              <input
                type="text"
                name="medico_especialidade"
                value={form.medico_especialidade}
                onChange={handleChange}
                placeholder="Ex: Neuropediatria, Psiquiatria, Oftalmologia"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Descrição do Diagnóstico Clínico *
              </label>
              <textarea
                name="diagnostico"
                value={form.diagnostico}
                onChange={handleChange}
                rows={3}
                placeholder="Ex: Transtorno do Espectro Autista (TEA) - Nível de suporte 1 com dificuldades na interação social e linguagem..."
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome do Médico Emissor
              </label>
              <input
                type="text"
                name="medico_nome"
                value={form.medico_nome}
                onChange={handleChange}
                placeholder="Ex: Dr. Fulano de Tal"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                CRM / Registro Profissional
              </label>
              <input
                type="text"
                name="medico_crm"
                value={form.medico_crm}
                onChange={handleChange}
                placeholder="Ex: CRM-DF 12345"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Data do Laudo
              </label>
              <input
                type="date"
                name="data_laudo"
                value={form.data_laudo}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Validade / Data de Revisão
              </label>
              <input
                type="date"
                name="data_validade"
                value={form.data_validade}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Medicamentos em Uso (se houver)
              </label>
              <input
                type="text"
                name="medicamentos"
                value={form.medicamentos}
                onChange={handleChange}
                placeholder="Ex: Ritalina 10mg pela manhã, Risperidona 1mg..."
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Acompanhamentos Multiprofissionais Externos
              </label>
              <input
                type="text"
                name="acompanhamento_externo"
                value={form.acompanhamento_externo}
                onChange={handleChange}
                placeholder="Ex: Fonoaudiologia (1x semana), Terapia Ocupacional, Psicologia no CAPS..."
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Observações Clínicas e Pedagógicas Relevantes
              </label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                rows={2}
                placeholder="Observações complementares trazidas pela família ou equipe de saúde..."
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-600"
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
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md transition-colors"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {salvando ? "Salvando..." : "Salvar Laudo"}
          </button>
        </div>
      </div>
    </div>
  );
}
