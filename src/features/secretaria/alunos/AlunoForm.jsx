// src/features/alunos/AlunoForm.jsx
// ────────────────────────────────────────────────────────────────
// Componente: AlunoForm
// Finalidade: Modal de cadastro/edição de aluno (individual)
//
// Ajustes (PASSO 1 - já entregues e mantidos):
// 1) Normalizar data para <input type="date"> (YYYY-MM-DD)
// 2) Preencher automaticamente a TURMA ao abrir em modo de edição:
//    - Se não vier turma_id, mas vier o nome da turma (ex.: "1A"),
//      mapear pelo nome dentro da lista carregada de /api/turmas.
//
// Ajuste (PASSO 2 - atual):
// 3) Bloquear edição do campo CÓDIGO quando estiver em modo edição
//    (ou seja, quando existir initialData.id).
//
// Observação: Todo o restante foi preservado como já aprovado.
// ────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import api from "../../../services/api";
import Input from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";

export default function AlunoForm({ open, onClose, onSubmit, initialData = {}, anoLetivo }) {
  // ────────────────────────────────────────────────────────────────
  // Helpers locais
  // ────────────────────────────────────────────────────────────────
  // Normaliza "YYYY-MM-DDTHH:mm:ss" -> "YYYY-MM-DD" para <input type="date">
  const normalizeDate = (s) => (typeof s === "string" ? s.split("T")[0] : "");

  // ────────────────────────────────────────────────────────────────
  // Estados dos campos
  // ────────────────────────────────────────────────────────────────
  const [codigo, setCodigo] = useState(initialData.codigo || "");
  const [estudante, setEstudante] = useState(initialData.estudante || "");
  const [dataNascimento, setDataNascimento] = useState(
    initialData.data_nascimento ? normalizeDate(initialData.data_nascimento) : ""
  );
  const [turmaId, setTurmaId] = useState(
    initialData.turma_id ? String(initialData.turma_id) : ""
  );
  const [turmas, setTurmas] = useState([]);
  const [modalAtivarOpen, setModalAtivarOpen] = useState(false);

  // ────────────────────────────────────────────────────────────────
  // Carrega lista de turmas quando o modal abre
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    api
      .get("/api/turmas")
      .then((res) => setTurmas(res.data))
      .catch((err) => console.error("Erro ao carregar turmas:", err));
  }, [open]);

  // ────────────────────────────────────────────────────────────────
  // Hidrata campos sempre que o modal abre (ou initialData muda)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setCodigo(initialData.codigo || "");
      setEstudante(initialData.estudante || "");
      setDataNascimento(normalizeDate(initialData.data_nascimento));
      setTurmaId(initialData.turma_id ? String(initialData.turma_id) : "");
    }
  }, [open, initialData]);

  // ────────────────────────────────────────────────────────────────
  // PASSO 1 (mantido): Mapear nome da turma -> turma_id quando editar
  // Cenário: veio initialData.turma (ex.: "1A"), mas não veio turma_id.
  // Assim que a lista de turmas estiver carregada, tenta mapear.
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    // Se já há turma_id no initialData, não sobrescreve
    if (initialData?.turma_id) return;

    // Se existir nome da turma no initialData e já temos a lista
    if (initialData?.turma && Array.isArray(turmas) && turmas.length) {
      const alvo = String(initialData.turma).toUpperCase().trim();
      const match = turmas.find(
        (t) => String(t.turma).toUpperCase().trim() === alvo
      );
      if (match?.id) setTurmaId(String(match.id));
    }
  }, [open, initialData, turmas]);

  // ────────────────────────────────────────────────────────────────
  // Submit (mantido exatamente como já estava)
  // ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      codigo,
      estudante,
      data_nascimento: dataNascimento,
      turma_id: Number(turmaId),
    };

    let sucesso = false;

    if (initialData.id) {
      // aluno já existia — mantemos o status atual ou ativo (se undefined)
      sucesso = await onSubmit({
        ...initialData,
        ...payload,
        status: initialData.status || "ativo",
      });
    } else {
      // novo aluno
      sucesso = await onSubmit(payload);
    }

    if (sucesso) onClose();
  };

  // ────────────────────────────────────────────────────────────────
  // Ativação explícita
  // ────────────────────────────────────────────────────────────────
  const handleConfirmarAtivacao = async () => {
    const payload = {
      codigo,
      estudante,
      data_nascimento: dataNascimento,
      turma_id: Number(turmaId),
    };

    const sucesso = await onSubmit({
      ...initialData,
      ...payload,
      status: "ativo",
    });

    if (sucesso) {
      setModalAtivarOpen(false);
      onClose();
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Renderização do modal
  // ────────────────────────────────────────────────────────────────
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
          {/* RE (Registro Estudantil) */}
          <div>
            <label className="block font-medium mb-1">RE (Registro Estudantil)</label>
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              className="w-full"
              disabled={!!initialData.id}     // 🔒 bloqueia edição quando existe ID
              title={initialData.id ? "Campo bloqueado durante a edição" : undefined}
            />
          </div>

          {/* Estudante */}
          <div>
            <label className="block font-medium mb-1">Estudante</label>
            <Input
              value={estudante}
              onChange={(e) => setEstudante(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Data de Nascimento */}
          <div>
            <label className="block font-medium mb-1">Data de Nascimento</label>
            {/* PROVISÓRIO: Campo desabilitado e não obrigatório temporariamente para não travar os cadastros (solicitação em 11/03/2026) */}
            <Input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              disabled={true}
              className="w-full bg-gray-100 cursor-not-allowed"
            />
          </div>

          {/* Turma */}
          <div>
            <label className="block font-medium mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full border rounded p-2"
              required
            >
              <option value="">Selecione a turma</option>
              {turmas
                .filter((t) => !anoLetivo || Number(t.ano) === Number(anoLetivo))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.turma}
                  </option>
                ))}
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 mt-6">
            {initialData?.status === "inativo" && (
              <Button
                type="button"
                onClick={() => setModalAtivarOpen(true)}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm"
              >
                Ativar
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Salvar
            </Button>
          </div>
        </form>
      </div>

      {/* Modal Confirmar Ativação */}
      <Dialog
        open={modalAtivarOpen}
        onClose={() => setModalAtivarOpen(false)}
        className="fixed inset-0 z-[60] flex items-center justify-center"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <div className="bg-white rounded-lg w-full max-w-sm p-6 z-10 text-center shadow-xl">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmar Ativação</h3>
          <p className="text-gray-600 mb-6">
            Deseja reativar o estudante <strong>{estudante}</strong>?
          </p>
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              onClick={() => setModalAtivarOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarAtivacao}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Sim, Ativar
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog>
  );
}
