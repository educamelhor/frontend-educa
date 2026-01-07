// src/features/secretaria/cargas-horarias/CargaHorariaForm.jsx
// ============================================================================
// Formulário de Carga Horária
// Usado dentro do Modal em ListaCargasHorarias.jsx
// Campos: Código, Disciplina, Etapa, Turno
// ============================================================================

import React, { useState, useEffect } from "react";

export default function CargaHorariaForm({ open, onClose, carga, onSubmit }) {
  // ─────────────────────────────────────────────────────────────
  // Estado inicial do formulário
  // ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    codigo: "",
    disciplina: "",
    etapa: "",
    turno: "",
  });

  // ─────────────────────────────────────────────────────────────
  // Preenche o form em modo edição ou reseta em modo criação
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (carga) {
      setFormData(carga);
    } else {
      setFormData({
        codigo: "",
        disciplina: "",
        etapa: "",
        turno: "",
      });
    }
  }, [carga]);

  // ─────────────────────────────────────────────────────────────
  // Atualiza campo do formulário
  // ─────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // Submete os dados para o componente pai
  // ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar carga horária:", err);
      alert("Falha ao salvar carga horária.");
    }
  };

  if (!open) return null;

  // ─────────────────────────────────────────────────────────────
  // Renderização
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-white rounded-lg shadow-md w-[500px]">
      <h2 className="text-xl font-semibold mb-4">
        {carga ? "Editar Carga Horária" : "Nova Carga Horária"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Código */}
        <div>
          <label className="block mb-1 font-medium">Código</label>
          <input
            type="text"
            name="codigo"
            value={formData.codigo}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>

        {/* Disciplina */}
        <div>
          <label className="block mb-1 font-medium">Disciplina</label>
          <input
            type="text"
            name="disciplina"
            value={formData.disciplina}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>

        {/* Etapa */}
        <div>
          <label className="block mb-1 font-medium">Etapa</label>
          <input
            type="text"
            name="etapa"
            value={formData.etapa}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        {/* Turno */}
        <div>
          <label className="block mb-1 font-medium">Turno</label>
          <input
            type="text"
            name="turno"
            value={formData.turno}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
