
// ============================================================
// worker-camera/worker.js
// Worker local da escola — captura frames via RTSP (ffmpeg)
// e envia para o backend na nuvem via POST /api/monitoramento/frame
//
// Pré-requisitos: ffmpeg instalado no PATH (ou definir FFMPEG_PATH)
// Execução: node worker.js
// Logs: console (redirecionar para arquivo se necessário)
// ============================================================

import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CONFIGURAÇÃO (via variáveis de ambiente ou padrão) ──────
const CONFIG = {
  // Câmera Intelbras VIP-1230-B-GS
  CAMERA_IP:    process.env.CAMERA_IP    || '192.168.1.108',
  CAMERA_PORT:  process.env.CAMERA_PORT  || '554',
  CAMERA_USER:  process.env.CAMERA_USER  || 'admin',
  CAMERA_PASS:  process.env.CAMERA_PASS  || 'Andre%2397620176', // # = %23
  CAMERA_ID:    Number(process.env.CAMERA_ID   || 1),
  CAMERA_CH:    process.env.CAMERA_CH    || '1',    // channel
  CAMERA_SUB:   process.env.CAMERA_SUB   || '1',    // subtype 1 = sub-stream (menor banda)

  // Backend remoto (DigitalOcean)
  BACKEND_URL:  process.env.BACKEND_URL  || 'https://api.sistemaeducamelhor.com.br',
  WORKER_TOKEN: process.env.WORKER_TOKEN || 'COLOQUE_UM_TOKEN_FORTE_IGUAL_AO_DO_BACKEND',
  ESCOLA_ID:    Number(process.env.ESCOLA_ID    || 1),

  // Intervalo entre frames (ms)
  INTERVALO_MS: Number(process.env.INTERVALO_MS || 1000),

  // Timeout do ffmpeg por frame (ms)
  FFMPEG_TIMEOUT_MS: Number(process.env.FFMPEG_TIMEOUT_MS || 8000),

  // ffmpeg path (auto-detecta no PATH)
  FFMPEG_PATH: process.env.FFMPEG_PATH || 'ffmpeg',
};

// URL RTSP montada
const RTSP_URL = `rtsp://${CONFIG.CAMERA_USER}:${CONFIG.CAMERA_PASS}@${CONFIG.CAMERA_IP}:${CONFIG.CAMERA_PORT}/cam/realmonitor?channel=${CONFIG.CAMERA_CH}&subtype=${CONFIG.CAMERA_SUB}`;

const log  = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);
const warn = (...a) => console.warn(`[${new Date().toLocaleTimeString('pt-BR')}] ⚠`, ...a);
const erro = (...a) => console.error(`[${new Date().toLocaleTimeString('pt-BR')}] ✗`, ...a);

// ─── Captura 1 frame JPEG via ffmpeg + RTSP ─────────────────
function capturarFrame() {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-rtsp_transport', 'tcp',
      '-i', RTSP_URL,
      '-frames:v', '1',
      '-f', 'image2',
      '-vcodec', 'mjpeg',
      'pipe:1',
    ];

    const ff = spawn(CONFIG.FFMPEG_PATH, args, { windowsHide: true });
    const chunks = [];
    let stderrTxt = '';

    const killer = setTimeout(() => {
      try { ff.kill('SIGKILL'); } catch {}
      reject(new Error(`ffmpeg timeout (${CONFIG.FFMPEG_TIMEOUT_MS}ms)`));
    }, CONFIG.FFMPEG_TIMEOUT_MS);

    ff.stdout.on('data', c => chunks.push(c));
    ff.stderr.on('data', d => { stderrTxt += d.toString(); });

    ff.on('close', (code) => {
      clearTimeout(killer);
      if (code === 0 && chunks.length) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg code=${code} | ${stderrTxt.slice(0, 200)}`));
      }
    });

    ff.on('error', (e) => {
      clearTimeout(killer);
      reject(e);
    });
  });
}

// ─── Envia frame JPEG para o backend ─────────────────────────
async function enviarFrame(jpegBuf) {
  const jpeg_base64 = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;

  const res = await fetch(`${CONFIG.BACKEND_URL}/api/monitoramento/frame`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-token': CONFIG.WORKER_TOKEN,
      'x-escola-id': String(CONFIG.ESCOLA_ID),
    },
    body: JSON.stringify({
      camera_id: CONFIG.CAMERA_ID,
      ts: new Date().toISOString(),
      jpeg_base64,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Backend HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }

  return res.json();
}

// ─── Loop principal ──────────────────────────────────────────
let errosConsecutivos = 0;
const MAX_ERROS_SEGUIDOS = 10;

async function tick() {
  try {
    const t0 = Date.now();
    const frame = await capturarFrame();
    await enviarFrame(frame);
    const ms = Date.now() - t0;

    if (errosConsecutivos > 0) {
      log(`✅ Reconectado após ${errosConsecutivos} falha(s)`);
      errosConsecutivos = 0;
    }
    log(`📷 Frame OK — ${frame.length} bytes | ${ms}ms`);
  } catch (err) {
    errosConsecutivos++;
    warn(`Falha ${errosConsecutivos}: ${err.message}`);

    if (errosConsecutivos >= MAX_ERROS_SEGUIDOS) {
      erro(`${MAX_ERROS_SEGUIDOS} falhas seguidas. Pausando 30s antes de retomar...`);
      await new Promise(r => setTimeout(r, 30_000));
      errosConsecutivos = 0;
    }
  }
}

// ─── Start ───────────────────────────────────────────────────
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('🚀 EDUCA Worker Câmera iniciado');
log(`   Câmera:   rtsp://${CONFIG.CAMERA_IP}:${CONFIG.CAMERA_PORT} (cam ${CONFIG.CAMERA_ID})`);
log(`   Backend:  ${CONFIG.BACKEND_URL}`);
log(`   Escola:   ${CONFIG.ESCOLA_ID}`);
log(`   Intervalo: ${CONFIG.INTERVALO_MS}ms`);
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

(async () => {
  await tick();
  setInterval(tick, CONFIG.INTERVALO_MS);
})();
