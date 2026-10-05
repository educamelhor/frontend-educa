// src/features/secretaria/turmas/agrupamentos/AgrupamentoFormModal.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { XMarkIcon, UserGroupIcon } from "@heroicons/react/24/solid";
import api from "../../../../services/api";

const TIPOS = [
  { value: "IFA", label: "IFA — Itinerário Formativo de Aprofundamento" },
  { value: "PCA", label: "PCA — Percurso Comum de Aprofundamento" },
  { value: "ELETIVA", label: "Eletiva / Unidade Curricular Eletiva" },
  { value: "PROJETO", label: "Projeto Integrador / Interdisciplinar" },
  { value: "OUTRO", label: "Outro Agrupamento Temático" },
];

const TURNOS = ["Matutino", "Vespertino", "Noturno", "Integral"];

const SEMESTRES = [
  { value: 1, label: "1º Semestre" },
  { value: 2, label: "2º Semestre" },
  { value: 0, label: "Anual (Ambos os semestres)" },
];

const STATUS_OPCOES = [
  { value: "ABERTO", label: "Aberto (em formação / ativo)" },
  { value: "RASCUNHO", label: "Rascunho (planejamento)" },
  { value: "ENCERRADO", label: "Encerrado (concluído)" },
];

export default function AgrupamentoFormModal({
  open,
  onClose,
  onSaved,
  agrupamento = null,
  anoLetivoPadrao = new Date().getFullYear(),
  turnoPadrao = "Noturno",
  semestrePadrao = 2,
}) {
  const [form, setForm] = useState({
    nome: "",
    tipo: "IFA",
    turno: turnoPadrao && turnoPadrao !== "TODOS" ? turnoPadrao : "Noturno",
    semestre: semestrePadrao && semestrePadrao !== "TODOS" ? Number(semestrePadrao) : 2,
    etapa_id: "",
    capacidade: "",
    status: "ABERTO",
    ano_letivo: anoLetivoPadrao,
  });

  const [etapas, setEtapas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) return;
    setErro("");

    // Carrega etapas ativas da escola
    api
      .get("/api/etapas")
      .then((res) => {
        const lista = Array.isArray(res.data) ? res.data : [];
        setEtapas(lista.filter((e) => e.ativa !== 0));
      })
      .catch((err) => console.error("Erro ao carregar etapas:", err));

    if (agrupamento) {
      setForm({
        nome: agrupamento.nome || "",
        tipo: agrupamento.tipo || "IFA",
        turno: agrupamento.turno || "Noturno",
        semestre: agrupamento.semestre ?? 2,
        etapa_id: agrupamento.etapa_id || "",
        capacidade: agrupamento.capacidade ?? "",
        status: agrupamento.status || "ABERTO",
        ano_letivo: agrupamento.ano_letivo || anoLetivoPadrao,
      });
    } else {
      setForm({
        nome: "",
        tipo: "IFA",
        turno: turnoPadrao && turnoPadrao !== "TODOS" ? turnoPadrao : "Noturno",
        semestre: semestrePadrao && semestrePadrao !== "TODOS" ? Number(semestrePadrao) : 2,
        etapa_id: "",
        capacidade: "",
        status: "ABERTO",
        ano_letivo: anoLetivoPadrao,
      });
    }
  }, [open, agrupamento, anoLetivoPadrao, turnoPadrao, semestrePadrao]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro("Informe o nome da turma de agrupamento.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        turno: form.turno,
        semestre: Number(form.semestre),
        etapa_id: form.etapa_id ? Number(form.etapa_id) : null,
        capacidade: form.capacidade ? Number(form.capacidade) : null,
        status: form.status,
        ano_letivo: Number(form.ano_letivo),
      };

      if (agrupamento?.id) {
        await api.put(`/api/agrupamentos/${agrupamento.id}`, payload);
      } else {
        await api.post("/api/agrupamentos", payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Não foi possível salvar a turma de agrupamento.";
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-100 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Premium */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 p-6 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
              <UserGroupIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {agrupamento ? "Editar Turma de Agrupamento" : "Nova Turma de Agrupamento"}
              </h2>
              <p className="text-indigo-100 text-xs mt-1">
                Turma mista para itinerários, eletivas e projetos interdisciplinares
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all text-white z-10 cursor-pointer"
            title="Fechar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {erro}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nome do Agrupamento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: IFA Robótica A, Eletiva Astronomia, Projeto Vida..."
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
            />
          </div>

          {/* Grid: Tipo e Turno */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tipo de Agrupamento
              </label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition bg-white"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Turno
              </label>
              <select
                value={form.turno}
                onChange={(e) => setForm({ ...form, turno: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition bg-white"
              >
                {TURNOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Semestre e Etapa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Semestre de Oferta
              </label>
              <select
                value={form.semestre}
                onChange={(e) => setForm({ ...form, semestre: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition bg-white"
              >
                {SEMESTRES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Etapa de Ensino (Opcional)
              </label>
              <select
                value={form.etapa_id}
                onChange={(e) => setForm({ ...form, etapa_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition bg-white"
              >
                <option value="">— Todas as etapas / Misto —</option>
                {etapas.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Capacidade de Alunos e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Capacidade Máxima (Vagas)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                placeholder="Ex: 35 (opcional)"
                value={form.capacidade}
                onChange={(e) => setForm({ ...form, capacidade: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Deixe em branco para vagas livres
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition bg-white"
              >
                {STATUS_OPCOES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dica Informativa */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-800 flex items-start gap-2">
            <span className="text-base">💡</span>
            <div>
              <strong>Autonomia Pedagógica:</strong> após criar a turma de agrupamento, você poderá vincular os componentes/atividades curriculares e alocar os alunos matriculados de diferentes turmas regulares.
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {salvando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando…
                </>
              ) : agrupamento ? (
                "Salvar Alterações"
              ) : (
                "Criar Agrupamento"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
