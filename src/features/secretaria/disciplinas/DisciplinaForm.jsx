import React, { useState, useEffect } from 'react';
import Input  from '../../../components/ui/Input';
import { Button } from "../../../components/ui/Button";

export default function DisciplinaForm({ open, onClose, onSubmit, disciplina }) {
  const [form, setForm] = useState({ nome: '', carga: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (disciplina) {
      setForm({
        id: disciplina.id ?? null,
        nome: disciplina.nome ?? disciplina.disciplina ?? '',
        carga: disciplina.carga ?? '',
      });
    } else {
      setForm({ id: null, nome: '', carga: '' });
      setErrors({});
    }
  }, [open, disciplina]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.nome) errs.nome = 'Nome é obrigatório';
    if (!form.carga) errs.carga = 'Carga é obrigatória';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSending(true);
    const ok = await onSubmit(form);
    setSending(false);
    if (ok) onClose();
  };

  if (!open) return null;
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Nome da disciplina */}
      <div>
        <label className="block mb-1">Disciplina</label>
        <Input
          name="nome"
          value={form.nome}
          onChange={handleChange}
        />
        {errors.nome && <p className="text-red-600 text-sm">{errors.nome}</p>}
      </div>

      {/* Carga horária */}
      <div>
        <label className="block mb-1">Carga</label>
        <Input
          name="carga"
          type="number"
          value={form.carga}
          onChange={handleChange}
        />
        {errors.carga && <p className="text-red-600 text-sm">{errors.carga}</p>}
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
