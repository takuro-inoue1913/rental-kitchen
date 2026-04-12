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
  billing_type: string;
  company_name: string | null;
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

function resolveSource(source: string) {
  return source === "web" ? "Web" : source === "google_calendar" ? "GCal" : "手動";
}

type DisplayReservation = Reservation & {
  statusLabel: string;
  statusClassName: string;
  formattedDate: string;
  timeRange: string;
  displayName: string;
  displaySource: string;
  formattedPrice: string;
  isCorporate: boolean;
};

function toDisplayReservation(r: Reservation): DisplayReservation {
  const st = STATUS_LABELS[r.status] ?? {
    label: r.status,
    className: "bg-zinc-100 text-zinc-500",
  };
  const isCorporate = r.billing_type === "corporate";
  return {
    ...r,
    statusLabel: st.label,
    statusClassName: st.className,
    formattedDate: formatDate(r.date),
    timeRange: `${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}`,
    displayName: isCorporate && r.company_name
      ? r.company_name
      : r.guest_name || r.guest_email || "—",
    displaySource: resolveSource(r.source),
    formattedPrice: `¥${r.total_price.toLocaleString()}`,
    isCorporate,
  };
}

export function ReservationTable() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(todayString());
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [billingFilter, setBillingFilter] = useState("");

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
        <label className="flex flex-col text-xs text-zinc-500">
          請求区分
          <select
            value={billingFilter}
            onChange={(e) => setBillingFilter(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">すべて</option>
            <option value="individual">個人</option>
            <option value="corporate">法人</option>
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
        (() => {
          const allRows = reservations.map(toDisplayReservation);
          const rows = billingFilter
            ? allRows.filter((r) => r.billing_type === billingFilter)
            : allRows;
          return (
            <>
              {/* モバイル: カード表示 */}
              <div className="space-y-3 md:hidden">
                {rows.map((r) => (
                  <Link
                    key={r.id}
                    href={`/admin/reservations/${r.id}`}
                    className="block rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm text-zinc-900">
                        {r.formattedDate}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {r.isCorporate && (
                          <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-medium">
                            法人
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.statusClassName}`}
                        >
                          {r.statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{r.timeRange}</span>
                      <span className="font-medium text-sm text-zinc-900">
                        {r.formattedPrice}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-500">
                      <span>{r.displayName}</span>
                      <span>{r.displaySource}</span>
                    </div>
                  </Link>
                ))}
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
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50 text-zinc-900">
                        <td className="py-3 whitespace-nowrap">
                          {r.formattedDate}
                        </td>
                        <td className="py-3 whitespace-nowrap text-zinc-600">
                          {r.timeRange}
                        </td>
                        <td className="py-3">{r.displayName}</td>
                        <td className="py-3 whitespace-nowrap font-medium">
                          {r.formattedPrice}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${r.statusClassName}`}
                          >
                            {r.statusLabel}
                          </span>
                          {r.isCorporate && (
                            <span className="ml-1.5 inline-block rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-medium">
                              法人
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-zinc-500 text-xs">
                          {r.displaySource}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
