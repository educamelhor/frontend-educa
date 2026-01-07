// src/config/registerRoute.js
// =========================================================================
// Registro seguro de rotas (não derruba o server se módulo estiver ausente)
// - Só faz import() se a feature estiver ligada
// - Se import falhar: loga e registra um endpoint 501 (opcional)
// =========================================================================
import { isEnabled } from "./featureFlags.js";

export async function registerRoute({
  app,
  featureKey,
  mountPath,
  loader, // () => import("...")
  middlewares = [],
  name = mountPath,
  onMissing = "stub", // "stub" | "skip"
}) {
  if (featureKey && !isEnabled(featureKey)) {
    // feature desligada => não importa nada
    return;
  }

  try {
    const mod = await loader();
    const router = mod.default || mod.router || mod;
    app.use(mountPath, ...middlewares, router);
    console.log(`[ROUTE] ON  - ${name} -> ${mountPath}`);
  } catch (err) {
    console.error(`[ROUTE] OFF - ${name} (falha ao importar)`, err?.message || err);

    if (onMissing === "stub") {
      app.use(mountPath, (req, res) =>
        res.status(501).json({
          ok: false,
          message: `Módulo indisponível (${name}). Feature ligada, mas rota não pôde ser carregada.`,
        })
      );
    }
  }
}
