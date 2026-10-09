/** Decorative inline trophy. Hidden from assistive technology. */
export function Trophy({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 96 84"
      className={className}
      fill="none"
    >
      {/* handles */}
      <path d="M24 16H12V22C12 31 17 37 25 39" stroke="#d9a000" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 16H84V22C84 31 79 37 71 39" stroke="#d9a000" strokeWidth="5" strokeLinecap="round" />
      {/* cup */}
      <path d="M24 8H72V30A24 24 0 0 1 24 30Z" fill="#f2b705" />
      <path d="M30 12H38V30A12 12 0 0 0 44 41A24 24 0 0 1 30 30Z" fill="#fbd75a" />
      {/* star */}
      <path
        d="M48 18L51.2 25.2L59 26L53.2 31.2L54.9 38.8L48 34.9L41.1 38.8L42.8 31.2L37 26L44.8 25.2Z"
        fill="#ffffff"
      />
      {/* stem and base */}
      <rect x="43" y="52" width="10" height="16" fill="#d9a000" />
      <rect x="30" y="68" width="36" height="9" rx="3" fill="#008751" />
      <rect x="36" y="64" width="24" height="6" rx="2" fill="#f2b705" />
    </svg>
  );
}
