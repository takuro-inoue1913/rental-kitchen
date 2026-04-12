"use client";

import { ErrorFallback } from "@/app/_components/ErrorFallback";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      title="エラーが発生しました"
      description="ページの表示中に問題が発生しました。時間をおいて再度お試しください。"
      backHref="/"
      backLabel="トップページへ"
      onRetry={unstable_retry}
    />
  );
}
