// src/features/secretaria/cargas-horarias/index.jsx
// ============================================================================
// Cargas Horárias — Duas abas:
// 1. Cargas por Turma: define quais disciplinas cada turma tem (fluxo existente)
// 2. Config. por Segmento: configuração inteligente de carga por disciplina×etapa×turno
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import Modal from "../../../components/ui/Modal";
import ModalDefinirCargas from "./ModalDefinirCargas";
import ListaCargasHorarias from "./ListaCargasHorarias";
import ModalCargasLote from "./ModalCargasLote";
import ConfigCargaSegmento from "./ConfigCargaSegmento";

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

export default function CargasHorariasPage() {
  // ─── Aba ativa ────────────────────────────────────────────────────────────
  const [abaAtiva, setAbaAtiva] = useState("turmas");

  // ─── Estados principais (aba Cargas por Turma) ───────────────────────────
  const [anoLetivo, setAnoLetivo] = useState(getAnoLetivoAtual());
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [erroTurmas, setErroTurmas] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  const [openModalDefinir, setOpenModalDefinir] = useState(false);
  const [openModalEditar, setOpenModalEditar] = useState(false);
  const [openModalLote, setOpenModalLote] = useState(false);

  const [loadingCargas, setLoadingCargas] = useState(false);
  const [erroCargas, setErroCargas] = useState("");
  const [cargasTurma, setCargasTurma] = useState([]);
  const [totalCarga, setTotalCarga] = useState(0);

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  const anosDisponiveis = useMemo(() => {
    const set = new Set();
    turmas.forEach((t) => { if (t.ano) set.add(Number(t.ano)); });
    set.add(getAnoLetivoAtual());
    return Array.from(set).sort((a, b) => b - a);
  }, [turmas]);

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

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleClickTurno = (turno) => {
    setTurnoSelecionado(turno);
    setTurmaSelecionada(null);
    setCargasTurma([]);
    setTotalCarga(0);
    setErroCargas("");
  };

  const handleChangeAno = (novoAno) => {
    setAnoLetivo(Number(novoAno));
    setTurmaSelecionada(null);
    setCargasTurma([]);
    setTotalCarga(0);
    setErroCargas("");
  };

  const handleClickTurma = async (turma) => {
    setTurmaSelecionada(turma);
    setCargasTurma([]);
    setTotalCarga(0);
    setErroCargas("");
    setLoadingCargas(true);

    try {
      const { data } = await api.get("/api/cargas-horarias", {
        params: { turma_id: turma.id },
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
    await recarregarCargasDaTurma(turmaSelecionada.id);
  };

  const handleAbrirEditar = () => setOpenModalEditar(true);

  const handleModalEditarClose = async () => {
    setOpenModalEditar(false);
    if (!turmaSelecionada) return;
    await recarregarCargasDaTurma(turmaSelecionada.id);
  };

  async function recarregarCargasDaTurma(turmaId) {
    setLoadingCargas(true);
    setErroCargas("");
    try {
      const { data } = await api.get("/api/cargas-horarias", {
        params: { turma_id: turmaId },
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
  }

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

      {/* Navegação de Abas */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setAbaAtiva("turmas")}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
            abaAtiva === "turmas"
              ? "border-blue-600 text-blue-700 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-blue-600 hover:bg-gray-50"
          }`}
        >
          📚 Cargas por Turma
        </button>
        <button
          onClick={() => setAbaAtiva("segmento")}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
            abaAtiva === "segmento"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50"
              : "border-transparent text-gray-500 hover:text-indigo-600 hover:bg-gray-50"
          }`}
        >
          ⚡ Config. por Segmento
        </button>
      </div>

      {/* ── ABA: Config. por Segmento ─────────────────────────────────────── */}
      {abaAtiva === "segmento" && <ConfigCargaSegmento />}

      {/* ── ABA: Cargas por Turma ─────────────────────────────────────────── */}
      {abaAtiva === "turmas" && (
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
                      title={`Turma ${turma.turma}`}
                    >
                      {turma.turma}
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
                <h2 className="text-2xl font-semibold text-blue-800">
                  Disciplinas da Turma {turmaSelecionada.turma}
                </h2>

                <div className="flex gap-2">
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
                          <td className="p-2 border text-center">{item.disciplina_nome}</td>
                          <td className="p-2 border text-center">{item.carga}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 border rounded bg-gray-50 text-gray-600">
                  Nenhuma disciplina cadastrada para esta turma ainda.
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
      )}
    </div>
  );
}
