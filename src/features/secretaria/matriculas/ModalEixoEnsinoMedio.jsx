// src/features/secretaria/matriculas/ModalEixoEnsinoMedio.jsx
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  SparklesIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";

export const TEMAS_VISUAIS_EIXOS = {
  purple: {
    id: "purple",
    label: "Roxo",
    corGradiente: "from-purple-600 via-violet-600 to-indigo-700",
    corBgSuave: "bg-purple-50",
    corTexto: "text-purple-700",
    corBorda: "border-purple-200",
    corAnel: "ring-purple-500",
    amostra: "bg-purple-600",
  },
  sky: {
    id: "sky",
    label: "Celeste",
    corGradiente: "from-blue-600 via-sky-600 to-cyan-700",
    corBgSuave: "bg-sky-50",
    corTexto: "text-sky-700",
    corBorda: "border-sky-200",
    corAnel: "ring-sky-500",
    amostra: "bg-sky-600",
  },
  emerald: {
    id: "emerald",
    label: "Esmeralda",
    corGradiente: "from-emerald-600 via-teal-600 to-cyan-700",
    corBgSuave: "bg-emerald-50",
    corTexto: "text-emerald-700",
    corBorda: "border-emerald-200",
    corAnel: "ring-emerald-500",
    amostra: "bg-emerald-600",
  },
  amber: {
    id: "amber",
    label: "Âmbar",
    corGradiente: "from-amber-500 via-orange-500 to-rose-600",
    corBgSuave: "bg-amber-50",
    corTexto: "text-amber-800",
    corBorda: "border-amber-200",
    corAnel: "ring-amber-500",
    amostra: "bg-amber-500",
  },
  slate: {
    id: "slate",
    label: "Ardósia",
    corGradiente: "from-slate-700 via-slate-800 to-indigo-900",
    corBgSuave: "bg-slate-100",
    corTexto: "text-slate-800",
    corBorda: "border-slate-300",
    corAnel: "ring-slate-600",
    amostra: "bg-slate-700",
  },
  rose: {
    id: "rose",
    label: "Rosa",
    corGradiente: "from-rose-600 via-pink-600 to-fuchsia-700",
    corBgSuave: "bg-rose-50",
    corTexto: "text-rose-700",
    corBorda: "border-rose-200",
    corAnel: "ring-rose-500",
    amostra: "bg-rose-600",
  },
  indigo: {
    id: "indigo",
    label: "Índigo",
    corGradiente: "from-indigo-600 via-blue-600 to-violet-700",
    corBgSuave: "bg-indigo-50",
    corTexto: "text-indigo-700",
    corBorda: "border-indigo-200",
    corAnel: "ring-indigo-500",
    amostra: "bg-indigo-600",
  },
  teal: {
    id: "teal",
    label: "Turquesa",
    corGradiente: "from-teal-600 via-cyan-600 to-sky-700",
    corBgSuave: "bg-teal-50",
    corTexto: "text-teal-700",
    corBorda: "border-teal-200",
    corAnel: "ring-teal-500",
    amostra: "bg-teal-600",
  },
};

export const OPCOES_ICONES_EIXO = [
  { emoji: "🎓", mobile: "school-outline", label: "Acadêmico" },
  { emoji: "🧭", mobile: "compass-outline", label: "Trilha / IFA" },
  { emoji: "🎯", mobile: "bulb-outline", label: "Ideias / Eletiva" },
  { emoji: "🌐", mobile: "globe-outline", label: "Global / Línguas" },
  { emoji: "🔬", mobile: "flask-outline", label: "Ciências / Lab" },
  { emoji: "💻", mobile: "code-slash-outline", label: "Tecnologia / TI" },
  { emoji: "🛠️", mobile: "construct-outline", label: "Técnico / FTP" },
  { emoji: "🌱", mobile: "ribbon-outline", label: "Projeto de Vida" },
  { emoji: "🧩", mobile: "layers-outline", label: "Diversificada" },
  { emoji: "📚", mobile: "book-outline", label: "Leitura / Redação" },
  { emoji: "🎨", mobile: "musical-notes-outline", label: "Artes & Música" },
  { emoji: "🏆", mobile: "fitness-outline", label: "Esporte & Saúde" },
  { emoji: "✨", mobile: "sparkles-outline", label: "Inovação" },
  { emoji: "📦", mobile: "grid-outline", label: "Geral / Outros" },
];

