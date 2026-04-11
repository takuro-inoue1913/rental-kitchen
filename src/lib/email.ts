import "server-only";
import { Resend } from "resend";
import { SITE_NAME } from "@/lib/constants";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://localhost:3000")
  );
}

type ReservationConfirmationParams = {
  to: string;
  guestName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  options: Array<{ name: string; quantity: number; price: number }>;
  reservationId: string;
};

/**
 * 予約確定メールを送信する。
 * 送信失敗時は false を返す（呼び出し元でログ出力）。
 */
export async function sendReservationConfirmation(
  params: ReservationConfirmationParams,
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error("sendReservationConfirmation: RESEND_API_KEY is not set");
    return false;
  }
  if (!process.env.EMAIL_FROM) {
    console.error("sendReservationConfirmation: EMAIL_FROM is not set");
    return false;
  }

  const {
    to,
    guestName,
    date,
    startTime,
    endTime,
    totalPrice,
    options,
    reservationId,
  } = params;

  const emailFrom = process.env.EMAIL_FROM;
  const siteUrl = getSiteUrl();
  const { subject, text } = buildConfirmationEmail({
    guestName,
    date,
    startTime,
    endTime,
    totalPrice,
    options,
    reservationId,
    siteUrl,
  });

  try {
    const { error } = await getResend().emails.send({
      from: emailFrom,
      to,
      subject,
      text,
    });

    if (error) {
      console.error("Resend email error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend email send failed:", err);
    return false;
  }
}

type BuildEmailParams = Omit<ReservationConfirmationParams, "to"> & {
  siteUrl: string;
};

/**
 * 予約確定メールの件名と本文を生成する（テスト可能な純粋関数）。
 */
export function buildConfirmationEmail(params: BuildEmailParams): {
  subject: string;
  text: string;
} {
  const {
    guestName,
    date,
    startTime,
    endTime,
    totalPrice,
    options,
    reservationId,
    siteUrl,
  } = params;

  const d = new Date(date + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const formattedDate = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;

  const optionLines =
    options.length > 0
      ? options
          .map(
            (o) =>
              `  ・${o.name} ×${o.quantity}  ¥${o.price.toLocaleString()}`,
          )
          .join("\n")
      : "";

  const text = [
    `${guestName} 様`,
    "",
    `${SITE_NAME} のご予約が確定しました。`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "■ 予約内容",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    `日付: ${formattedDate}`,
    `時間: ${startTime} 〜 ${endTime}`,
    ...(optionLines ? ["", "■ オプション", optionLines] : []),
    "",
    `合計金額: ¥${totalPrice.toLocaleString()}（税込）`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "■ キャンセルポリシー",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "7日前まで: 全額返金",
    "3〜6日前: 50%返金",
    "2日前〜前日: 20%返金",
    "当日: 返金なし",
    "",
    `キャンセルはマイページから行えます: ${siteUrl}/my/reservations`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "■ アクセス",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "〒101-0047 東京都千代田区内神田1丁目9 TYDビル 301",
    "JR山手線 神田駅 徒歩5分",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `予約ID: ${reservationId}`,
    "",
    `このメールは ${SITE_NAME} から自動送信されています。`,
    "ご不明点がございましたら、お気軽にお問い合わせください。",
  ].join("\n");

  const subject = `【予約確定】${formattedDate} ${startTime}〜${endTime} - ${SITE_NAME}`;

  return { subject, text };
}
