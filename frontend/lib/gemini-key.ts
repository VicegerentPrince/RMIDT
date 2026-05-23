const STORAGE_KEY = "rmidt_gemini_key";

export function getGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function saveGeminiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearGeminiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns headers to attach to any fetch call that reaches a Gemini endpoint. */
export function aiHeaders(): Record<string, string> {
  const key = getGeminiKey();
  return key ? { "X-Gemini-API-Key": key } : {};
}
