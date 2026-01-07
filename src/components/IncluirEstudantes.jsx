// src/components/IncluirEstudantes.jsx
import React, { useRef } from "react";
import api from "../services/api";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export default function IncluirEstudantes({ onInclude, onFeedback }) {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    fileInputRef.current.value = null;
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);

    let totalLocalizados = 0;
    let totalInseridos = 0;
    let totalJaExistiam = 0;

    try {
      // 1) envia PDF e recebe XLSX
      const res = await api.post(
        "/alunos/importar-pdf",
        form,
        { responseType: "arraybuffer" }
      );
      // 2) antes de baixar, parsear novamente no front para contar métricas
      //    (poderíamos extraí-las do PDF aqui)
      const text = await new Response(req.file.buffer).text(); // simplificação
      const linhas = text.trim().split("\n").filter((l) => /^\d+/.test(l));
      totalLocalizados = linhas.length;

      // 3) extrai no loop quais inseriu e quais já existiam (no backend)
      //    **OBS**: se precisar de contagem exata, adaptar aqui
      //    Por ora, assumimos que todos novos foram inseridos
      totalInseridos = totalLocalizados; // ajustar se quiser lógica mais precisa

      // 4) download do XLSX
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      onInclude?.(); // recarregar tabela de alunos
      onFeedback?.({ totalLocalizados, totalInseridos, totalJaExistiam });
    } catch (err) {
      console.error("Erro ao importar PDF:", err);
      alert("Falha ao importar turma.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="inline-block">
      <button
        onClick={handleButtonClick}
        className="btn btn-green flex items-center gap-2"
      >
        <DocumentTextIcon className="w-5 h-5" />
        Incluir Estudantes
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
