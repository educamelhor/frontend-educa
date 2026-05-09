import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  BoltIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

/**
 * AgenteNotas.jsx
 * ─────────────────────────────────────────────────────────
 * AGENTE EDUCA › Notas
 *
 * Etapa 2: Exportar as notas da coluna "Avaliação Bimestral"
 * dos Planos de Avaliação Pedagógico (PAP) para o portal EDUCADF.
 *
 * Pré-requisito: o plano deve ter sido exportado na Etapa 1 (estrutura).
 * ─────────────────────────────────────────────────────────
 */

const STATUS_LABELS = {
  APROVADO:  { label: "Aprovado",  color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  ENVIADO:   { label: "Enviado",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  RASCUNHO:  { label: "Rascunho", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  DEVOLVIDO: { label: "Devolvido",color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

const BIMESTRE_COLORS = {
  "1º Bimestre": "#6366f1",
  "2º Bimestre": "#8b5cf6",
  "3º Bimestre": "#ec4899",
  "4º Bimestre": "#f59e0b",
};

// ── Card individual de plano ──────────────────────────
function NotaCard({ plano, onExportar, onReexportar, exportandoId, onVerRelatorio }) {
  const [expanded, setExpanded] = useState(false);

  const statusInfo = STATUS_LABELS[plano.status] || STATUS_LABELS.RASCUNHO;
  const bimColor   = BIMESTRE_COLORS[plano.bimestre] || "#6366f1";
  const itens      = Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || "[]");
  const bimestral  = itens.find(i => i.fixo_direcao);
  const exportando = exportandoId === plano.id;

  const emExecucao         = !!plano.agente_executando_desde &&
    (Date.now() - new Date(plano.agente_executando_desde).getTime() < 15 * 60 * 1000);
  const estruturaExportada = !!plano.agente_exportado_em;
  const notasExportadas    = !!plano.agente_notas_exportadas_em;
  const podeExportar       = estruturaExportada && !notasExportadas && !emExecucao &&
                             (plano.status === "APROVADO" || plano.status === "ENVIADO") &&
                             !!bimestral;

  return (
    <div
      style={{
        borderRadius: 20,
        background: "linear-gradient(160deg, #1e2340 0%, #151929 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        overflow: "hidden",
        marginBottom: 16,
        transition: "transform 0.2s",
      }}
    >
      {/* Barra lateral colorida */}
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, background: `linear-gradient(180deg, ${bimColor}, transparent)`, flexShrink: 0 }} />

        <div style={{ flex: 1, padding: "20px 22px" }}>
          {/* Cabeçalho */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              {/* Badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{
                  fontSize: "0.65rem", fontWeight: 800, padding: "3px 10px", borderRadius: 99,
                  background: statusInfo.bg, color: statusInfo.color,
                  border: `1px solid ${statusInfo.color}40`, textTransform: "uppercase", letterSpacing: "0.6px",
                }}>
                  {statusInfo.label}
                </span>
                <span style={{
                  fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                  background: `${bimColor}18`, color: bimColor,
                  border: `1px solid ${bimColor}40`,
                }}>
                  {plano.bimestre}
                </span>
                {bimestral && (
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                    background: "rgba(139,92,246,0.12)", color: "#a78bfa",
                    border: "1px solid rgba(139,92,246,0.25)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    ✓ Avaliação Bimestral
                  </span>
                )}
                {estruturaExportada && (
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                    background: "rgba(34,197,94,0.1)", color: "#4ade80",
                    border: "1px solid rgba(34,197,94,0.25)",
                  }}>
                    ✓ Estrutura exportada
                  </span>
                )}
                {notasExportadas && (
                  <button
                    onClick={() => onVerRelatorio(plano)}
                    title="Ver relatório da última exportação"
                    style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                      background: "rgba(99,102,241,0.12)", color: "#a5b4fc",
                      border: "1px solid rgba(99,102,241,0.35)",
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(99,102,241,0.25)";
                      e.currentTarget.style.color = "#c7d2fe";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(99,102,241,0.12)";
                      e.currentTarget.style.color = "#a5b4fc";
                    }}
                  >
                    <ClipboardDocumentListIcon style={{ width: 11 }} />
                    Relatório de Exportação
                  </button>
                )}
              </div>

              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>
                {plano.disciplina}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>
                Turma: <strong style={{ color: "#cbd5e1" }}>{plano.turmas}</strong>
                {plano.ano && <> · Ano: <strong style={{ color: "#cbd5e1" }}>{plano.ano}</strong></>}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              {emExecucao || exportando ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
                  borderRadius: 14, background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.35)",
                }}>
                  <ArrowPathIcon style={{ width: 15, color: "#34d399", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#34d399" }}>Em execução...</div>
                    <div style={{ fontSize: "0.6rem", color: "#10b981" }}>Lançando notas no EDUCADF</div>
                  </div>
                </div>
              ) : notasExportadas ? (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
                  }}>
                    <CheckCircleIcon style={{ width: 16, color: "#22c55e" }} />
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#22c55e" }}>Notas Exportadas</div>
                      <div style={{ fontSize: "0.6rem", color: "#4ade80" }}>
                        {new Date(plano.agente_notas_exportadas_em).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>
                  {estruturaExportada && (plano.status === "APROVADO" || plano.status === "ENVIADO") && (
                    <button
                      onClick={() => onReexportar(plano)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "5px 12px", borderRadius: 10, fontWeight: 700,
                        fontSize: "0.7rem", cursor: "pointer",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; e.currentTarget.style.color = "#6ee7b7"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94a3b8"; }}
                    >
                      <ArrowPathIcon style={{ width: 12 }} />
                      Reexportar Notas
                    </button>
                  )}
                </>
              ) : !bimestral ? (
                <div style={{ padding: "8px 14px", borderRadius: 12, fontSize: "0.7rem", background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.15)", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                  <LockClosedIcon style={{ width: 14 }} />
                  Sem col. Bimestral
                </div>
              ) : !estruturaExportada ? (
                <div style={{ padding: "8px 14px", borderRadius: 12, fontSize: "0.7rem", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                  <ExclamationTriangleIcon style={{ width: 14 }} />
                  Aguardando Etapa 1
                </div>
              ) : !podeExportar ? (
                <div style={{ padding: "8px 14px", borderRadius: 12, fontSize: "0.7rem", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                  <ExclamationTriangleIcon style={{ width: 14 }} />
                  Plano {plano.status}
                </div>
              ) : (
                <button
                  onClick={() => onExportar(plano)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 18px", borderRadius: 14, fontWeight: 800,
                    fontSize: "0.8rem", cursor: "pointer",
                    background: "linear-gradient(135deg, #10b981, #0891b2)",
                    border: "none", color: "#fff",
                    boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
                    transition: "all 0.2s",
                  }}
                >
                  <RocketLaunchIcon style={{ width: 15 }} />
                  Exportar Notas
                </button>
              )}

              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#64748b", fontSize: "0.7rem", display: "flex",
                  alignItems: "center", gap: 4, fontWeight: 600,
                }}
              >
                {expanded ? <ChevronUpIcon style={{ width: 14 }} /> : <ChevronDownIcon style={{ width: 14 }} />}
                {expanded ? "Ocultar" : "Ver colunas"}
              </button>
            </div>
          </div>

          {/* Detalhe das colunas */}
          {expanded && (
            <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
                Colunas do Plano
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {itens.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "7px 12px", borderRadius: 10,
                      background: item.fixo_direcao ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)",
                      border: item.fixo_direcao ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: item.fixo_direcao ? "#c4b5fd" : "#94a3b8" }}>
                      {item.fixo_direcao && <SparklesIcon style={{ width: 12, display: "inline", marginRight: 4 }} />}
                      {item.atividade}
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "#475569", marginTop: 2 }}>
                      {item.nota_total} pts
                      {item.fixo_direcao && (
                        <span style={{ color: "#a78bfa", marginLeft: 6 }}>← notas serão exportadas</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────
export default function AgenteNotas() {
  const [planos, setPlanos]               = useState([]);
  const [carregando, setCarregando]       = useState(true);
  const [exportandoId, setExportandoId]   = useState(null);
  const [filtro, setFiltro]               = useState("todos");
  const [filtroBimestre, setFiltroBimestre] = useState("todos"); // "todos" | "1" | "2" | "3" | "4"
  const [modalConfirm, setModalConfirm]   = useState(null);
  const [modalSemCred, setModalSemCred]   = useState(false);
  const [modalResultado, setModalResultado] = useState(null);
  const [modalReexportarNotas, setModalReexportarNotas] = useState(null);

  // ── Carrega planos ──────────────────────────────────────
  useEffect(() => {
    const fetchDados = async () => {
      setCarregando(true);
      try {
        const ano = new Date().getFullYear();
        const resp = await api.get("/avaliacoes/me", { params: { ano } });
        const lista = resp.data?.planos || [];

        const comItens = await Promise.all(
          lista.map(async p => {
            try {
              const det = await api.get(`/avaliacoes/${p.id}`);
              return det.data || p;
            } catch {
              return p;
            }
          })
        );
        setPlanos(comItens);
      } catch {
        abrirModalResultado("erro", "Erro ao carregar", "Não foi possível carregar os planos.");
      } finally {
        setCarregando(false);
      }
    };
    fetchDados();
  }, []);

  const abrirModalResultado = (tipo, titulo, texto) => {
    setModalResultado({ tipo, titulo, texto });
  };

  // ── Filtros ─────────────────────────────────────────────
  const planosComBimestral = planos.filter(p => {
    const itens = Array.isArray(p.itens) ? p.itens : JSON.parse(p.itens || "[]");
    return itens.some(i => i.fixo_direcao);
  });

  // Filtro por bimestre
  const planosPorBimestre = filtroBimestre === "todos"
    ? planosComBimestral
    : planosComBimestral.filter(p => String(p.bimestre || "").replace(/\D/g, "") === filtroBimestre);

  // Elegíveis para exportar notas: estrutura exportada (Etapa 1) + notas ainda não exportadas
  const planosProntos = planosPorBimestre.filter(p =>
    !!p.agente_exportado_em &&
    !p.agente_notas_exportadas_em &&
    (p.status === "APROVADO" || p.status === "ENVIADO")
  );
  const planosExportados = planosPorBimestre.filter(p => !!p.agente_notas_exportadas_em);

  const planosFiltrados = (() => {
    switch (filtro) {
      case "prontos":    return planosProntos;
      case "exportados": return planosExportados;
      default:           return planosPorBimestre;
    }
  })();

  // Contagem por bimestre (para badge nos mini-cards)
  const contagemPorBim = planosComBimestral.reduce((acc, p) => {
    const n = String(p.bimestre || "").replace(/\D/g, "");
    if (n) acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});

  // ── Polling helper notas (202 async pattern) ─────────────────────────────
  const traduzirErroAgente = (msg) => {
    if (!msg) return 'O agente encontrou um erro no EDUCADF. Tente novamente.';
    const m = msg.toLowerCase();
    // Portal fora do ar — verificado PRIMEIRO
    if (m.includes('portal_indisponivel') || m.includes('problemas técnicos') ||
        m.includes('erro interno') || m.includes('serviço indisponível') ||
        m.includes('bad gateway') || m.includes('gateway timeout') || m.includes('sistema indisponível'))
      return '⚠️ O EDUCADF está apresentando instabilidade técnica. Aguarde alguns minutos e tente novamente.';
    if (m.includes('dropdown vazio') || m.includes('no items found') || m.includes('turmas disponíveis'))
      return '⚠️ O EDUCADF não retornou as turmas disponíveis — instabilidade do portal. Aguarde um minuto e tente novamente.';
    if (m.includes('swal') || m.includes('intercepts pointer') || m.includes('overlay'))
      return 'O portal EDUCADF exibiu uma janela de alerta que bloqueou a operação. Tente novamente — o agente agora fecha esse alerta automaticamente.';
    if (m.includes('login') || m.includes('senha') || m.includes('credencial'))
      return 'Falha no login do EDUCADF. Verifique suas credenciais em Agente EDUCA > Configurações.';
    // Mismatch de bimestre — deve vir ANTES do check genérico de "turma"
    if (m.includes('bimestre_indisponivel') || m.includes('não possui eventos do') || m.includes('exibe apenas')) {
      const bimAlvo = msg.match(/eventos do (\dº Bimestre)/i)?.[1] || 'bimestre solicitado';
      const bimDisp = msg.match(/exibe apenas:\s*([^.]+)/i)?.[1]?.trim() || '';
      return `⚠️ O calendário EDUCADF não tem eventos do ${bimAlvo} para esta turma.` +
             (bimDisp ? ` Os eventos disponíveis são do: ${bimDisp}.` : '') +
             ' Verifique se o bimestre do plano está correto ou atualize o plano para o período letivo atual no EDUCADF.';
    }
    if (m.includes('turma') || m.includes('calendário') || m.includes('calendario'))
      return 'Turma não encontrada no EDUCADF. Verifique se a turma está cadastrada para este bimestre.';

    if (m.includes('nota') || m.includes('aluno') || m.includes('coluna'))
      return 'Erro ao preencher notas no EDUCADF. Verifique se a estrutura (Etapa 1) foi exportada corretamente.';
    if (m.includes('timeout') || m.includes('time out'))
      return 'O EDUCADF demorou demais para responder. Tente novamente — o portal pode estar sobrecarregado.';
    return msg.length > 200 ? msg.substring(0, 200) + '...' : msg;
  };

  const pollarNotas = async (plano, startTime) => {
    const MAX = 25; // 25 × 30s = 12.5 min
    for (let i = 0; i < MAX; i++) {
      await new Promise(r => setTimeout(r, 30000));
      try {
        const check = await api.get(`/avaliacoes/${plano.id}`);
        const d = check.data || {};
        if (d.agente_notas_exportadas_em && new Date(d.agente_notas_exportadas_em) >= new Date(startTime - 5000)) {
          setPlanos(prev => prev.map(p => p.id === plano.id
            ? { ...p, agente_notas_exportadas_em: d.agente_notas_exportadas_em, agente_executando_desde: null }
            : p
          ));
          const r = (() => { try { return JSON.parse(d.agente_notas_resultado_json || '{}'); } catch { return {}; } })();
          setModalResultado({
            tipo: 'sucesso', titulo: 'Notas exportadas!', plano,
            totalPreenchidos: r.totalPreenchidos ?? null,
            totalErros: r.totalErros ?? null,
            alunosNaoEncontrados: r.alunosNaoEncontrados || [],
            alunosDesabilitados: r.alunosDesabilitados || [],
          });
          setExportandoId(null);
          return;
        }
        if (!d.agente_executando_desde && i >= 1) {
          const erroMsg = traduzirErroAgente(d.agente_ultimo_erro);
          setModalResultado({ tipo: 'erro', titulo: 'Exportação falhou', texto: erroMsg });
          setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, agente_executando_desde: null } : p));
          setExportandoId(null);
          return;
        }
      } catch { /* ignora */ }
    }
    setModalResultado({ tipo: 'erro', titulo: 'Tempo esgotado', texto: 'A exportação demorou mais que o esperado.\nAtualize a página para verificar.' });
    setExportandoId(null);
  };

  // ── Exportar notas ──────────────────────────────────────────────────────────
  const handleExportarNotas = async (plano) => {
    setModalConfirm(null);
    setModalResultado(null);
    setExportandoId(plano.id);
    // Lock otimista na UI
    setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, agente_executando_desde: new Date().toISOString() } : p));

    const startTime = Date.now();
    try {
      const resp = await api.post(`/agente-planos/${plano.id}/exportar-notas`);
      const d    = resp.data || {};

      // ── 202 / running: Playwright rodando em background → polling obrigatório
      // NUNCA mostrar sucesso com base só na resposta inicial — sempre esperar o banco confirmar
      if (resp.status === 202 || d.status === 'running' || resp.status === 200) {
        // Se o backend retornou 200 com ok:true mas status:running, é o 202 chegando como 200 via proxy
        if (d.status === 'running' || resp.status === 202) {
          await pollarNotas(plano, startTime);
          return;
        }
        // 200 síncrono real (não deve ocorrer com backend v2, mas tratado por segurança)
        if (d.ok && !d.status) {
          setPlanos(prev => prev.map(p => p.id === plano.id
            ? { ...p, agente_notas_exportadas_em: new Date().toISOString(), agente_executando_desde: null }
            : p
          ));
          setModalResultado({
            tipo: 'sucesso', titulo: 'Exportação concluída!', plano,
            totalPreenchidos: d.totalPreenchidos, totalErros: d.totalErros,
            alunosNaoEncontrados: d.alunosNaoEncontrados || [], alunosDesabilitados: d.alunosDesabilitados || [],
          });
          setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, agente_executando_desde: null } : p));
          setExportandoId(null);
          return;
        }
        // Qualquer outro 200 → polling (segurança)
        await pollarNotas(plano, startTime);
        return;
      }
      setModalResultado({ tipo: 'erro', titulo: 'Exportação não concluída', texto: d.message || d.error || 'Resposta inesperada do servidor.' });
      setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, agente_executando_desde: null } : p));
      setExportandoId(null);

    } catch (err) {
      const codigo = err.response?.data?.codigo;
      if (codigo === 'SEM_CREDENCIAIS' || codigo === 'CREDENCIAIS_CORROMPIDAS') {
        setModalSemCred(true);
      } else if (codigo === 'EM_EXECUCAO') {
        setModalResultado({ tipo: 'erro', titulo: 'Já em execução', texto: 'As notas já estão sendo exportadas. Aguarde.' });
      } else if (!err.response) {
        // Conexão caiu mas Playwright segue — polling
        await pollarNotas(plano, startTime);
        return;
      } else {
        setModalResultado({ tipo: 'erro', titulo: 'Erro na exportação', texto: err.response?.data?.error || err.response?.data?.message || 'Erro ao exportar notas.' });
      }
      setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, agente_executando_desde: null } : p));
      setExportandoId(null);
    }
  };

  // ── Reexportar notas (com modal de confirmação) ─────────────────────────────
  const handleReexportarNotas = (plano) => {
    const itens = Array.isArray(plano.itens) ? plano.itens : JSON.parse(plano.itens || '[]');
    const bimestral = itens.find(i => i.fixo_direcao);
    setModalReexportarNotas({
      plano,
      atividade: bimestral?.atividade || 'Prova Bimestral',
      onConfirmar: () => handleExportarNotas(plano),
    });
  };



  // ── Ver relatório da última exportação ───────────────────────
  const handleVerRelatorio = async (plano) => {
    try {
      const resp = await api.get(`/avaliacoes/${plano.id}`);
      const d    = resp.data || {};
      const r    = d.agente_notas_resultado || {};

      setModalResultado({
        tipo:  "sucesso",
        titulo: "Relatório da Última Exportação",
        plano,
        totalPreenchidos:     r.totalPreenchidos     ?? null,
        totalErros:           r.totalErros           ?? null,
        alunosNaoEncontrados: r.alunosNaoEncontrados || [],
        alunosDesabilitados:  r.alunosDesabilitados  || [],
        exportadoEm:          d.agente_notas_exportadas_em,
        isHistorico:          true,
      });
    } catch {
      setModalResultado({
        tipo:  "erro",
        titulo: "Relatório indisponível",
        texto:  "Não foi possível carregar o histórico. Tente novamente.",
      });
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <div style={{
        background: "linear-gradient(135deg, #0f1629 0%, #1a1f3a 50%, #0f1629 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "36px 32px 28px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glow decorativo teal */}
        <div style={{
          position: "absolute", top: -60, right: -40, width: 300, height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -40, width: 260, height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,145,178,0.1), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, position: "relative" }}>
          <div>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <BoltIcon style={{ width: 14, color: "#eab308" }} />
              <span style={{ fontSize: "0.7rem", color: "#eab308", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Agente EDUCA
              </span>
              <span style={{ fontSize: "0.7rem", color: "#334155" }}>/</span>
              <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Notas</span>
              <span style={{
                marginLeft: 8, fontSize: "0.6rem", fontWeight: 800,
                padding: "2px 10px", borderRadius: 99,
                background: "linear-gradient(135deg, #10b981, #0891b2)",
                color: "#fff", letterSpacing: "0.5px",
              }}>
                ETAPA 2
              </span>
            </div>

            <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.5px", margin: 0 }}>
              Notas — Exportar para EDUCADF
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 8, maxWidth: 560, lineHeight: 1.6 }}>
              O Agente migra as <strong style={{ color: "#34d399" }}>notas</strong> da coluna{" "}
              <strong style={{ color: "#a78bfa" }}>Avaliação Bimestral</strong> para o portal EDUCADF.
              Pré-requisito: a <strong style={{ color: "#e2e8f0" }}>estrutura</strong> deve ter sido exportada na Etapa 1.
            </p>
          </div>

          {/* Métricas */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "Com col. Bimestral", value: planosComBimestral.length,  color: "#a78bfa" },
              { label: "Prontos p/ exportar",value: planosProntos.length,        color: "#34d399" },
              { label: "Notas exportadas",   value: planosExportados.length,      color: "#3b82f6" },
            ].map(m => (
              <div key={m.label} style={{
                padding: "14px 18px", borderRadius: 16, minWidth: 100, textAlign: "center",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(8px)",
              }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ CHIP ETAPA ═══════════════════════════ */}
      <div style={{
        margin: "24px 32px 0",
        padding: "14px 20px", borderRadius: 16,
        background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(8,145,178,0.06))",
        border: "1px solid rgba(16,185,129,0.2)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <SparklesIcon style={{ width: 20, color: "#34d399", flexShrink: 0 }} />
        <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6 }}>
          <strong style={{ color: "#34d399" }}>Etapa 2 de N:</strong>{" "}
          Exportação das <strong style={{ color: "#e2e8f0" }}>notas</strong> — o Agente preenche no EDUCADF
          os valores da Avaliação Bimestral de cada plano. Somente planos com a{" "}
          <strong style={{ color: "#22c55e" }}>estrutura exportada (Etapa 1)</strong>{" "}
          podem ter suas notas sincronizadas.
        </div>
      </div>

      {/* ═══════════════════════════ FILTROS ═══════════════════════════ */}
      <div style={{ margin: "20px 32px 0", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Linha 1: Status */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "todos",      label: "Todos",      count: planosPorBimestre.length },
            { key: "prontos",    label: "Prontos",    count: planosProntos.length },
            { key: "exportados", label: "Exportados", count: planosExportados.length },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 10, fontWeight: 700, fontSize: "0.78rem",
                cursor: "pointer", transition: "all 0.2s",
                border: filtro === f.key ? "1.5px solid #10b981" : "1.5px solid rgba(255,255,255,0.12)",
                background: filtro === f.key
                  ? "linear-gradient(135deg, #10b981, #0891b2)"
                  : "rgba(255,255,255,0.06)",
                color: filtro === f.key ? "#fff" : "#94a3b8",
                boxShadow: filtro === f.key ? "0 4px 14px rgba(16,185,129,0.3)" : "none",
              }}
            >
              {f.label}
              <span style={{
                background: filtro === f.key ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                color: filtro === f.key ? "#fff" : "#64748b",
                borderRadius: 6, padding: "1px 7px", fontSize: "0.72rem", fontWeight: 800,
              }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Linha 2: Bimestre */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{
            fontSize: "0.65rem", color: "#475569", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4,
          }}>Bimestre:</span>
          {[
            { key: "todos", label: "Todos os Bimestres", short: "Todos", color: "#10b981", total: planosComBimestral.length },
            { key: "1",     label: "1° Bimestre",         short: "1° Bim", color: "#6366f1", total: contagemPorBim["1"] || 0 },
            { key: "2",     label: "2° Bimestre",         short: "2° Bim", color: "#8b5cf6", total: contagemPorBim["2"] || 0 },
            { key: "3",     label: "3° Bimestre",         short: "3° Bim", color: "#ec4899", total: contagemPorBim["3"] || 0 },
            { key: "4",     label: "4° Bimestre",         short: "4° Bim", color: "#f59e0b", total: contagemPorBim["4"] || 0 },
          ].map(b => {
            const ativo = filtroBimestre === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setFiltroBimestre(b.key)}
                title={b.label}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 13px", borderRadius: 9, fontWeight: 700, fontSize: "0.74rem",
                  cursor: "pointer", transition: "all 0.18s",
                  border: `1.5px solid ${ativo ? b.color : "rgba(255,255,255,0.15)"}`,
                  background: ativo
                    ? `linear-gradient(135deg, ${b.color}33, ${b.color}1a)`
                    : "rgba(255,255,255,0.05)",
                  color: ativo ? b.color : "#94a3b8",
                  boxShadow: ativo ? `0 3px 12px ${b.color}40` : "none",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: ativo ? b.color : "rgba(255,255,255,0.25)",
                  boxShadow: ativo ? `0 0 6px ${b.color}` : "none",
                  transition: "all 0.18s",
                }} />
                {b.short}
                <span style={{
                  background: ativo ? `${b.color}30` : "rgba(255,255,255,0.1)",
                  color: ativo ? b.color : "#64748b",
                  borderRadius: 5, padding: "1px 6px", fontSize: "0.68rem", fontWeight: 800,
                  minWidth: 18, textAlign: "center",
                }}>{b.total}</span>
              </button>
            );
          })}
        </div>
      </div>
      </div>

      {/* ═══════════════════════════ LISTA ═══════════════════════════════ */}
      <div style={{ padding: "20px 32px 40px" }}>
        {carregando ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, flexDirection: "column", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              border: "3px solid rgba(16,185,129,0.2)", borderTopColor: "#10b981",
              animation: "spin 0.9s linear infinite",
            }} />
            <span style={{ color: "#475569", fontSize: "0.85rem", fontWeight: 600 }}>Carregando planos...</span>
          </div>
        ) : planosFiltrados.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: "rgba(255,255,255,0.02)", borderRadius: 20,
            border: "1px dashed rgba(255,255,255,0.08)",
          }}>
            <ClipboardDocumentListIcon style={{ width: 48, color: "#334155", margin: "0 auto 14px" }} />
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>
              {filtro === "exportados" ? "Nenhuma nota foi exportada ainda." :
               filtro === "prontos"    ? "Nenhum plano pronto para exportar notas." :
               "Nenhum Plano de Avaliação com coluna Bimestral encontrado."}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#334155" }}>
              Para exportar notas, primeiro exporte a{" "}
              <strong style={{ color: "#a78bfa" }}>estrutura</strong> na Etapa 1.
            </div>
          </div>
        ) : (
          planosFiltrados.map(plano => (
            <NotaCard
              key={plano.id}
              plano={plano}
              exportandoId={exportandoId}
              onExportar={(p) => setModalConfirm(p)}
              onReexportar={handleReexportarNotas}
              onVerRelatorio={handleVerRelatorio}
            />
          ))
        )}
      </div>

      {/* ═══════════════ MODAL CONFIRMAR EXPORT ═══════════════════════ */}
      {modalConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setModalConfirm(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480, margin: "0 16px",
              borderRadius: 24, overflow: "hidden",
              background: "linear-gradient(160deg, #1a1f35 0%, #12172a 100%)",
              border: "1px solid rgba(16,185,129,0.25)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #059669, #0891b2)",
              padding: "26px 32px 22px", textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
                background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem",
              }}>📊</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#fff" }}>
                Exportar Notas para EDUCADF
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(167,243,208,0.85)", marginTop: 6 }}>
                As notas da <strong style={{ color: "#a7f3d0" }}>Avaliação Bimestral</strong> serão enviadas
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Disciplina", value: modalConfirm.disciplina },
                  { label: "Turma",      value: modalConfirm.turmas },
                  { label: "Bimestre",   value: modalConfirm.bimestre },
                  { label: "Status",     value: modalConfirm.status },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: "10px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#e2e8f0" }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{
                padding: "12px 16px", borderRadius: 12, marginBottom: 18,
                background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)",
                fontSize: "0.78rem", color: "#6ee7b7", lineHeight: 1.6,
              }}>
                <strong style={{ color: "#34d399" }}>📊 O que será exportado:</strong><br />
                As <strong style={{ color: "#e2e8f0" }}>notas</strong> da coluna Avaliação Bimestral serão preenchidas no EDUCADF
                para <strong style={{ color: "#e2e8f0" }}>{modalConfirm.turmas}</strong> · <strong style={{ color: "#e2e8f0" }}>{modalConfirm.bimestre}</strong>.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setModalConfirm(null)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8", cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleExportarNotas(modalConfirm)}
                  style={{
                    flex: 2, padding: "12px", borderRadius: 12, fontWeight: 800, fontSize: "0.88rem",
                    background: "linear-gradient(135deg, #059669, #0891b2)",
                    border: "none", color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(5,150,105,0.35)",
                  }}
                >
                  <RocketLaunchIcon style={{ width: 16 }} />
                  Confirmar Exportação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL RESULTADO (premium) ═══════════════════════ */}
      {modalResultado && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(14px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
            animation: "fadeIn 0.25s ease",
          }}
          onClick={() => setModalResultado(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: modalResultado.tipo === "sucesso" ? 520 : 420,
              borderRadius: 24, overflow: "hidden",
              background: "linear-gradient(160deg, #1a1f35 0%, #12172a 100%)",
              border: `1px solid ${
                modalResultado.tipo === "sucesso" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"
              }`,
              boxShadow: "0 40px 100px rgba(0,0,0,0.75)",
              animation: "slideDown 0.3s ease",
            }}
          >
            {/* ─ Header ─ */}
            <div style={{
              background: modalResultado.isHistorico
                ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
                : modalResultado.tipo === "sucesso"
                  ? "linear-gradient(135deg, #059669 0%, #0891b2 100%)"
                  : "linear-gradient(135deg, #dc2626, #b91c1c)",
              padding: "28px 28px 22px", textAlign: "center",
            }}>
              <div style={{ fontSize: "2.8rem", marginBottom: 10 }}>
                {modalResultado.isHistorico ? "📋" : modalResultado.tipo === "sucesso" ? "✅" : "❌"}
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
                {modalResultado.titulo}
              </div>
              {modalResultado.plano && (
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                  {modalResultado.plano.disciplina} · {modalResultado.plano.turmas} · {modalResultado.plano.bimestre}
                </div>
              )}
              {modalResultado.exportadoEm && (
                <div style={{
                  fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", marginTop: 4,
                  fontStyle: "italic",
                }}>
                  Exportado em {new Date(modalResultado.exportadoEm).toLocaleString("pt-BR")}
                </div>
              )}
            </div>

            <div style={{ padding: "24px 26px" }}>

              {/* ── Resultado de sucesso com métricas ── */}
              {modalResultado.tipo === "sucesso" && (
                <>
                  {/* Métricas */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    <div style={{
                      padding: "14px", borderRadius: 14, textAlign: "center",
                      background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.25)",
                    }}>
                      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#34d399", lineHeight: 1 }}>
                        {modalResultado.totalPreenchidos ?? "–"}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#6ee7b7", fontWeight: 700, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Notas exportadas
                      </div>
                    </div>
                    <div style={{
                      padding: "14px", borderRadius: 14, textAlign: "center",
                      background: (modalResultado.totalErros ?? 0) > 0 ? "rgba(245,158,11,0.09)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${(modalResultado.totalErros ?? 0) > 0 ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
                    }}>
                      <div style={{ fontSize: "2rem", fontWeight: 900, color: (modalResultado.totalErros ?? 0) > 0 ? "#fbbf24" : "#94a3b8", lineHeight: 1 }}>
                        {modalResultado.totalErros ?? "–"}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: (modalResultado.totalErros ?? 0) > 0 ? "#fde68a" : "#475569", fontWeight: 700, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Não encontrados
                      </div>
                    </div>
                  </div>

                  {/* ── Alunos não encontrados (dessincronização) ── */}
                  {modalResultado.alunosNaoEncontrados?.length > 0 && (
                    <div style={{
                      borderRadius: 14, overflow: "hidden",
                      border: "1px solid rgba(245,158,11,0.3)",
                      marginBottom: 16,
                    }}>
                      {/* Header do aviso */}
                      <div style={{
                        background: "linear-gradient(135deg, rgba(217,119,6,0.2), rgba(180,83,9,0.15))",
                        padding: "12px 16px",
                        display: "flex", alignItems: "center", gap: 10,
                        borderBottom: "1px solid rgba(245,158,11,0.2)",
                      }}>
                        <ExclamationTriangleIcon style={{ width: 18, color: "#f59e0b", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fbbf24" }}>
                            Dessincronização detectada
                          </div>
                          <div style={{ fontSize: "0.66rem", color: "#fde68a", marginTop: 2 }}>
                            {modalResultado.alunosNaoEncontrados.length} aluno(s) do EDUCA.MELHOR não encontrado(s) no EDUCADF
                          </div>
                        </div>
                      </div>

                      {/* Lista de alunos */}
                      <div style={{
                        background: "rgba(0,0,0,0.2)",
                        padding: "10px 14px",
                        maxHeight: 160, overflowY: "auto",
                      }}>
                        {modalResultado.alunosNaoEncontrados.map((a, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 0",
                            borderBottom: i < modalResultado.alunosNaoEncontrados.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          }}>
                            <UserGroupIcon style={{ width: 14, color: "#f59e0b", flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e2e8f0" }}>{a.nome}</div>
                              {a.re && <div style={{ fontSize: "0.62rem", color: "#64748b" }}>RE: {a.re}</div>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Explicação */}
                      <div style={{
                        padding: "10px 14px",
                        background: "rgba(245,158,11,0.04)",
                        borderTop: "1px solid rgba(245,158,11,0.1)",
                      }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <InformationCircleIcon style={{ width: 14, color: "#64748b", flexShrink: 0, marginTop: 1 }} />
                          <div style={{ fontSize: "0.68rem", color: "#64748b", lineHeight: 1.6 }}>
                            Esses alunos podem ter sido transferidos ou matriculados recentemente.
                            O secretário precisa sincronizar o EDUCA.MELHOR com o EDUCADF para que as notas
                            sejam exportadas nas próximas execuções.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Alunos ausentes (campo desabilitado) ── */}
                  {modalResultado.alunosDesabilitados?.length > 0 && (
                    <div style={{
                      borderRadius: 14, overflow: "hidden",
                      border: "1px solid rgba(59,130,246,0.3)",
                      marginBottom: 12,
                    }}>
                      <div style={{
                        background: "linear-gradient(135deg, rgba(29,78,216,0.18), rgba(37,99,235,0.12))",
                        padding: "11px 16px",
                        display: "flex", alignItems: "center", gap: 10,
                        borderBottom: "1px solid rgba(59,130,246,0.2)",
                      }}>
                        <InformationCircleIcon style={{ width: 17, color: "#60a5fa", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#93c5fd" }}>
                            Ausentes no dia da avaliação
                          </div>
                          <div style={{ fontSize: "0.64rem", color: "#bfdbfe", marginTop: 1 }}>
                            {modalResultado.alunosDesabilitados.length} aluno(s) sem presença registrada — campo bloqueado pelo EDUCADF
                          </div>
                        </div>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.15)", padding: "8px 14px" }}>
                        {modalResultado.alunosDesabilitados.map((a, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "5px 0",
                            borderBottom: i < modalResultado.alunosDesabilitados.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          }}>
                            <span style={{ fontSize: "0.68rem" }}>🛋️</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#cbd5e1" }}>{a.nome}</div>
                              {a.re && <div style={{ fontSize: "0.6rem", color: "#475569" }}>RE: {a.re}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensagem de sucesso full (sem nenhum problema) */}
                  {!modalResultado.alunosNaoEncontrados?.length && !modalResultado.alunosDesabilitados?.length && (
                    <div style={{
                      padding: "12px 16px", borderRadius: 12, marginBottom: 16,
                      background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)",
                      fontSize: "0.8rem", color: "#6ee7b7", lineHeight: 1.6,
                    }}>
                      ✅ Todas as notas foram exportadas com sucesso para o EDUCADF!
                    </div>
                  )}
                </>
              )}

              {/* ── Resultado de erro ── */}
              {modalResultado.tipo === "erro" && (
                <div style={{
                  padding: "14px 16px", borderRadius: 14, marginBottom: 16,
                  background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                  fontSize: "0.85rem", color: "#fca5a5",
                  lineHeight: 1.65, whiteSpace: "pre-line",
                }}>
                  {modalResultado.texto}
                </div>
              )}

              <button
                onClick={() => setModalResultado(null)}
                style={{
                  width: "100%", padding: "13px", borderRadius: 13,
                  background: modalResultado.isHistorico
                    ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                    : modalResultado.tipo === "sucesso"
                      ? "linear-gradient(135deg, #059669, #0891b2)"
                      : "linear-gradient(135deg, #dc2626, #b91c1c)",
                  border: "none", color: "#fff",
                  fontWeight: 800, fontSize: "0.92rem", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
                  letterSpacing: "0.2px",
                }}
              >
                {modalResultado.isHistorico ? "Fechar relatório" : modalResultado.tipo === "sucesso" ? "Ótimo, fechar" : "Entendido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL REEXPORTAR NOTAS ══════════════ */}
      {modalReexportarNotas && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 350, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }} onClick={() => setModalReexportarNotas(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, margin: '0 16px', borderRadius: 24, overflow: 'hidden', background: 'linear-gradient(160deg, #0d1f14 0%, #091510 100%)', border: '1px solid rgba(16,185,129,0.35)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '28px 28px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 10 }}>🔄</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>Reexportar Notas?</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(167,243,208,0.85)', marginTop: 6 }}>As notas já foram exportadas anteriormente</div>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ padding: '16px 18px', borderRadius: 16, marginBottom: 18, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>📋 Plano selecionado</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Disciplina',   value: modalReexportarNotas.plano.disciplina },
                    { label: 'Turma',        value: modalReexportarNotas.plano.turmas },
                    { label: 'Bimestre',     value: modalReexportarNotas.plano.bimestre },
                    { label: 'Procedimento', value: modalReexportarNotas.atividade },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#e2e8f0' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.82rem', color: '#6ee7b7', lineHeight: 1.65 }}>
                O Agente irá <strong style={{ color: '#a7f3d0' }}>sobrescrever</strong> as notas já lançadas no EDUCADF.<br />
                Certifique-se de que as notas no sistema estão corretas antes de continuar.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setModalReexportarNotas(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => { modalReexportarNotas.onConfirmar(); setModalReexportarNotas(null); }} style={{ flex: 2, padding: '12px', borderRadius: 12, fontWeight: 800, fontSize: '0.88rem', background: 'linear-gradient(135deg, #059669, #047857)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(5,150,105,0.35)' }}>
                  <ArrowPathIcon style={{ width: 16 }} />
                  Confirmar Reexportação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL SEM CREDENCIAIS ══════════════════════════ */}

      {modalSemCred && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 400,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setModalSemCred(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 440, margin: "0 16px",
              borderRadius: 24, overflow: "hidden",
              background: "linear-gradient(160deg, #1c1a10 0%, #12100a 100%)",
              border: "1px solid rgba(245,158,11,0.3)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            }}
          >
            <div style={{
              background: "linear-gradient(135deg, #d97706, #b45309)",
              padding: "26px 28px 20px", textAlign: "center",
            }}>
              <div style={{ fontSize: "2.4rem", marginBottom: 10 }}>🔐</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff" }}>
                Credenciais EDUCADF não configuradas
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(254,243,199,0.8)", marginTop: 6 }}>
                O Agente precisa das suas credenciais para agir em seu nome
              </div>
            </div>
            <div style={{ padding: "22px 24px" }}>
              <div style={{
                padding: "14px 16px", borderRadius: 14, marginBottom: 18,
                background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
                fontSize: "0.82rem", color: "#fde68a", lineHeight: 1.65,
              }}>
                <strong style={{ color: "#fbbf24" }}>O que precisa fazer:</strong><br />
                Acesse <strong style={{ color: "#fff" }}>Agente EDUCA → Credenciais</strong>, informe
                seu usuário e senha do portal <strong style={{ color: "#fff" }}>educadf.se.df.gov.br</strong>
                e clique em "Salvar e Conectar".
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setModalSemCred(false)}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 12,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                  }}
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setModalSemCred(false);
                    const base = window.location.pathname.replace(/\/agente-educa.*/, "");
                    window.location.href = `${window.location.origin}${base}/agente-educa/credenciais`;
                  }}
                  style={{
                    flex: 2, padding: "12px", borderRadius: 12,
                    background: "linear-gradient(135deg, #d97706, #b45309)",
                    border: "none", color: "#fff",
                    fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(180,83,9,0.4)",
                  }}
                >
                  <LockClosedIcon style={{ width: 16 }} />
                  Configurar Credenciais
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
