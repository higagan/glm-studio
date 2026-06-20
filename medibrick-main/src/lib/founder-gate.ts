const STORAGE_KEY = "mb_founder_gate_token";

export function getFounderGateToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setFounderGateToken(token: string) {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearFounderGateToken() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function loginFounderGate(password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/admin-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || "Login failed" };
  }

  const { token } = await res.json();
  setFounderGateToken(token);
  return { ok: true };
}

export async function verifyFounderGateToken(): Promise<boolean> {
  const token = getFounderGateToken();
  if (!token) return false;

  const res = await fetch("/api/admin-auth", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
