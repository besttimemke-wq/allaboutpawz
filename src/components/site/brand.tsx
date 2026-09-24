// Brand glyphs for All About Pawz — faithful port from the source site.

/** Circular "ALL ABOUT PAWZ" gold badge, drawn as SVG for crisp type. */
export function PawBadge({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <path id="badgeTop" d="M100,100 m-72,0 a72,72 0 1,1 144,0" fill="none" />
        <path id="badgeBottom" d="M100,100 m-58,0 a58,58 0 1,0 116,0" fill="none" />
      </defs>
      <circle cx="100" cy="100" r="96" fill="oklch(0.17 0.006 60)" />
      <circle cx="100" cy="100" r="90" fill="none" stroke="oklch(0.68 0.098 68)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="oklch(0.68 0.098 68)" strokeWidth="1" />
      <text fill="oklch(0.68 0.098 68)" fontFamily="'Playfair Display', serif" fontSize="19" letterSpacing="3.4">
        <textPath href="#badgeTop" startOffset="50%" textAnchor="middle">
          ALL ABOUT
        </textPath>
      </text>
      <text fill="oklch(0.68 0.098 68)" fontFamily="'Playfair Display', serif" fontSize="19" letterSpacing="3.4">
        <textPath href="#badgeBottom" startOffset="50%" textAnchor="middle">
          PAWZ
        </textPath>
      </text>
      <g transform="translate(100 98) scale(0.95)" fill="oklch(0.68 0.098 68)">
        <ellipse cx="-16" cy="-14" rx="7" ry="10" transform="rotate(-18 -16 -14)" />
        <ellipse cx="-4" cy="-21" rx="7" ry="10.5" transform="rotate(-6 -4 -21)" />
        <ellipse cx="10" cy="-20" rx="7" ry="10.5" transform="rotate(8 10 -20)" />
        <ellipse cx="21" cy="-11" rx="6.5" ry="9.5" transform="rotate(20 21 -11)" />
        <path d="M0,-6 C13,-6 24,4 24,14 C24,24 14,27 4,24 C1,23 -3,23 -6,24 C-16,27 -25,24 -25,14 C-25,4 -13,-6 0,-6 Z" />
      </g>
    </svg>
  );
}

export function PawGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-32 -32 64 64" className={className} aria-hidden="true" fill="currentColor">
      <ellipse cx="-16" cy="-14" rx="7" ry="10" transform="rotate(-18 -16 -14)" />
      <ellipse cx="-4" cy="-21" rx="7" ry="10.5" transform="rotate(-6 -4 -21)" />
      <ellipse cx="10" cy="-20" rx="7" ry="10.5" transform="rotate(8 10 -20)" />
      <ellipse cx="21" cy="-11" rx="6.5" ry="9.5" transform="rotate(20 21 -11)" />
      <path d="M0,-6 C13,-6 24,4 24,14 C24,24 14,27 4,24 C1,23 -3,23 -6,24 C-16,27 -25,24 -25,14 C-25,4 -13,-6 0,-6 Z" />
    </svg>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-24 bg-gold/50" />
      <PawGlyph className="h-3.5 w-3.5 text-gold-deep" />
      <span className="h-px w-24 bg-gold/50" />
    </div>
  );
}
