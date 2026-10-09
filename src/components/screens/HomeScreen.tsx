import { categories } from "@/data/categories";
import { QUESTIONS_PER_GAME, SECONDS_PER_QUESTION } from "@/lib/quiz/scoring";
import { Button } from "@/components/ui/Button";
import { NigerianFlag } from "@/components/ui/NigerianFlag";

interface HomeScreenProps {
  onPlay: () => void;
}

const stats = [
  { value: categories.length, label: "Categories" },
  { value: QUESTIONS_PER_GAME, label: "Questions" },
  { value: SECONDS_PER_QUESTION, label: "Seconds" },
];

export function HomeScreen({ onPlay }: HomeScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <NigerianFlag />

      {/* Two fixed lines; the font size scales with the viewport so they never wrap. */}
      <h1 className="text-[clamp(1.5rem,8vw,3.75rem)] font-extrabold uppercase leading-[1.1] tracking-tight">
        <span className="block whitespace-nowrap">How well do you</span>
        <span className="block whitespace-nowrap text-brand-ink">know Nigeria?</span>
      </h1>

      <div aria-hidden="true" className="mt-5 h-1 w-14 rounded-full bg-gold" />

      <p className="mt-5 max-w-sm text-base text-foreground/70 sm:text-lg">
        Test your knowledge of Nigeria across different categories.
      </p>

      <Button onClick={onPlay} className="mt-9 w-full sm:w-auto sm:min-w-64">
        PLAY GAME
        <span aria-hidden="true">→</span>
      </Button>

      <ul className="mt-10 flex items-center justify-center text-sm text-foreground/70">
        {stats.map((stat, i) => (
          <li
            key={stat.label}
            className={`px-3 min-[400px]:px-4 sm:px-6 ${i > 0 ? "border-l border-foreground/15" : ""}`}
          >
            <span className="mr-1 font-bold text-brand-ink">{stat.value}</span>
            {stat.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
