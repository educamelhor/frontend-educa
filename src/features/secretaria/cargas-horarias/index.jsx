// src/features/secretaria/cargas-horarias/index.jsx
// ============================================================================
// Cargas Horárias — Fluxo completo:
// - Clicar em turma → checa se há disciplinas salvas via /api/cargas-horarias?turma_id=
//   - Se houver, renderiza tabela abaixo.
//   - Se não houver, abre o ModalDefinirCargas.
// - Botão "Alterar / Definir" abre modal com editor por turma (ListaCargasHorarias no modo turma)
// - Ao fechar/salvar, recarrega as cargas e exibe a tabela.
// ============================================================================

import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Modal from "../../../components/ui/Modal";
import ModalDefinirCargas from "./ModalDefinirCargas";
import ListaCargasHorarias from "./ListaCargasHorarias"; // editor por turma (com lixeira) :contentReference[oaicite:1]{index=1}

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
  // ─────────────────────────────────────────────────────────────
  // Estados principais
  // ─────────────────────────────────────────────────────────────
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [erroTurmas, setErroTurmas] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  // Modal: definir novas cargas (quando ainda não existem)
  const [openModalDefinir, setOpenModalDefinir] = useState(false);
  // Modal: editar/alterar cargas existentes (lista com lixo)
  const [openModalEditar, setOpenModalEditar] = useState(false);

  // Cargas existentes da turma selecionada
  const [loadingCargas, setLoadingCargas] = useState(false);
  const [erroCargas, setErroCargas] = useState("");
  const [cargasTurma, setCargasTurma] = useState([]); // [{disciplina_id, disciplina_nome, carga, ...}]
  const [totalCarga, setTotalCarga] = useState(0);

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  // ─────────────────────────────────────────────────────────────
  // Carregar turmas da escola
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // Filtra turmas pelo turno selecionado
  // ─────────────────────────────────────────────────────────────
  const turmasFiltradas = turmas.filter(
    (t) => turnoSelecionado && normalizaTexto(t.turno) === normalizaTexto(turnoSelecionado)
  );

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────
  const handleClickTurno = (turno) => {
    setTurnoSelecionado(turno);
    setTurmaSelecionada(null);
    setCargasTurma([]);
    setTotalCarga(0);
    setErroCargas("");
  };

  // Clique no minicard: decide se mostra tabela ou abre modal "Definir"
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
        // já renderiza a tabela; não abre modal aqui
      } else {
        // sem dados → abre o modal de definição (primeiro cadastro)
        setOpenModalDefinir(true);
      }
    } catch (err) {
      console.error("Erro ao buscar cargas da turma:", err);
      setErroCargas("Não foi possível carregar as cargas desta turma.");
    } finally {
      setLoadingCargas(false);
    }
  };

  // Fechar modal "Definir" e recarregar a lista da turma
  const handleModalDefinirClose = async () => {
    setOpenModalDefinir(false);
    if (!turmaSelecionada) return;
    await recarregarCargasDaTurma(turmaSelecionada.id);
  };

  // Abrir modal "Editar" (lista com lixeira)
  const handleAbrirEditar = () => {
    setOpenModalEditar(true);
  };

  // Fechar modal "Editar" e recarregar a lista da turma
  const handleModalEditarClose = async () => {
    setOpenModalEditar(false);
    if (!turmaSelecionada) return;
    await recarregarCargasDaTurma(turmaSelecionada.id);
  };

  // Recarrega dados para a turma selecionada
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

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Título */}
      <h1
        className="text-5xl font-bold text-center text-blue-900 mb-8"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Cargas Horárias
      </h1>

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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-8">
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
                className={`bg-gradient-to-b from-blue-200 to-blue-50 rounded-md px-9 py-2 shadow-md cursor-pointer hover:shadow-xl transition-transform hover:scale-105 text-center font-bold text-blue-900 text-base ${
                  turmaSelecionada?.id === turma.id ? "ring-2 ring-green-600" : ""
                }`}
                style={{ minWidth: "80px", maxWidth: "100px", margin: "0 auto" }}
                title={`Turma ${turma.turma}`}
              >
                {turma.turma}
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">
              Nenhuma turma encontrada para {turnoSelecionado}.
            </p>
          )}
        </div>
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

      {/* Modal: Definir Cargas (primeiro cadastro, quando não há dados) */}
      <Modal open={openModalDefinir} onClose={handleModalDefinirClose}>
        {openModalDefinir && turnoSelecionado && turmaSelecionada && (
          <ModalDefinirCargas
            turno={turnoSelecionado}
            turma={turmaSelecionada}
            onClose={handleModalDefinirClose}
          />
        )}
      </Modal>

      {/* Modal: Editar/Definir (lista com lixeira – modo turma) */}
      <Modal open={openModalEditar} onClose={handleModalEditarClose}>
        {openModalEditar && turnoSelecionado && turmaSelecionada && (
          <div className="w-[720px] max-w-[95vw]">
            <ListaCargasHorarias
              turma={turmaSelecionada}
              turno={turnoSelecionado}
              onSaved={handleModalEditarClose} // ao salvar, fecha e recarrega
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
