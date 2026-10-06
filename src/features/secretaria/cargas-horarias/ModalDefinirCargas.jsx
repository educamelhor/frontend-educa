// src/features/secretaria/cargas-horarias/ModalDefinirCargas.jsx
// ============================================================================
// Modal – Definir Cargas por Disciplina (Padrão Premium)
// ----------------------------------------------------------------------------
// Objetivo:
// - Modal visual Premium com layout amplo e responsivo (sem truncar textos).
// - Vincular componentes curriculares a uma turma e definir a carga horária
//   específica (aulas/semana) de cada disciplina nesta turma.
// - Modal de confirmação pré-salvamento exibindo o total de aulas da turma.
// - Salvar a definição via POST /api/cargas-horarias/definir.
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  XMarkIcon,
  AcademicCapIcon,
  ClockIcon,
  SparklesIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import api from "../../../services/api";

const asId = (v) => (v == null ? "" : String(v));

export default function ModalDefinirCargas({
  open = true,
  turno,
  turma,
  onClose,
  semestre = 1,
}) {
  const [qtd, setQtd] = useState(1);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // Cada slot guarda: { disciplina_id: string, carga: number | string }
  const [itens, setItens] = useState([]);
  const [saving, setSaving] = useState(false);

  // Modal de confirmação pré-salvamento
  const [modalConfirmacaoOpen, setModalConfirmacaoOpen] = useState(false);

  const escola_id = useMemo(() => localStorage.getItem("escola_id") || 1, []);
  const nomeTurma = turma?.turma ?? turma?.nome ?? "Turma Regular";

  // --------------------------------------------------------------------------
  // Carga inicial: disciplinas disponíveis + cargas já vinculadas à turma
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!open || !turma) return;

    async function load() {
      setLoading(true);
      setErro("");
      try {
        // 1) Disciplinas regulares do turno e etapa da turma
        const [resDiscs, resCargas] = await Promise.all([
          api.get("/api/disciplinas", {
            params: {
              escola_id,
              turno: turma?.turno || turno,
              etapa: turma?.etapa,
              modo_oferta: "TURMA",
              apenas_regulares: true,
            },
          }),
          turma?.id
            ? api
                .get("/api/cargas-horarias", {
                  params: { turma_id: turma.id, semestre },
                })
                .catch(() => ({ data: { itens: [] } }))
            : Promise.resolve({ data: { itens: [] } }),
        ]);

        const rawDiscs = Array.isArray(resDiscs.data) ? resDiscs.data : [];
        const normalizadas = rawDiscs.map((d, i) => ({
          id: asId(d.id ?? d.codigo ?? `disc-${i}`),
          nome: d.nome ?? d.disciplina ?? d.titulo ?? `Disciplina ${i + 1}`,
          ...d,
        }));
        setDisciplinas(normalizadas);

        // 2) Cargas já existentes da turma
        const itensSalvos = Array.isArray(resCargas.data?.itens) ? resCargas.data.itens : [];
        if (itensSalvos.length > 0) {
          setQtd(itensSalvos.length);
          setItens(
            itensSalvos.map((it) => ({
              disciplina_id: asId(it.disciplina_id),
              carga: Number(it.carga) > 0 ? Number(it.carga) : 2,
            }))
          );
        } else {
          setQtd(1);
          setItens([{ disciplina_id: "", carga: 2 }]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do modal de cargas:", err);
        setErro("Não foi possível carregar as disciplinas do turno.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, turno, turma?.id, turma?.turno, turma?.etapa, escola_id, semestre]);

  // --------------------------------------------------------------------------
  // Sincroniza o array 'itens' quando 'qtd' muda
  // --------------------------------------------------------------------------
  const handleQtdChange = (novaQtd) => {
    const val = novaQtd === "" ? "" : Math.max(1, Math.min(35, Number(novaQtd) || 1));
    setQtd(novaQtd);
    if (val !== "") {
      setItens((prev) => {
        const novo = [...prev];
        if (val > novo.length) {
          for (let i = novo.length; i < val; i++) {
            novo.push({ disciplina_id: "", carga: 2 });
          }
        } else if (val < novo.length) {
          novo.splice(val);
        }
        return novo;
      });
    }
  };

  const linhas = useMemo(() => {
    const n = Math.max(0, Math.min(35, Number(qtd) || 0));
    return Array.from({ length: n }, (_, idx) => idx);
  }, [qtd]);

  // Conjunto de disciplinas já escolhidas para desabilitar duplicidade
  const escolhidasSet = useMemo(() => {
    return new Set(
      itens
        .slice(0, Number(qtd) || 0)
        .map((it) => asId(it?.disciplina_id))
        .filter(Boolean)
    );
  }, [itens, qtd]);

  // --------------------------------------------------------------------------
  // Handlers de edição por linha
  // --------------------------------------------------------------------------
  const handleSelectDisciplina = (index, idDisc) => {
    const idStr = asId(idDisc);
    setItens((prev) => {
      const novo = [...prev];
      const atual = novo[index] || { disciplina_id: "", carga: 2 };
      novo[index] = {
        ...atual,
        disciplina_id: idStr || "",
        carga: atual.carga ? atual.carga : 2,
      };
      return novo;
    });
  };

  const handleCargaChange = (index, valorCarga) => {
    const valor = valorCarga === "" ? "" : Math.max(1, Math.min(30, Number(valorCarga) || 1));
    setItens((prev) => {
      const novo = [...prev];
      const atual = novo[index] || { disciplina_id: "", carga: 2 };
      novo[index] = {
        ...atual,
        carga: valor,
      };
      return novo;
    });
  };

  const handleLimparLinha = (index) => {
    setItens((prev) => {
      const novo = [...prev];
      if (novo[index]) {
        novo[index] = { disciplina_id: "", carga: 2 };
      }
      return novo;
    });
  };

  // --------------------------------------------------------------------------
  // Linhas válidas e totais
  // --------------------------------------------------------------------------
  const linhasValidas = useMemo(() => {
    return linhas
      .map((i) => {
        const item = itens[i];
        if (!item || !item.disciplina_id) return null;
        const discObj = disciplinas.find((d) => asId(d.id) === asId(item.disciplina_id));
        return {
          index: i,
          disciplina_id: Number(item.disciplina_id),
          nomeDisciplina: discObj?.nome || `Disciplina #${item.disciplina_id}`,
          carga: Number(item.carga) || 1,
        };
      })
      .filter(Boolean);
  }, [linhas, itens, disciplinas]);

  const totalCarga = useMemo(() => {
    return linhasValidas.reduce((acc, it) => acc + (Number(it.carga) || 0), 0);
  }, [linhasValidas]);

  const linhasVaziasCount = useMemo(() => {
    const n = Math.max(0, Number(qtd) || 0);
    return Math.max(0, n - linhasValidas.length);
  }, [qtd, linhasValidas]);

  const podeProsseguir = linhasValidas.length > 0;

  // --------------------------------------------------------------------------
  // Abertura do Modal de Confirmação
  // --------------------------------------------------------------------------
  const handleAbrirConfirmacao = () => {
    if (linhasValidas.length === 0) {
      setErro("Selecione ao menos um componente curricular e defina sua carga horária antes de salvar.");
      return;
    }
    setErro("");
    setModalConfirmacaoOpen(true);
  };

  // --------------------------------------------------------------------------
  // Confirmação e Salvamento Final via API
  // --------------------------------------------------------------------------
  async function handleSalvarFinal() {
    try {
      setSaving(true);
      setErro("");

      const payload = {
        escola_id,
        turma_id: turma?.id,
        semestre,
        itens: linhasValidas.map((it) => ({
          disciplina_id: it.disciplina_id,
          carga: it.carga,
        })),
      };

      const { data } = await api.post("/api/cargas-horarias/definir", payload);

      setModalConfirmacaoOpen(false);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar cargas:", err?.response?.data || err?.message);
      const msg = err?.response?.data?.message || "Erro ao salvar cargas da turma. Tente novamente.";
      setErro(msg);
      setModalConfirmacaoOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open || !turma) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-all animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* CABEÇALHO PREMIUM COM GRADIENTE                                  */}
        {/* ================================================================= */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-800 p-5 sm:p-6 flex justify-between items-center text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full translate-x-20 -translate-y-20 blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3.5 relative z-10 min-w-0 pr-2">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner flex items-center justify-center flex-shrink-0">
              <AcademicCapIcon className="w-7 h-7 text-white" />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
                Definir Cargas por Disciplina
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-blue-100 mt-1">
                <span>
                  Turma: <strong className="text-white uppercase">{nomeTurma}</strong>
                </span>
                <span className="text-blue-300">•</span>
                <span>
                  Turno: <strong className="text-white uppercase">{turno}</strong>
                </span>
                {turma?.etapa && (
                  <>
                    <span className="text-blue-300">•</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/15 text-white font-bold text-[10px] uppercase border border-white/20">
                      {turma.etapa}
                    </span>
                  </>
                )}
                {turma?.regime === "semestral" && (
                  <>
                    <span className="text-blue-300">•</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-200 font-bold text-[10px] border border-amber-300/30">
                      {semestre}º Semestre
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all text-white z-10 cursor-pointer flex-shrink-0"
            title="Fechar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagens de Erro */}
        {erro && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center gap-2 flex-shrink-0">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* PAINEL DE CONTROLE DE LINHAS                                      */}
        {/* ================================================================= */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl flex-shrink-0">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Composição da Matriz Curricular
              </h4>
              <p className="text-[11px] text-slate-500">
                Selecione os componentes e informe a carga horária semanal (aulas) de cada um.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Total de Linhas:
            </span>
            <button
              type="button"
              onClick={() => handleQtdChange(Math.max(1, (Number(qtd) || 1) - 1))}
              disabled={Number(qtd) <= 1}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer text-sm"
              title="Diminuir uma linha"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={35}
              value={qtd}
              onChange={(e) => handleQtdChange(e.target.value)}
              className="w-12 text-center font-extrabold text-sm text-slate-800 bg-transparent border-0 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleQtdChange(Math.min(35, (Number(qtd) || 0) + 1))}
              disabled={Number(qtd) >= 35}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer text-sm"
              title="Adicionar uma linha"
            >
              +
            </button>
            <span className="text-xs font-semibold text-slate-400">disciplinas</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CORPO ROLÁVEL COM AS LINHAS DE DISCIPLINAS                       */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/40">
          {loading ? (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-sm font-medium text-slate-500 animate-pulse flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Carregando catálogo de componentes curriculares…</span>
            </div>
          ) : (
            <>
              {linhas.map((i) => {
                const item = itens[i] || { disciplina_id: "", carga: 2 };
                const valorId = asId(item.disciplina_id);

                return (
                  <div
                    key={i}
                    className="p-3 bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    {/* Número da Linha */}
                    <div className="flex items-center gap-2 sm:w-24 flex-shrink-0">
                      <span className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold flex items-center justify-center text-xs shadow-2xs">
                        {i + 1}º
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Comp.
                      </span>
                    </div>

                    {/* Dropdown com a Disciplina (amplo, sem truncar nomes) */}
                    <div className="flex-1 min-w-[240px]">
                      <select
                        value={valorId}
                        onChange={(e) => handleSelectDisciplina(i, e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none uppercase transition shadow-2xs"
                      >
                        <option value="">— Selecione a disciplina —</option>
                        {disciplinas.map((d) => {
                          const idStr = asId(d.id);
                          const escolhidaEmOutraLinha =
                            escolhidasSet.has(idStr) && valorId !== idStr;
                          return (
                            <option
                              key={idStr}
                              value={idStr}
                              disabled={escolhidaEmOutraLinha}
                            >
                              {d.nome} {escolhidaEmOutraLinha ? "(já selecionada)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Input de Carga Horária Individual */}
                    <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex-shrink-0">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Carga:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={item.carga ?? ""}
                        onChange={(e) => handleCargaChange(i, e.target.value)}
                        placeholder="2"
                        className="w-14 px-2 py-1 text-center font-black text-indigo-900 bg-white border border-slate-300 rounded-lg text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-600">aulas</span>
                    </div>

                    {/* Botão de Limpar Linha */}
                    <button
                      type="button"
                      onClick={() => handleLimparLinha(i)}
                      title="Limpar seleção desta linha"
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer flex-shrink-0 self-end sm:self-center"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {linhas.length === 0 && (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                  Defina a quantidade de disciplinas acima para preencher os componentes.
                </div>
              )}
            </>
          )}
        </div>

        {/* ================================================================= */}
        {/* RODAPÉ DO MODAL COM TOTAL E AÇÕES                                */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
              Carga Total da Turma:
            </span>
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-2xs">
              <ClockIcon className="w-4 h-4 text-emerald-600" />
              <span>
                {totalCarga} {totalCarga === 1 ? "aula semanal" : "aulas semanais"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={!podeProsseguir || saving}
              onClick={handleAbrirConfirmacao}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer ${
                podeProsseguir && !saving
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
              }`}
              title={
                podeProsseguir
                  ? "Revisar e confirmar definição de cargas"
                  : "Selecione ao menos uma disciplina com carga para salvar"
              }
            >
              <span>Salvar Cargas</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL DE CONFIRMAÇÃO PREMIUM                                        */}
      {/* =================================================================== */}
      {modalConfirmacaoOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all animate-fadeIn"
          onClick={() => !saving && setModalConfirmacaoOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header de Confirmação */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-800 p-6 text-white text-center relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-12 -translate-y-12 blur-2xl pointer-events-none" />
              <div className="mx-auto w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 mb-3 shadow-inner">
                <ClockIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Confirmar Definição de Cargas
              </h3>
              <p className="text-blue-100 text-xs mt-1">
                Turma: <strong className="text-white uppercase">{nomeTurma}</strong> • Turno:{" "}
                <strong className="text-white uppercase">{turno}</strong>
                {turma?.regime === "semestral" && ` • ${semestre}º Semestre`}
              </p>
            </div>

            {/* Conteúdo do Modal de Confirmação */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Card Destaque: Total de Carga Horária */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 text-center shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                  Carga Horária Total Vinculada
                </span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-800 flex items-center justify-center gap-2">
                  <span>{totalCarga}</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-600 uppercase">
                    {totalCarga === 1 ? "aula semanal" : "aulas semanais"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Distribuída em <strong>{linhasValidas.length} componentes curriculares</strong>
                  </span>
                </div>
              </div>

              {/* Lista Detalhada dos Componentes e suas Cargas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Componentes e Cargas ({linhasValidas.length}):
                  </h5>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Aulas / semana
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200/80 rounded-2xl p-2.5 bg-slate-50/70">
                  {linhasValidas.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold flex items-center justify-center text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span
                          className="font-bold text-slate-800 uppercase text-xs truncate"
                          title={item.nomeDisciplina}
                        >
                          {item.nomeDisciplina}
                        </span>
                      </div>
                      <span className="font-black text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex-shrink-0">
                        {item.carga} {Number(item.carga) === 1 ? "aula" : "aulas"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerta se houver linhas em branco não preenchidas */}
              {linhasVaziasCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    {linhasVaziasCount} linha(s) em branco não serão vinculadas à turma.
                  </span>
                </div>
              )}
            </div>

            {/* Rodapé de Ações da Confirmação */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setModalConfirmacaoOpen(false)}
                disabled={saving}
                className="flex-1 py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer text-center"
              >
                Retornar para Ajustar
              </button>

              <button
                type="button"
                onClick={handleSalvarFinal}
                disabled={saving}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando…</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                    <span>Confirmar e Salvar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
