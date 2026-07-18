'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from './icons';

/**
 * Sheet — two presentations that share the same open/close lifecycle so exits
 * animate instead of vanishing (issue 6).
 *
 *  align="bottom" (default): classic bottom sheet. Backdrop fades, panel slides up
 *  with a 24px top radius, and the grab handle is draggable to dismiss.
 *
 *  align="search": a full-height overlay for address search (issue 2). The input
 *  lives at the TOP under a sticky header, so when the keyboard opens it can never
 *  cover the field and the suggestions render in a stable, scrollable container
 *  below it — no reflow/jump, comfortable one-handed.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  align = 'bottom',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  align?: 'bottom' | 'search';
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const isSearch = align === 'search';

  // Keyboard-aware sizing for the bottom sheet. The panel is anchored to the LAYOUT viewport's
  // bottom, so when the mobile keyboard opens it would otherwise sit *behind* the keyboard and the
  // submit button becomes unreachable (the Add-Furbaby bug). We track the visual viewport: lift the
  // panel above the keyboard (`kbInset`) and cap its height to the visible band so every field and
  // the submit stay on-screen and internally scrollable.
  const [kbInset, setKbInset] = useState(0);
  const [availH, setAvailH] = useState<number | null>(null);
  useEffect(() => {
    if (!mounted || isSearch || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setKbInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
      setAvailH(vv.height);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, [mounted, isSearch]);
  const kbOpen = kbInset > 100; // ignore small browser-chrome deltas; real keyboards overlap far more

  // Keep the sheet mounted through its exit animation, then unmount.
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 240);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  // Lock background scroll while a sheet is up.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  if (!mounted) return null;

  // ── Drag-to-dismiss (bottom sheet only) ──
  const onHandleDown = (e: React.PointerEvent) => { dragStart.current = e.clientY; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onHandleMove = (e: React.PointerEvent) => {
    if (dragStart.current == null || !panelRef.current) return;
    const dy = Math.max(0, e.clientY - dragStart.current);
    panelRef.current.style.transform = `translateY(${dy}px)`;
    panelRef.current.style.transition = 'none';
  };
  const onHandleUp = (e: React.PointerEvent) => {
    if (dragStart.current == null || !panelRef.current) return;
    const dy = Math.max(0, e.clientY - dragStart.current);
    dragStart.current = null;
    if (dy > 90) { onClose(); return; }
    panelRef.current.style.transition = 'transform 0.2s ease';
    panelRef.current.style.transform = 'translateY(0)';
  };

  const backdropCls = closing ? 'mp-backdrop-out' : 'mp-backdrop-in';

  if (isSearch) {
    return (
      <div className="fixed inset-0 z-50 flex justify-center">
        <div className={`absolute inset-0 bg-ink/40 ${backdropCls}`} onClick={onClose} />
        <div className={`absolute inset-0 mx-auto flex w-full max-w-[480px] flex-col bg-white ${closing ? 'mp-search-out' : 'mp-search-in'}`}>
          <header className="flex items-center gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
            <button type="button" onClick={onClose} aria-label="Close search" className="-ml-1 flex h-11 w-11 items-center justify-center text-ink">
              <ChevronLeft className="h-6 w-6" />
            </button>
            {title && <h3 className="text-[18px] font-bold text-ink">{title}</h3>}
          </header>
          <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center" onClick={onClose}>
      <div className={`absolute inset-0 bg-ink/40 ${backdropCls}`} />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px]"
        style={kbOpen ? { bottom: kbInset } : undefined}>
        <div
          ref={panelRef}
          className={`max-h-[85dvh] overflow-y-auto rounded-t-sheet bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-2 ${closing ? 'mp-sheet-out' : 'mp-sheet-in'}`}
          style={kbOpen && availH ? { maxHeight: Math.round(availH - 12) } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="mx-auto mb-3 mt-1 flex h-6 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
          >
            <span className="h-1 w-10 rounded-full bg-line" />
          </div>
          {title && <h3 className="mb-4 text-[20px] font-bold text-ink">{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
}
