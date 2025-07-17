// src/features/reconhecimento/ReconhecimentoFacial.jsx
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import api from "../../services/api";

export default function ReconhecimentoFacial() {
  const videoRef = useRef();
  const [carregando, setCarregando] = useState(true);
  const [alunosReconhecidos, setAlunosReconhecidos] = useState([]);

  // Carrega modelos do face-api.js
  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models")
    ]).then(startVideo);
  }, []);

  // Inicia câmera
  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("Erro ao acessar câmera:", err));
  };

  // Lógica de detecção contínua
  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current.addEventListener("play", async () => {
      const labeledDescriptors = await carregarRostosAlunos();
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

      setCarregando(false);

      const canvas = faceapi.createCanvasFromMedia(videoRef.current);
      document.body.append(canvas);
      faceapi.matchDimensions(canvas, {
        width: videoRef.current.width,
        height: videoRef.current.height,
      });

      setInterval(async () => {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, {
          width: videoRef.current.width,
          height: videoRef.current.height,
        });

        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach((detection) => {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          const nome = bestMatch.label;

          faceapi.draw.drawDetections(canvas, [detection]);

          if (nome !== "unknown" && !alunosReconhecidos.includes(nome)) {
            registrarPresenca(nome);
            setAlunosReconhecidos((prev) => [...prev, nome]);
          }
        });
      }, 1000);
    });
  }, [carregando]);

  // Carrega descritores faciais dos alunos do banco
  const carregarRostosAlunos = async () => {
    const { data } = await api.get("/api/alunos");

    return Promise.all(
      data.map(async (aluno) => {
        const img = await faceapi.fetchImage(`/uploads/alunos/${aluno.id}.jpg`);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        return new faceapi.LabeledFaceDescriptors(aluno.nome, [detections.descriptor]);
      })
    );
  };

  // Envia presença para o backend
  const registrarPresenca = async (nome) => {
    try {
      await api.post("/api/presencas", { nome });
      console.log(`Presença registrada para: ${nome}`);
    } catch (err) {
      console.error("Erro ao registrar presença:", err);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-xl font-bold mb-4">Reconhecimento Facial</h2>
      {carregando ? <p>Carregando modelos...</p> : null}
      <video ref={videoRef} autoPlay muted width="720" height="560" />
    </div>
  );
}
