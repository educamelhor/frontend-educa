// src/features/secretaria/turmas/agrupamentos/AgrupamentoComponentesModal.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  XMarkIcon,
  BookOpenIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import api from "../../../../services/api";

export default function AgrupamentoComponentesModal({
  open,
  onClose,
  agrupamento,
  onUpdated,
}) {
  const [componentes, setComponentes] = useState([]);
  const [disciplinasCatalogo, setDisciplinasCatalogo] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Aba dentro do modal para adicionar: "existente" ou "nova"
  const [modoAdicao, setModoAdicao] = useState("existente");

  // Formulário para adicionar disciplina existente
  const [disciplinaSelecionadaId, setDisciplinaSelecionadaId] = useState("");
  const [cargaSemanal, setCargaSemanal] = useState(2);

  // Formulário para cadastrar novo componente na hora
  const [novoNome, setNovoNome] = useState("");
  const [novaAbreviatura, setNovaAbreviatura] = useState("");

  const carregarDados = async () => {
    if (!agrupamento?.id) return;
    setCarregando(true);
    setErro("");
    try {
      const [resAgr, resDisc] = await Promise.all([
        api.get(`/api/agrupamentos/${agrupamento.id}`),
        api.get("/api/disciplinas"),
      ]);
      setComponentes(resAgr.data?.componentes || []);
      setDisciplinasCatalogo(Array.isArray(resDisc.data) ? resDisc.data : []);
    } catch (err) {
      console.error("Erro ao carregar componentes:", err);
      setErro("Não foi possível carregar os componentes desta turma.");
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

  // Adicionar componente existente
  const handleAdicionarExistente = async (e) => {
    e.preventDefault();
    if (!disciplinaSelecionadaId) {
      setErro("Selecione uma disciplina do catálogo.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.post(`/api/agrupamentos/${agrupamento.id}/componentes`, {
        disciplina_id: Number(disciplinaSelecionadaId),
        carga_semanal: Number(cargaSemanal) || 1,
      });
      setSucesso("Componente curricular adicionado com sucesso!");
      setTimeout(() => setSucesso(""), 3000);
      setDisciplinaSelecionadaId("");
      setCargaSemanal(2);
      await carregarDados();
      if (onUpdated) onUpdated();
    } catch (err) {
      setErro(err?.response?.data?.message || "Erro ao adicionar componente.");
    } finally {
      setSalvando(false);
    }
  };

  // Cadastrar novo componente na hora
  const handleCriarNovo = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      setErro("Informe o nome da nova atividade/componente curricular.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.post(`/api/agrupamentos/${agrupamento.id}/componentes`, {
        nome: novoNome.trim(),
        abreviatura: novaAbreviatura.trim().toUpperCase() || undefined,
        carga_semanal: Number(cargaSemanal) || 1,
      });
      setSucesso("Novo componente cadastrado e vinculado à turma!");
      setTimeout(() => setSucesso(""), 3000);
      setNovoNome("");
      setNovaAbreviatura("");
      setCargaSemanal(2);
      await carregarDados();
      if (onUpdated) onUpdated();
    } catch (err) {
      setErro(err?.response?.data?.message || "Erro ao cadastrar novo componente.");
    } finally {
      setSalvando(false);
    }
  };

  // Atualizar carga horária semanal
  const handleAtualizarCarga = async (compId, novaCarga) => {
    try {
      await api.put(`/api/agrupamentos/${agrupamento.id}/componentes/${compId}`, {
        carga_semanal: Number(novaCarga),
      });
      setComponentes((prev) =>
        prev.map((c) => (c.id === compId ? { ...c, carga_semanal: Number(novaCarga) } : c))
      );
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err?.response?.data?.message || "Não foi possível atualizar a carga semanal.");
    }
  };

  // Remover componente
  const handleRemover = async (compId, nome) => {
    if (!window.confirm(`Deseja remover o componente "${nome}" desta turma de agrupamento?`)) {
      return;
    }
    try {
      await api.delete(`/api/agrupamentos/${agrupamento.id}/componentes/${compId}`);
      await carregarDados();
      if (onUpdated) onUpdated();
    } catch (err) {
      if (err?.response?.status === 409) {
        if (
          window.confirm(
            `${err.response.data.message}\n\nDeseja forçar a remoção e desvincular os professores?`
          )
        ) {
          try {
            await api.delete(
              `/api/agrupamentos/${agrupamento.id}/componentes/${compId}?forcar=1`
            );
            await carregarDados();
            if (onUpdated) onUpdated();
          } catch (err2) {
            alert(err2?.response?.data?.message || "Erro ao forçar remoção.");
          }
        }
      } else {
        alert(err?.response?.data?.message || "Não foi possível remover o componente.");
      }
    }
  };

  // Disciplinas disponíveis para adicionar (que ainda não estão vinculadas)
  const idsJaVinculados = new Set(componentes.map((c) => c.disciplina_id));
  const disciplinasDisponiveis = disciplinasCatalogo.filter((d) => !idsJaVinculados.has(d.id));

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
        <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-700 p-6 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
              <BookOpenIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Componentes e Atividades Curriculares
              </h2>
              <p className="text-teal-100 text-xs mt-1">
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

        {/* Mensagens de Feedback */}
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
          {/* Seção 1: Lista de componentes cadastrados */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span>Atividades da Turma</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {componentes.length} vinculada{componentes.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <span className="text-xs text-slate-500">
                Total semanal:{" "}
                <strong className="text-teal-700 font-bold">
                  {componentes.reduce((acc, c) => acc + (Number(c.carga_semanal) || 0), 0)} aulas
                </strong>
              </span>
            </div>

            {carregando ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Carregando componentes…
              </div>
            ) : componentes.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-500 text-sm">
                Nenhum componente vinculado a esta turma ainda. Cadastre abaixo as atividades a serem trabalhadas.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                {componentes.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-xs">
                        {c.abreviatura || c.disciplina_nome.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">
                          {c.disciplina_nome}
                        </div>
                        {c.professores && c.professores.length > 0 ? (
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span>Professores:</span>
                            {c.professores.map((p) => (
                              <span
                                key={p.id}
                                className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                              >
                                {p.professor_nome} ({p.aulas} aulas)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600 mt-0.5 font-medium">
                            Nenhum professor modulado neste componente
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Aulas/sem:</span>
                        <select
                          value={c.carga_semanal}
                          onChange={(e) => handleAtualizarCarga(c.id, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:border-teal-500 outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} aulas
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemover(c.id, c.disciplina_nome)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remover componente"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 2: Adicionar ou Cadastrar Novo Componente */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <PlusIcon className="w-4 h-4 text-teal-600" />
                <span>Adicionar Atividade à Turma</span>
              </h4>

              {/* Seletor de Modo: Do Catálogo ou Criar Nova */}
              <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setModoAdicao("existente");
                    setErro("");
                  }}
                  className={`px-3 py-1 rounded-md transition ${
                    modoAdicao === "existente"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Do Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoAdicao("nova");
                    setErro("");
                  }}
                  className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                    modoAdicao === "nova"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  <SparklesIcon className="w-3.5 h-3.5 text-teal-600" />
                  Cadastrar Nova
                </button>
              </div>
            </div>

            {modoAdicao === "existente" ? (
              <form onSubmit={handleAdicionarExistente} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Disciplina / Eletiva do Catálogo
                    </label>
                    <select
                      value={disciplinaSelecionadaId}
                      onChange={(e) => setDisciplinaSelecionadaId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:border-teal-500 outline-none"
                    >
                      <option value="">— Selecione uma disciplina do catálogo —</option>
                      {disciplinasDisponiveis.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome || d.disciplina} ({d.tipo || "REGULAR"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Carga Semanal
                    </label>
                    <select
                      value={cargaSemanal}
                      onChange={(e) => setCargaSemanal(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:border-teal-500 outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} aulas/semana
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={salvando || !disciplinaSelecionadaId}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {salvando ? "Adicionando…" : "+ Vincular Componente"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCriarNovo} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Nome da Nova Atividade / Disciplina
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: IFA - Inteligência Artificial Aplicada"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Sigla / Abreviatura
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="Ex: IFA_IA"
                      value={novaAbreviatura}
                      onChange={(e) => setNovaAbreviatura(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm uppercase focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Carga Semanal
                    </label>
                    <select
                      value={cargaSemanal}
                      onChange={(e) => setCargaSemanal(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:border-teal-500 outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} aulas/semana
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] text-slate-500">
                    A disciplina será cadastrada com modo de oferta <strong>AGRUPAMENTO</strong>.
                  </span>
                  <button
                    type="submit"
                    disabled={salvando || !novoNome.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {salvando ? "Cadastrando…" : "✨ Cadastrar e Vincular"}
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
