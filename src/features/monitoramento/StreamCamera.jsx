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
  // Em DEV (Vite:5173), as rotas /api/* precisam apontar para o backend (3000),
  // senão o request vai para 5173 e dá 404.
  // Em PROD, aponta para o backend DigitalOcean (mesma lógica do api.js).
  const _host = window.location.hostname;
  const _isLocal = _host === "localhost" || _host === "127.0.0.1";
  const API_ORIGIN =
    import.meta.env.VITE_API_ORIGIN ||
    import.meta.env.VITE_API_BASE_URL ||
    (_isLocal ? "http://localhost:3000" : "https://educa-backend-docker-659zo.ondigitalocean.app");

  const API_BASE_PROTECTED = `${API_ORIGIN}/api/monitoramento`;
  const API_BASE_PUBLIC    = `${API_ORIGIN}/api/monitoramento-public`;
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const [imgSrc, setImgSrc] = useState("");
  const [facesData, setFacesData] = useState({ width: 0, height: 0, faces: [] });
  const [modoAoVivo, setModoAoVivo] = useState(false);

  const [streamToken, setStreamToken] = useState("");

  // PRÉVIA: controlar o "polling" do snapshot (evita requests cancelled)
  const snapTimerRef = useRef(null);
  const [snapTick, setSnapTick] = useState(0);

  // ----------------------------------------------------------------------------
  // util: sincronizar <canvas> com o tamanho VISÍVEL atual da <img>
  // ----------------------------------------------------------------------------
  function syncCanvasToImageSize() {
    const imgEl = imgRef.current;
    const canvasEl = canvasRef.current;
    if (!imgEl || !canvasEl) return;

    // Usa o tamanho REAL renderizado (CSS px) e aplica DPR para evitar desvio de escala/offset
    const rect = imgEl.getBoundingClientRect();
    const cssW = Math.round(rect.width);
    const cssH = Math.round(rect.height);
    if (!cssW || !cssH) return;

    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1;

    // Canvas cobre o mesmo box do <img> (por CSS). Os pixels internos seguem DPR.
    canvasEl.style.width = "100%";
    canvasEl.style.height = "100%";
    canvasEl.width = Math.round(cssW * dpr);
    canvasEl.height = Math.round(cssH * dpr);

    const ctx = canvasEl.getContext("2d");
    if (ctx) {
      // A partir daqui, desenhamos em "CSS pixels"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // ----------------------------------------------------------------------------
  // 0) Obter stream_token curto (necessário para <img src="...mjpeg">)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    // FASE ATUAL: somente câmera 1 deve pedir stream_token
    if (cameraId !== 1) return;

    let cancelado = false;

    async function obterStreamToken() {
      try {
        const authToken = localStorage.getItem("token") || "";
        if (!authToken) return;

        const resp = await fetch(`${API_BASE_PROTECTED}/stream/token?ttl=90`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!resp.ok) return;
        const json = await resp.json();
        if (!json?.ok || !json?.stream_token) return;

        if (!cancelado) setStreamToken(json.stream_token);
      } catch (e) {
        console.error("[StreamCamera] falha ao obter stream_token:", e);
      }
    }

    obterStreamToken();
    const id = setInterval(obterStreamToken, 60_000); // renova antes de expirar (ttl=90s)
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [cameraId]);

  // ----------------------------------------------------------------------------
  // 1) Atualizar URL da imagem conforme modo (snapshot ou stream)
  //    Para cameraId === 1, usar o MJPEG/IMG do backend com stream_token + fallback.
  //    Para demais câmeras, manter a rota protegida existente.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    // FASE ATUAL DO PROJETO: apenas câmera 1.
    // Objetivo: zero requests de stream/snapshot para cams 2 e 3.
    if (cameraId !== 1) {
      setImgSrc("");
      return;
    }

    if (!streamToken) return;

    // sempre reseta o decoder do <img> antes de trocar de modo (JPG <-> MJPEG)
    setImgSrc("");

    // AO VIVO (MJPEG): NÃO pode recriar o src continuamente
    if (modoAoVivo) {
      const url = `${API_BASE_PROTECTED}/1.mjpeg?token=${encodeURIComponent(
        streamToken
      )}&fallback=1&fps=5`;

      // next tick para garantir que o reset do src foi aplicado
      const t = setTimeout(() => setImgSrc(url), 0);
      return () => clearTimeout(t);
    }

    // Snapshot (JPG): cache-bust para "quase-vídeo"
    // ATENÇÃO: o próximo tick será disparado SOMENTE após o onLoad (evita "cancelled")
    const buildJpgUrl = (tick) =>
      `${API_BASE_PROTECTED}/1.jpg?token=${encodeURIComponent(
        streamToken
      )}&fallback=1&_=${tick}`;

    setImgSrc(buildJpgUrl(snapTick));

    return () => {
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }
    };
  }, [cameraId, modoAoVivo, streamToken, snapTick]);


  // ----------------------------------------------------------------------------
  // 2) Buscar faces periodicamente
  //    - Para cameraId === 1, usar endpoint PÚBLICO já validado
  //    - Para demais câmeras, manter endpoint PROTEGIDO existente
  //    - Normalizar a estrutura (bbox -> x,y,w,h) sem alterar desenho
  // ----------------------------------------------------------------------------
  useEffect(() => {
    // FASE ATUAL: somente câmera 1 deve buscar faces (zero requests cams 2 e 3)
    if (cameraId !== 1) {
      setFacesData({ width: 0, height: 0, faces: [] });
      return;
    }

    let cancelado = false;

    async function fetchFaces() {
      try {
        const escolaDir =
          localStorage.getItem("escola_dir") ||
          localStorage.getItem("escola_apelido") ||
          "CEF04_PLAN";

        // Evitar 304/ETag do /faces (senão o overlay congela).
        // Forçamos no-store e um cache-bust na query.
        const facesUrl = `${API_BASE_PUBLIC}/camera/${cameraId}/faces?escola_dir=${encodeURIComponent(
          escolaDir
        )}&_=${Date.now()}`;

        const resp = await fetch(facesUrl, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!resp.ok) return;

        const json = await resp.json();

        if (!json || !json.ok) return;

        // Normalização para manter o desenho original (x,y,w,h; aluno_nome; turma)
        const normFaces = Array.isArray(json.faces)
          ? json.faces.map((f) => {
              // aceita tanto {x,y,w,h} quanto {bbox:{x,y,width,height}} ou {bbox:{left,top,width,height}}
              const hasXYWH =
                Number.isFinite(f.x) &&
                Number.isFinite(f.y) &&
                Number.isFinite(f.w) &&
                Number.isFinite(f.h);

              const bbox = f.bbox || f.box || {};

              const x = hasXYWH
                ? f.x
                : (Number.isFinite(bbox.x) ? bbox.x : (Number.isFinite(bbox.left) ? bbox.left : 0));

              const y = hasXYWH
                ? f.y
                : (Number.isFinite(bbox.y) ? bbox.y : (Number.isFinite(bbox.top) ? bbox.top : 0));

              const w = hasXYWH
                ? f.w
                : (Number.isFinite(bbox.w) ? bbox.w : (Number.isFinite(bbox.width) ? bbox.width : 0));

              const h = hasXYWH
                ? f.h
                : (Number.isFinite(bbox.h) ? bbox.h : (Number.isFinite(bbox.height) ? bbox.height : 0));

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

    // garante que canvas == box do <img> (com DPR)
    syncCanvasToImageSize();

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    // limpar em CSS pixels (porque setTransform(dpr,...) já foi aplicado)
    const imgRect = imgEl.getBoundingClientRect();
    const containerW = Math.round(imgRect.width);
    const containerH = Math.round(imgRect.height);
    if (!containerW || !containerH) return;

    ctx.clearRect(0, 0, containerW, containerH);

    // object-contain: a imagem pode ficar com "barras" (letterbox).
    // Precisamos mapear bbox (facesData.width/height) -> área efetiva da imagem renderizada dentro do <img>.

    // Referência REAL do frame renderizado no <img>
    const naturalW = imgEl.naturalWidth || 0;
    const naturalH = imgEl.naturalHeight || 0;

    // Coordenadas do /faces (padrão: 1920x1080)
    const facesW = facesData.width || 0;
    const facesH = facesData.height || 0;

    // Nesta fase, o mapeamento deve ser 100% baseado no espaço do /faces (facesW/facesH),
    // e então convertido para a área renderizada (renderW/renderH + offsets).
    // Isso evita misturar naturalW/naturalH com heurísticas que “congelam” a bbox.
    const srcW = facesW || naturalW;
    const srcH = facesH || naturalH;

    if (!srcW || !srcH) return;

    const fitScale = Math.min(containerW / srcW, containerH / srcH);
    const renderW = srcW * fitScale;
    const renderH = srcH * fitScale;

    const offsetX = (containerW - renderW) / 2;
    const offsetY = (containerH - renderH) / 2;

    ctx.font = "16px sans-serif";
    ctx.lineWidth = 3;

    facesData.faces.forEach((face) => {
      const fx = Number(face.x) || 0;
      const fy = Number(face.y) || 0;
      const fw = Number(face.w) || 0;
      const fh = Number(face.h) || 0;

      const drawX = offsetX + fx * fitScale;
      const drawY = offsetY + fy * fitScale;
      const drawW = fw * fitScale;
      const drawH = fh * fitScale;



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

  // ----------------------------------------------------------------------------
  // Logs (DEV) — evitar spam em produção
  // Ative manualmente: localStorage.setItem("debug_monitoramento","1")
  // ----------------------------------------------------------------------------
  const debugRef = useRef({
    lastAt: 0,
    lastKey: "",
  });

  // Debug específico para validar letterbox (object-contain)
  // Ative manualmente: localStorage.setItem("debug_letterbox","1")
  const letterboxDebugRef = useRef({
    lastAt: 0,
    lastKey: "",
  });


  useEffect(() => {
    const DEBUG =
      (typeof window !== "undefined" &&
        window.localStorage &&
        window.localStorage.getItem("debug_monitoramento") === "1") ||
      false;

    if (!DEBUG) return;

    const now = Date.now();
    const key = `${cameraId}::${JSON.stringify(registros || [])}`;

    // throttle 5s + só loga se mudou
    if (debugRef.current.lastKey !== key && now - debugRef.current.lastAt > 5000) {
      debugRef.current.lastKey = key;
      debugRef.current.lastAt = now;
      console.log("[StreamCamera]", { cameraId, registrosCount: (registros || []).length });
    }
  }, [cameraId, registros]);

  // ----------------------------------------------------------------------------
  // Renderização visual
  // ----------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-xl shadow border border-blue-200 flex flex-col overflow-hidden">
      {/* área de vídeo */}
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-[180px] group">
        {/* imagem base (snapshot ou stream) */}
        <img
          key={`cam-${cameraId}-${modoAoVivo ? "live" : "snap"}`}
          ref={imgRef}
          src={imgSrc}
          alt={`Câmera ${cameraId}`}
          className={`w-full h-full transition-all duration-500 cursor-pointer object-contain`}
          onLoad={() => {
            syncCanvasToImageSize();

            // PRÉVIA: só agenda o próximo snapshot depois que este carregou
            if (!modoAoVivo && cameraId === 1) {
              if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
              snapTimerRef.current = setTimeout(() => {
                setSnapTick((t) => t + 1);
              }, 500);  // 500ms — rápido porque agora serve do disco (frame.jpg do worker)
            }
          }}
          onClick={() => {
            // ao mudar de modo, limpa timer da prévia imediatamente
            if (snapTimerRef.current) {
              clearTimeout(snapTimerRef.current);
              snapTimerRef.current = null;
            }
            setModoAoVivo((v) => !v);
          }}
        />

        {/* canvas overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />


        {/* botão flutuante */}
        <button
          type="button"
          onClick={() => setModoAoVivo((v) => !v)}
          className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-md shadow cursor-pointer opacity-80 hover:opacity-100"
          title={modoAoVivo ? "Clique para voltar para Prévia" : "Clique para ir AO VIVO"}
        >
          {modoAoVivo ? "AO VIVO" : "Prévia"}
        </button>
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
