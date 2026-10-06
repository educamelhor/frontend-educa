// src/features/secretaria/turmas/agrupamentos/ListaAgrupamentos.jsx
import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  BookOpenIcon,
  AcademicCapIcon,
  PencilSquareIcon,
  TrashIcon,
  BoltIcon,
  FunnelIcon,
} from "@heroicons/react/24/solid";
import api from "../../../../services/api";

import AgrupamentoFormModal from "./AgrupamentoFormModal";
import AgrupamentoComponentesModal from "./AgrupamentoComponentesModal";
import AgrupamentoEnturmacaoModal from "./AgrupamentoEnturmacaoModal";
import AgrupamentoModulacaoModal from "./AgrupamentoModulacaoModal";
import AgrupamentoMigracaoModal from "./AgrupamentoMigracaoModal";

function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

const TIPO_BADGES = {
  IFA: "bg-purple-50 text-purple-700 border-purple-200",
  PCA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ELETIVA: "bg-blue-50 text-blue-700 border-blue-200",
  PROJETO: "bg-amber-50 text-amber-700 border-amber-200",
  OUTRO: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function ListaAgrupamentos() {
  const [agrupamentos, setAgrupamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());
  const [anosLetivos, setAnosLetivos] = useState([anoLetivoPadrao()]);
  const [semestreFiltro, setSemestreFiltro] = useState("TODOS");
  const [turnoFiltro, setTurnoFiltro] = useState("TODOS");
  const [tipoFiltro, setTipoFiltro] = useState("TODOS");
  const [busca, setBusca] = useState("");

  // Modais
  const [formOpen, setFormOpen] = useState(false);
  const [agrupamentoEditando, setAgrupamentoEditando] = useState(null);

  const [componentesModalOpen, setComponentesModalOpen] = useState(false);
  const [enturmacaoModalOpen, setEnturmacaoModalOpen] = useState(false);
  const [modulacaoModalOpen, setModulacaoModalOpen] = useState(false);
  const [migracaoModalOpen, setMigracaoModalOpen] = useState(false);

  const [agrupamentoSelecionado, setAgrupamentoSelecionado] = useState(null);

  // Carrega anos disponíveis
  useEffect(() => {
    api
      .get("/api/matriculas/anos")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setAnosLetivos(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Carrega agrupamentos com base nos filtros
  const carregarAgrupamentos = async () => {
    setCarregando(true);
    try {
      const params = {
        ano: anoLetivo,
        semestre: semestreFiltro !== "TODOS" ? semestreFiltro : undefined,
        turno: turnoFiltro !== "TODOS" ? turnoFiltro : undefined,
        tipo: tipoFiltro !== "TODOS" ? tipoFiltro : undefined,
      };
      const res = await api.get("/api/agrupamentos", { params });
      setAgrupamentos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erro ao listar agrupamentos:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAgrupamentos();
  }, [anoLetivo, semestreFiltro, turnoFiltro, tipoFiltro]);

  // Excluir agrupamento
  const handleExcluir = async (agr) => {
    if (!window.confirm(`Deseja realmente excluir a turma de agrupamento "${agr.nome}"?`)) {
      return;
    }
    try {
      await api.delete(`/api/agrupamentos/${agr.id}`);
      await carregarAgrupamentos();
    } catch (err) {
      if (err?.response?.status === 409) {
        if (
          window.confirm(
            `${err.response.data.message}\n\nDeseja forçar a exclusão e desvincular todos os alunos e professores?`
          )
        ) {
          try {
            await api.delete(`/api/agrupamentos/${agr.id}?forcar=1`);
            await carregarAgrupamentos();
          } catch (err2) {
            alert(err2?.response?.data?.message || "Erro ao forçar exclusão.");
          }
        }
      } else {
        alert(err?.response?.data?.message || "Não foi possível excluir o agrupamento.");
      }
    }
  };

  // Filtro de busca textual em memória
  const listaFiltrada = agrupamentos.filter((a) => {
    if (!busca.trim()) return true;
    const term = busca.toLowerCase();
    return (
      a.nome.toLowerCase().includes(term) ||
      (a.tipo && a.tipo.toLowerCase().includes(term)) ||
      (a.etapa_nome && a.etapa_nome.toLowerCase().includes(term))
    );
  });

  // Estatísticas agregadas
  const totalTurmas = listaFiltrada.length;
  const totalAlunos = listaFiltrada.reduce((acc, a) => acc + (Number(a.total_alunos) || 0), 0);
  const totalProfessores = listaFiltrada.reduce((acc, a) => acc + (Number(a.total_professores) || 0), 0);
  const totalCapacidade = listaFiltrada.reduce((acc, a) => acc + (Number(a.capacidade) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Cards de Métricas do Novo Ensino Médio */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{totalTurmas}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Turmas Mistas
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{totalAlunos}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Alunos Enturmados
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            <AcademicCapIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{totalProfessores}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Docentes Modulados
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">
              {totalCapacidade > 0 ? totalCapacidade : "—"}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vagas Ofertadas
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ações Superiores e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Botões Principais */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAgrupamentoEditando(null);
                setFormOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-indigo-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Nova Turma de Agrupamento</span>
            </button>

            {/* Ocultado temporariamente a pedido do usuário
            <button
              type="button"
              onClick={() => setMigracaoModalOpen(true)}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Assistente de Migração de Eletivas e IFAs Legados"
            >
              <BoltIcon className="w-4 h-4 text-amber-600" />
              <span>Migrar Legados (IFA/Eletivas)</span>
            </button>
            */}
          </div>

          {/* Seletor de Ano Letivo e Busca */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold">Ano:</span>
              <select
                value={anoLetivo}
                onChange={(e) => setAnoLetivo(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white outline-none focus:border-indigo-500"
              >
                {anosLetivos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-56">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar agrupamento…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Linha de Filtros Rápidos (Pills) */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
          {/* Semestre */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Semestre:</span>
            <div className="flex gap-1">
              {[
                { val: "TODOS", label: "Todos" },
                { val: "1", label: "1º Sem" },
                { val: "2", label: "2º Sem" },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setSemestreFiltro(s.val)}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition ${
                    semestreFiltro === s.val
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Turno */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Turno:</span>
            <div className="flex gap-1">
              {["TODOS", "Matutino", "Vespertino", "Noturno"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurnoFiltro(t)}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition ${
                    turnoFiltro === t
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t === "TODOS" ? "Todos" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Tipo:</span>
            <div className="flex gap-1">
              {["TODOS", "IFA", "PCA", "ELETIVA", "PROJETO"].map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setTipoFiltro(tp)}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition ${
                    tipoFiltro === tp
                      ? "bg-purple-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tp === "TODOS" ? "Todos" : tp}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Turmas de Agrupamento */}
      {carregando ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Carregando turmas de agrupamento…
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">
            👥
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma turma de agrupamento encontrada
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Turmas de agrupamento reúnem estudantes de diferentes turmas para cursar itinerários formativos (IFA), percursos comuns (PCA) e eletivas.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setAgrupamentoEditando(null);
                setFormOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition"
            >
              + Criar Primeira Turma de Agrupamento
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listaFiltrada.map((agr) => {
            const badgeClass = TIPO_BADGES[agr.tipo] || TIPO_BADGES.OUTRO;
            const cap = agr.capacidade ? Number(agr.capacidade) : null;
            const totalAl = Number(agr.total_alunos) || 0;
            const pct = cap ? Math.min(100, Math.round((totalAl / cap) * 100)) : null;

            return (
              <div
                key={agr.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Topo do Card */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}
                    >
                      {agr.tipo}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {agr.semestre === 0 ? "Anual" : `${agr.semestre}º Semestre`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {agr.turno}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {agr.nome}
                    </h3>
                    {agr.etapa_nome && (
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        Etapa: {agr.etapa_nome}
                      </span>
                    )}
                  </div>

                  {/* Vagas / Ocupação */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-1">
                        <UsersIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Enturmação:</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {totalAl} {cap ? `/ ${cap} alunos` : "alunos"}
                      </span>
                    </div>

                    {cap && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 100
                              ? "bg-red-500"
                              : pct >= 80
                              ? "bg-amber-500"
                              : "bg-indigo-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Resumo de Componentes e Professores */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpenIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>{agr.total_componentes || 0} atividade(s)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <AcademicCapIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{agr.total_professores || 0} docente(s)</span>
                    </span>
                  </div>
                </div>

                {/* Rodapé de Ações do Card */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAgrupamentoSelecionado(agr);
                        setEnturmacaoModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                      title="Enturmar Alunos (Enturmação Mista)"
                    >
                      <UsersIcon className="w-3.5 h-3.5" />
                      <span>Alunos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAgrupamentoSelecionado(agr);
                        setComponentesModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                      title="Cadastrar Componentes / Atividades"
                    >
                      <BookOpenIcon className="w-3.5 h-3.5" />
                      <span>Atividades</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAgrupamentoSelecionado(agr);
                        setModulacaoModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                      title="Modular Professores"
                    >
                      <AcademicCapIcon className="w-3.5 h-3.5" />
                      <span>Docentes</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAgrupamentoEditando(agr);
                        setFormOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Editar Agrupamento"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExcluir(agr)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Excluir Agrupamento"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais Integrados */}
      <AgrupamentoFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setAgrupamentoEditando(null);
        }}
        agrupamento={agrupamentoEditando}
        anoLetivoPadrao={anoLetivo}
        turnoPadrao={turnoFiltro !== "TODOS" ? turnoFiltro : "Noturno"}
        semestrePadrao={semestreFiltro !== "TODOS" ? Number(semestreFiltro) : 2}
        onSaved={carregarAgrupamentos}
      />

      <AgrupamentoComponentesModal
        open={componentesModalOpen}
        onClose={() => {
          setComponentesModalOpen(false);
          setAgrupamentoSelecionado(null);
        }}
        agrupamento={agrupamentoSelecionado}
        onUpdated={carregarAgrupamentos}
      />

      <AgrupamentoEnturmacaoModal
        open={enturmacaoModalOpen}
        onClose={() => {
          setEnturmacaoModalOpen(false);
          setAgrupamentoSelecionado(null);
        }}
        agrupamento={agrupamentoSelecionado}
        onUpdated={carregarAgrupamentos}
      />

      <AgrupamentoModulacaoModal
        open={modulacaoModalOpen}
        onClose={() => {
          setModulacaoModalOpen(false);
          setAgrupamentoSelecionado(null);
        }}
        agrupamento={agrupamentoSelecionado}
        onUpdated={carregarAgrupamentos}
      />

      <AgrupamentoMigracaoModal
        open={migracaoModalOpen}
        onClose={() => setMigracaoModalOpen(false)}
        anoLetivo={anoLetivo}
        onMigrated={carregarAgrupamentos}
      />
    </div>
  );
}
