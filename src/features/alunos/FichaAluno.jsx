// src/features/alunos/FichaAluno.jsx
// Design premium — mesma aparência em todos os módulos (Disciplinar, Secretaria, etc.)
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { Button } from "../../components/ui/Button";
import * as faceapi from "face-api.js";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import ModalRelatorioDisciplinar from "./ModalRelatorioDisciplinar";
import ModalRelatorioPedagogico from "./ModalRelatorioPedagogico";

/* =========================================================
   FICHA DO ESTUDANTE — Design Premium
   - Abre via rota ou via modal (prop `codigo`)
   - Permite escolher pasta com fotos (nome=CODIGO) e faz:
     leitura → detecção facial → recorte → upload → refresh
   ========================================================= */

export default function FichaAluno({ codigo: codigoProp }) {
  const { codigo: codigoParam } = useParams();
  const codigo = codigoProp || codigoParam;
  const isModal = Boolean(codigoProp);
  const navigate = useNavigate();
  const location = useLocation();
  const isDisciplinar = location.pathname.includes("/disciplinar");
  const isProfessor = String(localStorage.getItem('perfil') || '').toLowerCase().trim() === 'professor';

  const [aluno, setAluno] = useState(null);
  const [erro, setErro] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);
  const [modalPedagogicoOpen, setModalPedagogicoOpen] = useState(false);
  const [ocorrenciasCount, setOcorrenciasCount] = useState(null);

  const isUploadingRef = useRef(false);
  const retryOnceRef = useRef(false);

  const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");
  const buildFotoURL = (path) => {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `${apiBase}${path}`;
  };

  const formatDate = (value) => {
    if (!value) return "—";
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const [y, m, d] = value.split("-");
        return `${d}/${m}/${y}`;
      }
      const d = new Date(value);
      const s = d.toLocaleDateString();
      return s && s !== "Invalid Date" ? s : "—";
    } catch {
      return "—";
    }
  };

  // Iniciais para avatar
  const getInitials = (nome) => {
    if (!nome) return "?";
    const parts = nome.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
    return () => { alive = false; };
  }, [codigo]);

  // Buscar contagem de ocorrências disciplinares
  useEffect(() => {
    if (!aluno?.id) return;
    api.get(`/api/alunos/${aluno.id}/ocorrencias`)
      .then(res => {
        const lista = Array.isArray(res.data) ? res.data : [];
        const ativas = lista.filter(o => o.status !== 'CANCELADA');
        setOcorrenciasCount(ativas.length);
      })
      .catch(() => setOcorrenciasCount(0));
  }, [aluno?.id]);

  // ── Upload de foto ──────────────────────────────────────────
  const handleFolderSelect = async (e) => {
    if (isUploadingRef.current) return;
    const files = Array.from(e.target.files || []);
    if (!files.length || !aluno) return;
    const codigoStr = String(aluno.codigo);
    const exts = /\.(jpe?g|png|webp|jfif)$/i;
    const match = files.find(f => {
      const base = f.name.replace(/\.[^.]+$/, "");
      return base === codigoStr && exts.test(f.name);
    });
    if (!match) {
      setFeedback({ tipo: "erro", mensagem: `Nenhuma foto com o nome "${codigoStr}" encontrada na pasta.` });
      return;
    }
    isUploadingRef.current = true;
    setFeedback(null);
    await processAndUpload(match);
    isUploadingRef.current = false;
  };

  const processAndUpload = async (arquivoFonte) => {
    setUploading(true);
    try {
      const objectURL = URL.createObjectURL(arquivoFonte);
      const imgEl = document.createElement("img");
      imgEl.src = objectURL;
      await new Promise((resolve, reject) => {
        imgEl.onload = resolve;
        imgEl.onerror = reject;
      });
      URL.revokeObjectURL(objectURL);

      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      } catch {}

      let detection;
      try {
        const canvasTemp = faceapi.createCanvasFromMedia(imgEl);
        detection = await faceapi.detectSingleFace(canvasTemp, new faceapi.TinyFaceDetectorOptions());
      } catch {}

      let fileParaUpload = arquivoFonte;
      if (detection) {
        const box = detection.box;
        const MARGEM = 0.1;
        const x1 = Math.max(0, box.x - box.width * MARGEM);
        const y1 = Math.max(0, box.y - box.height * MARGEM);
        const x2 = Math.min(imgEl.width, box.x + box.width * (1 + MARGEM));
        const y2 = Math.min(imgEl.height, box.y + box.height * (1 + MARGEM));
        try {
          const canvas = document.createElement("canvas");
          canvas.width = x2 - x1;
          canvas.height = y2 - y1;
          canvas.getContext("2d").drawImage(imgEl, x1, y1, x2 - x1, y2 - y1, 0, 0, x2 - x1, y2 - y1);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
          if (blob) fileParaUpload = new File([blob], `${aluno.codigo}.jpg`, { type: "image/jpeg" });
        } catch {}
      }

      await uploadFile(fileParaUpload);
    } catch (err) {
      console.error("Erro ao processar foto:", err);
      setFeedback({ tipo: "erro", mensagem: "Erro ao processar a imagem." });
      setUploading(false);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("foto", file);
      const resp = await api.post(`/api/alunos/${codigo}/foto`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const base = resp?.data?.foto ?? resp?.data?.url ?? resp?.data?.path ?? resp?.data?.caminho ?? "";
      const baseURL = buildFotoURL(base);
      const novaPath = baseURL ? `${baseURL}${baseURL.includes("?") ? "&" : "?"}t=${Date.now()}` : "";
      retryOnceRef.current = false;
      setAluno(old => ({ ...(old || {}), foto: novaPath }));
      setFeedback({ tipo: "sucesso", mensagem: "Foto atualizada com sucesso!" });
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: "Falha no upload da foto." });
    } finally {
      setUploading(false);
    }
  };

  // ── PLACEHOLDER SVG ──────────────────────────────────────────
  const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='100%' height='100%' rx='64' ry='64' fill='#e5e7eb'/></svg>`
  );

  // ── LOADING ─────────────────────────────────────────────────
  if (!aluno && !erro) {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: isModal ? 200 : '100vh' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#1e3a5f', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>Carregando dados do aluno…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── ERRO ─────────────────────────────────────────────────────
  if (erro) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#dc2626' }}>{erro}</p>
        {!isModal && <Button onClick={() => navigate("/alunos")} className="mt-4">← Voltar</Button>}
      </div>
    );
  }

  const fotoURL = buildFotoURL(aluno.foto);
  const iniciais = getInitials(aluno.estudante);
  const nomeTurma = aluno.turma ?? "—";
  const nomeTurno = aluno.turno ?? "";

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ── HEADER GRADIENTE PREMIUM ───────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 60%, #1a4a7a 100%)',
        borderRadius: '16px 16px 0 0',
        padding: '24px 24px 20px',
        color: '#fff',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AcademicCapIcon style={{ width: 14, height: 14 }} />
          FICHA DO ESTUDANTE
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {fotoURL ? (
              <img
                key={fotoURL}
                src={fotoURL}
                alt={aluno.estudante || ""}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)' }}
                onError={(e) => {
                  if (!retryOnceRef.current) {
                    retryOnceRef.current = true;
                    try {
                      const u = new URL(e.currentTarget.src);
                      u.searchParams.set("t", Date.now().toString());
                      e.currentTarget.src = u.toString();
                    } catch {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = PLACEHOLDER;
                    }
                    return;
                  }
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: '#fff',
                border: '3px solid rgba(255,255,255,0.3)',
                letterSpacing: '-1px',
              }}>
                {iniciais}
              </div>
            )}
          </div>

          {/* Nome e badges */}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {aluno.estudante ?? "—"}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {nomeTurma && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 99, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  🎓 {nomeTurma}
                </span>
              )}
              {nomeTurno && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 99, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  🕐 {nomeTurno}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CORPO ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', padding: '20px 24px 24px' }}>

        {/* Feedback */}
        {feedback?.tipo === "sucesso" && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, color: '#166534', fontSize: 13 }}>
            ✔️ {feedback.mensagem}
          </div>
        )}
        {feedback?.tipo === "erro" && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, color: '#991b1b', fontSize: 13 }}>
            ❌ {feedback.mensagem}
          </div>
        )}

        {/* Informações do estudante */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
            INFORMAÇÕES DO ESTUDANTE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'CÓDIGO', value: aluno.codigo ?? '—' },
              { label: 'DATA DE NASCIMENTO', value: formatDate(aluno.data_nascimento) },
              { label: 'SEXO', value: aluno.sexo ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload de foto — oculto no módulo disciplinar e para professores */}
        {!isDisciplinar && !isProfessor && (
          <div style={{ marginBottom: 20, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>📷 Foto do Estudante</div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <span style={{ padding: '7px 14px', background: uploading ? '#e5e7eb' : '#1e3a5f', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, transition: 'background 0.2s' }}>
                {uploading ? "Enviando…" : "Escolher pasta"}
              </span>
              <input
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.jfif,image/*"
                onChange={handleFolderSelect}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {/* Relatórios */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
            RELATÓRIOS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isProfessor ? '1fr' : '1fr 1fr', gap: 12 }}>
            {/* Relatório Pedagógico */}
            <div
              onClick={() => setModalPedagogicoOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setModalPedagogicoOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 2px 8px rgba(6,78,59,0.15)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(6,78,59,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(6,78,59,0.15)'; }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Relatório Pedagógico</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>Histórico completo de registros pedagógicos do estudante.</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Ver histórico →</div>
            </div>

            {/* Relatório Disciplinar */}
            {!isProfessor && (
              <div
                onClick={() => setModalRelatorioOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setModalRelatorioOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)',
                  borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 2px 8px rgba(15,40,71,0.15)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,40,71,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,40,71,0.15)'; }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>🛡️</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Relatório Disciplinar</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                  {ocorrenciasCount === null
                    ? 'Carregando…'
                    : ocorrenciasCount === 0
                      ? 'Sem ocorrências'
                      : `${ocorrenciasCount} ocorrência${ocorrenciasCount > 1 ? 's' : ''} registrada${ocorrenciasCount > 1 ? 's' : ''}`
                  }
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Abrir relatório →</div>
              </div>
            )}
          </div>
        </div>

        {/* Botão voltar (só fora do modal) */}
        {!isModal && (
          <div style={{ marginTop: 20 }}>
            <Button onClick={() => navigate("/alunos")} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
              ← Voltar à lista
            </Button>
          </div>
        )}
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
        somenteLeitura={isProfessor}
      />
    </div>
  );
}
