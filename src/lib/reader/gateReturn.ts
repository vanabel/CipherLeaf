const GATE_RETURN_KEY = "cipherleaf.gateReturn";

/** Remember the gate URL (with fragment) so an expired reader can return. */
export function rememberGateReturn(url: string) {
  try {
    sessionStorage.setItem(GATE_RETURN_KEY, url);
  } catch {
    // private mode / quota
  }
}

export function readGateReturn(): string | null {
  try {
    return sessionStorage.getItem(GATE_RETURN_KEY);
  } catch {
    return null;
  }
}