const TIPOS_DISCIPLINA_BASE = [
  { value: "PROJETO", label: "Projeto / Oficina Semestral (Padrão)" },
  { value: "ELETIVA", label: "Eletiva Orientada" },
  { value: "IFA", label: "Itinerário Formativo (IFA / FTP)" },
  { value: "PCA", label: "Percurso Comum de Aprofundamento (PCA)" },
  { value: "PARTE_DIVERSIFICADA", label: "Parte Diversificada (PD / LEM)" },
];

/**
 * Converte qualquer registro vindo do backend (`em_eixos` / `categorias`) ou do
 * catálogo local no formato visual unificado consumido pelos cards e modais.
 */
export function normalizarCardEixoVisual(raw = {}) {
  const temaKey = TEMAS_VISUAIS_EIXOS[raw.cor_tema] ? raw.cor_tema : "indigo";
  const tema = TEMAS_VISUAIS_EIXOS[temaKey];

  return {
    codigo: raw.codigo || "PROJETO",
    sigla: raw.sigla || raw.label_mobile || raw.codigo || "PROJETO",
    labelMobile: raw.label_mobile || raw.sigla || raw.codigo || "PROJETO",
    titulo: raw.titulo || raw.codigo || "Eixo Semestral",
    subtitulo:
      raw.subtitulo ||
      raw.descricaoCurta ||
      raw.descricao_curta ||
      "Eixo de oferta semestral da unidade escolar",
    descricaoCurta:
      raw.descricao_curta ||
      raw.descricaoCurta ||
      raw.subtitulo ||
      "Clique para cadastrar projetos, sinopse e turmas deste eixo.",
    corTema: temaKey,
    corGradiente: raw.corGradiente || tema.corGradiente,
    corBgSuave: raw.corBgSuave || tema.corBgSuave,
    corTexto: raw.corTexto || tema.corTexto,
    corBorda: raw.corBorda || tema.corBorda,
    corAnel: raw.corAnel || tema.corAnel,
    iconeEmoji: raw.icone_emoji || raw.iconeEmoji || "🎓",
    iconeMobile: raw.icone_mobile || raw.iconeMobile || "school-outline",
    cargaSugerida: Number(raw.carga_sugerida || raw.cargaSugerida || 2),
    exemploNome:
      raw.exemplo_nome ||
      raw.exemploNome ||
      `${raw.sigla || "Projeto"} — Oficina Temática Semestral`,
    disciplinaTipo: raw.disciplinaTipo || raw.disciplina_tipo || "PROJETO",
    ativo: raw.ativo === undefined ? true : Boolean(raw.ativo),
    padraoSistema:
      raw.padrao_sistema === undefined
        ? Boolean(raw.padraoSistema)
        : Boolean(raw.padrao_sistema),
    total_projetos: Number(raw.total_projetos || 0),
    total_turmas: Number(raw.total_turmas || 0),
    vagas_totais: Number(raw.vagas_totais || 0),
    matriculados: Number(raw.matriculados || 0),
    vagas_restantes: Number(raw.vagas_restantes || 0),
  };
}

