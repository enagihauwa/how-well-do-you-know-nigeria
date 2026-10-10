/**
 * Small green-white-green Nigerian flag mark (decorative), shown in the home top bar.
 *
 * Every colour here is a literal value on purpose. Do not replace them with theme tokens or add
 * dark: variants, filters, opacity or blend modes: the flag must look identical in light and dark.
 */
export function NigerianFlag() {
  return (
    <span aria-hidden="true" className="flex h-[22px] w-8 overflow-hidden rounded ring-1 ring-black/25">
      <span className="flex-1 bg-[#008751]" />
      <span className="flex-1 bg-[#ffffff]" />
      <span className="flex-1 bg-[#008751]" />
    </span>
  );
}
