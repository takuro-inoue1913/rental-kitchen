"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/constants";
import { LoadingLink } from "@/app/_components/LoadingLink";

export function Header() {
  const pathname = usePathname();

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="text-lg font-bold text-amber-700 truncate"
        >
          {SITE_NAME}
        </Link>
        {!pathname.startsWith("/reserve") && (
          <LoadingLink
            href="/reserve"
            className="h-9 rounded-full bg-amber-600 px-5 text-sm text-white font-medium transition-colors hover:bg-amber-700"
          >
            予約する
          </LoadingLink>
        )}
      </div>
    </header>
  );
}
