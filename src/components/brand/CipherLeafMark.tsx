/** Leaf-in-seal mark: encrypted manuscript, not a generic lock. */
export function CipherLeafMark({
  className = "h-10 w-10 text-moss",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle
        cx="20"
        cy="20"
        r="17.5"
        stroke="currentColor"
        strokeWidth="1.15"
        opacity="0.5"
      />
      <path
        d="M20 8.4C27.4 12.2 28.8 22.6 20 31.2C11.2 22.6 12.6 12.2 20 8.4Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M20 11.4V27.6M20 16.2C17.5 17.5 16.3 20 16 23M20 18.4C22.3 19.7 23.4 22 23.6 24.4"
        stroke="var(--paper, #f3f6f3)"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </svg>
  );
}
