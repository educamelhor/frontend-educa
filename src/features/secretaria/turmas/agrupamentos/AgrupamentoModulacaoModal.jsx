// src/features/secretaria/turmas/agrupamentos/AgrupamentoModulacaoModal.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  XMarkIcon,
  AcademicCapIcon,
  UserPlusIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import api from "../../../../services/api";

export default function AgrupamentoModulacaoModal({
  open,
  onClose,
  agrupamento,
  onUpdated,
}) {
  const [componentes, setComponentes] = useState([]);
  const [modulacoes, setModulacoes] = useState([]);
  const [professores, setProfessores] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Formulário de alocação
  const [professorId, setProfessorId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [aulas, setAulas] = useState(2);

  const carregarDados = async () => {
    if (!agrupamento?.id) return;
    setCarregando(true);
    setErro("");
    try {
      const [resAgr, resMods, resProfs] = await Promise.all([
        api.get(`/api/agrupamentos/${agrupamento.id}`),
        api.get(`/api/agrupamentos/${agrupamento.id}/modulacao`),
        api.get("/api/professores"),
      ]);

      const comps = resAgr.data?.componentes || [];
      setComponentes(comps);
      setModulacoes(resMods.data || []);

      const profsList = Array.isArray(resProfs.data)
        ? resProfs.data
        : Array.isArray(resProfs.data?.professores)
        ? resProfs.data.professores
        : [];
      setProfessores(profsList.filter((p) => String(p.status).toLowerCase() !== "inativo"));

      if (comps.length > 0 && !disciplinaId) {
        setDisciplinaId(comps[0].disciplina_id);
        setAulas(comps[0].carga_semanal || 2);
      }
    } catch (err) {
      console.error("Erro ao carregar dados da modulação:", err);
      setErro("Não foi possível carregar as informações de modulação.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (open) {
      carregarDados();
    }
  }, [open, agrupamento?.id]);

  if (!open || !agrupamento) return null;

  const handleSalvarModulacao = async (e) => {
    e.preventDefault();
    if (!professorId || !disciplinaId) {
      setErro("Selecione o professor e o componente curricular.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      await api.post(`/api/agrupamentos/${agrupamento.id}/modulacao`, {
        professor_id: Number(professorId),
        disciplina_id: Number(disciplinaId),
        aulas: Number(aulas) || 1,
      });

      setSucesso("Professor modulado com sucesso na turma!");
      setTimeout(() => setSucesso(""), 3000);
      setProfessorId("");
      await carregarDados();
      if (onUpdated) onUpdated();
    } catch (err) {
      setErro(err?.response?.data?.message || "Não foi possível salvar a modulação.");
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverModulacao = async (modId, profNome) => {
    if (!window.confirm(`Deseja desmodular o professor "${profNome}" deste agrupamento?`)) {
      return;
    }
    try {
      await api.delete(`/api/agrupamentos/${agrupamento.id}/modulacao/${modId}`);
      await carregarDados();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err?.response?.data?.message || "Não foi possível remover a modulação.");
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Premium */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-800 p-6 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
              <AcademicCapIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Modulação de Professores
              </h2>
              <p className="text-emerald-100 text-xs mt-1">
                Turma: <strong className="text-white">{agrupamento.nome}</strong> • {agrupamento.turno} • {agrupamento.semestre}º Semestre
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

        {/* Feedback Messages */}
        {erro && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl font-medium">
            {sucesso}
          </div>
        )}

        {/* Conteúdo rolável */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Seção 1: Professores já modulados */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span>Alocações Atuais</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  {modulacoes.length} modulado{modulacoes.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Total modulado:{" "}
                <strong className="text-emerald-700 font-bold">
                  {modulacoes.reduce((acc, m) => acc + (Number(m.aulas) || 0), 0)} aulas
                </strong>
              </span>
            </div>

            {carregando ? (
              <div className="py-6 text-center text-slate-400 text-sm">
                Carregando modulações…
              </div>
            ) : modulacoes.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-500 text-sm">
                Nenhum professor modulado nesta turma ainda. Utilize o formulário abaixo para alocar docentes aos componentes.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                {modulacoes.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        👨‍🏫
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">
                          {m.professor_nome}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Componente: <strong className="text-slate-700">{m.disciplina_nome}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
                        {m.aulas} aulas/semana
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoverModulacao(m.id, m.professor_nome)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Desmodular professor"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 2: Alocar Novo Professor */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <UserPlusIcon className="w-4 h-4 text-emerald-600" />
              <span>Modular Professor em Componente</span>
            </h4>

            {componentes.length === 0 ? (
              <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                Esta turma ainda não possui componentes cadastrados. Cadastre as atividades primeiro na aba "Componentes".
              </div>
            ) : (
              <form onSubmit={handleSalvarModulacao} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Componente */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Componente Curricular
                    </label>
                    <select
                      value={disciplinaId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDisciplinaId(val);
                        const comp = componentes.find((c) => String(c.disciplina_id) === String(val));
                        if (comp) setAulas(comp.carga_semanal || 2);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:border-emerald-500 outline-none"
                    >
                      {componentes.map((c) => (
                        <option key={c.disciplina_id} value={c.disciplina_id}>
                          {c.disciplina_nome} ({c.carga_semanal} aulas)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Professor */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Professor Docente
                    </label>
                    <select
                      value={professorId}
                      onChange={(e) => setProfessorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:border-emerald-500 outline-none"
                    >
                      <option value="">— Selecione o professor —</option>
                      {professores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantidade de Aulas */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Aulas a Lecionar
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={aulas}
                      onChange={(e) => setAulas(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:border-emerald-500 outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[11px] text-slate-500">
                    A carga será comunicada e somada à modulação geral do docente.
                  </span>
                  <button
                    type="submit"
                    disabled={salvando || !professorId || !disciplinaId}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {salvando ? "Salvando…" : "+ Salvar Modulação"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm transition cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
