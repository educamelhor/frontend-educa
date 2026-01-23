import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  CameraIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";

export default function HeaderGlobal() {
  // Estados para dados dinâmicos do usuário
  const [nomeEscola, setNomeEscola] = useState("");
  const [userName, setUserName] = useState("");
  const [perfil, setPerfil] = useState("");
  const [cpf, setCpf] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoVersion, setFotoVersion] = useState(Date.now()); // cache-bust no <img>
  const [fotoErro, setFotoErro] = useState(false); // quando true, usa fallback (iniciais)
  const [fotoRetries, setFotoRetries] = useState(0); // evita loop infinito de retry


  const navigate = useNavigate();

  // Modal de logout
  const [showModal, setShowModal] = useState(false);

  // Modal do avatar (editar foto)
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Editor (arrastar + zoom)
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 }); // px
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });

  // Tamanho do "viewport" do editor (círculo do preview) em px (h-32 w-32 => 128px)
  const PREVIEW_SIZE = 128;

  // Dimensões naturais da imagem carregada (para clamp preciso)
  const [cropImgSize, setCropImgSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const hydrateFromStorage = () => {
      const savedName = localStorage.getItem("userName") || "Usuário";
      const savedPerfil = (localStorage.getItem("perfil") || "aluno")
        .toLowerCase()
        .trim();
      const savedNomeEscola = localStorage.getItem("nome_escola") || "Escola não definida";
      const savedCpf = localStorage.getItem("cpf") || "";
      const savedFoto = localStorage.getItem("foto_url") || "";

      setUserName(savedName);
      setPerfil(savedPerfil);
      setNomeEscola(savedNomeEscola);
      setCpf(savedCpf);

      setFotoUrl(savedFoto);
      setFotoErro(false);
      setFotoVersion(Date.now());
    };

    const rehydrateFotoFromBackend = async () => {
      try {
        const token = localStorage.getItem("token");
        const escolaId = localStorage.getItem("escola_id");
        const savedPerfil = (localStorage.getItem("perfil") || "")
          .toLowerCase()
          .trim();

        // Só faz sentido para professor logado
        if (!token || !escolaId || savedPerfil !== "professor") return;

        const savedFoto = localStorage.getItem("foto_url") || "";
        if (savedFoto) return; // já tem foto em storage

        const resp = await fetch(`${API_BASE}/professores/me/foto`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-escola-id": escolaId,
          },
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) return;

        const foto = data?.foto_url || "";
        if (foto) {
          localStorage.setItem("foto_url", foto);
          setFotoUrl(foto);
          setFotoErro(false);
          setFotoVersion(Date.now());
        }
      } catch {
        // silencioso: não derruba header se a API estiver indisponível
      }
    };

    hydrateFromStorage();
    rehydrateFotoFromBackend();

    const onStorage = () => {
      hydrateFromStorage();
      rehydrateFotoFromBackend();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Sempre que a foto mudar, tente renderizar novamente (evita ficar preso nas iniciais)
  useEffect(() => {
    if (!fotoUrl) return;
    setFotoErro(false);
    setFotoRetries(0);
    setFotoVersion(Date.now());
  }, [fotoUrl]);


  /**
   * Confirmação de logout:
   * Remove dados do localStorage e redireciona para login.
   */
  const handleLogoutConfirm = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("perfil");
    localStorage.removeItem("nome_escola");
    localStorage.removeItem("escola_id");

    // ✅ novos campos do cabeçalho
    localStorage.removeItem("cpf");
    localStorage.removeItem("foto_url");

    navigate("/login");
  };


// Backend (API) — sempre normalizado para terminar com /api
const API_BASE = (() => {
  const envUrl =
    import.meta?.env?.VITE_API_BASE_URL ||
    import.meta?.env?.VITE_API_URL;

  const normalize = (url) => {
    let u = String(url || "").trim().replace(/\/+$/, "");
    if (!u) return "";
    if (!u.endsWith("/api")) u = `${u}/api`;
    return u;
  };

  const normalizedEnv = normalize(envUrl);
  if (normalizedEnv) return normalizedEnv;

  // fallback seguro: nunca usar localhost em produção
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal) return "http://localhost:3000/api";

  return "https://educa-backend-docker-659zo.ondigitalocean.app/api";
})();


