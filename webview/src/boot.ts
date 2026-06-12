/** Surface script failures before React mounts (avoids silent black screen). */
export function installBootErrorHandlers(): void {
  const show = (message: string) => {
    const root = document.getElementById('root');
    if (!root) {
      return;
    }
    root.innerHTML = `<div class="error-banner" role="alert">${message}</div>`;
  };

  window.addEventListener('error', (event) => {
    const detail = event.error instanceof Error ? event.error.message : event.message;
    show(`BTView script error: ${detail}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    show(`BTView failed: ${reason}`);
  });
}