export default function ModalEixoEnsinoMedio({
  aberto,
  onClose,
  onSalvo,
  eixoEditando = null,
}) {
  const isEdicao = Boolean(eixoEditando?.codigo);

  const [titulo, setTitulo] = useState("");
  const [labelMobile, setLabelMobile] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [descricaoCurta, setDescricaoCurta] = useState("");
  const [corTema, setCorTema] = useState("indigo");
  const [iconeEmoji, setIconeEmoji] = useState("🎓");
  const [iconeMobile, setIconeMobile] = useState("school-outline");
  const [disciplinaTipo, setDisciplinaTipo] = useState("PROJETO");
  const [cargaSugerida, setCargaSugerida] = useState(2);
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    if (eixoEditando) {
      const norm = normalizarCardEixoVisual(eixoEditando);
      setTitulo(norm.titulo);
      setLabelMobile(norm.labelMobile);
      setSubtitulo(norm.subtitulo);
      setDescricaoCurta(norm.descricaoCurta);
      setCorTema(norm.corTema);
      setIconeEmoji(norm.iconeEmoji);
      setIconeMobile(norm.iconeMobile);
      setDisciplinaTipo(norm.disciplinaTipo || "PROJETO");
      setCargaSugerida(norm.cargaSugerida || 2);
      setAtivo(norm.ativo);
    } else {
      setTitulo("");
      setLabelMobile("");
      setSubtitulo("");
      setDescricaoCurta("");
      setCorTema("indigo");
      setIconeEmoji("🎓");
      setIconeMobile("school-outline");
      setDisciplinaTipo("PROJETO");
      setCargaSugerida(2);
      setAtivo(true);
    }
  }, [aberto, eixoEditando]);

  if (!aberto) return null;

  const temaAtual = TEMAS_VISUAIS_EIXOS[corTema] || TEMAS_VISUAIS_EIXOS.indigo;
  const labelMobilePreview = (
    labelMobile.trim() ||
    titulo.split(/[—\-:/]/)[0].trim() ||
    "NOVO EIXO"
  )
    .toUpperCase()
    .slice(0, 18);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error("Informe o título do Eixo de Oferta Semestral.");
      return;
    }

    const siglaFinal = (
      labelMobile.trim() ||
      titulo.split(/[—\-:/]/)[0].trim() ||
      titulo.trim()
    )
      .toUpperCase()
      .slice(0, 20);

    setSalvando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        sigla: siglaFinal,
        label_mobile: siglaFinal,
        subtitulo:
          subtitulo.trim() ||
          descricaoCurta.trim() ||
          "Eixo de oferta semestral da unidade escolar",
        descricao_curta:
          descricaoCurta.trim() ||
          subtitulo.trim() ||
          "Projetos semestrais ofertados pela unidade escolar para escolha dos estudantes.",
        cor_tema: corTema,
        icone_emoji: iconeEmoji,
        icone_mobile: iconeMobile,
        disciplina_tipo: disciplinaTipo,
        carga_sugerida: Number(cargaSugerida || 2),
        ativo,
      };

      let res;
      if (isEdicao) {
        res = await api.put(
          `/api/matriculas/projetos/eixos/${encodeURIComponent(eixoEditando.codigo)}`,
          payload
        );
        toast.success(res.data?.message || "Eixo atualizado com sucesso!");
      } else {
        res = await api.post("/api/matriculas/projetos/eixos", payload);
        toast.success(res.data?.message || "Novo eixo semestral criado!");
      }

      if (onSalvo) onSalvo(res.data?.eixo);
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Não foi possível salvar o Eixo de Oferta Semestral."
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fadeIn">
        {/* Cabeçalho */}
        <div
          className={`bg-gradient-to-r ${temaAtual.corGradiente} px-6 py-5 text-white`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/20">
                {iconeEmoji}
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                  {isEdicao
                    ? "Configurar Eixo de Oferta Semestral"
                    : "Autonomia da Direção • Novo Eixo Semestral"}
                </span>
                <h2 className="text-xl font-bold mt-1 leading-tight">
                  {titulo.trim() || "Novo Eixo de Oferta Semestral"}
                </h2>
                <p className="text-xs text-white/85 mt-0.5">
                  Sincronizado com o módulo Projetos no aplicativo Educa Mobile
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
              title="Fechar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[78vh] overflow-y-auto"
        >
          {/* Título + Rótulo Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Título do Eixo na Secretaria <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={120}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: FTP — Formação Técnica e Profissional"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Rótulo no App Mobile <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={18}
                value={labelMobile}
                onChange={(e) => setLabelMobile(e.target.value.toUpperCase())}
                placeholder="Ex: FTP TÉCNICO"
                className="w-full px-3.5 py-2.5 text-sm font-bold uppercase rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          {/* Descrição do Card */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Descrição Curta do Eixo (exibida no Card)
            </label>
            <textarea
              rows={2}
              maxLength={240}
              value={descricaoCurta}
              onChange={(e) => setDescricaoCurta(e.target.value)}
              placeholder="Descreva brevemente a proposta pedagógica deste eixo semestral na unidade escolar..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
            />
          </div>

          {/* Seletor de Cor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Cor de Identificação do Card
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Object.values(TEMAS_VISUAIS_EIXOS).map((t) => {
                const sel = corTema === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCorTema(t.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                      sel
                        ? `${t.corBgSuave} ${t.corTexto} ${t.corBorda} ring-2 ${t.corAnel}`
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full ${t.amostra}`} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Ícone (Web + App Educa Mobile) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ícone do Eixo (Web + App Educa Mobile)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OPCOES_ICONES_EIXO.map((op) => {
                const sel =
                  iconeEmoji === op.emoji && iconeMobile === op.mobile;
                return (
                  <button
                    key={op.mobile + op.emoji}
                    type="button"
                    onClick={() => {
                      setIconeEmoji(op.emoji);
                      setIconeMobile(op.mobile);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                      sel
                        ? "bg-indigo-50 text-indigo-800 border-indigo-300 ring-2 ring-indigo-500"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg">{op.emoji}</span>
                    <span className="truncate">{op.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classificação Curricular Base + Carga Sugerida */}
          {!eixoEditando?.padraoSistema && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Natureza Curricular (Modulação / Diário)
                </label>
                <select
                  value={disciplinaTipo}
                  onChange={(e) => setDisciplinaTipo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:border-indigo-500 outline-none cursor-pointer"
                >
                  {TIPOS_DISCIPLINA_BASE.map((tp) => (
                    <option key={tp.value} value={tp.value}>
                      {tp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Carga Padrão (Aulas)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cargaSugerida}
                  onChange={(e) => setCargaSugerida(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Preview Educa Mobile + Botão Pill ON/OFF */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-base">
                  {iconeEmoji}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <DevicePhoneMobileIcon className="w-4 h-4 text-emerald-600" />
                  Prévia no App Educa Mobile:
                </div>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                  Card &ldquo;{labelMobilePreview}&rdquo;
                </p>
                <p className="text-xs text-slate-500">
                  {ativo
                    ? "Ativo: será exibido para os estudantes do Ensino Médio no aplicativo."
                    : "Inativo: ficará oculto no aplicativo até que a escola ative o botão ON."}
                </p>
              </div>
            </div>

            {/* Pill Switch ON/OFF */}
            <button
              type="button"
              role="switch"
              aria-checked={ativo}
              onClick={() => setAtivo((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-extrabold transition cursor-pointer shrink-0 ${
                ativo
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-slate-200/70 border-slate-300 text-slate-600"
              }`}
            >
              <span>{ativo ? "ON" : "OFF"}</span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  ativo ? "bg-emerald-500" : "bg-slate-400"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    ativo ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${temaAtual.corGradiente} hover:opacity-95 shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60`}
            >
              {isEdicao ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <SparklesIcon className="w-5 h-5" />
              )}
              {salvando
                ? "Salvando..."
                : isEdicao
                ? "Salvar Eixo"
                : "Criar Eixo Semestral"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
