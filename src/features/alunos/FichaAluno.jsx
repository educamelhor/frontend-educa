// src/features/alunos/FichaAluno.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Button } from "../../components/ui/Button";
import * as faceapi from "face-api.js";
import { AcademicCapIcon } from "@heroicons/react/24/solid";

export default function FichaAluno() {
  // 1) Lê “codigo” na rota (em vez de id)
  const { codigo } = useParams();
  const navigate = useNavigate();

  // Estados principais
  const [aluno, setAluno] = useState(null);
  const [erro, setErro] = useState(false);
  const [modelosProntos, setModelosProntos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // 2) Carregar dados do aluno ao montar (pelo código)
  useEffect(() => {
    async function fetchAluno() {
      try {
        const res = await api.get(`/api/alunos/${codigo}`);
        setAluno(res.data);
      } catch (err) {
        console.error("Erro ao buscar aluno:", err);
        setErro(true);
      }
    }
    fetchAluno();
  }, [codigo]);

  // 3) Carregar modelos do face-api.js no navegador (tinyFaceDetector)
  useEffect(() => {
    async function carregarModelos() {
      try {
        const MODELS_URL = "/models/faceapi/";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        setModelosProntos(true);
      } catch (err) {
        console.error("Falha ao carregar modelos Face-API:", err);
        alert("Falha ao carregar modelos de detecção facial.");
      }
    }
    carregarModelos();
  }, []);

  // 4) Função que lida com seleção de pasta e insere foto
  const handleFolderSelect = async (e) => {
    if (!modelosProntos) {
      alert("Aguarde: modelos de detecção ainda estão carregando.");
      return;
    }
    if (!aluno) {
      alert("Aguarde: carregando dados do aluno.");
      return;
    }

    // 4.1) Monta lista de arquivos da pasta selecionada
    const files = Array.from(e.target.files);

    // 4.2) Procura o arquivo cujo nome (sem extensão) seja exatamente o código do aluno
    const arquivoAlvo = files.find((file) => {
      const nomeSemExt = file.name.replace(/\.[^/.]+$/, "");
      return nomeSemExt === aluno.codigo.toString();
    });

    if (!arquivoAlvo) {
      alert("Foto não encontrada para o código " + aluno.codigo);
      return;
    }

    // 4.3) Converte Blob/File em HTMLImageElement e aguarda carregamento completo
    let imgEl;
    try {
      imgEl = await faceapi.bufferToImage(arquivoAlvo);
      await new Promise((resolve) => {
        if (imgEl.complete && imgEl.naturalHeight !== 0) resolve();
        else imgEl.onload = () => resolve();
      });
    } catch (err) {
      console.error("Erro ao converter imagem:", err);
      alert("Falha ao ler a imagem selecionada.");
      return;
    }

    // 4.4) Cria um canvas temporário para detecção facial
    const canvasTemp = faceapi.createCanvasFromMedia(imgEl);

    // 4.5) Detecta apenas a bounding box do rosto (TinyFaceDetector)
    let detection;
    try {
      detection = await faceapi
        .detectSingleFace(canvasTemp, new faceapi.TinyFaceDetectorOptions());
      console.log("Resultado do detection:", detection);
    } catch (err) {
      console.error("Erro na detecção facial:", err);
      alert("Falha ao detectar rosto na imagem.");
      return;
    }
    if (!detection) {
      alert("Não foi possível detectar um rosto na imagem.");
      return;
    }

    // ←– BLOCO ÚNICO DE RECORTE E UPLOAD ––→

    // 4.6) Pega a bounding box e adiciona margem de 20%
    const box = detection.box;
    const MARGEM_PERC = 0.2;
    const margemX = box.width * MARGEM_PERC;
    const margemY = box.height * MARGEM_PERC;

    const x1 = Math.max(0, box.x - margemX);
    const y1 = Math.max(0, box.y - margemY);
    const x2 = Math.min(imgEl.width, box.x + box.width + margemX);
    const y2 = Math.min(imgEl.height, box.y + box.height + margemY);
    const wRecorte = x2 - x1;
    const hRecorte = y2 - y1;

    // 4.7) Cria canvasRecorte para desenhar só o rosto + margem
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

    // 4.8) Converte canvasRecorte em Blob (JPEG, qualidade 0.9)
    let blobRecorte;
    try {
      blobRecorte = await new Promise((resolve) =>
        canvasRecorte.toBlob(resolve, "image/jpeg", 0.9)
      );
    } catch (err) {
      console.error("Erro ao gerar blob do recorte:", err);
      setFeedback({ tipo: "erro", mensagem: "Falha ao recortar a imagem." });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    // 4.9) Cria um File com nome "<codigo>.jpg" para envio
    const arquivoRecortado = new File([blobRecorte], aluno.codigo + ".jpg", {
      type: "image/jpeg",
    });

    // 4.10) Chama a função uploadFile para enviar ao backend
    await uploadFile(arquivoRecortado);
  };

  // 5) Função que envia o File recortado ao servidor
  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("foto", file);

      const response = await api.post(`/api/alunos/${codigo}/foto`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // adiciona cache-buster para forçar atualização do <img>
      const baseUrl = response.data.foto;
      const novaFotoUrl = `${baseUrl}?t=${Date.now()}`;
      setAluno((old) => ({ ...old, foto: novaFotoUrl }));

      setFeedback({ tipo: "sucesso", mensagem: "Foto inserida com sucesso!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Erro no upload de foto:", err);
      setFeedback({ tipo: "erro", mensagem: "Falha ao enviar foto: " + err.message });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  // 6) Tratamento de erro ao carregar dados do aluno
  if (erro) {
    return (
      <div className="min-h-screen bg-blue-50 flex justify-center py-10 px-4">
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 space-y-6">
          <p className="text-red-600">
            Não foi possível carregar os dados do aluno.
          </p>
          <Button
            onClick={() => navigate("/alunos")}
            className="mt-4 bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            ← Voltar à lista
          </Button>
        </div>
      </div>
    );
  }

  // 7) Enquanto carrega aluno, mostra texto de carregando
  if (!aluno) {
    return (
      <div className="min-h-screen bg-blue-50 flex justify-center items-center">
        <p>Carregando dados do aluno…</p>
      </div>
    );
  }

  // 8) Montar URL da foto (se existir)
  const fotoURL = aluno.foto
    ? api.defaults.baseURL.replace(/\/api$/, "") + aluno.foto
    : null;

  // 9) JSX principal com fundo azul-claro e cartão branco centralizado
  return (
    <div className="min-h-screen bg-blue-50 flex justify-center py-10 px-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Botão “Voltar” dentro do cartão */}
        <Button
          onClick={() => navigate("/alunos")}
          className="mb-4 bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          ← Voltar
        </Button>

        {/* ←– INÍCIO: Bloco de feedback ––→ */}
        {feedback && feedback.tipo === "sucesso" && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
            <span className="mr-2">✔️</span>
            {feedback.mensagem}
          </div>
        )}
        {feedback && feedback.tipo === "erro" && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            <span className="mr-2">❌</span>
            {feedback.mensagem}
          </div>
        )}
        {/* ←– FIM: Bloco de feedback ––→ */}

        <div className="flex items-center gap-4 mb-6">
          {/* Ícone de formatura */}
          <AcademicCapIcon className="h-8 w-8 text-blue-900" />
          <h1 className="text-3xl font-bold text-blue-900">
            Ficha do Estudante
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-6 items-center">
          {/* Avatar circular */}
          <div className="flex justify-center">
            {fotoURL ? (
              <img
                src={fotoURL}
                alt={"Foto de " + aluno.estudante}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500">Sem foto</span>
              </div>
            )}
          </div>

          {/* Dados do aluno */}
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
            <p>
              <strong>Sexo:</strong> {aluno.sexo}
            </p>
          </div>
        </div>

        {/* Botão/select de pasta para inserir foto */}
        <div className="space-y-4">
          <h3 className="font-medium">Selecionar Pasta e Inserir Foto</h3>
          <label className="inline-block">
            <span className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded cursor-pointer">
              Escolher pasta
            </span>
            <input
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={(e) => {
                handleFolderSelect(e);
                // limpa o valor para não exibir contador
                e.target.value = null;
              }}
              className="hidden"
              disabled={!modelosProntos || uploading}
            />
          </label>
          {uploading && <p>Enviando foto…</p>}
        </div>

        {/* Seções de relatório (mesmo que “função futura”) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">
              Relatório Pedagógico
            </h2>
            <p className="text-gray-600">Nenhum relatório disponível.</p>
          </div>
          <div className="bg-blue-50 p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Relatório Disciplinar</h2>
            <p className="text-gray-600">Nenhum relatório disponível.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
