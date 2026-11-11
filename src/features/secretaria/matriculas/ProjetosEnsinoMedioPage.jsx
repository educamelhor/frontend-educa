// src/features/secretaria/matriculas/ProjetosEnsinoMedioPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowsRightLeftIcon,
  PrinterIcon,
  AcademicCapIcon,
  ClockIcon,
  UserGroupIcon,
  InformationCircleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../../../services/api";
import ModalProjetoEnsinoMedio, {
  CATALOGO_CARDS_EM,
} from "./ModalProjetoEnsinoMedio";
import ModalMatricularAlunosProjeto from "./ModalMatricularAlunosProjeto";

function calcularAnoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

function formatarDataBr(iso) {
  if (!iso) return "—";
  const str = String(iso).slice(0, 10);
  const partes = str.split("-");
  if (partes.length !== 3) return str;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function labelSemestre(sem) {
  const n = Number(sem);
  if (n === 1) return "1º Semestre";
  if (n === 2) return "2º Semestre";
  return "Anual (1º e 2º Sem.)";
}

// ============================================================================
// Subcomponente: Bloco Individual de cada Projeto + Badges das Turmas + Tabela
// ============================================================================
function ProjetoTabelaBloco({
  projeto,
  onEditarProjeto,
  onExcluirProjeto,
  onProjetoMutado,
}) {
  const turmas = Array.isArray(projeto.turmas) ? projeto.turmas : [];
  const [turmaAtivaId, setTurmaAtivaId] = useState(
    turmas[0]?.id || null
  );
  const [dadosTurma, setDadosTurma] = useState(null);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [buscaAlunoInterna, setBuscaAlunoInterna] = useState("");
  const [sinopseExpandida, setSinopseExpandida] = useState(false);
  const [modalMatricularAberto, setModalMatricularAberto] = useState(false);
  const [adicionandoTurma, setAdicionandoTurma] = useState(false);

  // Garante turma válida selecionada quando a lista de turmas muda
  useEffect(() => {
    if (turmas.length === 0) {
      setTurmaAtivaId(null);
      return;
    }
    const existe = turmas.some((t) => t.id === turmaAtivaId);
    if (!existe) {
      setTurmaAtivaId(turmas[0].id);
    }
  }, [turmas, turmaAtivaId]);

  const carregarAlunosDaTurma = useCallback(async (agrId) => {
    if (!agrId) return;
    setCarregandoAlunos(true);
    try {
      const res = await api.get(
        `/api/matriculas/projetos/turmas/${agrId}/alunos`
      );
      setDadosTurma(res.data || null);
    } catch (err) {
      console.error("[ProjetoTabelaBloco] Erro ao buscar alunos da turma:", err);
    } finally {
      setCarregandoAlunos(false);
    }
  }, []);

  useEffect(() => {
    if (turmaAtivaId) {
      carregarAlunosDaTurma(turmaAtivaId);
    }
  }, [turmaAtivaId, carregarAlunosDaTurma]);

  const cardMeta =
    CATALOGO_CARDS_EM.find((c) => c.codigo === projeto.categoria) ||
    CATALOGO_CARDS_EM[0];

  const turmaResumoSelecionada =
    turmas.find((t) => t.id === turmaAtivaId) || turmas[0] || null;

  const alunosLista = dadosTurma?.alunos || [];
  const outrasTurmasProjeto = dadosTurma?.outras_turmas_projeto || [];
  const turmasRegulares = dadosTurma?.turmas_regulares || [];

  const capacidadeTurma =
    dadosTurma?.turma?.capacidade ?? turmaResumoSelecionada?.capacidade ?? 0;
  const matriculadosTurma =
    dadosTurma?.turma?.matriculados ??
    turmaResumoSelecionada?.matriculados ??
    alunosLista.length;
  const vagasRestantesTurma =
    capacidadeTurma > 0
      ? Math.max(0, capacidadeTurma - matriculadosTurma)
      : 0;
  const percentualOcupacao =
    capacidadeTurma > 0
      ? Math.min(100, Math.round((matriculadosTurma / capacidadeTurma) * 100))
      : 0;

  const alunosFiltrados = buscaAlunoInterna.trim()
    ? alunosLista.filter((a) => {
        const termo = buscaAlunoInterna.toLowerCase();
        return (
          String(a.nome || "").toLowerCase().includes(termo) ||
          String(a.codigo || "").toLowerCase().includes(termo) ||
          String(a.turma_origem_nome || "").toLowerCase().includes(termo)
        );
      })
    : alunosLista;

  const handleAdicionarTurmaExtra = async () => {
    setAdicionandoTurma(true);
    try {
      const res = await api.post(
        `/api/matriculas/projetos/${projeto.id}/turmas`
      );
      toast.success(res.data?.message || "Nova turma criada!");
      if (res.data?.nova_turma_id) {
        setTurmaAtivaId(res.data.nova_turma_id);
      }
      if (onProjetoMutado) onProjetoMutado();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Não foi possível criar nova turma."
      );
    } finally {
      setAdicionandoTurma(false);
    }
  };

  const handleExcluirTurmaAtual = async () => {
    if (!turmaResumoSelecionada || turmas.length <= 1) return;
    const confirmar1 = window.confirm(
      `Deseja remover a "${turmaResumoSelecionada.apelido_turma}" do projeto "${projeto.nome}"?`
    );
    if (!confirmar1) return;

    try {
      await api.delete(
        `/api/matriculas/projetos/turmas/${turmaResumoSelecionada.id}`
      );
      toast.success("Turma removida com sucesso.");
      if (onProjetoMutado) onProjetoMutado();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requer_confirmacao) {
        const confirmarForcado = window.confirm(
          `${err.response.data.message}\n\nDeseja realmente excluir esta turma e desvincular esses estudantes?`
        );
        if (!confirmarForcado) return;
        try {
          await api.delete(
            `/api/matriculas/projetos/turmas/${turmaResumoSelecionada.id}?forcar=1`
          );
          toast.success("Turma removida.");
          if (onProjetoMutado) onProjetoMutado();
        } catch (err2) {
          toast.error(err2.response?.data?.message || "Erro ao remover turma.");
        }
      } else {
        toast.error(err.response?.data?.message || "Erro ao remover turma.");
      }
    }
  };

  const handleRemoverEstudante = async (aluno) => {
    const ok = window.confirm(
      `Remover "${aluno.nome}" da ${turmaResumoSelecionada?.apelido_turma}?`
    );
    if (!ok) return;

    try {
      await api.post(
        `/api/matriculas/projetos/turmas/${turmaAtivaId}/remover`,
        { aluno_ids: [aluno.aluno_id] }
      );
      toast.success("Estudante removido da turma.");
      await carregarAlunosDaTurma(turmaAtivaId);
      if (onProjetoMutado) onProjetoMutado();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erro ao remover estudante."
      );
    }
  };

  const handleTransferirEstudante = async (aluno, destinoId) => {
    if (!destinoId) return;
    try {
      await api.post(
        `/api/matriculas/projetos/turmas/${turmaAtivaId}/transferir`,
        {
          aluno_id: aluno.aluno_id,
          destino_agrupamento_id: Number(destinoId),
        }
      );
      toast.success(`"${aluno.nome}" transferido(a) de turma!`);
      await carregarAlunosDaTurma(turmaAtivaId);
      if (onProjetoMutado) onProjetoMutado();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Não foi possível transferir o estudante."
      );
    }
  };

  const handleImprimirListaTurma = () => {
    if (!turmaResumoSelecionada) return;
    const win = window.open("", "_blank", "width=920,height=720");
    if (!win) {
      toast.error("Permita pop-ups para imprimir a relação da turma.");
      return;
    }

    const linhasHtml =
      alunosLista.length === 0
        ? `<tr><td colspan="4" style="text-align:center;padding:20px;color:#64748b;">Nenhum estudante matriculado até o momento.</td></tr>`
        : alunosLista
            .map(
              (a, i) => `
              <tr>
                <td style="text-align:center;">${String(i + 1).padStart(2, "0")}</td>
                <td>${a.codigo || "—"}</td>
                <td style="font-weight:600;">${a.nome}</td>
                <td>${a.turma_origem_nome || "—"}</td>
              </tr>`
            )
            .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>${projeto.nome} — ${turmaResumoSelecionada.apelido_turma}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 28px; color: #0f172a; }
            .hdr { border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
            .hdr h1 { margin: 0 0 4px 0; font-size: 18px; }
            .hdr p { margin: 2px 0; font-size: 12px; color: #475569; }
            .kpis { display: flex; gap: 16px; margin-bottom: 16px; font-size: 12px; }
            .kpi { background: #f1f5f9; padding: 8px 14px; border-radius: 6px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
            th { background: #f8fafc; text-transform: uppercase; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="hdr">
            <h1>${projeto.nome} — ${turmaResumoSelecionada.apelido_turma}</h1>
            <p><strong>Eixo:</strong> ${cardMeta.titulo} | <strong>Turno:</strong> ${projeto.turno} | <strong>Período:</strong> ${labelSemestre(projeto.semestre)} / ${projeto.ano_letivo}</p>
            ${projeto.sinopse ? `<p><strong>Sinopse:</strong> ${projeto.sinopse}</p>` : ""}
          </div>
          <div class="kpis">
            <div class="kpi">Vagas Totais: ${capacidadeTurma}</div>
            <div class="kpi">Matriculados: ${matriculadosTurma}</div>
            <div class="kpi">Vagas Restantes: ${vagasRestantesTurma}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:45px;text-align:center;">Nº</th>
                <th style="width:110px;">Matrícula/Cód.</th>
                <th>Nome do Estudante</th>
                <th style="width:170px;">Turma Regular (Origem)</th>
              </tr>
            </thead>
            <tbody>${linhasHtml}</tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition hover:shadow-md">
      {/* 1. Cabeçalho do Projeto */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${cardMeta.corBgSuave} ${cardMeta.corTexto} ${cardMeta.corBorda}`}
              >
                <span>{cardMeta.iconeEmoji}</span>
                {cardMeta.sigla}
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {labelSemestre(projeto.semestre)}
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Turno: {projeto.turno}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                <ClockIcon className="w-3.5 h-3.5" />
                {projeto.carga_semanal} aula(s)/sem
              </span>

              {Array.isArray(projeto.series) &&
                projeto.series.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {s}
                  </span>
                ))}
            </div>

            <div className="flex flex-wrap items-baseline gap-2.5">
              <h3 className="text-lg font-extrabold text-slate-900">
                {projeto.nome}
              </h3>
              {projeto.abreviatura && (
                <span className="text-xs font-mono font-bold text-slate-400">
                  [{projeto.abreviatura}]
                </span>
              )}
            </div>

            {projeto.professor_idealizador && (
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-700">
                  Professor(a) Referência:
                </span>{" "}
                {projeto.professor_idealizador}
              </p>
            )}

            {projeto.sinopse && (
              <div className="pt-1">
                <p
                  className={`text-xs text-slate-600 leading-relaxed ${
                    sinopseExpandida ? "" : "line-clamp-2"
                  }`}
                >
                  <InformationCircleIcon className="w-4 h-4 inline-block mr-1 -mt-0.5 text-slate-400" />
                  {projeto.sinopse}
                </p>
                {projeto.sinopse.length > 160 && (
                  <button
                    type="button"
                    onClick={() => setSinopseExpandida((v) => !v)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 mt-0.5 cursor-pointer"
                  >
                    {sinopseExpandida ? "Recolher sinopse" : "Ler sinopse completa"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Resumo Global do Projeto + Ações */}
          <div className="flex flex-wrap lg:flex-col items-end justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <UserGroupIcon className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-600">Total no Projeto:</span>
              <strong className="text-slate-900">
                {projeto.resumo_vagas?.matriculados || 0}/
                {projeto.resumo_vagas?.vagas_totais || 0} ocupadas
              </strong>
              <span className="text-emerald-700 font-bold">
                ({projeto.resumo_vagas?.vagas_restantes || 0} livres)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAdicionarTurmaExtra}
                disabled={adicionandoTurma}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                title="Criar mais uma turma para este projeto"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                {adicionandoTurma ? "Criando..." : "Nova Turma"}
              </button>

              <button
                type="button"
                onClick={() => onEditarProjeto(projeto)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition cursor-pointer"
                title="Editar dados do projeto"
              >
                <PencilSquareIcon className="w-3.5 h-3.5" />
                Editar
              </button>

              <button
                type="button"
                onClick={() => onExcluirProjeto(projeto)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                title="Excluir projeto e suas turmas"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Topo da Tabela: BADGES INTERATIVAS DE CADA TURMA RECÉM-CRIADA */}
      <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mr-1">
            Turmas do Projeto:
          </span>

          {turmas.map((t) => {
            const selecionada = t.id === turmaAtivaId;
            const lotada = t.capacidade > 0 && t.matriculados >= t.capacidade;
            const vagasRest =
              t.capacidade !== null
                ? Math.max(0, t.capacidade - t.matriculados)
                : null;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTurmaAtivaId(t.id)}
                className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  selecionada
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-[1.02]"
                    : "bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40"
                }`}
              >
                <AcademicCapIcon
                  className={`w-4 h-4 ${
                    selecionada ? "text-indigo-200" : "text-indigo-600"
                  }`}
                />
                <span>{t.apelido_turma}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    selecionada
                      ? lotada
                        ? "bg-rose-500 text-white"
                        : "bg-white/20 text-white"
                      : lotada
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {t.matriculados}/{t.capacidade ?? "∞"}{" "}
                  {lotada
                    ? "• Lotada"
                    : vagasRest !== null
                    ? `• ${vagasRest} vaga(s)`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ações Rápidas da Turma Selecionada */}
        {turmaResumoSelecionada && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleImprimirListaTurma}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition cursor-pointer"
            >
              <PrinterIcon className="w-4 h-4" />
              Imprimir Lista
            </button>

            {turmas.length > 1 && (
              <button
                type="button"
                onClick={handleExcluirTurmaAtual}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                title="Remover apenas esta turma"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Excluir {turmaResumoSelecionada.apelido_turma}
              </button>
            )}

            <button
              type="button"
              onClick={() => setModalMatricularAberto(true)}
              disabled={capacidadeTurma > 0 && vagasRestantesTurma === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlusIcon className="w-4 h-4" />
              {capacidadeTurma > 0 && vagasRestantesTurma === 0
                ? "Turma Lotada"
                : `Matricular na ${turmaResumoSelecionada.apelido_turma}`}
            </button>
          </div>
        )}
      </div>

      {/* 3. Faixa Executiva de Vagas da Turma Selecionada */}
      {turmaResumoSelecionada && (
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div className="flex items-center justify-between md:justify-start gap-3 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500">
              Vagas da {turmaResumoSelecionada.apelido_turma}:
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {capacidadeTurma}
            </span>
          </div>

          <div className="flex items-center justify-between md:justify-start gap-3 px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
            <span className="text-xs font-semibold text-indigo-700">
              Alunos Matriculados:
            </span>
            <span className="text-base font-extrabold text-indigo-900">
              {matriculadosTurma}
            </span>
          </div>

          <div
            className={`flex items-center justify-between md:justify-start gap-3 px-3.5 py-2 rounded-xl border ${
              vagasRestantesTurma === 0
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : vagasRestantesTurma <= 5
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <span className="text-xs font-semibold">Vagas Restantes:</span>
            <span className="text-base font-extrabold">
              {vagasRestantesTurma}
            </span>
          </div>

          {/* Barra de Progresso + Filtro rápido interno */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Ocupação da Turma</span>
              <span>{percentualOcupacao}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full transition-all duration-300 ${
                  percentualOcupacao >= 100
                    ? "bg-rose-500"
                    : percentualOcupacao >= 85
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${percentualOcupacao}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Tabela Nominal de Estudantes da Turma Selecionada */}
      <div>
        {alunosLista.length > 5 && (
          <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={buscaAlunoInterna}
                onChange={(e) => setBuscaAlunoInterna(e.target.value)}
                placeholder={`Filtrar estudante na ${turmaResumoSelecionada?.apelido_turma}...`}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:border-indigo-500 outline-none"
              />
            </div>
            <span className="text-xs text-slate-500">
              Exibindo {alunosFiltrados.length} de {alunosLista.length} estudante(s)
            </span>
          </div>
        )}

        {carregandoAlunos ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Carregando estudantes da {turmaResumoSelecionada?.apelido_turma}...
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="py-10 px-6 text-center bg-slate-50/30">
            <p className="text-sm font-semibold text-slate-700">
              {alunosLista.length === 0
                ? `Nenhum estudante matriculado ainda na ${turmaResumoSelecionada?.apelido_turma}.`
                : "Nenhum estudante corresponde ao filtro digitado."}
            </p>
            {alunosLista.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Restam <strong>{vagasRestantesTurma}</strong> vagas disponíveis nesta turma. Clique em{" "}
                <strong>Matricular na {turmaResumoSelecionada?.apelido_turma}</strong> para adicionar estudantes.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4 w-14 text-center">#</th>
                  <th className="py-2.5 px-4 w-32">Código</th>
                  <th className="py-2.5 px-4">Nome do Estudante</th>
                  <th className="py-2.5 px-4">Turma Regular (Origem)</th>
                  <th className="py-2.5 px-4 w-32">Inscrição</th>
                  <th className="py-2.5 px-4 text-right w-56">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {alunosFiltrados.map((aluno, idx) => (
                  <tr
                    key={aluno.id || aluno.aluno_id}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="py-2.5 px-4 text-center text-xs font-bold text-slate-400">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-600">
                      {aluno.codigo || "—"}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {aluno.nome}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {aluno.turma_origem_nome || "Sem turma base"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-500">
                      {formatarDataBr(aluno.entrada_em)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {outrasTurmasProjeto.length > 0 && (
                          <div className="relative inline-flex items-center">
                            <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-slate-400 mr-1" />
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const val = e.target.value;
                                e.target.value = "";
                                handleTransferirEstudante(aluno, val);
                              }}
                              className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 outline-none hover:bg-indigo-100 cursor-pointer"
                              title="Remanejar estudante para outra turma deste projeto"
                            >
                              <option value="" disabled>
                                Mover p/...
                              </option>
                              {outrasTurmasProjeto.map((ir) => {
                                const semVaga =
                                  ir.vagas_restantes !== null &&
                                  ir.vagas_restantes <= 0;
                                return (
                                  <option
                                    key={ir.id}
                                    value={ir.id}
                                    disabled={semVaga}
                                  >
                                    {ir.apelido_turma} (
                                    {semVaga
                                      ? "Lotada"
                                      : `${ir.vagas_restantes} vagas`}
                                    )
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoverEstudante(aluno)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Matrícula de Estudantes na Turma Selecionada */}
      <ModalMatricularAlunosProjeto
        aberto={modalMatricularAberto}
        onClose={() => setModalMatricularAberto(false)}
        turma={{
          ...turmaResumoSelecionada,
          capacidade: capacidadeTurma,
          matriculados: matriculadosTurma,
          vagas_restantes: vagasRestantesTurma,
        }}
        projeto={projeto}
        turmasRegulares={turmasRegulares}
        onMatriculado={async () => {
          await carregarAlunosDaTurma(turmaAtivaId);
          if (onProjetoMutado) onProjetoMutado();
        }}
      />
    </div>
  );
}

// ============================================================================
// Página Principal do Submódulo PROJETOS (Novo Ensino Médio)
// ============================================================================
export default function ProjetosEnsinoMedioPage() {
  const [anoLetivo, setAnoLetivo] = useState(calcularAnoLetivoPadrao());
  const [anosDisponiveis, setAnosDisponiveis] = useState([
    calcularAnoLetivoPadrao(),
  ]);
  const [semestreFiltro, setSemestreFiltro] = useState("TODOS");
  const [turnoFiltro, setTurnoFiltro] = useState("TODOS");
  const [categoriaFiltro, setCategoriaFiltro] = useState("TODAS");
  const [busca, setBusca] = useState("");

  const [resumoCategorias, setResumoCategorias] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estado do Modal Premium de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaModal, setCategoriaModal] = useState("IFA");
  const [projetoEditando, setProjetoEditando] = useState(null);

  useEffect(() => {
    api
      .get("/api/matriculas/anos")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setAnosDisponiveis(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const carregarProjetos = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get("/api/matriculas/projetos", {
        params: {
          ano_letivo: anoLetivo,
          semestre: semestreFiltro !== "TODOS" ? semestreFiltro : undefined,
          turno: turnoFiltro !== "TODOS" ? turnoFiltro : undefined,
          categoria: categoriaFiltro !== "TODAS" ? categoriaFiltro : undefined,
          q: busca.trim() || undefined,
        },
      });
      setResumoCategorias(res.data?.categorias || []);
      setProjetos(res.data?.projetos || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Erro ao carregar projetos do Novo Ensino Médio."
      );
    } finally {
      setCarregando(false);
    }
  }, [anoLetivo, semestreFiltro, turnoFiltro, categoriaFiltro, busca]);

  useEffect(() => {
    const t = setTimeout(() => {
      carregarProjetos();
    }, 150);
    return () => clearTimeout(t);
  }, [carregarProjetos]);

  const abrirCriacaoPorCard = (codigoCategoria) => {
    setProjetoEditando(null);
    setCategoriaModal(codigoCategoria);
    setModalAberto(true);
  };

  const abrirEdicaoProjeto = (proj) => {
    setProjetoEditando(proj);
    setCategoriaModal(proj.categoria);
    setModalAberto(true);
  };

  const handleExcluirProjeto = async (proj) => {
    const ok = window.confirm(
      `Deseja excluir o projeto "${proj.nome}" e suas ${proj.turmas?.length || 0} turma(s)?`
    );
    if (!ok) return;

    try {
      await api.delete(`/api/matriculas/projetos/${proj.id}`);
      toast.success("Projeto excluído com sucesso.");
      carregarProjetos();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requer_confirmacao) {
        const confirmarForcado = window.confirm(
          `${err.response.data.message}\n\nConfirmar exclusão definitiva do projeto e de todas as turmas?`
        );
        if (!confirmarForcado) return;
        try {
          await api.delete(`/api/matriculas/projetos/${proj.id}?forcar=1`);
          toast.success("Projeto e turmas excluídos.");
          carregarProjetos();
        } catch (err2) {
          toast.error(
            err2.response?.data?.message || "Erro ao excluir projeto."
          );
        }
      } else {
        toast.error(err.response?.data?.message || "Erro ao excluir projeto.");
      }
    }
  };

  const getStatsCard = (codigo) => {
    return (
      resumoCategorias.find((r) => r.codigo === codigo) || {
        total_projetos: 0,
        total_turmas: 0,
        vagas_totais: 0,
        matriculados: 0,
        vagas_restantes: 0,
      }
    );
  };

  return (
    <div className="space-y-7">
      {/* Seção 1: Os 6 Cards Executivos da Organização do Novo Ensino Médio */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Eixos de Oferta Semestral — Novo Ensino Médio
            </h2>
            <p className="text-xs text-slate-500">
              Clique em qualquer um dos 6 eixos abaixo para cadastrar o projeto, definir a sinopse e gerar suas turmas automaticamente.
            </p>
          </div>
          {categoriaFiltro !== "TODAS" && (
            <button
              type="button"
              onClick={() => setCategoriaFiltro("TODAS")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Limpar filtro de eixo ({categoriaFiltro}) ×
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CATALOGO_CARDS_EM.map((card) => {
            const stats = getStatsCard(card.codigo);
            const filtroAtivo = categoriaFiltro === card.codigo;

            return (
              <div
                key={card.codigo}
                onClick={() => abrirCriacaoPorCard(card.codigo)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrirCriacaoPorCard(card.codigo);
                  }
                }}
                className={`group relative bg-white rounded-2xl border p-5 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
                  filtroAtivo
                    ? `ring-2 ${card.corAnel} ${card.corBorda}`
                    : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                {/* Barra superior em gradiente */}
                <div
                  className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${card.corGradiente}`}
                />

                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl ${card.corBgSuave} ${card.corBorda} border flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition`}
                    >
                      {card.iconeEmoji}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {stats.total_projetos > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoriaFiltro(
                              filtroAtivo ? "TODAS" : card.codigo
                            );
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                            filtroAtivo
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                          title="Filtrar listagem abaixo por este eixo"
                        >
                          {stats.total_projetos} proj • {stats.total_turmas} turma(s)
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 mt-3 group-hover:text-indigo-700 transition">
                    {card.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {card.descricaoCurta}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {stats.vagas_totais > 0
                      ? `${stats.matriculados}/${stats.vagas_totais} vagas preenchidas`
                      : "Nenhum projeto neste filtro"}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-extrabold ${card.corTexto} group-hover:translate-x-0.5 transition`}
                  >
                    <PlusIcon className="w-4 h-4" />
                    Criar Turmas
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Barra de Filtros da Listagem de Projetos e Turmas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            <FunnelIcon className="w-4 h-4 text-indigo-600" />
            Filtros:
          </div>

          <select
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(Number(e.target.value))}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
          >
            {anosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>
                Ano Letivo {ano}
              </option>
            ))}
          </select>

          <select
            value={semestreFiltro}
            onChange={(e) => setSemestreFiltro(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="TODOS">Todos os Semestres</option>
            <option value="1">1º Semestre</option>
            <option value="2">2º Semestre</option>
            <option value="0">Anual (1º e 2º Sem.)</option>
          </select>

          <select
            value={turnoFiltro}
            onChange={(e) => setTurnoFiltro(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="TODOS">Todos os Turnos</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Noturno">Noturno</option>
            <option value="Integral">Integral</option>
          </select>

          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="TODAS">Todos os 6 Eixos</option>
            {CATALOGO_CARDS_EM.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.titulo}
              </option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[210px]">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar projeto por nome, sigla, professor ou sinopse..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Seção 3: Tabelas de Projetos Criados (com Badges de Turmas no Topo) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-800">
            Projetos e Turmas Ofertadas ({projetos.length})
          </h2>
        </div>

        {carregando ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-sm text-slate-500">
            Carregando projetos e quadros de vagas...
          </div>
        ) : projetos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-2xl mb-3">
              🚀
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Nenhum projeto cadastrado para os filtros selecionados
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
              Clique em um dos <strong>6 cards do Novo Ensino Médio</strong> no topo desta página para criar seu primeiro projeto, cadastrar a sinopse e gerar automaticamente as turmas e vagas.
            </p>
          </div>
        ) : (
          projetos.map((projeto) => (
            <ProjetoTabelaBloco
              key={projeto.id}
              projeto={projeto}
              onEditarProjeto={abrirEdicaoProjeto}
              onExcluirProjeto={handleExcluirProjeto}
              onProjetoMutado={carregarProjetos}
            />
          ))
        )}
      </div>

      {/* Modal Premium de Criação / Edição de Projeto */}
      <ModalProjetoEnsinoMedio
        aberto={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setProjetoEditando(null);
        }}
        categoriaInicial={categoriaModal}
        anoLetivoPadrao={anoLetivo}
        semestrePadrao={semestreFiltro === "TODOS" ? 1 : Number(semestreFiltro)}
        projetoEditando={projetoEditando}
        onSalvo={() => carregarProjetos()}
      />
    </div>
  );
}
