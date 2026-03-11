import React, { useEffect, useMemo, useState } from "react";

// Backend (API) — sempre normalizado para terminar com /api (mesmo padrão do projeto)
const API_BASE = (() => {
  const envUrl =
    import.meta?.env?.VITE_API_BASE_URL ||
    import.meta?.env?.VITE_API_URL;

  const normalize = (url) => {
    let u = String(url || "").trim().replace(/\/+$/, "");
    if (!u) return "";
    if (!u.endsWith("/api")) u = `${u}/api`;
    return u;
  };

  const normalizedEnv = normalize(envUrl);
  if (normalizedEnv) return normalizedEnv;

  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal) return "http://localhost:3000/api";

  return "https://educa-backend-docker-659zo.ondigitalocean.app/api";
})();

// FIX TEMPORÁRIO: backend/DB está entregando last_seen_at +3h (UTC vs Brasília).
// Ajuste explícito para exibir e calcular ONLINE/OFFLINE em horário local.
const TZ_FIX_MS = 3 * 60 * 60 * 1000;

function parseDateMs(input) {
  if (!input) return NaN;

  const s0 = String(input).trim();
  if (!s0) return NaN;

  // Se já tiver timezone (Z ou +hh:mm), confia no parser nativo
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(s0);
  if (hasTz) {
    const ms = new Date(s0).getTime();
    return ms;
  }

  // Força parse UTC para strings sem timezone, aceitando:
  // "YYYY-MM-DD HH:MM:SS"
  // "YYYY-MM-DDTHH:MM:SS"
  // com ou sem ".mmm"
  const m = s0.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?$/
  );

  if (m) {
    const year = Number(m[1]);
    const mon = Number(m[2]) - 1;
    const day = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = Number(m[6] || 0);

    // Aceita microssegundos (1-6) e trunca para milissegundos (3)
    const frac = String(m[7] || "0");
    const ms = Number(frac.slice(0, 3).padEnd(3, "0"));

    return Date.UTC(year, mon, day, hh, mm, ss, ms);
  }

  // Fallback: tenta parser nativo (último recurso)
  const fallback = new Date(s0).getTime();
  return fallback;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const ms0 = parseDateMs(iso);
  if (Number.isNaN(ms0)) return "—";

  const ms = ms0 - TZ_FIX_MS;

  // Força exibição sempre no fuso de Brasília
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(ms));
}

function isOnline(lastSeenIso, nowMs) {
  const t0 = parseDateMs(lastSeenIso);
  if (Number.isNaN(t0)) return false;

  const t = t0 - TZ_FIX_MS;

  // Janela de "online" — 5 minutos (mais realista)
  const ONLINE_WINDOW_MS = 5 * 60 * 1000;

  // Se vier no futuro (por inconsistência de timezone), considera OFFLINE
  if (t > nowMs) return false;

  return (nowMs - t) <= ONLINE_WINDOW_MS;
}

