import React, { useState, useEffect } from "react";
import AlunoForm              from "./AlunoForm.jsx";
import AlunoTable             from "../../alunos/AlunoTable.jsx";
import ImportPDF              from "./ImportPDF.jsx";
import ModalExcluirOuInativar from "../../alunos/ModalExcluirOuInativar.jsx";
import { useAlunos }          from "./useAlunos.js";
import api                    from "../../../services/api";


function normalize(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function ListaAlunos() {
  const {
    alunos,
    salvarAluno,
    excluirOuInativarAluno,
    importarAlunos,
    loading,
    reload,
  } = useAlunos();

   
 const [turmas, setTurmas] = useState([]);

 useEffect(() => {
  async function carregarTurmas() {
    try {
      const res = await api.get("/api/turmas");
      setTurmas(res.data);
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);
    }
  }
  carregarTurmas();
}, []);

  const [isFormOpen, setFormOpen] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [alunoParaExcluirOuInativar, setAlunoParaExcluirOuInativar] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [resultadoImportacao, setResultadoImportacao] = useState(null);





  const handleSalvar = async (dados) => {
    const sucesso = await salvarAluno(dados, alunoEditando || {});

    if (sucesso === "codigo_duplicado") {
      // Você já tem tratamento para duplicidade
      return "codigo_duplicado";
    }

    if (sucesso) {
      setMensagemSucesso(
        dados.id
          ? "✅ Dados do aluno atualizados com sucesso!"
          : "✅ Aluno cadastrado com sucesso!"
      );
      setTimeout(() => setMensagemSucesso(""), 3000);
    }

    return sucesso;
  };










  const alunosFiltrados = alunos.filter((a) => {
    const termo = normalize(filtro);

    // Se buscar por "inativo" em qualquer forma, mostrar os inativos
    const buscandoInativos = termo.includes("inativo");

    return (
      buscandoInativos
        ? a.status === "inativo"
        : a.status !== "inativo" &&
          (
            normalize(a.estudante || "").includes(termo) ||
            normalize(a.nome || "").includes(termo) ||
            a.codigo?.toString().includes(termo) ||
            normalize(a.turma || "").includes(termo) ||
            normalize(a.turno || "").includes(termo)
          )
    );
  });


  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <span className="text-3xl">🎓</span> Gestão de Alunos
          </h1>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => {
                setAlunoEditando(null);
                setFormOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              + Adicionar Estudante
            </button>
            <ImportPDF
              onImport={importarAlunos}
              onComplete={(res) => {
                reload();
                setResultadoImportacao(res);
              }}
            />






            {resultadoImportacao && (
              <div className="mt-2 bg-white rounded shadow-md border px-4 py-2 text-sm space-y-1 w-fit">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">📄 Localizados: {resultadoImportacao.localizados}</span>
                  <button onClick={() => setResultadoImportacao(null)}>×</button>
                </div>
              <div className="text-green-600">✅ Inseridos: {resultadoImportacao.inseridos}</div>
              <div className="text-yellow-600">🟡 Já existiam: {resultadoImportacao.jaExistiam}</div>
              <div className="text-blue-600">📘 Reativados: {resultadoImportacao.reativados}</div>
              <div className="text-red-600">❌ Inativados: {resultadoImportacao.inativados}</div>
              <div className="text-gray-600">Turma {resultadoImportacao.turma} importada.</div>
            </div>
          )}





          </div>
        </div>

        <div className="w-full md:w-auto">
          <input
            type="text"
            placeholder="🔎 Buscar aluno"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="border rounded px-4 py-2 w-full md:w-64"
          />
        </div>
      </div>



      {mensagemSucesso && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
          {mensagemSucesso}
        </div>
      )}



      <AlunoTable
        alunos={alunosFiltrados}

        onEditar={async (aluno) => {
          // Aguarda as turmas serem carregadas antes de abrir o modal
          while (turmas.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          setAlunoEditando(aluno);
          setFormOpen(true);
        }}
        onDelete={(aluno) => setAlunoParaExcluirOuInativar(aluno)}
        mostrarFicha={false}
        mostrarBoletim={false}
        loading={loading}
      />

      <AlunoForm
        open={isFormOpen}
        onClose={() => {
          setFormOpen(false);
          setAlunoEditando(null);
        }}
        onSubmit={handleSalvar}
        initialData={alunoEditando || {}}
        turmas={turmas}
      />


      <ModalExcluirOuInativar
        open={!!alunoParaExcluirOuInativar}
        onClose={() => setAlunoParaExcluirOuInativar(null)}
        aluno={alunoParaExcluirOuInativar}
        onDelete={(id) => {
          excluirOuInativarAluno({ id, status: "excluir" });
          setMensagemSucesso("✅ Aluno excluído com sucesso!");
          setTimeout(() => setMensagemSucesso(""), 3000);
          setAlunoParaExcluirOuInativar(null);
       }}
       onInactivate={(id) => {
         excluirOuInativarAluno({ id, status: "inativo" });
         setMensagemSucesso("⚠️ Aluno inativado com sucesso!");
         setTimeout(() => setMensagemSucesso(""), 3000);
         setAlunoParaExcluirOuInativar(null);
       }}
    />






    </div>
  );
}
