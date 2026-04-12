"use client";

import { ErrorFallback } from "@/app/_components/ErrorFallback";

export default function MyPageError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      title="マイページでエラーが発生しました"
      description="データの読み込みに失敗しました。再試行してください。"
      backHref="/my"
      backLabel="マイページトップへ"
      onRetry={unstable_retry}
    />
  );
}
