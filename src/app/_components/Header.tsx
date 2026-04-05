import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-amber-700 truncate">
          {SITE_NAME}
        </Link>
        <Link
          href="/reserve"
          className="inline-flex h-9 items-center justify-center rounded-full bg-amber-600 px-5 text-sm text-white font-medium transition-colors hover:bg-amber-700"
        >
          予約する
        </Link>
      </div>
    </header>
  );
}
