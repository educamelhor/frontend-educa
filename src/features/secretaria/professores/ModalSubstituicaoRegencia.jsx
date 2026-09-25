// src/features/secretaria/professores/ModalSubstituicaoRegencia.jsx
// ============================================================================
// Modal Premium — Substituição de Regência
// Transfere turmas e disciplinas de um professor afastado para um substituto.
// Preserva o histórico de planos e notas do diário.
// ============================================================================

import React, { useState, useEffect } from "react";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";

function formatarCPF(cpf = "") {
  const d = String(cpf || "").replace(/\D/g, "").padStart(11, "0");
  if (d.length !== 11) return cpf;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
}

export default function ModalSubstituicaoRegencia({
  open,
  onClose,
  professorOrigem,
  professores = [],
  onSuccess,
}) {
  const [destinoId, setDestinoId] = useState("");
  const [inativarOrigem, setInativarOrigem] = useState(true);
  const [removerAlocacoesOrigem, setRemoverAlocacoesOrigem] = useState(true);
  const [motivo, setMotivo] = useState("Licença / Afastamento");
  const [loadingModulacoes, setLoadingModulacoes] = useState(false);
  const [modulacoes, setModulacoes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState("");
  const [buscaDestino, setBuscaDestino] = useState("");

  // Busca as turmas/modulações do professor de origem ao abrir o modal
  useEffect(() => {
    if (open && professorOrigem?.id) {
      setDestinoId("");
      setErro("");
      setBuscaDestino("");
      setLoadingModulacoes(true);

      api
        .get(`/api/professores/${professorOrigem.id}/modulacoes`)
        .then((res) => {
          setModulacoes(res.data?.modulacoes || []);
        })
        .catch((err) => {
          console.error("Erro ao carregar turmas do professor:", err);
          setModulacoes([]);
        })
        .finally(() => {
          setLoadingModulacoes(false);
        });
    }
  }, [open, professorOrigem]);

  if (!open || !professorOrigem) return null;

  // Filtrar apenas professores ativos (exceto o próprio professor de origem)
  const professoresAtivos = professores.filter(
    (p) => p.id !== professorOrigem.id && p.status !== "inativo"
  );

  const professoresFiltrados = professoresAtivos.filter((p) => {
    const q = buscaDestino.toLowerCase();
    return (
      (p.nome || "").toLowerCase().includes(q) ||
      (p.cpf || "").includes(q)
    );
  });

  async function handleConfirmarSubstituicao(e) {
    e.preventDefault();
    if (!destinoId) {
      setErro("Por favor, selecione o professor substituto.");
      return;
    }

    setSubmitting(true);
    setErro("");

    try {
      const payload = {
        professor_origem_id: professorOrigem.id,
        professor_destino_id: Number(destinoId),
        inativar_origem: inativarOrigem,
        remover_alocacoes_origem: removerAlocacoesOrigem,
        motivo: motivo.trim(),
      };

      const res = await api.post("/api/professores/substituir", payload);

      if (res.data?.ok) {
        onSuccess?.(res.data);
        onClose();
      } else {
        setErro(res.data?.message || "Ocorreu um erro ao realizar a substituição.");
      }
    } catch (err) {
      console.error("Erro na substituição de regência:", err);
      setErro(err.response?.data?.message || err.message || "Erro ao conectar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  // Agrupar modulações por nome de turma para exibição limpa
  const turmasResumo = modulacoes.map((m) =>
    m.disciplina_nome ? `${m.turma_nome} (${m.disciplina_nome})` : m.turma_nome
  );
  const turmasUnicas = [...new Set(turmasResumo)];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={() => !submitting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95%",
          maxWidth: 600,
          borderRadius: 20,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(37,99,235,0.1)",
          animation: "substituicaoSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style>{`
          @keyframes substituicaoSlideIn {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes substituicaoSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* ── Header ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
            padding: "24px 24px 20px",
            color: "#ffffff",
            position: "relative",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white flex-shrink-0">
              <ArrowPathIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Substituição de Regência</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Transfira as turmas e preserve o histórico pedagógico da disciplina
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleConfirmarSubstituicao} className="p-6 space-y-5">
          {/* Mensagem de Erro */}
          {erro && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-sm">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{erro}</span>
            </div>
          )}

          {/* Card do Professor Afastado (Origem) */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                Professor Afastado (Origem)
              </span>
              <span className="text-xs font-mono text-amber-700">{formatarCPF(professorOrigem.cpf)}</span>
            </div>
            <p className="font-bold text-gray-900 text-base">{professorOrigem.nome}</p>

            {/* Turmas Moduladas */}
            <div className="mt-3 pt-3 border-t border-amber-200/60">
              <p className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                📚 Turmas a serem transferidas:
              </p>
              {loadingModulacoes ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 py-1">
                  <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  Carregando turmas...
                </div>
              ) : turmasUnicas.length === 0 ? (
                <p className="text-xs text-amber-800 italic bg-amber-100/50 p-2 rounded-lg">
                  Nenhuma turma modulada encontrada para este professor.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {turmasUnicas.map((tName, idx) => (
                    <span
                      key={idx}
                      className="bg-white/90 border border-amber-300 text-amber-950 font-semibold text-[11px] px-2.5 py-1 rounded-lg shadow-sm"
                    >
                      {tName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Seleção do Professor Substituto (Destino) */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              Professor Substituto (Destino) <span className="text-red-500">*</span>
            </label>

            {professoresAtivos.length === 0 ? (
              <div className="p-3 bg-gray-100 rounded-xl text-xs text-gray-600">
                Nenhum outro professor ativo disponível na escola.
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="🔎 Filtrar por nome ou CPF..."
                  value={buscaDestino}
                  onChange={(e) => setBuscaDestino(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  required
                  className="w-full text-sm font-medium px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Selecione o substituto...</option>
                  {professoresFiltrados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({formatarCPF(p.cpf)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Motivo da Substituição */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Motivo do Afastamento / Substituição
            </label>
            <input
              type="text"
              placeholder="Ex: Licença Médica, Maternidade, Desligamento..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Checkboxes de Execução */}
          <div className="space-y-2.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs text-gray-700">
            <label className="flex items-center gap-2.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={inativarOrigem}
                onChange={(e) => setInativarOrigem(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span>Inativar o cadastro do professor afastado após a substituição</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={removerAlocacoesOrigem}
                onChange={(e) => setRemoverAlocacoesOrigem(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span>Remover alocações da grade horária do professor afastado</span>
            </label>
          </div>

          {/* Banner Educativo */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2">
            <span className="text-base flex-shrink-0">💡</span>
            <p>
              <strong>Garantia Pedagógica:</strong> Os planos de aula e as notas já lançadas pela antecessora serão mantidos intactos e ficarão imediatamente disponíveis para o professor substituto.
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !destinoId || modulacoes.length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Substituindo...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Confirmar Substituição
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
