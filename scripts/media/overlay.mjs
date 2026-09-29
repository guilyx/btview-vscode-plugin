// Presentation overlays injected into the demo page while recording the promo video:
// a visible mouse cursor (headless Chrome draws none), caption pills, and full-screen
// title / end cards. They are plain HTML/CSS layered over the real UI.

/** Runs in every frame (top page + webview iframe) before any page script. */
export function cursorInitScript() {
  const inIframe = window.top !== window;
  if (inIframe) {
    const forward = (type) => (e) => {
      const rect = window.frameElement?.getBoundingClientRect();
      if (!rect) return;
      window.parent.__promoCursor?.(type, e.clientX + rect.left, e.clientY + rect.top);
    };
    window.addEventListener('mousemove', forward('move'), true);
    window.addEventListener('mousedown', forward('down'), true);
    window.addEventListener('mouseup', forward('up'), true);
    return;
  }
  const install = () => {
    const cursor = document.createElement('div');
    cursor.id = 'promo-cursor';
    cursor.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 14.8 L11.6 21.6 L14.4 20.4 L11.3 13.7 L17.5 13.7 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(cursor.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '26px',
      height: '26px',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transform: 'translate(-3px, -2px)',
      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.45))',
      display: 'none',
    });
    document.body.appendChild(cursor);
    window.__promoCursor = (type, x, y) => {
      cursor.style.display = 'block';
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      if (type === 'down') {
        const ripple = document.createElement('div');
        Object.assign(ripple.style, {
          position: 'fixed',
          left: `${x - 18}px`,
          top: `${y - 18}px`,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(74,158,255,.35)',
          border: '2px solid rgba(74,158,255,.9)',
          zIndex: '2147483646',
          pointerEvents: 'none',
          transition: 'transform .45s ease-out, opacity .45s ease-out',
          transform: 'scale(.4)',
          opacity: '1',
        });
        document.body.appendChild(ripple);
        requestAnimationFrame(() => {
          ripple.style.transform = 'scale(1.4)';
          ripple.style.opacity = '0';
        });
        setTimeout(() => ripple.remove(), 600);
      }
    };
    const own = (type) => (e) => window.__promoCursor(type, e.clientX, e.clientY);
    window.addEventListener('mousemove', own('move'), true);
    window.addEventListener('mousedown', own('down'), true);
  };
  if (document.body) install();
  else document.addEventListener('DOMContentLoaded', install);
}

const OVERLAY_CSS = `
#promo-caption {
  position: fixed; left: 50%; bottom: 58px; transform: translate(-50%, 16px);
  padding: 14px 26px; border-radius: 14px; max-width: 80vw;
  font: 600 26px/1.3 'Segoe UI', 'Noto Sans', Lato, system-ui, sans-serif; letter-spacing: .01em;
  color: #fff; background: rgba(12, 16, 24, .88); border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 12px 40px rgba(0,0,0,.45); z-index: 2147483640; pointer-events: none;
  opacity: 0; transition: opacity .35s ease, transform .35s ease; white-space: nowrap;
}
#promo-caption.show { opacity: 1; transform: translate(-50%, 0); }
#promo-caption .k { color: #7cc4ff; }
#promo-card {
  position: fixed; inset: 0; z-index: 2147483645; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 22px; text-align: center;
  font-family: 'Segoe UI', 'Noto Sans', Lato, system-ui, sans-serif; color: #e8edf5;
  background: radial-gradient(1200px 700px at 50% 35%, #1b2a44 0%, #0d1320 60%, #090d16 100%);
  opacity: 0; transition: opacity .6s ease; pointer-events: none;
}
#promo-card.show { opacity: 1; }
#promo-card h1 { margin: 0; font-size: 92px; font-weight: 800; letter-spacing: -.02em; }
#promo-card h1 .dot { color: #4a9eff; }
#promo-card .tag { font-size: 40px; font-weight: 600; color: #c9d6ea; }
#promo-card .sub { font-size: 26px; color: #8fa3bf; }
#promo-card .pill { display: inline-block; margin: 6px; padding: 12px 22px; border-radius: 12px;
  font: 500 26px/1.2 'Cascadia Code','JetBrains Mono','JetBrainsMono Nerd Font','DejaVu Sans Mono',monospace;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); color: #fff; }
#promo-card .muted { color: #8fa3bf; font-size: 22px; }
#promo-card svg { filter: drop-shadow(0 10px 30px rgba(74,158,255,.35)); }
`;

const LOGO = `<svg viewBox="0 0 128 128" width="150" height="150" aria-hidden="true">
  <g stroke="#6b7280" stroke-width="5" stroke-linecap="round">
    <line x1="64" y1="36" x2="36" y2="54"/><line x1="64" y1="36" x2="92" y2="54"/>
    <line x1="36" y1="74" x2="64" y2="94"/><line x1="92" y1="74" x2="64" y2="94"/>
  </g>
  <circle cx="64" cy="24" r="13" fill="#4a9eff"/><circle cx="36" cy="64" r="11" fill="#4ade80"/>
  <circle cx="92" cy="64" r="11" fill="#4ade80"/><circle cx="64" cy="104" r="11" fill="#a78bfa"/>
</svg>`;

export const TITLE_CARD = `${LOGO}
  <h1>BTView<span class="dot">.</span></h1>
  <div class="tag">Behavior Trees, visually.</div>
  <div class="sub">BehaviorTree.CPP v3 &amp; v4 for VS Code &amp; Cursor</div>`;

export const END_CARD = `${LOGO}
  <h1>Get BTView<span class="dot">.</span></h1>
  <div><span class="pill">ext install rangonomics.btview</span></div>
  <div class="sub">VS Code Marketplace · Open VSX for Cursor</div>
  <div class="muted">github.com/guilyx/btview-vscode-plugin</div>`;

/** Install the overlay stylesheet + elements into the top page. */
export async function installOverlays(page) {
  await page.evaluate((css) => {
    if (document.getElementById('promo-style')) return;
    const style = document.createElement('style');
    style.id = 'promo-style';
    style.textContent = css;
    document.head.appendChild(style);
    const caption = document.createElement('div');
    caption.id = 'promo-caption';
    document.body.appendChild(caption);
    const card = document.createElement('div');
    card.id = 'promo-card';
    document.body.appendChild(card);
  }, OVERLAY_CSS);
}

export async function showCard(page, html, { instant = false } = {}) {
  await page.evaluate(
    ({ html, instant }) => {
      const card = document.getElementById('promo-card');
      card.innerHTML = html;
      if (instant) card.style.transition = 'none';
      card.classList.add('show');
      if (instant) requestAnimationFrame(() => (card.style.transition = ''));
    },
    { html, instant },
  );
}

export async function hideCard(page) {
  await page.evaluate(() => document.getElementById('promo-card').classList.remove('show'));
}

export async function caption(page, html) {
  await page.evaluate((html) => {
    const el = document.getElementById('promo-caption');
    if (!html) {
      el.classList.remove('show');
      return;
    }
    el.innerHTML = html;
    el.classList.add('show');
  }, html);
}
