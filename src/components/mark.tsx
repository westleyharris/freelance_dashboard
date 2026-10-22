/** Same mark as the favicon — an H on a cyan tile. */
export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#3ee0ff" />
      <path
        d="M10 8h3.2v6.2h5.6V8H22v16h-3.2v-6.6h-5.6V24H10V8z"
        fill="#041018"
      />
    </svg>
  );
}
