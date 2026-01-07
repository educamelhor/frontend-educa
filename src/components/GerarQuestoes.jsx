import { useState } from "react";
import axios from "axios";
axios.defaults.baseURL = "http://localhost:3000";



export default function GerarQuestoes() {
  const [file, setFile] = useState(null);
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState(null);
  const [modo, setModo] = useState("arquivo"); // 'arquivo' ou 'texto'

  // 1) Handler de seleção de arquivo
  const onFileChange = (e) => setFile(e.target.files[0]);

  // 2) Enviar upload (OCR ou PDF)
  const handleUpload = async () => {
    if (!file) return alert("Selecione um arquivo primeiro.");
    const form = new FormData();
    form.append("file", file);


    const url = file.type.includes("pdf")
      ? "/api/questoes/upload-pdf"
      : "/api/questoes/extrair";
    try {
      const res = await axios.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResultado(res.data);
    } catch (err) {
      console.error(err);
      alert("Erro ao processar arquivo.");
    }
  };

  // 3) Enviar texto manual
  const handleTexto = async () => {
    if (!texto.trim()) return alert("Digite ou cole algum texto.");
    try {
      const res = await axios.post("/api/questoes/por-texto", { texto });
      setResultado(res.data);
    } catch (err) {
      console.error(err);
      alert("Erro ao processar texto.");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white rounded-lg shadow">
      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="radio"
            value="arquivo"
            checked={modo === "arquivo"}
            onChange={() => setModo("arquivo")}
            className="mr-2"
          />
          Upload de Arquivo
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="texto"
            checked={modo === "texto"}
            onChange={() => setModo("texto")}
            className="mr-2"
          />
          Colar Texto
        </label>
      </div>

      {modo === "arquivo" ? (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onFileChange}
            className="block w-full text-sm text-gray-500"
          />
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Enviar e Gerar Questões
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            rows={8}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="Cole o texto aqui..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button
            onClick={handleTexto}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Gerar Questões do Texto
          </button>
        </div>
      )}

      {resultado && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Resultado</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

