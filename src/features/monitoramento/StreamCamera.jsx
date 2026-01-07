// src/features/monitoramento/StreamCamera.jsx
// ============================================================================
// <StreamCamera />
// Objetivo: mostrar o feed da câmera com overlay AO VIVO desenhado no canvas.
// - props.cameraId  => número da câmera (1, 2, 3...)
// - props.titulo    => string pra mostrar embaixo ("Câmera 1")
// - props.registros => array de últimos reconhecidos pra tabela lateral/abaixo
//
// Fluxo interno:
// 1) Miniaturas (snapshot .jpg) se atualizam a cada 1s.
// 2) Clique ativa o modo AO VIVO (stream .mjpeg) contínuo.
// 3) Overlay facial é redesenhado conforme o endpoint /faces.
// OBS: Mantido o syncCanvasToImageSize(), como solicitado.
// ============================================================================

import React, { useEffect, useRef, useState } from "react";

export default function StreamCamera({ cameraId, titulo, registros }) {
  const API_BASE_PROTECTED = "/api/monitoramento";
  const API_BASE_PUBLIC   = "/api/monitoramento-public";
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const [imgSrc, setImgSrc] = useState("");
  const [facesData, setFacesData] = useState({ width: 0, height: 0, faces: [] });
  const [modoAoVivo, setModoAoVivo] = useState(false);

  // ----------------------------------------------------------------------------
  // util: sincronizar <canvas> com o tamanho VISÍVEL atual da <img>
  // ----------------------------------------------------------------------------
  function syncCanvasToImageSize() {
    const imgEl = imgRef.current;
    const canvasEl = canvasRef.current;
    if (!imgEl || !canvasEl) return;
    const w = imgEl.clientWidth;
    const h = imgEl.clientHeight;
    if (!w || !h) return;
    canvasEl.width = w;
    canvasEl.height = h;
    canvasEl.style.width = w + "px";
    canvasEl.style.height = h + "px";
  }

  // ----------------------------------------------------------------------------
  // 1) Atualizar URL da imagem conforme modo (snapshot ou stream)
  //    Para cameraId === 1, usar o frame base já disponível por HTTP.
  //    Para demais câmeras, manter a rota protegida existente.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    const escolaId = localStorage.getItem("escola_id") || "1";

    function construirUrl() {
      // Câmera 1: usar frame base estático exposto (mantém UI, evita encoder do overlay)
      if (cameraId === 1) {
        return `http://localhost:3000/uploads/CEF04_PLAN/monitoramento/camera-01/frame.jpg?_=${Date.now()}`;
      }

      // Demais câmeras: manter comportamento aprovado (snapshot/stream protegidos)
      if (modoAoVivo) {
        return `${API_BASE_PROTECTED}/stream/${cameraId}.mjpeg?token=${encodeURIComponent(
          token
        )}&escola_id=${encodeURIComponent(
          escolaId
        )}&transport=tcp&fps=8&quality=7&_=${Date.now()}`;
      } else {
        return `${API_BASE_PROTECTED}/stream/${cameraId}.jpg?token=${encodeURIComponent(
          token
        )}&escola_id=${encodeURIComponent(escolaId)}&quality=4&_=${Date.now()}`;
      }
    }

    setImgSrc(construirUrl());
    if (!modoAoVivo || cameraId === 1) {
      // Câmera 1 também deve atualizar o frame periodicamente (mesmo sem modoAoVivo)
      const id = setInterval(() => setImgSrc(construirUrl()), 1000);
      return () => clearInterval(id);
    }
  }, [cameraId, modoAoVivo]);

  // ----------------------------------------------------------------------------
  // 2) Buscar faces periodicamente
  //    - Para cameraId === 1, usar endpoint PÚBLICO já validado
  //    - Para demais câmeras, manter endpoint PROTEGIDO existente
  //    - Normalizar a estrutura (bbox -> x,y,w,h) sem alterar desenho
  // ----------------------------------------------------------------------------
  useEffect(() => {
    let cancelado = false;

    async function fetchFaces() {
      try {
        const token = localStorage.getItem("token") || "";
        const escolaId = localStorage.getItem("escola_id") || "1";

        // Monta URL de faces conforme a câmera
        const facesUrl =
          cameraId === 1
            ? `${API_BASE_PUBLIC}/camera/${cameraId}/faces`
            : `${API_BASE_PROTECTED}/camera/${cameraId}/faces`;

        const headers =
          cameraId === 1
            ? {} // público (não exige bearer)
            : {
                Authorization: `Bearer ${token}`,
                "x-escola-id": escolaId,
              };

        const resp = await fetch(facesUrl, { headers });
        if (!resp.ok) return;
        const json = await resp.json();

        if (!json || !json.ok) return;

        // Normalização para manter o desenho original (x,y,w,h; aluno_nome; turma)
        const normFaces = Array.isArray(json.faces)
          ? json.faces.map((f) => {
              // aceita tanto {x,y,w,h} quanto {bbox:{left,top,width,height}}
              const hasXYWH = typeof f.x === "number" && typeof f.w === "number";
              const bbox = f.bbox || {};
              const x = hasXYWH ? f.x : (typeof bbox.left === "number" ? bbox.left : 0);
              const y = hasXYWH ? f.y : (typeof bbox.top === "number" ? bbox.top : 0);
              const w = hasXYWH ? f.w : (typeof bbox.width === "number" ? bbox.width : 0);
              const h = hasXYWH ? f.h : (typeof bbox.height === "number" ? bbox.height : 0);

              // nome/turma podem vir com chaves diferentes
              const aluno_nome = f.aluno_nome || f.nome || "";
              const turma = f.turma || f.serie_turno || "";

              return {
                ...f,
                x,
                y,
                w,
                h,
                aluno_nome,
                turma,
              };
            })
          : [];

        if (!cancelado) {
          setFacesData({
            width: json.width || 0,
            height: json.height || 0,
            faces: normFaces,
          });
        }
      } catch (err) {
        console.error(`[StreamCamera ${cameraId}] Erro carregando faces:`, err);
      }
    }

    fetchFaces();
    const intervalId = setInterval(fetchFaces, 1000);
    return () => {
      cancelado = true;
      clearInterval(intervalId);
    };
  }, [cameraId]);

  // ----------------------------------------------------------------------------
  // 3) Desenhar overlay sempre que facesData mudar
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const imgEl = imgRef.current;
    const canvasEl = canvasRef.current;
    if (!imgEl || !canvasEl) return;
    if (!facesData.width || !facesData.height) return;

    syncCanvasToImageSize();
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    const scaleX = imgEl.clientWidth / facesData.width;
    const scaleY = imgEl.clientHeight / facesData.height;

    ctx.font = "16px sans-serif";
    ctx.lineWidth = 3;

    facesData.faces.forEach((face) => {
      const drawX = face.x * scaleX;
      const drawY = face.y * scaleY;
      const drawW = face.w * scaleX;
      const drawH = face.h * scaleY;

      ctx.strokeStyle = face.recognized ? "rgb(0,200,0)" : "rgb(220,0,0)";
      ctx.strokeRect(drawX, drawY, drawW, drawH);

      if (face.recognized && face.aluno_nome) {
        const label = `${face.aluno_nome} (${face.turma || ""})`.trim();
        const textWidth = ctx.measureText(label).width;
        const paddingX = 6;
        const paddingY = 4;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = 20 + paddingY * 2;

        let boxX = drawX;
        let boxY = drawY - boxHeight - 4;
        if (boxY < 0) boxY = 0;

        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        ctx.fillStyle = "white";
        ctx.fillText(label, boxX + paddingX, boxY + paddingY + 16);
      }
    });
  }, [facesData]);




