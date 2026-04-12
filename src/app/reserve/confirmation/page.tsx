import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import { buildCalendarLinks } from "@/lib/calendar-links";
import { SITE_NAME, SITE_ADDRESS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "予約完了",
};

type Reservation = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  guest_name: string | null;
  guest_email: string | null;
  total_price: number;
  status: string;
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
        <p className="text-zinc-500">セッション情報がありません</p>
        <Link
          href="/reserve"
          className="mt-4 text-amber-600 hover:underline"
        >
          予約ページに戻る
        </Link>
      </div>
    );
  }

  // Stripe セッションから予約IDを取得
  let reservation: Reservation | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const reservationId = session.metadata?.reservation_id;

    if (reservationId) {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .returns<Reservation[]>()
        .single();
      reservation = data;
    }
  } catch {
    // セッション取得失敗
  }

  if (!reservation) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
        <p className="text-zinc-500">予約情報が見つかりません</p>
        <Link
          href="/reserve"
          className="mt-4 text-amber-600 hover:underline"
        >
          予約ページに戻る
        </Link>
      </div>
    );
  }

  const dateStr = format(
    new Date(reservation.date + "T00:00:00"),
    "yyyy年M月d日（E）",
    { locale: ja }
  );

  const isConfirmed = reservation.status === "confirmed";
  const isPending = reservation.status === "pending";

  const calendarLinks = buildCalendarLinks({
    date: reservation.date,
    startTime: reservation.start_time.slice(0, 5),
    endTime: reservation.end_time.slice(0, 5),
    title: `${SITE_NAME} ご予約`,
    location: SITE_ADDRESS,
    description: [
      `予約番号: ${reservation.id.slice(0, 8)}`,
      `お名前: ${reservation.guest_name ?? "ゲスト"}`,
      `合計: ¥${reservation.total_price.toLocaleString()}`,
    ].join("\n"),
  });

  return (
    <div className="flex flex-col flex-1 bg-zinc-50">
      <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <div className="text-5xl mb-4">{isConfirmed ? "\u2713" : "\u23F3"}</div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
          {isConfirmed
            ? "予約が確定しました"
            : isPending
              ? "予約を確認しています"
              : "予約を受け付けました"}
        </h1>
        <p className="text-zinc-600 mb-3">
          {isConfirmed
            ? `予約確認は ${reservation.guest_email} をご確認ください`
            : `決済確認後、${reservation.guest_email} にご案内をお送りします`}
        </p>
        {isPending && (
          <p className="text-sm text-zinc-500 mb-8">
            決済の反映まで少々お時間がかかる場合があります
          </p>
        )}
        {!isPending && <div className="mb-8" />}

        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">予約番号</dt>
              <dd className="text-zinc-900 font-mono text-xs">
                {reservation.id.slice(0, 8)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">日付</dt>
              <dd className="text-zinc-900 font-medium">{dateStr}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">時間</dt>
              <dd className="text-zinc-900 font-medium">
                {reservation.start_time.slice(0, 5)} -{" "}
                {reservation.end_time.slice(0, 5)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">お名前</dt>
              <dd className="text-zinc-900">{reservation.guest_name}</dd>
            </div>
            <div className="border-t border-zinc-200 pt-3 flex justify-between">
              <dt className="font-semibold text-zinc-900">合計</dt>
              <dd className="font-bold text-lg text-amber-600">
                ¥{reservation.total_price.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={calendarLinks.google}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Google カレンダーに追加
          </a>
          <a
            href={calendarLinks.outlook}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Outlook カレンダーに追加
          </a>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-amber-600 px-8 text-white font-medium transition-colors hover:bg-amber-700"
        >
          トップに戻る
        </Link>
      </div>
    </div>
  );
}
