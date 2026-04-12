"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-2xl font-bold mb-2">エラーが発生しました</h1>
      <p className="text-gray-500 mb-6">
        ページの表示中に問題が発生しました。時間をおいて再度お試しください。
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
        >
          再試行する
        </button>
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          トップページへ
        </Link>
      </div>
    </main>
  );
}
