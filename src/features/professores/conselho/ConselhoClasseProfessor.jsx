// features/professores/conselho/ConselhoClasseProfessor.jsx
// ============================================================================
// Conselho de Classe — Perfil PROFESSOR (componente independente)
//
// Governança aplicada neste arquivo:
//  ✅ Visualizar boletim do aluno
//  ❌ Relatório Disciplinar — professor NÃO tem acesso
//  ❌ Relatório Pedagógico — professor NÃO registra (Descrição / Registro Interno)
//  ❌ Ação de edição (lápis) — exclusiva da direção/coordenação
//  ❌ Ficha completa do aluno — oculta para professor
//
// Este arquivo é INDEPENDENTE de ConselhoClasse.jsx (pedagogico/conselho).
// Alterações aqui NÃO afetam o conselho da direção/coordenação e vice-versa.
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import ModalBoletim from "../../boletim/ModalBoletim";
import ModalZoomFoto from "../../pedagogico/conselho/ModalZoomFoto";
import ModalRegistroConselhoProfessor from "./ModalRegistroConselhoProfessor";
import ModalFichaAluno from "../../pedagogico/conselho/ModalFichaAluno";
import { EyeIcon, DocumentTextIcon, IdentificationIcon } from "@heroicons/react/24/outline";
import { getFotoURL } from "../../../utils/foto";

