// src/features/professores/conselho/ConselhoClasseProfessor.jsx
// ============================================================================
// Conselho de Classe — Visão do Professor
// Exibe apenas as turmas atribuídas ao professor logado.
// Fonte: GET /professores/me/turmas
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import ModalBoletim from "../../boletim/ModalBoletim";
import ModalFichaAluno from "../../pedagogico/conselho/ModalFichaAluno";
import ModalZoomFoto from "../../pedagogico/conselho/ModalZoomFoto";
import ModalRegistroConselho from "../../pedagogico/conselho/ModalRegistroConselho";
import {
  EyeIcon,
  DocumentTextIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { getFotoURL } from "../../../utils/foto";

// ── Helpers ────────────────────────────────────────────────────────────────
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

function nomeProfessor() {
  return (
    localStorage.getItem("nome_usuario") ||
    localStorage.getItem("nome") ||
    "Professor"
  );
}

// ── Componente ─────────────────────────────────────────────────────────────
export default function ConselhoClasseProfessor() {
  // ── Turmas do professor ────────────────────────────────────────────────
  const [turmas, setTurmas]                   = useState([]);
  const [loadingTurmas, setLoadingTurmas]     = useState(true);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  // ── Alunos ────────────────────────────────────────────────────────────
  const [alunosTurma, setAlunosTurma]         = useState([]);
  const [loadingAlunos, setLoadingAlunos]     = useState(false);

  // ── Ano letivo ─────────────────────────────────────────────────────────
  const [anosLetivos, setAnosLetivos]         = useState([]);
  const [anoLetivo, setAnoLetivo]             = useState(anoLetivoPadrao());

  // ── Modal Boletim ──────────────────────────────────────────────────────
  const [modalBoletimOpen, setModalBoletimOpen]       = useState(false);
  const [codigoAlunoBoletim, setCodigoAlunoBoletim]   = useState(null);

  // ── Modal Ficha ────────────────────────────────────────────────────────
  const [modalFichaOpen, setModalFichaOpen]           = useState(false);
  const [codigoAlunoFicha, setCodigoAlunoFicha]       = useState(null);

  // ── Cache-buster para fotos ────────────────────────────────────────────
  const [fotoStamp, setFotoStamp]                     = useState(0);

  // ── Modal Zoom da foto ─────────────────────────────────────────────────
  const [zoomOpen, setZoomOpen]                       = useState(false);
  const [zoomSrc, setZoomSrc]                         = useState("");
  const [zoomAlt, setZoomAlt]                         = useState("");

  // ── Modal Registro de Conselho ─────────────────────────────────────────
  const [modalRegistroOpen, setModalRegistroOpen]     = useState(false);
  const [alunoRegistro, setAlunoRegistro]             = useState(null);

  // ── Carregamento inicial ───────────────────────────────────────────────
  useEffect(() => {
    carregarAnos();
    carregarTurmasProfessor();
    // eslint-disable-next-line
  }, []);

  async function carregarAnos() {
    try {
      const res = await api.get("/api/matriculas/anos");
      setAnosLetivos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAnosLetivos([anoLetivoPadrao()]);
    }
  }

  async function carregarTurmasProfessor() {
    setLoadingTurmas(true);
    try {
      const res = await api.get("/professores/me/turmas");
      if (res.data?.ok) {
        setTurmas(res.data.turmas || []);
      } else {
        setTurmas([]);
      }
    } catch (err) {
      console.error("Erro ao carregar turmas do professor:", err);
      setTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  }

  // ── Seleciona turma e carrega alunos ──────────────────────────────────
  async function handleClickTurma(turma) {
    setTurmaSelecionada(turma);
    setLoadingAlunos(true);
    setAlunosTurma([]);
    try {
      const { data } = await api.get("/api/alunos", {
        params: { turma_id: turma.id, ano_letivo: anoLetivo },
      });
      setAlunosTurma(data?.alunos || data || []);
    } catch (err) {
      console.error("Erro ao buscar alunos da turma:", err);
      setAlunosTurma([]);
    } finally {
      setLoadingAlunos(false);
    }
  }

  // ── Ao trocar ano letivo ────────────────────────────────────────────────
  function handleChangeAno(e) {
    setAnoLetivo(Number(e.target.value));
    setTurmaSelecionada(null);
    setAlunosTurma([]);
  }

  // ── Fechamento da ficha: força reload das fotos ────────────────────────
  function handleCloseFicha() {
    setModalFichaOpen(false);
    setFotoStamp(Date.now());
  }

  // ── Funções de abertura de modais ─────────────────────────────────────
  function abrirModalBoletim(codigo) {
    setCodigoAlunoBoletim(codigo);
    setModalBoletimOpen(true);
  }

  function abrirModalFicha(codigo) {
    setCodigoAlunoFicha(codigo);
    setModalFichaOpen(true);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Título */}
      <h1
        className="text-5xl font-bold text-center text-blue-900 mb-2"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Conselho de Classe
      </h1>
      <p className="text-center text-gray-500 mb-6 text-sm">
        Olá, <strong>{nomeProfessor()}</strong>! Abaixo estão suas turmas.
      </p>

      {/* Filtro de Ano Letivo */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
          <label htmlFor="filtro-ano-prof" className="text-sm font-semibold text-gray-700">
            Ano Letivo:
          </label>
          <select
            id="filtro-ano-prof"
            value={anoLetivo}
            onChange={handleChangeAno}
            className="border rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {anosLetivos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards das Turmas do Professor */}
      <div className="mb-6">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Minhas Turmas — selecione uma para ver os alunos
        </p>

        {loadingTurmas ? (
          <p className="text-center text-gray-500">Carregando turmas...</p>
        ) : turmas.length === 0 ? (
          <p className="text-center text-gray-500">
            Nenhuma turma atribuída a você no ano letivo {anoLetivo}.
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {turmas.map((turma) => {
              const nome = turma.nome || turma.turma || String(turma.id);
              const isSelecionada = turmaSelecionada?.id === turma.id;
              return (
                <div
                  key={turma.id}
                  onClick={() => handleClickTurma(turma)}
                  className={`
                    bg-gradient-to-b from-blue-200 to-blue-50
                    rounded-lg px-6 py-3 shadow-md cursor-pointer
                    hover:shadow-xl transition-transform hover:scale-105
                    text-center font-bold text-blue-900 text-base
                    flex items-center justify-center whitespace-nowrap min-w-[120px]
                    ${isSelecionada ? "ring-2 ring-green-600 from-green-200 to-green-50 text-green-900" : ""}
                  `}
                >
                  {isSelecionada && (
                    <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                  )}
                  {nome}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de Alunos da Turma Selecionada */}
      {turmaSelecionada && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-2xl font-semibold mb-4 text-blue-800">
            Alunos da Turma {turmaSelecionada.nome || turmaSelecionada.turma}
          </h2>

          {loadingAlunos ? (
            <p className="text-center text-gray-500">Carregando alunos...</p>
          ) : alunosTurma.length > 0 ? (
            <table className="w-full">
              <tbody>
                {alunosTurma.map((aluno) => {
                  const baseFoto = aluno?.foto_url || getFotoURL(aluno);
                  const fotoSrc =
                    baseFoto && fotoStamp
                      ? `${baseFoto}${baseFoto.includes("?") ? "&" : "?"}t=${fotoStamp}`
                      : baseFoto;

                  return (
                    <tr key={aluno.id} className="hover:bg-gray-50">
                      {/* Foto */}
                      <td className="py-2 px-2 text-center">
                        <img
                          key={`${aluno.codigo}-${fotoStamp}`}
                          src={fotoSrc}
                          alt={`Foto de ${aluno.estudante}`}
                          className="w-12 h-12 rounded-full object-cover mx-auto cursor-pointer"
                          onClick={() => {
                            setZoomSrc(fotoSrc);
                            setZoomAlt(`Foto de ${aluno.estudante}`);
                            setZoomOpen(true);
                          }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='100%25' height='100%25' rx='48' ry='48' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%236b7280'%3ESem%20foto%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </td>

                      {/* Nome */}
                      <td className="py-2 px-2 text-left font-medium">
                        {aluno.estudante}
                      </td>

                      {/* Ações */}
                      <td className="py-2 px-2 text-center">
                        <div className="flex justify-center gap-3">
                          <button
                            title="Registro de Conselho"
                            onClick={() => { setAlunoRegistro(aluno); setModalRegistroOpen(true); }}
                          >
                            <EyeIcon className="h-6 w-6 text-gray-600 hover:text-blue-600" />
                          </button>

                          <button
                            onClick={() => abrirModalBoletim(aluno.codigo)}
                            title="Visualizar boletim"
                          >
                            <DocumentTextIcon className="h-6 w-6 text-gray-600 hover:text-green-600" />
                          </button>

                          <button
                            onClick={() => abrirModalFicha(aluno.codigo)}
                            title="Ficha do estudante"
                          >
                            <IdentificationIcon className="h-6 w-6 text-gray-600 hover:text-purple-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500">
              Nenhum aluno encontrado para esta turma.
            </p>
          )}
        </div>
      )}

      {/* ── Modais ── */}
      {modalBoletimOpen && (
        <ModalBoletim
          open={modalBoletimOpen}
          codigo={codigoAlunoBoletim}
          onClose={() => setModalBoletimOpen(false)}
        />
      )}

      {modalFichaOpen && (
        <ModalFichaAluno
          open={modalFichaOpen}
          codigo={codigoAlunoFicha}
          onClose={handleCloseFicha}
        />
      )}

      {zoomOpen && (
        <ModalZoomFoto
          open={zoomOpen}
          src={zoomSrc}
          alt={zoomAlt}
          onClose={() => setZoomOpen(false)}
        />
      )}

      {modalRegistroOpen && alunoRegistro && (
        <ModalRegistroConselho
          aluno={alunoRegistro}
          turma={turmaSelecionada}
          onClose={() => { setModalRegistroOpen(false); setAlunoRegistro(null); }}
        />
      )}
    </div>
  );
}
