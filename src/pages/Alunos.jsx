import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import * as XLSX from "xlsx";
import ModalAdicionarAluno from "../components/ModalAdicionarAluno";
import ModalExcluirOuInativar from "../components/ModalExcluirOuInativar";
import {
  TrashIcon,
  PencilIcon,
  DocumentTextIcon,
  TableCellsIcon,
  BookOpenIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";

export default function Alunos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [alunosInativos, setAlunosInativos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef();
  const xlsxInputRef = useRef();


  // Carrega alunos ativos
  const buscarAlunos = async () => {
    try {
      const res = await api.get("/alunos");
      setAlunos(res.data);
      setAlunosInativos([]);
    } catch (err) {
      console.error("Erro ao carregar alunos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarAlunos();
  }, []);

  // Importar PDF e gerar XLSX com feedback
  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const turmaNome = file.name.replace(/\.pdf$/i, "");
    const antesDaTurma = alunos
      .filter((a) => a.turma === turmaNome)
      .map((a) => String(a.codigo));

    const formData = new FormData();
    formData.append("file", file);

    setFeedback({ status: "processando" });
    setProgress(0);

    try {
      const res = await api.post("/alunos/importar-pdf", formData, {
        responseType: "arraybuffer",
        onDownloadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });

      // Parse XLSX.
      const data = new Uint8Array(res.data);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1);
      const codigos = rows.map((r) => String(r[0]));
      const localizados = codigos.length;
      const inseridos = codigos.filter((c) => !antesDaTurma.includes(c)).length;
      const duplicados = localizados - inseridos;
      const inativados = antesDaTurma.filter((c) => !codigos.includes(c)).length;

      // Download do arquivo
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${turmaNome}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      await buscarAlunos();

      setFeedback({
        status: "sucesso",
        localizados,
        inseridos,
        duplicados,
        inativados,
        baixado: turmaNome,
      });
    } catch (err) {
      console.error("Erro ao importar PDF:", err);
      setFeedback({ status: "erro", message: err.message });
    } finally {
      e.target.value = null;
      setProgress(0);
    }
  };

  const handleIncluirClick = () => fileInputRef.current?.click();
  const handleXlsxClick = () => xlsxInputRef.current?.click();

  // Importar XLSX diretamente (colunas: RE, estudante, data_nascimento, responsavel, cpf, turma)
  const handleXlsxSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    // O nome do arquivo determina a turma (ex: "6º ANO A.xlsx" → turma "6º ANO A")
    const turmaNome = file.name.replace(/\.[^.]+$/i, "").trim();
    formData.append("turmaNome", turmaNome);

    setFeedback({ status: "processando" });
    setProgress(0);

    try {
      const res = await api.post("/alunos/importar-xlsx", formData);
      await buscarAlunos();
      setFeedback({
        status: "sucesso",
        localizados: res.data.localizados ?? 0,
        inseridos: res.data.inseridos ?? 0,
        duplicados: res.data.jaExistiam ?? 0,
        inativados: res.data.inativados ?? 0,
        baixado: null,
      });
    } catch (err) {
      console.error("Erro ao importar XLSX:", err);
      const msg = err.response?.data?.message || err.message;
      setFeedback({ status: "erro", message: msg });
    } finally {
      e.target.value = null;
      setProgress(0);
    }
  };

  // Adicionar ou editar
  const handleAdicionarOuEditarAluno = async (dados) => {
    if (dados.id) await api.put(`/alunos/${dados.id}`, dados);
    else await api.post("/alunos", dados);
    setModalAberto(false);
    buscarAlunos();
  };

  const abrirExcluirModal = (aluno) => {
    setAlunoParaExcluir(aluno);
    setExcluirAberto(true);
  };

  const handleConfirmarAcao = async (acao) => {
    setExcluirAberto(false);
    if (acao === "excluir") {
      await api.delete(`/alunos/${alunoParaExcluir.id}`);
      buscarAlunos();
    } else if (acao === "inativar") {
      await api.put(`/alunos/inativar/${alunoParaExcluir.id}`);
      setAlunosInativos((prev) => [...prev, alunoParaExcluir.id]);
    }
  };

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <h1 className="text-3xl font-bold text-blue-900 mb-4">
        🎓 Gestão de Alunos
      </h1>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => {
            setAlunoSelecionado(null);
            setModalAberto(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" /> Adicionar Estudante
        </button>
        {/* Botão PDF */}
        <button
          onClick={handleIncluirClick}
          className="btn btn-success flex items-center gap-2"
          title="Importar alunos a partir de PDF da Secretaria de Educação"
        >
          <DocumentTextIcon className="w-5 h-5" /> Importar via PDF
        </button>
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileSelected}
        />

        {/* Botão XLSX */}
        <button
          onClick={handleXlsxClick}
          className="btn btn-success flex items-center gap-2"
          style={{ background: "#0f766e" }}
          title="Importar alunos a partir de planilha Excel (.xlsx) com colunas: RE, estudante, data_nascimento, responsavel, cpf_responsavel, turma"
        >
          <TableCellsIcon className="w-5 h-5" /> Importar via XLSX
        </button>
        <input
          type="file"
          accept=".xlsx,.xls"
          ref={xlsxInputRef}
          style={{ display: "none" }}
          onChange={handleXlsxSelected}
        />
      </div>

      {feedback && (
        <div className="mt-2 relative max-w-xs">
          <div className="block p-3 bg-white border border-gray-200 rounded shadow-lg">
            <button
              onClick={() => setFeedback(null)}
              className="absolute top-1 right-1 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            {feedback.status === "processando" && (
              <>
                <p className="text-gray-600 mb-2">
                  Processando importação…
                </p>
                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                  <div
                    className="h-2 bg-blue-600"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}
            {feedback.status === "sucesso" && (
              <>
                <p className="text-gray-800">
                  📄 Localizados: {feedback.localizados}
                </p>
                <p className="text-green-600">
                  ✅ Inseridos: {feedback.inseridos}
                </p>
                <p className="text-yellow-600">
                  ⚠️ Já existiam: {feedback.duplicados}
                </p>
                <p className="text-red-600">
                  ❌ Inativados: {feedback.inativados}
                </p>
                {feedback.baixado && (
                  <p className="text-gray-600">
                    (arquivo turma {feedback.baixado} baixado)
                  </p>
                )}
              </>
            )}
            {feedback.status === "erro" && (
              <p className="text-red-600">
                ❌ Erro: {feedback.message}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 border">RE</th>
              <th className="p-2 border">Estudante</th>
              <th className="p-2 border">Data de Nasc.</th>
              <th className="p-2 border">Turma</th>
              <th className="p-2 border">Turno</th>
              <th className="p-2 border">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              alunos.map((aluno) => {
                const isInativo = alunosInativos.includes(aluno.id);
                const displayDate =
                  aluno.data_nascimento && aluno.data_nascimento !== "0000-00-00"
                    ? new Date(aluno.data_nascimento).toLocaleDateString("pt-BR")
                    : "";
                return (
                  <tr
                    key={aluno.id}
                    className={
                      isInativo ? "bg-gray-200 text-gray-500" : ""
                    }
                  >
                    <td className="p-2 border">{aluno.codigo}</td>
                    <td className="p-2 border">{aluno.estudante}</td>
                    <td className="p-2 border">{displayDate}</td>
                    <td className="p-2 border">{aluno.turma || "—"}</td>
                    <td className="p-2 border">{aluno.turno || "—"}</td>
                    <td className="p-2 border flex gap-2">
                      <button
                        onClick={() => {
                          setAlunoSelecionado(aluno);
                          setModalAberto(true);
                        }}
                      >
                        <PencilIcon className="w-5 h-5 text-blue-600" />
                      </button>
                      <button onClick={() => abrirExcluirModal(aluno)}>
                        <TrashIcon className="w-5 h-5 text-green-600" />
                      </button>
                      <button
                        onClick={() => navigate(`/alunos/${aluno.id}/notas`)}
                      >
                        <BookOpenIcon className="w-5 h-5 text-purple-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <ModalAdicionarAluno
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          onSubmit={handleAdicionarOuEditarAluno}
          alunoSelecionado={alunoSelecionado}
        />
      )}
      {excluirAberto && (
        <ModalExcluirOuInativar
          open={excluirAberto}
          onClose={() => setExcluirAberto(false)}
          onConfirm={handleConfirmarAcao}
        />
      )}
    </div>
  );
}
