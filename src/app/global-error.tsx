"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="ja">
      <body
        style={{
          margin: 0,
          fontFamily: "Arial, Helvetica, sans-serif",
          backgroundColor: "#ffffff",
          color: "#171717",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1
            style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}
          >
            システムエラーが発生しました
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            申し訳ありません。予期しないエラーが発生しました。
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            再試行する
          </button>
        </div>
      </body>
    </html>
  );
}
