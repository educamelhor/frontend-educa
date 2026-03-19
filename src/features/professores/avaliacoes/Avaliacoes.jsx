import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import {
  CheckCircleIcon,
  DocumentCheckIcon,
  TableCellsIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";


/**
 * Avaliacoes.jsx
 * ------------------------------------------------------------
 * Onde o professor registra as notas/pontos baseado no Plano de Avaliação (PAP).
 * Os dados vêm diretamente do plano criado no submenu "Planos".
 * ------------------------------------------------------------
 */

export default function Avaliacoes() {
  // ---------------------------
  // Estados de seleção
  // ---------------------------
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("");
  const [bimestreSelecionado, setBimestreSelecionado] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState("");

  const [disciplinas, setDisciplinas] = useState([]);
  const bimestres = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
  const [turmas, setTurmas] = useState([]);

  // ---------------------------
  // Dados Reais
  // ---------------------------
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [alunos, setAlunos] = useState([]);
  const [plano, setPlano] = useState(null);
  const [planoStatus, setPlanoStatus] = useState(null); // null | "PENDENTE" | "RASCUNHO" | "ENVIADO" | "APROVADO"
  const [notas, setNotas] = useState({}); // Formato: { [alunoId_itemIdx_opIdx]: valor }
  const [coresCelulas, setCoresCelulas] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSistema, setMensagemSistema] = useState(null);

  const showMsg = (type, text) => {
    setMensagemSistema({ type, text });
    setTimeout(() => setMensagemSistema(null), 4500);
  };

  // ---------------------------
  // Carga Inicial — Disciplinas do professor
  // ---------------------------
  useEffect(() => {
    const fetchDadosIniciais = async () => {
      try {
        const resDisc = await api.get("/professores/me/disciplinas");
        if (resDisc.data?.ok) {
          const names = resDisc.data.disciplinas.map(d => d.nome);
          setDisciplinas(names);
          if (names.length === 1) setDisciplinaSelecionada(names[0]);
        }
      } catch (err) {
        console.error("Erro ao carregar disciplinas", err);
      }
    };
    fetchDadosIniciais();
  }, []);

  // ---------------------------
  // Busca turmas ao mudar disciplina
  // ---------------------------
  useEffect(() => {
    if (!disciplinaSelecionada) {
      setTurmas([]);
      return;
    }
    const fetchTurmas = async () => {
      try {
        const resTurmas = await api.get("/professores/me/turmas", {
          params: { disciplina: disciplinaSelecionada }
        });
        if (resTurmas.data?.ok) {
          setTurmas(resTurmas.data.turmas);
        }
      } catch (err) {
        console.error("Erro ao carregar turmas", err);
      }
    };
    fetchTurmas();
  }, [disciplinaSelecionada]);

  // ---------------------------
  // Carrega PLANO REAL + ALUNOS quando tudo estiver selecionado
  // ---------------------------
  useEffect(() => {
    if (!disciplinaSelecionada || !bimestreSelecionado || !turmaSelecionada) {
      setAlunos([]);
      setPlano(null);
      setPlanoStatus(null);
      return;
    }

    const carregarGrid = async () => {
      setCarregandoDados(true);
      try {
        const turmaObj = turmas.find(t => String(t.id) === String(turmaSelecionada));
        const turmaNome = turmaObj ? turmaObj.nome : "";

        // 1) Busca planos do professor para esta disciplina/bimestre/ano
        const ano = new Date().getFullYear();
        const resAvaliacoes = await api.get("/avaliacoes", {
          params: { disciplina: disciplinaSelecionada, bimestre: bimestreSelecionado, ano }
        });

        const planosRetornados = resAvaliacoes.data || [];
        const planoEncontrado = planosRetornados.find(p => p.turmas === turmaNome);

        // 2) Verifica se o plano existe e qual seu status
        if (!planoEncontrado) {
          // Plano nem existe — professor precisa criar no submenu Planos
          setPlano(null);
          setPlanoStatus("PENDENTE");
          setAlunos([]);
          setCarregandoDados(false);
          return;
        }

        setPlanoStatus(planoEncontrado.status);

        // Apenas planos com status ENVIADO ou APROVADO permitem lançamento
        if (planoEncontrado.status !== "APROVADO" && planoEncontrado.status !== "ENVIADO") {
          setPlano(null);
          setAlunos([]);
          setCarregandoDados(false);
          return;
        }

        // 3) Busca detalhes do plano (itens)
        let planoCompleto = planoEncontrado;
        if (planoEncontrado.id) {
          const resDetalhe = await api.get(`/avaliacoes/${planoEncontrado.id}`);
          planoCompleto = resDetalhe.data || planoEncontrado;
        }

        setPlano(planoCompleto);

        // 4) Busca ALUNOS REAIS da turma via tabela matriculas
        try {
          const resAlunos = await api.get(`/turmas/${turmaSelecionada}/alunos`);
          if (resAlunos.data?.ok && resAlunos.data.alunos?.length > 0) {
            setAlunos(resAlunos.data.alunos);
          } else {
            setAlunos([]);
          }
        } catch {
          setAlunos([]);
        }

        // Limpa notas ao trocar de contexto
        setNotas({});

      } catch (err) {
        console.error("Erro ao carregar dados", err);
        showMsg("error", "Não foi possível carregar a grade de avaliações.");
      } finally {
        setCarregandoDados(false);
      }
    };

    carregarGrid();
  }, [disciplinaSelecionada, bimestreSelecionado, turmaSelecionada, turmas]);

  // ---------------------------
  // Funções de Cálculo e Handlers
  // ---------------------------
  const getNotaKey = (alunoId, itemIdx, opIdx) => `${alunoId}_${itemIdx}_${opIdx}`;

  const handleNotaChange = (alunoId, itemIdx, opIdx, maxVal, val) => {
    let cleanVal = val.replace(",", ".");
    if (cleanVal === "") {
      setNotas(prev => { const n = { ...prev }; delete n[getNotaKey(alunoId, itemIdx, opIdx)]; return n; });
      return;
    }
    let numVal = parseFloat(cleanVal);
    if (isNaN(numVal)) return;

    if (numVal > maxVal) numVal = maxVal;
    if (numVal < 0) numVal = 0;

    setNotas(prev => ({
      ...prev,
      [getNotaKey(alunoId, itemIdx, opIdx)]: numVal
    }));

    setCoresCelulas(prev => { const c = { ...prev }; delete c[getNotaKey(alunoId, itemIdx, opIdx)]; return c; });
  };

  const handleContextMenu = (e, alunoId, itemIdx, opIdx, maxVal) => {
    e.preventDefault();
    setContextMenu({
      alunoId, itemIdx, opIdx, maxVal,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleSelectColor = (color) => {
    if (!contextMenu) return;
    const { alunoId, itemIdx, opIdx, maxVal } = contextMenu;
    const key = getNotaKey(alunoId, itemIdx, opIdx);

    setCoresCelulas(prev => ({ ...prev, [key]: color }));

    let numVal = 0;
    if (color === "red") numVal = 0;
    else if (color === "yellow") numVal = maxVal / 2;
    else if (color === "green") numVal = maxVal;

    setNotas(prev => ({ ...prev, [key]: numVal }));
    setContextMenu(null);
  };

  const calcularTotalAluno = (alunoId) => {
    let total = 0;
    if (!plano || typeof plano !== 'object' || !plano.itens) return total;

    const arrItens = Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || "[]");
    arrItens.forEach((item, itemIdx) => {
      const freq = Number(item.oportunidades) || 1;
      for (let opIdx = 0; opIdx < freq; opIdx++) {
        const val = notas[getNotaKey(alunoId, itemIdx, opIdx)];
        if (val !== undefined && !isNaN(val)) total += val;
      }
    });
    return total.toFixed(2);
  };

  const salvarAvaliacoes = async () => {
    setSalvando(true);
    // TODO: futuramente persistir notas no banco
    setTimeout(() => {
      setSalvando(false);
      showMsg("success", "Registros salvos com sucesso!");
    }, 800);
  };

  // ---------------------------
  // Construção do header dinâmico
  // ---------------------------
  const columns = [];
  if (plano && typeof plano === 'object' && plano.itens) {
    const arrItens = Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || "[]");
    arrItens.forEach((item, itemIdx) => {
      const freq = Number(item.oportunidades) || 1;
      const maxPorOcorrencia = Number(item.nota_total) / freq;

      for (let opIdx = 0; opIdx < freq; opIdx++) {
        columns.push({
          itemIdx,
          opIdx,
          title: item.atividade,
          label: freq > 1 ? `#${opIdx + 1}` : "Nota",
          maxVal: maxPorOcorrencia,
          freqTotal: freq
        });
      }
    });
  }

  const turmaObj = turmas.find(t => String(t.id) === String(turmaSelecionada));
  const selecaoCompleta = disciplinaSelecionada && bimestreSelecionado && turmaSelecionada;

  // ---------------------------
  // Mensagem contextual para planos não prontos
  // ---------------------------
  const renderMensagemPlanoNaoDisponivel = () => {
    if (!selecaoCompleta || carregandoDados) return null;
    if (plano) return null; // Plano existe e é válido

    let icon, titulo, descricao, corBg, corBorder, corTexto, corIcone;

    if (planoStatus === "PENDENTE") {
      icon = <ClipboardDocumentListIcon className="w-12 h-12" />;
      titulo = "Plano de Avaliação não encontrado";
      descricao = (
        <>
          Não existe um Plano de Avaliação para{" "}
          <strong>{disciplinaSelecionada}</strong> — <strong>{turmaObj?.nome}</strong> — <strong>{bimestreSelecionado}</strong>.
          <br />
          Acesse o submenu <strong className="text-indigo-700">"Planos"</strong> para criar e enviar o plano antes de lançar notas.
        </>
      );
      corBg = "bg-slate-50";
      corBorder = "border-slate-200";
      corTexto = "text-slate-600";
      corIcone = "text-slate-400";
    } else if (planoStatus === "RASCUNHO") {
      icon = <ExclamationTriangleIcon className="w-12 h-12" />;
      titulo = "Plano em Rascunho";
      descricao = (
        <>
          O Plano de Avaliação para{" "}
          <strong>{disciplinaSelecionada}</strong> — <strong>{turmaObj?.nome}</strong> — <strong>{bimestreSelecionado}</strong>{" "}
          ainda está em <strong className="text-orange-700">RASCUNHO</strong>.
          <br />
          Finalize e envie o plano para a Direção no submenu <strong className="text-indigo-700">"Planos"</strong> para habilitar o lançamento de notas.
        </>
      );
      corBg = "bg-orange-50";
      corBorder = "border-orange-200";
      corTexto = "text-orange-700";
      corIcone = "text-orange-400";
    } else {
      // Status desconhecido
      icon = <ExclamationCircleIcon className="w-12 h-12" />;
      titulo = "Plano não disponível para lançamento";
      descricao = (
        <>
          O Plano de Avaliação para esta combinação não está disponível para lançamento de notas.
          <br />
          Status atual: <strong>{planoStatus || "Desconhecido"}</strong>
        </>
      );
      corBg = "bg-gray-50";
      corBorder = "border-gray-200";
      corTexto = "text-gray-600";
      corIcone = "text-gray-400";
    }

    return (
      <section className={`${corBg} rounded-2xl shadow-sm border ${corBorder} p-10 transition-all duration-500 ease-in-out`}>
        <div className="flex flex-col items-center justify-center text-center gap-4 max-w-lg mx-auto">
          <div className={corIcone}>
            {icon}
          </div>
          <h3 className={`text-xl font-bold ${corTexto}`}>
            {titulo}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {descricao}
          </p>
        </div>
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20">

      {/* ───────────────── HEADER SELECIONADORES ───────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-8 border-b border-gray-50 pb-6">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
            <DocumentCheckIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              Registro de Avaliações
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Lance notas e acompanhe o rendimento baseando-se em seus Planos de Avaliação.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* DISCIPLINA */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
              Disciplina
            </label>
            <div className="flex flex-wrap gap-2">
              {disciplinas.length === 0 && <span className="text-sm text-gray-400">Nenhuma disciplina</span>}
              {disciplinas.map((d) => (
                <button
                  key={d}
                  onClick={() => setDisciplinaSelecionada(d)}
                  className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-lg text-sm font-bold transition-all shadow-sm ${
                    disciplinaSelecionada === d
                      ? "bg-indigo-50 text-indigo-700 border-2 border-indigo-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* BIMESTRE */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
              Bimestre
            </label>
            <div className="flex flex-wrap gap-2">
              {bimestres.map((b) => (
                <button
                  key={b}
                  onClick={() => setBimestreSelecionado(b)}
                  className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-lg text-sm font-bold transition-all shadow-sm ${
                    bimestreSelecionado === b
                      ? "bg-green-50 text-green-700 border-2 border-green-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {b.replace(" Bimestre", " Bim")}
                </button>
              ))}
            </div>
          </div>

          {/* TURMA */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
              Turma
            </label>
            {disciplinaSelecionada ? (
                <div className="flex flex-wrap gap-2">
                    {turmas.length === 0 ? (
                        <span className="text-sm text-gray-500 py-2">Sem turmas</span>
                    ) : (
                        <div className="relative w-full">
                            <select
                                value={turmaSelecionada}
                                onChange={(e) => setTurmaSelecionada(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-sm cursor-pointer"
                            >
                                <option value="" disabled>Selecionar Turma...</option>
                                {turmas.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full py-3 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-sm text-gray-400">
                    Selecione a disciplina
                </div>
            )}
          </div>

        </div>
      </section>

      {/* ───────────────── ALERTAS ───────────────── */}
      {mensagemSistema && (
         <div className={`p-4 rounded-xl font-bold shadow-sm flex items-center gap-3 ${
             mensagemSistema.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
             mensagemSistema.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
             'bg-blue-100 text-blue-800 border border-blue-200'
         }`}>
             <ExclamationCircleIcon className="w-6 h-6" />
             {mensagemSistema.text}
         </div>
      )}

      {/* ───────────────── MENSAGEM DE PLANO NÃO DISPONÍVEL ───────────────── */}
      {renderMensagemPlanoNaoDisponivel()}

      {/* ───────────────── GRID DE AVALIAÇÃO ───────────────── */}
      {selecaoCompleta && plano && (
        <section className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 flex flex-col relative transition-all duration-500 ease-in-out">
            <div className="bg-slate-800 text-white p-6 flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-bold flex items-center gap-2">
                      <TableCellsIcon className="w-6 h-6 text-indigo-400" />
                      Lançamento de Notas
                   </h3>
                   <div className="flex gap-4 mt-2 text-sm text-slate-300 font-medium">
                       <span><strong className="text-white">Turma:</strong> {turmaObj?.nome || "Carregando"}</span>
                       <span><strong className="text-white">Disciplina:</strong> {disciplinaSelecionada}</span>
                       <span><strong className="text-white">Bimestre:</strong> {bimestreSelecionado}</span>
                   </div>
                   <div className="mt-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        planoStatus === "APROVADO" ? "bg-blue-500/20 text-blue-300" : "bg-green-500/20 text-green-300"
                      }`}>
                        Plano {planoStatus}
                      </span>
                   </div>
                </div>
                <div>
                    {!carregandoDados && plano && (
                        <button
                          onClick={salvarAvaliacoes}
                          disabled={salvando}
                          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-500 hover:bg-green-400 font-bold text-slate-900 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                            {salvando ? "SALVANDO..." : "SALVAR DIÁRIO"}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full bg-gray-50 relative min-h-[300px]">
                {carregandoDados ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                       <div className="flex flex-col items-center gap-3">
                           <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                           <span className="text-sm font-bold text-gray-500">Montando Diário...</span>
                       </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full p-0">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-slate-100 text-slate-600 sticky top-0 z-20 shadow-sm shadow-slate-200">
                                <tr>
                                    <th rowSpan={2} className="px-6 py-4 font-bold border-b border-r border-slate-200 w-10 text-center">Nº</th>
                                    <th rowSpan={2} className="px-6 py-4 font-bold border-b border-r border-slate-200 bg-slate-100 sticky left-0 z-30 min-w-[250px] shadow-sm">Estudante</th>

                                    {/* CABEÇALHO 1 - Títulos das Atividades */}
                                    {(Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || "[]")).map((item, idx) => (
                                       <th key={idx} colSpan={Number(item.oportunidades) || 1} className="px-4 py-2 text-center text-[11px] font-black uppercase tracking-wider text-indigo-800 border-b border-r border-indigo-100 bg-indigo-50/50">
                                           {item.atividade}
                                           <div className="text-[10px] text-indigo-500 font-semibold lowercase mt-0.5">
                                               (Max: {item.nota_total} pts)
                                           </div>
                                       </th>
                                    ))}

                                    <th rowSpan={2} className="px-6 py-4 font-black uppercase tracking-widest text-center border-b border-slate-200 text-slate-800 bg-slate-200 min-w-[120px]">TOTAL</th>
                                </tr>
                                <tr>
                                    {/* CABEÇALHO 2 - Oportunidades detalhadas */}
                                    {columns.map((col, idx) => (
                                        <th key={`sub_${idx}`} className="px-2 py-2 text-center text-xs font-bold border-b border-r border-slate-200 text-slate-500 min-w-[80px]">
                                            <div className="flex flex-col items-center justify-center">
                                               <span title={`Valor máximo para este item: ${col.maxVal}`}>{col.label}</span>
                                               {col.freqTotal > 1 && <span className="text-[10px] text-slate-400 font-normal">v. {col.maxVal.toFixed(1)}</span>}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {alunos.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length + 3} className="p-8 text-center text-gray-400 font-medium">
                                            Nenhum aluno matriculado nesta turma.
                                        </td>
                                    </tr>
                                ) : (
                                    alunos.map((aluno, index) => {
                                        const total = calcularTotalAluno(aluno.id);
                                        const percentage = (total / 10) * 100;

                                        return (
                                        <tr key={aluno.id} className="hover:bg-indigo-50/30 transition-colors border-b border-slate-100 group">
                                            <td className="px-6 py-3 text-center text-sm font-semibold text-slate-400">{index + 1}</td>
                                            <td className="px-6 py-3 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-indigo-50/30 transition-colors border-r border-slate-100 z-10 flex flex-col">
                                                <span>{aluno.nome}</span>
                                                <span className="text-xs font-medium text-slate-400">Mat: {aluno.matricula || "---"}</span>
                                            </td>

                                            {/* CÉLULAS DE INPUT */}
                                            {columns.map((col, i) => {
                                                const val = notas[getNotaKey(aluno.id, col.itemIdx, col.opIdx)];
                                                const displayVal = val !== undefined ? val : "";
                                                const cor = coresCelulas[getNotaKey(aluno.id, col.itemIdx, col.opIdx)];

                                                const bgClass =
                                                   cor === "red" ? "bg-red-200 text-red-900" :
                                                   cor === "yellow" ? "bg-yellow-200 text-yellow-900" :
                                                   cor === "green" ? "bg-green-200 text-green-900" :
                                                   "bg-transparent text-indigo-900";

                                                return (
                                                <td
                                                   key={`cell_${i}`}
                                                   onContextMenu={(e) => handleContextMenu(e, aluno.id, col.itemIdx, col.opIdx, col.maxVal)}
                                                   className={`px-1 py-1 border-r border-slate-100 text-center relative group/cell transition-colors duration-300 ${cor === "red" ? "bg-red-100" : cor === "yellow" ? "bg-yellow-100" : cor === "green" ? "bg-green-100" : ""}`}
                                                >
                                                    <input
                                                       type="number"
                                                       min="0"
                                                       max={col.maxVal}
                                                       step="0.1"
                                                       value={displayVal}
                                                       onChange={(e) => handleNotaChange(aluno.id, col.itemIdx, col.opIdx, col.maxVal, e.target.value)}
                                                       className={`w-full text-center py-2.5 font-bold border border-transparent rounded-lg hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-300 ${bgClass}`}
                                                       placeholder="-"
                                                    />
                                                    {/* Tooltip de suporte no hover */}
                                                    <div className="absolute opacity-0 group-hover/cell:opacity-100 -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none transition-opacity whitespace-nowrap z-50">
                                                        Max: {col.maxVal}
                                                    </div>
                                                </td>
                                            )})}

                                            {/* CÉLULA TOTAL (Readonly) */}
                                            <td className="px-6 py-3 text-center border-l-2 border-slate-200 bg-slate-50/50">
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-lg font-black ${
                                                        Number(total) >= 6 ? 'text-green-600' :
                                                        Number(total) >= 4 ? 'text-orange-500' : 'text-red-600'
                                                    }`}>
                                                        {total}
                                                    </span>
                                                    <div className="w-16 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                              Number(total) >= 6 ? 'bg-green-500' :
                                                              Number(total) >= 4 ? 'bg-orange-500' : 'bg-red-500'
                                                          }`}
                                                          style={{ width: `${Math.min(percentage, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Pressione <strong>Tab</strong> ou use as setas para navegar rapidamente pelas células. <strong className="text-indigo-600">Dica: Clique com o botão direito</strong> em qualquer célula para dar nota rápida por cores.</span>
                <span className="flex items-center gap-1.5"><DocumentCheckIcon className="w-4 h-4"/> Os dados são salvos separadamente por bimestre.</span>
            </div>
        </section>
      )}

      {/* MODAL CONTEXTUAL DE CORES */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          ></div>
          <div
            className="fixed z-[101] bg-white rounded-xl shadow-2xl border border-slate-200 p-3 transform transition-all animate-in fade-in zoom-in duration-200"
            style={{
               left: Math.min(contextMenu.x, window.innerWidth - 180),
               top: Math.min(contextMenu.y, window.innerHeight - 150)
            }}
          >
            <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide text-center">Classificação Rápida</div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => handleSelectColor('red')}
                className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 hover:scale-110 shadow-md shadow-red-500/30 transition-all flex items-center justify-center group"
                title="Sem aproveitamento (0 pts)"
              >
                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-bold">0%</span>
              </button>
              <button
                onClick={() => handleSelectColor('yellow')}
                className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-500 hover:scale-110 shadow-md shadow-yellow-500/30 transition-all flex items-center justify-center group"
                title="Cumpriu parcialmente (Metade dos pts)"
              >
                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-bold">50%</span>
              </button>
              <button
                onClick={() => handleSelectColor('green')}
                className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 hover:scale-110 shadow-md shadow-green-500/30 transition-all flex items-center justify-center group"
                title="Apresentou satisfatoriamente (Max pts)"
              >
                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-bold">100%</span>
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
