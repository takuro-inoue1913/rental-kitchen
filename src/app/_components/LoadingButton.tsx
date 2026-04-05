"use client";

type Props = {
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "primary" | "outline";
  className?: string;
  children: React.ReactNode;
};

export function LoadingButton({
  loading = false,
  disabled = false,
  onClick,
  variant = "primary",
  className = "",
  children,
}: Props) {
  const isDisabled = disabled || loading;

  const base =
    variant === "primary"
      ? "rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
      : "rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center px-4 py-2 text-sm transition-colors ${base} ${className}`}
    >
      {loading && (
        <svg
          className="absolute animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      <span className={loading ? "invisible" : ""}>{children}</span>
    </button>
  );
}
