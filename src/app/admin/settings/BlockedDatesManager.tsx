"use client";

import { useState, useEffect } from "react";
import { LoadingButton } from "@/app/_components/LoadingButton";

type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
};

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

export function BlockedDatesManager() {
  const [dates, setDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 新規追加フォーム
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/blocked-dates");
        if (res.ok) {
          const data = await res.json();
          setDates(data.blocked_dates ?? []);
        } else {
          setLoadError(true);
        }
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAdd() {
    if (!newDate) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, reason: newReason || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setDates((prev) =>
          [...prev, data.blocked_date].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        );
        setNewDate("");
        setNewReason("");
        setMessage({ type: "success", text: "追加しました" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error ?? "追加に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(item: BlockedDate) {
    if (!confirm(`${formatDate(item.date)} の休業日を削除しますか？`)) return;
    setDeletingId(item.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/blocked-dates?id=${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDates((prev) => prev.filter((d) => d.id !== item.id));
        setMessage({ type: "success", text: "削除しました" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error ?? "削除に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-zinc-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <p className="text-sm text-red-600">休業日の取得に失敗しました</p>
      )}

      {!loadError && dates.length === 0 && (
        <p className="text-sm text-zinc-500">登録された休業日はありません</p>
      )}

      {dates.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {formatDate(item.date)}
            </p>
            {item.reason && (
              <p className="text-xs text-zinc-500 mt-0.5">{item.reason}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDelete(item)}
            disabled={deletingId === item.id}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors"
          >
            削除
          </button>
        </div>
      ))}

      {/* 新規追加フォーム */}
      <div className="rounded-xl border border-dashed border-zinc-300 p-4 space-y-3">
        <p className="text-sm font-medium text-zinc-700">休業日を追加</p>
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={`${inputClass}`}
          />
          <input
            type="text"
            placeholder="理由（任意）"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className={`flex-1 min-w-[150px] ${inputClass}`}
          />
        </div>
        <LoadingButton loading={adding} onClick={handleAdd}>
          追加
        </LoadingButton>
      </div>

      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
