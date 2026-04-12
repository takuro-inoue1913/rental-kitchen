"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  onRetry: () => void;
};

export function ErrorFallback({
  error,
  title,
  description,
  backHref,
  backLabel,
  onRetry,
}: ErrorFallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gray-500 mb-6">{description}</p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
        >
          再試行する
        </button>
        <Link
          href={backHref}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          {backLabel}
        </Link>
      </div>
    </main>
  );
}
