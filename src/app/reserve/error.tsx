"use client";

import { ErrorFallback } from "@/app/_components/ErrorFallback";

export default function ReserveError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      title="予約ページでエラーが発生しました"
      description="予約処理中に問題が発生しました。再試行してください。"
      backHref="/reserve"
      backLabel="予約ページへ戻る"
      onRetry={unstable_retry}
    />
  );
}
