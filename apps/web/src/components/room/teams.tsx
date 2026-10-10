import type { Copy } from "@/lib/i18n/copy";
import type { RoomView } from "@naija/game/room/engine";

/** One colour per team slot (Jollof, Suya, Puff-Puff, Zobo); squads cycle through them. */
const TEAM_COLOURS = ["#e8662f", "#8a5a3b", "#d9a400", "#a3245a"];

const slotOf = (teamId: string) => Number(teamId.replace(/\D/g, "")) || 0;

export function teamLabel(t: Copy, teamId: string): string {
  return t.room.teamName(slotOf(teamId));
}

/** A small colour dot that marks a team next to its name. Decorative: the name carries the meaning. */
export function TeamDot({ teamId, className = "" }: { teamId: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ background: TEAM_COLOURS[slotOf(teamId) % TEAM_COLOURS.length] }}
    />
  );
}

export function playerName(view: RoomView, playerId: string | null): string {
  return view.players.find((p) => p.id === playerId)?.name ?? "";
}

/** A player's name for display, with a "bot" tag for computer players so nobody is misled. */
export function displayName(t: Copy, view: RoomView, playerId: string | null): string {
  const p = view.players.find((x) => x.id === playerId);
  if (!p) return "";
  return p.bot ? `${p.name} (${t.quickPlay.bot})` : p.name;
}
