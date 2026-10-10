"use client";

import { useEffect, useId } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { copy } from "@/lib/i18n/copy";
import { HTML_LANG, type Lang } from "@/lib/i18n/lang";
import { setLang, useCopy, useLang } from "@/lib/i18n/useCopy";
import type { ThemePreference } from "@/lib/theme";
import { setThemePreference, useThemePreference } from "@/lib/useThemePreference";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Look (phone, light, dark) and language, in one bottom sheet. */
export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const t = useCopy();
  const lang = useLang();
  const preference = useThemePreference();

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  return (
    <BottomSheet open={open} onClose={onClose} title={t.settings.title}>
      <div className="flex flex-col gap-6 px-5 pb-5">
        <Segmented<ThemePreference>
          legend={t.settings.look}
          hint={t.settings.lookHint}
          value={preference}
          onChange={setThemePreference}
          options={[
            ["system", t.settings.phone],
            ["light", t.settings.light],
            ["dark", t.settings.dark],
          ]}
        />
        <Segmented<Lang>
          legend={t.settings.language}
          value={lang}
          onChange={setLang}
          options={[
            ["en", copy.en.languageName],
            ["pcm", copy.pcm.languageName],
          ]}
        />
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-xl bg-surface-2 font-semibold transition hover:bg-line focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
        >
          {t.settings.done}
        </button>
      </div>
    </BottomSheet>
  );
}

function Segmented<T extends string>({
  legend,
  hint,
  value,
  onChange,
  options,
}: {
  legend: string;
  hint?: string;
  value: T;
  onChange: (value: T) => void;
  options: [T, string][];
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{legend}</legend>
      <div
        className="mt-2 grid gap-1 rounded-xl bg-surface-2 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map(([id, label]) => (
          <label
            key={id}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-base transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-focus ${
              value === id ? "bg-brand font-semibold text-on-brand" : "text-muted hover:text-foreground"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </fieldset>
  );
}
