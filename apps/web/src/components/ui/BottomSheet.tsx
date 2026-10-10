"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** How far down (px) a drag must go before letting go closes the sheet. */
const CLOSE_DISTANCE = 90;

/**
 * A sheet that slides up from the bottom. Built on <dialog>, so focus is trapped and returned,
 * Escape closes it, and the backdrop is native. Tapping the backdrop or swiping the handle down
 * closes it too. While dragging, the panel is moved with a transform written straight to the
 * element (no React state per frame), so the drag follows the finger at the display's frame rate.
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);
  const titleId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onPointerUp = () => {
    const dy = drag.current?.dy ?? 0;
    drag.current = null;
    if (!panel.current) return;
    panel.current.style.transition = "transform 0.2s ease-out";
    panel.current.style.transform = "";
    if (dy > CLOSE_DISTANCE) onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click whose target is the dialog itself landed on the backdrop, outside the panel.
      onClick={(e) => e.target === dialog.current && onClose()}
      className="sheet"
    >
      <div ref={panel} className="sheet-panel">
        <div
          className="flex cursor-grab touch-none justify-center pb-2 pt-3"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* The danfo's double stripe, quietly, as the drag handle. */}
          <span aria-hidden="true" className="flex flex-col gap-[3px]">
            <span className="h-[3px] w-9 rounded-full bg-brand/35" />
            <span className="h-[3px] w-9 rounded-full bg-brand/35" />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-3">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
