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
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);      // ← ETAPA 1 (turma principal, compat)
  const [bimestreSelecionado, setBimestreSelecionado] = useState(null); // ← ETAPA 2
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null); // usado no editor de plano
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);     // ← MULTI-SELEÇÃO (nova)
  const [etapaAtiva, setEtapaAtiva] = useState(1); // 1 | 2
  const [mostrarTabela, setMostrarTabela] = useState(false);
  const [modoMultiTurma, setModoMultiTurma] = useState(false);          // ← toggle: plano para várias turmas

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

  // ✅ Modal de confirmação de envio para direção
  const [modalConfirmarEnvio, setModalConfirmarEnvio] = useState(false);
  const [enviandoPAP, setEnviandoPAP] = useState(false);

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
  const [loadingInicial, setLoadingInicial] = useState(true);

  useEffect(() => {
    // Carga inicial: turmas + disciplinas do professor
    const fetchDadosIniciais = async () => {
      setLoadingInicial(true);
      try {
        const [resDisc, resTurmas] = await Promise.all([
          api.get("/professores/me/disciplinas"),
          api.get("/professores/me/turmas"),
        ]);

        if (resDisc.data?.ok) {
          const nomes = resDisc.data.disciplinas.map(d => d.nome);
          setDisciplinas(nomes);
        }
        if (resTurmas.data?.ok) {
          setTurmas(resTurmas.data.turmas || []);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do professor", err);
      } finally {
        setLoadingInicial(false);
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
  // disciplinasComPlanos: [{ disciplina, id, status, motivo_devolucao }]
  const [disciplinasComPlanos, setDisciplinasComPlanos] = useState([]);

  // Quando turma ou bimestre muda, busca do backend (por cada disciplina)
  useEffect(() => {
    if (!turmaSelecionada || !bimestreSelecionado) {
      setDisciplinasComPlanos([]);
      setMostrarTabela(false);
      return;
    }

    const buscarPlanos = async () => {
      setLoadingPlanos(true);
      try {
        const ano = new Date().getFullYear();
        const turmaObj = turmas.find(t => String(t.id) === String(turmaSelecionada) || t.nome === turmaSelecionada);
        const turmaNome = turmaObj?.nome || turmaSelecionada;

        // Para cada disciplina do professor, busca o plano correspondente à turma+bimestre
        const resultados = await Promise.all(
          disciplinas.map(async (disc) => {
            try {
              const res = await api.get("/avaliacoes", {
                params: { disciplina: disc, bimestre: bimestreSelecionado, ano }
              });
              const planos = res.data || [];
              const planoNoBanco = planos.find(p => p.turmas === turmaNome);
              return {
                disciplina: disc,
                id: planoNoBanco?.id || null,
                status: planoNoBanco?.status || "PENDENTE",
                motivo_devolucao: planoNoBanco?.motivo_devolucao || null,
              };
            } catch {
              return { disciplina: disc, id: null, status: "PENDENTE", motivo_devolucao: null };
            }
          })
        );

        setDisciplinasComPlanos(resultados);
      } catch (error) {
        console.error("Erro ao buscar planos:", error);
        showMsg("error", "Erro ao carregar os dados dos planos.");
      } finally {
        setLoadingPlanos(false);
      }
    };

    buscarPlanos();
  }, [turmaSelecionada, bimestreSelecionado, disciplinas, turmas]);


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


  const selecaoMinimaOk = !!turmaSelecionada && !!bimestreSelecionado;
  const bloqueadoPorTempo = !!bimestreSelecionado && bimestreEncerrado(bimestreSelecionado);
  const turmaNomeSelecionada = turmas.find(t => String(t.id) === String(turmaSelecionada) || t.nome === turmaSelecionada)?.nome || turmaSelecionada || "";

  const [selecaoLote, setSelecaoLote] = useState([]);
  const toggleSelecaoLote = (t) => {
    setSelecaoLote(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  // Helper para abrir plano de uma disciplina específica
  // → passa TODAS as turmas selecionadas para o editor (suporta 1 ou N turmas)
  const abrirPlanoDisc = (disc, planoId) => {
    setDisciplinaSelecionada(disc);
    // Se multi-turma ativo: usa o array completo; senão: somente a turma principal
    const turmasParaAbrir = modoMultiTurma && turmasSelecionadas.length > 1
      ? turmasSelecionadas.map(id => {
          const obj = turmas.find(t => String(t.id) === String(id) || t.nome === id);
          return obj?.nome || id;
        })
      : [turmaNomeSelecionada];
    abrirPlano(turmasParaAbrir, planoId);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-20">

      {/* ═══════════════════════════════════════════════════
          HEADER PREMIUM — Sequenciador de Etapas
      ═══════════════════════════════════════════════════ */}
      {!modoEdicaoPlano && (
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2a4a 100%)",
            borderRadius: "1.25rem",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
          }}
        >
          {/* Topo do banner */}
          <div style={{ padding: "1.75rem 2rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                borderRadius: "0.875rem",
                padding: "0.75rem",
                boxShadow: "0 4px 14px rgba(99,102,241,0.45)",
                flexShrink: 0,
              }}>
                <IdentificationIcon style={{ width: 28, height: 28, color: "#fff" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                  <h1 style={{ fontSize: "1.7rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>PLANOS</h1>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>PLANO DE AVALIAÇÃO PEDAGÓGICA</span>
                </div>
                {selecaoMinimaOk && (
                  <div style={{ marginTop: "0.25rem", fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
                    {turmaNomeSelecionada} · {bimestreSelecionado}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Separador */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 2rem" }} />

          {/* ─── Tabs de Etapas ─── */}
          <div style={{ display: "flex", gap: 0 }}>
            {[
              {
                num: 1,
                label: "Selecionar Turma",
                done: modoMultiTurma ? turmasSelecionadas.length > 0 : !!turmaSelecionada,
                value: modoMultiTurma && turmasSelecionadas.length > 1
                  ? `${turmasSelecionadas.length} turmas`
                  : turmaNomeSelecionada,
              },
              { num: 2, label: "Selecionar Bimestre", done: !!bimestreSelecionado, value: bimestreSelecionado?.replace(" Bimestre", " Bim") },
            ].map((et, idx) => {
              const isActive = etapaAtiva === et.num;
              const canClick = et.num === 1 || !!turmaSelecionada;
              return (
                <button
                  key={et.num}
                  onClick={() => canClick && setEtapaAtiva(et.num)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "1.1rem 1.75rem",
                    background: "transparent",
                    border: "none",
                    borderBottom: isActive ? "3px solid #22d3ee" : "3px solid transparent",
                    cursor: canClick ? "pointer" : "not-allowed",
                    opacity: canClick ? 1 : 0.45,
                    transition: "all 0.2s",
                    borderRight: idx === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    textAlign: "left",
                  }}
                >
                  {/* Círculo / check */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: et.done ? "linear-gradient(135deg,#22d3ee,#0ea5e9)" : isActive ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.07)",
                    border: et.done ? "none" : isActive ? "2px solid #22d3ee" : "2px solid rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: et.done ? "0 2px 8px rgba(34,211,238,0.35)" : "none",
                    transition: "all 0.25s",
                  }}>
                    {et.done ? (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    ) : (
                      <span style={{ color: isActive ? "#22d3ee" : "#64748b", fontWeight: 800, fontSize: "0.8rem" }}>{et.num}</span>
                    )}
                  </div>

                  {/* Texto */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isActive ? "#22d3ee" : et.done ? "#38bdf8" : "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>ETAPA {et.num}</span>
                      {et.done && <span style={{ fontSize: "0.62rem", background: "rgba(34,211,238,0.18)", color: "#22d3ee", padding: "1px 7px", borderRadius: 999, fontWeight: 700, letterSpacing: "0.05em" }}>✓ OK</span>}
                    </div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: isActive ? "#f8fafc" : et.done ? "#cbd5e1" : "#64748b", marginTop: 1 }}>
                      {et.done ? et.value : et.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ─── Painel de seleção (a etapa ativa) ─── */}
          <div style={{ padding: "1.5rem 2rem 1.75rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {/* ETAPA 1 — Seleção de turma(s) */}
            {etapaAtiva === 1 && (
              <div>
                {/* Cabeçalho da etapa com toggle multi-turma */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                    {modoMultiTurma ? "Selecione as turmas (mesmo plano para todas)" : "Selecione a turma"}
                  </p>
                  {/* Toggle modo multi-turma */}
                  <button
                    onClick={() => {
                      setModoMultiTurma(v => !v);
                      // Ao desativar, limpa multi-seleção e volta ao modo simples
                      if (modoMultiTurma) {
                        setTurmasSelecionadas([]);
                        setTurmaSelecionada(null);
                      }
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.45rem",
                      padding: "0.35rem 0.85rem",
                      borderRadius: "2rem",
                      border: modoMultiTurma ? "none" : "1px solid rgba(255,255,255,0.18)",
                      background: modoMultiTurma
                        ? "linear-gradient(135deg,#818cf8,#6366f1)"
                        : "rgba(255,255,255,0.06)",
                      color: modoMultiTurma ? "#fff" : "#94a3b8",
                      fontSize: "0.72rem", fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: "0.04em",
                      boxShadow: modoMultiTurma ? "0 2px 12px rgba(99,102,241,0.45)" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid currentColor",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {modoMultiTurma && (
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", display: "block" }} />
                      )}
                    </span>
                    Mesmo plano para várias turmas
                  </button>
                </div>

                {/* Lista de turmas */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {loadingInicial ? (
                    <span style={{ color: "#64748b", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #334155", borderTop: "2px solid #22d3ee", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Carregando turmas...
                    </span>
                  ) : turmas.length === 0 ? (
                    <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Nenhuma turma encontrada para o ano letivo atual.</span>
                  ) : null}

                  {turmas.map(t => {
                    const nm = t.nome || t;
                    const id = t.id || nm;

                    // Modo simples: seleção única, clique avança para etapa 2
                    if (!modoMultiTurma) {
                      const isSel = turmaSelecionada === id || turmaSelecionada === nm;
                      return (
                        <button key={id} onClick={() => { setTurmaSelecionada(id); setEtapaAtiva(2); }} style={{
                          padding: "0.55rem 1.2rem",
                          borderRadius: "0.6rem",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          background: isSel ? "linear-gradient(135deg,#22d3ee,#0ea5e9)" : "rgba(255,255,255,0.07)",
                          color: isSel ? "#0f172a" : "#cbd5e1",
                          border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                          boxShadow: isSel ? "0 4px 14px rgba(34,211,238,0.35)" : "none",
                          transform: isSel ? "scale(1.04)" : "scale(1)",
                        }}>{nm}</button>
                      );
                    }

                    // Modo multi-turma: toggle por checkbox visual
                    const isChecked = turmasSelecionadas.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setTurmasSelecionadas(prev =>
                            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                          );
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.45rem",
                          padding: "0.5rem 1rem",
                          borderRadius: "0.6rem",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          background: isChecked ? "linear-gradient(135deg,#818cf8,#6366f1)" : "rgba(255,255,255,0.07)",
                          color: isChecked ? "#fff" : "#cbd5e1",
                          border: isChecked ? "none" : "1px solid rgba(255,255,255,0.12)",
                          boxShadow: isChecked ? "0 4px 14px rgba(99,102,241,0.4)" : "none",
                          transform: isChecked ? "scale(1.05)" : "scale(1)",
                        }}
                      >
                        {/* Mini checkbox visual */}
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: isChecked ? "none" : "2px solid rgba(255,255,255,0.3)",
                          background: isChecked ? "rgba(255,255,255,0.9)" : "transparent",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>
                          {isChecked && (
                            <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                              <path stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                          )}
                        </span>
                        {nm}
                      </button>
                    );
                  })}
                </div>

                {/* Strip de confirmação — só aparece em modo multi com ao menos 1 turma selecionada */}
                {modoMultiTurma && turmasSelecionadas.length > 0 && (
                  <div style={{
                    marginTop: "1.25rem",
                    padding: "0.85rem 1.25rem",
                    borderRadius: "0.875rem",
                    background: "rgba(99,102,241,0.13)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem",
                  }}>
                    {/* Chips das turmas selecionadas */}
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#a5b4fc", fontWeight: 700, marginRight: "0.25rem", letterSpacing: "0.05em" }}>
                        📋 {turmasSelecionadas.length} turma{turmasSelecionadas.length > 1 ? "s" : ""} — mesmo plano:
                      </span>
                      {turmasSelecionadas.map(id => {
                        const obj = turmas.find(t => String(t.id) === String(id) || t.nome === id);
                        const nm = obj?.nome || id;
                        return (
                          <span key={id} style={{
                            background: "rgba(99,102,241,0.3)", color: "#c7d2fe",
                            fontSize: "0.72rem", fontWeight: 700,
                            padding: "0.2rem 0.6rem", borderRadius: "2rem",
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                          }}>
                            {nm}
                            <span
                              onClick={() => setTurmasSelecionadas(prev => prev.filter(x => x !== id))}
                              style={{ cursor: "pointer", opacity: 0.7, fontSize: "0.9rem", lineHeight: 1 }}
                            >×</span>
                          </span>
                        );
                      })}
                    </div>
                    {/* Botão confirmar → avança para ETAPA 2 */}
                    <button
                      onClick={() => {
                        // Define turma principal como a primeira selecionada (para compat com o restante do fluxo)
                        setTurmaSelecionada(turmasSelecionadas[0]);
                        setEtapaAtiva(2);
                      }}
                      style={{
                        padding: "0.55rem 1.3rem",
                        borderRadius: "0.65rem",
                        background: "linear-gradient(135deg,#818cf8,#6366f1)",
                        color: "#fff", border: "none",
                        fontWeight: 800, fontSize: "0.82rem",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(99,102,241,0.5)",
                        transition: "all 0.2s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Confirmar e Selecionar Bimestre →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 2 — Bimestre */}
            {etapaAtiva === 2 && (
              <div>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Selecione o bimestre</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {bimestres.map(b => {
                    const isSel = bimestreSelecionado === b;
                    const enc = bimestreEncerrado(b);
                    return (
                      <button key={b} onClick={() => setBimestreSelecionado(b)} style={{
                        padding: "0.55rem 1.4rem",
                        borderRadius: "0.6rem",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background: isSel ? "linear-gradient(135deg,#4ade80,#22c55e)" : enc ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)",
                        color: isSel ? "#0f172a" : enc ? "#475569" : "#cbd5e1",
                        border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                        boxShadow: isSel ? "0 4px 14px rgba(74,222,128,0.35)" : "none",
                        transform: isSel ? "scale(1.04)" : "scale(1)",
                        opacity: enc && !isSel ? 0.5 : 1,
                      }}>{b.replace(" Bimestre", " Bim")}{enc ? " 🔒" : ""}</button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          Tabela Mestra — Disciplinas para turma+bimestre
      ═══════════════════════════════════════════════════ */}
      {!modoEdicaoPlano && selecaoMinimaOk && (
        <section style={{
          background: "#fff",
          borderRadius: "1rem",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
          border: "1px solid #f1f5f9",
          overflow: "hidden",
          marginBottom: "2.5rem",
        }}>
          {/* Cabeçalho da seção */}
          <div style={{
            background: "linear-gradient(135deg,#1e293b,#0f172a)",
            padding: "1.25rem 1.75rem",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <h2 style={{ color: "#f8fafc", fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Planos por Disciplina</h2>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: "0.2rem 0 0" }}>
                Turma <strong style={{ color: "#22d3ee" }}>{turmaNomeSelecionada}</strong> · {bimestreSelecionado}
              </p>
            </div>
            <button onClick={() => { setEtapaAtiva(1); setBimestreSelecionado(null); setTurmaSelecionada(null); setDisciplinasComPlanos([]); }}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", borderRadius: "0.5rem", padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
            >↺ Nova Seleção</button>
          </div>

          {loadingPlanos ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
              <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
              <p style={{ fontWeight: 600 }}>Carregando disciplinas...</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "0.85rem 1.5rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #e2e8f0" }}>Disciplina</th>
                    <th style={{ padding: "0.85rem 1.5rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #e2e8f0" }}>Bimestre</th>
                    <th style={{ padding: "0.85rem 1.5rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #e2e8f0" }}>Status do Plano</th>
                    <th style={{ padding: "0.85rem 1.5rem", textAlign: "right", fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #e2e8f0" }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {disciplinasComPlanos.map(({ disciplina, id, status, motivo_devolucao }) => {
                    const isPendente = status === "PENDENTE";
                    const isRascunho = status === "RASCUNHO";
                    const isEnviado = status === "ENVIADO";
                    const isAprovado = status === "APROVADO";
                    const isDevolvido = status === "DEVOLVIDO";
                    const isLiberacaoSolicitada = status === "LIBERACAO_SOLICITADA";
                    const isLiberado = status === "LIBERADO";

                    const statusBadge = () => {
                      if (isPendente) return { bg: "#fef2f2", color: "#dc2626", text: "🔴 PENDENTE" };
                      if (isRascunho) return { bg: "#fff7ed", color: "#d97706", text: "🟠 RASCUNHO" };
                      if (isEnviado)  return { bg: "#f0fdf4", color: "#16a34a", text: "🟢 ENVIADO" };
                      if (isAprovado) return { bg: "#eff6ff", color: "#2563eb", text: "🔵 APROVADO" };
                      if (isDevolvido) return { bg: "#fffbeb", color: "#b45309", text: "🟡 DEVOLVIDO" };
                      if (isLiberacaoSolicitada) return { bg: "#f5f3ff", color: "#7c3aed", text: "✏️ EDIÇÃO SOLICITADA" };
                      if (isLiberado) return { bg: "#f0fdfa", color: "#0d9488", text: "🔓 LIBERADO" };
                      return { bg: "#f8fafc", color: "#64748b", text: status };
                    };
                    const badge = statusBadge();

                    return (
                      <tr key={disciplina} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{disciplina}</td>
                        <td style={{ padding: "1rem 1.5rem", color: "#64748b", fontSize: "0.875rem" }}>{bimestreSelecionado}</td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <span style={{ background: badge.bg, color: badge.color, padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: 800 }}>{badge.text}</span>
                        </td>
                        <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                          {isPendente && (
                            <button onClick={() => abrirPlanoDisc(disciplina, null)}
                              style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.45rem 1.1rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                            >Criar Plano</button>
                          )}
                          {(isRascunho || isLiberado) && (
                            <button onClick={() => abrirPlanoDisc(disciplina, id)}
                              style={{ background: isLiberado ? "linear-gradient(135deg,#0d9488,#0f766e)" : "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.45rem 1.1rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                            >Editar</button>
                          )}
                          {isEnviado && (
                            <button onClick={() => setModalGovernanca({ tipo: "ENVIADO", turma: turmaNomeSelecionada })}
                              style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: "0.5rem", padding: "0.45rem 1.1rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                            >Editar</button>
                          )}
                          {isAprovado && (
                            <button onClick={() => setModalGovernanca({ tipo: "APROVADO", turma: turmaNomeSelecionada, planoId: id, solicitacaoJaFeita: false })}
                              style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "0.5rem", padding: "0.45rem 1.1rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                            >Editar</button>
                          )}
                          {isLiberacaoSolicitada && (
                            <button onClick={() => setModalGovernanca({ tipo: "APROVADO", turma: turmaNomeSelecionada, planoId: id, solicitacaoJaFeita: true })}
                              style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", borderRadius: "0.5rem", padding: "0.45rem 1.1rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                            >Editar</button>
                          )}
                          {isDevolvido && (
                            <button onClick={() => setModalGovernanca({ tipo: "DEVOLVIDO", turma: turmaNomeSelecionada, motivo: motivo_devolucao, planoId: id })}
                              style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: "0.5rem", padding: "0.45rem 1.1rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                            >Ver motivo</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {disciplinasComPlanos.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>Nenhuma disciplina encontrada para esta turma.</td></tr>
                  )}
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

          {/* ── Card de contexto: aparece sempre que o editor estiver aberto (turma única ou lote) ── */}
          {turmasDoPlanoAberto.length >= 1 && (() => {
            const isLote = turmasDoPlanoAberto.length > 1;
            const corBg        = isLote ? "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)"
                                        : "linear-gradient(135deg, rgba(14,165,233,0.07) 0%, rgba(56,189,248,0.05) 100%)";
            const corBorder    = isLote ? "1px solid rgba(99,102,241,0.28)" : "1px solid rgba(14,165,233,0.25)";
            const corIconeBg   = isLote ? "linear-gradient(135deg, #818cf8, #6366f1)" : "linear-gradient(135deg, #38bdf8, #0ea5e9)";
            const corIconeSomb = isLote ? "0 2px 8px rgba(99,102,241,0.35)" : "0 2px 8px rgba(14,165,233,0.28)";
            const corLabel     = isLote ? "#818cf8" : "#0ea5e9";
            const corChipBg    = isLote ? "rgba(99,102,241,0.18)" : "rgba(14,165,233,0.13)";
            const corChipBord  = isLote ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(14,165,233,0.28)";
            const corChipTxt   = isLote ? "#a5b4fc" : "#38bdf8";
            const corSvg       = isLote ? "#a5b4fc" : "#38bdf8";

            return (
              <div
                style={{
                  marginBottom: "1rem",
                  borderRadius: "0.875rem",
                  background: corBg,
                  border: corBorder,
                  padding: "0.75rem 1.1rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  boxShadow: isLote ? "0 2px 12px rgba(99,102,241,0.09)" : "0 2px 8px rgba(14,165,233,0.07)",
                }}
              >
                {/* Ícone */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 34,
                    height: 34,
                    borderRadius: "0.55rem",
                    background: corIconeBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: corIconeSomb,
                    fontSize: "0.95rem",
                  }}
                >
                  {isLote ? "📋" : "📄"}
                </div>

                {/* Conteúdo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Título dinâmico */}
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: corLabel,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {isLote
                      ? `Plano em lote — ${turmasDoPlanoAberto.length} turmas receberão este plano`
                      : "Plano individual — turma de destino"}
                  </div>

                  {/* Chips de turmas */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {turmasDoPlanoAberto.map((turma) => (
                      <span
                        key={turma}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "0.2rem 0.65rem",
                          borderRadius: "2rem",
                          background: corChipBg,
                          border: corChipBord,
                          color: corChipTxt,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={corSvg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="9" cy="7" r="4" stroke={corSvg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={corSvg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={corSvg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {turma}
                      </span>
                    ))}
                  </div>

                  {/* Rodapé contextual */}
                  <div
                    style={{
                      marginTop: "0.45rem",
                      fontSize: "0.7rem",
                      color: "#64748b",
                      fontWeight: 500,
                      lineHeight: 1.5,
                    }}
                  >
                    {isLote
                      ? "Ao salvar, o mesmo plano de avaliação será aplicado a todas as turmas listadas acima."
                      : "Este plano será salvo exclusivamente para esta turma."}
                  </div>
                </div>
              </div>
            );
          })()}

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
                        // ✅ Data da Prova Bimestral: somente leitura para o professor
                        // A data será definida pela Direção / Coordenação
                        <div className="flex items-center justify-center">
                          <div
                            title={
                              item.data_inicio
                                ? `Data da prova: ${new Date(item.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} — definida pela Direção`
                                : 'Data a ser definida pela Direção / Coordenação'
                            }
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold select-none cursor-not-allowed ${
                              item.data_inicio
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
                            {item.data_inicio
                              ? new Date(item.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')
                              : 'A definir 🔒'}
                          </div>
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

                              // 2) Se o PAP ainda está em rascunho ou liberado (pode editar livremente)
                              if (papStatus === "RASCUNHO" || papStatus === "LIBERADO") {
                                return showMsg(
                                  "info",
                                  "Plano em edição. Você pode continuar editando para finalizar."
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

                              // 2) Se o PAP está em rascunho ou liberado pela direção (pode editar)

                              if (papStatus === "RASCUNHO" || papStatus === "LIBERADO") {
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
                onClick={() => {
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
                  // ✅ Abre modal de confirmação premium
                  setModalConfirmarEnvio(true);
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
                      setDisciplinasComPlanos(prev => prev.map(d =>
                        d.id === modalGovernanca.planoId
                          ? { ...d, status: "LIBERACAO_SOLICITADA" }
                          : d
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
                    // Atualiza estado local para refletir novo status 
                    setDisciplinasComPlanos(prev => prev.map(d =>
                      d.id === modalGovernanca.planoId
                        ? { ...d, status: "RASCUNHO", motivo_devolucao: null }
                        : d
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

      {/* ═══════════════════════════════════════════════════════
          MODAL PREMIUM — CONFIRMAÇÃO DE ENVIO PARA DIREÇÃO
          ═══════════════════════════════════════════════════════ */}
      {modalConfirmarEnvio && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { if (!enviandoPAP) setModalConfirmarEnvio(false); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ animation: "modalEntrada 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradiente verde premium */}
            <div className="bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-black text-white tracking-tight">Confirmar Envio para Direção</h4>
                  <p className="text-emerald-100 text-sm font-semibold mt-0.5">Plano de Avaliação Pedagógica</p>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div className="px-6 py-6">
              {/* Info do plano */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Disciplina</span>
                </div>
                <p className="text-emerald-900 font-bold text-base">{disciplinaSelecionada}</p>
                <p className="text-emerald-600 text-xs font-medium mt-0.5">{bimestreSelecionado} • {new Date().getFullYear()}</p>
              </div>

              {/* Turmas afetadas */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    {turmasDoPlanoAberto.length > 1 ? `${turmasDoPlanoAberto.length} Turmas — mesmo plano` : "Turma"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {turmasDoPlanoAberto.map((turma, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                      style={{
                        background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
                        color: "#065f46",
                        border: "1px solid #6ee7b7",
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {turma}
                    </span>
                  ))}
                </div>
              </div>

              {/* Aviso */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-amber-800 text-sm font-bold">Após o envio, o plano ficará bloqueado para edição.</p>
                  <p className="text-amber-700 text-xs mt-0.5">A Direção / Coordenação irá analisar e aprovar ou devolver com comentários.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={enviandoPAP}
                onClick={() => setModalConfirmarEnvio(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviandoPAP}
                onClick={async () => {
                  setEnviandoPAP(true);
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
                      // ✅ 1) Fecha modal
                      setModalConfirmarEnvio(false);
                      // ✅ 2) Atualiza status imediatamente na tabela mestra
                      setDisciplinasComPlanos(prev => prev.map(d =>
                        d.disciplina === disciplinaSelecionada
                          ? { ...d, status: "ENVIADO", id: data.plano_ids?.[0] || d.id }
                          : d
                      ));
                      // ✅ 3) Atualiza status local do editor
                      setPapStatus("ENVIADO");
                      showMsg("success", "✅ PAP enviado para a Direção com sucesso!");
                      // ✅ 4) Volta à tabela mestra
                      voltarTabelaMestra();
                    }
                  } catch (err) {
                    console.error(err);
                    const errData = err?.response?.data;
                    if (err?.response?.status === 409 && errData?.item_bloqueado) {
                      showMsg("error", errData.error || `Não é possível remover "${errData.item_bloqueado}" — há notas lançadas nessa atividade.`);
                    } else {
                      showMsg("error", "Erro ao enviar PAP para a direção.");
                    }
                  } finally {
                    setEnviandoPAP(false);
                  }
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: enviandoPAP
                    ? "#6b7280"
                    : "linear-gradient(135deg, #10b981, #059669)",
                  boxShadow: enviandoPAP ? "none" : "0 4px 14px rgba(16,185,129,0.4)",
                }}
              >
                {enviandoPAP ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Confirmar Envio
                  </>
                )}
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
