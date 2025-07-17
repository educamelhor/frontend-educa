import React, { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import LupaManual from "./LupaManual";
import ModalCorrecoes from "./ModalCorrecoes";

// Função para filtrar texto OCR extraído (apenas útil para banner)
function filtrarTextoOCR(textoCompleto) {
  if (!textoCompleto) return "";

  const linhas = textoCompleto
    .split('\n')
    .map(l => l.trim());

  // Procura "CARTÃO DE RESPOSTA"
  const idxCartao = linhas.findIndex(l => /^CART[ÃA]O DE RESPOSTA$/i.test(l));

  // Se achou, começa do próximo
  let textoFiltrado = (idxCartao !== -1)
    ? linhas.slice(idxCartao + 1)
    : linhas;

  // Filtros adicionais:
  textoFiltrado = textoFiltrado
    .filter(l => !/^\d{1,2}$/.test(l))
    .filter(l =>
      l.length > 0 &&
      !/^[A-Z]{2,10}\d{0,3}$/.test(l) &&
      !/^[A-Z0-9]{5,}$/.test(l) &&
      !/^\d+$/.test(l) &&
      !/^[\W_]+$/.test(l)
    );

  return textoFiltrado.join('\n');
}

// Função robusta para extrair código (igual do Gabarito.jsx)
function extrairCodigoDoTexto(texto) {
  if (!texto) return null;
  // Primeira tentativa: mesmo linha
  const match = texto.match(/C[ÓO]DIGO\s*[:\-–]?\s*([0-9]{4,10})/i);
  if (match) return match[1].trim();

  // Segunda: pode estar na próxima linha
  const linhas = texto.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    if (/C[ÓO]DIGO\s*[:\-–]?\s*$/i.test(linhas[i])) {
      for (let j = i + 1; j <= i + 2 && j < linhas.length; j++) {
        const n = linhas[j].match(/([0-9]{4,10})/);
        if (n) return n[1];
      }
    }
  }
  // Terceira: busca em trecho após "Código"
  const idx = texto.toUpperCase().indexOf("CÓDIGO");
  if (idx !== -1) {
    const after = texto.slice(idx, idx + 30);
    const n = after.match(/([0-9]{4,10})/);
    if (n) return n[1];
  }
  return null;
}

// Extrai Situação e Competências da resposta IA (seu padrão)
function extrairCamposCorrecaoIA(texto) {
  const situacao = (texto.match(/Situação(?: da Correção)?(?: -|:)?\s*([A-I])/i) || [])[1] || "";
  const competencia_1 = (texto.match(/Compet[êe]ncia\s*I\b[\s\S]*?:\s*([A-E])/i) || [])[1] || "";
  const competencia_2 = (texto.match(/Compet[êe]ncia\s*II\b[\s\S]*?:\s*([A-E])/i) || [])[1] || "";
  const competencia_3 = (texto.match(/Compet[êe]ncia\s*III\b[\s\S]*?:\s*([A-E])/i) || [])[1] || "";
  const competencia_4 = (texto.match(/Compet[êe]ncia\s*IV\b[\s\S]*?:\s*([A-E])/i) || [])[1] || "";
  return {
    situacao: (situacao || "").toUpperCase(),
    competencia_1: (competencia_1 || "").toUpperCase(),
    competencia_2: (competencia_2 || "").toUpperCase(),
    competencia_3: (competencia_3 || "").toUpperCase(),
    competencia_4: (competencia_4 || "").toUpperCase(),
  };
}

