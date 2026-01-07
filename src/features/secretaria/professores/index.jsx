// src/features/secretaria/professores/index.jsx
// ============================================================================
// Módulo: Gestão de Professores (container principal)
// - Lista, busca (inclui TURNO), importa por PDF/XLSX, cria/edita/exclui.
// - Integra com ProfessorTable (exibe TURNO) e ProfessorForm (inclui TURNO).
// - Todas as chamadas de API usam o prefixo /api/…
// - ✅ Ajuste: no modo edição, o TURN0 também é persistido (PUT).
// ============================================================================

import React, { useState, useRef } from "react";
import { AcademicCapIcon, PlusIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";
import { Button } from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import FeedbackPanel from "../../../components/ui/FeedbackPanel";
import ModalExcluirOuInativar from "./ModalExcluirOuInativar";
import { useProfessores } from "./useProfessores";
import ProfessorTable from "./ProfessorTable";
import ProfessorForm from "./ProfessorForm";

export default function Professores() {
  // ─────────────────────────────────────────────────────────────
  // Estados principais
  const { professores, loading, reload } = useProfessores();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [professorSelecionado, setProfessorSelecionado] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Exclusão / Inativação
  const [isExcluirOpen, setIsExcluirOpen] = useState(false);
  const [professorParaExcluir, setProfessorParaExcluir] = useState(null);

  // Upload (PDF/XLSX)
  const [feedback, setFeedback] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef();

  // ─────────────────────────────────────────────────────────────
  // Exclusão / Inativação
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
      alert("Falha na operação: " + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Formulário: novo e edição
  const abrirForm = () => {
    setProfessorSelecionado(null);
    setIsFormOpen(true);
  };

  // Busca dados completos para edição (garantindo consistência)
  const abrirEdicao = async (prof) => {
    try {
      const { data } = await api.get(`/api/professores/${prof.id}`);
      setProfessorSelecionado(data);
      setIsFormOpen(true);
    } catch (err) {
      console.error("Erro ao buscar professor:", err);
      alert("Falha ao carregar dados completos do professor.");
    }
  };

  // Salvar (novo/edição) — com persistência do TURNO no modo edição
  const handleSaveProfessor = async (dados) => {
    // ✏️ Edição: atualiza disciplina, aulas e turno
    if (professorSelecionado) {
      try {
        await api.put(`/api/professores/${professorSelecionado.id}`, {
          disciplina_id: dados.disciplina_id,
          aulas: dados.aulas,
          turno: dados.turno, // ✅ NOVO: persistindo turno na edição
        });
        setMensagemSucesso("✅ Professor atualizado com sucesso!");
        setIsFormOpen(false);
        reload();
        setTimeout(() => setMensagemSucesso(""), 3000);
        return true;
      } catch (err) {
        console.error("Erro ao atualizar professor:", err);
        alert("Falha ao atualizar professor: " + (err.response?.data?.message || err.message));
        return false;
      }
    }

    // ➕ Novo: valida duplicidade CPF + disciplina antes de criar
    try {
      const res = await api.get(
        `/api/professores/por-cpf-e-disciplina/${dados.cpf}/${dados.disciplina_id}`
      );
      if (res.data) {
        alert("❌ Já existe um professor cadastrado com este CPF nessa disciplina.");
        return false;
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        alert("Erro ao verificar CPF/disciplina.");
        return false;
      }
    }

    try {
      await api.post("/api/professores", dados); // inclui turno no payload de criação
      setMensagemSucesso("✅ Professor cadastrado com sucesso!");
      setIsFormOpen(false);
      reload();
      setTimeout(() => setMensagemSucesso(""), 3000);
      return true;
    } catch (err) {
      console.error("Erro ao salvar professor:", err);
      alert("Falha ao salvar professor: " + (err.response?.data?.message || err.message));
      return false;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Busca/filtragem (inclui TURNO)
  const filteredProfessores = professores.filter((p) => {
    const termo = (searchTerm || "").toLowerCase();
    return (
      (p.cpf || "").toLowerCase().includes(termo) ||
      (p.nome || "").toLowerCase().includes(termo) ||
      (p.turno || "").toLowerCase().includes(termo) || // 🔎 inclui turno
      (`${p.disciplina_nome}` || "").toLowerCase().includes(termo)
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Upload PDF/XLSX com feedback
  const handleUploadClick = () => {
    setFeedback(null);
    if (fileInput.current) fileInput.current.value = null;
    fileInput.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const formData = new FormData();
    formData.append("file", file);

    let rota = "";
    if (ext === "pdf") rota = "/api/professores/importar-pdf";
    else if (ext === "xlsx") rota = "/api/professores/importar-xlsx";
    else {
      alert("Formato de arquivo não suportado. Use PDF ou XLSX.");
      return;
    }

    setFeedback({ status: "processando", file: file.name });
    setProgress(0);

    try {
      const { data } = await api.post(rota, formData, {
        onUploadProgress: (evt) =>
          evt.total && setProgress(Math.round((evt.loaded / evt.total) * 100)),
      });

      const { localizados, inseridos, jaExistiam, reativados, inativados } = data || {};
      reload?.();
      setFeedback({
        status: "sucesso",
        file: file.name,
        localizados,
        inseridos,
        jaExistiam,
        reativados,
        inativados,
        message: `Lista de professores importada.`,
      });
    } catch (err) {
      setFeedback({
        status: "erro",
        message: err.response?.data?.message || err.message,
      });
    } finally {
      e.target.value = null;
      setProgress(0);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-6">
        <AcademicCapIcon className="w-8 h-8 text-blue-900" />
        <h1 className="text-3xl font-bold text-blue-900">Gestão de Professores</h1>
      </div>

      {/* Mensagem de sucesso */}
      {mensagemSucesso && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          {mensagemSucesso}
        </div>
      )}

      {/* Ações superiores */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-2" style={{ width: "max-content" }}>
          <Button
            onClick={abrirForm}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow transition"
          >
            <PlusIcon className="w-5 h-5" /> Adicionar Professor
          </Button>

          {/* Upload */}
          <input
            type="file"
            accept=".pdf,.xlsx"
            onChange={handleFileChange}
            hidden
            ref={fileInput}
          />
          <Button
            onClick={handleUploadClick}
            className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow transition"
          >
            <span role="img" aria-label="Pasta">📁</span> Incluir Professores
          </Button>

          {/* Feedback */}
          {feedback && (
            <FeedbackPanel
              feedback={feedback}
              progress={progress}
              onClose={() => setFeedback(null)}
            />
          )}
        </div>

        {/* Busca (inclui Turno) */}
        <Input
          placeholder="🔍 Buscar por CPF, Nome, Turno ou Disciplina"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Tabela */}
      <ProfessorTable
        professores={filteredProfessores}
        loading={loading}
        onDelete={abrirExcluir}
        onEdit={abrirEdicao}
      />

      {/* Modal: Form */}
      <Modal open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <ProfessorForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSaveProfessor}
          professor={professorSelecionado}
        />
      </Modal>

      {/* Modal: Excluir/Inativar */}
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
