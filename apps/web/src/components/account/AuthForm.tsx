"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { signIn, signUp, type AuthError } from "@/lib/account/account";
import { useCopy } from "@/lib/i18n/useCopy";
import { getNicknameSnapshot, saveNickname, subscribeNickname } from "@/lib/room/identity";
import { inputClasses } from "@/components/room/NicknameField";

/**
 * Sign up or sign in. Either way the guest's progress on this device carries over to the account.
 */
export function AuthForm() {
  const t = useCopy();
  const id = useId();
  const savedName = useSyncExternalStore(subscribeNickname, getNicknameSnapshot, () => "");
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);
  const shownName = name ?? savedName;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const problem = mode === "signUp" ? await signUp(shownName, email, password) : await signIn(email, password);
    setBusy(false);
    if (problem) return setError(problem);
    if (mode === "signUp" && shownName.trim()) saveNickname(shownName.trim());
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      {mode === "signUp" && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{t.account.name}</span>
          <input
            value={shownName}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoComplete="nickname"
            required
            className={inputClasses}
          />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t.account.email}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
          className={inputClasses}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t.account.password}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signUp" ? "new-password" : "current-password"}
          minLength={8}
          required
          aria-describedby={`${id}-hint`}
          className={inputClasses}
        />
        {mode === "signUp" && (
          <span id={`${id}-hint`} className="text-sm text-muted">
            {t.account.passwordHint}
          </span>
        )}
      </label>

      <p role="alert" className="min-h-5 text-sm font-semibold text-danger-ink">
        {error && t.account.errors[error]}
      </p>

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t.account.working : mode === "signUp" ? t.account.signUp : t.account.signIn}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "signUp" ? "signIn" : "signUp");
          setError(null);
        }}
        className="min-h-11 rounded-xl text-sm font-semibold text-brand-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
      >
        {mode === "signUp" ? t.account.haveAccount : t.account.needAccount}
      </button>
    </form>
  );
}
