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
  // Em DEV: normalmente vazio -> fallback localhost
  // Em PROD: defina VITE_API_BASE_URL (ex: https://backend-xxxxx.ondigitalocean.app)
  const envUrl = (import.meta?.env?.VITE_API_BASE_URL || "").trim();

  if (envUrl) return envUrl.replace(/\/+$/, "");
  return "http://localhost:3000";
}

function normalizeApiUrl(baseURL, url) {
  if (!url) return url;

  // Se já for absoluta, não mexe
  if (/^https?:\/\//i.test(url)) return url;

  let u = url;

  // Garante que começa com /
  if (!u.startsWith("/")) u = `/${u}`;

  // Evita /api/api/...
  u = u.replace(/^\/api\/api\//, "/api/");

  // Se baseURL já termina com /api e url começa com /api, remove um /api
  const baseEndsWithApi = /\/api$/i.test(baseURL);
  if (baseEndsWithApi && u.startsWith("/api/")) {
    u = u.replace(/^\/api/, "");
  }

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
    if (status === 401) {
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
