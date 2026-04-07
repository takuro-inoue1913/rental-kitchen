"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function LoadingLink({ href, className = "", children }: Props) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // ルート変更でリセット（レンダー中に状態調整）
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setLoading(false);
  }

  const handleClick = useCallback(() => {
    setLoading(true);
  }, []);

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center cursor-pointer ${className}`}
    >
      {loading && (
        <svg
          className="absolute animate-spin h-5 w-5"
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
    </Link>
  );
}
