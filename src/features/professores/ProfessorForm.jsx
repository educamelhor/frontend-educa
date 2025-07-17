// src/features/professores/ProfessorForm.jsx

import React, { useState, useEffect } from "react";
import Input  from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import api    from "../../services/api";

export default function ProfessorForm({ open, onClose, onSubmit, professor }) {
  const [form, setForm] = useState({
    cpf: "",
    nome: "",
    data_nascimento: "",
    sexo: "",
    disciplina_id: "",
    aulas: 0,
  });
  const [erros, setErros]           = useState({});
  const [enviando, setEnviando]     = useState(false);
  const [disciplinas, setDisciplinas] = useState([]);

  // Ao abrir o modal -- seja edição ou criação -- resetamos/propagamos valores
  useEffect(() => {
    if (!open) return;
    if (professor) {
      setForm({
        id: professor.id ?? null,
        cpf: professor.cpf ?? '',
        nome: professor.nome ?? '',
        data_nascimento: professor.data_nascimento
          ? professor.data_nascimento.split("T")[0]
          : '',
        sexo: professor.sexo ?? '',
        disciplina_id: professor.disciplina_id ?? '',
        aulas: professor.aulas ?? 0,
      });
    } else {
      setForm({ cpf: "", nome: "", data_nascimento: "", sexo: "", disciplina_id: "" });
      setErros({});
    }
  }, [open, professor]);

  // Buscar disciplinas do backend quando o modal abrir
  useEffect(() => {
    if (!open) return;
    async function fetchDisciplinas() {
      try {
        // baseURL já inclui "/api", então chamamos apenas "/disciplinas"
        const res = await api.get("/api/disciplinas");
        setDisciplinas(res.data);
      } catch (err) {
        console.error("Erro ao buscar disciplinas:", err);
      }
    }
    fetchDisciplinas();
  }, [open]);

  const mascaraCPF = (value) =>
    value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "cpf" ? mascaraCPF(value) : value,
    }));
  };

  const validar = () => {
    const novosErros = {};
    if (!form.cpf)               novosErros.cpf = "CPF obrigatório";
    if (!form.nome)              novosErros.nome = "Nome obrigatório";
    if (!form.data_nascimento)   novosErros.data_nascimento = "Data de nascimento obrigatória";
    if (!form.sexo)              novosErros.sexo = "Sexo obrigatório";
    if (!form.disciplina_id)     novosErros.disciplina_id = "Selecione uma disciplina";

    if (form.aulas < 0 || form.aulas > 90) {
      novosErros.aulas = "Informe um valor entre 0 e 40";
    }

    return novosErros;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length) {
      setErros(novosErros);
      return;
    }
    setEnviando(true);
    const ok = await onSubmit(form);
    setEnviando(false);
    if (ok) onClose();
  };

  if (!open) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1">CPF</label>
        <Input name="cpf" value={form.cpf} onChange={handleChange} />
        {erros.cpf && <p className="text-red-600 text-sm">{erros.cpf}</p>}
      </div>

      <div>
        <label className="block mb-1">Nome</label>
        <Input name="nome" value={form.nome} onChange={handleChange} />
        {erros.nome && <p className="text-red-600 text-sm">{erros.nome}</p>}
      </div>

      <div>
        <label className="block mb-1">Data de Nascimento</label>
        <Input
          type="date"
          name="data_nascimento"
          value={form.data_nascimento}
          onChange={handleChange}
        />
        {erros.data_nascimento && (
          <p className="text-red-600 text-sm">{erros.data_nascimento}</p>
        )}
      </div>

      <div>
        <label className="block mb-1">Sexo</label>
        <div className="flex items-center gap-4">
          <label>
            <input
              type="radio"
              name="sexo"
              value="M"
              checked={form.sexo === "M"}
              onChange={handleChange}
            />{" "}
            Masculino
          </label>
          <label>
            <input
              type="radio"
              name="sexo"
              value="F"
              checked={form.sexo === "F"}
              onChange={handleChange}
            />{" "}
            Feminino
          </label>
        </div>
        {erros.sexo && <p className="text-red-600 text-sm">{erros.sexo}</p>}
      </div>



      <div>
        <label className="block mb-1">Disciplina</label>
        <select
          name="disciplina_id"
          value={form.disciplina_id}
          onChange={handleChange}
          className="w-full border rounded p-2"
        >
          <option value="">— Selecione a disciplina —</option>
          {disciplinas.map((d) => {
            const label = d.disciplina ?? d.nome ?? "—";
            return (
              <option key={d.id} value={d.id}>
                {label}
              </option>
            );
          })}


        </select>
        {erros.disciplina_id && (
          <p className="text-red-600 text-sm">{erros.disciplina_id}</p>
        )}
      </div>



      <div>
        <label className="block mb-1">Aulas (0 a 40)</label>
        <Input
          type="number"
          name="aulas"
          min={0}
          max={40}
          value={form.aulas}
          onChange={handleChange}
        />
      </div>







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
          disabled={enviando}
          className="
            bg-blue-600 hover:bg-blue-700
            text-white
            px-4 py-2
            rounded
            transition
          "
        >
          {enviando ? "Salvando…" : "Salvar"}
        </Button>
     </div>





    </form>
  );
}
