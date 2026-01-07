// ============================================================================
// VisitantesRegistrar.jsx
// Registrar entrada de VISITANTE (não-aluno)
// E.6.2 (UI funcional) + E.6.3 (ajuste backend real) + E.6.5.1 (webcam - front)
// + E.6.5.2 (enviar foto_base64 no POST quando houver captura)
// - Mantém o layout aprovado (E.6.1)
// - SUBMIT real: POST /api/monitoramento/visitantes (JSON)
// - Usa token do localStorage e envia x-escola-id
// - Validação leve + feedback visual (toasts)
// - Webcam: getUserMedia (captura base64 em fotoDataUrl)
// - E.6.5.2: inclui foto_base64 no payload apenas se fotoDataUrl existir
//   (prioridade sobre upload). Não alteramos a forma de upload nesta etapa.
// + CPF: máscara, validação (dígitos verificadores) e auto-busca por documento
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const CATEGORIAS = [
  { key: "RESPONSAVEL", label: "Responsável de Aluno", tone: "indigo" },
  { key: "ENTREGA", label: "Entrega / Fornecedor", tone: "amber" },
  { key: "PRESTADOR", label: "Prestador de Serviço", tone: "cyan" },
  // Alterado: botão "Outro" agora usa laranja (clarinho desativado / escuro ativo)
  { key: "OUTRO", label: "Outro", tone: "orange" },
];

const PORTOES = [
  { key: "PRINCIPAL", label: "Portão Principal" },
  { key: "LATERAL", label: "Portão Lateral" },
  { key: "CARGA", label: "Portão de Carga" },
];

// Pequenos helpers visuais para toast
function Toast({ kind = "ok", title, message, onClose }) {
  const bg =
    kind === "ok"
      ? "bg-green-100 border-green-300 text-green-800"
      : "bg-red-100 border-red-300 text-red-800";
  return (
    <div
      className={`fixed right-4 bottom-4 max-w-md border rounded-lg shadow-lg ${bg} p-3 z-50`}
    >
      <div className="font-semibold">{title}</div>
      {message && <div className="text-sm mt-0.5">{message}</div>}
      <button onClick={onClose} className="mt-2 text-xs underline">
        Fechar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tailwind: classes literais (evita purge com templates dinâmicos)
// ---------------------------------------------------------------------------
function toneClasses(tone, active) {
  const map = {
    indigo: {
      on: "bg-indigo-600 border-indigo-700 text-white",
      off: "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100",
    },
    amber: {
      on: "bg-amber-600 border-amber-700 text-white",
      off: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    },
    cyan: {
      on: "bg-cyan-600 border-cyan-700 text-white",
      off: "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
    },
    orange: {
      on: "bg-orange-600 border-orange-700 text-white",
      off: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
    },
  };
  const palette = map[tone] || map.indigo;
  return active ? palette.on : palette.off;
}

// ---------------------------------------------------------------------------
// CPF — máscara, validação e normalização
// ---------------------------------------------------------------------------
function apenasNumeros(v = "") {
  return String(v).replace(/\D/g, "");
}
function formatarCPF(value) {
  return apenasNumeros(value)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .substring(0, 14);
}
function validarCPF(cpfComMascara = "") {
  const cpf = apenasNumeros(cpfComMascara);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[10])) return false;
  return true;
}