export default function DiretorPedagogico() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const escolaId = useMemo(() => localStorage.getItem("escola_id") || "", []);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingRowId, setLoadingRowId] = useState(null);
  const [erro, setErro] = useState("");
  const [devices, setDevices] = useState([]);
  const [auditUi, setAuditUi] = useState([]);

  // ====== ACCESS CODE (Cadastro de dispositivo) ======
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessCreating, setAccessCreating] = useState(false);
  const [accessCodes, setAccessCodes] = useState([]);
  const [accessErro, setAccessErro] = useState("");
  const [accessNewCode, setAccessNewCode] = useState("");
  const [accessBusyId, setAccessBusyId] = useState(null);

  // ====== APROVAR PAREAMENTO (sub-modal) ======
  const [approveRow, setApproveRow]             = useState(null);
  const [approvePairCode, setApprovePairCode]   = useState('');
  const [approveLoading, setApproveLoading]     = useState(false);
  const [approveErro, setApproveErro]           = useState('');
  const [approveOk, setApproveOk]               = useState(null);

  const fetchAccessCodes = async () => {
    setAccessLoading(true);
    setAccessErro("");

    try {
      // TODO: confirme rota no backend
      const resp = await fetch(`${API_BASE}/capture/admin/access-codes`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(escolaId ? { "x-escola-id": escolaId } : {}),
        },
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setAccessCodes([]);
        setAccessErro(data?.message || data?.erro || "Falha ao listar access_codes.");
        setAccessLoading(false);
        return;
      }

      setAccessCodes(Array.isArray(data?.codes) ? data.codes : (Array.isArray(data?.access_codes) ? data.access_codes : []));
      setAccessLoading(false);
    } catch {
      setAccessCodes([]);
      setAccessErro("Erro de rede ao listar access_codes.");
      setAccessLoading(false);
    }
  };

  const createAccessCode = async () => {
    const code = String(accessNewCode || "").trim().toUpperCase();

    // padrão unificado com o backend: 4-24 chars, A-Z/0-9/hífen/underscore
    const RE = /^[A-Z0-9][A-Z0-9_-]*[A-Z0-9]$|^[A-Z0-9]$/;
    const AC_MIN = 4;
    const AC_MAX = 24;

    if (!code) {
      setAccessErro("Informe um código.");
      return;
    }
    if (code.length < AC_MIN || code.length > AC_MAX || !RE.test(code)) {
      setAccessErro(`Formato inválido. Use ${AC_MIN}-${AC_MAX} chars (A-Z, 0-9, hífen ou underscore). Ex: CEF04-CCMDF.`);
      return;
    }

    setAccessCreating(true);
    setAccessErro("");

    try {
      // TODO: confirme rota no backend
      const resp = await fetch(`${API_BASE}/capture/admin/access-codes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(escolaId ? { "x-escola-id": escolaId } : {}),
        },
        body: JSON.stringify({ access_code: code }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setAccessErro(data?.message || data?.erro || "Falha ao criar access_code.");
        setAccessCreating(false);
        return;
      }

      setAccessNewCode("");
      await fetchAccessCodes();
      setAccessCreating(false);
    } catch {
      setAccessErro("Erro de rede ao criar access_code.");
      setAccessCreating(false);
    }
  };

  const toggleAccessAtivo = async (row) => {
    const id = Number(row?.id || 0);
    if (!id) return;

    const ativoAtual = Number(row?.ativo || 0) === 1;
    const novoAtivo = ativoAtual ? 0 : 1;

    const ok = window.confirm(
      ativoAtual
        ? `Desativar o access_code "${row?.access_code}"?`
        : `Ativar o access_code "${row?.access_code}"?`
    );
    if (!ok) return;

    setAccessBusyId(id);
    setAccessErro("");

    try {
      // TODO: confirme rota no backend
      const resp = await fetch(`${API_BASE}/capture/admin/access-codes/${id}/ativo`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(escolaId ? { "x-escola-id": escolaId } : {}),
        },
        body: JSON.stringify({ ativo: novoAtivo }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setAccessErro(data?.message || data?.erro || "Falha ao atualizar status do access_code.");
        setAccessBusyId(null);
        return;
      }

      await fetchAccessCodes();
      setAccessBusyId(null);
    } catch {
      setAccessErro("Erro de rede ao atualizar status do access_code.");
      setAccessBusyId(null);
    }
  };

  const handleApprovePair = async () => {
    const pc = String(approvePairCode || '').trim().toUpperCase();
    const RE = /^[A-Z0-9][A-Z0-9_-]*[A-Z0-9]$|^[A-Z0-9]$/;

    if (!pc || pc.length < 8 || !RE.test(pc)) {
      setApproveErro('Código inválido. Digite o código exibido no app (ex: GHMX-MJ6W).');
      return;
    }

    setApproveLoading(true);
    setApproveErro('');
    setApproveOk(null);

    try {
      const resp = await fetch(`${API_BASE}/capture/admin/pair/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(escolaId ? { 'x-escola-id': escolaId } : {}),
        },
        body: JSON.stringify({ pair_code: pc }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setApproveErro(data?.message || data?.erro || `Erro ao aprovar pareamento (HTTP ${resp.status}).`);
        setApproveLoading(false);
        return;
      }

      setApproveOk({
        device_uid:   data?.device_uid   || '—',
        device_token: data?.device_token || null,
        message:      data?.message      || 'Dispositivo aprovado com sucesso.',
      });
      setApproveLoading(false);
    } catch {
      setApproveErro('Erro de rede ao aprovar pareamento.');
      setApproveLoading(false);
    }
  };

  const openApproveModal = (row) => {
    setApproveRow(row);
    setApprovePairCode('');
    setApproveErro('');
    setApproveOk(null);
  };

  const closeApproveModal = () => {
    setApproveRow(null);
    setApprovePairCode('');
    setApproveErro('');
    setApproveOk(null);
  };

  // Atualiza a UI para o badge ONLINE/OFFLINE mudar automaticamente com o tempo,
  // mesmo sem clicar em "Atualizar".
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchDevices = async () => {
    setLoadingList(true);
    setErro("");

    try {
      const resp = await fetch(`${API_BASE}/capture/admin/devices`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(escolaId ? { "x-escola-id": escolaId } : {}),
        },
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setDevices([]);
        setErro(data?.message || data?.erro || "Falha ao listar dispositivos.");
        setLoadingList(false);
        return;
      }

      setDevices(Array.isArray(data?.devices) ? data.devices : []);
      setLoadingList(false);
    } catch {
      setDevices([]);
      setErro("Erro de rede ao listar dispositivos.");
      setLoadingList(false);
    }
  };

  const toggleAtivo = async (device) => {
    const id = Number(device?.id || 0);
    if (!id) return;

    const ativoAtual = Number(device?.ativo || 0) === 1;
    const novoAtivo = ativoAtual ? 0 : 1;

    const ok = window.confirm(
      ativoAtual
        ? `Bloquear o dispositivo "${device?.nome_dispositivo}"?`
        : `Liberar o dispositivo "${device?.nome_dispositivo}"?`
    );
    if (!ok) return;

    setLoadingRowId(id);
    setErro("");

    try {
      const resp = await fetch(`${API_BASE}/capture/admin/devices/${id}/ativo`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(escolaId ? { "x-escola-id": escolaId } : {}),
        },
        body: JSON.stringify({ ativo: novoAtivo }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErro(data?.message || data?.erro || "Falha ao atualizar status do dispositivo.");
        setLoadingRowId(null);
        return;
      }

      setAuditUi((prev) => {
        const ts = Date.now();
        const tsLabel = new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          dateStyle: "short",
          timeStyle: "medium",
        }).format(new Date(ts));

        const entry = {
          key: `${ts}-${id}-${novoAtivo}`,
          ts,
          tsLabel,
          id,
          nome: device?.nome_dispositivo || "—",
          acao: novoAtivo === 1 ? "LIBEROU" : "BLOQUEOU",
        };

        return [entry, ...prev].slice(0, 5);
      });

      await fetchDevices();
      setLoadingRowId(null);
    } catch {
      setErro("Erro de rede ao atualizar status do dispositivo.");
      setLoadingRowId(null);
    }
  };

  useEffect(() => {
    fetchDevices();

    const t = setInterval(() => {
      setNowMs(Date.now());
    }, 10_000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Direção — Dispositivos EDUCA-CAPTURE</h1>
          <p className="text-sm text-gray-600 mt-2">
            Liste e gerencie os dispositivos vinculados à sua escola (liberar/bloquear).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAccessOpen(true);
              fetchAccessCodes();
            }}
            type="button"
            className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition disabled:opacity-60"
            disabled={loadingList}
            title="Gerar/listar/desativar códigos de acesso para pareamento do EDUCA-CAPTURE"
          >
            Cadastrar dispositivo
          </button>

          <button
            onClick={fetchDevices}
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition disabled:opacity-60"
            disabled={loadingList}
          >
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {erro}
        </div>
      )}

      {/* Modal: Access Codes (Cadastro de dispositivo) */}
      {accessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAccessOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="p-5 border-b flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-gray-900">Cadastrar dispositivo</div>
                <div className="text-sm text-gray-600 mt-1">
                  Crie e gerencie <span className="font-semibold">access_codes</span> da sua escola.
                  O app vai pedir esse código na primeira tela.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAccessOpen(false)}
                className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                Fechar
              </button>
            </div>

            <div className="p-5">
              {accessErro && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {accessErro}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-800">Novo access_code</label>
                  <input
                    value={accessNewCode}
                    onChange={(e) => setAccessNewCode(e.target.value.toUpperCase())}
                    placeholder="Ex: CEF04-CCMDF"
                    maxLength={24}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 font-mono tracking-wider"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    4 a 24 caracteres (A-Z, 0-9, hífen ou underscore). Ex: CEF04-CCMDF.
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={createAccessCode}
                    disabled={accessCreating}
                    className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition disabled:opacity-60"
                  >
                    {accessCreating ? "Criando..." : "Criar"}
                  </button>

                  <button
                    type="button"
                    onClick={fetchAccessCodes}
                    disabled={accessLoading}
                    className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 transition disabled:opacity-60"
                  >
                    {accessLoading ? "Atualizando..." : "Atualizar lista"}
                  </button>
                </div>
              </div>

              <div className="mt-5 border border-gray-200 rounded-lg overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-emerald-50 text-emerald-900">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Access Code</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Criado em</th>
                      <th className="text-right p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {accessCodes.length === 0 && (
                      <tr>
                        <td className="p-4 text-gray-500" colSpan={5}>
                          {accessLoading ? "Carregando..." : "Nenhum access_code cadastrado para esta escola."}
                        </td>
                      </tr>
                    )}

                    {accessCodes.map((c) => {
                      const id = Number(c?.id || 0);
                      const ativo = Number(c?.ativo || 0) === 1;

                      return (
                        <tr key={String(id)} className="hover:bg-emerald-50/30">
                          <td className="p-3">{id || "—"}</td>
                          <td className="p-3 font-mono text-xs">{c?.access_code || "—"}</td>
                          <td className="p-3">
                            <span
                              className={
                                "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold " +
                                (ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700")
                              }
                            >
                              {ativo ? "ATIVO" : "INATIVO"}
                            </span>
                          </td>
                          <td className="p-3">{fmtDate(c?.created_at)}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {ativo && (
                                <button
                                  type="button"
                                  onClick={() => openApproveModal(c)}
                                  disabled={accessBusyId === id}
                                  className="px-3 py-1.5 rounded-lg text-white transition disabled:opacity-60 inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800"
                                  title="Digitar o pair_code exibido no app para aprovar o dispositivo"
                                >
                                  ✓ Aceitar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleAccessAtivo(c)}
                                disabled={accessBusyId === id}
                                className={
                                  "px-3 py-1.5 rounded-lg text-white transition disabled:opacity-60 inline-flex items-center gap-2 " +
                                  (ativo ? "bg-gray-700 hover:bg-gray-800" : "bg-emerald-700 hover:bg-emerald-800")
                                }
                              >
                                {accessBusyId === id && (
                                  <span className="inline-block w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                                )}
                                {accessBusyId === id ? "Salvando..." : (ativo ? "Desativar" : "Ativar")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-xs text-gray-600">
                <div className="font-semibold text-gray-800">Como usar</div>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>Crie um access_code e passe ao responsável pelo dispositivo (professor/coordenação).</li>
                  <li>No app, ele digita esse código na primeira tela e recebe um <strong>código de pareamento</strong>.</li>
                  <li>Clique em <strong>Aceitar</strong> nesta tela e informe o código exibido no app para aprovar o dispositivo.</li>
                </ol>
              </div>

              {/* Sub-modal: Aprovar dispositivo via pair_code */}
              {approveRow && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/50"
                    onClick={closeApproveModal}
                  />
                  <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-blue-100">
                    {/* Header */}
                    <div className="p-5 border-b flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-extrabold text-blue-900">Aprovar dispositivo</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          access_code: <span className="font-mono font-semibold text-gray-800">{approveRow?.access_code}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={closeApproveModal}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="p-5">
                      {/* Sucesso */}
                      {approveOk ? (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                            <span className="text-emerald-600 text-xl mt-0.5">✓</span>
                            <div>
                              <div className="font-semibold text-emerald-800">{approveOk.message}</div>
                              <div className="text-xs text-gray-500 mt-2">
                                O app detectará a aprovação automaticamente e avançará para o menu principal.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={closeApproveModal}
                            className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition"
                          >
                            Fechar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            Digite o <strong>código de pareamento</strong> exibido no dispositivo
                            (tela "Aguardando Aprovação" do app EDUCA-CAPTURE).
                          </p>

                          {approveErro && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                              {approveErro}
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-1">
                              Código de pareamento
                            </label>
                            <input
                              value={approvePairCode}
                              onChange={(e) => {
                                setApprovePairCode(e.target.value.toUpperCase());
                                setApproveErro('');
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && !approveLoading && handleApprovePair()}
                              placeholder="Ex: GHMX-MJ6W"
                              maxLength={12}
                              autoFocus
                              disabled={approveLoading}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono text-xl tracking-widest text-center uppercase disabled:opacity-60"
                            />
                            <div className="text-xs text-gray-400 mt-1 text-center">
                              Código exibido na tela do dispositivo após o app processar o access_code.
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={closeApproveModal}
                              disabled={approveLoading}
                              className="flex-1 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition disabled:opacity-60"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleApprovePair}
                              disabled={approveLoading || !approvePairCode.trim()}
                              className="flex-2 flex-grow py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                            >
                              {approveLoading && (
                                <span className="inline-block w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                              )}
                              {approveLoading ? 'Aprovando...' : '✓ Aprovar dispositivo'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {auditUi.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-sm">
          <div className="font-semibold">Auditoria (sessão atual)</div>
          <ul className="mt-2 space-y-1">
            {auditUi.map((a) => (
              <li key={a.key} className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="font-mono text-xs text-blue-800">{a.tsLabel}</span>
                <span className="text-blue-900">{a.acao}</span>
                <span className="text-gray-700">—</span>
                <span className="font-medium text-gray-900">{a.nome}</span>
                <span className="text-gray-500">(ID {a.id})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-50 text-blue-900">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Dispositivo</th>
              <th className="text-left p-3">Plataforma</th>
              <th className="text-left p-3">Device UID</th>
              <th className="text-left p-3">App</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Último sinal</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {devices.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={8}>
                  {loadingList ? "Carregando..." : "Nenhum dispositivo encontrado para esta escola."}
                </td>
              </tr>
            )}

            {devices.map((d) => {
              const rowId = Number(d?.id || 0);
              const ativo = Number(d?.ativo || 0) === 1;
              const online = ativo && isOnline(d?.last_seen_at, nowMs);

              return (
                <tr key={d.id} className="hover:bg-blue-50/30">
                  <td className="p-3">{d.id}</td>
                  <td className="p-3 font-medium text-gray-900">{d.nome_dispositivo}</td>
                  <td className="p-3">{d.plataforma}</td>
                  <td className="p-3 font-mono text-xs">{d.device_uid}</td>
                  <td className="p-3">{d.app_version || "—"}</td>

                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold " +
                          (ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")
                        }
                      >
                        {ativo ? "ATIVO" : "BLOQUEADO"}
                      </span>

                      <span
                        title={online ? "ONLINE (sinal recente)" : "OFFLINE (sem sinal recente)"}
                        className={
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold " +
                          (online ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700")
                        }
                      >
                        {online ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  </td>

                  <td className="p-3">{fmtDate(d.last_seen_at)}</td>

                  <td className="p-3 text-right">
                    <button
                      onClick={() => toggleAtivo(d)}
                      type="button"
                      className={
                        "px-3 py-1.5 rounded-lg text-white transition disabled:opacity-60 inline-flex items-center gap-2 " +
                        (ativo ? "bg-red-600 hover:bg-red-700" : "bg-green-700 hover:bg-green-800")
                      }
                      disabled={loadingList || loadingRowId === rowId}
                    >
                      {loadingRowId === rowId && (
                        <span className="inline-block w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                      )}
                      {loadingRowId === rowId ? (ativo ? "Bloqueando..." : "Liberando...") : (ativo ? "Bloquear" : "Liberar")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}