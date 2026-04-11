"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TIMEZONE } from "@/lib/constants";

type Reservation = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  guest_name: string | null;
  guest_email: string | null;
  source: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  confirmed: { label: "確定", className: "bg-green-100 text-green-700" },
  pending: { label: "決済待ち", className: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "キャンセル", className: "bg-zinc-100 text-zinc-500" },
  completed: { label: "完了", className: "bg-blue-100 text-blue-700" },
};

const STATUS_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "confirmed", label: "確定" },
  { value: "pending", label: "決済待ち" },
  { value: "cancelled", label: "キャンセル" },
  { value: "completed", label: "完了" },
];

function todayString() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`;
}

export function ReservationTable() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(todayString());
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/reservations?${params}`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        setReservations(data.reservations ?? []);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, status]);

  return (
    <div>
      {/* フィルタ */}
      <div className="flex flex-wrap gap-3 mb-6">
        <label className="flex flex-col text-xs text-zinc-500">
          開始日
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </label>
        <label className="flex flex-col text-xs text-zinc-500">
          終了日
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </label>
        <label className="flex flex-col text-xs text-zinc-500">
          ステータス
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-zinc-100"
            />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">予約がありません</p>
      ) : (
        <>
          {/* モバイル: カード表示 */}
          <div className="space-y-3 md:hidden">
            {reservations.map((r) => {
              const st = STATUS_LABELS[r.status] ?? {
                label: r.status,
                className: "bg-zinc-100 text-zinc-500",
              };
              return (
                <Link
                  key={r.id}
                  href={`/admin/reservations/${r.id}`}
                  className="block rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-sm text-zinc-900">
                      {formatDate(r.date)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {r.start_time.slice(0, 5)}-{r.end_time.slice(0, 5)}
                    </span>
                    <span className="font-medium text-sm text-zinc-900">
                      ¥{r.total_price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-500">
                    <span>{r.guest_name || r.guest_email || "—"}</span>
                    <span>
                      {r.source === "web"
                        ? "Web"
                        : r.source === "google_calendar"
                          ? "GCal"
                          : "手動"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* デスクトップ: テーブル表示 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="pb-2 font-medium">日付</th>
                  <th className="pb-2 font-medium">時間</th>
                  <th className="pb-2 font-medium">ゲスト</th>
                  <th className="pb-2 font-medium">料金</th>
                  <th className="pb-2 font-medium">ステータス</th>
                  <th className="pb-2 font-medium">経路</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {reservations.map((r) => {
                  const st = STATUS_LABELS[r.status] ?? {
                    label: r.status,
                    className: "bg-zinc-100 text-zinc-500",
                  };
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50 text-zinc-900">
                      <td className="py-3 whitespace-nowrap">
                        {formatDate(r.date)}
                      </td>
                      <td className="py-3 whitespace-nowrap text-zinc-600">
                        {r.start_time.slice(0, 5)}-{r.end_time.slice(0, 5)}
                      </td>
                      <td className="py-3">
                        {r.guest_name || r.guest_email || "—"}
                      </td>
                      <td className="py-3 whitespace-nowrap font-medium">
                        ¥{r.total_price.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-500 text-xs">
                        {r.source === "web"
                          ? "Web"
                          : r.source === "google_calendar"
                            ? "GCal"
                            : "手動"}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/reservations/${r.id}`}
                          className="text-xs text-amber-600 hover:text-amber-700 underline underline-offset-4"
                        >
                          詳細
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
