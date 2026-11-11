// src/components/ModalAdicionarAluno.jsx
import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import api from "../services/api";

export default function ModalAdicionarAluno({
  open,
  onClose,
  onSubmit,
  alunoSelecionado,
}) {
  // Inicializa com dados para edição ou vazios para criação
  const [aluno, setAluno] = useState({
    id: alunoSelecionado?.id || null,
    codigo: alunoSelecionado?.codigo || "",
    estudante: alunoSelecionado?.nome_registro || alunoSelecionado?.estudante || "",
    usa_nome_social:
      alunoSelecionado?.usa_nome_social === 1 || alunoSelecionado?.usa_nome_social === true,
    nome_social: alunoSelecionado?.nome_social || "",
    data_nascimento: alunoSelecionado?.data_nascimento?.split("T")[0] || "",
    sexo: alunoSelecionado?.sexo || "",
    turma_id: alunoSelecionado?.turma_id || "",
    turno: alunoSelecionado?.turno || "",
  });
  const [turmas, setTurmas] = useState([]);

  // Carrega lista de turmas ao abrir
  useEffect(() => {
    if (!open) return;
    api.get("/turmas")
      .then((res) => setTurmas(res.data))
      .catch(() => setTurmas([]));
  }, [open]);

  // Atualiza estado sempre que alunoSelecionado muda
  useEffect(() => {
    setAluno({
      id: alunoSelecionado?.id || null,
      codigo: alunoSelecionado?.codigo || "",
      estudante: alunoSelecionado?.nome_registro || alunoSelecionado?.estudante || "",
      usa_nome_social:
        alunoSelecionado?.usa_nome_social === 1 || alunoSelecionado?.usa_nome_social === true,
      nome_social: alunoSelecionado?.nome_social || "",
      data_nascimento:
        alunoSelecionado?.data_nascimento?.split("T")[0] || "",
      sexo: alunoSelecionado?.sexo || "",
      turma_id: alunoSelecionado?.turma_id || "",
      turno: alunoSelecionado?.turno || "",
    });
  }, [alunoSelecionado, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "codigo") {
      // só dígitos
      setAluno((prev) => ({
        ...prev,
        codigo: value.replace(/\D/g, ""),
      }));
      return;
    }
    if (name === "turma_id") {
      const sel = turmas.find((t) => String(t.id) === value);
      setAluno((prev) => ({
        ...prev,
        turma_id: value,
        turno: sel ? sel.turno : "",
      }));
      return;
    }
    setAluno((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nomeRegistroTrim = String(aluno.estudante || "").trim();
    const nomeSocialTrim = String(aluno.nome_social || "").trim();
    if (aluno.usa_nome_social && !nomeSocialTrim) return;
    const payload = {
      id: aluno.id, // para o back saber edição
      codigo: aluno.codigo,
      estudante: aluno.usa_nome_social ? nomeSocialTrim : nomeRegistroTrim,
      nome_registro: nomeRegistroTrim,
      usa_nome_social: aluno.usa_nome_social ? 1 : 0,
      nome_social: aluno.usa_nome_social ? nomeSocialTrim : null,
      data_nascimento: aluno.data_nascimento,
      sexo: aluno.sexo,
      turma_id: Number(aluno.turma_id),
    };
    await onSubmit(payload);
    onClose();
  };

  return (
    <Dialog open={!!open} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full z-50">
          <Dialog.Title className="text-lg font-bold mb-4">
            {alunoSelecionado ? "Editar Estudante" : "Adicionar Estudante"}
          </Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="codigo"
              value={aluno.codigo}
              onChange={handleChange}
              disabled={!!alunoSelecionado}          // bloqueado na edição
              placeholder="Código"
              className="w-full border px-3 py-2 rounded"
              inputMode="numeric"
              pattern="\d*"
              required
            />
            <input
              type="text"
              name="estudante"
              value={aluno.estudante}
              onChange={handleChange}
              placeholder={aluno.usa_nome_social ? "Nome de registro do estudante" : "Nome do estudante"}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded border border-slate-200">
              <input
                type="checkbox"
                id="modal_usa_nome_social"
                checked={!!aluno.usa_nome_social}
                onChange={(e) =>
                  setAluno((prev) => ({ ...prev, usa_nome_social: e.target.checked }))
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <label
                htmlFor="modal_usa_nome_social"
                className="text-sm font-medium text-slate-700 cursor-pointer"
                title="Resolução CNE/CP nº 1/2018 (MEC), Lei nº 9.394/1996 (LDB), Decreto Federal nº 8.727/2016 e Decreto Distrital nº 37.982/2017"
              >
                Nome Social — Res. CNE/CP nº 1/2018 (Lei nº 9.394/96)
              </label>
            </div>
            {aluno.usa_nome_social && (
              <input
                type="text"
                name="nome_social"
                value={aluno.nome_social}
                onChange={handleChange}
                placeholder="Informe o nome social do estudante"
                className="w-full border border-blue-300 bg-blue-50/50 px-3 py-2 rounded"
                required
              />
            )}
            <input
              type="date"
              name="data_nascimento"
              value={aluno.data_nascimento}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <input
              type="text"
              name="sexo"
              value={aluno.sexo}
              onChange={handleChange}
              placeholder="Sexo"
              className="w-full border px-3 py-2 rounded"
              required
            />

            <select
              name="turma_id"
              value={aluno.turma_id}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">Selecione a turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.turma}
                </option>
              ))}
            </select>

            <input
              type="text"
              name="turno"
              value={aluno.turno}
              readOnly
              className="w-full bg-gray-100 border px-3 py-2 rounded"
              placeholder="Turno"
            />

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded"
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
      </div>
    </Dialog>
  );
}
