"use client";

import { useState } from "react";

export function GateForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (res.ok) {
        window.location.href = "/";
        return; // フルリロードまで loading 状態を維持
      } else {
        setError("アクセスコードが正しくありません");
        setLoading(false);
      }
    } catch {
      setError("通信エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="access-code" className="sr-only">
          アクセスコード
        </label>
        <input
          id="access-code"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="アクセスコードを入力"
          autoFocus
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? "確認中..." : "入場する"}
      </button>
    </form>
  );
}
