// src/features/secretaria/turmas/TurmaForm.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  XMarkIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";
import api from "../../../services/api";

function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

export default function TurmaForm({ open, onClose, onSubmit, turma }) {
  const anoAtual = String(anoLetivoPadrao());
  const [etapasList, setEtapasList] = useState([]);

  useEffect(() => {
    if (open) {
      api
        .get("/api/etapas")
        .then((res) => setEtapasList(res.data || []))
        .catch((err) => console.error("Erro ao buscar etapas no TurmaForm:", err));
    }
  }, [open]);

  const [form, setForm] = useState({
    escola_id: "",
    nome: "",
    etapa: "",
    ano: anoAtual,
    turno: "",
    serie: "",
    regime: "anual",
  });

  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  // Opções de série padronizadas para cada etapa
  const opcoesSerie = {
    INFANTIL: [
      "1º PERÍODO",
      "2º PERÍODO",
      "1º ANO",
      "2º ANO",
      "3º ANO",
      "4º ANO",
      "5º ANO",
    ],
    FUNDAMENTAL: ["6º ANO", "7º ANO", "8º ANO", "9º ANO"],
    MÉDIO: ["1ª SÉRIE", "2ª SÉRIE", "3ª SÉRIE"],
    EJA: [
      "1º SEGMENTO",
      "2º SEGMENTO",
      "3º SEGMENTO",
      "1ª ETAPA",
      "2ª ETAPA",
      "3ª ETAPA",
    ],
  };

  const normalizarTexto = (str = "") =>
    String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[º°ª]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  const getOpcoesSerieParaEtapa = (etapa) => {
    if (!etapa) return null;
    const etp = String(etapa).trim().toUpperCase();
    if (etp.includes("INFANTIL") || etp.includes("CRECHE")) {
      return opcoesSerie.INFANTIL;
    }
    if (etp.includes("FUNDAMENTAL")) {
      return opcoesSerie.FUNDAMENTAL;
    }
    if (etp.includes("MÉDIO") || etp.includes("MEDIO")) {
      return opcoesSerie.MÉDIO;
    }
    if (etp.includes("EJA")) {
      return opcoesSerie.EJA;
    }
    return opcoesSerie[etp] || null;
  };

  useEffect(() => {
    if (!open) return;

    const escolaIdLogin = localStorage.getItem("escola_id") || "";

    if (turma) {
      const etapaTurma = turma.etapa ? String(turma.etapa).trim().toUpperCase() : "";
      const serieOriginal = turma.serie ? String(turma.serie).trim() : "";
      const opcoesDisponiveis = getOpcoesSerieParaEtapa(etapaTurma) || [];

      // Procura correspondência normalizada na lista de séries da etapa
      const optEncontrada = opcoesDisponiveis.find(
        (op) => normalizarTexto(op) === normalizarTexto(serieOriginal)
      );

      setForm({
        id: turma.id ?? null,
        escola_id: turma.escola_id ?? escolaIdLogin ?? "",
        nome: turma.nome ?? turma.turma ?? "",
        etapa: etapaTurma,
        ano: turma.ano ?? anoAtual,
        turno: turma.turno?.toUpperCase() ?? "",
        serie: optEncontrada || (serieOriginal ? serieOriginal.toUpperCase() : ""),
        regime: turma.regime ? String(turma.regime).trim().toLowerCase() : "anual",
      });
    } else {
      setForm({
        escola_id: escolaIdLogin,
        nome: "",
        etapa: "",
        ano: anoAtual,
        turno: "",
        serie: "",
        regime: "anual",
      });
      setErrors({});
    }
  }, [open, turma, anoAtual]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) {
      setErrors((errs) => ({ ...errs, [name]: undefined }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.nome.trim()) errs.nome = "Nome da turma é obrigatório";
    if (!form.etapa) errs.etapa = "Etapa é obrigatória";
    if (!form.ano) errs.ano = "Ano é obrigatório";
    if (!form.turno) errs.turno = "Turno é obrigatório";
    if (!form.serie) errs.serie = "Série é obrigatória";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSending(true);
    const escolaIdLocal = localStorage.getItem("escola_id") || "";

    const dados = {
      ...(form.id ? { id: form.id } : {}),
      nome: form.nome.trim().toUpperCase(),
      etapa: form.etapa.trim().toUpperCase(),
      ano: String(form.ano).trim(),
      turno: form.turno.trim().toUpperCase(),
      serie: form.serie.trim().toUpperCase(),
      regime: form.regime || "anual",
      _escola_id_local: escolaIdLocal,
    };

    let result = false;
    try {
      result = await onSubmit(dados);
    } finally {
      setSending(false);
    }

    if (typeof result === "boolean") {
      if (result) onClose();
      return;
    }

    if (result && typeof result === "object") {
      if (result.ok) onClose();
      if (result.ok === false && result.message) {
        alert(result.message);
      }
    }
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-100 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Premium com Gradiente */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-800 p-6 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
              <BuildingOffice2Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {turma ? "Editar Turma Regular" : "Nova Turma Regular"}
              </h2>
              <p className="text-blue-100 text-xs mt-1">
                Cadastro e modulação da turma para a base curricular nacional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all text-white z-10 cursor-pointer"
            title="Fechar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Nome da Turma */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nome da Turma <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nome"
              placeholder="Ex: 1º ANO A, 2º ANO B, INFANTIL I..."
              value={form.nome}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold uppercase transition outline-none ${
                errors.nome
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              }`}
            />
            {errors.nome && (
              <p className="text-red-600 text-xs mt-1 font-medium">{errors.nome}</p>
            )}
          </div>

          {/* Grid: Etapa e Turno */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Etapa de Ensino <span className="text-red-500">*</span>
              </label>
              <select
                name="etapa"
                value={form.etapa}
                onChange={(e) => {
                  handleChange(e);
                  setForm((f) => ({ ...f, serie: "" }));
                }}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition bg-white outline-none uppercase ${
                  errors.etapa
                    ? "border-red-400 focus:border-red-500"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                }`}
              >
                <option value="">— Selecione a etapa —</option>
                {etapasList.length > 0 ? (
                  etapasList.map((etp) => (
                    <option key={etp.id} value={etp.nome.toUpperCase()}>
                      {etp.nome}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="INFANTIL">Infantil</option>
                    <option value="FUNDAMENTAL">Fundamental</option>
                    <option value="MÉDIO">Médio</option>
                  </>
                )}
              </select>
              {errors.etapa && (
                <p className="text-red-600 text-xs mt-1 font-medium">{errors.etapa}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Turno <span className="text-red-500">*</span>
              </label>
              <select
                name="turno"
                value={form.turno}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition bg-white outline-none uppercase ${
                  errors.turno
                    ? "border-red-400 focus:border-red-500"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                }`}
              >
                <option value="">— Selecione o turno —</option>
                <option value="MATUTINO">Matutino</option>
                <option value="VESPERTINO">Vespertino</option>
                <option value="NOTURNO">Noturno</option>
                <option value="INTEGRAL">Integral</option>
              </select>
              {errors.turno && (
                <p className="text-red-600 text-xs mt-1 font-medium">{errors.turno}</p>
              )}
            </div>
          </div>

          {/* Grid: Ano Letivo e Série */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Ano Letivo
              </label>
              <input
                name="ano"
                value={form.ano}
                readOnly
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-bold text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Série / Ano Escolar <span className="text-red-500">*</span>
              </label>
              {(() => {
                const opcoes = getOpcoesSerieParaEtapa(form.etapa);
                if (opcoes && opcoes.length > 0) {
                  const valorNormalizado = normalizarTexto(form.serie);
                  const optionCorrespondente = opcoes.find(
                    (op) => normalizarTexto(op) === valorNormalizado
                  );
                  const selectedVal = optionCorrespondente || form.serie;

                  return (
                    <select
                      name="serie"
                      value={selectedVal}
                      onChange={handleChange}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition bg-white outline-none uppercase ${
                        errors.serie
                          ? "border-red-400 focus:border-red-500"
                          : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      }`}
                    >
                      <option value="">— Selecione a série —</option>
                      {opcoes.map((serie, idx) => (
                        <option key={idx} value={serie}>
                          {serie}
                        </option>
                      ))}
                      {/* Se o valor atual da turma for customizado/não constar na lista padrão, mantém selecionado */}
                      {form.serie && !optionCorrespondente && (
                        <option value={form.serie}>{form.serie}</option>
                      )}
                    </select>
                  );
                }
                return (
                  <input
                    type="text"
                    name="serie"
                    placeholder="Ex: 1ª SÉRIE, 6º ANO..."
                    value={form.serie}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition outline-none uppercase ${
                      errors.serie
                        ? "border-red-400 focus:border-red-500"
                        : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    }`}
                  />
                );
              })()}
              {errors.serie && (
                <p className="text-red-600 text-xs mt-1 font-medium">{errors.serie}</p>
              )}
            </div>
          </div>

          {/* Regime Letivo (Anual vs Semestral) */}
          <div className="pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Regime de Oferta
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "anual",
                  label: "🗓️ Anual",
                  desc: "Grade e matriz iguais nos dois semestres",
                },
                {
                  value: "semestral",
                  label: "📅 Semestral",
                  desc: "Grade e modulação distintas por semestre",
                },
              ].map((op) => {
                const isSelected = form.regime === op.value;
                return (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, regime: op.value }))}
                    className={`flex flex-col items-center text-center p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm font-bold">{op.label}</span>
                    <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {op.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando…</span>
                </>
              ) : turma ? (
                "Salvar Alterações"
              ) : (
                "Cadastrar Turma"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
