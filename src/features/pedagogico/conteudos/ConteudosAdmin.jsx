import React, { useEffect, useMemo, useState } from "react";
import {
  IdentificationIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";


import api from "../../../services/api";

import ModalAdicionarConteudo from "./ModalAdicionarConteudo.jsx";

/**
 * ConteudosAdmin.jsx
 * ---------------------------------------------------------------------
 * Página: Pedagógico > Conteúdos
 * Escopo atual (PASSO 2): SOMENTE FRONTEND (layout + fluxo visual mock)
 *
 * Objetivo do layout:
 *  1) 3 cards grandes no topo (informativos, coloridos, mesma altura)
 *  2) 4 cards de seleção (clicáveis) distribuídos horizontalmente
 *     - UX “inteligente”: clicar ativa o seletor e abre "chips" logo abaixo
 *  3) Botões alinhados à direita: "+ Adicionar" e "SALVAR"
 *  4) Tabela: TEMA | CONTEÚDO | OBJETIVO | AÇÕES (ícones estilo premium)
 *
 * Observações:
 *  - Ainda NÃO integra backend.
 *  - Ainda NÃO depende de rotas /api.
 * ---------------------------------------------------------------------
 */

export default function ConteudosAdmin() {
  // =========================================================
  // 1) Seleções (mock)
  // =========================================================
  const [activeSelector, setActiveSelector] = useState(null); // "disciplina" | "bimestre" | "turma" | "ano" | null

  // ✅ Disciplina agora vem do "contexto do login" (definitivo):
  // localStorage: disciplinas_professor_ctx = JSON.stringify([{ id, nome }, ...])
  const [disciplinasProfessor, setDisciplinasProfessor] = useState([]); // array de { id, nome }
  const [disciplinaSelecionadaId, setDisciplinaSelecionadaId] = useState(null); // number | null

  const disciplinaSelecionadaNome = useMemo(() => {
    const found = Array.isArray(disciplinasProfessor)
      ? disciplinasProfessor.find((d) => Number(d?.id) === Number(disciplinaSelecionadaId))
      : null;
    return String(found?.nome || "").trim();
  }, [disciplinasProfessor, disciplinaSelecionadaId]);

  const [bimestreSelecionado, setBimestreSelecionado] = useState("2º Bimestre");

  // ✅ Turmas agora vêm do backend (definitivo)
  // API: GET /api/professores/me/turmas -> [{ id, nome, ano, serie, turno, etapa }, ...]
  const [turmasEscola, setTurmasEscola] = useState([]); // array de { id, nome, ano, serie, turno, etapa }

  // ✅ Plano curricular por SÉRIE (não por turma)
  const [serieSelecionada, setSerieSelecionada] = useState(null);

  const serieSelecionadaLabel = useMemo(() => {
    return String(serieSelecionada || "").trim();
  }, [serieSelecionada]);

  const [anoSelecionado, setAnoSelecionado] = useState(null);

  // =========================================================
  // 1.1) “Contrato” com backend (PASSO 4.4)
  // ---------------------------------------------------------
  // Neste passo, o frontend passa a tentar consumir a API real
  // e, em caso de falha/ausência, mantém o mock atual.
  //
  // IMPORTANTE: aqui ainda estamos em modo “semi-mock”, então:
  //  - disciplina_id e turma_id ainda são mapeados localmente
  //  - depois, quando o login do professor estiver plugado,
  //    substituiremos esses maps pelo contexto real (escola/turma/etc)
  // =========================================================

  // ✅ DISCIPLINA_ID_MAP removido: disciplina_id vem do backend (disciplinas_professor_ctx)

  // ✅ TURMA_ID_MAP removido: turma_id vem do backend (me/turmas)

  const disciplina_id = Number.isFinite(Number(disciplinaSelecionadaId))
    ? Number(disciplinaSelecionadaId)
    : null;

  // ✅ Normaliza a série para bater com o padrão do BD e evitar "itensCount: 0"
  // Ex.: "6° ano" -> "6º ANO" | remove espaços extras | uppercase
  const normSerieClient = (s) => {
    let v = String(s || "").trim();
    if (!v) return null;

    v = v.replace(/°/g, "º");      // corrige símbolo de grau
    v = v.replace(/\s+/g, " ");    // colapsa espaços
    v = v.toUpperCase();           // padroniza
    return v;
  };

  const serie = normSerieClient(serieSelecionada);


  const bimestreNumero = useMemo(() => {
    const n = parseInt(String(bimestreSelecionado).trim(), 10);
    return Number.isFinite(n) ? n : null;
  }, [bimestreSelecionado]);

  const ano_letivo = useMemo(() => {
    const n = parseInt(String(anoSelecionado).trim(), 10);
    return Number.isFinite(n) ? n : null;
  }, [anoSelecionado]);

  // ✅ Governança: ações só são permitidas se o contexto estiver válido
  const contextoValido = useMemo(() => {
    return (
      Number.isFinite(disciplina_id) &&
      !!serie &&
      Number.isFinite(ano_letivo) &&
      Number.isFinite(bimestreNumero)
    );
  }, [disciplina_id, serie, ano_letivo, bimestreNumero]);

  const [loadingPlano, setLoadingPlano] = useState(false);

  // ✅ Força recarga da tabela após salvar em lote
  const [planoReloadKey, setPlanoReloadKey] = useState(0);

  // ✅ Erro de carregamento do plano (evita toast “piscando” a cada troca de contexto)
  const [planoErro, setPlanoErro] = useState(null); // string | null

  // ✅ Carrega disciplinas do professor a partir do "contexto do login" (definitivo)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("disciplinas_professor_ctx");
      const parsed = raw ? JSON.parse(raw) : null;

      const list = Array.isArray(parsed)
        ? parsed
            .map((d) => ({
              id: Number(d?.id),
              nome: String(d?.nome || "").trim(),
            }))
            .filter((d) => Number.isFinite(d.id) && d.nome)
        : [];

      setDisciplinasProfessor(list);
    } catch (e) {
      setDisciplinasProfessor([]);
    }
  }, []);

  // ✅ Seleção automática: se houver 1+ disciplina, escolhe a primeira (por id)
  useEffect(() => {
    const lista = Array.isArray(disciplinasProfessor) ? disciplinasProfessor : [];

    if (lista.length === 0) {
      if (disciplinaSelecionadaId !== null) setDisciplinaSelecionadaId(null);
      return;
    }

    const existe = lista.some((d) => Number(d.id) === Number(disciplinaSelecionadaId));
    if (!existe) {
      setDisciplinaSelecionadaId(lista[0].id);
    }
  }, [disciplinasProfessor, disciplinaSelecionadaId]);

  // ✅ Carrega turmas da escola via API (definitivo)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get("/api/professores/me/turmas");

        if (cancelled) return;

        const list = Array.isArray(data?.turmas)
          ? data.turmas
              .map((t) => ({
                id: Number(t?.id),
                nome: String(t?.nome || "").trim(),
                ano: t?.ano != null ? Number(t.ano) : null,
                serie: String(t?.serie || "").trim() || null,
                turno: String(t?.turno || "").trim() || null,
                etapa: String(t?.etapa || "").trim() || null,
              }))
              .filter((t) => Number.isFinite(t.id) && t.nome)
          : [];

        setTurmasEscola(list);
      } catch (e) {
        console.error("Erro ao carregar turmas (me/turmas):", e);
        if (!cancelled) setTurmasEscola([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Seleção automática (governança):
  // 1) define anoSelecionado com base nos anos disponíveis
  // 2) define serieSelecionada com base nas séries disponíveis daquele ano
  useEffect(() => {
    const lista = Array.isArray(turmasEscola) ? turmasEscola : [];

    if (lista.length === 0) {
      if (anoSelecionado !== null) setAnoSelecionado(null);
      if (serieSelecionada !== null) setSerieSelecionada(null);
      return;
    }

    // 1) ano
    const anos = lista
      .map((t) => Number(t?.ano))
      .filter((a) => Number.isFinite(a));

    const anosUnicos = Array.from(new Set(anos)).sort((a, b) => b - a);

    if (!anoSelecionado || !anosUnicos.includes(Number(anoSelecionado))) {
      setAnoSelecionado(String(anosUnicos[0]));
      return; // deixa o próximo ciclo ajustar série
    }

    // 2) séries do ano selecionado
    const seriesDoAno = lista
      .filter((t) => Number(t?.ano) === Number(anoSelecionado))
      .map((t) => String(t?.serie || "").trim())
      .filter(Boolean);

    const seriesUnicas = Array.from(new Set(seriesDoAno)).sort((a, b) => a.localeCompare(b, "pt-BR"));

    if (!seriesUnicas.length) {
      if (serieSelecionada !== null) setSerieSelecionada(null);
      return;
    }

    if (!serieSelecionada || !seriesUnicas.includes(String(serieSelecionada).trim())) {
      setSerieSelecionada(seriesUnicas[0]);
    }
  }, [turmasEscola, anoSelecionado, serieSelecionada]);

  // Tenta carregar itens reais do plano (fallback: mantém mock)
  useEffect(() => {
    const canFetch =
      Number.isFinite(disciplina_id) &&
      !!serie &&
      Number.isFinite(ano_letivo) &&
      Number.isFinite(bimestreNumero);

    if (!canFetch) return;

    let cancelled = false;

    (async () => {
      try {
        setPlanoErro(null);
        setLoadingPlano(true);

        const { data } = await api.get("/conteudos/admin/planejamento/itens", {
          params: {
            serie,
            disciplina_id,
            ano_letivo,
            bimestre: bimestreNumero,
          },
        });

        if (cancelled) return;

        // ✅ Ultra-tolerante: aceita a lista em várias chaves possíveis (evita "itens = []" por payload diferente)
        const itens =
          (Array.isArray(data?.itens) && data.itens) ||
          (Array.isArray(data?.items) && data.items) ||
          (Array.isArray(data?.rows) && data.rows) ||
          (Array.isArray(data?.result) && data.result) ||
          (Array.isArray(data?.data?.itens) && data.data.itens) ||
          (Array.isArray(data?.data?.items) && data.data.items) ||
          (Array.isArray(data?.data?.rows) && data.data.rows) ||
          [];

        // Debug (apenas para você confirmar no console que o contexto e a contagem batem)
        console.info("[CONTEUDOS][GET plano/itens]", {
          params: { serie, disciplina_id, ano_letivo, bimestre: bimestreNumero },
          ok: data?.ok,
          itensCount: Array.isArray(itens) ? itens.length : 0,
          payloadKeys: data ? Object.keys(data) : null,
        });

        const rowsFromApi = (itens || []).map((it) => ({
          id: it?.id,
          tema: String(it?.tema_texto_snapshot || "").trim(),
          conteudo: String(it?.conteudo_texto_snapshot || "").trim(),
          objetivo: String(it?.objetivo_texto || "").trim(),
          editando: false,

          // ✅ Governança por linha (backend)
          edicao_liberada: Number(it?.edicao_liberada) === 1,

          // opcional (não aparece na tabela, mas mantém contexto para evoluir):
          bncc_unidade_tematica_id: it?.bncc_unidade_tematica_id ?? null,
          seedf_conteudo_id: it?.seedf_conteudo_id ?? null,
          status: normStatusPlano(it?.status),
          created_at: it?.created_at ?? null,
        }));

        setRows(rowsFromApi);

        const statusDerivado = deriveContextoStatus(rowsFromApi);
        setContextoStatus(statusDerivado);

        // ✅ Se o contexto está ENVIADO e TODAS as linhas vieram com edicao_liberada=1,
        // consideramos “reaberto” (edição completa liberada) — persistente após F5.
        const contextoReaberto = statusDerivado === "ENVIADO"
          && Array.isArray(rowsFromApi)
          && rowsFromApi.length > 0
          && rowsFromApi.every((r) => !!r?.edicao_liberada);

        setEdicaoAutorizada(contextoReaberto);


        // Se o backend devolver um "ok" inesperado, não quebramos a UX.
        // Apenas exibimos um aviso discreto (sem impedir renderização).
        if (data?.ok === false && rowsFromApi.length === 0) {
          setPlanoErro("Aviso: o servidor retornou um status não padrão e não trouxe itens para este contexto.");
        } else {
          setPlanoErro(null);
        }

      } catch (e) {
        console.error("Erro ao carregar itens do plano:", e);

        if (!cancelled) {
          setPlanoErro(
            "Erro ao carregar os itens do plano para este contexto. Tente novamente ou verifique sua conexão."
          );

          // ✅ UX: não limpa a tabela em erro (evita sensação de “sumiu tudo”)
          // Mantém o último estado renderizado e apenas mostra o banner de erro.
        }
      } finally {
        if (!cancelled) setLoadingPlano(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [disciplina_id, serie, ano_letivo, bimestreNumero, planoReloadKey]);

  // =========================================================
  // 2) Tabela (mock)
  // =========================================================
  const [rows, setRows] = useState([]);

  // ✅ Status do contexto (backend-driven via itens do plano)
  // Regras:
  // - Se houver item ENVIADO/APROVADO/BLOQUEADO_TEMPO => bloqueia ações
  // - Se não houver itens => RASCUNHO
  const [contextoStatus, setContextoStatus] = useState("RASCUNHO");

  // Flag de envio/salvamento (UX: evita double-click)
  const [savingPlano, setSavingPlano] = useState(false);

  function normStatusPlano(raw) {
    // Aceita número, string, etc.
    // Contrato atual do BD: status = 1 (enviado para validação)
    if (raw === 1 || raw === "1") return "ENVIADO";

    // Reservado para evolução futura (se você adotar estes códigos depois)
    if (raw === 2 || raw === "2") return "APROVADO";
    if (raw === 3 || raw === "3") return "BLOQUEADO_TEMPO";

    const s = String(raw || "").trim().toUpperCase();
    return s || "RASCUNHO";
  }

  function deriveContextoStatus(rowsList) {
    const list = Array.isArray(rowsList) ? rowsList : [];
    if (list.length === 0) return "RASCUNHO";

    const statuses = list.map((r) => normStatusPlano(r?.status));

    // prioridade: o mais “forte” bloqueia o contexto
    if (statuses.includes("BLOQUEADO_TEMPO")) return "BLOQUEADO_TEMPO";
    if (statuses.includes("APROVADO")) return "APROVADO";
    if (statuses.includes("ENVIADO")) return "ENVIADO";

    return "RASCUNHO";
  }

  const contextoBloqueado = useMemo(() => {
    return (
      contextoStatus === "ENVIADO" ||
      contextoStatus === "APROVADO" ||
      contextoStatus === "BLOQUEADO_TEMPO"
    );
  }, [contextoStatus]);

  // ✅ PASSO 3.6 — (FUTURO) direção autoriza edição
  // Por enquanto fica false. No passo do “modo edição liberado”, isso vira true via backend.
  const [edicaoAutorizada, setEdicaoAutorizada] = useState(false);

  // ✅ PASSO 4 — Solicitações (agora: GET real + fallback local)
  // - solicitacaoContexto: professor pediu reabertura do contexto inteiro
  // - solicitacoesItens: professor pediu liberação por linha + ação (ITEM_EDIT / ITEM_DELETE)
  const [solicitacaoContexto, setSolicitacaoContexto] = useState(false);
  const [solicitacoesItens, setSolicitacoesItens] = useState({}); // { ["{rowId}:{ACAO}"]: true }

  // ✅ PASSO 4.1 — Carregar solicitações reais (PENDENTE) do backend
  // Fallback: se o GET falhar, a UI continua usando o localStorage (hasReaberturaSolicitada/hasSolicitacaoItem)
  useEffect(() => {
    const carregarSolicitacoes = async () => {
      if (!contextoValido) return;

      try {
        const resp = await api.get("/conteudos/admin/solicitacoes/edicao", {
          params: {
            disciplina_id,
            serie,
            bimestre: bimestreNumero,
            ano_letivo,
          },
        });

        const data = resp?.data || {};

        // Formatos aceitos (tolerante):
        // A) { ok:true, contexto_pendente:true/false, itens_pendentes:[{ item_id, escopo, acao, status }] }
        // B) { ok:true, solicitacoes:[...] }  (nós extraímos daqui)
        const solicitacoes = Array.isArray(data?.itens_pendentes)
          ? data.itens_pendentes
          : Array.isArray(data?.solicitacoes)
            ? data.solicitacoes
            : [];

        const ctxPendente =
          typeof data?.contexto_pendente === "boolean"
            ? data.contexto_pendente
            : solicitacoes.some(
                (s) =>
                  String(s?.escopo || "").toUpperCase() === "CONTEXTO" &&
                  String(s?.status || "").toUpperCase() === "PENDENTE"
              );

        const mapa = {};
        for (const s of solicitacoes) {
          const escopo = String(s?.escopo || "").toUpperCase();
          const status = String(s?.status || "").toUpperCase();

          if (status !== "PENDENTE") continue;

          // Para itens: aceitamos "acao" (ITEM_EDIT / ITEM_DELETE) vindo do backend
          if (escopo === "ITEM_EDIT" || escopo === "ITEM_DELETE") {
            const rid = Number(s?.item_id);
            if (!Number.isFinite(rid)) continue;
            const chave = `${rid}:${escopo}`;
            mapa[chave] = true;
          }
        }

        setSolicitacaoContexto(!!ctxPendente);
        setSolicitacoesItens(mapa);
      } catch (err) {
        console.warn("[Governança][GET solicitacoes/edicao] Falhou, mantendo fallback localStorage.", err);
      }
    };

    carregarSolicitacoes();
  }, [contextoValido, disciplina_id, serie, bimestreNumero, ano_letivo]);

  // ✅ PASSO 3.11 — Persistência premium da solicitação de reabertura (por contexto)
  // Regra: professor só "solicita" e aguarda; NÃO libera edição automaticamente.
  const buildReaberturaKey = () => {
    if (!contextoValido) return null;
    return `conteudos_reabertura_ctx:${disciplina_id}:${serie}:${bimestreNumero}:${ano_letivo}`;
  };

  const hasReaberturaSolicitada = () => {
    // 1) Fonte real (GET -> state)
    if (solicitacaoContexto) return true;

    // 2) Fallback local (offline / backend indisponível)
    const k = buildReaberturaKey();
    if (!k) return false;

    try {
      const raw = localStorage.getItem(k);
      return !!raw;
    } catch (_) {
      return false;
    }
  };

  const marcarReaberturaSolicitada = async () => {
    if (!contextoValido) return false;

    try {
      await api.post("/conteudos/admin/solicitacoes/edicao", {
        escopo: "CONTEXTO",
        disciplina_id,
        serie,
        bimestre: bimestreNumero,
        ano_letivo,
        motivo: "Solicitação de edição pelo professor",
      });

      return true;
    } catch (err) {
      console.warn("[Fallback][Reabertura CONTEXTO]", err);

      // 🔁 fallback local (offline / backend indisponível)
      const k = buildReaberturaKey();
      if (!k) return false;

      try {
        if (!localStorage.getItem(k)) {
          localStorage.setItem(k, JSON.stringify({ at: new Date().toISOString() }));
        }
        return true;
      } catch (_) {
        return false;
      }
    }
  };


  // ✅ PASSO 3.12 — Persistência premium de solicitação POR LINHA (editar/excluir)
  // Regra: em status ENVIADO, professor só solicita e aguarda direção; NÃO libera automaticamente.
  const buildSolicitacaoItemKey = (rowId, acao) => {
    if (!contextoValido) return null;
    const rid = Number(rowId);
    if (!Number.isFinite(rid)) return null;

    const a = String(acao || "").trim().toUpperCase(); // "ITEM_EDIT" | "ITEM_DELETE"
    return `conteudos_solic_item:${disciplina_id}:${serie}:${bimestreNumero}:${ano_letivo}:${rid}:${a}`;
  };

  const hasSolicitacaoItem = (rowId, acao) => {
    const rid = Number(rowId);
    if (!Number.isFinite(rid)) return false;

    const a = String(acao || "").trim().toUpperCase(); // "ITEM_EDIT" | "ITEM_DELETE"
    const chave = `${rid}:${a}`;

    // 1) Fonte real (GET -> state)
    if (solicitacoesItens?.[chave]) return true;

    // 2) Fallback local (offline / backend indisponível)
    const k = buildSolicitacaoItemKey(rowId, acao);
    if (!k) return false;

    try {
      return !!localStorage.getItem(k);
    } catch (_) {
      return false;
    }
  };

  const marcarSolicitacaoItem = async (rowId, acao) => {
    if (!contextoValido) return false;

    const rid = Number(rowId);
    if (!Number.isFinite(rid)) return false;

    try {
      await api.post("/conteudos/admin/solicitacoes/edicao", {
        escopo: acao, // "ITEM_EDIT" | "ITEM_DELETE"
        disciplina_id,
        serie,
        bimestre: bimestreNumero,
        ano_letivo,
        item_id: rid,
        motivo: "Solicitação de edição pelo professor",
      });

      return true;
    } catch (err) {
      console.warn("[Fallback][Solicitação ITEM]", err);

      // 🔁 fallback local (offline / backend indisponível)
      const k = buildSolicitacaoItemKey(rid, acao);
      if (!k) return false;

      try {
        if (!localStorage.getItem(k)) {
          localStorage.setItem(k, JSON.stringify({ at: new Date().toISOString() }));
        }
        return true;
      } catch (_) {
        return false;
      }
    }
  };


  // ✅ Bloqueio efetivo: só bloqueia se contexto estiver bloqueado E não houver autorização
  const bloqueioEfetivo = useMemo(() => {
    return contextoBloqueado && !edicaoAutorizada;
  }, [contextoBloqueado, edicaoAutorizada]);

  // ✅ PASSO 4 — Modo de UX por status (cores nos botões/ícones)
  // - "OK": rascunho ou edição autorizada
  // - "SOLICITAVEL": enviado (bloqueado, mas permite solicitar)
  // - "IMPEDITIVO": aprovado / bloqueado_tempo (bloqueado e não solicita)
  const uxModo = useMemo(() => {
    if (edicaoAutorizada) return "OK";
    if (contextoStatus === "ENVIADO") return "SOLICITAVEL";
    if (contextoStatus === "APROVADO" || contextoStatus === "BLOQUEADO_TEMPO") return "IMPEDITIVO";
    return "OK";
  }, [contextoStatus, edicaoAutorizada]);

  const podeEditarLinha = (row) => {
    if (!contextoValido) return false;
    if (uxModo === "OK") return true;

    // Reserva: quando o backend devolver liberação por item, basta popular `row.edicao_liberada = true`
    if (row?.edicao_liberada) return true;

    return false;
  };

  const podeSolicitar = useMemo(() => uxModo === "SOLICITAVEL", [uxModo]);

  // ✅ Modal premium para “contexto bloqueado / impeditivo”
  const [modalEdicaoBloqueada, setModalEdicaoBloqueada] = useState(null);
  // modalEdicaoBloqueada: { title: string, text: string } | null

  // ✅ Modal premium para “solicitar liberação” (contexto/linha)
  const [modalSolicitacao, setModalSolicitacao] = useState(null);
  // modalSolicitacao: { scope: "CONTEXTO"|"ITEM_EDIT"|"ITEM_DELETE", rowId?: number, title: string, text: string } | null


  const openEdicaoBloqueadaModal = () => {
    setModalEdicaoBloqueada({
      title: "Edição bloqueada",
      text:
        "Este planejamento já foi enviado para validação. Para editar ou excluir itens, solicite autorização da coordenação/direção.",
    });
  };

  const closeEdicaoBloqueadaModal = () => {
    setModalEdicaoBloqueada(null);
  };

  // Mensagens do sistema (mock)
  const [mensagem, setMensagem] = useState(null); // { type: "success" | "info" | "warn" | "error", text: string }

  // ✅ Modal premium (bloqueante) — usado especialmente para confirmação de envio
  const [modalFeedback, setModalFeedback] = useState(null);

  // ✅ PASSO 5.1 — Modal de decisão: Salvar x Salvar e Enviar
  const [modalSalvarDecisao, setModalSalvarDecisao] = useState(false);

  // ✅ PASSO 5.3 — Modal premium: editar APENAS o OBJETIVO (por linha)
  // Mantém Tema/Conteúdo como catálogo (somente leitura).
  const [modalEditarObjetivo, setModalEditarObjetivo] = useState(null);
  // modalEditarObjetivo: { id:number, tema:string, conteudo:string, objetivo:string } | null

  const openEditarObjetivo = (row) => {
    const rid = Number(row?.id);
    if (!Number.isFinite(rid)) {
      showMsg("warn", "Não foi possível editar: ID inválido da linha.");
      return;
    }

    setModalEditarObjetivo({
      id: rid,
      tema: String(row?.tema || "").trim(),
      conteudo: String(row?.conteudo || "").trim(),
      objetivo: String(row?.objetivo || "").trim(),
    });
  };

  const closeEditarObjetivo = () => {
    setModalEditarObjetivo(null);
  };

  const salvarObjetivoModal = () => {
    if (!modalEditarObjetivo) return;

    const rid = Number(modalEditarObjetivo.id);
    if (!Number.isFinite(rid)) return;

    setRows((prev) =>
      (prev || []).map((r) =>
        Number(r.id) === rid
          ? { ...r, objetivo: String(modalEditarObjetivo.objetivo || "") }
          : r
      )
    );

    closeEditarObjetivo();

    // feedback leve (não bloqueante) — mantém seu padrão atual
    showMsg("success", "Objetivo atualizado na tabela. Clique em SALVAR para persistir.");
  };


  // modalFeedback: { type: "success" | "info" | "warn" | "error", title: string, text: string } | null

  const openFeedbackModal = (type, title, text) => {
    setModalFeedback({ type, title, text });
  };

  const closeFeedbackModal = () => {
    setModalFeedback(null);
  };

  // ✅ Modal premium de confirmação (remover linha)
  const [modalConfirmDelete, setModalConfirmDelete] = useState(null);
  // modalConfirmDelete: { id: number, tema: string, conteudo: string } | null

  const openConfirmDelete = (row) => {
    // ✅ Governança por linha:
    // Se o contexto está bloqueado, só permite excluir se a LINHA estiver liberada
    // (ou se estiver em edição autorizada por contexto).
    if (bloqueioEfetivo && !row?.edicao_liberada) {
      openEdicaoBloqueadaModal();
      return;
    }

    setModalConfirmDelete({
      id: row?.id,
      tema: String(row?.tema || "").trim(),
      conteudo: String(row?.conteudo || "").trim(),

      // ✅ mantém o sinal para a confirmação saber que essa linha pode “furar” o bloqueio do contexto
      edicao_liberada: !!row?.edicao_liberada,
    });
  };

  const closeConfirmDelete = () => {
    setModalConfirmDelete(null);
  };

  const [deletingPlano, setDeletingPlano] = useState(false);

  const confirmDelete = async () => {
    if (!modalConfirmDelete || deletingPlano) return;

    const liberadaPorLinha = !!modalConfirmDelete?.edicao_liberada;
    const liberada = edicaoAutorizada || liberadaPorLinha;

    // ✅ Se o contexto estiver bloqueado e NÃO houver liberação (nem por contexto nem por linha), impede.
    if (bloqueioEfetivo && !liberada) {
      closeConfirmDelete();
      openEdicaoBloqueadaModal();
      return;
    }

    const id = Number(modalConfirmDelete.id);

    // ✅ Regra RASCUNHO:
    // Se ainda não foi enviado (RASCUNHO) e NÃO estamos em modo “edição autorizada”,
    // a exclusão é somente na memória (frontend).
    if (contextoStatus === "RASCUNHO" && !edicaoAutorizada) {
      setRows((prev) => prev.filter((r) => r.id !== modalConfirmDelete.id));
      closeConfirmDelete();

      // ✅ UX premium — feedback bloqueante
      openFeedbackModal(
        "success",
        "Excluído com sucesso",
        "A linha foi removida da tabela."
      );

      return;
    }

    // ✅ Se id inválido/temporário, remove só da tela
    if (!Number.isFinite(id) || id <= 0) {
      setRows((prev) => prev.filter((r) => r.id !== modalConfirmDelete.id));
      closeConfirmDelete();

      // ✅ UX premium — feedback bloqueante
      openFeedbackModal(
        "success",
        "Excluído com sucesso",
        "A linha foi removida da tabela."
      );

      return;
    }

    // ✅ PASSO 3.6 — Se chegou aqui, é “edição autorizada” (ou contexto não-racunho):
    // então pode excluir no backend.
    setDeletingPlano(true);

    try {
      const { data } = await api.delete(`/conteudos/admin/planejamento/itens/${id}`);

      if (!data?.ok) {
        throw new Error("Resposta inválida do servidor.");
      }

      setRows((prev) => prev.filter((r) => r.id !== id));
      closeConfirmDelete();

      // ✅ UX premium — feedback bloqueante
      openFeedbackModal(
        "success",
        "Excluído com sucesso",
        "O item foi removido do planejamento."
      );
    } catch (err) {
      console.error("Erro ao excluir item:", err);
      // Se quiser, podemos trocar isto por modal premium também no próximo passo.
      showMsg("error", "Não foi possível excluir o item. Tente novamente.");
    } finally {
      setDeletingPlano(false);
    }
  };

  // =========================================================
  // 2.1) Modal (mock) — Adicionar Conteúdo
  // =========================================================
  const [modalAddOpen, setModalAddOpen] = useState(false);

  const showMsg = (type, text) => {
    setMensagem({ type, text });
    window.clearTimeout(showMsg._t);
    showMsg._t = window.setTimeout(() => setMensagem(null), 3200);
  };

  // =========================================================
  // 3) Dados mockados para seletores (surpresa “premium”)
  // =========================================================
  // ✅ Disciplinas disponíveis para seleção (sem fallback mock)
  const DISCIPLINAS = useMemo(() => {
    const list = Array.isArray(disciplinasProfessor) ? disciplinasProfessor : [];
    return list; // [{id, nome}]
  }, [disciplinasProfessor]);

  const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
  const SERIES = useMemo(() => {
    const lista = Array.isArray(turmasEscola) ? turmasEscola : [];

    const seriesDoAno = lista
      .filter((t) => Number(t?.ano) === Number(anoSelecionado))
      .map((t) => String(t?.serie || "").trim())
      .filter(Boolean);

    return Array.from(new Set(seriesDoAno)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [turmasEscola, anoSelecionado]);
  // ✅ ANOS derivados do contexto real da escola (turmas)
  const ANOS = useMemo(() => {
    const anos = Array.isArray(turmasEscola)
      ? turmasEscola
          .map((t) => Number(t?.ano))
          .filter((a) => Number.isFinite(a))
      : [];

    // remove duplicados e ordena desc
    return Array.from(new Set(anos))
      .sort((a, b) => b - a)
      .map(String);
  }, [turmasEscola]);

  const resumoPlano = useMemo(() => {
    return `${disciplinaSelecionadaNome || "—"} • ${bimestreSelecionado} • ${serieSelecionadaLabel || "—"} • ${anoSelecionado}`;
  }, [disciplinaSelecionadaNome, bimestreSelecionado, serieSelecionadaLabel, anoSelecionado]);

  // ✅ PASSO 3.11 — Atualiza automaticamente se já existe solicitação de reabertura para este contexto
  useEffect(() => {

    if (!contextoValido) {
      if (solicitacaoContexto) setSolicitacaoContexto(false);
      return;
    }

    setSolicitacaoContexto(hasReaberturaSolicitada());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextoValido, disciplina_id, serie, bimestreNumero, ano_letivo]);


  // =========================================================
  // 4) Ações (mock)
  // =========================================================
  const handleAdicionarLinha = () => {
    if (!contextoValido) {
      showMsg(
        "warn",
        "Ação bloqueada: selecione uma disciplina válida (vinculada ao professor) e confirme o contexto completo."
      );
      return;
    }

    if (contextoBloqueado) {
      const label =
        contextoStatus === "BLOQUEADO_TEMPO"
          ? "Bimestre encerrado (somente consulta)."
          : contextoStatus === "APROVADO"
            ? "Planejamento aprovado (edição bloqueada)."
            : "Planejamento enviado para validação (edição bloqueada).";

      showMsg("info", label);
      return;
    }

    setModalAddOpen(true);
  };

  const handleSalvarNovoConteudoViaModal = ({ bncc_unidade_tematica_id: temaId, seedf_conteudo_id: conteudoId, tema, conteudo, objetivo }) => {
    // ✅ Modal não persiste: apenas adiciona uma linha local (rascunho)
    if (!contextoValido) {
      showMsg("error", "Contexto incompleto. Selecione disciplina, série, bimestre e ano.");
      return;
    }

    const tmpId = -Date.now(); // id temporário (negativo) até persistir no SALVAR (topo)

    setRows((prev) => [
      {
        id: tmpId,
        tema: String(tema || "").trim(),
        conteudo: String(conteudo || "").trim(),
        objetivo: String(objetivo || "").trim(),
        editando: false,
        novo: true,

        // ids necessários para persistência em lote
        bncc_unidade_tematica_id: Number.isFinite(Number(temaId)) ? Number(temaId) : null,
        seedf_conteudo_id: Number.isFinite(Number(conteudoId)) ? Number(conteudoId) : null,
      },
      ...prev,
    ]);

    setModalAddOpen(false);
    showMsg("success", "Linha adicionada na tabela (rascunho). Clique em SALVAR para persistir.");
  };

  // =========================================================
  // PASSO 5.1 — Envio definitivo (Salvar e enviar)
  // =========================================================
  const handleSalvarEnviar = async () => {

    if (!contextoValido) {
      showMsg(
        "warn",
        "Ação bloqueada: selecione uma disciplina válida (vinculada ao professor) e confirme o contexto completo."
      );
      return;
    }

    if (contextoBloqueado) {
      const label =
        contextoStatus === "BLOQUEADO_TEMPO"
          ? "Bimestre encerrado (somente consulta)."
          : contextoStatus === "APROVADO"
            ? "Planejamento aprovado (edição bloqueada)."
            : "Planejamento já foi enviado para validação (edição bloqueada).";

      showMsg("info", label);
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      showMsg("warn", "Não há linhas para salvar neste contexto.");
      return;
    }

    // ✅ Regra real: Tema e Conteúdo são obrigatórios; Objetivo é opcional
    const temInvalido = rows.some((r) => {
      const temaOk = Number.isFinite(Number(r?.bncc_unidade_tematica_id));
      const conteudoOk = Number.isFinite(Number(r?.seedf_conteudo_id));
      const temaTxtOk = String(r?.tema || "").trim().length > 0;
      const conteudoTxtOk = String(r?.conteudo || "").trim().length > 0;
      return !(temaOk && conteudoOk && temaTxtOk && conteudoTxtOk);
    });

    if (temInvalido) {
      showMsg(
        "warn",
        "Há linhas inválidas. Confirme Tema (BNCC) e Conteúdo (SEEDF) em todas as linhas."
      );
      return;
    }

    setSavingPlano(true);

    try {
      const payload = {
        disciplina_id,
        serie,
        bimestre: bimestreNumero,
        ano_letivo,
        itens: rows.map((r) => ({
          bncc_unidade_tematica_id: Number(r.bncc_unidade_tematica_id),
          seedf_conteudo_id: Number(r.seedf_conteudo_id),
          texto: String(r?.objetivo || "").trim() || null, // objetivo opcional
        })),
      };

      const { data } = await api.post("/conteudos/admin/planejamento/lote", payload);

      if (!data?.ok) {
        throw new Error("Resposta inválida do servidor.");
      }

      // ✅ Confirmação premium (bloqueante)
      openFeedbackModal(
        "success",
        "Planejamento enviado com sucesso",
        "Planejamento enviado para validação da coordenação."
      );

      // ✅ UX: não limpa a tabela e não força reload (evita “sumir”)
      // Apenas bloqueia o contexto localmente (o backend já persistiu).
      setContextoStatus("ENVIADO");
      setRows((prev) =>
        (prev || []).map((r) => ({
          ...r,
          status: "ENVIADO",
        }))
      );
    } catch (err) {
      console.error("Erro ao salvar planejamento (lote):", err);
      showMsg("error", "Não foi possível salvar o planejamento. Tente novamente.");
    } finally {
      setSavingPlano(false);
    }
  };

  const toggleEditar = (id) => {
    if (!contextoValido) {
      showMsg(
        "warn",
        "Edição bloqueada: contexto inválido. Verifique disciplina/turma/bimestre/ano."
      );
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, editando: !r.editando } : r
      )
    );
  };

  const removerLinha = (id) => {
    if (!contextoValido) {
      showMsg(
        "warn",
        "Remoção bloqueada: contexto inválido. Verifique disciplina/turma/bimestre/ano."
      );
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== id));
    showMsg("success", "Linha removida.");
  };

  const atualizarCampo = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // =========================================================
  // PASSO 5.1 — Salvar rascunho (persistir sem enviar)
  // =========================================================
  const handleSalvarRascunho = async () => {
    if (!contextoValido) {
      showMsg(
        "warn",
        "Ação bloqueada: selecione uma disciplina válida e confirme o contexto completo."
      );
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      showMsg("warn", "Não há linhas para salvar neste contexto.");
      return;
    }

    setSavingPlano(true);

    try {
      const payload = {
        disciplina_id,
        serie,
        bimestre: bimestreNumero,
        ano_letivo,
        itens: rows.map((r) => ({
          bncc_unidade_tematica_id: Number(r.bncc_unidade_tematica_id),
          seedf_conteudo_id: Number(r.seedf_conteudo_id),
          texto: String(r?.objetivo || "").trim() || null,
        })),
      };

      const { data } = await api.post("/conteudos/admin/planejamento/lote", payload);

      if (!data?.ok) {
        throw new Error("Resposta inválida do servidor.");
      }

      openFeedbackModal(
        "success",
        "Rascunho salvo com sucesso",
        "Seu planejamento foi salvo, mas ainda não foi enviado para validação."
      );

      // mantém como rascunho
      setContextoStatus("RASCUNHO");

    } catch (err) {
      console.error("Erro ao salvar rascunho:", err);
      showMsg("error", "Não foi possível salvar o rascunho. Tente novamente.");
    } finally {
      setSavingPlano(false);
      setModalSalvarDecisao(false);
    }
  };


  // =========================================================
  // 5) UI helpers
  // =========================================================
  const msgClass = (type) => {
    if (type === "success") return "bg-green-100 text-green-800 border-green-200";
    if (type === "info") return "bg-blue-100 text-blue-800 border-blue-200";
    if (type === "warn") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const selectorCardBase =
    "relative rounded-2xl shadow-md border overflow-visible transition transform hover:-translate-y-[1px] hover:shadow-lg cursor-pointer z-10";
  const selectorTitleBase = "text-sm font-semibold opacity-95";
  const selectorValueBase = "text-lg font-extrabold tracking-tight";

  const isActive = (k) => activeSelector === k;

  const panelTheme = useMemo(() => {
    switch (activeSelector) {
      case "disciplina":
        return {
          wrap: "bg-indigo-50 border-indigo-200",
          title: "text-indigo-900",
          hint: "text-indigo-700",
          right: "text-indigo-700",
        };
      case "bimestre":
        return {
          wrap: "bg-emerald-50 border-emerald-200",
          title: "text-emerald-900",
          hint: "text-emerald-700",
          right: "text-emerald-700",
        };
      case "serie":
        return {
          wrap: "bg-orange-50 border-orange-200",
          title: "text-orange-900",
          hint: "text-orange-700",
          right: "text-orange-700",
        };
      case "ano":
        return {
          wrap: "bg-pink-50 border-pink-200",
          title: "text-pink-900",
          hint: "text-pink-700",
          right: "text-pink-700",
        };
      default:
        return {
          wrap: "bg-white border-slate-200",
          title: "text-blue-900",
          hint: "text-slate-600",
          right: "text-slate-600",
        };
    }
  }, [activeSelector]);

  const arrowTheme = useMemo(() => {
    switch (activeSelector) {
      case "disciplina":
        return { fill: "#6366F1", shadow: "drop-shadow(0 10px 14px rgba(79,70,229,.28))" };
      case "bimestre":
        return { fill: "#10B981", shadow: "drop-shadow(0 10px 14px rgba(5,150,105,.28))" };
      case "serie":
        return { fill: "#F97316", shadow: "drop-shadow(0 10px 14px rgba(234,88,12,.28))" };
      case "ano":
        return { fill: "#EC4899", shadow: "drop-shadow(0 10px 14px rgba(219,39,119,.28))" };
      default:
        return { fill: "#94A3B8", shadow: "drop-shadow(0 10px 14px rgba(15,23,42,.18))" };
    }
  }, [activeSelector]);


  // =========================================================
  // Render
  // =========================================================
  return (
    <div className="p-6">
      <ModalAdicionarConteudo
        open={modalAddOpen}
        onClose={() => setModalAddOpen(false)}
        onSave={handleSalvarNovoConteudoViaModal}
        contextoLabel={resumoPlano}
        contextoObj={{
          disciplina_id,
          disciplina_nome: disciplinaSelecionadaNome || null,
          serie,
          serie_label: serieSelecionadaLabel || null,
          ano_letivo,
          bimestre: bimestreNumero,
          bimestre_label: bimestreSelecionado || null,
        }}
      />
      <style>
        {`
          @keyframes growStem {
            0% { transform: scaleY(0); opacity: 0; }
            100% { transform: scaleY(1); opacity: 1; }
          }
        `}
      </style>

      {/* Título + subtítulo */}
      <div className="mb-6">
        <h1 className="text-5xl font-bold text-blue-900">
          Conteúdos
        </h1>
        <p className="mt-2 text-slate-700">
          Organização de conteúdos por bimestre, série e disciplina — com fluxo para validação pedagógica.
        </p>
      </div>

      {/* ✅ Modal premium (bloqueante) */}
      {modalFeedback && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeFeedbackModal}
            aria-hidden="true"
          />

          {/* card */}
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div
              className={`px-6 py-4 border-b ${
                modalFeedback.type === "success"
                  ? "bg-green-50 border-green-200"
                  : modalFeedback.type === "info"
                    ? "bg-blue-50 border-blue-200"
                    : modalFeedback.type === "warn"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {modalFeedback.title}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {modalFeedback.text}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeFeedbackModal}
                  className="rounded-xl px-3 py-2 text-sm font-extrabold bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="text-sm text-slate-700 leading-relaxed">
                {modalFeedback.type === "success" ? (
                  <>
                    Seu planejamento foi <span className="font-extrabold">enviado para validação</span>.
                    Enquanto estiver nesse status, a edição fica bloqueada para garantir governança.
                  </>
                ) : (
                  <>
                    Revise a mensagem acima e, se necessário, tente novamente.
                  </>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeFeedbackModal}
                  className={`rounded-xl px-5 py-3 text-sm font-extrabold shadow transition ${
                    modalFeedback.type === "success"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  OK, entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal premium (bloqueante) — alerta: edição bloqueada (IMPEDITIVO) */}
      {modalEdicaoBloqueada && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeEdicaoBloqueadaModal}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50 border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {modalEdicaoBloqueada.title}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {modalEdicaoBloqueada.text}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeEdicaoBloqueadaModal}
                  className="rounded-xl px-3 py-2 text-sm font-extrabold bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="text-sm text-slate-700 leading-relaxed">
                Este status é final (somente consulta). Se precisar alterar, procure a coordenação/direção.
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEdicaoBloqueadaModal}
                  className="rounded-xl px-5 py-3 text-sm font-extrabold shadow bg-slate-800 hover:bg-slate-900 text-white transition"
                >
                  OK, entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal premium (bloqueante) — SOLICITAÇÃO (contexto/linha) */}
      {modalSolicitacao && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalSolicitacao(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-red-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50 border-red-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {modalSolicitacao.title}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {modalSolicitacao.text}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalSolicitacao(null)}
                  className="rounded-xl px-3 py-2 text-sm font-extrabold bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="text-sm text-slate-700 leading-relaxed">
                Ao confirmar, a coordenação/direção receberá a solicitação para liberar edição.
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalSolicitacao(null)}
                  className="rounded-xl px-5 py-3 text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // ✅ PATCH real (direção)
                      if (modalSolicitacao.scope === "CONTEXTO") {
                        if (!contextoValido) {
                          openFeedbackModal(
                            "warn",
                            "Contexto incompleto",
                            "Selecione disciplina, série, bimestre e ano letivo antes de solicitar reabertura."
                          );
                          setModalSolicitacao(null);
                          return;
                        }

                        const jaSolicitado = hasReaberturaSolicitada();
                        if (!jaSolicitado) {
                          marcarReaberturaSolicitada();
                          setSolicitacaoContexto(true);
                        }

                        // ✅ PASSO 3.11: professor NÃO libera edição; apenas solicita e aguarda direção
                        openFeedbackModal(
                          "info",
                          jaSolicitado ? "Solicitação já registrada" : "Solicitação enviada",
                          jaSolicitado
                            ? "Já existe um pedido de reabertura para este contexto. Aguarde a direção/coordenação analisar e liberar a edição."
                            : "Seu pedido de reabertura foi registrado. Aguarde a direção/coordenação analisar e liberar a edição."
                        );
                      }

                      if (modalSolicitacao.scope === "ITEM_EDIT" || modalSolicitacao.scope === "ITEM_DELETE") {
                        const rid = Number(modalSolicitacao.rowId);
                        if (!Number.isFinite(rid)) throw new Error("ID inválido da linha.");

                        // ✅ PASSO 3.12: NÃO faz PATCH (isso é competência da direção futuramente)
                        // Apenas registra solicitação premium e mantém o bloqueio.
                        const jaSolicitado = hasSolicitacaoItem(rid, modalSolicitacao.scope);

                        if (!jaSolicitado) {
                          marcarSolicitacaoItem(rid, modalSolicitacao.scope);
                          setSolicitacoesItens((prev) => ({
                            ...(prev || {}),
                            [`${rid}:${modalSolicitacao.scope}`]: true,
                          }));

                        }

                        openFeedbackModal(
                          "info",
                          jaSolicitado ? "Solicitação já registrada" : "Solicitação enviada",
                          jaSolicitado
                            ? "Já existe um pedido para esta linha. Aguarde a direção/coordenação analisar e liberar a edição."
                            : "Seu pedido foi registrado. Aguarde a direção/coordenação analisar e liberar a edição."
                        );
                      }

                    } catch (e) {
                      console.error("[CONTEUDOS][PATCH edicao]", e);
                      openFeedbackModal(
                        "error",
                        "Falha ao liberar edição",
                        "Não foi possível concluir a operação. Verifique o backend e tente novamente."
                      );
                    } finally {
                      setModalSolicitacao(null);
                    }
                  }}
                  className="rounded-xl px-5 py-3 text-sm font-extrabold shadow bg-red-600 hover:bg-red-700 text-white transition"
                >
                  Sim, solicitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal premium (bloqueante) — confirmação de remoção */}
      {modalConfirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeConfirmDelete}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50 border-red-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Confirmar exclusão
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    Você está prestes a remover esta linha da tabela.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeConfirmDelete}
                  className="rounded-xl px-3 py-2 text-sm font-extrabold bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="text-sm text-slate-700 leading-relaxed">
                <div className="font-extrabold text-slate-900">Resumo</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-600">TEMA</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {modalConfirmDelete.tema || "—"}
                  </div>

                  <div className="mt-3 text-xs font-bold text-slate-600">CONTEÚDO</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {modalConfirmDelete.conteudo || "—"}
                  </div>
                </div>

                {/* (removido) */}

              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeConfirmDelete}
                  className="rounded-xl px-5 py-3 text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deletingPlano}
                  className={`rounded-xl px-5 py-3 text-sm font-extrabold shadow transition ${
                    deletingPlano
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {deletingPlano ? "EXCLUINDO..." : "Sim, excluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}




      {/* Mensagem do sistema (rápida) */}
      {mensagem && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${msgClass(mensagem.type)}`}>
          {mensagem.text}
        </div>
      )}


      {/* =========================================================
          1) Topo — 3 cards grandes (mesma altura)
      ========================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 shadow-lg text-white bg-gradient-to-br from-blue-600 to-blue-400">
          <h3 className="text-xl font-extrabold">Rascunho inteligente</h3>
          <p className="mt-2 text-sm opacity-95 leading-relaxed">
            Crie e ajuste conteúdos com clareza.
            Mantenha tudo organizado por bimestre.
            Fluxo pronto para validação pedagógica.
          </p>
        </div>

        <div className="rounded-2xl p-5 shadow-lg text-white bg-gradient-to-br from-emerald-600 to-emerald-400">
          <h3 className="text-xl font-extrabold">Padrão da escola</h3>
          <p className="mt-2 text-sm opacity-95 leading-relaxed">
            Conteúdos alinhados a objetivos.
            Facilidade de revisão pela coordenação.
            Histórico e consistência ao longo do ano.
          </p>
        </div>

        <div className="rounded-2xl p-5 shadow-lg text-white bg-gradient-to-br from-orange-600 to-orange-400">
          <h3 className="text-xl font-extrabold">Pronto para evoluir</h3>
          <p className="mt-2 text-sm opacity-95 leading-relaxed">
            Na próxima etapa conectaremos ao backend.
            Depois liberamos status e governança.
            Em produção, com segurança e auditoria.
          </p>
        </div>
      </section>

      {/* =========================================================
          2) Cards de seleção (4) — distribuídos horizontalmente
      ========================================================= */}
      <section className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Disciplina */}
          <div
            className={`${selectorCardBase} ${isActive("disciplina") ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setActiveSelector((p) => (p === "disciplina" ? null : "disciplina"))}
            role="button"
            tabIndex={0}
          >
            <div className="relative p-5 bg-gradient-to-br from-indigo-600 to-indigo-400 text-white rounded-2xl overflow-visible">
              <div className="relative z-20">
                <div className={selectorTitleBase}>Disciplina</div>
                <div className={`${selectorValueBase} mt-1`}>{disciplinaSelecionadaNome || "—"}</div>
                <div className="mt-2 text-xs opacity-90">
                  Clique para selecionar rapidamente.
                </div>
              </div>

              {isActive("disciplina") && (
                <>
                  {/* Seta (fica atrás do texto) */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 z-0 pointer-events-none">
                    <svg
                      width="190"
                      height="80"
                      viewBox="0 0 190 80"
                      style={{ filter: arrowTheme.shadow }}
                      className="animate-[growStem_.22s_ease-out]"
                      aria-hidden="true"
                    >
                      {/* Corpo */}
                      <path
                        d="M20 10 H170 V36 L112 36 L95 62 L78 36 H20 Z"
                        fill={arrowTheme.fill}
                        opacity="0.95"
                      />
                      {/* Highlight superior (efeito “moldado”) */}
                      <path
                        d="M24 14 H166 V34 H112 L95 58 L78 34 H24 Z"
                        fill="none"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        opacity="0.65"
                      />
                    </svg>
                  </div>

                  {/* Lip interno do card (faz a seta parecer embutida) */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-12 z-10 pointer-events-none"
                    style={{
                      background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(0,0,0,0.10) 100%)",
                      boxShadow:
                        "inset 0 6px 10px rgba(255,255,255,0.10), inset 0 -6px 10px rgba(0,0,0,0.12)",
                      clipPath: "inset(0 12px 0 12px round 0 0 14px 14px)",
                    }}
                  />
                </>
              )}

            </div>
          </div>

          {/* Bimestre */}
          <div
            className={`${selectorCardBase} ${isActive("bimestre") ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setActiveSelector((p) => (p === "bimestre" ? null : "bimestre"))}
            role="button"
            tabIndex={0}
          >
            <div className="relative p-5 bg-gradient-to-br from-emerald-600 to-emerald-400 text-white rounded-2xl overflow-visible">
              <div className="relative z-20">
                <div className={selectorTitleBase}>Bimestre</div>
                <div className={`${selectorValueBase} mt-1`}>{bimestreSelecionado}</div>
                <div className="mt-2 text-xs opacity-90">
                  Controle o período do plano.
                </div>
              </div>

              {isActive("bimestre") && (
                <>
                  {/* Seta (fica atrás do texto) */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 z-0 pointer-events-none">
                    <svg
                      width="190"
                      height="80"
                      viewBox="0 0 190 80"
                      style={{ filter: arrowTheme.shadow }}
                      className="animate-[growStem_.22s_ease-out]"
                      aria-hidden="true"
                    >
                      {/* Corpo */}
                      <path
                        d="M20 10 H170 V36 L112 36 L95 62 L78 36 H20 Z"
                        fill={arrowTheme.fill}
                        opacity="0.95"
                      />
                      {/* Highlight superior (efeito “moldado”) */}
                      <path
                        d="M24 14 H166 V34 H112 L95 58 L78 34 H24 Z"
                        fill="none"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        opacity="0.65"
                      />
                    </svg>
                  </div>

                  {/* Lip interno do card (faz a seta parecer embutida) */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-12 z-10 pointer-events-none"
                    style={{
                      background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(0,0,0,0.10) 100%)",
                      boxShadow:
                        "inset 0 6px 10px rgba(255,255,255,0.10), inset 0 -6px 10px rgba(0,0,0,0.12)",
                      clipPath: "inset(0 12px 0 12px round 0 0 14px 14px)",
                    }}
                  />
                </>
              )}


            </div>
          </div>

          {/* Série */}
          <div
            className={`${selectorCardBase} ${isActive("serie") ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setActiveSelector((p) => (p === "serie" ? null : "serie"))}
            role="button"
            tabIndex={0}
          >
            <div className="relative p-5 bg-gradient-to-br from-orange-600 to-orange-400 text-white rounded-2xl overflow-visible">
              <div className="relative z-20">
                <div className={selectorTitleBase}>Série</div>
                <div className={`${selectorValueBase} mt-1`}>{serieSelecionadaLabel || "—"}</div>
                <div className="mt-2 text-xs opacity-90">
                  Selecione o público-alvo.
                </div>
              </div>

              {isActive("serie") && (
                <>
                  {/* Seta (fica atrás do texto) */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 z-0 pointer-events-none">
                    <svg
                      width="190"
                      height="80"
                      viewBox="0 0 190 80"
                      style={{ filter: arrowTheme.shadow }}
                      className="animate-[growStem_.22s_ease-out]"
                      aria-hidden="true"
                    >
                      {/* Corpo */}
                      <path
                        d="M20 10 H170 V36 L112 36 L95 62 L78 36 H20 Z"
                        fill={arrowTheme.fill}
                        opacity="0.95"
                      />
                      {/* Highlight superior (efeito “moldado”) */}
                      <path
                        d="M24 14 H166 V34 H112 L95 58 L78 34 H24 Z"
                        fill="none"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        opacity="0.65"
                      />
                    </svg>
                  </div>

                  {/* Lip interno do card (faz a seta parecer embutida) */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-12 z-10 pointer-events-none"
                    style={{
                      background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(0,0,0,0.10) 100%)",
                      boxShadow:
                        "inset 0 6px 10px rgba(255,255,255,0.10), inset 0 -6px 10px rgba(0,0,0,0.12)",
                      clipPath: "inset(0 12px 0 12px round 0 0 14px 14px)",
                    }}
                  />
                </>
              )}



            </div>
          </div>
          {/* Ano letivo */}
          <div
            className={`${selectorCardBase} ${isActive("ano") ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setActiveSelector((p) => (p === "ano" ? null : "ano"))}
            role="button"
            tabIndex={0}
          >
            <div className="relative p-5 bg-gradient-to-br from-pink-600 to-pink-400 text-white rounded-2xl overflow-visible">
              <div className="relative z-20">
                <div className={selectorTitleBase}>Ano letivo</div>
                <div className={`${selectorValueBase} mt-1`}>{anoSelecionado || "—"}</div>
                <div className="mt-2 text-xs opacity-90">
                  Plano por ano de referência.
                </div>
              </div>

              {isActive("ano") && (
                <>
                  {/* Seta (fica atrás do texto) */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 z-0 pointer-events-none">
                    <svg
                      width="190"
                      height="80"
                      viewBox="0 0 190 80"
                      style={{ filter: arrowTheme.shadow }}
                      className="animate-[growStem_.22s_ease-out]"
                      aria-hidden="true"
                    >
                      {/* Corpo */}
                      <path
                        d="M20 10 H170 V36 L112 36 L95 62 L78 36 H20 Z"
                        fill={arrowTheme.fill}
                        opacity="0.95"
                      />
                      {/* Highlight superior (efeito “moldado”) */}
                      <path
                        d="M24 14 H166 V34 H112 L95 58 L78 34 H24 Z"
                        fill="none"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        opacity="0.65"
                      />
                    </svg>
                  </div>

                  {/* Lip interno do card (faz a seta parecer embutida) */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-12 z-10 pointer-events-none"
                    style={{
                      background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(0,0,0,0.10) 100%)",
                      boxShadow:
                        "inset 0 6px 10px rgba(255,255,255,0.10), inset 0 -6px 10px rgba(0,0,0,0.12)",
                      clipPath: "inset(0 12px 0 12px round 0 0 14px 14px)",
                    }}
                  />
                </>
              )}


            </div>
          </div>
        </div>

        {/* =========================================================
            “Surpresa” — Painel de chips aparece conforme card ativo
        ========================================================= */}
        {activeSelector && (
          <div className={`relative z-0 mt-4 rounded-2xl border shadow-sm p-4 ${panelTheme.wrap}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className={`text-sm font-bold ${panelTheme.title}`}>
                  Seleção rápida
                </div>
                <div className={`text-xs ${panelTheme.hint}`}>
                  Clique em uma opção para aplicar. O resumo do plano se ajusta automaticamente.
                </div>
              </div>

              <div className={`text-xs font-semibold ${panelTheme.right}`}>
                Plano atual: <span className="text-slate-900">{resumoPlano}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {activeSelector === "disciplina" && (
                <>
                  {DISCIPLINAS.length === 0 ? (
                    <div className="text-sm font-semibold text-slate-700">
                      Nenhuma disciplina vinculada ao professor logado. Verifique o cadastro do professor.
                    </div>
                  ) : (
                    DISCIPLINAS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDisciplinaSelecionadaId(d.id)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                          Number(disciplinaSelecionadaId) === Number(d.id)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-blue-900 border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {Number(disciplinaSelecionadaId) === Number(d.id) ? (
                          <span className="inline-flex items-center gap-2">
                            <CheckIcon className="h-4 w-4" /> {d.nome}
                          </span>
                        ) : (
                          d.nome
                        )}
                      </button>
                    ))
                  )}
                </>
              )}

              {activeSelector === "bimestre" &&
                BIMESTRES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBimestreSelecionado(b)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                      bimestreSelecionado === b
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              {activeSelector === "serie" && (
                <>
                  {SERIES.length === 0 ? (
                    <div className="text-sm font-semibold text-slate-700">
                      Nenhuma série encontrada para o ano letivo selecionado.
                    </div>
                  ) : (
                    SERIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSerieSelecionada(s)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                          String(serieSelecionada || "").trim() === String(s).trim()
                            ? "bg-orange-600 text-white border-orange-600"
                            : "bg-white text-orange-900 border-orange-200 hover:bg-orange-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))
                  )}
                </>
              )}

              {activeSelector === "ano" &&
                ANOS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAnoSelecionado(a)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                      anoSelecionado === a
                        ? "bg-pink-600 text-white border-pink-600"
                        : "bg-white text-pink-900 border-pink-200 hover:bg-pink-50"
                    }`}
                  >
                    {a}
                  </button>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* =========================================================
          3) Botões alinhados à direita: + Adicionar / SALVAR
      ========================================================= */}
      <section className="mt-6 flex items-center justify-end gap-3">

        {/* ✅ PASSO 4 — Botão "Reabrir" (somente quando ENVIADO e sem edição autorizada) */}
        {contextoValido && uxModo === "SOLICITAVEL" && (
          <button
            type="button"
            onClick={() => {
              const jaSolicitado = hasReaberturaSolicitada();

              // Marca persistente (primeira vez)
              if (!jaSolicitado) {
                marcarReaberturaSolicitada();
                setSolicitacaoContexto(true);
              }

              // ✅ UX premium: apenas informa e mantém bloqueado (aguarda direção)
              openFeedbackModal(
                "info",
                jaSolicitado ? "Solicitação já registrada" : "Solicitação enviada",
                jaSolicitado
                  ? "Já existe um pedido de reabertura para este contexto. Aguarde a direção/coordenação analisar e liberar a edição."
                  : "Seu pedido de reabertura foi registrado. Aguarde a direção/coordenação analisar e liberar a edição."
              );
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold shadow transition bg-red-600 hover:bg-red-700 text-white"
            title={solicitacaoContexto ? "Solicitação já registrada" : "Solicitar reabertura do contexto"}
          >
            Reabrir
          </button>
        )}

        <button
          type="button"
          onClick={handleAdicionarLinha}
          disabled={!contextoValido || bloqueioEfetivo || savingPlano}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold shadow transition ${
            !contextoValido || savingPlano
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : bloqueioEfetivo && uxModo === "SOLICITAVEL"
                ? "bg-red-100 text-red-700 border border-red-200 cursor-not-allowed"
                : bloqueioEfetivo
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          title={
            !contextoValido
              ? "Ação bloqueada: disciplina não vinculada ao professor ou contexto incompleto."
              : contextoBloqueado
                ? "Contexto enviado/aprovado/bloqueado: somente consulta."
                : savingPlano
                  ? "Salvando planejamento..."
                  : "Adicionar um novo item"
          }
        >
          <PlusIcon className="h-5 w-5" />
          Adicionar
        </button>

        <button
          type="button"
          onClick={() => setModalSalvarDecisao(true)}
          disabled={!contextoValido || bloqueioEfetivo || savingPlano || !Array.isArray(rows) || rows.length === 0}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold shadow transition ${
            !contextoValido || savingPlano || !Array.isArray(rows) || rows.length === 0
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : bloqueioEfetivo && uxModo === "SOLICITAVEL"
                ? "bg-red-100 text-red-700 border border-red-200 cursor-not-allowed"
                : bloqueioEfetivo
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
          }`}
          title={
            !contextoValido
              ? "Ação bloqueada: disciplina não vinculada ao professor ou contexto incompleto."
              : (!Array.isArray(rows) || rows.length === 0)
                ? "Adicione pelo menos uma linha na tabela antes de salvar."
                : contextoBloqueado
                  ? "Contexto enviado/aprovado/bloqueado: somente consulta."
                  : savingPlano
                    ? "Salvando planejamento..."
                    : "Salvar planejamento"
          }
        >
          {savingPlano ? "SALVANDO..." : "SALVAR"}
        </button>
      </section>

      {/* =========================================================
          4) Tabela: Tema | Conteúdo | Objetivo | Ações
      ========================================================= */}
      <section className="mt-5 rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-xl font-extrabold text-blue-900">Lista de Conteúdos</h3>
              <p className="text-sm text-slate-600">
                Visualize os itens do plano por contexto. Use <span className="font-bold">Adicionar</span> para inserir novos itens.
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-600">
              Contexto: <span className="text-slate-900">{resumoPlano}</span>
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          {/* Estado visual: carregando */}
          {loadingPlano && (
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
                <div className="text-sm font-semibold text-slate-700">
                  Carregando itens do plano...
                </div>
              </div>
            </div>
          )}

          {/* Estado visual: erro ao carregar (sem toast) */}
          {!loadingPlano && planoErro && (
            <div className="px-5 py-4 border-b border-red-200 bg-red-50">
              <div className="text-sm font-extrabold text-red-800">Erro ao carregar</div>
              <div className="mt-1 text-sm font-semibold text-red-700">{planoErro}</div>
            </div>
          )}

          <table className="w-full min-w-[980px]">
            <thead className="bg-blue-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-extrabold text-blue-900 border-b border-blue-200">
                  TEMA
                </th>
                <th className="text-left px-4 py-3 text-sm font-extrabold text-blue-900 border-b border-blue-200">
                  CONTEÚDO
                </th>
                <th className="text-left px-4 py-3 text-sm font-extrabold text-blue-900 border-b border-blue-200">
                  OBJETIVO
                </th>
                <th className="text-center px-4 py-3 text-sm font-extrabold text-blue-900 border-b border-blue-200 w-[140px]">
                  AÇÕES
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">

                  {/* TEMA (somente leitura — catálogo BNCC) */}
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-slate-900">{r.tema}</div>
                  </td>

                  {/* CONTEÚDO (somente leitura — catálogo SEEDF) */}
                  <td className="px-4 py-3 align-top">
                    <div className="text-slate-700 whitespace-pre-wrap">{r.conteudo}</div>
                  </td>

                  {/* OBJETIVO (editável apenas via modal premium) */}
                  <td className="px-4 py-3 align-top">
                    <div className="text-slate-700 whitespace-pre-wrap">
                      {String(r.objetivo || "").trim() ? r.objetivo : ""}
                    </div>
                  </td>

                  {/* AÇÕES */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {/* Azul — “Detalhes/Validação” (mock) */}
                      <button
                        type="button"
                        onClick={() =>
                          showMsg(
                            "info",
                            "Ação azul (mock): aqui entraremos com fluxo de validação/visualização."
                          )
                        }
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Ação (mock)"
                      >
                        <IdentificationIcon className="h-5 w-5" />
                      </button>

                      {/* ✅ PASSO 4 — Editar (governança) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (podeEditarLinha(r)) {
                            openEditarObjetivo(r);
                            return;
                          }

                          if (uxModo === "SOLICITAVEL") {
                            const jaSolicitado = hasSolicitacaoItem(r.id, "ITEM_EDIT");

                            setModalSolicitacao({
                              scope: "ITEM_EDIT",
                              rowId: r.id,
                              title: jaSolicitado ? "Solicitação já registrada" : "Solicitar edição desta linha",
                              text: jaSolicitado
                                ? "Já existe um pedido de liberação para esta linha. Aguarde a direção/coordenação analisar e liberar a edição."
                                : "Este contexto foi enviado. Deseja solicitar liberação para editar esta linha específica?",
                            });
                            return;
                          }

                          // IMPEDITIVO
                          setModalEdicaoBloqueada({
                            title: "Edição indisponível",
                            text: "Este contexto está aprovado/bloqueado. Não é possível solicitar edição por aqui.",
                          });
                        }}
                        className={`p-2 rounded-lg transition ${
                          podeEditarLinha(r)
                            ? "text-green-600 hover:bg-green-50"
                            : uxModo === "SOLICITAVEL"
                              ? "text-red-600 hover:bg-red-50"
                              : "text-slate-300 cursor-not-allowed"
                        }`}
                        title={
                          podeEditarLinha(r)
                            ? (r.editando ? "Concluir edição" : "Editar linha")
                            : uxModo === "SOLICITAVEL"
                              ? "Solicitar liberação para editar"
                              : "Edição indisponível"
                        }
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>

                      {/* ✅ PASSO 4 — Remover (governança) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (podeEditarLinha(r)) {
                            openConfirmDelete(r);
                            return;
                          }

                          if (uxModo === "SOLICITAVEL") {
                            const jaSolicitado = hasSolicitacaoItem(r.id, "ITEM_DELETE");

                            setModalSolicitacao({
                              scope: "ITEM_DELETE",
                              rowId: r.id,
                              title: jaSolicitado ? "Solicitação já registrada" : "Solicitar exclusão desta linha",
                              text: jaSolicitado
                                ? "Já existe um pedido de liberação para esta linha. Aguarde a direção/coordenação analisar e liberar a edição."
                                : "Este contexto foi enviado. Deseja solicitar liberação para excluir esta linha específica?",
                            });
                            return;
                          }

                          // IMPEDITIVO
                          setModalEdicaoBloqueada({
                            title: "Exclusão indisponível",
                            text: "Este contexto está aprovado/bloqueado. Não é possível solicitar exclusão por aqui.",
                          });
                        }}
                        className={`p-2 rounded-lg transition ${
                          podeEditarLinha(r)
                            ? "text-green-600 hover:bg-green-50"
                            : uxModo === "SOLICITAVEL"
                              ? "text-red-600 hover:bg-red-50"
                              : "text-slate-300 cursor-not-allowed"
                        }`}
                        title={
                          podeEditarLinha(r)
                            ? "Remover linha"
                            : uxModo === "SOLICITAVEL"
                              ? "Solicitar liberação para excluir"
                              : "Exclusão indisponível"
                        }
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loadingPlano && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-xl">
                      <div className="text-lg font-extrabold text-slate-800">
                        Sem itens para este contexto
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Não encontramos itens para <span className="font-semibold">{resumoPlano}</span>.
                        Clique em <span className="font-bold">Adicionar</span> para inserir o primeiro.
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé (reservado) */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            {/* (vazio por enquanto) */}
          </div>
        </div>
      </section>


      {/* ✅ PASSO 5.3 — Modal premium: editar OBJETIVO (por linha) */}
      {modalEditarObjetivo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeEditarObjetivo}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-emerald-50 border-emerald-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Editar objetivo
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    Você está editando apenas o <span className="font-extrabold">OBJETIVO</span>. Tema e Conteúdo são fixos (catálogo).
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeEditarObjetivo}
                  className="rounded-xl px-3 py-2 text-sm font-extrabold bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-600">TEMA (BNCC)</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">
                  {modalEditarObjetivo.tema || "—"}
                </div>

                <div className="mt-3 text-xs font-bold text-slate-600">CONTEÚDO (SEEDF)</div>
                <div className="mt-1 text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                  {modalEditarObjetivo.conteudo || "—"}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-bold text-slate-600">OBJETIVO</div>
                <textarea
                  value={modalEditarObjetivo.objetivo}
                  onChange={(e) =>
                    setModalEditarObjetivo((prev) =>
                      prev ? { ...prev, objetivo: e.target.value } : prev
                    )
                  }
                  className="mt-2 w-full min-h-[120px] rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Descreva o objetivo..."
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditarObjetivo}
                  className="rounded-xl px-5 py-3 text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarObjetivoModal}
                  className="rounded-xl px-5 py-3 text-sm font-extrabold shadow bg-emerald-600 hover:bg-emerald-700 text-white transition"
                >
                  Salvar objetivo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}





      {modalSalvarDecisao && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalSalvarDecisao(false)}
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-blue-50 border-blue-200">
              <div className="text-sm font-extrabold text-slate-900">
                Salvar planejamento
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                Escolha como deseja prosseguir com este conteúdo.
              </div>
            </div>

            <div className="px-6 py-5 text-sm text-slate-700">
              <p>
                Você pode <strong>salvar como rascunho</strong> para continuar depois,
                ou <strong>salvar e enviar</strong> para validação da coordenação.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalSalvarDecisao(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-extrabold hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSalvarRascunho}
                  className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-extrabold"
                >
                  Salvar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalSalvarDecisao(false);
                    handleSalvarEnviar();
                  }}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold"
                >
                  Salvar e enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
