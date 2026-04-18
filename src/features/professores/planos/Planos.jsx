import React, { useState, useEffect } from "react";
import ModalAdicionarItemPlano from "./ModalAdicionarItemPlano";
import ModalRecallTipoAvaliacao from "./ModalRecallTipoAvaliacao";
import api from "../../../services/api";

import {
  IdentificationIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";

import {
  ClockIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";



/**
 * AtividadesAvaliativas.jsx
 * ------------------------------------------------------------
 * Página: Plano de Avaliação Pedagógica
 * Escopo atual: SOMENTE FRONTEND (layout + fluxo visual)
 * Backend e persistência serão integrados em passos futuros.
 * ------------------------------------------------------------
 */

export default function Planos() {
  // ---------------------------
  // Estados de seleção
  // ---------------------------
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null);
  const [bimestreSelecionado, setBimestreSelecionado] = useState(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [mostrarTabela, setMostrarTabela] = useState(false);

  // ---------------------------
  // Mensagens
  // ---------------------------
  const [mensagemSistema, setMensagemSistema] = useState(null);
  const showMsg = (type, text) => {
    setMensagemSistema({ type, text });
    setTimeout(() => setMensagemSistema(null), 3500);
  };

  // ---------------------------
  // PAP (mock) — controle local
  // ---------------------------
  const [papStatus, setPapStatus] = useState("RASCUNHO"); // RASCUNHO | ENVIADO | APROVADO | DEVOLVIDO | BLOQUEADO_TEMPO

  const [papKeyAtiva, setPapKeyAtiva] = useState(null);


  // ---------------------------
  // Regras de pontuação (mock)
  // ---------------------------
  const PONTOS_TOTAL_PAP = 10;

  const totalPontos = (lista) =>
    (lista || []).reduce((acc, it) => acc + Number(it?.nota_total || 0), 0);

  // Tabela (mock inicial) — em passos futuros virá do backend

  const [itens, setItens] = useState([
    {
      atividade: "Prova Bimestral",
      data_inicio: "",
      data_final: "",
      nota_total: 5, // ✅ regra mock da direção: 5 pontos fixos
      oportunidades: 1,
      nota_invertida: 0,
      descricao: "",
      fixo_direcao: true, // ✅ trava edição/remoção
    },
  ]);

  // ✅ Cálculos dependem de "itens" — devem ficar DEPOIS do state
  const totalAtual = totalPontos(itens);
  const saldo = Number((PONTOS_TOTAL_PAP - totalAtual).toFixed(2));

  const pontosOk = Math.abs(totalAtual - PONTOS_TOTAL_PAP) < 0.0001;
  const pontosExcedeu = totalAtual > PONTOS_TOTAL_PAP;

  const [modalItemOpen, setModalItemOpen] = useState(false);

  // ✅ Controle de edição (null = inclusão / número = índice do item em edição)
  const [editIndex, setEditIndex] = useState(null);

  // ✅ Modal premium de confirmação (exclusão)
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [confirmExcluirIndex, setConfirmExcluirIndex] = useState(null);

  // ✅ Modal premium de governança (ENVIADO / APROVADO / DEVOLVIDO)
  const [modalGovernanca, setModalGovernanca] = useState(null); // null | { tipo: "ENVIADO" | "APROVADO", turma: "...", planoId }
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false); // modal de confirmação após solicitar liberação
  const [solicitandoLiberacao, setSolicitandoLiberacao] = useState(false);

  // ✅ Modal de data da Prova Bimestral (fixo_direcao)
  const [modalDataFixo, setModalDataFixo] = useState(false);
  const [dataFixoTemp, setDataFixoTemp] = useState("");

  // Campos do modal
  const [atividade, setAtividade] = useState("");
  const [tipoAvaliacao, setTipoAvaliacao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [notaTotal, setNotaTotal] = useState("");
  const [oportunidades, setOportunidades] = useState("1");
  const [notaInvertida, setNotaInvertida] = useState("0");
  const [descricao, setDescricao] = useState("");

  // ---------------------------
  // Dados do BD (Professor Logado)
  // ---------------------------
  const [disciplinas, setDisciplinas] = useState([]);
  const bimestres = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
  const [turmas, setTurmas] = useState([]);

  useEffect(() => {
    // Busca APENAS disciplinas atreladas ao professor logado na carga inicial
    const fetchDadosIniciais = async () => {
      try {
        const resDisc = await api.get("/professores/me/disciplinas");

        if (resDisc.data?.ok) {
          // Extrai os nomes das disciplinas do array de objetos retornado
          const nomesDisciplinas = resDisc.data.disciplinas.map(d => d.nome);
          setDisciplinas(nomesDisciplinas);
          
          // Auto-select se houver apenas uma disciplina
          if (nomesDisciplinas.length === 1) {
             setDisciplinaSelecionada(nomesDisciplinas[0]);
          }
        }

      } catch (err) {
        console.error("Erro ao carregar dados do professor", err);
      }
    };
    fetchDadosIniciais();
  }, []);

  // ---------------------------
  // Regra temporal (MOCK)
  // - Ajustaremos depois para vir do calendário da escola (backend)
  // ---------------------------
  // Exemplo: no mês 9 (setembro) -> 1º e 2º encerrados (bloqueados)
  const mesAtual = new Date().getMonth() + 1; // 1..12

  const statusBimestreMock = (bimLabel) => {
    const n = Number((bimLabel || "").split("º")[0]);
    if (!n) return "ATIVO";

    // Regras simples para mock:
    // Jan–Mar: 1º ATIVO, demais FUTURO
    // Abr–Jun: 1º ENCERRADO, 2º ATIVO
    // Jul–Set: 1º/2º ENCERRADOS, 3º ATIVO
    // Out–Dez: 1º/2º/3º ENCERRADOS, 4º ATIVO
    if (mesAtual <= 3) return n === 1 ? "ATIVO" : "FUTURO";
    if (mesAtual <= 6) return n === 1 ? "ENCERRADO" : n === 2 ? "ATIVO" : "FUTURO";
    if (mesAtual <= 9) return n <= 2 ? "ENCERRADO" : n === 3 ? "ATIVO" : "FUTURO";
    return n <= 3 ? "ENCERRADO" : "ATIVO";
  };

  const bimestreEncerrado = (bimLabel) => statusBimestreMock(bimLabel) === "ENCERRADO";

  // ---------------------------
  // Master Table Flow
  // ---------------------------
  const [loadingPlanos, setLoadingPlanos] = useState(false);
  const [turmasComPlanos, setTurmasComPlanos] = useState([]); // [{ turma, id_plano, status, nota_total ...}]
  
  // Quando disciplina ou bimestre muda, busca do backend
  useEffect(() => {
    if (!disciplinaSelecionada || !bimestreSelecionado) {
      setTurmasComPlanos([]);
      setMostrarTabela(false);
      return;
    }

    const buscarPlanos = async () => {
      setLoadingPlanos(true);
      try {
        const ano = new Date().getFullYear();
        
        // Em paralelo, buscamos os planos e também as turmas do professor filtradas pela disciplina atual!
        const [resAvaliacoes, resTurmas] = await Promise.all([
          api.get("/avaliacoes", {
            params: { disciplina: disciplinaSelecionada, bimestre: bimestreSelecionado, ano }
          }),
          api.get("/professores/me/turmas", {
            params: { disciplina: disciplinaSelecionada }
          })
        ]);

        const data = resAvaliacoes.data || [];
        const turmasAtualizadas = (resTurmas.data?.turmas || []).map(t => t.nome);
        setTurmas(turmasAtualizadas); // Armazena a lista pura para caso precise em outros cantos

        // Monta nosso cruzamento Base (Todas as Turmas do Professor) x (Planos que vieram do banco)
        const listaComStatus = turmasAtualizadas.map(t => {
          const planoNoBanco = data.find(p => p.turmas === t);
          return {
            turma: t,
            id: planoNoBanco ? planoNoBanco.id : null,
            status: planoNoBanco ? planoNoBanco.status : "PENDENTE",
            motivo_devolucao: planoNoBanco?.motivo_devolucao || null,
          };
        });

        setTurmasComPlanos(listaComStatus);

      } catch (error) {
        console.error("Erro ao buscar planos:", error);
        showMsg("error", "Erro ao carregar os dados das turmas.");
      } finally {
        setLoadingPlanos(false);
      }
    };

    buscarPlanos();
  }, [disciplinaSelecionada, bimestreSelecionado]);


  // Controle do Modo "Plano Detalhado" (abrir visualização/edição)
  const [modoEdicaoPlano, setModoEdicaoPlano] = useState(false);
  const [turmasDoPlanoAberto, setTurmasDoPlanoAberto] = useState([]); // Array p/ suportar lote
  
  const abrirPlano = async (turmasArray, planoId) => {
    setTurmasDoPlanoAberto(turmasArray);
    
    // Se for um plano existente
    if (planoId) {
      try {
        const { data } = await api.get(`/avaliacoes/${planoId}`);
        setPapKeyAtiva(planoId);
        setPapStatus(data.status || "RASCUNHO");
        if (data.itens && data.itens.length > 0) {
           // ✅ Normaliza datas de ISO datetime para YYYY-MM-DD (formato aceito por input[type=date])
           const norm = (d) => d ? String(d).slice(0, 10) : '';
           setItens(data.itens.map(it => ({
             ...it,
             data_inicio: norm(it.data_inicio),
             data_final:  norm(it.data_final),
             data:        norm(it.data),
           })));
        } else {
           setItens([{ atividade: "Prova Bimestral", nota_total: 5, oportunidades: 1, nota_invertida: 0, fixo_direcao: true }]);
        }
      } catch (err) {
        console.error(err);
        showMsg("error", "Erro ao buscar detalhes do plano.");
        return;
      }
    } else {
      // Plano NOVO
      setPapKeyAtiva("NOVO");
      setPapStatus("RASCUNHO");
      setItens([{ atividade: "Prova Bimestral", nota_total: 5, oportunidades: 1, nota_invertida: 0, fixo_direcao: true }]);
    }
    
    setMostrarTabela(true); // Exibe o painel de edição
    setModoEdicaoPlano(true);
  };

  const voltarTabelaMestra = () => {
    setModoEdicaoPlano(false);
    setMostrarTabela(false);
    // ✅ Força o useEffect a recarregar a lista de planos (status atualizado)
    const disc = disciplinaSelecionada;
    setDisciplinaSelecionada(null);
    setTimeout(() => setDisciplinaSelecionada(disc), 80);
  };


  const selecaoMinimaOk = !!disciplinaSelecionada && !!bimestreSelecionado;
  const bloqueadoPorTempo = !!bimestreSelecionado && bimestreEncerrado(bimestreSelecionado);

  const [selecaoLote, setSelecaoLote] = useState([]);
  const toggleSelecaoLote = (t) => {
    setSelecaoLote(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20">

      {/* =======================
          Seletor Superior
      ======================== */}
      {!modoEdicaoPlano && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-8 border-b border-gray-50 pb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
              <IdentificationIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                Plano de Avaliação Pedagógica
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Selecione os parâmetros para consultar ou gerar os planos avaliativos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Disciplina - 5 colunas */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                Disciplina
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-100 shadow-inner h-full">
                {disciplinas.map((d) => {
                  const isSelected = disciplinaSelecionada === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDisciplinaSelecionada(d)}
                      className={`flex-1 min-w-[100px] py-3 px-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                        isSelected 
                          ? "bg-white text-blue-700 shadow-md transform scale-[1.02]"
                          : "text-gray-500 hover:bg-gray-200/60 hover:text-gray-800"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bimestre - 7 colunas */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                Bimestre
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-100 shadow-inner h-full">
                {bimestres.map((b) => {
                  const isSelected = bimestreSelecionado === b;
                  return (
                    <button
                      key={b}
                      onClick={() => setBimestreSelecionado(b)}
                      className={`flex-1 min-w-[100px] py-3 px-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                        isSelected 
                          ? "bg-green-100 text-green-800 shadow-md transform scale-[1.02] border border-green-200"
                          : "text-gray-500 hover:bg-gray-200/60 hover:text-gray-800"
                      }`}
                    >
                      {b.replace(" Bimestre", " Bim")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =======================
          Tabela Mestra (Dashboard)
      ======================== */}
      {!modoEdicaoPlano && selecaoMinimaOk && (
        <section className="bg-white rounded-xl shadow-lg p-6 mb-10">
          
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold text-blue-900">Turmas - Status de Avaliação</h2>
              <p className="text-gray-500">{disciplinaSelecionada} • {bimestreSelecionado}</p>
            </div>

            <div className="flex gap-4">
               {selecaoLote.length > 0 && (
                 <button
                    onClick={() => abrirPlano(selecaoLote, null)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow"
                 >
                   Criar Plano em Lote ({selecaoLote.length})
                 </button>
               )}
            </div>
          </div>

          {loadingPlanos ? (
            <p className="text-center text-gray-500 py-4">Carregando turmas...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="py-3 px-4 border-b">
                      <input 
                        type="checkbox" 
                        title="Selecionar todas sem plano"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelecaoLote(turmasComPlanos.filter(t => t.status === "PENDENTE").map(t => t.turma));
                          } else {
                            setSelecaoLote([]);
                          }
                        }}
                      />
                    </th>
                    <th className="py-3 px-4 border-b font-semibold text-gray-700">Turma</th>
                    <th className="py-3 px-4 border-b font-semibold text-gray-700">Bimestre</th>
                    <th className="py-3 px-4 border-b font-semibold text-gray-700">Disciplina</th>
                    <th className="py-3 px-4 border-b font-semibold text-gray-700">Status do Plano</th>
                    <th className="py-3 px-4 border-b font-semibold text-gray-700 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {turmasComPlanos.map(({ turma, id, status, motivo_devolucao }) => {
                    
                    const isPendente = status === "PENDENTE";
                    const isRascunho = status === "RASCUNHO";
                    const isEnviado = status === "ENVIADO";
                    const isAprovado = status === "APROVADO";
                    const isDevolvido = status === "DEVOLVIDO";
                    // ✅ Aprovado + professor já solicitou liberação para edição
                    const isLiberacaoSolicitada = status === "LIBERACAO_SOLICITADA";

                    return (
                      <tr key={turma} className="hover:bg-gray-50 border-b">
                        <td className="py-3 px-4">
                           {isPendente && (
                             <input 
                                type="checkbox" 
                                checked={selecaoLote.includes(turma)} 
                                onChange={() => toggleSelecaoLote(turma)} 
                             />
                           )}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800">{turma}</td>
                        <td className="py-3 px-4 text-gray-600">{bimestreSelecionado}</td>
                        <td className="py-3 px-4 text-gray-600">{disciplinaSelecionada}</td>
                        <td className="py-3 px-4">
                          {isPendente && <span className="text-red-600 bg-red-100 px-3 py-1 rounded-full text-xs font-bold">🔴 PENDENTE</span>}
                          {isRascunho && <span className="text-orange-600 bg-orange-100 px-3 py-1 rounded-full text-xs font-bold">🟠 RASCUNHO</span>}
                          {isEnviado && <span className="text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs font-bold">🟢 ENVIADO</span>}
                          {isAprovado && <span className="text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-xs font-bold">🔵 APROVADO</span>}
                          {isDevolvido && <span className="text-amber-700 bg-amber-100 px-3 py-1 rounded-full text-xs font-bold">🟡 DEVOLVIDO</span>}
                          {/* ✅ Status duplo: aprovado + edição solicitada */}
                          {isLiberacaoSolicitada && (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-xs font-bold">🔵 APROVADO</span>
                              <span className="text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
                                ✏️ EDIÇÃO SOLICITADA
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                           {isPendente ? (
                             <button
                               onClick={() => abrirPlano([turma], null)}
                               className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition"
                             >
                               Criar Plano
                             </button>
                           ) : isRascunho ? (
                             <button
                               onClick={() => abrirPlano([turma], id)}
                               className="text-sm px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded shadow transition"
                             >
                               Editar
                             </button>
                           ) : isEnviado ? (
                             <button
                               onClick={() => setModalGovernanca({ tipo: "ENVIADO", turma })}
                               className="text-sm px-4 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded shadow-sm border border-amber-200 transition"
                             >
                               Editar
                             </button>
                           ) : isAprovado ? (
                             <button
                               onClick={() => setModalGovernanca({ tipo: "APROVADO", turma, planoId: id, solicitacaoJaFeita: false })}
                               className="text-sm px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded shadow-sm border border-blue-200 transition"
                             >
                               Editar
                             </button>
                           ) : isLiberacaoSolicitada ? (
                             // ✅ Já solicitou liberação — abre o mesmo modal mas com botão bloqueado
                             <button
                               onClick={() => setModalGovernanca({ tipo: "APROVADO", turma, planoId: id, solicitacaoJaFeita: true })}
                               className="text-sm px-4 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded shadow-sm border border-purple-200 transition"
                             >
                               Editar
                             </button>
                           ) : isDevolvido ? (
                             <button
                               onClick={() => setModalGovernanca({ tipo: "DEVOLVIDO", turma, motivo: motivo_devolucao, planoId: id })}
                               className="text-sm px-4 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded shadow-sm border border-amber-300 transition"
                             >
                               Ver motivo
                             </button>
                           ) : (
                             <button
                               onClick={() => abrirPlano([turma], id)}
                               className="text-sm px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded shadow transition"
                             >
                               Visualizar
                             </button>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* =======================
          Tabela de Atividades
      ======================== */}

      {mostrarTabela && (
        <section className="bg-white rounded-xl shadow-lg p-6">
          {/* Mensagem do sistema */}
          {mensagemSistema && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${
                mensagemSistema.type === "success"
                  ? "bg-green-100 text-green-800"
                  : mensagemSistema.type === "warn"
                    ? "bg-yellow-100 text-yellow-800"
                    : mensagemSistema.type === "info"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
              }`}
            >
              {mensagemSistema.text}
            </div>
          )}

          {/* Banner de governança (modo consulta) */}
          {(papStatus === "BLOQUEADO_TEMPO" || papStatus === "APROVADO" || papStatus === "ENVIADO") && (
            <div className="mb-4 rounded-lg px-4 py-3 text-sm bg-gray-50 text-gray-700 border">
              <span className="font-bold">Modo:</span>{" "}
              {papStatus === "BLOQUEADO_TEMPO"
                ? "CONSULTA (bimestre encerrado)"
                : papStatus === "APROVADO"
                  ? "CONSULTA (PAP aprovado)"
                  : "CONSULTA (PAP enviado para direção)"}
            </div>
          )}

          {/* Banner de pontuação */}
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold border ${
              pontosOk
                ? "bg-green-50 text-green-800 border-green-200"
                : pontosExcedeu
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-yellow-50 text-yellow-800 border-yellow-200"
            }`}
          >
            Total do PAP: <span className="font-bold">{totalAtual}</span> / {PONTOS_TOTAL_PAP} pontos
            {"  "}
            {!pontosOk && (
              <span className="ml-2">
                {pontosExcedeu
                  ? `(Excedeu ${Math.abs(saldo)} ponto(s))`
                  : `(Faltam ${saldo} ponto(s))`}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold text-blue-800">
              Atividades Avaliativas
            </h3>

            <button
              type="button"
              onClick={() => {
                // bloqueios de governança (mock)
                if (papStatus === "ENVIADO")
                  return showMsg("info", "PAP enviado: aguardando apreciação da direção.");
                if (papStatus === "APROVADO")
                  return showMsg("info", "PAP aprovado: edição bloqueada.");
                if (papStatus === "BLOQUEADO_TEMPO")
                  return showMsg("info", "Bimestre encerrado: apenas consulta.");

                // ✅ mensagem mesmo ao “tentar”
                if (pontosOk)
                  return showMsg(
                    "warn",
                    "Pontuação completa (10/10). Para adicionar novo item, reduza algum item existente."
                  );

                if (pontosExcedeu)
                  return showMsg(
                    "error",
                    "Pontuação excedida. Ajuste os valores antes de adicionar novos itens."
                  );

                // ✅ modo inclusão
                setEditIndex(null);

                setAtividade("");
                setTipoAvaliacao("");
                setDataInicio("");
                setDataFinal("");
                setNotaTotal("");
                setOportunidades("1");
                setNotaInvertida("0");
                setDescricao("");
                setModalItemOpen(true);

              }}
              disabled={
                papStatus === "ENVIADO" ||
                papStatus === "APROVADO" ||
                papStatus === "BLOQUEADO_TEMPO"
              }
              className={`px-4 py-2 rounded-lg text-white font-semibold shadow transition ${
                papStatus === "ENVIADO" ||
                papStatus === "APROVADO" ||
                papStatus === "BLOQUEADO_TEMPO"
                  ? "bg-gray-300 cursor-not-allowed"
                  : pontosOk || pontosExcedeu
                    ? "bg-blue-600 opacity-70 hover:opacity-80"
                    : "bg-blue-600 hover:bg-blue-700"
              }`}
              title={
                papStatus === "BLOQUEADO_TEMPO"
                  ? "Bimestre encerrado (somente consulta)"
                  : papStatus === "ENVIADO"
                    ? "PAP enviado (aguardando direção)"
                    : papStatus === "APROVADO"
                      ? "PAP aprovado (bloqueado)"
                      : pontosOk
                        ? "Pontuação completa (10/10)"
                        : pontosExcedeu
                          ? "Pontuação excedida"
                          : "Adicionar nova atividade avaliativa"
              }
            >
              + Item
            </button>

          </div>

          <table className="w-full border">

            <thead className="bg-blue-100">
              <tr>
                <th className="border px-4 py-2">Valor</th>
                <th className="border px-4 py-2">Frequência</th>
                <th className="border px-4 py-2">Por ocorrência</th>
                <th className="border px-4 py-2">Atividade Avaliativa</th>
                <th className="border px-4 py-2">Ações</th>
              </tr>
            </thead>

            <tbody>
              {itens.map((item, idx) => {
                const freq = Number(item?.oportunidades || 1);
                const valor = Number(item?.nota_total || 0);
                const porOcorrencia =
                  freq > 0 ? Number((valor / freq).toFixed(2)) : valor;

                const isFixo = !!item?.fixo_direcao;

                return (
                  <tr key={`${item.atividade}-${idx}`} className="text-center">
                    <td className="border px-4 py-2">{valor}</td>
                    <td className="border px-4 py-2">{Number.isNaN(freq) ? 1 : freq}</td>
                    <td className="border px-4 py-2">{porOcorrencia}</td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <span>{item.atividade}</span>
                        {isFixo && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                            FIXO (DIREÇÃO)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      {isFixo ? (
                        // ✅ Botão de data para Prova Bimestral padronizada
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            title={item.data_inicio
                              ? `Data da prova: ${new Date(item.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} — clique para alterar`
                              : 'Definir data da Prova Bimestral (obrigatório para enviar)'}
                            onClick={() => {
                              if (papStatus === 'APROVADO') return showMsg('info', 'PAP aprovado: data bloqueada para edição.');
                              if (papStatus === 'ENVIADO') return showMsg('info', 'PAP enviado: aguardando apreciação da direção.');
                              setDataFixoTemp(item.data_inicio || '');
                              setModalDataFixo(true);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                              item.data_inicio
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 animate-pulse'
                            }`}
                          >
                            <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
                            {item.data_inicio
                              ? new Date(item.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')
                              : 'Definir data'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {/* Ícone 1 (AZUL) — padrão discreto (igual Alunos) */}

                          <button
                            type="button"
                            onClick={() => {
                              // Ícone 1 (AZUL) — Solicitar edição do item (mock)

                              // 1) Se o bimestre já encerrou (status final)
                              if (papStatus === "BLOQUEADO_TEMPO") {
                                return showMsg(
                                  "info",
                                  "Bimestre encerrado: não é mais possível editar este item."
                                );
                              }

                              // 2) Se o PAP ainda está em rascunho (não enviado)
                              if (papStatus === "RASCUNHO") {
                                return showMsg(
                                  "info",
                                  "Plano ainda não foi enviado para a direção. Você pode continuar editando para finalizar."
                                );
                              }

                              // 3) Qualquer outro status (ENVIADO / APROVADO / DEVOLVIDO):
                              //    Solicitação de edição vai para direção (mock)
                              return showMsg(
                                "info",
                                "Sua solicitação para editar este item foi enviada para a direção. Em breve você poderá editar."
                              );
                            }}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition"
                            title="Solicitar edição do item"
                          >
                            <IdentificationIcon className="h-5 w-5" />
                          </button>

                          {/* Ícone 3 (ROXO) — Editar item (respeitando status do PAP) */}
                          <button
                            type="button"
                            onClick={() => {
                              // Ícone 3 (ROXO) — Editar item (mock)

                              // 1) Se o bimestre já encerrou (status final)
                              if (papStatus === "BLOQUEADO_TEMPO") {
                                return showMsg(
                                  "info",
                                  "Bimestre encerrado: não é mais possível editar este item."
                                );
                              }

                              // 2) Se o PAP ainda está em rascunho (pode editar livremente)

                              if (papStatus === "RASCUNHO") {
                                // ✅ modo edição
                                setEditIndex(idx);

                                // abre modal preenchido com os dados do item
                                setAtividade(item?.atividade || "");
                                setTipoAvaliacao(item?.tipo_avaliacao || "");
                                setDataInicio(item?.data_inicio || item?.data || "");
                                setDataFinal(item?.data_final || item?.data || "");
                                setNotaTotal(String(item?.nota_total ?? ""));
                                setOportunidades(String(item?.oportunidades ?? "1"));
                                setNotaInvertida(String(item?.nota_invertida ?? "0"));
                                setDescricao(item?.descricao || "");

                                setModalItemOpen(true);
                                return;
                              }

                              // 3) Qualquer outro status (ENVIADO / APROVADO / DEVOLVIDO):
                              //    Solicitação de edição vai para direção (mock)
                              return showMsg(
                                "info",
                                "Sua solicitação para editar este item foi enviada para a direção. Em breve você poderá editar."
                              );
                            }}
                            className="p-1.5 rounded text-purple-600 hover:bg-purple-50 transition"
                            title="Editar item"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>

                          {/* Ícone 4 (VERMELHO) — padrão discreto (igual Alunos) */}
                          <button
                            type="button"
                            onClick={() => {
                              if (papStatus === "ENVIADO") return showMsg("info", "PAP enviado: edição bloqueada.");
                              if (papStatus === "APROVADO") return showMsg("info", "PAP aprovado: edição bloqueada.");
                              if (papStatus === "BLOQUEADO_TEMPO") return showMsg("info", "Bimestre encerrado: apenas consulta.");

                              // ✅ abre modal premium de confirmação
                              setConfirmExcluirIndex(idx);
                              setConfirmExcluirOpen(true);
                            }}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 transition"
                            title="Remover item"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>

                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>

          {/* Ações do PAP (mock) */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-800">Status do PAP:</span>{" "}
              <span className="font-semibold">
                {papStatus === "BLOQUEADO_TEMPO" ? "BLOQUEADO (TEMPO)" : papStatus}
              </span>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={async () => {
                  if (!papKeyAtiva) return;
                  if (papStatus === "BLOQUEADO_TEMPO") return showMsg("info", "Bimestre encerrado: apenas consulta.");
                  if (papStatus === "APROVADO") return showMsg("info", "PAP aprovado: edição bloqueada.");
                  if (papStatus === "ENVIADO") return showMsg("info", "Este PAP já foi enviado para direção.");

                  try {
                    const nomeCodigo = "Plano-" + Math.floor(Math.random() * 10000); // Gerado via backend depois logicamente
                    const payload = {
                      disciplina: disciplinaSelecionada,
                      bimestre: bimestreSelecionado,
                      turmas: turmasDoPlanoAberto,
                      ano: new Date().getFullYear(),
                      nome_codigo: nomeCodigo,
                      status: "RASCUNHO",
                      itens
                    };
                    const { data } = await api.post("/avaliacoes", payload);
                    if (data.success) {
                      // ✅ Atualiza o ID do plano (caso fosse novo), mas FICA no editor
                      if (data.plano_ids) setPapKeyAtiva(data.plano_ids[0]);
                      showMsg("success", "✅ Rascunho salvo! Continue editando ou clique em VOLTAR PARA O PAINEL.");
                    }
                  } catch (err) {
                    console.error(err);
                    const errData = err?.response?.data;
                    if (err?.response?.status === 409 && errData?.item_bloqueado) {
                      showMsg("error", errData.error || `Não é possível remover "${errData.item_bloqueado}" — há notas lançadas nessa atividade.`);
                    } else {
                      showMsg("error", "Erro ao salvar rascunho.");
                    }
                  }
                }}
                disabled={!papKeyAtiva || papStatus === "BLOQUEADO_TEMPO" || papStatus === "APROVADO" || papStatus === "ENVIADO"}
                className={`px-6 py-3 rounded-xl font-bold shadow transition ${
                  !papKeyAtiva || papStatus === "BLOQUEADO_TEMPO" || papStatus === "APROVADO" || papStatus === "ENVIADO"
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                title="Salvar rascunho (Não envia ainda para a direção)"
              >
                SALVAR RASCUNHO
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!papKeyAtiva) return;

                  if (papStatus === "BLOQUEADO_TEMPO") return showMsg("info", "Bimestre encerrado: apenas consulta.");
                  if (papStatus === "APROVADO") return showMsg("info", "PAP aprovado: edição bloqueada.");
                  if (papStatus === "ENVIADO") return showMsg("info", "Este PAP já foi enviado para direção.");

                  if (!pontosOk) {
                    return showMsg(
                      "warn",
                      `Para enviar, o PAP deve fechar ${PONTOS_TOTAL_PAP} pontos. Atualmente: ${totalAtual}.`
                    );
                  }

                  // ✅ Data da Prova Bimestral é obrigatória ao enviar para direção
                  const itemFixo = itens.find(i => i.fixo_direcao);
                  if (itemFixo && !itemFixo.data_inicio) {
                    return showMsg(
                      "error",
                      "⚠️ Informe a data da Prova Bimestral antes de enviar. Use o botão 📅 na coluna Ações."
                    );
                  }

                  try {
                    const nomeCodigo = "Plano-" + Math.floor(Math.random() * 10000);
                    const payload = {
                      disciplina: disciplinaSelecionada,
                      bimestre: bimestreSelecionado,
                      turmas: turmasDoPlanoAberto,
                      ano: new Date().getFullYear(),
                      nome_codigo: nomeCodigo,
                      status: "ENVIADO",
                      itens
                    };
                    const { data } = await api.post("/avaliacoes", payload);
                    if (data.success) {
                      showMsg("success", "PAP enviado para direção com sucesso!");
                      voltarTabelaMestra();
                      // Forçar atualização do dashboard
                      setTimeout(() => {
                        setDisciplinaSelecionada(null);
                        setTimeout(() => setDisciplinaSelecionada(disciplinaSelecionada), 50);
                      }, 400);
                    }
                  } catch (err) {
                    console.error(err);
                    const errData = err?.response?.data;
                    if (err?.response?.status === 409 && errData?.item_bloqueado) {
                      showMsg("error", errData.error || `Não é possível remover "${errData.item_bloqueado}" — há notas lançadas nessa atividade.`);
                    } else {
                      showMsg("error", "Erro ao enviar PAP.");
                    }
                  }
                }}
                disabled={!papKeyAtiva || papStatus === "BLOQUEADO_TEMPO" || papStatus === "APROVADO" || papStatus === "ENVIADO"}
                className={`px-6 py-3 rounded-xl font-bold shadow transition ${
                  !papKeyAtiva || papStatus === "BLOQUEADO_TEMPO" || papStatus === "APROVADO" || papStatus === "ENVIADO"
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
                title={
                  papStatus === "BLOQUEADO_TEMPO"
                    ? "Bimestre encerrado (somente consulta)"
                    : papStatus === "ENVIADO"
                      ? "Já enviado para direção"
                      : papStatus === "APROVADO"
                        ? "PAP aprovado (bloqueado)"
                        : "Enviar este PAP para a direção/coordenação"
                }
              >
                ENVIAR PARA DIREÇÃO
              </button>

              <button
                type="button"
                onClick={voltarTabelaMestra}
                className="px-6 py-3 rounded-xl font-bold shadow bg-gray-500 hover:bg-gray-600 text-white transition ml-auto"
              >
                VOLTAR PARA O PAINEL
              </button>
            </div>
          </div>
        </section>
      )}


      {/* ═══════════════════════════════════════════════════════
          Modal: Data da Prova Bimestral (fixo_direcao)
      ════════════════════════════════════════════════════════ */}
      {modalDataFixo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModalDataFixo(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                <CalendarDaysIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-800">Data da Prova Bimestral</h4>
                <p className="text-xs text-gray-500 mt-0.5">Esta data é obrigatória para enviar o PAP à direção.</p>
              </div>
            </div>

            <div className="px-6 py-5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Data de Realização *
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                value={dataFixoTemp}
                onChange={(e) => setDataFixoTemp(e.target.value)}
                autoFocus
              />
              {!dataFixoTemp && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⚠️ Selecione a data antes de confirmar.
                </p>
              )}
            </div>

            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setModalDataFixo(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!dataFixoTemp}
                onClick={() => {
                  if (!dataFixoTemp) return;
                  // Atualiza o item fixo_direcao no array de itens
                  setItens(prev => prev.map(it =>
                    it.fixo_direcao
                      ? { ...it, data_inicio: dataFixoTemp, data_final: dataFixoTemp }
                      : it
                  ));
                  setModalDataFixo(false);
                  showMsg('success', `Data da Prova Bimestral definida: ${new Date(dataFixoTemp + 'T12:00:00').toLocaleDateString('pt-BR')}`);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow hover:from-amber-400 hover:to-orange-400 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Confirmar Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal premium de confirmação de exclusão */}
      {confirmExcluirOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            // clique fora fecha
            setConfirmExcluirOpen(false);
            setConfirmExcluirIndex(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()} // evita fechar ao clicar dentro
          >
            <div className="px-6 py-5 border-b">
              <h4 className="text-xl font-bold text-blue-900">
                Confirmar exclusão
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Você está prestes a excluir este item avaliativo. Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-lg bg-gray-50 border px-4 py-3 text-sm text-gray-700">
                <span className="font-semibold">Item:</span>{" "}
                <span className="font-bold">
                  {confirmExcluirIndex !== null && itens?.[confirmExcluirIndex]
                    ? itens[confirmExcluirIndex]?.atividade
                    : "—"}
                </span>
              </div>
            </div>

            <div className="px-6 py-5 border-t flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmExcluirOpen(false);
                  setConfirmExcluirIndex(null);
                }}
                className="px-5 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmExcluirIndex === null) {
                    setConfirmExcluirOpen(false);
                    return;
                  }

                  setItens((prev) => prev.filter((_, i) => i !== confirmExcluirIndex));
                  setConfirmExcluirOpen(false);
                  setConfirmExcluirIndex(null);

                  showMsg("success", "Item removido. Ajuste a pontuação para fechar 10 pontos.");
                }}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow transition"
              >
                Excluir item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL PREMIUM DE GOVERNANÇA — ENVIADO
          ═══════════════════════════════════════════════════════ */}
      {modalGovernanca?.tipo === "ENVIADO" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setModalGovernanca(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden transform transition-all animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradiente premium */}
            <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                  <ClockIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white tracking-tight">Aguardando Análise</h4>
                  <p className="text-amber-100 text-sm font-semibold mt-0.5">Direção / Coordenação</p>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div className="px-6 py-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Turma</span>
                <p className="text-amber-900 font-bold text-lg">{modalGovernanca.turma}</p>
                <p className="text-amber-600 text-xs font-medium mt-0.5">{disciplinaSelecionada} • {bimestreSelecionado}</p>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                Seu <strong className="text-gray-800">Plano de Avaliação</strong> foi enviado com sucesso e está sendo analisado pela <strong className="text-amber-700">Direção / Coordenação</strong>.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mt-3">
                Enquanto o plano estiver em análise, <strong className="text-gray-700">não é possível realizar edições</strong>. Você será notificado assim que houver um retorno.
              </p>

              {/* Status visual animado */}
              <div className="mt-6 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="relative">
                  <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm font-bold text-amber-700">Em análise pela Direção</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setModalGovernanca(null)}
                className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all active:scale-95"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL PREMIUM DE GOVERNANÇA — APROVADO
          ═══════════════════════════════════════════════════════ */}
      {modalGovernanca?.tipo === "APROVADO" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setModalGovernanca(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden transform transition-all animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradiente premium */}
            <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                  <ShieldCheckIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white tracking-tight">Plano Aprovado ✓</h4>
                  <p className="text-emerald-100 text-sm font-semibold mt-0.5">Direção / Coordenação</p>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div className="px-6 py-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Turma</span>
                <p className="text-emerald-900 font-bold text-lg">{modalGovernanca.turma}</p>
                <p className="text-emerald-600 text-xs font-medium mt-0.5">{disciplinaSelecionada} • {bimestreSelecionado}</p>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                Este <strong className="text-gray-800">Plano de Avaliação</strong> já foi <strong className="text-emerald-700">aprovado pela Direção / Coordenação</strong>.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mt-3">
                Se você realmente precisa fazer alterações, é necessário <strong className="text-gray-700">solicitar à Coordenação</strong> que libere o plano novamente para edição.
              </p>
              <p className="text-gray-400 text-xs leading-relaxed mt-2 italic">
                Após a alteração, o plano passará por uma nova avaliação para aprovação.
              </p>

              {/* Status visual */}
              <div className="mt-6 flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <LockClosedIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">Aprovado e bloqueado</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setModalGovernanca(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
              >
                Fechar
              </button>
              {/* ✅ Botão muda de verde para vermelho se já solicitou */}
              <button
                disabled={solicitandoLiberacao || !!modalGovernanca?.solicitacaoJaFeita}
                onClick={async () => {
                  if (!modalGovernanca?.planoId || modalGovernanca?.solicitacaoJaFeita) return;
                  setSolicitandoLiberacao(true);
                  try {
                    const res = await api.post(`/avaliacoes/solicitar-liberacao/${modalGovernanca.planoId}`, {
                      motivo: "Professor solicitou liberação para atualização do plano."
                    });
                    if (res.data?.ok) {
                      // ✅ Atualiza o estado local imediatamente (sem reload)
                      setTurmasComPlanos(prev => prev.map(t =>
                        t.turma === modalGovernanca.turma
                          ? { ...t, status: "LIBERACAO_SOLICITADA" }
                          : t
                      ));
                      setModalGovernanca(null);
                      setSolicitacaoEnviada(true);
                    } else {
                      showMsg("error", res.data?.error || "Erro ao solicitar liberação.");
                    }
                  } catch (err) {
                    console.error("Erro ao solicitar liberação:", err);
                    showMsg("error", err?.response?.data?.error || "Erro ao solicitar liberação.");
                  } finally {
                    setSolicitandoLiberacao(false);
                  }
                }}
                className={`px-5 py-2.5 font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                  modalGovernanca?.solicitacaoJaFeita
                    ? 'bg-red-500 text-white cursor-not-allowed opacity-80'
                    : solicitandoLiberacao
                      ? 'bg-emerald-500 text-white opacity-70 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25'
                }`}
              >
                {modalGovernanca?.solicitacaoJaFeita ? (
                  <>
                    <span>✗</span>
                    SOLICITAÇÃO JÁ ENVIADA
                  </>
                ) : solicitandoLiberacao ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Solicitar Liberação"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          MODAL PREMIUM DE CONFIRMAÇÃO — Solicitação de Liberação Registrada
          ═════════════════════════════════════════════════════════ */}
      {solicitacaoEnviada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSolicitacaoEnviada(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden transform transition-all animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradiente azul premium */}
            <div className="bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700 px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-black text-white tracking-tight">Solicitação Registrada ✓</h4>
                  <p className="text-blue-100 text-sm font-semibold mt-0.5">Enviada com sucesso</p>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div className="px-6 py-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">📨</span>
                  <div>
                    <p className="text-blue-900 font-bold text-sm">Sua solicitação de liberação foi registrada!</p>
                    <p className="text-blue-700 text-sm mt-1 leading-relaxed">
                      A <strong>Direção / Coordenação</strong> recebeu sua solicitação e irá analisar.
                      Quando o plano for liberado, você poderá editá-lo normalmente.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-500 text-xs leading-relaxed italic">
                Após a edição, o plano deverá ser reenviado para uma nova aprovação.
              </p>

              {/* Status visual */}
              <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="relative">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm font-bold text-blue-700">Aguardando liberação da Direção</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setSolicitacaoEnviada(false)}
                className="px-8 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL PREMIUM DE GOVERNANÇA — DEVOLVIDO
          ═══════════════════════════════════════════════════════ */}
      {modalGovernanca?.tipo === "DEVOLVIDO" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setModalGovernanca(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden transform transition-all animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradiente amber */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                  <ExclamationTriangleIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white tracking-tight">Plano Devolvido</h4>
                  <p className="text-amber-100 text-sm font-semibold mt-0.5">Ajustes solicitados pela Coordenação</p>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div className="px-6 py-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Turma</span>
                <p className="text-amber-900 font-bold text-lg">{modalGovernanca.turma}</p>
                <p className="text-amber-600 text-xs font-medium mt-0.5">{disciplinaSelecionada} • {bimestreSelecionado}</p>
              </div>

              {/* Motivo da devolução */}
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-black text-red-600 uppercase tracking-wider">Motivo da Devolução</span>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {modalGovernanca.motivo || "Nenhum motivo informado."}
                </p>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed">
                Faça os ajustes solicitados e <strong className="text-gray-700">reenvie para aprovação</strong> quando estiver pronto.
              </p>

              {/* Status visual */}
              <div className="mt-5 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-amber-700">Aguardando ajustes do professor</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between gap-3">
              <button
                onClick={() => setModalGovernanca(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
              >
                Fechar
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.patch(`/avaliacoes/${modalGovernanca.planoId}/status`, { status: "RASCUNHO" });
                    setModalGovernanca(null);
                    // Recarregar dados da tabela
                    setTurmasComPlanos(prev => prev.map(t =>
                      t.turma === modalGovernanca.turma
                        ? { ...t, status: "RASCUNHO", motivo_devolucao: null }
                        : t
                    ));
                    showMsg("success", "Plano reaberto para edição.");
                    // Abrir o editor
                    abrirPlano([modalGovernanca.turma], modalGovernanca.planoId);
                  } catch (err) {
                    console.error("Erro ao reabrir plano:", err);
                    showMsg("error", "Erro ao reabrir o plano para edição.");
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all active:scale-95"
              >
                Entendi, abrir para edição
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalAdicionarItemPlano
        open={modalItemOpen}

        onClose={() => {
          setModalItemOpen(false);
          setEditIndex(null);
        }}

        modo={editIndex !== null ? "editar" : "adicionar"}

        atividade={atividade}
        setAtividade={setAtividade}
        tipoAvaliacao={tipoAvaliacao}
        setTipoAvaliacao={setTipoAvaliacao}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFinal={dataFinal}
        setDataFinal={setDataFinal}
        notaTotal={notaTotal}
        setNotaTotal={setNotaTotal}
        oportunidades={oportunidades}
        setOportunidades={setOportunidades}
        notaInvertida={notaInvertida}
        setNotaInvertida={setNotaInvertida}
        descricao={descricao}
        setDescricao={setDescricao}

        onSalvar={() => {
          // bloqueios de governança (mock)
          if (papStatus === "ENVIADO")
            return { ok: false, type: "info", text: "PAP enviado: edição bloqueada." };

          if (papStatus === "APROVADO")
            return { ok: false, type: "info", text: "PAP aprovado: edição bloqueada." };

          if (papStatus === "BLOQUEADO_TEMPO")
            return { ok: false, type: "info", text: "Bimestre encerrado: apenas consulta." };

          const nome = (atividade || "").trim();

          const nt = Number(notaTotal);
          const op = Number(oportunidades);
          const ni = Number(notaInvertida);

          if (!nome)
            return { ok: false, type: "warn", text: "Informe o nome da atividade avaliativa." };

          if (!tipoAvaliacao)
            return { ok: false, type: "warn", text: "Selecione o Tipo de Avaliação (obrigatório para sincronização com o EducaDF)." };

          // ✅ evita item com pontuação zero (ou negativa)
          if (Number.isNaN(nt) || nt <= 0)
            return { ok: false, type: "warn", text: "A nota total deve ser maior que 0." };

          if (Number.isNaN(op) || op < 1)
            return { ok: false, type: "warn", text: "Oportunidades deve ser >= 1." };

          // ✅ regra: não estourar 10 pontos (considerando edição)
          const totalAntes = totalPontos(itens);
          const oldNt =
            editIndex !== null && itens?.[editIndex]
              ? Number(itens[editIndex]?.nota_total || 0)
              : 0;

          const novoTotal = editIndex !== null ? totalAntes - oldNt + nt : totalAntes + nt;

          if (novoTotal > PONTOS_TOTAL_PAP) {
            const restante = Number((PONTOS_TOTAL_PAP - (totalAntes - oldNt)).toFixed(2));
            return {
              ok: false,
              type: "error",
              text: `Pontuação excedida. Restam ${restante} ponto(s) disponíveis neste PAP.`,
            };
          }

          const payload = {
            atividade: nome,
            tipo_avaliacao: tipoAvaliacao || "",
            data: dataInicio || "",
            data_inicio: dataInicio || "",
            data_final: dataFinal || dataInicio || "",
            nota_total: nt,
            oportunidades: op,
            nota_invertida: Number.isNaN(ni) ? 0 : ni,
            descricao: (descricao || "").trim(),
          };

          // ✅ EDITAR (update) ou ADICIONAR (append)
          if (editIndex !== null) {
            setItens((prev) =>
              prev.map((it, i) => (i === editIndex ? { ...it, ...payload } : it))
            );

            // encerra modo edição
            setEditIndex(null);

            return { ok: true, type: "success", text: "Item atualizado com sucesso." };
          }

          setItens((prev) => [...prev, payload]);
          return { ok: true, type: "success", text: "Item adicionado com sucesso." };
        }}
      />

      {/* ═══ Modal Recall — Tipo de Avaliação pendente ═══ */}
      <ModalRecallTipoAvaliacao />
    </div>
  );
}
