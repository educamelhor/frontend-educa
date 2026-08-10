import React, { useState } from 'react';
import AphSelecaoAluno from './AphSelecaoAluno';
import AphFormulario from './AphFormulario';

export default function AphNovaOcorrencia() {
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  const handleVoltar = () => {
    setAlunoSelecionado(null);
  };

  const handleSucesso = () => {
    // Ao salvar com sucesso, limpa e volta para a seleção
    setAlunoSelecionado(null);
  };

  return (
    <div className="w-full">
      {!alunoSelecionado ? (
        <AphSelecaoAluno onSelectAluno={setAlunoSelecionado} />
      ) : (
        <AphFormulario 
          aluno={alunoSelecionado} 
          onBack={handleVoltar} 
          onSuccess={handleSucesso} 
        />
      )}
    </div>
  );
}
