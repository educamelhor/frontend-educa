import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";

/**
 * ModalAdicionarConteudo.jsx
 * ---------------------------------------------------------------------
 * Modal (mock) para adicionar um novo item na lista de Conteúdos.
 * - Cabeçalho com contexto: "Disciplina • Bimestre • Turma • Ano"
 * - 3 cards (fonte): BNCC | SEEDF | CEF04-CCMDF
 * - 3 listboxes (mock): Tema | Conteúdo | Objetivo
 * - Rodapé: VOLTAR | SALVAR
 * ---------------------------------------------------------------------
 */

export default function ModalAdicionarConteudo({
  open,
  onClose,
  onSave,
  contextoLabel,
  contextoObj,
}) {
  const isOpen = !!open;

  // ✅ Fluxo oficial:
  // TEMA (BNCC) -> CONTEÚDO (SEEDF) -> OBJETIVO (Professor, opcional)
  const [temaId, setTemaId] = useState(null); // bncc_unidade_tematica_id
  const [temaTexto, setTemaTexto] = useState("");

  const [conteudoId, setConteudoId] = useState(null); // seedf_conteudo_id
  const [conteudoTexto, setConteudoTexto] = useState("");

  const [objetivoTexto, setObjetivoTexto] = useState(""); // opcional (pode ficar vazio)

  // =========================================================
  // 3.2) Auto-preenchimento (inteligência assistida)
  // =========================================================
  const [autoFill, setAutoFill] = useState(true);


  // Reseta campos quando abrir
  useEffect(() => {
    if (isOpen) {
      setTemaId(null);
      setTemaTexto("");
      setConteudoId(null);
      setConteudoTexto("");
      setObjetivoTexto("");
    }
  }, [isOpen]);

  // =========================================================
  // PASSO 4.4 — consumir API real (fallback: mock)
  // ---------------------------------------------------------
  // Endpoint: GET /api/conteudos/admin/contexto/opcoes
  // Params esperados (no seu backend atual): disciplina_id, ano_id
  // =========================================================
  // ✅ Contrato explícito: o modal recebe o contexto como OBJETO (sem parse de string)
  // contextoObj: { disciplina_id, disciplina_nome, serie, ano_letivo, bimestre, ... }
  const ctx = useMemo(() => {
    const disciplina_id = Number(contextoObj?.disciplina_id);
    const serie = String(contextoObj?.serie || "").trim();

    return {
      disciplina_id: Number.isFinite(disciplina_id) ? disciplina_id : null,
      serie: serie || "",
      disciplina_nome: String(contextoObj?.disciplina_nome || "").trim(),
      serie_label: String(contextoObj?.serie_label || "").trim(),
      ano_letivo: contextoObj?.ano_letivo != null ? Number(contextoObj.ano_letivo) : null,
      bimestre: contextoObj?.bimestre != null ? Number(contextoObj.bimestre) : null,
      bimestre_label: String(contextoObj?.bimestre_label || "").trim(),
    };
  }, [contextoObj]);

  const [apiTemas, setApiTemas] = useState([]); // [{id,texto}]
  const [apiConteudos, setApiConteudos] = useState([]); // [{id,texto}]

  // =========================================================
  // Labels dinâmicos: BNCC x Disciplina interna (Geometria)
  // =========================================================
  const isGeometria = useMemo(() => {
    const nome = String(ctx?.disciplina_nome || "").trim().toLowerCase();
    return nome === "geometria" || nome.includes("geometria");
  }, [ctx?.disciplina_nome]);

  const temaTitulo = isGeometria
    ? `Temas da disciplina (${ctx?.disciplina_nome || "Geometria"})`
    : "Temas BNCC";

  const temaCampoLabel = isGeometria
    ? `TEMA (${ctx?.disciplina_nome || "Geometria"})`
    : "TEMA (BNCC)";

  const temaCarregandoLabel = isGeometria
    ? `Carregando Temas da disciplina (${ctx?.disciplina_nome || "Geometria"})...`
    : "Carregando Temas BNCC...";

  const temaAusenciaTitulo = isGeometria
    ? "Temas da disciplina ausentes para este contexto"
    : "Temas BNCC ausentes para este contexto";

  const [apiLoading, setApiLoading] = useState(false);

  // ✅ Robustez: distinguir "erro" vs "vazio"
  const [apiErro, setApiErro] = useState(null); // string | null
  const [reloadKey, setReloadKey] = useState(0);

  // Carrega TEMAS reais assim que o modal abrir (fallback: mantém mock)

  // 1) Ao abrir: carrega TEMAS (BNCC) e CONTEÚDOS (SEEDF) do contexto (sem filtro por tema)
  useEffect(() => {
    if (!isOpen) return;

    const disciplina_id = ctx?.disciplina_id;
    const serie = String(ctx?.serie || "").trim();

    // Se contexto incompleto, não tenta bater API
    if (!Number.isFinite(disciplina_id) || !serie) {
      setApiErro(null);
      setApiTemas([]);
      setApiConteudos([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setApiErro(null);
        setApiLoading(true);

        const { data } = await api.get("/conteudos/admin/contexto/opcoes", {
          params: { disciplina_id, serie },
        });

        if (cancelled) return;

        const temas = Array.isArray(data?.temas) ? data.temas : [];
        const conteudos = Array.isArray(data?.conteudos) ? data.conteudos : [];

        setApiTemas(temas);
        setApiConteudos(conteudos);
        setApiErro(null);
      } catch (e) {
        if (!cancelled) {
          setApiTemas([]);
          setApiConteudos([]);
          setApiErro("Não foi possível carregar as opções do contexto (BNCC/SEEDF). Tente novamente.");
        }
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, ctx, reloadKey]);

  // 2) Quando selecionar TEMA (BNCC): recarrega CONTEÚDOS (SEEDF) filtrados por tema (se a API suportar)
  useEffect(() => {
    if (!isOpen) return;

    const disciplina_id = ctx?.disciplina_id;
    const serie = String(ctx?.serie || "").trim();

    if (!Number.isFinite(disciplina_id) || !serie) return;
    if (!Number.isFinite(Number(temaId))) return;

    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get("/conteudos/admin/contexto/opcoes", {
          params: { disciplina_id, serie, bncc_unidade_tematica_id: temaId },
        });

        if (cancelled) return;

        const conteudos = Array.isArray(data?.conteudos) ? data.conteudos : [];
        setApiConteudos(conteudos);
      } catch (e) {
        // aqui não “derruba” o modal; apenas mantém a lista vazia e deixa o aviso de ausência
        if (!cancelled) setApiConteudos([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, ctx, temaId]);

  // Encadeamento oficial:
  // - Mudou o TEMA (BNCC): reseta CONTEÚDO (SEEDF) e OBJETIVO (Professor)
  useEffect(() => {
    setConteudoId(null);
    setConteudoTexto("");
    setObjetivoTexto("");
  }, [temaId]);

  // - Mudou o CONTEÚDO (SEEDF): reseta OBJETIVO (Professor)
  useEffect(() => {
    setObjetivoTexto("");
  }, [conteudoId]);

  // ✅ Catálogo oficial (sem mock e sem "fonte"):
  // - TEMA (BNCC) vem de apiTemas
  // - CONTEÚDO (SEEDF) vem de apiConteudos (e pode ser filtrado por temaId)
  // - OBJETIVO é texto livre (opcional)

  // (removido) AutoFill antigo baseado em tema/conteudo/objetivo mock

  const canSave =
    Number.isFinite(Number(temaId)) &&
    Number.isFinite(Number(conteudoId)) &&
    String(temaTexto).trim().length > 0 &&
    String(conteudoTexto).trim().length > 0;
  // objetivoTexto é opcional (pode ser vazio)

  // ✅ PASSO 5.4.1 — Estado VISUAL das etapas (não altera fluxo)
  // Regra: ✅ só quando houve seleção real (id > 0). Evita o bug: Number(null) === 0.
  const etapa1Ok = temaId != null && temaId !== "" && Number.isFinite(Number(temaId)) && Number(temaId) > 0;
  const etapa2Ok = conteudoId != null && conteudoId !== "" && Number.isFinite(Number(conteudoId)) && Number(conteudoId) > 0;
  const etapa3Ok = String(objetivoTexto || "").trim().length > 0; // opcional

  const etapaAtual = !etapa1Ok ? 1 : !etapa2Ok ? 2 : 3;



  const cardBase =
    "relative rounded-2xl border shadow-md px-5 py-4 cursor-pointer transition transform hover:-translate-y-[1px] hover:shadow-lg";
  const cardTitle = "text-lg font-extrabold tracking-tight";
  const cardSub = "mt-1 text-xs opacity-90";

  const fonteTheme = (k) => {
    if (k === "BNCC")
      return "bg-gradient-to-br from-blue-600 to-blue-400 text-white border-blue-200";
    if (k === "SEEDF")
      return "bg-gradient-to-br from-emerald-600 to-emerald-400 text-white border-emerald-200";
    return "bg-gradient-to-br from-orange-600 to-orange-400 text-white border-orange-200";
  };

  const ringIfActive = (k) => (fonte === k ? "ring-2 ring-white/90" : "");

  const handleSave = () => {
    if (!canSave) return;

    onSave?.({
      bncc_unidade_tematica_id: Number(temaId),
      tema: String(temaTexto).trim(),

      seedf_conteudo_id: Number(conteudoId),
      conteudo: String(conteudoTexto).trim(),

      // opcional:
      objetivo: String(objetivoTexto).trim() || null,
    });
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* backdrop (somente visual) */}
      <div
        className="absolute inset-0 bg-slate-900/40"
        aria-hidden="true"
      />

      {/* modal wrapper (captura clique fora) */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onMouseDown={(e) => {
          // ✅ fecha ao clicar fora APENAS quando o salvar está desativado
          if (e.target === e.currentTarget && !canSave) {
            onClose?.();
          }
        }}
      >
        {/* ✅ Modal com altura máxima + layout em coluna (Header / Body scroll / Footer fixo) */}
        <div className="w-full max-w-5xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">

          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xl font-extrabold text-blue-900">
                  Adicionar conteúdo
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Contexto:{" "}
                  <span className="font-bold text-slate-900">
                    {contextoLabel || "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
              >
                Fechar
              </button>
            </div>
          </div>

          {/* Body (scroll) */}
          <div className="p-6 flex-1 overflow-y-auto">





            {/* ✅ PASSO 5.4.1 — Stepper premium (visual): ícones + etapa atual */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <div className="text-sm font-extrabold text-slate-900">
                  Adição do item — 3 etapas
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-600">
                  Preencha na ordem: Tema → Conteúdo → Objetivo (opcional).
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* ETAPA 1 */}
                  <div
                    className={`rounded-2xl border px-4 py-3 transition ${
                      etapaAtual === 1
                        ? "border-blue-500 bg-blue-300 ring-2 ring-blue-400"
                        : "border-blue-400 bg-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold text-blue-900">ETAPA 1</div>
                      <div className="text-sm">
                        {etapa1Ok ? "✅" : ""}
                      </div>
                    </div>

                    <div className="mt-1 text-sm font-extrabold text-blue-900">TEMA</div>
                    <div className="text-xs font-semibold text-blue-800/80">
                      Catálogo BNCC
                    </div>
                  </div>

                  {/* ETAPA 2 */}
                  <div
                    className={`rounded-2xl border px-4 py-3 transition ${
                      etapaAtual === 2
                        ? "border-emerald-500 bg-emerald-300 ring-2 ring-emerald-400"
                        : "border-emerald-400 bg-emerald-300"
                    } ${!etapa1Ok ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold text-emerald-900">ETAPA 2</div>
                      <div className="text-sm">
                        {etapa2Ok ? "✅" : ""}
                      </div>
                    </div>

                    <div className="mt-1 text-sm font-extrabold text-emerald-900">CONTEÚDO</div>
                    <div className="text-xs font-semibold text-emerald-800/80">
                      Catálogo SEEDF
                    </div>
                  </div>

                  {/* ETAPA 3 */}
                  <div
                    className={`rounded-2xl border px-4 py-3 transition ${
                      etapaAtual === 3
                        ? "border-violet-500 bg-violet-300 ring-2 ring-violet-400"
                        : "border-violet-400 bg-violet-300"
                    } ${!etapa2Ok ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold text-violet-900">ETAPA 3</div>
                      <div className="text-sm">
                        {!etapa2Ok ? "" : etapa3Ok ? "✅" : "📝"}
                      </div>
                    </div>

                    <div className="mt-1 text-sm font-extrabold text-violet-900">OBJETIVO</div>
                    <div className="text-xs font-semibold text-violet-800/80">
                      Texto livre (opcional)
                    </div>
                  </div>
                </div>
              </div>
            </div>








            {/* Listboxes */}
            <div className="mt-6">
              {/* ✅ Mensagem informativa: BNCC ainda não está povoada para este contexto */}
              {/* ✅ Robustez BNCC: carregando / erro / vazio */}


              {/* ✅ BNCC (TEMA): estados de carregamento/erro/ausência */}
              {apiLoading && (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-extrabold text-slate-800">
                    {temaCarregandoLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-600">
                    Aguarde um instante.
                  </div>
                </div>
              )}

              {!apiLoading && !!apiErro && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="text-sm font-extrabold text-red-900">
                    Erro ao carregar opções do contexto
                  </div>
                  <div className="mt-1 text-sm font-semibold text-red-800">
                    {apiErro}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReloadKey((v) => v + 1)}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              )}

              {!apiLoading && !apiErro && Array.isArray(apiTemas) && apiTemas.length === 0 && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-sm font-extrabold text-amber-900">
                    {temaAusenciaTitulo}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-amber-800">
                    Não há temas cadastrados para{" "}
                    <span className="font-extrabold">{ctx?.disciplina_nome || "esta disciplina"}</span>{" "}
                    na série{" "}
                    <span className="font-extrabold">{ctx?.serie_label || ctx?.serie || "selecionada"}</span>.
                    Sem Tema, não é possível cadastrar o item.
                  </div>
                </div>
              )}




              <div className="mb-2">
                <div className="text-xs font-bold text-slate-600">
                  Preencha as etapas abaixo (o botão SALVAR libera após TEMA e CONTEÚDO).
                </div>
              </div>






              <div className="grid grid-cols-1 gap-5">
                {/* ✅ PASSO 5.4 — TEMA (BNCC): card azul */}
                <div className="rounded-3xl border border-blue-400 bg-blue-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-extrabold text-blue-900">
                      {temaCampoLabel}
                    </label>
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-blue-300 text-blue-950 border border-blue-400">
                      ETAPA 1
                    </span>
                  </div>


                  <select
                    value={temaId ?? ""}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setTemaId(Number.isFinite(id) ? id : null);

                      const item = Array.isArray(apiTemas)
                        ? apiTemas.find((t) => Number(t?.id) === Number(id))
                        : null;

                      setTemaTexto(String(item?.texto || "").trim());
                    }}
                    disabled={apiLoading || !!apiErro || !Array.isArray(apiTemas) || apiTemas.length === 0}
                    className={`mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 ${
                      apiLoading || !!apiErro || !apiTemas.length
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                        : "bg-white"
                    }`}
                  >
                    <option value="" disabled>
                      {apiLoading
                        ? (isGeometria
                            ? `Carregando temas da disciplina (${ctx?.disciplina_nome || "Geometria"})...`
                            : "Carregando temas BNCC...")
                        : apiErro
                        ? "Falha ao carregar temas"
                        : apiTemas.length === 0
                        ? (isGeometria ? "Nenhum tema da disciplina disponível" : "Nenhum tema BNCC disponível")
                        : (isGeometria ? "Selecione um tema da disciplina..." : "Selecione um tema BNCC...")}
                    </option>


                    {Array.isArray(apiTemas) &&
                      apiTemas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.texto}
                        </option>
                      ))}
                  </select>
                </div>

                {/* ✅ PASSO 5.4 — CONTEÚDO (SEEDF): card verde */}
                <div className="rounded-3xl border border-emerald-400 bg-emerald-200 p-5">

                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-extrabold text-emerald-900">
                      CONTEÚDO (SEEDF)
                    </label>
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-300 text-emerald-950 border border-emerald-400">
                      ETAPA 2
                    </span>
                  </div>


                  {!apiLoading && !apiErro && Array.isArray(apiConteudos) && apiConteudos.length === 0 && (
                    <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="text-sm font-extrabold text-amber-900">
                        Conteúdos SEEDF ausentes para este contexto
                      </div>
                      <div className="mt-1 text-sm font-semibold text-amber-800">
                        Ainda não há conteúdos SEEDF cadastrados para este contexto (e/ou para o tema selecionado).
                        Próximo passo: povoar <span className="font-extrabold">seedf_conteudos</span>.
                      </div>
                    </div>
                  )}

                  <select
                    value={conteudoId ?? ""}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setConteudoId(Number.isFinite(id) ? id : null);

                      const item = Array.isArray(apiConteudos)
                        ? apiConteudos.find((c) => Number(c?.id) === Number(id))
                        : null;

                      setConteudoTexto(String(item?.texto || "").trim());
                    }}
                    disabled={!Number.isFinite(Number(temaId)) || !Array.isArray(apiConteudos) || apiConteudos.length === 0}
                    className={`mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 ${
                      !Number.isFinite(Number(temaId)) || !apiConteudos.length
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                        : "bg-white"
                    }`}
                  >
                    <option value="" disabled>
                      {!Number.isFinite(Number(temaId))
                        ? "Selecione um tema BNCC primeiro..."
                        : apiConteudos.length === 0
                        ? "Nenhum conteúdo SEEDF disponível"
                        : "Selecione um conteúdo SEEDF..."}
                    </option>

                    {Array.isArray(apiConteudos) &&
                      apiConteudos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.texto}
                        </option>
                      ))}
                  </select>
                </div>

                {/* ✅ PASSO 5.4 — OBJETIVO: card roxo (opcional) */}
                <div className="rounded-3xl border border-violet-400 bg-violet-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-extrabold text-violet-900">
                      OBJETIVO <span className="font-bold">(opcional)</span>
                    </label>
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-violet-300 text-violet-950 border border-violet-400">
                      ETAPA 3
                    </span>
                  </div>


                  <textarea
                    value={objetivoTexto}
                    onChange={(e) => setObjetivoTexto(e.target.value)}
                    rows={3}
                    placeholder="Opcional: descreva o objetivo (texto livre)"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer (fixo) */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-extrabold"
              >
                VOLTAR
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={`px-6 py-3 rounded-xl font-extrabold shadow transition ${
                  canSave
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

