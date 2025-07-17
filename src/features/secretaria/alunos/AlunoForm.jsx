// src/features/alunos/AlunoForm.jsx
import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import api from "../../../services/api";
import Input from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";



// Função para normalizar a data para o formato yyyy-mm-dd
function normalizarDataInput(data) {
  if (!data) return "";
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  // dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split("/");
    return `${ano}-${mes}-${dia}`;
  }
  // yyyy-mm-ddTHH:mm:ss.sssZ ou parecido
  if (/^\d{4}-\d{2}-\d{2}T/.test(data)) {
    return data.slice(0, 10);
  }
  // Fallback: retorna como veio
  return data;
}




  export default function AlunoForm({ open, onClose, onSubmit, initialData = {}, turmas = [] }) {

  const [codigo, setCodigo] = useState(initialData.codigo       || "");
  const [estudante, setEstudante] = useState(initialData.estudante    || "");

  const [dataNascimento, setDataNascimento] = useState(
    normalizarDataInput(initialData.data_nascimento)
  );

  const [sexo, setSexo] = useState(initialData.sexo         || "");
  const [turmaId, setTurmaId] = useState(initialData.turma_id ? String(initialData.turma_id) : "");
  



  useEffect(() => {
    if (open) {
      setCodigo(initialData.codigo       || "");
      setEstudante(initialData.estudante || "");
      setDataNascimento(normalizarDataInput(initialData.data_nascimento));
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
    id: initialData.id
  };

  let sucesso = await onSubmit(payload);

  if (sucesso === "codigo_duplicado") {
    alert("Já existe um aluno ativo com esse código.");
    return;
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
        <h2 className="text-xl font-bold mb-4">
          {initialData?.id ? "Editar Estudante" : "Adicionar Estudante"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código */}
          <div>
            <label className="block font-medium mb-1">Código</label>
            <Input
              value={codigo}
              onChange={e => {
                // filtra tudo que não for dígito
                const somenteDigitos = e.target.value.replace(/\D/g, '')
                setCodigo(somenteDigitos)
              }}
              inputMode="numeric"       // abre teclado numérico em mobile
              pattern="\d*"             // só dígitos permitidos
              required
              disabled={!!initialData.id}
              className="w-full"
            />
          </div>

          {/* Estudante */}
          <div>
            <label className="block font-medium mb-1">Estudante</label>
            <Input
              value={estudante}
              onChange={e => {
                // filtra tudo que não for letra (A–Z, a–z), acento, espaço ou apóstrofo
                const somenteLetras = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s']/g, '');
                setEstudante(somenteLetras);
              }}
              inputMode="text" 
              pattern="[A-Za-zÀ-ÖØ-öø-ÿ\s']+"
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
              required
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="">Selecione a turma</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>


                  {turma.turma} {/*- {turma.serie} - {turma.turno}*/}


                </option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              onClick={onClose}
              className="
                bg-gray-200 hover:bg-gray-300
                text-gray-800
                px-4 py-2
                rounded
                transition
              "
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="
                bg-blue-600 hover:bg-blue-700
                text-white
                px-4 py-2
                rounded
                transition
              "
            >
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
