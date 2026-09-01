import React, { useState, useEffect } from 'react';
import AphSelecaoAluno from './AphSelecaoAluno';
import AphFormulario from './AphFormulario';

  export default function AphNovaOcorrencia({ editRecord, onClearEdit }) {
  useEffect(() => {
    if (editRecord) {
      setAlunoSelecionado({
        id: editRecord.aluno_id,
        nome: editRecord.aluno_nome,
        turma: editRecord.turma_nome,
        matricula: editRecord.aluno_matricula,
        foto: editRecord.aluno_foto || editRecord.aluno_foto_url
      });
    }
  }, [editRecord]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  const handleVoltar = () => {
    setAlunoSelecionado(null);
    if (onClearEdit) onClearEdit();
  };

  const handleSucesso = () => {
    // Ao salvar com sucesso, limpa e volta para a seleção
    setAlunoSelecionado(null);
    if (onClearEdit) onClearEdit();
  };

  return (
    <div className="w-full">
      {!alunoSelecionado ? (
        <AphSelecaoAluno onSelectAluno={setAlunoSelecionado} />
      ) : (
        <AphFormulario 
          aluno={alunoSelecionado} editRecord={editRecord} 
          onBack={handleVoltar} 
          onSuccess={handleSucesso} 
        />
      )}
    </div>
  );
}
