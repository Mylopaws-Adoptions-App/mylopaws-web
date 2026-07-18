'use client';
import { useEffect } from 'react';

/**
 * Global interaction tracker. Fires a GA4 `interaction` event on every tap/click of an
 * interactive element — a button, link, role="button", form control, or anything explicitly
 * marked with a `data-track` attribute.
 *
 * - Listens in the CAPTURE phase so a click is still recorded even when a handler calls
 *   stopPropagation() (common in menus/sheets).
 * - NEVER reads an input's typed VALUE — only its accessible label / name / placeholder — so we
 *   never ship passwords, emails, phone numbers or other PII to Google.
 * - Events surface immediately in GA4 Realtime + DebugView, and per-visitor in
 *   Explore → User Explorer. To see `element` / `label` etc. in standard reports, register them
 *   as custom dimensions in GA4 Admin (event-scoped).
 */

// button labels, links, native controls, and any opt-in [data-track] element.
const SELECTOR = 'button, a, [role="button"], input, select, textarea, [data-track]';

function labelFor(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    // Accessible hints only — deliberately not the value.
    return (
      el.getAttribute('name') ||
      el.getAttribute('placeholder') ||
      (el as HTMLInputElement).type ||
      tag
    );
  }
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return text || el.getAttribute('title') || tag;
}

export default function AnalyticsClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const el = target?.closest?.(SELECTOR);
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (!el || !gtag) return;
      const tag = el.tagName.toLowerCase();
      gtag('event', 'interaction', {
        element: tag,
        label: labelFor(el).slice(0, 100),
        element_id: el.id || undefined,
        link_url: tag === 'a' ? (el as HTMLAnchorElement).getAttribute('href') || undefined : undefined,
        data_track: el.getAttribute('data-track') || undefined,
        page_path: window.location.pathname,
      });
    }
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return null;
}
