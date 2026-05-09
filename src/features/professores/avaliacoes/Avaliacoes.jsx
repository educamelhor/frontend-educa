import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import {
  CheckCircleIcon,
  DocumentCheckIcon,
  TableCellsIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";


/**
 * Avaliacoes.jsx
 * ------------------------------------------------------------
 * Onde o professor registra as notas/pontos baseado no Plano de Avaliação (PAP).
 * Os dados vêm diretamente do plano criado no submenu "Planos".
 * 
 * Fluxo:
 * 1. Professor seleciona disciplina/bimestre/turma
 * 2. Sistema carrega o plano (PAP) + alunos + notas já salvas
 * 3. Professor lança notas → SALVAR DIÁRIO persiste no banco
 * 4. Quando o diário está completo → EXPORTAR PARA BOLETIM
 * 5. Após exportação, diário fica em modo readonly
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

  // ---------------------------
  // Estados de Fechamento / Exportação
  // ---------------------------
  const [diarioFechado, setDiarioFechado] = useState(false);
  const [fechamentoInfo, setFechamentoInfo] = useState(null);
  const [modalExportar, setModalExportar] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [resultadoExportacao, setResultadoExportacao] = useState(null);
  // Exportação parcial: alunos sem nota na Avaliação Bimestral
  const [alunosSemNota, setAlunosSemNota] = useState([]);
  const [confirmarParcial, setConfirmarParcial] = useState(false); // segunda confirmação
  // Fechar diário (decisão explícita do professor)
  const [modalFechar, setModalFechar] = useState(false);
  const [fechando, setFechando] = useState(false);

  // Governança: avaliação padrão bimestral (bloqueia edição manual)
  const [avaliacaoPadrao, setAvaliacaoPadrao] = useState(false);

  // Modal: plano ainda não aprovado (status ENVIADO) — bloqueia lançamento
  const [modalPlanoPendente, setModalPlanoPendente] = useState(false);

  // Modal: editar data de um item de avaliação no cabeçalho do diário
  const [modalDataItem, setModalDataItem] = useState(null); // null | { itemId, itemIdx, atividade, dataAtual }
  const [salvandoData, setSalvandoData] = useState(false);
  const [dataEditTemp, setDataEditTemp] = useState("");

  const showMsg = (type, text) => {
    setMensagemSistema({ type, text });
    setTimeout(() => setMensagemSistema(null), 4500);
  };

  // Salva data_inicio de um item via PATCH
  const salvarDataItem = async () => {
    if (!modalDataItem || !plano?.id) return;
    setSalvandoData(true);
    try {
      const resp = await api.patch(`/avaliacoes/${plano.id}/item/${modalDataItem.itemId}/data`, {
        data_inicio: dataEditTemp,
      });
      if (resp.data?.ok) {
        // Atualiza o plano local sem recarregar
        setPlano(prev => {
          const itens = Array.isArray(prev.itens) ? prev.itens : JSON.parse(prev.itens || "[]");
          const novosItens = itens.map((it, idx) =>
            idx === modalDataItem.itemIdx ? { ...it, data_inicio: dataEditTemp } : it
          );
          return { ...prev, itens: novosItens };
        });
        showMsg("success", `Data de "${modalDataItem.atividade}" atualizada.`);
        setModalDataItem(null);
      } else {
        showMsg("error", resp.data?.error || "Erro ao salvar data.");
      }
    } catch (err) {
      showMsg("error", err.response?.data?.error || "Erro ao salvar data.");
    }
    setSalvandoData(false);
  };

  // ---------------------------
  // Carga Inicial — Disciplinas do professor
  // ---------------------------
  const [loadingInicial, setLoadingInicial] = useState(true);

  useEffect(() => {
    const fetchDadosIniciais = async () => {
      setLoadingInicial(true);
      try {
        const resDisc = await api.get("/professores/me/disciplinas");
        if (resDisc.data?.ok) {
          const names = resDisc.data.disciplinas.map(d => d.nome);
          setDisciplinas(names);
          if (names.length === 1) setDisciplinaSelecionada(names[0]);
        }
      } catch (err) {
        console.error("Erro ao carregar disciplinas", err);
      } finally {
        setLoadingInicial(false);
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
      setDiarioFechado(false);
      setFechamentoInfo(null);
      return;
    }

    const carregarGrid = async () => {
      setCarregandoDados(true);
      try {
        // 0) Buscar config de governança (avaliação padrão)
        try {
          const escolaId = localStorage.getItem("escola_id");
          if (escolaId) {
            const cfgRes = await api.get("/api/governanca/avaliacao-config", {
              params: { escola_id: escolaId },
            });
            const cfg = cfgRes.data?.config || {};
            setAvaliacaoPadrao(cfg["escola.avaliacao_padrao_bimestral"] === "1");
          }
        } catch {
          setAvaliacaoPadrao(false);
        }

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
          setPlano(null);
          setPlanoStatus("PENDENTE");
          setAlunos([]);
          setCarregandoDados(false);
          return;
        }

        setPlanoStatus(planoEncontrado.status);

        // Status ENVIADO: exibe modal de bloqueio — aguarda aprovação da direção
        if (planoEncontrado.status === "ENVIADO") {
          setPlano(null);
          setAlunos([]);
          setCarregandoDados(false);
          setModalPlanoPendente(true);
          return;
        }

        // Demais status não permitidos (RASCUNHO, PENDENTE, etc.)
        if (planoEncontrado.status !== "APROVADO") {
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

        // 5) Carregar notas já salvas do banco
        try {
          const resNotas = await api.get(`/avaliacoes/${planoCompleto.id}/notas-diario`, {
            params: { turma_id: turmaSelecionada }
          });
          if (resNotas.data?.ok) {
            setNotas(resNotas.data.notas || {});
            setCoresCelulas(resNotas.data.cores || {});
          } else {
            setNotas({});
            setCoresCelulas({});
          }
        } catch {
          setNotas({});
          setCoresCelulas({});
        }

        // 6) Verificar status de fechamento do diário
        try {
          const resStatus = await api.get(`/avaliacoes/${planoCompleto.id}/status-diario`, {
            params: { turma_id: turmaSelecionada }
          });
          if (resStatus.data?.ok) {
            setDiarioFechado(resStatus.data.fechado);
            setFechamentoInfo(resStatus.data.fechamento);
          }
        } catch {
          setDiarioFechado(false);
          setFechamentoInfo(null);
        }

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

  // Verifica se um item específico é bloqueado (fixo_direcao + avaliacaoPadrao ativo)
  const isItemBloqueado = (itemIdx) => {
    if (!avaliacaoPadrao) return false;
    const arrItens = Array.isArray(plano?.itens) ? plano.itens : JSON.parse(plano?.itens || "[]");
    const item = arrItens[itemIdx];
    return !!item?.fixo_direcao;
  };

  const handleNotaChange = (alunoId, itemIdx, opIdx, maxVal, val) => {
    if (diarioFechado) return; // readonly
    if (isItemBloqueado(itemIdx)) return; // apenas coluna padronizada bloqueada
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
    if (diarioFechado) return; // readonly
    if (isItemBloqueado(itemIdx)) return; // apenas coluna padronizada bloqueada
    e.preventDefault();
    setContextMenu({
      alunoId, itemIdx, opIdx, maxVal,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleSelectColor = (color) => {
    if (!contextMenu || diarioFechado) return;
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

  // ---------------------------
  // SALVAR DIÁRIO NO BANCO
  // ---------------------------
  const salvarAvaliacoes = async () => {
    if (!plano?.id || !turmaSelecionada || diarioFechado) return;
    setSalvando(true);
    try {
      const resp = await api.post(`/avaliacoes/${plano.id}/salvar-notas`, {
        turma_id: turmaSelecionada,
        notas,
        cores: coresCelulas,
      });
      if (resp.data?.ok) {
        showMsg("success", `Diário salvo com sucesso! (${resp.data.total} notas)`);
      } else {
        showMsg("error", resp.data?.error || "Erro ao salvar.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao salvar o diário.";
      showMsg("error", msg);
    }
    setSalvando(false);
  };

  // ---------------------------
  // EXPORTAR NOTAS PARA BOLETIM
  // ---------------------------

  // Identifica o índice do item "Avaliação Bimestral" (fixo_direcao) no plano
  const idxBimestral = (() => {
    if (!plano?.itens) return -1;
    const arr = Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || "[]");
    return arr.findIndex(item => item.fixo_direcao);
  })();

  // Alunos sem nota na coluna Bimestral
  const calcAlunosSemNotaBimestral = () => {
    if (idxBimestral === -1) return []; // sem coluna bimestral, usa total
    return alunos.filter(a => notas[getNotaKey(a.id, idxBimestral, 0)] === undefined);
  };

  // Abre o modal: calcula quem está sem nota
  const abrirModalExportar = () => {
    const semNota = calcAlunosSemNotaBimestral();
    setAlunosSemNota(semNota);
    setConfirmarParcial(false);
    setModalExportar(true);
  };

  // Executa a exportação (NÃO fecha o diário — professor decide quando fechar)
  const handleExportarBoletim = async () => {
    if (!plano?.id || !turmaSelecionada) return;
    // Se há alunos sem nota e ainda não confirmou, exige 2ª confirmação
    if (alunosSemNota.length > 0 && !confirmarParcial) {
      setConfirmarParcial(true);
      return;
    }
    setExportando(true);
    try {
      // Salvar notas antes
      await api.post(`/avaliacoes/${plano.id}/salvar-notas`, {
        turma_id: turmaSelecionada,
        notas,
        cores: coresCelulas,
      });
      // Exportar — diário permanece aberto para possíveis atualizações
      const resp = await api.post(`/avaliacoes/${plano.id}/exportar-boletim`, {
        turma_id: turmaSelecionada,
      });
      if (resp.data?.ok) {
        setResultadoExportacao(resp.data);
        // ✅ NÃO fecha o diário automaticamente
        setModalExportar(false);
        setConfirmarParcial(false);
        showMsg("success", `${resp.data.message} — O diário permanece aberto para atualizações.`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao exportar notas.";
      showMsg("error", msg);
    }
    setExportando(false);
  };

  // Fecha o diário por decisão explícita do professor
  const handleFecharDiario = async () => {
    if (!plano?.id || !turmaSelecionada) return;
    setFechando(true);
    try {
      // Salvar notas primeiro
      await api.post(`/avaliacoes/${plano.id}/salvar-notas`, {
        turma_id: turmaSelecionada,
        notas,
        cores: coresCelulas,
      });
      // Fechar diário (endpoint de fechamento definitivo)
      const resp = await api.post(`/avaliacoes/${plano.id}/exportar-boletim`, {
        turma_id: turmaSelecionada,
        fechar_diario: true,
      });
      if (resp.data?.ok) {
        setDiarioFechado(true);
        setModalFechar(false);
        showMsg("success", "Diário fechado com sucesso! Notas bloqueadas para edição.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao fechar o diário.";
      showMsg("error", msg);
    }
    setFechando(false);
  };

  // Conta quantos alunos têm pelo menos 1 nota
  const alunosComNota = alunos.filter(a => {
    if (!plano?.itens) return false;
    const arrItens = Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || "[]");
    return arrItens.some((item, itemIdx) => {
      const freq = Number(item.oportunidades) || 1;
      for (let opIdx = 0; opIdx < freq; opIdx++) {
        if (notas[getNotaKey(a.id, itemIdx, opIdx)] !== undefined) return true;
      }
      return false;
    });
  }).length;

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

  // ── Etapa ativa do sequenciador (1=Disciplina, 2=Bimestre, 3=Turma)
  const [etapaAtiva, setEtapaAtiva] = useState(1);

  return (
    <div className="flex flex-col gap-6 w-full pb-20">

      {/* ═══════════════════════════════════════════════════════
          HEADER PREMIUM — Sequenciador de Etapas (3 etapas)
      ═══════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #160f2e 100%)",
          borderRadius: "1.25rem",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
        }}
      >
        {/* Topo do banner */}
        <div style={{ padding: "1.75rem 2rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              borderRadius: "0.875rem",
              padding: "0.75rem",
              boxShadow: "0 4px 14px rgba(139,92,246,0.45)",
              flexShrink: 0,
            }}>
              <DocumentCheckIcon style={{ width: 28, height: 28, color: "#fff" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                <h1 style={{ fontSize: "1.7rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>AVALIAÇÕES</h1>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>REGISTRO DE NOTAS</span>
              </div>
              {selecaoCompleta && (
                <div style={{ marginTop: "0.25rem", fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
                  {disciplinaSelecionada} · {bimestreSelecionado} · {turmaObj?.nome || ""}
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
            { num: 1, label: "Selecionar Disciplina", done: !!disciplinaSelecionada, value: disciplinaSelecionada },
            { num: 2, label: "Selecionar Bimestre",   done: !!bimestreSelecionado,  value: bimestreSelecionado?.replace(" Bimestre", " Bim") },
            { num: 3, label: "Selecionar Turma",      done: !!turmaSelecionada,     value: turmaObj?.nome },
          ].map((et, idx) => {
            const isActive = etapaAtiva === et.num;
            const canClick = et.num === 1 || (et.num === 2 && !!disciplinaSelecionada) || (et.num === 3 && !!disciplinaSelecionada && !!bimestreSelecionado);
            return (
              <button
                key={et.num}
                onClick={() => canClick && setEtapaAtiva(et.num)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "1rem 1.4rem",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive ? "3px solid #22d3ee" : "3px solid transparent",
                  cursor: canClick ? "pointer" : "not-allowed",
                  opacity: canClick ? 1 : 0.4,
                  transition: "all 0.2s",
                  borderRight: idx < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  textAlign: "left",
                }}
              >
                {/* Círculo / check */}
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: et.done ? "linear-gradient(135deg,#22d3ee,#0ea5e9)" : isActive ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.07)",
                  border: et.done ? "none" : isActive ? "2px solid #22d3ee" : "2px solid rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: et.done ? "0 2px 8px rgba(34,211,238,0.35)" : "none",
                  transition: "all 0.25s",
                }}>
                  {et.done ? (
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  ) : (
                    <span style={{ color: isActive ? "#22d3ee" : "#64748b", fontWeight: 800, fontSize: "0.78rem" }}>{et.num}</span>
                  )}
                </div>

                {/* Texto */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: isActive ? "#22d3ee" : et.done ? "#38bdf8" : "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>ETAPA {et.num}</span>
                    {et.done && <span style={{ fontSize: "0.6rem", background: "rgba(34,211,238,0.18)", color: "#22d3ee", padding: "1px 6px", borderRadius: 999, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: "0.83rem", fontWeight: 700, color: isActive ? "#f8fafc" : et.done ? "#cbd5e1" : "#64748b", marginTop: 1 }}>
                    {et.done ? et.value : et.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ─── Painel de seleção da etapa ativa ─── */}
        <div style={{ padding: "1.4rem 2rem 1.7rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* ETAPA 1 — Disciplina */}
          {etapaAtiva === 1 && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.7rem" }}>Selecione a disciplina</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {loadingInicial ? (
                  <span style={{ color: "#64748b", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #334155", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Carregando disciplinas...
                  </span>
                ) : disciplinas.length === 0 ? (
                  <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Nenhuma disciplina encontrada para o ano letivo atual.</span>
                ) : null}

                {disciplinas.map(d => {
                  const isSel = disciplinaSelecionada === d;
                  return (
                    <button key={d} onClick={() => { setDisciplinaSelecionada(d); setTurmaSelecionada(""); setEtapaAtiva(2); }} style={{
                      padding: "0.55rem 1.3rem", borderRadius: "0.6rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", transition: "all 0.2s",
                      background: isSel ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.07)",
                      color: isSel ? "#fff" : "#cbd5e1",
                      border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                      boxShadow: isSel ? "0 4px 14px rgba(139,92,246,0.4)" : "none",
                      transform: isSel ? "scale(1.04)" : "scale(1)",
                    }}>{d}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ETAPA 2 — Bimestre */}
          {etapaAtiva === 2 && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.7rem" }}>Selecione o bimestre</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {bimestres.map(b => {
                  const isSel = bimestreSelecionado === b;
                  return (
                    <button key={b} onClick={() => { setBimestreSelecionado(b); setTurmaSelecionada(""); setEtapaAtiva(3); }} style={{
                      padding: "0.55rem 1.4rem", borderRadius: "0.6rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", transition: "all 0.2s",
                      background: isSel ? "linear-gradient(135deg,#4ade80,#22c55e)" : "rgba(255,255,255,0.07)",
                      color: isSel ? "#0f172a" : "#cbd5e1",
                      border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                      boxShadow: isSel ? "0 4px 14px rgba(74,222,128,0.35)" : "none",
                      transform: isSel ? "scale(1.04)" : "scale(1)",
                    }}>{b.replace(" Bimestre", " Bim")}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ETAPA 3 — Turma */}
          {etapaAtiva === 3 && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.7rem" }}>Selecione a turma</p>
              {turmas.length === 0 ? (
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Sem turmas para esta disciplina</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {turmas.map(t => {
                    const isSel = String(turmaSelecionada) === String(t.id);
                    return (
                      <button key={t.id} onClick={() => setTurmaSelecionada(t.id)} style={{
                        padding: "0.55rem 1.3rem", borderRadius: "0.6rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", transition: "all 0.2s",
                        background: isSel ? "linear-gradient(135deg,#22d3ee,#0ea5e9)" : "rgba(255,255,255,0.07)",
                        color: isSel ? "#0f172a" : "#cbd5e1",
                        border: isSel ? "none" : "1px solid rgba(255,255,255,0.12)",
                        boxShadow: isSel ? "0 4px 14px rgba(34,211,238,0.35)" : "none",
                        transform: isSel ? "scale(1.04)" : "scale(1)",
                      }}>{t.nome}</button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* ───────────────── BANNER AVALIAÇÃO PADRONIZADA ───────────────── */}
      {avaliacaoPadrao && plano && !diarioFechado && (
        <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200 p-6 flex items-center gap-5">
          <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md flex-shrink-0">
            <LockClosedIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-amber-800 flex items-center gap-2">
              📝 Avaliação Padrão Bimestral Ativada
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Esta escola adota o sistema de <strong>avaliação padrão bimestral (semana de prova)</strong>.
              A coluna <strong>"Prova Bimestral"</strong> será preenchida automaticamente
              a partir da correção dos gabaritos padronizados.
            </p>
            <p className="text-xs text-amber-600 mt-1 font-medium">
              🔒 Apenas a coluna de Avaliação Bimestral está bloqueada. As demais colunas continuam editáveis normalmente.
            </p>
          </div>
        </section>
      )}

      {/* ───────────────── BANNER DIÁRIO FECHADO ───────────────── */}
      {diarioFechado && plano && (
        <section className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl shadow-sm border border-emerald-200 p-6 flex items-center gap-5">
          <div className="p-3 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl shadow-md flex-shrink-0">
            <LockClosedIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-emerald-800 flex items-center gap-2">
              📗 Diário Fechado — Notas Exportadas para o Boletim
            </h3>
            <p className="text-sm text-emerald-600 mt-1">
              As notas de <strong>{disciplinaSelecionada}</strong> — <strong>{turmaObj?.nome}</strong> — <strong>{bimestreSelecionado}</strong> foram 
              exportadas para o boletim{fechamentoInfo?.fechado_em ? ` em ${new Date(fechamentoInfo.fechado_em).toLocaleDateString("pt-BR")}` : ""}.
              {fechamentoInfo?.total_alunos ? ` (${fechamentoInfo.total_alunos} alunos)` : ""}
            </p>
            <p className="text-xs text-emerald-500 mt-1 font-medium">
              O diário está em modo somente leitura. Para reabrir, solicite à Secretaria.
            </p>
          </div>
        </section>
      )}

      {/* ───────────────── MENSAGEM DE PLANO NÃO DISPONÍVEL ───────────────── */}
      {renderMensagemPlanoNaoDisponivel()}

      {/* ═══════════════ MODAL PREMIUM — PAP AGUARDANDO APROVAÇÃO ═══════════════ */}
      {modalPlanoPendente && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 600,
            background: "rgba(2,6,23,0.82)",
            backdropFilter: "blur(14px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
            animation: "fadeInModal 0.25s ease",
          }}
          onClick={() => setModalPlanoPendente(false)}
        >
          <style>{`
            @keyframes fadeInModal { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
            @keyframes floatIcon { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          `}</style>

          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480,
              borderRadius: "1.5rem",
              overflow: "hidden",
              background: "linear-gradient(160deg, #1a1f3a 0%, #0f1629 100%)",
              border: "1px solid rgba(245,158,11,0.3)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(245,158,11,0.08)",
            }}
          >
            {/* ── Faixa superior âmbar ── */}
            <div style={{
              background: "linear-gradient(135deg, #b45309 0%, #d97706 60%, #f59e0b 100%)",
              padding: "2rem 2rem 1.5rem",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* círculos decorativos */}
              <div style={{ position:"absolute", top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />
              <div style={{ position:"absolute", bottom:-30, left:-30, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />

              <div style={{
                width: 64, height: 64, borderRadius: "1rem",
                background: "rgba(255,255,255,0.15)",
                border: "2px solid rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "2rem", margin: "0 auto 1rem",
                animation: "floatIcon 3s ease-in-out infinite",
              }}>⏳</div>

              <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
                Aguardando Aprovação
              </h2>
              <p style={{ fontSize: "0.8rem", color: "rgba(254,243,199,0.85)", marginTop: "0.4rem", fontWeight: 500 }}>
                O lançamento de notas ainda não está liberado
              </p>
            </div>

            {/* ── Corpo ── */}
            <div style={{ padding: "1.75rem 2rem" }}>

              {/* Card de contexto */}
              <div style={{
                padding: "1rem 1.25rem",
                borderRadius: "0.875rem",
                background: "rgba(245,158,11,0.07)",
                border: "1px solid rgba(245,158,11,0.22)",
                marginBottom: "1.25rem",
              }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>
                  📋 Plano de avaliação
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  {[
                    { label: "Disciplina", value: disciplinaSelecionada },
                    { label: "Turma",      value: turmaObj?.nome || "" },
                    { label: "Bimestre",   value: bimestreSelecionado },
                    { label: "Status",     value: "⏳ ENVIADO" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      padding: "0.55rem 0.75rem", borderRadius: "0.6rem",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    }}>
                      <div style={{ fontSize: "0.58rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#e2e8f0" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explicação */}
              <div style={{
                padding: "0.9rem 1.1rem",
                borderRadius: "0.875rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                marginBottom: "1.5rem",
                fontSize: "0.82rem",
                color: "#94a3b8",
                lineHeight: 1.65,
              }}>
                O Plano de Avaliação foi <strong style={{ color: "#fbbf24" }}>enviado para a Direção/Coordenação</strong> e está
                aguardando aprovação.<br /><br />
                O lançamento de notas só será liberado após a <strong style={{ color: "#e2e8f0" }}>aprovação do plano</strong>.
                Você receberá acesso automaticamente quando a direção aprovar.
                <br /><br />
                <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                  💡 A coluna <strong style={{ color: "#fbbf24" }}>Prova Bimestral</strong> permanece bloqueada para edição manual
                  independentemente do status — ela é preenchida automaticamente pelo módulo Gabarito.
                </span>
              </div>

              {/* Botão fechar */}
              <button
                onClick={() => setModalPlanoPendente(false)}
                style={{
                  width: "100%", padding: "0.85rem",
                  borderRadius: "0.875rem",
                  background: "linear-gradient(135deg, #b45309, #d97706)",
                  border: "none", color: "#fff",
                  fontWeight: 800, fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(180,83,9,0.4)",
                  transition: "all 0.2s",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, #92400e, #b45309)"}
                onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, #b45309, #d97706)"}
              >
                Entendido — Aguardar Aprovação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────── GRID DE AVALIAÇÃO ───────────────── */}
      {selecaoCompleta && plano && (
        <section className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 flex flex-col relative transition-all duration-500 ease-in-out">
            <div className={`${diarioFechado ? 'bg-emerald-800' : 'bg-slate-800'} text-white p-6 flex items-center justify-between transition-colors duration-300`}>
                <div>
                   <h3 className="text-xl font-bold flex items-center gap-2">
                      {diarioFechado ? (
                        <LockClosedIcon className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <TableCellsIcon className="w-6 h-6 text-indigo-400" />
                      )}
                      {diarioFechado ? "Diário Fechado (Somente Leitura)" : "Lançamento de Notas"}
                   </h3>
                   <div className="flex gap-4 mt-2 text-sm text-slate-300 font-medium">
                       <span><strong className="text-white">Turma:</strong> {turmaObj?.nome || "Carregando"}</span>
                       <span><strong className="text-white">Disciplina:</strong> {disciplinaSelecionada}</span>
                       <span><strong className="text-white">Bimestre:</strong> {bimestreSelecionado}</span>
                   </div>
                   <div className="mt-1 flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        diarioFechado ? "bg-emerald-500/20 text-emerald-300" :
                        planoStatus === "APROVADO" ? "bg-blue-500/20 text-blue-300" : "bg-green-500/20 text-green-300"
                      }`}>
                        {diarioFechado ? "FECHADO" : `Plano ${planoStatus}`}
                      </span>
                      {!diarioFechado && alunosComNota > 0 && (
                        <span className="text-xs font-medium text-slate-400">
                          · {alunosComNota}/{alunos.length} alunos com nota
                        </span>
                      )}
                   </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* BOTÃO FECHAR DIÁRIO — desabilitado provisoriamente */}
                    {!carregandoDados && plano && !diarioFechado && (
                        <button
                          disabled
                          className="flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-red-300 border"
                          style={{
                            background: "rgba(239,68,68,0.06)",
                            border: "1px solid rgba(239,68,68,0.15)",
                            opacity: 0.45,
                            cursor: "not-allowed",
                          }}
                          title="Funcionalidade temporariamente desabilitada"
                        >
                            <LockClosedIcon className="w-5 h-5" />
                            FECHAR DIÁRIO
                        </button>
                    )}
                    {/* BOTÃO SALVAR */}
                    {!carregandoDados && plano && !diarioFechado && (
                        <button
                          onClick={salvarAvaliacoes}
                          disabled={salvando}
                          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-500 hover:bg-green-400 font-bold text-slate-900 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                            {salvando ? "SALVANDO..." : "SALVAR DIÁRIO"}
                        </button>
                    )}
                    {/* BOTÃO EXPORTAR BOLETIM — desabilitado provisoriamente */}
                    {!carregandoDados && plano && !diarioFechado && (
                        <button
                          disabled
                          className="flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-white border border-purple-400/15"
                          style={{
                            background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.25))",
                            opacity: 0.45,
                            cursor: "not-allowed",
                          }}
                          title="Funcionalidade temporariamente desabilitada"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            EXPORTAR BOLETIM
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

                                     {/* CABEÇALHO 1 - Títulos das Atividades */}                                      {(Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || "[]")).map((item, idx) => {                                        const dataExibir = item.data_inicio ? String(item.data_inicio).slice(0, 10) : null;                                        const dataFormatada = dataExibir                                          ? new Date(dataExibir + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })                                          : null;                                        const podeEditar = !item.fixo_direcao && !diarioFechado;                                        return (                                          <th key={idx} colSpan={Number(item.oportunidades) || 1} className="px-4 py-2 text-center text-[11px] font-black uppercase tracking-wider text-indigo-800 border-b border-r border-indigo-100 bg-indigo-50/50">                                            {item.atividade}                                            <div className="text-[10px] text-indigo-500 font-semibold lowercase mt-0.5">                                              (Max: {item.nota_total} pts)                                            </div>                                            {item.fixo_direcao ? (                                              <div title="Data gerenciada pela Direção" style={{ marginTop: 3, fontSize: "0.62rem", color: "#92400e", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>                                                {"\uD83D\uDD12"} {dataFormatada || "a definir"}                                              </div>                                            ) : (                                              <button                                                onClick={() => { if (!podeEditar) return; setDataEditTemp(dataExibir || ""); setModalDataItem({ itemId: item.id, itemIdx: idx, atividade: item.atividade, dataAtual: dataExibir }); }}                                                title={podeEditar ? "Clique para definir a data" : "Diário fechado"}                                                style={{ marginTop: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontSize: "0.62rem", fontWeight: 700, color: dataFormatada ? "#1d4ed8" : "#94a3b8", background: dataFormatada ? "rgba(59,130,246,0.1)" : "rgba(148,163,184,0.1)", border: "1px dashed " + (dataFormatada ? "rgba(59,130,246,0.4)" : "rgba(148,163,184,0.4)"), borderRadius: "0.3rem", padding: "1px 5px", cursor: podeEditar ? "pointer" : "default", width: "100%", transition: "all 0.15s" }}                                              >                                                {"\uD83D\uDCC5"} {dataFormatada || "+ data"}                                              </button>                                            )}                                          </th>                                        );                                      })}

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
                                        <tr key={aluno.id} className={`hover:bg-indigo-50/30 transition-colors border-b border-slate-100 group ${diarioFechado ? 'opacity-90' : ''}`}>
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
                                                const cellBloqueada = diarioFechado || isItemBloqueado(col.itemIdx);

                                                const bgClass =
                                                   cor === "red" ? "bg-red-200 text-red-900" :
                                                   cor === "yellow" ? "bg-yellow-200 text-yellow-900" :
                                                   cor === "green" ? "bg-green-200 text-green-900" :
                                                   "bg-transparent text-indigo-900";

                                                return (
                                                <td
                                                   key={`cell_${i}`}
                                                   onContextMenu={(e) => handleContextMenu(e, aluno.id, col.itemIdx, col.opIdx, col.maxVal)}
                                                   className={`px-1 py-1 border-r border-slate-100 text-center relative group/cell transition-colors duration-300 ${cor === "red" ? "bg-red-100" : cor === "yellow" ? "bg-yellow-100" : cor === "green" ? "bg-green-100" : ""} ${cellBloqueada ? "bg-amber-50/40" : ""}`}
                                                >
                                                    <input
                                                       type="number"
                                                       min="0"
                                                       max={col.maxVal}
                                                       step="0.1"
                                                       value={displayVal}
                                                       onChange={(e) => handleNotaChange(aluno.id, col.itemIdx, col.opIdx, col.maxVal, e.target.value)}
                                                       readOnly={cellBloqueada}
                                                       tabIndex={cellBloqueada ? -1 : 0}
                                                       className={`w-full text-center py-2.5 font-bold border border-transparent rounded-lg outline-none transition-all placeholder:text-slate-300 ${bgClass} ${
                                                         cellBloqueada
                                                           ? 'cursor-not-allowed bg-slate-50' 
                                                           : 'hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'
                                                       }`}
                                                       placeholder="-"
                                                    />
                                                    {/* Tooltip de suporte no hover */}
                                                    {!cellBloqueada && (
                                                      <div className="absolute opacity-0 group-hover/cell:opacity-100 -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none transition-opacity whitespace-nowrap z-50">
                                                          Max: {col.maxVal}
                                                      </div>
                                                    )}
                                                    {cellBloqueada && !diarioFechado && (
                                                      <div className="absolute opacity-0 group-hover/cell:opacity-100 -top-8 left-1/2 transform -translate-x-1/2 bg-amber-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none transition-opacity whitespace-nowrap z-50">
                                                          🔒 Preenchido via Gabarito
                                                      </div>
                                                    )}
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
                {diarioFechado ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <LockClosedIcon className="w-4 h-4" /> Diário fechado. Notas exportadas para o boletim.
                  </span>
                ) : avaliacaoPadrao ? (
                  <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                    <LockClosedIcon className="w-4 h-4" /> Avaliação padronizada: coluna "Prova Bimestral" bloqueada (preenchida via Gabarito). Demais colunas editáveis.
                  </span>
                ) : (
                  <span>Pressione <strong>Tab</strong> ou use as setas para navegar rapidamente pelas células. <strong className="text-indigo-600">Dica: Clique com o botão direito</strong> em qualquer célula para dar nota rápida por cores.</span>
                )}
                <span className="flex items-center gap-1.5"><DocumentCheckIcon className="w-4 h-4"/> Os dados são salvos separadamente por bimestre.</span>
            </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL: FECHAR DIÁRIO                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {modalFechar && plano && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={() => !fechando && setModalFechar(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full mx-4 overflow-hidden"
            style={{
              maxWidth: 460, borderRadius: 24,
              background: "linear-gradient(160deg, #1a1f35 0%, #12172a 100%)",
              border: "1px solid rgba(239,68,68,0.2)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #991b1b, #7f1d1d)",
              padding: "26px 32px 22px", textAlign: "center", position: "relative",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
                background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                border: "2px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem",
              }}>🔒</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#fff" }}>
                Fechar Diário?
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(252,165,165,0.85)", marginTop: 6, fontWeight: 500 }}>
                Esta ação coloca o diário em <strong style={{color:"#fca5a5"}}>somente leitura</strong>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "22px 28px" }}>

              {/* Resumo */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18,
              }}>
                {[
                  { label: "Disciplina", value: disciplinaSelecionada },
                  { label: "Turma",      value: turmaObj?.nome },
                  { label: "Bimestre",   value: bimestreSelecionado },
                  { label: "Com nota",   value: `${alunosComNota} / ${alunos.length} alunos` },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: "9px 13px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#e2e8f0" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Aviso */}
              <div style={{
                padding: "12px 16px", borderRadius: 12, marginBottom: 18,
                background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
                fontSize: "0.78rem", color: "#fca5a5", lineHeight: 1.7,
              }}>
                <strong style={{color:"#f87171"}}>⚠️ Após fechar:</strong><br />
                — O diário ficará em <strong>modo somente leitura</strong><br />
                — Você <strong>não poderá mais editar</strong> as notas<br />
                — Para reabrir, será necessário solicitar à <strong>Secretaria</strong>
              </div>

              {/* Alunos sem nota (aviso adicional) */}
              {alunosComNota < alunos.length && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                  background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
                  fontSize: "0.75rem", color: "#fcd34d",
                }}>
                  ⚠️ <strong>{alunos.length - alunosComNota} aluno(s)</strong> ainda sem nota — serão incluídos sem nota no boletim.
                </div>
              )}

              {/* Botões */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setModalFechar(false)}
                  disabled={fechando}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8", cursor: fechando ? "not-allowed" : "pointer", opacity: fechando ? 0.5 : 1,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFecharDiario}
                  disabled={fechando}
                  style={{
                    flex: 2, padding: "12px", borderRadius: 12, fontWeight: 800, fontSize: "0.88rem",
                    background: "linear-gradient(135deg, #dc2626, #991b1b)",
                    border: "none", color: "#fff",
                    cursor: fechando ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(220,38,38,0.3)",
                    opacity: fechando ? 0.7 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {fechando ? (
                    <>
                      <div style={{
                        width: 17, height: 17, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                        animation: "spin 0.8s linear infinite",
                      }} />
                      Fechando...
                    </>
                  ) : (
                    <>🔒 Sim, Fechar Diário</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONTEXTUAL DE CORES */}
      {contextMenu && !diarioFechado && (

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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL PREMIUM: EXPORTAR NOTAS PARA O BOLETIM                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {modalExportar && plano && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
          onClick={() => !exportando && (setModalExportar(false), setConfirmarParcial(false))}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full mx-4 overflow-hidden"
            style={{
              maxWidth: 520, borderRadius: 24,
              background: "linear-gradient(160deg, #1a1f35 0%, #12172a 100%)",
              border: "1px solid rgba(139,92,246,0.25)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* ── Header ── */}
            <div style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              padding: "28px 32px 24px", textAlign: "center", position: "relative",
            }}>
              {/* glow */}
              <div style={{
                position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
                width: 160, height: 160, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)",
                pointerEvents: "none",
              }} />
              <div style={{
                width: 60, height: 60, borderRadius: "50%", margin: "0 auto 14px",
                background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
                border: "2px solid rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem",
              }}>📤</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
                Exportar para o Boletim
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(196,181,253,0.85)", marginTop: 6, fontWeight: 500 }}>
                Apenas a <strong style={{color:"#c4b5fd"}}>Avaliação Bimestral</strong> será exportada nesta etapa
              </div>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: "24px 28px" }}>

              {/* Resumo */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20,
              }}>
                {[
                  { label: "Disciplina", value: disciplinaSelecionada },
                  { label: "Turma", value: turmaObj?.nome },
                  { label: "Bimestre", value: bimestreSelecionado },
                  { label: "Alunos", value: `${alunos.length - alunosSemNota.length} / ${alunos.length} com nota` },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: "10px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#e2e8f0" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Escopo — apenas Bimestral */}
              <div style={{
                padding: "12px 16px", borderRadius: 12, marginBottom: 16,
                background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)",
                fontSize: "0.78rem", color: "#c4b5fd", lineHeight: 1.6,
              }}>
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>📋 Escopo desta exportação:</span><br />
                Somente a coluna <strong style={{color:"#e2e8f0"}}>Avaliação Bimestral</strong> será lançada no
                boletim do <strong style={{color:"#e2e8f0"}}>{bimestreSelecionado}</strong>.
                As demais colunas (Caderno, Testes etc.) permanecem no diário do professor.
              </div>

              {/* ── ALERTA: alunos sem nota ── */}
              {alunosSemNota.length > 0 && !confirmarParcial && (
                <div style={{
                  padding: "14px 16px", borderRadius: 12, marginBottom: 16,
                  background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <ExclamationTriangleIcon style={{ width: 20, height: 20, color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fbbf24", marginBottom: 6 }}>
                        {alunosSemNota.length} aluno{alunosSemNota.length > 1 ? "s" : ""} sem nota na Avaliação Bimestral
                      </div>
                      <div style={{ maxHeight: 102, overflowY: "auto", marginBottom: 8 }}>
                        {alunosSemNota.map(a => (
                          <div key={a.id} style={{
                            fontSize: "0.72rem", color: "#fcd34d", padding: "2px 0",
                            borderBottom: "1px solid rgba(245,158,11,0.1)",
                          }}>• {a.nome}</div>
                        ))}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#d97706", lineHeight: 1.5 }}>
                        ⚠️ Esses alunos serão exportados com nota <strong>vazia (nula)</strong> no boletim.
                        Pode ser previsto uma <strong>segunda chamada</strong> — você poderá exportar novamente
                        as notas ausentes individualmente ou atualizar a turma completa enquanto o diário estiver aberto.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CONFIRMAÇÃO DE EXPORTAÇÃO PARCIAL ── */}
              {alunosSemNota.length > 0 && confirmarParcial && (
                <div style={{
                  padding: "14px 16px", borderRadius: 12, marginBottom: 16,
                  background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.3)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <ExclamationCircleIcon style={{ width: 20, height: 20, color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: "0.8rem", color: "#fca5a5", lineHeight: 1.6 }}>
                      <strong style={{color:"#f87171"}}>Confirme:</strong> Você está exportando com{" "}
                      <strong style={{color:"#fca5a5"}}>{alunosSemNota.length} aluno{alunosSemNota.length > 1 ? "s" : ""} sem nota</strong>.
                      O diário ficará <strong>fechado</strong> — notas ausentes poderão ser complementadas
                      em uma segunda exportação posterior.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Aviso de fechamento (sem ausências) ── */}
              {alunosSemNota.length === 0 && (
                <div style={{
                  padding: "12px 16px", borderRadius: 12, marginBottom: 16,
                  background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: "0.78rem", color: "#6ee7b7", lineHeight: 1.6,
                }}>
                  ✅ Todos os alunos possuem nota na Avaliação Bimestral.
                  O diário <strong style={{color:"#a7f3d0"}}>permanece aberto</strong> após exportar — você pode atualizar notas e exportar novamente.
                  Quando quiser fechar definitivamente, use o botão <strong style={{color:"#a7f3d0"}}>FECHAR DIÁRIO</strong>.
                </div>
              )}

              {/* ── Botões ── */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setModalExportar(false); setConfirmarParcial(false); }}
                  disabled={exportando}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8", cursor: exportando ? "not-allowed" : "pointer", opacity: exportando ? 0.5 : 1,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportarBoletim}
                  disabled={exportando}
                  style={{
                    flex: 2, padding: "12px", borderRadius: 12, fontWeight: 800, fontSize: "0.88rem",
                    background: confirmarParcial
                      ? "linear-gradient(135deg, #f59e0b, #ea580c)"
                      : "linear-gradient(135deg, #7c3aed, #4338ca)",
                    border: "none", color: "#fff",
                    cursor: exportando ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                    opacity: exportando ? 0.7 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {exportando ? (
                    <>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                        animation: "spin 0.8s linear infinite",
                      }} />
                      Exportando...
                    </>
                  ) : confirmarParcial ? (
                    <>⚠️ Sim, exportar mesmo assim</>
                  ) : alunosSemNota.length > 0 ? (
                    <>📤 Continuar mesmo assim</>
                  ) : (
                    <>📤 Confirmar Exportação</>
                  )}
                </button>
              </div>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: RESULTADO DA EXPORTAÇÃO                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      {resultadoExportacao && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
             onClick={() => setResultadoExportacao(null)}>
          <div onClick={e => e.stopPropagation()}
               className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md mx-4 overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 mx-auto mb-3 flex items-center justify-center text-3xl">
                ✅
              </div>
              <h3 className="text-xl font-black text-white">
                Exportação Concluída!
              </h3>
              <p className="text-green-100 text-sm mt-1">
                {resultadoExportacao.message}
              </p>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Alunos", value: resultadoExportacao.resumo?.totalAlunos, color: "text-indigo-600" },
                  { label: "Inseridas", value: resultadoExportacao.resumo?.notasInseridas, color: "text-emerald-600" },
                  { label: "Atualizadas", value: resultadoExportacao.resumo?.notasAtualizadas, color: "text-amber-600" },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <div className={`text-2xl font-black ${item.color}`}>{item.value || 0}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-4 text-sm text-gray-600 space-y-1">
                <div><strong>Disciplina:</strong> {resultadoExportacao.resumo?.disciplina}</div>
                <div><strong>Bimestre:</strong> {resultadoExportacao.resumo?.bimestre}</div>
                <div><strong>Ano:</strong> {resultadoExportacao.resumo?.ano}</div>
              </div>

              <button
                onClick={() => setResultadoExportacao(null)}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 transition-all shadow-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL — EDITAR DATA DE AVALIAÇÃO ═══════════════ */}
      {modalDataItem && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(2,6,23,0.75)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setModalDataItem(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 400, borderRadius: "1.25rem", background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", overflow: "hidden" }}
          >
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "0.6rem", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>📅</div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "rgba(191,219,254,0.8)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Data da avaliação</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{modalDataItem.atividade}</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "1.5rem" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.5rem" }}>
                Data de realização
              </label>
              <input
                type="date"
                value={dataEditTemp}
                onChange={e => setDataEditTemp(e.target.value)}
                style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", fontSize: "1rem", fontWeight: 600, outline: "none", boxSizing: "border-box" }}
              />
              <p style={{ marginTop: "0.6rem", fontSize: "0.7rem", color: "#475569", lineHeight: 1.5 }}>
                Esta data será exibida no cabeçalho da coluna como referência para os alunos e para o registro do diário.
              </p>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button
                  onClick={() => setModalDataItem(null)}
                  style={{ flex: 1, padding: "0.7rem", borderRadius: "0.6rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarDataItem}
                  disabled={salvandoData || !dataEditTemp}
                  style={{ flex: 2, padding: "0.7rem", borderRadius: "0.6rem", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", border: "none", color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: salvandoData || !dataEditTemp ? "not-allowed" : "pointer", opacity: salvandoData || !dataEditTemp ? 0.55 : 1, transition: "all 0.2s", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}
                >
                  {salvandoData ? "Salvando..." : "Salvar Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
