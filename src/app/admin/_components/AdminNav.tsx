"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";

const TABS = [
  { href: "/admin", label: "予約一覧", exact: true },
  { href: "/admin/settings", label: "設定" },
];

export function AdminNav() {
  const pathname = usePathname();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  const handleClick = useCallback(
    (href: string) => {
      const isActive = TABS.some(
        (t) =>
          t.href === href &&
          (t.exact ? pathname === href : pathname.startsWith(href)),
      );
      if (!isActive) setLoadingHref(href);
    },
    [pathname],
  );

  return (
    <nav className="flex gap-1 rounded-lg bg-zinc-100 p-1 mb-8">
      {TABS.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        const isLoading = loadingHref === tab.href && !isActive;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => handleClick(tab.href)}
            aria-label={tab.label}
            className={`relative flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {isLoading && (
              <svg
                className="absolute inset-0 m-auto animate-spin h-4 w-4 text-zinc-400"
                aria-hidden="true"
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
            <span className={isLoading ? "opacity-0" : ""}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
