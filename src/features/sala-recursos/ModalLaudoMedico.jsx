// src/features/sala-recursos/ModalLaudoMedico.jsx
import React, { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import {
  XMarkIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  LockClosedIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  TrashIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";

const TIPOS_DOCUMENTO = [
  { id: "Laudo Médico", label: "Laudo Médico Pericial", icon: "📋", desc: "Diagnóstico formal emitido por médico especialista com CID" },
  { id: "Atestado Médico", label: "Atestado / Declaração", icon: "🩺", desc: "Atestado de comparecimento, afastamento ou declaração clínica" },
  { id: "Avaliação Psicológica", label: "Avaliação Psicológica / Neuropsico", icon: "🧠", desc: "Relatório de avaliação cognitiva, psicopedagógica ou neuropsicológica" },
  { id: "Relatório Terapêutico", label: "Relatório Fonoaudiológico / T.O.", icon: "🗣️", desc: "Pareceres de terapias externas (Fonoaudiologia, Terapia Ocupacional, Fisioterapia)" },
  { id: "Relatório Multidisciplinar", label: "Relatório Multidisciplinar / Outro", icon: "📄", desc: "Outros documentos comprobatórios ou relatórios de equipe multiprofissional" }
];

const CID_SUGESTOES = [
  { cid: "F84.0", desc: "Autismo Infantil" },
  { cid: "F84.1", desc: "Autismo Atípico" },
  { cid: "F84.5", desc: "Síndrome de Asperger" },
  { cid: "F90.0", desc: "TDAH (Desatenção/Hiperatividade)" },
  { cid: "F70", desc: "Deficiência Intelectual Leve" },
  { cid: "F71", desc: "Deficiência Intelectual Moderada" },
  { cid: "G80", desc: "Paralisia Cerebral" },
  { cid: "H54", desc: "Baixa Visão / Cegueira" },
  { cid: "H90", desc: "Perda Auditiva Condutiva/Neurossensorial" }
];

export default function ModalLaudoMedico({
  isOpen,
  onClose,
  aluno,
  laudo = null,
  onSuccess
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    tipo_documento: "Laudo Médico",
    titulo: "",
    cid: "",
    diagnostico: "",
    medico_nome: "",
    medico_crm: "",
    medico_especialidade: "Neuropediatria",
    data_laudo: "",
    data_validade: "",
    medicamentos: "",
    acompanhamento_externo: "",
    observacoes: ""
  });

  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErro("");
    setArquivoSelecionado(null);
    setPreviewUrl(null);

    if (laudo) {
      setForm({
        tipo_documento: laudo.tipo_documento || "Laudo Médico",
        titulo: laudo.titulo || "",
        cid: laudo.cid || "",
        diagnostico: laudo.diagnostico || "",
        medico_nome: laudo.medico_nome || "",
        medico_crm: laudo.medico_crm || "",
        medico_especialidade: laudo.medico_especialidade || "Neuropediatria",
        data_laudo: laudo.data_laudo || "",
        data_validade: laudo.data_validade || "",
        medicamentos: laudo.medicamentos || "",
        acompanhamento_externo: laudo.acompanhamento_externo || "",
        observacoes: laudo.observacoes || ""
      });
    } else {
      setForm({
        tipo_documento: "Laudo Médico",
        titulo: "",
        cid: "",
        diagnostico: "",
        medico_nome: "",
        medico_crm: "",
        medico_especialidade: "Neuropediatria",
        data_laudo: new Date().toISOString().slice(0, 10),
        data_validade: "",
        medicamentos: "",
        acompanhamento_externo: "",
        observacoes: ""
      });
    }
  }, [isOpen, laudo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processarArquivo(file);
  };

  const processarArquivo = (file) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setErro("Formato não suportado. Por favor, selecione um arquivo PDF ou Imagem (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErro("O arquivo excede o limite máximo permitido de 25MB.");
      return;
    }

    setErro("");
    setArquivoSelecionado(file);

    // Se for imagem, gera preview
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Auto-preenche título caso esteja em branco
    if (!form.titulo) {
      const nomeBase = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setForm((prev) => ({
        ...prev,
        titulo: prev.titulo || (prev.tipo_documento + " - " + nomeBase)
      }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastando(true);
  };

  const handleDragLeave = () => {
    setArrastando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  const handleRemoverArquivo = () => {
    setArquivoSelecionado(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSalvar = async () => {
    if (!aluno?.id) return;
    if (!form.cid && !form.diagnostico && !form.titulo) {
      setErro("Informe ao menos o Título do Documento, Código CID ou a descrição do Diagnóstico.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const formData = new FormData();
      formData.append("tipo_documento", form.tipo_documento || "Laudo Médico");
      formData.append("titulo", form.titulo || "");
      formData.append("cid", form.cid || "");
      formData.append("diagnostico", form.diagnostico || "");
      formData.append("medico_nome", form.medico_nome || "");
      formData.append("medico_crm", form.medico_crm || "");
      formData.append("medico_especialidade", form.medico_especialidade || "Neuropediatria");
      formData.append("data_laudo", form.data_laudo || "");
      formData.append("data_validade", form.data_validade || "");
      formData.append("medicamentos", form.medicamentos || "");
      formData.append("acompanhamento_externo", form.acompanhamento_externo || "");
      formData.append("observacoes", form.observacoes || "");

      if (arquivoSelecionado) {
        formData.append("arquivo", arquivoSelecionado);
      }

      const headers = { "Content-Type": "multipart/form-data" };

      if (laudo?.id) {
        await api.put(`/api/sala-recursos/laudos/${laudo.id}`, formData, { headers });
      } else {
        await api.post(`/api/sala-recursos/alunos/${aluno.id}/laudos`, formData, { headers });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar laudo:", err);
      setErro(err.response?.data?.message || "Erro ao salvar e criptografar documento.");
    } finally {
      setSalvando(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fadeIn">
        {/* ── Topo Premium com Selo de Segurança LGPD ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-5 text-white flex items-start justify-between border-b border-blue-950">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner mt-0.5">
              <ShieldCheckIcon className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {laudo ? "Editar Documento / Laudo AEE" : "Identificação & Dossiê de Documento Médico"}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <LockClosedIcon className="w-3 h-3 inline" /> AES-256 LGPD
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1">
                Estudante: <strong className="text-white font-semibold">{aluno?.estudante}</strong> (Cód: {aluno?.codigo || "—"}) • {aluno?.turma_nome || "Sala de Recursos"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* ── Formulário do Modal ── */}
        <div className="p-6 sm:p-7 space-y-6 max-h-[78vh] overflow-y-auto custom-scrollbar">
          {erro && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
              <InformationCircleIcon className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{erro}</span>
            </div>
          )}

          {/* 1. SELEÇÃO DO TIPO DE DOCUMENTO */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              1. Tipo de Documento / Comprobatório *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {TIPOS_DOCUMENTO.map((t) => {
                const ativo = form.tipo_documento === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setForm((prev) => ({ ...prev, tipo_documento: t.id }))}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      ativo
                        ? "bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/30 shadow-sm"
                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.icon}</span>
                      <span className={`text-xs font-bold ${ativo ? "text-blue-950" : "text-slate-800"}`}>
                        {t.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ÁREA DE BUSCA / DROPZONE DE ARQUIVOS */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              2. Arquivo Digitalizado / Documento (.PDF ou Imagem)
            </label>

            {/* Input oculto acionado pelo botão */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
            />

            {!arquivoSelecionado && !laudo?.arquivo_nome_original ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                  arrastando
                    ? "border-blue-600 bg-blue-50/50 scale-[1.01]"
                    : "border-slate-300 bg-slate-50/70 hover:bg-blue-50/40 hover:border-blue-400"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shadow-sm">
                  <CloudArrowUpIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Clique aqui para buscar o arquivo no seu computador
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ou arraste o arquivo PDF ou foto do documento para esta área
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium shadow-2xs">
                  <span>📄 Suporta: <strong>PDF, JPG, PNG, WEBP</strong></span>
                  <span>•</span>
                  <span>Máx: <strong>25 MB</strong></span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {previewUrl ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 shadow-sm flex-shrink-0 bg-white">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <PhotoIcon className="w-5 h-5 text-white drop-shadow" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                      <DocumentIcon className="w-7 h-7" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {arquivoSelecionado ? arquivoSelecionado.name : laudo?.arquivo_nome_original}
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-emerald-100 text-emerald-800">
                        {arquivoSelecionado?.type?.startsWith("image/") ? "Imagem → PDF A4" : "PDF"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{arquivoSelecionado ? formatFileSize(arquivoSelecionado.size) : (laudo?.arquivo_tamanho ? formatFileSize(laudo.arquivo_tamanho) : "Armazenado")}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <LockClosedIcon className="w-3 h-3" /> Criptografia AES-256
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-2xs transition-colors"
                  >
                    Trocar Arquivo
                  </button>
                  {arquivoSelecionado && (
                    <button
                      type="button"
                      onClick={handleRemoverArquivo}
                      className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                      title="Remover arquivo"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. DADOS DE IDENTIFICAÇÃO E DIAGNÓSTICO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Título / Descrição de Identificação do Documento *
              </label>
              <input
                type="text"
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                placeholder="Ex: Laudo Neuropediátrico 2026 - TEA Grau 1"
                className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Classificação CID (CID-10 ou CID-11)
                </label>
              </div>
              <input
                type="text"
                name="cid"
                value={form.cid}
                onChange={handleChange}
                placeholder="Ex.: F84.0, F90.0, G80, H54..."
                className="w-full text-sm font-bold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600 bg-amber-50/40 text-amber-950"
              />
              {/* Sugestões Rápidas de CID */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {CID_SUGESTOES.slice(0, 5).map((s) => (
                  <button
                    type="button"
                    key={s.cid}
                    onClick={() => setForm((prev) => ({ ...prev, cid: s.cid, diagnostico: prev.diagnostico || s.desc }))}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 font-semibold transition-colors"
                  >
                    +{s.cid}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Especialidade do Profissional
              </label>
              <input
                type="text"
                name="medico_especialidade"
                value={form.medico_especialidade}
                onChange={handleChange}
                placeholder="Ex: Neuropediatria, Psiquiatria, Fonoaudiologia"
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Descrição do Diagnóstico Clínico / Parecer
              </label>
              <textarea
                name="diagnostico"
                value={form.diagnostico}
                onChange={handleChange}
                rows={2}
                placeholder="Ex: Transtorno do Espectro Autista (TEA) - Nível de suporte 1 com necessidades pedagógicas adaptadas..."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Profissional Emissor
              </label>
              <input
                type="text"
                name="medico_nome"
                value={form.medico_nome}
                onChange={handleChange}
                placeholder="Ex: Dra. Juliana Santos"
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Registro Profissional (CRM / CRP / CREFITO)
              </label>
              <input
                type="text"
                name="medico_crm"
                value={form.medico_crm}
                onChange={handleChange}
                placeholder="Ex: CRM-DF 12345"
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Data de Emissão do Documento
              </label>
              <input
                type="date"
                name="data_laudo"
                value={form.data_laudo}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Validade / Data de Revisão
              </label>
              <input
                type="date"
                name="data_validade"
                value={form.data_validade}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Medicamentos em Uso (se houver)
              </label>
              <input
                type="text"
                name="medicamentos"
                value={form.medicamentos}
                onChange={handleChange}
                placeholder="Ex: Risperidona 1mg pela manhã, Metilfenidato..."
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Acompanhamentos Multiprofissionais Externos
              </label>
              <input
                type="text"
                name="acompanhamento_externo"
                value={form.acompanhamento_externo}
                onChange={handleChange}
                placeholder="Ex: Terapia Ocupacional (2x semana), Fonoaudiologia no CAPS..."
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Observações e Recomendações Pedagógicas
              </label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                rows={2}
                placeholder="Observações complementares importantes para os professores e equipe AEE..."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* 4. BANNER DE INFORMAÇÃO LGPD */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <LockClosedIcon className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Privacidade & Rastreabilidade LGPD (Art. 5º e 14):</p>
              <p className="mt-0.5 text-amber-800">
                O arquivo é criptografado com chave de 256 bits no servidor. O download deste documento PDF será <strong>protegido com a sua senha pessoal de login</strong> e todos os acessos são registrados na trilha de auditoria da unidade escolar.
              </p>
            </div>
          </div>
        </div>

        {/* ── Rodapé do Modal ── */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            <LockClosedIcon className="w-4 h-4" />
            {salvando ? "Criptografando & Salvando..." : (laudo ? "Atualizar Documento" : "Salvar & Criptografar Documento")}
          </button>
        </div>
      </div>
    </div>
  );
}
