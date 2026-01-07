// src/services/api.js
import axios from "axios";

// Cria instância global do Axios com base na URL definida no .env
// Observação importante (DO x Localhost):
// - Se no frontend você chama rotas como "/api/auth/login", isso pode virar "/api/api/auth/login"
//   quando a baseURL já inclui "/api". Este arquivo normaliza isso automaticamente.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Adiciona o token JWT automaticamente (exceto rotas públicas/auth)
api.interceptors.request.use((config) => {
  const url = (config.url || "").trim();

  // 1) Anti-bug: se algum lugar ainda chamar "/api/..." a gente remove um "/api" para não virar "/api/api/..."
  if (url.startsWith("/api/")) {
    config.url = url.replace(/^\/api/, "");
  }

  // 2) Não anexar Bearer em rotas públicas (login e healthchecks)
  const isPublic =
    url === "/ping" ||
    url === "/_build-info" ||
    url.startsWith("/auth/");

  if (!isPublic) {
    const token = localStorage.getItem("token"); // ou sessionStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else {
    // garante que não vai herdar Authorization por engano
    if (config.headers && config.headers.Authorization) {
      delete config.headers.Authorization;
    }
  }

  return config;
});


// (Opcional, mas recomendado) Se o backend responder 401/403, limpa token local para forçar relogin
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = (error?.config?.url || "").toString();

    const isAuthRoute =
      url.startsWith("/auth/") || url === "/auth" || url === "/auth/login";

    if (!isAuthRoute && (status === 401 || status === 403)) {
      localStorage.removeItem("token");
    }

    return Promise.reject(error);
  }
);

export default api;
