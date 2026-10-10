"use client";

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useCopy } from "@/lib/i18n/useCopy";
import { CHAT_MAX_LENGTH, QUICK_CHAT, type ChatMessage, type ClientAction, type QuickChat, type RoomView } from "@/lib/room/engine";

interface ChatProps {
  view: RoomView;
  messages: ChatMessage[];
  send: (action: ClientAction) => void;
  /** Lift the button above a sticky footer (the lobby's start bar). */
  raised?: boolean;
}

/** A floating chat button with an unread count, opening chat in a bottom sheet. */
export function Chat({ view, messages, send, raised = false }: ChatProps) {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  const [toTeam, setToTeam] = useState(false);
  const [draft, setDraft] = useState("");
  // Highest message id the player has seen with the sheet open.
  const [seenId, setSeenId] = useState(0);
  const listEnd = useRef<HTMLDivElement>(null);

  const isPublic = view.kind === "public";
  // In public rooms, messages are quick-chat ids shown in each reader's language.
  const textOf = (m: ChatMessage) => (isPublic ? (t.quickChat[m.text as QuickChat] ?? m.text) : m.text);
  const myTeam = isPublic && !view.settings.configs["battle-royale"].squads ? null : (view.players.find((p) => p.id === view.you)?.teamId ?? null);
  const lastId = messages.at(-1)?.id ?? 0;
  const unread = open ? 0 : messages.filter((m) => m.id > seenId && m.from !== view.you).length;
  const shown = messages.filter((m) => (toTeam ? m.teamId !== null : m.teamId === null));

  // Keep the newest message in view while the sheet is open.
  useEffect(() => {
    if (open) listEnd.current?.scrollIntoView({ block: "end" });
  }, [open, shown.length]);

  const close = () => {
    setSeenId(lastId);
    setOpen(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    send({ type: "chat", text: draft, toTeam: toTeam && myTeam !== null });
    setDraft("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `${t.chat.open}, ${t.chat.unread(unread)}` : t.chat.open}
        className={`fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus ${
          raised ? "bottom-36" : "bottom-4"
        }`}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12Z" />
        </svg>
        {unread > 0 && (
          <span
            key={unread}
            aria-hidden="true"
            className="anim-pop absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-semibold text-[#17201b]"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <BottomSheet open={open} onClose={close} title={t.chat.title}>
        {myTeam && (
          <div role="tablist" aria-label={t.chat.title} className="mx-5 mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {[
              [false, t.chat.everyone],
              [true, t.chat.myTeam],
            ].map(([team, label]) => (
              <button
                key={String(team)}
                type="button"
                role="tab"
                aria-selected={toTeam === team}
                onClick={() => setToTeam(team as boolean)}
                className={`min-h-10 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus ${
                  toTeam === team ? "bg-surface" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-48 flex-1 overflow-y-auto overscroll-contain px-5" aria-live="polite">
          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{t.chat.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2 pb-2">
              {shown.map((m) => {
                const mine = m.from === view.you;
                return (
                  <li key={m.id} className={`anim-enter flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    {!mine && <span className="px-1 text-xs font-semibold text-muted">{m.name}</span>}
                    <p
                      className={`max-w-[80%] break-words rounded-2xl px-3 py-2 text-base ${
                        mine ? "rounded-br-md bg-brand text-on-brand" : "rounded-bl-md bg-surface-2"
                      }`}
                    >
                      {textOf(m)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <div ref={listEnd} />
        </div>

        {isPublic ? (
          <ul className="grid grid-cols-4 gap-2 border-t border-line p-3">
            {QUICK_CHAT.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => send({ type: "chat", text: id, toTeam: toTeam && myTeam !== null })}
                  className="min-h-11 w-full rounded-xl bg-surface-2 px-1 text-sm font-semibold transition hover:bg-brand-soft active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
                >
                  {t.quickChat[id]}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
            <label htmlFor="chat-input" className="sr-only">
              {t.chat.placeholder}
            </label>
            <input
              id="chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={CHAT_MAX_LENGTH}
              placeholder={t.chat.placeholder}
              autoComplete="off"
              enterKeyHint="send"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-background px-3 text-base placeholder:text-muted focus:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-focus"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="min-h-12 rounded-xl bg-brand px-4 font-semibold text-on-brand transition hover:bg-brand-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
            >
              {t.chat.send}
            </button>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
