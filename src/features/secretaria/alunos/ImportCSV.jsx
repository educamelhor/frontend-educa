// src/features/secretaria/alunos/ImportCSV.jsx
// -------------------------------------------------------
// Importação em lote de alunos via CSV (formato EDUCADF / portal SEEDF).
// - open:     boolean para exibir/ocultar
// - onClose:  fecha o modal
// - onFinish: callback disparado após importação com sucesso
//
// Fluxo:
//   1. Usuário clica em "Escolher arquivo" e seleciona o .csv
//   2. Extrai nome da turma do nome do arquivo
//   3. Consulta API para verificar se a turma já existe
//   3a. Se a turma existe em MAIS DE UM TURNO → modal premium de seleção de turno
//   4. Se existir em apenas um turno → prossegue com importação
//   5. Se NÃO existir → exibe modal premium instruindo o cadastro
//   6. Se CSV detectar alunos ausentes → modal premium de confirmação
//      de inativação (alunos transferidos)
// -------------------------------------------------------

import React, { useRef, useState } from "react";
import api from "../../../services/api";
import { Button } from "../../../components/ui/Button";

export default function ImportCSV({ open, onClose, onFinish }) {
  const fileRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Estado do modal "turma não encontrada"
  const [turmaNaoEncontrada, setTurmaNaoEncontrada] = useState(null); // { nome }

  // Estado do modal de CONFLITO DE TURNO (mesma turma em mais de um turno)
  const [turnoConflito, setTurnoConflito] = useState(null);
  // { turmaNome, opcoes: [{id, nome, turno, serie}], arquivo }

  // Estado do modal de confirmação de inativação
  const [pendentesModal, setPendentesModal] = useState(null);
  const [inativando, setInativando] = useState(false);

  if (!open) return null;

  // ─────────────────────────────────────────────
  // Normaliza nome de turma para comparação
  // ─────────────────────────────────────────────
  function normalizarTurma(s) {
    return (s || "")
      .replace(/Âº/g, "º")
      .replace(/Âª/g, "ª")
      .trim()
      .toUpperCase();
  }

  // ─────────────────────────────────────────────
  // Busca todas as turmas com o nome informado
  // Retorna array (pode ter 0, 1 ou várias)
  // ─────────────────────────────────────────────
  async function buscarTurmasPorNome(turmaNome) {
    try {
      const res = await api.get("/api/turmas");
      const turmas = res.data || [];
      const nomeNorm = normalizarTurma(turmaNome);
      return turmas.filter(
        (t) => normalizarTurma(t.turma || t.nome || "") === nomeNorm
      );
    } catch (err) {
      console.error("Erro ao buscar turmas:", err);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // Envia o CSV ao backend com a turma_id definida
  // ─────────────────────────────────────────────
  async function executarImportacao(file, turmaObj) {
    const formData = new FormData();
    formData.append("file", file);
    // Passa turma_id explicitamente para o backend não precisar resolver
    formData.append("turma_id", turmaObj.id);

    setProgress(0);
    setSubmitting(true);

    const turmaNome = turmaObj.turma || turmaObj.nome || file.name.replace(/\.csv$/i, "").trim();

    try {
      const { data } = await api.post("/api/alunos/importar-csv", formData, {
        timeout: 120_000,
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      const {
        localizados,
        inseridos,
        jaExistiam,
        inativados,
        reativados,
        pendentesInativacao,
      } = data || {};

      const resultado = {
        status: "sucesso",
        turma: turmaNome,
        turno: turmaObj.turno || "",
        localizados,
        inseridos,
        jaExistiam,
        reativados,
        inativados,
        message: `Turma ${turmaNome} (${turmaObj.turno || ""}) importada com sucesso.`,
      };

      if (Array.isArray(pendentesInativacao) && pendentesInativacao.length > 0) {
        onFinish && onFinish(resultado);
        setPendentesModal({
          turma: turmaNome,
          pendentes: pendentesInativacao,
          selecionados: new Set(pendentesInativacao.map((p) => p.id)),
        });
      } else {
        onFinish && onFinish(resultado);
        onClose && onClose();
      }
    } catch (err) {
      console.error("Erro na importação CSV:", err);
      const errData = err?.response?.data;
      if (errData?.code === "TURMA_NAO_ENCONTRADA") {
        setTurmaNaoEncontrada({ nome: errData.turmaNaoEncontrada || turmaNome });
      } else {
        onFinish && onFinish({
          status: "erro",
          message: errData?.message || err?.message || "Erro ao importar arquivo CSV.",
        });
        onClose && onClose();
      }
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  }

  // ─────────────────────────────────────────────
  // Confirma inativação dos alunos selecionados
  // ─────────────────────────────────────────────
  async function handleConfirmarInativacao() {
    if (!pendentesModal) return;
    const ids = [...pendentesModal.selecionados];
    if (ids.length === 0) {
      setPendentesModal(null);
      onClose && onClose();
      return;
    }
    setInativando(true);
    try {
      const { data } = await api.post("/api/alunos/inativar-lote", { alunoIds: ids });
      const msg = data?.message || `${ids.length} aluno(s) inativado(s).`;
      setPendentesModal(null);
      onFinish && onFinish({ status: "sucesso", message: msg });
      onClose && onClose();
    } catch (err) {
      console.error("Erro ao inativar:", err);
      alert(err?.response?.data?.message || "Erro ao inativar alunos.");
    } finally {
      setInativando(false);
    }
  }

  function toggleSelecionado(id) {
    if (!pendentesModal) return;
    const newSet = new Set(pendentesModal.selecionados);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setPendentesModal({ ...pendentesModal, selecionados: newSet });
  }

  function toggleTodos() {
    if (!pendentesModal) return;
    const allSelected =
      pendentesModal.selecionados.size === pendentesModal.pendentes.length;
    const newSet = allSelected
      ? new Set()
      : new Set(pendentesModal.pendentes.map((p) => p.id));
    setPendentesModal({ ...pendentesModal, selecionados: newSet });
  }

  // ─────────────────────────────────────────────
  // Seleção e envio do arquivo CSV
  // ─────────────────────────────────────────────
  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") {
      alert("Formato não suportado. Selecione um arquivo CSV exportado pelo portal EDUCADF.");
      e.target.value = null;
      return;
    }

    const turmaNome = file.name.replace(/\.csv$/i, "").trim();

    // Busca TODAS as turmas com esse nome (pode haver em mais de um turno)
    const turmasEncontradas = await buscarTurmasPorNome(turmaNome);

    if (e.target) e.target.value = null; // reset input

    if (turmasEncontradas.length === 0) {
      // Nenhuma turma → modal de cadastro
      setTurmaNaoEncontrada({ nome: turmaNome });
      return;
    }

    if (turmasEncontradas.length === 1) {
      // Apenas uma turma → importa direto
      await executarImportacao(file, turmasEncontradas[0]);
      return;
    }

    // Mais de uma turma com o mesmo nome (turnos diferentes) → modal de seleção
    setTurnoConflito({ turmaNome, opcoes: turmasEncontradas, arquivo: file });
  }

  function openPicker() {
    fileRef.current?.click();
  }

  // ─────────────────────────────────────────────
  // Renderização
  // ─────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Incluir Estudantes (CSV)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Selecione o arquivo <strong>CSV</strong> exportado pelo portal{" "}
            <strong>EDUCADF</strong> (Secretaria de Estado de Educação do DF).
            O nome do arquivo deve ser o <strong>nome exato da turma</strong>{" "}
            cadastrada no sistema.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700 leading-relaxed">
              💡 <strong>Como exportar:</strong> Acesse o portal EDUCADF →
              selecione a turma → clique em <em>"Exportar CSV"</em>. Renomeie o
              arquivo com o nome exato da turma antes de importar.
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            hidden
            onChange={handleFileSelected}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={openPicker}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {submitting ? "Importando..." : "Escolher arquivo CSV"}
            </Button>

            <Button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-60"
            >
              Cancelar
            </Button>
          </div>

          {submitting && (
            <div className="w-full bg-gray-200 rounded h-2 overflow-hidden mt-2">
              <div
                className="h-2 bg-green-600 transition-all"
                style={{ width: `${progress || 5}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MODAL PREMIUM: Conflito de turno
          Aparece quando a turma existe em mais de um turno
          ═══════════════════════════════════════════════════════ */}
      {turnoConflito && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ animation: "fadeInScale 0.25s ease-out" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Turma em mais de um turno
                  </h3>
                  <p className="text-indigo-200 text-sm mt-0.5">
                    Selecione o turno da importação
                  </p>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    A turma{" "}
                    <span className="font-bold text-indigo-700">
                      {turnoConflito.turmaNome}
                    </span>{" "}
                    está cadastrada em <strong>{turnoConflito.opcoes.length} turnos</strong>.
                    Selecione para qual turno este arquivo CSV pertence:
                  </p>
                </div>
              </div>

              {/* Opções de turno */}
              <div className="space-y-2">
                {turnoConflito.opcoes.map((turma) => {
                  const corTurno =
                    turma.turno?.toUpperCase().includes("MAT") ? "blue" :
                    turma.turno?.toUpperCase().includes("VES") ? "orange" :
                    turma.turno?.toUpperCase().includes("NOT") ? "purple" : "gray";

                  const corMap = {
                    blue:   { bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700 border-blue-300",   icon: "🌅" },
                    orange: { bg: "bg-orange-50",  border: "border-orange-200", badge: "bg-orange-100 text-orange-700 border-orange-300", icon: "☀️" },
                    purple: { bg: "bg-purple-50",  border: "border-purple-200", badge: "bg-purple-100 text-purple-700 border-purple-300", icon: "🌙" },
                    gray:   { bg: "bg-gray-50",    border: "border-gray-200",   badge: "bg-gray-100 text-gray-700 border-gray-300",   icon: "📚" },
                  };
                  const c = corMap[corTurno];

                  return (
                    <button
                      key={turma.id}
                      onClick={async () => {
                        const arquivo = turnoConflito.arquivo;
                        setTurnoConflito(null);
                        await executarImportacao(arquivo, turma);
                      }}
                      disabled={submitting}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 ${c.bg} ${c.border} hover:shadow-md transition-all duration-200 text-left group disabled:opacity-60`}
                    >
                      <span className="text-2xl shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">
                          {turma.turma || turma.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${c.badge}`}>
                            {turma.turno}
                          </span>
                          {turma.serie && (
                            <span className="text-xs text-gray-400">
                              {turma.serie}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg
                        width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        className="text-gray-400 group-hover:text-gray-600 shrink-0 transition-colors"
                      >
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <Button
                type="button"
                onClick={() => setTurnoConflito(null)}
                disabled={submitting}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium border border-gray-300 transition-all disabled:opacity-60"
              >
                Cancelar importação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL PREMIUM: Turma não encontrada
          ═══════════════════════════════════════════════════════ */}
      {turmaNaoEncontrada && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ animation: "fadeInScale 0.25s ease-out" }}
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Turma não encontrada</h3>
                  <p className="text-amber-100 text-sm">É necessário cadastrar antes de enturmar</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  A turma{" "}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {turmaNaoEncontrada.nome}
                  </span>{" "}
                  ainda não está cadastrada no sistema.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 mt-0.5">1</span>
                  <p className="text-sm text-gray-700">
                    Acesse <strong className="text-blue-700">Secretaria → Turmas</strong> e cadastre a turma com o <strong>nome exato</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 mt-0.5">2</span>
                  <p className="text-sm text-gray-700">
                    Retorne aqui e selecione o arquivo novamente.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 leading-relaxed">
                  💡 O nome do arquivo CSV deve corresponder exatamente ao nome da turma cadastrada.
                  Exemplo:{" "}
                  <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-mono text-xs">
                    {turmaNaoEncontrada.nome}.csv
                  </code>
                </p>
              </div>
            </div>

            <div className="px-6 pb-5">
              <Button
                type="button"
                onClick={() => setTurmaNaoEncontrada(null)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL PREMIUM: Confirmação de Inativação
          ═══════════════════════════════════════════════════════ */}
      {pendentesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ animation: "fadeInScale 0.3s ease-out" }}
          >
            <div className="bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="17" y1="11" x2="22" y2="11"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Alunos Ausentes no CSV</h3>
                  <p className="text-red-100 text-sm mt-0.5">
                    Turma <span className="font-semibold text-white">{pendentesModal.turma}</span>{" "}
                    — {pendentesModal.pendentes.length} aluno(s) não encontrado(s)
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Os alunos listados abaixo <strong>constam na turma</strong> no EDUCA.MELHOR,
                    mas <strong>não foram encontrados no CSV</strong> importado do EducaDF.
                    Isso pode significar que foram <strong>transferidos</strong> ou{" "}
                    <strong>removidos</strong> da turma.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Selecione os alunos para inativar
                  </span>
                  <button
                    onClick={toggleTodos}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    {pendentesModal.selecionados.size === pendentesModal.pendentes.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                </div>

                <div className="max-h-[240px] overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {pendentesModal.pendentes.map((aluno, idx) => {
                    const selected = pendentesModal.selecionados.has(aluno.id);
                    return (
                      <label
                        key={aluno.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 ${
                          selected ? "bg-red-50 hover:bg-red-100/80" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <input type="checkbox" checked={selected}
                            onChange={() => toggleSelecionado(aluno.id)} className="sr-only"/>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                            selected ? "bg-red-500 border-red-500 shadow-sm" : "bg-white border-gray-300"
                          }`}>
                            {selected && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M3 6L5 8L9 4" stroke="white" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${selected ? "text-red-800" : "text-gray-800"}`}>
                            {aluno.estudante}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">RE: {aluno.codigo}</p>
                        </div>
                        {selected && (
                          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            Inativar
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  <span className="font-semibold text-red-600">{pendentesModal.selecionados.size}</span>{" "}
                  de {pendentesModal.pendentes.length} selecionado(s)
                </span>
                <span className="text-xs text-gray-400">Não selecionados permanecerão ativos</span>
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-3">
              <Button
                type="button"
                onClick={() => { setPendentesModal(null); onClose && onClose(); }}
                disabled={inativando}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium border border-gray-300 disabled:opacity-60 transition-all"
              >
                Ignorar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmarInativacao}
                disabled={inativando || pendentesModal.selecionados.size === 0}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg disabled:opacity-60 transition-all"
              >
                {inativando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Inativando...
                  </span>
                ) : (
                  `Inativar ${pendentesModal.selecionados.size} Aluno(s)`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