// CDN público do DigitalOcean Spaces (uploads)
const UPLOADS_CDN = (() => {
  const raw =
    import.meta?.env?.VITE_UPLOADS_BASE_URL ||
    "https://educa-melhor-uploads.nyc3.cdn.digitaloceanspaces.com";

  // Normaliza para NÃO terminar com /uploads
  return String(raw).trim().replace(/\/+$/, "").replace(/\/uploads$/, "");
})();

  const toPublicUrl = (path) => {
    if (!path) return "";

    // já é URL absoluta
    if (path.startsWith("http://") || path.startsWith("https://")) return path;

    // ✅ /uploads/...:
    // - em localhost: servir do próprio backend (http://localhost:3000/uploads/...)
    // - em produção: servir do CDN do Spaces
    if (path.startsWith("/uploads/")) {
      const isLocal =
        API_BASE.includes("localhost") ||
        API_BASE.includes("127.0.0.1");

      // em localhost, sirva do backend (sem /api no meio)
      if (isLocal) return `${API_BASE.replace(/\/api$/, "")}${path}`;

      // 🔒 PRODUÇÃO:
      // sempre servir uploads pelo BACKEND,
      // pois o Space é privado e o CDN retorna AccessDenied
      return `${API_BASE.replace(/\/api$/, "")}${path}`;
    }

    // demais rotas relativas continuam apontando para o backend
    if (path.startsWith("/")) return `${API_BASE}${path}`;

    return `${API_BASE}/${path}`;
  };


  const resetEditor = () => {
    setCropScale(1);
    setCropOffset({ x: 0, y: 0 });
    setIsPanning(false);
  };

  // Impede que a imagem "vaze" do círculo: limita offset com base no cover + scale
  const clampCropOffset = (offset) => {
    const w = cropImgSize?.w || 0;
    const h = cropImgSize?.h || 0;
    if (!w || !h) return offset;

    const box = PREVIEW_SIZE;
    const s = cropScale || 1;

    const imgAR = w / h;
    const boxAR = 1;

    // Base "cover" dentro do box (antes do scale)
    let baseW, baseH;
    if (imgAR > boxAR) {
      baseH = box;
      baseW = box * imgAR;
    } else {
      baseW = box;
      baseH = box / imgAR;
    }

    const scaledW = baseW * s;
    const scaledH = baseH * s;

    // quanto sobra para mover sem mostrar "vazio"
    const maxX = Math.max(0, (scaledW - box) / 2);
    const maxY = Math.max(0, (scaledH - box) / 2);

    const x = Math.min(maxX, Math.max(-maxX, offset.x));
    const y = Math.min(maxY, Math.max(-maxY, offset.y));

    return { x, y };
  };

  // Reclamp ao mudar zoom ou ao carregar uma nova imagem
  useEffect(() => {
    setCropOffset((prev) => clampCropOffset(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropScale, cropImgSize.w, cropImgSize.h]);


  // Gera um arquivo 512x512 (quadrado) a partir do editor (pan/zoom)
  const buildCroppedFile = async ({
    imageSrc,
    outSize = 512,
    containerSize = 224, // tamanho do "viewport" no modal
    offset,
    scale,
    mime = "image/jpeg",
    quality = 0.9,
  }) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = outSize;
          canvas.height = outSize;
          const ctx = canvas.getContext("2d");

          // Preenche fundo (branco) para evitar transparência no JPG
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, outSize, outSize);

          // Mapeamento: container (viewport) -> canvas
          // No container, a imagem é desenhada centralizada e transformada por:
          // translate(offset) + scale(scale). Vamos reproduzir isso no canvas.
          const s = scale || 1;

          // imagem base ajustada para cobrir o container (object-cover)
          const imgAR = img.width / img.height;
          const boxAR = 1; // container quadrado

          let baseW, baseH;
          if (imgAR > boxAR) {
            // imagem mais "larga": altura cobre o box
            baseH = containerSize;
            baseW = containerSize * imgAR;
          } else {
            // imagem mais "alta": largura cobre o box
            baseW = containerSize;
            baseH = containerSize / imgAR;
          }

          // Centro do container
          const cx = containerSize / 2;
          const cy = containerSize / 2;

          // No container: (0,0) é topo-esquerda. A imagem fica centrada:
          const imgLeft = cx - baseW / 2;
          const imgTop = cy - baseH / 2;

          // Após scale e offset:
          // - scale escala a imagem a partir do centro do container (como transform-origin center)
          // - offset move a imagem em px
          //
          // Implementação: desenhar no canvas usando a mesma lógica
          // Convertendo coordenadas do container para canvas:
          const k = outSize / containerSize;

          // Primeiro, transformamos o contexto para o sistema do container escalado para o canvas
          ctx.save();
          ctx.scale(k, k);

          // Aplicar transformação no centro do container
          ctx.translate(cx + offset.x, cy + offset.y);
          ctx.scale(s, s);
          ctx.translate(-cx, -cy);

          // Desenhar imagem na posição base (centrada/cover)
          ctx.drawImage(img, imgLeft, imgTop, baseW, baseH);

          ctx.restore();

          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Falha ao gerar imagem final."));
              const file = new File([blob], `perfil_${Date.now()}.jpg`, { type: mime });
              resolve(file);
            },
            mime,
            quality
          );
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("Falha ao carregar a imagem para edição."));
      img.src = imageSrc;
    });
  };


  /**
   * Gera as iniciais do nome para o avatar
   */
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ────────────────────────────────────────────────
  // Upload real para o backend (multi-escola)
  // Endpoint: POST /api/professores/me/foto
  // Body: form-data (key: "foto")
  // Retorno esperado: { foto_url: "/uploads/<apelido>/professores/<id>.jpg" }
  // ────────────────────────────────────────────────
  const uploadFotoPerfil = async (file) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");

    const escolaId = localStorage.getItem("escola_id");
    if (!escolaId) throw new Error("Escola não definida. Faça login novamente.");

    const form = new FormData();
    form.append("foto", file);

    const resp = await fetch(`${API_BASE}/professores/me/foto`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-escola-id": escolaId,
      },
      body: form,
    });


    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg = data?.message || "Falha ao enviar a foto.";
      throw new Error(msg);
    }

    if (!data?.foto_url) {
      throw new Error("Backend não retornou foto_url.");
    }

    return data.foto_url;
  };


  return (
    <div className="w-full px-8 py-5 bg-gradient-to-r from-blue-50 to-white shadow-md rounded-lg dark:from-gray-900 dark:to-gray-800 dark:shadow-lg flex justify-between items-center relative">
      {/* Nome da Escola (dinâmico) */}
      <h1
        className="text-4xl tracking-tight text-blue-900 dark:text-white"
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
        }}
      >
        {nomeEscola}
      </h1>

      {/* Área do usuário */}
      <div className="flex items-center gap-4">
        {/* Avatar (foto real + fallback) */}
        <button
          type="button"
          onClick={() => {
            setAvatarMsg("");
            setAvatarFile(null);
            setAvatarPreview("");
            setFotoErro(false);

            // ✅ garante que o modal não pegue imagem antiga do cache
            setFotoVersion(Date.now());

            resetEditor();
            setShowAvatarModal(true);
          }}
          className="group relative h-11 w-11 rounded-full p-[2px] bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 shadow-md hover:shadow-lg transition"
          title="Editar foto do perfil"
        >
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
            {fotoUrl && !fotoErro ? (
              <img
                key={`${fotoUrl}-${fotoVersion}`}   // ✅ força React remontar e recarregar a imagem
                src={`${toPublicUrl(fotoUrl)}?v=${fotoVersion}`}
                alt="Foto do usuário"
                className="h-full w-full object-cover"
                onLoad={() => {
                  setFotoErro(false);
                  setFotoRetries(0);
                }}
                onError={() => {
                  setFotoRetries((r) => {
                    const next = r + 1;
                    if (next <= 2) {
                      setFotoVersion(Date.now());
                      return next;
                    }
                    setFotoErro(true);
                    return next;
                  });
                }}
              />
            ) : (
              <div className="h-full w-full bg-blue-600 text-white flex items-center justify-center font-semibold text-base">
                {getInitials(userName)}
              </div>
            )}
          </div>

          {/* Badge (toque moderno) */}
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center shadow">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
          </span>

          {/* Ícone no hover */}
          <span className="pointer-events-none absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition"></span>
          <span className="pointer-events-none absolute bottom-0.5 right-0.5 hidden group-hover:flex items-center justify-center h-6 w-6 rounded-full bg-white/95 shadow">
            <PencilSquareIcon className="h-4 w-4 text-gray-700" />
          </span>
        </button>


        {/* Nome e perfil */}
        <span className="text-blue-900 font-semibold">
          {userName} <span className="text-sm text-gray-600">({perfil})</span>
        </span>

        {/* Botão de sair */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sair
        </button>
      </div>

      {/* Modal de confirmação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 transform scale-95 animate-scaleUp">
            <h2 className="text-xl font-bold text-gray-800 mb-3 text-center">
              Confirmar Logout
            </h2>
            <p className="text-gray-600 text-center mb-5">
              Tem certeza que deseja sair da sua conta?
            </p>
            <div className="flex justify-around">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Avatar (editar/trocar foto) */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAvatarModal(false)}
          />

          <div className="relative z-10 w-[520px] max-w-[92vw] rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header do modal */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-white border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow">
                  <CameraIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Foto do perfil</h3>
                  <p className="text-sm text-gray-600">
                    {userName} {cpf ? <span className="text-gray-400">• CPF {cpf}</span> : null}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="h-9 w-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition"
                onClick={() => setShowAvatarModal(false)}
                title="Fechar"
              >
                <XMarkIcon className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {/* Corpo */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preview */}
              <div className="flex flex-col items-center justify-center">
                <div className="h-32 w-32 rounded-full p-[3px] bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 shadow-lg">
                  <div className="h-full w-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                    {avatarPreview || fotoUrl ? (
                      <div className="h-full w-full relative overflow-hidden select-none touch-none">





                        <img
                          src={
                            avatarPreview
                              ? avatarPreview
                              : `${toPublicUrl(fotoUrl)}?v=${fotoVersion}`
                          }
                          alt="Preview"
                          className={`absolute left-1/2 top-1/2 will-change-transform ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
                          style={{
                            transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropScale})`,
                            transformOrigin: "center",
                            minWidth: "100%",
                            minHeight: "100%",
                          }}
                          draggable={false}
                          onLoad={(e) => {
                            const nw = e.currentTarget.naturalWidth || 0;
                            const nh = e.currentTarget.naturalHeight || 0;
                            setCropImgSize({ w: nw, h: nh });
                          }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.currentTarget.setPointerCapture?.(e.pointerId);
                            setIsPanning(true);
                            setPanStart({ x: e.clientX, y: e.clientY });
                            setCropStart({ x: cropOffset.x, y: cropOffset.y });
                          }}
                          onPointerMove={(e) => {
                            if (!isPanning) return;
                            const dx = e.clientX - panStart.x;
                            const dy = e.clientY - panStart.y;

                            const next = { x: cropStart.x + dx, y: cropStart.y + dy };
                            setCropOffset(clampCropOffset(next));
                          }}
                          onPointerUp={(e) => {
                            e.currentTarget.releasePointerCapture?.(e.pointerId);
                            setIsPanning(false);
                          }}
                          onPointerCancel={(e) => {
                            e.currentTarget.releasePointerCapture?.(e.pointerId);
                            setIsPanning(false);
                          }}
                        />
                      </div>
                    ) : (

                      <div className="h-full w-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl">
                        {getInitials(userName)}
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-500 text-center">
                  Dica: escolha uma foto bem iluminada e centralizada.
                </p>
              </div>
              {/* Dropzone / ações */}
              <div className="flex flex-col gap-3">
                <div
                  className={[
                    "rounded-2xl border-2 border-dashed p-4 transition",
                    dragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50",
                  ].join(" ")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer?.files?.[0];
                    if (!f) return;
                    setAvatarMsg("");
                    setAvatarFile(f);
                    setAvatarPreview(URL.createObjectURL(f));
                    resetEditor();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white shadow flex items-center justify-center">
                      <PencilSquareIcon className="h-5 w-5 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        Arraste e solte uma imagem aqui
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG. Recomendado: 512x512.</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer">
                      <CameraIcon className="h-5 w-5" />
                      Escolher arquivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setAvatarMsg("");
                          setAvatarFile(f);
                          setAvatarPreview(URL.createObjectURL(f));
                          resetEditor();
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Controles do editor */}
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Ajustar</span>
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                      onClick={resetEditor}
                    >
                      Centralizar
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs text-gray-500">Zoom</label>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.01"
                      value={cropScale}
                      onChange={(e) => setCropScale(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Dica: arraste a imagem para posicionar.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition font-semibold text-gray-800"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview("");
                      setAvatarMsg("");
                      resetEditor();
                    }}
                  >
                    <TrashIcon className="h-5 w-5 text-gray-600" />
                    Limpar
                  </button>

                  <button
                    type="button"
                    disabled={
                      avatarSaving ||
                      !(avatarPreview || fotoUrl) ||
                      !(avatarFile || cropScale !== 1 || cropOffset.x !== 0 || cropOffset.y !== 0)
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={async () => {
                      setAvatarSaving(true);
                      setAvatarMsg("");

                      try {
                        const imageSrc = avatarPreview
                          ? avatarPreview
                          : `${toPublicUrl(fotoUrl)}?v=${fotoVersion}`;


                        // Sempre gera o arquivo final (512x512) respeitando pan/zoom
                        const fileFinal = await buildCroppedFile({
                          imageSrc,
                          outSize: 512,
                          containerSize: 128, // o círculo do preview tem 128x128
                          offset: cropOffset,
                          scale: cropScale,
                          mime: "image/jpeg",
                          quality: 0.9,
                        });

                        const fotoUrlReal = await uploadFotoPerfil(fileFinal);

                        // ✅ Persistência correta + refresh imediato (sem depender de F5)
                        localStorage.setItem("foto_url", fotoUrlReal);

                        // força uma “troca real” de estado para o React remontar o <img>
                        setFotoErro(false);
                        setFotoRetries(0);
                        setFotoVersion(Date.now());

                        // limpa e repõe no próximo frame (evita ficar preso em cache/ETag/CDN)
                        setFotoUrl("");
                        requestAnimationFrame(() => setFotoUrl(fotoUrlReal));


                        // limpa estado do modal
                        setAvatarFile(null);
                        setAvatarPreview("");
                        resetEditor();

                        setAvatarMsg("Foto atualizada com sucesso.");
                        setTimeout(() => setShowAvatarModal(false), 500);
                      } catch (e) {
                        setAvatarMsg(e?.message || "Falha ao enviar a foto.");
                      } finally {
                        setAvatarSaving(false);
                      }
                    }}
                  >
                    {avatarSaving ? "Enviando..." : "Salvar"}
                  </button>
                </div>

                {avatarMsg && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    {avatarMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-white flex items-center justify-between">

              <p className="text-xs text-gray-500">
                Upload conectado: a foto é salva no backend e a URL real é refletida no cabeçalho.
              </p>

              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition font-semibold text-gray-800"
                onClick={() => setShowAvatarModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
