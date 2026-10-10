"use client";

import { useCopy } from "@/lib/i18n/useCopy";
import { MAX_NAME_LENGTH } from "@/lib/room/engine";

interface NicknameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const inputClasses =
  "min-h-14 w-full rounded-xl border border-line bg-surface px-4 text-lg font-semibold placeholder:text-muted focus:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-focus";

export function NicknameField({ value, onChange }: NicknameFieldProps) {
  const t = useCopy();
  return (
    <label className="flex flex-col gap-1 text-left">
      <span className="text-sm font-semibold">{t.room.nickname}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.room.nicknamePlaceholder}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="nickname"
        enterKeyHint="go"
        className={inputClasses}
      />
    </label>
  );
}
