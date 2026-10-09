import { categories } from "@/data/categories";
import type { CategoryId } from "@/lib/types";

interface CategoryScreenProps {
  onBack: () => void;
  onSelect: (category: CategoryId) => void;
}

export function CategoryScreen({ onBack, onSelect }: CategoryScreenProps) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-6 py-6 sm:py-12">
      <button
        type="button"
        onClick={onBack}
        className="-ml-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-base font-semibold text-brand transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold"
      >
        <span aria-hidden="true">←</span> Back
      </button>

      <header className="mt-4 text-center sm:mt-6">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight sm:text-4xl">
          Choose a <span className="text-brand">category</span>
        </h1>
        <div aria-hidden="true" className="mx-auto mt-4 h-1 w-14 rounded-full bg-gold" />
        <p className="mt-4 text-base text-foreground/70 sm:text-lg">
          What do you want to test?
        </p>
      </header>

      <ul className="mt-8 flex flex-col gap-3 sm:mt-10 sm:gap-4">
        {categories.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => onSelect(category.id)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-foreground/10 bg-white p-4 text-left shadow-sm transition hover:border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold sm:gap-4 sm:p-5"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-2xl sm:h-14 sm:w-14 sm:text-3xl"
              >
                {category.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{category.label}</span>
                <span className="mt-0.5 block text-sm text-foreground/70">
                  {category.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-xl text-brand/60 transition group-hover:text-brand"
              >
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
