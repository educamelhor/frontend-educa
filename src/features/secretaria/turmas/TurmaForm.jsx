// src/features/secretaria/turmas/TurmaForm.jsx

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import Input  from '../../../components/ui/Input';
import { Button } from "../../../components/ui/Button";

// ────────────────────────────────────────────────────────────
export default function TurmaForm({ open, onClose, onSubmit, turma }) {
  const [form, setForm] = useState({
    escola_id: '',
    turma:     '',
    turno:     '',
    serie:     '',
  });
  const [escolas, setEscolas] = useState([]);
  const [errors, setErrors]   = useState({});
  const [sending, setSending] = useState(false);



  // 1) Carrega lista de escolas quando o modal abre
  useEffect(() => {
    if (!open) return;

    api
      .get('/api/escolas')
      .then(res => {
        setEscolas(res.data);
      })
      .catch(err => {
        console.error('Erro ao carregar escolas:', err);
        setEscolas([]);
      });
  }, [open]);




  // 2) Ao abrir, popula o form para edição ou limpa para novo
  useEffect(() => {
    if (!open) return;

    if (turma) {
      setForm({
        id:        turma.id ?? null,
        escola_id: turma.escola_id ?? '',
        turma:     turma.turma     ?? '',
        turno:     turma.turno?.toUpperCase() ?? '',
        serie:     turma.serie     ?? '',
      });
    } else {
      setForm({ escola_id: '', turma: '', turno: '', serie: '' });
      setErrors({});
    }
  }, [open, turma]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.escola_id) errs.escola_id = 'Selecione a escola';
    if (!form.turma)     errs.turma     = 'Turma obrigatória';
    if (!form.turno)     errs.turno     = 'Turno obrigatório';
    if (!form.serie)     errs.serie     = 'Série obrigatória';
    return errs;
  };





  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSending(true);

    const dados = {
      ...form,
      turma: form.turma.trim().toUpperCase(),
      turno: form.turno.trim().toUpperCase(),
      serie: form.serie.trim().toUpperCase()
    };

    const ok = await onSubmit(dados);
    setSending(false);

    if (ok) {
      onClose();
    }
  };





  if (!open) return null;




  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Escola */}
      <div>
        <label className="block mb-1">Escola</label>




        <select
          name="escola_id"
          value={form.escola_id}
          onChange={handleChange}
          className="w-full border rounded p-2"
          disabled={!!form.id} // <--- Desabilita ao editar
        >
          <option value="">— Selecione a escola —</option>
          {escolas.map(e => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>




        {errors.escola_id && (
          <p className="text-red-600 text-sm">{errors.escola_id}</p>
        )}
      </div>





      {/* Turma */}
      <div>
        <label className="block mb-1">Turma</label>
        <Input
          name="turma"
          value={form.turma}
          onChange={handleChange}
        />
        {errors.turma && (
          <p className="text-red-600 text-sm">{errors.turma}</p>
        )}
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
          <option value="MATUTINO">MATUTINO</option>
          <option value="VESPERTINO">VESPERTINO</option>
          <option value="NOTURNO">NOTURNO</option>
        </select>
        {errors.turno && (
          <p className="text-red-600 text-sm">{errors.turno}</p>
        )}
     </div>







      {/* Série */}
      <div>
        <label className="block mb-1">Série</label>
        <Input
          name="serie"
          value={form.serie}
          onChange={handleChange}
        />
        {errors.serie && (
          <p className="text-red-600 text-sm">{errors.serie}</p>
        )}
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
          disabled={sending}
          className="
            bg-blue-600 hover:bg-blue-700
            text-white
            px-4 py-2
            rounded
            transition
          "
        >
          {sending ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>





    </form>
  );
}
