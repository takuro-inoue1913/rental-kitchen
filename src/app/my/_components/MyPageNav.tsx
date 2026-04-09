"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/my/reservations", label: "予約履歴" },
  { href: "/my/profile", label: "プロフィール" },
];

export function MyPageNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg bg-zinc-100 p-1 mb-8">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            pathname === tab.href
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
