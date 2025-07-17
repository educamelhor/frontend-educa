import React, { useState } from "react";
import { AcademicCapIcon, PlusIcon } from "@heroicons/react/24/solid";
import api from "../../services/api";
import { Button } from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import FeedbackPanel from "../../components/ui/FeedbackPanel";
import ModalExcluirOuInativar from "./ModalExcluirOuInativar";
import { useProfessores } from "./useProfessores";
import ProfessorTable from "./ProfessorTable";
import ProfessorForm from "./ProfessorForm";
import styles from "./styles.module.css";
import { useDisciplinas } from "../../hooks/useDisciplinas";

export default function Professores() {
  const { professores, loading, reload } = useProfessores();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [isExcluirOpen, setIsExcluirOpen] = useState(false);
  const [professorParaExcluir, setProfessorParaExcluir] = useState(null);
  const { disciplinas } = useDisciplinas();

  const abrirExcluir = (professor) => {
    setProfessorParaExcluir(professor);
    setIsExcluirOpen(true);
  };




  const handleConfirmExcluir = async (acao) => {
    setIsExcluirOpen(false);
    try {
      if (acao === "excluir") {
        await api.delete(`/api/professores/${professorParaExcluir.id}`);
      } else {
        await api.put(`/api/professores/inativar/${professorParaExcluir.id}`);
      }
      reload();
    } catch (err) {
      console.error("Erro na exclusão/inativação:", err);
      alert("Falha na operação: " + err.message);
    }
  };





  const abrirForm = () => {
    setIsFormOpen(true);
  };





  const handleSaveProfessor = async (dados) => {
    // 🚫 Não permitir mesmo CPF na mesma disciplina


    try {
      // Verificação via backend
      const res = await api.get(`/api/professores/por-cpf-e-disciplina/${dados.cpf}/  ${dados.disciplina_id}`);
      if (res.data) {
        alert("❌ Já existe um professor cadastrado com este CPF nessa disciplina.");
        return false;
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        alert("Erro ao verificar CPF/disciplina.");
        return false;
      }
      // se for 404, significa que não existe duplicata — pode prosseguir
    }




    try {
      await api.post("/api/professores", dados);
      setMensagemSucesso("✅ Professor cadastrado com sucesso!");
      setIsFormOpen(false);
      reload();
      setTimeout(() => setMensagemSucesso(""), 3000);
      return true;   // <<< adiciona este retorno
    } catch (err) {
      console.error("Erro ao salvar professor:", err);
      alert("Falha ao salvar professor: " + err.message);
      return false;  // <<< opcional: deixa claro que falhou
    }
  };







  const filteredProfessores = professores.filter((p) => {
    const termo = searchTerm.toLowerCase();
    return (
      p.cpf.toLowerCase().includes(termo) ||
      p.nome.toLowerCase().includes(termo) ||
      (`${p.disciplina_nome}` || "").toLowerCase().includes(termo)
    );
  });







  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <div className="flex items-center gap-2 mb-6">
        <AcademicCapIcon className="w-8 h-8 text-blue-900" />
        <h1 className="text-3xl font-bold text-blue-900">Gestão de Professores</h1>
      </div>

      {mensagemSucesso && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          {mensagemSucesso}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className={styles.buttonsColumn}>
          <Button
            onClick={abrirForm}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" /> Adicionar Professor
          </Button>
        </div>

        <Input
          placeholder="🔍 Buscar professor"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>

      <ProfessorTable
        professores={filteredProfessores}
        loading={loading}
        onDelete={abrirExcluir}
      />

      <Modal open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <ProfessorForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSaveProfessor}
        />
      </Modal>

      <ModalExcluirOuInativar
        open={isExcluirOpen}
        onClose={() => setIsExcluirOpen(false)}
        aluno={professorParaExcluir || {}}
        onDelete={() => handleConfirmExcluir("excluir")}
        onInactivate={() => handleConfirmExcluir("inativar")}
      />
    </div>
  );
}
