// features/professores/conselho/ConselhoClasseProfessor.jsx
// ============================================================================
// Conselho de Classe — Perfil PROFESSOR (componente INDEPENDENTE)
//
// Governança aplicada neste arquivo:
//  ✅ Professor vê APENAS suas turmas        → GET /professores/me/turmas
//  ✅ Ícone olhinho → abre Ficha do Estudante (ModalFichaAlunoProfessor)
//  ✅ Ícone boletim → abre ModalBoletim
//  ✅ Ícone ficha   → abre Relatório Pedagógico (somente leitura, sem
//                     Descrição e sem Registro Interno)
//  ❌ Ícone lápis (edição)         — OCULTO para professor
//  ❌ Upload de foto               — OCULTO para professor
//  ❌ Relatório Disciplinar        — OCULTO para professor
//  ❌ Campos Descrição / Reg. Int. — OCULTOS para professor
//
// Este arquivo é INDEPENDENTE de pedagogico/conselho/ConselhoClasse.jsx.
// Alterações aqui NÃO afetam o conselho da direção/coordenação e vice-versa.
// ============================================================================

import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import ModalBoletim from "../../boletim/ModalBoletim";
import ModalFichaAlunoProfessor from "./ModalFichaAlunoProfessor";
import ModalZoomFotoProfessor from "./ModalZoomFotoProfessor";
import {
  EyeIcon,
  DocumentTextIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
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

  // Boletim
  const [modalBoletimOpen, setModalBoletimOpen] = useState(false);
  const [codigoAlunoBoletim, setCodigoAlunoBoletim] = useState(null);

  // Ficha do Estudante (EyeIcon)
  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [codigoAlunoFicha, setCodigoAlunoFicha] = useState(null);

  // Cache-buster para fotos
  const [fotoStamp, setFotoStamp] = useState(Date.now());

  // Zoom da Foto
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomSrc, setZoomSrc] = useState("");
  const [zoomAlt, setZoomAlt] = useState("");

  function abrirModalBoletim(codigo) {
    setCodigoAlunoBoletim(codigo);
    setModalBoletimOpen(true);
  }

  function abrirModalFicha(codigo) {
    setCodigoAlunoFicha(codigo);
    setModalFichaOpen(true);
  }

  // Ao fechar a ficha, atualiza o stamp das fotos (caso tenha sido alterada)
  function handleCloseFicha() {
    setModalFichaOpen(false);
    setFotoStamp(Date.now());
  }

  const turnos = ["Matutino", "Vespertino", "Noturno"];

  // Carrega anos letivos apenas uma vez
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-busca turmas sempre que o ano letivo mudar (a API filtra por ano)
  useEffect(() => {
    fetchTurmas();
    setTurnoSelecionado(null);
    setTurmaSelecionada(null);
    setAlunosTurma([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoLetivo]);

  // ── CORREÇÃO BUG 1: usa /professores/me/turmas em vez de /api/turmas ──────
  // A API retorna { ok: true, turmas: [...] } com campo `nome` para o nome
  // da turma. Passamos o ano letivo como param para pré-filtrar no servidor.
  const fetchTurmas = async () => {
    setLoadingTurmas(true);
    try {
      const { data } = await api.get(`/professores/me/turmas?ano=${anoLetivo}`);
      // A resposta é { ok: true, turmas: [...] }  — extrai o array
      const lista = data?.turmas || (Array.isArray(data) ? data : []);
      // Normaliza o campo de nome: a API usa `nome`, o restante do código usa `turma`
      const normalizadas = lista.map((t) => ({
        ...t,
        turma: t.turma ?? t.nome ?? "",
      }));
      setTurmas(normalizadas);
    } catch (error) {
      console.error("Erro ao buscar turmas do professor:", error);
      setTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  };

  // Filtra apenas por turno na UI — a API já retorna só as turmas do professor
  // para o ano letivo solicitado via param, sem necessidade de filtrar aqui.
  const turmasFiltradas = turmas.filter(
    (t) =>
      turnoSelecionado &&
      normalizaTexto(t.turno) === normalizaTexto(turnoSelecionado)
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
            ℹ️ Como professor, você pode visualizar a <strong>ficha</strong> e o <strong>boletim</strong> dos
            alunos. Relatórios disciplinares e edição de registros são gerenciados pela coordenação e direção.
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

                          {/* ✅ BUG 2 CORRIGIDO: EyeIcon abre ModalFichaAlunoProfessor */}
                          <button
                            onClick={() => abrirModalFicha(aluno.codigo)}
                            title="Ficha do estudante"
                          >
                            <EyeIcon className="h-6 w-6 text-gray-600 hover:text-blue-600" />
                          </button>

                          {/* ✅ Boletim — permitido */}
                          <button
                            onClick={() => abrirModalBoletim(aluno.codigo)}
                            title="Visualizar boletim"
                          >
                            <DocumentTextIcon className="h-6 w-6 text-gray-600 hover:text-green-600" />
                          </button>

                          {/* ✅ Relatório Pedagógico — somente leitura via Ficha */}
                          <button
                            onClick={() => abrirModalFicha(aluno.codigo)}
                            title="Relatório pedagógico (somente leitura)"
                          >
                            <IdentificationIcon className="h-6 w-6 text-gray-600 hover:text-purple-600" />
                          </button>

                          {/*
                            ❌ PencilIcon (Edição) — OCULTO para professor
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

      {/* Modal: Boletim */}
      {modalBoletimOpen && (
        <ModalBoletim
          open={modalBoletimOpen}
          codigo={codigoAlunoBoletim}
          onClose={() => setModalBoletimOpen(false)}
        />
      )}

      {/* Modal: Ficha do Estudante — versão professor (governança aplicada) */}
      {modalFichaOpen && (
        <ModalFichaAlunoProfessor
          open={modalFichaOpen}
          codigo={codigoAlunoFicha}
          onClose={handleCloseFicha}
        />
      )}

      {/* Modal: Zoom Foto */}
      {zoomOpen && (
        <ModalZoomFotoProfessor
          open={zoomOpen}
          src={zoomSrc}
          alt={zoomAlt}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}
