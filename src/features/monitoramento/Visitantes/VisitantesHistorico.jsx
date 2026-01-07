// ============================================================================
// VisitantesHistorico.jsx — E.6.3 + E.6.4.1 + E.6.4.2 + E.6.4.3 + E.6.5.4 + E.6.5.6 + E.6.6 + E.6.7.1 + E.6.7.2 + E.6.7.3
// (lista + filtros finos + paginação + exportação CSV + painel detalhes com foto
//  + miniatura direta na lista + registrar saída/finalização + filtros ↔ URL
//  + botões de período rápido + chips de filtros ativos com remover individual)
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ----------------------------------------------------------------------------
// Constantes (mantidas)
// ----------------------------------------------------------------------------
const CATEGORIAS = [
  { key: "", label: "Todas" },
  { key: "RESPONSAVEL", label: "Responsável de Aluno" },
  { key: "ENTREGA", label: "Entrega / Fornecedor" },
  { key: "PRESTADOR", label: "Prestador de Serviço" },
  { key: "OUTRO", label: "Outro" },
];

const STATUS_OPCOES = [
  { key: "", label: "Todos" },
  { key: "EM_ABERTO", label: "Em Aberto" },
  { key: "FINALIZADO", label: "Finalizado" },
];

const PORTOES = [
  { key: "", label: "Todos" },
  { key: "PRINCIPAL", label: "Portão Principal" },
  { key: "LATERAL", label: "Portão Lateral" },
  { key: "FUNDOS", label: "Fundos" },
];

const ORDENAR = [
  { key: "entrada", label: "Entrada" },
  { key: "saida", label: "Saída" },
  { key: "nome", label: "Nome" },
  { key: "categoria", label: "Categoria" },
  { key: "status", label: "Status" },
  { key: "criado", label: "Criação" },
];

