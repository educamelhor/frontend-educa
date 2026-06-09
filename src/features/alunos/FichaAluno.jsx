// src/features/alunos/FichaAluno.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { Button } from "../../components/ui/Button";
import * as faceapi from "face-api.js";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import ModalRelatorioDisciplinar from "./ModalRelatorioDisciplinar";
import ModalRelatorioPedagogico from "./ModalRelatorioPedagogico";

/* =========================================================
   FICHA DO ESTUDANTE
   - Abre via rota ou via modal (prop `codigo`)
   - Permite escolher pasta com fotos (nome=CODIGO) e faz:
     leitura → detecção facial → recorte → upload → refresh
   ========================================================= */

export default function FichaAluno({ codigo: codigoProp }) {
  // Pode vir pelo modal (prop) ou pela rota /alunos/:codigo/ficha
  const { codigo: codigoParam } = useParams();
  const codigo = codigoProp || codigoParam;
  const isModal = Boolean(codigoProp);
  const navigate = useNavigate();
  const location = useLocation();
  const isDisciplinar = location.pathname.includes("/disciplinar");

  // Estados principais
  const [aluno, setAluno] = useState(null);
  const [erro, setErro] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);
  const [modalPedagogicoOpen, setModalPedagogicoOpen] = useState(false);

  // 🔐 trava anti-reentrada de upload
  const isUploadingRef = useRef(false);

  // 🔁 trava de "retry uma única vez" para a tag <img>
  const retryOnceRef = useRef(false);

  // ==========================
  // Utilidades
  // ==========================
  const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");
  const buildFotoURL = (path) => {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `${apiBase}${path}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const [y, m, d] = value.split("-");
        return `${d}/${m}/${y}`;
      }
      const d = new Date(value);
      const s = d.toLocaleDateString();
      return s && s !== "Invalid Date" ? s : "-";
    } catch {
      return "-";
    }
  };

  // ==========================
  // Carrega dados do aluno
  // ==========================
  useEffect(() => {
    let alive = true;
    async function fetchAluno() {
      try {
        if (!codigo) return;
        const res = await api.get(`/api/alunos/${codigo}`);
        if (!alive) return;
        setAluno(res.data);
      } catch (err) {
        console.error("Erro ao buscar aluno:", err);
        if (!alive) return;
        setErro("Não foi possível carregar os dados do aluno.");
      }
    }
    fetchAluno();
    return () => {
      alive = false;
    };
  }, [codigo]);

  // ==========================
  // Carrega modelo do face-api sob demanda
  // ==========================
  const ensureFaceModels = async () => {
    try {
      const MODELS_URL = "/models/faceapi/";
      if (!faceapi.nets.tinyFaceDetector.params) {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
      }
      return true;
    } catch (err) {
      console.error("Falha ao carregar o detector facial:", err);
      setFeedback({ tipo: "erro", mensagem: "Falha ao carregar o detector facial." });
      setTimeout(() => setFeedback(null), 2500);
      return false;
    }
  };

  // ==========================
  // Selecionar pasta (sempre substitui foto existente)
  // ==========================
  const handleFolderSelect = async (e) => {
    // evita reentrada
    if (isUploadingRef.current) {
      e.target.value = null;
      return;
    }
    isUploadingRef.current = true;

    if (!aluno) {
      alert("Aguarde: carregando dados do aluno.");
      e.target.value = null;
      isUploadingRef.current = false;
      return;
    }

    // 1) garantir modelos carregados
    const ok = await ensureFaceModels();
    if (!ok) {
      e.target.value = null;
      isUploadingRef.current = false;
      return;
    }

    // 2) procurar arquivo pelo código do aluno (matching resiliente)
    const files = Array.from(e.target.files || []);
    const alvo = String(aluno.codigo).trim().toLowerCase();
    const alvoDigits = alvo.replace(/\D/g, "");

    let arquivoAlvo =
      files.find((f) => f.name?.toLowerCase().replace(/\.[^.]+$/i, "") === alvo) ||
      files.find((f) => (f.webkitRelativePath || "").toLowerCase().includes(`/${alvo}.`)) ||
      files.find((f) => f.name?.toLowerCase().includes(alvo)) ||
      files.find((f) => f.name?.toLowerCase().replace(/\D/g, "").includes(alvoDigits));

    if (!arquivoAlvo) {
      alert(`Foto não encontrada na pasta para o código ${aluno.codigo}.`);
      e.target.value = null;
      isUploadingRef.current = false;
      return;
    }

    try {
      await recortarEEnviar(arquivoAlvo);
    } finally {
      e.target.value = null;
      isUploadingRef.current = false;
    }
  };

  // ==========================
  // Recorta rosto + upload
  // ==========================
  const recortarEEnviar = async (arquivoFonte) => {
    let imgEl;
    try {
      imgEl = await faceapi.bufferToImage(arquivoFonte);
      await new Promise((resolve) => {
        if (imgEl.complete && imgEl.naturalHeight !== 0) resolve();
        else imgEl.onload = () => resolve();
      });
    } catch (err) {
      console.error("Erro ao converter imagem:", err);
      alert("Falha ao ler a imagem selecionada.");
      return;
    }

    let detection;
    try {
      const canvasTemp = faceapi.createCanvasFromMedia(imgEl);
      detection = await faceapi.detectSingleFace(
        canvasTemp,
        new faceapi.TinyFaceDetectorOptions()
      );
    } catch (err) {
      console.error("Erro na detecção facial:", err);
    }

    let fileParaUpload = arquivoFonte;
    if (detection) {
      const box = detection.box;
      const MARGEM = 0.1;
      const x1 = Math.max(0, box.x - box.width * MARGEM);
      const y1 = Math.max(0, box.y - box.height * MARGEM);
      const x2 = Math.min(imgEl.width, box.x + box.width * (1 + MARGEM));
      const y2 = Math.min(imgEl.height, box.y + box.height * (1 + MARGEM));
      const w = x2 - x1;
      const h = y2 - y1;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imgEl, x1, y1, w, h, 0, 0, w, h);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.9)
        );
        if (blob) {
          fileParaUpload = new File([blob], `${aluno.codigo}.jpg`, {
            type: "image/jpeg",
          });
        }
      } catch (err) {
        console.warn("Falha ao recortar: enviando original.", err);
      }
    }

    await uploadFile(fileParaUpload);
  };

  // ==========================
  // Upload e atualização imediata — robusto
  // ==========================
  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("foto", file);

      const resp = await api.post(`/api/alunos/${codigo}/foto`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Aceita várias chaves comuns de resposta
      const base =
        resp?.data?.foto ??
        resp?.data?.url ??
        resp?.data?.path ??
        resp?.data?.caminho ??
        "";

      const baseURL = buildFotoURL(base);
      const novaPath = baseURL
        ? `${baseURL}${baseURL.includes("?") ? "&" : "?"}t=${Date.now()}`
        : "";

      console.log("Upload OK:", resp.data, "->", novaPath); // diagnóstico

      // zera retry do <img> e aplica a nova URL com cache-buster
      retryOnceRef.current = false;
      setAluno((old) => ({ ...(old || {}), foto: novaPath }));
      setFeedback({ tipo: "sucesso", mensagem: "Foto inserida com sucesso!" });
      setTimeout(() => setFeedback(null), 2200);
    } catch (err) {
      console.error("Erro no upload de foto:", err);
      setFeedback({ tipo: "erro", mensagem: "Falha ao enviar foto." });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  // ==========================
  // Render
  // ==========================
  if (erro) {
    return (
      <div className={`${isModal ? "bg-blue-50" : "min-h-screen bg-blue-50"} flex justify-center py-10 px-4`}>
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 space-y-6">
          <p className="text-red-600">{erro}</p>
          {!isModal && (
            <Button onClick={() => navigate("/alunos")} className="mt-4 bg-gray-200 text-gray-800 hover:bg-gray-300">
              ← Voltar à lista
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className={`${isModal ? "bg-blue-50" : "min-h-screen bg-blue-50"} flex justify-center items-center`}>
        <p>Carregando dados do aluno…</p>
      </div>
    );
  }

  const fotoURL = buildFotoURL(aluno.foto);

  // Placeholder (bolinha cinza) — evita texto do alt
  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
        <rect width='100%' height='100%' rx='64' ry='64' fill='#e5e7eb'/>
      </svg>`
    );

  return (
    <div className={`${isModal ? "bg-blue-50" : "min-h-screen bg-blue-50"} flex justify-center py-10 px-4`}>
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 space-y-6">
        {!isModal && (
          <Button onClick={() => navigate("/alunos")} className="mb-4 bg-gray-200 text-gray-800 hover:bg-gray-300">
            ← Voltar
          </Button>
        )}

        {/* Mensagens de feedback */}
        {feedback?.tipo === "sucesso" && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
            <span className="mr-2">✔️</span>
            {feedback.mensagem}
          </div>
        )}
        {feedback?.tipo === "erro" && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            <span className="mr-2">❌</span>
            {feedback.mensagem}
          </div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <AcademicCapIcon className="h-8 w-8 text-blue-900" />
          <h1 className="text-3xl font-bold text-blue-900">Ficha do Estudante</h1>
        </div>

        <div className="grid grid-cols-3 gap-6 items-center">
          {/* Foto */}
          <div className="flex justify-center">
            {fotoURL ? (
              <img
                key={fotoURL}
                src={fotoURL}
                alt={`Foto de ${aluno.estudante || ""}`}
                className="w-32 h-32 rounded-full object-cover"
                onError={(e) => {
                  // 1º erro: tenta uma única vez com cache-buster
                  if (!retryOnceRef.current) {
                    retryOnceRef.current = true;
                    try {
                      const u = new URL(e.currentTarget.src);
                      u.searchParams.set("t", Date.now().toString());
                      e.currentTarget.src = u.toString();
                    } catch {
                      // se não conseguir parsear URL, cai para placeholder
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = PLACEHOLDER;
                    }
                    return;
                  }
                  // 2º erro (ou mais): para o loop e mostra placeholder
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500">Sem foto</span>
              </div>
            )}
          </div>

          {/* Dados */}
          <div className="col-span-2 space-y-2">
            <p><strong>Código:</strong> {aluno.codigo ?? "-"}</p>
            <p><strong>Nome:</strong> {aluno.estudante ?? "-"}</p>
            <p><strong>Turma:</strong> {aluno.turma ?? "-"} {aluno.turno ? `(${aluno.turno})` : ""}</p>
            <p><strong>Data de Nascimento:</strong> {formatDate(aluno.data_nascimento)}</p>
            <p><strong>Sexo:</strong> {aluno.sexo ?? "-"}</p>
          </div>
        </div>




        {/* Seções futuras */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="bg-emerald-50 p-4 rounded shadow cursor-pointer hover:bg-emerald-100 transition border border-transparent hover:border-emerald-200"
            onClick={() => setModalPedagogicoOpen(true)}
            role="button"
            tabIndex={0}
          >
            <h2 className="text-lg font-semibold mb-2 text-emerald-900">Relatório Pedagógico</h2>
            <p className="text-gray-600">Clique para visualizar o histórico pedagógico.</p>
          </div>
          <div
            className="bg-blue-50 p-4 rounded shadow cursor-pointer hover:bg-blue-100 transition border border-transparent hover:border-blue-200"
            onClick={() => setModalRelatorioOpen(true)}
            role="button"
            tabIndex={0}
          >
            <h2 className="text-lg font-semibold mb-2 text-blue-900">Relatório Disciplinar</h2>
            <p className="text-gray-600">Clique para visualizar o histórico de ocorrências.</p>
          </div>
        </div>

        {/* Modais */}
        <ModalRelatorioDisciplinar
          open={modalRelatorioOpen}
          onClose={() => setModalRelatorioOpen(false)}
          aluno={aluno}
        />

        <ModalRelatorioPedagogico
          open={modalPedagogicoOpen}
          onClose={() => setModalPedagogicoOpen(false)}
          aluno={aluno}
        />
      </div>
    </div>
  );
}
