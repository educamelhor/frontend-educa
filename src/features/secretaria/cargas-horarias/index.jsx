// src/features/secretaria/cargas-horarias/index.jsx
// ============================================================================
// Cargas Horárias — define quais disciplinas cada turma tem
// Suporte a regimes: ANUAL (1 conjunto anual) e SEMESTRAL (1º e 2º semestres)
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../../services/api";
import Modal from "../../../components/ui/Modal";
import ModalDefinirCargas from "./ModalDefinirCargas";
import ListaCargasHorarias from "./ListaCargasHorarias";
import ModalCargasLote from "./ModalCargasLote";

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
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
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
  // ─── Estados principais ───────────────────────────────────────────────────
  const [anoLetivo, setAnoLetivo] = useState(getAnoLetivoAtual());
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [erroTurmas, setErroTurmas] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  // ─── Semestre ─────────────────────────────────────────────────────────────
  const [semestreSelecionado, setSemestreSelecionado] = useState(1);

  const [openModalDefinir, setOpenModalDefinir] = useState(false);
  const [openModalEditar, setOpenModalEditar] = useState(false);
  const [openModalLote, setOpenModalLote] = useState(false);

  const [loadingCargas, setLoadingCargas] = useState(false);
  const [erroCargas, setErroCargas] = useState("");
  const [cargasTurma, setCargasTurma] = useState([]);
  const [totalCarga, setTotalCarga] = useState(0);
  const [copiando, setCopiando] = useState(false);

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  const anosDisponiveis = useMemo(() => {
    const set = new Set();
    turmas.forEach((t) => { if (t.ano) set.add(Number(t.ano)); });
    set.add(getAnoLetivoAtual());
    return Array.from(set).sort((a, b) => b - a);
  }, [turmas]);

  // Regime da turma selecionada
  const ehSemestral = turmaSelecionada?.regime === "semestral";

  // ─── Carregar turmas ──────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchTurmas() {
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
    }
    fetchTurmas();
  }, []);

  const turmasFiltradas = turmas.filter(
    (t) =>
      turnoSelecionado &&
      normalizaTexto(t.turno) === normalizaTexto(turnoSelecionado) &&
      Number(t.ano) === anoLetivo
  );

  // ─── Carregar cargas da turma (por semestre) ──────────────────────────────
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
  }, [semestreSelecionado, turmaSelecionada?.id]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
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
    setSemestreSelecionado(1); // sempre começa no 1º semestre
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

  // ─── Copiar do 1º para o 2º semestre ─────────────────────────────────────
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
      // Muda para o semestre destino e recarrega
      setSemestreSelecionado(para);
    } catch (err) {
      alert(err?.response?.data?.message || "Erro ao copiar semestre.");
    } finally {
      setCopiando(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Título */}
      <h1
        className="text-5xl font-bold text-center text-blue-900 mb-6"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Cargas Horárias
      </h1>

      {/* ── Conteúdo principal ─────────────────────────────────────────────── */}
      <>
        {/* Seletor de Ano Letivo */}
        <div className="flex justify-center items-center gap-3 mb-6">
          <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
            Ano Letivo
          </span>
          <div className="flex gap-2">
            {anosDisponiveis.map((ano) => (
              <button
                key={ano}
                onClick={() => handleChangeAno(ano)}
                className={`px-5 py-2 rounded-full text-sm font-bold shadow transition hover:scale-105 ${
                  anoLetivo === ano
                    ? "bg-blue-700 text-white shadow-blue-200"
                    : "bg-white text-blue-700 border border-blue-300 hover:bg-blue-50"
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de Turnos */}
        <div className="flex justify-center gap-4 mb-10">
          {turnos.map((turno) => (
            <button
              key={turno}
              onClick={() => handleClickTurno(turno)}
              className={`px-8 py-4 text-xl font-semibold rounded-xl shadow-md transition transform hover:scale-105 ${
                turnoSelecionado === turno
                  ? "bg-green-600 text-white"
                  : "bg-white text-blue-800 border border-blue-400 hover:bg-blue-100"
              }`}
            >
              {turno}
            </button>
          ))}
        </div>

        {/* Cards de Turmas por Turno */}
        {turnoSelecionado && (
          <>
            {/* Botão Cadastrar em Lote */}
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setOpenModalLote(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow transition hover:scale-105"
                title="Definir o mesmo conjunto de disciplinas para múltiplas turmas de uma só vez"
              >
                <span>📋</span> Cadastrar em Lote
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 mb-8">
              {loadingTurmas ? (
                <p className="col-span-full text-center text-gray-500">
                  Turmas sendo carregadas...
                </p>
              ) : erroTurmas ? (
                <p className="col-span-full text-center text-red-600">{erroTurmas}</p>
              ) : turmasFiltradas.length > 0 ? (
                turmasFiltradas.map((turma) => (
                  <div
                    key={turma.id}
                    onClick={() => handleClickTurma(turma)}
                    className={`bg-gradient-to-b from-blue-200 to-blue-50 rounded-md px-3 py-2 shadow-md cursor-pointer hover:shadow-xl transition-transform hover:scale-105 text-center font-bold text-blue-900 text-sm whitespace-nowrap ${
                      turmaSelecionada?.id === turma.id ? "ring-2 ring-green-600" : ""
                    }`}
                    title={`Turma ${turma.turma}${turma.regime === 'semestral' ? ' 📅 Semestral' : ''}`}
                  >
                    {turma.turma}
                    {turma.regime === "semestral" && (
                      <span className="block text-xs text-blue-600 font-normal mt-0.5">📅</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500">
                  Nenhuma turma encontrada para {turnoSelecionado} em {anoLetivo}.
                </p>
              )}
            </div>
          </>
        )}

        {/* Bloco com TABELA (quando já há disciplinas salvas) */}
        {turmaSelecionada && !openModalDefinir && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-blue-800">
                  Disciplinas da Turma {turmaSelecionada.turma}
                </h2>
                {ehSemestral && (
                  <span className="text-sm text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                    📅 Regime Semestral
                  </span>
                )}
              </div>

              <div className="flex gap-2 items-center">
                {ehSemestral && (
                  <button
                    onClick={handleCopiarSemestre}
                    disabled={copiando}
                    className="px-3 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition"
                    title={`Copiar cargas deste semestre para o ${semestreSelecionado === 1 ? '2º' : '1º'} semestre`}
                  >
                    {copiando ? "Copiando…" : `📋 Copiar para ${semestreSelecionado === 1 ? '2º' : '1º'} Sem.`}
                  </button>
                )}
                <button
                  onClick={handleAbrirEditar}
                  className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                  title="Alterar/definir disciplinas"
                >
                  Alterar / Definir
                </button>
                {cargasTurma.length > 0 && (
                  <span className="px-3 py-2 rounded bg-blue-50 border text-blue-900 font-semibold">
                    Total: {totalCarga}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs de Semestre — apenas para turmas semestrais */}
            {ehSemestral && (
              <TabsSemestre
                semestre={semestreSelecionado}
                onChange={setSemestreSelecionado}
              />
            )}

            {loadingCargas ? (
              <p className="text-center text-gray-500">Carregando…</p>
            ) : erroCargas ? (
              <p className="text-center text-red-600">{erroCargas}</p>
            ) : cargasTurma.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="p-2 border text-center font-medium text-blue-900">#</th>
                      <th className="p-2 border text-center font-medium text-blue-900">Disciplina</th>
                      <th className="p-2 border text-center font-medium text-blue-900">Carga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargasTurma.map((item, idx) => (
                      <tr key={item.disciplina_id ?? `${item.disciplina_nome}-${idx}`} className="hover:bg-blue-50">
                        <td className="p-2 border text-center">{idx + 1}</td>
                        <td className="p-2 border text-center uppercase">{item.disciplina_nome}</td>
                        <td className="p-2 border text-center">{item.carga}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 border rounded bg-gray-50 text-gray-600">
                {ehSemestral
                  ? `Nenhuma disciplina cadastrada para o ${semestreSelecionado}º semestre desta turma.`
                  : "Nenhuma disciplina cadastrada para esta turma ainda."
                }
              </div>
            )}
          </div>
        )}

        {/* Modal: Definir Cargas (primeiro cadastro) */}
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

        {/* Modal: Editar/Definir (lista com lixeira) */}
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

        {/* Modal: Cadastrar em Lote */}
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
      </>
    </div>
  );
}