export default function Redacao() {
  const fileInputRef = useRef(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [pdfThumb, setPdfThumb] = useState(null);
  const [alunoInfo, setAlunoInfo] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrTextoBruto, setOcrTextoBruto] = useState(""); // Para debug
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successIA, setSuccessIA] = useState("");
  const [criterio, setCriterio] = useState("");
  const [corrigindo, setCorrigindo] = useState(false);
  const [correcaoIA, setCorrecaoIA] = useState("");
  const fileRef = useRef(null);

  // Unificado: busca código do aluno via OCR-text
  async function buscarInfoAluno(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Rota unificada Node/Express
      const resp = await fetch("http://localhost:3000/api/ocr/azure-text", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      setOcrTextoBruto(data.text || "");

      if (!resp.ok || !data.text) {
        setAlunoInfo({ codigo: "-", nome: "NÃO ENCONTRADO", turma: "-" });
        return;
      }

      // Extrai o código do texto OCR
      const codigo = extrairCodigoDoTexto(data.text);
      if (!codigo) {
        setAlunoInfo({ codigo: "-", nome: "CÓDIGO NÃO DETECTADO", turma: "-" });
        return;
      }

      // Busca o aluno no banco pelo código
      try {
        const respAluno = await fetch(
          `http://localhost:3000/api/alunos/por-codigo/${codigo}`
        );
        const dataAluno = await respAluno.json();
        if (!respAluno.ok || !dataAluno.nome) {
          setAlunoInfo({ codigo, nome: "NÃO ENCONTRADO", turma: "-" });
        } else {
          setAlunoInfo({
            codigo: String(codigo).toUpperCase(),
            nome: String(dataAluno.nome).toUpperCase(),
            turma: String(dataAluno.turma).toUpperCase(),
          });
        }
      } catch (err) {
        setAlunoInfo({ codigo, nome: "ERRO AO BUSCAR", turma: "-" });
      }
    } catch (err) {
      setAlunoInfo({ codigo: "-", nome: "ERRO OCR", turma: "-" });
    }
  }

  async function handleFileChange(e) {
    setOcrText("");
    setOcrTextoBruto("");
    setAlunoInfo(null);

    const file = e.target.files[0];
    if (!file) return;
    fileRef.current = file;

    const isPdf = file.type === "application/pdf";
    const isImage =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/jpg";

    if (!isPdf && !isImage) {
      alert("Selecione um PDF, JPEG ou PNG!");
      return;
    }

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const typedarray = new Uint8Array(evt.target.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const scale = Math.min(1, 250 / viewport.width);
        const vp = page.getViewport({ scale });
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: context, viewport: vp }).promise;
        setPdfThumb(canvas.toDataURL());
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 3000);
      };
      reader.readAsArrayBuffer(file);
    } else if (isImage) {
      const imageUrl = URL.createObjectURL(file);
      setPdfThumb(imageUrl);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    }

    await buscarInfoAluno(file);
  }

  async function handleCorrigir() {
    const file = fileRef.current;
    if (!file) {
      alert("Selecione uma redação primeiro!");
      return;
    }

    setLoading(true);
    setOcrText("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("http://localhost:3000/api/ocr/azure-struct", {
        method: "POST",
        body: formData,
      });

      const data = await resp.json();

      setOcrText(filtrarTextoOCR(data.fullText || ""));
    } catch (err) {
      setOcrText("Erro ao conectar ao serviço de OCR.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarRedacao() {
    if (!alunoInfo || !ocrText.trim() || !fileRef.current) {
      alert("Busque a redação, clique em Corrigir e selecione a imagem antes de salvar!");
      return;
    }
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.append("codigo", alunoInfo.codigo);
      formData.append("nome", alunoInfo.nome);
      formData.append("turma", alunoInfo.turma);
      formData.append("texto", ocrText);
      formData.append("imagem", fileRef.current);

      const resp = await fetch("http://localhost:3000/api/redacoes/salvar", {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      if (data.success) {
        setSuccessMessage("Redação salva com sucesso!");
        setTimeout(() => setSuccessMessage(""), 2000);
      } else {
        alert("Erro ao salvar redação.");
      }
    } catch (e) {
      alert("Erro de conexão ao salvar redação.");
    }
    setSalvando(false);
  }

  // Corrigir com IA e mostrar mensagem de sucesso
  async function handleCorrigirRedacaoIA() {
    if (!ocrText.trim() || !criterio.trim()) {
      alert("Preencha o texto da redação e o critério!");
      return;
    }
    setCorrigindo(true);
    setCorrecaoIA("");
    try {
      const resp = await fetch("http://localhost:3000/api/redacoes/corrigir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: ocrText, criterio })
      });
      const data = await resp.json();
      if (data.correcao) {
        setCorrecaoIA(data.correcao);

        // Salva a avaliação IA na tabela correcoes_openai
        const campos = extrairCamposCorrecaoIA(data.correcao);
        if (alunoInfo) {
          const dadosIA = {
            ...campos,
            codigo: alunoInfo.codigo,
            nome: alunoInfo.nome,
            ano: new Date().getFullYear(),
            numero: 1,
            tipo: "Redação",
            origem: "ia",
            texto_ia: data.correcao
          };
          await fetch("http://localhost:3000/api/correcoes_openai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosIA)
          });
          setSuccessIA("Correção IA salva com sucesso!");
          setTimeout(() => setSuccessIA(""), 2000);
        }
      } else {
        setCorrecaoIA("Erro ao corrigir.");
      }
    } catch (err) {
      setCorrecaoIA("Erro de conexão com IA.");
    }
    setCorrigindo(false);
  }

  return (
    <div className="min-h-screen flex flex-col p-8 bg-blue-50">
      {/* Topo com botões e info do aluno */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/jpg"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            className="bg-blue-700 text-white px-4 py-2 rounded shadow font-bold cursor-pointer flex items-center justify-center w-full"
            onClick={() => fileInputRef.current?.click()}
            style={{ userSelect: "none" }}
          >
            Buscar Redação
          </label>
          <button
            className="bg-green-600 text-white px-6 py-2 rounded shadow font-bold hover:bg-green-700 transition w-full"
            onClick={handleCorrigir}
            disabled={loading}
          >
            {loading ? "Lendo..." : "Ler Redação"}
          </button>
        </div>
        {alunoInfo && (
          <div
            className="flex items-center gap-8 font-bold tracking-widest text-gray-800 text-base uppercase"
            style={{ background: "none", padding: 0, borderRadius: 0 }}
          >
            <span>{alunoInfo.codigo}</span>
            <span style={{ fontWeight: 400, fontSize: "1.8em" }}>-</span>
            <span>{alunoInfo.nome}</span>
            <span style={{ fontWeight: 400, fontSize: "1.8em" }}>-</span>
            <span>{alunoInfo.turma}</span>
          </div>
        )}
        <button
          className="ml-auto bg-green-600 text-white px-6 py-2 rounded shadow font-bold hover:bg-green-700 transition"
          onClick={handleCorrigirRedacaoIA}
          disabled={corrigindo || !ocrText || !criterio}
        >
          {corrigindo ? "Corrigindo..." : "Corrigir Redação"}
        </button>
      </div>

      {/* Texto OCR bruto para debug */}
      {ocrTextoBruto && (
        <div style={{
          background: "#eee",
          color: "#222",
          fontSize: 12,
          margin: 8,
          padding: 8,
          borderRadius: 4,
          maxHeight: 170,
          overflow: "auto"
        }}>
          <b>Texto OCR extraído:</b>
          <pre>{ocrTextoBruto}</pre>
        </div>
      )}

      {/* Mensagens de sucesso */}
      {pdfSuccess && (
        <div className="mb-6 px-4 py-3 bg-green-100 border border-green-300 text-green-900 rounded flex items-center gap-2 font-semibold transition">
          <svg width="20" height="20" fill="none">
            <circle cx="10" cy="10" r="8" fill="#22c55e" />
          </svg>
          Imagem carregada com sucesso!
        </div>
      )}
      {successMessage && (
        <div className="mb-6 px-4 py-3 bg-green-100 border border-green-300 text-green-900 rounded flex items-center gap-2 font-semibold transition">
          <svg width="20" height="20" fill="none">
            <circle cx="10" cy="10" r="8" fill="#22c55e" />
          </svg>
          {successMessage}
        </div>
      )}
      {successIA && (
        <div className="mb-6 px-4 py-3 bg-green-100 border border-green-300 text-green-900 rounded flex items-center gap-2 font-semibold transition">
          <svg width="20" height="20" fill="none">
            <circle cx="10" cy="10" r="8" fill="#22c55e" />
          </svg>
          {successIA}
        </div>
      )}

      {/* Layout principal */}
      <div className="flex flex-1 gap-8">
        {/* Esquerda: Imagem/PDF */}
        <div className="flex-[0.7] bg-white rounded-xl shadow flex items-center justify-center min-h-[400px]">
          {pdfThumb ? (
            <LupaManual src={pdfThumb} width={350} height={495} />
          ) : (
            <span className="text-gray-400 text-xl text-center select-none">
              Imagem da redação
            </span>
          )}
        </div>

        {/* Direita: Critérios + Correção IA + OCR + Botões */}
        <div className="flex flex-col flex-1 gap-4">
          <div className="bg-white rounded-xl shadow flex items-center justify-center min-h-[200px] max-h-[240px]">
            <textarea
              value={criterio}
              onChange={e => setCriterio(e.target.value)}
              className="w-full h-full p-4 text-base text-blue-900 resize-none bg-transparent outline-none"
              style={{
                border: "none",
                height: "auto",
                minHeight: 140,
                fontWeight: "600",
                fontSize: "1.05em",
                overflow: "auto",
                whiteSpace: "pre-line"
              }}
              maxLength={12000}
              placeholder="Digite aqui o critério que a IA deve seguir para corrigir esta redação..."
            />
          </div>
          <div className="bg-white rounded-xl shadow p-4 min-h-[80px] max-h-[120px] flex-1 overflow-auto">
            {corrigindo ? (
              <span className="text-blue-700">Corrigindo com IA...</span>
            ) : correcaoIA ? (
              <pre className="text-gray-900 whitespace-pre-wrap">{correcaoIA}</pre>
            ) : (
              <span className="text-gray-400">Nenhuma correção automática ainda.</span>
            )}
          </div>
          <div className="flex flex-row gap-2">
            <div
              className="bg-white rounded-xl shadow flex-1 flex flex-col items-stretch justify-start overflow-hidden min-h-[150px] max-h-[260px]"
              style={{ minWidth: 0 }}
            >
              <div
                className="w-full h-full px-4 py-2 text-gray-800 text-base whitespace-pre-wrap overflow-auto"
                style={{ maxHeight: "220px", fontFamily: "monospace" }}
              >
                {loading ? (
                  <span className="text-blue-700">Lendo a redação...</span>
                ) : (
                  ocrText
                    ? ocrText
                    : <span className="text-gray-400 italic">Nenhum texto extraído.</span>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-start gap-2 w-[120px]">
              <button
                className="w-full py-2 bg-blue-200 hover:bg-blue-400 text-blue-900 font-semibold rounded transition"
                style={{ minHeight: 40 }}
                disabled
              >
                Próxima
              </button>
              <button
                className="w-full py-2 bg-blue-200 hover:bg-blue-400 text-blue-900 font-semibold rounded transition"
                style={{ minHeight: 40 }}
                disabled
              >
                Anterior
              </button>
              <button
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition shadow"
                style={{ minHeight: 40 }}
                onClick={handleSalvarRedacao}
                disabled={salvando || !ocrText}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Pode adicionar aqui o ModalCorrecoes se usar correção manual */}
    </div>
  );
}