console.log("[StreamCamera] cameraId=", cameraId, "registros=", registros);



  // ----------------------------------------------------------------------------
  // Renderização visual
  // ----------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-xl shadow border border-blue-200 flex flex-col overflow-hidden">
      {/* área de vídeo */}
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-[180px] group">
        {/* imagem base (snapshot ou stream) */}
        <img
          ref={imgRef}
          src={imgSrc}
          alt={`Câmera ${cameraId}`}
          className="max-h-full max-w-full object-contain transition-all duration-500 cursor-pointer"
          onLoad={() => syncCanvasToImageSize()}
          onClick={() => setModoAoVivo((v) => !v)}
        />

        {/* canvas overlay */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: imgRef.current ? imgRef.current.clientWidth : "100%",
            height: imgRef.current ? imgRef.current.clientHeight : "100%",
          }}
        />

        {/* botão flutuante */}
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-md shadow cursor-pointer opacity-80 hover:opacity-100">
          {modoAoVivo ? "AO VIVO" : "Prévia"}
        </div>
      </div>

      {/* título */}
      <div className="px-4 py-2 text-center text-blue-900 font-semibold text-lg border-t border-blue-200 bg-blue-50">
        {titulo || `Câmera ${cameraId}`}
      </div>

      {/* tabela de últimos reconhecidos */}
      <div className="px-4 py-3 border-t border-blue-200 bg-blue-50">
        <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2">
          Últimos reconhecidos - {titulo || `Câmera ${cameraId}`}
        </div>

        <div className="text-xs text-blue-900">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[0.7rem] text-blue-700">
                <th className="py-1 pr-2 font-semibold">Hora</th>
                <th className="py-1 pr-2 font-semibold">Aluno(a)</th>
                <th className="py-1 font-semibold">Turma</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((reg, idx) => (
                <tr
                  key={idx}
                  className="border-t border-blue-100 text-[0.75rem] align-top"
                >
                  <td className="py-1 pr-2 whitespace-nowrap font-semibold text-blue-900">
                    {reg.hora}
                  </td>
                  <td className="py-1 pr-2 text-blue-900">{reg.nome}</td>
                  <td className="py-1 text-blue-900">{reg.turma}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
