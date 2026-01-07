// src/features/secretaria/turmas/TurmaForm.jsx

import React, { useState, useEffect } from 'react';
import Input from '../../../components/ui/Input';
import { Button } from "../../../components/ui/Button";

export default function TurmaForm({ open, onClose, onSubmit, turma }) {
  const [form, setForm] = useState({
    escola_id: '',
    nome: '',
    etapa: '',
    ano: '2025',
    turno: '',
    serie: '',
  });

  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  // Opções de série para cada etapa
  const opcoesSerie = {
    INFANTIL: [
      "1º Período",
      "2º Período",
      "1º Ano",
      "2º Ano",
      "3º Ano",
      "4º Ano",
      "5º Ano"
    ],
    FUNDAMENTAL: [
      "6º Ano",
      "7º Ano",
      "8º Ano",
      "9º Ano"
    ],
    "MÉDIO": [
      "1ª Série",
      "2ª Série",
      "3ª Série"
    ]
  };

  // Preenche form para edição ou limpa para novo
  useEffect(() => {
    if (!open) return;

    // Escola é definida pelo contexto do login (localStorage)
    const escolaIdLogin = localStorage.getItem('escola_id') || '';

    if (turma) {
      setForm({
        id: turma.id ?? null,
        escola_id: turma.escola_id ?? escolaIdLogin ?? '',
        nome: turma.nome ?? turma.turma ?? '',
        etapa: turma.etapa ?? '',
        ano: turma.ano ?? '2025',
        turno: turma.turno?.toUpperCase() ?? '',
        serie: turma.serie ?? '',
      });
    } else {
      setForm({
        escola_id: escolaIdLogin,
        nome: '',
        etapa: '',
        ano: '2025',
        turno: '',
        serie: ''
      });
      setErrors({});
    }
  }, [open, turma]);

  // Atualiza campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Valida campos
  const validate = () => {
    const errs = {};
    // escola_id não é mais selecionado no formulário (vem do login)
    if (!form.nome) errs.nome = 'Turma obrigatória';
    if (!form.etapa) errs.etapa = 'Etapa obrigatória';
    if (!form.ano) errs.ano = 'Ano obrigatório';
    if (!form.turno) errs.turno = 'Turno obrigatório';
    if (!form.serie) errs.serie = 'Série obrigatória';
    return errs;
  };

  // Submete
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSending(true);

    const escolaIdLogin = localStorage.getItem('escola_id') || '';

    const dados = {
      ...form,
      escola_id: form.escola_id || escolaIdLogin || '',
      nome: form.nome.trim().toUpperCase(),
      etapa: form.etapa.trim().toUpperCase(),
      ano: String(form.ano).trim(), // importante manter o ano no payload
      turno: form.turno.trim().toUpperCase(),
      serie: form.serie.trim().toUpperCase()
    };

    // Mantém compatibilidade: onSubmit pode retornar boolean (atual) ou { ok, message } (melhoria)
    let result = false;
    try {
      result = await onSubmit(dados);
    } finally {
      setSending(false);
    }

    if (typeof result === 'boolean') {
      if (result) onClose();
      return;
    }

    if (result && typeof result === 'object') {
      if (result.ok) onClose();
      if (result.ok === false && result.message) {
        alert(result.message);
      }
    }
  };

  if (!open) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Nome */}
      <div>
        <label className="block mb-1">Turma</label>
        <Input name="nome" value={form.nome} onChange={handleChange} />
        {errors.nome && <p className="text-red-600 text-sm">{errors.nome}</p>}
      </div>

      {/* Etapa */}
      <div>
        <label className="block mb-1">Etapa</label>
        <select
          name="etapa"
          value={form.etapa}
          onChange={(e) => {
            handleChange(e);
            setForm(f => ({ ...f, serie: '' })); // limpa série ao mudar etapa
          }}
          className="w-full border rounded p-2 uppercase"
        >
          <option value="">— Selecione a etapa —</option>
          <option value="INFANTIL">Infantil</option>
          <option value="FUNDAMENTAL">Fundamental</option>
          <option value="MÉDIO">Médio</option>
        </select>
        {errors.etapa && <p className="text-red-600 text-sm">{errors.etapa}</p>}
      </div>

      {/* Ano */}
      <div>
        <label className="block mb-1">Ano</label>
        <select
          name="ano"
          value={form.ano}
          onChange={handleChange}
          className="w-full border rounded p-2"
        >
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
        </select>
        {errors.ano && <p className="text-red-600 text-sm">{errors.ano}</p>}
      </div>

      {/* Turno */}
      <div>
        <label className="block mb-1">Turno</label>
        <select
          name="turno"
          value={form.turno}
          onChange={handleChange}
          className="w-full border rounded p-2 uppercase"
        >
          <option value="">— Selecione o turno —</option>
          <option value="MATUTINO">Matutino</option>
          <option value="VESPERTINO">Vespertino</option>
          <option value="NOTURNO">Noturno</option>
        </select>
        {errors.turno && <p className="text-red-600 text-sm">{errors.turno}</p>}
      </div>

      {/* Série */}
      <div>
        <label className="block mb-1">Série</label>
        {form.etapa && opcoesSerie[form.etapa] ? (
          <select
            name="serie"
            value={form.serie}
            onChange={handleChange}
            className="w-full border rounded p-2 uppercase"
          >
            <option value="">— Selecione a série —</option>
            {opcoesSerie[form.etapa].map((serie, idx) => (
              <option key={idx} value={serie}>{serie}</option>
            ))}
          </select>
        ) : (
          <Input
            name="serie"
            value={form.serie}
            onChange={handleChange}
          />
        )}
        {errors.serie && <p className="text-red-600 text-sm">{errors.serie}</p>}
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
          disabled={sending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
        >
          {sending ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
