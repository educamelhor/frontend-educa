// src/features/secretaria/professores/index.jsx
// ============================================================================
// Módulo: Gestão de Professores (container principal)
// - Lista, busca (inclui TURNO), importa por PDF/XLSX, cria/edita/exclui.
// - Integra com ProfessorTable (exibe TURNO) e ProfessorForm (inclui TURNO).
// - Todas as chamadas de API usam o prefixo /api/…
// - ✅ Ajuste: no modo edição, o TURN0 também é persistido (PUT).
// ============================================================================

import React, { useState, useRef } from "react";
import { AcademicCapIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";
import { Button } from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import FeedbackPanel from "../../../components/ui/FeedbackPanel";
import ModalExcluirOuInativar from "./ModalExcluirOuInativar";
import { useProfessores } from "./useProfessores";
import ProfessorTable from "./ProfessorTable";
import ProfessorForm from "./ProfessorForm";
import VinculoForm from "./VinculoForm";

function formatarCPF(cpf = "") {
  cpf = String(cpf).replace(/[^\d]/g, "");
  if (cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
}

export default function Professores() {
  // ─────────────────────────────────────────────────────────────
  // Estados principais
  const { professores, loading, reload } = useProfessores();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [professorSelecionado, setProfessorSelecionado] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Exclusão / Inativação
  const [isExcluirOpen, setIsExcluirOpen] = useState(false);
  const [professorParaExcluir, setProfessorParaExcluir] = useState(null);

  // VinculoForm — adicionar vínculo a professor existente
  const [isVinculoOpen, setIsVinculoOpen] = useState(false);
  const [professorParaVinculo, setProfessorParaVinculo] = useState(null);

  // Exclusão em lote
  const [isLoteOpen, setIsLoteOpen] = useState(false);

  // Upload (PDF/XLSX)
  const [feedback, setFeedback] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef();

  // ─────────────────────────────────────────────────────────────
  // Exclusão / Inativação
  const abrirExcluir = (professor) => {
    setProfessorParaExcluir(professor);
    setIsExcluirOpen(true);
  };

  const handleConfirmExcluir = async (acao) => {
    setIsExcluirOpen(false);
    try {
      if (acao === "excluir") {
        await api.delete(`/api/professores/${professorParaExcluir.id}`);
      } else {
        await api.put(`/api/professores/inativar/${professorParaExcluir.id}`);
      }
      reload();
    } catch (err) {
      console.error("Erro na exclusão/inativação:", err);
      alert("Falha na operação: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAtivarProfessor = async (id) => {
    try {
      await api.put(`/api/professores/ativar/${id}`);
      setMensagemSucesso("✅ Professor reativado com sucesso!");
      reload();
      setTimeout(() => setMensagemSucesso(""), 3000);
      return true;
    } catch (err) {
      console.error("Erro ao ativar professor:", err);
      alert("Falha ao ativar professor: " + (err.response?.data?.message || err.message));
      return false;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Formulário: novo e edição
  const abrirForm = () => {
    setProfessorSelecionado(null);
    setIsFormOpen(true);
  };

  // Busca dados completos para edição (garantindo consistência)
  const abrirEdicao = async (prof) => {
    try {
      const { data } = await api.get(`/api/professores/${prof.id}`);
      setProfessorSelecionado(data);
      setIsFormOpen(true);
    } catch (err) {
      console.error("Erro ao buscar professor:", err);
      alert("Falha ao carregar dados completos do professor.");
    }
  };

  // Salvar (novo/edição) — com persistência do TURNO no modo edição
  const handleSaveProfessor = async (dados) => {
    // ✏️ Edição: atualiza disciplina, aulas e turno
    if (professorSelecionado) {
      try {
        await api.put(`/api/professores/${professorSelecionado.id}`, {
          disciplina_id: dados.disciplina_id,
          aulas: dados.aulas,
          turno: dados.turno, // ✅ NOVO: persistindo turno na edição
        });
        setMensagemSucesso("✅ Professor atualizado com sucesso!");
        setIsFormOpen(false);
        reload();
        setTimeout(() => setMensagemSucesso(""), 3000);
        return true;
      } catch (err) {
        console.error("Erro ao atualizar professor:", err);
        alert("Falha ao atualizar professor: " + (err.response?.data?.message || err.message));
        return false;
      }
    }

    // (A validação de duplicidade agora é feita exclusivamente pelo backend, 
    // que retorna HTTP 409 caso o CPF já exista, ativando o banner no formulário)

    try {
      await api.post("/api/professores", dados); // inclui turno no payload de criação
      setMensagemSucesso("✅ Professor cadastrado com sucesso!");
      setIsFormOpen(false);
      reload();
      setTimeout(() => setMensagemSucesso(""), 3000);
      return true;
    } catch (err) {
      console.error("Erro ao salvar professor:", err);
      alert("Falha ao salvar professor: " + (err.response?.data?.message || err.message));
      return false;
    }
  };

  // Adicionar vínculo a professor já existente
  const abrirVinculo = (prof) => {
    setProfessorParaVinculo(prof);
    setIsVinculoOpen(true);
  };

  const handleSalvarVinculo = async ({ turno, disciplina_id, aulas }) => {
    try {
      await api.post(`/api/professores/${professorParaVinculo.id}/vinculos`, { turno, disciplina_id, aulas });
      setMensagemSucesso("✅ Vínculo adicionado com sucesso!");
      reload();
      setTimeout(() => setMensagemSucesso(""), 3000);
      return true;
    } catch (err) {
      alert("Falha ao adicionar vínculo: " + (err.response?.data?.message || err.message));
      return false;
    }
  };

  const handleRemoverVinculo = async (profId, vinculoId) => {
    if (!window.confirm("Remover este vínculo?")) return;
    try {
      await api.delete(`/api/professores/${profId}/vinculos/${vinculoId}`);
      setMensagemSucesso("✅ Vínculo removido!");
      reload();
      setTimeout(() => setMensagemSucesso(""), 3000);
    } catch (err) {
      alert("Falha ao remover vínculo: " + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Busca/filtragem (inclui turno e disciplinas dos vínculos)
  const filteredProfessores = professores.filter((p) => {
    const termo = (searchTerm || "").toLowerCase();
    const vinculosStr = (p.vinculos || []).map(v => `${v.turno} ${v.disciplina_nome}`).join(" ").toLowerCase();
    return (
      (p.cpf || "").toLowerCase().includes(termo) ||
      (p.nome || "").toLowerCase().includes(termo) ||
      vinculosStr.includes(termo)
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Upload PDF/XLSX com feedback
  const handleUploadClick = () => {
    setFeedback(null);
    if (fileInput.current) fileInput.current.value = null;
    fileInput.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const formData = new FormData();
    formData.append("file", file);

    let rota = "";
    if (ext === "pdf") rota = "/api/professores/importar-pdf";
    else if (ext === "xlsx") rota = "/api/professores/importar-xlsx";
    else {
      alert("Formato de arquivo não suportado. Use PDF ou XLSX.");
      return;
    }

    setFeedback({ status: "processando", file: file.name });
    setProgress(0);

    try {
      const { data } = await api.post(rota, formData, {
        onUploadProgress: (evt) =>
          evt.total && setProgress(Math.round((evt.loaded / evt.total) * 100)),
      });

      const { localizados, inseridos, jaExistiam, reativados, inativados } = data || {};
      reload?.();
      setFeedback({
        status: "sucesso",
        file: file.name,
        localizados,
        inseridos,
        jaExistiam,
        reativados,
        inativados,
        message: `Lista de professores importada.`,
      });
    } catch (err) {
      setFeedback({
        status: "erro",
        message: err.response?.data?.message || err.message,
      });
    } finally {
      e.target.value = null;
      setProgress(0);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-6">
        <AcademicCapIcon className="w-8 h-8 text-blue-900" />
        <h1 className="text-3xl font-bold text-blue-900">Gestão de Professores</h1>
      </div>

      {/* Mensagem de sucesso */}
      {mensagemSucesso && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          {mensagemSucesso}
        </div>
      )}

      {/* Ações superiores */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-2" style={{ width: "max-content" }}>
          <Button
            onClick={abrirForm}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow transition"
          >
            <PlusIcon className="w-5 h-5" /> Adicionar Professor
          </Button>

          {/* Upload */}
          <input
            type="file"
            accept=".pdf,.xlsx"
            onChange={handleFileChange}
            hidden
            ref={fileInput}
          />
          <Button
            onClick={handleUploadClick}
            className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow transition"
          >
            <span role="img" aria-label="Pasta">📁</span> Incluir Professores
          </Button>

          {/* Excluir em lote */}
          <Button
            onClick={() => setIsLoteOpen(true)}
            className="bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow transition"
          >
            <TrashIcon className="w-5 h-5" /> Excluir Professores
          </Button>

          {/* Feedback */}
          {feedback && (
            <FeedbackPanel
              feedback={feedback}
              progress={progress}
              onClose={() => setFeedback(null)}
            />
          )}
        </div>

        {/* Busca (inclui Turno) */}
        <Input
          placeholder="🔍 Buscar por CPF, Nome, Turno ou Disciplina"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Tabela */}
      <ProfessorTable
        professores={filteredProfessores}
        loading={loading}
        onDelete={abrirExcluir}
        onEdit={abrirEdicao}
        onAdicionarVinculo={abrirVinculo}
        onRemoverVinculo={handleRemoverVinculo}
      />

      {/* Modal: Form Premium */}
      {isFormOpen && (
        <ProfessorForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSaveProfessor}
          onActivate={handleAtivarProfessor}
          professor={professorSelecionado}
          onAdicionarVinculo={abrirVinculo}
        />
      )}

      {/* Modal: Adicionar Vínculo */}
      {isVinculoOpen && (
        <VinculoForm
          open={isVinculoOpen}
          onClose={() => setIsVinculoOpen(false)}
          onSalvar={handleSalvarVinculo}
          professor={professorParaVinculo}
        />
      )}

      {/* Modal: Excluir/Inativar */}
      <ModalExcluirOuInativar
        open={isExcluirOpen}
        onClose={() => setIsExcluirOpen(false)}
        aluno={professorParaExcluir || {}}
        onDelete={() => handleConfirmExcluir("excluir")}
        onInactivate={() => handleConfirmExcluir("inativar")}
      />

      {/* Modal: Exclusão em Lote */}
      {isLoteOpen && (
        <ModalExcluirLote
          professores={professores}
          onClose={() => setIsLoteOpen(false)}
          onSuccess={() => {
            reload();
            setIsLoteOpen(false);
            setMensagemSucesso('✅ Professores excluídos com sucesso!');
            setTimeout(() => setMensagemSucesso(''), 3000);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL PREMIUM: Exclusão em Lote
// ============================================================================
function ModalExcluirLote({ professores, onClose, onSuccess }) {
  const [selecionados, setSelecionados] = useState(new Set());
  const [busca, setBusca] = useState("");
  const [step, setStep] = useState("select"); // "select" | "confirm"
  const [processing, setProcessing] = useState(false);
  const [progresso, setProgresso] = useState({ current: 0, total: 0 });

  const normalize = (s = "") => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const termo = normalize(busca);

  const filtrados = professores.filter(p =>
    normalize(p.nome).includes(termo) ||
    (p.cpf || "").includes(busca) ||
    normalize(p.turno || "").includes(termo) ||
    normalize(p.disciplina_nome || "").includes(termo)
  );

  const toggleAll = () => {
    if (filtrados.every(p => selecionados.has(p.id))) {
      const next = new Set(selecionados);
      filtrados.forEach(p => next.delete(p.id));
      setSelecionados(next);
    } else {
      const next = new Set(selecionados);
      filtrados.forEach(p => next.add(p.id));
      setSelecionados(next);
    }
  };

  const toggle = (id) => {
    const next = new Set(selecionados);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelecionados(next);
  };

  const handleExcluir = async () => {
    const ids = [...selecionados];
    setProgresso({ current: 0, total: ids.length });
    setProcessing(true);
    try {
      await api.post('/api/professores/excluir-lote', { ids }, { timeout: 300000 });
      onSuccess();
    } catch (err) {
      alert('Erro na exclusão em lote: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const allChecked = filtrados.length > 0 && filtrados.every(p => selecionados.has(p.id));
  const qtd = selecionados.size;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => !processing && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: 620,
          maxHeight: '90vh',
          borderRadius: 20,
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #fff 60%, #fef2f2 100%)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(220,38,38,0.1)',
          animation: 'profModalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <style>{`
          @keyframes profModalSlideIn {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes profPulseRing {
            0%   { transform: scale(0.8); opacity: 0; }
            50%  { opacity: 0.4; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          @keyframes profSpin {
            to { transform: rotate(360deg); }
          }
          .lote-row:hover { background: #fef2f2 !important; }
          .lote-check { accent-color: #dc2626; width: 18px; height: 18px; cursor: pointer; }
        `}</style>

        {/* ── Header ── */}
        <div style={{
          background: step === 'confirm'
            ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
          padding: '24px 24px 20px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
            <div style={{
              position: 'absolute', inset: -8,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              animation: 'profPulseRing 2s ease-out infinite',
            }} />
            <div style={{
              width: 52, height: 52,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              {step === 'confirm' ? '🗑️' : '👥'}
            </div>
          </div>
          <h3 style={{ color: '#fff', fontSize: 19, fontWeight: 700, margin: 0 }}>
            {step === 'confirm' ? 'Confirmar Exclusão em Lote' : 'Excluir Professores em Lote'}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: '4px 0 0' }}>
            {step === 'confirm'
              ? `${qtd} professor(es) selecionado(s) para exclusão`
              : 'Selecione os professores que deseja excluir'}
          </p>
        </div>

        {/* ── Corpo ── */}
        {step === 'select' && (
          <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
            {/* Busca + contador */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <input
                type="text"
                placeholder="🔍 Filtrar por nome, CPF, turno..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{
                  flex: 1, padding: '8px 14px', borderRadius: 10,
                  border: '1px solid #d1d5db', fontSize: 13,
                  outline: 'none',
                }}
              />
              {qtd > 0 && (
                <span style={{
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#fff', fontWeight: 700, fontSize: 12,
                  padding: '4px 12px', borderRadius: 20,
                  boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                }}>
                  {qtd} selecionado{qtd > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Selecionar todos */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: '#f3f4f6', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: '#374151',
              marginBottom: 8,
            }}>
              <input
                type="checkbox"
                className="lote-check"
                checked={allChecked}
                onChange={toggleAll}
              />
              Selecionar todos ({filtrados.length})
            </label>
          </div>
        )}

        {/* Lista de professores */}
        {step === 'select' && (
          <div style={{
            flex: 1, overflowY: 'auto', padding: '0 20px 16px',
            maxHeight: 380,
          }}>
            {filtrados.map(p => (
              <label
                key={p.id}
                className="lote-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  cursor: 'pointer', transition: 'background 0.15s',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <input
                  type="checkbox"
                  className="lote-check"
                  checked={selecionados.has(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: selecionados.has(p.id)
                    ? 'linear-gradient(135deg, #dc2626, #f87171)'
                    : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  flexShrink: 0, transition: 'background 0.2s',
                }}>
                  {(p.nome || '?')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: 600, color: '#1f2937', fontSize: 13,
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.nome}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0' }}>
                    {formatarCPF(p.cpf)}
                    {p.turno ? ` · ${p.turno.toUpperCase()}` : ''}
                    {p.disciplina_nome ? ` · ${p.disciplina_nome}` : ''}
                  </p>
                </div>
              </label>
            ))}
            {filtrados.length === 0 && (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>
                Nenhum professor encontrado.
              </p>
            )}
          </div>
        )}

        {/* Confirmação */}
        {step === 'confirm' && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: '#fef2f2', border: '1px solid #fecaca',
              marginBottom: 14,
            }}>
              <p style={{ fontWeight: 700, color: '#1f2937', fontSize: 15, margin: 0 }}>
                {qtd} professor(es) selecionado(s)
              </p>
              <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 8 }}>
                {professores.filter(p => selecionados.has(p.id)).map(p => (
                  <p key={p.id} style={{ fontSize: 12, color: '#6b7280', margin: '3px 0' }}>
                    • {p.nome} ({formatarCPF(p.cpf)})
                  </p>
                ))}
              </div>
            </div>

            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 16, lineHeight: '20px' }}>💡</span>
              <p style={{ color: '#991b1b', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Serão removidos também os registros de <strong>modulação</strong>,{' '}
                <strong>preferências</strong> e <strong>grades de horário</strong> vinculados.
                Esta ação é <strong>permanente e irreversível</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          padding: '0 24px 24px',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          {step === 'select' && (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 24px', borderRadius: 10,
                  border: '1px solid #d1d5db', background: '#fff',
                  color: '#374151', fontWeight: 600, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.target.style.background = '#f3f4f6'; }}
                onMouseLeave={e => { e.target.style.background = '#fff'; }}
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={qtd === 0}
                style={{
                  padding: '10px 28px', borderRadius: 10,
                  border: 'none',
                  background: qtd === 0
                    ? 'linear-gradient(135deg, #d1d5db, #9ca3af)'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: qtd === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: qtd === 0 ? 'none' : '0 4px 14px rgba(220,38,38,0.4)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                Continuar ({qtd})
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                onClick={() => !processing && setStep('select')}
                disabled={processing}
                style={{
                  padding: '10px 24px', borderRadius: 10,
                  border: '1px solid #d1d5db', background: '#fff',
                  color: '#374151', fontWeight: 600, fontSize: 14,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.5 : 1,
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleExcluir}
                disabled={processing}
                style={{
                  padding: '10px 28px', borderRadius: 10,
                  border: 'none',
                  background: processing
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: processing ? 'none' : '0 4px 14px rgba(220,38,38,0.4)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {processing ? (
                  <>
                    <span style={{
                      width: 16, height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'profSpin 0.6s linear infinite',
                    }} />
                    Excluindo...
                  </>
                ) : (
                  `Sim, Excluir ${qtd} Professor${qtd > 1 ? 'es' : ''}`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
