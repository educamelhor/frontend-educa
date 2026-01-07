// src/features/secretaria/tabela-codigos/TabelaCodigosForm.jsx

// ────────────────────────────────────────────────────────────────
// Imports
// ────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from "react";
import Input from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import api from "../../../services/api";

// ────────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────────
export default function TabelaCodigosForm({ open, onClose, onSubmit, codigo }) {
  // ────────────────────────────────────────────────
  // Estado do formulário
  // ────────────────────────────────────────────────
  const [form, setForm] = useState({
    tipo: "",
    disciplina_id: "",
    etapa: "",
    turno: "",
    quantidade: 1,
  });
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [disciplinas, setDisciplinas] = useState([]);

  const isEditMode = !!codigo; // true se veio do lápis

  // ────────────────────────────────────────────────
  // Preenche formulário quando abre
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (codigo) {
      setForm({
        id: codigo.id ?? null,
        tipo: codigo.tipo ?? "",
        disciplina_id: codigo.disciplina_id ?? "",
        etapa: codigo.etapa ?? "",
        turno: codigo.turno ?? "",
        quantidade: codigo.quantidade ?? 1,
      });
    } else {
      setForm({
        tipo: "",
        disciplina_id: "",
        etapa: "",
        turno: "",
        quantidade: 1,
      });
      setErros({});
    }
  }, [open, codigo]);

  // ────────────────────────────────────────────────
  // Busca disciplinas do backend
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    async function fetchDisciplinas() {
      try {
        const res = await api.get("/api/disciplinas");
        setDisciplinas(res.data || []);
      } catch (err) {
        console.error("Erro ao buscar disciplinas:", err);
        alert("Erro ao carregar disciplinas.");
      }
    }
    fetchDisciplinas();
  }, [open]);

  // ────────────────────────────────────────────────
  // Atualiza campos do formulário
  // ────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ────────────────────────────────────────────────
  // Validação simples
  // ────────────────────────────────────────────────
  const validar = () => {
    const novosErros = {};
    if (!form.tipo) novosErros.tipo = "Selecione o tipo";
    if (!form.disciplina_id) novosErros.disciplina_id = "Selecione a disciplina";
    if (!form.etapa) novosErros.etapa = "Selecione a etapa";
    if (!form.turno) novosErros.turno = "Selecione o turno";
    if (!form.quantidade || form.quantidade <= 0) {
      novosErros.quantidade = "Informe uma quantidade válida";
    }
    return novosErros;
  };

  // ────────────────────────────────────────────────
  // Submissão do formulário
  // ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length) {
      setErros(novosErros);
      return;
    }
    setEnviando(true);

    // Normaliza payload
    const payload = {
      id: form.id ?? null,
      tipo: form.tipo,
      disciplina_id: Number(form.disciplina_id),
      etapa: form.etapa,
      turno: form.turno,
      quantidade: Number(form.quantidade),
    };

    const ok = await onSubmit(payload);
    setEnviando(false);
    if (ok) onClose();
  };

  // ────────────────────────────────────────────────
  // Renderização
  // ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h2 className="text-2xl font-bold text-blue-700 mb-4 border-b pb-2">
        {isEditMode ? "✏️ Editar Código" : "➕ Novo Código"}
      </h2>

      {/* Tipo */}
      <div>
        <label className="block mb-1">Tipo</label>
        <select
          name="tipo"
          value={form.tipo}
          onChange={handleChange}
          className="w-full border rounded p-2"
        >
          <option value="">— Selecione —</option>
          <option value="CARGA_HORARIA">Carga Horária</option>
          <option value="PROVA">Prova</option>
          <option value="REDAÇÃO">Redação</option>
          <option value="GABARITO">Gabarito</option>
        </select>
        {erros.tipo && <p className="text-red-600 text-sm">{erros.tipo}</p>}
      </div>

      {/* Disciplina */}
      <div>
        <label className="block mb-1">Disciplina</label>
        <select
          name="disciplina_id"
          value={form.disciplina_id}
          onChange={handleChange}
          className="w-full border rounded p-2"
        >
          <option value="">— Selecione a disciplina —</option>
          {disciplinas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.disciplina}
            </option>
          ))}
        </select>
        {erros.disciplina_id && (
          <p className="text-red-600 text-sm">{erros.disciplina_id}</p>
        )}
      </div>

      {/* Etapa */}
      <div>
        <label className="block mb-1">Etapa</label>
        <select
          name="etapa"
          value={form.etapa}
          onChange={handleChange}
          className="w-full border rounded p-2"
        >
          <option value="">— Selecione —</option>
          <option value="Infantil">Infantil</option>
          <option value="Fundamental">Fundamental</option>
          <option value="Médio">Médio</option>
          <option value="Técnico">Técnico</option>
        </select>
        {erros.etapa && <p className="text-red-600 text-sm">{erros.etapa}</p>}
      </div>

      {/* Turno */}
      <div>
        <label className="block mb-1">Turno</label>
        <select
          name="turno"
          value={form.turno}
          onChange={handleChange}
          className="w-full border rounded p-2"
        >
          <option value="">— Selecione —</option>
          <option value="Matutino">Matutino</option>
          <option value="Vespertino">Vespertino</option>
          <option value="Noturno">Noturno</option>
          <option value="Integral">Integral</option>
        </select>
        {erros.turno && <p className="text-red-600 text-sm">{erros.turno}</p>}
      </div>

      {/* Quantidade */}
      <div>
        <label className="block mb-1">Quantidade de Códigos</label>
        <Input
          type="number"
          name="quantidade"
          min={1}
          value={form.quantidade}
          onChange={handleChange}
        />
        {erros.quantidade && (
          <p className="text-red-600 text-sm">{erros.quantidade}</p>
        )}
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          onClick={onClose}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={enviando}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
        >
          {enviando ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
