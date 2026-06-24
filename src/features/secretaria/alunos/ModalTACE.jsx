import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  UserIcon,
  IdentificationIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import api from "../../../services/api";

// ── Helpers ──
function formatarDataBR(data) {
  if (!data) return "";
  const s = typeof data === "string" ? data : "";
  const onlyDate = s.split("T")[0];
  const [ano, mes, dia] = onlyDate.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  return s;
}

export default function ModalTACE({ open, onClose, aluno, onSaved }) {
  const [reconhecimento, setReconhecimento] = useState("");
  const [compromisso, setCompromisso] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pontuacao, setPontuacao] = useState(8.0);

  // Validação de dados para gerar PDF
  const [validacaoOpen, setValidacaoOpen] = useState(false);
  const [camposAusentes, setCamposAusentes] = useState([]);

  // Carregar dados salvos + pontuação ao abrir modal
  useEffect(() => {
    if (open && aluno?.id) {
      setLoading(true);
      setSaved(false);
      setError("");

      // Buscar TACE dados + ocorrências em paralelo
      Promise.all([
        api.get(`/api/tace/dados/${aluno.id}`).catch(() => ({ data: {} })),
        api.get(`/api/alunos/${aluno.id}/ocorrencias`).catch(() => ({ data: [] })),
      ])
        .then(([taceRes, ocRes]) => {
          setReconhecimento(taceRes.data.reconhecimento_fatos || "");
          setCompromisso(taceRes.data.compromisso_conduta || "");

          // Calcular pontuação (mesma lógica do ModalRelatorioDisciplinar)
          const PONTUACAO_INICIAL = 8.0;
          let pts = PONTUACAO_INICIAL;
          const ocorrencias = Array.isArray(ocRes.data) ? ocRes.data : [];
          for (const oc of ocorrencias) {
            if (oc.status === 'CANCELADA') continue; // cancelada reverte, não conta
            pts += Number(oc.pontos) || 0;
          }
          setPontuacao(Math.max(0, Math.min(10, parseFloat(pts.toFixed(2)))));
        })
        .finally(() => setLoading(false));
    }
  }, [open, aluno]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // 1) Salvar os textos no BD (sempre salva, independente da validação)
      await api.post(`/api/tace/dados/${aluno.id}`, {
        reconhecimento_fatos: reconhecimento,
        compromisso_conduta: compromisso,
      });
      setSaved(true);
      if (onSaved) onSaved();

      // 2) Validar se todos os dados do estudante e responsável estão preenchidos
      const validRes = await api.get(`/api/tace/validar/${aluno.id}`);
      if (!validRes.data.valido) {
        // Dados ausentes → mostra modal de alerta (não gera PDF)
        setCamposAusentes(validRes.data.ausentes || []);
        setValidacaoOpen(true);
        return;
      }

      // 3) Tudo OK → Abrir o PDF do TACE
      const token = localStorage.getItem("token");
      const escolaId = localStorage.getItem("escola_id");
      const url = `${api.defaults.baseURL}/tace/${aluno.id}?token=${encodeURIComponent(token)}&escola_id=${encodeURIComponent(escolaId)}`;
      window.open(url, "_blank");

      // Fechar o modal após gerar o PDF
      onClose();
    } catch (err) {
      console.error("Erro ao salvar TACE:", err);
      setError("Erro ao salvar os dados. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !aluno) return null;

  // Foto helper
  const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");
  const buildFotoURL = (path) => {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `${apiBase}${path}`;
  };
  const fotoURL = buildFotoURL(aluno.foto);
  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='100%' height='100%' rx='64' ry='64' fill='#e5e7eb'/></svg>`
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ animation: "fadeScaleIn 0.25s ease-out" }}
      >
        <style>{`
          @keyframes fadeScaleIn {
            from { opacity: 0; transform: scale(0.97) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* ═══════════ Header Premium ═══════════ */}
        <div className="relative">
          {/* Gradiente de fundo */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />

          <div className="relative z-10 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Ícone TACE */}
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <DocumentTextIcon className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  T.A.C.E.
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
                    Preenchimento
                  </span>
                </h2>
                <p className="text-blue-300/70 text-sm">
                  Termo de Ajuste de Conduta Escolar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
              title="Fechar"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* ═══════════ Student Info Bar ═══════════ */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-center gap-4">
            <img
              src={fotoURL || PLACEHOLDER}
              alt={aluno.estudante || ""}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = PLACEHOLDER;
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-800 uppercase truncate">
                {aluno.estudante || "NOME NÃO INFORMADO"}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  <span className="font-semibold text-gray-600">RE:</span>{" "}
                  {aluno.codigo || "—"}
                </span>
                <span>
                  <span className="font-semibold text-gray-600">Turma:</span>{" "}
                  {aluno.turma || "—"} {aluno.turno ? `(${aluno.turno})` : ""}
                </span>
                {aluno.data_nascimento && (
                  <span>
                    <span className="font-semibold text-gray-600">Nasc.:</span>{" "}
                    {formatarDataBR(aluno.data_nascimento)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pontuação</span>
              <div className={`flex items-center justify-center w-14 h-14 rounded-xl border-2 shadow-sm ${
                pontuacao >= 7 ? "bg-emerald-50 border-emerald-200" :
                pontuacao >= 5 ? "bg-amber-50 border-amber-200" :
                "bg-red-50 border-red-200"
              }`}>
                <span className={`text-xl font-extrabold ${
                  pontuacao >= 7 ? "text-emerald-700" :
                  pontuacao >= 5 ? "text-amber-700" :
                  "text-red-700"
                }`}>
                  {pontuacao.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${
                pontuacao >= 10  ? "text-emerald-600" :
                pontuacao >= 9   ? "text-blue-600" :
                pontuacao >= 7   ? "text-green-600" :
                pontuacao >= 5   ? "text-yellow-600" :
                pontuacao >= 2   ? "text-orange-600" :
                "text-red-600"
              }`}>
                {pontuacao >= 10  ? "I - Excepcional" :
                 pontuacao >= 9   ? "II - Ótimo" :
                 pontuacao >= 7   ? "III - Bom" :
                 pontuacao >= 5   ? "IV - Regular" :
                 pontuacao >= 2   ? "V - Insuficiente" :
                 "VI - Incompatível"}
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════ Body ═══════════ */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Carregando dados do TACE...</p>
            </div>
          ) : (
            <>
              {/* ── Campo 1: Reconhecimento dos Fatos ── */}
              <div className="group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    4
                  </div>
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Reconhecimento dos Fatos
                  </label>
                </div>
                <p className="text-xs text-gray-400 mb-2 ml-9">
                  Descreva os fatos que motivaram a elaboração deste TACE.
                </p>
                <textarea
                  value={reconhecimento}
                  onChange={(e) => setReconhecimento(e.target.value)}
                  placeholder="Descreva o reconhecimento dos fatos disciplinares do(a) estudante..."
                  rows={8}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-800 leading-relaxed
                    placeholder:text-gray-400 resize-y
                    focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 focus:bg-white
                    transition-all duration-200"
                  style={{ textAlign: "justify" }}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[11px] text-gray-300">
                    {reconhecimento.length} caracteres
                  </span>
                </div>
              </div>

              {/* ── Campo 2: Compromisso de Ajuste de Conduta ── */}
              <div className="group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    5
                  </div>
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Compromisso de Ajuste de Conduta
                  </label>
                </div>
                <p className="text-xs text-gray-400 mb-2 ml-9">
                  Estabeleça os compromissos firmados entre a escola, o(a) estudante
                  e seu responsável legal.
                </p>
                <textarea
                  value={compromisso}
                  onChange={(e) => setCompromisso(e.target.value)}
                  placeholder="Descreva os compromissos pactuados para ajuste de conduta..."
                  rows={8}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-800 leading-relaxed
                    placeholder:text-gray-400 resize-y
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 focus:bg-white
                    transition-all duration-200"
                  style={{ textAlign: "justify" }}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[11px] text-gray-300">
                    {compromisso.length} caracteres
                  </span>
                </div>
              </div>

              {/* ── Dica ── */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200/60">
                <SparklesIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Dica:</strong> Ao gerar o TACE em PDF, os textos acima
                  serão formatados com alinhamento justificado, garantindo um
                  documento com aparência profissional. Ambos os campos são
                  obrigatórios para salvar o registro.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ═══════════ Footer ═══════════ */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-h-[24px]">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 animate-pulse">
                <CheckCircleIcon className="h-5 w-5" />
                Salvo com sucesso!
              </span>
            )}
            {error && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <ExclamationTriangleIcon className="h-5 w-5" />
                {error}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm
                hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !reconhecimento.trim() || !compromisso.trim()}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold text-sm
                shadow-md shadow-blue-900/20
                hover:from-blue-800 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-900/30
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  SALVAR
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ Modal Premium —  Dados Ausentes ═══════════ */}
      {validacaoOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <style>{`
            @keyframes alertSlideIn {
              from { opacity: 0; transform: scale(0.92) translateY(20px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes pulseRing {
              0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
              50%      { box-shadow: 0 0 24px 6px rgba(239, 68, 68, 0.15); }
            }
            @keyframes slideField {
              from { opacity: 0; transform: translateX(-12px); }
              to   { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            style={{ animation: "alertSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
          >
            {/* Header com gradiente vermelho */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-rose-900 to-orange-950" />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-orange-500/8 rounded-full blur-2xl" />

              <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                    style={{ animation: "pulseRing 2s ease-in-out infinite" }}
                  >
                    <ShieldExclamationIcon className="h-7 w-7 text-red-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Dados Incompletos
                    </h2>
                    <p className="text-red-300/70 text-xs mt-0.5">
                      O PDF não pode ser gerado com dados ausentes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setValidacaoOpen(false)}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                  title="Fechar"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Corpo — Lista de campos ausentes */}
            <div className="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/60">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Atenção:</strong> Os textos de Reconhecimento e Compromisso{" "}
                  <strong className="text-emerald-700">foram salvos com sucesso</strong>, mas o PDF
                  do TACE só poderá ser gerado quando todos os dados abaixo estiverem preenchidos.
                </p>
              </div>

              {camposAusentes.map((grupo, gi) => (
                <div
                  key={gi}
                  className="rounded-xl border border-gray-100 overflow-hidden"
                  style={{ animation: `slideField 0.3s ease-out ${gi * 0.1}s both` }}
                >
                  {/* Título da categoria */}
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                    <div className={`p-1.5 rounded-lg ${grupo.categoria === "Estudante"
                      ? "bg-blue-100"
                      : "bg-purple-100"
                    }`}>
                      {grupo.categoria === "Estudante" ? (
                        <UserIcon className="h-4 w-4 text-blue-600" />
                      ) : (
                        <IdentificationIcon className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      {grupo.categoria}
                    </span>
                    <span className="ml-auto text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      {grupo.campos.length} {grupo.campos.length === 1 ? "campo" : "campos"}
                    </span>
                  </div>

                  {/* Lista de campos */}
                  <div className="divide-y divide-gray-50">
                    {grupo.campos.map((campo, ci) => (
                      <div
                        key={ci}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/30 transition"
                        style={{ animation: `slideField 0.3s ease-out ${(gi * 0.1) + (ci * 0.05)}s both` }}
                      >
                        <ExclamationCircleIcon className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{campo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={() => setValidacaoOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold text-sm
                  shadow-md shadow-blue-900/20
                  hover:from-blue-800 hover:to-blue-600 hover:shadow-lg
                  active:scale-[0.97]
                  transition-all duration-200
                  flex items-center gap-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
