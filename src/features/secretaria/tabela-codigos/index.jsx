// src/features/secretaria/tabela-codigos/index.jsx

// ────────────────────────────────────────────────────────────────
// Imports
// ────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { TableCellsIcon, PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import TabelaCodigosForm from "./TabelaCodigosForm";
import ListaTabelaCodigos from "./ListaTabelaCodigos";
import api from "../../../services/api";

// ────────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────────
export default function TabelaCodigos() {
  // ────────────────────────────────────────────────
  // Estados principais
  // ────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [codigoSelecionado, setCodigoSelecionado] = useState(null);
  const [reload, setReload] = useState(false); // usado para recarregar lista

  // ────────────────────────────────────────────────
  // Abrir modal para novo código
  // ────────────────────────────────────────────────
  const abrirFormNovo = () => {
    setCodigoSelecionado(null);
    setIsFormOpen(true);
  };

  // ────────────────────────────────────────────────
  // Abrir modal para edição
  // ────────────────────────────────────────────────
  const abrirFormEditar = (codigo) => {
    setCodigoSelecionado(codigo);
    setIsFormOpen(true);
  };

  // ────────────────────────────────────────────────
  // Renderização
  // ────────────────────────────────────────────────
  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Cabeçalho com ícone */}
      <div className="flex items-center gap-2 mb-6">
        <TableCellsIcon className="w-8 h-8 text-blue-900" />
        <h1 className="text-3xl font-bold text-blue-900">Cadastro de Códigos</h1>
      </div>

      {/* Botão + Pesquisa */}
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={abrirFormNovo}
          className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow transition"
        >
          <PlusIcon className="w-5 h-5" /> Adicionar Código
        </Button>

        <Input
          placeholder="🔍 Buscar código, tipo, disciplina..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Lista de códigos */}
      <ListaTabelaCodigos
        searchTerm={searchTerm}
        reload={reload}
        onEditar={abrirFormEditar}
      />

      {/* Modal do formulário */}
      <Modal open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <TabelaCodigosForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          codigo={codigoSelecionado}
          // ────────────────────────────────────────────────
          // Envio dos dados para o backend (POST ou PUT)
          // ────────────────────────────────────────────────
          onSubmit={async (form) => {
            try {
              if (form.id) {
                // Edição
                await api.put(`/api/codigos/${form.id}`, form);
              } else {
                // Novo
                await api.post("/api/codigos", form);
              }
              setReload(!reload); // força recarregar lista
              return true;
            } catch (err) {
              console.error("Erro ao salvar código:", err);
              alert("Erro ao salvar código.");
              return false;
            }
          }}
        />
      </Modal>
    </div>
  );
}