// ----------------------------------------------------------------------------
function Pill({ text, tone = "gray" }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-${tone}-100 text-${tone}-700 border border-${tone}-200`}
    >
      {text}
    </span>
  );
}

// Chip com botão de remover (para “filtros ativos”)
function Chip({ label, onRemove, title }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border bg-white hover:bg-gray-50 text-gray-700"
      title={title || label}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full border text-gray-600 hover:bg-gray-100"
      >
        ×
      </button>
    </span>
  );
}

function buildQuery(paramsObj) {
  const url = new URLSearchParams();
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      url.append(k, String(v));
    }
  });
  return url.toString();
}

function normalizeResponse(json) {
  const items = json.items || json.rows || json.data || [];
  const total = json.total ?? json.count ?? items.length ?? 0;
  const page = json.page ?? 1;
  const pageSize = json.pageSize ?? json.limit ?? 10;
  return { items, total, page, pageSize };
}

function safe(s) {
  return (s ?? "—").toString();
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    if (s.length >= 19 && s.includes("T")) {
      return s.replace("T", " ").replace("Z", "").slice(0, 19);
    }
    return s;
  } catch {
    return s;
  }
}

// ============================================================================
// Exportação CSV (página atual ou completa) — mantido
// ============================================================================
async function exportCSVCompleto(params, token, escola_id) {
  try {
    const fullParams = { ...params, page: 1, pageSize: 9999, all: 1 };
    const qs = buildQuery(fullParams);
    const res = await fetch(`/api/monitoramento/visitantes/historico?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(escola_id ? { "x-escola-id": escola_id } : {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const { items } = normalizeResponse(json);
    if (!items?.length) return alert("Nenhum registro encontrado.");

    const headers = [
      "ID",
      "Nome",
      "Documento",
      "Categoria",
      "Status",
      "Entrada",
      "Saída",
      "Portão",
      "Autorizador",
      "Empresa",
      "Motivo",
      "Observação",
      "Registrado Por",
    ];

    const csv = [
      headers.join(";"),
      ...items.map((r) =>
        [
          r.id ?? "",
          r.nome ?? "",
          r.documento ?? "",
          r.categoria ?? "",
          r.status ?? "",
          r.entrada_em ?? "",
          r.saida_em ?? "",
          r.portao ?? "",
          r.autorizador ?? "",
          r.empresa ?? "",
          r.motivo ?? "",
          r.observacao ?? "",
          r.usuario_nome ?? r.registrado_por ?? "",
        ]
          .map((s) => String(s).replaceAll(";", ","))
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitantes_historico_completo_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Erro ao exportar CSV completo:", err);
    alert("Falha ao gerar CSV completo. Veja o console.");
  }
}

function exportCSVParcial(rows) {
  if (!rows?.length) return;
  const headers = [
    "ID",
    "Nome",
    "Documento",
    "Categoria",
    "Status",
    "Entrada",
    "Saída",
    "Observação",
    "Registrado Por",
  ];
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      [
        r.id ?? "",
        r.nome ?? "",
        r.documento ?? "",
        r.categoria ?? "",
        r.status ?? "",
        r.entrada_em ?? "",
        r.saida_em ?? "",
        r.observacao ?? "",
        r.usuario_nome ?? r.registrado_por ?? "",
      ]
        .map((s) => String(s).replaceAll(";", ","))
        .join(";")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `visitantes_historico_parcial_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Helpers de URL do backend (resolve /uploads para o host correto)
// ============================================================================
function getApiBase() {
  // prioridade: env → localStorage → window → fallback local
  const env = import.meta?.env?.VITE_API_BASE;
  const ls =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("API_BASE") || localStorage.getItem("api_base")
      : "";
  const win = typeof window !== "undefined" ? window.API_BASE : "";
  return (env || ls || win || "http://localhost:3000").replace(/\/+$/, "");
}
function resolveBackendUrl(urlOrPath) {
  if (!urlOrPath) return "";
  const u = String(urlOrPath);
  if (/^https?:\/\//i.test(u)) return u; // já é absoluta
  const base = getApiBase();
  return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
}

// ============================================================================
// FALLBACK de imagem (silhueta SVG inline) — usado se a foto falhar
// ============================================================================
const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>
      <rect width='128' height='128' fill='#f3f4f6'/>
      <circle cx='64' cy='48' r='24' fill='#cbd5e1'/>
      <rect x='20' y='80' width='88' height='28' rx='14' fill='#cbd5e1'/>
    </svg>`
  );

// ============================================================================
// COMPONENTE PRINCIPAL — mantido e ampliado com “Detalhes” + miniatura na lista
// ============================================================================
export default function VisitantesHistorico() {
  const navigate = useNavigate();
  const location = useLocation();

  // Datas default
  const hojeISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [de, setDe] = useState(hojeISO);
  const [ate, setAte] = useState(hojeISO);

  // Filtros principais
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [qTyping, setQTyping] = useState("");

  // Filtros avançados
  const [showAdv, setShowAdv] = useState(false);
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [autorizador, setAutorizador] = useState("");
  const [alunoCodigo, setAlunoCodigo] = useState("");
  const [portao, setPortao] = useState("");
  const [comFoto, setComFoto] = useState(false);
  const [semSaida, setSemSaida] = useState(false);

  // Ordenação
  const [sort, setSort] = useState("entrada");
  const [order, setOrder] = useState("desc");

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dados
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // Estado de carregamento/erro
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // Painel de detalhes
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [detalheItem, setDetalheItem] = useState(null);

  // E.6.6 — estados para ação de saída
  const [saidaLoading, setSaidaLoading] = useState(false);
  const [idSaidaLoading, setIdSaidaLoading] = useState(null);

  // -------------------- E.6.7.1 — Sync Filtros ↔ URL ------------------------
  const didInitFromQuery = useRef(false);

  // Lê a querystring e aplica nos estados (somente uma vez por montagem)
  useEffect(() => {
    if (didInitFromQuery.current) return;

    const params = new URLSearchParams(location.search || "");
    const get = (k) => params.get(k);

    const q_de = get("de");
    const q_ate = get("ate");
    const q_categoria = get("categoria");
    const q_status = get("status");
    const q_q = get("q");
    const q_nome = get("nome");
    const q_documento = get("documento");
    const q_empresa = get("empresa");
    const q_autorizador = get("autorizador");
    const q_aluno_codigo = get("aluno_codigo");
    const q_portao = get("portao");
    const q_com_foto = get("com_foto");
    const q_sem_saida = get("sem_saida");
    const q_sort = get("sort");
    const q_order = get("order");
    const q_page = get("page");
    const q_pageSize = get("pageSize");

    // Booleans aceitarem "1" / "true"
    const parseBool = (v) =>
      String(v || "")
        .toLowerCase()
        .trim() in { "1": 1, true: 1 };

    // Só aplicar se existir na URL (não quebra defaults já validados)
    if (q_de) setDe(q_de);
    if (q_ate) setAte(q_ate);
    if (q_categoria !== null) setCategoria(q_categoria);
    if (q_status !== null) setStatus(q_status);
    if (q_q !== null) {
      setQ(q_q);
      setQTyping(q_q);
    }
    if (q_nome !== null) setNome(q_nome);
    if (q_documento !== null) setDocumento(q_documento);
    if (q_empresa !== null) setEmpresa(q_empresa);
    if (q_autorizador !== null) setAutorizador(q_autorizador);
    if (q_aluno_codigo !== null) setAlunoCodigo(q_aluno_codigo);
    if (q_portao !== null) setPortao(q_portao);
    if (q_com_foto !== null) setComFoto(parseBool(q_com_foto));
    if (q_sem_saida !== null) setSemSaida(parseBool(q_sem_saida));
    if (q_sort) setSort(q_sort);
    if (q_order) setOrder(q_order);
    if (q_page) setPage(Number(q_page) || 1);
    if (q_pageSize) setPageSize(Number(q_pageSize) || 10);

    didInitFromQuery.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Sempre que filtros/paginação mudarem, reescreve a querystring (sem recarregar)
  useEffect(() => {
    if (!didInitFromQuery.current) return;

    const qs = buildQuery({
      de,
      ate,
      categoria,
      status,
      q,
      nome,
      documento,
      empresa,
      autorizador,
      aluno_codigo: alunoCodigo,
      portao,
      com_foto: comFoto ? 1 : "",
      sem_saida: semSaida ? 1 : "",
      sort,
      order,
      page,
      pageSize,
    });

    navigate({ search: qs ? `?${qs}` : "" }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    de,
    ate,
    categoria,
    status,
    q,
    nome,
    documento,
    empresa,
    autorizador,
    alunoCodigo,
    portao,
    comFoto,
    semSaida,
    sort,
    order,
    page,
    pageSize,
  ]);

  // Debounce da busca qTyping -> q
  useEffect(() => {
    const t = setTimeout(() => setQ(qTyping), 400);
    return () => clearTimeout(t);
  }, [qTyping]);

  // -------------------------------- E.6.7.2 — Helpers período rápido -------------------------------
  const iso = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  function setPeriodoHoje() {
    const h = new Date();
    const v = iso(h);
    setDe(v);
    setAte(v);
    setPage(1);
  }
  function setPeriodoOntem() {
    const h = new Date();
    h.setDate(h.getDate() - 1);
    const v = iso(h);
    setDe(v);
    setAte(v);
    setPage(1);
  }
  function setPeriodo7Dias() {
    const h = new Date();
    const ateV = iso(h);
    const d = new Date(h);
    d.setDate(d.getDate() - 6); // últimos 7 dias (inclui hoje)
    setDe(iso(d));
    setAte(ateV);
    setPage(1);
  }
  function setPeriodoMesAtual() {
    const h = new Date();
    const ateV = iso(h);
    const inicio = new Date(h.getFullYear(), h.getMonth(), 1);
    setDe(iso(inicio));
    setAte(ateV);
    setPage(1);
  }

  // Carregar histórico
  async function fetchHistorico(opts = {}) {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("anju.token") ||
      "";
    const escola_id =
      localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

    const offset = (page - 1) * pageSize;
    const params = {
      de,
      ate,
      categoria,
      status,
      q,
      nome,
      documento,
      empresa,
      autorizador,
      aluno_codigo: alunoCodigo,
      portao,
      com_foto: comFoto ? 1 : "",
      sem_saida: semSaida ? 1 : "",
      page,
      pageSize,
      limit: pageSize,
      offset,
      sort,
      order,
      ...opts,
    };
    const qs = buildQuery(params);

    const endpoints = [
      `/api/monitoramento/visitantes/historico?${qs}`,
      `/api/visitantes/historico?${qs}`,
      `/api/visitantes?historico=1&${qs}`,
    ];

    setLoading(true);
    setErro("");

    try {
      let lastErr;
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(escola_id ? { "x-escola-id": escola_id } : {}),
            },
          });
          if (!res.ok) {
            lastErr = new Error(
              `HTTP ${res.status} — ${await res.text()} (${url})`
            );
            continue;
          }
          const json = await res.json();
          const { items, total, page: pg, pageSize: ps } =
            normalizeResponse(json);
          setRows(items);
          setTotal(total);
          setPage(pg || page);
          setPageSize(ps || pageSize);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (lastErr) throw lastErr;
    } catch (e) {
      console.error("historico erro:", e);
      setErro(e.message || "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }

  // Efeito para recarregar a lista quando filtros mudarem
  useEffect(() => {
    fetchHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    de,
    ate,
    categoria,
    status,
    q,
    nome,
    documento,
    empresa,
    autorizador,
    alunoCodigo,
    portao,
    comFoto,
    semSaida,
    sort,
    order,
    page,
    pageSize,
  ]);

  function limparFiltros() {
    setCategoria("");
    setStatus("");
    setQ("");
    setQTyping("");
    setNome("");
    setDocumento("");
    setEmpresa("");
    setAutorizador("");
    setAlunoCodigo("");
    setPortao("");
    setComFoto(false);
    setSemSaida(false);
    setSort("entrada");
    setOrder("desc");
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const token =
    localStorage.getItem("token") || localStorage.getItem("anju.token") || "";
  const escola_id =
    localStorage.getItem("escola_id") || localStorage.getItem("escolaId");

  const filtrosAtuais = {
    de,
    ate,
    categoria,
    status,
    q,
    nome,
    documento,
    empresa,
    autorizador,
    aluno_codigo: alunoCodigo,
    portao,
    com_foto: comFoto ? 1 : "",
    sem_saida: semSaida ? 1 : "",
    sort,
    order,
  };

  // -------------------- E.6.7.3 — Chips de filtros ativos -------------------
  const isPeriodoDefault = de === hojeISO && ate === hojeISO;

  const chips = [];

  if (!isPeriodoDefault) {
    chips.push({
      key: "periodo",
      label: `Período: ${de || "—"} → ${ate || "—"}`,
      onRemove: () => {
        const h = new Date();
        const v = iso(h);
        setDe(v);
        setAte(v);
        setPage(1);
      },
    });
  }
  if (categoria) {
    chips.push({
      key: "categoria",
      label: `Categoria: ${categoria}`,
      onRemove: () => {
        setCategoria("");
        setPage(1);
      },
    });
  }
  if (status) {
    chips.push({
      key: "status",
      label: `Status: ${status}`,
      onRemove: () => {
        setStatus("");
        setPage(1);
      },
    });
  }
  if (portao) {
    chips.push({
      key: "portao",
      label: `Portão: ${portao}`,
      onRemove: () => {
        setPortao("");
        setPage(1);
      },
    });
  }
  if (q) {
    chips.push({
      key: "q",
      label: `Buscar: ${q}`,
      onRemove: () => {
        setQ("");
        setQTyping("");
        setPage(1);
      },
    });
  }
  if (nome) {
    chips.push({
      key: "nome",
      label: `Nome: ${nome}`,
      onRemove: () => {
        setNome("");
        setPage(1);
      },
    });
  }
  if (documento) {
    chips.push({
      key: "documento",
      label: `Documento: ${documento}`,
      onRemove: () => {
        setDocumento("");
        setPage(1);
      },
    });
  }
  if (empresa) {
    chips.push({
      key: "empresa",
      label: `Empresa: ${empresa}`,
      onRemove: () => {
        setEmpresa("");
        setPage(1);
      },
    });
  }
  if (autorizador) {
    chips.push({
      key: "autorizador",
      label: `Autorizador: ${autorizador}`,
      onRemove: () => {
        setAutorizador("");
        setPage(1);
      },
    });
  }
  if (alunoCodigo) {
    chips.push({
      key: "aluno_codigo",
      label: `Aluno: ${alunoCodigo}`,
      onRemove: () => {
        setAlunoCodigo("");
        setPage(1);
      },
    });
  }
  if (comFoto) {
    chips.push({
      key: "com_foto",
      label: "Com foto",
      onRemove: () => {
        setComFoto(false);
        setPage(1);
      },
    });
  }
  if (semSaida) {
    chips.push({
      key: "sem_saida",
      label: "Sem saída",
      onRemove: () => {
        setSemSaida(false);
        setPage(1);
      },
    });
  }

  // (Opcional) Ordenação como chip — útil para debug/consistência visual:
  if (sort || order) {
    chips.push({
      key: "ordenacao",
      label: `Ordenação: ${sort || "entrada"} ${order || "desc"}`,
      onRemove: () => {
        setSort("entrada");
        setOrder("desc");
        setPage(1);
      },
    });
  }

  const temChips = chips.length > 0;

  // Abrir/fechar painel
  function abrirDetalhes(item) {
    setDetalheItem(item || null);
    setDetalheAberto(true);
  }
  function fecharDetalhes() {
    setDetalheAberto(false);
    setDetalheItem(null);
  }
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") fecharDetalhes();
    }
    if (detalheAberto) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detalheAberto]);

  // =========================================================================
  // E.6.6 — Registrar Saída (PATCH)
  // =========================================================================
  async function registrarSaida(id) {
    if (!id || saidaLoading) return;
    const confirmar = window.confirm(
      "Tem certeza que deseja registrar a saída deste visitante?"
    );
    if (!confirmar) return;

    try {
      setSaidaLoading(true);
      setIdSaidaLoading(id);

      const res = await fetch(`/api/monitoramento/visitantes/${id}/saida`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(escola_id ? { "x-escola-id": escola_id } : {}),
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`HTTP ${res.status} — ${msg}`);
      }

      // Atualiza a lista e o painel
      await fetchHistorico();
      setDetalheItem((prev) =>
        prev && prev.id === id
          ? { ...prev, status: "FINALIZADO", saida_em: new Date().toISOString() }
          : prev
      );

      alert("Saída registrada com sucesso.");
    } catch (err) {
      console.error("Erro ao registrar saída:", err);
      alert("Não foi possível registrar a saída. Veja o console para detalhes.");
    } finally {
      setSaidaLoading(false);
      setIdSaidaLoading(null);
    }
  }

  // ========================================================================
  // Render
  // ========================================================================
  return (
    <div className="p-4 sm:p-6">
      {/* Cabeçalho */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">
          Histórico de Visitantes
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/monitoramento/visitantes/registrar")}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + Registrar Entrada
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border rounded-xl p-3 sm:p-4 mb-4">
        {/* Filtros principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">De</label>
            <input
              type="date"
              value={de}
              onChange={(e) => {
                setDe(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-md border"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Até</label>
            <input
              type="date"
              value={ate}
              onChange={(e) => {
                setAte(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-md border"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-md border"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-md border"
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col lg:col-span-2">
            <label className="text-xs text-gray-600 mb-1">
              Busca (nome/documento/empresa/autorizador)
            </label>
            <input
              type="text"
              value={qTyping}
              onChange={(e) => {
                setQTyping(e.target.value);
                setPage(1);
              }}
              placeholder="Digite para filtrar…"
              className="px-3 py-2 rounded-md border"
            />
          </div>
        </div>

        {/* E.6.7.2 — Botões de período rápido */}
        <div className="mt-3 flex items-center gap-2 flex-wrap text-sm">
          <span className="text-xs text-gray-500 mr-1">Períodos rápidos:</span>
          <button
            onClick={setPeriodoHoje}
            className="px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50"
            title="Definir 'De' e 'Até' para hoje"
          >
            Hoje
          </button>
          <button
            onClick={setPeriodoOntem}
            className="px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50"
            title="Definir 'De' e 'Até' para ontem"
          >
            Ontem
          </button>
          <button
            onClick={setPeriodo7Dias}
            className="px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50"
            title="Últimos 7 dias (inclui hoje)"
          >
            7 dias
          </button>
          <button
            onClick={setPeriodoMesAtual}
            className="px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50"
            title="Do início do mês até hoje"
          >
            Este mês
          </button>
        </div>

        {/* E.6.7.3 — Chips de filtros ativos */}
        {temChips && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Filtros ativos:</span>
            {chips.map((c) => (
              <Chip key={c.key} label={c.label} onRemove={c.onRemove} />
            ))}
            <button
              onClick={limparFiltros}
              className="ml-1 px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50 text-xs"
              title="Limpar todos os filtros"
            >
              Limpar todos
            </button>
          </div>
        )}

        {/* Botões e avançados */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchHistorico({ page: 1 })}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Filtrar
          </button>
          <button
            onClick={limparFiltros}
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            Limpar
          </button>
          <button
            onClick={() => exportCSVParcial(rows)}
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            Exportar CSV (página)
          </button>
          <button
            onClick={() => exportCSVCompleto(filtrosAtuais, token, escola_id)}
            className="px-3 py-2 rounded-lg border bg-green-600 text-white hover:bg-green-700"
            title="Exporta todos os registros do filtro ativo"
          >
            Exportar CSV (completo)
          </button>

          <button
            onClick={() => setShowAdv((v) => !v)}
            className="ml-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            title="Mostrar/ocultar filtros avançados"
          >
            {showAdv ? "Ocultar filtros avançados" : "Mais filtros"}
          </button>

          <div className="ml-auto text-xs text-gray-500">
            {loading ? "Carregando…" : `Total: ${total}`}
          </div>
        </div>

        {/* Campos avançados */}
        {showAdv && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 border-t pt-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Nome</label>
              <input
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md border"
                placeholder="Nome do visitante"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Documento</label>
              <input
                value={documento}
                onChange={(e) => {
                  setDocumento(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md border"
                placeholder="CPF / RG / Outro"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Empresa</label>
              <input
                value={empresa}
                onChange={(e) => {
                  setEmpresa(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md border"
                placeholder="Empresa/Órgão"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Autorizador</label>
              <input
                value={autorizador}
                onChange={(e) => {
                  setAutorizador(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md border"
                placeholder="Coordenação / Direção…"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">
                Aluno — código
              </label>
              <input
                value={alunoCodigo}
                onChange={(e) => {
                  setAlunoCodigo(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md border"
                placeholder="Ex.: 729539"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Portão</label>
              <select
                value={portao}
                onChange={(e) => {
                  setPortao(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md border"
              >
                {PORTOES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="cb-com-foto"
                type="checkbox"
                checked={comFoto}
                onChange={(e) => {
                  setComFoto(e.target.checked);
                  setPage(1);
                }}
              />
              <label htmlFor="cb-com-foto" className="text-sm text-gray-700">
                Somente com foto
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="cb-sem-saida"
                type="checkbox"
                checked={semSaida}
                onChange={(e) => {
                  setSemSaida(e.target.checked);
                  setPage(1);
                }}
              />
              <label htmlFor="cb-sem-saida" className="text-sm text-gray-700">
                Somente sem saída
              </label>
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Ordenar por</label>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md border"
              >
                {ORDENAR.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Ordem</label>
              <select
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md border"
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ======================== TABELA ======================== */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {/* NOVO: coluna de miniatura */}
                <th className="px-3 py-2 text-left w-14">Foto</th>
                <th className="px-3 py-2 text-left w-14">#</th>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Documento</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Entrada</th>
                <th className="px-3 py-2 text-left">Saída</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Obs.</th>
                <th className="px-3 py-2 text-left w-40">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows?.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-gray-500"
                    colSpan={10}
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}

              {rows?.map((r, i) => {
                const n = (page - 1) * pageSize + (i + 1);
                const tone =
                  r.status === "EM_ABERTO"
                    ? "red"
                    : r.status === "FINALIZADO"
                    ? "green"
                    : "gray";
                const podeDarSaida = r.status === "EM_ABERTO";
                return (
                  <tr
                    key={r.id ?? `${i}-row`}
                    className="border-t hover:bg-gray-50"
                    onClick={() => abrirDetalhes(r)}
                    role="button"
                  >
                    {/* NOVO: miniatura (clique abre painel) */}
                    <td
                      className="px-3 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirDetalhes(r);
                      }}
                    >
                      <MiniThumb fotoUrl={r.fotoUrl} />
                    </td>

                    <td className="px-3 py-2 text-gray-500">{n}</td>
                    <td className="px-3 py-2">{safe(r.nome)}</td>
                    <td className="px-3 py-2">{safe(r.documento)}</td>
                    <td className="px-3 py-2">
                      <Pill text={safe(r.categoria)} tone="blue" />
                    </td>
                    <td className="px-3 py-2">{fmtDate(r.entrada_em)}</td>
                    <td className="px-3 py-2">{fmtDate(r.saida_em)}</td>
                    <td className="px-3 py-2">
                      <Pill text={safe(r.status)} tone={tone} />
                    </td>
                    <td className="px-3 py-2">{safe(r.observacao)}</td>
                    <td
                      className="px-3 py-2 flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
                        onClick={() => abrirDetalhes(r)}
                        title="Ver detalhes do visitante"
                      >
                        Detalhes
                      </button>

                      {/* Ação rápida de saída (já implementada no E.6.6) */}
                      {podeDarSaida && (
                        <button
                          className="px-2 py-1 rounded border bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                          disabled={saidaLoading && idSaidaLoading === r.id}
                          onClick={() => registrarSaida(r.id)}
                          title="Registrar saída do visitante"
                        >
                          {saidaLoading && idSaidaLoading === r.id
                            ? "Saindo..."
                            : "Saída"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={10}>
                    Carregando…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between px-3 py-3 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="px-2 py-1 rounded border"
              title="Itens por página"
            >
              <option value={10}>10 / pág.</option>
              <option value={20}>20 / pág.</option>
              <option value={50}>50 / pág.</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-gray-600">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
      {/* ====================== /TABELA ======================== */}

      {/* ====================== PAINEL DE DETALHES ======================== */}
      {detalheAberto && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={fecharDetalhes}
          />
          {/* Drawer */}
          <aside className="fixed right-0 top-0 h-full w-full sm:w-[440px] bg-white z-50 shadow-xl border-l flex flex-col">
            {/* Cabeçalho do painel */}
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Detalhes do Visitante</h2>
              <button
                onClick={fecharDetalhes}
                className="px-3 py-1 rounded border bg-white hover:bg-gray-50"
                title="Fechar"
              >
                Fechar
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 overflow-y-auto grow space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2">
                <LabelValue label="ID" value={safe(detalheItem?.id)} />
                <LabelValue label="Nome" value={safe(detalheItem?.nome)} />
                <LabelValue
                  label="Documento"
                  value={safe(detalheItem?.documento)}
                />
                <LabelValue
                  label="Categoria"
                  value={safe(detalheItem?.categoria)}
                />
                <LabelValue label="Status" value={safe(detalheItem?.status)} />
                <LabelValue
                  label="Entrada"
                  value={fmtDate(detalheItem?.entrada_em)}
                />
                <LabelValue
                  label="Saída"
                  value={fmtDate(detalheItem?.saida_em)}
                />
                <LabelValue label="Portão" value={safe(detalheItem?.portao)} />
                <LabelValue
                  label="Autorizador"
                  value={safe(detalheItem?.autorizador)}
                />
                <LabelValue
                  label="Empresa/Órgão"
                  value={safe(detalheItem?.empresa)}
                />
                <LabelValue label="Motivo" value={safe(detalheItem?.motivo)} />
                <LabelValue
                  label="Observações"
                  value={safe(detalheItem?.observacao)}
                />
                <LabelValue
                  label="Registrado Por"
                  value={safe(
                    detalheItem?.usuario_nome ?? detalheItem?.registrado_por
                  )}
                />

                {/* Foto com loading/fallback (URL resolvida) */}
                {detalheItem?.fotoUrl ? (
                  <FotoViewer fotoUrl={detalheItem.fotoUrl} />
                ) : null}
              </div>
            </div>

            {/* Rodapé do painel */}
            <div className="p-3 border-t bg-gray-50 flex justify-between gap-2">
              {/* Botão Registrar Saída no painel (E.6.6) */}
              {detalheItem?.status === "EM_ABERTO" ? (
                <button
                  className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                  onClick={() => registrarSaida(detalheItem.id)}
                  disabled={saidaLoading && idSaidaLoading === detalheItem.id}
                  title="Registrar saída do visitante"
                >
                  {saidaLoading && idSaidaLoading === detalheItem.id
                    ? "Registrando saída…"
                    : "Registrar Saída"}
                </button>
              ) : (
                <div className="text-sm text-gray-500 self-center">
                  Visitante finalizado.
                </div>
              )}

              <button
                onClick={fecharDetalhes}
                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
          </aside>
        </>
      )}
      {/* ==================== /PAINEL DE DETALHES ======================== */}

      {/* Erro (se houver) */}
      {erro && (
        <div className="mt-4 p-3 border rounded bg-red-50 text-red-700 text-sm">
          {erro}
        </div>
      )}
    </div>
  );
}

// Pequeno helper visual do painel
function LabelValue({ label, value }) {
  return (
    <div className="flex flex-col">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-gray-800">{value}</div>
    </div>
  );
}

// ============================================================================
// Componente de exibição de foto com loading e fallback (painel)
// ============================================================================
function FotoViewer({ fotoUrl }) {
  const [loaded, setLoaded] = useState(false);
  const [src, setSrc] = useState(() => resolveBackendUrl(fotoUrl));
  const resolved = resolveBackendUrl(fotoUrl);

  useEffect(() => {
    setSrc(resolveBackendUrl(fotoUrl));
  }, [fotoUrl]);

  return (
    <div className="mt-2">
      <div className="text-xs text-gray-600 mb-1">Foto</div>

      {/* Skeleton enquanto carrega */}
      {!loaded && (
        <div className="w-full h-40 rounded-lg border animate-pulse bg-gray-100 mb-2" />
      )}

      <img
        src={src}
        alt="Foto do visitante"
        className={`w-full rounded-lg border ${loaded ? "" : "hidden"}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setSrc(FALLBACK_IMG);
          setLoaded(true);
        }}
      />

      <div className="mt-2">
        <a
          href={resolved}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 inline-block"
          title="Abrir imagem em nova aba"
        >
          Abrir imagem
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// Miniatura compacta para a tabela (lazy + fallback)
// ============================================================================
function MiniThumb({ fotoUrl }) {
  const [src, setSrc] = useState(() => {
    return fotoUrl ? resolveBackendUrl(fotoUrl) : FALLBACK_IMG;
  });

  useEffect(() => {
    setSrc(fotoUrl ? resolveBackendUrl(fotoUrl) : FALLBACK_IMG);
  }, [fotoUrl]);

  const resolved = fotoUrl ? resolveBackendUrl(fotoUrl) : null;

  return (
    <div className="relative group w-12 h-12">
      <img
        loading="lazy"
        src={src}
        alt="Miniatura"
        className="w-12 h-12 rounded-lg object-cover border bg-gray-100"
        onError={() => setSrc(FALLBACK_IMG)}
      />
      {/* Ação rápida: abrir imagem em nova aba */}
      {resolved && (
        <a
          href={resolved}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir imagem em nova aba"
          className="absolute -right-1 -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded bg-white border shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          Abrir
        </a>
      )}
    </div>
  );
}
