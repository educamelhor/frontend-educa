// src/features/alunos/ImportPDF.jsx

import React, { useState, useRef } from "react";
import api from "../../services/api";
import Button from "../../components/ui/Button";
import FeedbackPanel from "../../components/ui/FeedbackPanel";

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
      onComplete?.();

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
        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
      >
        📁 Incluir Estudantes
      </Button>

      <FeedbackPanel
        feedback={feedback}
        progress={progress}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}
