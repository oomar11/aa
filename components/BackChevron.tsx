type Props = {
  className?: string;
};

/** RTL back chevron — points toward inline-start (right in Arabic layouts). */
export function BackChevron({ className = "h-5 w-5" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
