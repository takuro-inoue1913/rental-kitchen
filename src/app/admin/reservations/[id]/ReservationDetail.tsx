"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { isCancellable, calculateRefund } from "@/lib/cancellation";
import { AdminCancelDialog } from "./AdminCancelDialog";

type Reservation = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  base_price: number;
  total_price: number;
  guest_name: string | null;
  guest_email: string | null;
  source: string;
  notes: string | null;
  stripe_payment_intent_id: string | null;
  refund_amount: number | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReservationOption = {
  quantity: number;
  price_at_booking: number;
  option: { name: string } | null;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  confirmed: { label: "確定", className: "bg-green-100 text-green-700" },
  pending: { label: "決済待ち", className: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "キャンセル", className: "bg-zinc-100 text-zinc-500" },
  completed: { label: "完了", className: "bg-blue-100 text-blue-700" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-zinc-100">
      <span className="text-zinc-500 text-sm">{label}</span>
      <span className="text-sm text-zinc-900 text-right">{value}</span>
    </div>
  );
}

export function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [options, setOptions] = useState<ReservationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/reservations/${id}`);
      if (!res.ok) {
        setError("予約が見つかりません");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setReservation(data.reservation);
      setOptions(data.options ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  const cancellable = reservation
    ? isCancellable(reservation.status, reservation.date)
    : false;

  const policy = useMemo(
    () =>
      reservation
        ? calculateRefund(reservation.date, reservation.total_price)
        : null,
    [reservation?.date, reservation?.total_price],
  );

  async function handleCancel() {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/admin/reservations/${id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error ?? "キャンセルに失敗しました");
        return;
      }
      if (data.warning) {
        setCancelError(data.warning);
      }
      setCancelOpen(false);
      router.refresh();
      // 予約データを再取得して画面に反映
      const detail = await fetch(`/api/admin/reservations/${id}`);
      if (detail.ok) {
        const updated = await detail.json();
        setReservation(updated.reservation);
        setOptions(updated.options ?? []);
      }
    } catch {
      setCancelError("通信エラーが発生しました");
    } finally {
      setCancelLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 w-48 rounded bg-zinc-200" />
        <div className="h-64 rounded-xl bg-zinc-100" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 mb-4">{error ?? "予約が見つかりません"}</p>
        <Link
          href="/admin"
          className="text-sm text-amber-600 hover:text-amber-700 underline underline-offset-4"
        >
          一覧に戻る
        </Link>
      </div>
    );
  }

  const st = STATUS_LABELS[reservation.status] ?? {
    label: reservation.status,
    className: "bg-zinc-100 text-zinc-500",
  };

  return (
    <div>
      <Link
        href="/admin"
        className="text-sm text-zinc-500 hover:text-zinc-700 mb-4 inline-block"
      >
        &larr; 一覧に戻る
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {formatDate(reservation.date)}
          </h2>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${st.className}`}
            >
              {st.label}
            </span>
            {cancellable && (
              <button
                type="button"
                onClick={() => {
                  setCancelError(null);
                  setCancelOpen(true);
                }}
                className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>

        <Row
          label="時間"
          value={`${reservation.start_time.slice(0, 5)} - ${reservation.end_time.slice(0, 5)}`}
        />
        <Row label="基本料金" value={`¥${reservation.base_price.toLocaleString()}`} />
        {options.length > 0 && (
          <>
            {options.map((o, i) => (
              <Row
                key={i}
                label={`${o.option?.name ?? "オプション"} ×${o.quantity}`}
                value={`¥${o.price_at_booking.toLocaleString()}`}
              />
            ))}
          </>
        )}
        <Row
          label="合計"
          value={
            <span className="font-semibold">
              ¥{reservation.total_price.toLocaleString()}
            </span>
          }
        />

        <div className="pt-4" />

        <Row label="ゲスト名" value={reservation.guest_name || "—"} />
        <Row label="メール" value={reservation.guest_email || "—"} />
        <Row
          label="予約経路"
          value={
            reservation.source === "web"
              ? "Web"
              : reservation.source === "google_calendar"
                ? "Google カレンダー"
                : "手動"
          }
        />
        {reservation.notes && (
          <Row label="備考" value={reservation.notes} />
        )}

        <div className="pt-4" />

        {reservation.stripe_payment_intent_id && (
          <Row
            label="Stripe Payment Intent"
            value={
              <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded">
                {reservation.stripe_payment_intent_id}
              </code>
            }
          />
        )}
        {reservation.refund_amount != null && (
          <Row
            label="返金額"
            value={`¥${reservation.refund_amount.toLocaleString()}`}
          />
        )}
        {reservation.cancelled_at && (
          <Row
            label="キャンセル日時"
            value={new Date(reservation.cancelled_at).toLocaleString("ja-JP")}
          />
        )}
        <Row
          label="作成日時"
          value={new Date(reservation.created_at).toLocaleString("ja-JP")}
        />
      </div>

      {policy && (
        <AdminCancelDialog
          open={cancelOpen}
          reservationDate={reservation.date}
          totalPrice={reservation.total_price}
          policy={policy}
          loading={cancelLoading}
          errorMessage={cancelError}
          onConfirm={handleCancel}
          onClose={() => setCancelOpen(false)}
        />
      )}
    </div>
  );
}
