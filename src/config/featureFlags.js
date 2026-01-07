// src/config/featureFlags.js
// =========================================================================
// Feature Flags — Padrão A
//  - Objetivo: impedir que módulos em construção derrubem o backend
//  - Flags via ENV (ex.: FEATURE_MONITORAMENTO=1)
//  - Também aceita lista FEATURES="monitoramento,horarios"
// =========================================================================

function asBool(v, defaultValue = false) {
  if (v === undefined || v === null) return defaultValue;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(s);
}

function listToSet(v) {
  return new Set(
    String(v || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

const FEATURES_SET = listToSet(process.env.FEATURES);

export const features = {
  // Núcleo (mantenha sempre true, não vale a pena “flaggar”)
  core: true,

  // Módulos “grandes” / em evolução — controle fino
  monitoramento:
    asBool(process.env.FEATURE_MONITORAMENTO) || FEATURES_SET.has("monitoramento"),

  horarios: asBool(process.env.FEATURE_HORARIOS) || FEATURES_SET.has("horarios"),

  appPais: asBool(process.env.FEATURE_APP_PAIS) || FEATURES_SET.has("app_pais"),

  conteudos: asBool(process.env.FEATURE_CONTEUDOS) || FEATURES_SET.has("conteudos"),
};

export function isEnabled(key) {
  return !!features[key];
}
