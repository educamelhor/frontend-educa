// src/features/alunos/AlunoForm.jsx
import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import api from "../../services/api";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function AlunoForm({ open, onClose, onSubmit, initialData = {}, }) {
  const [codigo, setCodigo] = useState(initialData.codigo       || "");
  const [estudante, setEstudante] = useState(initialData.estudante    || "");

  const [dataNascimento, setDataNascimento] = useState(
     initialData.data_nascimento
       ? initialData.data_nascimento.split("T")[0]
       : ""
  );

  const [sexo, setSexo] = useState(initialData.sexo         || "");
  const [turmaId, setTurmaId] = useState(initialData.turma_id ? String(initialData.turma_id) : "");
  const [turmas, setTurmas] = useState([]);

  useEffect(() => {
    if (!open) return;
    api.get("/api/turmas")
      .then(res => setTurmas(res.data))
      .catch(err => console.error("Erro ao carregar turmas:", err));
  }, [open]);

  useEffect(() => {
    if (open) {
      setCodigo(initialData.codigo       || "");
      setEstudante(initialData.estudante || "");
      setDataNascimento(initialData.data_nascimento || "");
      setSexo(initialData.sexo            || "");
      setTurmaId(initialData.turma_id ? String(initialData.turma_id) : "");
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
     e.preventDefault();

     const payload = {
        codigo,
        estudante,
        data_nascimento: dataNascimento,
        sexo,
        turma_id: Number(turmaId),
     };

     let sucesso = false;

     if (initialData.id) {
        // aluno já existia — vamos atualizar (reativar)
        sucesso = await onSubmit({
           ...initialData,
           ...payload,
           status: "ativo",
        });
     } else {
        // novo aluno
        sucesso = await onSubmit(payload);
     }

     if (sucesso) onClose();
};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <Dialog.Overlay className="fixed inset-0 bg-black/30" />
      <div className="bg-white rounded-lg w-full max-w-md p-6 z-10">
        <Dialog.Title className="text-xl font-semibold mb-4">
          Adicionar Estudante
        </Dialog.Title>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código */}
          <div>
            <label className="block font-medium mb-1">Código</label>
            <Input
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Estudante */}
          <div>
            <label className="block font-medium mb-1">Estudante</label>
            <Input
              value={estudante}
              onChange={e => setEstudante(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Data de Nascimento */}
          <div>
            <label className="block font-medium mb-1">Data de Nascimento</label>
            <Input
              type="date"
              value={dataNascimento}
              onChange={e => setDataNascimento(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Sexo */}
          <div>
            <label className="block font-medium mb-1">Sexo</label>
            <select
              value={sexo}
              onChange={e => setSexo(e.target.value)}
              className="w-full border rounded p-2"
              required
            >
              <option value="">Selecione</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>

          {/* Turma */}
          <div>
            <label className="block font-medium mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={e => setTurmaId(e.target.value)}
              className="w-full border rounded p-2"
              required
            >
              <option value="">Selecione a turma</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.turma}
                </option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
