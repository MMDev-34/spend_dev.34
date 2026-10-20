import { NumberFormatType } from "@/types/settings";

/**
 * Formats integer minor units into display money string (e.g. 25050 -> "₹250.50", 25000 -> "₹250")
 * Removes .00 when whole numbers to remove extra space from digits.
 */
export function formatMoney(
  minorUnits: number,
  currency: string = "₹",
  format: NumberFormatType = "comma"
): string {
  if (minorUnits === null || minorUnits === undefined || !Number.isFinite(minorUnits)) {
    return `${currency}0`;
  }

  const isNegative = minorUnits < 0;
  const absUnits = Math.abs(Math.round(minorUnits));
  const major = Math.floor(absUnits / 100);
  const minor = absUnits % 100;

  let majorStr = "";
  if (format === "comma") {
    majorStr = major.toLocaleString("en-US");
  } else if (format === "dot") {
    majorStr = major.toLocaleString("de-DE");
  } else {
    majorStr = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  if (minor === 0) {
    return `${isNegative ? "-" : ""}${currency}${majorStr}`;
  }

  const minorStr = minor.toString().padStart(2, "0");
  const decimalSep = format === "comma" ? "." : ",";
  return `${isNegative ? "-" : ""}${currency}${majorStr}${decimalSep}${minorStr}`;
}

/**
 * Converts a user input string (e.g. "250.50" or "250" or "1,200.75") into integer minor units.
 * Safely caps at 100 trillion minor units to prevent JavaScript floating point inaccuracies.
 */
export function parseMoneyInput(input: string): number {
  if (!input || typeof input !== "string") return 0;
  const cleaned = input.replace(/[^0-9.,]/g, "").trim();
  if (!cleaned) return 0;

  let normalized = cleaned;
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    normalized = cleaned.replace(",", ".");
  } else if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/,/g, "");
  }

  // Handle multiple dots (e.g. "12.34.56" -> "12.34")
  const parts = normalized.split(".");
  const majorPart = parseInt(parts[0] || "0", 10);
  const safeMajor = isNaN(majorPart) ? 0 : majorPart;

  let minorPart = 0;
  if (parts.length > 1 && parts[1]) {
    const rawMinor = parts[1].slice(0, 2).padEnd(2, "0");
    minorPart = parseInt(rawMinor, 10);
    if (isNaN(minorPart)) minorPart = 0;
  }

  const total = safeMajor * 100 + minorPart;
  if (!Number.isFinite(total) || total < 0) return 0;
  
  // Cap at 100 billion currency units (10 trillion minor units)
  const MAX_SAFE_UNITS = 10_000_000_000_000_00;
  return Math.min(total, MAX_SAFE_UNITS);
}

/**
 * Converts integer minor units to decimal string for prefilling inputs (e.g. 25050 -> "250.50" or "250")
 */
export function minorUnitsToInputString(minorUnits: number): string {
  if (!Number.isFinite(minorUnits) || minorUnits === 0) return "";
  const absUnits = Math.abs(Math.round(minorUnits));
  const major = Math.floor(absUnits / 100);
  const minor = absUnits % 100;
  if (minor === 0) return major.toString();
  return `${major}.${minor.toString().padStart(2, "0")}`;
}

/**
 * Formats minor units into compact 'k' / 'M' / 'B' string without trailing zeroes
 * Examples: 150000 (1500) -> "1.5k", 100000 (1000) -> "1k", 25000 (250) -> "250", 1250000 (12500) -> "12.5k"
 */
export function formatKAmount(minorUnits: number): string {
  if (!Number.isFinite(minorUnits)) return "0";
  const absUnits = Math.abs(minorUnits);
  const major = absUnits / 100;

  if (major >= 1_000_000_000) {
    const b = major / 1_000_000_000;
    const formatted = b % 1 === 0 ? b.toString() : b.toFixed(1).replace(/\.0$/, "");
    return `${formatted}B`;
  }
  if (major >= 1_000_000) {
    const m = major / 1_000_000;
    const formatted = m % 1 === 0 ? m.toString() : m.toFixed(1).replace(/\.0$/, "");
    return `${formatted}M`;
  }
  if (major >= 1_000) {
    const k = major / 1_000;
    const formatted = k % 1 === 0 ? k.toString() : k.toFixed(1).replace(/\.0$/, "");
    return `${formatted}k`;
  }
  return `${Math.round(major)}`;
}
