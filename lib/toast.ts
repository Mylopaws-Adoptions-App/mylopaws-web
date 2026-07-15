// Minimal, self-contained toast — non-blocking feedback without provider/context plumbing.
// Replaces raw alert()/error banners. Brand-styled, auto-dismissing, stacks, respects the tab bar
// via .mp-toast-host (see globals.css). Safe to call from any client component / event handler.

type ToastKind = 'success' | 'error' | 'info';

const STYLES: Record<ToastKind, string> = {
  success: 'background:#1F9D55;color:#fff;',
  error: 'background:#E5484D;color:#fff;',
  info: 'background:#111111;color:#fff;',
};
const ICON: Record<ToastKind, string> = { success: '✓', error: '!', info: 'ℹ' };

function host(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('mp-toast-host');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mp-toast-host';
    el.className = 'mp-toast-host';
    document.body.appendChild(el);
  }
  return el;
}

export function toast(message: string, kind: ToastKind = 'info', ms = 3200) {
  const root = host();
  if (!root) return;
  const t = document.createElement('div');
  t.className = 'mp-toast';
  t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  t.style.cssText =
    'display:flex;align-items:center;gap:10px;margin-top:8px;padding:12px 16px;border-radius:14px;' +
    'font-family:Poppins,system-ui,sans-serif;font-size:14px;font-weight:600;line-height:1.35;' +
    'box-shadow:0 8px 30px rgba(17,17,17,0.22);pointer-events:auto;' + STYLES[kind];
  t.innerHTML =
    `<span style="flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;` +
    `width:20px;height:20px;border-radius:9999px;background:rgba(255,255,255,0.25);font-size:12px">${ICON[kind]}</span>` +
    `<span style="flex:1"></span>`;
  (t.lastChild as HTMLElement).textContent = message; // textContent = XSS-safe
  root.appendChild(t);
  const kill = () => { t.style.transition = 'opacity .2s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 220); };
  const timer = setTimeout(kill, ms);
  t.addEventListener('click', () => { clearTimeout(timer); kill(); });
}
