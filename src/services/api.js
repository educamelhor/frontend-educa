// src/services/api.js
import axios from "axios";

/**
 * =========================================================
 * API CLIENT (EDUCA.MELHOR)
 * - Base URL por ambiente (VITE_API_BASE_URL)
 * - Normalização de /api duplicado
 * - Injeta Authorization (Bearer token)
 * - Injeta x-escola-id (compatível com verificarEscola.js)
 * - Trata 401 limpando sessão e redirecionando para /login
 * =========================================================
 */

function getApiBaseUrl() {
  // Suporta ambos nomes (para evitar build antigo/variável divergente)
  const envUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL;

  // Normaliza: remove barra final e garante sufixo /api
  const normalize = (url) => {
    let u = String(url || "").trim().replace(/\/+$/, "");
    if (!u) return "";
    if (!u.endsWith("/api")) u = `${u}/api`;
    return u;
  };

  const normalizedEnv = normalize(envUrl);
  if (normalizedEnv) return normalizedEnv;

  // Localhost APENAS quando o próprio site estiver em localhost/127.0.0.1
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal) return "http://localhost:3000/api";

  // Produção: jamais retornar localhost
  return "https://educa-backend-docker-659zo.ondigitalocean.app/api";
}


function normalizeApiUrl(baseURL, url) {
  if (!url) return url;

  // Se já for absoluta, não mexe
  if (/^https?:\/\//i.test(url)) return url;

  let u = String(url);

  // Remove espaços e garante que começa com /
  u = u.trim();
  if (!u.startsWith("/")) u = `/${u}`;

  // 1) Colapsa qualquer duplicação /api/api/... (mesmo se ocorrer mais de uma vez)
  // Ex.: /api/api/usuarios -> /api/usuarios
  u = u.replace(/\/api\/api\//g, "/api/");

  // 2) Se o baseURL já termina com /api, então a URL NÃO deve começar com /api
  // Ex.: baseURL = https://.../api  e url = /api/usuarios  => /usuarios
  const baseEndsWithApi = /\/api$/i.test(String(baseURL || ""));
  if (baseEndsWithApi && /^\/api(\/|$)/i.test(u)) {
    u = u.replace(/^\/api/i, "");
    if (u === "") u = "/";
  }

  // 3) (Blindagem) Se sobrar /api/api por algum motivo, garante novamente
  u = u.replace(/\/api\/api\//g, "/api/");

  return u;
}


export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  // Se você usa cookie/sessão também, mantenha true.
  // Se não usa, pode deixar false. Como seu backend já está com Allow-Credentials,
  // manter true não atrapalha.
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    // 1) Normaliza URL
    config.url = normalizeApiUrl(config.baseURL || "", config.url);

    // 2) Token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3) Escola (compatível com verificarEscola.js -> x-escola-id)
    const escolaId = localStorage.getItem("escola_id");
    if (escolaId) {
      config.headers = config.headers || {};
      config.headers["x-escola-id"] = escolaId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Se 401, limpa sessão e volta pro login
    // ⚠️  Exceção: páginas públicas (ativação de conta, cadastro) não redirecionam
    // pois o usuário ainda não tem sessão e o 401 viria de endpoint protegido por engano.
    const PAGINAS_PUBLICAS = ["/ativar-diretor", "/cadastro"];
    const estaEmPaginaPublica = PAGINAS_PUBLICAS.some(
      (p) => window?.location?.pathname?.startsWith(p)
    );

    if (status === 401 && !estaEmPaginaPublica) {
      try {
        localStorage.removeItem("token");
        // mantém escola_id/nome_escola se você quiser; aqui vou manter e limpar só token
        // localStorage.removeItem("escola_id");
      } catch (_) {}

      // Evita loop se já estiver no /login
      if (window?.location?.pathname && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
