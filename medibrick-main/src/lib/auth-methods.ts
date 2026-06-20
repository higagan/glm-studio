/** Shared phone normalization and auth helpers for sheets + /auth page. */

export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const cleaned = trimmed.startsWith("+")
    ? "+" + trimmed.slice(1).replace(/[^\d]/g, "")
    : trimmed.replace(/[^\d]/g, "");

  if (!cleaned.startsWith("+") && cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  if (!cleaned.startsWith("+") && cleaned.length > 10) {
    return `+${cleaned}`;
  }

  return cleaned;
}

export function isLikelyE164(value: string): boolean {
  return /^\+\d{10,15}$/.test(value);
}

export function storeAuthMethod(method: string) {
  sessionStorage.setItem("mb_auth_method", method);
}

export function consumeAuthMethod(): string {
  const stored = sessionStorage.getItem("mb_auth_method");
  if (stored) sessionStorage.removeItem("mb_auth_method");
  return stored || "unknown";
}
