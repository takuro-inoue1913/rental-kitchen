"use client";

import { ErrorFallback } from "@/app/_components/ErrorFallback";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      title="管理画面でエラーが発生しました"
      description="データの読み込みに失敗しました。再試行してください。"
      backHref="/admin"
      backLabel="管理画面トップへ"
      onRetry={unstable_retry}
    />
  );
}
