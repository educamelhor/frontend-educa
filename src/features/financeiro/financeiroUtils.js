// src/features/financeiro/financeiroUtils.js
// ============================================================================
// Utilitários de formatação monetária (BRL), máscaras fiscais (CPF/CNPJ),
// datas e metadados institucionais do módulo Financeiro (PDAF / PDDE).
// ============================================================================

export const FONTES_PDAF = [
  {
    value: "ORDINARIO",
    label: "PDAF Ordinário",
    shortLabel: "Ordinário",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-600",
  },
  {
    value: "EMENDA",
    label: "Emenda Parlamentar",
    shortLabel: "Emenda",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-600",
  },
  {
    value: "RENDIMENTO",
    label: "Rendimento",
    shortLabel: "Rendimento",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
];

export function getFonteMeta(fonte) {
  const key = String(fonte || "ORDINARIO").toUpperCase().trim();
  return FONTES_PDAF.find((f) => f.value === key) || FONTES_PDAF[0];
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(valor) {
  const num = Number(valor || 0);
  if (!Number.isFinite(num)) return "R$ 0,00";
  // Evita "-R$ 0,00"
  const normalizado = Math.abs(num) < 0.005 ? 0 : num;
  return brlFormatter.format(normalizado);
}

/**
 * Máscara bancária para input de moeda em reais (digitação por centavos):
 * Ex.: "125050" -> "1.250,50"
 */
export function maskMoedaInput(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents) || cents === 0) return "";
  const inteiro = Math.floor(cents / 100);
  const centavos = String(cents % 100).padStart(2, "0");
  const inteiroFmt = inteiro.toLocaleString("pt-BR");
  return `${inteiroFmt},${centavos}`;
}

export function numberToMoedaInput(num) {
  const n = Number(num || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  const cents = Math.round(n * 100);
  return maskMoedaInput(String(cents));
}

export function parseMoedaInput(str) {
  if (typeof str === "number") return Number.isFinite(str) ? str : 0;
  const digits = String(str || "").replace(/\D/g, "");
  if (!digits) return 0;
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents)) return 0;
  return Number((cents / 100).toFixed(2));
}

/**
 * Máscara automática híbrida:
 * - até 11 dígitos: CPF (000.000.000-00)
 * - 12 a 14 dígitos: CNPJ (00.000.000/0000-00)
 */
export function maskCpfCnpj(raw) {
  const d = String(raw || "").replace(/\D/g, "").slice(0, 14);
  if (!d) return "";
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.replace(/(\d{3})(\d+)/, "$1.$2");
    if (d.length <= 9) return d.replace(/(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  }
  if (d.length <= 12) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
  }
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
}

export function formatDataBR(iso) {
  if (!iso) return "—";
  const s = String(iso).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

export function hojeIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function sugerirProximaCompra(despesas = []) {
  let maxNum = 0;
  for (const item of despesas) {
    const match = String(item?.compra || "").trim().match(/^(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  return String(maxNum + 1).padStart(2, "0");
}