function normalizaTexto(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Ano letivo padrão — corte 31/jan
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

export default function ConselhoClasseProfessor() {
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [alunosTurma, setAlunosTurma] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  // Ano Letivo — professor só vê o ano corrente por padrão
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());

  // Boletim (única ação disponível para professor)
  const [modalBoletimOpen, setModalBoletimOpen] = useState(false);
  const [codigoAlunoBoletim, setCodigoAlunoBoletim] = useState(null);

  // Registro de Conselho (professor pode criar + visualizar)
  const [modalConselhoOpen, setModalConselhoOpen] = useState(false);
  const [alunoConselho, setAlunoConselho] = useState(null);

  // Ficha do Aluno (somente banner pedagógico)
  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [codigoAlunoFicha, setCodigoAlunoFicha] = useState(null);

  // Cache-buster para fotos
  const [fotoStamp] = useState(Date.now());

  // Zoom da Foto
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomSrc, setZoomSrc] = useState("");
  const [zoomAlt, setZoomAlt] = useState("");

  function abrirModalBoletim(codigo) {
    setCodigoAlunoBoletim(codigo);
    setModalBoletimOpen(true);
  }

  function abrirModalConselho(aluno) {
    setAlunoConselho(aluno);
    setModalConselhoOpen(true);
  }

  function abrirModalFicha(codigo) {
    setCodigoAlunoFicha(codigo);
    setModalFichaOpen(true);
  }

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  useEffect(() => {
    async function carregarAnos() {
      try {
        const res = await api.get("/api/matriculas/anos");
        setAnosLetivos(Array.isArray(res.data) ? res.data : []);
      } catch {
        setAnosLetivos([anoLetivoPadrao()]);
      }
    }
    carregarAnos();
    fetchTurmas();
    // eslint-disable-next-line
  }, []);

  const fetchTurmas = async () => {
    setLoadingTurmas(true);
    try {
      const escola_id = localStorage.getItem("escola_id") || 1;
      const { data } = await api.get("/api/turmas", {
        params: { escola_id },
      });
      setTurmas(data);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      setTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  };

  // Professor vê apenas turmas do ano letivo selecionado
  const turmasFiltradas = turmas.filter(
    (t) =>
      turnoSelecionado &&
      normalizaTexto(t.turno) === normalizaTexto(turnoSelecionado) &&
      Number(t.ano) === anoLetivo
  );

  const handleClickTurno = (turno) => {
    setTurnoSelecionado(turno);
    setTurmaSelecionada(null);
    setAlunosTurma([]);
  };

  const handleClickTurma = async (turma) => {
    setTurmaSelecionada(turma);
    setLoadingAlunos(true);
    setAlunosTurma([]);
    try {
      const { data } = await api.get(`/api/alunos`, {
        params: { turma_id: turma.id, ano_letivo: anoLetivo },
      });
      setAlunosTurma(data?.alunos || data || []);
    } catch (err) {
      console.error("Erro ao buscar alunos da turma:", err);
    } finally {
      setLoadingAlunos(false);
    }
  };

  return (
    <div className="p-6">
      <h1
        className="text-5xl font-bold text-center text-blue-900 mb-6"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Conselho de Classe
      </h1>

      {/* Filtro de Ano Letivo */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
          <label htmlFor="filtro-ano-prof" className="text-sm font-semibold text-gray-700">
            Ano Letivo:
          </label>
          <select
            id="filtro-ano-prof"
            value={anoLetivo}
            onChange={(e) => {
              setAnoLetivo(Number(e.target.value));
              setTurnoSelecionado(null);
              setTurmaSelecionada(null);
              setAlunosTurma([]);
            }}
            className="border rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {anosLetivos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
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

      {/* Cards de Turmas */}
      {turnoSelecionado && (
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {loadingTurmas ? (
            <p className="w-full text-center text-gray-500">
              Turmas sendo carregadas...
            </p>
          ) : turmasFiltradas.length > 0 ? (
            turmasFiltradas.map((turma) => (
              <button
                key={turma.id}
                onClick={() => handleClickTurma(turma)}
                title={`Selecionar turma ${turma.turma}`}
                aria-label={`Selecionar turma ${turma.turma}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm border font-semibold text-sm
                  whitespace-nowrap transition-all duration-150 select-none
                  bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300 text-blue-900
                  hover:from-blue-100 hover:to-indigo-200 hover:shadow-md hover:scale-105 active:scale-95
                  ${turmaSelecionada?.id === turma.id ? "ring-2 ring-green-500 border-green-400 from-green-50 to-emerald-100" : "cursor-pointer"}`}
              >
                <span className="text-base">📋</span>
                <span>{turma.turma}</span>
              </button>
            ))
          ) : (
            <p className="w-full text-center text-gray-500">
              Nenhuma turma encontrada para {turnoSelecionado} no ano {anoLetivo}.
            </p>
          )}
        </div>
      )}

      {/* Lista de Alunos */}
      {turmaSelecionada && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-2xl font-semibold mb-4 text-blue-800">
            Alunos da Turma {turmaSelecionada.turma}
          </h2>

          {/* Aviso de governança */}
          <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            ℹ️ Como professor, você pode visualizar o <strong>boletim</strong> dos alunos.
            Relatórios disciplinares e registros pedagógicos são gerenciados pela coordenação e direção.
          </div>

          {loadingAlunos ? (
            <p className="text-center text-gray-500">Carregando alunos...</p>
          ) : alunosTurma.length > 0 ? (
            <table className="w-full">
              <tbody>
                {alunosTurma.map((aluno) => {
                  const baseFoto = aluno?.foto_url || getFotoURL(aluno);
                  const fotoSrc = baseFoto
                    ? `${baseFoto}${baseFoto.includes("?") ? "&" : "?"}t=${fotoStamp}`
                    : baseFoto;

                  return (
                    <tr key={aluno.id} className="hover:bg-gray-50">
                      {/* Foto */}
                      <td className="py-2 px-2 text-center">
                        <img
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
                          {/* ✅ Registro de Conselho */}
                          <button
                            onClick={() => abrirModalConselho({ codigo: aluno.codigo, estudante: aluno.estudante })}
                            title="Visualizar e registrar conselho de classe"
                          >
                            <EyeIcon className="h-6 w-6 text-gray-600 hover:text-blue-600" />
                          </button>

                          {/* ✅ Boletim */}
                          <button
                            onClick={() => abrirModalBoletim(aluno.codigo)}
                            title="Visualizar boletim"
                          >
                            <DocumentTextIcon className="h-6 w-6 text-gray-600 hover:text-green-600" />
                          </button>

                          {/* ✅ Ficha do Aluno (apenas banner pedagógico) */}
                          <button
                            onClick={() => abrirModalFicha(aluno.codigo)}
                            title="Ficha do estudante"
                          >
                            <IdentificationIcon className="h-6 w-6 text-gray-600 hover:text-purple-600" />
                          </button>

                          {/*
                            ❌ PencilIcon (Edição) — oculto para professor
                          */}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500">Nenhum aluno encontrado.</p>
          )}
        </div>
      )}

      {/* Modal: Registro de Conselho (professor pode criar + visualizar) */}
      {modalConselhoOpen && (
        <ModalRegistroConselhoProfessor
          open={modalConselhoOpen}
          aluno={alunoConselho}
          turmaId={turmaSelecionada?.id}
          onClose={() => setModalConselhoOpen(false)}
        />
      )}

      {/* Modal: Ficha do Aluno (FichaAluno oculta disciplinar e upload p/ professor) */}
      {modalFichaOpen && (
        <ModalFichaAluno
          open={modalFichaOpen}
          codigo={codigoAlunoFicha}
          onClose={() => setModalFichaOpen(false)}
        />
      )}

      {/* Modal: Boletim */}
      {modalBoletimOpen && (
        <ModalBoletim
          open={modalBoletimOpen}
          codigo={codigoAlunoBoletim}
          onClose={() => setModalBoletimOpen(false)}
        />
      )}

      {/* Modal: Zoom Foto */}
      {zoomOpen && (
        <ModalZoomFoto
          open={zoomOpen}
          src={zoomSrc}
          alt={zoomAlt}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}
