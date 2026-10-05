// src/features/secretaria/cargas-horarias/index.jsx
// ============================================================================
// Cargas Horárias — define quais disciplinas cada turma tem
// Suporte a:
// - Turmas Regulares (ANUAL e SEMESTRAL)
// - Turmas de Agrupamento (Novo Ensino Médio - IFA, PCA, Eletivas)
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../../services/api";
import Modal from "../../../components/ui/Modal";
import ModalDefinirCargas from "./ModalDefinirCargas";
import ListaCargasHorarias from "./ListaCargasHorarias";
import ModalCargasLote from "./ModalCargasLote";
import AgrupamentoComponentesModal from "../turmas/agrupamentos/AgrupamentoComponentesModal";
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  ClockIcon,
  BookOpenIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";

// Retorna o ano letivo vigente (janeiro pertence ao ano anterior)
function getAnoLetivoAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  return hoje.getMonth() === 0 ? ano - 1 : ano;
}

// Util para comparar textos independentemente de acentos/maiúsculas
function normalizaTexto(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ─── Componente de tabs de semestre ──────────────────────────────────────────
function TabsSemestre({ semestre, onChange }) {
  return (
    <div className="flex gap-1 mb-4 bg-blue-50 rounded-xl p-1 w-fit mx-auto">
      {[1, 2].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            semestre === s
              ? "bg-blue-700 text-white shadow"
              : "text-blue-700 hover:bg-blue-100"
          }`}
        >
          📅 {s}º Semestre
        </button>
      ))}
    </div>
  );
}

export default function CargasHorariasPage() {
  // ─── Aba Principal: "regulares" | "agrupamentos" ───────────────────────────
  const [abaAtiva, setAbaAtiva] = useState("regulares");

  // ─── Estados Turmas Regulares ─────────────────────────────────────────────
  const [anoLetivo, setAnoLetivo] = useState(getAnoLetivoAtual());
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [erroTurmas, setErroTurmas] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  // Semestre para turmas semestrais
  const [semestreSelecionado, setSemestreSelecionado] = useState(1);

  // Modais de turmas regulares
  const [openModalDefinir, setOpenModalDefinir] = useState(false);
  const [openModalEditar, setOpenModalEditar] = useState(false);
  const [openModalLote, setOpenModalLote] = useState(false);

  // Cargas da turma regular selecionada
  const [loadingCargas, setLoadingCargas] = useState(false);
  const [erroCargas, setErroCargas] = useState("");
  const [cargasTurma, setCargasTurma] = useState([]);
  const [totalCarga, setTotalCarga] = useState(0);
  const [copiando, setCopiando] = useState(false);

  // Turnos oficiais aprovados
  const turnos = ["Matutino", "Vespertino", "Noturno", "Integral"];

  // ─── Estados Turmas de Agrupamento ────────────────────────────────────────
  const [agrupamentos, setAgrupamentos] = useState([]);
  const [loadingAgrupamentos, setLoadingAgrupamentos] = useState(false);
  const [erroAgrupamentos, setErroAgrupamentos] = useState("");
  const [buscaAgrupamento, setBuscaAgrupamento] = useState("");
  const [filtroTurnoAgr, setFiltroTurnoAgr] = useState("TODOS");
  const [agrupamentoParaEditar, setAgrupamentoParaEditar] = useState(null);
  const [openModalComponentesAgr, setOpenModalComponentesAgr] = useState(false);

  const anosDisponiveis = useMemo(() => {
    const set = new Set();
    turmas.forEach((t) => { if (t.ano) set.add(Number(t.ano)); });
    set.add(getAnoLetivoAtual());
    return Array.from(set).sort((a, b) => b - a);
  }, [turmas]);

  // Regime da turma selecionada
  const ehSemestral = turmaSelecionada?.regime === "semestral";

  // ─── Carregar turmas regulares ────────────────────────────────────────────
  const fetchTurmas = useCallback(async () => {
    setLoadingTurmas(true);
    setErroTurmas("");
    try {
      const escola_id = localStorage.getItem("escola_id") || 1;
      const { data } = await api.get("/api/turmas", { params: { escola_id } });
      setTurmas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar turmas:", err);
      setErroTurmas("Não foi possível carregar as turmas desta escola.");
    } finally {
      setLoadingTurmas(false);
    }
  }, []);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  // ─── Carregar agrupamentos ────────────────────────────────────────────────
  const fetchAgrupamentos = useCallback(async () => {
    setLoadingAgrupamentos(true);
    setErroAgrupamentos("");
    try {
      const { data } = await api.get("/api/agrupamentos", {
        params: { ano_letivo: anoLetivo },
      });
      setAgrupamentos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar agrupamentos:", err);
      setErroAgrupamentos("Não foi possível carregar as turmas de agrupamento.");
    } finally {
      setLoadingAgrupamentos(false);
    }
  }, [anoLetivo]);

  useEffect(() => {
    if (abaAtiva === "agrupamentos") {
      fetchAgrupamentos();
    }
  }, [abaAtiva, fetchAgrupamentos]);

  const turmasFiltradas = turmas.filter(
    (t) =>
      turnoSelecionado &&
      normalizaTexto(t.turno) === normalizaTexto(turnoSelecionado) &&
      Number(t.ano) === anoLetivo
  );

  const agrupamentosFiltrados = agrupamentos.filter((agr) => {
    if (filtroTurnoAgr !== "TODOS") {
      if (normalizaTexto(agr.turno) !== normalizaTexto(filtroTurnoAgr)) return false;
    }
    if (buscaAgrupamento.trim()) {
      const termo = normalizaTexto(buscaAgrupamento);
      const matchNome = normalizaTexto(agr.nome).includes(termo);
      const matchTipo = normalizaTexto(agr.tipo).includes(termo);
      const matchComp = Array.isArray(agr.componentes) &&
        agr.componentes.some((c) => normalizaTexto(c.disciplina_nome).includes(termo));
      if (!matchNome && !matchTipo && !matchComp) return false;
    }
    return true;
  });

  // ─── Carregar cargas da turma regular (por semestre) ──────────────────────
  const recarregarCargasDaTurma = useCallback(async (turmaId, semestre = 1) => {
    setLoadingCargas(true);
    setErroCargas("");
    try {
      const { data } = await api.get("/api/cargas-horarias", {
        params: { turma_id: turmaId, semestre },
      });
      const itens = data?.itens ?? [];
      setCargasTurma(itens);
      setTotalCarga(Number(data?.totalCarga) || 0);
    } catch (err) {
      console.error("Erro ao recarregar cargas:", err);
      setErroCargas("Não foi possível recarregar as cargas desta turma.");
    } finally {
      setLoadingCargas(false);
    }
  }, []);

  // Recarrega automaticamente quando muda o semestre
  useEffect(() => {
    if (!turmaSelecionada) return;
    recarregarCargasDaTurma(turmaSelecionada.id, semestreSelecionado);
  }, [semestreSelecionado, turmaSelecionada?.id, recarregarCargasDaTurma]);

  // ─── Handlers Turmas Regulares ────────────────────────────────────────────
  const handleClickTurno = (turno) => {
    setTurnoSelecionado(turno);
    setTurmaSelecionada(null);
    setCargasTurma([]);
    setTotalCarga(0);
    setErroCargas("");
    setSemestreSelecionado(1);
  };

  const handleChangeAno = (novoAno) => {
    setAnoLetivo(Number(novoAno));
    setTurmaSelecionada(null);
    setCargasTurma([]);
    setTotalCarga(0);
    setErroCargas("");
    setSemestreSelecionado(1);
  };

  const handleClickTurma = async (turma) => {
    setTurmaSelecionada(turma);
    setCargasTurma([]);
    setTotalCarga(0);
    setErroCargas("");
    setSemestreSelecionado(1);
    setLoadingCargas(true);

    try {
      const { data } = await api.get("/api/cargas-horarias", {
        params: { turma_id: turma.id, semestre: 1 },
      });
      const itens = data?.itens ?? [];
      if (itens.length > 0) {
        setCargasTurma(itens);
        setTotalCarga(Number(data?.totalCarga) || 0);
      } else {
        setOpenModalDefinir(true);
      }
    } catch (err) {
      console.error("Erro ao buscar cargas da turma:", err);
      setErroCargas("Não foi possível carregar as cargas desta turma.");
    } finally {
      setLoadingCargas(false);
    }
  };

  const handleModalDefinirClose = async () => {
    setOpenModalDefinir(false);
    if (!turmaSelecionada) return;
    await recarregarCargasDaTurma(turmaSelecionada.id, semestreSelecionado);
  };

  const handleAbrirEditar = () => setOpenModalEditar(true);

  const handleModalEditarClose = async () => {
    setOpenModalEditar(false);
    if (!turmaSelecionada) return;
    await recarregarCargasDaTurma(turmaSelecionada.id, semestreSelecionado);
  };

  const handleCopiarSemestre = async () => {
    if (!turmaSelecionada) return;
    const de = semestreSelecionado;
    const para = de === 1 ? 2 : 1;
    const confirm = window.confirm(
      `Deseja copiar as cargas do ${de}º semestre para o ${para}º semestre?\nAs cargas existentes no ${para}º semestre serão substituídas.`
    );
    if (!confirm) return;

    setCopiando(true);
    try {
      await api.post("/api/cargas-horarias/copiar-semestre", {
        turma_ids: [turmaSelecionada.id],
        de,
        para,
      });
      alert(`✅ Cargas copiadas para o ${para}º semestre com sucesso!`);
      setSemestreSelecionado(para);
    } catch (err) {
      alert(err?.response?.data?.message || "Erro ao copiar semestre.");
    } finally {
      setCopiando(false);
    }
  };

  // ─── Handlers Turmas de Agrupamento ───────────────────────────────────────
  const handleAbrirEditarAgrupamento = (agr) => {
    setAgrupamentoParaEditar(agr);
    setOpenModalComponentesAgr(true);
  };

  const handleAgrupamentoUpdated = async () => {
    setOpenModalComponentesAgr(false);
    setAgrupamentoParaEditar(null);
    await fetchAgrupamentos();
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Cabeçalho com Abas Premium ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>Gestão de Cargas Horárias</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Secretaria Escolar
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Defina a matriz curricular das turmas regulares e a carga horária dos componentes de turmas de agrupamento
          </p>
        </div>

        {/* Seletor de Abas Estilo Segmented Control */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva("regulares")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              abaAtiva === "regulares"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <BuildingOffice2Icon className={`w-4 h-4 ${abaAtiva === "regulares" ? "text-white" : "text-indigo-600"}`} />
            <span>Turmas Regulares</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("agrupamentos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              abaAtiva === "agrupamentos"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <UserGroupIcon className={`w-4 h-4 ${abaAtiva === "agrupamentos" ? "text-white" : "text-indigo-600"}`} />
            <span>Turmas de Agrupamento</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                abaAtiva === "agrupamentos"
                  ? "bg-white/20 text-white"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              Novo
            </span>
          </button>
        </div>
      </div>

      {/* ── ABA 1: TURMAS REGULARES ────────────────────────────────────────── */}
      {abaAtiva === "regulares" && (
        <div className="space-y-6">
          {/* Seletor de Ano Letivo */}
          <div className="flex justify-center items-center gap-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Ano Letivo:
            </span>
            <div className="flex gap-2">
              {anosDisponiveis.map((ano) => (
                <button
                  key={ano}
                  onClick={() => handleChangeAno(ano)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    anoLetivo === ano
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {ano}
                </button>
              ))}
            </div>
          </div>

          {/* Botões de Turnos Oficiais */}
          <div className="flex flex-wrap justify-center gap-3">
            {turnos.map((turno) => (
              <button
                key={turno}
                onClick={() => handleClickTurno(turno)}
                className={`px-6 py-3 text-sm font-bold rounded-2xl shadow-sm transition-all cursor-pointer ${
                  turnoSelecionado === turno
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 scale-105"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                }`}
              >
                {turno}
              </button>
            ))}
          </div>

          {/* Cards de Turmas por Turno */}
          {turnoSelecionado && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Turmas — Turno {turnoSelecionado} ({anoLetivo})
                </span>
                <button
                  onClick={() => setOpenModalLote(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                  title="Definir o mesmo conjunto de disciplinas para múltiplas turmas de uma só vez"
                >
                  <span>📋</span> Cadastrar em Lote
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {loadingTurmas ? (
                  <p className="col-span-full text-center text-xs text-slate-500 py-4">
                    Carregando turmas...
                  </p>
                ) : erroTurmas ? (
                  <p className="col-span-full text-center text-xs text-red-600 py-4">{erroTurmas}</p>
                ) : turmasFiltradas.length > 0 ? (
                  turmasFiltradas.map((turma) => (
                    <button
                      key={turma.id}
                      type="button"
                      onClick={() => handleClickTurma(turma)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        turmaSelecionada?.id === turma.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100 scale-105"
                          : "bg-slate-50 hover:bg-blue-50/60 border-slate-200 text-slate-800 hover:border-blue-300"
                      }`}
                      title={`Turma ${turma.turma}${turma.regime === "semestral" ? " 📅 Semestral" : ""}`}
                    >
                      <div className="text-xs font-bold uppercase truncate">{turma.turma}</div>
                      {turma.regime === "semestral" && (
                        <span className={`text-[10px] block mt-0.5 ${turmaSelecionada?.id === turma.id ? "text-blue-100" : "text-blue-600"}`}>
                          📅 Semestral
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="col-span-full text-center text-xs text-slate-500 py-6">
                    Nenhuma turma regular encontrada para {turnoSelecionado} em {anoLetivo}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tabela da Turma Regular Selecionada */}
          {turmaSelecionada && !openModalDefinir && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span>Disciplinas da Turma {turmaSelecionada.turma}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                      {turmaSelecionada.turno} • {turmaSelecionada.etapa || "Regular"}
                    </span>
                  </h2>
                  {ehSemestral && (
                    <span className="text-xs text-indigo-600 font-semibold mt-1 inline-block">
                      📅 Regime Semestral
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {ehSemestral && (
                    <button
                      onClick={handleCopiarSemestre}
                      disabled={copiando}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      title={`Copiar cargas deste semestre para o ${semestreSelecionado === 1 ? "2º" : "1º"} semestre`}
                    >
                      {copiando ? "Copiando…" : `📋 Copiar para ${semestreSelecionado === 1 ? "2º" : "1º"} Sem.`}
                    </button>
                  )}
                  <button
                    onClick={handleAbrirEditar}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                    title="Alterar/definir disciplinas"
                  >
                    Alterar / Definir
                  </button>
                  {cargasTurma.length > 0 && (
                    <span className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs font-bold">
                      Total: {totalCarga}h
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs de Semestre — turmas semestrais */}
              {ehSemestral && (
                <TabsSemestre
                  semestre={semestreSelecionado}
                  onChange={setSemestreSelecionado}
                />
              )}

              {loadingCargas ? (
                <p className="text-center text-xs text-slate-500 py-6">Carregando matriz curricular…</p>
              ) : erroCargas ? (
                <p className="text-center text-xs text-red-600 py-4">{erroCargas}</p>
              ) : cargasTurma.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="py-2.5 px-4 font-bold text-center w-12">#</th>
                        <th className="py-2.5 px-4 font-bold">Disciplina</th>
                        <th className="py-2.5 px-4 font-bold text-center w-32">Carga Semanal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cargasTurma.map((item, idx) => (
                        <tr key={item.disciplina_id ?? `${item.disciplina_nome}-${idx}`} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-4 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900 uppercase">{item.disciplina_nome}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-blue-700">{item.carga}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500 bg-slate-50/50">
                  {ehSemestral
                    ? `Nenhuma disciplina cadastrada para o ${semestreSelecionado}º semestre desta turma.`
                    : "Nenhuma disciplina cadastrada para esta turma ainda. Clique em Alterar / Definir para começar."}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 2: TURMAS DE AGRUPAMENTO (NOVO ENSINO MÉDIO) ────────────────── */}
      {abaAtiva === "agrupamentos" && (
        <div className="space-y-6">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Filtro de Turno */}
            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Turno:
              </span>
              {["TODOS", ...turnos].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFiltroTurnoAgr(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filtroTurnoAgr === t
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/70 border border-slate-200/80"
                  }`}
                >
                  {t === "TODOS" ? "Todos os Turnos" : t}
                </button>
              ))}
            </div>

            {/* Busca textual */}
            <div className="relative w-full md:w-72">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, tipo ou disciplina..."
                value={buscaAgrupamento}
                onChange={(e) => setBuscaAgrupamento(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Grid de Agrupamentos e Componentes */}
          {loadingAgrupamentos ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200">
              Carregando turmas de agrupamento...
            </div>
          ) : erroAgrupamentos ? (
            <div className="p-6 text-center text-xs text-red-600 bg-red-50 rounded-3xl border border-red-200">
              {erroAgrupamentos}
            </div>
          ) : agrupamentosFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
              <UserGroupIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Nenhuma turma de agrupamento encontrada</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Crie turmas de agrupamento para IFAs, Eletivas e Projetos na aba <strong>Turmas de Agrupamento</strong> em <strong>Secretaria → Turmas</strong> para gerenciar suas cargas horárias aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agrupamentosFiltrados.map((agr) => {
                const comps = Array.isArray(agr.componentes) ? agr.componentes : [];
                const cargaTotalAgr = comps.reduce(
                  (acc, c) => acc + (Number(c.carga_semanal) || 0),
                  0
                );

                return (
                  <div
                    key={agr.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                              {agr.tipo || "AGRUPAMENTO"}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {agr.turno}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              {agr.semestre}º Semestre
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                            {agr.nome}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {cargaTotalAgr}h/sem
                          </span>
                        </div>
                      </div>

                      {/* Lista de Componentes Vinculados */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Componentes ({comps.length}):
                        </div>
                        {comps.length === 0 ? (
                          <p className="text-xs italic text-slate-400">
                            Nenhum componente vinculado.
                          </p>
                        ) : (
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {comps.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200/60"
                              >
                                <span className="font-semibold text-slate-800 truncate mr-2">
                                  {c.disciplina_nome}
                                </span>
                                <span className="font-bold text-blue-600 shrink-0">
                                  {c.carga_semanal}h
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="pt-4 mt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleAbrirEditarAgrupamento(agr)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        <span>Definir / Alterar Componentes e Carga</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAIS ────────────────────────────────────────────────────────── */}

      {/* Modal: Definir Cargas Turma Regular (primeiro cadastro) */}
      <Modal open={openModalDefinir} onClose={handleModalDefinirClose}>
        {openModalDefinir && turnoSelecionado && turmaSelecionada && (
          <ModalDefinirCargas
            turno={turnoSelecionado}
            turma={turmaSelecionada}
            onClose={handleModalDefinirClose}
            semestre={semestreSelecionado}
          />
        )}
      </Modal>

      {/* Modal: Editar/Definir Cargas Turma Regular (com lixeira) */}
      <Modal open={openModalEditar} onClose={handleModalEditarClose}>
        {openModalEditar && turnoSelecionado && turmaSelecionada && (
          <div className="w-[720px] max-w-[95vw]">
            <ListaCargasHorarias
              turma={turmaSelecionada}
              turno={turnoSelecionado}
              onSaved={handleModalEditarClose}
              semestre={semestreSelecionado}
            />
          </div>
        )}
      </Modal>

      {/* Modal: Cadastrar em Lote Turmas Regulares */}
      <Modal open={openModalLote} onClose={() => setOpenModalLote(false)}>
        {openModalLote && turnoSelecionado && (
          <ModalCargasLote
            turno={turnoSelecionado}
            turmas={turmasFiltradas}
            onClose={() => setOpenModalLote(false)}
            onSaved={() => {
              setTurmaSelecionada(null);
              setCargasTurma([]);
            }}
          />
        )}
      </Modal>

      {/* Modal: Componentes e Carga Horária de Turma de Agrupamento */}
      {agrupamentoParaEditar && (
        <AgrupamentoComponentesModal
          open={openModalComponentesAgr}
          onClose={() => {
            setOpenModalComponentesAgr(false);
            setAgrupamentoParaEditar(null);
          }}
          agrupamento={agrupamentoParaEditar}
          onUpdated={handleAgrupamentoUpdated}
        />
      )}
    </div>
  );
}
