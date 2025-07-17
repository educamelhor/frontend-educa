// src/features/alunos/ImportPDF.jsx

import React, { useState, useRef } from "react";
import api from "../../../services/api";
import { Button } from '../../../components/ui/Button'
import FeedbackPanel from "../../../components/ui/FeedbackPanel";

export default function ImportPDF({ onComplete }) {
 
  const [feedback, setFeedback] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef();

  const handleButtonClick = () => {
    setFeedback(null);
    if (fileInput.current) fileInput.current.value = null;
    fileInput.current.click();
  };
  








 const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    const formData = new FormData();
    formData.append("file", file);

    let rota = "";
    if (ext === "pdf") rota = "/api/alunos/importar-pdf";
    else if (ext === "xlsx") rota = "/api/alunos/importar-xlsx";
    else {
      alert("Formato de arquivo não suportado. Use PDF ou XLSX.");
      return;
    }

    const turmaNome = file.name.replace(/\.[^.]+$/, "").trim();


    setFeedback({ status: "processando", turma: turmaNome });
    setProgress(0);

    try {
      const { data } = await api.post(rota, formData, {
        onUploadProgress: (evt) =>
          evt.total && setProgress(Math.round((evt.loaded / evt.total) * 100)),
      });

      const { localizados, inseridos, jaExistiam, inativados, reativados } = data;
      onComplete?.({
        turma: turmaNome,
        localizados,
        inseridos,
        jaExistiam,
        reativados,
        inativados
      });


      // Se o arquivo original for PDF, gera .xlsx para download automático
      if (ext === "pdf" && Array.isArray(data.listaAlunos)) {
        const XLSX = await import("xlsx");

        // Mapeia os campos desejados para o Excel (ajuste conforme sua estrutura de dados)
        const ws = XLSX.utils.json_to_sheet(data.listaAlunos.map(a => ({
          Código: a.codigo,
          Nome: a.estudante,
          "Data Nascimento": a.data_nascimento,
          Sexo: a.sexo,
          Turma: a.turma_nome || "", // ajuste para o nome correto do campo se precisar
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Alunos");

        // Cria o arquivo para download automático
        const nomeArquivo = `alunos_importados_${turmaNome}.xlsx`;
        const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(blob);
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }






      // aqui removemos toda a lógica de gerar .xlsx
      setFeedback({
        status: "sucesso",
        turma: turmaNome,
        localizados,
        inseridos,
        jaExistiam,
        reativados,
        inativados,
        message: `Turma ${turmaNome} importada.`,
      });
    } catch (err) {
      setFeedback({
        status: "erro",
        message: err.response?.data?.message || err.message,
      });
    } finally {
      e.target.value = null;
      setProgress(0);
    }
  };









  return (

    <div className="inline-block">
      <input type="file" accept=".pdf,.xlsx" onChange={handleFile} hidden ref={fileInput} />

      <Button
        onClick={handleButtonClick}
        className="
          bg-green-600 hover:bg-green-700
          text-white
          px-4 py-2
          rounded
          transition
          flex items-center gap-2
        "
      >
        📁 Incluir Estudantes
      </Button>

      {/* 🔄 Animação contínua de carregamento */}
      {progress > 0 && !feedback?.message && (
        <div className="w-full h-2 mt-2 bg-gray-200 rounded overflow-hidden">
          <div
            className="h-full bg-green-500 animate-pulse w-1/3"
            style={{ animationDuration: "1s" }}
          />
        </div>
      )}
    </div>


  );
}