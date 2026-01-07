import React, { useRef, useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import LupaManual from "./LupaManual";
import GabaritoOficial from "./GabaritoOficial";
import ModalMarcarGabarito from "./ModalMarcarGabarito";

// Função para extrair o código, robusta para qualquer linha/separador/célula
function extrairCodigoDoTexto(texto) {
  if (!texto) return null;
  const match = texto.match(/C[ÓO]DIGO\s*[:\-–]?\s*([0-9]{5,10})/i);
  if (match) return match[1].trim();
  const linhas = texto.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    if (/C[ÓO]DIGO\s*[:\-–]?\s*$/i.test(linhas[i].trim())) {
      for (let j = i + 1; j <= i + 8 && j < linhas.length; j++) {
        const n = linhas[j].match(/([0-9]{5,10})/);
        if (n) return n[1];
      }
    }
  }
  for (let i = 0; i < linhas.length; i++) {
    if (/C[ÓO]DIGO/.test(linhas[i].toUpperCase())) {
      for (let j = i; j < linhas.length && j < i + 12; j++) {
        const n = linhas[j].match(/\b(\d{5,10})\b/);
        if (n) return n[1];
      }
    }
  }
  const fallback = texto.match(/\b(\d{5,10})\b/);
  if (fallback) return fallback[1];
  return null;
}

// Função para transformar texto OCR em array de respostas do aluno
function parseRespostasFromOcr(fullText, numQuestoes) {
  const linhas = fullText.split(/\n/);
  const respostas = [];
  for (let i = 0; i < linhas.length; i++) {
    const match = linhas[i].match(/^\s*(\d{1,3})\s*([A-Z])\s*$/i);
    if (match) {
      respostas[Number(match[1]) - 1] = match[2].toUpperCase();
    }
  }
  return Array.from({length: numQuestoes}, (_, i) => respostas[i] || "");
}

