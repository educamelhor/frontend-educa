// src/utils/foto.js
// Uploads NÃO dependem da API

/** Normaliza barras duplicadas mantendo "http://", "https://" intactos */
function normalizeSlashes(url = "") {
  return url.replace(/([^:]\/)\/+/g, "$1");
}

/** Uploads base (Spaces/CDN) via env. Se vazio, usa fallback fixo do Spaces/CDN. */
function getUploadsBase() {
  const base = (import.meta?.env?.VITE_UPLOADS_BASE_URL || "").trim();

  // Fallback seguro para não depender do env em runtime
  const fallback = "https://educa-melhor-uploads.nyc3.cdn.digitaloceanspaces.com/uploads";

  const finalBase = base || fallback;
  return finalBase.replace(/\/+$/, "");
}




/**
 * Retorna uma URL ABSOLUTA para imagem a partir de:
 *  - path absoluto (http/https)  → retorna como veio (normalizado)
 *  - path relativo (/uploads/...) → prefixa com a base do axios (sem /api)
 */
export function buildFotoURL(path) {
  if (!path) return null;

  let p = String(path).trim().replace(/\\/g, "/");

  // Se vier absoluto (http/https), respeita.
  if (/^https?:\/\//i.test(p)) {
    return normalizeSlashes(p);
  }

  const base = getUploadsBase();

  // Se tiver base configurada (Spaces/CDN), monta URL absoluta
  if (base) {
    // remove barras iniciais do path
    let rel = p.replace(/^\/+/, "");

    // evita duplicar "uploads/" quando a base já termina com "/uploads"
    if (base.endsWith("/uploads") && rel.startsWith("uploads/")) {
      rel = rel.slice("uploads/".length);
    }

    return normalizeSlashes(`${base}/${rel}`);
  }

  // Sem base (ex.: localhost): mantém URL relativa
  p = `/${p.replace(/^\/+/, "")}`;
  return normalizeSlashes(p);
}



/**
 * Monta a URL da foto do aluno.
 * Regras:
 *  1) Se aluno.foto existir → usa (absoluta ou relativa).
 *  2) Caso contrário → fallback: /uploads/<PASTA>/<codigo>.jpg
 *  3) Opcional: cache-buster com { stamp: Date.now() }.
 *
 * @param {object} aluno
 * @param {object} [opts]
 * @param {number|string} [opts.stamp] - número para cache-buster
 * @param {string} [opts.folder="/uploads/CEF04_PLAN/alunos"] - pasta padrão
 * @param {string} [opts.placeholder="/images/placeholder.png"] - fallback final
 */
export function getFotoURL(
  aluno,
  { stamp, folder = "/uploads/CEF04_PLAN/alunos", placeholder = "/images/placeholder.png" } = {}


) {
  // 1) foto vinda do banco (pode ser absoluta ou relativa)
  const raw = aluno?.foto && String(aluno.foto).trim();
  let url = raw ? buildFotoURL(raw) : null;

  // 2) fallback por código
  if (!url && aluno?.codigo) {
    url = buildFotoURL(`${folder}/${aluno.codigo}.jpg`);
  }

  // 3) fallback final (placeholder)
  if (!url) url = placeholder;

  // 4) cache-buster opcional
  if (stamp) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}t=${stamp}`;
  }
  return url;
}

/** Atalho: adiciona cache-buster a uma URL já montada */
export function withCacheBuster(url, stamp = Date.now()) {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${stamp}`;
}
