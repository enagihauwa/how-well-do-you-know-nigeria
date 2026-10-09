/**
 * Small green-white-green Nigerian flag mark (decorative).
 *
 * Every colour here is a literal value on purpose. Do not replace them with theme tokens
 * (bg-brand, bg-surface, text-foreground...) or add dark: variants, filters, opacity or blend
 * modes: the flag must look identical in light and dark mode.
 *
 * `text-[#12261c]` pins the inherited text colour so that not even that property follows the
 * theme (nothing here uses it, but it keeps the flag fully independent of the page).
 */
export function NigerianFlag() {
  return (
    <div
      aria-hidden="true"
      className="mb-8 flex h-12 w-[4.5rem] overflow-hidden rounded-lg text-[#12261c] shadow-lg shadow-[#008751]/20 ring-1 ring-black/15"
    >
      <span className="flex-1 bg-[#008751]" />
      <span className="flex-1 bg-[#ffffff]" />
      <span className="flex-1 bg-[#008751]" />
    </div>
  );
}