export default function Gabarito() {
  const fileInputRef = useRef(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [pdfThumb, setPdfThumb] = useState(null);
  const [alunoInfo, setAlunoInfo] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [codigoDetectado, setCodigoDetectado] = useState("");
  const [ocrTextoBruto, setOcrTextoBruto] = useState("");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loadingAluno, setLoadingAluno] = useState(false);
  const [resultadoCorrecao, setResultadoCorrecao] = useState("");
  const [respostasExtraidas, setRespostasExtraidas] = useState([]);

  // Estados para modais e configs
  const [listaDeGabaritos, setListaDeGabaritos] = useState([]);
  const [modalGabaritoOpen, setModalGabaritoOpen] = useState(false);
  const [configGabarito, setConfigGabarito] = useState({
    nomeGabarito: "",
    numQuestoes: 0,
    numAlternativas: 0,
  });

  // Novos estados para modal visual de marcação
  const [modalMarcarOpen, setModalMarcarOpen] = useState(false);
  const [tempGabaritoConfig, setTempGabaritoConfig] = useState(null);
  const [gabaritoOficialMarcado, setGabaritoOficialMarcado] = useState([]);

  const fileRef = useRef(null);

  // Buscar lista de nomes ao abrir o modal
  useEffect(() => {
    if (modalGabaritoOpen) {
      fetch("http://localhost:3000/api/gabaritos/nome-unicos")
        .then(res => res.json())
        .then(data => setListaDeGabaritos(data))
        .catch(() => setListaDeGabaritos([]));
    }
  }, [modalGabaritoOpen]);

  // Salva a configuração e abre o modal visual de marcação
  function handleSalvarConfigGabarito(nomeGabarito, numQuestoes, numAlternativas, notaTotal) {
    setTempGabaritoConfig({ nomeGabarito, numQuestoes, numAlternativas, notaTotal });
    setModalGabaritoOpen(false);
    setTimeout(() => setModalMarcarOpen(true), 400);
  }

  // Quando o usuário salva o gabarito visualmente
  function handleSalvarMarcarGabarito(respostas) {
    setGabaritoOficialMarcado(respostas); // array ['B', ...]
    setConfigGabarito(tempGabaritoConfig); // Salva config
    setModalMarcarOpen(false);
    setTempGabaritoConfig(null);
    setSuccessMessage("Gabarito oficial configurado com sucesso!");
    setTimeout(() => setSuccessMessage(""), 2000);
    // Se quiser, pode já salvar no banco aqui!
  }

  function handleGabaritoButtonClick() {
    handleAbrirGabaritoOficial();
  }

  // Fluxo UX inteligente: abre direto o modal de marcação se já existir gabarito pre-salvo
  function handleAbrirGabaritoOficial() {
    if (
      configGabarito.nomeGabarito &&
      configGabarito.numQuestoes > 0 &&
      configGabarito.numAlternativas > 0 &&
      gabaritoOficialMarcado.length === Number(configGabarito.numQuestoes)
    ) {
      setTempGabaritoConfig(configGabarito);
      setModalMarcarOpen(true);
    } else {
      setModalGabaritoOpen(true);
    }
  }

  // Função para rodar OCR só para capturar código do aluno (rotas unificadas!)
  async function buscarCodigoAluno(file) {
    setLoadingAluno(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Usa rota unificada Node/Express
      const resp = await fetch("http://localhost:3000/api/ocr/azure-text", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      setOcrTextoBruto(data.text || "");

      if (!resp.ok || !data.text) {
        setAlunoInfo({ codigo: "-", nome: "NÃO ENCONTRADO", turma: "-" });
        setCodigoDetectado("");
        setLoadingAluno(false);
        return;
      }

      // Extrai o código do texto OCR
      const codigo = extrairCodigoDoTexto(data.text);
      setCodigoDetectado(codigo || "");

      if (!codigo) {
        setAlunoInfo({ codigo: "-", nome: "CÓDIGO NÃO DETECTADO", turma: "-" });
        setLoadingAluno(false);
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
      setCodigoDetectado("");
      setOcrTextoBruto("");
    }
    setLoadingAluno(false);
  }

  async function handleFileChange(e) {
    setOcrResult("");
    setAlunoInfo(null);
    setCodigoDetectado("");
    setOcrTextoBruto("");

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

    // Após exibir a imagem, roda o OCR para capturar o código do aluno
    await buscarCodigoAluno(file);
  }

  async function handleCorrigir() {
    const file = fileRef.current;
    if (!file) {
      alert("Selecione um gabarito primeiro!");
      return;
    }

    if (
      !gabaritoOficialMarcado ||
      !configGabarito.nomeGabarito ||
      gabaritoOficialMarcado.length === 0
    ) {
      alert("Defina e marque o gabarito oficial antes de corrigir!");
      return;
    }

    setLoading(true);
    setOcrResult("");

    try {
      // 1. Envia para o Python (crop-gabarito)
      const formData = new FormData();
      formData.append("file", file);

      const respCrop = await fetch("http://localhost:8500/crop-gabarito", {
        method: "POST",
        body: formData,
      });

      if (!respCrop.ok) {
        setOcrResult("Erro ao cortar gabarito (crop-gabarito).");
        setLoading(false);
        return;
      }

      const cropBlob = await respCrop.blob();
      const cropUrl = URL.createObjectURL(cropBlob);
      setPdfThumb(cropUrl); // Mostra o crop no card

      // 2. Agora envia o crop para o OCR Azure via Node
      const cropFile = new File([cropBlob], "gabarito_crop.png", { type: "image/png" });
      const formDataCrop = new FormData();
      formDataCrop.append("file", cropFile);

      const respOcr = await fetch("http://localhost:8500/corrigir-bolhas", {
        method: "POST",
        body: formDataCrop,
      });

      if (!respOcr.ok) {
        setOcrResult("Erro ao processar OCR do gabarito.");
        setLoading(false);
        return;
      }
 
      const data = await respOcr.json();
      const respostasAluno = data.respostas || []; // <- garante array vazio se vier undefined

      // Agora já pode comparar com o gabarito oficial:
      const correcao = respostasAluno.map((resp, idx) => ({
        numero: idx + 1,
        resposta: resp,
        correto: gabaritoOficialMarcado[idx],
        acertou: resp === gabaritoOficialMarcado[idx],
      }));
      const nota = correcao.filter(q => q.acertou).length;

      // Exibe resultado de correção no card principal
      setResultadoCorrecao(
        `Nota do Aluno: ${nota} / ${gabaritoOficialMarcado.length}\n` +
          correcao.map(q =>
            `${String(q.numero).padStart(2, "0")}: → (${q.resposta || "em branco"})`
          ).join(" | ")
      );

      // Salva também as respostas extraídas para mostrar no card de baixo!
     setRespostasExtraidas(respostasAluno);

     // Se quiser limpar loading, faça no finally:
      setLoading(false);

      setResultadoCorrecao(
        `Nota do Aluno: ${nota} / ${gabaritoOficialMarcado.length}\n` +
        correcao.map(q =>
          `${String(q.numero).padStart(2,"0")}: ${q.resposta} ${q.acertou ? "✓" : `→   (${q.correto})`}`
        ).join(" | ")
      );

    } catch (err) {
      setOcrResult("Erro ao conectar ao crop/ocr.");
      console.error("Erro no handleCorrigir:", err);
    } finally {
      setLoading(false);
    }
  }

  // Função para salvar no banco + imagem
  async function handleSalvarGabarito() {
    if (!alunoInfo || !ocrResult.trim() || !fileRef.current) {
      alert("Busque o gabarito, clique em Corrigir e selecione a imagem antes de salvar!");
      return;
    }
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.append("codigo", alunoInfo.codigo);
      formData.append("nome", alunoInfo.nome);
      formData.append("turma", alunoInfo.turma);
      formData.append("resultado", ocrResult);
      formData.append("imagem", fileRef.current);
      formData.append("nome_gabarito", configGabarito.nomeGabarito);

      if (gabaritoOficialMarcado && gabaritoOficialMarcado.length > 0) {
        formData.append("gabarito_oficial", gabaritoOficialMarcado.join(","));
      }

      const resp = await fetch("http://localhost:3000/api/gabaritos/salvar", {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      if (data.success) {
        setSuccessMessage("Gabarito salvo com sucesso!");
        setTimeout(() => setSuccessMessage(""), 2000);
      } else {
        alert("Erro ao salvar gabarito.");
      }
    } catch (e) {
      alert("Erro de conexão ao salvar gabarito.");
    }
    setSalvando(false);
  }







   return (
    <>
      {/* MODAL de configuração de gabarito oficial */}
      <GabaritoOficial
        open={modalGabaritoOpen}
        onClose={() => setModalGabaritoOpen(false)}
        onSave={handleSalvarConfigGabarito}
        gabaritosExistentes={listaDeGabaritos}
      />
      {/* NOVO MODAL de marcação visual */}
      <ModalMarcarGabarito
        open={modalMarcarOpen}
        onClose={() => setModalMarcarOpen(false)}
        numQuestoes={tempGabaritoConfig?.numQuestoes || 0}
        numAlternativas={tempGabaritoConfig?.numAlternativas || 0}
        nomeGabarito={tempGabaritoConfig?.nomeGabarito || ""}
        gabaritoInicial={gabaritoOficialMarcado}
        onSave={handleSalvarMarcarGabarito}
      />

      <div className="min-h-screen flex flex-col p-8 bg-blue-50">
        {/* Topo com botões e info do aluno */}
        <div className="flex items-center gap-4 mb-8">
          {/* Coluna: Buscar Gabarito + Gabarito Oficial */}
          <div className="flex flex-col">
            <div className="flex items-center">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/jpg"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                className="bg-blue-700 text-white px-4 py-2 rounded shadow font-bold cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                style={{ userSelect: "none" }}
              >
                Buscar Gabarito
              </label>
              {/* DADOS DO ALUNO sempre na MESMA LINHA */}
              {alunoInfo && alunoInfo.codigo && alunoInfo.codigo !== "-" && (
                <div className="flex items-center gap-8 font-bold tracking-widest text-gray-800 text-base uppercase ml-6">
                  <span>{alunoInfo.codigo}</span>
                  <span style={{ fontWeight: 400, fontSize: "1.8em" }}>-</span>
                  <span>{alunoInfo.nome}</span>
                  <span style={{ fontWeight: 400, fontSize: "1.8em" }}>-</span>
                  <span>{alunoInfo.turma}</span>
                </div>
              )}
              {loadingAluno && (
                <span className="text-gray-600 ml-4 animate-pulse" style={{ fontWeight: 500 }}>
                  Carregando dados...
                </span>
              )}
            </div>
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded shadow font-semibold mt-2 w-max"
              style={{ minWidth: 180 }}
              onClick={handleGabaritoButtonClick}
              type="button"
            >
              Gabarito Oficial
            </button>
          </div>

          {/* Botão corrigir totalmente à direita */}
          <button
            className="ml-auto bg-green-600 text-white px-6 py-2 rounded shadow font-bold hover:bg-green-700 transition"
            onClick={handleCorrigir}
            disabled={loading}
          >
            {loading ? "Corrigindo..." : "Corrigir"}
          </button>
        </div>

        {pdfSuccess && (
          <div className="mb-6 px-4 py-3 bg-green-100 border border-green-300 text-green-900 rounded flex items-center gap-2 font-semibold transition">
            <svg width="20" height="20" fill="none">
              <path
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-4.41l5.3-5.3-1.42-1.42L9 10.76l-1.88-1.88-1.41 1.41L9 13.59z"
                fill="#22c55e"
              />
            </svg>
            Imagem carregada com sucesso!
          </div>
        )}

        {/* Mensagem de sucesso entre Critérios e Correções */}
        {successMessage && (
          <div className="mb-1 px-4 py-3 bg-green-100 border border-green-300 text-green-900 rounded flex items-center gap-2 font-semibold transition whitespace-pre-line">
            <svg width="20" height="20" fill="none">
              <path
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-4.41l5.3-5.3-1.42-1.42L9 10.76l-1.88-1.88-1.41 1.41L9 13.59z"
                fill="#22c55e"
              />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Layout principal */}
        <div className="flex flex-1 gap-8">
          {/* Esquerda: Imagem/PDF */}
          <div className="flex-[0.7] bg-white rounded-xl shadow flex items-center justify-center min-h-[400px]">
            {pdfThumb ? (
              <div
                style={{
                  height: 500,
                  maxWidth: "100%",
                  overflowY: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%"
                }}
              >
                <div style={{
                  position: "relative",
                  width: "fit-content",
                  height: "fit-content"
                }}>
                  <LupaManual
                    src={pdfThumb}
                    width={260}
                    height={380}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 480,
                      objectFit: "contain",
                      display: "block",
                      margin: "0 auto"
                    }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-gray-400 text-xl text-center select-none">
                Imagem do gabarito
              </span>
            )}
          </div>

          {/* Direita: Critérios + Banner OCR + Coluna de botões */}
          <div className="flex flex-col flex-1 gap-4">






          {/* Card de Resultado com barra de rolagem só nele */}
<div
  className="bg-white rounded-xl shadow min-h-[200px] flex flex-col px-2 py-2"
  style={{
    maxHeight: 220, // ajuste a altura máxima aqui!
    overflowX: "auto", // ativa rolagem horizontal
    overflowY: "hidden", // desativa rolagem vertical
    width: "100%",
    minWidth: 0, // ESSENCIAL: permite que o flex-shrink funcione!
    boxSizing: "border-box"
  }}
>
  {(gabaritoOficialMarcado.length > 0 && respostasExtraidas.length > 0) ? (
    <>
      <span className="font-bold text-green-900 text-lg mb-1 block">
        {(() => {
          // Calcula acertos e nota proporcional
          const acertos = respostasExtraidas.reduce((acc, resp, idx) => (
            acc + (resp === gabaritoOficialMarcado[idx] ? 1 : 0)
          ), 0);
          const totalQuestoes = gabaritoOficialMarcado.length;
          const notaTotal = Number(configGabarito.notaTotal || 0);
          const valorQuestao = totalQuestoes ? (notaTotal / totalQuestoes) : 0;
          const notaProporcional = (acertos * valorQuestao).toFixed(2).replace('.', ',');
          return `Nota do Aluno: ${acertos} / ${totalQuestoes} - (${notaProporcional})`;
        })()}
      </span>
      <div style={{ minWidth: 720, width: "max-content" }}>
        <table className="border border-gray-300 rounded text-center bg-white" style={{ minWidth: 720 }}>
          <thead>
            <tr className="bg-yellow-200 text-gray-700 text-sm">
              <th className="border border-gray-300 px-2 py-1"></th>
              {gabaritoOficialMarcado.map((_, idx) => (
                <th key={idx} className="border border-gray-300 px-2 py-1">
                  {idx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-base">
            <tr>
              <td className="border border-gray-300 font-semibold bg-gray-100">GAB_OFICIAL</td>
              {gabaritoOficialMarcado.map((g, idx) => (
                <td key={idx} className="border border-gray-300">{g}</td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 font-semibold bg-gray-100">GAB_ALUNO</td>
              {respostasExtraidas.map((r, idx) => (
                <td key={idx} className="border border-gray-300">
                  {r === "" ? <span className="text-gray-400 italic">-</span> : r}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 font-semibold bg-gray-100">RESULTADO</td>
              {respostasExtraidas.map((resp, idx) => (
                <td key={idx} className="border border-gray-300">
                  {resp === gabaritoOficialMarcado[idx]
                    ? <span className="text-green-600 text-xl">✔️</span>
                    : <span className="text-red-500 text-xl">❌</span>
                  }
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <span className="text-blue-900 font-semibold text-lg select-none">
      Critérios de Correções de Gabarito
    </span>
  )}
</div>










            <div className="flex flex-1 gap-2">
              {/* Banner OCR extração (MENOR) */}
              <div
                className="bg-white rounded-xl shadow flex-1 flex flex-col items-stretch justify-start overflow-hidden min-h-[150px] max-h-[260px]"
                style={{ minWidth: 0 }}
              >

                <div
                  className="w-full h-full px-4 py-2 text-gray-800 text-base whitespace-pre-wrap overflow-auto"
                  style={{ maxHeight: "220px", fontFamily: "monospace" }}
                >
                  {loading ? (
                    <span className="text-blue-700">Corrigindo...</span>
                  ) : (
                    <>
                      <div className="mb-2 font-semibold text-gray-600">Respostas extraídas do aluno:</div>
                      <ul className="grid grid-cols-5 gap-2 text-base">
                        {respostasExtraidas.length > 0 ? (
                          respostasExtraidas.map((resp, idx) => (
                            <li key={idx} className="font-mono">
                              {String(idx + 1).padStart(2, "0")}: <b>{resp || <span className="text-gray-400">em branco</span>}</b>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400 italic col-span-5">Nenhum resultado extraído.</li>
                        )}
                      </ul>
                    </>
                  )}
                </div>

              </div>
              {/* Coluna de botões à direita */}
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
                  onClick={handleSalvarGabarito}
                  disabled={salvando || !ocrResult}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
