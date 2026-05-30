// src/hooks/useEscolaLogos.js
// ============================================================================
// Hook: useEscolaLogos
// Retorna as logos da escola já resolvidas por posição (esquerda / direita).
// Usa cache em sessionStorage (TTL 5 min) para evitar requisições repetidas.
// Fallback automático para arquivos estáticos se escola não tiver logos cadastradas.
// ============================================================================
import { useState, useEffect } from "react";

const CACHE_KEY  = "escola_logos_cache";
const CACHE_TTL  = 5 * 60 * 1000; // 5 minutos

// Logos de fallback (arquivos estáticos servidos pelo Vite /public)
const FALLBACK_ESQUERDA = "/logo-escola-left.png";
const FALLBACK_DIREITA  = "/logo-escola-right.png";

function getApiRoot() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) return String(envUrl).replace(/\/api$/, "").replace(/\/$/, "");
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000";
  return "https://educa-backend-docker-659zo.ondigitalocean.app";
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // sessionStorage pode estar cheio — ignora silenciosamente
  }
}

export function invalidateEscolaLogosCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
}

/**
 * @returns {{ logoEsquerda: string, logoDireita: string, logos: Array, loading: boolean, reload: Function }}
 *   logoEsquerda / logoDireita: URL da variante `header` para usar em documentos.
 *   logos: array completo das logos cadastradas (para o painel de gerenciamento).
 *   loading: true enquanto busca.
 *   reload: força re-fetch ignorando cache.
 */
export default function useEscolaLogos() {
  const [state, setState] = useState({
    logoEsquerda: FALLBACK_ESQUERDA,
    logoDireita:  FALLBACK_DIREITA,
    logos:        [],
    loading:      true,
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchLogos() {
      setState(prev => ({ ...prev, loading: true }));

      // 1. Tentar cache
      const cached = readCache();
      if (cached) {
        if (!cancelled) {
          setState({
            logoEsquerda: cached.esquerda?.url_header || FALLBACK_ESQUERDA,
            logoDireita:  cached.direita?.url_header  || FALLBACK_DIREITA,
            logos:        cached.logos || [],
            loading:      false,
          });
        }
        return;
      }

      // 2. Buscar no backend
      const token   = localStorage.getItem("token");
      const escolaId = localStorage.getItem("escola_id");
      const API     = getApiRoot();

      try {
        const res = await fetch(`${API}/api/escola-logos/para-documentos`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-escola-id": escolaId || "",
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // 3. Buscar lista completa para o painel
        const resLista = await fetch(`${API}/api/escola-logos`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-escola-id": escolaId || "",
          },
        });
        const listaData = resLista.ok ? await resLista.json() : { logos: [] };

        const payload = {
          esquerda: data.esquerda || null,
          direita:  data.direita  || null,
          logos:    listaData.logos || [],
        };

        writeCache(payload);

        if (!cancelled) {
          setState({
            logoEsquerda: payload.esquerda?.url_header || FALLBACK_ESQUERDA,
            logoDireita:  payload.direita?.url_header  || FALLBACK_DIREITA,
            logos:        payload.logos,
            loading:      false,
          });
        }
      } catch {
        // Silencioso: usa fallback
        if (!cancelled) {
          setState({
            logoEsquerda: FALLBACK_ESQUERDA,
            logoDireita:  FALLBACK_DIREITA,
            logos:        [],
            loading:      false,
          });
        }
      }
    }

    fetchLogos();
    return () => { cancelled = true; };
  }, [revision]);

  const reload = () => {
    invalidateEscolaLogosCache();
    setRevision(r => r + 1);
  };

  return { ...state, reload };
}