export default function VisitantesRegistrar() {
  const navigate = useNavigate();

  // Relógio simples no cabeçalho
  const [agora, setAgora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(agora.getHours()).padStart(2, "0");
  const mm = String(agora.getMinutes()).padStart(2, "0");
  const ss = String(agora.getSeconds()).padStart(2, "0");
  const dd = String(agora.getDate()).padStart(2, "0");
  const mo = String(agora.getMonth() + 1).padStart(2, "0");
  const yy = agora.getFullYear();

  // Form state
  const [categoria, setCategoria] = useState("RESPONSAVEL");
  const [motivo, setMotivo] = useState("Responsável do aluno");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState(""); // CPF (com máscara)
  const [cpfValido, setCpfValido] = useState(null); // null | true | false
  const [empresa, setEmpresa] = useState("");
  const [alunoCodigo, setAlunoCodigo] = useState("");
  const [autorizador, setAutorizador] = useState("");
  const [portao, setPortao] = useState("PRINCIPAL");
  const [observacoes, setObservacoes] = useState("");

  // Foto via upload de arquivo (mantido)
  const [fotoFile, setFotoFile] = useState(null); // ignorado no submit desta etapa

  // ------------------ E.6.5.1 — Infra da Webcam (front) ------------------
  const [webcamOn, setWebcamOn] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [fotoDataUrl, setFotoDataUrl] = useState(null); // base64 da captura
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  async function ligarWebcam() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      setWebcamOn(true);
      setFotoDataUrl(null);

      await new Promise((r) => requestAnimationFrame(r));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (!videoRef.current) throw new Error("Elemento de vídeo indisponível");

      videoRef.current.setAttribute("playsinline", "");
      videoRef.current.setAttribute("autoplay", "");
      videoRef.current.muted = true;

      videoRef.current.srcObject = null;
      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve) => {
        const v = videoRef.current;
        if (!v) return resolve();
        if (v.readyState >= 1) return resolve();
        const onLoaded = () => {
          v.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        v.addEventListener("loadedmetadata", onLoaded);
      });

      try {
        await videoRef.current.play();
      } catch {}

      setTimeout(async () => {
        const v = videoRef.current;
        if (v && (!v.videoWidth || !v.videoHeight)) {
          v.srcObject = null;
          v.srcObject = streamRef.current;
          try {
            await v.play();
          } catch {}
        }
      }, 800);
    } catch (err) {
      console.error("Webcam erro:", err);
      alert("Não foi possível acessar a webcam. Verifique permissões do navegador.");
      setWebcamOn(false);
    }
  }

  function desligarWebcam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamOn(false);
    setCapturando(false);
  }

  function capturarFoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setFotoDataUrl(dataUrl);
    setCapturando(false);
  }

  function refazerFoto() {
    setFotoDataUrl(null);
    setCapturando(false);
  }

  useEffect(() => {
    return () => desligarWebcam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ------------------ /E.6.5.1 — Infra da Webcam -------------------------

  // UX
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState(null);
  const nomeRef = useRef(null);

  useEffect(() => {
    nomeRef.current?.focus();
  }, []);

  function aplicarAtalho(catKey) {
    setCategoria(catKey);
    if (catKey === "RESPONSAVEL") setMotivo("Responsável do aluno");
    else if (catKey === "ENTREGA") setMotivo("Entrega de insumo");
    else if (catKey === "PRESTADOR") setMotivo("Serviço contratado");
    else setMotivo("Visita institucional");
  }

  function limparParcialAposSucesso() {
    setNome("");
    setDocumento("");
    setCpfValido(null);
    setEmpresa("");
    setAlunoCodigo("");
    setAutorizador("");
    setObservacoes("");
    setFotoFile(null);
    setFotoDataUrl(null);
    setTimeout(() => nomeRef.current?.focus(), 0);
  }

  function limparTotal() {
    setCategoria("RESPONSAVEL");
    setMotivo("Responsável do aluno");
    setPortao("PRINCIPAL");
    limparParcialAposSucesso();
  }

  // Atalho Alt+R para enviar
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, motivo, categoria, portao, documento, empresa, alunoCodigo, autorizador, observacoes, fotoDataUrl]);

  // -----------------------------------------------------------------------
  // E.6.x — CPF: máscara + validação + auto-busca do visitante
  // -----------------------------------------------------------------------
  // Aplica máscara conforme digitação e valida
  function onChangeCPF(e) {
    const mascarado = formatarCPF(e.target.value);
    setDocumento(mascarado);
    const ok = validarCPF(mascarado);
    setCpfValido(mascarado.length >= 14 ? ok : null);
  }

  // Se CPF válido (11 dígitos), busca visitante e preenche nome
  useEffect(() => {
    async function buscarPorCPF() {
      const cpf = apenasNumeros(documento);
      if (cpf.length !== 11) return;
      if (!validarCPF(documento)) return;

      try {
        const token =
          localStorage.getItem("token") || localStorage.getItem("anju.token") || "";
        const escola_id =
          localStorage.getItem("escola_id") || localStorage.getItem("escolaId") || "";

        // Endpoint sugerido para consulta por documento (ajuste se seu back usar outro path)
        const res = await fetch(`/api/monitoramento/visitantes/por-documento/${cpf}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(escola_id ? { "x-escola-id": escola_id } : {}),
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.nome) {
            setNome(data.nome);
            setToast({
              kind: "ok",
              title: "Visitante localizado",
              message: `Nome preenchido automaticamente: ${data.nome}`,
            });
          }
        }
      } catch (err) {
        // silencioso: não bloqueia o registro
        console.warn("Erro ao consultar visitante por CPF:", err);
      }
    }
    buscarPorCPF();
  }, [documento]);

  // -----------------------------------------------------------------------
  async function handleSubmit(e) {
    e?.preventDefault?.();

    // Validação leve
    if (!documento.trim()) {
      setToast({ kind: "err", title: "Informe o CPF do visitante." });
      return;
    }
    if (!validarCPF(documento)) {
      setToast({ kind: "err", title: "CPF inválido. Verifique e tente novamente." });
      return;
    }
    if (!nome.trim()) {
      setToast({ kind: "err", title: "Informe o nome do visitante." });
      nomeRef.current?.focus();
      return;
    }
    if (!motivo.trim()) {
      setToast({ kind: "err", title: "Informe o motivo da visita." });
      return;
    }
    if (!categoria) {
      setToast({ kind: "err", title: "Selecione a categoria." });
      return;
    }
    if (!portao) {
      setToast({ kind: "err", title: "Selecione o portão de entrada." });
      return;
    }

    const token =
      localStorage.getItem("token") || localStorage.getItem("anju.token") || "";
    const escola_id =
      localStorage.getItem("escola_id") ||
      localStorage.getItem("escolaId") ||
      "";

    // ------------------ E.6.5.2 — monta payload com foto_base64, se houver
    const payload = {
      nome: nome.trim(),
      documento: documento.trim(), // CPF com máscara; o backend pode normalizar se desejar
      empresa: empresa.trim() || null,
      categoria,
      motivo: motivo.trim(),
      aluno_codigo: alunoCodigo.trim() || null,
      autorizador: autorizador.trim() || null,
      portao,
      observacao: observacoes.trim() || null, // ⚠️ backend usa 'observacao'
      fotoUrl: null, // mantido p/ compatibilidade; backend pode ignorar
      escola_id: escola_id ? Number(escola_id) : undefined,
    };

    // Prioriza foto capturada (webcam). Se existir, enviamos como foto_base64.
    if (fotoDataUrl) {
      payload.foto_base64 = fotoDataUrl; // <— chave desta etapa
    }
    // ------------------ /E.6.5.2 -------------------------------------------

    setEnviando(true);
    try {
      const resp = await fetch("/api/monitoramento/visitantes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(escola_id ? { "x-escola-id": escola_id } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(resp);

      if (!resp.ok) {
        // Tratamento amigável para duplicidade (quando o DB estiver com UNIQUE)
        const raw = (data?.message || data?.error || "").toLowerCase();
        if (resp.status === 409 || raw.includes("duplicate") || raw.includes("único")) {
          throw new Error("CPF já cadastrado como visitante. Evite duplicar o cadastro.");
        }
        const msg =
          data?.message ||
          data?.error ||
          `Falha ao registrar (HTTP ${resp.status})`;
        throw new Error(msg);
      }

      // Sucesso (backend retorna { message, id })
      setToast({
        kind: "ok",
        title: data?.message || "Visitante registrado com sucesso.",
        message: data?.id ? `Protocolo #${data.id}` : undefined,
      });

      limparParcialAposSucesso();
    } catch (err) {
      setToast({
        kind: "err",
        title: "Não foi possível registrar a entrada.",
        message: String(err?.message || err || "Erro desconhecido"),
      });
    } finally {
      setEnviando(false);
    }
  }

  // =======================================================================
  // Render
  // =======================================================================
  return (
    <div className="flex flex-col flex-1 bg-blue-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
            Registrar Visitante
          </h1>
          <p className="text-sm text-blue-900/70 mt-1">
            Preencha os dados abaixo para registrar a entrada do visitante.
          </p>
        </div>
        <div className="text-right text-sm text-blue-900/80">
          {dd}/{mo}/{yy} • {hh}:{mm}:{ss}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-6 pb-10">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow border p-6">
          {/* Ações rápidas */}
          <div className="mb-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Atalhos de Categoria
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => aplicarAtalho(c.key)}
                  className={
                    `px-3 py-1.5 rounded-full border shadow-sm text-sm transition ` +
                    toneClasses(c.tone, categoria === c.key)
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Categoria/Motivo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo da visita
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex.: Entrega de insumo / Reunião com coordenação / ..."
                />
              </div>
            </div>

            {/* Nome/Documento/Empresa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  ref={nomeRef}
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Fulano de Tal"
                />
              </div>

              {/* CPF (Documento) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documento (CPF)
                </label>
                <input
                  type="text"
                  value={documento}
                  onChange={onChangeCPF}
                  className={`w-full rounded-lg px-3 py-2 border ${
                    documento
                      ? cpfValido === true
                        ? "border-green-400 focus:ring-2 focus:ring-green-200"
                        : cpfValido === false
                        ? "border-red-300 focus:ring-2 focus:ring-red-200"
                        : "border-gray-300"
                      : "border-gray-300"
                  }`}
                  placeholder="xxx.xxx.xxx-xx"
                />
                {documento && (
                  <div className="mt-1 text-xs">
                    {cpfValido === true && (
                      <span className="text-green-600">CPF válido</span>
                    )}
                    {cpfValido === false && (
                      <span className="text-red-600">CPF inválido</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa/Órgão
                </label>
                <input
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex.: Correios / SEDUC / —"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Associar a Aluno (opcional) — código
                </label>
                <input
                  type="text"
                  value={alunoCodigo}
                  onChange={(e) => setAlunoCodigo(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex.: 729539"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quem autorizou
                </label>
                <input
                  type="text"
                  value={autorizador}
                  onChange={(e) => setAutorizador(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Coordenação / Direção / Sec. Escolar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entrada por
                </label>
                <select
                  value={portao}
                  onChange={(e) => setPortao(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                >
                  {PORTOES.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Observações + Foto (upload) + Webcam */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Observações */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  rows={4}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Observações relevantes (opcional)"
                />
              </div>

              {/* Coluna Foto: Upload + Webcam */}
              <div className="space-y-4">
                {/* Upload de arquivo (mantido) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Foto (opcional) — Upload
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                  {fotoFile && (
                    <div className="mt-2 text-xs text-gray-600">
                      Selecionado:{" "}
                      <span className="font-medium">{fotoFile.name}</span>
                    </div>
                  )}
                </div>

                {/* Webcam (E.6.5.1) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Webcam (opcional)
                    </label>
                    <div className="flex gap-2">
                      {!webcamOn ? (
                        <button
                          type="button"
                          onClick={ligarWebcam}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                          title="Ativar webcam"
                        >
                          Ligar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={desligarWebcam}
                          className="px-3 py-1.5 rounded-lg bg-white border hover:bg-gray-50"
                          title="Desligar webcam"
                        >
                          Desligar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Área de vídeo / preview */}
                  <div className="mt-2 border rounded-lg overflow-hidden bg-black/5">
                    {/* Vídeo ao vivo */}
                    <div
                      className={`${webcamOn && !fotoDataUrl ? "" : "hidden"} relative`}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full bg-black rounded-md"
                        style={{ transform: "scaleX(-1)" }}
                      />
                      <div className="absolute bottom-2 left-2 flex gap-2">
                        {!capturando ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCapturando(true);
                              setTimeout(() => capturarFoto(), 120);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                            title="Capturar foto"
                          >
                            Capturar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-gray-300 text-gray-700 cursor-not-allowed"
                            disabled
                          >
                            Capturando…
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview da imagem capturada */}
                    {fotoDataUrl && (
                      <div className="p-2">
                        <img
                          src={fotoDataUrl}
                          alt="Foto capturada"
                          className="w-full rounded-md border"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={refazerFoto}
                            className="px-3 py-1.5 rounded-lg bg-white border hover:bg-gray-50"
                          >
                            Refazer
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              alert(
                                "Captura pronta. Nesta etapa (E.6.5.2) o POST já envia foto_base64 quando houver captura."
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Apenas demonstra que a captura está pronta/valida"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Canvas oculto (snapshot) */}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* Dica */}
                  <p className="mt-2 text-xs text-gray-500">
                    Dica: posicione o rosto no centro. Quando houver captura, o
                    campo <code>foto_base64</code> é incluído automaticamente no
                    envio (prioridade sobre upload).
                  </p>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={enviando}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-60"
                title="Alt+R para enviar rapidamente"
              >
                {enviando ? "Registrando..." : "Registrar entrada"}
              </button>
              <button
                type="button"
                onClick={limparTotal}
                className="px-4 py-2 rounded-lg bg-white border shadow hover:bg-gray-50"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => navigate("/monitoramento")}
                className="ml-auto px-4 py-2 rounded-lg bg-white border shadow hover:bg-gray-50"
              >
                Voltar
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <Toast
          kind={toast.kind}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// -------------------------- helpers --------------------------
async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}
