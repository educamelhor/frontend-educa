import React, { useState, useRef } from "react";
import { toPng } from "html-to-image";
import CartaoCorrecao from "./CartaoCorrecao";

const SITUACOES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const COMPETENCIAS = [
  { label: "Competência I - Registro formal" },
  { label: "Competência II - Coerência temática" },
  { label: "Competência III - Gênero textual" },
  { label: "Competência IV - Coesão" }
];
const OPCOES_COMPETENCIA = ["A", "B", "C", "D", "E"];

export default function ModalCorrecoes({
  open,
  onClose,
  valores,
  onChange,
  onSalvar,
  alunoInfo // ADICIONADO: recebe alunoInfo do Redacao.jsx para código no cartão
}) {
  const [alerta, setAlerta] = useState("");
  const situacaoIsA = valores.situacao === "A";
  const cartaoRef = useRef();

  if (!open) return null;

  // Toggle para situação (duplo clique desmarca)
  function handleSituacaoClick(letra) {
    if (valores.situacao === letra) {
      onChange({
        ...valores,
        situacao: "",
        competencia_1: "",
        competencia_2: "",
        competencia_3: "",
        competencia_4: ""
      });
      return;
    }
    if (letra !== "A") {
      onChange({
        ...valores,
        situacao: letra,
        competencia_1: "",
        competencia_2: "",
        competencia_3: "",
        competencia_4: ""
      });
      return;
    }
    onChange({
      ...valores,
      situacao: letra
    });
  }

  // Toggle para competências
  function handleCompetenciaClick(idx, letra) {
    const key = `competencia_${idx + 1}`;
    if (valores[key] === letra) {
      onChange({
        ...valores,
        [key]: ""
      });
      return;
    }
    onChange({
      ...valores,
      [key]: letra
    });
  }

  const handleBloqueada = () => {
    setAlerta("Esse tópico só pode ser marcado se a Situação de Correção tiver marcado o item A.");
    setTimeout(() => setAlerta(""), 2200);
    return false;
  };

  // Salvar
  const handleSalvar = async () => {
    await onSalvar(valores);
    onClose();
  };

  // Gerar e baixar o cartão-resposta como imagem
  const handleCriarCartao = async () => {
    if (cartaoRef.current) {
      const dataUrl = await toPng(cartaoRef.current, { quality: 1.0, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'cartao-correcao.png';
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <>
      {/* Cartão invisível para exportação */}
      <div style={{ position: "absolute", left: -9999, top: 0, zIndex: -999 }}>
        <div ref={cartaoRef}>
          <CartaoCorrecao
            valores={valores}
            codigoUnico={alunoInfo?.codigo || "--------"}
            // Você pode passar outros props, como nome, numero da questão, etc.
          />
        </div>
      </div>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="flex flex-row items-start bg-white rounded-xl shadow-xl p-8 min-w-[1100px] border border-gray-200 max-h-[90vh]">
          {/* Esquerda: Formulário de correção */}
          <div className="flex-1 pr-12 border-r border-gray-200 max-w-[650px]">
            <div className="text-lg font-semibold mb-4">Correção</div>
            {alerta && (
              <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 text-center rounded">
                {alerta}
              </div>
            )}
            <table className="w-full border-separate border-spacing-0">
              <tbody>
                {/* Linha: Situação de correção */}
                <tr className="border-b border-dashed border-gray-300">
                  <td className="py-2 pr-2 font-light text-gray-800 min-w-[200px]">
                    Situação de correção
                  </td>
                  <td className="py-2">
                    <div className="flex gap-3">
                      {SITUACOES.map(letra => (
                        <label key={letra} className="flex flex-col items-center mx-1 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="situacao"
                            value={letra}
                            checked={valores.situacao === letra}
                            onChange={() => handleSituacaoClick(letra)}
                            className="peer sr-only"
                          />
                          <span className={`
                            w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center
                            text-xs font-semibold transition
                            ${valores.situacao === letra
                              ? "bg-black border-black text-white"
                              : "bg-white text-gray-800"}
                            `}>
                              {letra}
                          </span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>

                {/* Competências */}
                {COMPETENCIAS.map((comp, idx) => (
                  <tr key={idx} className="border-b border-dashed border-gray-300">
                    <td className="py-2 pr-2 font-light text-gray-800">
                      {comp.label}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-3">
                        {OPCOES_COMPETENCIA.map(letra => (
                          <label key={letra} className="flex flex-col items-center mx-1 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`competencia_${idx + 1}`}
                              value={letra}
                              checked={valores[`competencia_${idx + 1}`] === letra}
                              onChange={() => {
                                if (!situacaoIsA) {
                                  handleBloqueada();
                                  return;
                                }
                                handleCompetenciaClick(idx, letra);
                              }}
                              className="peer sr-only"
                              disabled={!situacaoIsA}
                            />
                            <span className={`
                              w-6 h-6 rounded-full border-2
                              ${situacaoIsA
                                ? "border-gray-400"
                                : "border-gray-300 bg-gray-100"}
                              flex items-center justify-center
                              text-xs font-semibold transition
                              ${valores[`competencia_${idx + 1}`] === letra && situacaoIsA
                                ? "bg-black border-black text-white"
                                : "bg-white text-gray-800"}
                              `}>
                                {letra}
                              </span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-8 w-full">
              <button
                onClick={handleCriarCartao}
                className="px-5 py-2 rounded-lg text-blue-700 font-semibold bg-gray-100 hover:bg-blue-100 border border-blue-200"
              >
                Criar Cartão
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  className="px-5 py-2 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
          {/* Direita: Painel de referência só com tópicos centralizado */}
          <div className="min-w-[330px] pl-12 pt-2 flex flex-col items-start">
            <div className="mb-3 text-base font-bold w-full text-center">
              Situação de Correção
            </div>
            <div className="leading-8 text-[15px]">
              <div><b>Conceito A – NORMAL</b></div>
              <div><b>Conceito B – BRANCO</b></div>
              <div><b>Conceito C – ESCRITA ILEGÍVEL</b></div>
              <div><b>Conceito D – OUTRA LÍNGUA</b></div>
              <div><b>Conceito E – ANULADO</b></div>
              <div><b>Conceito F – CÓPIA</b></div>
              <div><b>Conceito G – NÃO ALFABÉTICO</b></div>
              <div><b>Conceito H – FUGA AO TEMA</b></div>
              <div><b>Conceito I – FUGA AO GÊNERO TEXTUAL</b></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
