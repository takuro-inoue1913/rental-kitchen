"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SITE_NAME } from "@/lib/constants";
import { LoadingLink } from "@/app/_components/LoadingLink";
import { createClient } from "@/lib/supabase/client";

type Props = {
  user: { email: string } | null;
};

export function HeaderClient({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    window.location.href = "/";
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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

        <div className="flex items-center gap-3">
          {!pathname.startsWith("/reserve") && (
            <LoadingLink
              href="/reserve"
              className="h-9 rounded-full bg-amber-600 px-5 text-sm text-white font-medium transition-colors hover:bg-amber-700"
            >
              予約する
            </LoadingLink>
          )}

          {user ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm font-bold hover:bg-amber-200 transition-colors cursor-pointer"
                aria-label="ユーザーメニュー"
              >
                {user.email.charAt(0).toUpperCase()}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-zinc-200 bg-white shadow-lg py-1 z-50">
                  <p className="px-4 py-2 text-xs text-zinc-500 truncate border-b border-zinc-100">
                    {user.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      startTransition(() => {
                        router.push("/my/reservations");
                      });
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        読み込み中...
                      </span>
                    ) : (
                      "マイページ"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <LoadingLink
              href="/auth/login"
              className="h-9 rounded-full border border-zinc-300 px-4 text-sm text-zinc-700 font-medium transition-colors hover:bg-zinc-50"
            >
              ログイン
            </LoadingLink>
          )}
        </div>
      </div>
    </header>
  );
}
