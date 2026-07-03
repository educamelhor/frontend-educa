// src/features/direcao/FichaAlunoDirecao.jsx
// ============================================================
// FICHA DO ESTUDANTE — Módulo DIREÇÃO / Rota Global (isolado)
// ❌ Relatório Disciplinar: NÃO — apenas perfil militar (diretor_disciplinar / comandante)
// ✅ Relatório Pedagógico: sim
// ❌ Upload de Foto: NÃO — fotos vêm exclusivamente do app EDUCA-CAPTURE
// Acessada via rota /alunos/:codigo/ficha por Diretores e CEO.
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Button } from "../../components/ui/Button";
// faceapi removido — upload de foto não é mais realizado neste módulo
import { AcademicCapIcon } from "@heroicons/react/24/solid";
// ModalRelatorioDisciplinar removido — apenas perfil militar (diretor_disciplinar/comandante) acessa
import ModalRelatorioPedagogico from "../alunos/ModalRelatorioPedagogico";

export default function FichaAlunoDirecao({ codigo: codigoProp }) {
  const { codigo: codigoParam } = useParams();
  const codigo = codigoProp || codigoParam;
  const isModal = Boolean(codigoProp);
  const navigate = useNavigate();

  const [aluno, setAluno] = useState(null);
  const [erro, setErro] = useState(null);
  const [modalPedagogicoOpen, setModalPedagogicoOpen] = useState(false);

  const retryOnceRef = React.useRef(false);

  const usuarioLogadoId = Number(localStorage.getItem('usuario_id') || localStorage.getItem('usuarioId') || 0);

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
    } catch { return "—"; }
  };

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

  // [Relatório Disciplinar removido] — ocorrenciasCount não é mais necessário neste módulo

  // [Upload de foto removido] — fotos vêm exclusivamente do app EDUCA-CAPTURE

  const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='100%' height='100%' rx='64' ry='64' fill='#e5e7eb'/></svg>`
  );

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

  if (erro) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#dc2626' }}>{erro}</p>
        {!isModal && <Button onClick={() => navigate(-1)} className="mt-4">← Voltar</Button>}
      </div>
    );
  }

  const fotoURL = buildFotoURL(aluno.foto);
  const iniciais = getInitials(aluno.estudante);
  const nomeTurma = aluno.turma ?? "—";
  const nomeTurno = aluno.turno ?? "";

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 60%, #1a4a7a 100%)', borderRadius: '16px 16px 0 0', padding: '24px 24px 20px', color: '#fff' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AcademicCapIcon style={{ width: 14, height: 14 }} />
          FICHA DO ESTUDANTE — DIREÇÃO
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flexShrink: 0 }}>
            {fotoURL ? (
              <img key={fotoURL} src={fotoURL} alt={aluno.estudante || ""} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)' }}
                onError={(e) => {
                  if (!retryOnceRef.current) { retryOnceRef.current = true; try { const u = new URL(e.currentTarget.src); u.searchParams.set("t", Date.now().toString()); e.currentTarget.src = u.toString(); } catch { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; } return; }
                  e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER;
                }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', border: '3px solid rgba(255,255,255,0.3)', letterSpacing: '-1px' }}>{iniciais}</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{aluno.estudante ?? "—"}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {nomeTurma && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 99, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)' }}>🎓 {nomeTurma}</span>}
              {nomeTurno && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 99, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)' }}>🕐 {nomeTurno}</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', padding: '20px 24px 24px' }}>


        {/* Relatório Pedagógico — único relatório da Direção
            Regra de ouro: Relatório Disciplinar = exclusivo perfil militar (diretor_disciplinar / comandante) */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>RELATÓRIOS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div onClick={() => setModalPedagogicoOpen(true)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setModalPedagogicoOpen(true)}
              style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 2px 8px rgba(6,78,59,0.15)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(6,78,59,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(6,78,59,0.15)'; }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Relatório Pedagógico</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>Histórico completo de registros pedagógicos.</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Ver histórico →</div>
            </div>
          </div>
        </div>

        {!isModal && (
          <div style={{ marginTop: 20 }}>
            <Button onClick={() => navigate(-1)} className="bg-gray-200 text-gray-800 hover:bg-gray-300">← Voltar</Button>
          </div>
        )}
      </div>

      {/* ModalRelatorioDisciplinar removido — não pertence ao módulo Direção */}
      <ModalRelatorioPedagogico open={modalPedagogicoOpen} onClose={() => setModalPedagogicoOpen(false)} aluno={aluno} somenteLeitura={false} usuarioLogadoId={usuarioLogadoId} />
    </div>
  );
}
