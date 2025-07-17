// src/features/alunos/FotoAluno.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api"; // ajuste conforme sua configuração do axios
import { Button } from "../../components/ui/Button"; // ajuste conforme seu componente de botão

// ──────────────────────────────────────────────────────────────────
// FACE-API.JS (para rodar detecção no navegador)
import * as faceapi from "face-api.js";
// URL relativa onde estão os models em public/
const MODELS_URL = "/models/faceapi/";
// ──────────────────────────────────────────────────────────────────

export default function FotoAluno() {
  const { id } = useParams();           // id do aluno (que também é o código)
  const navigate = useNavigate();
  const [aluno, setAluno] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [modelosProntos, setModelosProntos] = useState(false);

  // 1) Carregar os dados do aluno do backend
  useEffect(() => {
    async function fetchAluno() {
      try {
        const res = await api.get("/alunos/" + id);
        setAluno(res.data);
      } catch (err) {
        console.error("Erro ao carregar aluno:", err);
        alert("Falha ao carregar dados do aluno: " + err.message);
      }
    }
    fetchAluno();
  }, [id]);

  // 2) Carregar os modelos do Face-API no navegador (tinyFaceDetector)
  useEffect(() => {
    async function carregarModelos() {
      try {
        // Carrega o Tiny Face Detector
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        // Se precisar de landmarks, descomente a linha abaixo:
        // await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);

        console.log("✅ Modelos Face-API carregados no navegador.");
        setModelosProntos(true);
      } catch (err) {
        console.error("❌ Erro ao carregar modelos Face-API no navegador:", err);
        alert("Falha ao carregar modelos de detecção facial.");
      }
    }
    carregarModelos();
  }, []);

  // 3) Função para lidar com seleção de pasta contendo fotos
  const handleFolderSelect = async (e) => {
    if (!modelosProntos) {
      alert("Aguarde: modelos de detecção ainda estão carregando.");
      return;
    }
    if (!aluno) {
      alert("Aguarde: carregando dados do aluno.");
      return;
    }

    const files = Array.from(e.target.files);
    // Procurar arquivo cujo nome (sem extensão) seja igual ao código do aluno
    const arquivoAlvo = files.find((file) => {
      const nomeSemExt = file.name.replace(/\.[^/.]+$/, "");
      return nomeSemExt === aluno.codigo.toString();
    });

    if (!arquivoAlvo) {
      alert("Foto não encontrada para o código " + aluno.codigo);
      return;
    }

    // 3.1) Carrega a imagem no Face-API (HTMLImageElement)
    let imgEl;
    try {
      imgEl = await faceapi.bufferToImage(arquivoAlvo);
    } catch (err) {
      console.error("❌ Erro ao converter buffer para imagem:", err);
      alert("Falha ao ler a imagem selecionada.");
      return;
    }

    // 3.2) Cria um canvas temporário do tamanho da imagem inteira
    const c = faceapi.createCanvasFromMedia(imgEl);

    // 3.3) Executa a detecção usando o TinyFaceDetector
    let detection;
    try {
      detection = await faceapi
        .detectSingleFace(c, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(); // Opcional: com landmarks
    } catch (err) {
      console.error("❌ Erro durante detectSingleFace:", err);
      alert("Falha ao detectar rosto na imagem.");
      return;
    }

    if (!detection) {
      alert("Não foi possível detectar um rosto na imagem.");
      return;
    }

    // 3.4) Extrai a bounding box do rosto (x, y, width, height)
    const box = detection.detection.box;

    // 3.5) Calcula margem (por ex. 20% do tamanho do rosto)
    const MARGEM_PERC = 0.2;
    const margemX = box.width * MARGEM_PERC;
    const margemY = box.height * MARGEM_PERC;

    // 3.6) Ajusta limites para não ultrapassar bordas da imagem
    const x1 = Math.max(0, box.x - margemX);
    const y1 = Math.max(0, box.y - margemY);
    const x2 = Math.min(imgEl.width, box.x + box.width + margemX);
    const y2 = Math.min(imgEl.height, box.y + box.height + margemY);
    const wRecorte = x2 - x1;
    const hRecorte = y2 - y1;

    // 3.7) Cria um CANVAS DE RECORTE apenas do rosto + margem
    const canvasRecorte = document.createElement("canvas");
    canvasRecorte.width = wRecorte;
    canvasRecorte.height = hRecorte;
    const ctx = canvasRecorte.getContext("2d");
    ctx.drawImage(
      imgEl,
      x1,
      y1,
      wRecorte,
      hRecorte,
      0,
      0,
      wRecorte,
      hRecorte
    );

    // 3.8) Converte esse canvasRecorte para Blob (jpeg, qualidade 0.9)
    let blobRecorte;
    try {
      blobRecorte = await new Promise((resolve) =>
        canvasRecorte.toBlob(resolve, "image/jpeg", 0.9)
      );
    } catch (err) {
      console.error("❌ Erro ao gerar blob do recorte:", err);
      alert("Falha ao recortar a imagem.");
      return;
    }

    // 3.9) Cria um File a partir do blob, com nome "<codigo>.jpg"
    const arquivoRecortado = new File([blobRecorte], aluno.codigo + ".jpg", {
      type: "image/jpeg",
    });

    // 3.10) Chama upload do arquivo recortado
    await uploadFile(arquivoRecortado);
  };

  // 4) Função para enviar o arquivo recortado ao backend
  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("foto", file);

      const response = await api.post(
        "/alunos/" + id + "/foto",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      // Supondo que o backend retorne { foto: "/uploads/<codigo>.jpg" }
      const novaFotoUrl = response.data.foto;
      setAluno((old) => ({ ...old, foto: novaFotoUrl }));
      alert("Upload realizado com sucesso!");
    } catch (err) {
      console.error("❌ Erro no upload de foto:", err);
      alert("Falha ao enviar foto: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // 5) Renderização do componente
  if (!aluno) {
    return <p>Carregando dados do aluno...</p>;
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <Button
        onClick={() => navigate("/alunos")}
        className="mb-4 bg-gray-200 text-gray-800 hover:bg-gray-300"
      >
        ← Voltar
      </Button>

      <div className="max-w-2xl mx-auto bg-gray-50 rounded-lg shadow p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Foto do Estudante</h2>

        <div className="grid grid-cols-3 gap-4 items-center">
          {aluno.foto ? (
            <img
              src={api.defaults.baseURL.replace(/\/api$/, "") + aluno.foto}
              alt={"Foto de " + aluno.estudante}
              className="w-32 h-32 rounded-full object-cover mx-auto"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
              <span className="text-gray-500">Sem foto</span>
            </div>
          )}

          <div className="col-span-2 space-y-2">
            <p>
              <strong>Código:</strong> {aluno.codigo}
            </p>
            <p>
              <strong>Nome:</strong> {aluno.estudante}
            </p>
            <p>
              <strong>Turma:</strong> {aluno.turma} ({aluno.turno})
            </p>
            <p>
              <strong>Data de Nascimento:</strong>{" "}
              {new Date(aluno.data_nascimento).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Carregar Foto por Pasta</h3>
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFolderSelect}
            className="block"
            disabled={!modelosProntos || uploading}
          />
          {uploading && <p>Enviando...</p>}
        </div>
      </div>
    </div>
  );
}
