import type { Question } from "@/lib/types";
import { battleRoyaleMode, type BattleRoyaleConfig, type BattleRoyaleView } from "./battleRoyale";
import { guessTheYearMode, type YearItem } from "./guessTheYear";
import { noTalkAmMode, type NoTalkAmAction, type NoTalkAmConfig, type NoTalkAmView, type TabooCard } from "./noTalkAm";
import type { RoundModeAction, RoundModeConfig, RoundModeView } from "./roundMode";
import { sortAmMode, type SortItem } from "./sortAm";
import { triviaMode, type TriviaAction, type TriviaConfig, type TriviaView } from "./trivia";
import type { GameMode, ModeId } from "./types";

/** Content a room loads at match start. The backend reads it from Postgres; locally it is static. */
export interface ModeContent {
  questions: readonly Question[];
  cards: readonly TabooCard[];
  years: readonly YearItem[];
  sorts: readonly SortItem[];
}

export interface ModeConfigs {
  trivia: TriviaConfig;
  "no-talk-am": NoTalkAmConfig;
  "guess-the-year": RoundModeConfig;
  "sort-am": RoundModeConfig;
  "battle-royale": BattleRoyaleConfig;
}

export type GuessTheYearView = RoundModeView<"guess-the-year", { prompt: string }, number, number>;
export type SortAmView = RoundModeView<"sort-am", { prompt: string; options: string[] }, string[], string[]>;

export type ModeAction = TriviaAction | NoTalkAmAction | RoundModeAction<unknown>;
export type ModeView = TriviaView | NoTalkAmView | GuessTheYearView | SortAmView | BattleRoyaleView;

/** A mode with its types erased, so the room can hold any of them. */
export type AnyMode = GameMode<unknown, unknown, unknown, ModeAction, ModeView>;

interface RegisteredMode {
  mode: AnyMode;
  content: (content: ModeContent) => unknown;
}

const erase = (mode: unknown) => mode as AnyMode;

/** Every mini game. Adding one: implement `GameMode` (or use `createRoundMode`) and register it here. */
export const modes: Record<ModeId, RegisteredMode> = {
  trivia: { mode: erase(triviaMode), content: (c) => c.questions },
  "no-talk-am": { mode: erase(noTalkAmMode), content: (c) => c.cards },
  "guess-the-year": { mode: erase(guessTheYearMode), content: (c) => c.years },
  "sort-am": { mode: erase(sortAmMode), content: (c) => c.sorts },
  "battle-royale": { mode: erase(battleRoyaleMode), content: (c) => c.questions },
};

/** Games friends can pick in a private room. Battle royale is played through Quick Play. */
export const MODE_IDS: ModeId[] = ["trivia", "no-talk-am", "guess-the-year", "sort-am"];

/** True for a game a private room can be created with (untrusted input: URLs, request bodies). */
export const isPrivateModeId = (v: unknown): v is ModeId => MODE_IDS.includes(v as ModeId);

export const defaultModeConfigs = (): ModeConfigs => ({
  trivia: triviaMode.defaultConfig,
  "no-talk-am": noTalkAmMode.defaultConfig,
  "guess-the-year": guessTheYearMode.defaultConfig,
  "sort-am": sortAmMode.defaultConfig,
  "battle-royale": battleRoyaleMode.defaultConfig,
});
