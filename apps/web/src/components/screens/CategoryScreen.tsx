import { categories } from "@naija/game/data/categories";
import { useCopy } from "@/lib/i18n/useCopy";
import type { CategoryId } from "@naija/game/types";
import { TopBar } from "@/components/ui/TopBar";

interface CategoryScreenProps {
  onBack: () => void;
  onSelect: (category: CategoryId) => void;
}

export function CategoryScreen({ onBack, onSelect }: CategoryScreenProps) {
  const t = useCopy();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-4 sm:px-6 sm:py-6">
      <TopBar back={{ label: t.common.back, onClick: onBack }} />

      <header className="mt-5">
        <h1 className="text-3xl font-bold">
          {t.category.titleLead} <span className="text-brand-ink">{t.category.titleAccent}</span>
        </h1>
        <p className="mt-1.5 text-base text-muted">{t.category.subtitle}</p>
      </header>

      <ul className="mt-6 flex flex-col gap-2.5">
        {categories.map((category, i) => (
          <li key={category.id} className="anim-enter" style={{ "--i": i } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => onSelect(category.id)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus sm:p-5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">{category.label}</span>
                <span className="mt-0.5 block text-sm text-muted">{category.description}</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
