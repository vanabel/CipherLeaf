/**
 * Password-masked prompt. `window.prompt` always shows plaintext — never use it
 * for vault passphrases.
 */
export function promptSecret(message: string): Promise<string | null> {
  if (typeof document === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.className = "vault-secret-host";
    host.innerHTML = `
      <div class="vault-secret-backdrop" data-vault-secret-cancel></div>
      <div class="vault-secret-card" role="dialog" aria-modal="true" aria-labelledby="vault-secret-title">
        <p id="vault-secret-title" class="vault-secret-title">${escapeHtml(message)}</p>
        <form class="vault-secret-form">
          <input
            type="password"
            name="secret"
            autocomplete="current-password"
            class="vault-secret-input"
            required
          />
          <div class="vault-secret-actions">
            <button type="button" class="vault-secret-cancel" data-vault-secret-cancel>取消</button>
            <button type="submit" class="vault-secret-ok">确认</button>
          </div>
        </form>
      </div>
    `;

    const finish = (value: string | null) => {
      document.removeEventListener("keydown", onKey);
      host.remove();
      resolve(value);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(null);
      }
    };

    host.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("[data-vault-secret-cancel]")) {
        finish(null);
      }
    });

    host.querySelector("form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = host.querySelector<HTMLInputElement>("input[name=secret]");
      finish(input?.value ?? "");
    });

    document.addEventListener("keydown", onKey);
    document.body.appendChild(host);
    host.querySelector<HTMLInputElement>("input[name=secret]")?.focus();
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
