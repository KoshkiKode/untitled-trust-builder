interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

/**
 * Trust Builder mark — a layered seal representing the two-tier
 * Trust -> LLC structure: a shield outline enclosing stacked tiers.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="Trust Builder logo"
      role="img"
    >
      {/* shield outline */}
      <path
        d="M24 3 L41 9 V23 C41 34 33 41 24 45 C15 41 7 34 7 23 V9 Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* tier 1 (trust) - widest */}
      <rect x="14" y="15" width="20" height="5.4" rx="1.2" fill="currentColor" />
      {/* tier 2 (llc) */}
      <rect x="17" y="23" width="14" height="5.4" rx="1.2" fill="currentColor" opacity="0.72" />
      {/* tier 3 (assets) */}
      <rect x="20" y="31" width="8" height="5.4" rx="1.2" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function Logo({ size = 30, className, withWordmark = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`} data-testid="logo">
      <LogoMark size={size} className="text-primary" />
      {withWordmark && (
        <span className="font-serif text-lg font-semibold tracking-tight text-foreground leading-none">
          Trust Builder
        </span>
      )}
    </span>
  );
}
