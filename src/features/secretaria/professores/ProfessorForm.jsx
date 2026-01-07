// src/features/professores/ProfessorForm.jsx
// ============================================================================
// Formulário de Professor
// - Suporta criação e edição.
// - NOVO CADASTRO: obrigatórios = CPF, Nome, Turno, Disciplina, Aulas.
//   • Data de Nascimento e Sexo ficam DESABILITADOS (preenchidos pelo professor ao criar login).
// - EDIÇÃO: editáveis = Turno, Disciplina, Aulas; demais bloqueados.
// - ✅ Fix mantido: Select de "Turno" SEMPRE exibe a opção selecionada (normalização + fallback).
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import Input from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import api from "../../../services/api";

// ─────────────────────────────────────────────────────────────
// Util: normalizações
const toStr = (v) => (v == null ? "" : String(v));
const norm = (v) => toStr(v).trim().toUpperCase();

// ─────────────────────────────────────────────────────────────
// Validação de CPF (apenas para novo cadastro)
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;

  return true;
}
// ─────────────────────────────────────────────────────────────

export default function ProfessorForm({ open, onClose, onSubmit, professor }) {
  // ⚙️ Estado do formulário
  const [form, setForm] = useState({
    cpf: "",
    nome: "",
    data_nascimento: "",
    sexo: "",
    turno: "",
    disciplina_id: "",
    aulas: 0,
  });

  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  // Listas do backend
  const [disciplinas, setDisciplinas] = useState([]);
  const [turnos, setTurnos] = useState([]); // guardamos como strings já normalizadas

  const isEditMode = !!professor;

  // ─────────────────────────────────────────────────────────────
  // Preenche o formulário quando abre
  useEffect(() => {
    if (!open) return;

    if (professor) {
      setForm({
        id: professor.id ?? null,
        cpf: professor.cpf ?? "",
        nome: professor.nome ?? "",
        data_nascimento: professor.data_nascimento ?? "",
        sexo: professor.sexo ?? "",
        turno: norm(professor.turno),
        disciplina_id: professor.disciplina_id ?? "",
        aulas: professor.aulas ?? 0,
      });
      setErros({});
    } else {
      setForm({
        cpf: "",
        nome: "",
        data_nascimento: "",
        sexo: "",
        turno: "",
        disciplina_id: "",
        aulas: 0,
      });
      setErros({});
    }
  }, [open, professor]);

  // ─────────────────────────────────────────────────────────────
  // Busca listas auxiliares
  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    (async () => {
      try {
        const resDisc = await api.get("/api/disciplinas", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDisciplinas(resDisc.data || []);
      } catch (e) {
        console.error("Erro ao carregar disciplinas:", e);
      }

      try {
        const resTurnos = await api.get("/api/turnos", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Normaliza para strings em UPPERCASE e remove vazios/duplicados
        const listaBruta = Array.isArray(resTurnos.data) ? resTurnos.data : [];
        const normalizados = listaBruta
          .map((t) =>
            typeof t === "string" ? norm(t) : norm(t?.nome ?? t?.turno ?? "")
          )
          .filter(Boolean);

        const defaults = ["MATUTINO", "VESPERTINO", "NOTURNO", "INTEGRAL"];
        const base = normalizados.length ? normalizados : defaults;

        // remove duplicados preservando ordem
        const uniq = Array.from(new Set(base));
        setTurnos(uniq);
      } catch {
        setTurnos(["MATUTINO", "VESPERTINO", "NOTURNO", "INTEGRAL"]);
      }
    })();
  }, [open]);

  // 🔁 Quando a lista de turnos mudar, garante que o valor do form exista nas opções.
  useEffect(() => {
    if (!open) return;
    if (!turnos.length) return;

    setForm((prev) => {
      const val = norm(prev.turno);
      if (!val) return prev; // deixa vazio para o usuário escolher
      const found = turnos.includes(val) ? val : "";
      return found === prev.turno ? prev : { ...prev, turno: found };
    });
  }, [turnos, open]);

  // ─────────────────────────────────────────────────────────────
  // Máscara de CPF
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
      [name]:
        name === "cpf"
          ? mascaraCPF(value)
          : name === "nome"
          ? value.toUpperCase()
          : name === "turno"
          ? norm(value)
          : value,
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // Opções de turno prontas para render (memo para evitar recomputo)
  const turnoOptions = useMemo(() => {
    const base = turnos.length
      ? turnos
      : ["MATUTINO", "VESPERTINO", "NOTURNO", "INTEGRAL"];
    return base.map((t) => ({ value: norm(t), label: norm(t) }));
  }, [turnos]);

  // ─────────────────────────────────────────────────────────────
  // Validação
  const validar = () => {
    const novosErros = {};

    if (isEditMode) {
      // EDIÇÃO → só Turno, Disciplina, Aulas
      if (!form.turno) novosErros.turno = "Selecione o turno";
      if (!form.disciplina_id) novosErros.disciplina_id = "Selecione uma disciplina";
      if (form.aulas < 0 || form.aulas > 30) {
        novosErros.aulas = "Informe um valor entre 0 e 30";
      }
      return novosErros;
    }

    // NOVO CADASTRO → CPF, Nome, Turno, Disciplina, Aulas
    if (!form.cpf) novosErros.cpf = "CPF obrigatório";
    else if (!validarCPF(form.cpf)) novosErros.cpf = "CPF inválido";

    if (!form.nome) novosErros.nome = "Nome obrigatório";
    if (!form.turno) novosErros.turno = "Selecione o turno";
    if (!form.disciplina_id) novosErros.disciplina_id = "Selecione uma disciplina";

    if (form.aulas === "" || form.aulas === null || form.aulas === undefined) {
      novosErros.aulas = "Informe a carga de aulas";
    } else if (Number(form.aulas) < 0 || Number(form.aulas) > 30) {
      novosErros.aulas = "Informe um valor entre 0 e 30";
    }

    // ⚠️ Data de Nascimento e Sexo NÃO são obrigatórios no novo cadastro (bloqueados)
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

  // ─────────────────────────────────────────────────────────────
  // Render
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* CPF (editável no novo cadastro; somente leitura na edição) */}
      <div>
        <label className="block mb-1">CPF</label>
        <Input
          name="cpf"
          value={form.cpf}
          onChange={handleChange}
          readOnly={isEditMode}
          className={isEditMode ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}
        />
        {erros.cpf && <p className="text-red-600 text-sm">{erros.cpf}</p>}
      </div>

      {/* Nome (editável no novo cadastro; somente leitura na edição) */}
      <div>
        <label className="block mb-1">Nome</label>
        <Input
          name="nome"
          value={form.nome}
          onChange={handleChange}
          readOnly={isEditMode}
          className={isEditMode ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}
        />
        {erros.nome && <p className="text-red-600 text-sm">{erros.nome}</p>}
      </div>

      {/* Data Nascimento (sempre bloqueado; será preenchido pelo professor no login) */}
      <div>
        <label className="block mb-1">Data de Nascimento</label>
        <Input
          type="date"
          name="data_nascimento"
          value={form.data_nascimento ? form.data_nascimento.substring(0, 10) : ""}
          onChange={handleChange}
          disabled
          className="bg-gray-100 text-gray-600 cursor-not-allowed"
          title="Preenchido pelo professor no próprio login"
        />
        {/* Não validar/mostrar erro neste campo no novo cadastro */}
      </div>

      {/* Sexo (sempre bloqueado; será preenchido pelo professor no login) */}
      <div>
        <label className="block mb-1">Sexo</label>
        <select
          name="sexo"
          value={form.sexo}
          onChange={handleChange}
          disabled
          className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
          title="Preenchido pelo professor no próprio login"
        >
          <option value="">— Selecionado no login do professor —</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
        {/* Não validar/mostrar erro neste campo no novo cadastro */}
      </div>

      {/* Turno (editável) */}
      <div>
        <label className="block mb-1">Turno</label>
        <select
          name="turno"
          value={form.turno || ""}
          onChange={handleChange}
          className="w-full border rounded p-2 text-gray-900"
        >
          <option value="">— Selecione o turno —</option>
          {turnoOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {erros.turno && <p className="text-red-600 text-sm">{erros.turno}</p>}
      </div>

      {/* Disciplina (editável) */}
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

      {/* Aulas (editável) */}
      <div>
        <label className="block mb-1">Aulas (0 a 30)</label>
        <Input
          type="number"
          name="aulas"
          min={0}
          max={30}
          value={form.aulas}
          onChange={handleChange}
        />
        {erros.aulas && <p className="text-red-600 text-sm">{erros.aulas}</p>}
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
