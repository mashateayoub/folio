export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-content">
      <svg
        className="brand-symbol"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
      >
        <rect width="28" height="28" rx="7" fill="currentColor" />
        <path
          d="M9 8h11M9 14h8M9 8v13"
          stroke="var(--brand-symbol-ink, #fff)"
          strokeWidth="2.3"
          strokeLinecap="square"
        />
      </svg>
      {!compact && (
        <span>
          folio<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
